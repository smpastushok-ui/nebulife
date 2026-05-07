import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'stellar-evolution',
  language: 'uk',
  section: 'astrophysics',
  order: 2,
  difficulty: 'intermediate',
  readingTimeMin: 13,
  title: 'Еволюція зір',
  subtitle: 'Від хмари газу до білого карлика, нейтронної зорі або чорної діри — маса вирішує все.',

  hero: {
    cacheKey: 'stellar-evolution-hero',
    prompt:
      'Photorealistic scientific illustration of the Hertzsprung-Russell diagram rendered as a luminous star field: ' +
      'a dark space background with hundreds of stars plotted as glowing points across a diagonal band (main sequence) stretching from lower-right blue-white to upper-left, ' +
      'red giant branch visible in upper-right, white dwarf cluster in lower-left. ' +
      'Hard sci-fi style scientific illustration, wide aspect ratio. ' +
      'Add the following text labels on the image: "Main Sequence", "Red Giants", "White Dwarfs", "Supergiants".',
    alt: 'Діаграма Герцшпрунга-Рассела — зорі розподілені на головній послідовності, гілці гігантів та хмарі білих карликів',
    caption:
      'Діаграма Герцшпрунга-Рассела зводить воєдино світність і температуру зір. Більшість зір лежать на головній послідовності — доти, доки не вичерпають водень в ядрі.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Кожна зоря, що світить у нічному небі, — це термоядерний реактор на межі власного гравітаційного ' +
        'колапсу. Сила тяжіння стискає газ до центру; термоядерне горіння розпирає його назовні. Поки ці дві ' +
        'сили врівноважені, зоря перебуває в стані **гідростатичної рівноваги** і може горіти мільярди або ' +
        'навіть трильйони років. Але паливо колись закінчується — і тоді рівновага руйнується.',

        'Доля зорі після цього моменту цілком визначається однією величиною: її _початковою масою_. ' +
        'Найлегші зорі вигоряють тихо, перетворившись на вуглецево-кисневі кулі розміром із Землю. ' +
        'Масивні розривають самі себе в найяскравіших вибухах Всесвіту — а те, що від них лишається, ' +
        'стискається до меж, де звичайна фізика перестає діяти. Між цими крайнощами — ціла ' +
        'зоопарк структур і явищ, які астрофізики систематизували протягом усього двадцятого століття.',

        'Ця систематика отримала своє обличчя в перші десятиліття двадцятого століття, коли данський астроном ' +
        '_Ейнар Герцшпрунг_ і американський астроном _Генрі Норріс Рассел_ незалежно один від одного ' +
        'нанесли тисячі зір на графік «температура проти світності». Замість хаотичного розсіяння точок ' +
        'вони побачили чіткий порядок: переважна більшість зір лежала уздовж вузької смуги — **головної ' +
        'послідовності**. Цей граф, відомий як діаграма Герцшпрунга-Рассела, і досі є головним ' +
        'інструментом для розуміння зоряного життя.',
      ],
    },

    {
      diagram: {
        title: 'Діаграма Герцшпрунга-Рассела (схематична)',
        svg: `<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="420" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="70" y1="370" x2="630" y2="370" stroke="#334455" stroke-width="1.5"/>
  <line x1="70" y1="370" x2="70" y2="20" stroke="#334455" stroke-width="1.5"/>

  <!-- Axis labels -->
  <text x="350" y="400" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle">Температура поверхні (гаряче ліворуч → холодне праворуч)</text>
  <text x="20" y="200" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle" transform="rotate(-90,20,200)">Світність (відносно Сонця)</text>

  <!-- Temperature tick labels -->
  <text x="100" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">40 000 К</text>
  <text x="230" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">20 000 К</text>
  <text x="360" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">10 000 К</text>
  <text x="490" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">5 000 К</text>
  <text x="600" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">3 000 К</text>

  <!-- Main Sequence band -->
  <path d="M 100 40 Q 220 100 360 200 Q 460 270 580 350" stroke="#7bb8ff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.35"/>
  <path d="M 100 40 Q 220 100 360 200 Q 460 270 580 350" stroke="#7bb8ff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>
  <text x="270" y="145" fill="#7bb8ff" font-family="monospace" font-size="11" transform="rotate(-28,270,145)">Головна послідовність</text>

  <!-- Red Giant / Subgiant branch -->
  <path d="M 360 200 Q 420 160 530 120" stroke="#cc6633" stroke-width="2" fill="none" stroke-dasharray="5,3" opacity="0.85"/>
  <text x="490" y="108" fill="#cc6633" font-family="monospace" font-size="10">Гілка гігантів</text>

  <!-- Asymptotic Giant Branch -->
  <path d="M 530 120 Q 555 80 545 50" stroke="#ff8844" stroke-width="2" fill="none" stroke-dasharray="3,4" opacity="0.8"/>
  <text x="556" y="60" fill="#ff8844" font-family="monospace" font-size="10">АГГ</text>

  <!-- Supergiants -->
  <ellipse cx="160" cy="55" rx="55" ry="22" fill="rgba(204,68,68,0.12)" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="160" y="59" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">Надгіганти</text>

  <!-- White dwarf region -->
  <ellipse cx="390" cy="355" rx="50" ry="14" fill="rgba(123,184,255,0.1)" stroke="#88ccdd" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="390" y="359" fill="#88ccdd" font-family="monospace" font-size="10" text-anchor="middle">Білі карлики</text>

  <!-- Sun marker -->
  <circle cx="360" cy="200" r="7" fill="#ffd080" stroke="#ffa030" stroke-width="1.5"/>
  <text x="375" y="196" fill="#ffd080" font-family="monospace" font-size="10">Сонце</text>

  <!-- O B A F G K M spectral labels -->
  <text x="100" y="15" fill="#aad4ff" font-family="monospace" font-size="10" text-anchor="middle">O</text>
  <text x="180" y="15" fill="#cce0ff" font-family="monospace" font-size="10" text-anchor="middle">B</text>
  <text x="270" y="15" fill="#eeeeff" font-family="monospace" font-size="10" text-anchor="middle">A</text>
  <text x="360" y="15" fill="#ffffcc" font-family="monospace" font-size="10" text-anchor="middle">F–G</text>
  <text x="460" y="15" fill="#ffcc88" font-family="monospace" font-size="10" text-anchor="middle">K</text>
  <text x="570" y="15" fill="#ff8855" font-family="monospace" font-size="10" text-anchor="middle">M</text>
</svg>`,
        caption:
          'Діаграма Герцшпрунга-Рассела. Головна послідовність (синя смуга) — місце зір, що спалюють водень в ядрі. ' +
          'Гілка гігантів і асимптотична гілка гігантів — пізні стадії еволюції для зір проміжної маси. ' +
          'Надгіганти — область масивних зір перед вибухом наднової. Білі карлики — кінцевий залишок малих зір.',
      },
    },

    {
      heading: 'Головна послідовність: горіння заради рівноваги',
      level: 2,
      paragraphs: [
        'Зоря потрапляє на головну послідовність, коли в її ядрі починається стабільне злиття протонів — ' +
        'протон-протонний ланцюг або цикл CNO (для гарячіших зір). Чотири ядра водню перетворюються на ' +
        'одне ядро гелію, вивільняючи колосальну кількість енергії — приблизно 0,7 відсотка від маси ' +
        'спаленого водню перетворюється на чисту енергію за формулою Ейнштейна. Сонце спалює таким чином ' +
        'близько шести сотень мільйонів тонн водню щосекунди, і воно вже робить це понад чотири мільярди ' +
        'років — і матиме ще стільки ж.',

        'Час перебування зорі на головній послідовності обернено пропорційний її масі у третьому або ' +
        'четвертому ступені. Зоря вдесятеро масивніша за Сонце витрачає паливо вдесятки мільйонів разів ' +
        'швидше і живе лише кілька мільйонів років. Зоря вдесятеро легша за Сонце, навпаки, ' +
        'горітиме _триліони_ років — набагато довше, ніж сам Всесвіт існує. Ці «зорі-довгожительки» ' +
        '— так звані _червоні карлики_ з масами менше 0,5 маси Сонця — повільно і повністю конвективні: ' +
        'весь їхній водень поступово перемішується до центру і горить, не лишаючи незайманих запасів ' +
        'на периферії. Жодна з них ще не дожила до кінця свого циклу за часів існування Всесвіту.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-main-sequence-comparison',
        prompt:
          'Photorealistic scientific illustration comparing stars of different masses on the main sequence: ' +
          'five stars of dramatically different sizes side by side in space — from a tiny dim red dwarf on the left, ' +
          'a Sun-sized yellow star in the center, to a massive brilliant blue-white O-type star on the right. ' +
          'Each star labeled with relative mass and color. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "0.1 M_sun red dwarf", "1 M_sun Sun-like", "10 M_sun blue giant", "relative lifetimes shown".',
        alt: 'Порівняння зір різних мас на головній послідовності — від червоного карлика до блакитного гіганта',
        caption:
          'Маса визначає все: колір, розмір, яскравість і тривалість життя зорі. Блакитні гіганти живуть мільйони років і гинуть вибухово; червоні карлики горять трильйони років майже непомітно.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Межа Шенберга-Чандрасекара: момент зламу',
      level: 2,
      paragraphs: [
        'Водень в ядрі зорі не горить рівномірно до останнього атома. Є критичний поріг — ' +
        'так звана **межа Шенберга-Чандрасекара** — коли гелієве ядро, що накопичилось у центрі, ' +
        'вже не може підтримувати тиск виключно через теплову енергію і починає стискатися. ' +
        'Для зір з масою від 1,5 до 8 мас Сонця це відбувається різко: ядро спадає, виділяє тепло, ' +
        'оболонка зорі відповідає на це роздуванням.',

        'Зоря покидає головну послідовність і переміщується на діаграмі Герцшпрунга-Рассела вправо і вгору, ' +
        'перетворюючись на **червоного гіганта** або **червоного надгіганта**. Це не катастрофа, а ' +
        'перебудова. Горіння водню продовжується, але вже не в ядрі, а в тонкому шарі навколо нього — ' +
        'так зване _оболонкове горіння_. Саме цей шар постачає енергію для роздування зовнішніх шарів ' +
        'до розмірів, що можуть поглинати цілі планетні системи. Коли Сонце стане червоним гігантом ' +
        'приблизно через п\'ять мільярдів років, воно розшириться настільки, що поглине Меркурій і Венеру, ' +
        'а поверхня Землі стане непридатною для будь-якого відомого життя.',
      ],
    },

    {
      heading: 'Спалах гелію і асимптотична гілка гігантів',
      level: 3,
      paragraphs: [
        'Коли гелієве ядро досягає маси близько 0,45 маси Сонця і температури в кількасот мільйонів ' +
        'кельвінів, запалюється новий термоядерний процес: три ядра гелію зливаються в одне ядро ' +
        'вуглецю (потрійний альфа-процес). Для зір проміжної маси це відбувається раптово і неконтрольовано — ' +
        'так званий **спалах гелію** (helium flash). За кілька секунд вивільняється енергія, порівнянна ' +
        'з яскравістю цілої галактики, але ця енергія майже повністю поглинається зовнішніми шарами зорі ' +
        'і не виходить назовні. Зовні зоря навіть трохи тьмяніє на деякий час.',

        'Після того як горіння гелію стабілізується, зоря оселяється на так званій **горизонтальній гілці** ' +
        'діаграми. Гелій у ядрі горить значно коротше, ніж горів водень. Коли й гелій вичерпується, ' +
        'залишається ядро з вуглецю та кисню — і знову вмикається оболонкове горіння: тепер уже два ' +
        'шари — гелієвий і водневий — горять навколо вуглецево-кисневого ядра. Зоря знову розбухає ' +
        'і піднімається на **асимптотичну гілку гігантів** (скорочено — асимптотична гілка гігантів). ' +
        'Тут вона стає нестабільною: пульсує, скидає зовнішні шари у вигляді потужного зоряного вітру.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-red-giant-shell',
        prompt:
          'Photorealistic scientific cross-section illustration of a red giant star interior: ' +
          'large bloated outer envelope shown as semi-transparent orange-red gas, ' +
          'inner shell burning layers shown as bright glowing rings around a dense white carbon-oxygen core at center. ' +
          'Cutaway view showing concentric layers clearly labeled. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "hydrogen shell burning", "helium shell burning", "C/O core", "expanded envelope".',
        alt: 'Розріз червоного гіганта на асимптотичній гілці — два шари горіння навколо вуглецево-кисневого ядра',
        caption:
          'На асимптотичній гілці гігантів зоря підтримує горіння у двох шарах одночасно. Це нестабільна конфігурація: пульсації посилюються і врешті скидають зовнішню оболонку у вигляді планетарної туманності.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Кінець малих зір: планетарна туманність і білий карлик',
      level: 2,
      paragraphs: [
        'Для зір з початковою масою від 0,5 до приблизно 8 мас Сонця кінець виглядає відносно мирно. ' +
        'Зовнішні шари, розігнані пульсаціями і зоряним вітром, повільно відділяються і утворюють ' +
        '**планетарну туманність** — газову оболонку, що розширюється в навколишній простір. ' +
        'Назва «планетарна» — суто історична: в ранні телескопи ці об\'єкти нагадували диски планет, ' +
        'хоча не мають до них жодного стосунку.',

        'У центрі туманності лишається оголене вуглецево-кисневе ядро — **білий карлик**. ' +
        'Його маса порівнянна з масою Сонця, але розмір не більший за земну кулю. ' +
        'Таке ядро вже не горить: термоядерне пальне вичерпано. Воно підтримується не тиском газу, ' +
        'а виродженим тиском електронів — квантово-механічним ефектом, який забороняє двом електронам ' +
        'займати один і той самий стан. Білий карлик просто охолоджується протягом мільярдів і ' +
        'мільярдів років, поступово тьмяніючи, не вибухаючи і не колапсуючи далі. ' +
        'Теоретично через трильйони років він перетвориться на «чорний карлик» — ' +
        'холодний інертний залишок. Але Всесвіт поки що не досить старий, щоб жоден чорний карлик ' +
        'встиг утворитись.',

        'Туманність Кільце, туманність Гантелі, туманність Кішачого Ока — все це планетарні туманності ' +
        'на різних стадіях розширення. Їхнє різноманіття форм пояснюється взаємодією ' +
        'зоряного вітру з магнітними полями, обертанням і наявністю зір-супутників.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-planetary-nebula',
        prompt:
          'Photorealistic scientific illustration of a planetary nebula: a glowing shell of ionized gas in concentric rings of blue, teal and orange, ' +
          'surrounding a tiny brilliant white dwarf at the center. ' +
          'Nebula filaments and jets visible. Deep black space background with faint distant stars. ' +
          'Hard sci-fi style encyclopedia illustration. ' +
          'Add the following text labels on the image: "ionized gas shell", "white dwarf remnant", "expanding at ~20 km/s".',
        alt: 'Планетарна туманність — багатошарова газова оболонка навколо центрального білого карлика',
        caption:
          'Планетарні туманності живуть лише десятки тисяч років за космічними мірками. Потім газ розсіюється в міжзоряне середовище, збагачуючи його вуглецем і киснем — майбутнім матеріалом для нових зір і планет.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Масивні зорі: коротке і яскраве',
      level: 2,
      paragraphs: [
        'Зорі з початковою масою понад вісім мас Сонця живуть за іншим сценарієм. ' +
        'Їхні ядра достатньо гарячі, щоб послідовно запалювати все важчі елементи після того, ' +
        'як вичерпається попереднє паливо: вуглець, неон, кисень, кремній. ' +
        'Кожен наступний цикл горіння коротший за попередній — горіння кремнію в наймасивніших зорях ' +
        'триває лише кілька днів. Зоря набуває структури _«цибулини»_: концентричні шари ' +
        'все важчих елементів, у центрі — залізне ядро.',

        'Залізо — кінцева точка зоряного горіння. На відміну від усіх попередніх реакцій, ' +
        'злиття ядер заліза _поглинає_ енергію, а не вивільняє її. Коли залізне ядро досягає ' +
        'близько 1,4 маси Сонця (так звана межа Чандрасекара), виродженого тиску електронів ' +
        'більше не вистачає, щоб утримати його від колапсу. За долі секунди ядро стискається ' +
        'до ядерної щільності — приблизно трильйон тонн на кубічний сантиметр — і ' +
        'утворює нейтронну зорю або одразу чорну діру.',

        'Решта зорі падає до центру, вдаряється в нейтронне ядро і відскакує — ' +
        'вибухає **наднова типу II**. За частки секунди вивільняється більше енергії, ніж Сонце ' +
        'випромінює за весь свій десятимільярдолітній термін — переважно у вигляді нейтрино. ' +
        'Ударна хвиля розкидає зовнішні шари зорі, збагачені важкими елементами від заліза ' +
        'до урану — всіма тими атомами, без яких неможливе існування планет і живих організмів.',
      ],
    },

    {
      diagram: {
        title: 'Схема: Доля зорі залежно від маси',
        svg: `<svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr-uk" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
  <rect width="680" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- ── Row 1: Red dwarf (<0.5 M_sun) ── -->
  <circle cx="70" cy="55" r="12" fill="#cc4422" opacity="0.85"/>
  <text x="70" y="80" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">&lt; 0.5 M☉</text>
  <text x="70" y="92" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Червоний карлик</text>
  <line x1="84" y1="55" x2="200" y2="55" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <text x="142" y="48" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">горить трильйони р.</text>
  <rect x="205" y="41" width="108" height="28" rx="3" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1"/>
  <text x="259" y="58" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Гелієвий карлик</text>
  <text x="259" y="82" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">(ніколи не спостер.)</text>

  <!-- Divider -->
  <line x1="20" y1="112" x2="660" y2="112" stroke="#334455" stroke-width="0.5" stroke-dasharray="6,5" opacity="0.5"/>

  <!-- ── Row 2: Intermediate (0.5-8 M_sun) ── -->
  <circle cx="70" cy="185" r="20" fill="#ffa040" opacity="0.85"/>
  <text x="70" y="218" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">0.5–8 M☉</text>
  <text x="70" y="230" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Проміжна маса</text>

  <line x1="92" y1="185" x2="150" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <circle cx="180" cy="185" r="28" fill="#cc5522" opacity="0.8"/>
  <text x="180" y="182" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Червоний</text>
  <text x="180" y="192" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">гігант</text>

  <line x1="210" y1="185" x2="268" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <ellipse cx="300" cy="185" rx="24" ry="16" fill="none" stroke="#88ccdd" stroke-width="1.5" opacity="0.8"/>
  <text x="300" y="183" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Планет.</text>
  <text x="300" y="193" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">туманн.</text>

  <line x1="326" y1="185" x2="384" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <circle cx="408" cy="185" r="11" fill="#cdd9e8" opacity="0.9"/>
  <text x="408" y="208" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Білий</text>
  <text x="408" y="220" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">карлик</text>

  <!-- Divider -->
  <line x1="20" y1="250" x2="660" y2="250" stroke="#334455" stroke-width="0.5" stroke-dasharray="6,5" opacity="0.5"/>

  <!-- ── Row 3: Massive (>8 M_sun) ── -->
  <circle cx="70" cy="315" r="28" fill="#aad4ff" opacity="0.85"/>
  <text x="70" y="315" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Масивна</text>
  <text x="70" y="325" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">зоря</text>
  <text x="70" y="355" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">&gt; 8 M☉</text>

  <line x1="100" y1="315" x2="148" y2="315" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <circle cx="178" cy="315" r="34" fill="#992211" opacity="0.85"/>
  <text x="178" y="312" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Червоний</text>
  <text x="178" y="322" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">надгігант</text>

  <line x1="214" y1="315" x2="258" y2="315" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <circle cx="290" cy="315" r="22" fill="none" stroke="#ff8844" stroke-width="2"/>
  <circle cx="290" cy="315" r="12" fill="rgba(255,200,80,0.5)"/>
  <text x="290" y="319" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Наднова</text>

  <!-- Fork upper: neutron star -->
  <line x1="313" y1="304" x2="368" y2="276" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <circle cx="390" cy="268" r="9" fill="#7bb8ff" opacity="0.9"/>
  <text x="390" y="250" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Нейтронна</text>
  <text x="390" y="261" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">зоря</text>
  <text x="390" y="289" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1.4–3 M☉ядра</text>

  <!-- Fork lower: black hole -->
  <line x1="313" y1="326" x2="368" y2="350" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-uk)"/>
  <circle cx="390" cy="358" r="12" fill="#080c18" stroke="#cc4444" stroke-width="2"/>
  <circle cx="390" cy="358" r="3" fill="#ff8844"/>
  <text x="390" y="378" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Чорна діра</text>
  <text x="390" y="342" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">&gt; 3 M☉ ядра</text>

  <!-- Row labels -->
  <text x="478" y="55" fill="#667788" font-family="monospace" font-size="9">Тривалість: трильйони років</text>
  <text x="478" y="185" fill="#667788" font-family="monospace" font-size="9">Тривалість: мільярди років</text>
  <text x="478" y="315" fill="#667788" font-family="monospace" font-size="9">Тривалість: мільйони років</text>
</svg>`,
        caption:
          'Три основні шляхи зоряної еволюції. Для масивних зір вибух наднової — не кінець, а вилка: ' +
          'маса залишкового ядра визначає, чи утвориться нейтронна зоря (1,4–3 маси Сонця) або чорна діра (понад 3 маси Сонця).',
      },
    },

    {
      heading: 'Нейтронні зорі і пульсари',
      level: 3,
      paragraphs: [
        'Якщо маса ядра, що залишилось після вибуху наднової, лежить між 1,4 і приблизно 3 масами Сонця, ' +
        'народжується **нейтронна зоря** — об\'єкт, де вся ця маса стиснута до кулі діаметром близько ' +
        'двадцяти кілометрів. Один кубічний сантиметр нейтронної речовини важить сотні мільйонів тонн. ' +
        'Молода нейтронна зоря обертається надзвичайно швидко — збереження кутового моменту від батьківської ' +
        'зорі розкручує її до сотень обертів на секунду — і може випромінювати радіопучок вздовж своєї ' +
        'магнітної осі. Якщо цей пучок регулярно підмітає Землю, ми реєструємо **пульсар** — ' +
        'один із найточніших природних годинників у Всесвіті.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-supernova-remnant',
        prompt:
          'Photorealistic scientific illustration of a supernova remnant: expanding shock wave shell of glowing blue and orange filaments of ionized gas expanding into interstellar space, ' +
          'a tiny neutron star pulsar visible at center emitting bright blue jets. ' +
          'Wide field showing the full remnant structure. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "expanding shock wave", "neutron star pulsar", "enriched ejecta", "synchrotron radiation".',
        alt: 'Залишок наднової — розширювальна оболонка газу з нейтронною зорею в центрі',
        caption:
          'Залишки надновних — великі структури в сотні світлових років. Газ, збагачений важкими елементами, розширюється у міжзоряне середовище. Через мільйони років цей матеріал стане частиною нових зоряних систем і планет.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Що означає «зоряна еволюція» для нас',
      level: 2,
      paragraphs: [
        'Майже всі елементи важчі за гелій — вуглець, кисень, залізо, золото, кисень у воді, кальцій у кістках — ' +
        'були виготовлені в надрах зір і розкидані надновими. Зорі — це ядерні заводи Всесвіту, ' +
        'що безперервно збагачують міжзоряний газ важкими елементами. ' +
        'Кожне наступне покоління зір народжується із середовища, збагаченого попередніми — ' +
        'і тому здатне формувати все складніші планети і молекули.',

        'Наше Сонце є зорею третього або навіть четвертого покоління: у його складі є залізо і нікель, ' +
        'що утворились у надрах зір, які загинули ще до народження Сонячної системи. ' +
        'Кожен атом заліза у вашій крові пройшов через ядро принаймні однієї зорі-попередниці. ' +
        'Зоряна еволюція — це не просто астрономічна класифікація. Це генеалогія матерії.',

        'Питання, які залишаються відкритими у двадцять першому столітті: точні умови переходу ' +
        'між нейтронною зорею і чорною дірою, детальний механізм вибуху наднової ' +
        '(симуляції досі не відтворюють його повністю), ' +
        'та роль масивних зір у збагаченні ранніх галактик, ' +
        'коли ще не існувало ні планет, ні живих організмів, що б це спостерігали.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-cosmic-cycle',
        prompt:
          'Photorealistic scientific illustration of the cosmic stellar cycle: ' +
          'a circular flow diagram showing interstellar gas cloud condensing into a protostar, evolving to a main sequence star, then red giant, planetary nebula, returning enriched gas to the interstellar medium. ' +
          'Arrows connecting stages in a loop. Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "gas cloud", "protostar", "main sequence", "red giant", "nebula", "enriched ISM".',
        alt: 'Цикл зоряної речовини — від газової хмари через зорю до планетарної туманності й назад у міжзоряне середовище',
        caption:
          'Зоряний цикл: речовина між зорями конденсується в нові зорі, горить, а потім повертається у міжзоряне середовище збагаченою важкими елементами. Кожен цикл підвищує «металічність» галактики.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Головна послідовність',
      definition:
        'Смуга на діаграмі Герцшпрунга-Рассела, де розташовані зорі, що активно спалюють водень в ядрі через термоядерний синтез. Сонце перебуває на головній послідовності вже понад чотири мільярди років.',
    },
    {
      term: 'Гідростатична рівновага',
      definition:
        'Стан зорі, коли тиск газу і випромінювання зсередини точно врівноважує силу гравітаційного стиснення. Саме ця рівновага забезпечує тривале стабільне існування зорі.',
    },
    {
      term: 'Межа Шенберга-Чандрасекара',
      definition:
        'Критична частка маси зорі (~10–15%), яку може становити ізотермічне гелієве ядро, перш ніж воно почне стискатися і зоря залишить головну послідовність. Відкрита Маріо Шенбергом і Субраманьяном Чандрасекаром у середині двадцятого століття.',
    },
    {
      term: 'Спалах гелію',
      definition:
        'Раптовий і некерований початок горіння гелію через потрійний альфа-процес в ядрі зорі проміжної маси. Вивільняє колосальну кількість енергії за лічені секунди, але ця енергія поглинається зовнішніми шарами зорі.',
    },
    {
      term: 'Асимптотична гілка гігантів',
      definition:
        'Пізня стадія еволюції зір проміжної маси, на якій горіння відбувається у двох оболонкових шарах навколо вуглецево-кисневого ядра. Зоря стає нестабільною, пульсує і скидає зовнішню оболонку.',
    },
    {
      term: 'Планетарна туманність',
      definition:
        'Оболонка іонізованого газу, скинута зорею проміжної маси на стадії асимптотичної гілки гігантів. Назва помилкова (з планетами не пов\'язана): у перші телескопи ці об\'єкти нагадували планетні диски.',
    },
    {
      term: 'Білий карлик',
      definition:
        'Кінцевий залишок зорі проміжної маси: щільне вуглецево-кисневе ядро розміром із Землю, підтримуване виродженим тиском електронів. Більше не горить, а просто охолоджується мільярди років.',
    },
    {
      term: 'Нейтронна зоря',
      definition:
        'Дуже щільний залишок після вибуху наднової, якщо маса ядра становить 1,4–3 маси Сонця. Складається майже повністю з нейтронів. Діаметр — близько двадцяти кілометрів, але маса — більша за сонячну.',
    },
    {
      term: 'Межа Чандрасекара',
      definition:
        'Максимальна маса білого карлика (~1,4 маси Сонця), при якій виродженний тиск електронів ще здатен утримати зорю від гравітаційного колапсу. Перевищення цієї межі призводить до вибуху (наднова типу Ia) або подальшого колапсу.',
    },
  ],

  quiz: [
    {
      question: 'Що відбувається із зорею, коли маса її гелієвого ядра перевищує межу Шенберга-Чандрасекара?',
      options: [
        'Зоря вибухає як наднова',
        'Зоря залишає головну послідовність і починає роздуватися в червоного гіганта',
        'Гелій у ядрі миттєво спалахує через потрійний альфа-процес',
        'Зоря поступово тьмяніє і перетворюється на білий карлик',
      ],
      correctIndex: 1,
      explanation:
        'Коли ізотермічне гелієве ядро накопичує критичну масу, воно більше не може підтримувати тиск і починає стискатися, виділяючи тепло. Це розігріває оболонку і зоря розбухає, переходячи на гілку червоних гігантів.',
    },
    {
      question: 'Чому залізо є кінцевою точкою зоряного ядерного горіння?',
      options: [
        'Залізо занадто важке, щоб потрапити в ядро зорі',
        'Злиття ядер заліза поглинає енергію замість того, щоб її вивільняти',
        'Залізо розчиняється в гелії при зоряних температурах',
        'Тиск зупиняє горіння при досягненні заліза',
      ],
      correctIndex: 1,
      explanation:
        'Всі термоядерні реакції до заліза включно вивільняють енергію, бо продукти реакцій мають меншу масу спокою. Залізо має найбільшу енергію зв\'язку на нуклон — злиття ядер заліза потребує енергії, а не дає її. Тому горіння зупиняється.',
    },
    {
      question: 'Яку долю чекає Сонце після того, як воно залишить головну послідовність?',
      options: [
        'Вибухне як наднова і утворить нейтронну зорю',
        'Перетвориться на червоного надгіганта, потім одразу — на чорну діру',
        'Стане червоним гігантом, скине оболонку у вигляді планетарної туманності і залишить білий карлик',
        'Поступово охолоне на головній послідовності без будь-яких змін',
      ],
      correctIndex: 2,
      explanation:
        'Сонце має масу близько 1 маси Сонця — це типова зоря проміжної маси. Після вичерпання водню в ядрі воно стане червоним гігантом, піднімається по асимптотичній гілці гігантів, скине зовнішні шари і залишить білий карлик масою близько 0,6 маси Сонця.',
    },
    {
      question: 'Що таке пульсар?',
      options: [
        'Нестабільна зоря, що пульсує в розмірах',
        'Особливий тип білого карлика з потужним магнітним полем',
        'Нейтронна зоря, що швидко обертається і випромінює вузький радіопучок',
        'Зоря в момент спалаху гелію',
      ],
      correctIndex: 2,
      explanation:
        'Пульсари — нейтронні зорі, що обертаються до сотень разів на секунду і випромінюють вузький пучок радіохвиль вздовж магнітної осі. Якщо ця вісь нахилена відносно вектора обертання, промінь підмітає простір як маяк і ми реєструємо регулярні імпульси.',
    },
    {
      question: 'Чому ми говоримо, що «всі важкі елементи були народжені в зорях»?',
      options: [
        'Тому що важкі елементи утворились під час Великого Вибуху в зоряних умовах',
        'Тому що зорі синтезують елементи від вуглецю до заліза, а вибухи надновних — ще важчі, і розкидають їх у простір',
        'Тому що метеорити, що падають на Землю, містять зоряний матеріал',
        'Тому що ядерний синтез відбувається лише у надрах надмасивних чорних дір',
      ],
      correctIndex: 1,
      explanation:
        'Великий Вибух синтезував лише водень, гелій і незначну кількість літію. Всі важчі елементи — від вуглецю до заліза — утворились у термоядерних реакціях в ядрах зір. Елементи важчі за залізо (золото, уран) синтезуються при вибухах надновних і злиттях нейтронних зір. Розкидані у простір, ці елементи входять до складу нових зір, планет і живих організмів.',
    },
  ],

  sources: [
    {
      title: 'Hertzsprung E. — Zur Strahlung der Sterne',
      url: 'https://doi.org/10.1007/BF01443015',
      meta: 'Zeitschrift für wissenschaftliche Photographie, 3, 429–442, 1905',
    },
    {
      title: 'Russell H.N. — Relations Between the Spectra and Other Characteristics of the Stars',
      url: 'https://doi.org/10.1126/science.ns-37.955.651',
      meta: 'Science, 37, 651–652, 1913',
    },
    {
      title: 'Chandrasekhar S. — The Maximum Mass of Ideal White Dwarfs',
      url: 'https://doi.org/10.1086/143197',
      meta: 'ApJ, 74, 81–82, 1931',
    },
    {
      title: 'Schönberg M., Chandrasekhar S. — On the Evolution of the Main-Sequence Stars',
      url: 'https://doi.org/10.1086/144243',
      meta: 'ApJ, 96, 161–172, 1942',
    },
    {
      title: 'Salpeter E.E. — Nuclear Reactions in Stars Without Hydrogen',
      url: 'https://doi.org/10.1086/145971',
      meta: 'ApJ, 115, 326–328, 1952 (triple-alpha process)',
    },
    {
      title: 'Burbidge E.M. et al. — Synthesis of the Elements in Stars (B2FH)',
      url: 'https://doi.org/10.1103/RevModPhys.29.547',
      meta: 'Reviews of Modern Physics, 29, 547–650, 1957',
    },
    {
      title: 'NASA — Stellar Evolution (Science Overview)',
      url: 'https://science.nasa.gov/universe/stars/',
      meta: 'NASA Science, оновлено 2025',
    },
    {
      title: 'Woosley S., Janka T. — The Physics of Core-Collapse Supernovae',
      url: 'https://arxiv.org/abs/astro-ph/0504015',
      meta: 'Nature Physics, 1, 147–154, 2005',
    },
    {
      title: 'Lattimer J.M., Prakash M. — The Physics of Neutron Stars',
      url: 'https://doi.org/10.1126/science.1090720',
      meta: 'Science, 304, 536–542, 2004',
    },
    {
      title: 'Carroll B., Ostlie D. — An Introduction to Modern Astrophysics (2nd ed.)',
      url: 'https://www.pearson.com/en-us/subject-catalog/p/introduction-to-modern-astrophysics-an/P200000006548',
      meta: 'Pearson, 2017 — стандартний університетський підручник',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
