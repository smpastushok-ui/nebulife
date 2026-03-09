import type { CosmicObjectCategory, DiscoveryRarity, GalleryCategory } from './discovery.js';

// ---------------------------------------------------------------------------
// Cosmic Object Catalog — 122 types across 10 categories
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  type: string;
  category: CosmicObjectCategory;
  rarity: DiscoveryRarity;
  galleryCategory: GalleryCategory;
  nameUk: string;
  nameEn: string;
  descriptionUk: string;
  promptTemplate: string;
  scientificFacts: string[];
}

// ---------------------------------------------------------------------------
// 1. NEBULAE (12)
// ---------------------------------------------------------------------------

const NEBULAE: CatalogEntry[] = [
  {
    type: 'emission-nebula', category: 'nebulae', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Емісійна туманність', nameEn: 'Emission Nebula',
    descriptionUk: 'Хмара іонізованого газу, що світиться під впливом ультрафіолетового випромінювання молодих зірок. Типовий червоно-рожевий колір зумовлений водневою емісією.',
    promptTemplate: 'A vast emission nebula glowing in deep crimson and magenta hydrogen-alpha light, with embedded young blue-white stars ionizing the surrounding gas, wispy tendrils and pillar-like structures at the edges, dark dust lanes cutting across the bright emission regions',
    scientificFacts: ['Емісійні туманності світяться завдяки рекомбінації електронів з іонізованим воднем', 'Типова температура газу — 8 000-10 000 К', 'Найвідоміша — туманність Оріона (M42) на відстані 1 344 світлових роки'],
  },
  {
    type: 'reflection-nebula', category: 'nebulae', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Відбивна туманність', nameEn: 'Reflection Nebula',
    descriptionUk: 'Хмара пилу та газу, що не випромінює власне світло, а відбиває світло найближчих зірок. Зазвичай має блакитний колір через розсіювання Релея.',
    promptTemplate: 'A delicate blue reflection nebula surrounding a bright star, scattered starlight creating a soft ethereal glow on the dusty cloud, subtle color gradients from blue to violet',
    scientificFacts: ['Блакитний колір пояснюється розсіюванням Релея — коротші хвилі розсіюються ефективніше', 'Часто зустрічаються поруч з емісійними туманностями', 'Приклад: туманності навколо зірок Плеяд'],
  },
  {
    type: 'dark-nebula', category: 'nebulae', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Темна туманність', nameEn: 'Dark Nebula',
    descriptionUk: 'Щільна хмара молекулярного газу та пилу, що поглинає світло зірок позаду неї. Видна як темна пляма на тлі зоряного поля.',
    promptTemplate: 'A dark molecular cloud silhouetted against a rich starfield, opaque tendrils of cosmic dust blocking the light of background stars, subtle reddening at the edges where starlight filters through',
    scientificFacts: ['Темні туманності — це місця народження нових зірок', 'Температура всередині — лише 10-20 К', 'Знаменита "Вугільний Мішок" — одна з найбільш помітних темних туманностей'],
  },
  {
    type: 'planetary-nebula', category: 'nebulae', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Планетарна туманність', nameEn: 'Planetary Nebula',
    descriptionUk: 'Оболонка газу, скинута зіркою наприкінці життя. Центральний білий карлик іонізує газ, створюючи яскраву кольорову оболонку.',
    promptTemplate: 'A symmetric planetary nebula with a glowing central white dwarf star, concentric shells of ionized gas in greens (OIII) and reds (H-alpha), delicate filamentary structure, bipolar outflows',
    scientificFacts: ['Назва "планетарна" — історичне непорозуміння, до планет не має стосунку', 'Існують лише ~25 000 років — мить у космічних масштабах', 'Знаменитий приклад — туманність Кільце (M57)'],
  },
  {
    type: 'supernova-remnant', category: 'nebulae', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Залишок наднової', nameEn: 'Supernova Remnant',
    descriptionUk: 'Розширювана оболонка газу, викинута потужним вибухом наднової зірки. Ударна хвиля нагріває навколишній газ до мільйонів градусів.',
    promptTemplate: 'A dramatic supernova remnant with intricate filaments of shocked gas, glowing in multiple colors from different ionized elements, complex shock-wave structures, energetic wisps and tendrils expanding outward',
    scientificFacts: ['Газ розширюється зі швидкістю тисяч км/с', 'Рентгенівське випромінювання від газу при температурі мільйони К', 'Крабоподібна туманність — залишок наднової 1054 року'],
  },
  {
    type: 'bubble-nebula', category: 'nebulae', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Бульбашкова туманність', nameEn: 'Bubble Nebula',
    descriptionUk: 'Сферична оболонка газу, що утворилася під тиском зоряного вітру масивної зірки. Зоряний вітер "видуває" бульбашку у навколишньому газі.',
    promptTemplate: 'A spherical bubble nebula formed by stellar wind from a massive hot star at its center, thin luminous shell of compressed gas, asymmetric structure with denser regions',
    scientificFacts: ['Утворюється зоряним вітром від зірок типу O або B', 'NGC 7635 — класичний приклад бульбашкової туманності', 'Розмір може сягати десятків світлових років'],
  },
  {
    type: 'protoplanetary-nebula', category: 'nebulae', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Протопланетарна туманність', nameEn: 'Protoplanetary Nebula',
    descriptionUk: 'Перехідна фаза між зіркою-гігантом та планетарною туманністю. Зірка вже скинула зовнішні шари, але ще не досить гаряча для іонізації газу.',
    promptTemplate: 'A protoplanetary nebula with a central dying star surrounded by asymmetric shells of ejected material, bipolar lobes of reflected light, concentric arc patterns, not yet fully ionized',
    scientificFacts: ['Існує лише кілька тисяч років — надзвичайно коротка фаза', 'Яєцеподібна туманність (Egg Nebula) — класичний приклад', 'Світить відбитим, а не емісійним світлом'],
  },
  {
    type: 'herbig-haro-object', category: 'nebulae', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: "Об'єкт Хербіга-Аро", nameEn: 'Herbig-Haro Object',
    descriptionUk: 'Яскраві плями газу, що утворюються коли високошвидкісні джети від новонародженої зірки стикаються з навколишнім газом.',
    promptTemplate: 'A Herbig-Haro object showing bright bow shocks where bipolar jets from a young protostar collide with surrounding interstellar medium, knots of luminous shocked gas, narrow collimated jet beams',
    scientificFacts: ['Джети рухаються зі швидкістю до 1000 км/с', 'Час життя — всього кілька тисяч років', 'Свідчать про активне формування зоряної системи'],
  },
  {
    type: 'wolf-rayet-nebula', category: 'nebulae', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Туманність Вольфа-Райє', nameEn: 'Wolf-Rayet Nebula',
    descriptionUk: 'Оболонка газу, викинута потужним зоряним вітром від зірки Вольфа-Райє. Ці найгарячіші зірки втрачають масу з величезною швидкістю.',
    promptTemplate: 'A Wolf-Rayet nebula showing a luminous wind-blown bubble around an extremely hot massive star, complex shock-wave filaments, multiple shells of ejected material glowing in nitrogen and oxygen emission lines',
    scientificFacts: ['Зірки Вольфа-Райє — одні з найгарячіших зірок (30 000-200 000 К)', 'Втрачають масу в 10 мільярдів разів швидше за Сонце', 'Прекурсори наднових типу Ib/Ic'],
  },
  {
    type: 'bipolar-nebula', category: 'nebulae', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Біполярна туманність', nameEn: 'Bipolar Nebula',
    descriptionUk: 'Туманність з двома протилежно спрямованими потоками газу. Симетрична структура створює вражаючу "метелик" або "пісочний годинник" форму.',
    promptTemplate: 'A bipolar nebula with two symmetric lobes of glowing gas extending from a central waist, hourglass or butterfly shape, intricate internal structure with concentric rings and filaments',
    scientificFacts: ['Біполярна форма зумовлена щільним екваторіальним диском навколо зірки', 'Туманність Метелик (NGC 6302) — яскравий приклад', 'Температура центральної зірки може сягати 200 000 К'],
  },
  {
    type: 'emission-line-nebula', category: 'nebulae', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'HII-регіон', nameEn: 'HII Region',
    descriptionUk: 'Велика область іонізованого водню навколо молодих гарячих зірок. Класичне "зоряне родовище" де формуються нові зоряні системи.',
    promptTemplate: 'A massive HII region with clusters of newborn blue-white stars illuminating vast clouds of ionized hydrogen gas, pillar structures, evaporating gaseous globules, complex emission patterns in red and pink',
    scientificFacts: ['Типовий розмір — від 1 до 600 світлових років', 'Містять десятки або сотні молодих зірок', 'Туманність Тарантула в Великій Магеллановій хмарі — найбільша відома HII-область'],
  },
  {
    type: 'ring-nebula-type', category: 'nebulae', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Кільцеподібна туманність', nameEn: 'Ring-type Nebula',
    descriptionUk: 'Різновид планетарної туманності з характерною кільцевою структурою, видимою в проекції. Центральна порожнина оточена яскравим кільцем газу.',
    promptTemplate: 'A luminous ring-shaped nebula with a clearly visible central cavity, the dying white dwarf star visible at the center, layers of colored gas forming the ring structure in greens, blues, and reds',
    scientificFacts: ['Кільцева форма — це проекція порожнистої сфери або тору', 'M57 (Туманність Кільце) — найвідоміший приклад', 'Вік таких туманностей — від 1 000 до 30 000 років'],
  },
];

// ---------------------------------------------------------------------------
// 2. STAR TYPES (20)
// ---------------------------------------------------------------------------

