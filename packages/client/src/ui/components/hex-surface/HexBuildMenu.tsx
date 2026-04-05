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

// ---------------------------------------------------------------------------
// Resource cost icons — colored dots with amount
// ---------------------------------------------------------------------------

const RESOURCE_ICON: Record<string, { color: string; label: string }> = {
  minerals:  { color: '#aa8855', label: 'M' },
  volatiles: { color: '#22d3ee', label: 'V' },
  isotopes:  { color: '#44ff88', label: 'I' },
  water:     { color: '#3b82f6', label: 'W' },
};

function CostIcons({ cost }: { cost: { resource: string; amount: number }[] }) {
  if (cost.length === 0) return <span style={{ fontSize: 7, color: '#4488aa' }}>FREE</span>;
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
      {cost.map((c) => {
        const icon = RESOURCE_ICON[c.resource];
        if (!icon) return null;
        return (
          <span key={c.resource} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: icon.color, display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 7, color: icon.color }}>{c.amount}</span>
          </span>
        );
      })}
    </div>
  );
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
                  const canAfford = !isLocked && canAffordBuilding(def, colonyResources, chemicalInventory);
                  const imgSrc = BUILDING_IMG[type];

                  return (
                    <div
                      key={type}
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
                      ) : (
                        <CostIcons cost={def.cost} />
                      )}
                    </div>
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
