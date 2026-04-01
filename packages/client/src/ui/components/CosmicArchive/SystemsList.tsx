import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { StarSystem } from '@nebulife/core';
import { useT } from '../../../i18n';

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
  /** Whether a ring is locked (previous ring not fully researched) */
  isRingLocked?: (ringIndex: number) => boolean;
  /** Current research data balance */
  researchData?: number;
  /** Cost to start research */
  researchDataCost?: number;
}

export function SystemsList({
  allSystems,
  aliases,
  onNavigate,
  onStartResearch,
  canStartResearch,
  isResearching,
  isFullyResearched,
  isRingLocked,
  researchData = 0,
  researchDataCost = 1,
}: SystemsListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [insufficientDataId, setInsufficientDataId] = useState<string | null>(null);
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

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

  // Track first non-home system for tutorial target
  const firstNonHomeId = useMemo(() => {
    const sys = sorted.find((s) => !s.planets.some((p) => p.isHomePlanet));
    return sys?.id ?? null;
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        Досліджених систем поки немає
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
        <span style={{ fontSize: 9, color: '#445566', textTransform: 'uppercase', letterSpacing: 1 }}>Назва</span>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip="Спектральний клас зірки">
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
            <HeaderIcon tooltip="Координати у галактиці">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2" strokeLinecap="round">
                <circle cx="8" cy="8" r="1.5" />
                <line x1="8" y1="1" x2="8" y2="15" />
                <line x1="1" y1="8" x2="15" y2="8" />
              </svg>
            </HeaderIcon>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip="Кількість планет">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="5" />
              <ellipse cx="8" cy="8" rx="7.5" ry="2.5" transform="rotate(-30 8 8)" />
            </svg>
          </HeaderIcon>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip="Кільце від домівки">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="3" />
              <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
            </svg>
          </HeaderIcon>
        </div>
        {hasResearchCol && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeaderIcon tooltip="Дії дослідження">
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
          ? 'Домашня система'
          : `Кiльце ${group.ringIndex}`;

        return (
          <React.Fragment key={`ring-${group.ringIndex}`}>
            {/* Ring group header */}
            {group.ringIndex > 0 && (
              <div
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
                }}
              >
                <span>{ringLabel}</span>
                {locked && (
                  <span style={{ fontSize: 9, color: '#556677', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
                    — дослiдiть усi системи попереднього кiльця
                  </span>
                )}
              </div>
            )}

            {group.systems.map((system) => {
              const isHome = system.planets.some((p) => p.isHomePlanet);
              const isHovered = hoveredId === system.id;
              const name = aliases[system.id] || system.name;
              const starColor =
                SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';
              const canResearch = locked ? false : (canStartResearch?.(system.id) ?? false);
              const isFirstNonHome = system.id === firstNonHomeId;
              const researching = isResearching?.(system.id) ?? false;
              const fullyResearched = isFullyResearched?.(system.id) ?? false;
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
                      ) : locked ? (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#445566" strokeWidth="1.2" strokeLinecap="round">
                          <rect x="3" y="7" width="10" height="8" rx="1.5" />
                          <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                        </svg>
                      ) : fullyResearched ? (
                        <ResearchedButton onClick={() => onNavigate(system)} />
                      ) : researching ? (
                        <ResearchingButton />
                      ) : canResearch ? (
                        <div style={{ position: 'relative' }}>
                          <ResearchButton
                            tutorialId={isFirstNonHome ? 'research-btn-first' : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResearchClick(system.id);
                            }}
                          />
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
                              Недостатньо даних
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
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Green "Досліджено" button — links to system navigation */
function ResearchedButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(68, 255, 136, 0.2)' : 'rgba(68, 255, 136, 0.1)',
        border: `1px solid ${hover ? 'rgba(68, 255, 136, 0.5)' : 'rgba(68, 255, 136, 0.3)'}`,
        borderRadius: 3,
        color: '#44ff88',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '3px 10px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {t('archive.researched')}
    </button>
  );
}

/** Animated "Дослідж." button — shown during active research (background sweep only) */
function ResearchingButton() {
  const { t } = useT();
  return (
    <span
      style={{
        display: 'inline-block',
        background: 'linear-gradient(90deg, rgba(68,136,170,0.1), rgba(68,136,170,0.3), rgba(68,136,170,0.1))',
        backgroundSize: '200% 100%',
        border: '1px dashed rgba(68, 136, 170, 0.5)',
        borderRadius: 3,
        color: '#4488aa',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '3px 8px',
        animation: 'sys-btn-sweep 2s linear infinite',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {t('archive.researching')}
    </span>
  );
}

/** "Дослідити" button with hover animations */
function ResearchButton({
  tutorialId,
  onClick,
}: {
  tutorialId?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { t } = useT();
  const [hover, setHover] = useState(false);
  return (
    <button
      data-tutorial-id={tutorialId}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(68, 136, 170, 0.3)' : 'rgba(68, 136, 170, 0.15)',
        border: `1px solid ${hover ? 'rgba(68, 136, 170, 0.6)' : 'rgba(68, 136, 170, 0.35)'}`,
        borderRadius: 3,
        color: '#4488aa',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '3px 10px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {t('archive.research')}
    </button>
  );
}
