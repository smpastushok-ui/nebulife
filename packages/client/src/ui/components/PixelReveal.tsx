import React, { useEffect, useRef, useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// PixelReveal — two-phase image reveal on canvas
// ---------------------------------------------------------------------------
// Phase 1: Green curtain sweeps left-to-right (~1.5s)
// Phase 2: Image pixels appear chaotically over green (~30s)
// ---------------------------------------------------------------------------

const BLOCK_SIZE = 4;          // pixels per reveal block
const TICK_MS = 50;            // refresh interval
const GREEN_SWEEP_MS = 1500;   // green curtain duration
const GREEN_HEX = '#44ff88';   // curtain color

/** Simple seeded PRNG (xorshift) for deterministic shuffle */
function shuffleWithSeed(arr: number[], seed: number): void {
  let s = seed | 0 || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    const j = ((s >>> 0) % (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export interface PixelRevealProps {
  /** The full image to reveal (already downloaded). */
  imageBlob: Blob;
  /** Total reveal duration in ms (default 30_000 = 30 sec). */
  duration?: number;
  /** Deterministic seed for shuffle order. */
  seed?: number;
  /** Called with progress 0-1. */
  onProgress?: (progress: number) => void;
  /** Called when reveal is complete. */
  onComplete?: () => void;
  /** External skip trigger. */
  skip?: boolean;
}

export function PixelReveal({
  imageBlob,
  duration = 30_000,
  seed = 42,
  onProgress,
  onComplete,
  skip = false,
}: PixelRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    revealed: 0,
    totalBlocks: 0,
    order: [] as number[],
    running: true,
    completed: false,
    phase: 'sweep' as 'sweep' | 'reveal',
    sweepProgress: 0,
  });

  const [progress, setProgress] = useState(0);

  // Load image from blob
  const loadImage = useCallback(async () => {
    const url = URL.createObjectURL(imageBlob);
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }, [imageBlob]);

  // Build fully random block order (chaotic, not centre-weighted)
  const buildOrder = useCallback(
    (w: number, h: number): number[] => {
      const bw = Math.ceil(w / BLOCK_SIZE);
      const bh = Math.ceil(h / BLOCK_SIZE);
      const total = bw * bh;
      const indices = Array.from({ length: total }, (_, i) => i);
      shuffleWithSeed(indices, seed);
      return indices;
    },
    [seed],
  );

  // Main effect: set up canvas + animation
  useEffect(() => {
    let animId: number | null = null;
    let startTime = 0;
    const st = stateRef.current;

    const setup = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const img = await loadImage();

      // Wait for CSS layout to compute actual dimensions (mobile flex can be delayed)
      let cw = canvas.clientWidth;
      let ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) {
        await new Promise<void>((resolve) => {
          let tries = 0;
          const check = () => {
            cw = canvas.clientWidth;
            ch = canvas.clientHeight;
            if ((cw > 0 && ch > 0) || tries++ > 20) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
        });
      }
      // Final fallback: use parent or viewport dimensions
      if (cw === 0 || ch === 0) {
        const parent = canvas.parentElement;
        cw = parent?.clientWidth || window.innerWidth;
        ch = parent?.clientHeight || window.innerHeight;
      }

      // Fill canvas to viewport
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;

      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // Draw image to offscreen canvas for sampling
      const offscreen = document.createElement('canvas');
      offscreen.width = cw;
      offscreen.height = ch;
      const offCtx = offscreen.getContext('2d')!;

      // Fit image cover-style
      const imgRatio = img.width / img.height;
      const canvasRatio = cw / ch;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > canvasRatio) {
        sw = img.height * canvasRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / canvasRatio;
        sy = (img.height - sh) / 2;
      }
      offCtx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

      // Start fully black
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);

      // Build reveal order
      st.order = buildOrder(cw, ch);
      st.totalBlocks = st.order.length;
      st.revealed = 0;
      st.running = true;
      st.completed = false;
      st.phase = 'sweep';
      st.sweepProgress = 0;

      const bw = Math.ceil(cw / BLOCK_SIZE);
      const blocksPerTick = Math.max(1, Math.floor(st.totalBlocks / (duration / TICK_MS)));

      startTime = performance.now();

      const tick = (now: number) => {
        if (!st.running) return;

        const elapsed = now - startTime;

        // ── Phase 1: Green curtain sweep (left to right) ──
        if (st.phase === 'sweep') {
          if (skip) {
            // Skip: fill green instantly, move to reveal
            ctx.fillStyle = GREEN_HEX;
            ctx.fillRect(0, 0, cw, ch);
            st.phase = 'reveal';
            startTime = now; // reset for reveal phase
            animId = requestAnimationFrame(tick);
            return;
          }

          const sweepFrac = Math.min(1, elapsed / GREEN_SWEEP_MS);
          st.sweepProgress = sweepFrac;

          // Draw green columns from left to right
          const sweepX = Math.floor(sweepFrac * cw);

          // Clear to black first, then draw green up to sweepX
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = GREEN_HEX;
          ctx.fillRect(0, 0, sweepX, ch);

          // Bright scan line at the sweep edge
          if (sweepFrac < 1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(sweepX - 2, 0, 3, ch);
            ctx.fillStyle = 'rgba(68, 255, 136, 0.4)';
            ctx.fillRect(sweepX - 6, 0, 8, ch);
          }

          if (sweepFrac >= 1) {
            // Sweep complete — fill fully green, switch to reveal
            ctx.fillStyle = GREEN_HEX;
            ctx.fillRect(0, 0, cw, ch);
            st.phase = 'reveal';
            startTime = now; // reset timer for reveal phase
          }

          animId = requestAnimationFrame(tick);
          return;
        }

        // ── Phase 2: Chaotic pixel reveal over green ──
        if (now - startTime < TICK_MS * Math.floor(st.revealed / blocksPerTick) && !skip) {
          animId = requestAnimationFrame(tick);
          return;
        }

        // Reveal blocks
        const revealCount = skip ? st.totalBlocks : blocksPerTick;
        const end = Math.min(st.revealed + revealCount, st.totalBlocks);

        for (let i = st.revealed; i < end; i++) {
          const idx = st.order[i];
          const bx = (idx % bw) * BLOCK_SIZE;
          const by = Math.floor(idx / bw) * BLOCK_SIZE;
          const w = Math.min(BLOCK_SIZE, cw - bx);
          const h = Math.min(BLOCK_SIZE, ch - by);

          // Copy image pixels from offscreen over the green
          const imgData = offCtx.getImageData(bx, by, w, h);
          ctx.putImageData(imgData, bx, by);
        }

        st.revealed = end;
        const p = st.revealed / st.totalBlocks;
        setProgress(p);
        onProgress?.(p);

        if (st.revealed >= st.totalBlocks) {
          // Final clean pass — redraw full image
          ctx.drawImage(offscreen, 0, 0);
          st.running = false;
          st.completed = true;
          onComplete?.();
          return;
        }

        animId = requestAnimationFrame(tick);
      };

      animId = requestAnimationFrame(tick);
    };

    setup().catch(console.error);

    return () => {
      stateRef.current.running = false;
      if (animId) cancelAnimationFrame(animId);
    };
  }, [imageBlob, duration, seed, skip, loadImage, buildOrder, onProgress, onComplete]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          background: '#000',
          imageRendering: 'pixelated',
        }}
      />
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #00ff66 0%, #44ff88 100%)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
}
