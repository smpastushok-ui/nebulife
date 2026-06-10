import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatShort } from '../../utils/formatNumber.js';
import type { GalaxyStats } from '../../api/player-api.js';

// ---------------------------------------------------------------------------
// GalaxyStatsBar — top-center HUD showing live galaxy (cluster) scale:
//   colonies · players online · star systems · planets
// Swaps in/out with the ResourceDisplay top panel (see App.tsx topBarMode).
// ---------------------------------------------------------------------------

interface GalaxyStatsBarProps {
  stats: GalaxyStats | null;
}

function useIconSize(): number {
  const [size, setSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 14;
    if (window.innerWidth < 360) return 11;
    if (window.innerWidth < 480) return 13;
    return 15;
  });
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 360) setSize(11);
      else if (window.innerWidth < 480) setSize(13);
      else setSize(15);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

const panelStyle: React.CSSProperties = {
  zIndex: 9700,
  position: 'fixed',
  top: 'calc(12px + env(safe-area-inset-top, 0px))',
  left: '50%',
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  background: 'rgba(10,15,25,0.92)',
  border: '1px solid #334455',
  borderRadius: 4,
  padding: '6px 10px',
  fontFamily: 'monospace',
  color: '#aabbcc',
  pointerEvents: 'auto',
  minWidth: 0,
  maxWidth: 'calc(100vw - 16px)',
  animation: 'galaxyStatsIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 14,
  background: 'rgba(51,68,85,0.6)',
  margin: '0 8px',
  flexShrink: 0,
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  flexShrink: 0,
  minWidth: 0,
};

const numStyle: React.CSSProperties = {
  fontSize: 'clamp(9px, 2.4vw, 12px)',
  whiteSpace: 'nowrap',
};

// --- Icons (viewBox 0 0 16 16, semantic stroke colors, Game Bible palette) ---

/** Group of people — players online. */
function OnlineIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="#44ff88" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="5.4" cy="5" r="2.1" />
      <path d="M1.8 13 c0-2.6 1.6-4 3.6-4 s3.6 1.4 3.6 4" />
      <circle cx="11.2" cy="5.8" r="1.7" opacity="0.7" />
      <path d="M9.8 13 c0-2.3 1.3-3.6 2.9-3.6 s2.9 1.3 2.9 3.6" opacity="0.7" />
    </svg>
  );
}

/** Planet with a planted flag — colonies. */
function ColonyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="#ff8844" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="7.4" cy="10.6" r="3.9" />
      <path d="M7.4 6.7 V2.1" />
      <path d="M7.4 2.4 L11.3 3.4 L7.4 4.8 Z" fill="#ff8844" stroke="none" />
      <path d="M4.6 10.9 H10.2" opacity="0.5" />
    </svg>
  );
}

/** Orbital system — star systems. */
function SystemsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="#7bb8ff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="1.7" fill="#7bb8ff" stroke="none" />
      <ellipse cx="8" cy="8" rx="6.4" ry="2.9" />
      <ellipse cx="8" cy="8" rx="6.4" ry="2.9" transform="rotate(60 8 8)" />
      <circle cx="14.2" cy="8.7" r="0.95" fill="#7bb8ff" stroke="none" opacity="0.8" />
    </svg>
  );
}

/** Ringed planet — planets. */
function PlanetsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="#9fd0c0" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="3.6" />
      <ellipse cx="8" cy="8" rx="7" ry="2.3" transform="rotate(-22 8 8)" />
    </svg>
  );
}

export function GalaxyStatsBar({ stats }: GalaxyStatsBarProps) {
  const { t } = useTranslation();
  const size = useIconSize();
  const fmt = (v: number | undefined) => (v == null ? '—' : formatShort(v));

  return (
    <>
      <style>{`
        @keyframes galaxyStatsIn {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div style={panelStyle}>
        <div style={itemStyle} title={t('galaxy_stats.colonies')}>
          <ColonyIcon size={size} />
          <span style={{ ...numStyle, color: '#ff8844' }}>{fmt(stats?.colonies)}</span>
        </div>
        <div style={dividerStyle} />
        <div style={itemStyle} title={t('galaxy_stats.players_online')}>
          <OnlineIcon size={size} />
          <span style={{ ...numStyle, color: '#44ff88' }}>{fmt(stats?.playersOnline)}</span>
        </div>
        <div style={dividerStyle} />
        <div style={itemStyle} title={t('galaxy_stats.star_systems')}>
          <SystemsIcon size={size} />
          <span style={{ ...numStyle, color: '#7bb8ff' }}>{fmt(stats?.starSystems)}</span>
        </div>
        <div style={dividerStyle} />
        <div style={itemStyle} title={t('galaxy_stats.planets')}>
          <PlanetsIcon size={size} />
          <span style={{ ...numStyle, color: '#9fd0c0' }}>{fmt(stats?.planets)}</span>
        </div>
      </div>
    </>
  );
}
