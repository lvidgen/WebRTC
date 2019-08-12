function makeWindow(tag, vidcon, txt) {
	var wrap = document.createElement("div");
	wrap.className="draggable";
	wrap.style.zIndex=++openWins;
	document.body.appendChild(wrap);
	var hdrwrap = document.createElement("div");
	hdrwrap.className="hdwrp";
	var hdr = document.createElement("div");
	hdr.className="dragheader";
	hdr.textContent=txt;
	hdrwrap.appendChild(hdr);
	wrap.appendChild(hdrwrap);
	var cnfwrp=document.createElement("div");
	var btn_y=document.createElement("button");
	btn_y.appendChild(document.createTextNode("Accept"));
	btn_y.className="conf_btn accept_stream";
	cnfwrp.appendChild(btn_y);
	var btn_n=document.createElement("button");
	btn_n.appendChild(document.createTextNode("Reject"));
	btn_n.className="conf_btn reject_stream";
	cnfwrp.appendChild(btn_n);
	wrap.appendChild(cnfwrp);
	btn_n.onclick=function(){
		switch(tag){
			case "vid":
		vidcon.answer();
		vidcon.on('stream', function(peerstream) {
			setTimeout(function(){
			vidcon.close();
			document.body.removeChild(wrap);
			},0);
		});
			break;
			case "pic":
			document.body.removeChild(wrap);
			break;
		}	
	}
	if(tag=="info"){
		var dv = document.createElement("div");
		dv.appendChild(document.createTextNode(vidcon));
		btn_y.textContent="OK";
		wrap.lastChild.insertBefore(dv, btn_y);
		cnfwrp.removeChild(btn_n);
	}
	btn_y.onclick=function(){
	wrap.removeChild(cnfwrp);
	var clsr=document.createElement("div");
	clsr.className="closer";
	clsr.textContent="X";
	var cont = null;
	hdrwrap.appendChild(clsr);
	wrap.onmousedown = function(e){
		if(wrap.style.zIndex < openWins){
			wrap.style.zIndex = ++openWins;
		}
	}
	
	hdr.onmousedown = function(e){
	e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    var pos3 = e.clientX;
    var pos4 = e.clientY;
    document.onmouseup = function(){
	    document.onmouseup = null;
		document.onmousemove = null;
	};
    // call a function whenever the cursor moves:
    document.onmousemove = function(e){
	var e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    var pos1 = pos3 - e.clientX;
    var pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    wrap.style.top = (wrap.offsetTop - pos2) + "px";
    wrap.style.left = (wrap.offsetLeft - pos1) + "px";
			}
		}

	switch(tag){
		case "vid":
		vidcon.answer();
		vidcon.on('stream', function(peerstream) {
			cont = document.createElement("video");
			cont.autoplay = true;
			hdr.textContent=vidcon.metadata=="scrn"?"screen shared from "+conn.peer:"call with "+conn.peer;
			cont.srcObject = peerstream;
			wrap.appendChild(cont);
		});
		wrap.style.resize="both";
		clsr.onclick=function(){
		let stream=cont.srcObject;
		closeMediaConn(stream);
		vidcon.close();
		document.body.removeChild(wrap);
		}
		break;
		case "pic":
		cont = document.createElement("img");
		cont.src = vidcon;
		cont.className="pic_cont";
		wrap.style.resize="both";
		wrap.appendChild(cont);
		clsr.onclick=function(){
		document.body.removeChild(wrap);
		}
		break;
		case "err":
		document.body.removeChild(wrap);
		clsr.onclick=function(){
		document.body.removeChild(wrap);
		}
		break;
		}	
	
	}
	
	}
