import React, { useRef, useCallback } from 'react';

interface ArenaLandscapeControlsProps {
  onMove: (x: number, y: number) => void;
  onAim: (x: number, y: number, isFiring: boolean) => void;
  onDash: () => void;
  onFireMissile?: () => void;
  onGravPush?: () => void;
  missileAmmo?: number;
  warpReady?: boolean;
  /** When true, container is CSS-rotated 90° CW (portrait → landscape). */
  needRotate?: boolean;
}

const MAX_RADIUS = 60;
const DEADZONE = 10; // pixels, for firing threshold

export const ArenaLandscapeControls: React.FC<ArenaLandscapeControlsProps> = ({
  onMove, onAim, onDash, onFireMissile, onGravPush,
  missileAmmo = 10, warpReady = true, needRotate = false,
}) => {
  // Convert viewport coords → container-local when CSS-rotated
  const toLocal = useCallback((vx: number, vy: number): { x: number; y: number } => {
    if (!needRotate) return { x: vx, y: vy };
    return { x: vy, y: window.innerWidth - vx };
  }, [needRotate]);

  // -- Left joystick (MOVE) --
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const leftPointerId = useRef<number | null>(null);
  const leftOrigin = useRef({ x: 0, y: 0 });

  // -- Right joystick (AIM) --
  const rightBaseRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  const rightPointerId = useRef<number | null>(null);
  const rightOrigin = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent, isLeft: boolean) => {
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;
    if (pointerIdRef.current !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;

    const local = toLocal(e.clientX, e.clientY);
    const origin = isLeft ? leftOrigin : rightOrigin;
    origin.current = local;

    const baseRef = isLeft ? leftBaseRef : rightBaseRef;
    const knobRef = isLeft ? leftKnobRef : rightKnobRef;
    if (baseRef.current && knobRef.current) {
      baseRef.current.style.display = 'block';
      baseRef.current.style.left = `${local.x}px`;
      baseRef.current.style.top = `${local.y}px`;
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }

    if (!isLeft) onAim(0, 0, true);
  }, [onAim, toLocal]);

  const handlePointerMove = useCallback((e: React.PointerEvent, isLeft: boolean) => {
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;
    if (pointerIdRef.current !== e.pointerId) return;

    const local = toLocal(e.clientX, e.clientY);
    const origin = (isLeft ? leftOrigin : rightOrigin).current;
    let dx = local.x - origin.x;
    let dy = local.y - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }

    const knobRef = isLeft ? leftKnobRef : rightKnobRef;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;

    if (isLeft) {
      onMove(nx, ny);
    } else {
      onAim(nx, ny, dist > DEADZONE);
    }
  }, [onMove, onAim, toLocal]);

  const handlePointerUp = useCallback((e: React.PointerEvent, isLeft: boolean) => {
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

  const safeBottom = 'env(safe-area-inset-bottom, 20px)';
  const safeRight = 'env(safe-area-inset-right, 20px)';
  const safeLeft = 'env(safe-area-inset-left, 20px)';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none', touchAction: 'none' }}>
      {/* Left half -- MOVE */}
      <div
        style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', pointerEvents: 'auto', touchAction: 'none' }}
        onPointerDown={(e) => handlePointerDown(e, true)}
        onPointerMove={(e) => handlePointerMove(e, true)}
        onPointerUp={(e) => handlePointerUp(e, true)}
        onPointerCancel={(e) => handlePointerUp(e, true)}
      >
        <div style={{ ...styles.hint, bottom: `calc(80px + ${safeBottom})`, left: `calc(60px + ${safeLeft})` }}>
          <div style={styles.hintRing} />
          <span style={styles.hintLabel}>MOVE</span>
        </div>
        <div ref={leftBaseRef} style={styles.base}>
          <div ref={leftKnobRef} style={styles.knob} />
        </div>
      </div>

      {/* Right half -- AIM */}
      <div
        style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', pointerEvents: 'auto', touchAction: 'none' }}
        onPointerDown={(e) => handlePointerDown(e, false)}
        onPointerMove={(e) => handlePointerMove(e, false)}
        onPointerUp={(e) => handlePointerUp(e, false)}
        onPointerCancel={(e) => handlePointerUp(e, false)}
      >
        <div style={{ ...styles.hint, bottom: `calc(80px + ${safeBottom})`, right: `calc(60px + ${safeRight})` }}>
          <div style={{ ...styles.hintRing, borderColor: 'rgba(255, 68, 68, 0.2)' }} />
          <span style={{ ...styles.hintLabel, color: 'rgba(255, 68, 68, 0.3)' }}>AIM</span>
        </div>
        <div ref={rightBaseRef} style={{ ...styles.base, borderColor: 'rgba(255, 68, 68, 0.4)' }}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(255, 68, 68, 0.7)' }} />
        </div>
      </div>

      {/* Ability buttons -- vertical stack, center-right */}
      <div style={{
        position: 'absolute',
        bottom: `calc(80px + ${safeBottom})`,
        right: `calc(180px + ${safeRight})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <button
          style={{ ...styles.abilityBtn, borderColor: '#bb88ff', color: '#bb88ff' }}
          onPointerDown={(e) => { e.stopPropagation(); onGravPush?.(); }}
        >
          GRAV
        </button>
        <button
          style={{ ...styles.abilityBtn, borderColor: '#ff6666', color: '#ff6666', opacity: missileAmmo > 0 ? 1 : 0.5 }}
          onPointerDown={(e) => { e.stopPropagation(); if (missileAmmo > 0) onFireMissile?.(); }}
        >
          {missileAmmo > 0 ? `${missileAmmo}` : 'WAIT'}
        </button>
        <button
          style={{ ...styles.abilityBtn, borderColor: '#44ddff', color: '#44ddff', opacity: warpReady ? 1 : 0.5 }}
          onPointerDown={(e) => { e.stopPropagation(); if (warpReady) onDash(); }}
        >
          WARP
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  hint: {
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  hintRing: {
    width: 90,
    height: 90,
    borderRadius: '50%',
    border: '2px dashed rgba(255, 255, 255, 0.15)',
  },
  hintLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.25)',
  },
  base: {
    display: 'none',
    position: 'absolute',
    width: MAX_RADIUS * 2,
    height: MAX_RADIUS * 2,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  knob: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 15px rgba(0,0,0,0.5)',
  },
  abilityBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    background: 'rgba(15, 20, 30, 0.85)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    pointerEvents: 'auto',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'monospace',
    padding: 0,
  },
};
