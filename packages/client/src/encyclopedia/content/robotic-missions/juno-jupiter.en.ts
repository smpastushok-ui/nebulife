import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'juno-jupiter',
  language: 'en',
  section: 'robotic-missions',
  order: 8,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Juno — Deep Jupiter',
  subtitle: 'How one spacecraft rewrote our understanding of the largest planet in the solar system — from its core to its poles.',

  hero: {
    cacheKey: 'juno-jupiter-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Juno spacecraft in polar orbit above Jupiter, ' +
      'three enormous solar panel wings spread wide catching faint sunlight, ' +
      'the spacecraft body a compact hexagonal cylinder, ' +
      'below it Jupiter fills the frame in dramatic perspective — swirling orange and white cloud bands, ' +
      'the Great Red Spot storm visible on the limb, auroral ovals glowing cyan-blue at the poles, ' +
      'hard sci-fi style, dark space background, technically accurate geometry. ' +
      'Add the following text labels on the image: "Juno spacecraft", "Jupiter", "polar orbit", "solar arrays".',
    alt: 'The Juno spacecraft in polar orbit above Jupiter — three large solar panel wings against the banded atmosphere of the planet',
    caption:
      'Juno in polar orbit above Jupiter. Three solar panel wings with a combined area of eighteen square meters are the sole power source for the spacecraft at a distance of more than five hundred million kilometers from the Sun.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Jupiter has been known to humanity for thousands of years, but what hides beneath its clouds remained a mystery into the twenty-first century. ' +
        'We could see the surface of the atmosphere: bands, vortices, the Great Red Spot. ' +
        'But how deep do those structures reach? Does the planet have a solid core? ' +
        'How much water does it contain? What does its magnetic field actually look like up close? ' +
        'None of the spacecraft that preceded Juno could answer those questions — ' +
        'they flew past the planet on equatorial trajectories and carried no instruments capable of probing the depths.',

        'The Juno spacecraft, launched in August 2011, was built from scratch for one purpose: to look inside Jupiter. ' +
        'Its polar orbit allowed the first systematic mapping of the planet\'s magnetic field from pole to pole. ' +
        'A microwave radiometer probed the atmosphere to a depth of more than three hundred fifty kilometers — ' +
        'far below the visible cloud deck. ' +
        'Measurements of the Doppler shift of the spacecraft\'s radio signal revealed the distribution of mass inside the planet.',

        'The results exceeded expectations — and disproved several established models. ' +
        'Jupiter turned out to be far more complex inside than theorists had assumed. ' +
        'A mission originally planned to last two years was still active by 2026 — more than a decade later — ' +
        'and had visited not only Jupiter but three of its large moons.',
      ],
    },

    {
      image: {
        cacheKey: 'juno-jupiter-spacecraft-design',
        prompt:
          'Photorealistic scientific illustration of the Juno spacecraft in deep space: ' +
          'hexagonal body with three solar panel wings arranged symmetrically at 120 degrees, ' +
          'magnetometer boom extending from one wing tip, ' +
          'instruments visible on the body — microwave radiometer antennas, camera, ' +
          'faint sunlight from far right illuminating the panels, dark star field background. ' +
          'Hard sci-fi style, technically accurate. ' +
          'Add the following text labels on the image: "solar arrays (18 m²)", "magnetometer boom", "microwave radiometer", "main engine".',
        alt: 'Detailed illustration of the Juno spacecraft — hexagonal body with three symmetrical solar panels and a magnetometer boom',
        caption:
          'Juno became the first solar-powered spacecraft to operate in orbit around an outer planet. ' +
          'Three panels with a combined area of eighteen square meters produce only about five hundred watts at Jupiter\'s distance — ' +
          'roughly the power of a household hair dryer. The same panels would generate fourteen kilowatts in Earth orbit.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'A solar-powered spacecraft in a kingdom of darkness',
      level: 2,
      paragraphs: [
        'Before Juno, every spacecraft that traveled beyond Mars and required substantial electrical power ' +
        'relied on radioisotope thermoelectric generators — devices that convert the heat of radioactive decay into electricity. ' +
        'Jupiter receives roughly twenty-seven times less sunlight than Earth. ' +
        'Solar power at that distance seemed almost impractical.',

        'The designers of Juno decided otherwise. ' +
        'To extract sufficient power from photons at that distance, ' +
        'the spacecraft was fitted with three enormous solar panel wings with a combined area of eighteen square meters — ' +
        'the tip-to-tip span of the structure exceeded twenty meters. ' +
        'The result: approximately five hundred watts at Jupiter\'s orbit. ' +
        'That is roughly what a typical desktop computer consumes, yet it was sufficient ' +
        'to power all of Juno\'s scientific instruments and maintain communications with Earth.',

        'The choice also had a secondary advantage. ' +
        'A radioisotope thermoelectric generator costs roughly as much as the rest of the spacecraft combined — ' +
        'solar panels were cheaper and allowed more budget to be directed toward scientific instruments. ' +
        'Juno opened a new chapter: solar power for the outer solar system is not a theoretical aspiration, ' +
        'it is a demonstrated engineering solution.',
      ],
    },

    {
      heading: 'Polar orbit: threading between the radiation belts',
      level: 2,
      paragraphs: [
        'Jupiter is surrounded by the most intense radiation belts in the solar system outside the Sun itself. ' +
        'Charged particles trapped by the planet\'s magnetic field form zones of radiation so severe ' +
        'that unshielded electronics degrade within hours. ' +
        'Those belts would have destroyed a spacecraft on an equatorial orbit within months.',

        'Juno\'s polar orbit is an elegant workaround. ' +
        'The spacecraft follows an elongated ellipse: at periapsis — its closest point — ' +
        'it dives toward the cloud tops and races from pole to pole in a few hours, ' +
        'crossing the most dangerous zones as quickly as possible. ' +
        'It then swings far out into the outer magnetosphere where radiation is far lower, ' +
        'spending forty-five to fifty days there before the next close pass.',

        'Even that was not enough without careful shielding. ' +
        'Juno\'s electronics are sealed inside a "vault" — an armored titanium box with thick walls. ' +
        'Over the course of the mission the spacecraft accumulated a radiation dose equivalent ' +
        'to more than one hundred million chest X-rays. ' +
        'That accumulated radiation damage was the primary factor governing the duration of the mission.',
      ],
    },

    {
      diagram: {
        title: 'Juno\'s polar orbit and Jupiter\'s radiation belts',
        svg: `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="420" fill="rgba(10,15,25,0.5)"/>

  <!-- Jupiter body -->
  <ellipse cx="350" cy="210" rx="80" ry="90" fill="#b8864e" opacity="0.85"/>
  <!-- Cloud bands -->
  <ellipse cx="350" cy="190" rx="80" ry="12" fill="#d4a060" opacity="0.5"/>
  <ellipse cx="350" cy="215" rx="80" ry="10" fill="#8b5e3c" opacity="0.45"/>
  <ellipse cx="350" cy="235" rx="80" ry="9" fill="#c9965a" opacity="0.4"/>
  <!-- Jupiter label -->
  <text x="350" y="214" fill="#aabbcc" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">JUPITER</text>

  <!-- Radiation belt inner (intense) -->
  <ellipse cx="350" cy="210" rx="140" ry="155" fill="none" stroke="#cc4444" stroke-width="18" opacity="0.18"/>
  <text x="508" y="155" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="start">inner radiation</text>
  <text x="508" y="167" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="start">belt (intense)</text>

  <!-- Radiation belt outer -->
  <ellipse cx="350" cy="210" rx="200" ry="220" fill="none" stroke="#ff8844" stroke-width="10" opacity="0.12"/>
  <text x="562" y="105" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="start">outer radiation</text>
  <text x="562" y="117" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="start">belt</text>

  <!-- Juno polar orbit ellipse — tall ellipse from pole to pole, bypassing equatorial belts -->
  <ellipse cx="350" cy="210" rx="55" ry="310" fill="none" stroke="#7bb8ff" stroke-width="2" stroke-dasharray="8,5" opacity="0.9"/>

  <!-- Periapsis point label (near south pole of Jupiter) -->
  <circle cx="350" cy="298" r="5" fill="#44ff88" opacity="0.9"/>
  <text x="360" y="302" fill="#44ff88" font-family="monospace" font-size="10">periapsis</text>
  <text x="360" y="313" fill="#44ff88" font-family="monospace" font-size="10">(closest pass)</text>

  <!-- Apoapsis far top -->
  <circle cx="350" cy="112" r="5" fill="#44ff88" opacity="0.5"/>
  <text x="360" y="116" fill="#8899aa" font-family="monospace" font-size="10">apoapsis</text>
  <text x="360" y="127" fill="#8899aa" font-family="monospace" font-size="10">(far from belts)</text>

  <!-- North pole label -->
  <text x="350" y="126" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">N pole</text>
  <!-- South pole label -->
  <text x="350" y="304" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">S pole</text>

  <!-- Orbit direction arrow -->
  <path d="M 300 115 Q 260 210 300 305" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.7" marker-end="url(#arrow-en)"/>
  <defs>
    <marker id="arrow-en" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#7bb8ff" opacity="0.8"/>
    </marker>
  </defs>

  <!-- Legend -->
  <rect x="20" y="360" width="280" height="50" fill="rgba(10,15,25,0.7)" rx="3"/>
  <line x1="30" y1="374" x2="55" y2="374" stroke="#7bb8ff" stroke-width="2" stroke-dasharray="8,5"/>
  <text x="62" y="378" fill="#aabbcc" font-family="monospace" font-size="10">Juno polar orbit</text>
  <rect x="30" y="387" width="25" height="8" fill="#cc4444" opacity="0.5"/>
  <text x="62" y="396" fill="#aabbcc" font-family="monospace" font-size="10">radiation belts (schematic)</text>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Juno polar orbit — threading between radiation belts</text>
</svg>`,
        caption:
          'Juno travels an elongated polar ellipse. At periapsis the spacecraft crosses the dangerous radiation belts ' +
          'by the shortest possible route — through the poles. ' +
          'The majority of each orbit is spent far from Jupiter, where radiation levels are far lower.',
      },
    },

    {
      heading: 'Instruments: what Juno measures and how',
      level: 2,
      paragraphs: [
        'The spacecraft carries nine scientific instruments. ' +
        'Three of them have revealed the most new information about the interior of the planet.',
      ],
    },

    {
      heading: 'Microwave radiometer: an X-ray for the atmosphere',
      level: 3,
      paragraphs: [
        'The microwave radiometer consists of six independent antennas, each tuned to a different wavelength. ' +
        'Microwaves penetrate the clouds and return — each wavelength probing a different atmospheric layer. ' +
        'Together the six channels build a three-dimensional picture of temperature and ammonia content ' +
        'from the cloud tops down to a depth of approximately three hundred fifty kilometers.',

        'An analogy: if Earth were covered in a permanent overcast and you wanted to know the temperature ' +
        'at different layers of the atmosphere — a microwave radiometer would accomplish that without ' +
        'sending a single probe, simply by "illuminating" the clouds with different wavelengths. ' +
        'That is precisely how Juno saw the zonal jets of Jupiter at their true depth for the first time.',
      ],
    },

    {
      heading: 'Gravity science and the interior',
      level: 3,
      paragraphs: [
        'Any uneven distribution of mass inside the planet pulls the spacecraft slightly harder ' +
        'or softer in different parts of its orbit. ' +
        'These tiny trajectory deviations are recorded by ground antennas ' +
        'as Doppler shifts in the frequency of the radio signal, ' +
        'measured with precision down to fractions of a micrometer per second.',

        'Gravity science produced the mission\'s most unexpected result. ' +
        'Standard models predicted a compact rocky core at the center of Jupiter — ' +
        'dense and solid, surrounded by metallic hydrogen. ' +
        'Juno showed something different: no compact core exists. ' +
        'In its place is a large diffuse zone spanning roughly half the diameter of the planet, ' +
        'where heavy elements are intermixed with hydrogen and helium in a dilute blend. ' +
        'This "fuzzy core" is one of the defining discoveries of the mission.',
      ],
    },

    {
      heading: 'Magnetometer: a field nobody expected',
      level: 3,
      paragraphs: [
        'Jupiter has the most powerful magnetic field of any planet — roughly ten times stronger than Earth\'s. ' +
        'But before Juno nobody knew how complex its structure would be close to the planet\'s surface.',

        'Earlier spacecraft measured the field from a distance, and it appeared nearly dipolar — ' +
        'resembling the field of a simple bar magnet with two poles. ' +
        'Juno, drawing close to the cloud tops on every periapsis pass, ' +
        'revealed a striking picture. ' +
        'Jupiter\'s field is not a dipole. ' +
        'It is deeply asymmetric between the northern and southern hemispheres: ' +
        'in the north there is a broad "bald spot" of anomalously weak field, ' +
        'and in some locations there are patches of reversed polarity. ' +
        'No existing theory of magnetic field generation in gas giants had predicted anything like this.',
      ],
    },

    {
      image: {
        cacheKey: 'juno-jupiter-magnetic-field-map',
        prompt:
          'Scientific illustration of Jupiter magnetic field map: ' +
          'a flattened oval projection of Jupiter\'s surface showing the magnetic field strength ' +
          'as a color heatmap — deep blue for strong southward field, deep red for strong northward field, ' +
          'white/grey for weak field areas, ' +
          'an anomalous "bald spot" of weak field visible in the northern hemisphere, ' +
          'field line contours overlaid, monospace axis labels showing latitude and longitude, ' +
          'hard sci-fi style, dark background. ' +
          'Add the following text labels on the image: "north hemisphere", "south hemisphere", "weak field zone", "field reversal region", "strong dipole".',
        alt: 'Jupiter magnetic field map in Mercator projection — asymmetry between northern and southern hemispheres, weak field zone, and areas of reversed polarity',
        caption:
          'Jupiter\'s magnetic field as mapped by Juno turned out to be strikingly asymmetric. ' +
          'The northern hemisphere contains a large zone of reduced field strength. ' +
          'Standard dynamo theory expected a much more uniform distribution.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'What hides beneath the clouds: zonal jets and water',
      level: 2,
      paragraphs: [
        'Jupiter\'s bands and zones are the planet\'s most recognizable feature. ' +
        'For a long time astronomers debated whether they are a thin surface effect — ' +
        'like paint on a ball — or genuinely deep currents penetrating the interior.',

        'Juno answered that question. ' +
        'The zonal jets reach approximately three thousand kilometers into the planet. ' +
        'That is an enormous depth — yet only a small fraction of Jupiter\'s radius, ' +
        'which exceeds seventy thousand kilometers. ' +
        'Below three thousand kilometers the pressure becomes so great that hydrogen begins to behave as an electrical conductor. ' +
        'Electrically conducting hydrogen freezes the jets: ' +
        'magnetic forces resist differential rotation and prevent the winds from penetrating deeper.',

        'A second puzzle concerned water. ' +
        'The water vapor content of Jupiter\'s atmosphere is a clue to the conditions ' +
        'in the protosolar nebula when the planet formed. ' +
        'The Galileo probe in the nineteen-nineties measured very little water — ' +
        'but it happened to enter an anomalously dry region of the atmosphere, something like a desert. ' +
        'Juno\'s microwave radiometer measured the global water abundance ' +
        'and showed it is far greater than what the Galileo probe found. ' +
        'Jupiter turned out to be "wetter" — consistent with models in which ' +
        'the planet accreted material enriched in heavy elements beyond solar proportions.',
      ],
    },

    {
      image: {
        cacheKey: 'juno-jupiter-polar-cyclones',
        prompt:
          'Photorealistic scientific illustration based on Juno data: ' +
          'Jupiter\'s north pole viewed from above, ' +
          'a central cyclone surrounded by eight symmetrically arranged cyclone vortices, ' +
          'each cyclone hundreds of kilometers in diameter with visible spiral cloud structure, ' +
          'vivid orange-brown-white cloud coloration, ' +
          'dark space background visible at corners, ' +
          'hard sci-fi style, technically plausible. ' +
          'Add the following text labels on the image: "central cyclone", "8 surrounding cyclones", "north pole", "each ~4000 km diameter".',
        alt: 'Jupiter\'s north pole — a central cyclone surrounded by eight symmetrically arranged vortices, each thousands of kilometers in diameter',
        caption:
          'Jupiter\'s north pole as revealed by Juno: a central vortex surrounded by eight stable cyclones. ' +
          'At the south pole there are five. ' +
          'Why this system remains so stable and geometrically ordered is still not fully understood.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Polar cyclones: the octagon and the pentagon',
      level: 2,
      paragraphs: [
        'The most visually surprising discovery of the Juno mission was the planet\'s poles. ' +
        'Before the mission nobody knew what was there — Jupiter had never been photographed ' +
        'from a polar perspective with anything close to this resolution.',

        'When Juno transmitted its first images of the north pole, scientists saw ' +
        'a central cyclone surrounded by eight giant vortices, ' +
        'each approximately four thousand kilometers in diameter. ' +
        'At the south pole: a central cyclone and five surrounding ones. ' +
        'These polar clusters hold their geometry stably from pass to pass: ' +
        'an octagonal arrangement in the north, a pentagonal one in the south. ' +
        'No planetary science model at that time had predicted anything like it.',

        'For comparison: the Great Red Spot is a single storm, though a colossal one, ' +
        'that has persisted for at least several centuries. ' +
        'The polar clusters are a different phenomenon entirely, ' +
        'and there is still no consensus explanation for what sustains them in such an ordered state.',
      ],
    },

    {
      heading: 'From Jupiter to its moons: the extended mission',
      level: 2,
      paragraphs: [
        'Juno\'s primary mission concluded in 2018, but the spacecraft remained in excellent condition. ' +
        'The agency extended the mission and reformulated its objective. ' +
        'New flybys brought Juno within close range of Jupiter\'s large moons: Ganymede, Europa, and Io.',

        'In 2022 the spacecraft performed the closest flyby of Ganymede in decades — ' +
        'approaching to within a thousand kilometers. ' +
        'Later that year it flew past Europa at less than four hundred kilometers, ' +
        'returning surface images at resolution previously unavailable. ' +
        'During 2023 and 2024 a series of Io flybys produced the first detailed maps of its volcanic activity ' +
        'and revealed that some volcanoes on Io had shifted position relative to where models expected them.',

        'These flybys served as reconnaissance ahead of dedicated successor missions. ' +
        'The Europa Clipper spacecraft reached Jupiter\'s vicinity in the mid-2020s ' +
        'and will conduct a systematic study of Europa\'s subsurface ocean. ' +
        'Juno assembled the first detailed baseline for those missions.',
      ],
    },

    {
      image: {
        cacheKey: 'juno-jupiter-io-volcanoes',
        prompt:
          'Photorealistic scientific illustration of Io moon surface as seen from close proximity during Juno flyby: ' +
          'volcanic landscape with multiple active eruption plumes rising hundreds of kilometers high, ' +
          'lava flows glowing orange-red against sulphurous yellow-green surface, ' +
          'Jupiter visible as an enormous presence in the background, ' +
          'hard sci-fi style, technically plausible based on Juno/Galileo data. ' +
          'Add the following text labels on the image: "Io surface", "active volcano", "lava flow", "eruption plume", "Jupiter (background)".',
        alt: 'Io surface during a Juno flyby — volcanic activity with eruption plumes and lava flows against the backdrop of Jupiter',
        caption:
          'Io is the most volcanically active body in the solar system. ' +
          'Juno flybys in 2023 and 2024 produced new surface maps ' +
          'and found that some volcanoes had migrated relative to the positions predicted by existing tidal heating models.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'JunoCam: science for everyone',
      level: 2,
      paragraphs: [
        'Among Juno\'s nine instruments is one not designed primarily for researchers. ' +
        'JunoCam is a relatively modest color camera included in the mission not because of scientific priority ' +
        'but for citizen science and public engagement.',

        'The agency releases raw JunoCam images to the public after every perijove pass. ' +
        'Thousands of amateur astronomers around the world download them, ' +
        'process them, enhance the colors, bring out the detail in the cloud structures — and publish. ' +
        'The most iconic images of Jupiter associated with this mission ' +
        'were produced not by staff scientists but by volunteers working with amateur skills ' +
        'and freely available software.',

        'This represents a new paradigm for robotic missions: the agency provides the data, ' +
        'and the community transforms it into art and discovery. ' +
        'Several amateur processing runs revealed details that automated pipeline processing had missed.',
      ],
    },

    {
      diagram: {
        title: 'Jupiter\'s atmospheric layers and Juno\'s sounding depth',
        svg: `<svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Jupiter atmospheric layers — Juno sounding depth</text>

  <!-- Layer 1: Upper atmosphere / stratosphere -->
  <rect x="60" y="40" width="460" height="42" fill="#1a2535" opacity="0.9" rx="2"/>
  <text x="75" y="57" fill="#8899aa" font-family="monospace" font-size="10">Stratosphere / upper atmosphere</text>
  <text x="75" y="70" fill="#667788" font-family="monospace" font-size="9">above cloud tops</text>

  <!-- Layer 2: Visible cloud deck -->
  <rect x="60" y="84" width="460" height="40" fill="#4a3420" opacity="0.85" rx="2"/>
  <text x="75" y="100" fill="#d4a060" font-family="monospace" font-size="10">Visible cloud deck</text>
  <text x="75" y="113" fill="#8b7040" font-family="monospace" font-size="9">ammonia, water, ammonium hydrosulfide crystals</text>

  <!-- Layer 3: Water cloud layer -->
  <rect x="60" y="126" width="460" height="40" fill="#2a3545" opacity="0.85" rx="2"/>
  <text x="75" y="142" fill="#7bb8ff" font-family="monospace" font-size="10">Water cloud layer</text>
  <text x="75" y="155" fill="#5a8aaa" font-family="monospace" font-size="9">~100 km below visible cloud tops</text>

  <!-- Layer 4: Deep atmosphere — MWR probed to here -->
  <rect x="60" y="168" width="460" height="55" fill="#1a3025" opacity="0.85" rx="2"/>
  <text x="75" y="185" fill="#44ff88" font-family="monospace" font-size="10">Deep atmosphere</text>
  <text x="75" y="198" fill="#30a060" font-family="monospace" font-size="9">~350 km — microwave radiometer sounding limit</text>
  <text x="75" y="212" fill="#30a060" font-family="monospace" font-size="9">global water abundance measured here</text>

  <!-- Layer 5: Zonal jet region -->
  <rect x="60" y="225" width="460" height="55" fill="#25203a" opacity="0.85" rx="2"/>
  <text x="75" y="242" fill="#ff8844" font-family="monospace" font-size="10">Zonal jet region</text>
  <text x="75" y="256" fill="#aa5522" font-family="monospace" font-size="9">to ~3000 km — revealed by Juno gravity science</text>
  <text x="75" y="270" fill="#aa5522" font-family="monospace" font-size="9">below: metallic hydrogen brakes the winds</text>

  <!-- Layer 6: Metallic hydrogen -->
  <rect x="60" y="282" width="460" height="40" fill="#1a1530" opacity="0.9" rx="2"/>
  <text x="75" y="298" fill="#cc4444" font-family="monospace" font-size="10">Metallic hydrogen</text>
  <text x="75" y="311" fill="#882222" font-family="monospace" font-size="9">source of Jupiter's magnetic field</text>

  <!-- Layer 7: Diffuse core -->
  <rect x="60" y="324" width="460" height="40" fill="#100e1a" opacity="0.95" rx="2" stroke="#446688" stroke-width="1"/>
  <text x="75" y="340" fill="#4488aa" font-family="monospace" font-size="10">Diffuse core (Juno discovery)</text>
  <text x="75" y="353" fill="#336677" font-family="monospace" font-size="9">heavy elements blended with hydrogen — NOT a compact solid core</text>

  <!-- MWR probe depth arrow -->
  <line x1="535" y1="40" x2="535" y2="222" stroke="#44ff88" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.9"/>
  <polygon points="535,225 531,215 539,215" fill="#44ff88" opacity="0.9"/>
  <text x="545" y="100" fill="#44ff88" font-family="monospace" font-size="9" transform="rotate(90,545,100)">MWR depth</text>

  <!-- Gravity probe depth arrow -->
  <line x1="555" y1="40" x2="555" y2="278" stroke="#ff8844" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.9"/>
  <polygon points="555,282 551,272 559,272" fill="#ff8844" opacity="0.9"/>
  <text x="565" y="130" fill="#ff8844" font-family="monospace" font-size="9" transform="rotate(90,565,130)">gravity probe</text>
</svg>`,
        caption:
          'Juno\'s microwave radiometer probed the atmosphere to a depth of approximately three hundred fifty kilometers — ' +
          'far below the visible cloud deck. ' +
          'Gravity science revealed zonal jets to three thousand kilometers ' +
          'and showed the absence of a compact solid core.',
      },
    },

    {
      heading: 'End of mission and legacy',
      level: 2,
      paragraphs: [
        'In September 2025 the Juno mission concluded with a planned atmospheric entry into Jupiter. ' +
        'This is the standard protocol for spacecraft that have exhausted their operational life near large moons: ' +
        'to eliminate any possibility of contaminating Europa or Ganymede with terrestrial microorganisms, ' +
        'the spacecraft is destroyed in the planet\'s atmosphere.',

        'Over fourteen years in space — from 2011 to 2025 — Juno completed more than sixty orbital passes of Jupiter ' +
        'and several dozen flybys of its moons. ' +
        'It transmitted several hundred gigabytes of data and images. ' +
        'It disproved one of the oldest models of Jupiter\'s interior structure. ' +
        'It discovered an entirely new category of atmospheric features — polar cyclone clusters — ' +
        'never previously observed on any planet. ' +
        'It settled a debate about Jupiter\'s water abundance that had persisted since the nineteen-nineties. ' +
        'And it proved that solar power can sustain a science spacecraft in the outer solar system.',

        'The legacy of Juno is not only scientific publications. ' +
        'It is a new set of questions about gas giants across the galaxy. ' +
        'Planets found orbiting other stars — the so-called hot Jupiters — ' +
        'can now be examined through the lens of what we learned about the interior of our own Jupiter. ' +
        'Diffuse cores, asymmetric magnetic fields, deep zonal jets — ' +
        'these are likely not unique to Jupiter but general properties of gas giants everywhere.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Microwave radiometer',
      definition:
        'An instrument that detects the planet\'s own thermal microwave emission. ' +
        'Different wavelengths penetrate to different depths in the atmosphere, ' +
        'allowing a three-dimensional picture of temperature and chemical composition to be built.',
    },
    {
      term: 'Polar orbit',
      definition:
        'An orbit whose plane is nearly perpendicular to the planet\'s equator. ' +
        'It allows a spacecraft to progressively cover the entire surface from pole to pole ' +
        'over a series of revolutions.',
    },
    {
      term: 'Radiation belts',
      definition:
        'Zones around a planet where the magnetic field traps charged particles. ' +
        'Jupiter\'s are the most intense in the solar system outside the Sun: ' +
        'unshielded electronics degrade there within hours.',
    },
    {
      term: 'Diffuse (fuzzy) core',
      definition:
        'The interior structure discovered by Juno: instead of a compact solid core, ' +
        'Jupiter\'s center contains a large dilute zone where heavy elements are intermixed with hydrogen and helium.',
    },
    {
      term: 'Zonal jets',
      definition:
        'Horizontal wind currents flowing parallel to the equator that produce Jupiter\'s banded appearance. ' +
        'Juno showed they extend approximately three thousand kilometers into the planet.',
    },
    {
      term: 'Doppler gravity science',
      definition:
        'A technique for measuring the distribution of mass inside a planet by tracking tiny changes ' +
        'in the spacecraft\'s velocity: gravitational anomalies slightly perturb the orbit, ' +
        'recorded as frequency shifts in the radio signal.',
    },
    {
      term: 'Polar cyclone cluster',
      definition:
        'A stable system of vortices at Jupiter\'s poles, discovered by Juno: ' +
        'a central cyclone surrounded by eight (north) or five (south) symmetrically arranged ones.',
    },
    {
      term: 'Metallic hydrogen',
      definition:
        'A state of hydrogen under extreme pressure in which electrons detach from atoms ' +
        'and hydrogen becomes electrically conducting. In this state, hydrogen in Jupiter\'s interior ' +
        'generates the planet\'s magnetic field.',
    },
    {
      term: 'Radioisotope thermoelectric generator',
      definition:
        'A device that converts the heat of radioactive decay into electrical current. ' +
        'The standard power source for outer solar system missions before Juno, ' +
        'which replaced it with solar panels.',
    },
  ],

  quiz: [
    {
      question: 'What makes Juno unique among all missions to the outer planets?',
      options: [
        'It was the first spacecraft to reach Jupiter\'s orbit',
        'It was the first to use solar panels rather than a radioisotope generator at such distance from the Sun',
        'It was the first to photograph the Great Red Spot',
        'It is the only mission to have delivered an atmospheric probe into Jupiter',
      ],
      correctIndex: 1,
      explanation:
        'Before Juno, every spacecraft beyond Mars requiring substantial power used radioisotope thermoelectric generators. ' +
        'Juno was the first to operate on solar power at Jupiter\'s distance, ' +
        'where sunlight intensity is approximately twenty-seven times lower than at Earth.',
    },
    {
      question: 'What did Juno discover about Jupiter\'s core?',
      options: [
        'Jupiter has a compact rocky core with a mass of approximately ten Earth masses',
        'There is no core at all — Jupiter is uniform throughout',
        'Instead of a compact core there is a large diffuse zone where heavy elements are blended with hydrogen',
        'Jupiter\'s core is iron-nickel, similar to Earth\'s',
      ],
      correctIndex: 2,
      explanation:
        'Juno\'s gravity science showed that standard models of a compact solid core are incorrect. ' +
        'The center of Jupiter contains a diffuse zone where heavy elements are mixed with hydrogen and helium ' +
        'without a sharp boundary. This is one of the mission\'s most unexpected discoveries.',
    },
    {
      question: 'What structure did Juno discover at Jupiter\'s poles?',
      options: [
        'A clear gap in clouds — a "polar hole"',
        'Auroral emissions similar to Earth\'s northern lights',
        'Clusters of giant cyclones: eight at the north and five at the south',
        'An ice cap of solid ammonia',
      ],
      correctIndex: 2,
      explanation:
        'Before Juno, Jupiter\'s poles had never been imaged at close range. ' +
        'The mission revealed a system of stable vortices: a central cyclone surrounded by eight at the north pole ' +
        'and five at the south. These structures were not predicted by any prior model.',
    },
    {
      question: 'To what depth did Juno\'s microwave radiometer probe Jupiter\'s atmosphere?',
      options: [
        'Only a few kilometers — just to the top cloud deck',
        'Approximately three hundred fifty kilometers — well below the visible clouds into the deep atmosphere',
        'To three thousand kilometers — all the way to the metallic hydrogen layer',
        'To the core',
      ],
      correctIndex: 1,
      explanation:
        'The microwave radiometer probed to approximately three hundred fifty kilometers — ' +
        'far below the visible cloud deck. ' +
        'Gravity science revealed zonal jets to three thousand kilometers, ' +
        'but the instrument itself does not directly sense to that depth.',
    },
    {
      question: 'How did the Juno mission end in September 2025?',
      options: [
        'The spacecraft returned to Earth carrying samples',
        'Contact was lost due to radiation damage',
        'The spacecraft was deliberately directed into Jupiter\'s atmosphere to avoid contaminating its moons',
        'The spacecraft departed on an interstellar trajectory out of the solar system',
      ],
      correctIndex: 2,
      explanation:
        'A planned atmospheric entry is the standard disposal protocol for spacecraft operating near moons ' +
        'that could potentially harbor life. ' +
        'If Juno had failed uncontrolled and struck Europa or Ganymede, ' +
        'it could have delivered terrestrial microorganisms and permanently compromised ' +
        'the possibility of detecting extraterrestrial life there.',
    },
  ],

  sources: [
    {
      title: 'NASA Juno Mission — Official Science Summary',
      url: 'https://www.nasa.gov/mission_pages/juno/main/index.html',
      meta: 'NASA, open access, updated 2025',
    },
    {
      title: 'Bolton S. et al. — Jupiter\'s interior and deep atmosphere: The initial pole-to-pole passes with the Juno spacecraft, Science 2017',
      url: 'https://www.science.org/doi/10.1126/science.aal2108',
      meta: 'Science, vol. 356, May 2017',
    },
    {
      title: 'Iess L. et al. — Measurement of Jupiter\'s asymmetric gravity field, Nature 2018',
      url: 'https://www.nature.com/articles/nature25776',
      meta: 'Nature, vol. 555, Mar 2018',
    },
    {
      title: 'Kaspi Y. et al. — Jupiter\'s atmospheric jet streams extend thousands of kilometres deep, Nature 2018',
      url: 'https://www.nature.com/articles/nature25793',
      meta: 'Nature, vol. 555, Mar 2018',
    },
    {
      title: 'Adriani A. et al. — Clusters of cyclones encircling Jupiter\'s poles, Nature 2018',
      url: 'https://www.nature.com/articles/nature25491',
      meta: 'Nature, vol. 555, Mar 2018',
    },
    {
      title: 'Li C. et al. — The water abundance in Jupiter\'s equatorial zone, Nature Astronomy 2020',
      url: 'https://www.nature.com/articles/s41550-020-1009-3',
      meta: 'Nature Astronomy, 2020',
    },
    {
      title: 'Connerney J. et al. — A New Model of Jupiter\'s Magnetic Field at the Completion of Juno\'s Prime Mission, JGR Planets 2022',
      url: 'https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2021JE007055',
      meta: 'JGR Planets, 2022',
    },
    {
      title: 'JunoCam Image Processing — Citizen Science Portal',
      url: 'https://www.missionjuno.swri.edu/junocam/processing',
      meta: 'Southwest Research Institute, open access',
    },
    {
      title: 'NASA — Europa Clipper Mission Overview',
      url: 'https://europa.nasa.gov/',
      meta: 'NASA, updated 2025',
    },
    {
      title: 'Bagenal F. et al. — Magnetospheric Science Objectives of the Juno Mission, Space Science Reviews 2017',
      url: 'https://link.springer.com/article/10.1007/s11214-014-0036-8',
      meta: 'Space Science Reviews, 2017',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
