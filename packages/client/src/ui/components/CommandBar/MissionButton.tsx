import React from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../../audio/SfxPlayer.js';

interface MissionButtonProps {
  /** Missions currently in flight (non-idle). */
  activeCount: number;
  /** Total mission slots. */
  total: number;
  onClick: () => void;
}

/**
 * Cross-cutting square button living at the right end of the CommandBar tools.
 * Shows a freighter glyph + an "N/M" counter; highlighted while missions fly.
 */
export function MissionButton({ activeCount, total, onClick }: MissionButtonProps) {
  const { t } = useTranslation();
  const active = activeCount > 0;

  return (
    <button
      onClick={() => { playSfx('ui-click', 0.07); onClick(); }}
      title={t('terraform.tracker_title')}
      aria-label={t('terraform.tracker_title')}
      style={{
        width: 'clamp(42px, 11.5vw, 48px)',
        height: 44,
        minHeight: 44,
        boxSizing: 'border-box',
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        padding: '2px',
        background: active ? 'rgba(20, 38, 58, 0.6)' : 'rgba(10, 18, 32, 0.42)',
        border: `1px solid ${active ? 'rgba(120, 184, 255, 0.62)' : 'rgba(68, 102, 136, 0.5)'}`,
        borderRadius: 3,
        color: active ? '#aaccee' : '#9fb8d0',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.2s',
        animation: active ? 'cmdbar-glow 2.4s ease-in-out infinite' : undefined,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Freighter / supply ship glyph */}
        <path d="M8 1.6 C9.7 3.2 10.4 5.3 10.4 7.6 L10.4 10.4 L5.6 10.4 L5.6 7.6 C5.6 5.3 6.3 3.2 8 1.6 Z" />
        <path d="M5.6 8.4 L3.2 10.2 L3.2 12 L5.6 11.1 M10.4 8.4 L12.8 10.2 L12.8 12 L10.4 11.1" />
        <circle cx="8" cy="6.4" r="1.1" />
        <path d="M6.7 11.4 L6.7 13.2 M9.3 11.4 L9.3 13.2 M8 11.4 L8 14" opacity="0.7" />
      </svg>
      <span style={{ fontSize: 9, letterSpacing: 0.4, lineHeight: 1 }}>
        {activeCount}/{total}
      </span>
    </button>
  );
}
