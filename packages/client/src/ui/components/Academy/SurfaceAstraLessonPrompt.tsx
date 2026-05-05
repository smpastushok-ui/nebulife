import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../../audio/SfxPlayer.js';

interface SurfaceAstraLessonPromptProps {
  onDismiss: () => void;
}

export function SurfaceAstraLessonPrompt({ onDismiss }: SurfaceAstraLessonPromptProps) {
  const { t, i18n } = useTranslation();
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voicePart, setVoicePart] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 680;
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

  const handleToggleVoice = () => {
    playSfx('ui-click', 0.05);

    if (voicePlaying) {
      audioRef.current?.pause();
      setVoicePlaying(false);
      return;
    }

    audioRef.current?.pause();
    setVoicePart(1);
    playVoicePart(0);
  };

  const playVoicePart = (index: number) => {
    const src = voiceSources[index];
    if (!src) {
      setVoicePlaying(false);
      setVoicePart(0);
      return;
    }
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = 0.9;
    audioRef.current = audio;
    setVoicePlaying(true);
    setVoicePart(index + 1);
    audio.onended = () => playVoicePart(index + 1);
    audio.onerror = () => {
      // Missing segment should not block the lesson; continue with the next one.
      playVoicePart(index + 1);
    };
    void audio.play().catch(() => setVoicePlaying(false));
  };

  return (
    <div style={styles.backdrop}>
      <div style={{ ...styles.card, ...(isCompact ? styles.cardCompact : {}) }}>
        <div style={{ ...styles.portraitPanel, ...(isCompact ? styles.portraitPanelCompact : {}) }}>
          <video
            src="/astra/astra-video.mp4"
            poster="/astra/astra-portrait.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            style={styles.video}
          />
          <div style={styles.videoShade} />
        </div>

        <div style={styles.content}>
          <div style={styles.eyebrow}>{t('academy.surface_intro.eyebrow')}</div>
          <h2 style={styles.title}>{t('academy.surface_intro.title')}</h2>
          <p style={styles.body}>{t('academy.surface_intro.body_1')}</p>
          <p style={styles.body}>{t('academy.surface_intro.body_2')}</p>
          <p style={styles.body}>{t('academy.surface_intro.body_3')}</p>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.voiceButton}
              onClick={handleToggleVoice}
            >
              {voicePlaying
                ? `${t('academy.surface_intro.stop_voice')} ${voicePart}/7`
                : t('academy.surface_intro.listen_voice')}
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                playSfx('ui-click', 0.06);
                onDismiss();
              }}
            >
              {t('academy.surface_intro.later')}
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
    background: 'rgba(1, 3, 10, 0.54)',
    backdropFilter: 'blur(3px)',
    fontFamily: 'monospace',
  },
  card: {
    width: 'min(760px, 96vw)',
    maxHeight: 'min(620px, 86vh)',
    display: 'grid',
    gridTemplateColumns: 'minmax(150px, 0.72fr) minmax(0, 1.28fr)',
    overflow: 'hidden',
    borderRadius: 8,
    border: '1px solid rgba(123,184,255,0.34)',
    background: 'linear-gradient(145deg, rgba(5,10,20,0.97), rgba(13,22,36,0.94))',
    boxShadow: '0 18px 60px rgba(0,0,0,0.62), inset 0 0 34px rgba(123,184,255,0.05)',
  },
  cardCompact: {
    gridTemplateColumns: '1fr',
    maxHeight: '88vh',
  },
  portraitPanel: {
    position: 'relative',
    minHeight: 280,
    background: '#020510',
    borderRight: '1px solid rgba(68,102,136,0.38)',
  },
  portraitPanelCompact: {
    minHeight: 150,
    maxHeight: 190,
    borderRight: 'none',
    borderBottom: '1px solid rgba(68,102,136,0.38)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '50% 18%',
    display: 'block',
    filter: 'saturate(0.9) contrast(0.95) brightness(0.86)',
  },
  videoShade: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(2,5,16,0.02), rgba(2,5,16,0.42))',
    pointerEvents: 'none',
  },
  content: {
    padding: '22px 24px',
    overflowY: 'auto',
  },
  eyebrow: {
    color: '#7bb8ff',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 9,
  },
  title: {
    color: '#cdd9e8',
    fontSize: 'clamp(18px, 3.8vw, 25px)',
    fontWeight: 'normal',
    margin: '0 0 14px',
    lineHeight: 1.25,
  },
  body: {
    color: '#aabbcc',
    fontSize: 13,
    lineHeight: 1.72,
    margin: '0 0 12px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    background: 'rgba(68,136,170,0.24)',
    border: '1px solid rgba(123,184,255,0.56)',
    borderRadius: 4,
    color: '#d6efff',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  voiceButton: {
    background: 'rgba(68,255,136,0.1)',
    border: '1px solid rgba(68,255,136,0.42)',
    borderRadius: 4,
    color: '#aaf5c8',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  secondaryButton: {
    background: 'transparent',
    border: '1px solid rgba(68,102,136,0.52)',
    borderRadius: 4,
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px 14px',
    cursor: 'pointer',
  },
};
