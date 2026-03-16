// Surface terrain shader — top-down satellite view
// Generates procedural terrain from planet physics: elevation noise -> biome coloring
// Supports 5 planet types: temperate(0), gas(1), ice(2), lava(3), barren(4)
// Composition-aware: Fe/Si/C/S affect surface per planet type

precision highp float;

// Core
uniform float uSeed;
uniform float uWaterLevel;       // waterCoverageFraction (0-1)
uniform float uTempK;            // surfaceTempK
uniform float uIceCap;           // iceCapFraction (0-1)
uniform float uLifeComplexity;   // 0=none, 1=micro, 2=simple, 3=complex, 4=intelligent
uniform vec3  uSurfaceBase;      // base terrain color
uniform vec3  uOceanColor;       // ocean color
uniform vec3  uBiomeTropical;    // biome palette
uniform vec3  uBiomeTemperate;
uniform vec3  uBiomeBoreal;
uniform vec3  uBiomeDesert;
uniform vec3  uBiomeTundra;
uniform vec2  uPan;              // pan offset in world units
uniform float uZoom;             // zoom level (1.0 = default)
uniform float uTime;             // animation time

// New surface uniforms
uniform float uHasLava;          // legacy (kept for compatibility)
uniform float uVolc;             // volcanism intensity 0-1
uniform float uWind;             // wind intensity 0-1
uniform float uType;             // 0=temperate 1=gas 2=ice 3=lava 4=barren

// Composition
uniform float uFeAbundance;      // Fe -> rust-red
uniform float uSiAbundance;      // Si -> pale sandy
uniform float uCAbundance;       // C  -> dark soil
uniform float uSAbundance;       // S  -> yellow tint

varying vec2 vUv;

// ---- Noise functions (hash-based, deterministic) ----

float hash2(vec2 p) {
  p = fract(p * vec2(443.897, 397.297));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// FBM with fixed-length loop (WebGL safe — no break)
float fbm2(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i < octaves) v += a * noise2(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Ridge noise: folded noise for mountain ridges
float ridgeNoise2(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i < octaves) {
      float nr = noise2(p);
      nr = 1.0 - abs(nr * 2.0 - 1.0); // fold -> sharp ridges
      nr = nr * nr;                      // sharpen
      v += a * nr;
    }
    p *= 2.2;
    a *= 0.5;
  }
  return v;
}

