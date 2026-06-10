import { SeededRNG } from '../math/rng.js';
import type { DiscoveryRarity } from './discovery.js';
import type { Planet } from '../types/planet.js';

// ---------------------------------------------------------------------------
// Lifeform Genesis module — shared constants & helpers (client + server)
// ---------------------------------------------------------------------------

export type LifeformSource = 'found' | 'created';
export type LifeformMediaStatus = 'generating' | 'succeed' | 'failed';

/**
 * Alpha-photo cost in quarks per rarity (Kling v3 omni, up to 4K).
 * `common` lifeforms ship in the bundle and are free (cost 0).
 */
export const LIFEFORM_PHOTO_COST: Record<DiscoveryRarity, number> = {
  common: 0,
  uncommon: 30,
  rare: 45,
  epic: 60,
  legendary: 80,
};

/**
 * Rewarded ads required to fund one Alpha-photo (Tier-1 ad regions only —
 * the choice "quarks OR ads" is offered where rewarded ads are available).
 * Alpha-video has NO ad path: quarks only.
 */
export const LIFEFORM_PHOTO_ADS = 5;

/**
 * Alpha-video cost in quarks (image-to-video from the Alpha-photo).
 * Kling V3 Pro, 1080p, 5s, with ambient audio costs us ~$0.84 PER VIDEO
 * regardless of rarity, so the price is FLAT — at 89⚛ this clears ~44% margin
 * via store IAP and ~61% via web top-up. `common` is free (bundled clip).
 */
const LIFEFORM_VIDEO_PRICE = 89;
export const LIFEFORM_VIDEO_COST: Record<DiscoveryRarity, number> = {
  common: 0,
  uncommon: LIFEFORM_VIDEO_PRICE,
  rare: LIFEFORM_VIDEO_PRICE,
  epic: LIFEFORM_VIDEO_PRICE,
  legendary: LIFEFORM_VIDEO_PRICE,
};

/**
 * Rarity weights for a life *find* (on harvest or building placement).
 * Release tuning — "the more unique, the lower the chance":
 *   common 72  ▸ uncommon 16 ▸ rare 7 ▸ epic 3 ▸ legendary 2   (sum 100)
 * Strictly decreasing for the paid tiers, and common-heavy so the 28 free
 * bundled forms surface often enough to complete the set in ~1 month, while
 * paid uniques stay rare and special.
 */
export const LIFEFORM_FIND_WEIGHTS: Record<DiscoveryRarity, number> = {
  common: 72,
  uncommon: 16,
  rare: 7,
  epic: 3,
  legendary: 2,
};

/**
 * Per-harvest chance that digging a resource deposit surfaces native life.
 * Release tuning for "all 28 simple forms in ~1 month of active play":
 *   ~22 harvests/day × 0.05 × 72% common ≈ ~0.8 common finds/day → ~28 days
 *   for the full set (unseen-first selection guarantees no wasted finds until
 *   complete; building placements below add a little on top).
 */
export const LIFEFORM_HARVEST_FIND_CHANCE = 0.05;

/**
 * Buildings that can surface a lifeform when placed, with per-build chance.
 * `greenhouse` is the guaranteed "first contact" (handled separately, common).
 */
export const LIFEFORM_TRIGGER_BUILDINGS: Record<string, number> = {
  residential_dome: 0.06,
  biome_dome: 0.10,
  research_lab: 0.08,
  observatory: 0.07,
};

/** True if a building type can ever surface a (non-first-contact) lifeform. */
export function isLifeformTriggerBuilding(buildingType: string): boolean {
  return Object.prototype.hasOwnProperty.call(LIFEFORM_TRIGGER_BUILDINGS, buildingType);
}

export interface LifeformFindRoll {
  found: boolean;
  rarity: DiscoveryRarity;
}

/**
 * Seeded roll for finding a lifeform when a building is placed.
 * Deterministic: same (seed, buildingType, buildCount) → same result.
 *
 * @param seed          A stable seed (e.g. planet.seed).
 * @param buildingType  The placed building type.
 * @param buildCount    A monotonically-increasing counter to vary rolls.
 */
export function rollLifeformFind(
  seed: number,
  buildingType: string,
  buildCount: number,
): LifeformFindRoll {
  const chance = LIFEFORM_TRIGGER_BUILDINGS[buildingType] ?? 0;
  if (chance <= 0) return { found: false, rarity: 'common' };

  // Mix inputs into a single integer seed.
  const mixed = (Math.floor(seed) ^ hashString(buildingType) ^ (buildCount * 2654435761)) >>> 0;
  const rng = new SeededRNG(mixed);

  if (rng.next() > chance) return { found: false, rarity: 'common' };

  return { found: true, rarity: rollLifeformRarity(rng) };
}

