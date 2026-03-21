// ---------------------------------------------------------------------------
// Technology Research Tree — types, Astronomy branch nodes, helpers
// ---------------------------------------------------------------------------

// ── Types ──────────────────────────────────────────────────────────────────

export type TechBranch = 'astronomy' | 'physics' | 'chemistry' | 'biology';

export type TechNodeStatus = 'locked' | 'available' | 'researched';

export type TechEffectType =
  // Astronomy (existing)
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
  | 'concurrent_research_add'
  // Physics
  | 'energy_output_mult'
  | 'energy_consumption_mult'
  | 'mining_yield_mult'
  | 'ship_speed_mult'
  | 'ship_capacity_add'
  | 'building_unlock'
  // Chemistry
  | 'harvest_yield_mult'
  | 'refining_speed_mult'
  | 'element_conversion_efficiency'
  | 'rare_element_chance_mult'
  | 'storage_capacity_mult'
  // Biology
  | 'food_output_mult'
  | 'population_capacity_add'
  | 'habitability_bonus_add'
  | 'regrowth_speed_mult'
  | 'terraforming_speed_mult'
  | 'drone_production_unlock'
  | 'ship_production_unlock';

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
    levelRequired: 2,
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

// ── Physics branch: 12 nodes (Levels 4–50) ──────────────────────────────

export const PHYSICS_NODES: TechNode[] = [
  // Epoch 1
  {
    id: 'phy-capacitor', branch: 'physics',
    name: 'Ємнісні конденсатори',
    description: 'Розблоковує Акумуляторну станцію.',
    levelRequired: 4, prerequisiteId: null, epoch: 1, xpReward: 20,
    effects: [{ type: 'building_unlock', value: 1 }],
    iconSymbol: '\u2301', // ⌁
  },
  {
    id: 'phy-aero', branch: 'physics',
    name: 'Аеродинаміка',
    description: 'Розблоковує Вітрогенератор. +10% виробн енергії.',
    levelRequired: 7, prerequisiteId: 'phy-capacitor', epoch: 1, xpReward: 25,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'energy_output_mult', value: 1.1 },
    ],
    iconSymbol: '\u2206', // ∆
  },
  {
    id: 'phy-thermo-1', branch: 'physics',
    name: 'Термодинаміка I',
    description: 'Розблоковує Термогенератор. +15% виробн енергії.',
    levelRequired: 10, prerequisiteId: 'phy-aero', epoch: 1, xpReward: 30,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'energy_output_mult', value: 1.15 },
    ],
    iconSymbol: '\u2668', // ♨
  },
  {
    id: 'phy-em-field', branch: 'physics',
    name: 'Електромагнітне поле',
    description: 'Розблоковує Радарну вежу. +1 дальність сканування.',
    levelRequired: 14, prerequisiteId: 'phy-thermo-1', epoch: 1, xpReward: 35,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'scan_range_add', value: 1 },
    ],
    iconSymbol: '\u2622', // ☢
  },
  // Epoch 2
  {
    id: 'phy-thrust-1', branch: 'physics',
    name: 'Тяга I',
    description: 'Розблоковує Посадковий майданчик. Виробництво кораблів.',
    levelRequired: 18, prerequisiteId: 'phy-em-field', epoch: 2, xpReward: 40,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'ship_production_unlock', value: 1 },
    ],
    iconSymbol: '\u2191', // ↑
  },
  {
    id: 'phy-drill', branch: 'physics',
    name: 'Глибинне буріння',
    description: 'Розблоковує Глибинний бур. +20% видобуток.',
    levelRequired: 20, prerequisiteId: 'phy-thrust-1', epoch: 2, xpReward: 45,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'mining_yield_mult', value: 1.2 },
    ],
    iconSymbol: '\u2692', // ⚒
  },
  {
    id: 'phy-orbital-mech', branch: 'physics',
    name: 'Орбітальна механіка',
    description: 'Розблоковує Космопорт. +15% швидкість кораблів.',
    levelRequired: 25, prerequisiteId: 'phy-drill', epoch: 2, xpReward: 50,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'ship_speed_mult', value: 1.15 },
    ],
    iconSymbol: '\u2604', // ☄
  },
  {
    id: 'phy-reactor-eff', branch: 'physics',
    name: 'Ефективність реакторів',
    description: '-15% споживання енергії будівлями.',
    levelRequired: 30, prerequisiteId: 'phy-orbital-mech', epoch: 2, xpReward: 55,
    effects: [{ type: 'energy_consumption_mult', value: 0.85 }],
    iconSymbol: '\u269B', // ⚛
  },
  // Epoch 3
  {
    id: 'phy-quantum', branch: 'physics',
    name: 'Квантова фізика',
    description: 'Розблоковує Квантовий комп\'ютер. -20% час досліджень.',
    levelRequired: 38, prerequisiteId: 'phy-reactor-eff', epoch: 3, xpReward: 70,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'research_speed_mult', value: 0.8 },
    ],
    iconSymbol: '\u03C8', // ψ
  },
  {
    id: 'phy-fusion', branch: 'physics',
    name: 'Термоядерний синтез',
    description: 'Розблоковує Синтезатор плазми. +25% виробн енергії.',
    levelRequired: 42, prerequisiteId: 'phy-quantum', epoch: 3, xpReward: 80,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'energy_output_mult', value: 1.25 },
    ],
    iconSymbol: '\u2622', // ☢
  },
  {
    id: 'phy-warp-theory', branch: 'physics',
    name: 'Теорія викривлення',
    description: '+50% швидкість кораблів, +500 вантажу.',
    levelRequired: 46, prerequisiteId: 'phy-fusion', epoch: 3, xpReward: 90,
    effects: [
      { type: 'ship_speed_mult', value: 1.5 },
      { type: 'ship_capacity_add', value: 500 },
    ],
    iconSymbol: '\u221E', // ∞
  },
  {
    id: 'phy-megastructure', branch: 'physics',
    name: 'Мегаструктури',
    description: 'Сховище x2. Розблоковує мегабудівлі.',
    levelRequired: 50, prerequisiteId: 'phy-warp-theory', epoch: 3, xpReward: 150,
    effects: [{ type: 'storage_capacity_mult', value: 2.0 }],
    iconSymbol: '\u2394', // ⎔
  },
];

