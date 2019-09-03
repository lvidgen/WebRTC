var shapebtn;
// last known position
var pos = { x: 0, y: 0 };


function setDims(ctx, wrp){
	ctx.canvas.width = wrp.clientWidth;
	ctx.canvas.height = wrp.clientHeight;
};

function makeCanvas(incoming){
  	var wrp = getById("draw_wrapper");
	if(incoming){
		var canvas = document.createElement("canvas");
		canvas.className="theircanvas";
		wrp.insertBefore(canvas, wrp.lastChild);
	} else {
	var canvas = crEl("canvas",wrp);
	canvas.className="mycanvas";
	
	canvas.addEventListener("touchstart", function (e) {
	var touch = e.touches[0];
	  var mouseEvent = new MouseEvent("mousedown", {
		clientX: touch.clientX,
		clientY: touch.clientY,
		buttons: 1
	  });
	  canvas.dispatchEvent(mouseEvent);
	}, false);
	canvas.addEventListener("touchend", function (e) {
	  var mouseEvent = new MouseEvent("mouseup", {});
	  canvas.dispatchEvent(mouseEvent);
	}, false);
	canvas.addEventListener("touchmove", function (e) {
	  var touch = e.touches[0];
	  var mouseEvent = new MouseEvent("mousemove", {
		clientX: touch.clientX,
		clientY: touch.clientY,
		buttons: 1
	  });
	  canvas.dispatchEvent(mouseEvent);
	}, false);
	
	setListeners();	
	}	
	var ctx = canvas.getContext("2d");
	setDims(ctx, wrp);
};

function getCanvas(incoming){
	var whose = incoming?"theircanvas":"mycanvas";
	var cnvs = getById("draw_wrapper").getElementsByClassName(whose);
	cn = cnvs[cnvs.length-1];
	ct = cn.getContext("2d");
	return {cnv:cn, ctx:ct};
};
// add event listeners to specify when functions should be triggered


getById("undo_btn").onpointerdown= function(){
conn.send({tag:"undo"})
unDoIt();
};

getById("minicloser").onclick=function(){
getById("cnv_cntrls").style.display="none";
getById("txtwrp").style.display="none";
};

getById("stroke_col").onchange=checkFont;
getById("cnv_fnt").onchange=checkFont;
getById("fnt_sz").onchange=checkFont;
getById("txtsave").onpointerdown=saveText;
getById("txtdelete").onpointerdown=endText;

function setListeners(){
var canvas = getCanvas().cnv;
	canvas.onmousedown = function (e){
	setPosition(e);
	makeCanvas(false);
	conn.send({tag:"make_canvas"})
	};
canvas.style.cursor = "default";	

switch(shapebtn){
case "free_btn":
	canvas.onmousemove = makeFree;
break;
case "line_btn":
	canvas.onmousemove = makeLine;
break;
case "rect_btn":
	canvas.onmousemove = makeRect;	
break;
case "circ_btn":
	canvas.onmousemove = makeCircle;	
break;
case "text_btn":
    canvas.style.cursor = "text"; 
	canvas.onmouseup = function(){};
	canvas.onmousedown = function (e){
	setPosition(e);
	makeText(e);
	};
break;
case "erase_btn":
	
break;
case "picbg_btn":

break;
case "pdfbg_btn":

break;
case "undo_btn":

break;
	}	
};


getById("cnv_btns").onpointerdown=function(e){

if(e.target.id.indexOf("_btn")!=-1){
getById("cnv_cntrls").style.display="inline-flex";

var dvs = document.querySelectorAll("#cnv_cntrls > div"), i = 0, len = dvs.length;
for (i; i<len; i++){
dvs[i].style.display = "none"; 
	}

var toshow=[], nof=getById("nofillcb"), 
nol=getById("nolinecb"), noldv=getById("noline");
nof.checked=false;
nol.checked=false;
noldv.style.display="none";
switch(e.target.id){
case "free_btn":
	toshow = ["stroke_wt", "stroke_col", "t_style"];	
break;
case "line_btn":
	toshow = ["stroke_wt", "stroke_col", "t_style"];
break;
case "rect_btn":
	toshow = ["stroke_wt", "stroke_col", "fill_col"];
	noldv.style.display="block";	
break;
case "circ_btn":
	toshow = ["stroke_wt", "stroke_col", "fill_col"];
	noldv.style.display="block";	
break;
case "text_btn":
	toshow = ["stroke_col", "fnt_sz", "cnv_fnt"];	
break;
case "erase_btn":
	toshow = ["stroke_wt", "t_style"];	
break;
case "picbg_btn":
	toshow=["bkg_ctrls"];
break;
/* not yet :( 
case "pdfbg_btn":
	getById("cnv_cntrls").style.display="none";
break;
*/
case "undo_btn":
	getById("cnv_cntrls").style.display="none";
break;
};

shapebtn = e.target.id;
//setListeners();
for (var a =0; a<toshow.length; a++){
getById(toshow[a]).parentElement.style.display="block";
}
 var theid=e.target.id;
 if(theid.indexOf("btn")!=-1){
 var targ = theid.replace("btn","cntrls");
 getById(targ).appendChild(getById("cnv_cntrls"))
 }
}
}


