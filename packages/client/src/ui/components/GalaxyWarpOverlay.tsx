import React, { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// GalaxyWarpOverlay — full-screen hyperspace streaks (canvas 2D)
// Ported from galaxy-quantum-final.html
// ---------------------------------------------------------------------------

const HYPERSPACE_DURATION = 750;  // ms
const FADE_DURATION       = 250;  // ms
const TOTAL_DURATION      = HYPERSPACE_DURATION + FADE_DURATION;

// Precomputed star data (deterministic, no Math.random)
const HS_STARS = Array.from({ length: 180 }, (_, i) => {
  const s1 = i * 7919 + 3;
  const s2 = i * 3571 + 117;
  return {
    angle:     ((s1 * 0.6180339887) % 1) * Math.PI * 2,
    startF:    0.01 + ((s2 % 80) / 80) * 0.10,
    speed:     0.28 + ((s1 % 100) / 100) * 0.72,
    width:     0.4 + ((s2 % 10) / 10) * 1.8,
    bright:    0.35 + ((s1 % 8) / 8) * 0.65,
    colorType: s1 % 10,  // 0-7 white, 8 blue, 9 gold
  };
});

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function ease(t: number): number {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function drawHyperspace(ctx: CanvasRenderingContext2D, W: number, H: number, progress: number) {
  // Deep space background
  ctx.fillStyle = 'rgba(2,5,16,1)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const maxD = Math.hypot(W, H) * 0.58;

  for (const hs of HS_STARS) {
    const p = Math.min(1, progress * hs.speed / 0.68);
    if (p <= 0.005) continue;

    const dist1 = (hs.startF + p * 0.92) * maxD;
    const tailLen = (8 + p * 90) * hs.speed;
    const dist0 = Math.max(hs.startF * maxD, dist1 - tailLen);

    if (dist0 > maxD + 20) continue;

    const x1 = cx + Math.cos(hs.angle) * dist0;
    const y1 = cy + Math.sin(hs.angle) * dist0;
    const x2 = cx + Math.cos(hs.angle) * Math.min(dist1, maxD + 30);
    const y2 = cy + Math.sin(hs.angle) * Math.min(dist1, maxD + 30);

    const alpha = Math.min(1, p * 2.5) * hs.bright;
    let r = 205, g = 222, b = 255;
    if (hs.colorType === 8) { r = 150; g = 185; b = 255; }  // blue tint
    if (hs.colorType === 9) { r = 255; g = 215; b = 145; }  // warm gold

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = hs.width;
    ctx.stroke();
  }

  // Fade out toward end of hyperspace
  if (progress > 0.78) {
    const fadeOut = ease((progress - 0.78) / 0.22);
    ctx.fillStyle = `rgba(2,5,16,${fadeOut})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export interface GalaxyWarpOverlayProps {
  onComplete: () => void;
}

export function GalaxyWarpOverlay({ onComplete }: GalaxyWarpOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width;
    const H = canvas.height;

    startRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = now - startRef.current;

      if (elapsed < HYPERSPACE_DURATION) {
        // Hyperspace phase
        const progress = elapsed / HYPERSPACE_DURATION;
        drawHyperspace(ctx, W, H, progress);
      } else if (elapsed < TOTAL_DURATION) {
        // Fade out phase — dark overlay fading from 0 to 1
        const fadeP = (elapsed - HYPERSPACE_DURATION) / FADE_DURATION;
        // Draw last hyperspace frame + darken
        drawHyperspace(ctx, W, H, 1);
        ctx.fillStyle = `rgba(2,5,16,${clamp(fadeP, 0, 1)})`;
        ctx.fillRect(0, 0, W, H);
      } else {
        // Done
        if (!doneRef.current) {
          doneRef.current = true;
          onComplete();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    />
  );
}
