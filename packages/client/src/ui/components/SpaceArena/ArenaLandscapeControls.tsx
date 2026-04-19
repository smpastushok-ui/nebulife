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

// Radius of joystick deflection in pixels. Larger = more precision, but
// also more reach. Right stick keeps 60; left stick gets 75 to match the
// bigger hint ring introduced below.
const MAX_RADIUS = 60;
const LEFT_STICK_RADIUS = 75;
const DEADZONE = 10; // pixels, for firing threshold
// Left stick visuals: bigger ring + dropped down + labels on the OUTSIDE.
const LEFT_HINT_SIZE = 150;
const LEFT_HINT_BOTTOM = 40; // px above safe-area; lower than right stick
const LEFT_HINT_LEFT = 80;   // px from screen edge

export const ArenaLandscapeControls: React.FC<ArenaLandscapeControlsProps> = ({
  onMove, onAim,
  onDash: _onDash, onFireMissile: _onFireMissile, onGravPush: _onGravPush,
  onVertical: _onVertical, onSector,
  missileAmmo: _missileAmmo = 10, warpReady: _warpReady = true,
  needRotate = false,
}) => {
  // Convert viewport coords → container-local when CSS-rotated
  const toLocal = useCallback((vx: number, vy: number): { x: number; y: number } => {
    if (!needRotate) return { x: vx, y: vy };
    return { x: vy, y: window.innerWidth - vx };
  }, [needRotate]);

  // -- Left joystick (MOVE + sector) --
  const leftBaseRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const leftHintRef = useRef<HTMLDivElement>(null); // visible ring — anchor for "inside/outside"
  const leftPointerId = useRef<number | null>(null);
  const leftOrigin = useRef({ x: 0, y: 0 });
  // Gesture flag: true if the *initial* touch was inside the visible ring.
  // Thrust stays on while this gesture is ongoing (per press). Releasing
  // and re-pressing on a sector without hitting the center → thrust OFF,
  // weapon still fires (ship decelerates naturally via drag).
  const leftStartedInside = useRef(false);

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

    if (isLeft) {
      // Inside-ring check in container-local coords (see handlePointerMove
      // for the rotation explanation). Both `local` and `hintCenterLocal`
      // live in the rotated container frame, so angular/position comparisons
      // match what the user sees.
      leftStartedInside.current = false;
      const hintEl = leftHintRef.current;
      if (hintEl) {
        const rect = hintEl.getBoundingClientRect();
        const hintCenterLocal = toLocal(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        const ddx = local.x - hintCenterLocal.x;
        const ddy = local.y - hintCenterLocal.y;
        const ringR = rect.width / 2;
        if (ddx * ddx + ddy * ddy <= ringR * ringR) {
          leftStartedInside.current = true;
        }
      }
    } else {
      onAim(0, 0, true);
    }
  }, [onAim, toLocal]);

  const handlePointerMove = useCallback((e: React.PointerEvent, isLeft: boolean) => {
    const pointerIdRef = isLeft ? leftPointerId : rightPointerId;
    if (pointerIdRef.current !== e.pointerId) return;

    const local = toLocal(e.clientX, e.clientY);
    const origin = (isLeft ? leftOrigin : rightOrigin).current;
    let dx = local.x - origin.x;
    let dy = local.y - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const radius = isLeft ? LEFT_STICK_RADIUS : MAX_RADIUS;
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }

    const knobRef = isLeft ? leftKnobRef : rightKnobRef;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    const nx = dx / radius;
    const ny = dy / radius;

    if (isLeft) {
      // Gesture model:
      //   - Thrust ON only if the press STARTED inside the visible ring.
      //   - Finger inside ring  → pure thrust, no weapon (sector = center).
      //   - Finger outside ring → weapon sector activates (laser / missile /
      //     warp / dodge). Thrust stays on if started inside.
      //
      // Coordinate correctness: when the container is CSS-rotated (portrait
      // device held in landscape), screen coords and container coords differ
      // by a 90° spin. Always work in container-local coords via toLocal()
      // so the sector mapping (up=LASER, right=WARP, down=DODGE, left=MISSILE)
      // matches what the user SEES on screen.
      const hintEl = leftHintRef.current;
      let insideRing = false;
      let angle = 0;
      if (hintEl) {
        const rect = hintEl.getBoundingClientRect();
        const hintCenterLocal = toLocal(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        const ddx = local.x - hintCenterLocal.x;
        const ddy = local.y - hintCenterLocal.y;
        const ringR = rect.width / 2;
        const distFromRingCenter = Math.sqrt(ddx * ddx + ddy * ddy);
        insideRing = distFromRingCenter <= ringR;
        angle = Math.atan2(-ddy, ddx); // up on screen = positive angle
      }

      const thrust = leftStartedInside.current ? 1 : 0;
      onMove(0, -thrust);

      let sector: 'center' | 'laser' | 'missile' | 'warp' | 'dodge' = 'center';
      if (!insideRing) {
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
      leftStartedInside.current = false;
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
        <div
          ref={leftHintRef}
          style={{
            ...styles.hint,
            bottom: `calc(${LEFT_HINT_BOTTOM}px + ${safeBottom})`,
            left: `calc(${LEFT_HINT_LEFT}px + ${safeLeft})`,
            width: LEFT_HINT_SIZE, height: LEFT_HINT_SIZE,
          }}>
          <div style={{ ...styles.hintRing, width: LEFT_HINT_SIZE, height: LEFT_HINT_SIZE }} />
          {/* Sector labels — positioned OUTSIDE the ring on the outer
              perimeter. Using a larger SVG viewbox than the ring itself
              so text sits 20px beyond the circle's edge. */}
          <svg
            width={LEFT_HINT_SIZE + 60}
            height={LEFT_HINT_SIZE + 60}
            viewBox={`-${LEFT_HINT_SIZE / 2 + 30} -${LEFT_HINT_SIZE / 2 + 30} ${LEFT_HINT_SIZE + 60} ${LEFT_HINT_SIZE + 60}`}
            style={{
              position: 'absolute',
              left: -30, top: -30,
              pointerEvents: 'none',
            }}
          >
            {/* Up: laser */}
            <text x="0" y={-(LEFT_HINT_SIZE / 2) - 12} fill="#44ffaa" fontSize="11" textAnchor="middle" fontFamily="monospace">LASER</text>
            {/* Left: missile */}
            <text x={-(LEFT_HINT_SIZE / 2) - 20} y="4" fill="#ff6666" fontSize="11" textAnchor="middle" fontFamily="monospace">MISSILE</text>
            {/* Right: warp */}
            <text x={(LEFT_HINT_SIZE / 2) + 18} y="4" fill="#44ddff" fontSize="11" textAnchor="middle" fontFamily="monospace">WARP</text>
            {/* Down: dodge */}
            <text x="0" y={(LEFT_HINT_SIZE / 2) + 18} fill="#ffcc44" fontSize="11" textAnchor="middle" fontFamily="monospace">DODGE</text>
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
        <div style={{
          // Right stick lowered so its center (bottom + 45 = 115) matches
          // the left stick's center (40 + 75 = 115) — sticks on one line.
          ...styles.hint,
          bottom: `calc(70px + ${safeBottom})`,
          right: `calc(110px + ${safeRight})`,
        }}>
          <div style={{ ...styles.hintRing, borderColor: 'rgba(255, 68, 68, 0.2)' }} />
          <span style={{ ...styles.hintLabel, color: 'rgba(255, 68, 68, 0.3)' }}>AIM</span>
        </div>
        <div ref={rightBaseRef} style={{ ...styles.base, borderColor: 'rgba(255, 68, 68, 0.4)' }}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(255, 68, 68, 0.7)' }} />
        </div>
      </div>

      {/* Ability buttons around the right stick removed — warp, missile and
          gravity are now driven by the left stick sectors. Right stick is
          aim-only. */}
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
