(function(){
//Make the DIV element draggagle:
var drags = document.getElementsByClassName("draggable"), i=0, len = drags.length;
for (i; i<len;i++){
makeDraggable(drags[i])
}

function makeDraggable(elmnt) {
   elmnt.firstElementChild.onmousedown = function(e){
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
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
			}
		}
	}
})()