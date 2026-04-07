// ---------------------------------------------------------------------------
// ArenaTutorial - first-time onboarding overlay for Space Arena
// 8 steps covering controls, weapons, hazards, power-ups
// Persisted in localStorage under 'nebulife_arena_tutorial_done'
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { useT } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';

interface ArenaTutorialProps {
  onComplete: () => void;
  isMobile: boolean;
}

const TUTORIAL_KEY = 'nebulife_arena_tutorial_done';
const TOTAL_STEPS = 8;

export const ArenaTutorial: React.FC<ArenaTutorialProps> = ({ onComplete, isMobile }) => {
  const { t } = useT();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(TUTORIAL_KEY, '1');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    onComplete();
  };

  const stepNum = step + 1;
  const stepKey = `arena.tutorial.step${stepNum}`;
  const bodyKey = isMobile ? `${stepKey}.body_mobile` : `${stepKey}.body_desktop`;

  return (
    <div style={styles.overlay}>
      <div style={styles.backdrop} />
      <div style={styles.card}>
        <div style={styles.progress}>{stepNum} / {TOTAL_STEPS}</div>
        <div style={styles.title}>{t((`${stepKey}.title`) as TranslationKey)}</div>
        <div style={styles.body}>{t(bodyKey as TranslationKey)}</div>
        <div style={styles.actions}>
          <button style={styles.skipBtn} onClick={handleSkip}>
            {t('arena.tutorial.skip')}
          </button>
          <button style={styles.nextBtn} onClick={handleNext}>
            {step < TOTAL_STEPS - 1 ? t('arena.tutorial.next') : t('arena.tutorial.start')}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Checks if tutorial should be shown (returns true on first arena entry) */
export function shouldShowArenaTutorial(): boolean {
  return !localStorage.getItem(TUTORIAL_KEY);
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    fontFamily: 'monospace',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(2,5,16,0.85)',
    backdropFilter: 'blur(4px)',
  },
  card: {
    position: 'relative',
    background: 'rgba(10,15,25,0.95)',
    border: '1px solid #4488aa',
    borderRadius: 6,
    padding: '28px 32px',
    maxWidth: 480,
    minWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    color: '#aabbcc',
    boxShadow: '0 0 40px rgba(68,136,170,0.2)',
  },
  progress: {
    fontSize: 9,
    color: '#667788',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    color: '#7bb8ff',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  body: {
    fontSize: 12,
    lineHeight: 1.7,
    color: '#aabbcc',
    marginBottom: 8,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  skipBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #334455',
    color: '#667788',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1,
    cursor: 'pointer',
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  nextBtn: {
    padding: '8px 20px',
    background: 'rgba(68, 136, 170, 0.2)',
    border: '1px solid #4488aa',
    color: '#7bb8ff',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    cursor: 'pointer',
    borderRadius: 3,
    textTransform: 'uppercase',
  },
};
