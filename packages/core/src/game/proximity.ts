/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PROXIMITY MODIFIER SYSTEM — єдине місце для всіх ефектів відстані
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  Усі змінні, що залежать від кільцевої відстані, живуть ТІЛЬКИ ТУТ.
 *     НЕ додавай логіку ring-distance в інших файлах — додай нову категорію тут.
 *
 * Що контролює ця система:
 * ┌──────────────────┬────────────────────────────────────────────────────────┐
 * │ RESEARCH         │ прогрес за сесію (RESEARCH_PROGRESS_BY_RING → тут)     │
 * │ TRANSPORT        │ час польоту кораблів, доставки вантажу                 │
 * │ ROCKETS          │ час польоту ракети, витрата палива                     │
 * │ MISSIONS         │ шанс успіху, тривалість місії                          │
 * │ COLONIES         │ час постачання, множник витрат на утримання            │
 * │ BUILDINGS        │ множник виробництва (затухання сигналу/тепла)          │
 * └──────────────────┴────────────────────────────────────────────────────────┘
 *
 * Використання:
 *   const mods = getProximityModifiers(sourceRing, targetRing);
 *   const travelMs = BASE_TRAVEL_MS * mods.transport.timeMultiplier;
 *   const missionOk = Math.random() < BASE_CHANCE * mods.missions.chanceMultiplier;
 *
 * ringDiff = |sourcePlanetRing − targetRing|
 *   0 → та сама кільця (колонія досліджує свій же регіон)
 *   1 → сусідня кільця (стандарт: home→ring1)
 *   2 → через кільцю (home→ring2)
 *   …
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResearchProximityMods {
  /** Мінімальний прогрес (%) за одну сесію дослідження. */
  progressMin: number;
  /** Максимальний прогрес (%) за одну сесію дослідження. */
  progressMax: number;
  /** Множник тривалості сесії (1.0 = норма). Далі → повільніше. */
  sessionTimeMultiplier: number;
}

export interface TransportProximityMods {
  /** Множник часу в дорозі для кораблів і вантажу (1.0 = норма). */
  timeMultiplier: number;
  /** Множник витрат пального на маршрут (1.0 = норма). */
  fuelCostMultiplier: number;
}

export interface RocketProximityMods {
  /** Множник часу польоту ракети (1.0 = норма). */
  flightTimeMultiplier: number;
  /** Множник витрат палива ракети (1.0 = норма). */
  fuelCostMultiplier: number;
  /** Множник вікна запуску — ширше вікно = легше потрапити (>1.0 = легше). */
  launchWindowMultiplier: number;
}

export interface MissionProximityMods {
  /** Множник шансу успіху місії (1.0 = норма). */
  chanceMultiplier: number;
  /** Множник тривалості місії (1.0 = норма). Далі → довше. */
  durationMultiplier: number;
  /** Множник нагороди за місію (1.0 = норма). Далі → більша нагорода. */
  rewardMultiplier: number;
}

export interface ColonyProximityMods {
  /** Множник часу постачання з/до колонії (1.0 = норма). */
  supplyTimeMultiplier: number;
  /** Множник витрат на утримання (upkeep) колонії (1.0 = норма). */
  upkeepMultiplier: number;
}

export interface BuildingProximityMods {
  /**
   * Множник продуктивності будівель, що залежать від сигналу/тепла/зв'язку.
   * (1.0 = повна потужність, <1.0 = часткова через відстань)
   */
  productionMultiplier: number;
}

/** Повний набір модифікаторів для заданої кільцевої відстані. */
export interface ProximityModifiers {
  /** Кільцева відстань, для якої обчислено ці модифікатори. */
  ringDiff: number;
  research: ResearchProximityMods;
  transport: TransportProximityMods;
  rockets: RocketProximityMods;
  missions: MissionProximityMods;
  colonies: ColonyProximityMods;
  buildings: BuildingProximityMods;
}

// ─── Tuning table ────────────────────────────────────────────────────────────

/**
 * Таблиця модифікаторів за рівнем кільцевої відстані.
 * Індекс = ringDiff (0, 1, 2, 3, 4+).
 * Останній запис застосовується до будь-якої відстані понад 4.
 *
 * Змінюй тільки тут — решта коду підхоплює автоматично.
 */
