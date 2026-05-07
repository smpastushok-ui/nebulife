import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'dawn-asteroids',
  language: 'uk',
  section: 'robotic-missions',
  order: 10,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Dawn — два астероїди в одній місії',
  subtitle: 'Єдиний космічний апарат, що вийшов на орбіту двох різних тіл Сонячної системи поспіль, зробив це завдяки іонним двигунам.',

  hero: {
    cacheKey: 'dawn-asteroids-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Dawn spacecraft in deep space between two asteroid belt bodies. ' +
      'The spacecraft has large solar panel wings and a cylindrical body with three blue ion thruster exhaust plumes glowing faintly. ' +
      'In the background, left side shows the battered rocky surface of Vesta with a massive crater rim; right side shows the grey rounded dwarf planet Ceres with bright white spots in a crater. ' +
      'Hard sci-fi style, dark space background, dramatic lighting, technically accurate geometry. ' +
      'Add the following text labels on the image: "Dawn spacecraft", "Vesta", "Ceres", "ion propulsion".',
    alt: 'Космічний апарат Dawn між астероїдом Веста та карликовою планетою Церера — іонні двигуни, сонячні панелі',
    caption:
      'Апарат Dawn між двома своїми цілями. Веста — диференційований кам\'яний астероїд з базальтовою поверхнею. Церера — карликова планета з можливим підповерхневим океаном і яскравими соляними відкладеннями. Без іонного рушія перехід між ними з хімічними двигунами вимагав би нереально великого запасу палива.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Є правило, якому підпорядковується майже кожна міжпланетна місія: один апарат — одна ціль. ' +
        'Гравітація не дарує другого шансу. Якщо ви витратили паливо на вихід на орбіту одного тіла, ' +
        'повернутися і злетіти з неї, щоб летіти далі, просто неможливо в рамках реалістичного бюджету палива. ' +
        'Саме тому місія Dawn, запущена у вересні 2007 року, стала виключенням, яке досі залишається єдиним у своєму роді: ' +
        'вона вийшла на орбіту Вести у 2011 році, пропрацювала там понад рік, потім злетіла ' +
        'і вийшла на орбіту Церери у 2015 році. Жоден інший апарат не повторив цього.',

        'Секрет — в іонних двигунах. Не в хімії, не в гравітаційних маневрах, ' +
        'а в принципово іншому способі набору швидкості: повільно, методично, ' +
        'протягом місяців і років, витрачаючи ксенон замість звичного палива. ' +
        'Dawn назбирав сумарну зміну швидкості понад одинадцять кілометрів на секунду — ' +
        'більше, ніж будь-який попередній космічний апарат, що використовував електричне прискорення. ' +
        'Хімічним двигунам таке завдання просто не під силу: масове співвідношення палива було б абсурдним.',

        'Але Dawn — це не лише технологічна демонстрація. Два об\'єкти, які він вивчав, ' +
        'виявилися несподівано різними, хоча і мешкають в одному Поясі астероїдів. ' +
        'Веста нагадує зменшену копію кам\'яної планети. Церера схожа на щось між кометою і крижаним світом. ' +
        'Разом вони розповідають про те, як ранній Юпітер розбив майбутню планету на шматки, ' +
        'і що залишилося з тих шматків через чотири з половиною мільярди років.',
      ],
    },

    {
      image: {
        cacheKey: 'dawn-asteroids-spacecraft-detail',
        prompt:
          'Photorealistic science encyclopedia illustration: detailed view of the Dawn spacecraft in orbit above a rocky asteroid surface. ' +
          'The spacecraft body shows three ion thruster nozzles at the rear glowing blue-violet, two large rectangular solar panels extending symmetrically, ' +
          'and various science instrument booms. The asteroid surface below is grey and heavily cratered. ' +
          'Hard sci-fi style, dark space background, technically accurate engineering detail. ' +
          'Add the following text labels on the image: "ion thrusters (x3)", "solar panels", "science instruments", "Vesta surface".',
        alt: 'Деталізований вигляд апарата Dawn на орбіті Вести — три іонні двигуни, сонячні панелі та наукові прилади',
        caption:
          'Dawn мав три іонних двигуни системи Нестар від Національного агентства з аеронавтики та дослідження космічного простору. ' +
          'Одночасно міг працювати лише один. Сонячні панелі площею близько дванадцяти квадратних метрів живили систему і на відстані Пояса астероїдів давали близько 1,3 кіловата потужності для двигунів.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Іонний рушій: чому він змінив правила гри',
      level: 2,
      paragraphs: [
        'Іонний двигун системи Нестар працює так: ксенон іонізується електронним бомбардуванням, ' +
        'а потім іони прискорюються електричним полем крізь решітки і викидаються зі швидкістю ' +
        'близько тридцяти кілометрів на секунду. Це у п\'ять-десять разів вища швидкість виходу, ' +
        'ніж у хімічних двигунів, а значить — у п\'ять-десять разів вища питома імпульсивність. ' +
        'Для далекого космосу, де час не є критичним обмеженням, це революційна перевага.',

        'Тяга одного двигуна Нестар — близько дев\'яноста мілі-ньютонів. ' +
        'Для порівняння: це приблизно вага аркуша паперу. ' +
        'Апарат прискорювався настільки повільно, що людина, поклавши пальця на нього, ' +
        'зупинила б його рух. Але за рік безперервної роботи такий двигун набирає швидкість, ' +
        'яку хімічний двигун отримує за кілька хвилин. ' +
        'Dawn пропрацював іонними двигунами в сумі понад п\'ять з половиною років — ' +
        'більше, ніж будь-який апарат до нього.',

        'Ключовий параметр місії — загальна зміна швидкості, яку апарат може накопичити за свій ресурс. ' +
        'Для Dawn це перевищило одинадцять кілометрів на секунду. ' +
        'Рекордна цифра дозволила зробити те, що раніше вважалося неможливим: ' +
        'загальмувати для захоплення Вестою, пришвидшитись для виходу з її орбіти, ' +
        'перелетіти до Церери і знову загальмувати. ' +
        'Хімічний апарат із такою програмою мав би стартову масу, несумісну з жодним реальним носієм.',
      ],
    },

    {
      diagram: {
        title: 'Траєкторія Dawn: іонна спіраль між двома тілами',
        svg: `<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="400" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Траєкторія Dawn (схематично)</text>

  <!-- Sun -->
  <circle cx="60" cy="200" r="22" fill="#ff8844" opacity="0.85"/>
  <text x="60" y="235" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Сонце</text>

  <!-- Mars orbit arc (reference) -->
  <ellipse cx="60" cy="200" rx="140" ry="90" fill="none" stroke="#334455" stroke-width="1" stroke-dasharray="4,6" opacity="0.5"/>
  <text x="130" y="118" fill="#667788" font-family="monospace" font-size="9">орбіта Марса</text>

  <!-- Vesta orbit arc -->
  <ellipse cx="60" cy="200" rx="270" ry="170" fill="none" stroke="#446688" stroke-width="1" stroke-dasharray="3,5" opacity="0.6"/>
  <text x="220" y="38" fill="#7bb8ff" font-family="monospace" font-size="9">орбіта Вести</text>

  <!-- Ceres orbit arc -->
  <ellipse cx="60" cy="200" rx="360" ry="230" fill="none" stroke="#446688" stroke-width="1" stroke-dasharray="3,5" opacity="0.45"/>
  <text x="290" y="360" fill="#7bb8ff" font-family="monospace" font-size="9">орбіта Церери</text>

  <!-- Launch point (Earth, approx) -->
  <circle cx="200" cy="200" r="6" fill="#44ff88" opacity="0.9"/>
  <text x="200" y="218" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Земля</text>
  <text x="200" y="228" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">2007</text>

  <!-- Mars gravity assist point -->
  <circle cx="194" cy="115" r="5" fill="#ff8844" opacity="0.8"/>
  <text x="205" y="110" fill="#ff8844" font-family="monospace" font-size="9">гравітац.</text>
  <text x="205" y="120" fill="#ff8844" font-family="monospace" font-size="9">маневр</text>
  <text x="205" y="130" fill="#ff8844" font-family="monospace" font-size="9">Марс 2009</text>

  <!-- Ion thrust spiral to Vesta - schematic curved path -->
  <path d="M200,200 Q190,160 194,115 Q200,60 290,55 Q340,52 330,110" fill="none" stroke="#7bb8ff" stroke-width="2" stroke-dasharray="6,3" opacity="0.8"/>
  <!-- Arrow at Vesta arrival -->
  <polygon points="330,105 322,115 338,118" fill="#7bb8ff" opacity="0.8"/>

  <!-- Vesta body -->
  <circle cx="330" cy="125" r="14" fill="#8899aa" opacity="0.9"/>
  <text x="330" y="150" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Веста</text>
  <text x="330" y="162" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">2011–2012</text>

  <!-- Vesta orbit spiral (small) -->
  <ellipse cx="330" cy="125" rx="28" ry="18" fill="none" stroke="#7bb8ff" stroke-width="1.2" stroke-dasharray="2,3" opacity="0.6"/>

  <!-- Ion thrust spiral Vesta to Ceres -->
  <path d="M330,125 Q400,100 450,140 Q510,180 510,200" fill="none" stroke="#7bb8ff" stroke-width="2" stroke-dasharray="6,3" opacity="0.8"/>
  <polygon points="510,196 502,207 516,210" fill="#7bb8ff" opacity="0.8"/>

  <!-- Ion thrust label -->
  <text x="400" y="95" fill="#7bb8ff" font-family="monospace" font-size="9">іонна тяга</text>
  <text x="400" y="105" fill="#7bb8ff" font-family="monospace" font-size="9">(2,5 роки)</text>

  <!-- Ceres body -->
  <circle cx="510" cy="210" r="20" fill="#667788" opacity="0.9"/>
  <!-- Bright spots on Ceres -->
  <circle cx="504" cy="206" r="3" fill="white" opacity="0.7"/>
  <circle cx="515" cy="214" r="2" fill="white" opacity="0.5"/>
  <text x="510" y="242" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Церера</text>
  <text x="510" y="254" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">2015–2018</text>

  <!-- Ceres orbit spiral (small) -->
  <ellipse cx="510" cy="210" rx="38" ry="24" fill="none" stroke="#44ff88" stroke-width="1.2" stroke-dasharray="2,3" opacity="0.6"/>

  <!-- End marker -->
  <text x="560" y="210" fill="#cc4444" font-family="monospace" font-size="9">кінець місії</text>
  <text x="560" y="220" fill="#cc4444" font-family="monospace" font-size="9">жовтень 2018</text>

  <!-- Legend -->
  <line x1="30" y1="350" x2="60" y2="350" stroke="#7bb8ff" stroke-width="2" stroke-dasharray="6,3"/>
  <text x="65" y="354" fill="#7bb8ff" font-family="monospace" font-size="9">іонна траєкторія</text>
  <line x1="30" y1="368" x2="60" y2="368" stroke="#334455" stroke-width="1" stroke-dasharray="4,6"/>
  <text x="65" y="372" fill="#667788" font-family="monospace" font-size="9">орбіти планет/астероїдів</text>
</svg>`,
        caption:
          'Спрощена схема траєкторії Dawn. Апарат стартував із Землі у 2007 році, ' +
          'використав гравітаційний маневр біля Марса у 2009 році, вийшов на орбіту Вести у 2011 році, ' +
          'залишив її у 2012 році та прибув до Церери у 2015 році. ' +
          'Іонні двигуни працювали безперервно між фазами орбітальних досліджень.',
      },
    },

    {
      heading: 'Веста: зменшена планета, що не відбулась',
      level: 2,
      paragraphs: [
        'Коли Dawn вийшов на орбіту Вести у 2011 році, геологи отримали об\'єкт, ' +
        'якого давно чекали. Веста не схожа на типовий хаотичний кам\'яний уламок: ' +
        'вона _диференційована_. Це означає, що в далекому минулому всередині неї ' +
        'утворився розплавлений залізний ядро, а більш легкі силікатні породи спливли ' +
        'і застигли зверху, сформувавши кору і мантію — майже як у Землі чи Марса. ' +
        'Юпітер просто не дав цьому зародку планети добудуватись до повноцінного тіла.',

        'Поверхня Вести вкрита базальтом — продуктом вулканізму, що давно завершився. ' +
        'На південному полюсі розташовується кратер Реасільвія діаметром близько п\'ятиста кілометрів — ' +
        'один з найбільших ударних кратерів у Сонячній системі відносно розмірів самого тіла. ' +
        'Удар, що утворив цей кратер, викинув у простір величезну кількість уламків. ' +
        'Частина з них дісталась Землі у вигляді метеоритів, відомих як хондрити евкрит-діогеніт-гоуардит ' +
        '— особлива група кам\'яних метеоритів, яку вчені ще до польоту Dawn ідентифікували ' +
        'як такі, що, мабуть, походять з одного диференційованого тіла. Dawn підтвердив здогадку.',

        'Геологічно Веста розповідає про перші мільйони років Сонячної системи, ' +
        'коли тепло від розпаду короткоживучих радіоактивних ізотопів ще могло плавити ' +
        'навіть невеликі тіла. Це вікно в епоху, яку ми більше ніколи не зможемо відтворити ' +
        'у лабораторії і яку Земля давно перекрила власною геологічною активністю.',
      ],
    },

    {
      image: {
        cacheKey: 'dawn-asteroids-vesta-surface',
        prompt:
          'Photorealistic science encyclopedia illustration: close orbital view of asteroid Vesta surface from the Dawn spacecraft perspective. ' +
          'Rocky basaltic surface with ancient impact craters, rilles and ridges, dark and bright material patches, ' +
          'the enormous Rheasilvia impact basin visible as a massive curved rim at the southern pole. ' +
          'Hard sci-fi style, dark space background, realistic geology, dramatic raking sunlight. ' +
          'Add the following text labels on the image: "basaltic surface", "Rheasilvia crater rim", "impact ejecta", "differentiated asteroid".',
        alt: 'Поверхня Вести з орбіти — базальтова кора, кратер Реасільвія та сліди давнього вулканізму',
        caption:
          'Кратер Реасільвія на південному полюсі Вести має діаметр близько п\'ятиста кілометрів і глибину близько дев\'яти кілометрів. ' +
          'Центральний пік усередині кратера вищий за земний Еверест. ' +
          'Матеріал, викинутий цим ударом, формує сімейство вестоїдів і частину метеоритів, що падають на Землю.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Церера: карликова планета з живою геологією',
      level: 2,
      paragraphs: [
        'Коли Dawn наближався до Церери у 2015 році, ще до виходу на орбіту ' +
        'камери зафіксували щось несподіване: яскраві білі плями всередині кратера Окатор. ' +
        'Відбивна здатність матеріалу була аномально високою — явна ознака чогось, ' +
        'що різко відрізняється від звичайної гірської породи. ' +
        'Ці плями стали найбільш обговорюваним відкриттям місії.',

        'Дані Dawn у поєднанні з подальшим наземним спектроскопічним аналізом показали, ' +
        'що білі відкладення — це гідрохалцит, мінерал з групи хлоридів кальцію. ' +
        'Він утворюється, коли соляний розчин випаровується у вакуумі. ' +
        'Це означає, що під поверхнею Церери існує рідкий соляний розчин — ' +
        'так звана підповерхнева ропа, — яка час від часу виходить на поверхню через ' +
        'тріщини і кратери і одразу кристалізується. ' +
        'Геологічна активність на Церері не повністю завершена.',

        'На поверхні Церери виявлено також аміак, змішаний із мінералами кори. ' +
        'Аміак стабільний лише за дуже низьких температур або в хімічно зв\'язаному стані. ' +
        'Його присутність натякає на те, що або Церера сформувалась далеко від Сонця і мігрувала ближче, ' +
        'або матеріал, з якого вона складається, прийшов з зовнішньої частини Сонячної системи. ' +
        'Разом з аномальним гравітаційним полем, виявленим Dawn, це свідчить, ' +
        'що в надрах Церери може існувати шар водяного льоду або навіть рідкої води — ' +
        'підповерхневий резервуар, схожий на ті, що відомі під кригою Європи та Енцелада.',
      ],
    },

    {
      image: {
        cacheKey: 'dawn-asteroids-ceres-occator',
        prompt:
          'Photorealistic science encyclopedia illustration: close view of Occator crater on Ceres from orbit. ' +
          'The crater floor shows brilliant white salt deposits in the central pit area and scattered around the floor, ' +
          'contrasting sharply with the dark grey rocky crater walls and surrounding terrain. ' +
          'The crater is approximately 90 kilometers across. ' +
          'Hard sci-fi style, dark space background, dramatic oblique lighting to show crater relief. ' +
          'Add the following text labels on the image: "Occator crater", "hydrohalite salt deposits", "bright spots", "subsurface brine origin".',
        alt: 'Кратер Окатор на Церері — яскраві соляні відкладення гідрохалциту на тлі темного дна кратера',
        caption:
          'Яскраві плями в кратері Окатор — це гідрохалцит, що залишається після випаровування соляного розчину з підповерхневого резервуара. ' +
          'Найяскравіша ділянка, відома як Cerealia Facula, приблизно дев\'ять кілометрів у поперечнику. ' +
          'Підповерхнева активність на Церері, ймовірно, продовжується і сьогодні.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Два світи — одне питання',
      level: 2,
      paragraphs: [
        'Найглибший науковий підсумок місії Dawn — контраст між двома об\'єктами. ' +
        'Веста суха, гаряча у молодості, вулканічна — вона пройшла швидкий шлях ' +
        'диференціації і застигла. Церера волога, геохімічно активна навіть зараз, ' +
        'насичена летючими речовинами. Вони сформувалися в тому самому регіоні Сонячної системи, ' +
        'але виявилися принципово різними.',

        'Це підживило одну з актуальних гіпотез: у ранній Сонячній системі ' +
        'міграція великих планет, насамперед Юпітера, перемішала матеріал. ' +
        'Тіла, що сформувалися далеко від Сонця — багаті на воду і аміак — ' +
        'могли потрапляти у внутрішні регіони. ' +
        'Церера, можливо, не народилась у Поясі астероїдів, ' +
        'а прийшла туди ззовні. Веста, навпаки, типовий представник ' +
        'внутрішнього поясу — скам\'яніла пам\'ять про час, коли Земля ще будувалась.',

        'Для астробіології місія поставила важливе запитання: ' +
        'якщо в надрах Церери існує рідка вода, контактна з мінералами і ймовірно підігрівана ' +
        'радіоактивним розпадом — чи може там існувати хімія, сумісна з виникненням складних органічних молекул? ' +
        'Dawn не знайшов ані слідів життя, ані прямих доказів органіки у значних кількостях. ' +
        'Але він позначив Цереру як адресу, вартую майбутнього відвідування.',
      ],
    },

    {
      diagram: {
        title: 'Веста і Церера: порівняння розмірів і будови',
        svg: `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Веста і Церера: порівняння</text>

  <!-- Scale reference: Earth Moon -->
  <circle cx="610" cy="120" r="27" fill="none" stroke="#667788" stroke-width="1" stroke-dasharray="3,4" opacity="0.6"/>
  <text x="610" y="155" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Місяць</text>
  <text x="610" y="165" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">1737 км</text>

  <!-- Vesta body -->
  <ellipse cx="200" cy="170" rx="85" ry="75" fill="#8899aa" opacity="0.85"/>
  <!-- Vesta layered structure hint -->
  <ellipse cx="200" cy="170" rx="40" ry="36" fill="#667788" opacity="0.5"/>
  <ellipse cx="200" cy="170" rx="20" ry="18" fill="#cc4444" opacity="0.5"/>
  <!-- Rheasilvia crater -->
  <ellipse cx="200" cy="225" rx="70" ry="12" fill="none" stroke="#334455" stroke-width="2" opacity="0.8"/>
  <text x="200" y="242" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Реасільвія</text>

  <text x="200" y="270" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">Веста</text>
  <text x="200" y="284" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">530 км в поперечнику</text>
  <text x="200" y="296" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">маса: 2.59 × 10^20 кг</text>
  <text x="200" y="308" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">диференційований астероїд</text>
  <text x="200" y="320" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">суха, базальтова кора</text>

  <!-- Vesta legend: layers -->
  <rect x="30" y="130" width="12" height="12" fill="#cc4444" opacity="0.5"/>
  <text x="46" y="141" fill="#8899aa" font-family="monospace" font-size="8">залізне ядро</text>
  <rect x="30" y="148" width="12" height="12" fill="#667788" opacity="0.5"/>
  <text x="46" y="159" fill="#8899aa" font-family="monospace" font-size="8">мантія</text>
  <rect x="30" y="166" width="12" height="12" fill="#8899aa" opacity="0.85"/>
  <text x="46" y="177" fill="#8899aa" font-family="monospace" font-size="8">базальтова кора</text>

  <!-- Ceres body -->
  <circle cx="470" cy="160" r="118" fill="#667788" opacity="0.85"/>
  <!-- Ceres ice layer hint -->
  <circle cx="470" cy="160" r="90" fill="#446688" opacity="0.4"/>
  <!-- Ceres possible subsurface ocean -->
  <circle cx="470" cy="160" r="55" fill="#4488aa" opacity="0.35"/>
  <!-- Core -->
  <circle cx="470" cy="160" r="25" fill="#8899aa" opacity="0.6"/>
  <!-- Bright spots (Occator) -->
  <circle cx="448" cy="148" r="6" fill="white" opacity="0.75"/>
  <circle cx="462" cy="155" r="3" fill="white" opacity="0.55"/>
  <circle cx="488" cy="170" r="4" fill="white" opacity="0.45"/>

  <text x="470" y="298" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">Церера</text>
  <text x="470" y="312" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">945 км в поперечнику</text>
  <text x="470" y="324" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">карликова планета, волога</text>

  <!-- Ceres legend -->
  <rect x="592" y="188" width="12" height="12" fill="#8899aa" opacity="0.6"/>
  <text x="608" y="199" fill="#8899aa" font-family="monospace" font-size="8">силікатне ядро</text>
  <rect x="592" y="206" width="12" height="12" fill="#4488aa" opacity="0.35"/>
  <text x="608" y="217" fill="#8899aa" font-family="monospace" font-size="8">можл. рідка вода</text>
  <rect x="592" y="224" width="12" height="12" fill="#446688" opacity="0.4"/>
  <text x="608" y="235" fill="#8899aa" font-family="monospace" font-size="8">крига + мінерали</text>
  <circle cx="598" cy="248" r="4" fill="white" opacity="0.75"/>
  <text x="608" y="252" fill="#8899aa" font-family="monospace" font-size="8">соляні відклад.</text>
</svg>`,
        caption:
          'Церера майже вдвічі більша за Весту за діаметром і значно масивніша. ' +
          'Веста диференційована — з залізним ядром і базальтовою корою. ' +
          'Церера, ймовірно, має шаруватий склад з можливим підповерхневим резервуаром рідини. ' +
          'Яскраві плями — соляні відкладення на поверхні кратерів.',
      },
    },

    {
      heading: 'Кінець місії і спадщина іонних двигунів',
      level: 2,
      paragraphs: [
        'У жовтні 2018 року Dawn перестав виходити на зв\'язок. ' +
        'Запаси гідразину, який використовувався для орієнтації сонячних панелей і антени, ' +
        'вичерпались. Іонні двигуни вже припинили роботу раніше, коли витратили весь ксенон. ' +
        'Апарат залишили на стабільній орбіті навколо Церери, де він перебуватиме ' +
        'щонайменше кілька десятиліть, — навмисне рішення, щоб уникнути забруднення ' +
        'потенційно гідростатично активного тіла земними мікроорганізмами.',

        'Технологічна спадщина місії — безпосередня. ' +
        'Система іонних двигунів Нестар, яку Dawn вивела на новий рівень надійності, ' +
        'стала стандартним інструментом для науково-дослідних місій. ' +
        'Японська місія Хаябуса до астероїда Ітокава і її наступниця Хаябуса-2 до Рюгу ' +
        'використовували іонне прискорення. Місія Люсі, що летить до троянців Юпітера, ' +
        'і ціла низка майбутніх зондів ґрунтуються на досвіді, отриманому Dawn. ' +
        'Іонний двигун більше не є технологічною новинкою — він став стандартом.',

        'Наукова спадщина не менш вагома. ' +
        'Dawn показав, що Пояс астероїдів — не однорідне скупчення уламків, ' +
        'а архів різних геологічних класів, сформованих за різних умов. ' +
        'Він уточнив час диференціації планетних зародків. ' +
        'Він поставив Цереру в один ряд з Європою та Енцеладом як тіло, ' +
        'де може існувати рідка вода поза межами звичних "придатних зон". ' +
        'І він зробив це, зламавши правило "один апарат — одна ціль", ' +
        'яке здавалося непорушним.',
      ],
    },

    {
      image: {
        cacheKey: 'dawn-asteroids-ion-thruster-glow',
        prompt:
          'Photorealistic science encyclopedia illustration: close-up view of one of Dawn spacecraft ion thruster nozzles firing in deep space. ' +
          'The thruster emits a distinctive blue-violet glowing xenon ion exhaust plume extending into the darkness. ' +
          'The metallic thruster housing and grid structure are visible in sharp detail. ' +
          'Stars visible in background. Hard sci-fi style, dramatic lighting from the thruster glow. ' +
          'Add the following text labels on the image: "xenon ion exhaust", "thruster grid", "ion accelerator", "90 mN thrust".',
        alt: 'Іонний двигун апарата Dawn у роботі — синьо-фіолетове свічення ксенонового факела у відкритому космосі',
        caption:
          'Синє свічення іонного факела — характерна ознака ксенонового іонного двигуна. ' +
          'Dawn мав три двигуни Нестар, але одночасно використовував лише один. ' +
          'За одинадцять років місії двигуни пропрацювали в сумі понад п\'ять з половиною років і витратили близько чотириста вісімдесяти кілограмів ксенону.',
        aspectRatio: '4:3',
      },
    },

    {
      image: {
        cacheKey: 'dawn-asteroids-belt-overview',
        prompt:
          'Photorealistic science encyclopedia illustration: wide-angle view of the asteroid belt between Mars and Jupiter from outer space perspective. ' +
          'Thousands of rocky bodies of various sizes spread in a wide band, with Vesta and Ceres highlighted and labeled as two prominent bodies. ' +
          'Mars visible as a reddish dot on the inner edge, Jupiter as a large striped sphere on the outer edge. ' +
          'Hard sci-fi style, dark space background, accurate orbital scale. ' +
          'Add the following text labels on the image: "asteroid belt", "Vesta", "Ceres", "Mars", "Jupiter".',
        alt: 'Пояс астероїдів між Марсом і Юпітером з позначеними положеннями Вести та Церери',
        caption:
          'Пояс астероїдів містить мільйони тіл, але їхня сумарна маса менша за масу Місяця. ' +
          'Церера становить близько третини всієї маси поясу. ' +
          'Веста — друга за масою після Церери. ' +
          'Dawn став першим апаратом, що вивчив обидва з орбіти.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Іонний двигун',
      definition:
        'Електричний ракетний двигун, що іонізує газ (зазвичай ксенон) і прискорює іони електричним полем. Питома імпульсивність у п\'ять-десять разів вища за хімічні двигуни. Dawn використовував систему Нестар — три двигуни по дев\'яносто мілі-ньютонів тяги кожен.',
    },
    {
      term: 'Диференціація',
      definition:
        'Геологічний процес розподілу речовини за густиною всередині планетного тіла: важкі метали (залізо, нікель) осідають в ядро, легші силікати утворюють мантію і кору. Відбувається лише за наявності достатнього тепла для розплавлення. Веста пройшла диференціацію; Церера — ні.',
    },
    {
      term: 'Гідрохалцит',
      definition:
        'Мінерал з групи хлоридів кальцію, що утворюється при випаровуванні соляного розчину. Саме він формує яскраві білі плями в кратері Окатор на Церері — видимий слід підповерхневої солоної ропи.',
    },
    {
      term: 'Підповерхнева ропа',
      definition:
        'Рідкий соляний розчин, що знаходиться під поверхнею планетного тіла. На Церері підповерхнева ропа виходить через тріщини і кратери, кристалізуючись у вакуумі у вигляді соляних відкладень. Аналогічні явища спостерігаються на Енцеладі та Європі.',
    },
    {
      term: 'Хондрити евкрит-діогеніт-гоуардит',
      definition:
        'Особлива група кам\'яних метеоритів базальтового складу, що походять з одного диференційованого тіла Пояса астероїдів. Dawn підтвердив, що це тіло — Веста: склад поверхні і метеоритів збігається.',
    },
    {
      term: 'Зміна швидкості (дельта-V)',
      definition:
        'Загальна зміна швидкості, яку космічний апарат може набрати за рахунок двигунів. Dawn накопичив понад одинадцять кілометрів на секунду — рекорд для електрично прискореного апарата. Хімічні апарати не могли б виконати таку місію в рамках реалістичної маси.',
    },
    {
      term: 'Питома імпульсивність',
      definition:
        'Міра ефективності ракетного двигуна: скільки секунд одиниця маси палива забезпечує одиницю тяги. Двигун Нестар давав близько трьох тисяч секунд проти трьохсот-чотирьохсот секунд у хімічних аналогів.',
    },
    {
      term: 'Пояс астероїдів',
      definition:
        'Область Сонячної системи між орбітами Марса і Юпітера, де зосереджені мільйони кам\'яних і металевих тіл. Юпітер своєю гравітацією перешкодив формуванню повноцінної планети тут. Загальна маса поясу менша за масу Місяця.',
    },
    {
      term: 'Місія категорії Discovery',
      definition:
        'Клас наукових місій Національного агентства з аеронавтики та дослідження космічного простору з обмеженим бюджетом, орієнтованих на конкретні наукові питання. Dawn був місією Discovery з бюджетом близько п\'ятисот мільйонів доларів — порівняно скромним для настільки складної програми.',
    },
  ],

  quiz: [
    {
      question: 'Що робить місію Dawn унікальною в історії дослідження Сонячної системи?',
      options: [
        'Це перший апарат, що приземлився на астероїд і повернув зразки',
        'Це єдиний апарат, що вийшов на орбіту двох різних тіл Сонячної системи поспіль',
        'Це перша місія, що виявила рідку воду поза Землею',
        'Це перший апарат із ядерним реактором для живлення двигунів',
      ],
      correctIndex: 1,
      explanation:
        'Dawn — єдиний апарат, що послідовно вийшов на орбіту двох різних тіл: Вести у 2011 році і Церери у 2015 році. Це стало можливим завдяки іонним двигунам, які забезпечили достатній запас зміни швидкості без нереалістично великого запасу хімічного палива.',
    },
    {
      question: 'Чому яскраві білі плями в кратері Окатор на Церері вважаються ознакою підповерхневої активності?',
      options: [
        'Вони — сліди вулканічної лави, що вирвалась на поверхню',
        'Вони складаються з гідрохалциту — мінералу, що утворюється при випаровуванні соляного розчину у вакуумі',
        'Вони — відклади водяного льоду, принесеного кометним ударом',
        'Вони — залізна руда, оголена ударом метеориту',
      ],
      correctIndex: 1,
      explanation:
        'Яскраві плями в кратері Окатор складаються з гідрохалциту — мінералу, що залишається після випаровування соляного розчину у вакуумі. Це означає, що під поверхнею Церери існує підповерхнева ропа, яка виходить на поверхню через тріщини і кратери та кристалізується.',
    },
    {
      question: 'Що таке диференціація і яке з двох тіл її пройшло?',
      options: [
        'Розподіл астероїдів за хімічним складом у поясі; обидва тіла диференційовані',
        'Процес розподілу речовини за густиною всередині тіла; Веста диференційована, Церера — ні',
        'Поділ орбіт між кількома тілами; Церера диференційована, Веста — ні',
        'Різниця в масі між тілами; обидва тіла не диференційовані',
      ],
      correctIndex: 1,
      explanation:
        'Диференціація — це розподіл речовини за густиною: важкі метали утворюють ядро, легші силікати — мантію і кору. Веста пройшла диференціацію в ранні мільйони років Сонячної системи, поки короткоживучі радіоактивні ізотопи давали достатньо тепла. Церера не має чіткого металевого ядра.',
    },
    {
      question: 'Яка загальна зміна швидкості набрав Dawn іонними двигунами і чому це важливо?',
      options: [
        'Близько одного кілометра на секунду — достатньо для виходу на одну орбіту',
        'Близько п\'яти кілометрів на секунду — стандартне значення для міжпланетних зондів',
        'Понад одинадцять кілометрів на секунду — рекорд, що дозволив вийти на орбіту двох тіл',
        'Понад тридцять кілометрів на секунду — більше, ніж будь-яка інша місія в історії',
      ],
      correctIndex: 2,
      explanation:
        'Dawn накопичив понад одинадцять кілометрів на секунду зміни швидкості — рекорд для апарата з іонним прискоренням. Саме такий запас дозволив загальмувати біля Вести, злетіти з її орбіти, перелетіти до Церери і знову загальмувати. Хімічний апарат не міг би виконати такий маневровий профіль.',
    },
    {
      question: 'Чому Dawn залишили на постійній орбіті навколо Церери після вичерпання палива?',
      options: [
        'Щоб продовжити наукові спостереження в автономному режимі',
        'Щоб уникнути потенційного забруднення тіла з можливою підповерхневою водою земними мікроорганізмами',
        'Тому що управління місією не мало технічних засобів для проведення керованого падіння',
        'Щоб використати його як ретранслятор для майбутніх місій до Церери',
      ],
      correctIndex: 1,
      explanation:
        'Церера — потенційно гідрологічно активне тіло з можливою підповерхневою рідкою водою. Протоколи планетарного захисту вимагають уникати падіння апарата на такі тіла, щоб не занести земні мікроорганізми, які теоретично можуть вижити і забруднити середовище, яке планується вивчати в майбутньому.',
    },
  ],

  sources: [
    {
      title: 'NASA Dawn Mission — Official Mission Page',
      url: 'https://www.jpl.nasa.gov/missions/dawn',
      meta: 'NASA JPL, відкритий доступ',
    },
    {
      title: 'Russell C. et al. — Dawn at Vesta: Testing the Protoplanetary Paradigm (Science, 2012)',
      url: 'https://www.science.org/doi/10.1126/science.1219381',
      meta: 'Science, 2012, vol. 336',
    },
    {
      title: 'Raymond C. et al. — Dawn at Ceres: The Geology of a Water-Rich World (2020)',
      url: 'https://www.science.org/doi/10.1126/science.aar4219',
      meta: 'Science, 2019, vol. 365',
    },
    {
      title: 'De Sanctis M. et al. — Bright carbonate deposits on Ceres from a geologically recent fluid-driven process (Nature, 2020)',
      url: 'https://www.nature.com/articles/s41586-020-2998-x',
      meta: 'Nature, 2020, vol. 587',
    },
    {
      title: 'Rayman M. — Dawn Journal — Mission Blog (JPL)',
      url: 'https://www.jpl.nasa.gov/blogs/dawn/',
      meta: 'NASA JPL, хронологія місії від головного інженера',
    },
    {
      title: 'Brophy J. et al. — Dawn Ion Propulsion System: Technology Validation (AIAA 2009)',
      url: 'https://arc.aiaa.org/doi/10.2514/6.2009-4917',
      meta: 'AIAA, 2009, технічний опис системи Нестар',
    },
    {
      title: 'NASA — Dawn Factsheet',
      url: 'https://www.jpl.nasa.gov/news/dawn-mission-ends-as-nasa-spacecraft-runs-out-of-fuel',
      meta: 'NASA JPL, 2018, завершення місії',
    },
    {
      title: 'Prettyman T. et al. — Extensive water ice within Ceres\' aqueously altered regolith (Science, 2017)',
      url: 'https://www.science.org/doi/10.1126/science.aah6765',
      meta: 'Science, 2017, vol. 355',
    },
    {
      title: 'Ermakov A. et al. — Constraining Ceres\' interior from its rotational state (JGR Planets, 2017)',
      url: 'https://agupubs.onlinelibrary.wiley.com/doi/10.1002/2016JE005213',
      meta: 'JGR Planets, 2017',
    },
    {
      title: 'Vernazza P. et al. — Vestoids and their link to Vesta: implications for the HED meteorites (Icarus, 2015)',
      url: 'https://www.sciencedirect.com/science/article/pii/S0019103515002638',
      meta: 'Icarus, 2015, vol. 257',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
