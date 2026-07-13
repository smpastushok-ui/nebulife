import { describe, expect, it } from 'vitest';
import { applyDailyCare } from '../src/game/creature-evolution.js';

describe('creature daily care', () => {
  it('persists whole-number vitality after fractional real-time decay', () => {
    const createdAtMs = Date.UTC(2026, 6, 10, 12);
    const result = applyDailyCare({
      vitality: 76,
      careDays: 0,
      stage: 'juvenile',
      lastCareAtMs: null,
      createdAtMs,
    }, createdAtMs + 30 * 60 * 1000);

    expect(result).not.toBeNull();
    expect(Number.isInteger(result?.vitality)).toBe(true);
    expect(result?.vitality).toBe(100);
  });

  it('keeps the once-per-UTC-day guard', () => {
    const lastCareAtMs = Date.UTC(2026, 6, 13, 1);
    const result = applyDailyCare({
      vitality: 80,
      careDays: 1,
      stage: 'juvenile',
      lastCareAtMs,
      createdAtMs: lastCareAtMs - 24 * 60 * 60 * 1000,
    }, Date.UTC(2026, 6, 13, 23));

    expect(result).toBeNull();
  });
});