const STARS: CatalogEntry[] = [
  {
    type: 'wolf-rayet-star', category: 'stars', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: 'Зірка Вольфа-Райє', nameEn: 'Wolf-Rayet Star',
    descriptionUk: 'Надзвичайно масивна та гаряча зірка, що втрачає масу з величезною швидкістю через потужний зоряний вітер.',
    promptTemplate: 'A Wolf-Rayet star with an intensely bright blue-white core surrounded by expanding shells of ejected gas, fierce stellar wind creating shock waves in the surrounding medium, extreme luminosity',
    scientificFacts: ['Температура поверхні 30 000-200 000 К', 'Маса 10-80 мас Сонця', 'Тривалість життя — лише кілька мільйонів років'],
  },
  {
    type: 'carbon-star', category: 'stars', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Вуглецева зірка', nameEn: 'Carbon Star',
    descriptionUk: 'Зірка-гігант з надлишком вуглецю в атмосфері. Має характерний темно-червоний колір через молекулярні смуги поглинання вуглецю.',
    promptTemplate: 'A deep ruby-red carbon star with a dusty envelope, rich crimson glow much deeper than normal red giants, surrounding shell of carbon-rich dust grains, molecular absorption creating dark bands',
    scientificFacts: ['Атмосфера містить більше вуглецю ніж кисню', 'Температура поверхні 2 500-3 500 К', 'Утворюють вуглецевий пил — будівельний матеріал для планет'],
  },
  {
    type: 'magnetar', category: 'stars', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: 'Магнетар', nameEn: 'Magnetar',
    descriptionUk: 'Нейтронна зірка з надзвичайно потужним магнітним полем — до 10^15 Гаусс. Найпотужніший магніт у Всесвіті.',
    promptTemplate: 'A magnetar neutron star with extreme magnetic field lines visible as luminous arcs, intense X-ray and gamma-ray emission, energetic flares erupting from the surface, surrounding magnetosphere distorting space',
    scientificFacts: ['Магнітне поле у квадрильйон разів сильніше за земне', 'Діаметр лише ~20 км, маса 1.4-2 мас Сонця', 'Зоряне тремтіння може випромінити більше енергії ніж Сонце за 100 000 років'],
  },
  {
    type: 'pulsar', category: 'stars', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Пульсар', nameEn: 'Pulsar',
    descriptionUk: 'Швидко обертова нейтронна зірка, що випромінює пучки радіохвиль. Як космічний маяк — пульсує з надзвичайною точністю.',
    promptTemplate: 'A rapidly spinning pulsar neutron star with two bright beams of radiation sweeping through space like a cosmic lighthouse, visible magnetic field axis tilted from rotation axis, surrounding pulsar wind nebula',
    scientificFacts: ['Обертається від 1 до 716 разів на секунду', 'Точність "тікання" порівнянна з атомними годинниками', 'Перший пульсар виявлено у 1967 році Джоселін Белл'],
  },
  {
    type: 't-tauri-star', category: 'stars', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Зірка T Тельця', nameEn: 'T Tauri Star',
    descriptionUk: 'Молода зірка, що ще не розпочала термоядерний синтез водню. Оточена акреційним диском з якого формуються планети.',
    promptTemplate: 'A young T Tauri star surrounded by a luminous protoplanetary accretion disk, bipolar jets shooting from the poles, variable brightness, dusty envelope with gaps where planets are forming',
    scientificFacts: ['Вік менше 10 мільйонів років', 'Яскравість може змінюватися в 2-3 рази за дні-тижні', 'Саме так виглядало наше Сонце 4.6 мільярдів років тому'],
  },
  {
    type: 'luminous-blue-variable', category: 'stars', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: 'Яскрава блакитна змінна', nameEn: 'Luminous Blue Variable',
    descriptionUk: 'Одна з найяскравіших та наймасивніших зірок. Нестабільна, з потужними спалахами коли скидає зовнішні шари.',
    promptTemplate: 'A luminous blue variable star of extreme brightness surrounded by expanding shells of previously ejected material, bipolar Homunculus-like nebula, intense blue-white light with surrounding ejecta clouds',
    scientificFacts: ['Яскравість у мільйони разів більша за Сонце', 'Ета Кіля — найвідоміший приклад', 'Спалах 1843 року зробив Ету Кіля другою найяскравішою зіркою на небі'],
  },
  {
    type: 'red-supergiant', category: 'stars', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Червоний надгігант', nameEn: 'Red Supergiant',
    descriptionUk: 'Гігантська зірка наприкінці еволюції, розмір якої може сягати орбіти Юпітера. Передвісник наднової.',
    promptTemplate: 'A massive red supergiant star with a bloated photosphere showing convection cells and dark starspots, tenuous outer atmosphere losing mass, deep orange-red glow, enormous compared to nearby stars',
    scientificFacts: ['Бетельгейзе — найвідоміший червоний надгігант, радіус 700-1000 Сонячних', 'Температура поверхні лише 3 000-4 000 К', 'Закінчить життя спалахом наднової'],
  },
  {
    type: 'white-dwarf', category: 'stars', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Білий карлик', nameEn: 'White Dwarf',
    descriptionUk: 'Залишкове ядро зірки після скидання зовнішніх шарів. Розмір із Землю, маса як у Сонця. Повільно охолоджується мільярди років.',
    promptTemplate: 'A small but intensely bright white dwarf star, compact and dense, faint blue-white glow, possibly surrounded by remnants of a planetary nebula fading in the background',
    scientificFacts: ['Чайна ложка речовини важить ~5 тонн', 'Понад 97% зірок закінчать життя як білі карлики', 'Температура поверхні від 4 000 до 150 000 К'],
  },
  {
    type: 'neutron-star', category: 'stars', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Нейтронна зірка', nameEn: 'Neutron Star',
    descriptionUk: 'Надзвичайно щільний залишок після вибуху наднової. Маса Сонця стиснута до сфери діаметром 20 км.',
    promptTemplate: 'A neutron star with an extremely intense gravitational field visibly bending light around it, hot surface glowing in X-rays, magnetic field lines, thin accretion of surrounding matter',
    scientificFacts: ['Чайна ложка нейтронної зоряної речовини важить 6 мільярдів тонн', 'Поверхнева гравітація у 200 мільярдів разів більша за земну', 'Обертається зі швидкістю до сотень обертів на секунду'],
  },
  {
    type: 'brown-dwarf', category: 'stars', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Коричневий карлик', nameEn: 'Brown Dwarf',
    descriptionUk: 'Субзоряний об\'єкт — занадто масивний для планети, але замалий для запуску термоядерного синтезу водню.',
    promptTemplate: 'A dim brown dwarf showing atmospheric banding similar to gas giants, faint reddish-magenta glow, turbulent cloud patterns, methane and water vapor in the atmosphere',
    scientificFacts: ['Маса від 13 до 80 мас Юпітера', 'Температура поверхні 300-2 500 К', 'Більше схожі на газові гіганти ніж на зірки'],
  },
  {
    type: 'blue-giant', category: 'stars', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Блакитний гігант', nameEn: 'Blue Giant',
    descriptionUk: 'Масивна гаряча зірка з температурою поверхні понад 10 000 К. Яскраво-блакитна, надзвичайно яскрава.',
    promptTemplate: 'A brilliant blue giant star with an intense blue-white photosphere, powerful stellar wind creating a visible bow shock in the interstellar medium, overwhelming brightness',
    scientificFacts: ['Температура поверхні 10 000-50 000 К', 'Живуть лише десятки мільйонів років', 'Ригель — блакитний надгігант, видимий неозброєним оком'],
  },
  {
    type: 'red-dwarf', category: 'stars', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Червоний карлик', nameEn: 'Red Dwarf',
    descriptionUk: 'Найпоширеніший тип зірок у Всесвіті. Маленькі, холодні, але можуть жити трильйони років.',
    promptTemplate: 'A small red dwarf star with a cool reddish photosphere, occasional bright flares erupting from the surface, starspots visible on the dim surface',
    scientificFacts: ['Становлять 70% усіх зірок у Всесвіті', 'Маса 0.08-0.45 мас Сонця', 'Тривалість життя — трильйони років, довше за поточний вік Всесвіту'],
  },
  {
    type: 'yellow-hypergiant', category: 'stars', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: 'Жовтий гіпергігант', nameEn: 'Yellow Hypergiant',
    descriptionUk: 'Одна з найбільших відомих зірок. Яскравість у сотні тисяч разів більша за Сонце. Вкрай рідкісні — відомо менше 15.',
    promptTemplate: 'An enormous yellow hypergiant star with a massive bloated photosphere in brilliant golden yellow, extensive mass loss creating surrounding nebulosity, extreme luminosity dwarfing all nearby stars',
    scientificFacts: ['Радіус може сягати 1 000-1 500 Сонячних', 'Відомо менше 15 жовтих гіпергігантів', 'Rho Cassiopeiae — один з найвідоміших прикладів'],
  },
  {
    type: 'subdwarf-b', category: 'stars', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Субкарлик типу B', nameEn: 'Subdwarf B Star',
    descriptionUk: 'Гаряче ядро зірки, що втратило водневу оболонку. Спалює гелій при надзвичайно високих температурах.',
    promptTemplate: 'A compact hot subdwarf B star with intense blue-white emission, stripped of its hydrogen envelope, small but extremely hot surface, faint companion star visible nearby',
    scientificFacts: ['Температура 20 000-40 000 К', 'Маса ~0.5 мас Сонця', 'Утворюються через взаємодію з зіркою-компаньйоном'],
  },
  {
    type: 'flare-star', category: 'stars', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Спалахуюча зірка', nameEn: 'Flare Star',
    descriptionUk: 'Червоний карлик з потужними спалахами, що можуть збільшити яскравість у десятки разів за лічені хвилини.',
    promptTemplate: 'A small red dwarf flare star with a massive magnetic flare erupting from its surface, intense white-hot flash against the dim red photosphere, coronal mass ejection visible',
    scientificFacts: ['Спалахи можуть перевищувати сонячні у 10 000 разів (відносно розміру)', 'Проксіма Центаврі — найближча спалахуюча зірка', 'Спалахи — загроза для обітаємості планет навколо таких зірок'],
  },
  {
    type: 'symbiotic-star', category: 'stars', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Симбіотична зірка', nameEn: 'Symbiotic Star',
    descriptionUk: 'Подвійна система де білий карлик акрецює матерію від червоного гіганта-компаньйона. Комбінація гарячої та холодної зірки.',
    promptTemplate: 'A symbiotic star system showing a red giant transferring mass to a small bright white dwarf companion through an accretion stream, complex surrounding nebula shaped by the interaction',
    scientificFacts: ['Спектр показує одночасно ознаки гарячої та холодної зірки', 'Можуть спалахувати як повільні нові', 'Відомо менше 300 симбіотичних зірок'],
  },
  {
    type: 'cepheid-variable', category: 'stars', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Цефеїда', nameEn: 'Cepheid Variable',
    descriptionUk: 'Пульсуюча зірка-надгігант, яскравість якої змінюється з точним періодом. Стандартна свічка для вимірювання космічних відстаней.',
    promptTemplate: 'A luminous Cepheid variable star pulsating between bright and dim states, visible size change between maximum and minimum, golden-white supergiant against a starfield',
    scientificFacts: ['Співвідношення період-яскравість дозволяє вимірювати відстані до галактик', 'Період пульсації від 1 до 100 днів', 'Едвін Хаббл використав цефеїди для доказу існування інших галактик'],
  },
  {
    type: 'am-cvn-star', category: 'stars', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'AM CVn зірка', nameEn: 'AM CVn Star',
    descriptionUk: 'Ультракомпактна подвійна система з двох білих карликів з надзвичайно коротким орбітальним періодом — від 5 до 65 хвилин.',
    promptTemplate: 'An ultra-compact binary system of two white dwarfs in extremely close orbit, visible accretion disk and mass transfer stream, gravitational wave emission distorting nearby space',
    scientificFacts: ['Орбітальний період — від 5 до 65 хвилин', 'Потужне джерело гравітаційних хвиль', 'Один з білих карликів поступово руйнується другим'],
  },
  {
    type: 'thorne-zytkow', category: 'stars', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: "Об'єкт Торна-Житков", nameEn: 'Thorne-Żytkow Object',
    descriptionUk: 'Теоретичний гібрид: нейтронна зірка всередині червоного гіганта. Ядро нейтронної зірки оточене водневою оболонкою.',
    promptTemplate: 'A Thorne-Zytkow object appearing as a bloated red supergiant but with unusual spectral signatures, hidden neutron star core creating anomalous nuclear burning in the outer layers',
    scientificFacts: ['Передбачено теоретично Кіпом Торном та Анною Житков у 1977 році', 'Можливий кандидат: HV 2112 у Малій Магеллановій хмарі', 'Рідкісні через короткий час існування'],
  },
  {
    type: 'blue-straggler', category: 'stars', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Блакитний відсталий', nameEn: 'Blue Straggler',
    descriptionUk: 'Зірка у зоряному скупченні, що здається молодшою ніж сусіди. Вважається, що утворилася через злиття двох зірок.',
    promptTemplate: 'A bright blue straggler star standing out among older red and yellow stars in a dense star cluster, anomalously hot and luminous for its environment, signs of stellar merger',
    scientificFacts: ['Здаються молодшими за оточуючі зірки того ж скупчення', 'Утворюються через злиття або акрецію від компаньйона', 'Найкраще спостерігаються у кулястих скупченнях'],
  },
];

