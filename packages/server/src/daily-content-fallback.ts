// Curated, hand-authored fallback content for the ASTRA daily quiz + daily
// fun-fact broadcasts. Used ONLY when Gemini keeps producing content that
// collides with recent history after the retry budget is exhausted — a
// deterministic safety net so the cron never fails outright and never has
// to fall back to an unbounded retry loop against the live API.
//
// Selection is deterministic (see pickNonDuplicateFallback in
// @nebulife/core) — rotates by date, never Math.random.

export interface QuizFallbackEntry {
  id: string;
  uk: { question: string; options: string[]; correctIndex: number; explanation: string };
  en: { question: string; options: string[]; correctIndex: number; explanation: string };
}

export interface FactFallbackEntry {
  id: string;
  uk: string;
  en: string;
}

export const QUIZ_FALLBACK_POOL: QuizFallbackEntry[] = [
  {
    id: 'fallback-quiz-proxima',
    uk: {
      question: 'Яка зоря є найближчою до Сонця?',
      options: ['Альфа Центаврі A', 'Проксима Центаврі', 'Сіріус', 'Барнарда'],
      correctIndex: 1,
      explanation: 'Проксима Центаврі — червоний карлик на відстані 4.24 світлового року, найближча зоря до Сонця.',
    },
    en: {
      question: 'Which star is closest to the Sun?',
      options: ['Alpha Centauri A', 'Proxima Centauri', 'Sirius', "Barnard's Star"],
      correctIndex: 1,
      explanation: 'Proxima Centauri is a red dwarf 4.24 light-years away — the closest star to the Sun.',
    },
  },
  {
    id: 'fallback-quiz-jupiter-moons',
    uk: {
      question: 'Скільки підтверджених супутників має Юпітер?',
      options: ['12', '45', 'Понад 90', '250'],
      correctIndex: 2,
      explanation: 'Станом на останні каталоги у Юпітера підтверджено понад 90 супутників.',
    },
    en: {
      question: 'How many confirmed moons does Jupiter have?',
      options: ['12', '45', 'Over 90', '250'],
      correctIndex: 2,
      explanation: 'Recent catalogs confirm Jupiter has over 90 known moons.',
    },
  },
  {
    id: 'fallback-quiz-lightspeed',
    uk: {
      question: 'Скільки часу світло долає відстань від Сонця до Землі?',
      options: ['8 секунд', '8 хвилин', '8 годин', '8 днів'],
      correctIndex: 1,
      explanation: 'Світло долає ~150 млн км за приблизно 8 хвилин 20 секунд.',
    },
    en: {
      question: 'How long does light take to travel from the Sun to Earth?',
      options: ['8 seconds', '8 minutes', '8 hours', '8 days'],
      correctIndex: 1,
      explanation: 'Light covers ~150 million km in roughly 8 minutes 20 seconds.',
    },
  },
  {
    id: 'fallback-quiz-neutron-density',
    uk: {
      question: 'Що робить нейтронні зорі надзвичайно щільними?',
      options: [
        'Товстий шар льоду',
        'Гравітаційний колапс ядра після наднової',
        'Швидке обертання',
        'Магнітне поле',
      ],
      correctIndex: 1,
      explanation: 'Ядро масивної зорі колапсує під власною гравітацією після спалаху наднової, стискаючи речовину до неймовірної щільності.',
    },
    en: {
      question: 'What makes neutron stars so extremely dense?',
      options: [
        'A thick layer of ice',
        'Gravitational collapse of the core after a supernova',
        'Fast rotation',
        'Magnetic fields',
      ],
      correctIndex: 1,
      explanation: 'A massive star\'s core collapses under its own gravity after a supernova, compressing matter to incredible density.',
    },
  },
  {
    id: 'fallback-quiz-saturn-density',
    uk: {
      question: 'Що особливе у середній густині Сатурна порівняно з водою?',
      options: [
        'Вона вища за густину води',
        'Вона нижча за густину води — Сатурн би плавав',
        'Вона дорівнює густині води',
        'Сатурн не має середньої густини',
      ],
      correctIndex: 1,
      explanation: 'Середня густина Сатурна близько 0.69 г/см³ — нижча за густину води, тож гіпотетично він би плавав у гігантській ванні.',
    },
    en: {
      question: "What is unusual about Saturn's average density compared to water?",
      options: [
        "It's higher than water",
        "It's lower than water — Saturn would float",
        "It's equal to water",
        'Saturn has no average density',
      ],
      correctIndex: 1,
      explanation: "Saturn's average density is about 0.69 g/cm³ — lower than water, so it would hypothetically float in a giant bathtub.",
    },
  },
  {
    id: 'fallback-quiz-mars-color',
    uk: {
      question: 'Чому Марс має червонуватий колір?',
      options: [
        'Через відбите світло Сонця',
        'Через оксид заліза (ржа) у ґрунті',
        'Через щільну атмосферу',
        'Через вулканічний попіл',
      ],
      correctIndex: 1,
      explanation: 'Поверхня Марса багата на оксид заліза — по суті, "ржу" — що надає планеті характерний червонуватий відтінок.',
    },
    en: {
      question: 'Why does Mars appear reddish?',
      options: [
        'Reflected sunlight',
        'Iron oxide ("rust") in its soil',
        'A dense atmosphere',
        'Volcanic ash',
      ],
      correctIndex: 1,
      explanation: "Mars's surface is rich in iron oxide — essentially rust — which gives the planet its reddish hue.",
    },
  },
  {
    id: 'fallback-quiz-milkyway-collision',
    uk: {
      question: 'З якою галактикою зіткнеться Чумацький Шлях у майбутньому?',
      options: ['Туманність Андромеди', 'Магелланова Хмара', 'Трикутник', 'Сомбреро'],
      correctIndex: 0,
      explanation: 'Приблизно через 4.5 мільярда років Чумацький Шлях і галактика Андромеди мають злитися.',
    },
    en: {
      question: 'Which galaxy will the Milky Way collide with in the future?',
      options: ['Andromeda Galaxy', 'Magellanic Cloud', 'Triangulum', 'Sombrero Galaxy'],
      correctIndex: 0,
      explanation: 'In roughly 4.5 billion years, the Milky Way and Andromeda galaxy are expected to merge.',
    },
  },
  {
    id: 'fallback-quiz-venus-day',
    uk: {
      question: 'Як довго триває один день на Венері (одне обертання навколо осі)?',
      options: ['24 години', '~117 земних днів', '~243 земні дні', '1 земний рік'],
      correctIndex: 2,
      explanation: 'Венера обертається навколо своєї осі надзвичайно повільно — один оберт триває близько 243 земних днів.',
    },
    en: {
      question: 'How long is one day on Venus (one rotation on its axis)?',
      options: ['24 hours', '~117 Earth days', '~243 Earth days', '1 Earth year'],
      correctIndex: 2,
      explanation: "Venus rotates extremely slowly — a single rotation takes about 243 Earth days.",
    },
  },
];

