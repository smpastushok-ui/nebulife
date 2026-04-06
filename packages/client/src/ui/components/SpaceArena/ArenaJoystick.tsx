import React, { useRef, useCallback } from 'react';

interface ArenaJoystickProps {
  onMove: (x: number, y: number) => void;
  onAim: (x: number, y: number, isFiring: boolean) => void;
  onDash: () => void;
}

const MAX_RADIUS = 50;

export const ArenaJoystick: React.FC<ArenaJoystickProps> = ({ onMove, onAim, onDash }) => {
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const leftPointerId = useRef<number | null>(null);
  const leftOrigin = useRef({ x: 0, y: 0 });

  const rightBaseRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  const rightPointerId = useRef<number | null>(null);
  const rightOrigin = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent, side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const baseRef = isLeft ? leftBaseRef : rightBaseRef;
    const knobRef = isLeft ? leftKnobRef : rightKnobRef;
    const origin = isLeft ? leftOrigin : rightOrigin;
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;

    if (pointerIdRef.current !== null) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    origin.current = { x: e.clientX, y: e.clientY };

    if (baseRef.current && knobRef.current) {
      baseRef.current.style.display = 'block';
      baseRef.current.style.left = `${e.clientX}px`;
      baseRef.current.style.top = `${e.clientY}px`;
      knobRef.current.style.transform = `translate(-50%, -50%)`;
    }

    if (!isLeft) onAim(0, 0, true);
  }, [onAim]);

  const handlePointerMove = useCallback((e: React.PointerEvent, side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;

    if (pointerIdRef.current !== e.pointerId) return;

    const origin = (isLeft ? leftOrigin : rightOrigin).current;
    const knobRef = isLeft ? leftKnobRef : rightKnobRef;

    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_RADIUS) {
      dx = (dx / distance) * MAX_RADIUS;
      dy = (dy / distance) * MAX_RADIUS;
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;

    if (isLeft) {
      onMove(nx, ny);
    } else {
      const isFiring = distance > 10;
      if (isFiring) onAim(nx, ny, true);
    }
  }, [onMove, onAim]);

  const handlePointerUp = useCallback((e: React.PointerEvent, side: 'left' | 'right') => {
    const isLeft = side === 'left';
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;

    if (pointerIdRef.current !== e.pointerId) return;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;

    const baseRef = isLeft ? leftBaseRef : rightBaseRef;
    if (baseRef.current) baseRef.current.style.display = 'none';

    if (isLeft) {
      onMove(0, 0);
    } else {
      onAim(0, 0, false);
    }
  }, [onMove, onAim]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', touchAction: 'none' }}>
      {/* Left zone (Movement) */}
      <div
        style={{ flex: 1, position: 'relative' }}
        onPointerDown={(e) => handlePointerDown(e, 'left')}
        onPointerMove={(e) => handlePointerMove(e, 'left')}
        onPointerUp={(e) => handlePointerUp(e, 'left')}
        onPointerCancel={(e) => handlePointerUp(e, 'left')}
      >
        <div ref={leftBaseRef} style={styles.base}>
          <div ref={leftKnobRef} style={styles.knob} />
        </div>
      </div>

      {/* Right zone (Aim + Fire) */}
      <div
        style={{ flex: 1, position: 'relative' }}
        onPointerDown={(e) => handlePointerDown(e, 'right')}
        onPointerMove={(e) => handlePointerMove(e, 'right')}
        onPointerUp={(e) => handlePointerUp(e, 'right')}
        onPointerCancel={(e) => handlePointerUp(e, 'right')}
      >
        <div ref={rightBaseRef} style={styles.base}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(255, 68, 68, 0.7)' }} />
        </div>
      </div>

      {/* Dash button — center bottom */}
      <button onClick={onDash} style={styles.dashBtn}>
        DASH
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: 'none',
    position: 'absolute',
    width: MAX_RADIUS * 2,
    height: MAX_RADIUS * 2,
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  knob: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
  },
  dashBtn: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    background: 'rgba(0, 240, 255, 0.15)',
    border: '2px solid rgba(0, 240, 255, 0.6)',
    color: '#aaddff',
    borderRadius: 6,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    zIndex: 101,
    cursor: 'pointer',
  },
};
