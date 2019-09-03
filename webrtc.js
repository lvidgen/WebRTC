getById("mopener").checked = false;

var lastPeerId = null,
	peer = null, // Own peer object
	conn = null,
	openWins = 0,
	hascam = false,
	hasmic = false,
	fileobj={};


navigator.mediaDevices.enumerateDevices()
.then(function(devices) {
  devices.forEach(function(device) {
    if(device.kind == "videoinput"){
		hascam=true;
		getById("menu_vid").style.display="list-item";
	};
	if(device.kind == "audioinput"){
		hasmic=true;
	};
  });
})
.catch(function(err) {
  console.log(err.name + ": " + err.message);
});

function getById(str){
	return document.getElementById(str);
};

function crEl(typ,par){
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
        if (err.type == 'unavailable-id') {
            getById("logMessage").textContent = "That username has already been taken. Please choose another: ";
            getById("myId").value = "";
        }
    });

    peer.on('open', function(id) {
        // Workaround for peer.reconnect deleting previous id
        if (peer.id === null) {
            getById("conninfo").textContent = conn.peer + " is not connected";
            peer.id = lastPeerId;
        } else {
            lastPeerId = peer.id;
        }
        getById("logMessage").textContent = "Logged in as " + peer.id + ".";
        getById("logInForm").style.display = "none";
        getById("peerDeets").style.display = "block";
    });
	
	peer.on('disconnected', function() { 
		getById("conninfo").textContent ="connection to server lost. Try reloading";
	});
	
    peer.on('connection', function(c) {
        // Allow only a single connection
		c.on('open', function() {
		});
		
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
		getById("conninfo").textContent = " Connected to " + conn.peer + ".";
        showLogIns();
    });
}

function join() {
    // Close old connection
    if (conn) {
        conn.close();
    }
    // Create connection to destination peer specified in the input field
    conn = peer.connect(getById("peerId").value.toLowerCase(), {
        reliable: true
    });

    conn.on('open', function() {
        showLogIns();
    });
};

function showLogIns() {
	getById("conninfo").style.display = "block";
    getById("conninfo").textContent = " Connected to " + conn.peer + ".";
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
                makeWindow("vid", mCon, conn.peer + " wants to call you");
                break;
            case "scrn":
                makeWindow("vid", mCon, conn.peer + " wants to share a screen with you");
                break;
        };
    });
    ready();
	
}

function ready() {
    conn.on('data', function(obj) {
        switch (obj.tag) {
            case "fileinfo":
				fileobj[obj.stamp]={
					name:obj.filename,
					size:obj.filesize,
					receivedSize:0,
					buff:[]
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
        getById("conninfo").textContent = "Connection reset. Awaiting connection...";
        conn = null;
    });
makeCanvas();
}

function addMessage(msg) {
    var message = getById("messageArea"),
		dv = crEl("div",message);
    dv.appendChild(document.createTextNode(msg));
    dv.scrollIntoView(false);
}

function sendIt() {
    if (conn.open) {
        var msgbox = getById("sendMessageBox"),
			msg = msgbox.value;
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

getById("menu").onpointerdown = function(e) {
    getById("mopener").checked = false;
    switch (e.target.id) {
        case "menu_screen":
            shareScreen();
            break;
        case "menu_vid":
            videoCall();
            break;
        case "menu_draw":
            if(e.target.textContent=="Show drawing tools"){
				getById("cnv_btns").style.display="inline-grid";
				e.target.textContent="Hide drawing tools";
			} else {
				getById("cnv_btns").style.display="none";
				e.target.textContent="Show drawing tools";
			}
            break;
    }
}

getById("logIn").addEventListener('pointerdown', getId);

getById("connectTo").addEventListener('pointerdown', join);

getById("myId").addEventListener('keyup', function(e) {
    pressEnter(e, getId)
});

getById("peerId").addEventListener('keyup', function(e) {
    pressEnter(e, join)
});

getById("sendMessageBox").addEventListener('keyup', function(e) {
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

//video call
async function videoCall() {
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: hasmic,
            video: hascam
        });
        var mediaConnection = peer.call(conn.peer, stream, {
            metadata: "vid"
        });
        var wrap = makeWindow("calling", mediaConnection, "calling " + conn.peer + "...");
        mediaConnection.once('close', function() {
			document.body.removeChild(wrap);
            closeMediaConn(stream);
        });
    } catch (err) {
        /* handle the error */
    }
}

function closeMediaConn(stream) {
    let tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
};

getById("file_share").onchange = readFile;
getById("pic_show").onchange = readFile;
getById("pdf_show").onchange = readFile;
getById("chbg_btn").onchange = readFile;


//get file from input
function readFile() {
    var theid = this.id,
		share = theid == "file_share", //for sending files
		chunkSize = 16384,
		fileReader = new FileReader(),
		timestamp = Date.now(),
		offset = 0,
		file = this.files[0];
		this.value="";
    if (file.size === 0) {
        return;
    }
        if (file.type.indexOf("image") == -1 && (theid == "pic_show"||theid == "chbg_btn")) {
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
		stamp:timestamp
    })

    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        offset += e.target.result.byteLength;
             conn.send({
                tag: theid,
                data: e.target.result,
				stamp:timestamp
            });
        if (offset < file.size) {
            readSlice(offset);
        } else {
			if(theid == "chbg_btn"){
				var myurl=URL.createObjectURL(file);
				getById("bkg").style.backgroundImage="url('" + myurl + "')";
				getById("cnv_cntrls").className="invisible";
				getById("txtwrp").style.display="none";
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
    fileobj[stmp].buff.push(data);
	fileobj[stmp].receivedSize += data.byteLength;
    if (fileobj[stmp].receivedSize === fileobj[stmp].size) {
        const received = new Blob(fileobj[stmp].buff);
        var obj = URL.createObjectURL(received);
            switch (typ) {				
                case "pic_show":
                    makeWindow(typ, obj, conn.peer + " wants to share a photo with you");
                    break;
                case "pdf_show":
                    makeWindow(typ, obj, conn.peer + " wants to share a pdf with you");
                    break;
				case "chbg_btn":
                    getById("bkg").style.backgroundImage="url('" + obj + "')";
                    break;
				case "file_share":
                    var dv = crEl("div",getById("messageArea")),
					lnk = crEl("a",dv);
					lnk.href = obj;
					lnk.download = fileobj[stmp].name;
					lnk.appendChild(document.createTextNode(`Click to download '${fileobj[stmp].name}'`));
					lnk.scrollIntoView(false);
                    break;
            }	
        delete fileobj[stmp];
    }
}