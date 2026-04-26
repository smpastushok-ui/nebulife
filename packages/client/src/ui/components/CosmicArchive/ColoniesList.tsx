import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet, PlanetType } from '@nebulife/core';
import type { PlanetTerraformState, PlanetColonyState } from '@nebulife/core';
import { getOverallProgress } from '@nebulife/core';
import { ResourceIcon, RESOURCE_COLORS } from '../ResourceIcon.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColonyEntry {
  system: StarSystem;
  planet: Planet;
}

interface ColoniesListProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  /** Planet IDs that have a colony hub or are the home planet. */
  colonyPlanetIds: Set<string>;
  /**
   * Per-planet resource balances (Phase 7B). Keyed by planet ID.
   * @deprecated Pass resourcesByPlanet instead.
   */
  colonyResources?: { minerals: number; volatiles: number; isotopes: number; water: number };
  /** Per-planet resource balances. Takes priority over colonyResources. */
  resourcesByPlanet?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  /** Terraform states keyed by planet ID (may be partial / missing). */
  terraformStates?: Record<string, PlanetTerraformState>;
  /** Colony state per planet — used for population + building counts. */
  colonyStateByPlanet?: Record<string, PlanetColonyState>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
  /** Open the planet's surface directly (closes archive). */
  onOpenColonySurface?: (planet: Planet) => void;
  /** Open the Colony Center for this planet (closes archive). */
  onOpenColonyCenter?: (planet: Planet) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Gradient colours per planet type for the exosphere thumbnail. */
const PLANET_GRADIENT: Record<PlanetType, [string, string]> = {
  'rocky':      ['#aa8855', '#332211'],
  'terrestrial':['#44aa66', '#113322'],
  'dwarf':      ['#776655', '#221100'],
  'gas-giant':  ['#cc9966', '#553311'],
  'ice-giant':  ['#88aaee', '#223355'],
};

/** Visible pixel size (within the 64×64 container) by radiusEarth bucket. */
function planetPixelSize(planet: Planet): number {
  if (planet.type === 'gas-giant' || planet.type === 'ice-giant') return 64;
  const r = planet.radiusEarth;
  if (r < 0.5) return 32;
  if (r < 1.0) return 44;
  if (r < 1.5) return 56;
  return 64;
}

/** True when planet should show a ring (gas/ice giant or 3+ moons). */
function hasRing(planet: Planet): boolean {
  return planet.type === 'gas-giant' || planet.type === 'ice-giant' || planet.moons.length >= 3;
}

function getPopulation(state: PlanetColonyState | undefined): number {
  if (!state) return 0;
  return state.population?.current ?? 0;
}

function getBuildingCount(state: PlanetColonyState | undefined): number {
  if (!state) return 0;
  return state.buildings?.length ?? 0;
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.floor(n));
}

// ---------------------------------------------------------------------------
// PlanetThumbnail
// ---------------------------------------------------------------------------

