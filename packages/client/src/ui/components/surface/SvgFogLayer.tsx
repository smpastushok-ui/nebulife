import React, { useMemo } from 'react';
import { CELL_W, CELL_H, gridToSvg, computeVisibleRange } from './surface-svg-utils';

interface SvgFogLayerProps {
  gridSize: number;
  revealedCells: Set<string>;
  viewBox: { x: number; y: number; w: number; h: number };
}

/**
 * Batched SVG fog layer.
 * Builds a single <path> for all unrevealed cells inside the visible viewport.
 * Edge cells (adjacent to a revealed cell) use a lighter opacity so the
 * boundary between fog and terrain has a soft gradient feel.
 */
export const SvgFogLayer = React.memo(function SvgFogLayer({
  gridSize,
  revealedCells,
  viewBox,
}: SvgFogLayerProps) {
  const { minCol, maxCol, minRow, maxRow } = computeVisibleRange(viewBox, gridSize);

  const { fogPath, edgePath } = useMemo(() => {
    let fog = '';
    let edge = '';

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        if (revealedCells.has(`${col},${row}`)) continue;

        const { x, y } = gridToSvg(col, row);
        // Diamond path for this cell (top, right, bottom, left vertices)
        const diamond =
          `M${x},${y - CELL_H} ` +
          `L${x + CELL_W},${y} ` +
          `L${x},${y + CELL_H} ` +
          `L${x - CELL_W},${y} Z `;

        // Classify as edge cell if any orthogonal neighbor is revealed
        const isEdge = (
          revealedCells.has(`${col - 1},${row}`) ||
          revealedCells.has(`${col + 1},${row}`) ||
          revealedCells.has(`${col},${row - 1}`) ||
          revealedCells.has(`${col},${row + 1}`)
        );

        if (isEdge) {
          edge += diamond;
        } else {
          fog += diamond;
        }
      }
    }

    return { fogPath: fog, edgePath: edge };
  }, [minCol, maxCol, minRow, maxRow, revealedCells]);

  return (
    <g>
      {/* Dense fog for cells far from revealed area */}
      {fogPath && (
        <path
          d={fogPath}
          fill="rgba(255,255,255,0.88)"
        />
      )}
      {/* Lighter fog for cells at the edge of revealed area */}
      {edgePath && (
        <path
          d={edgePath}
          fill="rgba(255,255,255,0.5)"
        />
      )}
    </g>
  );
});
