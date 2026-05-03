import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'big-bang-simple',
  language: 'en',
  section: 'cosmology',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 13,
  title: 'What is the Big Bang in Plain Language',
  subtitle:
    'Not an explosion in space, but the expansion of space itself. How we know it happened — and what remains a mystery.',

  hero: {
    cacheKey: 'big-bang-simple-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Big Bang — the birth of the universe. ' +
      'A single blazing point of infinite density expanding outward in all directions, ' +
      'surrounded by expanding shells of glowing plasma transitioning from white-hot at center ' +
      'to deep red at edges, then fading into dark cosmic void. ' +
      'Hard sci-fi style, dark space background, wide cinematic composition. ' +
      'Add the following text labels on the image: "t = 0", "Planck epoch", "inflation", "quark-gluon plasma", "13.8 Gyr". ' +
      'Aspect ratio 16:9.',
    alt:
      'The universe expanding from a hot dense point to its present scale — artistic reconstruction.',
    caption:
      'The Big Bang was not an explosion in space — it was the birth of space-time itself. ' +
      'Artistic reconstruction based on current cosmological data.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The phrase "Big Bang" calls to mind something like a giant bomb detonating in the dark void of space. ' +
        'Debris flying outward in all directions — and there\'s your universe. ' +
        'It\'s a satisfying image. It is also completely wrong. ' +
        'There was no surrounding space for anything to explode into. ' +
        'Space itself did not exist before that moment. ' +
        '**The Big Bang was not an explosion in space — it was the expansion of space itself.**',

        'That distinction matters enormously. If the universe is expanding in all directions simultaneously, ' +
        'then there is no central point from which everything originated, ' +
        'and no outer edge toward which galaxies are flying. ' +
        'Every point moves away from every other point — like raisins in rising bread dough. ' +
        'And the question "what came before the Big Bang" turns out to be as poorly formed ' +
        'as asking what lies north of the North Pole.',
      ],
    },

    {
      heading: 'How Hubble Rewrote Our Picture of the Universe',
      level: 2,
      paragraphs: [
        'In 1929, American astronomer **Edwin Hubble** published observations that permanently changed cosmology. ' +
        'He systematically measured the _redshift_ of distant galaxies — ' +
        'a shift of their light spectrum toward longer, "redder" wavelengths. ' +
        'This is the same Doppler effect that makes an ambulance siren sound higher as it approaches ' +
        'and lower as it recedes. When a light source moves away from you, its waves stretch out ' +
        'and shift toward the red end of the spectrum.',

        'Hubble found a clear pattern: the farther away a galaxy is, the faster it recedes from us. ' +
        'A straight line on the graph of recession velocity versus distance. ' +
        'This is the **Hubble-Lemaître law** (Belgian priest and physicist Georges Lemaître ' +
        'derived it independently in 1927, but Hubble had a larger sample and greater renown at the time). ' +
        'The slope of that line — the Hubble constant H₀ — is the measure of how fast the universe is expanding.',

        'If all galaxies are currently flying apart, then in the distant past they were closer together. ' +
        'Run the film backward, and you arrive at a moment when the entire observable universe ' +
        'was compressed into an infinitely small, infinitely hot and dense state. ' +
        'That moment is the Big Bang.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-hubble-law',
        prompt:
          'Scientific diagram of Hubble\'s law for a science encyclopedia. ' +
          'Clean graph showing recession velocity (km/s) on Y axis versus distance (Megaparsecs) on X axis. ' +
          'Data points representing galaxies scattered around a straight line. ' +
          'Hard sci-fi style, dark background #020510, cyan/orange accent colors, monospace font for labels. ' +
          'Add the following text labels on the image: "recession velocity (km/s)", "distance (Mpc)", ' +
          '"v = H₀ × d", "H₀ ≈ 70 km/s/Mpc". ' +
          'Aspect ratio 4:3.',
        alt:
          'Hubble\'s law graph: recession velocity of galaxies versus distance — a linear relationship.',
        caption:
          'The Hubble-Lemaître law: every additional megaparsec of distance adds ~70 km/s to the galaxy\'s recession velocity. ' +
          'The slope of the line is the Hubble constant H₀.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The First 380,000 Years: An Opaque Fireball',
      level: 2,
      paragraphs: [
        'In the first fractions of a second, the universe was staggeringly hot — ' +
        'temperatures exceeded trillions of kelvin. ' +
        'Matter and antimatter annihilated each other constantly. ' +
        'Quarks fused into protons and neutrons. ' +
        'But here is the critical fact for any would-be observer: the early universe was **opaque**.',

        'Imagine a room filled with fog so dense that a flashlight illuminates only one meter ahead. ' +
        'That was the early universe — a stopped-up plasma of free electrons and nuclei. ' +
        'Photons (particles of light) continuously scattered off the free electrons and could not travel far. ' +
        'No information could escape outward.',

        'About 380,000 years after the Big Bang, the temperature dropped to roughly 3,000 K. ' +
        'For the first time, electrons could stick to nuclei and form stable hydrogen and helium atoms. ' +
        'This moment is called **recombination** — though in truth it was the first combination, not a repeat. ' +
        'With no free electrons to scatter off, the plasma became transparent, ' +
        'and photons streamed outward into an ever-expanding void.',
      ],
    },

    {
      heading: 'The Cosmic Microwave Background: Echo of the Beginning',
      level: 2,
      paragraphs: [
        'Those very photons that escaped 13.8 billion years ago are still traveling through space today. ' +
        'In that time, the universe has expanded so dramatically that their wavelengths have stretched ' +
        'from infrared all the way into the microwave range. ' +
        'We are bathed in them from every direction, at every moment — ' +
        'this is the **Cosmic Microwave Background** (CMB), also called relic radiation.',

        'It was discovered by accident. In 1965, American radio engineers **Arno Penzias and Robert Wilson** ' +
        'were trying to eliminate a mysterious persistent noise from a horn antenna at Bell Labs in New Jersey. ' +
        'They even cleaned the dish of pigeon droppings — the noise remained. ' +
        'It turned out to be a signal from the birth of the universe, ' +
        'arriving uniformly from every direction in the sky. ' +
        'Penzias and Wilson received the Nobel Prize in Physics in 1978.',

        'The CMB looks almost perfectly uniform — a temperature of 2.725 K in every direction. ' +
        'But "almost" is the operative word. The **Planck** mission of the European Space Agency (2009–2013) ' +
        'produced the highest-precision maps of temperature fluctuations ever made: ' +
        'tiny deviations at the level of one millionth of a kelvin. ' +
        'These ripples are imprints of quantum fluctuations in the very early universe — ' +
        'the seeds from which all galaxies eventually grew.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-cmb-planck',
        prompt:
          'Scientific illustration for a science encyclopedia: the Planck satellite CMB map. ' +
          'An oval/Mollweide projection map of the entire sky showing temperature anisotropies ' +
          'of the Cosmic Microwave Background. Color gradient from deep blue (colder regions, -200 microK) ' +
          'through black to orange-red (hotter regions, +200 microK). ' +
          'The map should look like the actual Planck 2018 CMB temperature map. ' +
          'Hard sci-fi style, dark background. ' +
          'Add the following text labels on the image: "Planck CMB 2018", "T = 2.725 K", ' +
          '"delta T = ±200 microK", "13.8 Gyr ago". ' +
          'Aspect ratio 16:9.',
        alt:
          'Planck 2018 CMB temperature anisotropy map in Mollweide projection.',
        caption:
          'The CMB map from ESA\'s Planck satellite (2018). Colors encode temperature deviations from the average ' +
          '2.725 K — no more than ±200 microkelvin. These fluctuations are the seeds of all future galaxies.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Inflation: Why the Universe Is So Smooth',
      level: 2,
      paragraphs: [
        'There are two facts about the universe that standard Big Bang cosmology alone struggles to explain. ' +
        'First, the CMB is identical in temperature from all corners of the sky — ' +
        'regions that are now 90 billion light-years apart share the same temperature to within 0.001%. ' +
        'Yet by standard cosmology, those regions could never have been in thermal contact with each other — ' +
        'they have always been beyond each other\'s observable horizon. ' +
        'This is the **horizon problem**.',

        'Second, the universe is geometrically "flat" to a remarkable degree: ' +
        'the angles of a large enough triangle sum to exactly 180°, ' +
        'neither more (as on a sphere) nor less (as on a saddle surface). ' +
        'Achieving this requires the density of the universe to be tuned to extraordinary precision in its earliest moments. ' +
        'Even a small deviation would have led to rapid recollapse or runaway expansion long ago. ' +
        'This is the **flatness problem**.',

        'In 1980, physicist **Alan Guth** proposed _inflation_ — a brief but fantastically rapid period of expansion ' +
        'immediately following the Big Bang. In roughly 10⁻³² seconds, ' +
        'the universe grew by at least a factor of 10²⁶ — ' +
        'as if an atom were inflated to the size of the observable universe. ' +
        'Any initial irregularities were smoothed away; ' +
        'any regions in contact were flung beyond each other\'s horizons. ' +
        'Both problems vanish simultaneously.',

        'The mechanism of inflation remains hypothetical — we do not know which field drove it. ' +
        'But no competing idea explains the observations as cleanly.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Timeline of the Universe',
        svg: `<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="220" fill="rgba(10,15,25,0.5)"/>

  <!-- Timeline axis -->
  <line x1="30" y1="110" x2="670" y2="110" stroke="#334455" stroke-width="1"/>

  <!-- Planck / GUT -->
  <rect x="30" y="85" width="40" height="50" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="1"/>
  <text x="50" y="78" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Planck</text>
  <text x="50" y="148" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">10⁻⁴³ s</text>

  <!-- Inflation -->
  <rect x="70" y="75" width="55" height="70" fill="rgba(255,136,68,0.2)" stroke="#ff8844" stroke-width="1"/>
  <text x="97" y="68" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Inflation</text>
  <text x="97" y="158" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">10⁻³² s</text>

  <!-- Quark epoch -->
  <rect x="125" y="88" width="55" height="44" fill="rgba(255,136,68,0.12)" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="152" y="80" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Quarks</text>
  <text x="152" y="143" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">10⁻⁶ s</text>

  <!-- BBN -->
  <rect x="180" y="90" width="65" height="40" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="212" y="82" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Nucleosyn.</text>
  <text x="212" y="142" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">1–3 min</text>

  <!-- Recombination / CMB -->
  <rect x="245" y="88" width="80" height="44" fill="rgba(68,255,136,0.15)" stroke="#44ff88" stroke-width="1"/>
  <text x="285" y="80" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Recomb.</text>
  <text x="285" y="90" dy="10" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">+ CMB</text>
  <text x="285" y="143" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">380 kyr</text>

  <!-- Dark Ages -->
  <rect x="325" y="92" width="90" height="36" fill="rgba(51,68,85,0.4)" stroke="#334455" stroke-width="1"/>
  <text x="370" y="84" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Dark Ages</text>
  <text x="370" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">~400 Myr</text>

  <!-- Reionization / first stars -->
  <rect x="415" y="89" width="70" height="42" fill="rgba(136,204,221,0.15)" stroke="#88ccdd" stroke-width="1"/>
  <text x="450" y="81" text-anchor="middle" fill="#88ccdd" font-family="monospace" font-size="9">First Stars</text>
  <text x="450" y="142" text-anchor="middle" fill="#88ccdd" font-family="monospace" font-size="9">~1 Gyr</text>

  <!-- Galaxies -->
  <rect x="485" y="87" width="70" height="46" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="520" y="79" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Galaxies</text>
  <text x="520" y="145" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">2–5 Gyr</text>

  <!-- Today -->
  <rect x="555" y="82" width="110" height="56" fill="rgba(68,255,136,0.1)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="610" y="74" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Today</text>
  <text x="610" y="150" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">13.8 Gyr</text>

  <!-- Arrow right -->
  <polygon points="672,107 665,104 665,110" fill="#aabbcc"/>

  <!-- Time label -->
  <text x="350" y="195" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">Time (logarithmic scale)</text>
</svg>`,
        caption:
          'Timeline of the universe from the Planck epoch to the present (logarithmic time scale). ' +
          'Each epoch marks a qualitative shift in the dominant physical processes.',
      },
    },

    {
      heading: 'Nucleosynthesis: Where the First Atoms Came From',
      level: 2,
      paragraphs: [
        'In the first three minutes, the universe was hot enough for nuclear reactions ' +
        'to occur on a massive scale — like the core of a star, but far more intense. ' +
        'The protons and neutrons that had recently formed began fusing into nuclei. ' +
        'This is **Big Bang Nucleosynthesis** (BBN).',

        'The result is predictable and confirmed by observation with extraordinary precision: ' +
        'approximately **75% of the universe\'s mass is hydrogen** ' +
        '(protons that never found a fusion partner), ' +
        'and **25% is helium-4**. ' +
        'Plus trace amounts of deuterium, helium-3, and lithium-7. ' +
        'Everything heavier than lithium — carbon, oxygen, iron, gold — ' +
        'was forged later in the cores of stars and in supernova explosions. ' +
        'We are, quite literally, made of stardust.',

        'These ratios are extraordinarily sensitive to conditions in the early universe. ' +
        'If the Hubble constant or the number of neutrino species had been slightly different, ' +
        'the helium and deuterium fractions would have come out differently. ' +
        'Astronomers measure these ratios in the most ancient stars and gas clouds — ' +
        'and every time the results match the BBN prediction.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-bbn-chart',
        prompt:
          'Scientific illustration for a science encyclopedia: Big Bang Nucleosynthesis abundance chart. ' +
          'A bar chart or pie visualization showing primordial elemental abundances: ' +
          'Hydrogen ~75% (large dominant section in blue-white), ' +
          'Helium-4 ~25% (second large section in orange), ' +
          'Deuterium trace (tiny sliver in cyan), Helium-3 trace (tiny, green), Lithium-7 trace (tiny, red). ' +
          'Hard sci-fi style, dark background, monospace font. ' +
          'Add the following text labels on the image: "Hydrogen 75%", "Helium-4 25%", ' +
          '"Deuterium", "He-3", "Li-7", "Big Bang Nucleosynthesis". ' +
          'Aspect ratio 4:3.',
        alt:
          'Primordial elemental abundances after Big Bang Nucleosynthesis: H 75%, He-4 25%.',
        caption:
          'The primordial chemical composition of the universe — the outcome of the first three minutes after the Big Bang. ' +
          'Everything heavier than lithium was forged in stars.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Modern Measurements and the Hubble Tension',
      level: 2,
      paragraphs: [
        'If the standard cosmological model were perfectly correct, ' +
        'the Hubble constant H₀ measured by independent methods would converge on the same number. ' +
        'It does not. And this is one of the most heated open conflicts in modern physics.',

        'The **Planck** mission (2018) measured H₀ = **67.4 ± 0.5 km/s/Mpc** — ' +
        'derived from the fine structure of CMB fluctuations combined with the standard model. ' +
        'The **SH0ES** team led by Adam Riess (2022–2024) measured H₀ = **73.0 ± 1.0 km/s/Mpc** — ' +
        'using _standard candles_: Cepheid variable stars and Type Ia supernovae in nearby galaxies. ' +
        'The ~8% difference sounds modest, but the statistical significance exceeds 5σ — ' +
        'the threshold at which physicists declare a discovery. ' +
        'This is the **Hubble tension**.',

        'Neither team has been found to have made a fundamental error. ' +
        'Several hypotheses exist: new physics before recombination (_early dark energy_), ' +
        'additional neutrino species, or unresolved systematic biases in distance measurements. ' +
        'As of May 2026, no resolution has been found. ' +
        'This may be the first observational signal of physics beyond the standard model.',
      ],
    },

    {
      heading: 'JWST and Surprises in the Early Universe',
      level: 2,
      paragraphs: [
        'The **James Webb Space Telescope** (JWST), commissioned in late 2021, ' +
        'began returning science data in 2022 — and immediately surprised cosmologists.',

        'The standard model predicts that the early universe — within the first billion years after the Big Bang — ' +
        'should contain only small, irregular proto-galaxies. ' +
        'JWST has detected galaxies at _redshifts_ z > 10 (universe age < 500 million years) ' +
        'with masses and structures that, by standard growth rates, should have taken billions of years to form. ' +
        'Some objects — such as _Maisie\'s Galaxy_ (z ≈ 11.4) and several candidates at z > 16 — ' +
        'appear startlingly "grown-up" for their cosmic age.',

        'This does not invalidate the Big Bang as a concept — it only indicates ' +
        'that either galaxy formation mechanisms were far more efficient than we assumed, ' +
        'or there are biases in distance determinations for these objects, ' +
        'or the stellar initial mass function (IMF) in the early universe differed from today\'s. ' +
        'Research is ongoing.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-jwst-deep-field',
        prompt:
          'Photorealistic illustration for a science encyclopedia: JWST deep field — distant early galaxies. ' +
          'Hundreds of galaxies at various redshifts, from nearby spirals to tiny reddish smudges ' +
          'representing galaxies at z>10 (less than 500 million years after Big Bang). ' +
          'Inset box highlighting an early massive galaxy with label. ' +
          'Hard sci-fi style, true space colors, dark background. ' +
          'Add the following text labels on the image: "z > 10", "< 500 Myr after Big Bang", ' +
          '"JWST NIRCam", "early massive galaxy". ' +
          'Aspect ratio 16:9.',
        alt:
          'JWST deep field showing early massive galaxies at high redshifts.',
        caption:
          'Symbolic representation of JWST data: galaxies at z > 10, younger than 500 million years after the Big Bang. ' +
          'Their mass and structure challenge standard models of galaxy formation.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'What We Still Do Not Know',
      level: 2,
      paragraphs: [
        'The Big Bang is the best-supported theory of cosmic origins we have. ' +
        'The CMB, the BBN element ratios, and the expansion of the universe are three independent pillars of evidence. ' +
        'But several profound questions remain unanswered.',

        '**What "banged," and why?** General relativity describes how space-time behaves after t = 0, ' +
        'but breaks down precisely at t = 0. ' +
        'We do not know what "before" means in this context — ' +
        'or whether the word "before" has any meaning here at all. ' +
        'A quantum theory of gravity — which does not yet exist — should eventually answer this question.',

        '**What lies beyond our observable horizon?** The observable universe is a sphere ' +
        'roughly 46 billion light-years in radius. ' +
        'Beyond that horizon, there may be other domains where the constants of nature differ (the multiverse), ' +
        'or space may be uniform to infinity. ' +
        'We have no observational way to distinguish between these possibilities.',

        '**Where did all the antimatter go?** The physics of the early universe treats matter and antimatter symmetrically. ' +
        'Equal amounts should have been created after the Big Bang, ' +
        'annihilating to leave only photons. ' +
        'But we exist — which means slightly more matter was produced. ' +
        'Roughly one extra proton per billion annihilations. ' +
        'This _baryonic asymmetry_ remains unexplained.',
      ],
    },

    {
      image: {
        cacheKey: 'big-bang-simple-universe-timeline',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the history of the universe as a cone or funnel. ' +
          'Left: tiny hot bright point (Big Bang, t=0). ' +
          'Moving right: expanding cone shape showing growth of the universe through time. ' +
          'Key epochs marked: inflation (rapid expansion), quark epoch, nucleosynthesis, recombination+CMB release, ' +
          'dark ages, first stars, galaxy formation, accelerated expansion, today. ' +
          'Color transitions: white-hot left, cooling to red, then dark for dark ages, ' +
          'then blue-white specks for first stars, to full galaxy colors on right. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: ' +
          '"Big Bang t=0", "Inflation", "CMB released", "First Stars", "Galaxies", "Today 13.8 Gyr". ' +
          'Aspect ratio 16:9.',
        alt:
          'Cone-shaped diagram of universe evolution from the Big Bang to today.',
        caption:
          'The universe from a point to its present scale — 13.8 billion years of evolution. ' +
          'Each stage is marked by a shift in the dominant physical processes.',
        aspectRatio: '16:9',
      },
    },

    {
      diagram: {
        title: 'Diagram: Hubble Tension — Two Methods, Two Numbers',
        svg: `<svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="200" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">H₀ — Hubble Constant: two methods, two results</text>

  <!-- CMB / early universe method -->
  <rect x="50" y="40" width="260" height="110" rx="3" fill="rgba(68,136,170,0.12)" stroke="#4488aa" stroke-width="1"/>
  <text x="180" y="60" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="12">Planck / CMB</text>
  <text x="180" y="80" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">(early universe)</text>
  <text x="180" y="108" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="20">67.4</text>
  <text x="180" y="128" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="11">± 0.5 km/s/Mpc</text>
  <text x="180" y="143" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">ESA Planck 2018</text>

  <!-- VS divider -->
  <text x="350" y="102" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="18">VS</text>
  <line x1="320" y1="95" x2="380" y2="95" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>

  <!-- Distance ladder method -->
  <rect x="390" y="40" width="260" height="110" rx="3" fill="rgba(255,136,68,0.1)" stroke="#ff8844" stroke-width="1"/>
  <text x="520" y="60" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="12">SH0ES / Cepheids + Ia</text>
  <text x="520" y="80" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">(late universe)</text>
  <text x="520" y="108" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="20">73.0</text>
  <text x="520" y="128" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="11">± 1.0 km/s/Mpc</text>
  <text x="520" y="143" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Riess et al. 2022</text>

  <!-- Sigma label -->
  <text x="350" y="175" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="11">Discrepancy &gt; 5&#963; — "Hubble tension"</text>
</svg>`,
        caption:
          'Two independent methods for measuring the Hubble constant produce results that diverge by >5σ. ' +
          'The cause is unknown as of May 2026.',
      },
    },
  ],

  glossary: [
    {
      term: 'Big Bang',
      definition:
        'The cosmological model describing the early state of the universe as an extremely hot and dense condition followed by the expansion of space-time from the moment t ≈ 0.',
    },
    {
      term: 'Redshift',
      definition:
        'The shift of electromagnetic radiation toward longer wavelengths — observed in sources moving away from the observer or in photons traveling through expanding space.',
    },
    {
      term: 'Cosmic Microwave Background (CMB)',
      definition:
        'Thermal microwave radiation filling the universe uniformly — the remnant photons that escaped at recombination, 380,000 years after the Big Bang. Temperature 2.725 K.',
    },
    {
      term: 'Recombination',
      definition:
        'The moment in the early universe (~380,000 years) when the temperature dropped to ~3,000 K and free electrons attached to nuclei to form neutral atoms, making the universe transparent to photons.',
    },
    {
      term: 'Inflation',
      definition:
        'A hypothetical ultra-rapid expansion phase immediately after the Big Bang (~10⁻³² s) that explains the uniformity of the CMB and the geometric flatness of the universe.',
    },
    {
      term: 'Big Bang Nucleosynthesis (BBN)',
      definition:
        'Nuclear reactions in the first three minutes of the universe that produced the primordial proportions of hydrogen (~75%) and helium-4 (~25%).',
    },
    {
      term: 'Hubble constant (H₀)',
      definition:
        'The rate of expansion of the universe, expressed in kilometres per second per megaparsec of distance. Current measurements range from 67 to 73 km/s/Mpc depending on the method used.',
    },
    {
      term: 'Hubble tension',
      definition:
        'A statistically significant (>5σ) discrepancy between H₀ values obtained from the CMB (67.4) and from standard candles (73.0). The cause remains unknown.',
    },
  ],

  quiz: [
    {
      question: 'What actually happened during the Big Bang?',
      options: [
        'An explosion in pre-existing empty space',
        'The expansion of space-time itself',
        'A collision between two earlier universes',
        'The collapse of a previous universe',
      ],
      correctIndex: 1,
      explanation:
        'The Big Bang was not an explosion in space — it was the expansion of space-time itself. ' +
        'Before t = 0, the concepts of "space" and "time" had no conventional meaning.',
    },
    {
      question: 'Which 1965 discovery provided strong confirmation of the Big Bang theory?',
      options: [
        'The detection of dark matter',
        'The first photograph of a galaxy',
        'The discovery of the Cosmic Microwave Background by Penzias and Wilson',
        'The detection of gravitational waves',
      ],
      correctIndex: 2,
      explanation:
        'Arno Penzias and Robert Wilson accidentally detected a uniform microwave signal arriving from every direction in the sky — ' +
        'the relic radiation that is a direct consequence of the hot early universe. ' +
        'They received the Nobel Prize in Physics in 1978.',
    },
    {
      question: 'Which two elements dominated the primordial chemical composition of the universe after nucleosynthesis?',
      options: [
        'Carbon and oxygen',
        'Hydrogen and helium',
        'Hydrogen and lithium',
        'Helium and iron',
      ],
      correctIndex: 1,
      explanation:
        'Big Bang Nucleosynthesis (first 3 minutes) produced ~75% hydrogen and ~25% helium-4. ' +
        'All elements heavier than lithium up to iron were forged later inside stars.',
    },
    {
      question: 'What is the Hubble tension?',
      options: [
        'Galaxies moving faster than general relativity predicts',
        'Two independent measurements of H₀ that give significantly different results',
        'The universe expanding unevenly in different directions',
        'The speed of light having changed over time',
      ],
      correctIndex: 1,
      explanation:
        'The CMB method (Planck) gives H₀ = 67.4 km/s/Mpc, ' +
        'while the standard-candle method (SH0ES) gives 73.0 km/s/Mpc. ' +
        'The >5σ discrepancy is statistically significant and may point to new physics.',
    },
  ],

  sources: [
    {
      title: 'Penzias A.A., Wilson R.W. — A Measurement of Excess Antenna Temperature at 4080 Mc/s',
      url: 'https://ui.adsabs.harvard.edu/abs/1965ApJ...142..419P',
      meta: 'ApJ 142, 419 (1965) — discovery of the CMB, Nobel Prize 1978',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results: Cosmological Parameters',
      url: 'https://arxiv.org/abs/1807.06209',
      meta: 'A&A 641, A6 (2020), arXiv:1807.06209',
    },
    {
      title:
        'Riess A.G. et al. (SH0ES) — A Comprehensive Measurement of the Local Value of the Hubble Constant',
      url: 'https://arxiv.org/abs/2112.04510',
      meta: 'ApJL 934, L7 (2022), arXiv:2112.04510',
    },
    {
      title: 'Bennett C.L. et al. (WMAP) — Nine-Year WMAP Observations: Final Maps and Cosmological Parameters',
      url: 'https://arxiv.org/abs/1212.5225',
      meta: 'ApJS 208, 20 (2013), arXiv:1212.5225',
    },
    {
      title: 'Smoot G.F. et al. (COBE/DMR) — Structure in the COBE DMR First Year Maps',
      url: 'https://ui.adsabs.harvard.edu/abs/1992ApJ...396L...1S',
      meta: 'ApJL 396, L1 (1992) — first detection of CMB anisotropies, Nobel Prize 2006',
    },
    {
      title: 'Finkelstein S.L. et al. — A Long-Time-Ago in a Galaxy Far, Far Away: A Candidate z ≈ 14 Galaxy',
      url: 'https://arxiv.org/abs/2207.12474',
      meta: "ApJL 940, L55 (2022) — Maisie's Galaxy, JWST, arXiv:2207.12474",
    },
    {
      title: 'Labbe I. et al. — A Population of Red Candidate Massive Galaxies ~600 Myr After the Big Bang',
      url: 'https://arxiv.org/abs/2207.09436',
      meta: 'Nature 616, 266 (2023), JWST, arXiv:2207.09436',
    },
    {
      title: 'Cyburt R.H. et al. — Big Bang Nucleosynthesis: Present Status',
      url: 'https://arxiv.org/abs/1505.01076',
      meta: 'Rev. Mod. Phys. 88, 015004 (2016), arXiv:1505.01076',
    },
    {
      title: 'Guth A.H. — Inflationary Universe: A Possible Solution to the Horizon and Flatness Problems',
      url: 'https://ui.adsabs.harvard.edu/abs/1981PhRvD..23..347G',
      meta: 'Phys. Rev. D 23, 347 (1981) — original inflation paper',
    },
    {
      title: 'NASA WMAP Mission Overview',
      url: 'https://map.gsfc.nasa.gov/',
      meta: 'NASA official WMAP mission page',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
