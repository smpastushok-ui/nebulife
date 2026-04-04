import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildingType, PlanetType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

interface HexBuildMenuProps {
  slotId: string;
  screenX: number;
  screenY: number;
  playerLevel: number;
  techTreeState?: any;
  colonyResources: { minerals: number; volatiles: number; isotopes: number; water: number };
  chemicalInventory?: Record<string, number>;
  planetType?: PlanetType;
  onSelect: (type: BuildingType) => void;
  onClose: () => void;
}

const RESOURCE_ABBR: Record<string, string> = {
  minerals: 'MIN', volatiles: 'VOL', isotopes: 'ISO', water: 'H2O',
};

function formatCost(def: { cost: { resource: string; amount: number }[] }): string {
  if (def.cost.length === 0) return 'FREE';
  return def.cost.map((c) => `${c.amount}${RESOURCE_ABBR[c.resource] ?? c.resource}`).join(' ');
}

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

// Building image map (same as HexSlot BUILDING_WEBP)
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
  isotope_collector: '/buildings/isotope_centrifuge.webp', // reuse centrifuge image
};

const CATEGORY_ORDER = [
  'extraction',
  'energy',
  'infrastructure',
  'science',
  'biosphere',
  'chemistry',
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  infrastructure: 'INFRA',
  energy:         'ENERGY',
  extraction:     'EXTRACT',
  science:        'SCIENCE',
  biosphere:      'BIO',
  chemistry:      'CHEM',
};

export function HexBuildMenu({
  slotId,
  screenX,
  screenY,
  playerLevel,
  techTreeState,
  colonyResources,
  chemicalInventory = {},
  planetType,
  onSelect,
  onClose,
}: HexBuildMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

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
  const allBuildings = (Object.keys(BUILDING_DEFS) as BuildingType[]).filter(t => t !== 'colony_hub');

  const grouped = CATEGORY_ORDER.reduce<Partial<Record<string, BuildingType[]>>>((acc, cat) => {
    const items = allBuildings.filter((t) => BUILDING_DEFS[t].category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // Menu positioning
  const menuW = 280;
  const menuH = 400;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const left = Math.min(Math.max(8, screenX - menuW / 2), vpW - menuW - 8);
  const top = Math.min(Math.max(8, screenY - 60), vpH - menuH - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left,
        top,
        width: menuW,
        maxHeight: menuH,
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
        padding: '6px 10px',
        borderBottom: '1px solid #1e2d3d',
      }}>
        <span style={{ color: '#7bb8ff', fontSize: 10, letterSpacing: 1.5 }}>
          {t('hex.build_menu', 'BUILD')}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#556677',
            cursor: 'pointer', fontSize: 13, padding: '0 2px', fontFamily: 'monospace',
          }}
        >
          x
        </button>
      </div>

      {/* Building list — compact cards */}
      <div style={{ padding: '2px 0' }}>
        {Object.entries(grouped).map(([cat, types]) => (
          <div key={cat}>
            {/* Category label */}
            <div style={{
              padding: '4px 10px 2px',
              fontSize: 7,
              color: '#3a5060',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              {CATEGORY_LABEL[cat] ?? cat}
            </div>

            {types!.map((type) => {
              const def = BUILDING_DEFS[type];
              const levelLocked = def.levelRequired > playerLevel;
              const techLocked = !isTechResearched(techTreeState, def.techRequired);
              const planetLocked = planetType ? !def.allowedPlanetTypes.includes(planetType) : false;
              const isLocked = levelLocked || techLocked || planetLocked;
              const canAfford = !isLocked && canAffordBuilding(def, colonyResources, chemicalInventory);
              const costStr = formatCost(def);
              const imgSrc = BUILDING_IMG[type];

              return (
                <div
                  key={type}
                  onClick={() => { if (canAfford) { onSelect(type); onClose(); } }}
                  style={{
                    padding: '4px 8px',
                    cursor: canAfford ? 'pointer' : isLocked ? 'default' : 'not-allowed',
                    borderBottom: '1px solid rgba(20,30,40,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: isLocked ? 0.3 : canAfford ? 1 : 0.5,
                    filter: isLocked ? 'grayscale(1)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLocked) (e.currentTarget as HTMLDivElement).style.background = 'rgba(68,136,170,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {/* Building thumbnail */}
                  <div style={{
                    width: 36, height: 36, flexShrink: 0,
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'rgba(15,25,35,0.8)',
                    border: isLocked ? '1px dashed #2a3a4a' : '1px solid #334455',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  }}>
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={type}
                        style={{
                          width: '100%', height: 'auto',
                          opacity: isLocked ? 0.25 : 0.9,
                        }}
                      />
                    )}
                  </div>

                  {/* Info column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name + level badge */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{
                        fontSize: 10, color: isLocked ? '#445566' : '#aabbcc',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {t(`building.${type}.name`, def.name)}
                      </span>
                      {isLocked && (
                        <span style={{
                          fontSize: 8, color: '#ff8844',
                          whiteSpace: 'nowrap',
                        }}>
                          {levelLocked ? `L${def.levelRequired}` : planetLocked ? 'N/A' : 'TECH'}
                        </span>
                      )}
                    </div>

                    {/* Cost row — only for unlocked */}
                    {!isLocked && (
                      <div style={{
                        fontSize: 8, color: canAfford ? '#4488aa' : '#884444',
                        marginTop: 1,
                      }}>
                        {costStr}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
