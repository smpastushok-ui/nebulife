import { describe, expect, it } from 'vitest';
import {
  createObservatoryState,
  getObservatoryMaxActiveSearches,
  startObservatorySearch,
} from '../../src/game/observatory-search.js';
import type { ObservatoryState } from '../../src/types/observatory.js';

// Standard Patrol ('1h') and Rare Resonance ('6h') must be startable purely
// from in-game eligibility (free slot + program level) — there is no ads
// parameter anywhere in this API, so any client-side rewarded-ad requirement
// is a UI-only concern layered on top and never part of core eligibility.
// These tests pin that contract down so a future ad-gate regression in the
// core layer would be caught here.
describe('startObservatorySearch — standard/rare patrol eligibility (ads-independent)', () => {
  const now = Date.UTC(2026, 6, 15, 12, 0, 0);

  it('starts a Standard Patrol (1h) with only a free slot and level-1 program', () => {
    const state = createObservatoryState();
    const next = startObservatorySearch(state, '1h', 'routine_sky_watch', now, 'seed-a');
    expect(next).not.toBe(state);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0].duration).toBe('1h');
  });

  it('starts a Rare Resonance (6h) with only a free slot and level-1 program', () => {
    const state = createObservatoryState();
    const next = startObservatorySearch(state, '6h', 'routine_sky_watch', now, 'seed-b');
    expect(next).not.toBe(state);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0].duration).toBe('6h');
  });

  it('starts back-to-back standard and rare patrols (across two observatory slots) without any watched-ads state', () => {
    let state = createObservatoryState();
    // Two observatory buildings → two concurrent slots, independent of level.
    state = startObservatorySearch(state, '1h', 'routine_sky_watch', now, 'seed-c', 2);
    state = startObservatorySearch(state, '6h', 'routine_sky_watch', now + 1, 'seed-d', 2);
    expect(state.sessions.map((s) => s.duration)).toEqual(['1h', '6h']);
  });

  it('still enforces the legitimate program-level gate (unrelated to ads)', () => {
    const state = createObservatoryState(); // level 1
    // phenomenon_survey requires observatory level 3.
    const next = startObservatorySearch(state, '6h', 'phenomenon_survey', now, 'seed-e');
    expect(next).toBe(state);
    expect(next.sessions).toHaveLength(0);
  });

  it('still enforces the legitimate free-slot / concurrency cap', () => {
    let state = createObservatoryState();
    const maxSlots = getObservatoryMaxActiveSearches(state, 1);
    expect(maxSlots).toBe(1); // level 1, single observatory building

    state = startObservatorySearch(state, '1h', 'routine_sky_watch', now, 'seed-f');
    expect(state.sessions).toHaveLength(1);

    // A second concurrent launch is rejected — not because of ads, but
    // because the single level-1 slot is already occupied.
    const blocked = startObservatorySearch(state, '6h', 'routine_sky_watch', now + 1, 'seed-g');
    expect(blocked).toBe(state);
    expect(blocked.sessions).toHaveLength(1);
  });

  it('grants extra concurrent slots per additional observatory building (cooldown-independent scaling)', () => {
    let state: ObservatoryState = createObservatoryState();
    state = startObservatorySearch(state, '1h', 'routine_sky_watch', now, 'seed-h', 2);
    const next = startObservatorySearch(state, '6h', 'routine_sky_watch', now + 1, 'seed-i', 2);
    expect(next).not.toBe(state);
    expect(next.sessions).toHaveLength(2);
  });
});
