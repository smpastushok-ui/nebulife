import { useEffect, useRef } from 'react';

/**
 * Runs a callback on every animation frame while `active` is true.
 * Automatically cleans up on unmount or when `active` becomes false.
 * Used for timestamp-based progress bars that survive page reloads.
 */
export function useAnimationTick(
  callback: (now: number) => void,
  active: boolean,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!active) return;

    let rafId: number;
    const tick = () => {
      cbRef.current(Date.now());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [active]);
}
