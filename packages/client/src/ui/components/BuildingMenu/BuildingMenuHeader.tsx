import React from 'react';
import type { PlacedBuilding, BuildingCategory } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { BuildingIcon } from './BuildingIcons.js';
import { C } from './building-menu-styles.js';
import { MAX_BUILDING_LEVEL } from './building-menu-utils.js';

const CATEGORY_LABEL: Record<string, string> = {
  infrastructure: 'Інфраструктура',
  energy:         'Енергетика',
  extraction:     'Видобуток',
  science:        'Наука',
  biosphere:      'Біосфера',
  chemistry:      'Хімія',
  premium:        'Преміум',
};

interface Props {
  building: PlacedBuilding;
  onClose: () => void;
}

export default function BuildingMenuHeader({ building, onClose }: Props) {
  const def = BUILDING_DEFS[building.type];
  const isShutdown = building.shutdown === true;

  return (
    <div style={{
      background: C.headerBg,
      borderBottom: `1px solid ${C.border}`,
      padding: '10px 12px 8px',
    }}>
      {/* Top row: icon + name + close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BuildingIcon type={building.type} size={24} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: C.textPrimary,
            fontSize: 13,
            fontWeight: 'bold',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {def?.name ?? building.type}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: C.textMuted,
            cursor: 'pointer',
            fontSize: 16,
            fontFamily: 'monospace',
            padding: '0 0 0 8px',
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      {/* Bottom row: category + level + shutdown */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
      }}>
        <span style={{ color: C.textMuted, fontSize: 10 }}>
          {CATEGORY_LABEL[def?.category ?? ''] ?? def?.category}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isShutdown && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: C.shutdownPulse,
              fontSize: 10,
              animation: 'bm-pulse 1.5s ease-in-out infinite',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: C.shutdownPulse,
                display: 'inline-block',
              }} />
              Вимкнено
            </span>
          )}
          <LevelBadge level={building.level} max={MAX_BUILDING_LEVEL} />
        </div>
      </div>
    </div>
  );
}

function LevelBadge({ level, max }: { level: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: C.textSecondary, fontSize: 10 }}>Рв.</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: i < level ? C.accentBlue : 'rgba(40,60,80,0.5)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ color: C.textSecondary, fontSize: 10 }}>
        {level}/{max}
      </span>
    </div>
  );
}
