import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'fusion-nucleosynthesis',
  language: 'uk',
  section: 'astrophysics',
  order: 10,
  difficulty: 'advanced',
  readingTimeMin: 12,
  title: 'Зоряний термояд і нуклеосинтез',
  subtitle: 'Як зорі кують елементи з водню до заліза — і чому золото народжується не в зорях, а в зіткненні нейтронних зір.',

  hero: {
    cacheKey: 'fusion-nucleosynthesis-hero',
    prompt:
      'Photorealistic scientific illustration of stellar nucleosynthesis: a cutaway cross-section of a massive star showing concentric fusion shells labeled from center outward — iron core, silicon burning, oxygen burning, neon, carbon, helium, hydrogen — each shell glowing in a different color from white-hot center to cooler outer layers. ' +
      'Deep space background outside the star. Hard sci-fi style scientific illustration. ' +
      'Add the following text labels on the image: "iron core", "silicon shell", "oxygen shell", "carbon shell", "helium shell", "hydrogen envelope".',
    alt: 'Поперечний розріз масивної зорі з концентричними шарами термоядерного горіння від залізного ядра до водневої оболонки',
    caption:
      'Зрілий червоний надгігант схожий на цибулину: кожен шар горить своїм паливом. У центрі — мертве залізне ядро, навколо нього оболонки кремнієвого, кисневого, вуглецевого, гелієвого та водневого горіння.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Кожен атом кальцію у ваших кістках, кожен атом кисню у вашій крові, кожен атом заліза у вашому гемоглобіні — ' +
        'колись перебував всередині зорі. Не метафора, не поетичний образ, а буквальний факт ядерної фізики. ' +
        'Зорі — це єдине місце у Всесвіті, де температури і тиски достатні для того, щоб злипатися атомні ядра, ' +
        'перетворюючи легкі елементи на важкі. Цей процес називається **нуклеосинтезом**.',

        'Після Великого Вибуху Всесвіт містив майже виключно водень і гелій — з мізерними домішками літію. ' +
        'Весь інший хімічний зміст таблиці Менделєєва, від вуглецю до урану, виник пізніше — ' +
        'у надрах зір, у вибухах наднових і, як з\'ясувалось у двадцять першому столітті, ' +
        'у злиттях нейтронних зір. Ланцюжок від водню до золота охоплює мільярди років, ' +
        'покоління зір і крайній насильницький фінал їхнього існування.',

        'У середині двадцятого століття четверо вчених — Маргарет і Джеффрі Бербіджі, Вільям Фаулер і Фред Гойл — ' +
        'опублікували роботу, яка систематично описала синтез елементів у зорях. ' +
        'Цю роботу прийнято скорочено називати "Бі-два-ЕфейчГойл" (за ініціалами авторів: Бербідж, Бербідж, Фаулер, Гойл), ' +
        'і вона досі залишається одним із найцитованіших документів в астрофізиці.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-pp-chain',
        prompt:
          'Scientific diagram of the proton-proton chain reaction in the Sun: step-by-step nuclear reaction sequence showing two protons fusing to form deuterium, then helium-3, then helium-4, with gamma rays and neutrinos emitted at each step. ' +
          'Particles shown as labeled colored circles: protons red, neutrons blue, neutrinos green, gamma yellow. ' +
          'Dark space background, hard sci-fi style, monospace labels. ' +
          'Add the following text labels on the image: "proton", "deuterium", "helium-3", "helium-4", "neutrino", "gamma ray", "energy released".',
        alt: 'Схема протон-протонного ланцюга: послідовність ядерних реакцій від протонів до гелію-4 з випуском нейтрино і гамма-квантів',
        caption: 'Протон-протонний ланцюг — основний джерело енергії Сонця і всіх зір масою до 1,3 сонячної. Чотири протони перетворюються на одне ядро гелію-4, два позитрони, два нейтрино і гамма-кванти.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Два шляхи до гелію',
      level: 2,
      paragraphs: [
        'Термоядерний синтез у зорях — це гра ймовірностей. Ядра однакового заряду відштовхуються ' +
        'електромагнітно, і лише квантовий тунельний ефект дозволяє їм зближатись достатньо, ' +
        'щоб спрацювало сильне ядерне притягання. При температурах порядку десяти-п\'ятнадцяти мільйонів ' +
        'градусів Цельсія — типових для ядра нашого Сонця — це відбувається достатньо часто, ' +
        'щоб підтримувати зорю.',

        'Для зір з масою приблизно до 1,3 сонячної основним є **протон-протонний ланцюг**: ' +
        'два протони зливаються в дейтерій, дейтерій з протоном дає гелій-три, ' +
        'два ядра гелій-три об\'єднуються в гелій-чотири і два вільних протони. ' +
        'Чотири протони на вході — одне ядро гелію-4 на виході. ' +
        'Різниця мас, помножена на квадрат швидкості світла — це і є та сама зоряна енергія, ' +
        'що обігріває нашу планету.',

        'Для більш масивних зір (починаючи приблизно від 1,3 сонячної маси) переважає ' +
        '**цикл вуглець-азот-кисень**: вуглець-дванадцять виступає каталізатором, ' +
        'послідовно приймаючи і повертаючи протони через проміжні ядра азоту та кисню. ' +
        'Чистий результат той самий — чотири протони перетворюються на один гелій-4. ' +
        'Але цикл вуглець-азот-кисень надзвичайно чутливий до температури: ефективність зростає ' +
        'пропорційно температурі у сімнадцятому ступені. Тому масивні гарячі зорі ' +
        'виробляють енергію набагато інтенсивніше, ніж Сонце, і живуть у сотні разів коротше.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-cno-cycle',
        prompt:
          'Scientific diagram of the carbon-nitrogen-oxygen cycle: circular reaction sequence showing carbon-12 nucleus as catalyst, sequential proton capture steps producing nitrogen-13, carbon-13, nitrogen-14, oxygen-15, nitrogen-15, and releasing helium-4 plus positrons and neutrinos. ' +
          'Circular layout with arrows, particles as labeled colored dots, dark background. Hard sci-fi style, monospace labels. ' +
          'Add the following text labels on the image: "C-12 catalyst", "N-13", "C-13", "N-14", "O-15", "N-15", "He-4 released", "proton input".',
        alt: 'Схема циклу вуглець-азот-кисень: вуглець-12 як каталізатор послідовно поглинає протони і повертає гелій-4',
        caption: 'Цикл вуглець-азот-кисень домінує в зорях масивніших за 1,3 сонячної маси. Ядро вуглецю-12 слугує каталізатором і залишається незмінним після кожного циклу — воно лише прискорює реакцію.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Гелієвий флеш і потрійна альфа',
      level: 2,
      paragraphs: [
        'Коли запас водню у ядрі зорі виснажується, гравітація стискає ядро, розігріваючи його ' +
        'до приблизно ста мільйонів градусів. При цій температурі вмикається нова реакція — ' +
        '**потрійна альфа-реакція**: три ядра гелію-4 (які у фізиці традиційно називають ' +
        '"альфа-частинками") зливаються в одне ядро вуглецю-дванадцять.',

        'Ця реакція надзвичайно цікава з фізичної точки зору. Пряме злиття двох ядер гелію-4 ' +
        'дає нестабільний берилій-вісім, що розпадається за час порядку часток секунди. ' +
        'Але якщо рівно в цей момент поруч є третє ядро гелію-4, може статися злиття — ' +
        'і утвориться вуглець-дванадцять. Фред Гойл у п\'ятдесятих роках двадцятого століття ' +
        'передбачив, що для цього вуглець-12 повинен мати спеціальний збуджений енергетичний рівень, ' +
        'без якого реакція була б надто рідкісною. Фізики перевірили — і рівень справді існував. ' +
        'Це один з найяскравіших прикладів теоретичного передбачення, підтвердженого лабораторією.',

        'Зорі, подібні до Сонця, стають на цьому етапі червоними гігантами. Гелієве ядро раптово ' +
        'спалахує — так звана "гелієва спалах" — і стабілізується. Зоря кілька сотень мільйонів ' +
        'років спалює гелій у вуглець і кисень, після чого скидає зовнішні шари як ' +
        'планетарну туманність і гасне, залишаючи білий карлик.',
      ],
    },

    {
      diagram: {
        title: 'Крива ядерної стійкості: енергія зв\'язку на нуклон',
        svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="60" y1="260" x2="640" y2="260" stroke="#334455" stroke-width="1.5"/>
  <line x1="60" y1="260" x2="60" y2="20" stroke="#334455" stroke-width="1.5"/>

  <!-- Axis labels -->
  <text x="350" y="290" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle">Масове число (кількість нуклонів)</text>
  <text x="18" y="145" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle" transform="rotate(-90 18 145)">Енергія зв’язку (МеВ/нуклон)</text>

  <!-- Binding energy curve — approximate smooth path -->
  <!-- From H (low) rising steeply through He-4, C-12, O-16, peak at Fe-56, then gradual decline -->
  <polyline
    points="65,240 80,160 100,110 125,80 160,62 200,52 240,48 280,46 320,45 360,45.5 400,46 440,47 480,49 520,52 560,56 600,62 635,68"
    fill="none" stroke="#44ff88" stroke-width="2.5"/>

  <!-- Iron-56 peak marker -->
  <line x1="320" y1="45" x2="320" y2="260" stroke="#ff8844" stroke-width="1" stroke-dasharray="5,4"/>
  <circle cx="320" cy="45" r="5" fill="#ff8844"/>
  <text x="322" y="38" fill="#ff8844" font-family="monospace" font-size="10">Fe-56</text>
  <text x="322" y="28" fill="#ff8844" font-family="monospace" font-size="10">пік стійкості</text>

  <!-- Helium-4 marker -->
  <circle cx="100" cy="110" r="4" fill="#7bb8ff"/>
  <text x="85" y="100" fill="#7bb8ff" font-family="monospace" font-size="10">He-4</text>

  <!-- Carbon-12 marker -->
  <circle cx="155" cy="63" r="4" fill="#7bb8ff"/>
  <text x="140" y="56" fill="#7bb8ff" font-family="monospace" font-size="10">C-12</text>

  <!-- Oxygen-16 marker -->
  <circle cx="190" cy="54" r="4" fill="#7bb8ff"/>
  <text x="174" y="46" fill="#7bb8ff" font-family="monospace" font-size="10">O-16</text>

  <!-- Silicon-28 marker -->
  <circle cx="250" cy="47" r="4" fill="#7bb8ff"/>
  <text x="234" y="40" fill="#7bb8ff" font-family="monospace" font-size="10">Si-28</text>

  <!-- Uranium marker -->
  <circle cx="620" cy="63" r="4" fill="#cc4444"/>
  <text x="590" y="78" fill="#cc4444" font-family="monospace" font-size="10">U-238</text>

  <!-- H marker -->
  <circle cx="68" cy="238" r="4" fill="#aabbcc"/>
  <text x="70" y="252" fill="#aabbcc" font-family="monospace" font-size="10">H</text>

  <!-- Fusion arrow (left of iron peak) -->
  <line x1="180" y1="200" x2="300" y2="200" stroke="#44ff88" stroke-width="1.2" marker-end="url(#arr-fn-uk)"/>
  <text x="195" y="195" fill="#44ff88" font-family="monospace" font-size="10">синтез вивільняє енергію</text>

  <!-- Fission arrow (right of iron peak) -->
  <line x1="450" y1="220" x2="350" y2="220" stroke="#cc4444" stroke-width="1.2" marker-end="url(#arr-fn-uk)"/>
  <text x="388" y="215" fill="#cc4444" font-family="monospace" font-size="10">поділ вивільняє енергію</text>

  <!-- Y-axis ticks -->
  <text x="52" y="260" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">0</text>
  <text x="52" y="200" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">2</text>
  <text x="52" y="140" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">5</text>
  <text x="52" y="80" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">8</text>
  <text x="52" y="48" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">8.8</text>
  <line x1="56" y1="48" x2="64" y2="48" stroke="#334455" stroke-width="1"/>
  <line x1="56" y1="80" x2="64" y2="80" stroke="#334455" stroke-width="1"/>
  <line x1="56" y1="140" x2="64" y2="140" stroke="#334455" stroke-width="1"/>
  <line x1="56" y1="200" x2="64" y2="200" stroke="#334455" stroke-width="1"/>

  <!-- X-axis ticks -->
  <text x="100" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">4</text>
  <text x="155" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">12</text>
  <text x="250" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">28</text>
  <text x="320" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">56</text>
  <text x="480" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">120</text>
  <text x="620" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">238</text>

  <defs>
    <marker id="arr-fn-uk" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Крива ядерної стійкості показує енергію зв\'язку в розрахунку на один нуклон. Залізо-56 займає вершину — воно найстійкіше з усіх ядер. Ліворуч від заліза синтез вивільняє енергію; праворуч — тільки поділ. Саме тому синтез у зорях зупиняється на залізі.',
      },
    },

    {
      heading: 'Розширене горіння: від вуглецю до заліза',
      level: 2,
      paragraphs: [
        'Масивні зорі — ті, що важать приблизно від восьми сонячних мас і більше — ' +
        'не зупиняються на гелії. Після спалювання гелію гравітація знову стискає ядро, ' +
        'і тиск підіймає температуру до ще вищих значень. Розпочинається послідовність ' +
        'більш важких реакцій: **вуглецеве горіння**, **неонове горіння**, **кисневе горіння** ' +
        'і нарешті **кремнієве горіння**.',

        'Кремнієве горіння — не звичайний синтез. При температурах порядку трьох-чотирьох ' +
        'мільярдів градусів гамма-фотони настільки енергетичні, що розбивають ядра назад ' +
        'на альфа-частинки. Це динамічна рівновага поглинання і злиття — так зване ' +
        '"ядерне статистичне рівноважне горіння". В результаті накопичуються елементи ' +
        'групи заліза: залізо, нікель, кобальт. Це і є кінець термоядерної дороги.',

        'Чому залізо? Тому що ядро заліза-56 є найстійкішою ядерною конфігурацією — ' +
        'воно містить більше енергії зв\'язку на нуклон, ніж будь-яке інше ядро. ' +
        'Злиття двох залізних ядер потребує енергії, але не вивільняє її. ' +
        'Коли залізне ядро накопичується у серці зорі, воно більше не може підтримати тиск ' +
        'проти гравітації. За частки секунди масивна зоря колапсує і вибухає як **наднова**.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-onion-shell',
        prompt:
          'Photorealistic scientific illustration of a massive red supergiant star with a cutaway cross-section revealing concentric burning shells: innermost iron core (gray), surrounded by silicon burning (orange glow), oxygen burning (yellow), neon burning (blue-white), carbon burning (cyan), helium burning (green), and outermost hydrogen envelope (dim red). ' +
          'Each layer clearly distinct in color and size. Dark space background. Hard sci-fi style. ' +
          'Add the following text labels on the image: "iron core", "Si burning", "O burning", "Ne burning", "C burning", "He burning", "H envelope".',
        alt: 'Поперечний розріз червоного надгіганта з шарами горіння від залізного ядра до водневої оболонки',
        caption: 'Прямо перед вибухом масивна зоря будує "цибулеву" структуру. Кожен шар горить своїм паливом одночасно. Кремнієве горіння у внутрішньому шарі може тривати лише кілька днів — тоді як воднева оболонка горить мільйони років.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Повільний і швидкий нейтронний захват',
      level: 2,
      paragraphs: [
        'Злиттям ядер можна дістатись до заліза. Але як виникають ще важчі елементи — ' +
        'свинець, золото, платина, уран? Відповідь — нейтрони. Нейтрони не мають заряду, ' +
        'тому вони не стикаються з електромагнітним бар\'єром і легко проникають у ядра.',

        'Перший механізм — **повільний нейтронний захват**, або "есперес-процес" ' +
        '(від англійського "slow"). Ядро захоплює нейтрон, стає важчим, і якщо нестабільне — ' +
        'встигає розпастися бета-розпадом до стабільного ізотопу перш ніж захопить наступний нейтрон. ' +
        'Цей процес відбувається в **зорях гілки асимптотичного гіганта** — ' +
        'зрілих зорях типу нашого Сонця у фінальній фазі горіння гелієвих оболонок. ' +
        'Так утворюється більшість ізотопів між залізом і свинцем.',

        'Другий механізм — **швидкий нейтронний захват**, або "еререс-процес". ' +
        'Ядро захоплює нейтрони настільки швидко, що воно встигає набрати дуже велику масу ' +
        'перш ніж бета-розпад встигне "виправити" його. Потоки нейтронів, потрібні для цього, ' +
        'в мільярди разів більші, ніж у зорях. Де таке можливо? ' +
        'Довго вважалося, що в наднових — але кількісні моделі не сходились. ' +
        'Відповідь прийшла у серпні 2017 року: телескопи зафіксували гравітаційні хвилі ' +
        'від злиття двох нейтронних зір — подія дістала позначення GW170817. ' +
        'Через дві секунди — спалах гамма-випромінювання. Через дні — кілонова: ' +
        'особливий оптичний спалах, в спектрі якого астрономи ідентифікували ізотопи стронцію. ' +
        'Це було першим прямим доказом: **золото, платина і більшість важких радіоактивних елементів ' +
        'народжуються у злиттях нейтронних зір**.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-neutron-star-merger',
        prompt:
          'Photorealistic scientific illustration of two neutron stars merging: two dense gray-white spheres spiraling toward each other, surrounded by jets of matter being ejected at relativistic speeds, glowing debris disk forming around the merger site, gamma-ray burst depicted as two bright beams shooting outward along the rotation axis, kilonova optical glow in orange-red expanding outward. ' +
          'Deep black space background. Hard sci-fi style. ' +
          'Add the following text labels on the image: "neutron star 1", "neutron star 2", "r-process elements ejected", "gamma-ray burst", "kilonova glow", "gold and platinum formed".',
        alt: 'Злиття двох нейтронних зір: спіральне зближення, викид речовини з еререс-процесом, спалах гамма-випромінювання і кілонова',
        caption: 'GW170817 у 2017 році став першим підтвердженим злиттям нейтронних зір, зафіксованим одночасно через гравітаційні хвилі і електромагнітне випромінювання. У викинутій речовині спостерігали ізотопи стронцію — підпис швидкого нейтронного захвату.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Космічне походження елементів',
      level: 2,
      paragraphs: [
        'Сучасна астрофізика дає чіткі відповіді на питання: де саме виник кожен елемент таблиці Менделєєва?',

        '**Водень і гелій** утворились під час Великого Вибуху — у перші кілька хвилин ' +
        'гарячого розширення Всесвіту, яке називають первинним нуклеосинтезом. ' +
        'Тоді утворилось також невелика кількість літію-7. На цьому первинний нуклеосинтез зупинився: ' +
        'Всесвіт розширився й охолонув швидше, ніж встигли утворитись важчі ядра.',

        '**Від вуглецю до заліза** синтезується в надрах зір — через протон-протонний ланцюг, ' +
        'цикл вуглець-азот-кисень, потрійну альфа-реакцію і послідовні стадії розширеного горіння. ' +
        'Коли зоря вмирає — вибухаючи як наднова або скидаючи оболонку у вигляді планетарної туманності — ' +
        'синтезовані елементи розлітаються у міжзоряне середовище і стають матеріалом для нових зір, ' +
        'планет і, зрештою, живих організмів.',

        '**Від кобальту до свинцю** — переважно через повільний нейтронний захват у зорях на ' +
        'гілці асимптотичного гіганта, з доповненням з наднових.',

        '**Золото, платина, іридій і більшість важких радіоактивних елементів** — ' +
        'переважно продукти швидкого нейтронного захвату при злиттях нейтронних зір. ' +
        'Кожна така подія виробляє астрономічну кількість цих елементів — ' +
        'за розрахунками, одне злиття може створити золота більше, ніж важить Місяць. ' +
        'Але такі злиття рідкісні: у нашій Галактиці вони відбуваються раз на кілька десятків тисяч років.',

        'Таким чином, зоряний нуклеосинтез — це не одна реакція і не одне місце, ' +
        'а ціла мережа процесів, розкиданих у часі й просторі. Атоми вашого тіла мандрували ' +
        'через кілька поколінь зір і, щонайменше, одне злиття нейтронних зір — ' +
        'перш ніж опинитись у вас.',
      ],
    },

    {
      diagram: {
        title: 'Таблиця Менделєєва: космічне походження елементів',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Legend -->
  <rect x="30" y="18" width="14" height="10" fill="#7bb8ff" rx="2"/>
  <text x="48" y="27" fill="#aabbcc" font-family="monospace" font-size="10">Великий Вибух (H, He, Li)</text>

  <rect x="30" y="34" width="14" height="10" fill="#44ff88" rx="2"/>
  <text x="48" y="43" fill="#aabbcc" font-family="monospace" font-size="10">Зорі — синтез (C → Fe)</text>

  <rect x="30" y="50" width="14" height="10" fill="#ff8844" rx="2"/>
  <text x="48" y="59" fill="#aabbcc" font-family="monospace" font-size="10">Зорі — повільний нейтронний захват (Co → Pb)</text>

  <rect x="30" y="66" width="14" height="10" fill="#cc4444" rx="2"/>
  <text x="48" y="75" fill="#aabbcc" font-family="monospace" font-size="10">Злиття нейтронних зір — швидкий нейтронний захват (Au, Pt, U...)</text>

  <rect x="30" y="82" width="14" height="10" fill="#8899aa" rx="2"/>
  <text x="48" y="91" fill="#aabbcc" font-family="monospace" font-size="10">Наднові / змішані джерела</text>

  <!-- Simplified periodic table rows — period 1 -->
  <!-- Row 1 -->
  <rect x="30" y="105" width="18" height="16" fill="#7bb8ff" rx="2"/>
  <text x="39" y="117" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">H</text>
  <rect x="652" y="105" width="18" height="16" fill="#7bb8ff" rx="2"/>
  <text x="661" y="117" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">He</text>

  <!-- Row 2 -->
  <rect x="30" y="123" width="18" height="16" fill="#7bb8ff" rx="2"/>
  <text x="39" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Li</text>
  <rect x="50" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="59" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Be</text>
  <rect x="562" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="571" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">B</text>
  <rect x="582" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="591" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">C</text>
  <rect x="602" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="611" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">N</text>
  <rect x="622" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="631" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">O</text>
  <rect x="642" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="651" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">F</text>
  <rect x="662" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="671" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ne</text>

  <!-- Row 3 elements (simplified) — Na to Ar -->
  <rect x="30" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="39" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Na</text>
  <rect x="50" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="59" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Mg</text>
  <rect x="562" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="571" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Al</text>
  <rect x="582" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="591" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Si</text>
  <rect x="602" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="611" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">P</text>
  <rect x="622" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="631" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">S</text>
  <rect x="642" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="651" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Cl</text>
  <rect x="662" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="671" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ar</text>

  <!-- Row 4 transition metals — Ca to Kr, Fe/Ni/Co highlighted -->
  <rect x="30" y="159" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="39" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">K</text>
  <rect x="50" y="159" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="59" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ca</text>
  <!-- Transition metals Sc-Mn -->
  <rect x="90" y="159" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="99" y="171" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Sc-Mn</text>
  <!-- Fe, Co, Ni — iron peak -->
  <rect x="110" y="159" width="18" height="16" fill="#ff8844" rx="2" stroke="#ff8844" stroke-width="1.5"/>
  <text x="119" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Fe</text>
  <rect x="130" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="139" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Co</text>
  <rect x="150" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="159" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ni</text>
  <!-- Cu-Kr -->
  <rect x="170" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="179" y="171" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Cu-Zn</text>
  <rect x="562" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="571" y="171" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Ga-Kr</text>

  <!-- Row 5 — Rb to Xe, mostly s-process -->
  <rect x="30" y="177" width="200" height="16" fill="#ff8844" rx="2"/>
  <text x="130" y="189" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle">Rb — Sn (повільний нейтронний захват)</text>
  <rect x="562" y="177" width="118" height="16" fill="#ff8844" rx="2"/>
  <text x="621" y="189" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle">Sb — Xe</text>

  <!-- Row 6 — Cs to Rn, mixed, Pb/Ba s-process, heavier r-process -->
  <rect x="30" y="195" width="200" height="16" fill="#ff8844" rx="2"/>
  <text x="130" y="207" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Cs → Ba, La (повільний нейтронний захват)</text>
  <rect x="232" y="195" width="112" height="16" fill="#cc4444" rx="2"/>
  <text x="288" y="207" fill="#fff" font-family="monospace" font-size="7" text-anchor="middle">Hf → Pb (змішано)</text>
  <rect x="346" y="195" width="180" height="16" fill="#cc4444" rx="2"/>
  <text x="436" y="207" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Bi → Rn — злиття н. зір</text>

  <!-- Row 7 — Fr to Og — r-process heavy -->
  <rect x="30" y="213" width="250" height="16" fill="#cc4444" rx="2"/>
  <text x="155" y="225" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Fr, Ra — радіоактивні важкі ядра (злиття н. зір)</text>
  <rect x="282" y="213" width="200" height="16" fill="#cc4444" rx="2"/>
  <text x="382" y="225" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Ac, Th, U, Pu...</text>

  <!-- Gold/Platinum callout -->
  <rect x="400" y="159" width="30" height="16" fill="#cc4444" stroke="#ff8844" stroke-width="1.5" rx="2"/>
  <text x="415" y="171" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Au</text>
  <rect x="432" y="159" width="30" height="16" fill="#cc4444" stroke="#ff8844" stroke-width="1.5" rx="2"/>
  <text x="447" y="171" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Pt</text>
  <line x1="415" y1="157" x2="415" y2="148" stroke="#ff8844" stroke-width="1.2"/>
  <text x="415" y="145" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">злиття н. зір</text>

  <!-- Title -->
  <text x="340" y="14" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Походження елементів (спрощена схема)</text>

  <!-- Bottom note -->
  <text x="340" y="255" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">* Багато елементів мають кілька джерел; схема показує домінуючий канал.</text>
</svg>`,
        caption:
          'Спрощена схема космічного походження елементів. Водень і гелій — з Великого Вибуху. Вуглець, кисень, кремній, залізо — з надр зір. Золото, платина, уран — переважно зі злиттів нейтронних зір. Більшість елементів між залізом і свинцем утворились через повільний нейтронний захват у зорях гілки асимптотичного гіганта.',
      },
    },

    {
      heading: 'Чому це важливо',
      level: 2,
      paragraphs: [
        'Зоряний нуклеосинтез пояснює одне з найглибших питань природничих наук: ' +
        'звідки береться хімічна складність Всесвіту? Ще на початку двадцятого століття ' +
        'фізики не розуміли, чому всесвіт містить таку кількість різних елементів і в таких кількостях. ' +
        'Робота Бербіджів, Фаулера і Гойла у 1957 році вперше дала кількісну відповідь: ' +
        'кожен механізм — протон-протонний ланцюг, цикл вуглець-азот-кисень, ' +
        'потрійна альфа-реакція, повільний і швидкий нейтронний захват — залишає характерний ' +
        '"відбиток" у відносних кількостях ізотопів. Сучасні спостереження зоряних атмосфер, ' +
        'метеоритів і продуктів злиттів нейтронних зір підтверджують теоретичні передбачення ' +
        'з точністю до кількох відсотків.',

        'Для астробіології це має пряме значення: складна хімія вуглецевого життя стала ' +
        'можливою лише після того, як кілька поколінь зір синтезували і розкидали у простір ' +
        'потрібні елементи. Ранній Всесвіт — майже виключно з водню і гелію — ' +
        'фундаментально непридатний для складних молекул. ' +
        'У цьому сенсі зоряний нуклеосинтез є необхідною передумовою не лише для планет, ' +
        'але й для самої можливості біохімії.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-supernova-remnant',
        prompt:
          'Photorealistic scientific illustration of a supernova remnant nebula: expanding shell of glowing gas and plasma in deep space, showing complex filamentary structure with shock fronts in red, orange, and blue, newly synthesized heavy elements labeled in the ejected shell, central neutron star visible as a dim blue-white point at center. ' +
          'Hard sci-fi style, dark space background, technically accurate nebula morphology. ' +
          'Add the following text labels on the image: "ejected stellar material", "synthesized C, O, Si, Fe", "shock front", "neutron star remnant", "expanding shell".',
        alt: 'Залишок наднової: клубок розпеченого газу розлітається у простір, несучи синтезовані важкі елементи в міжзоряне середовище',
        caption: 'Залишки наднових — пральні машини Галактики. Синтезовані зорею атоми розлітаються зі швидкостями тисячі кілометрів на секунду, перемішуються з міжзоряним газом і через мільйони років стають матеріалом для нових планетних систем.',
        aspectRatio: '4:3',
      },
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-bfh-paper',
        prompt:
          'Scientific illustration representing the landmark 1957 Burbidge-Burbidge-Fowler-Hoyle paper on stellar nucleosynthesis: vintage-style scientific document page with graphs showing elemental abundance curves, mathematical equations of nuclear reactions, portraits as silhouettes of four scientists in a dark background, title text visible. ' +
          'Hard sci-fi style, dark background, monospace annotations. ' +
          'Add the following text labels on the image: "B2FH 1957", "stellar nucleosynthesis", "Reviews of Modern Physics", "element abundances".',
        alt: 'Стилізована ілюстрація роботи Бербіджів-Фаулера-Гойла 1957 року — поворотного документу в астрофізиці нуклеосинтезу',
        caption: 'Робота Бербіджів, Фаулера і Гойла у журналі "Рев\'юс оф Модерн Фізикс" за 1957 рік систематизувала вісім різних процесів синтезу елементів у зорях. Цей документ сформував сучасне розуміння хімічної еволюції Всесвіту.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Нуклеосинтез',
      definition:
        'Процес утворення атомних ядер шляхом ядерних реакцій — злиття, нейтронного захвату або розпаду. Зоряний нуклеосинтез відбувається в надрах зір і при вибухах наднових.',
    },
    {
      term: 'Протон-протонний ланцюг',
      definition:
        'Послідовність ядерних реакцій, під час якої чотири протони зливаються в одне ядро гелію-4 з вивільненням енергії. Основне джерело енергії Сонця і всіх зір до 1,3 сонячної маси.',
    },
    {
      term: 'Цикл вуглець-азот-кисень',
      definition:
        'Каталітичний ядерний цикл, у якому вуглець-12 прискорює злиття чотирьох протонів у гелій-4, залишаючись незмінним. Домінує в зорях масивніших за 1,3 сонячної маси.',
    },
    {
      term: 'Потрійна альфа-реакція',
      definition:
        'Ядерна реакція, під час якої три ядра гелію-4 (альфа-частинки) зливаються в одне ядро вуглецю-12. Відбувається в червоних гігантах при температурах близько ста мільйонів градусів.',
    },
    {
      term: 'Залізний пік',
      definition:
        'Група елементів навколо заліза (залізо, нікель, кобальт), що мають найбільшу енергію зв\'язку на нуклон. Синтез важчих за залізо ядер не вивільняє, а поглинає енергію — тому зоряне горіння зупиняється тут.',
    },
    {
      term: 'Повільний нейтронний захват (есперес-процес)',
      definition:
        'Процес утворення важких ядер через послідовне захоплення нейтронів із проміжними бета-розпадами. Відбувається в зорях гілки асимптотичного гіганта. Продукує більшість ізотопів між залізом і свинцем.',
    },
    {
      term: 'Швидкий нейтронний захват (еререс-процес)',
      definition:
        'Процес утворення дуже важких і нейтронно-надлишкових ядер при надзвичайно інтенсивних потоках нейтронів. Відбувається переважно при злиттях нейтронних зір. Продукує золото, платину, уран та інші важкі елементи.',
    },
    {
      term: 'Кілонова',
      definition:
        'Транзієнтний оптичний спалах, що супроводжує злиття нейтронних зір. Спричинений радіоактивним розпадом елементів, синтезованих через швидкий нейтронний захват. Перша підтверджена кілонова — GW170817 у серпні 2017 року.',
    },
    {
      term: 'Зоря гілки асимптотичного гіганта',
      definition:
        'Пізня стадія еволюції зір маси 0,8–8 сонячних мас, коли зоря є червоним гігантом, що одночасно горить гелієм і воднем у оболонках. У таких зорях відбувається повільний нейтронний захват.',
    },
    {
      term: 'Первинний нуклеосинтез',
      definition:
        'Синтез легких ядер (водню, гелію-4, дейтерію, гелію-3, літію-7) у перші кілька хвилин після Великого Вибуху. Пояснює спостережувані первинні відносні кількості цих елементів у Всесвіті.',
    },
  ],

  quiz: [
    {
      question: 'Який термоядерний процес є основним джерелом енергії нашого Сонця?',
      options: [
        'Цикл вуглець-азот-кисень',
        'Потрійна альфа-реакція',
        'Протон-протонний ланцюг',
        'Повільний нейтронний захват',
      ],
      correctIndex: 2,
      explanation:
        'Сонце має масу близько 1 сонячної — тому основним є протон-протонний ланцюг. Цикл вуглець-азот-кисень починає переважати лише в зорях масивніших за приблизно 1,3 сонячної маси, де температура ядра вища.',
    },
    {
      question: 'Чому зоряний синтез зупиняється на залізі і не йде далі?',
      options: [
        'Залізо занадто важке і тоне до центру зорі',
        'Залізне ядро має найбільшу енергію зв\'язку на нуклон — синтез важчих ядер вимагає енергії замість вивільнення',
        'Залізо блокує потоки нейтронів',
        'При залізі зупиняється гравітаційне стискання ядра',
      ],
      correctIndex: 1,
      explanation:
        'Залізо-56 перебуває у вершині кривої ядерної стійкості. Щоб злити два залізних ядра, потрібно вкласти енергію — на відміну від легших ядер, де синтез її вивільняє. Тому зоря більше не може виробляти тепло синтезом важчих ядер і колапсує.',
    },
    {
      question: 'Яка подія у 2017 році стала першим прямим підтвердженням швидкого нейтронного захвату як джерела золота та платини?',
      options: [
        'Вибух наднової в Магеллановій хмарі',
        'Перший знімок тіні чорної діри телескопом EHT',
        'Реєстрація гравітаційних хвиль від злиття нейтронних зір і пов\'язана кілонова GW170817',
        'Виявлення аномальної кількості золота у зірковому спектрі',
      ],
      correctIndex: 2,
      explanation:
        'GW170817 у серпні 2017 року — перше одночасне виявлення гравітаційних хвиль і електромагнітного спалаху від злиття нейтронних зір. У спектрі кілонової астрономи ідентифікували ізотопи стронцію — пряме свідчення швидкого нейтронного захвату.',
    },
    {
      question: 'Де утворюється більшість ізотопів між залізом і свинцем (наприклад, барій, церій, лантан)?',
      options: [
        'У злиттях нейтронних зір через швидкий нейтронний захват',
        'У вибухах наднових через протон-протонний ланцюг',
        'У зорях гілки асимптотичного гіганта через повільний нейтронний захват',
        'Під час Великого Вибуху через первинний нуклеосинтез',
      ],
      correctIndex: 2,
      explanation:
        'Повільний нейтронний захват відбувається у зорях гілки асимптотичного гіганта, де нейтрони захоплюються ядрами досить повільно, щоб між захватами відбувались бета-розпади. Це продукує більшість важких стабільних ізотопів від заліза до свинцю.',
    },
    {
      question: 'Яку фундаментальну роль відіграла робота Бербіджів, Фаулера і Гойла у 1957 році?',
      options: [
        'Відкрила нейтронну зорю та передбачила пульсари',
        'Систематично описала механізми синтезу всіх елементів у зорях та пояснила спостережувані відносні кількості елементів',
        'Вперше виміряла швидкість розширення Всесвіту',
        'Довела, що Сонце складається з водню за допомогою спектроскопії',
      ],
      correctIndex: 1,
      explanation:
        'Робота 1957 року описала вісім окремих нуклеосинтетичних процесів, показала, як кожен залишає характерний відбиток у відносних кількостях ізотопів, і пояснила загальний розподіл елементів у Всесвіті. Це лишається основою зоряної нуклеохімії.',
    },
  ],

  sources: [
    {
      title: 'Burbidge E.M., Burbidge G.R., Fowler W.A., Hoyle F. — Synthesis of the Elements in Stars',
      url: 'https://journals.aps.org/rmp/abstract/10.1103/RevModPhys.29.547',
      meta: 'Reviews of Modern Physics, 29, 547, 1957',
    },
    {
      title: 'Abbott B.P. et al. (LIGO/Virgo) — GW170817: Multi-messenger Observations',
      url: 'https://arxiv.org/abs/1710.05834',
      meta: 'ApJL, 848, L12, 2017 (open access)',
    },
    {
      title: 'Smartt S.J. et al. — A kilonova as the electromagnetic counterpart to a gravitational-wave source',
      url: 'https://www.nature.com/articles/nature24303',
      meta: 'Nature, 551, 75–79, 2017',
    },
    {
      title: 'Cowan J.J. et al. — Origin of the heaviest elements: The rapid neutron-capture process',
      url: 'https://arxiv.org/abs/1901.01410',
      meta: 'Reviews of Modern Physics, 93, 015002, 2021 (open access)',
    },
    {
      title: 'Karakas A.I., Lattanzio J.C. — The dawes review: Nucleosynthesis and stellar models',
      url: 'https://arxiv.org/abs/1405.0062',
      meta: 'PASA, 31, e030, 2014 (open access)',
    },
    {
      title: 'Arnould M., Goriely S. — The p-process of stellar nucleosynthesis',
      url: 'https://arxiv.org/abs/astro-ph/0301573',
      meta: 'Physics Reports, 384, 1–84, 2003',
    },
    {
      title: 'NASA — Origin of the Elements',
      url: 'https://science.nasa.gov/universe/stars/nucleosynthesis-how-stars-make-all-the-elements/',
      meta: 'NASA Science, оновлено 2024',
    },
    {
      title: 'Herwig F. — Evolution of Asymptotic Giant Branch Stars',
      url: 'https://arxiv.org/abs/astro-ph/0405400',
      meta: 'ARA&A, 43, 435–479, 2005',
    },
    {
      title: 'Bethe H.A. — Energy Production in Stars',
      url: 'https://journals.aps.org/pr/abstract/10.1103/PhysRev.55.434',
      meta: 'Physical Review, 55, 434, 1939 (Нобелівська лекція)',
    },
    {
      title: 'Lattimer J.M., Prakash M. — The Physics of Neutron Stars',
      url: 'https://arxiv.org/abs/astro-ph/0405262',
      meta: 'Science, 304, 536–542, 2004',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
