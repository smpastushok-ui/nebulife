import React, { useEffect, useRef, useState } from 'react';

const WARP_DURATION_MS = 3000;
const STAR_COUNT = 120;

interface WarpOverlayProps {
  systemName: string;
  onComplete: () => void;
}

/**
 * Full-screen warp/hyperspace animation overlay.
 * Phase 1 (0-500ms): radial zoom blur
 * Phase 2 (500-2500ms): star streaks flying toward viewer
 * Phase 3 (2500-3000ms): fade out
 */
export function WarpOverlay({ systemName, onComplete }: WarpOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'zoom' | 'warp' | 'fade'>('zoom');
  const startTimeRef = useRef(Date.now());

  // Generate star positions once
  const starsRef = useRef(
    Array.from({ length: STAR_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      dist: Math.random() * 0.3,
      brightness: 0.5 + Math.random() * 0.5,
    })),
  );

  // Use ref to avoid re-creating timeout when onComplete changes (inline callback)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => onCompleteRef.current(), WARP_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    let animId: number;
    const stars = starsRef.current;

    const draw = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const t = Math.min(1, elapsed / WARP_DURATION_MS);

      // Update phase
      if (t < 0.17) setPhase('zoom');
      else if (t < 0.83) setPhase('warp');
      else setPhase('fade');

      // Clear
      ctx.fillStyle = '#020510';
      ctx.fillRect(0, 0, w, h);

      if (t < 0.17) {
        // Phase 1: radial zoom blur — concentric expanding rings
        const p = t / 0.17; // 0→1
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
          const radius = (p * maxR * 0.6) * (i / ringCount);
          const alpha = (1 - i / ringCount) * 0.15 * p;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(68, 136, 170, ${alpha})`;
          ctx.lineWidth = 2 + p * 4;
          ctx.stroke();
        }
      } else if (t < 0.83) {
        // Phase 2: star streaks flying toward viewer
        const p = (t - 0.17) / 0.66; // 0→1
        for (const star of stars) {
          const d = star.dist + p * star.speed;
          const x = cx + Math.cos(star.angle) * d * maxR;
          const y = cy + Math.sin(star.angle) * d * maxR;
          const prevD = Math.max(0, d - 0.08 * star.speed);
          const px = cx + Math.cos(star.angle) * prevD * maxR;
          const py = cy + Math.sin(star.angle) * prevD * maxR;

          const alpha = star.brightness * Math.min(1, p * 3) * Math.min(1, (1 - p) * 3);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `rgba(170, 200, 255, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Phase 3: fade — just the black bg already drawn, alpha handled by overlay opacity

      // System name text during warp phase
      if (t > 0.2 && t < 0.85) {
        const textAlpha = Math.min(1, (t - 0.2) * 5) * Math.min(1, (0.85 - t) * 5);
        ctx.font = '13px monospace';
        ctx.fillStyle = `rgba(136, 153, 170, ${textAlpha * 0.8})`;
        ctx.textAlign = 'center';
        ctx.fillText(`ENTERING ${systemName.toUpperCase()}`, cx, cy + 60);
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [systemName]);

  // Fade out during last phase
  const elapsed = Date.now() - startTimeRef.current;
  const t = Math.min(1, elapsed / WARP_DURATION_MS);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        opacity: phase === 'fade' ? Math.max(0, 1 - (t - 0.83) / 0.17) : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: 'all',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
