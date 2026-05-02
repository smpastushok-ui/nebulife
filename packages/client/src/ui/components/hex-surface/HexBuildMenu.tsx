import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildingType, PlanetResourceStocks, PlanetType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { ResourceIcon, type ResourceType } from '../ResourceIcon.js';
import { QuarksIcon } from '../ResourceDisplay.js';

// Alpha harvester escalating quarks price
const ALPHA_HARVESTER_PRICES = [50, 103, 206]; // 1st=$1.20, 2nd=$2.50, 3rd+=$5.00
export function getAlphaHarvesterPrice(purchasedCount: number): number {
  return ALPHA_HARVESTER_PRICES[Math.min(purchasedCount, ALPHA_HARVESTER_PRICES.length - 1)];
}

interface HexBuildMenuProps {
  slotId: string;
  screenX: number;
  screenY: number;
  playerLevel: number;
  techTreeState?: any;
  colonyResources: { minerals: number; volatiles: number; isotopes: number; water: number };
  chemicalInventory?: Record<string, number>;
  planetType?: PlanetType;
  planetStocks?: PlanetResourceStocks;
  quarks?: number;
  alphaHarvesterCount?: number;
  onSelect: (type: BuildingType) => void;
  onClose: () => void;
}

function CostIcons({ cost }: { cost: { resource: string; amount: number }[] }) {
  if (cost.length === 0) return <span style={{ fontSize: 7, color: '#4488aa' }}>FREE</span>;
  const resourceTypes = new Set<ResourceType>(['minerals', 'volatiles', 'isotopes', 'water']);
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
      {cost.map((c) => {
        if (!resourceTypes.has(c.resource as ResourceType)) return null;
        return (
          <span key={c.resource} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ResourceIcon type={c.resource as ResourceType} size={10} />
            <span style={{ fontSize: 7, color: '#aabbcc' }}>{c.amount}</span>
          </span>
        );
      })}
    </div>
  );
}

function formatRateAmount(amountPerTick: number): string {
  const perHour = amountPerTick * 60;
  return `${perHour % 1 === 0 ? perHour.toFixed(0) : perHour.toFixed(1)}/год`;
}

