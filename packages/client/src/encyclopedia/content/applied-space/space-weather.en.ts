import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'space-weather',
  language: 'en',
  section: 'applied-space',
  order: 5,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Space Weather and Solar Storms',
  subtitle: 'How the Sun can disable satellites, black out cities, and set telegraph wires on fire — in a matter of minutes.',

  hero: {
    cacheKey: 'space-weather-hero',
    prompt:
      'Photorealistic science illustration for an encyclopedia: dramatic view of the Sun erupting a massive coronal mass ejection toward Earth. ' +
      'Sun fills the left third of the frame with brilliant orange-white surface detail and a huge bright plasma arc leaving the corona. ' +
      'Earth visible in the far right, surrounded by a shimmering blue-green magnetosphere aurora glow. ' +
      'Deep black space background with solar wind particle streams shown as faint blue lines connecting Sun to Earth. ' +
      'Hard sci-fi style, technically plausible, dramatic lighting. ' +
      'Add the following text labels on the image: "coronal mass ejection", "solar wind", "magnetosphere", "Earth".',
    alt: 'The Sun launches a coronal mass ejection toward Earth — a billion-tonne plasma cloud racing through interplanetary space',
    caption:
      'A coronal mass ejection — a cloud of billions of tonnes of magnetized plasma — departs the solar corona at speeds ranging from a few hundred to several thousand kilometers per second. One to three days later it reaches Earth, compressing the magnetosphere and triggering a chain of effects from auroras at mid-latitudes to failures in power grids.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The Sun is not a placid star. Behind the apparent calm of a yellow dwarf lies a perpetual storm: ' +
        'streams of charged particles, bursts of X-ray radiation, and clouds of superheated plasma massing into billions of tonnes ' +
        'that periodically tear free from the surface and race outward toward the planets. ' +
        'This collection of phenomena is called **space weather**. Unlike ordinary weather, it cannot be felt on the skin — ' +
        'but it can be felt in power grids, in the onboard electronics of satellites, and in the navigation signals ' +
        'that billions of people rely on every day.',

        'In the nineteenth century humanity first encountered space weather entirely by accident — through burning telegraph equipment. ' +
        'In the twenty-first century the same physics threatens infrastructure worth trillions of dollars: ' +
        'from global navigation constellations to high-voltage transmission lines, from orbital satellite fleets to hospital equipment. ' +
        'Understanding where space weather comes from and how it acts is no longer academic curiosity. It is a practical necessity.',
      ],
    },

    {
      heading: 'Three messengers of the storm',
      level: 2,
      paragraphs: [
        'The Sun produces three fundamentally different types of events that affect Earth. ' +
        'They travel at different speeds, carry different kinds of energy, and act through different mechanisms.',
      ],
    },

    {
      heading: 'Solar flares',
      level: 3,
      paragraphs: [
        'A **solar flare** is a sudden explosive release of energy in the solar corona, primarily as X-ray and ultraviolet radiation. ' +
        'It travels at the speed of light — meaning it reaches Earth eight minutes after it happens on the Sun. ' +
        'There is no warning before it arrives; any alert is issued while it is already in transit.',

        'Flares are classified by the intensity of their X-ray output on a letter scale, with the most powerful events ' +
        'falling in the X class. X-class flares can ionize the upper layers of Earth\'s atmosphere within minutes, ' +
        'disrupting shortwave radio communications and degrading signals from global navigation systems. ' +
        'For astronauts in orbit or on the lunar surface, a powerful flare is a serious radiation warning.',
      ],
    },

    {
      heading: 'Coronal mass ejections',
      level: 3,
      paragraphs: [
        'A **coronal mass ejection** is the most dramatic event in solar physics. ' +
        'It is an enormous cloud of plasma and frozen-in magnetic field that tears free from the solar corona. ' +
        'A single cloud can contain from several hundred million to several billion tonnes of material ' +
        'and travel at speeds ranging from three hundred to over three thousand kilometers per second. ' +
        'When its trajectory intersects Earth, the journey takes one to three days.',

        'The critical parameter is the orientation of the magnetic field inside the cloud. ' +
        'If the field points southward — opposite to Earth\'s magnetospheric field — the cloud effectively "opens the door" ' +
        'and hot particles pour inside, triggering a geomagnetic storm. ' +
        'If the fields point in the same direction the impact is far weaker. ' +
        'This uncertainty makes consequence forecasting exceptionally difficult: ' +
        'the field orientation inside the cloud can only be measured minutes before it strikes Earth.',
      ],
    },

    {
      image: {
        cacheKey: 'space-weather-cme-diagram',
        prompt:
          'Scientific illustration of a coronal mass ejection leaving the Sun and traveling toward Earth: ' +
          'simplified side-view showing the Sun on the left with a looping CME arc in bright orange-yellow. ' +
          'A shaded plasma cloud propagates rightward through interplanetary space with embedded magnetic field lines shown as spiraling arrows. ' +
          'Earth on the far right with its magnetosphere depicted as a teardrop-shaped boundary compressed on the sunward side. ' +
          'Timeline markers showing approximate travel time: "8 min (X-rays)", "1-3 days (plasma cloud)". ' +
          'Hard sci-fi style, dark space background, monospace labels, orange and cyan accents. ' +
          'Add the following text labels on the image: "Sun", "coronal mass ejection", "interplanetary space", "Earth magnetosphere", "1-3 days transit".',
        alt: 'Diagram of a coronal mass ejection propagating from the Sun to Earth with travel time labels',
        caption:
          'X-ray radiation from a solar flare reaches Earth in eight minutes, simultaneously with the observation of the flare itself. The coronal mass ejection — the plasma cloud — takes one to three days. That time gap is the window available to alert grid operators and satellite controllers.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Solar energetic particles',
      level: 3,
      paragraphs: [
        '**Solar energetic particles** — predominantly protons accelerated to relativistic speeds ' +
        'by powerful flares or by the shock waves driven ahead of fast coronal mass ejections — ' +
        'travel far faster than the plasma cloud and can reach Earth within minutes to hours after a flare. ' +
        'These particles penetrate the radiation belts and pose a serious threat to astronauts in deep space ' +
        'and to satellites in polar orbits. Electronics without radiation-hardened shielding can blind or fail within minutes.',
      ],
    },

    {
      heading: 'The 11-year cycle: the Sun breathes',
      level: 2,
      paragraphs: [
        'All this activity is not evenly distributed in time. The Sun lives by its own rhythm — ' +
        'an approximately eleven-year cycle over which the number of sunspots, flares, and coronal mass ejections ' +
        'builds toward a maximum and then subsides toward a minimum. ' +
        'At **solar minimum** the surface is nearly quiet: coronal mass ejections are rare. ' +
        'At **solar maximum** the opposite is true: dozens of sunspot groups are visible at any given time, ' +
        'X-class flares occur several times a month, and coronal mass ejections can follow one another in rapid succession.',

        'The current cycle — the twenty-fifth since systematic record-keeping began — reached its maximum in the mid-2020s, ' +
        'and proved stronger than consensus forecasts predicted. The May 2024 storm — ' +
        'the strongest in twenty-one years — was the first genuine stress test of modern infrastructure ' +
        'under an active solar maximum. ' +
        'Auroras were observed at tropical latitudes, navigation signals degraded across Eurasia and North America, ' +
        'and several low-orbit satellites experienced elevated atmospheric drag forcing emergency maneuvers.',
      ],
    },

    {
      image: {
        cacheKey: 'space-weather-solar-cycle',
        prompt:
          'Scientific infographic showing the 11-year solar cycle as a waveform chart: ' +
          'horizontal axis labeled "year" spanning from 2000 to 2030, vertical axis labeled "sunspot number". ' +
          'Smooth sinusoidal curve in orange showing successive solar maxima: cycle 23 peak circa 2000, cycle 24 smaller peak circa 2014, cycle 25 larger peak circa 2024-2025. ' +
          'The 2024-2025 region highlighted with a bright vertical band labeled "solar maximum 25". ' +
          'Dashed vertical lines at each minimum. Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "solar minimum", "solar maximum", "cycle 24", "cycle 25", "2024 storm".',
        alt: 'Chart of the 11-year solar cycle from 2000 to 2030 — sunspot numbers and the marker for cycle 25 maximum',
        caption:
          'Solar cycle 25 proved more active than consensus forecasts anticipated. Its maximum fell in 2024 to 2025. The next minimum is expected in the late 2020s to early 2030s.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'How the storm strikes Earth',
      level: 2,
      paragraphs: [
        'When a coronal mass ejection reaches Earth it interacts with the magnetosphere — ' +
        'the invisible magnetic shield that deflects most charged particles away from the surface. ' +
        'But the shield is not absolute. During a powerful collision the magnetosphere is compressed on the dayside ' +
        'and stretched into a long tail on the nightside. ' +
        'Funneled particle streams flow down magnetic field lines toward the poles, ' +
        'colliding with atmospheric molecules and exciting them — ' +
        'visible as **auroras**. During the May 2024 storm those auroras reached the Mediterranean and Mexico.',
      ],
    },

    {
      heading: 'Geomagnetic storms: the invisible stress on power grids',
      level: 3,
      paragraphs: [
        'A fluctuating geomagnetic field during a storm is not merely a scenic natural phenomenon. ' +
        'It induces electrical currents in long conductors — power transmission lines, pipelines, telegraph cables — ' +
        'known as **geomagnetically induced currents**. ' +
        'For large substation transformers designed for alternating current at grid frequency, ' +
        'a quasi-direct induced current is destructive: it saturates the core, overheats the windings, ' +
        'and can destroy a transformer with no visible external damage.',

        'This is precisely what happened in the Canadian province of Quebec in March 1989: ' +
        'a powerful storm tripped protective relays and then the main transformers of the hydroelectric complex ' +
        'in under ninety seconds. Six million people were left without electricity for nine hours. ' +
        'Recovery was relatively swift only because spare transformers were available. ' +
        'If dozens of large transformers across a grid failed simultaneously, ' +
        'restoration could take months — not hours.',
      ],
    },

    {
      heading: 'The Carrington Event: a lesson from the nineteenth century',
      level: 3,
      paragraphs: [
        'In late August and early September 1859, British astronomer Richard Carrington observed ' +
        'a bright white flare on the solar surface through his telescope. ' +
        'Seventeen hours later Earth experienced a geomagnetic storm of a magnitude that has not been matched ' +
        'in the nearly one hundred and seventy years since. ' +
        'The **Carrington Event** — as the storm is known — turned auroras into a tropical spectacle ' +
        'and sent magnetic compasses worldwide into erratic behavior for a full day.',

        'But the most striking effects struck the era\'s "high technology" infrastructure: the telegraph network. ' +
        'Operators across the Americas and Europe reported that equipment sparked and caught fire on its own. ' +
        'Some telegraph lines continued transmitting signals after being disconnected from their batteries — ' +
        'powered entirely by geomagnetically induced currents from the storm. ' +
        'If an event of that magnitude occurred today, economic damage estimates begin at two trillion dollars ' +
        'for the United States alone. ' +
        'The Carrington Event therefore remains the benchmark for designing protection standards for critical infrastructure.',
      ],
    },

    {
      diagram: {
        title: 'The space weather chain: from the Sun to Earth\'s surface',
        svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Space Weather Chain</text>

  <!-- Sun node -->
  <circle cx="80" cy="170" r="42" fill="none" stroke="#ff8844" stroke-width="2" opacity="0.9"/>
  <circle cx="80" cy="170" r="30" fill="#ff8844" opacity="0.25"/>
  <text x="80" y="165" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">SUN</text>
  <text x="80" y="178" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">active</text>
  <text x="80" y="190" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">region</text>

  <!-- Arrow 1 -->
  <line x1="123" y1="170" x2="185" y2="170" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Event box 1: Flare/X-rays -->
  <rect x="186" y="142" width="100" height="56" rx="3" fill="none" stroke="#cc4444" stroke-width="1.5"/>
  <text x="236" y="161" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">SOLAR FLARE</text>
  <text x="236" y="174" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">X-ray / UV</text>
  <text x="236" y="187" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">8 minutes</text>

  <!-- Arrow 2 from flare -->
  <line x1="286" y1="170" x2="345" y2="215" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Event box 2: CME -->
  <rect x="186" y="68" width="100" height="56" rx="3" fill="none" stroke="#ff8844" stroke-width="1.5"/>
  <text x="236" y="87" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">CORONAL</text>
  <text x="236" y="100" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">MASS EJECTION</text>
  <text x="236" y="113" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1-3 days</text>

  <!-- Arrow 3 from CME -->
  <line x1="286" y1="96" x2="345" y2="138" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Event box 3: SEP -->
  <rect x="186" y="216" width="100" height="56" rx="3" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="236" y="235" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">SOLAR ENERGETIC</text>
  <text x="236" y="248" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">PARTICLES</text>
  <text x="236" y="261" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">minutes to hours</text>

  <!-- Arrow 4 from SEP -->
  <line x1="286" y1="244" x2="345" y2="234" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Magnetosphere node -->
  <ellipse cx="400" cy="190" rx="52" ry="70" fill="none" stroke="#44ff88" stroke-width="1.5" opacity="0.6"/>
  <ellipse cx="400" cy="190" rx="35" ry="50" fill="none" stroke="#44ff88" stroke-width="1" opacity="0.3" stroke-dasharray="4,4"/>
  <text x="400" y="185" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">MAGNETO-</text>
  <text x="400" y="198" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">SPHERE</text>

  <!-- Arrow to impacts -->
  <line x1="453" y1="190" x2="510" y2="125" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="453" y1="190" x2="510" y2="190" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="453" y1="190" x2="510" y2="255" stroke="#667788" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Impact box 1: Aurora -->
  <rect x="511" y="103" width="120" height="44" rx="3" fill="none" stroke="#44ff88" stroke-width="1.2"/>
  <text x="571" y="122" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">AURORA</text>
  <text x="571" y="136" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">+ radiation</text>

  <!-- Impact box 2: Grid/GPS -->
  <rect x="511" y="168" width="120" height="44" rx="3" fill="none" stroke="#cc4444" stroke-width="1.2"/>
  <text x="571" y="187" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">POWER GRID / GPS</text>
  <text x="571" y="201" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">blackouts, errors</text>

  <!-- Impact box 3: Satellites -->
  <rect x="511" y="233" width="120" height="44" rx="3" fill="none" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="571" y="252" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">SATELLITES</text>
  <text x="571" y="266" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">drag, failure</text>

  <!-- Arrow marker -->
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Three types of solar events — flares, coronal mass ejections, and solar energetic particles — ' +
          'act through the magnetosphere on different systems simultaneously. ' +
          'X-rays from a flare arrive in eight minutes, particles in minutes to hours, and the plasma cloud in one to three days.',
      },
    },

    {
      heading: 'Impact on satellites and navigation',
      level: 2,
      paragraphs: [
        'Low Earth orbit satellites live in the zone of direct contact with space weather effects. ' +
        'When the magnetosphere compresses and the upper atmosphere heats up from the influx of particles, ' +
        'atmospheric density at altitudes between two hundred and five hundred kilometers rises dramatically. ' +
        'That means increased drag — satellites sink, requiring unplanned orbit-raising maneuvers. ' +
        'A vivid reminder came in February 2022, when forty-nine newly launched Starlink satellites ' +
        'failed to raise their orbits following deployment during a moderate storm and re-entered the atmosphere within weeks.',

        'Global navigation systems suffer from a different effect: ionospheric disturbances alter the propagation speed of radio signals. ' +
        'A geodetic receiver that normally delivers centimeter accuracy can exhibit errors of several meters during a storm. ' +
        'For aviation approach guidance, precision agriculture, and harbor navigation, that is unacceptable.',
      ],
    },

    {
      image: {
        cacheKey: 'space-weather-geomagnetic-storm-earth',
        prompt:
          'Scientific illustration showing Earth during a geomagnetic storm: ' +
          'view from slightly above the North Pole with the magnetosphere compressed on the sunlit side and stretched into a long tail on the night side. ' +
          'Curtains of green and violet aurora borealis visible across northern latitudes extending unusually far south. ' +
          'Power grid lines on the surface shown in faint orange with disruption symbols. ' +
          'Satellite in low Earth orbit with a red warning indicator. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "compressed magnetosphere", "aurora extension", "satellite drag increase", "GPS signal error".',
        alt: 'Earth during a geomagnetic storm — compressed magnetosphere, auroras at low latitudes, satellite and grid disruptions',
        caption:
          'During a major geomagnetic storm the magnetosphere on the dayside can be compressed to geostationary orbit altitude and below. Satellites that normally operate under the protective "roof" find themselves exposed to the direct solar wind.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Monitoring: eyes between the Sun and Earth',
      level: 2,
      paragraphs: [
        'Modern space weather forecasting rests on a network of spacecraft and ground-based sensors. ' +
        'The most important observation post sits at the Lagrange point between the Sun and Earth, ' +
        'approximately one and a half million kilometers from Earth. ' +
        'At this point where solar and terrestrial gravity balance, two key spacecraft are stationed: ' +
        'the Deep Space Climate Observatory and its predecessor, the Advanced Composition Explorer.',

        'These spacecraft measure the speed, density, and — critically — the magnetic field orientation of the plasma cloud ' +
        'roughly thirty to sixty minutes before it strikes Earth. ' +
        'That small time window is all that exists to warn grid operators and satellite controllers. ' +
        'The Solar and Heliospheric Observatory has monitored solar activity continuously since the mid-1990s ' +
        'and has imaged thousands of coronal mass ejections. ' +
        'The Parker Solar Probe, diving into the solar corona since 2018, collects data directly ' +
        'from the birthplace of the storms.',

        'The United States National Oceanic and Atmospheric Administration, through its Space Weather Prediction Center, ' +
        'publishes alerts on scales from G1 to G5 for geomagnetic storms, S1 to S5 for radiation storms, ' +
        'and R1 to R5 for radio blackouts. ' +
        'A G5 event corresponds to an extreme storm — comparable to the Quebec blackout of 1989 or the May 2024 storm.',
      ],
    },

    {
      image: {
        cacheKey: 'space-weather-monitoring-spacecraft',
        prompt:
          'Scientific infographic showing the Sun-Earth monitoring network: ' +
          'simplified diagram with the Sun on the left, Earth on the right, and the L1 Lagrange point in between. ' +
          'At L1: two spacecraft labeled "DSCOVR" and "ACE" shown as small detailed satellite icons. ' +
          'Around Earth: the GOES weather satellites in geostationary orbit labeled "GOES". ' +
          'Near Sun: the Parker Solar Probe in a highly elliptical orbit, labeled "Parker Solar Probe". ' +
          'Also SOHO satellite near L1. ' +
          'Travel time arrow from L1 to Earth labeled "30-60 min warning". ' +
          'Hard sci-fi style, dark space background, monospace labels, cyan and orange accents. ' +
          'Add the following text labels on the image: "Sun", "L1 point", "DSCOVR", "Parker Solar Probe", "Earth", "GOES", "30-60 min warning".',
        alt: 'Network of space weather monitoring spacecraft between the Sun and Earth with warning time labels',
        caption:
          'The Sun-Earth Lagrange point is the prime early-warning position. Spacecraft stationed there give ground system operators thirty to sixty minutes to prepare for the impact of an incoming plasma cloud.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Protection: what can actually be done',
      level: 2,
      paragraphs: [
        'Complete protection against space weather is not achievable. But limiting the damage is entirely feasible.',

        'For **power grids**, the most effective measure is the temporary de-energizing of the most vulnerable transformers ' +
        'during forecast storm periods, combined with maintaining strategic reserves of spare transformers at critical substations. ' +
        'Some utilities now install neutral blocking devices that physically prevent geomagnetically induced currents ' +
        'from flowing through transformer windings. ' +
        'New generations of power transformers in Scandinavia and Japan — countries that experience stronger geomagnetic effects ' +
        'due to their high latitudes — are designed from the outset to withstand elevated quasi-direct-current loading.',

        'For **satellites**, the key protection is radiation-hardened electronics: ' +
        'components built on insulating substrates with hardware error-correction registers ' +
        'and automatic recovery circuits to handle single-event upsets. ' +
        'Large constellations such as Starlink and OneWeb operate algorithms for emergency orbit-raising ' +
        'in response to storm forecasts. ' +
        'For astronauts traveling to the Moon or on a transit to Mars, engineers are developing ' +
        'compact radiation storm shelters — densely shielded compartments lined with polyethylene or water, ' +
        'both effective proton absorbers.',

        'For **navigation systems**, the key tools are dual-frequency receivers and real-time ionospheric models. ' +
        'Modern receivers processing two or more navigation signals simultaneously ' +
        'can compute the ionospheric delay on the fly and correct for it, ' +
        'maintaining useful accuracy even during moderate geomagnetic storms. ' +
        'During G4 and G5 events accuracy still degrades — but far less than without correction.',
      ],
    },

    {
      diagram: {
        title: 'Geomagnetic storm: Earth\'s response',
        svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Geomagnetic Storm — Effects and Systems</text>

  <!-- Earth center -->
  <circle cx="350" cy="170" r="40" fill="#1a2a3a" stroke="#446688" stroke-width="2"/>
  <text x="350" y="168" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">EARTH</text>
  <text x="350" y="181" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">magnetic field</text>

  <!-- Magnetosphere oval -->
  <ellipse cx="350" cy="170" rx="120" ry="90" fill="none" stroke="#44ff88" stroke-width="1" opacity="0.4" stroke-dasharray="6,4"/>

  <!-- CME impact arrow from left -->
  <line x1="30" y1="170" x2="218" y2="170" stroke="#ff8844" stroke-width="3" marker-end="url(#arrowB)" opacity="0.9"/>
  <text x="30" y="160" fill="#ff8844" font-family="monospace" font-size="9">PLASMA</text>
  <text x="30" y="172" fill="#ff8844" font-family="monospace" font-size="9">CLOUD</text>

  <!-- Effect: Aurora (top left) -->
  <line x1="295" y1="90" x2="220" y2="48" stroke="#44ff88" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.7"/>
  <rect x="112" y="30" width="108" height="34" rx="3" fill="none" stroke="#44ff88" stroke-width="1.2"/>
  <text x="166" y="48" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">AURORA</text>
  <text x="166" y="60" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">mid-latitude spread</text>

  <!-- Effect: Satellite drag (top right) -->
  <line x1="405" y1="90" x2="472" y2="48" stroke="#7bb8ff" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.7"/>
  <rect x="473" y="30" width="120" height="34" rx="3" fill="none" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="533" y="48" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">LEO SATELLITES</text>
  <text x="533" y="60" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">increased drag</text>

  <!-- Effect: GPS error (right) -->
  <line x1="470" y1="170" x2="540" y2="170" stroke="#cc4444" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.7"/>
  <rect x="541" y="152" width="120" height="36" rx="3" fill="none" stroke="#cc4444" stroke-width="1.2"/>
  <text x="601" y="168" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">NAV ERROR</text>
  <text x="601" y="180" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">meters instead of cm</text>

  <!-- Effect: Power grid (bottom right) -->
  <line x1="405" y1="245" x2="472" y2="278" stroke="#cc4444" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.7"/>
  <rect x="473" y="264" width="120" height="36" rx="3" fill="none" stroke="#cc4444" stroke-width="1.2"/>
  <text x="533" y="280" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">POWER GRIDS</text>
  <text x="533" y="292" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">induced currents</text>

  <!-- Effect: Radio blackout (bottom left) -->
  <line x1="295" y1="245" x2="220" y2="278" stroke="#ff8844" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.7"/>
  <rect x="112" y="264" width="108" height="36" rx="3" fill="none" stroke="#ff8844" stroke-width="1.2"/>
  <text x="166" y="280" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">RADIO COMMS</text>
  <text x="166" y="292" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">HF blackout</text>

  <!-- K-index indicator -->
  <text x="350" y="300" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">K-index: 0-3 quiet | 4-5 minor storm | 7-8 severe | 9 extreme</text>

  <!-- Arrow marker -->
  <defs>
    <marker id="arrowB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#ff8844"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'A single geomagnetic storm simultaneously affects five different infrastructure systems. ' +
          'Impact severity is measured on the K-index — a planetary scale of geomagnetic disturbance from 0 to 9. ' +
          'A G5-class storm corresponds to a K-index of 9.',
      },
    },

    {
      heading: 'Weather we still cannot predict reliably',
      level: 2,
      paragraphs: [
        'Despite a global network of observatories and decades of research, ' +
        'space weather remains substantially harder to forecast than terrestrial weather. ' +
        'Predicting whether a specific active region on the Sun will produce a major flare ' +
        'in the next twenty-four hours is still more art than science: ' +
        'forecast accuracy at that time horizon does not exceed about seventy percent. ' +
        'Predicting whether a coronal mass ejection will strike Earth directly is harder still — ' +
        'a trajectory deviation of a few degrees already means a miss.',

        'The Parker Solar Probe, the first spacecraft to enter the solar corona, ' +
        'is generating new data on the mechanisms of solar wind acceleration and the birth of powerful eruptions. ' +
        'But fundamental progress in forecast accuracy will likely require ' +
        'a much deeper understanding of magnetohydrodynamics in solar plasma — ' +
        'a field of physics that still has more open questions than answers. ' +
        'For now, the most reliable defense against space weather is not prediction. It is preparedness.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Solar flare',
      definition:
        'A sudden explosive release of energy in the solar corona, primarily as X-ray and ultraviolet radiation. Reaches Earth in eight minutes. Classified by X-ray intensity from class A to class X, with X being the strongest.',
    },
    {
      term: 'Coronal mass ejection',
      definition:
        'An enormous cloud of magnetized plasma that tears free from the solar corona. Mass ranges from hundreds of millions to billions of tonnes. Travels at three hundred to over three thousand kilometers per second and reaches Earth in one to three days.',
    },
    {
      term: 'Geomagnetic storm',
      definition:
        'A global disturbance of Earth\'s magnetic field caused by the interaction of the magnetosphere with a powerful coronal mass ejection. Measured on the K-index from 0 to 9. Storms of class G3 and above can disrupt power grids and navigation systems.',
    },
    {
      term: 'K-index',
      definition:
        'A quasi-logarithmic scale from 0 to 9 measuring the level of geomagnetic activity over three-hour intervals at a given station. The planetary K-index (Kp) is a globally averaged measure. A value of 5 marks the onset of a geomagnetic storm.',
    },
    {
      term: 'Carrington Event',
      definition:
        'The most powerful geomagnetic storm in recorded human history, occurring in September 1859. Caused fires and spontaneous signal transmission in telegraph systems worldwide. The benchmark for estimating maximum possible space weather impact on modern infrastructure.',
    },
    {
      term: 'Solar energetic particles',
      definition:
        'Protons and heavier ions accelerated to high energies during solar flares or by shock waves from fast coronal mass ejections. Can reach Earth in minutes to hours. Dangerous to astronauts in deep space and to electronics aboard satellites without radiation hardening.',
    },
    {
      term: 'Geomagnetically induced current',
      definition:
        'An electrical current induced in long conductors — power transmission lines, pipelines, cables — by the fluctuating geomagnetic field during a storm. Destructive to large power transformers at high-voltage substations.',
    },
    {
      term: '11-year solar cycle',
      definition:
        'The regular cycle of solar activity with a duration of approximately eleven years between successive maxima or minima, characterized by changes in sunspot count, flare frequency, and coronal mass ejection rate.',
    },
    {
      term: 'L1 Lagrange point',
      definition:
        'The gravitational balance point between the Sun and Earth, approximately one and a half million kilometers from Earth. The ideal location for space weather sentinel spacecraft — they observe an incoming plasma cloud thirty to sixty minutes before it reaches Earth.',
    },
  ],

  quiz: [
    {
      question: 'Which solar phenomenon reaches Earth the fastest?',
      options: [
        'A coronal mass ejection — in one to three days',
        'A solar flare — X-ray radiation in eight minutes',
        'Solar energetic particles — in several hours',
        'The background solar wind — in approximately four days',
      ],
      correctIndex: 1,
      explanation:
        'X-ray and ultraviolet radiation from a solar flare travels at the speed of light and arrives at Earth in eight minutes — simultaneously with observing the flare itself. A coronal mass ejection is a much slower plasma cloud that takes one to three days. That difference in speed is a core reason why consequence forecasting is so difficult.',
    },
    {
      question: 'Why is the magnetic field orientation inside a coronal mass ejection so critical for storm forecasting?',
      options: [
        'It determines the speed of the plasma cloud',
        'It sets the mass and duration of the storm',
        'If the field points opposite to the magnetosphere, the cloud penetrates inside and the storm is stronger',
        'The orientation only affects the color of the resulting aurora',
      ],
      correctIndex: 2,
      explanation:
        'Magnetic reconnection is the key mechanism of a geomagnetic storm. If the magnetic field within the plasma cloud points southward — opposing Earth\'s magnetospheric field — it effectively opens the magnetosphere and energetic particles flow in, driving a strong storm. If the fields align, the cloud is largely deflected. This orientation can only be measured minutes before impact.',
    },
    {
      question: 'What caused the large-scale power failure in the Canadian province of Quebec in 1989?',
      options: [
        'A nuclear power plant accident triggered by radiation exposure',
        'Mechanical grid overload caused by a nuclear weapons test',
        'Geomagnetically induced currents from a powerful solar storm destroyed substation transformers',
        'A deliberate cyberattack using radio frequency interference',
      ],
      correctIndex: 2,
      explanation:
        'A powerful geomagnetic storm in March 1989 induced large quasi-direct currents in Quebec\'s high-voltage transmission lines. These currents saturated transformer cores and tripped protective relays in under ninety seconds. Six million people lost electricity for nine hours. Recovery was possible only because spare transformers were available.',
    },
    {
      question: 'What function do spacecraft at the Sun-Earth Lagrange point serve?',
      options: [
        'They physically deflect incoming coronal mass ejections away from Earth',
        'They measure the magnetic field and plasma composition thirty to sixty minutes before impact on Earth',
        'They photograph the solar surface in real time for navigation purposes',
        'They relay navigation system signals with reduced latency',
      ],
      correctIndex: 1,
      explanation:
        'The Lagrange point one and a half million kilometers from Earth is the prime early-warning position. Spacecraft there measure the speed, density, and — most importantly — the magnetic field orientation of an incoming plasma cloud thirty to sixty minutes before it reaches Earth. That small window allows grid operators and satellite controllers to take protective action.',
    },
    {
      question: 'Which statement most accurately describes the Carrington Event of 1859?',
      options: [
        'The first confirmed solar flare observed through a telescope',
        'The most lethal space weather event in recorded human history',
        'The most powerful documented geomagnetic storm, causing fires in telegraph systems worldwide',
        'The only occasion on which auroras were observed in the tropics',
      ],
      correctIndex: 2,
      explanation:
        'The Carrington Event in September 1859 is the most powerful geomagnetic storm in recorded history. It caused fires and spontaneous signal transmission in telegraph systems across the globe. Auroras were visible in the Caribbean and near the equator. Modern estimates of possible damage from a comparable event start at one to two trillion dollars for the United States alone.',
    },
  ],

  sources: [
    {
      title: 'NOAA Space Weather Prediction Center — Educational Resources',
      url: 'https://www.swpc.noaa.gov/educational-resources',
      meta: 'NOAA SWPC, open access, updated 2025',
    },
    {
      title: 'NASA — What Is Space Weather?',
      url: 'https://science.nasa.gov/heliophysics/focus-areas/space-weather/',
      meta: 'NASA Heliophysics, open access',
    },
    {
      title: 'Schrijver C.J. et al. — Understanding Space Weather to Shield Society (Nature Physics, 2015)',
      url: 'https://www.nature.com/articles/nphys3432',
      meta: 'Nature Physics 11, 2015',
    },
    {
      title: 'Ngwira C. et al. — Simulation of the 23 July 2012 extreme space weather event (ApJL 2013)',
      url: 'https://iopscience.iop.org/article/10.1088/2041-8205/779/1/L10',
      meta: 'ApJL 779, 2013, open access',
    },
    {
      title: 'Baker D.N. et al. — A major solar eruptive event in July 2012 (Space Weather, 2013)',
      url: 'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/swe.20097',
      meta: 'AGU Space Weather, 2013',
    },
    {
      title: 'SOHO Mission — Solar & Heliospheric Observatory',
      url: 'https://soho.nascom.nasa.gov/',
      meta: 'ESA/NASA, operational since 1995',
    },
    {
      title: 'Parker Solar Probe — Mission Overview',
      url: 'https://parkersolarprobe.jhuapl.edu/',
      meta: 'NASA/Johns Hopkins APL, operational since 2018',
    },
    {
      title: 'ESA — Space Weather Service Network',
      url: 'https://swe.ssa.esa.int/',
      meta: 'ESA Space Safety Programme, open access',
    },
    {
      title: "Lloyd's of London — Solar Storm Risk to the North American Electric Grid (2013)",
      url: 'https://www.lloyds.com/news-and-insights/risk-reports/library/natural-environment/solar-storm',
      meta: "Lloyd's of London, 2013",
    },
    {
      title: 'DSCOVR — Deep Space Climate Observatory Mission',
      url: 'https://www.nesdis.noaa.gov/DSCOVR',
      meta: 'NOAA/NASA, operational since 2015',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
