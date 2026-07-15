export const RING_UNLOCK_FALLBACK_MS = 5_600;
export const POST_UNLOCK_ASTRA_PAUSE_MS = 900;

export interface PrecursorUnlockSequenceDeps {
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface PrecursorUnlockSequenceOptions {
  rings: readonly number[];
  startUnlock: (ring: number, onComplete: () => void) => void | (() => void);
  onReadyForAstra: () => void;
  unlockFallbackMs?: number;
  postUnlockPauseMs?: number;
}

export interface PrecursorUnlockSequenceController {
  cancel: () => void;
}

/**
 * Runs ring unlocks serially after the acquisition card has completed, then
 * releases ASTRA after a short quiet beat. Each animation advances through
 * its explicit completion callback; the timeout is only a safety fallback
 * for a stalled/destroyed Pixi scene.
 */
export function startPrecursorUnlockSequence(
  options: PrecursorUnlockSequenceOptions,
  deps: PrecursorUnlockSequenceDeps = {},
): PrecursorUnlockSequenceController {
  const setTimeoutFn = deps.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = deps.clearTimeoutFn ?? clearTimeout;
  const rings = Array.from(new Set(options.rings.filter((ring) => ring > 0)));
  const fallbackMs = options.unlockFallbackMs ?? RING_UNLOCK_FALLBACK_MS;
  const pauseMs = options.postUnlockPauseMs ?? POST_UNLOCK_ASTRA_PAUSE_MS;

  let cancelled = false;
  let activeCancel: void | (() => void);
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let pauseTimer: ReturnType<typeof setTimeout> | null = null;
  let index = 0;

  const clearFallback = () => {
    if (fallbackTimer !== null) clearTimeoutFn(fallbackTimer);
    fallbackTimer = null;
  };

  const finish = () => {
    if (cancelled) return;
    pauseTimer = setTimeoutFn(() => {
      pauseTimer = null;
      if (!cancelled) options.onReadyForAstra();
    }, pauseMs);
  };

  const runNext = () => {
    if (cancelled) return;
    const ring = rings[index];
    if (ring === undefined) {
      finish();
      return;
    }

    let settled = false;
    const completeUnlock = () => {
      if (cancelled || settled) return;
      settled = true;
      clearFallback();
      activeCancel = undefined;
      index += 1;
      runNext();
    };

    activeCancel = options.startUnlock(ring, completeUnlock);
    fallbackTimer = setTimeoutFn(completeUnlock, fallbackMs);
  };

  runNext();

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      clearFallback();
      if (pauseTimer !== null) clearTimeoutFn(pauseTimer);
      pauseTimer = null;
      activeCancel?.();
      activeCancel = undefined;
    },
  };
}
