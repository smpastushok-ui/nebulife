// ---------------------------------------------------------------------------
// HangarPage — Combat hangar: ship selection, pilot stats, arena entry
// Animated entrance, countUp numbers, 5 ship slots (3 open + 2 locked stubs),
// arena entry cost UI (1 quark / 1 ad — stubs for now)
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '../../../i18n/index.js';
import { playLoop, stopLoop, playSfx } from '../../../audio/SfxPlayer.js';

// ── Types ────────────────────────────────────────────────────────────────────

interface HangarPageProps {
  playerLevel: number;
  arenaStats: {
    kills: number;
    asteroidKills: number;
    deaths: number;
    score: number;
    bestScore: number;
    sessions: number;
  } | null;
  onBack: () => void;
  onEnterArena: () => void;
}

// ── Ship slots ───────────────────────────────────────────────────────────────

interface ShipSlot {
  id: string;
  src: string;
  locked: boolean;
  label: string;
  cost?: number;
  costLabel?: string;
}

const SHIP_SLOTS: ShipSlot[] = [
  { id: 'ship1', src: '/arena_ships/star_ship1.webp', locked: false, label: 'FALCON' },
  { id: 'ship2', src: '/arena_ships/star_ship2.webp', locked: false, label: 'VIPER' },
  { id: 'ship3', src: '/arena_ships/star_ship3.webp', locked: false, label: 'PHANTOM' },
  { id: 'ship4', src: '', locked: true, label: '2D CUSTOM', cost: 50, costLabel: '50 Q' },
  { id: 'ship5', src: '', locked: true, label: '3D CUSTOM', cost: 500, costLabel: '500 Q' },
];

const SELECTED_SHIP_KEY = 'nebulife_hangar_ship';

