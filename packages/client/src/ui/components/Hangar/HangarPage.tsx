// ---------------------------------------------------------------------------
// HangarPage — Combat hangar: ship selection, pilot stats, arena entry
// Animated entrance, countUp numbers, 2 team ships + custom 3D ship order
// placeholder, 3 event modes: Training (free),
// Team Battle (1Q), Tournament (coming soon), controls reference panel.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
  onEnterTeamBattle?: () => void;
  onEnterRaid?: () => void;
}

const CARRIER_RAID_ENABLED = true;

// ── Ship slots ───────────────────────────────────────────────────────────────

interface ShipSlot {
  id: 'blue' | 'red';
  team: 'blue' | 'red';
  glbSrc: string;
  locked: boolean;
  /** i18n key for the slot label (resolved via t() at render time). */
  labelKey: string;
  descKey: string;
  accent: string;
  softAccent: string;
  /** i18n key for a hint shown under the locked preview (optional). */
  hintKey?: string;
  cost?: number;
  costLabel?: string;
}

// Real arena GLB ships. Selecting one also selects the player's team color.
const SHIP_SLOTS: ShipSlot[] = [
  {
    id: 'blue',
    team: 'blue',
    glbSrc: '/arena_ships/blue_ship.glb',
    locked: false,
    labelKey: 'hangar.ship.blue_3d',
    descKey: 'hangar.ship.blue_desc',
    accent: '#7bb8ff',
    softAccent: 'rgba(68,136,170,0.18)',
  },
  {
    id: 'red',
    team: 'red',
    glbSrc: '/arena_ships/red_ship.glb',
    locked: false,
    labelKey: 'hangar.ship.red_3d',
    descKey: 'hangar.ship.red_desc',
    accent: '#ff8844',
    softAccent: 'rgba(255,136,68,0.15)',
  },
];

const SELECTED_SHIP_KEY = 'nebulife_hangar_ship';
const SELECTED_TEAM_KEY = 'nebulife_arena_team';
const CUSTOM_SHIP_COST = 49;
const VALID_SHIP_IDS = new Set(SHIP_SLOTS.map(s => s.id));

function isShipSlotId(value: string | null): value is ShipSlot['id'] {
  return value === 'blue' || value === 'red';
}

// ── Controls reference data ──────────────────────────────────────────────────

interface ControlRow {
  keyLabel: string;
  actionKey: string;
}

