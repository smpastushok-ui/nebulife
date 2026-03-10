import React from 'react';
import type { SurfaceTile, SurfaceResourceDeposit } from '@nebulife/core';

interface SurfaceHUDProps {
  planetName: string;
  hoveredTile: SurfaceTile | null;
  hoveredResource: SurfaceResourceDeposit | null;
  buildingCount: number;
  onClose: () => void;
}

/** Terrain label in Ukrainian */
function terrainLabel(terrain: string): string {
  switch (terrain) {
    case 'deep_ocean': return 'Глибокий океан';
    case 'ocean': return 'Океан';
    case 'coast': return 'Узбережжя';
    case 'beach': return 'Пляж';
    case 'lowland': return 'Низовина';
    case 'plains': return 'Рівнина';
    case 'hills': return 'Пагорби';
    case 'mountains': return 'Гори';
    case 'peaks': return 'Вершини';
    case 'volcano': return 'Вулкан';
    default: return terrain;
  }
}

/** Biome label in Ukrainian */
function biomeLabel(biome: string): string {
  switch (biome) {
    case 'tropical_forest': return 'Тропічний ліс';
    case 'savanna': return 'Савана';
    case 'desert': return 'Пустеля';
    case 'temperate_forest': return 'Помірний ліс';
    case 'grassland': return 'Степ';
    case 'boreal_forest': return 'Тайга';
    case 'tundra': return 'Тундра';
    case 'ice': return 'Льодовик';
    case 'wetland': return 'Болото';
    case 'volcanic': return 'Вулканічна';
    default: return biome;
  }
}

/** Element label */
function elementLabel(element: string): string {
  switch (element) {
    case 'Fe': return 'Залізо (Fe)';
    case 'Cu': return 'Мідь (Cu)';
    case 'Ni': return 'Нікель (Ni)';
    case 'Ti': return 'Титан (Ti)';
    case 'U': return 'Уран (U)';
    case 'Al': return 'Алюміній (Al)';
    case 'Si': return 'Кремній (Si)';
    default: return element;
  }
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  background: 'rgba(5, 10, 25, 0.85)',
  borderBottom: '1px solid rgba(60, 100, 160, 0.3)',
  fontFamily: 'monospace',
  color: '#8899aa',
  fontSize: 13,
  zIndex: 100,
  pointerEvents: 'auto',
};

export function SurfaceHUD({ planetName, hoveredTile, hoveredResource, buildingCount, onClose }: SurfaceHUDProps) {
  return (
    <div style={panelStyle}>
      {/* Left: Planet name + building count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#aaccee', fontSize: 15 }}>{planetName}</span>
        <span style={{ color: '#667788' }}>
          Будівлі: {buildingCount}
        </span>
      </div>

      {/* Center: Tile info */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {hoveredTile && (
          <>
            <span>{terrainLabel(hoveredTile.terrain)}</span>
            <span style={{ color: '#556677' }}>|</span>
            <span>{biomeLabel(hoveredTile.biome)}</span>
            {hoveredTile.buildable && (
              <span style={{ color: '#44aa66' }}>&#9632; Можна будувати</span>
            )}
            {hoveredTile.waterBuildable && (
              <span style={{ color: '#4488aa' }}>&#9632; Водна споруда</span>
            )}
          </>
        )}
        {hoveredResource && (
          <span style={{ color: '#ddaa44' }}>
            &#9670; {elementLabel(hoveredResource.element)} ({Math.round(hoveredResource.abundance * 100)}%)
          </span>
        )}
      </div>

      {/* Right: Close button */}
      <button
        onClick={onClose}
        style={{
          background: 'rgba(40, 60, 80, 0.6)',
          border: '1px solid rgba(80, 120, 160, 0.3)',
          borderRadius: 4,
          color: '#8899aa',
          fontFamily: 'monospace',
          fontSize: 13,
          padding: '4px 12px',
          cursor: 'pointer',
        }}
      >
        &#x2190; Назад
      </button>
    </div>
  );
}
