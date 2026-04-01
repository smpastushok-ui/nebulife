import React, { useRef, useCallback, useEffect } from 'react';

interface SurfaceDPadProps {
  onPan: (dx: number, dy: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const PAN_SPEED = 7; // pixels per frame at 60fps

const DIRS: Record<string, [number, number]> = {
  N:  [0, -1],
  E:  [1, 0],
  S:  [0, 1],
  W:  [-1, 0],
};

// Size of the circular pad
const PAD_SIZE = 160;

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

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const prevent = (e: React.PointerEvent) => e.preventDefault();

  // Shared styles
  const cellBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'rgba(136,153,170,0.7)',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'monospace',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  };

  const Arrow = ({ dir, rot }: { dir: string; rot: number }) => (
    <button
      style={cellBase}
      onPointerDown={(e) => { prevent(e); startPan(dir); }}
      onPointerUp={stopPan}
      onPointerLeave={stopPan}
      onPointerCancel={stopPan}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: `rotate(${rot}deg)` }}>
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      bottom: 68,
      left: 14,
      zIndex: 9600,
      width: PAD_SIZE,
      height: PAD_SIZE,
      borderRadius: '50%',
      background: 'rgba(8,14,28,0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
      overflow: 'hidden',
      pointerEvents: 'auto',
    }}>
      {/* Row 1: _, Up, _ */}
      <div />
      <Arrow dir="N" rot={0} />
      <div />

      {/* Row 2: Left, Zoom, Right */}
      <Arrow dir="W" rot={-90} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '50%',
        background: 'rgba(15,25,45,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <button
          style={{ ...cellBase, flex: 1, fontSize: 18, fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          onPointerDown={(e) => { prevent(e); onZoomIn(); }}
        >+</button>
        <button
          style={{ ...cellBase, flex: 1, fontSize: 20, fontWeight: 'bold' }}
          onPointerDown={(e) => { prevent(e); onZoomOut(); }}
        >{'\u2212'}</button>
      </div>
      <Arrow dir="E" rot={90} />

      {/* Row 3: _, Down, _ */}
      <div />
      <Arrow dir="S" rot={180} />
      <div />
    </div>
  );
}
