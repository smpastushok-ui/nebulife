export const aaaPlanetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;
varying mat3 vModelMat;
void main() {
  vUv = uv;
  vModelMat = mat3(modelMatrix);
  vNormal = normalize(vModelMat * normal);
  vLocalPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const aaaPlanetFragmentShader = `
uniform vec3 baseColor;
uniform vec3 altColor;
uniform vec3 accentColor;
uniform vec3 atmosphereColor;
uniform int planetType;
uniform vec3 sunPos;
uniform float time;
uniform float seed;
uniform float quality;
uniform float stormIntensity;
uniform float craterDensity;
uniform float cloudOpacity;
uniform float atmosphereStrength;
uniform float metallic;
uniform float sulfur;
uniform float carbon;
uniform float ice;
uniform float lava;
uniform vec3 oceanShallow;
uniform vec3 oceanDeep;
uniform float landThreshold;
uniform vec3 biomeTropical;
uniform vec3 biomeTemperate;
uniform vec3 biomeBoreal;
uniform vec3 biomeTundra;
uniform vec3 biomeDesert;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;
varying mat3 vModelMat;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 hash33(vec3 p) {
  p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
            dot(p,vec3(269.5,183.3, 246.1)),
            dot(p,vec3(113.5,271.9, 124.6)));
  return fract(sin(p)*43758.5453123);
}

vec4 getCraterWithNormal(vec3 p, float prob) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 100.0;
  float craterSize = 0.0;
  vec3 minDiff = vec3(0.0);
  
  for(int z=-1; z<=1; z++)
  for(int y=-1; y<=1; y++)
  for(int x=-1; x<=1; x++) {
      vec3 neighbor = vec3(float(x), float(y), float(z));
      vec3 h = hash33(i + neighbor);
      
      if(h.x > prob) continue;
      
      vec3 diff = neighbor + h - f;
      float dist = length(diff);
      if(dist < minDist) {
          minDist = dist;
          minDiff = diff;
          craterSize = 0.5 + h.y * 0.5;
      }
  }
  
  if(minDist > 1.0) return vec4(0.0);
  
  float cavityRad = 0.2 * craterSize;
  float rimInner = 0.15 * craterSize;
  float rimPeak = 0.35 * craterSize;
  float rimOuter = 0.55 * craterSize;
  
  float cavity = smoothstep(cavityRad, 0.0, minDist);
  float rim = smoothstep(rimInner, rimPeak, minDist) * smoothstep(rimOuter, rimPeak, minDist);
  float h_val = (rim * 0.8 - cavity) * craterSize;
  
  vec3 gradDist = -minDiff / (minDist + 0.0001);
  
  float t_cav = clamp((minDist - cavityRad)/(0.0 - cavityRad), 0.0, 1.0);
  float d_cav = (t_cav > 0.0 && t_cav < 1.0) ? (6.0 * t_cav * (1.0 - t_cav)) / (0.0 - cavityRad) : 0.0;
  
  float t_rim1 = clamp((minDist - rimInner)/(rimPeak - rimInner), 0.0, 1.0);
  float d_rim1 = (t_rim1 > 0.0 && t_rim1 < 1.0) ? (6.0 * t_rim1 * (1.0 - t_rim1)) / (rimPeak - rimInner) : 0.0;
  
  float t_rim2 = clamp((minDist - rimOuter)/(rimPeak - rimOuter), 0.0, 1.0);
  float d_rim2 = (t_rim2 > 0.0 && t_rim2 < 1.0) ? (6.0 * t_rim2 * (1.0 - t_rim2)) / (rimPeak - rimOuter) : 0.0;
  
  float sm1 = smoothstep(rimInner, rimPeak, minDist);
  float sm2 = smoothstep(rimOuter, rimPeak, minDist);
  float d_rim = d_rim1 * sm2 + sm1 * d_rim2;
  
  float dh_ddist = (d_rim * 0.8 - d_cav) * craterSize;
  vec3 grad = dh_ddist * gradDist;
  
  return vec4(h_val, grad);
}

vec4 computeCraters(vec3 pos, float density, float seedVal) {
  vec4 c = vec4(0.0);
  float prob = clamp(density * 0.8, 0.0, 1.0);
  if(prob < 0.01) return c;
  
  pos += vec3(mod(seedVal, 100.0), mod(seedVal, 117.0), mod(seedVal, 123.0));
  
  // Giant craters
  float scale = 2.0; float w = 1.0;
  vec4 c1 = getCraterWithNormal(pos * scale, prob * 0.4);
  c += vec4(c1.x * w, c1.yzw * w * scale * 0.5); // reduced gradient scale
  
  // Medium craters
  scale = 4.5; w = 0.5;
  vec4 c2 = getCraterWithNormal(pos * scale, prob * 0.6);
  c += vec4(c2.x * w, c2.yzw * w * scale * 0.5);
  
  // Small oval craters
  scale = 9.0; w = 0.25;
  vec3 pOval = pos * scale; pOval.y *= 0.6;
  vec4 c3 = getCraterWithNormal(pOval, prob * 0.8);
  c3.z *= 0.6; c += vec4(c3.x * w, c3.yzw * w * scale * 0.4);
  
  // Tiny craters
  scale = 18.0; w = 0.125;
  vec4 c4 = getCraterWithNormal(pos * scale, prob);
  c += vec4(c4.x * w, c4.yzw * w * scale * 0.3);
  
  // Scrapes
  scale = 11.0; w = 0.2;
  vec3 pScrape = pos * scale;
  float sRot = pScrape.x * 0.8 + pScrape.y * 0.6;
  float cRot = -pScrape.x * 0.6 + pScrape.y * 0.8;
  pScrape.x = sRot * 0.15; pScrape.y = cRot;
  
  vec4 c5 = getCraterWithNormal(pScrape, prob * 0.3);
  float gx = c5.y * 0.12 + c5.z * (-0.6);
  float gy = c5.y * 0.09 + c5.z * 0.8;
  c += vec4(c5.x * w, vec3(gx, gy, c5.w) * w * scale * 0.4);
  
  return c;
}

float fbm(vec3 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p); p *= 2.01;
  f += 0.0625 * snoise(p);
  return f;
}

float ridged(vec3 p) {
  float n = abs(fbm(p));
  return 1.0 - n;
}

void main() {
  vec3 p = vLocalPosition * 2.0;
  vec3 n = normalize(vNormal);
  vec3 l = normalize(sunPos - vWorldPosition);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
  float rim = smoothstep(0.5, 1.0, fresnel);
  float lat = abs(normalize(vLocalPosition).y);
  float diff = max(dot(n, l), 0.0);
  float spec = 0.0;
  vec3 col = baseColor;

  float detail = max(0.55, quality);
  float t = time;
  
  // FIX: Modulate seed to prevent massive coordinates which destroy floating point precision in snoise.
  // This completely fixes the "blocky artifact" bug on procedurally generated planets with large seeds.
  float s1 = mod(seed, 113.0);
  float s2 = mod(seed, 127.0);
  float s3 = mod(seed, 139.0);
  vec3 seedVec = vec3(s1 * 1.13, s2 * 1.21, s3 * 1.34);

  if (planetType == 1) {
    // GAS GIANT (Dynamically shifting bands based on seed)
    vec3 pWind = p + seedVec + vec3(t * 0.045, 0.0, 0.0);
    float q = fbm(pWind * 2.0);
    vec3 r = vec3(fbm(pWind * 3.0 + q), fbm(pWind * 3.0 + q + vec3(1.2, 3.4, 5.6)), fbm(pWind * 3.0 + q + vec3(7.8)));
    
    float turb = fbm(vec3(pWind.x * 0.8, pWind.y * 2.5, pWind.z * 0.8) + r * (3.0 + stormIntensity * 2.0));
    
    // Use seed to vary the number and thickness of bands
    float bandsScale = 8.0 + mod(seed, 8.0) + quality * 3.0;
    float wavyLat = vLocalPosition.y * bandsScale + turb * (2.0 + stormIntensity * 2.5);
    
    float freq1 = 1.0 + mod(s1, 0.5);
    float freq2 = 1.5 + mod(s2, 1.0);
    float freq3 = 2.0 + mod(s3, 1.5);
    
    float band1 = sin(wavyLat * freq1);
    float band2 = sin(wavyLat * freq2 + s1);
    float band3 = sin(wavyLat * freq3 - s2);
    
    col = mix(altColor * 0.55, baseColor, smoothstep(-1.2, 0.8, band1 + turb * 1.5));
    col = mix(col, accentColor, smoothstep(-0.5, 0.8, band2 - turb) * 0.8);
    col = mix(col, mix(baseColor, vec3(0.92, 0.86, 0.76), 0.4), smoothstep(0.2, 1.2, band3 + turb * 2.0) * 0.6);
    
    float eddies = smoothstep(0.58, 0.9, fbm(pWind * (10.0 + detail * 4.0) + r * 5.0));
    col = mix(col, vec3(0.95, 0.9, 0.82), eddies * 0.75 * quality * stormIntensity);
    
    // Only draw the Great Dark/Red spot if storm intensity is high enough
    if (stormIntensity > 0.4) {
      vec3 spotCenter = normalize(vec3(mod(s1, 1.0) * 2.0 - 1.0, -0.15 - mod(s2, 0.3), 0.8));
      vec3 delta = normalize(vLocalPosition) - spotCenter;
      delta.y *= 1.8 + mod(s3, 1.0);
      float spot = 1.0 - smoothstep(0.12, 0.28, length(delta) + fbm(p * 15.0 - t * 0.1) * 0.13);
      col = mix(col, accentColor * vec3(1.2, 0.55, 0.45), spot * stormIntensity);
    }
  } else if (planetType == 5) {
    vec3 pWarp = p + seedVec + vec3(fbm(p + t * 0.01), fbm(p - t * 0.015), fbm(p + t * 0.02)) * (1.4 + quality);
    float shroud = fbm(pWarp * 3.0);
    float swirls = fbm(pWarp * 6.0 + t * 0.05);
    col = mix(baseColor, altColor, smoothstep(0.06, 0.9, shroud + swirls * 0.45));
    col = mix(col, accentColor, smoothstep(0.55, 0.9, swirls) * 0.35);
  } else if (planetType == 6) {
    float bands = fbm(vec3(seed * 0.01, lat * (18.0 + quality * 8.0), 0.0));
    float turbulence = fbm(p * 1.5 + seedVec + vec3(t * 0.02, 0.0, 0.0));
    float wisps = smoothstep(0.58, 0.9, turbulence) * smoothstep(0.2, 0.45, bands);
    col = mix(baseColor, altColor, bands * 0.45);
    col = mix(col, accentColor, wisps * (0.55 + quality * 0.35));
  } else if (planetType == 3) {
    float bands = fbm(vec3(seed * 0.01, lat * 15.0, 0.0));
    float haze = fbm(p * 0.55 + seedVec + t * 0.004);
    col = mix(baseColor, altColor, smoothstep(0.25, 0.78, haze + bands * 0.25));
    col = mix(col, baseColor, 0.58);
  } else if (planetType == 7) {
    float crust = ridged(p * 3.6 + seedVec);
    float cracks = smoothstep(0.62, 0.9, ridged(p * 9.0 + seedVec));
    col = mix(baseColor * 0.45, altColor, smoothstep(0.25, 0.8, crust));
    vec3 lavaColor = mix(vec3(1.0, 0.18, 0.03), accentColor, 0.3);
    col = mix(col, lavaColor, cracks * (0.25 + lava * 0.65));
    spec = cracks * lava * 0.18;
  } else if (planetType == 8) {
    float iceNoise = fbm(p * 3.4 + seedVec);
    float fractures = smoothstep(0.52, 0.82, ridged(p * 10.0 + seedVec));
    col = mix(baseColor, altColor, smoothstep(0.2, 0.85, iceNoise));
    col = mix(col, accentColor, fractures * 0.42);
    spec = 0.04 + ice * 0.08;
  } else if (planetType == 9) {
    float dunes = fbm(vec3(p.x * 2.2, p.y * 4.8, p.z * 2.2) + seedVec);
    float salts = smoothstep(0.5, 0.86, fbm(p * 7.5 + seedVec));
    col = mix(baseColor, altColor, smoothstep(0.18, 0.8, dunes));
    col = mix(col, accentColor, salts * 0.38);
  } else if (planetType == 10) {
    float basalt = fbm(p * 3.0 + seedVec);
    float veining = smoothstep(0.55, 0.86, ridged(p * 8.0 + seedVec));
    col = mix(baseColor, altColor, smoothstep(0.08, 0.78, basalt));
    col = mix(col, accentColor, veining * (0.2 + carbon * 0.45));
  } else if (planetType == 2) {
    float macroNoise = fbm(p * 1.5 + seedVec);
    float eqBias = abs(normalize(vLocalPosition).y);
    float darkZone = smoothstep(0.3, 0.8, macroNoise + (1.0 - eqBias) * 0.6);
    col = mix(baseColor, altColor, darkZone);
    float microNoise = fbm(p * 8.0 + seedVec);
    col = mix(col, baseColor * 1.35, smoothstep(0.6, 0.8, microNoise) * 0.4);
    col *= 0.7 + 0.3 * fbm(p * 20.0 + seedVec);
  } else if (planetType == 11) {
    // Terran (Earth-like, Ocean, Continental)
    float landNoise = fbm(p * 2.0 + seedVec);
    float humidityNoise = fbm(p * 3.5 + seedVec + vec3(4.0));
    float tempNoise = fbm(p * 1.5 + seedVec + vec3(8.0));
    
    // Base latitude temp (1 at equator, 0 at poles)
    float temp = 1.0 - lat;
    temp += (tempNoise - 0.5) * 0.4;
    temp = clamp(temp, 0.0, 1.0);
    
    if (landThreshold > -0.9 && landNoise < landThreshold) {
        // Ocean
        float depth = smoothstep(landThreshold - 0.15, landThreshold, landNoise);
        col = mix(oceanDeep, oceanShallow, depth);
        
        // Ocean specular is very high
        spec = 0.5 + metallic * 0.2;
        
        // Ice caps on water
        if (lat > 1.0 - ice) {
            float iceVal = fbm(p * 8.0 + seedVec);
            col = mix(col, vec3(0.9, 0.95, 1.0), smoothstep(0.4, 0.6, iceVal));
            spec = 0.1;
        }
    } else {
        // Land
        float humidity = smoothstep(-0.3, 0.3, humidityNoise);
        
        // Determine biome based on temp and humidity
        vec3 biomeCol;
        if (temp > 0.6) {
            biomeCol = mix(biomeDesert, biomeTropical, humidity);
        } else if (temp > 0.3) {
            biomeCol = mix(biomeDesert, biomeTemperate, humidity);
        } else {
            biomeCol = mix(biomeTundra, biomeBoreal, humidity);
        }
        
        // High frequency detail for terrain
        float terrainNoise = fbm(p * 8.0 + seedVec);
        float mountains = ridged(p * 3.5 + seedVec); // 1.0 at sharp mountain ridges
        
        float elev = smoothstep(landThreshold, landThreshold + 0.4, landNoise);
        
        // Rock shows up on steep mountains or very high elevation
        float rockMask = smoothstep(0.6, 1.0, elev + terrainNoise * 0.5) + smoothstep(0.7, 1.0, mountains);
        
        col = mix(biomeCol, altColor, clamp(rockMask, 0.0, 0.8));
        
        // Ice caps on land
        if (lat > 1.0 - ice) {
            col = mix(col, vec3(0.95, 0.98, 1.0), smoothstep(1.0 - ice - 0.1, 1.0 - ice, lat));
        }
        
        // Bump mapping for high frequency details (mountains, canyons, terrain).
        // This is the single most expensive block (8 fbm/ridged taps ≈ 32
        // snoise/pixel). Gate it behind the quality knob so low/mid (quality
        // < 0.6) skip it entirely — they keep the colourful biome surface but
        // shade off the smooth normal, which is the whole point of the
        // "lighter but still beautiful" exosphere on weak GPUs.
        if (quality > 0.6) {
          float eps = 0.02;
          float h0 = fbm(p * 6.0 + seedVec) * 0.5 + ridged(p * 3.5 + seedVec) * 0.5;
          float hx = fbm((p + vec3(eps, 0.0, 0.0)) * 6.0 + seedVec) * 0.5 + ridged((p + vec3(eps, 0.0, 0.0)) * 3.5 + seedVec) * 0.5;
          float hy = fbm((p + vec3(0.0, eps, 0.0)) * 6.0 + seedVec) * 0.5 + ridged((p + vec3(0.0, eps, 0.0)) * 3.5 + seedVec) * 0.5;
          float hz = fbm((p + vec3(0.0, 0.0, eps)) * 6.0 + seedVec) * 0.5 + ridged((p + vec3(0.0, 0.0, eps)) * 3.5 + seedVec) * 0.5;

          vec3 localBump = vec3(hx - h0, hy - h0, hz - h0) * 5.0;
          n = normalize(n - vModelMat * localBump);
          diff = max(dot(n, l), 0.0);
        }

        // Fake ambient occlusion for deep valleys/canyons (where ridged is low).
        // Cheap (reuses mountains + terrainNoise) so it runs on every tier and
        // keeps low/mid surfaces from looking flat.
        col *= mix(0.6, 1.0, smoothstep(0.0, 0.5, mountains + terrainNoise * 0.5));
        
        spec = 0.02; // Land has low specular
    }
  } else {
    float noiseVal = fbm(p * (planetType == 4 ? 5.0 : 3.0) + seedVec);
    col = mix(baseColor, altColor, smoothstep(-0.2, 0.8, noiseVal));
  }

  bool hasCraters = planetType == 4 || planetType == 2 || planetType == 7 || planetType == 8 || planetType == 9 || planetType == 10;
  
  if (hasCraters) {
    vec4 craterData = computeCraters(p, craterDensity, seed);
    
    if (craterData.x != 0.0) {
        float rimMask = smoothstep(0.0, 0.05, craterData.x);
        float cavMask = smoothstep(0.0, -0.1, craterData.x);
        col = mix(col, accentColor, rimMask * 0.5);
        col = mix(col, baseColor * 0.3, cavMask * 0.8);
    }
    
    // Crater micro-relief bump. 4 extra fbm taps — gate behind quality so
    // low/mid keep the (cheap) crater coloring above but skip the normal
    // perturbation. craterData already drives the visible rim/cavity tint.
    if (quality > 0.6) {
      float eps = 0.02;
      float h0 = fbm(p * 4.0 + seedVec);
      float hx = fbm((p + vec3(eps, 0.0, 0.0)) * 4.0 + seedVec);
      float hy = fbm((p + vec3(0.0, eps, 0.0)) * 4.0 + seedVec);
      float hz = fbm((p + vec3(0.0, 0.0, eps)) * 4.0 + seedVec);
      float bumpStrength = planetType == 4 ? 2.5 : mix(0.9, 2.2, clamp(craterDensity + metallic * 0.35, 0.0, 1.0));

      vec3 localBump = vec3(hx - h0, hy - h0, hz - h0) * bumpStrength;
      localBump += craterData.yzw * 0.05 * bumpStrength; // Scale down crater gradient to prevent normal blowout

      // Transform the local bump vector into world space so it rotates correctly with the planet
      vec3 worldBump = vModelMat * localBump;

      n = normalize(n - worldBump);
      diff = max(dot(n, l), 0.0);
    }

    // Shadowing in deep craters
    if (craterData.x < 0.0) {
        // Darken cavities slightly more based on depth
        float depth = clamp(-craterData.x * 3.0, 0.0, 1.0);
        col *= mix(1.0, 0.4, depth);
    }
  }

  float cloud = 0.0;
  if (cloudOpacity > 0.01 && planetType != 1 && planetType != 3 && planetType != 6 && planetType != 4 && planetType != 7 && planetType != 10) {
    vec3 cloudP = p * 1.2 + seedVec + vec3(t * 0.03, 0.0, 0.0);
    float cloudCluster = fbm(cloudP * 1.1 + fbm(cloudP + seedVec));
    cloud = smoothstep(0.36, 0.72, cloudCluster) * cloudOpacity;
    col = mix(col * 0.82, mix(vec3(0.85, 0.9, 0.95), atmosphereColor, 0.25), cloud);
  }

  float absorption = 1.0;
  if (planetType == 4 || planetType == 2 || planetType == 7 || planetType == 9 || planetType == 10) {
      // Rough/dusty rocky planets: Oren-Nayar style flat reflection
      // Reduces the harsh peak at the center where diff = 1.0
      absorption = mix(0.55, 0.95, 1.0 - diff);
  } else if (planetType == 11) {
      // Terran: land is rougher than ocean (ocean has high spec)
      if (spec < 0.1) {
          absorption = mix(0.65, 0.95, 1.0 - diff);
      }
  }

  // Lift the ambient floor on low/mid (quality < 0.6). High/ultra get the
  // night-side glow from bloom + the back-atmosphere shell, so they keep a
  // near-black 0.02 floor for contrast; weak tiers skip those layers, so a
  // higher floor stops the dark hemisphere / terminator reading as pure black
  // (the "темні планети" testers reported).
  vec3 ambient = vec3(quality > 0.6 ? 0.02 : 0.08);
  vec3 finalColor = col * (diff * absorption + ambient);
  
  // Real specular highlight
  vec3 halfVector = normalize(l + viewDir);
  float specPower = planetType == 8 ? 60.0 : 30.0; // tighter reflection for ice
  float specTerm = pow(max(dot(n, halfVector), 0.0), specPower);
  
  float baseSpec = spec;
  if (planetType == 8) { 
      baseSpec = 0.15 + ice * 0.2; 
  } else if (planetType == 4 || planetType == 2 || planetType == 7 || planetType == 9 || planetType == 10) { 
      baseSpec = 0.01 + metallic * 0.03; 
      specPower = 15.0; // wider but much dimmer spread for dusty rocks
  }
  
  if (diff > 0.0) {
    finalColor += baseSpec * specTerm * vec3(1.0, 0.9, 0.9);
  }

  if (atmosphereStrength > 0.01 && planetType != 4 && planetType != 10) {
    float daySide = smoothstep(-0.2, 0.2, dot(normalize(vNormal), l));
    finalColor += atmosphereColor * rim * daySide * atmosphereStrength;
  }

  gl_FragColor = vec4(max(finalColor, vec3(0.0)), 1.0);
}
`;
