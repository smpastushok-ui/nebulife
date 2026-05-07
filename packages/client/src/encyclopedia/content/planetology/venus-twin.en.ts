import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'venus-twin',
  language: 'en',
  section: 'planetology',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Venus — Earth\'s Hellish Twin',
  subtitle: 'A planet nearly identical to Earth in size, yet with a surface hotter than molten lead and pressure that would crush a submarine.',

  hero: {
    cacheKey: 'venus-twin-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: Venus planet in full disc view from space, ' +
      'thick pale yellow-white cloud layers completely covering the globe, subtle swirling cloud patterns, ' +
      'dark space background with stars, dramatic side lighting revealing cloud texture and curvature, ' +
      'scientific accuracy, cinematic composition. ' +
      'Add the following text labels on the image: "Venus", "Sulfuric Acid Clouds", "270 km thick atmosphere".',
    alt: 'Venus in full disc view — an unbroken layer of sulfuric acid clouds above a hellish surface',
    caption: 'Venus is permanently hidden behind an impenetrable cloud deck. What we see through a telescope is not the surface but the upper cloud layer of sulfuric acid at roughly seventy kilometers altitude.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'If the solar system had been arranged slightly differently, Venus might have become a second Earth. ' +
        'In size and mass it is nearly identical to our planet — the difference is less than five percent. ' +
        'It was the first planet astronomers classically compared to Earth, and the first one humanity sent probes to explore. ' +
        'But what those probes found changed our understanding of how thin the line is between a habitable world and an uninhabitable one.',

        'The surface of Venus is baked to four hundred and sixty-two degrees Celsius — ' +
        'hot enough to melt lead. ' +
        'Atmospheric pressure is ninety-two times higher than on Earth: ' +
        'roughly what a person would feel at one kilometer depth beneath the ocean. ' +
        'Above all of this hangs a cloud layer of sulfuric acid tens of kilometers thick, ' +
        'through which only a faint orange light reaches the surface. ' +
        'The planet closest to us turned out to be the most hostile.',
      ],
    },

    {
      heading: 'Why It Is So Hot: A Greenhouse With No Off Switch',
      level: 2,
      paragraphs: [
        'Earth and Venus formed at roughly the same time from the same protoplanetary disk ' +
        'and received similar amounts of volatile compounds and water. ' +
        'The critical difference is distance from the Sun. ' +
        'Venus sits approximately twenty-eight percent closer to the Sun than Earth does, ' +
        'and therefore receives nearly twice the solar radiation.',

        'In its early history, Venus likely had liquid water on its surface — ' +
        'computer models allow for this during perhaps several hundred million years of the planet\'s youth. ' +
        'But as the Sun gradually brightened over time, temperatures rose enough ' +
        'for water to begin evaporating intensely. ' +
        'Water vapor is a potent greenhouse gas and warmed the atmosphere further, ' +
        'accelerating evaporation even more. ' +
        'This process is called a **_runaway greenhouse effect_**: ' +
        'a feedback loop between heating and evaporation that cannot be stopped. ' +
        'Water moved into the upper atmosphere, where ultraviolet radiation broke apart the molecules, ' +
        'and hydrogen was gradually swept away into space. ' +
        'The planet lost its oceans permanently.',

        'What remained is an atmosphere of nearly ninety-six percent carbon dioxide. ' +
        'Carbon dioxide traps heat so efficiently ' +
        'that even the night side of Venus, which receives no sunlight, ' +
        'remains as hot as the day side — the temperature difference between poles and equator, ' +
        'between day and night, is only a few degrees. ' +
        'The atmosphere functions as a near-perfect heat exchanger.',
      ],
    },

    {
      image: {
        cacheKey: 'venus-surface-radar',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Venus surface as revealed by radar mapping, ' +
          'volcanic plains with lava flows, highland regions, large shield volcanoes, impact craters, ' +
          'orange-red glowing atmosphere near the horizon, dramatic volcanic landscape, ' +
          'false-color radar topography style as seen by Magellan spacecraft, scientific accuracy. ' +
          'Add the following text labels on the image: "Volcanic Plains", "Highland Tessera", "Shield Volcano", "Impact Crater".',
        alt: 'The surface of Venus revealed by radar mapping — volcanic plains, highland massifs, and craters',
        caption: 'The surface of Venus reconstructed from radar data collected by the Magellan mission in the nineteen-nineties. The permanent cloud cover makes optical observation impossible, but radar penetrates straight through.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'An Atmosphere That Laps the Planet Before the Planet Can Turn',
      level: 2,
      paragraphs: [
        'Venus rotates on its axis extraordinarily slowly — ' +
        'a single Venusian day is longer than its year. ' +
        'The planet takes two hundred and forty-three Earth days to complete one rotation, ' +
        'but only two hundred and twenty-five Earth days to orbit the Sun. ' +
        'Furthermore, Venus rotates in the opposite direction compared to most planets: ' +
        'if you stood on its surface, the Sun would rise in the west and set in the east.',

        'Yet the atmosphere of Venus operates by entirely different rules. ' +
        'The upper cloud layers complete a full circuit around the planet in just four Earth days — ' +
        'sixty times faster than the planet itself. ' +
        'Winds at seventy kilometers altitude reach three hundred and fifty to four hundred kilometers per hour. ' +
        'This is called **_atmospheric super-rotation_**, ' +
        'and the mechanism sustaining it remains an active scientific puzzle. ' +
        'The Japanese Akatsuki mission, which entered Venus orbit in 2015, ' +
        'detected enormous wave structures in the atmosphere — ' +
        'stationary waves ten thousand kilometers long stretching from pole to pole. ' +
        'These waves appear to be part of the mechanism driving super-rotation.',

        'At the surface, the wind is completely different — slow, just a few kilometers per hour. ' +
        'But because the atmosphere is ninety times denser than Earth\'s, ' +
        'even that gentle breeze carries significant force: it moves rocks and dust. ' +
        'Standing on the surface of Venus would mean suffocating, melting, and being crushed simultaneously.',
      ],
    },

    {
      diagram: {
        title: 'Venus versus Earth: Atmosphere and Temperature',
        svg: `<svg viewBox="0 0 580 420" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="580" height="420" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Title -->
  <text x="290" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="12">Atmosphere comparison: Earth (left) versus Venus (right)</text>

  <!-- EARTH column -->
  <!-- Surface -->
  <rect x="40" y="340" width="190" height="30" fill="#44ff88" opacity="0.25" rx="2"/>
  <text x="135" y="361" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="10">Surface: +15°C, 1 atm</text>

  <!-- Troposphere -->
  <rect x="40" y="270" width="190" height="70" fill="#7bb8ff" opacity="0.12" rx="2"/>
  <text x="135" y="295" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="10">Troposphere</text>
  <text x="135" y="309" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">0 — 12 km</text>
  <text x="135" y="323" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">H₂O clouds, rain</text>

  <!-- Stratosphere -->
  <rect x="40" y="190" width="190" height="80" fill="#4488aa" opacity="0.10" rx="2"/>
  <text x="135" y="218" text-anchor="middle" fill="#4488aa" font-family="monospace" font-size="10">Stratosphere</text>
  <text x="135" y="232" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">12 — 50 km</text>
  <text x="135" y="246" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">ozone layer</text>

  <!-- Upper atmo -->
  <rect x="40" y="90" width="190" height="100" fill="#334455" opacity="0.15" rx="2"/>
  <text x="135" y="118" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Mesosphere / Thermosphere</text>
  <text x="135" y="132" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">50 — 500+ km</text>

  <!-- Earth label -->
  <text x="135" y="72" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="13" font-weight="bold">EARTH</text>
  <text x="135" y="86" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">N₂ 78% + O₂ 21%</text>

  <!-- Divider -->
  <line x1="290" y1="55" x2="290" y2="395" stroke="#334455" stroke-width="1" stroke-dasharray="4,3"/>

  <!-- VENUS column -->
  <!-- Surface -->
  <rect x="350" y="340" width="190" height="30" fill="#cc4444" opacity="0.35" rx="2"/>
  <text x="445" y="361" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="10">Surface: +462°C, 92 atm</text>

  <!-- Lower atmo dense -->
  <rect x="350" y="260" width="190" height="80" fill="#ff8844" opacity="0.12" rx="2"/>
  <text x="445" y="285" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="10">Lower atmosphere</text>
  <text x="445" y="299" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">0 — 50 km</text>
  <text x="445" y="313" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">CO₂, N₂, SO₂</text>

  <!-- Cloud layer -->
  <rect x="350" y="170" width="190" height="90" fill="#cc8844" opacity="0.20" rx="2"/>
  <text x="445" y="198" text-anchor="middle" fill="#cc8844" font-family="monospace" font-size="10">Cloud deck</text>
  <text x="445" y="212" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">45 — 70 km</text>
  <text x="445" y="226" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">H₂SO₄ (sulfuric acid)</text>
  <text x="445" y="240" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">super-rotation: 350 km/h</text>

  <!-- Upper atmo Venus -->
  <rect x="350" y="90" width="190" height="80" fill="#334455" opacity="0.12" rx="2"/>
  <text x="445" y="118" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Upper atmosphere</text>
  <text x="445" y="132" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">70 — 120+ km</text>

  <!-- Venus label -->
  <text x="445" y="72" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="13" font-weight="bold">VENUS</text>
  <text x="445" y="86" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">CO₂ 96.5% + N₂ 3.5%</text>

  <text x="290" y="410" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Not to scale. Temperature and pressure shown at surface level.</text>
</svg>`,
        caption: 'The atmospheres of Earth and Venus share a similar layered structure, but differ fundamentally in composition, pressure, and temperature. The cloud deck of Venus between forty-five and seventy kilometers altitude consists of droplets of sulfuric acid.',
      },
    },

    {
      heading: 'Volcanoes Without Plates: The Geology of a Locked World',
      level: 2,
      paragraphs: [
        'The surface of Venus is strikingly young in geological terms. ' +
        'Some bodies in the solar system preserve traces of their first billion years — ' +
        'the Moon, Mercury, most asteroids. ' +
        'Venus has surprisingly few impact craters, and they are distributed almost uniformly across the entire planet. ' +
        'This indicates a global resurfacing event that occurred comparatively recently — ' +
        'roughly several hundred million years ago — burying the previous surface under a layer of lava.',

        'On Earth, internal heat escapes through **_plate tectonics_**: ' +
        'the crust is broken into fragments that move, subduct, and remelt in the mantle. ' +
        'Venus appears to lack such mobile plates. ' +
        'Instead, internal heat accumulates until, when it becomes too great, ' +
        'it ruptures the crust in massive volcanic outbursts — ' +
        'and the entire planetary surface is resurfaced simultaneously. ' +
        'This mechanism is called **_catastrophic resurfacing_**.',

        'More than sixteen hundred large volcanoes are known on Venus, ' +
        'along with hundreds of structures unique to this planet. ' +
        'Coronae are ring-shaped volcanic features that form where hot mantle material rises and pushes up through the crust from below, ' +
        'creating concentric fractures and volcanic highlands. ' +
        'Arachnoids are spider-web-like fracture patterns surrounding volcanic domes. ' +
        'The Magellan mission in the nineteen-nineties radar-mapped nearly the entire surface ' +
        'and overturned ideas about how a geologically "active" planet without plate tectonics could look. ' +
        'Data from Magellan and the more recent Akatsuki spacecraft show hints ' +
        'that some volcanoes on Venus may be active right now.',
      ],
    },

    {
      image: {
        cacheKey: 'venus-volcanoes-corona',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Venus volcanic landscape with a large corona structure — ' +
          'a circular ring-shaped volcanic feature several hundred kilometers across, ' +
          'surrounded by radial fractures and lava flows, volcanic domes visible, ' +
          'orange-red glowing sky from thick atmosphere, dramatic lighting, ' +
          'false-color topographic rendering, scientific accuracy. ' +
          'Add the following text labels on the image: "Corona Structure", "Radial Fractures", "Lava Flows", "Volcanic Dome".',
        alt: 'A corona — a unique volcanic ring structure on Venus formed by rising mantle material',
        caption: 'Coronae are ring-shaped structures up to several hundred kilometers across found only on Venus. They form where hot mantle material rises and pushes through the crust from below, generating concentric fractures and volcanic ridges.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Soviet Landers: Twelve Seconds and Twenty-Seven Minutes',
      level: 2,
      paragraphs: [
        'In the twentieth century, the Soviet Union sent more than a dozen spacecraft to Venus in the Venera program. ' +
        'The first ones were crushed in the atmosphere: no one anticipated such pressure. ' +
        'Engineers redesigned the spacecraft again and again, ' +
        'thickening walls and improving thermal protection.',

        'In 1970, the Venera 7 spacecraft became the first to reach the surface of another planet and survive. ' +
        'It transmitted data for twenty-three minutes — ' +
        'the first direct transmission from the surface of another planet in history. ' +
        'But the true triumph came with Venera 9 in 1975: ' +
        'the world\'s first photograph from the surface of another planet. ' +
        'The image showed sharp, uneroded rocks, ' +
        'remarkably similar to a fresh geological cross-section. ' +
        'This proved that geological activity on Venus was comparatively recent.',

        'The Venera series established all the baseline parameters for the atmosphere and surface — ' +
        'temperature, pressure, chemical composition. ' +
        'The record operating time on the surface was about two hours: ' +
        'even the best-protected landers could not withstand the heat longer. ' +
        'That record still stands — no spacecraft has since operated on the Venusian surface for a longer duration.',
      ],
    },

    {
      image: {
        cacheKey: 'venera-lander-surface',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Soviet Venera lander on the surface of Venus, ' +
          'spherical pressure vessel with antennas, instrument probes touching rocky ground, ' +
          'angular unweathered basalt rocks scattered on the surface, ' +
          'orange-red glowing sky from thick carbon dioxide atmosphere, dramatic low-angle view, ' +
          'historical sci-fi accuracy, dark moody atmospheric lighting. ' +
          'Add the following text labels on the image: "Venera Lander", "Basalt Surface Rocks", "CO2 Atmosphere".',
        alt: 'A Soviet Venera lander on the surface of Venus — a rocky plain under an orange sky',
        caption: 'The Venera spacecraft were the only probes in history to operate successfully on the surface of Venus. The first color photograph from the surface of another planet was taken here — in the nineteen-seventies and eighties.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Phosphine and the Cloud Life Controversy',
      level: 2,
      paragraphs: [
        'In 2020, a team of astronomers announced the detection of traces of phosphine in the clouds of Venus. ' +
        'Phosphine — the molecule PH₃ — on Earth is produced primarily by microbes ' +
        'in anaerobic environments: swamps, animal intestines. ' +
        'In the acidic clouds of Venus it should not exist without some active source. ' +
        'Headlines around the world announced: perhaps there are microbes in the clouds of Venus.',

        'The scientific community responded skeptically, and quickly. ' +
        'Reanalysis of the same data from the ALMA radio telescope showed ' +
        'that the original data reduction contained an error, ' +
        'and the actual phosphine concentration could be far lower — ' +
        'or even zero. ' +
        'Arguments about possible abiotic sources of phosphine — volcanism, lightning, photochemistry — ' +
        'never yielded a definitive answer. ' +
        'As of today, the phosphine question remains open and contested: ' +
        'some researchers consider the signal real, others consider it an artifact.',

        'Independently of phosphine, the idea of **_cloud life_** on Venus is not new. ' +
        'At altitudes of forty-eight to sixty kilometers within the cloud layer, ' +
        'conditions are somewhat less extreme than on the surface: ' +
        'temperatures from near zero to sixty degrees Celsius, ' +
        'pressure from one to several atmospheres. ' +
        'A hypothetical microorganism would need to tolerate concentrated sulfuric acid — ' +
        'a demanding but not entirely absurd requirement. ' +
        'Upcoming missions will collect cloud material samples and deliver a definitive answer.',
      ],
    },

    {
      diagram: {
        title: 'Atmospheric Super-Rotation of Venus',
        svg: `<svg viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="560" height="380" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Planet body -->
  <circle cx="200" cy="190" r="110" fill="#cc8844" opacity="0.18"/>
  <circle cx="200" cy="190" r="110" fill="none" stroke="#cc8844" stroke-width="1.5"/>

  <!-- Planet label -->
  <text x="200" y="186" text-anchor="middle" fill="#cc8844" font-family="monospace" font-size="11" font-weight="bold">VENUS</text>
  <text x="200" y="200" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">axial rotation: 243 days</text>
  <text x="200" y="213" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">(retrograde)</text>

  <!-- Slow rotation arrow on planet (clockwise = retrograde) -->
  <path d="M 200 85 A 105 105 0 0 0 100 270" fill="none" stroke="#cc8844" stroke-width="1.2" stroke-dasharray="5,3" marker-end="url(#arrowOrangeEn)"/>

  <!-- Cloud layer orbit (superrotation) - dashed oval around planet -->
  <ellipse cx="200" cy="190" rx="155" ry="150" fill="none" stroke="#ff8844" stroke-width="2" opacity="0.7"/>

  <!-- Cloud rotation arrow -->
  <path d="M 200 42 A 150 148 0 0 1 345 260" fill="none" stroke="#ff8844" stroke-width="2" marker-end="url(#arrowRedEn)"/>

  <!-- Cloud layer label -->
  <text x="368" y="175" fill="#ff8844" font-family="monospace" font-size="11">Cloud deck</text>
  <text x="368" y="189" fill="#8899aa" font-family="monospace" font-size="9">45 — 70 km altitude</text>
  <text x="368" y="203" fill="#ff8844" font-family="monospace" font-size="11">4 DAYS</text>
  <text x="368" y="217" fill="#8899aa" font-family="monospace" font-size="9">to orbit the planet</text>
  <text x="368" y="231" fill="#8899aa" font-family="monospace" font-size="9">~350 km/h winds</text>

  <!-- Ratio box -->
  <rect x="358" y="270" width="170" height="50" fill="rgba(20,30,45,0.85)" rx="3" stroke="#aabbcc" stroke-width="0.7"/>
  <text x="443" y="290" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Atmosphere moves</text>
  <text x="443" y="304" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">60× faster than planet</text>

  <!-- Sun direction -->
  <line x1="30" y1="190" x2="75" y2="190" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,2" opacity="0.5"/>
  <text x="15" y="185" fill="#8899aa" font-family="monospace" font-size="9">Sun</text>
  <text x="15" y="197" fill="#8899aa" font-family="monospace" font-size="9">←</text>

  <!-- Arrow markers -->
  <defs>
    <marker id="arrowRedEn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#ff8844"/>
    </marker>
    <marker id="arrowOrangeEn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#cc8844"/>
    </marker>
  </defs>

  <text x="280" y="365" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Not to scale. Arrow directions are schematic.</text>
</svg>`,
        caption: 'Atmospheric super-rotation of Venus: the cloud deck completes a full circuit of the planet in four Earth days, while the planet itself rotates sixty times more slowly. The mechanism sustaining this wind pattern is still under investigation.',
      },
    },

    {
      heading: 'The Next Generation of Missions: DAVINCI, VERITAS, EnVision',
      level: 2,
      paragraphs: [
        'After Magellan and Akatsuki, humanity sent no dedicated Venus exploration missions for over thirty years. ' +
        'That is changing in the nineteen-thirties of the twenty-first century. ' +
        'Three missions, approved independently of one another, are heading toward Venus almost simultaneously.',

        'The DAVINCI mission from the National Aeronautics and Space Administration of the United States ' +
        'will drop a probe that slowly descends through the atmosphere, ' +
        'analyzing its chemical composition layer by layer. ' +
        'The planned launch is around 2029. ' +
        'The central question it asks: ' +
        'has Venus\'s atmosphere preserved traces of primordial gases that could reveal ' +
        'early water and the conditions of the planet\'s formation?',

        'The VERITAS mission, also from the American space agency, will use a synthetic aperture radar ' +
        'significantly more powerful than Magellan\'s ' +
        'to build a detailed three-dimensional map of the surface — ' +
        'and determine for the first time whether volcanic activity is happening today. ' +
        'In parallel, the European Space Agency is developing the EnVision mission, ' +
        'also planned for launch in the early twenty-thirties. ' +
        'EnVision will investigate the geological history, atmospheric chemistry, and heat flow of Venus — ' +
        'seeking to understand at what step Venus\'s trajectory diverged from Earth\'s.',
      ],
    },

    {
      image: {
        cacheKey: 'davinci-probe-descent',
        prompt:
          'Photorealistic illustration for a science encyclopedia: DAVINCI spacecraft probe descending through the thick atmosphere of Venus, ' +
          'spherical titanium probe with instrument sensors deployed, ' +
          'surrounded by thick yellowish-orange haze layers, ' +
          'spacecraft descending slowly on parachute, ' +
          'instruments sampling the atmospheric chemistry, ' +
          'dramatic perspective showing scale of the atmosphere, dark space visible far above, ' +
          'scientific accuracy, cinematic sci-fi style. ' +
          'Add the following text labels on the image: "DAVINCI Probe", "Atmospheric Sampling", "Sulfuric Acid Cloud Layer", "Surface Approach".',
        alt: 'The DAVINCI probe descending through the atmosphere of Venus, sampling its chemistry layer by layer',
        caption: 'Concept view of the DAVINCI probe during atmospheric entry at Venus. During descent the probe will measure the full chemical profile of the atmosphere — from the upper clouds down to the moment of surface impact.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What Venus Tells Us About Earth',
      level: 2,
      paragraphs: [
        'Venus serves as a natural laboratory for climate science. ' +
        'A runaway greenhouse effect is not science fiction — it is a documented planetary process. ' +
        'It happened there through a specific combination of distance from the star, ' +
        'atmospheric composition, and incoming solar radiation. ' +
        'Earth lies well outside the zone where this could occur today, ' +
        'but understanding why Venus went the way it did ' +
        'helps calibrate climate models for Earth and for exoplanets.',

        'Beyond that, Venus makes a compelling case: ' +
        'the size of a planet alone does not guarantee habitability. ' +
        'There is a habitable zone — a range of distances from a star ' +
        'where liquid water can be stable on a surface. ' +
        'But even within that zone, the outcome depends on atmospheric composition, ' +
        'the presence of plate tectonics, and how the planet manages its internal heat. ' +
        'When searching for habitable exoplanets, ' +
        'astronomers now explicitly account for the "Venus scenario" — ' +
        'a rocky planet in the habitable zone that nonetheless became an inferno.',

        'Venus remains the least-explored of the terrestrial planets — ' +
        'we know more about the floor of Earth\'s oceans than about the surface of Venus. ' +
        'But the next decade promises to change that: ' +
        'three missions and new generations of radar and atmospheric probes ' +
        'will finally deliver answers we have been waiting for since Venera 9.',
      ],
    },

    {
      image: {
        cacheKey: 'venus-earth-size-comparison',
        prompt:
          'Photorealistic illustration for a science encyclopedia: side-by-side size comparison of Earth and Venus, ' +
          'Earth showing blue oceans and green-brown continents with white clouds, ' +
          'Venus showing uniform pale yellow-white cloud cover, ' +
          'both at same scale against dark space background, very similar in size, ' +
          'scientific accuracy, clean composition. ' +
          'Add the following text labels on the image: "Earth (12 756 km diameter)", "Venus (12 104 km diameter)", "Size difference: 5%".',
        alt: 'Size comparison of Earth and Venus — nearly identical in diameter but radically different in conditions',
        caption: 'Earth and Venus differ in diameter by less than five percent — true twins in size. But atmospheric composition and distance from the Sun sent their fates in opposite directions.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Runaway greenhouse effect',
      definition: 'A self-reinforcing process in which rising temperature increases atmospheric water vapor, which further raises temperature. On Venus, this process transformed a potentially habitable planet into an uninhabitable one by evaporating all its oceans.',
    },
    {
      term: 'Atmospheric super-rotation',
      definition: 'A phenomenon in which a planet\'s atmosphere rotates around its axis far faster than the planet itself. On Venus, the cloud deck completes a full circuit in four Earth days, while the planet rotates in two hundred and forty-three days.',
    },
    {
      term: 'Catastrophic resurfacing',
      definition: 'A hypothetical geological mechanism on Venus in which internal heat accumulates over hundreds of millions of years, then bursts through the crust in massive volcanic outbursts that renew the entire surface simultaneously.',
    },
    {
      term: 'Corona (Venusian)',
      definition: 'A unique ring-shaped volcanic structure on Venus, formed where hot mantle material rises and pushes through the crust from below. Coronae can reach several hundred kilometers across and have no analogues elsewhere in the solar system.',
    },
    {
      term: 'Plate tectonics',
      definition: 'A mechanism by which a planet\'s crust is divided into mobile fragments — plates — that move, subduct, and remelt in the mantle. On Earth this efficiently removes internal heat and recycles the crust. Venus appears to lack this mechanism, leading to heat accumulation and catastrophic volcanic episodes.',
    },
    {
      term: 'Habitable zone',
      definition: 'The range of distances from a star within which surface temperatures permit liquid water to exist. Venus lies near the inner edge of this zone and demonstrates that even a "correct" distance does not guarantee habitability.',
    },
    {
      term: 'Phosphine',
      definition: 'The chemical compound PH₃, on Earth primarily of biological origin. The claimed detection of phosphine traces in the clouds of Venus in 2020 sparked debate about a possible microbial source, but confirmation and a complete scientific explanation have not yet been reached.',
    },
    {
      term: 'Synthetic aperture radar',
      definition: 'A radar imaging technique that produces detailed surface maps through clouds by processing signals from a moving spacecraft. The Magellan mission in the nineteen-nineties mapped Venus using exactly this technique.',
    },
    {
      term: 'Chemosynthesis',
      definition: 'A means by which organisms obtain energy through chemical reactions with inorganic compounds, without sunlight. Chemosynthetic microbes on Earth survive in hydrothermal environments and are considered a model for hypothetical life in the clouds of Venus.',
    },
  ],

  quiz: [
    {
      question: 'Why is the surface of Venus hotter than Mercury\'s, even though Mercury is closer to the Sun?',
      options: [
        'Venus is larger than Mercury and has more internal heat',
        'Venus\'s dense carbon dioxide atmosphere traps heat through a runaway greenhouse effect',
        'Venus rotates so slowly that its surface spends more time facing the Sun',
        'Volcanic activity on Venus directly heats the surface',
      ],
      correctIndex: 1,
      explanation: 'Mercury has almost no atmosphere and cools to minus one hundred and eighty degrees Celsius at night. Venus has an atmosphere of ninety-six percent carbon dioxide that traps heat so effectively that even its night side remains at four hundred and sixty-two degrees Celsius.',
    },
    {
      question: 'What is atmospheric super-rotation on Venus?',
      options: [
        'The rotation of the planetary core in the opposite direction to the mantle',
        'A phenomenon in which the cloud deck circulates sixty times faster than the planet itself',
        'Extremely strong surface winds that move boulders across the plains',
        'Continent-sized cyclonic storms in the lower atmosphere',
      ],
      correctIndex: 1,
      explanation: 'Super-rotation means the atmosphere moves much faster than the planet. The cloud deck of Venus completes a full orbit in four Earth days, while the planet itself rotates in two hundred and forty-three days. The mechanism sustaining this is an active scientific problem.',
    },
    {
      question: 'Which mission transmitted the first photograph from the surface of another planet?',
      options: [
        'The American Mariner mission in the nineteen-sixties',
        'The Soviet Venera 9 mission in the nineteen-seventies',
        'The American Magellan mission in the nineteen-nineties',
        'The Japanese Akatsuki mission in 2015',
      ],
      correctIndex: 1,
      explanation: 'The Venera 9 spacecraft in 1975 transmitted the world\'s first photograph from the surface of another planet. The image showed sharp, uneroded basalt rocks — evidence of comparatively recent geological activity.',
    },
    {
      question: 'What distinguishes the geology of Venus from that of Earth?',
      options: [
        'Venus has no volcanoes — only impact craters',
        'Venus has more active plate tectonics than Earth',
        'Venus appears to lack plate tectonics and resurfaces through catastrophic volcanic outbursts',
        'The geology of Venus and Earth is nearly identical due to their similar size',
      ],
      correctIndex: 2,
      explanation: 'Earth removes internal heat through the constant movement of tectonic plates. Venus appears to lack such plates and accumulates heat that periodically ruptures the crust in massive volcanic outbursts — resurfacing the entire planet simultaneously.',
    },
    {
      question: 'What are the three planned Venus missions of the early twenty-first century\'s nineteen-thirties — DAVINCI, VERITAS, and EnVision — designed to do?',
      options: [
        'They have already landed and confirmed microbial life in the clouds',
        'DAVINCI probes the atmosphere in descent, VERITAS maps the surface by radar, EnVision studies geological history',
        'All three are surface lander missions',
        'They are a single joint American-European mission operating under three names',
      ],
      correctIndex: 1,
      explanation: 'DAVINCI (planned launch around 2029) will analyze the atmospheric chemical profile during probe descent. VERITAS will build a detailed radar surface map to detect active volcanism. EnVision (European Space Agency) will investigate geological evolution and atmospheric chemistry.',
    },
  ],

  sources: [
    {
      title: 'Venus — NASA Solar System Exploration',
      url: 'https://solarsystem.nasa.gov/planets/venus/overview/',
      meta: 'NASA Solar System Exploration, general overview',
    },
    {
      title: 'DAVINCI Mission — NASA GSFC',
      url: 'https://science.nasa.gov/mission/davinci/',
      meta: 'NASA Goddard Space Flight Center, official mission page',
    },
    {
      title: 'VERITAS Mission — NASA JPL',
      url: 'https://science.nasa.gov/mission/veritas/',
      meta: 'NASA Jet Propulsion Laboratory, official mission page',
    },
    {
      title: 'EnVision — ESA Mission',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/EnVision',
      meta: 'European Space Agency, official mission page',
    },
    {
      title: 'Akatsuki (Venus Climate Orbiter) — JAXA',
      url: 'https://www.isas.jaxa.jp/en/missions/spacecraft/current/akatsuki.html',
      meta: 'JAXA, in Venus orbit since 2015',
    },
    {
      title: 'Phosphine gas in the cloud decks of Venus — Greaves et al., Nature Astronomy 2020',
      url: 'https://www.nature.com/articles/s41550-020-1174-4',
      meta: 'Nature Astronomy, 2020 — original phosphine detection paper',
    },
    {
      title: 'Magellan Mission — NASA JPL',
      url: 'https://www.jpl.nasa.gov/missions/magellan',
      meta: 'NASA JPL, radar mapping of Venus 1990-1994',
    },
    {
      title: 'Venera Program — NASA Space Science Data',
      url: 'https://nssdc.gsfc.nasa.gov/planetary/venera.html',
      meta: 'NASA NSSDC, archive of Soviet Venera missions',
    },
    {
      title: 'Runaway Greenhouse Effect on Venus — ESA',
      url: 'https://sci.esa.int/web/venus-express/-/47206-runaway-greenhouse',
      meta: 'ESA Venus Express science overview',
    },
    {
      title: 'Venus atmospheric super-rotation — Sánchez-Lavega et al., Nature Geoscience 2017',
      url: 'https://www.nature.com/articles/s41561-017-0006-z',
      meta: 'Nature Geoscience, 2017 — super-rotation mechanism',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
