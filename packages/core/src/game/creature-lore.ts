// ---------------------------------------------------------------------------
// Biosphere creature lore — structured, bilingual biography + parameters
// ---------------------------------------------------------------------------
// Requirement: never show the generation prompt / design-brief text to the
// player as if it were a description. Instead every creature gets its own
// SEPARATE structured record — a short science-fiction biography plus
// realistic-unit parameters (size, weight, lifespan, temperament, diet,
// habitat/behavior) — always produced in BOTH Ukrainian and English so the
// client can render the player's active language without ever touching
// react-i18next UI-label files for per-creature content (that system is for
// static labels, not AI/derived domain data).
//
// This module is pure and network-free: the deterministic fallback builder
// here is also the SAFETY NET used server-side whenever the AI text call is
// unavailable or returns something that fails validation — see
// parseCreatureLoreCandidate. It is deliberately consistent with the size
// class picked by pickExperimentBodyPlan (creature-experiment.ts) for the
// same seed, so the numeric size/weight never contradicts the organism's
// silhouette/body-plan text used in the image prompt.
// ---------------------------------------------------------------------------

import { SeededRNG } from '../math/rng.js';
import {
  CREATURE_ELEMENTS,
  pickExperimentBodyPlan,
  type CreatureBiome,
  type CreatureSizeClass,
  type CreatureSilhouette,
} from './creature-experiment.js';

export const CREATURE_LORE_SCHEMA_VERSION = 1 as const;

export interface LocalizedText {
  uk: string;
  en: string;
}

export interface CreatureLore {
  schemaVersion: 1;
  /** Short player-facing description (replaces the raw design-brief text). */
  summary: LocalizedText;
  /** 2-4 sentence science-fiction biography. */
  story: LocalizedText;
  temperament: LocalizedText;
  diet: LocalizedText;
  habitatBehavior: LocalizedText;
  /** Body height/length in centimeters. */
  sizeCm: number;
  weightKg: number;
  lifespanYears: number;
}

/**
 * Canonical profile for the bundled blue-grey starter GLB. This is domain
 * data (not UI chrome), so both localized variants live together here rather
 * than as hard-coded React copy. It is used only when the bundled/default
 * specimen is actually being shown; it must never replace a personal
 * creature's persisted lore.
 */
export const STARTER_CREATURE_LORE: CreatureLore = {
  schemaVersion: CREATURE_LORE_SCHEMA_VERSION,
  summary: {
    uk: 'Мирний шестиногий літоскок із м’якою синьо-сірою шкірою та чутливими гребенями.',
    en: 'A peaceful six-legged lithohopper with soft blue-grey skin and sensitive crests.',
  },
  story: {
    uk: 'Першого літоскока знайшли біля теплої тріщини в базальтовому плато, де він складав блискучі камінці у правильні кільця. Біологи з’ясували, що так істота позначає безпечні шляхи до підземної вологи. Відтоді її спокійна присутність стала для молодих біосфер ознакою стабільного ґрунту.',
    en: 'The first lithohopper was found beside a warm fissure on a basalt plateau, arranging bright pebbles into precise rings. Biologists discovered that the pattern marks safe routes to underground moisture. Its calm presence has since become a sign of stable ground in young biospheres.',
  },
  temperament: {
    uk: 'лагідний, допитливий, легко звикає до спостерігачів',
    en: 'gentle, curious, and quick to accept observers',
  },
  diet: {
    uk: 'мінеральні лишайники, м’які кореневі бульби та соляні відкладення',
    en: 'mineral lichens, soft root nodules, and salt deposits',
  },
  habitatBehavior: {
    uk: 'живе на прохолодних кам’янистих рівнинах; на світанку шукає вологу, а вдень ховається у тріщинах',
    en: 'lives on cool rocky plains; searches for moisture at dawn and shelters in fissures by day',
  },
  sizeCm: 92,
  weightKg: 38,
  lifespanYears: 27,
};