// ---------------------------------------------------------------------------
// 3. GALAXIES (14)
// ---------------------------------------------------------------------------

const GALAXIES: CatalogEntry[] = [
  {
    type: 'spiral-galaxy', category: 'galaxies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Спіральна галактика', nameEn: 'Spiral Galaxy',
    descriptionUk: 'Класична галактика з центральним балджем та спіральними рукавами, повними молодих зірок та зон зореутворення.',
    promptTemplate: 'A grand design spiral galaxy with well-defined spiral arms traced by blue young stars and pink HII regions, golden central bulge, dark dust lanes between arms, viewed at slight angle',
    scientificFacts: ['Чумацький Шлях — спіральна галактика з перемичкою', 'Спіральні рукави — хвилі щільності, а не фіксовані структури', 'Містять від 100 мільярдів до трильйона зірок'],
  },
  {
    type: 'barred-spiral', category: 'galaxies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Спіральна з перемичкою', nameEn: 'Barred Spiral Galaxy',
    descriptionUk: 'Спіральна галактика з чіткою перемичкою (баром) через центр, від кінців якої відходять спіральні рукави.',
    promptTemplate: 'A barred spiral galaxy with a prominent central bar of stars, spiral arms emerging from the ends of the bar, active star formation regions at the bar-arm junctions',
    scientificFacts: ['Близько 60% спіральних галактик мають перемичку', 'Перемичка може направляти газ до центру, живлячи чорну діру', 'Наша галактика також має перемичку'],
  },
  {
    type: 'elliptical-galaxy', category: 'galaxies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Еліптична галактика', nameEn: 'Elliptical Galaxy',
    descriptionUk: 'Гладка еліпсоїдна галактика без спіральних рукавів. Містить переважно старі зірки та мало газу.',
    promptTemplate: 'A smooth elliptical galaxy with a golden-red hue from predominantly old stellar populations, no spiral structure, diffuse outer halo, possible faint shell structures from past mergers',
    scientificFacts: ['Від карликових (мільйони зірок) до гігантських (трильйони)', 'Утворюються через злиття спіральних галактик', 'Найбільші відомі галактики — еліптичні'],
  },
  {
    type: 'ring-galaxy', category: 'galaxies', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Кільцева галактика', nameEn: 'Ring Galaxy',
    descriptionUk: 'Рідкісна галактика з яскравим кільцем зореутворення навколо порожнього центру. Утворюється при зіткненні.',
    promptTemplate: 'A striking ring galaxy with a bright blue ring of intense star formation surrounding a relatively empty central region, the ring created by a galactic collision, companion galaxy visible nearby',
    scientificFacts: ['Утворюються при прямому зіткненні двох галактик', 'Об\'єкт Хога — найвідоміша кільцева галактика', 'Хвиля зореутворення поширюється назовні від центру удару'],
  },
  {
    type: 'colliding-galaxies', category: 'galaxies', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Галактики, що зіштовхуються', nameEn: 'Colliding Galaxies',
    descriptionUk: 'Дві або більше галактик у процесі злиття. Гравітаційна взаємодія витягує довгі "хвости" зірок та газу.',
    promptTemplate: 'Two galaxies in the process of merging, long tidal tails of stars and gas stretched by gravitational interaction, bridges of matter connecting the two cores, intense starburst regions at the collision interface',
    scientificFacts: ['Злиття Антенних галактик (NGC 4038/4039) — класичний приклад', 'При зіткненні зірки майже ніколи не стикаються', 'Чумацький Шлях зіткнеться з Андромедою через ~4.5 мільярди років'],
  },
  {
    type: 'quasar', category: 'galaxies', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: 'Квазар', nameEn: 'Quasar',
    descriptionUk: 'Надзвичайно яскраве ядро далекої галактики, живлене надмасивною чорною дірою. Яскравіше за всю галактику-хост.',
    promptTemplate: 'A brilliant quasar with an intensely luminous central point outshining its entire host galaxy, powerful relativistic jets extending for thousands of light-years, surrounding accretion disk visible',
    scientificFacts: ['Можуть бути яскравішими за трильйон Сонць', 'Перший квазар (3C 273) відкрито у 1963 році', 'Живляться акрецією на надмасивну чорну діру'],
  },
  {
    type: 'lenticular-galaxy', category: 'galaxies', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Лінзоподібна галактика', nameEn: 'Lenticular Galaxy',
    descriptionUk: 'Перехідний тип між спіральною та еліптичною. Має диск як спіральна, але без рукавів та активного зореутворення.',
    promptTemplate: 'A lenticular galaxy with a prominent disk and central bulge but no spiral arms, smooth appearance with subtle dust lanes, old stellar population giving it a golden hue',
    scientificFacts: ['Позначаються S0 в класифікації Хаббла', 'Вичерпали газ для утворення нових зірок', 'Можуть мати пилові кільця від поглинутих малих галактик'],
  },
  {
    type: 'irregular-galaxy', category: 'galaxies', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Неправильна галактика', nameEn: 'Irregular Galaxy',
    descriptionUk: 'Галактика без чіткої структури. Часто багата газом та зонами активного зореутворення.',
    promptTemplate: 'An irregular galaxy with chaotic structure, patches of bright blue star-forming regions, no clear spiral arms or elliptical shape, rich in gas and dust clouds, asymmetric appearance',
    scientificFacts: ['Великі та Малі Магелланові Хмари — неправильні галактики', 'Часто є супутниками більших галактик', 'Можуть бути деформованими гравітацією сусідніх галактик'],
  },
  {
    type: 'seyfert-galaxy', category: 'galaxies', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Сейфертівська галактика', nameEn: 'Seyfert Galaxy',
    descriptionUk: 'Спіральна галактика з надзвичайно яскравим ядром. Менш потужний "родич" квазарів.',
    promptTemplate: 'A Seyfert galaxy with an extremely bright active galactic nucleus visible through the spiral structure, nuclear emission outshining surrounding stars, faint jets or outflows from the core',
    scientificFacts: ['Близько 10% великих галактик — сейфертівські', 'Класифікуються на типи 1 та 2 залежно від кута спостереження', 'Активне ядро живиться акрецією на чорну діру'],
  },
  {
    type: 'starburst-galaxy', category: 'galaxies', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Галактика зі спалахом зореутворення', nameEn: 'Starburst Galaxy',
    descriptionUk: 'Галактика з надзвичайно інтенсивним зореутворенням. Утворює нові зірки в десятки разів швидше за норму.',
    promptTemplate: 'A starburst galaxy with intense regions of rapid star formation, brilliant blue clusters of young massive stars, superwind outflows of hot gas driven by supernovae, filaments of expelled material',
    scientificFacts: ['Темп зореутворення в 10-100 разів вище нормального', 'M82 — найвідоміша галактика зі спалахом', 'Часто викликається взаємодією з іншою галактикою'],
  },
  {
    type: 'dwarf-galaxy', category: 'galaxies', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Карликова галактика', nameEn: 'Dwarf Galaxy',
    descriptionUk: 'Маленька галактика з кількома мільярдами зірок. Будівельний матеріал для більших галактик.',
    promptTemplate: 'A small dwarf galaxy with scattered stars and a few bright star-forming regions, diffuse structure, low surface brightness, visible against a background of distant galaxies',
    scientificFacts: ['Найпоширеніший тип галактик у Всесвіті', 'Чумацький Шлях оточений десятками карликових галактик', 'Поглинаються великими галактиками — галактичний канібалізм'],
  },
  {
    type: 'radio-galaxy', category: 'galaxies', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Радіогалактика', nameEn: 'Radio Galaxy',
    descriptionUk: 'Галактика з потужним радіовипромінюванням від гігантських джетів, що виходять від центральної чорної діри.',
    promptTemplate: 'A radio galaxy with enormous relativistic jets extending millions of light-years from the central active nucleus, radio lobes glowing at the jet termination points, powerful energy output',
    scientificFacts: ['Джети можуть простягатися на мільйони світлових років', 'Центавр A — найближча потужна радіогалактика', 'Радіовипромінювання зумовлене синхротронним механізмом'],
  },
  {
    type: 'polar-ring-galaxy', category: 'galaxies', rarity: 'legendary', galleryCategory: 'cosmos',
    nameUk: 'Галактика з полярним кільцем', nameEn: 'Polar Ring Galaxy',
    descriptionUk: 'Рідкісна галактика з кільцем газу та зірок, що обертається перпендикулярно до основного диска.',
    promptTemplate: 'A polar ring galaxy with a dramatic ring of gas, dust and stars orbiting perpendicular to the main galactic disk, two distinct structural components clearly visible at right angles',
    scientificFacts: ['Кільце утворилося при поглинанні малої галактики', 'NGC 4650A — класичний приклад', 'Дозволяють вимірювати розподіл темної матерії'],
  },
  {
    type: 'jellyfish-galaxy', category: 'galaxies', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Галактика-медуза', nameEn: 'Jellyfish Galaxy',
    descriptionUk: 'Галактика з довгими "щупальцями" газу та зірок, що витягуються тиском гарячого газу скупчення.',
    promptTemplate: 'A jellyfish galaxy with long tentacles of stripped gas and young stars trailing behind as it moves through hot cluster gas, ram pressure stripping creating dramatic blue streamers',
    scientificFacts: ['Утворюються ram pressure stripping у скупченнях галактик', 'У "щупальцях" відбувається активне зореутворення', 'ESO 137-001 — вражаючий приклад'],
  },
];

