import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Discovery, StarSystem } from '@nebulife/core';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  getCatalogEntry,
  generateScientificReport,
} from '@nebulife/core';
import type { CatalogEntry } from '@nebulife/core';
import { ScientificReport } from './ScientificReport.js';

// ---------------------------------------------------------------------------
// TelemetryView — 30-second progressive procedural scan
// ---------------------------------------------------------------------------
// Full-screen overlay. Animated Canvas builds up category-appropriate imagery
// over 30 seconds with layered detail reveal.
// Phases: scanning → report → photo
// ---------------------------------------------------------------------------

type Phase = 'scanning' | 'report' | 'photo';

const SCAN_DURATION_MS = 30_000;

// Category → visual rendering strategy
type RenderCategory = 'nebula' | 'star' | 'galaxy' | 'phenomenon' | 'planet' | 'rings' | 'cluster' | 'organic';

const CATEGORY_RENDER: Record<string, RenderCategory> = {
  nebulae: 'nebula',
  stars: 'star',
  galaxies: 'galaxy',
  phenomena: 'phenomenon',
  'exotic-planets': 'planet',
  'dark-objects': 'rings',
  'star-forming': 'nebula',
  binaries: 'star',
  'small-bodies': 'rings',
  rogues: 'planet',
  flora: 'organic',
  fauna: 'organic',
  microbes: 'cluster',
};

// ─── RNG ────────────────────────────────────────────────────────────────

