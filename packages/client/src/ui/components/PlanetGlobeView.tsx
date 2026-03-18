import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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

function createStarfield(scene: THREE.Scene): {
  points: THREE.Points;
  twinkleIndices: number[];
  baseSizes: Float32Array;
} {
  const count = 2500;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 50;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.3 + Math.random() * 2.0;

    // Star color distribution with subtle cosmic blue tint
    const roll = Math.random();
    let cr: number, cg: number, cb: number;
    if (roll < 0.12) {
      // Warm yellow-white (rare)
      cr = 1.0; cg = 0.85 + Math.random() * 0.15; cb = 0.7 + Math.random() * 0.2;
    } else if (roll < 0.45) {
      // Cool blue-white (common)
      cr = 0.6 + Math.random() * 0.2; cg = 0.7 + Math.random() * 0.2; cb = 1.0;
    } else {
      // White with blue tint
      const w = 0.85 + Math.random() * 0.15;
      cr = w * 0.85; cg = w * 0.92; cb = w;
    }
    colors[i3] = cr; colors[i3 + 1] = cg; colors[i3 + 2] = cb;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    vertexColors: true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  const twinkleIndices: number[] = [];
  for (let i = 0; i < count && twinkleIndices.length < 200; i++) {
    if (Math.random() < 0.08) twinkleIndices.push(i);
  }

  return { points, twinkleIndices, baseSizes: new Float32Array(sizes) };
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
  const coreOpacity = Math.max(0.3, Math.min(0.95, brightness * 0.8));
  const haloOpacity = Math.max(0.03, Math.min(0.2, brightness * 0.15));

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
  halo.scale.setScalar(coreSize * 3.5);
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
): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const visuals = derivePlanetVisuals(planet, star);
  const uniforms = planetVisualsToUniforms(visuals, planet, star);

  const isGas = planet.type === 'gas-giant' || planet.type === 'ice-giant';
  const fragShader = isGas ? gasGiantFrag : rockySurfaceFrag;

  const geometry = new THREE.SphereGeometry(1, 128, 128);
  const material = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: fragShader,
    uniforms,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return { mesh, uniforms };
}

// ---------------------------------------------------------------------------
// Cloud layer
// ---------------------------------------------------------------------------

function createCloudLayer(
  scene: THREE.Scene,
  planet: Planet,
): { mesh: THREE.Mesh; uniform: THREE.IUniform } | null {
  if (!planet.atmosphere) return null;
  const params = getCloudParams(planet.atmosphere, planet.type);
  if (!params) return null;

  const geometry = new THREE.SphereGeometry(params.scale, 64, 64);
  const timeUniform = { value: 0.0 };
  const material = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: cloudLayerFrag,
    uniforms: {
      uCloudColor: { value: params.color },
      uCoverage: { value: params.coverage },
      uTime: timeUniform,
      uSeed: { value: planet.seed },
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
): THREE.Mesh | null {
  if (!planet.atmosphere) return null;
  const params = getAtmosphereParams(planet.atmosphere, planet.type);
  if (!params) return null;

  const geometry = new THREE.SphereGeometry(params.scale, 32, 32);
  const material = new THREE.ShaderMaterial({
    vertexShader: planetVertSrc,
    fragmentShader: atmosphereFrag,
    uniforms: {
      uColor: { value: params.color },
      uIntensity: { value: params.intensity },
      uPower: { value: params.power },
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Ring (gas giants)
// ---------------------------------------------------------------------------

function createRing(
  scene: THREE.Scene,
  planet: Planet,
): THREE.Mesh | null {
  const isGas = planet.type === 'gas-giant';
  const isIce = planet.type === 'ice-giant';
  // Only gas/ice giants with significant mass get rings
  if (!isGas && !isIce) return null;
  if (planet.massEarth < 15) return null;

  const innerR = 1.2;
  const outerR = 2.2;
  const geometry = new THREE.RingGeometry(innerR, outerR, 128, 4);
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

    const geometry = new THREE.SphereGeometry(moonR, 32, 32);
    const material = new THREE.ShaderMaterial({
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

    // Ship body (small triangle)
    const shipGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
    const shipMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc });
    const shipMesh = new THREE.Mesh(shipGeo, shipMat);
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

    const shipGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
    const shipMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc });
    const shipMesh = new THREE.Mesh(shipGeo, shipMat);
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
      camera.position.set(0, 0, 3);

      // --- Renderer ---
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // --- Controls ---
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.minDistance = 1.5;
      controls.maxDistance = 8;
      controls.enablePan = false;
      controlsRef.current = controls;

      // Double-click → trigger surface transition
      const handleDblClick = () => { onDoubleClickRef.current?.(); };
      renderer.domElement.addEventListener('dblclick', handleDblClick);

      // --- Build scene layers ---

      // 1. Starfield
      const starfield = createStarfield(scene);

      // 2. Distant star
      const starGroup = createDistantStar(scene, star, planet);

      // 3. Planet sphere
      const { uniforms: planetUniforms } = createPlanetSphere(scene, planet, star);

      // 4. Cloud layer
      const cloudResult = createCloudLayer(scene, planet);

      // 5. Atmosphere
      createAtmosphereShell(scene, planet);

      // 6. Ring (if applicable)
      createRing(scene, planet);

      // 7. Moons
      const moonOrbits = createMoons(scene, planet, star);

      // 8. Scanning overlay
      const scan = createScanOverlay(scene);
      scan.group.visible = false;
      scanRef.current = scan;

      // 9. Ship
      const ship = createShipState(scene);
      shipRef.current = ship;

      // --- Cosmic events (shooting stars on all scenes) ---
      let shootingStars: ShootingStar[] = [];
      let nextShootingStarTime = 3 + Math.random() * 7; // 3-10s for first

      // --- Ambient light (very subtle fill) ---
      const ambient = new THREE.AmbientLight(0x112233, 0.15);
      scene.add(ambient);

      // --- Animation ---
      let lastTime = performance.now();
      const startTime = performance.now();

      const animate = () => {
        animFrameRef.current = requestAnimationFrame(animate);
        const now = performance.now();
        const deltaMs = now - lastTime;
        lastTime = now;
        const elapsed = (now - startTime) * 0.001;

        // Spin + zoom transition (double-click → surface)
        const tr = transitionRef.current;
        if (tr) {
          const p = Math.min(1, (now - tr.startTime) / 2000);
          // easeInOutCubic
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          controls.autoRotateSpeed = 0.3 + e * 14.7;
          const targetDist = controls.minDistance;
          const d = tr.startDist + (targetDist - tr.startDist) * e;
          camera.position.normalize().multiplyScalar(d);
          if (p >= 1) {
            const cb = tr.onComplete;
            transitionRef.current = null;
            controls.autoRotateSpeed = 0.3;
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

        // Twinkle stars
        const sizeAttr = starfield.points.geometry.getAttribute('size');
        for (const idx of starfield.twinkleIndices) {
          (sizeAttr.array as Float32Array)[idx] =
            starfield.baseSizes[idx] * (0.5 + 0.5 * Math.sin(elapsed * 3 + idx * 1.7));
        }
        sizeAttr.needsUpdate = true;

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

        // Shooting stars (all modes — realistic cosmic background)
        nextShootingStarTime -= deltaMs / 1000;
        if (nextShootingStarTime <= 0) {
          shootingStars.push(spawnShootingStar(scene));
          nextShootingStarTime = 5 + Math.random() * 5; // every 5-10s
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

        renderer.render(scene, camera);
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
