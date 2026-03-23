// Rocky/dwarf planet surface shader — Production-quality procedural terrain
// Features: continents, ocean depth + caustics, biome ecotones, crater impacts,
//   desert dunes, erosion, volcanic calderas, glaciers, coral reefs,
//   enhanced aurora curtains, city networks

// --- Planet visuals uniforms ---
uniform float uSeed;
uniform vec3  uSurfaceBase;
uniform vec3  uSurfaceHigh;
uniform float uLandThreshold;
uniform float uHasOcean;
uniform vec3  uOceanShallow;
uniform vec3  uOceanDeep;
uniform float uWaterCoverage;
uniform float uIceCapFraction;
uniform float uHasBiomes;
uniform vec3  uBiomeTropical;
uniform vec3  uBiomeTemperate;
uniform vec3  uBiomeBoreal;
uniform vec3  uBiomeDesert;
uniform vec3  uBiomeTundra;
uniform float uHasLava;
uniform float uHasCityLights;
uniform vec3  uStarDir;
uniform vec3  uStarColor;
uniform float uStarIntensity;
uniform float uTime;
uniform float uAlbedo;
uniform float uSurfaceTempK;
uniform float uHasRivers;

// --- Resource/geology uniforms ---
uniform float uFeAbundance;
uniform float uSiAbundance;
uniform float uCAbundance;
uniform float uSAbundance;
uniform float uDensity;
uniform float uGravity;
uniform float uMagneticStrength;

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
    p *= 2.03;   // slightly irrational ratio avoids lattice aliasing
    a *= 0.48;
  }
  return v;
}

// Warped FBM — domain-distorted for more organic shapes
float warpedFbm(vec3 p, int octaves) {
  vec3 q = vec3(fbm(p, 3), fbm(p + vec3(5.2, 1.3, 3.7), 3), fbm(p + vec3(2.1, 8.4, 1.6), 3));
  return fbm(p + q * 0.6, octaves);
}

// Ridge noise: sharp mountain ridges
float ridgeNoise(vec3 p, int octaves) {
  float v = 0.0, a = 0.5;
  float prev = 1.0;  // weight by previous octave for erosion
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    float nr = noise3(p);
    nr = 1.0 - abs(nr * 2.0 - 1.0);
    nr = nr * nr;
    v += a * nr * prev;  // erosion: each octave weighted by previous
    prev = nr;
    p *= 2.2;
    a *= 0.5;
  }
  return v;
}

