import React, { useRef, useCallback } from 'react';

interface ArenaJoystickProps {
  onMove: (x: number, y: number) => void;
  onAim: (x: number, y: number, isFiring: boolean) => void;
  onDash: () => void;
  onFireLaser?: (firing: boolean) => void;
  onFireMissile?: () => void;
  onGravPush?: () => void;
  missileAmmo?: number;
  warpReady?: boolean;
  isWarping?: boolean;
}

const MAX_RADIUS = 50;

export const ArenaJoystick: React.FC<ArenaJoystickProps> = ({ onMove, onAim, onDash, onFireLaser, onFireMissile, onGravPush, missileAmmo = 10, warpReady = true, isWarping = false }) => {
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
        {/* Static hint — always visible */}
        <div style={styles.hint}>
          <div style={styles.hintRing} />
          <span style={styles.hintLabel}>MOVE</span>
        </div>
        {/* Active joystick — appears on touch */}
        <div ref={leftBaseRef} style={styles.base}>
          <div ref={leftKnobRef} style={styles.knob} />
        </div>
      </div>

      {/* Right side — weapon buttons (3 stacked) */}
      <div style={{
        position: 'absolute', right: 16, bottom: 80,
        display: 'flex', flexDirection: 'column', gap: 12,
        zIndex: 60,
      }}>
        {/* Missile button with ammo count */}
        <button
          onPointerDown={() => missileAmmo > 0 && onFireMissile?.()}
          style={{ ...styles.weaponBtn, opacity: missileAmmo > 0 ? 1 : 0.4 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={missileAmmo > 0 ? '#ff4444' : '#664444'} strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L15 8L12 22L9 8Z" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <span style={{ ...styles.weaponLabel, color: missileAmmo > 0 ? '#ff6666' : '#664444' }}>{missileAmmo > 0 ? `${missileAmmo}` : 'RELOAD'}</span>
        </button>

        {/* Laser button (hold to fire) */}
        <button
          onPointerDown={() => { onFireLaser?.(true); onAim(0, 0, true); }}
          onPointerUp={() => { onFireLaser?.(false); onAim(0, 0, false); }}
          onPointerCancel={() => { onFireLaser?.(false); onAim(0, 0, false); }}
          style={styles.weaponBtn}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#44ff88" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="22" />
            <circle cx="12" cy="6" r="2" />
            <line x1="8" y1="14" x2="16" y2="14" />
          </svg>
          <span style={{ ...styles.weaponLabel, color: '#66ff99' }}>LASER</span>
        </button>

        {/* Warp button with cooldown */}
        <button
          onPointerDown={() => warpReady && onDash()}
          style={{ ...styles.weaponBtn, opacity: warpReady ? 1 : 0.4, border: isWarping ? '2px solid #00eeff' : '2px solid rgba(100, 140, 180, 0.3)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={warpReady ? '#00eeff' : '#446677'} strokeWidth="2" strokeLinecap="round">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          <span style={{ ...styles.weaponLabel, color: warpReady ? '#44ddff' : '#446677' }}>{isWarping ? 'WARP!' : warpReady ? 'WARP' : 'WAIT'}</span>
        </button>
      </div>

      {/* Left side — utility buttons */}
      <div style={{
        position: 'absolute', left: 16, bottom: 180,
        display: 'flex', flexDirection: 'column', gap: 12,
        zIndex: 60,
      }}>
        {/* Gravity push button */}
        <button
          onPointerDown={() => onGravPush?.()}
          style={styles.weaponBtn}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aa66ff" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2V6M12 18V22M2 12H6M18 12H22" />
            <path d="M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07" />
          </svg>
          <span style={{ ...styles.weaponLabel, color: '#bb88ff' }}>GRAV</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  hint: {
    position: 'absolute',
    bottom: 80,
    left: 60,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  hintRing: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    border: '2px dashed rgba(255, 255, 255, 0.15)',
  },
  hintLabel: {
    fontFamily: 'monospace',
    fontSize: 8,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.25)',
  },
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
  weaponBtn: {
    width: 56,
    height: 56,
    borderRadius: 10,
    background: 'rgba(10, 15, 25, 0.75)',
    border: '2px solid rgba(100, 140, 180, 0.3)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    cursor: 'pointer',
    touchAction: 'none',
    pointerEvents: 'auto' as const,
  },
  weaponLabel: {
    fontSize: 6,
    color: '#ff6666',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
};
