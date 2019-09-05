var fileobj = {},
    pos = {
        x: 0,
        y: 0
    }, // last known position
    //lastPeerId = null,

getById("mopener").checked = false;

function enumDevices() {
    var obj = {
        hascam: false,
        hasmic: false
    };
    return new Promise(function(resolve, reject) {
        navigator.mediaDevices.enumerateDevices()
            .then(function(devices) {
                devices.forEach(function(device) {
                    if (device.kind == "videoinput") {
                        obj.hascam = true;
                    };
                    if (device.kind == "audioinput") {
                        obj.hasmic = true;
                    };
                })

            }).then(function(result) {
                return resolve(obj);
            })
            .catch(function(err) {
                console.log(err.name + ": " + err.message);
            })

    })
}

enumDevices().then(function(result) {
    if (result.hascam) {
        getById("menu_vid").style.display = "inline";
    }
})

function setTouch(el, typ) {
    var evmap = {
        "touchstart": "mousedown",
        "touchmove": "mousemove",
        "touchend": "mouseup",
        "touchcancel": "mouseup"
    }
    el["on" + typ] = function(e) {
        var touch = e.touches[0];
        var obj = typ === "touchend" ? {} : {
            clientX: touch.clientX,
            clientY: touch.clientY,
            buttons: 1
        }
        var mouseEvent = new MouseEvent(evmap[typ], obj);
        el.dispatchEvent(mouseEvent);
    };
}

function getById(str) {
    return document.getElementById(str);
};

function crEl(typ, par) {
    return par.appendChild(document.createElement(typ));
};


/**
 * Create the Peer object for our end of the connection.
 *
 * Sets up callbacks that handle any events related to our
 * peer object.
 */
function getId() {
    // Create own peer object with connection to shared PeerJS server
    var myName = getById("myId").value.toLowerCase();
    peer = new Peer(myName, {
        debug: 2
    });
    peer.on('error', function(err) {
        switch (err.type) {
            case 'unavailable-id':
                getById("logMessage").textContent = "That username has already been taken. Please choose another: ";
                getById("myId").value = "";
                break;
            case 'peer-unavailable':
                getById("connstatus").textContent = "Cannot connect to ";
                getById("theirname").textContent = getById("peerId").value;
                break;
        }
        console.log(err.type)
    });

    peer.on('open', function(id) {
        // Workaround for peer.reconnect deleting previous id
        if (peer.id === null) {
            getById("connstatus").textContent = "Cannot connect to ";
            getById("theirname").textContent = getById("peerId").value;
        } else {
            // lastPeerId = peer.id;
        }
        getById("logMessage").textContent = "Logged in as " + peer.id + ".";
        getById("logInForm").style.display = "none";
        getById("peerDeets").style.display = "block";
    });

    peer.on('disconnected', function() {
        getById("connstatus").textContent = "connection to server lost. Try reloading";
        getById("theirname").textContent = "";
    });

    peer.on('connection', function(conn) {
        // Allow only a single connection
        conn.on('open', function() {});
        /*
        if (conn) {
            c.on('open', function() {
                addMessage("sys: "+c.peer +" tried to connect");
                setTimeout(function() {
                    c.close();
                }, 500);
            });
            return;
        }
		
        conn = c;
		*/
        showLogIns(peer, conn);
    });
}

function join() {
    // Create connection to destination peer specified in the input field
    var conn = peer.connect(getById("peerId").value.toLowerCase(), {
        reliable: true
    });

    conn.on('open', function() {
        showLogIns(peer, conn);
    });
};

function showLogIns(peer, conn) {
    getById("conninfo").style.display = "inline";
    getById("connstatus").textContent = " Connected to ";
    getById("theirname").textContent = conn.peer;
    getById("peerDeets").style.display = "none";
    getById("msgwrap").style.display = "grid";
    getById("main").style.display = "grid";
    //getById("burger").style.display = "inline"; // for mobile
    getById("menuwrapper").style.display = "block";
    getById("msgdraghead").textContent = "Chat with " + conn.peer;
    makeDraggable(getById("msghdwrp"))
    peer.on('call', function(mCon) {
        switch (mCon.metadata) {
            case "vid":
                makeWindow("vid", mCon, conn.peer + " wants to call you", conn);
                break;
            case "scrn":
                makeWindow("vid", mCon, conn.peer + " wants to share a screen with you", conn);
                break;
        };
    });
    ready(conn);
    getById("sendMessageBox").addEventListener('keyup', function(e) {
        pressEnter(e, sendIt, [peer, conn])
    });

    getById("menu").onclick = function(e) {
        menuListen(e.target, peer, conn);
    }

    getById("cnv_butns").onclick = function(e) {
        showControls(e.target.parentNode.id, conn);
    }

    getById("txtsave").onclick = function() {
        saveText(conn);
    }

    getById("undo_btn").onclick = function() {
        conn.send({
            tag: "undo"
        })
        unDoIt();
    };

    getById("file_share").onchange = function() {
        readFile(conn, this)
    };
    getById("pic_show").onchange = function() {
        readFile(conn, this)
    };
    getById("pdf_show").onchange = function() {
        readFile(conn, this)
    };
    getById("chbg_btn").onchange = function() {
        readFile(conn, this)
    };

}