// River detection: noise valley lines
float riverChannel(vec3 p, int octaves) {
  float v = 0.0, amp = 0.6;
  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    v += amp * abs(noise3(p) * 2.0 - 1.0);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

// Voronoi (cellular) noise for craters, rock patterns
float voronoi(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;
  for (int x = -1; x <= 1; x++)
  for (int y = -1; y <= 1; y++)
  for (int z = -1; z <= 1; z++) {
    vec3 neighbor = vec3(float(x), float(y), float(z));
    vec3 cell = vec3(hash3(i + neighbor), hash3(i + neighbor + 31.0), hash3(i + neighbor + 57.0));
    vec3 diff = neighbor + cell - f;
    minDist = min(minDist, dot(diff, diff));
  }
  return sqrt(minDist);
}

float hashSeed(float s) {
  s = fract(s * 0.0001031);
  s *= s + 33.33;
  s *= s + s;
  return fract(s);
}

// =====================================================================
// Biome sampling — enhanced with ecotone blending + moisture variety
// =====================================================================

vec3 sampleBiome(float latitude, float elevation, float moisture, float microDetail) {
  float h = clamp(elevation, 0.0, 1.0);

  // Mountains: rocky exposed surface with snow
  if (h > 0.35) {
    float t = clamp((h - 0.35) / 0.3, 0.0, 1.0);
    vec3 baseCol = latitude < 0.25 ? uBiomeTropical : uBiomeTemperate;
    vec3 rockCol = mix(uSurfaceHigh, uSurfaceHigh * vec3(0.7, 0.75, 0.8), microDetail);
    return mix(baseCol, rockCol, t);
  }

  // Ecotone transitions: smooth blending between zones
  float tropT  = smoothstep(0.20, 0.30, latitude);  // tropical -> temperate
  float tempT  = smoothstep(0.48, 0.58, latitude);  // temperate -> boreal
  float borT   = smoothstep(0.70, 0.80, latitude);  // boreal -> tundra

  vec3 biome;

  // Tropical zone (0..0.25)
  if (latitude < 0.25) {
    if (moisture > 0.15) {
      // Dense jungle: mix in darker greens
      biome = mix(uBiomeTropical, uBiomeTropical * vec3(0.7, 0.9, 0.6), microDetail * 0.4);
    } else if (moisture > -0.1) {
      // Savanna: grassland with sparse trees
      biome = mix(uBiomeTropical, uBiomeDesert, 0.35 + microDetail * 0.15);
    } else {
      // Arid tropical
      biome = mix(uBiomeDesert, uBiomeTropical, 0.2);
    }
  }
  // Temperate zone
  else if (latitude < 0.55) {
    float zoneT = (latitude - 0.25) / 0.3;
    if (moisture > 0.1) {
      // Deciduous forest
      biome = mix(uBiomeTemperate, uBiomeBoreal, zoneT * 0.4 + microDetail * 0.1);
    } else if (moisture > -0.15) {
      // Steppe / grassland
      biome = mix(uBiomeTemperate, uBiomeDesert, 0.3 + microDetail * 0.15);
    } else {
      // Continental desert
      biome = mix(uBiomeDesert, uBiomeTemperate, 0.4);
    }
  }
  // Boreal
  else if (latitude < 0.78) {
    float zoneT = (latitude - 0.55) / 0.23;
    // Taiga with wetland pockets
    biome = mix(uBiomeBoreal, uBiomeTundra, zoneT + moisture * 0.1);
    biome = mix(biome, uBiomeBoreal * vec3(0.6, 0.75, 0.5), microDetail * 0.2 * (1.0 - zoneT));
  }
  // Polar tundra
  else {
    biome = mix(uBiomeTundra, uBiomeTundra * vec3(0.85, 0.88, 0.95), microDetail * 0.3);
  }

  // Smooth ecotone blending across zone boundaries
  vec3 tropBiome = moisture > 0.1 ? uBiomeTropical : mix(uBiomeDesert, uBiomeTropical, 0.3);
  vec3 tempBiome = moisture > 0.0 ? uBiomeTemperate : mix(uBiomeDesert, uBiomeTemperate, 0.5);
  vec3 borBiome  = uBiomeBoreal;
  vec3 tunBiome  = uBiomeTundra;

  // Apply smooth transitions
  biome = mix(biome, mix(tropBiome, tempBiome, tropT), tropT * (1.0 - tropT) * 1.5);

  return biome;
}

// =====================================================================
// Main
// =====================================================================

void main() {
  vec3 n = normalize(vPosition);
  vec3 seedOff = vec3(hashSeed(uSeed), hashSeed(uSeed + 1.0), hashSeed(uSeed + 2.0)) * 500.0;

  float roughness    = 1.0 + (uDensity - 5.5) * 0.1;
  float mountainScale = 1.0 / max(uGravity, 0.3);
  float noiseScale    = 1.8 * roughness;

  // === Elevation: warped FBM for continent-like shapes ===
  float elevation = warpedFbm(n * noiseScale + seedOff, 5) * mountainScale;

  // Ridge detail (erosion-weighted ridges)
  float ridgeDetail = ridgeNoise(n * noiseScale * 1.5 + seedOff + vec3(111.0), 5);
  float ridgeBlend  = smoothstep(0.2, 0.55, elevation);
  elevation = mix(elevation, elevation + ridgeDetail * 0.25, ridgeBlend);

  // Micro-detail + ultra-fine grain
  elevation += noise3(n * noiseScale * 8.0 + seedOff) * 0.035;
  elevation += noise3(n * noiseScale * 16.0 + seedOff + vec3(42.0)) * 0.012;

  // === Impact craters (barren / thin-atmosphere planets) ===
  float craterMask = 0.0;
  if (uHasBiomes < 0.5 && uHasOcean < 0.5) {
    float vor1 = voronoi(n * 4.0 + seedOff + vec3(200.0));
    float vor2 = voronoi(n * 10.0 + seedOff + vec3(300.0));
    // Large craters
    float crater1 = smoothstep(0.15, 0.08, vor1);
    float craterRim1 = smoothstep(0.08, 0.12, vor1) * smoothstep(0.18, 0.12, vor1) * 0.08;
    // Small craters
    float crater2 = smoothstep(0.10, 0.05, vor2) * 0.5;
    float craterRim2 = smoothstep(0.05, 0.08, vor2) * smoothstep(0.12, 0.08, vor2) * 0.04;
    craterMask = crater1 + crater2;
    elevation -= crater1 * 0.12 + crater2 * 0.04;
    elevation += craterRim1 + craterRim2;
  }

  float moisture = fbm(n * 2.5 + seedOff + vec3(333.0), 4);
  float microDetail = noise3(n * 20.0 + seedOff + vec3(777.0));
  float latitude = abs(n.y);

  // Resource-based soil tint
  vec3 surfBase = uSurfaceBase;
  float mineralFade = smoothstep(260.0, 350.0, uSurfaceTempK);
  surfBase = mix(surfBase, vec3(0.55, 0.25, 0.15), uFeAbundance * 0.3 * mineralFade);
  surfBase = mix(surfBase, vec3(0.75, 0.70, 0.55), uSiAbundance * 0.2 * mineralFade);
  surfBase = mix(surfBase, vec3(0.15, 0.12, 0.10), uCAbundance * 0.25 * mineralFade);
  surfBase = mix(surfBase, vec3(0.70, 0.65, 0.20), uSAbundance * 0.2 * mineralFade);

  // --- Day/night ---
  float daylight = dot(n, uStarDir);
  float dayFactor = smoothstep(-0.15, 0.3, daylight);

  vec3 sunsetTint = vec3(0.55, 0.25, 0.12);
  float sunsetBand = smoothstep(-0.1, 0.0, daylight) * smoothstep(0.15, 0.05, daylight);

  // --- Ice caps (enhanced with glacier flow) ---
  float iceLatThreshold = uIceCapFraction > 0.0
    ? asin(1.0 - uIceCapFraction) / (3.14159 / 2.0)
    : 1.0;
  float iceEdgeNoise = fbm(n * 5.0 + seedOff, 3) * 0.10;
  float effectiveIceLat = iceLatThreshold + iceEdgeNoise;
  float iceBlend = clamp((latitude - effectiveIceLat) / 0.08, 0.0, 1.0);

  vec3 color;
  float isOcean = 0.0;

  if (iceBlend > 0.0) {
    // === Enhanced ice caps with glacier texture ===
    float iceDetail = fbm(n * 8.0 + seedOff, 4);
    float iceCoarse = fbm(n * 3.0 + seedOff, 2);
    float glacierFlow = noise3(n * vec3(3.0, 12.0, 3.0) + seedOff + vec3(500.0)); // elongated flow

    vec3 iceColor;
    if (iceDetail > 0.15) {
      iceColor = vec3(0.94, 0.96, 1.0);
    } else if (iceDetail > -0.05) {
      iceColor = mix(vec3(0.85, 0.89, 0.96), vec3(0.78, 0.85, 0.93), clamp(iceCoarse + 0.5, 0.0, 1.0));
    } else if (iceDetail > -0.2) {
      // Glacier blue: compressed ice reveals deep blue
      iceColor = mix(vec3(0.55, 0.70, 0.85), vec3(0.60, 0.67, 0.73), clamp(iceCoarse + 0.5, 0.0, 1.0));
    } else {
      iceColor = mix(vec3(0.40, 0.55, 0.65), vec3(0.47, 0.53, 0.60), clamp(iceDetail + 0.5, 0.0, 1.0));
    }
    // Glacier flow streaks
    float flowStreak = smoothstep(0.45, 0.55, glacierFlow);
    iceColor = mix(iceColor, vec3(0.75, 0.85, 0.95), flowStreak * 0.2);

    // Crevasse cracks in ice
    float crevasse = 1.0 - smoothstep(0.0, 0.03, abs(noise3(n * 25.0 + seedOff) - 0.5));
    iceColor = mix(iceColor, vec3(0.35, 0.45, 0.60), crevasse * 0.4);

    if (elevation > 0.3) {
      vec3 snowyMtn = mix(vec3(0.50, 0.56, 0.63), vec3(0.82, 0.85, 0.89), clamp((elevation - 0.3) / 0.3, 0.0, 1.0));
      iceColor = mix(iceColor, snowyMtn, 0.6);
    }

    vec3 baseBelow;
    if (uHasOcean > 0.5 && elevation < uLandThreshold) {
      baseBelow = mix(uOceanDeep, vec3(0.29, 0.42, 0.54), 0.3);
    } else {
      baseBelow = mix(surfBase, uBiomeTundra, 0.5);
    }
    color = mix(baseBelow, iceColor, iceBlend);

  } else if (uHasLava > 0.5) {
    // === Enhanced lava: calderas + cooling crust ===
    float lavaNoise = warpedFbm(n * 5.0 + seedOff, 4);
    float lavaFine  = noise3(n * 20.0 + seedOff + vec3(222.0));
    if (lavaNoise > 0.2) {
      float lavaIntensity = clamp((lavaNoise - 0.2) / 0.5, 0.0, 1.0);
      // Cooling crust: dark solidified patches over bright lava
      float crust = smoothstep(0.55, 0.65, lavaFine);
      vec3 hotLava = mix(vec3(0.45, 0.07, 0.0), vec3(1.0, 0.35, 0.0), lavaIntensity);
      vec3 cooledCrust = vec3(0.12, 0.08, 0.06);
      color = mix(hotLava, cooledCrust, crust * (1.0 - lavaIntensity * 0.5));
      // Caldera: ring-like depression at very high lava
      if (lavaIntensity > 0.7) {
        float caldera = smoothstep(0.7, 0.8, lavaIntensity) * smoothstep(0.95, 0.85, lavaIntensity);
        color = mix(color, vec3(1.0, 0.6, 0.1), caldera * 0.6);
      }
      dayFactor = max(dayFactor, lavaIntensity * 0.6);
    } else {
      float t = clamp(elevation / 0.8, 0.0, 1.0);
      // Volcanic basalt with fine grain
      vec3 basalt = mix(surfBase, uSurfaceHigh, t);
      basalt = mix(basalt, basalt * vec3(0.8, 0.75, 0.7), lavaFine * 0.2);
      color = basalt;
    }

  } else if (uHasOcean > 0.5 && elevation < uLandThreshold) {
    // === Enhanced ocean: depth, shelf, caustics, reef ===
    float depth = clamp((uLandThreshold - elevation) / 0.6, 0.0, 1.0);
    bool isCoastal = elevation > uLandThreshold - 0.08;

    vec3 oceanColor;
    if (isCoastal) {
      // Continental shelf: turquoise shallow water
      oceanColor = mix(uOceanShallow, uOceanDeep, depth * 0.25);
      // Coral reef near tropical coasts
      if (latitude < 0.3 && uHasBiomes > 0.5) {
        float reef = smoothstep(0.4, 0.6, noise3(n * 15.0 + seedOff + vec3(600.0)));
        oceanColor = mix(oceanColor, vec3(0.2, 0.55, 0.5), reef * 0.3);
      }
    } else if (depth < 0.3) {
      // Mid-depth: continental slope
      oceanColor = mix(uOceanShallow, uOceanDeep, depth * 1.2);
    } else {
      // Deep ocean: abyss
      vec3 abyssColor = uOceanDeep * vec3(0.7, 0.75, 0.9);
      oceanColor = mix(uOceanDeep, abyssColor, (depth - 0.3) / 0.7);
    }

    // Animated caustics on shallow water (day side only)
    if (isCoastal && dayFactor > 0.1) {
      float caustic1 = voronoi(n * 30.0 + vec3(uTime * 0.02, 0.0, uTime * 0.015));
      float caustic2 = voronoi(n * 30.0 + vec3(-uTime * 0.015, uTime * 0.01, 0.0));
      float causticPattern = smoothstep(0.1, 0.0, abs(caustic1 - caustic2));
      oceanColor += vec3(0.15, 0.20, 0.10) * causticPattern * dayFactor * 0.5;
    }

    // Ocean current streaks
    float current = noise3(n * vec3(2.0, 8.0, 2.0) + seedOff + vec3(uTime * 0.003));
    float currentStreak = smoothstep(0.47, 0.53, current);
    oceanColor = mix(oceanColor, oceanColor * 1.08, currentStreak * 0.15 * (1.0 - depth));

    color = oceanColor;
    isOcean = 1.0;

  } else {
    // === Enhanced land surface ===
    float h = uHasOcean > 0.5 ? elevation - uLandThreshold : elevation + 0.5;

    if (uHasBiomes > 0.5) {
      color = sampleBiome(latitude, h, moisture, microDetail);
    } else {
      float t = clamp(h / 0.8, 0.0, 1.0);
      // Barren planet: rock grain texture
      vec3 rockGrain = mix(surfBase, uSurfaceHigh, t);
      // Add Voronoi rock pattern
      float rockPat = voronoi(n * 8.0 + seedOff + vec3(150.0));
      rockGrain = mix(rockGrain, rockGrain * 0.8, smoothstep(0.2, 0.0, rockPat) * 0.3);
      color = rockGrain;
    }

    // Crater coloring on barren planets
    if (craterMask > 0.0 && uHasBiomes < 0.5) {
      vec3 craterFloor = surfBase * vec3(0.7, 0.65, 0.6);
      color = mix(color, craterFloor, craterMask * 0.5);
    }

    // Rivers
    if (uHasRivers > 0.5 && h < 0.4 && h >= 0.0) {
      float river1 = riverChannel(n * 4.0 + seedOff + vec3(888.0), 3);
      float river2 = riverChannel(n * 9.0 + seedOff + vec3(999.0), 2);
      float riverW1 = 0.06 + max(0.0, 1.0 - h * 4.0) * 0.04;
      float riverW2 = 0.035;
      float mask1 = 1.0 - smoothstep(0.0, riverW1, river1);
      float mask2 = 1.0 - smoothstep(0.0, riverW2, river2);
      float riverMask = max(mask1, mask2 * 0.5);
      riverMask *= smoothstep(0.4, 0.08, h);
      // Oxbow lakes (wider near river bends)
      float bend = noise3(n * 6.0 + seedOff + vec3(444.0));
      riverMask *= 1.0 + smoothstep(0.4, 0.6, bend) * 0.3;
      if (h < 0.04) {
        float delta = riverChannel(n * 14.0 + seedOff + vec3(777.0), 2);
        float deltaMask = 1.0 - smoothstep(0.0, 0.1, delta);
        riverMask = max(riverMask, deltaMask * 0.4);
      }
      vec3 riverColor = mix(uOceanShallow, vec3(0.2, 0.38, 0.52), 0.3);
      color = mix(color, riverColor, riverMask * 0.85);
    }

    // Desert sand dunes (low moisture, low elevation, warm planet)
    if (uHasBiomes > 0.5 && moisture < -0.1 && h < 0.2 && uSurfaceTempK > 280.0) {
      float dunePattern = noise3(n * vec3(8.0, 2.0, 8.0) + seedOff + vec3(555.0));
      float dune = smoothstep(0.35, 0.65, dunePattern);
      vec3 duneBright = uBiomeDesert * 1.15;
      vec3 duneShadow = uBiomeDesert * 0.75;
      color = mix(color, mix(duneShadow, duneBright, dune), smoothstep(-0.1, -0.25, moisture) * 0.5);
    }

    // Snow on mountains
    if (h > 0.35) {
      float snowLine = 0.35 + latitude * 0.12;
      float snowFade = clamp((h - snowLine) / 0.2, 0.0, 1.0);
      float snowPatch = noise3(n * 12.0 + seedOff + vec3(555.0));
      snowFade *= smoothstep(0.25, 0.55, snowPatch);
      // Wind-blown snow streaks
      float windSnow = noise3(n * vec3(4.0, 20.0, 4.0) + seedOff + vec3(666.0));
      snowFade *= 0.7 + smoothstep(0.4, 0.6, windSnow) * 0.3;
      vec3 snowColor = mix(vec3(0.82, 0.87, 0.91), vec3(0.95, 0.96, 0.98), snowPatch);
      color = mix(color, snowColor, snowFade * 0.7);
    }
  }

  // === Slope shading: enhanced with AO-like crevice darkening ===
  if (isOcean < 0.5 && iceBlend < 0.5) {
    float eps = 0.005;
    float ex = fbm((n + vec3(eps, 0.0, 0.0)) * noiseScale + seedOff, 3) * mountainScale;
    float ez = fbm((n + vec3(0.0, 0.0, eps)) * noiseScale + seedOff, 3) * mountainScale;
    vec3 slopeNorm = normalize(vec3(elevation - ex, eps * 4.0, elevation - ez));
    float slopeDot = dot(slopeNorm, uStarDir);
    float slopeShadow = smoothstep(-0.2, 0.3, slopeDot);
    color *= 0.72 + 0.28 * slopeShadow;

    // Crevice AO: darken concavities
    float curvature = (ex + ez) * 0.5 - elevation * 0.5;
    color *= 1.0 - clamp(-curvature * 3.0, 0.0, 0.15);
  }

  // --- Lighting ---
  float rimDot = max(dot(vNormal, vViewDir), 0.0);
  float limbDarken = smoothstep(0.0, 0.5, rimDot);

  vec3 ambientNight = vec3(0.03) + uStarColor * 0.02;
  vec3 lit = color * mix(ambientNight, uStarColor * uStarIntensity, dayFactor);

  // Sunset band
  lit = mix(lit, lit * sunsetTint * 3.0, sunsetBand * 0.3);

  // Limb darkening
  lit *= 0.65 + limbDarken * 0.35;

  // Albedo
  lit *= 0.6 + uAlbedo * 0.8;

  // === Ocean specular: enhanced with wave normal perturbation ===
  if (isOcean > 0.5 && dayFactor > 0.1) {
    // Perturb normal with wave noise for realistic glint
    float waveNx = noise3(n * 40.0 + vec3(uTime * 0.04, 0.0, 0.0)) - 0.5;
    float waveNz = noise3(n * 40.0 + vec3(0.0, 0.0, uTime * 0.03)) - 0.5;
    vec3 waveNormal = normalize(n + vec3(waveNx, 0.0, waveNz) * 0.04);

    vec3 halfDir = normalize(uStarDir + vViewDir);
    float specDot = max(dot(waveNormal, halfDir), 0.0);
    float specular = pow(specDot, 80.0) * 1.8;
    float broadSpec = pow(specDot, 8.0) * 0.3;
    float fresnelOcean = pow(1.0 - max(dot(n, vViewDir), 0.0), 3.0) * 0.15;
    lit += uStarColor * (specular + broadSpec + fresnelOcean) * dayFactor * uStarIntensity;
  }

  // === City lights (enhanced: highway networks + sprawl) ===
  if (uHasCityLights > 0.5 && dayFactor < 0.3) {
    float cityNoise  = fbm(n * 6.0 + seedOff + vec3(1234.0), 3);
    float cityFine   = noise3(n * 30.0 + seedOff + vec3(1234.0));
    float coastBonus = (uHasOcean > 0.5 && elevation < uLandThreshold + 0.15 && elevation >= uLandThreshold) ? 0.15 : 0.0;
    float tropicBonus = latitude < 0.4 ? 0.08 : 0.0;

    if (cityNoise + coastBonus + tropicBonus > 0.25 && latitude < 0.85) {
      if (uHasOcean < 0.5 || elevation >= uLandThreshold) {
        float cityIntensity = clamp((cityNoise - 0.15) * 2.0, 0.3, 1.0);
        // Highway/road network: thin bright lines
        float road = 1.0 - smoothstep(0.0, 0.03, abs(cityFine - 0.5));
        cityIntensity = max(cityIntensity, road * 0.6);

        vec3 lightColor = mix(vec3(1.0, 0.80, 0.33), vec3(1.0, 0.93, 0.67), cityIntensity);
        // Bluish LED lights in some areas
        lightColor = mix(lightColor, vec3(0.8, 0.9, 1.0), smoothstep(0.6, 0.8, cityFine) * 0.3);
        float nightMask = 1.0 - smoothstep(0.0, 0.3, dayFactor);
        float flicker = 0.85 + 0.15 * sin(uTime * 2.0 + cityNoise * 50.0);
        lit += lightColor * cityIntensity * 0.25 * nightMask * flicker;
        // Light pollution
        float glowNoise = fbm(n * 3.0 + seedOff + vec3(1234.0), 2);
        float glowMask = smoothstep(0.15, 0.30, glowNoise);
        lit += lightColor * glowMask * 0.04 * nightMask;
      }
    }
  }

  // === Aurora: enhanced with curtain structure ===
  if (uMagneticStrength > 0.1) {
    float auroraLat = smoothstep(0.55, 0.80, latitude);
    // Multi-frequency curtain pattern
    float curtain1 = fbm(n * vec3(2.0, 1.0, 2.0) + vec3(uTime * 0.025, 0.0, uTime * 0.018), 3);
    float curtain2 = noise3(n * vec3(6.0, 2.0, 6.0) + vec3(uTime * 0.04, 0.0, uTime * 0.03));
    float auroraIntensity = auroraLat * smoothstep(0.3, 0.6, curtain1) * uMagneticStrength * 0.5;
    // Fine curtain folds
    auroraIntensity *= 0.7 + 0.3 * smoothstep(0.4, 0.6, curtain2);
    float nightAurora = 1.0 - smoothstep(-0.1, 0.2, daylight);
    // Multi-color aurora: green + purple + blue
    vec3 auroraGreen  = vec3(0.2, 1.0, 0.4);
    vec3 auroraPurple = vec3(0.5, 0.2, 0.8);
    vec3 auroraBlue   = vec3(0.3, 0.5, 1.0);
    float colorMix = curtain1 + curtain2 * 0.3;
    vec3 auroraColor = mix(auroraGreen, auroraPurple, smoothstep(0.4, 0.7, colorMix));
    auroraColor = mix(auroraColor, auroraBlue, smoothstep(0.65, 0.85, colorMix));
    lit += auroraColor * auroraIntensity * nightAurora;
  }

  gl_FragColor = vec4(lit, 1.0);
}
