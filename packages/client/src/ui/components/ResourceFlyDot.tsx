/**
 * ResourceFlyDot — a small glowing dot that animates from a world position
 * to the ResourceWidget in the top-right corner.
 *
 * Uses CSS transition: starts at (sx, sy), then moves to target after mount.
 */

import React, { useEffect, useState } from 'react';
import type { SurfaceObjectType } from '@nebulife/core';

interface ResourceFlyDotProps {
  type: SurfaceObjectType;
  sx:   number;  // screen-space start X (page coords)
  sy:   number;  // screen-space start Y (page coords)
  tx?:  number;  // explicit target X (centre of HUD icon)
  ty?:  number;  // explicit target Y
}

const DOT_COLOR: Record<SurfaceObjectType, string> = {
  ore:   '#998877',
  vent:  '#44aaff',
  tree:  '#ffdd44',
  water: '#3b82f6',
};

// Approximate centre of the ResourceWidget icons (fixed top: 14, right: 14, height ~32px)
const TARGET_X = () => window.innerWidth  - 38;
const TARGET_Y = () => 30;   // midpoint of the widget row

export const ResourceFlyDot: React.FC<ResourceFlyDotProps> = ({ type, sx, sy, tx, ty }) => {
  const [pos, setPos] = useState({ x: sx, y: sy, opacity: 1 });

  useEffect(() => {
    // One frame delay so the initial position renders first, then transition fires
    const raf = requestAnimationFrame(() => {
      setPos({ x: tx ?? TARGET_X(), y: ty ?? TARGET_Y(), opacity: 0 });
    });
    return () => cancelAnimationFrame(raf);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const color = DOT_COLOR[type];

  return (
    <div
      style={{
        position:       'fixed',
        left:           pos.x,
        top:            pos.y,
        width:          8,
        height:         8,
        borderRadius:   '50%',
        background:     color,
        boxShadow:      `0 0 8px ${color}, 0 0 3px #fff`,
        pointerEvents:  'none',
        zIndex:         9000,
        transform:      'translate(-50%, -50%)',
        transition: [
          'left    0.70s cubic-bezier(.4,0,.2,1)',
          'top     0.70s cubic-bezier(.4,0,.2,1)',
          'opacity 0.55s ease-in 0.35s',
        ].join(', '),
        opacity: pos.opacity,
      }}
    />
  );
};
