import type { StarSystem } from '../types/index.js';
import { SeededRNG } from '../math/rng.js';
import type { Discovery } from './discovery.js';
import { getCatalogEntry, getCatalogName, getCatalogDescription } from './cosmic-catalog.js';

// ---------------------------------------------------------------------------
// Scientific Report Generator
// ---------------------------------------------------------------------------
// Generates informal scientific reports in Ukrainian or English.
// Style: scientist reporting to the planet's president in plain language.
// ---------------------------------------------------------------------------

/** Scientist names — Ukrainian */
const SCIENTISTS_UK = [
  'Др. Олена Зоряна',
  'Проф. Ігор Небесний',
  'Др. Марія Космічна',
  'Проф. Андрій Галактичний',
  'Др. Софія Астральна',
  'Проф. Дмитро Квантовий',
  'Др. Анна Орбітальна',
  'Проф. Олександр Фотонний',
];

/** Scientist names — English */
const SCIENTISTS_EN = [
  'Dr. Elena Starova',
  'Prof. Igor Nebeski',
  'Dr. Maria Cosmic',
  'Prof. Andrew Galactic',
  'Dr. Sophia Astral',
  'Prof. Dmitro Quantum',
  'Dr. Anna Orbital',
  'Prof. Alex Photon',
];

/** Report opening phrases — Ukrainian */
const OPENINGS_UK = [
  'Пане Президенте, маю честь доповісти про надзвичайне відкриття!',
  'Шановний Президенте, наші обсерваторії зафіксували щось вражаюче.',
  'Терміновий звіт! Наша наукова команда виявила унікальний об\'єкт.',
  'Президенте, це відкриття увійде в історію нашої цивілізації!',
  'Доповідаю про результати останнього дослідження — ви будете вражені.',
  'Пане Президенте, прошу вашої уваги. Ми знайшли дещо особливе.',
];

/** Report opening phrases — English */
const OPENINGS_EN = [
  'Mr. President, I have the honour to report an extraordinary discovery!',
  'Dear President, our observatories have detected something remarkable.',
  'Urgent report! Our science team has identified a unique object.',
  'President, this discovery will go down in the history of our civilisation!',
  'Reporting the results of our latest research — you will be impressed.',
  'Mr. President, may I have your attention. We have found something special.',
];

