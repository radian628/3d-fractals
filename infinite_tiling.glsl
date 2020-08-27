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
	return rx(rz(ry(reflectAxes(a), 
	fractalRotationParams.x), 
	fractalRotationParams.y), 
	fractalRotationParams.z) + offset;
}

//iteraetion count
#define ITERATIONS $fractalIterations

#define STEPS $raymarchingSteps

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
	return fractalSDF(mod(rayPosition, 2.0), vec3(2.0, 2.0, 2.0), 2.0);
}

//march a single ray
vec3 marchRay(vec3 origin, vec3 direction, out float finalMinDist, out int stepsBeforeThreshold) {
	vec3 directionNormalized = normalize(direction);
	vec3 position = origin;
	float minDist = 0.0;
	for (int i = 0; i < STEPS; i++) {
		minDist = globalSDF(position);
		position += directionNormalized * minDist;
		if (minDist > uHitThreshold) {
			stepsBeforeThreshold = i;
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
	//color = vec3(marchRay(vec3(0.0f, 0.0f, 0.0f), vec3(coords.x, 1.0f, coords.y), 16), 0.0f, 0.0f);
	//lightSource = vec3(cos(time / 100f), sin(time / 100f), 0f) * 30f;
	float distToSurface = 0.0;
	float distToSurfaceX = 0.0;
	float distToSurfaceY = 0.0;
	int steps1 = 0;
	int steps2 = 0;
	int steps3 = 0;
	float dx = 0.0001;
	//vec3 currentPosition = vec3(0.523f + time * 0.00000f, time * 0.0004f - 0.49f, 0.52f + time * 0.00000f);//vec3(time * 0.01f, time * 0.01f, 0.0f);
	//vec3 dist = marchRay(uPosition, ry(rx(rz(vec3(coords.x, 1.0, coords.y), uRotation.x), uRotation.y), uRotation.z), steps, distToSurface, steps1);
	//vec3 distX = marchRay(uPosition, ry(rx(rz(vec3(coords.x + dx, 1.0, coords.y), uRotation.x), uRotation.y), uRotation.z), steps, distToSurfaceX, steps2);
	//vec3 distY = marchRay(uPosition, ry(rx(rz(vec3(coords.x, 1.0, coords.y + dx), uRotation.x), uRotation.y), uRotation.z), steps, distToSurfaceY, steps3);
	
	vec3 dist = marchRay(uPosition, uRotationMatrix * vec3(coords.x, 1.0, coords.y), distToSurface, steps1);
	
	//vec3 distX = marchRay(uPosition, uRotationMatrix * vec3(coords.x + dx, 1.0, coords.y), distToSurfaceX, steps2);
	//vec3 distY = marchRay(uPosition, uRotationMatrix * vec3(coords.x, 1.0, coords.y + dx), distToSurfaceY, steps3);
	//vec3 normal = normalize(cross((dist - distX), (dist - distY)));

	float shadowDistToSurface = 0.0;
	int shadowSteps = -1;
	vec3 shadowRay = marchRay(dist + (lambertLightLocation - dist) * uHitThreshold, (lambertLightLocation - dist), shadowDistToSurface, shadowSteps);

	//gl_FragColor = vec4(vec3(1.0 - float(steps1) / 32.0), 1.0);/*vec4(vec3(0.10, 0.10, 0.10) * vec3(clamp(15.0 / pow(float(steps1), 0.5), 0.0, 15.0)), 1.0);*/
	if (shadowDistToSurface > uHitThreshold * 0.5 || sign(shadowRay.x - lambertLightLocation.x) != sign(dist.x - lambertLightLocation.x)) {
		gl_FragColor = vec4(uFractalColor * (1.0 - float(steps1) / 32.0), 1.0);
		//gl_FragColor = vec4(lambertShading(vec3(1.0, 1.0, 1.0), normal, lambertLightLocation), 1.0);
	} else {
		//gl_FragColor = vec4(0.5, 0.0, 0.0, 1.0);//gl_FragColor = vec4(lambertShading(vec3(1.0, 1.0, 1.0), normal, lambertLightLocation), 1.0) - vec4(0.5, 0.5, 0.5, 0.0);
		gl_FragColor = vec4(vec3(uFractalColor - float(steps1) / 32.0) * uShadowBrightness, 1.0);
	}
}