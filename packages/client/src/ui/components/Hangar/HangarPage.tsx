// ---------------------------------------------------------------------------
// HangarPage — intermediate screen between main game and Space Arena
// Player's ship, ship selection, upgrades placeholder, events list
// ---------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useT } from '../../../i18n/index.js';

interface HangarPageProps {
  playerLevel: number;
  arenaStats: {
    kills: number;
    missileKills: number;
    deaths: number;
    score: number;
    bestScore: number;
    sessions: number;
  } | null;
  onBack: () => void;
  onEnterArena: () => void;
}

const SHIPS: { id: string; src: string }[] = [
  { id: 'ship1', src: '/arena_ships/star_ship1.webp' },
  { id: 'ship2', src: '/arena_ships/star_ship2.webp' },
  { id: 'ship3', src: '/arena_ships/star_ship3.webp' },
];

const SELECTED_SHIP_KEY = 'nebulife_hangar_ship';

export const HangarPage: React.FC<HangarPageProps> = ({ playerLevel, arenaStats, onBack, onEnterArena }) => {
  const { t } = useT();

  const [selectedShip, setSelectedShip] = useState<string>(() => {
    return localStorage.getItem(SELECTED_SHIP_KEY) || SHIPS[0].id;
  });

  useEffect(() => {
    localStorage.setItem(SELECTED_SHIP_KEY, selectedShip);
  }, [selectedShip]);

  const activeShip = SHIPS.find(s => s.id === selectedShip) ?? SHIPS[0];

  return (
    <div style={styles.root}>
      {/* Starfield background (CSS-only) */}
      <div style={styles.starfield} />
      <div style={styles.vignette} />

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>{t('hangar.back')}</span>
        </button>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>{t('hangar.title')}</h1>
          <div style={styles.subtitle}>{t('hangar.subtitle')}</div>
        </div>
        <div style={styles.pilotBadge}>
          <div style={styles.pilotLabel}>{t('hangar.pilot')}</div>
          <div style={styles.pilotLevel}>{t('hangar.level')} {playerLevel}</div>
        </div>
      </div>

      <div style={styles.hint}>{t('hangar.hint')}</div>

      {/* Pilot stats strip — shown only after at least one arena session */}
      {arenaStats && arenaStats.sessions > 0 && (
        <div style={styles.statsStrip}>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>{t('hangar.stats.sessions')}</div>
            <div style={styles.statValue}>{arenaStats.sessions}</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>{t('hangar.stats.kills')}</div>
            <div style={styles.statValue}>{arenaStats.kills}</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>{t('hangar.stats.deaths')}</div>
            <div style={styles.statValue}>{arenaStats.deaths}</div>
          </div>
          <div style={styles.statCell}>
            <div style={styles.statLabel}>{t('hangar.stats.best_score')}</div>
            <div style={{ ...styles.statValue, color: '#44ff88' }}>{arenaStats.bestScore}</div>
          </div>
        </div>
      )}

      {/* Main layout: 3 columns (ship preview | upgrades | events) */}
      <div style={styles.layout}>
        {/* Column 1 — Ship */}
        <section style={styles.column}>
          <h2 style={styles.sectionTitle}>{t('hangar.section.ship')}</h2>
          <div style={styles.shipPreview}>
            <img src={activeShip.src} alt="ship" style={styles.shipImage} />
          </div>
          <div style={styles.shipGrid}>
            {SHIPS.map((ship) => {
              const isActive = ship.id === selectedShip;
              return (
                <button
                  key={ship.id}
                  style={{
                    ...styles.shipCard,
                    border: isActive ? '2px solid #7bb8ff' : '1px solid #334455',
                  }}
                  onClick={() => setSelectedShip(ship.id)}
                >
                  <img src={ship.src} alt={ship.id} style={styles.shipCardImage} />
                  <span style={{
                    ...styles.shipCardLabel,
                    color: isActive ? '#7bb8ff' : '#8899aa',
                  }}>
                    {isActive ? t('hangar.ship_selected') : t('hangar.ship_select')}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Column 2 — Upgrades placeholder */}
        <section style={styles.column}>
          <h2 style={styles.sectionTitle}>{t('hangar.section.upgrades')}</h2>
          <div style={styles.upgradesEmpty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#556677" strokeWidth="1" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <div style={styles.upgradesEmptyText}>{t('hangar.upgrades.empty')}</div>
          </div>
        </section>

        {/* Column 3 — Events */}
        <section style={styles.column}>
          <h2 style={styles.sectionTitle}>{t('hangar.section.events')}</h2>

          {/* Arena event (enabled) */}
          <div style={styles.eventCard}>
            <div style={styles.eventTitle}>{t('hangar.event.arena')}</div>
            <div style={styles.eventDesc}>{t('hangar.event.arena_desc')}</div>
            <button style={styles.eventEnterBtn} onClick={onEnterArena}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span>{t('hangar.event.arena_enter')}</span>
            </button>
          </div>

          {/* Tournament event (coming soon) */}
          <div style={{ ...styles.eventCard, opacity: 0.5 }}>
            <div style={{ ...styles.eventTitle, color: '#556677' }}>{t('hangar.event.tournament')}</div>
            <div style={styles.eventDesc}>{t('hangar.event.tournament_desc')}</div>
            <div style={styles.eventComingSoon}>{t('hangar.event.coming_soon')}</div>
          </div>
        </section>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    background: '#020510',
    zIndex: 9500,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
    color: '#aabbcc',
    overflow: 'hidden',
  },
  starfield: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8), transparent),
                      radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1px 1px at 45% 85%, rgba(255,255,255,0.7), transparent),
                      radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.5), transparent),
                      radial-gradient(1px 1px at 15% 70%, rgba(255,255,255,0.6), transparent),
                      radial-gradient(1.5px 1.5px at 55% 40%, rgba(170,200,255,0.7), transparent),
                      radial-gradient(1px 1px at 35% 25%, rgba(255,255,255,0.4), transparent)`,
    backgroundSize: '600px 600px',
    opacity: 0.8,
    pointerEvents: 'none',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 20%, rgba(2,5,16,0.7) 80%)',
    pointerEvents: 'none',
  },
  header: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: '1px solid #223344',
    zIndex: 2,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: 'rgba(10,15,25,0.8)',
    border: '1px solid #334455',
    borderRadius: 3,
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1,
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  titleBlock: {
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: 28,
    letterSpacing: 8,
    color: '#aabbcc',
    fontWeight: 'normal',
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#667788',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  pilotBadge: {
    padding: '8px 14px',
    background: 'rgba(10,15,25,0.8)',
    border: '1px solid #446688',
    borderRadius: 3,
    textAlign: 'right',
  },
  pilotLabel: {
    fontSize: 9,
    color: '#667788',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  pilotLevel: {
    fontSize: 13,
    color: '#7bb8ff',
    marginTop: 2,
  },
  hint: {
    position: 'relative',
    padding: '12px 32px',
    fontSize: 11,
    color: '#667788',
    borderBottom: '1px solid #1a2333',
    zIndex: 2,
  },
  layout: {
    position: 'relative',
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 24,
    padding: 32,
    zIndex: 2,
    overflow: 'auto',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 11,
    letterSpacing: 3,
    color: '#7bb8ff',
    textTransform: 'uppercase',
    borderBottom: '1px solid #334455',
    paddingBottom: 6,
    fontWeight: 'normal',
  },
  shipPreview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'rgba(10,15,25,0.5)',
    border: '1px solid #223344',
    borderRadius: 4,
    minHeight: 180,
  },
  shipImage: {
    width: 140,
    height: 140,
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 12px rgba(123,184,255,0.3))',
  },
  shipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  shipCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    background: 'rgba(10,15,25,0.6)',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'border-color 0.2s',
  },
  shipCardImage: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  shipCardLabel: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  upgradesEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
    background: 'rgba(10,15,25,0.4)',
    border: '1px dashed #334455',
    borderRadius: 4,
    minHeight: 200,
  },
  upgradesEmptyText: {
    fontSize: 10,
    color: '#556677',
    letterSpacing: 1,
    textAlign: 'center',
  },
  eventCard: {
    padding: 16,
    background: 'rgba(10,15,25,0.7)',
    border: '1px solid #334455',
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  eventTitle: {
    fontSize: 13,
    color: '#aabbcc',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  eventDesc: {
    fontSize: 10,
    color: '#667788',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  eventEnterBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'rgba(68, 136, 170, 0.15)',
    border: '1px solid #4488aa',
    borderRadius: 3,
    color: '#7bb8ff',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    cursor: 'pointer',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  eventComingSoon: {
    fontSize: 9,
    color: '#556677',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    padding: '6px 0',
    border: '1px dashed #334455',
    borderRadius: 3,
    marginTop: 4,
  },
  statsStrip: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    gap: 40,
    padding: '12px 32px',
    borderBottom: '1px solid #1a2333',
    zIndex: 2,
  },
  statCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    color: '#667788',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    color: '#aabbcc',
    letterSpacing: 1,
  },
};
