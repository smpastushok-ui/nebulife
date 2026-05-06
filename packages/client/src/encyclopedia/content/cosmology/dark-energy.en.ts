import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'dark-energy',
  language: 'en',
  section: 'cosmology',
  order: 5,
  difficulty: 'intermediate',
  readingTimeMin: 13,
  title: 'Dark Energy and Accelerating Expansion',
  subtitle: "The unknown force pushing the universe apart. Why 68% of reality can't be measured, touched, or explained.",

  hero: {
    cacheKey: 'dark-energy-hero',
    prompt:
      'Photorealistic scientific illustration of the expanding universe: vast cosmic web of galaxy filaments stretching apart against deep black space, ' +
      'galaxies shown as glowing amber-white clusters connected by luminous threads, space fabric visibly stretching between them with a subtle grid distortion effect, ' +
      'scale bars showing increasing distances between galaxy groups. ' +
      'Hard sci-fi style scientific illustration, dark space background, wide aspect ratio. ' +
      'Add the following text labels on the image: "dark energy 68%", "accelerating expansion", "cosmic web".',
    alt: 'The expanding universe — galaxies receding across the stretched fabric of space',
    caption:
      'The cosmic web — the large-scale structure of the universe. Dark energy acts as an invisible pressure accelerating the divergence of these filaments from one another. No instrument has directly detected it.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Add up all the visible matter in the universe — stars, gas, planets, black holes — ' +
        'and you get roughly 5 percent of its total contents. Another 27 percent is ' +
        '_dark matter_: invisible but gravitationally active. ' +
        'The remaining 68 percent is **dark energy**: something we cannot see, ' +
        'feel, or explain with any known physics. ' +
        'Yet this invisible remainder determines the fate of everything that exists.',

        'What makes it stranger still is that dark energy was discovered by accident — ' +
        'and the discovery overturned all of late-twentieth-century cosmology. ' +
        'Scientists set out to confirm the expected: that the universe\'s expansion ' +
        'was slowing down under gravity. Instead they found it is speeding up. ' +
        'The 2011 Nobel Prize in Physics went to the teams who made that discovery.',
      ],
    },

    {
      heading: 'Why gravity was supposed to brake everything',
      level: 2,
      paragraphs: [
        'After the Big Bang the universe expanded. Edwin Hubble confirmed this in the first half ' +
        'of the twentieth century: distant galaxies move away from us, and the farther away they are, ' +
        'the faster they recede. But everyone assumed that rate of expansion had to be falling. ' +
        'Gravity — an attractive force — should slow down any moving matter. ' +
        'The universe was like a ball thrown upward: it moves, but ever more slowly. ' +
        'The only open question was whether the total mass would determine a permanent expansion ' +
        'or an eventual collapse into a Big Crunch.',

        'To measure the rate of that slowdown, cosmologists needed a _distance standard_ — ' +
        'an object whose true luminosity they knew precisely. Then, comparing expected brightness ' +
        'with observed brightness, they could calculate distance and cross-check it against ' +
        'recession speed from redshift. **Type Ia supernovae** turned out to be the perfect candidate.',
      ],
    },

    {
      image: {
        cacheKey: 'dark-energy-supernova-ia',
        prompt:
          'Photorealistic scientific illustration of a Type Ia supernova explosion: ' +
          'a white dwarf star in a binary system accreting matter from a companion red giant, ' +
          'then detonating in a brilliant spherical thermonuclear explosion with a blue-white shock wave front, ' +
          'surrounding space illuminated brightly, companion star visible at a distance. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "white dwarf", "companion star", "Type Ia supernova", "standard candle".',
        alt: 'Type Ia supernova — the thermonuclear explosion of a white dwarf that exceeded the Chandrasekhar limit',
        caption:
          'A Type Ia supernova occurs when a white dwarf in a binary system accretes enough mass from its companion to reach a critical threshold (roughly 1.4 solar masses) and detonates with a predictable peak luminosity. That predictability makes it an ideal cosmic distance marker.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Standard candles and an unexpected result',
      level: 2,
      paragraphs: [
        'Type Ia supernovae have a remarkable property: their _peak absolute luminosity_ ' +
        'is nearly the same for every such event in the universe. The physical reason is simple: ' +
        'the explosion happens whenever a white dwarf crosses the same critical threshold — ' +
        'the _Chandrasekhar limit_ (approximately 1.4 solar masses). ' +
        'The same trigger produces the same explosion. Knowing the true brightness and ' +
        'measuring the apparent brightness, physicists can calculate distance to a supernova ' +
        'to within a few percent — even billions of light-years away.',

        'In the second half of the 1990s, two independent teams — led by ' +
        'Adam Riess and Brian Schmidt (the High-Z Supernova Search Team) ' +
        'and Saul Perlmutter (the Supernova Cosmology Project) — ' +
        'systematically measured the brightness of distant Type Ia supernovae. ' +
        'The 1998 result astonished everyone: distant supernovae appeared _dimmer_ than they should ' +
        'if expansion were slowing. That meant one thing: they were farther away than predicted ' +
        'by any decelerating model. The universe is not braking — it is accelerating.',
      ],
    },

    {
      image: {
        cacheKey: 'dark-energy-expansion-graph',
        prompt:
          'Scientific graph showing the history of cosmic expansion: ' +
          'horizontal axis labeled "time" from Big Bang to present, vertical axis labeled "scale factor a(t)", ' +
          'two curves shown — dashed red curve showing decelerating expansion (expected without dark energy), ' +
          'solid blue curve showing accelerating expansion (observed), ' +
          'vertical marker at "today" showing the two curves diverging significantly, ' +
          'annotation showing "deceleration era" and "acceleration era" separated by a transition point. ' +
          'Hard sci-fi style, dark background, monospace font, Game Bible palette colors. ' +
          'Add the following text labels on the image: "scale factor a(t)", "acceleration era", "deceleration era", "today".',
        alt: 'Graph of the cosmic scale factor: expected deceleration versus observed acceleration',
        caption:
          'The blue curve is the real fate of the universe with dark energy. The dashed red curve shows what was expected without it. The transition from deceleration to acceleration happened roughly 5 billion years ago.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: "Einstein's cosmological constant",
      level: 2,
      paragraphs: [
        'To describe the acceleration, physicists returned to an idea Einstein had once discarded ' +
        'as a mistake. His equations of general relativity contain a slot for a ' +
        '**cosmological constant** (denoted by the Greek letter lambda). ' +
        'Einstein originally introduced it to obtain a static universe — ' +
        'but after Hubble\'s discovery of expansion he abandoned it, calling it ' +
        'his "greatest blunder." It now turns out that this "blunder" fits the data ' +
        'better than any competing model.',

        'Physically, lambda means that _empty space_ has an _energy density_ — ' +
        'the energy of the vacuum itself. Unlike matter or photons, this energy does not ' +
        'dilute as the universe expands, so it eventually comes to dominate. ' +
        'When vacuum energy takes over it acts as a _negative pressure_, ' +
        'pushing space apart from within and driving accelerating expansion. ' +
        'The standard cosmological model today is labeled **LCDM** — ' +
        'lambda plus cold dark matter.',
      ],
    },

    {
      diagram: {
        title: 'Composition of the Universe — LCDM model',
        svg: `<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Pie chart approximation as arc segments -->
  <!-- Dark energy 68%: ~245 degrees arc -->
  <path d="M 200 140 L 200 60 A 80 80 0 1 1 66 193 Z" fill="rgba(68,136,170,0.35)" stroke="#4488aa" stroke-width="1.5"/>
  <!-- Dark matter 27%: ~97 degrees arc -->
  <path d="M 200 140 L 66 193 A 80 80 0 0 1 192 60 Z" fill="rgba(123,184,255,0.25)" stroke="#7bb8ff" stroke-width="1.5"/>
  <!-- Ordinary matter 5%: ~18 degrees arc -->
  <path d="M 200 140 L 192 60 A 80 80 0 0 1 200 60 Z" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1.5"/>

  <!-- Legend -->
  <rect x="320" y="80" width="14" height="14" fill="rgba(68,136,170,0.35)" stroke="#4488aa" stroke-width="1"/>
  <text x="342" y="92" fill="#aabbcc" font-family="monospace" font-size="13">Dark energy (Λ) — 68%</text>

  <rect x="320" y="110" width="14" height="14" fill="rgba(123,184,255,0.25)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="342" y="122" fill="#aabbcc" font-family="monospace" font-size="13">Dark matter — 27%</text>

  <rect x="320" y="140" width="14" height="14" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1"/>
  <text x="342" y="152" fill="#aabbcc" font-family="monospace" font-size="13">Ordinary matter — 5%</text>

  <text x="320" y="192" fill="#8899aa" font-family="monospace" font-size="10">of which stars and planets: ~0.5%</text>
  <text x="320" y="208" fill="#8899aa" font-family="monospace" font-size="10">interstellar gas and dust: ~4.5%</text>

  <text x="200" y="240" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">ΛCDM model (Planck 2018)</text>

  <defs>
    <marker id="arr2" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'The universe we see and touch is only 5% of what exists. The remaining 95% is dark matter and dark energy, whose nature we do not yet understand. Data: Planck satellite 2018.',
      },
    },

    {
      heading: 'Quantum physics and the vacuum energy catastrophe',
      level: 2,
      paragraphs: [
        'The idea of vacuum energy also appears in quantum mechanics — and this is where ' +
        'one of the deepest unsolved problems in physics begins. Quantum field theory predicts ' +
        'that the vacuum is not empty: it seethes with _virtual particles_ ' +
        'that constantly flicker in and out of existence. ' +
        'That fluctuation activity carries energy — and that energy, in theory, ' +
        'ought to play the role of the cosmological constant.',

        'The problem is that the theoretically calculated value of vacuum energy ' +
        'exceeds the measured dark energy by roughly 10 to the power of 120. ' +
        'That is the largest discrepancy between theory and observation in all of physics — ' +
        'sometimes called "the worst prediction in the history of science." ' +
        'Why is dark energy so tiny rather than enormous? ' +
        'We have no answer. This is the _cosmological constant problem_: ' +
        'an open wound in theoretical physics, attracting the attention of hundreds of researchers.',
      ],
    },

    {
      heading: 'How we measure dark energy',
      level: 2,
      paragraphs: [
        'Type Ia supernovae are only one method. Modern cosmology uses several independent ' +
        'tools to pin down the properties of dark energy from different angles.',

        '_Baryon acoustic oscillations_ (BAO) are the imprints of sound waves that traveled ' +
        'through the primordial plasma in the first 380 thousand years after the Big Bang. ' +
        'Those waves left a characteristic scale in the distribution of galaxies ' +
        '(roughly 500 million light-years) — a ruler encoded in the large-scale structure of the universe. ' +
        'By measuring how that characteristic size appears to change with distance, ' +
        'we track the expansion rate at different epochs and infer how dark energy behaved.',

        '_Gravitational lensing_ allows us to map the distribution of dark matter — ' +
        'and thereby constrain the properties of dark energy, which alters the rate of structure formation. ' +
        'The _cosmic microwave background_ (CMB), measured by the WMAP and Planck satellites, ' +
        'provides an independent confirmation: temperature fluctuations at the level of millionths of a degree ' +
        'are consistent with the LCDM model at a precisely determined value of lambda.',
      ],
    },

    {
      image: {
        cacheKey: 'dark-energy-bao-map',
        prompt:
          'Scientific visualization of Baryon Acoustic Oscillations (BAO) in galaxy distribution: ' +
          'slice of the observable universe showing galaxy positions as glowing amber-white points, ' +
          'with a subtle ring-like enhancement pattern at ~500 million light-year scale visible as a statistical overdensity ring, ' +
          'annotated with scale bar, deep black space background with cosmic web filaments faintly visible. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "BAO scale ~500 Mly", "galaxy overdensity ring", "standard ruler".',
        alt: 'Map of galaxy distribution showing the BAO ring — a statistical overdensity at a scale of 500 million light-years',
        caption:
          'Baryon acoustic oscillations imprinted a characteristic scale in the distribution of galaxies that serves as a "standard ruler" for measuring the expansion rate of the universe at different cosmic distances.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'DESI and Euclid: new measurements for a new millennium',
      level: 2,
      paragraphs: [
        'In 2024 the DESI instrument (Dark Energy Spectroscopic Instrument) published ' +
        'its first results: a three-dimensional map of more than six million galaxies — ' +
        'the largest cosmological map at that point. The finding was unexpected: ' +
        'the data deviate slightly from the model with a constant lambda, hinting ' +
        'that dark energy may not be fixed in time. ' +
        'The statistical significance of the deviation is not yet strong enough for firm conclusions — ' +
        'but if confirmed with a larger dataset, it would mean that dark energy is not a constant ' +
        'but an evolving _field_.',

        'The Euclid space telescope, launched in 2023 by the European Space Agency, ' +
        'is mapping one billion galaxies out to roughly 10 billion light-years. ' +
        'Its goal is to measure both BAO and gravitational lensing with unprecedented precision, ' +
        'answering the question: constant lambda or not? ' +
        'Euclid\'s first scientific images were released in 2024; ' +
        'the main science catalog is expected after 2026.',
      ],
    },

    {
      image: {
        cacheKey: 'dark-energy-desi-3d-map',
        prompt:
          'Photorealistic scientific visualization of the DESI 3D galaxy map: ' +
          'vast three-dimensional slice of the universe showing millions of galaxies as tiny luminous points ' +
          'organized in cosmic web filaments, voids, and clusters, ' +
          'the slice extending billions of light-years into deep space with increasing galaxy density toward center, ' +
          'deep black background with faint cyan-blue coloring for closer structures, ' +
          'orange-amber for distant ones (redshift color coding). ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "DESI 3D galaxy map", "6 million galaxies", "filaments and voids".',
        alt: 'The DESI three-dimensional galaxy map — six million galaxies in the cosmic web',
        caption:
          'First DESI results (2024): the largest three-dimensional map of the universe at cosmological scales. Color encodes distance — nearer galaxies (blue) and distant ones (amber). The data measure BAO to better than one percent accuracy.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Alternatives: quintessence and modified gravity',
      level: 2,
      paragraphs: [
        'A constant lambda is the simplest solution, but not the only one. ' +
        'If dark energy varies with time, it can be described as _quintessence_ — ' +
        'a hypothetical scalar field pervading all of space and slowly evolving. ' +
        'Unlike a constant, quintessence carries an equation-of-state parameter (written as w) ' +
        'that can differ from minus one and change over time. ' +
        'The DESI data hint precisely at this: w may have been larger than minus one in the past ' +
        'and smaller today — so-called "dynamical dark energy."',

        'A more radical possibility is that gravity, as described by Einstein, is only an approximation, ' +
        'and on cosmological scales it behaves differently. ' +
        '_Modified gravity theories_ — f(R) gravity, Brans-Dicke theory, galileon fields — ' +
        'try to explain acceleration without any new field, by rewriting Einstein\'s field equations directly. ' +
        'So far no alternative beats standard LCDM across all available data, ' +
        'but the research is ongoing.',
      ],
    },

    {
      diagram: {
        title: 'Dark energy equation-of-state parameter w',
        svg: `<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="240" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="80" y1="180" x2="580" y2="180" stroke="#334455" stroke-width="1.5"/>
  <line x1="80" y1="40" x2="80" y2="185" stroke="#334455" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="575" y="195" fill="#8899aa" font-family="monospace" font-size="11">w (equation of state)</text>

  <!-- Key markers on x axis -->
  <line x1="130" y1="178" x2="130" y2="184" stroke="#8899aa" stroke-width="1"/>
  <text x="130" y="196" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">-2</text>

  <line x1="255" y1="178" x2="255" y2="184" stroke="#cc4444" stroke-width="1.5"/>
  <text x="255" y="196" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">-1 (Λ)</text>

  <line x1="422" y1="178" x2="422" y2="184" stroke="#8899aa" stroke-width="1"/>
  <text x="422" y="196" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">-1/3</text>

  <line x1="530" y1="178" x2="530" y2="184" stroke="#8899aa" stroke-width="1"/>
  <text x="530" y="196" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">0</text>

  <!-- Regions -->
  <rect x="82" y="50" width="170" height="125" fill="rgba(204,68,68,0.07)" stroke="none"/>
  <text x="167" y="90" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">phantom</text>
  <text x="167" y="103" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">(Big Rip)</text>

  <line x1="255" y1="50" x2="255" y2="178" stroke="#cc4444" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="262" y="65" fill="#cc4444" font-family="monospace" font-size="10">Λ = const</text>
  <text x="262" y="78" fill="#8899aa" font-family="monospace" font-size="9">standard ΛCDM</text>

  <rect x="257" y="50" width="162" height="125" fill="rgba(68,255,136,0.05)" stroke="none"/>
  <text x="338" y="90" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">quintessence</text>
  <text x="338" y="103" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">(acceleration)</text>

  <rect x="424" y="50" width="152" height="125" fill="rgba(170,187,204,0.05)" stroke="none"/>
  <text x="500" y="90" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">deceleration</text>
  <text x="500" y="103" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">(matter-like</text>
  <text x="500" y="116" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">regime)</text>

  <!-- DESI 2024 hint -->
  <line x1="255" y1="130" x2="210" y2="130" stroke="#ff8844" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="260" y="133" fill="#ff8844" font-family="monospace" font-size="9">DESI 2024</text>
  <text x="260" y="144" fill="#ff8844" font-family="monospace" font-size="9">hint: w&lt;-1</text>

  <defs>
    <marker id="arr3" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#ff8844"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'The equation-of-state parameter w characterizes the type of dark energy. At w = -1: Einstein\'s cosmological constant. At w < -1: "phantom" dark energy leading to a Big Rip. Between -1 and -1/3: various quintessence models. Current DESI data mildly hint at values below -1.',
      },
    },

    {
      heading: 'The future of the universe: Big Freeze or Big Rip',
      level: 2,
      paragraphs: [
        'The fate of the universe depends directly on what dark energy actually is. ' +
        'With a constant lambda, expansion continues forever at a finite rate. ' +
        'Galaxies beyond our Local Group gradually recede beyond the observable horizon. ' +
        'Stars burn out, black holes evaporate, matter disperses — ' +
        'the universe ends in a frozen darkness. This is the **Big Freeze** scenario.',

        'If the equation-of-state parameter w is less than minus one, dark energy grows over time. ' +
        'The acceleration of expansion then increases without limit. ' +
        'First the threads of large-scale structure are torn, then galaxies, ' +
        'then stellar systems, then planets, then atoms — ' +
        'everything is ripped apart in a finite time. This is the **Big Rip** scenario. ' +
        'Current data place any such event, if it is even possible, at least tens of billions of years away. ' +
        'But the answer depends on whether physics ever delivers a true explanation ' +
        'for the nature of dark energy.',
      ],
    },

    {
      image: {
        cacheKey: 'dark-energy-big-freeze-rip',
        prompt:
          'Scientific split illustration showing two cosmic fates side by side: ' +
          'left half labeled "Big Freeze" showing a very sparse universe with isolated cold dead galaxies, extreme darkness, ' +
          'right half labeled "Big Rip" showing galaxies, then stars, then atoms being torn apart by expanding space, ' +
          'intense red-orange glow along fracture lines in the right panel, ' +
          'central dividing line between scenarios. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "Big Freeze (w = -1)", "Big Rip (w < -1)", "heat death", "space tears apart".',
        alt: 'Two scenarios for the end of the universe: Big Freeze on the left, Big Rip on the right',
        caption:
          'If dark energy is constant, the universe ends in cold darkness (Big Freeze). If it grows over time, space itself tears apart (Big Rip). Which fate awaits us depends on the value of w, which Euclid and DESI are now measuring.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Dark energy',
      definition:
        'An unknown form of energy that fills all of space uniformly and is responsible for the accelerating expansion of the universe. It constitutes roughly 68% of the total energy content of the universe. Its nature remains unexplained.',
    },
    {
      term: 'Cosmological constant (Λ)',
      definition:
        'A term in the equations of general relativity, introduced by Einstein. Physically it corresponds to the energy density of the vacuum — a non-zero energy in empty space. The simplest and most widely used model of dark energy.',
    },
    {
      term: 'Type Ia supernova',
      definition:
        'The explosion of a white dwarf in a binary system after it accretes enough mass to reach the Chandrasekhar limit (~1.4 solar masses). Its peak luminosity is nearly the same for every such event, making it a "standard candle" for measuring cosmic distances.',
    },
    {
      term: 'Baryon acoustic oscillations (BAO)',
      definition:
        'A characteristic scale in the distribution of galaxies (~500 million light-years) that arose from sound waves in the primordial plasma. It serves as a "standard ruler" for measuring the expansion rate of the universe at different cosmic epochs.',
    },
    {
      term: 'Equation-of-state parameter (w)',
      definition:
        'The ratio of pressure to energy density for dark energy. At w = -1: cosmological constant. At w < -1: "phantom" dark energy (leads to Big Rip). Between -1 and -1/3: quintessence models.',
    },
    {
      term: 'Quintessence',
      definition:
        'A hypothetical scalar field that permeates all of space and evolves over time. An alternative to the cosmological constant: it explains accelerating expansion through a dynamic field rather than a constant.',
    },
    {
      term: 'Big Freeze',
      definition:
        'A scenario for the end of the universe under a constant dark energy: infinite expansion causes all galaxies beyond the Local Group to recede beyond the observable horizon, stars burn out, and the universe reaches thermodynamic equilibrium.',
    },
    {
      term: 'Big Rip',
      definition:
        'A scenario for the end of the universe under phantom dark energy (w < -1): the acceleration of expansion grows without limit and in a finite time tears apart galaxies, stars, planets, and ultimately atoms.',
    },
  ],

  quiz: [
    {
      question: 'Why are Type Ia supernovae used as "standard candles" for measuring distance?',
      options: [
        'They always explode with the same duration',
        'Their peak luminosity is nearly identical for every such event in the universe',
        'They are located at the centers of galaxies',
        'They are visible to the naked eye',
      ],
      correctIndex: 1,
      explanation:
        'A Type Ia supernova detonates when a white dwarf reaches the Chandrasekhar limit (~1.4 solar masses). The same trigger produces the same explosion and the same peak luminosity. By comparing expected brightness to measured brightness, the distance can be calculated to within a few percent.',
    },
    {
      question: 'What unexpected discovery did the Riess and Perlmutter teams make in 1998?',
      options: [
        'The universe is not expanding',
        "The universe's expansion is decelerating faster than expected",
        'Distant supernovae appeared dimmer than predicted — the universe is accelerating',
        'Dark matter comprises 68% of the universe',
      ],
      correctIndex: 2,
      explanation:
        'Distant Type Ia supernovae appeared dimmer (and therefore farther) than any decelerating-expansion model predicted. The only explanation: the expansion of the universe is accelerating, driven by dark energy. That discovery earned the 2011 Nobel Prize in Physics.',
    },
    {
      question: 'What is the cosmological constant (Λ) in physical terms?',
      options: [
        'The expansion rate of the universe',
        'The mass of dark matter at the centers of galaxies',
        'The energy density of the vacuum — a non-zero energy of empty space',
        "Newton's gravitational constant",
      ],
      correctIndex: 2,
      explanation:
        'The cosmological constant Λ corresponds to the energy density of the vacuum: empty space carries a non-zero energy. That energy does not dilute as the universe expands, so it eventually dominates over matter, acting as a negative pressure that drives accelerating expansion.',
    },
    {
      question: 'What did the first DESI results of 2024 indicate?',
      options: [
        'Dark energy is precisely a constant — no deviation detected',
        'The universe is actually not accelerating',
        'Data show a slight deviation from constant Λ, hinting at dynamical dark energy',
        'Dark matter and dark energy are the same field',
      ],
      correctIndex: 2,
      explanation:
        'The first DESI results (a three-dimensional map of more than six million galaxies) showed a slight deviation from the constant-lambda model. This could mean that dark energy evolves over time — but the statistical significance still requires confirmation with a larger dataset.',
    },
  ],

  sources: [
    {
      title: 'Riess A. G. et al. — Observational Evidence from Supernovae for an Accelerating Universe',
      url: 'https://iopscience.iop.org/article/10.1086/300499',
      meta: 'AJ, 116, 1009, 1998 (open access)',
    },
    {
      title: 'Perlmutter S. et al. — Measurements of Omega and Lambda from 42 High-Redshift Supernovae',
      url: 'https://iopscience.iop.org/article/10.1086/307221',
      meta: 'ApJ, 517, 565, 1999 (open access)',
    },
    {
      title: 'DESI Collaboration — DESI 2024 VI: Cosmological Constraints from BAO Measurements',
      url: 'https://arxiv.org/abs/2404.03002',
      meta: 'arXiv:2404.03002, 2024 (open access)',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results VI: Cosmological Parameters',
      url: 'https://arxiv.org/abs/1807.06209',
      meta: 'A&A, 641, A6, 2020 (open access)',
    },
    {
      title: 'Euclid Collaboration — Euclid Early Release Observations',
      url: 'https://arxiv.org/abs/2309.01201',
      meta: 'arXiv:2309.01201, 2023 (open access)',
    },
    {
      title: 'Weinberg S. — The Cosmological Constant Problem',
      url: 'https://link.aps.org/doi/10.1103/RevModPhys.61.1',
      meta: 'Rev. Mod. Phys. 61, 1, 1989',
    },
    {
      title: 'Carroll S. — The Cosmological Constant (review)',
      url: 'https://link.livingreviews.org/articles/lrr-2001-1',
      meta: 'Living Reviews in Relativity, 4, 1, 2001 (open access)',
    },
    {
      title: 'NASA — Dark Energy, Dark Matter',
      url: 'https://science.nasa.gov/universe/dark-energy-dark-matter/',
      meta: 'NASA Science, official page, updated 2024',
    },
    {
      title: 'ESA Euclid mission — official website',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Euclid',
      meta: 'ESA official page',
    },
    {
      title: 'DESI — Dark Energy Spectroscopic Instrument — official website',
      url: 'https://www.desi.lbl.gov/',
      meta: 'Lawrence Berkeley National Laboratory',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