function xorshift(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// ─── Color ──────────────────────────────────────────────────────────────

function clampC(v: number) { return Math.max(0, Math.min(255, Math.round(v))); }

// ─── Drawing helpers ────────────────────────────────────────────────────

function drawStarfield(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, count: number, alpha: number,
) {
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() * 1.4;
    const a = (0.15 + rng() * 0.5) * alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,200,220,${a})`;
    ctx.fill();
  }
}

// ─── Nebula ─────────────────────────────────────────────────────────────

function drawNebula(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.42;

  // Multi-layered gas clouds
  const layers = Math.floor(4 + p * (8 + rar * 4));
  for (let l = 0; l < layers; l++) {
    const lp = Math.max(0, Math.min(1, (p * layers - l)));
    if (lp <= 0) continue;

    const blobCount = Math.floor(60 + rar * 30);
    for (let i = 0; i < blobCount; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * maxR * (0.3 + l * 0.1);
      const wobble = Math.sin(t * 0.25 + a * 2 + l) * 12;
      const x = cx + Math.cos(a) * d + wobble;
      const y = cy + Math.sin(a) * d * (0.55 + rng() * 0.35) + wobble * 0.4;
      const r = (10 + rng() * 35) * lp;

      // Shift hue per layer
      const shift = l * 25;
      const lr = clampC(cr + shift * (l % 2 === 0 ? 1 : -0.7));
      const lg = clampC(cg + shift * (l % 2 === 1 ? 1 : -0.5));
      const lb = clampC(cb + shift * 0.3);

      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      const ba = (0.03 + rng() * 0.07) * lp;
      grd.addColorStop(0, `rgba(${lr},${lg},${lb},${ba})`);
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }
  }

  // Filamentary structure
  if (p > 0.25) {
    const filP = Math.min(1, (p - 0.25) / 0.4);
    const filaments = 4 + Math.floor(rar * 3);
    for (let f = 0; f < filaments; f++) {
      const baseA = rng() * Math.PI * 2;
      ctx.beginPath();
      let fx = cx, fy = cy;
      ctx.moveTo(fx, fy);
      const segs = 30 + Math.floor(rng() * 20);
      for (let s = 0; s < segs; s++) {
        const st = s / segs;
        const angle = baseA + Math.sin(t * 0.3 + s * 0.15 + f) * 0.8 * st;
        fx += Math.cos(angle) * (4 + rng() * 3);
        fy += Math.sin(angle) * (4 + rng() * 3);
        ctx.lineTo(fx, fy);
      }
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.08 * filP})`;
      ctx.lineWidth = 1.5 + rng() * 2;
      ctx.stroke();
    }
  }

  // Hot central region
  if (p > 0.5) {
    const coreP = Math.min(1, (p - 0.5) / 0.4);
    const pulse = 1 + Math.sin(t * 1.8) * 0.12;
    const coreR = (25 + rar * 10) * coreP * pulse;
    const cGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    cGrd.addColorStop(0, `rgba(${clampC(cr + 100)},${clampC(cg + 100)},${clampC(cb + 80)},${0.45 * coreP})`);
    cGrd.addColorStop(0.4, `rgba(${cr},${cg},${cb},${0.15 * coreP})`);
    cGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = cGrd;
    ctx.fill();
  }

  // Embedded young stars
  if (p > 0.65) {
    const stP = Math.min(1, (p - 0.65) / 0.3);
    const stCount = 8 + Math.floor(rar * 8);
    for (let i = 0; i < stCount; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * maxR * 0.6;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d * 0.6;
      const sr = 1 + rng() * 2.5;
      const twinkle = 0.5 + Math.sin(t * 3 + i * 1.7) * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,255,${twinkle * stP})`;
      ctx.fill();
    }
  }
}

// ─── Star ───────────────────────────────────────────────────────────────

function drawStar(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;
  const R = 45 + rar * 20;

  // Corona (first to appear)
  if (p > 0.05) {
    const coP = Math.min(1, (p - 0.05) / 0.25);
    for (let r = R * 3.5; r > R * 1.2; r -= 4) {
      const pulse = 1 + Math.sin(t * 1.2 + r * 0.08) * 0.12;
      const a = (0.008 + (1 - r / (R * 3.5)) * 0.035) * coP * pulse;
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      ctx.fill();
    }
  }

  // Flare rays
  if (p > 0.2) {
    const flP = Math.min(1, (p - 0.2) / 0.3);
    const rays = 4 + Math.floor(rar * 6);
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + t * 0.03;
      const len = (R * 1.8 + rng() * R * 2.5) * flP;
      const spread = 0.03 + rng() * 0.05;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, -len * spread);
      ctx.lineTo(len * 1.08, 0);
      ctx.lineTo(len, len * spread);
      ctx.closePath();
      const rGrd = ctx.createLinearGradient(0, 0, len, 0);
      rGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.25 * flP})`);
      rGrd.addColorStop(1, 'transparent');
      ctx.fillStyle = rGrd;
      ctx.fill();
      ctx.restore();
    }
  }

  // Star body
  if (p > 0.15) {
    const bP = Math.min(1, (p - 0.15) / 0.35);
    const bodyR = R * bP;
    const sGrd = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.15, 0, cx, cy, bodyR);
    sGrd.addColorStop(0, `rgba(${clampC(cr + 120)},${clampC(cg + 120)},${clampC(cb + 100)},${0.95 * bP})`);
    sGrd.addColorStop(0.35, `rgba(${cr},${cg},${cb},${0.85 * bP})`);
    sGrd.addColorStop(0.75, `rgba(${cr >> 1},${cg >> 1},${cb >> 1},${0.5 * bP})`);
    sGrd.addColorStop(1, `rgba(${cr >> 2},${cg >> 2},${cb >> 2},${0.15 * bP})`);
    ctx.beginPath();
    ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    ctx.fillStyle = sGrd;
    ctx.fill();
  }

  // Surface granulation
  if (p > 0.55) {
    const texP = Math.min(1, (p - 0.55) / 0.3);
    for (let i = 0; i < 25 + rar * 15; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * R * 0.85;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const r = 2 + rng() * 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr >> 1},${cg >> 1},${cb >> 1},${0.12 * texP})`;
      ctx.fill();
    }
  }

  // Prominences (arcs)
  if (p > 0.7) {
    const prP = Math.min(1, (p - 0.7) / 0.25);
    const promCount = 2 + Math.floor(rar * 3);
    for (let i = 0; i < promCount; i++) {
      const baseAngle = rng() * Math.PI * 2;
      const arcLen = 0.3 + rng() * 0.5;
      const height = R * (0.3 + rng() * 0.5);
      ctx.beginPath();
      for (let s = 0; s <= 20; s++) {
        const st = s / 20;
        const angle = baseAngle + st * arcLen;
        const h = Math.sin(st * Math.PI) * height + Math.sin(t * 2 + i) * 5;
        const px = cx + Math.cos(angle) * (R + h);
        const py = cy + Math.sin(angle) * (R + h);
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(${clampC(cr + 40)},${cg >> 1},${cb >> 2},${0.35 * prP})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Specular
  if (p > 0.4) {
    const spP = Math.min(1, (p - 0.4) / 0.3);
    const spGrd = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.25, 0, cx - R * 0.2, cy - R * 0.2, R * 0.35);
    spGrd.addColorStop(0, `rgba(255,255,255,${0.35 * spP})`);
    spGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx - R * 0.2, cy - R * 0.2, R * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = spGrd;
    ctx.fill();
  }
}

// ─── Galaxy ─────────────────────────────────────────────────────────────

function drawGalaxy(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;
  const tilt = 0.5;

  // Central bulge
  if (p > 0.1) {
    const bP = Math.min(1, (p - 0.1) / 0.25);
    const bR = 25 + rar * 12;
    const bGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, bR);
    bGrd.addColorStop(0, `rgba(${clampC(cr + 80)},${clampC(cg + 60)},${clampC(cb + 30)},${0.7 * bP})`);
    bGrd.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.25 * bP})`);
    bGrd.addColorStop(1, 'transparent');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, tilt);
    ctx.beginPath();
    ctx.arc(0, 0, bR, 0, Math.PI * 2);
    ctx.restore();
    ctx.fillStyle = bGrd;
    ctx.fill();
  }

  // Spiral arms
  const arms = 2 + Math.floor(rar * 2);
  const total = Math.floor(250 + rar * 150);
  const vis = Math.floor(total * p);

  for (let arm = 0; arm < arms; arm++) {
    const off = (arm / arms) * Math.PI * 2;
    for (let i = 0; i < vis; i++) {
      const it = i / total;
      const angle = off + it * Math.PI * 3.5 + t * 0.015;
      const dist = 15 + it * (w * 0.36);
      const scatter = (4 + it * 28) * (rng() - 0.5);
      const x = cx + Math.cos(angle) * dist + scatter;
      const y = cy + Math.sin(angle) * dist * tilt + scatter * tilt;
      const sz = 0.4 + rng() * 2.2;
      const br = 0.15 + rng() * 0.45;
      const hot = rng() > 0.75;
      const sr = hot ? clampC(cr + 30) : cr;
      const sg = hot ? clampC(cg + 50) : cg;
      const sb = hot ? clampC(cb + 70) : cb;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${sr},${sg},${sb},${br})`;
      ctx.fill();
    }

    // Arm glow
    if (p > 0.3) {
      const gP = Math.min(1, (p - 0.3) / 0.4);
      for (let i = 0; i < 25; i++) {
        const it = rng();
        const angle = off + it * Math.PI * 3.5;
        const dist = 15 + it * (w * 0.34);
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist * tilt;
        const r = 12 + rng() * 20;
        const dGrd = ctx.createRadialGradient(x, y, 0, x, y, r);
        dGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.04 * gP})`);
        dGrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = dGrd;
        ctx.fill();
      }
    }
  }

  // Globular clusters
  if (p > 0.7) {
    const gcP = Math.min(1, (p - 0.7) / 0.25);
    const gcCount = 3 + Math.floor(rar * 3);
    for (let g = 0; g < gcCount; g++) {
      const gx = cx + (rng() - 0.5) * w * 0.6;
      const gy = cy + (rng() - 0.5) * h * 0.3;
      for (let s = 0; s < 15; s++) {
        const sx = gx + (rng() - 0.5) * 12;
        const sy = gy + (rng() - 0.5) * 8;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + rng(), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${clampC(cr + 50)},${clampC(cg + 50)},${clampC(cb + 30)},${0.4 * gcP})`;
        ctx.fill();
      }
    }
  }
}

// ─── Phenomenon ─────────────────────────────────────────────────────────

function drawPhenomenon(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;

  // Shockwave rings
  const ringN = Math.floor(4 + p * 6);
  for (let i = 0; i < ringN; i++) {
    const rp = Math.max(0, Math.min(1, (p * ringN - i)));
    if (rp <= 0) continue;
    const r = (35 + i * 25) * rp;
    const pulse = 1 + Math.sin(t * 2.5 - i * 0.4) * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.4 - i * 0.04) * rp})`;
    ctx.lineWidth = 2.5 + (1 - i / ringN) * 3;
    ctx.stroke();
  }

  // Particle burst
  if (p > 0.15) {
    const expP = Math.min(1, (p - 0.15) / 0.4);
    const pCount = Math.floor(80 + rar * 50);
    for (let i = 0; i < pCount; i++) {
      const a = rng() * Math.PI * 2;
      const spd = 15 + rng() * 120;
      const d = spd * expP + Math.sin(t * 1.5 + i * 0.3) * 4;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const sz = 0.8 + rng() * 2.5;
      const heat = Math.max(0, 1 - d / 160);
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${clampC(cr + heat * 80)},${clampC(cg + heat * 40)},${cb},${Math.max(0.08, 0.5 * (1 - d / 200))})`;
      ctx.fill();
    }
  }

  // Energy streamers
  if (p > 0.4) {
    const stP = Math.min(1, (p - 0.4) / 0.4);
    const stCount = 5 + Math.floor(rar * 4);
    for (let i = 0; i < stCount; i++) {
      const baseA = (i / stCount) * Math.PI * 2 + t * 0.08;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s <= 25; s++) {
        const st = s / 25;
        const d = st * 180 * stP;
        const wobble = Math.sin(t * 3 + s * 0.4 + i * 1.1) * 18 * st;
        const x = cx + Math.cos(baseA) * d + wobble;
        const y = cy + Math.sin(baseA) * d + wobble * 0.6;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.12 * stP})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // Core
  if (p > 0.1) {
    const cP = Math.min(1, (p - 0.1) / 0.3);
    const pulse = 1 + Math.sin(t * 3) * 0.15;
    const cR = (12 + rar * 8) * cP * pulse;
    const cGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
    cGrd.addColorStop(0, `rgba(255,255,255,${0.8 * cP})`);
    cGrd.addColorStop(0.3, `rgba(${cr},${cg},${cb},${0.5 * cP})`);
    cGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, cR, 0, Math.PI * 2);
    ctx.fillStyle = cGrd;
    ctx.fill();
  }

  // Jetted bipolar outflow
  if (p > 0.6 && rar >= 2) {
    const jP = Math.min(1, (p - 0.6) / 0.35);
    for (const dir of [-1, 1]) {
      const jLen = 120 * jP;
      const jGrd = ctx.createLinearGradient(cx, cy, cx, cy + dir * jLen);
      jGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.3 * jP})`);
      jGrd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx - 3, cy + dir * jLen);
      ctx.lineTo(cx + 3, cy + dir * jLen);
      ctx.lineTo(cx + 8, cy);
      ctx.closePath();
      ctx.fillStyle = jGrd;
      ctx.fill();
    }
  }
}