export const CREATURE_LORE_BOUNDS = {
  sizeCm: { min: 2, max: 2500 },
  weightKg: { min: 0.01, max: 12000 },
  lifespanYears: { min: 0.5, max: 500 },
} as const;

const MAX_SUMMARY_LEN = 220;
const MAX_STORY_LEN = 700;
const MAX_SHORT_FIELD_LEN = 220;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function isLocalizedText(v: unknown): v is LocalizedText {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return isNonEmptyString(o.uk) && isNonEmptyString(o.en);
}

export function localizedCreatureText(text: LocalizedText, language: string): string {
  return language.toLowerCase().startsWith('uk') ? text.uk : text.en;
}

function sanitizeLocalizedText(v: LocalizedText, maxLen: number): LocalizedText {
  return { uk: v.uk.trim().slice(0, maxLen), en: v.en.trim().slice(0, maxLen) };
}

/** Runtime guard for a full, already-persisted lore record (e.g. read back
 *  from creature_models.lore JSONB — legacy rows have `lore = null`). */
export function isCreatureLore(v: unknown): v is CreatureLore {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.schemaVersion !== CREATURE_LORE_SCHEMA_VERSION) return false;
  if (!isLocalizedText(o.summary) || !isLocalizedText(o.story)) return false;
  if (!isLocalizedText(o.temperament) || !isLocalizedText(o.diet) || !isLocalizedText(o.habitatBehavior)) return false;
  if (typeof o.sizeCm !== 'number' || !Number.isFinite(o.sizeCm)) return false;
  if (typeof o.weightKg !== 'number' || !Number.isFinite(o.weightKg)) return false;
  if (typeof o.lifespanYears !== 'number' || !Number.isFinite(o.lifespanYears)) return false;
  if (o.sizeCm < CREATURE_LORE_BOUNDS.sizeCm.min || o.sizeCm > CREATURE_LORE_BOUNDS.sizeCm.max) return false;
  if (o.weightKg < CREATURE_LORE_BOUNDS.weightKg.min || o.weightKg > CREATURE_LORE_BOUNDS.weightKg.max) return false;
  if (o.lifespanYears < CREATURE_LORE_BOUNDS.lifespanYears.min || o.lifespanYears > CREATURE_LORE_BOUNDS.lifespanYears.max) return false;
  return true;
}

// ── Element physiology + flavor tables (mirrors the slot semantics used by
// buildExperimentCreatureDescription: symbols[0] is the dominant body plan) ─

const ELEMENT_PHYSICAL: Record<string, { massMult: number; lifespanMult: number }> = {
  C: { massMult: 1.0, lifespanMult: 1.0 },
  Si: { massMult: 1.05, lifespanMult: 1.1 },
  Fe: { massMult: 1.2, lifespanMult: 1.15 },
  Cu: { massMult: 1.0, lifespanMult: 1.0 },
  S: { massMult: 0.95, lifespanMult: 0.9 },
  P: { massMult: 0.9, lifespanMult: 1.0 },
  Se: { massMult: 0.95, lifespanMult: 1.05 },
  Li: { massMult: 0.55, lifespanMult: 0.8 },
  W: { massMult: 1.5, lifespanMult: 1.3 },
  Xe: { massMult: 0.5, lifespanMult: 0.85 },
};

