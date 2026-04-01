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
  delay: number;      // emerge animation delay in seconds
  harvested?: string; // 'stump' | 'depleted' | 'dry' | null
}

// Tree overlay: trunk + 2 crown layers
function TreeOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Trunk */}
      <line
        x1={x}
        y1={y - 2}
        x2={x}
        y2={y - 10}
        stroke="#4a3520"
        strokeWidth="2"
      />
      {/* Crown base layer */}
      <polygon
        points={`${x},${y - 18} ${x + 7},${y - 8} ${x - 7},${y - 8}`}
        fill="#2d8a3e"
      />
      {/* Crown top layer */}
      <polygon
        points={`${x},${y - 22} ${x + 5},${y - 14} ${x - 5},${y - 14}`}
        fill="#35a847"
      />
    </g>
  );
}

// Ore overlay: rocky lumps with glowing green veins
function OreOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon
        points={`${x - 4},${y - 4} ${x},${y - 8} ${x + 4},${y - 4} ${x},${y}`}
        fill="#475569"
        stroke="#10b981"
        strokeWidth="0.8"
      />
      <polygon
        points={`${x + 2},${y - 6} ${x + 6},${y - 10} ${x + 8},${y - 6} ${x + 4},${y - 2}`}
        fill="#334155"
        stroke="#10b981"
        strokeWidth="0.5"
      />
    </g>
  );
}

// Vent overlay: cyan wisps rising from the ground
function VentOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y - 4}
        r={3}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.8"
        opacity="0.6"
      />
      <line
        x1={x}
        y1={y - 4}
        x2={x}
        y2={y - 14}
        stroke="#22d3ee"
        strokeWidth="0.5"
        opacity="0.4"
        className="svg-smoke-1"
      />
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
    <g
      className={isWater ? 'svg-water' : ''}
      style={{ animationDelay: `${delay}s` }}
    >
      <g
        className="svg-emerge"
        style={{ animationDelay: `${delay}s` }}
      >
        <IsoBlock
          x={x}
          y={y}
          w={CELL_W}
          h={CELL_H}
          depth={depth}
          topColor={colors.top}
          leftColor={colors.left}
          rightColor={colors.right}
          glow={hasOre ? '#10b981' : undefined}
        />
        {hasTree && <TreeOverlay x={x} y={y - depth} />}
        {hasOre  && <OreOverlay  x={x} y={y - depth} />}
        {hasVent && <VentOverlay x={x} y={y - depth} />}
      </g>
    </g>
  );
});