const CONTROLS: ControlRow[] = [
  { keyLabel: 'WASD',          actionKey: 'hangar.controls.move' },
  { keyLabel: 'Mouse',          actionKey: 'hangar.controls.aim' },
  { keyLabel: 'LMB',            actionKey: 'hangar.controls.laser' },
  { keyLabel: 'RMB',            actionKey: 'hangar.controls.missile' },
  { keyLabel: 'Space',          actionKey: 'hangar.controls.warp' },
  { keyLabel: 'Tab',            actionKey: 'hangar.controls.roll' },
];

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
  onEnterTeamBattle,
  onEnterRaid,
}) => {
  const { t } = useT();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isMobile] = useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

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

  // Ship selection — migrate legacy ids (ship1/ship2/custom3d from older
  // rosters) to the blue GLB fighter.
  const [selectedShip, setSelectedShip] = useState<'blue' | 'red'>(() => {
    const saved = localStorage.getItem(SELECTED_SHIP_KEY);
    return isShipSlotId(saved) && VALID_SHIP_IDS.has(saved) ? saved : SHIP_SLOTS[0].id;
  });
  const activeSlot = SHIP_SLOTS.find(s => s.id === selectedShip) ?? SHIP_SLOTS[0];

  useEffect(() => {
    localStorage.setItem(SELECTED_SHIP_KEY, selectedShip);
    localStorage.setItem(SELECTED_TEAM_KEY, activeSlot.team);
  }, [activeSlot.team, selectedShip]);

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

  // Team battle level gate
  const teamBattleUnlocked = playerLevel >= 50;
  const raidAvailable = CARRIER_RAID_ENABLED && !isMobile && Boolean(onEnterRaid);

  // Training entry (free)
  const handleEnterTraining = useCallback(() => {
    playSfx('ui-click', 0.07);
    onEnterArena();
  }, [onEnterArena]);

  // Team Battle entry
  const handleEnterTeamBattle = useCallback(() => {
    playSfx('ui-click', 0.07);
    if (!teamBattleUnlocked) {
      setToast(t('hangar.team_battle_locked' as Parameters<typeof t>[0]));
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (onEnterTeamBattle) {
      onEnterTeamBattle();
    } else {
      setToast(t('hangar.event.coming_soon'));
      setTimeout(() => setToast(null), 2500);
    }
  }, [onEnterTeamBattle, t, teamBattleUnlocked]);

  const handleEnterRaid = useCallback(() => {
    playSfx('ui-click', 0.07);
    if (!raidAvailable) {
      setToast(t('hangar.event.raid_stub_toast' as Parameters<typeof t>[0]));
      setTimeout(() => setToast(null), 2500);
    } else if (onEnterRaid) {
      onEnterRaid();
    } else {
      setToast(t('hangar.event.coming_soon'));
      setTimeout(() => setToast(null), 2500);
    }
  }, [onEnterRaid, raidAvailable, t]);

  const handleToggleControls = useCallback(() => {
    playSfx('ui-click', 0.07);
    setControlsOpen(prev => !prev);
  }, []);

  const handleCustomShipOrder = useCallback(() => {
    playSfx('ui-click', 0.07);
    setToast(t('hangar.ship.custom_hint' as Parameters<typeof t>[0]));
    setTimeout(() => setToast(null), 3000);
  }, [t]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>
      <div style={S.starfield} />
      <div style={S.vignette} />
      <div style={S.hangarRibs} />

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

        {!isMobile ? (
          <div style={S.desktopDock}>
            <div style={{
              ...S.bayWrap,
              ...S.desktopBayWrap,
              borderColor: activeSlot.team === 'blue' ? '#446688' : '#664433',
              background: `radial-gradient(circle at 50% 35%, ${activeSlot.softAccent}, transparent 44%), linear-gradient(180deg, rgba(7,12,22,0.92), rgba(3,7,14,0.96))`,
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'scale(1)' : 'scale(0.94)',
              transition: 'opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s',
            }}>
              <div style={S.bayHeader}>
                <div>
                  <div style={S.bayKicker}>{t('hangar.bay_ready' as Parameters<typeof t>[0])}</div>
                  <div style={{ ...S.previewName, color: activeSlot.accent }}>{t(activeSlot.labelKey as Parameters<typeof t>[0])}</div>
                </div>
                <div style={{ ...S.teamChip, borderColor: activeSlot.accent, color: activeSlot.accent }}>
                  {t('hangar.team_color' as Parameters<typeof t>[0])}: {activeSlot.team.toUpperCase()}
                </div>
              </div>
              <ShipModelPreview modelUrl={activeSlot.glbSrc} accent={activeSlot.accent} height={360} />
              <div style={S.shipTelemetry}>
                <div style={S.shipTelemetryRow}>
                  <span>{t('hangar.chassis_status' as Parameters<typeof t>[0])}</span>
                  <strong style={{ color: activeSlot.accent }}>{t('hangar.ship_selected')}</strong>
                </div>
                <div style={S.shipDesc}>{t(activeSlot.descKey as Parameters<typeof t>[0])}</div>
              </div>
            </div>

            <div style={S.desktopOps}>
              <div style={{
                ...S.selectorScroll,
                ...S.desktopSelector,
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
                        ...S.desktopShipCard,
                        border: isActive ? `2px solid ${slot.accent}` : '1px solid #223344',
                        background: isActive
                          ? `linear-gradient(135deg, ${slot.softAccent}, rgba(10,15,25,0.92))`
                          : 'linear-gradient(135deg, rgba(10,15,25,0.8), rgba(20,30,50,0.6))',
                        boxShadow: isActive ? `0 0 16px ${slot.softAccent}, inset 0 0 20px ${slot.softAccent}` : 'none',
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                        transition: `opacity 0.4s ease ${0.7 + i * 0.08}s, transform 0.4s ease ${0.7 + i * 0.08}s, border-color 0.2s, box-shadow 0.2s`,
                      }}
                      onClick={() => handleShipClick(slot)}
                    >
                      <ShipGlyph color={slot.accent} />
                      <div style={{
                        ...S.cardLabel,
                        color: isActive ? slot.accent : '#8899aa',
                      }}>
                        {t(slot.labelKey as Parameters<typeof t>[0])}
                      </div>
                      <div style={{ ...S.cardTeam, color: slot.accent }}>{slot.team.toUpperCase()}</div>
                    </button>
                  );
                })}
              </div>

              <button
                style={{
                  ...S.customShipCta,
                  ...S.desktopFlushBlock,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(14px)',
                }}
                onClick={handleCustomShipOrder}
              >
                <span style={S.customShipCtaIcon}>
                  <span style={S.customShipCtaGlyph}><ShipGlyph color="#c6dbf2" /></span>
                  <span style={S.customPlus}>+</span>
                </span>
                <span style={S.customShipCtaText}>
                  <strong>{t('hangar.ship.custom_3d')}</strong>
                  <small>{t('hangar.ship.custom_hint' as Parameters<typeof t>[0])}</small>
                </span>
                <span style={S.customShipCtaCost}>
                  {CUSTOM_SHIP_COST}
                  <QuarkIcon />
                </span>
              </button>

              <div
                style={{
                  ...S.quickLaunchPanel,
                  ...S.desktopFlushBlock,
                  borderColor: `${activeSlot.accent}55`,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(14px)',
                }}
              >
                <div style={S.quickLaunchCopy}>
                  <span style={S.quickLaunchKicker}>{t('hangar.ship_selected')}</span>
                  <strong style={{ color: activeSlot.accent }}>
                    {t(activeSlot.labelKey as Parameters<typeof t>[0])}
                  </strong>
                  <small style={S.quickLaunchHint}>{t('hangar.event.training_desc')}</small>
                </div>
                <button
                  style={{
                    ...S.quickLaunchButton,
                    color: activeSlot.accent,
                    borderColor: `${activeSlot.accent}88`,
                    boxShadow: `0 0 18px ${activeSlot.softAccent}`,
                  }}
                  onClick={handleEnterTraining}
                >
                  {t('hangar.event.training_enter')}
                </button>
              </div>

              <div style={{
                ...S.entrySection,
                ...S.desktopFlushBlock,
                borderColor: raidAvailable ? '#445566' : '#223344',
                opacity: mounted ? 1 : 0,
                transition: 'opacity 0.5s ease 0.95s',
              }}>
                <div style={{ ...S.entryTitle, color: raidAvailable ? '#7bb8ff' : '#667788' }}>
                  {t('hangar.event.raid')}
                </div>
                <div style={S.entryDesc}>
                  {raidAvailable ? t('hangar.event.raid_desc') : t('hangar.event.raid_stub_desc' as Parameters<typeof t>[0])}
                </div>
                <div style={S.entryButtons}>
                  <button
                    style={{
                      ...S.entryRaid,
                      borderColor: raidAvailable ? '#7bb8ff' : '#334455',
                      color: raidAvailable ? '#7bb8ff' : '#667788',
                      cursor: 'pointer',
                    }}
                    onClick={handleEnterRaid}
                  >
                    {raidAvailable ? t('hangar.event.raid_enter') : t('hangar.event.raid_stub_btn' as Parameters<typeof t>[0])}
                  </button>
                </div>
              </div>

              <div style={{
                ...S.controlsSection,
                ...S.desktopFlushBlock,
                opacity: mounted ? 1 : 0,
                transition: 'opacity 0.5s ease 0.75s',
              }}>
                <button style={S.controlsHeader} onClick={handleToggleControls}>
                  <span style={S.controlsTitle}>{t('hangar.controls.title')}</span>
                  <span style={{ ...S.controlsChevron, transform: controlsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
                {controlsOpen && (
                  <div style={S.controlsGrid}>
                    {CONTROLS.map(row => (
                      <React.Fragment key={row.keyLabel}>
                        <div style={S.controlKey}>{row.keyLabel}</div>
                        <div style={S.controlAction}>{t(row.actionKey as Parameters<typeof t>[0])}</div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                ...S.entrySection,
                ...S.desktopFlushBlock,
                borderColor: teamBattleUnlocked && onEnterTeamBattle ? '#446644' : '#223344',
                opacity: mounted ? (teamBattleUnlocked ? 1 : 0.5) : 0,
                transition: 'opacity 0.5s ease 1.0s',
              }}>
                <div style={{ ...S.entryTitle, color: teamBattleUnlocked && onEnterTeamBattle ? '#88dd88' : '#667788' }}>
                  {t('hangar.event.team_battle')}{!teamBattleUnlocked ? ' (L50)' : ''}
                </div>
                <div style={S.entryDesc}>{t('hangar.event.team_battle_desc')}</div>
                {teamBattleUnlocked && onEnterTeamBattle ? (
                  <div style={S.entryButtons}>
                    <button style={S.entryQuark} onClick={handleEnterTeamBattle}>
                      1{' '}
                      <QuarkIcon />
                    </button>
                  </div>
                ) : !teamBattleUnlocked ? (
                  <div style={S.entryButtons}>
                    <button
                      style={{ ...S.entryQuark, opacity: 0.4, cursor: 'not-allowed', animation: 'none' }}
                      onClick={handleEnterTeamBattle}
                    >
                      <LockIcon />
                      <span style={{ marginLeft: 4 }}>L50</span>
                    </button>
                  </div>
                ) : (
                  <div style={S.comingSoon}>{t('hangar.event.coming_soon')}</div>
                )}
              </div>

              <div style={{
                ...S.tournamentCard,
                ...S.desktopFlushBlock,
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
          </div>
        ) : (
          <>
        {/* ── Ship preview ──────────────────────────────────────────── */}
        <div style={{
          ...S.bayWrap,
          borderColor: activeSlot.team === 'blue' ? '#446688' : '#664433',
          background: `radial-gradient(circle at 50% 35%, ${activeSlot.softAccent}, transparent 44%), linear-gradient(180deg, rgba(7,12,22,0.92), rgba(3,7,14,0.96))`,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.94)',
          transition: 'opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s',
        }}>
          <div style={S.bayHeader}>
            <div>
              <div style={S.bayKicker}>{t('hangar.bay_ready' as Parameters<typeof t>[0])}</div>
              <div style={{ ...S.previewName, color: activeSlot.accent }}>{t(activeSlot.labelKey as Parameters<typeof t>[0])}</div>
            </div>
            <div style={{ ...S.teamChip, borderColor: activeSlot.accent, color: activeSlot.accent }}>
              {t('hangar.team_color' as Parameters<typeof t>[0])}: {activeSlot.team.toUpperCase()}
            </div>
          </div>
          <ShipModelPreview modelUrl={activeSlot.glbSrc} accent={activeSlot.accent} height={250} />
          <div style={S.shipTelemetry}>
            <div style={S.shipTelemetryRow}>
              <span>{t('hangar.chassis_status' as Parameters<typeof t>[0])}</span>
              <strong style={{ color: activeSlot.accent }}>{t('hangar.ship_selected')}</strong>
            </div>
            <div style={S.shipDesc}>{t(activeSlot.descKey as Parameters<typeof t>[0])}</div>
          </div>
        </div>

        <div
          style={{
            ...S.quickLaunchPanel,
            gridTemplateColumns: '1fr',
            borderColor: `${activeSlot.accent}55`,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(14px)',
          }}
        >
          <div style={S.quickLaunchCopy}>
            <span style={S.quickLaunchKicker}>{t('hangar.ship_selected')}</span>
            <strong style={{ color: activeSlot.accent }}>
              {t(activeSlot.labelKey as Parameters<typeof t>[0])}
            </strong>
            <small style={S.quickLaunchHint}>{t('hangar.event.training_desc')}</small>
          </div>
          <button
            style={{
              ...S.quickLaunchButton,
              width: '100%',
              color: activeSlot.accent,
              borderColor: `${activeSlot.accent}88`,
              boxShadow: `0 0 18px ${activeSlot.softAccent}`,
            }}
            onClick={handleEnterTraining}
          >
            {t('hangar.event.training_enter')}
          </button>
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
                  border: isActive ? `2px solid ${slot.accent}` : '1px solid #223344',
                  background: isActive
                    ? `linear-gradient(135deg, ${slot.softAccent}, rgba(10,15,25,0.92))`
                    : 'linear-gradient(135deg, rgba(10,15,25,0.8), rgba(20,30,50,0.6))',
                  boxShadow: isActive ? `0 0 16px ${slot.softAccent}, inset 0 0 20px ${slot.softAccent}` : 'none',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.4s ease ${0.7 + i * 0.08}s, transform 0.4s ease ${0.7 + i * 0.08}s, border-color 0.2s, box-shadow 0.2s`,
                }}
                onClick={() => handleShipClick(slot)}
              >
                <ShipGlyph color={slot.accent} />
                <div style={{
                  ...S.cardLabel,
                  color: isActive ? slot.accent : '#8899aa',
                }}>
                  {t(slot.labelKey as Parameters<typeof t>[0])}
                </div>
                <div style={{ ...S.cardTeam, color: slot.accent }}>{slot.team.toUpperCase()}</div>
              </button>
            );
          })}
        </div>

        <button
          style={{
            ...S.customShipCta,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(14px)',
          }}
          onClick={handleCustomShipOrder}
        >
          <span style={S.customShipCtaIcon}>
            <span style={S.customShipCtaGlyph}><ShipGlyph color="#c6dbf2" /></span>
            <span style={S.customPlus}>+</span>
          </span>
          <span style={S.customShipCtaText}>
            <strong>{t('hangar.ship.custom_3d')}</strong>
            <small>{t('hangar.ship.custom_hint' as Parameters<typeof t>[0])}</small>
          </span>
          <span style={S.customShipCtaCost}>
            {CUSTOM_SHIP_COST}
            <QuarkIcon />
          </span>
        </button>

        {/* ── Controls panel (desktop only) ─────────────────────── */}
        {!isMobile && (
          <div style={{
            ...S.controlsSection,
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.5s ease 0.75s',
          }}>
            <button style={S.controlsHeader} onClick={handleToggleControls}>
              <span style={S.controlsTitle}>{t('hangar.controls.title')}</span>
              <span style={{ ...S.controlsChevron, transform: controlsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {controlsOpen && (
              <div style={S.controlsGrid}>
                {CONTROLS.map(row => (
                  <React.Fragment key={row.keyLabel}>
                    <div style={S.controlKey}>{row.keyLabel}</div>
                    <div style={S.controlAction}>{t(row.actionKey as Parameters<typeof t>[0])}</div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TEAM BATTLE event card ────────────────────────────────── */}
        <div style={{
          ...S.entrySection,
          borderColor: teamBattleUnlocked && onEnterTeamBattle ? '#446644' : '#223344',
          opacity: mounted ? (teamBattleUnlocked ? 1 : 0.5) : 0,
          transition: 'opacity 0.5s ease 1.0s',
        }}>
          <div style={{ ...S.entryTitle, color: teamBattleUnlocked && onEnterTeamBattle ? '#88dd88' : '#667788' }}>
            {t('hangar.event.team_battle')}{!teamBattleUnlocked ? ' (L50)' : ''}
          </div>
          <div style={S.entryDesc}>{t('hangar.event.team_battle_desc')}</div>
          {teamBattleUnlocked && onEnterTeamBattle ? (
            <div style={S.entryButtons}>
              <button style={S.entryQuark} onClick={handleEnterTeamBattle}>
                1{' '}
                <QuarkIcon />
              </button>
            </div>
          ) : !teamBattleUnlocked ? (
            <div style={S.entryButtons}>
              <button
                style={{ ...S.entryQuark, opacity: 0.4, cursor: 'not-allowed', animation: 'none' }}
                onClick={handleEnterTeamBattle}
              >
                <LockIcon />
                <span style={{ marginLeft: 4 }}>L50</span>
              </button>
            </div>
          ) : (
            <div style={S.comingSoon}>{t('hangar.event.coming_soon')}</div>
          )}
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
          </>
        )}
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
        @keyframes hangarPulseGreen {
          0%, 100% { box-shadow: 0 0 8px rgba(68,255,136,0.15); }
          50% { box-shadow: 0 0 18px rgba(68,255,136,0.3); }
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

function ShipModelPreview({ modelUrl, accent, height = 268 }: { modelUrl: string; accent: string; height?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    camera.position.set(0, 38, 138);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(host.clientWidth || 280, host.clientHeight || 220);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(80, 110, 90);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aadd, 1.35);
    fill.position.set(-100, 60, -80);
    scene.add(fill);
    const rim = new THREE.PointLight(new THREE.Color(accent), 2.8, 240);
    rim.position.set(-55, 24, 52);
    scene.add(rim);

    const ringGeo = new THREE.RingGeometry(42, 44, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -24;
    scene.add(ring);

    let model: THREE.Group | null = null;
    let raf = 0;
    let disposed = false;

    const resize = () => {
      const width = host.clientWidth || 280;
      const height = host.clientHeight || 220;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    new GLTFLoader().load(modelUrl, (gltf) => {
      if (disposed) return;
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const longest = Math.max(size.x, size.y, size.z);
      const scale = longest > 0.0001 ? 70 / longest : 1;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      model.rotation.y = Math.PI / 2;
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.frustumCulled = false;
        }
      });
      scene.add(model);
    });

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const time = performance.now() * 0.00035;
      if (model) {
        model.rotation.y = Math.PI / 2 + Math.sin(time) * 0.12 + time * 0.45;
        model.rotation.x = Math.sin(time * 1.4) * 0.035;
      }
      ring.rotation.z += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat?.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [accent, modelUrl]);

  return <div ref={mountRef} style={{ ...S.modelPreview, height }} />;
}

function ShipGlyph({ color }: { color: string }) {
  return (
    <svg width="58" height="58" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M32 7l9 24 13 9-14 4-8 13-8-13-14-4 13-9 9-24z" fill={color} fillOpacity="0.14" stroke={color} strokeWidth="1.4" />
      <path d="M25 39l-9 11 12-4M39 39l9 11-12-4M29 27h6M27 33h10" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M32 46v9" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
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

function QuarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(circle at 50% 18%, rgba(68,136,170,0.16), transparent 34%), linear-gradient(180deg, #020510 0%, #050a14 58%, #020510 100%)',
    zIndex: 9500, fontFamily: 'monospace', color: '#aabbcc', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
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
    background: 'radial-gradient(ellipse at center, transparent 18%, rgba(2,5,16,0.72) 82%)',
  },
  hangarRibs: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.34,
    backgroundImage: `
      linear-gradient(90deg, transparent 0 10%, rgba(68,136,170,0.20) 10% 10.4%, transparent 10.4% 89.6%, rgba(68,136,170,0.20) 89.6% 90%, transparent 90%),
      repeating-linear-gradient(180deg, transparent 0 78px, rgba(51,68,85,0.22) 79px, transparent 80px),
      radial-gradient(ellipse at 50% 42%, transparent 0 28%, rgba(123,184,255,0.10) 29%, transparent 30%)`,
  },
  scroll: {
    position: 'relative', zIndex: 2, flex: 1, minHeight: 0,
    overflowX: 'hidden', overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    display: 'flex', flexDirection: 'column',
    padding: '0 0 calc(72px + env(safe-area-inset-bottom, 0px))',
  },
  desktopDock: {
    width: 'min(1360px, calc(100vw - 48px))',
    margin: '14px auto 0',
    display: 'grid',
    gridTemplateColumns: 'minmax(700px, 1fr) minmax(360px, 420px)',
    gap: 18,
    alignItems: 'start',
  },
  desktopBayWrap: {
    margin: 0,
    minHeight: 'calc(100vh - 184px)',
  },
  desktopOps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  desktopSelector: {
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    overflow: 'visible',
    scrollSnapType: 'none',
  },
  desktopShipCard: {
    width: 'auto',
    minHeight: 112,
  },
  desktopFlushBlock: {
    margin: 0,
  },

  // Header
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px',
    paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
    borderBottom: '1px solid #1a2a3a', gap: 10, flexShrink: 0,
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', background: 'rgba(10,15,25,0.8)',
    border: '1px solid #334455', borderRadius: 3,
    color: '#8899aa', fontFamily: 'monospace', fontSize: 9,
    letterSpacing: 1, cursor: 'pointer', textTransform: 'uppercase', flexShrink: 0,
  },
  titleBlock: { textAlign: 'center', flex: 1, minWidth: 0 },
  title: { margin: 0, fontSize: 20, letterSpacing: 5, color: '#aabbcc', fontWeight: 'normal' },
  subtitle: { fontSize: 9, letterSpacing: 2, color: '#556677', marginTop: 2, textTransform: 'uppercase' },
  badge: {
    padding: '4px 8px', background: 'rgba(10,15,25,0.8)',
    border: '1px solid #446688', borderRadius: 3, textAlign: 'center', flexShrink: 0,
  },
  badgeLabel: { fontSize: 8, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase' },
  badgeLevel: { fontSize: 15, color: '#7bb8ff', fontWeight: 'bold' },

  // Stats
  statsStrip: {
    display: 'flex', justifyContent: 'center', gap: 30,
    padding: '10px 16px', borderBottom: '1px solid #1a2333', flexShrink: 0,
  },
  statCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  statValue: { fontSize: 18, letterSpacing: 1, fontWeight: 'bold' },
  statLabel: { fontSize: 8, color: '#556677', letterSpacing: 1.5, textTransform: 'uppercase' },

  // Ship preview
  bayWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'stretch',
    margin: '12px 16px 0', padding: '12px', gap: 10,
    border: '1px solid #334455', borderRadius: 8, overflow: 'visible',
    boxShadow: 'inset 0 0 40px rgba(68,136,170,0.06), 0 12px 30px rgba(0,0,0,0.25)',
  },
  bayHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, borderBottom: '1px solid rgba(51,68,85,0.65)', paddingBottom: 9,
  },
  bayKicker: {
    fontSize: 10, color: '#667788', letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 3,
  },
  teamChip: {
    border: '1px solid #446688', borderRadius: 999, padding: '5px 8px',
    fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
    background: 'rgba(5,10,20,0.72)', whiteSpace: 'nowrap',
  },
  modelPreview: {
    width: '100%', height: 268, position: 'relative',
    borderRadius: 6, overflow: 'visible',
    background: 'radial-gradient(circle at 50% 52%, rgba(123,184,255,0.10), transparent 42%), linear-gradient(180deg, rgba(2,5,16,0.25), rgba(2,5,16,0.76))',
  },
  previewName: {
    fontSize: 18, color: '#667788', letterSpacing: 3, textTransform: 'uppercase',
  },
  shipTelemetry: {
    borderTop: '1px solid rgba(51,68,85,0.55)', paddingTop: 8,
  },
  shipTelemetryRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, fontSize: 10, color: '#667788', letterSpacing: 1.4, textTransform: 'uppercase',
    marginBottom: 6,
  },
  shipDesc: {
    fontSize: 11, color: '#8899aa', lineHeight: 1.35, letterSpacing: 0.4,
  },

  // Ship selector (horizontal)
  selectorScroll: {
    display: 'flex', gap: 10, padding: '10px 16px 8px',
    overflowX: 'auto', scrollSnapType: 'x mandatory',
    flexShrink: 0,
  },
  shipCard: {
    flex: '0 0 auto', width: 132, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 6, padding: '10px 6px 8px',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace',
    scrollSnapAlign: 'center',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  cardTeam: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  lockedSlot: {
    position: 'relative',
    width: 52, height: 52, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  lockedCost: { fontSize: 8, color: '#4488aa', marginTop: 4, letterSpacing: 1 },
  customShipCard: {
    border: '1px dashed rgba(198,219,242,0.42)',
    background: 'linear-gradient(135deg, rgba(198,219,242,0.10), rgba(10,15,25,0.78))',
    boxShadow: 'inset 0 0 22px rgba(123,184,255,0.06)',
  },
  customPlus: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 18,
    height: 18,
    border: '1px solid rgba(123,184,255,0.58)',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(5,10,20,0.92)',
    color: '#7bb8ff',
    fontSize: 13,
    lineHeight: 1,
  },
  customShipCta: {
    margin: '8px 16px 2px',
    padding: '9px 10px',
    display: 'grid',
    gridTemplateColumns: '38px 1fr auto',
    alignItems: 'center',
    gap: 10,
    border: '1px solid rgba(123,184,255,0.30)',
    borderRadius: 6,
    background: 'linear-gradient(135deg, rgba(10,18,30,0.88), rgba(20,32,48,0.70))',
    boxShadow: 'inset 0 0 18px rgba(123,184,255,0.055)',
    color: '#c6dbf2',
    cursor: 'pointer',
    fontFamily: 'monospace',
    textAlign: 'left',
    transition: 'opacity 0.4s ease 0.92s, transform 0.4s ease 0.92s, border-color 0.2s, box-shadow 0.2s',
  },
  customShipCtaIcon: {
    position: 'relative',
    width: 40,
    height: 40,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 4,
    background: 'rgba(198,219,242,0.055)',
    border: '1px solid rgba(198,219,242,0.28)',
    overflow: 'hidden',
  },
  customShipCtaGlyph: {
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    transform: 'scale(0.7)',
  },
  customShipCtaText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  customShipCtaCost: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#7bb8ff',
    fontSize: 12,
    letterSpacing: 1,
  },
  quickLaunchPanel: {
    margin: '10px 16px 2px',
    padding: '11px 12px',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    gap: 12,
    border: '1px solid rgba(123,184,255,0.34)',
    borderRadius: 7,
    background: 'linear-gradient(135deg, rgba(5,10,20,0.92), rgba(16,26,42,0.82))',
    boxShadow: 'inset 0 0 22px rgba(123,184,255,0.05)',
    fontFamily: 'monospace',
    transition: 'opacity 0.4s ease 1s, transform 0.4s ease 1s, border-color 0.2s',
  },
  quickLaunchCopy: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: 3,
  },
  quickLaunchKicker: {
    color: '#667788',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  quickLaunchHint: {
    color: '#8899aa',
    fontSize: 11,
    lineHeight: 1.35,
  },
  quickLaunchButton: {
    minHeight: 42,
    padding: '0 16px',
    border: '1px solid rgba(123,184,255,0.55)',
    borderRadius: 5,
    background: 'linear-gradient(135deg, rgba(20,34,52,0.88), rgba(8,14,24,0.96))',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },

  // Controls panel
  controlsSection: {
    margin: '10px 16px 0',
    background: 'rgba(5,10,20,0.7)', border: '1px solid #1e2e3e', borderRadius: 4,
    overflow: 'hidden',
  },
  controlsHeader: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: 'transparent', border: 'none',
    cursor: 'pointer', fontFamily: 'monospace',
  },
  controlsTitle: {
    fontSize: 10, color: '#556677', letterSpacing: 2, textTransform: 'uppercase',
  },
  controlsChevron: {
    color: '#445566', transition: 'transform 0.2s ease',
    display: 'inline-flex', alignItems: 'center',
  },
  controlsGrid: {
    display: 'grid', gridTemplateColumns: 'auto 1fr',
    gap: '5px 14px', padding: '4px 12px 10px',
  },
  controlKey: {
    fontSize: 10, color: '#7bb8ff', letterSpacing: 1,
    padding: '2px 5px', background: 'rgba(68,136,170,0.12)',
    border: '1px solid #2a3e55', borderRadius: 3,
    whiteSpace: 'nowrap', alignSelf: 'center',
  },
  controlAction: {
    fontSize: 10, color: '#8899aa', letterSpacing: 0.5,
    alignSelf: 'center',
  },

  // Event cards (shared)
  entrySection: {
    margin: '10px 16px 0', padding: 16,
    background: 'rgba(10,15,25,0.7)', border: '1px solid #334455', borderRadius: 6,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  entryTitle: { fontSize: 14, color: '#aabbcc', letterSpacing: 2, textTransform: 'uppercase' },
  entryDesc: { fontSize: 11, color: '#667788', lineHeight: 1.4 },
  entryButtons: {
    display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 4,
  },
  // Free entry button (green tint)
  entryFree: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 28px',
    background: 'linear-gradient(135deg, rgba(44,136,80,0.2), rgba(20,60,40,0.3))',
    border: '1px solid #336644', borderRadius: 4,
    color: '#44ff88', fontFamily: 'monospace', fontSize: 11,
    letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase',
    animation: 'hangarPulseGreen 2.5s ease-in-out infinite',
  },
  // 1 quark entry button (blue tint)
  entryQuark: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 20px',
    background: 'linear-gradient(135deg, rgba(68,136,170,0.2), rgba(40,60,100,0.3))',
    border: '1px solid #4488aa', borderRadius: 4,
    color: '#7bb8ff', fontFamily: 'monospace', fontSize: 11,
    letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase',
    animation: 'hangarPulse 2s ease-in-out infinite',
  },
  entryRaid: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 28px',
    background: 'linear-gradient(135deg, rgba(68,136,170,0.18), rgba(12,22,36,0.86))',
    border: '1px solid #446688', borderRadius: 4,
    color: '#7bb8ff', fontFamily: 'monospace', fontSize: 11,
    letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase',
    animation: 'hangarPulse 2.4s ease-in-out infinite',
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
    position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
    padding: '8px 20px', background: 'rgba(10,15,25,0.95)',
    border: '1px solid #4488aa', borderRadius: 4,
    color: '#7bb8ff', fontFamily: 'monospace', fontSize: 10,
    letterSpacing: 1, zIndex: 9999, pointerEvents: 'none',
  },
};
