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
	wrap.style.resize="both";
	var cont = null;
	var clsr=makeCloser(hdrwrap);
	wrap.onmousedown = function(e){
		if(wrap.style.zIndex < openWins){
			wrap.style.zIndex = ++openWins;
		}
	}
	


	switch(tag){
		case "vid":
		if(vidcon.metadata=="scrn"){
			vidcon.answer();
			hdr.textContent="screen shared from "+conn.peer;
		} else {
			hdr.textContent="call with "+conn.peer;
		(async function() {
			  let stream = null;
			  try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
				vidcon.answer(stream);
				vidcon.once('close', function() { 
				  closeMediaConn(stream, wrap);
					});
			  } catch(err) {
				console.log(err)
				/* handle the error */
			  }
			})();
		}
		makeVid(vidcon, clsr, wrap);
		break;
		case "photo":
		hdr.textContent="photo shared by "+conn.peer;
		cont = document.createElement("img");
		cont.src = vidcon;
		cont.className="pic_cont";
		wrap.appendChild(cont);
		clsr.onclick=function(){
		document.body.removeChild(wrap);
		}
		break;
		case "pdf":
		hdr.textContent="pdf shared by "+conn.peer;
		cont = document.createElement("iframe");
		cont.sandbox="allow-scripts";
		cont.src = vidcon;
		cont.className="pdf_cont";
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
	
	if(tag=="calling"){
		wrap.removeChild(cnfwrp);
		var clsr=makeCloser(hdrwrap);
		makeVid(vidcon,clsr,wrap, hdr);
		return wrap;
		}
	}
	
	function makeVid(con, cls, wrp, hdr){
		var cont=null;
		con.once('stream', function(peerstream) {
			if(hdr){
				hdr.textContent="call with "+conn.peer;
			}
			cont = document.createElement("video");
			cont.autoplay = true;
			cont.srcObject = peerstream;
			wrp.appendChild(cont);
		});

		cls.onclick=function(){
		con.close();
		}
	}
	
	function makeCloser(hwrap){
	var clsr=document.createElement("div");
	clsr.className="closer";
	clsr.textContent="X";
	hwrap.appendChild(clsr);
	return clsr;
	}
