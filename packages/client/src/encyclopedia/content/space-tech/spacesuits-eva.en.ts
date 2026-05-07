import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'spacesuits-eva',
  language: 'en',
  section: 'space-tech',
  order: 8,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Spacesuits and Extravehicular Activity',
  subtitle: 'Why stepping outside a spacecraft is harder than reaching orbit, and what stands between a human body and the vacuum of space.',

  hero: {
    cacheKey: 'spacesuits-eva-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: an astronaut in a white pressurized spacesuit performing extravehicular activity outside a space station, tethered by a safety line, Earth\'s curved horizon visible below, deep black space background with stars. ' +
      'Suit details visible: helmet visor reflecting Earth, portable life support backpack, articulated gloves. ' +
      'Silhouette view from slightly behind, no visible face. Hard sci-fi style, dramatic lighting from sunlight on one side, deep shadow on the other. ' +
      'Add the following text labels on the image: "portable life support", "visor", "tether line", "pressurized suit".',
    alt: 'Astronaut in a spacesuit performing extravehicular activity — Earth on the horizon, safety tether, life support backpack',
    caption:
      'An extravehicular activity is one of the most operationally demanding tasks in crewed spaceflight. Between the human body and absolute vacuum lies a few centimeters of fabric, metal, and hard-won engineering.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The human body was not designed for space. Without protection it loses to vacuum within seconds: ' +
        'blood begins to boil, lungs over-expand, temperature plunges. ' +
        'Those same constraints, paradoxically, gave birth to an engineering marvel — the spacesuit. ' +
        'Not merely a garment. A miniature spacecraft worn on the body.',

        'A suit designed for extravehicular activity — leaving the pressurized interior of a spacecraft — ' +
        'is among the most complex objects produced by the aerospace industry. ' +
        'It must simultaneously withstand internal pressure, reflect solar radiation, ' +
        'absorb micrometeorite impacts, regulate temperature, and still allow a human being to move. ' +
        'Each of those requirements fights the others. Reconciling them is the engineering challenge.',

        'From the mid-twentieth century to the present, roughly twenty distinct spacesuit types have been developed. ' +
        'Most were dead ends. A handful became icons. ' +
        'And today the field is experiencing a second birth: ' +
        'the first commercial extravehicular activity in 2024 opened a new chapter.',
      ],
    },

    {
      heading: 'What stands between a person and vacuum: fourteen layers',
      level: 2,
      paragraphs: [
        'A modern extravehicular suit is not a single material but a stack of fourteen layers, ' +
        'each serving a distinct purpose. Understanding them explains why such a suit weighs over a hundred kilograms ' +
        'and costs upward of ten million dollars.',

        'Closest to the skin sits the liquid cooling and ventilation garment. ' +
        'This is a close-fitting undersuit densely threaded with thin tubes through which chilled water circulates. ' +
        'The logic is straightforward: an astronaut working in a spacesuit generates heat continuously. ' +
        'Without active removal, body temperature would climb to dangerous levels within minutes. ' +
        'The chilled water carries the excess heat to a radiator in the life support backpack.',

        'The next layer is the pressure garment itself — a hermetic shell of urethane-coated nylon or similar materials. ' +
        'Inside it is pressurized to approximately 0.3 atmospheres of pure oxygen. ' +
        'Compare that to the spacecraft cabin, which holds approximately one atmosphere of a mixed-gas atmosphere similar to Earth\'s. ' +
        'This pressure difference sits at the center of one of the central operational problems of extravehicular activity, addressed below.',

        'Over the pressure layer come several layers of aluminized Mylar and Dacron thermal insulation, ' +
        'functioning much like the insulation inside a thermos flask. ' +
        'They retain heat when the suit is in shadow and shield from the solar thermal load in sunlight. ' +
        'The outermost layer is the thermal-micrometeoroid garment: multiple plies of Kevlar, nylon, and Teflon. ' +
        'It will not stop a true meteorite, but it will stop the microscopic particles — sand-grain-sized fragments — ' +
        'that swarm in the near-Earth orbital environment by the billions.',
      ],
    },

    {
      image: {
        cacheKey: 'spacesuits-eva-suit-layers',
        prompt:
          'Scientific cross-section illustration for a science encyclopedia: spacesuit layer diagram showing 14 layers from innermost to outermost. ' +
          'Cut-away view of a suit torso segment, each layer labeled and color-coded. ' +
          'Layers include: liquid cooling garment (blue tubes), pressure bladder (white), ' +
          'ripstop nylon restraint layer (gray mesh), multiple aluminized mylar thermal layers (silver), ' +
          'and outer thermal-micrometeoroid garment of Kevlar-Teflon (white/tan). ' +
          'Hard sci-fi style, dark background, monospace labels, technical diagram aesthetic. ' +
          'Add the following text labels on the image: "liquid cooling", "pressure layer", "thermal insulation", "micrometeoroid protection".',
        alt: 'Cross-section of a spacesuit: fourteen layers from liquid cooling garment to outer micrometeoroid protection',
        caption:
          'Each layer of a spacesuit resolves one specific threat. Together they form a sealed microclimate envelope capable of keeping a person alive in the orbital environment for up to eight hours.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The pressure paradox: too little or too much',
      level: 2,
      paragraphs: [
        'The most delicate engineering problem in spacesuit design is pressure. Too low, the person dies. ' +
        'Too high, the suit balloons into rigidity, joints lock, movement becomes impossible. ' +
        'The usable operating window is remarkably narrow.',

        'American extravehicular suits use a pressure of approximately 0.3 atmospheres of pure oxygen. ' +
        'At that pressure the joints still flex and the body receives adequate oxygen. ' +
        'But this creates a severe physiological problem: decompression sickness.',

        'The spacecraft cabin operates at approximately one atmosphere, where nitrogen is dissolved in the bloodstream — ' +
        'just as it is at sea level on Earth. ' +
        'If a crew member transitions directly to a suit at 0.3 atmospheres, ' +
        'that dissolved nitrogen comes out of solution as bubbles — ' +
        'exactly as carbon dioxide does when a bottle of sparkling water is opened. ' +
        'This is decompression sickness. It can kill or cause permanent neurological damage.',

        'The solution is a pre-breathe protocol: before a spacewalk, ' +
        'the astronaut breathes pure oxygen for several hours, ' +
        'gradually flushing nitrogen out of the bloodstream. ' +
        'The standard protocol on the International Space Station runs approximately four hours. ' +
        'That is a costly investment in mission time. ' +
        'If an emergency extravehicular activity is needed immediately, ' +
        'a higher-pressure suit or a modified pre-breathe at reduced cabin pressure is required — ' +
        'and some newer suit designs address this by raising operating pressure to reduce pre-breathe time.',
      ],
    },

    {
      diagram: {
        title: 'Pressure in a spacesuit versus spacecraft cabin: the extravehicular activity operating window',
        svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Pressure in different environments (atmospheres)</text>

  <!-- Axis -->
  <line x1="80" y1="250" x2="620" y2="250" stroke="#334455" stroke-width="1.5"/>
  <line x1="80" y1="60" x2="80" y2="250" stroke="#334455" stroke-width="1.5"/>

  <!-- Y labels -->
  <text x="70" y="254" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0</text>
  <text x="70" y="202" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0.3</text>
  <text x="70" y="150" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0.6</text>
  <text x="70" y="98" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0.9</text>
  <text x="70" y="68" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1.0</text>

  <!-- Grid lines -->
  <line x1="78" y1="202" x2="620" y2="202" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="78" y1="150" x2="620" y2="150" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="78" y1="98" x2="620" y2="98" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="78" y1="68" x2="620" y2="68" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>

  <!-- Bar: Vacuum -->
  <rect x="100" y="248" width="70" height="2" fill="#cc4444" opacity="0.9"/>
  <text x="135" y="268" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Vacuum</text>
  <text x="135" y="279" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">~0 atm</text>

  <!-- Bar: EMU suit -->
  <rect x="200" y="202" width="70" height="48" fill="#7bb8ff" opacity="0.8"/>
  <text x="235" y="196" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">0.30 atm</text>
  <text x="235" y="268" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">EVA suit</text>
  <text x="235" y="279" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">pure O2</text>

  <!-- Bar: Orlan suit -->
  <rect x="300" y="187" width="70" height="63" fill="#7bb8ff" opacity="0.7"/>
  <text x="335" y="181" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">0.40 atm</text>
  <text x="335" y="268" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Orlan</text>
  <text x="335" y="279" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Russian suit</text>

  <!-- Bar: ISS cabin -->
  <rect x="400" y="68" width="70" height="182" fill="#44ff88" opacity="0.7"/>
  <text x="435" y="62" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">1.0 atm</text>
  <text x="435" y="268" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">ISS cabin</text>
  <text x="435" y="279" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">N2+O2 mix</text>

  <!-- Bar: Earth sea level -->
  <rect x="500" y="68" width="70" height="182" fill="#ff8844" opacity="0.7"/>
  <text x="535" y="62" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">1.0 atm</text>
  <text x="535" y="268" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Earth</text>
  <text x="535" y="279" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">sea level</text>

  <!-- Arrow: pre-breathe zone -->
  <line x1="235" y1="130" x2="435" y2="130" stroke="#cc4444" stroke-width="1.5" stroke-dasharray="5,4"/>
  <text x="335" y="124" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">pre-breathe protocol required</text>
</svg>`,
        caption:
          'The pressure difference between the spacecraft cabin and the suit interior necessitates a multi-hour pre-breathe on pure oxygen before each extravehicular activity. ' +
          'Without it, dissolved nitrogen in the blood forms bubbles — decompression sickness.',
      },
    },

    {
      heading: 'The life support backpack: a small factory worn on the back',
      level: 2,
      paragraphs: [
        'The large white backpack on an astronaut\'s back is neither decoration nor a maneuvering jet. ' +
        'It is an autonomous life support system that makes the crew member independent of the spacecraft ' +
        'for up to eight hours.',

        'Inside the backpack: oxygen tanks, a carbon dioxide scrubber ' +
        '(typically lithium hydroxide canisters or regenerable molecular sieve beds), ' +
        'a pump for the liquid cooling loop, a radiator to dump waste heat into the vacuum, ' +
        'communications hardware, and backup batteries. ' +
        'All critical systems are redundant — because if something goes wrong ' +
        'the astronaut cannot simply open a window.',

        'An eight-hour oxygen supply is the maximum. ' +
        'Real extravehicular activities typically last five to seven hours. ' +
        'An emergency reserve of roughly thirty minutes is held back. ' +
        'If the astronaut cannot return to the airlock in time — the situation is life-threatening. ' +
        'That is why no extravehicular activity is ever performed alone: there is always a buddy system, ' +
        'with one crew member positioned to assist the other.',
      ],
    },

    {
      image: {
        cacheKey: 'spacesuits-eva-plss-backpack',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: detailed rear view of a spacesuit showing the portable life support system backpack in cut-away style. ' +
          'Backpack internals visible: oxygen tanks (blue cylinders), carbon dioxide scrubber (dark rectangular block), ' +
          'water pump and radiator loops (cyan tubing), communication antenna (rod). ' +
          'Spacesuit torso partially visible in white. Hard sci-fi style, dark space background, technical labels. ' +
          'Add the following text labels on the image: "oxygen supply", "CO2 scrubber", "cooling pump", "8-hour capacity".',
        alt: 'Cut-away view of the portable life support system backpack — oxygen tanks, carbon dioxide scrubber, cooling pump',
        caption:
          'The portable life support system backpack weighs over seventy kilograms and contains everything needed to keep a person alive in open space for eight hours. In orbit it weighs nothing — but it remains physically cumbersome throughout every extravehicular activity.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What vacuum actually does to the body: myth versus reality',
      level: 2,
      paragraphs: [
        'Cinema has taught us that a person exposed to vacuum without a suit either explodes or instantly freezes. ' +
        'Both scenarios are fiction. The reality is simultaneously more interesting and more unforgiving.',

        'Vacuum does not explode the body. The body is not a balloon. ' +
        'Muscle and skin are strong enough to contain internal pressure. ' +
        'What actually happens: moisture on exposed mucous membranes and the tongue ' +
        'begins to vaporize and boil — a phenomenon called ebullism. ' +
        'The skin will swell, but not rupture. ' +
        'Blood in deep tissues will not boil: the vascular system maintains sufficient local pressure.',

        'The fastest killer is not pressure or temperature but oxygen deprivation. ' +
        'A person loses consciousness in approximately fifteen seconds — ' +
        'exactly how long it takes for residual oxygen in the blood to run out. ' +
        'Death follows within minutes without intervention. ' +
        'Temperature is another popular misconception. ' +
        'Without convection in vacuum, cooling happens very slowly through thermal radiation alone. ' +
        'If returned to an oxygenated environment within roughly thirty seconds, ' +
        'a person may survive without permanent injury. ' +
        'A real laboratory incident of this type was documented in the late 1960s.',
      ],
    },

    {
      heading: 'Suit evolution: from the Moon to Artemis',
      level: 2,
      paragraphs: [
        'In the mid-twentieth century, humanity began sewing clothing for space. ' +
        'Early suits were stiff and unwieldy — closer to medieval plate armor than to wearable garments. ' +
        'But each program refined the design.',
      ],
    },

    {
      heading: 'The Apollo A7L — a suit for the Moon',
      level: 3,
      paragraphs: [
        'The first suit designed to let humans walk on another world was the A7L, built by ILC Dover ' +
        'for the Apollo program. It debuted on the lunar surface in 1969 and remained in use through 1972. ' +
        'Twelve people walked on the Moon in it.',

        'The A7L had several features specific to lunar conditions: reinforced boot soles, ' +
        'extra thermal shielding against lunar dust, and a design that allowed adjustment ' +
        'to different body sizes. But it could not solve every problem: ' +
        'astronauts returned from the surface coated in fine lunar dust, ' +
        'and the tiny silicate particles worked their way into everything.',
      ],
    },

    {
      heading: 'The extravehicular mobility unit — America\'s orbital workhorse',
      level: 3,
      paragraphs: [
        'The American extravehicular mobility unit, introduced in 1981 alongside the Space Shuttle program, ' +
        'became the definitive workhorse of low Earth orbit. ' +
        'It is modular: different upper and lower sections can be combined to fit different crew members. ' +
        'Aboard the International Space Station it has served as the primary extravehicular suit ' +
        'for more than four decades.',

        'But time takes a toll. The extravehicular mobility units on the International Space Station ' +
        'were designed in the 1970s, and many have exceeded their design service life. ' +
        'Spare parts are no longer manufactured. ' +
        'As of the mid-2020s, NASA is running two parallel replacement efforts: ' +
        'Collins Aerospace is developing a new suit for station operations, ' +
        'while Axiom Space is producing the so-called Axiom extravehicular mobility unit ' +
        'for the Artemis Moon program, intended for the lunar surface.',
      ],
    },

    {
      heading: 'Orlan and Feitian: alternative approaches',
      level: 3,
      paragraphs: [
        'The Soviet, and later Russian, Orlan suit took a fundamentally different approach. ' +
        'Rather than climbing in through legs and arms, the astronaut enters through a hatch in the back — ' +
        'the life support system is built into that rear door. ' +
        'This design allows a crew member to don the suit unassisted in under five minutes, ' +
        'whereas the American extravehicular suit requires a partner and considerably more time. ' +
        'Orlan served on the Mir orbital station and continues to operate on the International Space Station.',

        'The Chinese Feitian suit, first shown in the early twenty-first century, ' +
        'draws substantial inspiration from the Orlan but is adapted for China\'s own operational requirements. ' +
        'It is the standard suit aboard China\'s Tiangong orbital station.',
      ],
    },

    {
      image: {
        cacheKey: 'spacesuits-eva-suit-comparison',
        prompt:
          'Scientific comparison illustration for a science encyclopedia: four spacesuit silhouettes side by side against dark background. ' +
          'Left to right: 1) Apollo A7L suit (white, rounded helmet, lunar boots, 1969), ' +
          '2) EMU Shuttle/ISS suit (white, rectangular backpack, US flag patch), ' +
          '3) Orlan Russian suit (white, rear-entry hatch visible, slightly different helmet shape), ' +
          '4) Axiom AxEMU Artemis suit (white with blue accents, more flexible joints). ' +
          'Each suit shown as full-body silhouette with no visible face. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "A7L Moon 1969", "EMU ISS 1981+", "Orlan Russia", "AxEMU Artemis 2025+".',
        alt: 'Comparison of four spacesuits: Apollo A7L, American extravehicular mobility unit for the ISS, Orlan, and Axiom suit for Artemis',
        caption:
          'Each generation of suits answered its own era\'s demands. From the monolithic A7L to the modular extravehicular mobility unit and the forthcoming Axiom extravehicular mobility unit, the trajectory moves toward greater mobility and shorter preparation times.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The first commercial spacewalk and a new era',
      level: 2,
      paragraphs: [
        'For decades, extravehicular activity was the exclusive domain of government space agencies: ' +
        'NASA, Roscosmos, and later the China National Space Administration. ' +
        'The SpaceX Dragon suit, known as the intravehicular suit, was designed from the outset ' +
        'purely for use inside the spacecraft — providing crew safety during launch and landing, ' +
        'with no capability for extravehicular activity.',

        'In 2024, the Polaris Dawn mission changed the rules. ' +
        'SpaceX developed a modified variant of the Dragon suit for short extravehicular use, ' +
        'and crew members performed the first private spacewalk in history. ' +
        'It lasted a few minutes and was conducted without an airlock — ' +
        'the entire Dragon capsule was depressurized. ' +
        'This is a fundamentally different operational approach: simpler but more constrained.',

        'The new Axiom extravehicular mobility unit suits being developed for the Artemis program ' +
        'are designed to return humans to the Moon. ' +
        'Unlike the Apollo A7L they feature a significantly wider range of motion at the knees and elbows, ' +
        'improved lunar dust filtration, and are planned for first use ' +
        'during lunar surface missions in the second half of the 2020s.',
      ],
    },

    {
      diagram: {
        title: 'Key milestones in extravehicular suit development',
        svg: `<svg viewBox="0 0 680 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Spacesuit timeline — key moments</text>

  <!-- Timeline line -->
  <line x1="60" y1="130" x2="630" y2="130" stroke="#334455" stroke-width="2"/>

  <!-- Event 1: Leonov 1965 -->
  <circle cx="90" cy="130" r="5" fill="#ff8844"/>
  <line x1="90" y1="130" x2="90" y2="85" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="90" y="78" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">1965</text>
  <text x="90" y="67" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Leonov</text>
  <text x="90" y="57" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">first EVA</text>

  <!-- Event 2: Apollo A7L 1969 -->
  <circle cx="190" cy="130" r="5" fill="#ff8844"/>
  <line x1="190" y1="130" x2="190" y2="165" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="190" y="175" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">1969</text>
  <text x="190" y="187" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">A7L</text>
  <text x="190" y="197" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Moon</text>

  <!-- Event 3: EMU 1981 -->
  <circle cx="310" cy="130" r="5" fill="#7bb8ff"/>
  <line x1="310" y1="130" x2="310" y2="85" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="310" y="78" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">1981</text>
  <text x="310" y="67" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">EVA suit</text>
  <text x="310" y="57" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Shuttle/ISS</text>

  <!-- Event 4: Polaris Dawn 2024 -->
  <circle cx="510" cy="130" r="5" fill="#44ff88"/>
  <line x1="510" y1="130" x2="510" y2="165" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="510" y="175" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">2024</text>
  <text x="510" y="187" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Polaris Dawn</text>
  <text x="510" y="197" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">first comm. EVA</text>

  <!-- Event 5: AxEMU Artemis -->
  <circle cx="610" cy="130" r="5" fill="#44ff88"/>
  <line x1="610" y1="130" x2="610" y2="85" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="610" y="78" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">2026+</text>
  <text x="610" y="67" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">AxEMU</text>
  <text x="610" y="57" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Artemis</text>

  <!-- Caption line -->
  <text x="340" y="240" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Sixty years — from Leonov's first step outside to commercial missions and the return to the Moon</text>
</svg>`,
        caption:
          'From Alexei Leonov\'s first extravehicular activity in 1965 to commercial missions and new lunar suits — ' +
          'the evolution has spanned six decades and is far from finished.',
      },
    },

    {
      heading: 'The future: new materials and a new philosophy',
      level: 2,
      paragraphs: [
        'One of the most persistent limitations of existing suits is rigidity. ' +
        'The internal pressure needed to keep an astronaut alive inflates the suit like a balloon. ' +
        'Fingers in pressurized gloves do not flex naturally. ' +
        'After three or four hours of manual work in space, crew members return with sore palms. ' +
        'Some have sustained lasting joint injuries from repeated or intensive extravehicular activities.',

        'A fundamentally different approach — the mechanical counterpressure suit — ' +
        'would replace the inflated gas envelope with a close-fitting elastic garment ' +
        'that squeezes the body evenly from all sides, substituting mechanical compression ' +
        'for atmospheric pressure. In theory such a suit could be far more flexible and lighter. ' +
        'In practice no version has yet reached flight-readiness. ' +
        'This remains one of the most active research areas in suit engineering today.',

        'A second direction is autonomy. ' +
        'New life support systems replacing lithium hydroxide with regenerable molecular sieve beds ' +
        'for carbon dioxide removal can be cycled and reused during the extravehicular activity itself. ' +
        'This opens the path to twelve-hour or longer excursions — ' +
        'critical for lunar and Martian missions where the habitat may be far from the airlock, ' +
        'and every hour outside the suit counts.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Extravehicular activity',
      definition:
        'Any activity performed by an astronaut outside the pressurized volume of a spacecraft — in open space or on the surface of an airless body. Requires a full spacesuit with an autonomous life support system.',
    },
    {
      term: 'Extravehicular mobility unit',
      definition:
        'The American spacesuit used for spacewalks aboard the International Space Station since 1981. Its modular design allows different torso and limb sections to be combined for different crew members and mission types.',
    },
    {
      term: 'Pre-breathe protocol',
      definition:
        'The procedure of breathing pure oxygen for several hours before extravehicular activity. Required to flush dissolved nitrogen from the bloodstream and prevent decompression sickness when transitioning to the suit\'s lower operating pressure.',
    },
    {
      term: 'Pressure suit',
      definition:
        'The hermetic garment layer of a spacesuit that maintains internal pressure around the body. In extravehicular suits it operates at approximately 0.3 atmospheres of pure oxygen, far below the cabin pressure of about one atmosphere.',
    },
    {
      term: 'Thermal-micrometeoroid garment',
      definition:
        'The outermost layers of a spacesuit, composed of multiple plies of Kevlar, nylon, and Teflon. They simultaneously insulate against the extreme temperature swings of orbital sunlight and shadow, and protect against high-velocity microparticle impacts.',
    },
    {
      term: 'Ebullism',
      definition:
        'The vaporization and boiling of bodily fluids when ambient pressure drops to near-vacuum levels. Occurs on the surface of mucous membranes and in tissue fluids. Unlike the popular myth, it causes swelling rather than bodily explosion.',
    },
    {
      term: 'Decompression sickness',
      definition:
        'A pathological condition caused by too rapid a drop in ambient pressure. Nitrogen dissolved in the bloodstream forms bubbles that can obstruct circulation or damage the nervous system. Also known as the bends. A key hazard in extravehicular activity preparation.',
    },
    {
      term: 'Portable life support system',
      definition:
        'The autonomous backpack unit of an extravehicular suit containing oxygen supply, a carbon dioxide scrubber, a cooling water pump, a heat radiator, and communications hardware. Provides up to eight hours of self-contained life support.',
    },
    {
      term: 'Axiom extravehicular mobility unit',
      definition:
        'The next-generation lunar extravehicular suit developed by Axiom Space for NASA\'s Artemis program. Designed for the lunar surface with improved joint mobility, enhanced lunar dust protection, and planned for use in the late 2020s.',
    },
    {
      term: 'Mechanical counterpressure suit',
      definition:
        'A spacesuit concept that replaces gas pressurization with a close-fitting elastic garment compressing the body evenly. Potentially far more flexible than inflated suits, but not yet flight-qualified as of 2026.',
    },
  ],

  quiz: [
    {
      question: 'Why do astronauts breathe pure oxygen for several hours before a spacewalk?',
      options: [
        'To saturate the blood with oxygen for extended physical work',
        'To flush dissolved nitrogen from the bloodstream and prevent decompression sickness',
        'To verify that the suit oxygen delivery system is functioning correctly',
        'To raise pressure inside the suit before leaving the airlock',
      ],
      correctIndex: 1,
      explanation:
        'The extravehicular suit operates at approximately 0.3 atmospheres, while the spacecraft cabin is at about one atmosphere. That pressure drop would cause dissolved nitrogen in the blood to form bubbles — decompression sickness. Breathing pure oxygen for several hours beforehand washes nitrogen out of the bloodstream, making the transition safe.',
    },
    {
      question: 'What happens to a person exposed to vacuum without a suit in the first fifteen seconds?',
      options: [
        'The body explodes due to internal pressure',
        'The person freezes instantly due to extreme cold',
        'The person loses consciousness from oxygen deprivation',
        'Blood vessels rupture from the pressure differential',
      ],
      correctIndex: 2,
      explanation:
        'The fastest killer in vacuum is oxygen deprivation. Residual oxygen in the blood runs out in approximately fifteen seconds, causing loss of consciousness. The body does not explode — skin and muscle are strong enough to contain internal pressure. Freezing in vacuum is extremely slow because there is no convection, only radiative cooling.',
    },
    {
      question: 'What is the defining design feature of the Russian Orlan suit compared to its American counterpart?',
      options: [
        'It uses liquid nitrogen instead of oxygen for breathing',
        'The astronaut enters through a hatch in the back, without assistance from a crewmate',
        'It has no life support backpack and relies on an umbilical tether',
        'It is designed only for lunar surface use, not orbital operations',
      ],
      correctIndex: 1,
      explanation:
        'The Orlan suit has a rear-entry hatch that doubles as the life support system cover. An astronaut can don the suit unassisted in under five minutes. The American extravehicular suit requires a crewmate to assist with donning and takes considerably longer to put on.',
    },
    {
      question: 'What does the thermal-micrometeoroid garment protect against?',
      options: [
        'It maintains hermetic pressure inside the suit',
        'It cools the astronaut through water circulation',
        'It shields against solar thermal radiation and high-velocity microparticle impacts',
        'It provides radio communication with the spacecraft',
      ],
      correctIndex: 2,
      explanation:
        'The thermal-micrometeoroid garment is the outermost suit layer, made from plies of Kevlar, nylon, and Teflon. It serves two functions: thermal management across the extreme temperature range from minus one hundred to plus one hundred and fifty degrees Celsius in orbit, and protection against micrometeorites — sand-grain-sized particles traveling at orbital velocities.',
    },
    {
      question: 'What was historically significant about the Polaris Dawn mission in 2024?',
      options: [
        'It first demonstrated a mechanical counterpressure spacesuit in orbit',
        'It conducted the first extravehicular activity from an American orbital station',
        'It performed the first commercial extravehicular activity in history',
        'It was the first test of the Axiom extravehicular mobility unit in space',
      ],
      correctIndex: 2,
      explanation:
        'The Polaris Dawn mission in 2024 performed the world\'s first commercial spacewalk: members of a private SpaceX Dragon crew exited the vehicle in modified suits without using an airlock — the entire capsule was depressurized. This opened a new chapter in commercial human spaceflight.',
    },
  ],

  sources: [
    {
      title: 'NASA — Extravehicular Activity (EVA) Reference Guide',
      url: 'https://www.nasa.gov/humans-in-space/spacewalks/',
      meta: 'NASA official resource, updated 2024',
    },
    {
      title: 'NASA — EMU Space Suit: A Technical Overview',
      url: 'https://www.nasa.gov/wp-content/uploads/2023/04/emu_suit.pdf',
      meta: 'NASA JSC Technical Report, 2023',
    },
    {
      title: 'Nicholas de Monchaux — Spacesuit: Fashioning Apollo',
      url: 'https://mitpress.mit.edu/books/spacesuit',
      meta: 'MIT Press, 2011 — definitive history of the A7L development',
    },
    {
      title: 'Gary Harris — The Origins and Technology of the Advanced Extravehicular Space Suit',
      url: 'https://ntrs.nasa.gov/citations/20000119558',
      meta: 'NASA Technical Report, open access',
    },
    {
      title: 'Axiom Space — AxEMU Spacesuit for Artemis Program',
      url: 'https://www.axiomspace.com/axiom-suit',
      meta: 'Axiom Space official documentation, 2024',
    },
    {
      title: 'SpaceX — Polaris Dawn Mission: First Commercial Spacewalk',
      url: 'https://www.spacex.com/launches/mission/?missionId=polaris-dawn',
      meta: 'SpaceX, September 2024',
    },
    {
      title: 'ESA — Extravehicular Activity Overview',
      url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Astronauts/Extravehicular_activity_EVA',
      meta: 'ESA, open access',
    },
    {
      title: 'Collins Aerospace — Next Generation Space Suit for ISS',
      url: 'https://www.collinsaerospace.com/what-we-do/Space/Life-Sciences/Space-Suits',
      meta: 'Collins Aerospace, 2024',
    },
    {
      title: 'Dava Newman — Biosuit: Mechanical Counterpressure Spacesuit Research (MIT)',
      url: 'https://www.nasa.gov/centers-and-facilities/ames/biosuit-the-space-suit-of-the-future/',
      meta: 'NASA/MIT, open access',
    },
    {
      title: 'Roscosmos — Orlan Spacesuit Technical Overview',
      url: 'https://www.energia.ru/en/iss/researches/human/10.html',
      meta: 'Energia Corporation, open access',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
