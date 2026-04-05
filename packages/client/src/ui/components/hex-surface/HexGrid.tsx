import React, { useMemo, useRef, useEffect } from 'react';
import { getHexPositions, HEX_RADIUS } from './hex-utils';
import type { HexSlotData } from './hex-utils';
import { HexSlot } from './HexSlot';

interface HexGridProps {
  slots: HexSlotData[];
  onUnlock: (slotId: string) => void;
  onHarvest: (slotId: string) => void;
  onBuild: (slotId: string) => void;
  onInspect: (slotId: string) => void;
  canAffordUnlock: (slotId: string) => boolean;
  zoom: number;
  panX: number;
  panY: number;
  /** Callback to expose the transform div ref for direct DOM pan during drag */
  onTransformRef?: (el: HTMLDivElement | null) => void;
}

export const HexGrid = React.memo(function HexGrid({
  slots,
  onUnlock,
  onHarvest,
  onBuild,
  onInspect,
  canAffordUnlock,
  zoom,
  panX,
  panY,
  onTransformRef,
}: HexGridProps) {
  // Compute hex positions once (30 diamond hexes)
  const positions = useMemo(() => getHexPositions(), []);

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
      // Normalize to start at (HEX_RADIUS, HEX_RADIUS) so slots don't clip at (0,0)
      m.set(p.id, {
        x:       p.x - minX + HEX_RADIUS,
        y:       p.y - minY + HEX_RADIUS,
        zOffset: p.zOffset,
      });
    }
    return m;
  }, [positions, minX, minY]);

  // Direct DOM mutation for pan/zoom — bypasses React render cycle for 120fps
  const transformRef = useRef<HTMLDivElement>(null);
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
        ref={(el) => {
          transformRef.current = el;
          onTransformRef?.(el);
        }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `scale(${zoom}) translate3d(calc(-50% + ${panX}px), calc(-50% + ${panY}px), 0)`,
          transformOrigin: '0 0',
          width: gridW,
          height: gridH,
          pointerEvents: 'auto',
          willChange: 'transform',
        }}
      >
        {/* Sort by Y position so lower hexes render on top (correct isometric overlap) */}
        {slots
          .map((slot) => ({ slot, pos: posMap.get(slot.id) }))
          .filter((item): item is { slot: HexSlotData; pos: { x: number; y: number; zOffset: number } } => item.pos != null)
          .sort((a, b) => a.pos.y - b.pos.y)
          .map(({ slot, pos }, i) => (
            <HexSlot
              key={slot.id}
              slot={slot}
              x={pos.x}
              // Apply z-offset: outer rows are pushed down slightly to create
              // a subtle "mountain" depth effect where the centre appears elevated
              y={pos.y + pos.zOffset}
              zIndex={i + 1}
              canAfford={canAffordUnlock(slot.id)}
              onUnlock={() => onUnlock(slot.id)}
              onHarvest={() => onHarvest(slot.id)}
              onBuild={() => onBuild(slot.id)}
              onInspect={() => onInspect(slot.id)}
            />
          ))}
      </div>
    </div>
  );
});
