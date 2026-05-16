import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface LivingOrreryHeroProps {
  isIgnited: boolean;
  onIgniteComplete: () => void;
  targetStep: number;
}

const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const sunFragmentShader = `
uniform float time;
uniform float intensity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// basic 3D noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 6; i++) {
        f += amp * snoise(p);
        p = p * 2.02;
        amp *= 0.5;
    }
    return f;
}

void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = dot(viewDir, n);
    float rim = 1.0 - max(fresnel, 0.0);
    
    // Very slow time
    float t = time * 0.02;
    
    // Use true spherical coordinates for uniform wrapping
    vec3 p = normalize(vPosition) * 4.0;
    
    // Domain warping for plasma flow
    float q = fbm(p - t * 0.5);
    vec3 warpedP = p + vec3(q, q, q) * 1.5;
    
    // Granulation (high frequency)
    float gran = fbm(warpedP * 4.0 + t * 2.0);
    
    // Large convection cells
    float cells = fbm(warpedP * 1.2 - t);
    
    // Combine noises for rich texture
    float noiseVal = mix(cells, gran, 0.4);
    
    // High contrast for AAA look
    noiseVal = smoothstep(-0.1, 0.7, noiseVal);
    
    // Deep, realistic color palette
    vec3 colorDark = vec3(0.05, 0.0, 0.0);      // Deep black/red spots
    vec3 colorBase = vec3(0.8, 0.2, 0.0);       // Rich orange
    vec3 colorBright = vec3(1.0, 0.6, 0.1);     // Golden yellow
    vec3 colorCore = vec3(1.0, 0.95, 0.8);      // White-hot plasma
    
    vec3 finalColor = mix(colorDark, colorBase, smoothstep(0.0, 0.4, noiseVal));
    finalColor = mix(finalColor, colorBright, smoothstep(0.4, 0.8, noiseVal));
    finalColor = mix(finalColor, colorCore, smoothstep(0.8, 1.0, noiseVal));
    
    // Edge glow (rim)
    float edgeGlow = pow(rim, 3.0);
    finalColor += colorCore * edgeGlow * 0.8;
    
    // Center glow based on view angle
    finalColor += colorBright * pow(max(fresnel, 0.0), 2.0) * 0.2;
    
    gl_FragColor = vec4(finalColor * intensity * 1.2, 1.0);
}
`;

const coronaVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const coronaFragmentShader = `
uniform float time;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// Include snoise and fbm here as well
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
        f += amp * snoise(p);
        p = p * 2.02;
        amp *= 0.5;
    }
    return f;
}

void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = max(dot(viewDir, n), 0.0);
    
    // Distance from center (sun radius = 3.0, corona radius = 4.2)
    float dist = length(vPosition);
    float alphaFalloff = 1.0 - smoothstep(2.9, 4.2, dist);
    
    float t = time * 0.05;
    vec3 p = normalize(vPosition) * 4.0;
    
    // Flares noise
    float flares = fbm(p - t);
    flares = pow(abs(flares), 3.0) * 8.0; // Sharp, intense spikes
    
    vec3 color = vec3(1.0, 0.4, 0.0);
    // Combine edge rim with flares
    float alpha = (flares + pow(1.0 - rim, 3.0)) * alphaFalloff * 0.5;
    
    gl_FragColor = vec4(color, alpha);
}
`;

const nebulaVertexShader = `
varying vec3 vPos;
void main() {
  vPos = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const nebulaFragmentShader = `
uniform vec3 uNebSeed;
varying vec3 vPos;
// Simple 3D hash
float h3(vec3 p) {
  p = fract(p * vec3(443.897, 397.297, 491.187));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}
