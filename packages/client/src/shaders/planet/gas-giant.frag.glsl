// Gas giant / ice giant surface shader
// Horizontal bands, storms, zonal winds, polar darkening
// Ported from HomePlanetRenderer.renderGiantBands()

uniform float uSeed;
uniform vec3  uBandColor1;
uniform vec3  uBandColor2;
uniform float uIsGasGiant;       // 1.0 = gas giant, 0.0 = ice giant
uniform float uBandCount;        // 14 gas, 10 ice
uniform vec3  uStarDir;
uniform vec3  uStarColor;
uniform float uStarIntensity;
uniform float uTime;
uniform float uAlbedo;

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
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
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
  vec3 seedOff = vec3(hashSeed(uSeed), hashSeed(uSeed + 1.0), hashSeed(uSeed + 2.0)) * 500.0;

  // Latitude (-1 to 1 from pole to pole)
  float yFrac = n.y;
  float absLat = abs(yFrac);

  // Band position with noise displacement (wavy band edges)
  float displacement = fbm(n * vec3(2.0, 0.5, 2.0) + seedOff, 3) * 0.12;
  float bandPos = (yFrac * 0.5 + 0.5 + displacement) * uBandCount;
  float bandIndex = floor(bandPos);
  float bandFrac = bandPos - bandIndex;

  // Smooth transition between bands
  float t = smoothstep(0.3, 0.7, bandFrac);

  // Alternate between two band colors
  vec3 midColor = mix(uBandColor1, uBandColor2, 0.5);
  bool evenBand = mod(bandIndex, 2.0) < 1.0;
  vec3 color;
  if (evenBand) {
    color = mix(uBandColor1, uBandColor2, t);
  } else {
    color = mix(uBandColor2, uBandColor1, t);
  }

  // Fine detail noise within bands (texture)
  float detail = fbm(n * vec3(12.0, 20.0, 12.0) + seedOff, 3);
  color = mix(color, midColor, detail * 0.15);

  // Zonal flow distortion (wind patterns)
  float flow = fbm(vec3(n.x * 6.0 + n.y * 2.0, n.y * 3.0, n.z * 6.0) + seedOff, 3) * 0.06;
  vec3 shiftedColor = mix(color, uBandColor1, abs(flow));
  color = mix(color, shiftedColor, 0.3);

  // Slow band drift animation
  vec3 driftOff = vec3(uTime * 0.003 * (evenBand ? 1.0 : -1.0), 0.0, uTime * 0.002);

  // Storm spots
  vec3 stormSeedOff = seedOff + vec3(444.0);
  if (uIsGasGiant > 0.5) {
    // Gas giants: prominent dark reddish storms
    float stormVal = fbm(n * 5.0 + stormSeedOff + driftOff, 3);
    if (stormVal > 0.3) {
      float stormIntensity = clamp((stormVal - 0.3) / 0.35, 0.0, 1.0);
      vec3 stormColor = mix(uBandColor2, vec3(0.67, 0.33, 0.20), 0.4);
      color = mix(color, stormColor, stormIntensity * 0.5);
    }
  } else {
    // Ice giants: subtle bright spots
    float spotVal = fbm(n * 4.0 + stormSeedOff + driftOff, 3);
    if (spotVal > 0.35) {
      float spotIntensity = clamp((spotVal - 0.35) / 0.4, 0.0, 1.0);
      vec3 spotColor = mix(uBandColor1, vec3(0.67, 0.80, 0.93), 0.3);
      color = mix(color, spotColor, spotIntensity * 0.4);
    }
  }

  // Polar darkening
  if (absLat > 0.7) {
    float polarDarken = clamp((absLat - 0.7) / 0.3, 0.0, 1.0);
    vec3 polarColor = uIsGasGiant > 0.5 ? vec3(0.27, 0.20, 0.13) : vec3(0.13, 0.20, 0.27);
    color = mix(color, polarColor, polarDarken * 0.5);
  }

  // --- Lighting ---

  // Fresnel limb darkening
  float rimDot = max(dot(vNormal, vViewDir), 0.0);
  float limbDarken = smoothstep(0.0, 0.5, rimDot);

  // Day/night
  float daylight = dot(n, uStarDir);
  float dayFactor = smoothstep(-0.15, 0.3, daylight);

  // Dark base for limb effect
  vec3 darkBase = uIsGasGiant > 0.5 ? vec3(0.10, 0.06, 0.03) : vec3(0.04, 0.06, 0.13);

  vec3 lit = mix(darkBase, color, 0.25 + limbDarken * 0.75);
  lit *= mix(vec3(0.05), uStarColor * uStarIntensity, dayFactor);
  lit *= 0.6 + uAlbedo * 0.8;

  gl_FragColor = vec4(lit, 1.0);
}
