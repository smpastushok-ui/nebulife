// ---------------------------------------------------------------------------
// ASTRA onboarding pacing helpers.
//
// App.tsx already gates the queued ASTRA onboarding dispatcher behind
// `astraOnboardingBlocked` (any modal/overlay/cutscene on screen, INCLUDING
// `precursorAcquisitionQueue.length > 0`) and a rolling `astraOnboardingGateUntilRef`
// timestamp — `ASTRA_ONBOARDING_MIN_GAP_MS` (60s) is applied AFTER an
// onboarding popup itself closes, so two explainers never show back-to-back.
//
// That rolling gate is the right extension point for the Precursor sequence:
// the moment the acquisition overlay's queue drains (card acknowledged or
// auto-dismissed), we push the SAME gate forward by a short, dedicated pause
// — `POST_OVERLAY_ASTRA_PAUSE_MS` — so ASTRA's "precursor" explainer never
// starts in the same beat as whatever follows the card (a system-entry
// transition, the player's next tap, ...). This is a minimal extension of
// the existing mechanism, not a parallel one: the dispatcher effect in
// App.tsx is untouched, it just sees a later `astraOnboardingGateUntilRef`.
// ---------------------------------------------------------------------------

/**
 * Short quiet window enforced specifically after a blocking overlay/cutscene
 * (currently: the Precursor acquisition card) closes, before ASTRA is
 * allowed to narrate about it. Deliberately much shorter than
 * `ASTRA_ONBOARDING_MIN_GAP_MS` (60s, the gap BETWEEN two onboarding popups)
 * — this only covers the "let the last animation/transition breathe" beat.
 */
export const POST_OVERLAY_ASTRA_PAUSE_MS = 900;

/**
 * Pushes a gate timestamp forward so it is never earlier than `now + pauseMs`,
 * without ever pulling it closer — an existing longer gate (e.g. the 60s
 * inter-onboarding gap, or the 8s initial-app-load delay) always wins.
 */
export function extendAstraGate(currentGateUntil: number, now: number, pauseMs: number): number {
  return Math.max(currentGateUntil, now + pauseMs);
}

/** Milliseconds ASTRA's dispatcher must still wait before showing the next
 *  queued onboarding entry. Always >= 0. */
export function getAstraDispatchWaitMs(gateUntil: number, now: number): number {
  return Math.max(0, gateUntil - now);
}
