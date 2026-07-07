#!/usr/bin/env node
// ---------------------------------------------------------------------------
// bake-explosions.mjs
//
// NEXT_GEN_PLAN.md section A.4 — pre-baked explosion sprite-sheets. Runs once
// at content-authoring time (not at runtime, not at app build), procedurally
// generating deterministic, seeded webp sprite-sheets in the game palette
// (oranges #ff8844, whites, blues #7bb8ff). The Carrier Raid engine plays
// these back frame-by-frame via AnimatedSprite from a pool — no per-frame
// canvas work in the game itself.
//
// Usage: node scripts/bake-explosions.mjs
// Output: packages/client/public/fx/<name>.webp + <name>.json (frame metadata)
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'packages', 'client', 'public', 'fx');

// ── Deterministic seeded RNG (mirrors packages/core/src/math/rng.ts Mulberry32) ──
function makeRng(seed) {
  let state = seed | 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return hash >>> 0;
}

// ── SVG frame builders ──────────────────────────────────────────────────────
// Palette: oranges (#ff8844, #ffbb66), whites, blues (#7bb8ff) — GAME_BIBLE
// semantic colors. Every animation is a simple radial-gradient composition;
// no photographic textures, matching the procedural-art house style.

function svgHeader(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
}

/** Small hit/kill spark — quick white-orange flash + thin shockwave ring. */
function buildSmallFrame(size, t, rng) {
  const cx = size / 2;
  const cy = size / 2;
  const coreR = Math.max(0, (1 - t) * size * 0.24);
  const ringR = t * size * 0.46;
  const ringWidth = Math.max(1.5, (1 - t) * 6);
  const coreAlpha = Math.max(0, 1 - t * 1.3);
  const ringAlpha = Math.max(0, 0.85 - t * 0.85);
  const jitter = (rng() - 0.5) * 2;
  return `${svgHeader(size)}
    <defs>
      <radialGradient id="core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="${coreAlpha}"/>
        <stop offset="45%" stop-color="#ffbb66" stop-opacity="${coreAlpha * 0.8}"/>
        <stop offset="100%" stop-color="#ff8844" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx + jitter}" cy="${cy}" r="${coreR}" fill="url(#core)"/>
    <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#ff8844" stroke-opacity="${ringAlpha}" stroke-width="${ringWidth}"/>
  </svg>`;
}

/** Large module/reactor/carrier explosion — bigger fireball + debris streaks + shockwave. */
function buildLargeFrame(size, t, rng) {
  const cx = size / 2;
  const cy = size / 2;
  const fireR = Math.max(0, size * (0.1 + t * 0.34) * (1 - t * 0.35));
  const ringR = t * size * 0.48;
  const ringWidth = Math.max(2, (1 - t) * 10);
  const fireAlpha = Math.max(0, 1 - Math.max(0, t - 0.35) * 1.6);
  const ringAlpha = Math.max(0, 0.9 - t * 0.9);
  let streaks = '';
  const streakCount = 7;
  for (let i = 0; i < streakCount; i++) {
    const angle = (i / streakCount) * Math.PI * 2 + rng() * 0.6;
    const len = size * (0.12 + rng() * 0.22) * Math.min(1, t * 2.2) * (1 - Math.max(0, t - 0.6) * 2);
    const x1 = cx + Math.cos(angle) * fireR * 0.4;
    const y1 = cy + Math.sin(angle) * fireR * 0.4;
    const x2 = cx + Math.cos(angle) * (fireR * 0.4 + len);
    const y2 = cy + Math.sin(angle) * (fireR * 0.4 + len);
    const streakAlpha = Math.max(0, (0.7 - t * 0.7)).toFixed(3);
    const color = i % 2 === 0 ? '#ff8844' : '#ffbb66';
    streaks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-opacity="${streakAlpha}" stroke-width="${(2.5 * (1 - t)).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return `${svgHeader(size)}
    <defs>
      <radialGradient id="fire" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="${fireAlpha}"/>
        <stop offset="35%" stop-color="#ffbb66" stop-opacity="${fireAlpha * 0.9}"/>
        <stop offset="70%" stop-color="#ff8844" stop-opacity="${fireAlpha * 0.55}"/>
        <stop offset="100%" stop-color="#ff8844" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#ffbb66" stroke-opacity="${ringAlpha}" stroke-width="${ringWidth}"/>
    ${streaks}
    <circle cx="${cx}" cy="${cy}" r="${fireR}" fill="url(#fire)"/>
  </svg>`;
}

/** Shield emitter pop — cool blue/white ripple, no fire debris (energy discharge, not a fireball). */
function buildShieldFrame(size, t) {
  const cx = size / 2;
  const cy = size / 2;
  const ringR = t * size * 0.47;
  const ringWidth = Math.max(1.5, (1 - t) * 7);
  const coreR = Math.max(0, (1 - t) * size * 0.2);
  const coreAlpha = Math.max(0, 0.9 - t * 1.1);
  const ringAlpha = Math.max(0, 0.85 - t * 0.75);
  return `${svgHeader(size)}
    <defs>
      <radialGradient id="core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="${coreAlpha}"/>
        <stop offset="55%" stop-color="#7bb8ff" stop-opacity="${coreAlpha * 0.7}"/>
        <stop offset="100%" stop-color="#4488aa" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="#7bb8ff" stroke-opacity="${ringAlpha}" stroke-width="${ringWidth}"/>
    <circle cx="${cx}" cy="${cy}" r="${coreR}" fill="url(#core)"/>
  </svg>`;
}

// ── Sheet assembly ───────────────────────────────────────────────────────────

async function buildSheet({ name, seed, frameCount, frameSize, columns, buildFrame }) {
  const rng = makeRng(seed);
  const rows = Math.ceil(frameCount / columns);
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const t = i / (frameCount - 1);
    const svg = buildFrame(frameSize, t, rng);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    frames.push({
      input: png,
      left: (i % columns) * frameSize,
      top: Math.floor(i / columns) * frameSize,
    });
  }
  const sheetW = columns * frameSize;
  const sheetH = rows * frameSize;
  const sheet = sharp({
    create: { width: sheetW, height: sheetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(frames);

  mkdirSync(OUT_DIR, { recursive: true });
  const webpPath = join(OUT_DIR, `${name}.webp`);
  await sheet.webp({ quality: 92, alphaQuality: 100 }).toFile(webpPath);

  const meta = { frameSize, frameCount, columns, rows };
  writeFileSync(join(OUT_DIR, `${name}.json`), JSON.stringify(meta, null, 2));
  console.log(`[bake-explosions] wrote ${name}.webp (${sheetW}x${sheetH}, ${frameCount} frames)`);
}

async function main() {
  await buildSheet({
    name: 'explosion-small',
    seed: seedFromString('nebulife-raid-explosion-small'),
    frameCount: 8,
    frameSize: 96,
    columns: 4,
    buildFrame: buildSmallFrame,
  });
  await buildSheet({
    name: 'explosion-large',
    seed: seedFromString('nebulife-raid-explosion-large'),
    frameCount: 12,
    frameSize: 128,
    columns: 4,
    buildFrame: buildLargeFrame,
  });
  await buildSheet({
    name: 'shield-pop',
    seed: seedFromString('nebulife-raid-shield-pop'),
    frameCount: 6,
    frameSize: 96,
    columns: 3,
    buildFrame: buildShieldFrame,
  });
  console.log('[bake-explosions] done.');
}

main().catch((error) => {
  console.error('[bake-explosions] failed:', error);
  process.exitCode = 1;
});
