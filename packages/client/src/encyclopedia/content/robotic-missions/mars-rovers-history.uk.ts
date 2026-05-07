import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'mars-rovers-history',
  language: 'uk',
  section: 'robotic-missions',
  order: 5,
  difficulty: 'beginner',
  readingTimeMin: 13,
  title: 'Історія марсоходів',
  subtitle: 'Від мікрохвильовки на колесах до ядерних лабораторій на поверхні Червоної планети — тридцять років машинної розвідки.',

  hero: {
    cacheKey: 'mars-rovers-history-hero',
    prompt:
      'Photorealistic science encyclopedia illustration: a dramatic panorama of the Martian surface at sunset, ' +
      'three generations of Mars rovers shown to accurate relative scale side by side on red rocky terrain — ' +
      'a tiny box-shaped Sojourner (microwave-sized), a golf-cart-sized Spirit/Opportunity, ' +
      'and a car-sized Curiosity/Perseverance with its mast camera raised. ' +
      'Rusty red Mars sky with a pale sun disk. Hard sci-fi style, dark atmospheric tones, technically accurate rover geometry. ' +
      'Add the following text labels on the image: "Sojourner 1997", "Spirit / Opportunity 2004", "Curiosity 2012", "Perseverance 2021".',
    alt: 'Три покоління марсоходів у порівнянні масштабів на поверхні Марса — Sojourner, Spirit/Opportunity та Curiosity/Perseverance',
    caption:
      'Тридцять років еволюції від одинадцятикілограмового Sojourner до дев\'ятисоткілограмового Perseverance. Кожне покоління несло нові наукові інструменти, більшу автономність та вищу мобільність.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Марс завжди був найбільш досяжним із чужих світів. Достатньо близький, щоб туди долетіли машини. ' +
        'Достатньо схожий на Землю, щоб вчені задавали правильні питання. ' +
        'Достатньо суворий, щоб кожна місія перетворювалася на інженерний подвиг. ' +
        'Починаючи з кінця двадцятого століття, людство відправило на Червону планету цілу серію ' +
        'колісних роботів — кожен наступний складніший, важчий і розумніший за попередника.',

        'Марсоходи вирішують задачу, яку не можуть виконати орбітальні апарати: вони торкаються. ' +
        'Буквально. Вони свердлять, нюхають, беруть зразки, вимірюють радіацію і ведуть хімічний аналіз ' +
        'прямо на місці. Камера з орбіти бачить форми. Марсохід розповідає про склад. ' +
        'Різниця між цими двома рівнями знань — принципова.',

        'Шлях від першого невпевненого перекочування по марсіанській рівнині до польоту вертольота ' +
        'в атмосфері іншої планети зайняв менше тридцяти років. ' +
        'За цей час інженери вирішили проблеми пилу, радіації, екстремальних перепадів температури ' +
        'і затримки сигналу до двадцяти хвилин в один бік. ' +
        'Ці рішення формують фундамент для будь-якої майбутньої пілотованої місії.',
      ],
    },

    {
      heading: 'Sojourner: перший крок',
      level: 2,
      paragraphs: [
        'У середині 1990-х років жоден марсохід ще не котився по марсіанській поверхні. ' +
        'Перед командою проєкту Pathfinder стояло завдання, яке здавалося нерозв\'язним: ' +
        'доставити рухому машину на планету з бюджетом, що був у рази менший за попередні місії, ' +
        'і довести, що так узагалі можна робити.',

        'Результат мав форму невеликої скрині на шести колесах, приблизно як мікрохвильова піч — ' +
        'одинадцять кілограмів, шістдесят три сантиметри в довжину. ' +
        'Sojourner приземлився разом зі станцією Pathfinder у 1997 році і відразу переписав правила: ' +
        'замість парашутів і гальмівних двигунів посадку виконали величезні надувні подушки безпеки, ' +
        'що відскакували і котилися по поверхні, поки апарат не зупинився.',

        'Марсохід проїхав приблизно сто метрів за вісімдесят п\'ять діб активної роботи — ' +
        'при запланованих дев\'яноста днях місії. ' +
        'Але головним досягненням була не відстань. Це був перший у світі доказ, ' +
        'що колісний робот може самостійно переміщатись поверхнею іншої планети, ' +
        'обминати перешкоди і надсилати дані у реальному часі. ' +
        'Концепція "краще, швидше, дешевше" — пізніше розкритикована в інших контекстах — ' +
        'у випадку Pathfinder спрацювала блискуче.',
      ],
    },

    {
      image: {
        cacheKey: 'mars-rovers-sojourner-pathfinder',
        prompt:
          'Photorealistic science encyclopedia illustration: NASA Sojourner rover on the Martian surface in 1997, ' +
          'tiny six-wheeled box-shaped robot next to a large reddish rock, ' +
          'the Pathfinder lander with its opened petal solar panels visible in the background. ' +
          'Rocky red Martian terrain, pale sky. Hard sci-fi style, historically accurate geometry. ' +
          'Add the following text labels on the image: "Sojourner rover", "Pathfinder lander", "Mars 1997", "11 kg".',
        alt: 'Марсохід Sojourner поруч із великим каменем на поверхні Марса — місія Pathfinder 1997 року',
        caption:
          'Sojourner і камінь «Йоги». Одинадцятикілограмовий апарат аналізував хімічний склад марсіанських порід ' +
          'за допомогою спектрометра альфа-протонів. Це була перша рухома наукова лабораторія на іншій планеті.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Близнюки Spirit та Opportunity: три місяці, що стали роками',
      level: 2,
      paragraphs: [
        'Після успіху Sojourner наступне завдання звучало амбітніше: відправити два марсоходи ' +
        'одночасно, зробити їх значно більшими і перевірити, чи є у Марса вода у минулому. ' +
        'Spirit та Opportunity — Марсіанська Дослідницька Місія у складі двох апаратів — ' +
        'сіли на протилежних боках планети у 2004 році. ' +
        'Кожен важив сто вісімдесят кілограмів, розміром з невеликий гольф-карт.',

        'Плановий термін роботи: дев\'яносто марсіанських діб. ' +
        'Насправді ж Spirit пропрацював шість років і застряг у пастці з піску у 2010 році, ' +
        'після чого зв\'язок з ним обірвався. Opportunity встановив рекорд, ' +
        'який і досі вражає: чотирнадцять років на поверхні і майже сорок п\'ять кілометрів подоланого шляху. ' +
        'Жоден інший марсохід до нього не накатував і близько.',

        'Opportunity завершив свою місію у 2018 році через глобальну пилову бурю, ' +
        'яка затьмарила сонце і позбавила сонячні батареї живлення. ' +
        'Остання телеметрія прийшла на Землю з повідомленням про критично низький рівень заряду ' +
        'і темряву навколо. Жодна подальша команда відповіді не отримала. ' +
        'Для всієї команди місії це було більше ніж технічна поломка.',
      ],
    },

    {
      image: {
        cacheKey: 'mars-rovers-opportunity-crater',
        prompt:
          'Photorealistic science encyclopedia illustration: NASA Opportunity rover on the rim of a large Martian impact crater, ' +
          'panoramic view of the crater interior, layered sedimentary rock walls visible, ' +
          'the rover\'s solar panels and camera mast detailed and accurate, ' +
          'pale reddish Martian sky. Hard sci-fi style, dramatic lighting. ' +
          'Add the following text labels on the image: "Opportunity rover", "impact crater", "sedimentary layers", "Mars 2004-2018".',
        alt: 'Марсохід Opportunity на краю ударного кратера з шарами осадових порід на Марсі',
        caption:
          'Opportunity досліджував кратери, де оголені шари осадових порід дозволяли читати давню геологічну історію планети. ' +
          'Знахідки гематиту і слідів хлоридів підтвердили: вода на ранньому Марсі була реальністю.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Що знайшли близнюки',
      level: 3,
      paragraphs: [
        'Наукова цінність місії Марсіанської Дослідницької Місії важко переоцінити. ' +
        'Spirit знайшов у кратері Гусєва породи, змінені гарячою водою і сірчистими газами, — ' +
        'сліди гідротермальної активності мільярди років тому. ' +
        'Opportunity у затоці Меридіані виявив кульки гематиту — мінералу, ' +
        'що утворюється переважно у присутності рідкої води. ' +
        'Ще важливіше: він знайшов сульфатні шари порід, відкладені на дні прадавнього моря.',

        'Разом ці дані дали відповідь на головне питання: ранній Марс мав рідку воду на поверхні. ' +
        'Не тимчасово. Достатньо довго, щоб утворились осадові шари і мінерали, ' +
        'для виникнення яких потрібні тисячоліття. ' +
        'Чи могло жити там щось — питання відкрите. Але умови, принаймні, існували.',
      ],
    },

    {
      heading: 'Curiosity: лабораторія розміром з автомобіль',
      level: 2,
      paragraphs: [
        'До 2012 року стало зрозуміло: щоб відповісти на питання про придатність Марса для життя, ' +
        'потрібна не просто рухома камера з мінімальними інструментами, ' +
        'а справжня пересувна хімічна лабораторія. ' +
        'Марсіанська наукова лабораторія — восьмисоткілограмовий ровер Curiosity — ' +
        'прибула до кратера Гейл.',

        'Посадка сама по собі стала легендою. Традиційні надувні подушки безпеки для такої маси ' +
        'вже не підходили. Інженери вигадали так звану "небесну мотузку": ' +
        'ровер на тросах повільно опускала спеціальна платформа, що зависла на ракетних двигунах, ' +
        'а коли колеса торкнулися поверхні — трос обрізали, і платформа відлетіла вбік і впала. ' +
        'Операція відбулася автоматично, без жодної можливості втручання з Землі через затримку сигналу. ' +
        'Коли центр управління отримав підтвердження успіху — проїхало вже сімнадцять хвилин після посадки.',

        'Curiosity не живиться від сонця. Він використовує радіоізотопний термоелектричний генератор: ' +
        'тепло від природного розпаду плутонію-238 перетворюється на електрику. ' +
        'Це звільняє від залежності від пилових бур і дозволяє працювати цілодобово в будь-яку пору року. ' +
        'За понад десять років він проїхав приблизно тридцять кілометрів по дну кратера Гейл ' +
        'і піднявся на схили горба Шарпа.',
      ],
    },

    {
      image: {
        cacheKey: 'mars-rovers-curiosity-skycrane',
        prompt:
          'Photorealistic science encyclopedia illustration: dramatic cutaway diagram of the Mars Science Laboratory sky crane delivery system — ' +
          'a rocket-powered descent stage hovering above the Martian surface on thruster flames, ' +
          'lowering the Curiosity rover on three nylon tethers toward the red rocky ground. ' +
          'Stars and dark sky above. Hard sci-fi style, technically accurate spacecraft geometry. ' +
          'Add the following text labels on the image: "descent stage", "nylon tethers", "Curiosity rover", "sky crane maneuver", "Mars 2012".',
        alt: 'Діаграма посадки марсоходу Curiosity методом "небесної мотузки" — платформа на ракетних двигунах опускає ровер на тросах',
        caption:
          'Посадкова система "небесна мотузка" залишалася єдиним способом доставити апарат масою понад вісімсот кілограмів ' +
          'без руйнування. Та сама система була повторно застосована для Perseverance у 2021 році.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Що знайшов Curiosity',
      level: 3,
      paragraphs: [
        'Curiosity підтвердив найважливіше: кратер Гейл колись був озером. ' +
        'Осадові породи, знайдені в регіоні Єллоунайф-Бей, утворилися в умовах ' +
        'нейтральної або слаболужної прісної води — середовища, придатного для мікробного життя ' +
        'з хімічної точки зору. Це не означає, що життя було. ' +
        'Але це означає, що перешкод з боку хімії не існувало.',

        'У 2018 році прилади зафіксували органічні молекули у марсіанських породах. ' +
        'Органіка на Марсі — не обов\'язково ознака життя: вона може мати абіотичне походження. ' +
        'Але сам факт збереження органіки протягом мільярдів років — ' +
        'при жорсткому ультрафіолеті і окиснювальній атмосфері — ' +
        'говорить про те, що Марс може зберігати хімічні сліди минулого ' +
        'набагато краще, ніж вважалося раніше.',

        'Curiosity також вимірював радіацію: дані показали, що на поверхні людина отримала б ' +
        'дозу приблизно у двісті мілізивертів на рік — ' +
        'вп\'ятеро вище від норми для космонавтів на Міжнародній космічній станції. ' +
        'Ця цифра безпосередньо впливає на проєктування майбутніх пілотованих місій.',
      ],
    },

    {
      heading: 'Perseverance та Ingenuity: нова ера',
      level: 2,
      paragraphs: [
        'У 2021 році на Марс приземлився Perseverance — найскладніший марсохід в історії. ' +
        'Його маса наближається до тисячі кілограмів. ' +
        'Посадку здійснили за тією самою схемою "небесної мотузки", що і Curiosity, ' +
        'але цього разу в кратері Єзеро — давньому озері, де збереглася дельта річки ' +
        'з відкладеними тонкощаруватими породами.',

        'Головна ціль Perseverance — не просто аналіз, а збір зразків. ' +
        'Ровер запечатує фрагменти порід і реголіту в металеві тюбики ' +
        'і залишає їх на поверхні для майбутньої місії повернення зразків приблизно до 2035 року. ' +
        'Якщо ця концепція буде реалізована, земні лабораторії нарешті отримають марсіанський матеріал ' +
        'для аналізу за допомогою апаратури, яку неможливо вмістити в ровер.',

        'Разом з Perseverance летів маленький вертоліт Ingenuity. ' +
        'Перший у світі керований політ з двигуном в атмосфері іншої планети відбувся навесні 2021 року. ' +
        'За планами — кілька тестових польотів. Насправді Ingenuity здійснив понад сімдесят два польоти ' +
        'перш ніж пошкодив лопать і завершив операції на початку 2024 року. ' +
        'Кожен з цих польотів — пряма демонстрація того, що повітроплавання в атмосфері густиною ' +
        'менше одного відсотка від земної можливе.',
      ],
    },

    {
      image: {
        cacheKey: 'mars-rovers-perseverance-ingenuity',
        prompt:
          'Photorealistic science encyclopedia illustration: NASA Perseverance rover and Ingenuity helicopter on the Martian surface — ' +
          'Perseverance in the foreground, large car-sized rover with mast camera and robotic arm, ' +
          'small Ingenuity helicopter visible in mid-air behind it with rotor blur, ' +
          'Jezero Crater delta sedimentary terrain in background, pale rusty Martian sky. ' +
          'Hard sci-fi style, accurate geometry. ' +
          'Add the following text labels on the image: "Perseverance rover", "Ingenuity helicopter", "Jezero Crater", "Mars 2021".',
        alt: 'Марсохід Perseverance і вертоліт Ingenuity в кратері Єзеро на Марсі у 2021 році',
        caption:
          'Ingenuity — перший літальний апарат з двигуном, що злетів на іншій планеті. ' +
          'Пара Perseverance та Ingenuity працювала синергійно: вертоліт розвідував маршрут, ' +
          'ровер збирав зразки по оптимальній траєкторії.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Виробництво кисню і підготовка до людей',
      level: 3,
      paragraphs: [
        'Perseverance ніс на борту ще один унікальний прилад — ' +
        'Марсіанський Експеримент з Використання Кисню In-Situ. ' +
        'Ця компактна установка добуває молекулярний кисень безпосередньо з вуглекислого газу марсіанської атмосфери. ' +
        'До 2023 року вона виробила понад сто грамів кисню, ' +
        'довівши, що пальне для ракетного двигуна або дихальний газ для людей ' +
        'можна отримати на місці — без доставки із Землі. ' +
        'Це принципово змінює розрахунки для будь-якої майбутньої пілотованої місії.',
      ],
    },

    {
      heading: 'Тяньвень-1 і Чжужун: новий гравець',
      level: 2,
      paragraphs: [
        'У 2021 році до Марса долетів також китайський апарат місії Тяньвень-1, ' +
        'який успішно висадив ровер Чжужун на рівнині Утопія. ' +
        'Двісті сорок кілограмів, шість коліс, живлення від сонячних панелей.',

        'Чжужун пропрацював приблизно рік, проїхавши близько тисячі восьмисот метрів, ' +
        'перш ніж пилові відкладення на сонячних панелях призвели до критичного ' +
        'зниження потужності у 2022 році. Всі подальші спроби відновити зв\'язок не вдалися.',

        'Наукові результати: радар підповерхневого зондування виявив шари, ' +
        'які можуть свідчити про наявність давніх відкладень, ' +
        'пов\'язаних з водою на глибині декількох метрів. ' +
        'Місія Чжужун підтвердила, що Китай здатний самостійно провести повний цикл ' +
        'марсіанської місії від запуску до посадки і роботи на поверхні.',
      ],
    },

    {
      diagram: {
        title: 'Порівняння масштабів марсоходів',
        svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Порівняння марсоходів: маса та розміри</text>

  <!-- Ground line -->
  <line x1="30" y1="255" x2="670" y2="255" stroke="#334455" stroke-width="1.5"/>
  <text x="350" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">поверхня Марса</text>

  <!-- Sojourner: 11 kg, ~0.63m long x 0.3m tall -->
  <!-- Scale: 1m = 40px. Height ~12px, width ~25px -->
  <rect x="55" y="243" width="25" height="12" fill="#7bb8ff" opacity="0.7" rx="2"/>
  <!-- wheels -->
  <circle cx="60" cy="256" r="4" fill="#7bb8ff" opacity="0.6"/>
  <circle cx="75" cy="256" r="4" fill="#7bb8ff" opacity="0.6"/>
  <text x="67" y="238" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Sojourner</text>
  <text x="67" y="228" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">11 кг</text>
  <text x="67" y="218" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1997</text>

  <!-- Spirit / Opportunity: 180 kg, ~1.6m long x 1.5m tall -->
  <!-- Scale: 1m = 40px. Height ~60px, width ~64px -->
  <rect x="140" y="195" width="64" height="60" fill="#ff8844" opacity="0.5" rx="3"/>
  <!-- wheels -->
  <circle cx="150" cy="256" r="8" fill="#ff8844" opacity="0.6"/>
  <circle cx="172" cy="256" r="8" fill="#ff8844" opacity="0.6"/>
  <circle cx="194" cy="256" r="8" fill="#ff8844" opacity="0.6"/>
  <!-- mast -->
  <rect x="168" y="155" width="4" height="40" fill="#ff8844" opacity="0.6"/>
  <rect x="163" y="148" width="14" height="8" fill="#ff8844" opacity="0.8"/>
  <text x="172" y="143" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Spirit /</text>
  <text x="172" y="133" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Opportunity</text>
  <text x="172" y="123" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">180 кг</text>
  <text x="172" y="113" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">2004</text>

  <!-- Zhurong: 240 kg, ~1.85m long x 1.85m tall -->
  <rect x="265" y="181" width="74" height="74" fill="#44ff88" opacity="0.45" rx="3"/>
  <circle cx="277" cy="256" r="9" fill="#44ff88" opacity="0.55"/>
  <circle cx="302" cy="256" r="9" fill="#44ff88" opacity="0.55"/>
  <circle cx="327" cy="256" r="9" fill="#44ff88" opacity="0.55"/>
  <rect x="297" y="140" width="4" height="41" fill="#44ff88" opacity="0.55"/>
  <rect x="291" y="133" width="16" height="8" fill="#44ff88" opacity="0.75"/>
  <text x="302" y="128" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Чжужун</text>
  <text x="302" y="118" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">240 кг</text>
  <text x="302" y="108" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">2021</text>

  <!-- Curiosity: 900 kg, ~3m long x 2.1m tall -->
  <!-- Scale: height ~84px, width ~120px -->
  <rect x="400" y="171" width="120" height="84" fill="#aabbcc" opacity="0.35" rx="3"/>
  <circle cx="415" cy="256" r="12" fill="#aabbcc" opacity="0.55"/>
  <circle cx="460" cy="256" r="12" fill="#aabbcc" opacity="0.55"/>
  <circle cx="505" cy="256" r="12" fill="#aabbcc" opacity="0.55"/>
  <!-- mast -->
  <rect x="456" y="100" width="5" height="71" fill="#aabbcc" opacity="0.55"/>
  <rect x="448" y="92" width="21" height="9" fill="#aabbcc" opacity="0.75"/>
  <!-- arm -->
  <line x1="400" y1="215" x2="378" y2="240" stroke="#aabbcc" stroke-width="3" opacity="0.6"/>
  <circle cx="375" cy="243" r="6" fill="#aabbcc" opacity="0.6"/>
  <text x="460" y="87" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Curiosity /</text>
  <text x="460" y="77" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Perseverance</text>
  <text x="460" y="67" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">~900 кг</text>
  <text x="460" y="57" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">2012 / 2021</text>

  <!-- Scale bar -->
  <line x1="600" y1="245" x2="640" y2="245" stroke="#667788" stroke-width="1.5"/>
  <line x1="600" y1="242" x2="600" y2="248" stroke="#667788" stroke-width="1.5"/>
  <line x1="640" y1="242" x2="640" y2="248" stroke="#667788" stroke-width="1.5"/>
  <text x="620" y="240" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">1 м</text>
</svg>`,
        caption:
          'Від одинадцятикілограмового Sojourner до дев\'ятисоткілограмового Curiosity і Perseverance — ' +
          'маса марсоходів зросла у вісімдесят разів за менш ніж тридцять років. ' +
          'Кожне покоління несло більше наукових інструментів, кращу навігацію і більший радіус дії.',
      },
    },

    {
      heading: 'Карта місць посадки',
      level: 2,
      paragraphs: [
        'Кожне місце посадки обиралося не випадково — за конкретною науковою логікою.',
      ],
    },

    {
      diagram: {
        title: 'Місця посадки марсоходів на Марсі',
        svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="360" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Місця посадки марсоходів</text>

  <!-- Mars ellipse (simplified map) -->
  <ellipse cx="350" cy="190" rx="290" ry="145" fill="none" stroke="#334455" stroke-width="1.5"/>
  <!-- Equator line -->
  <line x1="60" y1="190" x2="640" y2="190" stroke="#334455" stroke-width="0.8" stroke-dasharray="4,6" opacity="0.6"/>
  <text x="648" y="194" fill="#667788" font-family="monospace" font-size="8">0°</text>
  <!-- Mars surface fill hint -->
  <ellipse cx="350" cy="190" rx="290" ry="145" fill="#cc4444" opacity="0.06"/>

  <!-- Ares Vallis — Pathfinder/Sojourner: ~19.13N, 33.22W → approx x=420, y=170 -->
  <circle cx="420" cy="168" r="6" fill="#7bb8ff" opacity="0.85"/>
  <text x="432" y="164" fill="#7bb8ff" font-family="monospace" font-size="9">Sojourner</text>
  <text x="432" y="175" fill="#8899aa" font-family="monospace" font-size="8">Арес Валліс, 1997</text>

  <!-- Gusev Crater — Spirit: ~14.57S, 175.47E → approx x=185, y=210 -->
  <circle cx="183" cy="208" r="6" fill="#ff8844" opacity="0.85"/>
  <text x="118" y="204" fill="#ff8844" font-family="monospace" font-size="9">Spirit</text>
  <text x="118" y="215" fill="#8899aa" font-family="monospace" font-size="8">Кратер Гусєв, 2004</text>

  <!-- Meridiani Planum — Opportunity: ~1.95S, 5.53W → approx x=325, y=195 -->
  <circle cx="325" cy="196" r="6" fill="#ff8844" opacity="0.85"/>
  <text x="335" y="207" fill="#ff8844" font-family="monospace" font-size="9">Opportunity</text>
  <text x="335" y="218" fill="#8899aa" font-family="monospace" font-size="8">Рівнина Меридіані, 2004</text>

  <!-- Gale Crater — Curiosity: ~5.4S, 137.8E → approx x=210, y=198 -->
  <circle cx="208" cy="200" r="6" fill="#aabbcc" opacity="0.85"/>
  <text x="130" y="238" fill="#aabbcc" font-family="monospace" font-size="9">Curiosity</text>
  <text x="130" y="249" fill="#8899aa" font-family="monospace" font-size="8">Кратер Гейл, 2012</text>
  <line x1="208" y1="200" x2="195" y2="240" stroke="#334455" stroke-width="0.8" opacity="0.7"/>

  <!-- Utopia Planitia — Zhurong: ~25.1N, 109.9E → approx x=230, y=168 -->
  <circle cx="228" cy="166" r="6" fill="#44ff88" opacity="0.85"/>
  <text x="238" y="163" fill="#44ff88" font-family="monospace" font-size="9">Чжужун</text>
  <text x="238" y="174" fill="#8899aa" font-family="monospace" font-size="8">Рівнина Утопія, 2021</text>

  <!-- Jezero Crater — Perseverance: ~18.4N, 77.7E → approx x=270, y=172 -->
  <circle cx="268" cy="171" r="6" fill="#cc4444" opacity="0.9"/>
  <text x="278" y="168" fill="#cc4444" font-family="monospace" font-size="9">Perseverance</text>
  <text x="278" y="179" fill="#8899aa" font-family="monospace" font-size="8">Кратер Єзеро, 2021</text>

  <!-- N/S labels -->
  <text x="350" y="50" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Північ</text>
  <text x="350" y="338" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Південь</text>
  <text x="62" y="194" fill="#667788" font-family="monospace" font-size="8">180°</text>
</svg>`,
        caption:
          'Більшість місць посадки сконцентровані у приекваторіальній зоні — ' +
          'де кут сонця забезпечує достатнє живлення сонячних батарей і атмосфера трохи щільніша для безпечної посадки. ' +
          'Кратери Гейл і Єзеро обрані за наявністю геологічних слідів прадавньої води.',
      },
    },

    {
      heading: 'Уроки трьох десятиліть',
      level: 2,
      paragraphs: [
        'Кожна місія додавала не тільки наукові дані, а й інженерні знання. ' +
        'Пил — головний ворог сонячних панелей. Це зрозуміли ще на Sojourner, ' +
        'але Opportunity і Чжужун заплатили за це своїм існуванням. ' +
        'Радіоізотопний термоелектричний генератор на Curiosity і Perseverance ' +
        'вирішив цю проблему, але коштує на порядки дорожче і потребує збагаченого плутонію, ' +
        'запаси якого обмежені.',

        'Автономність — другий великий урок. Затримка сигналу від чотирьох до двадцяти хвилин ' +
        'в один бік виключає можливість дистанційного керування в реальному часі. ' +
        'Сучасні марсоходи самостійно обирають маршрут, обходять небезпечні ділянки ' +
        'і вирішують тисячі дрібних задач без участі операторів на Землі. ' +
        'Ця автономність — пряме передвістя технологій, що знадобляться пілотованим місіям.',

        'Нарешті — наука. Картина, що складається з результатів п\'яти місій, ' +
        'рисує Марс не мертвою пустелею, а планетою з багатою водною і геологічною історією. ' +
        'Вона не відповідає на питання, чи було там життя. ' +
        'Але вона встановила, що умови для примітивного мікробного життя — принаймні в окремі епохи — ' +
        'відповідали вимогам. Зразки, зібрані Perseverance і зачекані у тюбиках на поверхні, ' +
        'можуть дати фінальну відповідь — якщо місія повернення зразків буде реалізована.',
      ],
    },

    {
      image: {
        cacheKey: 'mars-rovers-sample-tube',
        prompt:
          'Photorealistic science encyclopedia illustration: close-up of a titanium Mars sample tube being sealed by the Perseverance rover arm — ' +
          'gleaming metallic cylinder with rock core sample visible inside, ' +
          'red Martian dust and rocks around it, robotic arm mechanism in frame. ' +
          'Hard sci-fi style, macro detail, dark background. ' +
          'Add the following text labels on the image: "titanium sample tube", "Perseverance arm", "Mars rock core", "cached for future return".',
        alt: 'Титановий тюбик із зразком марсіанської породи, запечатаний маніпулятором марсоходу Perseverance',
        caption:
          'Тюбики із зразками Perseverance — перша ланка в ланцюжку місії повернення марсіанських зразків. ' +
          'Якщо ця місія буде реалізована приблизно до 2035 року, ' +
          'земні лабораторії вперше проаналізують марсіанський матеріал на наявність біосигнатур.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Радіоізотопний термоелектричний генератор',
      definition:
        'Джерело живлення, що перетворює тепло від природного радіоактивного розпаду (зазвичай плутонію-238) на електрику через термопари. Не залежить від сонячного світла і пилу. Використовується на Curiosity і Perseverance.',
    },
    {
      term: 'Небесна мотузка',
      definition:
        'Посадкова система, де ровер на тросах опускається з платформи-носія, що зависає на ракетних двигунах. Використана для Curiosity (2012) і Perseverance (2021) — єдиний спосіб безпечно доставити апарат масою понад вісімсот кілограмів.',
    },
    {
      term: 'Марсіанська Дослідницька Місія',
      definition:
        'Програма НАСА, що включала два рівнозначних марсоходи-близнюки Spirit і Opportunity (2004). Повна назва англійською: Mars Exploration Rover mission.',
    },
    {
      term: 'Марсіанська наукова лабораторія',
      definition:
        'Місія НАСА, що доставила марсохід Curiosity на поверхню Марса у 2012 році. Повна назва англійською: Mars Science Laboratory.',
    },
    {
      term: 'Місія повернення марсіанських зразків',
      definition:
        'Планована спільна місія НАСА і Європейського космічного агентства з доставки зразків марсіанських порід, зібраних Perseverance, на Землю. Очікувана дата: близько 2035 року.',
    },
    {
      term: 'Реголіт',
      definition:
        'Верхній пухкий шар поверхні планети або супутника, що складається з подрібненої породи, пилу і уламків, що утворилися в результаті метеоритного бомбардування і вивітрювання.',
    },
    {
      term: 'Біосигнатура',
      definition:
        'Хімічна, мінералогічна або морфологічна ознака, що може свідчити про минулу або теперішню біологічну активність. Пошук біосигнатур — головна наукова ціль Perseverance.',
    },
    {
      term: 'Затримка сигналу',
      definition:
        'Час, необхідний радіосигналу для подолання відстані між Землею і Марсом. Залежно від позиції планет складає від чотирьох до двадцяти хвилин в один бік. Унеможливлює керування в реальному часі.',
    },
  ],

  quiz: [
    {
      question: 'Яким був головний технічний внесок місії Sojourner у 1997 році?',
      options: [
        'Перше виявлення рідкої води на Марсі',
        'Перша демонстрація, що колісний робот може самостійно переміщуватись поверхнею іншої планети',
        'Перший орбітальний апарат навколо Марса',
        'Перший аналіз марсіанської атмосфери',
      ],
      correctIndex: 1,
      explanation:
        'Sojourner — перший у світі марсохід. Його головне досягнення: довести, що колісний автоматичний апарат здатний самостійно рухатись по іншій планеті, обминати перешкоди і надсилати наукові дані. Відстань у сто метрів і вага одинадцять кілограмів — другорядні деталі порівняно з принциповим прецедентом.',
    },
    {
      question: 'Чому марсохід Curiosity використовує радіоізотопний термоелектричний генератор замість сонячних панелей?',
      options: [
        'Сонце на Марсі надто далеко і сонячні панелі взагалі не працюють',
        'Щоб уникнути залежності від пилових бур і мати постійне живлення вдень і вночі',
        'Тому що радіоізотопний термоелектричний генератор дешевший у виробництві',
        'Через магнітне поле Марса, яке руйнує сонячні елементи',
      ],
      correctIndex: 1,
      explanation:
        'Сонячні панелі вразливі до марсіанського пилу і неефективні вночі. Радіоізотопний термоелектричний генератор забезпечує стале живлення цілодобово і протягом усього року, незалежно від пилових бур. Саме через пилові відкладення на панелях завершили роботу Opportunity і Чжужун.',
    },
    {
      question: 'Яке наукове відкриття зробила місія Mars Exploration Rover, що підтвердило наявність рідкої води в минулому Марса?',
      options: [
        'Виявлення замерзленої води на полюсах',
        'Знахідка кульок гематиту і сульфатних шарів порід, що утворюються у присутності рідкої води',
        'Виявлення органічних молекул у ґрунті',
        'Детекція парів води в атмосфері',
      ],
      correctIndex: 1,
      explanation:
        'Opportunity виявив на рівнині Меридіані кульки гематиту — прізвисько "чорниці" — і шари сульфатних мінералів, характерних для осадових порід, сформованих у рідкій воді. Ці дані стали переконливим доказом, що на ранньому Марсі існували водні середовища, потенційно придатні для мікробного життя.',
    },
    {
      question: 'Що таке "небесна мотузка" і для яких марсоходів вона була застосована?',
      options: [
        'Технологія надувних подушок безпеки, застосована для Sojourner і Spirit/Opportunity',
        'Система тросового опускання ровера з зависаючої ракетної платформи, застосована для Curiosity і Perseverance',
        'Метод гальмування за допомогою парашута і гальмівних двигунів, застосований для Чжужун',
        'Лазерна система точного наведення для всіх марсоходів після 2010 року',
      ],
      correctIndex: 1,
      explanation:
        '"Небесна мотузка" — унікальна посадкова система, де ровер опускається на тросах з платформи, що зависає на ракетних двигунах, а після торкання поверхні трос обрізається. Застосована для Curiosity (2012) і Perseverance (2021) — єдиний інженерний спосіб безпечно посадити апарат масою понад вісімсот кілограмів без руйнування.',
    },
    {
      question: 'Яке значення має Марсіанський Експеримент з Використання Кисню In-Situ на борту Perseverance для майбутніх пілотованих місій?',
      options: [
        'Він вимірює радіацію, щоб визначити безпечний рівень для людей',
        'Він доводить, що кисень для дихання і ракетне паливо можна виробляти безпосередньо з атмосфери Марса',
        'Він аналізує хімічний склад марсіанського ґрунту на наявність органіки',
        'Він тестує матеріали скафандрів в умовах марсіанського середовища',
      ],
      correctIndex: 1,
      explanation:
        'Виробництво кисню безпосередньо з вуглекислого газу марсіанської атмосфери — ключова технологія для будь-якої пілотованої місії. Вона дозволяє не везти з Землі ані дихальний газ, ані окиснювач для зворотного польоту, що радикально знижує масу і вартість місії.',
    },
  ],

  sources: [
    {
      title: 'NASA — Mars Pathfinder Mission Overview',
      url: 'https://mars.nasa.gov/mars-exploration/missions/pathfinder/',
      meta: 'NASA, відкритий доступ',
    },
    {
      title: 'NASA — Mars Exploration Rover Mission',
      url: 'https://mars.nasa.gov/mer/home/',
      meta: 'NASA, відкритий доступ',
    },
    {
      title: 'NASA — Mars Science Laboratory / Curiosity',
      url: 'https://mars.nasa.gov/msl/home/',
      meta: 'NASA, оновлено 2026',
    },
    {
      title: 'NASA — Mars 2020 / Perseverance Rover',
      url: 'https://mars.nasa.gov/mars2020/',
      meta: 'NASA, оновлено 2026',
    },
    {
      title: 'NASA — Ingenuity Mars Helicopter',
      url: 'https://mars.nasa.gov/technology/helicopter/',
      meta: 'NASA, оновлено 2024',
    },
    {
      title: 'CNSA / CLEP — Tianwen-1 Mission and Zhurong Rover',
      url: 'https://www.cnsa.gov.cn/english/n6465652/n6465653/c6812091/content.html',
      meta: 'CNSA, 2021',
    },
    {
      title: 'Squyres S. et al. — In Situ Evidence for an Ancient Aqueous Environment at Meridiani Planum, Mars',
      url: 'https://science.sciencemag.org/content/306/5702/1709',
      meta: 'Science, 2004, vol. 306',
    },
    {
      title: 'Grotzinger J. et al. — A Habitable Fluvio-Lacustrine Environment at Yellowknife Bay, Gale Crater, Mars',
      url: 'https://www.science.org/doi/10.1126/science.1242777',
      meta: 'Science, 2014, vol. 343',
    },
    {
      title: 'Eigenbrode J. et al. — Organic matter preserved in 3-billion-year-old mudstones at Gale crater, Mars',
      url: 'https://www.science.org/doi/10.1126/science.aas9185',
      meta: 'Science, 2018, vol. 360',
    },
    {
      title: 'Hecht M. et al. — Space Resource Utilization: Producing Oxygen on Mars — MOXIE Results',
      url: 'https://www.science.org/doi/10.1126/sciadv.abg1616',
      meta: 'Science Advances, 2021, відкритий доступ',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
