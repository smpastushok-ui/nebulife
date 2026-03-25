import React from 'react';
import type { PlacedBuilding, AdjacencyBonus } from '@nebulife/core';
import { BUILDING_DEFS, getActiveBonuses } from '@nebulife/core';
import { C, sectionTitle, statRow } from '../building-menu-styles.js';
import { getScaledProduction } from '../building-menu-utils.js';
import { MineralIcon, VolatileIcon, IsotopeIcon, EnergyIcon } from '../BuildingIcons.js';
import { useColony } from '../../../contexts/ColonyContext.js';

const RESOURCE_LABEL: Record<string, string> = {
  minerals:      'Мінерали',
  volatiles:     'Летючі',
  isotopes:      'Ізотопи',
  researchData:  'Дані дослідж.',
  habitability:  'Придатність',
  energy:        'Енергія',
};

const RESOURCE_COLOR: Record<string, string> = {
  minerals:     C.mineralColor,
  volatiles:    C.volatileColor,
  isotopes:     C.isotopeColor,
  researchData: C.researchColor,
  habitability: C.habitColor,
  energy:       C.energyColor,
};

function ResourceIcon({ resource, size = 12 }: { resource: string; size?: number }) {
  switch (resource) {
    case 'minerals': return <MineralIcon size={size} />;
    case 'volatiles': return <VolatileIcon size={size} />;
    case 'isotopes': return <IsotopeIcon size={size} />;
    case 'energy': return <EnergyIcon size={size} />;
    default: return null;
  }
}

interface Props {
  building: PlacedBuilding;
  allBuildings: PlacedBuilding[];
}