// River channel: valley noise (low absolute values = river center)
float riverChannel(vec2 p, int octaves) {
  float v = 0.0;
  float amp = 0.6;
  for (int i = 0; i < 4; i++) {
    if (i < octaves) {
      float nr = noise2(p);
      v += amp * abs(nr * 2.0 - 1.0); // valley = low |noise|
    }
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

// Crater pattern: ring shapes from noise
float craterNoise(vec2 p) {
  float d = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 cell = floor(p) + 0.5;
    float h = hash2(cell);
    if (h > 0.6) { // ~40% of cells have craters
      vec2 diff = fract(p) - 0.5;
      float dist = length(diff);
      float radius = 0.15 + h * 0.2;
      float ring = abs(dist - radius) / radius;
      float crater = smoothstep(0.3, 0.0, ring) * (1.0 - smoothstep(0.0, radius * 0.5, dist));
      d = max(d, crater * 0.5);
    }
    p *= 2.1;
  }
  return d;
}

// ---- Main ----

void main() {
  // World-space position accounting for pan and zoom
  // Hash the seed to a small deterministic offset (avoids float precision loss
  // when seeds are in the billions — large numbers destroy fract() in noise)
  float seedH1 = fract(sin(uSeed * 0.00001) * 43758.5453);
  float seedH2 = fract(sin(uSeed * 0.000013 + 7.31) * 24681.1357);
  vec2 seedOff = vec2(seedH1 * 50.0, seedH2 * 50.0);
  vec2 worldPos = (vUv - 0.5) / uZoom + uPan + seedOff;

  // Latitude (0=equator, 1=poles) for biome selection
  // Noise-offset breaks horizontal band coherence for organic biome edges
  float lat = abs(vUv.y - 0.5) * 2.0;
  float latNoise = fbm2(worldPos * 2.5 + seedOff * 2.0, 2);
  lat += (latNoise - 0.5) * 0.18;
  lat = clamp(lat, 0.0, 1.0);

  // ========================================================
  // TYPE 1: GAS GIANT — full override, horizontal bands
  // ========================================================
  if (uType > 0.5 && uType < 1.5) {
    // Banded atmosphere with turbulence
    float bandY = worldPos.y * 12.0;
    float bandNoise = noise2(vec2(worldPos.x * 0.5, bandY * 0.3) + seedOff) * 2.0;
    float band = sin(bandY + bandNoise) * 0.5 + 0.5;

    // Band colors influenced by composition
    // H2/He dominant -> beige-orange (Jupiter), CH4 -> blue-green (Uranus)
    vec3 bandLight = mix(vec3(0.75, 0.65, 0.45), vec3(0.45, 0.55, 0.65), uCAbundance * 0.8);
    vec3 bandDark = mix(vec3(0.55, 0.35, 0.20), vec3(0.25, 0.35, 0.50), uCAbundance * 0.8);
    // S (ammonia proxy) -> brownish bands
    bandLight = mix(bandLight, vec3(0.65, 0.55, 0.35), uSAbundance * 0.5);
    bandDark = mix(bandDark, vec3(0.45, 0.30, 0.15), uSAbundance * 0.5);

    vec3 col = mix(bandDark, bandLight, band);

    // Storm spots (oval vortex)
    float stormNoise = noise2(worldPos * 2.0 + seedOff * 3.0);
    if (stormNoise > 0.72) {
      float stormIntensity = smoothstep(0.72, 0.82, stormNoise);
      vec3 stormColor = mix(vec3(0.85, 0.65, 0.40), vec3(0.90, 0.80, 0.60), noise2(worldPos * 5.0));
      // Fe -> reddish storms (Great Red Spot)
      stormColor = mix(stormColor, vec3(0.80, 0.40, 0.25), uFeAbundance * 0.6);
      col = mix(col, stormColor, stormIntensity * 0.7);
    }

    // Turbulent flow detail
    float turb = fbm2(worldPos * 8.0 + vec2(uTime * 0.02, 0.0), 3);
    col += (turb - 0.5) * 0.08;

    // Wind-driven horizontal flow animation
    float flow = noise2(vec2(worldPos.x * 3.0 + uTime * 0.05, worldPos.y * 15.0));
    col += (flow - 0.5) * 0.04;

    // Edge darkening
    float edgeDist = length(vUv - 0.5);
    col *= 1.0 - edgeDist * 0.3;

    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // ========================================================
  // COMMON: Elevation + Domain Warping
  // ========================================================

  // Domain warping for organic coastlines
  vec2 warpOffset = vec2(
    fbm2(worldPos * 0.7 + vec2(100.0), 2),
    fbm2(worldPos * 0.7 + vec2(200.0), 2)
  );
  vec2 warpedPos = worldPos + warpOffset * 0.15;

  // Base elevation with warped coordinates
  float elevation = fbm2(warpedPos * 3.0, 5);
  // Large-scale continental shapes
  float continents = fbm2(warpedPos * 0.8 + seedOff * 3.0, 3);
  elevation = mix(elevation, continents, 0.4);

  // Ridge detail on highlands
  float ridgeDetail = ridgeNoise2(warpedPos * 4.5 + seedOff + vec2(111.0, 222.0), 4);
  float ridgeBlend = smoothstep(0.2, 0.55, elevation);
  elevation = mix(elevation, elevation + ridgeDetail * 0.25, ridgeBlend);

  // Micro-detail
  elevation += noise2(warpedPos * 30.0 + seedOff) * 0.035;

  // Water threshold from planet's water coverage
  float waterThresh = uWaterLevel * 0.65 + 0.1;
  bool isWater = elevation < waterThresh;

  // ========================================================
  // TYPE 2: ICE WORLD — cryogenic surface
  // ========================================================
  if (uType > 1.5 && uType < 2.5) {
    // Ice base color: blue-white
    vec3 iceBase = vec3(0.72, 0.80, 0.88);

    // Composition staining on ice
    iceBase = mix(iceBase, vec3(0.65, 0.50, 0.40), uFeAbundance * 0.25); // Fe -> rusty ice (Europa)
    iceBase = mix(iceBase, vec3(0.75, 0.70, 0.35), uSAbundance * 0.30);  // S -> yellow patches (Io)
    iceBase = mix(iceBase, vec3(0.40, 0.38, 0.35), uCAbundance * 0.25);  // C -> dark deposits

    // Ice variation
    float iceNoise = fbm2(warpedPos * 5.0 + seedOff, 4);
    vec3 col = mix(iceBase * 0.85, iceBase * 1.1, iceNoise);

    // Cryogenic cracks (inverted ridge noise = dark lines)
    float cracks = ridgeNoise2(warpedPos * 6.0 + seedOff * 2.0, 3);
    float crackMask = smoothstep(0.55, 0.70, cracks);
    vec3 crackColor = vec3(0.30, 0.38, 0.50); // deep blue-gray
    // Fe stains in cracks
    crackColor = mix(crackColor, vec3(0.50, 0.30, 0.20), uFeAbundance * 0.4);
    col = mix(col, crackColor, crackMask * 0.6);

    // Fine crack network
    float fineCracks = ridgeNoise2(warpedPos * 15.0 + seedOff * 4.0, 2);
    col = mix(col, crackColor * 1.2, smoothstep(0.60, 0.75, fineCracks) * 0.3);

    // Subsurface glow in thinner areas
    if (uTempK > 100.0) {
      float thin = smoothstep(0.5, 0.3, iceNoise);
      col += vec3(0.05, 0.08, 0.12) * thin;
    }

    // Slight color temperature shift with planet temperature
    float warmth = smoothstep(100.0, 250.0, uTempK);
    col = mix(col, col * vec3(1.05, 1.0, 0.95), warmth * 0.3);

    // Minimal life (extremophiles in cracks)
    if (uLifeComplexity > 0.5) {
      float lifePatch = noise2(warpedPos * 8.0 + vec2(444.0)) * crackMask;
      col = mix(col, vec3(0.35, 0.50, 0.35), lifePatch * 0.15 * min(uLifeComplexity / 4.0, 1.0));
    }

    // Normal shading
    float eps = 0.01;
    float ex = fbm2((warpedPos + vec2(eps, 0.0)) * 5.0 + seedOff, 3);
    float ey = fbm2((warpedPos + vec2(0.0, eps)) * 5.0 + seedOff, 3);
    vec2 grad = vec2(iceNoise - ex, iceNoise - ey) / eps;
    float shade = 0.85 + 0.15 * dot(normalize(vec2(-0.7, 0.5)), normalize(grad + vec2(0.001)));
    col *= shade;

    // Edge darkening
    col *= 1.0 - length(vUv - 0.5) * 0.25;

    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // ========================================================
  // TYPE 3: LAVA WORLD — volcanic planet
  // ========================================================
  if (uType > 2.5 && uType < 3.5) {
    // Dark solidified crust
    vec3 crustColor = vec3(0.12, 0.10, 0.08);
    crustColor = mix(crustColor, vec3(0.18, 0.10, 0.06), uFeAbundance * 0.3);
    crustColor = mix(crustColor, vec3(0.15, 0.14, 0.08), uSiAbundance * 0.2);

    float crustNoise = fbm2(warpedPos * 4.0 + seedOff, 4);
    vec3 col = mix(crustColor * 0.8, crustColor * 1.2, crustNoise);

    // Lava channels and flows
    float volcIntensity = max(uVolc, 0.3); // lava worlds always have some activity
    float lavaNoise = fbm2(warpedPos * 6.0 + vec2(uTime * 0.08, uTime * 0.05) + seedOff * 5.0, 4);
    float lavaFactor = smoothstep(0.45, 0.60, lavaNoise) * (1.0 - smoothstep(0.65, 0.85, lavaNoise));
    lavaFactor *= volcIntensity;

    // Lava color from composition
    vec3 lavaColor = vec3(0.85, 0.30, 0.05); // default orange
    lavaColor = mix(lavaColor, vec3(0.95, 0.50, 0.10), uFeAbundance * 0.4);  // Fe -> bright orange
    lavaColor = mix(lavaColor, vec3(0.90, 0.75, 0.15), uSAbundance * 0.5);   // S -> yellow lava
    lavaColor = mix(lavaColor, vec3(0.80, 0.55, 0.30), uSiAbundance * 0.3);  // Si -> paler, viscous

    // Lava temperature glow variation
    float lavaTemp = noise2(warpedPos * 15.0 + uTime * 0.2);
    vec3 hotLava = mix(lavaColor, vec3(1.0, 0.85, 0.30), lavaTemp * 0.4);
    col = mix(col, hotLava, lavaFactor * 0.9);

    // Lava glow emission
    col += hotLava * lavaFactor * 0.2;

    // Larger lava lakes in low areas
    float lakeFactor = smoothstep(0.3, 0.2, elevation) * volcIntensity;
    float lakeAnim = noise2(warpedPos * 3.0 + uTime * 0.03);
    col = mix(col, lavaColor * 1.3, lakeFactor * 0.6 * (0.7 + lakeAnim * 0.3));

    // Cooling crust texture (dark veins on solidified areas)
    float veins = ridgeNoise2(warpedPos * 10.0 + seedOff * 3.0, 3);
    float veinMask = smoothstep(0.5, 0.65, veins) * (1.0 - lavaFactor);
    col = mix(col, crustColor * 0.5, veinMask * 0.4);

    // Normal shading on crust
    float eps = 0.01;
    float ex = fbm2((warpedPos + vec2(eps, 0.0)) * 4.0 + seedOff, 3);
    float ey = fbm2((warpedPos + vec2(0.0, eps)) * 4.0 + seedOff, 3);
    vec2 grad = vec2(crustNoise - ex, crustNoise - ey) / eps;
    float shade = 0.80 + 0.20 * dot(normalize(vec2(-0.7, 0.5)), normalize(grad + vec2(0.001)));
    col *= shade;

    // Heat haze (subtle color shift)
    float haze = noise2(warpedPos * 2.0 + uTime * 0.15) * 0.03;
    col += vec3(haze, haze * 0.5, 0.0);

    // Edge darkening
    col *= 1.0 - length(vUv - 0.5) * 0.25;

    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // ========================================================
  // TYPE 4: ROCKY BARREN — lifeless, mineral-dominated
  // ========================================================
  if (uType > 3.5) {
    // Mineral colors dominate — no biome masking
    vec3 soilColor = uSurfaceBase;
    soilColor = mix(soilColor, vec3(0.65, 0.30, 0.15), uFeAbundance * 0.45); // Fe -> Mars-red
    soilColor = mix(soilColor, vec3(0.60, 0.58, 0.52), uSiAbundance * 0.35); // Si -> Mercury-gray
    soilColor = mix(soilColor, vec3(0.20, 0.18, 0.15), uCAbundance * 0.35);  // C -> dark
    soilColor = mix(soilColor, vec3(0.70, 0.65, 0.20), uSAbundance * 0.30);  // S -> yellow

    float terrainNoise = fbm2(warpedPos * 4.0 + seedOff, 4);
    vec3 col = mix(soilColor * 0.8, soilColor * 1.15, terrainNoise);

    // Craters
    float craters = craterNoise(warpedPos * 3.0 + seedOff);
    vec3 craterColor = soilColor * 0.55; // darker inside craters
    col = mix(col, craterColor, craters);

    // Elevation-based shade variation
    float elVar = smoothstep(0.3, 0.7, elevation);
    col = mix(col * 0.9, col * 1.1, elVar);

    // Scarce water (if any tiny amount)
    if (uWaterLevel > 0.01 && elevation < waterThresh) {
      float depth = (waterThresh - elevation) / max(waterThresh, 0.01);
      vec3 thinWater = mix(uOceanColor * 0.8, uOceanColor * 0.4, clamp(depth * 3.0, 0.0, 1.0));
      col = thinWater;
    }

    // Volcanic vents (if any volcanism)
    if (uVolc > 0.05) {
      float ventNoise = fbm2(warpedPos * 8.0 + vec2(uTime * 0.05, 0.0) + seedOff * 4.0, 3);
      float ventFactor = smoothstep(0.60, 0.70, ventNoise) * uVolc;
      vec3 ventColor = mix(vec3(0.70, 0.25, 0.05), vec3(0.85, 0.55, 0.10), noise2(warpedPos * 12.0));
      col = mix(col, ventColor, ventFactor * 0.5);
    }

    // Normal shading
    float eps = 0.01;
    float ex = fbm2((warpedPos + vec2(eps, 0.0)) * 4.0 + seedOff, 3);
    float ey = fbm2((warpedPos + vec2(0.0, eps)) * 4.0 + seedOff, 3);
    vec2 grad = vec2(terrainNoise - ex, terrainNoise - ey) / eps;
    float shade = 0.80 + 0.20 * dot(normalize(vec2(-0.7, 0.5)), normalize(grad + vec2(0.001)));
    col *= shade;

    // Edge darkening
    col *= 1.0 - length(vUv - 0.5) * 0.25;

    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // ========================================================
  // TYPE 0: TEMPERATE — Earth-like with full biomes
  // ========================================================

  // ---- Base terrain color (soil) ----
  vec3 soilColor = uSurfaceBase;
  soilColor = mix(soilColor, vec3(0.60, 0.30, 0.15), uFeAbundance * 0.30); // iron -> rusty
  soilColor = mix(soilColor, vec3(0.75, 0.70, 0.55), uSiAbundance * 0.20); // silicon -> sandy
  soilColor = mix(soilColor, vec3(0.20, 0.18, 0.15), uCAbundance * 0.30);  // carbon -> dark
  soilColor = mix(soilColor, vec3(0.70, 0.65, 0.20), uSAbundance * 0.25);  // sulfur -> yellow

  // ---- Water ----
  if (isWater) {
    float depth = (waterThresh - elevation) / max(waterThresh, 0.01);
    vec3 shallow = uOceanColor * 1.2;
    vec3 deep = uOceanColor * 0.5;
    vec3 waterColor = mix(shallow, deep, clamp(depth * 2.0, 0.0, 1.0));

    // Animated wave highlights
    float wave = noise2(worldPos * 20.0 + vec2(uTime * 0.5, uTime * 0.3));
    waterColor += vec3(0.03) * smoothstep(0.6, 0.8, wave);

    // Coast foam
    float coastDist = (waterThresh - elevation) / max(waterThresh, 0.01);
    if (coastDist < 0.08) {
      float foam = smoothstep(0.08, 0.0, coastDist);
      waterColor = mix(waterColor, vec3(0.70, 0.75, 0.80), foam * 0.4);
    }

    // Wind-driven wave animation
    if (uWind > 0.1) {
      float windWave = noise2(worldPos * 30.0 + vec2(uTime * uWind * 0.8, 0.0));
      waterColor += vec3(0.02) * smoothstep(0.55, 0.75, windWave) * uWind;
    }

    // Cloud shadows on water
    float cloudSh = fbm2(worldPos * 1.5 + vec2(uTime * 0.02, uTime * 0.01), 3);
    waterColor *= 0.90 + 0.10 * smoothstep(0.3, 0.6, cloudSh);

    // Edge darkening
    waterColor *= 1.0 - length(vUv - 0.5) * 0.25;

    gl_FragColor = vec4(waterColor, 1.0);
    return;
  }

  // ---- Land biome selection ----
  float elNorm = clamp((elevation - waterThresh) / (1.0 - waterThresh), 0.0, 1.0);
  // Height above water (0 = coast, 1 = peak)
  float h = elNorm;
  // Moisture from secondary noise
  float moisture = fbm2(worldPos * 4.0 + vec2(333.0, 777.0) + seedOff, 3);

  vec3 biomeColor = soilColor;

  if (uLifeComplexity > 0.5) {
    // Planet has life — smooth biome blending via latitude weights (no hard bands)
    float tropicalW = 1.0 - smoothstep(0.15, 0.30, lat);
    float temperateW = smoothstep(0.12, 0.25, lat) * (1.0 - smoothstep(0.38, 0.55, lat));
    float borealW = smoothstep(0.35, 0.50, lat) * (1.0 - smoothstep(0.58, 0.78, lat));
    float tundraW = smoothstep(0.58, 0.78, lat);

    // Per-zone biome color accounting for moisture
    vec3 tropBiome = mix(uBiomeTropical, uBiomeDesert, smoothstep(0.4, 0.2, moisture));
    vec3 tempBiome = mix(uBiomeTemperate, uBiomeDesert, smoothstep(0.45, 0.25, moisture));
    vec3 borBiome = mix(uBiomeBoreal, uBiomeTundra, smoothstep(0.4, 0.6, moisture));
    vec3 tunBiome = uBiomeTundra;

    // Weighted blend — no sharp transitions
    float totalW = tropicalW + temperateW + borealW + tundraW + 0.001;
    biomeColor = (tropBiome * tropicalW + tempBiome * temperateW +
                  borBiome * borealW + tunBiome * tundraW) / totalW;

    // Blend life intensity with bare soil
    // Dry areas show more mineral color through vegetation
    float lifeBlend = clamp(uLifeComplexity / 4.0, 0.0, 1.0) * moisture;
    biomeColor = mix(soilColor, biomeColor, lifeBlend * 0.7 + 0.3);

    // Dry zones reveal more mineral color
    float dryReveal = smoothstep(0.4, 0.15, moisture) * 0.3;
    biomeColor = mix(biomeColor, soilColor, dryReveal);
  }

  // ---- Rivers ----
  if (uWaterLevel > 0.1 && h < 0.4 && h >= 0.0) {
    // Check if planet should have rivers (temperate with water)
    float riverEnable = step(273.0, uTempK) * step(uTempK, 373.0) * step(0.1, uWaterLevel);
    if (riverEnable > 0.5) {
      float river1 = riverChannel(warpedPos * 4.0 + seedOff + vec2(888.0, 111.0), 3);
      float river2 = riverChannel(warpedPos * 9.0 + seedOff + vec2(999.0, 222.0), 2);

      // Width: wider near coast, thinner upstream
      float riverW1 = 0.06 + max(0.0, 1.0 - h * 4.0) * 0.04;
      float riverW2 = 0.035;

      float mask1 = 1.0 - smoothstep(0.0, riverW1, river1);
      float mask2 = 1.0 - smoothstep(0.0, riverW2, river2);
      float riverMask = max(mask1, mask2 * 0.5);

      // Fade at altitude (rivers start high, widen low)
      riverMask *= smoothstep(0.4, 0.08, h);

      // Delta near coast
      if (h < 0.04) {
        float delta = riverChannel(warpedPos * 14.0 + seedOff + vec2(777.0, 333.0), 2);
        float deltaMask = 1.0 - smoothstep(0.0, 0.10, delta);
        riverMask = max(riverMask, deltaMask * 0.4);
      }

      vec3 riverColor = mix(uOceanColor, vec3(0.20, 0.38, 0.52), 0.3);
      biomeColor = mix(biomeColor, riverColor, riverMask * 0.85);
    }
  }

  // ---- Ice caps ----
  if (uIceCap > 0.01) {
    float iceStart = 1.0 - uIceCap;
    float iceFactor = smoothstep(iceStart - 0.10, iceStart + 0.08, lat);
    vec3 iceColor = vec3(0.85, 0.90, 0.95);
    biomeColor = mix(biomeColor, iceColor, iceFactor);
  }

  // ---- Mountains (high elevation) ----
  if (h > 0.6) {
    float mountainFactor = smoothstep(0.6, 0.85, h);
    vec3 rockColor = soilColor * 0.6;
    biomeColor = mix(biomeColor, rockColor, mountainFactor * 0.7);
  }

  // ---- Mountain snow (patchy) ----
  if (uTempK < 350.0 && h > 0.35) {
    float snowLine = 0.35 + lat * 0.12; // lower snowline near poles
    float snowFade = clamp((h - snowLine) / 0.20, 0.0, 1.0);
    float snowPatch = noise2(warpedPos * 12.0 + seedOff + vec2(555.0, 666.0));
    snowFade *= smoothstep(0.25, 0.55, snowPatch); // patchy snow
    vec3 snowColor = mix(vec3(0.82, 0.87, 0.91), vec3(0.92, 0.94, 0.97), snowPatch);
    biomeColor = mix(biomeColor, snowColor, snowFade * 0.7);
  }

  // ---- Highland glaciers ----
  if (uTempK < 280.0 && h > 0.5) {
    float glacierFade = smoothstep(0.5, 0.7, h) * smoothstep(280.0, 200.0, uTempK);
    float glacierNoise = noise2(warpedPos * 6.0 + seedOff + vec2(999.0, 111.0));
    glacierFade *= smoothstep(0.3, 0.6, glacierNoise);
    vec3 glacierColor = vec3(0.75, 0.82, 0.90);
    biomeColor = mix(biomeColor, glacierColor, glacierFade * 0.5);
  }

  // ---- Lava flows (volcanic temperate planets) ----
  if (uVolc > 0.05) {
    float lavaNoise = fbm2(warpedPos * 6.0 + vec2(uTime * 0.08, uTime * 0.05) + seedOff * 5.0, 3);
    float lavaFactor = smoothstep(0.55, 0.65, lavaNoise) * (1.0 - smoothstep(0.70, 0.85, lavaNoise));
    lavaFactor *= uVolc;

    vec3 lavaColor = vec3(0.85, 0.30, 0.05);
    lavaColor = mix(lavaColor, vec3(0.95, 0.50, 0.10), uFeAbundance * 0.3);
    lavaColor = mix(lavaColor, vec3(0.90, 0.75, 0.15), uSAbundance * 0.4);
    lavaColor = mix(lavaColor, vec3(1.0, 0.60, 0.00), noise2(warpedPos * 15.0 + uTime * 0.3) * 0.3);
    biomeColor = mix(biomeColor, lavaColor, lavaFactor * 0.8);
    biomeColor += lavaColor * lavaFactor * 0.15;
  }

  // ---- Coastline detail ----
  float coastDist = (elevation - waterThresh) / max(1.0 - waterThresh, 0.01);
  if (coastDist < 0.04) {
    float sandFactor = smoothstep(0.04, 0.0, coastDist);
    vec3 sandColor = mix(soilColor, vec3(0.75, 0.70, 0.55), 0.5);
    biomeColor = mix(biomeColor, sandColor, sandFactor * 0.6);
  }

  // ---- Slope / Normal shading ----
  float eps = 0.008;
  float ex = fbm2((warpedPos + vec2(eps, 0.0)) * 3.0, 3);
  float ey = fbm2((warpedPos + vec2(0.0, eps)) * 3.0, 3);
  vec2 grad = vec2(elevation - ex, elevation - ey) / eps;
  // Light from upper-left
  float slopeShade = 0.80 + 0.20 * dot(normalize(vec2(-0.7, 0.5)), normalize(grad + vec2(0.001)));
  biomeColor *= slopeShade;

  // ---- Wind streaks ----
  if (uWind > 0.1) {
    float streak = noise2(vec2(worldPos.x * 3.0 + uTime * 0.03, worldPos.y * 8.0));
    float streakMask = smoothstep(0.55, 0.70, streak) * uWind * 0.06;
    biomeColor += vec3(streakMask);
  }

  // ---- Cloud shadows ----
  float cloudShadow = fbm2(worldPos * 1.5 + vec2(uTime * 0.02, uTime * 0.01), 3);
  biomeColor *= 0.88 + 0.12 * smoothstep(0.3, 0.6, cloudShadow);

  // ---- Detail noise ----
  float detail = noise2(warpedPos * 30.0) * 0.05 - 0.025;
  biomeColor += vec3(detail);

  // ---- Edge darkening (vignette) ----
  float edgeDist = length(vUv - 0.5);
  biomeColor *= 1.0 - edgeDist * 0.25;

  gl_FragColor = vec4(biomeColor, 1.0);
}
