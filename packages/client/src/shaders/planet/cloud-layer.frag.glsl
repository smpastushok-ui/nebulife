// Cloud layer shader — Production-quality procedural clouds
// Features: multi-scale FBM, cyclone spirals, ITCZ equatorial band,
//   cirrus wisps, star-lit tops, latitude density variation, self-shadowing

uniform vec3  uCloudColor;
uniform float uCoverage;
uniform float uTime;
uniform float uSeed;
uniform vec3  uStarDir;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewDir;

// =====================================================================
// Noise library
// =====================================================================

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
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.48;
  }
  return v;
}

float hashSeed(float s) {
  s = fract(s * 0.0001031);
  s *= s + 33.33;
  s *= s + s;
  return fract(s);
}

void main() {
  vec3 n = normalize(vPosition);
  vec3 seedOff = vec3(hashSeed(uSeed), hashSeed(uSeed + 1.0), hashSeed(uSeed + 2.0)) * 500.0;
  float latitude = abs(n.y);

  // Wind offset: differential rotation by latitude (Hadley cells)
  float latWindMul = 1.0 + (1.0 - latitude) * 0.3; // faster at equator
  vec3 windOffset = vec3(uTime * 0.015 * latWindMul, uTime * 0.005, uTime * 0.008);

  // === Primary cloud mass (large cumulus / stratus) ===
  float clouds = fbm(n * 3.5 + windOffset + seedOff, 5);
  clouds = smoothstep(0.46, 0.70, clouds);

  // === Secondary detail (wispy edges, broken cumulus) ===
  float detail = fbm(n * 7.0 + windOffset * 1.5 + seedOff + vec3(77.0), 5);
  clouds *= smoothstep(0.22, 0.55, detail);

  // === Cirrus wisps (high altitude, thin, fast-moving) ===
  vec3 cirrusWind = windOffset * 1.8 + vec3(uTime * 0.008, 0.0, 0.0); // faster than cumulus
  float cirrus = fbm(n * 12.0 + cirrusWind + seedOff + vec3(200.0), 4);
  cirrus = smoothstep(0.52, 0.68, cirrus) * 0.35;
  // Cirrus more visible at mid-latitudes
  cirrus *= smoothstep(0.1, 0.35, latitude) * smoothstep(0.75, 0.5, latitude);

  // === ITCZ: Inter-Tropical Convergence Zone (dense cloud band near equator) ===
  float itczBand = smoothstep(0.15, 0.0, latitude) * 0.25;
  float itczNoise = fbm(n * vec3(6.0, 1.0, 6.0) + windOffset + seedOff + vec3(300.0), 3);
  itczBand *= smoothstep(0.35, 0.55, itczNoise);

  // === Cyclone spirals (tropical cyclones) ===
  float cyclone = 0.0;
  // 2-3 deterministic cyclone centers from seed
  for (int c = 0; c < 3; c++) {
    float cSeed = uSeed + float(c) * 100.0;
    float cLat = (hashSeed(cSeed + 20.0) - 0.5) * 0.5; // -0.25 to 0.25 latitude
    float cLon = hashSeed(cSeed + 21.0) * 6.28;
    float cSize = 0.08 + hashSeed(cSeed + 22.0) * 0.06;

    float lon = atan(n.z, n.x) + uTime * 0.01;
    float dx = mod(lon - cLon + 3.14159, 6.28318) - 3.14159;
    float dy = n.y - cLat;
    float dist = sqrt(dx * dx + dy * dy);

    if (dist < cSize * 3.0) {
      float cMask = 1.0 - smoothstep(0.0, cSize * 3.0, dist);
      // Spiral arms
      float angle = atan(dy, dx);
      // Coriolis: opposite rotation in each hemisphere
      float spiralDir = sign(cLat + 0.001);
      float spiral = sin(angle * spiralDir * 4.0 + dist * 25.0 - uTime * 0.03 * spiralDir);
      float arm = smoothstep(-0.2, 0.5, spiral) * cMask;
      // Eye: clear center
      float eye = smoothstep(cSize * 0.3, cSize * 0.5, dist);
      cyclone = max(cyclone, arm * eye * 0.6);
    }
  }

  // === Latitude-dependent cloud density ===
  // More clouds at mid-latitudes (Ferrel cell), less at subtropics (Hadley descent)
  float latDensity = 1.0;
  latDensity *= smoothstep(0.0, 0.1, latitude) * 0.3 + 0.7; // slightly less at equator (except ITCZ)
  latDensity *= 1.0 - smoothstep(0.20, 0.35, latitude) * 0.15; // subtropical dry
  latDensity *= 1.0 + smoothstep(0.35, 0.55, latitude) * 0.2;  // mid-lat storm track
  latDensity *= 1.0 - smoothstep(0.80, 0.95, latitude) * 0.3;  // polar desert

  // Combine all cloud components
  float totalCloud = clouds * latDensity + cirrus + itczBand + cyclone;
  totalCloud = clamp(totalCloud, 0.0, 1.0);

  // === Fresnel rim fade ===
  float rim = max(dot(vNormal, vViewDir), 0.0);
  rim = smoothstep(0.05, 0.4, rim);

  // === Star-lit cloud tops (day/night shading) ===
  float NdotL = dot(n, normalize(uStarDir));
  float daylight = smoothstep(-0.1, 0.4, NdotL);

  // Cloud color: bright on day side, dim on night side
  vec3 litCloudColor = uCloudColor * (0.25 + daylight * 0.75);

  // Sunset-tinted clouds at terminator
  float terminatorBand = smoothstep(-0.1, 0.05, NdotL) * smoothstep(0.2, 0.0, NdotL);
  vec3 sunsetCloud = uCloudColor * vec3(1.3, 0.8, 0.5);
  litCloudColor = mix(litCloudColor, sunsetCloud, terminatorBand * 0.4);

  // Self-shadowing: cloud layers slightly darken lower clouds
  float selfShadow = 1.0 - totalCloud * 0.12 * (1.0 - daylight * 0.5);

  float alpha = totalCloud * uCoverage * rim * 0.75 * selfShadow;
  gl_FragColor = vec4(litCloudColor, alpha);
}
