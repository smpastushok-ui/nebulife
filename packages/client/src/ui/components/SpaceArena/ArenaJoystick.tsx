import React, { useRef, useCallback } from 'react';

interface ArenaJoystickProps {
  onMove: (x: number, y: number) => void;
  onAim: (x: number, y: number, isFiring: boolean) => void;
  onDash: () => void;
  onFireMissile?: () => void;
  onGravPush?: () => void;
  missileAmmo?: number;
  warpReady?: boolean;
  isWarping?: boolean;
}

const MAX_RADIUS = 50;

export const ArenaJoystick: React.FC<ArenaJoystickProps> = ({
  onMove, onAim, onDash, onFireMissile, onGravPush,
  missileAmmo = 10, warpReady = true, isWarping = false,
}) => {
  // ── Left joystick (movement / strafe) ──────────────────────────────────
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const leftPointerId = useRef<number | null>(null);
  const leftOrigin = useRef({ x: 0, y: 0 });

  const onLeftDown = useCallback((e: React.PointerEvent) => {
    if (leftPointerId.current !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    leftPointerId.current = e.pointerId;
    leftOrigin.current = { x: e.clientX, y: e.clientY };
    if (leftBaseRef.current && leftKnobRef.current) {
      leftBaseRef.current.style.display = 'block';
      leftBaseRef.current.style.left = `${e.clientX}px`;
      leftBaseRef.current.style.top = `${e.clientY}px`;
      leftKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, []);

  const onLeftMove = useCallback((e: React.PointerEvent) => {
    if (leftPointerId.current !== e.pointerId) return;
    let dx = e.clientX - leftOrigin.current.x;
    let dy = e.clientY - leftOrigin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_RADIUS) { dx = (dx / dist) * MAX_RADIUS; dy = (dy / dist) * MAX_RADIUS; }
    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    onMove(dx / MAX_RADIUS, dy / MAX_RADIUS);
  }, [onMove]);

  const onLeftUp = useCallback((e: React.PointerEvent) => {
    if (leftPointerId.current !== e.pointerId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    leftPointerId.current = null;
    if (leftBaseRef.current) leftBaseRef.current.style.display = 'none';
    onMove(0, 0);
  }, [onMove]);

  // ── Right joystick (aim + auto-fire laser) ─────────────────────────────
  const rightBaseRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  const rightPointerId = useRef<number | null>(null);
  const rightOrigin = useRef({ x: 0, y: 0 });

  const onRightDown = useCallback((e: React.PointerEvent) => {
    if (rightPointerId.current !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    rightPointerId.current = e.pointerId;
    rightOrigin.current = { x: e.clientX, y: e.clientY };
    if (rightBaseRef.current && rightKnobRef.current) {
      rightBaseRef.current.style.display = 'block';
      rightBaseRef.current.style.left = `${e.clientX}px`;
      rightBaseRef.current.style.top = `${e.clientY}px`;
      rightKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    onAim(0, 0, true); // start firing
  }, [onAim]);

  const onRightMove = useCallback((e: React.PointerEvent) => {
    if (rightPointerId.current !== e.pointerId) return;
    let dx = e.clientX - rightOrigin.current.x;
    let dy = e.clientY - rightOrigin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_RADIUS) { dx = (dx / dist) * MAX_RADIUS; dy = (dy / dist) * MAX_RADIUS; }
    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    onAim(dx / MAX_RADIUS, dy / MAX_RADIUS, true);
  }, [onAim]);

  const onRightUp = useCallback((e: React.PointerEvent) => {
    if (rightPointerId.current !== e.pointerId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    rightPointerId.current = null;
    if (rightBaseRef.current) rightBaseRef.current.style.display = 'none';
    onAim(0, 0, false); // stop firing
  }, [onAim]);

  // ── Arc ability buttons positioning (semicircle above right hint) ──────
  // Center of arc: right hint position (bottom: 80px, right: 60px)
  const arcRadius = 80;
  const arcAngles = [
    -60,  // WARP — top-right
    -90,  // ROCKET — top-center
    -120, // GRAV — top-left
  ];
  const arcButtons = arcAngles.map(deg => ({
    x: Math.cos((deg * Math.PI) / 180) * arcRadius,
    y: Math.sin((deg * Math.PI) / 180) * arcRadius,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none', touchAction: 'none' }}>
      {/* Left touch zone — left half of screen */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0,
          width: '50%', height: '100%',
          pointerEvents: 'auto', touchAction: 'none',
        }}
        onPointerDown={onLeftDown}
        onPointerMove={onLeftMove}
        onPointerUp={onLeftUp}
        onPointerCancel={onLeftUp}
      >
        {/* Static hint — MOVE */}
        <div style={styles.hintLeft}>
          <div style={styles.hintRing} />
          <span style={styles.hintLabel}>MOVE</span>
        </div>
        {/* Active joystick */}
        <div ref={leftBaseRef} style={styles.base}>
          <div ref={leftKnobRef} style={styles.knob} />
        </div>
      </div>

      {/* Right touch zone — right half of screen */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0,
          width: '50%', height: '100%',
          pointerEvents: 'auto', touchAction: 'none',
        }}
        onPointerDown={onRightDown}
        onPointerMove={onRightMove}
        onPointerUp={onRightUp}
        onPointerCancel={onRightUp}
      >
        {/* Static hint — AIM */}
        <div style={styles.hintRight}>
          <div style={{ ...styles.hintRing, borderColor: 'rgba(68, 255, 136, 0.2)' }} />
          <span style={{ ...styles.hintLabel, color: 'rgba(68, 255, 136, 0.3)' }}>AIM</span>
        </div>
        {/* Active joystick */}
        <div ref={rightBaseRef} style={{ ...styles.base, borderColor: 'rgba(68, 255, 136, 0.4)' }}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(68, 255, 136, 0.7)' }} />
        </div>
      </div>

      {/* Arc ability menu — semicircle above right hint */}
      <div style={{
        position: 'absolute', bottom: 80, right: 60,
        width: 0, height: 0,
        pointerEvents: 'none', zIndex: 60,
      }}>
        {/* WARP — top-right of arc */}
        <button
          onPointerDown={() => warpReady && onDash()}
          style={{
            ...styles.arcBtn,
            left: arcButtons[0].x - 24,
            top: arcButtons[0].y - 24,
            opacity: warpReady ? 1 : 0.4,
            borderColor: isWarping ? '#00eeff' : 'rgba(100, 140, 180, 0.3)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={warpReady ? '#00eeff' : '#446677'} strokeWidth="2" strokeLinecap="round">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
          <span style={{ ...styles.arcLabel, color: warpReady ? '#44ddff' : '#446677' }}>
            {isWarping ? 'WARP!' : warpReady ? 'WARP' : 'WAIT'}
          </span>
        </button>

        {/* ROCKET — top-center of arc */}
        <button
          onPointerDown={() => missileAmmo > 0 && onFireMissile?.()}
          style={{
            ...styles.arcBtn,
            left: arcButtons[1].x - 24,
            top: arcButtons[1].y - 24,
            opacity: missileAmmo > 0 ? 1 : 0.4,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={missileAmmo > 0 ? '#ff4444' : '#664444'} strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L15 8L12 22L9 8Z" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <span style={{ ...styles.arcLabel, color: missileAmmo > 0 ? '#ff6666' : '#664444' }}>
            {missileAmmo > 0 ? `${missileAmmo}` : 'RELOAD'}
          </span>
        </button>

        {/* GRAV — top-left of arc */}
        <button
          onPointerDown={() => onGravPush?.()}
          style={{
            ...styles.arcBtn,
            left: arcButtons[2].x - 24,
            top: arcButtons[2].y - 24,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aa66ff" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2V6M12 18V22M2 12H6M18 12H22" />
          </svg>
          <span style={{ ...styles.arcLabel, color: '#bb88ff' }}>GRAV</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  hintLeft: {
    position: 'absolute',
    bottom: 80,
    left: 60,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  hintRight: {
    position: 'absolute',
    bottom: 80,
    right: 60,
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
  arcBtn: {
    position: 'absolute' as const,
    width: 48,
    height: 48,
    borderRadius: 10,
    background: 'rgba(10, 15, 25, 0.75)',
    border: '2px solid rgba(100, 140, 180, 0.3)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    cursor: 'pointer',
    touchAction: 'none' as const,
    pointerEvents: 'auto' as const,
    padding: 0,
  },
  arcLabel: {
    fontSize: 6,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
};