// ─── Planet ─────────────────────────────────────────────────────────────

function drawPlanet(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;
  const R = 55 + rar * 18;

  // Shadow base
  if (p > 0.1) {
    const bP = Math.min(1, (p - 0.1) / 0.3);
    ctx.beginPath();
    ctx.arc(cx, cy, R * bP, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr >> 2},${cg >> 2},${cb >> 2},${0.9 * bP})`;
    ctx.fill();
  }

  // Lit hemisphere
  if (p > 0.2) {
    const lP = Math.min(1, (p - 0.2) / 0.3);
    const lGrd = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.15, 0, cx, cy, R);
    lGrd.addColorStop(0, `rgba(${clampC(cr + 50)},${clampC(cg + 50)},${clampC(cb + 50)},${0.9 * lP})`);
    lGrd.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.65 * lP})`);
    lGrd.addColorStop(1, `rgba(${cr >> 1},${cg >> 1},${cb >> 1},${0.12 * lP})`);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.96 * lP, 0, Math.PI * 2);
    ctx.fillStyle = lGrd;
    ctx.fill();
  }

  // Surface features
  if (p > 0.4) {
    const fP = Math.min(1, (p - 0.4) / 0.35);
    const bands = 6 + Math.floor(rar * 3);
    for (let i = 0; i < bands; i++) {
      const by = cy + (i - bands / 2) * (R * 2 / bands);
      const bw = R * (0.12 + rng() * 0.08);
      const dist = Math.abs(by - cy);
      const chord = Math.sqrt(Math.max(0, R * R - dist * dist));
      if (chord > 0) {
        ctx.beginPath();
        ctx.ellipse(cx, by, chord * 0.95, bw * 0.3, 0, 0, Math.PI * 2);
        const bc = i % 2 === 0
          ? `rgba(${cr},${cg},${cb},${0.12 * fP})`
          : `rgba(${clampC(cr + 25)},${clampC(cg + 15)},${cb},${0.09 * fP})`;
        ctx.fillStyle = bc;
        ctx.fill();
      }
    }
  }

  // Clouds drifting
  if (p > 0.55) {
    const clP = Math.min(1, (p - 0.55) / 0.3);
    for (let i = 0; i < 12 + rar * 5; i++) {
      const a = rng() * Math.PI * 2 + t * 0.02;
      const d = rng() * R * 0.8;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d * 0.85;
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (distFromCenter < R * 0.9) {
        const cr2 = 8 + rng() * 15;
        const cGrd = ctx.createRadialGradient(x, y, 0, x, y, cr2);
        cGrd.addColorStop(0, `rgba(255,255,255,${0.06 * clP})`);
        cGrd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, cr2, 0, Math.PI * 2);
        ctx.fillStyle = cGrd;
        ctx.fill();
      }
    }
  }

  // Atmosphere rings
  if (p > 0.5) {
    const atP = Math.min(1, (p - 0.5) / 0.3);
    const pulse = 1 + Math.sin(t * 1.2) * 0.02;
    for (let r = R + 3; r < R + 14; r += 3) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${clampC(cb + 30)},${(0.1 - (r - R) * 0.007) * atP})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Limb darkening
  if (p > 0.25) {
    const ldP = Math.min(1, (p - 0.25) / 0.3);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,0,0,${0.35 * ldP})`;
    ctx.lineWidth = R * 0.14;
    ctx.stroke();
  }

  // Specular
  if (p > 0.65) {
    const spP = Math.min(1, (p - 0.65) / 0.25);
    const spGrd = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.25, 0, cx - R * 0.2, cy - R * 0.2, R * 0.3);
    spGrd.addColorStop(0, `rgba(255,255,255,${0.28 * spP})`);
    spGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx - R * 0.2, cy - R * 0.2, R * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = spGrd;
    ctx.fill();
  }

  // Moon
  if (p > 0.8 && rar >= 2) {
    const mP = Math.min(1, (p - 0.8) / 0.15);
    const mAngle = t * 0.15;
    const mDist = R * 1.6;
    const mx = cx + Math.cos(mAngle) * mDist;
    const my = cy + Math.sin(mAngle) * mDist * 0.4;
    const mR = 6 + rar * 2;
    const mGrd = ctx.createRadialGradient(mx - mR * 0.2, my - mR * 0.2, 0, mx, my, mR);
    mGrd.addColorStop(0, `rgba(180,190,200,${0.7 * mP})`);
    mGrd.addColorStop(1, `rgba(80,90,100,${0.3 * mP})`);
    ctx.beginPath();
    ctx.arc(mx, my, mR * mP, 0, Math.PI * 2);
    ctx.fillStyle = mGrd;
    ctx.fill();
  }
}

// ─── Rings / Small bodies ───────────────────────────────────────────────

function drawRings(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;

  // Concentric rings
  const ringN = Math.floor(6 + rar * 5);
  for (let i = 0; i < ringN; i++) {
    const rp = Math.max(0, Math.min(1, (p * ringN - i)));
    if (rp <= 0) continue;
    const r = 25 + i * 20;
    const pulse = 1 + Math.sin(t * 1.0 + i * 0.6) * 0.06;
    const rot = t * 0.008 * (i % 2 === 0 ? 1 : -1);
    const thick = 1.5 + (1 - i / ringN) * 3.5;

    ctx.beginPath();
    ctx.ellipse(cx, cy, r * pulse, r * pulse * 0.4, rot, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.35 - i * 0.025) * rp})`;
    ctx.lineWidth = thick;
    ctx.stroke();

    // Particles along ring
    if (rp > 0.5) {
      const dots = 12 + Math.floor(rng() * 16);
      for (let d = 0; d < dots; d++) {
        const a = rng() * Math.PI * 2 + t * 0.04 * (i % 2 === 0 ? 1 : -1);
        const px = cx + Math.cos(a + rot) * r * pulse;
        const py = cy + Math.sin(a + rot) * r * pulse * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 0.8 + rng() * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.25 * rp * rng()})`;
        ctx.fill();
      }
    }
  }

  // Center body
  if (p > 0.2) {
    const cP = Math.min(1, (p - 0.2) / 0.25);
    const cGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    cGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.75 * cP})`);
    cGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = cGrd;
    ctx.fill();
  }

  // Tail / jet (comet-like) for small-bodies
  if (p > 0.6) {
    const tP = Math.min(1, (p - 0.6) / 0.3);
    const tailLen = 150 * tP;
    const tGrd = ctx.createLinearGradient(cx, cy, cx + tailLen, cy - tailLen * 0.3);
    tGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.2 * tP})`);
    tGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.quadraticCurveTo(cx + tailLen * 0.5, cy - tailLen * 0.2, cx + tailLen, cy - tailLen * 0.3);
    ctx.quadraticCurveTo(cx + tailLen * 0.5, cy - tailLen * 0.1, cx, cy + 4);
    ctx.closePath();
    ctx.fillStyle = tGrd;
    ctx.fill();
  }
}

// ─── Cluster ────────────────────────────────────────────────────────────

function drawCluster(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;
  const total = Math.floor(100 + rar * 80);
  const vis = Math.floor(total * p);

  for (let i = 0; i < vis; i++) {
    // Gaussian-ish distribution (more central)
    const r1 = rng(), r2 = rng();
    const a = r1 * Math.PI * 2;
    const d = (r2 * r2) * 160;
    const drift = Math.sin(t * 0.4 + i * 0.08) * 2.5;
    const x = cx + Math.cos(a) * d + drift;
    const y = cy + Math.sin(a) * d * 0.7 + drift * 0.5;
    const sz = 0.8 + rng() * 3.5;
    const br = 0.2 + rng() * 0.5;

    // Color variation
    const vr = clampC(cr + (rng() - 0.5) * 50);
    const vg = clampC(cg + (rng() - 0.5) * 50);
    const vb = clampC(cb + (rng() - 0.5) * 50);

    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${vr},${vg},${vb},${br})`;
    ctx.fill();

    // Glow for bigger objects
    if (sz > 2.5) {
      const gGrd = ctx.createRadialGradient(x, y, sz, x, y, sz * 3);
      gGrd.addColorStop(0, `rgba(${cr},${cg},${cb},0.08)`);
      gGrd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, sz * 3, 0, Math.PI * 2);
      ctx.fillStyle = gGrd;
      ctx.fill();
    }
  }

  // Connecting filaments
  if (p > 0.5) {
    const fP = Math.min(1, (p - 0.5) / 0.35);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.04 * fP})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 15; i++) {
      const a1 = rng() * Math.PI * 2;
      const d1 = rng() * 100;
      const a2 = rng() * Math.PI * 2;
      const d2 = rng() * 100;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * d1, cy + Math.sin(a1) * d1 * 0.7);
      ctx.lineTo(cx + Math.cos(a2) * d2, cy + Math.sin(a2) * d2 * 0.7);
      ctx.stroke();
    }
  }
}

