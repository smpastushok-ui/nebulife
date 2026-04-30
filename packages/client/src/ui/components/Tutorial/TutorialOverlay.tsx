import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TUTORIAL_STEPS, type TutorialStepConfig } from './tutorialSteps';

// ---------------------------------------------------------------------------
// TutorialOverlay — Spotlight + tooltip overlay for interactive tutorial
// ---------------------------------------------------------------------------
// Uses box-shadow approach: a fixed div with massive inset shadow creates
// a "hole" over the target element. Click interception checks coordinates.
// z-index: 10050 — above all panels (9500-10000) except AuthScreen.
// ---------------------------------------------------------------------------

const STYLE_ID = 'nebulife-tutorial-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tut-spotlight-pulse {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 2px rgba(68,102,136,0.4); }
      50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px rgba(68,136,170,0.7); }
    }
    @keyframes tut-tooltip-enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes astra-panel-enter {
      from { opacity: 0; transform: translateX(28px) scale(0.985); clip-path: inset(0 0 0 100%); }
      to { opacity: 1; transform: translateX(0) scale(1); clip-path: inset(0 0 0 0); }
    }
    @keyframes astra-panel-enter-mobile {
      from { opacity: 0; transform: translateY(26px) scale(0.985); clip-path: inset(100% 0 0 0); }
      to { opacity: 1; transform: translateY(0) scale(1); clip-path: inset(0 0 0 0); }
    }
    @keyframes astra-scan-line {
      0%, 62% { transform: translateY(-130%); opacity: 0; }
      68% { opacity: 0.45; }
      86% { opacity: 0.18; }
      100% { transform: translateY(130%); opacity: 0; }
    }
    @keyframes astra-soft-pulse {
      0%, 100% { opacity: 0.72; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const ASTRA_VIDEO_URL = '/astra/astra-video.mp4';
const ASTRA_PORTRAIT_URL = '/astra/astra-portrait.jpg';

function getAstraVoiceClip(stepId: string, subStepIndex: number, language: string): string | null {
  const isUkrainian = language.startsWith('uk');
  const clips = isUkrainian
    ? {
      awakening: 'probudzhennya_ua',
      terminal: 'terminal_ua',
      firstChoice: 'pershii_vybir_ua',
      firstScan: 'pershe_scanuvannya_ua',
      firstResult: 'pershi_rezultat_ua',
      firstDiscovery: 'persha_znahidka_ua',
      quantum: 'quantum_focus_ua',
      firstPhoto: 'pershe_photo_ua',
      gallery: 'galery_ua',
      handoff: 'peredacha_chat_ua',
    }
    : {
      awakening: 'Awakening_en',
      terminal: 'Terminal_en',
      firstChoice: 'First_Choice_en',
      firstScan: 'First_Scan_en',
      firstResult: 'First_Result_en',
      firstDiscovery: 'First_Discovery_en',
      quantum: 'Quantum_Focus_en',
      firstPhoto: 'First_Photo_en',
      gallery: 'gallery_en',
      handoff: 'Chat_Handoff_en',
    };

  if (stepId === 'awakening') return clips.awakening;
  if (stepId === 'terminal') return clips.terminal;
  if (stepId === 'go-systems') return clips.firstChoice;
  if (stepId === 'first-research') return clips.firstScan;
  if (stepId === 'hud-info') return subStepIndex === 0 ? clips.firstResult : null;
  if (stepId === 'anomaly') return clips.firstDiscovery;
  if (stepId === 'quantum') return clips.quantum;
  if (stepId === 'save-gallery') return clips.firstPhoto;
  if (stepId === 'gallery-final') return clips.gallery;
  if (stepId === 'astra-handoff') return clips.handoff;
  return null;
}

interface TutorialOverlayProps {
  step: TutorialStepConfig;
  subStepIndex: number;
  onAdvance: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ step, subStepIndex, onAdvance, onSkip }: TutorialOverlayProps) {
  const { t, i18n } = useTranslation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const prevTargetRef = useRef<string>('');
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  // Determine current target and text based on sub-steps
  const currentTarget = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.target ?? step.target
    : step.target;

  const currentText = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.text ?? step.text
    : step.text;

  const currentTooltipPos = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.tooltipPos ?? step.tooltipPos
    : step.tooltipPos;

  const currentNextLabel = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.nextLabel
    : step.nextLabel;

  const isInfoStep = step.type === 'info';
  const isAutoStep = step.type === 'auto';
  const isWaiting = step.waitForTarget && !targetRect;
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720;
  const voiceClip = getAstraVoiceClip(step.id, subStepIndex, i18n.language);
  const voiceSrc = voiceClip
    ? `/astra/voice/${voiceClip}.webm`
    : null;

  useEffect(() => {
    ensureStyles();
  }, []);

  const playVoice = useCallback(() => {
    if (!voiceSrc) return;

    voiceRef.current?.pause();
    const audio = new Audio(voiceSrc);
    audio.volume = 0.86;
    voiceRef.current = audio;
    setVoicePlaying(true);
    audio.onended = () => setVoicePlaying(false);
    audio.onerror = () => setVoicePlaying(false);
    void audio.play().catch(() => {
      setVoicePlaying(false);
    });
  }, [voiceSrc]);

  useEffect(() => {
    if (!voiceSrc) return;
    playVoice();
    return () => {
      voiceRef.current?.pause();
      voiceRef.current = null;
      setVoicePlaying(false);
    };
  }, [playVoice, voiceSrc]);

  // Track transitions between targets
  useEffect(() => {
    if (currentTarget !== prevTargetRef.current) {
      setTransitioning(true);
      const t = setTimeout(() => setTransitioning(false), 300);
      prevTargetRef.current = currentTarget;
      return () => clearTimeout(t);
    }
  }, [currentTarget]);

  // Poll for target element position using rAF
  useEffect(() => {
    if (!currentTarget) {
      setTargetRect(null);
      return;
    }

    const poll = () => {
      const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentTarget]);

  useEffect(() => {
    if (!currentTarget) return;
    const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`) as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [currentTarget]);

  // Handle click on overlay — check if within spotlight bounds
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (isInfoStep || isAutoStep) {
        // Info/auto steps: clicks on overlay do nothing (use button)
        e.stopPropagation();
        return;
      }

      if (!targetRect) return;

      const { clientX, clientY } = e;
      const pad = 6;
      const inBounds =
        clientX >= targetRect.left - pad &&
        clientX <= targetRect.right + pad &&
        clientY >= targetRect.top - pad &&
        clientY <= targetRect.bottom + pad;

      if (inBounds) {
        // Click the target element programmatically
        const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`) as HTMLElement | null;
        if (el) {
          el.click();
        }
        onAdvance();
      }
      // Otherwise swallow the click
      e.stopPropagation();
      e.preventDefault();
    },
    [targetRect, currentTarget, isInfoStep, isAutoStep, onAdvance],
  );

  // A.S.T.R.A. panel positioning — side panel on desktop, bottom card on mobile.
  const getAstraPanelStyle = (): React.CSSProperties => {
    if (isCompact) {
      return {
        position: 'fixed',
        left: 10,
        right: 10,
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '46vh',
      };
    }

    const panelWidth = 330;
    const rightPanelLeft = window.innerWidth - panelWidth - 14;
    const targetUnderRightPanel = targetRect ? targetRect.right > rightPanelLeft - 12 : false;
    return {
      position: 'fixed',
      top: 'calc(74px + env(safe-area-inset-top, 0px))',
      right: targetUnderRightPanel ? undefined : 14,
      left: targetUnderRightPanel ? 14 : undefined,
      width: panelWidth,
      maxHeight: 'calc(100vh - 108px)',
    };
  };

  // Spotlight style
  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
        borderRadius: 6,
        zIndex: 10050,
        pointerEvents: 'none',
        animation: 'tut-spotlight-pulse 2s ease-in-out infinite',
        transition: transitioning ? 'top 0.3s, left 0.3s, width 0.3s, height 0.3s' : undefined,
      }
    : {
        display: 'none',
      };

  // When waitForTarget is set and target isn't found, hide everything
  if (isWaiting) {
    return null;
  }

  return (
    <>
      {/* Full-screen click interceptor (disabled for info/auto steps — tooltip button handles them) */}
      <div
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10050,
          cursor: targetRect && !isInfoStep && !isAutoStep ? 'pointer' : 'default',
          pointerEvents: isInfoStep || isAutoStep ? 'none' : 'auto',
        }}
      />

      {/* Dark overlay with spotlight hole */}
      {targetRect && (
        <div style={spotlightStyle} />
      )}

      {/* Dark backdrop when no spotlight visible (no target or target not found) */}
      {!targetRect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10049,
            background: 'rgba(0, 0, 0, 0.75)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* A.S.T.R.A. hologram panel */}
      <div
        style={{
          ...getAstraPanelStyle(),
          zIndex: 10051,
          display: 'grid',
          gridTemplateColumns: isCompact ? '84px 1fr' : '1fr',
          gap: isCompact ? 10 : 12,
          padding: isCompact ? '10px 10px 12px' : '12px',
          background: 'linear-gradient(145deg, rgba(5,10,20,0.94), rgba(13,22,36,0.9))',
          border: '1px solid rgba(123,184,255,0.30)',
          borderRadius: 8,
          fontFamily: 'monospace',
          color: '#aabbcc',
          boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 0 24px rgba(123,184,255,0.055)',
          animation: `${isCompact ? 'astra-panel-enter-mobile' : 'astra-panel-enter'} 0.48s ease-out`,
          pointerEvents: 'auto',
          overflow: isCompact ? 'auto' : 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent, rgba(123,184,255,0.18), transparent)',
            animation: 'astra-scan-line 5.4s ease-in-out infinite',
          }}
        />
        <span style={{ ...ASTRA_CORNER, top: 6, left: 6, borderRight: 0, borderBottom: 0 }} />
        <span style={{ ...ASTRA_CORNER, top: 6, right: 6, borderLeft: 0, borderBottom: 0 }} />
        <span style={{ ...ASTRA_CORNER, bottom: 6, left: 6, borderRight: 0, borderTop: 0 }} />
        <span style={{ ...ASTRA_CORNER, bottom: 6, right: 6, borderLeft: 0, borderTop: 0 }} />

        <div
          style={{
            position: 'relative',
            height: isCompact ? 116 : 250,
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
                objectPosition: isCompact ? '50% 18%' : '50% 16%',
                display: 'block',
                filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
              }}
            />
          ) : (
            <video
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
                objectPosition: isCompact ? '50% 18%' : '50% 16%',
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
        </div>

        <div style={{ position: 'relative', minWidth: 0 }}>
          {/* Step indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
              color: '#667788',
              fontSize: 8,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            <span>{t('tutorial.astra_unit')}</span>
            <span>{t('tutorial.step_counter', { step: parseInt(String(STEP_NUMBER_MAP[step.id] ?? 0)) + 1, total: TUTORIAL_STEPS.length })}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              minWidth: 0,
              color: '#7bb8ff',
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#7bb8ff',
                boxShadow: '0 0 9px rgba(123,184,255,0.65)',
                animation: 'astra-soft-pulse 2.4s ease-in-out infinite',
              }} />
              {t('tutorial.astra_status')}
            </div>
            {voiceSrc && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playVoice();
                }}
                title={t('tutorial.astra_voice_replay')}
                aria-label={t('tutorial.astra_voice_replay')}
                style={{
                  width: 28,
                  height: 24,
                  border: '1px solid rgba(123,184,255,0.30)',
                  borderRadius: 4,
                  background: voicePlaying ? 'rgba(123,184,255,0.16)' : 'rgba(68,102,136,0.12)',
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

          {/* Text */}
          <div style={{
            marginBottom: isInfoStep || isAutoStep || (step.type === 'click' && !targetRect) ? 12 : 0,
            color: '#c1d4e8',
            fontSize: isCompact ? 11 : 12,
            lineHeight: 1.65,
          }}>
            {t(currentText)}
          </div>

          {/* "Next" button for info steps */}
          {(isInfoStep || isAutoStep) && currentNextLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvance();
              }}
              style={ASTRA_BUTTON_STYLE}
            >
              {t(currentNextLabel)}
            </button>
          )}

          {/* Click hint for click steps */}
          {step.type === 'click' && targetRect && (
            <div style={{ fontSize: 10, color: '#667788', marginTop: 8 }}>
              {t('tutorial.click_hint')}
            </div>
          )}

          {/* Fallback Next button for click steps when element not found */}
          {step.type === 'click' && !targetRect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvance();
              }}
              style={ASTRA_BUTTON_STYLE}
            >
              {t('tutorial.next')}
            </button>
          )}
        </div>
      </div>

      {/* Skip button — strong contrast so testers/returning players can find
          it immediately. Amber-orange accent matches the "secondary action"
          palette used elsewhere (warnings, tutorial dismissals). */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
        style={{
          position: 'fixed',
          top: 'calc(14px + env(safe-area-inset-top, 0px))',
          left: 14,
          zIndex: 10052,
          background: 'rgba(10,15,25,0.92)',
          border: '1px solid rgba(255,136,68,0.55)',
          borderRadius: 4,
          color: '#ffaa66',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          padding: '6px 14px',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s, box-shadow 0.15s, background 0.15s',
          pointerEvents: 'auto',
          boxShadow: '0 0 10px rgba(255,136,68,0.25)',
        }}
        onMouseEnter={(e) => {
          const el = e.target as HTMLElement;
          el.style.color = '#ffcc88';
          el.style.borderColor = 'rgba(255,136,68,0.85)';
          el.style.boxShadow = '0 0 16px rgba(255,136,68,0.45)';
          el.style.background = 'rgba(25,15,5,0.95)';
        }}
        onMouseLeave={(e) => {
          const el = e.target as HTMLElement;
          el.style.color = '#ffaa66';
          el.style.borderColor = 'rgba(255,136,68,0.55)';
          el.style.boxShadow = '0 0 10px rgba(255,136,68,0.25)';
          el.style.background = 'rgba(10,15,25,0.92)';
        }}
      >
        {t('tutorial.skip')}
      </button>
    </>
  );
}

const ASTRA_CORNER: React.CSSProperties = {
  position: 'absolute',
  width: 16,
  height: 16,
  border: '1px solid rgba(123,184,255,0.42)',
  pointerEvents: 'none',
};

const ASTRA_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 0',
  background: 'rgba(68, 102, 136, 0.18)',
  border: '1px solid rgba(123,184,255,0.34)',
  borderRadius: 4,
  color: '#aaccee',
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: 1,
  cursor: 'pointer',
  textTransform: 'uppercase',
};

/** Map step id to its 0-based number for display */
const STEP_NUMBER_MAP: Record<string, number> = {
  'awakening': 0,
  'terminal': 1,
  'go-systems': 2,
  'first-research': 3,
  'hud-info': 4,
  'free-task': 5,
  'anomaly': 6,
  'quantum': 7,
  'save-gallery': 8,
  'gallery-final': 9,
  'astra-handoff': 10,
};
