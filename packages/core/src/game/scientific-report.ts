import type { StarSystem } from '../types/index.js';
import { SeededRNG } from '../math/rng.js';
import type { Discovery } from './discovery.js';
import { getCatalogEntry } from './cosmic-catalog.js';

// ---------------------------------------------------------------------------
// Scientific Report Generator
// ---------------------------------------------------------------------------
// Generates informal scientific reports in Ukrainian
// Style: scientist reporting to the planet's president in plain language
// ---------------------------------------------------------------------------

/** Scientist names (Ukrainian) for variety */
const SCIENTISTS = [
  'Др. Олена Зоряна',
  'Проф. Ігор Небесний',
  'Др. Марія Космічна',
  'Проф. Андрій Галактичний',
  'Др. Софія Астральна',
  'Проф. Дмитро Квантовий',
  'Др. Анна Орбітальна',
  'Проф. Олександр Фотонний',
];

/** Report opening phrases */
const OPENINGS = [
  'Пане Президенте, маю честь доповісти про надзвичайне відкриття!',
  'Шановний Президенте, наші обсерваторії зафіксували щось вражаюче.',
  'Терміновий звіт! Наша наукова команда виявила унікальний об\'єкт.',
  'Президенте, це відкриття увійде в історію нашої цивілізації!',
  'Доповідаю про результати останнього дослідження — ви будете вражені.',
  'Пане Президенте, прошу вашої уваги. Ми знайшли дещо особливе.',
];

/** Rarity exclamations */
const RARITY_REACTIONS: Record<string, string[]> = {
  common: [
    'Це досить типовий об\'єкт для цієї ділянки космосу, але не менш цікавий.',
    'Ми очікували знайти щось подібне, та все одно це вражає.',
  ],
  uncommon: [
    'Такі об\'єкти зустрічаються рідше — ми маємо чудову нагоду для вивчення.',
    'Не кожен день вдається спостерігати подібне. Наші телескопи добре попрацювали.',
  ],
  rare: [
    'Це рідкісна знахідка! Лише кілька відсотків дослідників мають таку удачу.',
    'Вражаючий рівень рідкості. Наші науковці святкують це відкриття.',
  ],
  epic: [
    'Пане Президенте, це ЕПІЧНЕ відкриття! Такі об\'єкти — справжні перлини Всесвіту.',
    'Я не перебільшую — це одне з найважливіших відкриттів нашої програми!',
  ],
  legendary: [
    'ЛЕГЕНДАРНЕ відкриття! Такого рівня об\'єкти відкривають раз у кілька поколінь!',
    'Пане Президенте, сідайте міцніше. Те, що ми знайшли, переписує наше розуміння Всесвіту!',
  ],
};

/** Closing phrases */
const CLOSINGS = [
  'Рекомендую виділити додаткове фінансування на подальше дослідження.',
  'Наша команда продовжить спостереження. Чекаємо на нові відкриття.',
  'Цей об\'єкт заслуговує на окрему експедицію.',
  'Додаю зображення до архіву. Слава науці!',
  'З повагою до вашого часу та з захопленням від космосу.',
];

/**
 * Generate a scientific report for a discovery.
 *
 * @param discovery  The discovery object.
 * @param system     The star system where it was found.
 * @param seed       Seed for text variation.
 */
export function generateScientificReport(
  discovery: Discovery,
  system: StarSystem,
  seed: number = 0,
): string {
  const rng = new SeededRNG(seed * 41 + system.seed * 3);
  const entry = getCatalogEntry(discovery.type);

  const scientist = SCIENTISTS[rng.nextInt(0, SCIENTISTS.length - 1)];
  const opening = OPENINGS[rng.nextInt(0, OPENINGS.length - 1)];
  const closing = CLOSINGS[rng.nextInt(0, CLOSINGS.length - 1)];

  const rarityReactions = RARITY_REACTIONS[discovery.rarity] ?? RARITY_REACTIONS.common;
  const rarityReaction = rarityReactions[rng.nextInt(0, rarityReactions.length - 1)];

  const lines: string[] = [];

  // Header
  lines.push(`═══ НАУКОВА ДОПОВІДЬ ═══`);
  lines.push(`Від: ${scientist}`);
  lines.push(`Система: ${system.name}`);
  lines.push(`Дата: ${new Date().toLocaleDateString('uk-UA')}`);
  lines.push('');

  // Opening
  lines.push(opening);
  lines.push('');

  // Object description
  if (entry) {
    lines.push(`Ми виявили: ${entry.nameUk} (${entry.nameEn}).`);
    lines.push('');
    lines.push(entry.descriptionUk);
    lines.push('');

    // Rarity reaction
    lines.push(rarityReaction);
    lines.push('');

    // Scientific facts (pick 1-2)
    if (entry.scientificFacts.length > 0) {
      lines.push('Ось що відомо науці про подібні об\'єкти:');
      const factCount = Math.min(entry.scientificFacts.length, rng.nextInt(1, 2));
      const shuffled = [...entry.scientificFacts].sort(() => rng.next() - 0.5);
      for (let i = 0; i < factCount; i++) {
        lines.push(`• ${shuffled[i]}`);
      }
      lines.push('');
    }
  } else {
    lines.push(`Ми виявили невідомий космічний об\'єкт типу "${discovery.type}".`);
    lines.push('Наші вчені поки не можуть його класифікувати — можливо, це абсолютно нове відкриття!');
    lines.push('');
  }

  // System context
  lines.push(`Об\'єкт знаходиться в системі ${system.name}, зірка класу ${system.star.spectralClass}${system.star.subType}V з температурою ${system.star.temperatureK} К.`);

  if (system.planets.length > 0) {
    lines.push(`У системі відомо ${system.planets.length} ${pluralizePlanets(system.planets.length)}.`);
  }

  lines.push('');

  // Closing
  lines.push(closing);
  lines.push('');
  lines.push(`— ${scientist}`);

  return lines.join('\n');
}

function pluralizePlanets(n: number): string {
  if (n === 1) return 'планета';
  if (n >= 2 && n <= 4) return 'планети';
  return 'планет';
}
