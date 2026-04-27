import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet, PlanetResourceStocks } from '@nebulife/core';
import type { PlanetTerraformState, TerraformParamId, TechTreeState } from '@nebulife/core';
import {
  isTerraformable,
  nearestColonyDistance,
  getOverallProgress,
  canStartParam,
  computeParamRequirement,
  tierForBuildings,
  generatePlanetStocks,
} from '@nebulife/core';
import type { ColonyResources } from '../Terraform/MissionDispatchModal.js';
import type { PlacedBuilding } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS } from '../ResourceIcon.js';

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
  /** Per-planet resource getter — used by the detail panel stock rows. */
  getPlanetResources?: (planetId: string) => ColonyResources;
  /**
   * Opens MissionDispatchModal for the given target planet + paramId.
   * Parent (CosmicArchive → App) should close catalog and wire onStartParam.
   */
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
  /** Manually trigger terraform completion for a planet that has reached >=95%. */
  onCompleteTerraform?: (planet: Planet) => void;
  /** Colony planets that can act as donors (for dispatch-gate check). */
  donorPlanets?: Planet[];
  /** Tech tree state for canStartParam gate checks. */
  techTreeState?: TechTreeState;
  /** Current buildings on the active colony surface (for ship-tier check). */
  colonyBuildings?: PlacedBuilding[];
  /** Callback to rename a planet (inline edit). Saved in planetOverrides. */
  onRenamePlanet?: (planetId: string, newName: string) => void;
  /**
   * Finite planet resource stocks (v168).
   * When provided, the detail panel shows stock units rather than colony inventory.
   */
  planetResourceStocks?: Record<string, PlanetResourceStocks>;
}

// ---------------------------------------------------------------------------
// Realistic planet color based on physical parameters
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// isEarthLike — terrestrial with significant water → uniform ocean+land look
// ---------------------------------------------------------------------------

function isEarthLike(planet: Planet): boolean {
  if (planet.isHomePlanet) return true;
  if (planet.type !== 'terrestrial') return false;
  const water = planet.hydrosphere?.waterCoverageFraction ?? (planet.habitability?.water ?? 0);
  return water > 0.3;
}

function getRealisticPlanetColor(planet: Planet): string {
  if (planet.isHomePlanet) return '#44ff88';

  // Earth-like planets use a fixed teal-blue tone (rendered with special SVG)
  if (isEarthLike(planet)) return '#2266aa';

  const tempK = planet.surfaceTempK ?? 300;
  const water = planet.hydrosphere?.waterCoverageFraction ?? (planet.habitability?.water ?? 0);
  const atmoP = planet.atmosphere?.surfacePressureAtm ?? 0;

  // Gas giants — from PlanetVisuals palette (seed-based bucket via simple modulo)
  if (planet.type === 'gas-giant') {
    if (tempK > 1000) {
      // hot gas giant — red/orange
      const reds = ['#cc5522', '#dd6633', '#ff8844', '#aa3322'];
      return reds[Math.abs(planet.seed ?? 0) % reds.length];
    }
    if (tempK > 400) {
      // warm gas giant — tan/amber
      const warms = ['#cc9955', '#ddbb77', '#eebb88', '#ccaa77'];
      return warms[Math.abs(planet.seed ?? 0) % warms.length];
    }
    // cold gas giant — brown/butterscotch
    const colds = ['#aa8855', '#ccaa77', '#998866', '#bb9977'];
    return colds[Math.abs(planet.seed ?? 0) % colds.length];
  }

  // Ice giants — blue/teal
  if (planet.type === 'ice-giant') {
    if (tempK > 200) {
      const teals = ['#5588aa', '#66aabb', '#77aacc', '#4488aa'];
      return teals[Math.abs(planet.seed ?? 0) % teals.length];
    }
    const navies = ['#3366aa', '#4477bb', '#2255aa', '#5577cc'];
    return navies[Math.abs(planet.seed ?? 0) % navies.length];
  }

  // Terrestrial / rocky / dwarf
  // Water coverage adds blue tones
  const waterFrac = Math.min(1, water);
  // Temperature: hot → reddish/yellow, cold → blue-gray, temperate → neutral
  const co2 = planet.atmosphere?.composition?.['CO2'] ?? 0;
  const isVenusLike = co2 > 0.5 && atmoP > 10;

  if (isVenusLike) return '#ccaa44'; // Venus-like: opaque yellow cloud cover

  if (tempK > 1200) return '#664422'; // lava world (never pure black)
  if (tempK > 600) return '#8a5533';  // scorched red-brown

  // Life-bearing terrestrial with significant water
  if (planet.hasLife && waterFrac > 0.3 && (planet.type === 'terrestrial' || planet.type === 'rocky')) {
    // Mix blue (water) with green (life)
    const b = Math.round(80 + waterFrac * 80);
    const g = Math.round(120 + Math.min(70, waterFrac * 55));
    return `rgb(40,${g},${b})`;
  }

  // Icy/frozen worlds
  if (tempK < 200) return '#6699bb';  // frozen — blue-gray
  if (tempK < 250) {
    // cold rocky with some ice
    const iceBlend = (250 - tempK) / 50;
    const r = Math.round(80 + (1 - iceBlend) * 40);
    const g = Math.round(115 + (1 - iceBlend) * 20);
    const b = Math.round(160 + iceBlend * 25);
    return `rgb(${r},${g},${b})`;
  }

  // Water-rich worlds (without life)
  if (waterFrac > 0.6) return '#2255aa'; // ocean world — deep blue
  if (waterFrac > 0.2) {
    // mix blue/brown
    const b = Math.round(80 + waterFrac * 80);
    return `rgb(70,${Math.round(95 + waterFrac * 35)},${b})`;
  }

  // Dry rocky worlds — temperature-based
  if (tempK > 373) return '#bb7733';  // warm desert
  if (tempK > 273) {
    // temperate rock — gray-brown with atmosphere tint
    const atmosBoost = atmoP > 0.5 ? 10 : 0;
    return `rgb(${110 + atmosBoost},${100 + atmosBoost},${88})`;
  }

  // Dwarf — pale, low color saturation
  if (planet.type === 'dwarf') return '#aaaa99';

  // Type-based fallbacks — NEVER return near-black
  if (planet.type === 'rocky') return '#888777';
  if (planet.type === 'terrestrial') return '#5588aa';

  return '#888777'; // default neutral (was #887766 — slightly warmer now)
}

