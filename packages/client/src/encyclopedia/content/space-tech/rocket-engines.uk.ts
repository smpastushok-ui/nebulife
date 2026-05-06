import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'rocket-engines',
  language: 'uk',
  section: 'space-tech',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 13,
  title: 'Як працює ракетний двигун',
  subtitle: 'Третій закон Ньютона, рівняння Ціолковського та чому вогонь у вакуумі штовхає краще, ніж у повітрі.',

  hero: {
    cacheKey: 'rocket-engines-hero',
    prompt:
      'Photorealistic cross-section illustration of a liquid-fueled rocket engine in full thrust for a science encyclopedia. ' +
      'Cut-away view revealing internal turbopumps, preburner, main combustion chamber, and bell-shaped nozzle. ' +
      'Brilliant blue-white flame exits the nozzle expanding into a dark vacuum. ' +
      'Fuel and oxidizer feed lines glow faintly in orange and cyan. ' +
      'Hard sci-fi style, dark background, technically accurate geometry, dramatic lighting from the exhaust plume. ' +
      'Add the following text labels on the image: "combustion chamber", "turbopump", "nozzle", "exhaust plume".',
    alt: 'Розріз рідинного ракетного двигуна в режимі повної тяги — камера згоряння, турбонасоси, сопло та факел полум\'я',
    caption:
      'Рідинний ракетний двигун у розрізі. Паливо й окиснювач подаються турбонасосами під тиском у кілька сотень атмосфер, займаються в камері згоряння і вириваються крізь сопло зі швидкістю кількох кілометрів на секунду.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Ракета — це не літак. У неї немає крил, немає гвинта і вона не відштовхується від повітря. ' +
        'Вона везе власне паливо й власний окиснювач, реагує їх між собою і викидає гарячий газ назад — ' +
        'а сам апарат летить вперед. Цей принцип настільки універсальний, що однаково добре ' +
        'працює в атмосфері, у вакуумі та між зорями. Жодного повітря не потрібно.',

        'На перший погляд це схоже на фокус: де та сила, що штовхає? Відповідь дав Ісаак Ньютон ' +
        'ще в XVII столітті. Його третій закон каже: будь-яка дія породжує рівну й протилежну протидію. ' +
        'Ракетний двигун — це мабуть найчистіша демонстрація цього закону на практиці. ' +
        'Виштовхуємо масу в один бік — отримуємо тягу в інший. Без контакту із землею. Без опори. ' +
        'Сам по собі, у порожнечі.',

        'Але як тільки ви спробуєте полетіти далі ніж на кілька кілометрів, наштовхнетесь на жорсткий факт: ' +
        'паливо важить. І щоб підняти більше палива, потрібно ще більше палива. Це заколоте коло ' +
        'математично сформулював Костянтин Ціолковський ще в кінці XIX — на початку XX століття. ' +
        'Його рівняння показує, що для кожного кратного збільшення кінцевої швидкості ' +
        'потрібна не вдвічі, не вдесятеро — а **в рази більша маса палива** відносно маси корисного навантаження. ' +
        'Це і є причина, чому ракети такі великі, а вантажна секція — маленька.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-newton-third-law',
        prompt:
          'Scientific diagram illustrating Newton\'s third law applied to a rocket engine: ' +
          'a simplified rocket shape shown in profile, with a large orange exhaust gas arrow pointing downward labeled "action: exhaust mass" ' +
          'and an equal blue arrow pointing upward labeled "reaction: thrust". ' +
          'Background is deep black space. Hard sci-fi style, monospace labels, dark background. ' +
          'Add the following text labels on the image: "thrust (reaction)", "exhaust mass (action)", "Newton\'s 3rd law".',
        alt: 'Діаграма третього закону Ньютона: дія — викинута маса вниз, протидія — тяга вгору',
        caption: 'Тяга — це не «відштовхування від повітря». Це реакція на викинуту масу. Саме тому ракета однаково добре працює у вакуумі — і навіть краще: без атмосферного тиску сопло може розширити газ до нижчого тиску, вичавлюючи більше швидкості з кожного кілограма палива.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Питома імпульсивність: єдина цифра, що має значення',
      level: 2,
      paragraphs: [
        'Інженери оцінюють ефективність ракетного двигуна одним числом — **питомою імпульсивністю** ' +
        '(specific impulse, скорочено Isp). Простими словами: скільки секунд двигун може ' +
        'утримувати тягу в одну одиницю сили, спалюючи один кілограм палива. ' +
        'Чим вище це число — тим ефективніший двигун.',

        'Двигун на твердому паливі дає приблизно 250–280 секунд. Рідинний двигун на ' +
        'рідкому кисні та гасі — близько 310–360 секунд. Якщо перейти до ' +
        'рідкого водню й кисню (як на двигунах RS-25 в системі Space Shuttle та SLS) — ' +
        'вже 450–460 секунд. Іонний двигун, що використовується на космічних апаратах далекого ' +
        'космосу, може давати понад три тисячі секунд — але його тяга настільки мала, ' +
        'що для злету з Землі він непридатний. Питома імпульсивність і тяга — це завжди компроміс.',

        'Чому рідкий водень такий хороший? Молекули водню найлегші з усіх горючих речовин. ' +
        'Якщо температура в камері згоряння та хімічна реакція однакові, то легшу молекулу ' +
        'можна розігнати до вищої швидкості. Саме висока _швидкість виходу газу з сопла_ ' +
        'і є тим, що підвищує питому імпульсивність. Водень і кисень горять, даючи продукт ' +
        'горіння — водяну пару — з виключно високою температурою і малою молекулярною масою.',
      ],
    },

    {
      heading: 'Типи ракетних двигунів: від бустерів до орбітальних машин',
      level: 2,
      paragraphs: [
        'Не всі ракетні двигуни однакові. Вибір типу залежить від місії, бюджету, ' +
        'потрібної тяги та надійності.',
      ],
    },

    {
      heading: 'Тверде паливо',
      level: 3,
      paragraphs: [
        'Двигун на твердому паливі — це по суті дуже складна петарда. ' +
        'Паливо й окиснювач змішані в один твердий заряд ще на заводі. ' +
        'Після запуску — зупинити практично неможливо. ' +
        'Перевага: простота, надійність і довге зберігання. ' +
        'Тверді ракетні прискорювачі використовуються як _бустери_ ' +
        '(додаткові ступені для перших секунд польоту, коли потрібна максимальна тяга) ' +
        'на Space Shuttle, Falcon Heavy, SLS та багатьох інших носіях. ' +
        'Недолік: не можна регулювати тягу і складно точно зупинити.',
      ],
    },

    {
      heading: 'Рідинні двигуни: три принципово різних цикли',
      level: 3,
      paragraphs: [
        'Рідинний двигун подає паливо й окиснювач у рідкому вигляді з окремих баків. ' +
        'Це дає змогу регулювати тягу, вмикати та вимикати двигун і досягати значно вищої ' +
        'питомої імпульсивності. Але є складнощі: треба підняти тиск рідини від бака ' +
        'до камери згоряння. Для цього потрібні турбонасоси — надзвичайно складні машини, ' +
        'що перекачують сотні кілограмів рідкого палива за секунду при тисках у сотні атмосфер.',

        'Залежно від того, звідки турбіна отримує енергію для роботи, розрізняють три основних цикли:',

        '**Газогенераторний цикл** (gas generator): невелика частина палива спалюється в ' +
        'окремому газогенераторі, гарячий газ крутить турбіну насосів, а потім викидається ' +
        'у вихлоп повз основне сопло. Частина енергії витрачається марно. ' +
        'Прості і перевірені: Merlin (Falcon 9), F-1 (Saturn V).',

        '**Staged combustion** (ступінчасте горіння): весь відпрацьований газ турбіни подається ' +
        'назад у головну камеру і спалюється повністю. Нічого не викидається. ' +
        'Вищий тиск, вища ефективність, але набагато складніший у виготовленні. ' +
        'RS-25 (Space Shuttle, SLS), RD-180 (Atlas V) — саме цей цикл.',

        '**Full-flow staged combustion** (повно-проточне ступінчасте горіння): обидва компоненти ' +
        '(і паливо, і окиснювач) проходять крізь власні передальники перед основною камерою. ' +
        'Максимально можлива ефективність. Надзвичайно складно реалізувати технічно. ' +
        'До 2020-х практично ніхто не зміг це повторити: **Raptor** від SpaceX — перший ' +
        'серійний двигун з повно-проточним циклом у світовій практиці.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-engine-cycles',
        prompt:
          'Scientific infographic comparing three liquid rocket engine thermodynamic cycles side by side: ' +
          '1) Gas generator cycle: turbine exhaust shown as small arrow dumped overboard. ' +
          '2) Staged combustion cycle: turbine exhaust arrow routing back into main chamber. ' +
          '3) Full-flow staged combustion: both fuel-rich and oxidizer-rich preburners feeding turbines, then main chamber. ' +
          'Each cycle shown as a simple schematic block diagram with labeled components. ' +
          'Hard sci-fi style, dark background, monospace labels, orange and cyan accent colors. ' +
          'Add the following text labels on the image: "gas generator", "staged combustion", "full-flow staged combustion", "preburner", "turbopump".',
        alt: 'Три схеми термодинамічних циклів рідинних ракетних двигунів: газогенераторний, staged combustion та full-flow',
        caption: 'Від газогенераторного до повно-проточного циклу ефективність зростає, але складність виробництва — набагато більше. Raptor від SpaceX реалізував full-flow вперше у серійному виробництві.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Гібридні двигуни',
      level: 3,
      paragraphs: [
        'Гібридний двигун поєднує тверде паливо і рідкий окиснювач. ' +
        'Регулювати тягу можна, подаючи більше або менше окиснювача. ' +
        'Простіше і безпечніше за чисто рідинний, ефективніше за чисто твердий. ' +
        'Але питома імпульсивність нижча за кращі рідинні двигуни. ' +
        'Відомий приклад — двигун **SpaceShipTwo** від Virgin Galactic.',
      ],
    },

    {
      heading: 'Топ сучасних двигунів',
      level: 2,
      paragraphs: [
        'П\'ять двигунів визначають пейзаж сучасної космонавтики.',

        '**Raptor (SpaceX)** — двигун Starship. Метан і рідкий кисень, повно-проточний цикл. ' +
        'Тяга на рівні моря понад 230 тонн у вакуумній версії. ' +
        'Перший серійний двигун у світі з full-flow циклом. ' +
        'SpaceX планує використовувати понад тридцять таких двигунів на першому ступені ' +
        'Super Heavy. Питома імпульсивність у вакуумі — близько 380 секунд.',

        '**Merlin (SpaceX)** — серце Falcon 9. Гас і рідкий кисень, газогенераторний цикл. ' +
        'Надійний, масово виробляється і може багаторазово повертатись на Землю — ' +
        'саме завдяки цьому двигуну SpaceX зробила революцію в комерційних пусках. ' +
        'Питома імпульсивність у вакуумі близько 348 секунд.',

        '**RS-25 (Aerojet Rocketdyne)** — двигун Space Shuttle та SLS. ' +
        'Рідкий водень і кисень, staged combustion. ' +
        'Найвища питома імпульсивність серед льотних двигунів — близько 452 секунд. ' +
        'Надзвичайно складний у виготовленні й дорогий. ' +
        'Першим польотом SLS у 2022 році повернув його до активної служби.',

        '**RD-180 (НВО Єнергомаш)** — встановлювався на американському носії Atlas V. ' +
        'Гас і рідкий кисень, staged combustion. ' +
        'Вважався одним з найвидатніших рідинних двигунів у світі за співвідношенням ' +
        'тяги та складності. Розроблений у Радянському Союзі, потім продавався США ' +
        'десятиліттями — аж поки геополітична ситуація не змусила шукати заміну.',

        '**BE-4 (Blue Origin)** — двигун ракети Vulcan (United Launch Alliance) та New Glenn (Blue Origin). ' +
        'Рідкий природний газ і кисень, staged combustion. ' +
        'Розроблявся понад десять років. Перший успішний пуск Vulcan відбувся у 2024 році. ' +
        'Потужніший за Merlin, але складніший.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-top-engines-comparison',
        prompt:
          'Scientific infographic comparing five modern rocket engines side by side in a dark museum-display style: ' +
          'SpaceX Raptor, SpaceX Merlin, RS-25, RD-180, Blue Origin BE-4. ' +
          'Each engine shown as a detailed 3D silhouette with its name label and approximate thrust value. ' +
          'Engines arranged by size from largest to smallest thrust. ' +
          'Hard sci-fi style, dark space background, orange and cyan accent highlights, monospace font. ' +
          'Add the following text labels on the image: "Raptor", "Merlin", "RS-25", "RD-180", "BE-4".',
        alt: 'Порівняння п\'яти сучасних ракетних двигунів: Raptor, Merlin, RS-25, RD-180 і BE-4',
        caption: 'П\'ять двигунів, що формують поточне покоління космонавтики. Raptor — єдиний серійний двигун з full-flow циклом. RS-25 має найвищу питому імпульсивність серед льотних зразків. Merlin — найбільш льотно перевірений.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Альтернативи: іонні двигуни та плазма',
      level: 2,
      paragraphs: [
        'Хімічна реакція — не єдиний спосіб прискорити газ. ' +
        'Якщо мета — не злетіти з Землі, а розігнатися в космосі, ' +
        'хімічний двигун виявляється не найкращим вибором.',

        '**Іонний двигун** (електричне реактивне прискорення) іонізує інертний газ — ' +
        'зазвичай ксенон — і прискорює іони електричним полем. ' +
        'Швидкість виходу частинок набагато вища, ніж у хімічного двигуна, ' +
        'тому питома імпульсивність може перевищувати три тисячі секунд. ' +
        'Але тяга — лічені мілі-ньютони. Для порівняння: аркуш паперу важить приблизно стільки, ' +
        'скільки тяга типового іонного двигуна на одному кілограмі. ' +
        'Це катастрофічно мало для злету, але чудово для довгих перельотів: ' +
        'апарати Hayabusa, Dawn, BepiColombo та десятки інших супутників ' +
        'використовують іонні двигуни для економного набору швидкості протягом місяців і років.',

        '**Двигун Холла** (Hall thruster) — різновид іонного двигуна з кільцевою геометрією, ' +
        'що використовує поперечне магнітне поле для утримання електронів. ' +
        'Простіший і надійніший за класичний іонний, широко застосовується на геостаціонарних супутниках ' +
        'для корекції орбіти та маневрів. ' +
        'Тисячі апаратів у зоряному кластері Starlink використовують саме Hall thruster.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-ion-engine',
        prompt:
          'Photorealistic scientific illustration of an ion thruster in operation in deep space: ' +
          'cylindrical thruster body glowing with electric blue-purple discharge, ' +
          'faint blue ion exhaust plume extending outward, ' +
          'xenon propellant ionization visible as an ethereal glow inside the thruster grid. ' +
          'Spacecraft body partially visible. Background: star field. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "xenon ions", "ion exhaust plume", "thruster grid", "electric propulsion".',
        alt: 'Іонний двигун у роботі в глибокому космосі — синьо-фіолетове свічення розряду і слабкий факел іонного плуму',
        caption: 'Іонний двигун апарата Dawn (місія до Церери і Вести, 2007–2018). Хоча тяга — лічені мілі-ньютони, висока питома імпульсивність дозволила набрати достатню швидкість для перельоту між двома тілами Пояса астероїдів.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Майбутнє: ядерна теплова, сонячний вітрило і лазерний поштовх',
      level: 2,
      paragraphs: [
        'Хімія має фізичну стелю. Реакція водень-кисень вивільняє стільки енергії, скільки ' +
        'дозволяє хімічна валентність. Щоб рухатись далі, потрібні принципово інші джерела енергії.',

        '**Ядерний тепловий двигун** (nuclear thermal propulsion) використовує ядерний реактор ' +
        'для нагріву робочого тіла — водню — до температур, недосяжних для хімічного горіння. ' +
        'Теоретична питома імпульсивність — до 900 секунд, майже вдвічі більша за RS-25. ' +
        'США випробовували такі двигуни ще в 1960-х у програмі NERVA і довели їхню дієздатність. ' +
        'Зараз NASA та DARPA активно розробляють концепцію для пілотованого польоту на Марс. ' +
        'Перший льотний тест планується до кінця 2020-х.',

        '**Сонячне вітрило** використовує тиск фотонів сонячного випромінювання на ' +
        'надтонку відбивну плівку площею в тисячі квадратних метрів. ' +
        'Двигуна немає взагалі — тяга від сонячного світла. ' +
        'Японський апарат IKAROS вперше продемонстрував принцип у 2010 році. ' +
        'Для внутрішньої Сонячної системи — перспективно. ' +
        'Для далекого космосу — тиск занадто слабкий.',

        '**Breakthrough Starshot** — проєкт, що пропонує розігнати мікроапарат до 20% швидкості ' +
        'світла потужними лазерами із Землі, направленими на легке сонячне вітрило. ' +
        'Мета — досягти системи Альфа Центавра за 20 років. ' +
        'Зараз проєкт перебуває на стадії досліджень і прототипування. ' +
        'Головні виклики — точне наведення лазерів і виживання апарата на таких швидкостях.',
      ],
    },

    {
      diagram: {
        title: 'Питома імпульсивність різних типів двигунів',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Питома імпульсивність (Isp, секунди)</text>

  <!-- Y axis label -->
  <text x="14" y="270" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90,14,160)">Isp, с</text>

  <!-- Bars background line -->
  <line x1="60" y1="40" x2="60" y2="270" stroke="#334455" stroke-width="1"/>
  <line x1="60" y1="270" x2="650" y2="270" stroke="#334455" stroke-width="1"/>

  <!-- Scale lines -->
  <line x1="58" y1="270" x2="650" y2="270" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="215" x2="650" y2="215" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="160" x2="650" y2="160" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="105" x2="650" y2="105" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="50" x2="650" y2="50" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <text x="52" y="274" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0</text>
  <text x="52" y="219" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">500</text>
  <text x="52" y="164" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1000</text>
  <text x="52" y="109" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1500</text>
  <text x="52" y="54" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">2000</text>

  <!-- Bar: Solid propellant ~265s -->
  <rect x="72" y="243" width="70" height="27" fill="#ff8844" opacity="0.8"/>
  <text x="107" y="240" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">~265 с</text>
  <text x="107" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Тверде</text>
  <text x="107" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">паливо</text>

  <!-- Bar: Kerosene/LOX ~350s -->
  <rect x="162" y="232" width="70" height="38" fill="#ff8844" opacity="0.8"/>
  <text x="197" y="229" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">~350 с</text>
  <text x="197" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Merlin</text>
  <text x="197" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">гас/LOX</text>

  <!-- Bar: Raptor methane/LOX ~380s -->
  <rect x="252" y="228" width="70" height="42" fill="#ff8844" opacity="0.9"/>
  <text x="287" y="225" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">~380 с</text>
  <text x="287" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Raptor</text>
  <text x="287" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">CH4/LOX</text>

  <!-- Bar: RS-25 LH2/LOX ~452s -->
  <rect x="342" y="220" width="70" height="50" fill="#7bb8ff" opacity="0.85"/>
  <text x="377" y="217" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">~452 с</text>
  <text x="377" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">RS-25</text>
  <text x="377" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">H2/LOX</text>

  <!-- Bar: Nuclear thermal ~900s -->
  <rect x="432" y="173" width="70" height="97" fill="#44ff88" opacity="0.75"/>
  <text x="467" y="170" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">~900 с</text>
  <text x="467" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Ядерний</text>
  <text x="467" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">тепловий</text>

  <!-- Bar: Ion thruster ~3000s (truncated with arrow) -->
  <rect x="522" y="50" width="70" height="220" fill="#cc4444" opacity="0.6"/>
  <!-- Arrow indicating it goes higher -->
  <polygon points="557,42 549,58 565,58" fill="#cc4444" opacity="0.9"/>
  <text x="557" y="37" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">3000+ с</text>
  <text x="557" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Іонний</text>
  <text x="557" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">двигун</text>
</svg>`,
        caption:
          'Питома імпульсивність від твердопаливних бустерів (~265 секунд) до іонних двигунів (3000+ секунд). ' +
          'Чим вища Isp — тим менше палива потрібно для однакового маневру, але хімічні двигуни виграють за тягою: ' +
          'іонний двигун ніколи не злетить з Землі.',
      },
    },

    {
      heading: 'Рівняння Ціолковського: чому паливо — це експонента',
      level: 2,
      paragraphs: [
        'Рівняння Ціолковського — одне з найважливіших у ракетній техніці. ' +
        'Воно пов\'язує зміну швидкості ракети (_дельта-V_), швидкість виходу газу з сопла ' +
        'та відношення початкової маси (з паливом) до кінцевої маси (без палива).',

        'Результат, якщо формулювати словами: для кожного _лінійного_ збільшення кінцевої ' +
        'швидкості потрібне _експоненціальне_ збільшення частки палива. ' +
        'Якщо ракеті треба вдвічі більше дельта-V — палива треба не вдвічі більше, ' +
        'а у квадраті більше (або й більше). ' +
        'Це і є тираном, що не дає ракетам ставати легкими.',

        'На практиці це означає: щоб вийти на низьку орбіту Землі, потрібна дельта-V ' +
        'близько дев\'яти кілометрів на секунду (з урахуванням гравітаційних і атмосферних втрат). ' +
        'Навіть для найкращих двигунів це вимагає, щоб паливо становило приблизно 85–90% ' +
        'стартової маси ракети. Звідси й характерний вигляд ракет: ' +
        'величезні баки і крихітна корисна секція. Кожен зайвий кілограм на старті ' +
        'коштує у кілька разів більше у масі палива.',
      ],
    },

    {
      diagram: {
        title: 'Дельта-V та масове співвідношення: ціна швидкості',
        svg: `<svg viewBox="0 0 660 290" xmlns="http://www.w3.org/2000/svg">
  <rect width="660" height="290" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="330" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Масове співвідношення vs. дельта-V</text>

  <!-- Axes -->
  <line x1="60" y1="240" x2="610" y2="240" stroke="#334455" stroke-width="1.5"/>
  <line x1="60" y1="240" x2="60" y2="40" stroke="#334455" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="335" y="272" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">дельта-V (км/с)</text>

  <!-- Y axis label -->
  <text x="14" y="145" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90,14,145)">масове співвідн.</text>

  <!-- X axis ticks -->
  <text x="60" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">0</text>
  <text x="170" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2</text>
  <text x="280" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">4</text>
  <text x="390" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">6</text>
  <text x="500" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">8</text>
  <text x="610" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10</text>

  <!-- Y axis ticks -->
  <text x="50" y="243" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1</text>
  <text x="50" y="204" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">2</text>
  <text x="50" y="163" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">4</text>
  <text x="50" y="121" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">8</text>
  <text x="50" y="78" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">16</text>

  <!-- Exponential curve Isp=350 (kerosene) -->
  <!-- Points approximated for dV=0..10, mass ratio = exp(dV/3.43) where ve=3.43 km/s for Isp=350 -->
  <polyline
    points="60,240 115,225 170,211 225,197 280,183 335,169 390,153 445,136 500,116 555,92 610,63"
    fill="none" stroke="#ff8844" stroke-width="2"/>
  <text x="618" y="63" fill="#ff8844" font-family="monospace" font-size="10">Isp 350 с</text>
  <text x="618" y="75" fill="#ff8844" font-family="monospace" font-size="10">(гас/LOX)</text>

  <!-- Exponential curve Isp=450 (RS-25) -->
  <!-- ve=4.41 km/s for Isp=450 -->
  <polyline
    points="60,240 115,230 170,219 225,208 280,197 335,186 390,174 445,162 500,148 555,133 610,116"
    fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <text x="618" y="117" fill="#7bb8ff" font-family="monospace" font-size="10">Isp 450 с</text>
  <text x="618" y="129" fill="#7bb8ff" font-family="monospace" font-size="10">(H2/LOX)</text>

  <!-- LEO annotation line -->
  <line x1="391" y1="40" x2="391" y2="240" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,5" opacity="0.7"/>
  <text x="393" y="52" fill="#44ff88" font-family="monospace" font-size="9">LEO</text>
  <text x="393" y="63" fill="#44ff88" font-family="monospace" font-size="9">~9 км/с</text>
</svg>`,
        caption:
          'Масове співвідношення зростає за експоненціальним законом. ' +
          'Для виходу на низьку орбіту Землі (LEO, ~9 км/с дельта-V) навіть з RS-25 (Isp 450 с) ' +
          'маса палива має перевищувати корисне навантаження у кілька разів. ' +
          'Саме тому ракети такі великі.',
      },
    },

    {
      heading: 'Сопло: де фізика перетворює тепло на швидкість',
      level: 2,
      paragraphs: [
        'Сама по собі висока температура горіння ще не дає тяги. ' +
        'Щоб перетворити теплову енергію на кінетичну — потрібне сопло. ' +
        'Класичне ракетне сопло — _сопло Лаваля_, або конвергентно-дивергентне сопло. ' +
        'Спочатку канал звужується (конвергентна частина), газ прискорюється до швидкості звуку, ' +
        'а потім канал розширюється (дивергентна частина) — і газ продовжує прискорюватись ' +
        'вже надзвуково, перетворюючи ентальпію горіння на максимальну швидкість виходу.',

        'Форма сопла оптимізується для конкретної висоти: великий ступінь розширення ' +
        '(широке сопло) ефективний у вакуумі, але у атмосфері виникає зворотний тиск, ' +
        'що знижує тягу. Тому двигуни першого ступеня мають коротше сопло, ' +
        'а другого або вакуумні версії — значно довше. ' +
        'Merlin Vacuum — хороший приклад: його сопло у рази більше за базовий Merlin.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-nozzle-diagram',
        prompt:
          'Scientific cut-away diagram of a convergent-divergent (de Laval) rocket nozzle: ' +
          'cross-section showing gas flow direction with labeled zones: convergent throat section, sonic throat point, divergent expansion section. ' +
          'Pressure gradient shown with color gradient from orange (high pressure, combustion chamber) to blue (low pressure, exit). ' +
          'Mach number scale illustrated along the flow path. ' +
          'Hard sci-fi style, dark background, monospace labels, clear flow arrows. ' +
          'Add the following text labels on the image: "combustion chamber", "throat (Mach 1)", "expansion section", "exhaust exit", "pressure drops".',
        alt: 'Розріз конвергентно-дивергентного сопла Лаваля з позначеними зонами тиску та швидкості потоку газу',
        caption: 'У горловині сопла газ досягає швидкості звуку (число Маха дорівнює 1), потім у розширювальній частині продовжує прискорюватись надзвуково. Оптимальний ступінь розширення сопла залежить від висоти польоту.',
        aspectRatio: '4:3',
      },
    },

    {
      image: {
        cacheKey: 'rocket-engines-solar-sail-concept',
        prompt:
          'Scientific concept illustration of a solar sail spacecraft in deep space: ' +
          'an enormous ultra-thin reflective square sail spanning hundreds of meters, ' +
          'catching sunlight from the lower left as golden light pressure arrows, ' +
          'tiny spacecraft bus visible at the center of the sail, ' +
          'deep black space background with faint star field. ' +
          'Hard sci-fi style, clean and elegant, technically plausible. ' +
          'Add the following text labels on the image: "solar pressure", "reflective sail", "spacecraft bus", "no propellant needed".',
        alt: 'Концепт космічного апарата із сонячним вітрилом у глибокому космосі — гігантська тонка плівка відображає сонячне світло для тяги',
        caption: 'Сонячне вітрило — єдиний двигун без палива. Тиск фотонів сонячного світла нескінченно малий, але у вакуумі з часом накопичується значна швидкість. IKAROS від JAXA підтвердив принцип у 2010 році.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Тяга',
      definition:
        'Сила, що діє на ракету у напрямку, протилежному до викиду газу. Визначається третім законом Ньютона: сила = масовий потік × швидкість виходу газу.',
    },
    {
      term: 'Питома імпульсивність (Isp)',
      definition:
        'Міра ефективності ракетного двигуна: скільки секунд одиниця маси палива забезпечує одиницю тяги. Вимірюється в секундах. Чим вища — тим ефективніший двигун.',
    },
    {
      term: 'Дельта-V (delta-V)',
      definition:
        'Зміна швидкості ракети або космічного апарата. Ключова величина для планування орбітальних маневрів. Для виходу на низьку орбіту Землі потрібно близько 9 кілометрів на секунду дельта-V.',
    },
    {
      term: 'Рівняння Ціолковського',
      definition:
        'Фундаментальне рівняння ракетної динаміки, що пов\'язує дельта-V, питому імпульсивність та відношення початкової маси до кінцевої. Показує, що для збільшення швидкості потрібна експоненційна кількість палива.',
    },
    {
      term: 'Staged combustion (ступінчасте горіння)',
      definition:
        'Цикл роботи рідинного двигуна, при якому весь відпрацьований газ турбіни подається назад у головну камеру і догорає. Більш ефективний за газогенераторний цикл, але складніший у виготовленні.',
    },
    {
      term: 'Сопло Лаваля',
      definition:
        'Конвергентно-дивергентне сопло, що прискорює газ спочатку до швидкості звуку у горловині, потім надзвуково у розширювальній частині. Перетворює теплову енергію на максимальну кінетичну.',
    },
    {
      term: 'Іонний двигун',
      definition:
        'Електричний ракетний двигун, що іонізує інертний газ (зазвичай ксенон) і прискорює іони електричним полем. Питома імпульсивність у 5–10 разів вища за хімічні двигуни, але тяга мізерна.',
    },
    {
      term: 'Full-flow staged combustion',
      definition:
        'Найефективніший цикл рідинного двигуна, де обидва компоненти (паливо і окиснювач) проходять через власні форсажні камери перед основною. Реалізований у SpaceX Raptor вперше у серійному виробництві.',
    },
  ],

  quiz: [
    {
      question: 'Чому ракета може летіти у вакуумі, де немає повітря?',
      options: [
        'Вона відштовхується від власного електромагнітного поля',
        'Тяга виникає через відштовхування від молекул залишкового газу у вакуумі',
        'Ракета відкидає масу газу назад, і за третім законом Ньютона отримує тягу вперед',
        'У вакуумі немає опору, тому двигун не потрібен — ракета летить за інерцією',
      ],
      correctIndex: 2,
      explanation:
        'Тяга — це реакція на викинуту масу. За третім законом Ньютона: дія (викид газу) породжує рівну й протилежну протидію (тягу). Повітря тут не потрібно — навпаки, у вакуумі сопло може розширити газ ефективніше, ніж в атмосфері.',
    },
    {
      question: 'Що таке питома імпульсивність (Isp) і навіщо вона потрібна?',
      options: [
        'Максимальна тяга двигуна у кілоньютонах',
        'Час, протягом якого двигун може працювати без перерви',
        'Міра ефективності: скільки тяги дає одиниця маси палива за одиницю часу',
        'Відношення маси двигуна до його тяги',
      ],
      correctIndex: 2,
      explanation:
        'Питома імпульсивність вимірюється в секундах і показує, наскільки ефективно двигун використовує паливо. Чим вища Isp — тим менше палива потрібно для однакового маневру. RS-25 (водень-кисень) має Isp близько 452 секунд, що є одним з найвищих показників серед льотних хімічних двигунів.',
    },
    {
      question: 'Що означає рівняння Ціолковського на практиці для конструкторів ракет?',
      options: [
        'Ракета може летіти без палива, якщо її маса досить мала',
        'Для подвоєння фінальної швидкості потрібне не подвійне, а набагато більше паливо (залежність експоненціальна)',
        'Більший двигун завжди дає більшу дельта-V',
        'Тяга двигуна напряму пропорційна масі палива',
      ],
      correctIndex: 1,
      explanation:
        'Рівняння Ціолковського показує: дельта-V зростає як логарифм від масового співвідношення, а значить масове співвідношення зростає як експонента від бажаної дельта-V. Щоб подвоїти швидкість — потрібно піднести масове співвідношення у квадрат. Тому ракети такі великі відносно свого вантажу.',
    },
    {
      question: 'Який з перелічених двигунів має найвищу питому імпульсивність?',
      options: [
        'Твердопаливний бустер Space Shuttle (~265 секунд)',
        'Merlin від SpaceX (~348 секунд)',
        'RS-25 (водень і кисень, ~452 секунди)',
        'Іонний двигун Hall thruster (~1500–3000 секунд)',
      ],
      correctIndex: 3,
      explanation:
        'Іонні двигуни мають найвищу питому імпульсивність — в кілька разів вищу за найкращі хімічні двигуни. Але їхня тяга виміряється в мілі-ньютонах, тому вони непридатні для злету. Серед хімічних двигунів RS-25 лідирує завдяки рідкому водню.',
    },
  ],

  sources: [
    {
      title: 'NASA — Basics of Space Flight: Rocket Propulsion',
      url: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter-11/',
      meta: 'NASA, відкритий доступ, оновлено 2024',
    },
    {
      title: 'Sutton G., Biblarz O. — Rocket Propulsion Elements, 9th ed.',
      url: 'https://www.wiley.com/en-us/Rocket+Propulsion+Elements%2C+9th+Edition-p-9781118753651',
      meta: 'Wiley, 2017 — класичний підручник',
    },
    {
      title: 'SpaceX — Raptor Engine Overview (technical brief)',
      url: 'https://www.spacex.com/vehicles/starship/',
      meta: 'SpaceX офіційний сайт, 2024',
    },
    {
      title: 'Aerojet Rocketdyne — RS-25 Engine Fact Sheet',
      url: 'https://www.rocket.com/space/space-access/rs-25',
      meta: 'AerojetRocketdyne, 2023',
    },
    {
      title: 'Tsiolkovsky K. — The Exploration of Cosmic Space by Means of Reaction Devices (1903)',
      url: 'https://archive.org/details/TheExplorationOfCosmicSpace',
      meta: 'Archive.org, перше видання 1903 року',
    },
    {
      title: 'ESA — Ion Propulsion: Gentle but Efficient',
      url: 'https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Ion_propulsion_gentle_but_efficient',
      meta: 'ESA, відкритий доступ',
    },
    {
      title: 'NASA — Nuclear Thermal Propulsion (NTP) Program',
      url: 'https://www.nasa.gov/space-technology-mission-directorate/nuclear-thermal-propulsion/',
      meta: 'NASA STMD, оновлено 2024',
    },
    {
      title: 'Breakthrough Starshot — Project Overview',
      url: 'https://breakthroughinitiatives.org/initiative/3',
      meta: 'Breakthrough Initiatives, відкритий доступ',
    },
    {
      title: 'JAXA — IKAROS Solar Sail Mission Results',
      url: 'https://www.isas.jaxa.jp/en/missions/spacecraft/current/ikaros.html',
      meta: 'JAXA, 2010–2015, відкритий доступ',
    },
    {
      title: 'Everyday Astronaut — Rocket Engine Cycles Explained',
      url: 'https://everydayastronaut.com/raptor-engine/',
      meta: 'Tim Dodd, 2020–2023, відкритий доступ',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
