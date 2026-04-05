import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildingType, PlanetType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

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
  quarks?: number;
  alphaHarvesterCount?: number;
  onSelect: (type: BuildingType) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Resource cost icons — SVG icons matching ResourceDisplay (top HUD)
// ---------------------------------------------------------------------------

const RESOURCE_SVG: Record<string, (s: number) => React.ReactElement> = {
  minerals: (s) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="#aa8855" strokeWidth="1.2"><path d="M8 2L13 7L8 14L3 7Z" /><line x1="3" y1="7" x2="13" y2="7" /></svg>,
  volatiles: (s) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="#55aaaa" strokeWidth="1.2"><circle cx="6" cy="9" r="3" /><circle cx="10" cy="8" r="3.5" /><circle cx="8" cy="6" r="2.5" /></svg>,
  isotopes: (s) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="#88aa44" strokeWidth="1.2"><circle cx="8" cy="8" r="2" /><ellipse cx="8" cy="8" rx="6" ry="2.5" /><ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(60 8 8)" /></svg>,
  water: (s) => <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="#3b82f6" strokeWidth="1.2"><path d="M8 2C8 2 3 8 3 11C3 13.8 5.2 15 8 15C10.8 15 13 13.8 13 11C13 8 8 2 8 2Z" /></svg>,
};

function CostIcons({ cost }: { cost: { resource: string; amount: number }[] }) {
  if (cost.length === 0) return <span style={{ fontSize: 7, color: '#4488aa' }}>FREE</span>;
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
      {cost.map((c) => {
        const iconFn = RESOURCE_SVG[c.resource];
        if (!iconFn) return null;
        return (
          <span key={c.resource} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {iconFn(10)}
            <span style={{ fontSize: 7, color: '#aabbcc' }}>{c.amount}</span>
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
  quarks = 0,
  alphaHarvesterCount = 0,
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

                  // Alpha harvester: quarks price instead of colony resources
                  const isAlpha = type === 'alpha_harvester';
                  const alphaPrice = isAlpha ? getAlphaHarvesterPrice(alphaHarvesterCount) : 0;
                  const canAfford = !isLocked && (isAlpha
                    ? quarks >= alphaPrice
                    : canAffordBuilding(def, colonyResources, chemicalInventory));
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
                      ) : isAlpha ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 8 }}>
                          <span style={{ color: canAfford ? '#ddaa44' : '#884444' }}>{alphaPrice}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={canAfford ? '#ddaa44' : '#884444'} strokeWidth="2.5">
                            <circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                          </svg>
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
