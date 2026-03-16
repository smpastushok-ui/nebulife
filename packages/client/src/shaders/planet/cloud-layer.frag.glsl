// Cloud layer shader - procedural 3D FBM noise on sphere
// Wind-animated semi-transparent clouds with Fresnel rim fade

uniform vec3 uCloudColor;
uniform float uCoverage;
uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewDir;

// --- Hash-based 3D noise (deterministic, portable) ---

float hash3(vec3 p) {
  p = fract(p * vec3(443.897, 397.297, 491.187));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vPosition);
  // Wind offset for cloud drift animation
  vec3 windOffset = vec3(uTime * 0.015, uTime * 0.005, uTime * 0.008);
  float clouds = fbm(n * 3.5 + windOffset);
  clouds = smoothstep(0.40, 0.62, clouds);

  // Fresnel rim fade - clouds transparent at edges
  float rim = max(dot(vNormal, vViewDir), 0.0);
  rim = smoothstep(0.0, 0.3, rim);

  float alpha = clouds * uCoverage * rim;
  gl_FragColor = vec4(uCloudColor, alpha);
}
