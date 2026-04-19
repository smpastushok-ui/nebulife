import React, { useRef, useCallback } from 'react';

interface ArenaLandscapeControlsProps {
  onMove: (x: number, y: number) => void;
  onAim: (x: number, y: number, isFiring: boolean) => void;
  onDash: () => void;
  onFireMissile?: () => void;
  onGravPush?: () => void;
  /** -1..+1 vertical thrust (deprecated — kept for API compat, no-op now). */
  onVertical?: (v: number) => void;
  /** Left-stick sector — which quadrant the thumb is pulled toward.
   *  'center' = just thrust, 'laser' = thrust+fire, 'missile' = thrust+missile,
   *  'warp' = thrust+warp, 'dodge' = thrust+barrel roll. */
  onSector?: (sector: 'center' | 'laser' | 'missile' | 'warp' | 'dodge') => void;
  missileAmmo?: number;
  warpReady?: boolean;
  /** When true, container is CSS-rotated 90° CW (portrait → landscape). */
  needRotate?: boolean;
}

const MAX_RADIUS = 60;
const DEADZONE = 10; // pixels, for firing threshold

export const ArenaLandscapeControls: React.FC<ArenaLandscapeControlsProps> = ({
  onMove, onAim, onDash, onFireMissile, onGravPush, onVertical: _onVertical, onSector,
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
      // Left stick is now sector-based:
      //   - Center (near origin) → forward thrust only
      //   - Up    → laser fire   (thrust + fire)
      //   - Left  → missile      (thrust + missile pulse every ~2s)
      //   - Right → warp         (thrust + warp burst)
      //   - Down  → barrel roll  (thrust + dodge)
      // Thrust magnitude = how far the thumb is pulled (0..1). Always
      // forward — no strafe from the left stick in TPS mode.
      const thrust = Math.min(1, dist / MAX_RADIUS);
      onMove(0, -thrust); // engine interprets ny<0 as "forward"
      let sector: 'center' | 'laser' | 'missile' | 'warp' | 'dodge' = 'center';
      if (dist > DEADZONE * 2) {
        // Screen Y grows downward; flip so "up on screen" = positive angle
        const angle = Math.atan2(-dy, dx);
        if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) sector = 'laser';
        else if (angle >= -Math.PI / 4 && angle <= Math.PI / 4) sector = 'warp';
        else if (angle < -Math.PI / 4 && angle > -3 * Math.PI / 4) sector = 'dodge';
        else sector = 'missile';
      }
      onSector?.(sector);
    } else {
      onAim(nx, ny, dist > DEADZONE);
    }
  }, [onMove, onAim, onSector, toLocal]);

  const handlePointerUp = useCallback((e: React.PointerEvent, isLeft: boolean) => {
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;
    if (pointerIdRef.current !== e.pointerId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;

    const baseRef = isLeft ? leftBaseRef : rightBaseRef;
    if (baseRef.current) baseRef.current.style.display = 'none';

    if (isLeft) {
      onMove(0, 0);
      onSector?.('center'); // reset sector on release
    } else {
      onAim(0, 0, false);
    }
  }, [onMove, onAim, onSector]);

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
        <div style={{ ...styles.hint, bottom: `calc(80px + ${safeBottom})`, left: `calc(60px + ${safeLeft})`, width: 110, height: 110 }}>
          <div style={{ ...styles.hintRing, width: 110, height: 110 }} />
          {/* Sector icons around the ring — labels only; engine reads the
              sector from handlePointerMove. */}
          <svg width="110" height="110" viewBox="-55 -55 110 110" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Up: laser (green) */}
            <text x="0" y="-38" fill="#44ffaa" fontSize="9" textAnchor="middle" fontFamily="monospace">LASER</text>
            {/* Left: missile (red) */}
            <text x="-38" y="3" fill="#ff6666" fontSize="9" textAnchor="middle" fontFamily="monospace">MISSILE</text>
            {/* Right: warp (cyan) */}
            <text x="38" y="3" fill="#44ddff" fontSize="9" textAnchor="middle" fontFamily="monospace">WARP</text>
            {/* Down: dodge (yellow) */}
            <text x="0" y="46" fill="#ffcc44" fontSize="9" textAnchor="middle" fontFamily="monospace">DODGE</text>
          </svg>
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
        <div style={{ ...styles.hint, bottom: `calc(80px + ${safeBottom})`, right: `calc(110px + ${safeRight})` }}>
          <div style={{ ...styles.hintRing, borderColor: 'rgba(255, 68, 68, 0.2)' }} />
          <span style={{ ...styles.hintLabel, color: 'rgba(255, 68, 68, 0.3)' }}>AIM</span>
        </div>
        <div ref={rightBaseRef} style={{ ...styles.base, borderColor: 'rgba(255, 68, 68, 0.4)' }}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(255, 68, 68, 0.7)' }} />
        </div>
      </div>

      {/* Ability buttons — arranged around left side of AIM ring at 11, 9, 7 o'clock.
          Positioned further from the screen edge (65→115px extra) so the right
          joystick and ability buttons don't clip against rounded corners, system
          back-gesture zone or device safe-area on landscape. */}
      {/* WARP — upper-left of the AIM ring */}
      <button
        style={{ ...styles.abilityBtn, position: 'absolute', right: `calc(183px + ${safeRight})`, bottom: `calc(190px + ${safeBottom})`, opacity: warpReady ? 1 : 0.3 }}
        onPointerDown={(e) => { e.stopPropagation(); if (warpReady) onDash(); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={warpReady ? '#44ddff' : '#335566'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
        </svg>
      </button>
      {/* ROCKET — left of ring */}
      <button
        style={{ ...styles.abilityBtn, position: 'absolute', right: `calc(220px + ${safeRight})`, bottom: `calc(125px + ${safeBottom})`, opacity: missileAmmo > 0 ? 1 : 0.3 }}
        onPointerDown={(e) => { e.stopPropagation(); if (missileAmmo > 0) onFireMissile?.(); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={missileAmmo > 0 ? '#ff6666' : '#664444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L15 8L12 22L9 8Z" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      </button>
      {/* GRAV — lower-left of ring */}
      <button
        style={{ ...styles.abilityBtn, position: 'absolute', right: `calc(183px + ${safeRight})`, bottom: `calc(60px + ${safeBottom})` }}
        onPointerDown={(e) => { e.stopPropagation(); onGravPush?.(); }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bb88ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2V6M12 18V22M2 12H6M18 12H22" />
        </svg>
      </button>
      {/* Climb/dive removed — pitch is now part of the right stick Y. */}
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
    position: 'absolute' as const,
    width: 34,
    height: 34,
    borderRadius: 17,
    background: 'transparent',
    border: '1.5px solid rgba(100, 140, 180, 0.25)',
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
