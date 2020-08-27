//Define canvas for WebGL.
var c = document.getElementById("canvas");
var gl = c.getContext("webgl");

c.requestPointerLock = c.requestPointerLock ||
                            c.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock ||
                            document.mozExitPointerLock;

c.onclick = function () {
    c.requestPointerLock();
}

var pointerLockEnabled = false;

document.addEventListener('pointerlockchange', pointerLockHandler, false);
document.addEventListener('mozpointerlockchange', pointerLockHandler, false);

function pointerLockHandler(e) {
    pointerLockEnabled = document.pointerLockElement === c ||
    document.mozPointerLockElement === c;
    if (pointerLockEnabled && document.getElementById("ui-disappear").checked) {
        document.getElementById("ui").style.opacity = 0;
    } else {
        document.getElementById("ui").style.opacity = null;
    }
}

document.addEventListener('mousemove', function (e) {
    if (pointerLockEnabled) {
        playerTransform.rotation[0] += e.movementX * 0.003;
        playerTransform.rotation[1] += e.movementY * 0.003;

        playerTransform.quatRotation = quatMultiply(quatAngleAxis(e.movementX * -0.003, vectorQuaternionMultiply(playerTransform.quatRotation, [0, 0, 1])), playerTransform.quatRotation)
        playerTransform.quatRotation = quatMultiply(quatAngleAxis(e.movementY * -0.003, vectorQuaternionMultiply(playerTransform.quatRotation, [1, 0, 0])), playerTransform.quatRotation)
    }
});

function resizeWindow() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
}

resizeWindow();

window.addEventListener("resize", resizeWindow);

var keys = {};
document.addEventListener("keydown", function (e) {
    keys[e.key] = true;
});
document.addEventListener("keyup", function (e) {
    keys[e.key] = false;
});

//Compiles a shader.
function compileShader(shaderCode, type) {
	var shader = gl.createShader(type);
    
    gl.shaderSource(shader, shaderCode);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

//Builds the shader program.
function buildShaderProgram(vert, frag) {
    
    var shaderProgram = gl.createProgram();
    
    gl.attachShader(shaderProgram, compileShader(vert, gl.VERTEX_SHADER));
    
    gl.attachShader(shaderProgram, compileShader(frag, gl.FRAGMENT_SHADER));
    
    gl.linkProgram(shaderProgram);
    
    
    return shaderProgram;
}

//xmlhttprequest promise
async function request(text) {
    var req = new XMLHttpRequest();
    var returnPromise = new Promise((resolve, reject) => {
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    resolve(req);
                }
            }
        }
    });
    req.open("GET", text);
    req.send();
    return returnPromise;
}

var prog;
var vertexBuffer

//Initialize the stuff
async function init() {
    // var vertShader = (await request("vertex.glsl")).response;
    // var fragShader = (await request("fragment.glsl")).response;
    // prog = buildShaderProgram(vertShader, fragShader);
    await recompileShader();
    
    var vertexArray = new Float32Array([
    	-1, 1, 1, 1, 1, -1,
     	-1, 1, 1, -1, -1, -1
    ]);
    
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    drawLoop();
}

function matMultiply(vec, mat) {
    return [
        vec[0] * mat[0] + vec[1] * mat[3] + vec[2] * mat[6],
        vec[0] * mat[1] + vec[1] * mat[4] + vec[2] * mat[7],
        vec[0] * mat[2] + vec[1] * mat[5] + vec[2] * mat[8]
    ];
}

function rotateX(angle) {
    return [
        1, 0, 0,
        0, Math.cos(angle), -Math.sin(angle),
        0, Math.sin(angle), Math.cos(angle)
    ];
}

function rotateY(angle) {
    return [
        Math.cos(angle), 0, Math.sin(angle),
        0, 1, 0,
        -Math.sin(angle), 0, Math.cos(angle)
    ];
}

function rotateZ(angle) {
    return [
        Math.cos(angle), -Math.sin(angle), 0,
        Math.sin(angle), Math.cos(angle), 0,
        0, 0, 1
    ];
}

function getValue(elemID) {
    return Number(document.getElementById(elemID).value);
}

function vectorAdd(v1, v2) {
    return v1.map((e, i) => { return e + v2[i]; });
}

function dotProduct(v1, v2) {
    var sum = 0;
    for (var i = 0; v1.length > i; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
}

function crossProduct(v1, v2) {
    return [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0]
    ]
}

function norm(v) {
    return v.reduce((acc, cur) => { return acc + cur * cur }, 0);
}

function scalarMultiply(v, s) {
    return v.map(e => { return e * s });
}

function scalarDivide(v, s) {
    return v.map(e => { return e / s });
}

function quatConjugate(q) {
    return [q[0], -q[1], -q[2], -q[3]];
}

function quatInverse(q) {
    return scalarDivide(quatConjugate(q), norm(q));
}

