import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet } from '@nebulife/core';
import type { PlanetTerraformState } from '@nebulife/core';
import { getOverallProgress } from '@nebulife/core';

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
  /** Colony resources keyed by planet ID. */
  colonyResources?: { minerals: number; volatiles: number; isotopes: number; water: number };
  /** Terraform states keyed by planet ID (may be partial / missing). */
  terraformStates?: Record<string, PlanetTerraformState>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
}

// ---------------------------------------------------------------------------
// Mini resource bar
// ---------------------------------------------------------------------------

function ResourceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const displayVal = value >= 10000
    ? `${(value / 1000).toFixed(1)}k`
    : String(Math.floor(value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 10, color: '#667788', fontFamily: 'monospace' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: '#8899aa',
          fontFamily: 'monospace',
          minWidth: 36,
          textAlign: 'right',
        }}
      >
        {displayVal}
      </span>
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
  terraformPct,
  onGo,
}: {
  entry: ColonyEntry;
  systemName: string;
  resources: { minerals: number; volatiles: number; isotopes: number; water: number } | null;
  terraformPct: number | null;
  onGo: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'rgba(10, 15, 25, 0.4)',
        border: '1px solid rgba(51, 68, 85, 0.25)',
        borderRadius: 4,
        fontFamily: 'monospace',
      }}
    >
      {/* Planet name + system */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: entry.planet.isHomePlanet ? '#44ff88' : '#aabbcc',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={entry.planet.name}
        >
          {entry.planet.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#556677',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={systemName}
        >
          {systemName}
        </div>
      </div>

      {/* Resources */}
      {resources !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ResourceBar label="M" value={resources.minerals} color="#aa8855" />
          <ResourceBar label="V" value={resources.volatiles} color="#88aaee" />
          <ResourceBar label="I" value={resources.isotopes} color="#7bb8ff" />
          <ResourceBar label="W" value={resources.water} color="#44aa88" />
        </div>
      )}

      {/* Terraform progress */}
      <div
        style={{
          fontSize: 10,
          color: '#4488aa',
          whiteSpace: 'nowrap',
          minWidth: 90,
          textAlign: 'right',
        }}
      >
        {terraformPct !== null
          ? t('archive.terraform_progress', { pct: Math.round(terraformPct) })
          : '—'}
      </div>

      {/* Navigate button */}
      <button
        onClick={onGo}
        style={{
          padding: '5px 12px',
          background: 'none',
          border: '1px solid rgba(68, 102, 136, 0.5)',
          borderRadius: 3,
          color: '#7bb8ff',
          fontFamily: 'monospace',
          fontSize: 11,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(68, 102, 136, 0.25)';
          e.currentTarget.style.borderColor = '#7bb8ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.borderColor = 'rgba(68, 102, 136, 0.5)';
        }}
      >
        {t('archive.go_to_btn')}
      </button>
    </div>
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
  terraformStates,
  onViewPlanet,
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
        const tfPct = tfState ? getOverallProgress(tfState) : null;

        // Resources: for MVP only the home planet / active colony has resources
        // tracked in colonyResources. For other entries we show nothing.
        const res = planet.isHomePlanet ? (colonyResources ?? null) : null;

        return (
          <ColonyRow
            key={planet.id}
            entry={{ system, planet }}
            systemName={aliases[system.id] ?? system.name}
            resources={res}
            terraformPct={tfPct}
            onGo={() => onViewPlanet(system, planet.id)}
          />
        );
      })}
    </div>
  );
}
