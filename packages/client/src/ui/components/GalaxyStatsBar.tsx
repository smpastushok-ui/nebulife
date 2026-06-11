import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatShort } from '../../utils/formatNumber.js';
import type { GalaxyStats } from '../../api/player-api.js';

// ---------------------------------------------------------------------------
// GalaxyStatsBar — top-center HUD showing live galaxy (cluster) scale:
//   total players · star systems · planets
// Shown once per day on entry for ~5s, then swaps to the ResourceDisplay top
// panel (see App.tsx topBarMode). Numbers count up on reveal; items stagger in.
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

/** Count up from 0 to `target` over `duration` ms with ease-out. */
function useCountUp(target: number | undefined, duration = 1100): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (target == null) { setValue(0); return; }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return value;
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
  overflow: 'hidden',
  boxShadow: '0 0 0 1px rgba(123,184,255,0.05), 0 4px 22px rgba(0,0,0,0.45)',
  animation: 'galaxyStatsIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both',
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

  // Count-up animated values (start at 0, ease to the real number on reveal).
  const players = useCountUp(stats?.totalPlayers, 1000);
  const systems = useCountUp(stats?.starSystems, 1200);
  const planets = useCountUp(stats?.planets, 1400);
  const fmt = (live: number, raw: number | undefined) =>
    raw == null ? '—' : formatShort(Math.round(live));

  const items = [
    {
      key: 'players',
      title: t('galaxy_stats.players_total'),
      icon: <OnlineIcon size={size} />,
      color: '#44ff88',
      text: fmt(players, stats?.totalPlayers),
    },
    {
      key: 'systems',
      title: t('galaxy_stats.star_systems'),
      icon: <SystemsIcon size={size} />,
      color: '#7bb8ff',
      text: fmt(systems, stats?.starSystems),
    },
    {
      key: 'planets',
      title: t('galaxy_stats.planets'),
      icon: <PlanetsIcon size={size} />,
      color: '#9fd0c0',
      text: fmt(planets, stats?.planets),
    },
  ];

  return (
    <>
      <style>{`
        @keyframes galaxyStatsIn {
          0%   { opacity: 0; transform: translate(-50%, -16px) scale(0.96); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes galaxyStatItemIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes galaxyStatScan {
          0%   { transform: translateX(-120%); opacity: 0; }
          25%  { opacity: 0.7; }
          70%  { opacity: 0.7; }
          100% { transform: translateX(420%); opacity: 0; }
        }
        @keyframes galaxyStatBorder {
          0%, 100% { border-color: #334455; }
          40%      { border-color: rgba(123,184,255,0.65); }
        }
        .galaxy-stats-bar { animation: galaxyStatsIn 0.55s cubic-bezier(0.16,1,0.3,1) both, galaxyStatBorder 2.4s ease-in-out 0.4s 1; }
        .galaxy-stat-item { animation: galaxyStatItemIn 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .galaxy-stat-scan {
          position: absolute; top: 0; left: 0; height: 100%; width: 28%;
          background: linear-gradient(90deg, transparent, rgba(123,184,255,0.16), transparent);
          animation: galaxyStatScan 1.9s ease-in-out 0.5s 1 both;
          pointer-events: none;
        }
      `}</style>
      <div className="galaxy-stats-bar" style={panelStyle}>
        <div className="galaxy-stat-scan" />
        {items.map((item, i) => (
          <React.Fragment key={item.key}>
            {i > 0 && <div style={dividerStyle} />}
            <div
              className="galaxy-stat-item"
              style={{ ...itemStyle, animationDelay: `${0.25 + i * 0.12}s` }}
              title={item.title}
            >
              {item.icon}
              <span style={{ ...numStyle, color: item.color }}>{item.text}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