float n3(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x),
        mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x),
        mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm4(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * n3(p); p *= 2.03; a *= 0.48; }
  return v;
}
void main() {
  vec3 n = normalize(vPos);
  vec3 s = uNebSeed;
  // Domain warp for organic nebula shapes
  vec3 wq = vec3(fbm4(n * 2.5 + s + vec3(50.0)), fbm4(n * 2.5 + s + vec3(55.0)), 0.0);
  vec3 wn = n + wq * 0.08;
  // Large-scale brightness variation (unresolved star clusters)
  float cluster1 = fbm4(wn * 2.0 + s + vec3(100.0));
  float cluster2 = fbm4(wn * 3.5 + s + vec3(200.0));
  float cluster3 = fbm4(wn * 5.0 + s + vec3(250.0));
  float density = smoothstep(0.35, 0.65, cluster1) * 0.5
                + smoothstep(0.40, 0.68, cluster2) * 0.3
                + smoothstep(0.42, 0.70, cluster3) * 0.2;
                
  // Cosmic web (vast interconnected bright regions instead of a single ring)
  float web1 = fbm4(wn * 1.5 + s + vec3(600.0));
  float web2 = fbm4(wn * 2.2 + s + vec3(650.0));
  float web = smoothstep(0.4, 0.7, web1) * 0.6 + smoothstep(0.45, 0.65, web2) * 0.4;
  density += web * 0.6;
  
  // Spectral color patches (each at different spatial frequency)
  float warm   = fbm4(wn * 4.0 + s + vec3(300.0));
  float cool   = fbm4(wn * 4.0 + s + vec3(400.0));
  float pink   = fbm4(wn * 5.0 + s + vec3(500.0));
  float teal   = fbm4(wn * 3.5 + s + vec3(700.0));
  float violet = fbm4(wn * 6.0 + s + vec3(800.0));
  float gold   = fbm4(wn * 4.5 + s + vec3(900.0));
  
  // Base: deep space blue-black
  vec3 col = vec3(0.04, 0.05, 0.12);
  
  // Warm emission nebula (amber-orange)
  col += vec3(0.50, 0.20, 0.05) * smoothstep(0.50, 0.75, warm) * density;
  // Cool reflection nebula (deep blue)
  col += vec3(0.08, 0.20, 0.50) * smoothstep(0.45, 0.70, cool) * density;
  // H-alpha pink/magenta regions
  col += vec3(0.35, 0.05, 0.28) * smoothstep(0.55, 0.80, pink) * density;
  // Teal/cyan OIII emission
  col += vec3(0.05, 0.32, 0.35) * smoothstep(0.50, 0.75, teal) * density;
  // Violet/purple interstellar medium
  col += vec3(0.22, 0.05, 0.40) * smoothstep(0.55, 0.80, violet) * density;
  // Golden stellar nursery glow
  col += vec3(0.35, 0.28, 0.08) * smoothstep(0.50, 0.75, gold) * density * web;
  
  // White unresolved starlight
  col += vec3(0.20, 0.20, 0.24) * density;
  
  // Brightened background atmosphere feel - higher base opacity so there are no empty "holes"
  float alpha = clamp(density * 0.7 + 0.15, 0.0, 0.7);
  gl_FragColor = vec4(col, alpha);
}
`;

const planetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  // Compute normal in world space
  vNormal = normalize(mat3(modelMatrix) * normal);
  vLocalPosition = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const planetFragmentShader = `
uniform vec3 baseColor;
uniform vec3 altColor;
uniform int planetType; // 0 = water, 1 = gas, 2 = desert, 3 = ice, 4 = mercury, 5 = venus
uniform vec3 sunPos; // world space
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p = p * 2.02;
    f += 0.2500 * snoise(p); p = p * 2.03;
    f += 0.1250 * snoise(p); p = p * 2.01;
    f += 0.0625 * snoise(p);
    return f;
}

