import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'white-dwarfs',
  language: 'en',
  section: 'astrophysics',
  order: 7,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'White Dwarfs',
  subtitle: 'The final state of most stars. Why they resist further collapse, how they cool over billions of years, and what happens when they gain too much mass.',

  hero: {
    cacheKey: 'white-dwarfs-hero',
    prompt:
      'Photorealistic scientific illustration of a white dwarf star in deep space: ' +
      'a small, intensely bright blue-white sphere surrounded by a faint glowing planetary nebula shell with blue and teal gas wisps, ' +
      'the remnant of a sun-like star that shed its outer layers. ' +
      'Hard sci-fi style, dark space background, high contrast between the tiny brilliant core and the expansive nebula. ' +
      'Add the following text labels on the image: "white dwarf core", "planetary nebula", "cooling sequence".',
    alt: 'White dwarf at the center of a planetary nebula — a brilliant blue-white sphere surrounded by a shell of shed stellar gas',
    caption:
      'A typical white dwarf holds a mass close to the Sun\'s compressed into the volume of Earth. ' +
      'The planetary nebula surrounding it is the former outer envelope of the star, expelled during the red giant phase. ' +
      'The dwarf itself cools over billions of years, gradually fading from blue-white to yellowish.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'When the Sun burns out — in roughly five billion years — it will not explode ' +
        'and will not collapse into a black hole. It will become a **white dwarf**: ' +
        'an object the size of Earth but with a mass close to the Sun\'s. ' +
        'The density is so extreme that a teaspoon of its material would weigh ' +
        'roughly five tons. Yet this is not the most extreme object in the universe — ' +
        'just the most common endpoint of stellar life.',

        'More than ninety percent of all stars, including our Sun, will end this way. ' +
        'Not in an explosion, not in a collapse — but in a slow, quiet conclusion. ' +
        'A white dwarf is not a ruin but a relic: an object that retains its mass indefinitely ' +
        'but has stopped burning. It cools for billions of years, ultimately fading into ' +
        'an invisible cold body — a _black dwarf_. ' +
        'But the universe is not yet old enough for any black dwarf to have formed.',
      ],
    },

    {
      image: {
        cacheKey: 'white-dwarfs-sirius-b',
        prompt:
          'Photorealistic scientific illustration of the Sirius binary star system: ' +
          'a brilliant blue-white main sequence star (Sirius A) dominating the left side, ' +
          'and a tiny but intensely bright white dwarf (Sirius B) visible to the right at much smaller scale, ' +
          'both set against deep black space with faint star field. ' +
          'Hard sci-fi style, dark background, high dynamic range rendering showing relative brightness and size difference. ' +
          'Add the following text labels on the image: "Sirius A (main sequence)", "Sirius B (white dwarf)", "distance 8.6 light-years".',
        alt: 'Binary system Sirius: the brilliant Sirius A and tiny white dwarf Sirius B beside it',
        caption:
          'Sirius B is the nearest white dwarf to Earth, identified in the mid-nineteenth century. ' +
          'Despite holding a mass close to the Sun\'s, its diameter is roughly equal to Earth\'s. ' +
          'In this illustration both objects are shown together, though not at true brightness scale: ' +
          'Sirius A is nearly twenty-five times more luminous in visible light.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'How a White Dwarf Is Born',
      level: 2,
      paragraphs: [
        'A star with an initial mass up to approximately eight solar masses never reaches ' +
        'the conditions needed to fuse iron. After hydrogen it burns helium in the core, ' +
        'then in a shell. The outer layers swell into a _red giant_, and for stars ' +
        'at the upper end of this mass range, into a _red supergiant_. ' +
        'In the late phase, pulsating stellar winds strip these outer layers into surrounding space, ' +
        'creating a **planetary nebula** — one of the most striking structures in the Galaxy.',

        'What remains at the center is the former stellar core, enriched with carbon and oxygen ' +
        '(or, for the most massive progenitors in this range — around eight to ten solar masses — ' +
        'a mixture of oxygen, neon, and magnesium). ' +
        'It can no longer ignite new nuclear reactions: temperatures and pressures are insufficient ' +
        'to fuse heavier elements. Gravity compresses it to densities where entirely different physics ' +
        'takes over — quantum mechanics at the level of individual electrons.',
      ],
    },

    {
      heading: 'Degeneracy Pressure: Quantum Mechanics Saves the Star',
      level: 2,
      paragraphs: [
        'Why does a white dwarf not compress further? Not because of temperature — ' +
        'its interior is still extremely hot. The reason is purely quantum: the **Pauli exclusion principle**. ' +
        'No two electrons can simultaneously occupy the same quantum state. ' +
        'When matter is compressed to white dwarf densities, all low-energy states are filled. ' +
        'Electrons "refuse" to be squeezed closer — this generates _electron degeneracy pressure_, ' +
        'which holds the star against gravitational collapse.',

        'This pressure is fundamentally different from ordinary gas pressure. ' +
        'Ordinary pressure depends on temperature: cool the gas and it contracts. ' +
        'Degeneracy pressure is nearly independent of temperature. ' +
        'So a white dwarf, cooling over billions of years, does not shrink. ' +
        'It simply dims, remaining exactly as dense.',

        'Neutron stars are supported by an analogous mechanism — ' +
        '_neutron degeneracy pressure_: the Pauli principle applies to neutrons too. ' +
        'The difference is that neutron stars form at far greater masses and are ' +
        'vastly denser — if a white dwarf is the size of Earth, ' +
        'a neutron star fits within the boundaries of a small city.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: White Dwarf Mass-Radius Relation',
        svg: `<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="70" y1="240" x2="580" y2="240" stroke="#334455" stroke-width="1.5"/>
  <line x1="70" y1="240" x2="70" y2="30" stroke="#334455" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="580" y="258" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="end">Mass (M☉)</text>
  <!-- Y axis label (rotated) -->
  <text x="18" y="140" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle" transform="rotate(-90,18,140)">Radius (R☉)</text>

  <!-- X tick marks and labels -->
  <line x1="155" y1="240" x2="155" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="155" y="258" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">0.2</text>
  <line x1="240" y1="240" x2="240" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="240" y="258" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">0.4</text>
  <line x1="325" y1="240" x2="325" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="325" y="258" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">0.6</text>
  <line x1="410" y1="240" x2="410" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="410" y="258" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">0.8</text>
  <line x1="495" y1="240" x2="495" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="495" y="258" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">1.0</text>
  <line x1="560" y1="240" x2="560" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="560" y="258" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">1.2</text>

  <!-- Y tick marks -->
  <line x1="70" y1="195" x2="65" y2="195" stroke="#334455" stroke-width="1"/>
  <text x="60" y="199" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="end">0.005</text>
  <line x1="70" y1="150" x2="65" y2="150" stroke="#334455" stroke-width="1"/>
  <text x="60" y="154" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="end">0.010</text>
  <line x1="70" y1="105" x2="65" y2="105" stroke="#334455" stroke-width="1"/>
  <text x="60" y="109" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="end">0.015</text>
  <line x1="70" y1="60" x2="65" y2="60" stroke="#334455" stroke-width="1"/>
  <text x="60" y="64" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="end">0.020</text>

  <!-- Mass-radius relation curve (inverted: higher mass = smaller radius) -->
  <path d="M 100 62 C 160 70 220 88 280 112 C 340 136 390 162 430 186 C 460 202 490 218 520 234"
        stroke="#7bb8ff" stroke-width="2.5" fill="none"/>

  <!-- Chandrasekhar limit vertical line -->
  <line x1="560" y1="40" x2="560" y2="240" stroke="#cc4444" stroke-width="1.5" stroke-dasharray="5,4"/>
  <text x="562" y="55" fill="#cc4444" font-family="monospace" font-size="10">Chandrasekhar</text>
  <text x="562" y="67" fill="#cc4444" font-family="monospace" font-size="10">limit</text>
  <text x="562" y="79" fill="#cc4444" font-family="monospace" font-size="10">1.4 M☉</text>

  <!-- Example point: Sirius B -->
  <circle cx="495" cy="200" r="5" fill="#44ff88"/>
  <text x="500" y="192" fill="#44ff88" font-family="monospace" font-size="10">Sirius B</text>
  <text x="500" y="204" fill="#44ff88" font-family="monospace" font-size="10">~1.0 M☉</text>

  <!-- Example point: typical WD -->
  <circle cx="325" cy="147" r="5" fill="#ff8844"/>
  <text x="330" y="140" fill="#ff8844" font-family="monospace" font-size="10">typical</text>
  <text x="330" y="152" fill="#ff8844" font-family="monospace" font-size="10">~0.6 M☉</text>

  <!-- Arrow annotation: radius decreases with mass -->
  <text x="150" y="115" fill="#aabbcc" font-family="monospace" font-size="10">radius decreases</text>
  <text x="150" y="127" fill="#aabbcc" font-family="monospace" font-size="10">as mass increases</text>

  <!-- Title -->
  <text x="320" y="18" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Mass — Radius: the paradoxical relation</text>
</svg>`,
        caption:
          'A white dwarf is one of the few astrophysical objects where greater mass means smaller size. ' +
          'As mass approaches the Chandrasekhar limit (approximately 1.4 solar masses), the radius trends toward zero, ' +
          'and further mass accumulation leads to a complete thermonuclear explosion — a Type Ia supernova.',
      },
    },

    {
      heading: 'The Chandrasekhar Limit: A Ceiling That Cannot Be Broken',
      level: 2,
      paragraphs: [
        'In the first half of the twentieth century, the young Indian physicist Subrahmanyan Chandrasekhar ' +
        'performed a decisive calculation: electron degeneracy pressure is not unlimited. ' +
        'If the mass of a white dwarf exceeds approximately 1.4 solar masses, ' +
        'electrons begin to move at speeds approaching the speed of light, ' +
        'and their pressure can no longer offset gravity. This threshold is the **Chandrasekhar limit**.',

        'The discovery met with skepticism: the eminent astrophysicist Arthur Eddington publicly ' +
        'rejected the idea that a star could collapse completely. ' +
        'But Chandrasekhar was right. No isolated white dwarf in nature exceeds this limit — ' +
        'if one accumulates mass from a companion star and approaches the threshold, ' +
        'a thermonuclear explosion tears it apart entirely. ' +
        'Chandrasekhar received the Nobel Prize only in the nineteen-eighties — ' +
        'decades after his calculations had become the foundation of astrophysics.',
      ],
    },

    {
      heading: 'Structure and Composition',
      level: 2,
      paragraphs: [
        'A typical white dwarf is predominantly a carbon-oxygen core wrapped in a thin helium layer ' +
        'and an even thinner outer hydrogen envelope. Despite enormous internal temperatures — ' +
        'ranging from a few million to tens of millions of kelvin — ' +
        'the surface is already much cooler, and the interior itself is in a state ' +
        'resembling a crystalline lattice. Carbon and oxygen ions arrange into an ordered grid — ' +
        'a **crystallized plasma state**.',

        'For more massive progenitor stars (around eight to ten solar masses), ' +
        'nuclear fusion proceeds further: the remnant core is enriched with oxygen, neon, and magnesium. ' +
        'Such objects are more massive and less common. ' +
        'They play a special role in the evolution of close binary systems.',

        'The surface of a white dwarf is covered by an atmosphere — though the term is approximate: ' +
        'a layer thinner than a sheet of paper relative to the object\'s total radius. ' +
        'The atmospheric composition determines the _spectral type_. ' +
        'Type **DA** — with hydrogen absorption lines — is the most common (roughly eighty percent). ' +
        'Type **DB** shows helium lines (hydrogen has diffused downward). ' +
        'Type **DC** shows no distinct absorption lines — the surface is too cool. ' +
        'More exotic subtypes exist: DZ with metallic lines (traces of accreted asteroids), ' +
        'and DQ with carbon molecular features.',
      ],
    },

    {
      image: {
        cacheKey: 'white-dwarfs-internal-structure',
        prompt:
          'Scientific cutaway diagram of a white dwarf internal structure: ' +
          'a cross-section showing concentric layers — a crystallized carbon-oxygen core in the center (deep blue, labeled), ' +
          'surrounded by a thin helium layer (lighter blue), then an even thinner hydrogen atmosphere on the outside (pale). ' +
          'The overall sphere is Earth-sized. Hard sci-fi style, dark background, monospace labels, technically accurate proportions for each layer. ' +
          'Add the following text labels on the image: "crystallized C-O core", "helium layer", "hydrogen atmosphere", "Earth-size scale".',
        alt: 'Cross-section of a white dwarf: crystallized carbon-oxygen core, helium layer, and thin hydrogen atmosphere',
        caption:
          'Despite the name "dwarf," the internal structure of this object is remarkably complex. ' +
          'The core is in a crystalline state — ions arrange into a lattice when cooling drops below a critical temperature. ' +
          'The helium and hydrogen layers together account for only hundredths of a percent of the total mass.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Cooling: A Slow Dimming Across Eternity',
      level: 2,
      paragraphs: [
        'A white dwarf has no internal energy source. ' +
        'It radiates only the heat accumulated over billions of years of stellar burning. ' +
        'Cooling proceeds slowly — initially the white dwarf glows intensely in the blue range, ' +
        'gradually shifting toward yellow, and eventually to faint red.',

        'Astronomers use the **cooling sequence** as a timekeeping tool. ' +
        'By comparing the temperature distribution of white dwarfs in star clusters ' +
        'against theoretical cooling models, the age of the cluster can be established. ' +
        'The coolest white dwarfs in the galactic disk set a lower bound: ' +
        'if they have cooled to a certain temperature, the stellar generation that produced them ' +
        'is at least ten billion years old. This provides an independent check on the cosmological age of the universe.',

        'An interesting detail: when cooling below approximately twenty-five thousand kelvin, ' +
        'some white dwarfs begin to pulsate — these are _ZZ Ceti stars_. ' +
        'Their oscillations arise from an instability in the partial hydrogen ionization zone: ' +
        'radiation emerging from the core drives the outer layer like a piston in an engine. ' +
        'Analyzing these pulsations allows astronomers to probe the internal structure of the dwarf ' +
        'with a precision unachievable through direct observation.',
      ],
    },

    {
      heading: 'Famous White Dwarfs and Early Observations',
      level: 2,
      paragraphs: [
        'The first white dwarf in astronomical history is **Sirius B**, companion to the brilliant star Sirius. ' +
        'The anomalous gravitational wobble of Sirius was predicted in the mid-nineteenth century ' +
        'by Friedrich Bessel, who inferred an unseen massive companion. ' +
        'Sirius B itself was first seen through a telescope only in the eighteen-sixties — ' +
        'nearly two decades after the prediction. ' +
        'Its nature remained a puzzle for decades: the spectrum indicated a stellar temperature, ' +
        'but the radius inferred from its luminosity was astonishingly small. ' +
        'Only in the early twentieth century did physicists recognize this as a fundamentally new class of object.',

        '**40 Eridani B** is another classic example, visible through a modest amateur telescope ' +
        'at a distance of approximately sixteen light-years. ' +
        'It is part of a triple star system and served as one of the first objects ' +
        'against which theories of degenerate matter were tested.',

        'Among pulsating ZZ Ceti stars, **BPM 37093** draws particular attention — ' +
        'a dwarf where a significant fraction of the mass has crystallized. ' +
        'Astronomers sometimes describe it figuratively as a "diamond star": ' +
        'crystallized carbon in a cubic diamond lattice structure is physically accurate ' +
        'for part of its core. Though the term should not be taken too literally — ' +
        'the conditions inside differ from terrestrial diamonds as much as ' +
        'stellar temperatures differ from room temperature.',
      ],
    },

    {
      image: {
        cacheKey: 'white-dwarfs-zz-ceti-pulsations',
        prompt:
          'Scientific illustration of a ZZ Ceti pulsating white dwarf: ' +
          'a compact bright sphere showing oscillating surface waves depicted as concentric ripples of slightly varying brightness, ' +
          'surrounding deep black space, faint light curve graph shown as an inset at corner showing periodic brightness variations over hours. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "ZZ Ceti variable", "pulsation period minutes", "hydrogen ionization instability".',
        alt: 'Pulsating ZZ Ceti white dwarf with surface oscillations and an inset light curve graph',
        caption:
          'ZZ Ceti stars pulsate with periods ranging from a few minutes to a few hours. ' +
          'Their oscillations are acoustic and gravity waves propagating through the dwarf\'s interior. ' +
          'Asteroseismology of ZZ Ceti objects allows measurement of the hydrogen-helium layer thickness ' +
          'and the rate of core crystallization.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Cataclysmic Variables and Type Ia Supernovae',
      level: 2,
      paragraphs: [
        'Most white dwarfs lead a quiet retired existence. ' +
        'But in close binary systems the situation is different. ' +
        'If the companion star expands and transfers material onto the white dwarf, ' +
        'a **cataclysmic variable** forms — a system that erupts repeatedly. ' +
        'Accreted hydrogen accumulates on the dwarf\'s surface, gradually heats up, ' +
        'and reaches thermonuclear ignition temperature. A **nova** occurs: ' +
        'a bright explosion in the outer hydrogen layer, after which the dwarf remains intact ' +
        'and the process can repeat over years or decades.',

        'But if the accumulated mass pushes the dwarf toward the Chandrasekhar limit — ' +
        'or if two white dwarfs merge in a binary — ' +
        'a fundamentally different outcome unfolds. ' +
        'Thermonuclear burning ignites throughout the entire carbon-oxygen core simultaneously. ' +
        'The explosion destroys the star completely: a **Type Ia supernova**.',

        'These events are extraordinarily important for cosmology. ' +
        'Because the peak luminosity is standardized — Type Ia supernovae always reach ' +
        'approximately the same maximum brightness — ' +
        'astronomers can use them as _"standard candles"_ for measuring distances to distant galaxies. ' +
        'Observations of Type Ia supernovae in the late nineteen-nineties led directly to the discovery ' +
        'of the accelerating expansion of the universe and the existence of **dark energy** — ' +
        'one of the most consequential findings in modern cosmology.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Internal Structure of a White Dwarf',
        svg: `<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="420" fill="rgba(10,15,25,0.5)"/>

  <!-- Outer atmosphere (hydrogen) -->
  <circle cx="250" cy="200" r="155" fill="rgba(180,210,255,0.08)" stroke="#7bb8ff" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="250" y="47" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">hydrogen (H) — outer atmosphere</text>
  <text x="250" y="59" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">~0.0001 of total mass</text>

  <!-- Helium layer -->
  <circle cx="250" cy="200" r="130" fill="rgba(100,180,220,0.10)" stroke="#88ccdd" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="250" y="72" fill="#88ccdd" font-family="monospace" font-size="10" text-anchor="middle">helium (He) — intermediate layer</text>
  <text x="250" y="84" fill="#88ccdd" font-family="monospace" font-size="10" text-anchor="middle">~0.01 of total mass</text>

  <!-- Core -->
  <circle cx="250" cy="200" r="100" fill="rgba(68,136,200,0.18)" stroke="#4488aa" stroke-width="2"/>
  <text x="250" y="183" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">crystallized</text>
  <text x="250" y="198" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">carbon-oxygen</text>
  <text x="250" y="213" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">core (C + O)</text>
  <text x="250" y="231" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">~99% of mass</text>
  <text x="250" y="245" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">T ~ 5-20 million K</text>

  <!-- Electron degeneracy pressure arrows -->
  <line x1="250" y1="100" x2="250" y2="138" stroke="#44ff88" stroke-width="2" marker-end="url(#arr-wde-up)"/>
  <line x1="250" y1="300" x2="250" y2="262" stroke="#44ff88" stroke-width="2" marker-end="url(#arr-wde-dn)"/>
  <text x="375" y="191" fill="#44ff88" font-family="monospace" font-size="10">degeneracy</text>
  <text x="375" y="203" fill="#44ff88" font-family="monospace" font-size="10">pressure</text>
  <line x1="370" y1="200" x2="352" y2="200" stroke="#44ff88" stroke-width="1" marker-end="url(#arr-wde-lt)"/>

  <!-- Gravity arrow -->
  <line x1="155" y1="200" x2="175" y2="200" stroke="#cc4444" stroke-width="2" marker-end="url(#arr-wde-rt)"/>
  <text x="80" y="192" fill="#cc4444" font-family="monospace" font-size="10">gravity</text>
  <text x="80" y="204" fill="#cc4444" font-family="monospace" font-size="10">(collapse</text>
  <text x="80" y="216" fill="#cc4444" font-family="monospace" font-size="10">inward)</text>

  <!-- Scale label -->
  <text x="250" y="395" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">Size comparable to Earth. Average mass ~0.6 M☉.</text>

  <!-- Title -->
  <text x="250" y="18" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Internal Structure of a White Dwarf</text>

  <defs>
    <marker id="arr-wde-up" markerWidth="7" markerHeight="7" refX="3.5" refY="6" orient="auto">
      <polygon points="0 7, 3.5 0, 7 7" fill="#44ff88"/>
    </marker>
    <marker id="arr-wde-dn" markerWidth="7" markerHeight="7" refX="3.5" refY="1" orient="auto">
      <polygon points="0 0, 3.5 7, 7 0" fill="#44ff88"/>
    </marker>
    <marker id="arr-wde-lt" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <polygon points="7 0, 0 3.5, 7 7" fill="#44ff88"/>
    </marker>
    <marker id="arr-wde-rt" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#cc4444"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'The equilibrium of a white dwarf is a balance between gravitational compression and electron degeneracy pressure. ' +
          'Roughly ninety-nine percent of the mass is concentrated in the crystallized carbon-oxygen core. ' +
          'The helium and hydrogen shells are thinner than an eyelid relative to the entire body.',
      },
    },

    {
      heading: 'An Unfinished Picture: Black Dwarfs and the Far Future',
      level: 2,
      paragraphs: [
        'Theoretically, given sufficient cooling time, a white dwarf stops radiating altogether — ' +
        'becoming a **black dwarf**: a cold, dark, nearly invisible remnant. ' +
        'But the cooling timescale is so enormous that no black dwarf in the observable universe ' +
        'has had time to form. The age of our universe — approximately thirteen point eight billion years — ' +
        'is shorter than the time needed for even the oldest white dwarf to cool completely.',

        'On still vaster timescales — billions of billions of times longer than the current age of the universe — ' +
        'theorists speculate about proton decay or quantum tunneling transitions. ' +
        'For now, white dwarfs remain a living archive: each one carries encoded information ' +
        'about the mass and chemical composition of its progenitor star, ' +
        'its temperature, its age — and therefore about the conditions in which the Galaxy ' +
        'was forming billions of years ago.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Electron degeneracy pressure',
      definition:
        'Quantum pressure arising from the Pauli exclusion principle: no two electrons can occupy the same quantum state, so at extreme densities they resist further compression regardless of temperature.',
    },
    {
      term: 'Pauli exclusion principle',
      definition:
        'A fundamental principle of quantum mechanics: no two fermions (electrons, neutrons, and so on) can simultaneously occupy the same quantum state. This is what makes white dwarfs possible.',
    },
    {
      term: 'Chandrasekhar limit',
      definition:
        'The maximum mass of a white dwarf at which electron degeneracy pressure can still resist gravity — approximately 1.4 solar masses. Above this limit the object collapses or explodes.',
    },
    {
      term: 'Planetary nebula',
      definition:
        'A shell of gas expelled by a star during the red giant phase before forming a white dwarf. The name arose from their rounded, planet-disk-like appearance in early telescopes — they have no connection to actual planets.',
    },
    {
      term: 'Spectral type DA / DB / DC',
      definition:
        'Classification of white dwarfs by atmospheric composition. DA: hydrogen absorption lines dominate. DB: helium lines dominate (hydrogen has diffused inward). DC: no distinct lines (too cool, or uniform atmosphere).',
    },
    {
      term: 'Cataclysmic variable',
      definition:
        'A close binary system where a white dwarf accretes material from a companion star. Accumulated hydrogen on the dwarf\'s surface periodically ignites in a thermonuclear flash — a nova outburst.',
    },
    {
      term: 'Type Ia supernova',
      definition:
        'A thermonuclear explosion that completely destroys a white dwarf when its mass approaches the Chandrasekhar limit. Because peak luminosity is standardized, they are used as "standard candles" for measuring cosmic distances.',
    },
    {
      term: 'ZZ Ceti variable',
      definition:
        'A pulsating white dwarf with a hydrogen-dominated atmosphere, located in the instability strip during cooling. Oscillations are a tool for stellar seismology — probing the interior structure of the dwarf.',
    },
    {
      term: 'Cooling sequence',
      definition:
        'The theoretical track on a Hertzsprung-Russell diagram along which a white dwarf moves as it gradually cools. Used to determine the age of star clusters and the galactic disk.',
    },
  ],

  quiz: [
    {
      question: 'What prevents a white dwarf from collapsing under gravity?',
      options: [
        'Thermonuclear reactions in the core',
        'Electron degeneracy pressure',
        'Magnetic field',
        'Rapid rotation',
      ],
      correctIndex: 1,
      explanation:
        'No thermonuclear reactions occur in a white dwarf. Equilibrium is maintained by electron degeneracy pressure — a quantum effect tied to the Pauli exclusion principle. This pressure is independent of temperature, so the dwarf keeps its size as it cools.',
    },
    {
      question: 'What is the maximum mass of a white dwarf?',
      options: [
        'Approximately 0.6 solar masses',
        'Approximately 1.4 solar masses',
        'Approximately 3 solar masses',
        'Approximately 8 solar masses',
      ],
      correctIndex: 1,
      explanation:
        'The Chandrasekhar limit is approximately 1.4 solar masses. Above this threshold, electron degeneracy pressure cannot offset gravity. No observed isolated white dwarf exceeds this limit.',
    },
    {
      question: 'How are mass and radius related in a white dwarf?',
      options: [
        'Greater mass means larger radius (as with ordinary stars)',
        'Mass and radius are unrelated',
        'Greater mass means smaller radius',
        'The relationship is nonlinear but generally greater mass gives greater radius',
      ],
      correctIndex: 2,
      explanation:
        'This is one of the paradoxes of degenerate matter: the more massive a white dwarf, the smaller its radius. As mass approaches the Chandrasekhar limit, the radius trends toward zero. This is the opposite of normal stellar behavior.',
    },
    {
      question: 'Why are Type Ia supernovae important for cosmology?',
      options: [
        'They are the source of elements heavier than iron',
        'They produce neutron stars with predictable properties',
        'They have a standardized peak luminosity and are used to measure distances',
        'They are the only source of gravitational waves in the Galaxy',
      ],
      correctIndex: 2,
      explanation:
        'Type Ia supernovae occur when a white dwarf reaches the Chandrasekhar limit and a thermonuclear explosion destroys it completely. Because the mass threshold is approximately the same, peak luminosity is standardized. This allows measurement of distances to galaxies and led to the discovery of the accelerating expansion of the universe.',
    },
    {
      question: 'Which spectral type of white dwarf is most common?',
      options: [
        'DB (helium atmosphere)',
        'DC (no lines)',
        'DA (hydrogen atmosphere)',
        'DZ (metallic lines)',
      ],
      correctIndex: 2,
      explanation:
        'Approximately eighty percent of known white dwarfs are of type DA — they show hydrogen absorption lines in their spectrum. Helium is heavier and diffuses inward over time, leaving hydrogen in the outermost layer.',
    },
  ],

  sources: [
    {
      title: 'Chandrasekhar S. — The Maximum Mass of Ideal White Dwarfs',
      url: 'https://articles.adsabs.harvard.edu/pdf/1931ApJ....74...81C',
      meta: 'ApJ, 74, 81–82, 1931',
    },
    {
      title: 'Fontaine G., Brassard P., Bergeron P. — The Potential of White Dwarf Cosmochronology',
      url: 'https://www.pasp.org/doi/abs/10.1086/338846',
      meta: 'PASP, 113, 409–435, 2001',
    },
    {
      title: 'Tremblay P.-E. et al. — Core crystallization and pile-up in the cooling sequence of evolving white dwarfs',
      url: 'https://www.nature.com/articles/s41586-019-1009-9',
      meta: 'Nature, 565, 202–205, 2019 (open access)',
    },
    {
      title: 'Winget D.E., Kepler S.O. — Pulsating White Dwarf Stars and Precision Asteroseismology',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev.astro.46.060407.145250',
      meta: 'ARA&A, 46, 157–199, 2008',
    },
    {
      title: 'Hillebrandt W., Niemeyer J.C. — Type Ia Supernova Explosion Models',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev.astro.38.1.191',
      meta: 'ARA&A, 38, 191–230, 2000',
    },
    {
      title: 'Perlmutter S. et al. — Measurements of Omega and Lambda from 42 High-Redshift Supernovae',
      url: 'https://arxiv.org/abs/astro-ph/9812133',
      meta: 'ApJ, 517, 565–586, 1999 (Nobel Prize 2011)',
    },
    {
      title: 'Koester D. — White dwarf spectra and atmosphere models',
      url: 'https://link.springer.com/article/10.1007/s00159-010-0029-6',
      meta: 'A&A Review, 18, 471–566, 2010',
    },
    {
      title: 'NASA — White Dwarfs',
      url: 'https://science.nasa.gov/universe/stars/types/white-dwarfs/',
      meta: 'NASA Science, official page, updated 2025',
    },
    {
      title: 'Córsico A.H. et al. — Pulsating white dwarfs: new insights',
      url: 'https://link.springer.com/article/10.1007/s00159-019-0118-4',
      meta: 'A&A Review, 27, 7, 2019',
    },
    {
      title: 'Dufour P. et al. — Spectral Analysis of Hot, Hydrogen-Deficient White Dwarfs',
      url: 'https://iopscience.iop.org/article/10.1086/510150',
      meta: 'ApJ, 641, 488–505, 2007',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
