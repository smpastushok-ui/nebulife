import React from 'react';
import type { PlacedBuilding } from '@nebulife/core';
import { useColony } from '../../../contexts/ColonyContext.js';
import { C, sectionTitle, statRow } from '../building-menu-styles.js';
import { MineralIcon, VolatileIcon, IsotopeIcon } from '../BuildingIcons.js';

type SlotType = 'minerals' | 'volatiles' | 'isotopes';

const SLOT_OPTIONS: { type: SlotType; label: string; icon: React.FC<{ size?: number }> }[] = [
  { type: 'minerals',  label: 'Мінерали',  icon: MineralIcon },
  { type: 'volatiles', label: 'Летючі',    icon: VolatileIcon },
  { type: 'isotopes',  label: 'Ізотопи',   icon: IsotopeIcon },
];

interface Props {
  building: PlacedBuilding;
  onStorageTypeChange: (buildingId: string, slotType: SlotType) => void;
}

export default function StorageTab({ building, onStorageTypeChange }: Props) {
  const currentSlot = building.storageSlotType ?? 'minerals';

  return (
    <div>
      <div style={sectionTitle}>Тип ресурсу для зберігання</div>
      <div style={{ color: C.textMuted, fontSize: 10, marginBottom: 12, lineHeight: 1.4 }}>
        Оберіть тип ресурсу. Модуль додає +200 до ємності обраного типу.
      </div>

      {SLOT_OPTIONS.map(opt => {
        const isActive = currentSlot === opt.type;
        const Icon = opt.icon;
        return (
          <button
            key={opt.type}
            onClick={() => onStorageTypeChange(building.id, opt.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 12px',
              marginBottom: 4,
              background: isActive ? 'rgba(40,100,140,0.25)' : 'transparent',
              border: `1px solid ${isActive ? C.accentBlue : C.borderSubtle}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.15s',
            }}
          >
            {/* Radio circle */}
            <span style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: `2px solid ${isActive ? C.accentBlue : C.textMuted}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isActive && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: C.accentBlueBright,
                }} />
              )}
            </span>

            <Icon size={14} />
            <span style={{
              color: isActive ? C.textPrimary : C.textSecondary,
              fontSize: 11,
              flex: 1,
              textAlign: 'left',
            }}>
              {opt.label}
            </span>
            <span style={{ color: C.accentBlue, fontSize: 10 }}>+200</span>
          </button>
        );
      })}
    </div>
  );
}