void main() {
    vec3 p = vLocalPosition * 2.0;
    vec3 n = normalize(vNormal);
    
    // Normal perturbation (Bump mapping) for Rocky/Desert planets and Earth
    if (planetType == 4 || planetType == 2 || planetType == 0) {
        float eps = 0.02;
        float h0 = fbm(p * 4.0);
        float hx = fbm((p + vec3(eps, 0.0, 0.0)) * 4.0);
        float hy = fbm((p + vec3(0.0, eps, 0.0)) * 4.0);
        float hz = fbm((p + vec3(0.0, 0.0, eps)) * 4.0);
        
        float bumpStrength = 0.0;
        if (planetType == 4) bumpStrength = 2.0; // Less porous Mercury
        else if (planetType == 2) bumpStrength = 1.5; // Less porous Mars
        else if (planetType == 0) {
            float landNoise = fbm(p * 2.0);
            // Only apply bump to actual land (threshold is 0.15) to keep oceans completely smooth
            bumpStrength = smoothstep(0.16, 0.25, landNoise) * 4.0;
        }
        
        vec3 bump = vec3(hx - h0, hy - h0, hz - h0) * bumpStrength;
        n = normalize(n - bump);
    }
    
    vec3 l = normalize(sunPos - vWorldPosition);
    float diff = max(dot(n, l), 0.0);
    
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
    float rim = smoothstep(0.5, 1.0, fresnel);
    
    float noiseVal = 0.0;
    vec3 col = baseColor;
    float spec = 0.0;
    
    if (planetType == 1) { // Jupiter (Detailed Gas Giant)
        float lat = vLocalPosition.y;
        
        // Complex domain warping to break up the straight lines into massive chaotic storms
        vec3 pWind = p + vec3(time * 0.05, 0.0, 0.0);
        
        float q = fbm(pWind * 2.0);
        vec3 r = vec3(
            fbm(pWind * 3.0 + q), 
            fbm(pWind * 3.0 + q + vec3(1.2, 3.4, 5.6)), 
            fbm(pWind * 3.0 + q)
        );
        
        // Create highly turbulent noise
        float turb = fbm(vec3(pWind.x * 0.8, pWind.y * 2.5, pWind.z * 0.8) + r * 4.0);
        
        // Highly turbulent latitude for chaotic bands
        float wavyLat = lat * 12.0 + turb * 3.0 + fbm(pWind * 5.0) * 1.5;
        
        // Multiple chaotic interacting bands
        float band1 = sin(wavyLat);
        float band2 = sin(wavyLat * 1.8 + 2.0);
        float band3 = sin(wavyLat * 2.7 - 1.0);
        
        // Rich color palette from the reference image
        vec3 cream = vec3(0.9, 0.85, 0.8);
        vec3 rust = vec3(0.8, 0.4, 0.15);
        vec3 darkBrown = vec3(0.4, 0.15, 0.05);
        vec3 paleOrange = vec3(0.85, 0.6, 0.4);
        
        // Layer the colors chaotically
        col = mix(darkBrown, rust, smoothstep(-1.2, 0.8, band1 + turb * 1.5));
        col = mix(col, paleOrange, smoothstep(-0.5, 0.8, band2 - turb));
        col = mix(col, cream, smoothstep(0.2, 1.2, band3 + turb * 2.0));
        
        // Add random small white storms/eddies
        float eddies = smoothstep(0.6, 0.9, fbm(pWind * 12.0 + r * 5.0));
        col = mix(col, cream, eddies * 0.8);
        
        // Massive swirling storm (Great Red Spot)
        vec3 spotCenter = normalize(vec3(0.5, -0.25, 0.8));
        vec3 pNorm = normalize(vLocalPosition);
        
        // Distance with vertical squashing
        vec3 delta = pNorm - spotCenter;
        delta.y *= 1.8; 
        float spotDist = length(delta);
        
        // Swirling noise inside the spot
        float spotTurb = fbm(p * 15.0 - time * 0.1) * 0.15;
        
        float spot = 1.0 - smoothstep(0.15, 0.3, spotDist + spotTurb);
        float spotRing = smoothstep(0.1, 0.2, spotDist + spotTurb) * (1.0 - smoothstep(0.2, 0.3, spotDist + spotTurb));
        
        col = mix(col, darkBrown, spotRing * 0.8);
        col = mix(col, vec3(0.9, 0.3, 0.1), spot * 0.9);
        col = mix(col, cream, spot * smoothstep(0.4, 0.8, fbm(p * 20.0 + time * 0.3)) * 0.7);
        
    } else if (planetType == 4) { // Mercury (Rocky)
        noiseVal = fbm(p * 5.0);
        float craters = fbm(p * 15.0);
        col = mix(baseColor, altColor, smoothstep(-0.2, 0.8, noiseVal + craters * 0.3));
    } else if (planetType == 5) { // Venus (Dense hot clouds)
        vec3 pWarp = p + vec3(fbm(p + time * 0.01), fbm(p - time * 0.015), fbm(p + time * 0.02)) * 2.0;
        noiseVal = fbm(pWarp * 3.0);
        float swirls = fbm(pWarp * 6.0 + time * 0.05);
        col = mix(baseColor, altColor, smoothstep(0.1, 0.9, noiseVal + swirls * 0.4));
    } else if (planetType == 2) { // Mars (Red Planet)
        // Large scale dark patches (maria)
        float macroNoise = fbm(p * 1.5);
        // Bias dark patches towards equator/center, similar to the reference image
        float eqBias = abs(normalize(vLocalPosition).y);
        float darkZone = smoothstep(0.3, 0.8, macroNoise + (1.0 - eqBias) * 0.6);
        
        col = mix(baseColor, altColor, darkZone);
        
        // Craters and surface details
        float microNoise = fbm(p * 8.0);
        col = mix(col, baseColor * 1.3, smoothstep(0.6, 0.8, microNoise) * 0.4); // lighter crater rims
        col *= (0.7 + 0.3 * fbm(p * 20.0)); // fine dust texture
    } else if (planetType == 0) { // Earth (Water, Continents, Clouds)
        float landNoise = fbm(p * 2.0);
        float landThreshold = 0.15; // More water (threshold > 0 means land is less frequent)
        
        vec3 oceanColor = baseColor; 
        vec3 greenLand = altColor;   
        vec3 desertLand = vec3(0.75, 0.55, 0.35); 
        vec3 iceColor = vec3(0.9, 0.95, 1.0);
        
        float normalizedLat = abs(normalize(vLocalPosition).y);
        
        // Deserts in mid-latitudes
        float desertBand = smoothstep(0.1, 0.35, normalizedLat) * (1.0 - smoothstep(0.35, 0.6, normalizedLat));
        vec3 landColor = mix(greenLand, desertLand, desertBand + fbm(p * 4.0) * 0.4);
        
        // Ice caps - scale them down so they don't look like giant polar clouds
        float iceBand = smoothstep(0.75, 0.9, normalizedLat + fbm(p * 3.0) * 0.1);
        landColor = mix(landColor, iceColor, iceBand);
        oceanColor = mix(oceanColor, iceColor, iceBand * smoothstep(0.3, 0.6, fbm(p * 6.0)));
        
        // Sharp land transition
        float isLand = smoothstep(landThreshold - 0.02, landThreshold + 0.02, landNoise);
        col = mix(oceanColor, landColor, isLand);
        
        if (isLand < 0.5 && iceBand < 0.5) {
            // Ocean specularity: much more matte, less glossy overall
            vec3 halfVector = normalize(l + viewDir);
            spec = pow(max(dot(n, halfVector), 0.0), 30.0) * 0.08;
        }
        
        // Smooth, realistic cyclone clouds
        float cloudTime = time * 0.03; // Significantly slowed down to remove jelly effect
        // Translate clouds across the sphere so they move slightly faster than the planet rotates
        vec3 cloudP = p * 1.2 + vec3(cloudTime, 0.0, 0.0); // Removed vertical drift
        
        // Create strong swirling domain warp
        vec3 q = vec3(
            fbm(cloudP + vec3(1.2, 3.4, 5.6)),
            fbm(cloudP + vec3(7.8, 9.0, 1.2)),
            fbm(cloudP + vec3(3.4, 5.6, 7.8))
        );
        
        // Extra swirl component - animate very slowly
        float swirl = fbm(cloudP + q * 2.5 + cloudTime * 0.5);
        
        // Final cloud noise
        float cNoise = fbm(cloudP + q * 3.0 + swirl * 1.5);
        cNoise = cNoise * 0.5 + 0.5; // Normalize to roughly 0..1
        
        // Large scale clusters so clouds aren't uniform - they also drift slowly
        float cluster = fbm(p * 0.8 - cloudTime * 0.2);
        cluster = cluster * 0.5 + 0.5;
        
        // Combine fine swirling noise with large clusters
        float finalCloudNoise = cNoise * (cluster * 1.5 + 0.2);
        
        // Extract crisp but soft-edged clouds
        float clouds = smoothstep(0.4, 0.7, finalCloudNoise);
        
        // Cloud shadow on the ground
        col *= mix(1.0, 0.5, clouds); 
        
        // Add clouds (completely diffuse, blocking ocean specularity)
        if (clouds > 0.0) {
            spec *= max(0.0, 1.0 - clouds * 2.0); 
        }
        
        // Mix matte white clouds over everything
        vec3 cloudColor = mix(vec3(0.85, 0.9, 0.95), vec3(1.0, 1.0, 1.0), clouds);
        col = mix(col, cloudColor, clouds * 0.95);
    } else if (planetType == 3) { // Uranus
        float lat = abs(normalize(vLocalPosition).y);
        float bands = fbm(vec3(0.0, lat * 15.0, 0.0));
        noiseVal = fbm(p * 0.5 + time * 0.005);
        col = mix(baseColor, altColor, smoothstep(0.3, 0.7, noiseVal + bands * 0.3));
        col = mix(col, baseColor, 0.7); // Very soft look
    } else if (planetType == 6) { // Neptune
        float lat = abs(normalize(vLocalPosition).y);
        float bands = fbm(vec3(0.0, lat * 25.0, 0.0));
        noiseVal = fbm(p * 1.5 + vec3(time * 0.02, 0.0, 0.0));
        float wisps = smoothstep(0.6, 0.9, noiseVal) * smoothstep(0.2, 0.4, bands);
        col = mix(baseColor, altColor, bands * 0.4);
        col = mix(col, vec3(0.8, 0.9, 1.0), wisps * 0.8);
    } else {
        noiseVal = fbm(p * 2.0);
        float threshold = planetType == 2 ? 0.0 : 0.4;
        if (noiseVal < threshold) {
            col = baseColor;
        } else {
            col = altColor;
        }
        col *= (0.8 + 0.4 * fbm(p * 5.0));
    }
    
    vec3 ambient = vec3(0.01);
    vec3 finalColor = col * diff + col * ambient;
    
    // Add specular highlight for oceans
    if (spec > 0.0) {
        finalColor += spec * vec3(1.0, 0.9, 0.8);
    }
    
    // Atmosphere rim
    if (planetType != 4) { // No atmosphere for Mercury
        vec3 atmColor = mix(altColor, vec3(0.5, 0.8, 1.0), 0.5);
        float atmStrength = 1.5;
        float currentRim = rim; // Use default rim
        
        if (planetType == 2) {
            atmColor = vec3(0.9, 0.4, 0.1); // thin red/orange atmosphere
            atmStrength = 0.2; // very thin, matte look
        } else if (planetType == 5) {
            atmColor = vec3(1.0, 0.7, 0.2); // Venus atmosphere
            atmStrength = 2.5;
        } else if (planetType == 0) {
            atmColor = vec3(0.3, 0.6, 1.0); // Earth atmosphere
            atmStrength = 1.2; // Softer, more natural
            // Create a very soft, airy falloff instead of a gel-like hard edge
            currentRim = pow(fresnel, 2.5) * 1.5; 
        } else if (planetType == 3) {
            atmColor = vec3(0.6, 0.8, 0.9); // Uranus atmosphere
            atmStrength = 1.2;
        } else if (planetType == 6) {
            atmColor = vec3(0.3, 0.5, 1.0); // Neptune atmosphere
            atmStrength = 1.0;
        }
        
        // Soft twilight wrap-around for the atmosphere
        float daySide = smoothstep(-0.2, 0.2, dot(normalize(vNormal), l));
        finalColor += atmColor * currentRim * daySide * atmStrength;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

const PLANETS = [
  { id: 'mercury', radius: 0.5, orbit: 10, color: 0x888888, altColor: 0x444444, speed: 0.05, type: 4 }, // Mercury (Grey/Matte Rock)
  { id: 'venus', radius: 0.75, orbit: 16, color: 0xcc5500, altColor: 0xffdd44, speed: 0.04, type: 5 }, // Venus
  { id: 'worlds', radius: 0.8, orbit: 22, color: 0x143b75, altColor: 0x4c6e3b, speed: 0.033, type: 0 }, // Earth
  { id: 'colony', radius: 0.6, orbit: 34, color: 0x8c3b24, altColor: 0x3d1c13, speed: 0.026, type: 2 }, // Mars (Dusty/Matte Rust)
  { id: 'discoveries', radius: 1.4, orbit: 52, color: 0xc69a68, altColor: 0xffddaa, speed: 0.013, type: 1 }, // Jupiter
  { id: 'academy', radius: 1.0, orbit: 75, color: 0x5b9fb5, altColor: 0x8bc3d6, speed: 0.006, type: 3 }, // Uranus
  { id: 'neptune', radius: 0.95, orbit: 95, color: 0x2244bb, altColor: 0x4488ff, speed: 0.004, type: 6 }, // Neptune
] as const;

export function LivingOrreryHero({ isIgnited, onIgniteComplete, targetStep }: LivingOrreryHeroProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sunUniformsRef = useRef({ time: { value: 0 }, intensity: { value: 0.3 } });
  
  // Proxy objects for GSAP to animate camera position and lookAt target independently
  const camPosProxy = useRef({ x: 0, y: 0, z: 6 });
  const camLookProxy = useRef({ x: 0, y: 0, z: 0 });
  const journeyProxy = useRef({ progress: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010206);
    scene.fog = new THREE.FogExp2(0x010206, 0.015);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(camPosProxy.current.x, camPosProxy.current.y, camPosProxy.current.z);
    camera.lookAt(camLookProxy.current.x, camLookProxy.current.y, camLookProxy.current.z);

    // LIGHTING
    const ambient = new THREE.AmbientLight(0x223344, 0.5);
    scene.add(ambient);
    const sunLight = new THREE.PointLight(0xffaa55, 3, 100);
    scene.add(sunLight);

    // SUN
    const sunGeo = new THREE.SphereGeometry(3, 64, 64);
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      uniforms: sunUniformsRef.current,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);
    
    // SUN CORONA
    const coronaGeo = new THREE.SphereGeometry(4.2, 64, 64);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      uniforms: sunUniformsRef.current,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(corona);

    // PLANETS
    const planetsGroup = new THREE.Group();
    scene.add(planetsGroup);
    
    const planetData = PLANETS.map((p, i) => {
      // Planet mesh
      const planetUniforms = {
        baseColor: { value: new THREE.Color(p.color) },
        altColor: { value: new THREE.Color(p.altColor) },
        planetType: { value: p.type },
        sunPos: { value: new THREE.Vector3(0, 0, 0) },
        time: { value: 0 }
      };
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 64, 64),
        new THREE.ShaderMaterial({
          vertexShader: planetVertexShader,
          fragmentShader: planetFragmentShader,
          uniforms: planetUniforms
        })
      );
      
      // Fine dusty rings for gas giant (Jupiter)
      if (p.type === 1) {
        const particleCount = 12000;
        const ringGeo = new THREE.BufferGeometry();
        const ringPos = new Float32Array(particleCount * 3);
        const ringColors = new Float32Array(particleCount * 3);
        const dustColor = new THREE.Color(0xccaa88);
        const rockColor = new THREE.Color(0x887766);
        const iceColor = new THREE.Color(0xaabbcc);
        
        for (let j = 0; j < particleCount; j++) {
          let r = 0;
          const band = Math.random();
          if (band < 0.35) {
            r = p.radius * (1.15 + Math.random() * 0.25); // Inner ring
          } else if (band < 0.8) {
            r = p.radius * (1.5 + Math.random() * 0.45); // Main ring
          } else {
            r = p.radius * (2.1 + Math.random() * 0.35); // Outer faint ring
          }
          
          const theta = Math.random() * 2 * Math.PI;
          // Extremely thin vertical spread
          const y = (Math.random() - 0.5) * 0.01 * p.radius;
          
          ringPos[j * 3] = r * Math.cos(theta);
          ringPos[j * 3 + 1] = y;
          ringPos[j * 3 + 2] = r * Math.sin(theta);
          
          let mixedColor = dustColor.clone().lerp(rockColor, Math.random());
          if (band >= 0.8) mixedColor = mixedColor.lerp(iceColor, 0.5);
          
          ringColors[j * 3] = mixedColor.r;
          ringColors[j * 3 + 1] = mixedColor.g;
          ringColors[j * 3 + 2] = mixedColor.b;
        }
        
        ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
        ringGeo.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));
        
        const ringMat = new THREE.ShaderMaterial({
          uniforms: {
            sunPos: { value: new THREE.Vector3(0, 0, 0) },
            planetRadius: { value: p.radius }
          },
          vertexShader: `
            attribute vec3 color;
            varying vec3 vColor;
            varying vec3 vWorldPosition;
            varying vec3 vPlanetWorldPosition;
            void main() {
              vColor = color;
              vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
              vPlanetWorldPosition = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = 3.0 * (15.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            uniform vec3 sunPos;
            uniform float planetRadius;
            varying vec3 vColor;
            varying vec3 vWorldPosition;
            varying vec3 vPlanetWorldPosition;
            void main() {
              vec2 uv = gl_PointCoord.xy - 0.5;
              float dist = length(uv);
              if (dist > 0.5) discard;
              
              vec3 lightDir = normalize(vWorldPosition - sunPos);
              vec3 sunToPlanet = vPlanetWorldPosition - sunPos;
              float t = dot(sunToPlanet, lightDir);
              
              float shadow = 1.0;
              if (t > 0.0 && t < length(vWorldPosition - sunPos)) {
                 vec3 proj = sunPos + t * lightDir;
                 float distToRay = length(vPlanetWorldPosition - proj);
                 shadow = smoothstep(planetRadius * 0.9, planetRadius * 1.05, distToRay);
                 shadow = max(0.05, shadow); // deep shadow
              }
              
              float alpha = (1.0 - dist * 2.0) * 0.45; // soft particle
              gl_FragColor = vec4(vColor * shadow, alpha);
            }
          `,
          transparent: true,
          blending: THREE.NormalBlending,
          depthWrite: false
        });
        
        const ring = new THREE.Points(ringGeo, ringMat);
        mesh.add(ring);
        mesh.userData.rings = ring; // Save reference for animation
      }
      
      // Rings for Neptune (thin, horizontal)
      if (p.type === 6) {
        const ring1 = new THREE.Mesh(
          new THREE.RingGeometry(p.radius * 1.8, p.radius * 2.0, 64),
          new THREE.MeshStandardMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            roughness: 0.6,
          })
        );
        ring1.rotation.x = Math.PI / 2.1;
        ring1.rotation.y = Math.PI / 12;
        mesh.add(ring1);
        
        const ring2 = new THREE.Mesh(
          new THREE.RingGeometry(p.radius * 2.1, p.radius * 2.15, 64),
          new THREE.MeshStandardMaterial({
            color: 0x6688cc,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            roughness: 0.6,
          })
        );
        ring2.rotation.x = Math.PI / 2.1;
        ring2.rotation.y = Math.PI / 12;
        mesh.add(ring2);
      }
      
      planetsGroup.add(mesh);
      return { mesh, uniforms: planetUniforms, ...p, currentAngle: Math.PI * 0.25 * i }; // stagger initial positions
    });

    // KUIPER BELT
    const asteroidCount = 8000;
    const kuiperGeo = new THREE.BufferGeometry();
    const kuiperPos = new Float32Array(asteroidCount * 3);
    const kuiperColors = new Float32Array(asteroidCount * 3);
    const colorA = new THREE.Color(0x8899aa); // Greyish ice
    const colorB = new THREE.Color(0xaa8877); // Brownish dust
    
    for(let i = 0; i < asteroidCount; i++) {
      // Neptune is at 95, so Kuiper belt starts around 110 and goes to 160
      const r = 110 + Math.pow(Math.random(), 1.5) * 50;
      const theta = Math.random() * 2 * Math.PI;
      // Slight vertical spread, thicker in the middle
      const y = (Math.random() - 0.5) * (Math.random() * 10);
      
      kuiperPos[i*3] = r * Math.cos(theta);
      kuiperPos[i*3+1] = y;
      kuiperPos[i*3+2] = r * Math.sin(theta);
      
      const mixedColor = colorA.clone().lerp(colorB, Math.random());
      kuiperColors[i*3] = mixedColor.r;
      kuiperColors[i*3+1] = mixedColor.g;
      kuiperColors[i*3+2] = mixedColor.b;
    }
    
    kuiperGeo.setAttribute('position', new THREE.BufferAttribute(kuiperPos, 3));
    kuiperGeo.setAttribute('color', new THREE.BufferAttribute(kuiperColors, 3));
    
    const kuiperMat = new THREE.PointsMaterial({ 
      size: 0.2, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.5,
      sizeAttenuation: true
    });
    
    const kuiperBelt = new THREE.Points(kuiperGeo, kuiperMat);
    scene.add(kuiperBelt);

    // NEBULA BACKGROUND
    const uNebSeed = new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100);
    const nebulaSphere = new THREE.Mesh(
      new THREE.SphereGeometry(180, 32, 24),
      new THREE.ShaderMaterial({
        vertexShader: nebulaVertexShader,
        fragmentShader: nebulaFragmentShader,
        uniforms: {
          uNebSeed: { value: uNebSeed },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    nebulaSphere.renderOrder = -1;
    scene.add(nebulaSphere);

    // STARS BACKGROUND
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(1500 * 3);
    for(let i=0; i<1500; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      starsPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      starsPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      starsPos[i*3+2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.2, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // RESIZE
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    // GSAP TIMELINE SETUP (The Scroll Journey)
    // We animate a single 'progress' value. In the render loop, we calculate exact positions
    // so the camera tracks moving planets flawlessly.
    const tl = gsap.timeline({ paused: true });
    timelineRef.current = tl;

    const totalStops = planetData.length + 1; // Sun + 7 Planets = 8 (indices 0 to 7), plus index 8 for Cluster View
    for (let i = 0; i < totalStops; i++) {
      // 2 seconds per journey leg
      tl.to(journeyProxy.current, { progress: i + 1, ease: 'power2.inOut', duration: 2 });
    }

    // Dynamic stop calculator
    const getStop = (index: number) => {
      const isMobile = window.innerWidth <= 768;
      
      if (index <= 0) {
        // Base view near the sun. We use camPosProxy so the initial Ignition pull-back animation works.
        return { 
          pos: new THREE.Vector3(camPosProxy.current.x, camPosProxy.current.y, camPosProxy.current.z), 
          look: new THREE.Vector3(camLookProxy.current.x, camLookProxy.current.y, camLookProxy.current.z) 
        };
      } else if (index <= planetData.length) {
        // We visit planets in order. planetData is an array of length 7.
        const p = planetData[index - 1];
        const planetPos = p.mesh.position.clone();
        
        // Sun is at (0,0,0). Direction FROM planet TO sun:
        const dirToSun = planetPos.clone().normalize().negate();
        // Right vector relative to the orbit plane
        const right = new THREE.Vector3(0, 1, 0).cross(dirToSun).normalize();
        
        // 80% lit, 20% shadow: mostly facing sunward, slightly offset to right and up.
        // We look at the planet from this offset direction.
        const offsetDir = dirToSun.clone().multiplyScalar(0.75).add(right.multiplyScalar(0.6)).add(new THREE.Vector3(0, 0.4, 0)).normalize();
        
        // Scale distance by planet radius to fit perfectly
        const dist = isMobile ? Math.max(3.0, p.radius * 6) : Math.max(2.2, p.radius * 2.0); // 2.0 makes desktop planets significantly larger
        let pos = planetPos.clone().add(offsetDir.multiplyScalar(dist));
        let look = planetPos.clone();
        
        let forward = look.clone().sub(pos).normalize();
        let camRight = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
        let camUp = camRight.clone().cross(forward).normalize();
        
        if (isMobile) {
          // On mobile, pan the camera up or down vertically to shift the planet
          const isOddStep = index % 2 !== 0;
          const shiftAmount = dist * 0.25; // Pan amount relative to distance
          
          if (isOddStep) {
            // Text is TOP, planet should be BOTTOM -> Pan camera UP
            pos.add(camUp.clone().multiplyScalar(shiftAmount));
            look.add(camUp.clone().multiplyScalar(shiftAmount));
          } else {
            // Text is BOTTOM, planet should be TOP -> Pan camera DOWN
            pos.sub(camUp.clone().multiplyScalar(shiftAmount));
            look.sub(camUp.clone().multiplyScalar(shiftAmount));
          }
        } else {
          // On desktop, shift the camera left or right so the planet moves to the opposite side of the screen
          const isOddStep = index % 2 !== 0;
          // Shift amount scales with distance so it visually moves the planet across the screen
          const shiftAmount = dist * 0.3; // 0.3 keeps it nicely balanced
          
          if (isOddStep) {
            // Text is left, planet should be right -> pan camera left
            pos.sub(camRight.clone().multiplyScalar(shiftAmount));
            look.sub(camRight.clone().multiplyScalar(shiftAmount));
          } else {
            // Text is right, planet should be left -> pan camera right
            pos.add(camRight.clone().multiplyScalar(shiftAmount));
            look.add(camRight.clone().multiplyScalar(shiftAmount));
          }
        }
        
        return { pos, look };
      } else {
        // Final Cluster View (beyond Neptune)
        // Bring camera much closer so the inner system (Sun, Earth, Mars) 
        // fills the screen effectively as in the reference image.
        let pos = new THREE.Vector3(35, 12, 35);
        let look = new THREE.Vector3(0, 0, 0);
        
        if (isMobile) {
          // Look slightly above the cluster center so it renders lower on the screen (making room for text at the top)
          look.y += 18;
        } else {
          // Keep the cluster perfectly centered vertically on desktop
          look.y -= 0; 
        }
        
        return { pos, look };
      }
    };

    // RENDER LOOP
    let raf = 0;
    const render = (time: number) => {
      const t = time * 0.001;
      
      // Update sun shader
      sunUniformsRef.current.time.value = t;
      sun.rotation.y = t * 0.05;
      corona.scale.setScalar(1 + Math.sin(t * 2) * 0.03);

      // Rotate planets
      planetData.forEach((p) => {
        // Only rotate if ignited, or slowly if not
        const speed = isIgnited ? p.speed : p.speed * 0.1;
        p.currentAngle -= speed * 0.003;
        p.mesh.position.set(
          Math.cos(p.currentAngle) * p.orbit,
          0,
          Math.sin(p.currentAngle) * p.orbit
        );
        p.mesh.rotation.y += 0.002;
        
        // Animate Jupiter rings if they exist
        if (p.mesh.userData.rings) {
          // Rotate in the same direction as the planet, but faster
          p.mesh.userData.rings.rotation.y += 0.004;
        }
        
        p.uniforms.time.value = t * 0.3;
      });
      
      kuiperBelt.rotation.y = t * 0.003; // slow rotation for the belt
      stars.rotation.y = t * 0.01;

      // Update camera using journey progress
      const prog = journeyProxy.current.progress;
      const i = Math.floor(prog);
      const f = prog - i; // fractional part for lerp (GSAP easing already applied to 'prog')
      
      const stopA = getStop(i);
      const stopB = getStop(i + 1);
      
      // Interpolate position
      camera.position.copy(stopA.pos).lerp(stopB.pos, f);
      
      // Interpolate lookAt
      const currentLook = stopA.look.clone().lerp(stopB.look, f);
      camera.lookAt(currentLook);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [isIgnited]);

  // Handle Ignition Animation
  useEffect(() => {
    if (isIgnited) {
      // Ignite animation: sun gets intensely bright, then calms down, and camera pulls slightly back to unlock the scroll journey
      gsap.to(sunUniformsRef.current.intensity, {
        value: 1.5,
        duration: 0.5,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          gsap.to(sunUniformsRef.current.intensity, { value: 0.8, duration: 1 });
          onIgniteComplete();
        }
      });
      
      // Initial pull back
      gsap.to(camPosProxy.current, {
        z: 15,
        y: 5,
        duration: 2,
        ease: 'power3.out'
      });
    }
  }, [isIgnited, onIgniteComplete]);

  // Handle Step Sync
  useEffect(() => {
    gsap.to(journeyProxy.current, {
      progress: targetStep,
      duration: 1.5,
      ease: 'power2.inOut',
      overwrite: true
    });
  }, [targetStep]);

  return (
    <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
  );
}
