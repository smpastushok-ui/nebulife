import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'interstellar-objects',
  language: 'en',
  section: 'planetology',
  order: 11,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Interstellar Objects',
  subtitle: 'Visitors from other star systems passing through our own — and what they tell us.',

  hero: {
    cacheKey: 'interstellar-objects-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: an elongated, tumbling rocky object flying through the inner Solar System, ' +
      'reddish-brown cigar-shaped body with no visible coma or tail, ' +
      'Sun visible as a bright star in the distance, Jupiter and Saturn orbital paths shown as faint arcs, ' +
      'dark space background with the Milky Way band, hard sci-fi style, cinematic composition. ' +
      'Add the following text labels on the image: "1I/\'Oumuamua", "Sun", "Hyperbolic trajectory".',
    alt: 'Elongated dark-brown body of \'Oumuamua flying through the inner Solar System on a hyperbolic trajectory',
    caption: 'The first known interstellar object, 1I/\'Oumuamua, passed through the Solar System in the autumn of 2017. Its shape, lack of coma, and anomalous acceleration remain subjects of ongoing scientific debate.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The Solar System is not isolated. The Sun\'s gravity extends far beyond the orbits of the planets, ' +
        'but beyond the Oort Cloud, space is open and crossed by the trajectories of objects ' +
        'born in other star systems. ' +
        'For most of human history, we had no idea whether such travelers ever passed through — ' +
        'they are simply too faint to catch. ' +
        'Then, in the autumn of 2017, one finally appeared in a telescope\'s field of view.',

        'Since then, astronomy has gained a new category of objects and an entire new set of questions. ' +
        'Where do they come from? What do they reveal about planetary systems around other stars? ' +
        'And can we ever intercept the next visitor before it disappears back into the dark?',
      ],
    },

    {
      heading: 'Hyperbolic Trajectory: The Language of Gravity',
      level: 2,
      paragraphs: [
        'Almost every body in the Solar System — planets, asteroids, comets — travels along an **_elliptical orbit_**: ' +
        'a closed curve held in place by the Sun\'s gravity. ' +
        'Objects arriving from outside behave entirely differently: they follow a **_hyperbolic trajectory_** — ' +
        'an open curve that comes in from infinity and returns to infinity.',

        'The key mathematical property is **_eccentricity_**. ' +
        'A perfect circle has eccentricity zero; ordinary comets arriving from the Oort Cloud ' +
        'can have eccentricities approaching one, but always remaining below it. ' +
        'If the eccentricity exceeds one, the body cannot possibly be gravitationally bound to the Sun. ' +
        'It came from outside and it will depart. ' +
        'The eccentricity of \'Oumuamua was approximately 1.2 — far beyond any measurement error.',

        'A second marker is velocity relative to the Sun. ' +
        'Everything born in our system moves within a velocity range set by the conditions of its formation. ' +
        'An interstellar object arrives carrying the velocity of its home star environment ' +
        'added to its own motion relative to the Sun. ' +
        '\'Oumuamua entered the Solar System at roughly 26 kilometers per second relative to the Sun — ' +
        'and that was only its speed at infinity, before it had been accelerated inward by solar gravity.',
      ],
    },

    {
      image: {
        cacheKey: 'oumuamua-trajectory-solar-system',
        prompt:
          'Photorealistic illustration for a science encyclopedia: top-down view of the Solar System orbital plane, ' +
          'showing the hyperbolic trajectory of 1I/\'Oumuamua as a bright curved path passing close to the Sun, ' +
          'orbital paths of Mercury, Venus, Earth, Mars shown as faint blue ellipses, ' +
          'the trajectory enters from upper right and exits lower left, ' +
          'dark space background, hard sci-fi style, scientific accuracy. ' +
          'Add the following text labels on the image: "1I/\'Oumuamua path", "Earth orbit", "Closest approach (Sep 2017)", "Exit trajectory".',
        alt: 'Top-down view of \'Oumuamua\'s trajectory through the Solar System — a hyperbolic path curving around the Sun',
        caption: '\'Oumuamua\'s trajectory: the object arrived from the direction of the constellation Lyra, swung around the Sun in September 2017, and departed rapidly toward the constellation Pegasus.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: '1I/\'Oumuamua: A Strange Visitor',
      level: 2,
      paragraphs: [
        'In October 2017, astronomer Robert Weryk of the University of Hawaii spotted an object ' +
        'in data from the Pan-STARRS telescope. ' +
        'The trajectory immediately identified it as a foreigner: a hyperbolic path that fit no known orbit in the Solar System. ' +
        'The object was named 1I/\'Oumuamua — in Hawaiian, roughly "first messenger from afar."',

        'What could be determined was astonishing. ' +
        'First, the shape. Light-curve data showing brightness varying more than tenfold ' +
        'suggested an elongated body roughly 400 meters long and up to 40 meters wide — ' +
        'resembling a cigar or even a flat rotating disk. ' +
        'No known body in the Solar System has such proportions. ' +
        'Second, the surface: a reddish-brown color consistent with organic or iron-bearing compounds ' +
        'processed by cosmic radiation over enormous timescales.',

        'Third — and most baffling — there was an **_anomalous acceleration_**. ' +
        'As \'Oumuamua flew away from the Sun, it accelerated more strongly than gravity alone could explain. ' +
        'In comets this happens: vaporizing gases and ices produce a small rocket-like push, ' +
        'a process known as **_outgassing_**. ' +
        'But \'Oumuamua showed no **_coma_** — the cloud of gas and dust around an active comet nucleus — ' +
        'and no visible tail. ' +
        'Observations with the Spitzer Space Telescope placed strict upper limits on any dust activity: ' +
        'it was below the detection threshold.',
      ],
    },

    {
      heading: 'The Debate: What Explains the Acceleration',
      level: 3,
      paragraphs: [
        'Anomalous acceleration without detectable outgassing generated several competing hypotheses. ' +
        'The most conservative is **_radiation pressure_**. ' +
        'Solar photons do exert a small force on surfaces. ' +
        'To explain \'Oumuamua\'s observed acceleration this way, ' +
        'the object would need an extraordinarily low mass relative to its cross-sectional area — ' +
        'something like a thin sheet less than a millimeter thick and hundreds of square meters in area. ' +
        'This resembles a solar sail, which is where the hypothesis proposed by astronomer Avi Loeb entered.',

        'In 2018, Loeb and Shmuel Bialy published a preprint suggesting ' +
        'that \'Oumuamua might be an artificial solar sail of extraterrestrial origin. ' +
        'The hypothesis received wide media attention and sparked sharp scientific debate. ' +
        'Critics pointed out that the hypothesis does not require fewer additional assumptions than natural alternatives, ' +
        'that no sign of artificiality was detected beyond the unexplained acceleration, ' +
        'and that ruling out natural explanations is not evidence for an artificial one. ' +
        'The scientific community treats Loeb\'s hypothesis as fringe — ' +
        'not definitively refuted, but unsupported by evidence.',

        'The alternative favored by most researchers involves a **_hydrogen or nitrogen ice fragment_**. ' +
        'If \'Oumuamua consisted primarily of frozen hydrogen or molecular nitrogen, ' +
        'it could have vaporized rapidly under solar heating — ' +
        'explaining the acceleration through a gaseous rocket effect ' +
        'while producing no visible dust coma (because pure gas creates no dust). ' +
        'Nitrogen ice is a common material on large icy bodies such as Pluto and Triton — ' +
        'and the Oort Cloud analogs of other systems would contain such material in abundance. ' +
        'This hypothesis also has weaknesses — chiefly the difficulty of preserving such a fragile body ' +
        'through billions of years of interstellar travel — but it remains scientifically more productive.',
      ],
    },

    {
      diagram: {
        title: 'Eccentricity Comparison: Solar System Objects versus Interstellar Visitors',
        svg: `<svg viewBox="0 0 580 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="580" height="340" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Axis -->
  <line x1="60" y1="290" x2="540" y2="290" stroke="#334455" stroke-width="1.2"/>
  <line x1="60" y1="290" x2="60" y2="30" stroke="#334455" stroke-width="1.2"/>
  <text x="290" y="320" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">Orbital eccentricity</text>
  <text x="15" y="170" fill="#667788" font-family="monospace" font-size="9" transform="rotate(-90,15,170)">Object type</text>

  <!-- Scale labels on X axis -->
  <text x="60" y="305" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">0</text>
  <text x="156" y="305" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">0.4</text>
  <text x="252" y="305" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">0.8</text>
  <text x="300" y="305" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">1.0</text>
  <text x="396" y="305" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">1.4</text>
  <text x="492" y="305" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">1.8</text>
  <!-- e=1 vertical dashed line -->
  <line x1="300" y1="290" x2="300" y2="30" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
  <text x="304" y="44" fill="#cc4444" font-family="monospace" font-size="9">e = 1</text>
  <text x="304" y="56" fill="#cc4444" font-family="monospace" font-size="9">(boundary)</text>

  <!-- Row: Planets (near circular) -->
  <text x="56" y="88" text-anchor="end" fill="#aabbcc" font-family="monospace" font-size="10">Planets</text>
  <rect x="62" y="76" width="14" height="14" rx="2" fill="#44ff88" opacity="0.85"/>
  <text x="82" y="88" fill="#8899aa" font-family="monospace" font-size="9">Earth e≈0.017, Mars e≈0.093</text>

  <!-- Row: Short-period comets -->
  <text x="56" y="138" text-anchor="end" fill="#aabbcc" font-family="monospace" font-size="10">Short-period comets</text>
  <rect x="62" y="126" width="80" height="14" rx="2" fill="#7bb8ff" opacity="0.65"/>
  <text x="148" y="138" fill="#8899aa" font-family="monospace" font-size="9">e = 0.05 – 0.99</text>

  <!-- Row: Long-period comets -->
  <text x="56" y="188" text-anchor="end" fill="#aabbcc" font-family="monospace" font-size="10">Long-period comets</text>
  <rect x="62" y="176" width="226" height="14" rx="2" fill="#ff8844" opacity="0.55"/>
  <text x="294" y="188" fill="#8899aa" font-family="monospace" font-size="9">e → 1⁻</text>

  <!-- Row: Oumuamua -->
  <text x="56" y="238" text-anchor="end" fill="#cc4444" font-family="monospace" font-size="10">1I/'Oumuamua</text>
  <rect x="300" y="226" width="57" height="14" rx="2" fill="#cc4444" opacity="0.85"/>
  <text x="362" y="238" fill="#cc4444" font-family="monospace" font-size="9">e ≈ 1.20</text>

  <!-- Row: Borisov -->
  <text x="56" y="275" text-anchor="end" fill="#7bb8ff" font-family="monospace" font-size="10">2I/Borisov</text>
  <rect x="300" y="263" width="144" height="14" rx="2" fill="#7bb8ff" opacity="0.75"/>
  <text x="449" y="275" fill="#7bb8ff" font-family="monospace" font-size="9">e ≈ 3.36</text>

  <text x="290" y="18" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Eccentricity above 1 means an orbit unbound from the Sun — a hyperbolic trajectory.</text>
</svg>`,
        caption: 'Eccentricity defines the type of orbit. Values below one are closed ellipses that remain in the Solar System. Values above one are hyperbolas: the body arrived from outside and will depart.',
      },
    },

    {
      heading: '2I/Borisov: The First True Interstellar Comet',
      level: 2,
      paragraphs: [
        'In August 2019, amateur astronomer Gennady Borisov of Crimea discovered a comet ' +
        'using a telescope he had built himself. ' +
        'Preliminary orbital calculations returned an eccentricity of approximately 3.36 — ' +
        'an unambiguously interstellar trajectory. ' +
        'Unlike \'Oumuamua, 2I/Borisov was a classical active comet: ' +
        'with a cobalt-blue coma, a dust tail, and a spectrum that revealed its chemical composition.',

        'Spectroscopy detected carbon monoxide in unusually large amounts — ' +
        'two to three times more than in typical comets from our own Solar System. ' +
        'This points either to an origin in the cold outer reaches of another planetary system, ' +
        'or to a parent star that is cooler or older than the Sun. ' +
        'Overall, Borisov\'s chemistry proved surprisingly similar to our own comets — ' +
        'which is itself a finding: organics and water are common building blocks ' +
        'in planetary systems around different kinds of stars.',

        'Borisov offered an invaluable observational opportunity — ' +
        'it approached less abruptly and did not disappear as quickly as \'Oumuamua had. ' +
        'The Hubble Space Telescope and the ALMA observatory tracked it from discovery ' +
        'until it became too faint for detailed study. ' +
        'During its perihelion passage in December 2019, the nucleus did not break apart — ' +
        'suggesting a monolithic body rather than a loosely bound rubble pile.',
      ],
    },

    {
      image: {
        cacheKey: 'borisov-comet-hubble',
        prompt:
          'Photorealistic illustration for a science encyclopedia: interstellar comet 2I/Borisov photographed by Hubble Space Telescope, ' +
          'bright blue-white coma surrounding a small nucleus, dust tail extending to the right, ' +
          'rich star field background with background galaxies, deep space, scientific accuracy, astrophotography style. ' +
          'Add the following text labels on the image: "2I/Borisov", "Coma", "Dust tail", "Background galaxies".',
        alt: 'Interstellar comet 2I/Borisov with a blue-white coma and dust tail against a rich star field',
        caption: 'Hubble Space Telescope image of 2I/Borisov in December 2019. Unlike \'Oumuamua, Borisov is a classical active comet — complete with a gas coma, dust tail, and detailed spectroscopic analysis.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Where They Come From: Ejection During Planet Formation',
      level: 2,
      paragraphs: [
        'The standard model of planetary system formation implies that the process is highly wasteful. ' +
        'Most material in a protoplanetary disk does not end up as a planet, an asteroid, or a retained comet: ' +
        'it is thrown outward by gravitational interactions with the young giant planets. ' +
        'Our own Solar System went through this phase billions of years ago — ' +
        'the young Jupiter and Saturn scattered billions of bodies in all directions, ' +
        'most of which sailed past the outer edge of the system and joined the interstellar medium.',

        'Theoretical models long predicted that such ejected objects must be extraordinarily numerous in the galaxy — ' +
        'perhaps ten thousand to a billion per cubic parsec. ' +
        'The detection of \'Oumuamua in 2017 confirmed that interstellar objects exist and occasionally visit us. ' +
        'The number detected so far is too small to rigorously test these models, ' +
        'but the next generation of survey telescopes will change that.',

        'The chemical information carried by such bodies is invaluable. ' +
        'Each system ejects material from its own "construction site." ' +
        'If a future interstellar visitor turns out to be icy like Borisov ' +
        'but with a chemistry radically unlike our own comets, ' +
        'that will suggest that planetary systems form differently even around similar stars.',
      ],
    },

    {
      image: {
        cacheKey: 'interstellar-ejection-process',
        prompt:
          'Photorealistic illustration for a science encyclopedia: cutaway diagram of a young star system, ' +
          'protoplanetary disk around a yellow star, two large gas giant planets shown in their orbits, ' +
          'multiple small icy bodies and rocky fragments being gravitationally slung outward from the disk edge, ' +
          'trajectory arrows showing ejection paths into interstellar space, ' +
          'dark space background, hard sci-fi style. ' +
          'Add the following text labels on the image: "Protoplanetary disk", "Gas giant", "Ejected planetesimals", "Interstellar space".',
        alt: 'Diagram: a young planetary system ejecting small bodies into interstellar space through gravitational interactions with gas giants',
        caption: 'During planetary system formation, most small bodies are gravitationally ejected by giant planets. These "by-products of construction" then travel the galaxy — with a tiny fraction eventually passing through other star systems.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Vera Rubin Observatory: A Detector for Interstellar Visitors',
      level: 2,
      paragraphs: [
        'The Vera C. Rubin Observatory in Chile is one of the most anticipated telescope projects of the decade. ' +
        'It is designed for continuous sky mapping: every few nights, the full accessible sky ' +
        'will be scanned for new and moving objects. ' +
        'Unlike Pan-STARRS, which caught \'Oumuamua almost by accident, ' +
        'Rubin is engineered precisely for this kind of systematic survey.',

        'Theoretical estimates made after the detection of both known interstellar objects ' +
        'suggest that Rubin may detect between one and ten interstellar visitors per year. ' +
        'Key advantages include detection at greater distances from the Sun — ' +
        'when there is still time for extended observation — ' +
        'and richer brightness history data, enabling better determination of shape and rotation. ' +
        'If those predictions hold, the second half of the 2020s should deliver statistics ' +
        'rather than two isolated examples.',

        'A larger detection sample will resolve one of the central open questions: ' +
        'whether \'Oumuamua is an anomaly or a common phenomenon. ' +
        'If most interstellar objects prove comet-like, as Borisov was, ' +
        'and \'Oumuamua turns out to be a rare outlier with unusual shape and composition, ' +
        'that will reduce pressure for exotic explanations. ' +
        'If many objects behave like \'Oumuamua, the questions will only sharpen.',
      ],
    },

    {
      heading: 'Comet Interceptor: Waiting for the Next Visitor',
      level: 2,
      paragraphs: [
        'Both known interstellar objects were discovered only after their closest approach to the Sun — ' +
        'already on their way out. ' +
        'There was no time to prepare and launch a mission. ' +
        'This problem directly motivated the Comet Interceptor mission, ' +
        'approved by the European Space Agency for launch around 2029.',

        'The concept is unconventional: rather than designing a mission to a specific target, ' +
        'the spacecraft will launch and park at the L2 Lagrange point — ' +
        'a stable position 1.5 million kilometers from Earth — ' +
        'and wait. ' +
        'When a suitable long-period comet or interstellar object is discovered on an accessible trajectory, ' +
        'the mission will be redirected toward it. ' +
        'The spacecraft carries multiple probes: a main platform and two smaller sub-probes ' +
        'that will make flybys from different angles and send back multi-perspective imagery.',

        'Comet Interceptor does not guarantee an encounter with an interstellar visitor — ' +
        'the target may well turn out to be an ordinary Oort Cloud comet. ' +
        'But if the Vera Rubin Observatory detects a suitable object early enough, ' +
        'humanity will have its first chance to send a spacecraft toward a star-born traveler ' +
        'and receive close-up images and direct chemical analysis.',
      ],
    },

    {
      image: {
        cacheKey: 'comet-interceptor-spacecraft',
        prompt:
          'Photorealistic illustration for a science encyclopedia: ESA Comet Interceptor mission concept, ' +
          'main spacecraft with solar panels deployed at L2 Lagrange point, ' +
          'two smaller sub-probes shown separating toward an approaching comet or elongated interstellar object, ' +
          'Earth visible as a small blue disk far in background, dark space, scientific render style. ' +
          'Add the following text labels on the image: "Comet Interceptor (ESA)", "Sub-probe A", "Sub-probe B", "Target object".',
        alt: 'Comet Interceptor mission: main spacecraft and two sub-probes approaching a comet or interstellar object',
        caption: 'The Comet Interceptor concept: the spacecraft will wait at the L2 Lagrange point until a suitable target is identified — a long-period comet, or, if fortunate, a genuine interstellar visitor.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Why So Few Are Found: The Detection Problem',
      level: 2,
      paragraphs: [
        'Despite theoretical predictions of billions of interstellar objects in the galaxy, ' +
        'only two are currently known. ' +
        'The reason is not rarity — it is the narrowness of the observational window. ' +
        'Interstellar bodies move very fast relative to the Sun, ' +
        'and they are bright enough to detect only when close to both the Sun and Earth. ' +
        'But at that point they are already rushing away, and the window for observation is measured in weeks.',

        '\'Oumuamua was already past perihelion when it was found — ' +
        'discovered four weeks after its closest approach to the Sun. ' +
        'Borisov was luckier: it was caught before perihelion, ' +
        'and astronomers had time for thorough spectroscopic observations. ' +
        'Even so, the window was short.',

        'Vera Rubin will substantially improve the situation through continuous monitoring and greater survey depth. ' +
        'But there is a fundamental constraint: no current telescope can see interstellar objects ' +
        'at large distances from the Sun, when they are still faint and slowly approaching. ' +
        'Early detection would require either far larger telescopes ' +
        'or a network of sensors in the outer Solar System — both remain possibilities for the future.',
      ],
    },

    {
      heading: 'What They Tell Us About the Universe',
      level: 3,
      paragraphs: [
        'Interstellar objects are not merely an exotic curiosity. ' +
        'They are direct samples of material from other planetary systems — ' +
        'the only ones that arrive in the Solar System naturally, without a telescope sending anything there. ' +
        'Borisov\'s chemistry confirmed that water and organics are common in systems around different stars — ' +
        'reinforcing the broader picture of astrobiology: the building blocks for complex molecules exist widely.',

        'Each new detection is a potential window into the formation of a specific star and its planets. ' +
        'If future visitors reveal a diversity of compositions — from basaltic fragments to nitrogen-rich icy bodies — ' +
        'that will indicate that different types of planetary systems leave different chemical "signatures" ' +
        'in the material they scatter across the galaxy. ' +
        'Interstellar travelers are letters sent by other stars. ' +
        'We are only beginning to learn to read them.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Hyperbolic trajectory',
      definition: 'An open curve along which a body moves when it is not gravitationally bound to the Sun. It arrives from infinity and returns to infinity. This is the signature path of an interstellar visitor.',
    },
    {
      term: 'Eccentricity',
      definition: 'A numerical parameter describing the shape of an orbit. Zero is a circle; between 0 and 1 is an ellipse; exactly 1 is a parabola; greater than 1 is a hyperbola. Interstellar objects have eccentricity greater than one.',
    },
    {
      term: 'Outgassing',
      definition: 'The process by which gases and ices vaporize from a comet\'s surface under solar heating. The escaping gas and dust form the coma and tail, and the resulting jet force can alter the comet\'s trajectory.',
    },
    {
      term: 'Coma',
      definition: 'The cloud of gas and dust surrounding a comet\'s nucleus, produced by outgassing as the comet approaches the Sun. The absence of a coma in \'Oumuamua, despite its anomalous acceleration, was one of the central puzzles.',
    },
    {
      term: 'Radiation pressure',
      definition: 'The force that solar photons exert on surfaces in space. Normally small, it can be significant for bodies with a very large area-to-mass ratio — such as solar sails or extremely thin flat fragments.',
    },
    {
      term: 'Lagrange point',
      definition: 'One of five points in a two-body system (such as Earth and Sun) where a small mass can remain approximately stationary relative to both. The L2 point sits 1.5 million kilometers from Earth on the far side from the Sun. The James Webb Space Telescope and Comet Interceptor are positioned or planned there.',
    },
    {
      term: 'Oort Cloud',
      definition: 'A vast spherical shell of billions of icy bodies at distances ranging from thousands to hundreds of thousands of astronomical units from the Sun. Considered the reservoir of long-period comets; analogous clouds are expected around other stars.',
    },
    {
      term: 'Planetesimal',
      definition: 'A small solid body in the protoplanetary disk of a young star system — the building block from which planets assemble. A fraction of planetesimals are ejected by giant planet gravity into interstellar space.',
    },
    {
      term: 'Perihelion',
      definition: 'The point in an orbit closest to the Sun. On the hyperbolic trajectory of an interstellar visitor, perihelion is the moment of closest approach to the Sun, after which the object accelerates away.',
    },
  ],

  quiz: [
    {
      question: 'Which property unambiguously identifies an object as interstellar rather than native to the Solar System?',
      options: [
        'Absence of a coma and tail',
        'Orbital eccentricity greater than one',
        'A highly elongated body shape',
        'Velocity greater than 10 kilometers per second',
      ],
      correctIndex: 1,
      explanation: 'Eccentricity greater than 1 means a hyperbolic orbit — the body physically cannot be gravitationally bound to the Sun. This is the only unambiguous mathematical marker of interstellar origin. Absence of a coma, unusual shape, and high velocity can each have other explanations.',
    },
    {
      question: 'Which explanation for \'Oumuamua\'s anomalous acceleration is favored by the scientific community as of 2026?',
      options: [
        'An artificial solar sail of extraterrestrial origin — the Loeb hypothesis',
        'Radiation pressure or outgassing of a light ice lacking visible dust',
        'Measurement error in the trajectory due to atmospheric effects',
        'Gravitational influence of an unknown planetary body in the outer Solar System',
      ],
      correctIndex: 1,
      explanation: 'Most researchers prioritize natural hypotheses: outgassing of a transparent ice such as hydrogen or nitrogen without a dust coma, or radiation pressure on an object with an unusually high area-to-mass ratio. Loeb\'s hypothesis of artificial origin is considered fringe by the scientific community — not refuted in principle, but unsupported by evidence.',
    },
    {
      question: 'What is the most fundamental difference between 2I/Borisov and 1I/\'Oumuamua?',
      options: [
        'Borisov had a higher orbital eccentricity',
        'Borisov was discovered before perihelion and showed a classical active comet coma and tail',
        'Borisov remained in the Solar System and now orbits Jupiter',
        'Borisov had a regular spherical shape unlike the elongated \'Oumuamua',
      ],
      correctIndex: 1,
      explanation: '2I/Borisov was discovered in August 2019 before perihelion — unlike \'Oumuamua, which was found after its closest approach. Borisov had a well-developed coma, dust tail, and full spectroscopic analysis. \'Oumuamua showed no signs of activity, which became its central mystery.',
    },
    {
      question: 'What is the core concept of the Comet Interceptor mission?',
      options: [
        'Travel to the Oort Cloud and intercept an interstellar object beyond its edge',
        'Wait at the L2 Lagrange point and redirect to a suitable target after discovery',
        'Launch a probe to chase \'Oumuamua and intercept it by 2040',
        'Land a probe on a future interstellar visitor and collect surface samples',
      ],
      correctIndex: 1,
      explanation: 'Comet Interceptor will first park at the L2 Lagrange point, from where it can be quickly directed to any accessible target. This allows the mission to be built before any specific object is known. No particular asteroid or comet is chosen in advance.',
    },
    {
      question: 'Why is the Vera Rubin Observatory expected to significantly increase the number of detected interstellar objects?',
      options: [
        'It is located in space and avoids atmospheric distortion',
        'It carries instruments for direct chemical analysis of objects in flight',
        'It systematically scans the full sky every few nights, tracking moving and newly appearing objects',
        'It can observe objects at distances up to half a parsec from the Sun',
      ],
      correctIndex: 2,
      explanation: 'Vera Rubin is designed for systematic, continuous all-sky survey. Regular repeated mapping detects objects that move noticeably between exposures — which is the signature of nearby fast-moving bodies such as interstellar visitors.',
    },
  ],

  sources: [
    {
      title: '\'Oumuamua — NASA Solar System Exploration',
      url: 'https://solarsystem.nasa.gov/asteroids-comets-and-meteors/comets/oumuamua/in-depth/',
      meta: 'NASA Solar System Exploration overview',
    },
    {
      title: 'Meech et al. 2017 — A brief visit from a red and extremely elongated interstellar asteroid',
      url: 'https://www.nature.com/articles/nature25020',
      meta: 'Nature, 2017; primary \'Oumuamua discovery paper',
    },
    {
      title: 'Micheli et al. 2018 — Non-gravitational acceleration in the trajectory of 1I/\'Oumuamua',
      url: 'https://www.nature.com/articles/s41586-018-0254-4',
      meta: 'Nature, 2018; anomalous acceleration',
    },
    {
      title: 'Bialy & Loeb 2018 — Could Solar Radiation Pressure Explain \'Oumuamua\'s Peculiar Acceleration?',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/aae83f',
      meta: 'ApJL, 2018; solar sail hypothesis',
    },
    {
      title: 'Bodewits et al. 2020 — The carbon monoxide-rich interstellar comet 2I/Borisov',
      url: 'https://www.nature.com/articles/s41550-020-1095-2',
      meta: 'Nature Astronomy, 2020; Borisov chemical composition',
    },
    {
      title: 'Fitzsimmons et al. 2023 — Spectroscopy and thermal modeling of 2I/Borisov',
      url: 'https://www.aanda.org/articles/aa/full_html/2023/03/aa44806-22/aa44806-22.html',
      meta: 'Astronomy & Astrophysics, 2023',
    },
    {
      title: 'ESA Comet Interceptor Mission',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Comet_Interceptor',
      meta: 'ESA official mission page',
    },
    {
      title: 'Vera C. Rubin Observatory — LSST Science Overview',
      url: 'https://www.lsst.org/about/dm',
      meta: 'Vera Rubin Observatory / LSST Science Collaboration',
    },
    {
      title: 'Do, Tucker & Tran 2018 — Interstellar Interlopers in Our Solar System',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/aaef75',
      meta: 'ApJL, 2018; estimated occurrence rate of interstellar objects',
    },
    {
      title: 'Jackson & Desch 2021 — 1I/\'Oumuamua as an N2 Ice Fragment of an Exo-Pluto Surface',
      url: 'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2020JE006706',
      meta: 'JGR Planets, 2021; nitrogen ice hypothesis',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
