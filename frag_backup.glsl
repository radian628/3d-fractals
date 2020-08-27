#ifdef GL_ES
    precision highp float;
#endif

uniform vec4 uGlobalColor;

void main() {
    gl_FragColor = vec4(gl_FragCoord.x / 512.0, 0.5, 0.5, 1.0) + uGlobalColor;
}