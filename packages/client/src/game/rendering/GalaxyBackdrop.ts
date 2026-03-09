import { Container, Graphics } from 'pixi.js';
import { SeededRNG } from '@nebulife/core';

const FIELD_SIZE = 1600; // total galaxy field in pixels
const HALF = FIELD_SIZE / 2;

// Spiral arm parameters
const SPIRAL_A = 8;        // starting radius
const SPIRAL_B = 0.18;     // tightness (lower = tighter spiral, more wraps)
const MAX_THETA = 7 * Math.PI; // how far the spiral winds

// Star colors by temperature zone
const WARM_COLORS = [0xffeedd, 0xffddbb, 0xffcc99, 0xffe8cc];
const COOL_COLORS = [0xaaccff, 0x88bbff, 0x99ccff, 0xbbddff];
const WHITE_COLORS = [0xffffff, 0xeeeeff, 0xffeeff, 0xeeffff];

// Nebula palette
const NEBULA_COLORS = [
  0xff4488, // pink
  0x4488ff, // blue
  0x8844ff, // violet
  0x44ddaa, // teal
  0xff6644, // orange
  0x6644ff, // deep purple
  0x44aaff, // cyan
  0xff44aa, // magenta
];

export interface GalaxyBackdropOptions {
  seed: number;
  /** Galaxy center offset in pixels (relative to player at 0,0) */
  centerX: number;
  centerY: number;
}

export function createGalaxyBackdrop(opts: GalaxyBackdropOptions): {
  container: Container;
  accretionDisk: Container;
} {
  const rng = new SeededRNG(opts.seed * 7919 + 13);
  const container = new Container();
  const cx = opts.centerX;
  const cy = opts.centerY;

  // Layer 1: Deep background stars
  container.addChild(drawDeepStars(rng));

  // Layer 2: Galaxy core glow
  container.addChild(drawCoreGlow(rng, cx, cy));

  // Layer 2.5: Outer galactic disk — diffuse halo extending well past spiral arms
  container.addChild(drawOuterDisk(rng, cx, cy));

  // Layer 3: Spiral arm stars
  container.addChild(drawSpiralArms(rng, cx, cy));

  // Layer 4: Dust lanes
  container.addChild(drawDustLanes(rng, cx, cy));

  // Layer 5: Core bulge (dense center stars, on top of dust)
  container.addChild(drawCoreBulge(rng, cx, cy));

  // Layer 6: Nebulae
  container.addChild(drawNebulae(rng, cx, cy));

  // Layer 7: Black hole + accretion disk
  const accretionDisk = drawBlackHole(rng, cx, cy);
  container.addChild(accretionDisk);

  return { container, accretionDisk };
}

function pick(rng: SeededRNG, arr: number[]): number {
  return arr[Math.floor(rng.next() * arr.length)];
}

/** Layer 1: Uniform background star field */
function drawDeepStars(rng: SeededRNG): Graphics {
  const g = new Graphics();
  const count = 4000;
  for (let i = 0; i < count; i++) {
    const x = (rng.next() - 0.5) * FIELD_SIZE;
    const y = (rng.next() - 0.5) * FIELD_SIZE;
    const size = rng.next() * 1.0 + 0.2;
    const alpha = rng.next() * 0.3 + 0.03;
    const color = pick(rng, WHITE_COLORS);
    g.circle(x, y, size);
    g.fill({ color, alpha });
  }
  return g;
}

/** Layer 2: Soft glow around galaxy center */
function drawCoreGlow(_rng: SeededRNG, cx: number, cy: number): Graphics {
  const g = new Graphics();
  const layers = [
    { radius: 160, alpha: 0.015, color: 0xffeedd },
    { radius: 100, alpha: 0.025, color: 0xffddbb },
    { radius: 60, alpha: 0.04, color: 0xffcc99 },
    { radius: 35, alpha: 0.06, color: 0xffeedd },
    { radius: 18, alpha: 0.08, color: 0xffffff },
  ];
  for (const l of layers) {
    g.circle(cx, cy, l.radius);
    g.fill({ color: l.color, alpha: l.alpha });
  }
  return g;
}

