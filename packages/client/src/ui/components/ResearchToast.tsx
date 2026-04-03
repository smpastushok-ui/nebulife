/**
 * ResearchToast — branch-specific animated notification for tech research completion.
 *
 * Slides in from right with branch-unique animations + canvas VFX:
 * - Biology   (green):  Organic fade+scale, rotating DNA helix, floating spores
 * - Physics   (orange): Bounce snap, electric sparks on edges, glitch overlay
 * - Astronomy (blue):   Slow blur-to-clear fade, constellation lines + radar sweep
 * - Chemistry (violet): Liquid fill from bottom, glowing hexagonal grid
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ResearchToastItem {
  id:       string;
  techId:   string;   // node.id — used for i18n key 'tech.{techId}.name'
  techName: string;   // fallback display name
  branch:   'biology' | 'physics' | 'astronomy' | 'chemistry';
}

interface ResearchToastProps {
  items:      ResearchToastItem[];
  onDismiss:  (id: string) => void;
  onNavigate: (branch: ResearchToastItem['branch']) => void;
}

// ── Branch config ──────────────────────────────────────────────────────────

const BRANCH_COLOR: Record<ResearchToastItem['branch'], string> = {
  biology:   '#44ff88',
  physics:   '#ff8844',
  astronomy: '#4488aa',
  chemistry: '#8844ff',
};

const BRANCH_LABEL_KEY: Record<ResearchToastItem['branch'], string> = {
  biology:   'toast.branch_bio',
  physics:   'toast.branch_phy',
  astronomy: 'toast.branch_ast',
  chemistry: 'toast.branch_chem',
};

// ── Dimensions ─────────────────────────────────────────────────────────────

const TOAST_W = 286;
const TOAST_H = 74;

// ── CSS Injection ──────────────────────────────────────────────────────────

const STYLE_ID = 'nebu-toast-styles-v4';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  // Remove any older version
  document.getElementById('nebu-toast-styles-v3')?.remove();
  document.getElementById('nebu-toast-styles-v2')?.remove();
  document.getElementById('nebu-toast-styles-v1')?.remove();
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
/* ── Biology: organic fade + scale ── */
@keyframes bio-toast-in {
  from { transform: scale(0.90); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

/* ── Physics: sharp bounce snap ── */
@keyframes phy-toast-in {
  0%   { transform: scale(0.88); opacity: 0; }
  10%  { opacity: 1; }
  60%  { transform: scale(1.04); }
  80%  { transform: scale(0.98); }
  94%  { transform: scale(1.01); }
  100% { transform: scale(1);    }
}

/* Physics glitch overlay — one-shot electric flicker after snap */
@keyframes phy-glitch {
  0%   { opacity: 0; clip-path: none; transform: translateX(0); }
  12%  { opacity: 0.55; clip-path: polygon(0 15%,100% 15%,100% 38%,0 38%); transform: translateX(-3px); }
  28%  { opacity: 0.40; clip-path: polygon(0 55%,100% 55%,100% 78%,0 78%); transform: translateX( 3px); }
  50%  { opacity: 0.50; clip-path: polygon(0  2%,100%  2%,100% 22%,0 22%); transform: translateX(-2px); }
  72%  { opacity: 0.20; clip-path: polygon(0 80%,100% 80%,100% 100%,0 100%); transform: translateX(1px); }
  100% { opacity: 0; clip-path: none; transform: translateX(0); }
}

/* ── Astronomy: slow blur-to-clear drift ── */
@keyframes ast-toast-in {
  from { transform: scale(0.90); filter: blur(6px); opacity: 0; }
  to   { transform: scale(1);    filter: blur(0);   opacity: 1; }
}
@keyframes ast-toast-out {
  from { transform: scale(1);    filter: blur(0);   opacity: 1; }
  to   { transform: scale(0.90); filter: blur(4px); opacity: 0; }
}

/* ── Chemistry: liquid fill from bottom ── */
@keyframes chem-toast-in {
  0%   { transform: scale(0.95); clip-path: inset(100% 0 0 0); opacity: 1; }
  40%  { transform: scale(1);    clip-path: inset(100% 0 0 0); opacity: 1; }
  100% { transform: scale(1);    clip-path: inset(0%   0 0 0); opacity: 1; }
}

/* ── Generic exit ── */
@keyframes toast-out-slide {
  from { transform: scale(1);    opacity: 1; }
  to   { transform: scale(0.88); opacity: 0; }
}
  `;
  document.head.appendChild(s);
}

// ── Entry/exit animations per branch ──────────────────────────────────────

const ENTRY_ANIM: Record<ResearchToastItem['branch'], string> = {
  biology:   'bio-toast-in  0.45s cubic-bezier(.22,.68,0,1.15) forwards',
  physics:   'phy-toast-in  0.40s cubic-bezier(.17,.67,.14,1.0) forwards',
  astronomy: 'ast-toast-in  0.65s ease-out forwards',
  chemistry: 'chem-toast-in 0.65s ease-out forwards',
};

const EXIT_ANIM: Record<ResearchToastItem['branch'], string> = {
  biology:   'toast-out-slide 0.30s ease-in forwards',
  physics:   'toast-out-slide 0.18s ease-in forwards',
  astronomy: 'ast-toast-out   0.40s ease-in forwards',
  chemistry: 'toast-out-slide 0.28s ease-in forwards',
};

const EXIT_MS: Record<ResearchToastItem['branch'], number> = {
  biology:   320,
  physics:   200,
  astronomy: 420,
  chemistry: 300,
};

// ── Canvas VFX — Biology ───────────────────────────────────────────────────

function drawBiology(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);

  const cy     = h / 2;
  const period = 48;         // px per full turn
  const amp    = 10;         // helix amplitude
  const speed  = 1.0;        // rad / s

  // DNA double helix — two sinusoidal strands
  for (let x = 0; x <= w; x += 3) {
    const phase = (x / period) * Math.PI * 2 - t * speed;
    const y1 = cy + Math.sin(phase) * amp;
    const y2 = cy + Math.sin(phase + Math.PI) * amp;
    const d  = (Math.cos(phase) + 1) * 0.5; // 0 = back, 1 = front

    ctx.globalAlpha = 0.08 + d * 0.20;
    ctx.fillStyle   = '#44ff88';
    ctx.fillRect(x, y1 - 1, 3, 2);

    ctx.globalAlpha = 0.08 + (1 - d) * 0.20;
    ctx.fillStyle   = '#22cc66';
    ctx.fillRect(x, y2 - 1, 3, 2);
  }

  // Rungs every half-period
  const rungStep = period / 2;
  for (let rx = rungStep * 0.5; rx < w; rx += rungStep) {
    const phase = (rx / period) * Math.PI * 2 - t * speed;
    const y1 = cy + Math.sin(phase) * amp;
    const y2 = cy + Math.sin(phase + Math.PI) * amp;
    ctx.globalAlpha = 0.11;
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(rx, y1);
    ctx.lineTo(rx, y2);
    ctx.stroke();
  }

  // Floating spore dots — 9 particles drifting upward, looping
  for (let i = 0; i < 9; i++) {
    const bx = (w * (i + 0.5)) / 9 + Math.sin(t * 0.7 + i * 2.1) * 8;
    const by = h - ((t * 14 + i * 8.5) % (h + 8));
    const sa = Math.max(0, Math.min(1, by / (h * 0.9)));
    ctx.globalAlpha = 0.30 * sa;
    ctx.fillStyle   = '#88ffbb';
    ctx.beginPath();
    ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

// ── Canvas VFX — Physics ───────────────────────────────────────────────────

// Pre-baked spark endpoints: [x1,y1, x2,y2, phaseOffset]
const PHY_SPARKS: [number, number, number, number, number][] = [
  [14,  0,  7, 10, 0.00],
  [84,  0, 92, 12, 0.35],
  [157, 0, 150, 14, 0.72],
  [226, 0, 235,  9, 0.18],
  [TOAST_W,  20, TOAST_W - 11, 13, 0.55],
  [TOAST_W,  47, TOAST_W - 13, 50, 0.90],
  [TOAST_W,  67, TOAST_W -  9, 60, 0.28],
  [0, 24, 12, 18, 0.67],
  [0, 54, 14, 50, 0.43],
  [108, TOAST_H, 113, TOAST_H - 13, 0.08],
  [202, TOAST_H, 196, TOAST_H - 11, 0.81],
  [ 36, 0, 29, 15, 0.62],
];

function drawPhysics(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);

  // Subtle energy-field grid
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#ff8844';
  ctx.lineWidth   = 0.5;
  const gs = 16;
  for (let gx = 0; gx < w; gx += gs) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += gs) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  // Electric sparks — each visible for 0.25 s every 1.8 s
  for (const [x1, y1, x2, y2, ph] of PHY_SPARKS) {
    const st = ((t * 2 + ph) % 1.8);
    if (st > 0.25) continue;
    const a = (0.25 - st) / 0.25;

    ctx.globalAlpha = a * 0.85;
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth   = 1.5;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ff8844';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Bright endpoint dot
    ctx.globalAlpha = a * 0.95;
    ctx.fillStyle   = '#fff';
    ctx.beginPath();
    ctx.arc(x2, y2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

// ── Canvas VFX — Astronomy ─────────────────────────────────────────────────

// Constellation star positions (x, y)
const AST_STARS: [number, number][] = [
  [22, 11], [68, 22], [108,  8], [148, 28], [200, 13], [246, 21],
  [50, 54], [124, 47], [180, 58], [228, 42], [264, 53],
];

// Edges between star indices
const AST_EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],
  [1,3],[3,5],
  [6,7],[7,8],[8,9],[9,10],
  [7,9],[0,6],[4,9],
];

function drawAstronomy(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);

  // Radar sweep x — full width every 3 s
  const sweepX = ((t % 3) / 3) * w;

  // Constellation edges — brighten when radar sweeps over
  ctx.lineWidth = 0.5;
  for (const [a, b] of AST_EDGES) {
    const [ax, ay] = AST_STARS[a];
    const [bx, by] = AST_STARS[b];
    const midX  = (ax + bx) / 2;
    const prox  = Math.max(0, 1 - Math.abs(midX - sweepX) / 40);
    ctx.globalAlpha = 0.10 + 0.40 * prox;
    ctx.strokeStyle = `rgba(68,136,170,1)`;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // Stars — light up as radar sweeps through
  for (const [sx, sy] of AST_STARS) {
    const prox    = Math.max(0, 1 - Math.abs(sx - sweepX) / 28);
    const twinkle = 0.65 + 0.35 * Math.sin(t * 2.8 + sx * 0.08);
    ctx.globalAlpha = (0.18 + 0.70 * prox) * twinkle;
    ctx.fillStyle   = prox > 0.5 ? '#ffffff' : '#7bb8ff';
    ctx.beginPath();
    ctx.arc(sx, sy, prox > 0.55 ? 2.0 : 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radar sweep gradient band
  const grad = ctx.createLinearGradient(sweepX - 32, 0, sweepX + 5, 0);
  grad.addColorStop(0, 'rgba(68,136,170,0)');
  grad.addColorStop(0.75, 'rgba(68,136,170,0.16)');
  grad.addColorStop(1, 'rgba(130,200,230,0.38)');
  ctx.globalAlpha = 1;
  ctx.fillStyle   = grad;
  ctx.fillRect(sweepX - 32, 0, 37, h);

  ctx.globalAlpha = 1;
}

// ── Canvas VFX — Chemistry ─────────────────────────────────────────────────

function drawChemistry(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);

  const R  = 13;
  const HW = R * 1.5;
  const HH = R * Math.sqrt(3);

  // Fill level: 0→1 in 1.6 s (matches clip-path animation timing)
  const fill = Math.min(1, t / 1.6);

  for (let row = -1; row <= Math.ceil(h / HH) + 1; row++) {
    for (let col = -1; col <= Math.ceil(w / HW / 2) + 1; col++) {
      const cx = col * HW * 2 + (row % 2 !== 0 ? HW : 0);
      const cy = row * HH;

      // Only draw hexagons below the fill waterline (bottom-to-top)
      const relY = 1 - cy / h;
      if (relY > fill) continue;

      const phase = t * 0.45 + row * 0.18 + col * 0.25;
      const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      const fade  = Math.min(1, fill * 4);

      ctx.globalAlpha = (0.07 + 0.08 * pulse) * fade;
      ctx.strokeStyle = '#8844ff';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      for (let v = 0; v < 6; v++) {
        const a  = (v * Math.PI) / 3 - Math.PI / 6;
        const hx = cx + R * Math.cos(a);
        const hy = cy + R * Math.sin(a);
        v === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Glowing node at hex center when pulse is high
      if (pulse > 0.75) {
        ctx.globalAlpha = 0.35 * ((pulse - 0.75) / 0.25) * fade;
        ctx.fillStyle   = '#aa66ff';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

function drawVFX(
  ctx: CanvasRenderingContext2D,
  branch: ResearchToastItem['branch'],
  t: number,
  w: number,
  h: number,
): void {
  switch (branch) {
    case 'biology':   drawBiology(ctx, t, w, h);   break;
    case 'physics':   drawPhysics(ctx, t, w, h);   break;
    case 'astronomy': drawAstronomy(ctx, t, w, h); break;
    case 'chemistry': drawChemistry(ctx, t, w, h); break;
  }
}

// ── ToastItem ──────────────────────────────────────────────────────────────

const ToastItem: React.FC<{
  item:       ResearchToastItem;
  onDismiss:  (id: string) => void;
  onNavigate: (branch: ResearchToastItem['branch']) => void;
}> = ({ item, onDismiss, onNavigate }) => {
  const { t } = useTranslation();
  const [leaving, setLeaving] = useState(false);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const startRef   = useRef<number>(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canvas VFX animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    startRef.current = Date.now();

    const loop = (): void => {
      const t = (Date.now() - startRef.current) / 1000;
      drawVFX(ctx, item.branch, t, canvas.width, canvas.height);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [item.branch]);

  // Auto-dismiss
  useEffect(() => {
    injectStyles();
    timerRef.current = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(item.id), EXIT_MS[item.branch]);
    }, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [item.id, item.branch, onDismiss]);

  const color     = BRANCH_COLOR[item.branch];
  const animation = leaving ? EXIT_ANIM[item.branch] : ENTRY_ANIM[item.branch];

  return (
    <div
      onClick={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        onNavigate(item.branch);
        onDismiss(item.id);
      }}
      style={{
        position:    'relative',
        width:       TOAST_W,
        height:      TOAST_H,
        background:  'rgba(5, 9, 18, 0.97)',
        border:      `1px solid ${color}30`,
        borderLeft:  `3px solid ${color}`,
        borderRadius: 4,
        cursor:      'pointer',
        userSelect:  'none',
        overflow:    'hidden',
        animation,
        boxShadow:   `0 4px 24px rgba(0,0,0,0.65), inset 0 0 14px ${color}0a`,
      }}
    >
      {/* VFX canvas — behind content */}
      <canvas
        ref={canvasRef}
        width={TOAST_W}
        height={TOAST_H}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Physics glitch overlay — plays once after snap */}
      {item.branch === 'physics' && !leaving && (
        <div
          style={{
            position:    'absolute',
            inset:        0,
            background:   `${color}28`,
            pointerEvents: 'none',
            animation:    `phy-glitch 0.38s ease-out 0.40s 1 forwards`,
          }}
        />
      )}

      {/* Text content — above canvas */}
      <div
        style={{
          position:       'relative',
          zIndex:          1,
          padding:         '10px 13px 10px 15px',
          height:          '100%',
          boxSizing:       'border-box',
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  'center',
          gap:              4,
        }}
      >
        {/* Branch badge */}
        <div
          style={{
            fontFamily:    'monospace',
            fontSize:       9,
            color,
            letterSpacing:  2.5,
            textTransform:  'uppercase',
            opacity:         0.90,
          }}
        >
          [ {t(BRANCH_LABEL_KEY[item.branch])} ] {t('toast.technology')}
        </div>

        {/* Label */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize:    10,
            color:      '#556677',
          }}
        >
          {t('toast.integrated')}
        </div>

        {/* Tech name — translated via 'tech.{id}.name', fallback to raw name */}
        <div
          style={{
            fontFamily:    'monospace',
            fontSize:       12,
            color:         '#aabbcc',
            letterSpacing:  0.3,
          }}
        >
          &gt; {t(`tech.${item.techId}.name`, { defaultValue: item.techName })}
        </div>
      </div>
    </div>
  );
};

// ── Container ──────────────────────────────────────────────────────────────

export const ResearchToast: React.FC<ResearchToastProps> = ({
  items,
  onDismiss,
  onNavigate,
}) => {
  // Show only one toast at a time (first in queue)
  if (items.length === 0) return null;
  const current = items[0];

  return (
    <div
      style={{
        position:      'fixed',
        left:           '50%',
        top:            '50%',
        transform:      'translate(-50%, -50%)',
        zIndex:         8500,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        pointerEvents:  'all',
      }}
    >
      <ToastItem
        key={current.id}
        item={current}
        onDismiss={onDismiss}
        onNavigate={onNavigate}
      />
    </div>
  );
};
