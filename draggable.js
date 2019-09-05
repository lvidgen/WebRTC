function makeWindow(tag, indata, txt, conn) {
    var sender = getById("theirname").textContent,
        wrap = crEl("div", getById("main"));
    wrap.className = "draggable";
    wrap.style.zIndex = highZ();

    var hdrwrap = crEl("div", wrap);
    hdrwrap.className = "hdwrp";

    var hdr = crEl("div", hdrwrap);
    hdr.className = "dragheader";
    hdr.textContent = txt;

    makeDraggable(hdrwrap);

    if (tag == "calling") {
        var clsr = makeCloser(hdrwrap);
        makeVid(indata, clsr, wrap, hdr);
        return wrap;
    }

    var cnfwrp = crEl("div", wrap);

    var btn_y = crEl("button", cnfwrp);
    btn_y.appendChild(document.createTextNode("Accept"));
    btn_y.className = "conf_btn accept_stream";

    var btn_n = crEl("button", cnfwrp);
    btn_n.appendChild(document.createTextNode("Reject"));
    btn_n.className = "conf_btn reject_stream";



    btn_n.onclick = function() {
        switch (tag) {
            case "vid":
                indata.answer();
                indata.on('stream', function(peerstream) {
                    setTimeout(function() {
                        indata.close();
                        indata = null;
                        getById("main").removeChild(wrap);
                    }, 0);
                });
                break;
            case "pdf":
            case "photo":
                indata = null;
                getById("main").removeChild(wrap);
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

    btn_y.onclick = function() {
        wrap.removeChild(cnfwrp);
        wrap.style.resize = "both";
        var cont = null,
            clsr = makeCloser(hdrwrap);

        switch (tag) {
            case "vid":
                makeVid(indata, clsr, wrap);
                if (indata.metadata == "scrn") {
                    indata.answer();
                    hdr.textContent = "screen shared from " + sender;
                    indata.once('close', function() {
                        indata = null;
                        getById("main").removeChild(wrap);
                    });
                } else {
                    hdr.textContent = "call with " + sender;
                    enumDevices().then(function(result) {
                            if (result.hasmic || result.hascam) {
                                navigator.mediaDevices.getUserMedia({
                                        audio: result.hasmic,
                                        video: result.hascam
                                    })
                                    .then(function(stream) {
                                        indata.answer(stream);
                                        indata.once('close', function() {
                                            closeMediaConn(stream);
                                            indata = null;
                                            getById("main").removeChild(wrap);
                                        });
                                    });
                            } else { // no cam or mic, just answer the call
                                indata.answer();
                                indata.once('close', function() {
                                    indata = null;
                                    getById("main").removeChild(wrap);
                                });
                            }
                        })
                        .catch(function(err) {
                            console.log(err.name + ": " + err.message);
                        });
                }
                break;
            case "pic_show":
                hdr.textContent = "photo shared by " + sender;
                cont = crEl("img", wrap);
                cont.src = indata;
                cont.className = "pic_cont";
                clsr.onclick = function() {
                    indata = null;
                    getById("main").removeChild(wrap);
                }
                break;
            case "pdf_show":
                hdr.textContent = "pdf shared by " + sender;
                wrap.style.width = "40%";
                wrap.style.height = "50%";
                cont = crEl("object", wrap);
                cont.type = "application/pdf";
                cont.data = indata;
                cont.className = "pdf_cont";
                wrap.appendChild(cont);
                clsr.onclick = function() {
                    indata = null;
                    getById("main").removeChild(wrap);
                }
                break;
            case "info":
                getById("main").removeChild(wrap);
                break;
        }
    }
}

function makeDraggable(hdr) {
    var wrp = hdr.parentElement;
    wrp.onpointerdown = function(e) {
        if (wrp.style.zIndex < highZ() - 1) {
            wrp.style.zIndex = highZ();
        }
    }
    hdr.onpointerdown = function(e) {
        e = e || window.event;
        // get the mouse cursor position at startup:
        var pos3 = e.clientX,
            pos4 = e.clientY;
        document.onmouseup = function() {
            document.onpointerup = null;
            document.onmousemove = null;
            document.ontouchmove = null;
            document.ontouchend = null;
        };
        // call a function whenever the cursor moves:
        setTouch(document, "touchend");
        setTouch(document, "touchmove");
        document.onmousemove = function(e) {
            if (e.clientY > 0) { // stop windows from getting dragged off the top of the screen
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

function highZ() {
    return Math.max.apply(null, Array.from(document.querySelectorAll('#main > div')).map(item => Number(item.style.zIndex))) + 1;
}

function makeVid(con, cls, wrp, hdr) {
    var cont = null,
        sender = getById("theirname").textContent;
    con.once('stream', function(peerstream) {
        if (hdr) {
            hdr.textContent = "call with " + sender;
        }
        cont = crEl("video", wrp);
        cont.autoplay = true;
        cont.srcObject = peerstream;
    });
    cls.onclick = function() {
        con.close();
    }
}

function makeCloser(hwrap) {
    var clsr = crEl("div", hwrap);
    clsr.className = "closer";
    clsr.textContent = "X";
    return clsr;
}