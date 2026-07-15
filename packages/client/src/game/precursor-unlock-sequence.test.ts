import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  POST_UNLOCK_ASTRA_PAUSE_MS,
  RING_UNLOCK_FALLBACK_MS,
  startPrecursorUnlockSequence,
} from './precursor-unlock-sequence.js';

describe('precursor unlock sequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts no unlock before the card completion launches the sequence', () => {
    const started: number[] = [];
    const startAfterCardComplete = () => startPrecursorUnlockSequence({
      rings: [3],
      startUnlock: (ring) => { started.push(ring); },
      onReadyForAstra: vi.fn(),
    });

    vi.advanceTimersByTime(10_000);
    expect(started).toEqual([]);

    startAfterCardComplete();
    expect(started).toEqual([3]);
  });

  it('waits for unlock completion and the post-animation pause before ASTRA', () => {
    let completeUnlock: (() => void) | undefined;
    const readyForAstra = vi.fn();

    startPrecursorUnlockSequence({
      rings: [3],
      startUnlock: (_ring, onComplete) => { completeUnlock = onComplete; },
      onReadyForAstra: readyForAstra,
    });

    vi.advanceTimersByTime(2_000);
    expect(readyForAstra).not.toHaveBeenCalled();

    completeUnlock?.();
    expect(readyForAstra).not.toHaveBeenCalled();
    vi.advanceTimersByTime(POST_UNLOCK_ASTRA_PAUSE_MS - 1);
    expect(readyForAstra).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(readyForAstra).toHaveBeenCalledTimes(1);
  });

  it('coalesces duplicate rings and runs distinct unlocks serially', () => {
    const started: number[] = [];
    const completions: Array<() => void> = [];

    startPrecursorUnlockSequence({
      rings: [3, 3, 4],
      startUnlock: (ring, onComplete) => {
        started.push(ring);
        completions.push(onComplete);
      },
      onReadyForAstra: vi.fn(),
    });

    expect(started).toEqual([3]);
    completions[0]();
    expect(started).toEqual([3, 4]);
  });

  it('uses a controlled fallback if the animation never reports completion', () => {
    const readyForAstra = vi.fn();
    startPrecursorUnlockSequence({
      rings: [3],
      startUnlock: vi.fn(),
      onReadyForAstra: readyForAstra,
    });

    vi.advanceTimersByTime(RING_UNLOCK_FALLBACK_MS);
    expect(readyForAstra).not.toHaveBeenCalled();
    vi.advanceTimersByTime(POST_UNLOCK_ASTRA_PAUSE_MS);
    expect(readyForAstra).toHaveBeenCalledTimes(1);
  });

  it('cancels animation cleanup, fallback, and ASTRA release on teardown', () => {
    const cancelAnimation = vi.fn();
    const readyForAstra = vi.fn();
    const controller = startPrecursorUnlockSequence({
      rings: [3],
      startUnlock: () => cancelAnimation,
      onReadyForAstra: readyForAstra,
    });

    controller.cancel();
    controller.cancel();
    vi.advanceTimersByTime(30_000);

    expect(cancelAnimation).toHaveBeenCalledTimes(1);
    expect(readyForAstra).not.toHaveBeenCalled();
  });
});
