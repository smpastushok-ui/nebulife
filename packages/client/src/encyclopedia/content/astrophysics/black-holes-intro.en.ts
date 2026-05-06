import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'black-holes-intro',
  language: 'en',
  section: 'astrophysics',
  order: 5,
  difficulty: 'beginner',
  readingTimeMin: 14,
  title: 'Black Holes — Introduction',
  subtitle: 'Objects you cannot escape. What we know, how we saw them, and why they are the best test of Einstein\'s theory.',

  hero: {
    cacheKey: 'black-holes-intro-hero',
    prompt:
      'Photorealistic scientific illustration of the M87* black hole shadow as imaged by the Event Horizon Telescope. ' +
      'Dark circular silhouette at center surrounded by an asymmetric glowing orange-gold accretion ring, brighter at the bottom due to relativistic Doppler beaming. ' +
      'Deep black void background with faint distant galaxies. ' +
      'Hard sci-fi style scientific illustration, wide aspect ratio, dark space background. ' +
      'Add the following text labels on the image: "M87*", "event horizon shadow", "accretion ring".',
    alt: 'Shadow of black hole M87* — dark circle surrounded by an asymmetric bright orange ring',
    caption:
      'M87* — the first image of a black hole shadow in history. Captured by the Event Horizon Telescope, published April 10, 2019. Mass: 6.5 billion solar masses. Distance: 55 million light-years.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Imagine a star a million times more massive than the Sun, compressed to the size of a city. ' +
        'The gravity at its surface is so intense that even light — the fastest thing in the universe — ' +
        'cannot escape. That is a **black hole**: a region of space from which nothing exits. ' +
        'Not because something is actively "sucking" matter in, but because spacetime geometry itself ' +
        'curves inward — like a funnel where every road leads to the center.',

        'It sounds like science fiction, but it is Einstein\'s best-confirmed prediction. ' +
        'In April 2019, humanity saw the _shadow_ of a black hole for the first time. ' +
        'In May 2022, we saw the shadow of the one lurking at the center of our own Galaxy. ' +
        'In 2024, scientists measured its magnetic field and the polarization of light near the event horizon. ' +
        'Black holes are real — the question now is not "do they exist" but "how exactly do they work inside".',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-eht-array',
        prompt:
          'Scientific illustration of the Event Horizon Telescope global array: world map showing eight major radio telescope sites connected by glowing data link lines forming a virtual Earth-sized dish. ' +
          'Sites labeled at South Pole, Chile, Hawaii, Arizona, Spain, Mexico, Greenland. ' +
          'Hard sci-fi style, monospace labels, dark background with faint continental outlines in dim blue. ' +
          'Add the following text labels on the image: "Event Horizon Telescope", "baseline = Earth diameter", "wavelength 1.3 mm".',
        alt: 'World map with eight EHT radio telescopes connected by light lines',
        caption: 'Eight radio observatories across the planet act as a single instrument the size of Earth. Angular resolution: 20 microarcseconds — enough to read a newspaper on the Moon.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Where Black Holes Come From',
      level: 2,
      paragraphs: [
        'Most black holes are _stellar corpses_. When a massive star (more than ~25 solar masses) ' +
        'exhausts its nuclear fuel, the pressure that held it against gravitational collapse vanishes. ' +
        'Gravity compresses the core with tremendous force. If the core mass exceeds ~3 solar masses, ' +
        'even neutron matter cannot withstand the pressure. In a fraction of a second, all that matter ' +
        'collapses to a point of zero volume — a _singularity_.',

        'From the outside, we witness this as a **supernova** — one of the most energetic explosions ' +
        'in the universe. But the black hole itself forms silently at the heart of the catastrophe. ' +
        'Around the singularity, an _event horizon_ emerges — an invisible sphere that, once crossed, ' +
        'cannot be uncrossed. This is not a physical surface; if the black hole is large enough, ' +
        'you would feel nothing unusual as you crossed it. But afterward, there is no return.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Schwarzschild Radius',
        svg: `<svg viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Singularity point -->
  <circle cx="320" cy="130" r="4" fill="#ff8844"/>
  <text x="332" y="135" fill="#ff8844" font-family="monospace" font-size="11">singularity</text>

  <!-- Event horizon -->
  <circle cx="320" cy="130" r="62" fill="rgba(204,68,68,0.06)" stroke="#cc4444" stroke-width="2"/>
  <text x="320" y="61" fill="#cc4444" font-family="monospace" font-size="11" text-anchor="middle">event horizon (R_s)</text>

  <!-- Photon sphere -->
  <circle cx="320" cy="130" r="93" fill="none" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="5,4"/>
  <text x="320" y="229" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">photon sphere (1.5 R_s)</text>

  <!-- ISCO -->
  <circle cx="320" cy="130" r="186" fill="none" stroke="#88ccdd" stroke-width="1" stroke-dasharray="2,7" opacity="0.45"/>
  <text x="514" y="133" fill="#88ccdd" font-family="monospace" font-size="11">ISCO (3 R_s)</text>

  <!-- Light ray escaping -->
  <path d="M 80 215 Q 240 195 510 90" stroke="#44ff88" stroke-width="1.5" fill="none"/>
  <text x="72" y="230" fill="#44ff88" font-family="monospace" font-size="10">light — escapes</text>

  <!-- Light ray captured -->
  <path d="M 80 58 Q 220 100 285 138 L 318 132" stroke="#ff8844" stroke-width="1.5" fill="none"/>
  <text x="72" y="48" fill="#ff8844" font-family="monospace" font-size="10">light — captured</text>

  <!-- Formula label -->
  <text x="320" y="16" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">R_s = 2GM / c²</text>
</svg>`,
        caption:
          'R_s = 2GM/c². For one solar mass this is ~3 kilometers For M87* — 38 billion km (larger than Neptune\'s orbit). ' +
          'ISCO (innermost stable circular orbit) marks the inner edge of the accretion disk.',
      },
    },

    {
      paragraphs: [
        'For a black hole with the mass of the Sun, the _Schwarzschild radius_ is just 3 kilometers. ' +
        'Compress the entire Sun into a sphere 6 km across and you get a black hole. ' +
        'This will never happen naturally — the Sun is not massive enough; it will end its life ' +
        'as a white dwarf — but the formula holds for any mass.',
      ],
    },

    {
      heading: 'Stellar Evolution Paths',
      level: 3,
      paragraphs: [
        'A star\'s fate depends almost entirely on its initial mass. The Sun will swell into a ' +
        'red giant, shed its outer layers as a planetary nebula, and settle as a white dwarf the ' +
        'size of Earth. A massive star (more than 8 solar masses) will explode as a supernova. ' +
        'If its core weighs between 1.4 and 3 solar masses, a neutron star remains. ' +
        'If more — a black hole forms.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Stellar Evolution Paths',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- ── Top path: Sun-like star ── -->
  <circle cx="80" cy="80" r="22" fill="#ffd080" opacity="0.9"/>
  <text x="80" y="85" fill="#020510" font-family="monospace" font-size="9" text-anchor="middle" font-weight="bold">Sun</text>
  <text x="80" y="116" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">1 M☉</text>

  <line x1="104" y1="80" x2="175" y2="80" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>

  <circle cx="210" cy="80" r="30" fill="#cc6633" opacity="0.85"/>
  <text x="210" y="78" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Red</text>
  <text x="210" y="89" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Giant</text>
  <text x="210" y="122" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">~5 Gyr</text>

  <line x1="242" y1="80" x2="315" y2="80" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>

  <ellipse cx="355" cy="80" rx="28" ry="18" fill="none" stroke="#88ccdd" stroke-width="1.5" opacity="0.7"/>
  <text x="355" y="78" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Planetary</text>
  <text x="355" y="89" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Nebula</text>

  <line x1="385" y1="80" x2="455" y2="80" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>

  <circle cx="490" cy="80" r="10" fill="#cdd9e8" opacity="0.9"/>
  <text x="490" y="105" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">White</text>
  <text x="490" y="118" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Dwarf</text>

  <!-- ── Bottom path: massive star ── -->
  <circle cx="80" cy="230" r="32" fill="#aad4ff" opacity="0.85"/>
  <text x="80" y="228" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Massive</text>
  <text x="80" y="239" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Star</text>
  <text x="80" y="276" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">25+ M☉</text>

  <line x1="114" y1="230" x2="175" y2="230" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>

  <circle cx="215" cy="230" r="38" fill="#aa3322" opacity="0.85"/>
  <text x="215" y="228" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Red</text>
  <text x="215" y="239" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Supergiant</text>

  <line x1="255" y1="230" x2="305" y2="230" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>

  <circle cx="340" cy="230" r="24" fill="none" stroke="#ff8844" stroke-width="2"/>
  <circle cx="340" cy="230" r="14" fill="rgba(255,200,80,0.5)"/>
  <text x="340" y="234" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Supernova</text>
  <text x="340" y="265" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Type II/Ib/Ic</text>

  <line x1="364" y1="220" x2="420" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>
  <circle cx="450" cy="175" r="9" fill="#7bb8ff" opacity="0.9"/>
  <text x="450" y="155" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Neutron</text>
  <text x="450" y="168" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Star</text>
  <text x="450" y="198" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1.4–3 M☉</text>

  <line x1="364" y1="240" x2="420" y2="268" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en)"/>
  <circle cx="450" cy="278" r="12" fill="#080c18" stroke="#cc4444" stroke-width="2"/>
  <circle cx="450" cy="278" r="3" fill="#ff8844"/>
  <text x="450" y="304" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">Black Hole</text>
  <text x="450" y="317" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">&gt;3 M☉</text>

  <line x1="20" y1="155" x2="660" y2="155" stroke="#334455" stroke-width="0.5" stroke-dasharray="6,6" opacity="0.5"/>

  <text x="12" y="80" fill="#667788" font-family="monospace" font-size="9" dominant-baseline="middle">Low-mass</text>
  <text x="12" y="230" fill="#667788" font-family="monospace" font-size="9" dominant-baseline="middle">Massive</text>

  <defs>
    <marker id="arr-en" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'A star\'s fate is determined by its initial mass. Sun-like stars end as white dwarfs. ' +
          'Massive stars (above ~25 M☉) explode as supernovae and leave either a neutron star or a black hole.',
      },
    },

    {
      heading: 'Three Classes of Black Holes',
      level: 2,
      paragraphs: [
        'Modern astronomy recognizes three main classes by mass — and each poses its own ' +
        'distinct questions about origin.',
      ],
    },

    {
      heading: '1. Stellar-Mass Black Holes (5–100 M☉)',
      level: 3,
      paragraphs: [
        'Formed by the collapse of individual stars. Our Galaxy contains tens of millions of them, ' +
        'but most are isolated and invisible. We "see" them through X-ray emission from an ' +
        '_accretion disk_ when a black hole pulls matter from a companion star in a binary system. ' +
        'The first confirmed candidate — **Cygnus X-1** (1971), mass ~21 M☉ — remains a textbook example. ' +
        'In 2015, LIGO detected the first merger of two stellar-mass black holes via ' +
        '_gravitational waves_ — opening an entirely new observational window on the universe.',
      ],
    },

    {
      heading: '2. Supermassive Black Holes (10⁵–10¹⁰ M☉)',
      level: 3,
      paragraphs: [
        'Found at the centers of nearly every large galaxy. At the heart of the Milky Way lies ' +
        '**Sagittarius A*** (Sgr A*), with a mass of 4.3 million M☉. In the neighboring galaxy M87, ' +
        'the black hole weighs 6.5 billion M☉. How they grew so massive remains one of the biggest ' +
        'open questions in astrophysics. JWST is now finding quasars — active galactic nuclei powered ' +
        'by supermassive black holes — in a universe less than a billion years old. ' +
        'Standard accretion models struggle to explain such rapid growth.',
      ],
    },

    {
      heading: '3. Intermediate-Mass Black Holes (100–10⁵ M☉)',
      level: 3,
      paragraphs: [
        'The most mysterious class. By 2025 only a handful of convincing candidates exist, ' +
        'among them **HLX-1** in galaxy ESO 243-49. They may form through the mergers of stellar-mass ' +
        'black holes in dense star clusters, or via _direct collapse_ of massive gas clouds in the ' +
        'early universe. JWST and the forthcoming Einstein Telescope are expected to clarify their ' +
        'origins by 2030.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-bh-types-comparison',
        prompt:
          'Scientific infographic comparing three types of black holes: stellar-mass (small, 5-100 solar masses, next to a city for scale), ' +
          'intermediate-mass (medium, labeled HLX-1 candidate), and supermassive (enormous, labeled M87* 6.5 billion solar masses, next to a galaxy). ' +
          'Three black circles of dramatically different sizes side by side with labeled size comparison bars. ' +
          'Hard sci-fi style scientific illustration, dark space background, monospace font labels, orange and cyan accents. ' +
          'Add the following text labels on the image: "stellar-mass 5-100 M_sun", "intermediate 100-100000 M_sun", "supermassive up to 10^10 M_sun".',
        alt: 'Comparison of three classes of black holes by mass and relative size',
        caption: 'The three classes of black holes differ by ten orders of magnitude in mass. The supermassive black hole in M87 has a diameter larger than the distance from the Sun to Neptune.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Accretion Disk and Relativistic Jets',
      level: 2,
      paragraphs: [
        'A black hole itself emits no light — by definition it is black. But infalling matter forms ' +
        'an **accretion disk** — a superheated rotating vortex of gas. Friction and magnetic turbulence ' +
        'heat this gas to tens of millions of degrees, making it blaze in X-rays and ultraviolet. ' +
        'Doppler beaming and gravitational lensing make the side of the disk approaching us appear ' +
        'brighter — this is why the ring in EHT images is asymmetric.',

        'Alongside the disk, **relativistic jets** form — narrow beams of plasma ejected along the ' +
        'black hole\'s rotation axis at speeds approaching the speed of light. Their driving mechanism ' +
        'is the magnetic field twisted by the spinning black hole itself ' +
        '(the Blandford-Znajek process). The jet of M87* extends more than 5,000 light-years ' +
        'and is clearly visible at radio wavelengths. In 2024, the EHT obtained the first map of ' +
        'magnetic polarization at the base of this jet, confirming the theoretical picture.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-accretion-disk-jets',
        prompt:
          'Scientific illustration of a black hole with accretion disk and relativistic jets: ' +
          'central dark sphere (event horizon) surrounded by a glowing orange-red spiral accretion disk seen at slight angle, ' +
          'two perpendicular bright blue-white plasma jets shooting outward along rotation axis, ' +
          'magnetic field lines shown as spiral cyan curves threading through disk and jets. ' +
          'Hard sci-fi style scientific illustration, dark space background, technically accurate geometry. ' +
          'Add the following text labels on the image: "event horizon", "accretion disk", "relativistic jet", "magnetic field lines", "rotation axis".',
        alt: 'Black hole with accretion disk and two relativistic jets firing along the rotation axis',
        caption: 'Jets form through the interaction of the magnetic field with the black hole\'s rotation (Blandford-Znajek effect). The plasma velocity in the M87* jet is approximately 0.99c.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'How We "Saw" Something Invisible',
      level: 2,
      paragraphs: [
        'The problem is simple: a black hole emits nothing, and the angular size of its shadow — ' +
        'even for the nearest objects — is tiny. The angular diameter of the Sgr A* shadow seen from ' +
        'Earth is equivalent to an orange on the surface of the Moon. No conventional telescope resolves that.',

        '**Event Horizon Telescope** (EHT) solved this through _very-long-baseline interferometry_ ' +
        '(VLBI). Eight radio observatories on four continents and in Antarctica recorded the signal ' +
        'simultaneously, synchronized by atomic clocks accurate to the nanosecond. ' +
        'Combining the data, computational algorithms reconstructed images with an angular resolution ' +
        'of 20 microarcseconds — equivalent to a telescope the size of Earth at a wavelength of 1.3 mm.',

        'The results: in 2019 — first image of M87*, in 2022 — image of Sgr A* (technically harder ' +
        'because the source flickers on minute timescales). In **2024**, EHT published a map of ' +
        '_linear polarization_ near the base of the M87* jet — the first direct measurement of the ' +
        'topological structure of the magnetic field close to the event horizon. The pattern is ' +
        'consistent with a Kerr rotating black hole carrying an ordered magnetic field aligned with the jet.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-light-bending',
        prompt:
          'Scientific diagram showing gravitational lensing around a black hole: ' +
          'multiple light rays (shown as glowing cyan lines) bending around the dark silhouette of an event horizon, ' +
          'some rays completing partial or full orbits at the photon sphere radius, ' +
          'background star field distorted into Einstein ring arcs. ' +
          'Side view showing the geometry clearly. Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "photon sphere 1.5 Rs", "event horizon Rs", "Einstein ring", "light path".',
        alt: 'Bending of light paths by a black hole\'s gravity, photon sphere and Einstein ring',
        caption: 'At 1.5 Schwarzschild radii, gravity is so strong that photons can orbit on an unstable circular path — the photon sphere. This is what forms the bright ring in EHT images.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Recent Discoveries: EHT 2024 and JWST 2025–2026',
      level: 2,
      paragraphs: [
        'April **2024**: EHT published a new series of M87* images with polarized light at higher ' +
        'angular resolution. The measured magnetic field structure near the jet base showed an ordered ' +
        'spiral configuration — precisely what the Blandford-Znajek magneto-rotational mechanism ' +
        'predicts. This is the first direct observation linking the magnetic field near the event ' +
        'horizon to jet formation.',

        'November **2024**: the EHT, GRAVITY+, and VLTI together tracked moving _hot spots_ ' +
        'on the orbit of Sgr A* — bright plasma flares orbiting the event horizon at speeds of ' +
        '30% the speed of light. The orbital period of ~30 minutes matches the innermost stable ' +
        'circular orbit for a black hole of this mass.',

        '**JWST** (2022–2026) is systematically finding quasars at _z > 7_ — less than 800 million ' +
        'years after the Big Bang. By 2025, several black holes exceeding one billion M☉ have been ' +
        'confirmed in a universe only ~700 million years old. These objects cannot be explained by ' +
        'standard accretion growth from stellar black holes. Leading candidate mechanisms include: ' +
        'direct collapse black holes (DCBH) from primordial gas clouds, and mergers of stellar black ' +
        'holes in the dense "stellar nurseries" of the early epoch.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-jwst-quasar',
        prompt:
          'Scientific illustration of a distant high-redshift quasar as observed by JWST: ' +
          'a brilliant point source surrounded by a host galaxy with reddish-orange hue due to cosmological redshift, ' +
          'tiny faint companion galaxies visible nearby, deep black space with infrared-style false color rendering, ' +
          'faint diffraction spikes typical of space telescope optics. ' +
          'Hard sci-fi style scientific illustration, dark space background. ' +
          'Add the following text labels on the image: "quasar z > 7", "supermassive black hole", "host galaxy", "JWST NIRCam view".',
        alt: 'High-redshift quasar observed by JWST — bright point source inside a young galaxy in the early universe',
        caption: 'JWST has found dozens of quasars with massive black holes when the universe was less than a billion years old. Their existence challenges standard models of black hole growth.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Open Questions: Where Physics Runs Out',
      level: 2,
      paragraphs: [
        'Despite remarkable observational progress, black holes remain the largest unfinished chapter ' +
        'in theoretical physics.',

        '**What is at the singularity?** General relativity predicts infinite density at the center. ' +
        'But infinity in physics is a sign that the theory breaks down. We need a quantum theory of ' +
        'gravity that describes Planck-scale lengths (~10⁻³⁵ m). String theory and loop quantum gravity ' +
        'are candidates, but neither has been confirmed.',

        '**The information paradox.** In 1974, Stephen Hawking showed that black holes must slowly ' +
        'evaporate through _Hawking radiation_ — a quantum effect near the event horizon. ' +
        'But if the black hole evaporates, what happens to the information about everything that fell in? ' +
        'Destroying information violates quantum mechanics. In 2022, Penington, Almheiri and others ' +
        'proposed a resolution through _island formulas_, linking the entropy of Hawking radiation ' +
        'to the interior of the black hole. The debate continues.',

        '**Where did the supermassive ones come from?** Standard accretion from stellar black holes ' +
        'needs billions of years, yet JWST sees giants in a much younger universe. ' +
        'Perhaps in the early universe — absent of metals, with ultra-dense protogalactic clouds — ' +
        'conditions enabled _direct collapse_ without a stellar phase. Answers are expected from ' +
        'JWST observations in 2026–2028.',
      ],
    },

    {
      image: {
        cacheKey: 'black-holes-intro-hawking-radiation',
        prompt:
          'Scientific diagram of Hawking radiation at a black hole event horizon: ' +
          'virtual particle-antiparticle pairs appearing near the event horizon, one particle escaping as Hawking radiation (shown as glowing orange arrow pointing outward), ' +
          'the other falling inward (shown as dim arrow pointing toward singularity), ' +
          'event horizon boundary shown as a crisp red arc, background deep black space. ' +
          'Hard sci-fi style, technically accurate, dark background. ' +
          'Add the following text labels on the image: "event horizon", "virtual pair", "Hawking radiation", "falls inward", "T ~ 1/M".',
        alt: 'Diagram of Hawking radiation: virtual particle pairs near the event horizon, one escaping as thermal radiation',
        caption: 'Hawking radiation is so faint that for a stellar-mass black hole its temperature (~60 nanokelvin) falls below the cosmic microwave background. Direct observation is currently impossible.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Singularity',
      definition:
        'A hypothetical region of zero volume and infinite density at the center of a black hole, where the equations of general relativity cease to be valid.',
    },
    {
      term: 'Event horizon',
      definition:
        'The invisible spherical boundary around a black hole beyond which nothing — including light — can escape. Not a physical surface, simply the point of no return.',
    },
    {
      term: 'Schwarzschild radius (R_s)',
      definition:
        'The radius of the event horizon for a non-rotating black hole (the Schwarzschild solution of GR). R_s = 2GM/c². For the Sun this is ~3 km.',
    },
    {
      term: 'Accretion disk',
      definition:
        'A rotating disk of superheated gas spiraling inward toward a black hole. Heated to millions of degrees by friction and magnetic turbulence, it radiates brightly in X-rays.',
    },
    {
      term: 'Relativistic jet',
      definition:
        'A narrow beam of plasma ejected along the rotation axis of a black hole at velocities up to 0.99c. Powered by the Blandford-Znajek magneto-rotational mechanism.',
    },
    {
      term: 'Hawking radiation',
      definition:
        'Theoretically predicted faint thermal radiation emitted near the event horizon through quantum vacuum fluctuations. For real astrophysical black holes, essentially unobservable.',
    },
    {
      term: 'Photon sphere',
      definition:
        'A spherical region at 1.5 R_s from the black hole center where photons can orbit on an unstable circular path. Its existence creates the bright ring seen in EHT images.',
    },
    {
      term: 'VLBI (Very Long Baseline Interferometry)',
      definition:
        'A technique of simultaneous observation by multiple radio telescopes separated by large distances. Provides angular resolution equivalent to a single telescope the size of their separation.',
    },
  ],

  quiz: [
    {
      question: 'What is the event horizon of a black hole?',
      options: [
        'A physical surface that infalling matter strikes',
        'The point of zero volume at the center of the black hole',
        'A spherical boundary beyond which nothing can return',
        'The ring of superheated gas surrounding a black hole',
      ],
      correctIndex: 2,
      explanation:
        'The event horizon is not a physical surface but a boundary of no return. If the black hole is large enough, you would feel nothing unusual crossing it. But afterward, every physical trajectory leads only toward the center.',
    },
    {
      question: 'Approximately what minimum initial stellar mass is required to form a black hole after a supernova?',
      options: [
        '~1 solar mass',
        '~8 solar masses',
        '~25 solar masses',
        '~100 solar masses',
      ],
      correctIndex: 2,
      explanation:
        'For a black hole to form, the remnant core mass must exceed ~3 solar masses (the Tolman-Oppenheimer-Volkoff limit). This corresponds to an initial stellar mass of roughly 25 M☉ or more.',
    },
    {
      question: 'What did the EHT discover about M87* in 2024?',
      options: [
        'The first measurement of M87*\'s mass',
        'A polarimetric map of the magnetic field near the base of the jet',
        'Detection of gravitational waves from M87*',
        'A second black hole at the center of M87',
      ],
      correctIndex: 1,
      explanation:
        'In 2024, the EHT published higher-resolution images of polarized light near the base of the M87* jet. The measured spiral magnetic field structure confirmed the Blandford-Znajek jet formation mechanism.',
    },
    {
      question: 'Why do supermassive black holes found at very high redshift (z > 7) challenge standard theory?',
      options: [
        'The early universe was too cold for gas to accrete',
        'General relativity forbids black holes at z > 7',
        'Standard accretion growth from stellar black holes requires more time than had elapsed',
        'JWST technically cannot observe objects at z > 7',
      ],
      correctIndex: 2,
      explanation:
        'Standard models require hundreds of millions of years of accretion even at the Eddington limit to build up billion-solar-mass black holes. JWST sees such objects in a universe only ~700 million years old, which does not fit this picture.',
    },
  ],

  sources: [
    {
      title: 'Event Horizon Telescope Collaboration — First M87 Results (Paper I)',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ab0ec7',
      meta: 'ApJL, 875, L1, 2019 (open access)',
    },
    {
      title: 'Event Horizon Telescope Collaboration — First Sagittarius A* Results (Paper I)',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ac6674',
      meta: 'ApJL, 930, L12, 2022 (open access)',
    },
    {
      title: 'EHT 2024 — Polarimetric Images of the M87 Jet Base at 86 GHz',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ad14e5',
      meta: 'ApJL, 961, L25, 2024 (open access)',
    },
    {
      title: 'Hawking S. — Black hole explosions?',
      url: 'https://www.nature.com/articles/248030a0',
      meta: 'Nature, 248, 30–31, 1974',
    },
    {
      title: 'LIGO — GW150914: First Direct Detection of Gravitational Waves',
      url: 'https://arxiv.org/abs/1602.03840',
      meta: 'PRL, 116, 061102, 2016 (open access)',
    },
    {
      title: 'JWST Early Release Science — High-z Quasars at z > 7',
      url: 'https://arxiv.org/abs/2311.04279',
      meta: 'arXiv:2311.04279, 2023 (open access)',
    },
    {
      title: 'Blandford R., Znajek R. — Electromagnetic extraction of energy from Kerr black holes',
      url: 'https://academic.oup.com/mnras/article/179/3/433/1005222',
      meta: 'MNRAS, 179, 433–456, 1977',
    },
    {
      title: 'Penington G. et al. — Entanglement wedge reconstruction and the information paradox',
      url: 'https://arxiv.org/abs/1905.08255',
      meta: 'JHEP 2022, arXiv:1905.08255',
    },
    {
      title: 'NASA — What is a Black Hole?',
      url: 'https://science.nasa.gov/astrophysics/focus-areas/black-holes/',
      meta: 'NASA Science, official page, updated 2025',
    },
    {
      title: 'EHT Collaboration — official website, all publications',
      url: 'https://eventhorizontelescope.org/',
      meta: 'open access',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
