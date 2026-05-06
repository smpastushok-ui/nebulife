import React, { useRef, useCallback } from 'react';

interface ArenaLandscapeControlsProps {
  onMove: (x: number, y: number) => void;
  onAim: (x: number, y: number, isFiring: boolean) => void;
  onDash: () => void;
  onLoop?: () => void;
  onFireMissile?: () => void;
  onGravPush?: () => void;
  /** -1..+1 vertical thrust (deprecated — kept for API compat, no-op now). */
  onVertical?: (v: number) => void;
  /** Left-stick sector — which quadrant the thumb is pulled toward.
   *  'center' = just thrust, outer quadrants trigger utility actions.
   *  Laser fire is automatic when an enemy is in the central sight cone. */
  onSector?: (sector: 'center' | 'missile' | 'warp' | 'dodge' | 'gravity') => void;
  allowLoop?: boolean;
  missileAmmo?: number;
  warpReady?: boolean;
  loopReady?: boolean;
  isLooping?: boolean;
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
  onDash: _onDash, onLoop: _onLoop, onFireMissile: _onFireMissile, onGravPush: _onGravPush,
  onVertical: _onVertical, onSector,
  allowLoop = false,
  missileAmmo: _missileAmmo = 10, warpReady: _warpReady = true,
  loopReady: _loopReady = true, isLooping: _isLooping = false,
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
  const leftLastSector = useRef<'center' | 'missile' | 'warp' | 'dodge' | 'loop' | 'gravity'>('center');
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
      // Right stick is aim-only — NEVER fires the laser. Laser is driven
      // exclusively by the left stick's "laser" sector now.
      onAim(0, 0, false);
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
      // so the sector mapping (up=GRAVITY, right=WARP, down=LOOP, left=MISSILE)
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

      let sector: 'center' | 'missile' | 'warp' | 'dodge' | 'loop' | 'gravity' = 'center';
      if (!insideRing) {
        if (angle > Math.PI / 4 && angle < 3 * Math.PI / 4) sector = 'gravity';
        else if (angle >= -Math.PI / 4 && angle <= Math.PI / 4) sector = 'warp';
        else if (angle < -Math.PI / 4 && angle > -3 * Math.PI / 4) sector = allowLoop ? 'loop' : 'dodge';
        else sector = 'missile';
      }
      if (sector === 'loop') {
        if (leftLastSector.current !== 'loop') _onLoop?.();
        onSector?.('center');
      } else {
        onSector?.(sector);
      }
      leftLastSector.current = sector;
    } else {
      // Right stick drives pitch/yaw only; laser fire is left-stick sector.
      onAim(nx, ny, false);
    }
  }, [onMove, onAim, onSector, toLocal, allowLoop, _onLoop]);

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
      leftLastSector.current = 'center';
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
          <AbilityGlyph kind="gravity" color="#bb88ff" style={{ top: -28, left: '50%', transform: 'translateX(-50%)' }} />
          <AbilityGlyph kind="missile" color="#ff6666" style={{ left: -30, top: '50%', transform: 'translateY(-50%)' }} />
          <AbilityGlyph kind="warp" color="#44ddff" style={{ right: -30, top: '50%', transform: 'translateY(-50%)' }} />
          <AbilityGlyph kind={allowLoop ? 'loop' : 'dodge'} color="#ffcc44" style={{ bottom: -30, left: '50%', transform: 'translateX(-50%)' }} />
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
          <div style={{ ...styles.hintRing, borderColor: 'rgba(68, 255, 136, 0.3)' }} />
          <span style={{ ...styles.hintLabel, color: 'rgba(68, 255, 136, 0.45)' }}>PILOT</span>
        </div>
        <div ref={rightBaseRef} style={{ ...styles.base, borderColor: 'rgba(68, 255, 136, 0.45)' }}>
          <div ref={rightKnobRef} style={{ ...styles.knob, background: 'rgba(68, 255, 136, 0.7)' }} />
        </div>
      </div>

      {/* Ability buttons around the right stick removed — warp, missile and
          gravity are now driven by the left stick sectors. Right stick is
          aim-only. */}
      {allowLoop && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (_loopReady) _onLoop?.();
          }}
          disabled={!_loopReady}
          style={{
            position: 'absolute',
            left: `calc(${LEFT_HINT_LEFT + LEFT_HINT_SIZE + 22}px + ${safeLeft})`,
            bottom: `calc(${LEFT_HINT_BOTTOM + 14}px + ${safeBottom})`,
            width: 56,
            height: 56,
            borderRadius: 8,
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            background: _isLooping
              ? 'radial-gradient(circle, rgba(68,221,255,0.38), rgba(5,12,24,0.90))'
              : 'rgba(5,12,24,0.86)',
            border: `1px solid ${_loopReady ? 'rgba(68,221,255,0.66)' : 'rgba(51,68,85,0.7)'}`,
            color: _loopReady ? '#aaddff' : '#556677',
            fontFamily: 'monospace',
            fontSize: 8,
            letterSpacing: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            boxShadow: _loopReady ? '0 0 18px rgba(68,221,255,0.20)' : 'none',
          }}
        >
          <svg width="25" height="25" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 18C7 10 15 6 21 10C27 14 24 24 16 24" />
            <path d="M16 24l4-4M16 24l5 3" />
            <path d="M9 17l-4-4M9 17l-5 2" />
          </svg>
          <span>{_isLooping ? 'LOOP' : _loopReady ? 'LOOP' : 'WAIT'}</span>
        </button>
      )}
    </div>
  );
};

function AbilityGlyph({
  kind,
  color,
  style,
}: {
  kind: 'gravity' | 'missile' | 'warp' | 'dodge' | 'loop';
  color: string;
  style: React.CSSProperties;
}) {
  return (
    <div style={{ ...styles.sectorGlyph, borderColor: `${color}66`, boxShadow: `0 0 14px ${color}22`, ...style }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'gravity' && (
          <>
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.4 6.4l2.8 2.8M14.8 14.8l2.8 2.8M17.6 6.4l-2.8 2.8M9.2 14.8l-2.8 2.8" />
          </>
        )}
        {kind === 'missile' && (
          <>
            <path d="M12 3l4 7-4 11-4-11 4-7z" />
            <path d="M8.5 13H5M19 13h-3.5M10 18l-2 3M14 18l2 3" />
          </>
        )}
        {kind === 'warp' && (
          <>
            <path d="M4 12h10M10 6l6 6-6 6" />
            <path d="M17 5c2.2 3.8 2.2 10.2 0 14" opacity="0.75" />
          </>
        )}
        {kind === 'dodge' && (
          <>
            <path d="M7 6l-4 6 4 6M17 6l4 6-4 6" />
            <path d="M10 8l4 4-4 4" opacity="0.85" />
          </>
        )}
        {kind === 'loop' && (
          <>
            <path d="M6 14c0-6 6-9 11-6 5 3 3 11-4 11" />
            <path d="M13 19l4-4M13 19l5 2" />
          </>
        )}
      </svg>
    </div>
  );
}

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
    border: '1.5px dashed rgba(123, 184, 255, 0.24)',
    boxShadow: 'inset 0 0 18px rgba(68,136,170,0.10), 0 0 18px rgba(68,136,170,0.08)',
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
  sectorGlyph: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 8,
    background: 'linear-gradient(180deg, rgba(8,14,24,0.82), rgba(4,9,18,0.58))',
    border: '1px solid rgba(100,140,180,0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    backdropFilter: 'blur(4px)',
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
