import { Container, Graphics } from 'pixi.js';
import { SeededRNG } from '@nebulife/core';

const WHITE_COLORS = [0xffffff, 0xeeeeff, 0xffeeff, 0xeeffff];
const WARM_COLORS = [0xffeedd, 0xffddbb, 0xffcc99];
const COOL_COLORS = [0xaaccff, 0x88bbff, 0x99ccff];

const NEBULA_COLORS = [
  0x2244aa, // deep blue
  0x443388, // violet
  0x224466, // teal-blue
  0x553366, // purple
];

export interface TwinkleStar {
  graphic: Graphics;
  baseAlpha: number;
  speed: number;
  phase: number;
}

export function createHomePlanetBackdrop(
  seed: number,
  width: number,
  height: number,
): { container: Container; twinkleStars: TwinkleStar[] } {
  const rng = new SeededRNG(seed * 3571 + 17);
  const container = new Container();
  const halfW = width / 2;
  const halfH = height / 2;

  function pick(arr: number[]): number {
    return arr[Math.floor(rng.next() * arr.length)];
  }

  // Layer 1: Deep background stars (many, tiny, dim)
  const deepStars = new Graphics();
  for (let i = 0; i < 6000; i++) {
    const x = (rng.next() - 0.5) * width * 1.2;
    const y = (rng.next() - 0.5) * height * 1.2;
    const size = rng.next() * 0.8 + 0.2;
    const alpha = rng.next() * 0.27 + 0.03;
    const color = pick(WHITE_COLORS);
    deepStars.circle(x, y, size);
    deepStars.fill({ color, alpha });
  }
  container.addChild(deepStars);

  // Layer 2: Medium stars (fewer, larger, brighter)
  const medStars = new Graphics();
  for (let i = 0; i < 400; i++) {
    const x = (rng.next() - 0.5) * width * 1.2;
    const y = (rng.next() - 0.5) * height * 1.2;
    const size = rng.next() * 1.0 + 1.0;
    const alpha = rng.next() * 0.3 + 0.1;
    const color = rng.next() < 0.5 ? pick(WARM_COLORS) : pick(COOL_COLORS);
    medStars.circle(x, y, size);
    medStars.fill({ color, alpha });
  }
  container.addChild(medStars);

  // Layer 3: Nebula wisps (2-3 large diffuse patches)
  const nebulaCount = rng.nextInt(2, 3);
  for (let i = 0; i < nebulaCount; i++) {
    const nebula = new Graphics();
    const nx = rng.nextFloat(-halfW * 0.8, halfW * 0.8);
    const ny = rng.nextFloat(-halfH * 0.8, halfH * 0.8);
    const color = NEBULA_COLORS[i % NEBULA_COLORS.length];

    // Several overlapping blobs per wisp
    for (let j = 0; j < 5; j++) {
      const ox = rng.nextGaussian(0, 60);
      const oy = rng.nextGaussian(0, 40);
      const rx = rng.nextFloat(80, 200);
      const ry = rng.nextFloat(50, 120);
      const alpha = rng.nextFloat(0.008, 0.025);

      nebula.ellipse(nx + ox, ny + oy, rx, ry);
      nebula.fill({ color, alpha });
    }
    container.addChild(nebula);
  }

  // Layer 4: Twinkle stars (individual Graphics for animation)
  const twinkleStars: TwinkleStar[] = [];
  for (let i = 0; i < 80; i++) {
    const x = (rng.next() - 0.5) * width * 1.1;
    const y = (rng.next() - 0.5) * height * 1.1;
    const size = rng.nextFloat(0.8, 2.0);
    const baseAlpha = rng.nextFloat(0.15, 0.5);
    const color = pick(WHITE_COLORS);

    const g = new Graphics();
    g.circle(0, 0, size);
    g.fill({ color, alpha: 1.0 });
    // Add a tiny glow
    g.circle(0, 0, size * 2.5);
    g.fill({ color, alpha: 0.15 });

    g.x = x;
    g.y = y;
    g.alpha = baseAlpha;
    container.addChild(g);

    twinkleStars.push({
      graphic: g,
      baseAlpha,
      speed: rng.nextFloat(0.001, 0.004),
      phase: rng.next() * Math.PI * 2,
    });
  }

  return { container, twinkleStars };
}

/** Create a vignette overlay simulating lens curvature (dark corners/edges) */
export function createVignette(w: number, h: number): Container {
  const container = new Container();
  const gfx = new Graphics();
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) * 1.15;
  const innerR = Math.min(w, h) * 0.32;
  const ringCount = 25;
  const ringW = (maxR - innerR) / ringCount + 3;

  for (let i = 0; i < ringCount; i++) {
    const t = (i + 1) / ringCount;
    const r = innerR + (maxR - innerR) * t;
    const alpha = t * t * t * 0.04;
    gfx.circle(cx, cy, r);
    gfx.stroke({ width: ringW, color: 0x010308, alpha });
  }

  container.addChild(gfx);
  return container;
}
