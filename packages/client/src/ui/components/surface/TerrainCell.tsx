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
  cellHash,
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

const TREE_LEAVES = [
  { top: '#22c55e', left: '#16a34a', right: '#15803d' }, // classic green
  { top: '#10b981', left: '#059669', right: '#047857' }, // emerald
  { top: '#f59e0b', left: '#d97706', right: '#b45309' }, // autumn orange
  { top: '#84cc16', left: '#65a30d', right: '#4d7c0f' }, // lime
  { top: '#06b6d4', left: '#0891b2', right: '#0e7490' }, // cyan alien
];

// Стильне блочне дерево — різної величини через scale
function TreeOverlay({ x, y, variant, scale }: { x: number; y: number; variant: number; scale: number }) {
  const leaves = TREE_LEAVES[variant % TREE_LEAVES.length];
  const s = scale;
  return (
    <g>
      <IsoBlock x={x} y={y} w={3 * s} h={2 * s} depth={8 * s} topColor="#78350f" leftColor="#581c87" rightColor="#451a03" />
      <IsoBlock x={x} y={y - 8 * s} w={10 * s} h={5 * s} depth={10 * s} topColor={leaves.top} leftColor={leaves.left} rightColor={leaves.right} />
      <IsoBlock x={x} y={y - 18 * s} w={6 * s} h={3 * s} depth={6 * s} topColor={leaves.top} leftColor={leaves.left} rightColor={leaves.right} />
    </g>
  );
}

// Кристалічна руда — вдвічі менша
function OreOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBlock x={x} y={y} w={6} h={3} depth={5} topColor="#475569" leftColor="#334155" rightColor="#1e293b" glow="#10b981" />
      <IsoBlock x={x + 2} y={y - 3} w={3} h={1.5} depth={4} topColor="#64748b" leftColor="#475569" rightColor="#334155" />
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

  const treeVariant = hasTree ? Math.floor(cellHash(col, row, seed + 7777) * TREE_LEAVES.length) : 0;
  const treeScale = hasTree ? 0.7 + cellHash(col, row, seed + 3333) * 0.6 : 1; // 0.7 to 1.3

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
        {hasTree && <TreeOverlay x={x} y={y - depth} variant={treeVariant} scale={treeScale} />}
        {hasOre  && <OreOverlay  x={x} y={y - depth} />}
        {hasVent && <VentOverlay x={x} y={y - depth} />}
      </g>
    </g>
  );
});
