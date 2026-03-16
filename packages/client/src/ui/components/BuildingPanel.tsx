import React, { useRef, useEffect } from 'react';
import type { BuildingType, BuildingDef } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

interface BuildingPanelProps {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onClose: () => void;
}

/* ---- Building icon colors (no emojis per project rules) ---- */

const BUILDING_COLORS: Record<BuildingType, string> = {
  colony_hub: '#44ff88',
  mine: '#ff8844',
  solar_plant: '#ffcc44',
  research_lab: '#4488ff',
  water_extractor: '#44ccff',
  greenhouse: '#88ff44',
  observatory: '#cc88ff',
};

/** Draw a procedural mini-icon onto a tiny canvas */
function drawMiniIcon(
  ctx: CanvasRenderingContext2D,
  type: BuildingType,
  size: number,
) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.35;
  const col = BUILDING_COLORS[type] ?? '#aabbcc';

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;

  switch (type) {
    case 'colony_hub': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.lineTo(cx + s * 0.7, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy - s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'mine': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'solar_plant': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.6, cy);
      ctx.lineTo(cx, cy + s * 0.7);
      ctx.lineTo(cx - s * 0.6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'research_lab': {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'water_extractor': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.8);
      ctx.quadraticCurveTo(cx + s * 0.7, cy, cx, cy + s * 0.6);
      ctx.quadraticCurveTo(cx - s * 0.7, cy, cx, cy - s * 0.8);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'greenhouse': {
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.1, s * 0.55, Math.PI, 0);
      ctx.lineTo(cx + s * 0.55, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.55, cy + s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'observatory': {
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.15, s * 0.40, Math.PI, 0);
      ctx.lineTo(cx + s * 0.3, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.40, cy - s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}

/** Canvas-based icon component (replaces emoji) */
function BuildingIcon({ type, size = 28 }: { type: BuildingType; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawMiniIcon(ctx, type, size);
  }, [type, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

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
  type,
  isSelected,
  onClick,
}: {
  def: BuildingDef;
  type: BuildingType;
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
      <BuildingIcon type={type} size={28} />
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
          type={type}
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
