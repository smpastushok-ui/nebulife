import React from 'react';

/**
 * SurfaceDPad — zoom-only control (circular +/- buttons).
 * Camera panning is handled by touch drag on the canvas itself.
 */

interface SurfaceDPadProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const SIZE = 64;

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  color: 'rgba(136,153,170,0.8)',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'monospace',
  fontWeight: 'bold',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
};

export function SurfaceDPad({ onZoomIn, onZoomOut }: SurfaceDPadProps) {
  const prevent = (e: React.PointerEvent) => e.preventDefault();

  return (
    <div style={{
      position: 'fixed',
      bottom: 68,
      left: 14,
      zIndex: 9600,
      width: SIZE,
      height: SIZE,
      borderRadius: '50%',
      background: 'rgba(10,15,25,0.85)',
      border: '1px solid rgba(68,102,136,0.4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      pointerEvents: 'auto',
    }}>
      <button
        style={{ ...btnStyle, flex: 1, fontSize: 22, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        onPointerDown={(e) => { prevent(e); onZoomIn(); }}
      >+</button>
      <button
        style={{ ...btnStyle, flex: 1, fontSize: 24 }}
        onPointerDown={(e) => { prevent(e); onZoomOut(); }}
      >{'\u2212'}</button>
    </div>
  );
}
