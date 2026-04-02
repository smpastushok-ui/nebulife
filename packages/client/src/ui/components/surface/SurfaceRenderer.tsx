/**
 * SurfaceRenderer.tsx
 * Pure SVG renderer for the isometric surface.
 * Receives all state as props and returns SVG elements.
 * No PixiJS, no side effects — pure render function.
 *
 * Only discovered tiles are rendered (no full grid, no fog layer).
 * Background is handled by the parent container (white).
 */

import React, { useMemo } from 'react';
import type { Planet, PlacedBuilding, BuildingType, HarvestedCell } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { TerrainCell } from './TerrainCell';
import { IsoBuilding } from './IsoBuildingComposites';
import { SvgBot } from './SvgBot';
import { SvgDrone } from './SvgDrone';
import { IsoBlock } from './IsoBlock';
import {
  gridToSvg,
  computeVisibleRange,
  CELL_W,
  CELL_H,
} from './surface-svg-utils';
import type { BotAnimState, DroneAnimState } from './useSurfaceState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SurfaceRendererProps {
  gridSize: number;
  planet: Planet;
  buildings: PlacedBuilding[];
  viewBox: { x: number; y: number; w: number; h: number };
  harvestedCells: Map<string, HarvestedCell>;
  /** Set of "col,row" keys for tiles that have been discovered and should be rendered. */
  discoveredTiles: Set<string>;
  selectedBuilding: BuildingType | null;
  ghostPosition: { col: number; row: number } | null;
  ghostValid: boolean;
  botState: BotAnimState | null;
  droneStates: DroneAnimState[];
  harvestRing: { col: number; row: number; progress: number } | null;
  hubCol: number;
  hubRow: number;
  /** canBuildAt validator from useSurfaceState — used for zone overlay */
  canBuildAt: (col: number, row: number, type: BuildingType, buildings: PlacedBuilding[]) => boolean;
  /** Track newly placed building id for entrance animation */
  newBuildingId?: string;
}

// ─── Zone overlay diamond ─────────────────────────────────────────────────────

function ZoneDiamond({
  x,
  y,
  valid,
}: {
  x: number;
  y: number;
  valid: boolean;
}) {
  const fill = valid ? 'rgba(68,255,136,0.18)' : 'rgba(255,80,80,0.15)';
  const stroke = valid ? 'rgba(68,255,136,0.55)' : 'rgba(255,80,80,0.5)';

  return (
    <polygon
      points={`${x},${y - CELL_H} ${x + CELL_W},${y} ${x},${y + CELL_H} ${x - CELL_W},${y}`}
      fill={fill}
      stroke={stroke}
      strokeWidth="0.6"
    />
  );
}

// ─── Harvest ring component ───────────────────────────────────────────────────