/** Roll a rarity tier from LIFEFORM_FIND_WEIGHTS using the given RNG. */
function rollLifeformRarity(rng: SeededRNG): DiscoveryRarity {
  const total = Object.values(LIFEFORM_FIND_WEIGHTS).reduce((a, b) => a + b, 0);
  const roll = rng.next() * total;
  let cumulative = 0;
  for (const [r, w] of Object.entries(LIFEFORM_FIND_WEIGHTS) as [DiscoveryRarity, number][]) {
    cumulative += w;
    if (roll < cumulative) return r;
  }
  return 'common';
}

/**
 * Seeded roll for finding a lifeform on a resource harvest ("digging finds
 * something"). Flat per-harvest chance (LIFEFORM_HARVEST_FIND_CHANCE) then the
 * shared rarity weights. Deterministic: same (seed, harvestCount) → same roll.
 */
export function rollLifeformHarvestFind(
  seed: number,
  harvestCount: number,
): LifeformFindRoll {
  const mixed = (Math.floor(seed) ^ 0x9e3779b9 ^ (harvestCount * 2654435761)) >>> 0;
  const rng = new SeededRNG(mixed);
  if (rng.next() > LIFEFORM_HARVEST_FIND_CHANCE) return { found: false, rarity: 'common' };
  return { found: true, rarity: rollLifeformRarity(rng) };
}

// ---------------------------------------------------------------------------
// Phase 2 — Genesis Lab ingredients (organic byproducts of surface harvesting)
// ---------------------------------------------------------------------------

export type LifeformIngredientId =
  | 'amino_precipitate'
  | 'lipid_vesicles'
  | 'nucleotide_matrix'
  | 'chiral_catalyst';

export const LIFEFORM_INGREDIENT_IDS: LifeformIngredientId[] = [
  'amino_precipitate',
  'lipid_vesicles',
  'nucleotide_matrix',
  'chiral_catalyst',
];

/** True if an ingredient is the rare catalyst (gates higher-rarity creation). */
export function isRareIngredient(id: LifeformIngredientId): boolean {
  return id === 'chiral_catalyst';
}

/**
 * Deposit type → ingredient mapping.
 *   tree  → amino_precipitate  (proteins)
 *   vent  → lipid_vesicles     (membranes)
 *   water → nucleotide_matrix  (RNA/DNA)
 *   ore   → chiral_catalyst    (rare catalyst)
 */
export const INGREDIENT_BY_DEPOSIT: Record<'tree' | 'ore' | 'vent' | 'water', LifeformIngredientId> = {
  tree: 'amino_precipitate',
  vent: 'lipid_vesicles',
  water: 'nucleotide_matrix',
  ore: 'chiral_catalyst',
};

/** Genesis ingredients unlock at this level (Ковчег Генезису). */
export const GENESIS_INGREDIENT_MIN_LEVEL = 48;

export interface LifeformCreateRecipe {
  ingredients: Partial<Record<LifeformIngredientId, number>>;
  quarks: number;
}

/**
 * Genesis Lab recipes per target rarity.
 * common = free (ingredients only); rarer = more ingredients + quarks.
 * Epic/legendary additionally require the rare chiral catalyst.
 */
export const LIFEFORM_CREATE_RECIPE: Record<DiscoveryRarity, LifeformCreateRecipe> = {
  common: {
    ingredients: { amino_precipitate: 1, lipid_vesicles: 1 },
    quarks: 0,
  },
  uncommon: {
    ingredients: { amino_precipitate: 2, lipid_vesicles: 1, nucleotide_matrix: 1 },
    quarks: 40,
  },
  rare: {
    ingredients: { amino_precipitate: 2, lipid_vesicles: 2, nucleotide_matrix: 2 },
    quarks: 70,
  },
  epic: {
    ingredients: { amino_precipitate: 3, lipid_vesicles: 2, nucleotide_matrix: 2, chiral_catalyst: 1 },
    quarks: 110,
  },
  legendary: {
    ingredients: { amino_precipitate: 3, lipid_vesicles: 3, nucleotide_matrix: 3, chiral_catalyst: 2 },
    quarks: 160,
  },
};

