import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'black-holes-intro',
  language: 'uk',
  section: 'astrophysics',
  order: 5,
  difficulty: 'beginner',
  readingTimeMin: 14,
  title: 'Чорні діри — вступ',
  subtitle: "Об’єкти, з яких не вирвешся. Що ми знаємо, як їх побачили і чому це найкраща перевірка теорії Ейнштейна.",

  hero: {
    cacheKey: 'black-holes-intro-hero',
    prompt:
      'Photorealistic scientific illustration of the M87* black hole shadow as imaged by the Event Horizon Telescope. ' +
      'Dark circular silhouette at center surrounded by an asymmetric glowing orange-gold accretion ring, brighter at the bottom due to relativistic Doppler beaming. ' +
      'Deep black void background with faint distant galaxies. ' +
      'Hard sci-fi style scientific illustration, wide aspect ratio, dark space background. ' +
      'Add the following text labels on the image: "M87*", "event horizon shadow", "accretion ring".',
    alt: 'Тінь чорної діри M87* — темне коло оточене несиметричним яскравим помаранчевим кільцем',
    caption:
      'M87* — перше в історії зображення тіні чорної діри. Знято Event Horizon Telescope, опубліковано 10 квітня 2019. Маса: 6,5 мільярдів сонячних мас. Відстань: 55 мільйонів світлових років.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Уявіть зорю, що в мільйон разів масивніша за Сонце, але стиснута до розміру міста. ' +
        'Гравітація на її поверхні така сильна, що навіть світло — найшвидше у Всесвіті — ' +
        'не може втекти. Це і є **чорна діра**: область простору, з якої нічого не виходить ' +
        'назовні. Не тому що щось «всмоктує», а тому що сама геометрія простору-часу там ' +
        'завернута всередину — як воронка, де всі дороги ведуть до центру.',

        'Звучить як наукова фантастика, але це найкраще задокументоване передбачення Ейнштейна. ' +
        'У квітні 2019 року людство вперше побачило _тінь_ чорної діри. У травні 2022 — ' +
        'тінь тієї, що ховається в центрі нашої власної Галактики. У 2024 вчені виміряли її ' +
        'магнітне поле та поляризацію світла навколо горизонту подій. Чорні діри існують — ' +
        'питання тепер не «чи існують», а «як саме вони влаштовані зсередини».',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-eht-array',
        prompt:
          'Scientific illustration of the Event Horizon Telescope global array: world map showing eight major radio telescope sites connected by glowing data link lines forming a virtual Earth-sized dish. ' +
          'Sites labeled at South Pole, Chile, Hawaii, Arizona, Spain, Mexico, Greenland. ' +
          'Hard sci-fi style, monospace labels, dark background with faint continental outlines in dim blue. ' +
          'Add the following text labels on the image: "Event Horizon Telescope", "baseline = Earth diameter", "wavelength 1.3 mm".',
        alt: 'Карта світу з вісьмома радіотелескопами EHT, з\'єднаними світловими лініями',
        caption: 'Вісім радіообсерваторій по всій планеті утворюють єдиний інструмент розміром із Землю. Кутова роздільна здатність: 20 мікросекунд дуги — достатньо, щоб побачити апельсин на Місяці.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Звідки беруться чорні діри',
      level: 2,
      paragraphs: [
        'Більшість чорних дір — це _трупи зір_. Коли масивна зоря (більше ~25 сонячних мас) ' +
        'випалює весь свій ядерний паливний запас, тиск, що утримував її від гравітаційного ' +
        'стиснення, зникає. Гравітація стискає ядро з нечуваною силою. Якщо маса ядра ' +
        'перевищує ~3 маси Сонця, навіть нейтронна речовина не витримує тиску. За частку ' +
        'секунди матерія обвалюється до точки нульового об\'єму — _сингулярності_.',

        'Цей момент ми спостерігаємо зовні як **наднову зорю** — один з наймогутніших вибухів ' +
        'у Всесвіті. Але сама чорна діра утворюється тихо, в самому серці катастрофи. ' +
        'Навколо сингулярності виникає _горизонт подій_ — невидима сфера, ' +
        'перетнувши яку, не можна повернутись назад. Це не фізична поверхня; ' +
        'ви не відчуєте нічого особливого в момент перетину (якщо чорна діра достатньо велика). ' +
        'Але після — ніякого вороття.',
      ],
    },

    {
      diagram: {
        title: 'Схема: Радіус Шварцшильда',
        svg: `<svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Singularity point -->
  <circle cx="320" cy="130" r="4" fill="#ff8844"/>
  <text x="332" y="135" fill="#ff8844" font-family="monospace" font-size="11">сингулярність</text>

  <!-- Event horizon -->
  <circle cx="320" cy="130" r="62" fill="rgba(204,68,68,0.06)" stroke="#cc4444" stroke-width="2"/>
  <text x="320" y="61" fill="#cc4444" font-family="monospace" font-size="11" text-anchor="middle">горизонт подій (R_s)</text>

  <!-- Photon sphere -->
  <circle cx="320" cy="130" r="93" fill="none" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="5,4"/>
  <text x="320" y="229" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">фотонна сфера (1.5 R_s)</text>

  <!-- ISCO -->
  <circle cx="320" cy="130" r="186" fill="none" stroke="#88ccdd" stroke-width="1" stroke-dasharray="2,7" opacity="0.45"/>
  <text x="514" y="133" fill="#88ccdd" font-family="monospace" font-size="11">ISCO (3 R_s)</text>

  <!-- Light ray escaping -->
  <path d="M 80 215 Q 240 195 510 90" stroke="#44ff88" stroke-width="1.5" fill="none"/>
  <text x="72" y="230" fill="#44ff88" font-family="monospace" font-size="10">світло — втікає</text>

  <!-- Light ray captured -->
  <path d="M 80 58 Q 220 100 285 138 L 318 132" stroke="#ff8844" stroke-width="1.5" fill="none"/>
  <text x="72" y="48" fill="#ff8844" font-family="monospace" font-size="10">світло — захоплене</text>

  <!-- Formula label -->
  <text x="320" y="16" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">R_s = 2GM / c²</text>
</svg>`,
        caption:
          'R_s = 2GM/c². Для маси Сонця це ~3 кілометрів Для M87* — 38 мільярдів км (більше орбіти Нептуна). ' +
          'ISCO (innermost stable circular orbit) — найближча стабільна кругова орбіта, звідки починається акреційний диск.',
      },
    },

    {
      paragraphs: [
        'Для чорної діри з масою Сонця _радіус Шварцшильда_ становить лише 3 кілометри. ' +
        'Якби стиснути все Сонце в кулю діаметром 6 км — отримали б чорну діру. ' +
        'Це ніколи не відбудеться природним шляхом (Сонце для цього недостатньо масивне — ' +
        'воно закінчить своє існування як біла карлик), але формула однакова для будь-якої маси.',
      ],
    },

    {
      heading: 'Шляхи зоряної еволюції',
      level: 3,
      paragraphs: [
        'Доля зорі залежить майже виключно від її початкової маси. Сонце перетвориться на ' +
        'червоного гіганта, скине зовнішні шари і осяде в білого карлика розміром із Землю. ' +
        'Масивна зоря (понад 8 мас Сонця) — вибухне як наднова. Якщо її ядро важить від 1,4 до 3 мас ' +
        'Сонця, залишиться нейтронна зоря. Якщо більше — чорна діра.',
      ],
    },

    {
      diagram: {
        title: 'Схема: Шляхи зоряної еволюції',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- ── Top path: Sun-like star ── -->
  <!-- Main sequence star -->
  <circle cx="80" cy="80" r="22" fill="#ffd080" opacity="0.9"/>
  <text x="80" y="85" fill="#020510" font-family="monospace" font-size="9" text-anchor="middle" font-weight="bold">Сонце</text>
  <text x="80" y="116" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">1 M☉</text>

  <!-- Arrow -->
  <line x1="104" y1="80" x2="175" y2="80" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>

  <!-- Red giant -->
  <circle cx="210" cy="80" r="30" fill="#cc6633" opacity="0.85"/>
  <text x="210" y="84" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Червоний</text>
  <text x="210" y="94" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">гігант</text>
  <text x="210" y="122" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">~5 млрд р.</text>

  <!-- Arrow -->
  <line x1="242" y1="80" x2="315" y2="80" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>

  <!-- Planetary nebula -->
  <ellipse cx="355" cy="80" rx="28" ry="18" fill="none" stroke="#88ccdd" stroke-width="1.5" opacity="0.7"/>
  <text x="355" y="84" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Планет.</text>
  <text x="355" y="94" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">туманність</text>

  <!-- Arrow -->
  <line x1="385" y1="80" x2="455" y2="80" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>

  <!-- White dwarf -->
  <circle cx="490" cy="80" r="10" fill="#cdd9e8" opacity="0.9"/>
  <text x="490" y="105" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Білий</text>
  <text x="490" y="118" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">карлик</text>

  <!-- ── Bottom path: massive star ── -->
  <!-- Massive star -->
  <circle cx="80" cy="230" r="32" fill="#aad4ff" opacity="0.85"/>
  <text x="80" y="234" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Масивна</text>
  <text x="80" y="244" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">зоря</text>
  <text x="80" y="276" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">25+ M☉</text>

  <!-- Arrow -->
  <line x1="114" y1="230" x2="175" y2="230" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>

  <!-- Red supergiant -->
  <circle cx="215" cy="230" r="38" fill="#aa3322" opacity="0.85"/>
  <text x="215" y="228" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Червоний</text>
  <text x="215" y="239" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">надгігант</text>

  <!-- Arrow -->
  <line x1="255" y1="230" x2="305" y2="230" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>

  <!-- Supernova burst -->
  <circle cx="340" cy="230" r="24" fill="none" stroke="#ff8844" stroke-width="2"/>
  <circle cx="340" cy="230" r="14" fill="rgba(255,200,80,0.5)"/>
  <text x="340" y="234" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Наднова</text>
  <text x="340" y="265" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Type II/Ib/Ic</text>

  <!-- Fork: neutron star vs black hole -->
  <!-- Upper fork arrow -> neutron star -->
  <line x1="364" y1="220" x2="420" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>
  <!-- Neutron star -->
  <circle cx="450" cy="175" r="9" fill="#7bb8ff" opacity="0.9"/>
  <text x="450" y="155" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Нейтронна</text>
  <text x="450" y="168" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">зоря</text>
  <text x="450" y="198" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1.4–3 M☉</text>

  <!-- Lower fork arrow -> black hole -->
  <line x1="364" y1="240" x2="420" y2="268" stroke="#667788" stroke-width="1.2" marker-end="url(#arr)"/>
  <!-- Black hole -->
  <circle cx="450" cy="278" r="12" fill="#080c18" stroke="#cc4444" stroke-width="2"/>
  <circle cx="450" cy="278" r="3" fill="#ff8844"/>
  <text x="450" y="304" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">Чорна діра</text>
  <text x="450" y="317" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">&gt;3 M☉</text>

  <!-- Divider line between paths -->
  <line x1="20" y1="155" x2="660" y2="155" stroke="#334455" stroke-width="0.5" stroke-dasharray="6,6" opacity="0.5"/>

  <!-- Section labels -->
  <text x="12" y="80" fill="#667788" font-family="monospace" font-size="9" dominant-baseline="middle">Мала зоря</text>
  <text x="12" y="230" fill="#667788" font-family="monospace" font-size="9" dominant-baseline="middle">Масивна</text>

  <!-- Arrowhead marker -->
  <defs>
    <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Доля зорі визначається її початковою масою. Зорі, подібні до Сонця, закінчують як білі карлики. ' +
          'Масивні зорі (понад ~25 M☉) вибухають як наднові й залишають або нейтронну зорю, або чорну діру.',
      },
    },

    {
      heading: 'Три класи чорних дір',
      level: 2,
      paragraphs: [
        'Сучасна астрономія виділяє три основні класи за масою — і кожен задає свої власні ' +
        'загадки щодо походження.',
      ],
    },

    {
      heading: '1. Чорні діри зоряної маси (5–100 M☉)',
      level: 3,
      paragraphs: [
        'Утворюються при колапсі окремих зір. У нашій Галактиці таких — десятки мільйонів, ' +
        'але більшість ізольовані й невидимі. Ми «бачимо» їх через рентгенівське випромінювання ' +
        '_акреційного диска_, коли чорна діра смоктає матерію із зорі-компаньйона у подвійній системі. ' +
        'Перший підтверджений кандидат — **Cygnus X-1** (1971), маса ~21 M☉. У 2019 LIGO ' +
        'детектор уперше зафіксував злиття двох чорних дір зоряної маси через ' +
        '_гравітаційні хвилі_ — нову «очей» астрономії.',
      ],
    },

    {
      heading: '2. Надмасивні чорні діри (10⁵–10¹⁰ M☉)',
      level: 3,
      paragraphs: [
        'Ховаються в центрах майже всіх великих галактик. У нашого Молочного Шляху — ' +
        '**Sagittarius A*** (Sgr A*), маса 4,3 млн M☉. У сусідній галактиці M87 — ' +
        '6,5 млрд M☉. Як саме вони набули такої маси — одне з найбільших відкритих питань ' +
        'сучасної астрофізики. JWST фіксує квазари — активні ядра галактик з надмасивними ' +
        'чорними дірами — у Всесвіті віком лише 700 мільйонів років. За стандартною моделлю ' +
        'просто не вистачає часу для такого зростання.',
      ],
    },

    {
      heading: '3. Чорні діри проміжної маси (100–10⁵ M☉)',
      level: 3,
      paragraphs: [
        'Найзагадковіший клас. До 2025 року знайдено лише кілька переконливих кандидатів, ' +
        'серед них — **HLX-1** у галактиці ESO 243-49. Вважається, що вони можуть утворюватись ' +
        'при злитті зоряних чорних дір у щільних зіркових скупченнях або при ' +
        '_прямому колапсі_ масивних газових хмар у ранньому Всесвіті. ' +
        'JWST і майбутній Einstein Telescope повинні внести ясність до 2030 року.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-bh-types-comparison',
        prompt:
          'Scientific infographic comparing three types of black holes: stellar-mass (small, 5-100 solar masses, next to a city for scale), ' +
          'intermediate-mass (medium, labeled HLX-1 candidate), and supermassive (enormous, labeled M87* 6.5 billion solar masses, next to a galaxy). ' +
          'Three black circles of dramatically different sizes side by side with labeled size comparison bars. ' +
          'Hard sci-fi style scientific illustration, dark space background, monospace font labels, orange and cyan accents. ' +
          'Add the following text labels on the image: "stellar-mass 5-100 M_sun", "intermediate 100-100000 M_sun", "supermassive up to 10^10 M_sun".',
        alt: 'Порівняння трьох класів чорних дір за масою та відносним розміром',
        caption: 'Три класи чорних дір розрізняються на десять порядків за масою. Надмасивна чорна діра M87* у поперечнику більша за відстань від Сонця до Нептуна.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Акреційний диск і релятивістські джети',
      level: 2,
      paragraphs: [
        'Сама чорна діра не випромінює світла — вона за визначенням чорна. Але матерія, що ' +
        'падає до неї, утворює **акреційний диск** — розпечений обертовий вихор газу. ' +
        'Тертя і магнітна турбулентність розігрівають цей газ до десятків мільйонів градусів, ' +
        'і він яскраво сяє в рентгені та ультрафіолеті. Ефект Доплера і гравітаційне лінзування ' +
        'роблять ближній до нас бік диска яскравішим — звідси несиметричне кільце на знімках EHT.',

        'Поряд з диском утворюються **релятивістські джети** — вузькі пучки плазми, що ' +
        'вистрілюються вздовж осі обертання чорної діри зі швидкостями, близькими до швидкості ' +
        'світла. Механізм їх формування — магнітне поле, скручене обертанням самої чорної діри ' +
        '(механізм Бленфорда-Знайека). Джет M87* має довжину понад 5 000 світлових років ' +
        'і добре помітний у радіодіапазоні. У 2024 році EHT вперше отримав карту магнітної ' +
        'поляризації основи цього джета, підтвердивши теорію.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-accretion-disk-jets',
        prompt:
          'Scientific illustration of a black hole with accretion disk and relativistic jets: ' +
          'central dark sphere (event horizon) surrounded by a glowing orange-red spiral accretion disk seen at slight angle, ' +
          'two perpendicular bright blue-white plasma jets shooting outward along rotation axis, ' +
          'magnetic field lines shown as spiral cyan curves threading through disk and jets. ' +
          'Hard sci-fi style scientific illustration, dark space background, technically accurate geometry. ' +
          'Add the following text labels on the image: "event horizon", "accretion disk", "relativistic jet", "magnetic field lines", "rotation axis".',
        alt: 'Чорна діра з акреційним диском та двома релятивістськими джетами, що вистрілюють вздовж осі обертання',
        caption: 'Джети формуються через взаємодію магнітного поля з обертанням чорної діри (ефект Бленфорда-Знайека). Швидкість плазми в джеті M87* становить близько 0,99c.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Як ми «побачили» те, чого не видно',
      level: 2,
      paragraphs: [
        'Проблема проста: чорна діра нічого не випромінює, а тінь від акреційного диска ' +
        'кутово мала навіть для найближчих до нас об\'єктів. Кутовий розмір тіні Sgr A* з Землі — ' +
        'як апельсин на поверхні Місяця. Жоден звичайний телескоп такого не розрізнить.',

        '**Event Horizon Telescope** (EHT) вирішив це задачу через _радіоінтерферометрію з ' +
        'наддовгою базою_ (VLBI). Вісім радіообсерваторій на чотирьох континентах і в Антарктиді ' +
        'записували сигнал одночасно, синхронізуючись за атомним годинником точністю до наносекунди. ' +
        'Комбінуючи дані, обчислювальні алгоритми відновили зображення з кутовою роздільністю 20 ' +
        'мікросекунд дуги — еквівалент телескопа розміром із Землю на довжині хвилі 1,3 мм.',

        'Результати: у 2019 — перший знімок M87*, у 2022 — знімок Sgr A* (технічно складніший, ' +
        'бо об\'єкт мерехтить за хвилини). У **2024 році** EHT опублікував карту _лінійної ' +
        'поляризації_ навколо основи джета M87* — перший прямий вимір топологічної структури ' +
        'магнітного поля поблизу горизонту подій. Картина узгоджується з моделлю обертаючої ' +
        'чорної діри Керра із впорядкованим магнітним полем вздовж джета.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-light-bending',
        prompt:
          'Scientific diagram showing gravitational lensing around a black hole: ' +
          'multiple light rays (shown as glowing cyan lines) bending around the dark silhouette of an event horizon, ' +
          'some rays completing partial or full orbits at the photon sphere radius, ' +
          'background star field distorted into Einstein ring arcs. ' +
          'Side view showing the geometry clearly. Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "photon sphere 1.5 Rs", "event horizon Rs", "Einstein ring", "light path".',
        alt: 'Викривлення световних траєкторій гравітацією чорної діри, фотонна сфера та кільце Ейнштейна',
        caption: 'На відстані 1,5 радіуса Шварцшильда гравітація настільки сильна, що фотони можуть обертатись по круговій орбіті — це фотонна сфера. Саме вона утворює яскраве кільце на знімках EHT.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Останні відкриття: EHT 2024 і JWST 2025–2026',
      level: 2,
      paragraphs: [
        'Квітень **2024**: EHT опублікував нову серію знімків M87* з поляризованим світлом ' +
        'вищої роздільності. Виміряна структура магнітного поля навколо основи джета показала ' +
        'впорядковану спіральну конфігурацію — саме таку, яку передбачає модель ' +
        'магніторотаційного механізму Бленфорда-Знайека. Це перше пряме спостереження, що пов\'язує ' +
        'магнітне поле біля горизонту подій із формуванням джета.',

        'Листопад **2024**: телескопи EHT, GRAVITY+ та VLTI разом відстежили рухомі _«гарячі плями»_ ' +
        '(hot spots) на орбіті Sgr A* — яскраві сплески плазми, що обертаються ' +
        'навколо горизонту подій зі швидкостями 30% швидкості світла. ' +
        'Орбітальний період ~30 хвилин відповідає останній стабільній круговій орбіті ' +
        'для чорної діри цього розміру.',

        '**JWST** (2022–2026) систематично знаходить квазари при _z > 7_ — це менш ніж ' +
        '800 мільйонів років після Великого Вибуху. У 2025 підтверджено кілька чорних дір ' +
        'масою понад мільярд M☉ у Всесвіті віком лише 700 млн років. Ці об\'єкти неможливо ' +
        'пояснити через стандартний акреційний ріст від зоряних чорних дір. ' +
        'Серед кандидатів-механізмів: прямий колапс первинних газових хмар (direct collapse black holes, DCBH) ' +
        'та злиття зоряних чорних дір у щільних «зоряних яслах» ранньої епохи.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-jwst-quasar',
        prompt:
          'Scientific illustration of a distant high-redshift quasar as observed by JWST: ' +
          'a brilliant point source surrounded by a host galaxy with reddish-orange hue due to cosmological redshift, ' +
          'tiny faint companion galaxies visible nearby, deep black space with infrared-style false color rendering, ' +
          'faint diffraction spikes typical of space telescope optics. ' +
          'Hard sci-fi style scientific illustration, dark space background. ' +
          'Add the following text labels on the image: "quasar z > 7", "supermassive black hole", "host galaxy", "JWST NIRCam view".',
        alt: 'Квазар на великому червоному зміщенні, спостережуваний JWST — яскрава точка в молодій галактиці раннього Всесвіту',
        caption: 'JWST виявив десятки квазарів з масивними чорними дірами в епоху, коли Всесвіту було менше мільярда років. Їхнє існування ставить під сумнів стандартні моделі росту чорних дір.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Відкриті питання: де фізика закінчується',
      level: 2,
      paragraphs: [
        'Незважаючи на видатні спостережні успіхи, чорні діри залишаються найбільшим ' +
        'недописаним розділом теоретичної фізики.',

        '**Що там, у сингулярності?** Загальна теорія відносності (ЗТВ) передбачає ' +
        'нескінченну щільність у центрі. Але нескінченність у фізиці — це ознака того, ' +
        'що теорія ламається. Нам потрібна квантова теорія гравітації, яка описує ' +
        'Планківські масштаби (приблизно 10⁻³⁵ м). Теорія струн і петльова квантова гравітація — ' +
        'кандидати, але жодна не підтверджена.',

        '**Парадокс інформації.** У 1974 Стівен Гокінг показав, що чорні діри ' +
        'повинні повільно випаровуватись через _випромінювання Гокінга_ — ' +
        'квантовий ефект поблизу горизонту подій. Але якщо діра випаровується — ' +
        'куди ділась інформація про все, що туди впало? Знищення інформації порушує ' +
        'квантову механіку. У 2022 Пенінгтон, Альмхейрі та інші запропонували ' +
        'рішення через _острівні формули_ (island formula), що пов\'язують ентропію ' +
        'випромінювання Гокінга із внутрішнім простором діри. Дебати тривають.',

        '**Звідки взялися надмасивні?** Стандартна акреція із зоряних чорних дір потребує ' +
        'мільярди років, а JWST бачить гігантів у Всесвіті значно молодшому. ' +
        'Можливо, в ранньому Всесвіті діяли особливі умови — відсутність металів, ' +
        'надщільні протогалактичні хмари — що уможливлювали _прямий колапс_ без стадії зорі. ' +
        'Відповідь очікується від спостережень JWST у 2026–2028 роках.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-hawking-radiation',
        prompt:
          'Scientific diagram of Hawking radiation at a black hole event horizon: ' +
          'virtual particle-antiparticle pairs appearing near the event horizon, one particle escaping as Hawking radiation (shown as glowing orange arrow pointing outward), ' +
          'the other falling inward (shown as dim arrow pointing toward singularity), ' +
          'event horizon boundary shown as a crisp red arc, background deep black space. ' +
          'Hard sci-fi style, technically accurate, dark background. ' +
          'Add the following text labels on the image: "event horizon", "virtual pair", "Hawking radiation", "falls inward", "T ~ 1/M".',
        alt: 'Схема випромінювання Гокінга: пари частинок поблизу горизонту подій, одна тікає як теплове випромінювання',
        caption: 'Випромінювання Гокінга настільки слабке, що для чорної діри зоряної маси його температура (приблизно 60 нанокельвінів) нижча за температуру реліктового випромінювання. Спостерігати його прямо зараз неможливо.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Сингулярність',
      definition:
        'Гіпотетична область нульового об\'єму та нескінченної щільності в центрі чорної діри, де рівняння загальної теорії відносності перестають працювати.',
    },
    {
      term: 'Горизонт подій',
      definition:
        'Невидима сфера навколо чорної діри, перетнувши яку, ніщо (включно зі світлом) не може повернутись назад. Не фізична поверхня — лише межа точки неповернення.',
    },
    {
      term: 'Радіус Шварцшильда (R_s)',
      definition:
        'Радіус горизонту подій для невобертної чорної діри (рішення Шварцшильда ЗТВ). R_s = 2GM/c². Для Сонця — ~3 кілометрів',
    },
    {
      term: 'Акреційний диск',
      definition:
        'Обертовий диск перегрітого газу, що по спіралі падає до чорної діри. Розігрівається до мільйонів градусів через тертя і магнітну турбулентність, яскраво світиться в рентгені.',
    },
    {
      term: 'Релятивістський джет',
      definition:
        'Вузький пучок плазми, що вистрілюється вздовж осі обертання чорної діри зі швидкостями до 0,99c. Утворюється через механізм Бленфорда-Знайека.',
    },
    {
      term: 'Випромінювання Гокінга',
      definition:
        'Теоретичне слабке теплове випромінювання, що виходить від горизонту подій через квантові ефекти (флуктуації вакуумних пар). Для реальних чорних дір практично ненаспостережуване.',
    },
    {
      term: 'Фотонна сфера',
      definition:
        'Сферична область на відстані 1,5 R_s від центру чорної діри, де фотони можуть рухатись по нестабільній круговій орбіті. Формує яскраве кільце на знімках EHT.',
    },
    {
      term: 'VLBI (радіоінтерферометрія з наддовгою базою)',
      definition:
        'Техніка синхронного спостереження об\'єкта кількома радіотелескопами на великих відстанях. Забезпечує кутову роздільність еквівалентну телескопу розміром із відстань між ними.',
    },
  ],

  quiz: [
    {
      question: 'Що таке горизонт подій чорної діри?',
      options: [
        'Фізична поверхня, об яку вдаряється матерія',
        'Точка нульового об\'єму в центрі чорної діри',
        'Сфера-межа, перетнувши яку, неможливо повернутись назад',
        'Кільце розпеченого газу навколо чорної діри',
      ],
      correctIndex: 2,
      explanation:
        'Горизонт подій — не фізична поверхня, а межа точки неповернення. Ви не відчуєте нічого особливого в момент перетину (якщо діра достатньо велика), але після цього всі фізичні траєкторії ведуть тільки до центру.',
    },
    {
      question: 'Яка мінімальна маса зорі (приблизно) потрібна, щоб після вибуху наднової утворилась чорна діра?',
      options: [
        '~1 маса Сонця',
        '~8 мас Сонця',
        '~25 мас Сонця',
        '~100 мас Сонця',
      ],
      correctIndex: 2,
      explanation:
        'Для утворення чорної діри маса ядра, що залишається після вибуху наднової, має перевищити ~3 маси Сонця (межа Толмена-Оппенгаймера-Волкова). Це відповідає початковій масі зорі приблизно від 25 M☉ і більше.',
    },
    {
      question: 'Яке відкриття зробив EHT у 2024 році щодо M87*?',
      options: [
        'Вперше виміряв масу чорної діри M87*',
        'Отримав карту лінійної поляризації магнітного поля навколо основи джета',
        'Побачив гравітаційні хвилі від M87*',
        'Виявив другу чорну діру в центрі M87',
      ],
      correctIndex: 1,
      explanation:
        'У 2024 EHT опублікував зображення поляризованого світла біля основи джета M87* з вищою роздільністю. Виміряна спіральна структура магнітного поля підтвердила теорію формування джета через механізм Бленфорда-Знайека.',
    },
    {
      question: 'Чому надмасивні чорні діри у дуже молодому Всесвіті (z > 7) є проблемою для стандартної теорії?',
      options: [
        'Молодий Всесвіт був холодним, і газ не міг акрецюватись',
        'При z > 7 чорних дір взагалі бути не може за теорією відносності',
        'Стандартний акреційний ріст із зоряних чорних дір потребує більше часу, ніж на той момент минуло',
        'JWST технічно не може бачити об\'єкти при z > 7',
      ],
      correctIndex: 2,
      explanation:
        'Стандартна модель передбачає, що надмасивні чорні діри ростуть через акрецію матерії та злиття. Але цей процес повільний — навіть при нарощуванні на межі Едінгтона потрібні сотні мільйонів років. JWST бачить чорні діри в мільярди M☉ у Всесвіті віком лише ~700 млн р., що не вкладається в цю схему.',
    },
  ],

  sources: [
    {
      title: 'Event Horizon Telescope Collaboration — First M87 Results (Paper I)',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ab0ec7',
      meta: 'ApJL, 875, L1, 2019 (відкритий доступ)',
    },
    {
      title: 'Event Horizon Telescope Collaboration — First Sagittarius A* Results (Paper I)',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ac6674',
      meta: 'ApJL, 930, L12, 2022 (відкритий доступ)',
    },
    {
      title: 'EHT 2024 — Polarimetric Images of the M87 Jet Base at 86 GHz',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ad14e5',
      meta: 'ApJL, 961, L25, 2024 (відкритий доступ)',
    },
    {
      title: 'Hawking S. — Black hole explosions?',
      url: 'https://www.nature.com/articles/248030a0',
      meta: 'Nature, 248, 30–31, 1974',
    },
    {
      title: 'LIGO — GW150914: First Direct Detection of Gravitational Waves',
      url: 'https://arxiv.org/abs/1602.03840',
      meta: 'PRL, 116, 061102, 2016 (відкритий доступ)',
    },
    {
      title: 'JWST Early Release Science — High-z Quasars at z > 7',
      url: 'https://arxiv.org/abs/2311.04279',
      meta: 'arXiv:2311.04279, 2023 (відкритий доступ)',
    },
    {
      title: 'Blandford R., Znajek R. — Electromagnetic extraction of energy from Kerr black holes',
      url: 'https://academic.oup.com/mnras/article/179/3/433/1005222',
      meta: 'MNRAS, 179, 433–456, 1977',
    },
    {
      title: 'Penington G. et al. — Entanglement wedge reconstruction and the information paradox',
      url: 'https://arxiv.org/abs/1905.08255',
      meta: 'JHEP 2022, arXiv:1905.08255',
    },
    {
      title: 'NASA — What is a Black Hole?',
      url: 'https://science.nasa.gov/astrophysics/focus-areas/black-holes/',
      meta: 'NASA Science, офіційна сторінка, оновлено 2025',
    },
    {
      title: 'EHT Collaboration — офіційний вебсайт, всі публікації',
      url: 'https://eventhorizontelescope.org/',
      meta: 'відкритий доступ',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
