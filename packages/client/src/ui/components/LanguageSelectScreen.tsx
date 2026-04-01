import React from 'react';
import type { Language } from '@nebulife/core';

// ---------------------------------------------------------------------------
// LanguageSelectScreen — shown once on first launch before AuthScreen
// Full-screen language picker, bilingual since user has not chosen yet
// ---------------------------------------------------------------------------

interface LanguageSelectScreenProps {
  onSelect: (lang: Language) => void;
}

export function LanguageSelectScreen({ onSelect }: LanguageSelectScreenProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.title}>
          Select Language / Оберіть мову
        </div>

        <div style={styles.subtitle}>
          <span style={styles.subtitleEn}>Choose your preferred language</span>
          <span style={styles.divider}> / </span>
          <span style={styles.subtitleUk}>Оберіть мову інтерфейсу</span>
        </div>

        <div style={styles.buttons}>
          <button
            style={styles.langButton}
            onClick={() => onSelect('uk')}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(68,136,170,0.25)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#4488aa';
              (e.currentTarget as HTMLButtonElement).style.color = '#ccddee';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,15,25,0.8)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#334455';
              (e.currentTarget as HTMLButtonElement).style.color = '#aabbcc';
            }}
          >
            <span style={styles.langName}>Українська</span>
            <span style={styles.langNative}>Ukrainian</span>
          </button>

          <button
            style={styles.langButton}
            onClick={() => onSelect('en')}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(68,136,170,0.25)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#4488aa';
              (e.currentTarget as HTMLButtonElement).style.color = '#ccddee';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10,15,25,0.8)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#334455';
              (e.currentTarget as HTMLButtonElement).style.color = '#aabbcc';
            }}
          >
            <span style={styles.langName}>English</span>
            <span style={styles.langNative}>Англійська</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2,5,16,0.98)',
    fontFamily: 'monospace',
  },
  card: {
    width: 380,
    padding: '40px 32px',
    background: 'rgba(10,15,25,0.96)',
    border: '1px solid #334455',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    color: '#aabbcc',
    textAlign: 'center',
    letterSpacing: '0.06em',
    lineHeight: 1.5,
  },
  subtitle: {
    fontSize: 10,
    color: '#556677',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  subtitleEn: {
    color: '#667788',
  },
  divider: {
    color: '#445566',
    margin: '0 4px',
  },
  subtitleUk: {
    color: '#667788',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  langButton: {
    width: '100%',
    padding: '14px 20px',
    background: 'rgba(10,15,25,0.8)',
    border: '1px solid #334455',
    borderRadius: 3,
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minHeight: 64,
    justifyContent: 'center',
  },
  langName: {
    fontSize: 14,
    letterSpacing: '0.04em',
  },
  langNative: {
    fontSize: 10,
    color: '#667788',
    letterSpacing: '0.03em',
  },
};
