import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RARITY_COLORS, type DiscoveryRarity } from '@nebulife/core';
import type { PrecursorRarity } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';
import { PrecursorCardFace } from './PrecursorCardFace.js';

// ---------------------------------------------------------------------------
// PrecursorAcquisitionOverlay — full-screen "класна анімація" cinematic shown
// when a new Precursor Signal card is acquired.
//
// Phases (transform/opacity only — 60fps rule, GAME_BIBLE.md §3):
//   static      (0    - 900ms)  dark overlay + scanline/noise buildup, "DECODING SIGNAL..."
//   materialize (900  - 1500ms) card-back fades in with a rarity-colored glow burst
//   flip        (1500 - 2700ms) slow 3D flip from card-back to face
//   revealed    (2700 - 4500ms) name + rarity label fade in, then auto-dismiss
//
// Tap/click anywhere skips straight to completion.
// ---------------------------------------------------------------------------

type Phase = 'static' | 'materialize' | 'flip' | 'revealed';

const T_MATERIALIZE = 900;
const T_FLIP = 1500;
const T_REVEALED = 2700;
const T_AUTO_DISMISS = 4500;

export interface PrecursorAcquisitionOverlayProps {
  cardId: string;
  rarity: PrecursorRarity;
  name: string;
  sfxSlot: 1 | 2 | 3 | 4;
  onComplete: () => void;
}

export const PrecursorAcquisitionOverlay: React.FC<PrecursorAcquisitionOverlayProps> = ({
  cardId,
  rarity,
  name,
  sfxSlot,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('static');
  const doneRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const color = RARITY_COLORS[rarity as DiscoveryRarity];

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    for (const id of timersRef.current) window.clearTimeout(id);
    onComplete();
  };

  useEffect(() => {
    timersRef.current.push(window.setTimeout(() => {
      setPhase('materialize');
      playSfx(`precursor/acquire-${sfxSlot}.mp3`, 0.55);
    }, T_MATERIALIZE));
    timersRef.current.push(window.setTimeout(() => setPhase('flip'), T_FLIP));
    timersRef.current.push(window.setTimeout(() => setPhase('revealed'), T_REVEALED));
    timersRef.current.push(window.setTimeout(() => finish(), T_AUTO_DISMISS));
    return () => { for (const id of timersRef.current) window.clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipped = phase === 'flip' || phase === 'revealed';
  const cardVisible = phase !== 'static';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Precursor signal acquired"
      onClick={finish}
      onTouchStart={finish}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10250,
        background: '#020510',
        fontFamily: 'monospace',
        color: '#aabbcc',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        animation: 'precursorOverlayFadeIn 0.3s ease-out',
      }}
    >
      {/* Scanline / static noise buildup */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: phase === 'static' ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
          background: `repeating-linear-gradient(0deg, rgba(123,184,255,0.05) 0px, rgba(123,184,255,0.05) 1px, transparent 1px, transparent 3px)`,
          animation: 'precursorScanlineDrift 0.6s linear infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: phase === 'static' ? 0.5 : 0,
          transition: 'opacity 0.5s ease-out',
          background: 'radial-gradient(circle at 50% 50%, rgba(123,184,255,0.08), transparent 60%)',
          animation: 'precursorStaticFlicker 0.18s steps(2) infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Glow burst behind the card, timed to materialize */}
      <div
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}55 0%, ${color}22 35%, transparent 70%)`,
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? 'scale(1)' : 'scale(0.2)',
          transition: 'opacity 0.7s ease-out, transform 0.9s cubic-bezier(0.2,0.8,0.2,1)',
          pointerEvents: 'none',
        }}
      />

      {/* Status text during static phase */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          fontSize: 11,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#556677',
          opacity: phase === 'static' ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
        }}
      >
        {t('precursor.acquisition_scanning')}
      </div>

      {/* Card flipper */}
      <div
        style={{
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? 'scale(1)' : 'scale(0.85)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          perspective: 900,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 168,
            height: 235,
            transformStyle: 'preserve-3d',
            transition: 'transform 1.2s cubic-bezier(0.4,0.1,0.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
            <PrecursorCardFace cardId={cardId} rarity={rarity} faceDown width={168} height={235} />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <PrecursorCardFace cardId={cardId} rarity={rarity} name={name} width={168} height={235} />
          </div>
        </div>
      </div>

      {/* Name + rarity reveal */}
      <div
        style={{
          marginTop: 22,
          textAlign: 'center',
          opacity: phase === 'revealed' ? 1 : 0,
          transform: phase === 'revealed' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
        <div style={{ fontSize: 10, color: '#556677', letterSpacing: 3, marginBottom: 8 }}>
          {t('precursor.acquisition_intercepted')}
        </div>
        <div style={{ fontSize: 18, color: '#ccddee', letterSpacing: 0.5 }}>{name}</div>
        <div style={{ fontSize: 11, color, marginTop: 6, textTransform: 'uppercase', letterSpacing: 2 }}>
          {t(`discovery_notification.rarity_${rarity}`, { defaultValue: rarity })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
          fontSize: 9,
          color: '#445566',
          letterSpacing: 1,
          opacity: phase === 'revealed' ? 1 : 0,
          transition: 'opacity 0.6s ease-out 0.4s',
        }}
      >
        {t('precursor.acquisition_skip')}
      </div>

      <style>{`
        @keyframes precursorOverlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes precursorScanlineDrift {
          from { background-position: 0 0; }
          to   { background-position: 0 6px; }
        }
        @keyframes precursorStaticFlicker {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
