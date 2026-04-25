import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { getDeviceTier, shouldRenderNebula, getExosphereLOD } from '../../utils/device-tier.js';
import type { ExosphereLOD } from '../../utils/device-tier.js';
import type { Planet, Star, StarSystem, Moon } from '@nebulife/core';
import { SeededRNG } from '@nebulife/core';
import {
  derivePlanetVisuals,
  planetVisualsToUniforms,
  getAtmosphereParams,
  getCloudParams,
  getMoonColors,
  STAR_SPRITE_POSITION,
} from '../../game/rendering/PlanetVisuals.js';

// GLSL shader imports (Vite ?raw)
import planetVertSrc from '../../shaders/planet/planet.vert.glsl?raw';
import rockySurfaceFrag from '../../shaders/planet/rocky-surface.frag.glsl?raw';
import gasGiantFrag from '../../shaders/planet/gas-giant.frag.glsl?raw';
import atmosphereFrag from '../../shaders/planet/atmosphere.frag.glsl?raw';
import cloudLayerFrag from '../../shaders/planet/cloud-layer.frag.glsl?raw';
import ringVertSrc from '../../shaders/planet/ring.vert.glsl?raw';
import ringFrag from '../../shaders/planet/ring.frag.glsl?raw';
import moonSurfaceFrag from '../../shaders/planet/moon-surface.frag.glsl?raw';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanetGlobeViewHandle {
  zoomIn(): void;
  zoomOut(): void;
  resetCamera(): void;
  startScanning(): void;
  stopScanning(): void;
  updateScanProgress(progress: number): void;
  startShipApproach(): void;
  isShipOnOrbit(): boolean;
  stopShipFlight(): void;
  /** Spin up + zoom in over 2s, then call onComplete */
  spinAndZoom(onComplete: () => void): void;
}

