// Babylon.js vertex shader — terrain ground plane with height displacement (XZ, Y-up)
// Simplified FBM elevation (matches fragment shader's base elevation computation).
// uHeightScale controls vertical exaggeration (0 = flat, 0.018 = subtle bumps).

precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform float uSeed;
uniform float uHeightScale;
uniform vec2  uPan;
uniform float uZoom;

varying vec2 vUv;
varying vec3 vWorldPos3D; // actual 3D world position (for shadow map sampling)

// ---- Inline noise (identical constants to fragment shader) ----

float hash2v(vec2 p) {
  p = fract(p * vec2(443.897, 397.297));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

float noise2v(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2v(i),                 hash2v(i + vec2(1.0, 0.0)), f.x),
    mix(hash2v(i + vec2(0.0, 1.0)), hash2v(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// 5-octave FBM — matches fragment shader's simplified elevation path
float fbm2v(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise2v(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vUv = uv;

  // Reproduce fragment shader's seedOff + worldPos mapping
  float seedH1  = fract(sin(uSeed * 0.00001)          * 43758.5453);
  float seedH2  = fract(sin(uSeed * 0.000013 + 7.31)  * 24681.1357);
  vec2  seedOff = vec2(seedH1 * 50.0, seedH2 * 50.0);
  vec2  worldPos = (uv - 0.5) / uZoom + uPan + seedOff;

  // Simplified elevation (no full domain warp — cheaper in vertex shader)
  float elev      = fbm2v(worldPos * 3.0 + seedOff);
  float continents = fbm2v(worldPos * 0.8 + seedOff * 3.0);
  elev = mix(elev, continents, 0.4);

  vec3 displaced  = position;
  displaced.y    += elev * uHeightScale;

  // Ground mesh has no world transform → local position == world position
  vWorldPos3D = displaced;

  gl_Position = worldViewProjection * vec4(displaced, 1.0);
}
