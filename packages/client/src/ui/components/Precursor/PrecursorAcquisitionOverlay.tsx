import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RARITY_COLORS, type DiscoveryRarity } from '@nebulife/core';
import type { PrecursorRarity } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';
import {
  startPrecursorAcquisitionTimeline,
  PRECURSOR_ACQUISITION_SCHEDULE,
  type PrecursorAcquisitionPhase,
} from '../../../game/precursor-acquisition-timeline.js';
import { PrecursorCardFace } from './PrecursorCardFace.js';

// ---------------------------------------------------------------------------
// PrecursorAcquisitionOverlay — full-screen cinematic shown when a new
// Precursor Signal card is acquired.
//
// Sequencing lives in `game/precursor-acquisition-timeline.ts` (pure, unit
// tested) — this component only renders phases and forwards dismiss intent.
// Two ways to end the cinematic:
//   - auto-dismiss after the full schedule plays out, or
//   - a DELIBERATE dismiss (tap/click on the card, the "Continue" button, or
//     Escape/Enter) — but ONLY once the anti-accidental floor has elapsed.
//     Before that floor, dismiss attempts are silently ignored so a stray
//     tap can never cut the card down to ~1s (see timeline module for the
//     full root-cause note).
// Either path calls `onComplete` at most once.
// ---------------------------------------------------------------------------

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
  const [phase, setPhase] = useState<PrecursorAcquisitionPhase>('static');
  const [dismissReady, setDismissReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<typeof startPrecursorAcquisitionTimeline> | null>(null);

  useEffect(() => {
    setPhase('static');
    setDismissReady(false);

    const controller = startPrecursorAcquisitionTimeline({
      onPhaseChange: setPhase,
      onMaterialize: () => playSfx(`precursor/acquire-${sfxSlot}.mp3`, 0.55),
      onComplete,
    });
    controllerRef.current = controller;

    // Flip the "may dismiss" affordance on exactly once the anti-accidental
    // floor elapses. Mirrors the timeline's own `minDismissMs` so the visible
    // "Continue" button and the actual dismiss gate never drift apart.
    const readyTimer = window.setTimeout(
      () => setDismissReady(true),
      PRECURSOR_ACQUISITION_SCHEDULE.minDismissMs,
    );

    dialogRef.current?.focus();

    return () => {
      window.clearTimeout(readyTimer);
      controller.cancel();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, rarity]);

  const handleDismiss = (e?: React.SyntheticEvent) => {
    // Isolate this modal: never let the tap/click/key that dismisses the
    // card leak into whatever is underneath (system map, CommandBar, ...).
    e?.stopPropagation();
    controllerRef.current?.requestDismiss();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      handleDismiss(e);
    }
  };

  const color = RARITY_COLORS[rarity as DiscoveryRarity];
  const flipped = phase === 'flip' || phase === 'revealed';
  const cardVisible = phase !== 'static';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('precursor.acquisition_intercepted')}
      tabIndex={-1}
      onClick={handleDismiss}
      onTouchStart={handleDismiss}
      onKeyDown={handleKeyDown}
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
        cursor: dismissReady ? 'pointer' : 'default',
        userSelect: 'none',
        outline: 'none',
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

      {/* Deliberate dismiss affordance — only appears once the anti-accidental
          floor has elapsed. A real <button> (not the backdrop) is the primary,
          keyboard/a11y-friendly way to acknowledge and move on. */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          opacity: dismissReady ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          pointerEvents: dismissReady ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          disabled={!dismissReady}
          aria-hidden={!dismissReady}
          tabIndex={dismissReady ? 0 : -1}
          onClick={(e) => { e.stopPropagation(); handleDismiss(e); }}
          style={{
            padding: '8px 28px',
            background: 'rgba(30,60,80,0.6)',
            border: '1px solid #446688',
            color: '#aaccee',
            fontFamily: 'monospace',
            fontSize: 12,
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          {t('precursor.acquisition_continue')}
        </button>
        <div style={{ fontSize: 9, color: '#445566', letterSpacing: 1 }}>
          {t('precursor.acquisition_skip')}
        </div>
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
