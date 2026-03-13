import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { StarSystem, Planet, Star } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabbff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4e8',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

/**
 * Derive a representative CSS hex color for a planet chip
 * based on physical properties (simplified version of PlanetVisuals.ts).
 */
function getPlanetChipColor(planet: Planet, _star: Star): string {
  if (planet.isHomePlanet) return '#44ff88';

  const t = planet.surfaceTempK;

  // Gas giant
  if (planet.type === 'gas-giant') {
    if (t > 1000) return '#cc5522'; // hot jupiter
    if (t > 400) return '#cc9955';  // warm
    return '#aa8855';               // cold saturn-like
  }

  // Ice giant
  if (planet.type === 'ice-giant') {
    if (t > 200) return '#5588aa';
    return '#3366aa'; // neptune-like
  }

  // Rocky/dwarf with life
  if (planet.hasLife) {
    if (planet.lifeComplexity === 'intelligent' || planet.lifeComplexity === 'multicellular')
      return '#2a8a3a';
    return '#6a8a5a'; // microbial
  }

  // Rocky/dwarf by temperature
  if (t > 1200) return '#aa3300';  // lava
  if (t > 600) return '#aa5533';   // venus-like
  if (t > 373) return '#bb9966';   // warm desert
  if (t > 273) return '#887766';   // temperate rock
  if (t > 200) return '#8899aa';   // cold frosted
  return '#aabbcc';                 // frozen
}

// ---------------------------------------------------------------------------
// PlanetsCatalog
// ---------------------------------------------------------------------------

interface PlanetsCatalogProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (planetId: string) => void;
  getResearchProgress?: (systemId: string) => number;
}