const ELEMENT_LORE: Record<string, {
  temperament: LocalizedText;
  diet: LocalizedText;
  habitatBehavior: LocalizedText;
  storyFlavor: LocalizedText;
}> = {
  C: {
    temperament: { uk: 'спокійний і роботящий', en: 'calm and industrious' },
    diet: { uk: 'детритофаг — переробляє органічні решки та мертву рослинність', en: 'a detritivore, recycling organic debris and dead plant matter' },
    habitatBehavior: { uk: 'риє нескладні нірки і тримається невеликих груп', en: 'digs simple burrows and keeps to small groups' },
    storyFlavor: { uk: 'сегментований хітиновий панцир', en: 'a segmented chitin shell' },
  },
  Si: {
    temperament: { uk: 'незворушний і терплячий', en: 'unshakeable and patient' },
    diet: { uk: 'мінералотроф — вбирає розчинені мінерали крізь пористу оболонку', en: 'a mineralotroph, absorbing dissolved minerals through a porous shell' },
    habitatBehavior: { uk: 'нерухомо вистоює на освітлених виступах, повертаючись до світла', en: 'stands motionless on sunlit outcrops, slowly turning to face the light' },
    storyFlavor: { uk: 'гранчасту кристалічну структуру тіла', en: 'a faceted, crystal-grown body' },
  },
  Fe: {
    temperament: { uk: 'стійкий і незворушно оборонний', en: 'stoic and steadily defensive' },
    diet: { uk: 'пасовищний травоїд, стирає корм важкими щелепами', en: 'a grazing herbivore, grinding forage with heavy jaws' },
    habitatBehavior: { uk: 'тримається відкритих просторів, де добре видно загрозу', en: 'stays in open ground where threats are easy to spot' },
    storyFlavor: { uk: 'важкі залізисті пластини', en: 'heavy iron-toned plating' },
  },
  Cu: {
    temperament: { uk: 'спокійний і по-своєму цікавий', en: 'mellow and quietly curious' },
    diet: { uk: 'фільтратор — проціджує вологе повітря чи воду крізь жаброві щілини', en: 'a filter feeder, straining humid air or water through gill-like slits' },
    habitatBehavior: { uk: 'збирається невеликими скупченнями у вологих затінених місцях', en: 'gathers in small clusters in humid, shaded spots' },
    storyFlavor: { uk: 'мідний панцир у патині', en: 'a copper carapace weathered into patina' },
  },
  S: {
    temperament: { uk: 'насторожений і територіальний', en: 'wary and territorial' },
    diet: { uk: 'токсикостійкий фітофаг — їсть рослини, небезпечні для інших видів', en: 'a toxin-resistant browser, eating plants unsafe for other species' },
    habitatBehavior: { uk: 'патрулює власну ділянку на відкритих гребенях', en: 'patrols its own patch of ground on exposed ridgelines' },
    storyFlavor: { uk: 'яскраве застережне забарвлення', en: 'bold warning coloration' },
  },
  P: {
    temperament: { uk: 'м’який і переважно нічний', en: 'gentle and mostly nocturnal' },
    diet: { uk: 'симбіотичний фотосинтетик — частину енергії бере від власного світіння', en: 'a symbiotic photosynthesizer, drawing part of its energy from its own glow' },
    habitatBehavior: { uk: 'ховається вдень у затінених заглибинах, виходить після заходу', en: 'shelters in shaded hollows by day, emerging after dusk' },
    storyFlavor: { uk: 'м’яке біолюмінесцентне сяйво', en: 'a soft bioluminescent glow' },
  },
  Se: {
    temperament: { uk: 'уважний і обережний', en: 'watchful and cautious' },
    diet: { uk: 'опортуністичний хижак, що вистежує рух по відблисках світла', en: 'an opportunistic hunter, tracking movement by shifts in light' },
    habitatBehavior: { uk: 'тримається сутінкових меж між світлом і тінню', en: 'lingers along twilight boundaries between light and shadow' },
    storyFlavor: { uk: 'дзеркальні світлочутливі очі', en: 'mirror-like photosensitive eyes' },
  },
  Li: {
    temperament: { uk: 'полохливий і невгамовно енергійний', en: 'skittish and restlessly energetic' },
    diet: { uk: 'швидкий фуражир — вихоплює дрібний корм на бігу', en: 'a fast forager, snatching small food items on the move' },
    habitatBehavior: { uk: 'тримається відкритих рівнин, де можна швидко втекти', en: 'stays on open plains where a quick escape is always possible' },
    storyFlavor: { uk: 'напрочуд легку статуру', en: 'a strikingly lightweight frame' },
  },
  W: {
    temperament: { uk: 'повільний і абсолютно незворушний', en: 'slow and utterly unshakeable' },
    diet: { uk: 'масовий випасник, з’їдає багато рослинності за раз', en: 'a bulk grazer, consuming large amounts of vegetation at once' },
    habitatBehavior: { uk: 'прокладає власні стежки крізь щільний рельєф, рідко змінюючи маршрут', en: 'carves its own paths through dense terrain, rarely changing route' },
    storyFlavor: { uk: 'непропорційно щільну, важку статуру', en: 'a disproportionately dense, heavy frame' },
  },
  Xe: {
    temperament: { uk: 'мрійливий і майже безтурботний', en: 'dreamy and almost weightless in temperament' },
    diet: { uk: 'фільтрує дрібні частинки просто з повітряних потоків', en: 'filters fine particles directly out of passing air currents' },
    habitatBehavior: { uk: 'повільно дрейфує у верхніх шарах атмосфери, рідко торкаючись поверхні', en: 'drifts slowly through the upper atmosphere, rarely touching solid ground' },
    storyFlavor: { uk: 'напівпрозорі газові міхури зі слабким сяйвом', en: 'translucent gas bladders with a faint inner glow' },
  },
};

