import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'structure-formation',
  language: 'en',
  section: 'cosmology',
  order: 6,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Structure Formation in the Universe',
  subtitle:
    'How an almost perfectly smooth gas became filaments, walls, and nodes of the cosmic web — and which invisible matter made it possible.',

  hero: {
    cacheKey: 'structure-formation-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the cosmic web — large-scale structure of the universe. ' +
      'A vast three-dimensional network of glowing filaments of galaxies and galaxy clusters, ' +
      'interconnected like a luminous spider web against deep black space. ' +
      'Bright nodes at filament intersections represent massive galaxy clusters. ' +
      'Dark void regions between filaments are nearly empty. ' +
      'Hard sci-fi style, dark space background #020510, deep blue and cyan glowing filaments, warm orange-white cluster nodes. ' +
      'Add the following text labels on the image: "filaments", "voids", "galaxy clusters", "cosmic web". ' +
      'Aspect ratio 16:9.',
    alt:
      'The cosmic web — a three-dimensional network of filaments, walls, and nodes of galaxies and galaxy clusters against nearly empty voids.',
    caption:
      'The large-scale structure of the universe: galaxies are not spread uniformly but gathered into filaments, walls, and nodes, ' +
      'separated by nearly empty voids. Artistic reconstruction based on simulation data and the Sloan Digital Sky Survey.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Seen from the scale of hundreds of millions of light-years, the universe looks like a sponge. ' +
        'Or a beaded web: strands of galaxies interweave, converge at nodes — massive clusters — ' +
        'and surround gigantic voids where almost nothing exists. ' +
        'This is the _cosmic web_, and it is the largest known structure in the universe.',

        'Immediately after the Big Bang, nothing like it existed. ' +
        'Matter was distributed almost perfectly uniformly — with deviations of only one part in one hundred thousand. ' +
        'How that near-perfect smoothness transformed into a web of galaxies and yawning voids ' +
        'spanning hundreds of millions of light-years is one of the deepest questions in cosmological physics. ' +
        'The answer begins with gravity, continues with dark matter, and ends with sound waves ' +
        'that once rang through the plasma of the primordial universe.',
      ],
    },

    {
      heading: 'Seeds in the Uniformity: Where the First Fluctuations Came From',
      level: 2,
      paragraphs: [
        'The maps of the Cosmic Microwave Background produced by the European Space Agency\'s Planck mission ' +
        'show a nearly perfectly uniform temperature of 2.725 kelvin across the entire sky. ' +
        'But "nearly" is the operative word. Temperature fluctuations at the level of millionths of a kelvin ' +
        'correspond to microscopic density imbalances in the early universe. ' +
        'Where there was slightly more matter, the gravitational pull was slightly stronger.',

        'These fluctuations are not random noise. They have a quantum origin: during inflation, ' +
        'in the first fractions of a second after the Big Bang, ' +
        'quantum fluctuations of a vacuum field were "stretched" to cosmological scales ' +
        'and frozen into the geometry of space-time. ' +
        'Inflation converted microscopic quantum irregularities into the primordial seeds of all cosmic structure. ' +
        'Hidden inside those tiny deviations from uniformity was the future of every galaxy, cluster, and filament.',
      ],
    },

    {
      heading: 'Dark Matter as the Skeleton: Without It, Structure Would Not Exist',
      level: 2,
      paragraphs: [
        'Ordinary matter — the atoms that make up stars, gas, and ourselves — ' +
        'interacts with photons and could not begin to collapse in the early universe ' +
        'while the plasma remained opaque. ' +
        'Radiation pressure dispersed any compressed cloud back outward. ' +
        'If the universe contained only ordinary matter, structures would have started forming too late ' +
        'and would have remained far smaller than what we observe.',

        'Dark matter — matter that interacts only gravitationally and is not coupled to photons — ' +
        'began to collapse much earlier, while the universe was still an opaque plasma. ' +
        'It formed _dark matter halos_: gravitational wells into which ordinary matter fell ' +
        'after recombination, once the plasma became transparent and radiation pressure vanished. ' +
        'Without those ready-made gravitational wells, galaxies would simply not have had enough time ' +
        'to form in 13.8 billion years.',

        'Dark matter constitutes approximately 27 percent of the total energy budget of the universe, ' +
        'while ordinary baryonic matter accounts for only about 5 percent. ' +
        'It is invisible — it neither emits, absorbs, nor reflects light — ' +
        'but its presence is read through gravitational lensing, galaxy rotation curves, ' +
        'and the very existence of large-scale structure. ' +
        'Dark matter is the load-bearing framework upon which the entire visible web is built.',
      ],
    },

    {
      image: {
        cacheKey: 'structure-formation-dark-matter-halo',
        prompt:
          'Scientific illustration for a science encyclopedia: dark matter halos and galaxy formation. ' +
          'A cross-section or 3D cutaway view showing: outer diffuse dark matter halo (shown as blue-purple translucent glow), ' +
          'intermediate gas accretion shell, inner bright visible galaxy at center with stars. ' +
          'Filaments of dark matter connecting multiple halos in the background like a cosmic web. ' +
          'Hard sci-fi style, dark background, blue-purple palette for dark matter, warm orange-white for visible galaxy. ' +
          'Add the following text labels on the image: "dark matter halo", "gas infall", "visible galaxy", "filament". ' +
          'Aspect ratio 4:3.',
        alt:
          'Diagram of a dark matter halo: the invisible gravitational scaffold surrounding a visible galaxy, with a dark matter filament connecting to neighboring halos.',
        caption:
          'A dark matter halo — the invisible gravitational well that drew in gas and gave birth to a galaxy. ' +
          'Dark matter does not shine, but it determines where and how all structures form.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Hierarchical Assembly: Small First, Large Later',
      level: 2,
      paragraphs: [
        'Structures in the universe assembled from the bottom up. ' +
        'Small clouds of gas and dark matter collapsed under gravity first — ' +
        'producing the earliest stars and dwarf galaxies. ' +
        'These then merged and accumulated into larger systems. ' +
        'Galaxies gathered into groups, groups into clusters, clusters into superclusters. ' +
        'This principle is called _hierarchical assembly_, and it is confirmed both theoretically and observationally.',

        'Massive galaxy clusters — the heaviest gravitationally bound objects in the universe — ' +
        'are relatively young: they are still accreting matter and merging at this very moment. ' +
        'At high redshifts — that is, in the early universe — no clusters of that scale existed. ' +
        'Instead, there were early small galaxies, which we now detect with the James Webb Space Telescope.',

        'Hierarchical assembly is a consequence of dark matter being "cold": ' +
        'dark matter particles move far below the speed of light and cannot escape from small structures. ' +
        'If dark matter were "hot" — like massive neutrinos — large structures would have formed first, ' +
        'and small ones would have fragmented out of them later. ' +
        'Observations unambiguously support cold dark matter: small structures are demonstrably older.',
      ],
    },

    {
      heading: 'Baryon Acoustic Oscillations: Frozen Sound in the Fabric of the Universe',
      level: 2,
      paragraphs: [
        'In the early universe, while it remained an opaque plasma, ' +
        'every region of elevated density was simultaneously a source of pressure. ' +
        'Gravity compressed the matter; the radiation pressure of photons pushed it back. ' +
        'This created sound waves — much like those in a musical instrument — ' +
        'propagating through the plasma at enormous speed, roughly half the speed of light.',

        'When the universe cooled to the moment of recombination and became transparent, ' +
        'photons streamed free and the sound waves abruptly stopped. ' +
        'They were "frozen" into the matter distribution, leaving an imprint: ' +
        'a preferred excess of matter density at a certain distance from each primordial overdensity. ' +
        'That distance corresponds to how far a sound wave traveled between the Big Bang and recombination — ' +
        'approximately 150 megaparsecs, or roughly 490 million light-years. ' +
        'This is the _baryon acoustic scale_.',

        'This scale manifests in the statistics of galaxy distribution: ' +
        'at a separation of roughly 150 megaparsecs, galaxies are slightly more likely to be neighbors ' +
        'than at adjacent distances. ' +
        'This subtle excess — the _baryon acoustic oscillation_ signal — ' +
        'is the cosmologist\'s standard ruler. ' +
        'Because we know its physical size from theory and can measure its angular size in the sky, ' +
        'we can calculate how the universe has expanded along the entire trajectory from recombination to today.',
      ],
    },

    {
      image: {
        cacheKey: 'structure-formation-bao-scale',
        prompt:
          'Scientific diagram for a science encyclopedia: Baryon Acoustic Oscillations scale in galaxy distribution. ' +
          'A correlation function or power spectrum plot showing galaxy clustering statistics. ' +
          'A clear bump or peak visible at ~150 Mpc scale on the x-axis (separation distance). ' +
          'Hard sci-fi style, dark background #020510, cyan/green accent color for the peak, ' +
          'monospace font labels. ' +
          'Add the following text labels on the image: ' +
          '"galaxy correlation", "BAO peak ~150 Mpc", "separation distance (Mpc)", "clustering strength". ' +
          'Aspect ratio 4:3.',
        alt:
          'Galaxy correlation function graph showing the baryon acoustic oscillation peak at approximately 150 megaparsecs.',
        caption:
          'Baryon acoustic oscillations — an excess of galaxy pairs at a characteristic separation of roughly 150 megaparsecs. ' +
          'This "frozen sound" serves as a standard ruler for measuring the expansion history of the universe.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Large Sky Surveys: How We Mapped the Web',
      level: 2,
      paragraphs: [
        'To see large-scale structure, you need to catalog millions of galaxies ' +
        'and measure their distances. ' +
        'In the late twentieth and early twenty-first centuries, ' +
        'several projects fundamentally transformed our picture of the universe.',

        'The Sloan Digital Sky Survey — one of the most influential projects in the history of astronomy — ' +
        'catalogued over three million galaxies and quasars ' +
        'and built the first detailed three-dimensional map of large-scale structure ' +
        'across a substantial portion of the observable universe. ' +
        'It was this survey that produced the first statistically significant detection ' +
        'of baryon acoustic oscillations in the galaxy distribution, in 2005.',

        'The Baryon Oscillation Spectroscopic Survey, a successor project, ' +
        'specialized in measuring dark energy through baryon acoustic oscillations ' +
        'and covered more than one million galaxies at greater distances. ' +
        'The Dark Energy Spectroscopic Instrument survey, launched in the mid-2010s, ' +
        'had by 2024 gathered data on more than five million galaxies and quasars. ' +
        'Its 2024 results refined the parameters of dark energy and large-scale structure ' +
        'with unprecedented precision, confirming the accelerated expansion of the universe ' +
        'and measuring the baryon acoustic scale across multiple cosmic epochs.',

        'The European Space Agency\'s Euclid mission, launched in 2023, ' +
        'is designed to produce the most complete three-dimensional map of the universe ' +
        'in the history of astronomy: more than one billion galaxies across one third of the sky, ' +
        'spanning the last ten billion years of cosmic evolution. ' +
        'Its first science images, published within months of launch, ' +
        'revealed a quality that exceeded the most optimistic pre-launch expectations.',
      ],
    },

    {
      image: {
        cacheKey: 'structure-formation-sdss-slice',
        prompt:
          'Photorealistic illustration for a science encyclopedia: galaxy redshift survey slice map. ' +
          'A thin wedge-shaped 2D slice through the universe showing galaxy positions as tiny dots of light, ' +
          'forming clear filaments, walls, and voids. The Earth or observer is at the pointed apex of the wedge. ' +
          'The pattern looks like a cosmic web cross-section. ' +
          'Hard sci-fi style, dark background, galaxies shown as pale blue-white dots, ' +
          'large empty void regions clearly visible. ' +
          'Add the following text labels on the image: ' +
          '"filaments", "voids", "walls", "galaxy clusters", "redshift survey slice". ' +
          'Aspect ratio 16:9.',
        alt:
          'A wedge-shaped slice of the large-scale structure from a galaxy redshift survey, showing filaments, walls, and voids.',
        caption:
          'A thin slice of a galaxy survey map: each dot is a galaxy. ' +
          'Filaments and walls of galaxies surround nearly empty voids. ' +
          'This structure emerged over 13.8 billion years from an almost perfectly uniform initial state.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Millennium Simulation and Its Successors: Testing Theory on a Supercomputer',
      level: 2,
      paragraphs: [
        'Analytically computing the gravitational evolution of billions of interacting particles is impossible. ' +
        'In the second half of the twentieth and the beginning of the twenty-first centuries, ' +
        'cosmologists therefore developed numerical simulations to reproduce the formation of structure in the universe.',

        'The Millennium simulation, carried out by the Max Planck Institute for Astrophysics in the early 2000s, ' +
        'was a turning point. It modeled more than ten billion dark matter particles ' +
        'in a cube 500 megaparsecs on a side — ' +
        'and reproduced a web of filaments, walls, and voids that matched real galaxy catalogs strikingly well. ' +
        'The simulation confirmed that the standard model of cold dark matter and dark energy ' +
        'reproduces the observed large-scale structure of the universe.',

        'Modern simulations — IllustrisTNG, EAGLE, FLAMINGO and others — ' +
        'include not only dark matter but also gas hydrodynamics, star formation, ' +
        'and feedback from supernovae and active galactic nuclei. ' +
        'They allow researchers to test how the microphysics of stellar winds influences ' +
        'the distribution of galaxies on megaparsec scales — ' +
        'a connection that would have sounded like science fiction a few decades ago.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Growth of Structure — From Uniformity to the Web',
        svg: `<svg viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="240" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="20" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Hierarchical growth of cosmic structure</text>

  <!-- Arrow axis (time) -->
  <line x1="40" y1="210" x2="660" y2="210" stroke="#334455" stroke-width="1"/>
  <polygon points="662,207 668,210 662,213" fill="#aabbcc"/>
  <text x="350" y="228" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">Time (from Big Bang to today)</text>

  <!-- Stage 1: uniform -->
  <rect x="40" y="50" width="100" height="140" rx="3" fill="rgba(51,68,85,0.3)" stroke="#334455" stroke-width="1"/>
  <text x="90" y="38" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Early epoch</text>
  <circle cx="60" cy="80" r="2" fill="#667788"/>
  <circle cx="75" cy="95" r="2" fill="#667788"/>
  <circle cx="90" cy="75" r="2" fill="#667788"/>
  <circle cx="105" cy="90" r="2" fill="#667788"/>
  <circle cx="120" cy="80" r="2" fill="#667788"/>
  <circle cx="65" cy="110" r="2" fill="#667788"/>
  <circle cx="80" cy="125" r="2" fill="#667788"/>
  <circle cx="100" cy="115" r="2" fill="#667788"/>
  <circle cx="115" cy="130" r="2" fill="#667788"/>
  <circle cx="55" cy="140" r="2" fill="#667788"/>
  <circle cx="75" cy="155" r="2" fill="#667788"/>
  <circle cx="95" cy="148" r="2" fill="#667788"/>
  <circle cx="118" cy="160" r="2" fill="#667788"/>
  <text x="90" y="205" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">Uniformity</text>

  <!-- Arrow -->
  <line x1="148" y1="120" x2="168" y2="120" stroke="#4488aa" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Stage 2: halos forming -->
  <rect x="170" y="50" width="130" height="140" rx="3" fill="rgba(68,85,110,0.3)" stroke="#4488aa" stroke-width="1"/>
  <text x="235" y="38" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Dark matter halos</text>
  <circle cx="200" cy="85" r="8" fill="rgba(68,136,170,0.2)" stroke="#4488aa" stroke-width="1"/>
  <circle cx="200" cy="85" r="3" fill="#4488aa"/>
  <circle cx="240" cy="110" r="10" fill="rgba(68,136,170,0.2)" stroke="#4488aa" stroke-width="1"/>
  <circle cx="240" cy="110" r="3" fill="#4488aa"/>
  <circle cx="215" cy="150" r="7" fill="rgba(68,136,170,0.2)" stroke="#4488aa" stroke-width="1"/>
  <circle cx="215" cy="150" r="2.5" fill="#4488aa"/>
  <circle cx="270" cy="75" r="6" fill="rgba(68,136,170,0.2)" stroke="#4488aa" stroke-width="1"/>
  <circle cx="270" cy="75" r="2" fill="#4488aa"/>
  <circle cx="260" cy="155" r="9" fill="rgba(68,136,170,0.2)" stroke="#4488aa" stroke-width="1"/>
  <circle cx="260" cy="155" r="3" fill="#4488aa"/>
  <text x="235" y="205" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">First structures</text>

  <!-- Arrow -->
  <line x1="308" y1="120" x2="328" y2="120" stroke="#7bb8ff" stroke-width="1.5"/>
  <polygon points="328,117 334,120 328,123" fill="#7bb8ff"/>

  <!-- Stage 3: filaments -->
  <rect x="330" y="50" width="150" height="140" rx="3" fill="rgba(68,85,120,0.3)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="405" y="38" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Filaments and walls</text>
  <line x1="355" y1="80" x2="390" y2="110" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="390" y1="110" x2="440" y2="90" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="390" y1="110" x2="420" y2="150" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="440" y1="90" x2="465" y2="130" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="420" y1="150" x2="465" y2="130" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="355" cy="80" r="4" fill="#7bb8ff"/>
  <circle cx="390" cy="110" r="5" fill="#7bb8ff"/>
  <circle cx="440" cy="90" r="4" fill="#7bb8ff"/>
  <circle cx="420" cy="150" r="4" fill="#7bb8ff"/>
  <circle cx="465" cy="130" r="5" fill="#7bb8ff"/>
  <text x="405" y="205" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">Web grows</text>

  <!-- Arrow -->
  <line x1="488" y1="120" x2="508" y2="120" stroke="#44ff88" stroke-width="1.5"/>
  <polygon points="508,117 514,120 508,123" fill="#44ff88"/>

  <!-- Stage 4: full cosmic web -->
  <rect x="510" y="50" width="150" height="140" rx="3" fill="rgba(40,80,60,0.2)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="585" y="38" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Cosmic web</text>
  <line x1="530" y1="75" x2="560" y2="95" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="560" y1="95" x2="610" y2="80" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="610" y1="80" x2="640" y2="110" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="560" y1="95" x2="580" y2="135" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="610" y1="80" x2="595" y2="130" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="580" y1="135" x2="595" y2="130" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="595" y1="130" x2="640" y2="155" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="530" y1="160" x2="580" y2="135" stroke="#44ff88" stroke-width="1.5"/>
  <circle cx="530" cy="75" r="3" fill="#44ff88"/>
  <circle cx="560" cy="95" r="6" fill="#44ff88"/>
  <circle cx="610" cy="80" r="5" fill="#44ff88"/>
  <circle cx="640" cy="110" r="3" fill="#44ff88"/>
  <circle cx="580" cy="135" r="4" fill="#44ff88"/>
  <circle cx="595" cy="130" r="7" fill="#44ff88"/>
  <circle cx="640" cy="155" r="4" fill="#44ff88"/>
  <circle cx="530" cy="160" r="3" fill="#44ff88"/>
  <text x="585" y="205" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">Today</text>
</svg>`,
        caption:
          'From uniformity to the cosmic web: hierarchical growth of structure. ' +
          'Dark matter halos assemble into filaments, filaments converge at cluster nodes, ' +
          'and nearly empty voids remain between them.',
      },
    },

    {
      heading: 'Voids: What Lives in Emptiness',
      level: 2,
      paragraphs: [
        'Voids — objects that receive far less attention than clusters and filaments — ' +
        'actually occupy most of the volume of the universe. ' +
        'The largest of them span 100 megaparsecs or more. ' +
        'The Bootes Void, discovered in the late twentieth century, ' +
        'is among the largest known: a cavity roughly 300 million light-years across ' +
        'where the number of galaxies is several times lower than the cosmic average.',

        'Voids are not absolutely empty — they contain galaxies, gas, and dark matter, ' +
        'but at far lower concentrations. ' +
        'Matter slowly "drains" out of voids toward filaments and nodes under gravity, ' +
        'and voids grow progressively more depleted over time. ' +
        'They are the negative imprint of the web: where filaments and clusters concentrate overdensities, ' +
        'voids are zones of deficit — the mirror structure of the same underlying physics.',

        'Void statistics have become a powerful cosmological tool. ' +
        'The distribution of void sizes, shapes, and internal density profiles ' +
        'is sensitive to the properties of dark energy, neutrino masses, ' +
        'and deviations from general relativity at large scales. ' +
        'The Euclid mission dedicates a significant fraction of its observing program ' +
        'specifically to cataloguing voids.',
      ],
    },

    {
      image: {
        cacheKey: 'structure-formation-void-filament',
        prompt:
          'Photorealistic illustration for a science encyclopedia: cosmic void versus filament contrast. ' +
          'A dramatic wide-field view showing a large dark cosmic void (nearly empty region) ' +
          'on the left side, with a bright dense galaxy filament and cluster node on the right side. ' +
          'The transition from void to filament shows gradual increase in galaxy density. ' +
          'Hard sci-fi style, dark space background, sparse pale galaxies in void, ' +
          'bright blue-white filament with orange cluster node on right. ' +
          'Add the following text labels on the image: "void", "filament", "galaxy cluster node", "~100 Mpc". ' +
          'Aspect ratio 16:9.',
        alt:
          'The contrast between a nearly empty cosmic void and a dense galaxy filament with a cluster node.',
        caption:
          'A void and a filament — two sides of the same gravitational dynamics. ' +
          'Matter drains from voids into filaments and nodes over billions of years.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The James Webb Space Telescope and Early Massive Structures: A New Puzzle',
      level: 2,
      paragraphs: [
        'The James Webb Space Telescope, which began science observations in 2022, ' +
        'has detected galaxy clusters and proto-clusters in epochs so early ' +
        'that the standard model can barely accommodate them. ' +
        'Some of the structures found at high redshifts — ' +
        'that is, when the universe was less than one billion years old — ' +
        'appear more massive and compact than typical simulations predict.',

        'The most widely discussed case is the detection of proto-clusters ' +
        'at redshifts around seven to eight ' +
        '(a universe younger than 700 to 800 million years). ' +
        'Standard simulations predict that structures of that scale ' +
        'should form only after several billion years. ' +
        'This may mean that the baryonic physics — star formation rates, feedback from black holes — ' +
        'differed in the early universe, or that the initial density fluctuations ' +
        'had a larger amplitude than assumed in the standard model.',

        'There is no definitive answer yet. Observations continue, ' +
        'and each new observing season with the Webb telescope either refines or complicates the picture. ' +
        'One thing is clear: structure formation in the universe turns out to be a more intricate ' +
        'and more interesting process than physicists believed even a decade ago.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: The Cosmic Web — Filaments, Walls, Voids, Nodes',
        svg: `<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="18" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Components of the cosmic web</text>

  <!-- Large void region (left-center) -->
  <ellipse cx="220" cy="170" rx="130" ry="100" fill="rgba(5,10,20,0.6)" stroke="#334455" stroke-width="1" stroke-dasharray="5,4"/>
  <text x="220" y="165" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">void</text>
  <text x="220" y="180" text-anchor="middle" fill="#334455" font-family="monospace" font-size="9">(empty region)</text>

  <!-- Small void top-right -->
  <ellipse cx="550" cy="85" rx="70" ry="50" fill="rgba(5,10,20,0.5)" stroke="#334455" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="550" y="82" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">void</text>

  <!-- Filaments -->
  <line x1="80" y1="55" x2="380" y2="55" stroke="#7bb8ff" stroke-width="2.5"/>
  <line x1="80" y1="55" x2="55" y2="270" stroke="#7bb8ff" stroke-width="2"/>
  <line x1="380" y1="55" x2="620" y2="260" stroke="#7bb8ff" stroke-width="2.5"/>
  <line x1="55" y1="270" x2="380" y2="270" stroke="#7bb8ff" stroke-width="2"/>
  <line x1="380" y1="270" x2="620" y2="260" stroke="#7bb8ff" stroke-width="2"/>
  <line x1="380" y1="55" x2="380" y2="270" stroke="#4488aa" stroke-width="1.5" stroke-dasharray="6,4"/>
  <line x1="80" y1="55" x2="380" y2="270" stroke="#4488aa" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>

  <!-- Wall (sheet) between filaments -->
  <polygon points="80,55 380,55 380,270 55,270" fill="rgba(68,136,170,0.05)" stroke="#4488aa" stroke-width="0.5" stroke-dasharray="3,3"/>
  <text x="195" y="240" text-anchor="middle" fill="#4488aa" font-family="monospace" font-size="9">wall (sheet)</text>

  <!-- Nodes / clusters -->
  <circle cx="80" cy="55" r="16" fill="rgba(255,136,68,0.3)" stroke="#ff8844" stroke-width="1.5"/>
  <circle cx="80" cy="55" r="7" fill="#ff8844"/>
  <text x="80" y="38" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">node</text>
  <circle cx="380" cy="55" r="20" fill="rgba(255,136,68,0.35)" stroke="#ff8844" stroke-width="2"/>
  <circle cx="380" cy="55" r="9" fill="#ff8844"/>
  <text x="380" y="35" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">cluster</text>
  <circle cx="55" cy="270" r="12" fill="rgba(255,136,68,0.25)" stroke="#ff8844" stroke-width="1.5"/>
  <circle cx="55" cy="270" r="5" fill="#ff8844"/>
  <circle cx="380" cy="270" r="15" fill="rgba(255,136,68,0.3)" stroke="#ff8844" stroke-width="1.5"/>
  <circle cx="380" cy="270" r="6" fill="#ff8844"/>
  <circle cx="620" cy="260" r="18" fill="rgba(255,136,68,0.35)" stroke="#ff8844" stroke-width="2"/>
  <circle cx="620" cy="260" r="8" fill="#ff8844"/>
  <text x="620" y="242" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">node</text>

  <!-- Labels for filaments -->
  <text x="230" y="46" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">filament</text>

  <!-- Scale note -->
  <text x="350" y="292" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Scale: hundreds of megaparsecs</text>
</svg>`,
        caption:
          'Components of the cosmic web: galaxy filaments, flat walls (sheets), ' +
          'node clusters, and nearly empty voids. ' +
          'This structure emerged over 13.8 billion years from microscopic initial fluctuations.',
      },
    },

    {
      heading: 'What Remains Open',
      level: 2,
      paragraphs: [
        'The standard model of cold dark matter and dark energy brilliantly reproduces ' +
        'the large-scale structure of the universe on scales exceeding a few megaparsecs. ' +
        'But on smaller scales there are known discrepancies between simulations and observations: ' +
        'the number of dwarf galaxies around massive systems, ' +
        'their internal density profiles, ' +
        'and the phenomenon of galaxies that are "too massive for their halo" — ' +
        'and these questions remain open.',

        'The nature of dark matter is the largest unresolved mystery. ' +
        'All attempts to detect dark matter particles in laboratories or accelerators have so far failed. ' +
        'Whether dark matter consists of weakly interacting massive particles, axions, ' +
        'primordial black holes, or something entirely different — is unknown. ' +
        'The answer will fundamentally reshape our understanding of structure formation.',

        'Baryon acoustic oscillations remain a reliable cosmological tool, ' +
        'but the precision of current and future surveys — Euclid, the Vera C. Rubin Observatory, ' +
        'the Nancy Grace Roman Space Telescope — will be high enough ' +
        'that minor theoretical uncertainties will become visible. ' +
        'This opens a window to detect deviations from the standard model — ' +
        'if any exist.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Cosmic web',
      definition:
        'The large-scale structure of the universe: a network of filaments, walls, and nodes of galaxies and gas surrounding nearly empty voids. It emerged through gravitational instability acting on primordial density fluctuations over billions of years.',
    },
    {
      term: 'Dark matter halo',
      definition:
        'A gravitationally bound spheroidal structure of dark matter in which a visible galaxy is embedded. Halos formed before visible galaxies and define the scales and locations of their birth.',
    },
    {
      term: 'Baryon acoustic oscillations',
      definition:
        'Sound waves in the plasma of the early universe that propagated from the Big Bang until recombination and were frozen into the matter distribution. They left a characteristic scale of roughly 150 megaparsecs, used in cosmology as a standard ruler.',
    },
    {
      term: 'Hierarchical assembly',
      definition:
        'The mechanism of structure formation in which small objects — dwarf galaxies, small halos — form first, then merge into larger galaxies, groups, and clusters. Predicted by the cold dark matter model and confirmed observationally.',
    },
    {
      term: 'Void',
      definition:
        'A nearly empty region of the universe between the filaments and walls of the cosmic web. The largest voids span hundreds of megaparsecs. They occupy most of the volume of the universe but contain only a small fraction of its mass.',
    },
    {
      term: 'Filament',
      definition:
        'An elongated structure of the cosmic web connecting cluster nodes. Filaments contain a significant fraction of the total galaxy mass and are the most extended gravitationally coherent structures in the universe.',
    },
    {
      term: 'Sloan Digital Sky Survey',
      definition:
        'One of the largest galaxy surveys in the history of astronomy, begun in the late twentieth century. It built a three-dimensional map of millions of galaxies and produced the first statistically significant detection of baryon acoustic oscillations.',
    },
    {
      term: 'Euclid mission',
      definition:
        'A European Space Agency space telescope launched in 2023, designed to build the most complete three-dimensional map of large-scale cosmic structure ever made, covering more than one billion galaxies across one third of the sky.',
    },
    {
      term: 'Millennium simulation',
      definition:
        'A numerical cosmological simulation by the Max Planck Institute for Astrophysics (early 2000s), modeling more than ten billion dark matter particles in a 500-megaparsec volume. It confirmed the standard model of structure formation.',
    },
  ],

  quiz: [
    {
      question: 'What role does dark matter play in the formation of large-scale structure?',
      options: [
        'Dark matter repels galaxies from one another, forming voids',
        'Dark matter forms gravitational wells into which ordinary matter fell after recombination',
        'Dark matter takes no part in structure formation, only in star formation',
        'Dark matter replaces baryonic matter in filaments and cluster nodes',
      ],
      correctIndex: 1,
      explanation:
        'Dark matter interacts only gravitationally and is not coupled to radiation pressure. ' +
        'It began to collapse while the universe was still an opaque plasma, forming gravitational wells — halos — ' +
        'into which ordinary gas fell after recombination. Without those pre-formed wells, ' +
        'galaxies would not have had enough time to assemble.',
    },
    {
      question: 'What are baryon acoustic oscillations and how are they used in cosmology?',
      options: [
        'Gravitational waves from merging massive clusters, detected by interferometers',
        'Brightness pulsations of quasars used as standard candles',
        'Frozen sound waves in the early-universe plasma that left a characteristic scale of roughly 150 megaparsecs',
        'Temperature oscillations in the Cosmic Microwave Background measured by satellites',
      ],
      correctIndex: 2,
      explanation:
        'Sound waves in the plasma before recombination were frozen into the matter distribution, ' +
        'leaving a slight excess of galaxy pairs at a characteristic separation of roughly 150 megaparsecs. ' +
        'This scale is known theoretically and is used as a standard ruler ' +
        'to measure the expansion history of the universe at different epochs.',
    },
    {
      question: 'Which principle describes the order in which cosmic structures formed?',
      options: [
        'Large clusters first, then galaxies and dwarf systems',
        'All structures formed simultaneously from initial fluctuations',
        'Small structures first, then mergers into larger ones — hierarchical assembly',
        'Voids first, then filaments, then cluster nodes',
      ],
      correctIndex: 2,
      explanation:
        'The cold dark matter model predicts hierarchical assembly: ' +
        'small halos and dwarf galaxies formed first, ' +
        'then merged into large galaxies, groups, and clusters. ' +
        'This is confirmed observationally — at high redshifts, small and irregular galaxies dominate.',
    },
    {
      question: 'Which surveys and missions have driven breakthroughs in studying large-scale structure?',
      options: [
        'The Hubble Space Telescope and the Chandra X-ray Observatory',
        'The Sloan Digital Sky Survey, the Dark Energy Spectroscopic Instrument survey, and the Euclid mission',
        'The Voyager missions and XMM-Newton',
        'The ALMA radio telescope and the Solar Dynamics Observatory',
      ],
      correctIndex: 1,
      explanation:
        'The Sloan Digital Sky Survey built the first detailed map of millions of galaxies. ' +
        'The Dark Energy Spectroscopic Instrument survey gathered data on five million objects by 2024 ' +
        'and refined the parameters of dark energy. ' +
        'The Euclid mission, launched in 2023, is building the most complete map yet, covering one billion galaxies.',
    },
    {
      question: 'How do voids differ from filaments and cluster nodes in the cosmic web?',
      options: [
        'Voids are regions with extremely high dark matter density; filaments contain baryonic matter',
        'Voids occupy a small fraction of the universe\'s volume and have low density',
        'Voids are nearly empty volumes between filaments and walls, occupying most of the universe\'s volume',
        'Voids occur only in the vicinity of massive galaxy clusters',
      ],
      correctIndex: 2,
      explanation:
        'Voids are nearly empty regions between the filaments and walls of the cosmic web. ' +
        'They occupy most of the total volume of the universe ' +
        'but contain only a small fraction of its mass. ' +
        'Matter gradually drains from voids into filaments under gravity, ' +
        'and voids grow progressively emptier over time.',
    },
  ],

  sources: [
    {
      title: 'Springel V. et al. — Simulations of the Formation, Evolution and Clustering of Galaxies and Quasars (Millennium Simulation)',
      url: 'https://arxiv.org/abs/astro-ph/0504097',
      meta: 'Nature 435, 629 (2005), arXiv:astro-ph/0504097',
    },
    {
      title: 'Eisenstein D.J. et al. — Detection of Baryon Acoustic Oscillations in the Correlation Function of a Large Sample of Red Galaxies',
      url: 'https://arxiv.org/abs/astro-ph/0501171',
      meta: 'ApJ 633, 560 (2005), arXiv:astro-ph/0501171 — first statistically significant BAO detection',
    },
    {
      title: 'DESI Collaboration — DESI 2024 VI: Cosmological Constraints from the Measurements of Baryon Acoustic Oscillations',
      url: 'https://arxiv.org/abs/2404.03002',
      meta: 'arXiv:2404.03002 (2024) — Dark Energy Spectroscopic Instrument 2024 results',
    },
    {
      title: 'Euclid Collaboration — Euclid Early Release Observations',
      url: 'https://arxiv.org/abs/2309.01518',
      meta: 'A&A (2024), arXiv:2309.01518 — first Euclid science results',
    },
    {
      title: 'Labbe I. et al. — A Population of Red Candidate Massive Galaxies ~600 Myr After the Big Bang (JWST)',
      url: 'https://arxiv.org/abs/2207.09436',
      meta: 'Nature 616, 266 (2023), arXiv:2207.09436 — early massive structures with JWST',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results: Cosmological Parameters',
      url: 'https://arxiv.org/abs/1807.06209',
      meta: 'A&A 641, A6 (2020), arXiv:1807.06209',
    },
    {
      title: 'Pillepich A. et al. — Simulating Galaxy Formation with IllustrisTNG',
      url: 'https://arxiv.org/abs/1703.09805',
      meta: 'MNRAS 473, 4077 (2018), arXiv:1703.09805 — IllustrisTNG simulation',
    },
    {
      title: 'Peebles P.J.E. — The Large-Scale Structure of the Universe',
      url: 'https://press.princeton.edu/books/paperback/9780691209838/the-large-scale-structure-of-the-universe',
      meta: 'Princeton University Press (1980) — classic textbook on large-scale structure',
    },
    {
      title: 'Blumenthal G.R. et al. — Formation of Galaxies and Large-Scale Structure with Cold Dark Matter',
      url: 'https://ui.adsabs.harvard.edu/abs/1984Natur.311..517B',
      meta: 'Nature 311, 517 (1984) — foundational cold dark matter paper',
    },
    {
      title: 'Cautun M. et al. — Evolution of the Cosmic Web',
      url: 'https://arxiv.org/abs/1401.7866',
      meta: 'MNRAS 441, 2923 (2014), arXiv:1401.7866 — NEXUS+ web component analysis',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