/** True if the player has enough ingredients for the given rarity recipe. */
export function canCreateLifeform(
  inventory: Record<string, number>,
  rarity: DiscoveryRarity,
): boolean {
  const recipe = LIFEFORM_CREATE_RECIPE[rarity];
  for (const [ing, need] of Object.entries(recipe.ingredients)) {
    if ((inventory[ing] ?? 0) < (need ?? 0)) return false;
  }
  return true;
}

/**
 * Seeded roll for a rare organic ingredient drop on a surface harvest.
 * Active only from L48. The rare catalyst (from ore) drops far less often.
 * Deterministic: same (seed, depositType, harvestCount) → same result.
 *
 * @returns the dropped ingredient id, or null for a normal harvest.
 */
export function rollIngredientDrop(
  seed: number,
  depositType: 'tree' | 'ore' | 'vent' | 'water',
  harvestCount: number,
  playerLevel: number,
): LifeformIngredientId | null {
  if (playerLevel < GENESIS_INGREDIENT_MIN_LEVEL) return null;

  const ingredient = INGREDIENT_BY_DEPOSIT[depositType];
  // Catalyst is rare (~2%), base organics ~7%.
  const chance = ingredient === 'chiral_catalyst' ? 0.02 : 0.07;

  const mixed = (Math.floor(seed) ^ hashString(depositType) ^ (harvestCount * 2654435761)) >>> 0;
  const rng = new SeededRNG(mixed);
  if (rng.next() > chance) return null;
  return ingredient;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Simple (common, free) lifeform catalogue — 28 bundled organisms.
// Each common find reveals ONE of these, with a unique bundled photo + video
// shipped in the app (public/lifeforms/common/<key>.{webp,webm}). Discovery
// hands out the next NOT-yet-collected species so a player unlocks the whole
// set in ~1 month of active play; once all 28 are owned, re-finds are
// duplicates and are NOT saved to the gallery (see App.tsx discovery flow).
// ---------------------------------------------------------------------------

export interface SimpleLifeform {
  /** Stable slug — also the bundled asset basename. */
  key: string;
  /** Ukrainian display name. */
  nameUk: string;
  /** English display name. */
  nameEn: string;
}

export const SIMPLE_LIFEFORM_ASSET_BASE = '/lifeforms/common';

export const SIMPLE_LIFEFORMS: SimpleLifeform[] = [
  { key: 'shifting-amoeba', nameUk: 'Мінлива амеба', nameEn: 'Shifting Amoeba' },
  { key: 'micro-jelly', nameUk: 'Мікромедуза', nameEn: 'Micro-Jelly' },
  { key: 'spiral-filament', nameUk: 'Спіральна нитка', nameEn: 'Spiral Filament' },
  { key: 'micro-bear', nameUk: 'Мікроведмідь', nameEn: 'Micro-Bear' },
  { key: 'polyp-microcolony', nameUk: 'Поліпова мікроколонія', nameEn: 'Polyp Microcolony' },
  { key: 'glow-plankton', nameUk: 'Сяйний планктон', nameEn: 'Glow Plankton' },
  { key: 'slipper-ciliate', nameUk: 'Інфузорія-туфелька', nameEn: 'Slipper Ciliate' },
  { key: 'crown-rotifer', nameUk: 'Коловертка', nameEn: 'Crown Rotifer' },
  { key: 'magnetotactic-chain', nameUk: 'Магнітотактичний ланцюг', nameEn: 'Magnetotactic Chain' },
  { key: 'living-mirror', nameUk: 'Живе дзеркало', nameEn: 'Living Mirror' },
  { key: 'cryo-fern', nameUk: 'Кріопапороть', nameEn: 'Cryo-Fern' },
  { key: 'plasma-sail', nameUk: 'Плазмове вітрило', nameEn: 'Plasma Sail' },
  { key: 'tholin-sphere', nameUk: 'Толінова сфера', nameEn: 'Tholin Sphere' },
  { key: 'methane-bubble-breather', nameUk: 'Метановий дихальник', nameEn: 'Methane-Bubble Breather' },
  { key: 'sulfur-lantern', nameUk: 'Сірчаний ліхтар', nameEn: 'Sulfur Lantern' },
  { key: 'radiotroph', nameUk: 'Радіотроф', nameEn: 'Radiotroph' },
  { key: 'liquid-metal-droplet', nameUk: 'Рідкометалева крапля', nameEn: 'Liquid-Metal Droplet' },
  { key: 'halophile-salt-crystal', nameUk: 'Галофільний кристал', nameEn: 'Halophile Salt-Crystal' },
  { key: 'iron-oxide-filament', nameUk: 'Залізооксидна нитка', nameEn: 'Iron-Oxide Filament' },
  { key: 'aerogel-floater', nameUk: 'Аерогелевий поплавець', nameEn: 'Aerogel Floater' },
  { key: 'photonic-lens-eye', nameUk: 'Фотонне око-лінза', nameEn: 'Photonic Lens-Eye' },
  { key: 'mitosis-pair', nameUk: 'Пара поділу', nameEn: 'Mitosis Pair' },
  { key: 'quartz-spine-urchin', nameUk: 'Кварцовий їжак', nameEn: 'Quartz-Spine Urchin' },
  { key: 'living-snowflake', nameUk: 'Жива сніжинка', nameEn: 'Living Snowflake' },
  { key: 'web-caster', nameUk: 'Павутинник', nameEn: 'Web-Caster' },
  { key: 'convection-ring', nameUk: 'Конвекційне кільце', nameEn: 'Convection Ring' },
  { key: 'spectral-veil', nameUk: 'Спектральна вуаль', nameEn: 'Spectral Veil' },
  { key: 'helio-disc', nameUk: 'Геліодиск', nameEn: 'Helio-Disc' },
];

/** Total number of bundled simple (common) lifeforms. */
export const SIMPLE_LIFEFORM_COUNT = SIMPLE_LIFEFORMS.length;

const SIMPLE_BY_KEY: Record<string, SimpleLifeform> = Object.fromEntries(
  SIMPLE_LIFEFORMS.map((s) => [s.key, s]),
);

/** Lookup a simple lifeform by its stable key. */
export function getSimpleLifeform(key: string): SimpleLifeform | undefined {
  return SIMPLE_BY_KEY[key];
}

/** Bundled photo path for a simple lifeform key. */
export function simpleLifeformPhoto(key: string): string {
  return `${SIMPLE_LIFEFORM_ASSET_BASE}/${key}.webp`;
}

/** Bundled video path for a simple lifeform key. */
export function simpleLifeformVideo(key: string): string {
  return `${SIMPLE_LIFEFORM_ASSET_BASE}/${key}.webm`;
}

/** Localized display name for a simple lifeform key ('uk' | 'en'). */
export function simpleLifeformName(key: string, lang: string): string {
  const s = SIMPLE_BY_KEY[key];
  if (!s) return key;
  return lang.startsWith('uk') ? s.nameUk : s.nameEn;
}

/**
 * Recover the species key from a bundled asset URL such as
 * `/lifeforms/common/shifting-amoeba.webp`. Returns null if not a bundled
 * common asset. Used to know which species a player already owns (dedup) and
 * to localize the display name on reload without a DB schema change.
 */
export function simpleKeyFromAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /\/lifeforms\/common\/([a-z0-9-]+)\.(webp|webm)$/.exec(url);
  if (!m) return null;
  return SIMPLE_BY_KEY[m[1]] ? m[1] : null;
}

