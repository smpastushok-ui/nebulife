import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// FloatingInfoButton — Slowly blinking "i" icon button
// ---------------------------------------------------------------------------
// Positioned to the right of the planet in the exosphere view.
// Clicking opens the planet characteristics popup.
// ---------------------------------------------------------------------------

interface FloatingInfoButtonProps {
  onClick: () => void;
}

export function FloatingInfoButton({ onClick }: FloatingInfoButtonProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'fixed',
          right: '8%',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 35,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: hover ? 'rgba(30, 50, 80, 0.7)' : 'rgba(5, 10, 20, 0.6)',
          border: '1px solid',
          borderColor: hover ? '#4488aa' : '#334455',
          color: hover ? '#aabbcc' : '#667788',
          fontFamily: 'monospace',
          fontSize: 16,
          fontWeight: 'bold',
          fontStyle: 'italic',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s',
          animation: 'info-btn-pulse 3s ease-in-out infinite',
          pointerEvents: 'auto',
        }}
        title={t('planet.characteristics')}
      >
        i
      </button>
      <style>{`
        @keyframes info-btn-pulse {
          0%, 100% { opacity: 0.5; border-color: #334455; }
          50% { opacity: 1; border-color: #4488aa; }
        }
      `}</style>
    </>
  );
}
