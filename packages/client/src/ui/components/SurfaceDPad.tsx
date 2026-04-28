import React, { useState } from 'react';

/**
 * SurfaceDPad — compact orbital zoom control for the surface camera.
 * Camera panning is handled by touch drag on the canvas itself.
 */

interface SurfaceDPadProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const W = 48;
const H = 58;

// Shared base for each half-button
const halfBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '50%',
  background: 'transparent',
  border: 'none',
  color: '#9fb8d0',
  cursor: 'pointer',
  padding: 0,
  margin: 0,
  fontFamily: 'monospace',
  fontWeight: 'bold',
  fontSize: 11,
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
        bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        left: 'calc(22px + env(safe-area-inset-left, 0px))',
        zIndex: 9600,
        width: W,
        height: H,
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg, rgba(12, 24, 40, 0.54), rgba(5, 10, 20, 0.54))',
        border: '1px solid rgba(68, 102, 136, 0.5)',
        borderRadius: 3,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.24)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top half — orbital zoom in */}
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
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="10" rx="7.2" ry="3.4" opacity="0.55" />
          <circle cx="12" cy="9" r="3.2" />
          <path d="M12 6.8 V11.2 M9.8 9 H14.2" />
          <path d="M19 7 L21 5 L19 3" opacity="0.65" />
        </svg>
      </button>

      {/* Divider */}
      <div
        style={{
          width: '100%',
          height: 1,
          background: 'rgba(68, 102, 136, 0.45)',
          flexShrink: 0,
        }}
      />

      {/* Bottom half — orbital zoom out */}
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
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="8" rx="7.2" ry="3.4" opacity="0.55" />
          <circle cx="12" cy="9" r="3.2" />
          <path d="M9.8 9 H14.2" />
          <path d="M5 11 L3 13 L5 15" opacity="0.65" />
        </svg>
      </button>
    </div>
  );
}
