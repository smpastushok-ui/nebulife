// Moon surface shader - simplified terrain with craters
// Color driven by compositionType (rocky/icy/metallic/volcanic)

uniform float uSeed;
uniform vec3  uBaseColor;
uniform vec3  uHighColor;
uniform float uHasCraters;       // 1.0 for most moons
uniform vec3  uStarDir;
uniform vec3  uStarColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewDir;

// --- Hash-based 3D noise ---

float hash3(vec3 p) {
  p = fract(p * vec3(443.897, 397.297, 491.187));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    v += a * noise3(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vPosition);
  vec3 seedOff = vec3(uSeed * 0.1, uSeed * 0.07, uSeed * 0.13);

  // Base terrain
  float elevation = fbm(n * 2.0 + seedOff, 4);
  float t = clamp(elevation + 0.5, 0.0, 1.0);
  vec3 color = mix(uBaseColor, uHighColor, t);

  // Craters (secondary noise at higher frequency)
  if (uHasCraters > 0.5) {
    float craterNoise = fbm(n * 8.0 + seedOff + vec3(777.0), 3);
    if (craterNoise < -0.1) {
      float craterDepth = clamp((-0.1 - craterNoise) / 0.3, 0.0, 1.0);
      // Darken crater floors
      color = mix(color, color * 0.5, craterDepth);
      // Bright crater rims
      float rim = smoothstep(-0.15, -0.1, craterNoise) * smoothstep(-0.05, -0.1, craterNoise);
      color = mix(color, color * 1.3, rim * 0.5);
    }
  }

  // --- Lighting ---
  float rimDot = max(dot(vNormal, vViewDir), 0.0);
  float limbDarken = smoothstep(0.0, 0.5, rimDot);

  float daylight = dot(n, uStarDir);
  float dayFactor = smoothstep(-0.1, 0.2, daylight);

  vec3 lit = color * mix(vec3(0.02), uStarColor, dayFactor);
  lit *= 0.3 + limbDarken * 0.7;

  gl_FragColor = vec4(lit, 1.0);
}