const PROXIMITY_TABLE: Array<{
  research:  { progressMin: number; progressMax: number; sessionTimeMultiplier: number };
  transport: { timeMultiplier: number; fuelCostMultiplier: number };
  rockets:   { flightTimeMultiplier: number; fuelCostMultiplier: number; launchWindowMultiplier: number };
  missions:  { chanceMultiplier: number; durationMultiplier: number; rewardMultiplier: number };
  colonies:  { supplyTimeMultiplier: number; upkeepMultiplier: number };
  buildings: { productionMultiplier: number };
}> = [
  // diff=0: та сама кільця → колонія досліджує свій регіон (максимальний бонус)
  {
    research:  { progressMin: 5,  progressMax: 80, sessionTimeMultiplier: 0.8 },
    transport: { timeMultiplier: 0.6,  fuelCostMultiplier: 0.6 },
    rockets:   { flightTimeMultiplier: 0.7,  fuelCostMultiplier: 0.6,  launchWindowMultiplier: 1.5 },
    missions:  { chanceMultiplier: 1.4,  durationMultiplier: 0.7,  rewardMultiplier: 0.8 },
    colonies:  { supplyTimeMultiplier: 0.5,  upkeepMultiplier: 0.8 },
    buildings: { productionMultiplier: 1.0 },
  },
  // diff=1: сусідня кільця (стандарт — home→ring1, ring1→ring2 тощо)
  {
    research:  { progressMin: 2,  progressMax: 50, sessionTimeMultiplier: 1.0 },
    transport: { timeMultiplier: 1.0,  fuelCostMultiplier: 1.0 },
    rockets:   { flightTimeMultiplier: 1.0,  fuelCostMultiplier: 1.0,  launchWindowMultiplier: 1.0 },
    missions:  { chanceMultiplier: 1.0,  durationMultiplier: 1.0,  rewardMultiplier: 1.0 },
    colonies:  { supplyTimeMultiplier: 1.0,  upkeepMultiplier: 1.0 },
    buildings: { productionMultiplier: 1.0 },
  },
  // diff=2: через кільцю (home→ring2 тощо)
  {
    research:  { progressMin: 2,  progressMax: 15, sessionTimeMultiplier: 1.2 },
    transport: { timeMultiplier: 1.8,  fuelCostMultiplier: 1.5 },
    rockets:   { flightTimeMultiplier: 1.6,  fuelCostMultiplier: 1.8,  launchWindowMultiplier: 0.8 },
    missions:  { chanceMultiplier: 0.8,  durationMultiplier: 1.5,  rewardMultiplier: 1.3 },
    colonies:  { supplyTimeMultiplier: 2.0,  upkeepMultiplier: 1.3 },
    buildings: { productionMultiplier: 0.95 },
  },
  // diff=3: далеко
  {
    research:  { progressMin: 2,  progressMax: 5,  sessionTimeMultiplier: 1.5 },
    transport: { timeMultiplier: 3.0,  fuelCostMultiplier: 2.5 },
    rockets:   { flightTimeMultiplier: 2.8,  fuelCostMultiplier: 3.0,  launchWindowMultiplier: 0.6 },
    missions:  { chanceMultiplier: 0.6,  durationMultiplier: 2.5,  rewardMultiplier: 1.7 },
    colonies:  { supplyTimeMultiplier: 3.5,  upkeepMultiplier: 1.6 },
    buildings: { productionMultiplier: 0.85 },
  },
  // diff=4+: дуже далеко (використовується для будь-якого diff ≥ 4)
  {
    research:  { progressMin: 1,  progressMax: 1,  sessionTimeMultiplier: 2.0 },
    transport: { timeMultiplier: 5.0,  fuelCostMultiplier: 4.0 },
    rockets:   { flightTimeMultiplier: 5.0,  fuelCostMultiplier: 5.0,  launchWindowMultiplier: 0.4 },
    missions:  { chanceMultiplier: 0.4,  durationMultiplier: 4.0,  rewardMultiplier: 2.5 },
    colonies:  { supplyTimeMultiplier: 6.0,  upkeepMultiplier: 2.0 },
    buildings: { productionMultiplier: 0.7 },
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Обчислити всі модифікатори відстані для заданого ringDiff.
 *
 * @param ringDiff |sourcePlanetRing − targetRing| ≥ 0
 */
export function computeProximityModifiers(ringDiff: number): ProximityModifiers {
  const idx = Math.min(Math.max(0, ringDiff), PROXIMITY_TABLE.length - 1);
  const row = PROXIMITY_TABLE[idx]!;
  return {
    ringDiff,
    research:  { ...row.research },
    transport: { ...row.transport },
    rockets:   { ...row.rockets },
    missions:  { ...row.missions },
    colonies:  { ...row.colonies },
    buildings: { ...row.buildings },
  };
}

/**
 * Зручна обгортка: обчислити модифікатори за кільцями джерела та цілі.
 *
 * @param sourceRing  Кільце планети/обсерваторії, що ініціює дію (0 = home).
 * @param targetRing  Кільце цільової зірки/системи.
 */
export function getProximityModifiers(sourceRing: number, targetRing: number): ProximityModifiers {
  return computeProximityModifiers(Math.abs(sourceRing - targetRing));
}
