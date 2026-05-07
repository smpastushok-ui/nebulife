import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'distance-measurement',
  language: 'en',
  section: 'astronomy',
  order: 8,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'How We Measure Cosmic Distances',
  subtitle: 'From radar echoes to gravitational waves — the chain of methods that lets humanity reach beyond any telescope.',

  hero: {
    cacheKey: 'distance-measurement-hero',
    prompt:
      'Photorealistic scientific illustration of a cosmic distance ladder concept: ' +
      'a stylized pyramid-staircase structure rising from a planetary radar dish at the base, through star parallax diagrams, ' +
      'Cepheid variable stars pulsating, Type Ia supernova explosions, to redshift galaxy spectra at the apex. ' +
      'Hard sci-fi style, dark space background, faint star field, accent colors cyan and amber. ' +
      'Add the following text labels on the image: "Radar", "Parallax", "Cepheids", "Supernovae", "Redshift".',
    alt: 'The cosmic distance ladder — from radar to redshift, a hierarchical pyramid of measurement methods',
    caption:
      'No single method spans the entire universe. Astronomers build a chain of overlapping techniques — each rung relying on the one below and reaching still farther out.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Distance is the most important and most difficult quantity in astronomy. We can measure a star\'s brightness, its color, ' +
        'its temperature, even its chemical composition — but without distance those numbers remain half-empty. ' +
        'A brilliant star in the sky might be a nearby dwarf or an enormously distant supergiant; without distance we cannot tell them apart.',

        'Humanity has solved this problem one method at a time, each technique building on the last, ' +
        'like rungs on a ladder. Astronomers call this the _cosmic distance ladder_. ' +
        'The lower rungs are solid and precise; the higher you climb, the more you depend on assumptions and statistics. ' +
        'But without the lower rungs the upper ones would not exist at all.',

        'Every generation of physicists and astronomers has either added new rungs or reinforced old ones. ' +
        'Today we measure distances to galaxies billions of _light-years_ away — ' +
        'and that capability is one of the greatest intellectual achievements in the history of science.',
      ],
    },

    {
      heading: 'Units of Measurement: the Light-Year and the Parsec',
      level: 2,
      paragraphs: [
        'Before examining the methods themselves, it helps to fix the units. A **light-year** is the distance light travels through a vacuum in one year — ' +
        'approximately nine and a half trillion kilometers. Despite the word "year" in the name, it is a unit of distance, not time — ' +
        'a confusion the name invites but does not deserve.',

        'A **parsec** is the unit professional astronomers use far more often. One parsec is the distance from which the semi-major axis of Earth\'s orbit ' +
        'subtends an angle of one arcsecond. One parsec equals approximately three and two tenths light-years, ' +
        'or about thirty-one trillion kilometers. ' +
        'A kiloparsec is one thousand parsecs; a megaparsec is one million parsecs. ' +
        'Our Galaxy is roughly thirty kiloparsecs across. ' +
        'The nearest large galaxy, Andromeda, lies approximately eight hundred kiloparsecs away.',
      ],
    },

    {
      heading: 'The First Rung: Radar Ranging in the Solar System',
      level: 2,
      paragraphs: [
        'The most precise distances — those within the Solar System — are measured by radar. ' +
        'The principle is straightforward: send a radio signal toward a planet, time how long it takes to travel there and return. ' +
        'Since the speed of radio waves is exactly the speed of light, the distance follows with arbitrarily small uncertainty.',

        'In the middle of the twentieth century, radar astronomy pinned down precise distances to Venus, Mars, and Mercury. ' +
        'This allowed astronomers to establish the size of the Solar System — and fix the **astronomical unit**, ' +
        'that is the mean distance from Earth to the Sun, as the foundation for all subsequent measurements. ' +
        'Every higher rung on the ladder ultimately rests on this base.',
      ],
    },

    {
      image: {
        cacheKey: 'distance-measurement-parallax-concept',
        prompt:
          'Photorealistic scientific illustration explaining stellar parallax: ' +
          'Earth shown at two opposite points of its orbit around the Sun (labeled "January" and "July"), ' +
          'a nearby foreground star appearing to shift position against a distant star field background, ' +
          'parallax angle marked with a thin arc between the two apparent positions of the star. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "Earth (January)", "Earth (July)", "nearby star", "parallax angle", "distant star field".',
        alt: 'Stellar parallax — the apparent shift of a nearby star against a distant background when observed from two points in Earth\'s orbit',
        caption:
          'The parallax angle is half the total angular shift observed over six months. ' +
          'The farther the star, the smaller the angle and the harder it is to measure.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Second Rung: Parallax and the Gaia Mission',
      level: 2,
      paragraphs: [
        'Hold a finger close to your face and look at it first with one eye, then the other — it appears to shift against the distant background. ' +
        'That is parallax: the apparent change in position of an object depending on the viewpoint. ' +
        'Astronomers exploit Earth\'s orbit for the same purpose: by observing the same star from two positions — ' +
        'say, in January and in July when Earth sits on opposite sides of the Sun — they detect a microscopic apparent shift of the star against the much more distant stellar backdrop.',

        'The angle of that shift is directly tied to distance: a parallax of one arcsecond corresponds to one parsec. ' +
        'That is in fact the definition of the parsec, and the origin of its name. ' +
        'The method is purely geometric and requires no physical assumptions about the nature of the star itself.',

        'Ground-based telescopes of the nineteenth and twentieth centuries could only measure parallaxes for a few hundred of the nearest stars — ' +
        'atmospheric turbulence prevented greater precision. ' +
        'The revolution came from the Gaia mission of the European Space Agency: ' +
        'launched in 2013, it measures parallaxes with extraordinary precision from space. ' +
        'Its catalogs cover more than one billion stars in our Galaxy, ' +
        'reaching reliable parallax distances to approximately ten kiloparsecs from the Sun. ' +
        'This single rung now spans most of the Milky Way.',
      ],
    },

    {
      diagram: {
        title: 'Parallax Angle and Distance',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.6)" rx="4"/>

  <!-- Sun at center -->
  <circle cx="340" cy="200" r="14" fill="#ffee88" stroke="#ffd050" stroke-width="1.5"/>
  <text x="340" y="225" fill="#ffee88" font-family="monospace" font-size="10" text-anchor="middle">Sun</text>

  <!-- Earth orbit (ellipse) -->
  <ellipse cx="340" cy="200" rx="120" ry="40" fill="none" stroke="#334455" stroke-width="1" stroke-dasharray="5,4"/>

  <!-- Earth Jan -->
  <circle cx="220" cy="200" r="6" fill="#7bb8ff" stroke="#4488aa" stroke-width="1.2"/>
  <text x="196" y="196" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="end">Earth (January)</text>

  <!-- Earth Jul -->
  <circle cx="460" cy="200" r="6" fill="#7bb8ff" stroke="#4488aa" stroke-width="1.2"/>
  <text x="484" y="196" fill="#7bb8ff" font-family="monospace" font-size="9">Earth (July)</text>

  <!-- Baseline label -->
  <line x1="220" y1="215" x2="460" y2="215" stroke="#334455" stroke-width="0.8"/>
  <line x1="220" y1="210" x2="220" y2="220" stroke="#334455" stroke-width="0.8"/>
  <line x1="460" y1="210" x2="460" y2="220" stroke="#334455" stroke-width="0.8"/>
  <text x="340" y="230" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">2 AU (baseline)</text>

  <!-- Nearby star -->
  <circle cx="340" cy="60" r="5" fill="#ff8844" stroke="#cc6622" stroke-width="1.2"/>
  <text x="370" y="58" fill="#ff8844" font-family="monospace" font-size="9">Nearby star</text>

  <!-- Lines from Earth positions to nearby star -->
  <line x1="220" y1="200" x2="340" y2="60" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
  <line x1="460" y1="200" x2="340" y2="60" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>

  <!-- Parallax angle arc near star -->
  <path d="M 320 75 A 25 25 0 0 1 360 75" fill="none" stroke="#ff8844" stroke-width="1.5"/>
  <text x="340" y="40" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">parallax angle p</text>

  <!-- Distant background stars -->
  <circle cx="120" cy="55" r="1.5" fill="#aabbcc" opacity="0.4"/>
  <circle cx="170" cy="35" r="1.5" fill="#aabbcc" opacity="0.4"/>
  <circle cx="490" cy="48" r="1.5" fill="#aabbcc" opacity="0.4"/>
  <circle cx="560" cy="30" r="1.5" fill="#aabbcc" opacity="0.4"/>
  <circle cx="620" cy="62" r="1.5" fill="#aabbcc" opacity="0.4"/>
  <text x="340" y="15" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Distant background stars</text>

  <!-- Formula -->
  <text x="340" y="285" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">d (parsecs) = 1 / p (arcseconds)</text>
  <text x="340" y="300" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Smaller angle = greater distance</text>
</svg>`,
        caption:
          'The geometry of parallax. Distance in parsecs is the reciprocal of the parallax angle in arcseconds. ' +
          'For stars beyond roughly ten kiloparsecs the angle becomes too small for reliable measurement even from space.',
      },
    },

    {
      heading: 'The Third Rung: Main-Sequence Fitting',
      level: 2,
      paragraphs: [
        'Parallax works reliably only for stars within our own Galaxy. ' +
        'To reach farther — to open and globular star clusters, and ultimately to other galaxies — ' +
        'astronomers apply _main-sequence fitting_.',

        'The Hertzsprung-Russell diagram shows that stars of a given spectral class have a predictable absolute luminosity. ' +
        'When we observe a star cluster whose parallax we cannot directly measure, ' +
        'we build its HR diagram and compare its shape to a reference diagram built from stars whose distances are known from parallax. ' +
        'The difference between the observed and expected brightness yields the _distance modulus_ — ' +
        'a logarithmic measure of how far away the cluster is.',

        'This method bridges the gap from individual stars to stellar systems and reaches the nearest satellite galaxies of the Milky Way.',
      ],
    },

    {
      image: {
        cacheKey: 'distance-measurement-cepheid',
        prompt:
          'Photorealistic scientific illustration of a Cepheid variable star pulsating: ' +
          'a large yellow-orange supergiant star shown in two phases — expanded (large, brighter) and contracted (smaller, dimmer) — ' +
          'with a period-luminosity graph inset in the corner showing a straight log-linear relationship. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "bright phase", "dim phase", "period (days)", "luminosity", "Leavitt law".',
        alt: 'A Cepheid variable star in bright and dim phases, with an inset period-luminosity graph',
        caption:
          'The longer a Cepheid\'s pulsation period, the greater its true luminosity. This iron-clad relationship turns every Cepheid into a measuring instrument.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Fourth Rung: Cepheids and the Leavitt Law',
      level: 2,
      paragraphs: [
        'In the early twentieth century, American astronomer Henrietta Leavitt was studying variable stars in the Small Magellanic Cloud — ' +
        'a satellite galaxy of the Milky Way. Among hundreds of variables she identified a special class: _Cepheids_, ' +
        'stars that pulsate regularly, swelling and contracting in size, and varying in brightness with a strict rhythm.',

        'Leavitt recognized a fundamental law: **the longer a Cepheid\'s pulsation period, the greater its true luminosity**. ' +
        'Since all Cepheids in the Small Magellanic Cloud lie at roughly the same distance from us, ' +
        'the observed brightness directly reflected the intrinsic brightness — and the relationship was clear and unambiguous.',

        'The consequences of this discovery are hard to overstate. If we observe a Cepheid in a distant galaxy, ' +
        'we measure its period — and immediately know its true luminosity. ' +
        'Comparing true and observed brightness gives us the distance to that galaxy. ' +
        'A Cepheid became a **standard candle**: an object of known intrinsic brightness ' +
        'from which distance follows by comparison.',

        'Edwin Hubble used Cepheids in the 1920s to demonstrate that certain nebulae were in fact separate galaxies, ' +
        'immeasurably far from the Milky Way. This permanently expanded our understanding of the scale of the universe. ' +
        'The Hubble Space Telescope, and later JWST launched in 2021, detected Cepheids in galaxies tens of megaparsecs away, ' +
        'progressively sharpening our measurement of the Hubble constant.',
      ],
    },

    {
      heading: 'The Fifth Rung: Type Ia Supernovae as Standard Candles',
      level: 2,
      paragraphs: [
        'Cepheids work reliably out to several hundred megaparsecs. ' +
        'At greater distances they become indistinguishable from ordinary stars even through the most powerful telescopes. ' +
        'Here **Type Ia supernovae** take over — explosions so bright that they are visible in galaxies billions of light-years away.',

        'A Type Ia supernova occurs in a binary star system where a white dwarf accretes matter from a companion star. ' +
        'When the white dwarf\'s mass exceeds a critical threshold — approximately one and four tenths solar masses — ' +
        'a thermonuclear detonation occurs. Because the critical mass is the same for all such events, ' +
        'the peak luminosity of these explosions is nearly identical across different galaxies. ' +
        'Comparing observed and expected brightness yields the distance.',

        'In the late 1990s two independent teams of astronomers used Type Ia supernovae to measure distances to remote galaxies ' +
        'and made a startling discovery: the universe is not merely expanding — it is accelerating in its expansion. ' +
        'For this, Saul Perlmutter, Brian Schmidt, and Adam Riess received the Nobel Prize in Physics. ' +
        'The cause of the acceleration was named _dark energy_ — one of the largest unsolved problems in modern physics.',
      ],
    },

    {
      image: {
        cacheKey: 'distance-measurement-supernova-ia',
        prompt:
          'Photorealistic scientific illustration of a Type Ia supernova: ' +
          'a brilliant white-blue explosion expanding outward in a host galaxy, ' +
          'the supernova far outshines the surrounding galaxy stars, visible as a point of intense light with radiating rings. ' +
          'The host spiral galaxy shown edge-on in the background. ' +
          'Hard sci-fi style, dark space background, dramatic lighting. ' +
          'Add the following text labels on the image: "Type Ia supernova", "host galaxy", "standard candle", "known luminosity".',
        alt: 'A Type Ia supernova in its host galaxy — a standard candle brighter than an entire galaxy',
        caption:
          'At peak brightness a Type Ia supernova outshines the entire host galaxy. ' +
          'That brightness is predictable and consistent, making these explosions measuring instruments across billions of parsecs.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Sixth Rung: Redshift and Hubble\'s Law',
      level: 2,
      paragraphs: [
        'In 1929 Edwin Hubble published observations that changed cosmology permanently: ' +
        'galaxies that lie farther away are receding faster. ' +
        'Recession velocity is proportional to distance — this is **Hubble\'s law**.',

        'The recession velocity of a galaxy is measured through the _redshift_ of its spectral lines. ' +
        'When a galaxy moves away from us, its light is stretched — spectral lines shift toward longer wavelengths, ' +
        'that is toward the red end of the spectrum. The greater the shift, the faster the recession, ' +
        'and by Hubble\'s law, the greater the distance.',

        'The proportionality constant between velocity and distance — the **Hubble constant** — ' +
        'is the key parameter of modern cosmology. ' +
        'For very distant objects, where all other methods have already broken down, ' +
        'redshift remains the only accessible tool. ' +
        'Quasars and galaxies at the edges of the observable universe — billions of parsecs away — ' +
        'are catalogued precisely through their redshifts.',

        'There is a fundamental caveat: Hubble\'s law gives distances only in a statistical and average sense. ' +
        'Individual galaxies have their own chaotic motions, called peculiar velocities, ' +
        'which can substantially distort distance estimates for nearby objects. ' +
        'The method therefore becomes reliable only at larger distances, where peculiar velocities are relatively small.',
      ],
    },

    {
      diagram: {
        title: 'The Cosmic Distance Ladder',
        svg: `<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="420" fill="rgba(10,15,25,0.6)" rx="4"/>

  <!-- Step 1: Radar -->
  <rect x="40" y="350" width="600" height="44" rx="3" fill="rgba(68,136,170,0.18)" stroke="#4488aa" stroke-width="1"/>
  <text x="60" y="368" fill="#7bb8ff" font-family="monospace" font-size="11" font-weight="bold">1. Radar Ranging</text>
  <text x="60" y="384" fill="#8899aa" font-family="monospace" font-size="9">Planets of the Solar System — up to a few billion kilometers</text>

  <!-- Step 2: Parallax -->
  <rect x="40" y="295" width="540" height="44" rx="3" fill="rgba(68,136,170,0.14)" stroke="#4488aa" stroke-width="1"/>
  <text x="60" y="313" fill="#7bb8ff" font-family="monospace" font-size="11" font-weight="bold">2. Trigonometric Parallax (Gaia)</text>
  <text x="60" y="329" fill="#8899aa" font-family="monospace" font-size="9">Stars in the Galaxy — to approximately ten kiloparsecs</text>

  <!-- Step 3: Main-sequence fitting -->
  <rect x="40" y="240" width="470" height="44" rx="3" fill="rgba(68,136,170,0.11)" stroke="#4488aa" stroke-width="1"/>
  <text x="60" y="258" fill="#7bb8ff" font-family="monospace" font-size="11" font-weight="bold">3. Main-Sequence Fitting</text>
  <text x="60" y="274" fill="#8899aa" font-family="monospace" font-size="9">Star clusters — up to a few megaparsecs</text>

  <!-- Step 4: Cepheids -->
  <rect x="40" y="185" width="400" height="44" rx="3" fill="rgba(255,136,68,0.12)" stroke="#ff8844" stroke-width="1"/>
  <text x="60" y="203" fill="#ff8844" font-family="monospace" font-size="11" font-weight="bold">4. Cepheids (Leavitt Law)</text>
  <text x="60" y="219" fill="#8899aa" font-family="monospace" font-size="9">Nearby galaxies — up to several hundred megaparsecs</text>

  <!-- Step 5: Type Ia supernovae -->
  <rect x="40" y="130" width="330" height="44" rx="3" fill="rgba(204,68,68,0.14)" stroke="#cc4444" stroke-width="1"/>
  <text x="60" y="148" fill="#cc4444" font-family="monospace" font-size="11" font-weight="bold">5. Type Ia Supernovae</text>
  <text x="60" y="164" fill="#8899aa" font-family="monospace" font-size="9">Distant galaxies — up to a few gigaparsecs</text>

  <!-- Step 6: Redshift -->
  <rect x="40" y="75" width="260" height="44" rx="3" fill="rgba(68,255,136,0.10)" stroke="#44ff88" stroke-width="1"/>
  <text x="60" y="93" fill="#44ff88" font-family="monospace" font-size="11" font-weight="bold">6. Redshift (Hubble's Law)</text>
  <text x="60" y="109" fill="#8899aa" font-family="monospace" font-size="9">Quasars, early universe — billions of parsecs</text>

  <!-- Step 7: GW standard sirens -->
  <rect x="40" y="20" width="200" height="44" rx="3" fill="rgba(123,184,255,0.12)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="60" y="38" fill="#7bb8ff" font-family="monospace" font-size="11" font-weight="bold">7. Gravitational Waves</text>
  <text x="60" y="54" fill="#8899aa" font-family="monospace" font-size="9">Independent measure of the Hubble constant</text>

  <!-- Right distance axis label -->
  <text x="660" y="370" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle" transform="rotate(90,660,370)">Distance range</text>

  <!-- Arrow up on right -->
  <line x1="655" y1="380" x2="655" y2="30" stroke="#334455" stroke-width="1"/>
  <polygon points="655,22 651,34 659,34" fill="#334455"/>
</svg>`,
        caption:
          'Each rung overlaps with its neighbors — that overlap is what allows methods to be cross-checked and calibrated. ' +
          'Without the lower rungs the upper ones have no anchor.',
      },
    },

    {
      heading: 'The Seventh Rung: Gravitational Waves as Standard Sirens',
      level: 2,
      paragraphs: [
        'In 2017 the LIGO and Virgo detectors registered a signal from the merger of two neutron stars — an event labeled GW170817. ' +
        'That merger was also observed across the electromagnetic spectrum: from a gamma-ray burst to an optical transient known as a _kilonova_. ' +
        'For the first time in astronomy the same event was documented simultaneously in gravitational waves and photons.',

        'Gravitational waves carry a built-in distance gauge. ' +
        'From the shape of the wave — its amplitude and frequency evolution — one can compute the distance to the merger independently. ' +
        'This relies neither on Cepheids, nor on supernovae, nor on any other rung of the ladder. ' +
        'Neutron-star mergers observed across multiple messenger channels therefore acquired the apt name _standard sirens_: ' +
        'an analogy with standard candles, but for gravitational-wave astronomy.',

        'GW170817 provided an independent estimate of the Hubble constant — ' +
        'the first in astronomy not tied to any of the traditional rungs. ' +
        'This result is especially valuable in the context of the _Hubble tension_ — ' +
        'a serious disagreement between different ways of measuring the Hubble constant.',
      ],
    },

    {
      heading: 'The Hubble Tension: Cosmology\'s Open Wound',
      level: 2,
      paragraphs: [
        'The Hubble constant is the most fundamental parameter of our universe. ' +
        'It describes the current rate of cosmic expansion and allows us to compute the universe\'s age and size. ' +
        'One would expect that two independent measurements of the same constant should agree. ' +
        'They do not — and that is a serious problem.',

        'The "bottom-up" approach using Cepheids and Type Ia supernovae — the _local distance ladder_ — ' +
        'yields a somewhat higher value of the Hubble constant. ' +
        'The "top-down" approach analyzing the cosmic microwave background — ' +
        'the microwave afterglow of the first light after the Big Bang — yields a lower value. ' +
        'The discrepancy exceeds the measurement uncertainties and does not shrink as data improve — if anything, it grows.',

        'This is the **Hubble tension**. Among the proposed explanations: systematic errors in one or both measurements, ' +
        'new physics such as novel forms of dark energy or dark matter, ' +
        'or even a fundamental large-scale inhomogeneity of the universe. ' +
        'JWST, launched in 2021, measures Cepheids with unprecedented precision, ' +
        'gradually narrowing the field of uncertainty — but a definitive answer remains out of reach. ' +
        'The Hubble tension stands as one of the sharpest open problems in modern physics.',
      ],
    },

    {
      image: {
        cacheKey: 'distance-measurement-hubble-tension',
        prompt:
          'Photorealistic scientific infographic showing the Hubble tension: ' +
          'a horizontal number line showing different measured values of the Hubble constant from different methods — ' +
          'CMB measurement (Planck satellite) on the left, local distance ladder (Cepheids + supernovae) on the right, ' +
          'gravitational waves result in the middle, with error bars shown as horizontal lines for each. ' +
          'The gap between the two main clusters is highlighted. ' +
          'Hard sci-fi style, dark background, monospace labels, accent colors amber and cyan. ' +
          'Add the following text labels on the image: "Planck CMB", "Cepheid+SNe Ia", "GW170817", "Hubble constant", "tension".',
        alt: 'The Hubble tension — the discrepancy between different measurements of the Hubble constant from the cosmic microwave background versus local distance ladder',
        caption:
          'Hubble constant values derived from the cosmic microwave background and from local distance ladder methods disagree by more than their measurement uncertainties allow. ' +
          'This gap may point to physics beyond the standard cosmological model.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Why This Matters for Our Understanding of the Universe',
      level: 2,
      paragraphs: [
        'Measuring distances is not merely a technical cartographic exercise. ' +
        'The precision of these measurements determines our understanding of the entire evolution of the universe: ' +
        'its age, its expansion rate, the amounts of dark matter and dark energy it contains, ' +
        'and ultimately what fate awaits it.',

        'Each rung of the cosmic distance ladder is not just mathematics. ' +
        'It is specific people, specific ideas, and often years or decades of labor. ' +
        'Henrietta Leavitt classified stars at the Harvard Observatory without the right to participate fully in scientific discussions — ' +
        'and discovered the law without which modern cosmology could not exist. ' +
        'Hubble used her work to show that the Milky Way is only one of billions of galaxies. ' +
        'The LIGO and Virgo teams built detectors sensitive to distortions of space smaller than one thousandth the diameter of a proton — ' +
        'and opened an entirely new measuring instrument for the cosmos.',

        'The universe is vast. To measure it, humanity needed a ladder. ' +
        'And that ladder is not yet complete.',
      ],
    },

    {
      image: {
        cacheKey: 'distance-measurement-deep-field',
        prompt:
          'Photorealistic scientific illustration inspired by JWST deep field: ' +
          'thousands of galaxies of various shapes, sizes and colors filling the entire frame against deep black space — ' +
          'spirals, ellipticals, irregular galaxies at different redshifts, ' +
          'some galaxies distorted by gravitational lensing arcs, ' +
          'bright foreground stars with diffraction spikes, ' +
          'the oldest most distant galaxies appearing red-orange due to high redshift. ' +
          'Hard sci-fi photorealistic style. ' +
          'Add the following text labels on the image: "nearby galaxies", "distant galaxies", "gravitational lensing", "redshift z>10".',
        alt: 'JWST deep field — thousands of galaxies at various distances from nearby to those with a redshift exceeding ten',
        caption:
          'A JWST deep field contains thousands of galaxies at distances ranging from a few megaparsecs to more than thirteen billion light-years. ' +
          'Distances to each are determined through redshift — the last rung of the cosmic distance ladder.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Light-year',
      definition:
        'A unit of length equal to the distance light travels through a vacuum in one year — approximately nine and a half trillion kilometers. Despite the word "year" in the name, it is a unit of distance, not time.',
    },
    {
      term: 'Parsec',
      definition:
        'A unit of astronomical distance equal to approximately three and two tenths light-years. Defined as the distance from which the semi-major axis of Earth\'s orbit subtends an angle of one arcsecond. The name combines "parallax" and "arcsecond".',
    },
    {
      term: 'Parallax',
      definition:
        'The apparent change in position of an object against a distant background when viewed from different vantage points. In stellar astronomy, the angle by which a nearby star appears to shift against the background of far more distant stars when observed from opposite ends of Earth\'s orbit.',
    },
    {
      term: 'Cepheid variable',
      definition:
        'A type of pulsating variable star whose brightness varies with a well-defined period. The longer the period, the greater the true luminosity — a relationship discovered by Henrietta Leavitt that turns Cepheids into standard candles for measuring distances to other galaxies.',
    },
    {
      term: 'Standard candle',
      definition:
        'An astronomical object of known intrinsic luminosity. By comparing true and observed brightness, one can compute the distance to the object. Cepheid variables and Type Ia supernovae are the most important standard candles in astronomy.',
    },
    {
      term: 'Redshift',
      definition:
        'The increase in the wavelength of electromagnetic radiation that occurs when the source is moving away from the observer. In a cosmological context, it is a consequence of the expansion of space itself. Greater redshift implies greater distance and an earlier era in cosmic history.',
    },
    {
      term: 'Hubble constant',
      definition:
        'The proportionality constant between a galaxy\'s recession velocity and its distance. It describes the current rate of expansion of the universe. The precise value of the Hubble constant remains a subject of active debate due to the Hubble tension.',
    },
    {
      term: 'Hubble tension',
      definition:
        'An unresolved discrepancy between two families of Hubble constant measurements: values derived from the local distance ladder are systematically higher than those inferred from the cosmic microwave background. May indicate physics beyond the standard cosmological model.',
    },
    {
      term: 'Standard siren',
      definition:
        'A gravitational-wave source whose parameters are sufficiently well known to permit direct distance measurement, independent of the traditional distance ladder. The analogue of a standard candle for gravitational-wave astronomy. The first standard siren was the neutron-star merger GW170817.',
    },
    {
      term: 'Distance modulus',
      definition:
        'The difference between an object\'s apparent magnitude and its absolute magnitude. Numerically equal to five times the base-ten logarithm of the distance in parsecs, minus five. A convenient logarithmic way of expressing astronomical distances.',
    },
  ],

  quiz: [
    {
      question: 'What is a parsec and where does the name come from?',
      options: [
        'The distance light travels in one second',
        'The distance from which Earth\'s orbit subtends one arcsecond; the name combines "parallax" and "arcsecond"',
        'A unit of mass equal to the Sun\'s mass divided by one billion',
        'A unit of the rate of cosmic expansion',
      ],
      correctIndex: 1,
      explanation:
        'A parsec is a geometric unit of distance. One parsec is the distance from which the semi-major axis of Earth\'s orbit — one astronomical unit — subtends an angle of one arcsecond. The name is a portmanteau of "parallax" and "arcsecond". One parsec equals approximately three and two tenths light-years.',
    },
    {
      question: 'What discovery by Henrietta Leavitt turned Cepheid variables into standard candles?',
      options: [
        'She found that all Cepheids have identical brightness',
        'She established that the longer a Cepheid\'s pulsation period, the greater its true luminosity',
        'She measured the parallax of the first Cepheids outside the Galaxy',
        'She proved that Cepheids are binary star systems',
      ],
      correctIndex: 1,
      explanation:
        'Leavitt found a clear relationship: the longer a Cepheid\'s pulsation period, the intrinsically brighter the star. Since all Cepheids in the Small Magellanic Cloud lie at roughly the same distance from Earth, the observed brightness directly reflected the true brightness. This law turns a simple period measurement into a distance measurement.',
    },
    {
      question: 'Why are Type Ia supernovae particularly valuable for measuring distances in the distant universe?',
      options: [
        'They occur only in nearby galaxies and are therefore easy to see',
        'Their peak luminosity is nearly identical for all events, so comparing it to observed brightness gives the distance',
        'They emit gravitational waves that allow precise distance determination',
        'They are always accompanied by gamma-ray bursts of known power',
      ],
      correctIndex: 1,
      explanation:
        'A Type Ia supernova occurs when a white dwarf in a binary system accretes exactly a critical mass and explodes thermonuclearly. Because the critical mass is the same for all such objects, the peak luminosity of the explosion is similarly predictable. Comparing observed brightness to this standard allows astronomers to calculate the distance to the host galaxy.',
    },
    {
      question: 'What is the Hubble tension?',
      options: [
        'The Hubble constant is measured differently in different directions of the sky',
        'Values of the Hubble constant from the local distance ladder and from the cosmic microwave background systematically disagree',
        'The Hubble constant changes over time and no longer obeys the original law',
        'Different telescopes give different values due to technical errors',
      ],
      correctIndex: 1,
      explanation:
        'The Hubble tension is a statistically significant discrepancy between two independent groups of measurements: the local distance ladder — Cepheids and Type Ia supernovae — gives a higher Hubble constant, while analysis of the cosmic microwave background — the Planck satellite — gives a lower value. The gap exceeds measurement uncertainties and does not disappear as data improve.',
    },
    {
      question: 'What makes neutron-star mergers "standard sirens"?',
      options: [
        'They always occur at the same distance from the observer',
        'The shape of the gravitational-wave signal directly encodes the distance to the source, independent of any other rung',
        'They always occur in galaxies that also contain Cepheids',
        'Gravitational waves from them always have the same frequency',
      ],
      correctIndex: 1,
      explanation:
        'The gravitational-wave signal from a neutron-star merger contains built-in information about the distance to the source: the amplitude of the waves can be used to calculate how far away the merger occurred. This is completely independent of the traditional distance ladder — hence "standard siren" rather than "standard candle". The first example was GW170817 in 2017.',
    },
  ],

  sources: [
    {
      title: 'Leavitt H.S., Pickering E.C. — Periods of 25 Variable Stars in the Small Magellanic Cloud (1912)',
      url: 'https://ui.adsabs.harvard.edu/abs/1912HarCi.173....1L',
      meta: 'Harvard College Observatory Circular 173, 1912 — discovery of the Cepheid period-luminosity law',
    },
    {
      title: 'Hubble E. — A Relation between Distance and Radial Velocity among Extra-Galactic Nebulae (1929)',
      url: 'https://www.pnas.org/doi/10.1073/pnas.15.3.168',
      meta: 'PNAS 15(3), 168–173, 1929 — original publication of Hubble\'s law',
    },
    {
      title: 'ESA Gaia Mission — Science Overview',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia',
      meta: 'ESA, Gaia mission launched 2013 — parallax of more than one billion stars',
    },
    {
      title: 'Riess A.G. et al. — A 2.4% Determination of the Local Value of the Hubble Constant (2016)',
      url: 'https://iopscience.iop.org/article/10.3847/0004-637X/826/1/56',
      meta: 'ApJ 826, 2016 — Hubble constant from Cepheids and Type Ia supernovae',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results: Cosmological Parameters',
      url: 'https://www.aanda.org/articles/aa/abs/2020/09/aa33910-18/aa33910-18.html',
      meta: 'A&A 641, A6, 2020 — Hubble constant from the cosmic microwave background',
    },
    {
      title: 'LIGO-Virgo Collaboration — GW170817: A Binary Neutron Star Merger',
      url: 'https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.119.161101',
      meta: 'PRL 119, 161101, 2017 — first standard siren',
    },
    {
      title: 'Abbott B.P. et al. — A Gravitational-Wave Standard Siren Measurement of the Hubble Constant',
      url: 'https://www.nature.com/articles/nature24471',
      meta: 'Nature 551, 85–88, 2017 — Hubble constant from GW170817',
    },
    {
      title: 'NASA JWST — Early Universe and Cepheid Measurements',
      url: 'https://science.nasa.gov/missions/webb/',
      meta: 'NASA Webb Science, official page, 2024',
    },
    {
      title: 'Verde L., Treu T., Riess A.G. — Tensions between the Early and Late Universe (2019)',
      url: 'https://www.nature.com/articles/s41550-019-0902-0',
      meta: 'Nature Astronomy 3, 891–895, 2019 — review of the Hubble tension',
    },
    {
      title: 'Carroll S.M. — Spacetime and Geometry: An Introduction to General Relativity',
      url: 'https://www.cambridge.org/us/universitypress/subjects/physics/cosmology-relativity-and-gravitation/spacetime-and-geometry-introduction-general-relativity',
      meta: 'Cambridge University Press, 2019 — standard university textbook',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