// ---------------------------------------------------------------------------
// 4. STELLAR PHENOMENA (14)
// ---------------------------------------------------------------------------

const PHENOMENA: CatalogEntry[] = [
  {
    type: 'supernova', category: 'phenomena', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Наднова', nameEn: 'Supernova',
    descriptionUk: 'Катастрофічний вибух зірки наприкінці життя. На кілька тижнів може затьмарити цілу галактику.',
    promptTemplate: 'A supernova explosion at peak brightness, blindingly luminous point of light outshining surrounding stars by millions of times, expanding shock wave visible, surrounding nebular material illuminated',
    scientificFacts: ['Випромінює більше енергії за тижні ніж Сонце за все життя', 'Синтезує важкі елементи: золото, платина, уран', 'У нашій галактиці трапляється ~2 рази на століття'],
  },
  {
    type: 'kilonova', category: 'phenomena', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Кілонова', nameEn: 'Kilonova',
    descriptionUk: 'Вибух при злитті двох нейтронних зірок. Джерело більшості важких елементів у Всесвіті, включаючи золото.',
    promptTemplate: 'A kilonova explosion from merging neutron stars, brilliant flash transitioning from blue to red over days, expanding cloud of heavy element ejecta, gravitational wave ripples emanating outward',
    scientificFacts: ['Перша кілонова спостерігалась у 2017 (GW170817)', 'Одночасно виявлено гравітаційні хвилі та електромагнітне випромінювання', 'Створює ~3-13 мас Землі золота за один вибух'],
  },
  {
    type: 'nova', category: 'phenomena', rarity: 'rare', galleryCategory: 'anomalies',
    nameUk: 'Нова зірка', nameEn: 'Nova',
    descriptionUk: 'Термоядерний вибух на поверхні білого карлика, що акрецює водень від компаньйона. На відміну від наднової, зірка виживає.',
    promptTemplate: 'A classical nova eruption on a white dwarf surface, sudden brightening of the star, expanding shell of ejected material, mass-transfer stream from a companion red giant visible',
    scientificFacts: ['Яскравість зростає в 50 000-100 000 разів за кілька годин', 'Може повторюватися (повторні нові)', 'У нашій галактиці спостерігається ~30-60 нових на рік'],
  },
  {
    type: 'accretion-disk', category: 'phenomena', rarity: 'rare', galleryCategory: 'anomalies',
    nameUk: 'Акреційний диск', nameEn: 'Accretion Disk',
    descriptionUk: 'Диск розігрітого газу та пилу, що обертається навколо масивного об\'єкта. Тертя нагріває газ до мільйонів градусів.',
    promptTemplate: 'A luminous accretion disk around a compact object, swirling hot gas spiraling inward, bright inner regions transitioning to cooler outer parts, jets possibly emerging from the poles',
    scientificFacts: ['Внутрішні області нагріваються до мільйонів кельвінів', 'Один з найефективніших механізмів перетворення маси в енергію', 'Випромінюють від інфрачервоного до рентгенівського діапазону'],
  },
  {
    type: 'relativistic-jet', category: 'phenomena', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Релятивістський джет', nameEn: 'Relativistic Jet',
    descriptionUk: 'Надзвичайно потужний пучок плазми, що рухається зі швидкістю, близькою до світлової, від чорної діри.',
    promptTemplate: 'A powerful relativistic jet shooting from the poles of an active galactic nucleus, collimated beam of plasma moving at near light speed, shock knots along the jet, visible for thousands of light-years',
    scientificFacts: ['Швидкість до 99.9% швидкості світла', 'Можуть простягатися на мільйони світлових років', 'Механізм колімації досі до кінця не зрозумілий'],
  },
  {
    type: 'light-echo', category: 'phenomena', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Світлове ехо', nameEn: 'Light Echo',
    descriptionUk: 'Відбиття світла від спалаху (наднової або нової) від навколишнього пилу. Як звукове ехо, але для світла.',
    promptTemplate: 'A dramatic light echo from a past nova or supernova, concentric rings of reflected light expanding outward from the explosion site, illuminating layers of interstellar dust at increasing distances',
    scientificFacts: ['Дозволяє "побачити" спалахи що трапилися століття тому', 'Світлове ехо наднової Кассіопея A відкрите у 2008', 'Кожне кільце — відбиття від пилу на різній відстані'],
  },
  {
    type: 'gamma-ray-burst', category: 'phenomena', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Гамма-спалах', nameEn: 'Gamma-Ray Burst',
    descriptionUk: 'Найпотужніший вибух у Всесвіті після Великого Вибуху. За секунди випромінює більше енергії ніж Сонце за мільярди років.',
    promptTemplate: 'A gamma-ray burst with an incredibly intense beam of high-energy radiation, collapsing massive star at the center, ultrarelativistic jets, afterglow expanding in all wavelengths',
    scientificFacts: ['Найпотужніший відомий тип вибуху у Всесвіті', 'Короткі (<2 сек) — від злиття нейтронних зірок, довгі (>2 сек) — від колапсу масивних зірок', 'GRB 221009A (2022) — найяскравіший зареєстрований спалах'],
  },
  {
    type: 'stellar-flare', category: 'phenomena', rarity: 'common', galleryCategory: 'anomalies',
    nameUk: 'Зоряний спалах', nameEn: 'Stellar Flare',
    descriptionUk: 'Раптовий потужний викид енергії з поверхні зірки. Магнітна рекомбінація вивільняє величезну кількість енергії.',
    promptTemplate: 'A massive stellar flare erupting from the surface of a star, brilliant white-hot flash of magnetic reconnection, plasma loops and coronal mass ejection expanding outward',
    scientificFacts: ['Зумовлені магнітною рекомбінацією в атмосфері зірки', 'Сонячні спалахи класу X можуть впливати на Землю', 'У червоних карликів спалахи відносно потужніші'],
  },
  {
    type: 'gravitational-lens', category: 'phenomena', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Гравітаційна лінза', nameEn: 'Gravitational Lens',
    descriptionUk: 'Масивний об\'єкт викривляє простір-час, фокусуючи світло далекої галактики. Передбачено Ейнштейном у 1915 році.',
    promptTemplate: 'A gravitational lensing effect with a massive galaxy cluster in the foreground bending light from distant background galaxies into arcs and multiple images, Einstein ring partially visible',
    scientificFacts: ['Передбачено загальною теорією відносності Ейнштейна', 'Дозволяє спостерігати галактики у ранньому Всесвіті', 'Хрест Ейнштейна — 4 зображення одного квазара'],
  },
  {
    type: 'fast-radio-burst', category: 'phenomena', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Швидкий радіоспалах', nameEn: 'Fast Radio Burst',
    descriptionUk: 'Надзвичайно короткий (мілісекунди) та потужний імпульс радіовипромінювання. Природа досі до кінця невідома.',
    promptTemplate: 'A fast radio burst emanating from a distant magnetar or unknown source, brief intense flash of radio energy propagating through intergalactic medium, dispersed signal arriving at different times',
    scientificFacts: ['Тривалість від мілісекунд до секунд', 'Перший виявлено у 2007 ("спалах Лорімера")', 'Деякі повторюються, що вказує на магнетари як джерело'],
  },
  {
    type: 'tidal-disruption', category: 'phenomena', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Припливне руйнування', nameEn: 'Tidal Disruption Event',
    descriptionUk: 'Зірка, розірвана припливними силами чорної діри. Газ утворює яскравий акреційний потік навколо чорної діри.',
    promptTemplate: 'A tidal disruption event where a star is being torn apart by a supermassive black hole, spaghettified stellar material forming a bright accretion stream, half the star falling in while half is flung outward',
    scientificFacts: ['Трапляється ~раз на 10 000-100 000 років на галактику', 'Яскравість зростає за тижні, потім повільно згасає за місяці', 'Дозволяє виявляти "сплячі" чорні діри'],
  },
  {
    type: 'cosmic-ray-shower', category: 'phenomena', rarity: 'uncommon', galleryCategory: 'anomalies',
    nameUk: 'Зливень космічних променів', nameEn: 'Cosmic Ray Shower',
    descriptionUk: 'Каскад частинок, породжений зіткненням високоенергетичної космічної частинки з атмосферою. Невидимий оком, але вражаючий за масштабом.',
    promptTemplate: 'An artistic visualization of an ultra-high-energy cosmic ray particle striking an atmosphere, cascade of secondary particles spreading in a cone shape, energetic shower of subatomic particles',
    scientificFacts: ['Енергія одної частинки може перевищувати 10^20 еВ', 'Частинка Oh-My-God (1991) мала енергію тенісного м\'яча', 'Джерело найенергетичніших космічних променів досі невідоме'],
  },
  {
    type: 'bow-shock', category: 'phenomena', rarity: 'common', galleryCategory: 'anomalies',
    nameUk: 'Головна ударна хвиля', nameEn: 'Bow Shock',
    descriptionUk: 'Ударна хвиля перед зіркою, що рухається через міжзоряне середовище швидше за звук. Як хвиля перед носом корабля.',
    promptTemplate: 'A stellar bow shock showing a crescent-shaped compressed gas arc ahead of a fast-moving star, luminous shock front where stellar wind meets interstellar medium, trailing tail of heated gas',
    scientificFacts: ['Утворюється коли зоряний вітер зустрічає міжзоряне середовище', 'Зета Змієносця має вражаючу головну ударну хвилю', 'Подібне утворення є у Сонячної системи — геліопауза'],
  },
  {
    type: 'magnetar-burst', category: 'phenomena', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Спалах магнетара', nameEn: 'Magnetar Burst',
    descriptionUk: 'Гігантський спалах від магнетара, коли його надзвичайно потужне магнітне поле перебудовується. За 0.2 секунди випромінює більше ніж Сонце за 250 000 років.',
    promptTemplate: 'A giant magnetar flare with an impossibly bright flash erupting from a neutron star, intense gamma-ray emission, magnetic field lines snapping and reconnecting, surrounding space distorted',
    scientificFacts: ['SGR 1806-20 у 2004 — найпотужніший зоряний спалах в історії спостережень', 'Тимчасово засліпив рентгенівські детектори на орбіті', 'Відчувся на відстані 50 000 світлових років'],
  },
];

