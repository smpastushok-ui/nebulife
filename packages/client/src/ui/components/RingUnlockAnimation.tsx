// ---------------------------------------------------------------------------
// RingUnlockAnimation — full-screen 6s cinematic shown when the player's
// effectiveMaxRing jumps up (e.g. after an ast-probe tech completes).
//
// Phase A (0–3s): chaotic capillary threads grow from the centre outward —
//   a "nervous system is reaching farther" demonstration of the new zone
//   becoming reachable. 28 branches, each with random start-angle, length,
//   curvature and spawn delay so the growth never looks mechanical.
//
// Phase B (3–6s): each newly accessible system (tip of a branch) pulses
//   once in sequence, quickly rippling outward like a sonar ping.
//
// Input is blocked through a transparent full-screen div. All overlays are
// expected to be pre-closed by the caller. The component calls `onComplete`
// after 6000ms so App.tsx can release the UI lock.
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

const TOTAL_DURATION_MS = 6000;
const PHASE_A_MS = 3000;

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface RingUnlockAnimationProps {
  newRing: number;
  onComplete: () => void;
}

export const RingUnlockAnimation: React.FC<RingUnlockAnimationProps> = ({ newRing, onComplete }) => {
  const { t } = useTranslation();
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      const count = 28;
      const maxReach = Math.min(cssW, cssH) * 0.46;
      const cx = cssW / 2;
      const cy = cssH / 2;
      const out: Branch[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rand(-0.18, 0.18);
        const baseLength = maxReach * rand(0.65, 1.0);
        const curve = rand(-1, 1);
        const spawnDelay = rand(0, 2.4);
        const growDuration = rand(0.55, 1.0);
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

      // Background — slight vignette on top of the body's #020510 so the
      // animation reads as a dedicated cinematic rather than a popup.
      ctx.clearRect(0, 0, cssW, cssH);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cssW, cssH) * 0.7);
      grad.addColorStop(0, 'rgba(10,20,40,0.55)');
      grad.addColorStop(1, 'rgba(2,5,16,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);

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

      // ── Phase B: sequential radial pulses at every tip ──
      if (!inPhaseA) {
        const phaseBSec = elapsedSec - PHASE_A_MS / 1000; // 0..3
        for (const b of branchesRef.current) {
          // Each tip gets a 0.9s pulse window starting at its own offset.
          // Offsets are spread across 0..0.85 so the last pulse still has a
          // full 0.9s envelope before the 3s window closes.
          const pulseStart = b.pulseOffset * (3 - 0.9);
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
  }, [onComplete]);

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
