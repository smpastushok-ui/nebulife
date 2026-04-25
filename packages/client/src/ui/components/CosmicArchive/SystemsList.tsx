import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem } from '@nebulife/core';
import { getDeviceTier } from '../../../utils/device-tier.js';

// Tiny stable string→number hash for seeding per-row animation delays so
// every researching row has its own orbit phase but stays deterministic
// across re-renders.
function hashSystemId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Tooltip that appears BELOW the icon (so it's not clipped by top menu)
function HeaderIcon({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: 6, padding: '6px 10px',
          background: 'rgba(10, 15, 25, 0.96)', border: '1px solid #446688', borderRadius: 4,
          fontSize: 10, color: '#aabbcc', fontFamily: 'monospace', whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemsList — List of all discovered/available star systems
// ---------------------------------------------------------------------------

const STYLE_ID = 'nebulife-systems-list-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes sys-row-research-pulse {
      0%, 100% { background: rgba(25,35,55,0.5); }
      50% { background: rgba(15,25,40,0.3); }
    }
    @keyframes sys-btn-sweep {
      from { background-position: -200% 0; }
      to { background-position: 200% 0; }
    }
    @keyframes sys-btn-border-march {
      to { stroke-dashoffset: -12; }
    }
    /* Researching orbit — magnifier travels around the center while the
       progress arc itself stays static. Each row gets its own animation-delay
       seeded from the systemId so neighbouring icons don't tick in sync. */
    @keyframes sys-research-orbit {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    /* Researching pulse — soft scale + glow on the orbiting magnifier so the
       row visually breathes while research is in progress. */
    @keyframes sys-research-pulse {
      0%, 100% { opacity: 0.85; }
      50%      { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabbff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4e8',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

interface SystemsListProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onNavigate: (system: StarSystem) => void;
  onStartResearch?: (systemId: string) => void;
  canStartResearch?: (systemId: string) => boolean;
  /** Whether a system is currently being researched */
  isResearching?: (systemId: string) => boolean;
  /** Whether a system is fully researched (100%) */
  isFullyResearched?: (systemId: string) => boolean;
  /** Current research progress 0-100 (drives the progress arc on the
   *  research icon). Optional — without it the arc falls back to 0. */
  getResearchProgress?: (systemId: string) => number;
  /** Whether a ring is locked (previous ring not fully researched) */
  isRingLocked?: (ringIndex: number) => boolean;
  /** Current research data balance */
  researchData?: number;
  /** Cost to start research */
  researchDataCost?: number;
  /** Unlock a ring-locked system by paying quarks — premium shortcut. */
  onUnlockViaQuarks?: (systemId: string) => void;
  /** Quarks cost for the per-system unlock (default 30). */
  quarkUnlockCost?: number;
  /** Player's current quarks balance — for affordability checks. */
  quarksBalance?: number;
  /** True if the given system has already been unlocked via quarks. */
  isQuarkUnlocked?: (systemId: string) => boolean;
  /** Instant-research a not-yet-researched system in exchange for quarks.
   *  Wires the ⚛ shortcut button next to the magnifier in each row. */
  onInstantResearch?: (systemId: string) => void;
  /** Quarks cost for an instant research (default 30). */
  instantResearchCost?: number;
  /** Open the global TopUp/buy-quarks modal — used by the instant-research
   *  popup when the player can't afford the shortcut. */
  onOpenTopUp?: () => void;
}

export function SystemsList({
  allSystems,
  aliases,
  onNavigate,
  onStartResearch,
  canStartResearch,
  isResearching,
  isFullyResearched,
  getResearchProgress,
  isRingLocked,
  researchData = 0,
  researchDataCost = 1,
  onUnlockViaQuarks,
  quarkUnlockCost = 30,
  quarksBalance = 0,
  isQuarkUnlocked,
  onInstantResearch,
  instantResearchCost = 30,
  onOpenTopUp,
}: SystemsListProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [insufficientDataId, setInsufficientDataId] = useState<string | null>(null);
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  // System currently shown in the "instant research with quarks" confirmation
  // popup. null when popup is closed.
  const [instantTargetId, setInstantTargetId] = useState<string | null>(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Clear tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (insufficientTimerRef.current) clearTimeout(insufficientTimerRef.current);
    };
  }, []);

  // Collapsed rings — by default, rings with index >= 2 start collapsed so
  // players aren't overwhelmed by ~1,400 far-away systems. Home (ring 0) and
  // first ring (ring 1) stay expanded. Player can toggle by tapping the
  // ring header; choice persists for the session via this local state.
  const [collapsedRings, setCollapsedRings] = useState<Set<number>>(() => {
    // Start with "everything from ring 2 up" collapsed. We don't know the
    // full ring set here yet, so we populate lazily on first render below.
    return new Set();
  });
  // First-mount: mark all ring>=2 as collapsed once we know which rings exist.
  const collapsedSeededRef = useRef(false);

  const sorted = useMemo(() => {
    return [...allSystems].sort((a, b) => {
      // Home system first (ring 0)
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;
      // Then by ring index
      const ringDiff = (a.ringIndex ?? 99) - (b.ringIndex ?? 99);
      if (ringDiff !== 0) return ringDiff;
      // Then by name within same ring
      const aName = aliases[a.id] || a.name;
      const bName = aliases[b.id] || b.name;
      return aName.localeCompare(bName);
    });
  }, [allSystems, aliases]);

  // Group by ring for section headers
  const ringGroups = useMemo(() => {
    const groups: { ringIndex: number; systems: StarSystem[] }[] = [];
    let current: (typeof groups)[0] | null = null;
    for (const sys of sorted) {
      const ri = sys.ringIndex ?? 0;
      if (!current || current.ringIndex !== ri) {
        current = { ringIndex: ri, systems: [] };
        groups.push(current);
      }
      current.systems.push(sys);
    }
    return groups;
  }, [sorted]);

  // Seed the collapsed set once we know which rings exist — rings 2+ default
  // to collapsed so the terminal isn't a 1400-row wall on first open.
  useEffect(() => {
    if (collapsedSeededRef.current) return;
    if (ringGroups.length === 0) return;
    collapsedSeededRef.current = true;
    const initial = new Set<number>();
    for (const g of ringGroups) {
      if (g.ringIndex >= 2) initial.add(g.ringIndex);
    }
    setCollapsedRings(initial);
  }, [ringGroups]);

  const toggleRingCollapse = useCallback((ringIndex: number) => {
    setCollapsedRings((prev) => {
      const next = new Set(prev);
      if (next.has(ringIndex)) next.delete(ringIndex); else next.add(ringIndex);
      return next;
    });
  }, []);

  // Track first non-home system for tutorial target
  const firstNonHomeId = useMemo(() => {
    const sys = sorted.find((s) => !s.planets.some((p) => p.isHomePlanet));
    return sys?.id ?? null;
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        {t('archive.no_systems')}
      </div>
    );
  }

  const hasResearchCol = !!onStartResearch;

  const handleResearchClick = (systemId: string) => {
    // Check if we have enough data
    if (researchData < researchDataCost) {
      // Show "insufficient data" tooltip
      setInsufficientDataId(systemId);
      if (insufficientTimerRef.current) clearTimeout(insufficientTimerRef.current);
      insufficientTimerRef.current = setTimeout(() => {
        setInsufficientDataId(null);
      }, 2000);
      return;
    }
    onStartResearch?.(systemId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header row — SVG icons with tooltips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? (hasResearchCol ? '1fr 34px 32px 32px 68px' : '1fr 34px 32px 32px')
            : (hasResearchCol ? '1fr 36px 56px 36px 36px 72px' : '1fr 36px 56px 36px 36px'),
          gap: isMobile ? 4 : 4,
          padding: isMobile ? '4px 6px' : '6px 8px',
          alignItems: 'center',
          borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 9, color: '#445566', textTransform: 'uppercase', letterSpacing: 1 }}>{t('archive.col_name')}</span>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_spectral_class')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="4" />
              <line x1="8" y1="0.5" x2="8" y2="3" />
              <line x1="8" y1="13" x2="8" y2="15.5" />
              <line x1="0.5" y1="8" x2="3" y2="8" />
              <line x1="13" y1="8" x2="15.5" y2="8" />
            </svg>
          </HeaderIcon>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeaderIcon tooltip={t('archive.tooltip_coordinates')}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2" strokeLinecap="round">
                <circle cx="8" cy="8" r="1.5" />
                <line x1="8" y1="1" x2="8" y2="15" />
                <line x1="1" y1="8" x2="15" y2="8" />
              </svg>
            </HeaderIcon>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_planet_count')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="5" />
              <ellipse cx="8" cy="8" rx="7.5" ry="2.5" transform="rotate(-30 8 8)" />
            </svg>
          </HeaderIcon>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_ring')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="3" />
              <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
            </svg>
          </HeaderIcon>
        </div>
        {hasResearchCol && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeaderIcon tooltip={t('archive.tooltip_research_actions')}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2" strokeLinecap="round">
                <circle cx="6.5" cy="6.5" r="4.5" />
                <line x1="10" y1="10" x2="14" y2="14" />
              </svg>
            </HeaderIcon>
          </div>
        )}
      </div>

      {/* System rows grouped by ring */}
      {ringGroups.map((group) => {
        const locked = isRingLocked?.(group.ringIndex) ?? false;
        const ringLabel = group.ringIndex === 0
          ? t('archive.home_system')
          : t('archive.ring_label', { ring: group.ringIndex });
        // Rings 2+ are auto-collapsed AND user-toggleable only after the
        // previous ring is fully researched. While locked the header is
        // non-clickable and content stays hidden — prevents tester
        // confusion about deep-core systems before personal exploration.
        const forceCollapsed = group.ringIndex >= 2 && locked;
        const isCollapsed = forceCollapsed || collapsedRings.has(group.ringIndex);
        const canCollapse = group.ringIndex >= 2 && !locked;

        return (
          <React.Fragment key={`ring-${group.ringIndex}`}>
            {/* Ring group header — rings 2+ are clickable chevrons */}
            {group.ringIndex > 0 && (
              <button
                onClick={() => { if (canCollapse) toggleRingCollapse(group.ringIndex); }}
                style={{
                  fontSize: 10,
                  color: locked ? '#445566' : '#667788',
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  padding: isMobile ? '10px 6px 4px' : '12px 8px 4px',
                  borderBottom: '1px solid rgba(51, 68, 85, 0.15)',
                  marginBottom: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  width: '100%',
                  textAlign: 'left',
                  cursor: canCollapse ? 'pointer' : 'default',
                  fontFamily: 'monospace',
                }}
              >
                {canCollapse && (
                  <span style={{
                    display: 'inline-block',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                    color: '#556677',
                    fontSize: 10,
                  }}>▾</span>
                )}
                <span>{ringLabel}</span>
                <span style={{ fontSize: 9, color: '#556677', textTransform: 'none', letterSpacing: 0 }}>
                  ({group.systems.length})
                </span>
                {locked && (
                  <span style={{ fontSize: 9, color: '#556677', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
                    — {t('archive.ring_locked_hint')}
                  </span>
                )}
              </button>
            )}
            {!isCollapsed && group.systems.map((system) => {
              const isHome = system.planets.some((p) => p.isHomePlanet);
              const isHovered = hoveredId === system.id;
              const name = aliases[system.id] || system.name;
              const starColor =
                SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';
              const canResearch = locked ? false : (canStartResearch?.(system.id) ?? false);
              const isFirstNonHome = system.id === firstNonHomeId;
              const researching = isResearching?.(system.id) ?? false;
              const fullyResearched = isFullyResearched?.(system.id) ?? false;
              const progressPct = Math.max(
                0,
                Math.min(100, getResearchProgress?.(system.id) ?? (fullyResearched ? 100 : 0)),
              );
              const showInsufficientData = insufficientDataId === system.id;

              return (
                <div
                  key={system.id}
                  onMouseEnter={() => setHoveredId(system.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? (hasResearchCol ? '1fr 34px 32px 32px 68px' : '1fr 34px 32px 32px')
                      : (hasResearchCol ? '1fr 60px 80px 60px 50px 100px' : '1fr 60px 80px 60px 50px'),
                    gap: isMobile ? 4 : 8,
                    padding: isMobile ? '6px 6px' : '8px 12px',
                    background: researching
                      ? undefined
                      : isHovered
                        ? 'rgba(25, 35, 50, 0.5)'
                        : 'rgba(10, 15, 25, 0.3)',
                    border: isMobile
                      ? 'none'
                      : researching
                        ? '1px solid rgba(68, 136, 170, 0.25)'
                        : '1px solid rgba(51, 68, 85, 0.15)',
                    borderBottom: isMobile ? '1px solid rgba(51, 68, 85, 0.1)' : undefined,
                    borderRadius: isMobile ? 0 : 3,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: locked ? '#556677' : '#aabbcc',
                    textAlign: 'left',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                    animation: researching ? 'sys-row-research-pulse 2.5s ease-in-out infinite' : undefined,
                    position: 'relative',
                    opacity: locked ? 0.6 : 1,
                  }}
                >
                  {/* Name (clickable to navigate) */}
                  <span
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => onNavigate(system)}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: starColor,
                        flexShrink: 0,
                        boxShadow: isHome ? '0 0 0 3px rgba(68,255,136,0.5), 0 0 0 1px #44ff88' : undefined,
                      }}
                    />
                    <span>{name}</span>
                  </span>

                  {/* Spectral class */}
                  <span style={{ color: '#667788', fontSize: 10, textAlign: 'center' }}>
                    {system.star.spectralClass}
                  </span>

                  {/* Coordinates (hidden on mobile) */}
                  {!isMobile && (
                    <span style={{ color: '#556677', fontSize: 10 }}>
                      {system.position.x.toFixed(0)}, {system.position.y.toFixed(0)}
                    </span>
                  )}

                  {/* Planet count */}
                  <span style={{ color: '#667788', fontSize: 10, textAlign: 'center' }}>
                    {system.planets.length}
                  </span>

                  {/* Ring index */}
                  <span style={{ color: '#556677', fontSize: 10, textAlign: 'center' }}>
                    {system.ringIndex ?? '-'}
                  </span>

                  {/* Research action button */}
                  {hasResearchCol && (
                    <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                      {isHome ? (
                        <span style={{ color: '#334455', fontSize: 10 }} />
                      ) : locked && !(isQuarkUnlocked?.(system.id) ?? false) ? (
                        // Ring-locked system — show premium Q-pay shortcut if
                        // it's wired in, otherwise a plain lock icon. Price
                        // is the fixed SLOT_UNLOCK_QUARKS_COST equivalent.
                        onUnlockViaQuarks ? (
                          <button
                            title={t('archive.unlock_via_quarks_tooltip', { cost: quarkUnlockCost }) as string}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (quarksBalance >= quarkUnlockCost) {
                                onUnlockViaQuarks(system.id);
                              }
                            }}
                            disabled={quarksBalance < quarkUnlockCost}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                              background: quarksBalance >= quarkUnlockCost ? 'rgba(68,136,255,0.14)' : 'rgba(10,15,25,0.4)',
                              border: `1px solid ${quarksBalance >= quarkUnlockCost ? '#446688' : '#223344'}`,
                              borderRadius: 3,
                              color: quarksBalance >= quarkUnlockCost ? '#7bb8ff' : '#445566',
                              fontFamily: 'monospace',
                              fontSize: 9,
                              padding: '2px 6px',
                              cursor: quarksBalance >= quarkUnlockCost ? 'pointer' : 'not-allowed',
                              letterSpacing: 0.5,
                            }}
                          >
                            {quarkUnlockCost} ⚛
                          </button>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#445566" strokeWidth="1.2" strokeLinecap="round">
                            <rect x="3" y="7" width="10" height="8" rx="1.5" />
                            <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                          </svg>
                        )
                      ) : fullyResearched || researching || canResearch ? (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ResearchProgressIcon
                            state={fullyResearched ? 'complete' : researching ? 'researching' : 'idle'}
                            progress={progressPct}
                            seedId={system.id}
                            tutorialId={canResearch && !researching && !fullyResearched && isFirstNonHome ? 'research-btn-first' : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fullyResearched) {
                                onNavigate(system);
                              } else if (canResearch && !researching) {
                                handleResearchClick(system.id);
                              }
                            }}
                          />
                          {/* Quark-shortcut — only on idle (canResearch && !researching && !fullyResearched).
                              Tiny ⚛ button opens a modal that asks the player to spend
                              instantResearchCost quarks to skip the research timer. */}
                          {onInstantResearch && canResearch && !researching && !fullyResearched && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInstantTargetId(system.id);
                              }}
                              title={t('archive.instant_research_tooltip', { cost: instantResearchCost }) as string}
                              aria-label={t('archive.instant_research_tooltip', { cost: instantResearchCost }) as string}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'rgba(68,136,255,0.10)',
                                border: '1px solid rgba(123,184,255,0.45)',
                                color: '#7bb8ff',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                                fontSize: 11,
                                lineHeight: 1,
                                padding: 0,
                              }}
                            >
                              ⚛
                            </button>
                          )}
                          {showInsufficientData && (
                            <div style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              marginBottom: 4,
                              whiteSpace: 'nowrap',
                              fontSize: 10,
                              color: '#cc8844',
                              background: 'rgba(10, 15, 25, 0.95)',
                              border: '1px solid rgba(204, 136, 68, 0.3)',
                              borderRadius: 3,
                              padding: '4px 8px',
                              zIndex: 10,
                              pointerEvents: 'none',
                            }}>
                              {t('research.panel_insufficient_data')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#334455', fontSize: 10 }}>
                          {'\u2014'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Instant-research-via-quarks confirmation popup. Mounted at the end
          of the list so it overlays everything; pointer-events fall through
          the dimmed backdrop. */}
      {instantTargetId && onInstantResearch && (
        <div
          onClick={() => setInstantTargetId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9700,
            background: 'rgba(2,5,16,0.78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 360, width: '100%',
              background: 'rgba(10,15,25,0.98)',
              border: '1px solid #446688',
              borderRadius: 6,
              padding: 20,
              fontFamily: 'monospace',
              color: '#aabbcc',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#7bb8ff' }}>
              {t('archive.instant_research_title')}
            </div>
            <div style={{ fontSize: 12, color: '#8899aa', marginBottom: 16, lineHeight: 1.5 }}>
              {t('archive.instant_research_desc', { cost: instantResearchCost })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  if (quarksBalance >= instantResearchCost) {
                    onInstantResearch(instantTargetId);
                    setInstantTargetId(null);
                  }
                }}
                disabled={quarksBalance < instantResearchCost}
                style={{
                  background: quarksBalance >= instantResearchCost ? 'rgba(68,136,255,0.18)' : 'rgba(10,15,25,0.4)',
                  border: `1px solid ${quarksBalance >= instantResearchCost ? '#446688' : '#223344'}`,
                  borderRadius: 3,
                  color: quarksBalance >= instantResearchCost ? '#7bb8ff' : '#445566',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '8px 12px',
                  cursor: quarksBalance >= instantResearchCost ? 'pointer' : 'not-allowed',
                }}
              >
                {t('archive.instant_research_btn', { cost: instantResearchCost })}
              </button>
              {onOpenTopUp && (
                <button
                  onClick={() => {
                    setInstantTargetId(null);
                    onOpenTopUp();
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #334455',
                    borderRadius: 3,
                    color: '#aabbcc',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {t('archive.buy_quarks_btn')}
                </button>
              )}
              <button
                onClick={() => setInstantTargetId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: '#667788',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Single research-state icon. One control replaces the previous trio of
 *  ResearchedIcon / ResearchLupeButton / ResearchingProgress.
 *
 *  Layout: a 26×26 button. Inside is a circular outline ring (the "track")
 *  drawn at ~30% opacity, plus a foreground progress arc that fills the same
 *  ring based on `progress` (0-100). A small magnifier sits in the centre
 *  for idle/complete states and orbits the ring while researching.
 *
 *  States:
 *   - idle        → faint track, magnifier in centre, no animation. Clicking
 *                   triggers onClick (start research).
 *   - researching → track + partial progress arc. Magnifier orbits the ring;
 *                   orbit phase is seeded from `seedId` so concurrent rows
 *                   stay out of sync.
 *   - complete    → solid full-opacity ring + centred magnifier on a filled
 *                   blue background. Clicking jumps into the system. */
function ResearchProgressIcon({
  state,
  progress,
  seedId,
  tutorialId,
  onClick,
}: {
  state: 'idle' | 'researching' | 'complete';
  progress: number;
  seedId: string;
  tutorialId?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  // Low/mid tier devices skip the orbit animation to keep ~1,400-row lists
  // scrolling smooth. The static state still communicates "in progress" via
  // the partial arc.
  const skipAnim = useMemo(() => {
    const tier = getDeviceTier();
    return tier === 'low' || tier === 'mid';
  }, []);

  // SVG geometry — circle centred at (13,13) with r=10; circumference is
  // used to compute the dasharray for the progress arc.
  const r = 10;
  const cx = 13;
  const cy = 13;
  const circ = 2 * Math.PI * r;
  // Cap the arc so partial progress always shows at least a sliver, and
  // 100% renders as the full ring.
  const arcLen = state === 'complete' ? circ : Math.max(0, Math.min(circ, (progress / 100) * circ));

  // Per-row animation delay so neighbouring rows orbit out of phase.
  const orbitDelay = useMemo(() => {
    if (state !== 'researching') return 0;
    return -((hashSystemId(seedId) % 1000) / 1000) * 4; // 0..-4s within a 4s loop
  }, [seedId, state]);

  const isComplete = state === 'complete';
  const isResearching = state === 'researching';

  const tooltip = isComplete
    ? t('archive.researched_tooltip')
    : isResearching
      ? t('archive.researching_btn')
      : t('archive.research_btn');
  const ariaLabel = isComplete
    ? t('archive.researched_btn')
    : isResearching
      ? t('archive.researching_btn')
      : t('archive.research_btn');

  return (
    <button
      data-tutorial-id={tutorialId}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tooltip as string}
      aria-label={ariaLabel as string}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: '50%',
        background: isComplete
          ? '#4488ff'
          : isResearching
            ? 'rgba(68,136,255,0.10)'
            : hover ? 'rgba(68,136,255,0.18)' : 'rgba(68,136,255,0.06)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.15s',
        boxShadow: isComplete ? '0 0 6px rgba(68,136,255,0.35)' : undefined,
      }}
    >
      {/* Track + progress arc. For complete state we still draw the full
          ring as a solid stroke so the icon reads as "filled" at a glance. */}
      <svg
        width={26}
        height={26}
        viewBox="0 0 26 26"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Base track — faint outline ring (30% opacity for idle/researching,
            full opacity inside the filled-blue circle for complete). */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={isComplete ? '#7bb8ff' : '#7bb8ff'}
          strokeOpacity={isComplete ? 1 : 0.3}
          strokeWidth={1.4}
        />
        {/* Foreground progress arc — drawn as a stroke-dasharray slice. We
            rotate -90° so progress starts at 12 o'clock. */}
        {!isComplete && arcLen > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#7bb8ff"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${circ}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
      </svg>

      {/* Magnifier — fixed in centre for idle/complete, orbits for researching.
          The orbit wrapper uses CSS animation; rotating the wrapper around its
          centre while the magnifier sits at the top of it produces a clean
          circular orbit. */}
      {isResearching ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            animation: skipAnim ? undefined : 'sys-research-orbit 4s linear infinite',
            animationDelay: skipAnim ? undefined : `${orbitDelay}s`,
            transformOrigin: '50% 50%',
          }}
        >
          <svg
            width={9}
            height={9}
            viewBox="0 0 16 16"
            style={{
              position: 'absolute',
              top: 1,
              left: '50%',
              transform: 'translateX(-50%)',
              animation: skipAnim ? undefined : 'sys-research-pulse 1.8s ease-in-out infinite',
            }}
            fill="none"
            stroke="#7bb8ff"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <circle cx="7" cy="7" r="4.2" />
            <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
          </svg>
        </div>
      ) : (
        <svg
          width={12}
          height={12}
          viewBox="0 0 16 16"
          style={{ position: 'relative', zIndex: 1 }}
          fill="none"
          stroke={isComplete ? '#ffffff' : '#7bb8ff'}
          strokeWidth={isComplete ? 1.8 : 1.6}
          strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="4.2" />
          <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
        </svg>
      )}
    </button>
  );
}
