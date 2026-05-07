import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'binary-stars',
  language: 'uk',
  section: 'astrophysics',
  order: 12,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Подвійні зорі',
  subtitle: 'Більше половини зір у Галактиці живуть у парах. Ці пари — двигуни космічних катастроф, лабораторії для зважування зір і джерела гравітаційних хвиль.',

  hero: {
    cacheKey: 'binary-stars-hero',
    prompt:
      'Photorealistic scientific illustration of a close binary star system: a massive blue-white primary star and a smaller orange companion star orbiting each other, ' +
      'connected by a luminous stream of gas flowing from the companion toward an accretion disk around the primary. ' +
      'Background is deep black space with distant star field. Hard sci-fi style scientific illustration, wide aspect ratio. ' +
      'Add the following text labels on the image: "primary star", "companion star", "mass transfer stream", "accretion disk".',
    alt: 'Тісна подвійна зоряна система — синьо-біла зоря та помаранчевий компаньйон, між якими тече потік газу',
    caption:
      'Тісна подвійна система з перетіканням маси: газ залишає компаньйона через точку Лагранжа L1 і закручується в акреційний диск навколо первинної зорі. Саме так народжуються нові зорі, рентгенівські джерела та, зрештою, злиття, що породжують гравітаційні хвилі.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Самотнє Сонце — скоріше виняток, ніж правило. Більше половини зір, подібних до Сонця, ' +
        'народжуються не поодинці, а в парах або кратних системах. Ці пари іноді розташовані так ' +
        'широко, що практично не впливають одна на одну, але частина з них настільки тісна, ' +
        'що зорі обмінюються речовиною, деформують одна одну і рано чи пізно зіштовхуються. ' +
        'Подвійні системи — це не лише статистичний факт зореутворення. Це місця, де відбуваються ' +
        'найдраматичніші події Всесвіту: вибухи нових і наднових зір, спалахи рентгенівських пульсарів, ' +
        'злиття нейтронних зір і чорних дір.',

        'З практичного погляду подвійні зорі незамінні: вони єдиний спосіб _прямо_ виміряти маси зір. ' +
        'Жодний інший астрономічний об\'єкт не дає нам цієї можливості з такою точністю. ' +
        'Маса зорі визначає все — її яскравість, температуру, тривалість життя і підсумкову долю. ' +
        'Без подвійних систем наше розуміння зоряної еволюції було б набагато більш умоглядним.',
      ],
    },

    {
      image: {
        cacheKey: 'binary-stars-wide-pair',
        prompt:
          'Photorealistic scientific illustration of a wide visual binary star system: two stars of different colors — ' +
          'one yellowish-white and one cooler orange-red — separated by a large distance, both visible as distinct point sources, ' +
          'with a faint gravitational influence shown as subtle orbital arc lines around each star. ' +
          'Deep black space background with faint Milky Way star field. Hard sci-fi style scientific illustration. ' +
          'Add the following text labels on the image: "visual binary", "orbital period: centuries", "separation: hundreds of AU".',
        alt: 'Широка візуальна подвійна система — дві зорі різних кольорів на великій відстані одна від одної',
        caption: 'Візуальні подвійні зорі можна розрізнити в телескоп як дві окремі точки. Такі пари обертаються одна навколо одної за сотні або тисячі років. Перше систематичне каталогування таких пар розпочалось у XVIII столітті.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Три обличчя подвійних зір',
      level: 2,
      paragraphs: [
        'Астрономи виявляють подвійні системи різними способами залежно від геометрії та відстані — ' +
        'і кожен спосіб виявлення розкриває свій набір фізичних параметрів.',
      ],
    },

    {
      heading: 'Візуальні подвійні',
      level: 3,
      paragraphs: [
        'Найпростіший випадок: два компоненти видно окремо в телескоп. Протягом десятиліть або ' +
        'навіть сторіч спостережень астроном бачить, як одна зоря описує дугу навколо іншої. ' +
        'Вимірявши кутовий розмір орбіти та відстань до системи, можна розрахувати реальний ' +
        'розмір орбіти, а звідти — через закон Кеплера — суму мас компонентів. ' +
        'Альфа Центавра — найближча до нас зоряна система — є саме візуальною подвійною: ' +
        'дві зорі, дуже схожі на Сонце, обертаються одна навколо одної за приблизно 80 років.',
      ],
    },

    {
      heading: 'Спектроскопічні подвійні',
      level: 3,
      paragraphs: [
        'Коли система надто далека або компоненти занадто близькі, щоб розрізнити їх в телескоп, ' +
        'на допомогу приходить _ефект Доплера_. Якщо зоря рухається до нас, спектральні лінії ' +
        'зміщуються в синій бік; якщо від нас — у червоний. В подвійній системі кожна зоря ' +
        'почергово наближається і віддаляється, тому лінії в спектрі ритмічно коливаються. ' +
        'Такі системи називають спектроскопічними подвійними. Уважне вимірювання цих коливань ' +
        'дає _радіальну швидкість_ і орбітальний період, а разом — нижню межу мас компонентів. ' +
        'Саме цим методом у кінці XIX століття були відкриті перші спектроскопічні подвійні — ' +
        'коли спектроскопія стала достатньо точною для таких вимірювань.',
      ],
    },

    {
      heading: 'Затемнювані подвійні',
      level: 3,
      paragraphs: [
        'Якщо площина орбіти системи збігається з лінією зору, компоненти по черзі закривають ' +
        'один одного — і яскравість системи регулярно спадає. Такий _мінімум блиску_ легко ' +
        'зафіксувати фотометрично. Алгол у сузір\'ї Персея став першою зорею, для якої ще в ' +
        'XVIII столітті пояснили регулярні затемнення: кожні приблизно 2,9 доби яскравіша зоря ' +
        'частково перекривається тьмянішим компаньйоном. Затемнювані подвійні особливо цінні, ' +
        'бо поєднання фотометрії та спектроскопії дає _абсолютні_ розміри обох компонентів і ' +
        'кут нахилу орбіти — а разом з тим і точні маси.',
      ],
    },

    {
      image: {
        cacheKey: 'binary-stars-light-curve',
        prompt:
          'Scientific diagram of an eclipsing binary star light curve: a graph showing stellar brightness (vertical axis, labeled "brightness") ' +
          'versus time (horizontal axis, labeled "orbital phase 0 to 1"), with two distinct dips — ' +
          'a deep primary minimum and a shallower secondary minimum. ' +
          'Above the graph, small illustrations show the binary system geometry at each phase: ' +
          'full brightness, primary eclipse (dim star in front), maximum brightness, secondary eclipse (bright star in front). ' +
          'Hard sci-fi style, dark background, cyan and orange accent lines, monospace labels. ' +
          'Add the following text labels on the image: "primary minimum", "secondary minimum", "out of eclipse".',
        alt: 'Крива блиску затемнюваної подвійної зорі з двома мінімумами — головним і вторинним',
        caption: 'Крива блиску затемнюваної подвійної: глибший мінімум настає, коли тьмяніший компаньйон закриває яскравішу зорю. Форма кривої кодує відносні розміри та температури обох зір.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Геометрія гравітації: порожнина Роша і перетікання маси',
      level: 2,
      paragraphs: [
        'Дві зорі в тісній парі не просто тяжіють одна до одної — вони формують спільне ' +
        'гравітаційне поле, яке має складну тривимірну геометрію. Французький математик ' +
        'Едуар Рош у XIX столітті описав поверхні рівного потенціалу в такій системі. ' +
        'Навколо кожної зорі існує своя замкнена область простору, звана **порожниною Роша** ' +
        '(або часткою Роша). Поки зоря вміщується у свою частку Роша, вона залишається ' +
        'стабільною. Але якщо зоря розбухає — наприклад, еволюціонуючи в червоного гіганта — ' +
        'і заповнює свою порожнину Роша, речовина починає витікати через точку Лагранжа L1 ' +
        'у напрямку до компаньйона.',

        'Цей процес зветься **перетіканням маси** і є рушієм більшості екзотичних явищ у ' +
        'тісних подвійних системах. Перетікаюча речовина не падає прямо на компаньйона — ' +
        'через збереження кутового моменту вона закручується і формує **акреційний диск**. ' +
        'Унаслідок тертя і магнітної нестійкості газ у диску розігрівається до мільйонів градусів ' +
        'і яскраво сяє — найчастіше у рентгенівському діапазоні.',
      ],
    },

    {
      diagram: {
        title: 'Схема: Порожнини Роша і перетікання маси',
        svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Roche lobe left (donor star) -->
  <ellipse cx="200" cy="150" rx="130" ry="105" fill="rgba(255,136,68,0.07)" stroke="#ff8844" stroke-width="1.5" stroke-dasharray="6,4"/>
  <!-- Donor star -->
  <circle cx="175" cy="150" r="38" fill="#cc6633" opacity="0.88"/>
  <text x="175" y="154" fill="#fff" font-family="monospace" font-size="9" text-anchor="middle" font-weight="bold">Донор</text>
  <text x="175" y="195" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">(заповнює частку)</text>

  <!-- Roche lobe right (accretor) -->
  <ellipse cx="480" cy="150" rx="105" ry="85" fill="rgba(68,136,170,0.07)" stroke="#4488aa" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Accretion disk -->
  <ellipse cx="510" cy="150" rx="52" ry="22" fill="rgba(123,184,255,0.18)" stroke="#7bb8ff" stroke-width="1.2"/>
  <!-- Compact object (e.g. white dwarf / neutron star) -->
  <circle cx="510" cy="150" r="8" fill="#cdd9e8" stroke="#aabbcc" stroke-width="1"/>
  <text x="510" y="135" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Акреційний диск</text>
  <text x="510" y="178" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Акретор</text>

  <!-- L1 point -->
  <circle cx="340" cy="150" r="5" fill="#44ff88"/>
  <text x="340" y="140" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">L1</text>

  <!-- Mass transfer stream -->
  <path d="M 213 150 Q 270 148 310 151 Q 325 152 335 150" stroke="#ff8844" stroke-width="2" fill="none"/>
  <path d="M 345 150 Q 380 148 420 152 Q 450 155 460 152" stroke="#ff8844" stroke-width="1.5" fill="none" stroke-dasharray="4,3"/>
  <!-- Arrow tip toward disk -->
  <polygon points="456,147 468,152 456,157" fill="#ff8844"/>
  <text x="340" y="178" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">потік маси</text>

  <!-- Roche lobe labels -->
  <text x="118" y="58" fill="#ff8844" font-family="monospace" font-size="9">Частка Роша (донор)</text>
  <text x="420" y="72" fill="#4488aa" font-family="monospace" font-size="9">Частка Роша (акретор)</text>

  <!-- Center of mass -->
  <circle cx="320" cy="150" r="2" fill="#667788"/>
  <text x="320" y="260" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">центр мас системи</text>
  <line x1="320" y1="255" x2="320" y2="156" stroke="#667788" stroke-width="0.8" stroke-dasharray="3,4"/>

  <defs>
    <marker id="arr-uk-bs" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Дві порожнини Роша (штрихові еліпси) з\'єднуються у точці Лагранжа L1. Коли зоря-донор заповнює свою частку, речовина витікає через L1 і закручується в акреційний диск навколо компаньйона.',
      },
    },

    {
      heading: 'Парадокс Алгола: коли молодший старший',
      level: 2,
      paragraphs: [
        'На перший погляд система Алгол виглядає суперечливо. В ній є масивна, яскрава зоря ' +
        'головної послідовності — і набагато менш масивний, але еволюційно просунутіший ' +
        'субгігант. За всіма правилами зоряної еволюції більш масивна зоря мала б еволюціонувати ' +
        'швидше і «обігнати» свого легшого компаньйона. Але тут все навпаки.',

        'Розгадка прийшла в середині XX століття: первісно більш масивна зоря вже пройшла через ' +
        'стадію розбухання, заповнила свою частку Роша і _передала_ основну частину маси ' +
        'компаньйону. Тепер колишній «важкий» стає легшим донором-субгігантом, а колишній ' +
        '«легкий» — масивнішим акретором. Маси немовби помінялись ролями. Це явище відоме як ' +
        '**парадокс Алгола**, і його пояснення через перетікання маси стало першим доказом того, ' +
        'що обмін речовиною між компонентами — не теоретична вигадка, а реальний процес, ' +
        'що радикально змінює еволюційну долю обох зір.',
      ],
    },

    {
      image: {
        cacheKey: 'binary-stars-algol-paradox',
        prompt:
          'Scientific illustration of the Algol binary system paradox: two side-by-side diagrams. ' +
          'Left diagram labeled "initial state": a massive blue star and a smaller companion. ' +
          'Right diagram labeled "current state": the originally massive star has evolved into a bloated orange subgiant filling its Roche lobe, ' +
          'while the originally lighter star has grown more massive and bluer after accreting material. ' +
          'A curved arrow between the two diagrams shows mass transfer direction. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "initial: heavy + light", "now: subgiant donor + massive accretor", "mass transfer".',
        alt: 'Схема парадоксу Алгола — початковий стан і поточний стан після перетікання маси',
        caption: 'Парадокс Алгола: зоря, що була важчою, тепер є тьмянішим субгігантом — вона вже передала основну частину маси компаньйону. Це перший задокументований приклад радикальної еволюції через перетікання маси.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Рентгенівські подвійні: зорі, що кричать у рентгені',
      level: 2,
      paragraphs: [
        'Коли акретором у тісній парі є нейтронна зоря або чорна діра, система стає ' +
        'потужним джерелом рентгенівського випромінювання. Акреційний диск розігрівається ' +
        'до десятків мільйонів кельвінів — настільки, що основна частина випромінювання ' +
        'припадає на рентгенівський діапазон. Такі системи поділяють на два класи за масою ' +
        'зорі-донора.',

        'У **рентгенівських подвійних з малою масою** (низькомасових рентгенівських подвійних) ' +
        'донор — зоря з масою менше одної-двох сонячних мас, часто ядерно еволюціонована. ' +
        'Перенесення маси відбувається через заповнення частки Роша і є відносно повільним. ' +
        'Ці системи довго живуть і накопичують акрецію роками. Нейтронні зорі в таких системах ' +
        'можуть розкручуватися до мілісекундних пульсарів завдяки переданому кутовому моменту.',

        'У **рентгенівських подвійних з великою масою** (масивних рентгенівських подвійних) ' +
        'донор — масивна зоря типу O або B, яка активно втрачає речовину через зоряний вітер. ' +
        'Частина цього вітру захоплюється компаньйоном — нейтронною зорею або чорною дірою — ' +
        'і живить акрецію без обов\'язкового заповнення частки Роша. Такі системи набагато ' +
        'яскравіші в рентгені і живуть значно менше — мільйони років.',
      ],
    },

    {
      heading: 'Cygnus X-1 і Hercules X-1: перші найважливіші відкриття',
      level: 3,
      paragraphs: [
        '**Cygnus X-1** — перше рентгенове джерело, для якого було накопичено переконливі докази ' +
        'чорної діри. Відкрите в 1960-х роках з ракетних спостережень, воно виявилось системою ' +
        'масивної надгігантської зорі типу O та компактного компаньйона масою близько 21 сонячної. ' +
        'Жодна нейтронна зоря не могла б мати таку масу — і наукова спільнота поступово прийняла ' +
        'інтерпретацію: компаньйон є **чорною дірою**. Cygnus X-1 став першим загальновизнаним ' +
        'кандидатом у чорні діри. У 2021 році гравіметричне перевимірювання системи уточнило ' +
        'масу чорної діри до 21 сонячної маси.',

        '**Hercules X-1** — зовсім інша система. Тут компаньйон є нейтронною зорею — пульсаром, ' +
        'що випромінює регулярні рентгенівські спалахи кожні приблизно 1,24 секунди. Зоря-донор — ' +
        'нормальна зоря близько двох сонячних мас. Система демонструє знамениту «35-добову» ' +
        'прецесію — орбіта акреційного диска повільно прецесує, час від часу перекриваючи ' +
        'нейтронну зорю від спостерігача. Hercules X-1 залишається одним з найвивченіших ' +
        'рентгенових пульсарів у подвійних системах.',
      ],
    },

    {
      image: {
        cacheKey: 'binary-stars-cygx1',
        prompt:
          'Photorealistic scientific illustration of the Cygnus X-1 binary system: ' +
          'a massive blue supergiant star on the left losing stellar wind material, ' +
          'a dark compact black hole on the right surrounded by a glowing blue-white accretion disk and X-ray jet, ' +
          'streams of hot wind material being captured by the black hole gravity. ' +
          'Hard sci-fi style, dark space background, X-ray glow effects in blue and white. ' +
          'Add the following text labels on the image: "Cygnus X-1", "blue supergiant donor", "black hole 21 solar masses", "X-ray accretion disk".',
        alt: 'Система Cygnus X-1 — синій надгігант і чорна діра з акреційним диском, що яскраво сяє в рентгені',
        caption: 'Cygnus X-1 — перший загальновизнаний кандидат у чорні діри. Чорна діра масою близько 21 сонячної маси захоплює речовину із зоряного вітру надгіганта. Система яскраво сяє в рентгенівському діапазоні.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Катаклізмічні змінні: нові, карликові нові й рецидивуючі нові',
      level: 2,
      paragraphs: [
        'Окремий і надзвичайно різноманітний клас тісних подвійних — **катаклізмічні змінні**. ' +
        'У них акретором є **біла карлик** — вуглецево-кисневий або кисневий залишок зорі, що вичерпала ' +
        'ядерне паливо. Донор — зазвичай зоря головної послідовності або субгігант, що заповнює ' +
        'свою частку Роша і повільно поставляє водень на білу карлик через акреційний диск.',

        'На поверхні білої карлики накопичений водень зазнає _термоядерного спалаху_. ' +
        'Тиск і температура зростають до тих пір, поки не починається некерована термоядерна реакція. ' +
        'Яскравість системи різко зростає — у тисячі разів за кілька годин. ' +
        'Спостерігач бачить раптову появу яскравої зорі там, де раніше не було нічого видимого, ' +
        'або різке посилення тьмяного джерела. Це явище давно назвали **новою зорею**. ' +
        'Біла карлик при цьому не руйнується — лише скидає поверхневий шар. ' +
        'Процес починається знову: акреція, накопичення, спалах.',

        '**Карликові нові** — споріднений, але слабкіший феномен. Тут спалах відбувається не ' +
        'на поверхні білої карлики, а в самому акреційному диску через теплову нестійкість. ' +
        'Яскравість зростає на дві-п\'ять зоряних величин і тримається кілька діб перед поверненням ' +
        'до спокійного стану. Цикли повторюються регулярно — від кількох тижнів до кількох місяців.',

        '**Рецидивуючі нові** займають проміжне місце: термоядерні спалахи повторюються протягом ' +
        'людського покоління — раз на десятки років. Це відбувається, коли темп акреції дуже ' +
        'високий і водень накопичується швидко. Якщо маса білої карлики наближається до критичної ' +
        'межі Чандрасекара (приблизно 1,4 сонячної маси), кожен спалах наближає систему до ' +
        'термоядерної катастрофи — вибуху **наднової типу Ia**.',
      ],
    },

    {
      image: {
        cacheKey: 'binary-stars-nova-explosion',
        prompt:
          'Photorealistic scientific illustration of a classical nova explosion in a binary star system: ' +
          'a white dwarf star at center surrounded by an expanding bright shell of ejected hot gas glowing orange-white, ' +
          'the companion star visible at a distance continuing to orbit, ' +
          'accretion disk partially disrupted by the explosion pressure wave. ' +
          'Hard sci-fi style, dark black space background, dramatic lighting from the explosion. ' +
          'Add the following text labels on the image: "white dwarf", "nova shell", "ejected hydrogen", "companion star".',
        alt: 'Спалах класичної нової: біла карлик скидає оболонку термоядерного вибуху в подвійній системі',
        caption: 'Нова зоря — термоядерний вибух на поверхні білої карлики. Накопичений водень спалахує, скидаючи оболонку. Яскравість зростає у тисячі разів за години, потім поступово спадає протягом тижнів або місяців.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Фаза спільної оболонки і шлях до злиття',
      level: 2,
      paragraphs: [
        'Найдраматичніший епізод еволюції тісної подвійної системи — **фаза спільної оболонки**. ' +
        'Вона починається, коли зоря-донор розбухає настільки швидко, що акретор не встигає ' +
        'поглинути масу, що надходить. Зовнішні шари донора огортають обидва компоненти спільною ' +
        'газовою оболонкою. Всередині цієї оболонки ядра обох зір продовжують обертатися, ' +
        'але тертя об газ змушує їх стрімко зближуватись.',

        'Якщо зближення сповільнюється і ядра встигають скинути оболонку — виникає нова тісна ' +
        'подвійна з набагато коротшим орбітальним періодом. Якщо ж ні — ядра зливаються. ' +
        'Результат залежить від мас і початкового розділення. Фаза спільної оболонки є ' +
        '_ключовим механізмом_, що перетворює широкі пари на справжньо тісні подвійні, ' +
        'здатні до злиття протягом космологічного часу.',

        'Подвійна система двох нейтронних зір або двох чорних дір може існувати мільярди ' +
        'або мільярди і ще кілька сотень мільйонів років, поступово стискаючи орбіту через ' +
        'випромінювання _гравітаційних хвиль_. У 2015 році детектор LIGO вперше зафіксував ' +
        'гравітаційні хвилі від злиття двох чорних дір — фінальний акорд довгої еволюції ' +
        'подвійної зоряної системи. У 2017 році зафіксовано злиття двох нейтронних зір, ' +
        'яке супроводжувалося гамма-спалахом і оптичним спалахом — **кілоновою**.',
      ],
    },

    {
      diagram: {
        title: 'Схема: Еволюційний канал подвійної зірки до злиття',
        svg: `<svg viewBox="0 0 680 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="400" fill="rgba(10,15,25,0.5)"/>

  <!-- Arrow marker -->
  <defs>
    <marker id="arr-evo-uk" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>

  <!-- Stage 1: Wide binary -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">Еволюційний канал подвійної зорі</text>

  <!-- Stage boxes -->
  <!-- S1 -->
  <rect x="20" y="40" width="190" height="54" rx="3" fill="rgba(68,136,170,0.12)" stroke="#4488aa" stroke-width="1"/>
  <text x="115" y="60" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">1. Широка пара</text>
  <text x="115" y="75" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">дві зорі головної</text>
  <text x="115" y="87" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">послідовності</text>

  <line x1="210" y1="67" x2="248" y2="67" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-evo-uk)"/>

  <!-- S2 -->
  <rect x="250" y="40" width="190" height="54" rx="3" fill="rgba(255,136,68,0.10)" stroke="#ff8844" stroke-width="1"/>
  <text x="345" y="60" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">2. Донор — червоний</text>
  <text x="345" y="75" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">гігант, заповнює</text>
  <text x="345" y="87" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">частку Роша</text>

  <line x1="440" y1="67" x2="478" y2="67" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-evo-uk)"/>

  <!-- S3 -->
  <rect x="480" y="40" width="180" height="54" rx="3" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1"/>
  <text x="570" y="60" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">3. Спільна оболонка</text>
  <text x="570" y="75" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">орбіта скорочується,</text>
  <text x="570" y="87" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">оболонка скидається</text>

  <!-- Down arrow from S3 -->
  <line x1="570" y1="94" x2="570" y2="130" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-evo-uk)"/>

  <!-- S4: Tight binary with compact object -->
  <rect x="400" y="132" width="340" height="54" rx="3" fill="rgba(123,184,255,0.10)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="570" y="153" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">4. Тісна пара: нормальна зоря</text>
  <text x="570" y="167" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">+ нейтронна зоря або чорна діра</text>
  <text x="570" y="179" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(рентгенова подвійна)</text>

  <!-- Down arrow -->
  <line x1="570" y1="186" x2="570" y2="222" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-evo-uk)"/>

  <!-- S5: Second supernova -->
  <rect x="400" y="224" width="340" height="54" rx="3" fill="rgba(255,136,68,0.10)" stroke="#ff8844" stroke-width="1"/>
  <text x="570" y="244" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">5. Друга наднова або</text>
  <text x="570" y="258" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">термоядерний колапс</text>
  <text x="570" y="270" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">→ двійня компактних об’єктів</text>

  <!-- Down arrow -->
  <line x1="570" y1="278" x2="570" y2="314" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-evo-uk)"/>

  <!-- S6: Merger -->
  <rect x="400" y="316" width="340" height="54" rx="3" fill="rgba(204,68,68,0.15)" stroke="#cc4444" stroke-width="1.5"/>
  <text x="570" y="337" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">6. Злиття через гравітаційні</text>
  <text x="570" y="351" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">хвилі → нейтронна зоря або</text>
  <text x="570" y="363" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">чорна діра (LIGO/Virgo)</text>

  <!-- Left side note: XRB path -->
  <rect x="20" y="132" width="360" height="54" rx="3" fill="rgba(68,136,170,0.08)" stroke="#334455" stroke-width="1"/>
  <text x="200" y="153" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Альтернатива: маса перетікає до</text>
  <text x="200" y="167" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">білої карлики → катаклізмічні змінні,</text>
  <text x="200" y="180" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">нові, рецидивуючі нові → наднова Ia</text>

  <line x1="200" y1="186" x2="200" y2="222" stroke="#334455" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#arr-evo-uk)"/>

  <rect x="20" y="224" width="360" height="38" rx="3" fill="rgba(204,68,68,0.10)" stroke="#cc4444" stroke-width="1"/>
  <text x="200" y="243" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Наднова типу Ia (б. карлик → маса Чандрасекара)</text>
  <text x="200" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Стандартна свічка — основа темної енергії</text>
</svg>`,
        caption:
          'Спрощений еволюційний канал подвійної зоряної системи. Ліворуч — шлях до катаклізмічних змінних і наднової типу Ia; праворуч — шлях до рентгенових подвійних і злиття компактних об\'єктів, що реєструється детекторами гравітаційних хвиль.',
      },
    },

    {
      heading: 'Чому подвійні зорі — єдина пряма вага',
      level: 2,
      paragraphs: [
        'Маса зорі — найфундаментальніший її параметр. Але визначити масу одиночної зорі можна ' +
        'лише опосередковано, через моделі зоряної еволюції. Подвійні системи — єдиний спосіб ' +
        'отримати _пряме_, незалежне від моделей значення.',

        'Третій закон Кеплера зв\'язує орбітальний період і велику піввісь орбіти із сумою мас: ' +
        'більша маса — більша орбітальна швидкість при тому ж розділенні. Для затемнюваної ' +
        'спектроскопічної подвійної, де відомі і форма кривої блиску, і доплерівські швидкості, ' +
        'можна розв\'язати систему рівнянь і отримати маси _кожного_ компонента окремо з точністю ' +
        'кількох відсотків. Саме ці виміри є фундаментом шкали мас зір, на якій будується ' +
        'вся сучасна астрофізика.',
      ],
    },

    {
      image: {
        cacheKey: 'binary-stars-mass-determination',
        prompt:
          'Scientific diagram illustrating mass determination in a double-lined spectroscopic binary: ' +
          'top panel shows two overlapping spectra with shifted absorption lines — one set shifted blue and the other red — ' +
          'with labels indicating radial velocity measurement. ' +
          'Bottom panel shows a radial velocity curve: sinusoidal curves of two stars oscillating opposite each other over one orbital period. ' +
          'Hard sci-fi style, dark background, monospace labels, cyan and orange line colors. ' +
          'Add the following text labels on the image: "Doppler shift", "star 1 velocity", "star 2 velocity", "orbital period".',
        alt: 'Визначення мас у спектроскопічній подвійній: доплерівські зміщення спектрів і крива радіальних швидкостей',
        caption: 'У двохлінійній спектроскопічній подвійній видно спектри обох компонентів. Крива радіальних швидкостей — синусоїдне коливання зміщення ліній — дає орбітальні швидкості, а звідти — маси. Це єдиний прямий метод зважування зір.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Подвійні як джерела гравітаційних хвиль',
      level: 2,
      paragraphs: [
        'Коли два масивних компактних об\'єкти — нейтронні зорі або чорні діри — обертаються ' +
        'один навколо одного, вони деформують простір-час і випромінюють гравітаційні хвилі. ' +
        'Це забирає енергію з орбіти: компоненти повільно зближуються, орбітальний період ' +
        'скорочується. Для типової подвійної нейтронних зір цей процес може тривати сотні ' +
        'мільйонів або мільярди років. У 2015 році детектор LIGO зафіксував перший сигнал від ' +
        'злиття двох чорних дір — GW150914. У 2017 році — злиття двох нейтронних зір, GW170817, ' +
        'що стало першим багатомесенджерним астрономічним спостереженням: гравітаційні хвилі ' +
        'і електромагнітне випромінювання зафіксовані одночасно.',

        'Все це сталось завдяки подвійним зоряним системам. Без мільярдів років еволюції в парі — ' +
        'зближення через спільну оболонку, акреція, що надає орбіті кутовий момент, поступове ' +
        'гравітаційне спіралювання — жодне злиття не відбулось би на вікові Всесвіту. ' +
        'Подвійні зорі — це не просто астрономічний курйоз, а **фабрика подій**, ' +
        'що породжує найпотужніші сигнали у Всесвіті.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Візуальна подвійна',
      definition:
        'Подвійна зоряна система, компоненти якої можна розрізнити в телескоп як дві окремі точки. Орбітальний рух спостерігається протягом десятиліть або сторіч.',
    },
    {
      term: 'Спектроскопічна подвійна',
      definition:
        'Подвійна система, виявлена через доплерівські зміщення спектральних ліній. Компоненти візуально нероздільні, але ритмічне коливання ліній виказує орбітальний рух.',
    },
    {
      term: 'Затемнювана подвійна',
      definition:
        'Система, площина орбіти якої орієнтована вздовж лінії зору, тому компоненти по черзі перекривають один одного. Яскравість регулярно спадає під час затемнень.',
    },
    {
      term: 'Порожнина Роша (частка Роша)',
      definition:
        'Замкнена область гравітаційного впливу кожного з компонентів подвійної системи. Якщо зоря заповнює свою порожнину Роша, речовина починає перетікати до компаньйона.',
    },
    {
      term: 'Акреційний диск',
      definition:
        'Диск перегрітого газу, що по спіралі падає до компактного об\'єкта в подвійній системі. Розігрівається до мільйонів кельвінів і яскраво сяє, найчастіше в рентгенівському діапазоні.',
    },
    {
      term: 'Нова зоря',
      definition:
        'Термоядерний спалах на поверхні білої карлики в катаклізмічній змінній: накопичений водень займається, яскравість зростає у тисячі разів. Біла карлик при цьому не руйнується.',
    },
    {
      term: 'Кілонова',
      definition:
        'Потужний оптичний і інфрачервоний спалах, що супроводжує злиття двох нейтронних зір. Синтезує важкі елементи (золото, платина, уран) через процес швидкого захоплення нейтронів.',
    },
    {
      term: 'Парадокс Алгола',
      definition:
        'Ситуація, коли менш масивна зоря в парі еволюційно старша за масивнішу. Пояснення: спочатку вона була важчою, але передала масу компаньйону через перетікання.',
    },
    {
      term: 'Фаза спільної оболонки',
      definition:
        'Стадія еволюції тісної подвійної, коли зовнішні шари донора огортають обидва компоненти. Тертя об газ зближує ядра і різко скорочує орбітальний період.',
    },
  ],

  quiz: [
    {
      question: 'Який метод є єдиним прямим способом виміряти масу зорі?',
      options: [
        'Аналіз спектрального класу зорі',
        'Вимірювання орбітальної динаміки в подвійній системі',
        'Фотометрія кривої блиску одиночної зорі',
        'Вимірювання власного руху зорі',
      ],
      correctIndex: 1,
      explanation:
        'Третій закон Кеплера в поєднанні з орбітальними параметрами подвійної системи дає масу безпосередньо, без залучення теоретичних моделей зоряної еволюції. Для затемнюваних спектроскопічних подвійних можна визначити маси обох компонентів окремо з точністю кількох відсотків.',
    },
    {
      question: 'Що таке парадокс Алгола?',
      options: [
        'Зоря Алгол пульсує із непоясненою частотою',
        'Менш масивна зоря системи виявляється еволюційно старшою за масивнішу',
        'Алгол є одночасно і спектроскопічною, і затемнюваною подвійною',
        'Алгол надто яскравий для свого спектрального класу',
      ],
      correctIndex: 1,
      explanation:
        'Парадокс у тому, що менш масивна зоря системи Алгол перебуває на стадії субгіганта — тобто вже покинула головну послідовність, хоча за масою мала б еволюціонувати повільніше. Пояснення: вона первісно була важчою, але передала основну масу компаньйону через перетікання.',
    },
    {
      question: 'Чим відрізняється нова зоря від карликової нової в катаклізмічних змінних?',
      options: [
        'Нова знищує білу карлику, карликова нова — ні',
        'Нова — термоядерний спалах на поверхні білої карлики; карликова нова — тепловий спалах в акреційному диску',
        'Карликова нова яскравіша за нову',
        'Нова відбувається лише в системах з нейтронними зорями',
      ],
      correctIndex: 1,
      explanation:
        'У класичній новій займається накопичений водень на поверхні білої карлики — термоядерна реакція. У карликовій новій джерелом є теплова нестійкість в акреційному диску, без участі ядерного горіння. Обидва явища повторюються, але з різними механізмами і масштабами.',
    },
    {
      question: 'Що відбувається під час фази спільної оболонки в тісній подвійній системі?',
      options: [
        'Обидві зорі негайно зливаються і утворюють нейтронну зорю',
        'Зовнішні шари донора огортають обидва компоненти, тертя зближує ядра і скорочує орбіту',
        'Акреційний диск розширюється до розмірів всієї системи',
        'Система розривається на дві одиночні зорі',
      ],
      correctIndex: 1,
      explanation:
        'Коли донор розбухає надто швидко, газ огортає обидва компоненти спільною оболонкою. Ядра спіралюють усередину через аеродинамічне тертя. Якщо оболонка скидається вчасно — залишається дуже тісна пара. Якщо ні — ядра зливаються. Це ключовий процес формування тісних компактних подвійних.',
    },
    {
      question: 'Яка система стала першим загальновизнаним кандидатом у чорні діри?',
      options: [
        'Hercules X-1',
        'Cygnus X-1',
        'Алгол',
        'Sgr A*',
      ],
      correctIndex: 1,
      explanation:
        'Cygnus X-1 — рентгенова подвійна, виявлена у 1960-х роках з ракетних спостережень. Маса компактного компаньйона, визначена через орбітальну динаміку, перевищила будь-яку можливу нейтронну зорю. Cygnus X-1 став першим об\'єктом, для якого наукова спільнота прийняла інтерпретацію «чорна діра».',
    },
  ],

  sources: [
    {
      title: 'Eggleton P.P. — Evolutionary Processes in Binary and Multiple Stars',
      url: 'https://www.cambridge.org/core/books/evolutionary-processes-in-binary-and-multiple-stars/6B7BB8D8D768F3879E9DDD65F6DABB15',
      meta: 'Cambridge University Press, 2006',
    },
    {
      title: 'Abbott B.P. et al. (LIGO) — GW150914: Observation of Gravitational Waves from a Binary Black Hole Merger',
      url: 'https://arxiv.org/abs/1602.03840',
      meta: 'Physical Review Letters, 116, 061102, 2016 (відкритий доступ)',
    },
    {
      title: 'Abbott B.P. et al. (LIGO/Virgo) — GW170817: Observation of Gravitational Waves from a Binary Neutron Star Inspiral',
      url: 'https://arxiv.org/abs/1710.05832',
      meta: 'Physical Review Letters, 119, 161101, 2017 (відкритий доступ)',
    },
    {
      title: 'Miller-Jones J.C.A. et al. — Cygnus X-1 contains a 21-solar mass black hole',
      url: 'https://arxiv.org/abs/2102.09091',
      meta: 'Science, 371, 1046–1049, 2021',
    },
    {
      title: 'Paczynski B. — Common Envelope Binaries',
      url: 'https://ui.adsabs.harvard.edu/abs/1976IAUS...73...75P',
      meta: 'IAU Symposium 73, 1976 — класична робота',
    },
    {
      title: 'Warner B. — Cataclysmic Variable Stars',
      url: 'https://www.cambridge.org/core/books/cataclysmic-variable-stars/A6A4B6C45BAAE4B2FAB9C5CDD65D5E66',
      meta: 'Cambridge University Press, 1995 (перевидано 2003)',
    },
    {
      title: 'Podsiadlowski Ph. — The Evolution of Binary Systems',
      url: 'https://arxiv.org/abs/astro-ph/0006076',
      meta: 'arXiv:astro-ph/0006076, оглядова стаття',
    },
    {
      title: 'NASA HEASARC — X-Ray Binaries Catalog',
      url: 'https://heasarc.gsfc.nasa.gov/W3Browse/all/xrbcat.html',
      meta: 'NASA High Energy Astrophysics Science Archive Research Center',
    },
    {
      title: 'Tauris T.M., van den Heuvel E.P.J. — Formation and Evolution of Compact Stellar X-ray Sources',
      url: 'https://arxiv.org/abs/astro-ph/0303456',
      meta: 'arXiv:astro-ph/0303456, огляд 2003',
    },
    {
      title: 'Struve O. — Some Observations on the Binary Star Algol',
      url: 'https://ui.adsabs.harvard.edu/abs/1941ApJ....93..104S',
      meta: 'Astrophysical Journal, 93, 104, 1941 — класична робота про парадокс Алгола',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
