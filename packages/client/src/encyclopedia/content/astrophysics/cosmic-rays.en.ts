import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'cosmic-rays',
  language: 'en',
  section: 'astrophysics',
  order: 13,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Cosmic Rays',
  subtitle: 'Charged particles from the depths of the universe — from supernova explosions to the most powerful natural accelerators in existence.',

  hero: {
    cacheKey: 'cosmic-rays-hero',
    prompt:
      'Photorealistic scientific illustration for a science encyclopedia: cosmic ray particle shower entering Earth\'s atmosphere from deep space. ' +
      'A brilliant cascade of secondary particles (blue and white streaks) branching downward through a dark atmosphere, ' +
      'Earth\'s curved limb visible below with city lights, incoming primary cosmic ray shown as a bright orange-red streak from above. ' +
      'Hard sci-fi style, dark space background, dramatic perspective from space looking down at the cascade. ' +
      'Add the following text labels on the image: "primary cosmic ray", "air shower", "secondary particles", "Earth\'s atmosphere".',
    alt: 'A cosmic ray enters Earth\'s atmosphere and generates a cascading shower of secondary particles',
    caption:
      'Every second, thousands of cosmic rays cross a square meter of your body. Most are simple protons; the most energetic — single particles more powerful than a tennis ball in flight.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'In 1912, Austrian physicist Victor Hess ascended more than five kilometers in a hot-air balloon, clutching electrometers. He expected that ionizing radiation would decrease with distance from Earth. Instead it rose. The conclusion that changed physics: ionization was arriving from _above_ — from space. The science of astroparticle physics was born.',

        'Cosmic rays are not rays in any ordinary sense. They are a stream of charged particles: protons, helium nuclei, heavier nuclei, and a small fraction of electrons and positrons, racing through interstellar and intergalactic space at almost unimaginable velocities. They bombard Earth\'s atmosphere around the clock, they penetrate mountain rock, they leave tracks on photographic emulsions and cause bit errors in processors. The sources of most of them remain an active area of research.',

        'What makes them genuinely fascinating is not their ubiquity but the extremes. Some particles arrive at Earth with energies no human-built accelerator comes remotely close to matching. They whisper to us that somewhere in the universe, acceleration mechanisms are at work whose nature we can only begin to guess.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-rays-hess-balloon',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: early 20th century high-altitude balloon flight for cosmic ray research. ' +
          'Open gondola with a scientist silhouetted against a deep blue sky at altitude, holding electroscope instruments, balloon above. ' +
          'Sunlit clouds below, stars faintly visible above. Sepia-toned with scientific atmosphere, hard sci-fi style. ' +
          'Add the following text labels on the image: "Hess 1912", "5 km altitude", "ionization increases with height".',
        alt: 'Reconstruction of Hess\'s 1912 balloon flight — scientist with electrometer in the gondola at high altitude',
        caption:
          'Hess\'s balloon flights in 1912 disproved the hypothesis that ionizing radiation originated from Earth and opened a new window into the physics of the universe. In 1936, Hess received the Nobel Prize in Physics for this discovery.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What a Cosmic Ray Actually Is',
      level: 2,
      paragraphs: [
        'Primary cosmic rays are charged particles that reach Earth\'s upper atmosphere from beyond our planet. More than ninety percent of them are protons — bare hydrogen nuclei. About eight percent are helium nuclei, known as alpha particles. The remainder are heavier nuclei: carbon, oxygen, iron, and elements up to uranium, though their share drops steeply with increasing mass. A very small fraction are electrons and positrons.',

        'The energies of these particles span a staggering range: from hundreds of millions of electron-volts — roughly the energy scale of the solar wind — to more than one hundred sextillion electron-volts in the most extreme recorded events. When physicists plot the number of particles against their energy, they obtain a curve spanning more than eleven orders of magnitude in energy. This curve is not a simple straight line: it has two characteristic kinks, given the evocative names the _knee_ (near one thousand trillion electron-volts) and the _ankle_ (near one million trillion electron-volts).',

        'Below the _knee_, galactic sources dominate — particles accelerated within our own Galaxy. Above it, the Larmor radius (the radius of curvature in the galactic magnetic field) exceeds the size of the Milky Way, and particles can no longer be confined inside it. They most likely come from beyond.',
      ],
    },

    {
      diagram: {
        title: 'Cosmic Ray Energy Spectrum (log-log)',
        svg: `<svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="80" y1="320" x2="640" y2="320" stroke="#aabbcc" stroke-width="1.5"/>
  <line x1="80" y1="20" x2="80" y2="320" stroke="#aabbcc" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="360" y="360" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">Energy (electron-volts)</text>

  <!-- Y axis label (rotated) -->
  <text x="18" y="175" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle"
    transform="rotate(-90, 18, 175)">Particle flux (relative)</text>

  <!-- X axis ticks and labels -->
  <line x1="128" y1="320" x2="128" y2="326" stroke="#aabbcc" stroke-width="1"/>
  <text x="128" y="338" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10^9</text>

  <line x1="194" y1="320" x2="194" y2="326" stroke="#aabbcc" stroke-width="1"/>
  <text x="194" y="338" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10^12</text>

  <line x1="260" y1="320" x2="260" y2="326" stroke="#aabbcc" stroke-width="1"/>
  <text x="260" y="338" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10^15</text>

  <line x1="326" y1="320" x2="326" y2="326" stroke="#aabbcc" stroke-width="1"/>
  <text x="326" y="338" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10^18</text>

  <line x1="392" y1="320" x2="392" y2="326" stroke="#aabbcc" stroke-width="1"/>
  <text x="392" y="338" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10^21</text>

  <!-- Spectrum line: steep power law with kink at knee -->
  <path d="M 128 40 L 260 200" stroke="#7bb8ff" stroke-width="2.5" fill="none"/>

  <!-- Knee region (10^15) -->
  <circle cx="260" cy="200" r="4" fill="#ff8844"/>

  <!-- Segment 2: knee to ankle -->
  <path d="M 260 200 L 350 275" stroke="#7bb8ff" stroke-width="2.5" fill="none"/>

  <!-- Ankle region (10^18) -->
  <circle cx="350" cy="275" r="4" fill="#44ff88"/>

  <!-- Segment 3: ankle to GZK -->
  <path d="M 350 275 L 420 296" stroke="#7bb8ff" stroke-width="2.5" fill="none"/>

  <!-- GZK cutoff (~10^19.5) -->
  <circle cx="420" cy="296" r="4" fill="#cc4444"/>

  <!-- Segment 4: GZK cutoff drop -->
  <path d="M 420 296 L 490 318" stroke="#7bb8ff" stroke-width="2.5" fill="none" stroke-dasharray="5,3"/>

  <!-- Oh-My-God particle -->
  <circle cx="460" cy="310" r="5" fill="#ff8844" stroke="#aabbcc" stroke-width="1"/>
  <text x="468" y="306" fill="#ff8844" font-family="monospace" font-size="9">Oh-My-God (1991)</text>

  <!-- Knee label -->
  <line x1="260" y1="200" x2="290" y2="170" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="293" y="168" fill="#ff8844" font-family="monospace" font-size="10">Knee (~10^15 eV)</text>

  <!-- Ankle label -->
  <line x1="350" y1="275" x2="310" y2="252" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="240" y="250" fill="#44ff88" font-family="monospace" font-size="10">Ankle (~10^18 eV)</text>

  <!-- GZK label -->
  <line x1="420" y1="296" x2="430" y2="260" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="433" y="258" fill="#cc4444" font-family="monospace" font-size="10">Greisen-Zatsepin-Kuzmin limit</text>

  <!-- Galactic / Extragalactic label -->
  <text x="170" y="130" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">galactic</text>
  <text x="390" y="255" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">extragalactic</text>

  <!-- Title -->
  <text x="360" y="16" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Cosmic Ray Spectrum (schematic, log-log)</text>
</svg>`,
        caption:
          'The particle flux falls as a power law of energy. At the "knee" (~one thousand trillion electron-volts) the slope steepens — the galactic magnetic field can no longer confine the most energetic particles. The "ankle" (~one million trillion electron-volts) marks the transition to extragalactic sources. The Greisen-Zatsepin-Kuzmin limit is the theoretical high-energy cutoff caused by interaction with the cosmic microwave background.',
      },
    },

    {
      heading: 'Where They Are Born: Galactic Sources',
      level: 2,
      paragraphs: [
        'Most cosmic rays with energies below the _knee_ are accelerated within our own Galaxy. The leading mechanism is **first-order Fermi acceleration** at shock waves in supernova remnants. When a massive star explodes, it hurls its outer layers into space at thousands of kilometers per second. At the boundary between this expanding shell and the interstellar medium, a shock front forms. A charged particle caught in this zone is scattered by magnetic irregularities on both sides of the front and gains a small increment of energy each time it crosses. Repeat this enough times and an ordinary proton can reach extraordinary energies.',

        'This mechanism, developed theoretically by Enrico Fermi in the middle of the twentieth century, naturally explains the observed _power-law_ spectrum. Supernova remnant shocks sustain acceleration for tens of thousands of years. The **Fermi** gamma-ray telescope confirmed this picture in the twenty-first century: supernova remnants show gamma-ray photons at precisely the energies characteristic of the decay of pions produced when accelerated protons collide with the interstellar gas.',

        'Pulsar wind nebulae, microquasars, and neutron star mergers all contribute as well, particularly for electrons and positrons. But supernova remnants remain the most compelling galactic accelerators for protons up through the knee of the spectrum.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-rays-snr-acceleration',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: supernova remnant shock wave accelerating cosmic ray particles. ' +
          'Expanding shell of glowing gas and plasma in deep space, shock front shown as a bright arc. ' +
          'Charged particles (shown as bright blue and orange dots with motion trails) bouncing back and forth across the shock boundary, ' +
          'gaining energy with each crossing. Magnetic field lines shown as cyan curves. Dark space background. ' +
          'Add the following text labels on the image: "shock front", "cosmic ray particle", "magnetic scattering", "Fermi acceleration", "supernova remnant".',
        alt: 'A supernova remnant shock wave accelerating charged particles through the Fermi mechanism',
        caption:
          'Supernova remnants are the best confirmed galactic accelerators of cosmic rays. The Fermi telescope detected gamma-ray photons from their shock fronts, directly indicating proton acceleration to colossal energies.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Extragalactic Giants: Active Galactic Nuclei and Gamma-Ray Bursts',
      level: 2,
      paragraphs: [
        'Above the _knee_, the galactic magnetic field is too weak to hold particles inside the Milky Way. They come from afar. Two leading candidates are **active galactic nuclei** and **gamma-ray bursts**.',

        'An active galactic nucleus is a supermassive black hole actively consuming matter. The relativistic jets it produces can extend millions of light-years and develop magnetic fields and shock waves on colossal scales at their bases. The total acceleration power in such systems can exceed the output of billions of stars. The **Pierre Auger Observatory** in Argentina detected a statistically significant correlation between the arrival directions of the most energetic particles and the locations of active galactic nuclei in the relatively nearby universe.',

        'Gamma-ray bursts — the most powerful individual explosions in the observable universe — are also compelling candidates. In seconds or minutes they release more energy than the Sun will emit across ten billion years of its entire existence. The character of their emission points to ultrarelativistic shock waves inside the jet — an ideal arena for Fermi acceleration. Direct confirmation remains elusive: charged particles are deflected by magnetic fields along the way, and reconstructing their original source location is extremely difficult.',
      ],
    },

    {
      heading: 'The Greisen-Zatsepin-Kuzmin Limit — the Ceiling of the Universe',
      level: 2,
      paragraphs: [
        'In 1966, independently of one another, American physicist Kenneth Greisen and Soviet scientists Georgiy Zatsepin and Vadim Kuzmin calculated that extremely energetic protons traveling through intergalactic space would inevitably interact with photons of the cosmic microwave background and lose energy. Above a certain threshold — near five million trillion electron-volts times one million — a proton reacts with a background photon and converts into a pion plus a neutron, or a pion plus a lower-energy proton. Each collision "shaves" the energy. The consequence: ultra-high-energy cosmic rays cannot reach us from distances greater than a few hundred million light-years. The universe itself acts as a filter.',

        'The Pierre Auger Observatory confirmed that above this threshold there are indeed far fewer particles than simpler models would predict. But the precise shape of the spectrum in this region is still debated — whether this is a true Greisen-Zatsepin-Kuzmin suppression or simply a running-out of source power.',
      ],
    },

    {
      heading: 'The Oh-My-God Particle and Physics at the Edge',
      level: 3,
      paragraphs: [
        'In 1991, the **HiRes** detector over the state of Utah recorded an event researchers immediately dubbed the "Oh-My-God particle." A proton — or a heavy nucleus — carrying an energy of approximately three times ten to the power of twenty electron-volts. This number is so absurd that an analogy helps: the kinetic energy of a tennis ball traveling at one hundred and forty kilometers per hour, packed into _one_ subatomic particle. It was moving at a speed differing from the speed of light by roughly one part in ten to the twenty-fourth power.',

        'No theoretical acceleration mechanism known at the time could explain that energy. Since then, a handful of events in this range have been found. They appear to exceed the theoretical Greisen-Zatsepin-Kuzmin limit — which either means a very nearby source, or points toward physics we do not yet understand.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-rays-auger-observatory',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: Pierre Auger Observatory at night in the Argentine Pampa. ' +
          'Wide flat landscape under a brilliant starry sky, multiple water tank detectors spread across the pampas glowing faintly, ' +
          'fluorescence detector telescope pointing up with a light beam, distant Andes mountains on horizon. ' +
          'Hard sci-fi style, dark sky, dramatic wide shot. ' +
          'Add the following text labels on the image: "Pierre Auger Observatory", "surface detector tank", "fluorescence telescope", "3000 km2 array".',
        alt: 'Pierre Auger Observatory in Argentina at night — a vast array of detectors spread across the Pampas under a starry sky',
        caption:
          'The Auger Observatory covers three thousand square kilometers and is the world\'s largest detector of ultra-high-energy cosmic rays. It combines six hundred and four surface water tanks and twenty-seven fluorescence telescopes.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Air Showers: How We Detect Them',
      level: 2,
      paragraphs: [
        'A primary cosmic ray never reaches Earth\'s surface intact. When a high-energy proton strikes a nitrogen or oxygen nucleus in the upper atmosphere, it triggers a cascade of secondary particles — an **air shower**, more formally an extensive air shower. A single proton with energy above one quadrillion electron-volts spawns billions of secondary particles: pions, muons, electrons, positrons, and gamma-ray photons. This cloud — kilometers wide but only a few meters thick — races toward the ground at a speed extremely close to the speed of light.',

        'This is what we actually detect at the surface. An array of detectors — at Auger, tanks of purified water or scintillators — records the moment the shower front arrives. By triangulating the arrival times at different detectors, physicists reconstruct the arrival direction of the primary particle and its energy. Fluorescence telescopes record the shower track in ultraviolet: excited nitrogen in the air emits a faint glow. Together, the two techniques provide a stereoscopic picture.',

        'For lower-energy particles — starting around one billion electron-volts — detectors catch the secondary particles directly. Cosmic muons penetrate even kilometers of rock. These _muons_ are the dominant source of natural radiation dose for humans at sea level.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Air Shower from a Cosmic Ray',
        svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="360" fill="rgba(10,15,25,0.5)"/>

  <!-- Space region -->
  <rect x="0" y="0" width="640" height="60" fill="rgba(5,10,20,0.7)"/>
  <text x="12" y="20" fill="#667788" font-family="monospace" font-size="9">Space</text>

  <!-- Atmosphere region -->
  <rect x="0" y="60" width="640" height="230" fill="rgba(10,25,50,0.3)"/>
  <text x="12" y="78" fill="#667788" font-family="monospace" font-size="9">Atmosphere (100 km)</text>

  <!-- Ground -->
  <rect x="0" y="290" width="640" height="70" fill="rgba(20,30,15,0.5)"/>
  <text x="12" y="308" fill="#667788" font-family="monospace" font-size="9">Surface</text>
  <line x1="0" y1="290" x2="640" y2="290" stroke="#334455" stroke-width="1.5"/>

  <!-- Primary cosmic ray (incoming) -->
  <line x1="320" y1="0" x2="320" y2="68" stroke="#ff8844" stroke-width="3"/>
  <polygon points="320,68 315,56 325,56" fill="#ff8844"/>
  <text x="328" y="38" fill="#ff8844" font-family="monospace" font-size="10">primary particle</text>

  <!-- First interaction point -->
  <circle cx="320" cy="80" r="5" fill="#ffffff"/>

  <!-- Cascade — generation 1 -->
  <line x1="320" y1="80" x2="285" y2="130" stroke="#7bb8ff" stroke-width="1.8"/>
  <line x1="320" y1="80" x2="320" y2="135" stroke="#7bb8ff" stroke-width="1.8"/>
  <line x1="320" y1="80" x2="355" y2="130" stroke="#7bb8ff" stroke-width="1.8"/>

  <!-- Generation 1 circles -->
  <circle cx="285" cy="130" r="4" fill="#7bb8ff"/>
  <circle cx="320" cy="135" r="4" fill="#44ff88"/>
  <circle cx="355" cy="130" r="4" fill="#7bb8ff"/>

  <!-- Cascade — generation 2 (left branch) -->
  <line x1="285" y1="130" x2="255" y2="185" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="285" y1="130" x2="285" y2="188" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="285" y1="130" x2="314" y2="185" stroke="#7bb8ff" stroke-width="1.5"/>

  <!-- Generation 2 (center branch) -->
  <line x1="320" y1="135" x2="308" y2="190" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="320" y1="135" x2="332" y2="190" stroke="#44ff88" stroke-width="1.5"/>

  <!-- Generation 2 (right branch) -->
  <line x1="355" y1="130" x2="326" y2="185" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="355" y1="130" x2="355" y2="188" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="355" y1="130" x2="385" y2="185" stroke="#7bb8ff" stroke-width="1.5"/>

  <!-- Generation 3 — many small lines -->
  <line x1="255" y1="185" x2="238" y2="240" stroke="#aabbcc" stroke-width="1"/>
  <line x1="255" y1="185" x2="258" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="285" y1="188" x2="272" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="285" y1="188" x2="292" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="314" y1="185" x2="305" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="314" y1="185" x2="320" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="308" y1="190" x2="302" y2="244" stroke="#44ff88" stroke-width="1" opacity="0.7"/>
  <line x1="332" y1="190" x2="334" y2="244" stroke="#44ff88" stroke-width="1" opacity="0.7"/>
  <line x1="326" y1="185" x2="316" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="355" y1="188" x2="348" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="355" y1="188" x2="362" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="385" y1="185" x2="376" y2="242" stroke="#aabbcc" stroke-width="1"/>
  <line x1="385" y1="185" x2="392" y2="242" stroke="#aabbcc" stroke-width="1"/>

  <!-- Ground detectors -->
  <rect x="200" y="290" width="18" height="12" fill="#446688" rx="2"/>
  <rect x="280" y="290" width="18" height="12" fill="#446688" rx="2"/>
  <rect x="355" y="290" width="18" height="12" fill="#446688" rx="2"/>
  <rect x="430" y="290" width="18" height="12" fill="#446688" rx="2"/>
  <text x="290" y="318" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">surface detectors</text>

  <!-- Labels -->
  <text x="420" y="88" fill="#ffffff" font-family="monospace" font-size="9">first collision (~20 km)</text>
  <text x="420" y="138" fill="#7bb8ff" font-family="monospace" font-size="9">pions, kaons</text>
  <text x="420" y="192" fill="#44ff88" font-family="monospace" font-size="9">muons, e+, e-, photons</text>
  <text x="420" y="248" fill="#aabbcc" font-family="monospace" font-size="9">shower at ground level</text>

  <!-- Title -->
  <text x="320" y="348" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">Extensive Air Shower (schematic)</text>
</svg>`,
        caption:
          'The primary particle collides with atmospheric atoms at roughly twenty kilometers altitude. The cascade multiplies geometrically — thousands, then millions of secondary particles. At ground level, mostly muons and electrons remain. An array of detectors reconstructs the direction back to the original incoming trajectory.',
      },
    },

    {
      heading: 'IceCube and Neutrinos as Multi-Messenger Probes',
      level: 2,
      paragraphs: [
        'The central problem with observing sources of ultra-high-energy cosmic rays is that charged particles are deflected by magnetic fields and "forget" where they came from. But there are neutral messengers that travel straight and are deflected by nothing: **neutrinos and gamma-ray photons**.',

        'When an accelerated proton collides with matter or a photon field near its source, it produces pions. Charged pions decay into muons and neutrinos. These neutrinos travel undeflected across the entire Galaxy and across intergalactic space. The **IceCube** detector in Antarctica — a cubic kilometer of ice threaded with photosensor strings buried up to two kilometers deep — began detecting neutrinos from astrophysical sources in 2013. That discovery launched neutrino astronomy as a genuine observational discipline.',

        'Since 2022, IceCube has accumulated enough statistics to associate a neutrino excess with specific sources: the Seyfert galaxy NGC 1068 (at a distance of more than forty million light-years) and our own Galaxy as a whole — a diffuse neutrino glow from the galactic disk. This is the first direct evidence that hadronic acceleration (the acceleration of protons and nuclei) actually occurs in these systems. The era of multi-messenger astrophysics — simultaneous observation through gravitational waves, neutrinos, gamma-ray photons, and charged particles — has only just begun.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-rays-icecube',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: IceCube Neutrino Observatory at the South Pole. ' +
          'Deep cross-section view through Antarctic ice showing strings of digital optical modules (glowing blue spheres) deployed in a cubic kilometer grid, ' +
          'a neutrino interaction shown as a bright blue Cherenkov light cone expanding from a point deep in the ice, ' +
          'surface station visible above the ice surface. Dark blue-black ice, hard sci-fi style. ' +
          'Add the following text labels on the image: "IceCube detector", "optical module string", "Cherenkov light cone", "neutrino interaction", "2500 m depth".',
        alt: 'IceCube detector in Antarctica — a cubic kilometer of ice instrumented with photosensors detecting Cherenkov light from neutrino interactions',
        caption:
          'IceCube contains five thousand one hundred and sixty digital optical modules on eighty-six vertical strings frozen deep in Antarctic ice. The first detection of an astrophysical neutrino flux in 2013 opened neutrino astronomy as an observational science.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Effects on Earth: From Clouds to Processors',
      level: 2,
      paragraphs: [
        'Cosmic rays are not an abstraction from distant space. Their effects are measurable and felt every day.',

        '**Radiation dose in aviation.** At cruising altitude — roughly nine to eleven kilometers — the cosmic ray flux is hundreds of times higher than at sea level. Airline crews accumulate between two and six millisieverts per year — comparable to the total natural background radiation dose at ground level. The International Commission on Radiological Protection classifies aviation personnel as _occupationally exposed_ workers.',

        '**Single-event upsets in electronics.** When a muon or neutron from an air shower passes through a silicon chip, it can ionize enough charge carriers to flip a single bit in memory or a processor register — a _single-event upset_. Modern chips have smaller transistors and are more susceptible to this effect. Designers of aviation and spacecraft electronics are required to account for these upsets in reliability architectures.',

        '**The cloud seeding hypothesis.** Danish physicist Henrik Svensmark proposed in the nineteen-nineties that ionization of the atmosphere by cosmic rays helps seed cloud droplet nucleation. If cosmic ray intensity varies with solar activity — since the Sun\'s magnetic field partially deflects galactic cosmic rays — this could link the solar cycle to climate. The **CLOUD** experiment at the CERN accelerator tested the mechanism under laboratory conditions. Result: the effect is real, but far too weak to be climatically significant. The scientific consensus is that cosmic rays are not a meaningful driver of current climate change.',

        '**Carbon-14 as a clock.** Cosmic rays entering the atmosphere interact with nitrogen and produce radioactive carbon-14 at an approximately steady rate. This made radiocarbon dating possible — one of the most reliable tools in archaeology and geology for the last ten thousand years.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-rays-effects-earth',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: montage showing three effects of cosmic rays on Earth. ' +
          'Left panel: cross-section of aircraft at altitude with muon tracks shown passing through the fuselage, crew silhouetted inside. ' +
          'Center panel: close-up of a microchip with a single particle track causing a bit flip shown as a glowing point. ' +
          'Right panel: carbon-14 production in atmosphere — cosmic ray hitting nitrogen nucleus, creating radioactive carbon absorbed by a tree. ' +
          'Dark scientific illustration style, labeled panels. ' +
          'Add the following text labels on the image: "crew radiation dose", "single-event upset", "carbon-14 production".',
        alt: 'Three effects of cosmic rays on Earth: crew radiation exposure, electronics bit flips, and carbon-14 production',
        caption:
          'Cosmic rays have practical consequences: airline crews are a category of occupationally exposed workers, and single-event upsets in computers at high altitude and in space require dedicated protection in safety-critical systems.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'What Remains Open',
      level: 2,
      paragraphs: [
        'Despite more than a century of research, cosmic rays preserve several fundamental mysteries. Where exactly are particles accelerated above the _knee_ — and can a single source class account for the entire observed range? Is the Greisen-Zatsepin-Kuzmin limit a genuine ceiling, or are the observed deviations from it real new physics? What precisely is the role of gamma-ray bursts in producing the most energetic particles?',

        'The next generation of detectors — the upgraded AugerPrime array (already operational), and new neutrino detectors IceCube-Gen2 and the Pacific Ocean Neutrino Experiment — will provide over the coming decade the statistics needed to answer at least some of these questions. Combining channels — charged particles together with neutrinos and gamma-ray photons — promises to finally reveal the addresses of the universe\'s most powerful accelerators.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Cosmic ray',
      definition:
        'A charged particle — predominantly a proton or atomic nucleus — traveling through interstellar or intergalactic space and reaching Earth from outside the atmosphere.',
    },
    {
      term: 'Fermi acceleration',
      definition:
        'A mechanism by which a charged particle gains energy through repeated reflections off shock waves or magnetic irregularities. First-order Fermi acceleration at supernova remnant shocks is the leading mechanism for galactic cosmic rays.',
    },
    {
      term: 'Extensive air shower',
      definition:
        'A cascade of secondary particles — muons, electrons, positrons, and photons — produced when a primary cosmic ray strikes atoms in the upper atmosphere. Can contain billions of particles.',
    },
    {
      term: 'Greisen-Zatsepin-Kuzmin limit',
      definition:
        'The theoretical upper energy bound for extragalactic protons (~five times ten to the nineteenth power electron-volts), above which they interact intensely with cosmic microwave background photons and lose energy, limiting their travel range to a few hundred million light-years.',
    },
    {
      term: 'Knee of the spectrum',
      definition:
        'A kink in the cosmic ray energy spectrum near one thousand trillion electron-volts where the spectrum steepens. Associated with the transition from galactic to extragalactic sources.',
    },
    {
      term: 'Astrophysical neutrino',
      definition:
        'A high-energy neutrino produced when accelerated protons collide with matter or a photon field near an astrophysical source. Unlike charged particles, it travels in a straight line and points back to its origin.',
    },
    {
      term: 'Single-event upset',
      definition:
        'An error in a microchip caused by a charged particle — typically a muon or neutron from an air shower — passing through a sensitive node and ionizing enough charge to flip a bit. A practical concern for aviation and spacecraft electronics.',
    },
    {
      term: 'Active galactic nucleus',
      definition:
        'The central region of a galaxy where a supermassive black hole is actively accreting matter and producing relativistic jets, intense electromagnetic emission, and likely ultra-high-energy cosmic rays.',
    },
    {
      term: 'Fluorescence detector',
      definition:
        'A telescope that records the faint ultraviolet glow of excited atmospheric nitrogen along an air shower track. Enables measurement of the shower development profile and the energy of the primary particle.',
    },
  ],

  quiz: [
    {
      question: 'What did Victor Hess discover in 1912, and what hypothesis did it disprove?',
      options: [
        'He found that ionizing radiation decreases with altitude, disproving the existence of X-ray stars',
        'He measured that ionization increases with altitude, proving the extraterrestrial origin of the particles',
        'He discovered radioactive decay of uranium at high altitudes',
        'He first detected neutrinos from the atmosphere',
      ],
      correctIndex: 1,
      explanation:
        'Hess expected ionization to fall with distance from radioactive rocks in the Earth. Instead, above five kilometers, it rose — unambiguously pointing to a source outside Earth. He received the Nobel Prize for this discovery.',
    },
    {
      question: 'What is the "knee" in the cosmic ray spectrum?',
      options: [
        'The peak of particle flux at the lowest energies',
        'A point where the spectrum flattens due to new sources appearing',
        'A steepening of the spectrum near one thousand trillion electron-volts, above which the galactic field can no longer confine particles',
        'The threshold energy at which particles stop being detected',
      ],
      correctIndex: 2,
      explanation:
        'Below the knee, galactic sources dominate. Above it, the galactic magnetic field cannot hold particles, and the spectral slope changes. The "ankle" near one million trillion electron-volts marks a possible transition to extragalactic sources.',
    },
    {
      question: 'Why is IceCube important for cosmic ray physics if it detects neutrinos?',
      options: [
        'Neutrinos and cosmic rays are separate phenomena; IceCube is unrelated to them',
        'Neutrinos are produced in the same sources that accelerate protons, and travel straight to us without deflection',
        'IceCube detects only atmospheric neutrinos from the solar wind',
        'Neutrinos are the primary cosmic rays at the highest energies',
      ],
      correctIndex: 1,
      explanation:
        'Accelerated protons colliding with matter produce pions, which decay into neutrinos. Unlike charged particles, neutrinos travel in straight lines and point back to their source. IceCube\'s 2013 detection confirmed that hadronic acceleration occurs in real astrophysical objects.',
    },
    {
      question: 'What practical application came from the discovery that cosmic rays produce carbon-14 in the atmosphere?',
      options: [
        'It explains the aurora borealis at polar latitudes',
        'It is the basis of radiocarbon dating of organic remains',
        'It is the source of increased radiation for aircraft crews',
        'It is the cloud-seeding mechanism proposed by Svensmark',
      ],
      correctIndex: 1,
      explanation:
        'Carbon-14 is produced when neutrons from air showers react with atmospheric nitrogen nuclei and enters living organisms through the food chain. After death, the carbon-14 content decreases with a known half-life, allowing samples to be dated to within decades.',
    },
    {
      question: 'Why cannot ultra-high-energy cosmic rays reach us from very distant sources?',
      options: [
        'They are absorbed by dark matter in intergalactic space',
        'Their speed decreases due to the expansion of the universe',
        'They interact with cosmic microwave background photons and lose energy — the Greisen-Zatsepin-Kuzmin limit',
        'The Milky Way\'s magnetic field deflects them back toward their source',
      ],
      correctIndex: 2,
      explanation:
        'Protons at the highest energies interact with microwave background photons and produce pions, losing a significant fraction of their energy each time. This process limits the distance from which the most energetic particles can travel to a few hundred million light-years.',
    },
  ],

  sources: [
    {
      title: 'Hess V.F. — Über Beobachtungen der durchdringenden Strahlung bei sieben Freiballonfahrten',
      url: 'https://doi.org/10.1002/andp.19123441106',
      meta: 'Physikalische Zeitschrift 13, 1084–1091, 1912',
    },
    {
      title: 'Pierre Auger Collaboration — Observation of a large-scale anisotropy in cosmic-ray arrival directions',
      url: 'https://www.science.org/doi/10.1126/science.aan4338',
      meta: 'Science 357, 1266–1270, 2017',
    },
    {
      title: 'IceCube Collaboration — Evidence for high-energy extraterrestrial neutrinos at the IceCube detector',
      url: 'https://www.science.org/doi/10.1126/science.1242856',
      meta: 'Science 342, 1242856, 2013 (open access)',
    },
    {
      title: 'IceCube Collaboration — Neutrino emission from the Seyfert galaxy NGC 1068',
      url: 'https://www.science.org/doi/10.1126/science.abg3395',
      meta: 'Science 378, 538–543, 2022',
    },
    {
      title: 'Fermi LAT Collaboration — Detection of the characteristic pion-decay signature in supernova remnants',
      url: 'https://www.science.org/doi/10.1126/science.1231160',
      meta: 'Science 339, 807–811, 2013',
    },
    {
      title: 'Greisen K. — End to the Cosmic-Ray Spectrum?',
      url: 'https://link.aps.org/doi/10.1103/PhysRevLett.16.748',
      meta: 'Physical Review Letters 16, 748–750, 1966',
    },
    {
      title: 'Zatsepin G.T., Kuzmin V.A. — Upper Limit of the Spectrum of Cosmic Rays',
      url: 'https://inspirehep.net/literature/48938',
      meta: 'JETP Letters 4, 78–80, 1966',
    },
    {
      title: 'CLOUD Collaboration — Ion-induced nucleation of pure biogenic particles',
      url: 'https://www.nature.com/articles/nature21032',
      meta: 'Nature 533, 521–526, 2016',
    },
    {
      title: 'Blasi P. — The origin of galactic cosmic rays',
      url: 'https://doi.org/10.1007/s00159-013-0070-7',
      meta: 'Astronomy and Astrophysics Review 21, 70, 2013 (review)',
    },
    {
      title: 'NASA — Cosmic Rays (overview)',
      url: 'https://science.nasa.gov/science-research/heliophysics/cosmic-rays/',
      meta: 'NASA Science, updated 2025',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
