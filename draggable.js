function makeWindow(tag, vidcon, txt) {
	var wrap = document.createElement("div");
	wrap.className="draggable";
	wrap.style.zIndex=++openWins;
	var hdrwrap = document.createElement("div");
	hdrwrap.className="hdwrp";
	var hdr = document.createElement("div");
	hdr.className="dragheader";
	hdr.textContent=txt;
	var clsr=document.createElement("div");
	clsr.className="closer";
	clsr.textContent="X";
	var cont = null;
	hdrwrap.appendChild(hdr);
	hdrwrap.appendChild(clsr);
	wrap.appendChild(hdrwrap);
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
		cont = document.createElement("video");
		cont.autoplay = true;
		vidcon.on('stream', function(peerstream) {
			cont.srcObject = peerstream;
			wrap.appendChild(cont);
			document.body.appendChild(wrap);
		});
		clsr.onclick=function(){
		let stream=cont.srcObject;
		closeMediaConn(stream)
		vidcon.close();
		document.body.removeChild(wrap);
		}
		break;
		case "pic":
		cont = document.createElement("img");
		break;
		}	

	}