// ── Chemistry branch: 12 nodes (Levels 3–48) ────────────────────────────

export const CHEMISTRY_NODES: TechNode[] = [
  // Epoch 1
  {
    id: 'chem-basic-refine', branch: 'chemistry',
    name: 'Базова переробка',
    description: '+15% вихід збору ресурсів.',
    levelRequired: 3, prerequisiteId: null, epoch: 1, xpReward: 20,
    effects: [{ type: 'harvest_yield_mult', value: 1.15 }],
    iconSymbol: '\u2697', // ⚗
  },
  {
    id: 'chem-gas-sep', branch: 'chemistry',
    name: 'Газорозподіл',
    description: 'Розблоковує Атмосферний конденсатор.',
    levelRequired: 8, prerequisiteId: 'chem-basic-refine', epoch: 1, xpReward: 25,
    effects: [{ type: 'building_unlock', value: 1 }],
    iconSymbol: '\u2601', // ☁
  },
  {
    id: 'chem-alloys', branch: 'chemistry',
    name: 'Сплави',
    description: '+15% видобуток мінералів. +20% ємність сховища.',
    levelRequired: 11, prerequisiteId: 'chem-gas-sep', epoch: 1, xpReward: 30,
    effects: [
      { type: 'mining_yield_mult', value: 1.15 },
      { type: 'storage_capacity_mult', value: 1.2 },
    ],
    iconSymbol: '\u2692', // ⚒
  },
  {
    id: 'chem-rare-detect', branch: 'chemistry',
    name: 'Детектор рідкісних елементів',
    description: '+50% шанс рідкісних елементів при бурінні.',
    levelRequired: 15, prerequisiteId: 'chem-alloys', epoch: 1, xpReward: 35,
    effects: [{ type: 'rare_element_chance_mult', value: 1.5 }],
    iconSymbol: '\u2605', // ★
  },
  // Epoch 2
  {
    id: 'chem-q-sep', branch: 'chemistry',
    name: 'Квантовий сепаратор',
    description: 'Розблоковує Квантовий сепаратор. +20% конверсія елементів.',
    levelRequired: 22, prerequisiteId: 'chem-rare-detect', epoch: 2, xpReward: 45,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'element_conversion_efficiency', value: 1.2 },
    ],
    iconSymbol: '\u2234', // ∴
  },
  {
    id: 'chem-fraction', branch: 'chemistry',
    name: 'Фракціонування',
    description: 'Розблоковує Газовий фракціонатор. +30% швидкість переробки.',
    levelRequired: 26, prerequisiteId: 'chem-q-sep', epoch: 2, xpReward: 50,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'refining_speed_mult', value: 1.3 },
    ],
    iconSymbol: '\u2248', // ≈
  },
  {
    id: 'chem-orbital', branch: 'chemistry',
    name: 'Орбітальний збір',
    description: 'Розблоковує Орбітальний збирач для газових гігантів.',
    levelRequired: 30, prerequisiteId: 'chem-fraction', epoch: 2, xpReward: 55,
    effects: [{ type: 'building_unlock', value: 1 }],
    iconSymbol: '\u2299', // ⊙
  },
  {
    id: 'chem-catalysis', branch: 'chemistry',
    name: 'Каталізатори',
    description: '+25% швидкість переробки. +15% конверсія.',
    levelRequired: 34, prerequisiteId: 'chem-orbital', epoch: 2, xpReward: 60,
    effects: [
      { type: 'refining_speed_mult', value: 1.25 },
      { type: 'element_conversion_efficiency', value: 1.15 },
    ],
    iconSymbol: '\u2694', // ⚔
  },
  // Epoch 3
  {
    id: 'chem-isotope', branch: 'chemistry',
    name: 'Ізотопна хімія',
    description: 'Розблоковує Ізотопну центрифугу. +20% вихід ізотопів.',
    levelRequired: 36, prerequisiteId: 'chem-catalysis', epoch: 3, xpReward: 70,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'harvest_yield_mult', value: 1.2 },
    ],
    iconSymbol: '\u2623', // ☣
  },
  {
    id: 'chem-antimatter', branch: 'chemistry',
    name: 'Антиматерія',
    description: '+30% виробн енергії. +20% швидкість кораблів.',
    levelRequired: 40, prerequisiteId: 'chem-isotope', epoch: 3, xpReward: 80,
    effects: [
      { type: 'energy_output_mult', value: 1.3 },
      { type: 'ship_speed_mult', value: 1.2 },
    ],
    iconSymbol: '\u2627', // ☧
  },
  {
    id: 'chem-nanotech', branch: 'chemistry',
    name: 'Нанотехнології',
    description: '+50% переробка. +30% видобуток.',
    levelRequired: 44, prerequisiteId: 'chem-antimatter', epoch: 3, xpReward: 90,
    effects: [
      { type: 'refining_speed_mult', value: 1.5 },
      { type: 'mining_yield_mult', value: 1.3 },
    ],
    iconSymbol: '\u2318', // ⌘
  },
  {
    id: 'chem-transmute', branch: 'chemistry',
    name: 'Трансмутація',
    description: '+50% конверсія елементів. Міжелементне перетворення.',
    levelRequired: 48, prerequisiteId: 'chem-nanotech', epoch: 3, xpReward: 120,
    effects: [{ type: 'element_conversion_efficiency', value: 1.5 }],
    iconSymbol: '\u2640', // ♀
  },
];

