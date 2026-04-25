import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';
import type { PlanetTerraformState } from '@nebulife/core';
import { isTerraformable, nearestColonyDistance, getOverallProgress } from '@nebulife/core';

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
  /** Optional terraforming state per planet ID — used for filter value display. */
  terraformStates?: Record<string, PlanetTerraformState>;
  /** Optional surface navigation callback — opens surface for a planet. */
  onOpenSurface?: (system: StarSystem, planetId: string) => void;
  /** Optional favorites toggle callback. */
  onToggleFavorite?: (planetId: string) => void;
  /** Set of currently favorited planet IDs. */
  favoritePlanetIds?: Set<string>;
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
      return (
        planet.type === 'rocky' ||
        planet.type === 'terrestrial' ||
        planet.type === 'dwarf'
      );

    case 'isotopes':
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
// Get filter stat value string for a planet
// ---------------------------------------------------------------------------

function getFilterStatLabel(
  planet: Planet,
  filter: FilterId | null,
  tfState: PlanetTerraformState | undefined,
  t: (key: string) => string,
): string | null {
  if (!filter || filter === 'population') return null;
  switch (filter) {
    case 'terraform': {
      if (!tfState) return '—';
      const pct = Math.round(getOverallProgress(tfState));
      return `${pct}%`;
    }
    case 'minerals':
      return String(Math.round(planet.resources?.totalResources?.minerals ?? 0));
    case 'isotopes':
      return String(Math.round(planet.resources?.totalResources?.isotopes ?? 0));
    case 'water': {
      const pct = Math.round((planet.hydrosphere?.waterCoverageFraction ?? 0) * 100);
      return `${pct}%`;
    }
    case 'life':
      return planet.hasLife ? t('archive.filter_life_yes') : t('archive.filter_life_no');
    case 'volatiles': {
      const atm = planet.atmosphere?.surfacePressureAtm;
      return atm != null ? `${atm.toFixed(2)} atm` : '—';
    }
    default:
      return null;
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
  filterStat,
  isSelected,
  onClick,
}: {
  planet: Planet;
  systemName: string;
  distanceLY: number | null;
  filterStat: string | null;
  isSelected: boolean;
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

  const isActive = hover || isSelected;

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
        background: isActive
          ? 'rgba(30, 45, 65, 0.6)'
          : 'rgba(10, 15, 25, 0.3)',
        border: isSelected
          ? '1px solid #7bb8ff'
          : isActive
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
          color: isActive ? '#aabbcc' : '#8899aa',
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

      {/* Filter stat value — shown when a filter is active */}
      {filterStat !== null && (
        <div style={{
          fontSize: 9,
          color: '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          letterSpacing: 0.3,
        }}>
          {filterStat}
        </div>
      )}

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
// InlinePlanetMenu — small popup anchored below a card
// ---------------------------------------------------------------------------

function InlinePlanetMenu({
  planet,
  system,
  isFavorite,
  canGoToSurface,
  onViewDetail,
  onToggleFavorite,
  onOpenSurface,
  onClose,
}: {
  planet: Planet;
  system: StarSystem;
  isFavorite: boolean;
  canGoToSurface: boolean;
  onViewDetail: () => void;
  onToggleFavorite: () => void;
  onOpenSurface: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 4,
        zIndex: 40,
        background: 'rgba(10,15,25,0.97)',
        border: '1px solid #334455',
        borderRadius: 4,
        minWidth: 140,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onViewDetail(); onClose(); }}
        style={{
          display: 'block', width: '100%',
          padding: '8px 12px', background: 'none', border: 'none',
          color: '#aabbcc', fontFamily: 'monospace', fontSize: 11,
          textAlign: 'left', cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,102,136,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        {t('archive.planet_menu_view')}
      </button>
      <button
        onClick={() => { onToggleFavorite(); onClose(); }}
        style={{
          display: 'block', width: '100%',
          padding: '8px 12px', background: 'none', border: 'none',
          color: isFavorite ? '#7bb8ff' : '#8899aa', fontFamily: 'monospace', fontSize: 11,
          textAlign: 'left', cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(68,102,136,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        {isFavorite ? t('archive.planet_menu_unfavorite') : t('archive.planet_menu_favorite')}
      </button>
      <button
        onClick={() => { if (canGoToSurface) { onOpenSurface(); onClose(); } }}
        disabled={!canGoToSurface}
        style={{
          display: 'block', width: '100%',
          padding: '8px 12px', background: 'none', border: 'none',
          color: canGoToSurface ? '#8899aa' : '#445566',
          fontFamily: 'monospace', fontSize: 11,
          textAlign: 'left',
          cursor: canGoToSurface ? 'pointer' : 'not-allowed',
          transition: 'background 0.1s',
          opacity: canGoToSurface ? 1 : 0.5,
        }}
        onMouseEnter={(e) => { if (canGoToSurface) e.currentTarget.style.background = 'rgba(68,102,136,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        {t('nav.surface_btn')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetDetailStrip — inline detail shown below the grid for focused planet
// ---------------------------------------------------------------------------

function PlanetDetailStrip({
  planet,
  tfPct,
  distanceLY,
  onClose,
}: {
  planet: Planet;
  tfPct: number | null;
  distanceLY: number | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const hab = planet.habitability;
  const bars: Array<{ key: string; val: number; color: string }> = [
    { key: 'planet.hab_temp',   val: hab.temperature ?? 0, color: '#ff8844' },
    { key: 'planet.hab_atm',    val: hab.atmosphere ?? 0, color: '#55aaaa' },
    { key: 'planet.hab_water',  val: hab.water ?? 0, color: '#3b82f6' },
    { key: 'planet.hab_grav',   val: hab.gravity ?? 0, color: '#88aa44' },
    { key: 'planet.hab_rad',    val: hab.magneticField ?? 0, color: '#aa44aa' },
  ];

  const typeKey: Record<string, string> = {
    rocky: 'planet.rocky',
    terrestrial: 'planet.terrestrial',
    'gas-giant': 'planet.gas_giant',
    'ice-giant': 'planet.ice_giant',
    dwarf: 'planet.dwarf',
  };

  return (
    <div style={{
      background: 'rgba(10,15,28,0.95)',
      border: '1px solid #334455',
      borderRadius: 4,
      padding: '12px 14px',
      fontFamily: 'monospace',
      marginTop: 10,
      position: 'relative',
    }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none',
          color: '#556677', fontFamily: 'monospace', fontSize: 12,
          cursor: 'pointer', padding: '2px 6px',
          lineHeight: 1,
        }}
      >
        x
      </button>

      {/* Planet name + type */}
      <div style={{ fontSize: 12, color: '#aabbcc', marginBottom: 6, fontWeight: 600 }}>
        {planet.name}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#667788' }}>
          {t(typeKey[planet.type] ?? planet.type)}
        </span>
        {distanceLY !== null && (
          <span style={{ fontSize: 10, color: '#4488aa' }}>
            {t('archive.distance_ly', { ly: distanceLY.toFixed(1) })}
          </span>
        )}
        {tfPct !== null && (
          <span style={{ fontSize: 10, color: '#44ff88' }}>
            {t('archive.tf_pct', { pct: tfPct })}
          </span>
        )}
      </div>

      {/* Habitability bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {bars.map(({ key, val, color }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#556677', width: 60, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t(key)}
            </span>
            <div style={{
              flex: 1, height: 5,
              background: 'rgba(5,10,20,0.8)',
              border: '1px solid rgba(51,68,85,0.5)',
              borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, val * 100))}%`,
                height: '100%',
                background: color,
              }} />
            </div>
            <span style={{ fontSize: 9, color: '#667788', width: 30, textAlign: 'right', flexShrink: 0 }}>
              {Math.round(val * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
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
  terraformStates,
  onOpenSurface,
  onToggleFavorite,
  favoritePlanetIds,
}: PlanetsCatalogV2Props) {
  // Single-select filter: null = no filter active
  const [selectedFilter, setSelectedFilter] = useState<FilterId | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Focused planet — drives inline mini-menu and detail strip
  const [focusedPlanetId, setFocusedPlanetId] = useState<string | null>(null);
  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);

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

  // Apply single filter
  const filteredPairs = useMemo(() => {
    if (selectedFilter === null) return sortedPairs;
    return sortedPairs.filter(({ planet }) =>
      passesFilter(planet, selectedFilter, colonyPlanetIds),
    );
  }, [sortedPairs, selectedFilter, colonyPlanetIds]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedFilter]);

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

  // Single-select toggle: click active → deselect; click other → switch
  const toggleFilter = useCallback((id: FilterId) => {
    setSelectedFilter((prev) => (prev === id ? null : id));
  }, []);

  const { t } = useTranslation();

  // Close mini-menu when clicking outside any card
  const handleGridClick = useCallback(() => {
    setMenuOpenForId(null);
  }, []);

  // Find focused pair for the detail strip
  const focusedPair = useMemo(() => {
    if (!focusedPlanetId) return null;
    return sortedPairs.find((p) => p.planet.id === focusedPlanetId) ?? null;
  }, [focusedPlanetId, sortedPairs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter chip bar — single-select */}
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
            active={selectedFilter === f}
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
        onClick={handleGridClick}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {visiblePairs.map(({ system, planet }) => {
          const tfState = terraformStates?.[planet.id];
          const filterStat = getFilterStatLabel(planet, selectedFilter, tfState, t as (key: string) => string);
          const distLY = colonySystemIds.length > 0
            ? (systemDistances.get(system.id) ?? null)
            : null;
          const isFavorite = favoritePlanetIds?.has(planet.id) ?? false;
          const isSelected = focusedPlanetId === planet.id;
          const menuOpen = menuOpenForId === planet.id;
          const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
          const canGoToSurface = isSurfacePlanet && !!onOpenSurface;
          const tfPct = tfState ? Math.round(getOverallProgress(tfState)) : null;

          return (
            <div
              key={planet.id}
              style={{ position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <PlanetCard
                planet={planet}
                systemName={aliases[system.id] ?? system.name}
                distanceLY={distLY}
                filterStat={filterStat}
                isSelected={isSelected}
                onClick={() => {
                  if (focusedPlanetId === planet.id) {
                    // Second click on same card: toggle mini-menu
                    setMenuOpenForId((prev) => (prev === planet.id ? null : planet.id));
                  } else {
                    // First click: focus the card + open menu
                    setFocusedPlanetId(planet.id);
                    setMenuOpenForId(planet.id);
                  }
                }}
              />
              {menuOpen && (
                <InlinePlanetMenu
                  planet={planet}
                  system={system}
                  isFavorite={isFavorite}
                  canGoToSurface={canGoToSurface}
                  onViewDetail={() => onViewPlanet(system, planet.id)}
                  onToggleFavorite={() => onToggleFavorite?.(planet.id)}
                  onOpenSurface={() => onOpenSurface?.(system, planet.id)}
                  onClose={() => setMenuOpenForId(null)}
                />
              )}
            </div>
          );
        })}
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
          {'\u2014'}
        </div>
      )}

      {/* Lazy load sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      {/* Inline detail strip — shown for the focused planet */}
      {focusedPair && (
        <PlanetDetailStrip
          planet={focusedPair.planet}
          tfPct={(() => {
            const tf = terraformStates?.[focusedPair.planet.id];
            return tf ? Math.round(getOverallProgress(tf)) : null;
          })()}
          distanceLY={
            colonySystemIds.length > 0
              ? (systemDistances.get(focusedPair.system.id) ?? null)
              : null
          }
          onClose={() => {
            setFocusedPlanetId(null);
            setMenuOpenForId(null);
          }}
        />
      )}
    </div>
  );
}
