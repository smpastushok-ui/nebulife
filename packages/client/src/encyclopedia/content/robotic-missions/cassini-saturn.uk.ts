import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'cassini-saturn',
  language: 'uk',
  section: 'robotic-missions',
  order: 6,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Cassini — епічна місія до Сатурна',
  subtitle: 'Тринадцять років на орбіті, океан під кригою Енцелада і єдина посадка в зовнішній Сонячній системі.',

  hero: {
    cacheKey: 'cassini-saturn-hero',
    prompt:
      'Photorealistic science encyclopedia illustration: the Cassini spacecraft in orbit above Saturn, ' +
      'with the planet\'s iconic ring system filling the background. ' +
      'Cassini shown as a detailed spacecraft bus with large dish antenna, magnetometer boom, and Huygens probe attached. ' +
      'Saturn\'s rings cast a dramatic shadow across the planet\'s northern hemisphere. ' +
      'Saturn\'s hexagonal north polar vortex faintly visible. Hard sci-fi style, dark space background, technically accurate. ' +
      'Add the following text labels on the image: "Cassini orbiter", "Saturn", "ring system", "Huygens probe".',
    alt: 'Апарат Cassini на орбіті Сатурна — планета з кільцями займає весь фон, зонд Huygens помітний на підвіску',
    caption:
      'Cassini провів у системі Сатурна тринадцять років — більше, ніж будь-який інший штучний об\'єкт у зовнішній Сонячній системі. Кожен прохід через систему кілець, кожний проліт повз місяці додавав шари знань, які не вмістяться в жодну окрему статтю.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Є місії, що відповідають на питання. І є місії, що ставлять питання, яких ніхто навіть не передбачав. ' +
        'Cassini-Huygens — це друге. Коли апарат вийшов на орбіту Сатурна у 2004 році, вчені сподівалися побачити ' +
        'класичний газовий гігант із красивими кільцями і кількома льодяними місяцями. ' +
        'Що вони побачили насправді — змінило уявлення про придатність інших світів до життя.',

        'Це була спільна місія трьох космічних агентств: американського Національного управління ' +
        'з аеронавтики і дослідження космічного простору, Європейського космічного агентства і Італійського ' +
        'космічного агентства. Такий союз — не дипломатична формальність. Без європейської платформи ' +
        'зонд Huygens не потрапив би на Titan, без італійських антен не вдалося б підтримувати ' +
        'зв\'язок із Землею на відстані більше мільярда кілометрів. Cassini є прикладом того, ' +
        'що найамбітніші наукові питання вимагають найширшої коаліції.',

        'Апарат стартував у жовтні 1997 року — і це початок однієї з найдовших міжпланетних подорожей, ' +
        'коли-небудь спланованих людиною. До Сатурна немає прямого шляху: гравітації Землі і навіть Сонця ' +
        'недостатньо, щоб закинути апарат настільки далеко. Тому конструктори проклали маршрут ' +
        'через всю внутрішню Сонячну систему — з гравітаційними маневрами біля Венери двічі, ' +
        'потім Землі, потім Юпітера. Кожен проліт використовував притягання планети як рогатку, ' +
        'нарощуючи швидкість без жодного додаткового палива.',
      ],
    },

    {
      diagram: {
        title: 'Міжпланетна траєкторія Cassini: Земля — Венера — Венера — Земля — Юпітер — Сатурн',
        svg: `<svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="420" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="360" y="22" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">Траєкторія Cassini — маневри гравітаційного розгону (1997–2004)</text>

  <!-- Sun -->
  <circle cx="360" cy="210" r="18" fill="#ff8844" opacity="0.9"/>
  <text x="360" y="215" fill="#020510" font-family="monospace" font-size="9" text-anchor="middle" font-weight="bold">Сонце</text>

  <!-- Venus orbit (approx) -->
  <ellipse cx="360" cy="210" rx="90" ry="85" fill="none" stroke="#334455" stroke-width="1" stroke-dasharray="4,5" opacity="0.6"/>
  <!-- Venus -->
  <circle cx="270" cy="210" r="6" fill="#ff8844" opacity="0.7"/>
  <text x="254" y="205" fill="#8899aa" font-family="monospace" font-size="9">Венера</text>

  <!-- Earth orbit (approx) -->
  <ellipse cx="360" cy="210" rx="130" ry="125" fill="none" stroke="#334455" stroke-width="1" stroke-dasharray="4,5" opacity="0.6"/>
  <!-- Earth -->
  <circle cx="360" cy="85" r="7" fill="#4488aa" opacity="0.9"/>
  <text x="365" y="82" fill="#8899aa" font-family="monospace" font-size="9">Земля</text>

  <!-- Jupiter orbit (approx) -->
  <ellipse cx="360" cy="210" rx="220" ry="200" fill="none" stroke="#334455" stroke-width="1" stroke-dasharray="4,5" opacity="0.4"/>
  <!-- Jupiter -->
  <circle cx="140" cy="210" r="10" fill="#ff8844" opacity="0.6"/>
  <text x="100" y="205" fill="#8899aa" font-family="monospace" font-size="9">Юпітер</text>

  <!-- Saturn orbit (approx, partial arc) -->
  <ellipse cx="360" cy="210" rx="320" ry="290" fill="none" stroke="#334455" stroke-width="1" stroke-dasharray="4,5" opacity="0.3"/>
  <!-- Saturn -->
  <circle cx="680" cy="210" r="12" fill="#aabbcc" opacity="0.7"/>
  <ellipse cx="680" cy="210" rx="22" ry="5" fill="none" stroke="#aabbcc" stroke-width="1.5" opacity="0.8"/>
  <text x="660" y="230" fill="#aabbcc" font-family="monospace" font-size="9">Сатурн</text>
  <text x="658" y="242" fill="#667788" font-family="monospace" font-size="8">2004</text>

  <!-- Launch point -->
  <circle cx="360" cy="85" r="4" fill="#44ff88" opacity="0.9"/>
  <text x="365" y="72" fill="#44ff88" font-family="monospace" font-size="8">Старт 1997</text>

  <!-- Trajectory path — approximate VVEJGA -->
  <!-- Earth -> Venus 1 -->
  <path d="M360,85 Q310,170 270,210" fill="none" stroke="#7bb8ff" stroke-width="1.8" opacity="0.8"/>
  <!-- Flyby marker Venus 1 -->
  <circle cx="270" cy="210" r="4" fill="#44ff88" opacity="0.9"/>
  <text x="240" y="228" fill="#44ff88" font-family="monospace" font-size="8">Венера 1</text>
  <text x="240" y="238" fill="#667788" font-family="monospace" font-size="8">1998</text>

  <!-- Venus 1 -> Venus 2 -->
  <path d="M270,210 Q260,310 290,335" fill="none" stroke="#7bb8ff" stroke-width="1.8" opacity="0.8"/>
  <!-- Flyby marker Venus 2 -->
  <circle cx="290" cy="335" r="4" fill="#44ff88" opacity="0.9"/>
  <text x="295" y="348" fill="#44ff88" font-family="monospace" font-size="8">Венера 2  1999</text>

  <!-- Venus 2 -> Earth flyby -->
  <path d="M290,335 Q380,370 405,300" fill="none" stroke="#7bb8ff" stroke-width="1.8" opacity="0.8"/>
  <circle cx="405" cy="300" r="4" fill="#44ff88" opacity="0.9"/>
  <text x="408" y="315" fill="#44ff88" font-family="monospace" font-size="8">Земля 1999</text>

  <!-- Earth -> Jupiter -->
  <path d="M405,300 Q240,310 140,210" fill="none" stroke="#7bb8ff" stroke-width="1.8" opacity="0.8"/>
  <circle cx="140" cy="210" r="4" fill="#44ff88" opacity="0.9"/>
  <text x="80" y="225" fill="#44ff88" font-family="monospace" font-size="8">Юпітер 2000</text>

  <!-- Jupiter -> Saturn -->
  <path d="M140,210 Q350,120 680,210" fill="none" stroke="#7bb8ff" stroke-width="1.8" opacity="0.8"/>
  <circle cx="680" cy="210" r="5" fill="#44ff88" opacity="0.9"/>

  <!-- Legend -->
  <line x1="30" y1="380" x2="60" y2="380" stroke="#7bb8ff" stroke-width="2"/>
  <text x="65" y="384" fill="#8899aa" font-family="monospace" font-size="9">траєкторія Cassini</text>
  <line x1="200" y1="380" x2="230" y2="380" stroke="#334455" stroke-width="1" stroke-dasharray="4,5"/>
  <text x="235" y="384" fill="#667788" font-family="monospace" font-size="9">орбіти планет (схематично)</text>
  <circle cx="400" cy="380" r="4" fill="#44ff88" opacity="0.9"/>
  <text x="408" y="384" fill="#8899aa" font-family="monospace" font-size="9">гравітаційний маневр</text>
</svg>`,
        caption:
          'Маршрут Cassini до Сатурна включав два прольоти Венери, один проліт Землі і один Юпітера. ' +
          'Ця схема "рогатки" — гравітаційний асист — дозволила набрати необхідну швидкість без витрат палива. ' +
          'Загальна відстань, пройдена апаратом від старту до прибуття на орбіту, перевищила три мільярди кілометрів.',
      },
    },

    {
      heading: 'Huygens: єдина посадка у зовнішній Сонячній системі',
      level: 2,
      paragraphs: [
        'Titan — найбільший місяць Сатурна і другий за розміром у всій Сонячній системі. ' +
        'У нього є те, чого немає майже ні в кого: густа азотна атмосфера з тиском на поверхні, ' +
        'порівнянним із земним. Десятиліттями вчені підозрювали, що під помаранчевим туманом ' +
        'сховано щось надзвичайне — але радари і телескопи не могли пробитись крізь непрозорий аерозоль.',

        'У січні 2005 року зонд Huygens відокремився від Cassini і розпочав спуск крізь атмосферу Titan. ' +
        'Це була унікальна подія: вхід у атмосферу далекого місяця, відкриття парашута на висоті ' +
        'приблизно ста п\'ятдесяти кілометрів, майже чотиригодинний дрейф крізь хмари ' +
        'і, нарешті, торкання поверхні. Huygens опинився першим земним апаратом, ' +
        'що приземлився в зовнішній Сонячній системі — і досі залишається єдиним.',

        'Те, що він побачив, перевершило всі сподівання. Поверхня Titan виявилась вкрита темними дюнами ' +
        'з органічних вуглеводнів — складних молекул, що осідають із атмосфери у вигляді своєрідного ' +
        '"органічного снігу". Поруч — округлі камені, відшліфовані не водою, а рідким метаном. ' +
        'Titan має повноцінний кругообіг рідини: метанові хмари, метановий дощ, метанові річки ' +
        'і цілі моря рідкого метану на полюсах. Це аналог гідрологічного циклу Землі — ' +
        'але замість води тут метан при мінус ста сімдесяти градусах Цельсія.',
      ],
    },

    {
      image: {
        cacheKey: 'cassini-huygens-titan-descent',
        prompt:
          'Photorealistic science encyclopedia illustration: the Huygens probe descending through Titan\'s thick orange-brown atmosphere on a parachute. ' +
          'Glimpses of the surface visible below through gaps in haze — dark hydrocarbon dunes and a bright shoreline of a methane lake. ' +
          'The probe is a metallic dish-shaped lander with antennas. ' +
          'Atmosphere is layered in amber and brown tones. Hard sci-fi style, dramatic lighting. ' +
          'Add the following text labels on the image: "Huygens probe", "Titan atmosphere", "hydrocarbon dunes", "methane lake".',
        alt: 'Зонд Huygens спускається крізь помаранчеву атмосферу Titan на парашуті — під хмарами видно темні дюни і берег метанового озера',
        caption:
          'Huygens передавав дані протягом всього спуску і ще понад годину після торкання поверхні. ' +
          'Дані ретранслював Cassini, що пролітав над горизонтом. Коли зв\'язок із зондом урвався — не через відмову, ' +
          'а через те що ретранслятор пішов за горизонт — це був кінець першого й досі єдиного відвідання Titan.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Енцелад: океан під кригою і питання про життя',
      level: 2,
      paragraphs: [
        'Якщо Titan змусив переосмислити хімію, то Енцелад змусив переосмислити астробіологію. ' +
        'До Cassini цей крихітний місяць — його діаметр лише близько п\'ятисот кілометрів — ' +
        'здавався нецікавим шматком криги. Але вже перші прольоти показали неймовірне: ' +
        'з південного полюса Енцелада б\'ють гейзери.',

        'Не просто хмари пари. Реальні гейзери водяного льоду і газу, ' +
        'що піднімаються на тисячі кілометрів у відкритий космос і утворюють ' +
        'одне з кілець Сатурна — кільце E. Щоб збити воду з поверхні крихітного тіла, ' +
        'потрібне джерело тепла. І якщо є тепло — можливо, є рідка вода. ' +
        'Cassini підтвердив це прямим вимірюванням: під льодовою корою Енцелада ' +
        'існує глобальний рідкий океан.',

        'Але найголовніше відкриття — у складі викидів. Прольоти крізь гейзерний шлейф ' +
        'показали водяну пару і водяний лід — і це вже було б сенсацією. ' +
        'Але разом із ними — органічні молекули, сполуки азоту і, найголовніше, ' +
        'молекулярний водень. Молекулярний водень у такому контексті — хімічний підпис ' +
        'гідротермальної активності: реакцій між гарячою водою і скельними породами ' +
        'на дні океану. Це саме те, що відбувається у чорних курцях на дні Землі — ' +
        'і саме там, де на Землі вперше знайшли екосистеми, незалежні від сонячного світла.',
      ],
    },

    {
      image: {
        cacheKey: 'cassini-enceladus-geysers',
        prompt:
          'Photorealistic science encyclopedia illustration: Enceladus moon of Saturn viewed from close range. ' +
          'Dramatic south polar region showing multiple water ice geysers erupting into black space, ' +
          'creating a faint plume cloud. Tiger stripe fractures across the south pole glow faintly with internal heat. ' +
          'Saturn\'s rings visible as a thin line in the background. Hard sci-fi style, dark background, accurate scale. ' +
          'Add the following text labels on the image: "ice geysers", "south pole", "tiger stripes", "subsurface ocean".',
        alt: 'Гейзери водяного льоду на південному полюсі Енцелада — тигрові смуги тріщин світяться теплом підповерхневого океану, струмені б\'ють у відкритий космос',
        caption:
          'Тигрові смуги — чотири паралельні тріщини на південному полюсі Енцелада — є джерелом гейзерів. ' +
          'Через них рідкий океан видавлює воду і пар у космос під тиском внутрішнього тепла. ' +
          'Cassini двадцять три рази пролетів повз Енцелад, кожного разу беручи зразки шлейфу прямо із космосу.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Шістнадцятикутний шторм і кільця як наука',
      level: 2,
      paragraphs: [
        'Сатурн без Cassini — це планета з кільцями і кількома відомими місяцями. ' +
        'Сатурн після Cassini — це цілий світ із власною метеорологією, що не має аналогів у Сонячній системі.',

        'Найвидовищніший приклад — гексагональний вихор на північному полюсі. ' +
        'Правильний шестикутник діаметром більше за Землю, що обертається синхронно з планетою ' +
        'вже, мабуть, протягом десятиліть. Жодна планета в Сонячній системі не демонструє ' +
        'нічого подібного. Природа такої геометрії досі обговорюється: ' +
        'найімовірніше, її формує взаємодія між різними шарами атмосфери з різними швидкостями обертання.',

        'Кільця Сатурна виявились набагато складнішою структурою, ніж будь-хто очікував. ' +
        'Cassini показав, що це динамічна система: крижані частинки від мікроскопічних ' +
        'до розміром із будинок постійно стикаються, злипаються, розлітаються. ' +
        'У кільцях є "пропелери" — хвилеподібні збурення навколо невидимих малих тіл. ' +
        'Є чіткі зазори, що утримуються гравітацією місяців. ' +
        'Є кільця завширшки в кілометри, що простягаються на сотні тисяч кілометрів, ' +
        'але мають товщину не більше кількохсот метрів — тонші відносно свого радіуса, ' +
        'ніж аркуш паперу.',
      ],
    },

    {
      image: {
        cacheKey: 'cassini-saturn-hexagon',
        prompt:
          'Photorealistic science encyclopedia image: Saturn\'s north pole viewed from directly above, ' +
          'showing the dramatic hexagonal storm system. ' +
          'The hexagon is clearly defined, with swirling cloud bands inside and outside the six-sided boundary. ' +
          'Central polar vortex visible. Color palette: golden and amber clouds against deep blue polar region. ' +
          'Hard sci-fi style, top-down polar projection. ' +
          'Add the following text labels on the image: "hexagonal vortex", "polar storm", "north pole", "cloud bands".',
        alt: 'Вигляд з полюса Сатурна зверху: правильний шестикутний вихор з центральним полярним штормом всередині хмарних смуг',
        caption:
          'Гексагональний шторм Сатурна вперше побачили ще апарати Voyager у 1980-х, але Cassini зробив перші детальні знімки. ' +
          'Шестикутник більший за Землю за діаметром і, мабуть, зберігає свою форму вже десятки років. ' +
          'Ідентичної структури не виявлено на жодній іншій планеті.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Сто шістдесят два прольоти і тринадцять років науки',
      level: 2,
      paragraphs: [
        'За тринадцять років на орбіті Cassini здійснив сто шістдесят два прольоти повз Titan ' +
        'і двадцять три прольоти повз Енцелад. Кожен прохід — нові вимірювання, нові знімки, ' +
        'нові зразки середовища. Апарат вивчав магнітосферу Сатурна — гігантський ' +
        'магнітний бульбашок навколо планети, що захищає систему від сонячного вітру. ' +
        'Він спостерігав полярні сяйва, досліджував радіаційні пояси, ' +
        'вимірював склад атмосфери і відстежував штормові системи.',

        'Апарат виявив або уточнив характеристики десятків малих місяців — ' +
        'від крихітних пастухів кілець до Мімаса з гігантським кратером Гершель, ' +
        'що робить його схожим на Зірку Смерті. Кожен місяць виявився ' +
        'унікальним об\'єктом зі своєю геологічною і динамічною історією.',

        'Загалом місія зібрала близько шестисот гігабайт наукових даних і передала на Землю ' +
        'понад чотириста п\'ятдесяти тисяч зображень. За цими даними опубліковано ' +
        'тисячі наукових статей — і нові публікації виходять досі, ' +
        'бо обсяг зібраних матеріалів більший, ніж наукова спільнота встигла повністю осмислити.',
      ],
    },

    {
      image: {
        cacheKey: 'cassini-ring-detail',
        prompt:
          'Photorealistic science encyclopedia image: extreme close-up of Saturn\'s ring system photographed by Cassini. ' +
          'Individual ring bands visible with gaps between them — Cassini Division clearly shown as a dark gap. ' +
          'Fine ringlets and wave patterns within the B ring. ' +
          'A small propeller-shaped disturbance caused by a moonlet embedded in the rings. ' +
          'Hard sci-fi style, high-resolution detail, dark space background. ' +
          'Add the following text labels on the image: "Cassini Division", "B ring", "propeller moonlet", "ringlets".',
        alt: 'Детальний знімок кільцевої системи Сатурна — поділ Кассіні, смуги кілець, дрібні кільця всередині B-кільця і хвиля від малого тіла-пастуха',
        caption:
          'Кільця Сатурна виявились набагато тонкішими, ніж здавалося: при ширині в сотні тисяч кілометрів ' +
          'їхня товщина подекуди становить лічені сотні метрів. ' +
          'Cassini виявив тисячі індивідуальних кілець і пропелерів — збурень від вбудованих малих тіл.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Великий Фінал: 22 занурення і прощання з планетою',
      level: 2,
      paragraphs: [
        'До 2017 року паливо на борту підходило до кінця. ' +
        'Cassini вичерпав своє паливо для маневрів — і команда місії зіткнулась ' +
        'із класичною проблемою дослідження далеких світів: що робити з апаратом, ' +
        'який більше не може керувати своєю орбітою?',

        'Відповідь визначила відкриття самої ж місії. Якщо просто покинути Cassini ' +
        'дрейфувати, рано чи пізно він зіткнеться з Енцеладом або Titan. ' +
        'А на борту — бактерії, органічні молекули, мікроорганізми, що вижили ' +
        'у стерилізованому, але не ідеально чистому апараті. ' +
        'Забруднити Енцелад — потенційно живий світ — земною органікою означало б ' +
        'знищити можливість коли-небудь дізнатись, чи виникло там життя незалежно.',

        'Тому була обрана інша стратегія — Великий Фінал. ' +
        'З квітня по вересень 2017 року Cassini здійснив двадцять два занурення ' +
        'між кільцями і верхніми шарами атмосфери Сатурна — у простір, ' +
        'куди жоден апарат до нього не заходив. ' +
        'Там виявилось набагато менше пилу і частинок, ніж очікувалось. ' +
        'Вимірювання гравітаційних полів дозволили уточнити внутрішню структуру планети ' +
        'і точно розрахувати масу кілець.',
      ],
    },

    {
      diagram: {
        title: 'Великий Фінал: орбіти між кільцями і атмосферою Сатурна (2017)',
        svg: `<svg viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="400" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="360" y="22" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">Великий Фінал — орбіти Cassini між кільцями і Сатурном</text>

  <!-- Saturn body -->
  <ellipse cx="360" cy="200" rx="70" ry="65" fill="#ff8844" opacity="0.25"/>
  <ellipse cx="360" cy="200" rx="70" ry="65" fill="none" stroke="#ff8844" stroke-width="1.5" opacity="0.7"/>
  <text x="360" y="204" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Сатурн</text>

  <!-- D ring (closest) -->
  <ellipse cx="360" cy="200" rx="85" ry="25" fill="none" stroke="#667788" stroke-width="1" opacity="0.6"/>
  <text x="455" y="190" fill="#667788" font-family="monospace" font-size="8">D</text>

  <!-- C ring -->
  <ellipse cx="360" cy="200" rx="110" ry="30" fill="none" stroke="#667788" stroke-width="1" opacity="0.6"/>
  <text x="478" y="193" fill="#667788" font-family="monospace" font-size="8">C</text>

  <!-- B ring -->
  <ellipse cx="360" cy="200" rx="145" ry="38" fill="none" stroke="#8899aa" stroke-width="1.5" opacity="0.7"/>
  <text x="513" y="196" fill="#8899aa" font-family="monospace" font-size="8">B</text>

  <!-- Cassini Division gap -->
  <ellipse cx="360" cy="200" rx="165" ry="44" fill="none" stroke="#334455" stroke-width="2" stroke-dasharray="3,4" opacity="0.5"/>
  <text x="534" y="198" fill="#334455" font-family="monospace" font-size="7">Кассіні</text>

  <!-- A ring -->
  <ellipse cx="360" cy="200" rx="185" ry="50" fill="none" stroke="#8899aa" stroke-width="1.5" opacity="0.7"/>
  <text x="553" y="200" fill="#8899aa" font-family="monospace" font-size="8">A</text>

  <!-- F ring (outer boundary of A) -->
  <ellipse cx="360" cy="200" rx="200" ry="54" fill="none" stroke="#667788" stroke-width="1" opacity="0.5"/>
  <text x="568" y="200" fill="#667788" font-family="monospace" font-size="8">F</text>

  <!-- Grand Finale orbit path — dipping between F and D rings -->
  <!-- One orbit shown as a highly elliptical path through the gap -->
  <path d="M360,136 C490,120 560,200 490,280 C420,360 290,360 220,280 C150,200 220,120 360,136"
        fill="none" stroke="#44ff88" stroke-width="2" opacity="0.85"/>

  <!-- Cassini position marker -->
  <circle cx="360" cy="136" r="5" fill="#44ff88" opacity="1"/>
  <text x="365" y="128" fill="#44ff88" font-family="monospace" font-size="9">Cassini</text>

  <!-- Gap zone annotation -->
  <line x1="360" y1="136" x2="430" y2="80" stroke="#44ff88" stroke-width="0.8" stroke-dasharray="3,4" opacity="0.7"/>
  <text x="432" y="76" fill="#44ff88" font-family="monospace" font-size="9">зазор між F і атмосферою</text>

  <!-- 22 dives label -->
  <text x="360" y="370" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">22 занурення: квітень — вересень 2017</text>
  <text x="360" y="385" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">фінальне занурення в атмосферу: 15 вересня 2017</text>

  <!-- Legend -->
  <line x1="30" y1="360" x2="55" y2="360" stroke="#44ff88" stroke-width="2"/>
  <text x="60" y="364" fill="#8899aa" font-family="monospace" font-size="9">орбіта Великого Фіналу</text>
  <line x1="220" y1="360" x2="245" y2="360" stroke="#8899aa" stroke-width="1.5"/>
  <text x="250" y="364" fill="#667788" font-family="monospace" font-size="9">кільця Сатурна</text>
</svg>`,
        caption:
          'Під час Великого Фіналу Cassini проходив у зазорі між найвнутрішнім кільцем D і верхніми шарами атмосфери — ' +
          'на відстані близько двох тисяч кілометрів від хмарного верхнього краю. ' +
          'Жоден апарат до нього не зазнавав таких вимірювань гравітаційного поля і складу кільцевого матеріалу.',
      },
    },

    {
      heading: 'Фінальне занурення: свідоме рішення',
      level: 2,
      paragraphs: [
        'П\'ятнадцятого вересня 2017 року о восьмій годині ранку за тихоокеанським часом ' +
        'Cassini ввійшов у верхні шари атмосфери Сатурна. ' +
        'Апарат намагався стабілізувати орбіту двигунами до останнього — ' +
        'це дозволило передавати наукові дані аж до моменту, коли аеродинамічні сили ' +
        'перевернули його остаточно. Загальний час від початку входу в атмосферу ' +
        'до повного руйнування апарата — менше хвилини. ' +
        'До Землі сигнал летів понад годину і двадцять хвилин, тому подія ' +
        'фактично вже відбулась, коли оператори лабораторії реактивного руху ' +
        'отримали останній пакет даних.',

        'Це рішення — навмисне знищення апарата — стало одним із найбільш обговорюваних ' +
        'у дискусіях про планетарний захист. Протокол захисту планет вимагає, ' +
        'щоб апарати не залишали потенційно заражених залишків на тілах, ' +
        'де теоретично може існувати або виникнути життя. ' +
        'Cassini відповідав цьому критерію: знищений в атмосфері планети, ' +
        'без можливості забруднити Енцелад чи Titan.',

        'Але поза технічним аспектом фінал Cassini набув символічного значення. ' +
        'Апарат, що відкрив океан під кригою місяця, ' +
        'що передав першу посадку на Titan, що показав гейзери Енцелада — ' +
        'закінчив своє існування, ставши частиною тієї самої планети, ' +
        'вивченню якої присвятив тринадцять років.',
      ],
    },

    {
      image: {
        cacheKey: 'cassini-final-plunge',
        prompt:
          'Photorealistic science encyclopedia illustration: artistic reconstruction of the Cassini spacecraft entering Saturn\'s atmosphere. ' +
          'The spacecraft is partially ablated and glowing red-orange from atmospheric entry heating. ' +
          'Saturn\'s cloud bands and ring system visible behind. ' +
          'Cassini shown tumbling slightly, antenna still transmitting signal shown as a faint radio wave graphic. ' +
          'Hard sci-fi style, dramatic lighting, emotionally resonant but scientifically grounded. ' +
          'Add the following text labels on the image: "final transmission", "atmospheric entry", "Saturn clouds", "September 15 2017".',
        alt: 'Художня реконструкція занурення Cassini в атмосферу Сатурна — апарат охоплений плазмою входу, за ним видно хмарні пояси і кільця планети',
        caption:
          'Під час фінального занурення Cassini продовжував вимірювати склад атмосфери і передавати дані ' +
          'до останньої секунди стабільного сигналу. Апарат не просто знищили — він зібрав наукові дані ' +
          'під час власного знищення. Такий підхід зараз вважається зразком для інших місій до потенційно придатних для життя світів.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Спадщина і наступники',
      level: 2,
      paragraphs: [
        'Cassini поставив питання, на які ще немає відповідей. ' +
        'Чи є в океані Енцелада умови, достатні для виникнення мікробного життя? ' +
        'Якщо гідротермальна активність справді існує на дні — це одночасно ' +
        'і джерело енергії, і хімічне середовище, аналогічне тому, ' +
        'де на Землі, можливо, зародилось саме перше життя.',

        'Серед концепцій, що розглядаються як наступники Cassini, виокремлюються два напрямки. ' +
        'Перший — орбітальний апарат і посадковий модуль для Енцелада, ' +
        'концепція якого під назвою Enceladus Orbilander розроблялась у рамках пріоритетів ' +
        'планетарної науки на наступне десятиліття. Апарат зміг би не просто пролетіти крізь шлейф, ' +
        'а зупинитись на орбіті і детально проаналізувати матеріал гейзерів ' +
        'в пошуках біосигнатур.',

        'Другий напрямок — Dragonfly, ротокрафт для Titan. ' +
        'Апарат схожий на великий дрон, здатний літати в густій атмосфері Titan, ' +
        'переміщуватись між різними місцями і брати зразки органічного матеріалу. ' +
        'За поточними планами Dragonfly має вирушити до системи Сатурна в середині 2020-х ' +
        'і досягти Titan близько 2034 року. Це буде перший апарат, ' +
        'що досліджує Titan не крізь хмари, а безпосередньо з поверхні і повітря.',

        'Але ще до прильоту будь-якого наступника — дані Cassini продовжують роботу. ' +
        'Тисячі вчених у всьому світі аналізують терабайти знімків, спектрів і вимірювань, ' +
        'знаходячи нові структури в кільцях, нові деталі хімії Titan і нові підказки ' +
        'про природу глибинного океану Енцелада. ' +
        'Місія, що завершилась фізично, продовжується інтелектуально.',
      ],
    },

    {
      image: {
        cacheKey: 'cassini-dragonfly-titan',
        prompt:
          'Photorealistic science encyclopedia concept illustration: the Dragonfly rotorcraft flying low over Titan\'s surface. ' +
          'The landscape shows dark hydrocarbon dunes stretching to the horizon, with methane puddles reflecting amber sky. ' +
          'Dragonfly is a multi-rotor drone-like spacecraft with scientific instruments visible. ' +
          'Titan\'s thick orange-brown atmosphere creates a hazy diffused light. ' +
          'Hard sci-fi style, photorealistic, technically accurate spacecraft design. ' +
          'Add the following text labels on the image: "Dragonfly rotorcraft", "hydrocarbon dunes", "Titan surface", "methane puddles".',
        alt: 'Концепт ротокрафта Dragonfly, що летить над поверхнею Titan — темні вуглеводневі дюни під помаранчевим небом, метанові калюжі відображають розсіяне світло',
        caption:
          'Dragonfly — наступник Cassini для Titan. На відміну від Huygens, що мав єдиний шанс торкнутись поверхні, ' +
          'Dragonfly зможе переміщуватись між точками на десятки кілометрів, збираючи зразки в різних геологічних контекстах. ' +
          'Прибуття заплановано приблизно на 2034 рік.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Гравітаційний асист',
      definition:
        'Маневр, при якому космічний апарат пролітає поруч із планетою і використовує її гравітацію для зміни швидкості та напрямку. Дозволяє суттєво збільшити швидкість без витрат палива. Cassini використав чотири таких маневри на шляху до Сатурна.',
    },
    {
      term: 'Шлейф гейзера',
      definition:
        'Стовп газу, льоду і дрібних частинок, що викидається з Енцелада крізь тріщини в льодовій корі. Cassini пролітав безпосередньо крізь шлейф і аналізував його хімічний склад.',
    },
    {
      term: 'Молекулярний водень',
      definition:
        'Хімічна сполука H2, виявлена в гейзерному шлейфі Енцелада. Її присутність вказує на гідротермальну активність — реакції між гарячою водою і гірськими породами на дні підлідного океану. На Землі такі середовища є притулком для мікроорганізмів.',
    },
    {
      term: 'Гідротермальна активність',
      definition:
        'Геологічне явище, при якому вода нагрівається всередині планетного тіла і вступає в хімічні реакції з гірськими породами. На Землі гідротермальні джерела на дні океану підтримують екосистеми без сонячного світла. На Енцеладі Cassini виявив її хімічні сліди.',
    },
    {
      term: 'Планетарний захист',
      definition:
        'Галузь практики і протоколів, спрямована на запобігання забруднення інших планет і місяців земними мікроорганізмами (і навпаки). Саме вимоги планетарного захисту зумовили рішення навмисно занурити Cassini в атмосферу Сатурна.',
    },
    {
      term: 'Гексагональний вихор',
      definition:
        'Правильна шестикутна атмосферна структура на північному полюсі Сатурна діаметром понад двадцять п\'ять тисяч кілометрів. Стабільно утримує форму десятиліттями. Не має аналогів на інших планетах.',
    },
    {
      term: 'Великий Фінал',
      definition:
        'Фінальний етап місії Cassini (2017): серія з двадцяти двох орбіт між кільцями і атмосферою Сатурна, що завершилась навмисним входом в атмосферу. Проводились вимірювання гравітаційного поля, магнітосфери і хімічного складу верхніх шарів.',
    },
    {
      term: 'Кільцеве кільце E',
      definition:
        'Найширше і найрозріджене кільце Сатурна, що підживлюється матеріалом гейзерів Енцелада. Cassini встановив прямий зв\'язок між гейзерною активністю місяця і хімічним складом цього кільця.',
    },
    {
      term: 'Тигрові смуги',
      definition:
        'Чотири паралельні тріщини завдовжки близько ста тридцяти кілометрів кожна на південному полюсі Енцелада, крізь які б\'ють гейзери. Відрізняються підвищеним тепловим потоком відносно навколишньої поверхні.',
    },
  ],

  quiz: [
    {
      question: 'Чому Cassini летів до Сатурна через Венеру, Землю і Юпітер, а не прямо?',
      options: [
        'Бо Сатурн тоді знаходився за Юпітером і прямий шлях був заблокований',
        'Бо ракета-носій мала недостатньо потужності для прямого польоту — гравітаційні маневри нарощували швидкість без витрат палива',
        'Бо апарат мав провести вимірювання на цих планетах як основні цілі місії',
        'Бо прямий шлях до Сатурна займає більше часу через форму орбіти Землі',
      ],
      correctIndex: 1,
      explanation:
        'Для виходу на орбіту Сатурна потрібна величезна швидкість. Ракета-носій не могла надати її безпосередньо. Гравітаційні маневри — прольоти поруч із планетами — дозволили "позичити" частину кінетичної енергії планет. Кожен асист додавав швидкість без витрат пального на борту.',
    },
    {
      question: 'Що зробило відкриття гейзерів Енцелада астробіологічно важливим?',
      options: [
        'Гейзери показали, що Енцелад має атмосферу, придатну для дихання',
        'У шлейфі гейзерів виявили молекулярний водень — ознаку гідротермальної активності і потенційного джерела енергії для мікроорганізмів',
        'Гейзери складаються з рідкого метану, що свідчить про теплу поверхню',
        'Відкриття підтвердило, що Енцелад раніше мав густу атмосферу',
      ],
      correctIndex: 1,
      explanation:
        'Молекулярний водень у шлейфі Енцелада — хімічний підпис реакцій між гарячою водою і гірськими породами (гідротермальна активність). На Землі саме такі умови підтримують мікробне життя на дні океанів без сонячного світла. Це зробило Енцелад одним із найбільш перспективних місць для пошуку позаземного мікробного життя.',
    },
    {
      question: 'Чому Cassini навмисно занурили в атмосферу Сатурна, а не залишили на орбіті?',
      options: [
        'Щоб зібрати дані про склад атмосфери — це була основна наукова мета',
        'Паливо закінчилось і апарат сам почав некерований спуск',
        'Щоб запобігти можливому зіткненню з Енцеладом або Titan і забруднення їх земними мікроорганізмами',
        'Щоб звільнити орбіту для наступного апарата',
      ],
      correctIndex: 2,
      explanation:
        'Протоколи планетарного захисту забороняють залишати апарати з потенційними земними мікроорганізмами поруч із тілами, де може існувати життя. Енцелад і Titan — саме такі тіла. Навмисне занурення в атмосферу Сатурна гарантувало повне знищення апарата без ризику забруднення цих місяців.',
    },
    {
      question: 'Що таке "Великий Фінал" місії Cassini?',
      options: [
        'Остання серія знімків кілець Сатурна перед вимкненням камер',
        'Серія з двадцяти двох орбіт між кільцями і атмосферою Сатурна — у зоні, куди раніше не заходив жоден апарат',
        'Спільна конференція трьох агентств після завершення місії',
        'Фінальний проліт повз Енцелад із зануренням у гейзерний шлейф',
      ],
      correctIndex: 1,
      explanation:
        'Великий Фінал — двадцять два орбітальних занурення між внутрішнім краєм кільця D і верхніми шарами атмосфери Сатурна. Тут вимірювалось гравітаційне поле з точністю, недосяжною з зовнішньої орбіти, а також досліджувались склад кілець і магнітне поле. Фінальний прохід завершився входом в атмосферу.',
    },
    {
      question: 'Яка унікальна особливість місяця Titan зробила його головною ціллю зонда Huygens?',
      options: [
        'Titan є єдиним місяцем у Сонячній системі з рідким водяним океаном на поверхні',
        'Titan має густу азотну атмосферу і кругообіг рідини — єдиний аналог гідрологічного циклу поза Землею',
        'Titan розташований найближче до Сатурна і тому найлегше досяжний',
        'На Titan вже виявляли сигнали, що могли свідчити про технологічну цивілізацію',
      ],
      correctIndex: 1,
      explanation:
        'Titan — єдине відоме тіло у Сонячній системі, окрім Землі, з кругообігом рідини на поверхні. Замість водного циклу тут метановий: метанові хмари, дощ, річки і моря. Густа азотна атмосфера і складна органічна хімія зробили Titan ключовою ціллю для вивчення пребіотичних процесів.',
    },
  ],

  sources: [
    {
      title: 'NASA — Cassini Mission Overview',
      url: 'https://solarsystem.nasa.gov/missions/cassini/overview/',
      meta: 'NASA Solar System Exploration, відкритий доступ',
    },
    {
      title: 'Waite J. H. et al. — Cassini finds molecular hydrogen in the Enceladus plume (2017)',
      url: 'https://www.science.org/doi/10.1126/science.aai8703',
      meta: 'Science, 2017, doi:10.1126/science.aai8703',
    },
    {
      title: 'Porco C. C. et al. — Cassini Observes the Active South Pole of Enceladus (2006)',
      url: 'https://www.science.org/doi/10.1126/science.1123013',
      meta: 'Science, 2006, doi:10.1126/science.1123013',
    },
    {
      title: 'Tobie G. et al. — Titan\'s internal structure inferred from a coupled thermal-orbital model (2006)',
      url: 'https://www.nature.com/articles/nature04943',
      meta: 'Nature, 2006',
    },
    {
      title: 'ESA — Huygens mission to Titan',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Cassini-Huygens/Huygens_mission_to_Titan',
      meta: 'ESA Science, відкритий доступ',
    },
    {
      title: 'NASA JPL — Cassini Grand Finale Science',
      url: 'https://www.jpl.nasa.gov/news/cassini-grand-finale-science',
      meta: 'JPL, 2017, відкритий доступ',
    },
    {
      title: 'Iess L. et al. — Measurement and implications of Saturn\'s gravity field and ring mass (2019)',
      url: 'https://www.science.org/doi/10.1126/science.aat2965',
      meta: 'Science, 2019 — результати Великого Фіналу',
    },
    {
      title: 'NASA — Dragonfly Mission to Titan',
      url: 'https://dragonfly.jhuapl.edu/',
      meta: 'Johns Hopkins APL / NASA, оновлено 2024',
    },
    {
      title: 'National Academies — Origins, Worlds, and Life: Planetary Science Decadal Survey 2023–2032',
      url: 'https://www.nationalacademies.org/our-work/planetary-science-and-astrobiology-decadal-survey-2023-2032',
      meta: 'National Academies Press, 2022 — рекомендації з Enceladus Orbilander',
    },
    {
      title: 'Brown M. E. et al. — The identification of water ice and chemical composition of Titan (2011)',
      url: 'https://doi.org/10.1016/j.icarus.2011.02.015',
      meta: 'Icarus, 2011',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
