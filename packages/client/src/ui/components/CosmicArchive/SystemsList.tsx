import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { StarSystem } from '@nebulife/core';

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
  researchData = 0,
  researchDataCost = 1,
}: SystemsListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [insufficientDataId, setInsufficientDataId] = useState<string | null>(null);
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ensureStyles();
  }, []);

  // Clear tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (insufficientTimerRef.current) clearTimeout(insufficientTimerRef.current);
    };
  }, []);

  const sorted = useMemo(() => {
    return [...allSystems].sort((a, b) => {
      // Home system first
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;
      // Then by name
      const aName = aliases[a.id] || a.name;
      const bName = aliases[b.id] || b.name;
      return aName.localeCompare(bName);
    });
  }, [allSystems, aliases]);

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
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasResearchCol
            ? '1fr 60px 80px 60px 50px 100px'
            : '1fr 60px 80px 60px 50px',
          gap: 8,
          padding: '6px 12px',
          fontSize: 10,
          color: '#445566',
          textTransform: 'uppercase',
          letterSpacing: 1,
          borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
          marginBottom: 4,
        }}
      >
        <span>Назва</span>
        <span>Клас</span>
        <span>Координати</span>
        <span>Планети</span>
        <span>Кільце</span>
        {hasResearchCol && <span style={{ textAlign: 'center' }}>Дії</span>}
      </div>

      {/* System rows */}
      {sorted.map((system) => {
        const isHome = system.planets.some((p) => p.isHomePlanet);
        const isHovered = hoveredId === system.id;
        const name = aliases[system.id] || system.name;
        const starColor =
          SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';
        const canResearch = canStartResearch?.(system.id) ?? false;
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
              gridTemplateColumns: hasResearchCol
                ? '1fr 60px 80px 60px 50px 100px'
                : '1fr 60px 80px 60px 50px',
              gap: 8,
              padding: '8px 12px',
              background: researching
                ? undefined
                : isHovered
                  ? 'rgba(25, 35, 50, 0.5)'
                  : 'rgba(10, 15, 25, 0.3)',
              border: researching
                ? '1px solid rgba(68, 136, 170, 0.25)'
                : '1px solid rgba(51, 68, 85, 0.15)',
              borderRadius: 3,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#aabbcc',
              textAlign: 'left',
              alignItems: 'center',
              transition: 'background 0.15s',
              animation: researching ? 'sys-row-research-pulse 2.5s ease-in-out infinite' : undefined,
              position: 'relative',
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
                }}
              />
              <span>
                {name}
                {isHome && (
                  <span
                    style={{ color: '#44ff88', fontSize: 9, marginLeft: 6 }}
                  >
                    HOME
                  </span>
                )}
              </span>
            </span>

            {/* Spectral class */}
            <span style={{ color: '#667788', fontSize: 10 }}>
              {system.star.spectralClass}
            </span>

            {/* Coordinates */}
            <span style={{ color: '#556677', fontSize: 10 }}>
              {system.position.x.toFixed(0)}, {system.position.y.toFixed(0)}
            </span>

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
                  /* Home system — no button */
                  <span style={{ color: '#334455', fontSize: 10 }} />
                ) : fullyResearched ? (
                  /* Fully researched — green "Досліджено" button */
                  <ResearchedButton onClick={() => onNavigate(system)} />
                ) : researching ? (
                  /* Currently researching — animated "Досліджується..." */
                  <ResearchingButton />
                ) : canResearch ? (
                  /* Can start research — "Дослідити" */
                  <div style={{ position: 'relative' }}>
                    <ResearchButton
                      tutorialId={isFirstNonHome ? 'research-btn-first' : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResearchClick(system.id);
                      }}
                    />
                    {/* Insufficient data tooltip */}
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
                  /* Cannot research — dash */
                  <span style={{ color: '#334455', fontSize: 10 }}>
                    {'\u2014'}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Green "Досліджено" button — links to system navigation */
function ResearchedButton({ onClick }: { onClick: () => void }) {
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
      Дослiджено
    </button>
  );
}

/** Animated "Досліджується..." button — shown during active research */
function ResearchingButton() {
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
      }}
    >
      Дослiджується...
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
      Дослідити
    </button>
  );
}