/** Layer 2.5: Diffuse outer galactic disk — older stars in a wide halo */
function drawOuterDisk(rng: SeededRNG, cx: number, cy: number): Graphics {
  const g = new Graphics();
  const count = 1500;
  for (let i = 0; i < count; i++) {
    // Gaussian distribution centered on galaxy, wide spread
    const dist = Math.abs(rng.nextGaussian(0, 280));
    const angle = rng.next() * Math.PI * 2;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);

    if (Math.abs(x) > HALF || Math.abs(y) > HALF) continue;

    const size = rng.next() * 0.8 + 0.2;
    const nearness = Math.max(0, 1 - dist / 500);
    const alpha = (rng.next() * 0.12 + 0.02) * nearness;
    // Older stars — warm yellowish
    const color = rng.next() < 0.7
      ? pick(rng, WARM_COLORS)
      : pick(rng, WHITE_COLORS);

    g.circle(x, y, size);
    g.fill({ color, alpha });
  }
  return g;
}

/** Layer 3: Stars distributed along spiral arms */
function drawSpiralArms(rng: SeededRNG, cx: number, cy: number): Graphics {
  const g = new Graphics();

  // 2 major arms + 2 minor arms
  const arms = [
    { thetaOffset: 0, count: 1400, brightness: 1.0 },
    { thetaOffset: Math.PI, count: 1400, brightness: 1.0 },
    { thetaOffset: Math.PI * 0.5, count: 700, brightness: 0.6 },
    { thetaOffset: Math.PI * 1.5, count: 700, brightness: 0.6 },
  ];

  for (const arm of arms) {
    for (let i = 0; i < arm.count; i++) {
      // sqrt bias toward higher theta = more stars at outer radii
      const t = Math.sqrt(rng.next()) * MAX_THETA;
      const r = SPIRAL_A * Math.exp(SPIRAL_B * t);

      // Scatter perpendicular to arm (wider at larger radii)
      const scatter = rng.nextGaussian(0, 6 + r * 0.15);

      const angle = t + arm.thetaOffset;
      const baseX = cx + r * Math.cos(angle);
      const baseY = cy + r * Math.sin(angle);

      // Perpendicular offset
      const perpAngle = angle + Math.PI / 2;
      const x = baseX + scatter * Math.cos(perpAngle);
      const y = baseY + scatter * Math.sin(perpAngle);

      // Skip if too far from field
      if (Math.abs(x) > HALF || Math.abs(y) > HALF) continue;

      const size = rng.next() * 1.2 + 0.3;
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const maxDist = 650;
      const fadeFactor = Math.max(0, 1 - distFromCenter / maxDist);
      const alpha = (rng.next() * 0.22 + 0.06) * arm.brightness * (0.35 + fadeFactor * 0.65);

      // Blue-white stars in arms (young), yellow/warm near center
      const color = distFromCenter < 80
        ? pick(rng, WARM_COLORS)
        : (rng.next() < 0.6 ? pick(rng, COOL_COLORS) : pick(rng, WHITE_COLORS));

      g.circle(x, y, size);
      g.fill({ color, alpha });
    }
  }
  return g;
}

/** Layer 4: Dark dust lanes along inner edges of spiral arms */
function drawDustLanes(rng: SeededRNG, cx: number, cy: number): Graphics {
  const g = new Graphics();

  for (let arm = 0; arm < 2; arm++) {
    const thetaOffset = arm * Math.PI;
    for (let i = 0; i < 150; i++) {
      const t = rng.next() * MAX_THETA * 0.85;
      const r = SPIRAL_A * Math.exp(SPIRAL_B * t);

      // Place slightly inside the arm
      const scatter = rng.nextGaussian(-6, 4);
      const angle = t + thetaOffset;
      const perpAngle = angle + Math.PI / 2;

      const x = cx + r * Math.cos(angle) + scatter * Math.cos(perpAngle);
      const y = cy + r * Math.sin(angle) + scatter * Math.sin(perpAngle);

      if (Math.abs(x) > HALF || Math.abs(y) > HALF) continue;

      const size = rng.nextFloat(3, 12);
      const alpha = rng.nextFloat(0.08, 0.2);

      g.circle(x, y, size);
      g.fill({ color: 0x020308, alpha });
    }
  }
  return g;
}