interface PlanetGlobeViewProps {
  planet: Planet;
  star: Star;
  system: StarSystem;
  mode: 'home' | 'planet-view';
  onDoubleClick?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCAN_GREEN = 0x44ffaa;
const LIDAR_GREEN = 0x44ff88;
const HUD_BLUE = 0x4488aa;
const SHIP_BLUE = 0x4488ff;
const DEEP_SPACE = 0x020510;

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

// Star vertex shader: per-vertex size, perspective scaling, pass varyings
const STAR_VERT = `
  attribute float size;
  attribute float brightness;
  attribute float twinkleSpeed;
  attribute float twinklePhase;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTwinkleSpeed;
  varying float vTwinklePhase;
  void main() {
    vColor = color;
    vBrightness = brightness;
    vTwinkleSpeed = twinkleSpeed;
    vTwinklePhase = twinklePhase;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (280.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

// Star fragment shader: radial glow + core, GPU twinkling
const STAR_FRAG = `
  uniform float uTime;
  varying vec3 vColor;
  varying float vBrightness;
  varying float vTwinkleSpeed;
  varying float vTwinklePhase;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    // Sharp bright core
    float core = exp(-d * d * 10.0);
    // Soft glow halo
    float glow = exp(-d * d * 2.5) * 0.35;
    float shape = core + glow;
    // GPU twinkling: slow smooth fade
    float twinkle = 0.82 + 0.18 * sin(uTime * vTwinkleSpeed + vTwinklePhase);
    float alpha = shape * vBrightness * twinkle;
    vec3 col = vColor * (core * 1.2 + glow * 0.8);
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Spectral color from a 0-1 roll (HR diagram distribution) */
function spectralColor(roll: number, rng: SeededRNG): [number, number, number, number] {
  // Returns [r, g, b, sizeBias] — bluer stars are bigger
  if (roll < 0.40) // M-type red dwarfs (most common, smallest)
    return [1.0, 0.72 + rng.next() * 0.08, 0.50 + rng.next() * 0.1, 0.0];
  if (roll < 0.60) // K-type orange
    return [1.0, 0.85 + rng.next() * 0.05, 0.68 + rng.next() * 0.08, 0.15];
  if (roll < 0.75) // G-type sun-like
    return [1.0, 0.95 + rng.next() * 0.05, 0.85 + rng.next() * 0.1, 0.3];
  if (roll < 0.85) // F-type white
    return [0.95 + rng.next() * 0.05, 0.95 + rng.next() * 0.05, 1.0, 0.5];
  if (roll < 0.95) // A-type blue-white
    return [0.78 + rng.next() * 0.07, 0.85 + rng.next() * 0.05, 1.0, 0.7];
  // B/O-type hot blue (rare, brightest)
  return [0.62 + rng.next() * 0.08, 0.72 + rng.next() * 0.08, 1.0, 1.0];
}

function createStarfield(scene: THREE.Scene, systemSeed: number, lod: ExosphereLOD): {
  points: THREE.Points;
  twinkleIndices: number[];
  baseSizes: Float32Array;
  timeUniform: { value: number };
  twinkleEnabled: boolean;
} {
  const rng = new SeededRNG(systemSeed * 7333 + 41);
  // --- Star counts ---
  // Scaled by lod.starfieldDensity: 1.0 = full (~10 500 stars total),
  // 0.6 on mid, 0.4 on low. Even at 0.4 the sky still looks full — the
  // human eye can't tell the difference between 10K and 4K procedural
  // points that densely overlap a seamless background sphere.
  const density = lod.starfieldDensity;
  const bgCount = Math.round(8000 * density);     // tiny dust (denser background)
  const medCount = Math.round(1200 * density);    // medium
  const brightCount = Math.round(200 * density);  // bright prominent
  const clusterCount = Math.max(2, Math.round(8 * density));   // cluster regions
  const clusterStarsEach = Math.round(80 * density);
  const milkyWayCount = Math.round(1000 * density); // Milky Way band
  const totalCount = bgCount + medCount + brightCount
    + clusterCount * clusterStarsEach + milkyWayCount;

  const positions = new Float32Array(totalCount * 3);
  const sizes = new Float32Array(totalCount);
  const colors = new Float32Array(totalCount * 3);
  const brightness = new Float32Array(totalCount);
  const twinkleSpeed = new Float32Array(totalCount);
  const twinklePhase = new Float32Array(totalCount);

  let idx = 0;

  function addStar(
    theta: number, phi: number, r: number,
    sz: number, cr: number, cg: number, cb: number, bright: number,
  ) {
    const i3 = idx * 3;
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
    sizes[idx] = sz;
    colors[i3] = cr; colors[i3 + 1] = cg; colors[i3 + 2] = cb;
    brightness[idx] = bright;
    // Dim stars twinkle more, bright stars are stable
    twinkleSpeed[idx] = 0.4 + rng.next() * 1.8 * (1.0 - bright * 0.5);
    twinklePhase[idx] = rng.next() * Math.PI * 2;
    idx++;
  }

  // 1. Background dust (tiny, dim)
  for (let i = 0; i < bgCount; i++) {
    const theta = rng.next() * Math.PI * 2;
    const phi = Math.acos(2 * rng.next() - 1);
    const r = 55 + rng.next() * 45;
    const sz = 0.12 + rng.next() * 0.25;
    const [cr, cg, cb] = spectralColor(rng.next(), rng);
    addStar(theta, phi, r, sz, cr, cg, cb, 0.30 + rng.next() * 0.35);
  }

  // 2. Medium stars (varied sizes, visible colors)
  for (let i = 0; i < medCount; i++) {
    const theta = rng.next() * Math.PI * 2;
    const phi = Math.acos(2 * rng.next() - 1);
    const r = 50 + rng.next() * 50;
    const roll = rng.next();
    const [cr, cg, cb, sizeBias] = spectralColor(roll, rng);
    const sz = 0.5 + sizeBias * 1.0 + rng.next() * 0.6;
    addStar(theta, phi, r, sz, cr, cg, cb, 0.45 + rng.next() * 0.35);
  }

  // 3. Bright prominent stars (power-law sizes)
  for (let i = 0; i < brightCount; i++) {
    const theta = rng.next() * Math.PI * 2;
    const phi = Math.acos(2 * rng.next() - 1);
    const r = 50 + rng.next() * 40;
    const roll = 0.5 + rng.next() * 0.5; // bias toward hotter types
    const [cr, cg, cb, sizeBias] = spectralColor(roll, rng);
    const sz = 1.2 + sizeBias * 2.5 + rng.next() * 1.0;
    addStar(theta, phi, r, sz, cr, cg, cb, 0.6 + rng.next() * 0.4);
  }

  // 4. Star clusters (Gaussian clumps)
  for (let cl = 0; cl < clusterCount; cl++) {
    const cTheta = rng.next() * Math.PI * 2;
    const cPhi = Math.acos(2 * rng.next() - 1);
    const cR = 60 + rng.next() * 30;
    const sigma = (0.03 + rng.next() * 0.06); // angular spread (radians)

    for (let s = 0; s < clusterStarsEach; s++) {
      // Gaussian scatter around cluster center
      const dTheta = (rng.next() + rng.next() + rng.next() - 1.5) * sigma * 2;
      const dPhi = (rng.next() + rng.next() + rng.next() - 1.5) * sigma * 2;
      const theta = cTheta + dTheta;
      const phi = cPhi + dPhi;
      const r = cR + (rng.next() - 0.5) * 8;
      const sz = 0.15 + rng.next() * 0.5;
      const [cr, cg, cb] = spectralColor(rng.next(), rng);
      addStar(theta, phi, r, sz, cr, cg, cb, 0.25 + rng.next() * 0.4);
    }
  }

  // 5. Milky Way band (dense strip along a great circle)
  const mwTilt = 0.4 + rng.next() * 0.3; // tilt angle
  for (let i = 0; i < milkyWayCount; i++) {
    const along = rng.next() * Math.PI * 2;
    // Gaussian scatter from band center
    const spread = (rng.next() + rng.next() - 1.0) * 0.15;
    const theta = along;
    const phi = Math.PI / 2 + spread + Math.sin(along * 2) * mwTilt;
    const r = 60 + rng.next() * 35;
    const sz = 0.1 + rng.next() * 0.2;
    const [cr, cg, cb] = spectralColor(rng.next(), rng);
    addStar(theta, phi, r, sz, cr, cg, cb, 0.12 + rng.next() * 0.2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('brightness', new THREE.BufferAttribute(brightness, 1));
  geo.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeed, 1));
  geo.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhase, 1));

  const timeUniform = { value: 0 };

  const mat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: { uTime: timeUniform },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // --- Cosmic nebula glow sphere (unresolved star clusters + spectral gradients) ---
  // Skipped on low/mid-tier devices — the fragment shader is 4-octave FBM
  // + domain warp, rendered on a 98-radius sphere (32×24 segs). On weak
  // GPUs this is the single biggest frame-time hit at exosphere level.
  // Starfield stays; only the volumetric glow is dropped.
  if (!shouldRenderNebula()) {
    return { points, twinkleIndices: [], baseSizes: sizes, timeUniform, twinkleEnabled: lod.starfieldTwinkle };
  }

  // Use system seed for unique nebula per system
  const seedHash = ((systemSeed * 2654435761) >>> 0) / 4294967296; // Knuth hash → 0-1
  const nebSeedX = seedHash * 500;
  const nebSeedY = ((systemSeed * 1597334677) >>> 0) / 4294967296 * 500;
  const nebSeedZ = ((systemSeed * 789456123) >>> 0) / 4294967296 * 500;
  const nebulaVert = `
    varying vec3 vPos;
    void main() {
      vPos = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const nebulaFrag = `
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
      float density = smoothstep(0.38, 0.62, cluster1) * 0.5
                    + smoothstep(0.42, 0.65, cluster2) * 0.3
                    + smoothstep(0.45, 0.68, cluster3) * 0.2;
      // Milky Way band (bright stripe, warped)
      float bandPos = n.y * 0.8 + n.x * 0.3 + fbm4(n * 3.0 + s + vec3(600.0)) * 0.12 - 0.1;
      float band = 1.0 - smoothstep(0.0, 0.22, abs(bandPos));
      density += band * 0.4;
      // Spectral color patches (each at different spatial frequency)
      float warm   = fbm4(wn * 4.0 + s + vec3(300.0));
      float cool   = fbm4(wn * 4.0 + s + vec3(400.0));
      float pink   = fbm4(wn * 5.0 + s + vec3(500.0));
      float teal   = fbm4(wn * 3.5 + s + vec3(700.0));
      float violet = fbm4(wn * 6.0 + s + vec3(800.0));
      float gold   = fbm4(wn * 4.5 + s + vec3(900.0));
      // Base: deep space blue-black
      vec3 col = vec3(0.015, 0.02, 0.045);
      // Warm emission nebula (amber-orange)
      col += vec3(0.14, 0.05, 0.01) * smoothstep(0.55, 0.72, warm) * density;
      // Cool reflection nebula (deep blue)
      col += vec3(0.02, 0.05, 0.14) * smoothstep(0.50, 0.68, cool) * density;
      // H-alpha pink/magenta regions
      col += vec3(0.10, 0.015, 0.08) * smoothstep(0.58, 0.76, pink) * density;
      // Teal/cyan OIII emission
      col += vec3(0.01, 0.09, 0.10) * smoothstep(0.56, 0.73, teal) * density;
      // Violet/purple interstellar medium
      col += vec3(0.06, 0.01, 0.12) * smoothstep(0.60, 0.78, violet) * density;
      // Golden stellar nursery glow
      col += vec3(0.10, 0.08, 0.02) * smoothstep(0.58, 0.75, gold) * density * band;
      // White unresolved starlight
      col += vec3(0.05, 0.05, 0.06) * density;
      // Subtle — background atmosphere feel
      float alpha = clamp(density * 0.22 + 0.02, 0.0, 0.18);
      gl_FragColor = vec4(col, alpha);
    }
  `;
  const nebulaSphere = new THREE.Mesh(
    new THREE.SphereGeometry(98, 32, 24),
    new THREE.ShaderMaterial({
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      uniforms: { uNebSeed: { value: new THREE.Vector3(nebSeedX, nebSeedY, nebSeedZ) } },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  nebulaSphere.renderOrder = -1;
  scene.add(nebulaSphere);

  return { points, twinkleIndices: [], baseSizes: sizes, timeUniform, twinkleEnabled: lod.starfieldTwinkle };
}

// ---------------------------------------------------------------------------
// Distant star (billboard)
// ---------------------------------------------------------------------------

/** Build a soft radial-gradient canvas texture for star sprites */
function makeStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0,    'rgba(255,255,255,1.0)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.6,  'rgba(255,255,255,0.2)');
  grad.addColorStop(1.0,  'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createDistantStar(
  scene: THREE.Scene,
  star: Star,
  planet: Planet,
): THREE.Group {
  const group = new THREE.Group();

  const distAU = planet.orbit.semiMajorAxisAU;
  // Angular size: how big the star looks from the planet (in solar-radii / AU)
  const angularSize = star.radiusSolar / distAU;
  // Brightness falloff: luminosity^0.25 / sqrt(distance)
  const brightness = Math.pow(star.luminositySolar, 0.25) / Math.sqrt(distAU);
  // Combined metric — heavily weighted towards angular size for dramatic difference
  const raw = angularSize * 0.7 + brightness * 0.3;
  // Wide range: close orbits (0.05 AU) → huge star, far orbits (30+ AU) → barely visible dot
  const coreSize = Math.max(0.15, Math.min(8.0, raw * 1.8));

  // Dim core & halo for distant/faint stars
  const coreOpacity = Math.max(0.25, Math.min(0.85, brightness * 0.65));
  const haloOpacity = Math.max(0.02, Math.min(0.10, brightness * 0.08));

  const starColor = new THREE.Color(star.colorHex);
  const starTex = makeStarTexture();

  // Core glow sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: starTex,
    color: starColor,
    transparent: true,
    opacity: coreOpacity,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.setScalar(coreSize);
  group.add(sprite);

  // Halo
  const haloMat = new THREE.SpriteMaterial({
    map: starTex,
    color: starColor,
    transparent: true,
    opacity: haloOpacity,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(coreSize * 2.2);
  group.add(halo);

  // Position: top-left area of the sky (synced with STAR_SPRITE_POSITION)
  group.position.copy(STAR_SPRITE_POSITION);

  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Planet sphere
// ---------------------------------------------------------------------------

function createPlanetSphere(
  scene: THREE.Scene,
  planet: Planet,
  star: Star,
  lod: ExosphereLOD,
): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const visuals = derivePlanetVisuals(planet, star);
  const uniforms = planetVisualsToUniforms(visuals, planet, star);

  const isGas = planet.type === 'gas-giant' || planet.type === 'ice-giant';
  const fragShader = isGas ? gasGiantFrag : rockySurfaceFrag;

  // 192×192 → ~74K triangles; low tier drops to 48 (~2.4K), mid to 96 (~18K).
  // Silhouette is still smooth at 48 because the planet occupies < 40 % of
  // viewport height and most users never zoom past 2×.
  const segs = lod.planetSegments;
  const geometry = new THREE.SphereGeometry(1, segs, segs);
  const material = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: fragShader,
    uniforms,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Visual size factor based on the planet's actual radius. Sphere geometry
  // stays unit-radius; we just scale the mesh — cheap, no re-render of geometry.
  // Buckets: dwarf (<0.5 R⊕) → 0.55, small (0.5-1 R⊕) → 0.75,
  //          medium (1-1.5 R⊕) → 0.95, large (≥1.5 R⊕) → 1.15.
  mesh.scale.setScalar(planetVisualScale(planet));
  scene.add(mesh);

  return { mesh, uniforms };
}

/** Visual radius multiplier for the planet sphere + atmosphere + cloud meshes.
 *  Uses planet.radiusEarth bucketed into 4 perceptually-distinct sizes so a
 *  dwarf planet doesn't look identical to a super-Earth. */
function planetVisualScale(planet: Planet): number {
  const r = planet.radiusEarth ?? 1;
  if (r < 0.5) return 0.55;
  if (r < 1.0) return 0.75;
  if (r < 1.5) return 0.95;
  return 1.15;
}

// ---------------------------------------------------------------------------
// Cloud layer
// ---------------------------------------------------------------------------

function createCloudLayer(
  scene: THREE.Scene,
  planet: Planet,
  lod: ExosphereLOD,
): { mesh: THREE.Mesh; uniform: THREE.IUniform } | null {
  // Cloud layer is one of the biggest overdraw sources — it's a full
  // separate shader sphere sitting a hair above the planet surface. Drop
  // it entirely on low tier; mid/high still get animated clouds.
  if (!lod.renderClouds) return null;
  if (!planet.atmosphere) return null;
  const params = getCloudParams(planet.atmosphere, planet.type);
  if (!params) return null;

  const segs = lod.cloudSegments;
  // Cloud + atmosphere shells must follow the same visual scale as the planet
  // sphere; otherwise a small dwarf planet would have a giant atmosphere.
  const sizeFactor = planetVisualScale(planet);
  const geometry = new THREE.SphereGeometry(params.scale * sizeFactor, segs, segs);
  const timeUniform = { value: 0.0 };
  const material = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: cloudLayerFrag,
    uniforms: {
      uCloudColor: { value: params.color },
      uCoverage: { value: params.coverage },
      uTime: timeUniform,
      uSeed: { value: planet.seed },
      uStarDir: { value: STAR_SPRITE_POSITION.clone().normalize().negate() },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return { mesh, uniform: timeUniform };
}

// ---------------------------------------------------------------------------
// Atmosphere
// ---------------------------------------------------------------------------

function createAtmosphereShell(
  scene: THREE.Scene,
  planet: Planet,
  star: Star,
  lod: ExosphereLOD,
): { front: THREE.Mesh; back: THREE.Mesh | null; uniforms: Record<string, THREE.IUniform> } | null {
  if (!planet.atmosphere) return null;
  const params = getAtmosphereParams(planet.atmosphere, planet.type);
  if (!params) return null;

  const starDir = STAR_SPRITE_POSITION.clone().normalize().negate();
  const pressure = planet.atmosphere.surfacePressureAtm;

  const sharedUniforms: Record<string, THREE.IUniform> = {
    uColor: { value: params.color },
    uIntensity: { value: params.intensity },
    uPower: { value: params.power },
    uStarDir: { value: starDir },
    uPressure: { value: Math.min(pressure, 100) },
  };

  const atmSegs = lod.atmosphereSegments;

  // Match the planet sphere size so the glow shell wraps tight, not loose.
  const atmSizeFactor = planetVisualScale(planet);
  // --- Front-facing atmosphere (primary glow, visible from day side) ---
  const geoFront = new THREE.SphereGeometry(params.scale * atmSizeFactor, atmSegs, atmSegs);
  const matFront = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: atmosphereFrag,
    uniforms: sharedUniforms,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const front = new THREE.Mesh(geoFront, matFront);
  scene.add(front);

  // --- Back-facing atmosphere (haze ring visible behind planet silhouette) ---
  // Low-tier skips this entirely — loses the soft rim-glow behind the
  // planet silhouette but saves a full-sphere additive blend pass. The
  // front atmosphere alone still reads as "has an atmosphere".
  let back: THREE.Mesh | null = null;
  if (lod.renderAtmosphereBack) {
    const geoBack = new THREE.SphereGeometry(params.scale * 1.008 * atmSizeFactor, atmSegs, atmSegs);
    const matBack = new THREE.ShaderMaterial({
      vertexShader: planetVertSrc,
      fragmentShader: atmosphereFrag,
      uniforms: {
        ...sharedUniforms,
        uIntensity: { value: params.intensity * 0.35 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    back = new THREE.Mesh(geoBack, matBack);
    scene.add(back);
  }

  return { front, back, uniforms: sharedUniforms };
}

// ---------------------------------------------------------------------------
// Ring (gas giants)
// ---------------------------------------------------------------------------

function createRing(
  scene: THREE.Scene,
  planet: Planet,
  lod: ExosphereLOD,
): THREE.Mesh | null {
  // Ring is optional "wow" detail. Skip on low tier — weak GPUs struggle
  // with the transparent ring shader's fragment pass on top of the planet.
  if (!lod.renderRing) return null;

  const isGas = planet.type === 'gas-giant';
  const isIce = planet.type === 'ice-giant';
  // Only gas/ice giants with significant mass get rings
  if (!isGas && !isIce) return null;
  if (planet.massEarth < 15) return null;

  const innerR = 1.2;
  const outerR = 2.2;
  const geometry = new THREE.RingGeometry(innerR, outerR, lod.ringSegments, 4);
  const material = new THREE.ShaderMaterial({
    vertexShader: ringVertSrc,
    fragmentShader: ringFrag,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Tilt ring ~27 degrees (Saturn-like)
  mesh.rotation.x = -Math.PI / 2 + 0.47;
  scene.add(mesh);

  return mesh;
}

// ---------------------------------------------------------------------------
// Moons
// ---------------------------------------------------------------------------

interface MoonOrbitData {
  mesh: THREE.Mesh;
  angle: number;
  orbitRadius: number;
  eccentricityY: number;
  angularSpeed: number;
  starDir: THREE.Vector3;
  inclination: number;
  ascendingNode: number;
}

function createMoons(
  scene: THREE.Scene,
  planet: Planet,
  star: Star,
  lod: ExosphereLOD,
): MoonOrbitData[] {
  const moons = planet.moons;
  if (!moons || moons.length === 0) return [];

  const result: MoonOrbitData[] = [];
  const planetRadiusKm = planet.radiusEarth * 6371;
  const maxOrbitalKm = Math.max(...moons.map(m => m.orbitalRadiusKm));
  const starDir = STAR_SPRITE_POSITION.clone().normalize();

  for (let i = 0; i < moons.length; i++) {
    const moon = moons[i];

    // Visual radius relative to planet (clamped)
    const rawR = moon.radiusKm / planetRadiusKm;
    const moonR = Math.max(0.06, Math.min(0.35, rawR));

    // Orbit radius in scene units — far enough to clear rings (outerR=2.2)
    const normDist = maxOrbitalKm > 0 ? moon.orbitalRadiusKm / maxOrbitalKm : 0.5;
    const minOrbit = 2.8;
    const maxOrbit = 6.0;
    const orbitRadius = minOrbit + normDist * (maxOrbit - minOrbit);

    // Angular speed from orbital period (slow, realistic)
    const angularSpeed = (2 * Math.PI) / (moon.orbitalPeriodDays * 360000);

    // Starting angle + orbital parameters from seed
    const rng = new SeededRNG(moon.seed);
    const startAngle = rng.next() * Math.PI * 2;
    const eccentricityY = 0.05 + rng.next() * 0.15;
    const inclination = 0.1 + rng.next() * 0.4;
    const ascendingNode = rng.next() * Math.PI * 2;

    // Moon colors
    const { base, high } = getMoonColors(moon.compositionType, moon.surfaceTempK);

    const geometry = new THREE.SphereGeometry(moonR, lod.moonSegments, lod.moonSegments);
    // Low tier uses plain Lambert-like flat material — saves a shader program
    // compile + per-moon uniform updates. We average base/high for the tint.
    let material: THREE.Material;
    if (lod.moonsFlatShaded) {
      const tint = new THREE.Color(
        (base.r + high.r) * 0.5,
        (base.g + high.g) * 0.5,
        (base.b + high.b) * 0.5,
      );
      material = new THREE.MeshBasicMaterial({ color: tint });
    } else {
      material = new THREE.ShaderMaterial({
        vertexShader: planetVertSrc,
        fragmentShader: moonSurfaceFrag,
        uniforms: {
          uSeed: { value: moon.seed },
          uBaseColor: { value: base },
          uHighColor: { value: high },
          uHasCraters: { value: moon.compositionType !== 'icy' ? 1.0 : 0.5 },
          uStarDir: { value: starDir },
          uStarColor: { value: new THREE.Color(star.colorHex) },
        },
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    result.push({
      mesh,
      angle: startAngle,
      orbitRadius,
      eccentricityY,
      angularSpeed,
      starDir,
      inclination,
      ascendingNode,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Scanning overlay (Three.js line objects)
// ---------------------------------------------------------------------------

interface ScanOverlay {
  group: THREE.Group;
  time: number;
  progress: number;
}

function createScanOverlay(scene: THREE.Scene): ScanOverlay {
  const group = new THREE.Group();
  scene.add(group);
  return { group, time: 0, progress: 0 };
}

function updateScanOverlayVisuals(scan: ScanOverlay) {
  // Clear previous frame
  while (scan.group.children.length > 0) {
    const child = scan.group.children[0];
    scan.group.remove(child);
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
    }
  }

  const t = scan.time;
  const R = 1.02; // slightly above planet surface

  // --- Wireframe grid (latitude + longitude lines) ---
  const gridMat = new THREE.LineBasicMaterial({
    color: SCAN_GREEN,
    transparent: true,
    opacity: 0.2,
  });

  // Latitude circles
  const scanCycle = (t * 0.0004) % Math.PI;
  const scanLat = Math.PI / 2 - scanCycle;

  for (let i = 0; i < 5; i++) {
    const lat = -Math.PI / 2 + (Math.PI / 6) * (i + 1);
    const y = R * Math.sin(lat);
    const cr = R * Math.cos(lat);
    if (cr < 0.01) continue;

    const dist = Math.abs(lat - scanLat);
    const alpha = dist < 0.3 ? 0.35 + (0.3 - dist) * 1.0 : 0.15;

    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 64; j++) {
      const a = (j / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * cr, y, Math.sin(a) * cr));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: SCAN_GREEN, transparent: true, opacity: alpha });
    scan.group.add(new THREE.Line(geo, mat));
  }

  // Longitude ellipses (slowly rotating)
  const lonRot = t * 0.0003;
  for (let i = 0; i < 6; i++) {
    const lon = (Math.PI / 6) * i + lonRot;
    const sinLon = Math.sin(lon);
    if (Math.abs(sinLon) < 0.05) continue;
    const alpha = 0.2 * Math.abs(sinLon);

    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 32; j++) {
      const phi = -Math.PI / 2 + (Math.PI / 32) * j;
      pts.push(new THREE.Vector3(
        R * Math.cos(phi) * sinLon,
        R * Math.sin(phi),
        R * Math.cos(phi) * Math.cos(lon),
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: SCAN_GREEN, transparent: true, opacity: alpha });
    scan.group.add(new THREE.Line(geo, mat));
  }

  // Scanning latitude highlight
  const scanY = R * Math.sin(scanLat);
  const scanR = R * Math.cos(scanLat);
  if (scanR > 0.01) {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 64; j++) {
      const a = (j / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * scanR, scanY, Math.sin(a) * scanR));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x88ffcc, transparent: true, opacity: 0.6 });
    scan.group.add(new THREE.Line(geo, mat));
  }

  // --- Lidar beam sweep ---
  const beamAngle = t * 0.0015;
  const bx = Math.cos(beamAngle) * R;
  const bz = Math.sin(beamAngle) * R;
  {
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(bx, 0, bz)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: LIDAR_GREEN, transparent: true, opacity: 0.5 });
    scan.group.add(new THREE.Line(geo, mat));
  }

  // Lidar trail arc
  const trailPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = beamAngle - (Math.PI / 3 / 12) * i;
    trailPts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
  }
  {
    const geo = new THREE.BufferGeometry().setFromPoints(trailPts);
    const mat = new THREE.LineBasicMaterial({ color: LIDAR_GREEN, transparent: true, opacity: 0.12 });
    scan.group.add(new THREE.Line(geo, mat));
  }

  // --- HUD rings ---
  const drawSegmentedRing = (radius: number, segments: number, rotation: number, color: number, opacity: number) => {
    const gap = 0.03;
    const segAngle = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
      const start = segAngle * i + rotation;
      const end = start + segAngle - gap;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 4; j++) {
        const a = start + ((end - start) / 4) * j;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      scan.group.add(new THREE.Line(geo, mat));
    }
  };

  drawSegmentedRing(1.15, 24, t * 0.0002, HUD_BLUE, 0.25);
  drawSegmentedRing(1.35, 36, -t * 0.00015, HUD_BLUE, 0.18);

  // --- Progress arc ---
  if (scan.progress > 0) {
    const arcR = 1.5;
    const totalAngle = (scan.progress / 100) * Math.PI * 2;
    const startAngle = -Math.PI / 2;
    const arcPts: THREE.Vector3[] = [];
    const steps = Math.max(8, Math.floor(totalAngle * 20));
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (totalAngle / steps) * i;
      arcPts.push(new THREE.Vector3(Math.cos(a) * arcR, 0, Math.sin(a) * arcR));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(arcPts);
    const mat = new THREE.LineBasicMaterial({ color: LIDAR_GREEN, transparent: true, opacity: 0.5 });
    scan.group.add(new THREE.Line(geo, mat));
  }
}

// ---------------------------------------------------------------------------
// Ship approach
// ---------------------------------------------------------------------------

interface ShipState {
  group: THREE.Group;
  active: boolean;
  progress: number;
  onOrbit: boolean;
  orbitAngle: number;
  trail: THREE.Vector3[];
  speed: number; // progress per ms
}

// Cached GLB for the evacuation ship. Loaded once on first PlanetGlobeView
// mount; subsequent ships clone it. Falls back to the procedural cone if
// the file is missing / still loading.
// Size: the cone placeholder was ~0.1 units tall; we normalize the GLB to
// 0.12u longest-axis so the visual footprint stays close to the original.
const DOOMSDAY_SHIP_GLB = '/arena_ships/blue_ship.glb';
const DOOMSDAY_SHIP_SIZE = 0.12;
let _doomsdayShipCache: THREE.Group | null = null;
let _doomsdayShipLoading: Promise<void> | null = null;

function preloadDoomsdayShip(): Promise<void> {
  if (_doomsdayShipCache) return Promise.resolve();
  if (_doomsdayShipLoading) return _doomsdayShipLoading;
  const loader = new GLTFLoader();
  _doomsdayShipLoading = new Promise<void>((resolve) => {
    loader.load(
      DOOMSDAY_SHIP_GLB,
      (gltf) => {
        const scene = gltf.scene;
        // Normalize scale + center so the model sits with its pivot at origin.
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const longest = Math.max(size.x, size.y, size.z);
        const factor = longest > 0.0001 ? DOOMSDAY_SHIP_SIZE / longest : 1;
        scene.scale.setScalar(factor);
        scene.position.set(-center.x * factor, -center.y * factor, -center.z * factor);
        _doomsdayShipCache = scene;
        resolve();
      },
      undefined,
      () => resolve(), // fallback to cone placeholder
    );
  });
  return _doomsdayShipLoading;
}

function cloneDoomsdayShip(): THREE.Object3D | null {
  if (!_doomsdayShipCache) return null;
  const clone = _doomsdayShipCache.clone(true);
  // Clone materials so per-frame disposal in updateShipVisuals (which wipes
  // children) doesn't free a shared material used by other ship clones.
  clone.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material) {
      obj.material = Array.isArray(obj.material)
        ? obj.material.map((m) => m.clone())
        : obj.material.clone();
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  // The Tripo export has its nose along +X; rotate so +Z is forward (the
  // direction ConeGeometry pointed). Apply via wrapper so lookAt() calls
  // in the caller still work correctly.
  const wrapper = new THREE.Group();
  clone.rotation.y = Math.PI / 2;
  wrapper.add(clone);
  return wrapper;
}

function createShipState(scene: THREE.Scene): ShipState {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  return {
    group,
    active: false,
    progress: 0,
    onOrbit: false,
    orbitAngle: 0,
    trail: [],
    speed: 0.00014,
  };
}

function updateShipVisuals(ship: ShipState, deltaMs: number) {
  if (!ship.active) {
    ship.group.visible = false;
    return;
  }
  ship.group.visible = true;

  // Clear previous frame
  while (ship.group.children.length > 0) {
    const child = ship.group.children[0];
    ship.group.remove(child);
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
    }
  }

  const orbitR = 1.6;

  if (!ship.onOrbit) {
    // Approach phase: Bezier from far away to orbit
    ship.progress = Math.min(1, ship.progress + ship.speed * deltaMs);

    const startPos = new THREE.Vector3(-5, 3, -3);
    const endPos = new THREE.Vector3(orbitR, 0, 0);
    const cp = new THREE.Vector3(0, 4, -1);

    const t = ship.progress;
    const u = 1 - t;
    const pos = new THREE.Vector3(
      u * u * startPos.x + 2 * u * t * cp.x + t * t * endPos.x,
      u * u * startPos.y + 2 * u * t * cp.y + t * t * endPos.y,
      u * u * startPos.z + 2 * u * t * cp.z + t * t * endPos.z,
    );

    // Ship body — GLB if loaded, procedural cone as fallback
    let shipMesh: THREE.Object3D;
    const glb = cloneDoomsdayShip();
    if (glb) {
      shipMesh = glb;
    } else {
      const shipGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
      const shipMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc });
      shipMesh = new THREE.Mesh(shipGeo, shipMat);
    }
    shipMesh.position.copy(pos);

    // Orient toward movement direction
    const nextT = Math.min(1, t + 0.01);
    const nextPos = new THREE.Vector3(
      (1 - nextT) * (1 - nextT) * startPos.x + 2 * (1 - nextT) * nextT * cp.x + nextT * nextT * endPos.x,
      (1 - nextT) * (1 - nextT) * startPos.y + 2 * (1 - nextT) * nextT * cp.y + nextT * nextT * endPos.y,
      (1 - nextT) * (1 - nextT) * startPos.z + 2 * (1 - nextT) * nextT * cp.z + nextT * nextT * endPos.z,
    );
    shipMesh.lookAt(nextPos);
    ship.group.add(shipMesh);

    // Engine glow
    const glowMat = new THREE.SpriteMaterial({
      color: SHIP_BLUE,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(0.08);
    glow.position.copy(pos);
    ship.group.add(glow);

    // Trail
    ship.trail.push(pos.clone());
    if (ship.trail.length > 50) ship.trail.shift();
    if (ship.trail.length > 1) {
      const trailGeo = new THREE.BufferGeometry().setFromPoints(ship.trail);
      const trailMat = new THREE.LineBasicMaterial({
        color: SHIP_BLUE,
        transparent: true,
        opacity: 0.3,
      });
      ship.group.add(new THREE.Line(trailGeo, trailMat));
    }

    if (ship.progress >= 1) {
      ship.onOrbit = true;
      ship.orbitAngle = 0;
      ship.trail = [];
    }
  } else {
    // On orbit
    ship.orbitAngle += deltaMs * 0.0005;
    const ecc = 0.35;
    const x = Math.cos(ship.orbitAngle) * orbitR;
    const y = 0;
    const z = Math.sin(ship.orbitAngle) * orbitR * ecc;

    // Ship body — GLB if loaded, procedural cone as fallback
    let shipMesh: THREE.Object3D;
    const glb = cloneDoomsdayShip();
    if (glb) {
      shipMesh = glb;
    } else {
      const shipGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
      const shipMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc });
      shipMesh = new THREE.Mesh(shipGeo, shipMat);
    }
    shipMesh.position.set(x, y, z);
    shipMesh.rotation.y = -ship.orbitAngle;
    ship.group.add(shipMesh);

    // Engine glow
    const glowMat = new THREE.SpriteMaterial({
      color: SHIP_BLUE,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(0.06);
    glow.position.set(x, y, z);
    ship.group.add(glow);

    // Orbit path (dotted)
    const orbitPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const a = (Math.PI * 2 / 60) * i;
      orbitPts.push(new THREE.Vector3(
        Math.cos(a) * orbitR,
        0,
        Math.sin(a) * orbitR * ecc,
      ));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: SHIP_BLUE,
      transparent: true,
      opacity: 0.15,
    });
    ship.group.add(new THREE.Line(orbitGeo, orbitMat));
  }
}

// ---------------------------------------------------------------------------
// Shooting star (home mode cosmic event)
// ---------------------------------------------------------------------------

interface ShootingStar {
  line: THREE.Line;
  start: THREE.Vector3;
  end: THREE.Vector3;
  elapsed: number;
  duration: number;
  maxOpacity: number; // visibility variation: subtle (0.15-0.3) or medium (0.5-0.8)
}

function spawnShootingStar(scene: THREE.Scene): ShootingStar {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 40;

  const start = new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  );

  const dir = start.clone().normalize().multiplyScalar(-1).add(
    new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
    ),
  ).normalize();

  const length = 5 + Math.random() * 10;
  const end = start.clone().add(dir.multiplyScalar(length));
  const duration = 0.4 + Math.random() * 0.8;

  // Visibility variation: 60% barely noticeable, 40% medium brightness
  const isBright = Math.random() < 0.4;
  const maxOpacity = isBright
    ? 0.5 + Math.random() * 0.3   // medium: 0.5-0.8
    : 0.12 + Math.random() * 0.18; // subtle: 0.12-0.30

  const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), start.clone()]);
  const mat = new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: maxOpacity });
  const line = new THREE.Line(geo, mat);
  scene.add(line);

  return { line, start, end, elapsed: 0, duration, maxOpacity };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PlanetGlobeView = forwardRef<PlanetGlobeViewHandle, PlanetGlobeViewProps>(
  ({ planet, star, system, mode, onDoubleClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animFrameRef = useRef<number>(0);

    // Mutable refs for imperative handle
    const scanRef = useRef<ScanOverlay | null>(null);
    const scanActiveRef = useRef(false);
    const shipRef = useRef<ShipState | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const transitionRef = useRef<{ startTime: number; startDist: number; onComplete: () => void } | null>(null);
    const onDoubleClickRef = useRef(onDoubleClick);
    onDoubleClickRef.current = onDoubleClick;

    const cleanup = useCallback(() => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.forceContextLoss();
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    }, []);

    useImperativeHandle(ref, () => ({
      zoomIn() {
        const c = controlsRef.current;
        if (c) {
          // Dolly in by reducing distance
          const dir = new THREE.Vector3();
          c.object.getWorldDirection(dir);
          c.object.position.addScaledVector(dir, 0.3);
          c.update();
        }
      },
      zoomOut() {
        const c = controlsRef.current;
        if (c) {
          const dir = new THREE.Vector3();
          c.object.getWorldDirection(dir);
          c.object.position.addScaledVector(dir, -0.3);
          c.update();
        }
      },
      resetCamera() {
        const c = controlsRef.current;
        if (c) {
          c.object.position.set(0, 0, 3);
          c.update();
        }
      },
      startScanning() {
        scanActiveRef.current = true;
        if (scanRef.current) {
          scanRef.current.time = 0;
          scanRef.current.progress = 0;
          scanRef.current.group.visible = true;
        }
      },
      stopScanning() {
        scanActiveRef.current = false;
        if (scanRef.current) {
          scanRef.current.group.visible = false;
        }
      },
      updateScanProgress(progress: number) {
        if (scanRef.current) {
          scanRef.current.progress = Math.max(0, Math.min(100, progress));
        }
      },
      startShipApproach() {
        const s = shipRef.current;
        if (s && !s.active) {
          s.active = true;
          s.progress = 0;
          s.onOrbit = false;
          s.trail = [];
          s.orbitAngle = 0;
        }
      },
      isShipOnOrbit(): boolean {
        return shipRef.current?.onOrbit ?? false;
      },
      stopShipFlight() {
        const s = shipRef.current;
        if (s) {
          s.active = false;
          s.onOrbit = false;
          s.group.visible = false;
        }
      },
      spinAndZoom(onComplete: () => void) {
        const c = controlsRef.current;
        if (!c || transitionRef.current) return;
        const dist = c.object.position.length();
        transitionRef.current = { startTime: performance.now(), startDist: dist, onComplete };
        c.enabled = false; // block user input during transition
      },
    }), []);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // --- Scene ---
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(DEEP_SPACE);
      // Subtle cosmic blue fog — fades distant stars into deep blue
      scene.fog = new THREE.FogExp2(0x030818, 0.008);

      // --- Camera ---
      const camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        200,
      );
      // Device-tier knobs: computed once, referenced below by both the
      // renderer (tone-mapping exposure) and every layer-builder.
      const lod = getExosphereLOD();

      // Camera position. On high/ultra the default sits on the Z-negative
      // side and autoRotate sweeps through the lit/dark terminator. On
      // low/mid we lock rotation (see below) — so we MUST start facing
      // the lit side or the player stares at a near-black planet forever.
      // The star sprite lives at (-10, 4, 12); camera direction mirrors
      // that to keep lit hemisphere in view.
      const tierForCamera = getDeviceTier();
      if (tierForCamera === 'low' || tierForCamera === 'mid') {
        camera.position.set(-3.76, 2.68, 5.90);
      } else {
        // Camera on the STAR side: star is at (-8, 6, -15), so camera on that side
        // Start at max zoom-out (~7.5 units = near maxDistance 8) so planet is small on entry
        camera.position.set(-3.76, 2.68, -5.90); // same direction as (-1.4, 1.0, -2.2) but at ~7.5 distance
      }

      // --- Renderer ---
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.LinearToneMapping;
      // Brighter exposure on low/mid compensates for the dropped bloom pass
      // + cloud/back-atmosphere rim-glow. Without this the planet looks
      // unnaturally dim on tiers where those layers are skipped.
      renderer.toneMappingExposure = lod.toneMappingExposure;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // --- Controls ---
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.15;
      controls.minDistance = 1.5;
      controls.maxDistance = 8;
      controls.enablePan = false;
      controlsRef.current = controls;

      // Double-click → trigger surface transition
      const handleDblClick = () => { onDoubleClickRef.current?.(); };
      renderer.domElement.addEventListener('dblclick', handleDblClick);

      // --- Build scene layers (lod declared above, next to renderer) ---

      // 1. Starfield
      const starfield = createStarfield(scene, system.seed, lod);

      // 2. Distant star
      const starGroup = createDistantStar(scene, star, planet);

      // 3. Planet sphere
      const { uniforms: planetUniforms } = createPlanetSphere(scene, planet, star, lod);

      // 4. Cloud layer (skipped on low tier)
      const cloudResult = createCloudLayer(scene, planet, lod);

      // 5. Atmosphere (front + optional back glow with Rayleigh scattering)
      createAtmosphereShell(scene, planet, star, lod);

      // 6. Ring (if applicable; skipped on low tier)
      createRing(scene, planet, lod);

      // 7. Moons
      const moonOrbits = createMoons(scene, planet, star, lod);

      // 8. Scanning overlay
      const scan = createScanOverlay(scene);
      scan.group.visible = false;
      scanRef.current = scan;

      // 9. Ship — kick off GLB preload in background; fallback is the cone.
      void preloadDoomsdayShip();
      const ship = createShipState(scene);
      shipRef.current = ship;

      // --- Cosmic events (shooting stars on all scenes) ---
      let shootingStars: ShootingStar[] = [];
      let nextShootingStarTime = 3 + Math.random() * 7; // 3-10s for first

      // --- Ambient + directional lighting ---
      // Testers keep reporting the planet/exosphere looks too dark on mid-
      // and low-tier tablets (no bloom, clamped tone-mapping, camera locked
      // to the lit side). Bumping ambient fill 0.7 → 1.4 and the key light
      // 1.2 → 1.8 brightens the sphere across tiers without washing out the
      // high-end look (bloom still stacks on top on ultra).
      const ambient = new THREE.AmbientLight(0x5577aa, 2.2);
      scene.add(ambient);
      // Hemisphere fill — sky-tinted top, warm-dark bottom. Lifts the dark
      // hemisphere so the planet never goes fully black.
      const hemi = new THREE.HemisphereLight(0x7799cc, 0x332211, 0.6);
      scene.add(hemi);
      const dirLight = new THREE.DirectionalLight(0xfff2dd, 2.5);
      dirLight.position.copy(STAR_SPRITE_POSITION);
      scene.add(dirLight);

      // --- Post-processing: bloom for atmosphere glow ---
      // Bloom = luminance-threshold + horizontal/vertical Gaussian blur +
      // composite ≈ 3 extra render passes per frame. On low-end Android
      // that's 8–15ms/frame, which alone drops us below 30fps. Skipped on
      // both low AND mid — planet still looks fine without the halo, and
      // mid-tier tablets were overheating running all layers + bloom.
      const tier = getDeviceTier();
      const useBloom = tier !== 'low' && tier !== 'mid';
      // Lock camera on low + mid: no auto-rotate, no user drag-rotation,
      // no pinch/wheel zoom. A fully static camera means the GPU can cache
      // the transform matrix + skip geometry re-upload across frames —
      // roughly halves per-frame driver work on mid/low GPUs. User-facing
      // trade-off: can only see one side of the planet, no zooming. Given
      // the planet is mostly decorative at this view (exploration happens
      // elsewhere), this is an acceptable cut for the perf it buys.
      if (tier === 'low' || tier === 'mid') {
        controls.autoRotate = false;
        controls.enableRotate = false;
        controls.enableZoom = false;
      }
      const composer = useBloom ? new EffectComposer(renderer) : null;
      if (composer) {
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(container.clientWidth, container.clientHeight),
          0.18, 0.35, 0.85,
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
      }

      // --- Animation ---
      let lastTime = performance.now();
      const startTime = performance.now();

      // FPS cap on low/mid — 30 fps is plenty for a mostly-still planet
      // globe with gentle auto-rotate. Halves the per-frame GPU work +
      // drops thermal load on tablets. High/ultra run free (vsync).
      // `tier` is already computed above (bloom gate).
      const minFrameMs = (tier === 'low' || tier === 'mid') ? 1000 / 30 : 0;
      let lastRenderedAt = 0;

      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate);
        const now = performance.now();

        // Skip entire frame if tab is hidden OR we're ahead of our FPS cap.
        // `document.hidden` check prevents background RAF cost when the
        // whole app is minimised; the FPS cap handles mid/low in-foreground.
        if (typeof document !== 'undefined' && document.hidden) return;
        if (minFrameMs > 0 && now - lastRenderedAt < minFrameMs) return;
        lastRenderedAt = now;

        const deltaMs = now - lastTime;
        lastTime = now;
        const elapsed = (now - startTime) * 0.001;

        // Spin + zoom transition (double-click → surface)
        const tr = transitionRef.current;
        if (tr) {
          const p = Math.min(1, (now - tr.startTime) / 2000);
          // easeInOutCubic
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          controls.autoRotateSpeed = 0.15 + e * 14.85;
          const targetDist = controls.minDistance;
          const d = tr.startDist + (targetDist - tr.startDist) * e;
          camera.position.normalize().multiplyScalar(d);
          if (p >= 1) {
            const cb = tr.onComplete;
            transitionRef.current = null;
            controls.autoRotateSpeed = 0.15;
            controls.enabled = true;
            cb();
          }
        }

        controls.update();

        // Update planet time uniform
        planetUniforms.uTime.value = elapsed;

        // Update cloud time
        if (cloudResult) {
          cloudResult.uniform.value = elapsed;
        }

        // Dynamic star scale — larger when zoomed in
        const camDist = camera.position.length();
        const starScale = 1.0 + (3.0 / camDist - 1.0) * 0.5;
        starGroup.scale.setScalar(starScale);

        // GPU-driven twinkling via uTime uniform.
        // Skipped on low tier — uniform upload is cheap, but the shader
        // recomputes per-star brightness every pixel; keeping uTime frozen
        // lets the driver cache the starfield frame-to-frame.
        if (starfield.twinkleEnabled) {
          starfield.timeUniform.value = elapsed;
        }

        // Moon orbits — 3D inclined elliptical
        for (const m of moonOrbits) {
          m.angle += m.angularSpeed * deltaMs;
          const localX = Math.cos(m.angle) * m.orbitRadius;
          const localY = Math.sin(m.angle) * m.orbitRadius * (1.0 - m.eccentricityY);
          const cosI = Math.cos(m.inclination);
          const sinI = Math.sin(m.inclination);
          const cosO = Math.cos(m.ascendingNode);
          const sinO = Math.sin(m.ascendingNode);
          const mx = cosO * localX - sinO * cosI * localY;
          const my = sinO * localX + cosO * cosI * localY;
          const mz = sinI * localY;
          m.mesh.position.set(mx, my, mz);
          // Depth-based scale from Z
          const depth = mz / m.orbitRadius;
          m.mesh.scale.setScalar(0.85 + depth * 0.15);
          m.mesh.renderOrder = mz > 0 ? 2 : -1;
        }

        // Scanning overlay
        if (scanActiveRef.current && scanRef.current) {
          scanRef.current.time += deltaMs;
          updateScanOverlayVisuals(scanRef.current);
        }

        // Ship approach
        if (shipRef.current) {
          updateShipVisuals(shipRef.current, deltaMs);
        }

        // Shooting stars — spawn + lifecycle. Skipped on low/mid because
        // every spawn allocates new Line geometry + material, and culling
        // disposes GPU resources on the main thread. On weak GPUs this
        // causes periodic frame-time spikes on top of the steady planet
        // render cost. Starfield already provides "cosmic" atmosphere.
        if (tier !== 'low' && tier !== 'mid') {
          nextShootingStarTime -= deltaMs / 1000;
          if (nextShootingStarTime <= 0) {
            shootingStars.push(spawnShootingStar(scene));
            nextShootingStarTime = 5 + Math.random() * 5; // every 5-10s
          }
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const ss = shootingStars[i];
          ss.elapsed += deltaMs / 1000;
          const t = ss.elapsed / ss.duration;
          if (t >= 1) {
            scene.remove(ss.line);
            ss.line.geometry.dispose();
            (ss.line.material as THREE.Material).dispose();
            shootingStars.splice(i, 1);
            continue;
          }

          const head = ss.start.clone().lerp(ss.end, t);
          const tailT = Math.max(0, t - 0.3);
          const tail = ss.start.clone().lerp(ss.end, tailT);
          const positions = ss.line.geometry.getAttribute('position');
          (positions.array as Float32Array).set([tail.x, tail.y, tail.z, head.x, head.y, head.z]);
          positions.needsUpdate = true;
          // Fade using per-star maxOpacity for visibility variation
          (ss.line.material as THREE.LineBasicMaterial).opacity = ss.maxOpacity * (1 - t * 0.7);
        }

        if (composer) composer.render();
        else renderer.render(scene, camera);
      };

      animate();

      // --- Resize handler ---
      const onResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (composer) composer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      return () => {
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('dblclick', handleDblClick);
        transitionRef.current = null;
        cleanup();
        // Dispose scene
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
            obj.geometry?.dispose();
            if (obj.material instanceof THREE.Material) obj.material.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          }
        });
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    }, [planet.id, star.id]); // Re-create scene only when planet/star changes

    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 48, // above CommandBar
          zIndex: 50,
          background: '#020510',
        }}
      />
    );
  },
);

PlanetGlobeView.displayName = 'PlanetGlobeView';
export default PlanetGlobeView;
