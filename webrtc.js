document.getElementById("mopener").checked = false;

var lastPeerId = null,
	peer = null, // Own peer object
	conn = null,
	receiveBuffer = [],
	receivedSize = 0,
	infilename,
	infilesize,
	openWins = 0,
	hascam = false,
	hasmic = false;


navigator.mediaDevices.enumerateDevices()
.then(function(devices) {
  devices.forEach(function(device) {
    if(device.kind == "videoinput"){
		hascam=true;
		document.getElementById("menu_vid").style.display="list-item";
	};
	if(device.kind == "audioinput"){
		hasmic=true;
	};
  });
})
.catch(function(err) {
  console.log(err.name + ": " + err.message);
});




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
    document.getElementById("msgwrap").style.display = "grid";
    document.getElementById("main").style.display = "grid";
    document.getElementById("burger").style.display = "inline";
	document.getElementById("msgdraghead").textContent = "Chat with " + conn.peer;
	makeDraggable(document.getElementById("msghdwrp"))
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
            case "pic_show":
                receiveFile(obj.data, "photo");
                break;
            case "pdf_show":
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
    var message = document.getElementById("messageArea"),
		dv = document.createElement("div");
    dv.appendChild(document.createTextNode(msg));
    message.appendChild(dv);
    dv.scrollIntoView(false);
}

function sendIt() {
    if (conn.open) {
        var msgbox = document.getElementById("sendMessageBox"),
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

//document.getElementById("sendButton").addEventListener('click', sendIt);

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
}

document.getElementById("file_share").onchange = readFile;
document.getElementById("pic_show").onchange = readFile;
document.getElementById("pdf_show").onchange = readFile;

//get file from input
function readFile() {
    var fp = document.getElementById('fileProgress'),
		ft = document.getElementById('fileText'),
		theid = this.id,
		share = theid == "file_share", //for sending files
		chunkSize = 16384;
		fileReader = new FileReader();
		offset = 0,
		file = this.files[0];
		this.value="";
    if (file.size === 0) {
        return;
    }
    if (share) {
        fp.style.display = "inline";
        ft.style.display = "inline";
        document.getElementById('fileText').textContent = `Sending '${file.name}' (0/${file.size} bytes)`;
        fp.value = 0;
        fp.max = file.size;
    } else {
        if (file.type.indexOf("image") == -1 && theid == "pic_show") {
            makeWindow("info", "Selected file must be an image.", "Error");
            return;
        }
        if (file.name.indexOf(".pdf") == -1 && theid == "pdf_show") {
            makeWindow("info", "Selected file must be a pdf file.", "Error");
            return;
        }
    }
    conn.send({
        tag: "fileinfo",
        filename: file.name,
        filesize: file.size
    })

    fileReader.addEventListener('error', error => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', e => {
        offset += e.target.result.byteLength;
        if (share) {
            conn.send({
                tag: "file",
                data: e.target.result
            });
            document.getElementById('fileText').textContent = `Sending '${file.name}' (${offset}/${file.size} bytes)`;
            fp.value = offset;
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
    var share = typ == "file";
    if (share) {
        var fp = document.getElementById('fileProgress'),
			ft = document.getElementById('fileText');
        fp.style.display = "inline";
        ft.style.display = "inline";
        fp.value = receivedSize;
        ft.textContent = `Receiving '${infilename}' (${receivedSize}/${infilesize} bytes)`;
    }
    if (receivedSize === infilesize) {
        const received = new Blob(receiveBuffer);
        var obj = URL.createObjectURL(received);
        if (share) {
            var dv = document.createElement("div"),
				lnk = document.createElement("a");
            lnk.href = obj;
            lnk.download = infilename;
            lnk.appendChild(document.createTextNode(`Click to download '${infilename}' (${infilesize} bytes)`));
            document.getElementById('fileText').textContent = `Received '${infilename}' (${infilesize} bytes)`;
            dv.appendChild(lnk);
            document.getElementById("messageArea").appendChild(dv);
            lnk.scrollIntoView(false);
            fp.style.display = "none";
            ft.style.display = "none";
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