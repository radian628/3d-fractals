#ifdef GL_ES
    precision highp float;
#endif

uniform vec3 uPosition;
uniform vec3 uRotation;
uniform float time;
uniform float scaleFactor;
uniform vec3 fractalRotationParams;
uniform vec3 lambertLightLocation;
uniform mat3 uRotationMatrix;
uniform vec2 uViewportSize;
uniform float fov;
uniform vec3 uFractalColor;
uniform float uShadowBrightness;
uniform float uHitThreshold;

uniform mat3 uIterationRotation;

//rotate around z axis
vec3 rz(vec3 coords, float angle) {
	mat3 rotationMatrix = mat3(
		cos(angle), -sin(angle), 0,
		sin(angle), cos(angle), 0,
		0, 0, 1);
	return rotationMatrix * coords;
}

//rotate around x axis
vec3 rx(vec3 coords, float angle) {
	mat3 rotationMatrix = mat3(
		1, 0, 0,
		0, cos(angle), -sin(angle),
		0, sin(angle), cos(angle));
	return rotationMatrix * coords;
}

//rotate around y axis
vec3 ry(vec3 coords, float angle) {
	mat3 rotationMatrix = mat3(
		cos(angle), 0, sin(angle),
		0, 1, 0,
		-sin(angle), 0, cos(angle));
	return rotationMatrix * coords;
}

//reflect across all three axes
vec3 reflectAxes(vec3 a) {
	return vec3(abs(a.z), abs(a.x), abs(a.y));
}

//ray reflection iteration (EDIT THIS TO CHANGE THE FRACTAL, MORE SPECIFICALLY THE "ANGLE" PARAMETER FOR RX, RY, AND RZ)
vec3 rayReflectIteration(vec3 a, vec3 offset, float iteration) {
	return uIterationRotation * reflectAxes(a) + offset;
}

//iteraetion count
#define ITERATIONS 0.0

#define STEPS 0

//cube signed distance function (SDF)
float cubeSDF(vec3 rayPosition, vec3 cubePosition, float cubeSize) {
	vec3 dist = abs(rayPosition) - cubePosition;
	return length(max(max(max(dist.x, dist.y), dist.z), 0.0)) + min(max(dist.x, max(dist.y, dist.z)), 0.0);
}

//fractal SDF
float fractalSDF(vec3 rayPosition, vec3 spherePosition, float sphereRadius) {
	vec3 rayPos2 = rayPosition;
	for (float i = 0.0; i < ITERATIONS; i++) {
		rayPos2 = rayReflectIteration(rayPos2 / scaleFactor, vec3(-2.0), i);
	}
	return cubeSDF(rayPos2, spherePosition, sphereRadius) * pow(scaleFactor, ITERATIONS);
}

//scene SDF
float globalSDF(vec3 rayPosition) {
	return fractalSDF(/*mod(rayPosition + vec3(1.0f), 2f) - vec3(1.0f)*/rayPosition, vec3(2.0, 2.0, 2.0), 2.0);
}

//march a single ray
vec3 marchRay(vec3 origin, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold) {
	vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < STEPS; i++) {
		minDist = globalSDF(position);
		position += directionNormalized * minDist;
		if (minDist < uHitThreshold) {
			stepsBeforeThreshold = i;
            break;
		}
	}
	finalMinDist = minDist;
	return position;
}


//light sources (currently unused)
vec3 lightSource = vec3(-1.0, -1.4, 0.0) * 2.5;
vec3 lightSource2 = vec3(1.0, 0.6, 0.5) * 2.5;

//lambertian diffuse shading
vec3 lambertShading(vec3 color, vec3 normal, vec3 light) {
	vec3 lightNormalized = normalize(light);
	float lightIntensity = max(0.0, dot(normal, lightNormalized));
	return color * lightIntensity;
}

//random function I found on stackoverflow
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

//marches the rays, calculates normals, determines and returns color, etc.
void main() {
	vec3 coords = gl_FragCoord.xyz / (uViewportSize.y) - vec3(uViewportSize.x / uViewportSize.y * 0.5, 0.5, 0.0);
	coords.x *= 1.5 * fov;
	coords.y *= 1.5 * fov;
	float distToSurface = 0.0;
	int steps1 = STEPS;
	float dx = 0.0001;
	
	vec3 dist = marchRay(uPosition, uRotationMatrix * vec3(coords.x, 1.0, coords.y), distToSurface, steps1);
	
	float shadowDistToSurface = 0.0;
	int shadowSteps = STEPS;
	vec3 shadowRay = marchRay(dist + (lambertLightLocation - dist) * uHitThreshold * 10.0, (lambertLightLocation - dist), shadowDistToSurface, shadowSteps);

	if (sign(shadowRay.x - lambertLightLocation.x) != sign(dist.x - lambertLightLocation.x)) {
		gl_FragColor = vec4(uFractalColor * (1.0 - float(steps1) / float(STEPS)), 1.0);
	} else {
		gl_FragColor = vec4(vec3(uFractalColor - float(steps1) / float(STEPS)) * uShadowBrightness, 1.0);
	}
}