// ---------------------------------------------------------------------------
// 5. EXOTIC PLANETS (14)
// ---------------------------------------------------------------------------

const EXOTIC_PLANETS: CatalogEntry[] = [
  {
    type: 'lava-planet', category: 'exotic-planets', rarity: 'rare', galleryCategory: 'landscapes',
    nameUk: 'Лавова планета', nameEn: 'Lava Planet',
    descriptionUk: 'Планета настільки близька до зірки, що її поверхня — суцільний океан розплавленої лави. Денна сторона може сягати 3 000°C.',
    promptTemplate: 'An extreme lava planet with a surface of molten magma oceans, rivers of glowing lava, volcanic eruptions, the nearby star filling much of the sky, thin silicate atmosphere glowing orange',
    scientificFacts: ['CoRoT-7b — одна з перших відкритих лавових планет', 'Температура денної сторони може випаровувати каміння', 'Можуть мати "кам\'яний дощ" на нічній стороні'],
  },
  {
    type: 'glass-rain-planet', category: 'exotic-planets', rarity: 'epic', galleryCategory: 'landscapes',
    nameUk: 'Планета скляного дощу', nameEn: 'Glass Rain Planet',
    descriptionUk: 'Газовий гігант де в атмосфері конденсується силікатне скло. При вітрах до 7 000 км/год скло летить горизонтально.',
    promptTemplate: 'An exotic blue gas giant where silicate glass condenses in the scorching atmosphere and rains sideways at 7000 km/h winds, deep azure blue color, violent atmospheric storms',
    scientificFacts: ['HD 189733b — планета з дощем із скла', 'Блакитний колір від розсіювання на силікатних частинках', 'Вітри до 7 000 км/год — швидше за звук'],
  },
  {
    type: 'iron-rain-planet', category: 'exotic-planets', rarity: 'epic', galleryCategory: 'landscapes',
    nameUk: 'Планета залізного дощу', nameEn: 'Iron Rain Planet',
    descriptionUk: 'Ультрагарячий газовий гігант де залізо випаровується на денній стороні і конденсується як дощ на нічній.',
    promptTemplate: 'An ultra-hot gas giant with iron vapor clouds on the blazing dayside, molten iron rain falling on the cooler nightside, extreme temperature gradient between hemispheres, glowing atmosphere',
    scientificFacts: ['WASP-76b — перша планета де виявлено залізний дощ', 'Денна сторона: 2 400°C, нічна: 1 500°C', 'Залізо випаровується на денній стороні і конденсується на нічній'],
  },
  {
    type: 'eyeball-planet', category: 'exotic-planets', rarity: 'rare', galleryCategory: 'landscapes',
    nameUk: 'Планета-око', nameEn: 'Eyeball Planet',
    descriptionUk: 'Припливно заблокована планета де одна сторона завжди звернута до зірки. Денна сторона — пустеля, нічна — крига, між ними — кільце обітаємості.',
    promptTemplate: 'A tidally locked eyeball planet viewed from space, one hemisphere a scorching desert facing the star, the other side frozen in eternal night, a thin ring of habitable twilight zone between them with possible liquid water',
    scientificFacts: ['Можливі навколо червоних карликів в зоні обітаємості', 'Вузька "сутінкова зона" може бути придатною для життя', 'Атмосферна циркуляція переносить тепло з денної на нічну сторону'],
  },
  {
    type: 'diamond-planet', category: 'exotic-planets', rarity: 'legendary', galleryCategory: 'landscapes',
    nameUk: 'Алмазна планета', nameEn: 'Diamond Planet',
    descriptionUk: 'Планета з високим вмістом вуглецю, де умови тиску та температури перетворюють вуглець на алмаз. До третини маси — чистий алмаз.',
    promptTemplate: 'A carbon-rich diamond planet with a crystalline surface reflecting starlight in brilliant prismatic colors, diamond and graphite geology, dark carbon landscape with glittering facets',
    scientificFacts: ['55 Cancri e може бути алмазною планетою', 'При вуглець/кисень >1 в зоряній системі формуються вуглецеві планети', 'PSR J1719-1438b — пульсарна планета, можливо на 100% з кристалічного вуглецю'],
  },
  {
    type: 'hot-jupiter', category: 'exotic-planets', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Гарячий Юпітер', nameEn: 'Hot Jupiter',
    descriptionUk: 'Газовий гігант на дуже тісній орбіті навколо зірки. Роздутий від нагрівання, з температурою тисячі градусів.',
    promptTemplate: 'A hot Jupiter gas giant extremely close to its parent star, bloated atmosphere being heated to thousands of degrees, possible atmospheric escape and comet-like tail, dramatic day-night contrast',
    scientificFacts: ['51 Пегаса b — перша відкрита екзопланета (1995), гарячий Юпітер', 'Орбітальний період — дні, а не роки', 'Атмосфера може "здуватися" зоряним вітром'],
  },
  {
    type: 'ocean-world', category: 'exotic-planets', rarity: 'uncommon', galleryCategory: 'landscapes',
    nameUk: 'Океанічний світ', nameEn: 'Ocean World',
    descriptionUk: 'Планета повністю вкрита глибоким океаном. Без суші. Під океаном — екзотичний лід під високим тиском.',
    promptTemplate: 'An ocean world completely covered by a deep global ocean, no land visible, subtle variations in ocean color from depths and currents, clouds and weather systems over endless water, distant star reflected',
    scientificFacts: ['Теоретично можливі океани глибиною 100+ км', 'На дні — екзотичний "гарячий лід" (Лід VII) під високим тиском', 'Можливо, деякі екзопланети типу "суперземля" — океанічні'],
  },
  {
    type: 'ultra-dark-planet', category: 'exotic-planets', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Ультратемна планета', nameEn: 'Ultra-Dark Planet',
    descriptionUk: 'Планета чорніша за вугілля. Поглинає понад 99% падаючого світла. Атмосфера з TiO та VO створює надзвичайну темряву.',
    promptTemplate: 'An ultra-dark exoplanet that absorbs over 99% of starlight, barely visible as a dark silhouette against space, faint red glow from extreme heat, nightside slightly visible from thermal emission',
    scientificFacts: ['TrES-2b відбиває менше 1% світла — темніший за вугілля', 'Оксиди титану та ванадію поглинають світло', 'Температура денної сторони — ~1 800 К'],
  },
  {
    type: 'super-earth', category: 'exotic-planets', rarity: 'common', galleryCategory: 'landscapes',
    nameUk: 'Суперземля', nameEn: 'Super-Earth',
    descriptionUk: 'Скелястая планета масою 2-10 мас Землі. Може мати щільну атмосферу, тектонічну активність та умови для життя.',
    promptTemplate: 'A super-Earth rocky planet larger than Earth with a thick atmosphere, visible tectonic features, possible volcanic activity, viewed from orbit showing continents and oceans if in habitable zone',
    scientificFacts: ['Маса від 2 до 10 мас Землі', 'Найпоширеніший тип екзопланет', 'Гравітація може бути в 2-3 рази більшою за земну'],
  },
  {
    type: 'rogue-planet', category: 'exotic-planets', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Бродяча планета', nameEn: 'Rogue Planet',
    descriptionUk: 'Планета, що не обертається навколо жодної зірки. Блукає у темряві міжзоряного простору після вигнання з рідної системи.',
    promptTemplate: 'A rogue planet drifting alone through interstellar space with no parent star, frozen surface dimly lit only by distant starlight, possible subsurface ocean heated by radioactive decay',
    scientificFacts: ['Можливо, бродячих планет більше ніж зірок у галактиці', 'Теоретично можуть зберігати рідку воду під льодом завдяки геотермальному теплу', 'Викидаються з систем гравітаційними взаємодіями'],
  },
  {
    type: 'puffy-planet', category: 'exotic-planets', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Пухнаста планета', nameEn: 'Puffy Planet',
    descriptionUk: 'Газовий гігант з надзвичайно низькою щільністю. Менша за щільність коркового дерева. Роздута невідомим механізмом.',
    promptTemplate: 'An extremely low-density puffy gas giant with an inflated atmosphere, wispy translucent outer layers, subtle atmospheric banding, unusually large for its mass, almost ethereal appearance',
    scientificFacts: ['HAT-P-67b має щільність менше за пінопласт', 'Механізм "роздування" досі дискутується', 'Деякі настільки легкі що плавали б на воді'],
  },
  {
    type: 'water-world-steam', category: 'exotic-planets', rarity: 'rare', galleryCategory: 'landscapes',
    nameUk: 'Паровий світ', nameEn: 'Steam World',
    descriptionUk: 'Планета де вода існує у надкритичному стані — ні рідина, ні пар. Суцільна оболонка перегрітої пари.',
    promptTemplate: 'A steam world planet with a thick atmosphere of supercritical water vapor, no visible surface, swirling white and grey clouds of superheated steam, greenhouse effect creating extreme temperatures',
    scientificFacts: ['При температурах >374°C та тиску >218 атм вода стає надкритичною', 'GJ 1214b може бути паровим світом', 'Рентгенівські та ультрафіолетові промені зірки можуть випаровувати водень'],
  },
  {
    type: 'sub-neptune', category: 'exotic-planets', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Міні-Нептун', nameEn: 'Sub-Neptune',
    descriptionUk: 'Планета між суперземлею та Нептуном. Скелястое ядро вкрите товстою газовою оболонкою з водню та гелію.',
    promptTemplate: 'A sub-Neptune sized planet with a visible thick hydrogen-helium atmosphere over a rocky core, muted atmospheric bands, intermediate in appearance between a rocky world and a gas giant',
    scientificFacts: ['Найпоширеніший тип планет у галактиці', 'Радіус 2-4 радіуси Землі', 'Немає аналогу в Сонячній системі'],
  },
  {
    type: 'volcanic-moon', category: 'exotic-planets', rarity: 'rare', galleryCategory: 'landscapes',
    nameUk: 'Вулканічний місяць', nameEn: 'Volcanic Moon',
    descriptionUk: 'Супутник з інтенсивною вулканічною активністю, нагрітий припливними силами від гіганта-хазяїна. Подібний до Іо.',
    promptTemplate: 'A volcanic moon like Io with hundreds of active volcanoes, sulfur-covered surface in vivid yellows and oranges, volcanic plumes rising above the horizon, giant planet looming in the sky',
    scientificFacts: ['Іо (супутник Юпітера) — найвулканічніше тіло в Сонячній системі', 'Припливні сили від планети-гіганта генерують внутрішнє тепло', 'Поверхня повністю оновлюється за кілька тисяч років'],
  },
];

