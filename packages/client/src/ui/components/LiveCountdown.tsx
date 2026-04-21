import React, { useEffect, useRef } from 'react';
import { formatGameTime, remainingGameSeconds } from '@nebulife/core';

/**
 * LiveCountdown — leaf component that self-updates the doomsday clock text
 * at 24Hz WITHOUT triggering any React re-renders.
 *
 * Why: the game-second clock needs to tick ~24 times per real second to
 * preserve its "frantic" feel. Driving that through React state forced the
 * entire App.tsx tree (~6000 lines) to re-evaluate 24×/sec, starving the
 * PixiJS/Three.js main thread on low-end Android. We now write the text
 * content directly to a DOM node via `ref.textContent = ...` — React never
 * knows the text changed, the browser just reflows one `<span>`.
 *
 * Parent component still owns the visibility condition (render this only
 * when exodus is active + clock revealed + no evacuation cutscene).
 */

interface LiveCountdownProps {
  gameStartedAt: number;
  timeMultiplier: number;
  accelAt: number | null;
  gameTimeAtAccel: number;
  /** Threshold below which the clock enters "urgent" (red pulse) mode. */
  urgentThresholdSec?: number;
  /**
   * Predicate called each tick — return true to skip the update (e.g. when
   * surface scene is open). Intentionally a function (not a ref to boolean)
   * so the parent can pass any ref-backed condition without type gymnastics.
   */
  isPaused?: () => boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Class applied when urgent. Parent can hook its own pulse animation. */
  urgentClassName?: string;
}

export function LiveCountdown({
  gameStartedAt,
  timeMultiplier,
  accelAt,
  gameTimeAtAccel,
  urgentThresholdSec = 7200,
  isPaused,
  className,
  style,
  urgentClassName = 'countdown-urgent',
}: LiveCountdownProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  // Remember last rendered text so we skip DOM writes when unchanged
  // (cheap optimization — most 42ms ticks produce the same HH:MM:SS at 1×
  // multiplier, though at 24× every tick flips the seconds digit).
  const lastTextRef = useRef<string>('');
  const lastUrgentRef = useRef<boolean | null>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const tick = () => {
      if (isPaused?.()) return;
      const gameSecs = remainingGameSeconds(
        gameStartedAt,
        Date.now(),
        timeMultiplier,
        accelAt,
        gameTimeAtAccel,
      );
      const t = formatGameTime(gameSecs);
      if (t.text !== lastTextRef.current) {
        el.textContent = t.text;
        lastTextRef.current = t.text;
      }
      const urgent = t.totalGameSeconds < urgentThresholdSec;
      if (urgent !== lastUrgentRef.current) {
        lastUrgentRef.current = urgent;
        if (urgent) el.classList.add(urgentClassName);
        else el.classList.remove(urgentClassName);
      }
    };

    // Prime the DOM synchronously so first paint has text
    tick();
    const id = setInterval(tick, 42);
    return () => clearInterval(id);
  }, [gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel, urgentThresholdSec, isPaused, urgentClassName]);

  return <span ref={spanRef} className={className} style={style} />;
}
