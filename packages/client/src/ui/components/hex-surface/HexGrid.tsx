import React, { useMemo, useRef, useEffect } from 'react';
import { getHexPositions, HEX_RADIUS } from './hex-utils';
import type { HexSlotData, HexPlanetSize } from './hex-utils';
import { HexSlot } from './HexSlot';

const LANDSCAPE_COLS: Record<HexPlanetSize, number> = {
  orbital: 4,
  small: 5,
  medium: 6,
  large: 8,
};

const LANDSCAPE_STEP_X = 132;
const LANDSCAPE_STEP_Y = 128;

interface HexGridProps {
  slots: HexSlotData[];
  planetSize?: HexPlanetSize;
  horizontal?: boolean;
  onUnlock: (id: string) => boolean;
  onInsufficient?: (id: string) => void;
  onHarvest: (id: string) => void;
  onBuild: (id: string) => void;
  onInspect: (id: string) => void;
  onDestroy: (id: string) => void;
  canAffordUnlock: (slotId: string) => boolean;
  zoom: number;
  panX: number;
  panY: number;
  onTransformRef?: (el: HTMLDivElement | null) => void;
  shutdownBuildingTypes?: Set<string>;
}

export const HexGrid = React.memo(function HexGrid({
  slots,
  planetSize = 'medium',
  horizontal = false,
  onUnlock,
  onInsufficient,
  onHarvest,
  onBuild,
  onInspect,
  onDestroy,
  canAffordUnlock,
  zoom,
  panX,
  panY,
  onTransformRef,
  shutdownBuildingTypes,
}: HexGridProps) {
  // Compute hex positions for this planet size
  const positions = useMemo(() => {
    const basePositions = getHexPositions(planetSize);
    if (!horizontal) return basePositions;

    const cols = LANDSCAPE_COLS[planetSize];
    return basePositions
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map((p, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const stagger = row % 2 === 1 ? LANDSCAPE_STEP_X * 0.5 : 0;

        return {
          ...p,
          // Desktop/web uses a separate staggered formation. Slot ids and ring
          // data stay untouched, so saves and unlock logic remain compatible.
          x: col * LANDSCAPE_STEP_X + stagger,
          y: row * LANDSCAPE_STEP_Y,
        };
      });
  }, [horizontal, planetSize]);

  // Find bounding box to auto-center the grid
  const { minX, minY, maxX, maxY } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of positions) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }, [positions]);

  const gridW = maxX - minX + HEX_RADIUS * 2;
  const gridH = maxY - minY + HEX_RADIUS * 2;

  // Map slot id -> position + zOffset for O(1) lookup
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; zOffset: number }>();
    for (const p of positions) {
      m.set(p.id, {
        x:       p.x - minX + HEX_RADIUS,
        y:       p.y - minY + HEX_RADIUS,
        zOffset: p.zOffset,
      });
    }
    return m;
  }, [positions, minX, minY]);

  // O(1) slot lookup by id — recalculated only when slots array changes
  const slotById = useMemo(() => new Map(slots.map(s => [s.id, s])), [slots]);

  // Pre-sorted slot render order by Y (isometric z-order) — computed once, not per render
  const sortedSlotOrder = useMemo(() => {
    return positions
      .map(p => ({
        id: p.id,
        y: (p.y - minY + HEX_RADIUS) + p.zOffset,
      }))
      .sort((a, b) => a.y - b.y)
      .map((item, i) => ({ id: item.id, zIndex: i + 1 }));
  }, [positions, minY]);

  // Direct DOM mutation for pan/zoom — bypasses React render cycle for 120fps
  const transformRef = useRef<HTMLDivElement>(null);
  const refCallback = React.useCallback((el: HTMLDivElement | null) => {
    transformRef.current = el;
    onTransformRef?.(el);
  }, [onTransformRef]);

  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.style.transform =
        `scale(${zoom}) translate3d(calc(-50% + ${panX}px), calc(-50% + ${panY}px), 0)`;
    }
  }, [zoom, panX, panY]);

  return (
    /* Outer wrapper: fills parent, clips overflow */
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'visible',
      pointerEvents: 'none',
    }}>
      {/*
        Transform layer: GPU-accelerated via translate3d.
        Pan/zoom updated via ref (direct DOM) — no React re-render.
      */}
      <div
        ref={refCallback}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `scale(${zoom}) translate3d(calc(-50% + ${panX}px), calc(-50% + ${panY}px), 0)`,
          transformOrigin: '0 0',
          width: gridW,
          height: gridH,
          pointerEvents: 'auto',
          // Removed willChange: 'transform' — it kept a permanent GPU compositor
          // layer alive even when idle. translate3d() already triggers layer
          // promotion during active pans, which is enough.
        }}
      >
        {/* Render in pre-sorted Y order (isometric z-index) — no runtime .sort() */}
        {/* Stable callbacks (no arrow wrapper) — preserves React.memo on HexSlot */}
        {sortedSlotOrder.map(({ id, zIndex }) => {
          const slot = slotById.get(id);
          const pos = posMap.get(id);
          if (!slot || !pos) return null;
          return (
            <HexSlot
              key={id}
              id={id}
              slot={slot}
              x={pos.x}
              y={pos.y + pos.zOffset}
              zIndex={zIndex}
              canAfford={canAffordUnlock(id)}
              onUnlock={onUnlock}
              onInsufficient={onInsufficient}
              onHarvest={onHarvest}
              onBuild={onBuild}
              onInspect={onInspect}
              onDestroy={onDestroy}
              isShutdown={shutdownBuildingTypes?.has(slot.buildingType ?? '') ?? false}
            />
          );
        })}
      </div>
    </div>
  );
});