/** Rarity exclamations — Ukrainian */
const RARITY_REACTIONS_UK: Record<string, string[]> = {
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

/** Rarity exclamations — English */
const RARITY_REACTIONS_EN: Record<string, string[]> = {
  common: [
    'This is a fairly typical object for this region of space, but no less interesting.',
    'We expected to find something like this, yet it is still impressive.',
  ],
  uncommon: [
    'Objects like this are seen less often — we have an excellent opportunity for study.',
    'Not every day do we observe something like this. Our telescopes have done well.',
  ],
  rare: [
    'This is a rare find! Only a few percent of researchers are this fortunate.',
    'An impressive rarity level. Our scientists are celebrating this discovery.',
  ],
  epic: [
    'Mr. President, this is an EPIC discovery! Objects like this are true gems of the Universe.',
    'I am not exaggerating — this is one of the most important finds of our programme!',
  ],
  legendary: [
    'A LEGENDARY discovery! Objects of this calibre are found once in several generations!',
    'Mr. President, brace yourself. What we have found rewrites our understanding of the Universe!',
  ],
};

/** Closing phrases — Ukrainian */
const CLOSINGS_UK = [
  'Рекомендую виділити додаткове фінансування на подальше дослідження.',
  'Наша команда продовжить спостереження. Чекаємо на нові відкриття.',
  'Цей об\'єкт заслуговує на окрему експедицію.',
  'Додаю зображення до архіву. Слава науці!',
  'З повагою до вашого часу та з захопленням від космосу.',
];

/** Closing phrases — English */
const CLOSINGS_EN = [
  'I recommend allocating additional funding for further research.',
  'Our team will continue observations. We look forward to new discoveries.',
  'This object deserves a dedicated expedition.',
  'Adding image to the archive. Long live science!',
  'With respect for your time and fascination with the cosmos.',
];

/**
 * Generate a scientific report for a discovery.
 *
 * @param discovery  The discovery object.
 * @param system     The star system where it was found.
 * @param seed       Seed for text variation.
 * @param lang       Language code — 'en' or anything else (defaults to Ukrainian).
 */
export function generateScientificReport(
  discovery: Discovery,
  system: StarSystem,
  seed: number = 0,
  lang: string = 'uk',
): string {
  const isEn = lang === 'en';
  const rng = new SeededRNG(seed * 41 + system.seed * 3);
  const entry = getCatalogEntry(discovery.type);

  const scientists = isEn ? SCIENTISTS_EN : SCIENTISTS_UK;
  const openings   = isEn ? OPENINGS_EN   : OPENINGS_UK;
  const closings   = isEn ? CLOSINGS_EN   : CLOSINGS_UK;
  const rarityReactionsMap = isEn ? RARITY_REACTIONS_EN : RARITY_REACTIONS_UK;

  const scientist    = scientists[rng.nextInt(0, scientists.length - 1)];
  const opening      = openings[rng.nextInt(0, openings.length - 1)];
  const closing      = closings[rng.nextInt(0, closings.length - 1)];
  const rarityReactions = rarityReactionsMap[discovery.rarity] ?? rarityReactionsMap.common;
  const rarityReaction  = rarityReactions[rng.nextInt(0, rarityReactions.length - 1)];

  const lines: string[] = [];

  if (isEn) {
    // Header — English
    lines.push('=== SCIENTIFIC REPORT ===');
    lines.push(`From: ${scientist}`);
    lines.push(`System: ${system.name}`);
    lines.push(`Date: ${new Date().toLocaleDateString('en-GB')}`);
    lines.push('');

    lines.push(opening);
    lines.push('');

    if (entry) {
      const name = getCatalogName(entry, 'en');
      const desc = getCatalogDescription(entry, 'en');
      lines.push(`We have detected: ${name}.`);
      lines.push('');
      lines.push(desc);
      lines.push('');

      lines.push(rarityReaction);
      lines.push('');

      const enFacts = entry.scientificFactsEn;
      if (enFacts && enFacts.length > 0) {
        lines.push('Here is what science knows about such objects:');
        const factCount = Math.min(enFacts.length, rng.nextInt(1, 2));
        const shuffled = [...enFacts].sort(() => rng.next() - 0.5);
        for (let i = 0; i < factCount; i++) {
          lines.push(`- ${shuffled[i]}`);
        }
        lines.push('');
      }
    } else {
      lines.push(`We have detected an unknown cosmic object of type "${discovery.type}".`);
      lines.push('Our scientists cannot classify it yet — this may be an entirely new discovery!');
      lines.push('');
    }

    lines.push(`The object is located in system ${system.name}, star class ${system.star.spectralClass}${system.star.subType}V at temperature ${system.star.temperatureK} K.`);

    if (system.planets.length > 0) {
      lines.push(`${system.planets.length} ${system.planets.length === 1 ? 'planet' : 'planets'} are known in this system.`);
    }

    lines.push('');
    lines.push(closing);
    lines.push('');
    lines.push(`— ${scientist}`);
  } else {
    // Header — Ukrainian
    lines.push('═══ НАУКОВА ДОПОВІДЬ ═══');
    lines.push(`Від: ${scientist}`);
    lines.push(`Система: ${system.name}`);
    lines.push(`Дата: ${new Date().toLocaleDateString('uk-UA')}`);
    lines.push('');

    lines.push(opening);
    lines.push('');

    if (entry) {
      const nameUk = getCatalogName(entry, 'uk');
      const nameEn = entry.nameEn;
      const desc   = getCatalogDescription(entry, 'uk');
      lines.push(`Ми виявили: ${nameUk} (${nameEn}).`);
      lines.push('');
      lines.push(desc);
      lines.push('');

      lines.push(rarityReaction);
      lines.push('');

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

    lines.push(`Об\'єкт знаходиться в системі ${system.name}, зірка класу ${system.star.spectralClass}${system.star.subType}V з температурою ${system.star.temperatureK} К.`);

    if (system.planets.length > 0) {
      lines.push(`У системі відомо ${system.planets.length} ${pluralizePlanets(system.planets.length)}.`);
    }

    lines.push('');
    lines.push(closing);
    lines.push('');
    lines.push(`— ${scientist}`);
  }

  return lines.join('\n');
}

function pluralizePlanets(n: number): string {
  if (n === 1) return 'планета';
  if (n >= 2 && n <= 4) return 'планети';
  return 'планет';
}