export const FACT_FALLBACK_POOL: FactFallbackEntry[] = [
  {
    id: 'fallback-fact-neutron-teaspoon',
    uk: 'Командоре, а ви знали, що чайна ложка речовини нейтронної зорі важила б на Землі близько мільярда тонн?',
    en: 'Commander, did you know that a teaspoon of neutron-star material would weigh about a billion tons on Earth?',
  },
  {
    id: 'fallback-fact-titan-lakes',
    uk: 'Командоре, а ви знали, що на Титані, супутнику Сатурна, є озера з рідкого метану та етану?',
    en: "Commander, did you know that Saturn's moon Titan has lakes of liquid methane and ethane?",
  },
  {
    id: 'fallback-fact-uranus-tilt',
    uk: 'Командоре, а ви знали, що Уран обертається "лежачи на боці" — його вісь нахилена приблизно на 98 градусів?',
    en: "Commander, did you know that Uranus spins almost on its side — its axis is tilted about 98 degrees?",
  },
  {
    id: 'fallback-fact-oort-cloud',
    uk: 'Командоре, а ви знали, що хмара Оорта може простягатися на відстань до двох світлових років від Сонця?',
    en: 'Commander, did you know that the Oort Cloud may extend up to two light-years from the Sun?',
  },
  {
    id: 'fallback-fact-europa-ocean',
    uk: 'Командоре, а ви знали, що під льодовою корою Європи, супутника Юпітера, ймовірно є підповерхневий океан?',
    en: "Commander, did you know that Jupiter's moon Europa likely hides a subsurface ocean beneath its icy shell?",
  },
  {
    id: 'fallback-fact-brown-dwarf',
    uk: 'Командоре, а ви знали, що коричневі карлики надто масивні для планет, але недостатньо масивні для стабільного водневого синтезу зорі?',
    en: "Commander, did you know that brown dwarfs are too massive to be planets but too small to sustain a star's hydrogen fusion?",
  },
  {
    id: 'fallback-fact-rogue-planets',
    uk: 'Командоре, а ви знали, що бродячі планети мандрують галактикою без жодної материнської зорі, вигнані гравітаційними взаємодіями?',
    en: 'Commander, did you know that rogue planets wander the galaxy with no host star, ejected by gravitational encounters?',
  },
  {
    id: 'fallback-fact-cosmic-rays',
    uk: 'Командоре, а ви знали, що деякі космічні промені несуть енергію, яку неможливо відтворити навіть у найпотужніших прискорювачах частинок на Землі?',
    en: 'Commander, did you know that some cosmic rays carry energy that even the most powerful particle accelerators on Earth cannot replicate?',
  },
  {
    id: 'fallback-fact-gravitational-lensing',
    uk: 'Командоре, а ви знали, що гравітація масивних галактик може викривляти світло настільки, що ми бачимо одну далеку зорю або галактику кілька разів?',
    en: "Commander, did you know that a massive galaxy's gravity can bend light so much that we see one distant star or galaxy multiple times?",
  },
  {
    id: 'fallback-fact-magnetosphere-jupiter',
    uk: 'Командоре, а ви знали, що магнітосфера Юпітера настільки велика, що якби її можна було побачити з Землі, вона здавалася б більшою за повний Місяць?',
    en: "Commander, did you know that Jupiter's magnetosphere is so vast that if visible from Earth, it would appear larger than the full Moon?",
  },
];
