import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Discovery, StarSystem, DiscoveryRarity } from '@nebulife/core';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  getCatalogEntry,
  generateScientificReport,
} from '@nebulife/core';
import type { CatalogEntry } from '@nebulife/core';
import { ScientificReport } from './ScientificReport.js';

// ---------------------------------------------------------------------------
// TelemetryView — Free scanner-based procedural image (no AI / no quarks)
// ---------------------------------------------------------------------------
// Full-screen overlay (like ObservatoryView but free).
// Generates a Canvas-based procedural "scanner image" using SeededRNG.
// Phases: scanning → report → photo
// ---------------------------------------------------------------------------

type Phase = 'scanning' | 'report' | 'photo';

const SCAN_DURATION_MS = 2500;

// Category → shape drawing strategy
type ShapeType = 'circle' | 'ellipse' | 'ring' | 'spiral' | 'cluster' | 'blob';

const CATEGORY_SHAPES: Record<string, ShapeType> = {
  nebulae: 'blob',
  stars: 'circle',
  galaxies: 'spiral',
  phenomena: 'ring',
  'exotic-planets': 'circle',
  'dark-objects': 'ring',
  'star-forming': 'blob',
  binaries: 'cluster',
  'small-bodies': 'cluster',
  rogues: 'ellipse',
  flora: 'blob',
  fauna: 'blob',
  microbes: 'cluster',
};

