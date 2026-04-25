import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';
import { isTerraformable, nearestColonyDistance } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterId =
  | 'terraform'
  | 'minerals'
  | 'isotopes'
  | 'water'
  | 'life'
  | 'volatiles'
  | 'population';

interface PlanetsCatalogV2Props {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
  /** Planet IDs that have a colony (home planet + colony_hub buildings). */
  colonyPlanetIds: Set<string>;
  /** System IDs that contain colony planets — used as "nearest colony" origins. */
  colonySystemIds: string[];
}

// ---------------------------------------------------------------------------
// Planet type → gradient color
// ---------------------------------------------------------------------------

function getPlanetBodyColor(planet: Planet): string {
  if (planet.isHomePlanet) return '#44ff88';
  switch (planet.type) {
    case 'rocky': return '#aa8855';
    case 'terrestrial': return '#44aa66';
    case 'dwarf': return '#776655';
    case 'gas-giant': return '#cc9966';
    case 'ice-giant': return '#88aaee';
    default: return '#8899aa';
  }
}

// ---------------------------------------------------------------------------
// Filter predicate helpers
// ---------------------------------------------------------------------------

function passesFilter(
  planet: Planet,
  filter: FilterId,
  colonyPlanetIds: Set<string>,
): boolean {
  switch (filter) {
    case 'terraform':
      return isTerraformable(planet) && planet.terraformDifficulty > 0;

    case 'minerals':
      // Rocky / terrestrial / dwarf types always have meaningful minerals;
      // gas/ice-giants have negligible accessible minerals.
      return (
        planet.type === 'rocky' ||
        planet.type === 'terrestrial' ||
        planet.type === 'dwarf'
      );

    case 'isotopes':
      // Same solid-surface heuristic — isotopes come from the crust.
      return (
        planet.type === 'rocky' ||
        planet.type === 'terrestrial' ||
        planet.type === 'dwarf'
      );

    case 'water':
      return (
        (planet.hydrosphere?.waterCoverageFraction ?? 0) > 0 ||
        (planet.habitability.water ?? 0) > 0
      );

    case 'life':
      return planet.hasLife === true;

    case 'volatiles':
      return (planet.atmosphere?.surfacePressureAtm ?? 0) > 0;

    case 'population':
      return colonyPlanetIds.has(planet.id);
  }
}

// ---------------------------------------------------------------------------
// Inject glow keyframe once
// ---------------------------------------------------------------------------

const GLOW_STYLE_ID = 'nebulife-catalog-glow';
if (typeof document !== 'undefined' && !document.getElementById(GLOW_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = GLOW_STYLE_ID;
  s.textContent = `
    @keyframes nebucatalog-glow {
      0%, 100% { box-shadow: 0 0 4px rgba(68,136,170,0.3); }
      50%       { box-shadow: 0 0 10px rgba(68,136,170,0.7); }
    }
  `;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// PlanetCard — single grid cell
// ---------------------------------------------------------------------------

function PlanetCard({
  planet,
  systemName,
  distanceLY,
  onClick,
}: {
  planet: Planet;
  systemName: string;
  distanceLY: number | null;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);

  const color = getPlanetBodyColor(planet);

  // Radius: clamp radiusEarth to [0.4, 1.2] * 50px = [20px, 60px] diameter
  const clampedR = Math.max(0.4, Math.min(1.2, planet.radiusEarth));
  const diameter = Math.round(clampedR * 50);
  const cx = 40;
  const cy = 40;
  const r = diameter / 2;

  const hasRings =
    planet.type === 'gas-giant' ||
    planet.type === 'ice-giant' ||
    (planet.moons && planet.moons.length >= 3);

  const distLabel =
    distanceLY !== null
      ? t('archive.distance_ly', { ly: distanceLY.toFixed(1) })
      : null;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 6px',
        background: hover
          ? 'rgba(30, 45, 65, 0.6)'
          : 'rgba(10, 15, 25, 0.3)',
        border: hover
          ? '1px solid rgba(68, 102, 136, 0.5)'
          : '1px solid rgba(51, 68, 85, 0.2)',
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'monospace',
        transition: 'background 0.15s, border-color 0.15s',
        animation: hover ? 'nebucatalog-glow 1.2s ease-in-out infinite' : 'none',
      }}
    >
      {/* SVG planet representation */}
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Ring (behind planet) */}
        {hasRings && (
          <ellipse
            cx={cx}
            cy={cy}
            rx={r * 1.9}
            ry={r * 0.38}
            fill="none"
            stroke={`${color}66`}
            strokeWidth="2"
          />
        )}
        {/* Planet body — radial gradient */}
        <defs>
          <radialGradient
            id={`pg-${planet.id}`}
            cx="35%"
            cy="35%"
            r="60%"
          >
            <stop offset="0%" stopColor={`${color}cc`} />
            <stop offset="100%" stopColor={`${color}55`} />
          </radialGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={`url(#pg-${planet.id})`}
          stroke={`${color}88`}
          strokeWidth="1"
        />
        {/* Home planet indicator */}
        {planet.isHomePlanet && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 4}
            fill="none"
            stroke="#44ff88"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Planet name */}
      <div
        style={{
          fontSize: 10,
          color: hover ? '#aabbcc' : '#8899aa',
          textAlign: 'center',
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}
        title={planet.name}
      >
        {planet.name}
      </div>

      {/* System name + distance */}
      <div
        style={{
          fontSize: 9,
          color: '#556677',
          textAlign: 'center',
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={systemName}
      >
        {systemName}
      </div>
      {distLabel !== null && (
        <div style={{ fontSize: 9, color: '#4488aa' }}>{distLabel}</div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Filter chip bar
// ---------------------------------------------------------------------------

const FILTERS: FilterId[] = [
  'terraform',
  'minerals',
  'isotopes',
  'water',
  'life',
  'volatiles',
  'population',
];

const FILTER_ICONS: Record<FilterId, React.ReactNode> = {
  terraform: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M5 10 Q8 5 11 10" />
      <line x1="8" y1="2" x2="8" y2="4" />
    </svg>
  ),
  minerals: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,2 14,12 2,12" />
    </svg>
  ),
  isotopes: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="5.5" strokeDasharray="3 2" />
    </svg>
  ),
  water: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 C8 3 3 9 3 12 a5 5 0 0 0 10 0 C13 9 8 3 8 3z" />
    </svg>
  ),
  life: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14 C8 14 2 10 2 6 a4 4 0 0 1 8 0 a4 4 0 0 1 4-2 c0 2-2 4-6 10z" />
    </svg>
  ),
  volatiles: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12 Q2 8 4 5 Q6 3 8 2 Q10 3 12 5 Q14 8 12 12" />
      <line x1="8" y1="14" x2="8" y2="12" />
    </svg>
  ),
  population: (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 15 C2 11 14 11 14 15" />
    </svg>
  ),
};