// ---------------------------------------------------------------------------
// 6. DARK OBJECTS (10)
// ---------------------------------------------------------------------------

const DARK_OBJECTS: CatalogEntry[] = [
  {
    type: 'stellar-black-hole', category: 'dark-objects', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Зоряна чорна діра', nameEn: 'Stellar Black Hole',
    descriptionUk: 'Чорна діра зоряної маси — залишок колапсу масивної зірки. Простір-час настільки викривлений, що навіть світло не може вирватися.',
    promptTemplate: 'A stellar mass black hole with visible gravitational lensing distorting background stars, thin accretion ring of superheated matter, photon ring visible, extreme spacetime curvature',
    scientificFacts: ['Маса 3-100 мас Сонця', 'Горизонт подій — точка неповернення для будь-чого', 'Перше пряме зображення чорної діри отримано у 2019 (M87*)'],
  },
  {
    type: 'supermassive-bh', category: 'dark-objects', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Надмасивна чорна діра', nameEn: 'Supermassive Black Hole',
    descriptionUk: 'Чорна діра в мільйони або мільярди мас Сонця в центрі галактики. Визначає долю мільярдів зірок.',
    promptTemplate: 'A supermassive black hole at the center of a galaxy with a massive luminous accretion disk, powerful relativistic jets, Einstein ring from gravitational lensing, surrounding stars in rapid orbit',
    scientificFacts: ['Маса від мільйонів до мільярдів мас Сонця', 'Стрілець A* — надмасивна чорна діра в центрі нашої галактики (4 млн мас Сонця)', 'TON 618 — одна з найбільших відомих (66 мільярдів мас Сонця)'],
  },
  {
    type: 'einstein-ring', category: 'dark-objects', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Кільце Ейнштейна', nameEn: 'Einstein Ring',
    descriptionUk: 'Ідеальне коло світла, утворене коли далека галактика, лінза та спостерігач ідеально вишикувані.',
    promptTemplate: 'A perfect Einstein ring formed by gravitational lensing, a complete circle of light from a distant galaxy bent around a massive foreground object, multiple distorted images of the background source',
    scientificFacts: ['Передбачено загальною теорією відносності', 'Потрібне майже ідеальне вишикування джерела, лінзи та спостерігача', 'JWST виявив декілька майже ідеальних кілець Ейнштейна'],
  },
  {
    type: 'binary-black-hole', category: 'dark-objects', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Подвійна чорна діра', nameEn: 'Binary Black Hole',
    descriptionUk: 'Дві чорні діри на орбіті одна навколо одної. Випромінюють гравітаційні хвилі та повільно зближуються для злиття.',
    promptTemplate: 'Two black holes orbiting each other in a tight binary, gravitational waves rippling outward, each with its own warped accretion disk, light from background stars doubly lensed and distorted',
    scientificFacts: ['LIGO виявив гравітаційні хвилі від злиття у 2015', 'При злитті випромінюється до 5% маси у вигляді гравітаційних хвиль', 'OJ 287 — кандидат у подвійну надмасивну чорну діру'],
  },
  {
    type: 'quark-star', category: 'dark-objects', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Кваркова зірка', nameEn: 'Quark Star',
    descriptionUk: 'Теоретичний об\'єкт щільніший за нейтронну зірку, де нейтрони розпалися на кварки. Щільність — як у атомного ядра.',
    promptTemplate: 'A theoretical quark star denser than a neutron star, extremely compact with matter at nuclear density, strange glow from exotic quark matter, gravitational lensing visible around its surface',
    scientificFacts: ['Теоретично передбачені, але не підтверджені', 'Кварковий конденсат при щільності >10^15 г/см³', 'RX J1856.5-3754 та 3C 58 — можливі кандидати'],
  },
  {
    type: 'primordial-black-hole', category: 'dark-objects', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Первинна чорна діра', nameEn: 'Primordial Black Hole',
    descriptionUk: 'Теоретична чорна діра, утворена не з зірки, а з флуктуацій щільності у ранньому Всесвіті.',
    promptTemplate: 'A tiny primordial black hole from the early universe, microscopic but visible through its intense Hawking radiation glow, spacetime distortion around an incredibly small but dense object',
    scientificFacts: ['Можуть мати масу від мікрограмів до тисяч мас Сонця', 'Малі первинні чорні діри випаровуються через випромінювання Хокінга', 'Один з кандидатів на пояснення темної матерії'],
  },
  {
    type: 'blazar', category: 'dark-objects', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Блазар', nameEn: 'Blazar',
    descriptionUk: 'Активне ядро галактики з релятивістським джетом, спрямованим прямо на спостерігача. Найяскравіші стійкі джерела у Всесвіті.',
    promptTemplate: 'A blazar with its relativistic jet pointed directly at the viewer, intensely bright central source, apparent superluminal motion in the jet, highly variable brightness, extreme Doppler boosting',
    scientificFacts: ['Джет спрямований під кутом <10° до лінії зору', 'Видимий рух може перевищувати швидкість світла (оптична ілюзія)', 'Markarian 421 — найближчий яскравий блазар'],
  },
  {
    type: 'dark-matter-halo', category: 'dark-objects', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Гало темної матерії', nameEn: 'Dark Matter Halo',
    descriptionUk: 'Невидима сфера темної матерії, що оточує кожну галактику. Містить у 5-10 разів більше маси ніж видима частина.',
    promptTemplate: 'An artistic visualization of a dark matter halo surrounding a galaxy, invisible mass revealed through gravitational lensing of background galaxies, subtle distortion field extending far beyond the visible galaxy',
    scientificFacts: ['Становить ~85% всієї матерії у Всесвіті', 'Виявляється через гравітаційний вплив та лінзування', 'Природа темної матерії — одна з найбільших загадок фізики'],
  },
  {
    type: 'intermediate-bh', category: 'dark-objects', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Чорна діра проміжної маси', nameEn: 'Intermediate Mass Black Hole',
    descriptionUk: 'Чорна діра масою 100-100 000 мас Сонця. Рідкісна "ланка що бракує" між зоряними та надмасивними.',
    promptTemplate: 'An intermediate mass black hole in the center of a dense globular star cluster, modest accretion disk, stars in rapid orbit around it, gravitational influence visible on nearby stellar orbits',
    scientificFacts: ['Маса 100-100 000 мас Сонця', 'HLX-1 — один з найсильніших кандидатів', 'Можуть бути "зародками" надмасивних чорних дір'],
  },
  {
    type: 'white-hole', category: 'dark-objects', rarity: 'legendary', galleryCategory: 'anomalies',
    nameUk: 'Біла діра', nameEn: 'White Hole',
    descriptionUk: 'Теоретичний об\'єкт — "зворотна" чорна діра. Нічого не може увійти, тільки виходить. Математично дозволений, не спостерігався.',
    promptTemplate: 'A theoretical white hole ejecting matter and energy, reverse of a black hole, brilliant outpouring of light and matter from a singularity, spacetime fabric reversed, matter flowing outward from nothing',
    scientificFacts: ['Дозволена рівняннями загальної теорії відносності', 'Жодного спостережного підтвердження не існує', 'Деякі теорії пов\'язують білі діри з Великим Вибухом'],
  },
];

// ---------------------------------------------------------------------------
// 7. STAR-FORMING (10)
// ---------------------------------------------------------------------------