function quatMultiply(q1, q2) {
    var w1 = q1[0];
    var w2 = q2[0];
    var v1 = [q1[1], q1[2], q1[3]];
    var v2 = [q2[1], q2[2], q2[3]];
    return [w1 * w2 - dotProduct(v1, v2), ...vectorAdd(vectorAdd(crossProduct(v1, v2), scalarMultiply(v2, w1)), scalarMultiply(v1, w2))]
}

function quatAngleAxis(angle, axis) {
    return [Math.cos(angle / 2), ...scalarMultiply(axis, Math.sin(angle / 2))];
}

function vectorQuaternionMultiply(q, v) {
    var result = quatMultiply(quatMultiply(q, [0, ...v]), quatInverse(q));
    result.splice(0, 1);
    return result;
}

function quatToMatrix(q) {
    var w = q[0];
    var x = q[1];
    var y = q[2];
    var z = q[3];

    var w2 = w * w;
    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    
    var wx = w * x;
    var wy = w * y;
    var wz = w * z;
    
    var xy = x * y;
    var xz = x * z;

    var yz = y * z;

    return [
        1 - 2 * y2 - 2 * z2, 2 * xy - 2 * wz, 2 * xz + 2 * wy,
        2 * xy + 2 * wz, 1 - 2 * x2 - 2 * z2, 2 * yz - 2 * wx,
        2 * xz - 2 * wy, 2 * yz + 2 * wx, 1 - 2 * x2 - 2 * y2
    ];

    // return [
    //     1 - 2 * q[2] * q[2] - 2 * q[3] * q[3], 2 * q[2] * q[3] + q[0] * q[1], 2 * q[1] * q[3] - 2 * q[0] * q[2],
    //     2 * q[1] * q[2] - 2 * q[0] * q[3], 1 - 2 * q[1] * q[1] - 2 * q[3] * q[3], 2 * q[2] * q[3] - 2 * q[0] * q[1],
    //     2 * q[1] * q[3] + 2 * q[0] * q[2], 2 * q[2] * q[3] - 2 * q[0] * q[1], 1 - 2 * q[1] * q[1] - 2 * q[2] * q[2]
    // ];
}

function matrixTranspose(m) {
    return [
        m[0], m[3], m[6],
        m[1], m[4], m[7],
        m[2], m[5], m[8]
    ];
}

function quatToEuler(q) {
    return [
        Math.atan2(2*q[2] * q[0] - 2 * q[1] * q[3], 1 - 2 * q[2] * q[2] - 2 * q[3] * q[3]),
        Math.asin(2 * q[1] * q[2] + 2 * q[3] * q[0]),
        Math.atan2(2*q[1] * q[0] - 2 * q[2] * q[3], 1 - 2 * q[1] * q[1] - 2 * q[3] * q[3])
    ]
}

var playerTransform = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    velocity: [0, 0, 0],
    quatRotation: [0, -1, 0, 0]
};

var uiParams = {
    fractalRotationParams: [0.1, 0.1, 0.1],
    playerSpeedMultiplier: 1,
    scaleFactor: 0.5,
    fov: 1,
    lambertLightLocation: [0, 0, 0],
    fractalColor: [1.0, 1.0, 1.0],
    fractalIterations: 12,
    raymarchingSteps: 64,
    shadowBrightness: 0.4,
    rayHitThreshold: 0.0001,
    shaderChoice: "fragment.glsl"
}

function hex2rgb(hex) {
    return [
        parseInt(hex.substring(1, 3), 16),
        parseInt(hex.substring(3, 5), 16),
        parseInt(hex.substring(5, 7), 16)
    ];
}

async function recompileShader() {
    var vertShader = (await request("vertex.glsl")).response;
    var fragShader = (await request(uiParams.shaderChoice)).response;
    fragShader = fragShader.replace("$fractalIterations", uiParams.fractalIterations + ".0");
    fragShader = fragShader.replace("$raymarchingSteps", uiParams.raymarchingSteps);
    prog = buildShaderProgram(vertShader, fragShader);
}

document.getElementById("fractal-iterations").onchange = function () {
    uiParams.fractalIterations = getValue("fractal-iterations");
    recompileShader();
}
document.getElementById("raymarching-steps").onchange = function () {
    uiParams.raymarchingSteps = getValue("raymarching-steps");
    recompileShader();
}
document.getElementById("shader-choice").onchange = function () {
    uiParams.shaderChoice = document.getElementById("shader-choice").value;
    recompileShader();
}

