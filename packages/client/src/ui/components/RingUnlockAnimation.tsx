// ---------------------------------------------------------------------------
// RingUnlockAnimation — full-screen 4.8s cinematic shown when the player's
// effectiveMaxRing jumps up (e.g. after an ast-probe tech completes).
//
// Phase A (0-2.4s): chaotic capillary threads grow from the centre outward —
//   a "nervous system is reaching farther" demonstration of the new zone
//   becoming reachable. 28 branches, each with random start-angle, length,
//   curvature and spawn delay so the growth never looks mechanical.
//
// Phase B (2.4-4.8s): the unlocked orbital ring resolves into system nodes
//   and pulses once in sequence, so the player reads it as "new systems".
//
// Input is blocked through a transparent full-screen div. All overlays are
// expected to be pre-closed by the caller. The component calls `onComplete`
// after 4800ms so App.tsx can release the UI lock.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Branch {
  angle: number;        // radians — direction from centre
  baseLength: number;   // world-units from centre
  curve: number;        // ±1 — controls how the branch bends
  spawnDelay: number;   // seconds (0..2.4)
  growDuration: number; // seconds (typ. 0.6..1.0)
  /** Resolved tip position in screen coords (computed on resize / branch init). */
  tipX: number;
  tipY: number;
  /** Pulse phase offset within phase B (0..1 inside the 3s block). */
  pulseOffset: number;
}

const TOTAL_DURATION_MS = 4800;
const PHASE_A_MS = 2400;
const MAX_DPR = 2;

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getRingNodeCount(ring: number): number {
  if (ring <= 0) return 1;
  if (ring <= 2) return ring * 6;
  return Math.min(42, 12 + (ring - 2) * 8);
}

export interface RingUnlockAnimationProps {
  newRing: number;
  onComplete: () => void;
}

