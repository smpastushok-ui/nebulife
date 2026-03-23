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

// Warped FBM — double domain distortion for complex organic continent shapes
float warpedFbm(vec3 p, int octaves) {
  vec3 q = vec3(fbm(p, 3), fbm(p + vec3(5.2, 1.3, 3.7), 3), fbm(p + vec3(2.1, 8.4, 1.6), 3));
  vec3 r = vec3(fbm(p + q * 0.8 + vec3(1.7, 9.2, 0.3), 3),
                fbm(p + q * 0.8 + vec3(8.3, 2.8, 4.1), 3),
                fbm(p + q * 0.8 + vec3(3.9, 5.1, 7.6), 3));
  return fbm(p + r * 0.5, octaves);
}

// Ridge noise: sharp mountain ridges with erosion weighting
float ridgeNoise(vec3 p, int octaves) {
  float v = 0.0, a = 0.5;
  float prev = 1.0;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    float nr = noise3(p);
    nr = 1.0 - abs(nr * 2.0 - 1.0);
    nr = nr * nr;
    v += a * nr * prev;
    prev = clamp(nr * 1.2, 0.0, 1.0);  // stronger erosion feedback
    p *= 2.15;
    a *= 0.48;
  }
  return v;
}

// Turbulent noise: creates chaotic detail for mountain surfaces
float turbulence(vec3 p, int octaves) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    v += a * abs(noise3(p) * 2.0 - 1.0);
    p *= 2.1;
    a *= 0.45;
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

  // Mountains: gradual transition to exposed rock
  if (h > 0.35) {
    float t = smoothstep(0.35, 0.65, h);
    vec3 baseCol = latitude < 0.3 ? uBiomeTropical : uBiomeTemperate;
    vec3 rockCol = mix(uSurfaceHigh, uSurfaceHigh * vec3(0.75, 0.78, 0.82), microDetail * 0.5);
    return mix(baseCol, rockCol, t);
  }

  // Continuous moisture gradient: wet ↔ dry (no hard if/else)
  float wetness = smoothstep(-0.3, 0.25, moisture); // 0 = bone dry, 1 = very wet
  float dryness = 1.0 - wetness;

  // Multi-frequency noise for rich micro-variation
  float var1 = noise3(vec3(latitude * 45.0, moisture * 35.0, microDetail * 22.0));
  float var2 = noise3(vec3(latitude * 75.0, moisture * 55.0, microDetail * 38.0));
  float var3 = noise3(vec3(latitude * 30.0, moisture * 20.0, microDetail * 15.0));
  float var4 = noise3(vec3(latitude * 100.0, moisture * 80.0, microDetail * 50.0)); // ultra-fine
  float var5 = noise3(vec3(latitude * 55.0, moisture * 42.0, microDetail * 32.0)); // medium patches

  // === Build 4 latitude bands with MANY color sub-variants ===

  // Tropical: jungle / savanna / scrubland / yellow grass / bare earth
  vec3 jungleDark   = uBiomeTropical * vec3(0.45, 0.80, 0.35);  // dense canopy shadow
  vec3 jungleBright = uBiomeTropical * vec3(0.70, 1.05, 0.50);  // sunlit canopy
  vec3 savannaGreen = mix(uBiomeTropical, uBiomeDesert, 0.3) * vec3(0.90, 0.95, 0.60); // yellow-green grass
  vec3 savannaGold  = uBiomeDesert * vec3(0.95, 0.90, 0.55);   // golden dry grass
  vec3 tropSand     = uBiomeDesert * vec3(1.0, 0.88, 0.70);    // sandy ground
  vec3 tropBareEarth= uBiomeDesert * vec3(0.80, 0.68, 0.50);   // exposed reddish earth

  vec3 tropWet = mix(jungleDark, jungleBright, var1);
  tropWet = mix(tropWet, jungleDark * vec3(0.8, 0.95, 0.75), smoothstep(0.6, 0.8, var4) * 0.3); // moss patches
  vec3 tropMid = mix(savannaGreen, savannaGold, var2 * 0.6 + var5 * 0.3);
  tropMid = mix(tropMid, tropBareEarth, smoothstep(0.65, 0.80, var4) * 0.25); // bare soil patches
  vec3 tropDry = mix(tropSand, tropBareEarth, var2 * 0.4);
  tropDry = mix(tropDry, savannaGold, smoothstep(0.3, 0.5, var5) * 0.2); // golden tufts in desert

  vec3 tropical = mix(tropDry, tropMid, smoothstep(0.0, 0.4, wetness));
  tropical = mix(tropical, tropWet, smoothstep(0.4, 0.85, wetness));

  // Temperate: forest / meadow / golden steppe / plowed fields / brown earth
  vec3 forestDark   = uBiomeTemperate * vec3(0.55, 0.85, 0.45);  // conifer/deciduous dark
  vec3 forestBright = uBiomeTemperate * vec3(0.78, 0.98, 0.58);  // birch/light deciduous
  vec3 meadowGreen  = uBiomeTemperate * vec3(0.88, 1.05, 0.65);  // meadow/pasture
  vec3 steppeGold   = mix(uBiomeTemperate, uBiomeDesert, 0.5) * vec3(1.0, 0.95, 0.65); // golden steppe
  vec3 brownField   = uBiomeDesert * vec3(0.85, 0.75, 0.58);    // plowed/bare field
  vec3 dryEarth     = uBiomeDesert * vec3(0.90, 0.78, 0.55);    // dry continental soil

  vec3 tempWet = mix(forestDark, forestBright, var1);
  tempWet = mix(tempWet, meadowGreen, smoothstep(0.55, 0.75, var5) * 0.35); // meadow clearings
  vec3 tempMid = mix(steppeGold, meadowGreen, var2 * 0.5);
  tempMid = mix(tempMid, brownField, smoothstep(0.6, 0.8, var4) * 0.3); // brown patches
  vec3 tempDry = mix(dryEarth, brownField, var2 * 0.5);
  tempDry = mix(tempDry, steppeGold, smoothstep(0.3, 0.5, var5) * 0.25); // golden dry grass

  vec3 temperate = mix(tempDry, tempMid, smoothstep(0.0, 0.4, wetness));
  temperate = mix(temperate, tempWet, smoothstep(0.35, 0.80, wetness));

  // Boreal: dark taiga / mossy bog / yellow lichen / brown peat
  vec3 taigaDark  = uBiomeBoreal * vec3(0.55, 0.78, 0.42);  // dark spruce
  vec3 taigaLight = uBiomeBoreal * vec3(0.72, 0.92, 0.55);  // lighter pine
  vec3 bogGreen   = uBiomeBoreal * vec3(0.50, 0.72, 0.50);  // bog/marsh
  vec3 lichenYellow = uBiomeBoreal * vec3(0.85, 0.85, 0.50); // lichen/moss
  vec3 borWet = mix(taigaDark, taigaLight, var1 * 0.6);
  borWet = mix(borWet, bogGreen, smoothstep(0.5, 0.7, var5) * 0.25);
  vec3 borDry = mix(uBiomeTundra * vec3(0.82, 0.78, 0.65), lichenYellow, var2 * 0.3);
  vec3 boreal = mix(borDry, borWet, wetness);

  // Tundra: rocky gray / brown patches / lichen spots
  vec3 tundraGray  = uBiomeTundra * vec3(0.75, 0.73, 0.70);
  vec3 tundraBrown = uBiomeTundra * vec3(0.88, 0.80, 0.68);
  vec3 tundraLichen= uBiomeTundra * vec3(0.78, 0.82, 0.62); // greenish lichen
  vec3 tundra = mix(tundraGray, tundraBrown, var3 * 0.5);
  tundra = mix(tundra, tundraLichen, smoothstep(0.55, 0.75, var4) * 0.2);

  // === Smooth latitude blending — wide overlapping transitions ===
  float tropW = 1.0 - smoothstep(0.15, 0.40, latitude);         // tropical fades 0.15-0.40
  float tempW = smoothstep(0.12, 0.35, latitude)                 // temperate rises
              * (1.0 - smoothstep(0.45, 0.68, latitude));        // and fades
  float borW  = smoothstep(0.40, 0.65, latitude)                 // boreal rises
              * (1.0 - smoothstep(0.68, 0.88, latitude));        // and fades
  float tunW  = smoothstep(0.70, 0.90, latitude);                // tundra rises

  // Normalize weights (they overlap, so sum > 1 in transition zones)
  float totalW = tropW + tempW + borW + tunW + 0.001;
  vec3 biome = (tropical * tropW + temperate * tempW + boreal * borW + tundra * tunW) / totalW;

  // Extra micro-detail: subtle noise variation on top
  biome *= 0.94 + var2 * 0.08 + microDetail * 0.04;

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

  // === Elevation: double-warped FBM for continent-scale landmasses ===
  float elevation = warpedFbm(n * noiseScale + seedOff, 7) * mountainScale;

  // === Tectonic plate boundaries: line-like structures where ridges form ===
  // Use absolute-value noise to create sharp valley lines = plate edges
  float tect1 = abs(fbm(n * noiseScale * 0.8 + seedOff + vec3(50.0), 4) * 2.0 - 1.0);
  float tect2 = abs(fbm(n * noiseScale * 1.2 + seedOff + vec3(80.0), 3) * 2.0 - 1.0);
  // Invert: narrow LOW values = plate boundaries where mountains rise
  float plateBoundary = 1.0 - smoothstep(0.0, 0.18, min(tect1, tect2));

  // === Mountain ridges along plate boundaries ===
  float ridgeDetail = ridgeNoise(n * noiseScale * 1.6 + seedOff + vec3(111.0), 7);
  float ridgeDetail2 = ridgeNoise(n * noiseScale * 2.8 + seedOff + vec3(222.0), 5);
  // Ridges are STRONGEST at plate boundaries (linear chains)
  float ridgeStrength = 0.15 + plateBoundary * 0.55;
  elevation += (ridgeDetail - 0.22) * ridgeStrength;
  // Secondary ridges: smaller, everywhere on land
  float landMask = smoothstep(0.10, 0.35, elevation);
  elevation += (ridgeDetail2 - 0.20) * 0.12 * landMask;

  // === Turbulent detail: rough mountain surfaces ===
  float turb = turbulence(n * noiseScale * 3.0 + seedOff + vec3(50.0), 5);
  elevation += (turb - 0.30) * 0.035 * smoothstep(0.2, 0.5, elevation);

  // === Multi-scale micro-detail (centered around 0.5) ===
  elevation += (noise3(n * noiseScale * 8.0 + seedOff) - 0.5) * 0.04;
  elevation += (noise3(n * noiseScale * 16.0 + seedOff + vec3(42.0)) - 0.5) * 0.02;
  elevation += (noise3(n * noiseScale * 32.0 + seedOff + vec3(84.0)) - 0.5) * 0.01;
  elevation += (noise3(n * noiseScale * 64.0 + seedOff + vec3(126.0)) - 0.5) * 0.004;

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

  // --- Ice caps: chaotic irregular edges (not circular) ---
  float iceLatThreshold = uIceCapFraction > 0.0
    ? asin(1.0 - uIceCapFraction) / (3.14159 / 2.0)
    : 1.0;
  // Multi-frequency edge distortion — CENTERED (subtract 0.5 so noise pushes both ways)
  float iceEdgeLarge = (fbm(n * 2.5 + seedOff + vec3(700.0), 4) - 0.47) * 0.35;  // big lobes ±0.18
  float iceEdgeMed   = (fbm(n * 6.0 + seedOff + vec3(750.0), 3) - 0.47) * 0.16;  // peninsulas ±0.08
  float iceEdgeFine  = (noise3(n * 12.0 + seedOff + vec3(780.0)) - 0.5) * 0.08;   // ragged ±0.04
  // Elevation: ice reaches into lowland valleys, retreats from mountain ridges
  float iceElevEffect = (elevation - 0.45) * 0.12;
  float effectiveIceLat = iceLatThreshold + iceEdgeLarge + iceEdgeMed + iceEdgeFine - iceElevEffect;
  float iceBlend = clamp((latitude - effectiveIceLat) / 0.05, 0.0, 1.0);

  vec3 color;
  float isOcean = 0.0;

  if (iceBlend > 0.0) {
    // === Ice caps: bright white/blue-white glacier ===
    float iceDetail = fbm(n * 8.0 + seedOff, 4);
    float iceCoarse = fbm(n * 3.0 + seedOff, 2);
    float glacierFlow = noise3(n * vec3(3.0, 12.0, 3.0) + seedOff + vec3(500.0));

    // Ice is predominantly WHITE with blue-tinted shadows
    vec3 iceColor;
    if (iceDetail > 0.15) {
      iceColor = vec3(0.95, 0.97, 1.0);        // bright fresh snow
    } else if (iceDetail > -0.05) {
      iceColor = mix(vec3(0.88, 0.92, 0.98), vec3(0.82, 0.88, 0.96), clamp(iceCoarse + 0.5, 0.0, 1.0));
    } else if (iceDetail > -0.2) {
      // Glacier blue: compressed ice
      iceColor = mix(vec3(0.70, 0.80, 0.92), vec3(0.65, 0.75, 0.88), clamp(iceCoarse + 0.5, 0.0, 1.0));
    } else {
      // Deep crevasse: blue-gray
      iceColor = mix(vec3(0.55, 0.65, 0.78), vec3(0.50, 0.60, 0.72), clamp(iceDetail + 0.5, 0.0, 1.0));
    }

    // Glacier flow streaks (lighter)
    float flowStreak = smoothstep(0.45, 0.55, glacierFlow);
    iceColor = mix(iceColor, vec3(0.90, 0.94, 0.98), flowStreak * 0.2);

    // Crevasse cracks
    float crevasse = 1.0 - smoothstep(0.0, 0.03, abs(noise3(n * 25.0 + seedOff) - 0.5));
    iceColor = mix(iceColor, vec3(0.45, 0.55, 0.70), crevasse * 0.35);

    // Mountains in ice: snow-covered (white, not brown)
    if (elevation > 0.3) {
      vec3 snowyMtn = mix(vec3(0.80, 0.84, 0.90), vec3(0.92, 0.94, 0.97), clamp((elevation - 0.3) / 0.3, 0.0, 1.0));
      iceColor = mix(iceColor, snowyMtn, 0.5);
    }

    // Base below ice: use neutral gray-blue, NOT warm tundra/surfBase
    vec3 baseBelow;
    if (uHasOcean > 0.5 && elevation < uLandThreshold) {
      baseBelow = mix(uOceanDeep, vec3(0.35, 0.50, 0.65), 0.3);
    } else {
      // Cold rocky ground under ice — neutral gray, not brown
      baseBelow = vec3(0.50, 0.55, 0.60);
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
    // === OCEAN: chaotic depth with ridges, trenches, shelves ===
    float baseDepth = clamp((uLandThreshold - elevation) / 0.5, 0.0, 1.0);

    // Oceanic ridge/trench noise: creates varied sea-floor topography
    float seaFloor1 = (fbm(n * 3.5 + seedOff + vec3(1800.0), 4) - 0.47) * 0.25;
    float seaFloor2 = (noise3(n * 8.0 + seedOff + vec3(1900.0)) - 0.5) * 0.15;
    float seaFloor3 = (noise3(n * 16.0 + seedOff + vec3(1950.0)) - 0.5) * 0.08;
    // Deep ocean trenches along plate boundaries
    float oceanTrench = smoothstep(0.12, 0.0, min(
      abs(fbm(n * noiseScale * 0.8 + seedOff + vec3(50.0), 3) * 2.0 - 1.0),
      abs(fbm(n * noiseScale * 1.2 + seedOff + vec3(80.0), 3) * 2.0 - 1.0)
    )) * 0.2;
    float depth = clamp(baseDepth + seaFloor1 + seaFloor2 + seaFloor3 + oceanTrench, 0.0, 1.0);

    bool isCoastal = elevation > uLandThreshold - 0.03;

    vec3 oceanColor;
    if (isCoastal) {
      // Continental shelf: turquoise shallow
      oceanColor = mix(uOceanShallow, uOceanDeep, depth * 0.3);
      if (latitude < 0.3 && uHasBiomes > 0.5) {
        float reef = smoothstep(0.4, 0.6, noise3(n * 15.0 + seedOff + vec3(600.0)));
        oceanColor = mix(oceanColor, vec3(0.12, 0.45, 0.42), reef * 0.3);
      }
    } else if (depth < 0.25) {
      // Shallow: bright blue
      oceanColor = mix(uOceanShallow, uOceanDeep, depth * 1.2);
    } else if (depth < 0.50) {
      // Mid ocean: medium blue
      float midT = (depth - 0.25) / 0.25;
      oceanColor = mix(uOceanDeep, uOceanDeep * vec3(0.70, 0.78, 1.05), midT);
    } else if (depth < 0.75) {
      // Deep ocean: dark blue
      float deepT = (depth - 0.50) / 0.25;
      vec3 deepBlue = uOceanDeep * vec3(0.45, 0.55, 0.95);
      oceanColor = mix(uOceanDeep * vec3(0.70, 0.78, 1.05), deepBlue, deepT);
    } else {
      // Abyss: very dark near-black blue (trenches)
      float abyssT = (depth - 0.75) / 0.25;
      vec3 abyssColor = uOceanDeep * vec3(0.25, 0.35, 0.75);
      oceanColor = mix(uOceanDeep * vec3(0.45, 0.55, 0.95), abyssColor, abyssT);
    }

    // Animated caustics on shallow water (day side only)
    if (isCoastal && dayFactor > 0.1) {
      float caustic1 = voronoi(n * 30.0 + vec3(uTime * 0.02, 0.0, uTime * 0.015));
      float caustic2 = voronoi(n * 30.0 + vec3(-uTime * 0.015, uTime * 0.01, 0.0));
      float causticPattern = smoothstep(0.1, 0.0, abs(caustic1 - caustic2));
      oceanColor += vec3(0.10, 0.15, 0.08) * causticPattern * dayFactor * 0.4;
    }

    // === Ocean chaos: currents, gyres, upwelling, temperature patches ===

    // 1. Major ocean gyres — large circular current systems
    float gyre1 = fbm(n * vec3(1.2, 5.0, 1.2) + seedOff + vec3(uTime * 0.002), 3);
    float gyre2 = fbm(n * vec3(2.0, 8.0, 2.0) + seedOff + vec3(uTime * 0.003, 50.0, 0.0), 3);
    // Warm current streaks: lighter, slightly green-tinted
    float warmCurrent = smoothstep(0.45, 0.58, gyre1) * (1.0 - depth * 0.5);
    oceanColor = mix(oceanColor, oceanColor * vec3(1.12, 1.15, 0.90), warmCurrent * 0.30);
    // Cold current streaks: darker, deeper blue
    float coldCurrent = smoothstep(0.45, 0.58, gyre2) * (0.3 + depth * 0.7);
    oceanColor = mix(oceanColor, oceanColor * vec3(0.82, 0.85, 1.12), coldCurrent * 0.28);

    // 2. Upwelling zones — nutrient-rich darker patches (phytoplankton)
    float upwell = fbm(n * 4.0 + seedOff + vec3(2500.0), 3);
    float upwellMask = smoothstep(0.52, 0.62, upwell) * smoothstep(0.5, 0.2, depth);
    vec3 planktonColor = oceanColor * vec3(0.75, 0.88, 0.70); // greenish-dark
    oceanColor = mix(oceanColor, planktonColor, upwellMask * 0.25);

    // 3. Temperature patches — warped blobs of slightly different blue
    float tempPatch1 = warpedFbm(n * 2.5 + seedOff + vec3(2600.0), 3);
    float tempPatch2 = noise3(n * 6.0 + seedOff + vec3(2700.0));
    oceanColor *= 0.92 + tempPatch1 * 0.12 + tempPatch2 * 0.06;

    // 4. Mid-ocean ridges — faint lighter lines on the sea floor
    float midRidge = 1.0 - smoothstep(0.0, 0.10, min(
      abs(fbm(n * noiseScale * 0.6 + seedOff + vec3(50.0), 3) * 2.0 - 1.0),
      abs(fbm(n * noiseScale * 1.0 + seedOff + vec3(80.0), 3) * 2.0 - 1.0)
    ));
    oceanColor = mix(oceanColor, oceanColor * vec3(1.08, 1.06, 1.12), midRidge * 0.15 * depth);

    // 5. Surface micro-texture: multi-scale ripple + grain
    float surfRipple = noise3(n * 18.0 + seedOff + vec3(uTime * 0.008));
    float surfRipple2 = noise3(n * 40.0 + seedOff + vec3(uTime * 0.012, 100.0, 0.0));
    float surfGrain = noise3(n * 80.0 + seedOff + vec3(uTime * 0.015));
    oceanColor *= 0.94 + surfRipple * 0.06 + surfRipple2 * 0.03 + surfGrain * 0.015;

    // Darken ocean slightly (water absorbs light at depth)
    oceanColor *= 0.85;
    color = oceanColor;
    isOcean = 1.0;

  } else {
    // === LAND SURFACE: altitude-banded colors + dramatic mountains ===
    float h = uHasOcean > 0.5 ? elevation - uLandThreshold : elevation + 0.5;
    float hNorm = clamp(h, 0.0, 1.0); // normalized height

    if (uHasBiomes > 0.5) {
      // --- Biome base: dominant across lowlands and most terrain ---
      color = sampleBiome(latitude, h, moisture, microDetail);

      // --- Extra biome detail: break up uniform color patches ---
      float biomeBreak = noise3(n * 14.0 + seedOff + vec3(1100.0));
      float biomeBreak2 = noise3(n * 28.0 + seedOff + vec3(1200.0));
      color *= 0.92 + biomeBreak * 0.12 + biomeBreak2 * 0.06;

      // --- Micro-relief texture: fine grain + shadow on color transitions ---
      // Film grain: ultra-high frequency noise adds surface roughness
      float grain1 = noise3(n * 60.0 + seedOff + vec3(4000.0));
      float grain2 = noise3(n * 100.0 + seedOff + vec3(4100.0));
      float grain3 = noise3(n * 180.0 + seedOff + vec3(4200.0));
      color *= 0.95 + grain1 * 0.06 + grain2 * 0.03 + grain3 * 0.015;

      // Edge darkening at biome transitions: moisture gradient creates micro-shadow
      float moistureGrad = abs(moisture - noise3(n * 5.0 + seedOff + vec3(4300.0)));
      float transitionEdge = smoothstep(0.0, 0.08, moistureGrad) * smoothstep(0.20, 0.08, moistureGrad);
      color *= 1.0 - transitionEdge * 0.12; // subtle darkening at color boundaries

      // Elevation micro-shadow: tiny height variations cast micro-shadows
      float microElev = noise3(n * 45.0 + seedOff + vec3(4400.0));
      float microShadow = smoothstep(0.55, 0.45, microElev) * 0.08;
      float microHighlight = smoothstep(0.55, 0.65, microElev) * 0.06;
      color *= 1.0 - microShadow + microHighlight;

      // --- Mountain ridges: multiple scales, highly visible ---
      if (h > 0.02) {
        // Major continental ridges (Andes/Himalayas scale)
        float ridge1 = 1.0 - abs(fbm(n * noiseScale * 2.0 + seedOff + vec3(2000.0), 3) * 2.0 - 1.0);
        // Secondary ranges (Appalachians/Urals scale)
        float ridge2 = 1.0 - abs(noise3(n * noiseScale * 4.0 + seedOff + vec3(2100.0)) * 2.0 - 1.0);
        // Fine ridges/hills
        float ridge3 = 1.0 - abs(noise3(n * noiseScale * 7.0 + seedOff + vec3(2200.0)) * 2.0 - 1.0);
        // Cross-cutting ridges at different angle
        float ridge4 = 1.0 - abs(noise3(n * noiseScale * vec3(3.0, 1.5, 5.0) + seedOff + vec3(2300.0)) * 2.0 - 1.0);

        // Ridge peaks: visible as lighter lines (exposed rock/snow)
        float peak1 = smoothstep(0.65, 0.85, ridge1) * smoothstep(0.02, 0.15, h);
        float peak2 = smoothstep(0.70, 0.88, ridge2) * smoothstep(0.04, 0.20, h);
        float peak3 = smoothstep(0.75, 0.90, ridge3) * smoothstep(0.06, 0.25, h);
        float peak4 = smoothstep(0.72, 0.88, ridge4) * smoothstep(0.05, 0.18, h);

        // Ridge highlight: exposed lighter rock/snow on top
        vec3 ridgeHighColor = mix(color * 1.25, uSurfaceHigh * vec3(0.85, 0.82, 0.78), 0.4);
        color = mix(color, ridgeHighColor, peak1 * 0.35);
        color = mix(color, ridgeHighColor, peak2 * 0.22);
        color = mix(color, color * 1.12, peak3 * 0.15);
        color = mix(color, color * 1.10, peak4 * 0.12);

        // Valley shadows between ridges
        float valley1 = smoothstep(0.50, 0.65, ridge1) * (1.0 - peak1);
        float valley2 = smoothstep(0.55, 0.70, ridge2) * (1.0 - peak2);
        color *= 1.0 - valley1 * 0.15 - valley2 * 0.08;
      }

      // --- Desert/arid zones: gradient patches in dry regions ---
      if (moisture < 0.0) {
        float dryness = smoothstep(0.0, -0.25, moisture);
        // Warped desert patches with soft edges
        float desertPatch = warpedFbm(n * 3.0 + seedOff + vec3(3000.0), 3);
        float desertMask = smoothstep(0.38, 0.55, desertPatch) * dryness;
        // Desert color gradient: sandy → reddish → dark earth
        float desertVar = noise3(n * 8.0 + seedOff + vec3(3100.0));
        vec3 sandColor = mix(uBiomeDesert * vec3(1.0, 0.95, 0.85),
                             uBiomeDesert * vec3(0.90, 0.80, 0.65), desertVar);
        // Fine dune texture within desert
        float dunes = noise3(n * vec3(12.0, 3.0, 12.0) + seedOff + vec3(3200.0));
        sandColor = mix(sandColor * 0.88, sandColor * 1.08, smoothstep(0.4, 0.6, dunes));
        color = mix(color, sandColor, desertMask * 0.7);
      }

      // --- Himalaya-style altitude banding: brown foothills → gray rock → snow ---
      float rockTexture = turbulence(n * noiseScale * 5.0 + seedOff + vec3(900.0), 4);
      float rockGrain = noise3(n * 40.0 + seedOff + vec3(950.0));

      // Brown foothills (h > 0.15): green → warm brown transition with grain
      float footT = smoothstep(0.12, 0.25, h);
      float footGrain = noise3(n * 55.0 + seedOff + vec3(4500.0));
      vec3 foothillColor = mix(
        uBiomeDesert * vec3(0.80, 0.72, 0.55),  // warm brown earth
        uBiomeDesert * vec3(0.65, 0.55, 0.40),   // darker ravine brown
        rockTexture * 0.5 + rockGrain * 0.3);
      foothillColor *= 0.90 + footGrain * 0.20; // grain texture on dirt
      color = mix(color, foothillColor, footT * smoothstep(0.0, 0.35, h) * 0.55);

      // Gray exposed rock (h > 0.28): textured cold gray
      float rockT = smoothstep(0.25, 0.45, h);
      float rockFine = noise3(n * 70.0 + seedOff + vec3(4600.0));
      vec3 rockColor = mix(
        uSurfaceHigh * vec3(0.62, 0.60, 0.56),
        uSurfaceHigh * vec3(0.48, 0.46, 0.44),
        rockTexture);
      rockColor *= 0.85 + rockGrain * 0.18 + rockFine * 0.10; // heavy grain on rock
      color = mix(color, rockColor, rockT * 0.82);

      // High peaks (h > 0.45): lighter exposed faces
      float peakT = smoothstep(0.42, 0.65, h);
      vec3 peakColor = mix(
        uSurfaceHigh * vec3(0.80, 0.78, 0.74),
        vec3(0.72, 0.70, 0.68), rockTexture * 0.4);
      color = mix(color, peakColor, peakT * 0.65);
    } else {
      float t = clamp(h / 0.8, 0.0, 1.0);
      // Barren planet: multi-layer rock texture
      float rockTurb = turbulence(n * noiseScale * 4.0 + seedOff + vec3(150.0), 5);
      vec3 rockGrain = mix(surfBase, uSurfaceHigh, t);
      rockGrain = mix(rockGrain, rockGrain * vec3(0.85, 0.80, 0.75), rockTurb * 0.4);
      float rockPat = voronoi(n * 8.0 + seedOff + vec3(150.0));
      rockGrain = mix(rockGrain, rockGrain * 0.75, smoothstep(0.2, 0.0, rockPat) * 0.35);
      // Fine grain at high frequency
      float fineGrain = noise3(n * 50.0 + seedOff);
      rockGrain *= 0.9 + fineGrain * 0.2;
      color = rockGrain;
    }

    // Crater coloring on barren planets
    if (craterMask > 0.0 && uHasBiomes < 0.5) {
      vec3 craterFloor = surfBase * vec3(0.65, 0.60, 0.55);
      color = mix(color, craterFloor, craterMask * 0.6);
    }

    // Rivers + tributaries + lakes + estuaries (multi-scale network)
    if (uHasRivers > 0.5 && h < 0.4 && h >= 0.0) {
      // Major rivers (wide, continent-scale)
      float river1 = riverChannel(n * 4.0 + seedOff + vec3(888.0), 3);
      // Secondary rivers
      float river2 = riverChannel(n * 9.0 + seedOff + vec3(999.0), 2);
      // Fine tributaries (thin streams)
      float river3 = riverChannel(n * 16.0 + seedOff + vec3(1050.0), 2);
      // Very fine creeks
      float river4 = riverChannel(n * 28.0 + seedOff + vec3(1080.0), 2);

      // Width: major rivers wide in lowlands, tributaries always thin
      float riverW1 = 0.06 + max(0.0, 1.0 - h * 3.5) * 0.04;
      float riverW2 = 0.035;
      float riverW3 = 0.022;
      float riverW4 = 0.014;

      float mask1 = 1.0 - smoothstep(0.0, riverW1, river1);
      float mask2 = 1.0 - smoothstep(0.0, riverW2, river2);
      float mask3 = 1.0 - smoothstep(0.0, riverW3, river3);
      float mask4 = 1.0 - smoothstep(0.0, riverW4, river4);
      float riverMask = max(max(mask1, mask2 * 0.5), max(mask3 * 0.35, mask4 * 0.20));

      // Only below certain elevation (rivers flow downhill)
      riverMask *= smoothstep(0.35, 0.05, h);
      // More rivers in wet areas
      riverMask *= 0.6 + smoothstep(-0.1, 0.2, moisture) * 0.4;

      // Meander bends
      float bend = noise3(n * 6.0 + seedOff + vec3(444.0));
      riverMask *= 1.0 + smoothstep(0.4, 0.6, bend) * 0.3;

      // River delta / estuary near coastline
      if (h < 0.06) {
        float delta1 = riverChannel(n * 14.0 + seedOff + vec3(777.0), 2);
        float delta2 = riverChannel(n * 22.0 + seedOff + vec3(877.0), 2);
        float deltaMask = 1.0 - smoothstep(0.0, 0.10, delta1);
        deltaMask = max(deltaMask, (1.0 - smoothstep(0.0, 0.06, delta2)) * 0.35);
        deltaMask *= smoothstep(0.06, 0.005, h);
        riverMask = max(riverMask, deltaMask * 0.55);
      }

      vec3 riverColor = mix(uOceanShallow, vec3(0.15, 0.30, 0.48), 0.4);
      vec3 estuaryColor = mix(uOceanShallow, vec3(0.25, 0.35, 0.32), 0.4);
      vec3 waterCol = h < 0.04 ? mix(riverColor, estuaryColor, 0.5) : riverColor;
      // Push river water toward blue too
      waterCol *= vec3(0.6, 0.78, 1.2);
      color = mix(color, waterCol, riverMask * 0.90);
    }

    // === Inland lakes: low-elevation wet depressions ===
    if (uHasOcean > 0.5 && uHasBiomes > 0.5 && h > 0.0 && h < 0.08 && moisture > 0.12) {
      float lakeNoise = noise3(n * 5.0 + seedOff + vec3(1500.0));
      float lakeFine  = noise3(n * 12.0 + seedOff + vec3(1600.0));
      float lakeMask = smoothstep(0.52, 0.62, lakeNoise) * smoothstep(0.08, 0.02, h);
      lakeMask *= smoothstep(0.12, 0.25, moisture); // only in wet areas
      // Lake shape detail: irregular edges
      lakeMask *= 0.7 + smoothstep(0.3, 0.6, lakeFine) * 0.3;
      vec3 lakeColor = mix(uOceanShallow, uOceanDeep, 0.3);
      color = mix(color, lakeColor, lakeMask * 0.9);
    }

    // Desert sand dunes (low moisture, low elevation, warm planet)
    if (uHasBiomes > 0.5 && moisture < -0.1 && h < 0.2 && uSurfaceTempK > 280.0) {
      float dunePattern = noise3(n * vec3(8.0, 2.0, 8.0) + seedOff + vec3(555.0));
      float dune = smoothstep(0.35, 0.65, dunePattern);
      vec3 duneBright = uBiomeDesert * 1.2;
      vec3 duneShadow = uBiomeDesert * 0.65;
      color = mix(color, mix(duneShadow, duneBright, dune), smoothstep(-0.1, -0.25, moisture) * 0.6);
    }

  }

  // === SLOPE SHADING + SLOPE-BASED SNOW: compute normals FIRST ===
  vec3 slopeNorm = vec3(0.0, 1.0, 0.0); // default: flat
  float slopeSteepness = 0.0;

  if (isOcean < 0.5 && iceBlend < 0.5) {
    // Compute terrain normal via finite differences
    float eps1 = 0.004;
    float ex1 = warpedFbm((n + vec3(eps1, 0.0, 0.0)) * noiseScale + seedOff, 5) * mountainScale;
    float ez1 = warpedFbm((n + vec3(0.0, 0.0, eps1)) * noiseScale + seedOff, 5) * mountainScale;
    float rx1 = ridgeNoise((n + vec3(eps1, 0.0, 0.0)) * noiseScale * 1.6 + seedOff + vec3(111.0), 5);
    float rz1 = ridgeNoise((n + vec3(0.0, 0.0, eps1)) * noiseScale * 1.6 + seedOff + vec3(111.0), 5);
    ex1 += (rx1 - 0.22) * ridgeStrength;
    ez1 += (rz1 - 0.22) * ridgeStrength;

    slopeNorm = normalize(vec3(elevation - ex1, eps1 * 3.0, elevation - ez1));
    // Steepness: 0 = flat, 1 = vertical cliff
    slopeSteepness = 1.0 - abs(slopeNorm.y);

    // === SLOPE-BASED SNOW: flat = snow, steep = bare rock (Himalaya-style) ===
    float h_s = uHasOcean > 0.5 ? elevation - uLandThreshold : elevation + 0.5;
    if (h_s > 0.15) {
      float snowLine = 0.20 + latitude * 0.12;
      float snowBase = clamp((h_s - snowLine) / 0.12, 0.0, 1.0);

      // SLOPE controls snow: flat surfaces hold snow, steep cliffs don't
      float slopeSnowMask = smoothstep(0.55, 0.25, slopeSteepness); // 1=flat=snow, 0=steep=rock

      // Ridge boost: snow on ridge crests
      float snowRidge1 = 1.0 - abs(fbm(n * noiseScale * 2.0 + seedOff + vec3(2000.0), 3) * 2.0 - 1.0);
      float ridgeSnowBoost = smoothstep(0.65, 0.85, snowRidge1) * 0.35;

      float snowFade = snowBase * slopeSnowMask + ridgeSnowBoost * smoothstep(0.12, 0.25, h_s);
      snowFade = clamp(snowFade, 0.0, 1.0);

      // Patchy variation
      float snowPatch = noise3(n * 15.0 + seedOff + vec3(555.0));
      float snowPatch2 = noise3(n * 35.0 + seedOff + vec3(655.0));
      snowFade *= smoothstep(0.15, 0.50, snowPatch);

      // Wind streaks
      float windSnow = noise3(n * vec3(3.0, 18.0, 3.0) + seedOff + vec3(666.0));
      snowFade *= 0.50 + smoothstep(0.3, 0.7, windSnow) * 0.50;

      // Rock through
      float rockThrough = smoothstep(0.35, 0.55, snowPatch2) * 0.25;
      snowFade = max(0.0, snowFade - rockThrough);

      // Snow colors
      vec3 snowBright = vec3(0.95, 0.97, 1.0);
      vec3 snowShadow = vec3(0.72, 0.80, 0.92);
      vec3 snowColor = mix(snowShadow, snowBright, snowPatch * 0.5 + 0.4);
      float nearTreeline = 1.0 - smoothstep(snowLine, snowLine + 0.12, h_s);
      snowColor = mix(snowColor, vec3(0.82, 0.82, 0.80), nearTreeline * 0.35);

      color = mix(color, snowColor, snowFade * 0.92);
    }

    // Fine-scale normal perturbation (HIGH micro-roughness for sharp detail)
    float eps2 = 0.001;
    float fx = noise3((n + vec3(eps2, 0.0, 0.0)) * noiseScale * 10.0 + seedOff);
    float fz = noise3((n + vec3(0.0, 0.0, eps2)) * noiseScale * 10.0 + seedOff);
    float fc = noise3(n * noiseScale * 10.0 + seedOff);
    slopeNorm = normalize(slopeNorm + vec3((fc - fx) * 1.8, 0.0, (fc - fz) * 1.8));

    // Directional slope shadow: HIGH CONTRAST — dark shadows, bright faces
    float slopeDot = dot(slopeNorm, uStarDir);
    float slopeShadow = smoothstep(-0.40, 0.30, slopeDot);
    // Mountains: very strong shadows; lowlands: moderate
    float h_land = uHasOcean > 0.5 ? elevation - uLandThreshold : elevation + 0.5;
    float shadowStrength = 0.40 + smoothstep(0.10, 0.40, h_land) * 0.25;
    color *= (1.0 - shadowStrength) + shadowStrength * slopeShadow;

    // Bright highlight on sun-facing ridges (strong specular-like)
    if (slopeDot > 0.4 && h_land > 0.15) {
      float ridgeHighlight = smoothstep(0.4, 0.80, slopeDot) * smoothstep(0.15, 0.45, h_land);
      color = mix(color, color * 1.5, ridgeHighlight * 0.35);
    }

    // Crevice AO: DEEP valley darkening
    float curvature = (ex1 + ez1) * 0.5 - elevation * 0.5;
    color *= 1.0 - clamp(-curvature * 8.0, 0.0, 0.40);

    // Self-shadow from nearby peaks
    float selfOcclusion = smoothstep(0.0, 0.12, h_land) * (1.0 - smoothstep(0.25, 0.55, h_land));
    color *= 1.0 - selfOcclusion * 0.12 * (1.0 - slopeShadow);

    // === ADVANCED RELIEF EFFECTS ===

    // 1. Subsurface scattering on vegetation: light passes through leaves
    if (uHasBiomes > 0.5 && h_land < 0.25 && slopeDot > 0.2) {
      float sssAmount = smoothstep(0.2, 0.6, slopeDot) * (1.0 - smoothstep(0.0, 0.25, h_land));
      sssAmount *= smoothstep(-0.2, 0.15, moisture); // only on green vegetation
      color += vec3(0.01, 0.03, 0.005) * sssAmount * dayFactor; // warm green glow through leaves
    }

    // 2. Rim lighting on ridges: bright edge when backlit by star
    float rimLight = pow(1.0 - max(dot(slopeNorm, vViewDir), 0.0), 4.0);
    float backlit = smoothstep(-0.1, 0.15, dot(n, uStarDir));
    float rimEffect = rimLight * backlit * smoothstep(0.1, 0.4, h_land) * 0.08;
    color += vec3(1.0) * rimEffect * dayFactor;

    // 3. Color temperature shift by altitude: warm lowlands → cool highlands
    float altColorShift = smoothstep(0.0, 0.5, h_land);
    color = mix(color, color * vec3(0.95, 0.95, 1.05), altColorShift * 0.20); // cool blue shift at height

    // 4. Parallax-like depth: darken valleys relative to peaks nearby
    float valleyDepth = smoothstep(0.30, 0.05, h_land);
    float nearbyPeak = smoothstep(0.3, 0.5, elevation);
    color *= 1.0 - valleyDepth * nearbyPeak * 0.15;

    // 5. Atmospheric haze at low elevation: distant lowlands appear hazier
    if (uHasBiomes > 0.5 && h_land < 0.10) {
      float hazeAmount = smoothstep(0.10, 0.0, h_land) * dayFactor * 0.06;
      color = mix(color, vec3(0.55, 0.65, 0.80), hazeAmount); // blue atmospheric scatter
    }
  }

  // --- Lighting ---
  float rimDot = max(dot(vNormal, vViewDir), 0.0);
  float limbDarken = smoothstep(0.0, 0.5, rimDot);

  // Day side lighting — brighter to be visible
  vec3 ambientNight = vec3(0.02) + vec3(0.005, 0.007, 0.012);
  vec3 dayLight;
  if (isOcean > 0.5) {
    // Ocean: very dark deep saturated
    dayLight = vec3(1.0) * uStarIntensity * 0.30;
  } else {
    dayLight = uStarColor * uStarIntensity * 0.48;
  }
  vec3 lit = color * mix(ambientNight, dayLight, dayFactor);

  // Sunset band
  float sunsetBandW = smoothstep(-0.12, 0.0, daylight) * smoothstep(0.20, 0.05, daylight);
  lit = mix(lit, lit * sunsetTint * 3.0, sunsetBandW * 0.3);

  // Limb darkening (stronger contrast at edges)
  lit *= 0.60 + limbDarken * 0.40;

  // Albedo
  lit *= 0.72 + uAlbedo * 0.45;

  // === Subtle contrast boost ===
  lit = lit * 1.08;
  lit = max(lit, vec3(0.0));


  // (ocean specular removed — was adding white "milk" over blue)

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

  // === Aurora: subtle curtain near magnetic poles, night-side only ===
  if (uMagneticStrength > 0.1) {
    // Narrow band: only at very high latitudes (>0.78)
    float auroraLat = smoothstep(0.78, 0.92, latitude);
    // Multi-frequency curtain pattern
    float curtain1 = fbm(n * vec3(2.0, 1.0, 2.0) + vec3(uTime * 0.025, 0.0, uTime * 0.018), 3);
    float curtain2 = noise3(n * vec3(6.0, 2.0, 6.0) + vec3(uTime * 0.04, 0.0, uTime * 0.03));
    float auroraIntensity = auroraLat * smoothstep(0.3, 0.6, curtain1) * uMagneticStrength * 0.15;
    // Fine curtain folds
    auroraIntensity *= 0.7 + 0.3 * smoothstep(0.4, 0.6, curtain2);
    // Strict night-side only (deeper into shadow)
    float nightAurora = 1.0 - smoothstep(-0.25, 0.0, daylight);
    // Multi-color aurora: green + purple + blue (softer palette)
    vec3 auroraGreen  = vec3(0.15, 0.7, 0.3);
    vec3 auroraPurple = vec3(0.35, 0.15, 0.55);
    vec3 auroraBlue   = vec3(0.2, 0.35, 0.7);
    float colorMix = curtain1 + curtain2 * 0.3;
    vec3 auroraColor = mix(auroraGreen, auroraPurple, smoothstep(0.4, 0.7, colorMix));
    auroraColor = mix(auroraColor, auroraBlue, smoothstep(0.65, 0.85, colorMix));
    lit += auroraColor * auroraIntensity * nightAurora;
  }

  gl_FragColor = vec4(lit, 1.0);
}
