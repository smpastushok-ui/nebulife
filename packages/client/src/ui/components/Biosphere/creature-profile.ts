import {
  STARTER_CREATURE_LORE,
  isCreatureLore,
  localizedCreatureText,
  type CreatureLore,
  type LocalizedText,
} from '@nebulife/core';
import type { BiosphereCreature } from '../../../api/creature-api.js';

export function usesBundledCreatureDefault(creature: BiosphereCreature): boolean {
  return !creature.glb_url && !(creature.hybrid_photo_url ?? creature.image_url);
}

/**
 * Personal persisted lore always wins. The canonical starter profile is only
 * used when the UI is actually displaying the bundled/default GLB; it never
 * substitutes for a personal creature that has its own portrait or model.
 */
export function getCreatureProfile(creature: BiosphereCreature): CreatureLore | null {
  if (isCreatureLore(creature.lore)) return creature.lore;
  return usesBundledCreatureDefault(creature) ? STARTER_CREATURE_LORE : null;
}

export function localizeCreatureField(field: LocalizedText, language: string): string {
  return localizedCreatureText(field, language);
}

export function getCreatureSummary(creature: BiosphereCreature, language: string): string | null {
  const profile = getCreatureProfile(creature);
  return profile ? localizeCreatureField(profile.summary, language) : null;
}
