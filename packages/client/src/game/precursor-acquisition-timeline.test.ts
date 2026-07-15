import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startPrecursorAcquisitionTimeline,
  PRECURSOR_ACQUISITION_SCHEDULE,
  type PrecursorAcquisitionPhase,
} from './precursor-acquisition-timeline.js';

describe('precursor-acquisition-timeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function harness() {
    const phases: PrecursorAcquisitionPhase[] = [];
    const materializeCalls: number[] = [];
    let completeCalls = 0;
    const controller = startPrecursorAcquisitionTimeline({
      onPhaseChange: (phase) => phases.push(phase),
      onMaterialize: () => materializeCalls.push(Date.now()),
      onComplete: () => { completeCalls += 1; },
    });
    return { controller, phases, materializeCalls, getCompleteCalls: () => completeCalls };
  }

  it('regression: a dismiss request at ~1s (the reported bug) does NOT end the cinematic early', () => {
    const { controller, phases, getCompleteCalls } = harness();

    vi.advanceTimersByTime(1000);
    const accepted = controller.requestDismiss();

    expect(accepted).toBe(false);
    expect(getCompleteCalls()).toBe(0);
    // The card must still be mid-cinematic, not gone.
    expect(phases).toContain('materialize');
    expect(phases).not.toContain('revealed');
  });

  it('ignores repeated early dismiss attempts, then honours one made after the anti-accidental floor', () => {
    const { controller, getCompleteCalls } = harness();

    vi.advanceTimersByTime(200);
    expect(controller.requestDismiss()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(controller.requestDismiss()).toBe(false);
    expect(getCompleteCalls()).toBe(0);

    vi.advanceTimersByTime(PRECURSOR_ACQUISITION_SCHEDULE.minDismissMs - 700 + 5);
    expect(controller.canDismiss()).toBe(true);
    expect(controller.requestDismiss()).toBe(true);
    expect(getCompleteCalls()).toBe(1);
  });

  it('runs the full phase schedule in order when never dismissed, then auto-completes exactly once', () => {
    const { controller, phases, materializeCalls, getCompleteCalls } = harness();

    vi.advanceTimersByTime(PRECURSOR_ACQUISITION_SCHEDULE.materializeMs);
    expect(phases).toEqual(['materialize']);
    expect(materializeCalls).toHaveLength(1);

    vi.advanceTimersByTime(PRECURSOR_ACQUISITION_SCHEDULE.flipMs - PRECURSOR_ACQUISITION_SCHEDULE.materializeMs);
    expect(phases).toEqual(['materialize', 'flip']);

    vi.advanceTimersByTime(PRECURSOR_ACQUISITION_SCHEDULE.revealedMs - PRECURSOR_ACQUISITION_SCHEDULE.flipMs);
    expect(phases).toEqual(['materialize', 'flip', 'revealed']);
    expect(getCompleteCalls()).toBe(0);

    vi.advanceTimersByTime(
      PRECURSOR_ACQUISITION_SCHEDULE.autoDismissMs - PRECURSOR_ACQUISITION_SCHEDULE.revealedMs,
    );
    expect(getCompleteCalls()).toBe(1);

    // Nothing fires again after completion — no stale timers left running.
    vi.advanceTimersByTime(10_000);
    expect(getCompleteCalls()).toBe(1);
    controller.cancel();
    expect(getCompleteCalls()).toBe(1);
  });

  it('never calls onComplete twice even if requestDismiss races the auto-dismiss timer', () => {
    const { controller, getCompleteCalls } = harness();
    vi.advanceTimersByTime(PRECURSOR_ACQUISITION_SCHEDULE.autoDismissMs);
    expect(getCompleteCalls()).toBe(1);
    expect(controller.requestDismiss()).toBe(false); // already settled
    expect(getCompleteCalls()).toBe(1);
  });

  it('cancel() during teardown clears all pending timers WITHOUT firing onComplete (unmount != acknowledgement)', () => {
    const { controller, phases, getCompleteCalls } = harness();

    vi.advanceTimersByTime(500);
    controller.cancel();
    vi.advanceTimersByTime(20_000);

    expect(getCompleteCalls()).toBe(0);
    expect(phases).toEqual([]); // materialize/flip/revealed never fired post-cancel
  });

  it('cancel() is idempotent (safe to call multiple times, e.g. React StrictMode double-invoke)', () => {
    const { controller, getCompleteCalls } = harness();
    controller.cancel();
    controller.cancel();
    controller.cancel();
    vi.advanceTimersByTime(20_000);
    expect(getCompleteCalls()).toBe(0);
  });

  it('canDismiss() is false before the floor, true at/after it, and false again once settled', () => {
    const { controller } = harness();
    expect(controller.canDismiss()).toBe(false);
    vi.advanceTimersByTime(PRECURSOR_ACQUISITION_SCHEDULE.minDismissMs - 1);
    expect(controller.canDismiss()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(controller.canDismiss()).toBe(true);
    controller.requestDismiss();
    expect(controller.canDismiss()).toBe(false);
  });
});
