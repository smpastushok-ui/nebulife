/**
 * Pure state machine that fixes the "click-through" bug where a single
 * physical mouse/touch gesture triggers two navigations:
 *
 *   1. `pointerdown` on a planet opens a context menu (new DOM overlay
 *      mounts immediately, before the pointer is released).
 *   2. The SAME gesture's trailing browser `click` event is then hit-tested
 *      against the CURRENT DOM (post-mount) — landing on whichever menu
 *      item now happens to sit under the release point — and instantly
 *      activates it (e.g. "На поверхню").
 *
 * Root cause: the opening gesture and the "ghost" click that follows it are
 * one continuous physical action, but the DOM changed under the pointer
 * mid-gesture. The fix is not a guessed delay — it is to deterministically
 * recognize and suppress exactly the one trailing `click` that belongs to
 * the gesture which opened the menu, and let every subsequent, genuinely
 * separate click/tap through immediately (mouse, touch, and keyboard alike).
 *
 * A keyboard- or programmatically-dispatched click (`event.detail === 0`,
 * as fired by Enter/Space activation on a focused button) is NEVER
 * suppressed, so accessibility activation is never delayed.
 */

export type OpeningGestureGuardPhase = 'armed' | 'done';

export interface OpeningGestureGuard {
  /** Current phase — exposed mainly for tests/inspection. */
  readonly phase: OpeningGestureGuardPhase;
  /**
   * Call for every `click` observed while the guard is attached.
   * Returns `true` if the caller should suppress this event
   * (`stopPropagation` + `preventDefault`) because it is the trailing
   * ghost-click of the gesture that opened the menu.
   */
  consumeClick(isKeyboardOrProgrammatic: boolean): boolean;
  /**
   * Force the guard to `done` — used as a cleanup fallback (e.g. on unmount,
   * or when no companion click ever arrives after a `pointercancel`) so the
   * guard never dangles and never suppresses an unrelated later click.
   */
  finish(): void;
}

export function createOpeningGestureGuard(): OpeningGestureGuard {
  let phase: OpeningGestureGuardPhase = 'armed';
  return {
    get phase() {
      return phase;
    },
    consumeClick(isKeyboardOrProgrammatic: boolean) {
      if (phase !== 'armed') return false;
      // Explicit keyboard/programmatic activation must always go through —
      // it can never be the ghost click of a pointer gesture.
      if (isKeyboardOrProgrammatic) return false;
      phase = 'done';
      return true;
    },
    finish() {
      phase = 'done';
    },
  };
}
