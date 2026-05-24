import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// FreeTaskHUD — Floating counter for free-task tutorial step
// ---------------------------------------------------------------------------

interface FreeTaskHUDProps {
  current: number;
  total: number;
}

export function FreeTaskHUD({ current, total }: FreeTaskHUDProps) {
  const { t, i18n } = useTranslation();
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const isComplete = current >= total;
  const markers = Array.from({ length: total }, (_, index) => index < current);

  useEffect(() => {
    const isUkrainian = i18n.language.startsWith('uk');
    const clip = isUkrainian ? 'free_task_ua' : 'Free_Task_en';
    const ext = Capacitor.getPlatform() === 'android' ? 'webm' : 'mp3';
    const audio = new Audio(`/astra/voice/${clip}.${ext}`);
    audio.preload = 'auto';
    audio.volume = 0.86;
    voiceRef.current = audio;
    void audio.play().catch(() => { /* autoplay blocked */ });
    return () => {
      voiceRef.current?.pause();
      voiceRef.current = null;
    };
  }, [i18n.language]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(14px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10051,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 220,
        padding: '8px 18px',
        background: 'rgba(10, 15, 25, 0.95)',
        border: `1px solid ${isComplete ? '#44ff88' : '#446688'}`,
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 12,
        color: isComplete ? '#44ff88' : '#aabbcc',
        transition: 'border-color 0.3s, color 0.3s',
        pointerEvents: 'none',
        boxShadow: isComplete
          ? '0 0 18px rgba(68,255,136,0.22), inset 0 0 18px rgba(68,255,136,0.08)'
          : '0 0 18px rgba(123,184,255,0.18), inset 0 0 18px rgba(123,184,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke={isComplete ? '#44ff88' : '#4488aa'}
          strokeWidth="1.2"
        >
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="2" />
          <line x1="8" y1="2" x2="8" y2="5" />
          <line x1="8" y1="11" x2="8" y2="14" />
          <line x1="2" y1="8" x2="5" y2="8" />
          <line x1="11" y1="8" x2="14" y2="8" />
        </svg>
        <span>{t('tutorial.research_progress', { current, total })}</span>
        {isComplete && (
          <span style={{ fontSize: 10, color: '#44ff88' }}>{t('tutorial.done')}</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${total}, 1fr)`, gap: 6, width: '100%' }}>
        {markers.map((done, index) => (
          <div
            key={index}
            style={{
              height: 4,
              borderRadius: 2,
              background: done
                ? 'linear-gradient(90deg, #2b8855, #44ff88)'
                : 'linear-gradient(90deg, rgba(68,136,170,0.18), rgba(123,184,255,0.34))',
              boxShadow: done
                ? '0 0 8px rgba(68,255,136,0.35)'
                : '0 0 8px rgba(123,184,255,0.18)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
