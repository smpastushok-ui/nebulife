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

// ─── Terrain colors (light palette) ──────────────────────────────────────────

export const TERRAIN_COLORS: Record<string, { top: string; left: string; right: string }> = {
  deep_ocean: { top: '#0ea5e9', left: '#0284c7', right: '#0369a1' },
  ocean:      { top: '#38bdf8', left: '#0ea5e9', right: '#0284c7' },
  coast:      { top: '#7dd3fc', left: '#38bdf8', right: '#0ea5e9' },
  beach:      { top: '#e2e8f0', left: '#cbd5e1', right: '#94a3b8' },
  lowland:    { top: '#f8fafc', left: '#e2e8f0', right: '#cbd5e1' },
  plains:     { top: '#f1f5f9', left: '#e2e8f0', right: '#cbd5e1' },
  hills:      { top: '#e2e8f0', left: '#cbd5e1', right: '#94a3b8' },
  mountains:  { top: '#94a3b8', left: '#64748b', right: '#475569' },
  peaks:      { top: '#64748b', left: '#475569', right: '#334155' },
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
