// ---------------------------------------------------------------------------
// PrecursorAcquisitionTimeline — pure, framework-agnostic sequencing for the
// "Сигнал Предтеч отримано" cinematic (see PrecursorAcquisitionOverlay.tsx).
//
// Root cause this fixes (UX audit, July 2026): the overlay used to treat ANY
// click/tap — at ANY point in its ~4.5s cinematic, including the very first
// frame — as "dismiss now", with no minimum comfortable viewing time. A
// single stray tap (e.g. the same tap the player used to enter a system, or
// dismiss something else on screen) could cut the card down to ~1s. Nothing
// then blocked whatever came next (a system-entry transition, ASTRA's queued
// onboarding, ...), so the whole moment felt like an uncoordinated pile-up
// of independent timers rather than one readable sequence.
//
// This module owns the schedule and an explicit "may the player dismiss
// now?" gate so the React component only renders — it never invents timing
// itself. Timer-based (not requestAnimationFrame) so it is fully unit
// testable with `vi.useFakeTimers()` without a DOM/React environment,
// matching this package's existing pure-logic test convention
// (packages/client/vitest.config.ts → environment: 'node').
// ---------------------------------------------------------------------------

export type PrecursorAcquisitionPhase = 'static' | 'materialize' | 'flip' | 'revealed';

export interface PrecursorAcquisitionSchedule {
  /** static → materialize (card-back + glow fade in). */
  materializeMs: number;
  /** materialize → flip (3D flip to face). */
  flipMs: number;
  /** flip → revealed (name + rarity label fade in). */
  revealedMs: number;
  /**
   * Anti-accidental floor: the earliest moment a deliberate dismiss
   * (tap/click, "Continue" button, Escape/Enter) is honoured. Before this,
   * dismiss requests are silently ignored — never queued, never delayed —
   * so an accidental tap simply does nothing instead of cutting the card
   * short.
   */
  minDismissMs: number;
  /** Auto-completes the cinematic if the player never acts. */
  autoDismissMs: number;
}

/** Default schedule — comfortable ~4.8s total, matches Game Bible pacing for
 *  other full-screen one-shot cinematics (e.g. RingUnlockAnimation, 4.8s). */
export const PRECURSOR_ACQUISITION_SCHEDULE: PrecursorAcquisitionSchedule = {
  materializeMs: 900,
  flipMs: 1500,
  revealedMs: 2700,
  minDismissMs: 1800,
  autoDismissMs: 4800,
};

export interface PrecursorAcquisitionTimelineHandlers {
  onPhaseChange: (phase: PrecursorAcquisitionPhase) => void;
  /** Fired once, exactly when the 'materialize' phase begins (acquire SFX cue). */
  onMaterialize?: () => void;
  /** Fired exactly once — auto-dismiss OR an accepted deliberate dismiss. Never fires from `cancel()`. */
  onComplete: () => void;
}

export interface PrecursorAcquisitionTimelineDeps {
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
  now?: () => number;
}

export interface PrecursorAcquisitionTimelineController {
  /** True once the anti-accidental floor has elapsed and the cinematic hasn't completed yet. */
  canDismiss: () => boolean;
  /**
   * Deliberate dismiss request (tap/click on the overlay, "Continue"
   * button, Escape/Enter). No-op (returns false) before the anti-accidental
   * floor or after completion — the request is dropped, not queued, so it
   * can never "leak" into a later, unrelated moment.
   */
  requestDismiss: () => boolean;
  /**
   * Cancels every pending timer without firing `onComplete`. Safe to call
   * more than once (React StrictMode double-invoke, unmount, teardown on
   * navigation/reset). Distinguishing cancel from completion matters: a
   * teardown is not the player acknowledging the card, so the caller's own
   * queue-advance logic must not run twice.
   */
  cancel: () => void;
}

export function startPrecursorAcquisitionTimeline(
  handlers: PrecursorAcquisitionTimelineHandlers,
  schedule: PrecursorAcquisitionSchedule = PRECURSOR_ACQUISITION_SCHEDULE,
  deps: PrecursorAcquisitionTimelineDeps = {},
): PrecursorAcquisitionTimelineController {
  const setTimeoutFn = deps.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = deps.clearTimeoutFn ?? clearTimeout;
  const now = deps.now ?? Date.now;

  const dismissAllowedAt = now() + schedule.minDismissMs;
  let settled = false; // true after complete() or cancel() — either way, no more transitions
  const timers: Array<ReturnType<typeof setTimeout>> = [];

  const runAfter = (fn: () => void, delayMs: number) => {
    timers.push(setTimeoutFn(fn, delayMs));
  };

  const clearAllTimers = () => {
    for (const id of timers) clearTimeoutFn(id);
    timers.length = 0;
  };

  const complete = () => {
    if (settled) return;
    settled = true;
    clearAllTimers();
    handlers.onComplete();
  };

  runAfter(() => {
    handlers.onPhaseChange('materialize');
    handlers.onMaterialize?.();
  }, schedule.materializeMs);
  runAfter(() => handlers.onPhaseChange('flip'), schedule.flipMs);
  runAfter(() => handlers.onPhaseChange('revealed'), schedule.revealedMs);
  runAfter(complete, schedule.autoDismissMs);

  return {
    canDismiss: () => !settled && now() >= dismissAllowedAt,
    requestDismiss: () => {
      if (settled || now() < dismissAllowedAt) return false;
      complete();
      return true;
    },
    cancel: () => {
      if (settled) return;
      settled = true;
      clearAllTimers();
    },
  };
}
