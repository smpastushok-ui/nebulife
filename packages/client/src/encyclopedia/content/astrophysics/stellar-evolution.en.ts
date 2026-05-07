import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'stellar-evolution',
  language: 'en',
  section: 'astrophysics',
  order: 2,
  difficulty: 'intermediate',
  readingTimeMin: 13,
  title: 'Stellar Evolution',
  subtitle: 'From gas cloud to white dwarf, neutron star, or black hole — mass decides everything.',

  hero: {
    cacheKey: 'stellar-evolution-hero',
    prompt:
      'Photorealistic scientific illustration of the Hertzsprung-Russell diagram rendered as a luminous star field: ' +
      'a dark space background with hundreds of stars plotted as glowing points across a diagonal band (main sequence) stretching from lower-right blue-white to upper-left, ' +
      'red giant branch visible in upper-right, white dwarf cluster in lower-left. ' +
      'Hard sci-fi style scientific illustration, wide aspect ratio. ' +
      'Add the following text labels on the image: "Main Sequence", "Red Giants", "White Dwarfs", "Supergiants".',
    alt: 'Hertzsprung-Russell diagram — stars distributed along the main sequence, giant branch, and white dwarf cloud',
    caption:
      'The Hertzsprung-Russell diagram plots stellar luminosity against surface temperature. Most stars lie along the main sequence — until they exhaust the hydrogen in their cores.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Every star visible in the night sky is a thermonuclear reactor balanced on the edge of its own ' +
        'gravitational collapse. Gravity pulls the gas inward; nuclear burning pushes it outward. ' +
        'While these two forces are balanced, the star maintains **hydrostatic equilibrium** and can ' +
        'burn for billions — or even trillions — of years. But fuel runs out eventually, and when it does, ' +
        'the balance breaks.',

        'What happens next is determined entirely by one quantity: the star\'s _initial mass_. ' +
        'The lightest stars fade quietly, leaving behind carbon-oxygen spheres no larger than Earth. ' +
        'Massive stars tear themselves apart in the brightest explosions the universe produces — ' +
        'and what remains is compressed to conditions where ordinary physics ceases to apply. ' +
        'Between these extremes lies a whole zoo of structures and phenomena that astrophysicists ' +
        'systematized throughout the twentieth century.',

        'That system of classification acquired its defining image in the early decades of the twentieth ' +
        'century, when Danish astronomer _Ejnar Hertzsprung_ and American astronomer _Henry Norris Russell_ ' +
        'independently plotted thousands of stars on a graph of temperature against luminosity. ' +
        'Instead of a random scatter, they found clear order: the vast majority of stars fell along a ' +
        'narrow diagonal band — the **main sequence**. That graph, known as the Hertzsprung-Russell diagram, ' +
        'remains the primary tool for understanding stellar life.',
      ],
    },

    {
      diagram: {
        title: 'Hertzsprung-Russell Diagram (schematic)',
        svg: `<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="420" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="70" y1="370" x2="630" y2="370" stroke="#334455" stroke-width="1.5"/>
  <line x1="70" y1="370" x2="70" y2="20" stroke="#334455" stroke-width="1.5"/>

  <!-- Axis labels -->
  <text x="350" y="400" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle">Surface Temperature (hot left → cool right)</text>
  <text x="20" y="200" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle" transform="rotate(-90,20,200)">Luminosity (relative to Sun)</text>

  <!-- Temperature tick labels -->
  <text x="100" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">40 000 K</text>
  <text x="230" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">20 000 K</text>
  <text x="360" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">10 000 K</text>
  <text x="490" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">5 000 K</text>
  <text x="600" y="385" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">3 000 K</text>

  <!-- Main Sequence band -->
  <path d="M 100 40 Q 220 100 360 200 Q 460 270 580 350" stroke="#7bb8ff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.35"/>
  <path d="M 100 40 Q 220 100 360 200 Q 460 270 580 350" stroke="#7bb8ff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>
  <text x="270" y="145" fill="#7bb8ff" font-family="monospace" font-size="11" transform="rotate(-28,270,145)">Main Sequence</text>

  <!-- Red Giant / Subgiant branch -->
  <path d="M 360 200 Q 420 160 530 120" stroke="#cc6633" stroke-width="2" fill="none" stroke-dasharray="5,3" opacity="0.85"/>
  <text x="490" y="108" fill="#cc6633" font-family="monospace" font-size="10">Giant Branch</text>

  <!-- Asymptotic Giant Branch -->
  <path d="M 530 120 Q 555 80 545 50" stroke="#ff8844" stroke-width="2" fill="none" stroke-dasharray="3,4" opacity="0.8"/>
  <text x="556" y="60" fill="#ff8844" font-family="monospace" font-size="10">AGB</text>

  <!-- Supergiants -->
  <ellipse cx="160" cy="55" rx="55" ry="22" fill="rgba(204,68,68,0.12)" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="160" y="59" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">Supergiants</text>

  <!-- White dwarf region -->
  <ellipse cx="390" cy="355" rx="50" ry="14" fill="rgba(123,184,255,0.1)" stroke="#88ccdd" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="390" y="359" fill="#88ccdd" font-family="monospace" font-size="10" text-anchor="middle">White Dwarfs</text>

  <!-- Sun marker -->
  <circle cx="360" cy="200" r="7" fill="#ffd080" stroke="#ffa030" stroke-width="1.5"/>
  <text x="375" y="196" fill="#ffd080" font-family="monospace" font-size="10">Sun</text>

  <!-- Spectral class labels -->
  <text x="100" y="15" fill="#aad4ff" font-family="monospace" font-size="10" text-anchor="middle">O</text>
  <text x="180" y="15" fill="#cce0ff" font-family="monospace" font-size="10" text-anchor="middle">B</text>
  <text x="270" y="15" fill="#eeeeff" font-family="monospace" font-size="10" text-anchor="middle">A</text>
  <text x="360" y="15" fill="#ffffcc" font-family="monospace" font-size="10" text-anchor="middle">F–G</text>
  <text x="460" y="15" fill="#ffcc88" font-family="monospace" font-size="10" text-anchor="middle">K</text>
  <text x="570" y="15" fill="#ff8855" font-family="monospace" font-size="10" text-anchor="middle">M</text>
</svg>`,
        caption:
          'The Hertzsprung-Russell diagram. The main sequence (blue band) is where hydrogen-burning stars live. ' +
          'The giant branch and asymptotic giant branch are late evolutionary stages for intermediate-mass stars. ' +
          'Supergiants are massive stars approaching their explosive end. White dwarfs are the final remnants of low-mass stars.',
      },
    },

    {
      heading: 'The Main Sequence: Burning for Balance',
      level: 2,
      paragraphs: [
        'A star joins the main sequence when stable hydrogen fusion ignites in its core — the proton-proton chain ' +
        'for cooler stars, or the CNO cycle for hotter ones. Four hydrogen nuclei fuse into one helium nucleus, ' +
        'releasing an enormous amount of energy — roughly 0.7 percent of the consumed hydrogen mass converts ' +
        'directly into energy through Einstein\'s mass-energy relation. The Sun burns through approximately ' +
        'six hundred million tonnes of hydrogen every second, and has been doing so for more than four billion ' +
        'years — with roughly the same amount of time remaining.',

        'The time a star spends on the main sequence is inversely proportional to its mass raised to ' +
        'roughly the third or fourth power. A star ten times more massive than the Sun burns its fuel ' +
        'tens of millions of times faster and lives for only a few million years. A star ten times lighter, ' +
        'by contrast, will burn for _trillions_ of years — far longer than the universe has existed. ' +
        'These long-lived stars — the _red dwarfs_ with masses below 0.5 solar masses — are fully convective: ' +
        'all their hydrogen is gradually stirred into the core and burned, leaving no untouched reserves ' +
        'at the periphery. Not one of them has yet completed its cycle in the lifetime of the universe.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-main-sequence-comparison',
        prompt:
          'Photorealistic scientific illustration comparing stars of different masses on the main sequence: ' +
          'five stars of dramatically different sizes side by side in space — from a tiny dim red dwarf on the left, ' +
          'a Sun-sized yellow star in the center, to a massive brilliant blue-white O-type star on the right. ' +
          'Each star labeled with relative mass and color. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "0.1 M_sun red dwarf", "1 M_sun Sun-like", "10 M_sun blue giant", "relative lifetimes shown".',
        alt: 'Comparison of stars of different masses on the main sequence — from red dwarf to blue giant',
        caption:
          'Mass determines everything: color, size, luminosity, and lifespan. Blue giants live millions of years and die violently; red dwarfs burn for trillions of years almost imperceptibly.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Schönberg-Chandrasekhar Limit: The Breaking Point',
      level: 2,
      paragraphs: [
        'Hydrogen in the stellar core does not burn evenly down to the last atom. There is a critical threshold — ' +
        'the **Schönberg-Chandrasekhar limit** — when the helium core that has accumulated at the center can ' +
        'no longer sustain pressure through thermal energy alone and begins to contract. For stars with masses ' +
        'between about 1.5 and 8 solar masses, this happens abruptly: the core contracts, releases heat, ' +
        'and the outer envelope responds by expanding dramatically.',

        'The star leaves the main sequence and migrates rightward and upward on the Hertzsprung-Russell diagram, ' +
        'becoming a **red giant** or a **red supergiant**. This is not a catastrophe but a restructuring. ' +
        'Hydrogen fusion continues, but no longer in the core — instead in a thin shell surrounding it, ' +
        'a process called _shell burning_. This burning shell supplies the energy that inflates the outer ' +
        'layers to sizes that can swallow entire planetary systems. When the Sun becomes a red giant in ' +
        'approximately five billion years, it will expand to engulf Mercury and Venus, and Earth\'s surface ' +
        'will become inhospitable to any known form of life.',
      ],
    },

    {
      heading: 'The Helium Flash and the Asymptotic Giant Branch',
      level: 3,
      paragraphs: [
        'When the helium core reaches a mass of roughly 0.45 solar masses and temperatures of several hundred ' +
        'million kelvin, a new thermonuclear process ignites: three helium nuclei fuse into one carbon nucleus ' +
        '(the triple-alpha process). For intermediate-mass stars, this begins suddenly and uncontrollably — ' +
        'the **helium flash**. Within seconds, energy is released comparable to the luminosity of an entire ' +
        'galaxy, but nearly all of it is absorbed by the star\'s outer layers and never reaches the surface. ' +
        'Externally, the star actually dims briefly.',

        'Once helium burning stabilizes, the star settles on the so-called **horizontal branch** of the diagram. ' +
        'Helium in the core burns far faster than hydrogen did. When the helium is exhausted, a ' +
        'carbon-oxygen core remains — and shell burning resumes in two layers simultaneously: a helium shell ' +
        'and a hydrogen shell burning around the carbon-oxygen core. The star swells again and climbs the ' +
        '**asymptotic giant branch**. Here it becomes unstable: it pulsates, ' +
        'and powerful stellar winds begin stripping the outer layers away.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-red-giant-shell',
        prompt:
          'Photorealistic scientific cross-section illustration of a red giant star interior: ' +
          'large bloated outer envelope shown as semi-transparent orange-red gas, ' +
          'inner shell burning layers shown as bright glowing rings around a dense white carbon-oxygen core at center. ' +
          'Cutaway view showing concentric layers clearly labeled. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "hydrogen shell burning", "helium shell burning", "C/O core", "expanded envelope".',
        alt: 'Cross-section of a red giant on the asymptotic giant branch — two burning shells around a carbon-oxygen core',
        caption:
          'On the asymptotic giant branch, the star maintains simultaneous burning in two shells. This is an unstable configuration: pulsations intensify and eventually eject the outer envelope as a planetary nebula.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The End of Low-Mass Stars: Planetary Nebula and White Dwarf',
      level: 2,
      paragraphs: [
        'For stars with initial masses between 0.5 and roughly 8 solar masses, the end is relatively quiet. ' +
        'The outer layers, driven off by pulsations and stellar winds, slowly detach and form a ' +
        '**planetary nebula** — a gas shell expanding into surrounding space. ' +
        'The name "planetary" is purely historical: through early telescopes these objects resembled ' +
        'the disks of planets, though they have nothing to do with them.',

        'At the center of the nebula, the bare carbon-oxygen core remains — a **white dwarf**. ' +
        'Its mass is comparable to that of the Sun, but its size is no larger than Earth. ' +
        'This core no longer burns: the nuclear fuel is exhausted. It is supported not by gas pressure ' +
        'but by electron degeneracy pressure — a quantum-mechanical effect that forbids two electrons ' +
        'from occupying the same state. The white dwarf simply cools over billions and billions of years, ' +
        'growing ever dimmer, neither exploding nor collapsing further. ' +
        'In theory, after trillions of years it will become a "black dwarf" — a cold, inert remnant. ' +
        'But the universe is not yet old enough for any black dwarf to have formed.',

        'The Ring Nebula, the Dumbbell Nebula, the Cat\'s Eye Nebula — these are all planetary nebulae ' +
        'at different stages of expansion. Their diverse shapes arise from the interaction of stellar winds ' +
        'with magnetic fields, rotation, and the presence of companion stars.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-planetary-nebula',
        prompt:
          'Photorealistic scientific illustration of a planetary nebula: a glowing shell of ionized gas in concentric rings of blue, teal and orange, ' +
          'surrounding a tiny brilliant white dwarf at the center. ' +
          'Nebula filaments and jets visible. Deep black space background with faint distant stars. ' +
          'Hard sci-fi style encyclopedia illustration. ' +
          'Add the following text labels on the image: "ionized gas shell", "white dwarf remnant", "expanding at ~20 km/s".',
        alt: 'Planetary nebula — a multi-layered gas shell surrounding a central white dwarf',
        caption:
          'Planetary nebulae live for only tens of thousands of years on cosmic timescales. The gas then disperses into the interstellar medium, enriching it with carbon and oxygen — future raw material for new stars and planets.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Massive Stars: Short and Brilliant',
      level: 2,
      paragraphs: [
        'Stars with initial masses above eight solar masses follow a different script. ' +
        'Their cores are hot enough to successively ignite ever-heavier elements once each previous fuel is ' +
        'exhausted: carbon, neon, oxygen, silicon. Each successive burning cycle is shorter than the last — ' +
        'silicon burning in the most massive stars lasts only a few days. The star develops an _onion-like_ ' +
        'structure: concentric shells of progressively heavier elements, with an iron core at the center.',

        'Iron is the endpoint of stellar burning. Unlike all prior reactions, the fusion of iron nuclei ' +
        '_absorbs_ energy rather than releasing it. When the iron core reaches approximately 1.4 solar masses ' +
        '(the Chandrasekhar limit), electron degeneracy pressure can no longer hold it against collapse. ' +
        'Within a fraction of a second, the core compresses to nuclear density — roughly one trillion tonnes ' +
        'per cubic centimeter — forming a neutron star or, in the most massive cases, a black hole.',

        'The rest of the star falls inward, rebounds off the neutron core, and explodes outward as a ' +
        '**Type II supernova**. In a fraction of a second, more energy is released than the Sun will ' +
        'radiate over its entire ten-billion-year life — mostly in the form of neutrinos. ' +
        'The shock wave scatters the outer layers, enriched with heavy elements from iron all the way ' +
        'to uranium — precisely the atoms without which planets and living organisms cannot exist.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Stellar Fate by Mass',
        svg: `<svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr-en2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
  <rect width="680" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- ── Row 1: Red dwarf (<0.5 M_sun) ── -->
  <circle cx="70" cy="55" r="12" fill="#cc4422" opacity="0.85"/>
  <text x="70" y="80" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">&lt; 0.5 M☉</text>
  <text x="70" y="92" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Red Dwarf</text>
  <line x1="84" y1="55" x2="200" y2="55" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <text x="142" y="48" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">burns trillions of yr</text>
  <rect x="205" y="41" width="108" height="28" rx="3" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1"/>
  <text x="259" y="58" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Helium Dwarf</text>
  <text x="259" y="82" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">(never yet observed)</text>

  <!-- Divider -->
  <line x1="20" y1="112" x2="660" y2="112" stroke="#334455" stroke-width="0.5" stroke-dasharray="6,5" opacity="0.5"/>

  <!-- ── Row 2: Intermediate (0.5-8 M_sun) ── -->
  <circle cx="70" cy="185" r="20" fill="#ffa040" opacity="0.85"/>
  <text x="70" y="218" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">0.5–8 M☉</text>
  <text x="70" y="230" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Intermediate</text>

  <line x1="92" y1="185" x2="150" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <circle cx="180" cy="185" r="28" fill="#cc5522" opacity="0.8"/>
  <text x="180" y="182" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Red</text>
  <text x="180" y="192" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Giant</text>

  <line x1="210" y1="185" x2="268" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <ellipse cx="300" cy="185" rx="24" ry="16" fill="none" stroke="#88ccdd" stroke-width="1.5" opacity="0.8"/>
  <text x="300" y="183" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Planetary</text>
  <text x="300" y="193" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Nebula</text>

  <line x1="326" y1="185" x2="384" y2="185" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <circle cx="408" cy="185" r="11" fill="#cdd9e8" opacity="0.9"/>
  <text x="408" y="208" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">White</text>
  <text x="408" y="220" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Dwarf</text>

  <!-- Divider -->
  <line x1="20" y1="250" x2="660" y2="250" stroke="#334455" stroke-width="0.5" stroke-dasharray="6,5" opacity="0.5"/>

  <!-- ── Row 3: Massive (>8 M_sun) ── -->
  <circle cx="70" cy="315" r="28" fill="#aad4ff" opacity="0.85"/>
  <text x="70" y="312" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Massive</text>
  <text x="70" y="322" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Star</text>
  <text x="70" y="355" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">&gt; 8 M☉</text>

  <line x1="100" y1="315" x2="148" y2="315" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <circle cx="178" cy="315" r="34" fill="#992211" opacity="0.85"/>
  <text x="178" y="312" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Red</text>
  <text x="178" y="322" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Supergiant</text>

  <line x1="214" y1="315" x2="258" y2="315" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <circle cx="290" cy="315" r="22" fill="none" stroke="#ff8844" stroke-width="2"/>
  <circle cx="290" cy="315" r="12" fill="rgba(255,200,80,0.5)"/>
  <text x="290" y="319" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Supernova</text>

  <!-- Fork upper: neutron star -->
  <line x1="313" y1="304" x2="368" y2="276" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <circle cx="390" cy="268" r="9" fill="#7bb8ff" opacity="0.9"/>
  <text x="390" y="250" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Neutron</text>
  <text x="390" y="261" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Star</text>
  <text x="390" y="289" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1.4–3 M☉ core</text>

  <!-- Fork lower: black hole -->
  <line x1="313" y1="326" x2="368" y2="350" stroke="#667788" stroke-width="1.2" marker-end="url(#arr-en2)"/>
  <circle cx="390" cy="358" r="12" fill="#080c18" stroke="#cc4444" stroke-width="2"/>
  <circle cx="390" cy="358" r="3" fill="#ff8844"/>
  <text x="390" y="378" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Black Hole</text>
  <text x="390" y="342" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">&gt; 3 M☉ core</text>

  <!-- Row labels -->
  <text x="478" y="55" fill="#667788" font-family="monospace" font-size="9">Lifetime: trillions of years</text>
  <text x="478" y="185" fill="#667788" font-family="monospace" font-size="9">Lifetime: billions of years</text>
  <text x="478" y="315" fill="#667788" font-family="monospace" font-size="9">Lifetime: millions of years</text>
</svg>`,
        caption:
          'Three main paths of stellar evolution. For massive stars, the supernova explosion is not the end but a fork: ' +
          'the remnant core mass determines whether a neutron star (1.4–3 solar masses) or a black hole (above 3 solar masses) forms.',
      },
    },

    {
      heading: 'Neutron Stars and Pulsars',
      level: 3,
      paragraphs: [
        'If the core left behind by a supernova explosion has a mass between 1.4 and roughly 3 solar masses, ' +
        'a **neutron star** is born — an object where all that mass is compressed into a sphere roughly twenty ' +
        'kilometers across. One cubic centimeter of neutron matter weighs hundreds of millions of tonnes. ' +
        'A young neutron star rotates extraordinarily fast — conservation of angular momentum from the parent ' +
        'star spins it up to hundreds of revolutions per second — and may emit a narrow beam of radio waves ' +
        'along its magnetic axis. If that axis is tilted relative to the rotation vector, the beam sweeps ' +
        'space like a lighthouse, and we register a **pulsar** — one of the most precise natural clocks ' +
        'in the universe.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-supernova-remnant',
        prompt:
          'Photorealistic scientific illustration of a supernova remnant: expanding shock wave shell of glowing blue and orange filaments of ionized gas expanding into interstellar space, ' +
          'a tiny neutron star pulsar visible at center emitting bright blue jets. ' +
          'Wide field showing the full remnant structure. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "expanding shock wave", "neutron star pulsar", "enriched ejecta", "synchrotron radiation".',
        alt: 'Supernova remnant — expanding gas shell with a neutron star at its center',
        caption:
          'Supernova remnants are structures hundreds of light-years across. Gas enriched with heavy elements expands into the interstellar medium. Over millions of years this material will become part of new stellar systems and planets.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What Stellar Evolution Means for Us',
      level: 2,
      paragraphs: [
        'Almost every element heavier than helium — carbon, oxygen, iron, gold, the oxygen in water, ' +
        'the calcium in bones — was forged in the interiors of stars and scattered by supernovae. ' +
        'Stars are the nuclear factories of the universe, continually enriching the interstellar gas ' +
        'with heavier elements. Each successive generation of stars is born from material enriched by ' +
        'its predecessors — and is therefore capable of forming ever more complex planets and molecules.',

        'Our Sun is a third- or even fourth-generation star: its composition includes iron and nickel ' +
        'synthesized in the cores of stars that died before the Solar System formed. ' +
        'Every iron atom in your blood passed through the core of at least one predecessor star. ' +
        'Stellar evolution is not merely an astronomical classification scheme. It is the genealogy of matter.',

        'Questions that remain open in the twenty-first century include: the precise boundary conditions ' +
        'for the transition between neutron star and black hole formation, the detailed mechanism of the ' +
        'supernova explosion itself (current simulations still cannot reproduce it fully), ' +
        'and the role of massive stars in enriching early galaxies at a time when neither planets ' +
        'nor living observers yet existed to witness it.',
      ],
    },

    {
      image: {
        cacheKey: 'stellar-evolution-cosmic-cycle',
        prompt:
          'Photorealistic scientific illustration of the cosmic stellar cycle: ' +
          'a circular flow diagram showing interstellar gas cloud condensing into a protostar, evolving to a main sequence star, then red giant, planetary nebula, returning enriched gas to the interstellar medium. ' +
          'Arrows connecting stages in a loop. Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "gas cloud", "protostar", "main sequence", "red giant", "nebula", "enriched ISM".',
        alt: 'The cycle of stellar matter — from gas cloud through a star to a planetary nebula and back into the interstellar medium',
        caption:
          'The stellar cycle: interstellar matter condenses into new stars, burns, and returns to the interstellar medium enriched with heavier elements. Each cycle raises the metallicity of the galaxy.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Main sequence',
      definition:
        'The diagonal band on the Hertzsprung-Russell diagram where stars that are actively fusing hydrogen in their cores are found. The Sun has been on the main sequence for more than four billion years.',
    },
    {
      term: 'Hydrostatic equilibrium',
      definition:
        'The state of a star in which the outward pressure from gas and radiation exactly balances the inward pull of gravity. This balance sustains the star\'s stable long-term existence.',
    },
    {
      term: 'Schönberg-Chandrasekhar limit',
      definition:
        'The critical fraction of stellar mass (~10–15%) that an isothermal helium core can reach before it begins to contract and the star leaves the main sequence. Identified by Mario Schönberg and Subrahmanyan Chandrasekhar in the mid-twentieth century.',
    },
    {
      term: 'Helium flash',
      definition:
        'The sudden and uncontrolled ignition of helium fusion via the triple-alpha process in the core of an intermediate-mass star. Energy equivalent to an entire galaxy\'s luminosity is released in seconds but is absorbed by the outer layers and never reaches the surface.',
    },
    {
      term: 'Asymptotic giant branch',
      definition:
        'A late evolutionary stage of intermediate-mass stars in which burning occurs simultaneously in two shells around a carbon-oxygen core. The star becomes unstable, pulsates, and sheds its outer envelope.',
    },
    {
      term: 'Planetary nebula',
      definition:
        'A shell of ionized gas ejected by an intermediate-mass star on the asymptotic giant branch. The name is historical: through early telescopes they resembled planetary disks, despite having no connection to planets.',
    },
    {
      term: 'White dwarf',
      definition:
        'The final remnant of an intermediate-mass star: a dense carbon-oxygen core roughly the size of Earth, supported by electron degeneracy pressure. It no longer fuses fuel and simply cools over billions of years.',
    },
    {
      term: 'Neutron star',
      definition:
        'An extremely dense supernova remnant formed when the core mass is 1.4–3 solar masses. Composed almost entirely of neutrons. Diameter is roughly twenty kilometers, yet mass exceeds that of the Sun.',
    },
    {
      term: 'Chandrasekhar limit',
      definition:
        'The maximum mass of a white dwarf (~1.4 solar masses) at which electron degeneracy pressure can still prevent gravitational collapse. Exceeding this limit leads to either a Type Ia supernova explosion or further collapse.',
    },
  ],

  quiz: [
    {
      question: 'What happens to a star when its helium core exceeds the Schönberg-Chandrasekhar limit?',
      options: [
        'The star explodes as a supernova',
        'The star leaves the main sequence and begins expanding into a red giant',
        'Helium in the core ignites instantly via the triple-alpha process',
        'The star gradually dims and becomes a white dwarf',
      ],
      correctIndex: 1,
      explanation:
        'When the isothermal helium core accumulates critical mass, it can no longer sustain pressure and begins to contract, releasing heat. This heats the surrounding shell and the star expands, migrating to the red giant branch.',
    },
    {
      question: 'Why is iron the endpoint of stellar nuclear burning?',
      options: [
        'Iron is too heavy to reach the stellar core',
        'Iron nucleus fusion absorbs energy instead of releasing it',
        'Iron dissolves in helium at stellar temperatures',
        'Pressure halts burning once iron is reached',
      ],
      correctIndex: 1,
      explanation:
        'All thermonuclear reactions up to and including iron release energy because the products have lower rest mass than the reactants. Iron has the highest binding energy per nucleon — fusing iron nuclei requires an energy input, not a release. This stops the burning.',
    },
    {
      question: 'What fate awaits the Sun after it leaves the main sequence?',
      options: [
        'It will explode as a supernova and form a neutron star',
        'It will become a red supergiant and then collapse directly into a black hole',
        'It will become a red giant, shed its envelope as a planetary nebula, and leave a white dwarf',
        'It will gradually cool on the main sequence without any dramatic changes',
      ],
      correctIndex: 2,
      explanation:
        'The Sun has a mass of approximately one solar mass — a typical intermediate-mass star. After its hydrogen is exhausted it will become a red giant, ascend the asymptotic giant branch, shed its outer layers, and leave behind a white dwarf of roughly 0.6 solar masses.',
    },
    {
      question: 'What is a pulsar?',
      options: [
        'An unstable star that pulsates in size',
        'A special type of white dwarf with a strong magnetic field',
        'A rapidly rotating neutron star emitting a narrow radio beam',
        'A star at the moment of helium flash',
      ],
      correctIndex: 2,
      explanation:
        'Pulsars are neutron stars rotating up to hundreds of times per second, emitting a narrow beam of radio waves along their magnetic axis. When that axis is tilted relative to the rotation vector, the beam sweeps space like a lighthouse and we register regular pulses.',
    },
    {
      question: 'Why do we say "all heavy elements were born in stars"?',
      options: [
        'Because heavy elements formed during the Big Bang under stellar conditions',
        'Because stars synthesize elements from carbon to iron, and supernova explosions produce heavier ones, scattering them into space',
        'Because meteorites falling to Earth carry stellar material',
        'Because nuclear fusion occurs only inside supermassive black holes',
      ],
      correctIndex: 1,
      explanation:
        'The Big Bang produced only hydrogen, helium, and trace lithium. All heavier elements — from carbon to iron — formed in thermonuclear reactions in stellar cores. Elements heavier than iron (gold, uranium) are synthesized in supernova explosions and neutron star mergers. Ejected into space, these elements become part of new stellar systems, planets, and living organisms.',
    },
  ],

  sources: [
    {
      title: 'Hertzsprung E. — Zur Strahlung der Sterne',
      url: 'https://doi.org/10.1007/BF01443015',
      meta: 'Zeitschrift für wissenschaftliche Photographie, 3, 429–442, 1905',
    },
    {
      title: 'Russell H.N. — Relations Between the Spectra and Other Characteristics of the Stars',
      url: 'https://doi.org/10.1126/science.ns-37.955.651',
      meta: 'Science, 37, 651–652, 1913',
    },
    {
      title: 'Chandrasekhar S. — The Maximum Mass of Ideal White Dwarfs',
      url: 'https://doi.org/10.1086/143197',
      meta: 'ApJ, 74, 81–82, 1931',
    },
    {
      title: 'Schönberg M., Chandrasekhar S. — On the Evolution of the Main-Sequence Stars',
      url: 'https://doi.org/10.1086/144243',
      meta: 'ApJ, 96, 161–172, 1942',
    },
    {
      title: 'Salpeter E.E. — Nuclear Reactions in Stars Without Hydrogen',
      url: 'https://doi.org/10.1086/145971',
      meta: 'ApJ, 115, 326–328, 1952 (triple-alpha process)',
    },
    {
      title: 'Burbidge E.M. et al. — Synthesis of the Elements in Stars (B2FH)',
      url: 'https://doi.org/10.1103/RevModPhys.29.547',
      meta: 'Reviews of Modern Physics, 29, 547–650, 1957',
    },
    {
      title: 'NASA — Stellar Evolution (Science Overview)',
      url: 'https://science.nasa.gov/universe/stars/',
      meta: 'NASA Science, updated 2025',
    },
    {
      title: 'Woosley S., Janka T. — The Physics of Core-Collapse Supernovae',
      url: 'https://arxiv.org/abs/astro-ph/0504015',
      meta: 'Nature Physics, 1, 147–154, 2005',
    },
    {
      title: 'Lattimer J.M., Prakash M. — The Physics of Neutron Stars',
      url: 'https://doi.org/10.1126/science.1090720',
      meta: 'Science, 304, 536–542, 2004',
    },
    {
      title: 'Carroll B., Ostlie D. — An Introduction to Modern Astrophysics (2nd ed.)',
      url: 'https://www.pearson.com/en-us/subject-catalog/p/introduction-to-modern-astrophysics-an/P200000006548',
      meta: 'Pearson, 2017 — standard university textbook',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
