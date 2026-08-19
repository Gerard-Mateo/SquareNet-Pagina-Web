var time = 3000;
var numofitems = 5;

//menu constructor
function menu(allitems,thisitem,startstate){ 
  callname= "gl"+thisitem;
  divname="subglobal"+thisitem;  
  this.numberofmenuitems = numofitems;
  this.caller = document.getElementById(callname);
  this.thediv = document.getElementById(divname);
  this.thediv.style.visibility = startstate;
}

//menu methods
function ehandler(event,theobj){
  for (var i=1; i<= theobj.numberofmenuitems; i++){
    var shutdiv =eval( "menuitem"+i+".thediv");
    shutdiv.style.visibility="hidden";
  }
  theobj.thediv.style.visibility="visible";
}

function closesubnav(event){
	var altoMouse = event.clientY + document.body.scrollTop + document.documentElement.scrollTop
	if ((altoMouse <150)||(altoMouse > 224)) {
		for (var i=1; i<= numofitems; i++){
			var shutdiv =eval('menuitem'+i+'.thediv');
			shutdiv.style.visibility='hidden';
		}
	}
}

function fullScreen(theURL, fullscreen) {
	window.open(theURL, '', 'fullscreen=' + fullscreen + ', scrollbars=auto');
}


function inyectaClientesShow(){
	document.write('<div id="contenedorClientes">');
	document.write('<div id="slidesClientes" class="MySlides">');
	document.write('<img src="img/1.jpg">');
	document.write('<img src="img/2.jpg">');
	document.write('<img src="img/3.jpg">');
	document.write('<img src="img/4.jpg">');
	document.write('<img src="img/5.jpg">');
	document.write('<img src="img/6.jpg">');
	document.write('<img src="img/7.jpg">');
	document.write('<img src="img/8.jpg">');
	document.write('<img src="img/9.jpg">');
	document.write('<img src="img/10.jpg">');
	document.write('<img src="img/11.jpg">');
	document.write('<img src="img/12.jpg">');
	document.write('<img src="img/13.jpg">');
	document.write('<img src="img/14.jpg">');
	document.write('<img src="img/15.jpg">');
	document.write('<img src="img/16.jpg">');
	document.write('<img src="img/17.jpg">');
	document.write('<img src="img/18.jpg">');
	document.write('<img src="img/19.jpg">');
	document.write('<img src="img/20.jpg">');
	document.write('<img src="img/21.jpg">');
	document.write('<img src="img/22.jpg">');
	document.write('</div>');
	document.write('</div>');
}

$(function() {
      $('#slidesClientes').slidesjs({
        width: 150,
        height: 100,
        play: {
          active: false,
		  effect: "slide",
		  // fade or slide
          auto: true,
          interval: 3000,
          swap: false
        },
		navigation: {
          active: false
        },
		pagination: {
		  active: false
		}
      });
    });