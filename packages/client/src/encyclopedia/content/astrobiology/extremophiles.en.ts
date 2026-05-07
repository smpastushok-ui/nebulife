import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'extremophiles',
  language: 'en',
  section: 'astrobiology',
  order: 5,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Extremophiles — Life at the Edge of the Possible',
  subtitle:
    'Organisms that thrive in boiling water, concentrated acid, arctic darkness, and deep-ocean trenches are rewriting our understanding of where life can exist in the universe.',

  hero: {
    cacheKey: 'extremophiles-hero',
    prompt:
      'Photorealistic scientific illustration for a science encyclopedia: a collage of extreme environments on Earth where life thrives — ' +
      'deep-sea hydrothermal vent with glowing orange mineral chimneys and microbial mats, ' +
      'Antarctic ice cracks with blue-green algae, bright red acidic hot spring, ' +
      'deep cave rock with biofilm glowing faintly. ' +
      'Hard sci-fi style, dark dramatic background, technically accurate. ' +
      'Add the following text labels on the image: "hydrothermal vent", "Antarctic ice", "acid hot spring", "deep rock".',
    alt: 'Collage of extreme Earth environments where microbial life thrives — hydrothermal vents, Antarctic ice, acidic hot spring, deep rock',
    caption:
      'Earth is a planet of extremophiles. Almost every corner that seems lethal to us has turned out to be habitable for some microorganism. This reframes the question: not "where CAN life exist" but "where can it NOT."',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'For most of the twentieth century, the working assumption was that life required moderate temperature, ' +
        'near-neutral acidity, sufficient liquid water, and access to sunlight. ' +
        'This intuitive "normality" turned out to be an illusion. ' +
        'Beginning in the 1970s, when researchers discovered microorganisms thriving in the hot springs ' +
        'of Yellowstone National Park, and continuing through the discovery of microbes in deep-ocean sediments, ' +
        'Antarctic ice crystals, and the interior of mountain rock — each new find pushed the boundary ' +
        'of the living further than anyone had expected.',

        'Organisms that inhabit such conditions are called **extremophiles** — ' +
        '"those that love the extreme." They are not mere survivors. ' +
        'They do not simply tolerate their environment — they are so precisely adapted to it ' +
        'that ordinary conditions become lethal. A _thermophile_ placed at room temperature ' +
        'dies just as surely as a person thrown into boiling water. The extreme is their home.',

        'For astrobiology this is a conceptual shift of the first order. ' +
        'If organisms arose on Earth that flourish at 113 degrees Celsius, ' +
        'at an acidity that dissolves iron, in total darkness, and under pressure hundreds of times atmospheric, ' +
        'then the question "could life exist on Mars, Europa, or Enceladus" ' +
        'takes on an entirely different character.',
      ],
    },

    {
      heading: 'Thermophiles and Hyperthermophiles — Where Water Boils, Microbes Thrive',
      level: 2,
      paragraphs: [
        'Temperature was long considered one of the most rigid constraints on living systems: ' +
        'proteins denature, lipid membranes melt, and nucleic acids break apart. ' +
        'Yet toward the end of the twentieth century, at hydrothermal vents on the floors of the Atlantic ' +
        'and Pacific Oceans, scientists found microorganisms flourishing precisely where ' +
        'mineral-saturated water is heated far above the boiling point at normal atmospheric pressure.',

        '**Thermophiles** are organisms whose optimal growth temperature ranges from roughly 45 to about ' +
        '80 degrees Celsius. **Hyperthermophiles** go further: their optimum lies above 80 degrees, ' +
        'and some grow at 100 degrees and beyond. The species _Pyrolobus fumarii_, discovered ' +
        'in hydrothermal chimneys of the mid-Atlantic ridge, holds the record for the highest confirmed ' +
        'growth temperature among cellular organisms — above 113 degrees Celsius. ' +
        'At such temperatures water remains liquid only because of the enormous pressure of several hundred atmospheres.',

        'The adaptations of thermophiles are remarkable. Their proteins carry extra chemical cross-links ' +
        'that resist unfolding under heat. Their membranes contain specialized ' +
        '_thermostable lipids_ that remain semi-fluid even at extreme temperatures. ' +
        'These adaptations are not just scientifically interesting — ' +
        'heat-stable enzymes from thermophiles became the foundation of the polymerase chain reaction, ' +
        'without which modern molecular biology and medical diagnostics would be impossible.',
      ],
    },

    {
      image: {
        cacheKey: 'extremophiles-hydrothermal-vent',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: deep-sea hydrothermal vent "black smoker" — ' +
          'a tall mineral chimney erupting superheated dark mineral-rich water at 300-400 degrees into the cold dark ocean, ' +
          'microbial mats glowing faintly on the chimney surface, ' +
          'tube worms and shrimp visible around the base, dark deep-sea background. ' +
          'Hard sci-fi style, technically accurate. ' +
          'Add the following text labels on the image: "superheated water >300°C", "mineral chimney", "microbial mats", "tube worms".',
        alt: 'Deep-sea hydrothermal "black smoker" vent — mineral chimney with superheated water, microbial mats, and tube worms around the base',
        caption:
          'Hydrothermal vents on the ocean floor are among the most extreme known habitats. There is no sunlight, pressure runs to hundreds of atmospheres, and the temperature of the exiting fluid exceeds 300 degrees Celsius. Despite this, a complete ecosystem flourishes around them, drawing energy from sulfur compounds through chemosynthesis.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Psychrophiles — Where Blood Would Freeze',
      level: 2,
      paragraphs: [
        'At the opposite end of the temperature spectrum live **psychrophiles** — ' +
        'organisms that grow optimally between zero and roughly 15 degrees Celsius, ' +
        'with some tolerating minus 15 degrees and below. ' +
        'Antarctica seems a sterile desert. In reality it is one of the richest extremophile environments on the planet.',

        'Subglacial **Lake Vostok** in Antarctica — sealed beneath four kilometers of ice, ' +
        'in darkness, at a temperature around minus 3 degrees Celsius, and under pressure roughly double atmospheric — ' +
        'sustains microbial life. DNA analysis of ice-core samples bordering the lake water ' +
        'revealed several thousand distinct microbial types. ' +
        'Among them are bacteria capable of harvesting chemical energy without any reliance on photosynthesis.',

        'Psychrophiles solved the problem of low temperature through several strategies. ' +
        'Their membranes are enriched in _unsaturated fatty acids_, which stay fluid ' +
        'at temperatures where saturated fats would long since have solidified. ' +
        'Their enzymes are built to be flexible in the cold — ' +
        'unlike the enzymes of heat-loving organisms, which simply stop moving and catalyzing ' +
        'when chilled. Some psychrophiles produce _antifreeze proteins_ that prevent ' +
        'the formation of destructive ice crystals inside their cells.',
      ],
    },

    {
      heading: 'Halophiles, Acidophiles, and Alkaliphiles — Chemical Extremes',
      level: 2,
      paragraphs: [
        '**Halophiles** are organisms that require extraordinarily high salt concentrations. ' +
        'The Dead Sea is a solution roughly ten times saltier than the open ocean. ' +
        'For most organisms this environment is lethal — osmotic stress simply pulls water out of cells. ' +
        'But halophilic archaea accumulate enough potassium ions and compatible solutes inside their cells ' +
        'to balance the external osmotic pressure. Notably, the bacterium _Halobacterium salinarum_ ' +
        'uses a unique pigment, bacteriorhodopsin, instead of chlorophyll — ' +
        'it absorbs sunlight and pumps protons across the membrane, ' +
        'generating energy without photosynthesis in the conventional sense.',

        '**Acidophiles** survive and reproduce at acidity levels corresponding to a ' +
        'pH below 2. The Rio Tinto river in Spain, with its blood-red water saturated in iron ions and sulfuric acid, ' +
        'has pH values in some stretches below zero on the standard scale. ' +
        'Yet iron-oxidizing bacteria and microscopic algae flourish there. ' +
        'A geochemical analogue of Rio Tinto has been confirmed on Mars — ' +
        'which opens interesting questions about the Martian past.',

        '**Alkaliphiles** live at the opposite extreme — in soda lakes with pH values above 11. ' +
        'Such an environment dissolves most organic molecules and destroys cell walls. ' +
        'Alkaliphiles protect themselves by maintaining a strictly neutral internal pH ' +
        'despite the external conditions. Soda lakes in Africa ' +
        '(including Lake Natron in Tanzania) are home not only to microbes ' +
        'but to entire populations of flamingos that feed on alkaliphilic blue-green algae.',
      ],
    },

    {
      image: {
        cacheKey: 'extremophiles-rio-tinto',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: Rio Tinto river in Spain — ' +
          'bright blood-red and orange acidic river flowing through rocky terrain, ' +
          'water surface reflecting deep red and rusty colors from dissolved iron minerals, ' +
          'microscopic view inset showing acid-tolerant bacteria and algae in the water. ' +
          'Hard sci-fi style. ' +
          'Add the following text labels on the image: "pH < 2", "iron-rich acid water", "acidophile microbes".',
        alt: 'Rio Tinto river in Spain — bright red acidic water rich in dissolved iron. Inset shows microscopic acidophilic microorganisms',
        caption:
          'Rio Tinto is a natural geochemical analogue for certain Martian conditions. Acidity reaches levels that corrode metal structures. Despite this, a microbial ecosystem flourishes here, drawing energy from iron oxidation.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Piezophiles and Radiation-Resistant Organisms',
      level: 2,
      paragraphs: [
        '**Piezophiles** (also called barophiles) are organisms that are most comfortable under immense pressure. ' +
        'The Mariana Trench reaches a depth of more than 11 kilometers. ' +
        'Pressure there exceeds 100 megapascals — roughly a thousand times atmospheric. ' +
        'Yet even at the deepest point of the world ocean, microbes do not merely survive — they actively grow. ' +
        'At normal atmospheric pressure they die: pressure is as necessary to them ' +
        'as oxygen is to us.',

        'The most striking example of resistance is _Deinococcus radiodurans_, ' +
        'known informally among scientists as "Conan the Bacterium." ' +
        'This bacterium tolerates a dose of ionizing radiation of five thousand gray — ' +
        'a thousand times the lethal dose for a human being. ' +
        'For comparison, the Chernobyl reactor explosion delivered doses of several gray ' +
        'to unprotected bystanders, killing them within weeks. ' +
        '_D. radiodurans_ shrugs off such a dose because it has an extraordinarily effective ' +
        'DNA repair system: within a few hours of total chromosomal fragmentation ' +
        'into hundreds of pieces, it stitches them back together in the correct order.',

        'Radiation resistance is not merely a curiosity. In space there are radiation sources ' +
        'that render the surfaces of planets without magnetic fields or atmospheres ' +
        'almost sterile for most forms of Earth life. ' +
        'Yet _D. radiodurans_ and similar organisms demonstrate that even this boundary ' +
        'can be overcome.',
      ],
    },

    {
      image: {
        cacheKey: 'extremophiles-deinococcus',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: microscopic view of Deinococcus radiodurans bacteria — ' +
          'characteristic tetrad clusters of spherical pink-red cells, ' +
          'background showing DNA repair mechanism with glowing strand reconnections, ' +
          'radiation symbol subtly visible in the dark background. ' +
          'Hard sci-fi style, dark background, scientifically accurate. ' +
          'Add the following text labels on the image: "Deinococcus radiodurans", "DNA repair", "5000 Gy tolerance".',
        alt: 'Microscopic view of Deinococcus radiodurans — characteristic pink cell clusters and a schematic of DNA repair after irradiation',
        caption:
          'Deinococcus radiodurans can rebuild its DNA even after ionizing radiation has shattered the chromosome into hundreds of fragments. This mechanism makes it a plausible candidate for surviving in open space on asteroid surfaces.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Xerophiles and Endoliths — Life Without Water and Inside Rock',
      level: 2,
      paragraphs: [
        '**Xerophiles** are organisms adapted to vanishingly small amounts of available water. ' +
        'The Atacama Desert in Chile is the driest place on the planet. ' +
        'In some areas even a few millimeters of rain per year are absent for years at a time. ' +
        'Yet even here photosynthesizing cyanobacteria have been found inside porous rock, ' +
        'where a trace of atmospheric moisture condenses.',

        '**Endoliths** are precisely these organisms — living not on a surface but inside rock. ' +
        'They penetrate cracks and pores of limestone, gypsum, and granite, reaching depths ' +
        'from a few millimeters to several centimeters. There they find ' +
        'protection from ultraviolet radiation, violent temperature swings, ' +
        'and mechanical damage. Light filtering through translucent Antarctic gypsum ' +
        'is enough for photosynthesis even at sub-zero temperatures.',

        'Endoliths are among the most important candidates in the astrobiological search on Mars. ' +
        'The Martian surface is currently exposed to intense ultraviolet and ionizing radiation, ' +
        'nearly devoid of liquid water, and swept by a frigid wind. ' +
        'But just a few centimeters and deeper, conditions differ radically: ' +
        'radiation is attenuated, moisture can condense in pores, ' +
        'and temperature is more stable. ' +
        'The Perseverance rover and future missions are specifically targeting such subsurface niches.',
      ],
    },

    {
      heading: 'Lithoautotrophs — A Chemical Tree of Life Without the Sun',
      level: 2,
      paragraphs: [
        'One of the most fundamental assumptions of twentieth-century biology was that ' +
        'all food webs ultimately close on photosynthesis: plants, algae, and cyanobacteria ' +
        'convert sunlight into chemical energy, and everything else — from microbes to elephants — ' +
        'lives downstream of that flow.',

        'The discovery of hydrothermal vents in 1977 erased that simple picture. ' +
        'Around those vents a complete multi-trophic ecosystem exists, ' +
        'not one link of which depends on sunlight. ' +
        'At its base stand **lithoautotrophs** — organisms that obtain energy ' +
        'from inorganic chemical reactions: the oxidation of hydrogen sulfide, methane, ' +
        'iron, hydrogen, and ammonium. This strategy is called _chemosynthesis_.',

        'Chemosynthetic organisms form the foundation of microbial communities in deep-ocean sediments, ' +
        'in the crystalline basement of the continental crust, in deep coal seams, ' +
        'and even in oil reservoirs. Some estimates suggest that the total biomass ' +
        'of subsurface chemosynthetic microbes may be comparable to — ' +
        'or even exceed — the entire surface biosphere. ' +
        'This entire "dark biosphere" operates without a single photon of sunlight.',
      ],
    },

    {
      diagram: {
        title: 'Tolerance Ranges of Major Extremophile Types',
        svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Survival ranges of extremophiles by physical parameter</text>

  <!-- Legend -->
  <rect x="30" y="300" width="12" height="10" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="46" y="309" fill="#44ff88" font-family="monospace" font-size="9">known organisms</text>
  <rect x="170" y="300" width="12" height="10" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="1"/>
  <text x="186" y="309" fill="#cc4444" font-family="monospace" font-size="9">no known Earth life</text>

  <!-- ROW 1: Temperature -->
  <text x="10" y="60" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="start">Temperature</text>
  <rect x="120" y="47" width="560" height="16" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="0.8"/>
  <rect x="139" y="47" width="477" height="16" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="120" y="76" fill="#667788" font-family="monospace" font-size="8">-20</text>
  <text x="188" y="76" fill="#aabbcc" font-family="monospace" font-size="8">-15 (psychrophile)</text>
  <text x="565" y="76" fill="#aabbcc" font-family="monospace" font-size="8">+113°C (Pyrolobus)</text>
  <text x="660" y="76" fill="#667788" font-family="monospace" font-size="8">+130</text>

  <!-- ROW 2: pH -->
  <text x="10" y="115" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="start">pH</text>
  <rect x="120" y="100" width="560" height="16" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="0.8"/>
  <rect x="122" y="100" width="554" height="16" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="120" y="128" fill="#667788" font-family="monospace" font-size="8">pH -1</text>
  <text x="143" y="128" fill="#aabbcc" font-family="monospace" font-size="8">0 (Rio Tinto)</text>
  <text x="610" y="128" fill="#aabbcc" font-family="monospace" font-size="8">12.5</text>
  <text x="656" y="128" fill="#667788" font-family="monospace" font-size="8">13</text>

  <!-- ROW 3: Pressure -->
  <text x="10" y="168" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="start">Pressure</text>
  <rect x="120" y="153" width="560" height="16" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="0.8"/>
  <rect x="120" y="153" width="473" height="16" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="120" y="181" fill="#667788" font-family="monospace" font-size="8">0</text>
  <text x="530" y="181" fill="#aabbcc" font-family="monospace" font-size="8">&gt;100 MPa (trench)</text>
  <text x="656" y="181" fill="#667788" font-family="monospace" font-size="8">130</text>

  <!-- ROW 4: Salinity -->
  <text x="10" y="220" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="start">Salinity</text>
  <rect x="120" y="206" width="560" height="16" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="0.8"/>
  <rect x="120" y="206" width="467" height="16" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="120" y="234" fill="#667788" font-family="monospace" font-size="8">0%</text>
  <text x="530" y="234" fill="#aabbcc" font-family="monospace" font-size="8">~30% (saturated)</text>
  <text x="660" y="234" fill="#667788" font-family="monospace" font-size="8">36%</text>

  <!-- ROW 5: Radiation -->
  <text x="10" y="272" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="start">Radiation</text>
  <rect x="120" y="258" width="560" height="16" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="0.8"/>
  <rect x="120" y="258" width="400" height="16" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="120" y="287" fill="#667788" font-family="monospace" font-size="8">0</text>
  <text x="190" y="287" fill="#cc4444" font-family="monospace" font-size="8">5 Gy (human)</text>
  <text x="455" y="287" fill="#aabbcc" font-family="monospace" font-size="8">5000 Gy (Deinococcus)</text>
  <text x="652" y="287" fill="#667788" font-family="monospace" font-size="8">7000</text>
</svg>`,
        caption:
          'Each row shows the parameter range within which living organisms have been confirmed on Earth (green zone). Boundaries that once seemed absolute have been pushed further with each new discovery.',
      },
    },

    {
      heading: 'Tardigrades — Cosmic Travelers in Cryptobiosis',
      level: 2,
      paragraphs: [
        'Among all known organisms, a special place belongs to _tardigrades_ (water bears) — ' +
        'microscopic multicellular animals ranging from 0.1 to 1.5 millimeters in length, ' +
        'externally resembling miniature bears with eight legs. ' +
        'They are found almost everywhere: in moss cushions, marine water, hot springs, and Antarctica. ' +
        'But the greatest sensation they caused was their capacity for **cryptobiosis** — ' +
        'a state of nearly complete metabolic suspension.',

        'When confronted with severely adverse conditions — desiccation, freezing, radiation, ' +
        'or oxygen deprivation — a tardigrade contracts into a so-called "tun." ' +
        'The water content of its cells drops from roughly 85 percent to less than 3 percent. ' +
        'Instead of water, cells fill with a specialized sugar — _trehalose_ — ' +
        'which forms a glass-like matrix that preserves cellular structures in a frozen state. ' +
        'In this form tardigrades have survived the vacuum of open space, ' +
        'temperatures approaching minus 273 degrees Celsius (near absolute zero), ' +
        'and a dose of ionizing radiation exceeding five thousand gray. ' +
        'When favorable conditions return, they resume full activity.',

        'In 2019, the Israeli lunar lander Beresheet crashed on the Moon\'s surface ' +
        'and scattered dehydrated tardigrade samples in cryptobiotic tun form across the landing site. ' +
        'Although these specific specimens are unlikely to survive the cumulative hazards of the lunar surface indefinitely, ' +
        'the incident raised practical questions about the dispersal of Earth microbial material ' +
        'within the solar system — and about the theoretical possibility ' +
        'of transferring living organisms between planets.',
      ],
    },

    {
      image: {
        cacheKey: 'extremophiles-tardigrade-cryptobiosis',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: tardigrade (water bear) cryptobiosis — ' +
          'left side shows an active tardigrade walking, plump eight-legged microscopic animal with segmented body, ' +
          'right side shows the same animal in tun (desiccated barrel) state, compact and shriveled, ' +
          'arrows indicating the transition states, background showing harsh conditions (vacuum, ice, radiation). ' +
          'Hard sci-fi style, scientifically accurate microscopic view. ' +
          'Add the following text labels on the image: "active tardigrade", "cryptobiosis tun", "H2O < 3%", "revives with water".',
        alt: 'Tardigrade in active form and in cryptobiotic tun state — comparison of both life forms with water content indicators',
        caption:
          'The transition into cryptobiosis allows a tardigrade to survive conditions lethal to any other known multicellular organism. The key is near-complete dehydration and replacement of water by trehalose, which forms a protective glass-like matrix.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Mars, Europa, Enceladus — What Extremophiles Suggest',
      level: 2,
      paragraphs: [
        'Each category of extremophile opens a distinct niche for astrobiological searches within the solar system.',

        'On **Mars**, the surface today is lethal for most known forms of Earth microbial life: ' +
        'intense ultraviolet and ionizing radiation, temperatures ranging from minus 60 to plus 20 degrees ' +
        'in the near-surface layer, very low atmospheric pressure, and almost no liquid water. ' +
        'But the subsurface is a different situation. ' +
        'A few meters down, radiation is attenuated, temperature is more stable, ' +
        'and in some regions a subsurface cryosaline brine is plausible. ' +
        'Endoliths, psychrophiles, and acidophiles are direct candidates for such an environment.',

        'On **Europa**, the subsurface ocean heated by Jovian tidal forces ' +
        'may sustain hydrothermal activity on the rocky seafloor. ' +
        'This is an exact analogue of Earth\'s hydrothermal vents, where ' +
        'chemosynthetic lithoautotrophs form the base of an ecosystem independent of the sun.',

        'On **Enceladus**, the plumes have been found to contain molecular hydrogen and organic molecules — ' +
        'a chemical signature characteristic of environments where on Earth ' +
        'methanogenic archaea thrive, organisms that harvest energy from hydrogen and carbon dioxide. ' +
        'On **Titan**, conditions for a possible methane-based chemistry ' +
        'resemble a hypothetical environment for xerophiles or psychrophiles — ' +
        'but in a fundamentally different chemical space.',
      ],
    },

    {
      image: {
        cacheKey: 'extremophiles-europa-subsurface',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: cross-section view of Europa moon — ' +
          'thick fractured blue-white ice shell on top, dark deep subsurface ocean in the middle, ' +
          'rocky seafloor with hydrothermal vents glowing orange at the bottom, ' +
          'schematic microbial mat communities shown near vents, ' +
          'Jupiter visible as a large yellow-orange sphere in background above. ' +
          'Hard sci-fi style scientific illustration. ' +
          'Add the following text labels on the image: "ice shell", "subsurface ocean", "hydrothermal vents", "chemosynthetic microbes?".',
        alt: 'Cross-section of Europa — ice shell, subsurface ocean, and possible chemosynthetic microbial communities near hydrothermal vents on the seafloor',
        caption:
          'The subsurface ocean model of Europa is one of the most optimistic astrobiological scenarios in the solar system. If hydrothermal activity exists on the seafloor, conditions resemble those that sustain a sunlight-independent ecosystem on Earth.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Panspermia — Does Life Travel Between Planets?',
      level: 2,
      paragraphs: [
        'The discovery of extraordinary microbial and spore resilience has revived the old ' +
        'question of **panspermia** — the hypothesis that living material can be transferred ' +
        'between planets through meteorites, asteroids, and comets.',

        'This is not speculation. Martian meteorites have reached Earth — and conversely, ' +
        'Earth material ejected during large impact events travels into space. ' +
        'Bacterial spores that survived extended irradiation, vacuum, ' +
        'and impact-heating under laboratory conditions demonstrate ' +
        'the theoretical feasibility of such transfer, ' +
        'although actual exchange between Mars and Earth remains uncertain: ' +
        'the question is not merely whether an organism can survive the transit, ' +
        'but whether meteoritic material is dense enough to shield the interior during atmospheric entry.',

        'An important practical consequence: the search for extraterrestrial microbial material on Mars ' +
        'or the Moon demands extreme care to distinguish genuine extraterrestrial origin ' +
        'from Earth contamination. Planetary protection requirements for missions ' +
        'to Mars, Enceladus, and Europa are among the key practical consequences ' +
        'of extremophile research.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Thermophile',
      definition:
        'An organism that grows optimally at temperatures between 45 and 80 degrees Celsius. Hyperthermophiles have an optimum above 80 degrees and can grow up to 113 degrees Celsius and above.',
    },
    {
      term: 'Psychrophile',
      definition:
        'An organism adapted to low temperatures — from zero to roughly 15 degrees Celsius, with some tolerating minus 15 degrees and below. Found in ice sheets, Antarctic lakes, and deep-sea sediments.',
    },
    {
      term: 'Halophile',
      definition:
        'An organism that requires or tolerates extremely high salt concentrations — from 15 percent up to saturation (approximately 30 percent). Typical inhabitants of the Dead Sea and salt ponds.',
    },
    {
      term: 'Acidophile',
      definition:
        'An organism that thrives at pH below 5, with some surviving below pH 2. Found in volcanic springs, acid mine drainage, and environments such as the Rio Tinto river.',
    },
    {
      term: 'Piezophile (barophile)',
      definition:
        'An organism adapted to very high hydrostatic pressure. Inhabitants of abyssal ocean zones tolerate pressures exceeding 100 megapascals — a thousand times atmospheric pressure.',
    },
    {
      term: 'Endolith',
      definition:
        'An organism that lives inside rock — in cracks and pores of limestone, granite, or gypsum. Finds protection there from radiation and desiccation. A key candidate for subsurface Martian habitats.',
    },
    {
      term: 'Lithoautotroph',
      definition:
        'An organism that obtains energy from the oxidation of inorganic compounds — hydrogen sulfide, hydrogen, iron, or ammonium — rather than from photosynthesis. The foundation of hydrothermal-vent ecosystems and the deep biosphere.',
    },
    {
      term: 'Cryptobiosis',
      definition:
        'A state of near-complete metabolic and functional suspension in response to adverse conditions. Characteristic of tardigrades: upon desiccation, water content falls below 3 percent and cellular structures are preserved in a protective trehalose matrix.',
    },
    {
      term: 'Chemosynthesis',
      definition:
        'The synthesis of organic compounds from carbon dioxide using the chemical energy of inorganic oxidation reactions, as opposed to photosynthesis which uses sunlight. The key process sustaining Earth\'s dark biosphere.',
    },
    {
      term: 'Panspermia',
      definition:
        'The hypothesis that living material can be transferred between planets and even stellar systems via meteorites, asteroids, or comets. The extraordinary resilience of certain microorganisms and spores makes this hypothesis experimentally testable.',
    },
  ],

  quiz: [
    {
      question: 'Which bacterium is known for the highest tolerance to ionizing radiation among all known organisms?',
      options: [
        'Thermococcus kodakarensis — an inhabitant of hydrothermal vents',
        'Deinococcus radiodurans — tolerates more than five thousand gray',
        'Halobacterium salinarum — an inhabitant of hypersaline environments',
        'Acidithiobacillus thiooxidans — an inhabitant of acid springs',
      ],
      correctIndex: 1,
      explanation:
        'Deinococcus radiodurans tolerates a dose of ionizing radiation of five thousand gray — a thousand times the lethal dose for a human being. The secret is an extraordinarily effective DNA repair system that reassembles the shattered chromosome from hundreds of fragments back into the correct sequence within a few hours.',
    },
    {
      question: 'What is cryptobiosis, and which molecule plays the key protective role in tardigrades?',
      options: [
        'Cessation of growth combined with accumulation of glycerol as an antifreeze',
        'Transition to spore form with stabilized lipid membranes',
        'Near-complete cellular dehydration with water replaced by trehalose, which forms a protective glass-like matrix',
        'A halt of reproduction while normal metabolism is maintained',
      ],
      correctIndex: 2,
      explanation:
        'During cryptobiosis tardigrades dehydrate to a water content below three percent. Water is replaced by trehalose — a disaccharide that forms a glass-like matrix and preserves the cell structures, enzymes, and DNA from damage under extreme conditions.',
    },
    {
      question: 'What energy strategy allows lithoautotrophs to exist without sunlight?',
      options: [
        'Absorbing ambient heat and converting it into chemical energy',
        'Chemosynthesis — obtaining energy from the oxidation of inorganic compounds such as sulfur, hydrogen, and iron',
        'Fermentation of organic molecules carried down from the surface',
        'Radiolysis of water driven by natural rock radioactivity',
      ],
      correctIndex: 1,
      explanation:
        'Lithoautotrophs carry out chemosynthesis — they extract chemical energy by oxidizing inorganic substances: hydrogen sulfide, molecular hydrogen, ferrous iron, or ammonium. This allows them to sustain full metabolism in complete darkness — on the ocean floor, inside rock, and in deep groundwater aquifers.',
    },
    {
      question: 'Why are endoliths considered the most promising candidates for Martian microbial habitation?',
      options: [
        'Because the Martian crust is rich in carbon and they could feed on it',
        'Because endoliths require neither water nor chemical energy, only a mineral substrate',
        'Because the interior of rocks provides shielding from radiation, more stable temperature, and possible moisture condensation in pores',
        'Because Mars has outcrops of warm volcanic rock similar to Earth hot springs',
      ],
      correctIndex: 2,
      explanation:
        'The Martian surface is exposed to intense ultraviolet and ionizing radiation, and liquid water is essentially absent. But just a few centimeters deeper, radiation is attenuated, temperature is more stable, and moisture can condense in pores and cracks. This is precisely where endoliths could find a suitable environment.',
    },
    {
      question: 'What adaptation allows psychrophiles to maintain the fluidity of their cell membranes at low temperatures?',
      options: [
        'Replacement of aquaporin water channels with a specially designed variant',
        'An elevated proportion of unsaturated fatty acids in membrane lipids',
        'Synthesis of additional ATP to compensate for slower enzyme activity',
        'Accumulation of large glycogen granules as thermal reservoirs',
      ],
      correctIndex: 1,
      explanation:
        'Psychrophile membranes are enriched in unsaturated fatty acids, which have a lower melting point. This keeps the membrane semi-fluid at temperatures where the saturated fatty acids of warm-adapted organisms would have already solidified — causing the cell to lose its ability to transport substances and divide.',
    },
  ],

  sources: [
    {
      title: 'Rothschild L.J., Mancinelli R.L. — Life in extreme environments',
      url: 'https://www.nature.com/articles/409092a0',
      meta: 'Nature, 409, 1092–1101, 2001 — classic review of extremophiles',
    },
    {
      title: 'Merino N. et al. — Living at the Extremes: Extremophiles and the Limits of Life in a Planetary Context',
      url: 'https://www.frontiersin.org/articles/10.3389/fmicb.2019.00780/full',
      meta: 'Frontiers in Microbiology, 10, 780, 2019 (open access)',
    },
    {
      title: 'Siddiqui K.S. et al. — Psychrophiles',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev-earth-063016-020311',
      meta: 'Annual Review of Earth and Planetary Sciences, 45, 2017',
    },
    {
      title: 'Daly M.J. — A new perspective on radiation resistance based on Deinococcus radiodurans',
      url: 'https://www.nature.com/articles/nrmicro2073',
      meta: 'Nature Reviews Microbiology, 7, 237–245, 2009',
    },
    {
      title: 'Boothby T.C. et al. — Tardigrades Use Intrinsically Disordered Proteins to Survive Desiccation',
      url: 'https://www.cell.com/molecular-cell/fulltext/S1097-2765(17)30236-5',
      meta: 'Molecular Cell, 65, 975–984, 2017',
    },
    {
      title: 'Hand K.P. et al. — Astrobiology Strategy for the Search for Life in the Universe',
      url: 'https://www.nap.edu/catalog/25252',
      meta: 'National Academies Press, 2018 — NASA and NAS strategic document',
    },
    {
      title: 'Priscu J.C. et al. — Microbial Life in the Accreted Ice of Lake Vostok, Antarctica',
      url: 'https://www.science.org/doi/10.1126/science.286.5447.2141',
      meta: 'Science, 286, 2141–2144, 1999',
    },
    {
      title: 'Amils R. et al. — Coupled iron and sulfur cycles and the origin of the Rio Tinto extreme acidic environment',
      url: 'https://www.sciencedirect.com/science/article/pii/S0012821X11001847',
      meta: 'Earth and Planetary Science Letters, 2011',
    },
    {
      title: 'Waite J.H. et al. — Cassini finds molecular hydrogen in the Enceladus plume',
      url: 'https://www.science.org/doi/10.1126/science.aai8703',
      meta: 'Science, 356, 155–159, 2017',
    },
    {
      title: 'NASA Astrobiology — Extremophiles and the Search for Life Beyond Earth',
      url: 'https://astrobiology.nasa.gov/research/astrobiology-at-nasa/extremophiles/',
      meta: 'NASA Astrobiology Program, updated 2025',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