// ── CountUp hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 2000, delay = 300): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const timeout = setTimeout(() => {
      startRef.current = performance.now();
      const tick = (now: number) => {
        const elapsed = now - (startRef.current ?? now);
        const t = Math.min(1, elapsed / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return value;
}

// ── Component ────────────────────────────────────────────────────────────────

export const HangarPage: React.FC<HangarPageProps> = ({
  playerLevel,
  arenaStats,
  onBack,
  onEnterArena,
}) => {
  const { t } = useT();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Ambient loop
  useEffect(() => {
    playLoop('angar', 0.5);
    return () => stopLoop('angar');
  }, []);

  // Trigger entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Ship selection
  const [selectedShip, setSelectedShip] = useState<string>(() =>
    localStorage.getItem(SELECTED_SHIP_KEY) || SHIP_SLOTS[0].id,
  );
  useEffect(() => {
    localStorage.setItem(SELECTED_SHIP_KEY, selectedShip);
  }, [selectedShip]);

  const activeSlot = SHIP_SLOTS.find(s => s.id === selectedShip) ?? SHIP_SLOTS[0];

  // Backward compat: old localStorage may have missileKills
  const stats = arenaStats;
  const asteroidsVal = stats
    ? (stats.asteroidKills ?? (stats as Record<string, number>).missileKills ?? 0)
    : 0;
  const hasStats = stats && stats.sessions > 0;

  // CountUp animated values
  const cSessions = useCountUp(hasStats ? stats.sessions : 0, 2000, 400);
  const cKills = useCountUp(hasStats ? asteroidsVal : 0, 2000, 500);
  const cDeaths = useCountUp(hasStats ? stats.deaths : 0, 2000, 600);
  const cScore = useCountUp(hasStats ? stats.bestScore : 0, 2500, 700);

  // Ship card click
  const handleShipClick = useCallback((slot: ShipSlot) => {
    if (slot.locked) {
      playSfx('ui-click', 0.07);
      setToast(t('hangar.event.coming_soon'));
      setTimeout(() => setToast(null), 2500);
      return;
    }
    playSfx('ui-click', 0.07);
    setSelectedShip(slot.id);
  }, [t]);

  // Arena entry
  const handleEnter = useCallback(() => {
    playSfx('ui-click', 0.07);
    // TODO: deduct 1 quark or verify ad watched
    onEnterArena();
  }, [onEnterArena]);

  const handleWatchAd = useCallback(() => {
    playSfx('ui-click', 0.07);
    setToast(t('hangar.event.coming_soon'));
    setTimeout(() => setToast(null), 2500);
  }, [t]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>
      <div style={S.starfield} />
      <div style={S.vignette} />

      <div style={S.scroll}>
        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{
          ...S.header,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <button style={S.backBtn} onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('hangar.back')}
          </button>
          <div style={S.titleBlock}>
            <h1 style={S.title}>{t('hangar.title')}</h1>
            <div style={S.subtitle}>{t('hangar.subtitle')}</div>
          </div>
          <div style={S.badge}>
            <div style={S.badgeLabel}>{t('hangar.pilot')}</div>
            <div style={S.badgeLevel}>L{playerLevel}</div>
          </div>
        </div>

        {/* ── Stats strip (animated countUp) ────────────────────────── */}
        {hasStats && (
          <div style={{
            ...S.statsStrip,
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.6s ease 0.2s',
          }}>
            <StatCell label={t('hangar.stats.sessions')} value={cSessions} />
            <StatCell label={t('hangar.stats.kills')} value={cKills} />
            <StatCell label={t('hangar.stats.deaths')} value={cDeaths} />
            <StatCell label={t('hangar.stats.best_score')} value={cScore} color="#44ff88" />
          </div>
        )}

        {/* ── Ship preview ──────────────────────────────────────────── */}
        <div style={{
          ...S.previewWrap,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.85)',
          transition: 'opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s',
        }}>
          {!activeSlot.locked && activeSlot.src ? (
            <img src={activeSlot.src} alt="ship" style={S.previewImg} />
          ) : (
            <div style={S.previewLocked}>
              <LockIcon />
              <div style={{ fontSize: 10, color: '#556677', marginTop: 8 }}>
                {activeSlot.costLabel}
              </div>
            </div>
          )}
          <div style={S.previewName}>{activeSlot.label}</div>
        </div>

        {/* ── Ship selector (horizontal scroll) ─────────────────────── */}
        <div style={{
          ...S.selectorScroll,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.5s ease 0.6s',
        }}>
          {SHIP_SLOTS.map((slot, i) => {
            const isActive = slot.id === selectedShip;
            return (
              <button
                key={slot.id}
                style={{
                  ...S.shipCard,
                  border: isActive ? '2px solid #7bb8ff' : '1px solid #223344',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(68,136,170,0.15), rgba(30,50,80,0.3))'
                    : 'linear-gradient(135deg, rgba(10,15,25,0.8), rgba(20,30,50,0.6))',
                  boxShadow: isActive ? '0 0 16px rgba(123,184,255,0.2), inset 0 0 20px rgba(68,136,170,0.1)' : 'none',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.4s ease ${0.7 + i * 0.08}s, transform 0.4s ease ${0.7 + i * 0.08}s, border-color 0.2s, box-shadow 0.2s`,
                }}
                onClick={() => handleShipClick(slot)}
              >
                {slot.locked ? (
                  <div style={S.lockedSlot}>
                    <LockIcon />
                    <div style={S.lockedCost}>{slot.costLabel}</div>
                  </div>
                ) : (
                  <img src={slot.src} alt={slot.id} style={S.cardImg} />
                )}
                <div style={{
                  ...S.cardLabel,
                  color: isActive ? '#7bb8ff' : slot.locked ? '#445566' : '#8899aa',
                }}>
                  {slot.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Arena entry ────────────────────────────────────────────── */}
        <div style={{
          ...S.entrySection,
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.5s ease 0.9s',
        }}>
          <div style={S.entryTitle}>{t('hangar.event.arena')}</div>
          <div style={S.entryDesc}>{t('hangar.event.arena_desc')}</div>
          <div style={S.entryButtons}>
            <button style={S.entryQuark} onClick={handleEnter}>
              1{' '}
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
                <circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" />
                <text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text>
              </svg>
            </button>
            <span style={S.entryOr}>or</span>
            <button style={S.entryAd} onClick={handleWatchAd}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z" /></svg>
              AD
            </button>
          </div>
        </div>

        {/* ── Tournament (coming soon) ──────────────────────────────── */}
        <div style={{
          ...S.tournamentCard,
          opacity: mounted ? 0.35 : 0,
          transition: 'opacity 0.5s ease 1.1s',
        }}>
          <div style={{ fontSize: 11, color: '#556677', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('hangar.event.tournament')}
          </div>
          <div style={{ fontSize: 8, color: '#445566', marginTop: 4 }}>
            {t('hangar.event.tournament_desc')}
          </div>
          <div style={S.comingSoon}>{t('hangar.event.coming_soon')}</div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={S.toast}>{toast}</div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes hangarPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(123,184,255,0.2); }
          50% { box-shadow: 0 0 20px rgba(123,184,255,0.4); }
        }
      `}</style>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={S.statCell}>
      <div style={{ ...S.statValue, color: color || '#aabbcc' }}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#556677" strokeWidth="1.5" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed', inset: 0, background: '#020510',
    zIndex: 9500, fontFamily: 'monospace', color: '#aabbcc', overflow: 'hidden',
  },
  starfield: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.7,
    backgroundImage: `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8), transparent),
      radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.6), transparent),
      radial-gradient(1px 1px at 45% 85%, rgba(255,255,255,0.7), transparent),
      radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.5), transparent),
      radial-gradient(1.5px 1.5px at 55% 40%, rgba(170,200,255,0.7), transparent)`,
    backgroundSize: '600px 600px',
  },
  vignette: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, transparent 20%, rgba(2,5,16,0.7) 80%)',
  },
  scroll: {
    position: 'relative', zIndex: 2, flex: 1, overflow: 'auto',
    display: 'flex', flexDirection: 'column', padding: '0 0 24px',
  },

  // Header
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', borderBottom: '1px solid #1a2a3a', gap: 10, flexShrink: 0,
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', background: 'rgba(10,15,25,0.8)',
    border: '1px solid #334455', borderRadius: 3,
    color: '#8899aa', fontFamily: 'monospace', fontSize: 9,
    letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0,
  },
  titleBlock: { textAlign: 'center', flex: 1, minWidth: 0 },
  title: { margin: 0, fontSize: 18, letterSpacing: 5, color: '#aabbcc', fontWeight: 'normal' },
  subtitle: { fontSize: 7, letterSpacing: 2, color: '#556677', marginTop: 2, textTransform: 'uppercase' },
  badge: {
    padding: '4px 8px', background: 'rgba(10,15,25,0.8)',
    border: '1px solid #446688', borderRadius: 3, textAlign: 'center', flexShrink: 0,
  },
  badgeLabel: { fontSize: 7, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' },
  badgeLevel: { fontSize: 13, color: '#7bb8ff', fontWeight: 'bold' },

  // Stats
  statsStrip: {
    display: 'flex', justifyContent: 'center', gap: 20,
    padding: '10px 16px', borderBottom: '1px solid #1a2333', flexShrink: 0,
  },
  statCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  statValue: { fontSize: 18, letterSpacing: 1, fontWeight: 'bold' },
  statLabel: { fontSize: 7, color: '#556677', letterSpacing: 1.5, textTransform: 'uppercase' },

  // Ship preview
  previewWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '20px 16px 8px', gap: 8,
  },
  previewImg: {
    width: 140, height: 140, objectFit: 'contain',
    filter: 'drop-shadow(0 0 16px rgba(123,184,255,0.3))',
  },
  previewLocked: {
    width: 140, height: 140, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(10,15,25,0.6)', border: '1px dashed #334455', borderRadius: 6,
  },
  previewName: {
    fontSize: 10, color: '#667788', letterSpacing: 3, textTransform: 'uppercase',
  },

  // Ship selector (horizontal)
  selectorScroll: {
    display: 'flex', gap: 10, padding: '8px 16px',
    overflowX: 'auto', scrollSnapType: 'x mandatory',
    flexShrink: 0,
  },
  shipCard: {
    flex: '0 0 auto', width: 90, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6, padding: '10px 6px 8px',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace',
    scrollSnapAlign: 'center',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardImg: { width: 52, height: 52, objectFit: 'contain' },
  cardLabel: { fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  lockedSlot: {
    width: 52, height: 52, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  lockedCost: { fontSize: 8, color: '#4488aa', marginTop: 4, letterSpacing: 1 },

  // Arena entry
  entrySection: {
    margin: '12px 16px 0', padding: 16,
    background: 'rgba(10,15,25,0.7)', border: '1px solid #334455', borderRadius: 6,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  entryTitle: { fontSize: 13, color: '#aabbcc', letterSpacing: 2, textTransform: 'uppercase' },
  entryDesc: { fontSize: 9, color: '#667788', lineHeight: 1.4 },
  entryButtons: {
    display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 4,
  },
  entryQuark: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 20px',
    background: 'linear-gradient(135deg, rgba(68,136,170,0.2), rgba(40,60,100,0.3))',
    border: '1px solid #4488aa', borderRadius: 4,
    color: '#7bb8ff', fontFamily: 'monospace', fontSize: 11,
    letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase',
    animation: 'hangarPulse 2s ease-in-out infinite',
  },
  entryIcon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 18, height: 18, borderRadius: '50%',
    background: 'rgba(68,136,170,0.3)', border: '1px solid #4488aa',
    fontSize: 9, fontWeight: 'bold', color: '#7bb8ff',
  },
  entryOr: { fontSize: 9, color: '#556677', textTransform: 'uppercase' },
  entryAd: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '10px 16px',
    background: 'rgba(10,15,25,0.6)', border: '1px solid #334455', borderRadius: 4,
    color: '#8899aa', fontFamily: 'monospace', fontSize: 10,
    letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase',
  },

  // Tournament
  tournamentCard: {
    margin: '10px 16px 0', padding: 12,
    background: 'rgba(10,15,25,0.5)', border: '1px dashed #223344', borderRadius: 4,
  },
  comingSoon: {
    marginTop: 6, fontSize: 8, color: '#445566', letterSpacing: 2,
    textTransform: 'uppercase', textAlign: 'center',
    padding: '4px 0', border: '1px dashed #223344', borderRadius: 3,
  },

  // Toast
  toast: {
    position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    padding: '8px 20px', background: 'rgba(10,15,25,0.95)',
    border: '1px solid #4488aa', borderRadius: 4,
    color: '#7bb8ff', fontFamily: 'monospace', fontSize: 10,
    letterSpacing: 1, zIndex: 9999, pointerEvents: 'none',
  },
};
