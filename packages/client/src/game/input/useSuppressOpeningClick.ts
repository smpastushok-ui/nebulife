import { useLayoutEffect } from 'react';
import { createOpeningGestureGuard } from './openingGestureGuard.js';

/**
 * Attach to a modal/context-menu that can be opened by a `pointerdown`
 * (e.g. a planet tap in `SystemScene`). Suppresses the single trailing
 * `click` that belongs to the SAME physical gesture which opened it, so
 * that gesture can only open the menu — never also activate whatever menu
 * item happens to render under the release point. A distinct follow-up
 * click/tap, or an explicit keyboard Enter/Space activation, is never
 * delayed or blocked.
 *
 * Uses `useLayoutEffect` (not `useEffect`) so the capture-phase listeners
 * are attached synchronously during the same commit that mounted the menu —
 * before the browser can dispatch the gesture's trailing `click` as a
 * separate, later task. A new `pointerdown` is the deterministic boundary
 * between the opening gesture and a subsequent gesture: if one starts before
 * a companion click arrives, the guard disarms without swallowing anything.
 * No timeout or guessed suppression window is involved.
 */
export function useSuppressOpeningClick(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return undefined;

    const guard = createOpeningGestureGuard();

    const cleanup = () => {
      window.removeEventListener('pointerdown', onNextPointerDown, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('blur', onBlur);
    };

    const finishAndCleanup = () => {
      guard.finish();
      cleanup();
    };

    // This listener is installed while the opening `pointerdown` is already
    // being dispatched, after its capture phase has passed. Therefore the
    // first pointerdown observed here can only belong to a distinct gesture.
    const onNextPointerDown = () => {
      finishAndCleanup();
    };

    const onPointerCancel = () => {
      finishAndCleanup();
    };

    const onBlur = () => {
      finishAndCleanup();
    };

    const onClick = (event: MouseEvent) => {
      // Enter/Space on a focused button (and any programmatic dispatch)
      // fires `click` with `detail === 0` — real pointer clicks never do.
      const isKeyboardOrProgrammatic = event.detail === 0;
      if (guard.consumeClick(isKeyboardOrProgrammatic)) {
        event.stopPropagation();
        event.preventDefault();
        cleanup();
      }
    };

    window.addEventListener('pointerdown', onNextPointerDown, true);
    window.addEventListener('pointercancel', onPointerCancel, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('blur', onBlur);
    return cleanup;
  }, [active]);
}
