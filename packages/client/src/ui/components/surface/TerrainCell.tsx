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

// Tree overlay: stacked IsoBlocks (trunk + 2 crown layers) — light palette
function TreeOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Trunk: dark warm brown */}
      <line
        x1={x}
        y1={y - 2}
        x2={x}
        y2={y - 10}
        stroke="#78350f"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Crown base layer: mid green */}
      <polygon
        points={`${x},${y - 20} ${x + 8},${y - 9} ${x - 8},${y - 9}`}
        fill="#16a34a"
        stroke="#15803d"
        strokeWidth="0.5"
      />
      {/* Crown top layer: brighter green highlight */}
      <polygon
        points={`${x},${y - 26} ${x + 5},${y - 17} ${x - 5},${y - 17}`}
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth="0.4"
      />
    </g>
  );
}

// Ore overlay: rocky lumps with glowing emerald veins — visible on light bg
function OreOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Main rock lump */}
      <polygon
        points={`${x - 5},${y - 3} ${x},${y - 10} ${x + 5},${y - 3} ${x},${y + 1}`}
        fill="#64748b"
        stroke="#059669"
        strokeWidth="1"
      />
      {/* Secondary smaller lump */}
      <polygon
        points={`${x + 3},${y - 7} ${x + 7},${y - 12} ${x + 9},${y - 7} ${x + 5},${y - 3}`}
        fill="#475569"
        stroke="#059669"
        strokeWidth="0.6"
      />
      {/* Vein glow dot */}
      <circle cx={x} cy={y - 6} r={1.5} fill="#10b981" opacity="0.85" />
    </g>
  );
}

// Vent overlay: cyan steam wisps rising — visible on light bg
function VentOverlay({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Ground vent ring */}
      <ellipse
        cx={x}
        cy={y - 2}
        rx={4}
        ry={2}
        fill="none"
        stroke="#0891b2"
        strokeWidth="1"
        opacity="0.7"
      />
      {/* Steam wisp */}
      <line
        x1={x}
        y1={y - 2}
        x2={x - 2}
        y2={y - 14}
        stroke="#06b6d4"
        strokeWidth="1.2"
        opacity="0.5"
        strokeLinecap="round"
        className="svg-smoke-1"
      />
      {/* Second wisp offset */}
      <line
        x1={x + 2}
        y1={y - 4}
        x2={x + 4}
        y2={y - 16}
        stroke="#22d3ee"
        strokeWidth="0.8"
        opacity="0.35"
        strokeLinecap="round"
        className="svg-smoke-2"
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
          glow={hasOre ? '#059669' : undefined}
        />
        {hasTree && <TreeOverlay x={x} y={y - depth} />}
        {hasOre  && <OreOverlay  x={x} y={y - depth} />}
        {hasVent && <VentOverlay x={x} y={y - depth} />}
      </g>
    </g>
  );
});
