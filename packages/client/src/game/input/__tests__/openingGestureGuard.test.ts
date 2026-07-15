import { describe, expect, it } from 'vitest';
import { createOpeningGestureGuard } from '../openingGestureGuard.js';

/**
 * Regression coverage for the "one tap opens the planet menu AND activates
 * На поверхню" bug (see SystemScene.ts `pointerdown` → PlanetContextMenu →
 * `onSurface`). PixiJS pointer input isn't available in this unit-test
 * environment, so the underlying pure decision guard is modeled directly:
 * the same sequence of DOM events a real device would dispatch is fed in,
 * and we assert the trailing "ghost" click of the OPENING gesture never
 * reaches an action (e.g. `onSurface`), while a genuinely separate,
 * subsequent tap/click does — exactly once.
 */
describe('createOpeningGestureGuard', () => {
  function simulateGesture(guard: ReturnType<typeof createOpeningGestureGuard>, isKeyboardOrProgrammatic = false) {
    // A completed mouse/touch gesture always ends with exactly one browser
    // `click`. Returns whether that click was allowed to reach the menu.
    const suppressed = guard.consumeClick(isKeyboardOrProgrammatic);
    return !suppressed;
  }

  it('suppresses the trailing click of the gesture that opened the menu', () => {
    // 1) pointerdown on the planet opens the menu (menu mount happens here,
    //    outside the guard — the guard is created at that same moment).
    const guard = createOpeningGestureGuard();

    // 2) the SAME gesture's pointerup fires shortly after, followed by the
    //    browser's synthesized `click`, hit-tested against the now-mounted
    //    menu. This must NOT be allowed to reach "На поверхню".
    let onSurfaceCalls = 0;
    const activated = simulateGesture(guard);
    if (activated) onSurfaceCalls += 1;

    expect(activated).toBe(false);
    expect(onSurfaceCalls).toBe(0);
  });

  it('allows a distinct follow-up click/tap to activate an action exactly once', () => {
    const guard = createOpeningGestureGuard();

    // Opening gesture's ghost click — suppressed.
    expect(simulateGesture(guard)).toBe(false);

    // A genuinely separate second tap/click on "На поверхню".
    let onSurfaceCalls = 0;
    const secondGestureActivated = simulateGesture(guard);
    if (secondGestureActivated) onSurfaceCalls += 1;

    expect(secondGestureActivated).toBe(true);
    expect(onSurfaceCalls).toBe(1);

    // A third click (e.g. accidental extra tap) is a normal click and must
    // also go through — the guard only ever swallows the first one.
    expect(simulateGesture(guard)).toBe(true);
  });

  it('never suppresses keyboard/programmatic activation (detail === 0)', () => {
    const guard = createOpeningGestureGuard();

    // Enter/Space on a focused button fires `click` with detail === 0.
    // Even as the very first event the guard observes, it must go through
    // immediately — accessibility activation is never delayed or blocked.
    const activatedViaKeyboard = simulateGesture(guard, true);
    expect(activatedViaKeyboard).toBe(true);

    // The guard is still armed afterwards (a keyboard click never consumes
    // the pointer-gesture suppression slot), so the real ghost click from
    // the opening pointer gesture — if it arrives later — is still caught.
    expect(guard.phase).toBe('armed');
    expect(simulateGesture(guard)).toBe(false);
  });

  it('finish() prevents a later, unrelated click from being swallowed', () => {
    const guard = createOpeningGestureGuard();
    guard.finish();

    // No ghost click ever arrived (e.g. pointercancel) and the guard was
    // cleaned up; a later legitimate click must not be treated as ghost.
    expect(simulateGesture(guard)).toBe(true);
  });
});
