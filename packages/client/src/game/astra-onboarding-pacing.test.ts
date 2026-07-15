import { describe, expect, it } from 'vitest';
import { extendAstraGate, getAstraDispatchWaitMs, POST_OVERLAY_ASTRA_PAUSE_MS } from './astra-onboarding-pacing.js';

describe('astra-onboarding-pacing', () => {
  it('extendAstraGate pushes the gate forward by the pause when the current gate is already in the past', () => {
    const now = 10_000;
    const currentGateUntil = now - 5_000; // stale/expired gate
    const next = extendAstraGate(currentGateUntil, now, POST_OVERLAY_ASTRA_PAUSE_MS);
    expect(next).toBe(now + POST_OVERLAY_ASTRA_PAUSE_MS);
  });

  it('regression: never PULLS the gate closer — a longer existing gate (e.g. the 60s inter-onboarding gap) always wins', () => {
    const now = 10_000;
    const currentGateUntil = now + 60_000; // e.g. ASTRA_ONBOARDING_MIN_GAP_MS already pending
    const next = extendAstraGate(currentGateUntil, now, POST_OVERLAY_ASTRA_PAUSE_MS);
    expect(next).toBe(currentGateUntil);
  });

  it('getAstraDispatchWaitMs reports the remaining wait, clamped to zero once the gate has passed', () => {
    expect(getAstraDispatchWaitMs(10_900, 10_000)).toBe(900);
    expect(getAstraDispatchWaitMs(10_000, 10_000)).toBe(0);
    expect(getAstraDispatchWaitMs(9_000, 10_000)).toBe(0);
  });

  it('regression: ASTRA must still wait a beat immediately after the precursor overlay closes, not fire in the same instant', () => {
    const closedAt = 5_000;
    const gateUntil = extendAstraGate(0, closedAt, POST_OVERLAY_ASTRA_PAUSE_MS);
    expect(getAstraDispatchWaitMs(gateUntil, closedAt)).toBeGreaterThan(0);
    expect(getAstraDispatchWaitMs(gateUntil, closedAt + POST_OVERLAY_ASTRA_PAUSE_MS)).toBe(0);
  });
});
