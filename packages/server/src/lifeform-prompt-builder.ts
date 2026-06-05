// ---------------------------------------------------------------------------
// Lifeform prompt builder (Genesis module)
// ---------------------------------------------------------------------------
// Builds Kling prompts for Alpha-photo (still) and Alpha-video (image2video)
// of a discovered/created alien lifeform. Rarity drives complexity and awe.
// Aligned with the game art direction: dark cosmos (#020510), muted palette,
// scientific microscope / astrobiology aesthetic, no text, no cartoon.
// ---------------------------------------------------------------------------

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
  rare: 'an intricate radial diatom-like organism with crystalline symmetry',
  epic: 'a complex branching micro-fauna with layered membranes and internal organelles',
  legendary: 'an otherworldly, never-before-seen organism of impossible elegant geometry',
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
  const glow = RARITY_GLOW[rarity];
  const form = RARITY_FORM[rarity];
  const detail = RARITY_DETAIL[rarity];
  const env = opts.planetHint
    ? `suspended in dark mineral-rich fluid hinting at ${opts.planetHint}`
    : 'suspended in dark mineral-rich fluid';

  return [
    `Ultra-detailed scientific microscope capture of a newly discovered alien microorganism,`,
    `${form}, with faint ${glow} pulsing through its membrane, delicate internal structures visible,`,
    `${env}.`,
    `Cinematic deep-space dark background (#020510 tone), soft volumetric backlight,`,
    `high microscopic depth of field, subtle chromatic scan artifacts, faint scanner grid overlay at very low opacity.`,
    `Muted desaturated palette with cold accents and hints of dim amber.`,
    `Photorealistic astrobiology lab imagery, electron-microscope aesthetic, ${detail}.`,
    `Mysterious, awe-inspiring, not cartoonish, no faces, no text, no watermark.`,
  ].join(' ');
}

/**
 * Build the Alpha-video (image-to-video) motion prompt for a lifeform.
 */
export function buildLifeformVideoPrompt(opts: LifeformPromptOptions): string {
  const glow = RARITY_GLOW[opts.rarity];
  return [
    `The alien microorganism is alive: it breathes and pulses gently,`,
    `its ${glow} flowing slowly through translucent membranes,`,
    `cilia and filaments drifting in the fluid, slow graceful organic motion,`,
    `subtle particle drift in the medium, gentle camera focus breathing.`,
    `Calm, hypnotic, scientific, cinematic. No text, no people.`,
  ].join(' ');
}
