import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'soyuz',
  language: 'uk',
  section: 'crewed-missions',
  order: 3,
  difficulty: 'beginner',
  readingTimeMin: 12,
  title: 'Союз — російський робочий кінь',
  subtitle: 'Найдовша пілотована програма в історії: від катастроф 1960-х до єдиного таксі на орбітальну станцію.',

  hero: {
    cacheKey: 'soyuz-hero',
    prompt:
      'Photorealistic illustration of a Soyuz spacecraft in orbit for a science encyclopedia. ' +
      'The spacecraft is shown in three-quarter view: spherical orbital module at front, bell-shaped descent module in center, cylindrical service module with two large solar panel wings at rear. ' +
      'Earth curvature visible below, deep black space background with star field. ' +
      'Hard sci-fi style, technically accurate geometry, dramatic lighting from sunlight catching the solar panels. ' +
      'Add the following text labels on the image: "orbital module", "descent module", "service module", "solar panels".',
    alt: 'Космічний корабель Союз на орбіті — три модулі: орбітальний відсік, спускний апарат і агрегатний відсік із сонячними батареями',
    caption:
      'Союз у тривимірному ракурсі на орбіті. Три чітко розрізнені секції разом важать близько семи тонн і вміщують екіпаж із трьох осіб. Попри всі модернізації за шість десятиліть, загальна архітектура залишилась незмінною — і саме це свідчить про правильність вихідного рішення.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'У серпні 2020 року американський астронавт повернувся на Землю в тісній кулі з горілим щитом, що плюхнулась у казахстанський степ. Посадка на парашуті, пил і порожнеча навколо. Жодної злітно-посадкової смуги, жодного флоту підбору в океані. Цей корабель — Союз — тоді був єдиним засобом доставки людей на Міжнародну космічну станцію та повернення з неї. Він залишався таким дев\'ять років поспіль після того, як американські шатли пішли у відставку.',

        'Союз — не найвишуканіша машина. Він тісний, спартанський і пахне кабіною літака з 1960-х. Але він літає. Більше ста п\'ятдесяти пілотованих місій без єдиної втрати екіпажу після двох катастрофічних аварій, які змінили підхід до безпеки назавжди. Це — найдовша безперервна пілотована програма в історії космонавтики. Жоден інший пілотований корабель не пропрацював навіть половину цього терміну.',

        'Щоб зрозуміти, чому Союз досі в строю, треба зрозуміти, що він таке насправді: не проривна технологія, а ретельно відпрацьована ідея, доведена до ступеня надійності, якої не досягли значно дорожчі системи.',
      ],
    },

    {
      image: {
        cacheKey: 'soyuz-launch-baikonur',
        prompt:
          'Photorealistic illustration of a Soyuz rocket launching from Baikonur Cosmodrome for a science encyclopedia. ' +
          'Side view of the green-painted Soyuz launch vehicle on the pad at moment of ignition: four strap-on boosters with RD-107 engines igniting in orange flame, exhaust cloud billowing across the steppe. ' +
          'Dawn lighting, flat Kazakh steppe horizon visible. Hard sci-fi style, dark sky background. ' +
          'Add the following text labels on the image: "Soyuz launch vehicle", "RD-107 engines", "four strap-on boosters", "Baikonur".',
        alt: 'Ракета Союз стартує з Байконуру — чотири бічних блоки з двигунами РД-107 у момент запалення',
        caption:
          'Союз стартує з Байконуру. Чотири бічних блоки-прискорювачі з двигунами РД-107 запалюються одночасно з центральним блоком. Байконур — перший у світі космодром і місце запуску Гагаріна в 1961 році. Росія продовжує орендувати його у Казахстану.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Три модулі і одна ідея',
      level: 2,
      paragraphs: [
        'Союз складається з трьох модулів, кожен з яких виконує окрему функцію і фізично відокремлюється від решти перед посадкою.',

        '**Орбітальний відсік** — куляста секція на носі корабля. Під час польоту він слугує додатковим простором для відпочинку і роботи. Через нього проходить люк для стикування з іншим кораблем або станцією. Перед поверненням на Землю цей модуль відстрілюється і згорає в атмосфері.',

        '**Спускний апарат** — центральна дзвоноподібна капсула. Це єдина частина корабля, яка повертається на Землю. Всередині — три крісла екіпажу і системи керування. Корпус вкритий абляційним теплозахисним щитом, який випаровується і відводить тепло від тертя об атмосферу. Наприкінці спуску спрацьовують гальмівні ракетні двигуни — безпосередньо перед контактом із землею, щоб пом\'якшити удар. Саме тому посадка Союзу — це не плюх у воду, а удар об степ на невеликій швидкості.',

        '**Агрегатний відсік** — циліндрична кормова секція з головним ракетним двигуном для маневрів на орбіті, системами орієнтації та двома розкладними сонячними батареями. Він теж відстрілюється і згорає в атмосфері разом з орбітальним відсіком. На Землю повертається тільки спускний апарат.',

        'Ця триланкова архітектура — продуманий інженерний компроміс. Замість того щоб нести надлишкові теплозахисні матеріали і потужний двигун у спускній капсулі, функції розподілені між модулями: кожен виконує свою роботу, а потім іде на дно атмосфери або залишається на орбіті. Результат — мінімальна маса спускного апарата, а значить менший тепловий удар при вході і легша посадка.',
      ],
    },

    {
      diagram: {
        title: 'Три модулі корабля Союз',
        svg: `<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Архітектура Союз: три модулі</text>

  <!-- Orbital Module (sphere, leftmost) -->
  <circle cx="120" cy="140" r="52" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="120" y="136" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Орбітальний</text>
  <text x="120" y="150" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">відсік</text>
  <!-- Docking port on nose -->
  <rect x="60" y="135" width="14" height="10" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="67" y="120" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">стиковка</text>

  <!-- Connecting tunnel -->
  <rect x="172" y="133" width="22" height="14" fill="none" stroke="#334455" stroke-width="1"/>

  <!-- Descent Module (bell shape, center) -->
  <path d="M194,105 L300,105 L315,175 L179,175 Z" fill="none" stroke="#ff8844" stroke-width="1.5"/>
  <text x="247" y="136" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Спускний</text>
  <text x="247" y="150" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">апарат</text>
  <!-- Heat shield indicator -->
  <line x1="194" y1="175" x2="315" y2="175" stroke="#cc4444" stroke-width="3"/>
  <text x="254" y="192" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">тепловий щит</text>
  <!-- Retro rockets -->
  <line x1="194" y1="168" x2="180" y2="185" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="315" y1="168" x2="329" y2="185" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="254" y="215" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">гальмівні двигуни</text>

  <!-- Connecting tunnel -->
  <rect x="315" y="118" width="18" height="24" fill="none" stroke="#334455" stroke-width="1"/>

  <!-- Service Module (cylinder, rightmost) -->
  <rect x="333" y="105" width="170" height="70" fill="none" stroke="#44ff88" stroke-width="1.5"/>
  <text x="418" y="136" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Агрегатний</text>
  <text x="418" y="150" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">відсік</text>

  <!-- Solar panels (extending from service module) -->
  <rect x="503" y="68" width="100" height="22" fill="none" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,2"/>
  <rect x="503" y="190" width="100" height="22" fill="none" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="553" y="64" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">сонячна батарея</text>
  <text x="553" y="228" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">сонячна батарея</text>

  <!-- Main engine -->
  <path d="M503,120 L520,120 L528,140 L503,140 Z" fill="none" stroke="#44ff88" stroke-width="1.5"/>
  <text x="543" y="133" fill="#44ff88" font-family="monospace" font-size="9">головний</text>
  <text x="543" y="144" fill="#44ff88" font-family="monospace" font-size="9">двигун</text>

  <!-- Labels: what returns to Earth -->
  <text x="350" y="252" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">На Землю повертається ТІЛЬКИ спускний апарат. Решта згорає в атмосфері.</text>

  <!-- Burn arrows for orbital and service module -->
  <line x1="120" y1="195" x2="120" y2="240" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="120" y="252" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">згорає</text>
  <line x1="418" y1="177" x2="418" y2="240" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="418" y="252" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">згорає</text>
</svg>`,
        caption:
          'Три модулі Союзу і їхня доля. Орбітальний і агрегатний відсіки відстрілюються перед входом в атмосферу і згорають. На Землю повертається лише спускний апарат — він і є тим самим «наконечником кулі», що пробиває атмосферу.',
      },
    },

    {
      heading: 'Від ескізу до катастрофи: перші роки',
      level: 2,
      paragraphs: [
        'Союз задумувався в середині двадцятого століття як інструмент для польоту до Місяця. Радянська програма потребувала корабля, здатного зістиковуватись на орбіті, переводити екіпаж між апаратами і повертати їх додому. Перші безпілотні випробування показали безліч проблем: короткі замикання, відмови парашутних систем, збої в орієнтації.',

        'У квітні 1967 року Союз-1 вирушив у перший пілотований рейс із космонавтом Володимиром Комаровим на борту. Вже на орбіті виникли серйозні збої: одна сонячна батарея не розкрилась, система орієнтації давала збої. Місію вирішили достроково завершити. При поверненні на Землю головний парашут заплутався і не розкрився повністю. Союз-1 вдарився об землю зі смертоносною швидкістю. Комаров загинув. Він став першою людиною, яка загинула під час космічного польоту.',

        'Програму зупинили на вісімнадцять місяців. Інженери провели тисячі перевірок і внесли сотні змін. Коли польоти відновились, Союз був вже суттєво іншим. Але справжнє потрясіння ще чекало попереду.',
      ],
    },

    {
      image: {
        cacheKey: 'soyuz-descent-module-landing',
        prompt:
          'Photorealistic illustration of a Soyuz descent module landing in the Kazakh steppe for a science encyclopedia. ' +
          'Bell-shaped charred descent capsule hanging under three large orange-and-white parachutes, moments before touchdown on flat brown steppe. ' +
          'Small retrorocket exhaust jets firing from the bottom of the capsule to slow the final descent. ' +
          'Recovery helicopters visible in the background. Hard sci-fi style, clear sky, golden steppe light. ' +
          'Add the following text labels on the image: "descent module", "main parachutes", "retrorockets firing", "recovery crew".',
        alt: 'Спускний апарат Союз під трьома парашутами над казахстанським степом — гальмівні двигуни запалюються перед торканням землі',
        caption:
          'Фінальні секунди посадки: гальмівні ракетні двигуни спрацьовують за долю секунди до торкання, знижуючи вертикальну швидкість з приблизно восьми до двох метрів на секунду. Екіпаж відчуває удар, еквівалентний падінню зі стільця.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Трагедія Союзу-11 і народження сучасного скафандра',
      level: 2,
      paragraphs: [
        'У червні 1971 року Союз-11 доставив екіпаж на першу орбітальну станцію — Салют-1. Георгій Добровольський, Владислав Волков і Віктор Пацаєв провели на станції двадцять чотири доби — рекорд на той час. Повернення виглядало штатним: капсула правильно відстрілила, правильно загальмувала, правильно розкрила парашут. Коли рятувальники відкрили люк — всередині три нерухомі постаті. Весь екіпаж загинув від декомпресії.',

        'Розслідування виявило: при розстикуванні передчасно відкрився вентиляційний клапан. Тиск у спускному апараті впав за тридцять секунд. Виживання в таких умовах неможливе. Екіпаж не носив скафандрів під час виведення і повернення — вважалось, що в кабіні тиск забезпечується автоматично. Союз-11 показав, що це хибна впевненість.',

        'Після цієї катастрофи правило стало залізним: екіпаж завжди носить скафандри під час запуску, стикування, розстикування і посадки. Це правило діє донині — і не тільки на Союзі. Місія Аполлон-1, що також спричинила загибель трьох астронавтів через пожежу в капсулі під час наземних випробувань 1967 року, і Союз-11 разом переписали стандарти безпеки пілотованої космонавтики назавжди.',
      ],
    },

    {
      heading: 'Аполлон — Союз: рукостискання в космосі',
      level: 2,
      paragraphs: [
        'У липні 1975 року відбулась подія, що стала символом розрядки холодної війни. Американський Apollo і радянський Союз зістикувались на орбіті. Астронавти і космонавти потиснули руки через перехідний відсік. Трансляція на весь світ. Це був перший міжнародний пілотований політ в історії, і перша спільна місія двох наддержав.',

        'Проєкт Аполлон — Союз — офіційна назва місії — мав і практичний вимір. Обидві сторони напрацювали стандарти сумісного стикувального вузла, щоб у надзвичайній ситуації один корабель міг прийти на допомогу іншому. Ця ідея — рятувальна сумісність — стала основою, на якій через чверть століття побудовано Міжнародну космічну станцію.',

        'Після 1975 року Союз зосередився на обслуговуванні радянських орбітальних станцій Салют і Мир. Корабель доставляв і змінював екіпажі, підвозив обладнання і слугував рятувальним шлюпом на випадок евакуації. Це надало йому ролі, яка виявилась незамінною: не самостійна місія, а транспортна артерія.',
      ],
    },

    {
      image: {
        cacheKey: 'soyuz-apollo-docking-1975',
        prompt:
          'Photorealistic illustration of the Apollo-Soyuz docking in orbit for a science encyclopedia, July 1975. ' +
          'Two spacecraft shown docked nose-to-nose in orbit: American Apollo command and service module on left (white, conical), Soviet Soyuz on right (green-grey, with cylindrical modules and solar wings). ' +
          'Docking adapter module visible between them. Earth partially visible below. Hard sci-fi style, deep black space. ' +
          'Add the following text labels on the image: "Apollo CSM", "docking adapter", "Soyuz spacecraft", "1975".',
        alt: 'Стикування Apollo та Союз на орбіті в 1975 році — перша міжнародна пілотована місія, символ розрядки холодної війни',
        caption:
          'Союз і Apollo стикуються на орбіті в 1975 році. Проміжний перехідний відсік розроблявся спільно: американські та радянські інженери вперше мусили фізично узгодити стандарти, щоб корабель однієї країни міг прийняти люк іншої.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Дев\'ять років монополії: Союз і станція',
      level: 2,
      paragraphs: [
        'Коли в 1998 році почалось збирання Міжнародної космічної станції, американські шатли несли великі модулі, а Союз — людей. Після відставки шатла в 2011 році і до першого польоту американського Crew Dragon у 2020 році Союз був єдиним засобом доставки астронавтів і космонавтів на станцію. Дев\'ять років. Кожен американський, японський, канадський і європейський астронавт, що летів на станцію в цей період, робив це на радянському кораблі, спроєктованому ще в 1960-х.',

        'Ціна квитка в ці роки зросла з близько двадцяти мільйонів доларів до більш ніж вісімдесяти мільйонів за місце. Це і є ціна монополії та відсутності альтернативи. Коли Crew Dragon вперше повіз астронавтів у 2020 році, квитки на Союз впали в ціні — не тому що він погіршав, а тому що з\'явилась конкуренція.',

        'Сьогодні Росія продовжує експлуатувати Союз для доставки власних космонавтів та окремих іноземних гостей. Сучасна версія, відома як Союз-МС, отримала в середині 2010-х оновлену авіоніку, покращені системи навігації та більш ефективні сонячні батареї. Зовні — той самий силует. Всередині — суміш спадщини та цифрових систем.',
      ],
    },

    {
      diagram: {
        title: 'Ключові місії Союзу: 1967–2020',
        svg: `<svg viewBox="0 0 700 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="230" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Хронологія програми Союз</text>

  <!-- Timeline axis -->
  <line x1="50" y1="110" x2="660" y2="110" stroke="#334455" stroke-width="2"/>

  <!-- Year markers on axis -->
  <text x="50" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1967</text>
  <text x="148" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1971</text>
  <text x="210" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1975</text>
  <text x="290" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1986</text>
  <text x="380" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1998</text>
  <text x="490" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2011</text>
  <text x="580" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2016</text>
  <text x="648" y="128" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2020</text>

  <!-- Tick marks -->
  <line x1="50" y1="106" x2="50" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="148" y1="106" x2="148" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="210" y1="106" x2="210" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="290" y1="106" x2="290" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="380" y1="106" x2="380" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="490" y1="106" x2="490" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="580" y1="106" x2="580" y2="114" stroke="#334455" stroke-width="1.5"/>
  <line x1="648" y1="106" x2="648" y2="114" stroke="#334455" stroke-width="1.5"/>

  <!-- Events above line (successes/milestones in blue/green) -->
  <!-- 1967 first flight -->
  <line x1="50" y1="110" x2="50" y2="68" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="50" y="62" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">Союз-1</text>
  <text x="50" y="53" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">ЗАГИБЕЛЬ</text>
  <text x="50" y="44" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">Комарова</text>

  <!-- 1971 Soyuz 11 disaster -->
  <line x1="148" y1="110" x2="148" y2="68" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="148" y="62" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">Союз-11</text>
  <text x="148" y="53" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">ДЕКОМП-</text>
  <text x="148" y="44" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">РЕСІЯ</text>

  <!-- 1975 ASTP -->
  <line x1="210" y1="110" x2="210" y2="72" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="210" y="66" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">Аполлон-</text>
  <text x="210" y="57" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">Союз</text>

  <!-- 1986 Mir -->
  <line x1="290" y1="110" x2="290" y2="72" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="290" y="66" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">Мир:</text>
  <text x="290" y="57" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">такcі</text>

  <!-- 1998 ISS -->
  <line x1="380" y1="110" x2="380" y2="72" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="380" y="66" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">МКС</text>
  <text x="380" y="57" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">старт</text>

  <!-- 2011 Shuttle retirement -->
  <line x1="490" y1="110" x2="490" y2="72" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="490" y="66" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">Шатл</text>
  <text x="490" y="57" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">відходить</text>

  <!-- 2016 Soyuz-MS -->
  <line x1="580" y1="110" x2="580" y2="72" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="580" y="66" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">Союз-МС</text>
  <text x="580" y="57" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">нова версія</text>

  <!-- 2020 Crew Dragon -->
  <line x1="648" y1="110" x2="648" y2="72" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="648" y="66" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">Crew</text>
  <text x="648" y="57" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">Dragon</text>

  <!-- Era bar: Shuttle era monopoly -->
  <rect x="490" y="140" width="158" height="14" fill="#ff8844" opacity="0.4"/>
  <text x="569" y="151" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Монополія Союзу (2011–2020)</text>

  <!-- Era bar: Salyut/Mir era -->
  <rect x="50" y="155" width="330" height="14" fill="#7bb8ff" opacity="0.25"/>
  <text x="215" y="166" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Ера Салют і Мир</text>

  <!-- Era bar: ISS era -->
  <rect x="380" y="155" width="268" height="14" fill="#44ff88" opacity="0.2"/>
  <text x="514" y="166" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Ера МКС</text>
</svg>`,
        caption:
          'Шістдесят років програми Союз. Дві катастрофи в 1967–1971 роках повністю змінили підхід до безпеки. Дев\'ять років монополії після відставки шатла (2011–2020) показали незамінність корабля. Сьогодні Союз продовжує польоти паралельно з Crew Dragon.',
      },
    },

    {
      heading: 'Чому старий дизайн досі летить',
      level: 2,
      paragraphs: [
        'Парадокс Союзу в тому, що його вік — одночасно слабкість і сила. Конструкція, розроблена у двадцятому столітті, не використовує можливостей сучасної електроніки, матеріалознавства або аддитивного виробництва. Але саме тому кожна окрема система перевірена тисячами годин польоту, сотнями відмов і сотнями виправлень. Коли система відмовляє — інженери вже знають чому. Це називається _зрілістю конструкції_.',

        'Порівняйте з шатлом: сто тридцять п\'ять польотів, дві катастрофи, кожна місія коштувала більше мільярда доларів, а сам апарат виявився настільки складним, що кожен наступний старт вимагав масштабного обслуговування. Союз простіший і дешевший — не тому що він гірший, а тому що простота сама по собі є надійністю.',

        'Є ще одна причина. Союз спочатку спроєктований як корабель для доставки людей на станцію і назад. Він не намагається бути першим ступенем, посадочним апаратом і розвідником одночасно, як шатл. Одна функція, виконана добре, завжди надійніша за десять функцій, виконаних посередньо.',
      ],
    },

    {
      image: {
        cacheKey: 'soyuz-ms-modern-version',
        prompt:
          'Photorealistic illustration of a modern Soyuz-MS spacecraft in orbit for a science encyclopedia. ' +
          'The spacecraft shown in three-quarter view with upgraded digital avionics bays visible through the service module, larger more efficient solar panels, and updated navigation sensor cluster on the orbital module. ' +
          'Earth visible below. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "Soyuz-MS", "upgraded avionics", "navigation sensors", "improved solar panels".',
        alt: 'Сучасний Союз-МС на орбіті — оновлена авіоніка, покращені сонячні батареї і нові навігаційні датчики',
        caption:
          'Союз-МС — версія корабля з середини 2010-х. Оновлена цифрова авіоніка замінила аналогові прилади, нові сонячні батареї дають більше потужності, а система GPS і ГЛОНАСС замінила радіонавігацію. Зовні корабель майже не змінився.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Майбутнє: чи є наступник',
      level: 2,
      paragraphs: [
        'Роскосмос десятиліттями оголошує про розробку корабля-наступника. В різний час він мав назву Кліпер, Русь і Орел (раніше відомий як Федерація). Орел — амбітний проєкт багатоцільового корабля на шість осіб з можливістю посадки на Місяць. Станом на початок 2020-х він перебуває в стадії розробки, але через брак фінансування і міжнародні санкції, введені після 2022 року, темпи програми залишаються невизначеними.',

        'Тим часом Союз продовжує літати. Незалежно від того, коли і чи з\'явиться Орел у серійному виробництві, Союз забезпечує Росії незалежний доступ до орбіти вже сьогодні. В умовах геополітичної нестабільності це не дрібниця.',

        'Що Союз залишає після себе, навіть коли його замінять? По-перше — стандарт: трьохмодульна архітектура вплинула на проєктування багатьох пізніших кораблів. По-друге — культуру: підхід до тестування, резервування систем і навчання екіпажів, відпрацьований на Союзі, став базовою нормою пілотованої космонавтики. По-третє — прецедент: він показав, що простий, надійний і неефектний корабель може пережити набагато складніші і дорожчі конкуренти.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Орбітальний відсік',
      definition:
        'Сферична передня секція Союзу, що слугує додатковим простором для екіпажу і місцем стикування. Відстрілюється і згорає в атмосфері перед поверненням капсули на Землю.',
    },
    {
      term: 'Спускний апарат',
      definition:
        'Центральна дзвоноподібна капсула Союзу — єдина частина, що повертається на Землю. Захищена абляційним тепловим щитом і приземляється на парашуті з гальмівними ракетними двигунами.',
    },
    {
      term: 'Агрегатний відсік',
      definition:
        'Кормова циліндрична секція Союзу з головним двигуном для орбітальних маневрів і сонячними батареями. Відстрілюється і згорає в атмосфері разом з орбітальним відсіком.',
    },
    {
      term: 'Стикування',
      definition:
        'З\'єднання двох космічних апаратів у польоті на орбіті. Дозволяє передачу вантажів, переведення екіпажу або механічне кріплення одного апарата до іншого. Союз є вузловим елементом стикувань з орбітальними станціями від Салюту до МКС.',
    },
    {
      term: 'Абляційний теплозахисний щит',
      definition:
        'Матеріал, що покриває дно спускного апарата і захищає його від нагрівання при вході в атмосферу. При цьому матеріал поступово випаровується — абляція — забираючи тепло з поверхні капсули.',
    },
    {
      term: 'Декомпресія',
      definition:
        'Різке падіння тиску в герметичному відсіку. У разі Союзу-11 в 1971 році відкриття вентиляційного клапана при розстикуванні призвело до декомпресії та загибелі трьох космонавтів.',
    },
    {
      term: 'Аполлон — Союз',
      definition:
        'Перша міжнародна пілотована місія: стикування американського Apollo і радянського Союзу на орбіті в 1975 році. Символ дипломатичної розрядки і прецедент міжнародної космічної співпраці.',
    },
    {
      term: 'Союз-МС',
      definition:
        'Сучасна версія корабля, що дебютувала в середині 2010-х. Отримала оновлену цифрову авіоніку, системи навігації GPS і ГЛОНАСС та більш ефективні сонячні батареї. Зовнішня форма залишилась незмінною.',
    },
    {
      term: 'Зріла конструкція',
      definition:
        'Інженерна концепція: система, яка пройшла численні цикли відмов і виправлень, є надійнішою, ніж нова, бо більшість несправностей вже відомі. Союз — класичний приклад зрілої конструкції в пілотованій космонавтиці.',
    },
  ],

  quiz: [
    {
      question: 'Яка частина корабля Союз повертається на Землю?',
      options: [
        'Весь корабель цілком — всі три модулі разом',
        'Тільки спускний апарат — орбітальний і агрегатний відсіки згорають в атмосфері',
        'Орбітальний відсік і спускний апарат, агрегатний залишається на орбіті',
        'Тільки агрегатний відсік зі своїми сонячними батареями',
      ],
      correctIndex: 1,
      explanation:
        'Трьохмодульна архітектура Союзу дозволяє мінімізувати масу спускного апарата: орбітальний і агрегатний відсіки відстрілюються перед входом в атмосферу і згорають. На Землю повертається тільки центральна капсула з екіпажем і тепловим щитом.',
    },
    {
      question: 'Чому після катастрофи Союзу-11 у 1971 році було введено обов\'язкове носіння скафандрів?',
      options: [
        'Через метеоритну небезпеку під час відкритого космосу',
        'Тому що відкрився вентиляційний клапан при розстикуванні, і декомпресія вбила весь екіпаж',
        'Через відмову системи терморегуляції, яка перегріла кабіну',
        'Через помилку ручного керування при вході в атмосферу',
      ],
      correctIndex: 1,
      explanation:
        'Союз-11 загинув через неконтрольоване відкриття вентиляційного клапана при розстикуванні від станції Салют-1. Тиск у спускному апараті впав за тридцять секунд. Після цього скафандри стали обов\'язковими на всіх етапах польоту з підвищеним ризиком — і це правило збережено донині.',
    },
    {
      question: 'Що таке проєкт Аполлон — Союз 1975 року і чому він важливий?',
      options: [
        'Перший пілотований польот до Місяця з американсько-радянським екіпажем',
        'Перша міжнародна пілотована місія: стикування двох кораблів в орбіті як символ розрядки холодної війни',
        'Спільний американо-радянський проєкт розробки нового двигуна для міжпланетних польотів',
        'Рятувальна місія: Apollo прилетів забрати екіпаж зі зламаного Союзу',
      ],
      correctIndex: 1,
      explanation:
        'Аполлон — Союз 1975 року — перша в історії спільна пілотована місія двох країн. Вона заклала стандарти сумісного стикувального вузла і культуру міжнародної космічної співпраці, яка пізніше стала основою програми МКС.',
    },
    {
      question: 'Скільки років Союз був єдиним засобом доставки людей на МКС після відставки американського шатла?',
      options: [
        'Два роки — до першого пілотованого старту SpaceX Dragon у 2013 році',
        'П\'ять років — до першого комерційного рейсу Boeing Starliner у 2016 році',
        'Дев\'ять років — з 2011 до першого пілотованого польоту Crew Dragon у 2020 році',
        'Чотирнадцять років — Crew Dragon вперше полетів тільки у 2025 році',
      ],
      correctIndex: 2,
      explanation:
        'Американський шатл здійснив останній рейс у 2011 році. Перший пілотований старт SpaceX Crew Dragon відбувся в травні 2020 року. Протягом цих дев\'яти років Союз залишався єдиним засобом доставки астронавтів будь-якої країни на Міжнародну космічну станцію.',
    },
    {
      question: 'Яка основна конструктивна перевага Союзу, що забезпечує його надійність після шести десятиліть польотів?',
      options: [
        'Використання найновіших матеріалів і технологій у кожному новому поколінні',
        'Зріла конструкція: простота і тисячі годин польоту, де кожна відома несправність виправлена',
        'Найкращий тепловий щит серед усіх пілотованих кораблів в історії',
        'Автоматична система посадки, що не вимагає участі екіпажу',
      ],
      correctIndex: 1,
      explanation:
        'Надійність Союзу — це не результат сучасних технологій, а наслідок зрілості конструкції. За шість десятиліть польотів інженери виявили і виправили практично всі типові несправності. Простота системи додатково знижує кількість можливих точок відмови.',
    },
  ],

  sources: [
    {
      title: 'NASA — Soyuz Spacecraft: Overview and History',
      url: 'https://www.nasa.gov/mission/soyuz/',
      meta: 'NASA, відкритий доступ, оновлено 2024',
    },
    {
      title: 'Encyclopedia Astronautica — Soyuz (all variants)',
      url: 'http://www.astronautix.com/s/soyuz.html',
      meta: 'Astronautix, відкритий доступ',
    },
    {
      title: 'NASA — Apollo-Soyuz Test Project (ASTP) Mission Summary',
      url: 'https://www.nasa.gov/mission/apollo-soyuz-test-project/',
      meta: 'NASA History Division, відкритий доступ',
    },
    {
      title: 'Siddiqi A. — Challenge to Apollo: The Soviet Union and the Space Race',
      url: 'https://history.nasa.gov/SP-4408pt1.pdf',
      meta: 'NASA History Series, SP-4408, відкритий доступ PDF',
    },
    {
      title: 'ESA — Soyuz at the Guiana Space Centre: technical description',
      url: 'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Soyuz_at_the_Guiana_Space_Centre',
      meta: 'ESA, відкритий доступ',
    },
    {
      title: 'NASA — Soyuz 1 and Soyuz 11: Accident Investigation Reports',
      url: 'https://history.nasa.gov/Apollo204/zaccrpt.pdf',
      meta: 'NASA History, відкритий доступ',
    },
    {
      title: 'Harland D. — The Story of Space Station Mir',
      url: 'https://link.springer.com/book/9780387230023',
      meta: 'Springer-Praxis, 2005',
    },
    {
      title: 'Roscosmos — Soyuz-MS: Technical Characteristics',
      url: 'https://www.roscosmos.ru/spacecraft/soyuz-ms/',
      meta: 'Роскосмос, офіційний сайт',
    },
    {
      title: 'NASA — Commercial Crew Program: Boeing and SpaceX milestones',
      url: 'https://www.nasa.gov/commercial-crew-program/',
      meta: 'NASA CCP, відкритий доступ, оновлено 2024',
    },
    {
      title: 'Zak A. — Russian Space Web: Soyuz spacecraft history',
      url: 'http://www.russianspaceweb.com/soyuz.html',
      meta: 'RussianSpaceWeb, відкритий доступ',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
