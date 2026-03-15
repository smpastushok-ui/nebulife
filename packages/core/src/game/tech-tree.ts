// ---------------------------------------------------------------------------
// Technology Research Tree — types, Astronomy branch nodes, helpers
// ---------------------------------------------------------------------------

// ── Types ──────────────────────────────────────────────────────────────────

export type TechBranch = 'astronomy' | 'physics' | 'chemistry' | 'biology';

export type TechNodeStatus = 'locked' | 'available' | 'researched';

export type TechEffectType =
  | 'research_speed_mult'
  | 'discovery_chance_mult'
  | 'observatory_count_add'
  | 'spectral_class_reveal_pct'
  | 'anomaly_chance_mult'
  | 'max_ring_add'
  | 'research_data_regen'
  | 'scan_range_add'
  | 'rare_discovery_mult'
  | 'surface_building_unlock'
  | 'concurrent_research_add';

export interface TechEffect {
  type: TechEffectType;
  value: number;
}

export interface TechNode {
  id: string;
  branch: TechBranch;
  name: string;
  description: string;
  levelRequired: number;
  prerequisiteId: string | null;
  epoch: 1 | 2 | 3;
  xpReward: number;
  effects: TechEffect[];
  iconSymbol: string;
}

/** Persistent tech tree state — serialized to localStorage & server */
export interface TechTreeState {
  researched: Record<string, number>; // techId → timestamp
}

// ── Astronomy branch: 14 nodes (Levels 1–50) ──────────────────────────────

export const ASTRONOMY_NODES: TechNode[] = [
  // ── Epoch 1: Levels 1–15 ──
  {
    id: 'ast-radio-1',
    branch: 'astronomy',
    name: 'Радіотелескоп I',
    description: 'Зменшує час дослідження на 10%',
    levelRequired: 1,
    prerequisiteId: null,
    epoch: 1,
    xpReward: 20,
    effects: [{ type: 'research_speed_mult', value: 0.9 }],
    iconSymbol: '\u2299', // ⊙
  },
  {
    id: 'ast-compress',
    branch: 'astronomy',
    name: 'Алгоритми стиснення',
    description: '+2 дані дослідження за кожну сесію',
    levelRequired: 3,
    prerequisiteId: 'ast-radio-1',
    epoch: 1,
    xpReward: 25,
    effects: [{ type: 'research_data_regen', value: 2 }],
    iconSymbol: '\u2261', // ≡
  },
  {
    id: 'ast-satellite',
    branch: 'astronomy',
    name: 'Орбітальний супутник',
    description: '+15% шанс відкриття',
    levelRequired: 5,
    prerequisiteId: 'ast-compress',
    epoch: 1,
    xpReward: 30,
    effects: [{ type: 'discovery_chance_mult', value: 1.15 }],
    iconSymbol: '\u26AB', // ⚫ (satellite dot)
  },
  {
    id: 'ast-spectrum',
    branch: 'astronomy',
    name: 'Аналізатор спектру',
    description: 'Розкриває спектральний клас від 15% прогресу',
    levelRequired: 8,
    prerequisiteId: 'ast-satellite',
    epoch: 1,
    xpReward: 35,
    effects: [{ type: 'spectral_class_reveal_pct', value: 15 }],
    iconSymbol: '\u2248', // ≈
  },
  {
    id: 'ast-obs-2',
    branch: 'astronomy',
    name: 'Обсерваторія II',
    description: '+1 слот обсерваторії',
    levelRequired: 12,
    prerequisiteId: 'ast-spectrum',
    epoch: 1,
    xpReward: 50,
    effects: [{ type: 'observatory_count_add', value: 1 }],
    iconSymbol: '\u2302', // ⌂
  },

  // ── Epoch 2: Levels 16–34 ──
  {
    id: 'ast-probe',
    branch: 'astronomy',
    name: 'Автоматизований Зонд',
    description: '+1 доступне кільце для дослідження',
    levelRequired: 16,
    prerequisiteId: 'ast-obs-2',
    epoch: 2,
    xpReward: 40,
    effects: [{ type: 'max_ring_add', value: 1 }],
    iconSymbol: '\u2192', // →
  },
  {
    id: 'ast-dock',
    branch: 'astronomy',
    name: 'Малий Орбітальний Док',
    description: '+1 одночасне дослідження',
    levelRequired: 20,
    prerequisiteId: 'ast-probe',
    epoch: 2,
    xpReward: 45,
    effects: [{ type: 'concurrent_research_add', value: 1 }],
    iconSymbol: '\u2338', // ⌸
  },
  {
    id: 'ast-deep-radar',
    branch: 'astronomy',
    name: 'Радар глибокого космосу',
    description: '+1 дальність сканування, -15% час дослідження',
    levelRequired: 24,
    prerequisiteId: 'ast-dock',
    epoch: 2,
    xpReward: 50,
    effects: [
      { type: 'scan_range_add', value: 1 },
      { type: 'research_speed_mult', value: 0.85 },
    ],
    iconSymbol: '\u2609', // ☉
  },
  {
    id: 'ast-anomaly-filter',
    branch: 'astronomy',
    name: 'Фільтр Аномалій',
    description: '+30% шанс аномалії',
    levelRequired: 28,
    prerequisiteId: 'ast-deep-radar',
    epoch: 2,
    xpReward: 55,
    effects: [{ type: 'anomaly_chance_mult', value: 1.3 }],
    iconSymbol: '\u26A0', // ⚠
  },
  {
    id: 'ast-relay',
    branch: 'astronomy',
    name: 'Мережа ретрансляторів',
    description: '+5 даних дослідження за сесію',
    levelRequired: 32,
    prerequisiteId: 'ast-anomaly-filter',
    epoch: 2,
    xpReward: 60,
    effects: [{ type: 'research_data_regen', value: 5 }],
    iconSymbol: '\u2637', // ☷
  },

  // ── Epoch 3: Levels 35–50 ──
  {
    id: 'ast-obs-3',
    branch: 'astronomy',
    name: 'Обсерваторія III',
    description: '+1 слот обсерваторії',
    levelRequired: 36,
    prerequisiteId: 'ast-relay',
    epoch: 3,
    xpReward: 70,
    effects: [{ type: 'observatory_count_add', value: 1 }],
    iconSymbol: '\u2726', // ✦
  },
  {
    id: 'ast-quantum-int',
    branch: 'astronomy',
    name: 'Квантовий інтерферометр',
    description: '+50% шанс рідкісних відкриттів',
    levelRequired: 40,
    prerequisiteId: 'ast-obs-3',
    epoch: 3,
    xpReward: 80,
    effects: [{ type: 'rare_discovery_mult', value: 1.5 }],
    iconSymbol: '\u2042', // ⁂
  },
  {
    id: 'ast-grav-scan',
    branch: 'astronomy',
    name: 'Гравітаційний сканер',
    description: '+25% шанс відкриття, +1 кільце',
    levelRequired: 45,
    prerequisiteId: 'ast-quantum-int',
    epoch: 3,
    xpReward: 90,
    effects: [
      { type: 'discovery_chance_mult', value: 1.25 },
      { type: 'max_ring_add', value: 1 },
    ],
    iconSymbol: '\u2641', // ♁
  },
  {
    id: 'ast-orbital-yard',
    branch: 'astronomy',
    name: 'Орбітальна Верф',
    description: 'Розблоковує Орбітальну Верф на поверхні',
    levelRequired: 50,
    prerequisiteId: 'ast-grav-scan',
    epoch: 3,
    xpReward: 150,
    effects: [{ type: 'surface_building_unlock', value: 1 }],
    iconSymbol: '\u2693', // ⚓
  },
];

