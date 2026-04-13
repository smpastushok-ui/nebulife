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
  /** When true, container is CSS-rotated 90° CW (portrait phone → landscape game).
   *  Pointer clientX/clientY are viewport coords; we must convert to container-local. */
  needRotate?: boolean;
}

const MAX_RADIUS = 50;

export const ArenaJoystick: React.FC<ArenaJoystickProps> = ({
  onMove, onAim, onDash, onFireMissile, onGravPush,
  missileAmmo = 10, warpReady = true, isWarping = false,
  needRotate = false,
}) => {
  // Convert viewport (portrait) coords → container-local coords when CSS-rotated.
  // CSS transform: rotate(90deg) translateY(-100%) with transformOrigin: top left
  // maps container(x,y) → viewport(innerWidth - y, x), so inverse is:
  //   container_x = viewport_y,  container_y = innerWidth - viewport_x
  const toLocal = useCallback((vx: number, vy: number): { x: number; y: number } => {
    if (!needRotate) return { x: vx, y: vy };
    return { x: vy, y: window.innerWidth - vx };
  }, [needRotate]);

  // ── Left joystick (movement / strafe) ──────────────────────────────────
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const leftPointerId = useRef<number | null>(null);
  const leftOrigin = useRef({ x: 0, y: 0 });

  const onLeftDown = useCallback((e: React.PointerEvent) => {
    if (leftPointerId.current !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    leftPointerId.current = e.pointerId;
    const local = toLocal(e.clientX, e.clientY);
    leftOrigin.current = local;
    if (leftBaseRef.current && leftKnobRef.current) {
      leftBaseRef.current.style.display = 'block';
      leftBaseRef.current.style.left = `${local.x}px`;
      leftBaseRef.current.style.top = `${local.y}px`;
      leftKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, [toLocal]);

  const onLeftMove = useCallback((e: React.PointerEvent) => {
    if (leftPointerId.current !== e.pointerId) return;
    const local = toLocal(e.clientX, e.clientY);
    let dx = local.x - leftOrigin.current.x;
    let dy = local.y - leftOrigin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_RADIUS) { dx = (dx / dist) * MAX_RADIUS; dy = (dy / dist) * MAX_RADIUS; }
    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    onMove(dx / MAX_RADIUS, dy / MAX_RADIUS);
  }, [onMove, toLocal]);

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
    const local = toLocal(e.clientX, e.clientY);
    rightOrigin.current = local;
    if (rightBaseRef.current && rightKnobRef.current) {
      rightBaseRef.current.style.display = 'block';
      rightBaseRef.current.style.left = `${local.x}px`;
      rightBaseRef.current.style.top = `${local.y}px`;
      rightKnobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    onAim(0, 0, true); // start firing
  }, [onAim, toLocal]);

  const onRightMove = useCallback((e: React.PointerEvent) => {
    if (rightPointerId.current !== e.pointerId) return;
    const local = toLocal(e.clientX, e.clientY);
    let dx = local.x - rightOrigin.current.x;
    let dy = local.y - rightOrigin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_RADIUS) { dx = (dx / dist) * MAX_RADIUS; dy = (dy / dist) * MAX_RADIUS; }
    if (rightKnobRef.current) {
      rightKnobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    onAim(dx / MAX_RADIUS, dy / MAX_RADIUS, true);
  }, [onAim, toLocal]);

  const onRightUp = useCallback((e: React.PointerEvent) => {
    if (rightPointerId.current !== e.pointerId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    rightPointerId.current = null;
    if (rightBaseRef.current) rightBaseRef.current.style.display = 'none';
    onAim(0, 0, false); // stop firing
  }, [onAim]);

  // ── Arc ability buttons positioning (semicircle above right hint) ──────
  // The right hint ring center is at (bottom: 115, right: 95) in viewport coords
  // (bottom: 80 container + 35 half-ring = 115; right: 60 container edge offset).
  // Arc buttons use fixed bottom/right so they never overlap the touch zone.
  // Layout: three buttons in a fan above the hint ring.
  //   WARP   — upper-right  (bottom: 195, right: 30)
  //   ROCKET — top-center   (bottom: 210, right: 85)
  //   GRAV   — upper-left   (bottom: 195, right: 140)
  // Each button is 48×48, so the closest edge to the hint is ~40px clear gap.
  const arcPositions = [
    { bottom: 195, right: 30  }, // WARP
    { bottom: 215, right: 83  }, // ROCKET
    { bottom: 195, right: 140 }, // GRAV
  ];

  // Safe-area-aware bottom offset (CSS env variable via inline style)
  const safeBottom = 'env(safe-area-inset-bottom, 0px)';
  const safeRight = 'env(safe-area-inset-right, 0px)';

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
        {/* Static hint — MOVE (offset by safe area bottom) */}
        <div style={{ ...styles.hintLeft, bottom: `calc(80px + ${safeBottom})` }}>
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
        {/* Static hint — AIM (offset by safe area bottom) */}
        <div style={{ ...styles.hintRight, bottom: `calc(80px + ${safeBottom})` }}>
          <div style={{ ...styles.hintRing, borderColor: 'rgba(68, 255, 136, 0.2)' }} />
          <span style={{ ...styles.hintLabel, color: 'rgba(68, 255, 136, 0.3)' }}>AIM</span>
        </div>
        {/* Active joystick */}
        <div ref={rightBaseRef} style={{ ...styles.base, borderColor: 'rgba(68, 255, 136, 0.4)' }}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(68, 255, 136, 0.7)' }} />
        </div>
      </div>

      {/* Arc ability menu — semicircle above right hint */}
      {/* Each button is independently positioned with bottom/right to avoid
          overlapping the right joystick touch zone (bottom: 0-160, right: 0-50%).
          Buttons sit 195-215px above the bottom edge, 30-140px from the right.
          All bottom/right values include safe area insets for iPhone home bar. */}

      {/* WARP — upper-right of fan */}
      <button
        onPointerDown={() => warpReady && onDash()}
        style={{
          ...styles.arcBtn,
          bottom: `calc(${arcPositions[0].bottom}px + ${safeBottom})`,
          right: `calc(${arcPositions[0].right}px + ${safeRight})`,
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

      {/* ROCKET — top-center of fan */}
      <button
        onPointerDown={() => missileAmmo > 0 && onFireMissile?.()}
        style={{
          ...styles.arcBtn,
          bottom: `calc(${arcPositions[1].bottom}px + ${safeBottom})`,
          right: `calc(${arcPositions[1].right}px + ${safeRight})`,
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

      {/* GRAV — upper-left of fan */}
      <button
        onPointerDown={() => onGravPush?.()}
        style={{
          ...styles.arcBtn,
          bottom: `calc(${arcPositions[2].bottom}px + ${safeBottom})`,
          right: `calc(${arcPositions[2].right}px + ${safeRight})`,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aa66ff" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2V6M12 18V22M2 12H6M18 12H22" />
        </svg>
        <span style={{ ...styles.arcLabel, color: '#bb88ff' }}>GRAV</span>
      </button>
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
