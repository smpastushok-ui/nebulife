import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'jupiter-system',
  language: 'en',
  section: 'planetology',
  order: 7,
  difficulty: 'intermediate',
  readingTimeMin: 14,
  title: 'Jupiter and Its Moons',
  subtitle: 'The largest planet in the solar system and four worlds where life beyond Earth may be hiding.',

  hero: {
    cacheKey: 'jupiter-system-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: Jupiter planet in full disc view from space, ' +
      'dramatic cloud bands in orange, brown, cream and white, the iconic Great Red Spot storm visible, ' +
      'four Galilean moons visible nearby to scale — Io (volcanic orange-yellow), Europa (icy white with brown cracks), ' +
      'Ganymede (large grey-brown), Callisto (dark cratered) — arranged around the planet, ' +
      'dark space background with stars, scientific accuracy, cinematic composition. ' +
      'Add the following text labels on the image: "Jupiter", "Io", "Europa", "Ganymede", "Callisto", "Great Red Spot".',
    alt: 'Jupiter with the Great Red Spot and the four Galilean moons alongside',
    caption: 'Jupiter and its four large moons, discovered by Galileo Galilei in the early seventeenth century. Sizes and distances are not to scale — in reality the moons orbit far farther from the planet than shown here.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'If Jupiter had grown about eighty times more massive, it would have ignited as a star. ' +
        'It did not — but it remained the largest planet in the solar system: heavier than all other planets combined, ' +
        'with a magnetic field stronger than any other body except the Sun, ' +
        'and home to a storm that has not quieted in more than three centuries.',

        'But Jupiter is interesting not only for itself. Ninety-five known moons orbit it — ' +
        'and among them are four large ones discovered by Galileo in the early seventeenth century. ' +
        'Two of those four — Io and Europa — are the most geologically and biologically compelling bodies in the solar system beyond Earth. ' +
        'Io is covered in volcanoes. Europa has a liquid ocean beneath kilometers of ice. ' +
        'Two missions are already on their way there.',
      ],
    },

    {
      heading: 'The Giant Planet: What Is Inside',
      level: 2,
      paragraphs: [
        'Jupiter is a gas giant with no solid surface. ' +
        'If someone attempted to "land" on it, they would simply sink deeper and deeper into the atmosphere ' +
        'until pressure and temperature made the very concept of a surface meaningless. ' +
        'The planet consists primarily of hydrogen and helium — nearly the same composition as the Sun, but about one thousand times less massive.',

        'Jupiter\'s atmosphere is a spectacle. The cloud bands — parallel zones and belts where winds blow in opposite directions — ' +
        'are not mere decoration: they express convective cells and differential rotation. ' +
        'Jupiter rotates on its axis with extraordinary speed: a day there lasts just ten Earth hours. ' +
        'That is the shortest day of any planet in the solar system. ' +
        'The rapid rotation noticeably flattens the planet: the equatorial radius is almost seven percent larger than the polar radius.',

        'Below the clouds, hydrogen is compressed into liquid. Tens of thousands of kilometers down, ' +
        'the pressure becomes so immense that hydrogen transitions into a **_metallic state_**: ' +
        'electrons are stripped from atoms and move freely, as they do in a conductor. ' +
        'This liquid metallic hydrogen generates Jupiter\'s magnetic field, ' +
        'which is twenty thousand times stronger than Earth\'s and extends 650 million kilometers sunward. ' +
        'Whether there is a solid rocky-icy core at the very center is an open question. ' +
        'Data from the Juno mission suggest the core may be diffuse — heavy elements may have mixed outward into the metallic hydrogen layer.',
      ],
    },

    {
      image: {
        cacheKey: 'jupiter-cloud-bands',
        prompt:
          'Photorealistic illustration for a science encyclopedia: close-up of Jupiter cloud bands, ' +
          'intricate turbulent cloud structures in orange, brown, cream, white and beige swirling bands, ' +
          'visible vortex storms, oval storm cells, high scientific detail, ' +
          'Voyager or Juno spacecraft image style. ' +
          'Add the following text labels on the image: "Equatorial Zone", "North Equatorial Belt", "Jet Stream", "Oval Storm".',
        alt: 'Close-up of Jupiter\'s cloud bands — swirling vortices, storms, contrasting zones and belts',
        caption: 'Jupiter\'s atmosphere is a planetary weather machine. Winds in adjacent bands blow in opposite directions at speeds up to 500 kilometers per hour.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Great Red Spot',
      level: 2,
      paragraphs: [
        'In Jupiter\'s South Tropical Zone churns a storm roughly twice the size of Earth. ' +
        'It has been observed since at least the seventeenth century, when the astronomer Cassini first sketched a "permanent spot." ' +
        'Three and a half centuries later, the storm has not stopped.',

        'The **_Great Red Spot_** is an anticyclone: winds rotate counterclockwise at peak speeds exceeding 500 kilometers per hour, ' +
        'and the storm center rises several kilometers above the surrounding cloud layer. ' +
        'The red color is most likely produced by complex organic or sulfur-bearing compounds ' +
        'formed when ultraviolet sunlight reacts with atmospheric chemicals. ' +
        'The exact chemical identity of the pigment remains unknown.',

        'Through the twentieth century and into the twenty-first, the spot has measurably shrunk: ' +
        'in the nineteenth century it would have contained four Earths; today it barely exceeds one. ' +
        'The rate of shrinkage has slowed and appears to have stabilized. ' +
        'Whether this is normal variability in an ancient storm, or whether it is slowly dying, ' +
        'is a question researchers have debated since the early 2010s.',
      ],
    },

    {
      heading: 'Defender of Earth: A Gravitational Shield',
      level: 2,
      paragraphs: [
        'Jupiter plays a role in the solar system that is difficult to overstate. ' +
        'Its immense gravity captures asteroids and comets that might otherwise travel toward Earth. ' +
        'Some of these objects are absorbed by Jupiter directly — ' +
        'in 1994 the entire world watched as comet Shoemaker-Levy 9 broke into 21 fragments, ' +
        'all of which struck Jupiter over the course of a week. ' +
        'The explosion scars left in the atmosphere were larger than Earth.',

        'But Jupiter\'s role as a "shield" is more complicated than it first appears. ' +
        'Its gravity can also scatter objects from the asteroid belt inward, toward Earth — ' +
        'it both stops and redirects, depending on the approach geometry. ' +
        'Computer simulations have shown that without Jupiter, Earth would experience several times more large impacts. ' +
        'The complex orbital mechanics make Jupiter not simply a "cosmic vacuum cleaner," ' +
        'but a stabilizer for the inner solar system.',
      ],
    },

    {
      diagram: {
        title: 'Interior Structure of Jupiter',
        svg: `<svg viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="520" height="420" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Outer atmosphere -->
  <ellipse cx="260" cy="210" rx="195" ry="185" fill="#cc8844" opacity="0.22"/>
  <ellipse cx="260" cy="210" rx="195" ry="185" fill="none" stroke="#cc8844" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="390" y="90" fill="#cc8844" font-family="monospace" font-size="11">Atmosphere</text>
  <text x="390" y="104" fill="#8899aa" font-family="monospace" font-size="9">(H₂, He, NH₃, CH₄)</text>
  <line x1="380" y1="96" x2="318" y2="128" stroke="#cc8844" stroke-width="0.8" opacity="0.6"/>

  <!-- Liquid hydrogen layer -->
  <ellipse cx="260" cy="210" rx="155" ry="145" fill="#7bb8ff" opacity="0.14"/>
  <ellipse cx="260" cy="210" rx="155" ry="145" fill="none" stroke="#7bb8ff" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="20" y="130" fill="#7bb8ff" font-family="monospace" font-size="11">Liquid hydrogen</text>
  <line x1="100" y1="128" x2="150" y2="165" stroke="#7bb8ff" stroke-width="0.8" opacity="0.6"/>

  <!-- Metallic hydrogen layer -->
  <ellipse cx="260" cy="210" rx="105" ry="98" fill="#4488aa" opacity="0.22"/>
  <ellipse cx="260" cy="210" rx="105" ry="98" fill="none" stroke="#4488aa" stroke-width="1.5"/>
  <text x="20" y="230" fill="#4488aa" font-family="monospace" font-size="11">Metallic</text>
  <text x="20" y="244" fill="#4488aa" font-family="monospace" font-size="11">hydrogen</text>
  <text x="20" y="258" fill="#8899aa" font-family="monospace" font-size="9">(generates mag. field)</text>
  <line x1="110" y1="240" x2="168" y2="230" stroke="#4488aa" stroke-width="0.8" opacity="0.6"/>

  <!-- Core -->
  <ellipse cx="260" cy="210" rx="50" ry="46" fill="#ff8844" opacity="0.35"/>
  <ellipse cx="260" cy="210" rx="50" ry="46" fill="none" stroke="#ff8844" stroke-width="1.5"/>
  <text x="245" y="215" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="10">Core?</text>
  <text x="390" y="310" fill="#ff8844" font-family="monospace" font-size="10">Diffuse core</text>
  <text x="390" y="324" fill="#8899aa" font-family="monospace" font-size="9">(heavy elements)</text>
  <line x1="385" y1="314" x2="314" y2="230" stroke="#ff8844" stroke-width="0.8" opacity="0.6"/>

  <!-- Depth scale -->
  <line x1="460" y1="50" x2="460" y2="370" stroke="#667788" stroke-width="0.8"/>
  <text x="468" y="55" fill="#667788" font-family="monospace" font-size="9">0 km</text>
  <text x="468" y="210" fill="#667788" font-family="monospace" font-size="9">~25 000</text>
  <text x="468" y="370" fill="#667788" font-family="monospace" font-size="9">~69 000</text>

  <text x="260" y="400" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Not to scale. Layer boundaries are approximate.</text>
</svg>`,
        caption: 'Interior structure of Jupiter: from the cloud atmosphere down to the possible diffuse core of heavy elements. The metallic hydrogen layer is the source of the planet\'s powerful magnetic field.',
      },
    },

    {
      heading: 'The Galilean Moons: Four Different Worlds',
      level: 2,
      paragraphs: [
        'In 1610, Galileo Galilei pointed a telescope at Jupiter and saw four points of light that moved. ' +
        'It was a revolutionary discovery: not everything in the universe orbits Earth. ' +
        'The four large moons — Io, Europa, Ganymede, and Callisto — have borne his name ever since.',

        'These four bodies form a unique natural collection of geological and physical environments, ' +
        'arrayed between 420,000 and two million kilometers from Jupiter. ' +
        'Each successive moon farther from the planet is colder and geologically quieter — ' +
        'and that is no accident: distance from Jupiter determines the intensity of tidal heating.',
      ],
    },

    {
      heading: 'Io: Hell in Plain Sight',
      level: 3,
      paragraphs: [
        '**_Io_** is the innermost of the four large moons and the most volcanically active body in the solar system. ' +
        'Its surface contains no meteorite impact craters — volcanoes continuously bury them under fresh lava and sulfur. ' +
        'More than 400 active volcanoes dot the surface, some ejecting material up to 500 kilometers high.',

        'The source of such activity is **_tidal heating_**. ' +
        'Io is locked in an orbital resonance with Europa and Ganymede: for every four orbits Io completes, ' +
        'Europa completes two and Ganymede one. ' +
        'This synchronization keeps Io\'s orbit slightly elliptical, ' +
        'so Jupiter\'s gravity continuously flexes and deforms the moon\'s interior — ' +
        'the pull strengthens and weakens, and this friction releases an enormous amount of heat. ' +
        'The heat flow through Io\'s surface is roughly thirty times greater than Earth\'s.',

        'Io\'s surface is coated in colorful sulfurous deposits ranging from yellow-orange to white and black. ' +
        'There are lakes of molten sulfur and lava fields exceeding 1,000°C. ' +
        'Jupiter\'s magnetosphere sweeps up particles ejected by Io\'s volcanoes ' +
        'and accelerates them around the entire system — Io literally "seeds" the magnetosphere and Jupiter\'s rings with its own material.',
      ],
    },

    {
      image: {
        cacheKey: 'io-volcanoes',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Io moon of Jupiter with active volcanoes, ' +
          'sulfur-yellow and orange surface with dark lava flows, massive volcanic plume erupting on the limb ' +
          'reaching hundreds of kilometers high, calderas and volcanic pits visible, ' +
          'Jupiter visible in background as a large colorful sphere, dark space, scientific accuracy. ' +
          'Add the following text labels on the image: "Active Volcanic Plume", "Lava Lake", "Sulfur Deposits", "Jupiter (background)".',
        alt: 'Io moon — volcanic landscape with active eruptions and sulfur deposits',
        caption: 'Io is the most geologically active body in the solar system. Tidal heating from Jupiter sustains more than 400 active volcanoes that continuously resurface the moon.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Europa: An Ocean Beneath the Ice',
      level: 3,
      paragraphs: [
        'If Io is fire, Europa is ice with a hidden secret. ' +
        'The surface of the moon is covered by several kilometers of water ice, ' +
        'but beneath it hides something far more interesting: a liquid ocean up to 100 kilometers deep. ' +
        'That is more water than in all of Earth\'s oceans combined.',

        'The evidence for the ocean is compelling. Observations of Jupiter\'s magnetic field using the Galileo spacecraft revealed ' +
        'that Europa responds to the external magnetic field the way a conducting liquid layer would — that is, a salty ocean. ' +
        'The icy surface is crosshatched with ridges and fractures resembling sea ice on Earth, ' +
        'where ice moves over liquid. In certain regions called **_chaos terrain_**, ' +
        'icy blocks appear to have drifted and rearranged — another sign of a dynamic ice shell above a fluid.',

        'A separate argument comes from plumes: the Hubble Space Telescope detected apparent vapor jets ' +
        'rising from specific locations on Europa\'s surface on several occasions, ' +
        'suggesting water escaped from beneath the crust. ' +
        'If those plumes are real, the Europa Clipper mission can "sniff" them without landing. ' +
        'Among scientists, Europa is considered the most promising location in the solar system for finding extraterrestrial microbial life — ' +
        'not because organisms are necessarily there, ' +
        'but because the basic conditions are all present: liquid water, heat, and chemistry.',
      ],
    },

    {
      image: {
        cacheKey: 'europa-ice-surface',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Europa moon surface close-up, ' +
          'cracked icy terrain with reddish-brown linear ridges and fractures crisscrossing white and light-blue ice, ' +
          'chaotic terrain section with displaced ice blocks, highly detailed, Galileo or Juno image style, ' +
          'scientific accuracy, no craters (geologically young surface). ' +
          'Add the following text labels on the image: "Ice Shell", "Ridges", "Chaos Terrain", "Subsurface Ocean (below)".',
        alt: 'Europa\'s surface — icy crust with ridge networks and chaos terrain above a subsurface ocean',
        caption: 'Europa\'s icy crust is laced with ridges and chaotic regions — clues to the dynamics of a liquid ocean kilometers below.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Ganymede and Callisto',
      level: 3,
      paragraphs: [
        '**_Ganymede_** is the largest moon in the solar system, larger than the planet Mercury. ' +
        'It is the only moon in the solar system known to generate its own magnetic field. ' +
        'Ganymede is also suspected to harbor a subsurface salty ocean sandwiched between layers of ice — ' +
        'data from the Hubble Space Telescope in 2015 showed oscillations in its auroras ' +
        'characteristic of interaction with a conducting liquid layer.',

        '**_Callisto_** is the outermost of the Galilean moons and the most ancient-looking. ' +
        'Its surface is heavily cratered and has changed little in billions of years: ' +
        'tidal heating from Jupiter is minimal here, and geological activity is nearly zero. ' +
        'Callisto is a geological archive — every crater is a record of an ancient impact. ' +
        'Despite its outward stillness, some data suggest the presence of a liquid layer beneath the ice here too, ' +
        'though far less certain than for Ganymede or Europa.',
      ],
    },

    {
      image: {
        cacheKey: 'ganymede-callisto-comparison',
        prompt:
          'Photorealistic illustration for a science encyclopedia: side-by-side comparison of Ganymede and Callisto moons, ' +
          'Ganymede showing mixed bright and dark terrain with ancient impact basins and younger icy regions, ' +
          'Callisto showing uniformly dark heavily cratered ancient surface, ' +
          'both shown against dark space background, relative sizes accurate, scientific accuracy. ' +
          'Add the following text labels on the image: "Ganymede (largest moon in solar system)", "Callisto (ancient cratered surface)", "Bright Terrain", "Impact Basin".',
        alt: 'Comparison of Ganymede and Callisto — the largest moon in the solar system and the most ancient cratered surface',
        caption: 'Ganymede (left) and Callisto (right): the difference in geological activity is stark. Ganymede shows mixed terrain; Callisto displays a uniformly ancient cratered landscape.',
        aspectRatio: '4:3',
      },
    },

    {
      diagram: {
        title: 'Orbital Resonance of Io — Europa — Ganymede (1:2:4)',
        svg: `<svg viewBox="0 0 580 400" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="580" height="400" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Jupiter -->
  <circle cx="290" cy="200" r="36" fill="#cc8844" opacity="0.85"/>
  <text x="290" y="205" text-anchor="middle" fill="#020510" font-family="monospace" font-size="12" font-weight="bold">JUPITER</text>

  <!-- Io orbit -->
  <ellipse cx="290" cy="200" rx="80" ry="78" fill="none" stroke="#ff8844" stroke-width="1.4" stroke-dasharray="5,3" opacity="0.8"/>
  <!-- Io moon -->
  <circle cx="370" cy="200" r="8" fill="#ff8844"/>
  <text x="384" y="197" fill="#ff8844" font-family="monospace" font-size="11">Io</text>
  <text x="384" y="209" fill="#8899aa" font-family="monospace" font-size="9">1.77 days</text>

  <!-- Europa orbit -->
  <ellipse cx="290" cy="200" rx="134" ry="130" fill="none" stroke="#7bb8ff" stroke-width="1.4" stroke-dasharray="5,3" opacity="0.7"/>
  <!-- Europa moon -->
  <circle cx="290" cy="70" r="7" fill="#7bb8ff"/>
  <text x="302" y="68" fill="#7bb8ff" font-family="monospace" font-size="11">Europa</text>
  <text x="302" y="80" fill="#8899aa" font-family="monospace" font-size="9">3.55 days</text>

  <!-- Ganymede orbit -->
  <ellipse cx="290" cy="200" rx="200" ry="195" fill="none" stroke="#44ff88" stroke-width="1.4" stroke-dasharray="5,3" opacity="0.6"/>
  <!-- Ganymede moon -->
  <circle cx="90" cy="200" r="11" fill="#44ff88" opacity="0.85"/>
  <text x="40" y="197" fill="#44ff88" font-family="monospace" font-size="11">Ganymede</text>
  <text x="46" y="210" fill="#8899aa" font-family="monospace" font-size="9">7.15 days</text>

  <!-- Resonance label -->
  <rect x="190" y="330" width="200" height="38" fill="rgba(20,30,45,0.85)" rx="3" stroke="#aabbcc" stroke-width="0.7"/>
  <text x="290" y="348" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Resonance 1 : 2 : 4</text>
  <text x="290" y="362" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Per 1 Ganymede orbit: Io 4, Europa 2</text>

  <text x="290" y="25" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Not to scale. Callisto not shown.</text>
</svg>`,
        caption: 'The Laplace orbital resonance: for every orbit Ganymede completes, Io completes four and Europa completes two. This synchronization maintains the elliptical orbits of Io and Europa and, with them, tidal heating.',
      },
    },

    {
      heading: 'Juno: A Mission in Jupiter\'s Orbit',
      level: 2,
      paragraphs: [
        'Since mid-2016, the NASA Juno mission has been studying Jupiter from a polar orbit. ' +
        'The spacecraft is still operating — far longer than its original planned lifetime. ' +
        'Over years of work, Juno has reshaped our understanding of Jupiter\'s interior structure, ' +
        'magnetic field, and atmospheric dynamics.',

        'Key findings: Jupiter\'s magnetic field turned out to be far more heterogeneous and complex than expected. ' +
        'The cloud band structure extends thousands of kilometers deep, not merely a surface feature. ' +
        'Juno found evidence that the planetary core may be diffuse — heavy elements are not concentrated in a compact center ' +
        'but transition gradually into the outer layers. ' +
        'Juno also revealed new details about the volcanic activity of Io ' +
        'and captured the first high-detail images of Jupiter\'s polar auroras.',

        'During its extended mission, Juno performed close flybys of Ganymede, Io, and Europa — ' +
        'the first detailed close-up observations of these moons in decades, following the Galileo mission.',
      ],
    },

    {
      image: {
        cacheKey: 'juice-europa-clipper-render',
        prompt:
          'Photorealistic illustration for a science encyclopedia: two spacecraft in space near Jupiter — ' +
          'ESA JUICE spacecraft with large solar panels extended and NASA Europa Clipper with wide solar arrays, ' +
          'Jupiter visible in background, icy moon visible at distance, ' +
          'detailed spacecraft hardware, dark space, scientific accuracy, render style. ' +
          'Add the following text labels on the image: "JUICE (ESA)", "Europa Clipper (NASA)", "Jupiter".',
        alt: 'Render of the JUICE (ESA) and Europa Clipper (NASA) spacecraft near Jupiter',
        caption: 'Two spacecraft are bound for the Jupiter system: JUICE arrives in 2031 and will enter orbit around Ganymede; Europa Clipper arrives in 2030 and will perform more than fifty close flybys of Europa.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'JUICE and Europa Clipper: What We Are Searching For',
      level: 2,
      paragraphs: [
        'In April 2023, ESA launched the JUICE mission — Jupiter Icy Moons Explorer. ' +
        'The spacecraft is traveling to Jupiter and will arrive in 2031 after a series of gravity-assist maneuvers ' +
        'at Earth, the Moon, and Venus. ' +
        'The primary goal is a detailed investigation of Ganymede, Callisto, and Europa. ' +
        'In 2034, JUICE will enter orbit around Ganymede — the first spacecraft in history ' +
        'to orbit a moon of another planet.',

        'In October 2024, NASA launched Europa Clipper — the largest interplanetary spacecraft NASA has ever built, ' +
        'equipped with a powerful instrument suite designed to study Europa. ' +
        'Arrival at the Jupiter system is planned for 2030. ' +
        'Rather than entering orbit around Europa — too dangerous given the intense radiation environment — ' +
        'the spacecraft will perform approximately fifty close flybys, some at altitudes below 25 kilometers.',

        'What exactly are these missions searching for? Europa Clipper will measure ice shell thickness, ' +
        'thermal anomalies, surface composition, plume signatures, and ocean salinity. ' +
        'JUICE will compare all three icy moons against each other, revealing what conditions ' +
        'are required for a subsurface liquid ocean to form and which body is most suitable for future landers. ' +
        'Neither mission is designed to directly detect living organisms — ' +
        'but both will return data that answers a key question: is it worth going further?',
      ],
    },

    {
      heading: 'The Search for Biosignatures: What to Expect',
      level: 3,
      paragraphs: [
        'Even if microorganisms exist in Europa\'s ocean, detecting them directly with a flyby spacecraft is not possible. ' +
        'Europa Clipper and JUICE are searching for indirect signs: ' +
        'organic molecules in plume material, salt composition on the surface, ' +
        'and thermal anomalies pointing to hydrothermal activity on the ocean floor.',

        'If hydrothermal systems on Europa\'s ocean floor do exist, ' +
        'they would be the analog of deep-sea hydrothermal vents on Earth — ' +
        'places where entire ecosystems of chemosynthetic bacteria thrive without sunlight. ' +
        'The step from "there is liquid water and heat" to "there is microbial life" ' +
        'is a scientific hypothesis, not a fact. ' +
        'But testing that hypothesis is precisely what these missions are designed to do.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Metallic hydrogen',
      definition: 'A state of hydrogen under extreme pressure in which electrons are stripped from atoms and move freely, as in a metal. Deep inside Jupiter, metallic hydrogen exists as a liquid and generates the planet\'s powerful magnetic field.',
    },
    {
      term: 'Tidal heating',
      definition: 'The process by which heat is generated inside a planet or moon due to deformation caused by uneven gravitational pull. For Io, this is the primary source of internal heat and the reason for its intense volcanic activity.',
    },
    {
      term: 'Orbital resonance',
      definition: 'A condition in which the orbital periods of two or more bodies are related by a simple integer ratio. Io, Europa, and Ganymede are in a 1:2:4 resonance, which maintains their elliptical orbits and sustains tidal heating.',
    },
    {
      term: 'Chaos terrain',
      definition: 'Regions on Europa\'s surface where icy blocks appear to have drifted and rearranged relative to one another, similar to sea ice on Earth. Considered evidence of a dynamic ice shell above a liquid layer.',
    },
    {
      term: 'Great Red Spot',
      definition: 'A giant anticyclonic storm in Jupiter\'s South Tropical Zone, observed since at least the seventeenth century. Winds within it exceed 500 kilometers per hour. The storm has been shrinking over the past century but persists.',
    },
    {
      term: 'Plume (planetary)',
      definition: 'A jet of gas or vapor ejected from the surface of a planetary body due to subsurface activity. Io\'s plumes are volcanic; Europa\'s are suspected to be eruptions of water or vapor from the subsurface ocean.',
    },
    {
      term: 'Biosignature',
      definition: 'A chemical, physical, or morphological indicator whose presence may suggest biological activity. Europa Clipper will search for organic molecules and other potential biosignatures in plume material from Europa.',
    },
    {
      term: 'Hydrothermal vent',
      definition: 'A fissure on the ocean floor through which hot, mineral-rich water flows, heated by geothermal energy. On Earth, such vents sustain ecosystems without sunlight. Their possible existence on Europa\'s ocean floor is a key argument for the search for extraterrestrial life.',
    },
  ],

  quiz: [
    {
      question: 'What is tidal heating and why does it make Io the most volcanically active body in the solar system?',
      options: [
        'Warming by direct solar radiation through the absence of an atmosphere',
        'Deformation from Jupiter\'s uneven gravitational pull generates heat inside the moon',
        'Radioactive decay of heavy elements in Io\'s core',
        'Micrometeorite impacts heat the surface continuously',
      ],
      correctIndex: 1,
      explanation: 'Io is in orbital resonance with Europa and Ganymede, keeping its orbit slightly elliptical. Jupiter\'s uneven gravitational pull continuously flexes Io\'s interior, generating heat through friction — this is tidal heating.',
    },
    {
      question: 'Which statement about Europa\'s ocean is accurate as of May 2026?',
      options: [
        'The ocean has been confirmed by direct sounding from Europa Clipper',
        'A liquid water ocean beneath the ice shell is a well-supported scientific hypothesis with indirect evidence',
        'Liquid water on Europa is ruled out due to the absence of internal heat',
        'The ocean is confirmed and definitively capable of supporting microbial life',
      ],
      correctIndex: 1,
      explanation: 'The ocean\'s existence is a well-supported hypothesis — based on magnetic field behavior, surface morphology, and possible plumes — but direct confirmation awaits Europa Clipper, which arrives in 2030.',
    },
    {
      question: 'When does the JUICE mission arrive at the Jupiter system and what is its final objective?',
      options: [
        '2028, entering orbit around Io to study its volcanoes',
        '2030, landing on Europa',
        '2031 arrival, entering Ganymede orbit in 2034',
        '2035, delivering a probe directly into Callisto\'s interior',
      ],
      correctIndex: 2,
      explanation: 'JUICE (launched April 2023) arrives in 2031 after gravity assists. In 2034 it will enter orbit around Ganymede — the first spacecraft ever to orbit a moon of another planet.',
    },
    {
      question: 'What makes Ganymede unique among all moons in the solar system?',
      options: [
        'It is the only moon with an oxygen-bearing atmosphere',
        'It is larger than Mars and generates its own magnetic field',
        'It is the only moon with confirmed living organisms',
        'It is the only moon that orbits in retrograde',
      ],
      correctIndex: 1,
      explanation: 'Ganymede is the largest moon in the solar system — larger than Mercury and slightly smaller than Mars. It is the only moon known to generate its own intrinsic magnetic field. A trace oxygen atmosphere has also been detected, but that is not its primary distinction.',
    },
  ],

  sources: [
    {
      title: 'Juno — NASA Science Mission',
      url: 'https://science.nasa.gov/mission/juno/',
      meta: 'Official NASA Juno mission page',
    },
    {
      title: 'Europa Clipper — NASA Science',
      url: 'https://science.nasa.gov/mission/europa-clipper/',
      meta: 'Official Europa Clipper mission page, October 2024',
    },
    {
      title: 'JUICE — ESA Mission Overview',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Juice',
      meta: 'ESA, launched April 2023',
    },
    {
      title: 'Galilean Moons of Jupiter — NASA Solar System Exploration',
      url: 'https://solarsystem.nasa.gov/moons/jupiter-moons/overview/',
      meta: 'NASA Solar System Exploration',
    },
    {
      title: 'Hubble Finds Evidence of Water Vapor at Ganymede',
      url: 'https://hubblesite.org/contents/news-releases/2021/news-2021-025',
      meta: 'STScI / Hubblesite, 2021',
    },
    {
      title: 'Io Volcanism Overview — USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/Io/Voyager-Galileo/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km',
      meta: 'USGS Astrogeology Science Center',
    },
    {
      title: 'Jupiter\'s Great Red Spot — NASA JPL',
      url: 'https://www.jpl.nasa.gov/news/whats-happening-with-jupiters-great-red-spot',
      meta: 'JPL / NASA',
    },
    {
      title: 'Jupiter\'s fuzzy core explained by giant impact — Nature 2022',
      url: 'https://www.nature.com/articles/s41586-022-05228-5',
      meta: 'Nature, 2022',
    },
    {
      title: 'Europa\'s Plumes — Hubble observations',
      url: 'https://hubblesite.org/contents/news-releases/2019/news-2019-016',
      meta: 'STScI / Hubblesite, 2019',
    },
    {
      title: 'Jupiter as a Cosmic Shield — The Planetary Society',
      url: 'https://www.planetary.org/articles/does-jupiter-protect-earth',
      meta: 'The Planetary Society',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
