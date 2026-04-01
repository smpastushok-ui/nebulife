import React from 'react';
import { IsoBlock } from './IsoBlock';
import {
  TERRAIN_COLORS,
  terrainDepth,
  CELL_W,
  CELL_H,
  gridToSvg,
} from './surface-svg-utils';
import {
  classifyCellTerrain,
  isWaterTerrain,
  isTreeCell,
  isOreCell,
  isVentCell,
} from '../../../game/scenes/surface-utils.js';

interface TerrainCellProps {
  col: number;
  row: number;
  seed: number;
  waterLevel: number;
  gridSize: number;
  delay: number;
  harvested?: string;
}

// Стильне блочне дерево (стакані IsoBlock кубики)
function TreeOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBlock x={x} y={y} w={3} h={2} depth={8} topColor="#78350f" leftColor="#581c87" rightColor="#451a03" />
      <IsoBlock x={x} y={y - 8} w={10} h={5} depth={10} topColor="#22c55e" leftColor="#16a34a" rightColor="#15803d" />
      <IsoBlock x={x} y={y - 18} w={6} h={3} depth={6} topColor="#22c55e" leftColor="#16a34a" rightColor="#15803d" />
    </g>
  );
}

// Стильна кристалічна руда (IsoBlock кубики з glow)
function OreOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBlock x={x} y={y} w={12} h={6} depth={10} topColor="#475569" leftColor="#334155" rightColor="#1e293b" glow="#10b981" />
      <IsoBlock x={x + 4} y={y - 6} w={6} h={3} depth={8} topColor="#64748b" leftColor="#475569" rightColor="#334155" />
    </g>
  );
}

// Гейзер (вент)
function VentOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y - 2} rx={6} ry={3} fill="none" stroke="#0891b2" strokeWidth="1.5" opacity="0.8" />
      <circle cx={x} cy={y - 2} r={2} fill="#22d3ee" opacity="0.6" />
      <line x1={x} y1={y - 2} x2={x - 4} y2={y - 16} stroke="#06b6d4" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" className="svg-smoke-1" />
      <line x1={x + 2} y1={y - 4} x2={x + 6} y2={y - 14} stroke="#22d3ee" strokeWidth="1" opacity="0.3" strokeLinecap="round" className="svg-smoke-2" />
    </g>
  );
}

export const TerrainCell = React.memo(function TerrainCell({
  col,
  row,
  seed,
  waterLevel,
  gridSize,
  delay,
  harvested,
}: TerrainCellProps) {
  const terrain = classifyCellTerrain(col, row, seed, waterLevel, gridSize);
  const colors = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains;
  const depth = terrainDepth(terrain);
  const { x, y } = gridToSvg(col, row);
  const isWater = isWaterTerrain(terrain as any);

  const hasTree = !harvested && !isWater && isTreeCell(col, row, seed, gridSize, waterLevel);
  const hasOre  = !harvested && !isWater && isOreCell(col, row, seed, gridSize, waterLevel);
  const hasVent = !harvested && !isWater && isVentCell(col, row, seed, gridSize, waterLevel);

  return (
    <g className={isWater ? 'svg-water' : ''}>
      <g className="svg-emerge" style={{ animationDelay: `${delay}s` }}>
        <IsoBlock
          x={x}
          y={y}
          w={CELL_W}
          h={CELL_H}
          depth={depth}
          topColor={colors.top}
          leftColor={colors.left}
          rightColor={colors.right}
        />
        {/* Декорації на рівні землі (віднімаємо depth) */}
        {hasTree && <TreeOverlay x={x} y={y - depth} />}
        {hasOre  && <OreOverlay  x={x} y={y - depth} />}
        {hasVent && <VentOverlay x={x} y={y - depth} />}
      </g>
    </g>
  );
});