function PlanetThumbnail({ planet }: { planet: Planet }) {
  const [glow, setGlow] = useState(false);
  const size = planetPixelSize(planet);
  const [from, to] = PLANET_GRADIENT[planet.type] ?? ['#667788', '#223344'];
  const svgId = `pg-${planet.id}`;
  const ring = hasRing(planet);

  return (
    <div
      style={{
        width: 64,
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        transition: 'box-shadow 0.15s',
        boxShadow: glow ? '0 0 12px rgba(68,136,255,0.5)' : 'none',
        cursor: 'default',
      }}
      onMouseEnter={() => setGlow(true)}
      onMouseLeave={() => setGlow(false)}
    >
      <svg
        width={size + (ring ? 16 : 0)}
        height={size + (ring ? 8 : 0)}
        viewBox={`0 0 ${size + (ring ? 16 : 0)} ${size + (ring ? 8 : 0)}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={svgId} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </radialGradient>
        </defs>
        {ring && (
          <ellipse
            cx={(size + 16) / 2}
            cy={(size + 8) / 2}
            rx={(size + 14) / 2}
            ry={size * 0.18}
            fill="none"
            stroke="rgba(200,170,120,0.4)"
            strokeWidth={2}
          />
        )}
        <circle
          cx={(size + (ring ? 16 : 0)) / 2}
          cy={(size + (ring ? 8 : 0)) / 2}
          r={size / 2}
          fill={`url(#${svgId})`}
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColonyRow
// ---------------------------------------------------------------------------

function ColonyRow({
  entry,
  systemName,
  resources,
  colonyState,
  onGo,
  onSurface,
  onCenter,
}: {
  entry: ColonyEntry;
  systemName: string;
  resources: { minerals: number; volatiles: number; isotopes: number; water: number } | null;
  colonyState: PlanetColonyState | undefined;
  onGo: () => void;
  onSurface?: () => void;
  onCenter?: () => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [isMobile] = useState(() => window.innerWidth < 480);

  const population = getPopulation(colonyState);
  const buildingCount = getBuildingCount(colonyState);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        border: '1px solid rgba(51,68,85,0.3)',
        borderRadius: 4,
        background: hovered ? 'rgba(68,136,255,0.08)' : 'rgba(10,15,25,0.4)',
        fontFamily: 'monospace',
        transition: 'background 0.15s',
        minWidth: 0,
      }}
    >
      {/* 1. Planet thumbnail */}
      <PlanetThumbnail planet={entry.planet} />

      {/* 2. Population */}
      <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {/* Human silhouette icon */}
        <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#aabbcc" strokeWidth={1.3} strokeLinecap="round">
          <circle cx="8" cy="4" r="2.5" />
          <path d="M3 15 Q3 10 8 10 Q13 10 13 15" />
        </svg>
        <span
          title={t('colonies.population')}
          style={{ fontSize: 10, color: '#8899aa', fontFamily: 'monospace' }}
        >
          {formatNumber(population)}
        </span>
      </div>

      {/* 3. Buildings */}
      <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {/* House silhouette icon */}
        <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#aabbcc" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8 L8 2 L14 8" />
          <path d="M4 8 L4 14 L12 14 L12 8" />
          <rect x="6" y="10" width="4" height="4" />
        </svg>
        <span
          title={t('colonies.buildings')}
          style={{ fontSize: 10, color: '#8899aa', fontFamily: 'monospace' }}
        >
          {buildingCount > 0 ? buildingCount : '\u2014'}
        </span>
      </div>

      {/* 4. Resources cluster (2x2 grid) — uses same icons as TopBar/ResourceDisplay */}
      {resources !== null && (
        <div style={{
          width: 88,
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: isMobile ? 2 : 3,
        }}>
          {/* Minerals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ResourceIcon type="minerals" size={10} />
            <span style={{ fontSize: 10, color: RESOURCE_COLORS.minerals, fontFamily: 'monospace' }}>{formatNumber(resources.minerals)}</span>
          </div>
          {/* Volatiles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ResourceIcon type="volatiles" size={10} />
            <span style={{ fontSize: 10, color: RESOURCE_COLORS.volatiles, fontFamily: 'monospace' }}>{formatNumber(resources.volatiles)}</span>
          </div>
          {/* Isotopes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ResourceIcon type="isotopes" size={10} />
            <span style={{ fontSize: 10, color: RESOURCE_COLORS.isotopes, fontFamily: 'monospace' }}>{formatNumber(resources.isotopes)}</span>
          </div>
          {/* Water */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ResourceIcon type="water" size={10} />
            <span style={{ fontSize: 10, color: RESOURCE_COLORS.water, fontFamily: 'monospace' }}>{formatNumber(resources.water)}</span>
          </div>
        </div>
      )}
      {resources === null && (
        <div style={{ width: 88, flexShrink: 0 }} />
      )}

      {/* 5. Action buttons */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', minWidth: 0 }}>
        {onSurface ? (
          <ActionButton
            label={isMobile ? undefined : t('colonies.btn_surface')}
            title={t('colonies.btn_surface')}
            onClick={onSurface}
            icon={
              <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2 L8 12" />
                <path d="M4 9 L8 13 L12 9" />
                <path d="M3 14 Q8 11 13 14" />
              </svg>
            }
          />
        ) : (
          <ActionButton
            label={isMobile ? undefined : t('archive.go_to_btn')}
            title={t('archive.go_to_btn')}
            onClick={onGo}
            icon={
              <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            }
          />
        )}
        {onCenter && (
          <ActionButton
            label={isMobile ? undefined : t('colonies.btn_center')}
            title={t('colonies.btn_center')}
            onClick={onCenter}
            icon={
              <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="2.5" />
                <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

function ActionButton({
  label,
  title,
  onClick,
  icon,
}: {
  label: string | undefined;
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: label ? 'flex-start' : 'center',
        gap: label ? 5 : 0,
        height: 28,
        padding: label ? '0 10px' : '0 8px',
        background: hover ? 'rgba(68,102,136,0.25)' : 'none',
        border: '1px solid rgba(68,102,136,0.5)',
        borderRadius: 3,
        color: '#7bb8ff',
        fontFamily: 'monospace',
        fontSize: 11,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, border-color 0.15s',
        borderColor: hover ? '#7bb8ff' : 'rgba(68,102,136,0.5)',
        flexShrink: 0,
      }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ColoniesList
// ---------------------------------------------------------------------------

export function ColoniesList({
  allSystems,
  aliases,
  colonyPlanetIds,
  colonyResources,
  resourcesByPlanet,
  terraformStates,
  colonyStateByPlanet,
  onViewPlanet,
  onOpenColonySurface,
  onOpenColonyCenter,
}: ColoniesListProps) {
  const { t } = useTranslation();

  // Collect colony entries in order: home planet first, then by planet name.
  const entries: ColonyEntry[] = [];
  for (const sys of allSystems) {
    for (const planet of sys.planets) {
      if (colonyPlanetIds.has(planet.id)) {
        entries.push({ system: sys, planet });
      }
    }
  }
  entries.sort((a, b) => {
    if (a.planet.isHomePlanet) return -1;
    if (b.planet.isHomePlanet) return 1;
    return a.planet.name.localeCompare(b.planet.name);
  });

  if (entries.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          color: '#445566',
          fontSize: 12,
          padding: '40px 0',
          fontFamily: 'monospace',
        }}
      >
        {t('archive.no_colonies')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(({ system, planet }) => {
        const tfState = terraformStates?.[planet.id];
        // Keep terraform data for potential future display; not shown in new layout
        void (tfState ? getOverallProgress(tfState) : null);

        const res = resourcesByPlanet
          ? (resourcesByPlanet[planet.id] ?? null)
          : planet.isHomePlanet ? (colonyResources ?? null) : null;

        const state = colonyStateByPlanet?.[planet.id];

        return (
          <ColonyRow
            key={planet.id}
            entry={{ system, planet }}
            systemName={aliases[system.id] ?? system.name}
            resources={res}
            colonyState={state}
            onGo={() => onViewPlanet(system, planet.id)}
            onSurface={onOpenColonySurface ? () => onOpenColonySurface(planet) : undefined}
            onCenter={onOpenColonyCenter ? () => onOpenColonyCenter(planet) : undefined}
          />
        );
      })}
    </div>
  );
}
