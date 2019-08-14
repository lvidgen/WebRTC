document.getElementById("mopener").checked = false;
var lastPeerId = null;
var peer = null; // Own peer object
var conn = null;
var receiveBuffer = [];
var receivedSize = 0;
var infilename;
var infilesize;
var openWins = 0;



/**
 * Create the Peer object for our end of the connection.
 *
 * Sets up callbacks that handle any events related to our
 * peer object.
 */
function getId() {
    // Create own peer object with connection to shared PeerJS server
    var myName = document.getElementById("myId").value;
    peer = new Peer(myName, {
        debug: 2
    });


    peer.on('error', function(err) {
        if (err.type == 'unavailable-id') {
            document.getElementById("logMessage").textContent = "That username has already been taken. Please choose another: ";
            document.getElementById("myId").value = "";
        }
    });

    peer.on('open', function(id) {
        // Workaround for peer.reconnect deleting previous id
        if (peer.id === null) {
            console.log('Received null id from peer open');
            peer.id = lastPeerId;
        } else {
            lastPeerId = peer.id;
        }
        document.getElementById("logMessage").textContent = "Logged in as " + peer.id + ".";
        document.getElementById("logInForm").style.display = "none";
        document.getElementById("peerDeets").style.display = "block";
    });
    peer.on('connection', function(c) {
        // Allow only a single connection
        if (conn) {
            c.on('open', function() {
                c.send({
                    tag: "msg",
                    data: "Already connected to another client"
                });
                setTimeout(function() {
                    c.close();
                }, 500);
            });
            return;
        }

        conn = c;
        showLogIns();
    });
}

function join() {
    // Close old connection
    if (conn) {
        conn.close();
    }

    // Create connection to destination peer specified in the input field
    conn = peer.connect(document.getElementById("peerId").value, {
        reliable: true
    });

    conn.on('open', function() {
        showLogIns();
    });
};

function showLogIns() {
    document.getElementById("logMessage").textContent += " Connected to " + conn.peer + ".";
    document.getElementById("peerDeets").style.display = "none";
    document.getElementById("sendarea").style.display = "grid";
    document.getElementById("main").style.display = "grid";
    document.getElementById("burger").style.display = "inline";

    peer.on('call', function(mCon) {
        switch (mCon.metadata) {
            case "vid":
                makeWindow("vid", mCon, conn.peer + " wants to call you");
                break;
            case "scrn":
                showScreen(mCon);
                break;
        };

    });
    ready();
}


function ready() {
    conn.on('data', function(obj) {
        switch (obj.tag) {
            case "fileinfo":
                var fp = document.getElementById('fileProgress');
                infilename = obj.filename;
                infilesize = obj.filesize;
                fp.value = 0;
                fp.max = infilesize;
                document.getElementById('fileText').textContent = `Receiving '${infilename}' (0/${infilesize} bytes)`;
                break;
            case "file":
                receiveFile(obj.data, "file");
                break;
            case "pic_share":
                receiveFile(obj.data, "photo");
                break;
            case "pdf_share":
                receiveFile(obj.data, "pdf");
                break;
            case "msg":
                addMessage(conn.peer + ": " + obj.data);
                break;
        };
    });
    conn.on('close', function() {
        status.innerHTML = "Connection reset<br>Awaiting connection...";
        conn = null;
    });
}

function addMessage(msg) {
    var message = document.getElementById("messageArea");
    var dv = document.createElement("div");
    dv.appendChild(document.createTextNode(msg));
    message.appendChild(dv);
    dv.scrollIntoView(false);
}

function sendIt() {
    if (conn.open) {
        var msgbox = document.getElementById("sendMessageBox");
        var msg = msgbox.value;
        msgbox.value = "";
        conn.send({
            tag: "msg",
            data: msg
        });
        addMessage(peer.id + ": " + msg);
    }
}

function pressEnter(e, func) {
    if (e.key == 'Enter') {
        func();
    }
}


document.getElementById("menu").onclick = function(e) {
    document.getElementById("mopener").checked = false;
    switch (e.target.id) {
        case "menu_screen":
            shareScreen();
            break;
        case "menu_vid":
            videoCall();
            break;
    }
}

document.getElementById("logIn").addEventListener('click', getId);

document.getElementById("connectTo").addEventListener('click', join);

document.getElementById("sendButton").addEventListener('click', sendIt);

document.getElementById("myId").addEventListener('keyup', function(e) {
    pressEnter(e, getId)
});

document.getElementById("peerId").addEventListener('keyup', function(e) {
    pressEnter(e, join)
});

