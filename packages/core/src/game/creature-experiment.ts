// ---------------------------------------------------------------------------
// Biosphere creature experiments — element-driven synthesis
// ---------------------------------------------------------------------------
// Creatures are no longer described by the player in free text: in the
// research lab the player combines 2-4 chemical elements (the same "unique
// particle" chemistry the lab's extraction experiment already deals in) and
// runs an experiment. The chosen combination deterministically shapes the
// organism, and the server builds the image prompt from it — no user text,
// no moderation step.
//
// Slot semantics (order matters):
//   slot 1  -> dominant body plan          (CreatureElementDef.primary)
//   slot 2  -> surface / texture influence (CreatureElementDef.secondary)
//   slot 3+ -> color / detail accents      (CreatureElementDef.accent)
// The planet's biome optionally adds a habitat-adaptation clause.
//
// Determinism: silhouette and size are picked with SeededRNG from the
// experiment seed, so the same (elements, biome, seed) always describes the
// same organism — only the AI image render itself is non-deterministic.
// ---------------------------------------------------------------------------

import { SeededRNG } from '../math/rng.js';

export const CREATURE_EXPERIMENT_MIN_ELEMENTS = 2;
export const CREATURE_EXPERIMENT_MAX_ELEMENTS = 4;

// ── Biomes (mirror of the client's BiosphereBiome palette selection) ────────

export const CREATURE_BIOMES = [
  'ocean', 'ice', 'desert', 'lava', 'vegetation', 'gasGiant', 'rocky',
] as const;
export type CreatureBiome = typeof CREATURE_BIOMES[number];

export function isCreatureBiome(value: unknown): value is CreatureBiome {
  return typeof value === 'string' && (CREATURE_BIOMES as readonly string[]).includes(value);
}

const BIOME_PHRASES: Record<CreatureBiome, string> = {
  ocean: 'adapted to a deep aquatic ocean world: streamlined body, fin- or membrane-like appendages, wet glistening surface',
  ice: 'adapted to a frozen glacial world: insulated stocky build, frost-touched pale palette',
  desert: 'adapted to an arid dune desert world: heat-shielding hide, dusty ochre palette, slit-protected eyes',
  lava: 'adapted to a volcanic molten world: heat-resistant charred hide with ember-lit seams',
  vegetation: 'adapted to a lush overgrown world: mottled camouflage patterns blending with alien flora',
  gasGiant: 'adapted to drifting in the high atmosphere of a gas giant: buoyant form with sail-like membranes',
  rocky: 'adapted to a barren rocky world: dust-grey camouflage and sturdy climbing limbs',
};

// ── Element effect table ────────────────────────────────────────────────────
// 10 elements, all present in the game's chemistry table (ELEMENTS) and drawn
// from the research lab's "unique particle" fiction. Each entry documents the
// element's influence on the organism at each slot position.

export interface CreatureElementDef {
  /** ELEMENTS symbol — also the whitelist key for the API. */
  symbol: string;
  /** Dominant body plan, used when the element is the FIRST pick. */
  primary: string;
  /** Surface/texture influence, used when the element is the SECOND pick. */
  secondary: string;
  /** Short color/detail accent, used for the third and fourth picks. */
  accent: string;
}

export const CREATURE_ELEMENTS: readonly CreatureElementDef[] = [
  {
    symbol: 'C', // carbon -> organic, chitinous
    primary: 'an organic chitin-bodied organism with a segmented exoskeleton',
    secondary: 'hardened chitin plating across its back',
    accent: 'matte charcoal-dark chitin details',
  },
  {
    symbol: 'Si', // silicon -> crystalline
    primary: 'a crystalline silicon-based organism, body grown from faceted mineral crystal',
    secondary: 'clusters of quartz-like crystalline growths along its spine',
    accent: 'small glinting crystal nodules',
  },
  {
    symbol: 'Fe', // iron -> armored, metallic
    primary: 'a heavily armored organism clad in overlapping iron plates with a dull metallic sheen',
    secondary: 'riveted iron-like armor plating',
    accent: 'rust-toned metallic streaks',
  },
  {
    symbol: 'Cu', // copper -> verdigris patina
    primary: 'an organism with a burnished copper carapace weathered into teal-green patina',
    secondary: 'copper shell segments streaked with verdigris',
    accent: 'teal patina markings',
  },
  {
    symbol: 'S', // sulfur -> vivid warning coloration
    primary: 'a boldly patterned organism in vivid sulfur-yellow and black aposematic coloring',
    secondary: 'bright yellow-black warning banding',
    accent: 'sulfur-yellow warning spots',
  },
  {
    symbol: 'P', // phosphorus -> bioluminescence
    primary: 'a bioluminescent organism laced with softly glowing phosphorescent veins',
    secondary: 'phosphorescent glowing spots along its flanks',
    accent: 'a faint phosphor glow at the extremities',
  },
  {
    symbol: 'Se', // selenium -> photoreceptive (photocell chemistry)
    primary: 'a photoreceptive organism studded with multiple mirror-like reflective eyes',
    secondary: 'rows of reflective photosensitive ocelli',
    accent: 'glassy reflective eye-spots',
  },
  {
    symbol: 'Li', // lithium -> lightweight, energetic
    primary: 'a lightweight slender organism built for quick darting movement',
    secondary: 'a lean springy frame with long agile limbs',
    accent: 'delicate lightweight proportions',
  },
  {
    symbol: 'W', // tungsten -> dense heavyweight
    primary: 'a massive dense heavyweight organism with a tungsten-hard hide',
    secondary: 'dense slab-like plating that reads as enormous mass',
    accent: 'dark dense bosses along the limbs',
  },
  {
    symbol: 'Xe', // xenon -> buoyant noble-gas glow (xenon lamp)
    primary: 'a buoyant drifting organism held aloft by translucent gas bladders with a faint cold inner glow',
    secondary: 'translucent gas bladders glowing faintly from within',
    accent: 'a cold lamp-like inner shimmer',
  },
];