/** Simple xorshift for Canvas drawing (same algo as SeededRNG in core) */
function xorshift(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

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
  const [phase, setPhase] = useState<Phase>('scanning');
  const [scanProgress, setScanProgress] = useState(0);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const objectName = catalog?.nameUk ?? discovery.type;

  // Generate report
  useEffect(() => {
    const text = generateScientificReport(discovery, system, system.seed);
    setReportText(text);
  }, [discovery, system]);

  // Render procedural image to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = 800;
    const h = 600;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rng = xorshift(system.seed * 73 + discovery.timestamp);
    const rarityIdx = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(discovery.rarity);

    // 1. Background gradient based on rarity
    const bgColors = [
      ['#050810', '#0a1020'],  // common: dark blue
      ['#051018', '#0a1830'],  // uncommon: deeper blue
      ['#100520', '#1a0a35'],  // rare: purple tint
      ['#181005', '#2a1a0a'],  // epic: warm
      ['#180508', '#2a0a10'],  // legendary: red tint
    ];
    const [bgStart, bgEnd] = bgColors[rarityIdx] ?? bgColors[0];
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, bgEnd);
    grad.addColorStop(1, bgStart);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Star field background
    for (let i = 0; i < 200; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = rng() * 1.2;
      const a = 0.2 + rng() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 200, 220, ${a})`;
      ctx.fill();
    }

    // 3. Central object based on category
    const shape = CATEGORY_SHAPES[discovery.category] ?? 'circle';
    const cx = w / 2;
    const cy = h / 2;

    // Parse rarity color to RGB
    const rc = parseInt(color.slice(1), 16);
    const cr = (rc >> 16) & 0xff;
    const cg = (rc >> 8) & 0xff;
    const cb = rc & 0xff;

    // Outer glow
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180);
    glowGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0.15)`);
    glowGrad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.05)`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    switch (shape) {
      case 'circle': {
        // Solid sphere with highlight
        const sGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 80);
        sGrad.addColorStop(0, `rgba(${Math.min(255, cr + 80)},${Math.min(255, cg + 80)},${Math.min(255, cb + 80)},0.8)`);
        sGrad.addColorStop(0.6, `rgba(${cr},${cg},${cb},0.5)`);
        sGrad.addColorStop(1, `rgba(${cr >> 1},${cg >> 1},${cb >> 1},0.2)`);
        ctx.beginPath();
        ctx.arc(cx, cy, 80, 0, Math.PI * 2);
        ctx.fillStyle = sGrad;
        ctx.fill();
        break;
      }
      case 'ellipse': {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.6);
        const eGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
        eGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0.6)`);
        eGrad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, Math.PI * 2);
        ctx.fillStyle = eGrad;
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'ring': {
        for (let r = 60; r < 120; r += 8) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.3 - (r - 60) * 0.003})`;
          ctx.lineWidth = 1.5 + rng() * 2;
          ctx.stroke();
        }
        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.7)`;
        ctx.fill();
        break;
      }
      case 'spiral': {
        ctx.save();
        ctx.translate(cx, cy);
        for (let a = 0; a < Math.PI * 6; a += 0.08) {
          const r = 5 + a * 15;
          const x = Math.cos(a + rng() * 0.2) * r;
          const y = Math.sin(a + rng() * 0.2) * r * 0.6;
          const sz = 1 + rng() * 2.5;
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.4 - a * 0.02})`;
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'cluster': {
        for (let i = 0; i < 50; i++) {
          const angle = rng() * Math.PI * 2;
          const dist = rng() * 100;
          const x = cx + Math.cos(angle) * dist;
          const y = cy + Math.sin(angle) * dist * 0.7;
          const r = 1 + rng() * 4;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.3 + rng() * 0.4})`;
          ctx.fill();
        }
        break;
      }
      case 'blob':
      default: {
        // Organic nebula-like shape
        for (let i = 0; i < 120; i++) {
          const angle = rng() * Math.PI * 2;
          const dist = rng() * 120;
          const x = cx + Math.cos(angle) * dist * (0.8 + rng() * 0.4);
          const y = cy + Math.sin(angle) * dist * (0.6 + rng() * 0.3);
          const r = 5 + rng() * 25;
          const bGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
          bGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.08 + rng() * 0.12})`);
          bGrad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = bGrad;
          ctx.fill();
        }
        break;
      }
    }

    // 4. Scan lines (CRT effect)
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = 'rgba(0, 10, 5, 0.06)';
      ctx.fillRect(0, y, w, 1);
    }

    // 5. Noise overlay
    for (let i = 0; i < 800; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const a = rng() * 0.08;
      ctx.fillStyle = `rgba(100, 160, 200, ${a})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // 6. Grid overlay
    ctx.strokeStyle = 'rgba(68, 136, 170, 0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Store data URL
    setImageDataUrl(canvas.toDataURL('image/png'));
  }, [discovery, system, color]);

  // Scan animation
  useEffect(() => {
    if (phase !== 'scanning') return;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / SCAN_DURATION_MS);
      setScanProgress(p);
      if (p >= 1) {
        setPhase('report');
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const handleReportClose = useCallback(() => {
    setPhase('photo');
  }, []);

  const handleSave = useCallback(() => {
    if (imageDataUrl) {
      onSaveToArchive?.(discovery.id, imageDataUrl);
    }
  }, [discovery.id, imageDataUrl, onSaveToArchive]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 250,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
    >
      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Phase: Scanning ─────────────────────────────────── */}
      {phase === 'scanning' && (
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Show canvas image with scan line overlay */}
          {imageDataUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${imageDataUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* Scan line sweeping down */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${scanProgress * 100}%`,
              height: 3,
              background: 'linear-gradient(90deg, transparent, #44ff88, transparent)',
              boxShadow: '0 0 20px #44ff88, 0 0 60px #44ff8844',
              transition: 'none',
            }}
          />

          {/* Unrevealed area (black cover above scan line) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${scanProgress * 100}%`,
              bottom: 0,
              background: '#000',
            }}
          />

          {/* CRT scanlines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,20,10,0.08) 2px, rgba(0,20,10,0.08) 4px)',
              pointerEvents: 'none',
            }}
          />

          {/* Header */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '14px 18px',
              background: 'linear-gradient(rgba(0,0,0,0.8), transparent)',
              fontFamily: 'monospace',
              zIndex: 1,
            }}
          >
            <div style={{ fontSize: 10, color: '#44ff88', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              Базова телеметрія
            </div>
            <div style={{ fontSize: 12, color: '#8899aa' }}>
              {objectName} — {(scanProgress * 100).toFixed(0)}%
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              background: 'none',
              border: '1px solid #334455',
              color: '#556677',
              padding: '5px 10px',
              fontSize: 10,
              fontFamily: 'monospace',
              borderRadius: 3,
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            Скасувати
          </button>
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
          {/* Blurred background */}
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
          {/* Image */}
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

          {/* Info */}
          <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 14, color: '#ddeeff', marginBottom: 4 }}>{objectName}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span
                style={{
                  fontSize: 9,
                  padding: '2px 8px',
                  borderRadius: 3,
                  background: `${color}22`,
                  border: `1px solid ${color}55`,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {RARITY_LABELS[discovery.rarity]}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: '2px 8px',
                  borderRadius: 3,
                  background: 'rgba(40, 60, 80, 0.4)',
                  border: '1px solid rgba(60, 80, 100, 0.3)',
                  color: '#667788',
                  letterSpacing: 1,
                }}
              >
                Телеметрія
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {onSaveToArchive && (
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 18px',
                  background: `${color}22`,
                  border: `1px solid ${color}66`,
                  borderRadius: 4,
                  color,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Зберегти в архів
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                background: 'rgba(20, 30, 40, 0.6)',
                border: '1px solid #445566',
                borderRadius: 4,
                color: '#8899aa',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Закрити
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
