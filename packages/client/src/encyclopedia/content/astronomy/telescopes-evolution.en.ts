import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'telescopes-evolution',
  language: 'en',
  section: 'astronomy',
  order: 6,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Evolution of Telescopes',
  subtitle: 'From Galileo\'s glass to orbital observatories and segmented mirrors — how humanity learned to see the universe.',

  hero: {
    cacheKey: 'telescopes-evolution-hero',
    prompt:
      'Photorealistic scientific illustration for a space encyclopedia: side-by-side comparison of four telescopes representing key eras — ' +
      'a small brass refractor telescope (XVII century style), a large Newtonian reflector with open tube, ' +
      'the Hubble Space Telescope in low Earth orbit against a blue-curved horizon, ' +
      'and the James Webb Space Telescope with its gold segmented mirror and sunshield unfolded in deep space. ' +
      'Hard sci-fi style, dark space background, dramatic lighting. ' +
      'Add the following text labels on the image: "Refractor", "Reflector", "HST 1990", "JWST 2021".',
    alt: 'Four eras of telescope design — from a brass refractor of the seventeenth century to the gold mirror of the James Webb Space Telescope',
    caption:
      'Four telescopes — four revolutions in how we perceive the universe. Each new generation opened wavelength ranges inaccessible to its predecessor and pushed the observational horizon billions of years deeper into the past.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'A telescope is a machine for overcoming distance — not physical distance, but informational distance. ' +
        'It gathers light that would otherwise scatter into nothing and concentrates it at a single point accessible to an eye or detector. ' +
        'The more light collected, the farther and the sharper we see. The entire history of telescope design ' +
        'is a struggle for _aperture_: for a larger diameter opening that captures photons.',

        'Over four centuries that struggle has taken several qualitative leaps. ' +
        'The refractor, which uses a lens to gather light, gave way to the reflector, which uses a concave mirror. ' +
        'Ground-based telescopes fought atmospheric blurring with adaptive optics. ' +
        'Then telescopes left the atmosphere entirely, and the air stopped setting the terms. ' +
        'Each of these steps did not simply improve the image: it opened fundamentally new physics.',
      ],
    },

    {
      heading: 'The Seventeenth Century: The Lens and the First Revolution',
      level: 2,
      paragraphs: [
        'In the seventeenth century Galileo Galilei turned a commercial optical instrument — ' +
        'a Dutch "spyglass" — toward the night sky and drew what he saw. ' +
        'These were not merely sketches: mountains on the Moon, four moons of Jupiter, the phases of Venus — ' +
        'each observation shattered the notion of a perfectly regular, unchanging celestial order.',

        'Galileo\'s _refractor_ used an objective lens to collect parallel rays and bring them to a focus. ' +
        'An eyepiece magnified the image. The problem with refractors became apparent at once: **chromatic aberration**. ' +
        'Different wavelengths refract at slightly different angles, so the image was ringed with a colored fringe. ' +
        'The larger the aperture, the worse the effect. ' +
        'This limitation haunted refractors for an entire century afterward.',

        'Even so, a modest refractor with an aperture of a few centimeters gave astronomers something no naked eye could offer: ' +
        'the resolving power to distinguish real detail. In physics this is described by the **Rayleigh criterion** — ' +
        'the minimum angular separation between two points that a telescope can still distinguish. ' +
        'It is inversely proportional to the aperture diameter: double the mirror size, halve the minimum resolvable detail.',
      ],
    },

    {
      image: {
        cacheKey: 'telescopes-evolution-refractor-diagram',
        prompt:
          'Scientific cross-section diagram of a refracting telescope (refractor): ' +
          'incoming parallel light rays entering from the left, converging through a convex objective lens to a focal point, ' +
          'then diverging and passing through a small eyepiece lens on the right. ' +
          'Tube shown in cutaway. Chromatic aberration illustrated as slight color fringing at focal point (red and blue rays separating). ' +
          'Dark background, monospace labels, Game Bible color palette (lines in #7bb8ff and #ff8844 for red/blue rays, structure in #aabbcc). ' +
          'Add the following text labels on the image: "objective lens", "focal point", "eyepiece", "chromatic aberration", "light path".',
        alt: 'Diagram of a refractor — light path through the objective lens to the eyepiece, with chromatic aberration shown',
        caption:
          'In a refractor the objective lens gathers parallel rays to a focal point. Different colors focus at slightly different distances — producing the chromatic aberration that surrounds the image with a colored fringe.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Newton and the Mirror: Birth of the Reflector',
      level: 2,
      paragraphs: [
        'Isaac Newton, also in the seventeenth century, proposed an elegant solution to chromatic aberration: ' +
        'replace the focusing lens with a concave **primary mirror**. ' +
        'A mirror reflects all wavelengths at identical angles — the colored fringe vanished. ' +
        'The design Newton demonstrated to the Royal Society in London ' +
        'became the starting point for all subsequent development of large telescopes.',

        'In a _Newtonian reflector_ parallel rays enter an open tube and reflect off the concave primary mirror ' +
        'to a small flat secondary mirror, which diverts the image out to the side where an eyepiece waits. ' +
        'This layout — with variations — underlies the vast majority of modern astronomical telescopes.',

        'In the eighteenth century William Herschel pushed the reflector concept to the limits of contemporary technology. ' +
        'His largest telescope had a **primary mirror** roughly one hundred and twenty centimeters across, ' +
        'cast from a polished metal alloy — glass mirrors of that size did not yet exist. ' +
        'With these large reflectors Herschel systematically mapped the entire accessible sky, ' +
        'discovered Uranus, and catalogued thousands of nebulae — objects whose nature remained a mystery for more than another century.',
      ],
    },

    {
      heading: 'The Nineteenth and Twentieth Centuries: Glass, Mountains, and Photography',
      level: 2,
      paragraphs: [
        'Through the nineteenth and first half of the twentieth centuries mirrors grew steadily. ' +
        'Glass blanks with a thin silver, then aluminum coating replaced metal discs. ' +
        'Observatories moved to mountaintops — where the atmosphere is thinner, drier, and more stable, ' +
        'and clear nights more frequent. Photographic plates allowed light to accumulate over long exposures, ' +
        'revealing objects far too faint for the eye alone.',

        'But the growing telescopes hit a new ceiling: **atmospheric turbulence**. ' +
        'Streams of air at different densities, ceaselessly moving above the telescope, ' +
        'distort the wavefront and smear the images of point sources into what astronomers call _seeing_. ' +
        'Even a perfectly polished mirror cannot overcome this: the atmosphere turns a star ' +
        'from a geometric point into a blurred disc.',

        'The Hale Telescope on Palomar Mountain, commissioned in the middle of the twentieth century, ' +
        'carried a five-meter mirror — a record that stood for several decades. ' +
        'Its construction demanded new techniques for casting and annealing glass, ' +
        'transporting the mirror, and building a mechanical mount that could carry its own weight. ' +
        'Each new generation of large telescopes solved engineering problems that had previously seemed insurmountable.',
      ],
    },

    {
      image: {
        cacheKey: 'telescopes-evolution-reflector-cutaway',
        prompt:
          'Scientific cutaway illustration of a large reflecting telescope (Cassegrain variant): ' +
          'incoming starlight enters the top of the open tube, hits a large concave primary mirror at the bottom, ' +
          'reflects to a small convex secondary mirror at the top, then passes through a central hole in the primary mirror to a focal instrument below. ' +
          'Telescope mounted on an equatorial fork mount on a mountain observatory platform. ' +
          'Hard sci-fi style, dark background, monospace labels, cool blue and cyan color scheme. ' +
          'Add the following text labels on the image: "primary mirror", "secondary mirror", "focal plane", "incoming light", "dome".',
        alt: 'Cutaway diagram of a large Cassegrain reflector — light path from primary to secondary mirror and into the focal plane',
        caption:
          'In a Cassegrain telescope the primary mirror reflects light to a smaller secondary, which directs the rays back through a central hole to a detector or instrument below. Most large modern telescopes use this or closely related optical layouts.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Segmented Mirrors and the End of the Monolithic Era',
      level: 2,
      paragraphs: [
        'Toward the end of the twentieth century astronomers faced a fundamental problem: ' +
        'casting, polishing, and transporting a monolithic mirror more than eight meters across ' +
        'was technically prohibitive. The answer was the **segmented mirror** concept: ' +
        'a large reflective surface assembled from dozens or hundreds of hexagonal segments, ' +
        'each about one to two meters wide, that together form a single paraboloid surface.',

        'The Keck Observatory in Hawaii, opened in the late twentieth century, first realized this approach at full scale: ' +
        'thirty-six segments forming a primary mirror ten meters across. ' +
        'To make the segments behave as a single surface, their positions are continuously adjusted by piezoelectric actuators ' +
        'to within a fraction of a micrometer. This demanded real-time control systems — ' +
        'the first serious partnership between a large telescope and computers.',

        'Today the next-generation giants follow the same logic. The **Extremely Large Telescope** ' +
        'in Chile, with first light expected around 2027, will have a primary mirror thirty-nine meters across ' +
        'assembled from roughly eight hundred segments. ' +
        'At that aperture the theoretical angular resolution surpasses the Hubble Space Telescope by a wide margin — ' +
        'assuming adaptive optics can tame the atmosphere effectively.',
      ],
    },

    {
      diagram: {
        title: 'Refractor versus Reflector: Light Paths',
        svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="320" fill="rgba(10,15,25,0.65)" rx="4"/>

  <!-- === LEFT: Refractor === -->
  <text x="170" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">Refractor</text>

  <!-- Tube outline -->
  <rect x="30" y="40" width="280" height="60" fill="none" stroke="#334455" stroke-width="1.5" rx="2"/>

  <!-- Objective lens (left) -->
  <ellipse cx="55" cy="70" rx="6" ry="28" fill="rgba(68,136,170,0.3)" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="55" y="110" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">objective</text>

  <!-- Eyepiece (right) -->
  <ellipse cx="295" cy="70" rx="5" ry="16" fill="rgba(68,136,170,0.3)" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="295" y="110" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">eyepiece</text>

  <!-- Light rays entering (3 parallel) -->
  <line x1="10" y1="50" x2="55" y2="55" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="10" y1="70" x2="55" y2="70" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="10" y1="90" x2="55" y2="85" stroke="#ffee88" stroke-width="1.2"/>
  <text x="10" y="42" fill="#ffee88" font-family="monospace" font-size="9">star</text>

  <!-- Converging rays to focal point -->
  <line x1="55" y1="55" x2="175" y2="70" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="55" y1="70" x2="175" y2="70" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="55" y1="85" x2="175" y2="70" stroke="#ffee88" stroke-width="1.2"/>

  <!-- Chromatic aberration: red ray slightly further, blue slightly closer -->
  <line x1="55" y1="52" x2="185" y2="70" stroke="#ff8844" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.7"/>
  <line x1="55" y1="88" x2="165" y2="70" stroke="#4488aa" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.7"/>

  <!-- Focal point -->
  <circle cx="175" cy="70" r="3" fill="#ff8844" opacity="0.8"/>
  <text x="175" y="118" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">focal point</text>

  <!-- Diverging rays to eyepiece -->
  <line x1="175" y1="70" x2="295" y2="58" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="175" y1="70" x2="295" y2="70" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="175" y1="70" x2="295" y2="82" stroke="#ffee88" stroke-width="1.2"/>

  <!-- Aberration label -->
  <text x="170" y="140" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">chromatic aberration</text>
  <line x1="170" y1="133" x2="175" y2="73" stroke="#ff8844" stroke-width="0.7" stroke-dasharray="2,2" opacity="0.6"/>

  <!-- === RIGHT: Reflector (Newtonian) === -->
  <text x="535" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">Reflector (Newton)</text>

  <!-- Tube outline -->
  <rect x="385" y="40" width="280" height="70" fill="none" stroke="#334455" stroke-width="1.5" rx="2"/>

  <!-- Primary concave mirror (right end) -->
  <path d="M 652 45 Q 668 75 652 105" fill="none" stroke="#44ff88" stroke-width="2.5"/>
  <text x="670" y="78" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="start">primary</text>
  <text x="670" y="90" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="start">mirror</text>

  <!-- Secondary flat mirror (angled) -->
  <line x1="475" y1="52" x2="495" y2="72" stroke="#aabbcc" stroke-width="2"/>
  <text x="480" y="46" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">secondary</text>

  <!-- Incoming parallel rays -->
  <line x1="390" y1="55" x2="652" y2="55" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="390" y1="75" x2="652" y2="75" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="390" y1="95" x2="652" y2="95" stroke="#ffee88" stroke-width="1.2"/>
  <text x="390" y="47" fill="#ffee88" font-family="monospace" font-size="9">star</text>

  <!-- Reflected rays converging toward secondary -->
  <line x1="652" y1="55" x2="485" y2="62" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="652" y1="75" x2="485" y2="62" stroke="#ffee88" stroke-width="1.2"/>
  <line x1="652" y1="95" x2="485" y2="62" stroke="#ffee88" stroke-width="1.2"/>

  <!-- Ray going down from secondary to eyepiece below tube -->
  <line x1="485" y1="62" x2="485" y2="130" stroke="#ffee88" stroke-width="1.2"/>
  <text x="485" y="148" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">eyepiece / detector</text>

  <!-- No aberration label -->
  <text x="535" y="160" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">no chromatic aberration</text>

  <!-- Divider -->
  <line x1="350" y1="20" x2="350" y2="170" stroke="#334455" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>

  <!-- Bottom: Resolution vs aperture -->
  <text x="350" y="220" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Resolution = 1.22 × wavelength / aperture</text>
  <text x="350" y="238" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Larger aperture → smaller minimum angle → finer detail</text>

  <!-- Aperture visual comparison -->
  <circle cx="220" cy="285" r="18" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="220" y="289" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">small</text>

  <circle cx="350" cy="280" r="28" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="350" y="284" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">medium</text>

  <circle cx="510" cy="275" r="38" fill="none" stroke="#44ff88" stroke-width="1.8"/>
  <text x="510" y="279" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">large</text>

  <text x="220" y="312" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">low resolution</text>
  <text x="510" y="317" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">high resolution</text>
</svg>`,
        caption:
          'Left — a refractor: the objective lens gathers light to a focus, but different colors focus at different distances (chromatic aberration). Right — a Newtonian reflector: the mirror reflects all colors equally, so no aberration occurs. Bottom — the relationship between aperture size and angular resolution.',
      },
    },

    {
      heading: 'Adaptive Optics: Fighting the Atmosphere',
      level: 2,
      paragraphs: [
        'Toward the end of the twentieth century and into the twenty-first, ground-based telescopes gained a tool ' +
        'that allowed them to nearly overcome atmospheric turbulence without going to space: ' +
        '**adaptive optics**. The idea is straightforward: measure wavefront distortions in real time ' +
        'and correct the shape of a flexible deformable mirror hundreds of times per second — ' +
        'compensating for whatever the atmosphere has done.',

        'To measure the distortions the system needs a bright _guide star_ near the target. ' +
        'When no suitable natural star exists, a laser fires into the upper atmosphere and creates ' +
        'an artificial _laser guide star_ — a fluorescent spot of sodium atoms roughly ninety kilometers up. ' +
        'The system reads how the atmosphere distorts this known source and drives the deformable mirror accordingly.',

        'The results are dramatic: telescopes eight to ten meters across equipped with adaptive optics ' +
        'achieve angular resolution comparable to or even better than the Hubble Space Telescope ' +
        'in the infrared — at much larger aperture. ' +
        'This enabled the direct tracking of stellar orbits around the black hole at the center of our Galaxy ' +
        'and the first resolved images of the surfaces of massive giant stars.',
      ],
    },

    {
      image: {
        cacheKey: 'telescopes-evolution-adaptive-optics',
        prompt:
          'Scientific illustration of adaptive optics system on a large telescope: ' +
          'cutaway view showing a bright laser beam shooting up from a telescope dome into the night sky, ' +
          'creating an artificial laser guide star glowing orange-yellow high in the atmosphere. ' +
          'Inside the telescope, wavefront sensor and deformable mirror are shown schematically with arrows indicating correction loop. ' +
          'Comparison panels: left shows blurry star without AO, right shows sharp star with AO active. ' +
          'Hard sci-fi style, dark background, monospace labels, cyan and green accents. ' +
          'Add the following text labels on the image: "laser guide star", "deformable mirror", "wavefront sensor", "without AO", "with AO".',
        alt: 'Adaptive optics system — laser guide star, deformable mirror and image quality comparison before and after correction',
        caption:
          'An adaptive optics system corrects atmospheric distortions hundreds of times per second. The artificial laser guide star allows the system to measure those distortions even when no sufficiently bright natural star exists near the target.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Hubble Space Telescope: The First Orbital Revolution',
      level: 2,
      paragraphs: [
        'In 1990 the Hubble Space Telescope was placed into low Earth orbit — ' +
        'a reflector with a primary mirror two and a quarter meters across. ' +
        'Above the atmosphere even that modest aperture produced images of unprecedented sharpness: ' +
        'no turbulence, no ultraviolet absorption, no light pollution from the ground.',

        'The first images revealed a problem: the **primary mirror** had been polished to the wrong shape — ' +
        'a microscopic error called spherical aberration robbed the telescope of its potential. ' +
        'In 1993 astronauts carried out a servicing mission and installed corrective optics ' +
        'that compensated for the flaw. After the repair Hubble delivered what had been promised.',

        'The deep field images — patches of sky the size of a pinhead held at arm\'s length, ' +
        'each containing thousands of galaxies — transformed understanding of the scale and age of the universe. ' +
        'Hubble measured the Hubble constant, probed exoplanet atmospheres, ' +
        'captured a comet striking Jupiter, and helped discover the accelerating expansion of the universe ' +
        'attributed to dark energy. ' +
        'Over three decades of operation it remains one of the most productive scientific instruments ever built.',
      ],
    },

    {
      heading: 'The James Webb Space Telescope: An Infrared Future',
      level: 2,
      paragraphs: [
        'In 2021 the James Webb Space Telescope was launched — ' +
        'Hubble\'s successor with a fundamentally different design philosophy. ' +
        'Its **primary mirror**, six and a half meters across, consists of eighteen segments ' +
        'of gold-coated beryllium — lightweight and stable at cryogenic temperatures. ' +
        'The telescope sits not in low Earth orbit but at the second Lagrange point ' +
        'of the Earth-Sun system, roughly one and a half million kilometers from Earth.',

        'Webb is optimized for the _infrared_ range: from near-infrared to mid-infrared. ' +
        'This opens three fundamental capabilities. First, infrared light penetrates dust clouds ' +
        'where stars and planets are forming. Second, because of _redshift_, ' +
        'the ultraviolet and visible light of the most distant galaxies arrives at us in the infrared. ' +
        'Third, planetary atmospheres and interstellar chemistry leave characteristic spectral fingerprints ' +
        'in the infrared.',

        'Webb\'s first science images showed that galaxies existing a few hundred million years after the Big Bang ' +
        'are more massive and more structured than models predicted. ' +
        'This does not invalidate the standard cosmological model, but it demands revisions to the details. ' +
        'Webb has also detected carbon dioxide molecules in the atmospheres of exoplanets — ' +
        'the first direct spectroscopic signature of an atmosphere in another planetary system.',
      ],
    },

    {
      image: {
        cacheKey: 'telescopes-evolution-jwst-mirror',
        prompt:
          'Photorealistic scientific illustration of the James Webb Space Telescope in deep space: ' +
          'eighteen gold hexagonal mirror segments forming the primary mirror visible from the front-side, ' +
          'the large five-layer silver sunshield stretched below the telescope like a kite, ' +
          'deep black space background with faint star field, Earth barely visible far in the distance as a small blue crescent. ' +
          'Hard sci-fi style, technically accurate, dramatic lighting on the gold mirror surfaces. ' +
          'Add the following text labels on the image: "primary mirror 6.5 m", "gold-coated beryllium", "sunshield", "L2 orbit".',
        alt: 'James Webb Space Telescope — eighteen gold hexagonal segments and deployed sunshield in deep space',
        caption:
          'The primary mirror of the James Webb Space Telescope consists of eighteen hexagonal beryllium segments coated with a thin layer of gold, which optimally reflects infrared light. The sunshield — roughly the size of a tennis court — keeps the mirror at cryogenic temperatures.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Interferometry: Synthesizing a Giant Aperture',
      level: 2,
      paragraphs: [
        'There is another path to higher resolution that does not require building one enormous mirror: ' +
        '**interferometry**. If two or more telescopes are placed at a distance from each other ' +
        'and observe the same target simultaneously, their signals can under certain conditions be combined ' +
        'as though they form a single telescope whose aperture equals the separation between them.',

        'Optical _interferometry_ requires phase-accurate signal combination at the level of a wavelength — ' +
        'a problem solved through the late twentieth and early twenty-first centuries. ' +
        'The Very Large Telescope Interferometer in Chile links several four-to-eight-meter telescopes ' +
        'and achieves angular resolution sufficient to directly measure stellar diameters ' +
        'and the separations of binary star components.',

        'In the radio domain interferometry went further still: _very long baseline interferometry_ ' +
        'links telescopes on different continents, turning Earth itself into a dish almost as wide as the planet. ' +
        'This technology allowed the Event Horizon Telescope network to obtain the first image ' +
        'of the shadow of the supermassive black hole at the center of galaxy M87 in 2019 ' +
        'and later the shadow at the center of our own Galaxy.',
      ],
    },

    {
      image: {
        cacheKey: 'telescopes-evolution-interferometry',
        prompt:
          'Scientific illustration of optical interferometry: two large telescope domes on a mountain plateau separated by distance, ' +
          'light paths from a distant star shown as parallel rays entering both telescopes, ' +
          'then guided by delay lines (long underground tunnels with mirrors) to a central beam combiner building, ' +
          'interference fringes shown at the combining point as colorful wave patterns. ' +
          'Hard sci-fi style, dark evening sky, monospace labels, cyan and amber color accents. ' +
          'Add the following text labels on the image: "telescope 1", "telescope 2", "delay line", "beam combiner", "interference fringes", "baseline".',
        alt: 'Principle of optical interferometry — two telescopes combine signals via delay lines to a central beam combiner',
        caption:
          'In an optical interferometer the signals from two or more telescopes are combined after passing through delay lines. Together they simulate the resolving power of a telescope whose aperture equals the separation between the outermost instruments.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'From Photon to Discovery: What Comes Next',
      level: 2,
      paragraphs: [
        'The telescopes described here are not the final word. The Extremely Large Telescope in Chile, ' +
        'the Thirty Meter Telescope in Hawaii, and the Giant Magellan Telescope — ' +
        'three competing projects that will define ground-based astronomy for the coming decades — ' +
        'will carry primary mirrors from thirty to nearly forty meters. ' +
        'Combined with advanced adaptive optics, they are expected to perform direct spectroscopy ' +
        'of exoplanet atmospheres in the habitable zone.',

        'In space, concepts are under study for telescopes with apertures exceeding ten meters ' +
        'in the ultraviolet and visible range — successors to both Hubble and Webb. ' +
        'In parallel, X-ray, gamma-ray, and gravitational-wave observatories are advancing, ' +
        'detecting signals that a glass or metal mirror cannot in principle capture.',

        'Every new generation of telescopes has answered questions that the previous generation could not even formulate. ' +
        'Galileo could not have imagined that anyone would want to measure the chemical composition of the atmosphere ' +
        'of a planet hundreds of light-years away. The builders of Hubble did not know their instrument ' +
        'would discover an accelerating universe. ' +
        'Telescopes do not merely answer questions — they generate new ones.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Aperture',
      definition:
        'The diameter of a telescope\'s light-collecting element — lens or mirror. A larger aperture gathers more photons and achieves finer angular resolution. It is the single most important parameter of any telescope.',
    },
    {
      term: 'Primary mirror',
      definition:
        'The main, largest mirror of a reflecting telescope, which collects and focuses incoming light. Its diameter defines the telescope\'s aperture.',
    },
    {
      term: 'Focal length',
      definition:
        'The distance from a lens or mirror to the point where parallel rays converge to a focus. The ratio of focal length to aperture (the focal ratio) determines the field of view and image scale.',
    },
    {
      term: 'Chromatic aberration',
      definition:
        'A defect of lens-based telescopes: different wavelengths (colors) refract at slightly different angles and focus at different distances, producing a colored fringe around the image. Mirrors are free of this defect.',
    },
    {
      term: 'Rayleigh criterion',
      definition:
        'A measure of telescopic resolving power: the minimum angular separation between two point sources that the telescope can distinguish. It depends on wavelength and aperture diameter — smaller angle means finer detail.',
    },
    {
      term: 'Atmospheric seeing',
      definition:
        'The blurring of images caused by turbulent air of varying density above the telescope. Even an optically perfect ground-based telescope cannot overcome seeing without correction systems. Measured in arc seconds.',
    },
    {
      term: 'Adaptive optics',
      definition:
        'Technology for compensating atmospheric turbulence in real time: a wavefront sensor measures distortions and a deformable mirror corrects them hundreds of times per second.',
    },
    {
      term: 'Segmented mirror',
      definition:
        'A primary mirror assembled from dozens or hundreds of smaller hexagonal segments that together form a single optical surface. Allows mirrors to be built at sizes impossible to achieve as a single monolithic piece.',
    },
    {
      term: 'Interferometer',
      definition:
        'A system of two or more telescopes that observe the same target and combine their signals to achieve resolving power equivalent to a telescope whose aperture equals the separation between the instruments.',
    },
    {
      term: 'Redshift',
      definition:
        'The shift of a source\'s spectrum toward longer wavelengths due to the expansion of the universe or the motion of the source away from the observer. The farther a galaxy, the greater its redshift, and the more its visible and ultraviolet light is shifted into the infrared.',
    },
  ],

  quiz: [
    {
      question: 'Why did reflecting telescopes displace refractors in large professional observatories?',
      options: [
        'Reflectors are cheaper to produce from any material',
        'Mirrors have no chromatic aberration and can be made much larger',
        'Refractors absorb ultraviolet radiation',
        'Reflectors are lighter and easier to transport',
      ],
      correctIndex: 1,
      explanation:
        'A mirror reflects all wavelengths at the same angle, so it is free of the chromatic aberration inherent to lenses. In addition, casting and supporting a large mirror is technically far simpler than grinding a glass lens of equivalent size — which is why all major modern observatories use reflectors.',
    },
    {
      question: 'What is the primary advantage of placing a telescope in space compared to a ground-based instrument?',
      options: [
        'Space provides more room for larger mirrors',
        'The telescope requires no electrical power',
        'The absence of atmosphere eliminates turbulence, absorption, and sky background glow',
        'Space telescopes always have larger apertures',
      ],
      correctIndex: 2,
      explanation:
        'The key advantage of orbit is the absence of atmosphere, which distorts, absorbs, and illuminates images. Even the Hubble Space Telescope with its two-and-a-quarter-meter mirror delivered image quality that far larger ground-based telescopes could not match before adaptive optics. This is why a smaller-aperture space telescope can outperform a much larger ground instrument.',
    },
    {
      question: 'What does an adaptive optics system measure in order to correct atmospheric distortion?',
      options: [
        'The temperature of the telescope\'s outer mirror',
        'The wavefront from a guide star or an artificial laser guide star',
        'The positions of stars across the sky during the night',
        'The level of light pollution from nearby towns',
      ],
      correctIndex: 1,
      explanation:
        'An adaptive optics system uses a wavefront sensor that analyzes the shape of the wavefront from a bright guide star or from an artificial laser guide star. Deviations from an ideal flat wavefront correspond to atmospheric distortions; the deformable mirror compensates for them in real time.',
    },
    {
      question: 'Why is the James Webb Space Telescope optimized for infrared rather than visible light?',
      options: [
        'Infrared detectors are cheaper than optical ones',
        'Visible light is absorbed by the gold mirror coating',
        'Due to redshift, light from the most distant galaxies arrives in the infrared, and infrared light penetrates dust clouds',
        'Earth\'s atmosphere blocks only infrared radiation',
      ],
      correctIndex: 2,
      explanation:
        'Two key reasons: first, the most distant galaxies have large redshifts, so their ultraviolet and visible emission shifts into the infrared — Webb observes the early universe precisely in this range. Second, infrared light is absorbed less by the dust clouds where stars and planets form, allowing Webb to see through otherwise opaque regions.',
    },
    {
      question: 'How does an interferometer achieve angular resolution far beyond a single telescope?',
      options: [
        'It uses more detectors and integrates signal for longer',
        'It combines signals from multiple telescopes as if they formed one telescope as wide as their separation',
        'It removes atmospheric turbulence using lasers',
        'It observes in the ultraviolet where wavelengths are shorter',
      ],
      correctIndex: 1,
      explanation:
        'Angular resolution is set by the ratio of wavelength to aperture. An interferometer combines signals from separate telescopes so that the effective aperture of the system equals the separation between the outermost instruments, not the size of each individual mirror. This is exactly how the Event Horizon Telescope network obtained the first image of a black hole shadow.',
    },
  ],

  sources: [
    {
      title: 'ESA — Hubble Space Telescope overview',
      url: 'https://esahubble.org/about/',
      meta: 'ESA / NASA Hubble Site, official page',
    },
    {
      title: 'NASA — James Webb Space Telescope',
      url: 'https://www.nasa.gov/mission/webb/',
      meta: 'NASA Science Mission Directorate, updated 2024',
    },
    {
      title: 'ESO — The Very Large Telescope (VLT)',
      url: 'https://www.eso.org/public/teles-instr/paranal-observatory/vlt/',
      meta: 'European Southern Observatory, official page',
    },
    {
      title: 'ESO — Extremely Large Telescope (ELT)',
      url: 'https://www.eso.org/public/teles-instr/elt/',
      meta: 'European Southern Observatory, updated 2025',
    },
    {
      title: 'W. M. Keck Observatory — The Keck Telescopes',
      url: 'https://www.keckobservatory.org/about/telescopes/',
      meta: 'Keck Observatory, official page',
    },
    {
      title: 'Event Horizon Telescope — First M87 Black Hole Image',
      url: 'https://eventhorizontelescope.org/press-release-april-10-2019',
      meta: 'EHT Collaboration press release, 2019',
    },
    {
      title: 'Hardy J.W. — Adaptive Optics for Astronomical Telescopes',
      url: 'https://global.oup.com/academic/product/adaptive-optics-for-astronomical-telescopes-9780195090192',
      meta: 'Oxford University Press, 1998 — foundational textbook',
    },
    {
      title: 'Chromey F.R. — To Measure the Sky: An Introduction to Observational Astronomy (2nd ed.)',
      url: 'https://www.cambridge.org/core/books/to-measure-the-sky/0E56DB5F4F61B0F1A3D5B6A28D5AF9B6',
      meta: 'Cambridge University Press, 2016',
    },
    {
      title: 'JWST First Science Results — Gardner et al. 2023, PASP',
      url: 'https://iopscience.iop.org/article/10.1088/1538-3873/ac8ba4',
      meta: 'Publications of the Astronomical Society of the Pacific, 2022 — open access',
    },
    {
      title: 'NASA — Hubble\'s Mirror Flaw and Corrective Optics (COSTAR)',
      url: 'https://hubblesite.org/mission-and-telescope/servicing-missions/sm1',
      meta: 'HubbleSite, NASA servicing mission archive',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