// Keep old function for backward compat — now delegates to realistic version
function getPlanetBodyColor(planet: Planet): string {
  return getRealisticPlanetColor(planet);
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
  planetResourceStocks?: Record<string, PlanetResourceStocks>,
  colonyPlanetIds?: Set<string>,
): string | null {
  if (!filter) return null;
  switch (filter) {
    case 'terraform': {
      // Cap: if difficulty > 0.85 (and planet is terraformable), it's impossible
      const isTooHard = isTerraformable(planet) && (planet.terraformDifficulty ?? 0) > 0.85;
      if (!isTerraformable(planet) || isTooHard) return null;
      if (!tfState) {
        // Show native difficulty if no active state
        const pct = Math.round((planet.terraformDifficulty ?? 0) * 100);
        return `${pct}%`;
      }
      const pct = Math.round(getOverallProgress(tfState));
      return `${pct}%`;
    }
    case 'minerals':
    case 'isotopes':
    case 'water':
    case 'volatiles': {
      const stocks = planetResourceStocks?.[planet.id]?.remaining
        ?? generatePlanetStocks(planet).initial;
      return formatK(Math.round(stocks[filter]), t('format.k'), t('format.kk'));
    }
    case 'life':
      return planet.hasLife ? t('archive.filter_life_yes') : t('archive.filter_life_no');
    case 'population': {
      if (!colonyPlanetIds?.has(planet.id)) return '\u2014';
      // Base colony population; detailed building-based calc not available here
      const BASE_POP = 5000;
      return formatK(BASE_POP, t('format.k'), t('format.kk'));
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Terraform param order (same as TerraformPanel)
// ---------------------------------------------------------------------------

const PARAM_ORDER: TerraformParamId[] = [
  'magneticField',
  'atmosphere',
  'ozone',
  'temperature',
  'pressure',
  'water',
];

function primaryResourceForParam(
  paramId: TerraformParamId,
): 'minerals' | 'volatiles' | 'isotopes' | 'water' {
  switch (paramId) {
    case 'magneticField': return 'isotopes';
    case 'atmosphere':    return 'volatiles';
    case 'ozone':         return 'volatiles';
    case 'temperature':   return 'minerals';
    case 'pressure':      return 'volatiles';
    case 'water':         return 'water';
  }
}

// ---------------------------------------------------------------------------
// Inject glow + pulse keyframe once
// ---------------------------------------------------------------------------

const GLOW_STYLE_ID = 'nebulife-catalog-glow-v2';
if (typeof document !== 'undefined' && !document.getElementById(GLOW_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = GLOW_STYLE_ID;
  s.textContent = `
    @keyframes nebucatalog-glow {
      0%, 100% { box-shadow: 0 0 4px rgba(68,136,170,0.3); }
      50%       { box-shadow: 0 0 10px rgba(68,136,170,0.7); }
    }
    @keyframes nebucatalog-focus-pulse {
      0%, 100% { box-shadow: 0 0 16px 4px rgba(68,136,255,0.55); }
      50%       { box-shadow: 0 0 24px 8px rgba(68,136,255,0.75); }
    }
    @keyframes nebucatalog-panel-in {
      from { max-height: 0; opacity: 0; }
      to   { max-height: 2000px; opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// Cargo-ship SVG icon (16×16)
// ---------------------------------------------------------------------------

function CargoShipIcon({ color = '#7bb8ff' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,2 14,12 2,12" />
      <line x1="5" y1="12" x2="5" y2="14" />
      <line x1="11" y1="12" x2="11" y2="14" />
      <line x1="8" y1="6" x2="8" y2="10" />
    </svg>
  );
}

// Resource icons are now provided by shared ResourceIcon component (../ResourceIcon)

// ---------------------------------------------------------------------------
// PlanetCard — single grid cell (frameless, circle only)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// EarthLikePlanetSVG — fixed ocean+continent look for all earth-like planets
// ---------------------------------------------------------------------------

function EarthLikePlanetSVG({ r, cx, cy, planetId }: { r: number; cx: number; cy: number; planetId: string }) {
  const clipId = `el-clip-${planetId}`;
  const gradId = `el-grad-${planetId}`;
  // Scale continent paths relative to r (designed at r=24)
  const s = r / 24;
  const tx = cx - 24 * s;
  const ty = cy - 24 * s;
  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#3399cc" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#1a5f8a" stopOpacity="1" />
          <stop offset="100%" stopColor="#0d3355" stopOpacity="1" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {/* Ocean base */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
      {/* Continent shapes — simple fixed paths scaled */}
      <g clipPath={`url(#${clipId})`} transform={`translate(${tx},${ty}) scale(${s})`}>
        {/* Main continent */}
        <path d="M20 18 L28 14 L34 16 L36 22 L32 28 L26 30 L20 26 Z" fill="#4a7a44" fillOpacity="0.75" />
        {/* Second land mass */}
        <path d="M30 32 L36 30 L40 34 L38 40 L32 40 L28 36 Z" fill="#5a8a50" fillOpacity="0.7" />
        {/* Small island */}
        <path d="M14 30 L18 28 L20 32 L16 34 Z" fill="#4a7a44" fillOpacity="0.65" />
        {/* North ice cap hint */}
        <path d="M18 8 L30 8 L32 12 L28 14 L20 14 L16 12 Z" fill="#cce8f0" fillOpacity="0.35" />
      </g>
      {/* Atmosphere glow */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#5599cc" strokeWidth="1" strokeOpacity="0.5" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// k/kk number formatting helper
// ---------------------------------------------------------------------------

function formatK(n: number, suffix_k: string, suffix_kk: string): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return v < 10 ? `${v.toFixed(1)}${suffix_kk}` : `${Math.floor(v)}${suffix_kk}`;
  }
  if (abs >= 1_000) {
    return `${Math.floor(n / 1_000)}${suffix_k}`;
  }
  return String(Math.round(n));
}

// ---------------------------------------------------------------------------
// PlanetCard — single grid cell (frameless, circle only)
// ---------------------------------------------------------------------------

function PlanetCard({
  planet,
  filterStat,
  activeFilter,
  isSelected,
  isFavorite,
  onClick,
}: {
  planet: Planet;
  filterStat: string | null;
  activeFilter: FilterId | null;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);

  const color = getPlanetBodyColor(planet);
  const earthLike = isEarthLike(planet);

  // Continuous size map: 36-72px diameter based on radiusEarth
  // Gas/ice giants tend to be >3x Earth so they get max size
  const diameter = Math.round(36 + Math.min(planet.radiusEarth, 2.5) * 14);
  const cx = 36;
  const cy = 36;
  const r = diameter / 2;

  const hasRings =
    planet.type === 'gas-giant' ||
    planet.type === 'ice-giant' ||
    (planet.moons && planet.moons.length >= 3);

  // Sub-label: for terraform filter show difficulty or "impossible";
  // for other active filters show filter stat value; otherwise nothing.
  const isTooHardToTerraform = isTerraformable(planet) && (planet.terraformDifficulty ?? 0) > 0.85;
  const terraformNotPossible = !isTerraformable(planet) || isTooHardToTerraform;
  const isTerraformFilter = activeFilter === 'terraform';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={planet.name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '6px 2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'monospace',
      }}
    >
      {/* Circle wrapper — glow goes here */}
      <div
        style={{
          borderRadius: '50%',
          width: 72,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isSelected
            ? 'nebucatalog-focus-pulse 1.8s ease-in-out infinite'
            : hover
            ? 'nebucatalog-glow 1.2s ease-in-out infinite'
            : 'none',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* SVG planet representation */}
        <svg width="72" height="72" viewBox="0 0 72 72">
          {/* Ring (behind planet) */}
          {hasRings && (
            <ellipse
              cx={cx}
              cy={cy}
              rx={r * 1.9}
              ry={r * 0.38}
              fill="none"
              stroke={`${color}99`}
              strokeWidth="1.5"
            />
          )}
          {/* Planet body */}
          {earthLike ? (
            <EarthLikePlanetSVG r={r} cx={cx} cy={cy} planetId={planet.id} />
          ) : (
            <>
              <defs>
                <radialGradient
                  id={`pg-${planet.id}`}
                  cx="35%"
                  cy="35%"
                  r="60%"
                >
                  <stop offset="0%" stopColor={`${color}dd`} />
                  <stop offset="100%" stopColor={`${color}aa`} />
                </radialGradient>
              </defs>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={`url(#pg-${planet.id})`}
                stroke={`${color}bb`}
                strokeWidth="1"
              />
            </>
          )}
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
      </div>

      {/* Sub-label: only shown when terraform filter active or non-null filterStat */}
      {isTerraformFilter ? (
        <div style={{
          fontSize: 9,
          color: terraformNotPossible ? '#556677' : '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          letterSpacing: 0.3,
          maxWidth: 72,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {terraformNotPossible ? t('archive.terraform_impossible') : (filterStat ?? '')}
        </div>
      ) : filterStat !== null ? (
        <div style={{
          fontSize: 9,
          color: '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          letterSpacing: 0.3,
        }}>
          {filterStat}
        </div>
      ) : null}
      {/* Planet name — only for pinned/favorite planets */}
      {isFavorite && (
        <div style={{
          fontSize: 8,
          color: '#7bb8ff',
          textAlign: 'center',
          fontFamily: 'monospace',
          maxWidth: 72,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: 0.2,
          marginTop: 1,
        }}>
          {planet.name}
        </div>
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
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(-60 8 8)" />
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
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="9" r="3" />
      <circle cx="10" cy="8" r="3.5" />
      <circle cx="8" cy="6" r="2.5" />
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
// Terraform param row (progress bar + dispatch button) inside detail panel
// ---------------------------------------------------------------------------

function TerraformParamDetailRow({
  paramId,
  planet,
  terraformState,
  donorPlanets,
  techTreeState,
  shipTier,
  getPlanetResources,
  onSendTerraformDelivery,
}: {
  paramId: TerraformParamId;
  planet: Planet;
  terraformState: PlanetTerraformState;
  donorPlanets: Planet[];
  techTreeState: TechTreeState | undefined;
  shipTier: number;
  getPlanetResources?: (planetId: string) => ColonyResources;
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
}) {
  const { t } = useTranslation();

  const paramState = terraformState.params[paramId];
  const progress = paramState?.progress ?? 0;
  const pct = Math.round(progress);
  const resource = primaryResourceForParam(paramId);

  // Compute requirement & delivered amounts
  const requirement = useMemo(() => {
    try {
      const cost = computeParamRequirement(planet, paramId, progress);
      return (cost as Record<string, number | undefined>)[resource] ?? 0;
    } catch {
      return 0;
    }
  }, [planet, paramId, progress, resource]);

  const delivered = requirement > 0
    ? Math.round((progress / 100) * requirement)
    : 0;

  // Gate check
  const hasGenesisVault = false; // catalog doesn't have genesis vault context — safe default
  const gate = useMemo(() => {
    if (!techTreeState) return { allowed: true, reason: null };
    try {
      return canStartParam(terraformState, paramId, hasGenesisVault, planet, techTreeState);
    } catch {
      return { allowed: true, reason: null };
    }
  }, [terraformState, paramId, planet, techTreeState]);

  const hasDonors = donorPlanets.length > 0;
  const hasShip = shipTier >= 1;

  // Check resource availability on any donor
  const hasEnoughResource = useMemo(() => {
    if (!getPlanetResources || donorPlanets.length === 0) return false;
    return donorPlanets.some((d) => {
      const res = getPlanetResources(d.id);
      return res[resource] > 0;
    });
  }, [donorPlanets, getPlanetResources, resource]);

  // Derive disabled tooltip
  let disabledReason = '';
  let canDispatch = false;

  if (!hasShip) {
    disabledReason = t('planets_catalog.disabled_no_ship');
  } else if (!hasDonors) {
    disabledReason = t('planets_catalog.disabled_no_ship');
  } else if (!gate.allowed) {
    const reason = gate.reason ?? '';
    if (reason.startsWith('tech_required:')) {
      disabledReason = t('planets_catalog.disabled_need_tech', { tech: reason.slice('tech_required:'.length) });
    } else if (reason.startsWith('level_required:')) {
      disabledReason = t('planets_catalog.disabled_need_level', { level: reason.slice('level_required:'.length) });
    } else if (reason === 'need_building') {
      disabledReason = t('planets_catalog.disabled_need_building');
    } else {
      disabledReason = reason;
    }
  } else if (!hasEnoughResource) {
    disabledReason = t('planets_catalog.disabled_no_resources');
  } else {
    canDispatch = true;
  }

  // Bar color
  const barColor = pct >= 95 ? '#44ff88' : pct >= 50 ? '#7bb8ff' : '#446688';

  const paramLabelKey = `terraform.param_full.${paramId}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '6px 0',
      borderBottom: '1px solid rgba(50,65,85,0.3)',
    }}>
      {/* Param name + button row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontSize: 10,
          color: '#8899aa',
          flex: 1,
          minWidth: 0,
          fontFamily: 'monospace',
        }}>
          {t(paramLabelKey, { defaultValue: t(`terraform.param.${paramId}`, { defaultValue: paramId }) })}
        </span>

        {/* Dispatch button */}
        <button
          disabled={!canDispatch}
          title={disabledReason || undefined}
          onClick={() => {
            if (canDispatch && onSendTerraformDelivery) {
              onSendTerraformDelivery(planet, paramId);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            minHeight: 28,
            minWidth: 44,
            background: canDispatch ? 'rgba(40,70,100,0.7)' : 'rgba(20,30,45,0.4)',
            border: `1px solid ${canDispatch ? '#446688' : '#223344'}`,
            borderRadius: 3,
            color: canDispatch ? '#7bb8ff' : '#334455',
            fontFamily: 'monospace',
            fontSize: 9,
            cursor: canDispatch ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          <CargoShipIcon color={canDispatch ? '#7bb8ff' : '#334455'} />
          {t('planets_catalog.btn_send')}
        </button>
      </div>

      {/* Progress bar with overlay text */}
      <div style={{
        position: 'relative',
        height: 18,
        background: 'rgba(5,10,20,0.8)',
        border: '1px solid rgba(51,68,85,0.4)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${barColor}44, ${barColor}88)`,
          transition: 'width 0.4s ease',
        }} />
        {/* Overlay text: delivered / required resource */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          fontSize: 9,
          fontFamily: 'monospace',
          color: '#aabbcc',
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#8899aa' }}>
            {requirement > 0
              ? `${delivered.toLocaleString()} / ${Math.ceil(requirement).toLocaleString()} ${resource}`
              : `${pct}%`}
          </span>
          <span style={{ color: pct >= 95 ? '#44ff88' : pct >= 50 ? '#7bb8ff' : '#8899aa' }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Disabled reason hint */}
      {!canDispatch && disabledReason && (
        <div style={{ fontSize: 8, color: '#cc8844', letterSpacing: 0.3, paddingLeft: 2 }}>
          {disabledReason}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlinePlanetMenu — small popup anchored below a card (kept for compat)
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
// ExpandedDetailPanel — full-width inline panel that slides down below a row
// ---------------------------------------------------------------------------

interface ExpandedDetailPanelProps {
  planet: Planet;
  system: StarSystem;
  distanceLY: number | null;
  tfState: PlanetTerraformState | undefined;
  colonyPlanetIds: Set<string>;
  donorPlanets: Planet[];
  techTreeState: TechTreeState | undefined;
  shipTier: number;
  getPlanetResources?: (planetId: string) => ColonyResources;
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
  onCompleteTerraform?: (planet: Planet) => void;
  /** Callback when user saves a custom name for the planet */
  onRenamePlanet?: (planetId: string, newName: string) => void;
  /** Callback to toggle pin/favorite for a planet */
  onToggleFavorite?: (planetId: string) => void;
  /** Whether this planet is currently pinned/favorited */
  isFavorite?: boolean;
  /** Callback to open the planet detail view */
  onViewPlanet?: (system: StarSystem, planetId: string) => void;
  onClose: () => void;
  /** Finite planet resource stocks for displaying remaining deposit units (v168). */
  planetResourceStocks?: Record<string, PlanetResourceStocks>;
}

function ExpandedDetailPanel({
  planet,
  system,
  distanceLY,
  tfState,
  colonyPlanetIds,
  donorPlanets,
  techTreeState,
  shipTier,
  getPlanetResources,
  onSendTerraformDelivery,
  onCompleteTerraform,
  onRenamePlanet,
  onToggleFavorite,
  isFavorite = false,
  onViewPlanet,
  onClose,
  planetResourceStocks,
}: ExpandedDetailPanelProps) {
  const { t } = useTranslation();

  // Inline rename state
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(planet.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== planet.name) {
      onRenamePlanet?.(planet.id, trimmed);
    }
    setRenaming(false);
  }, [renameValue, planet.id, planet.name, onRenamePlanet]);

  const overallPct = tfState ? Math.round(getOverallProgress(tfState)) : 0;
  const showTerraformSection = isTerraformable(planet) && !!tfState;
  const showCompleteButton = showTerraformSection && overallPct >= 95;

  // Resource stocks — prefer finite planet stocks (v168); fall back to colony inventory
  const stocksForDisplay: { minerals: number; volatiles: number; isotopes: number; water: number } | null = useMemo(() => {
    if (planetResourceStocks) {
      const s = planetResourceStocks[planet.id];
      if (s) return s.remaining;
      // No tracked stocks yet — generate initial values deterministically
      return generatePlanetStocks(planet).initial;
    }
    // Fallback: use colony inventory (legacy path)
    if (getPlanetResources) return getPlanetResources(planet.id);
    return null;
  }, [planet, planetResourceStocks, getPlanetResources]);
  const planetStocks = stocksForDisplay;

  const typeKey: Record<string, string> = {
    rocky: 'planet.rocky',
    terrestrial: 'planet.terrestrial',
    'gas-giant': 'planet.gas_giant',
    'ice-giant': 'planet.ice_giant',
    dwarf: 'planet.dwarf',
  };
  const typeLabel = t(typeKey[planet.type] ?? planet.type);

  const lyNum = distanceLY ?? 0;
  const pcNum = lyNum * 0.30660;

  // Small planet circle color for the header
  const planetColor = getPlanetBodyColor(planet);

  // Info grid: left column = gravity, moons; right column = other params (no Colony field)
  const leftFields: Array<{ label: string; value: string }> = [
    { label: t('planets_catalog.field_gravity'), value: `${planet.surfaceGravityG.toFixed(2)} g` },
    { label: t('planets_catalog.field_moons'), value: String(planet.moons.length) },
  ];
  const rightFields: Array<{ label: string; value: string }> = [
    { label: t('planets_catalog.field_size'), value: `${planet.radiusEarth.toFixed(2)} R\u2295` },
    {
      label: t('planets_catalog.field_hydro'),
      value: planet.hydrosphere
        ? `${Math.round(planet.hydrosphere.waterCoverageFraction * 100)}%`
        : '\u2014',
    },
    {
      label: t('planets_catalog.field_distance_short'),
      value: distanceLY !== null
        ? `${lyNum.toFixed(1)} LY / ${pcNum.toFixed(2)} pc`
        : '\u2014',
    },
  ];

  return (
    <div style={{
      gridColumn: '1 / -1',
      background: 'rgba(8,14,26,0.97)',
      border: '1px solid #334455',
      borderRadius: 4,
      fontFamily: 'monospace',
      overflow: 'hidden',
      animation: 'nebucatalog-panel-in 0.25s ease-out both',
      // Fits screen width
      maxWidth: 'calc(100vw - 32px)',
      boxSizing: 'border-box',
    }}>
      {/* 1. Header: [planet 48px] | [name + type] | [pencil] [pin] [eye] | [X close] */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderBottom: '1px solid rgba(51,68,85,0.4)',
      }}>
        {/* Mini planet circle */}
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          {isEarthLike(planet) ? (
            <EarthLikePlanetSVG r={20} cx={24} cy={24} planetId={`hdr-${planet.id}`} />
          ) : (
            <>
              <defs>
                <radialGradient id={`hdr-${planet.id}`} cx="35%" cy="35%" r="60%">
                  <stop offset="0%" stopColor={`${planetColor}cc`} />
                  <stop offset="100%" stopColor={`${planetColor}66`} />
                </radialGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill={`url(#hdr-${planet.id})`} stroke={`${planetColor}88`} strokeWidth="1" />
            </>
          )}
          {planet.isHomePlanet && (
            <circle cx="24" cy="24" r="23" fill="none" stroke="#44ff88" strokeWidth="1.2" strokeDasharray="3 3" />
          )}
        </svg>

        {/* Name + type (second line) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenaming(false); setRenameValue(planet.name); }
              }}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#ccddee',
                background: 'rgba(10,20,35,0.9)',
                border: '1px solid #446688',
                borderRadius: 3,
                padding: '2px 6px',
                outline: 'none',
                width: '100%',
                maxWidth: 200,
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: '#ccddee', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {planet.name}
            </div>
          )}
          <div style={{ fontSize: 9, color: '#667788', marginTop: 2, letterSpacing: '0.05em' }}>
            {typeLabel}
          </div>
        </div>

        {/* Action buttons: pencil / pin / eye */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {onRenamePlanet && !renaming && (
            <button
              onClick={() => { setRenameValue(planet.name); setRenaming(true); }}
              title={t('planets_catalog.rename_title')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, opacity: 0.45, transition: 'opacity 0.15s',
                lineHeight: 0, flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#aabbcc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2 L14 5 L5 14 L2 14 L2 11 Z" />
                <line x1="9" y1="4" x2="12" y2="7" />
              </svg>
            </button>
          )}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(planet.id)}
              title={isFavorite ? t('archive.unpin') : t('archive.pin')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, opacity: isFavorite ? 1 : 0.4,
                transition: 'opacity 0.15s', lineHeight: 0, flexShrink: 0,
                color: isFavorite ? '#7bb8ff' : '#aabbcc',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isFavorite ? '1' : '0.4'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill={isFavorite ? '#7bb8ff' : 'none'}
                stroke={isFavorite ? '#7bb8ff' : '#aabbcc'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2 L10 6 L14 6.5 L11 9.5 L11.8 14 L8 12 L4.2 14 L5 9.5 L2 6.5 L6 6 Z" />
              </svg>
            </button>
          )}
          {onViewPlanet && (
            <button
              onClick={() => { onViewPlanet(system, planet.id); onClose(); }}
              title={t('archive.planet_menu_view')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, opacity: 0.45, transition: 'opacity 0.15s',
                lineHeight: 0, flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#aabbcc" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 8 C3 4 13 4 15 8 C13 12 3 12 1 8 Z" />
                <circle cx="8" cy="8" r="2.5" />
              </svg>
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#556677',
            fontFamily: 'monospace',
            fontSize: 13,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 2. Terraform param list */}
        {showTerraformSection && tfState && (
          <div>
            <div style={{
              fontSize: 8,
              color: '#445566',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              {t('planets_catalog.tf_section_title')}
            </div>
            {PARAM_ORDER.map((paramId) => (
              <TerraformParamDetailRow
                key={paramId}
                paramId={paramId}
                planet={planet}
                terraformState={tfState}
                donorPlanets={donorPlanets}
                techTreeState={techTreeState}
                shipTier={shipTier}
                getPlanetResources={getPlanetResources}
                onSendTerraformDelivery={onSendTerraformDelivery}
              />
            ))}
          </div>
        )}

        {/* 3. Resource stocks — icon + value only, no title/header */}
        {planetStocks && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="minerals" size={12} />
              <span style={{ color: RESOURCE_COLORS.minerals }}>{formatK(Math.round(planetStocks.minerals), t('format.k'), t('format.kk'))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="volatiles" size={12} />
              <span style={{ color: RESOURCE_COLORS.volatiles }}>{formatK(Math.round(planetStocks.volatiles), t('format.k'), t('format.kk'))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="isotopes" size={12} />
              <span style={{ color: RESOURCE_COLORS.isotopes }}>{formatK(Math.round(planetStocks.isotopes), t('format.k'), t('format.kk'))}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8899aa' }}>
              <ResourceIcon type="water" size={12} />
              <span style={{ color: RESOURCE_COLORS.water }}>{formatK(Math.round(planetStocks.water), t('format.k'), t('format.kk'))}</span>
            </div>
          </div>
        )}

        {/* 4b. Info grid — 2 columns: left = gravity+moons; right = size+hydro+distance */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px 12px',
        }}>
          {/* Left column */}
          <div>
            {leftFields.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(40,55,75,0.25)', padding: '3px 0' }}>
                <span style={{ fontSize: 9, color: '#445566' }}>{label}</span>
                <span style={{ fontSize: 9, color: '#8899aa' }}>{value}</span>
              </div>
            ))}
          </div>
          {/* Right column */}
          <div>
            {rightFields.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(40,55,75,0.25)', padding: '3px 0' }}>
                <span style={{ fontSize: 9, color: '#445566' }}>{label}</span>
                <span style={{ fontSize: 9, color: '#8899aa', textAlign: 'right', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Final terraform button — only if >=95% */}
        {showCompleteButton && (
          <button
            onClick={() => onCompleteTerraform?.(planet)}
            style={{
              padding: '10px 20px',
              background: 'rgba(30,80,50,0.8)',
              border: '1px solid #44ff88',
              borderRadius: 4,
              color: '#44ff88',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'center',
              minHeight: 44,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,100,60,0.9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,80,50,0.8)'; }}
          >
            {t('planets_catalog.btn_terraform_complete')}
          </button>
        )}
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
  getPlanetResources,
  onSendTerraformDelivery,
  onCompleteTerraform,
  donorPlanets = [],
  techTreeState,
  colonyBuildings = [],
  onRenamePlanet,
  planetResourceStocks,
}: PlanetsCatalogV2Props) {
  // Single-select filter: null = no filter active
  const [selectedFilter, setSelectedFilter] = useState<FilterId | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Focused planet — drives inline expanded detail panel
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
      // Pinned/favorite planets always first
      const aPin = favoritePlanetIds?.has(a.planet.id) ? 0 : 1;
      const bPin = favoritePlanetIds?.has(b.planet.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;

      // Terraform filter: sort by terraformDifficulty ascending, impossible last
      if (selectedFilter === 'terraform') {
        const isTerraformImpossible = (p: Planet): boolean =>
          !isTerraformable(p) || (p.terraformDifficulty ?? 0) > 0.85;
        const aImp = isTerraformImpossible(a.planet) ? 1 : 0;
        const bImp = isTerraformImpossible(b.planet) ? 1 : 0;
        if (aImp !== bImp) return aImp - bImp;
        // Both terraformable or both impossible — sort by difficulty ascending
        const aDiff = a.planet.terraformDifficulty ?? 1;
        const bDiff = b.planet.terraformDifficulty ?? 1;
        if (aDiff !== bDiff) return aDiff - bDiff;
      }

      // When minerals filter is active (or no filter), sort by minerals descending.
      // Priority: v168 stock units (remaining) > generated initial stock > colony inventory > raw resource value.
      if (selectedFilter === 'minerals' || selectedFilter === null) {
        const getMinerals = (planet: Planet): number => {
          if (planetResourceStocks) {
            const s = planetResourceStocks[planet.id];
            if (s) return s.remaining.minerals;
            return generatePlanetStocks(planet).initial.minerals;
          }
          if (getPlanetResources) return getPlanetResources(planet.id)?.minerals ?? 0;
          return planet.resources?.totalResources?.minerals ?? 0;
        };
        const aMin = getMinerals(a.planet);
        const bMin = getMinerals(b.planet);
        if (bMin !== aMin) return bMin - aMin;
      }

      const dA = systemDistances.get(a.system.id) ?? Infinity;
      const dB = systemDistances.get(b.system.id) ?? Infinity;
      return dA - dB;
    });
    return pairs;
  }, [allSystems, systemDistances, favoritePlanetIds, selectedFilter, getPlanetResources, planetResourceStocks]);

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

  // Find focused pair for the detail panel
  const focusedPair = useMemo(() => {
    if (!focusedPlanetId) return null;
    return sortedPairs.find((p) => p.planet.id === focusedPlanetId) ?? null;
  }, [focusedPlanetId, sortedPairs]);

  // Ship tier from buildings (for dispatch gate)
  const shipTier = useMemo(
    () => tierForBuildings(colonyBuildings, techTreeState?.researched),
    [colonyBuildings, techTreeState],
  );

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

      {/* Planet grid + inline panels — auto-fill sieve layout */}
      <div
        onClick={handleGridClick}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          gap: 8,
        }}
      >
        {visiblePairs.map(({ system, planet }) => {
          const tfState = terraformStates?.[planet.id];
          const filterStat = getFilterStatLabel(planet, selectedFilter, tfState, t as (key: string) => string, planetResourceStocks, colonyPlanetIds);
          const distLY = colonySystemIds.length > 0
            ? (systemDistances.get(system.id) ?? null)
            : null;
          const isFavorite = favoritePlanetIds?.has(planet.id) ?? false;
          const isSelected = focusedPlanetId === planet.id;
          const menuOpen = menuOpenForId === planet.id;
          const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
          const canGoToSurface = isSurfacePlanet && !!onOpenSurface;

          return (
            <React.Fragment key={planet.id}>
              {/* Card cell */}
              <div
                style={{ position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
              >
                <PlanetCard
                  planet={planet}
                  filterStat={filterStat}
                  activeFilter={selectedFilter}
                  isSelected={isSelected}
                  isFavorite={isFavorite}
                  onClick={() => {
                    if (focusedPlanetId === planet.id) {
                      // Second click on same focused card: deselect + close panel
                      setFocusedPlanetId(null);
                      setMenuOpenForId(null);
                    } else {
                      // Click on different card: switch focus, close old menu
                      setFocusedPlanetId(planet.id);
                      setMenuOpenForId(null);
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

              {/* Expanded detail panel — spans full grid width, inserted after the focused card */}
              {isSelected && focusedPair && focusedPair.planet.id === planet.id && (
                <ExpandedDetailPanel
                  planet={planet}
                  system={system}
                  distanceLY={distLY !== null && distLY < Infinity ? distLY : null}
                  tfState={tfState}
                  colonyPlanetIds={colonyPlanetIds}
                  donorPlanets={donorPlanets}
                  techTreeState={techTreeState}
                  shipTier={shipTier}
                  getPlanetResources={getPlanetResources}
                  onSendTerraformDelivery={onSendTerraformDelivery}
                  onCompleteTerraform={onCompleteTerraform}
                  onRenamePlanet={onRenamePlanet}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={isFavorite}
                  onViewPlanet={onViewPlanet}
                  planetResourceStocks={planetResourceStocks}
                  onClose={() => {
                    setFocusedPlanetId(null);
                    setMenuOpenForId(null);
                  }}
                />
              )}
            </React.Fragment>
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
    </div>
  );
}
