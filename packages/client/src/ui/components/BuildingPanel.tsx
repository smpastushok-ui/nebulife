import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildingType, BuildingDef } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

interface BuildingPanelProps {
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onClose: () => void;
}

/* ---- Building PNG previews (served from /buildings/) ---- */

/** Buildings that have a real PNG preview image */
const BUILDING_PREVIEW: Partial<Record<BuildingType, string>> = {
  colony_hub:       '/buildings/colony_hub.png',
  solar_plant:      '/buildings/solar_plant.png',
  resource_storage: '/tiles/machines/resource_storage.png',
  landing_pad:      '/tiles/machines/landing_pad.png',
  spaceport:        '/tiles/machines/spaceport.png',
  alpha_harvester:  '/tiles/machines/premium_harvester_drone.png',
};

/* ---- Building icon colors (no emojis per project rules) ---- */

const BUILDING_COLORS: Partial<Record<BuildingType, string>> = {
  // Infrastructure
  colony_hub:       '#44ff88',
  resource_storage: '#66bb88',
  landing_pad:      '#88ccaa',
  spaceport:        '#aaccee',
  // Energy
  solar_plant:      '#ffcc44',
  battery_station:  '#ffdd88',
  wind_generator:   '#88ddff',
  thermal_generator:'#ff8844',
  fusion_reactor:   '#ff4466',
  // Extraction
  mine:             '#ff8844',
  water_extractor:  '#44ccff',
  atmo_extractor:   '#66aacc',
  deep_drill:       '#cc8844',
  orbital_collector:'#4466ff',
  // Science
  research_lab:     '#4488ff',
  observatory:      '#cc88ff',
  radar_tower:      '#88aaff',
  orbital_telescope:'#aa66ff',
  quantum_computer: '#dd44ff',
  // Biosphere
  greenhouse:       '#88ff44',
  residential_dome: '#aaffaa',
  atmo_shield:      '#44ddaa',
  biome_dome:       '#66ff88',
  // Chemistry
  quantum_separator:'#ff44aa',
  gas_fractionator: '#ff6688',
  isotope_centrifuge:'#cc4488',
  genesis_vault:    '#ff88cc',
  // Premium
  alpha_harvester:  '#ffcc44',
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
      // 3×3 grid of solar panel cells
      const cellW = s * 0.42;
      const cellH = s * 0.28;
      const gap   = s * 0.07;
      const startX = cx - (cellW * 1.5 + gap);
      const startY = cy - (cellH * 1.5 + gap);
      for (let r = 0; r < 3; r++) {
        for (let c2 = 0; c2 < 3; c2++) {
          const rx = startX + c2 * (cellW + gap);
          const ry = startY + r  * (cellH + gap);
          ctx.fillStyle = col;
          ctx.fillRect(rx, ry, cellW, cellH);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(rx + 1, ry + 1, cellW - 3, cellH * 0.45);
        }
      }
      break;
    }
    case 'alpha_harvester': {
      // Quadcopter drone: central body + 4 diagonal arms + rotor circles
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const armLen = s * 0.58;
      ctx.lineWidth = 1.5;
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number,number][]) {
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(cx + dx * s * 0.22, cy + dy * s * 0.22);
        ctx.lineTo(cx + dx * armLen,   cy + dy * armLen);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx + dx * armLen, cy + dy * armLen, s * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
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
  t,
}: {
  def: BuildingDef;
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}) {
  const previewSrc = BUILDING_PREVIEW[type];
  const name = t(`building.${type}.name`);
  const desc = t(`building.${type}.desc`);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: 0,
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
      {/* PNG preview (full-width) when available AND selected */}
      {previewSrc && isSelected && (
        <div style={{
          width: '100%',
          background: 'rgba(12,22,40,0.95)',
          borderBottom: '1px solid rgba(60, 100, 160, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px 0',
        }}>
          <img
            src={previewSrc}
            alt={name}
            style={{
              width: 160,
              height: 160,
              objectFit: 'contain',
              imageRendering: 'pixelated',
              filter: 'brightness(5.0) contrast(1.1) drop-shadow(0 0 8px rgba(68,136,170,0.5))',
            }}
          />
        </div>
      )}
      {/* Row: icon + info — canvas icon always (PNG is dark/ambiguous at 28px) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <BuildingIcon type={type} size={28} />
        <div>
          <div style={{ fontWeight: isSelected ? 'bold' : 'normal', marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 10, color: '#667788' }}>{desc}</div>
          <div style={{ fontSize: 10, color: '#886644', marginTop: 2 }}>
            {def.cost.map((c) => `${c.amount} ${c.resource}`).join(', ')}
          </div>
          {(def.sizeW ?? 1) > 1 && (
            <div style={{ fontSize: 9, color: '#445566', marginTop: 2 }}>
              {def.sizeW}x{def.sizeH} {t('surface.cells')}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function BuildingPanel({ selectedBuilding, onSelectBuilding, onClose }: BuildingPanelProps) {
  const { t } = useTranslation();
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
        <span style={{ color: '#aaccee', fontSize: 13 }}>{t('surface.build_panel')}</span>
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
          {t('surface.build_place_hint')}
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
          t={t}
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
          {t('surface.cancel_selection')}
        </button>
      )}
    </div>
  );
}
