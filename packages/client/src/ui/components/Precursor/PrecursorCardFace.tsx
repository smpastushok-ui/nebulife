import React, { useState } from 'react';
import { RARITY_COLORS, type DiscoveryRarity } from '@nebulife/core';
import type { PrecursorRarity } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PrecursorCardFace — renders a "Сигнали Предтеч" card.
//
// Art comes from the parallel Higgsfield pipeline at
// `/precursor-cards/<id>.webp`. Until that lands (or if it 404s), this
// falls back to a deterministic procedural sigil + rarity-colored scanline
// texture, so the feature works end-to-end before art is dropped in.
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Deterministic abstract sigil derived from the card id — stands in for concept art. */
function PrecursorGlyph({ seed, color, size = 48 }: { seed: string; color: string; size?: number }) {
  const h = hashStr(seed);
  const n = 6 + (h % 4); // 6-9 point radial sigil
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + (h % 100) / 100;
    const r = 0.35 + ((h >> (i % 8)) % 100) / 100 * 0.55;
    const x = 50 + Math.cos(angle) * 50 * r;
    const y = 50 + Math.sin(angle) * 50 * r;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      <circle cx={50} cy={50} r={44} fill="none" stroke={color} strokeWidth={0.6} opacity={0.32} />
      <polygon points={points.join(' ')} fill="none" stroke={color} strokeWidth={1.4} opacity={0.85} />
      <circle cx={50} cy={50} r={4} fill={color} opacity={0.9} />
    </svg>
  );
}

export interface PrecursorCardFaceProps {
  cardId: string;
  rarity: PrecursorRarity;
  name?: string;
  /** Show the generic encrypted card-back instead of the (attempted) face art. */
  faceDown?: boolean;
  /** Fixed pixel width/height. When omitted, the card fills its container width at a 5:7 aspect ratio. */
  width?: number;
  height?: number;
  dimmed?: boolean;
}

export function PrecursorCardFace({
  cardId,
  rarity,
  name,
  faceDown = false,
  width,
  height,
  dimmed = false,
}: PrecursorCardFaceProps) {
  const [artFailed, setArtFailed] = useState(false);
  const color = RARITY_COLORS[rarity as DiscoveryRarity];
  const showArt = !faceDown && !artFailed;
  const sized = typeof width === 'number' && typeof height === 'number';
  const glyphBoxSize = sized ? Math.min(width as number, height as number) : 64;

  return (
    <div
      style={{
        width: sized ? width : '100%',
        height: sized ? height : undefined,
        aspectRatio: sized ? undefined : '5 / 7',
        borderRadius: 6,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${color}88`,
        background: 'linear-gradient(160deg, rgba(10,15,25,0.95), rgba(4,7,14,0.98))',
        boxShadow: `0 0 14px ${color}33`,
        opacity: dimmed ? 0.55 : 1,
        flexShrink: 0,
      }}
    >
      {showArt && (
        <img
          src={`/precursor-cards/${cardId}.webp`}
          alt={name ?? cardId}
          loading="lazy"
          onError={() => setArtFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {!showArt && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `repeating-linear-gradient(0deg, ${color}14 0px, ${color}14 1px, transparent 1px, transparent 3px)`,
              pointerEvents: 'none',
            }}
          />
          <PrecursorGlyph seed={faceDown ? 'precursor-card-back' : cardId} color={color} size={glyphBoxSize * 0.42} />
        </div>
      )}

      {!faceDown && name && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '7px 6px 4px',
            background: 'linear-gradient(transparent, rgba(2,5,16,0.9))',
            fontSize: 9,
            color: '#aabbcc',
            textAlign: 'center',
            lineHeight: 1.25,
            fontFamily: 'monospace',
          }}
        >
          {name}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 5px ${color}aa`,
        }}
      />
    </div>
  );
}
