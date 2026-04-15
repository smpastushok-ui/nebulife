import React, { useState } from 'react';

/**
 * SurfaceDPad — zoom control as a single pointy-top hexagon split horizontally.
 * Top half = zoom in (+), bottom half = zoom out (−).
 * Camera panning is handled by touch drag on the canvas itself.
 */

interface SurfaceDPadProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

// Pointy-top hexagon clip-path for a 50×60px box.
// Vertices (% of width × height):
//   top-center, upper-right, lower-right, bottom-center, lower-left, upper-left
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

const W = 50;
const H = 60;

// Shared base for each half-button
const halfBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '50%',
  background: 'transparent',
  border: 'none',
  color: '#aabbcc',
  cursor: 'pointer',
  padding: 0,
  margin: 0,
  fontFamily: 'monospace',
  fontWeight: 'bold',
  fontSize: 20,
  lineHeight: 1,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
  transition: 'background 0.12s',
};

export function SurfaceDPad({ onZoomIn, onZoomOut }: SurfaceDPadProps) {
  const [hoverTop, setHoverTop] = useState(false);
  const [hoverBot, setHoverBot] = useState(false);

  const prevent = (e: React.PointerEvent) => e.preventDefault();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        left: 'calc(14px + env(safe-area-inset-left, 0px))',
        zIndex: 9600,
        width: W,
        height: H,
        clipPath: HEX_CLIP,
        background: '#0a1428',
        // Hex border via outline is not clipped, so we use a box-shadow trick
        // The real border is drawn by the wrapper below.
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top half — zoom in */}
      <button
        style={{
          ...halfBase,
          background: hoverTop ? 'rgba(170,187,204,0.10)' : 'transparent',
        }}
        onPointerDown={(e) => { prevent(e); onZoomIn(); }}
        onPointerEnter={() => setHoverTop(true)}
        onPointerLeave={() => setHoverTop(false)}
        onPointerUp={() => setHoverTop(false)}
        aria-label="Zoom in"
      >
        +
      </button>

      {/* Divider */}
      <div
        style={{
          width: '100%',
          height: 1,
          background: '#334455',
          flexShrink: 0,
        }}
      />

      {/* Bottom half — zoom out */}
      <button
        style={{
          ...halfBase,
          background: hoverBot ? 'rgba(170,187,204,0.10)' : 'transparent',
        }}
        onPointerDown={(e) => { prevent(e); onZoomOut(); }}
        onPointerEnter={() => setHoverBot(true)}
        onPointerLeave={() => setHoverBot(false)}
        onPointerUp={() => setHoverBot(false)}
        aria-label="Zoom out"
      >
        {'\u2212'}
      </button>
    </div>
  );
}
