import { describe, expect, it } from 'vitest';
import { STARTER_CREATURE_LORE } from '@nebulife/core';
import type { BiosphereCreature } from '../../../api/creature-api.js';
import { getCreatureProfile, getCreatureSummary, usesBundledCreatureDefault } from './creature-profile.js';

const legacyCreature = (overrides: Partial<BiosphereCreature> = {}): BiosphereCreature => ({
  id: 'legacy',
  player_id: 'player',
  planet_id: 'planet',
  name: null,
  description: 'INTERNAL VISUAL PROMPT',
  prompt_used: 'INTERNAL FULL GENERATION PROMPT',
  image_url: 'https://example.test/personal.png',
  glb_url: null,
  tripo_task_id: null,
  status: 'photo_ready',
  quarks_paid: 60,
  created_at: '2026-07-01T00:00:00.000Z',
  completed_at: null,
  vitality: 100,
  stage: 'juvenile',
  care_days: 0,
  last_care_at: null,
  generation: 1,
  parent_id: null,
  traits: null,
  parent_b_id: null,
  is_hybrid: false,
  hybrid_photo_url: null,
  lore: null,
  ...overrides,
});

describe('creature profile legacy/default behavior', () => {
  it('never substitutes the starter profile for a personal legacy portrait', () => {
    const creature = legacyCreature();
    expect(usesBundledCreatureDefault(creature)).toBe(false);
    expect(getCreatureProfile(creature)).toBeNull();
    expect(getCreatureSummary(creature, 'en')).toBeNull();
  });

  it('uses the canonical profile only with the bundled/default model', () => {
    const creature = legacyCreature({ image_url: null, glb_url: null });
    expect(usesBundledCreatureDefault(creature)).toBe(true);
    expect(getCreatureProfile(creature)).toEqual(STARTER_CREATURE_LORE);
    expect(getCreatureSummary(creature, 'uk')).toBe(STARTER_CREATURE_LORE.summary.uk);
  });

  it('always prefers valid personal lore over the bundled profile', () => {
    const creature = legacyCreature({
      image_url: null,
      lore: { ...STARTER_CREATURE_LORE, summary: { uk: 'Особиста історія', en: 'Personal history' } },
    });
    expect(getCreatureSummary(creature, 'en')).toBe('Personal history');
  });
});
