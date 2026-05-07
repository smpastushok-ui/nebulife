import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'galaxy-types',
  language: 'uk',
  section: 'astronomy',
  order: 10,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Типи галактик',
  subtitle: 'Від спіральних рукавів до еліптичних велетнів — як Всесвіт організує зорі в острівні міста.',

  hero: {
    cacheKey: 'galaxy-types-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: a montage of four galaxy types arranged in a 2x2 grid against deep black space. ' +
      'Top-left: a grand face-on spiral galaxy with two blue-white arms and a glowing yellow core. ' +
      'Top-right: a barred spiral galaxy with a straight central bar and sweeping arms. ' +
      'Bottom-left: a smooth featureless elliptical galaxy glowing amber-orange. ' +
      'Bottom-right: an irregular galaxy with asymmetric clumps of blue star-forming regions. ' +
      'Hard sci-fi style, dark space background, each galaxy sharp and detailed. ' +
      'Add the following text labels on the image: "Spiral", "Barred Spiral", "Elliptical", "Irregular".',
    alt: 'Чотири основні типи галактик — спіральна, пересічена спіраль, еліптична та неправильна',
    caption:
      'Галактики поділяють на чотири основні морфологічні класи. Кожен клас відображає різну історію формування, вміст газу і темп народження нових зір.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Галактика — це гравітаційно зв\'язана система від мільярдів до трильйонів зір, газу, пилу і темної матерії. ' +
        'Чумацький Шлях, у якому живе наше Сонце, є однією з приблизно двох трильйонів галактик у спостережуваному Всесвіті. ' +
        'Незважаючи на таку кількість, галактики не хаотичні: вони групуються в чіткі морфологічні класи — ' +
        'настільки виразні, що вчені розпізнають їх навіть на зображеннях найглибшого космосу.',

        'У першій половині XX століття американський астроном Едвін Габбл розробив систему класифікації, ' +
        'яка досі є основою галактичної морфології. Вона відома як _камертон Габбла_: схема у формі камертона, ' +
        'де зліва розташовані еліптичні галактики, а праворуч — спіральні та пересічені спіральні. ' +
        'Що Габбл вважав еволюційною послідовністю, виявилось просто зручною класифікаційною картою: ' +
        'галактики не "перетікають" з одного типу в інший у простій послідовності.',

        'Сьогодні, коли телескоп Джеймса Вебба (JWST) дивиться на галактики, що існували в перший мільярд років після Великого Вибуху, ' +
        'ми бачимо, що класифікація Габбла доповнюється новими питаннями: чому ранні галактики були такими масивними і зрілими? ' +
        'Відповіді змінюють наше розуміння того, як взагалі формуються "острівні міста" Всесвіту.',
      ],
    },

    {
      heading: 'Камертон Габбла: логіка класифікації',
      level: 2,
      paragraphs: [
        'Схема Габбла розділяє галактики на три основні гілки. Ліва частина камертона — **еліптичні** галактики, ' +
        'позначені буквою E і числом від нуля до семи, яке відображає ступінь сплюснення: ' +
        'E0 виглядає як ідеальна куля, E7 — як виражений еліпс.',

        'Права частина розгалужується. Верхній зубець — **звичайні спіральні** галактики (клас S), ' +
        'нижній — **пересічені спіральні** (клас SB, від англійського "barred"). ' +
        'Обидві гілки поділяються на підкласи a, b, c залежно від компактності ядра та розгорнутості рукавів: ' +
        'Sa має щільне ядро і щільно закручені рукави, Sc — невелике ядро і широко розкриті рукави.',

        'У точці розгалуження — **лінзоподібні** галактики (клас S0, або SO): вони мають диск, як у спіральних, ' +
        'але майже позбавлені спіральних рукавів і газу для утворення нових зір. ' +
        'Окремо стоять **неправильні** галактики (Irr) — ті, що не вписуються в жодну з гілок камертона.',
      ],
    },

    {
      diagram: {
        title: 'Камертон Габбла — морфологічна класифікація галактик',
        svg: `<svg viewBox="0 0 720 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="320" fill="rgba(10,15,25,0.7)" rx="4"/>

  <defs>
    <marker id="gt-arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>

  <!-- Title -->
  <text x="360" y="22" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle">Морфологічна класифікація Габбла</text>

  <!-- Elliptical galaxies: E0, E3, E7 -->
  <!-- E0 - circle -->
  <ellipse cx="72" cy="160" rx="28" ry="28" fill="none" stroke="#ff8844" stroke-width="1.5" opacity="0.85"/>
  <text x="72" y="200" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">E0</text>

  <!-- E3 -->
  <ellipse cx="148" cy="160" rx="32" ry="24" fill="none" stroke="#ff8844" stroke-width="1.5" opacity="0.85"/>
  <text x="148" y="200" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">E3</text>

  <!-- E7 -->
  <ellipse cx="230" cy="160" rx="40" ry="18" fill="none" stroke="#ff8844" stroke-width="1.5" opacity="0.85"/>
  <text x="230" y="200" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">E7</text>

  <!-- S0 lenticular at fork -->
  <ellipse cx="310" cy="160" rx="34" ry="14" fill="none" stroke="#aabbcc" stroke-width="1.5" opacity="0.85"/>
  <ellipse cx="310" cy="160" rx="14" ry="14" fill="none" stroke="#aabbcc" stroke-width="1" opacity="0.5"/>
  <text x="310" y="200" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">S0</text>

  <!-- Arrow from E sequence to S0 -->
  <line x1="272" y1="160" x2="274" y2="160" stroke="#667788" stroke-width="1.2" marker-end="url(#gt-arr)"/>

  <!-- Fork lines from S0 -->
  <line x1="346" y1="152" x2="390" y2="118" stroke="#667788" stroke-width="1" opacity="0.7"/>
  <line x1="346" y1="168" x2="390" y2="202" stroke="#667788" stroke-width="1" opacity="0.7"/>

  <!-- Upper branch: Sa, Sb, Sc -->
  <!-- Sa -->
  <ellipse cx="420" cy="105" rx="30" ry="11" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.85"/>
  <ellipse cx="420" cy="105" rx="12" ry="12" fill="none" stroke="#7bb8ff" stroke-width="1" opacity="0.6"/>
  <text x="420" y="88" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Sa</text>

  <!-- Sb -->
  <ellipse cx="510" cy="80" rx="34" ry="12" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.85"/>
  <ellipse cx="510" cy="80" rx="9" ry="9" fill="none" stroke="#7bb8ff" stroke-width="1" opacity="0.6"/>
  <!-- spiral hint -->
  <path d="M510,71 Q528,71 532,80 Q528,89 510,89 Q492,89 488,80 Q492,71 510,71" fill="none" stroke="#7bb8ff" stroke-width="0.8" opacity="0.4"/>
  <text x="510" y="63" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Sb</text>

  <!-- Sc -->
  <ellipse cx="610" cy="60" rx="40" ry="13" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.85"/>
  <ellipse cx="610" cy="60" rx="6" ry="6" fill="none" stroke="#7bb8ff" stroke-width="1" opacity="0.6"/>
  <text x="610" y="43" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Sc</text>

  <!-- label S -->
  <text x="700" y="55" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="end">S (спіральні)</text>

  <!-- Lower branch: SBa, SBb, SBc -->
  <!-- SBa -->
  <ellipse cx="420" cy="215" rx="32" ry="11" fill="none" stroke="#44ff88" stroke-width="1.5" opacity="0.85"/>
  <line x1="390" y1="215" x2="450" y2="215" stroke="#44ff88" stroke-width="1.8" opacity="0.6"/>
  <ellipse cx="420" cy="215" rx="11" ry="11" fill="none" stroke="#44ff88" stroke-width="0.8" opacity="0.45"/>
  <text x="420" y="238" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">SBa</text>

  <!-- SBb -->
  <ellipse cx="510" cy="240" rx="36" ry="12" fill="none" stroke="#44ff88" stroke-width="1.5" opacity="0.85"/>
  <line x1="476" y1="240" x2="544" y2="240" stroke="#44ff88" stroke-width="2" opacity="0.6"/>
  <ellipse cx="510" cy="240" rx="8" ry="8" fill="none" stroke="#44ff88" stroke-width="0.8" opacity="0.4"/>
  <text x="510" y="263" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">SBb</text>

  <!-- SBc -->
  <ellipse cx="610" cy="262" rx="42" ry="13" fill="none" stroke="#44ff88" stroke-width="1.5" opacity="0.85"/>
  <line x1="568" y1="262" x2="652" y2="262" stroke="#44ff88" stroke-width="2.2" opacity="0.6"/>
  <ellipse cx="610" cy="262" rx="5" ry="5" fill="none" stroke="#44ff88" stroke-width="0.8" opacity="0.4"/>
  <text x="610" y="285" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">SBc</text>

  <!-- label SB -->
  <text x="700" y="280" fill="#44ff88" font-family="monospace" font-size="11" text-anchor="end">SB (пересічені)</text>

  <!-- Elliptical label -->
  <text x="148" y="270" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle">E (еліптичні)</text>

  <!-- Arrows along upper branch -->
  <line x1="452" y1="103" x2="478" y2="88" stroke="#667788" stroke-width="0.9" opacity="0.6" marker-end="url(#gt-arr)"/>
  <line x1="546" y1="76" x2="568" y2="68" stroke="#667788" stroke-width="0.9" opacity="0.6" marker-end="url(#gt-arr)"/>

  <!-- Arrows along lower branch -->
  <line x1="454" y1="218" x2="472" y2="228" stroke="#667788" stroke-width="0.9" opacity="0.6" marker-end="url(#gt-arr)"/>
  <line x1="548" y1="244" x2="566" y2="252" stroke="#667788" stroke-width="0.9" opacity="0.6" marker-end="url(#gt-arr)"/>

  <!-- Arrow E sequence -->
  <line x1="102" y1="160" x2="112" y2="160" stroke="#667788" stroke-width="0.9" opacity="0.6" marker-end="url(#gt-arr)"/>
  <line x1="184" y1="160" x2="186" y2="160" stroke="#667788" stroke-width="0.9" opacity="0.6" marker-end="url(#gt-arr)"/>

  <!-- Irr label -->
  <text x="360" y="305" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Irr (неправильні) — поза схемою</text>
</svg>`,
        caption:
          'Камертон Габбла: ліворуч — еліптичні галактики (E0-E7), у точці розгалуження — лінзоподібні (S0), ' +
          'верхній зубець — звичайні спіральні (Sa-Sc), нижній — пересічені спіральні (SBa-SBc). ' +
          'Неправильні галактики знаходяться поза схемою.',
      },
    },

    {
      heading: 'Спіральні та пересічені спіральні галактики',
      level: 2,
      paragraphs: [
        'Спіральні галактики — це, мабуть, найвпізнаваніші об\'єкти у Всесвіті. ' +
        'Плоский диск з рукавами, що закручуються навколо яскравого центрального балджу, ' +
        'є саме тим образом, який спадає на думку при слові "галактика". ' +
        'Чумацький Шлях — спіральна галактика. Андромеда — спіральна галактика. ' +
        'Оцінки кажуть, що спіральні і пересічені спіральні разом складають більше половини всіх великих галактик у сучасному Всесвіті.',

        'У **пересічених спіральних** (SB) рукави не відходять безпосередньо від центрального балджу — ' +
        'між ними є пряма перемичка (бар), що проходить через ядро. ' +
        'Бар каналізує газ до центру, підживлюючи утворення зір і, можливо, центральну чорну діру. ' +
        'Дослідження останніх десятиліть встановили, що Чумацький Шлях теж є пересіченою спіраллю: ' +
        'через нашу позицію всередині галактики бар видно лише в радіо та інфрачервоному діапазонах.',

        'Спіральні рукави — не жорсткі структури: зорі не застрягають у них назавжди. ' +
        'Рукави — це _хвилі щільності_: ділянки, де гравітаційне стиснення підвищене, ' +
        'а отже, там активніше народжуються нові зорі. ' +
        'Молоді гарячі блакитно-білі зорі роблять рукави яскравими навіть попри те, ' +
        'що вони швидко "вибігають" з рукава за зоряний стандарт часу.',
      ],
    },

    {
      image: {
        cacheKey: 'galaxy-types-spiral-barred',
        prompt:
          'Photorealistic illustration for a science encyclopedia: two galaxies side by side against deep black space. ' +
          'Left: a classic face-on unbarred spiral galaxy (type Sc) with open, sweeping blue-white arms and a compact golden nucleus, faint dust lanes. ' +
          'Right: a barred spiral galaxy (type SBb) with a prominent straight glowing bar through the center, arms emerging from bar ends, active star formation shown as blue-white knots. ' +
          'Hard sci-fi style scientific illustration, dark background, labels in monospace font. ' +
          'Add the following text labels on the image: "Spiral (S)", "Barred Spiral (SB)", "bar", "spiral arm", "bulge".',
        alt: 'Порівняння звичайної спіральної та пересіченої спіральної галактики',
        caption:
          'Зліва — класична спіральна галактика, рукави відходять безпосередньо від балджу. ' +
          'Справа — пересічена спіральна: рукави починаються від кінців прямої перемички через центр. ' +
          'Чумацький Шлях належить до пересіченого типу.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Еліптичні та лінзоподібні галактики',
      level: 2,
      paragraphs: [
        '**Еліптичні** галактики — гладкі, майже позбавлені холодного газу і пилу. ' +
        'Вони не мають спіральних рукавів, а їх зорі — переважно старі, жовтуваті й помаранчеві. ' +
        'Темп народження нових зір у них мінімальний: майже весь газ або вже витрачено, ' +
        'або вигнано у ранніх зіткненнях з іншими галактиками.',

        'Клас E0 — майже ідеальна куля з мільярдів старих зір. ' +
        'Клас E7 — сильно видовжений еліпс. ' +
        'Найбільші відомі галактики у Всесвіті — **гіганські еліптичні** (cD-галактики) у центрах скупчень: ' +
        'вони містять трильйони зір і виникли внаслідок поглинання сотень менших галактик. ' +
        'Прикладом є M87 — галактика у скупченні Діви, в ядрі якої міститься надмасивна чорна діра, ' +
        'тінь якої у 2019 році вперше сфотографував телескоп Event Horizon Telescope.',

        '**Лінзоподібні** галактики (S0) займають проміжне місце: у них є диск, ' +
        'але він позбавлений структури спіральних рукавів. ' +
        'Їх часто описують як "спіральні, з яких вийшов газ": гравітаційна взаємодія в щільному середовищі скупчення ' +
        'може "видути" газ з галактики — і вона стає схожою на S0.',
      ],
    },

    {
      image: {
        cacheKey: 'galaxy-types-elliptical-giant',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a massive giant elliptical galaxy (cD type) at the center of a galaxy cluster against deep black space. ' +
          'Central galaxy is a huge smooth amber-orange ellipsoid glowing brightest at center, surrounded by dozens of smaller galaxies of various types at different distances. ' +
          'Faint intracluster light visible as a diffuse glow between galaxies. Hard sci-fi style, scientifically accurate. ' +
          'Add the following text labels on the image: "giant elliptical (cD)", "galaxy cluster", "intracluster light".',
        alt: 'Гіганська еліптична галактика в центрі скупчення — оточена десятками менших галактик',
        caption:
          'Гіганські еліптичні галактики типу cD займають центри масивних скупчень. ' +
          'Вони формуються через мільярди років поглинання сусідніх галактик і можуть містити трильйони зір.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Карликові та неправильні галактики',
      level: 2,
      paragraphs: [
        'Більшість галактик у Всесвіті за кількістю — **карликові**: невеликі, від кількох мільйонів до кількох мільярдів зір. ' +
        'Вони зустрічаються в усіх морфологічних варіантах — карликові еліптичні, карликові спіральні, ' +
        'карликові неправильні — але окремо виділяють **карликові сфероїдальні** (dSph): ' +
        'вкрай тьмяні супутники більших галактик, переважно зі старими зорями і мінімумом газу.',

        'Найближчі сусіди Чумацького Шляху — Великі та Малі Магелланові Хмари — є **неправильними карликовими** галактиками: ' +
        'вони не мають чіткої симетрії, а їх форма деформована припливними силами з боку нашої Галактики. ' +
        'Вони видні з Південної півкулі неозброєним оком як яскраві хмарки поблизу Молочного Шляху.',

        '**Неправильні** галактики (Irr) — це клас для всього, що не потрапляє до еліптичних чи спіральних. ' +
        'Іноді неправильна форма — результат нещодавнього злиття або гравітаційного збурення. ' +
        'Іноді — ознака молодої, хаотичної галактики, що ще не встигла упорядкуватись. ' +
        'Багато галактик раннього Всесвіту, які бачить JWST, схожі саме на неправильні — ' +
        'вони ще не набули тієї симетрії, яка характерна для спіральних.',
      ],
    },

    {
      heading: 'Активні галактики: коли чорна діра "кричить"',
      level: 2,
      paragraphs: [
        'Усі великі галактики мають у центрі надмасивну чорну діру. ' +
        'Але в більшості з них — включно з нашим Чумацьким Шляхом — ця чорна діра зараз "мовчить": ' +
        'вона не поглинає матерію активно і не виробляє яскравого випромінювання. ' +
        'У **активних галактик** (або галактик з _активним галактичним ядром_, скорочено AGN) ' +
        'чорна діра активно акрецює — поглинає оточуючий газ — і при цьому випромінює колосальну кількість енергії.',

        '**Квазари** — найяскравіші з активних галактичних ядер. ' +
        'У середині XX століття радіоастрономія виявила яскраві точкові джерела, схожі на зорі, ' +
        'але з незрозумілими спектрами. Розшифрувавши червоне зміщення, астрономи встановили: ' +
        'ці "зорі" перебувають на відстанях у мільярди світлових років. ' +
        'Щоб бути видимими з такої відстані, вони повинні бути яскравішими за цілі галактики в тисячі разів. ' +
        'Квазари — це надмасивні чорні діри, що поглинають матерію на ранніх етапах Всесвіту.',

        '**Сейфертівські галактики** — слабкіша версія квазарів. Це спіральні або еліптичні галактики ' +
        'з особливо яскравим і мінливим ядром. Їх ядра змінюють яскравість упродовж днів або тижнів — ' +
        'що вказує на компактний, менш ніж кілька світлових днів за розміром, джерело випромінювання. ' +
        '**Блазари** — різновид активних ядер, де релятивістський джет (струмінь плазми, розігнаної майже до швидкості світла) ' +
        'спрямований майже точно на Землю: тому ми бачимо надзвичайно яскраве і змінне випромінювання. ' +
        'Вони є потужними джерелами гамма-випромінювання і зафіксовані серед найвіддаленіших об\'єктів, відомих науці.',
      ],
    },

    {
      image: {
        cacheKey: 'galaxy-types-quasar-jet',
        prompt:
          'Photorealistic illustration for a science encyclopedia: an active galactic nucleus — quasar with relativistic jet. ' +
          'Central brilliant white-blue point source (accretion disk around supermassive black hole) surrounded by a glowing torus of hot orange-red gas. ' +
          'A narrow collimated relativistic plasma jet shoots outward from the poles in vivid blue-white extending far into black space, ' +
          'creating a diffuse lobe at the jet terminus. Host galaxy faintly visible as amber haze around the core. ' +
          'Hard sci-fi scientific style, dark space background, dramatic lighting. ' +
          'Add the following text labels on the image: "accretion disk", "supermassive black hole", "relativistic jet", "hot gas torus".',
        alt: 'Активне галактичне ядро — квазар з акреційним диском і релятивістським джетом',
        caption:
          'Активне галактичне ядро: надмасивна чорна діра у центрі оточена диском розігрітого газу. ' +
          'Частина матерії викидається у вигляді вузького релятивістського джета на відстані, що перевищують розміри самої галактики.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Скупчення, надскупчення і велика структура',
      level: 2,
      paragraphs: [
        'Галактики не самотні. Вони збираються у **групи** (кілька десятків галактик, як Місцева Група, ' +
        'до якої входять Чумацький Шлях, Андромеда та понад п\'ятдесят менших галактик) ' +
        'і у **скупчення** (від сотень до тисяч галактик, утримуваних спільною гравітацією).',

        'Скупчення, своєю чергою, входять до **надскупчень** — найбільших гравітаційно пов\'язаних структур у Всесвіті. ' +
        'Місцева Група є частиною надскупчення Ланіакея — колосального утворення з маси понад сто квінтильйонів сонячних мас ' +
        'і розміром понад п\'ятсот мегапарсек. ' +
        'Ланіакея охоплює тисячі галактичних груп і скупчень, з\'єднаних _нитками_ темної матерії та гарячого газу. ' +
        'Між нитками — грандіозні порожнечі, де галактик майже немає.',

        'Ця структура — нитки, стіни, вузли, порожнечі — відома як **космічна павутина**. ' +
        'Вона виникла з крихітних флуктуацій густини в перші частки секунди після Великого Вибуху. ' +
        'Темна матерія служила "каркасом": гравітація стягувала звичайну речовину уздовж ниток темної матерії, ' +
        'формуючи галактики саме там, де нитки перетинаються.',
      ],
    },

    {
      image: {
        cacheKey: 'galaxy-types-cosmic-web',
        prompt:
          'Photorealistic illustration for a science encyclopedia: large-scale structure of the universe — the cosmic web. ' +
          'Vast three-dimensional network of dark matter filaments glowing faint blue-white against near-black space background, ' +
          'with galaxy clusters appearing as bright nodes at filament intersections, ' +
          'large dark voids between filaments with almost no galaxies. ' +
          'View as if looking through a cosmological simulation volume spanning hundreds of megaparsecs. ' +
          'Hard sci-fi scientific style, dramatic depth and scale. ' +
          'Add the following text labels on the image: "filament", "galaxy cluster node", "cosmic void".',
        alt: 'Космічна павутина — велика структура Всесвіту з нитками, вузлами-скупченнями і порожнечами',
        caption:
          'Велика структура Всесвіту нагадує тривимірну губку. Галактики концентруються у вузлах і вздовж ниток, ' +
          'де перетинається темна матерія. Між нитками — велетенські порожнечі діаметром до кількох сотень мегапарсек.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Злиття галактик: Чумацький Шлях і Андромеда',
      level: 2,
      paragraphs: [
        'Галактики не статичні: вони рухаються одна відносно одної і зіштовхуються. ' +
        'Злиття — один з головних механізмів, що формує морфологію галактик. ' +
        'Коли дві спіральні галактики зіштовхуються, припливні сили розривають їх рукави, ' +
        'газові хмари стискаються і породжують спалахи зореутворення — _starburst_ галактики. ' +
        'Зрештою, після кількох проходжень крізь одна одну, вони зливаються в єдину еліптичну або лінзоподібну галактику.',

        'Таке майбутнє чекає і нашу Галактику. Андромеда (М31) рухається до Чумацького Шляху зі швидкістю близько ' +
        'ста десяти кілометрів за секунду. Приблизно через чотири мільярди років відбудеться перший серйозний зближення, ' +
        'а через шість-сім мільярдів років обидві галактики остаточно зіллються. ' +
        'Нова система — яку жартома називають "Молочромедою" — скоріш за все матиме форму еліптичної галактики.',

        'Зорі у таких зіткненнях майже ніколи не стикаються безпосередньо: відстані між ними занадто великі. ' +
        'Але газ ущільнюється, гравітаційні поля переплітаються — і виникають нові покоління зір. ' +
        'Наше Сонце, ймовірно, навіть не помітить цього злиття в масштабах власної орбіти навколо Галактики: ' +
        'воно може перейти на нову орбіту, але ніяк не буде знищено.',
      ],
    },

    {
      diagram: {
        title: 'Послідовність злиття галактик: Чумацький Шлях і Андромеда',
        svg: `<svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="200" fill="rgba(10,15,25,0.7)" rx="4"/>

  <defs>
    <marker id="gt-merge-arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>

  <!-- Stage 1: current -->
  <!-- Milky Way -->
  <ellipse cx="72" cy="100" rx="36" ry="12" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.9"/>
  <ellipse cx="72" cy="100" rx="12" ry="12" fill="none" stroke="#7bb8ff" stroke-width="1" opacity="0.5"/>
  <!-- Andromeda -->
  <ellipse cx="125" cy="100" rx="32" ry="11" fill="none" stroke="#ff8844" stroke-width="1.5" opacity="0.9"/>
  <ellipse cx="125" cy="100" rx="10" ry="10" fill="none" stroke="#ff8844" stroke-width="1" opacity="0.5"/>
  <text x="98" y="135" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Сьогодні</text>
  <text x="98" y="148" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~2.5 млн св. рр.</text>

  <!-- Arrow 1 -->
  <line x1="162" y1="100" x2="194" y2="100" stroke="#667788" stroke-width="1.2" marker-end="url(#gt-merge-arr)"/>
  <text x="178" y="90" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~4 млрд рр.</text>

  <!-- Stage 2: first close encounter -->
  <ellipse cx="250" cy="95" rx="34" ry="14" fill="none" stroke="#7bb8ff" stroke-width="1.3" opacity="0.8"/>
  <ellipse cx="270" cy="108" rx="28" ry="11" fill="none" stroke="#ff8844" stroke-width="1.3" opacity="0.8"/>
  <!-- tidal tails hint -->
  <path d="M220,90 Q200,75 185,68" fill="none" stroke="#7bb8ff" stroke-width="0.8" opacity="0.5" stroke-dasharray="3,2"/>
  <path d="M298,110 Q318,122 330,128" fill="none" stroke="#ff8844" stroke-width="0.8" opacity="0.5" stroke-dasharray="3,2"/>
  <text x="258" y="138" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Перше зближення</text>
  <text x="258" y="151" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">припливні хвости</text>

  <!-- Arrow 2 -->
  <line x1="308" y1="100" x2="340" y2="100" stroke="#667788" stroke-width="1.2" marker-end="url(#gt-merge-arr)"/>
  <text x="324" y="90" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~2 млрд рр.</text>

  <!-- Stage 3: merging chaos -->
  <ellipse cx="410" cy="100" rx="42" ry="25" fill="none" stroke="#aabbcc" stroke-width="1.3" opacity="0.7"/>
  <!-- chaotic inner structure -->
  <ellipse cx="400" cy="96" rx="20" ry="10" fill="none" stroke="#7bb8ff" stroke-width="0.8" opacity="0.5" stroke-dasharray="4,2"/>
  <ellipse cx="420" cy="106" rx="18" ry="9" fill="none" stroke="#ff8844" stroke-width="0.8" opacity="0.5" stroke-dasharray="4,2"/>
  <!-- starburst dots -->
  <circle cx="395" cy="88" r="2" fill="#44ff88" opacity="0.8"/>
  <circle cx="425" cy="112" r="2" fill="#44ff88" opacity="0.8"/>
  <circle cx="408" cy="95" r="1.5" fill="#44ff88" opacity="0.6"/>
  <text x="410" y="142" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Злиття + starburst</text>
  <text x="410" y="155" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">нові зорі</text>

  <!-- Arrow 3 -->
  <line x1="456" y1="100" x2="488" y2="100" stroke="#667788" stroke-width="1.2" marker-end="url(#gt-merge-arr)"/>
  <text x="472" y="90" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~1 млрд рр.</text>

  <!-- Stage 4: final elliptical -->
  <ellipse cx="570" cy="100" rx="45" ry="32" fill="none" stroke="#ff8844" stroke-width="1.8" opacity="0.85"/>
  <ellipse cx="570" cy="100" rx="20" ry="14" fill="none" stroke="#ff8844" stroke-width="0.8" opacity="0.4"/>
  <text x="570" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">"Молочромеда"</text>
  <text x="570" y="161" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">еліптична</text>

  <!-- Time axis label -->
  <text x="360" y="188" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">→ час (~7 мільярдів років до завершення злиття)</text>
</svg>`,
        caption:
          'Спрощена послідовність злиття Чумацького Шляху та Андромеди. ' +
          'Після кількох мільярдів років зближення і перших проходжень галактики зіллються в одну еліптичну систему. ' +
          'Зорі при цьому практично не зіштовхуються — занадто великі відстані між ними.',
      },
    },

    {
      heading: 'JWST і галактики раннього Всесвіту',
      level: 2,
      paragraphs: [
        'Телескоп Джеймса Вебба, запущений у 2021 році, змінив наше розуміння ранніх галактик. ' +
        'До його запуску вважалося, що великі зрілі галактики не могли сформуватися так швидко — ' +
        'для побудови трильйонів зір потрібний час. ' +
        'Але вже перші знімки JWST 2022 року показали масивні, яскраво-червоні галактики ' +
        'у перший мільярд років існування Всесвіту — що стало несподіванкою для теоретиків.',

        'У 2023-2025 роках JWST систематично підтвердив: галактики, що існували, ' +
        'коли Всесвіту було менше п\'ятисот мільйонів років, нерідко мають маси, ' +
        'порівнянні з масою сучасного Чумацького Шляху — хоча за стандартними моделями ' +
        'вони мали бути значно менші. Деякі з них вже мають структуру, близьку до дискових галактик, ' +
        'а не хаотичних хмар.',

        'JWST виявив галактики з рекордним червоним зміщенням — об\'єкти, ' +
        'що існували менш ніж через триста-чотириста мільйонів років після Великого Вибуху. ' +
        'Це найдальші з відомих нам галактик. Їх спектри розкривають склад зоряних популяцій, ' +
        'присутність пилу й навіть ознаки активних галактичних ядер у найбільш ранніх структурах Всесвіту. ' +
        'Кожне нове відкриття JWST спонукає теоретиків переглядати моделі формування галактик — ' +
        'і це, ймовірно, триватиме ще кілька десятиліть.',
      ],
    },

    {
      image: {
        cacheKey: 'galaxy-types-jwst-early-universe',
        prompt:
          'JWST-style deep field image showing dozens of galaxies at various distances against deep black space. ' +
          'Foreground: a few large resolved spiral and elliptical galaxies with distinct structure. ' +
          'Midground and background: progressively smaller and redder galaxies, some showing irregular morphology, some as faint smudges. ' +
          'Several very distant galaxies appear as tiny red or pink dots or elongated blobs. ' +
          'Diffraction spikes on bright nearby stars visible. ' +
          'Infrared false-color aesthetic, detailed, scientifically accurate. ' +
          'Add the following text labels on the image: "nearby galaxy", "distant galaxy (redshifted)", "early universe galaxy".',
        alt: 'Глибоке поле JWST — галактики різних епох від сусідніх до найдальших у видимому Всесвіті',
        caption:
          'Глибокі поля JWST показують галактики одночасно з багатьох епох: ближні — з деталізованою структурою, ' +
          'найдальніші — крихітними червоними плямками, що існували менш ніж через мільярд років після Великого Вибуху.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Камертон Габбла',
      definition:
        'Схема морфологічної класифікації галактик, запропонована Едвіном Габблом у першій половині XX століття. Має форму камертона: зліва — еліптичні галактики (E0-E7), праворуч — лінзоподібні (S0), спіральні (S) та пересічені спіральні (SB).',
    },
    {
      term: 'Балдж',
      definition:
        'Центральне сферичне або еліпсоїдне потовщення галактики, що містить переважно старі зорі та надмасивну чорну діру. У спіральних галактиках балдж виступає над площиною диска.',
    },
    {
      term: 'Хвиля щільності',
      definition:
        'Гравітаційна хвиля, що проходить крізь диск галактики і стискає газ та зорі у спіральні рукави. Зорі не "застрягають" у рукаві — вони лише ущільнюються при проходженні хвилі.',
    },
    {
      term: 'Активне галактичне ядро',
      definition:
        'Яскраве центральне джерело випромінювання в галактиці, зумовлене акрецією речовини на надмасивну чорну діру. Може проявлятись як квазар, сейфертівська галактика або блазар залежно від потужності та кута спостереження.',
    },
    {
      term: 'Квазар',
      definition:
        'Надяскраве активне галактичне ядро, помітне на мільярди світлових років. Назва походить від англійського "quasi-stellar object" — "квазізоряний об\'єкт": у перших спостереженнях вони виглядали як зорі, але мали нетипові спектри з великим червоним зміщенням.',
    },
    {
      term: 'Блазар',
      definition:
        'Різновид активного галактичного ядра, у якого релятивістський джет спрямований майже точно до спостерігача на Землі. Блазари є надзвичайно яскравими і мінливими джерелами — від радіо до гамма-діапазону.',
    },
    {
      term: 'Космічна павутина',
      definition:
        'Велика структура Всесвіту: мережа ниток темної матерії та газу, вздовж яких розташовані галактики. У вузлах ниток знаходяться масивні скупчення галактик, між нитками — майже порожні войди.',
    },
    {
      term: 'Надскупчення',
      definition:
        'Найбільша гравітаційно пов\'язана структура у Всесвіті — об\'єднання кількох скупчень і груп галактик. Місцева Група є частиною надскупчення Ланіакея розміром понад п\'ятсот мегапарсек.',
    },
    {
      term: 'Старберст',
      definition:
        'Аномально високий темп утворення нових зір у галактиці, як правило спричинений зіткненням або злиттям з іншою галактикою. Газові хмари ущільнюються, і зорі формуються у сотні або тисячі разів інтенсивніше, ніж у звичайних умовах.',
    },
  ],

  quiz: [
    {
      question: 'Чим відрізняється пересічена спіральна галактика (SB) від звичайної спіральної (S)?',
      options: [
        'У пересіченої спіральної більше рукавів',
        'У пересіченої спіральної є пряма перемичка (бар) через центр, від кінців якої відходять рукави',
        'Пересічені спіральні містять лише старі зорі, а звичайні — лише молоді',
        'У пересіченої спіральної немає центральної чорної діри',
      ],
      correctIndex: 1,
      explanation:
        'У пересіченій спіральній галактиці рукави відходять не безпосередньо від балджу, а від кінців прямої перемички (бару), що проходить через ядро. Бар концентрує газ у центрі і посилює зореутворення. Чумацький Шлях є пересіченою спіраллю типу SBbc.',
    },
    {
      question: 'Що таке квазар?',
      options: [
        'Надяскрава зоря у центрі нашої Галактики',
        'Компактна нейтронна зоря, що випромінює радіоімпульси',
        'Надяскраве активне галактичне ядро — надмасивна чорна діра, що активно поглинає речовину',
        'Зіткнення двох галактик з утворенням зоряного вибуху',
      ],
      correctIndex: 2,
      explanation:
        'Квазар — це активне галактичне ядро з надмасивною чорною дірою, що поглинає величезну кількість речовини й виробляє при цьому більше енергії, ніж уся галактика разом узята. Квазари видні на відстанях у мільярди світлових років і є одними з найяскравіших об\'єктів у Всесвіті.',
    },
    {
      question: 'Що відбудеться, коли Чумацький Шлях і Андромеда зіллються приблизно через шість-сім мільярдів років?',
      options: [
        'Усі зорі в обох галактиках зіткнуться і вибухнуть',
        'Обидві галактики стануть карликовими через втрату маси',
        'Утвориться нова велика еліптична галактика, зорі практично не зіткнуться',
        'Андромеда поглине Чумацький Шлях, залишившись спіральною',
      ],
      correctIndex: 2,
      explanation:
        'При злитті двох спіральних галактик зорі майже ніколи не стикаються напряму — відстані між ними занадто великі. Натомість гравітаційна взаємодія переводить зорі на нові орбіти, газ ущільнюється, виникає спалах зореутворення, а кінцевим результатом є, як правило, еліптична галактика. Наше Сонце лише зміниться орбітою в нової галактиці.',
    },
    {
      question: 'Чим JWST здивував астрономів, коли почав спостерігати ранні галактики у 2022-2025 роках?',
      options: [
        'Виявилось, що в ранньому Всесвіті галактик майже не було',
        'Масивні зрілі галактики виявились набагато меншими, ніж передбачали теорії',
        'Виявились масивні галактики вже в перший мільярд років після Великого Вибуху — набагато раніше, ніж очікували',
        'Галактики раннього Всесвіту виявились ідентичними до сучасних за формою',
      ],
      correctIndex: 2,
      explanation:
        'Стандартні моделі формування галактик передбачали, що масивні зрілі системи утворюються поступово протягом мільярдів років. JWST виявив, що великі й навіть морфологічно зрілі галактики існували вже в перший мільярд років після Великого Вибуху — це змусило теоретиків переглядати моделі зоряного та галактичного формування.',
    },
    {
      question: 'До якого типу належить наш Чумацький Шлях?',
      options: [
        'Еліптична галактика класу E3',
        'Пересічена спіральна галактика',
        'Неправильна галактика',
        'Лінзоподібна галактика S0',
      ],
      correctIndex: 1,
      explanation:
        'Чумацький Шлях є пересіченою спіральною галактикою: через центр проходить перемичка (бар), від кінців якої відходять спіральні рукави. Це встановили в другій половині XX століття завдяки радіо- та інфрачервоним спостереженням, які дозволяють "бачити" крізь пил диска до галактичного центру.',
    },
  ],

  sources: [
    {
      title: 'Hubble E.P. — Extragalactic nebulae (1926)',
      url: 'https://ui.adsabs.harvard.edu/abs/1926ApJ....64..321H',
      meta: 'ApJ 64, 321, 1926 — original classification paper',
    },
    {
      title: 'NASA — Galaxy Classification (Hubble Tuning Fork)',
      url: 'https://science.nasa.gov/universe/galaxies/',
      meta: 'NASA Science, official overview, updated 2025',
    },
    {
      title: 'Event Horizon Telescope — M87* black hole image',
      url: 'https://eventhorizontelescope.org/press-release-april-10-2019',
      meta: 'EHT Collaboration, ApJL, 2019',
    },
    {
      title: 'NASA JWST — First Deep Field (SMACS 0723)',
      url: 'https://www.nasa.gov/image-feature/goddard/2022/nasa-s-webb-delivers-deepest-infrared-image-of-universe-ever',
      meta: 'NASA Webb press release, July 2022',
    },
    {
      title: 'Labbe I. et al. — Massive galaxies within 500 Myr of Big Bang (JWST)',
      url: 'https://www.nature.com/articles/s41586-023-05786-2',
      meta: 'Nature, 616, 266–269, 2023',
    },
    {
      title: 'Tully R.B. et al. — The Laniakea supercluster of galaxies',
      url: 'https://www.nature.com/articles/nature13674',
      meta: 'Nature, 513, 71–73, 2014',
    },
    {
      title: 'Cox T.J., Loeb A. — The collision between the Milky Way and Andromeda',
      url: 'https://academic.oup.com/mnras/article/386/1/461/1747741',
      meta: 'MNRAS, 386, 461–474, 2008',
    },
    {
      title: 'Conselice C.J. — The evolution of galaxy structure over cosmic time',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev-astro-081913-040037',
      meta: 'ARA&A, 52, 291–337, 2014',
    },
    {
      title: 'Springel V. et al. — Simulations of the formation, evolution and clustering of galaxies',
      url: 'https://www.nature.com/articles/nature03597',
      meta: 'Nature, 435, 629–636, 2005 — Millennium Simulation',
    },
    {
      title: 'NASA JWST Science — Galaxy Formation and Evolution',
      url: 'https://science.nasa.gov/mission/webb/galaxies/',
      meta: 'NASA Webb science overview, 2025',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
