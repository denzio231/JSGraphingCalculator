var c = document.getElementById("graph");
var mathInputContainer = document.getElementById("mathInputContainer");
var ctx = c.getContext("2d");
var expression = '';
var scale = 1;
var temp_scale=1;
var offsetX = 0;
var offsetY = 0;
var tX = 0;
var tY = 0;
var last_e;
var ts = 0;
const h = 10**(-5);
var holding = false;
var funcDict = new Map();
var colorDict = new Map();
function Derivative(func,x){
    return (func.evaluate({x:x+h})-func.evaluate({x:x}))/h;
}
function renderAxes(){
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = `rgb(0,0,0)`
    originX = c.width/2+offsetX;
    originY = c.height/2+offsetY;
    ctx.beginPath();
    ctx.moveTo(originX,0);
    ctx.lineTo(originX,c.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,originY);
    ctx.lineTo(c.width,originY);
    ctx.stroke();
}
function floorToNearest(n,x){
    return Math.floor(n/x)*x;
}
function ceilToNearest(n,x){
    return Math.ceil(n/x)*x;
}
function renderGrid(){
    ctx.font = "24px serif";
    var gap = ceilToNearest(100/scale,1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgb(82, 82, 82)`
    originX = c.width/2+offsetX;
    originY = c.height/2+offsetY;
    for(let x = floorToNearest(translateX(0),gap);x<=floorToNearest(translateX(c.width),gap);x+=gap){
        ctx.beginPath();
        ctx.moveTo(x*scale+originX,0);
        ctx.lineTo(x*scale+originX,c.height);
        ctx.fillStyle = "black";
        ctx.fillText(x, x*scale+originX, originY-10);
        ctx.stroke();
    }
    for(let y = floorToNearest(translateY(c.height),gap);y<=floorToNearest(translateY(0),gap);y+=gap){
        ctx.beginPath();
        ctx.moveTo(0,originY-y*scale);
        ctx.lineTo(c.width,originY-y*scale);
        if(y!=0){
            ctx.fillStyle = "black";
            ctx.fillText(y, originX, originY-y*scale);
        }
        ctx.stroke();
    }
}
const interceptAccuracy = 2000;
function getRootsAndIntercepts(){
    roots = []
    intercepts = []
    originX = c.width/2+offsetX;
    originY = c.height/2+offsetY;
    let cloneDict = new Map(funcDict);
    for (const [key, func] of funcDict.entries()) {
        cloneDict.delete(key);
        var initialY = func.evaluate({x:-originX/scale});
        var sign = Math.sign(initialY);
        let lastX = -originX/scale;
        let lastY = initialY;
        var secSign = Math.sign((Derivative(func,-originX/scale+h)-Derivative(func,-originX/scale))/h);
        if(sign == 0){
            roots.push(-originX/scale);
        }
        for (let xi=1;xi<=interceptAccuracy;xi++){
            let x = (xi/interceptAccuracy)*c.width;
            fX = (x-originX)/scale;
            fY = func.evaluate({x:fX});
            let D = Derivative(func,fX);
            let Dh = Derivative(func,fX+h);
            let secD = (Dh-D)/h;
            let secSignNow = Math.sign(secD);
            let flag = (secSign!=secSignNow);
            secSign = secSignNow;
            if(flag && Math.abs(secD) > 10**3){
                sign = Math.sign(fY);
                continue;
            }
            if(sign!=Math.sign(fY) && sign!=0){
                let intercept = -lastY*((lastX-fX)/(lastY-fY))+lastX;
                roots.push(intercept);
            }
            sign = Math.sign(fY);
            nextY = func.evaluate({x:((x-originX)+1)/scale});
            for (const [k, cloneFunc] of cloneDict.entries()) {
                cloneY = cloneFunc.evaluate({x:(fX)});
                cloneNextY = cloneFunc.evaluate({x:((x-originX)+1)/scale});
                let a = (cloneNextY>nextY);
                let b = (cloneY>fY);
                if(a!=b){
                    let dx = 1/scale;
                    let m1 = (nextY-fY)/dx;
                    let m2 = (cloneNextY-cloneY)/dx;
                    let intercept = (-m2*fX+cloneY+m1*fX-fY)/(m1-m2);
                    let interceptY = m1*(intercept-fX)+fY;
                    intercepts.push([intercept,interceptY]);
                }
            }
            lastX = fX;
            lastY = fY;
        }
    }
    return [roots,intercepts]
}
function renderInterceptsAndRoots(){
    let ri = getRootsAndIntercepts();
    let roots = ri[0];
    let intercepts = ri[1];
    for(let i = 0;i<roots.length;i++){
        ctx.beginPath();
        ctx.arc(roots[i]*scale+originX, originY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.stroke();
    }
    for(let i = 0;i<intercepts.length;i++){
        ctx.beginPath();
        ctx.arc(intercepts[i][0]*scale+originX, originY-intercepts[i][1]*scale, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "green";
        ctx.fill();
        ctx.stroke();
    }
}
function checkHoverIntercept(e){
    originX = c.width/2+offsetX;
    originY = c.height/2+offsetY;
    let ri = getRootsAndIntercepts();
    let roots = ri[0];
    let intercepts = ri[1];
    for(let i = 0;i<roots.length;i++){
        let dist = Math.sqrt((e.x-(roots[i]*scale+originX))**2+(e.y-originY)**2);
        if(dist<5){
            //console.log('hovering')
        }
    }
}
function renderFunction(){
    originX = c.width/2+offsetX;
    originY = c.height/2+offsetY;
    var cloneDict = new Map(funcDict);
    let roots = [];
    let intercepts = [];
    for (const [key, func] of funcDict.entries()) {
        cloneDict.delete(key);
        ctx.beginPath();
        ctx.strokeStyle = colorDict.get(key);
        var initialY = func.evaluate({x:-originX/scale});
        var sign = Math.sign(initialY);
        var secSign = Math.sign((Derivative(func,-originX/scale+h)-Derivative(func,-originX/scale))/h);
        ctx.moveTo(0,originY-initialY*scale);
        if(sign == 0){
            roots.push(-originX/scale);
        }
        let lastX = -originX/scale;
        let lastY = initialY;
        ctx.lineWidth = 3;
        for (let x=1;x<=c.width;x++){
            funcX = x-originX;
            var fX = funcX/scale;
            funcY = func.evaluate({x:fX});
            let D = Derivative(func,fX);
            let Dh = Derivative(func,fX+h);
            let secD = (Dh-D)/h;
            let secSignNow = Math.sign(secD);
            let flag = (secSign!=secSignNow);
            secSign = secSignNow;
            if(flag && Math.abs(secD) > 10**3){
                //console.log(secD)
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x,originY-funcY*(scale));
                sign = Math.sign(funcY);
                continue;
            }
            if(sign!=Math.sign(funcY)){
                if(sign==0){
                    roots.push(fX);
                }
                else{
                    let intercept = -lastY*((lastX-fX)/(lastY-funcY))+lastX;
                    roots.push(intercept);
                }
            }
            lastX = fX;
            lastY = funcY;
            sign = Math.sign(funcY);
            ctx.lineTo(x,originY-funcY*(scale));
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black"
    }
}
function translateX(x){
    originX = c.width/2+offsetX;
    return (x-originX)/scale;
}
function translateY(y){
    originY = c.height/2+offsetY;
    return (originY-y)/scale;
}
function adjustOffset(zoomEvent){
    originX = c.width/2+offsetX;
    originY = c.height/2+offsetY;
    if(zoomEvent){
        mouseX = translateX(zoomEvent.x);
        mouseY = translateY(zoomEvent.y);
        newOriginX = zoomEvent.x-temp_scale*mouseX;
        newOriginY = zoomEvent.y+temp_scale*mouseY;
        offsetX = newOriginX-c.width/2;
        offsetY = newOriginY-c.height/2;
        scale = temp_scale;
    }
}
function render(zoomEvent){
    ctx.clearRect(0, 0, c.width, c.height);
    adjustOffset(zoomEvent)
    renderAxes();
    renderGrid();
    try{
        renderFunction();
    }
    catch(SyntaxError){}
    renderInterceptsAndRoots();
}

function resizeCanvas(){
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    render();
}
window.addEventListener("resize", resizeCanvas);
c.addEventListener('mousedown', function(e) {
    last_e=e;
    tX = offsetX;
    tY = offsetY;
    holding = true;
})
c.addEventListener('mouseup', function(e) {
    holding = false;
})
c.addEventListener('mousemove', function(e) {
    if(holding){
        ctx.clearRect(0, 0, c.width, c.height);
        offsetX = tX+e.x-last_e.x;
        offsetY = tY+e.y-last_e.y;
        render(e);
    }
    //checkHoverIntercept(e);
})
c.addEventListener("wheel",function(e){
    temp_scale = scale*((1.0005)**(-e.deltaY));
    render(e);
})
function inputBoxWrapper(box){
    return function(){
        expression = box.value;
        try{
            let func = math.compile(expression);
            if(typeof(func.evaluate({x:0}))!="number"){
                funcDict.delete(box.parentElement);
            }
            else{
                funcDict.set(box.parentElement,func);
            }
        }
        catch(SyntaxError){
            funcDict.delete(box.parentElement);
        }
        render();
    }
}
function colorBoxWrapper(colorBox){
    return function(){
        let color= colorBox.value;
        colorDict.set(colorBox.parentElement,color)
        render();
    }
}
function createMathInput(){
    var mainDiv = document.createElement("div");
    var colorInput = document.createElement("input");
    var inputBox = document.createElement("input");
    inputBox.type = "text";
    colorInput.type = "color";
    mathInputContainer.appendChild(mainDiv)
    inputBox.className = "mathInput";
    mainDiv.appendChild(inputBox);
    mainDiv.appendChild(colorInput)
    inputBox.onkeydown =  function(e){
        if(e.code == 'Enter'){
            createMathInput();
        }
    }
    let colorFunc = colorBoxWrapper(colorInput);
    inputBox.addEventListener("input",inputBoxWrapper(inputBox));
    colorInput.addEventListener("change", colorFunc, false);
    colorFunc();
    inputBox.focus();
}
createMathInput();
resizeCanvas();