export function PlanetsCatalog({
  allSystems,
  aliases,
  onViewPlanet,
  favorites,
  onToggleFavorite,
  getResearchProgress,
}: PlanetsCatalogProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nebulife_pinned_systems');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    planetId: string;
    systemId: string;
    x: number;
    y: number;
  } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  // Save pinned state
  useEffect(() => {
    try {
      localStorage.setItem(
        'nebulife_pinned_systems',
        JSON.stringify([...pinned]),
      );
    } catch {
      /* ignore */
    }
  }, [pinned]);

  // Filter: only systems with planets, home system first, then pinned, then rest
  const sortedSystems = useMemo(() => {
    const withPlanets = allSystems.filter((s) => s.planets.length > 0);
    return withPlanets.sort((a, b) => {
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;
      const aPinned = pinned.has(a.id) ? -1 : 0;
      const bPinned = pinned.has(b.id) ? -1 : 0;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return 0;
    });
  }, [allSystems, pinned]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePlanetClick = useCallback((system: StarSystem, planetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({
      planetId,
      systemId: system.id,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 120),
    });
  }, []);

  if (sortedSystems.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        Досліджених систем поки немає
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sortedSystems.map((system) => {
        const isOpen = expanded.has(system.id);
        const isPinned = pinned.has(system.id);
        const isHome = system.planets.some((p) => p.isHomePlanet);
        const name = aliases[system.id] || system.name;
        const starColor =
          SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';

        return (
          <div key={system.id}>
            {/* Star row */}
            <button
              onClick={() => toggleExpanded(system.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: isOpen
                  ? 'rgba(20, 30, 45, 0.6)'
                  : 'rgba(10, 15, 25, 0.4)',
                border: '1px solid rgba(51, 68, 85, 0.2)',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#aabbcc',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              {/* Star color dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: starColor,
                  boxShadow: `0 0 4px ${starColor}66`,
                  flexShrink: 0,
                }}
              />

              {/* Name */}
              <span style={{ flex: 1, minWidth: 0 }}>
                {name}
                {isHome && (
                  <span style={{ color: '#44ff88', fontSize: 9, marginLeft: 6 }}>
                    HOME
                  </span>
                )}
              </span>

              {/* Spectral class */}
              <span style={{ color: '#556677', fontSize: 10, flexShrink: 0 }}>
                {system.star.spectralClass}
              </span>

              {/* Planet count */}
              <span style={{ color: '#556677', fontSize: 10, flexShrink: 0 }}>
                {system.planets.length} пл.
              </span>

              {/* Research progress */}
              {getResearchProgress && (
                <ResearchProgressIcon progress={getResearchProgress(system.id)} />
              )}

              {/* Pin SVG icon */}
              <span
                onClick={(e) => togglePin(system.id, e)}
                style={{
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'opacity 0.15s',
                }}
                title={isPinned ? 'Відкріпити' : 'Закріпити'}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill={isPinned ? '#4488aa' : 'none'}
                  stroke={isPinned ? '#4488aa' : '#445566'}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 1h6l1 5-2 1v4l-2 4-2-4V7L4 6l1-5z" />
                </svg>
              </span>

              {/* Expand indicator */}
              <span style={{ color: '#445566', fontSize: 10, flexShrink: 0 }}>
                {isOpen ? '-' : '+'}
              </span>
            </button>

            {/* Expanded planet row */}
            {isOpen && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 16px 10px 30px',
                  overflowX: 'auto',
                  background: 'rgba(8, 12, 22, 0.4)',
                  borderLeft: '1px solid rgba(51, 68, 85, 0.15)',
                  borderRight: '1px solid rgba(51, 68, 85, 0.15)',
                  borderBottom: '1px solid rgba(51, 68, 85, 0.15)',
                  borderRadius: '0 0 3px 3px',
                  marginTop: -1,
                }}
              >
                {system.planets.map((planet) => (
                  <PlanetChip
                    key={planet.id}
                    planet={planet}
                    star={system.star}
                    isFavorite={favorites.has(planet.id)}
                    onClick={(e) => handlePlanetClick(system, planet.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Context menu */}
      {contextMenu && (
        <PlanetContextMenuPopup
          planetId={contextMenu.planetId}
          systemId={contextMenu.systemId}
          x={contextMenu.x}
          y={contextMenu.y}
          isFavorite={favorites.has(contextMenu.planetId)}
          onToggleFavorite={() => {
            onToggleFavorite(contextMenu.planetId);
            setContextMenu(null);
          }}
          onView={() => {
            const sys = allSystems.find((s) => s.id === contextMenu.systemId);
            if (sys) onViewPlanet(sys, contextMenu.planetId);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetContextMenuPopup
// ---------------------------------------------------------------------------

function PlanetContextMenuPopup({
  planetId,
  systemId,
  x,
  y,
  isFavorite,
  onToggleFavorite,
  onView,
}: {
  planetId: string;
  systemId: string;
  x: number;
  y: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
}) {
  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        background: 'rgba(10, 15, 25, 0.96)',
        border: '1px solid #446688',
        borderRadius: 4,
        padding: '4px 0',
        fontFamily: 'monospace',
        minWidth: 170,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        style={menuItemStyle}
        onClick={onToggleFavorite}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 50, 70, 0.5)';
          e.currentTarget.style.color = isFavorite ? '#cc4444' : '#44ff88';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = '#aabbcc';
        }}
      >
        {isFavorite ? 'Видалити з обраних' : 'В обрані'}
      </button>
      <button
        style={menuItemStyle}
        onClick={onView}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 50, 70, 0.5)';
          e.currentTarget.style.color = '#aaccee';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = '#aabbcc';
        }}
      >
        Переглянути
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetChip — small clickable planet representation
// ---------------------------------------------------------------------------

function PlanetChip({
  planet,
  star,
  isFavorite,
  onClick,
}: {
  planet: Planet;
  star: Star;
  isFavorite?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hover, setHover] = useState(false);

  // Size proportional to radius (clamped)
  const minSize = 24;
  const maxSize = 48;
  const normalizedR = Math.min(
    1,
    Math.log(planet.radiusEarth + 1) / Math.log(12),
  );
  const size = minSize + (maxSize - minSize) * normalizedR;

  // Real color based on planet properties
  const baseColor = getPlanetChipColor(planet, star);

  // Habitable glow
  const isHabitable = planet.isColonizable || planet.hasLife;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        background: hover ? 'rgba(30, 45, 65, 0.5)' : 'transparent',
        border: 'none',
        borderRadius: 3,
        cursor: 'pointer',
        fontFamily: 'monospace',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      {/* Favorite badge */}
      {isFavorite && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 2,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#44ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l4 4 6-8" />
          </svg>
        </div>
      )}

      {/* Planet circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${baseColor}88, ${baseColor}44)`,
          border: `1px solid ${baseColor}77`,
          boxShadow: isHabitable
            ? `0 4px 8px -2px rgba(68, 255, 136, 0.4)${hover ? `, 0 0 6px ${baseColor}44` : ''}`
            : hover ? `0 0 6px ${baseColor}33` : 'none',
          transition: 'box-shadow 0.15s',
        }}
      />

      {/* Planet name */}
      <div
        style={{
          fontSize: 9,
          color: hover ? '#aabbcc' : '#667788',
          textAlign: 'center',
          maxWidth: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}
      >
        {planet.name}
      </div>

      {/* Home badge */}
      {planet.isHomePlanet && (
        <div style={{ fontSize: 8, color: '#44ff88' }}>HOME</div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ResearchProgressIcon — circular progress indicator for system research
// ---------------------------------------------------------------------------

function ResearchProgressIcon({ progress }: { progress: number }) {
  const r = 6;
  const circumference = 2 * Math.PI * r;
  const filled = (progress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <span
      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
      title={isComplete ? 'Дослiджено' : `Дослiджено: ${Math.round(progress)}%`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        {/* Background circle */}
        <circle cx="8" cy="8" r={r} fill="none"
          stroke="rgba(51, 68, 85, 0.3)" strokeWidth="1.5" />
        {/* Progress arc */}
        <circle cx="8" cy="8" r={r} fill="none"
          stroke={isComplete ? '#44ff88' : '#4488aa'}
          strokeWidth="1.5"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
        />
        {/* Check mark for 100% */}
        {isComplete && (
          <path d="M5.5 8l2 2 3-4" fill="none" stroke="#44ff88"
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      {!isComplete && (
        <span style={{ fontSize: 9, color: '#556677' }}>{Math.round(progress)}%</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FavoritesPlanetsList — shown in "Обрані" sub-tab
// ---------------------------------------------------------------------------

export function FavoritesPlanetsList({
  allSystems,
  aliases,
  favorites,
  onToggleFavorite,
  onViewPlanet,
}: {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  favorites: Set<string>;
  onToggleFavorite: (planetId: string) => void;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
}) {
  // Resolve favorite planets to their system + planet objects
  const favoritePlanets = useMemo(() => {
    const result: { system: StarSystem; planet: Planet }[] = [];
    for (const sys of allSystems) {
      for (const p of sys.planets) {
        if (favorites.has(p.id)) result.push({ system: sys, planet: p });
      }
    }
    return result;
  }, [allSystems, favorites]);

  if (favoritePlanets.length === 0) {
    return (
      <div style={{
        fontSize: 12,
        color: '#556677',
        textAlign: 'center',
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="#334455" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8l4 4 6-8" />
        </svg>
        Немає обраних планет
        <div style={{ fontSize: 10, color: '#445566' }}>
          Клікніть на планету в розділі "Планети" та оберіть "В обрані"
        </div>
      </div>
    );
  }

  // Group by system
  const grouped = useMemo(() => {
    const map = new Map<string, { system: StarSystem; planets: Planet[] }>();
    for (const { system, planet } of favoritePlanets) {
      if (!map.has(system.id)) map.set(system.id, { system, planets: [] });
      map.get(system.id)!.planets.push(planet);
    }
    return [...map.values()];
  }, [favoritePlanets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {grouped.map(({ system, planets }) => (
        <div key={system.id}>
          <div style={{ fontSize: 10, color: '#556677', marginBottom: 6, letterSpacing: 0.5 }}>
            {aliases[system.id] || system.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {planets.map((planet) => (
              <PlanetChip
                key={planet.id}
                planet={planet}
                star={system.star}
                isFavorite={true}
                onClick={() => onViewPlanet(system, planet.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
