import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../../audio/SfxPlayer.js';

interface SurfaceAstraLessonPromptProps {
  onDismiss: () => void;
  onOpenMission?: () => void;
}

const STEP_COUNT = 7;

export function SurfaceAstraLessonPrompt({ onDismiss, onOpenMission }: SurfaceAstraLessonPromptProps) {
  const { t, i18n } = useTranslation();
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [step, setStep] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic window size tracking for perfect responsiveness
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCompact = width < 680 || height < 520;

  const voiceSources = useMemo(
    () => {
      const lang = i18n.language.startsWith('uk') ? 'ua' : 'en';
      return Array.from({ length: 7 }, (_, index) => `/astra/voice/surface/${index + 1}-${lang}.mp3`);
    },
    [i18n.language],
  );

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const stopVoice = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setVoicePlaying(false);
  };

  const finishToMission = () => {
    playSfx('ui-click', 0.06);
    try { localStorage.setItem('nebulife_surface_astra_lesson_seen', '1'); } catch { /* ignore */ }
    stopVoice();
    onDismiss();
    // Transition to the philosophy & mission curriculum is temporarily blocked as requested.
    // onOpenMission?.();
  };

  const playVoicePart = (index: number) => {
    const src = voiceSources[index];
    if (!src) {
      setVoicePlaying(false);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.9;
    audioRef.current = audio;
    setVoicePlaying(true);
    setStep(index);
    audio.onended = () => {
      if (index + 1 < STEP_COUNT) {
        playVoicePart(index + 1);
      } else {
        setVoicePlaying(false);
      }
    };
    audio.onerror = () => {
      // Missing segment should not block the lesson; continue with the next one.
      if (index + 1 < STEP_COUNT) playVoicePart(index + 1);
      else setVoicePlaying(false);
    };
    void audio.play().catch(() => setVoicePlaying(false));
  };

  const handleNext = () => {
    playSfx('ui-click', 0.05);
    if (step >= STEP_COUNT - 1) {
      finishToMission();
      return;
    }
    playVoicePart(step + 1);
  };

  const handleStartVoice = () => {
    playSfx('ui-click', 0.05);
    playVoicePart(step);
  };

  const handleMuteVoice = () => {
    playSfx('ui-click', 0.05);
    stopVoice();
  };

  return (
    <div style={styles.backdrop}>
      <style>{`
        @keyframes astraLivePulse {
          0% { transform: scale(0.95); opacity: 0.75; }
          50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 10px rgba(68, 255, 136, 0.7); }
          100% { transform: scale(0.95); opacity: 0.75; }
        }
        @keyframes astraScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        .astra-btn-primary {
          background: rgba(123, 184, 255, 0.12);
          border: 1px solid rgba(123, 184, 255, 0.45);
          color: #e3f2ff;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          outline: none;
        }
        .astra-btn-primary:hover {
          background: rgba(123, 184, 255, 0.22);
          border-color: rgba(123, 184, 255, 0.75);
          box-shadow: 0 0 12px rgba(123, 184, 255, 0.2);
        }
        .astra-btn-primary:active {
          transform: translateY(1px);
          background: rgba(123, 184, 255, 0.3);
        }

        .astra-btn-voice {
          background: rgba(68, 255, 136, 0.08);
          border: 1px solid rgba(68, 255, 136, 0.4);
          color: #bbf9d4;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          outline: none;
        }
        .astra-btn-voice:hover {
          background: rgba(68, 255, 136, 0.16);
          border-color: rgba(68, 255, 136, 0.65);
          box-shadow: 0 0 12px rgba(68, 255, 136, 0.15);
        }
        .astra-btn-voice:active {
          transform: translateY(1px);
          background: rgba(68, 255, 136, 0.24);
        }

        .astra-btn-voice-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          width: 40px;
          padding: 10px;
          flex: 0 0 40px;
        }

        .astra-btn-secondary {
          background: transparent;
          border: 1px solid rgba(102, 119, 136, 0.42);
          color: #9ab0c5;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          outline: none;
        }
        .astra-btn-secondary:hover {
          background: rgba(102, 119, 136, 0.1);
          border-color: rgba(102, 119, 136, 0.7);
          color: #c0d1e5;
        }
        .astra-btn-secondary:active {
          transform: translateY(1px);
          background: rgba(102, 119, 136, 0.18);
        }
        
        .astra-live-dot {
          animation: astraLivePulse 1.8s infinite ease-in-out;
        }
        
        .astra-scanline {
          animation: astraScanline 5s linear infinite;
        }
      `}</style>

      <div style={{ ...styles.card, ...(isCompact ? styles.cardCompact : {}) }}>
        
        {/* On desktop, the full-height vertical side-panel for Astra feed */}
        {!isCompact && (
          <div style={styles.portraitPanel}>
            <video
              ref={(el) => {
                if (el) {
                  el.muted = true;
                  el.volume = 0;
                }
              }}
              src="/astra/astra-video.mp4"
              poster="/astra/astra-portrait.jpg"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              style={styles.video}
            />
            
            {/* HUD Corner Tech Brackets */}
            <div style={styles.hudBracketTL} />
            <div style={styles.hudBracketTR} />
            <div style={styles.hudBracketBL} />
            <div style={styles.hudBracketBR} />

            {/* Blinking Live Indicator */}
            <div style={styles.liveIndicator}>
              <span className="astra-live-dot" style={styles.liveDot} />
              <span style={styles.liveText}>ASTRA FEED // LIVE</span>
            </div>

            {/* Scanning line and glass shade */}
            <div className="astra-scanline" style={styles.scanline} />
            <div style={styles.videoShade} />
          </div>
        )}

        {/* Content Panel */}
        <div style={{ ...styles.content, ...(isCompact ? styles.contentCompact : {}) }}>
          
          {/* On mobile, show beautiful split header with larger vertical portrait */}
          {isCompact ? (
            <div style={styles.mobileHeaderRow}>
              {/* Astra Vertical 3:4 portrait (not a squished square anymore) */}
              <div style={styles.mobilePortraitContainer}>
                <video
                  ref={(el) => {
                    if (el) {
                      el.muted = true;
                      el.volume = 0;
                    }
                  }}
                  src="/astra/astra-video.mp4"
                  poster="/astra/astra-portrait.jpg"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  style={styles.mobileVideo}
                />
                
                {/* HUD Brackets for Mobile Portrait */}
                <div style={styles.hudBracketTL} />
                <div style={styles.hudBracketTR} />
                <div style={styles.hudBracketBL} />
                <div style={styles.hudBracketBR} />

                {/* Compact Live Indicator for Mobile */}
                <div style={styles.liveIndicatorMobile}>
                  <span className="astra-live-dot" style={styles.liveDot} />
                  <span style={styles.liveTextMobile}>LIVE</span>
                </div>

                {/* Scanline and shadow */}
                <div className="astra-scanline" style={styles.scanline} />
                <div style={styles.videoShade} />
              </div>

              {/* Text Header column next to portrait on mobile */}
              <div style={styles.mobileHeaderTextContainer}>
                <div style={styles.eyebrow}>{t('academy.surface_intro.eyebrow')}</div>
                <h2 style={styles.titleMobile}>{t('academy.surface_intro.title')}</h2>
                
                {/* Progress bar */}
                <div style={styles.progressRow}>
                  {Array.from({ length: STEP_COUNT }, (_, index) => (
                    <span
                      key={index}
                      style={{
                        ...styles.stepDot,
                        ...(index === step ? styles.stepDotActive : {}),
                        ...(index < step ? styles.stepDotDone : {}),
                      }}
                    />
                  ))}
                  <span style={styles.stepText}>{step + 1}/{STEP_COUNT}</span>
                </div>
              </div>
            </div>
          ) : (
            /* On desktop, show simple standard header */
            <>
              <div style={styles.eyebrow}>{t('academy.surface_intro.eyebrow')}</div>
              <h2 style={styles.title}>{t('academy.surface_intro.title')}</h2>
              
              <div style={styles.progressRow}>
                {Array.from({ length: STEP_COUNT }, (_, index) => (
                  <span
                    key={index}
                    style={{
                      ...styles.stepDot,
                      ...(index === step ? styles.stepDotActive : {}),
                      ...(index < step ? styles.stepDotDone : {}),
                    }}
                  />
                ))}
                <span style={styles.stepText}>{step + 1}/{STEP_COUNT}</span>
              </div>
            </>
          )}

          {/* Body message section (spans full width, giving it much needed breathing room!) */}
          <div style={styles.bodyWrapper}>
            <p style={{ ...styles.body, ...(isCompact ? styles.bodyCompact : {}) }}>
              {t(`academy.surface_intro.step_${step + 1}`)}
            </p>
          </div>

          {/* Action buttons bar */}
          <div style={{ ...styles.actions, ...(isCompact ? styles.actionsCompact : {}) }}>
            {voicePlaying ? (
              <button
                type="button"
                className="astra-btn-voice astra-btn-voice-icon"
                style={{
                  ...(isCompact ? styles.iconButtonCompact : {}),
                  color: '#ff9988',
                  borderColor: 'rgba(204, 68, 68, 0.45)',
                  background: 'rgba(204, 68, 68, 0.1)',
                }}
                onClick={handleMuteVoice}
                aria-label={t('common.mute')}
                title={t('common.mute')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6H5L8 3V13L5 10H3Z" />
                  <line x1="11" y1="6" x2="14" y2="9" />
                  <line x1="14" y1="6" x2="11" y2="9" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className="astra-btn-voice"
                style={isCompact ? styles.buttonCompactVoice : undefined}
                onClick={handleStartVoice}
              >
                {t('academy.surface_intro.listen_voice')}
              </button>
            )}
            <button
              type="button"
              className="astra-btn-secondary"
              style={isCompact ? styles.buttonCompact : {}}
              onClick={() => {
                playSfx('ui-click', 0.06);
                try { localStorage.setItem('nebulife_surface_astra_lesson_seen', '1'); } catch { /* ignore */ }
                stopVoice();
                onDismiss();
              }}
            >
              {t('academy.surface_intro.later')}
            </button>
            <button
              type="button"
              className="astra-btn-primary"
              style={isCompact ? styles.buttonCompact : {}}
              onClick={handleNext}
            >
              {step >= STEP_COUNT - 1 ? t('academy.surface_intro.to_game') : t('academy.surface_intro.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9820,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(18px + env(safe-area-inset-top, 0px)) 14px calc(72px + env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
    background: 'rgba(2, 4, 12, 0.72)',
    backdropFilter: 'blur(5px)',
    fontFamily: 'monospace',
  },
  card: {
    width: 'min(640px, 94vw)',
    height: 'min(450px, 80vh)',
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 10,
    border: '1px solid rgba(123,184,255,0.28)',
    background: 'linear-gradient(145deg, rgba(6,12,24,0.98), rgba(12,20,34,0.95))',
    boxShadow: '0 24px 70px rgba(0,0,0,0.68), inset 0 0 34px rgba(123,184,255,0.05)',
  },
  cardCompact: {
    flexDirection: 'column',
    height: 'auto',
    maxHeight: 'min(580px, 90vh)',
    width: 'min(420px, 94vw)',
  },
  portraitPanel: {
    position: 'relative',
    flex: '0 0 170px',
    background: '#01030a',
    borderRight: '1px solid rgba(123,184,255,0.22)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '50% 18%',
    display: 'block',
    filter: 'saturate(0.85) contrast(1.05) brightness(0.9)',
  },
  videoShade: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(2,5,16,0.12), rgba(2,5,16,0.5))',
    pointerEvents: 'none',
    zIndex: 4,
  },
  scanline: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(123,184,255,0) 0%, rgba(123,184,255,0.08) 10%, rgba(123,184,255,0.08) 12%, rgba(123,184,255,0) 22%)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(2,5,16,0.7)',
    padding: '4px 8px',
    borderRadius: 3,
    border: '1px solid rgba(123,184,255,0.2)',
    backdropFilter: 'blur(4px)',
  },
  liveIndicatorMobile: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(2,5,16,0.75)',
    padding: '3px 6px',
    borderRadius: 3,
    border: '1px solid rgba(123,184,255,0.2)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#44ff88',
    display: 'inline-block',
  },
  liveText: {
    color: '#88ffaa',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  liveTextMobile: {
    color: '#88ffaa',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  hudBracketTL: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 12,
    height: 12,
    borderTop: '2px solid rgba(123,184,255,0.45)',
    borderLeft: '2px solid rgba(123,184,255,0.45)',
    pointerEvents: 'none',
    zIndex: 6,
  },
  hudBracketTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderTop: '2px solid rgba(123,184,255,0.45)',
    borderRight: '2px solid rgba(123,184,255,0.45)',
    pointerEvents: 'none',
    zIndex: 6,
  },
  hudBracketBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 12,
    height: 12,
    borderBottom: '2px solid rgba(123,184,255,0.45)',
    borderLeft: '2px solid rgba(123,184,255,0.45)',
    pointerEvents: 'none',
    zIndex: 6,
  },
  hudBracketBR: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 12,
    height: 12,
    borderBottom: '2px solid rgba(123,184,255,0.45)',
    borderRight: '2px solid rgba(123,184,255,0.45)',
    pointerEvents: 'none',
    zIndex: 6,
  },
  content: {
    flex: 1,
    padding: '24px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  contentCompact: {
    padding: '16px 16px 14px',
  },
  mobileHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  mobilePortraitContainer: {
    position: 'relative',
    width: 100,
    height: 135,
    flexShrink: 0,
    background: '#01030a',
    borderRadius: 6,
    border: '1px solid rgba(123,184,255,0.3)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  mobileVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '50% 18%',
    display: 'block',
    filter: 'saturate(0.85) contrast(1.05) brightness(0.9)',
  },
  mobileHeaderTextContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  eyebrow: {
    color: '#7bb8ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#cdd9e8',
    fontSize: 'clamp(18px, 3.8vw, 24px)',
    fontWeight: 'normal',
    margin: '0 0 10px',
    lineHeight: 1.25,
  },
  titleMobile: {
    color: '#cdd9e8',
    fontSize: 15,
    fontWeight: 'normal',
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  bodyWrapper: {
    flex: 1,
    minHeight: 80,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  body: {
    color: '#aabbcc',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  bodyCompact: {
    fontSize: 12.5,
    lineHeight: 1.5,
    margin: '0 0 12px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#1d2a3d',
    boxShadow: '0 0 0 1px rgba(123,184,255,0.15)',
    transition: 'all 0.3s ease',
  },
  stepDotActive: {
    background: '#7bb8ff',
    boxShadow: '0 0 10px rgba(123,184,255,0.7)',
    transform: 'scale(1.15)',
  },
  stepDotDone: {
    background: '#44ff88',
  },
  stepText: {
    marginLeft: 6,
    color: '#556677',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  actionsCompact: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  buttonCompact: {
    flex: 1,
    padding: '8px 6px',
    fontSize: 11,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  buttonCompactVoice: {
    flex: '0 0 auto',
    padding: '8px 12px',
    fontSize: 11,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  iconButtonCompact: {
    flex: '0 0 40px',
    padding: '8px',
  },
};