//Draw loop
var t = 0;
async function drawLoop() {
    t++;



    uiParams.fractalRotationParams = [
        getValue("fractal-rotation-0"),
        getValue("fractal-rotation-1"),
        getValue("fractal-rotation-2")
    ];
    uiParams.playerSpeedMultiplier = Math.pow(10, getValue("player-speed"));
    uiParams.scaleFactor = getValue("scale-factor");
    uiParams.fov = getValue("fov");
    uiParams.fractalColor = hex2rgb(document.getElementById("fractal-color").value).map(e => { return e / 64; });
    uiParams.shadowBrightness = getValue("shadow-brightness");
    uiParams.rayHitThreshold = Math.pow(10, getValue("ray-hit-threshold"));

    var acceleration = [0, 0, 0]

    if (keys.w) {
        acceleration[1] += 0.01;
    }
    if (keys.a) {
        acceleration[0] += -0.01;
    }
    if (keys.s) {
        acceleration[1] += -0.01;
    }
    if (keys.d) {
        acceleration[0] += 0.01;
    }
    if (keys.q) {
        acceleration[2] += -0.01;
    }
    if (keys[" "]) {
        acceleration[2] += 0.01;
    }
    if (keys.ArrowUp) {
        playerTransform.quatRotation = quatMultiply(quatAngleAxis(0.01, vectorQuaternionMultiply(playerTransform.quatRotation, [1, 0, 0])), playerTransform.quatRotation)
    }
    if (keys.ArrowDown) {
        playerTransform.quatRotation = quatMultiply(quatAngleAxis(-0.01, vectorQuaternionMultiply(playerTransform.quatRotation, [1, 0, 0])), playerTransform.quatRotation)
    }
    if (keys.ArrowLeft) {
        playerTransform.quatRotation = quatMultiply(quatAngleAxis(0.01, vectorQuaternionMultiply(playerTransform.quatRotation, [0, 0, 1])), playerTransform.quatRotation)
    }
    if (keys.ArrowRight) {
        playerTransform.quatRotation = quatMultiply(quatAngleAxis(-0.01, vectorQuaternionMultiply(playerTransform.quatRotation, [0, 0, 1])), playerTransform.quatRotation)
    }
    if (keys.e) {
        uiParams.lambertLightLocation = playerTransform.position.concat();
    }
    if (keys.i) {
        if (!document.getElementById("use-current-screen-size").checked) {
            c.width = getValue("screenshot-width");
            c.height = getValue("screenshot-height");
        }
        var prevRSteps = uiParams.raymarchingSteps;
        uiParams.raymarchingSteps = getValue("screenshot-raymarching-steps");
        await recompileShader();
        uiParams.raymarchingSteps = prevRSteps;
    }

    acceleration = acceleration.map(e => { return e * uiParams.playerSpeedMultiplier; });

    acceleration = vectorQuaternionMultiply(playerTransform.quatRotation, acceleration);//matMultiply(matMultiply(matMultiply(acceleration, rotateX(playerTransform.rotation[1])), rotateZ(playerTransform.rotation[0])), rotateY(playerTransform.rotation[2]));

    playerTransform.velocity = playerTransform.velocity.map((e, i) => { return e + acceleration[i]; });
    playerTransform.position = playerTransform.position.map((e, i) => { return e + playerTransform.velocity[i]; });
    playerTransform.position = playerTransform.position.map(e => { return e * 0.9; });



    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(prog);
    
    //gl.uniform4fv(gl.getUniformLocation(prog, "uGlobalColor"), [t * 0.01, 0.0, 0.0, 0.0]);
    gl.uniform1f(gl.getUniformLocation(prog, "scaleFactor"), uiParams.scaleFactor);
    gl.uniform3fv(gl.getUniformLocation(prog, "uPosition"), playerTransform.position);
    gl.uniform3fv(gl.getUniformLocation(prog, "uRotation"), /*playerTransform.rotation*/quatToEuler(playerTransform.quatRotation));
    gl.uniform3fv(gl.getUniformLocation(prog, "fractalRotationParams"), uiParams.fractalRotationParams);
    gl.uniform3fv(gl.getUniformLocation(prog, "lambertLightLocation"), uiParams.lambertLightLocation);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, "uRotationMatrix"), false, matrixTranspose(quatToMatrix(playerTransform.quatRotation)));
    gl.uniform2fv(gl.getUniformLocation(prog, "uViewportSize"), [c.width, c.height]);
    gl.uniform1f(gl.getUniformLocation(prog, "fov"), uiParams.fov);
    gl.uniform3fv(gl.getUniformLocation(prog, "uFractalColor"), uiParams.fractalColor);
    gl.uniform1f(gl.getUniformLocation(prog, "uShadowBrightness"), uiParams.shadowBrightness);
    gl.uniform1f(gl.getUniformLocation(prog, "uHitThreshold"), uiParams.rayHitThreshold);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    var aVertexPosition =
      gl.getAttribLocation(prog, "aVertexPosition");

    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 2,
        gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (keys.i) {
        keys.i = false;
        c.toBlob(blob => {
            saveAs(blob, "fractal_screenshot.png")
        });
        resizeWindow();
        recompileShader();
    }
    requestAnimationFrame(drawLoop);
}

init();