export const CREATURE_ELEMENT_SYMBOLS: readonly string[] = CREATURE_ELEMENTS.map((e) => e.symbol);

const ELEMENT_BY_SYMBOL = new Map(CREATURE_ELEMENTS.map((e) => [e.symbol, e]));

/**
 * Whitelist validation for an experiment combination: an array of 2-4
 * distinct symbols from CREATURE_ELEMENTS, order preserved (order carries
 * meaning — see slot semantics above).
 */
export function validateCreatureElementCombo(value: unknown): { ok: true; symbols: string[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: 'elements must be an array of element symbols' };
  }
  const symbols = value.map((s) => String(s));
  if (symbols.length < CREATURE_EXPERIMENT_MIN_ELEMENTS || symbols.length > CREATURE_EXPERIMENT_MAX_ELEMENTS) {
    return { ok: false, error: `Pick between ${CREATURE_EXPERIMENT_MIN_ELEMENTS} and ${CREATURE_EXPERIMENT_MAX_ELEMENTS} elements` };
  }
  if (new Set(symbols).size !== symbols.length) {
    return { ok: false, error: 'Each element can be used only once' };
  }
  for (const s of symbols) {
    if (!ELEMENT_BY_SYMBOL.has(s)) {
      return { ok: false, error: `Unknown element: ${s}` };
    }
  }
  return { ok: true, symbols };
}

// ── Deterministic organism description ──────────────────────────────────────

const SILHOUETTES = [
  'quadruped',
  'six-legged hexapod',
  'serpentine long-bodied',
  'crustacean-like many-limbed',
  'squat bipedal',
  'radially symmetric',
] as const;

const SIZE_CLASSES = ['small', 'medium-sized', 'large'] as const;
export type CreatureSizeClass = typeof SIZE_CLASSES[number];
export type CreatureSilhouette = typeof SILHOUETTES[number];

/**
 * Deterministically picks the organism's body-plan size class and silhouette
 * from the experiment seed. Extracted from buildExperimentCreatureDescription
 * so creature-lore.ts (structured bio/params, generated alongside the image
 * prompt — never shown to the player as raw prompt text) can derive numeric
 * size/weight from the SAME size class the image-prompt description uses,
 * keeping the two representations of "how big is this creature" coherent.
 */
export function pickExperimentBodyPlan(seed: number): { size: CreatureSizeClass; silhouette: CreatureSilhouette } {
  const rng = new SeededRNG(seed >>> 0);
  const size = rng.pick(SIZE_CLASSES);
  const silhouette = rng.pick(SILHOUETTES);
  return { size, silhouette };
}

/**
 * Builds the stored creature description (and the "design brief" half of the
 * image prompt) purely from the experiment inputs. No player text is ever
 * included. The description feeds the existing offspring/hybrid flows
 * unchanged, since those compose on top of the stored description.
 */
export function buildExperimentCreatureDescription(
  symbols: string[],
  biome: CreatureBiome | null,
  seed: number,
): string {
  const { size, silhouette } = pickExperimentBodyPlan(seed);

  const defs = symbols
    .map((s) => ELEMENT_BY_SYMBOL.get(s))
    .filter((d): d is CreatureElementDef => Boolean(d));

  const clauses: string[] = [];
  defs.forEach((def, index) => {
    if (index === 0) clauses.push(def.primary);
    else if (index === 1) clauses.push(def.secondary);
    else clauses.push(def.accent);
  });

  const base = `A ${size} ${silhouette} alien creature: ${clauses.join('; ')}.`;
  const habitat = biome ? ` It is ${BIOME_PHRASES[biome]}.` : '';
  return `${base}${habitat}`;
}

/** Trait entries stored in creature_models.traits for an experiment creature,
 *  so the lineage panel and future hybrid logic can reference the recipe.
 *  Uses the 'element' category, disjoint from the mutation TraitCategory set
 *  (pickHybridTraits ignores unknown categories by design). */
export function buildExperimentTraits(symbols: string[]): Array<{ category: 'element'; trait: string }> {
  return symbols.map((symbol) => ({ category: 'element' as const, trait: symbol }));
}
