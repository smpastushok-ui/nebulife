// Cloud layer shader - procedural 3D FBM noise on sphere
// Wind-animated semi-transparent clouds with Fresnel rim fade

uniform vec3 uCloudColor;
uniform float uCoverage;
uniform float uTime;
uniform float uSeed;

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

// Hash large seed into small well-distributed value (float32-safe)
float hashSeed(float s) {
  s = fract(s * 0.0001031);
  s *= s + 33.33;
  s *= s + s;
  return fract(s);
}

void main() {
  vec3 n = normalize(vPosition);
  // Per-planet cloud pattern offset
  vec3 seedOff = vec3(hashSeed(uSeed), hashSeed(uSeed + 1.0), hashSeed(uSeed + 2.0)) * 500.0;
  // Wind offset for cloud drift animation
  vec3 windOffset = vec3(uTime * 0.015, uTime * 0.005, uTime * 0.008);
  float clouds = fbm(n * 3.5 + windOffset + seedOff);
  // Higher threshold = thinner, patchier clouds — more surface visible
  clouds = smoothstep(0.48, 0.68, clouds);

  // Secondary detail layer for wispy edges
  float detail = fbm(n * 7.0 + windOffset * 1.5 + seedOff + vec3(77.0));
  clouds *= smoothstep(0.25, 0.55, detail);

  // Fresnel rim fade - clouds transparent at edges
  float rim = max(dot(vNormal, vViewDir), 0.0);
  rim = smoothstep(0.05, 0.4, rim);

  float alpha = clouds * uCoverage * rim * 0.75;
  gl_FragColor = vec4(uCloudColor, alpha);
}