/** Observatory research slots by level: lv1-2=1, lv3-4=2, lv5=3 */
function getObservatorySlots(level: number): number {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

export default function StatsTab({ building, allBuildings }: Props) {
  const def = BUILDING_DEFS[building.type];
  const level = building.level;
  const bonusMap = getActiveBonuses(allBuildings);
  const activeBonuses = bonusMap.get(building.id) ?? [];
  const { resources } = useColony();

  const hasProduction = def.production.length > 0;
  const hasConsumption = def.consumption.length > 0;
  const hasEnergy = def.energyOutput > 0 || def.energyConsumption > 0;
  const hasStorage = def.storageCapacityAdd > 0 || def.energyStorageAdd > 0;
  const hasPopulation = def.populationCapacityAdd > 0;
  const hasFog = def.fogRevealRadius > 0;

  // Fuel warning for fusion_reactor
  const needsFuelWarning = building.type === 'fusion_reactor'
    && def.consumption.some(c => c.resource === 'isotopes')
    && resources.isotopes < 1;

  return (
    <div>
      {/* Description */}
      <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 10, lineHeight: 1.4 }}>
        {def.description}
      </div>

      {/* Production */}
      {hasProduction && (
        <>
          <div style={sectionTitle}>Виробництво</div>
          {def.production.map((p, i) => {
            const scaled = getScaledProduction(p.amount, level);
            const color = RESOURCE_COLOR[p.resource] ?? C.textSecondary;
            return (
              <div key={i} style={statRow}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ResourceIcon resource={p.resource} />
                  <span>{RESOURCE_LABEL[p.resource] ?? p.resource}</span>
                </span>
                <span style={{ color, fontWeight: 'bold' }}>
                  +{scaled < 0.1 ? scaled.toFixed(3) : scaled.toFixed(1)}/тік
                </span>
              </div>
            );
          })}
        </>
      )}

      {/* Consumption */}
      {hasConsumption && (
        <>
          <div style={sectionTitle}>Споживання</div>
          {def.consumption.map((c, i) => (
            <div key={i} style={statRow}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ResourceIcon resource={c.resource} />
                <span>{RESOURCE_LABEL[c.resource] ?? c.resource}</span>
              </span>
              <span style={{ color: C.orange }}>
                -{c.amount}/тік
              </span>
            </div>
          ))}
        </>
      )}

      {/* Energy */}
      {hasEnergy && (
        <>
          <div style={sectionTitle}>Енергія</div>
          {def.energyOutput > 0 && (
            <div style={statRow}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <EnergyIcon />
                <span>Генерація</span>
              </span>
              <span style={{ color: C.green, fontWeight: 'bold' }}>
                +{(def.energyOutput * (1 + 0.15 * (level - 1))).toFixed(1)} E/тік
              </span>
            </div>
          )}
          {def.energyConsumption > 0 && (
            <div style={statRow}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <EnergyIcon />
                <span>Споживання</span>
              </span>
              <span style={{ color: C.orange }}>
                -{def.energyConsumption} E/тік
              </span>
            </div>
          )}
        </>
      )}

      {/* Capacity bonuses */}
      {(hasStorage || hasPopulation || hasFog) && (
        <>
          <div style={sectionTitle}>Бонуси</div>
          {def.energyStorageAdd > 0 && (
            <div style={statRow}>
              <span>Ємність енергії</span>
              <span style={{ color: C.energyColor }}>+{def.energyStorageAdd * (1 + 0.2 * (level - 1))}</span>
            </div>
          )}
          {def.storageCapacityAdd > 0 && (
            <div style={statRow}>
              <span>Ємність ресурсів</span>
              <span style={{ color: C.accentBlue }}>+{def.storageCapacityAdd * (1 + 0.2 * (level - 1))}</span>
            </div>
          )}
          {def.populationCapacityAdd > 0 && (
            <div style={statRow}>
              <span>Населення</span>
              <span style={{ color: C.green }}>+{def.populationCapacityAdd * (1 + 0.2 * (level - 1))}</span>
            </div>
          )}
          {def.fogRevealRadius > 0 && (
            <div style={statRow}>
              <span>Радіус видимості</span>
              <span style={{ color: C.accentBlue }}>{Math.round(def.fogRevealRadius * (1 + 0.1 * (level - 1)))}</span>
            </div>
          )}
        </>
      )}

      {/* Observatory research slots */}
      {building.type === 'observatory' && (
        <>
          <div style={sectionTitle}>Слоти досліджень</div>
          <div style={statRow}>
            <span>Активні слоти</span>
            <span style={{ color: C.accentBlueBright, fontWeight: 'bold' }}>
              {getObservatorySlots(level)}
            </span>
          </div>
          {level < 5 && (
            <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>
              lv3: 2 слоти | lv5: 3 слоти
            </div>
          )}
        </>
      )}

      {/* Quantum computer research bonus */}
      {building.type === 'quantum_computer' && !building.shutdown && (
        <>
          <div style={sectionTitle}>Пасивний бонус</div>
          <div style={statRow}>
            <span>Час досліджень</span>
            <span style={{ color: C.green, fontWeight: 'bold' }}>-20%</span>
          </div>
        </>
      )}

      {/* Genesis vault DNA storage bonus */}
      {building.type === 'genesis_vault' && (
        <>
          <div style={sectionTitle}>Пасивний бонус</div>
          <div style={statRow}>
            <span>Захист біорізноманіття</span>
            <span style={{ color: C.green }}>Активний</span>
          </div>
          <div style={{ color: C.textMuted, fontSize: 9, marginTop: 2 }}>
            Зберігає ДНК всіх видів планети. Запобігає вимиранню при терраформуванні.
          </div>
        </>
      )}

      {/* Fuel warning for fusion_reactor */}
      {needsFuelWarning && (
        <div style={{
          background: 'rgba(200,60,60,0.15)',
          border: `1px solid ${C.red}`,
          borderRadius: 3,
          padding: '6px 10px',
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width={14} height={14} viewBox="0 0 14 14">
            <path d="M7 1L1 13h12L7 1z" fill="none" stroke={C.red} strokeWidth={1.2} />
            <line x1="7" y1="5" x2="7" y2="9" stroke={C.red} strokeWidth={1.2} />
            <circle cx="7" cy="11" r="0.8" fill={C.red} />
          </svg>
          <span style={{ color: C.red, fontSize: 10, fontWeight: 'bold' }}>
            Немає палива (ізотопи = 0)
          </span>
        </div>
      )}

      {/* Adjacency bonuses */}
      {(def.adjacencyBonuses?.length ?? 0) > 0 && (
        <>
          <div style={sectionTitle}>Суміжність</div>
          {def.adjacencyBonuses!.map((bon, i) => {
            const isActive = activeBonuses.some(a => a.neighbor === bon.neighbor);
            return (
              <div key={i} style={{
                ...statRow,
                opacity: isActive ? 1 : 0.4,
              }}>
                <span>{BUILDING_DEFS[bon.neighbor]?.name ?? bon.neighbor}</span>
                <span style={{ color: isActive ? C.green : C.textMuted }}>
                  {bon.bonusLabel}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