const BIOME_HABITAT_CLAUSE: Record<CreatureBiome, LocalizedText> = {
  ocean: { uk: 'Більшість часу проводить у прибережних водах.', en: 'It spends most of its time in coastal waters.' },
  ice: { uk: 'Пересувається повільно, оберігаючи тепло під шаром інею.', en: 'It moves slowly, conserving warmth beneath a layer of frost.' },
  desert: { uk: 'Уникає пекучого полудня, ховаючись у затінку дюн.', en: 'It avoids the harshest midday heat by sheltering in the shade of dunes.' },
  lava: { uk: 'Тримається безпечної відстані від відкритої лави.', en: 'It keeps a safe distance from open lava flows.' },
  vegetation: { uk: 'Ховається серед густих заростей чужинної флори.', en: 'It hides among dense stands of alien flora.' },
  gasGiant: { uk: 'Ніколи не торкається твердої поверхні — усе життя проходить в атмосфері.', en: 'It never touches solid ground — its whole life unfolds within the atmosphere.' },
  rocky: { uk: 'Легко видирається на круті кам’яні виступи.', en: 'It climbs steep rocky outcrops with ease.' },
};

const NO_BIOME_CLAUSE: LocalizedText = {
  uk: 'Досі мало відомо про повний ареал її поширення.',
  en: 'Its full range across the planet is still poorly understood.',
};

const SIZE_CLASS_LABEL: Record<CreatureSizeClass, LocalizedText> = {
  small: { uk: 'невелика', en: 'small' },
  'medium-sized': { uk: 'середнього розміру', en: 'medium-sized' },
  large: { uk: 'велика', en: 'large' },
};

const SILHOUETTE_LABEL: Record<CreatureSilhouette, LocalizedText> = {
  quadruped: { uk: 'чотиринога', en: 'four-legged' },
  'six-legged hexapod': { uk: 'шестинога', en: 'six-legged' },
  'serpentine long-bodied': { uk: 'змієподібна витягнута', en: 'serpentine, long-bodied' },
  'crustacean-like many-limbed': { uk: 'ракоподібна багатонога', en: 'crustacean-like, many-limbed' },
  'squat bipedal': { uk: 'приземкувата двонога', en: 'squat, two-legged' },
  'radially symmetric': { uk: 'радіально симетрична', en: 'radially symmetric' },
};

const SIZE_CLASS_RANGES: Record<CreatureSizeClass, { sizeCm: [number, number]; weightKg: [number, number]; lifespanYears: [number, number] }> = {
  small: { sizeCm: [22, 70], weightKg: [0.3, 14], lifespanYears: [1, 8] },
  'medium-sized': { sizeCm: [70, 180], weightKg: [14, 260], lifespanYears: [5, 40] },
  large: { sizeCm: [180, 600], weightKg: [260, 9000], lifespanYears: [20, 150] },
};

