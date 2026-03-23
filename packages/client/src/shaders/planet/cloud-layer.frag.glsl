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
  vec3 L = normalize(uStarDir);

  // Wind: latitude-dependent differential rotation
  float latWindMul = 1.0 + (1.0 - latitude) * 0.35;
  vec3 windOffset = vec3(uTime * 0.012 * latWindMul, uTime * 0.004, uTime * 0.006);

  // =====================================================================
  // WEATHER FRONTS: elongated cloud bands (not round blobs)
  // =====================================================================
  // Warped FBM for organic continent-scale weather systems
  vec3 wQ = vec3(fbm(n * 2.0 + seedOff, 3), fbm(n * 2.0 + seedOff + vec3(5.2), 3), 0.0);
  float large = fbm(n * 3.0 + wQ * 0.5 + windOffset + seedOff, 6);
  large = smoothstep(0.52, 0.74, large);

  // Weather fronts: elongated bands along latitude (east-west stretched)
  float front1 = fbm(n * vec3(2.5, 8.0, 2.5) + windOffset + seedOff + vec3(400.0), 4);
  float front2 = fbm(n * vec3(4.0, 12.0, 4.0) + windOffset * 1.3 + seedOff + vec3(420.0), 3);
  float frontBand = smoothstep(0.48, 0.65, front1) * 0.5;
  frontBand += smoothstep(0.52, 0.68, front2) * 0.3;
  large = max(large, frontBand);

  // Medium detail: breaks large masses into cumulus patches
  float medium = fbm(n * 7.0 + windOffset * 1.4 + seedOff + vec3(77.0), 5);
  large *= smoothstep(0.20, 0.52, medium);

  // Fine wispy edges
  float fine1 = noise3(n * 16.0 + windOffset * 1.8 + seedOff + vec3(140.0));
  float fine2 = noise3(n * 28.0 + windOffset * 2.2 + seedOff + vec3(160.0));
  large *= smoothstep(0.18, 0.46, fine1);
  large *= 0.72 + smoothstep(0.3, 0.6, fine2) * 0.28;

  // Ultra-fine grain: pixel-level cloud texture
  float grain1 = noise3(n * 50.0 + windOffset * 2.5 + seedOff + vec3(180.0));
  float grain2 = noise3(n * 90.0 + windOffset * 3.0 + seedOff + vec3(185.0));
  large *= 0.80 + grain1 * 0.18 + grain2 * 0.08;

  // =====================================================================
  // CIRRUS: thin high-altitude streaks
  // =====================================================================
  vec3 cirrusWind = windOffset * 2.0 + vec3(uTime * 0.01, 0.0, 0.0);
  float cirrus = fbm(n * 12.0 + cirrusWind + seedOff + vec3(200.0), 5);
  float cirrusFine = noise3(n * 30.0 + cirrusWind + seedOff + vec3(220.0));
  cirrus = smoothstep(0.52, 0.70, cirrus) * 0.25;
  cirrus *= smoothstep(0.20, 0.48, cirrusFine);
  cirrus *= smoothstep(0.08, 0.28, latitude) * smoothstep(0.82, 0.48, latitude);

  // =====================================================================
  // CYCLONES: rotation-warped noise (logarithmic spiral, not sin() fans)
  // Key: rotate FBM sample coords around center proportional to distance
  // =====================================================================
  float cyclone = 0.0;
  for (int c = 0; c < 3; c++) {
    float cSeed = uSeed + float(c) * 100.0;
    float cLat = (hashSeed(cSeed + 20.0) - 0.5) * 0.6;
    float cLon = hashSeed(cSeed + 21.0) * 6.28;
    float cSize = 0.07 + hashSeed(cSeed + 22.0) * 0.06;
    float cStrength = 3.0 + hashSeed(cSeed + 23.0) * 4.0; // rotation tightness

    float lon = atan(n.z, n.x) + uTime * 0.006;
    float dx = mod(lon - cLon + 3.14159, 6.28318) - 3.14159;
    float dy = n.y - cLat;
    float dist = sqrt(dx * dx + dy * dy);

    if (dist < cSize * 4.0) {
      float falloff = 1.0 - smoothstep(0.0, cSize * 4.0, dist);
      // ROTATE the sampling point around cyclone center (creates spiral)
      float rotAngle = dist * cStrength * sign(cLat + 0.001); // Coriolis direction
      float cosR = cos(rotAngle);
      float sinR = sin(rotAngle);
      vec2 rotated = vec2(dx * cosR - dy * sinR, dx * sinR + dy * cosR);
      // Sample FBM at rotated position → natural spiral pattern
      vec3 rotP = n + vec3(rotated.x, rotated.y, 0.0) * 2.0;
      // Multi-scale cloud detail within spiral arms
      float stormCloud = fbm(rotP * 6.0 + seedOff + vec3(float(c) * 50.0), 5);
      stormCloud = smoothstep(0.30, 0.58, stormCloud);
      // Medium cumulus within arms
      float stormMed = noise3(rotP * 12.0 + seedOff + vec3(float(c) * 60.0));
      stormCloud *= smoothstep(0.18, 0.50, stormMed);
      // Fine puffy grain (pixel-level cotton texture)
      float stormGrain1 = noise3(rotP * 25.0 + seedOff + vec3(float(c) * 70.0));
      float stormGrain2 = noise3(rotP * 45.0 + seedOff + vec3(float(c) * 75.0));
      stormCloud *= 0.70 + stormGrain1 * 0.25 + stormGrain2 * 0.12;
      // Eye: clear center
      float eye = smoothstep(cSize * 0.15, cSize * 0.35, dist);
      // Eye wall: bright ring around eye
      float eyeWall = smoothstep(cSize * 0.12, cSize * 0.25, dist)
                    * smoothstep(cSize * 0.50, cSize * 0.30, dist);
      stormCloud = max(stormCloud * falloff * eye, eyeWall * 0.7);
      cyclone = max(cyclone, stormCloud * 0.55);
    }
  }

  // ITCZ: equatorial cloud band
  float itczBand = smoothstep(0.12, 0.0, latitude) * 0.15;
  float itczNoise = fbm(n * vec3(8.0, 1.5, 8.0) + windOffset + seedOff + vec3(300.0), 3);
  itczBand *= smoothstep(0.38, 0.56, itczNoise);

  // Latitude density
  float latDensity = 1.0;
  latDensity *= smoothstep(0.0, 0.08, latitude) * 0.3 + 0.7;
  latDensity *= 1.0 - smoothstep(0.18, 0.32, latitude) * 0.22;
  latDensity *= 1.0 + smoothstep(0.35, 0.55, latitude) * 0.18;
  latDensity *= 1.0 - smoothstep(0.78, 0.95, latitude) * 0.35;

  float totalCloud = large * latDensity + cirrus + itczBand + cyclone;
  totalCloud = clamp(totalCloud, 0.0, 1.0);

  // =====================================================================
  // LIGHTING: per-pixel cloud thickness → brightness variation
  // =====================================================================
  float rim = max(dot(vNormal, vViewDir), 0.0);
  rim = smoothstep(0.05, 0.35, rim);

  float NdotL = dot(n, L);
  float daylight = smoothstep(-0.1, 0.4, NdotL);

  // Cloud normal for self-shading: derive from TOTAL cloud density gradient
  float ceps = 0.003;
  // Sample total density at offset points (includes all cloud components)
  vec3 nX = n + vec3(ceps, 0.0, 0.0);
  vec3 nZ = n + vec3(0.0, 0.0, ceps);
  float dX = fbm(nX * 3.0 + wQ * 0.5 + windOffset + seedOff, 4)
           + noise3(nX * 16.0 + windOffset * 1.8 + seedOff + vec3(140.0)) * 0.3;
  float dZ = fbm(nZ * 3.0 + wQ * 0.5 + windOffset + seedOff, 4)
           + noise3(nZ * 16.0 + windOffset * 1.8 + seedOff + vec3(140.0)) * 0.3;
  float dC = large + fine1 * 0.3; // approximate center density
  vec3 cloudNorm = normalize(vec3(dC - dX, ceps * 5.0, dC - dZ));

  // Cloud shading: mostly WHITE, subtle gray only in deep folds
  float cloudLit = dot(cloudNorm, L);
  float cloudShade = smoothstep(-0.2, 0.3, cloudLit);

  // Fine bumps: per-pixel puffy relief
  float fineEps = 0.0008;
  float fnx = noise3((n + vec3(fineEps, 0.0, 0.0)) * 20.0 + windOffset + seedOff);
  float fnz = noise3((n + vec3(0.0, 0.0, fineEps)) * 20.0 + windOffset + seedOff);
  float fnc = noise3(n * 20.0 + windOffset + seedOff);
  vec3 fineNorm = normalize(cloudNorm + vec3((fnc - fnx) * 2.5, 0.0, (fnc - fnz) * 2.5));
  float fineShade = smoothstep(-0.15, 0.4, dot(fineNorm, L));
  cloudShade = cloudShade * 0.55 + fineShade * 0.45;

  // BRIGHT WHITE base — clouds are WHITE, not gray
  float dayBright = 0.35 + daylight * 0.65;
  vec3 litCloudColor = vec3(dayBright) * cloudShade
                      + vec3(dayBright * 0.75, dayBright * 0.77, dayBright * 0.82) * (1.0 - cloudShade);

  // Thick cores even brighter (cotton wool effect)
  litCloudColor += vec3(0.08) * smoothstep(0.2, 0.6, totalCloud) * daylight;

  // Puffy pixel grain: subtle brightness variation per pixel
  float puff1 = noise3(n * 40.0 + windOffset * 2.0 + seedOff + vec3(600.0));
  float puff2 = noise3(n * 70.0 + windOffset * 2.5 + seedOff + vec3(610.0));
  litCloudColor *= 0.90 + puff1 * 0.10 + puff2 * 0.05;

  // Sunset tint at terminator
  float terminatorBand = smoothstep(-0.1, 0.05, NdotL) * smoothstep(0.2, 0.0, NdotL);
  litCloudColor = mix(litCloudColor, vec3(1.2, 0.85, 0.55), terminatorBand * 0.25);

  // === OPACITY: dense cores opaque, edges feathered ===
  float thickness = totalCloud;
  float coreOpacity = smoothstep(0.10, 0.40, thickness);
  float alpha = coreOpacity * uCoverage * rim * 0.88;

  gl_FragColor = vec4(litCloudColor, alpha);
}