// new position from mouse events
function setPosition(e) {
var canvas = getCanvas().cnv,
	rect = canvas.getBoundingClientRect();
      pos.x = e.clientX - rect.left;
      pos.y = e.clientY - rect.top;
};

//get inputs and send to draw functions/peer
function makeFree(e) {
  if (e.buttons !== 1) return; // if mouse is pressed.....
  var canvas = getCanvas().cnv,
  rect = canvas.getBoundingClientRect(),
  color = getById("stroke_col").value,
  wid = getById("stroke_wt").value, 
  cap_style = getById("t_style").value,
  frompos={x:pos.x, y:pos.y};
  setPosition(e);
  var topos={x:e.clientX - rect.left, y:e.clientY - rect.top},
  obj = {tag:"drawfree", col:color, width:wid, cap:cap_style, frpos:frompos, tpos:topos};
  conn.send(obj);
  drawFree(obj);
};

function makeLine(e) {
  if (e.buttons !== 1) return; // if mouse is pressed.....
  var canvas = getCanvas().cnv,
  rect = canvas.getBoundingClientRect(),
  color = getById("stroke_col").value,
  wid = getById("stroke_wt").value, 
  cap_style = getById("t_style").value,
  frompos={x:pos.x, y:pos.y},
  topos={x:e.clientX - rect.left, y:e.clientY - rect.top},
  obj = {tag:"drawline", col:color, width:wid, cap:cap_style, frpos:frompos, tpos:topos};
  conn.send(obj)
  drawLine(obj);
};

function makeRect(e) {
  if (e.buttons !== 1) return; // if mouse is pressed.....
  var canvas = getCanvas().cnv,
  rect = canvas.getBoundingClientRect(),
  outline = getById("stroke_col").value,
  wid = getById("stroke_wt").value,
  fill = getById("fill_col").value,
  nofill = getById("nofillcb").checked,
  noline = getById("nolinecb").checked,
  topos={x:e.clientX - rect.left - pos.x, y:e.clientY - rect.top - pos.y},
  obj = {tag:"drawrect", posx:pos.x, posy:pos.y, dx: topos.x, dy: topos.y, fl:fill, linecol:outline, lwid: wid, nl:noline, nf:nofill}
  conn.send(obj);
  drawRect(obj);
};

function makeCircle(e) {
	if (e.buttons !== 1) return; // if mouse is pressed.....
	var canvas = getCanvas().cnv,
	rect = canvas.getBoundingClientRect(),
	outline = getById("stroke_col").value,
	wid = getById("stroke_wt").value,
	fill = getById("fill_col").value,
	nDeltaX = pos.x - e.clientX + rect.left,
	nDeltaY = pos.y - e.clientY + rect.top,
	nofill = getById("nofillcb").checked,
	noline = getById("nolinecb").checked,
	radius = Math.sqrt(nDeltaX * nDeltaX + nDeltaY * nDeltaY),
	obj={tag:"drawcirc", posx:pos.x, posy:pos.y, rad:radius, fl:fill, linecol:outline, lwid: wid, nl:noline, nf:nofill};
	conn.send(obj)
	drawCirc(obj);
};


function makeText(e){
if (e.buttons !== 1) return; // if mouse is pressed.....
var inp = getById("txtinput"),
thebox = getById("txtwrp");
thebox.style.display="inline-grid";
checkFont();
inp.style.lineHeight=parseFloat(inp.style.fontSize)*.8+"px";
inp.innerHTML="&nbsp;";
setTimeout(function(){
getById("txtinput").focus();
thebox.style.left = pos.x+"px";
thebox.style.top = pos.y - (thebox.clientHeight)+"px";
inp.style.lineHeight=inp.style.fontSize;
},0)
};

