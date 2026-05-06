import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'rocket-engines',
  language: 'en',
  section: 'space-tech',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 13,
  title: 'How a Rocket Engine Works',
  subtitle: "Newton's third law, the Tsiolkovsky equation, and why fire in a vacuum pushes harder than fire in air.",

  hero: {
    cacheKey: 'rocket-engines-hero',
    prompt:
      'Photorealistic cross-section illustration of a liquid-fueled rocket engine in full thrust for a science encyclopedia. ' +
      'Cut-away view revealing internal turbopumps, preburner, main combustion chamber, and bell-shaped nozzle. ' +
      'Brilliant blue-white flame exits the nozzle expanding into a dark vacuum. ' +
      'Fuel and oxidizer feed lines glow faintly in orange and cyan. ' +
      'Hard sci-fi style, dark background, technically accurate geometry, dramatic lighting from the exhaust plume. ' +
      'Add the following text labels on the image: "combustion chamber", "turbopump", "nozzle", "exhaust plume".',
    alt: 'Cross-section of a liquid rocket engine at full thrust — combustion chamber, turbopumps, nozzle, and exhaust plume',
    caption:
      'A liquid rocket engine in cross-section. Fuel and oxidizer are forced by turbopumps into the combustion chamber at pressures of hundreds of atmospheres, ignite, and exit through the nozzle at several kilometers per second.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'A rocket is not an airplane. It has no wings, no propeller, and it does not push against air. ' +
        'It carries its own fuel and its own oxidizer, reacts them together, and hurls the resulting hot gas ' +
        'backward — while the vehicle flies forward. That principle is so universal it works equally well ' +
        'in an atmosphere, in the vacuum of space, and anywhere in between. No air needed.',

        'At first glance this feels like a magic trick: where is the force that pushes? ' +
        'Isaac Newton answered that in the seventeenth century. His third law states that ' +
        'every action produces an equal and opposite reaction. ' +
        'A rocket engine is perhaps the cleanest demonstration of that law in engineering practice. ' +
        'Throw mass in one direction — get thrust in the other. No ground contact required. No support. ' +
        'Self-contained, in emptiness.',

        'But the moment you try to go farther than a few kilometers, you hit a brutal fact: ' +
        'propellant has mass. And to lift more propellant you need even more propellant. ' +
        'This vicious circle was captured mathematically by Konstantin Tsiolkovsky in the late nineteenth ' +
        'and early twentieth century. His equation shows that for every proportional increase in final ' +
        'velocity, the required propellant mass relative to the payload grows not linearly, ' +
        'not tenfold — but **exponentially**. ' +
        'That is why rockets are enormous and their payload sections are tiny.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-newton-third-law',
        prompt:
          'Scientific diagram illustrating Newton\'s third law applied to a rocket engine: ' +
          'a simplified rocket shape shown in profile, with a large orange exhaust gas arrow pointing downward labeled "action: exhaust mass" ' +
          'and an equal blue arrow pointing upward labeled "reaction: thrust". ' +
          'Background is deep black space. Hard sci-fi style, monospace labels, dark background. ' +
          'Add the following text labels on the image: "thrust (reaction)", "exhaust mass (action)", "Newton\'s 3rd law".',
        alt: "Diagram of Newton's third law: action is exhaust mass downward, reaction is thrust upward",
        caption: "Thrust is not 'pushing against air'. It is the reaction to ejected mass. That is why a rocket works in vacuum — and actually better there: without back-pressure from the atmosphere, the nozzle can expand gas to a lower pressure, squeezing more velocity out of every kilogram of propellant.",
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Specific impulse: the one number that matters',
      level: 2,
      paragraphs: [
        'Engineers grade a rocket engine with a single figure — **specific impulse** (Isp). ' +
        'In plain terms: how many seconds can the engine maintain one unit of thrust ' +
        'while consuming one kilogram of propellant. ' +
        'Higher is more efficient.',

        'A solid-propellant motor delivers roughly 250 to 280 seconds. ' +
        'A liquid engine burning kerosene and liquid oxygen achieves approximately 310 to 360 seconds. ' +
        'Switch to liquid hydrogen and oxygen — as the RS-25 engines powering the Space Shuttle and SLS do — ' +
        'and you get 450 to 460 seconds. An ion thruster used on deep-space probes can exceed ' +
        'three thousand seconds, but its thrust is so small it could never lift off from Earth. ' +
        'Specific impulse and thrust are always a trade-off.',

        'Why is liquid hydrogen so effective? Hydrogen molecules are the lightest of any fuel. ' +
        'If the combustion temperature and chemistry are equal, a lighter exhaust molecule can be ' +
        'accelerated to a higher velocity. It is precisely that high _exhaust velocity_ that raises ' +
        'specific impulse. Hydrogen and oxygen combust to produce water vapor ' +
        'with an exceptionally high temperature and exceptionally low molecular mass — ' +
        'both working in the same direction.',
      ],
    },

    {
      heading: 'Types of rocket engines: from boosters to orbital workhorses',
      level: 2,
      paragraphs: [
        'Not all rocket engines are alike. The choice of type depends on the mission, budget, ' +
        'required thrust, and reliability demands.',
      ],
    },

    {
      heading: 'Solid propellant',
      level: 3,
      paragraphs: [
        'A solid-propellant motor is essentially a very sophisticated firework. ' +
        'Fuel and oxidizer are blended into a single solid grain at the factory. ' +
        'Once ignited it is nearly impossible to stop. ' +
        'Advantages: simplicity, reliability, and long shelf life. ' +
        'Solid rocket boosters are used as _strap-on boosters_ ' +
        '(additional stages for the first seconds of flight when maximum thrust is needed) ' +
        'on the Space Shuttle, Falcon Heavy, SLS, and many other launch vehicles. ' +
        'Disadvantages: thrust cannot be throttled, and precise shutdown is difficult.',
      ],
    },

    {
      heading: 'Liquid engines: three fundamentally different cycles',
      level: 3,
      paragraphs: [
        'A liquid engine feeds fuel and oxidizer in liquid form from separate tanks. ' +
        'This allows throttling, ignition and shutdown on command, ' +
        'and achieving significantly higher specific impulse. ' +
        'The challenge: the liquid must be pressurized from the tank to the combustion chamber. ' +
        'This requires turbopumps — extraordinarily complex machines that move ' +
        'hundreds of kilograms of cryogenic liquid per second at pressures of hundreds of atmospheres.',

        'Depending on how the turbine extracts energy to drive those pumps, ' +
        'there are three main thermodynamic cycles:',

        '**Gas generator cycle**: a small portion of propellant is burned in a separate gas generator, ' +
        'the hot gas spins the pump turbine, then is dumped overboard past the main nozzle. ' +
        'Some energy is wasted. Simple and proven: Merlin (Falcon 9), F-1 (Saturn V).',

        '**Staged combustion**: all turbine exhaust is routed back into the main combustion chamber ' +
        'and burned completely. Nothing is wasted. Higher chamber pressure, higher efficiency, ' +
        'but far more complex to manufacture. ' +
        'RS-25 (Space Shuttle, SLS) and RD-180 (Atlas V) use this cycle.',

        '**Full-flow staged combustion**: both propellant components ' +
        '(fuel and oxidizer) each pass through their own preburner before the main chamber. ' +
        'Maximum possible thermodynamic efficiency. Extremely difficult to implement. ' +
        'Until the 2020s almost nobody had managed it: **Raptor** by SpaceX is the first ' +
        'production engine in the world to use this cycle.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-engine-cycles',
        prompt:
          'Scientific infographic comparing three liquid rocket engine thermodynamic cycles side by side: ' +
          '1) Gas generator cycle: turbine exhaust shown as small arrow dumped overboard. ' +
          '2) Staged combustion cycle: turbine exhaust arrow routing back into main chamber. ' +
          '3) Full-flow staged combustion: both fuel-rich and oxidizer-rich preburners feeding turbines, then main chamber. ' +
          'Each cycle shown as a simple schematic block diagram with labeled components. ' +
          'Hard sci-fi style, dark background, monospace labels, orange and cyan accent colors. ' +
          'Add the following text labels on the image: "gas generator", "staged combustion", "full-flow staged combustion", "preburner", "turbopump".',
        alt: 'Three liquid rocket engine thermodynamic cycle schematics: gas generator, staged combustion, and full-flow staged combustion',
        caption: 'From gas generator to full-flow staged combustion, efficiency rises — but manufacturing complexity rises far more sharply. SpaceX Raptor was the first production engine to successfully implement full-flow.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Hybrid engines',
      level: 3,
      paragraphs: [
        'A hybrid engine pairs a solid fuel grain with a liquid oxidizer. ' +
        'Thrust can be controlled by varying the oxidizer flow rate. ' +
        'Simpler and safer than a pure liquid engine, more efficient than pure solid. ' +
        'But specific impulse falls short of the best liquid designs. ' +
        'The best-known example is the engine powering **SpaceShipTwo** by Virgin Galactic.',
      ],
    },

    {
      heading: 'Top modern engines',
      level: 2,
      paragraphs: [
        'Five engines define the landscape of contemporary rocketry.',

        '**Raptor (SpaceX)** — the engine of Starship. Methane and liquid oxygen, full-flow staged combustion. ' +
        'Sea-level thrust exceeds 230 metric tons in the vacuum-optimized version. ' +
        'The first production engine in the world to use the full-flow cycle. ' +
        'SpaceX plans to cluster over thirty of them on the Super Heavy first stage. ' +
        'Vacuum specific impulse is approximately 380 seconds.',

        '**Merlin (SpaceX)** — the heart of Falcon 9. Kerosene and liquid oxygen, gas generator cycle. ' +
        'Reliable, mass-produced, and capable of multiple reuses after a propulsive landing — ' +
        'this engine enabled the commercial launch revolution. ' +
        'Vacuum specific impulse approximately 348 seconds.',

        '**RS-25 (Aerojet Rocketdyne)** — the Space Shuttle Main Engine, now powering SLS. ' +
        'Liquid hydrogen and oxygen, staged combustion. ' +
        'Highest specific impulse of any flight-proven engine — approximately 452 seconds. ' +
        'Enormously complex to manufacture and expensive. ' +
        'The first SLS flight in 2022 returned it to active service.',

        '**RD-180 (NPO Energomash)** — flew on the American Atlas V launch vehicle. ' +
        'Kerosene and liquid oxygen, staged combustion. ' +
        'Long regarded as one of the finest liquid engines ever built for its combination ' +
        'of thrust and engineering elegance. Developed in the Soviet Union, ' +
        'it was sold to the United States for decades until geopolitical circumstances forced a replacement.',

        '**BE-4 (Blue Origin)** — the engine of the Vulcan rocket (United Launch Alliance) ' +
        'and New Glenn (Blue Origin). Liquid natural gas and oxygen, staged combustion. ' +
        'Over a decade in development. Vulcan made its first successful flight in 2024. ' +
        'More powerful than the Merlin but more complex.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-top-engines-comparison',
        prompt:
          'Scientific infographic comparing five modern rocket engines side by side in a dark museum-display style: ' +
          'SpaceX Raptor, SpaceX Merlin, RS-25, RD-180, Blue Origin BE-4. ' +
          'Each engine shown as a detailed 3D silhouette with its name label and approximate thrust value. ' +
          'Engines arranged by size from largest to smallest thrust. ' +
          'Hard sci-fi style, dark space background, orange and cyan accent highlights, monospace font. ' +
          'Add the following text labels on the image: "Raptor", "Merlin", "RS-25", "RD-180", "BE-4".',
        alt: 'Comparison of five modern rocket engines: Raptor, Merlin, RS-25, RD-180, and BE-4',
        caption: 'Five engines shaping the current generation of spaceflight. Raptor is the only production engine using the full-flow cycle. RS-25 holds the highest specific impulse among flight-proven designs. Merlin has the most accumulated flight heritage.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Alternatives: ion drives and plasma thrusters',
      level: 2,
      paragraphs: [
        'Chemical reactions are not the only way to accelerate propellant. ' +
        'If the goal is not to climb off Earth but to accelerate in space over time, ' +
        'a chemical engine turns out to be a poor choice.',

        'An **ion thruster** (electric propulsion) ionizes an inert gas — ' +
        'usually xenon — and accelerates the ions with an electric field. ' +
        'The exhaust velocity is far higher than any chemical engine can achieve, ' +
        'so specific impulse can exceed three thousand seconds. ' +
        'But the thrust is measured in millinewtons. For comparison: a sheet of paper weighs ' +
        'roughly as much as a typical ion thruster produces in thrust. ' +
        'That is catastrophically low for lifting off, but excellent for long interplanetary voyages: ' +
        'spacecraft such as Hayabusa, Dawn, and BepiColombo, ' +
        'along with dozens of commercial satellites, use ion propulsion to ' +
        'accumulate velocity gradually over months and years.',

        'The **Hall effect thruster** (Hall thruster) is a variant of the ion thruster ' +
        'with an annular geometry that uses a transverse magnetic field to trap electrons. ' +
        'Simpler and more durable than the grid-based ion thruster, ' +
        'it is widely used on geostationary satellites for station-keeping and orbital maneuvers. ' +
        'Thousands of SpaceX Starlink satellites use Hall thrusters for on-orbit operations.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-ion-engine',
        prompt:
          'Photorealistic scientific illustration of an ion thruster in operation in deep space: ' +
          'cylindrical thruster body glowing with electric blue-purple discharge, ' +
          'faint blue ion exhaust plume extending outward, ' +
          'xenon propellant ionization visible as an ethereal glow inside the thruster grid. ' +
          'Spacecraft body partially visible. Background: star field. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "xenon ions", "ion exhaust plume", "thruster grid", "electric propulsion".',
        alt: 'Ion thruster operating in deep space — blue-purple electric discharge and faint ion exhaust plume',
        caption: 'The ion drive on the Dawn spacecraft (mission to Vesta and Ceres, 2007 to 2018). Although thrust is only millinewtons, the high specific impulse provided enough velocity change to navigate between two asteroid belt bodies — a feat impossible with conventional propellant budgets.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The future: nuclear thermal, solar sails, and laser launch',
      level: 2,
      paragraphs: [
        'Chemistry has a physical ceiling. The hydrogen-oxygen reaction releases ' +
        'as much energy as chemical bonding allows. ' +
        'Going beyond that requires fundamentally different energy sources.',

        '**Nuclear thermal propulsion** uses a nuclear fission reactor to heat a working fluid — ' +
        'hydrogen — to temperatures unreachable by any chemical combustion. ' +
        'Theoretical specific impulse reaches up to 900 seconds, nearly twice that of the RS-25. ' +
        'The United States tested such engines in the 1960s under the NERVA program and demonstrated ' +
        'they work. Today NASA and DARPA are actively developing the concept for a crewed Mars mission. ' +
        'A flight demonstration is planned before the end of the 2020s.',

        'A **solar sail** uses the radiation pressure of sunlight on an ultra-thin reflective film ' +
        'spanning thousands of square meters. There is no engine at all — ' +
        'photon pressure does the work. ' +
        "Japan's IKAROS spacecraft demonstrated the principle in 2010. " +
        'For the inner Solar System this is promising. ' +
        'In the outer Solar System the photon flux is too weak.',

        '**Breakthrough Starshot** proposes accelerating a gram-scale microcraft to twenty percent ' +
        'of the speed of light using a massive ground-based laser array focused on a lightweight ' +
        'reflective sail. The target: Alpha Centauri within twenty years of travel time. ' +
        'The project is currently in the research and prototyping phase. ' +
        'The main engineering challenges are precise laser beam pointing over interstellar distances ' +
        'and surviving the acceleration and interstellar medium at those velocities.',
      ],
    },

    {
      diagram: {
        title: 'Specific impulse across propulsion types',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Specific Impulse (Isp, seconds)</text>

  <!-- Y axis label -->
  <text x="14" y="270" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90,14,160)">Isp, s</text>

  <!-- Bars background line -->
  <line x1="60" y1="40" x2="60" y2="270" stroke="#334455" stroke-width="1"/>
  <line x1="60" y1="270" x2="650" y2="270" stroke="#334455" stroke-width="1"/>

  <!-- Scale lines -->
  <line x1="58" y1="270" x2="650" y2="270" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="215" x2="650" y2="215" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="160" x2="650" y2="160" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="105" x2="650" y2="105" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="58" y1="50" x2="650" y2="50" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <text x="52" y="274" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0</text>
  <text x="52" y="219" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">500</text>
  <text x="52" y="164" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1000</text>
  <text x="52" y="109" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1500</text>
  <text x="52" y="54" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">2000</text>

  <!-- Bar: Solid propellant ~265s -->
  <rect x="72" y="243" width="70" height="27" fill="#ff8844" opacity="0.8"/>
  <text x="107" y="240" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">~265 s</text>
  <text x="107" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Solid</text>
  <text x="107" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">propellant</text>

  <!-- Bar: Kerosene/LOX ~350s -->
  <rect x="162" y="232" width="70" height="38" fill="#ff8844" opacity="0.8"/>
  <text x="197" y="229" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">~350 s</text>
  <text x="197" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Merlin</text>
  <text x="197" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">kero/LOX</text>

  <!-- Bar: Raptor methane/LOX ~380s -->
  <rect x="252" y="228" width="70" height="42" fill="#ff8844" opacity="0.9"/>
  <text x="287" y="225" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">~380 s</text>
  <text x="287" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Raptor</text>
  <text x="287" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">CH4/LOX</text>

  <!-- Bar: RS-25 LH2/LOX ~452s -->
  <rect x="342" y="220" width="70" height="50" fill="#7bb8ff" opacity="0.85"/>
  <text x="377" y="217" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">~452 s</text>
  <text x="377" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">RS-25</text>
  <text x="377" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">H2/LOX</text>

  <!-- Bar: Nuclear thermal ~900s -->
  <rect x="432" y="173" width="70" height="97" fill="#44ff88" opacity="0.75"/>
  <text x="467" y="170" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">~900 s</text>
  <text x="467" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Nuclear</text>
  <text x="467" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">thermal</text>

  <!-- Bar: Ion thruster ~3000s (truncated with arrow) -->
  <rect x="522" y="50" width="70" height="220" fill="#cc4444" opacity="0.6"/>
  <!-- Arrow indicating it goes higher -->
  <polygon points="557,42 549,58 565,58" fill="#cc4444" opacity="0.9"/>
  <text x="557" y="37" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">3000+ s</text>
  <text x="557" y="286" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Ion</text>
  <text x="557" y="297" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">thruster</text>
</svg>`,
        caption:
          'Specific impulse spans from solid propellant boosters (~265 seconds) to ion thrusters (3000+ seconds). ' +
          'Higher Isp means less propellant needed for an equivalent maneuver — ' +
          'but chemical engines win on thrust: an ion thruster will never lift off from Earth.',
      },
    },

    {
      heading: "The Tsiolkovsky equation: why propellant is exponential",
      level: 2,
      paragraphs: [
        "The Tsiolkovsky rocket equation is one of the most consequential formulas in aerospace engineering. " +
        "It relates the change in a rocket's velocity (_delta-V_), the exhaust velocity from the nozzle, " +
        "and the ratio of the initial mass (full of propellant) to the final mass (empty).",

        "The result, stated in words: for every _linear_ increase in final velocity, " +
        "the required propellant mass fraction grows _exponentially_. " +
        "If a rocket needs twice as much delta-V, the mass ratio must be squared — or worse. " +
        "That exponential growth is the tyrant that prevents rockets from being lightweight.",

        "In practice: reaching low Earth orbit requires a delta-V of approximately " +
        "nine kilometers per second (accounting for gravitational and atmospheric losses). " +
        "Even with the best engines, that demands propellant to be roughly 85 to 90 percent " +
        "of the rocket's lift-off mass. Hence the characteristic silhouette of any launch vehicle: " +
        "enormous tanks, tiny payload section. Every extra kilogram at launch costs several times " +
        "more in propellant mass to carry it.",
      ],
    },

    {
      diagram: {
        title: 'Delta-V and mass ratio: the price of velocity',
        svg: `<svg viewBox="0 0 660 290" xmlns="http://www.w3.org/2000/svg">
  <rect width="660" height="290" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="330" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Mass ratio versus delta-V</text>

  <!-- Axes -->
  <line x1="60" y1="240" x2="610" y2="240" stroke="#334455" stroke-width="1.5"/>
  <line x1="60" y1="240" x2="60" y2="40" stroke="#334455" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="335" y="272" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">delta-V (km/s)</text>

  <!-- Y axis label -->
  <text x="14" y="145" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90,14,145)">mass ratio</text>

  <!-- X axis ticks -->
  <text x="60" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">0</text>
  <text x="170" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2</text>
  <text x="280" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">4</text>
  <text x="390" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">6</text>
  <text x="500" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">8</text>
  <text x="610" y="255" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">10</text>

  <!-- Y axis ticks -->
  <text x="50" y="243" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1</text>
  <text x="50" y="204" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">2</text>
  <text x="50" y="163" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">4</text>
  <text x="50" y="121" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">8</text>
  <text x="50" y="78" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">16</text>

  <!-- Exponential curve Isp=350 (kerosene) -->
  <polyline
    points="60,240 115,225 170,211 225,197 280,183 335,169 390,153 445,136 500,116 555,92 610,63"
    fill="none" stroke="#ff8844" stroke-width="2"/>
  <text x="618" y="63" fill="#ff8844" font-family="monospace" font-size="10">Isp 350 s</text>
  <text x="618" y="75" fill="#ff8844" font-family="monospace" font-size="10">(kero/LOX)</text>

  <!-- Exponential curve Isp=450 (RS-25) -->
  <polyline
    points="60,240 115,230 170,219 225,208 280,197 335,186 390,174 445,162 500,148 555,133 610,116"
    fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <text x="618" y="117" fill="#7bb8ff" font-family="monospace" font-size="10">Isp 450 s</text>
  <text x="618" y="129" fill="#7bb8ff" font-family="monospace" font-size="10">(H2/LOX)</text>

  <!-- LEO annotation line -->
  <line x1="391" y1="40" x2="391" y2="240" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,5" opacity="0.7"/>
  <text x="393" y="52" fill="#44ff88" font-family="monospace" font-size="9">LEO</text>
  <text x="393" y="63" fill="#44ff88" font-family="monospace" font-size="9">~9 km/s</text>
</svg>`,
        caption:
          'The mass ratio grows exponentially with delta-V. ' +
          'To reach low Earth orbit (LEO, approximately 9 kilometers per second delta-V), ' +
          'even the RS-25 (Isp 450 seconds) requires propellant to outweigh the empty vehicle ' +
          'by a large margin. That is why rockets look the way they do.',
      },
    },

    {
      heading: 'The nozzle: where heat becomes velocity',
      level: 2,
      paragraphs: [
        'High combustion temperature alone does not produce thrust. ' +
        'To convert thermal energy into kinetic energy you need a nozzle. ' +
        'The standard design is the _de Laval nozzle_, or convergent-divergent nozzle. ' +
        'The flow channel first narrows (convergent section), accelerating the gas to the speed of sound, ' +
        'then widens (divergent section) — and the gas continues to accelerate supersonically, ' +
        'converting the enthalpy of combustion into maximum exhaust velocity.',

        'Nozzle geometry is optimized for a specific altitude: a high expansion ratio ' +
        '(wide nozzle bell) is efficient in vacuum but loses efficiency in atmosphere ' +
        'because ambient pressure acts against the expanding gas. ' +
        'First-stage engines therefore have a shorter nozzle bell, ' +
        'while second-stage or vacuum-optimized variants use a much longer one. ' +
        'The Merlin Vacuum is a clear example: its nozzle is several times larger than the standard Merlin.',
      ],
    },

    {
      image: {
        cacheKey: 'rocket-engines-nozzle-diagram',
        prompt:
          'Scientific cut-away diagram of a convergent-divergent (de Laval) rocket nozzle: ' +
          'cross-section showing gas flow direction with labeled zones: convergent throat section, sonic throat point, divergent expansion section. ' +
          'Pressure gradient shown with color gradient from orange (high pressure, combustion chamber) to blue (low pressure, exit). ' +
          'Mach number scale illustrated along the flow path. ' +
          'Hard sci-fi style, dark background, monospace labels, clear flow arrows. ' +
          'Add the following text labels on the image: "combustion chamber", "throat (Mach 1)", "expansion section", "exhaust exit", "pressure drops".',
        alt: 'Cross-section of a de Laval convergent-divergent nozzle with labeled pressure and flow velocity zones',
        caption: 'At the nozzle throat the gas reaches the speed of sound (Mach number equals 1), then continues to accelerate supersonically through the divergent section. The optimal expansion ratio depends on the ambient pressure at the operating altitude.',
        aspectRatio: '4:3',
      },
    },

    {
      image: {
        cacheKey: 'rocket-engines-solar-sail-concept',
        prompt:
          'Scientific concept illustration of a solar sail spacecraft in deep space: ' +
          'an enormous ultra-thin reflective square sail spanning hundreds of meters, ' +
          'catching sunlight from the lower left as golden light pressure arrows, ' +
          'tiny spacecraft bus visible at the center of the sail, ' +
          'deep black space background with faint star field. ' +
          'Hard sci-fi style, clean and elegant, technically plausible. ' +
          'Add the following text labels on the image: "solar pressure", "reflective sail", "spacecraft bus", "no propellant needed".',
        alt: 'Solar sail spacecraft concept in deep space — a vast thin film reflects sunlight for thrust with no propellant',
        caption: "A solar sail is the only propulsion system that carries no propellant. Photon radiation pressure is vanishingly small, but in vacuum it accumulates to meaningful velocities over time. JAXA's IKAROS confirmed the principle in 2010.",
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Thrust',
      definition:
        'The force acting on a rocket in the direction opposite to the exhaust. Defined by the third law of motion: force equals mass flow rate multiplied by exhaust velocity.',
    },
    {
      term: 'Specific impulse (Isp)',
      definition:
        'A measure of rocket engine efficiency: how many seconds one unit of propellant mass sustains one unit of thrust. Measured in seconds. Higher is more efficient.',
    },
    {
      term: 'Delta-V',
      definition:
        'The change in velocity of a rocket or spacecraft. The key planning quantity for orbital maneuvers. Reaching low Earth orbit requires approximately 9 kilometers per second of delta-V.',
    },
    {
      term: 'Tsiolkovsky rocket equation',
      definition:
        'The fundamental equation of rocket dynamics relating delta-V, exhaust velocity, and the ratio of initial mass to final mass. Demonstrates that propellant mass grows exponentially with desired velocity change.',
    },
    {
      term: 'Staged combustion',
      definition:
        'A liquid engine thermodynamic cycle in which all turbine exhaust is routed back into the main combustion chamber and burned completely, rather than dumped overboard. More efficient than the gas generator cycle but significantly more complex.',
    },
    {
      term: 'De Laval nozzle',
      definition:
        'A convergent-divergent nozzle that first accelerates gas to the speed of sound at the throat, then continues to accelerate it supersonically through the divergent section, converting thermal energy into maximum kinetic energy.',
    },
    {
      term: 'Ion thruster',
      definition:
        'An electric propulsion device that ionizes a noble gas (typically xenon) and accelerates the ions with an electric field. Specific impulse five to ten times higher than chemical engines, but thrust is only millinewtons.',
    },
    {
      term: 'Full-flow staged combustion',
      definition:
        'The most thermodynamically efficient liquid engine cycle, where both propellant components each pass through their own preburner before the main chamber. First realized in production by the SpaceX Raptor engine.',
    },
  ],

  quiz: [
    {
      question: 'Why can a rocket fly in a vacuum where there is no air to push against?',
      options: [
        'It pushes against its own electromagnetic field',
        'Thrust comes from pushing against residual gas molecules in the near-vacuum',
        "It ejects mass backward, and by Newton's third law gains thrust forward",
        'In vacuum there is no drag, so no engine is needed — the rocket coasts by inertia',
      ],
      correctIndex: 2,
      explanation:
        "Thrust is the reaction to ejected mass. By Newton's third law: the action of expelling gas produces an equal and opposite reaction — thrust. No air is involved. In fact vacuum is better: without back-pressure from the atmosphere the nozzle can expand gas more fully, extracting greater exhaust velocity from the same propellant.",
    },
    {
      question: 'What does specific impulse (Isp) measure and why does it matter?',
      options: [
        'The maximum thrust of the engine in kilonewtons',
        'How long the engine can fire continuously without shutdown',
        'A measure of efficiency: how much thrust is delivered per unit of propellant mass per unit time',
        'The ratio of engine mass to its thrust output',
      ],
      correctIndex: 2,
      explanation:
        'Specific impulse is measured in seconds and captures how efficiently an engine uses propellant. Higher Isp means less propellant needed for the same maneuver. The RS-25 achieves approximately 452 seconds using liquid hydrogen and oxygen — among the highest of any flight-proven chemical engine.',
    },
    {
      question: 'What does the Tsiolkovsky equation mean in practical terms for rocket engineers?',
      options: [
        'A rocket can fly with no propellant if its mass is small enough',
        'Doubling the final velocity requires not twice but exponentially more propellant',
        'A larger engine always delivers more delta-V',
        'Thrust is directly proportional to the mass of propellant carried',
      ],
      correctIndex: 1,
      explanation:
        'The Tsiolkovsky equation shows that delta-V grows as the logarithm of the mass ratio — which means the mass ratio grows exponentially with desired delta-V. To double the velocity, the mass ratio must be squared. That exponential demand is why launch vehicles are dominated by their propellant tanks.',
    },
    {
      question: 'Which of the following propulsion systems has the highest specific impulse?',
      options: [
        'Space Shuttle solid rocket booster (~265 seconds)',
        'Merlin engine by SpaceX (~348 seconds)',
        'RS-25 engine running on hydrogen and oxygen (~452 seconds)',
        'Hall effect ion thruster (~1500 to 3000 seconds)',
      ],
      correctIndex: 3,
      explanation:
        'Ion thrusters have the highest specific impulse — several times greater than the best chemical engines. But their thrust is millinewtons, so they cannot lift off from a planetary surface. Among chemical engines the RS-25 leads thanks to liquid hydrogen. Ion drives excel in deep-space cruise phases where time is not the constraint.',
    },
  ],

  sources: [
    {
      title: 'NASA — Basics of Space Flight: Rocket Propulsion',
      url: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter-11/',
      meta: 'NASA, open access, updated 2024',
    },
    {
      title: 'Sutton G., Biblarz O. — Rocket Propulsion Elements, 9th ed.',
      url: 'https://www.wiley.com/en-us/Rocket+Propulsion+Elements%2C+9th+Edition-p-9781118753651',
      meta: 'Wiley, 2017 — standard industry reference',
    },
    {
      title: 'SpaceX — Raptor Engine Overview (technical brief)',
      url: 'https://www.spacex.com/vehicles/starship/',
      meta: 'SpaceX official site, 2024',
    },
    {
      title: 'Aerojet Rocketdyne — RS-25 Engine Fact Sheet',
      url: 'https://www.rocket.com/space/space-access/rs-25',
      meta: 'AerojetRocketdyne, 2023',
    },
    {
      title: 'Tsiolkovsky K. — The Exploration of Cosmic Space by Means of Reaction Devices (1903)',
      url: 'https://archive.org/details/TheExplorationOfCosmicSpace',
      meta: 'Archive.org, first edition 1903',
    },
    {
      title: 'ESA — Ion Propulsion: Gentle but Efficient',
      url: 'https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Ion_propulsion_gentle_but_efficient',
      meta: 'ESA, open access',
    },
    {
      title: 'NASA — Nuclear Thermal Propulsion (NTP) Program',
      url: 'https://www.nasa.gov/space-technology-mission-directorate/nuclear-thermal-propulsion/',
      meta: 'NASA STMD, updated 2024',
    },
    {
      title: 'Breakthrough Starshot — Project Overview',
      url: 'https://breakthroughinitiatives.org/initiative/3',
      meta: 'Breakthrough Initiatives, open access',
    },
    {
      title: 'JAXA — IKAROS Solar Sail Mission Results',
      url: 'https://www.isas.jaxa.jp/en/missions/spacecraft/current/ikaros.html',
      meta: 'JAXA, 2010–2015, open access',
    },
    {
      title: 'Everyday Astronaut — Rocket Engine Cycles Explained',
      url: 'https://everydayastronaut.com/raptor-engine/',
      meta: 'Tim Dodd, 2020–2023, open access',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
