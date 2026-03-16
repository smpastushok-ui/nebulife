// Rocky/dwarf planet surface shader
// Procedural terrain: noise -> elevation -> biomes, ocean, ice, lava, city lights
// All driven by planet physical parameters via uniforms

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

// --- Hash-based 3D noise (deterministic, portable) ---

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

// --- Biome sampling (ported from HomePlanetRenderer.ts) ---

vec3 sampleBiome(float latitude, float elevation, float moisture) {
  float h = clamp(elevation, 0.0, 1.0);

  // Mountains override biomes at high elevation
  if (h > 0.35) {
    float t = clamp((h - 0.35) / 0.3, 0.0, 1.0);
    vec3 baseCol = latitude < 0.25 ? uBiomeTropical : uBiomeTemperate;
    return mix(baseCol, uSurfaceHigh, t);
  }

  // Tropical zone (0..0.25)
  if (latitude < 0.25) {
    if (moisture > 0.1) {
      return mix(uBiomeTropical, uBiomeTemperate, clamp(latitude / 0.25, 0.0, 1.0) * 0.3);
    }
    float savannaFade = clamp((moisture + 0.3) / 0.4, 0.0, 1.0);
    return mix(uBiomeDesert, uBiomeTropical, savannaFade * 0.4);
  }

  // Temperate zone (0.25..0.55)
  if (latitude < 0.55) {
    float zoneT = (latitude - 0.25) / 0.3;
    if (moisture > 0.0) {
      return mix(uBiomeTemperate, uBiomeBoreal, zoneT * 0.5);
    }
    return mix(uBiomeDesert, uBiomeTemperate, 0.6);
  }

  // Boreal / sub-polar (0.55..0.78)
  if (latitude < 0.78) {
    float zoneT = (latitude - 0.55) / 0.23;
    return mix(uBiomeBoreal, uBiomeTundra, zoneT);
  }

  // Polar tundra
  return uBiomeTundra;
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

  // Seed offset for deterministic variation (hashed to avoid float32 precision loss)
  vec3 seedOff = vec3(hashSeed(uSeed), hashSeed(uSeed + 1.0), hashSeed(uSeed + 2.0)) * 500.0;

  // Terrain roughness from density + gravity
  float roughness = 1.0 + (uDensity - 5.5) * 0.1;   // Earth density ~5.5
  float mountainScale = 1.0 / max(uGravity, 0.3);     // high gravity -> lower mountains

  // Elevation noise (FBM)
  float noiseScale = 1.8 * roughness;
  float elevation = fbm(n * noiseScale + seedOff, 5) * mountainScale;

  // Moisture noise (secondary, offset seed)
  float moisture = fbm(n * 2.5 + seedOff + vec3(333.0), 4);

  // Latitude (abs of Y component = distance from equator)
  float latitude = abs(n.y);

  // Resource-based soil tint: modulate surfaceBase by mineral composition
  vec3 surfBase = uSurfaceBase;
  surfBase = mix(surfBase, vec3(0.55, 0.25, 0.15), uFeAbundance * 0.3); // Fe -> rust-red
  surfBase = mix(surfBase, vec3(0.75, 0.70, 0.55), uSiAbundance * 0.2); // Si -> pale sandy
  surfBase = mix(surfBase, vec3(0.15, 0.12, 0.10), uCAbundance * 0.25); // C -> dark
  surfBase = mix(surfBase, vec3(0.70, 0.65, 0.20), uSAbundance * 0.2);  // S -> yellow

  // --- Day/night lighting (terminator) ---
  float daylight = dot(n, uStarDir);
  float dayFactor = smoothstep(-0.15, 0.3, daylight); // smooth day/night transition

  // Sunset color at terminator
  vec3 sunsetTint = vec3(0.55, 0.25, 0.12);
  float sunsetBand = smoothstep(-0.1, 0.0, daylight) * smoothstep(0.15, 0.05, daylight);

  // --- Ice caps ---
  float iceLatThreshold = uIceCapFraction > 0.0
    ? asin(1.0 - uIceCapFraction) / (3.14159 / 2.0)
    : 1.0;
  float iceEdgeNoise = fbm(n * 5.0 + seedOff, 3) * 0.10;
  float effectiveIceLat = iceLatThreshold + iceEdgeNoise;
  float iceBlend = clamp((latitude - effectiveIceLat) / 0.08, 0.0, 1.0);

  vec3 color;

  if (iceBlend > 0.0) {
    // Ice cap rendering
    float iceDetail = fbm(n * 8.0 + seedOff, 3);
    float iceCoarse = fbm(n * 3.0 + seedOff, 2);

    vec3 iceColor;
    if (iceDetail > 0.15) {
      iceColor = vec3(0.94, 0.96, 1.0); // fresh snow
    } else if (iceDetail > -0.05) {
      iceColor = mix(vec3(0.85, 0.89, 0.96), vec3(0.78, 0.85, 0.93), clamp(iceCoarse + 0.5, 0.0, 1.0));
    } else if (iceDetail > -0.2) {
      iceColor = mix(vec3(0.69, 0.74, 0.78), vec3(0.60, 0.67, 0.73), clamp(iceCoarse + 0.5, 0.0, 1.0));
    } else {
      iceColor = mix(vec3(0.40, 0.47, 0.53), vec3(0.47, 0.53, 0.60), clamp(iceDetail + 0.5, 0.0, 1.0));
    }

    // Snowy mountain peaks in ice zone
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
    // Lava flows
    float lavaNoise = fbm(n * 5.0 + seedOff, 4);
    if (lavaNoise > 0.2) {
      float lavaIntensity = clamp((lavaNoise - 0.2) / 0.5, 0.0, 1.0);
      color = mix(vec3(0.40, 0.07, 0.0), vec3(1.0, 0.27, 0.0), lavaIntensity);
      // Lava glows even on night side
      dayFactor = max(dayFactor, lavaIntensity * 0.6);
    } else {
      float t = clamp(elevation / 0.8, 0.0, 1.0);
      color = mix(surfBase, uSurfaceHigh, t);
    }

  } else if (uHasOcean > 0.5 && elevation < uLandThreshold) {
    // Ocean
    float depth = clamp((uLandThreshold - elevation) / 0.6, 0.0, 1.0);
    bool isCoastal = elevation > uLandThreshold - 0.08;
    if (isCoastal) {
      color = mix(uOceanShallow, uOceanDeep, depth * 0.3);
    } else {
      color = mix(uOceanShallow, uOceanDeep, depth);
    }

  } else {
    // Land surface
    float h = uHasOcean > 0.5 ? elevation - uLandThreshold : elevation + 0.5;

    if (uHasBiomes > 0.5) {
      color = sampleBiome(latitude, h, moisture);
    } else {
      float t = clamp(h / 0.8, 0.0, 1.0);
      color = mix(surfBase, uSurfaceHigh, t);
    }

    // Snow on high mountains in cold climates
    if (h > 0.5) {
      float snowFade = clamp((h - 0.5) / 0.3, 0.0, 1.0);
      color = mix(color, vec3(0.80, 0.87, 0.91), snowFade * 0.6);
    }
  }

  // --- Apply lighting ---

  // Fresnel limb darkening (1 at center, darker at edges)
  float rimDot = max(dot(vNormal, vViewDir), 0.0);
  float limbDarken = smoothstep(0.0, 0.5, rimDot);

  // Star color tinting
  vec3 lit = color * mix(vec3(0.03), uStarColor * uStarIntensity, dayFactor);

  // Sunset tint at terminator band
  lit = mix(lit, lit * sunsetTint * 3.0, sunsetBand * 0.3);

  // Limb darkening
  lit *= 0.4 + limbDarken * 0.6;

  // Albedo adjustment
  lit *= 0.6 + uAlbedo * 0.8;

  // --- City lights (night side only) ---
  if (uHasCityLights > 0.5 && dayFactor < 0.3) {
    float cityNoise = fbm(n * 6.0 + seedOff + vec3(1234.0), 3);
    float coastBonus = (uHasOcean > 0.5 && elevation < uLandThreshold + 0.15 && elevation >= uLandThreshold) ? 0.15 : 0.0;
    float tropicBonus = latitude < 0.4 ? 0.08 : 0.0;

    if (cityNoise + coastBonus + tropicBonus > 0.25 && latitude < 0.85) {
      // Only on land
      if (uHasOcean < 0.5 || elevation >= uLandThreshold) {
        float intensity = clamp((cityNoise - 0.15) * 2.0, 0.3, 1.0);
        vec3 lightColor = mix(vec3(1.0, 0.80, 0.33), vec3(1.0, 0.93, 0.67), intensity);
        float nightMask = 1.0 - smoothstep(0.0, 0.3, dayFactor);
        // Flicker
        float flicker = 0.85 + 0.15 * sin(uTime * 2.0 + cityNoise * 50.0);
        lit += lightColor * intensity * 0.12 * nightMask * flicker;
      }
    }
  }

  // --- Aurora at poles (magnetic field driven) ---
  if (uMagneticStrength > 0.1) {
    float auroraLat = smoothstep(0.65, 0.85, latitude);
    float auroraNoise = fbm(n * 4.0 + vec3(uTime * 0.02, 0.0, uTime * 0.015), 3);
    float auroraIntensity = auroraLat * smoothstep(0.3, 0.6, auroraNoise) * uMagneticStrength * 0.15;
    // Only visible on night side
    float nightAurora = 1.0 - smoothstep(-0.1, 0.2, daylight);
    vec3 auroraColor = mix(vec3(0.2, 1.0, 0.4), vec3(0.3, 0.5, 1.0), auroraNoise);
    lit += auroraColor * auroraIntensity * nightAurora;
  }

  gl_FragColor = vec4(lit, 1.0);
}