document.getElementById("sendMessageBox").addEventListener('keyup', function(e) {
    pressEnter(e, sendIt)
});

//start menu items

// screen sharing
async function shareScreen() {
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

function showScreen(scrcon) {
    makeWindow("vid", scrcon, conn.peer + " wants to share a screen with you");
}

//video call
async function videoCall() {
    let stream = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        });
        var mediaConnection = peer.call(conn.peer, stream, {
            metadata: "vid"
        });
        var win = makeWindow("calling", mediaConnection, "calling " + conn.peer + "...");
        mediaConnection.once('close', function() {
            closeMediaConn(stream, win);
        });
    } catch (err) {
        /* handle the error */
    }
}

function closeMediaConn(stream, wrp) {
    let tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    if (wrp) {
        var cont = wrp.getElementsByTagName("video")[0];
        cont.srcObject = null;
        document.body.removeChild(wrp);
    }
}

document.getElementById("file_share").onchange = readFile;
document.getElementById("pic_share").onchange = readFile;
document.getElementById("pdf_share").onchange = readFile;

//get file from input
function readFile() {
    const file = this.files[0];
    // Handle 0 size files.
    if (file.size === 0) {
        return;
    }
    var fp = document.getElementById('fileProgress');
    var ft = document.getElementById('fileText');
    var theid = this.id;
    var share = theid == "file_share";
    //TODO: check for file type if showing pic

    //for sending files
    if (share) {
        fp.style.display = "inline";
        ft.style.display = "inline";
        document.getElementById('fileText').textContent = `Sending '${file.name}' (0/${file.size} bytes)`;
        fp.value = 0;
        fp.max = file.size;
        //end sending files
    } else {
        if (file.type.indexOf("image") == -1 && theid == "pic_share") {
            makeWindow("info", "Selected file must be an image.", "Error");
            return;
        }
        if (file.name.indexOf(".pdf") == -1 && theid == "pdf_share") {
            makeWindow("info", "Selected file must be a pdf file.", "Error");
            return;
        }
    }
    conn.send({
        tag: "fileinfo",
        filename: file.name,
        filesize: file.size
    })
    const chunkSize = 16384;
    fileReader = new FileReader();
    let offset = 0;
    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        offset += e.target.result.byteLength;
        if (share) {
            //sending files
            conn.send({
                tag: "file",
                data: e.target.result
            });
            document.getElementById('fileText').textContent = `Sending '${file.name}' (${offset}/${file.size} bytes)`;
            fp.value = offset;
            //end sending files
        } else {
            conn.send({
                tag: theid,
                data: e.target.result
            });
        }
        if (offset < file.size) {
            readSlice(offset);
        } else {
            document.getElementById('fileText').textContent = `Sent '${file.name}' (${file.size} bytes)`;
            fp.style.display = "none";
            ft.style.display = "none";
        }
    });
    const readSlice = o => {
        const slice = file.slice(offset, o + chunkSize);
        fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
}

function receiveFile(data, typ) {
    receiveBuffer.push(data);
    receivedSize += data.byteLength;
    //start file sharing
    var share = typ == "file";
    if (share) {
        var fp = document.getElementById('fileProgress');
        var ft = document.getElementById('fileText');
        fp.style.display = "inline";
        ft.style.display = "inline";
        fp.value = receivedSize;
        ft.textContent = `Receiving '${infilename}' (${receivedSize}/${infilesize} bytes)`;
        //end file sharing
    }
    if (receivedSize === infilesize) {
        const received = new Blob(receiveBuffer);

        var obj = URL.createObjectURL(received);
        if (share) {
            //start file sharing
            var dv = document.createElement("div");
            var lnk = document.createElement("a");
            lnk.href = obj;
            lnk.download = infilename;
            lnk.appendChild(document.createTextNode(`Click to download '${infilename}' (${infilesize} bytes)`));
            document.getElementById('fileText').textContent = `Received '${infilename}' (${infilesize} bytes)`;
            dv.appendChild(lnk);
            document.getElementById("messageArea").appendChild(dv);
            lnk.scrollIntoView(false);
            fp.style.display = "none";
            ft.style.display = "none";
            //end file sharing
        } else {
            switch (typ) {
                case "photo":
                    makeWindow(typ, obj, conn.peer + " wants to share a " + typ + " with you");
                    break;
                case "pdf":
                    makeWindow(typ, obj, conn.peer + " wants to share a " + typ + " with you");
                    break;
            }

        }
        receiveBuffer = [];
        receivedSize = 0;
    }
}