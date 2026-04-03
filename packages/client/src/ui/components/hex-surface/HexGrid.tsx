import React, { useMemo } from 'react';
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
}: HexGridProps) {
  // Compute hex positions once
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

  // Map slot id -> position for O(1) lookup
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const p of positions) {
      // Normalize to start at (HEX_RADIUS, HEX_RADIUS) so slots don't clip at (0,0)
      m.set(p.id, { x: p.x - minX + HEX_RADIUS, y: p.y - minY + HEX_RADIUS });
    }
    return m;
  }, [positions, minX, minY]);

  return (
    /* Outer wrapper: fills parent, clips overflow */
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/*
        Transform layer: scale(zoom) + translate so that grid center aligns to
        50% 50% of the viewport. Translate is applied AFTER scale, so we divide
        panX/panY by zoom to keep pan speed consistent.
      */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `scale(${zoom}) translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px))`,
        transformOrigin: '0 0',
        width: gridW,
        height: gridH,
        pointerEvents: 'auto',
      }}>
        {slots.map((slot) => {
          const pos = posMap.get(slot.id);
          if (!pos) return null;

          return (
            <HexSlot
              key={slot.id}
              slot={slot}
              x={pos.x}
              y={pos.y}
              canAfford={canAffordUnlock(slot.id)}
              onUnlock={() => onUnlock(slot.id)}
              onHarvest={() => onHarvest(slot.id)}
              onBuild={() => onBuild(slot.id)}
              onInspect={() => onInspect(slot.id)}
            />
          );
        })}
      </div>
    </div>
  );
});
