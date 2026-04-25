// ---------------------------------------------------------------------------
// ColonyCenterPage — hub management screen opened by tapping the `colony_hub`
// building on the surface. 6 tabs: Overview, Colonies, Production, Buildings,
// Events, Premium. All boosts are LOCAL to the colony shown by the `planet`
// prop — multi-colony aggregation only appears on the Overview summary.
//
// Perf model:
//   - high / ultra tiers  → full fades, staggered mount anims, gradient bars
//   - mid / low tiers     → no entrance anims, flat-color bars, no pulses
//   (driven by `getDeviceTier()`; mirrors the rest of the app's tier pattern)
// ---------------------------------------------------------------------------

import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Star, StarSystem, PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import type { LogEntry } from '../CosmicArchive/SystemLog.js';
import { getDeviceTier } from '../../../utils/device-tier.js';
import { playSfx } from '../../../audio/SfxPlayer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColonyBoostKind = 'resource' | 'time';

export interface ColonyBoost {
  /** 0.1, 0.2, or 0.25 — relative multiplier delta for the boost. */
  pct: number;
  /** Epoch ms when the boost expires. */
  expiresAt: number;
}

export interface ColonyBoostsByPlanet {
  [planetId: string]: {
    resource?: ColonyBoost;
    time?: ColonyBoost;
  };
}

export interface ColonyCenterPlanet {
  planet: Planet;
  star: Star;
  system: StarSystem;
  /** Optional distance from home in light years (for roster). */
  distanceLY?: number;
  /** Buildings placed on this planet. */
  buildings: PlacedBuilding[];
  /** Colony level (from planet_claims row, default 1). */
  colonyLevel: number;
  /** Habitability 0..1 (overall score). */
  habitability?: number;
  /** Whether this is the active/currently-viewed colony. */
  active: boolean;
}