const STAR_FORMING: CatalogEntry[] = [
  {
    type: 'molecular-cloud', category: 'star-forming', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Молекулярна хмара', nameEn: 'Molecular Cloud',
    descriptionUk: 'Гігантська хмара молекулярного водню та пилу — колиска зірок. Температура всередині — лише 10-20 кельвінів.',
    promptTemplate: 'A massive dark molecular cloud complex with embedded protostars creating faint glowing points within, infrared-revealed internal structure, cold dark exterior with subtle reddening of background stars',
    scientificFacts: ['Маса від 1 000 до мільйонів мас Сонця', 'Температура 10-20 К', 'Хмара Оріона B — одна з найближчих гігантських молекулярних хмар'],
  },
  {
    type: 'pillars-of-creation', category: 'star-forming', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Стовпи Творіння', nameEn: 'Pillars of Creation',
    descriptionUk: 'Величні стовпи газу та пилу всередині туманності, де формуються нові зірки. Іконічне зображення від Хаббла.',
    promptTemplate: 'Towering pillars of interstellar gas and dust similar to the Pillars of Creation, dense columns with evaporating surfaces lit by nearby hot stars, new stars forming at the pillar tips, dramatic backlighting',
    scientificFacts: ['Знаходяться в туманності Орел (M16)', 'Висота стовпів — ~4-5 світлових років', 'Одне з найвідоміших зображень телескопа Хаббл (1995)'],
  },
  {
    type: 'open-cluster', category: 'star-forming', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Розсіяне скупчення', nameEn: 'Open Star Cluster',
    descriptionUk: 'Група молодих зірок, народжених з однієї молекулярної хмари. Зірки ще не встигли розсіятися.',
    promptTemplate: 'A young open star cluster with dozens to hundreds of bright blue-white stars grouped together, remnant nebulosity from the birth cloud still visible, stellar variety within the cluster',
    scientificFacts: ['Містять від десятків до тисяч зірок', 'Вік від мільйонів до сотень мільйонів років', 'Плеяди (M45) — найвідоміше розсіяне скупчення'],
  },
  {
    type: 'globular-cluster', category: 'star-forming', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Кулясте скупчення', nameEn: 'Globular Cluster',
    descriptionUk: 'Щільна сферична колекція сотень тисяч старих зірок. Одні з найстаріших об\'єктів у Всесвіті.',
    promptTemplate: 'A magnificent globular cluster with hundreds of thousands of stars densely packed into a spherical shape, bright concentrated core, gradually thinning outward, old yellowish-red stellar population',
    scientificFacts: ['Містять 100 000 — мільйон зірок', 'Вік 10-13 мільярдів років — майже як Всесвіт', 'Omega Centauri — найбільше кулясте скупчення Чумацького Шляху'],
  },
  {
    type: 'bok-globule', category: 'star-forming', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Глобула Бока', nameEn: 'Bok Globule',
    descriptionUk: 'Маленька щільна темна хмарка, де формується одна або кілька зірок. Видна як чорна пляма на тлі яскравої туманності.',
    promptTemplate: 'A small dark Bok globule silhouetted against a bright emission nebula background, compact opaque cloud of dust and gas, possible protostellar activity visible in infrared at its core',
    scientificFacts: ['Розмір 0.1-1 світловий рік', 'Маса 2-50 мас Сонця', 'Названі на честь Барта Бока, який вперше описав їх у 1947'],
  },
  {
    type: 'protostar', category: 'star-forming', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Протозірка', nameEn: 'Protostar',
    descriptionUk: 'Зірка що формується — щільне ядро молекулярної хмари, яке колапсує під дією гравітації. Ще не досягло термоядерних реакцій.',
    promptTemplate: 'A young protostar embedded in a dense envelope of gas and dust, infrared glow from gravitational contraction, beginning of an accretion disk forming around it, bipolar outflow starting',
    scientificFacts: ['Фаза протозірки триває ~500 000 років', 'Нагрівається гравітаційним стисненням, не термоядерними реакціями', 'Видна лише в інфрачервоному через товсту пилову оболонку'],
  },
  {
    type: 'stellar-nursery', category: 'star-forming', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Зоряний родопоміч', nameEn: 'Stellar Nursery',
    descriptionUk: 'Активна область зореутворення де десятки або сотні зірок формуються одночасно. Туманність пронизана джетами та потоками.',
    promptTemplate: 'An active stellar nursery region with multiple protostars forming simultaneously, crisscrossing jets from young stars, glowing gas pillars being eroded by radiation, a chaotic vibrant scene of stellar birth',
    scientificFacts: ['Туманність Оріона — найближча масивна зоряна колиска', 'Зоряне народження відбувається у "зернах" молекулярних хмар', 'Масивні зірки народжуються та вмирають до того як менші зірки покинуть колиску'],
  },
  {
    type: 'herbig-ae-be', category: 'star-forming', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Зірка Хербіга Ae/Be', nameEn: 'Herbig Ae/Be Star',
    descriptionUk: 'Молода зірка проміжної маси (2-8 мас Сонця), оточена протопланетним диском. Потужніший "родич" зірок T Тельця.',
    promptTemplate: 'A young Herbig Ae/Be star with a prominent dusty protoplanetary disk, strong infrared excess from warm dust, variable brightness, possible spiral structure in the disk indicating planet formation',
    scientificFacts: ['Маса 2-8 мас Сонця', 'Вік менше 10 мільйонів років', 'Прекурсори зірок типу A та B головної послідовності'],
  },
  {
    type: 'infrared-dark-cloud', category: 'star-forming', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Інфрачервоно-темна хмара', nameEn: 'Infrared Dark Cloud',
    descriptionUk: 'Надзвичайно холодна та щільна хмара, темна навіть у інфрачервоному діапазоні. Передвісник масивного зореутворення.',
    promptTemplate: 'An infrared dark cloud appearing as an opaque silhouette even against mid-infrared galactic background emission, extremely cold and dense molecular gas, fragmented filamentary structure',
    scientificFacts: ['Температура <20 К', 'Видимі як темні силуети навіть на 8 мкм', 'Прекурсори масивних зоряних скупчень'],
  },
  {
    type: 'triggered-star-formation', category: 'star-forming', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Ініційоване зореутворення', nameEn: 'Triggered Star Formation',
    descriptionUk: 'Ланцюгова реакція: наднова або зоряний вітер стискає навколишній газ, запускаючи хвилю нового зореутворення.',
    promptTemplate: 'A sequence of triggered star formation showing a supernova remnant or wind-blown bubble compressing nearby molecular cloud, new stars forming at the compressed interface, generational wave of stellar birth',
    scientificFacts: ['Ударна хвиля від наднової стискає навколишній газ', 'Може створити "послідовне зореутворення" — кілька поколінь зірок', 'Можливо, наша Сонячна система утворилася саме таким чином'],
  },
];

// ---------------------------------------------------------------------------
// 8. BINARY SYSTEMS (6)
// ---------------------------------------------------------------------------

const BINARIES: CatalogEntry[] = [
  {
    type: 'contact-binary', category: 'binaries', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Контактна подвійна', nameEn: 'Contact Binary',
    descriptionUk: 'Дві зірки настільки близькі, що їх атмосфери торкаються та зливаються. Мають спільну зовнішню оболонку.',
    promptTemplate: 'A contact binary star system where two stars share a common outer envelope, figure-eight shape visible, shared atmosphere creating a peanut or dumbbell profile, mass flowing between the components',
    scientificFacts: ['Орбітальний період — від кількох годин до дня', 'Мають характерну форму "арахісу"', 'KIC 9832227 — контактна подвійна що може злитися'],
  },
  {
    type: 'eclipsing-binary', category: 'binaries', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Затемнювана подвійна', nameEn: 'Eclipsing Binary',
    descriptionUk: 'Подвійна система де зірки періодично затемнюють одна одну. Яскравість змінюється як годинник.',
    promptTemplate: 'An eclipsing binary star system with one star partially blocking the light of the other, visible orbital motion, two distinct stars of different sizes and colors in close orbit',
    scientificFacts: ['Алголь — найвідоміша затемнювана подвійна ("Демонська зірка")', 'Дозволяють точно визначити маси та розміри зірок', 'Близько половини всіх зірок — у подвійних системах'],
  },
  {
    type: 'x-ray-binary', category: 'binaries', rarity: 'epic', galleryCategory: 'anomalies',
    nameUk: 'Рентгенівська подвійна', nameEn: 'X-Ray Binary',
    descriptionUk: 'Компактний об\'єкт (нейтронна зірка або чорна діра) акрецює матерію від зірки-компаньйона, нагріваючи її до мільйонів градусів.',
    promptTemplate: 'An X-ray binary system with a compact object pulling matter from a companion star through an accretion stream, superheated accretion disk glowing in X-rays, mass transfer Roche lobe visible',
    scientificFacts: ['Газ нагрівається до мільйонів К при падінні на компактний об\'єкт', 'Cygnus X-1 — перший об\'єкт ідентифікований як чорна діра', 'Потужне джерело рентгенівського випромінювання'],
  },
  {
    type: 'mass-transfer-binary', category: 'binaries', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Подвійна з переносом маси', nameEn: 'Mass-Transfer Binary',
    descriptionUk: 'Система де одна зірка "крадує" матерію в іншої через точку Лагранжа. Змінює еволюцію обох зірок.',
    promptTemplate: 'A binary star system with a visible stream of gas flowing from a larger star to a smaller companion through the inner Lagrangian point, gas stream curving in the rotating frame, accretion disk forming',
    scientificFacts: ['Перенос маси відбувається через точку Лагранжа L1', 'Може перевернути еволюцію — менша зірка стає масивнішою', '"Парадокс Алголя" — пояснюється переносом маси'],
  },
  {
    type: 'spectroscopic-binary', category: 'binaries', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Спектроскопічна подвійна', nameEn: 'Spectroscopic Binary',
    descriptionUk: 'Подвійна система яку неможливо розділити в телескоп, але подвійність видна у спектрі через ефект Доплера.',
    promptTemplate: 'A close spectroscopic binary star system, two stars orbiting so closely they appear as one point of light, visible Doppler-shifted spectral lines showing orbital motion, merged light profile',
    scientificFacts: ['Виявляються через зміщення спектральних ліній', 'Мізар — перша відкрита спектроскопічна подвійна (1889)', 'Дозволяють визначити орбітальний період та мінімальні маси'],
  },
  {
    type: 'cataclysmic-variable', category: 'binaries', rarity: 'rare', galleryCategory: 'anomalies',
    nameUk: 'Катаклізмічна змінна', nameEn: 'Cataclysmic Variable',
    descriptionUk: 'Білий карлик що акрецює від червоного карлика. Час від часу спалахує — карликова нова.',
    promptTemplate: 'A cataclysmic variable system with a white dwarf accreting matter from a red dwarf companion, bright accretion disk with hot spot where the stream impacts, possible dwarf nova outburst in progress',
    scientificFacts: ['Акреційний диск навколо білого карлика', 'Карликові нові — спалахи нестабільності в диску (не термоядерні)', 'SS Cygni — класичний приклад катаклізмічної змінної'],
  },
];

// ---------------------------------------------------------------------------
// 9. RINGS & SMALL BODIES (8)
// ---------------------------------------------------------------------------

