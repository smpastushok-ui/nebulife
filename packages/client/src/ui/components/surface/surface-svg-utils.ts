// Re-export grid utilities from the existing surface-utils module
export {
  gridToScreen,
  screenToGrid,
  TILE_W,
  TILE_H,
  classifyCellTerrain,
  isWaterTerrain,
  isTreeCell,
  isOreCell,
  isVentCell,
  computeIsoGridSize,
} from '../../../game/scenes/surface-utils.js';

// ─── SVG-specific cell size constants ────────────────────────────────────────

/** Half-width of iso diamond in SVG coordinates (smaller than PixiJS TILE_W/2). */
export const CELL_W = 22;

/** Half-height of iso diamond in SVG coordinates (smaller than PixiJS TILE_H/2). */
export const CELL_H = 11;

// ─── SVG coordinate conversion ───────────────────────────────────────────────

/**
 * Convert grid (col, row) to SVG screen coordinates.
 * Origin is at (0, 0) for cell (0, 0).
 */
export function gridToSvg(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * CELL_W,
    y: (col + row) * CELL_H,
  };
}

/**
 * Reverse: SVG screen coordinates to grid (col, row).
 */
export function svgToGrid(sx: number, sy: number): { col: number; row: number } {
  const col = Math.round((sx / CELL_W + sy / CELL_H) / 2);
  const row = Math.round((sy / CELL_H - sx / CELL_W) / 2);
  return { col, row };
}

// ─── Viewport culling ────────────────────────────────────────────────────────

/**
 * Convert the 4 corners of a viewBox to grid coordinates and return the
 * min/max col/row range with 3-cell padding for culling.
 */
export function computeVisibleRange(
  viewBox: { x: number; y: number; w: number; h: number },
  gridSize: number,
): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  const corners = [
    svgToGrid(viewBox.x, viewBox.y),
    svgToGrid(viewBox.x + viewBox.w, viewBox.y),
    svgToGrid(viewBox.x, viewBox.y + viewBox.h),
    svgToGrid(viewBox.x + viewBox.w, viewBox.y + viewBox.h),
  ];

  const PADDING = 3;
  const minCol = Math.max(0, Math.min(...corners.map((c) => c.col)) - PADDING);
  const maxCol = Math.min(gridSize - 1, Math.max(...corners.map((c) => c.col)) + PADDING);
  const minRow = Math.max(0, Math.min(...corners.map((c) => c.row)) - PADDING);
  const maxRow = Math.min(gridSize - 1, Math.max(...corners.map((c) => c.row)) + PADDING);

  return { minCol, maxCol, minRow, maxRow };
}

// ─── Terrain colors (dark cosmic palette) ────────────────────────────────────

export const TERRAIN_COLORS: Record<string, { top: string; left: string; right: string }> = {
  deep_ocean: { top: '#0a1428', left: '#081020', right: '#060c18' },
  ocean:      { top: '#0d1f35', left: '#0a1828', right: '#081420' },
  coast:      { top: '#163050', left: '#102540', right: '#0c1e35' },
  beach:      { top: '#3a5533', left: '#2d4428', right: '#264020' },
  lowland:    { top: '#3d6b3d', left: '#2d4f2d', right: '#254525' },
  plains:     { top: '#4a7a3f', left: '#3a5e30', right: '#305028' },
  hills:      { top: '#6b8c5a', left: '#4f6d40', right: '#456035' },
  mountains:  { top: '#8a9988', left: '#667766', right: '#5a6a5a' },
  peaks:      { top: '#a0aaa0', left: '#778877', right: '#6a7a6a' },
};

// ─── Terrain block depth ─────────────────────────────────────────────────────

/**
 * Height of the isometric block face in SVG pixels.
 * Water terrain is flat (depth 0) to avoid z-fighting.
 */
export function terrainDepth(terrain: string): number {
  // Water types are flat
  if (terrain === 'deep_ocean' || terrain === 'ocean' || terrain === 'coast') return 0;
  switch (terrain) {
    case 'beach':     return 2;
    case 'lowland':   return 4;
    case 'plains':    return 6;
    case 'hills':     return 12;
    case 'mountains': return 20;
    case 'peaks':     return 28;
    default:          return 4;
  }
}
