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

export const CELL_W = 22;
export const CELL_H = 11;

export function gridToSvg(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * CELL_W,
    y: (col + row) * CELL_H,
  };
}

export function svgToGrid(sx: number, sy: number): { col: number; row: number } {
  const col = Math.round((sx / CELL_W + sy / CELL_H) / 2);
  const row = Math.round((sy / CELL_H - sx / CELL_W) / 2);
  return { col, row };
}

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

  const PADDING = 4;
  const minCol = Math.max(0, Math.min(...corners.map((c) => c.col)) - PADDING);
  const maxCol = Math.min(gridSize - 1, Math.max(...corners.map((c) => c.col)) + PADDING);
  const minRow = Math.max(0, Math.min(...corners.map((c) => c.row)) - PADDING);
  const maxRow = Math.min(gridSize - 1, Math.max(...corners.map((c) => c.row)) + PADDING);

  return { minCol, maxCol, minRow, maxRow };
}

// Менший контраст бокових граней — клітинки зливаються в монолітну землю
export const TERRAIN_COLORS: Record<string, { top: string; left: string; right: string }> = {
  deep_ocean: { top: '#0ea5e9', left: '#0284c7', right: '#0369a1' },
  ocean:      { top: '#38bdf8', left: '#0ea5e9', right: '#0284c7' },
  coast:      { top: '#7dd3fc', left: '#38bdf8', right: '#0ea5e9' },
  // Всі рівнинні блоки світлі і майже зливаються
  beach:      { top: '#f8fafc', left: '#e2e8f0', right: '#cbd5e1' },
  lowland:    { top: '#f1f5f9', left: '#e2e8f0', right: '#cbd5e1' },
  plains:     { top: '#e2e8f0', left: '#cbd5e1', right: '#94a3b8' },
  // Височини
  hills:      { top: '#cbd5e1', left: '#94a3b8', right: '#64748b' },
  mountains:  { top: '#94a3b8', left: '#64748b', right: '#475569' },
  peaks:      { top: '#64748b', left: '#475569', right: '#334155' },
};

export function terrainDepth(terrain: string): number {
  if (terrain === 'deep_ocean' || terrain === 'ocean' || terrain === 'coast') return 0;
  switch (terrain) {
    // Всі базові рівнини ОДНАКОВОЇ висоти — монолітна поверхня без "сходинок"
    case 'beach':     return 4;
    case 'lowland':   return 4;
    case 'plains':    return 4;
    case 'hills':     return 10;
    case 'mountains': return 18;
    case 'peaks':     return 26;
    default:          return 4;
  }
}
