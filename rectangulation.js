var gl;
var points;
var previousRect;

// uses web-gl gl.readPixels and works as expected
function takeScreenshot() {
    const targetElement = document.getElementById('gl-canvas');
    
    // Get the WebGL rendering context
    const gl = targetElement.getContext('webgl');

    if (!gl) {
        console.error('Unable to get WebGL context');
        return;
    }

    // Create an array to store pixel data
    const pixels = new Uint8Array(targetElement.width * targetElement.height * 4); // 4 channels (RGBA)

    // Read pixels from the framebuffer
    gl.readPixels(0, 0, targetElement.width, targetElement.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Create a temporary canvas and context
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');

    // Set the dimensions of the temporary canvas
    tempCanvas.width = targetElement.width;
    tempCanvas.height = targetElement.height;    

    // Create an ImageData object from the pixel data
    const imageData = new ImageData(new Uint8ClampedArray(pixels), targetElement.width, targetElement.height);

    // Put the ImageData onto the temporary canvas
    tempContext.putImageData(imageData, 0, 0);

    // flip in y-axis as gl.readPixels treats bottom-left as (0,0) instead of top-left like the rest of webgl
    tempContext.translate(0, tempCanvas.height);
    tempContext.scale(1, -1);
    tempContext.drawImage(tempCanvas, 0, 0);

    // Convert the temporary canvas to a data URL and trigger a download
    const dataUrl = tempCanvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'screenshot.jpg';
    link.click();
}

function main() {
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var point_set = new Int16Array([ // change to wanted pointset
        2,4,1,3
    ]);
    var n=point_set.length;

    var lines = [];
    for(var i=0;i<n;i++){
        lines.push({orientation: 0, endpoint_0: 0, endpoint_1: n+1})
    }

    function createButtons(containerId, numberOfButtons, rowTag) {
        var buttonContainer = document.getElementById(containerId);

        for (var i = 0; i < numberOfButtons; i++) {
            var button = document.createElement('button');
            if(rowTag==='EL'){
                button.textContent = 'Extend Left/down';
                button.id = i;
                button.classList.add('button-1');
            }else if(rowTag==='ER'){
                button.textContent = 'Extend Right/up';
                button.id = i;
                button.classList.add('button-2');
            }else{
                button.textContent = 'Flip';
                button.id = i;
                button.classList.add('button-3');
            }
            buttonContainer.appendChild(button);
        }
    }

    createButtons('button-container-1', n, 'EL');
    createButtons('button-container-2', n, 'ER');
    createButtons('button-container-3', n, 'F');

    document.getElementById('canvas-container').addEventListener('click', function(event) {
        if (event.target.tagName === 'BUTTON') {
            lineNum = parseInt(event.target.id); // force it to be an int

            if(event.target.textContent === 'Extend Left/down'){ // extending left and down cases
                previousRect = lines.map(a => ({...a}));
                if(lines[lineNum].endpoint_0!=0){
                    if(lines[lineNum].orientation===0){ // extending left case
                        // set new endpoint for line to retract
                        if(point_set[lines[lineNum].endpoint_0-1]>point_set[lineNum]){ // if line to retract is above
                            lines[lines[lineNum].endpoint_0-1].endpoint_0=point_set[lineNum];
                        }else{ // if line to retract is below
                            lines[lines[lineNum].endpoint_0-1].endpoint_1=point_set[lineNum];
                        }
                        
                        // set new endpoint for line to extend
                        var flag=0; 
                        for(var i=lines[lineNum].endpoint_0-2;i>=0;i--){
                            if(lines[i].orientation===1 && flag===0){
                                if(point_set[i]>point_set[lineNum] && lines[i].endpoint_0<lineNum+1){ // it's above and has an endpoint below
                                    lines[lineNum].endpoint_0=i+1;
                                    flag=1;
                                }else if(point_set[i]<point_set[lineNum] && lines[i].endpoint_1>lineNum+1){ // it's below and has an endpoint above
                                    lines[lineNum].endpoint_0=i+1;
                                    flag=1;
                                }
                            }
                        }
                        if(flag===0){
                            lines[lineNum].endpoint_0=0;
                        }
                    }else{ // extending down case

                        // set new endpoint for line to retract
                        if(point_set.indexOf(lines[lineNum].endpoint_0)<lineNum){ // if line to retract is left
                            lines[point_set.indexOf(lines[lineNum].endpoint_0)].endpoint_1=lineNum+1;
                        }else{ // if line to retract is right
                            lines[point_set.indexOf(lines[lineNum].endpoint_0)].endpoint_0=lineNum+1;
                        }

                        // set new endpoint for line to extend
                        var newEndpoint=0;
                        var currentClosest=100000;
                        for(var i=0;i<n;i++){ // using a vertical permutation of pointset would allow this to be quicker
                            if(lines[i].orientation===0 && point_set[i]<lines[lineNum].endpoint_0
                                && (point_set[lineNum]-point_set[i])<currentClosest){ // horizontal and it's below the previous endpoint  and closer than all previous checks
                                if(i<lineNum && lines[i].endpoint_1>lineNum+1){ // left and has an endpoint right
                                    newEndpoint = point_set[i];
                                    currentClosest = point_set[lineNum]-point_set[i];
                                }else if(i>lineNum && lines[i].endpoint_0<lineNum+1){ // it's right and has an endpoint left
                                    newEndpoint = point_set[i];
                                    currentClosest = point_set[lineNum]-point_set[i];
                                }
                            }
                        }
                        lines[lineNum].endpoint_0 = newEndpoint;
                    }
                }else{
                    console.log('can\'t extend that way');
                }
            }else
            if(event.target.textContent === 'Extend Right/up'){ // extending right and up cases //TODOTODOTODO
                previousRect = lines.map(a => ({...a}));
                if(lines[lineNum].endpoint_1!=n+1){
                    if(lines[lineNum].orientation===0){ // extending right case
                        // set new endpoint for line to retract
                        if(point_set[lines[lineNum].endpoint_1-1]>point_set[lineNum]){ // if line to retract is above
                            lines[lines[lineNum].endpoint_1-1].endpoint_0=point_set[lineNum];
                        }else{ // if line to retract is below
                            lines[lines[lineNum].endpoint_1-1].endpoint_1=point_set[lineNum];
                        }
                        
                        // set new endpoint for line to extend
                        var flag=0; 
                        for(var i=lines[lineNum].endpoint_1;i<n;i++){
                            if(lines[i].orientation===1 && flag===0){
                                if(point_set[i]>point_set[lineNum] && lines[i].endpoint_0<lineNum+1){ // it's above and has an endpoint below
                                    lines[lineNum].endpoint_1=i+1;
                                    flag=1;
                                }else if(point_set[i]<point_set[lineNum] && lines[i].endpoint_1>lineNum+1){ // it's below and has an endpoint above
                                    lines[lineNum].endpoint_1=i+1;
                                    flag=1;
                                }
                            }
                        }
                        if(flag===0){
                            lines[lineNum].endpoint_1=n+1;
                        }
                    }else{ // extending up case
                        
                        // set new endpoint for line to retract
                        if(point_set.indexOf(lines[lineNum].endpoint_1)<lineNum){ // if line to retract is left
                            lines[point_set.indexOf(lines[lineNum].endpoint_1)].endpoint_1=lineNum+1;
                        }else{ // if line to retract is right
                            lines[point_set.indexOf(lines[lineNum].endpoint_1)].endpoint_0=lineNum+1;
                        }

                        // set new endpoint for line to extend
                        var newEndpoint=n+1;
                        var currentClosest=100000;
                        for(var i=0;i<n;i++){ // using a vertical permutation of pointset would allow this to be quicker
                            if(lines[i].orientation===0 && point_set[i]>lines[lineNum].endpoint_0
                                && (point_set[i]-point_set[lineNum])<currentClosest){ // horizontal and it's below the previous endpoint  and closer than all previous checks
                                if(i<lineNum && lines[i].endpoint_1>lineNum+1){ // left and has an endpoint right
                                    newEndpoint = point_set[i];
                                    currentClosest = point_set[i]-point_set[lineNum];
                                }else if(i>lineNum && lines[i].endpoint_0<lineNum+1){ // it's right and has an endpoint left
                                    newEndpoint = point_set[i];
                                    currentClosest = point_set[i]-point_set[lineNum];
                                }
                            }
                        }
                        lines[lineNum].endpoint_1 = newEndpoint;
                    }
                }else{
                    console.log('can\'t extend that way');
                }
            }else if(event.target.textContent === 'Flip'){
                previousRect = lines.map(a => ({...a}));
                if(lines[lineNum].orientation === 0){ // horizontal => vertical
                    lines[lineNum].orientation = 1;

                    // update first endpoint
                    // checks for closest horizontal line below
                    var newEndpoint=0;
                    var currentClosest=100000; // 'infinite'
                    for(var i=0;i<n;i++){
                        if(lines[i].orientation===0 && point_set[i]<point_set[lineNum] &&
                            (point_set[lineNum]-point_set[i])<currentClosest){ // horizontal and below and closer that current best
                            if((i<lineNum && lines[i].endpoint_1>lineNum+1) || (i>lineNum && lines[i].endpoint_0<lineNum+1)){ // (left and endpoint right) or (right and endpoint left)
                                newEndpoint=point_set[i];
                                currentClosest=point_set[lineNum]-point_set[i];
                            }
                        }
                    }
                    lines[lineNum].endpoint_0 = newEndpoint;

                    // update second endpoint
                    // checks for closest horizontal line above
                    newEndpoint=n+1;
                    currentClosest=100000;
                    for(var i=0;i<n;i++){
                        if(lines[i].orientation===0 && point_set[i]>point_set[lineNum] &&
                            (point_set[i]-point_set[lineNum])<currentClosest){ // horizontal and above and closer that current best
                            if((i<lineNum && lines[i].endpoint_1>lineNum+1) || (i>lineNum && lines[i].endpoint_0<lineNum+1)){ // (left and endpoint right) or (right and endpoint left)
                                newEndpoint=point_set[i];
                                currentClosest=point_set[i]-point_set[lineNum];
                            }
                        }
                    }
                    lines[lineNum].endpoint_1 = newEndpoint;

                }else{ // vertical => horizontal
                    lines[lineNum].orientation = 0;

                    // update first endpoint
                    // checks for closest vertical line left
                    var newEndpoint=0;
                    var currentClosest=100000; // 'infinite'
                    for(var i=lineNum-1;i>=0;i--){
                        if(lines[i].orientation===1 && i<lineNum && (lineNum-i)<currentClosest){ // vertical and left and closer than current best
                            if((point_set[i]<point_set[lineNum] && lines[i].endpoint_1>point_set[lineNum]) ||
                                (point_set[i]>point_set[lineNum] && lines[i].endpoint_0<point_set[lineNum])){ // (left and endpoint right) or (right and endpoint left)
                                newEndpoint=i+1;
                                currentClosest=lineNum-i;
                            }
                        }
                    }
                    lines[lineNum].endpoint_0 = newEndpoint;

                    // update second endpoint
                    // checks for closest vertical line right
                    newEndpoint=n+1;
                    currentClosest=100000;
                    for(var i=lineNum+1;i<n;i++){
                        if(lines[i].orientation===1 && i>lineNum && (i-lineNum)<currentClosest){ // vertical and right and closer than current best
                            if((point_set[i]<point_set[lineNum] && lines[i].endpoint_1>point_set[lineNum]) ||
                                (point_set[i]>point_set[lineNum] && lines[i].endpoint_0<point_set[lineNum])){ // (below and endpoint above) or (above and endpoint below)
                                newEndpoint=i+1;
                                currentClosest=i-lineNum;
                            }
                        }
                    }
                    lines[lineNum].endpoint_1 = newEndpoint;
                }
            }else{
                lines = previousRect.map(a => ({...a}));
            }
        render();
        }
    });

    render();

    function render(){
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Create points
        var segment_width = 2/(n+1);
        var pointsVertices = new Float32Array(n*2);
        for (var i=0;i<n;i++){
            pointsVertices[2*i] = -1+(segment_width*(i+1));
            pointsVertices[(2*i)+1] = -1+segment_width*point_set[i];
        }
    
        // Create lines
        var border = new Float32Array([
            -1,-1,-1,1,
            -1,1,1,1,
            1,1,1,-1,
            1,-1,-1,-1
        ])

        var linesVertices = new Float32Array((n+4)*4);
        for (var i=0;i<16;i++){
            linesVertices[i]=border[i];
        }

        for (var i=0;i<n;i++){
            if (lines[i].orientation==0){
                linesVertices[4*i+16] = -1+segment_width*lines[i].endpoint_0;
                linesVertices[4*i+17] = -1+segment_width*point_set[i];
                linesVertices[4*i+18] = -1+segment_width*lines[i].endpoint_1;
                linesVertices[4*i+19] = linesVertices[4*i+17];
            }else{
                linesVertices[4*i+16] = -1+segment_width*(i+1);
                linesVertices[4*i+17] = -1+segment_width*lines[i].endpoint_0;
                linesVertices[4*i+18] = linesVertices[4*i+16];
                linesVertices[4*i+19] = -1+segment_width*lines[i].endpoint_1;
            }
        }

        drawA(gl.POINTS, pointsVertices);
        drawA(gl.LINES, linesVertices);
        
    }

    function drawA(type, vertices) {
        var n = initBuffers(vertices);
        if (n < 0) {
            console.log('Failed to set the positions of the vertices');
            return;
        }
        gl.drawArrays(type, 0, n);
    }

    function initBuffers(vertices) {
        var n = vertices.length/2;

        var vertexBuffer = gl.createBuffer();
        if (!vertexBuffer) {
            console.log('Failed to create the buffer object');
            return -1;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        var vPosition = gl.getAttribLocation(program, 'vPosition');
        if (vPosition < 0) {
            console.log('Failed to get the storage location of vPosition');
            return -1;
        }

        gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
        return n;
    }
};



/*

// ha = # of horizontal lines above, hb = # of horizontal lines below
// vl = # of vertical lines left, vr = # of vertical lines right

,
                    ha: n-point_set[i], hb: point_set[i]-1,
                    vl: 0, vr: 0


// update ha's
for(var i=0;i<n;i++){
    if(point_set[i]<point_set[lineNum]){
        lines[i].ha--;
    }
}

// update hb's
for(var i=0;i<n;i++){
    if(point_set[i]>point_set[lineNum]){
        lines[i].hb--;
    }
}

// update vl's
for(var i=lineNum+1;i<n;i++){
    lines[i].vl++;
}

// update vr's
for(var i=0;i<lineNum;i++){
    lines[i].vr++;
}
*/
