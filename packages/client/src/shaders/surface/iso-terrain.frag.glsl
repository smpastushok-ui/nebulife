#version 300 es
// iso-terrain.frag.glsl
// Isometric terrain shader for PixiJS v8 Filter on a fullscreen sprite.
// Renders the complete surface ground layer in 1 draw call.
//
// Coordinate system:
//   - The filter operates in screen pixels.
//   - uContainerPos = worldContainer.position (px) — origin of the iso grid on screen.
//   - uZoom         = worldContainer.scale
//   - Screen → world: world = (screen - containerPos) / zoom
//   - World → grid:   col = (wx/TW2 + wy/TH2) * 0.5,  row = (wy/TH2 - wx/TW2) * 0.5
//     (TW2 = 64, TH2 = 40)

precision mediump float;

// ---- High precision for coordinate math ----
// (mediump on some mobile GPUs has only 10 bits of mantissa,
//  which breaks the iso-to-grid mapping at large grid sizes)

// Uniforms (group name must match the JS resource key "isoUniforms")
uniform float uSeed;
uniform float uWaterLevel;
uniform float uGridSize;
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uContainerPos;
uniform float uZoom;

// Color palette (normalised 0-1 RGB)
uniform vec3  uDeepOcean;
uniform vec3  uOcean;
uniform vec3  uCoast;
uniform vec3  uBeach;
uniform vec3  uLowland;
uniform vec3  uPlains;
uniform vec3  uHills;
uniform vec3  uMountains;
uniform vec3  uPeaks;
uniform vec3  uFogColor;

// Fog texture: N x N, R channel = revealed (255) or hidden (0)
uniform sampler2D uFogTex;

// PixiJS passes screen-space coords via vTextureCoord (0-1, scaled by uInputSize)
// In a Filter applied to a fullscreen sprite, we reconstruct screen pos as:
//   screenPos = vTextureCoord * uOutputTexture.xy
// However, the simplest approach: use gl_FragCoord directly (screen pixels).
// Note: PixiJS v8 Filter vertex shader uses:
//   out vec2 vTextureCoord; // in [0,1] over the filter area
// and passes uOutputFrame (x,y,w,h in pixels) and uOutputTexture (w,h,1/w,1/h).
// We use these standard PixiJS v8 filter uniforms.

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
in vec2 vTextureCoord;

out vec4 fragColor;

// ---- Hash noise (matches surface-utils.ts getCellElevation) ----
// h = fract(sin(x*127.1 + y*311.7 + seed*0.1) * 43758.5453) * 0.7
//   + fract(sin(x*269.5 + y*183.3 + seed*0.2) * 21345.6789) * 0.3
float cellElevation(float x, float y, float seed) {
  float s = seed;
  float h1 = fract(sin(x * 127.1 + y * 311.7 + s * 0.1) * 43758.5453);
  float h2 = fract(sin(x * 269.5 + y * 183.3 + s * 0.2) * 21345.6789);
  return h1 * 0.7 + h2 * 0.3;
}

// Value noise over a block grid of size B (matches valueNoise in surface-utils.ts)
float valueNoise(float col, float row, float seed, float B) {
  float bx = floor(col / B);
  float by = floor(row / B);
  float fx = (col - bx * B) / B;
  float fy = (row - by * B) / B;
  // Smoothstep
  float sx = fx * fx * (3.0 - 2.0 * fx);
  float sy = fy * fy * (3.0 - 2.0 * fy);
  float e00 = cellElevation(bx,       by,       seed);
  float e10 = cellElevation(bx + 1.0, by,       seed);
  float e01 = cellElevation(bx,       by + 1.0, seed);
  float e11 = cellElevation(bx + 1.0, by + 1.0, seed);
  return e00 * (1.0 - sx) * (1.0 - sy)
       + e10 *        sx  * (1.0 - sy)
       + e01 * (1.0 - sx) *        sy
       + e11 *        sx  *        sy;
}

// Multi-octave smooth elevation — matches smoothElevation() in surface-utils.ts
// Returns elevation in [0,1].
float smoothElevation(float col, float row, float seed, float N) {
  float large  = valueNoise(col, row, seed,          10.0);
  float medium = valueNoise(col, row, seed + 4321.0,  5.0);
  float small  = valueNoise(col, row, seed + 8888.0,  3.0);
  float noise  = large * 0.58 + medium * 0.28 + small * 0.14;

  // Radial island mask
  float cx = (col / (N - 1.0) - 0.5) * 2.0;
  float cy = (row / (N - 1.0) - 0.5) * 2.0;
  float r2 = min(1.0, cx * cx + cy * cy);
  float mask = (1.0 - r2) * 0.28;

  return min(1.0, noise + mask);
}