// ─── Organic ────────────────────────────────────────────────────────────

function drawOrganic(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  rng: () => number, p: number, t: number,
  cr: number, cg: number, cb: number, rar: number,
) {
  const cx = w / 2, cy = h / 2;

  // Growing tendrils
  const tendrilN = 5 + Math.floor(rar * 5);
  for (let f = 0; f < tendrilN; f++) {
    const baseA = (f / tendrilN) * Math.PI * 2 + t * 0.015;
    const maxL = 50 + rng() * 160;
    const growL = maxL * p;
    const segs = Math.floor(growL / 4);

    ctx.beginPath();
    let fx = cx, fy = cy;
    ctx.moveTo(fx, fy);
    for (let s = 0; s < segs; s++) {
      const st = s / (maxL / 4);
      const angle = baseA + Math.sin(t * 0.4 + s * 0.18 + f * 0.9) * 0.6 * st;
      fx += Math.cos(angle) * 4;
      fy += Math.sin(angle) * 4;
      ctx.lineTo(fx, fy);
    }
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.25 + rng() * 0.25})`;
    ctx.lineWidth = 1.2 + (1 - p) * 1.5;
    ctx.stroke();

    // Bioluminescent nodes
    if (p > 0.3) {
      const nP = Math.min(1, (p - 0.3) / 0.35);
      let nx = cx, ny = cy;
      for (let s = 0; s < segs; s++) {
        const st = s / (maxL / 4);
        const angle = baseA + Math.sin(t * 0.4 + s * 0.18 + f * 0.9) * 0.6 * st;
        nx += Math.cos(angle) * 4;
        ny += Math.sin(angle) * 4;
        if (s % 5 === 0) {
          const pulse = 1 + Math.sin(t * 2.5 + s + f) * 0.35;
          const nr = (2 + rng() * 4) * pulse;
          const nGrd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 2.5);
          nGrd.addColorStop(0, `rgba(${clampC(cr + 70)},${clampC(cg + 70)},${clampC(cb + 30)},${0.45 * nP})`);
          nGrd.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(nx, ny, nr * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = nGrd;
          ctx.fill();
        }
      }
    }
  }

  // Central organism mass
  if (p > 0.15) {
    const mP = Math.min(1, (p - 0.15) / 0.35);
    for (let i = 0; i < 35; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * 25 * mP;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      const r = 4 + rng() * 12;
      const mGrd = ctx.createRadialGradient(x, y, 0, x, y, r);
      mGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.12 * mP})`);
      mGrd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = mGrd;
      ctx.fill();
    }
  }

  // Spore/particle cloud
  if (p > 0.6) {
    const spP = Math.min(1, (p - 0.6) / 0.35);
    for (let i = 0; i < 40 + rar * 20; i++) {
      const a = rng() * Math.PI * 2;
      const d = 20 + rng() * 120;
      const drift = Math.sin(t * 0.8 + i * 0.2) * 8;
      const x = cx + Math.cos(a) * d + drift;
      const y = cy + Math.sin(a) * d * 0.7 + drift * 0.5;
      const sz = 0.5 + rng() * 1.5;
      const twinkle = 0.3 + Math.sin(t * 2 + i) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${clampC(cr + 40)},${clampC(cg + 50)},${cb},${twinkle * spP})`;
      ctx.fill();
    }
  }
}

// ─── Main frame draw ────────────────────────────────────────────────────

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  seed: number,
  progress: number, // 0..1
  time: number, // seconds
  category: RenderCategory,
  cr: number, cg: number, cb: number,
  rarity: number,
) {
  const rng = xorshift(seed);

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background
  const bgA = Math.min(1, progress * 4);
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, `rgba(${8 + (cr >> 5)},${6 + (cg >> 5)},${12 + (cb >> 5)},${bgA})`);
  grad.addColorStop(1, `rgba(3,4,10,${bgA})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Starfield
  if (progress > 0.02) {
    const sA = Math.min(1, (progress - 0.02) / 0.12);
    drawStarfield(ctx, w, h, rng, 250, sA);
  }

  // Ambient glow
  if (progress > 0.06) {
    const gP = Math.min(1, (progress - 0.06) / 0.15);
    const gGrd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 220);
    gGrd.addColorStop(0, `rgba(${cr},${cg},${cb},${0.08 * gP})`);
    gGrd.addColorStop(0.6, `rgba(${cr},${cg},${cb},${0.02 * gP})`);
    gGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = gGrd;
    ctx.fillRect(0, 0, w, h);
  }

  // Main object
  switch (category) {
    case 'nebula': drawNebula(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'star': drawStar(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'galaxy': drawGalaxy(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'phenomenon': drawPhenomenon(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'planet': drawPlanet(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'rings': drawRings(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'cluster': drawCluster(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
    case 'organic': drawOrganic(ctx, w, h, rng, progress, time, cr, cg, cb, rarity); break;
  }

  // CRT scanlines
  ctx.fillStyle = 'rgba(0,10,5,0.035)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }

  // Grid overlay
  if (progress > 0.04) {
    const gridA = Math.min(0.05, (progress - 0.04) * 0.08);
    ctx.strokeStyle = `rgba(68,136,170,${gridA})`;
    ctx.lineWidth = 0.4;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  // Noise
  const nc = Math.floor(300 + progress * 500);
  for (let i = 0; i < nc; i++) {
    const x = rng() * w;
    const y = rng() * h;
    ctx.fillStyle = `rgba(100,160,200,${rng() * 0.04})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export function TelemetryView({
  discovery,
  system,
  onClose,
  onSaveToArchive,
}: {
  discovery: Discovery;
  system: StarSystem;
  onClose: () => void;
  onSaveToArchive?: (discoveryId: string, canvasDataUrl: string) => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [scanProgress, setScanProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const objectName = catalog?.nameUk ?? discovery.type;
  const rarityIdx = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(discovery.rarity);
  const category = CATEGORY_RENDER[discovery.category] ?? 'cluster';

  // Parse color to RGB
  const rc = parseInt(color.slice(1), 16);
  const cr = (rc >> 16) & 0xff;
  const cg = (rc >> 8) & 0xff;
  const cb = rc & 0xff;

  const seed = system.seed * 73 + discovery.timestamp;

  // Generate report
  useEffect(() => {
    setReportText(generateScientificReport(discovery, system, system.seed));
  }, [discovery, system]);

  // Animated scan
  useEffect(() => {
    if (phase !== 'scanning') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = 960;
    const h = 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / SCAN_DURATION_MS);
      const timeSec = elapsed / 1000;

      setScanProgress(p);
      drawFrame(ctx, w, h, seed, p, timeSec, category, cr, cg, cb, rarityIdx);

      if (p >= 1) {
        // Save final frame as image
        setImageDataUrl(canvas.toDataURL('image/png'));
        setPhase('report');
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, seed, category, cr, cg, cb, rarityIdx]);

  const handleReportClose = useCallback(() => {
    setPhase('photo');
  }, []);

  const handleSave = useCallback(() => {
    if (imageDataUrl && !saved) {
      onSaveToArchive?.(discovery.id, imageDataUrl);
      setSaved(true);
    }
  }, [discovery.id, imageDataUrl, onSaveToArchive, saved]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9650,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Phase: Scanning ─────────────────────────────────── */}
      {phase === 'scanning' && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Live animated canvas */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Scan line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${scanProgress * 100}%`,
              height: 2,
              background: 'linear-gradient(90deg, transparent, #44ff88, transparent)',
              boxShadow: '0 0 16px #44ff88, 0 0 40px #44ff8844',
              pointerEvents: 'none',
            }}
          />

          {/* CRT scanlines overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,20,10,0.06) 2px, rgba(0,20,10,0.06) 4px)',
              pointerEvents: 'none',
            }}
          />

          {/* Header — below resource bar */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              padding: '50px 18px 14px',
              background: 'linear-gradient(rgba(0,0,0,0.7), transparent)',
              fontFamily: 'monospace',
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: 10, color: '#44ff88', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              {t('discovery.choice_telemetry')}
            </div>
            <div style={{ fontSize: 12, color: '#8899aa' }}>
              {objectName} — {(scanProgress * 100).toFixed(0)}%
            </div>
            {/* Progress bar */}
            <div style={{
              marginTop: 8, width: 200, height: 3,
              background: 'rgba(30,40,50,0.6)', borderRadius: 2,
            }}>
              <div style={{
                width: `${scanProgress * 100}%`, height: '100%',
                background: 'linear-gradient(90deg, #2266aa, #44ff88)',
                borderRadius: 2,
                transition: 'none',
              }} />
            </div>
          </div>

          {/* Close button — below ResourceDisplay (top-right, z-index 9700) */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 56, right: 16,
              background: 'none',
              border: '1px solid #334455',
              color: '#556677',
              padding: '6px 12px',
              fontSize: 11,
              fontFamily: 'monospace',
              borderRadius: 3,
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            {t('common.cancel')}
          </button>

          {/* Data readout panel (bottom-left) */}
          <div
            style={{
              position: 'absolute',
              bottom: 16, left: 16,
              fontFamily: 'monospace',
              fontSize: 9,
              color: '#44886688',
              lineHeight: 1.6,
              zIndex: 1,
            }}
          >
            {scanProgress > 0.05 && <div>SIG: {(scanProgress * 847).toFixed(0)} mJy</div>}
            {scanProgress > 0.15 && <div>SNR: {(3 + scanProgress * 42).toFixed(1)} dB</div>}
            {scanProgress > 0.25 && <div>RES: {(1.2 - scanProgress * 0.9).toFixed(2)} arcsec</div>}
            {scanProgress > 0.4 && <div>INT: {(scanProgress * 30).toFixed(1)}s / 30.0s</div>}
            {scanProgress > 0.6 && <div>CAL: LOCKED</div>}
            {scanProgress > 0.8 && <div style={{ color: '#44ff8888' }}>STATUS: ENHANCING</div>}
          </div>
        </div>
      )}

      {/* ── Phase: Report ──────────────────────────────────── */}
      {phase === 'report' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          {imageDataUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${imageDataUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(8px) brightness(0.3)',
              }}
            />
          )}
          <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
            <ScientificReport
              reportText={reportText}
              objectName={objectName}
              rarity={discovery.rarity}
              onClose={handleReportClose}
            />
          </div>
        </div>
      )}

      {/* ── Phase: Photo ───────────────────────────────────── */}
      {phase === 'photo' && imageDataUrl && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            gap: 16,
          }}
        >
          <div
            style={{
              maxWidth: '90%',
              maxHeight: '65vh',
              borderRadius: 4,
              border: `1px solid ${color}44`,
              overflow: 'hidden',
              boxShadow: `0 0 30px ${color}22`,
            }}
          >
            <img
              src={imageDataUrl}
              alt={objectName}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 14, color: '#ddeeff', marginBottom: 4 }}>{objectName}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span
                style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 3,
                  background: `${color}22`, border: `1px solid ${color}55`,
                  color, textTransform: 'uppercase', letterSpacing: 1,
                }}
              >
                {RARITY_LABELS[discovery.rarity]}
              </span>
              <span
                style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 3,
                  background: 'rgba(40,60,80,0.4)',
                  border: '1px solid rgba(60,80,100,0.3)',
                  color: '#667788', letterSpacing: 1,
                }}
              >
                {t('research.telemetry')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {onSaveToArchive && (
              <button
                onClick={handleSave}
                disabled={saved}
                style={{
                  padding: '8px 18px',
                  background: saved ? `${color}11` : `${color}22`,
                  border: `1px solid ${saved ? `${color}33` : `${color}66`}`,
                  borderRadius: 4,
                  color: saved ? `${color}88` : color,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  cursor: saved ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                  opacity: saved ? 0.6 : 1,
                }}
              >
                {saved ? t('telemetry.in_collection') : t('telemetry.add_to_collection')}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                background: 'rgba(20,30,40,0.6)',
                border: '1px solid #445566',
                borderRadius: 4,
                color: '#8899aa',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
