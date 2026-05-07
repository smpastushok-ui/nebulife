import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'heatshield-reentry',
  language: 'en',
  section: 'space-tech',
  order: 9,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Heatshields and Re-entry',
  subtitle: 'How to turn 7.8 kilometers per second into a survivable landing — using fire, ablation, and nine minutes of terror.',

  hero: {
    cacheKey: 'heatshield-reentry-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: a spacecraft capsule descending through Earth\'s atmosphere during re-entry, ' +
      'surrounded by a brilliant plasma sheath glowing orange, white, and violet. ' +
      'The capsule silhouette is visible within the plasma cocoon against the curvature of Earth below. ' +
      'Deep black space above, blue-white atmosphere below. Hard sci-fi style, dramatic lighting, dark background. ' +
      'Add the following text labels on the image: "plasma sheath", "heat shield", "atmosphere entry", "7.8 km/s".',
    alt: 'Spacecraft capsule surrounded by a plasma sheath during atmospheric re-entry — brilliant orange-white glow envelops the vehicle',
    caption:
      'Atmospheric re-entry is the most thermally extreme phase of any spaceflight. ' +
      'At velocities above seven kilometers per second the air cannot move aside in time: ' +
      'compression converts kinetic energy into heat, and the vehicle is wrapped in a plasma sheath ' +
      'reaching temperatures between fifteen hundred and three thousand degrees Celsius.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The return problem is one of the harshest challenges in engineering. ' +
        'To reach low Earth orbit, a spacecraft must accelerate to roughly 7.8 kilometers per second — ' +
        'approximately twenty-two times the speed of sound. ' +
        'The kinetic energy of a single kilogram of mass moving at that speed is approximately thirty megajoules — ' +
        'about the same as the chemical energy stored in a kilogram of gasoline. ' +
        'To come back, all of that colossal energy must go somewhere. ' +
        'Braking with rocket engines is prohibitively expensive in terms of propellant mass. ' +
        'The engineering answer is to let the atmosphere do the work.',

        'But the atmosphere is not a gentle braking cushion. ' +
        'At hypersonic speeds the air ahead of the vehicle cannot move aside in time. ' +
        'It compresses and heats — not primarily from friction, as older textbooks taught, ' +
        'but from the compression itself. ' +
        'A _plasma sheath_ forms ahead of the heat shield: ' +
        'a layer of ionized gas reaching temperatures between fifteen hundred and three thousand degrees Celsius. ' +
        'No steel, no conventional ceramic survives direct contact with that environment. ' +
        'The designer\'s task is to redirect the heat away from the vehicle before it destroys the structure.',

        'Over the second half of the twentieth century and into the twenty-first, ' +
        'engineers developed several fundamentally different approaches. ' +
        'Each suits a different class of mission — from short suborbital hops to returning extraterrestrial material ' +
        'and landing heavy rover systems on another planet.',
      ],
    },

    {
      image: {
        cacheKey: 'heatshield-reentry-energy-diagram',
        prompt:
          'Scientific infographic for a science encyclopedia: comparison of kinetic energy levels at re-entry speeds. ' +
          'A horizontal bar chart showing energy values: orbital re-entry at 7.8 km/s (30 MJ/kg), ' +
          'lunar return at 11 km/s (60 MJ/kg), gasoline energy content (46 MJ/kg) for reference. ' +
          'Hard sci-fi style, dark background, orange and cyan accents, monospace labels. ' +
          'Add the following text labels on the image: "orbital re-entry 30 MJ/kg", "lunar return 60 MJ/kg", "gasoline reference 46 MJ/kg".',
        alt: 'Comparative diagram of kinetic energy at different atmospheric entry speeds',
        caption:
          'Kinetic energy at orbital re-entry is thirty megajoules per kilogram — ' +
          'comparable to the energy density of liquid fuel. ' +
          'At lunar return speeds of eleven kilometers per second the energy roughly doubles, ' +
          'placing even greater demands on the heat shield.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Ablative protection: the material that sacrifices itself',
      level: 2,
      paragraphs: [
        'The first and still most widely used thermal protection method is _ablation_. ' +
        'The principle is simple and elegant: the shield material is deliberately vaporized and burned. ' +
        'The gas produced in this process carries heat away from the vehicle surface, ' +
        'acting as a thermal buffer between the plasma and the structure. ' +
        'The more intense the heat flux, the more active the ablation — and the more effective the protection.',

        'The first large-scale success was the Apollo program in the late 1960s and early 1970s. ' +
        'Apollo capsules returned from the Moon at approximately eleven kilometers per second — ' +
        'significantly higher than orbital re-entry. ' +
        'Their heat shield was made of a material called Avcoat: ' +
        'a honeycomb aluminum structure filled with a glass-ceramic ablative compound. ' +
        'The shield burned in a controlled fashion, carrying heat away with it.',

        'The modern evolution of the ablative approach is a material called ' +
        'Phenolic Impregnated Carbon Ablator. ' +
        'Developed by NASA in the 1990s, it forms the core of the thermal protection on the Stardust mission — ' +
        'the first-ever return of samples from a comet, Wild 2, in 2006. ' +
        'Stardust entered the atmosphere at 12.8 kilometers per second — ' +
        'a record for any returning crewed or robotic capsule at the time. ' +
        'The Phenolic Impregnated Carbon Ablator held.',
      ],
    },

    {
      heading: 'Modern ablative shields: PICA-X and the Orion shield',
      level: 3,
      paragraphs: [
        'SpaceX licensed and improved the Phenolic Impregnated Carbon Ablator into their own variant called PICA-X. ' +
        'It is used on Dragon capsules that return astronauts from the International Space Station. ' +
        'Compared to the original NASA formulation, PICA-X is cheaper to manufacture ' +
        'and can partially survive multiple re-entries — critical for a reusable vehicle.',

        'NASA\'s Orion capsule uses an updated second-generation Avcoat. ' +
        'Unlike Apollo, where the ablative compound was injected by hand into honeycomb cells, ' +
        'the new shield is assembled from large pre-formed blocks bonded together. ' +
        'The first uncrewed Artemis I flight in 2022 confirmed the shield\'s performance: ' +
        'Orion returned from lunar orbit at close to eleven kilometers per second. ' +
        'Deep ablation scarring was visible on the heat shield after splashdown.',

        'China\'s Chang\'e lunar sample-return capsules also use ablative protection ' +
        'adapted to similar return velocities. ' +
        'Chang\'e 5 delivered lunar soil samples in 2020, ' +
        'confirming that ablative shields remain the reliable choice for any agency targeting lunar return.',
      ],
    },

    {
      image: {
        cacheKey: 'heatshield-reentry-ablative-cross-section',
        prompt:
          'Scientific diagram for a science encyclopedia: cross-section of an ablative heat shield showing layers and ablation process. ' +
          'From outer surface inward: charred ablation layer (black), active ablation zone with pyrolysis gas arrows flowing outward (orange), ' +
          'virgin ablative material (dark gray), structural backing (blue-gray). ' +
          'Arrows show heat flux coming from outside (red/orange), pyrolysis gas blowing outward (yellow), ' +
          'and temperature gradient through layers. ' +
          'Hard sci-fi style, dark background, labeled layers, monospace font. ' +
          'Add the following text labels on the image: "plasma heat flux", "char layer", "ablation zone", "pyrolysis gas (outflow)", "virgin material", "structure".',
        alt: 'Cross-section of an ablative heat shield — char layer, active ablation zone, virgin material, and structural backing',
        caption:
          'Ablation works counterintuitively: the material sacrifices itself so that pyrolysis gas ' +
          'carries heat outward away from the structure. ' +
          'The greater the heat flux, the more active the process — and the more stable the inner layer remains.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Reusable ceramic tiles: the Shuttle approach and Starship',
      level: 2,
      paragraphs: [
        'An ablative shield is expendable. For a heavy transport vehicle meant to fly again and again, ' +
        'that is unacceptable. When NASA designed the Space Shuttle in the 1970s, ' +
        'a fundamentally different approach was needed: thermal protection that could survive dozens of flights.',

        'The answer was ultra-porous ceramic tiles. ' +
        'The material known as Toughened Unipiece Fibrous Insulation ' +
        'consists largely of air: up to ninety percent porosity. ' +
        'Surface temperatures can reach fourteen hundred degrees Celsius, ' +
        'but within a few centimeters into the tile thickness the temperature falls to acceptable levels. ' +
        'The ceramic does not ablate — it radiates heat outward and conducts almost none into the structure. ' +
        'After a flight the tiles cool and are ready for reuse.',

        'The vulnerability of the system: every tile had a unique shape and was attached by hand. ' +
        'The Space Shuttle carried approximately twenty thousand tiles of varying sizes and forms. ' +
        'Damage to a small number of tiles during launch in 2003 ' +
        'led to the Columbia disaster on re-entry — ' +
        'superheated gas penetrated the wing structure through an unprotected gap.',
      ],
    },

    {
      heading: 'Starship: thirty-six thousand hexagons',
      level: 3,
      paragraphs: [
        'SpaceX\'s Starship revives the ceramic tile concept ' +
        'but addresses the complexity problem in a fundamentally different way. ' +
        'The vehicle is covered with approximately thirty-six thousand hexagonal ceramic tiles of uniform size. ' +
        'The hexagonal shape allows tight packing without gaps and simplifies replacement. ' +
        'Tiles attach to a heat-resistant backing mat — ' +
        'no hand-fitted bonding of individually shaped pieces.',

        'Starship test flights in 2024 and 2025 demonstrated the thermal protection system under real flight conditions. ' +
        'During the first successful orbital re-entry of the upper stage, ' +
        'the plasma sheath around the vehicle was visible from the ground as a bright moving star. ' +
        'Some tiles sustained damage, but no critical heat penetration occurred. ' +
        'SpaceX continues refining the ceramic composition and attachment methods between flights.',
      ],
    },

    {
      diagram: {
        title: 'Atmospheric re-entry trajectory profile',
        svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Atmospheric Re-entry Trajectory Profile (orbital return)</text>

  <!-- Atmosphere gradient background -->
  <defs>
    <linearGradient id="atmoGradEn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020510" stop-opacity="1"/>
      <stop offset="40%" stop-color="#0a1525" stop-opacity="1"/>
      <stop offset="75%" stop-color="#0a2040" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0a3060" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect x="0" y="30" width="700" height="290" fill="url(#atmoGradEn)"/>

  <!-- Earth surface line -->
  <line x1="0" y1="295" x2="700" y2="295" stroke="#44ff88" stroke-width="1.5"/>
  <text x="10" y="310" fill="#44ff88" font-family="monospace" font-size="9">Earth surface</text>

  <!-- Altitude labels -->
  <text x="8" y="62" fill="#8899aa" font-family="monospace" font-size="9">120 km</text>
  <text x="8" y="122" fill="#8899aa" font-family="monospace" font-size="9">80 km</text>
  <text x="8" y="182" fill="#8899aa" font-family="monospace" font-size="9">40 km</text>
  <text x="8" y="242" fill="#8899aa" font-family="monospace" font-size="9">10 km</text>
  <line x1="55" y1="58" x2="680" y2="58" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,5"/>
  <line x1="55" y1="118" x2="680" y2="118" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,5"/>
  <line x1="55" y1="178" x2="680" y2="178" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,5"/>
  <line x1="55" y1="238" x2="680" y2="238" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,5"/>

  <!-- Re-entry trajectory arc -->
  <path d="M 60,55 Q 250,60 380,130 Q 480,185 560,250 L 590,295"
        fill="none" stroke="#7bb8ff" stroke-width="2.5"/>

  <!-- Phase 1: Entry interface ~120km -->
  <circle cx="80" cy="56" r="4" fill="#7bb8ff"/>
  <text x="88" y="50" fill="#aabbcc" font-family="monospace" font-size="9">entry interface</text>
  <text x="88" y="61" fill="#8899aa" font-family="monospace" font-size="9">~7.8 km/s · 120 km</text>

  <!-- Phase 2: Peak heating ~65km -->
  <circle cx="310" cy="100" r="5" fill="#ff8844"/>
  <ellipse cx="300" cy="105" rx="22" ry="10" fill="#ff8844" opacity="0.18"/>
  <ellipse cx="300" cy="105" rx="14" ry="6" fill="#ff8844" opacity="0.28"/>
  <text x="318" y="94" fill="#ff8844" font-family="monospace" font-size="9">peak heating</text>
  <text x="318" y="105" fill="#ff8844" font-family="monospace" font-size="9">plasma 1500-3000°C</text>
  <text x="318" y="116" fill="#8899aa" font-family="monospace" font-size="9">~60-70 km · radio blackout</text>

  <!-- Phase 3: Blackout zone bracket -->
  <line x1="200" y1="72" x2="420" y2="72" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="200" y1="68" x2="200" y2="76" stroke="#cc4444" stroke-width="1"/>
  <line x1="420" y1="68" x2="420" y2="76" stroke="#cc4444" stroke-width="1"/>
  <text x="295" y="68" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">radio blackout (4-6 min)</text>

  <!-- Phase 4: Deceleration ~30km -->
  <circle cx="490" cy="195" r="4" fill="#44ff88"/>
  <text x="500" y="189" fill="#44ff88" font-family="monospace" font-size="9">deceleration</text>
  <text x="500" y="200" fill="#8899aa" font-family="monospace" font-size="9">~30 km · supersonic</text>

  <!-- Phase 5: Drogue/chute deploy ~10km -->
  <circle cx="560" cy="250" r="4" fill="#aabbcc"/>
  <text x="568" y="245" fill="#aabbcc" font-family="monospace" font-size="9">parachutes</text>
  <text x="568" y="256" fill="#8899aa" font-family="monospace" font-size="9">~10 km</text>

  <!-- Landing -->
  <circle cx="590" cy="295" r="4" fill="#44ff88"/>
  <text x="598" y="298" fill="#44ff88" font-family="monospace" font-size="9">splashdown</text>

  <!-- Time axis note -->
  <text x="350" y="318" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">time →  (typically 25-30 minutes from entry to landing)</text>
</svg>`,
        caption:
          'From entry interface at 120 kilometers altitude to splashdown — approximately 25 to 30 minutes. ' +
          'The sharpest phase occurs between 80 and 60 kilometers, ' +
          'where the plasma sheath forms and radio communication is blocked.',
      },
    },

    {
      heading: 'Plasma sheath and radio blackout',
      level: 2,
      paragraphs: [
        'One of the most striking phenomena during atmospheric entry is _radio blackout_. ' +
        'When the plasma sheath forms around the vehicle, ' +
        'the ionized gas absorbs and reflects radio waves. ' +
        'Communication with the ground is cut off for four to six minutes. ' +
        'For Apollo missions those minutes were particularly tense: ' +
        'mission control had no way of knowing whether the crew had survived ' +
        'until the plasma phase ended and signal was reestablished.',

        'Radio blackout is not itself a danger, but it complicates monitoring. ' +
        'SpaceX partially addresses the problem by routing signals through Starlink satellites ' +
        'positioned at angles that can maintain contact longer through the plasma layer. ' +
        'For uncrewed probes the blackout is a simple engineering fact: ' +
        'the vehicle executes a stored program and reestablishes contact after exiting the plasma.',

        'The phenomenon has also been turned into a scientific tool. ' +
        'By analyzing exactly how a radio signal degrades as a probe enters another planet\'s atmosphere, ' +
        'scientists extract data about that atmosphere\'s density and composition — ' +
        'a technique called radio occultation spectroscopy.',
      ],
    },

    {
      image: {
        cacheKey: 'heatshield-reentry-plasma-blackout',
        prompt:
          'Photorealistic illustration for a science encyclopedia: view from ground-based tracking station watching a spacecraft capsule ' +
          'descending through night sky surrounded by a brilliant plasma contrail. ' +
          'The capsule appears as an intense white-orange fireball. A large radio dish antenna in the foreground points toward it. ' +
          'Communication signal waveform shown near the antenna degrading to static (broken wavy line). ' +
          'Hard sci-fi style, dark sky background, dramatic atmospheric glow. ' +
          'Add the following text labels on the image: "plasma sheath", "radio blackout", "tracking antenna", "signal lost".',
        alt: 'Ground-based tracking antenna observes a capsule inside a plasma cocoon — signal is interrupted during radio blackout',
        caption:
          'Four to six minutes of radio silence is a standard part of any orbital return. ' +
          'Mission control regains signal only after the vehicle decelerates enough ' +
          'for the plasma sheath to dissipate below the critical ionization threshold.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Mars: seven minutes of terror',
      level: 2,
      paragraphs: [
        'If returning to Earth demands mastery, landing on Mars is a problem of an entirely different order. ' +
        'The Red Planet\'s atmosphere is too thick to ignore and too thin to rely on. ' +
        'Any vehicle enters it at more than six kilometers per second. ' +
        'A parachute can decelerate to a few hundred meters per second, ' +
        'but too little altitude remains — and the speed is still lethal at the surface. ' +
        'Three methods must be combined: ' +
        'aerodynamic braking, a parachute, and rocket-powered deceleration.',

        'The Curiosity rover reached the Martian surface in 2012, ' +
        'and NASA engineers described those seven minutes from entry to touchdown ' +
        'as "seven minutes of terror." ' +
        'During that time the spacecraft executed a complete autonomous sequence ' +
        'with no intervention possible from Earth: ' +
        'the round-trip signal time exceeds twenty minutes, ' +
        'so the entire landing unfolds entirely on its own. ' +
        'First — heat shield and aerodynamic braking during atmospheric entry, ' +
        'then — supersonic parachute deployment, ' +
        'then — heat shield jettisoning and ignition of descent engines, ' +
        'and in the final phase — the sky crane, a rocket-powered descent stage ' +
        'that lowered the rover on cables to a gentle touchdown from a hover twenty meters above the ground.',

        'The Perseverance rover repeated the same architecture in 2021 with an even heavier vehicle. ' +
        'The planned ExoMars Rosalind Franklin mission, targeted for the late 2020s, ' +
        'is designed around a similar entry profile — ' +
        'with refinements in guided aerodynamic maneuvering. ' +
        'Every new Mars mission forces engineers to rebalance among ' +
        'heat shield mass, parachute size, and descent engine thrust.',
      ],
    },

    {
      image: {
        cacheKey: 'heatshield-reentry-mars-edl',
        prompt:
          'Scientific illustration for a science encyclopedia: the Mars Entry, Descent, and Landing sequence shown as a multi-panel diagram. ' +
          'Left panel: aeroshell entering Mars atmosphere with plasma heating. ' +
          'Center panel: supersonic parachute deployed, heat shield jettisoned. ' +
          'Right panel: sky crane hovering on rocket engines lowering a rover on cables to Martian surface. ' +
          'Hard sci-fi style, dark background, dusty red Mars landscape below, monospace labels. ' +
          'Add the following text labels on the image: "atmospheric entry", "supersonic parachute", "sky crane descent", "rover touchdown".',
        alt: 'Mars entry, descent, and landing sequence — atmospheric entry, parachute, sky crane, and rover touchdown',
        caption:
          'The entry, descent, and landing sequence for Curiosity (2012) and Perseverance (2021). ' +
          'Seven minutes from atmospheric entry to surface contact — ' +
          'fully autonomous, with no possibility of correction from Earth.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Venus: the harshest entry in the Solar System',
      level: 2,
      paragraphs: [
        'Mars is difficult. Venus is another level entirely. ' +
        'The Venusian atmosphere is ninety times denser than Earth\'s, ' +
        'surface temperature is roughly 460 degrees Celsius, ' +
        'and surface pressure equals that found nine kilometers deep in Earth\'s oceans. ' +
        'A probe entering the Venusian atmosphere faces simultaneously ' +
        'the thermal flux of entry, corrosive sulfuric acid clouds, ' +
        'and a catastrophic rise in pressure as it descends.',

        'The Galileo probe in 1995 entered Jupiter\'s atmosphere — ' +
        'an extreme event in its own right — ' +
        'but the most striking record of sustained entry and descent survivability ' +
        'belongs to the Soviet Venera series. ' +
        'Venera 13 in 1982 survived landing on the surface and transmitted ' +
        'audio recordings and color photographs for one hundred and twenty-seven minutes ' +
        'before the hull succumbed to the pressure and heat. ' +
        'No vehicle in that program was designed for extended operations: ' +
        'the goal was simply to survive long enough to return data.',

        'For future Venus landing missions, engineers are exploring ' +
        'next-generation carbide and nitride ceramics ' +
        'capable of enduring surface conditions for extended periods. ' +
        'No such landed mission has yet been launched.',
      ],
    },

    {
      heading: 'Skip re-entry: when precision matters',
      level: 2,
      paragraphs: [
        'A classic ballistic entry — the capsule falling along a steep, predictable trajectory — ' +
        'is the simplest approach. But there is another regime: _skip re-entry_. ' +
        'The vehicle enters the atmosphere at a shallow angle, ' +
        'briefly "bounces" back into near-space, allowing the shield to cool, ' +
        'then re-enters at lower velocity and thermal load.',

        'This technique was first demonstrated operationally by the Apollo program ' +
        'on lunar return. ' +
        'The capsule performed a controlled dip and pull-up within the upper atmosphere, ' +
        'managing the lift vector by adjusting the roll of the asymmetric capsule body. ' +
        'This gave commanders far more control over the landing zone ' +
        'than a pure ballistic trajectory would allow.',

        'The Orion capsule, designed for Artemis missions, ' +
        'uses the same principle with computer-managed guidance. ' +
        'During the Artemis I return in 2022, Orion executed the planned skip maneuver ' +
        'and splashed down in the designated zone in the Pacific Ocean within a few kilometers of target. ' +
        'For future crewed flights this accuracy is essential: ' +
        'recovery ships must know the landing area in advance.',
      ],
    },

    {
      diagram: {
        title: 'Ablative versus ceramic tile heat protection: comparison',
        svg: `<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Ablative vs. Ceramic Tile Thermal Protection: Comparison</text>

  <!-- Left: Ablative -->
  <rect x="20" y="35" width="310" height="245" fill="rgba(20,30,50,0.6)" rx="4"/>
  <text x="175" y="55" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle">ABLATIVE</text>
  <text x="175" y="68" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(PICA-X, Avcoat)</text>

  <!-- Cross section of ablative shield -->
  <rect x="60" y="80" width="230" height="22" fill="#cc4444" opacity="0.7" rx="2"/>
  <text x="175" y="95" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">char layer (burned away)</text>
  <rect x="60" y="104" width="230" height="18" fill="#ff8844" opacity="0.5" rx="2"/>
  <text x="175" y="116" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">ablation zone (active)</text>
  <rect x="60" y="124" width="230" height="30" fill="#7bb8ff" opacity="0.3" rx="2"/>
  <text x="175" y="143" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">virgin material</text>

  <!-- Properties list -->
  <text x="40" y="172" fill="#44ff88" font-family="monospace" font-size="9">+ very high heat capacity</text>
  <text x="40" y="185" fill="#44ff88" font-family="monospace" font-size="9">+ handles any return velocity</text>
  <text x="40" y="198" fill="#44ff88" font-family="monospace" font-size="9">+ reliable, well-proven</text>
  <text x="40" y="215" fill="#cc4444" font-family="monospace" font-size="9">- single-use (expendable)</text>
  <text x="40" y="228" fill="#cc4444" font-family="monospace" font-size="9">- heavier</text>
  <text x="40" y="241" fill="#cc4444" font-family="monospace" font-size="9">- costly for high-frequency ops</text>

  <!-- Right: Ceramic tiles -->
  <rect x="370" y="35" width="310" height="245" fill="rgba(20,30,50,0.6)" rx="4"/>
  <text x="525" y="55" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">CERAMIC TILES</text>
  <text x="525" y="68" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(TUFI, Starship hex)</text>

  <!-- Hex tile pattern -->
  <polygon points="480,82 496,82 504,96 496,110 480,110 472,96" fill="#7bb8ff" opacity="0.4" stroke="#7bb8ff" stroke-width="0.8"/>
  <polygon points="505,82 521,82 529,96 521,110 505,110 497,96" fill="#7bb8ff" opacity="0.4" stroke="#7bb8ff" stroke-width="0.8"/>
  <polygon points="530,82 546,82 554,96 546,110 530,110 522,96" fill="#7bb8ff" opacity="0.4" stroke="#7bb8ff" stroke-width="0.8"/>
  <polygon points="492,97 508,97 516,111 508,125 492,125 484,111" fill="#7bb8ff" opacity="0.35" stroke="#7bb8ff" stroke-width="0.8"/>
  <polygon points="517,97 533,97 541,111 533,125 517,125 509,111" fill="#7bb8ff" opacity="0.35" stroke="#7bb8ff" stroke-width="0.8"/>
  <text x="525" y="143" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">90% porosity · ~36,000 tiles (Starship)</text>

  <!-- Properties list -->
  <text x="390" y="172" fill="#44ff88" font-family="monospace" font-size="9">+ reusable across flights</text>
  <text x="390" y="185" fill="#44ff88" font-family="monospace" font-size="9">+ lightweight (mostly air)</text>
  <text x="390" y="198" fill="#44ff88" font-family="monospace" font-size="9">+ individual tiles replaceable</text>
  <text x="390" y="215" fill="#cc4444" font-family="monospace" font-size="9">- temperature ceiling lower</text>
  <text x="390" y="228" fill="#cc4444" font-family="monospace" font-size="9">- brittle under impact</text>
  <text x="390" y="241" fill="#cc4444" font-family="monospace" font-size="9">- requires inspection each flight</text>
</svg>`,
        caption:
          'Ablative protection is the reliable choice for any mission, but it is expendable. ' +
          'Ceramic tiles enable reuse, but are more vulnerable to impact damage ' +
          'and have a lower maximum thermal load ceiling.',
      },
    },

    {
      heading: 'What comes next: active cooling and new materials',
      level: 2,
      paragraphs: [
        'Two leading technologies define the next generation of thermal protection.',

        'The first is _active transpiration cooling_. ' +
        'Rather than allowing the material to ablate or radiate heat passively, ' +
        'a coolant — liquid or gas — is pumped through a microporous surface and exits as a thin film, ' +
        'forming a protective layer between the hot plasma and the vehicle skin. ' +
        'The principle is analogous to how the human body cools itself through perspiration. ' +
        'NASA and several universities are actively testing this approach ' +
        'for hypersonic vehicles and future reusable orbital craft.',

        'The second is ultra-high-temperature ceramics based on hafnium diboride and zirconium diboride. ' +
        'These materials withstand more than three thousand degrees Celsius without melting — ' +
        'significantly higher than conventional tile systems. ' +
        'Early samples have survived ground testing in arc-jet plasma tunnels. ' +
        'If the technology reaches flight-ready reliability, ' +
        'it could enable much steeper entry angles and shorter mission timelines.',

        'Meanwhile the designers of Starship and future reusable lunar vehicles ' +
        'study every scar and lost tile after each flight. ' +
        'Real flight data on actual thermal protection behavior ' +
        'is the most valuable resource for designing the next generation. ' +
        'No arc-jet tunnel fully replicates what happens at orbital velocity in a real atmosphere.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Ablation',
      definition:
        'The controlled vaporization and combustion of heat shield surface material under the action of a thermal flux. ' +
        'The resulting gas carries heat away from the structure and protects it.',
    },
    {
      term: 'Plasma sheath',
      definition:
        'A layer of ionized gas that forms ahead of a vehicle during hypersonic atmospheric entry as a result of air compression. ' +
        'Temperature ranges from fifteen hundred to three thousand degrees Celsius. Absorbs radio waves.',
    },
    {
      term: 'Hypersonic',
      definition:
        'Flight regime at more than five times the speed of sound (above Mach 5). ' +
        'During atmospheric re-entry from orbit, vehicles travel at Mach 20 to 25.',
    },
    {
      term: 'Radio blackout',
      definition:
        'Interruption of radio communication between the vehicle and ground stations during atmospheric entry, ' +
        'caused by absorption of radio waves by the plasma sheath. Typically lasts four to six minutes.',
    },
    {
      term: 'Phenolic Impregnated Carbon Ablator',
      definition:
        'A modern NASA ablative material composed of carbon fiber impregnated with phenolic resin. ' +
        'Used on SpaceX Dragon capsules and the Stardust sample-return mission. Withstands over 1600 degrees Celsius.',
    },
    {
      term: 'Toughened Unipiece Fibrous Insulation',
      definition:
        'A type of ultra-lightweight ceramic tile used for reusable thermal protection on the Space Shuttle. ' +
        'Up to ninety percent porosity. Surface temperatures can exceed 1400 degrees Celsius with minimal mass.',
    },
    {
      term: 'Skip re-entry',
      definition:
        'A re-entry profile in which the vehicle enters the atmosphere at a shallow angle, ' +
        'briefly rises back into near-space to allow the shield to cool, ' +
        'then re-enters at lower velocity and thermal load. ' +
        'Used by Apollo and Orion for improved landing accuracy.',
    },
    {
      term: 'Entry, Descent, and Landing',
      definition:
        'The complete sequence of operations from atmospheric entry to surface contact. ' +
        'For Mars the full sequence takes seven minutes and occurs entirely autonomously, ' +
        'with no possibility of correction from Earth due to signal travel time.',
    },
    {
      term: 'Pyrolysis',
      definition:
        'Chemical decomposition of a material under heat in the absence of oxygen. ' +
        'In an ablative shield, pyrolysis of the ablative compound produces a protective outflowing gas ' +
        'that insulates the inner structure from the heat flux.',
    },
  ],

  quiz: [
    {
      question:
        'Why does a heat shield heat up during atmospheric re-entry? What is the primary cause?',
      options: [
        'Friction between the shield surface and air molecules',
        'Compression of air ahead of the vehicle, converting kinetic energy into heat',
        'Solar radiation intensified by passage through the upper atmosphere',
        'Reaction of the shield material with atmospheric oxygen at high speed',
      ],
      correctIndex: 1,
      explanation:
        'The primary cause is compression heating, not friction. ' +
        'At hypersonic speeds the air cannot move aside in time and is compressed violently, ' +
        'heating to plasma temperatures of fifteen hundred to three thousand degrees Celsius ahead of the vehicle.',
    },
    {
      question:
        'What is the key difference between an ablative heat shield and the ceramic tiles used on the Space Shuttle or Starship?',
      options: [
        'Ablative shields are heavier and are only suitable for uncrewed vehicles',
        'Ablative material deliberately burns away, carrying heat off as gas; ceramic tiles are reusable and radiate heat',
        'Tiles are designed for very high entry velocities, ablative shields for slower re-entry',
        'There is no meaningful difference — both use the same underlying physics',
      ],
      correctIndex: 1,
      explanation:
        'Ablative protection deliberately destroys itself: the material vaporizes and pyrolysis gas carries heat away. ' +
        'It is expendable. Ceramic tiles do not ablate — they have low thermal conductivity and radiate heat outward, ' +
        'surviving intact for reuse after the flight.',
    },
    {
      question:
        'Why is landing on Mars considered far more difficult than returning to Earth?',
      options: [
        'The Martian atmosphere is much denser than Earth\'s, so vehicles heat up more',
        'The Martian atmosphere is too thin for a parachute, so only rocket engines can be used',
        'The atmosphere is too thick to ignore but too thin to brake effectively — three methods must be combined',
        'Precise landing zones are impossible to determine because of dust storms',
      ],
      correctIndex: 2,
      explanation:
        'The Martian atmosphere is one hundred times thinner than Earth\'s, yet still thick enough to create significant thermal loads. ' +
        'A parachute alone cannot decelerate a heavy vehicle to a safe landing speed. ' +
        'The solution is a sequence: heat shield, supersonic parachute, and rocket-powered descent.',
    },
    {
      question: 'What causes radio blackout during atmospheric re-entry, and how long does it typically last?',
      options: [
        'Interference from ionized stratospheric layers unrelated to entry speed',
        'The plasma sheath surrounding the vehicle absorbs radio waves, cutting off communication for four to six minutes',
        'The vehicle\'s antennas are stowed and only deploy after parachute opening',
        'The capsule passes through Earth\'s shadow and satellite line-of-sight is lost',
      ],
      correctIndex: 1,
      explanation:
        'The ionized gas of the plasma sheath absorbs radio waves, interrupting communication between the vehicle and Earth ' +
        'for four to six minutes. This is a normal, expected part of any orbital re-entry. ' +
        'Contact is reestablished after the vehicle decelerates enough for the plasma to dissipate.',
    },
    {
      question:
        'Which mission first returned extraterrestrial material from a comet using the Phenolic Impregnated Carbon Ablator?',
      options: [
        'Apollo 11 — lunar soil samples in 1969',
        'Stardust — comet Wild 2 samples in 2006',
        'Hayabusa 2 — asteroid Ryugu samples in 2020',
        'Genesis — solar wind particles in 2004',
      ],
      correctIndex: 1,
      explanation:
        'The Stardust mission in 2006 returned comet Wild 2 samples, ' +
        'entering the atmosphere at a record 12.8 kilometers per second. ' +
        'The Phenolic Impregnated Carbon Ablator withstood the thermal load, ' +
        'confirming the material\'s suitability for beyond-lunar sample return missions.',
    },
  ],

  sources: [
    {
      title: 'NASA — Entry, Descent and Landing Technology Overview',
      url: 'https://www.nasa.gov/centers/ames/entry-systems-vehicles-division/',
      meta: 'NASA Ames Research Center, open access, updated 2024',
    },
    {
      title: 'NASA — PICA (Phenolic Impregnated Carbon Ablator) Material Data',
      url: 'https://techport.nasa.gov/view/90428',
      meta: 'NASA Tech Port, 2023',
    },
    {
      title: 'SpaceX — Dragon Heat Shield: PICA-X Technical Overview',
      url: 'https://www.spacex.com/vehicles/dragon/',
      meta: 'SpaceX official site, 2024',
    },
    {
      title: 'NASA — Mars Science Laboratory: Entry, Descent and Landing Instrumentation',
      url: 'https://mars.nasa.gov/msl/mission/spacecraft/entry-descent-landing/',
      meta: 'NASA Mars Exploration Program, 2024',
    },
    {
      title: 'NASA — Orion Heat Shield: Testing and Performance (Artemis I)',
      url: 'https://www.nasa.gov/exploration/systems/orion/heat-shield.html',
      meta: 'NASA Orion Program, 2023',
    },
    {
      title: 'Anderson J. — Hypersonic and High Temperature Gas Dynamics, 3rd ed.',
      url: 'https://arc.aiaa.org/doi/book/10.2514/4.861956',
      meta: 'AIAA Education Series, 2019',
    },
    {
      title: 'Tauber M. — A Review of High-Speed, Convective Heat-Transfer Computation Methods (NASA-TP-2914)',
      url: 'https://ntrs.nasa.gov/citations/19890011950',
      meta: 'NASA Technical Report, 1989, open access',
    },
    {
      title: 'ESA — ExoMars Schiaparelli EDL Lessons Learned',
      url: 'https://exploration.esa.int/web/mars/-/59221-exomars-2016',
      meta: 'ESA, 2017, open access',
    },
    {
      title: 'Laub B., Venkatapathy E. — Thermal Protection System Technology and Facility Needs for Demanding Future Planetary Missions',
      url: 'https://ntrs.nasa.gov/citations/20040085940',
      meta: 'NASA NTRS, 2004, open access',
    },
    {
      title: 'Kolodziej P. — Orion Spacecraft Heat Shield Technology Development',
      url: 'https://ntrs.nasa.gov/citations/20100027760',
      meta: 'NASA NTRS, 2010, open access',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