export const RingUnlockAnimation: React.FC<RingUnlockAnimationProps> = ({ newRing, onComplete }) => {
  const { t } = useTranslation();
  const unlockedNodeCount = getRingNodeCount(newRing);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const branchesRef = useRef<Branch[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Setup: DPR-aware canvas + branch seeding ──────────────────────────
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedBranches();
    };

    const seedBranches = () => {
      const count = newRing <= 2 ? 24 : 32;
      const maxReach = Math.min(cssW, cssH) * 0.46;
      const cx = cssW / 2;
      const cy = cssH / 2;
      const out: Branch[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rand(-0.18, 0.18);
        const baseLength = maxReach * rand(0.65, 1.0);
        const curve = rand(-1, 1);
        const spawnDelay = rand(0, 1.75);
        const growDuration = rand(0.45, 0.8);
        // Resolve tip position once, so the pulse in phase B lines up with
        // where the growing branch actually ended.
        const tipX = cx + Math.cos(angle) * baseLength + curve * 40 * Math.sin(angle);
        const tipY = cy + Math.sin(angle) * baseLength - curve * 40 * Math.cos(angle);
        out.push({ angle, baseLength, curve, spawnDelay, growDuration, tipX, tipY, pulseOffset: rand(0, 0.85) });
      }
      branchesRef.current = out;
    };

    resize();
    window.addEventListener('resize', resize);

    // ── RAF loop ──────────────────────────────────────────────────────────
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const elapsedSec = elapsed / 1000;

      const cx = cssW / 2;
      const cy = cssH / 2;
      const minDim = Math.min(cssW, cssH);
      const unlockedRadius = Math.max(96, minDim * 0.34);
      const nodeCount = getRingNodeCount(newRing);
      const phaseA = Math.min(1, elapsed / PHASE_A_MS);
      const phaseB = Math.max(0, Math.min(1, (elapsed - PHASE_A_MS) / (TOTAL_DURATION_MS - PHASE_A_MS)));

      // Background — slight vignette on top of the body's #020510 so the
      // animation reads as a dedicated cinematic rather than a popup.
      ctx.clearRect(0, 0, cssW, cssH);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cssW, cssH) * 0.7);
      grad.addColorStop(0, 'rgba(10,20,40,0.55)');
      grad.addColorStop(1, 'rgba(2,5,16,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);

      // Quiet star dust: cheap fixed math, no stored particles, just enough
      // depth to make the unlock feel cosmic instead of a flat modal.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 90; i++) {
        const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * cssW;
        const y = (Math.sin(i * 47.3 + 2.1) * 0.5 + 0.5) * cssH;
        const twinkle = 0.22 + 0.2 * Math.sin(elapsedSec * 1.8 + i);
        ctx.fillStyle = `rgba(150,185,220,${twinkle})`;
        ctx.fillRect(x, y, i % 7 === 0 ? 1.4 : 0.8, i % 7 === 0 ? 1.4 : 0.8);
      }
      ctx.restore();

      // The actual unlocked ring. This is the readability layer: the player
      // should instantly understand that a new orbital band became active.
      const ringReveal = easeInOutCubic(phaseA);
      const ringAlpha = 0.1 + ringReveal * 0.55;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(elapsedSec * 0.05);
      ctx.beginPath();
      ctx.arc(0, 0, unlockedRadius * ringReveal, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(123,184,255,${ringAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 10]);
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(123,184,255,0.35)';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, unlockedRadius * 0.58 * ringReveal, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(68,255,136,${0.08 + ringReveal * 0.16})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // ── Phase A: grow branches from centre ──
      const inPhaseA = elapsed < PHASE_A_MS;
      ctx.lineCap = 'round';

      for (const b of branchesRef.current) {
        const t01 = Math.max(0, Math.min(1, (elapsedSec - b.spawnDelay) / b.growDuration));
        if (t01 <= 0) continue;
        const grown = easeOutCubic(t01);

        // Quadratic Bezier control point for organic bend.
        const segments = 18;
        const dx = Math.cos(b.angle) * b.baseLength;
        const dy = Math.sin(b.angle) * b.baseLength;
        const ctrlX = cx + dx * 0.5 + b.curve * 55 * Math.sin(b.angle);
        const ctrlY = cy + dy * 0.5 - b.curve * 55 * Math.cos(b.angle);
        const endX = cx + dx + b.curve * 40 * Math.sin(b.angle);
        const endY = cy + dy - b.curve * 40 * Math.cos(b.angle);

        ctx.beginPath();
        for (let s = 0; s <= segments; s++) {
          const u = (s / segments) * grown;
          const inv = 1 - u;
          const x = inv * inv * cx + 2 * inv * u * ctrlX + u * u * endX;
          const y = inv * inv * cy + 2 * inv * u * ctrlY + u * u * endY;
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }

        const alpha = inPhaseA ? 0.85 : 0.45;
        ctx.strokeStyle = `rgba(123,184,255,${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(123,184,255,0.6)';
        ctx.stroke();

        // Leading "growth bead" — only while still growing, makes the tip
        // feel alive rather than a hard line that just pops in.
        if (t01 < 1 && inPhaseA) {
          const invU = 1 - grown;
          const bx = invU * invU * cx + 2 * invU * grown * ctrlX + grown * grown * endX;
          const by = invU * invU * cy + 2 * invU * grown * ctrlY + grown * grown * endY;
          ctx.beginPath();
          ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(170,210,255,0.95)';
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(123,184,255,0.9)';
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      // Newly unlocked system nodes on the ring. These are separate from the
      // organic capillaries because the reward should be concrete and readable.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2 + Math.sin(i * 1.7) * 0.035;
        const activeWindow = Math.max(0, Math.min(1, (phaseB - i / nodeCount * 0.62) / 0.2));
        const nodePulse = activeWindow > 0 && activeWindow < 1 ? Math.sin(activeWindow * Math.PI) : 0;
        const r = unlockedRadius + Math.sin(i * 2.3) * 7;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const baseAlpha = inPhaseA ? ringReveal * 0.35 : 0.48 + nodePulse * 0.45;

        ctx.beginPath();
        ctx.arc(x, y, 2.4 + nodePulse * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190,220,255,${baseAlpha})`;
        ctx.shadowBlur = 10 + nodePulse * 18;
        ctx.shadowColor = nodePulse > 0.15 ? 'rgba(68,255,136,0.75)' : 'rgba(123,184,255,0.45)';
        ctx.fill();

        if (nodePulse > 0.05) {
          ctx.beginPath();
          ctx.arc(x, y, 8 + nodePulse * 28, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(68,255,136,${(1 - activeWindow) * 0.45})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── Phase B: sequential radial pulses at every capillary tip ──
      if (!inPhaseA) {
        const phaseBSec = elapsedSec - PHASE_A_MS / 1000; // 0..2.4
        for (const b of branchesRef.current) {
          // Each tip gets a 0.9s pulse window starting at its own offset.
          // Offsets are spread across 0..0.85 so the last pulse still has a
          // full 0.9s envelope before the 3s window closes.
          const pulseStart = b.pulseOffset * (2.4 - 0.9);
          const pt = (phaseBSec - pulseStart) / 0.9;
          if (pt < 0 || pt > 1) {
            // Draw a dim marker so the tip doesn't disappear before its turn.
            ctx.beginPath();
            ctx.arc(b.tipX, b.tipY, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(123,184,255,0.35)';
            ctx.fill();
            continue;
          }
          // Core dot stays bright through the whole pulse.
          ctx.beginPath();
          ctx.arc(b.tipX, b.tipY, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,225,255,1)';
          ctx.shadowBlur = 14;
          ctx.shadowColor = 'rgba(123,184,255,0.9)';
          ctx.fill();
          // Expanding ring.
          const ringR = 4 + pt * 38;
          const ringAlpha = (1 - pt) * 0.8;
          ctx.beginPath();
          ctx.arc(b.tipX, b.tipY, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(123,184,255,${ringAlpha})`;
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // ── Completion ──
      if (elapsed >= TOTAL_DURATION_MS) {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [newRing, onComplete]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ring unlocked"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10100, // above cinematic (10000) and tutorial skip (10052)
        background: '#020510',
        fontFamily: 'monospace',
        color: '#aabbcc',
        overflow: 'hidden',
        // Swallow all pointer events — nothing below can be interacted with.
        pointerEvents: 'auto',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStartCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block',
        }}
      />
      {/* Title + ring number */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(22% + env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          letterSpacing: 6,
          textTransform: 'uppercase',
          animation: 'ringUnlockFadeIn 0.9s ease-out',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 11, color: '#556677', marginBottom: 10 }}>
          {t('ring_unlock.banner')}
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#7bb8ff',
            fontWeight: 400,
            textShadow: '0 0 18px rgba(123,184,255,0.55)',
          }}
        >
          {t('ring_unlock.ring_label', { ring: newRing })}
        </div>
        <div style={{ fontSize: 10, color: '#445566', marginTop: 14, letterSpacing: 3 }}>
          {t('ring_unlock.subtitle')}
        </div>
        <div style={{ fontSize: 11, color: '#7fd9a6', marginTop: 18, letterSpacing: 4 }}>
          {t('ring_unlock.systems_online', { count: unlockedNodeCount })}
        </div>
      </div>

      <style>{`
        @keyframes ringUnlockFadeIn {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};
