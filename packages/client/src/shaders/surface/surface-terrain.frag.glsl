// Surface terrain shader — top-down satellite view
// Generates procedural terrain from planet physics: elevation noise -> biome coloring
// Water, coastline, forests, deserts, snow, mountains, lava

uniform float uSeed;
uniform float uWaterLevel;       // from waterCoverageFraction (0-1)
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
uniform float uHasLava;          // lava flows (hot planets)
uniform float uFeAbundance;      // Fe -> rust-red soil tint
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

float fbm2(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * noise2(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// ---- Main ----

void main() {
  // World-space position accounting for pan and zoom
  vec2 seedOff = vec2(uSeed * 0.1, uSeed * 0.07);
  vec2 worldPos = (vUv - 0.5) / uZoom + uPan + seedOff;

  // Latitude (0=equator, 1=poles) for biome selection
  float lat = abs(vUv.y - 0.5) * 2.0;

  // ---- Elevation ----
  float elevation = fbm2(worldPos * 3.0, 5);
  // Add large-scale continental shapes
  float continents = fbm2(worldPos * 0.8 + seedOff * 3.0, 3);
  elevation = mix(elevation, continents, 0.4);

  // Water threshold from planet's water coverage
  float waterThresh = uWaterLevel * 0.65 + 0.1;
  bool isWater = elevation < waterThresh;

  // ---- Base terrain color (soil) ----
  vec3 soilColor = uSurfaceBase;
  // Resource-based soil tinting
  soilColor = mix(soilColor, vec3(0.6, 0.3, 0.15), uFeAbundance * 0.3); // iron -> rusty
  soilColor = mix(soilColor, vec3(0.75, 0.7, 0.55), uSiAbundance * 0.2); // silicon -> sandy
  soilColor = mix(soilColor, vec3(0.2, 0.18, 0.15), uCAbundance * 0.3);  // carbon -> dark
  soilColor = mix(soilColor, vec3(0.7, 0.65, 0.2), uSAbundance * 0.25);  // sulfur -> yellow

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
      waterColor = mix(waterColor, vec3(0.7, 0.75, 0.8), foam * 0.4);
    }

    gl_FragColor = vec4(waterColor, 1.0);
    return;
  }

  // ---- Land biome selection ----
  float elNorm = clamp((elevation - waterThresh) / (1.0 - waterThresh), 0.0, 1.0);
  // Moisture from secondary noise
  float moisture = fbm2(worldPos * 4.0 + vec2(333.0, 777.0) + seedOff, 3);

  vec3 biomeColor = soilColor;

  if (uLifeComplexity > 0.5) {
    // Planet has life — biome coloring based on latitude + moisture + temperature
    float tempFactor = clamp((uTempK - 200.0) / 300.0, 0.0, 1.0); // 0=cold, 1=hot

    if (lat < 0.2) {
      // Equatorial zone
      biomeColor = mix(uBiomeTropical, uBiomeDesert, smoothstep(0.4, 0.2, moisture));
      biomeColor = mix(biomeColor, uBiomeTemperate, smoothstep(0.6, 0.8, moisture));
    } else if (lat < 0.45) {
      // Temperate zone
      biomeColor = mix(uBiomeTemperate, uBiomeDesert, smoothstep(0.45, 0.25, moisture));
      biomeColor = mix(biomeColor, uBiomeBoreal, smoothstep(0.4, 0.6, lat));
    } else if (lat < 0.7) {
      // Boreal zone
      biomeColor = mix(uBiomeBoreal, uBiomeTundra, smoothstep(0.45, 0.7, lat));
    } else {
      // Polar zone
      biomeColor = uBiomeTundra;
    }

    // Blend life intensity with bare soil
    float lifeBlend = clamp(uLifeComplexity / 4.0, 0.0, 1.0) * moisture;
    biomeColor = mix(soilColor, biomeColor, lifeBlend * 0.7 + 0.3);
  }

  // ---- Ice caps ----
  if (uIceCap > 0.01) {
    float iceStart = 1.0 - uIceCap;
    float iceFactor = smoothstep(iceStart - 0.05, iceStart + 0.05, lat);
    vec3 iceColor = vec3(0.85, 0.9, 0.95);
    biomeColor = mix(biomeColor, iceColor, iceFactor);
  }

  // ---- Mountains (high elevation) ----
  if (elNorm > 0.6) {
    float mountainFactor = smoothstep(0.6, 0.85, elNorm);
    vec3 rockColor = soilColor * 0.6;
    biomeColor = mix(biomeColor, rockColor, mountainFactor * 0.7);
    // Snow caps on tall mountains (if cold enough)
    if (uTempK < 350.0 && elNorm > 0.8) {
      float snowLine = smoothstep(0.8, 0.95, elNorm);
      biomeColor = mix(biomeColor, vec3(0.9, 0.92, 0.95), snowLine * 0.8);
    }
  }

  // ---- Lava flows (hot volcanic planets) ----
  if (uHasLava > 0.5) {
    float lavaNoise = fbm2(worldPos * 6.0 + vec2(uTime * 0.1, 0.0) + seedOff * 5.0, 3);
    float lavaFactor = smoothstep(0.55, 0.65, lavaNoise) * (1.0 - smoothstep(0.7, 0.85, lavaNoise));
    vec3 lavaColor = mix(vec3(0.8, 0.2, 0.0), vec3(1.0, 0.6, 0.0), noise2(worldPos * 15.0 + uTime * 0.3));
    biomeColor = mix(biomeColor, lavaColor, lavaFactor * 0.8);
    // Lava glow emission
    biomeColor += lavaColor * lavaFactor * 0.15;
  }

  // ---- Coastline detail ----
  float coastDist = (elevation - waterThresh) / max(1.0 - waterThresh, 0.01);
  if (coastDist < 0.04) {
    float sandFactor = smoothstep(0.04, 0.0, coastDist);
    vec3 sandColor = mix(soilColor, vec3(0.75, 0.7, 0.55), 0.5);
    biomeColor = mix(biomeColor, sandColor, sandFactor * 0.6);
  }

  // ---- Slight noise variation for detail ----
  float detail = noise2(worldPos * 30.0) * 0.06 - 0.03;
  biomeColor += vec3(detail);

  gl_FragColor = vec4(biomeColor, 1.0);
}
