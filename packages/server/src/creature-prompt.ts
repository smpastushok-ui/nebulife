// ---------------------------------------------------------------------------
// Biosphere creature prompt helpers (NEXT_GEN_PLAN Section C, phases 1-2)
// ---------------------------------------------------------------------------
// Creatures are synthesized from element experiments: the design brief is
// built deterministically server-side (buildExperimentCreatureDescription in
// @nebulife/core) from the chosen element combination + planet biome + seed
// — no player free text, so no moderation step. The brief feeds first the
// reference portrait image (Gemini/Nano Banana image pipeline) and then the
// Tripo image-to-model task. Kept separate from the existing rarity-driven
// lifeform-prompt-builder.ts (Genesis module discoveries) since biosphere
// creatures are a player-directed, always-visible-macro-creature flow.
// ---------------------------------------------------------------------------

import type { TraitMutation } from '@nebulife/core';

export const CREATURE_GENERATION_COST_QUARKS = 60;
export const MAX_CREATURES_PER_PLANET = 3;

/**
 * Reference portrait prompt for the image-generation step. Full-body,
 * centered, plain neutral background — optimized for the Tripo image-to-model
 * step that follows, not for a "scene" photo. `designBrief` is always
 * server-built (element experiment description, offspring or hybrid text).
 */
export function buildCreatureImagePrompt(designBrief: string): string {
  return [
    'A single original alien creature for a cozy space-exploration game, full body visible, centered, standing in a naturalistic idle pose.',
    'Plain simple neutral studio background (soft gradient, no scenery, no horizon, no props), even soft lighting, no harsh shadows.',
    'Photorealistic or painterly biological texture, believable anatomy, muted deep-space-adjacent color palette with one or two accent colors.',
    'Single complete organism only, no humans, no text, no logo, no watermark, no UI, no multiple creatures, no cropping.',
    `Design brief: ${designBrief}`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Offspring descriptions ("Нове покоління" — evolution, migration 041)
// ---------------------------------------------------------------------------
// English descriptive phrase per trait id, used only to compose the image
// prompt fed to Gemini — separate from the i18n label shown to the player
// (biosphere.trait.<category>.<id> in locales/*.json).

const TRAIT_PROMPT_PHRASES: Record<string, string> = {
  // size
  dwarf: 'notably smaller, dwarf-sized body',
  gigantic: 'notably larger, imposing body size',
  elongated: 'an elongated, stretched body shape',
  compact: 'a more compact, stocky body shape',
  // coloring
  iridescent: 'iridescent, shifting surface hues',
  melanistic: 'darker, melanistic pigmentation',
  translucent: 'pale, semi-translucent skin',
  banded: 'vivid banding color patterns',
  // appendages
  extra_limbs: 'an additional pair of limbs',
  finned: 'new fin-like appendages',
  long_tail: 'a longer, more prominent tail',
  clawed: 'sharper, clawed digits',
  // bioluminescence
  glowing_spots: 'glowing bioluminescent spots',
  pulsing_veins: 'faintly pulsing bioluminescent veins',
  luminous_eyes: 'softly luminous eyes',
  faint_aura: 'a faint bioluminescent aura',
  // texture
  crystalline_scales: 'crystalline scale texture',
  feathered_ridges: 'feathered ridges along the body',
  chitin_plating: 'hardened chitin plating',
  smooth_hide: 'smoother, uniform hide texture',
};

/**
 * Builds the offspring's description text: the parent's original brief plus
 * a short clause per mutated trait. Feeds both buildCreatureImagePrompt (the
 * reference portrait) and the creature_models.description column shown in
 * the lineage panel.
 */
export function buildOffspringDescription(parentDescription: string, mutations: TraitMutation[]): string {
  const phrases = mutations.map((m) => TRAIT_PROMPT_PHRASES[m.trait] ?? m.trait.replace(/_/g, ' '));
  if (phrases.length === 0) return parentDescription;
  return `${parentDescription} A new generation, inherited but changed: ${phrases.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// Hybridization ("дослід схрещування" — migration 042)
// ---------------------------------------------------------------------------

const HYBRID_DESCRIPTION_MAX_LENGTH = 600;

/**
 * Stored description for a hybrid creature: both parents' briefs fused plus
 * the deterministic trait-mix phrases. Shown in the lineage panel and reused
 * as the text half of the fusion image prompt.
 */
export function buildHybridDescription(
  parentADescription: string,
  parentBDescription: string,
  traits: TraitMutation[],
): string {
  const phrases = traits.map((m) => TRAIT_PROMPT_PHRASES[m.trait] ?? m.trait.replace(/_/g, ' '));
  const traitClause = phrases.length > 0 ? ` Expressed hybrid traits: ${phrases.join(', ')}.` : '';
  const base = `A laboratory hybrid of two organisms. First parent: ${parentADescription} Second parent: ${parentBDescription}`;
  return `${base}${traitClause}`.slice(0, HYBRID_DESCRIPTION_MAX_LENGTH);
}

/**
 * Text half of the multi-image fusion request. The two parent portraits are
 * attached as inlineData image parts (see generateImageWithGeminiFromImages);
 * this prompt tells the model to fuse them. Same framing constraints as
 * buildCreatureImagePrompt so the result stays Tripo-friendly for the
 * optional image-to-model upgrade.
 */
export function buildHybridImagePrompt(traits: TraitMutation[]): string {
  const phrases = traits.map((m) => TRAIT_PROMPT_PHRASES[m.trait] ?? m.trait.replace(/_/g, ' '));
  const traitClause = phrases.length > 0
    ? ` The hybrid must clearly express: ${phrases.join(', ')}.`
    : '';
  return [
    'Using the two attached creature portraits as the parents, design ONE single new hybrid offspring creature that visibly blends the anatomy, coloring and surface texture of BOTH parents into a coherent believable organism.',
    'Do not show the parents in the result — only the single hybrid offspring.',
    `${traitClause}`,
    'Full body visible, centered, standing in a naturalistic idle pose.',
    'Plain simple neutral studio background (soft gradient, no scenery, no horizon, no props), even soft lighting, no harsh shadows.',
    'Photorealistic or painterly biological texture, believable anatomy, muted deep-space-adjacent color palette with one or two accent colors.',
    'Single complete organism only, no humans, no text, no logo, no watermark, no UI, no multiple creatures, no cropping.',
  ].filter((s) => s.length > 0).join(' ');
}

