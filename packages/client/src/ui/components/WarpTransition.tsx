/**
 * WarpTransition — full-screen star-trail warp overlay
 *
 * Used for canvas transitions between Three.js (universe) and PixiJS (game).
 * Renders 300 radial star trails on a 2D canvas overlay.
 *
 * Props:
 *  - active: triggers warp animation
 *  - duration: total animation time (default 1500ms)
 *  - onMidpoint: fires at ~40% — swap canvases here
 *  - onComplete: fires when animation ends
 */
import { useEffect, useRef, useCallback } from 'react';

interface WarpTransitionProps {
  active: boolean;
  duration?: number;
  onMidpoint?: () => void;
  onComplete?: () => void;
}

const WARP_STAR_COUNT = 300;

interface WarpStar {
  angle: number;
  radius: number;
  speed: number;
  brightness: number;
  hue: number;
}

function createWarpStars(): WarpStar[] {
  const stars: WarpStar[] = [];
  for (let i = 0; i < WARP_STAR_COUNT; i++) {
    stars.push({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random(),
      speed: 0.3 + Math.random() * 1.5,
      brightness: 0.4 + Math.random() * 0.6,
      hue: Math.random() > 0.7 ? 200 + Math.random() * 40 : 40 + Math.random() * 20,
    });
  }
  return stars;
}

function drawWarpFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  stars: WarpStar[],
  intensity: number,
): void {
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  ctx.clearRect(0, 0, W, H);

  // Radial vignette
  const vignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  vignette.addColorStop(0, 'rgba(5,10,20,0.0)');
  vignette.addColorStop(0.7, 'rgba(5,10,20,0.3)');
  vignette.addColorStop(1, 'rgba(2,5,16,0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    star.radius += star.speed * 0.012 * intensity;
    if (star.radius > 1.5) {
      star.radius = Math.random() * 0.05;
      star.angle = Math.random() * Math.PI * 2;
      star.speed = 0.3 + Math.random() * 1.5;
    }

    const r = star.radius * maxR;
    const x = cx + Math.cos(star.angle) * r;
    const y = cy + Math.sin(star.angle) * r;

    const trailLen = Math.min(r * 0.3, 80) * intensity * star.speed;
    const x2 = cx + Math.cos(star.angle) * Math.max(0, r - trailLen);
    const y2 = cy + Math.sin(star.angle) * Math.max(0, r - trailLen);

    const t = star.radius;
    const alpha = Math.min(1, t * 4) * Math.max(0, 1 - t) * star.brightness * intensity;

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x, y);
    const lineWidth = (0.5 + star.radius * 2) * intensity;
    ctx.lineWidth = Math.max(0.5, lineWidth);
    ctx.strokeStyle = `hsla(${star.hue}, 60%, ${50 + star.brightness * 30}%, ${alpha})`;
    ctx.stroke();

    if (alpha > 0.3) {
      ctx.beginPath();
      ctx.arc(x, y, lineWidth * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${star.hue}, 40%, 90%, ${alpha * 0.7})`;
      ctx.fill();
    }
  }
}

export function WarpTransition({ active, duration = 1500, onMidpoint, onComplete }: WarpTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<WarpStar[]>(createWarpStars());
  const animRef = useRef<number>(0);
  const midpointFiredRef = useRef(false);
  const startTimeRef = useRef(0);

  const runAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;

    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(1, elapsed / duration);

    // Intensity curve: ramp up → peak → fade out
    let intensity: number;
    if (progress < 0.15) {
      intensity = progress / 0.15; // ramp up
    } else if (progress < 0.6) {
      intensity = 1.0; // peak
    } else {
      intensity = Math.max(0, (1 - progress) / 0.4); // fade out
    }

    // Fire midpoint callback at ~40%
    if (progress >= 0.4 && !midpointFiredRef.current) {
      midpointFiredRef.current = true;
      onMidpoint?.();
    }

    drawWarpFrame(ctx, canvas, starsRef.current, intensity);

    if (progress < 1) {
      animRef.current = requestAnimationFrame(runAnimation);
    } else {
      canvas.style.opacity = '0';
      onComplete?.();
    }
  }, [duration, onMidpoint, onComplete]);

  useEffect(() => {
    if (active) {
      midpointFiredRef.current = false;
      startTimeRef.current = performance.now();
      starsRef.current = createWarpStars();
      const canvas = canvasRef.current;
      if (canvas) canvas.style.opacity = '1';
      animRef.current = requestAnimationFrame(runAnimation);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.opacity = '0';
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, runAnimation]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9000,
        opacity: 0,
        transition: 'opacity 0.3s',
      }}
    />
  );
}