/**
 * Deterministically pick the next simple lifeform a player has NOT collected.
 * Returns null when every one of the 28 is already owned (→ caller treats the
 * find as a duplicate and does not save it).
 *
 * @param ownedKeys  Set of species keys the player already owns.
 * @param seed       A stable seed (e.g. planet.seed ^ counter) to vary which
 *                   unseen species is granted.
 */
export function pickUnseenSimpleLifeform(
  ownedKeys: ReadonlySet<string>,
  seed: number,
): string | null {
  const unseen = SIMPLE_LIFEFORMS.filter((s) => !ownedKeys.has(s.key));
  if (unseen.length === 0) return null;
  const idx = (Math.abs(Math.floor(seed)) >>> 0) % unseen.length;
  return unseen[idx].key;
}

// ---------------------------------------------------------------------------
// Planet-aware biology context — feeds the paid Alpha-photo/video prompts so a
// discovered organism is biologically coherent with its world: no liquid water
// → it is NOT aquatic; crust composition drives colour & structure; atmosphere
// and temperature drive the medium and metabolism. English (prompt-bound).
// ---------------------------------------------------------------------------

export interface LifeformPlanetContext {
  /** Binding biological constraints injected into the creative brief. */
  hint: string;
  /** Short clause describing the medium the organism is rendered in. */
  medium: string;
}