function FilterChip({
  filterId,
  active,
  onToggle,
}: {
  filterId: FilterId;
  active: boolean;
  onToggle: (id: FilterId) => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const [showLabel, setShowLabel] = useState(false);

  const labelKey: Record<FilterId, string> = {
    terraform: 'archive.filter_terraform',
    minerals: 'archive.filter_minerals',
    isotopes: 'archive.filter_isotopes',
    water: 'archive.filter_water',
    life: 'archive.filter_life',
    volatiles: 'archive.filter_volatiles',
    population: 'archive.filter_population',
  };

  return (
    <button
      onClick={() => onToggle(filterId)}
      onMouseEnter={() => { setHover(true); setShowLabel(true); }}
      onMouseLeave={() => { setHover(false); setShowLabel(false); }}
      onTouchStart={() => setShowLabel(true)}
      onTouchEnd={() => setTimeout(() => setShowLabel(false), 1200)}
      title={t(labelKey[filterId])}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: showLabel ? 5 : 0,
        padding: showLabel ? '6px 10px' : '6px 8px',
        background: active
          ? 'rgba(68, 102, 136, 0.35)'
          : hover
          ? 'rgba(30, 45, 65, 0.5)'
          : 'rgba(10, 15, 25, 0.3)',
        border: active
          ? '1px solid #446688'
          : '1px solid rgba(51, 68, 85, 0.4)',
        borderRadius: 16,
        color: active ? '#7bb8ff' : hover ? '#8899aa' : '#556677',
        fontFamily: 'monospace',
        fontSize: 10,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {FILTER_ICONS[filterId]}
      {showLabel && (
        <span style={{ letterSpacing: 0.3 }}>{t(labelKey[filterId])}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PlanetsCatalogV2
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

export function PlanetsCatalogV2({
  allSystems,
  aliases,
  onViewPlanet,
  colonyPlanetIds,
  colonySystemIds,
}: PlanetsCatalogV2Props) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Build flat list of { system, planet } pairs, sorted by distance from
  // nearest colony. Distance is computed once per system via useMemo.

  const systemDistances = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const sys of allSystems) {
      const result = nearestColonyDistance(sys.id, allSystems, colonySystemIds);
      map.set(sys.id, result ? result.ly : Infinity);
    }
    return map;
  }, [allSystems, colonySystemIds]);

  const sortedPairs = useMemo(() => {
    const pairs: { system: StarSystem; planet: Planet }[] = [];
    for (const sys of allSystems) {
      for (const p of sys.planets) {
        pairs.push({ system: sys, planet: p });
      }
    }
    pairs.sort((a, b) => {
      const dA = systemDistances.get(a.system.id) ?? Infinity;
      const dB = systemDistances.get(b.system.id) ?? Infinity;
      return dA - dB;
    });
    return pairs;
  }, [allSystems, systemDistances]);

  // Apply filters (AND logic)
  const filteredPairs = useMemo(() => {
    if (activeFilters.size === 0) return sortedPairs;
    return sortedPairs.filter(({ planet }) =>
      [...activeFilters].every((f) => passesFilter(planet, f, colonyPlanetIds)),
    );
  }, [sortedPairs, activeFilters, colonyPlanetIds]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilters]);

  const visiblePairs = filteredPairs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPairs.length;

  // IntersectionObserver lazy load
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const toggleFilter = useCallback((id: FilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleViewPlanet = useCallback(
    (system: StarSystem, planetId: string) => {
      onViewPlanet(system, planetId);
    },
    [onViewPlanet],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter chip bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          paddingBottom: 10,
          borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
        }}
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            filterId={f}
            active={activeFilters.has(f)}
            onToggle={toggleFilter}
          />
        ))}
      </div>

      {/* Count label */}
      <div style={{ fontSize: 10, color: '#445566', letterSpacing: 0.5 }}>
        {filteredPairs.length} / {sortedPairs.length}
      </div>

      {/* Planet grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {visiblePairs.map(({ system, planet }) => (
          <PlanetCard
            key={planet.id}
            planet={planet}
            systemName={aliases[system.id] ?? system.name}
            distanceLY={
              colonySystemIds.length > 0
                ? (systemDistances.get(system.id) ?? null)
                : null
            }
            onClick={() => handleViewPlanet(system, planet.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredPairs.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#445566',
            fontSize: 12,
            padding: '40px 0',
          }}
        >
          —
        </div>
      )}

      {/* Lazy load sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </div>
  );
}