function HarvestRingOverlay({
  col,
  row,
  progress,
}: {
  col: number;
  row: number;
  progress: number;
}) {
  const { x, y } = gridToSvg(col, row);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <circle
      cx={x}
      cy={y - 12}
      r={radius}
      fill="none"
      stroke="#44ff88"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={String(circumference)}
      strokeDashoffset={String(dashOffset)}
      style={{
        transform: 'rotate(-90deg)',
        transformOrigin: `${x}px ${y - 6}px`,
        transition: 'stroke-dashoffset 0.1s linear',
      }}
    />
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export const SurfaceRenderer = React.memo(function SurfaceRenderer({
  gridSize,
  planet,
  buildings,
  viewBox,
  harvestedCells,
  discoveredTiles,
  selectedBuilding,
  ghostPosition,
  ghostValid,
  botState,
  droneStates,
  harvestRing,
  hubCol,
  hubRow,
  canBuildAt,
  newBuildingId,
}: SurfaceRendererProps) {
  const seed = planet.seed;
  const waterLevel = planet.hydrosphere?.waterCoverageFraction ?? 0;

  // ── Viewport culling ──────────────────────────────────────────────────────
  const { minCol, maxCol, minRow, maxRow } = useMemo(
    () => computeVisibleRange(viewBox, gridSize),
    [viewBox, gridSize],
  );

  // ── Terrain cells — only discovered tiles, Z-sorted by col+row ───────────
  const terrainCells = useMemo(() => {
    const cells: React.ReactNode[] = [];

    // Collect only discovered cells within the visible viewport
    const pairs: Array<{ col: number; row: number; discKey: string }> = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = `${col},${row}`;
        if (!discoveredTiles.has(key)) continue;
        pairs.push({ col, row, discKey: key });
      }
    }

    // Sort by Z depth (col+row ascending = back to front)
    pairs.sort((a, b) => (a.col + a.row) - (b.col + b.row));

    for (const { col, row } of pairs) {
      const hc = harvestedCells.get(`${col},${row}`);
      const harvested = hc?.state ?? undefined;

      // Emerge delay proportional to distance from hub (for initial load wave effect)
      const dist = Math.abs(col - hubCol) + Math.abs(row - hubRow);
      const delay = Math.min(dist * 0.02, 1.2);

      cells.push(
        <TerrainCell
          key={`tc_${col}_${row}`}
          col={col}
          row={row}
          seed={seed}
          waterLevel={waterLevel}
          gridSize={gridSize}
          delay={delay}
          harvested={harvested}
        />,
      );
    }
    return cells;
  }, [
    minCol, maxCol, minRow, maxRow,
    discoveredTiles,
    seed, waterLevel, gridSize,
    harvestedCells,
    hubCol, hubRow,
  ]);

  // ── Zone overlay — visible when placing a building ────────────────────────
  const zoneOverlay = useMemo(() => {
    if (!selectedBuilding) return null;
    const overlayNodes: React.ReactNode[] = [];

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        // Only show zone overlay on discovered tiles
        if (!discoveredTiles.has(`${col},${row}`)) continue;
        const valid = canBuildAt(col, row, selectedBuilding, buildings);
        const { x, y } = gridToSvg(col, row);
        overlayNodes.push(
          <ZoneDiamond key={`zo_${col}_${row}`} x={x} y={y} valid={valid} />,
        );
      }
    }
    return <g>{overlayNodes}</g>;
  }, [selectedBuilding, minCol, maxCol, minRow, maxRow, discoveredTiles, canBuildAt, buildings]);

  // ── Buildings — Z-sorted by col+row ──────────────────────────────────────
  const buildingNodes = useMemo(() => {
    const sorted = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    return sorted.map((b) => (
      <IsoBuilding
        key={b.id}
        building={b}
        isNew={b.id === newBuildingId}
      />
    ));
  }, [buildings, newBuildingId]);

  // ── Ghost preview ─────────────────────────────────────────────────────────
  const ghostNode = useMemo(() => {
    if (!ghostPosition || !selectedBuilding) return null;
    const { col, row } = ghostPosition;
    const { x, y } = gridToSvg(col, row);
    const def = BUILDING_DEFS[selectedBuilding];
    const sizeW = def?.sizeW ?? 1;
    const blockW = (CELL_W * sizeW) / 2;
    const blockH = (CELL_H * sizeW) / 2;
    const baseH = sizeW === 3 ? 16 : sizeW === 2 ? 12 : 8;
    const topColor = ghostValid ? 'rgba(68,255,136,0.45)' : 'rgba(255,80,80,0.4)';
    const leftColor = ghostValid ? 'rgba(40,180,80,0.35)' : 'rgba(200,40,40,0.3)';
    const rightColor = ghostValid ? 'rgba(50,200,100,0.4)' : 'rgba(220,50,50,0.35)';

    return (
      <g opacity={0.75}>
        <IsoBlock
          x={x}
          y={y}
          w={blockW}
          h={blockH}
          depth={baseH}
          topColor={topColor}
          leftColor={leftColor}
          rightColor={rightColor}
        />
      </g>
    );
  }, [ghostPosition, selectedBuilding, ghostValid]);

  // ── Harvest ring ──────────────────────────────────────────────────────────
  const harvestRingNode = harvestRing ? (
    <HarvestRingOverlay
      col={harvestRing.col}
      row={harvestRing.row}
      progress={harvestRing.progress}
    />
  ) : null;

  // ── Bot ───────────────────────────────────────────────────────────────────
  const botNode = botState ? (
    <SvgBot
      state={{
        col: botState.col,
        row: botState.row,
        state: botState.state === 'flying' ? 'flying' : botState.state === 'startup' ? 'flying' : 'idle',
      }}
    />
  ) : null;

  // ── Drones ────────────────────────────────────────────────────────────────
  const droneNodes = droneStates.map((d, i) => (
    <SvgDrone
      key={`drone_${i}`}
      state={{
        col: d.col,
        row: d.row,
        state: d.state,
      }}
    />
  ));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Layer 1: Terrain (discovered tiles only) */}
      <g>{terrainCells}</g>

      {/* Layer 2: Zone overlay */}
      {zoneOverlay}

      {/* Layer 3: Buildings */}
      <g>{buildingNodes}</g>

      {/* Layer 4: Ghost preview */}
      {ghostNode}

      {/* Layer 5: Bot */}
      {botNode}

      {/* Layer 6: Drones */}
      <g>{droneNodes}</g>

      {/* Layer 7: Harvest ring */}
      {harvestRingNode}
    </>
  );
});
