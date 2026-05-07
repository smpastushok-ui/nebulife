import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'tiangong',
  language: 'en',
  section: 'crewed-missions',
  order: 8,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: "Tiangong — China's Station",
  subtitle: "How China built its own home in space after being shut out of the international one.",

  hero: {
    cacheKey: 'tiangong-hero',
    prompt:
      'Photorealistic illustration of the Tiangong space station in low Earth orbit for a science encyclopedia. ' +
      'T-shaped station configuration visible from outside: central Tianhe core module flanked by two large science modules Wentian and Mengtian, ' +
      'large solar panel arrays extending outward, Earth curvature below with blue atmosphere limb. ' +
      'Hard sci-fi style, dark space background, dramatic sunlight from one side casting sharp shadows on the station structure. ' +
      'Add the following text labels on the image: "Tianhe core", "Wentian", "Mengtian", "solar arrays".',
    alt: 'Tiangong space station in low Earth orbit — T-shaped configuration with Tianhe, Wentian, and Mengtian modules',
    caption:
      'Tiangong in its complete configuration. The central Tianhe module serves as the axial hub: crewed Shenzhou spacecraft and cargo Tianzhou vessels dock here. The two science modules form the crossbar of the T-shape.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Every major space program is born from some combination of ambition and necessity. ' +
        "China's Tiangong orbital station is the direct consequence of a decision made not in Beijing but in Washington. " +
        'In 2011 the United States Congress passed the Wolf Amendment, prohibiting the National Aeronautics and Space Administration ' +
        'from any bilateral cooperation with Chinese state space entities. ' +
        'Chinese astronauts could not reach the International Space Station. ' +
        "Beijing's response was pragmatic: build their own.",

        'What looked like a penalty turned into a catalyst. ' +
        'Closed doors forced the Chinese crewed program to develop every required technology independently — ' +
        'from docking mechanisms to life support, from oxygen regeneration to long-duration medical protocols. ' +
        'By the mid-2020s China had something no other sovereign actor possessed: ' +
        'a fully self-owned orbital station with a permanent crew.',

        'Tiangong translates as "Heavenly Palace" — a name carried by several predecessor vehicles ' +
        'that served as stepping stones toward the current structure. ' +
        'The journey from the first experimental laboratories to a genuine multi-module station ' +
        'took more than a decade and three generations of orbital hardware. ' +
        'Understanding the current station requires understanding where it came from.',
      ],
    },

    {
      heading: 'Predecessors: two experimental vehicles',
      level: 2,
      paragraphs: [
        'Before building a permanent station, China had to learn to dock. ' +
        'Docking is one of the most technically demanding maneuvers in crewed spaceflight: ' +
        'two vehicles traveling at several kilometers per second must align to centimeter precision. ' +
        'The Soviet Union and the United States acquired this capability in the 1960s and 1970s. ' +
        'China began the same sequence of steps in the early 2010s.',

        '_Tiangong-1_ launched in 2011 — a compact uncrewed laboratory designed exclusively ' +
        'to demonstrate automated and manual docking. ' +
        'Over several years, both uncrewed and crewed versions of the Shenzhou spacecraft docked to it. ' +
        'Chinese astronauts transferred through its docking tunnel into the lab interior for the first time — ' +
        'a fundamentally new level of operational capability. ' +
        'Contact with the vehicle was lost in 2016, and in 2018 it re-entered the atmosphere uncontrolled ' +
        'and disintegrated over the Pacific Ocean.',

        '_Tiangong-2_ (2016) was an improved iteration of the same platform. ' +
        'A crewed crew docked and spent thirty days aboard — at the time the longest Chinese space mission. ' +
        'In addition to docking, the mission demonstrated in-orbit refueling and scientific experiments. ' +
        'In 2019 the vehicle was deorbited in a controlled manner over the Pacific. ' +
        'Both spacecraft were single-purpose experimental tools rather than true stations — ' +
        'but they trained the engineers, designers, and astronauts who would build what came next.',
      ],
    },

    {
      image: {
        cacheKey: 'tiangong-predecessors',
        prompt:
          'Scientific illustration showing the evolution of Chinese space stations for an encyclopedia: ' +
          'three spacecraft shown in chronological left-to-right sequence: Tiangong-1 (2011, small cylindrical lab), ' +
          'Tiangong-2 (2016, slightly larger), and the current Tiangong station (2021+, full T-shape with large solar arrays). ' +
          'Each labeled with its name and approximate year. Dark space background, hard sci-fi style, monospace labels. ' +
          'Add the following text labels on the image: "Tiangong-1 2011", "Tiangong-2 2016", "Tiangong 2021".',
        alt: 'Evolution of Chinese orbital stations: Tiangong-1, Tiangong-2, and the current Tiangong station',
        caption:
          'Three generations of the Chinese orbital program. Tiangong-1 and Tiangong-2 were experimental platforms for mastering docking and long-duration flight. The current Tiangong station — formerly designated Tiangong-3 — is a full multi-module facility with a permanent crew.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Assembly: three modules in eighteen months',
      level: 2,
      paragraphs: [
        'The current Tiangong was assembled in orbit — the only way to construct a structure ' +
        'that cannot launch whole due to the payload limits of any existing rocket. ' +
        'The assembly logic resembles building construction: foundation first, then the wings.',

        'In the spring of 2021 the heavy-lift Long March 5B rocket delivered the _Tianhe_ module to orbit — ' +
        "the station's core. Tianhe serves as the axial hub: taikonauts live and sleep here, " +
        'the station control systems are located here, and three docking ports allow ' +
        'crewed spacecraft from the front, cargo vessels from the rear, and lateral connections for the lab modules. ' +
        'The module is equipped with air regeneration and water recycling systems ' +
        'that support a closed resource cycle.',

        'In the summer of 2022, _Wentian_ — the first science laboratory module — docked to Tianhe. ' +
        'It expanded the scientific capacity of the station and added large deployable solar arrays. ' +
        'Later that same year, in the autumn, _Mengtian_ arrived — the second laboratory module. ' +
        'Together Wentian and Mengtian formed the crossbar of the structure, ' +
        'giving the station its characteristic T-shape. ' +
        'From the launch of the first module to the completion of the baseline configuration took less than eighteen months — ' +
        'a pace that surprised even outside observers.',
      ],
    },

    {
      diagram: {
        title: 'Tiangong station module layout',
        svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Tiangong — T-shape configuration</text>

  <!-- Tianhe core module (center horizontal) -->
  <rect x="220" y="140" width="260" height="60" rx="8" fill="#334455" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="350" y="166" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">Tianhe</text>
  <text x="350" y="181" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">core module (2021)</text>

  <!-- Wentian module (left branch) -->
  <rect x="50" y="140" width="150" height="60" rx="6" fill="#2a3a2a" stroke="#44ff88" stroke-width="1.5"/>
  <text x="125" y="166" fill="#44ff88" font-family="monospace" font-size="11" text-anchor="middle">Wentian</text>
  <text x="125" y="181" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">lab module (2022)</text>

  <!-- Mengtian module (right branch) -->
  <rect x="500" y="140" width="150" height="60" rx="6" fill="#2a2a3a" stroke="#ff8844" stroke-width="1.5"/>
  <text x="575" y="166" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle">Mengtian</text>
  <text x="575" y="181" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">lab module (2022)</text>

  <!-- Connecting lines between modules -->
  <line x1="200" y1="170" x2="220" y2="170" stroke="#aabbcc" stroke-width="2"/>
  <line x1="480" y1="170" x2="500" y2="170" stroke="#aabbcc" stroke-width="2"/>

  <!-- Shenzhou docking port (top of Tianhe) -->
  <rect x="320" y="100" width="60" height="40" rx="4" fill="#1a2533" stroke="#7bb8ff" stroke-width="1"/>
  <text x="350" y="116" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Shenzhou</text>
  <text x="350" y="128" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">crewed</text>
  <line x1="350" y1="140" x2="350" y2="140" stroke="#7bb8ff" stroke-width="1.5"/>

  <!-- Tianzhou cargo docking port (bottom of Tianhe) -->
  <rect x="320" y="200" width="60" height="40" rx="4" fill="#1a2533" stroke="#ff8844" stroke-width="1"/>
  <text x="350" y="216" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Tianzhou</text>
  <text x="350" y="228" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">cargo</text>

  <!-- Solar arrays Tianhe -->
  <rect x="260" y="58" width="30" height="80" rx="2" fill="#1a3a5a" stroke="#4488aa" stroke-width="1" opacity="0.8"/>
  <rect x="410" y="58" width="30" height="80" rx="2" fill="#1a3a5a" stroke="#4488aa" stroke-width="1" opacity="0.8"/>
  <text x="246" y="90" fill="#4488aa" font-family="monospace" font-size="8" text-anchor="middle">solar</text>
  <text x="246" y="100" fill="#4488aa" font-family="monospace" font-size="8" text-anchor="middle">arrays</text>

  <!-- Solar arrays Wentian (large) -->
  <rect x="54" y="98" width="20" height="145" rx="2" fill="#1a3a5a" stroke="#44ff88" stroke-width="1" opacity="0.7"/>
  <rect x="130" y="98" width="20" height="145" rx="2" fill="#1a3a5a" stroke="#44ff88" stroke-width="1" opacity="0.7"/>

  <!-- Solar arrays Mengtian (large) -->
  <rect x="526" y="98" width="20" height="145" rx="2" fill="#1a3a5a" stroke="#ff8844" stroke-width="1" opacity="0.7"/>
  <rect x="600" y="98" width="20" height="145" rx="2" fill="#1a3a5a" stroke="#ff8844" stroke-width="1" opacity="0.7"/>

  <!-- Legend -->
  <text x="30" y="300" fill="#667788" font-family="monospace" font-size="9">Three Tianhe docking ports: forward (Shenzhou), aft (Tianzhou), lateral</text>
  <text x="30" y="316" fill="#667788" font-family="monospace" font-size="9">Permanent crew: 3. Planned expansion to plus configuration: 2025 onward</text>
</svg>`,
        caption:
          'T-shaped Tiangong configuration: the central Tianhe module is the axial hub with life support and docking ports for visiting spacecraft. ' +
          'Wentian and Mengtian form the crossbar and carry scientific laboratories and large solar arrays.',
      },
    },

    {
      heading: 'How the station lives: ships, rotation, resources',
      level: 2,
      paragraphs: [
        'Maintaining a permanent human presence in space is above all a logistics problem. ' +
        'The station consumes water, food, oxygen, and propellant for orbit-raising maneuvers. ' +
        'All of these must be replenished regularly, and crews must be rotated.',

        "The crewed _Shenzhou_ spacecraft is China's primary vehicle for crew transport — " +
        'an independent design, though similar in mission role to the Soyuz and Crew Dragon. ' +
        'It carries three taikonauts and can remain docked for approximately six months. ' +
        'When a new crew arrives before the previous one departs, the station temporarily hosts six people. ' +
        'This so-called crew handover overlap has already been demonstrated and is now standard practice.',

        'The cargo vessel _Tianzhou_ resembles the European Automated Transfer Vehicle in concept: ' +
        'it is expendable, does not return to Earth, and burns up in the atmosphere after unloading. ' +
        'It delivers food, water, spare equipment, and propellant for orbit maintenance burns. ' +
        'Without regular resupply flights any orbital station gradually decays in altitude ' +
        'due to atmospheric drag from residual air molecules and eventually re-enters.',

        "Tiangong's regeneration systems close the oxygen cycle and partially the water cycle — " +
        'just as the International Space Station does. ' +
        'Carbon dioxide exhaled by the crew is split chemically to release oxygen. ' +
        'Condensate and processed urine are converted back into drinking water. ' +
        'This substantially reduces the demand on resupply missions but does not eliminate it.',
      ],
    },

    {
      image: {
        cacheKey: 'tiangong-shenzhou-docking',
        prompt:
          'Photorealistic illustration of a Shenzhou crewed spacecraft approaching the Tiangong space station for docking in low Earth orbit. ' +
          'Shenzhou visible in foreground with solar panels deployed, Tianhe core module of Tiangong in background with docking port illuminated. ' +
          'Earth curvature with blue atmosphere at the bottom of the frame. Hard sci-fi style, dark space background, dramatic lighting. ' +
          'Add the following text labels on the image: "Shenzhou", "Tianhe docking port", "low Earth orbit".',
        alt: 'Shenzhou crewed spacecraft approaching the Tianhe docking port of the Tiangong space station',
        caption:
          'Shenzhou on approach to Tiangong. The docking procedure takes several hours and can be performed automatically or manually. Three taikonauts will transfer aboard the station, where they will spend three to six months.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Science aboard the station',
      level: 2,
      paragraphs: [
        'An orbital station is primarily a scientific instrument. ' +
        'The microgravity produced by free fall in orbit unlocks phenomena inaccessible in ground laboratories. ' +
        'Fluids behave differently, crystals grow with far fewer defects, ' +
        'and living cells respond to the absence of weight in ways still being catalogued.',

        'Research aboard Tiangong spans several domains. ' +
        '_Biology_ — studying the effects of prolonged microgravity and elevated radiation on the human body, ' +
        'as well as the behavior of plant cells and simple organisms in weightlessness. ' +
        '_Materials science_ — growing crystals and alloys in the absence of convection currents, ' +
        'yielding structures with defect densities impossible to achieve on the ground. ' +
        '_Fundamental physics_ — testing the equivalence of inertial and gravitational mass ' +
        'with precision unachievable in terrestrial conditions, and conducting quantum communication experiments.',

        'Remote sensing of Earth is another distinct thread. ' +
        'External platforms on the science modules carry telescopes and detectors pointing both downward, ' +
        'toward the planetary surface, and outward toward the sky. ' +
        'The Chinese space telescope Xuntian, whose launch is planned in the mid-2020s, ' +
        'will be capable of docking to Tiangong for on-orbit servicing — ' +
        'an idea reminiscent of the Hubble Space Telescope servicing missions, ' +
        'but realized in an entirely different architectural framework.',
      ],
    },

    {
      image: {
        cacheKey: 'tiangong-science-lab',
        prompt:
          'Photorealistic interior illustration of the Wentian science laboratory module of Tiangong space station for an encyclopedia. ' +
          'Racks of scientific equipment along the walls, glove box for sealed experiments, ' +
          'small porthole window showing Earth below, floating experiment containers. ' +
          'Two taikonauts in flight suits working at equipment racks, shown from behind and in silhouette. ' +
          'Hard sci-fi style, functional interior lighting, detailed equipment. ' +
          'Add the following text labels on the image: "experiment rack", "glove box", "Wentian module".',
        alt: 'Interior of the Wentian science laboratory module — equipment racks, glove box, porthole, taikonauts at work',
        caption:
          'The Wentian science module interior. Sealed glove boxes allow chemical and biological experiments in isolation from the station atmosphere. Equipment racks are standardized, enabling replacement between missions without structural modification.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Comparison with the International Space Station',
      level: 2,
      paragraphs: [
        'Comparing Tiangong to the International Space Station is inevitable — but the comparison requires context. ' +
        'The International Space Station was assembled over more than a decade by sixteen nations; ' +
        'its mass exceeds four hundred metric tons and its interior volume is comparable to a six-bedroom house. ' +
        'Tiangong weighs approximately eighty metric tons and was assembled in under two years. ' +
        'In terms of scale these are fundamentally different objects.',

        'But scale is not the only metric. ' +
        'Tiangong was designed with the lessons of two generations of predecessor stations in mind, ' +
        'and with contemporary technology throughout. ' +
        'Its resource regeneration systems are more efficient than those installed in the earliest sections of the International Space Station. ' +
        'Its modular architecture allows expansion without interrupting station operations. ' +
        'A planned plus-shape configuration envisions adding one or two more modules in the second half of the 2020s.',

        'The more consequential difference is not size but governance. ' +
        'The International Space Station is a consortium in which any change to configuration requires agreement among agencies of multiple nations. ' +
        'Tiangong answers to a single organization — the China National Space Administration — ' +
        'and can evolve according to a single roadmap without diplomatic negotiation. ' +
        'This brings its own advantages in decision speed and its own risks in terms of knowledge diversification.',
      ],
    },

    {
      diagram: {
        title: 'Tiangong assembly timeline',
        svg: `<svg viewBox="0 0 680 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Tiangong assembly timeline</text>

  <!-- Timeline base line -->
  <line x1="40" y1="130" x2="640" y2="130" stroke="#334455" stroke-width="2"/>

  <!-- Tiangong-1: 2011 -->
  <circle cx="80" cy="130" r="7" fill="#667788" stroke="#aabbcc" stroke-width="1"/>
  <line x1="80" y1="123" x2="80" y2="80" stroke="#667788" stroke-width="1" stroke-dasharray="3,3"/>
  <rect x="30" y="55" width="100" height="36" rx="3" fill="#1a2030" stroke="#667788" stroke-width="1"/>
  <text x="80" y="70" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Tiangong-1</text>
  <text x="80" y="82" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">2011</text>

  <!-- Tiangong-2: 2016 -->
  <circle cx="200" cy="130" r="7" fill="#667788" stroke="#aabbcc" stroke-width="1"/>
  <line x1="200" y1="137" x2="200" y2="175" stroke="#667788" stroke-width="1" stroke-dasharray="3,3"/>
  <rect x="150" y="175" width="100" height="36" rx="3" fill="#1a2030" stroke="#667788" stroke-width="1"/>
  <text x="200" y="190" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Tiangong-2</text>
  <text x="200" y="202" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">2016</text>

  <!-- Tianhe core: April 2021 -->
  <circle cx="340" cy="130" r="9" fill="#1a2a4a" stroke="#7bb8ff" stroke-width="2"/>
  <line x1="340" y1="121" x2="340" y2="65" stroke="#7bb8ff" stroke-width="1.5"/>
  <rect x="278" y="40" width="124" height="40" rx="3" fill="#1a2030" stroke="#7bb8ff" stroke-width="1"/>
  <text x="340" y="56" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Tianhe core</text>
  <text x="340" y="70" fill="#4488aa" font-family="monospace" font-size="8" text-anchor="middle">April 2021</text>

  <!-- Wentian: July 2022 -->
  <circle cx="460" cy="130" r="9" fill="#1a3a1a" stroke="#44ff88" stroke-width="2"/>
  <line x1="460" y1="139" x2="460" y2="180" stroke="#44ff88" stroke-width="1.5"/>
  <rect x="400" y="180" width="120" height="40" rx="3" fill="#1a2030" stroke="#44ff88" stroke-width="1"/>
  <text x="460" y="196" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Wentian</text>
  <text x="460" y="208" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">July 2022</text>

  <!-- Mengtian: October 2022 -->
  <circle cx="580" cy="130" r="9" fill="#1a1a3a" stroke="#ff8844" stroke-width="2"/>
  <line x1="580" y1="121" x2="580" y2="65" stroke="#ff8844" stroke-width="1.5"/>
  <rect x="515" y="40" width="130" height="40" rx="3" fill="#1a2030" stroke="#ff8844" stroke-width="1"/>
  <text x="580" y="56" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Mengtian</text>
  <text x="580" y="70" fill="#cc6633" font-family="monospace" font-size="8" text-anchor="middle">October 2022</text>

  <!-- Arrows on timeline -->
  <polygon points="640,126 630,121 630,139" fill="#334455"/>

  <!-- Year markers -->
  <text x="80" y="148" fill="#445566" font-family="monospace" font-size="8" text-anchor="middle">2011</text>
  <text x="200" y="148" fill="#445566" font-family="monospace" font-size="8" text-anchor="middle">2016</text>
  <text x="340" y="148" fill="#445566" font-family="monospace" font-size="8" text-anchor="middle">2021</text>
  <text x="520" y="148" fill="#445566" font-family="monospace" font-size="8" text-anchor="middle">2022</text>

  <text x="340" y="240" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">From the first experimental vehicle to full baseline configuration: over a decade of the program</text>
</svg>`,
        caption:
          'Timeline from the experimental Tiangong-1 (2011) through Tiangong-2 (2016) to assembly of the current station (2021 to 2022). ' +
          'All three key modules were delivered to orbit in under eighteen months.',
      },
    },

    {
      heading: 'International exclusion and new partnerships',
      level: 2,
      paragraphs: [
        "The paradox of Tiangong is that, born as a response to exclusion, " +
        'it is gradually opening to international cooperation — on its own terms.',

        'The United Nations Office for Outer Space Affairs selected scientific projects ' +
        'from nine countries for installation aboard Tiangong. ' +
        'This is the first and so far only precedent of non-Chinese scientific instruments ' +
        'flying on a Chinese station. ' +
        'Among the selected nations are representatives from Africa, Asia, and Latin America — ' +
        'regions that have historically had limited access to opportunities on the International Space Station.',

        'China is also actively pursuing bilateral agreements on crewed missions with several space agencies. ' +
        'Meanwhile the Wolf Amendment formally remains in effect for the American agency, ' +
        'though debate in academic circles about its merits has not subsided: ' +
        'the restrictions intended to slow Chinese space progress ' +
        'effectively provided the impetus for building a fully independent infrastructure.',
      ],
    },

    {
      image: {
        cacheKey: 'tiangong-orbit-earth',
        prompt:
          'Photorealistic dramatic illustration of Tiangong space station in low Earth orbit seen from a distance, ' +
          'full T-shaped configuration clearly visible, Earth below showing cloud patterns and blue oceans, ' +
          'sunlight catching the large solar panel arrays of all three modules. ' +
          'Hard sci-fi style, dark space background, stars faintly visible. ' +
          'Add the following text labels on the image: "400 km altitude", "T-configuration", "6 docking ports".',
        alt: 'Tiangong space station in full T-shaped configuration in low Earth orbit at approximately 400 kilometers altitude',
        caption:
          'Tiangong in orbit at approximately 400 kilometers altitude. At this height, residual atmospheric drag gradually decays the orbit — regular engine burns to reboost altitude are a mandatory part of any station\'s operational life.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The future: expansion and the question of longevity',
      level: 2,
      paragraphs: [
        'The baseline T-shape configuration is not the final design. ' +
        "China's program envisions expansion to a plus configuration " +
        'that would add one or two more modules perpendicular to the existing crossbar. ' +
        'This would increase the scientific volume and allow more external platforms ' +
        'for telescopes and particle detectors.',

        'In parallel the question of the next generation is actively developing. ' +
        'The International Space Station is on a deorbit schedule targeting the late 2020s or early 2030s. ' +
        'If that timeline holds, Tiangong would become the only permanently crewed orbital station on the planet — ' +
        'at least until commercial stations, which several American companies are developing ' +
        'under contracts with the American space agency, become operational.',

        'Tiangong is designed for fifteen years of active service, ' +
        'though actual longevity will depend on technical condition and strategic decisions. ' +
        'For China it is simultaneously a practical laboratory and a symbolic statement: ' +
        'the country became the third in the world to independently send humans to orbit, ' +
        'and is now the only one independently sustaining a permanent human presence in space.',
      ],
    },

    {
      image: {
        cacheKey: 'tiangong-expansion-concept',
        prompt:
          'Scientific concept illustration of expanded Tiangong space station in plus configuration for an encyclopedia. ' +
          'Current T-shape visible with an additional module added perpendicular, forming a cross or plus shape. ' +
          'New module shown in slightly different color to indicate future expansion. ' +
          'Hard sci-fi style, dark space background, Earth visible at the bottom edge. ' +
          'Add the following text labels on the image: "current T-shape", "proposed expansion module", "plus configuration".',
        alt: 'Concept of Tiangong expanded to a plus configuration with an additional module',
        caption:
          'Proposed plus-configuration of Tiangong. A new module would extend the crossbar axis of the station, ' +
          'increasing scientific volume and the number of external platforms for astronomical observation. ' +
          'Target timeframe: second half of the 2020s.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Tiangong',
      definition:
        'Chinese orbital station with a permanent crew. Translates as "Heavenly Palace". Comprises three modules: Tianhe (core), Wentian, and Mengtian (laboratories). Orbits at approximately 400 kilometers altitude.',
    },
    {
      term: 'Tianhe',
      definition:
        'The core or habitation module of the Tiangong station. Taikonauts live and sleep here; station control systems and air and water regeneration equipment are located here. Launched to orbit in April 2021.',
    },
    {
      term: 'Shenzhou',
      definition:
        'Chinese crewed spacecraft. Carries three taikonauts to Tiangong and can remain docked for up to six months. The name translates as "Sacred Vessel" or "Divine Craft".',
    },
    {
      term: 'Tianzhou',
      definition:
        'Chinese cargo spacecraft. Supplies the station with food, water, propellant, and equipment. Expendable — after unloading it separates and burns up in the atmosphere. The name translates as "Heavenly Vessel".',
    },
    {
      term: 'Taikonaut',
      definition:
        'A Chinese astronaut. The term derives from the Chinese word "taikong", meaning outer space. The official Chinese term is "yuanzhui" (literally "person on a rocket").',
    },
    {
      term: 'Wolf Amendment',
      definition:
        'A legislative provision passed by the United States Congress in 2011 prohibiting the National Aeronautics and Space Administration from any bilateral cooperation with Chinese state space organizations. Formally remains in effect as of 2026.',
    },
    {
      term: 'Microgravity',
      definition:
        "The condition of apparent weightlessness aboard an orbital station. It arises because the station and everything inside it are in continuous free fall around Earth. Gravity has not disappeared — it is precisely what keeps the station in orbit.",
    },
    {
      term: 'Resource regeneration',
      definition:
        'Closed-loop life support technology aboard a station: systems chemically split carbon dioxide to recover oxygen; condensate and processed urine are converted into drinking water. Substantially reduces dependence on cargo resupply missions.',
    },
    {
      term: 'Xuntian',
      definition:
        'A Chinese space telescope planned for launch in the mid-2020s. It will be capable of docking to Tiangong for on-orbit servicing. Primary mirror diameter: two meters. Survey telescope with a wide field of view.',
    },
  ],

  quiz: [
    {
      question: 'What motivated China to build its own orbital station rather than participating in the International Space Station?',
      options: [
        'China was unable to develop a spacecraft capable of docking with the International Space Station',
        'The Wolf Amendment of 2011 barred the American space agency from any cooperation with Chinese space entities',
        'China consciously chose an independent path before any restrictions were imposed',
        'The International Space Station was already nearing deorbit in 2011',
      ],
      correctIndex: 1,
      explanation:
        'The Wolf Amendment, passed by the United States Congress in 2011, prohibits the National Aeronautics and Space Administration from cooperating with Chinese state space organizations. This effectively closed off access to the International Space Station for Chinese astronauts and became the primary driver for building an independent station.',
    },
    {
      question: 'What shape does the baseline Tiangong configuration form, and which modules create it?',
      options: [
        'Linear — one long module with two cargo bays end to end',
        'T-shaped — central Tianhe core with two lateral lab modules Wentian and Mengtian',
        'Cross-shaped — four modules arranged around a central node',
        'Cylindrical — three modules connected sequentially in a single line',
      ],
      correctIndex: 1,
      explanation:
        'The baseline configuration of Tiangong is T-shaped. The central habitation module Tianhe is the axial hub. Perpendicular to it, the two science laboratory modules Wentian (July 2022) and Mengtian (October 2022) form the crossbar.',
    },
    {
      question: 'How does the cargo Tianzhou vessel differ from the crewed Shenzhou spacecraft?',
      options: [
        'Tianzhou is larger and can carry up to six taikonauts',
        'Tianzhou returns to Earth with its cargo after each mission',
        'Tianzhou is expendable and burns up in the atmosphere after unloading; Shenzhou returns the crew',
        'They are identical in design and differ only in external color markings',
      ],
      correctIndex: 2,
      explanation:
        'Tianzhou is an expendable cargo vehicle with no return capability. After delivering supplies and being unloaded it separates from the station and burns up in the atmosphere. Shenzhou is the crewed spacecraft that delivers three taikonauts and returns them to Earth when their mission concludes.',
    },
    {
      question: 'What role has the United Nations Office for Outer Space Affairs played in relation to Tiangong?',
      options: [
        'It jointly manages the station with China',
        'It selected scientific projects from several countries for installation aboard Tiangong',
        'It mediated between China and the United States over repealing the Wolf Amendment',
        'It funds the construction of additional Chinese station modules',
      ],
      correctIndex: 1,
      explanation:
        'The United Nations Office for Outer Space Affairs selected scientific projects from nine countries for placement aboard Tiangong. This is the first instance of non-Chinese scientific instruments flying on a Chinese orbital station, establishing a precedent for broader international access.',
    },
    {
      question: 'How did the Tiangong-1 experimental laboratory end its operational life?',
      options: [
        'It remains in orbit today as a reserve module',
        'It was docked to the current Tiangong station as an auxiliary compartment',
        'It re-entered the atmosphere uncontrolled and broke up over the Pacific Ocean in 2018',
        'It was deliberately boosted to a higher storage orbit for long-term preservation',
      ],
      correctIndex: 2,
      explanation:
        'Contact with Tiangong-1 was lost in 2016. In 2018 the vehicle re-entered the dense atmosphere uncontrolled and disintegrated over the Pacific Ocean. Tiangong-2, by contrast, was deorbited in a controlled manner in 2019 — a far safer disposal method.',
    },
  ],

  sources: [
    {
      title: 'China National Space Administration — Tiangong Space Station Overview',
      url: 'http://www.cnsa.gov.cn/english/n6465645/n6465648/index.html',
      meta: 'CNSA official site, 2021–2024',
    },
    {
      title: 'UNOOSA — Opportunities to Conduct Space Experiments on China Space Station',
      url: 'https://www.unoosa.org/oosa/en/ourwork/space-opportunities/human-spaceflight/china-space-station.html',
      meta: 'United Nations Office for Outer Space Affairs, open access',
    },
    {
      title: "Jones A. — China's Space Station (Tiangong) — SpaceNews coverage 2021–2024",
      url: 'https://spacenews.com/tag/tiangong/',
      meta: 'SpaceNews, open access',
    },
    {
      title: "Zak A. — Russianspaceweb.com: Chinese Space Station technical details",
      url: 'https://www.russianspaceweb.com/tiangong.html',
      meta: 'Russianspaceweb.com, technical analysis',
    },
    {
      title: 'NASA — Wolf Amendment background',
      url: 'https://www.nasa.gov/about/highlights/wolf_amendment.html',
      meta: 'NASA, open access',
    },
    {
      title: 'ESA — Human Spaceflight: International Space Station overview',
      url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station',
      meta: 'ESA, open access',
    },
    {
      title: 'Xinhua — Wentian lab module launch (July 2022)',
      url: 'http://www.xinhuanet.com/english/20220724/31ddc9e225de420e99e3ab29a6e9a2e1/c.html',
      meta: 'Xinhua News Agency, 2022',
    },
    {
      title: 'Xinhua — Mengtian lab module launch (October 2022)',
      url: 'http://www.xinhuanet.com/english/20221031/d8dca78d03a9476194fe85f7e04c3ab7/c.html',
      meta: 'Xinhua News Agency, 2022',
    },
    {
      title: "Goswami A. — Tiangong: China's Space Station, Springer Praxis Books, 2023",
      url: 'https://link.springer.com/book/10.1007/978-3-031-18749-3',
      meta: 'Springer, 2023',
    },
    {
      title: 'Foust J. — "China\'s space station: what we know and what we don\'t" — The Space Review, 2023',
      url: 'https://www.thespacereview.com/article/4628/1',
      meta: 'The Space Review, 2023, open access',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