export interface ColonyCenterPageProps {
  /** The colony currently being viewed (tapped colony_hub). */
  active: ColonyCenterPlanet;
  /** All colonies the player owns (incl. the active one). */
  allColonies: ColonyCenterPlanet[];
  /** Live colony resource balances (minerals/volatiles/isotopes/water). */
  colonyResources: { minerals: number; volatiles: number; isotopes: number; water: number };
  /** Storage capacity per resource (computed from buildings + tech). */
  storageCapacity: number;
  /** Per-resource hourly production for the active colony. */
  productionPerHour: { minerals: number; volatiles: number; isotopes: number; water: number; researchData: number; energy: number };
  /** Passive extraction from resource hexes on the surface (already
   *  rolled into productionPerHour). Surfaced separately so the
   *  Production tab can show a "Добування" breakdown row. */
  extractionPerHour?: { minerals: number; volatiles: number; isotopes: number; water: number };
  /** Net energy balance — produced minus consumed. */
  energyBalance: { produced: number; consumed: number };
  /** researchData balance + hourly income. */
  researchData: number;
  /** Log entries for the Events tab. */
  logEntries: LogEntry[];
  /** Player premium currency (quarks) — required for boost purchases. */
  quarks: number;
  /**
   * Per-planet resource balances — used in the Production tab when the player
   * switches scope to "All colonies". Key is planet ID.
   * Optional; when absent the tab falls back to the active colony's
   * `colonyResources` for both scopes.
   */
  colonyResourcesByPlanet?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  /** Active boosts table for ALL player colonies. */
  boosts: ColonyBoostsByPlanet;
  /** Fires when the player confirms a boost purchase — parent deducts quarks + persists boost. */
  onBuyBoost: (kind: ColonyBoostKind, pct: number) => void;
  /** Navigate to a different colony's surface (roster Teleport action). */
  onTeleport: (colony: ColonyCenterPlanet) => void;
  /** Close the Colony Center. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Premium boost pricing (UA market, quarks = 1 UAH)
// Values chosen so +25% is the best per-% deal to encourage whale purchase.
// ---------------------------------------------------------------------------

export const RESOURCE_BOOST_PRICES: Record<string, number> = {
  '10': 80,
  '20': 150,
  '25': 200,
};

export const TIME_BOOST_PRICES: Record<string, number> = {
  '10': 60,
  '20': 120,
  '25': 150,
};

/** Boost duration — 24h for both kinds. */
export const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'colonies' | 'production' | 'buildings' | 'events' | 'premium';

interface TabDef {
  id: TabId;
  labelKey: string;
}

const TABS: TabDef[] = [
  { id: 'overview',   labelKey: 'colony_center.tab.overview' },
  { id: 'colonies',   labelKey: 'colony_center.tab.colonies' },
  { id: 'production', labelKey: 'colony_center.tab.production' },
  { id: 'buildings',  labelKey: 'colony_center.tab.buildings' },
  { id: 'events',     labelKey: 'colony_center.tab.events' },
  { id: 'premium',    labelKey: 'colony_center.tab.premium' },
];

// ---------------------------------------------------------------------------
// Small presentational atoms — shared across tabs
// ---------------------------------------------------------------------------

const RES_COLOR: Record<string, string> = {
  minerals: '#c8a878',
  volatiles: '#88ccaa',
  isotopes: '#ffcc44',
  water: '#7bb8ff',
  researchData: '#aa88ff',
  energy: '#ffaa66',
};

function ResourceBar({
  resourceKey,
  current,
  capacity,
  perHour,
  accent,
  onClick,
  expanded,
}: {
  resourceKey: string;
  current: number;
  capacity: number;
  perHour: number;
  accent: string;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const { t } = useTranslation();
  const pct = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
  const isLow = useMemo(() => {
    const tier = getDeviceTier();
    return tier === 'low' || tier === 'mid';
  }, []);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: expanded ? 'rgba(20,30,45,0.6)' : 'rgba(10,15,25,0.5)',
        border: `1px solid ${expanded ? accent : '#233344'}`,
        borderRadius: 4,
        padding: 10,
        fontFamily: 'monospace',
        color: '#aabbcc',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        transition: isLow ? 'none' : 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
          <span style={{ fontSize: 11, color: '#aabbcc', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t(`colony_center.resource.${resourceKey}`)}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#88bb99' }}>
          {perHour >= 0 ? '+' : ''}{perHour.toFixed(1)}/h
        </span>
      </div>
      <div style={{
        position: 'relative',
        height: 10,
        background: 'rgba(5,10,20,0.8)',
        border: '1px solid rgba(51,68,85,0.5)',
        borderRadius: 5,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          width: `${pct}%`,
          background: isLow ? accent : `linear-gradient(90deg, ${accent}, ${accent}dd)`,
          boxShadow: isLow ? undefined : `0 0 6px ${accent}80`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#667788', marginTop: 4 }}>
        <span>{Math.floor(current).toLocaleString()}</span>
        <span>{capacity.toLocaleString()}</span>
      </div>
    </button>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(10,15,25,0.5)',
      border: '1px solid #233344',
      borderRadius: 4,
      padding: '10px 12px',
      fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, color: accent ?? '#aabbcc', fontWeight: 600 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: '#556677', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab renderers
// ---------------------------------------------------------------------------

function OverviewTab({
  active,
  allColonies,
  colonyResources,
  storageCapacity,
  productionPerHour,
  energyBalance,
  researchData,
}: ColonyCenterPageProps) {
  const { t } = useTranslation();
  const habPct = Math.round((active.habitability ?? 0) * 100);

  // Aggregated view — merges EVERY colony this player owns.
  const agg = useMemo(() => {
    const buildingCount = allColonies.reduce((acc, c) => acc + c.buildings.length, 0);
    return {
      totalColonies: allColonies.length,
      totalBuildings: buildingCount,
    };
  }, [allColonies]);

  const energyShortfall = energyBalance.consumed - energyBalance.produced;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary cards — cross-colony totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatCard label={t('colony_center.overview.colonies')} value={agg.totalColonies} accent="#7bb8ff" />
        <StatCard label={t('colony_center.overview.buildings')} value={agg.totalBuildings} accent="#aabbcc" />
        <StatCard label={t('colony_center.overview.research')} value={`${researchData}`} accent={RES_COLOR.researchData} sub={`+${productionPerHour.researchData.toFixed(1)}/h`} />
      </div>

      {/* Local resources — current colony */}
      <div style={{ fontSize: 10, color: '#556677', letterSpacing: 2, textTransform: 'uppercase', paddingTop: 4 }}>
        {t('colony_center.overview.local_resources', { planet: active.planet.name })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <ResourceBar resourceKey="minerals" accent={RES_COLOR.minerals} current={colonyResources.minerals} capacity={storageCapacity} perHour={productionPerHour.minerals} />
        <ResourceBar resourceKey="volatiles" accent={RES_COLOR.volatiles} current={colonyResources.volatiles} capacity={storageCapacity} perHour={productionPerHour.volatiles} />
        <ResourceBar resourceKey="isotopes" accent={RES_COLOR.isotopes} current={colonyResources.isotopes} capacity={storageCapacity} perHour={productionPerHour.isotopes} />
        <ResourceBar resourceKey="water" accent={RES_COLOR.water} current={colonyResources.water} capacity={storageCapacity} perHour={productionPerHour.water} />
      </div>

      {/* Energy + Habitability */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <StatCard
          label={t('colony_center.overview.energy')}
          value={`${energyBalance.produced} / ${energyBalance.consumed}`}
          accent={energyShortfall > 0 ? '#cc4444' : '#44ff88'}
          sub={energyShortfall > 0
            ? t('colony_center.overview.shortfall', { amount: energyShortfall })
            : t('colony_center.overview.surplus', { amount: -energyShortfall })}
        />
        <StatCard
          label={t('colony_center.overview.habitability')}
          value={`${habPct}%`}
          accent={habPct >= 70 ? '#44ff88' : habPct >= 40 ? '#ffcc44' : '#ff8844'}
          sub={`${t('colony_center.overview.colony_level')} ${active.colonyLevel}`}
        />
      </div>
    </div>
  );
}

function ColoniesTab({ active, allColonies, onTeleport }: ColonyCenterPageProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {allColonies.map((c) => {
        const isActive = c.planet.id === active.planet.id;
        return (
          <div
            key={c.planet.id}
            style={{
              background: isActive ? 'rgba(20,30,45,0.7)' : 'rgba(10,15,25,0.6)',
              border: `1px solid ${isActive ? '#7bb8ff' : '#233344'}`,
              borderRadius: 4,
              padding: 12,
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#fff4e8',
                  boxShadow: '0 0 4px rgba(255,244,232,0.5)',
                }} />
                <span style={{ fontSize: 12, color: '#ccddee', fontWeight: 600 }}>
                  {c.planet.name}
                </span>
                {isActive && (
                  <span style={{ fontSize: 8, color: '#7bb8ff', letterSpacing: 1.5, padding: '1px 6px', border: '1px solid #446688', borderRadius: 3 }}>
                    {t('colony_center.colonies.active')}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 9, color: '#667788', display: 'flex', gap: 10 }}>
                <span>{t('colony_center.colonies.level', { n: c.colonyLevel })}</span>
                <span>·</span>
                <span>{t('colony_center.colonies.buildings_count', { n: c.buildings.length })}</span>
                {typeof c.distanceLY === 'number' && <>
                  <span>·</span>
                  <span>{c.distanceLY.toFixed(1)} LY</span>
                </>}
              </div>
            </div>
            {!isActive && (
              <button
                onClick={() => { playSfx('ui-click', 0.07); onTeleport(c); }}
                style={{
                  background: 'rgba(68,136,170,0.15)',
                  border: '1px solid #446688',
                  borderRadius: 3,
                  color: '#7bb8ff',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {t('colony_center.colonies.teleport')}
              </button>
            )}
          </div>
        );
      })}

      {/* Placeholder for future colonies — second-home-colony feature pending */}
      <div style={{
        background: 'rgba(10,15,25,0.3)',
        border: '1px dashed #223344',
        borderRadius: 4,
        padding: 12,
        fontFamily: 'monospace',
        color: '#445566',
        fontSize: 10,
        textAlign: 'center',
        letterSpacing: 1,
      }}>
        {t('colony_center.colonies.new_slot_hint')}
      </div>
    </div>
  );
}

function ProductionTab({ active, allColonies, productionPerHour, extractionPerHour, storageCapacity, colonyResources, colonyResourcesByPlanet }: ColonyCenterPageProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<'this' | 'all'>('this');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Aggregate across all colonies when scope === 'all'
  const scopeData = useMemo(() => {
    if (scope === 'this') {
      return {
        resources: colonyResources,
        capacity: storageCapacity,
        perHour: productionPerHour,
        buildings: active.buildings,
      };
    }
    // Merge all colonies — sum per-planet balances when available, otherwise
    // fall back to active colony's balance for the single-colony case.
    const buildings = allColonies.flatMap((c) => c.buildings);
    let totalResources = { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
    if (colonyResourcesByPlanet) {
      for (const res of Object.values(colonyResourcesByPlanet)) {
        totalResources.minerals  += res.minerals;
        totalResources.volatiles += res.volatiles;
        totalResources.isotopes  += res.isotopes;
        totalResources.water     += res.water;
      }
    } else {
      totalResources = colonyResources;
    }
    return {
      resources: totalResources,
      capacity: storageCapacity * allColonies.length,
      perHour: productionPerHour,
      buildings,
    };
  }, [scope, active, allColonies, colonyResources, colonyResourcesByPlanet, storageCapacity, productionPerHour]);

  const resourceKeys = ['minerals', 'volatiles', 'isotopes', 'water'] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Scope toggle */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(10,15,25,0.4)', padding: 3, borderRadius: 4, border: '1px solid #233344' }}>
        {(['this', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { playSfx('ui-click', 0.07); setScope(s); }}
            style={{
              flex: 1,
              background: scope === s ? 'rgba(68,136,170,0.2)' : 'transparent',
              border: scope === s ? '1px solid #446688' : '1px solid transparent',
              borderRadius: 3,
              color: scope === s ? '#7bb8ff' : '#667788',
              fontFamily: 'monospace',
              fontSize: 10,
              padding: '5px 10px',
              cursor: 'pointer',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {s === 'this'
              ? t('colony_center.production.scope_this')
              : t('colony_center.production.scope_all')}
          </button>
        ))}
      </div>

      {/* Per-resource bars — click to expand building breakdown */}
      {resourceKeys.map((key) => {
        const isExpanded = expanded === key;
        return (
          <div key={key}>
            <ResourceBar
              resourceKey={key}
              accent={RES_COLOR[key]}
              current={(scopeData.resources as any)[key] ?? 0}
              capacity={scopeData.capacity}
              perHour={(scopeData.perHour as any)[key] ?? 0}
              onClick={() => { playSfx('ui-click', 0.07); setExpanded(isExpanded ? null : key); }}
              expanded={isExpanded}
            />
            {isExpanded && (
              <BuildingBreakdown
                buildings={scopeData.buildings}
                resourceKey={key}
                extractionPerHour={extractionPerHour?.[key] ?? 0}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BuildingBreakdown({ buildings, resourceKey, extractionPerHour = 0 }: {
  buildings: PlacedBuilding[];
  resourceKey: string;
  /** Combined per-hour yield from natural resource hexes for this resource. */
  extractionPerHour?: number;
}) {
  const { t } = useTranslation();

  const producers = useMemo(() => {
    const RESOURCE_ALIASES: Record<string, string[]> = {
      minerals: ['minerals'],
      volatiles: ['volatiles'],
      isotopes: ['isotopes'],
      water: ['water'],
    };
    const aliases = RESOURCE_ALIASES[resourceKey] ?? [resourceKey];

    const counts = new Map<string, { count: number; perHour: number; def: unknown }>();
    for (const b of buildings) {
      const def = (BUILDING_DEFS as Record<string, { production?: Array<{ resource: string; amount: number }> }>)[b.type];
      if (!def) continue;
      const out = (def.production ?? []).find((p: { resource: string; amount: number }) =>
        aliases.includes(p.resource));
      if (!out) continue;
      const existing = counts.get(b.type) ?? { count: 0, perHour: 0, def };
      existing.count += 1;
      existing.perHour += out.amount * 60; // ticks are /min → /hour
      counts.set(b.type, existing);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1].perHour - a[1].perHour);
  }, [buildings, resourceKey]);

  const hasExtraction = extractionPerHour > 0;

  if (producers.length === 0 && !hasExtraction) {
    return (
      <div style={{ fontSize: 10, color: '#556677', padding: '6px 12px', fontFamily: 'monospace', textAlign: 'center' }}>
        {t('colony_center.production.no_producers')}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(5,10,20,0.5)',
      border: '1px solid rgba(51,68,85,0.4)',
      borderTop: 'none',
      borderRadius: '0 0 4px 4px',
      padding: 8,
      marginTop: -1,
      fontFamily: 'monospace',
    }}>
      {/* Surface-resource extraction row — shown when natural deposits on
          the planet contribute to this resource. Listed first so the
          player sees the passive yield distinct from per-building output. */}
      {hasExtraction && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 10 }}>
          <span style={{ color: '#aabbcc' }}>
            {t('colony_center.production.extraction')}
          </span>
          <span style={{ color: '#88bb99' }}>
            +{extractionPerHour.toFixed(1)}/h
          </span>
        </div>
      )}
      {producers.map(([type, data]) => (
        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', fontSize: 10 }}>
          <span style={{ color: '#aabbcc' }}>
            ×{data.count} {type}
          </span>
          <span style={{ color: '#88bb99' }}>
            +{data.perHour.toFixed(1)}/h
          </span>
        </div>
      ))}
    </div>
  );
}

function BuildingsTab({ active }: ColonyCenterPageProps) {
  const { t } = useTranslation();

  // Group by category, count per type
  const byCategory = useMemo(() => {
    const CATEGORIES = ['infrastructure', 'energy', 'extraction', 'science', 'biosphere', 'chemistry', 'premium'];
    const result: Record<string, Array<{ type: string; count: number; def: any }>> = {};
    for (const cat of CATEGORIES) result[cat] = [];

    const counts = new Map<string, number>();
    for (const b of active.buildings) {
      counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
    }

    for (const [type, def] of Object.entries(BUILDING_DEFS)) {
      const cat = (def as any).category ?? 'infrastructure';
      if (!result[cat]) result[cat] = [];
      result[cat].push({ type, count: counts.get(type) ?? 0, def });
    }
    return result;
  }, [active.buildings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(byCategory).map(([cat, entries]) => {
        if (entries.length === 0) return null;
        return (
          <div key={cat}>
            <div style={{ fontSize: 10, color: '#556677', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              {t(`colony_center.building_category.${cat}`)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {entries.map(({ type, count, def }) => {
                const built = count > 0;
                return (
                  <div key={type} style={{
                    background: built ? 'rgba(20,30,45,0.5)' : 'rgba(10,15,25,0.3)',
                    border: `1px solid ${built ? '#334455' : '#223344'}`,
                    borderRadius: 3,
                    padding: '6px 10px',
                    fontFamily: 'monospace',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    color: built ? '#aabbcc' : '#556677',
                  }}>
                    <span>{type}</span>
                    <span style={{ fontSize: 10, color: built ? '#44ff88' : '#445566' }}>
                      {count} / {def.maxPerPlanet ?? '∞'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventsTab({ logEntries }: ColonyCenterPageProps) {
  const { t } = useTranslation();

  // Show only economy + science categories (colony-relevant) and newest first.
  const filtered = useMemo(() => {
    return logEntries
      .filter((e) => e.category === 'economy' || e.category === 'science')
      .slice(0, 30);
  }, [logEntries]);

  if (filtered.length === 0) {
    return (
      <div style={{ fontSize: 11, color: '#556677', fontFamily: 'monospace', textAlign: 'center', padding: 40 }}>
        {t('colony_center.events.empty')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {filtered.map((e) => (
        <div key={e.id} style={{
          background: 'rgba(10,15,25,0.5)',
          border: '1px solid #223344',
          borderRadius: 3,
          padding: '8px 10px',
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#aabbcc',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {e.text}
          </span>
          <span style={{ color: '#556677', fontSize: 9, flexShrink: 0 }}>
            {new Date(e.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function PremiumTab({ active, quarks, boosts, onBuyBoost }: ColonyCenterPageProps) {
  const { t } = useTranslation();
  const now = Date.now();
  const planetBoosts = boosts[active.planet.id] ?? {};

  const resActive = planetBoosts.resource && planetBoosts.resource.expiresAt > now ? planetBoosts.resource : null;
  const timeActive = planetBoosts.time && planetBoosts.time.expiresAt > now ? planetBoosts.time : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section: resource boosts */}
      <BoostSection
        title={t('colony_center.premium.resource_title')}
        description={t('colony_center.premium.resource_desc')}
        active={resActive}
        prices={RESOURCE_BOOST_PRICES}
        kind="resource"
        onBuy={(pct) => onBuyBoost('resource', pct)}
        quarks={quarks}
      />

      {/* Section: time reduction boosts */}
      <BoostSection
        title={t('colony_center.premium.time_title')}
        description={t('colony_center.premium.time_desc')}
        active={timeActive}
        prices={TIME_BOOST_PRICES}
        kind="time"
        onBuy={(pct) => onBuyBoost('time', pct)}
        quarks={quarks}
      />

      <div style={{ fontSize: 9, color: '#445566', lineHeight: 1.5, padding: '0 4px' }}>
        {t('colony_center.premium.disclaimer')}
      </div>
    </div>
  );
}

function BoostSection({
  title,
  description,
  active,
  prices,
  kind,
  onBuy,
  quarks,
}: {
  title: string;
  description: string;
  active: ColonyBoost | null;
  prices: Record<string, number>;
  kind: ColonyBoostKind;
  onBuy: (pct: number) => void;
  quarks: number;
}) {
  const { t } = useTranslation();
  const now = Date.now();

  return (
    <div style={{
      background: 'rgba(10,15,25,0.55)',
      border: '1px solid #334455',
      borderRadius: 4,
      padding: 14,
      fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: 11, color: '#aabbcc', fontWeight: 600, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ fontSize: 10, color: '#667788', marginBottom: 12, lineHeight: 1.5 }}>
        {description}
      </div>

      {active && (
        <div style={{
          background: 'rgba(68,255,136,0.08)',
          border: '1px solid rgba(68,255,136,0.3)',
          borderRadius: 3,
          padding: '6px 10px',
          marginBottom: 10,
          fontSize: 10,
          color: '#44ff88',
        }}>
          {t('colony_center.premium.active_boost', {
            sign: kind === 'time' ? '-' : '+',
            pct: Math.round(active.pct * 100),
            remaining: Math.max(0, Math.ceil((active.expiresAt - now) / (60 * 60 * 1000))),
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {(['10', '20', '25'] as const).map((pctStr) => {
          const price = prices[pctStr];
          const canAfford = quarks >= price;
          const pctNum = parseInt(pctStr, 10) / 100;
          return (
            <button
              key={pctStr}
              onClick={() => { if (canAfford) { playSfx('ui-click', 0.07); onBuy(pctNum); } }}
              disabled={!canAfford}
              style={{
                background: canAfford ? 'rgba(68,136,255,0.1)' : 'rgba(10,15,25,0.4)',
                border: `1px solid ${canAfford ? '#446688' : '#223344'}`,
                borderRadius: 3,
                padding: '10px 4px',
                color: canAfford ? '#7bb8ff' : '#445566',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: canAfford ? 'pointer' : 'not-allowed',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {kind === 'time' ? '−' : '+'}{pctStr}%
              </div>
              <div style={{ fontSize: 10, color: canAfford ? '#aabbcc' : '#445566', marginTop: 4 }}>
                {price} ⚛
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ColonyCenterPage: React.FC<ColonyCenterPageProps> = (props) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('overview');

  const isLowTier = useMemo(() => {
    const tier = getDeviceTier();
    return tier === 'low' || tier === 'mid';
  }, []);

  const handleTabChange = useCallback((id: TabId) => {
    playSfx('ui-click', 0.07);
    setTab(id);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9700, // Above ResourceWidget (9500) and other surface HUDs
        background: '#020510',
        fontFamily: 'monospace',
        color: '#aabbcc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header — pushed below the global Resource HUD strip (which sits at
          top:0 with its own padding). 70px clears that strip on phones; the
          safe-area inset handles notch/Dynamic-Island devices on top of that.
          This pattern should be reused for every other building's inspect
          page so we don't keep re-fixing the same overlap. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px',
        paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid #1a2a3a',
        flexShrink: 0,
      }}>
        <button
          onClick={props.onClose}
          style={{
            background: 'rgba(10,15,25,0.8)',
            border: '1px solid #334455',
            borderRadius: 3,
            color: '#8899aa',
            fontFamily: 'monospace',
            fontSize: 9,
            padding: '5px 10px',
            cursor: 'pointer',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {t('colony_center.back')}
        </button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 16, color: '#aabbcc', letterSpacing: 4, textTransform: 'uppercase' }}>
            {t('colony_center.title')}
          </div>
          <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1 }}>
            {props.active.planet.name}
          </div>
        </div>
        <div style={{
          padding: '4px 10px',
          background: 'rgba(10,15,25,0.8)',
          border: '1px solid #446688',
          borderRadius: 3,
          fontSize: 11,
          color: '#7bb8ff',
        }}>
          ⚛ {props.quarks}
        </div>
      </div>

      {/* Tab bar — horizontal scroll on narrow screens */}
      <div style={{
        display: 'flex',
        gap: 2,
        padding: '8px 12px',
        borderBottom: '1px solid #1a2333',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {TABS.map((tabDef) => {
          const isActive = tab === tabDef.id;
          return (
            <button
              key={tabDef.id}
              onClick={() => handleTabChange(tabDef.id)}
              style={{
                background: isActive ? 'rgba(68,136,170,0.18)' : 'transparent',
                border: isActive ? '1px solid #446688' : '1px solid #223344',
                borderRadius: 3,
                color: isActive ? '#7bb8ff' : '#8899aa',
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '6px 12px',
                cursor: 'pointer',
                letterSpacing: 1,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: isLowTier ? 'none' : 'background 0.15s, border-color 0.15s, color 0.15s',
              }}
            >
              {t(tabDef.labelKey as any)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '14px 16px 40px',
      }}>
        {tab === 'overview'   && <OverviewTab {...props} />}
        {tab === 'colonies'   && <ColoniesTab {...props} />}
        {tab === 'production' && <ProductionTab {...props} />}
        {tab === 'buildings'  && <BuildingsTab {...props} />}
        {tab === 'events'     && <EventsTab {...props} />}
        {tab === 'premium'    && <PremiumTab {...props} />}
      </div>
    </div>
  );
};
