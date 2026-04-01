import React, { useRef, useCallback, useEffect } from 'react';

interface SurfaceDPadProps {
  onPan: (dx: number, dy: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const PAN_SPEED = 7; // pixels per frame at 60fps

// Direction vectors for 8 directions
const DIRS: Record<string, [number, number]> = {
  N:  [0, -1],
  NE: [0.707, -0.707],
  E:  [1, 0],
  SE: [0.707, 0.707],
  S:  [0, 1],
  SW: [-0.707, 0.707],
  W:  [-1, 0],
  NW: [-0.707, -0.707],
};

export function SurfaceDPad({ onPan, onZoomIn, onZoomOut }: SurfaceDPadProps) {
  const activeDir = useRef<string | null>(null);
  const rafId = useRef<number>(0);
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;

  const loop = useCallback(() => {
    const dir = activeDir.current;
    if (!dir) return;
    const [dx, dy] = DIRS[dir] ?? [0, 0];
    onPanRef.current(dx * PAN_SPEED, dy * PAN_SPEED);
    rafId.current = requestAnimationFrame(loop);
  }, []);

  const startPan = useCallback((dir: string) => {
    activeDir.current = dir;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(loop);
  }, [loop]);

  const stopPan = useCallback(() => {
    activeDir.current = null;
    cancelAnimationFrame(rafId.current);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const btnBase: React.CSSProperties = {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10,15,25,0.7)',
    border: '1px solid rgba(60,100,160,0.3)',
    borderRadius: 3,
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    touchAction: 'none' as const,
  };

  const zoomBtn: React.CSSProperties = {
    ...btnBase,
    width: 28,
    height: 28,
    fontSize: 14,
  };

  const DirBtn = ({ dir, children }: { dir: string; children: React.ReactNode }) => (
    <button
      style={btnBase}
      onPointerDown={(e) => { e.preventDefault(); startPan(dir); }}
      onPointerUp={stopPan}
      onPointerLeave={stopPan}
      onPointerCancel={stopPan}
    >
      {children}
    </button>
  );

  // Arrow SVGs - small chevrons pointing in each direction
  const arrow = (rot: number) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M4 10L8 6L12 10" />
    </svg>
  );

  return (
    <div style={{
      position: 'fixed',
      bottom: 70,
      left: 14,
      zIndex: 9600,
      display: 'grid',
      gridTemplateColumns: '32px 32px 32px',
      gridTemplateRows: '32px 32px 32px',
      gap: 2,
      pointerEvents: 'auto',
    }}>
      {/* Row 1: NW, N, NE */}
      <DirBtn dir="NW">{arrow(-45)}</DirBtn>
      <DirBtn dir="N">{arrow(0)}</DirBtn>
      <DirBtn dir="NE">{arrow(45)}</DirBtn>

      {/* Row 2: W, zoom+, E */}
      <DirBtn dir="W">{arrow(-90)}</DirBtn>
      <button
        style={zoomBtn}
        onPointerDown={(e) => { e.preventDefault(); onZoomIn(); }}
      >+</button>
      <DirBtn dir="E">{arrow(90)}</DirBtn>

      {/* Row 3: SW, zoom-, SE */}
      <DirBtn dir="SW">{arrow(-135)}</DirBtn>
      <button
        style={zoomBtn}
        onPointerDown={(e) => { e.preventDefault(); onZoomOut(); }}
      >{'\u2212'}</button>
      <DirBtn dir="SE">{arrow(135)}</DirBtn>
    </div>
  );
}