// ── Biology branch: 12 nodes (Levels 3–48) ──────────────────────────────

export const BIOLOGY_NODES: TechNode[] = [
  // Epoch 1
  {
    id: 'bio-botany', branch: 'biology',
    name: 'Ботаніка',
    description: '+15% вихід їжі. +20% швидкість відновлення ресурсів.',
    levelRequired: 3, prerequisiteId: null, epoch: 1, xpReward: 20,
    effects: [
      { type: 'food_output_mult', value: 1.15 },
      { type: 'regrowth_speed_mult', value: 1.2 },
    ],
    iconSymbol: '\u2698', // ⚘
  },
  {
    id: 'bio-microbiology', branch: 'biology',
    name: 'Мікробіологія',
    description: '+30% відновлення ресурсів. +10% біологічні відкриття.',
    levelRequired: 7, prerequisiteId: 'bio-botany', epoch: 1, xpReward: 25,
    effects: [
      { type: 'regrowth_speed_mult', value: 1.3 },
      { type: 'discovery_chance_mult', value: 1.1 },
    ],
    iconSymbol: '\u2609', // ☉
  },
  {
    id: 'bio-hydroponics', branch: 'biology',
    name: 'Гідропоніка',
    description: '+25% вихід їжі з теплиць.',
    levelRequired: 11, prerequisiteId: 'bio-microbiology', epoch: 1, xpReward: 30,
    effects: [{ type: 'food_output_mult', value: 1.25 }],
    iconSymbol: '\u2616', // ☖
  },
  {
    id: 'bio-life-support', branch: 'biology',
    name: 'Системи життєзабезпечення',
    description: 'Розблоковує Житловий купол. +200 населення.',
    levelRequired: 15, prerequisiteId: 'bio-hydroponics', epoch: 1, xpReward: 35,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'population_capacity_add', value: 200 },
    ],
    iconSymbol: '\u2695', // ⚕
  },
  // Epoch 2
  {
    id: 'bio-ecology', branch: 'biology',
    name: 'Екологія',
    description: '+0.05 придатність для життя. +20% відновлення.',
    levelRequired: 19, prerequisiteId: 'bio-life-support', epoch: 2, xpReward: 45,
    effects: [
      { type: 'habitability_bonus_add', value: 0.05 },
      { type: 'regrowth_speed_mult', value: 1.2 },
    ],
    iconSymbol: '\u2618', // ☘
  },
  {
    id: 'bio-terraforming', branch: 'biology',
    name: 'Терраформування',
    description: 'Розблоковує Атмосферний щит. +50% терраформування.',
    levelRequired: 25, prerequisiteId: 'bio-ecology', epoch: 2, xpReward: 50,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'terraforming_speed_mult', value: 1.5 },
    ],
    iconSymbol: '\u2600', // ☀
  },
  {
    id: 'bio-genetics', branch: 'biology',
    name: 'Генетика',
    description: '+30% вихід їжі. +300 населення.',
    levelRequired: 29, prerequisiteId: 'bio-terraforming', epoch: 2, xpReward: 55,
    effects: [
      { type: 'food_output_mult', value: 1.3 },
      { type: 'population_capacity_add', value: 300 },
    ],
    iconSymbol: '\u2624', // ☤
  },
  {
    id: 'bio-biome-eng', branch: 'biology',
    name: 'Біосферна інженерія',
    description: 'Розблоковує Біосферний купол. +0.05 придатність.',
    levelRequired: 32, prerequisiteId: 'bio-genetics', epoch: 2, xpReward: 60,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'habitability_bonus_add', value: 0.05 },
    ],
    iconSymbol: '\u2698', // ⚘
  },
  // Epoch 3
  {
    id: 'bio-synth-life', branch: 'biology',
    name: 'Синтетичне життя',
    description: 'Розблоковує виробництво дронів. +20% їжа.',
    levelRequired: 37, prerequisiteId: 'bio-biome-eng', epoch: 3, xpReward: 70,
    effects: [
      { type: 'drone_production_unlock', value: 1 },
      { type: 'food_output_mult', value: 1.2 },
    ],
    iconSymbol: '\u2699', // ⚙
  },
  {
    id: 'bio-neural-net', branch: 'biology',
    name: 'Нейромережі',
    description: '-20% час досліджень. +500 населення.',
    levelRequired: 41, prerequisiteId: 'bio-synth-life', epoch: 3, xpReward: 80,
    effects: [
      { type: 'research_speed_mult', value: 0.8 },
      { type: 'population_capacity_add', value: 500 },
    ],
    iconSymbol: '\u2103', // ℃
  },
  {
    id: 'bio-evolution', branch: 'biology',
    name: 'Керована еволюція',
    description: 'Терраформування x2. +0.1 придатність.',
    levelRequired: 45, prerequisiteId: 'bio-neural-net', epoch: 3, xpReward: 90,
    effects: [
      { type: 'terraforming_speed_mult', value: 2.0 },
      { type: 'habitability_bonus_add', value: 0.1 },
    ],
    iconSymbol: '\u2207', // ∇
  },
  {
    id: 'bio-genesis', branch: 'biology',
    name: 'Ковчег Генезису',
    description: 'Розблоковує Ковчег Генезису. +0.15 придатність.',
    levelRequired: 48, prerequisiteId: 'bio-evolution', epoch: 3, xpReward: 120,
    effects: [
      { type: 'building_unlock', value: 1 },
      { type: 'habitability_bonus_add', value: 0.15 },
    ],
    iconSymbol: '\u2741', // ❁
  },
];

// All nodes across all 4 branches
export const ALL_NODES: TechNode[] = [
  ...ASTRONOMY_NODES,
  ...PHYSICS_NODES,
  ...CHEMISTRY_NODES,
  ...BIOLOGY_NODES,
];

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
