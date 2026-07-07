import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import type { AstraOnboardingEntry } from './onboarding-catalog.js';

// ---------------------------------------------------------------------------
// AstraOnboardingModal — unified one-shot explainer popup voiced by ASTRA.
//
// Layout: full 9:16 vertical ASTRA hologram video on the LEFT (aspect-ratio
// box, same treatment as AlphaSignalPromoModal — the source clip is vertical,
// so the face is never cropped), explainer text + buttons on the RIGHT.
// On narrow/portrait screens the video column shrinks (TutorialOverlay's
// compact ASTRA-panel pattern) and the buttons drop below both columns.
// Voiceover clip (public/sfx/onboarding/<key>_<lang>.mp3|webm) autoplays when
// present and fails silently when the file is missing or autoplay is blocked.
// z-index 9820 — same layer as unlock popups, below tutorial (10048+).
// ---------------------------------------------------------------------------

const ASTRA_VIDEO_URL = '/astra/astra-video.mp4';
const ASTRA_PORTRAIT_URL = '/astra/astra-portrait.jpg';

const STYLE_ID = 'nebulife-astra-onboarding-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes astraOnbBackdropIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes astraOnbCardIn {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to { opacity: 1; transform: none; }
    }
    @keyframes astraOnbScanLine {
      0%, 62% { transform: translateY(-130%); opacity: 0; }
      68% { opacity: 0.45; }
      86% { opacity: 0.18; }
      100% { transform: translateY(130%); opacity: 0; }
    }
    @keyframes astraOnbSoftPulse {
      0%, 100% { opacity: 0.72; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export interface AstraOnboardingModalProps {
  entry: AstraOnboardingEntry;
  onClose: () => void;
  /** Optional "Show me" handler — closes the modal, then navigates. */
  onAction?: () => void;
}

export function AstraOnboardingModal({ entry, onClose, onAction }: AstraOnboardingModalProps) {
  const { t, i18n } = useTranslation();
  const [videoFailed, setVideoFailed] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  const lang = i18n.language.startsWith('uk') ? 'uk' : 'en';
  const ext = Capacitor.getPlatform() === 'android' ? 'webm' : 'mp3';
  const voiceSrc = `/sfx/onboarding/${entry.key}_${lang}.${ext}`;

  useEffect(() => { ensureStyles(); }, []);

  const playVoice = useCallback(() => {
    voiceRef.current?.pause();
    const audio = new Audio(voiceSrc);
    audio.preload = 'auto';
    audio.volume = 0.86;
    voiceRef.current = audio;
    setVoicePlaying(true);
    audio.onended = () => setVoicePlaying(false);
    audio.onerror = () => { setVoicePlaying(false); setVoiceAvailable(false); };
    void audio.play().catch(() => setVoicePlaying(false));
  }, [voiceSrc]);

  // Autoplay the voiceover on mount; stop it on unmount / entry change.
  useEffect(() => {
    playVoice();
    return () => {
      voiceRef.current?.pause();
      voiceRef.current = null;
    };
  }, [playVoice]);

  const stopVoiceAnd = useCallback((fn?: () => void) => {
    voiceRef.current?.pause();
    voiceRef.current = null;
    onClose();
    fn?.();
  }, [onClose]);

  const accent = entry.accent;
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720;

  // Rendered in the right column on wide screens, below both columns on
  // compact ones — declared once so both placements stay in sync.
  const actionButtons = (
    <>
      {onAction && (
        <button
          onClick={() => stopVoiceAnd(onAction)}
          style={{
            border: `1px solid ${accent}aa`,
            background: `${accent}18`,
            color: accent,
            borderRadius: 3,
            padding: '9px 18px',
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {t('astraOnboarding.show_me')}
        </button>
      )}
      <button
        onClick={() => stopVoiceAnd()}
        style={{
          border: '1px solid #446688',
          background: 'rgba(68,102,136,0.14)',
          color: '#aabbcc',
          borderRadius: 3,
          padding: '9px 18px',
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        {t('astraOnboarding.got_it')}
      </button>
    </>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9820,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(circle at 50% 45%, rgba(68,136,170,0.16), rgba(2,5,16,0.72) 52%, rgba(2,5,16,0.86))',
        fontFamily: 'monospace',
        pointerEvents: 'auto',
        animation: 'astraOnbBackdropIn 0.36s ease-out',
      }}
      onClick={() => stopVoiceAnd()}
    >
      <div
        style={{
          position: 'relative',
          width: isCompact ? 'min(480px, calc(100vw - 28px))' : 'min(620px, calc(100vw - 28px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          padding: isCompact ? '16px 16px 14px' : '20px 22px 18px',
          borderRadius: 8,
          border: `1px solid ${accent}99`,
          background: 'linear-gradient(145deg, rgba(5,10,20,0.96), rgba(14,22,34,0.94))',
          boxShadow: `0 0 42px ${accent}33, inset 0 0 34px rgba(123,184,255,0.07)`,
          animation: 'astraOnbCardIn 0.58s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent, rgba(123,184,255,0.12), transparent)',
            animation: 'astraOnbScanLine 5.4s ease-in-out infinite',
          }}
        />

        {/* Left column: vertical 9:16 ASTRA hologram; right column: text. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '104px minmax(0, 1fr)' : '176px minmax(0, 1fr)',
            gap: isCompact ? 12 : 18,
            alignItems: 'start',
          }}
        >
          {/* ASTRA hologram video — 9:16 aspect box (same treatment as
              AlphaSignalPromoModal) so the vertical source is never cropped. */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '9 / 16',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid rgba(123,184,255,0.22)',
              background: 'rgba(2,5,16,0.72)',
            }}
          >
            {videoFailed ? (
              <img
                src={ASTRA_PORTRAIT_URL}
                alt={t('tutorial.astra_alt')}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
                }}
              />
            ) : (
              <video
                ref={(el) => {
                  if (el) {
                    el.muted = true;
                    el.volume = 0;
                  }
                }}
                src={ASTRA_VIDEO_URL}
                poster={ASTRA_PORTRAIT_URL}
                aria-label={t('tutorial.astra_alt')}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(2,5,16,0.02), rgba(2,5,16,0.36))',
                boxShadow: 'inset 0 0 28px rgba(123,184,255,0.10)',
              }}
            />
            {voiceAvailable && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); playVoice(); }}
                title={t('tutorial.astra_voice_replay')}
                aria-label={t('tutorial.astra_voice_replay')}
                style={{
                  position: 'absolute',
                  right: 6,
                  bottom: 6,
                  width: 28,
                  height: 24,
                  border: '1px solid rgba(123,184,255,0.30)',
                  borderRadius: 4,
                  background: voicePlaying ? 'rgba(123,184,255,0.16)' : 'rgba(5,10,20,0.72)',
                  color: '#9cc9ee',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                {voicePlaying ? '||' : '>'}
              </button>
            )}
          </div>

          {/* Explainer text (+ buttons on wide screens) */}
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                color: accent,
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: accent,
                  boxShadow: `0 0 9px ${accent}aa`,
                  animation: 'astraOnbSoftPulse 2.4s ease-in-out infinite',
                  flexShrink: 0,
                }}
              />
              {t(`astraOnboarding.${entry.key}.kicker`)}
            </div>

            <div style={{ color: '#dbe9ff', fontSize: isCompact ? 15 : 17, fontWeight: 800, letterSpacing: 1.2, marginBottom: 10 }}>
              {t(`astraOnboarding.${entry.key}.title`)}
            </div>

            <div
              style={{
                color: '#aabbcc',
                fontSize: 12,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}
            >
              {t(`astraOnboarding.${entry.key}.body`)}
            </div>

            {!isCompact && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start', flexWrap: 'wrap', marginTop: 18 }}>
                {actionButtons}
              </div>
            )}
          </div>
        </div>

        {/* Narrow/portrait screens: buttons drop below both columns. */}
        {isCompact && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  );
}
