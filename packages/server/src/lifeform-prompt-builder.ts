// ---------------------------------------------------------------------------
// Lifeform prompt builder (Genesis module)
// ---------------------------------------------------------------------------
// Builds Kling prompts for Alpha-photo (still) and Alpha-video (image2video)
// of a discovered/created alien lifeform. Rarity drives both complexity AND
// scale: common/uncommon are microbes, rare+ are visible macro creatures,
// fauna and megafauna. Aligned with the game art direction: dark cosmos
// (#020510), muted palette, no text, no cartoon.
//
// NOTE: the primary paid path goes through `generateLifeformBrief` (Gemini) +
// the scale-aware wraps in `lifeform-prompt-library.ts`. The builders here are
// the deterministic fallback used for legacy rows / image-less video steps.
// ---------------------------------------------------------------------------

import { buildPhotoPromptFromAppearance, buildVideoPromptFromAction, scaleForRarity } from './lifeform-prompt-library.js';

export type LifeformRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface LifeformPromptOptions {
  rarity: LifeformRarity;
  /** Optional seed-derived descriptor so each lifeform looks unique. */
  speciesName?: string;
  /** Optional planet hints (temperature/biome) for environmental coherence. */
  planetHint?: string;
}

// Glow palette varies by rarity so frames + imagery feel consistent.
const RARITY_GLOW: Record<LifeformRarity, string> = {
  common: 'soft pale-green bioluminescence',
  uncommon: 'cyan-teal bioluminescence',
  rare: 'violet and magenta bioluminescence',
  epic: 'amber and gold bioluminescence',
  legendary: 'iridescent crimson-and-aurora bioluminescence',
};

const RARITY_FORM: Record<LifeformRarity, string> = {
  common: 'a simple translucent single-cell organism with gentle cilia',
  uncommon: 'a translucent multi-lobed micro-colony with delicate filaments',
  rare: 'a small multicellular alien organism a few centimeters across, like an exotic invertebrate or coral polyp',
  epic: 'a fully visible life-size alien creature with believable exotic anatomy in its habitat',
  legendary: 'a large, awe-inspiring exotic alien organism — towering megafauna or monumental alien flora, never-before-seen',
};

// Generic fallback motion per scale (used only when no Gemini brief is stored).
const RARITY_ACTION: Record<LifeformRarity, string> = {
  common: 'it breathes and pulses gently, cilia and filaments drifting',
  uncommon: 'it breathes and pulses gently, fine filaments rippling around it',
  rare: 'it slowly flexes and feeds, soft tentacles or fronds swaying',
  epic: 'it moves with slow lifelike intent, breathing and shifting its weight in its habitat',
  legendary: 'it moves with slow majestic power, breathing deeply as the environment stirs around it',
};

const RARITY_DETAIL: Record<LifeformRarity, string> = {
  common: 'clean, calm, understated',
  uncommon: 'fine detail, subtle motion-blur of cilia',
  rare: 'high microscopic detail, sharp structural patterns',
  epic: 'ultra-detailed, rich textures, dramatic depth of field',
  legendary: 'hyper-detailed masterpiece, museum-grade scientific imagery',
};

/**
 * Build the Alpha-photo prompt for a lifeform.
 */
export function buildLifeformPhotoPrompt(opts: LifeformPromptOptions): string {
  const rarity = opts.rarity;
  const scale = scaleForRarity(rarity);
  const glow = RARITY_GLOW[rarity];
  const form = RARITY_FORM[rarity];
  const detail = RARITY_DETAIL[rarity];
  const appearance = `${form}, with faint ${glow} pulsing through it, delicate structures visible, ${detail}`;
  const env = opts.planetHint ? `hinting at ${opts.planetHint}` : undefined;
  return buildPhotoPromptFromAppearance(appearance, env, scale);
}

/**
 * Build the Alpha-video (image-to-video) motion prompt for a lifeform.
 * Scale-aware: microbes drift in fluid, creatures/megafauna move in a habitat.
 */
export function buildLifeformVideoPrompt(opts: LifeformPromptOptions): string {
  const glow = RARITY_GLOW[opts.rarity];
  const scale = scaleForRarity(opts.rarity);
  const action = `${RARITY_ACTION[opts.rarity]}, its ${glow} flowing slowly through it`;
  return buildVideoPromptFromAction(action, scale);
}