/** Dominant crust element → pigment + structural motif for the organism. */
const CRUST_PIGMENT: Record<string, string> = {
  Fe: 'rust-red and ferrous-metallic tones, oxidized iron-like plating',
  S: 'sulfur-yellow and ochre tones, acidophilic crystalline deposits',
  C: 'dark graphitic, sooty-black carbon-based tissue',
  Si: 'glassy translucent silica shell with angular crystalline geometry',
  Mg: 'dull olivine-green mineral hues',
  Ca: 'chalky white carbonate plating',
  Na: 'pale saline crystalline crust',
  Ni: 'steely-grey metallic sheen',
  Ti: 'dark titanium-grey armoured shell',
  Al: 'light aluminous grey-white mineral skin',
  K: 'faint violet potassic mineral tint',
  P: 'phosphorescent pale-green mineral veins',
};

/**
 * Derive biologically-coherent prompt constraints from a planet's real
 * parameters (temperature, water, atmosphere, crust composition).
 */
export function buildLifeformPlanetContext(planet: Planet): LifeformPlanetContext {
  const parts: string[] = [];
  const t = planet.surfaceTempK ?? 288;

  // Temperature regime → metabolism / structure.
  if (t > 1000) parts.push('a scorching molten world; a heat-forged extremophile of glowing mineral tissue');
  else if (t > 373) parts.push('an above-boiling blistering world; a thermophilic extremophile');
  else if (t >= 273) parts.push('a temperate world');
  else if (t > 150) parts.push('a frozen frigid world; a cryophilic extremophile');
  else parts.push('an ultra-cold cryogenic world; slow, crystalline biology');

  // Water / living medium — the strongest constraint.
  const hy = planet.hydrosphere;
  const pressure = planet.atmosphere?.surfacePressureAtm ?? 0;
  let medium: string;
  if (hy && hy.waterCoverageFraction > 0) {
    parts.push('liquid water is present, so aquatic membrane-based life is plausible');
    medium = 'suspended in dark mineral-rich liquid water';
  } else if (hy && hy.hasSubsurfaceOcean) {
    parts.push('no surface water, but a subsurface ocean beneath ice; life clings to cold cryo-brine');
    medium = 'suspended in cold subsurface brine beneath cracked ice';
  } else if (hy && hy.iceCapFraction > 0) {
    parts.push('no liquid water, only ice; the organism is cryophilic and frost-encased, NOT free-swimming');
    medium = 'embedded in cracked translucent ice';
  } else {
    parts.push('there is NO liquid water anywhere, so the organism is NOT aquatic: it is anhydrous and lithophilic/xerophilic, drawing on minerals rather than water');
    medium = pressure < 0.01
      ? 'resting on dry mineral regolith in near-vacuum, with no fluid medium'
      : 'clinging to dry mineral rock in a thin dusty haze';
  }

  // Atmosphere → medium chemistry / metabolism.
  const atm = planet.atmosphere;
  if (!atm || atm.surfacePressureAtm < 0.01) {
    parts.push('near-vacuum with no breathable medium; vacuum-hardy, radiation-shielded form');
  } else {
    if (atm.surfacePressureAtm > 10) parts.push('crushing high-pressure atmosphere; a squat, reinforced body');
    const dominant = Object.entries(atm.composition).sort(([, a], [, b]) => b - a)[0];
    const gasClause: Record<string, string> = {
      CO2: 'carbon-dioxide atmosphere with carbon-fixing chemistry and a dim greenhouse haze',
      N2: 'nitrogen-rich atmosphere',
      H2: 'hydrogen-rich primordial atmosphere favouring buoyant gossamer forms',
      O2: 'oxygen-rich atmosphere with vivid oxidized pigments',
      CH4: 'methane atmosphere with an orange-brown hydrocarbon haze and exotic biochemistry',
      H2O: 'humid water-vapour atmosphere',
    };
    if (dominant && gasClause[dominant[0]]) parts.push(gasClause[dominant[0]]);
  }

  // Crust composition → colour & structure (skip ubiquitous oxygen).
  const crust = planet.resources?.crustComposition;
  if (crust) {
    const pigment = Object.entries(crust)
      .filter(([el]) => CRUST_PIGMENT[el])
      .sort(([, a], [, b]) => b - a)[0];
    if (pigment) {
      parts.push(`crust rich in ${pigment[0]}, so colouration and structure show ${CRUST_PIGMENT[pigment[0]]}`);
    }
  }

  return { hint: parts.join('; '), medium };
}
