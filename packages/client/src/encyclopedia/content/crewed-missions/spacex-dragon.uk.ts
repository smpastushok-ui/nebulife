import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'spacex-dragon',
  language: 'uk',
  section: 'crewed-missions',
  order: 9,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'SpaceX Dragon — комерційний доступ до орбіти',
  subtitle: 'Як приватна компанія повернула США можливість запускати астронавтів і що це означає для майбутнього пілотованої космонавтики.',

  hero: {
    cacheKey: 'spacex-dragon-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: SpaceX Crew Dragon capsule approaching the International Space Station against deep black space, Earth visible below in blue and white. ' +
      'Capsule shown with open docking port, solar panels deployed, SpaceX livery visible. Station solar arrays catch sunlight. ' +
      'Hard sci-fi style, dark space background, technically detailed. ' +
      'Add the following text labels on the image: "Crew Dragon", "ISS docking port", "Earth orbit".',
    alt: 'Капсула SpaceX Crew Dragon наближається до Міжнародної космічної станції на фоні Землі',
    caption:
      'Crew Dragon під час зближення з Міжнародною космічною станцією. Автономне стикування без участі екіпажу в управлінні — одна з ключових технічних рис цього апарата.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Протягом дев\'яти років після завершення програми Space Shuttle у 2011 році Сполучені Штати ' +
        'не мали власного пілотованого космічного корабля. Щоб доставити астронавта на орбіту, ' +
        'NASA платило Росії за місце на кораблі "Союз" — суму, яка зрештою перевищила вісімдесят мільйонів ' +
        'доларів за одне крісло. Залежність від іноземного транспортного засобу для доступу до станції, ' +
        'яку США допомогли побудувати і фінансують, вважалась стратегічною вразливістю.',

        'У травні 2020 року два астронавти NASA — Боб Бенкен і Даг Херлі — злетіли на борту ' +
        'Crew Dragon в рамках демонстраційної місії Demo-2. Це стало першим пілотованим запуском ' +
        'з американської землі за дев\'ять років і першим у світі, де комерційна компанія ' +
        'здійснила пілотований орбітальний космічний політ за власної розробки і власними засобами. ' +
        'Момент, який мав і технічне, і символічне значення.',

        'За цим подвигом стоїть ширша зміна парадигми — перехід від державної монополії на ' +
        'пілотовану космонавтику до моделі, де NASA виступає замовником послуги, а не єдиним ' +
        'виробником апарата. Цей зсув коштував десятиліть роботи, мільярдів доларів і ' +
        'кардинально відрізняється від того, як програми Mercury, Gemini та Apollo будувались у минулому столітті.',
      ],
    },

    {
      image: {
        cacheKey: 'spacex-dragon-demo2-launch',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Falcon 9 rocket launching from Kennedy Space Center pad 39A at dusk, brilliant white exhaust plume illuminating the launch complex. ' +
          'Rocket ascending through low clouds, American coast and ocean visible. Hard sci-fi style, dramatic lighting. ' +
          'Add the following text labels on the image: "Falcon 9", "Launch Complex 39A", "Demo-2 mission".',
        alt: 'Ракета Falcon 9 стартує зі стартового майданчика 39A Космічного центру Кеннеді в рамках місії Demo-2',
        caption:
          'Старт Demo-2 у травні 2020 року. Ракета-носій Falcon 9 доставила Crew Dragon на орбіту, а потім повернулась і приземлилась на автономній морській платформі в Атлантичному океані.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Комерційна програма NASA і логіка ринку',
      level: 2,
      paragraphs: [
        'У 2014 році NASA оголосило підсумки конкурсу "Комерційного екіпажу" — програми, ' +
        'що мала на меті передати розробку транспортних засобів для доставки астронавтів на орбіту ' +
        'приватному сектору. SpaceX отримала контракт на два мільярди шістсот мільйонів доларів. ' +
        'Boeing — на чотири мільярди двісті мільйонів. Обидві компанії мали розробити власні кораблі ' +
        'і сертифікувати їх для регулярних польотів до Міжнародної космічної станції.',

        'Логіка програми відрізнялась від традиційного підходу NASA. Раніше агентство детально ' +
        'специфікувало кожен вузол апарата і купувало результат. Тепер воно формулювало вимоги ' +
        'до кінцевого результату — безпечно доставити астронавтів на станцію і повернути їх — ' +
        'а метод розробки залишалось за компанією. Це дозволяло компаніям використовувати ' +
        'комерційні практики, зменшувати бюрократію і потенційно скорочувати витрати.',

        'Результати двох компаній розійшлись разюче. SpaceX завершила розробку і здійснила ' +
        'демонстраційний безекіпажний політ Demo-1 у 2019 році, а пілотовану Demo-2 у 2020 році. ' +
        'Boeing мала хронічні технічні проблеми з кораблем Starliner: перший безекіпажний тест ' +
        'у 2019 провалився через програмну помилку. Після кількох переносів Starliner нарешті ' +
        'здійснив випробовувальний пілотований політ у 2024 році — але повернення екіпажу ' +
        'довелось відтермінувати через несправності двигунів і витоки гелію. ' +
        'Астронавти Буч Вілмор і Суні Вільямс, які мали провести на станції тиждень, ' +
        'у підсумку залишились там понад вісім місяців. Crew Dragon забрав їх додому.',
      ],
    },

    {
      heading: 'Що являє собою Crew Dragon технічно',
      level: 2,
      paragraphs: [
        'Crew Dragon — це капсула конічної форми, що розміщує до чотирьох астронавтів. ' +
        'Її попередник, вантажний Dragon, з 2012 року здійснював регулярні рейси до станції ' +
        'і став першим комерційним кораблем, який пристикувався до Міжнародної космічної станції. ' +
        'Crew Dragon — поглиблена версія з системою підтримки життя, скафандрами, ' +
        'новим стикувальним вузлом і системою аварійного порятунку екіпажу.',

        'Система аварійного порятунку — одна з принципових відмінностей від попередніх американських кораблів. ' +
        'Замість башти з твердопаливними ракетами над капсулою, як на Mercury і Apollo, ' +
        'Dragon використовує інтегровані двигуни SuperDraco, вбудовані прямо в корпус капсули. ' +
        'Вони здатні відтягнути капсулу від ракети на будь-якому етапі зльоту — ' +
        'від стартового майданчика до виходу на орбіту. Система спрацювала у випробуванні ' +
        'у 2020 році: спеціально пошкоджений Falcon 9 почав руйнуватись, а капсула успішно ' +
        'відійшла і приземлилась в океані.',

        'Стикування Dragon з станцією відбувається в автономному режимі. Апарат самостійно ' +
        'підходить до потрібного порту, вирівнює положення за допомогою лідарів і камер ' +
        'і стикується без участі людини-оператора в процесі зближення. ' +
        'Це кардинально відрізняється від ручного стикування кораблів "Союз". ' +
        'Астронавти можуть вручну взяти управління у надзвичайній ситуації, але в штатному режимі ' +
        'їхнє завдання — контролювати і підтверджувати, а не пілотувати.',
      ],
    },

    {
      image: {
        cacheKey: 'spacex-dragon-capsule-cutaway',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: cutaway diagram of SpaceX Crew Dragon capsule showing internal crew seats (4 positions), touchscreen interface panels, life support equipment, SuperDraco abort thrusters visible in outer hull pods, docking mechanism at nose. ' +
          'Dark technical background, hard sci-fi style, labeled components. ' +
          'Add the following text labels on the image: "crew seats", "touchscreen controls", "SuperDraco thrusters", "docking port", "heat shield".',
        alt: 'Розріз капсули SpaceX Crew Dragon — місця екіпажу, сенсорні панелі управління, двигуни аварійного порятунку SuperDraco і стикувальний вузол',
        caption:
          'Crew Dragon у розрізі. Інтерфейс управління реалізований на сенсорних екранах замість традиційних тумблерів і кнопок — суттєва зміна філософії дизайну кабіни.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Falcon 9: ракета, яка повертається',
      level: 2,
      paragraphs: [
        'Dragon не існує у вакуумі — його можливості нерозривно пов\'язані з ракетою-носієм. ' +
        'Falcon 9 — двоступенева ракета, яка виводить Dragon на орбіту і принципово відрізняється ' +
        'від усіх попередніх комерційних носіїв тим, що її перший ступінь повертається і ' +
        'використовується повторно. Після відокремлення ступінь перевертається, запалює двигуни ' +
        'і гальмує для входу в атмосферу, потім здійснює контрольований вертикальний посадку — ' +
        'або на стартовому майданчику поблизу Флориди, або на автономній морській платформі в океані.',

        'Економічний ефект цього рішення важко переоцінити. Перший ступінь Falcon 9 коштує ' +
        'більшу частину вартості всієї ракети. Якщо його можна запустити десять, п\'ятнадцять ' +
        'і більше разів — вартість кожного пуску падає. Це той же принцип, що відрізняє ' +
        'авіацію від кораблебудування: літак не тонуть після кожного рейсу. ' +
        'SpaceX довела концепцію до практичного застосування там, де Space Shuttle лише обіцяв це зробити.',

        'Для місій з екіпажем додається консерватизм: NASA вимагає, щоб ступінь, ' +
        'що використовується повторно, мав підтверджені польоти і пройшов інспекцію. ' +
        'Стандарт безпеки вищий, ніж для вантажних місій, але сама можливість повторного використання ' +
        'ракети при пілотованому польоті — дещо, що в минулому столітті вважалось надто ризикованим для масштабного застосування.',
      ],
    },

    {
      diagram: {
        title: 'Crew Dragon проти "Союзу": порівняння габаритів і параметрів',
        svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="360" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="24" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Crew Dragon та "Союз МС" — порівняння</text>

  <!-- Dragon capsule shape (left) -->
  <!-- Cone body -->
  <polygon points="160,60 220,200 100,200" fill="#334455" stroke="#7bb8ff" stroke-width="1.5" opacity="0.85"/>
  <!-- Trunk cylinder below capsule -->
  <rect x="110" y="200" width="100" height="60" fill="#223344" stroke="#7bb8ff" stroke-width="1" opacity="0.7"/>
  <!-- Solar panels -->
  <rect x="60" y="210" width="45" height="12" fill="#44ff88" opacity="0.6"/>
  <rect x="215" y="210" width="45" height="12" fill="#44ff88" opacity="0.6"/>
  <!-- Labels -->
  <text x="160" y="278" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">Crew Dragon</text>
  <text x="160" y="294" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">висота: 8.1 м (з багажником)</text>
  <text x="160" y="308" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">діаметр: 3.7 м</text>
  <text x="160" y="322" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">екіпаж: до 4 осіб</text>
  <text x="160" y="336" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">вартість місця: ~60 млн дол.</text>

  <!-- Soyuz shape (right) -->
  <!-- Service module cylinder -->
  <rect x="430" y="170" width="80" height="70" fill="#332211" stroke="#ff8844" stroke-width="1" opacity="0.75"/>
  <!-- Orbital module sphere -->
  <ellipse cx="470" cy="145" rx="40" ry="30" fill="#443322" stroke="#ff8844" stroke-width="1" opacity="0.75"/>
  <!-- Descent module cone -->
  <polygon points="470,60 510,145 430,145" fill="#554433" stroke="#ff8844" stroke-width="1.5" opacity="0.8"/>
  <!-- Solar panels -->
  <rect x="360" y="190" width="65" height="14" fill="#ff8844" opacity="0.5"/>
  <rect x="515" y="190" width="65" height="14" fill="#ff8844" opacity="0.5"/>
  <!-- Labels -->
  <text x="470" y="278" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle">"Союз МС"</text>
  <text x="470" y="294" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">висота: 7.0 м</text>
  <text x="470" y="308" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">діаметр: 2.7 м (спускна капсула)</text>
  <text x="470" y="322" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">екіпаж: до 3 осіб</text>
  <text x="470" y="336" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">вартість місця: ~80 млн дол.</text>

  <!-- Height scale bar -->
  <line x1="335" y1="60" x2="335" y2="240" stroke="#334455" stroke-width="1" stroke-dasharray="3,4"/>
  <text x="335" y="255" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">масштаб відносний</text>
</svg>`,
        caption:
          'Crew Dragon і "Союз МС" — два діючих пілотованих кораблі, що обслуговують Міжнародну космічну станцію. Dragon перевозить до чотирьох осіб і приводнюється в океані. "Союз" розрахований на трьох і приземляється в казахстанському степу з парашутами і твердопаливними гальмівними двигунами.',
      },
    },

    {
      heading: 'За межі станції: цивільні місії',
      level: 2,
      paragraphs: [
        'Регулярні рейси до Міжнародної космічної станції — лише частина картини. ' +
        'SpaceX будувала Dragon як комерційний апарат, здатний виконувати орбітальні місії ' +
        'для клієнтів, які не є урядовими агентствами.',

        'У вересні 2021 року Dragon здійснив місію Inspiration4 — перший в історії суто цивільний ' +
        'орбітальний політ. На борту не було жодного професійного астронавта. Чотири людини ' +
        'провели на орбіті близько трьох діб на висоті, що перевищувала орбіту Міжнародної ' +
        'космічної станції. Ця місія наочно показала: пілотований космічний політ ' +
        'перестає бути прерогативою держав і їхніх відібраних пілотів.',

        'У 2024 році місія Polaris Dawn додала ще один прецедент. Під час цього польоту ' +
        'двоє членів екіпажу здійснили перший комерційний вихід у відкритий космос — ' +
        'і зробили це в скафандрах, розроблених SpaceX, а не традиційних скафандрах NASA. ' +
        'Вихід відрізнявся від виходів на станції: Dragon не має шлюзу, тому весь ' +
        'відсік декомпресувався, а четверо членів екіпажу були в скафандрах впродовж усього виходу. ' +
        'Технологічно — ризикований крок. Принципово — демонстрація того, що комерційні оператори ' +
        'здатні самостійно виконувати операції, які раніше вимагали складної державної інфраструктури.',
      ],
    },

    {
      image: {
        cacheKey: 'spacex-dragon-polaris-dawn-eva',
        prompt:
          'Photorealistic illustration for a science encyclopedia: astronaut in SpaceX-designed EVA spacesuit floating outside Dragon capsule in low Earth orbit, holding a safety tether, visor reflecting sunlit Earth below. Dragon capsule visible nearby with open hatch. Deep black space with Earth curvature in background. Silhouetted figure, no visible face. Hard sci-fi style. ' +
          'Add the following text labels on the image: "SpaceX EVA suit", "Crew Dragon", "first commercial spacewalk".',
        alt: 'Астронавт у скафандрі SpaceX здійснює вихід у відкритий космос під час місії Polaris Dawn — перший комерційний вихід в відкритий космос',
        caption:
          'Місія Polaris Dawn у 2024 році: перший комерційний вихід у відкритий космос. Скафандри розробила SpaceX, стикувального шлюзу не було — уся капсула декомпресувалась.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Модель замовника: що змінилося для NASA',
      level: 2,
      paragraphs: [
        'Принципова зміна, яку принесла комерційна програма, — не технічна, а управлінська. ' +
        'NASA з розробника апаратів перетворилось на замовника транспортної послуги. ' +
        'Агентство формулює вимоги: безпека екіпажу, надійність систем, параметри орбіти, ' +
        'стандарти стикування. Яким чином це реалізується — рішення компанії.',

        'Наслідки цієї зміни відчутні в цифрах. Програма Space Shuttle коштувала в середньому ' +
        'близько одного мільярда п\'ятисот мільйонів доларів за пуск. Crew Dragon при регулярних ' +
        'ротаційних місіях до станції обходиться приблизно в двісті — двісті п\'ятдесят мільйонів ' +
        'доларів за рейс. Це скорочення на порядок при збереженні вимог безпеки. ' +
        'Частина економії пояснюється меншим розміром апарата, частина — іншою операційною моделлю.',

        'Критики зазначають, що така модель не позбавлена ризиків: якщо єдиний комерційний ' +
        'постачальник зазнає проблем — NASA не має власних засобів доставки на орбіту. ' +
        'Саме тому агентство підписало контракти з двома компаніями — SpaceX і Boeing. ' +
        'Однак реальність виявилась такою, що Dragon виконує переважну більшість пілотованих місій, ' +
        'поки Starliner проходив сертифікацію і долав технічні труднощі. ' +
        'Перша успішна невипробовувальна місія Starliner очікується у середині двадцятих років.',
      ],
    },

    {
      diagram: {
        title: 'Модель комерційного екіпажу: замовник проти підрядника',
        svg: `<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="24" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Традиційна модель vs. Комерційний екіпаж</text>

  <!-- LEFT: Traditional -->
  <rect x="20" y="40" width="300" height="200" rx="4" fill="rgba(50,30,10,0.4)" stroke="#ff8844" stroke-width="1"/>
  <text x="170" y="62" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle">Традиційна (Apollo, Shuttle)</text>

  <rect x="40" y="76" width="260" height="30" rx="3" fill="rgba(80,50,20,0.5)" stroke="#ff8844" stroke-width="0.5"/>
  <text x="170" y="96" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">NASA проектує + будує + оперує</text>

  <rect x="40" y="116" width="260" height="30" rx="3" fill="rgba(80,50,20,0.5)" stroke="#ff8844" stroke-width="0.5"/>
  <text x="170" y="136" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">підрядники виконують специфікації NASA</text>

  <rect x="40" y="156" width="260" height="30" rx="3" fill="rgba(80,50,20,0.5)" stroke="#ff8844" stroke-width="0.5"/>
  <text x="170" y="176" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">держава є власником апарата</text>

  <rect x="40" y="196" width="260" height="30" rx="3" fill="rgba(80,50,20,0.5)" stroke="#ff8844" stroke-width="0.5"/>
  <text x="170" y="216" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">витрати: до 1.5 млрд дол./пуск</text>

  <!-- RIGHT: Commercial -->
  <rect x="380" y="40" width="300" height="200" rx="4" fill="rgba(10,40,30,0.4)" stroke="#44ff88" stroke-width="1"/>
  <text x="530" y="62" fill="#44ff88" font-family="monospace" font-size="11" text-anchor="middle">Комерційний екіпаж (CCP)</text>

  <rect x="400" y="76" width="260" height="30" rx="3" fill="rgba(20,60,40,0.5)" stroke="#44ff88" stroke-width="0.5"/>
  <text x="530" y="96" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">NASA формулює вимоги до результату</text>

  <rect x="400" y="116" width="260" height="30" rx="3" fill="rgba(20,60,40,0.5)" stroke="#44ff88" stroke-width="0.5"/>
  <text x="530" y="136" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">компанія проектує, будує, оперує</text>

  <rect x="400" y="156" width="260" height="30" rx="3" fill="rgba(20,60,40,0.5)" stroke="#44ff88" stroke-width="0.5"/>
  <text x="530" y="176" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">компанія є власником апарата</text>

  <rect x="400" y="196" width="260" height="30" rx="3" fill="rgba(20,60,40,0.5)" stroke="#44ff88" stroke-width="0.5"/>
  <text x="530" y="216" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">витрати: ~200–250 млн дол./рейс</text>

  <!-- Arrow between -->
  <text x="350" y="148" fill="#7bb8ff" font-family="monospace" font-size="18" text-anchor="middle">&#x2192;</text>
</svg>`,
        caption:
          'Відмінність між традиційною і комерційною моделлю не лише у вартості. Вона у тому, хто несе ризик розробки і хто є власником інтелектуальної власності на апарат. SpaceX може продавати ті самі послуги іншим клієнтам, а NASA платить лише за виконану доставку.',
      },
    },

    {
      heading: 'Cargo Dragon і вантажна лінія до станції',
      level: 3,
      paragraphs: [
        'Паралельно з пілотованими польотами SpaceX здійснює регулярні вантажні місії до Міжнародної ' +
        'космічної станції за допомогою Cargo Dragon — модифікованої версії без системи підтримки ' +
        'екіпажу. Вантажний Dragon не лише доставляє вантаж, але й повертає його на Землю — ' +
        'можливість, яку мав Space Shuttle, але якої позбавлені "Прогрес" і японський HTV. ' +
        'Наукові зразки, обладнання, що потребує ремонту, і результати експериментів ' +
        'повертаються в капсулі, яка приводнюється біля берегів Флориди.',
      ],
    },

    {
      image: {
        cacheKey: 'spacex-dragon-cargo-berthing',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Cargo Dragon capsule berthed to the International Space Station node, robotic arm (Canadarm2) visible having captured it, Earth below. Station solar arrays and truss structure visible. Hard sci-fi style, dark space background, technically detailed. ' +
          'Add the following text labels on the image: "Cargo Dragon", "Canadarm2", "ISS berthing port".',
        alt: 'Вантажний Dragon пристикований до Міжнародної космічної станції за допомогою роботизованого маніпулятора Canadarm2',
        caption:
          'На відміну від пілотованого Crew Dragon, який стикується автономно, Cargo Dragon захоплюється роботизованим маніпулятором станції Canadarm2 і переноситься до причального порту.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Що далі: орбітальний готель і Місяць',
      level: 2,
      paragraphs: [
        'Dragon як платформа досяг операційної зрілості, але його роль у ширшій картині ' +
        'пілотованої космонавтики ще формується. NASA розглядає можливість використання ' +
        'Dragon для місій до майбутніх комерційних орбітальних станцій, які мають прийти ' +
        'на зміну Міжнародній космічній станції після її запланованого виведення з експлуатації ' +
        'у кінці двадцятих років. Кілька компаній — Axiom Space, Vast, Starlab — вже отримали ' +
        'контракти від NASA на розробку комерційних станцій. Dragon міг би виступати ' +
        'транспортним засобом для доставки екіпажу до них.',

        'Місяць — окрема історія. Для місій Artemis NASA обрало Starship, а не Dragon. ' +
        'Dragon оптимізований для низької навколоземної орбіти і стикування з Міжнародною ' +
        'космічною станцією. Місяць вимагає принципово іншої дельта-V і апарата, ' +
        'здатного висадитись і злетіти з місячної поверхні. Starship — це окремий, ' +
        'набагато масштабніший проект.',

        'Тим часом Dragon залишається єдиним сертифікованим NASA засобом доставки екіпажу ' +
        'на орбіту станом на початок другої половини двадцятих років. Кожна ротаційна місія ' +
        'до Міжнародної космічної станції підтверджує операційну зрілість і нагромаджує льотний досвід. ' +
        'І кожна цивільна місія — Inspiration4, Polaris Dawn, місії компанії Axiom до станції — ' +
        'розширює аудиторію тих, хто може опинитись на орбіті не лише як державний пілот, ' +
        'а як дослідник, благодійник або навіть турист.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Комерційний екіпаж (Commercial Crew Program)',
      definition:
        'Програма NASA, запущена у 2010 роках, за якою агентство фінансує приватні компанії для розробки і експлуатації пілотованих транспортних засобів до низької навколоземної орбіти. NASA є замовником послуги, а не розробником апарата.',
    },
    {
      term: 'Система аварійного порятунку екіпажу (Launch Escape System)',
      definition:
        'Система, здатна відтягнути пілотовану капсулу від аварійної ракети на будь-якому етапі зльоту. Dragon використовує інтегровані рідинні двигуни SuperDraco замість традиційної зовнішньої башти.',
    },
    {
      term: 'Автономне стикування',
      definition:
        'Процес, при якому космічний апарат самостійно зближується і стикується зі станцією без безпосереднього пілотування людиною, використовуючи лідари, камери і власну систему керування.',
    },
    {
      term: 'Низька навколоземна орбіта (Low Earth Orbit)',
      definition:
        'Орбіта на висоті від приблизно двохсот до двох тисяч кілометрів над Землею. На ній розташована Міжнародна космічна станція на висоті близько чотириста кілометрів. Dragon оптимізований саме для цієї зони.',
    },
    {
      term: 'Дельта-V',
      definition:
        'Зміна швидкості, необхідна для орбітального маневру. Для виходу на низьку навколоземну орбіту потрібно близько дев\'яти кілометрів на секунду. Для польоту до Місяця — значно більше.',
    },
    {
      term: 'Вихід у відкритий космос (Extravehicular Activity)',
      definition:
        'Робота астронавтів поза герметичним корпусом корабля або станції. Вимагає спеціального скафандра з власною системою підтримки життя. Polaris Dawn у 2024 році провела перший комерційний вихід у відкритий космос.',
    },
    {
      term: 'Багаторазовий перший ступінь',
      definition:
        'Технологія, за якою ракетний ступінь після відокремлення повертається і приземляється для повторного використання. SpaceX реалізувала це для Falcon 9, суттєво знизивши вартість пуску.',
    },
    {
      term: 'Ротаційна місія',
      definition:
        'Регулярний пілотований рейс до станції з метою зміни екіпажу. Dragon здійснює ротаційні місії для NASA під назвою Crew-1, Crew-2 тощо, зазвичай кожні шість місяців.',
    },
  ],

  quiz: [
    {
      question: 'Чому США дев\'ять років після завершення програми Space Shuttle не мали власного пілотованого корабля?',
      options: [
        'NASA вирішило повністю відмовитись від пілотованої космонавтики',
        'Програма Space Shuttle продовжувала польоти до 2020 року',
        'Між завершенням Shuttle у 2011 і першим польотом Crew Dragon у 2020 USA не мала сертифікованого пілотованого корабля власної розробки',
        'США покладалися на корабель Boeing Starliner весь цей час',
      ],
      correctIndex: 2,
      explanation:
        'Space Shuttle виконав останній політ у 2011 році. До травня 2020 року, коли Crew Dragon здійснив місію Demo-2, США не мали власного пілотованого транспортного засобу і платили Росії за місця на "Союзі".',
    },
    {
      question: 'Що принципово відрізняє підхід комерційного екіпажу від традиційних програм Apollo і Shuttle?',
      options: [
        'NASA повністю відмовилась від ракет і перейшла на інші носії',
        'NASA виступає замовником транспортної послуги, а не розробником апарата — компанія є власником корабля',
        'Комерційна програма дозволяє будь-кому купити місце на ракеті без підготовки',
        'Різниці немає — принцип управління програмою залишився незмінним',
      ],
      correctIndex: 1,
      explanation:
        'Ключова відмінність — зміна ролі NASA. Раніше агентство проектувало апарат і замовляло компоненти у підрядників. Тепер воно формулює вимоги до результату і купує послугу доставки у компанії, яка є власником апарата і може використовувати його для інших клієнтів.',
    },
    {
      question: 'Яка місія 2021 року стала першим суто цивільним орбітальним польотом без жодного профільного астронавта на борту?',
      options: [
        'Demo-2 (Бенкен та Херлі, 2020)',
        'Polaris Dawn (2024)',
        'Inspiration4 (2021)',
        'Crew-1 (2020)',
      ],
      correctIndex: 2,
      explanation:
        'Inspiration4 у вересні 2021 року — перший в історії орбітальний політ із суто цивільним екіпажем. Чотири людини без досвіду як астронавти NASA провели близько трьох діб на орбіті. Polaris Dawn 2024 був іншою місією і включав перший комерційний вихід у відкритий космос.',
    },
    {
      question: 'Чим відрізняється система аварійного порятунку Crew Dragon від башти порятунку на кораблях Mercury та Apollo?',
      options: [
        'Dragon не має системи аварійного порятунку — це зекономило масу',
        'Dragon використовує окремий рятувальний модуль, який відстрілюється окремою ракетою',
        'Dragon має інтегровані рідинні двигуни SuperDraco у корпусі капсули замість зовнішньої твердопаливної башти',
        'Система порятунку на Dragon ідентична Apollo — зовнішня твердопаливна башта',
      ],
      correctIndex: 2,
      explanation:
        'На відміну від Mercury і Apollo, де рятувальна башта розташовувалась над капсулою і відстрілювалась після виходу з атмосфери, Dragon має двигуни SuperDraco, вбудовані прямо в корпус. Вони спрацьовують на будь-якій ділянці траєкторії і залишаються на кораблі протягом усього польоту.',
    },
    {
      question: 'Що стало ключовим чинником зниження вартості запуску Falcon 9 порівняно з попередніми носіями?',
      options: [
        'Значно менша тяга і більш проста конструкція ракети',
        'Використання державних субсидій, недоступних іншим виробникам',
        'Повернення і повторне використання першого ступеня ракети',
        'Відмова від систем безпеки для зниження маси',
      ],
      correctIndex: 2,
      explanation:
        'Перший ступінь Falcon 9 становить більшу частину вартості ракети. Після відокремлення він повертається і приземляється вертикально — або на стартовому майданчику, або на морській платформі — і може бути використаний знову. Це принципово знизило вартість пуску порівняно з одноразовими носіями.',
    },
  ],

  sources: [
    {
      title: 'NASA — Commercial Crew Program Overview',
      url: 'https://www.nasa.gov/human-spaceflight/commercial-crew/',
      meta: 'NASA, відкритий доступ, оновлено 2025',
    },
    {
      title: 'SpaceX — Crew Dragon: Vehicle Overview',
      url: 'https://www.spacex.com/vehicles/dragon/',
      meta: 'SpaceX офіційний сайт, 2025',
    },
    {
      title: 'NASA — Demo-2 Mission Overview (SpaceX Crew Dragon)',
      url: 'https://www.nasa.gov/mission/demo-2/',
      meta: 'NASA, травень 2020',
    },
    {
      title: 'Inspiration4 — Mission Documentation',
      url: 'https://inspiration4.com/',
      meta: 'Inspiration4, вересень 2021',
    },
    {
      title: 'Polaris Dawn — Mission Overview',
      url: 'https://polarisprogram.com/dawn/',
      meta: 'Polaris Program, 2024',
    },
    {
      title: 'NASA — Boeing Starliner CFT Mission Updates',
      url: 'https://www.nasa.gov/mission/boeing-starliner-crew-flight-test/',
      meta: 'NASA, 2024–2025',
    },
    {
      title: 'NASA OIG — NASA\'s Management of the Commercial Crew Program',
      url: 'https://oig.nasa.gov/docs/IG-21-004.pdf',
      meta: 'NASA Office of Inspector General, 2021, відкритий доступ',
    },
    {
      title: 'Berger E. — Liftoff: The Desperate Early Days That Launched SpaceX',
      url: 'https://www.harpercollins.com/products/liftoff-eric-berger',
      meta: 'Harper Collins, 2021 — авторитетна нон-фікшн книга про SpaceX',
    },
    {
      title: 'FAA — Commercial Human Space Transportation Report',
      url: 'https://www.faa.gov/space/additional_resources/commercial_space_transportation_reports/',
      meta: 'Федеральне авіаційне управління, відкритий доступ',
    },
    {
      title: 'Ars Technica — SpaceX Crew Dragon archive',
      url: 'https://arstechnica.com/tag/crew-dragon/',
      meta: 'Ars Technica, 2019–2025, журналістські репортажі',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
