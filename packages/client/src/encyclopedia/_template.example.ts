// REFERENCE TEMPLATE — do NOT import this file at runtime.
// Real lessons live in `content/{section}/{slug}.{lang}.ts`.
//
// This shows the exact shape an authored lesson must follow. Sonnet content
// agents use this as the structural pattern.

import type { Lesson } from './types.js';

const lesson: Lesson = {
  slug: 'example-topic',
  language: 'uk',
  section: 'astrophysics',
  order: 99,
  difficulty: 'beginner',
  readingTimeMin: 12,
  title: 'Назва уроку',
  subtitle: 'Однорядкова інтрига — про що це і чому варто прочитати.',

  hero: {
    cacheKey: 'example-topic-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: [describe scene]. ' +
      'Wide aspect ratio, dark space background, scientific accuracy, ' +
      'no text in image (text added separately).',
    alt: 'Опис що зображено — для accessibility',
    caption: 'Підпис під зображенням з джерелом / контекстом.',
    aspectRatio: '16:9',
  },

  body: [
    {
      // Перший блок без heading — це лід-параграф (з drop cap у рендері)
      paragraphs: [
        'Перший абзац — лід. Тут гачок: контр-інтуїтивний факт або яскравий образ. ' +
        'Адресуємось до дорослої цікавої людини. Без снобізму, без емодзі. ' +
        'Можна **виділяти жирним** ключові терміни і _виділяти курсивом_ концепти.',

        'Другий абзац лід — стисло про що буде урок і чому це важливо.',
      ],
    },

    {
      heading: 'Перша основна секція',
      level: 2,
      paragraphs: [
        'Розгортаємо тему. Кожен абзац — одна думка. ' +
        'Числа і дати з посиланням на джерело (сорс додаємо в кінці).',

        'Зв\'язки з повсякденним досвідом. Аналогії що працюють.',
      ],
    },

    {
      // Блок з ілюстрацією від Gemini
      image: {
        cacheKey: 'example-topic-diagram-1',
        prompt:
          'Schematic illustration of [концепт]. Annotated diagram with labels. ' +
          'Add the following text labels on the image: "label A", "label B", "величина". ' +
          'Hard sci-fi style, monospace font for labels, dark background, ' +
          'orange/cyan accent colors.',
        alt: 'Що саме на схемі — текст для accessibility',
        caption: 'Один рядок підпису з поясненням контексту.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Підсекція',
      level: 3,
      paragraphs: [
        'Глибше занурення в окрему деталь головної секції.',
      ],
    },

    {
      // Hand-crafted SVG diagram (для схем що AI не може намалювати точно)
      diagram: {
        title: 'Схема: Назва',
        svg: `<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="300" fill="rgba(10,15,25,0.5)"/>
  <circle cx="300" cy="150" r="60" fill="none" stroke="#cc4444" stroke-width="2"/>
  <text x="300" y="155" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="12">центр</text>
</svg>`,
        caption: 'Опис того що на схемі.',
      },
    },

    {
      heading: 'Друга основна секція',
      level: 2,
      paragraphs: ['...'],
    },
  ],

  glossary: [
    {
      term: 'Перший термін',
      definition: 'Лаконічне визначення в одному реченні. Без жаргону.',
    },
    {
      term: 'Другий термін',
      definition: '...',
    },
    // 5-8 термінів оптимально
  ],

  quiz: [
    {
      question: 'Питання з варіантами відповідей.',
      options: [
        'Варіант A',
        'Варіант B (правильний)',
        'Варіант C',
        'Варіант D',
      ],
      correctIndex: 1,
      explanation: 'Чому ця відповідь правильна (показується після відповіді).',
    },
    // 3-5 питань
  ],

  sources: [
    {
      title: 'Назва статті / папера',
      url: 'https://arxiv.org/abs/...',
      meta: 'Журнал, рік, відкритий доступ',
    },
    {
      title: 'NASA / ESA сторінка про X',
      url: 'https://www.nasa.gov/...',
      meta: 'офіційний прес-реліз',
    },
    // 5-10 першоджерел
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
