import { describe, expect, it } from 'vitest';
import { formatCreatureAgeBucket } from '../src/game/creature-evolution.js';

describe('formatCreatureAgeBucket', () => {
  const createdAtMs = Date.UTC(2026, 6, 10, 12, 0, 0);

  it('buckets under 1 hour as just_hatched', () => {
    expect(formatCreatureAgeBucket(createdAtMs, createdAtMs + 30 * 60 * 1000)).toEqual({
      unit: 'just_hatched',
      count: 0,
    });
  });

  it('buckets 1-23 hours as hours', () => {
    expect(formatCreatureAgeBucket(createdAtMs, createdAtMs + 5 * 60 * 60 * 1000)).toEqual({
      unit: 'hours',
      count: 5,
    });
  });

  it('buckets 1-6 days as days', () => {
    expect(formatCreatureAgeBucket(createdAtMs, createdAtMs + 2.5 * 24 * 60 * 60 * 1000)).toEqual({
      unit: 'days',
      count: 2,
    });
  });

  it('buckets 7+ days as weeks', () => {
    expect(formatCreatureAgeBucket(createdAtMs, createdAtMs + 20 * 24 * 60 * 60 * 1000)).toEqual({
      unit: 'weeks',
      count: 2,
    });
  });

  it('never returns a negative age when the clock drifts backwards', () => {
    expect(formatCreatureAgeBucket(createdAtMs, createdAtMs - 60_000)).toEqual({
      unit: 'just_hatched',
      count: 0,
    });
  });
});
