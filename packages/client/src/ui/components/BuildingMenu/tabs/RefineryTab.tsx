import React from 'react';
import type { PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { C, sectionTitle, statRow } from '../building-menu-styles.js';
import { MineralIcon, VolatileIcon, IsotopeIcon } from '../BuildingIcons.js';
import { MAX_BUILDING_LEVEL } from '../building-menu-utils.js';

/** Base refinery cycle = 5 ticks. Level reduces cycle: floor(5 / (1 + 0.2*(level-1))) */
function getRefineryCycleTicks(level: number): number {
  return Math.max(1, Math.floor(5 / (1 + 0.20 * (level - 1))));
}

const REFINERY_INFO: Record<string, {
  inputLabel: string;
  inputPerTick: number;
  inputIcon: React.FC<{ size?: number }>;
  outputLabel: string;
  outputChance: number; // 1.0 = 100%
  elements: string[];
}> = {
  quantum_separator: {
    inputLabel: 'Мінерали',
    inputPerTick: 2,
    inputIcon: MineralIcon,
    outputLabel: 'Випадковий елемент',
    outputChance: 1.0,
    elements: ['Fe', 'Cu', 'Ti', 'Al', 'Si', 'Ni'],
  },
  gas_fractionator: {
    inputLabel: 'Летючі',
    inputPerTick: 2,
    inputIcon: VolatileIcon,
    outputLabel: 'Випадковий елемент',
    outputChance: 1.0,
    elements: ['H', 'He', 'N', 'O', 'C', 'S'],
  },
  isotope_centrifuge: {
    inputLabel: 'Ізотопи',
    inputPerTick: 1,
    inputIcon: IsotopeIcon,
    outputLabel: 'Уран (U)',
    outputChance: 0.4,
    elements: ['U'],
  },
};

interface Props {
  building: PlacedBuilding;
}

export default function RefineryTab({ building }: Props) {
  const info = REFINERY_INFO[building.type];
  const def = BUILDING_DEFS[building.type];
  const isShutdown = building.shutdown === true;

  if (!info) {
    return (
      <div style={{ color: C.textMuted, fontSize: 11, textAlign: 'center', padding: 20 }}>
        Ця будівля не має режиму переробки
      </div>
    );
  }

  const InputIcon = info.inputIcon;
  const cycleTicks = getRefineryCycleTicks(building.level);
  const outputStr = info.outputChance < 1
    ? `~${info.outputChance}/цикл (${Math.round(info.outputChance * 100)}%)`
    : `+1/цикл`;

  return (
    <div>
      {/* Status */}
      <div style={{
        ...sectionTitle,
        color: isShutdown ? C.red : C.green,
      }}>
        {isShutdown ? 'Зупинено (немає енергії)' : 'Працює'}
      </div>

      {/* Process visualization */}
      <div style={{
        background: 'rgba(15,25,40,0.4)',
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 4,
        padding: '12px 14px',
        marginBottom: 12,
      }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <InputIcon size={16} />
          <span style={{ color: C.textSecondary, fontSize: 11 }}>{info.inputLabel}</span>
          <span style={{ color: C.orange, fontSize: 11, marginLeft: 'auto', fontWeight: 'bold' }}>
            -{info.inputPerTick}/тік
          </span>
        </div>

        {/* Arrow */}
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
          <svg width={20} height={16} viewBox="0 0 20 16">
            <path d="M10 2v8m-4-3l4 4 4-4" stroke={C.accentBlue} strokeWidth={1.5} fill="none" />
          </svg>
        </div>

        {/* Output */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={16} height={16} viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="5" fill={C.accentBlue} fillOpacity={0.5} />
            <circle cx="8" cy="8" r="2" fill={C.accentBlueBright} />
          </svg>
          <span style={{ color: C.textSecondary, fontSize: 11 }}>{info.outputLabel}</span>
          <span style={{ color: C.green, fontSize: 11, marginLeft: 'auto', fontWeight: 'bold' }}>
            {outputStr}
          </span>
        </div>
      </div>

      {/* Speed / cycle info */}
      <div style={sectionTitle}>Швидкість</div>
      <div style={{ ...statRow, marginBottom: 2 }}>
        <span style={{ color: C.textSecondary, fontSize: 11 }}>Цикл переробки</span>
        <span style={{ color: C.accentBlueBright, fontSize: 11, fontWeight: 'bold' }}>
          {cycleTicks} {cycleTicks === 1 ? 'тік' : 'тіки'}
        </span>
      </div>
      {building.level < MAX_BUILDING_LEVEL && (
        <div style={{ ...statRow, marginBottom: 2 }}>
          <span style={{ color: C.textMuted, fontSize: 10 }}>Наступний рівень</span>
          <span style={{ color: C.green, fontSize: 10 }}>
            {getRefineryCycleTicks(building.level + 1)} {getRefineryCycleTicks(building.level + 1) === 1 ? 'тік' : 'тіки'}
          </span>
        </div>
      )}

      {/* Possible elements */}
      <div style={{ ...sectionTitle, marginTop: 10 }}>Можливі елементи</div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
      }}>
        {info.elements.map(el => (
          <span key={el} style={{
            display: 'inline-block',
            padding: '2px 8px',
            background: 'rgba(30,50,70,0.5)',
            border: `1px solid ${C.borderSubtle}`,
            borderRadius: 3,
            color: C.textSecondary,
            fontSize: 10,
            fontWeight: 'bold',
          }}>
            {el}
          </span>
        ))}
      </div>

      {/* Description */}
      <div style={{
        color: C.textMuted,
        fontSize: 9,
        marginTop: 14,
        lineHeight: 1.4,
      }}>
        {def.description}
      </div>
    </div>
  );
}