// ---- Terrain color from elevation ----
// Thresholds match classifyCellTerrain() in surface-utils.ts.
// Returns (color, waterFlag) where waterFlag=1.0 for water cells.
vec3 terrainColor(float e, float wl, float time, float col, float row, float seed) {
  // Wave animation offset for water cells (subtle shimmer)
  float wavePhase = time * 0.0008 + col * 0.3 + row * 0.17;
  float wave = sin(wavePhase) * 0.04;

  if (wl <= 0.0) {
    // Dry planet — no water
    if (e < 0.30) return uLowland;
    if (e < 0.55) return uPlains;
    if (e < 0.75) return uHills;
    if (e < 0.90) return uMountains;
    return uPeaks;
  }

  if (e < 0.20) return uDeepOcean * (1.0 + wave);
  if (e < 0.36) return uOcean     * (1.0 + wave * 0.7);
  if (e < 0.44) return uCoast     * (1.0 + wave * 0.4);
  if (e < 0.50) return uBeach;
  if (e < 0.68) return uLowland;
  if (e < 0.80) return uPlains;
  if (e < 0.90) return uHills;
  if (e < 0.96) return uMountains;
  return uPeaks;
}

// ---- Diamond tile edge darkening ----
// Returns 1.0 in the tile body, <1.0 near the diamond edges.
// dInner = normalised distance from the nearest diamond edge in the [0,1] tile local space.
float tileDarkening(vec2 frac) {
  // frac is local position within the tile [0,1]^2 mapped to a diamond:
  // edge distance = 1 - |fx - 0.5| - |fy - 0.5| (iso diamond in a unit square)
  float d = 1.0 - abs(frac.x - 0.5) * 2.0 - abs(frac.y - 0.5) * 2.0;
  // d = 0 at corners, 1 at center
  return 0.88 + 0.12 * smoothstep(0.0, 0.12, d);
}

void main() {
  // Reconstruct screen-space pixel position from PixiJS Filter built-ins.
  // uOutputFrame.xy = top-left of filter area in screen pixels.
  vec2 screenPos = vTextureCoord * uOutputFrame.zw + uOutputFrame.xy;

  // Transform screen → iso world space (inverse of worldContainer transform)
  vec2 worldPos = (screenPos - uContainerPos) / uZoom;

  // Iso world → grid (float, not rounded — for sub-tile detail)
  // gridToScreen: wx=(col-row)*64,  wy=(col+row)*40
  // Inverse: col = (wx/64 + wy/40)*0.5,  row = (wy/40 - wx/64)*0.5
  float TW2 = 64.0;
  float TH2 = 40.0;
  float fCol = (worldPos.x / TW2 + worldPos.y / TH2) * 0.5;
  float fRow = (worldPos.y / TH2 - worldPos.x / TW2) * 0.5;

  float N = uGridSize;

  // Out of bounds — show fog / deep space color
  if (fCol < -0.5 || fCol >= N + 0.5 || fRow < -0.5 || fRow >= N + 0.5) {
    fragColor = vec4(uFogColor, 1.0);
    return;
  }

  // Cell integer coordinates (which tile am I in)
  float col = floor(fCol);
  float row = floor(fRow);

  // ---- Fog check ----
  // Fog texture is N x N; uv = (col + 0.5, row + 0.5) / N
  vec2 fogUV = vec2((col + 0.5) / N, (row + 0.5) / N);
  float revealed = texture(uFogTex, fogUV).r;

  if (revealed < 0.5) {
    fragColor = vec4(uFogColor, 1.0);
    return;
  }

  // ---- Elevation and terrain color ----
  float e = smoothElevation(col, row, uSeed, N);
  vec3 color = terrainColor(e, uWaterLevel, uTime, col, row, uSeed);

  // ---- Tile edge darkening (subtle grid lines) ----
  vec2 frac = vec2(fCol - col, fRow - row);
  float edge = tileDarkening(frac);
  color *= edge;

  fragColor = vec4(color, 1.0);
}
