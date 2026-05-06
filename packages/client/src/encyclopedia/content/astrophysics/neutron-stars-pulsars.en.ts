import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'neutron-stars-pulsars',
  language: 'en',
  section: 'astrophysics',
  order: 6,
  difficulty: 'intermediate',
  readingTimeMin: 13,
  title: 'Neutron Stars and Pulsars',
  subtitle:
    'The mass of the Sun packed into a city-sized sphere. A teaspoon weighs a billion tonnes. The densest stable objects in the universe — and cosmic clocks more precise than atomic timekeepers.',

  hero: {
    cacheKey: 'neutron-stars-pulsars-hero',
    prompt:
      'Photorealistic scientific illustration of a neutron star with twin magnetic-pole radiation beams: ' +
      'a small dense blue-white glowing sphere at center, two narrow bright cones of electromagnetic radiation shooting outward from the magnetic poles (tilted relative to rotation axis), ' +
      'strong dipole magnetic field lines shown as luminous blue curves arcing between poles, ' +
      'surface of the star showing a hard crystalline crust with faint cracks, ' +
      'deep black space background with faint star field. Hard sci-fi style scientific illustration. ' +
      'Add the following text labels on the image: "magnetic axis", "rotation axis", "radiation beam", "neutron star".',
    alt: 'Neutron star with two radiation beams shooting from the magnetic poles at an angle to the rotation axis',
    caption:
      'A neutron star spins on one axis while its magnetic field is tilted at an angle — much like Earth. ' +
      'Beams of radiation from the poles sweep through space like a lighthouse, which is exactly how we detect pulsars.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Picture the entire Sun — 700,000 kilometers across, more than a million Earths by volume — ' +
        'compressed into a sphere about twenty kilometers wide. Roughly the size of a city. ' +
        'A single teaspoon of its material would weigh more than a billion tonnes. ' +
        'This is a **neutron star**: not science fiction, but a real object that exists in the billions throughout our galaxy.',

        'Neutron stars occupy a unique niche in nature: they are stable — gravity does not tear them apart — ' +
        'but only because a peculiar quantum pressure acts inside them, unlike anything in ordinary matter. ' +
        'They spin so fast that some complete several hundred rotations per second. ' +
        'Their magnetic fields are trillions of times stronger than Earth\'s. ' +
        'And when two neutron stars merge, the collision forges gold, platinum, and most of the heavy elements that exist in the universe.',
      ],
    },

    {
      image: {
        cacheKey: 'neutron-stars-pulsars-compaction',
        prompt:
          'Scientific infographic showing compaction scale of a neutron star: ' +
          'on the left, a large orange Sun with diameter label, in the center a city skyline for scale (20 km), ' +
          'on the right a tiny bright glowing blue-white sphere labeled "neutron star" with the same mass as the Sun. ' +
          'Size comparison bars clearly show the dramatic difference. ' +
          'Hard sci-fi style scientific illustration, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "Sun diameter 1.4 million km", "neutron star diameter ~20 km", "same mass".',
        alt: 'Size comparison: the Sun, a 20-kilometer city, and a neutron star of equal mass',
        caption:
          'A neutron star with the mass of the Sun fits within the boundaries of a typical city. Its average density exceeds the density of an atomic nucleus.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Born in catastrophe',
      level: 2,
      paragraphs: [
        'A neutron star is born in one of the most violent moments in the universe — ' +
        'the explosion of a **supernova**. When a massive star (roughly eight to twenty-five times the mass of the Sun) ' +
        'exhausts its nuclear fuel reserves, the thermal pressure holding it against gravitational collapse vanishes. ' +
        'The stellar core implodes in a fraction of a second — shrinking from the size of Earth to about twenty kilometers.',

        'The outer layers of the star fall onto this core, bounce off the rigid neutron surface, and fly outward ' +
        'as the supernova shock wave. In this explosion, more energy is released in seconds ' +
        'than the Sun will radiate across its entire ten-billion-year lifetime. ' +
        'Ninety-nine percent of that energy escapes as _neutrinos_ — particles that barely interact with matter. ' +
        'The visible light of the supernova is just one percent of the total energy budget.',

        'Whether a neutron star or a black hole forms depends almost entirely on the mass of the collapsing core. ' +
        'The Tolman-Oppenheimer-Volkoff limit — approximately two to three solar masses — ' +
        'separates the two outcomes. If the core after collapse is below this threshold, ' +
        'neutron matter withstands its own gravity. If it exceeds the limit, collapse continues unimpeded.',
      ],
    },

    {
      heading: 'Why it does not collapse: the quantum wall',
      level: 3,
      paragraphs: [
        'In an ordinary star, the pressure from thermonuclear reactions opposes gravity. ' +
        'In a neutron star there are no reactions at all — but there is _neutron degeneracy pressure_. ' +
        'This is a quantum-mechanical effect: the Pauli exclusion principle forbids two neutrons ' +
        'from occupying the same quantum state. ' +
        'Even squeezed to nuclear densities, neutrons resist further compression with enormous force.',

        'To grasp the scale: a proton occupies a volume that would require ten trillion protons placed side by side to fill. ' +
        'In a neutron star, protons and electrons have merged into neutrons, and this densely packed mass ' +
        'stands between us and the formation of yet another black hole.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Internal structure of a neutron star',
        svg: `<svg viewBox="0 0 640 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Outer atmosphere (thin) -->
  <circle cx="320" cy="170" r="150" fill="rgba(123,184,255,0.08)" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="320" y="14" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">atmosphere (a few meters)</text>

  <!-- Crust -->
  <circle cx="320" cy="170" r="140" fill="rgba(170,187,204,0.12)" stroke="#aabbcc" stroke-width="1.5"/>
  <text x="474" y="100" fill="#aabbcc" font-family="monospace" font-size="11">crust (~1 km)</text>
  <line x1="460" y1="103" x2="432" y2="115" stroke="#aabbcc" stroke-width="0.8" stroke-dasharray="3,2"/>

  <!-- Outer core -->
  <circle cx="320" cy="170" r="110" fill="rgba(68,255,136,0.09)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="468" y="175" fill="#44ff88" font-family="monospace" font-size="11">outer core</text>
  <text x="468" y="189" fill="#44ff88" font-family="monospace" font-size="10">(superfluid neutrons)</text>
  <line x1="460" y1="178" x2="430" y2="170" stroke="#44ff88" stroke-width="0.8" stroke-dasharray="3,2"/>

  <!-- Inner core -->
  <circle cx="320" cy="170" r="65" fill="rgba(255,136,68,0.14)" stroke="#ff8844" stroke-width="1.5"/>
  <text x="162" y="155" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="end">inner core</text>
  <text x="162" y="169" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="end">(quark matter?)</text>
  <line x1="168" y1="160" x2="256" y2="165" stroke="#ff8844" stroke-width="0.8" stroke-dasharray="3,2"/>

  <!-- Center point -->
  <circle cx="320" cy="170" r="6" fill="#cc4444"/>
  <text x="320" y="205" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">center</text>

  <!-- Scale bar -->
  <line x1="220" y1="310" x2="420" y2="310" stroke="#667788" stroke-width="1"/>
  <line x1="220" y1="305" x2="220" y2="315" stroke="#667788" stroke-width="1"/>
  <line x1="420" y1="305" x2="420" y2="315" stroke="#667788" stroke-width="1"/>
  <text x="320" y="328" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">~20 km (full diameter)</text>
</svg>`,
        caption:
          'Structure of a neutron star: an outer solid crust of neutron-rich nuclei, ' +
          'then a zone of superfluid neutrons, and a hypothetical inner core that may harbor quark matter. ' +
          'The exact composition of the inner core remains one of the open problems of nuclear physics.',
      },
    },

    {
      heading: 'Magnetic field: a trillion Gauss',
      level: 2,
      paragraphs: [
        'Earth\'s magnetic field is approximately one Gauss. A refrigerator magnet — a few hundred Gauss. ' +
        'A neutron star at birth carries a field of a billion to a trillion Gauss. ' +
        'Such extreme field strength arises from _magnetic flux conservation_: ' +
        'the star compresses by tens of thousands of times, concentrating the field in proportion to the shrinking surface area.',

        'Some neutron stars have fields orders of magnitude stronger than typical — they are called **magnetars**. ' +
        'Magnetars with fields up to a thousand trillion Gauss are the strongest magnetic objects in the universe. ' +
        'Their field is so intense that it distorts the quantum structure of the vacuum itself — ' +
        'an effect known as _vacuum magnetic birefringence_. ' +
        'Magnetars sometimes detonate: in a fraction of a second they release more energy ' +
        'than the Sun emits in 100,000 years — as a burst of soft gamma radiation.',
      ],
    },

    {
      image: {
        cacheKey: 'neutron-stars-pulsars-magnetar',
        prompt:
          'Photorealistic scientific illustration of a magnetar: ' +
          'a small dense blue-white neutron star with extremely powerful magnetic field lines shown as luminous twisted blue-cyan arcs surrounding the entire star, ' +
          'surface showing glowing cracks and fractures releasing X-ray burst flares, ' +
          'violent electromagnetic storm visible in surrounding space, deep black background. ' +
          'Hard sci-fi style, dramatic lighting, technically accurate field geometry. ' +
          'Add the following text labels on the image: "magnetar", "magnetic field 10^15 Gauss", "starquake", "X-ray burst".',
        alt: 'Magnetar — a neutron star with extreme magnetic field and crust fractures generating X-ray flares',
        caption:
          'Magnetars are a subclass of neutron stars with fields reaching a billion billion Gauss. ' +
          'Stress in the crust reaches its breaking point, triggering starquakes and giant X-ray flares.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Pulsars: cosmic lighthouses',
      level: 2,
      paragraphs: [
        'In the middle of the twentieth century, radio astronomy made an unexpected discovery. ' +
        'Graduate student Jocelyn Bell Burnell, working at a radio telescope in Cambridge, ' +
        'noticed a strange repeating signal in her data: extraordinarily regular pulses arriving ' +
        'just over a second apart, more stable than the atomic clocks of the era. ' +
        'The team jokingly labeled it LGM-1 — "Little Green Men" — ' +
        'so implausible seemed an artificial origin. ' +
        'It soon became clear this was a natural physical object. A pulsar.',

        'A pulsar is a neutron star whose magnetic poles are tilted relative to its rotation axis, ' +
        'much like a lighthouse whose beam sweeps the horizon at an angle. ' +
        'Each time the radio beam from a pole sweeps past Earth\'s line of sight, ' +
        'we detect a flash. The pulsar itself does not blink — the effect is purely geometric.',

        'The stability of pulsars is phenomenal. Some _millisecond pulsars_, completing ' +
        'hundreds of rotations per second, accumulate less than a microsecond of timing error over decades. ' +
        'They serve as precision instruments: for testing general relativity, ' +
        'for detecting gravitational waves through _pulsar timing arrays_, ' +
        'and even as navigational beacons for future interstellar probes.',
      ],
    },

    {
      image: {
        cacheKey: 'neutron-stars-pulsars-pulsar-lighthouse',
        prompt:
          'Scientific illustration showing pulsar geometry: ' +
          'a glowing blue-white neutron star at center with clearly marked rotation axis (vertical dashed line) and magnetic axis (diagonal), ' +
          'two bright conical beams of radio emission shooting outward along the magnetic axis, ' +
          'an observer on the right side of the image seeing a periodic pulse as the beam sweeps past, ' +
          'a timing diagram inset showing regular pulse intervals. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "rotation axis", "magnetic axis", "radio beam", "pulse received".',
        alt: 'Pulsar geometry: neutron star with tilted magnetic axis and emission beams sweeping past the observer',
        caption:
          'A pulsar is not a blinking object. It radiates continuously, but an observer ' +
          'sees a flash only when the beam sweeps past. The periodicity is simply the star\'s rotation rate.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Binary systems and kilonovae',
      level: 2,
      paragraphs: [
        'Neutron stars frequently exist in _binary systems_ — paired with another star or ' +
        'with a second neutron star. In the first case, the neutron star can pull material from ' +
        'its companion, spinning up to hundreds of rotations per second — ' +
        'this is how millisecond pulsars are born.',

        'But the most explosive event occurs when two neutron stars in a binary gradually spiral inward ' +
        'as they radiate gravitational waves, and finally merge. ' +
        'The merger of two neutron stars is a **kilonova**: a burst brighter than most supernovae, ' +
        'lasting only a few days, that synthesizes enormous quantities of heavy elements.',

        'In August 2017, the LIGO and Virgo detectors captured _gravitational waves_ from the merger ' +
        'of two neutron stars 130 million light-years away — the event GW170817. ' +
        'Seconds later, telescopes around the world observed a short gamma-ray burst followed by ' +
        'the prolonged optical glow of the kilonova. This was the first signal in human history ' +
        'simultaneously received in both gravitational waves and the electromagnetic spectrum. ' +
        'Multi-messenger astronomy was born in that instant.',
      ],
    },

    {
      image: {
        cacheKey: 'neutron-stars-pulsars-kilonova',
        prompt:
          'Photorealistic scientific illustration of a kilonova explosion: ' +
          'two small neutron stars spiraling together in the final milliseconds before merger, ' +
          'surrounded by a violent expanding cloud of ejected heavy-element material glowing in blue-white near center and reddish-gold at outer edges, ' +
          'gravitational wave ripples shown as subtle space-time grid distortions around the event, ' +
          'deep black space background with faint star field. Hard sci-fi style, dramatic and accurate. ' +
          'Add the following text labels on the image: "neutron star merger", "kilonova ejecta", "heavy elements synthesized", "GW170817".',
        alt: 'Merger of two neutron stars — kilonova: a bright explosion synthesizing heavy elements with gravitational wave ripples',
        caption:
          'Kilonova GW170817 (2017) — the first event confirmed simultaneously in gravitational waves and light. ' +
          'Spectral analysis detected strontium and estimated several Earth-masses of gold and platinum in the ejecta.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Gold from the stars',
      level: 3,
      paragraphs: [
        'Heavy element nuclei — gold, platinum, iridium, uranium — require rapid neutron capture ' +
        '(the r-process) under conditions where neutrons are so abundant that a nucleus absorbs another ' +
        'before it can decay. Such conditions are rare in nature, and neutron star mergers ' +
        'are the most likely dominant site where this occurs.',

        'GW170817 confirmed the theory: the kilonova spectrum revealed lines of strontium and other heavy elements. ' +
        'The gold in your ring, the platinum in a catalytic converter, the uranium in nuclear reactors — ' +
        'all synthesized in neutron star mergers billions of years ago ' +
        'and scattered across the galaxy by shock waves to eventually reach the forming Solar System.',
      ],
    },

    {
      image: {
        cacheKey: 'neutron-stars-pulsars-r-process',
        prompt:
          'Scientific infographic showing r-process nucleosynthesis in a neutron star merger: ' +
          'periodic table fragment with heavy elements highlighted (gold Au, platinum Pt, uranium U, strontium Sr), ' +
          'arrows showing neutron capture chain building up heavy nuclei, ' +
          'small inset showing the kilonova ejecta expanding cloud. ' +
          'Hard sci-fi style, dark background, monospace font, color-coded element groups. ' +
          'Add the following text labels on the image: "r-process", "neutron capture", "gold Au 79", "platinum Pt 78", "uranium U 92".',
        alt: 'r-process nucleosynthesis in a neutron star merger: diagram of heavy element synthesis through neutron capture',
        caption:
          'Roughly half of all elements heavier than iron, including all the gold and platinum in the universe, ' +
          'were forged in neutron star mergers through the r-process.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Current research: NICER, FAST, and pulsar timing arrays',
      level: 2,
      paragraphs: [
        'The **NICER** telescope (Neutron star Interior Composition Explorer) is mounted on the ' +
        'International Space Station and since the early 2020s has been measuring the X-ray emission ' +
        'of pulsars with microsecond precision. This allows scientists to reconstruct the shape ' +
        'of a neutron star\'s surface through gravitational lensing of its own emission. ' +
        'By simultaneously measuring the mass and radius of several neutron stars, NICER places ' +
        'constraints on the equation of state of nuclear matter — ' +
        'one of the most fundamental unsolved problems in nuclear physics.',

        'In China, the **FAST** radio telescope (Five-hundred-meter Aperture Spherical radio Telescope) — ' +
        'the world\'s largest single-dish telescope — has discovered hundreds of new pulsars. ' +
        'FAST can register faint signals from pulsars in distant galaxies ' +
        'and process thousands of data channels simultaneously. ' +
        'The Canadian **CHIME** array and South Africa\'s **MeerKAT** together form ' +
        '_pulsar timing arrays_ (PTAs) that search for nanohertz gravitational waves from merging supermassive black holes. ' +
        'In the first half of the 2020s, the NANOGrav, EPTA, and PPTA collaborations independently detected ' +
        'the first signs of such a background signal — possibly the first detection of a nanohertz ' +
        'gravitational-wave background from supermassive mergers in the early universe.',
      ],
    },

    {
      image: {
        cacheKey: 'neutron-stars-pulsars-pulsar-timing',
        prompt:
          'Scientific diagram of a pulsar timing array for gravitational wave detection: ' +
          'Earth at center surrounded by multiple pulsars at different directions shown as small blue-white dots with pulsed radio beams pointing at Earth, ' +
          'subtle gravitational wave grid distortions shown in background space, ' +
          'correlation graph inset showing Hellings-Downs curve. ' +
          'Hard sci-fi style scientific illustration, dark background, monospace labels. ' +
          'Add the following text labels on the image: "pulsar timing array", "gravitational wave background", "Earth", "Hellings-Downs correlation".',
        alt: 'Pulsar timing array: Earth at center with pulsars as lighthouses enabling detection of nanohertz gravitational waves',
        caption:
          'Pulsar timing arrays (NANOGrav, EPTA, MeerKAT) track microsecond deviations in pulse arrival times. ' +
          'Correlated deviations across pulsars at specific angular separations — the Hellings-Downs curve — ' +
          'are the hallmark signature of a gravitational-wave background.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Open questions',
      level: 2,
      paragraphs: [
        'Despite decades of observations, neutron stars guard their deepest secrets. ' +
        'What lies at the very center of a neutron star remains unknown. ' +
        'There may be a _quark-gluon plasma_ — a state of matter in which quarks are not bound into neutrons. ' +
        'Or something even more exotic: hyperonic matter, or a quark star.',

        'Exactly where the Tolman-Oppenheimer-Volkoff limit falls — the maximum mass of a neutron star — ' +
        'is also an open question. The most massive neutron star measured so far ' +
        'is approximately two solar masses. NICER, FAST, and the future _Einstein Telescope_ ' +
        'are expected to pin down this number definitively. ' +
        'The answer will reveal which nuclear physics operates at densities ' +
        'unattainable by any particle accelerator on Earth.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Neutron star',
      definition:
        'An ultra-dense remnant of the core of a massive star after a supernova explosion. Mass from 1.2 to approximately 2-3 solar masses, diameter around 20 kilometers. The material consists predominantly of neutrons.',
    },
    {
      term: 'Pulsar',
      definition:
        'A rapidly rotating neutron star with a tilted magnetic axis. Radio emission beams from the magnetic poles sweep through space — an observer detects regular pulses. Jocelyn Bell Burnell discovered the first pulsar in the mid-twentieth century.',
    },
    {
      term: 'Magnetar',
      definition:
        'A subclass of neutron stars with an extraordinarily powerful magnetic field — up to a billion billion Gauss. They can generate giant X-ray flares through starquakes in their crust.',
    },
    {
      term: 'Tolman-Oppenheimer-Volkoff limit',
      definition:
        'The maximum mass of a neutron star beyond which gravity overcomes neutron degeneracy pressure and the object collapses into a black hole. Estimated at approximately two to three solar masses.',
    },
    {
      term: 'Kilonova',
      definition:
        'A powerful transient explosion occurring when two neutron stars merge. Brighter than most supernovae but much shorter. The primary site in the universe for heavy element synthesis through the r-process.',
    },
    {
      term: 'r-process',
      definition:
        'Rapid neutron capture: nuclei absorb neutrons faster than radioactive decay, building up heavy isotopes. Responsible for the synthesis of gold, platinum, uranium, and most elements heavier than iron.',
    },
    {
      term: 'Neutron degeneracy pressure',
      definition:
        'A quantum-mechanical pressure arising from the Pauli exclusion principle: neutrons cannot occupy the same quantum state, so they resist compression even without any nuclear reactions.',
    },
    {
      term: 'Pulsar timing array (PTA)',
      definition:
        'A network of radio telescopes that synchronously monitors the pulses of dozens of stable millisecond pulsars. Microsecond deviations correlated across pulsars by angular separation signal the passage of nanohertz gravitational waves.',
    },
  ],

  quiz: [
    {
      question: 'Why does a neutron star not collapse under its own gravity?',
      options: [
        'Thermonuclear reactions inside it generate outward pressure',
        'Neutron degeneracy pressure resists compression due to the Pauli exclusion principle',
        'It rotates too fast, and centrifugal force holds it together',
        'Its magnetic field repels matter from the interior',
      ],
      correctIndex: 1,
      explanation:
        'A neutron star has no nuclear reactions — it is supported by neutron degeneracy pressure. ' +
        'The Pauli exclusion principle forbids two neutrons from occupying the same quantum state, ' +
        'creating an enormous resistance to further compression.',
    },
    {
      question: 'What is a pulsar, physically speaking?',
      options: [
        'A star that actually flickers on and off at regular intervals',
        'A neutron star whose magnetic-pole emission beams sweep through space as it rotates',
        'A supermassive black hole accreting matter from a disk',
        'A white dwarf in a binary system with a red dwarf',
      ],
      correctIndex: 1,
      explanation:
        'A pulsar is a neutron star with a tilted magnetic axis. The emission is constant, ' +
        'but an observer detects a pulse only when the beam sweeps past the line of sight — ' +
        'a geometric effect, exactly like a lighthouse.',
    },
    {
      question: 'Which 2017 event first confirmed that heavy elements such as gold and platinum are forged in neutron star mergers?',
      options: [
        'The first image of the shadow of black hole M87*',
        'The launch of the NICER telescope on the International Space Station',
        'The detection of gravitational waves and a kilonova from the neutron star merger GW170817',
        'The discovery of a record-strength magnetar by the XMM-Newton telescope',
      ],
      correctIndex: 2,
      explanation:
        'GW170817 — a neutron star merger detected simultaneously in gravitational waves (LIGO/Virgo) ' +
        'and across the electromagnetic spectrum. The kilonova spectrum showed strontium and heavy elements, ' +
        'confirming the r-process as their synthesis mechanism.',
    },
    {
      question: 'What do pulsar timing arrays such as NANOGrav actually measure?',
      options: [
        'New supernovae in nearby galaxies',
        'Nanohertz gravitational waves through correlated microsecond deviations in pulsar signal arrival times',
        'Radio signals from extraterrestrial civilizations',
        'The magnetic field of neutron stars in real time',
      ],
      correctIndex: 1,
      explanation:
        'PTAs use the stability of millisecond pulsars as cosmic clocks. ' +
        'A passing gravitational wave compresses and stretches space between Earth and the pulsars, ' +
        'shifting pulse arrival times by microseconds. ' +
        'Correlated deviations as a function of angular separation — the Hellings-Downs curve — ' +
        'are the characteristic signature of a gravitational-wave background.',
    },
  ],

  sources: [
    {
      title: 'Demorest P. et al. — Two-solar-mass neutron star measured (J1614−2230)',
      url: 'https://www.nature.com/articles/nature09466',
      meta: 'Nature, 467, 1081–1083, 2010',
    },
    {
      title: 'Abbott B. et al. (LIGO/Virgo) — GW170817: Observation of Gravitational Waves from a Binary Neutron Star Inspiral',
      url: 'https://arxiv.org/abs/1710.05832',
      meta: 'PRL, 119, 161101, 2017 (open access)',
    },
    {
      title: 'Smartt S. et al. — A kilonova as the electromagnetic counterpart to a gravitational-wave source',
      url: 'https://www.nature.com/articles/nature24303',
      meta: 'Nature, 551, 75–79, 2017',
    },
    {
      title: 'NANOGrav Collaboration — The NANOGrav 15-year Data Set: Evidence for a Gravitational-Wave Background',
      url: 'https://arxiv.org/abs/2306.16213',
      meta: 'ApJL, 951, L8, 2023 (open access)',
    },
    {
      title: 'NICER/Miller M. et al. — Radius and mass of PSR J0030+0451 from NICER',
      url: 'https://arxiv.org/abs/1912.05705',
      meta: 'ApJL, 887, L24, 2019 (open access)',
    },
    {
      title: 'Lattimer J., Prakash M. — The Physics of Neutron Stars',
      url: 'https://science.sciencemag.org/content/304/5670/536',
      meta: 'Science, 304, 536–542, 2004',
    },
    {
      title: 'Hewish A. et al. — Observation of a Rapidly Pulsating Radio Source (first pulsar)',
      url: 'https://www.nature.com/articles/217709a0',
      meta: 'Nature, 217, 709–713, 1968',
    },
    {
      title: 'Cowan J. et al. — Origin of the heaviest elements: the r-process',
      url: 'https://arxiv.org/abs/1901.01410',
      meta: 'Rev. Mod. Phys., 93, 015002, 2021 (open access)',
    },
    {
      title: 'NASA NICER Mission Overview',
      url: 'https://www.nasa.gov/nicer',
      meta: 'NASA Science, official page, updated 2025',
    },
    {
      title: 'FAST Telescope — NAOC Official Page',
      url: 'https://fast.bao.ac.cn/',
      meta: 'National Astronomical Observatories of China, official page',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
