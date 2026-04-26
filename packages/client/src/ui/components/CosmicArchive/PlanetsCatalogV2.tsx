import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';
import type { PlanetTerraformState, TerraformParamId, TechTreeState } from '@nebulife/core';
import {
  isTerraformable,
  nearestColonyDistance,
  getOverallProgress,
  canStartParam,
  computeParamRequirement,
  tierForBuildings,
} from '@nebulife/core';
import type { ColonyResources } from '../Terraform/MissionDispatchModal.js';
import type { PlacedBuilding } from '@nebulife/core';

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
      if (!tfState) {
        // Show native difficulty if no active state
        const pct = Math.round((planet.terraformDifficulty ?? 0) * 100);
        return `${pct}%`;
      }
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

// ---------------------------------------------------------------------------
// Resource row icons
// ---------------------------------------------------------------------------

function MineralsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#aa8855" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,2 14,12 2,12" />
    </svg>
  );
}

function VolatilesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#88aaee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12 Q2 8 4 5 Q6 3 8 2 Q10 3 12 5 Q14 8 12 12" />
      <line x1="8" y1="14" x2="8" y2="12" />
    </svg>
  );
}

function IsotopesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="5.5" strokeDasharray="3 2" />
    </svg>
  );
}

function WaterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#44aabb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 C8 3 3 9 3 12 a5 5 0 0 0 10 0 C13 9 8 3 8 3z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PlanetCard — single grid cell (frameless, circle only)
// ---------------------------------------------------------------------------

function PlanetCard({
  planet,
  systemName,
  distanceLY,
  filterStat,
  activeFilter,
  isSelected,
  onClick,
}: {
  planet: Planet;
  systemName: string;
  distanceLY: number | null;
  filterStat: string | null;
  activeFilter: FilterId | null;
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

  // terraform filter: show only difficulty %, no name/system/distance
  const isTerraformFilter = activeFilter === 'terraform';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'monospace',
      }}
    >
      {/* Circle wrapper — glow goes here, not on outer button */}
      <div
        style={{
          borderRadius: '50%',
          width: 80,
          height: 80,
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
      </div>

      {/* Sub-label: terraform filter → difficulty%, other filters → stat + name + star, no filter → name + star + distance */}
      {isTerraformFilter ? (
        // Terraform filter: only show difficulty % beneath circle
        filterStat !== null && (
          <div style={{
            fontSize: 10,
            color: '#7bb8ff',
            textAlign: 'center',
            fontFamily: 'monospace',
            letterSpacing: 0.3,
          }}>
            {filterStat}
          </div>
        )
      ) : (
        <>
          {/* Filter stat (non-terraform filters) */}
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
          {/* Planet name */}
          <div
            style={{
              fontSize: 10,
              color: hover || isSelected ? '#aabbcc' : '#8899aa',
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
          {/* System name + distance (only when no filter active) */}
          {activeFilter === null && (
            <>
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
            </>
          )}
        </>
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
  onClose: () => void;
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
  onClose,
}: ExpandedDetailPanelProps) {
  const { t } = useTranslation();

  const overallPct = tfState ? Math.round(getOverallProgress(tfState)) : 0;
  const showTerraformSection = isTerraformable(planet) && !!tfState;
  const showCompleteButton = showTerraformSection && overallPct >= 95;

  const planetStocks = getPlanetResources ? getPlanetResources(planet.id) : null;
  const hasColony = colonyPlanetIds.has(planet.id);

  const typeKey: Record<string, string> = {
    rocky: 'planet.rocky',
    terrestrial: 'planet.terrestrial',
    'gas-giant': 'planet.gas_giant',
    'ice-giant': 'planet.ice_giant',
    dwarf: 'planet.dwarf',
  };

  const lyNum = distanceLY ?? 0;
  const pcNum = lyNum * 0.30660;

  // Info grid fields
  const infoFields: Array<{ label: string; value: string }> = [
    { label: t('planets_catalog.field_system'), value: system.name },
    { label: t('planets_catalog.field_type'), value: t(typeKey[planet.type] ?? planet.type) },
    { label: t('planets_catalog.field_size'), value: `${planet.radiusEarth.toFixed(2)} R\u2295` },
    { label: t('planets_catalog.field_gravity'), value: `${planet.surfaceGravityG.toFixed(2)} g` },
    {
      label: t('planets_catalog.field_hydro'),
      value: planet.hydrosphere
        ? `${Math.round(planet.hydrosphere.waterCoverageFraction * 100)}%`
        : '\u2014',
    },
    { label: t('planets_catalog.field_moons'), value: String(planet.moons.length) },
    {
      label: t('planets_catalog.field_distance'),
      value: distanceLY !== null
        ? `${lyNum.toFixed(2)} / ${pcNum.toFixed(2)}`
        : '\u2014',
    },
    {
      label: t('planets_catalog.field_colony'),
      value: hasColony ? t('planets_catalog.colony_yes') : t('planets_catalog.colony_no'),
    },
    {
      label: 'Тех-складність',
      value: `${Math.round((planet.terraformDifficulty ?? 0) * 100)}%`,
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
    }}>
      {/* 1. Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(51,68,85,0.4)',
      }}>
        <span style={{ fontSize: 14, color: '#ccddee', letterSpacing: '0.05em' }}>
          {planet.name}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#556677',
            fontFamily: 'monospace',
            fontSize: 14,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* 2. Terraform param list (most important section — shown first) */}
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

        {/* 3. Resource stocks */}
        {planetStocks && (
          <div>
            <div style={{
              fontSize: 8,
              color: '#445566',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              {t('planets_catalog.stocks_title')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Minerals */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8899aa' }}>
                <MineralsIcon />
                <span style={{ flex: 1 }}>Minerals</span>
                <span style={{ color: '#aa8855' }}>{Math.round(planetStocks.minerals).toLocaleString()}</span>
              </div>
              {/* Volatiles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8899aa' }}>
                <VolatilesIcon />
                <span style={{ flex: 1 }}>Volatiles</span>
                <span style={{ color: '#88aaee' }}>{Math.round(planetStocks.volatiles).toLocaleString()}</span>
              </div>
              {/* Isotopes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8899aa' }}>
                <IsotopesIcon />
                <span style={{ flex: 1 }}>Isotopes</span>
                <span style={{ color: '#7bb8ff' }}>{Math.round(planetStocks.isotopes).toLocaleString()}</span>
              </div>
              {/* Water */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8899aa' }}>
                <WaterIcon />
                <span style={{ flex: 1 }}>Water</span>
                <span style={{ color: '#44aabb' }}>{Math.round(planetStocks.water).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Compact info grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '3px 12px',
        }}>
          {infoFields.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(40,55,75,0.25)', padding: '3px 0' }}>
              <span style={{ fontSize: 9, color: '#445566' }}>{label}</span>
              <span style={{ fontSize: 9, color: '#8899aa', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
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

      {/* Planet grid + inline panels */}
      <div
        onClick={handleGridClick}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
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

          return (
            <React.Fragment key={planet.id}>
              {/* Card cell */}
              <div
                style={{ position: 'relative' }}
                onClick={(e) => e.stopPropagation()}
              >
                <PlanetCard
                  planet={planet}
                  systemName={aliases[system.id] ?? system.name}
                  distanceLY={distLY}
                  filterStat={filterStat}
                  activeFilter={selectedFilter}
                  isSelected={isSelected}
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
