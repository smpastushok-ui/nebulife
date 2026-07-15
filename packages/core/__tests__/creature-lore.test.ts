import { describe, expect, it } from 'vitest';
import {
  CREATURE_LORE_BOUNDS,
  STARTER_CREATURE_LORE,
  buildFallbackCreatureLore,
  isCreatureLore,
  localizedCreatureText,
  parseCreatureLoreCandidate,
} from '../src/game/creature-lore.js';

describe('creature lore schema', () => {
  const fallback = buildFallbackCreatureLore({
    symbols: ['W', 'P'],
    biome: 'rocky',
    seed: 123456,
  });

  it('builds deterministic bilingual values with realistic units', () => {
    expect(buildFallbackCreatureLore({
      symbols: ['W', 'P'],
      biome: 'rocky',
      seed: 123456,
    })).toEqual(fallback);
    expect(fallback.summary.uk).not.toBe(fallback.summary.en);
    expect(fallback.sizeCm).toBeGreaterThanOrEqual(CREATURE_LORE_BOUNDS.sizeCm.min);
    expect(fallback.weightKg).toBeGreaterThanOrEqual(CREATURE_LORE_BOUNDS.weightKg.min);
    expect(isCreatureLore(fallback)).toBe(true);
  });

  it('merges valid AI fields while safely falling back per malformed field', () => {
    const parsed = parseCreatureLoreCandidate({
      summary: { uk: 'Новий опис', en: 'New summary' },
      story: null,
      temperament: { uk: '', en: 'invalid pair' },
      diet: { uk: 'Мінерали', en: 'Minerals' },
      habitatBehavior: { uk: 'Скелі', en: 'Rocks' },
      sizeCm: 999999,
      weightKg: 'heavy',
      lifespanYears: 31,
    }, fallback);

    expect(parsed.summary).toEqual({ uk: 'Новий опис', en: 'New summary' });
    expect(parsed.story).toEqual(fallback.story);
    expect(parsed.temperament).toEqual(fallback.temperament);
    expect(parsed.diet.en).toBe('Minerals');
    expect(parsed.sizeCm).toBe(CREATURE_LORE_BOUNDS.sizeCm.max);
    expect(parsed.weightKg).toBe(fallback.weightKg);
    expect(parsed.lifespanYears).toBe(31);
  });

  it('selects Ukrainian only for Ukrainian locales', () => {
    expect(localizedCreatureText(fallback.story, 'uk-UA')).toBe(fallback.story.uk);
    expect(localizedCreatureText(fallback.story, 'en-US')).toBe(fallback.story.en);
    expect(localizedCreatureText(fallback.story, 'pl')).toBe(fallback.story.en);
  });

  it('keeps the bundled starter profile complete and bilingual', () => {
    expect(isCreatureLore(STARTER_CREATURE_LORE)).toBe(true);
    expect(STARTER_CREATURE_LORE.sizeCm).toBe(92);
    expect(STARTER_CREATURE_LORE.weightKg).toBe(38);
    expect(STARTER_CREATURE_LORE.lifespanYears).toBe(27);
    expect(STARTER_CREATURE_LORE.story.uk).toContain('літоскока');
    expect(STARTER_CREATURE_LORE.story.en).toContain('lithohopper');
  });
});
