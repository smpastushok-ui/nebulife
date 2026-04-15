import React from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// FreeTaskHUD — Floating counter for free-task tutorial step
// ---------------------------------------------------------------------------
// Shows "Дослiдження: 0/2" during tutorial step 8 (free task).
// Positioned top-center, z-index 10051.
// ---------------------------------------------------------------------------

interface FreeTaskHUDProps {
  current: number;
  total: number;
}

export function FreeTaskHUD({ current, total }: FreeTaskHUDProps) {
  const { t } = useTranslation();
  const isComplete = current >= total;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(14px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10051,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 18px',
        background: 'rgba(10, 15, 25, 0.95)',
        border: `1px solid ${isComplete ? '#44ff88' : '#446688'}`,
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 12,
        color: isComplete ? '#44ff88' : '#aabbcc',
        transition: 'border-color 0.3s, color 0.3s',
        pointerEvents: 'none',
      }}
    >
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
      <span>
        {t('tutorial.research_progress', { current, total })}
      </span>
      {isComplete && (
        <span style={{ fontSize: 10, color: '#44ff88' }}>{t('tutorial.done')}</span>
      )}
    </div>
  );
}
