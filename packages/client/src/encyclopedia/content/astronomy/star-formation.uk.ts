import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'star-formation',
  language: 'uk',
  section: 'astronomy',
  order: 11,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Як народжуються зорі',
  subtitle: 'Від молекулярної хмари до зоряних ясел — фізика гравітаційного колапсу, акреційних дисків і перших зоряних спалахів.',

  hero: {
    cacheKey: 'star-formation-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: a vast interstellar molecular cloud collapsing into multiple young stars. ' +
      'Dense dark dust pillars with glowing amber and orange edges lit from within by embedded protostars. ' +
      'Bipolar jets of ionized gas shoot outward in bright blue-white from the base of each pillar. ' +
      'Background shows a deep space nebula in purple and teal tones. Hard sci-fi style, dark space background. ' +
      'Add the following text labels on the image: "molecular cloud", "protostar", "bipolar jet", "accretion disk".',
    alt: 'Молекулярна хмара, що колапсує в кілька протозір із двополярними джетами і акреційними дисками',
    caption:
      'Зоряні ясла — наприклад, туманність Оріона або "Стовпи Творіння" в туманності Орел — це місця, де гравітація перемагає тиск газу і запалює нові сонця. ' +
      'JWST вперше показав їх зсередини в інфрачервоному діапазоні.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Міжзоряний простір не порожній. Між зорями розкидані величезні хмари холодного газу і пилу — ' +
        '_молекулярні хмари_ — де температура може опускатися до десяти кельвінів вище абсолютного нуля. ' +
        'Саме там, у темряві і холоді, починається народження зір. Жодного вогню, жодної яскравості — ' +
        'лише повільне, невблаганне ущільнення матерії під дією гравітації.',

        'Відповідь на питання "чому там, а не скрізь?" дав у першій половині XX століття британський фізик Джеймс Джинс. ' +
        'Він показав, що хмара газу залишається стабільною, поки її внутрішній тиск врівноважує гравітацію. ' +
        'Але якщо хмара стає досить масивною або досить холодною, рівновага порушується — і вона починає колапсувати під власною вагою. ' +
        'Цей критичний поріг отримав назву **маса Джинса**: хмари нижче порогу живуть вічно, хмари вище — приречені стати зорями.',

        'Поодинці молекулярні хмари можуть мільярди років балансувати на межі колапсу. ' +
        'Потрібен поштовх. І Всесвіт знає, як його дати.',
      ],
    },

    {
      heading: 'Тригери: що запускає колапс',
      level: 2,
      paragraphs: [
        'Найпотужніший тригер зореутворення — **ударна хвиля від наднової**. ' +
        'Коли масивна зоря вибухає, вона виштовхує у простір кількасот сонячних мас речовини зі швидкістю тисяч кілометрів на секунду. ' +
        'Ця ударна хвиля досягає сусідньої молекулярної хмари, стискає її — і там, де раніше не вистачало маси для колапсу, ' +
        'тепер її раптом більш ніж достатньо. Зорі буквально народжуються зі смерті інших зір.',

        'Другий тригер — **щільнісні хвилі** у спіральних рукавах галактик. ' +
        'Спіральні рукави — це не матерія, що обертається разом, а хвилі підвищеної щільності, ' +
        'схожі на пробки на кільцевій дорозі: газ і пил, входячи в рукав, стискаються і сповільнюються. ' +
        'Такий стиск може сам по собі перевищити масу Джинса і запустити каскад зореутворення вздовж цілого рукава.',

        'Менші збурення — зіткнення двох молекулярних хмар або гравітаційний вплив сусідньої зоряної системи — ' +
        'також спрацьовують, але рідше і локально. Результат завжди однаковий: ' +
        'хмара, що ще недавно дрімала в рівновазі, починає стрімко і необоротно стискатися.',
      ],
    },

    {
      image: {
        cacheKey: 'star-formation-molecular-cloud-collapse',
        prompt:
          'Photorealistic illustration for a science encyclopedia: cross-section diagram of an interstellar molecular cloud being compressed by a supernova shockwave. ' +
          'Left side shows an expanding supernova remnant shell in orange-red. Right side shows dark dust cloud beginning to fragment and collapse into dense clumps. ' +
          'Arrows indicate compression direction. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "supernova shockwave", "molecular cloud", "collapsing clumps", "Jeans mass threshold".',
        alt: 'Схема стиску молекулярної хмари ударною хвилею наднової та початок колапсу її окремих фрагментів',
        caption:
          'Ударна хвиля від наднової стискає частину молекулярної хмари понад критичну масу Джинса. ' +
          'Хмара фрагментується: кожен фрагмент починає окремий гравітаційний колапс і зрештою стає протозорею.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Гравітаційний колапс і маса Джинса',
      level: 2,
      paragraphs: [
        'Колапс починається поволі. Хмара масою в тисячі сонячних мас і розміром у десятки світлових років ' +
        'спочатку стискається за мільйони років. Але по мірі ущільнення гравітація зростає, ' +
        'процес пришвидшується — і на певному етапі стає лавиноподібним.',

        'При цьому хмара не колапсує однорідно: вона розпадається на фрагменти, кожен з яких також перевищує масу Джинса. ' +
        'Ці фрагменти, у свою чергу, розпадаються на менші — процес, який фізики називають _ієрархічною фрагментацією_. ' +
        'Саме тому зорі майже ніколи не народжуються поодинці: типова молекулярна хмара ' +
        'породжує цілі _зоряні скупчення_ — від десятків до тисяч молодих зір одночасно.',

        'У кожному фрагменті, що колапсує, газ розігрівається від стиску. Поки хмара прозора для власного теплового випромінювання, ' +
        'це тепло вільно виходить назовні і не гальмує стиснення. ' +
        'Але коли щільність зростає настільки, що хмара стає непрозорою — тепло затримується всередині, ' +
        'тиск різко зростає і колапс уповільнюється. Утворюється перший стабільний об\'єкт: **протозоря**.',
      ],
    },

    {
      diagram: {
        title: 'Стадії колапсу молекулярної хмари і формування зорі',
        svg: `<svg viewBox="0 0 720 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="300" fill="rgba(10,15,25,0.6)" rx="4"/>

  <defs>
    <marker id="sfArr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>

  <!-- Stage 1: Molecular Cloud -->
  <ellipse cx="72" cy="150" rx="58" ry="44" fill="rgba(40,30,60,0.7)" stroke="#446688" stroke-width="1.2" stroke-dasharray="4,3"/>
  <text x="72" y="146" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Молекулярна</text>
  <text x="72" y="158" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">хмара</text>
  <text x="72" y="205" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~10 K, ~10 LY</text>

  <!-- Arrow 1 -->
  <line x1="132" y1="150" x2="164" y2="150" stroke="#667788" stroke-width="1.2" marker-end="url(#sfArr)"/>
  <text x="148" y="143" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">поштовх</text>

  <!-- Stage 2: Fragmentation -->
  <ellipse cx="210" cy="150" rx="38" ry="30" fill="rgba(40,30,60,0.85)" stroke="#446688" stroke-width="1"/>
  <circle cx="198" cy="143" r="8" fill="rgba(60,50,90,0.9)" stroke="#7bb8ff" stroke-width="0.8"/>
  <circle cx="218" cy="158" r="6" fill="rgba(60,50,90,0.9)" stroke="#7bb8ff" stroke-width="0.8"/>
  <circle cx="204" cy="163" r="5" fill="rgba(60,50,90,0.9)" stroke="#7bb8ff" stroke-width="0.8"/>
  <text x="210" y="196" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">фрагментація</text>

  <!-- Arrow 2 -->
  <line x1="250" y1="150" x2="282" y2="150" stroke="#667788" stroke-width="1.2" marker-end="url(#sfArr)"/>
  <text x="266" y="143" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">колапс</text>

  <!-- Stage 3: Protostar + disk -->
  <ellipse cx="340" cy="158" rx="34" ry="10" fill="rgba(80,50,20,0.5)" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <circle cx="340" cy="150" r="14" fill="#cc7722" stroke="#ffaa44" stroke-width="1.5"/>
  <text x="340" y="146" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Прото-</text>
  <text x="340" y="156" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">зоря</text>
  <!-- Jets -->
  <line x1="340" y1="136" x2="340" y2="102" stroke="#7bb8ff" stroke-width="2" opacity="0.8"/>
  <line x1="340" y1="164" x2="340" y2="198" stroke="#7bb8ff" stroke-width="2" opacity="0.8"/>
  <text x="356" y="108" fill="#7bb8ff" font-family="monospace" font-size="8">джет</text>
  <text x="356" y="196" fill="#7bb8ff" font-family="monospace" font-size="8">джет</text>
  <text x="340" y="218" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~1000 K, T Tauri</text>

  <!-- Arrow 3 -->
  <line x1="376" y1="150" x2="408" y2="150" stroke="#667788" stroke-width="1.2" marker-end="url(#sfArr)"/>
  <text x="392" y="143" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">акреція</text>

  <!-- Stage 4: Young star on main sequence -->
  <circle cx="460" cy="150" r="22" fill="#ffdd66" stroke="#ffd050" stroke-width="1.5"/>
  <text x="460" y="146" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Молода</text>
  <text x="460" y="156" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">зоря</text>
  <text x="460" y="186" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">термоядерний</text>
  <text x="460" y="196" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">синтез</text>

  <!-- Arrow 4 -->
  <line x1="484" y1="150" x2="516" y2="150" stroke="#667788" stroke-width="1.2" marker-end="url(#sfArr)"/>
  <text x="500" y="143" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">млн років</text>

  <!-- Stage 5: Planetary system -->
  <circle cx="580" cy="150" r="16" fill="#ffee88" stroke="#ffd050" stroke-width="1.5"/>
  <ellipse cx="580" cy="150" rx="46" ry="12" fill="none" stroke="#4488aa" stroke-width="1" opacity="0.6"/>
  <circle cx="612" cy="146" r="3" fill="#7bb8ff" opacity="0.9"/>
  <circle cx="548" cy="154" r="2" fill="#44ff88" opacity="0.9"/>
  <text x="580" y="178" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">планетна система</text>

  <!-- Time axis label -->
  <text x="360" y="290" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">— — — — — Час (від тисяч до мільйонів років) — — — — —</text>
</svg>`,
        caption:
          'Від молекулярної хмари до планетної системи — послідовність стадій, кожна з яких займає від тисяч до мільйонів років. ' +
          'Протозоря з джетами і акреційним диском — ключовий "переломний" момент: ' +
          'диск або акретується зорею, або стає матеріалом для планет.',
      },
    },

    {
      heading: 'Протозоря: перші кроки',
      level: 2,
      paragraphs: [
        'Протозоря — це ще не зоря у повному сенсі. Вона гаряча, але термоядерний синтез у ній ще не запалився. ' +
        'Її єдине джерело енергії — **гравітаційне стиснення**: матерія, що падає до центру, перетворює кінетичну енергію на тепло. ' +
        'Цей механізм відомий як _механізм Кельвіна-Гельмгольца_ — на честь двох фізиків XIX століття, ' +
        'які вперше розрахували, скільки тепла могло би виділити Сонце лише від стиснення.',

        'Навколо протозорі формується **акреційний диск** — плаский обертовий хмаровий об\'єкт із газу і пилу. ' +
        'Матерія падає не прямо на зорю, а спочатку в диск — ' +
        'бо збереження моменту імпульсу змушує газ обертатись все швидше по мірі наближення до центру, ' +
        'як фігурист, що притискає руки. З диска речовина поступово "сповзає" на зорю через в\'язкість і магнітні нестабільності.',

        'Фаза активної акреції триває від кількох сотень тисяч до кількох мільйонів років. ' +
        'Протягом неї протозоря отримує більшу частину своєї фінальної маси. ' +
        'Від того, скільки речовини в диску і чи є поряд конкуруючі протозорі, залежить, ' +
        'чи стане об\'єкт повноцінною зорею, коричневим карликом або взагалі планетою-гігантом без зорі.',
      ],
    },

    {
      image: {
        cacheKey: 'star-formation-accretion-disk',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a young protostar surrounded by a flared protoplanetary accretion disk. ' +
          'The central protostar glows in warm amber-orange. The disk shows concentric dust rings and gaps caused by forming planetesimals. ' +
          'Bipolar jets of ionized plasma extend above and below the disk poles in electric blue-white. ' +
          'The outer disk fades from warm orange dust near the star to cold dark reddish-brown at the edges. Deep black space background. ' +
          'Hard sci-fi style scientific illustration. ' +
          'Add the following text labels on the image: "protostar", "accretion disk", "dust ring", "bipolar jet", "snow line".',
        alt: 'Протозоря в центрі протопланетного акреційного диска з кільцями пилу і двополярними джетами',
        caption:
          'Акреційний диск навколо протозорі — одночасно "паливний бак" для самої зорі і заготовка для майбутніх планет. ' +
          'ALMA у 2014 році вперше показала кільцеву структуру диска HL Tauri — набагато молодшу і структурнішу, ' +
          'ніж очікувала теорія того часу.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Фаза T Tauri і двополярні джети',
      level: 2,
      paragraphs: [
        'Коли протозоря стає достатньо гарячою і відкривається від оточуючого газу, ' +
        'вона входить у так звану _фазу T Tauri_ — названу за типовою молодою зорею у сузір\'ї Тельця. ' +
        'Це бурхливий підлітковий вік зорі: вона вже майже повноцінна, але ще не запалила стабільне ядерне горіння.',

        'T Tauri зорі мають надзвичайно активне магнітне поле. Силові лінії поля "підхоплюють" акретований газ ' +
        'і частково направляють його не на поверхню зорі, а вздовж магнітних полюсів — ' +
        'назовні, у вигляді вузьких **двополярних джетів** із іонізованого газу. ' +
        'Ці струмені можуть тягнутися на відстань у кілька світлових років і несуть величезний момент імпульсу. ' +
        'Джети — своєрідний "клапан", через який зоря скидає надлишковий момент імпульсу, не зупиняючи акрецію.',

        'Коли такий джет врізається в навколишній газ і пил — виникають яскраві структури, ' +
        'що їх астроном Джордж Герніг і мексиканець Гільєрмо Аро спостерігали і описали в середині XX століття. ' +
        'На їхню честь ці об\'єкти називають **об\'єктами Герніга-Аро**. ' +
        'Хаббл в 1990-х роках вперше показав HH-30 у деталях: точний симетричний диск і два джети, ' +
        'що б\'ють з нього під прямим кутом — підтвердження теорії, яка тоді ще була дискусійною.',
      ],
    },

    {
      image: {
        cacheKey: 'star-formation-herbig-haro',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a Herbig-Haro object — a young protostar with narrow bipolar jets hitting surrounding interstellar gas. ' +
          'The jets appear as bright, narrow collimated streams of glowing plasma in blue-white. ' +
          'Where the jets strike the surrounding nebula they create bow-shaped shock regions in yellow-orange. ' +
          'The protostar itself is partially hidden behind an edge-on accretion disk silhouetted against the bright background nebula. ' +
          'Hard sci-fi style, dramatic dark nebula background. ' +
          'Add the following text labels on the image: "protostar", "accretion disk (edge-on)", "bipolar jet", "Herbig-Haro bow shock".',
        alt: 'Об\'єкт Герніга-Аро — протозоря з двома вузькими джетами, що врізаються в навколишній газ і утворюють дугові ударні хвилі',
        caption:
          'Хаббл у 1990-х роках вперше отримав детальні знімки об\'єктів Герніга-Аро, ' +
          'зокрема HH-30 — класичну систему з диском і симетричними джетами. ' +
          'JWST дозволяє бачити такі об\'єкти навіть крізь непрозорі пилові хмари.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'HL Tauri і диски, яких не чекали',
      level: 2,
      paragraphs: [
        'У 2014 році радіотелескопна мережа ALMA отримала знімок протопланетного диска навколо зорі HL Tauri — ' +
        'молодої T Tauri зорі у хмарах Тельця. Знімок справив сенсацію: ' +
        'диск навколо зорі молодшої за мільйон років вже показував чіткі _концентричні кільця і щілини_ — ' +
        'сигнатури планет, що вже формуються і "прибирають" речовину зі своїх орбіт.',

        'До цього вважалося, що формування планет займає десятки мільйонів років і починається лише після того, як диск осяде. ' +
        'HL Tauri змусив переглянути всю хронологію планетоутворення: ' +
        'виявляється, процес набагато швидший і починається практично одразу після виникнення диска.',

        'Цей знімок — одне з найважливіших астрофізичних зображень першої чверті XXI століття. ' +
        'Він перетворив теорію формування планетних систем із загальної схеми ' +
        'на точну науку з конкретними кінетичними вимірами.',
      ],
    },

    {
      image: {
        cacheKey: 'star-formation-hl-tau-disk',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the HL Tauri protoplanetary disk seen face-on, in ALMA radio telescope style. ' +
          'The disk shows multiple concentric bright rings of dust alternating with dark gaps cleared by forming planets. ' +
          'Central young star glows softly. Visualization style similar to ALMA false-color radio imaging: warm yellow-orange rings against dark background. ' +
          'Hard sci-fi style scientific illustration. ' +
          'Add the following text labels on the image: "HL Tauri star", "dust ring", "gap cleared by planet", "ALMA 2014".',
        alt: 'Протопланетний диск HL Tauri зі знімку ALMA 2014 року — концентричні кільця і щілини від планет, що формуються',
        caption:
          'Знімок ALMA 2014 року перевернув уявлення про швидкість планетоутворення. ' +
          'Диск навколо зорі молодшої за мільйон років вже має сформовані щілини — ознака планет, що прибирають речовину зі своїх орбіт.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Зоряні ясла: Оріон, Орел, Кіль',
      level: 2,
      paragraphs: [
        'Туманність Оріона — найближче до нас масштабне зоряне ясло: всього близько тисячі чотирьохсот світлових років. ' +
        'Її видно неозброєним оком як розмиту зірку в мечі Оріона. ' +
        'Усередині — молода зоряна асоціація, де тисячі зір народились протягом останніх мільйонів років. ' +
        'Саме там JWST у 2022 році виявив сотні _протопланетних дисків_ у відкритому просторі туманності, ' +
        'багато з яких активно фотоіонізуються потужним ультрафіолетом від масивних O-зір по сусідству.',

        '"**Стовпи Творіння**" у туманності Орел — можливо, найвідоміше зображення в астрономії XX і XXI століть. ' +
        'Хаббл вперше сфотографував їх у 1995 році: три темних колони пилу і газу, ' +
        'пронизані молодими зорями та підсвічені зовнішнім ультрафіолетом. ' +
        'JWST у 2022 році отримав новий знімок цих же стовпів в інфрачервоному діапазоні: ' +
        'крізь непрозорий пил стало видно десятки протозір, приховані раніше від оптичних телескопів.',

        'Туманність Кіля — одне з найактивніших зоряних яслів нашої Галактики. ' +
        'Вона більша за Оріон і масивніша, і саме там народжуються деякі з найвагоміших зір, відомих нам. ' +
        'JWST показав її "Космічні скелі" — витоки і вежі іонізованого газу, ' +
        'де вздовж кожного виступу ховаються молоді зорі на різних стадіях формування.',
      ],
    },

    {
      image: {
        cacheKey: 'star-formation-pillars-of-creation',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Pillars of Creation in JWST infrared style. ' +
          'Three towering dark dust columns against a vivid nebula background. ' +
          'The columns have glowing amber-orange illuminated edges from external ultraviolet radiation. ' +
          'Embedded protostars visible as bright points within the pillars. Background nebula glows in deep teal and purple. ' +
          'Infrared false-color scientific image aesthetic, hard sci-fi style. ' +
          'Add the following text labels on the image: "Pillar of Creation", "embedded protostar", "photoevaporation front", "Eagle Nebula".',
        alt: 'Стовпи Творіння у туманності Орел — темні пилові колони з вбудованими протозорями, знімок у стилі JWST',
        caption:
          '"Стовпи Творіння" — іконічне зображення зоряного народження. ' +
          'JWST у 2022 році вперше показав їх у ближньому інфрачервоному діапазоні, ' +
          'розкривши десятки протозір, прихованих пилом від попередніх спостережень.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'JWST і нова ера зоряного народження',
      level: 2,
      paragraphs: [
        'Запущений у 2021 році Космічний телескоп Джеймса Вебба відкрив нову еру в дослідженні зореутворення. ' +
        'Його _інфрачервоні_ інструменти проникають крізь пилові завіси молекулярних хмар, ' +
        'де оптичні телескопи бачать лише темряву. JWST бачить теплове випромінювання протозір, ' +
        'навіть якщо вони повністю поховані в коконах пилу — ще до того, як запалять своє ядерне горіння.',

        'Знімки хмари Хамелеон, яслів Оріона і "Космічних скель" у туманності Кіля ' +
        'містять сотні нових кандидатів у молоді зоряні об\'єкти, невідомих до 2022 року. ' +
        'JWST також виявляє, що багато акреційних дисків містять молекули _вуглекислого газу, води і метану_ — ' +
        'органічну хімію, яка формується одночасно з планетами і може мати значення для походження речовини, ' +
        'з якої зрештою складається і саме життя.',

        'На ширшому горизонті — JWST дозволяє вивчати зореутворення у галактиках ранньої Всесвіту, ' +
        'коли процес відбувався в умовах, кардинально відмінних від сучасних: ' +
        'без важких елементів, з більшою кількістю газу, в значно щільніших хмарах. ' +
        'Перші зорі Всесвіту — зорі Популяції III — повинні були бути надмасивними ' +
        'і прожили лише мільйони років. JWST ще не бачив їх прямо, але вже фіксує їхні хімічні сліди ' +
        'у спектрах найдавніших галактик, відомих людству.',
      ],
    },

    {
      image: {
        cacheKey: 'star-formation-jwst-carina-cliffs',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Cosmic Cliffs of the Carina Nebula in JWST style. ' +
          'Dramatic towering structures of glowing gas and dark dust. ' +
          'The top edge of the nebula glows in golden-orange where ultraviolet radiation carves away the cloud. ' +
          'Dozens of bright young stellar objects embedded in the cliff faces and surrounding nebulosity. ' +
          'Background shows a deep teal-purple ionized gas region. Infrared false-color scientific aesthetic. ' +
          'Add the following text labels on the image: "Cosmic Cliffs", "young stellar objects", "photoionized edge", "Carina Nebula JWST 2022".',
        alt: 'Космічні скелі туманності Кіль у стилі JWST — газові вежі з молодими зірками і фотоіонізованими краями',
        caption:
          '"Космічні скелі" у туманності Кіль — один із перших знімків JWST у 2022 році. ' +
          'Видно десятки молодих зоряних об\'єктів, раніше прихованих пилом, ' +
          'і чіткий фотоіонізований край, де ультрафіолет від масивних зір "з\'їдає" хмару.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Від диска до планетної системи',
      level: 2,
      paragraphs: [
        'Акреційний диск — не лише "живлення" для зорі. ' +
        'Це заготовка для всього, що виникне поряд. ' +
        'По мірі того, як зоря розгоряється, її ультрафіолет і зоряний вітер починають розсіювати зовнішні шари диска. ' +
        'Водночас у самому диску відбувається _коагуляція пилу_: зерна стикаються і злипаються в більші агрегати, ' +
        'від мікронів до сантиметрів, від сантиметрів до метрів — і так до розмірів планетезімалей.',

        'Там, де температура диска падає нижче точки замерзання води — цю межу називають _снігова лінія_ — ' +
        'речовина конденсується у кристали льоду, що значно полегшує злипання. ' +
        'Зовні снігової лінії формуються газові й льодяні гіганти; всередині, де матерія бідніша на летючі, — ' +
        'кам\'янисті планети. Ця ж геометрія відтворюється і в нашій Сонячній системі.',

        'Диски живуть від кількох мільйонів до близько десяти мільйонів років, поки зоряний вітер ' +
        'і фотоіонізація не "здмухнуть" залишки газу. ' +
        'Що залишається після — вже кілька планет, безліч астероїдів і комет, і зоря на головній послідовності, ' +
        'яка нарешті почала стабільно горіти термоядерним вогнем.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Маса Джинса',
      definition:
        'Критична маса фрагмента газової хмари, вище якої гравітаційне самостягання переважає над внутрішнім тиском і хмара починає колапсувати. Залежить від температури і густини хмари. Введена Джеймсом Джинсом на початку XX століття.',
    },
    {
      term: 'Протозоря',
      definition:
        'Об\'єкт, що формується при гравітаційному колапсі фрагмента молекулярної хмари, до початку стабільного термоядерного синтезу водню. Джерело енергії — гравітаційне стиснення (механізм Кельвіна-Гельмгольца). Оточена акреційним диском.',
    },
    {
      term: 'Акреційний диск',
      definition:
        'Плаский обертовий диск із газу і пилу, що оточує протозорю. Матерія надходить до зорі через диск, а не напряму. Збереження моменту імпульсу змушує газ обертатись і формувати дискову структуру замість прямого падіння.',
    },
    {
      term: 'Зоря типу T Tauri',
      definition:
        'Молода зоря, ще не запалила стабільне ядерне горіння, але вже видима в оптичному діапазоні. Характеризується сильним магнітним полем, нерегулярними спалахами, активною акрецією і потужними джетами. Прототип — зоря T Tauri у сузір\'ї Тельця.',
    },
    {
      term: 'Двополярний джет (Herbig-Haro)',
      definition:
        'Вузький колімований потік іонізованого газу, що викидається з полюсів протозорі вздовж осі обертання її магнітного поля. При зіткненні з навколишньою речовиною утворює об\'єкти Герніга-Аро — яскраві дугові ударні хвилі.',
    },
    {
      term: 'Об\'єкт Герніга-Аро',
      definition:
        'Яскрава хмаринка іонізованого газу, що виникає при зіткненні джету молодої зорі з навколозоряним або міжзоряним середовищем. Перші описані Джорджем Гернігом і Гільєрмо Аро в середині XX століття. HH-30 — класичний приклад.',
    },
    {
      term: 'Ієрархічна фрагментація',
      definition:
        'Процес, при якому молекулярна хмара, що колапсує, не стискається в єдиний об\'єкт, а розпадається на більш дрібні фрагменти, кожен з яких перевищує масу Джинса і також колапсує. Пояснює, чому зорі зазвичай народжуються скупченнями.',
    },
    {
      term: 'Снігова лінія',
      definition:
        'Межа в протопланетному диску, де температура падає до рівня, при якому вода та інші леткі речовини конденсуються в тверді кристали. За сніговою лінією формуються газові й льодяні гіганти; в середині неї — кам\'янисті планети.',
    },
    {
      term: 'Планетезімаль',
      definition:
        'Проміжний об\'єкт планетоутворення — тверділе тіло діаметром від кількох метрів до кількох кілометрів, що утворюється в акреційному диску злипанням пилових зерен. З планетезімалей шляхом подальшої акреції формуються прото-планети.',
    },
  ],

  quiz: [
    {
      question: 'Що таке "маса Джинса" і яке її значення для народження зір?',
      options: [
        'Максимальна маса, яку може мати зоря головної послідовності',
        'Критична маса хмари, вище якої гравітація переважає над тиском і починається колапс',
        'Маса газу, яку протозоря акретує з диска за мільйон років',
        'Мінімальна маса для запалення термоядерного синтезу',
      ],
      correctIndex: 1,
      explanation:
        'Маса Джинса — мінімальна маса фрагмента газової хмари, вище якої гравітаційне стягання перевищує тепловий тиск і хмара починає незворотній колапс. Нижче порогу хмара стабільна. Залежить від температури і густини газу: холодніша і щільніша хмара має нижчий поріг.',
    },
    {
      question: 'Чому молекулярні хмари зазвичай породжують цілі зоряні скупчення, а не одну зорю?',
      options: [
        'Через магнітне поле Галактики, яке розщеплює хмару на рівні частини',
        'Через ієрархічну фрагментацію: хмара розпадається на дрібніші частини, кожна з яких незалежно колапсує',
        'Тому що зоряний вітер від першої протозорі відштовхує газ у сусідні зони',
        'Тому що всі зорі народжуються з однієї протозорі і потім розлітаються',
      ],
      correctIndex: 1,
      explanation:
        'При колапсі молекулярна хмара не стискається в єдиний об\'єкт: вона фрагментується на частини, кожна з яких також перевищує масу Джинса і колапсує окремо. Цей процес ієрархічної фрагментації пояснює, чому зорі народжуються у скупченнях.',
    },
    {
      question: 'Яка подія, отримана у 2014 році, змінила уявлення про хронологію планетоутворення?',
      options: [
        'Знімок JWST хмари Хамелеон з прихованими протозорями',
        'Знімок ALMA протопланетного диска HL Tauri зі структурою кілець і щілин',
        'Виявлення Хабблом об\'єкта Герніга-Аро HH-30',
        'Фотографія туманності Оріона в інфрачервоному діапазоні',
      ],
      correctIndex: 1,
      explanation:
        'У 2014 році радіотелескопна мережа ALMA отримала знімок диска навколо молодої зорі HL Tauri — об\'єкта молодшого за один мільйон років. Диск вже мав чіткі кільця і щілини, що вказують на планети, які формуються. Це спростувало попередню модель, за якою планетоутворення займає десятки мільйонів років.',
    },
    {
      question: 'Для чого протозорі потрібні двополярні джети?',
      options: [
        'Щоб нагрівати акреційний диск і не дати йому охолонути',
        'Для синтезу важких елементів ще до початку термоядерного горіння',
        'Для відведення надлишкового кутового моменту, що не дає акреції зупинитися',
        'Щоб відштовхувати сусідні протозорі і захопити більше газу',
      ],
      correctIndex: 2,
      explanation:
        'Джети відводять надлишковий момент імпульсу від акрецюючої матерії. Без такого механізму момент імпульсу газу, що падає, зупинив би акрецію — зоря не змогла б набирати масу. Джети фактично "розвантажують" систему, дозволяючи речовині надходити на зорю.',
    },
    {
      question: 'Яку роль відіграє "снігова лінія" у формуванні різних типів планет?',
      options: [
        'Вона визначає температуру поверхні майбутньої зорі',
        'Вона є межею, всередині якої утворюються газові гіганти, а зовні — кам\'янисті планети',
        'Зовні неї леткі речовини конденсуються, що сприяє формуванню крупних тіл і газових гігантів',
        'Вона зупиняє поширення джетів і обмежує їхню довжину',
      ],
      correctIndex: 2,
      explanation:
        'За сніговою лінією температура диска опускається нижче точки замерзання води та інших летких речовин. Їхня конденсація різко збільшує кількість твердого матеріалу і полегшує злипання планетезімалей. Тому зовні снігової лінії виростають масивні ядра, здатні захопити водень і гелій і стати газовими або льодяними гігантами.',
    },
  ],

  sources: [
    {
      title: 'McKee C.F., Ostriker E.C. — Theory of Star Formation',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev.astro.45.051806.110602',
      meta: 'Annual Review of Astronomy and Astrophysics, 45, 2007',
    },
    {
      title: 'ALMA Partnership — High Angular Resolution ALMA Observations of HL Tau',
      url: 'https://iopscience.iop.org/article/10.1088/2041-8205/808/1/L3',
      meta: 'ApJL, 808, L3, 2015 — open access',
    },
    {
      title: 'NASA JWST — Cosmic Cliffs in the Carina Nebula (2022)',
      url: 'https://www.nasa.gov/image-feature/goddard/2022/nasa-s-webb-reveals-cosmic-cliffs-in-a-star-forming-region',
      meta: 'NASA Webb press release, July 2022',
    },
    {
      title: 'NASA JWST — Pillars of Creation, NIRCam image (2022)',
      url: 'https://www.nasa.gov/image-feature/goddard/2022/nasa-s-webb-takes-star-forming-pillars-of-creation',
      meta: 'NASA Webb press release, October 2022',
    },
    {
      title: 'Reipurth B., Bally J. — Herbig-Haro Flows: Probes of Early Stellar Evolution',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev.astro.39.1.403',
      meta: 'Annual Review of Astronomy and Astrophysics, 39, 2001',
    },
    {
      title: 'Stapelfeldt K. et al. — HH 30: An Edge-on T Tauri Disk and Jet (Hubble)',
      url: 'https://iopscience.iop.org/article/10.1086/310199',
      meta: 'ApJ Letters, 1998 — first high-resolution Hubble image of HH 30',
    },
    {
      title: 'Carroll B.W., Ostlie D.A. — An Introduction to Modern Astrophysics (2nd ed.)',
      url: 'https://www.pearson.com/en-us/subject-catalog/p/introduction-to-modern-astrophysics-an/P200000006757',
      meta: 'Pearson, 2017 — ch. 12: The Interstellar Medium and Star Formation',
    },
    {
      title: 'Kennicutt R.C., Evans N.J. — Star Formation in the Milky Way and Nearby Galaxies',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev-astro-081811-125610',
      meta: 'Annual Review of Astronomy and Astrophysics, 50, 2012',
    },
    {
      title: 'ESA — ALMA reveals rings and gaps in planet-forming disks',
      url: 'https://www.eso.org/public/news/eso1436/',
      meta: 'ESO/ALMA press release, November 2014',
    },
    {
      title: 'NASA — Star Formation (Science Overview)',
      url: 'https://science.nasa.gov/universe/stars/star-formation/',
      meta: 'NASA Science, updated 2025',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
