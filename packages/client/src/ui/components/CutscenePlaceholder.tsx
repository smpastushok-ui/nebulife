import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// CutscenePlaceholder — fullscreen video placeholder with auto-advance
// Follows the pattern from OnboardingScreen.tsx VideoPlaceholder
// ---------------------------------------------------------------------------

interface CutscenePlaceholderProps {
  label: string;
  duration?: number;    // seconds before auto-advance (default 5)
  onComplete: () => void;
}

export function CutscenePlaceholder({ label, duration = 5, onComplete }: CutscenePlaceholderProps) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= duration) {
          clearInterval(id);
          setTimeout(onComplete, 300);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [duration, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const progress = Math.min(100, (elapsed / duration) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#020510',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        pointerEvents: 'auto',
      }}
    >
      {/* Video placeholder area */}
      <div
        style={{
          width: '90%',
          maxWidth: 720,
          aspectRatio: '16/9',
          background: 'rgba(15,20,35,0.8)',
          border: '1px dashed #334455',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#445566',
          fontSize: 13,
          textAlign: 'center',
          padding: 20,
        }}
      >
        {label}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '90%',
          maxWidth: 720,
          height: 3,
          background: 'rgba(30,40,55,0.6)',
          borderRadius: 2,
          marginTop: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4488aa',
            borderRadius: 2,
            transition: 'width 0.5s linear',
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        style={{
          marginTop: 20,
          padding: '8px 24px',
          background: 'rgba(20,30,45,0.6)',
          border: '1px solid #334455',
          borderRadius: 4,
          color: '#667788',
          fontFamily: 'monospace',
          fontSize: 11,
          cursor: 'pointer',
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = '#aabbcc';
          (e.currentTarget as HTMLElement).style.borderColor = '#446688';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = '#667788';
          (e.currentTarget as HTMLElement).style.borderColor = '#334455';
        }}
      >
        {t('common.skip')}
      </button>

      {/* Subtitle text */}
      <div style={{ marginTop: 12, fontSize: 10, color: '#334455' }}>
        {t('cutscene.coming_soon')}
      </div>
    </div>
  );
}
