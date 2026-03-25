import type { TopicCategory, TopicCategoryId } from '../types/education.js';

export const TOPIC_CATEGORIES: TopicCategory[] = [
  // ─────────────────────────────────────────────────────────
  // 1. АСТРОНОМІЯ — 42 уроки
  // ─────────────────────────────────────────────────────────
  {
    id: 'astro',
    nameUk: 'Астрономія',
    nameEn: 'Astronomy',
    subcategories: [
      {
        id: 'astro.stellar-classification',
        nameUk: 'Класифікація зірок',
        nameEn: 'Stellar Classification',
        lessons: [
          { id: 'astro.stellar.o-class', nameUk: 'Зірки класу O: блакитні гіпергіганти', nameEn: 'O-class: Blue hypergiants', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.b-class', nameUk: 'Зірки класу B: блакитно-білі гіганти', nameEn: 'B-class: Blue-white giants', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.a-class', nameUk: 'Зірки класу A: білі зірки', nameEn: 'A-class: White stars', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.f-class', nameUk: 'Зірки класу F: жовто-білі зірки', nameEn: 'F-class: Yellow-white stars', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.g-class', nameUk: 'Зірки класу G: жовті карлики', nameEn: 'G-class: Yellow dwarfs (our Sun)', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.k-class', nameUk: 'Зірки класу K: оранжеві карлики', nameEn: 'K-class: Orange dwarfs', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.m-class', nameUk: 'Зірки класу M: червоні карлики', nameEn: 'M-class: Red dwarfs', gameTags: ['spectralClass', 'star', 'temperature'], prerequisites: [] },
          { id: 'astro.stellar.hr-diagram', nameUk: 'Діаграма Герцшпрунга-Рассела', nameEn: 'Hertzsprung-Russell diagram', gameTags: ['spectralClass', 'luminosity', 'temperature'], prerequisites: ['astro.stellar.g-class'] },
        ],
      },
      {
        id: 'astro.stellar-evolution',
        nameUk: 'Еволюція зірок',
        nameEn: 'Stellar Evolution',
        lessons: [
          { id: 'astro.evolution.formation', nameUk: 'Народження зірки з молекулярної хмари', nameEn: 'Star formation from molecular clouds', gameTags: ['star', 'formation'], prerequisites: [] },
          { id: 'astro.evolution.main-sequence', nameUk: 'Головна послідовність', nameEn: 'Main sequence lifetime', gameTags: ['star', 'lifetime', 'luminosity'], prerequisites: ['astro.evolution.formation'] },
          { id: 'astro.evolution.red-giant', nameUk: 'Фаза червоного гіганта', nameEn: 'Red giant phase', gameTags: ['star', 'evolution'], prerequisites: ['astro.evolution.main-sequence'] },
          { id: 'astro.evolution.white-dwarf', nameUk: 'Білі карлики', nameEn: 'White dwarfs', gameTags: ['star', 'remnant'], prerequisites: ['astro.evolution.red-giant'] },
          { id: 'astro.evolution.neutron-star', nameUk: 'Нейтронні зірки та пульсари', nameEn: 'Neutron stars and pulsars', gameTags: ['star', 'remnant', 'density'], prerequisites: ['astro.evolution.red-giant'] },
          { id: 'astro.evolution.supernova', nameUk: 'Наднові зірки', nameEn: 'Supernovae', gameTags: ['star', 'explosion', 'nucleosynthesis'], prerequisites: ['astro.evolution.red-giant'] },
          { id: 'astro.evolution.black-hole-stellar', nameUk: 'Чорні діри зоряного походження', nameEn: 'Stellar black holes', gameTags: ['star', 'black-hole', 'gravity'], prerequisites: ['astro.evolution.supernova'] },
        ],
      },
      {
        id: 'astro.binary-stars',
        nameUk: 'Подвійні зоряні системи',
        nameEn: 'Binary and Multiple Star Systems',
        lessons: [
          { id: 'astro.binary.orbits', nameUk: 'Орбіти подвійних зірок', nameEn: 'Binary star orbits', gameTags: ['star', 'orbit', 'gravity'], prerequisites: [] },
          { id: 'astro.binary.eclipsing', nameUk: 'Затемнювальні подвійні зірки', nameEn: 'Eclipsing binaries', gameTags: ['star', 'observation', 'luminosity'], prerequisites: ['astro.binary.orbits'] },
          { id: 'astro.binary.triple', nameUk: 'Потрійні зоряні системи', nameEn: 'Triple star systems', gameTags: ['star', 'orbit'], prerequisites: ['astro.binary.orbits'] },
          { id: 'astro.binary.habitable', nameUk: 'Зони придатності в подвійних системах', nameEn: 'Habitable zones in binary systems', gameTags: ['habitability', 'star', 'orbit'], prerequisites: ['astro.binary.orbits'] },
        ],
      },
      {
        id: 'astro.observational',
        nameUk: 'Спостережна астрономія',
        nameEn: 'Observational Astronomy',
        lessons: [
          { id: 'astro.obs.em-spectrum', nameUk: 'Електромагнітний спектр в астрономії', nameEn: 'Electromagnetic spectrum in astronomy', gameTags: ['observation', 'light', 'wavelength'], prerequisites: [] },
          { id: 'astro.obs.optical-telescope', nameUk: 'Оптичні телескопи та роздільна здатність', nameEn: 'Optical telescopes and resolution', gameTags: ['observation', 'telescope'], prerequisites: [] },
          { id: 'astro.obs.radio-telescope', nameUk: 'Радіотелескопи', nameEn: 'Radio telescopes', gameTags: ['observation', 'telescope', 'radio'], prerequisites: ['astro.obs.em-spectrum'] },
          { id: 'astro.obs.infrared-xray', nameUk: 'Інфрачервона та рентгенівська астрономія', nameEn: 'Infrared and X-ray astronomy', gameTags: ['observation', 'telescope'], prerequisites: ['astro.obs.em-spectrum'] },
          { id: 'astro.obs.spectroscopy', nameUk: 'Спектроскопія: читаємо світло зірок', nameEn: 'Spectroscopy: reading starlight', gameTags: ['observation', 'spectralClass', 'composition'], prerequisites: ['astro.obs.em-spectrum'] },
          { id: 'astro.obs.parallax', nameUk: 'Паралакс та вимірювання відстаней', nameEn: 'Parallax and distance measurement', gameTags: ['observation', 'distance'], prerequisites: [] },
          { id: 'astro.obs.redshift', nameUk: 'Червоне та синє зміщення', nameEn: 'Redshift and blueshift', gameTags: ['observation', 'velocity', 'doppler'], prerequisites: ['astro.obs.spectroscopy'] },
        ],
      },
      {
        id: 'astro.solar-system',
        nameUk: 'Сонячна система',
        nameEn: 'Solar System Tour',
        lessons: [
          { id: 'astro.solar.mercury', nameUk: 'Меркурій: світ екстремальних температур', nameEn: 'Mercury: extreme temperature world', gameTags: ['planet', 'temperature', 'rocky'], prerequisites: [] },
          { id: 'astro.solar.venus', nameUk: 'Венера: парниковий ефект без контролю', nameEn: 'Venus: runaway greenhouse', gameTags: ['planet', 'atmosphere', 'greenhouse'], prerequisites: [] },
          { id: 'astro.solar.mars', nameUk: 'Марс: червона пустеля', nameEn: 'Mars: the red desert', gameTags: ['planet', 'rocky', 'water'], prerequisites: [] },
          { id: 'astro.solar.jupiter', nameUk: 'Юпітер: король газових гігантів', nameEn: 'Jupiter: king of gas giants', gameTags: ['planet', 'gas-giant', 'moons'], prerequisites: [] },
          { id: 'astro.solar.saturn', nameUk: 'Сатурн: володар кілець', nameEn: 'Saturn: ringed wonder', gameTags: ['planet', 'gas-giant', 'rings'], prerequisites: [] },
          { id: 'astro.solar.ice-giants', nameUk: 'Уран та Нептун: крижані гіганти', nameEn: 'Uranus and Neptune: ice giants', gameTags: ['planet', 'ice-giant'], prerequisites: [] },
          { id: 'astro.solar.dwarf-planets', nameUk: 'Карликові планети: Плутон, Церера, Еріда', nameEn: 'Dwarf planets (Pluto, Ceres, Eris)', gameTags: ['planet', 'classification'], prerequisites: [] },
          { id: 'astro.solar.asteroids-kuiper', nameUk: 'Астероїди та пояс Койпера', nameEn: 'Asteroids and the Kuiper Belt', gameTags: ['asteroid', 'debris'], prerequisites: [] },
        ],
      },
      {
        id: 'astro.constellations',
        nameUk: 'Сузір\'я та навігація',
        nameEn: 'Constellations and Navigation',
        lessons: [
          { id: 'astro.nav.coordinates', nameUk: 'Небесні координатні системи', nameEn: 'Celestial coordinate systems', gameTags: ['navigation', 'coordinates'], prerequisites: [] },
          { id: 'astro.nav.star-navigation', nameUk: 'Навігація за зірками', nameEn: 'Navigating by stars', gameTags: ['navigation'], prerequisites: ['astro.nav.coordinates'] },
          { id: 'astro.nav.zodiac', nameUk: 'Зодіакальні сузір\'я', nameEn: 'Zodiac constellations', gameTags: ['constellation'], prerequisites: [] },
          { id: 'astro.nav.notable', nameUk: 'Відомі незодіакальні сузір\'я', nameEn: 'Notable non-zodiac constellations', gameTags: ['constellation'], prerequisites: [] },
        ],
      },
      {
        id: 'astro.time',
        nameUk: 'Час і календар',
        nameEn: 'Time and Calendar Astronomy',
        lessons: [
          { id: 'astro.time.sidereal', nameUk: 'Сидеричний та сонячний день', nameEn: 'Sidereal vs solar day', gameTags: ['time', 'rotation'], prerequisites: [] },
          { id: 'astro.time.seasons', nameUk: 'Пори року та нахил осі', nameEn: 'Seasons and axial tilt', gameTags: ['orbit', 'tilt', 'seasons'], prerequisites: [] },
          { id: 'astro.time.lunar', nameUk: 'Місячні фази та затемнення', nameEn: 'Lunar phases and eclipses', gameTags: ['moon', 'orbit'], prerequisites: [] },
          { id: 'astro.time.leap', nameUk: 'Високосні роки та системи календарів', nameEn: 'Leap years and calendar systems', gameTags: ['time', 'calendar'], prerequisites: ['astro.time.sidereal'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 2. АСТРОФІЗИКА — 35 уроків
  // ─────────────────────────────────────────────────────────
  {
    id: 'astrophys',
    nameUk: 'Астрофізика',
    nameEn: 'Astrophysics',
    subcategories: [
      {
        id: 'astrophys.gravity',
        nameUk: 'Гравітація та орбітальна механіка',
        nameEn: 'Gravity and Orbital Mechanics',
        lessons: [
          { id: 'astrophys.grav.newton', nameUk: 'Закон всесвітнього тяжіння Ньютона', nameEn: "Newton's law of gravity", gameTags: ['gravity', 'force', 'mass'], prerequisites: [] },
          { id: 'astrophys.grav.kepler1', nameUk: 'Перший закон Кеплера: еліптичні орбіти', nameEn: "Kepler's first law (elliptical orbits)", gameTags: ['orbit', 'ellipse'], prerequisites: ['astrophys.grav.newton'] },
          { id: 'astrophys.grav.kepler2', nameUk: 'Другий закон Кеплера: рівні площі', nameEn: "Kepler's second law (equal areas)", gameTags: ['orbit', 'velocity'], prerequisites: ['astrophys.grav.kepler1'] },
          { id: 'astrophys.grav.kepler3', nameUk: 'Третій закон Кеплера: період-відстань', nameEn: "Kepler's third law (period-distance)", gameTags: ['orbit', 'period', 'distance'], prerequisites: ['astrophys.grav.kepler2'] },
          { id: 'astrophys.grav.escape', nameUk: 'Швидкість втечі', nameEn: 'Escape velocity', gameTags: ['gravity', 'velocity', 'atmosphere'], prerequisites: ['astrophys.grav.newton'] },
          { id: 'astrophys.grav.orbital-velocity', nameUk: 'Орбітальна швидкість та кругові орбіти', nameEn: 'Orbital velocity and circular orbits', gameTags: ['orbit', 'velocity'], prerequisites: ['astrophys.grav.kepler1'] },
          { id: 'astrophys.grav.lagrange', nameUk: 'Точки Лагранжа', nameEn: 'Lagrange points', gameTags: ['orbit', 'gravity', 'stability'], prerequisites: ['astrophys.grav.kepler3'] },
          { id: 'astrophys.grav.tidal', nameUk: 'Припливні сили та припливне блокування', nameEn: 'Tidal forces and tidal locking', gameTags: ['gravity', 'tidal', 'moon'], prerequisites: ['astrophys.grav.newton'] },
        ],
      },
      {
        id: 'astrophys.radiation',
        nameUk: 'Світло і випромінювання',
        nameEn: 'Light and Radiation',
        lessons: [
          { id: 'astrophys.rad.stefan-boltzmann', nameUk: 'Закон Стефана-Больцмана: світність зірок', nameEn: 'Stefan-Boltzmann law (stellar luminosity)', gameTags: ['luminosity', 'temperature', 'radiation'], prerequisites: [] },
          { id: 'astrophys.rad.wien', nameUk: 'Закон зміщення Віна: пік випромінювання', nameEn: "Wien's displacement law (peak wavelength)", gameTags: ['temperature', 'wavelength', 'color'], prerequisites: [] },
          { id: 'astrophys.rad.blackbody', nameUk: 'Випромінювання абсолютно чорного тіла', nameEn: 'Blackbody radiation', gameTags: ['radiation', 'spectrum'], prerequisites: ['astrophys.rad.wien'] },
          { id: 'astrophys.rad.inverse-square', nameUk: 'Закон обернених квадратів для світла', nameEn: 'Inverse square law of light', gameTags: ['luminosity', 'distance'], prerequisites: [] },
          { id: 'astrophys.rad.doppler', nameUk: 'Ефект Доплера в астрономії', nameEn: 'Doppler effect in astronomy', gameTags: ['velocity', 'observation', 'spectrum'], prerequisites: [] },
          { id: 'astrophys.rad.cmb', nameUk: 'Реліктове випромінювання (CMB)', nameEn: 'Cosmic microwave background', gameTags: ['cosmology', 'radiation', 'big-bang'], prerequisites: ['astrophys.rad.blackbody'] },
        ],
      },
      {
        id: 'astrophys.nuclear',
        nameUk: 'Ядерна фізика зірок',
        nameEn: 'Nuclear Physics of Stars',
        lessons: [
          { id: 'astrophys.nuc.pp-chain', nameUk: 'Протон-протонний ланцюг: синтез водню', nameEn: 'Hydrogen fusion (pp-chain)', gameTags: ['fusion', 'star', 'energy'], prerequisites: [] },
          { id: 'astrophys.nuc.cno', nameUk: 'CNO-цикл', nameEn: 'CNO cycle', gameTags: ['fusion', 'star', 'mass'], prerequisites: ['astrophys.nuc.pp-chain'] },
          { id: 'astrophys.nuc.triple-alpha', nameUk: 'Потрійний альфа-процес: горіння гелію', nameEn: 'Triple-alpha process (helium burning)', gameTags: ['fusion', 'star', 'evolution'], prerequisites: ['astrophys.nuc.pp-chain'] },
          { id: 'astrophys.nuc.nucleosynthesis', nameUk: 'Нуклеосинтез важких елементів', nameEn: 'Nucleosynthesis of heavy elements', gameTags: ['elements', 'star', 'supernova'], prerequisites: ['astrophys.nuc.triple-alpha'] },
          { id: 'astrophys.nuc.emc2', nameUk: 'E=mc2 та еквівалентність маси-енергії', nameEn: 'E=mc2 and mass-energy equivalence', gameTags: ['energy', 'mass', 'relativity'], prerequisites: [] },
        ],
      },
      {
        id: 'astrophys.relativity',
        nameUk: 'Теорія відносності',
        nameEn: 'Relativity',
        lessons: [
          { id: 'astrophys.rel.special', nameUk: 'Основи спеціальної теорії відносності', nameEn: 'Special relativity basics', gameTags: ['relativity', 'light-speed'], prerequisites: ['astrophys.nuc.emc2'] },
          { id: 'astrophys.rel.time-dilation', nameUk: 'Розтягування часу', nameEn: 'Time dilation', gameTags: ['relativity', 'time'], prerequisites: ['astrophys.rel.special'] },
          { id: 'astrophys.rel.length-contraction', nameUk: 'Скорочення довжини', nameEn: 'Length contraction', gameTags: ['relativity', 'space'], prerequisites: ['astrophys.rel.special'] },
          { id: 'astrophys.rel.general', nameUk: 'Загальна відносність та викривлення простору-часу', nameEn: 'General relativity and spacetime curvature', gameTags: ['relativity', 'gravity', 'spacetime'], prerequisites: ['astrophys.rel.special'] },
        ],
      },
      {
        id: 'astrophys.em-phenomena',
        nameUk: 'Електромагнітні явища',
        nameEn: 'Electromagnetic Phenomena',
        lessons: [
          { id: 'astrophys.em.magnetic-fields', nameUk: 'Магнітні поля планет і зірок', nameEn: 'Magnetic fields of planets and stars', gameTags: ['magneticField', 'planet', 'star'], prerequisites: [] },
          { id: 'astrophys.em.solar-wind', nameUk: 'Сонячний вітер та магнітосфера', nameEn: 'Solar wind and magnetosphere', gameTags: ['star', 'magneticField', 'radiation'], prerequisites: ['astrophys.em.magnetic-fields'] },
          { id: 'astrophys.em.aurora', nameUk: 'Механізм полярного сяйва', nameEn: 'Aurora borealis mechanism', gameTags: ['magneticField', 'atmosphere'], prerequisites: ['astrophys.em.solar-wind'] },
          { id: 'astrophys.em.synchrotron', nameUk: 'Синхротронне випромінювання', nameEn: 'Synchrotron radiation', gameTags: ['radiation', 'magneticField'], prerequisites: ['astrophys.em.magnetic-fields'] },
          { id: 'astrophys.em.cosmic-rays', nameUk: 'Космічні промені', nameEn: 'Cosmic rays', gameTags: ['radiation', 'high-energy'], prerequisites: [] },
        ],
      },
      {
        id: 'astrophys.dark',
        nameUk: 'Темний Всесвіт',
        nameEn: 'Dark Universe',
        lessons: [
          { id: 'astrophys.dark.dark-matter', nameUk: 'Докази існування темної матерії', nameEn: 'Dark matter evidence', gameTags: ['dark-matter', 'gravity', 'galaxy'], prerequisites: [] },
          { id: 'astrophys.dark.dark-energy', nameUk: 'Темна енергія та прискорення розширення', nameEn: 'Dark energy and accelerating expansion', gameTags: ['dark-energy', 'cosmology', 'expansion'], prerequisites: [] },
          { id: 'astrophys.dark.gravitational-lensing', nameUk: 'Гравітаційне лінзування', nameEn: 'Gravitational lensing', gameTags: ['gravity', 'light', 'relativity'], prerequisites: ['astrophys.rel.general'] },
          { id: 'astrophys.dark.missing-mass', nameUk: 'Проблема втраченої маси', nameEn: 'Missing mass problem', gameTags: ['dark-matter', 'gravity', 'galaxy'], prerequisites: ['astrophys.dark.dark-matter'] },
        ],
      },
      {
        id: 'astrophys.high-energy',
        nameUk: 'Високоенергетична астрофізика',
        nameEn: 'High-Energy Astrophysics',
        lessons: [
          { id: 'astrophys.he.grb', nameUk: 'Гамма-спалахи', nameEn: 'Gamma-ray bursts', gameTags: ['high-energy', 'radiation'], prerequisites: [] },
          { id: 'astrophys.he.agn', nameUk: 'Активні ядра галактик', nameEn: 'Active galactic nuclei', gameTags: ['galaxy', 'black-hole', 'high-energy'], prerequisites: [] },
          { id: 'astrophys.he.gravitational-waves', nameUk: 'Гравітаційні хвилі', nameEn: 'Gravitational waves', gameTags: ['gravity', 'relativity', 'detection'], prerequisites: ['astrophys.rel.general'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 3. ПЛАНЕТОЛОГІЯ — 38 уроків
  // ─────────────────────────────────────────────────────────
  {
    id: 'plansci',
    nameUk: 'Планетологія',
    nameEn: 'Planetary Science',
    subcategories: [
      {
        id: 'plansci.formation',
        nameUk: 'Формування планет',
        nameEn: 'Planet Formation',
        lessons: [
          { id: 'plansci.form.protoplanetary', nameUk: 'Протопланетний диск', nameEn: 'Protoplanetary disk', gameTags: ['formation', 'disk', 'star'], prerequisites: [] },
          { id: 'plansci.form.accretion', nameUk: 'Процес акреції', nameEn: 'Accretion process', gameTags: ['formation', 'growth'], prerequisites: ['plansci.form.protoplanetary'] },
          { id: 'plansci.form.rocky-vs-gas', nameUk: 'Утворення скелястих та газових планет', nameEn: 'Rocky vs gas planet formation', gameTags: ['formation', 'planetType'], prerequisites: ['plansci.form.accretion'] },
          { id: 'plansci.form.migration', nameUk: 'Міграція молодих планет', nameEn: 'Migration of young planets', gameTags: ['orbit', 'formation'], prerequisites: ['plansci.form.accretion'] },
          { id: 'plansci.form.bombardment', nameUk: 'Пізнє важке бомбардування', nameEn: 'Late heavy bombardment', gameTags: ['impact', 'formation'], prerequisites: ['plansci.form.accretion'] },
        ],
      },
      {
        id: 'plansci.types',
        nameUk: 'Типи планет',
        nameEn: 'Planet Types and Classification',
        lessons: [
          { id: 'plansci.type.rocky', nameUk: 'Скелясті (земного типу) планети', nameEn: 'Rocky/terrestrial planets', gameTags: ['planetType', 'rocky', 'surface'], prerequisites: [] },
          { id: 'plansci.type.gas-giant', nameUk: 'Газові гіганти', nameEn: 'Gas giants', gameTags: ['planetType', 'gas-giant', 'atmosphere'], prerequisites: [] },
          { id: 'plansci.type.ice-giant', nameUk: 'Крижані гіганти', nameEn: 'Ice giants', gameTags: ['planetType', 'ice-giant'], prerequisites: [] },
          { id: 'plansci.type.super-earth', nameUk: 'Суперземлі', nameEn: 'Super-Earths', gameTags: ['planetType', 'rocky', 'mass'], prerequisites: ['plansci.type.rocky'] },
          { id: 'plansci.type.hot-jupiter', nameUk: 'Гарячі Юпітери', nameEn: 'Hot Jupiters', gameTags: ['planetType', 'gas-giant', 'orbit'], prerequisites: ['plansci.type.gas-giant'] },
          { id: 'plansci.type.rogue', nameUk: 'Бродячі планети', nameEn: 'Rogue planets', gameTags: ['planet', 'ejection'], prerequisites: [] },
        ],
      },
      {
        id: 'plansci.atmospheres',
        nameUk: 'Атмосфери',
        nameEn: 'Atmospheres',
        lessons: [
          { id: 'plansci.atm.composition', nameUk: 'Основи складу атмосфери', nameEn: 'Atmospheric composition basics', gameTags: ['atmosphere', 'composition'], prerequisites: [] },
          { id: 'plansci.atm.pressure', nameUk: 'Атмосферний тиск та висота', nameEn: 'Atmospheric pressure and altitude', gameTags: ['atmosphere', 'pressure'], prerequisites: ['plansci.atm.composition'] },
          { id: 'plansci.atm.greenhouse', nameUk: 'Парниковий ефект', nameEn: 'Greenhouse effect', gameTags: ['atmosphere', 'temperature', 'greenhouse'], prerequisites: ['plansci.atm.composition'] },
          { id: 'plansci.atm.albedo', nameUk: 'Альбедо та енергетичний баланс', nameEn: 'Albedo and energy balance', gameTags: ['temperature', 'albedo', 'radiation'], prerequisites: [] },
          { id: 'plansci.atm.escape', nameUk: 'Атмосферна втеча та утримання газів', nameEn: 'Atmospheric escape and gas retention', gameTags: ['atmosphere', 'gravity', 'escape-velocity'], prerequisites: ['astrophys.grav.escape'] },
          { id: 'plansci.atm.clouds', nameUk: 'Хмари та погода на інших світах', nameEn: 'Clouds and weather on other worlds', gameTags: ['atmosphere', 'weather'], prerequisites: ['plansci.atm.composition'] },
          { id: 'plansci.atm.spectroscopy', nameUk: 'Спектроскопія атмосфер екзопланет', nameEn: 'Atmospheric spectroscopy (exoplanet atmospheres)', gameTags: ['observation', 'atmosphere', 'exoplanet'], prerequisites: ['astro.obs.spectroscopy'] },
        ],
      },
      {
        id: 'plansci.surfaces',
        nameUk: 'Поверхні та геологія',
        nameEn: 'Surfaces and Geology',
        lessons: [
          { id: 'plansci.geo.tectonics', nameUk: 'Тектоніка плит', nameEn: 'Plate tectonics', gameTags: ['surface', 'geology'], prerequisites: [] },
          { id: 'plansci.geo.volcanism', nameUk: 'Вулканізм в Сонячній системі та за її межами', nameEn: 'Volcanism across the solar system', gameTags: ['surface', 'volcanism', 'heat'], prerequisites: [] },
          { id: 'plansci.geo.craters', nameUk: 'Ударні кратери', nameEn: 'Impact craters', gameTags: ['surface', 'impact'], prerequisites: [] },
          { id: 'plansci.geo.erosion', nameUk: 'Ерозія та вивітрювання', nameEn: 'Erosion and weathering', gameTags: ['surface', 'atmosphere', 'water'], prerequisites: [] },
          { id: 'plansci.geo.timescale', nameUk: 'Геологічні часові шкали', nameEn: 'Geological time scales', gameTags: ['time', 'geology'], prerequisites: [] },
        ],
      },
      {
        id: 'plansci.water',
        nameUk: 'Вода та гідросфери',
        nameEn: 'Water and Hydrospheres',
        lessons: [
          { id: 'plansci.water.phase', nameUk: 'Фазова діаграма води', nameEn: 'Water phase diagram', gameTags: ['water', 'temperature', 'pressure'], prerequisites: [] },
          { id: 'plansci.water.subsurface', nameUk: 'Підповерхневі океани: Європа та Енцелад', nameEn: 'Subsurface oceans (Europa, Enceladus)', gameTags: ['water', 'moon', 'ice'], prerequisites: [] },
          { id: 'plansci.water.ice-caps', nameUk: 'Крижані шапки та зледеніння', nameEn: 'Ice caps and glaciation', gameTags: ['water', 'ice', 'climate'], prerequisites: [] },
          { id: 'plansci.water.cycle', nameUk: 'Водний цикл на Землі та за її межами', nameEn: 'Water cycle on Earth and beyond', gameTags: ['water', 'atmosphere', 'cycle'], prerequisites: [] },
          { id: 'plansci.water.methane-lakes', nameUk: 'Метанові озера Титана', nameEn: 'Liquid methane lakes (Titan)', gameTags: ['water', 'moon', 'methane'], prerequisites: [] },
        ],
      },
      {
        id: 'plansci.moons',
        nameUk: 'Супутники',
        nameEn: 'Moons',
        lessons: [
          { id: 'plansci.moon.types', nameUk: 'Типи супутників: регулярні, нерегулярні, захоплені', nameEn: 'Types of moons (regular, irregular, captured)', gameTags: ['moon', 'orbit', 'formation'], prerequisites: [] },
          { id: 'plansci.moon.tidal-heating', nameUk: 'Припливне нагрівання: Іо та Енцелад', nameEn: 'Tidal heating (Io, Enceladus)', gameTags: ['moon', 'tidal', 'heat'], prerequisites: ['astrophys.grav.tidal'] },
          { id: 'plansci.moon.earths-moon', nameUk: 'Місяць: утворення та еволюція', nameEn: "Earth's Moon: formation and evolution", gameTags: ['moon', 'formation', 'impact'], prerequisites: [] },
          { id: 'plansci.moon.galilean', nameUk: 'Галілеєві супутники Юпітера', nameEn: 'Galilean moons of Jupiter', gameTags: ['moon', 'jupiter'], prerequisites: [] },
          { id: 'plansci.moon.titan', nameUk: 'Титан: супутник з атмосферою', nameEn: 'Titan: a moon with an atmosphere', gameTags: ['moon', 'atmosphere', 'methane'], prerequisites: [] },
        ],
      },
      {
        id: 'plansci.rings',
        nameUk: 'Кільця та уламки',
        nameEn: 'Rings and Debris',
        lessons: [
          { id: 'plansci.rings.saturn', nameUk: 'Система кілець Сатурна', nameEn: "Saturn's ring system", gameTags: ['rings', 'saturn', 'ice'], prerequisites: [] },
          { id: 'plansci.rings.asteroid-belt', nameUk: 'Структура пояса астероїдів', nameEn: 'Asteroid belt structure', gameTags: ['asteroid', 'orbit'], prerequisites: [] },
          { id: 'plansci.rings.comets', nameUk: 'Комети: склад та орбіти', nameEn: 'Comets: composition and orbits', gameTags: ['comet', 'orbit', 'ice'], prerequisites: [] },
        ],
      },
      {
        id: 'plansci.exoplanet-detection',
        nameUk: 'Виявлення екзопланет',
        nameEn: 'Exoplanet Detection',
        lessons: [
          { id: 'plansci.exo.transit', nameUk: 'Транзитний метод', nameEn: 'Transit method', gameTags: ['exoplanet', 'observation', 'luminosity'], prerequisites: [] },
          { id: 'plansci.exo.radial-velocity', nameUk: 'Метод радіальних швидкостей', nameEn: 'Radial velocity method', gameTags: ['exoplanet', 'observation', 'doppler'], prerequisites: ['astrophys.rad.doppler'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 4. АСТРОБІОЛОГІЯ — 22 уроки
  // ─────────────────────────────────────────────────────────
  {
    id: 'astrobio',
    nameUk: 'Астробіологія',
    nameEn: 'Astrobiology',
    subcategories: [
      {
        id: 'astrobio.habitability',
        nameUk: 'Придатність для життя',
        nameEn: 'Habitability',
        lessons: [
          { id: 'astrobio.hab.goldilocks', nameUk: 'Зона придатності: зона Голдилокс', nameEn: 'Habitable zone (Goldilocks zone)', gameTags: ['habitability', 'temperature', 'orbit'], prerequisites: [] },
          { id: 'astrobio.hab.five-factors', nameUk: 'П\'ять факторів придатності для життя', nameEn: 'Five factors of habitability (game model)', gameTags: ['habitability', 'temperature', 'atmosphere', 'water', 'magneticField', 'gravity'], prerequisites: ['astrobio.hab.goldilocks'] },
          { id: 'astrobio.hab.temperature', nameUk: 'Температурні вимоги для життя', nameEn: 'Temperature requirements for life', gameTags: ['habitability', 'temperature'], prerequisites: [] },
          { id: 'astrobio.hab.magnetic', nameUk: 'Магнітне поле як щит для життя', nameEn: 'Magnetic field as life shield', gameTags: ['magneticField', 'radiation', 'habitability'], prerequisites: ['astrophys.em.magnetic-fields'] },
          { id: 'astrobio.hab.gravity', nameUk: 'Поверхнева гравітація та життя', nameEn: 'Surface gravity and life', gameTags: ['gravity', 'habitability', 'atmosphere'], prerequisites: [] },
          { id: 'astrobio.hab.water-solvent', nameUk: 'Вода як універсальний розчинник', nameEn: 'Water as universal solvent', gameTags: ['water', 'chemistry', 'habitability'], prerequisites: [] },
        ],
      },
      {
        id: 'astrobio.origin',
        nameUk: 'Походження життя',
        nameEn: 'Origin of Life',
        lessons: [
          { id: 'astrobio.origin.abiogenesis', nameUk: 'Теорії абіогенезу', nameEn: 'Abiogenesis theories', gameTags: ['life', 'chemistry', 'origin'], prerequisites: [] },
          { id: 'astrobio.origin.miller-urey', nameUk: 'Експеримент Міллера-Юрі', nameEn: 'Miller-Urey experiment', gameTags: ['life', 'chemistry', 'experiment'], prerequisites: ['astrobio.origin.abiogenesis'] },
          { id: 'astrobio.origin.rna-world', nameUk: 'Гіпотеза РНК-світу', nameEn: 'RNA world hypothesis', gameTags: ['life', 'genetics', 'origin'], prerequisites: ['astrobio.origin.abiogenesis'] },
          { id: 'astrobio.origin.panspermia', nameUk: 'Гіпотеза панспермії', nameEn: 'Panspermia hypothesis', gameTags: ['life', 'origin', 'asteroid'], prerequisites: [] },
        ],
      },
      {
        id: 'astrobio.extremophiles',
        nameUk: 'Життя в екстремальних умовах',
        nameEn: 'Life in Extreme Environments',
        lessons: [
          { id: 'astrobio.ext.extremophiles', nameUk: 'Екстремофіли на Землі', nameEn: 'Extremophiles on Earth', gameTags: ['life', 'extremophile', 'adaptation'], prerequisites: [] },
          { id: 'astrobio.ext.deep-sea', nameUk: 'Життя в глибоководних джерелах', nameEn: 'Life in deep sea vents', gameTags: ['life', 'deep-sea', 'chemistry'], prerequisites: ['astrobio.ext.extremophiles'] },
          { id: 'astrobio.ext.tardigrades', nameUk: 'Тардигради та виживання в космосі', nameEn: 'Tardigrades and space survival', gameTags: ['life', 'extremophile', 'space'], prerequisites: ['astrobio.ext.extremophiles'] },
          { id: 'astrobio.ext.under-ice', nameUk: 'Життя під льодом', nameEn: 'Life under ice', gameTags: ['life', 'ice', 'water'], prerequisites: [] },
        ],
      },
      {
        id: 'astrobio.evolution',
        nameUk: 'Еволюція та складність',
        nameEn: 'Evolution and Complexity',
        lessons: [
          { id: 'astrobio.evo.microbial', nameUk: 'Хронологія мікробного життя', nameEn: 'Microbial life timeline', gameTags: ['life', 'evolution', 'time'], prerequisites: [] },
          { id: 'astrobio.evo.multicellular', nameUk: 'Багатоклітинна еволюція', nameEn: 'Multicellular evolution', gameTags: ['life', 'evolution', 'complexity'], prerequisites: ['astrobio.evo.microbial'] },
          { id: 'astrobio.evo.intelligence', nameUk: 'Поява розуму', nameEn: 'Intelligence emergence', gameTags: ['life', 'intelligence', 'evolution'], prerequisites: ['astrobio.evo.multicellular'] },
          { id: 'astrobio.evo.great-filter', nameUk: 'Гіпотеза Великого фільтру', nameEn: 'Great Filter hypothesis', gameTags: ['life', 'fermi-paradox', 'evolution'], prerequisites: ['astrobio.evo.intelligence'] },
        ],
      },
      {
        id: 'astrobio.search',
        nameUk: 'Пошук позаземного життя',
        nameEn: 'Search for Extraterrestrial Life',
        lessons: [
          { id: 'astrobio.search.drake', nameUk: 'Рівняння Дрейка', nameEn: 'Drake equation', gameTags: ['life', 'statistics', 'galaxy'], prerequisites: [] },
          { id: 'astrobio.search.fermi', nameUk: 'Парадокс Фермі', nameEn: 'Fermi paradox', gameTags: ['life', 'paradox', 'intelligence'], prerequisites: ['astrobio.search.drake'] },
          { id: 'astrobio.search.seti', nameUk: 'Програма SETI', nameEn: 'SETI program', gameTags: ['life', 'observation', 'radio'], prerequisites: ['astrobio.search.fermi'] },
          { id: 'astrobio.search.biosignatures', nameUk: 'Біосигнатури в атмосферах екзопланет', nameEn: 'Biosignatures in exoplanet atmospheres', gameTags: ['life', 'atmosphere', 'observation'], prerequisites: ['plansci.atm.spectroscopy'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 5. КОСМІЧНІ ТЕХНОЛОГІЇ — 25 уроків
  // ─────────────────────────────────────────────────────────
  {
    id: 'spacetech',
    nameUk: 'Космічні технології',
    nameEn: 'Space Technology',
    subcategories: [
      {
        id: 'spacetech.propulsion',
        nameUk: 'Ракетний рух',
        nameEn: 'Rocket Propulsion',
        lessons: [
          { id: 'spacetech.prop.newton3', nameUk: 'Третій закон Ньютона та тяга', nameEn: "Newton's third law and thrust", gameTags: ['propulsion', 'force'], prerequisites: [] },
          { id: 'spacetech.prop.tsiolkovsky', nameUk: 'Рівняння Ціолковського', nameEn: 'Tsiolkovsky rocket equation', gameTags: ['propulsion', 'delta-v', 'mass'], prerequisites: ['spacetech.prop.newton3'] },
          { id: 'spacetech.prop.chemical', nameUk: 'Хімічні ракети', nameEn: 'Chemical rockets', gameTags: ['propulsion', 'chemical'], prerequisites: ['spacetech.prop.tsiolkovsky'] },
          { id: 'spacetech.prop.ion', nameUk: 'Іонні двигуни', nameEn: 'Ion propulsion', gameTags: ['propulsion', 'ion', 'efficiency'], prerequisites: ['spacetech.prop.tsiolkovsky'] },
          { id: 'spacetech.prop.nuclear', nameUk: 'Ядерний тепловий рух', nameEn: 'Nuclear thermal propulsion', gameTags: ['propulsion', 'nuclear'], prerequisites: ['spacetech.prop.tsiolkovsky'] },
        ],
      },
      {
        id: 'spacetech.orbital',
        nameUk: 'Орбітальна механіка КА',
        nameEn: 'Orbital Mechanics for Spacecraft',
        lessons: [
          { id: 'spacetech.orb.hohmann', nameUk: 'Гоманівський переліт', nameEn: 'Hohmann transfer orbits', gameTags: ['orbit', 'transfer', 'delta-v'], prerequisites: ['astrophys.grav.kepler1'] },
          { id: 'spacetech.orb.gravity-assist', nameUk: 'Гравітаційний маневр', nameEn: 'Gravity assists', gameTags: ['orbit', 'gravity', 'velocity'], prerequisites: ['spacetech.orb.hohmann'] },
          { id: 'spacetech.orb.leo', nameUk: 'Низька навколоземна орбіта', nameEn: 'Low Earth orbit', gameTags: ['orbit', 'altitude'], prerequisites: [] },
          { id: 'spacetech.orb.geo', nameUk: 'Геостаціонарна орбіта', nameEn: 'Geostationary orbit', gameTags: ['orbit', 'synchronous'], prerequisites: ['spacetech.orb.leo'] },
          { id: 'spacetech.orb.delta-v', nameUk: 'Бюджет delta-v', nameEn: 'Delta-v budget', gameTags: ['delta-v', 'propulsion', 'mission'], prerequisites: ['spacetech.prop.tsiolkovsky'] },
        ],
      },
      {
        id: 'spacetech.stations',
        nameUk: 'Станції та хабітати',
        nameEn: 'Space Stations and Habitats',
        lessons: [
          { id: 'spacetech.station.iss', nameUk: 'Принципи конструкції МКС', nameEn: 'ISS design principles', gameTags: ['station', 'engineering'], prerequisites: [] },
          { id: 'spacetech.station.artificial-gravity', nameUk: 'Концепції штучної гравітації', nameEn: 'Artificial gravity concepts', gameTags: ['station', 'gravity', 'rotation'], prerequisites: [] },
          { id: 'spacetech.station.life-support', nameUk: 'Системи життєзабезпечення (ECLSS)', nameEn: 'Life support systems (ECLSS)', gameTags: ['station', 'life-support', 'atmosphere'], prerequisites: [] },
        ],
      },
      {
        id: 'spacetech.exploration',
        nameUk: 'Планетарні дослідження',
        nameEn: 'Planetary Exploration',
        lessons: [
          { id: 'spacetech.expl.rover', nameUk: 'Конструкція роверів', nameEn: 'Rover design', gameTags: ['exploration', 'rover', 'surface'], prerequisites: [] },
          { id: 'spacetech.expl.edl', nameUk: 'Техніки посадки (EDL)', nameEn: 'Landing techniques (EDL)', gameTags: ['exploration', 'landing', 'atmosphere'], prerequisites: [] },
          { id: 'spacetech.expl.sample-return', nameUk: 'Місії повернення зразків', nameEn: 'Sample return missions', gameTags: ['exploration', 'sample'], prerequisites: ['spacetech.expl.edl'] },
          { id: 'spacetech.expl.flyby-vs-orbiter', nameUk: 'Проліт vs орбітер vs посадка', nameEn: 'Flyby vs orbiter vs lander', gameTags: ['exploration', 'mission-type'], prerequisites: [] },
          { id: 'spacetech.expl.isru', nameUk: 'Використання місцевих ресурсів (ISRU)', nameEn: 'In-situ resource utilization (ISRU)', gameTags: ['exploration', 'resources', 'colonization'], prerequisites: [] },
        ],
      },
      {
        id: 'spacetech.future',
        nameUk: 'Майбутні технології',
        nameEn: 'Future Technologies',
        lessons: [
          { id: 'spacetech.fut.solar-sail', nameUk: 'Сонячне вітрило', nameEn: 'Solar sail propulsion', gameTags: ['propulsion', 'solar', 'photon'], prerequisites: [] },
          { id: 'spacetech.fut.space-elevator', nameUk: 'Концепція космічного ліфта', nameEn: 'Space elevator concept', gameTags: ['engineering', 'orbit'], prerequisites: [] },
          { id: 'spacetech.fut.terraforming', nameUk: 'Основи терраформінгу', nameEn: 'Terraforming basics', gameTags: ['colonization', 'atmosphere', 'habitability'], prerequisites: [] },
          { id: 'spacetech.fut.interstellar', nameUk: 'Виклики міжзоряних подорожей', nameEn: 'Interstellar travel challenges', gameTags: ['interstellar', 'propulsion', 'time'], prerequisites: ['astrophys.rel.time-dilation'] },
        ],
      },
      {
        id: 'spacetech.communication',
        nameUk: 'Зв\'язок',
        nameEn: 'Communication',
        lessons: [
          { id: 'spacetech.comm.dsn', nameUk: 'Deep Space Network', nameEn: 'Deep Space Network', gameTags: ['communication', 'antenna'], prerequisites: [] },
          { id: 'spacetech.comm.light-delay', nameUk: 'Затримка зв\'язку швидкістю світла', nameEn: 'Light-speed communication delay', gameTags: ['communication', 'light-speed', 'distance'], prerequisites: [] },
          { id: 'spacetech.comm.laser', nameUk: 'Лазерний зв\'язок', nameEn: 'Laser communication', gameTags: ['communication', 'laser', 'bandwidth'], prerequisites: [] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 6. КОСМОЛОГІЯ — 20 уроків
  // ─────────────────────────────────────────────────────────
  {
    id: 'cosmo',
    nameUk: 'Космологія',
    nameEn: 'Cosmology',
    subcategories: [
      {
        id: 'cosmo.big-bang',
        nameUk: 'Великий вибух та ранній Всесвіт',
        nameEn: 'Big Bang and Early Universe',
        lessons: [
          { id: 'cosmo.bb.theory', nameUk: 'Теорія Великого вибуху', nameEn: 'Big Bang theory', gameTags: ['cosmology', 'origin'], prerequisites: [] },
          { id: 'cosmo.bb.inflation', nameUk: 'Космічна інфляція', nameEn: 'Cosmic inflation', gameTags: ['cosmology', 'expansion'], prerequisites: ['cosmo.bb.theory'] },
          { id: 'cosmo.bb.first-atoms', nameUk: 'Утворення перших атомів', nameEn: 'Formation of first atoms', gameTags: ['cosmology', 'nucleosynthesis'], prerequisites: ['cosmo.bb.theory'] },
          { id: 'cosmo.bb.first-stars', nameUk: 'Перші зірки (Населення III)', nameEn: 'First stars (Population III)', gameTags: ['star', 'cosmology', 'metallicity'], prerequisites: ['cosmo.bb.first-atoms'] },
          { id: 'cosmo.bb.cmb-origin', nameUk: 'Походження реліктового випромінювання', nameEn: 'Cosmic microwave background origin', gameTags: ['cosmology', 'radiation', 'cmb'], prerequisites: ['cosmo.bb.first-atoms'] },
        ],
      },
      {
        id: 'cosmo.galaxies',
        nameUk: 'Структура галактик',
        nameEn: 'Galaxy Structure',
        lessons: [
          { id: 'cosmo.gal.types', nameUk: 'Типи галактик: спіральні, еліптичні, неправильні', nameEn: 'Galaxy types (spiral, elliptical, irregular)', gameTags: ['galaxy', 'classification'], prerequisites: [] },
          { id: 'cosmo.gal.milky-way', nameUk: 'Структура Чумацького Шляху', nameEn: 'Milky Way structure', gameTags: ['galaxy', 'milky-way'], prerequisites: ['cosmo.gal.types'] },
          { id: 'cosmo.gal.smbh', nameUk: 'Надмасивні чорні діри в центрах галактик', nameEn: 'Supermassive black holes at galaxy centers', gameTags: ['galaxy', 'black-hole', 'mass'], prerequisites: ['cosmo.gal.types'] },
          { id: 'cosmo.gal.collisions', nameUk: 'Зіткнення та злиття галактик', nameEn: 'Galaxy collisions and mergers', gameTags: ['galaxy', 'collision', 'evolution'], prerequisites: ['cosmo.gal.types'] },
          { id: 'cosmo.gal.local-group', nameUk: 'Місцева група та скупчення галактик', nameEn: 'Local group and galaxy clusters', gameTags: ['galaxy', 'cluster'], prerequisites: ['cosmo.gal.types'] },
        ],
      },
      {
        id: 'cosmo.large-scale',
        nameUk: 'Великомасштабна структура',
        nameEn: 'Large-Scale Structure',
        lessons: [
          { id: 'cosmo.ls.cosmic-web', nameUk: 'Космічна павутина: нитки та порожнечі', nameEn: 'Cosmic web (filaments and voids)', gameTags: ['cosmology', 'structure'], prerequisites: ['cosmo.gal.local-group'] },
          { id: 'cosmo.ls.superclusters', nameUk: 'Суперскупчення галактик', nameEn: 'Galaxy superclusters', gameTags: ['galaxy', 'supercluster'], prerequisites: ['cosmo.ls.cosmic-web'] },
          { id: 'cosmo.ls.observable', nameUk: 'Розмір спостережуваного Всесвіту', nameEn: 'Observable universe size', gameTags: ['cosmology', 'distance', 'light-speed'], prerequisites: [] },
          { id: 'cosmo.ls.hubble', nameUk: 'Швидкість розширення: стала Хаббла', nameEn: 'Expansion rate (Hubble constant)', gameTags: ['cosmology', 'expansion', 'velocity'], prerequisites: ['cosmo.bb.theory'] },
        ],
      },
      {
        id: 'cosmo.fate',
        nameUk: 'Доля Всесвіту',
        nameEn: 'Fate of the Universe',
        lessons: [
          { id: 'cosmo.fate.heat-death', nameUk: 'Сценарій теплової смерті', nameEn: 'Heat death scenario', gameTags: ['cosmology', 'thermodynamics', 'entropy'], prerequisites: ['cosmo.ls.hubble'] },
          { id: 'cosmo.fate.big-crunch', nameUk: 'Великий стиск та Великий відскок', nameEn: 'Big Crunch and Big Bounce', gameTags: ['cosmology', 'gravity'], prerequisites: ['cosmo.ls.hubble'] },
          { id: 'cosmo.fate.multiverse', nameUk: 'Теорії мультивсесвіту', nameEn: 'Multiverse theories', gameTags: ['cosmology', 'quantum'], prerequisites: ['cosmo.bb.inflation'] },
        ],
      },
      {
        id: 'cosmo.black-holes',
        nameUk: 'Чорні діри',
        nameEn: 'Black Holes',
        lessons: [
          { id: 'cosmo.bh.schwarzschild', nameUk: 'Радіус Шварцшильда', nameEn: 'Schwarzschild radius', gameTags: ['black-hole', 'gravity', 'radius'], prerequisites: ['astrophys.rel.general'] },
          { id: 'cosmo.bh.hawking', nameUk: 'Випромінювання Гокінга', nameEn: 'Hawking radiation', gameTags: ['black-hole', 'radiation', 'quantum'], prerequisites: ['cosmo.bh.schwarzschild'] },
          { id: 'cosmo.bh.information', nameUk: 'Інформаційний парадокс', nameEn: 'Information paradox', gameTags: ['black-hole', 'quantum', 'paradox'], prerequisites: ['cosmo.bh.hawking'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 7. ОСНОВИ ФІЗИКИ — 18 уроків
  // ─────────────────────────────────────────────────────────
  {
    id: 'physfund',
    nameUk: 'Основи фізики',
    nameEn: 'Physics Fundamentals',
    subcategories: [
      {
        id: 'physfund.mechanics',
        nameUk: 'Механіка',
        nameEn: 'Mechanics',
        lessons: [
          { id: 'physfund.mech.newton-laws', nameUk: 'Закони руху Ньютона', nameEn: "Newton's laws of motion", gameTags: ['mechanics', 'force', 'motion'], prerequisites: [] },
          { id: 'physfund.mech.momentum', nameUk: 'Збереження імпульсу', nameEn: 'Conservation of momentum', gameTags: ['mechanics', 'momentum'], prerequisites: ['physfund.mech.newton-laws'] },
          { id: 'physfund.mech.energy', nameUk: 'Збереження енергії', nameEn: 'Conservation of energy', gameTags: ['energy', 'mechanics'], prerequisites: ['physfund.mech.newton-laws'] },
          { id: 'physfund.mech.angular-momentum', nameUk: 'Момент імпульсу', nameEn: 'Angular momentum', gameTags: ['mechanics', 'rotation', 'orbit'], prerequisites: ['physfund.mech.momentum'] },
        ],
      },
      {
        id: 'physfund.thermodynamics',
        nameUk: 'Термодинаміка',
        nameEn: 'Thermodynamics',
        lessons: [
          { id: 'physfund.thermo.laws', nameUk: 'Закони термодинаміки', nameEn: 'Laws of thermodynamics', gameTags: ['thermodynamics', 'energy', 'entropy'], prerequisites: [] },
          { id: 'physfund.thermo.heat-transfer', nameUk: 'Механізми теплопередачі', nameEn: 'Heat transfer mechanisms', gameTags: ['heat', 'conduction', 'radiation'], prerequisites: ['physfund.thermo.laws'] },
          { id: 'physfund.thermo.entropy', nameUk: 'Ентропія', nameEn: 'Entropy', gameTags: ['entropy', 'thermodynamics', 'disorder'], prerequisites: ['physfund.thermo.laws'] },
          { id: 'physfund.thermo.phase-transitions', nameUk: 'Фазові переходи', nameEn: 'Phase transitions', gameTags: ['phase', 'temperature', 'pressure'], prerequisites: ['physfund.thermo.laws'] },
        ],
      },
      {
        id: 'physfund.waves',
        nameUk: 'Хвилі та оптика',
        nameEn: 'Waves and Optics',
        lessons: [
          { id: 'physfund.wave.properties', nameUk: 'Властивості хвиль: частота, довжина', nameEn: 'Wave properties (frequency, wavelength)', gameTags: ['wave', 'frequency', 'wavelength'], prerequisites: [] },
          { id: 'physfund.wave.em-spectrum', nameUk: 'Спектр електромагнітних хвиль', nameEn: 'Electromagnetic wave spectrum', gameTags: ['wave', 'light', 'spectrum'], prerequisites: ['physfund.wave.properties'] },
          { id: 'physfund.wave.interference', nameUk: 'Інтерференція та дифракція', nameEn: 'Interference and diffraction', gameTags: ['wave', 'optics'], prerequisites: ['physfund.wave.properties'] },
        ],
      },
      {
        id: 'physfund.atomic',
        nameUk: 'Атомна та ядерна фізика',
        nameEn: 'Atomic and Nuclear',
        lessons: [
          { id: 'physfund.atom.structure', nameUk: 'Структура атома', nameEn: 'Atomic structure', gameTags: ['atom', 'electron', 'nucleus'], prerequisites: [] },
          { id: 'physfund.atom.decay-types', nameUk: 'Типи радіоактивного розпаду', nameEn: 'Radioactive decay types', gameTags: ['nuclear', 'decay', 'radiation'], prerequisites: ['physfund.atom.structure'] },
          { id: 'physfund.atom.half-life', nameUk: 'Період напіврозпаду', nameEn: 'Half-life', gameTags: ['nuclear', 'decay', 'time'], prerequisites: ['physfund.atom.decay-types'] },
          { id: 'physfund.atom.fission-fusion', nameUk: 'Ядерний поділ vs синтез', nameEn: 'Nuclear fission vs fusion', gameTags: ['nuclear', 'fusion', 'fission', 'energy'], prerequisites: ['physfund.atom.structure'] },
        ],
      },
      {
        id: 'physfund.units',
        nameUk: 'Одиниці та вимірювання',
        nameEn: 'Units and Measurement',
        lessons: [
          { id: 'physfund.unit.si', nameUk: 'Одиниці SI в космічній науці', nameEn: 'SI units in space science', gameTags: ['units', 'measurement'], prerequisites: [] },
          { id: 'physfund.unit.orders', nameUk: 'Порядки величин в астрономії', nameEn: 'Orders of magnitude in astronomy', gameTags: ['units', 'scale', 'distance'], prerequisites: [] },
          { id: 'physfund.unit.scientific-notation', nameUk: 'Наукова нотація', nameEn: 'Scientific notation', gameTags: ['units', 'notation', 'math'], prerequisites: [] },
        ],
      },
    ],
  },
];

/** Flat list of all lesson IDs for quick lookup */
export function getAllLessonIds(): string[] {
  const ids: string[] = [];
  for (const cat of TOPIC_CATEGORIES) {
    for (const sub of cat.subcategories) {
      for (const lesson of sub.lessons) {
        ids.push(lesson.id);
      }
    }
  }
  return ids;
}

/** Get total lesson count for a category */
export function getCategoryLessonCount(categoryId: TopicCategoryId): number {
  const cat = TOPIC_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return 0;
  let count = 0;
  for (const sub of cat.subcategories) {
    count += sub.lessons.length;
  }
  return count;
}

/** Get total lesson count across all categories */
export function getTotalLessonCount(): number {
  let count = 0;
  for (const cat of TOPIC_CATEGORIES) {
    for (const sub of cat.subcategories) {
      count += sub.lessons.length;
    }
  }
  return count;
}

/** Find a lesson by ID */
export function findLesson(lessonId: string): { category: TopicCategory; subcategory: import('../types/education.js').TopicSubcategory; lesson: import('../types/education.js').TopicLesson } | null {
  for (const cat of TOPIC_CATEGORIES) {
    for (const sub of cat.subcategories) {
      for (const lesson of sub.lessons) {
        if (lesson.id === lessonId) {
          return { category: cat, subcategory: sub, lesson };
        }
      }
    }
  }
  return null;
}

/** Get lessons for specific categories (empty array = all) */
export function getLessonsForCategories(categoryIds: TopicCategoryId[]): import('../types/education.js').TopicLesson[] {
  const lessons: import('../types/education.js').TopicLesson[] = [];
  const cats = categoryIds.length === 0
    ? TOPIC_CATEGORIES
    : TOPIC_CATEGORIES.filter(c => categoryIds.includes(c.id));

  for (const cat of cats) {
    for (const sub of cat.subcategories) {
      lessons.push(...sub.lessons);
    }
  }
  return lessons;
}
