import React from 'react';
import type { BuildingType, BuildingDef } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

interface BuildingPanelProps {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onClose: () => void;
}

const BUILDING_ICONS: Record<BuildingType, string> = {
  colony_hub: '🏠',
  mine: '⛏',
  solar_plant: '☀',
  research_lab: '🔬',
  water_extractor: '💧',
  greenhouse: '🌱',
  observatory: '🔭',
};

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 48,
  width: 240,
  background: 'rgba(5, 10, 25, 0.9)',
  borderLeft: '1px solid rgba(60, 100, 160, 0.3)',
  fontFamily: 'monospace',
  color: '#8899aa',
  fontSize: 12,
  overflowY: 'auto',
  zIndex: 100,
  pointerEvents: 'auto',
  padding: '12px 0',
};

function BuildingCard({
  def,
  icon,
  isSelected,
  onClick,
}: {
  def: BuildingDef;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 14px',
        background: isSelected ? 'rgba(40, 80, 120, 0.4)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(40, 60, 80, 0.3)',
        color: isSelected ? '#aaccee' : '#8899aa',
        fontFamily: 'monospace',
        fontSize: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: isSelected ? 'bold' : 'normal', marginBottom: 2 }}>{def.name}</div>
        <div style={{ fontSize: 10, color: '#667788' }}>{def.description}</div>
        <div style={{ fontSize: 10, color: '#886644', marginTop: 2 }}>
          {def.cost.map((c) => `${c.amount} ${c.resource}`).join(', ')}
        </div>
      </div>
    </button>
  );
}

export function BuildingPanel({ selectedBuilding, onSelectBuilding, onClose }: BuildingPanelProps) {
  const buildingTypes = Object.keys(BUILDING_DEFS) as BuildingType[];

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 14px 10px',
        borderBottom: '1px solid rgba(60, 100, 160, 0.3)',
        marginBottom: 4,
      }}>
        <span style={{ color: '#aaccee', fontSize: 13 }}>Будівлі</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#667788',
            fontSize: 16,
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          &times;
        </button>
      </div>

      {/* Instruction */}
      {selectedBuilding && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(40, 80, 60, 0.3)',
          color: '#88ccaa',
          fontSize: 11,
          borderBottom: '1px solid rgba(40, 60, 80, 0.3)',
        }}>
          Натисніть на карту, щоб поставити будівлю
        </div>
      )}

      {/* Building list */}
      {buildingTypes.map((type) => (
        <BuildingCard
          key={type}
          def={BUILDING_DEFS[type]}
          icon={BUILDING_ICONS[type]}
          isSelected={selectedBuilding === type}
          onClick={() => onSelectBuilding(selectedBuilding === type ? null : type)}
        />
      ))}

      {/* Cancel selection */}
      {selectedBuilding && (
        <button
          onClick={() => onSelectBuilding(null)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(80, 40, 40, 0.3)',
            border: 'none',
            borderTop: '1px solid rgba(80, 60, 60, 0.3)',
            color: '#aa8888',
            fontFamily: 'monospace',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Скасувати вибір
        </button>
      )}
    </div>
  );
}