/** Layer 5: Dense core bulge stars */
function drawCoreBulge(rng: SeededRNG, cx: number, cy: number): Graphics {
  const g = new Graphics();
  const count = 500;
  for (let i = 0; i < count; i++) {
    const dist = Math.abs(rng.nextGaussian(0, 35));
    const angle = rng.next() * Math.PI * 2;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);

    const size = rng.next() * 0.9 + 0.3;
    const nearness = Math.max(0, 1 - dist / 60);
    const alpha = (rng.next() * 0.25 + 0.08) * (0.3 + nearness * 0.7);
    const color = pick(rng, WARM_COLORS);

    g.circle(x, y, size);
    g.fill({ color, alpha });
  }
  return g;
}

/** Layer 6: Colorful nebulae scattered along spiral arms */
function drawNebulae(rng: SeededRNG, cx: number, cy: number): Graphics {
  const g = new Graphics();
  const nebulaCount = 8;

  for (let i = 0; i < nebulaCount; i++) {
    // Place nebulae along spiral arms
    const t = rng.nextFloat(1.5, MAX_THETA * 0.8);
    const armIdx = rng.nextInt(0, 1);
    const thetaOffset = armIdx * Math.PI;
    const r = SPIRAL_A * Math.exp(SPIRAL_B * t);
    const angle = t + thetaOffset;

    const scatter = rng.nextGaussian(0, 20);
    const perpAngle = angle + Math.PI / 2;
    const baseX = cx + r * Math.cos(angle) + scatter * Math.cos(perpAngle);
    const baseY = cy + r * Math.sin(angle) + scatter * Math.sin(perpAngle);

    if (Math.abs(baseX) > HALF || Math.abs(baseY) > HALF) continue;

    const color = NEBULA_COLORS[i % NEBULA_COLORS.length];

    // 3 overlapping blobs per nebula for soft look
    for (let j = 0; j < 3; j++) {
      const ox = rng.nextGaussian(0, 12);
      const oy = rng.nextGaussian(0, 12);
      const size = rng.nextFloat(20, 60);
      const alpha = rng.nextFloat(0.01, 0.035);

      g.circle(baseX + ox, baseY + oy, size);
      g.fill({ color, alpha });
    }
  }
  return g;
}

/** Layer 7: Central black hole with accretion disk */
function drawBlackHole(_rng: SeededRNG, cx: number, cy: number): Container {
  const bhContainer = new Container();
  bhContainer.x = cx;
  bhContainer.y = cy;

  const g = new Graphics();

  // Outer accretion glow
  g.circle(0, 0, 40);
  g.fill({ color: 0xff4422, alpha: 0.04 });

  g.circle(0, 0, 28);
  g.fill({ color: 0xff6633, alpha: 0.06 });

  // Accretion disk — bright ring
  // Outer ring (red-orange)
  g.circle(0, 0, 22);
  g.stroke({ width: 3, color: 0xff4422, alpha: 0.15 });

  // Mid ring (orange-yellow)
  g.circle(0, 0, 16);
  g.stroke({ width: 2.5, color: 0xffaa44, alpha: 0.25 });

  // Inner ring (bright white-yellow)
  g.circle(0, 0, 10);
  g.stroke({ width: 2, color: 0xffeebb, alpha: 0.35 });

  // Hot inner glow
  g.circle(0, 0, 7);
  g.fill({ color: 0xffffff, alpha: 0.08 });

  // Event horizon — pure black
  g.circle(0, 0, 4);
  g.fill({ color: 0x000000, alpha: 1.0 });

  // Tiny bright ring at event horizon edge
  g.circle(0, 0, 4.5);
  g.stroke({ width: 0.5, color: 0xffffff, alpha: 0.3 });

  bhContainer.addChild(g);

  // Accretion jets (subtle vertical glow)
  const jets = new Graphics();
  // Top jet
  jets.moveTo(-1, -6);
  jets.lineTo(0, -45);
  jets.lineTo(1, -6);
  jets.fill({ color: 0x88aaff, alpha: 0.06 });
  // Bottom jet
  jets.moveTo(-1, 6);
  jets.lineTo(0, 45);
  jets.lineTo(1, 6);
  jets.fill({ color: 0x88aaff, alpha: 0.06 });
  bhContainer.addChild(jets);

  return bhContainer;
}
