import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../audio/SfxPlayer.js';

interface EntryDigestPopupProps {
  onOpen: () => void;
  onLater: () => void;
}

const STYLE_ID = 'digest-entry-keyframes';
const KEYFRAMES = `
@keyframes digest-pop-in { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes digest-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes digest-sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
@keyframes digest-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }
`;

/**
 * "Welcome back" entry card surfaced once per unseen weekly digest. Themed to the
 * deep-space palette with a subtle transmission-sweep so it reads as an incoming
 * broadcast rather than a generic alert.
 */
export function EntryDigestPopup({ onOpen, onLater }: EntryDigestPopupProps) {
  const { t } = useTranslation();
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current || document.getElementById(STYLE_ID)) { injected.current = true; return; }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
    injected.current = true;
  }, []);

  useEffect(() => { playSfx('ui-click', 0.08); }, []);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 21000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(2,5,16,0.72)', backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'digest-fade-in 0.25s ease-out',
        padding: 'calc(16px + env(safe-area-inset-top,0px)) 16px calc(16px + env(safe-area-inset-bottom,0px))',
      }}
      onClick={onLater}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(380px, 92vw)',
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #334455',
          borderRadius: 6,
          padding: '22px 22px 18px',
          fontFamily: 'monospace',
          color: '#aabbcc',
          boxShadow: '0 14px 50px rgba(0,0,0,0.65), 0 0 0 1px rgba(68,102,136,0.18)',
          overflow: 'hidden',
          animation: 'digest-pop-in 0.32s cubic-bezier(0.2,0.9,0.3,1.1)',
        }}
      >
        {/* Transmission sweep */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #7bb8ff, transparent)',
          opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(123,184,255,0.06), transparent)',
          animation: 'digest-sweep 3.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0,
            borderRadius: '50%',
            border: '1px solid rgba(123,184,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(20,38,58,0.55)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#7bb8ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2.2" />
              <path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21" style={{ animation: 'digest-pulse 2.2s ease-in-out infinite' }} />
              <path d="M6.5 6.5 C9 9 15 9 17.5 6.5 M6.5 17.5 C9 15 15 15 17.5 17.5" opacity="0.6" />
            </svg>
          </div>
          <div style={{
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            color: '#7bb8ff',
          }}>
            {t('chat.weekly_digest_available')}
          </div>
        </div>

        <div style={{ fontSize: 16, color: '#d7e8f4', marginBottom: 8, fontWeight: 700 }}>
          {t('chat.digest_entry_title')}
        </div>
        <div style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.5, marginBottom: 18 }}>
          {t('chat.digest_entry_subtitle')}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { playSfx('ui-click', 0.08); onLater(); }}
            style={{
              flex: '0 0 auto', padding: '9px 16px',
              background: 'none', border: '1px solid #334455', borderRadius: 4,
              color: '#8899aa', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
            }}
          >
            {t('chat.digest_entry_later')}
          </button>
          <button
            onClick={() => { playSfx('ui-click', 0.08); onOpen(); }}
            style={{
              flex: 1, padding: '9px 16px',
              background: 'linear-gradient(135deg, rgba(30,60,120,0.7), rgba(60,100,180,0.5))',
              border: '1px solid rgba(120,184,255,0.55)', borderRadius: 4,
              color: '#d7e8f4', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            {t('chat.open_digest')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