function resourceLabel(resource: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (resource === 'energy') return t('building_detail.resource.energy');
  if (resource === 'researchData') return t('building_detail.resource.researchData');
  if (resource === 'habitability') return t('building_detail.resource.habitability');
  if (resource === 'food') return t('building_detail.resource.food');
  if (resource === 'minerals' || resource === 'volatiles' || resource === 'isotopes' || resource === 'water') {
    return t(`colony_center.resource.${resource}`);
  }
  return resource;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canAffordBuilding(
  def: { cost: { resource: string; amount: number }[] },
  res: { minerals: number; volatiles: number; isotopes: number; water: number },
  chemInv: Record<string, number> = {},
): boolean {
  for (const c of def.cost) {
    const key = c.resource as keyof typeof res;
    if (key in res) {
      if (res[key] < c.amount) return false;
    } else {
      if ((chemInv[c.resource] ?? 0) < c.amount) return false;
    }
  }
  return true;
}

function isTechResearched(techTreeState: any, techId: string | null): boolean {
  if (techId === null) return true;
  if (!techTreeState) return false;
  if (techTreeState.researched) return !!techTreeState.researched[techId];
  return !!techTreeState[techId];
}

// Building image map
const BUILDING_IMG: Record<string, string> = {
  colony_hub: '/buildings/colony.webp',
  mine: '/buildings/mine.webp',
  solar_plant: '/buildings/solar_plant.webp',
  wind_generator: '/buildings/wind_generator.webp',
  battery_station: '/buildings/battery_station.webp',
  thermal_generator: '/buildings/thermal_generator.webp',
  fusion_reactor: '/buildings/fusion_reactor.webp',
  resource_storage: '/buildings/resource_storage.webp',
  landing_pad: '/buildings/landing_pad.webp',
  spaceport: '/buildings/spaceport.webp',
  atmo_extractor: '/buildings/atmo_extractor.webp',
  water_extractor: '/buildings/water_extractor.webp',
  observatory: '/buildings/observatory.webp',
  orbital_collector: '/buildings/orbital_collector.webp',
  orbital_telescope: '/buildings/orbital_telescope.webp',
  radar_tower: '/buildings/radar_tower.webp',
  research_lab: '/buildings/research_lab.webp',
  deep_drill: '/buildings/deep_drill.webp',
  alpha_harvester: '/buildings/alpha_harvester.webp',
  quantum_computer: '/buildings/quantum_computer.webp',
  greenhouse: '/buildings/greenhouse.webp',
  atmo_shield: '/buildings/atmo_shield.webp',
  quantum_separator: '/buildings/quantum_separator.webp',
  gas_fractionator: '/buildings/gas_fractionator.webp',
  genesis_vault: '/buildings/genesis_vault.webp',
  isotope_centrifuge: '/buildings/isotope_centrifuge.webp',
  biome_dome: '/buildings/biome_dome.webp',
  residential_dome: '/buildings/residential_dome.webp',
  isotope_collector: '/buildings/isotope_centrifuge.webp',
};

const CATEGORY_ORDER = [
  'extraction',
  'energy',
  'infrastructure',
  'science',
  'biosphere',
  'chemistry',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  extraction:     '#aa8855',
  energy:         '#ffcc44',
  infrastructure: '#7bb8ff',
  science:        '#cc88ff',
  biosphere:      '#44ff88',
  chemistry:      '#ff8844',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HexBuildMenu({
  slotId: _slotId,
  screenX: _screenX,
  screenY: _screenY,
  playerLevel,
  techTreeState,
  colonyResources,
  chemicalInventory = {},
  planetType,
  planetStocks,
  quarks = 0,
  alphaHarvesterCount = 0,
  onSelect,
  onClose,
}: HexBuildMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [infoType, setInfoType] = useState<BuildingType | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // All buildings except colony_hub, grouped by category
  const allBuildings = (Object.keys(BUILDING_DEFS) as BuildingType[]).filter(bt => bt !== 'colony_hub');

  const grouped = CATEGORY_ORDER.reduce<Partial<Record<string, BuildingType[]>>>((acc, cat) => {
    const items = allBuildings.filter((bt) => BUILDING_DEFS[bt].category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Menu — centered on screen */}
      <div
        ref={menuRef}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100vw - 24px)',
          maxWidth: 360,
          maxHeight: '80vh',
          background: 'rgba(8,14,24,0.97)',
          border: '1px solid #334455',
          borderRadius: 6,
          boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
          overflowY: 'auto',
          zIndex: 1000,
          fontFamily: 'monospace',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #1e2d3d',
          position: 'sticky',
          top: 0,
          background: 'rgba(8,14,24,0.97)',
          zIndex: 2,
        }}>
          <span style={{ color: '#7bb8ff', fontSize: 11, letterSpacing: 1.5 }}>
            {t('hex.build_menu', 'BUILD')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#556677',
              cursor: 'pointer', fontSize: 14, padding: '0 2px', fontFamily: 'monospace',
            }}
          >
            x
          </button>
        </div>

        {/* Building grid — 3 columns per category */}
        <div style={{ padding: '4px 8px 8px' }}>
          {Object.entries(grouped).map(([cat, types]) => (
            <div key={cat} style={{ marginBottom: 6 }}>
              {/* Category header */}
              <div style={{
                padding: '4px 4px 3px',
                fontSize: 7,
                color: CATEGORY_COLORS[cat] ?? '#556677',
                letterSpacing: 2,
                textTransform: 'uppercase',
                borderBottom: `1px solid ${CATEGORY_COLORS[cat] ?? '#334455'}22`,
                marginBottom: 4,
              }}>
                {t(`hex.cat_${cat}`, cat)}
              </div>

              {/* 3-column grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
              }}>
                {types!.map((type) => {
                  const def = BUILDING_DEFS[type];
                  const levelLocked = def.levelRequired > playerLevel;
                  const techLocked = !isTechResearched(techTreeState, def.techRequired);
                  const planetLocked = planetType ? !def.allowedPlanetTypes.includes(planetType) : false;
                  const isLocked = levelLocked || techLocked || planetLocked;

                  // Alpha harvester: quarks price instead of colony resources
                  const isAlpha = type === 'alpha_harvester';
                  const alphaPrice = isAlpha ? getAlphaHarvesterPrice(alphaHarvesterCount) : 0;
                  const isotopeDepleted = (planetStocks?.remaining.isotopes ?? 1) <= 0
                    && def.production.some((p) => p.resource === 'isotopes');
                  const canAfford = !isLocked && (isAlpha
                    ? quarks >= alphaPrice
                    : canAffordBuilding(def, colonyResources, chemicalInventory));
                  const imgSrc = BUILDING_IMG[type];

                  const infoOpen = infoType === type;

                  return (
                    <React.Fragment key={type}>
                    {infoOpen && (
                      <div style={{
                        gridColumn: '1 / -1',
                        margin: '2px 0 4px',
                        padding: '10px',
                        background: 'rgba(12,22,34,0.92)',
                        border: '1px solid rgba(68,136,170,0.38)',
                        borderRadius: 5,
                        color: '#8899aa',
                        fontSize: 10,
                        lineHeight: 1.45,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <strong style={{ color: '#9fd0ff', letterSpacing: 1, textTransform: 'uppercase' }}>
                            {t(`building.${type}.name`, def.name)}
                          </strong>
                          <button
                            type="button"
                            onClick={() => setInfoType(null)}
                            style={{ background: 'none', border: 'none', color: '#667788', cursor: 'pointer', fontFamily: 'monospace' }}
                          >
                            x
                          </button>
                        </div>
                        <div>{t(`building.${type}.desc`, def.description)}</div>
                        <div style={{ marginTop: 7, display: 'grid', gap: 4 }}>
                          <div>{t('building_detail.production')}: {[
                            ...(def.energyOutput > 0
                              ? [`${resourceLabel('energy', t)} +${formatRateAmount(def.energyOutput)}`]
                              : []),
                            ...def.production.map((p) => `${resourceLabel(p.resource, t)} +${formatRateAmount(p.amount)}`),
                          ].join(', ') || t('building_detail.no_production')}</div>
                          <div>{t('building_detail.consumption')}: {[
                            ...(def.energyConsumption > 0
                              ? [`${resourceLabel('energy', t)} -${formatRateAmount(def.energyConsumption)}`]
                              : []),
                            ...def.consumption.map((c) => `${resourceLabel(c.resource, t)} -${formatRateAmount(c.amount)}`),
                          ].join(', ') || t('building_detail.no_consumption')}</div>
                          <div>{t('academy.needs_level', { level: def.levelRequired, defaultValue: `L${def.levelRequired}` })}</div>
                        </div>
                      </div>
                    )}
                    <div
                      onClick={() => { if (canAfford) { onSelect(type); onClose(); } }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '4px 2px 5px',
                        borderRadius: 4,
                        cursor: canAfford ? 'pointer' : 'default',
                        opacity: isLocked ? 0.25 : canAfford ? 1 : 0.5,
                        filter: isLocked ? 'grayscale(1)' : 'none',
                        background: 'rgba(15,25,35,0.5)',
                        border: '1px solid rgba(51,68,85,0.3)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLocked) (e.currentTarget as HTMLDivElement).style.background = 'rgba(68,136,170,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(15,25,35,0.5)';
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoType(type);
                        }}
                        style={{
                          alignSelf: 'flex-end',
                          marginBottom: -16,
                          zIndex: 1,
                          width: 18,
                          height: 18,
                          background: 'rgba(5,10,20,0.78)',
                          border: '1px solid rgba(68,136,170,0.45)',
                          borderRadius: 3,
                          color: '#7bb8ff',
                          fontFamily: 'monospace',
                          fontSize: 10,
                          cursor: 'help',
                        }}
                      >
                        ?
                      </button>
                      {/* Building image — contain to show full image regardless of aspect ratio */}
                      <div style={{
                        width: 80, height: 80,
                        borderRadius: 3,
                        background: 'rgba(10,18,28,0.8)',
                        marginBottom: 3,
                      }}>
                        {imgSrc && (
                          <img
                            src={imgSrc}
                            alt={type}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        )}
                      </div>

                      {/* Building name */}
                      <div style={{
                        fontSize: 8,
                        color: isLocked ? '#445566' : '#aabbcc',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 2,
                      }}>
                        {t(`building.${type}.name`, def.name)}
                      </div>

                      {/* Cost icons or lock reason */}
                      {isLocked ? (
                        <span style={{ fontSize: 7, color: '#ff8844' }}>
                          {levelLocked ? `L${def.levelRequired}` : planetLocked ? 'N/A' : 'TECH'}
                        </span>
                      ) : isAlpha ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 8 }}>
                          <span style={{ color: canAfford ? '#ddaa44' : '#884444' }}>{alphaPrice}</span>
                          <QuarksIcon size={10} />
                        </span>
                      ) : (
                        <CostIcons cost={def.cost} />
                      )}
                      {isotopeDepleted && (
                        <span style={{ marginTop: 2, fontSize: 7, color: '#ff8844', textAlign: 'center' }}>
                          {t('hex.isotope_depleted_warning', 'Ізотопи вичерпані')}
                        </span>
                      )}
                    </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
