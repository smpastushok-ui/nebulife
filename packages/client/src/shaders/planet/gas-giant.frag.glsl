// Gas giant / ice giant surface shader — Production-quality
// Features: turbulent band edges, Great Spot vortex, white ovals,
//   polar hexagonal vortex, chevron turbulence, lightning, Kelvin-Helmholtz

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
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.48;
  }
  return v;
}

// Warped FBM for organic storm shapes
float warpedFbm(vec3 p, int octaves) {
  vec3 q = vec3(fbm(p + vec3(0.0), 3), fbm(p + vec3(5.2, 1.3, 0.0), 3), 0.0);
  return fbm(p + q * 0.8, octaves);
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

  float yFrac  = n.y;
  float absLat = abs(yFrac);

  // Slow zonal drift (alternating directions per band)
  float driftTime = uTime * 0.003;

  // === Band position with turbulent displacement ===
  // Multi-scale displacement for wavy, realistic band edges
  float disp1 = fbm(n * vec3(2.0, 0.5, 2.0) + seedOff, 3) * 0.12;
  float disp2 = noise3(n * vec3(6.0, 1.5, 6.0) + seedOff + vec3(50.0)) * 0.04;
  float disp3 = noise3(n * vec3(14.0, 3.0, 14.0) + seedOff + vec3(100.0)) * 0.015;
  float displacement = disp1 + disp2 + disp3;

  float bandPos   = (yFrac * 0.5 + 0.5 + displacement) * uBandCount;
  float bandIndex = floor(bandPos);
  float bandFrac  = bandPos - bandIndex;
  bool  evenBand  = mod(bandIndex, 2.0) < 1.0;

  // === Kelvin-Helmholtz turbulence at band edges ===
  float edgeDist = min(bandFrac, 1.0 - bandFrac); // distance to nearest edge
  float khTurbulence = 0.0;
  if (edgeDist < 0.15) {
    float khNoise = noise3(n * vec3(20.0, 5.0, 20.0) + seedOff + vec3(driftTime * 2.0));
    khTurbulence = smoothstep(0.15, 0.0, edgeDist) * (khNoise - 0.5) * 0.08;
    bandFrac += khTurbulence;
  }

  // Smooth transition
  float t = smoothstep(0.25, 0.75, clamp(bandFrac, 0.0, 1.0));

  // Alternate band colors with tertiary mid-tone
  vec3 midColor = mix(uBandColor1, uBandColor2, 0.5);
  vec3 color;
  if (evenBand) {
    color = mix(uBandColor1, uBandColor2, t);
  } else {
    color = mix(uBandColor2, uBandColor1, t);
  }

  // === Multi-scale detail within bands ===
  vec3 driftOff = vec3(driftTime * (evenBand ? 1.0 : -1.0), 0.0, driftTime * 0.7);

  // Coarse swirl
  float coarseDetail = fbm(n * vec3(8.0, 14.0, 8.0) + seedOff + driftOff, 3);
  color = mix(color, midColor, coarseDetail * 0.15);

  // Fine streaks (elongated along latitude)
  float fineStreak = noise3(n * vec3(30.0, 60.0, 30.0) + seedOff + driftOff * 1.5);
  color = mix(color, color * 1.12, (fineStreak - 0.5) * 0.15);

  // === Chevron patterns (V-shaped wave features between bands) ===
  float chevron = noise3(vec3(
    n.x * 10.0 + abs(n.y) * 4.0 * sign(n.x),
    n.y * 6.0,
    n.z * 10.0 + abs(n.y) * 4.0 * sign(n.z)
  ) + seedOff + driftOff);
  float chevronMask = smoothstep(0.12, 0.05, edgeDist) * smoothstep(0.5, 0.65, chevron);
  vec3 chevronColor = mix(uBandColor1, uBandColor2, 0.7);
  color = mix(color, chevronColor, chevronMask * 0.25);

  // === Zonal wind flow ===
  float flow = fbm(vec3(n.x * 6.0 + n.y * 2.0, n.y * 3.0, n.z * 6.0) + seedOff + driftOff, 3);
  color = mix(color, mix(color, uBandColor1, 0.3), abs(flow - 0.5) * 0.2);

  // === Great Spot (persistent large oval storm) ===
  if (uIsGasGiant > 0.5) {
    // Deterministic spot position from seed
    float spotLat = hashSeed(uSeed + 10.0) * 0.4 - 0.2;  // between -0.2 and 0.2 latitude
    float spotLon = hashSeed(uSeed + 11.0) * 6.28;
    float spotSize = 0.12 + hashSeed(uSeed + 12.0) * 0.06; // 0.12-0.18

    // Rotating with slow drift
    float lon = atan(n.z, n.x) + driftTime * 0.5;
    float lat = n.y;

    float dx = mod(lon - spotLon + 3.14159, 6.28318) - 3.14159;
    float dy = lat - spotLat;
    // Oval shape (wider than tall)
    float spotDist = sqrt(dx * dx / (spotSize * spotSize * 2.5) + dy * dy / (spotSize * spotSize));

    if (spotDist < 1.2) {
      float spotMask = 1.0 - smoothstep(0.0, 1.2, spotDist);
      // Spiral structure inside the spot
      float angle = atan(dy, dx);
      float spiral = sin(angle * 3.0 - spotDist * 8.0 + uTime * 0.01);
      float innerSpiral = noise3(vec3(dx * 15.0, dy * 15.0, spiral) + seedOff);

      vec3 spotCore = mix(vec3(0.75, 0.35, 0.18), vec3(0.55, 0.22, 0.12), innerSpiral);
      vec3 spotEdge = mix(uBandColor2, vec3(0.80, 0.50, 0.25), 0.4);
      vec3 spotColor = mix(spotEdge, spotCore, smoothstep(0.8, 0.2, spotDist));

      color = mix(color, spotColor, spotMask * 0.75);
    }
  }

  // === White ovals (smaller bright storms) ===
  vec3 stormSeedOff = seedOff + vec3(444.0);
  float stormVal = warpedFbm(n * 5.0 + stormSeedOff + driftOff, 3);
  if (uIsGasGiant > 0.5) {
    if (stormVal > 0.3) {
      float stormIntensity = clamp((stormVal - 0.3) / 0.35, 0.0, 1.0);
      // Some storms bright (white ovals), some dark (brown barges)
      float stormType = noise3(n * 3.0 + stormSeedOff);
      vec3 stormColor;
      if (stormType > 0.5) {
        // White oval
        stormColor = mix(color, vec3(0.95, 0.92, 0.85), 0.5);
      } else {
        // Brown barge
        stormColor = mix(uBandColor2, vec3(0.50, 0.28, 0.15), 0.4);
      }
      color = mix(color, stormColor, stormIntensity * 0.45);
    }
  } else {
    // Ice giant: subtle bright methane clouds
    float spotVal = fbm(n * 4.0 + stormSeedOff + driftOff, 3);
    if (spotVal > 0.35) {
      float spotIntensity = clamp((spotVal - 0.35) / 0.4, 0.0, 1.0);
      vec3 spotColor = mix(uBandColor1, vec3(0.80, 0.90, 1.0), 0.35);
      color = mix(color, spotColor, spotIntensity * 0.4);
    }
  }

  // === Polar vortex (hexagonal for gas giants, smooth for ice) ===
  if (absLat > 0.65) {
    float polarT = clamp((absLat - 0.65) / 0.35, 0.0, 1.0);

    if (uIsGasGiant > 0.5 && absLat > 0.8) {
      // Hexagonal polar vortex (Saturn-like)
      float hexLat = (absLat - 0.8) / 0.2;
      float lon = atan(n.z, n.x);
      float hexPattern = abs(sin(lon * 3.0 + driftTime * 0.3));
      float hex = smoothstep(0.3, 0.7, hexPattern) * hexLat;
      vec3 vortexColor = vec3(0.35, 0.25, 0.15);
      vec3 hexEdge = mix(uBandColor1, vec3(0.6, 0.4, 0.2), 0.5);
      color = mix(color, mix(vortexColor, hexEdge, hex), polarT * 0.6);
    } else {
      // Standard polar darkening
      vec3 polarColor = uIsGasGiant > 0.5 ? vec3(0.27, 0.20, 0.13) : vec3(0.13, 0.20, 0.27);
      // Polar clouds/haze
      float polarHaze = fbm(n * 8.0 + seedOff + vec3(700.0), 3);
      polarColor = mix(polarColor, polarColor * 1.3, polarHaze * 0.2);
      color = mix(color, polarColor, polarT * 0.5);
    }
  }

  // === Lightning on night side ===
  float daylight = dot(n, uStarDir);
  float dayFactor = smoothstep(-0.15, 0.3, daylight);

  if (dayFactor < 0.2) {
    float nightMask = 1.0 - smoothstep(0.0, 0.2, dayFactor);
    // Sporadic lightning flashes (time-based hash for randomness)
    float flashSeed = floor(uTime * 3.0); // ~3 potential flashes per second
    float flashLon = hashSeed(flashSeed + uSeed) * 6.28;
    float flashLat = (hashSeed(flashSeed + uSeed + 1.0) - 0.5) * 1.6;
    float lon = atan(n.z, n.x);
    float dx = mod(lon - flashLon + 3.14, 6.28) - 3.14;
    float dy = n.y - flashLat;
    float flashDist = sqrt(dx * dx + dy * dy);
    float flash = smoothstep(0.15, 0.0, flashDist) * nightMask;
    // Only some flashes actually fire
    float flashChance = step(0.85, hashSeed(flashSeed + uSeed + 2.0));
    flash *= flashChance;
    // Brief temporal flash
    float flashT = fract(uTime * 3.0);
    flash *= smoothstep(0.0, 0.05, flashT) * smoothstep(0.15, 0.05, flashT);
    color += vec3(0.6, 0.7, 1.0) * flash * 0.8;
  }

  // --- Lighting ---
  float rimDot = max(dot(vNormal, vViewDir), 0.0);
  float limbDarken = smoothstep(0.0, 0.5, rimDot);

  vec3 darkBase = uIsGasGiant > 0.5 ? vec3(0.10, 0.06, 0.03) : vec3(0.04, 0.06, 0.13);
  vec3 lit = mix(darkBase, color, 0.25 + limbDarken * 0.75);
  lit *= mix(vec3(0.05), uStarColor * uStarIntensity, dayFactor);
  lit *= 0.6 + uAlbedo * 0.8;

  gl_FragColor = vec4(lit, 1.0);
}
