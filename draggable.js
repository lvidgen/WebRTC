function makeWindow(tag, indata, txt) {

	var wrap = crEl("div",document.body);
    wrap.className = "draggable";
    wrap.style.zIndex = ++openWins;
    
	var hdrwrap = crEl("div",wrap);
    hdrwrap.className = "hdwrp";
	
	var hdr = crEl("div",hdrwrap);
    hdr.className = "dragheader";
    hdr.textContent = txt;
	
	if (tag == "calling") {
        var clsr = makeCloser(hdrwrap);
        makeVid(indata, clsr, wrap, hdr);
		return wrap;
    }
    
	var cnfwrp = crEl("div",wrap);
	
    var btn_y = crEl("button",cnfwrp);
    btn_y.appendChild(document.createTextNode("Accept"));
    btn_y.className = "conf_btn accept_stream";

	var btn_n = crEl("button",cnfwrp);
    btn_n.appendChild(document.createTextNode("Reject"));
    btn_n.className = "conf_btn reject_stream";
	
	makeDraggable(hdrwrap);

    btn_n.onpointerdown = function() {
        switch (tag) {
            case "vid":
                indata.answer();
                indata.on('stream', function(peerstream) {
                    setTimeout(function() {
                        indata.close();
						indata=null;
                        document.body.removeChild(wrap);
                    }, 0);
                });
                break;
			case "pdf":	
            case "photo":
				indata=null;
                document.body.removeChild(wrap);
                break;
        }
    }

    if (tag == "info") {
        var dv = document.createElement("div");
        dv.appendChild(document.createTextNode(indata));
        btn_y.textContent = "OK";
        wrap.lastChild.insertBefore(dv, btn_y);
        cnfwrp.removeChild(btn_n);
    }

    btn_y.onpointerdown = function() {
        wrap.removeChild(cnfwrp);
        wrap.style.resize = "both";
        var cont = null,
			clsr = makeCloser(hdrwrap);

        switch (tag) {
            case "vid":
				makeVid(indata, clsr, wrap);
                if (indata.metadata == "scrn") {
                    indata.answer();
                    hdr.textContent = "screen shared from " + conn.peer;
					indata.once('close', function() {
						indata=null;
						document.body.removeChild(wrap);
                    });
                } else {
                    hdr.textContent = "call with " + conn.peer;
                    (async function() {
                        let stream = null;
						if(hasmic||hascam){
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({
                                audio: hasmic,
                                video: hascam
                            });
							
                            indata.answer(stream);
                            indata.once('close', function() {
                                closeMediaConn(stream);
								indata=null;
								document.body.removeChild(wrap);
                            });

                        } catch (err) {
                            console.log(err)
                            /* handle the error */
                        }
						} else { // no cam or mic, just answer the call
							indata.answer();
                            indata.once('close', function() {
								indata=null;
								document.body.removeChild(wrap);
                            });
							}
                    })();
                }
                
                break;
            case "pic_show":
                hdr.textContent = "photo shared by " + conn.peer;
                cont = crEl("img",wrap);
                cont.src = indata;
                cont.className = "pic_cont";
                clsr.onpointerdown = function() {
					indata=null;
                    document.body.removeChild(wrap);
                }
                break;
            case "pdf_show":
                hdr.textContent = "pdf shared by " + conn.peer;
				wrap.style.width="40%";
				wrap.style.height="50%";
                cont = crEl("object",wrap);
				cont.type="application/pdf";
				cont.data=indata;
                cont.className = "pdf_cont";
                wrap.appendChild(cont);
                clsr.onpointerdown = function() {
					indata=null;
                    document.body.removeChild(wrap);
                }
                break;
            case "info":
                document.body.removeChild(wrap);
                break;
        }
    }
}

function makeDraggable(hdr){
		var wrp = hdr.parentElement;
	    wrp.onpointerdown = function(e) {
            if (wrp.style.zIndex < openWins) {
                wrp.style.zIndex = ++openWins;
            }
        }
	    hdr.onpointerdown = function(e) {
        e = e || window.event;
        // get the mouse cursor position at startup:
        var pos3 = e.clientX,
			pos4 = e.clientY;
        document.onpointerup = function() {
            document.onpointerup = null;
            document.onpointermove = null;
        };
        // call a function whenever the cursor moves:
        document.onpointermove = function(e) {
			if(e.clientY > 0){ // stop windows from getting dragged off the top of the screen
            var e = e || window.event,
            // calculate the new cursor position:
				pos1 = pos3 - e.clientX,
				pos2 = pos4 - e.clientY;				
            e.preventDefault();
			pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            wrp.style.top = (wrp.offsetTop - pos2) + "px";
            wrp.style.left = (wrp.offsetLeft - pos1) + "px";
			}
        }
    }
}


function makeVid(con, cls, wrp, hdr) {
    var cont = null;
    con.once('stream', function(peerstream) {
        if (hdr) {
            hdr.textContent = "call with " + conn.peer;
        }
        cont = crEl("video",wrp);
        cont.autoplay = true;
        cont.srcObject = peerstream;
    });
    cls.onpointerdown = function() {
		con.close();
    }
}

function makeCloser(hwrap) {
    var clsr = crEl("div",hwrap);
    clsr.className = "closer";
    clsr.textContent = "X";
    return clsr;
}