// All nodes across all branches (currently only astronomy)
const ALL_NODES: TechNode[] = [...ASTRONOMY_NODES];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create empty tech tree state. */
export function createTechTreeState(): TechTreeState {
  return { researched: {} };
}

/** Get all nodes for a given branch. */
export function getBranchNodes(branch: TechBranch): TechNode[] {
  return ALL_NODES.filter((n) => n.branch === branch);
}

/** Determine node status based on player level and current tech state. */
export function getTechNodeStatus(
  node: TechNode,
  playerLevel: number,
  state: TechTreeState,
): TechNodeStatus {
  // Already researched
  if (state.researched[node.id]) return 'researched';

  // Check level requirement
  if (playerLevel < node.levelRequired) return 'locked';

  // Check prerequisite
  if (node.prerequisiteId && !state.researched[node.prerequisiteId]) return 'locked';

  return 'available';
}

/** Research a technology, returning new state. */
export function researchTech(state: TechTreeState, techId: string): TechTreeState {
  if (state.researched[techId]) return state; // already researched
  return {
    ...state,
    researched: { ...state.researched, [techId]: Date.now() },
  };
}

/** Get all active effects from researched technologies. */
export function getActiveEffects(state: TechTreeState, branch?: TechBranch): TechEffect[] {
  const effects: TechEffect[] = [];
  const nodes = branch ? getBranchNodes(branch) : ALL_NODES;
  for (const node of nodes) {
    if (state.researched[node.id]) {
      effects.push(...node.effects);
    }
  }
  return effects;
}

/**
 * Compute aggregated effect value for a given effect type.
 * - `_mult` effects: multiply together (start at defaultValue, typically 1.0)
 * - `_add` effects: sum together (start at 0)
 * - `_pct` effects: take minimum (best threshold)
 */
export function getEffectValue(
  state: TechTreeState,
  effectType: TechEffectType,
  defaultValue: number = effectType.endsWith('_mult') ? 1.0 : 0,
): number {
  const effects = getActiveEffects(state);
  const matching = effects.filter((e) => e.type === effectType);
  if (matching.length === 0) return defaultValue;

  if (effectType.endsWith('_mult')) {
    let result = 1.0;
    for (const e of matching) result *= e.value;
    return result;
  }

  if (effectType.endsWith('_pct')) {
    let best = Infinity;
    for (const e of matching) best = Math.min(best, e.value);
    return best === Infinity ? defaultValue : best;
  }

  // _add, _regen, etc. — sum
  let sum = 0;
  for (const e of matching) sum += e.value;
  return sum;
}

/** Check if any technology is currently available (not yet researched). */
export function hasAvailableTech(playerLevel: number, state: TechTreeState): boolean {
  return ALL_NODES.some(
    (node) => getTechNodeStatus(node, playerLevel, state) === 'available',
  );
}