function ready(conn) {
    conn.on('data', function(obj) {
        switch (obj.tag) {
            case "fileinfo":
                fileobj[obj.stamp] = {
                    name: obj.filename,
                    size: obj.filesize,
                    receivedSize: 0,
                    buff: []
                }
                break;
            case "file_share":
            case "pic_show":
            case "pdf_show":
            case "chbg_btn":
                receiveFile(obj.data, obj.tag, obj.stamp);
                break;
            case "msg":
                addMessage(conn.peer + ": " + obj.data);
                break;
            case "drawrect":
                drawRect(obj, true);
                break;
            case "drawcirc":
                drawCirc(obj, true);
                break;
            case "drawfree":
                drawFree(obj, true);
                break;
            case "drawline":
                drawLine(obj, true);
                break;
            case "drawtext":
                drawText(obj, true);
                break;
            case "undo":
                unDoIt();
                break;
            case "make_canvas":
                makeCanvas(true);
                break;
        };
    });
    conn.on('close', function() {
        getById("connstatus").textContent = "Connection reset. Awaiting connection...";
        getById("theirname").textContent = "";
        conn = null;
    });
    makeCanvas(true);
    makeCanvas(false, conn);
}

function menuListen(el, peer, conn) {
    getById("mopener").checked = false;
    switch (el.id) {
        case "menu_screen":
            shareScreen(peer, conn);
            break;
        case "menu_vid":
            videoCall(peer, conn);
            break;
        case "menu_draw":
            if (el.textContent == "Show drawing tools") {
                getById("cnv_butns").style.display = "inline-grid";
                el.textContent = "Hide drawing tools";
            } else {
                getById("cnv_butns").style.display = "none";
                el.textContent = "Show drawing tools";
            }
            break;
    }
}

function addMessage(msg) {
    var message = getById("messageArea"),
        dv = crEl("div", message);
    dv.appendChild(document.createTextNode(msg));
    dv.scrollIntoView(false);
}

function sendIt(args) {
    if (args[1].open) {
        var msgbox = getById("sendMessageBox"),
            msg = msgbox.value;
        msgbox.value = "";
        args[1].send({
            tag: "msg",
            data: msg
        });
        addMessage(args[0].id + ": " + msg);
    }
}

function pressEnter(e, func, args) {
    if (e.key == 'Enter') {
        func(args);
    }
}



getById("logIn").onclick = getId;

getById("connectTo").onclick = join;

getById("myId").addEventListener('keyup', function(e) {
    pressEnter(e, getId)
});

getById("peerId").addEventListener('keyup', function(e) {
    pressEnter(e, join)
});



//start menu items

// screen sharing
async function shareScreen(peer, conn) {
    let captureStream = null;
    try {
        captureStream = await navigator.mediaDevices.getDisplayMedia();
    } catch (err) {
        console.error("Error: " + err);
    }
    var screenConnection = peer.call(conn.peer, captureStream, {
        metadata: "scrn"
    });
    screenConnection.on('close', function() {
        closeMediaConn(captureStream);
    });
}

//video call
function videoCall(peer, conn) {
    enumDevices().then(function(result) {
            navigator.mediaDevices.getUserMedia({
                    audio: result.hasmic,
                    video: result.hascam
                })
                .then(function(stream) {
                    var mediaConnection = peer.call(conn.peer, stream, {
                        metadata: "vid"
                    });
                    var wrap = makeWindow("calling", mediaConnection, "calling " + conn.peer + "...", conn);
                    mediaConnection.once('close', function() {
                        document.body.removeChild(wrap);
                        closeMediaConn(stream);
                    });
                });
        })
        .catch(function(err) {
            console.log(err.name + ": " + err.message);
        });
}

function closeMediaConn(stream) {
    let tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
};




//get file from input
function readFile(conn, el) {
    var theid = el.id,
        share = theid == "file_share", //for sending files
        chunkSize = 16384,
        fileReader = new FileReader(),
        timestamp = Date.now(),
        offset = 0,
        file = el.files[0];
    el.value = "";
    if (file.size === 0) {
        return;
    }
    if (file.type.indexOf("image") == -1 && (theid == "pic_show" || theid == "chbg_btn")) {
        makeWindow("info", "Selected file must be an image.", "Error");
        return;
    }
    if (file.name.indexOf(".pdf") == -1 && theid == "pdf_show") {
        makeWindow("info", "Selected file must be a pdf file.", "Error");
        return;
    }

    conn.send({
        tag: "fileinfo",
        filename: file.name,
        filesize: file.size,
        stamp: timestamp
    })

    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        offset += e.target.result.byteLength;
        conn.send({
            tag: theid,
            data: e.target.result,
            stamp: timestamp
        });
        if (offset < file.size) {
            readSlice(offset);
        } else {
            if (theid == "chbg_btn") {
                var myurl = URL.createObjectURL(file);
                getById("bkg").style.backgroundImage = "url('" + myurl + "')";
                getById("cnv_cntrls").className = "invisible";
                getById("txtwrp").style.display = "none";
            };
        };
    });
    const readSlice = o => {
        const slice = file.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

function receiveFile(data, typ, stmp) {
    var sender = getById("theirname").textContent;
    fileobj[stmp].buff.push(data);
    fileobj[stmp].receivedSize += data.byteLength;
    if (fileobj[stmp].receivedSize === fileobj[stmp].size) {
        const received = new Blob(fileobj[stmp].buff);
        var obj = URL.createObjectURL(received);
        switch (typ) {
            case "pic_show":
                makeWindow(typ, obj, sender + " wants to share a photo with you");
                break;
            case "pdf_show":
                makeWindow(typ, obj, sender + " wants to share a pdf with you");
                break;
            case "chbg_btn":
                getById("bkg").style.backgroundImage = "url('" + obj + "')";
                break;
            case "file_share":
                var dv = crEl("div", getById("messageArea")),
                    lnk = crEl("a", dv);
                lnk.href = obj;
                lnk.download = fileobj[stmp].name;
                lnk.appendChild(document.createTextNode(`Click to download '${fileobj[stmp].name}'`));
                lnk.scrollIntoView(false);
                break;
        }
        delete fileobj[stmp];
    }
}