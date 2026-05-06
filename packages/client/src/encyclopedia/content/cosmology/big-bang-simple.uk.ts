import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'big-bang-simple',
  language: 'uk',
  section: 'cosmology',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 13,
  title: 'Що таке Великий вибух простою мовою',
  subtitle:
    'Не вибух у просторі, а вибух самого простору. Звідки ми знаємо, що це сталось, і що лишається загадкою.',

  hero: {
    cacheKey: 'big-bang-simple-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Big Bang — the birth of the universe. ' +
      'A single blazing point of infinite density expanding outward in all directions, ' +
      'surrounded by expanding shells of glowing plasma transitioning from white-hot at center ' +
      'to deep red at edges, then fading into dark cosmic void. ' +
      'Hard sci-fi style, dark space background, wide cinematic composition. ' +
      'Add the following text labels on the image: "t = 0", "Planck epoch", "inflation", "quark-gluon plasma", "13.8 Gyr". ' +
      'Aspect ratio 16:9.',
    alt:
      'Розширення Всесвіту від гарячої щільної точки до сучасного масштабу — художня реконструкція.',
    caption:
      'Момент Великого вибуху — не вибух у просторі, а народження самого простору-часу. ' +
      'Художня реконструкція на основі сучасних космологічних даних.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Коли чуєш «Великий вибух», уява малює щось на зразок гігантської бомби, що вибухнула в темному космосі. ' +
        'Уламки розлетілися в усі боки — і ось вам Всесвіт. Це дуже красивий образ. І він повністю хибний. ' +
        'Не було жодного «навколо», в якому щось могло б вибухнути. Простір не існував до того моменту. ' +
        '**Великий вибух — це не вибух у просторі, а розширення самого простору.**',

        'Ця різниця принципова. Якщо Всесвіт розширюється сам по собі, тоді немає «центру», з якого все почалось, ' +
        'і немає «краю», до якого летять галактики. Кожна точка рухається від кожної іншої, ' +
        'як родзинки в тісті, що піднімається. І питання «що було до Великого вибуху» ' +
        'виявляється таким само нечітким, як питання «що знаходиться на північ від Північного полюса».',
      ],
    },

    {
      heading: 'Як Хаббл перегорнув картину Всесвіту',
      level: 2,
      paragraphs: [
        'У 1929 році американський астроном **Едвін Хаббл** опублікував спостереження, ' +
        'які назавжди змінили космологію. Він систематично вимірював _червоний зсув_ далеких галактик — ' +
        'зміну спектра їхнього світла у бік довших, «червоніших» хвиль. Це той самий ефект Доплера, ' +
        'через який сирена машини швидкої допомоги звучить вище, коли наближається, і нижче, коли віддаляється. ' +
        'Якщо джерело світла рухається від нас, його хвилі розтягуються і зміщуються в червону сторону.',

        'Хаббл виявив закономірність: чим далі від нас галактика — тим швидше вона від нас тікає. ' +
        'Пряма лінія на графіку «швидкість відступу — відстань». ' +
        'Це і є **закон Хаббла-Лемера** (Лемер відкрив його незалежно ще 1927 року, ' +
        'але Хаббл мав більшу вибірку й міцнішу репутацію). ' +
        'Нахил цієї прямої — константа Хаббла H₀ — і є мірою того, як швидко Всесвіт розширюється.',

        'Якщо всі галактики зараз розлітаються в різні боки, значить, у далекому минулому вони були ближче. ' +
        'Запустимо плівку назад — і отримаємо момент, коли весь видимий Всесвіт був стиснутий ' +
        'в нескінченно малий, нескінченно гарячий і щільний стан. Це і є Великий вибух.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-hubble-law',
        prompt:
          'Scientific diagram of Hubble\'s law for a science encyclopedia. ' +
          'Clean graph showing recession velocity (km/s) on Y axis versus distance (Megaparsecs) on X axis. ' +
          'Data points representing galaxies scattered around a straight line. ' +
          'Hard sci-fi style, dark background #020510, cyan/orange accent colors, monospace font for labels. ' +
          'Add the following text labels on the image: "recession velocity (km/s)", "distance (Mpc)", ' +
          '"v = H₀ × d", "H₀ ≈ 70 km/s/Mpc". ' +
          'Aspect ratio 4:3.',
        alt:
          'Графік закону Хаббла: швидкість відступу галактик проти відстані — пряма залежність.',
        caption:
          'Закон Хаббла-Лемера: кожен мегапарсек відстані додає ~70 км/с до швидкості віддалення галактики. ' +
          'Нахил прямої — константа Хаббла H₀.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Перші 380 000 років: непрозоре вогненне місиво',
      level: 2,
      paragraphs: [
        'В перші частки секунди Всесвіт був разюче гарячим — температура перевищувала трильйони кельвінів. ' +
        'Матерія і антиматерія анігілювали, кварки зливалися в протони і нейтрони. ' +
        'Але головна проблема для спостерігача: Всесвіт тоді був **непрозорим**.',

        'Уявіть кімнату, заповнену туманом настільки густим, що ліхтар освітлює лише метр навколо. ' +
        'Саме так виглядав ранній Всесвіт — зупинена плазма з вільних електронів і ядер. ' +
        'Фотони (частинки світла) постійно розсіювалися на вільних електронах і не могли пройти далеко. ' +
        'Ніяка інформація не могла «вилетіти» назовні.',

        'Приблизно через 380 000 років після Великого вибуху температура впала до ~3000 K. ' +
        'Електрони вперше змогли «прилипнути» до ядер і утворити стабільні атоми водню і гелію. ' +
        'Цей момент називається **рекомбінацією** — хоч насправді це перша комбінація, а не повторна. ' +
        'Без вільних електронів плазма стала прозорою, і фотони нарешті вирвалися на волю.',
      ],
    },

    {
      heading: 'Реліктове випромінювання: ехо народження Всесвіту',
      level: 2,
      paragraphs: [
        'Ті самі фотони, що вирвалися 13,8 мільярда років тому, досі летять крізь простір. ' +
        'За цей час Всесвіт так сильно розширився, що їхні хвилі розтягнулися з інфрачервоного ' +
        'в діапазон мікрохвиль. Ми їх відчуваємо скрізь і постійно — це **Космічний мікрохвильовий фон** (КМФ), ' +
        'або реліктове випромінювання.',

        'Відкрили його випадково. У 1965 році американські радіоінженери **Арно Пензіас і Роберт Вілсон** ' +
        'намагалися позбутись загадкового шуму в рупорній антені Bell Labs у Нью-Джерсі. ' +
        'Вони навіть прочистили антену від голубиного посліду — шум не зник. ' +
        'Потім з\'ясувалося: це і є сигнал від народження Всесвіту, що приходить рівномірно з усіх напрямків. ' +
        'Пензіас і Вілсон отримали Нобелівську премію з фізики 1978 року.',

        'Цей фон виглядає майже ідеально однорідним — температура 2,725 K з усіх боків неба. ' +
        'Але «майже» — ключове слово. Місія **Planck** Європейського космічного агентства (2009-2013) ' +
        'побудувала найточніші в історії карти температурних відхилень: крихітні флуктуації ' +
        'на рівні одного мільйонного частки кельвіна. ' +
        'Ці нерівності — відбиток квантових флуктуацій в ранньому Всесвіті, ' +
        'і саме вони стали зернами, з яких виросли всі галактики.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-cmb-planck',
        prompt:
          'Scientific illustration for a science encyclopedia: the Planck satellite CMB map. ' +
          'An oval/Mollweide projection map of the entire sky showing temperature anisotropies ' +
          'of the Cosmic Microwave Background. Color gradient from deep blue (colder regions, -200 microK) ' +
          'through black to orange-red (hotter regions, +200 microK). ' +
          'The map should look like the actual Planck 2018 CMB temperature map. ' +
          'Hard sci-fi style, dark background. ' +
          'Add the following text labels on the image: "Planck CMB 2018", "T = 2.725 K", ' +
          '"delta T = ±200 microK", "13.8 Gyr ago". ' +
          'Aspect ratio 16:9.',
        alt:
          'Карта температурних флуктуацій Космічного мікрохвильового фону від місії Planck 2018.',
        caption:
          'Карта КМФ від супутника Planck (2018). Кольори кодують відхилення температури від середнього ' +
          '2.725 K — не більше ±200 мікрокельвінів. Ці флуктуації — насіння всіх майбутніх галактик.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Інфляція: чому Всесвіт такий рівний',
      level: 2,
      paragraphs: [
        'Є два факти про Всесвіт, які важко пояснити без додаткової ідеї. ' +
        'По-перше, КМФ однаковий з усіх боків неба — ділянки, що зараз знаходяться ' +
        'в 90 мільярдах світлових років одна від одної, мають однакову температуру з точністю до 0,001%. ' +
        'Але за стандартною космологією вони ніколи не встигли б обмінятись теплом — ' +
        'вони завжди перебували за межами горизонту одна одної. Це **проблема горизонту**.',

        'По-друге, Всесвіт дивовижно «плоский» у геометричному сенсі: ' +
        'сума кутів трикутника у великих масштабах дорівнює 180°, ' +
        'а не більше (як на кулі) і не менше (як на сідлі). ' +
        'Для цього потрібна надточна настройка щільності — менша точність в ранньому Всесвіті ' +
        'давно б призвела до колапсу або розльоту. Це **проблема плоскості**.',

        'У 1980 році фізик **Алан Гут** запропонував _інфляцію_ — короткий, але фантастично швидкий ' +
        'етап розширення одразу після Великого вибуху. ' +
        'За ~10⁻³² секунди Всесвіт збільшився принаймні в 10²⁶ разів — ' +
        'як якщо б атом розбух до розміру видимого Всесвіту. ' +
        'Будь-які початкові нерівності розгладились, будь-які ділянки, ' +
        'що були в контакті, розлетілись за горизонти одна одної. ' +
        'Обидві проблеми зникають одразу.',

        'Механізм інфляції досі гіпотетичний — ми не знаємо, яке саме поле її викликало. ' +
        'Але жодна альтернатива не пояснює спостережувані факти так само добре.',
      ],
    },

    {
      diagram: {
        title: 'Схема: Хронологія Всесвіту',
        svg: `<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="220" fill="rgba(10,15,25,0.5)"/>

  <!-- Timeline axis -->
  <line x1="30" y1="110" x2="670" y2="110" stroke="#334455" stroke-width="1"/>

  <!-- Epoch blocks -->
  <!-- Planck / GUT -->
  <rect x="30" y="85" width="40" height="50" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="1"/>
  <text x="50" y="78" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Planck</text>
  <text x="50" y="148" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">10⁻⁴³ s</text>

  <!-- Inflation -->
  <rect x="70" y="75" width="55" height="70" fill="rgba(255,136,68,0.2)" stroke="#ff8844" stroke-width="1"/>
  <text x="97" y="68" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Inflation</text>
  <text x="97" y="158" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">10⁻³² s</text>

  <!-- Quark epoch -->
  <rect x="125" y="88" width="55" height="44" fill="rgba(255,136,68,0.12)" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="152" y="80" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Кварки</text>
  <text x="152" y="143" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">10⁻⁶ s</text>

  <!-- BBN -->
  <rect x="180" y="90" width="65" height="40" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="212" y="82" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Нуклеосинтез</text>
  <text x="212" y="142" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">1-3 хв</text>

  <!-- Recombination / CMB -->
  <rect x="245" y="88" width="80" height="44" fill="rgba(68,255,136,0.15)" stroke="#44ff88" stroke-width="1"/>
  <text x="285" y="80" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Рекомбінація</text>
  <text x="285" y="80" dy="10" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">+ КМФ</text>
  <text x="285" y="143" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">380 000 р.</text>

  <!-- Dark Ages -->
  <rect x="325" y="92" width="90" height="36" fill="rgba(51,68,85,0.4)" stroke="#334455" stroke-width="1"/>
  <text x="370" y="84" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Темні віки</text>
  <text x="370" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">~400 Мр</text>

  <!-- Reionization / first stars -->
  <rect x="415" y="89" width="70" height="42" fill="rgba(136,204,221,0.15)" stroke="#88ccdd" stroke-width="1"/>
  <text x="450" y="81" text-anchor="middle" fill="#88ccdd" font-family="monospace" font-size="9">Перші зорі</text>
  <text x="450" y="142" text-anchor="middle" fill="#88ccdd" font-family="monospace" font-size="9">~1 Гр</text>

  <!-- Galaxies -->
  <rect x="485" y="87" width="70" height="46" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="520" y="79" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Галактики</text>
  <text x="520" y="145" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">2-5 Гр</text>

  <!-- Today -->
  <rect x="555" y="82" width="110" height="56" fill="rgba(68,255,136,0.1)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="610" y="74" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Сьогодні</text>
  <text x="610" y="150" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">13.8 Гр</text>

  <!-- Arrow right -->
  <polygon points="672,107 665,104 665,110" fill="#aabbcc"/>

  <!-- Time label -->
  <text x="350" y="195" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">Час (логарифмічна шкала)</text>
</svg>`,
        caption:
          'Хронологія Всесвіту від моменту Планка до сьогодні (логарифмічна шкала часу). ' +
          'Кожна епоха відповідає якісному стрибку в фізичних умовах.',
      },
    },

    {
      heading: 'Нуклеосинтез: звідки взялися перші атоми',
      level: 2,
      paragraphs: [
        'У перші три хвилини Всесвіт був достатньо гарячим, ' +
        'щоб ядерні реакції відбувалися масово — як у серці зорі, тільки ще інтенсивніше. ' +
        'Протони і нейтрони, що утворились раніше, злипалися в ядра. ' +
        'Це **Великий вибуховий нуклеосинтез** (BBN, від англ. Big Bang Nucleosynthesis).',

        'Результат передбачуваний і підтверджений спостереженнями з надзвичайною точністю: ' +
        'приблизно **75% маси Всесвіту — водень** (протони, що так і не знайшли пару), ' +
        'і **25% — гелій-4**. Плюс слідові кількості дейтерію, гелію-3 і літію-7. ' +
        'Все важче за літій — вуглець, кисень, залізо, золото — ' +
        'синтезоване пізніше в надрах зір і в спалахах наднових. ' +
        'Ми буквально складені зі зоряного пилу.',

        'Ці пропорції надзвичайно чутливі до умов раннього Всесвіту. ' +
        'Якщо б константа Хаббла або кількість нейтрино були трохи іншими, ' +
        'пропорції гелію і дейтерію відрізнялися б. ' +
        'Астрономи вимірюють ці пропорції у найдавніших зорях і газових хмарах — ' +
        'і кожен раз отримують число, що збігається з передбаченням BBN.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-bbn-chart',
        prompt:
          'Scientific illustration for a science encyclopedia: Big Bang Nucleosynthesis abundance chart. ' +
          'A bar chart or pie visualization showing primordial elemental abundances: ' +
          'Hydrogen ~75% (large dominant section in blue-white), ' +
          'Helium-4 ~25% (second large section in orange), ' +
          'Deuterium trace (tiny sliver in cyan), Helium-3 trace (tiny, green), Lithium-7 trace (tiny, red). ' +
          'Hard sci-fi style, dark background, monospace font. ' +
          'Add the following text labels on the image: "Hydrogen 75%", "Helium-4 25%", ' +
          '"Deuterium", "He-3", "Li-7", "Big Bang Nucleosynthesis". ' +
          'Aspect ratio 4:3.',
        alt:
          'Первинні пропорції елементів після Великого вибухового нуклеосинтезу: H 75%, He-4 25%.',
        caption:
          'Первинний хімічний склад Всесвіту — результат перших трьох хвилин після Великого вибуху. ' +
          'Все важче за літій синтезоване в зорях.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Сучасні вимірювання і напруга Хаббла',
      level: 2,
      paragraphs: [
        'Якби фізика стандартної космологічної моделі була абсолютно вірна, ' +
        'константа Хаббла H₀, виміряна різними методами, давала б одне й те саме число. ' +
        'Але вона не дає. І це один з найгарячіших конфліктів у сучасній фізиці.',

        'Місія **Planck** (2018) виміряла H₀ = **67,4 ± 0,5 км/с/Мпк** — ' +
        'через аналіз дрібних флуктуацій КМФ і стандартну модель. ' +
        'Команда **SH0ES** на чолі з Адамом Рісом (2022-2024) виміряла H₀ = **73,0 ± 1,0 км/с/Мпк** — ' +
        'через _стандартні свічки_: цефеїди і наднові типу Ia в сусідніх галактиках. ' +
        'Різниця ~8% звучить мало, але статистична значущість перевищує 5σ — ' +
        'поріг, при якому фізики оголошують відкриття. ' +
        'Це **напруга Хаббла** (Hubble tension).',

        'Жодна з груп не виявила грубих помилок. Є кілька гіпотез: ' +
        'нова фізика до рекомбінації (_рання темна енергія_), ' +
        'додаткові типи нейтрино, або систематика у вимірюваннях. ' +
        'На 2026 рік вирішення не знайдено. Це може бути першим сигналом фізики за межами стандартної моделі.',
      ],
    },

    {
      heading: 'JWST і несподіванки раннього Всесвіту',
      level: 2,
      paragraphs: [
        '**Космічний телескоп Джеймса Вебба** (JWST), що пройшов ввід в експлуатацію наприкінці 2021 року, ' +
        'почав надсилати наукові дані з 2022-го — і одразу здивував космологів.',

        'Стандартна модель передбачає, що ранній Всесвіт — до мільярда років після Великого вибуху — ' +
        'мав містити лише малі, нерегулярні протогалактики. ' +
        'JWST виявив галактики на _червоному зсуві_ z > 10 (Всесвіт вік < 500 млн р.), ' +
        'що мають масу і структуру, яку за стандартними темпами росту мало б займати мільярди років. ' +
        'Деякі об\'єкти — наприклад, _Maisie\'s Galaxy_ (z ≈ 11,4) та кілька кандидатів при z > 16 — ' +
        'виглядають «дорослими» подивовуюче рано.',

        'Це не руйнує Великий вибух як концепцію — лише вказує, ' +
        'що або механізми утворення галактик були ефективнішими, ніж ми думали, ' +
        'або є похибки у визначенні відстаней до цих об\'єктів, ' +
        'або IMF (функція початкової маси зір) у ранньому Всесвіті відрізнялась від сучасної. ' +
        'Дослідження тривають.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-jwst-deep-field',
        prompt:
          'Photorealistic illustration for a science encyclopedia: JWST deep field — distant early galaxies. ' +
          'Hundreds of galaxies at various redshifts, from nearby spirals to tiny reddish smudges ' +
          'representing galaxies at z>10 (less than 500 million years after Big Bang). ' +
          'Inset box highlighting an early massive galaxy with label. ' +
          'Hard sci-fi style, true space colors, dark background. ' +
          'Add the following text labels on the image: "z > 10", "< 500 Myr after Big Bang", ' +
          '"JWST NIRCam", "early massive galaxy". ' +
          'Aspect ratio 16:9.',
        alt:
          'Глибоке поле JWST з ранніми масивними галактиками на великих червоних зсувах.',
        caption:
          'Символічна репрезентація даних JWST: галактики на z > 10, вік менший за 500 млн р. після Великого вибуху. ' +
          'Їхня маса і структура кидає виклик стандартним моделям формування галактик.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Що ми ще не знаємо',
      level: 2,
      paragraphs: [
        'Великий вибух — найкраще підтверджена теорія походження Всесвіту, яку ми маємо. ' +
        'КМФ, BBN-пропорції елементів, розширення Всесвіту — три незалежних стовпи доказів. ' +
        'Але є питання, на які теорія поки не відповідає.',

        '**Що «вибухнуло» і чому?** Загальна відносність описує, ' +
        'як простір-час поводиться після моменту t = 0, ' +
        'але ламається точно в t = 0. ' +
        'Ми не знаємо, що було «до» — і чи взагалі слово «до» тут має зміст. ' +
        'Квантова теорія гравітації (яка ще не побудована) мала б відповісти на це питання.',

        '**Що поза межами нашого горизонту?** Видимий Всесвіт — куля ~46 млрд світлових років в радіусі. ' +
        'За горизонтом могуть бути інші домени, де константи природи відрізняються (мультиверсум). ' +
        'Або простір однорідний до нескінченності. Ми не маємо способу перевірити це спостережно.',

        '**Де антиматерія?** Фізика симетрична для матерії і антиматерії. ' +
        'Після Великого вибуху їх мало б утворитись порівну, і вони мали б анігілювати — ' +
        'залишивши лише фотони. Але ми існуємо, значить матерії вийшло трохи більше. ' +
        'На мільярд анігіляцій — один зайвий протон. ' +
        'Ця _барионна асиметрія_ досі не пояснена.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-universe-timeline',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the history of the universe as a cone or funnel. ' +
          'Left: tiny hot bright point (Big Bang, t=0). ' +
          'Moving right: expanding cone shape showing growth of the universe through time. ' +
          'Key epochs marked: inflation (rapid expansion), quark epoch, nucleosynthesis, recombination+CMB release, ' +
          'dark ages, first stars, galaxy formation, accelerated expansion, today. ' +
          'Color transitions: white-hot left, cooling to red, then dark for dark ages, ' +
          'then blue-white specks for first stars, to full galaxy colors on right. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: ' +
          '"Big Bang t=0", "Inflation", "CMB released", "First Stars", "Galaxies", "Today 13.8 Gyr". ' +
          'Aspect ratio 16:9.',
        alt:
          'Конусоподібна діаграма еволюції Всесвіту від Великого вибуху до сьогодні.',
        caption:
          'Всесвіт від точки до масштабу — 13,8 мільярда років еволюції. ' +
          'Кожен етап відзначений зміною домінуючих фізичних процесів.',
        aspectRatio: '16:9',
      },
    },

    {
      diagram: {
        title: 'Схема: Напруга Хаббла — два методи, два числа',
        svg: `<svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="200" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">H₀ — константа Хаббла: два методи, два результати</text>

  <!-- CMB / early universe method -->
  <rect x="50" y="40" width="260" height="110" rx="3" fill="rgba(68,136,170,0.12)" stroke="#4488aa" stroke-width="1"/>
  <text x="180" y="60" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="12">Planck / КМФ</text>
  <text x="180" y="80" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">(ранній Всесвіт)</text>
  <text x="180" y="108" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="20">67.4</text>
  <text x="180" y="128" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="11">± 0.5 км/с/Мпк</text>
  <text x="180" y="143" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">ESA Planck 2018</text>

  <!-- VS divider -->
  <text x="350" y="102" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="18">VS</text>
  <line x1="320" y1="95" x2="380" y2="95" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>

  <!-- Distance ladder method -->
  <rect x="390" y="40" width="260" height="110" rx="3" fill="rgba(255,136,68,0.1)" stroke="#ff8844" stroke-width="1"/>
  <text x="520" y="60" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="12">SH0ES / Цефеїди + Ia</text>
  <text x="520" y="80" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">(пізній Всесвіт)</text>
  <text x="520" y="108" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="20">73.0</text>
  <text x="520" y="128" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="11">± 1.0 км/с/Мпк</text>
  <text x="520" y="143" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Riess et al. 2022</text>

  <!-- Sigma label -->
  <text x="350" y="175" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="11">Розбіжність &gt; 5σ — «Hubble tension»</text>
</svg>`,
        caption:
          'Два незалежних методи вимірювання константи Хаббла дають результати, ' +
          'що розходяться на >5σ. Причина невідома станом на травень 2026.',
      },
    },
  ],

  glossary: [
    {
      term: 'Великий вибух',
      definition:
        'Космологічна модель, що описує ранній стан Всесвіту як надзвичайно гарячий і щільний стан і подальше розширення простору-часу з моменту t ≈ 0.',
    },
    {
      term: 'Червоний зсув (redshift)',
      definition:
        'Зміщення спектра електромагнітного випромінювання в бік більших довжин хвиль — спостерігається у джерел, що рухаються від спостерігача, або у фотонів, що долають простір, який розширюється.',
    },
    {
      term: 'Космічний мікрохвильовий фон (КМФ)',
      definition:
        'Теплове мікрохвильове випромінювання, що рівномірно заповнює Всесвіт — залишок фотонів, що вирвалися під час рекомбінації через 380 000 році після Великого вибуху. Температура 2,725 K.',
    },
    {
      term: 'Рекомбінація',
      definition:
        'Момент в ранньому Всесвіті (приблизно 380 000 році), коли температура впала до ~3000 K і вільні електрони приєдналися до ядер, утворивши нейтральні атоми. Всесвіт став прозорим для фотонів.',
    },
    {
      term: 'Інфляція',
      definition:
        'Гіпотетичний надшвидкий етап розширення Всесвіту одразу після Великого вибуху (приблизно 10⁻³² с), що пояснює однорідність КМФ і геометричну плоскість Всесвіту.',
    },
    {
      term: 'Нуклеосинтез епохи Великого вибуху (BBN)',
      definition:
        'Ядерні реакції в перші три хвилини Всесвіту, що сформували первинні пропорції водню (приблизно 75%) і гелію-4 (приблизно 25%).',
    },
    {
      term: 'Константа Хаббла (H₀)',
      definition:
        'Темп розширення Всесвіту, виражений у кілометрах за секунду на мегапарсек відстані. Поточний консенсус — в діапазоні 67–73 км/с/Мпк залежно від методу виміру.',
    },
    {
      term: 'Напруга Хаббла (Hubble tension)',
      definition:
        'Статистично значуща (>5σ) невідповідність між значеннями H₀, отриманими з КМФ (67,4) і зі стандартних свічок (73,0). Причина невідома.',
    },
  ],

  quiz: [
    {
      question:
        'Що насправді сталося під час Великого вибуху?',
      options: [
        'Вибух у вже існуючому просторі',
        'Розширення самого простору-часу',
        'Зіткнення двох Всесвітів',
        'Колапс попереднього Всесвіту',
      ],
      correctIndex: 1,
      explanation:
        'Великий вибух — це не вибух у просторі, а розширення самого простору-часу. ' +
        'До моменту t = 0 поняття «простір» і «час» не мало звичного значення.',
    },
    {
      question:
        'Яке відкриття 1965 року підтвердило теорію Великого вибуху?',
      options: [
        'Виявлення темної матерії',
        'Перша фотографія галактики',
        'Відкриття Космічного мікрохвильового фону Пензіасом і Вілсоном',
        'Виявлення гравітаційних хвиль',
      ],
      correctIndex: 2,
      explanation:
        'Арно Пензіас і Роберт Вілсон випадково виявили рівномірний мікрохвильовий сигнал з усіх боків неба — ' +
        'реліктове випромінювання, що є прямим наслідком гарячого стану раннього Всесвіту. ' +
        'За це відкриття вони отримали Нобелівську премію 1978 року.',
    },
    {
      question:
        'Які два елементи домінували в первинному хімічному складі Всесвіту після нуклеосинтезу?',
      options: [
        'Вуглець і кисень',
        'Водень і гелій',
        'Водень і літій',
        'Гелій і залізо',
      ],
      correctIndex: 1,
      explanation:
        'Великий вибуховий нуклеосинтез (перші 3 хв) дав ~75% водню і ~25% гелію-4. ' +
        'Усі важчі елементи аж до заліза утворились пізніше в надрах зір.',
    },
    {
      question:
        'В чому полягає «напруга Хаббла»?',
      options: [
        'Галактики рухаються швидше, ніж передбачає теорія відносності',
        'Два незалежних методи вимірювання H₀ дають результати, що суттєво розходяться',
        'Всесвіт розширюється нерівномірно в різних напрямках',
        'Швидкість світла змінилась з часом',
      ],
      correctIndex: 1,
      explanation:
        'КМФ-метод (Planck) дає H₀ = 67,4 км/с/Мпк, ' +
        'метод стандартних свічок (SH0ES) — 73,0 км/с/Мпк. ' +
        'Розбіжність >5σ є статистично значущою і може вказувати на нову фізику.',
    },
  ],

  sources: [
    {
      title: 'Penzias A.A., Wilson R.W. — A Measurement of Excess Antenna Temperature at 4080 Mc/s',
      url: 'https://ui.adsabs.harvard.edu/abs/1965ApJ...142..419P',
      meta: 'ApJ 142, 419 (1965) — відкриття КМФ, Нобелівська премія 1978',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results: Cosmological Parameters',
      url: 'https://arxiv.org/abs/1807.06209',
      meta: 'A&A 641, A6 (2020), arXiv:1807.06209',
    },
    {
      title:
        'Riess A.G. et al. (SH0ES) — A Comprehensive Measurement of the Local Value of the Hubble Constant',
      url: 'https://arxiv.org/abs/2112.04510',
      meta: 'ApJL 934, L7 (2022), arXiv:2112.04510',
    },
    {
      title: 'Bennett C.L. et al. (WMAP) — Nine-Year WMAP Observations: Final Maps and Cosmological Parameters',
      url: 'https://arxiv.org/abs/1212.5225',
      meta: 'ApJS 208, 20 (2013), arXiv:1212.5225',
    },
    {
      title: 'Smoot G.F. et al. (COBE/DMR) — Structure in the COBE DMR First Year Maps',
      url: 'https://ui.adsabs.harvard.edu/abs/1992ApJ...396L...1S',
      meta: 'ApJL 396, L1 (1992) — перше відкриття анізотропій КМФ, Нобелівська премія 2006',
    },
    {
      title: 'Finkelstein S.L. et al. — A Long-Time-Ago in a Galaxy Far, Far Away: A Candidate z ≈ 14 Galaxy',
      url: 'https://arxiv.org/abs/2207.12474',
      meta: 'ApJL 940, L55 (2022) — Maisie\'s Galaxy, JWST, arXiv:2207.12474',
    },
    {
      title: 'Labbe I. et al. — A Population of Red Candidate Massive Galaxies ~600 Myr After the Big Bang',
      url: 'https://arxiv.org/abs/2207.09436',
      meta: 'Nature 616, 266 (2023), JWST, arXiv:2207.09436',
    },
    {
      title: 'Cyburt R.H. et al. — Big Bang Nucleosynthesis: Present Status',
      url: 'https://arxiv.org/abs/1505.01076',
      meta: 'Rev. Mod. Phys. 88, 015004 (2016), arXiv:1505.01076',
    },
    {
      title: 'Guth A.H. — Inflationary Universe: A Possible Solution to the Horizon and Flatness Problems',
      url: 'https://ui.adsabs.harvard.edu/abs/1981PhRvD..23..347G',
      meta: 'Phys. Rev. D 23, 347 (1981) — оригінальна стаття про інфляцію',
    },
    {
      title: 'NASA WMAP Mission Overview',
      url: 'https://map.gsfc.nasa.gov/',
      meta: 'NASA офіційна сторінка місії WMAP',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