function checkFont(){
var inpstl=getById("txtinput").style;
inpstl.color=getById("stroke_col").value;
inpstl.fontFamily=getById("cnv_fnt").value;
inpstl.fontSize=getById("fnt_sz").value+"px";
inpstl.lineHeight=inpstl.fontSize;
};

function saveText(){
var inp = getById("txtinput"),
inpstl=inp.style,
fnt = inpstl.fontSize + " " +inpstl.fontFamily,
flstl = inpstl.color,
fs = parseFloat(inpstl.fontSize);
var txtarr = inp.innerHTML.replace("&nbsp;","").split("<br>"), 
i=0, 
len = txtarr.length;
for (i; i<len; i++){
var delta = i * fs,
txt=txtarr[i],
obj = {tag:"drawtext", posx:pos.x, posy:pos.y + delta, stl:flstl, fnt:fnt, tx:txt};
conn.send({tag:"make_canvas"})
conn.send(obj);
drawText(obj);
makeCanvas(false);
};
endText();
};

function endText(){
getById("cnv_cntrls").style.display="none";
getById("txtwrp").style.display="none";
shapebtn="";
};


getById("clrpicbg_btn").onpointerdown=function(){
getById("bkg").style.backgroundImage="";
};

function unDoIt(){
var lastone, cvs = getById("draw_wrapper").getElementsByTagName("canvas"), len = cvs.length;
var lastone = cvs[len-2];
if (lastone){
	lastone.remove();
	}
};

// drawing on canvas
function drawFree(obj, incoming){
	var ctx = getCanvas(incoming).ctx;
  ctx.beginPath();			
  ctx.lineWidth = obj.width;
  ctx.lineCap = obj.cap; // rounded end cap
  ctx.strokeStyle = obj.col; // hex color of line
  ctx.moveTo(obj.frpos.x, obj.frpos.y); // from position
  ctx.lineTo(obj.tpos.x, obj.tpos.y);
  ctx.stroke();
  };

function drawLine(obj, incoming){
	var cnvobj = getCanvas(incoming)
	canvas = cnvobj.cnv,
	ctx = cnvobj.ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();			
  ctx.lineWidth = obj.width;
  ctx.lineCap = obj.cap; // rounded end cap
  ctx.strokeStyle = obj.col; // hex color of line
  ctx.moveTo(obj.frpos.x, obj.frpos.y); // from position
  ctx.lineTo(obj.tpos.x, obj.tpos.y);
  ctx.stroke();
  };

function drawRect(obj, incoming){
	var cnvobj = getCanvas(incoming)
	canvas = cnvobj.cnv,
	ctx = cnvobj.ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.strokeStyle = obj.linecol;
  ctx.lineWidth = obj.lwid;
  ctx.fillStyle = obj.fl;
  ctx.rect(obj.posx,obj.posy,obj.dx, obj.dy);
  if(!obj.nf){
  ctx.fill();
  }
  if(!obj.nl){
  ctx.stroke();
  }
  };

function drawCirc(obj, incoming){
	var cnvobj = getCanvas(incoming)
	canvas = cnvobj.cnv,
	ctx = cnvobj.ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(obj.posx, obj.posy, obj.rad, 0, Math.PI*2);
  ctx.strokeStyle = obj.linecol;
  ctx.lineWidth = obj.lwid;
  ctx.fillStyle = obj.fl;
  if(!obj.nf){
  ctx.fill();
  }
  if(!obj.nl){
  ctx.stroke();
  }
};

function drawText(obj, incoming){
var ctx = getCanvas(incoming).ctx;
ctx.font = obj.fnt;
ctx.fillStyle = obj.stl;
ctx.fillText(obj.tx, obj.posx, obj.posy)
};

document.body.addEventListener("pointerdown", function (e) {
  if (e.target.tagName == "canvas") {
    e.preventDefault();
  }
}, false);
document.body.addEventListener("pointerup", function (e) {
  if (e.target.tagName == "canvas") {
    e.preventDefault();
  }
}, false);
document.body.addEventListener("pointermove", function (e) {
  if (e.target.tagName == "canvas") {
    e.preventDefault();
  }
}, false);