/** Weighted mean of an element-driven multiplier across the recipe slots
 *  (slot 1 = dominant body plan → heaviest weight, trailing slots lighter). */
function weightedElementMultiplier(symbols: string[], pick: (mult: { massMult: number; lifespanMult: number }) => number): number {
  const slotWeights = [1.0, 0.6, 0.3, 0.3];
  let weighted = 0;
  let totalWeight = 0;
  symbols.forEach((symbol, index) => {
    const def = ELEMENT_PHYSICAL[symbol];
    if (!def) return;
    const weight = slotWeights[index] ?? 0.3;
    weighted += pick(def) * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? weighted / totalWeight : 1.0;
}

function roundSize(cm: number): number {
  return cm >= 100 ? Math.round(cm) : Math.round(cm * 10) / 10;
}

function roundWeight(kg: number): number {
  if (kg >= 100) return Math.round(kg);
  if (kg >= 10) return Math.round(kg * 10) / 10;
  return Math.round(kg * 100) / 100;
}

function roundLifespan(years: number): number {
  return years >= 10 ? Math.round(years) : Math.round(years * 2) / 2;
}

export interface CreatureLoreFallbackInput {
  /** Whitelisted element symbols in slot order (see creature-experiment.ts). */
  symbols: string[];
  biome: CreatureBiome | null;
  /** Same seed used for buildExperimentCreatureDescription (e.g. from the
   *  creature id) — keeps size class/silhouette perfectly in sync with the
   *  image-prompt description for the very same creature. */
  seed: number;
}

/**
 * Deterministic, network-free bilingual lore: the safety net used whenever
 * the AI structured-text call is unavailable or its response fails
 * validation (see parseCreatureLoreCandidate below), and the only path used
 * in tests. Same (symbols, biome, seed) always produces the same record.
 */
export function buildFallbackCreatureLore(input: CreatureLoreFallbackInput): CreatureLore {
  const symbols = input.symbols.filter((s) => ELEMENT_LORE[s]);
  const primary = symbols[0] ?? CREATURE_ELEMENTS[0].symbol;
  const primaryLore = ELEMENT_LORE[primary] ?? ELEMENT_LORE[CREATURE_ELEMENTS[0].symbol];

  const { size, silhouette } = pickExperimentBodyPlan(input.seed);
  // Independent RNG stream (XOR-derived offset) for the numeric jitter, so
  // the numbers here never depend on how many values pickExperimentBodyPlan
  // itself happens to consume — keeps the two functions decoupled.
  const rng = new SeededRNG((input.seed ^ 0x9e3779b9) >>> 0);

  const range = SIZE_CLASS_RANGES[size];
  const massMult = weightedElementMultiplier(symbols, (m) => m.massMult);
  const lifespanMult = weightedElementMultiplier(symbols, (m) => m.lifespanMult);

  const sizeCm = roundSize(clamp(
    lerp(range.sizeCm[0], range.sizeCm[1], rng.next()),
    CREATURE_LORE_BOUNDS.sizeCm.min,
    CREATURE_LORE_BOUNDS.sizeCm.max,
  ));
  const weightKg = roundWeight(clamp(
    lerp(range.weightKg[0], range.weightKg[1], rng.next()) * massMult,
    CREATURE_LORE_BOUNDS.weightKg.min,
    CREATURE_LORE_BOUNDS.weightKg.max,
  ));
  const lifespanYears = roundLifespan(clamp(
    lerp(range.lifespanYears[0], range.lifespanYears[1], rng.next()) * lifespanMult,
    CREATURE_LORE_BOUNDS.lifespanYears.min,
    CREATURE_LORE_BOUNDS.lifespanYears.max,
  ));

  const sizeLabel = SIZE_CLASS_LABEL[size];
  const silhouetteLabel = SILHOUETTE_LABEL[silhouette];
  const habitatClause = input.biome ? BIOME_HABITAT_CLAUSE[input.biome] : NO_BIOME_CLAUSE;

  const summary: LocalizedText = {
    uk: `${sizeLabel.uk} ${silhouetteLabel.uk} організм. Характерна риса — ${primaryLore.storyFlavor.uk}.`,
    en: `A ${sizeLabel.en} ${silhouetteLabel.en} organism. Its defining feature is ${primaryLore.storyFlavor.en}.`,
  };
  const story: LocalizedText = {
    uk: `Науковці біосфери вперше описали цей вид невдовзі після заселення планети. Це ${sizeLabel.uk} ${silhouetteLabel.uk} організм, і найперше в очі впадає ${primaryLore.storyFlavor.uk}. ${habitatClause.uk}`,
    en: `Biosphere researchers first catalogued this species shortly after the planet was seeded. It is a ${sizeLabel.en} ${silhouetteLabel.en} organism, and the first thing anyone notices is ${primaryLore.storyFlavor.en}. ${habitatClause.en}`,
  };

  return {
    schemaVersion: CREATURE_LORE_SCHEMA_VERSION,
    summary: sanitizeLocalizedText(summary, MAX_SUMMARY_LEN),
    story: sanitizeLocalizedText(story, MAX_STORY_LEN),
    temperament: sanitizeLocalizedText(primaryLore.temperament, MAX_SHORT_FIELD_LEN),
    diet: sanitizeLocalizedText(primaryLore.diet, MAX_SHORT_FIELD_LEN),
    habitatBehavior: sanitizeLocalizedText(primaryLore.habitatBehavior, MAX_SHORT_FIELD_LEN),
    sizeCm,
    weightKg,
    lifespanYears,
  };
}

/**
 * Validates an arbitrary (e.g. AI-produced) candidate against the schema,
 * merging field-by-field with `fallback`: every field is checked
 * independently, so a partially malformed AI response still keeps whatever
 * parts ARE valid instead of discarding the whole record. Never throws,
 * never invents data outside the provided fallback — this is the one
 * function server code should trust for turning raw JSON into a CreatureLore.
 */
export function parseCreatureLoreCandidate(raw: unknown, fallback: CreatureLore): CreatureLore {
  const o = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};

  const localizedOrFallback = (value: unknown, fallbackValue: LocalizedText, maxLen: number): LocalizedText =>
    isLocalizedText(value) ? sanitizeLocalizedText(value as LocalizedText, maxLen) : fallbackValue;

  const numberOrFallback = (value: unknown, fallbackValue: number, bounds: { min: number; max: number }): number =>
    (typeof value === 'number' && Number.isFinite(value)) ? clamp(value, bounds.min, bounds.max) : fallbackValue;

  return {
    schemaVersion: CREATURE_LORE_SCHEMA_VERSION,
    summary: localizedOrFallback(o.summary, fallback.summary, MAX_SUMMARY_LEN),
    story: localizedOrFallback(o.story, fallback.story, MAX_STORY_LEN),
    temperament: localizedOrFallback(o.temperament, fallback.temperament, MAX_SHORT_FIELD_LEN),
    diet: localizedOrFallback(o.diet, fallback.diet, MAX_SHORT_FIELD_LEN),
    habitatBehavior: localizedOrFallback(o.habitatBehavior, fallback.habitatBehavior, MAX_SHORT_FIELD_LEN),
    sizeCm: numberOrFallback(o.sizeCm, fallback.sizeCm, CREATURE_LORE_BOUNDS.sizeCm),
    weightKg: numberOrFallback(o.weightKg, fallback.weightKg, CREATURE_LORE_BOUNDS.weightKg),
    lifespanYears: numberOrFallback(o.lifespanYears, fallback.lifespanYears, CREATURE_LORE_BOUNDS.lifespanYears),
  };
}