const SMALL_BODIES: CatalogEntry[] = [
  {
    type: 'ring-system', category: 'small-bodies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Кільцева система', nameEn: 'Ring System',
    descriptionUk: 'Величні кільця навколо газового гіганта. Мільярди крижаних та кам\'яних частинок, від мікрометрів до метрів.',
    promptTemplate: 'A majestic ring system around a gas giant planet, intricate ring structure with gaps and divisions, sunlight casting shadows from rings onto the planet, shepherd moons visible in the gaps',
    scientificFacts: ['Кільця Сатурна — найвражаючіші, але й Юпітер, Уран та Нептун мають кільця', 'Кільця Сатурна лише ~10 метрів товщиною при діаметрі 280 000 км', 'Можливо, молоді — лише 100 мільйонів років'],
  },
  {
    type: 'comet', category: 'small-bodies', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Комета', nameEn: 'Comet',
    descriptionUk: 'Крижане тіло, що при наближенні до зірки утворює яскравий хвіст з газу та пилу. "Брудний сніжок" Всесвіту.',
    promptTemplate: 'A comet near perihelion with a brilliant coma and long dust tail curving away from the sun, fainter blue ion tail pointing directly away, jets of gas erupting from the nucleus surface',
    scientificFacts: ['Два хвости: пиловий (вигнутий) та іонний (прямий)', 'Ядро — "брудний сніжок" діаметром 1-50 км', 'Комета Хейла-Боппа була видна неозброєним оком 18 місяців (1996-97)'],
  },
  {
    type: 'asteroid-belt', category: 'small-bodies', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Пояс астероїдів', nameEn: 'Asteroid Belt',
    descriptionUk: 'Область навколо зірки заповнена кам\'яними та металевими уламками — залишками невдалого планетоутворення.',
    promptTemplate: 'An asteroid belt with thousands of rocky and metallic bodies of various sizes scattered in a broad ring around a star, largest asteroids visible with cratered surfaces, distant star illuminating the scene',
    scientificFacts: ['Головний пояс між Марсом та Юпітером містить мільйони астероїдів', 'Загальна маса — лише 4% маси Місяця', 'Гравітація Юпітера запобігла формуванню планети'],
  },
  {
    type: 'kuiper-belt', category: 'small-bodies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: "Пояс Койпера", nameEn: 'Kuiper Belt',
    descriptionUk: 'Далекий пояс крижаних тіл за орбітою Нептуна. Дім Плутона та тисяч малих крижаних світів.',
    promptTemplate: 'A distant Kuiper Belt region with scattered icy bodies of various sizes, dwarf planets visible, faint distant sun providing minimal illumination, pristine primordial icy surfaces',
    scientificFacts: ['Простягається від 30 до 55 а.о. від Сонця', 'Плутон — найвідоміший об\'єкт пояса Койпера', 'Містить ~100 000 об\'єктів діаметром >100 км'],
  },
  {
    type: 'oort-cloud', category: 'small-bodies', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Хмара Оорта', nameEn: 'Oort Cloud',
    descriptionUk: 'Гіпотетична гігантська сферична хмара крижаних тіл на краю зоряної системи. Джерело довгоперіодичних комет.',
    promptTemplate: 'A visualization of the Oort Cloud at the extreme edge of a stellar system, vast spherical shell of icy bodies barely illuminated, distant star as a bright point, immense scale of empty space',
    scientificFacts: ['Можливо простягається до 100 000 а.о. (1.87 світлового року)', 'Ніколи безпосередньо не спостерігалася', 'Гравітаційні збурення від зірок-сусідів надсилають комети у внутрішню систему'],
  },
  {
    type: 'trojan-asteroids', category: 'small-bodies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Троянські астероїди', nameEn: 'Trojan Asteroids',
    descriptionUk: 'Астероїди, захоплені в точках Лагранжа L4 та L5 планети-гіганта. Діляться орбітою з планетою.',
    promptTemplate: 'Trojan asteroids clustered at the L4 or L5 Lagrange point of a giant planet orbit, swarm of rocky bodies sharing the planet orbit, the giant planet visible in the distance along the same orbital path',
    scientificFacts: ['Юпітерові трояни — найчисленніші, понад 12 000 відомих', 'Розташовані на 60° попереду та позаду планети на її орбіті', 'Місія Lucy NASA досліджує юпітерові трояни'],
  },
  {
    type: 'debris-disk', category: 'small-bodies', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Уламковий диск', nameEn: 'Debris Disk',
    descriptionUk: 'Диск пилу та уламків навколо зрілої зірки — залишки процесу формування планет. Як зоряна "будівельна площадка".',
    promptTemplate: 'A debris disk around a mature star with a broad ring of dust and rocky fragments, possible gaps carved by unseen planets, infrared glow from warm dust, subtle asymmetries in the disk structure',
    scientificFacts: ['Вега та Фомальгаут мають вражаючі уламкові диски', 'Свідчать про наявність або формування планетної системи', 'Зображення диска Фомальгаута — одне з перших прямих зображень екзопланетного диска'],
  },
  {
    type: 'interstellar-object', category: 'small-bodies', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Міжзоряний об\'єкт', nameEn: 'Interstellar Object',
    descriptionUk: 'Об\'єкт з іншої зоряної системи, що пролітає через нашу. Надзвичайно рідкісний "космічний мандрівник".',
    promptTemplate: 'An interstellar object from another star system passing through, unusual elongated or irregular shape, possible outgassing creating a faint tail, hyperbolic trajectory visible against the starfield',
    scientificFacts: ['Оумуамуа (2017) — перший відкритий міжзоряний об\'єкт', 'Борисов (2019) — перша міжзоряна комета', 'Незвичайна форма Оумуамуа породила гіпотези від штучного зонда до уламку планети'],
  },
];

// ---------------------------------------------------------------------------
// 10. ROGUE / WANDERING OBJECTS (8)
// ---------------------------------------------------------------------------

const ROGUES: CatalogEntry[] = [
  {
    type: 'rogue-gas-giant', category: 'rogues', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Бродячий газовий гігант', nameEn: 'Rogue Gas Giant',
    descriptionUk: 'Газовий гігант, що блукає у міжзоряному просторі без зірки. Випромінює слабке інфрачервоне тепло.',
    promptTemplate: 'A rogue gas giant wandering through interstellar space, faint infrared glow from residual heat, subtle atmospheric banding barely visible, no star illumination, lit only by distant starlight',
    scientificFacts: ['За оцінками може бути мільярди бродячих газових гігантів у галактиці', 'Зберігають тепло мільярди років після вигнання', 'CFBDSIR 2149-0403 — один з кандидатів'],
  },
  {
    type: 'l-type-brown-dwarf', category: 'rogues', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Коричневий карлик типу L', nameEn: 'L-type Brown Dwarf',
    descriptionUk: 'Холодний субзоряний об\'єкт з температурою 1 300-2 000 К. Атмосфера з хмарами залізних крапель та кремнієвого пилу.',
    promptTemplate: 'An L-type brown dwarf with a dark reddish-magenta glow, atmospheric cloud bands of iron and silicate dust particles, faint thermal emission, storm systems visible on the surface',
    scientificFacts: ['Температура 1 300-2 000 К', 'Хмари з конденсованого заліза та силікатів', 'Тьмяніший за найменші зірки головної послідовності'],
  },
  {
    type: 't-type-brown-dwarf', category: 'rogues', rarity: 'common', galleryCategory: 'cosmos',
    nameUk: 'Коричневий карлик типу T', nameEn: 'T-type Brown Dwarf',
    descriptionUk: 'Холодний субзоряний об\'єкт з метановою атмосферою. Температура 500-1 300 К — тепліший за духовку, але холодний для зірки.',
    promptTemplate: 'A T-type brown dwarf with a cool methane-rich atmosphere, possible bright and dark atmospheric bands, faint thermal glow in deep infrared, Jupiter-like appearance but self-luminous',
    scientificFacts: ['Метанові смуги поглинання домінують у спектрі', 'Температура 500-1 300 К', 'Gliese 229B — перший відкритий T-карлик'],
  },
  {
    type: 'y-type-brown-dwarf', category: 'rogues', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Коричневий карлик типу Y', nameEn: 'Y-type Brown Dwarf',
    descriptionUk: 'Найхолодніший тип субзоряних об\'єктів. Температура може бути нижче кімнатної — холодніший за чашку кави.',
    promptTemplate: 'A Y-type brown dwarf barely visible even in infrared, extremely cool object with water cloud layers, nearly invisible against the background of space, atmospheric temperature possibly below room temperature',
    scientificFacts: ['Температура може бути нижче 300 К (27°C)', 'WISE 0855-0714 — один з найхолодніших відомих (-23°C)', 'Водяні хмари як на Землі, але без зірки'],
  },
  {
    type: 'binary-brown-dwarf', category: 'rogues', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Подвійний коричневий карлик', nameEn: 'Binary Brown Dwarf',
    descriptionUk: 'Два коричневі карлики на орбіті один навколо одного. Тьмяна система субзоряних об\'єктів, зв\'язаних гравітацією.',
    promptTemplate: 'A binary brown dwarf system with two cool dim objects orbiting each other, faint mutual illumination, different spectral types visible, differing atmospheric banding patterns on each component',
    scientificFacts: ['~15-20% коричневих карликів у подвійних системах', 'Luhman 16 — найближча подвійна коричневих карликів (6.5 св. років)', 'Дозволяють точно виміряти маси субзоряних об\'єктів'],
  },
  {
    type: 'rogue-rocky-planet', category: 'rogues', rarity: 'uncommon', galleryCategory: 'cosmos',
    nameUk: 'Бродяча скеляста планета', nameEn: 'Rogue Rocky Planet',
    descriptionUk: 'Невелика кам\'яна планета в міжзоряному просторі. Замерзла поверхня, але можливо зберігає рідку воду під кригою.',
    promptTemplate: 'A rogue rocky planet drifting through deep space, frozen icy surface with no stellar illumination, possible geothermal vents maintaining a subsurface ocean, lit only by faint starlight from distant stars',
    scientificFacts: ['Теоретично мільярди таких планет у кожній галактиці', 'Геотермальне тепло може підтримувати підповерхневий океан', 'Виявлені через гравітаційне мікролінзування'],
  },
  {
    type: 'hypervelocity-star', category: 'rogues', rarity: 'epic', galleryCategory: 'cosmos',
    nameUk: 'Гіпершвидкісна зірка', nameEn: 'Hypervelocity Star',
    descriptionUk: 'Зірка, що вирвалася з галактики зі швидкістю понад 500 км/с. Вигнана гравітаційним "стрибком" від надмасивної чорної діри.',
    promptTemplate: 'A hypervelocity star racing through the galactic halo at extreme speed, visible bow shock in the tenuous intergalactic medium, leaving the galaxy behind, dramatic motion blur suggesting immense velocity',
    scientificFacts: ['Швидкість понад 500 км/с — достатньо щоб покинути галактику', 'Вигнані взаємодією з надмасивною чорною дірою в центрі галактики', 'S5-HVS1 рухається зі швидкістю ~1 700 км/с'],
  },
  {
    type: 'stellar-stream', category: 'rogues', rarity: 'rare', galleryCategory: 'cosmos',
    nameUk: 'Зоряний потік', nameEn: 'Stellar Stream',
    descriptionUk: 'Довга тонка стрічка зірок, витягнута з карликової галактики або кулястого скупчення припливними силами великої галактики.',
    promptTemplate: 'A stellar stream of stars stretched into a long thin arc across the sky by tidal forces, remnant of a disrupted dwarf galaxy, individual stars visible along the stream, host galaxy in the background',
    scientificFacts: ['Потік Стрільця — залишки карликової галактики, що поглинається Чумацьким Шляхом', 'Дозволяють картографувати розподіл темної матерії', 'Кожна велика галактика має десятки зоряних потоків'],
  },
];

// ---------------------------------------------------------------------------
// Complete catalog
// ---------------------------------------------------------------------------

export const COSMIC_CATALOG: ReadonlyArray<CatalogEntry> = [
  ...NEBULAE,           // 12
  ...STARS,             // 20
  ...GALAXIES,          // 14
  ...PHENOMENA,         // 14
  ...EXOTIC_PLANETS,    // 14
  ...DARK_OBJECTS,      // 10
  ...STAR_FORMING,      // 10
  ...BINARIES,          // 6
  ...SMALL_BODIES,      // 8
  ...ROGUES,            // 8
  // Total: 116 (6 short of 122 — remaining will be biological from expeditions)
] as const;

/** Quick lookup by type key */
export function getCatalogEntry(type: string): CatalogEntry | undefined {
  return COSMIC_CATALOG.find((e) => e.type === type);
}

/** Filter catalog by category */
export function getCatalogByCategory(category: string): CatalogEntry[] {
  return COSMIC_CATALOG.filter((e) => e.category === category);
}

/** Filter catalog by rarity */
export function getCatalogByRarity(rarity: string): CatalogEntry[] {
  return COSMIC_CATALOG.filter((e) => e.rarity === rarity);
}
