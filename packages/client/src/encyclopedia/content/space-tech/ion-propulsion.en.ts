import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'ion-propulsion',
  language: 'en',
  section: 'space-tech',
  order: 4,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Ion and Electric Propulsion',
  subtitle: 'Why the slowest engine in the Solar System travels the farthest — and what it means to thrust with the weight of a sheet of paper.',

  hero: {
    cacheKey: 'ion-propulsion-hero',
    prompt:
      'Photorealistic science encyclopedia illustration of a gridded ion thruster firing in deep space: ' +
      'circular thruster face glowing with electric blue-violet discharge plasma, ' +
      'a narrow luminous xenon ion exhaust plume extending outward against star-filled black space, ' +
      'spacecraft bus partially visible behind the thruster, solar panels catching faint sunlight, ' +
      'hard sci-fi style, technically accurate geometry, dark space background, dramatic lighting from the ion plume. ' +
      'Add the following text labels on the image: "xenon ions", "ion exhaust plume", "thruster grid", "solar power".',
    alt: 'Gridded ion thruster operating in deep space — electric blue-violet plasma discharge and narrow xenon ion exhaust plume',
    caption:
      'An ion thruster operating in interplanetary space. The bright blue-violet glow is xenon plasma being ionized between the cathode and the acceleration grids. Thrust never exceeds a few millinewtons, but the engine can run for years, quietly accumulating a velocity change unreachable by any chemical rocket.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Imagine an engine whose thrust is no stronger than the pressure of a sheet of paper resting on your palm. ' +
        'It cannot lift itself off a table. It cannot move a car by even a centimeter. ' +
        'Yet that engine can accelerate a spacecraft to tens of kilometers per second, ' +
        'cross several billion kilometers, rendezvous with an asteroid, ' +
        'enter orbit, and still leave margin for further maneuvers — ' +
        'consuming ten times less propellant than any chemical rocket could manage on the same trip.',

        'Ion propulsion is not science fiction and not a distant future. ' +
        'It has been flying in real space for decades. ' +
        'The Dawn spacecraft reached Vesta and Ceres on ion thrust. ' +
        'Thousands of Starlink satellites maintain their orbits with Hall thrusters. ' +
        "The European Space Agency's Smart-1 lunar probe reached the Moon " +
        'entirely on electric propulsion. ' +
        'The principle at work here is not chemistry — it is the physics of accelerating charged particles.',

        'Understanding the ion drive starts with one simple question: ' +
        'what exactly is thrust, and does something have to burn to produce it?',
      ],
    },

    {
      heading: 'Thrust without combustion: electricity instead of flame',
      level: 2,
      paragraphs: [
        'In a chemical rocket engine, fuel and oxidizer react, releasing chemical energy as heat. ' +
        'That heat expands a gas and expels it from a nozzle at high velocity. ' +
        'Thrust arises as the reaction to the ejected mass — and nothing more.',

        'An ion thruster takes that principle and replaces the chemical reaction with an electric field. ' +
        'Instead of combustion there is ionization: one electron is knocked away from atoms ' +
        'of xenon or another noble gas, creating positively charged ions. ' +
        'Those ions are then accelerated by a powerful electric field and expelled from the thruster ' +
        'at velocities no chemical propellant can match. ' +
        'The reaction to that stream is the thrust.',

        'The key advantage lies in the exhaust velocity. ' +
        'In a chemical engine the hot gas exits the nozzle at roughly ' +
        'three to four kilometers per second. ' +
        'Ions in an ion thruster can reach thirty to forty kilometers per second — ' +
        'nearly ten times faster. ' +
        'Since engine efficiency is directly proportional to exhaust velocity, ' +
        'an ion thruster consumes roughly ten times less propellant for the same velocity change. ' +
        'Engineers express this through a quantity called _specific impulse_.',
      ],
    },

    {
      image: {
        cacheKey: 'ion-propulsion-concept-comparison',
        prompt:
          'Scientific infographic comparing chemical rocket exhaust versus ion thruster exhaust side by side for a science encyclopedia: ' +
          'left panel shows chemical rocket nozzle with hot expanding gas at 3-4 km/s, orange-red flame colors, labeled "chemical: 3-4 km/s exhaust"; ' +
          'right panel shows ion thruster with narrow blue ion beam at 30-40 km/s, labeled "ion: 30-40 km/s exhaust"; ' +
          'arrow sizes indicate relative exhaust velocity; ' +
          'hard sci-fi style, dark background, monospace labels, orange and cyan accent colors. ' +
          'Add the following text labels on the image: "chemical exhaust: ~3-4 km/s", "ion exhaust: ~30-40 km/s", "10x higher velocity".',
        alt: 'Comparison of exhaust velocities: chemical rocket (3-4 km/s) versus ion thruster (30-40 km/s)',
        caption: 'Higher exhaust velocity means higher specific impulse and less propellant consumed for the same velocity change. Ion thrusters win on efficiency by a factor of roughly ten — but lose on thrust by a factor of thousands.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Specific impulse: the number that explains everything',
      level: 2,
      paragraphs: [
        'Specific impulse is the single figure that lets engineers compare any type of propulsion system. ' +
        'It describes how many seconds one unit of propellant mass can sustain one unit of thrust. ' +
        'Higher specific impulse means more economical use of propellant.',

        'The best chemical engine — burning liquid hydrogen with liquid oxygen — ' +
        'achieves a specific impulse of approximately 450 seconds. ' +
        'A gridded ion thruster of the type flown on Dawn reaches 3000 seconds and beyond. ' +
        'A Hall thruster sits at roughly 1500 to 2000 seconds. ' +
        'The difference of six to ten times translates directly: ' +
        'for the same maneuver an ion thruster needs six to ten times less propellant.',

        'In practice this gives a remarkable advantage for long-duration missions. ' +
        'A chemical rocket burns through its entire maneuvering budget in minutes. ' +
        'An ion thruster spreads the same budget across months and years — ' +
        'but very slowly, because its thrust force is microscopic. ' +
        'A sheet of paper weighing roughly five grams exerts more force on your hand ' +
        'than a typical ion thruster produces. ' +
        'This is not an error or exaggeration — it is a physical fact, ' +
        'a consequence of the tiny mass flow rate the thruster emits.',
      ],
    },

    {
      heading: 'The gridded ion thruster: how it works',
      level: 2,
      paragraphs: [
        'The most thoroughly studied type is the gridded ion thruster. ' +
        'The classic design was developed at the NASA Lewis Research Center — ' +
        'the variant known by the abbreviation that reads as "N-STAR," ' +
        'which stands for "NASA Solar Technology Application Readiness." ' +
        'That engine flew on Deep Space 1 in 1998 and on Dawn beginning in 2007.',

        'The operating principle: a hollow cathode inside the discharge chamber emits electrons ' +
        'that collide with xenon atoms and knock away one electron from each, ' +
        'creating positive xenon ions. ' +
        'The ions are attracted toward a first grid held at a negative potential ' +
        'and simultaneously repelled by a second grid at an even more negative potential. ' +
        'As a result the ions accelerate between the grids and fly outward at high velocity. ' +
        'An external neutralizer cathode at the exit injects electrons back into the beam ' +
        'so the spacecraft does not accumulate a positive electric charge.',

        'Xenon is not chosen arbitrarily. It is a heavy noble gas that does not react ' +
        'chemically with the thruster or spacecraft materials. ' +
        'Its high atomic mass means that even a low mass flow rate produces meaningful thrust. ' +
        'In liquid form it stores compactly and feeds easily into the discharge chamber. ' +
        'Its one drawback is cost: xenon is expensive, ' +
        'which motivates research into alternatives such as krypton and iodine.',
      ],
    },

    {
      diagram: {
        title: 'Gridded ion thruster cross-section',
        svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Gridded Ion Thruster — Schematic Cross-Section</text>

  <!-- Thruster body outline -->
  <rect x="60" y="50" width="220" height="230" rx="6" fill="none" stroke="#334455" stroke-width="2"/>

  <!-- Discharge chamber label -->
  <text x="170" y="74" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">discharge chamber</text>

  <!-- Xenon inlet arrow -->
  <line x1="30" y1="155" x2="60" y2="155" stroke="#7bb8ff" stroke-width="2" marker-end="url(#arrowBlueEn)"/>
  <text x="14" y="150" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Xe</text>
  <text x="14" y="162" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">gas</text>

  <!-- Cathode inside discharge chamber -->
  <rect x="80" y="130" width="30" height="50" rx="3" fill="#ff8844" opacity="0.7"/>
  <text x="95" y="188" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">cathode</text>

  <!-- Electron arrows -->
  <line x1="110" y1="155" x2="160" y2="155" stroke="#44ff88" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="135" y="148" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">e-</text>

  <!-- Xenon atoms becoming ions (schematic dots) -->
  <circle cx="175" cy="130" r="6" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="195" cy="150" r="6" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="175" cy="170" r="6" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="210" cy="135" r="6" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="210" y="195" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">Xe+ ions</text>

  <!-- Screen grid -->
  <line x1="280" y1="50" x2="280" y2="280" stroke="#aabbcc" stroke-width="2.5"/>
  <text x="280" y="300" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">grid 1</text>
  <text x="280" y="312" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">(screen)</text>

  <!-- Gaps in screen grid -->
  <rect x="275" y="90" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="275" y="126" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="275" y="162" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="275" y="198" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="275" y="234" width="10" height="16" fill="rgba(10,15,25,0.5)"/>

  <!-- Accel grid -->
  <line x1="310" y1="50" x2="310" y2="280" stroke="#cc4444" stroke-width="2.5"/>
  <text x="310" y="300" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">grid 2</text>
  <text x="310" y="312" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">(accel)</text>

  <!-- Gaps in accel grid -->
  <rect x="305" y="90" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="305" y="126" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="305" y="162" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="305" y="198" width="10" height="16" fill="rgba(10,15,25,0.5)"/>
  <rect x="305" y="234" width="10" height="16" fill="rgba(10,15,25,0.5)"/>

  <!-- Ion beams through grids -->
  <line x1="260" y1="98" x2="550" y2="98" stroke="#7bb8ff" stroke-width="1.5" opacity="0.8"/>
  <line x1="260" y1="134" x2="550" y2="134" stroke="#7bb8ff" stroke-width="1.5" opacity="0.8"/>
  <line x1="260" y1="170" x2="550" y2="170" stroke="#7bb8ff" stroke-width="1.5" opacity="0.8"/>
  <line x1="260" y1="206" x2="550" y2="206" stroke="#7bb8ff" stroke-width="1.5" opacity="0.8"/>
  <line x1="260" y1="242" x2="550" y2="242" stroke="#7bb8ff" stroke-width="1.5" opacity="0.8"/>

  <!-- Arrows on ion beams -->
  <polygon points="545,94 533,98 545,102" fill="#7bb8ff" opacity="0.9"/>
  <polygon points="545,130 533,134 545,138" fill="#7bb8ff" opacity="0.9"/>
  <polygon points="545,166 533,170 545,174" fill="#7bb8ff" opacity="0.9"/>
  <polygon points="545,202 533,206 545,210" fill="#7bb8ff" opacity="0.9"/>
  <polygon points="545,238 533,242 545,246" fill="#7bb8ff" opacity="0.9"/>

  <!-- Neutralizer cathode -->
  <rect x="560" y="130" width="28" height="50" rx="3" fill="#ff8844" opacity="0.6"/>
  <text x="574" y="195" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">neutral-</text>
  <text x="574" y="207" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">izer</text>

  <!-- Exhaust plume region -->
  <text x="590" y="155" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="start">ion</text>
  <text x="590" y="167" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="start">beam</text>

  <!-- Voltage label -->
  <text x="295" y="42" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">+1-2 kV / -200 V</text>

  <!-- Arrow markers -->
  <defs>
    <marker id="arrowBlueEn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7bb8ff"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Simplified schematic of a gridded ion thruster. ' +
          'The cathode ionizes xenon inside the discharge chamber. ' +
          'Ions are accelerated between two grids held at a potential difference of several kilovolts and expelled outward. ' +
          'The neutralizer injects electrons back into the beam to prevent the spacecraft from charging up electrostatically.',
      },
    },

    {
      heading: 'Deep Space 1: the first real flight on ion thrust',
      level: 2,
      paragraphs: [
        'In 1998 NASA launched a small technology demonstrator with one purpose: ' +
        'to prove that an ion engine could operate reliably for years in actual space. ' +
        'Deep Space 1 exceeded every expectation: the thruster ran for more than 600 hours, ' +
        'delivered a velocity change that would have cost a chemical system far more propellant, ' +
        'and successfully flew past asteroid Braille and comet Borrelly.',

        'The thruster designated N-STAR on Deep Space 1 produced about 90 millinewtons of thrust — ' +
        'less than one tenth of a newton, roughly the weight of two coins. ' +
        'Yet its specific impulse exceeded 3000 seconds. ' +
        'By comparison, a chemical engine delivering several metric tons of thrust ' +
        'has a specific impulse of approximately 450 seconds. ' +
        'The efficiency advantage is nearly sevenfold.',
      ],
    },

    {
      image: {
        cacheKey: 'ion-propulsion-dawn-mission',
        prompt:
          'Photorealistic science encyclopedia illustration of the Dawn spacecraft in deep space near the asteroid Vesta: ' +
          'solar-powered spacecraft with large rectangular solar panels, ion thruster glowing faintly blue-violet at the rear, ' +
          'rocky grey asteroid surface filling the background with craters, ' +
          'hard sci-fi style, dark space background, technically accurate spacecraft geometry. ' +
          'Add the following text labels on the image: "Dawn spacecraft", "ion thruster plume", "Vesta", "solar panels".',
        alt: 'Dawn spacecraft in deep space near asteroid Vesta — solar panels and faint blue ion thruster glow at the aft end',
        caption: 'Dawn (2007 to 2018) is the only spacecraft in human history to orbit two different solar system bodies in succession: Vesta and then Ceres. That feat was possible only because of ion propulsion — a chemical system would not have carried enough propellant for both stops.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Dawn: two asteroid orbits on one propellant load',
      level: 2,
      paragraphs: [
        "Dawn's mission beginning in 2007 demonstrated what ion propulsion can achieve " +
        'in real interplanetary navigation. ' +
        'The spacecraft entered orbit around Vesta, spent over a year studying it, ' +
        'departed, flew across the asteroid belt to Ceres, and entered orbit there. ' +
        'No spacecraft before it had ever orbited two different solar system bodies.',

        'A chemical system could not have managed the task: ' +
        'there would simply not be enough propellant. ' +
        "Dawn's three ion engines — three units for redundancy — " +
        'together gave the spacecraft more total velocity change than any chemical system ' +
        'of equivalent mass could provide. ' +
        'Xenon was consumed at grams per day, but over years of flight that trickle of thrust ' +
        'accumulated into a genuine interplanetary trajectory.',
      ],
    },

    {
      heading: 'The Hall thruster: the ion engine\'s simpler sibling',
      level: 2,
      paragraphs: [
        'The gridded ion thruster is not the only form of electric propulsion. ' +
        'A second type developed in parallel: the Hall effect thruster, often called the Hall thruster. ' +
        'The name honors the Hall effect at its core: ' +
        'a transverse magnetic field forces electrons into tight spiraling orbits, ' +
        'increasing the distance they travel and their probability of colliding with xenon atoms.',

        'In a Hall thruster there are no physical acceleration grids. ' +
        'Ions are accelerated inside an annular channel by the combined action of ' +
        'an electric field and a magnetic field. ' +
        'The design is simpler, more durable, and longer-lived: ' +
        'grids in a gridded thruster erode over time from ion bombardment, ' +
        'whereas Hall thruster channels wear far more slowly.',

        'The specific impulse of a Hall thruster typically falls between 1500 and 2000 seconds — ' +
        'somewhat below a gridded ion thruster, but far above chemical alternatives. ' +
        'At the same time it produces noticeably more thrust per kilogram of thruster mass, ' +
        'which makes it the preferred choice for commercial geostationary satellites ' +
        'and large constellations in low Earth orbit.',

        "The European Space Agency's Smart-1, launched in 2003, " +
        "was the agency's first lunar mission and the first spacecraft to reach the Moon " +
        'exclusively on a Hall thruster. ' +
        'The Psyche spacecraft, launched in 2023 toward the metallic asteroid of the same name, ' +
        'also uses Hall thrusters for its interplanetary cruise. ' +
        'And every Starlink satellite in the constellation of several thousand spacecraft ' +
        'carries one or more Hall thrusters for orbit maintenance and collision avoidance.',
      ],
    },

    {
      image: {
        cacheKey: 'ion-propulsion-hall-thruster',
        prompt:
          'Photorealistic close-up science encyclopedia photo of a Hall effect thruster in a vacuum test chamber: ' +
          'annular ring-shaped thruster face glowing with bright blue-white plasma discharge in the channel, ' +
          'intense violet and blue light from ionized xenon, ' +
          'test chamber walls barely visible in background, ' +
          'hard sci-fi style, dark background, technically accurate. ' +
          'Add the following text labels on the image: "Hall thruster channel", "xenon plasma", "annular geometry", "magnetic field coils".',
        alt: 'Hall effect thruster in a vacuum test chamber — annular xenon plasma glow inside the channel',
        caption: 'A Hall thruster during ground testing in a vacuum chamber. The annular geometry is characteristic of all Hall thrusters: ions are not accelerated between physical grids but inside a ring-shaped channel under the influence of crossed electric and magnetic fields. From Smart-1 in 2003 onward, this design became the standard for commercial satellites and large constellations.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Diagram: thrust and specific impulse — the trade-off',
      level: 2,
      paragraphs: [
        'The most important trade-off in electric propulsion is between thrust and specific impulse. ' +
        'These two parameters are inseparably linked by the power available from the energy source. ' +
        'More power means more thrust, but also larger solar panels or an alternative power source. ' +
        'Increasing specific impulse requires accelerating ions to higher velocities with a greater potential difference, ' +
        'but this reduces mass flow rate and with it the thrust. ' +
        'Mission operators always balance between speed and economy.',
      ],
    },

    {
      diagram: {
        title: 'Thrust versus specific impulse: the electric propulsion trade-off',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Thrust vs. Specific Impulse (Isp)</text>

  <!-- Axes -->
  <line x1="70" y1="250" x2="630" y2="250" stroke="#334455" stroke-width="1.5"/>
  <line x1="70" y1="250" x2="70" y2="40" stroke="#334455" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="350" y="280" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Specific Impulse (Isp, seconds)</text>

  <!-- Y axis label -->
  <text x="18" y="150" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90,18,150)">Thrust (Newtons)</text>

  <!-- X axis ticks -->
  <text x="70" y="265" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">0</text>
  <text x="175" y="265" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1000</text>
  <text x="280" y="265" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2000</text>
  <text x="385" y="265" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">3000</text>
  <text x="490" y="265" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">4000</text>
  <text x="595" y="265" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">5000</text>

  <!-- Y axis ticks -->
  <text x="60" y="253" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0</text>
  <text x="60" y="213" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0.1</text>
  <text x="60" y="173" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">0.5</text>
  <text x="60" y="133" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">1.0</text>
  <text x="60" y="93" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end">5.0</text>

  <!-- Grid lines -->
  <line x1="70" y1="213" x2="630" y2="213" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="70" y1="173" x2="630" y2="173" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="70" y1="133" x2="630" y2="133" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.5"/>
  <line x1="175" y1="40" x2="175" y2="250" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.4"/>
  <line x1="280" y1="40" x2="280" y2="250" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.4"/>
  <line x1="385" y1="40" x2="385" y2="250" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.4"/>
  <line x1="490" y1="40" x2="490" y2="250" stroke="#334455" stroke-width="0.5" stroke-dasharray="4,6" opacity="0.4"/>

  <!-- Chemical rockets region (top-left) -->
  <rect x="72" y="55" width="130" height="60" rx="3" fill="#ff8844" opacity="0.15" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="137" y="80" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">chemical rockets</text>
  <text x="137" y="93" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">100–10000 N</text>
  <text x="137" y="106" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Isp 250–450 s</text>

  <!-- Hall thrusters point cluster -->
  <circle cx="210" cy="200" r="6" fill="#7bb8ff" opacity="0.9"/>
  <circle cx="230" cy="210" r="6" fill="#7bb8ff" opacity="0.9"/>
  <circle cx="250" cy="195" r="6" fill="#7bb8ff" opacity="0.9"/>
  <text x="240" y="175" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Hall thruster</text>
  <text x="240" y="186" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">0.05–0.5 N</text>
  <text x="240" y="222" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Isp ~1500-2000 s</text>

  <!-- Gridded ion thrusters point cluster -->
  <circle cx="385" cy="215" r="6" fill="#44ff88" opacity="0.9"/>
  <circle cx="400" cy="222" r="6" fill="#44ff88" opacity="0.9"/>
  <circle cx="415" cy="210" r="6" fill="#44ff88" opacity="0.9"/>
  <text x="400" y="195" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Gridded ion</text>
  <text x="400" y="206" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">0.02–0.2 N</text>
  <text x="400" y="237" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Isp ~3000-5000 s</text>

  <!-- VASIMR / future point -->
  <circle cx="530" cy="178" r="6" fill="#cc4444" opacity="0.8"/>
  <text x="530" y="160" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">VASIMR</text>
  <text x="530" y="171" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">(concept)</text>
  <text x="530" y="192" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Isp ~5000+ s</text>

  <!-- Trade-off curve (qualitative) -->
  <path d="M 137,85 Q 280,160 530,178" fill="none" stroke="#aabbcc" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.5"/>
  <text x="330" y="148" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">trade-off: thrust vs. efficiency</text>
</svg>`,
        caption:
          'At fixed power, thrust and specific impulse trade against each other. ' +
          'Chemical engines deliver enormous thrust but low efficiency. ' +
          'Gridded ion thrusters maximize specific impulse at the cost of thrust. ' +
          'Hall thrusters occupy the middle ground that is often the practical optimum for satellite missions.',
      },
    },

    {
      heading: 'Propellant that does not burn: xenon, krypton, iodine',
      level: 2,
      paragraphs: [
        'Choosing a propellant for an ion thruster is its own engineering challenge. ' +
        'Xenon dominates most missions because of its high atomic mass and chemical inertness. ' +
        'But xenon is expensive and scarce: it is extracted by fractional distillation of air, ' +
        'and global production is limited.',

        'Krypton is a cheaper and more abundant alternative. ' +
        'Its lower atomic mass means that at the same power level a krypton-fed engine ' +
        'produces slightly less thrust but a comparable specific impulse. ' +
        'The Nancy Roman Space Telescope — formally the Nancy Grace Roman Space Telescope — ' +
        'selected krypton for its orbit-maintenance thrusters specifically to reduce propellant costs.',

        'Iodine is the most promising alternative for small satellites: ' +
        'it remains solid at room temperature, ' +
        'requires no heavy pressurized tank, and can be vaporized simply by heating. ' +
        'Several successful demonstration flights on CubeSats have confirmed the principle on orbit.',
      ],
    },

    {
      heading: 'Nuclear electric propulsion and VASIMR: the future of cargo missions',
      level: 2,
      paragraphs: [
        'The central limitation of today\'s ion thrusters is available power. ' +
        'All their electricity comes from solar panels, and far from the Sun ' +
        'that output drops as the square of distance. ' +
        'At Jupiter a solar panel delivers roughly twenty-five times less power than near Earth. ' +
        'The solution is to replace solar panels with a nuclear reactor.',

        'Nuclear electric propulsion — referred to in technical literature by the abbreviation ' +
        '"NEP," standing for nuclear electric propulsion — pairs a fission reactor as a heat source ' +
        'with a thermoelectric or turbine converter and an ion or Hall thruster. ' +
        'The reactor is indifferent to distance from the Sun, ' +
        'delivering stable power in the outer Solar System or at Mars. ' +
        'NASA considers such systems a key element of future cargo missions to Mars, ' +
        'where faster transit times matter for minimizing crew radiation exposure.',

        'A separate category is the variable specific impulse magnetoplasma rocket, ' +
        'known in documentation by the abbreviation "VASIMR," ' +
        'which stands for "Variable Specific Impulse Magnetoplasma Rocket." ' +
        'It heats plasma to extreme temperatures using radio-frequency electromagnetic waves ' +
        'and accelerates it with a magnetic nozzle. ' +
        'Theoretical specific impulse ranges from five thousand to twenty thousand seconds, ' +
        'and thrust at nuclear power levels could reach several newtons — ' +
        'far more than gridded ion thrusters. ' +
        'The technology currently remains at the ground demonstration stage.',
      ],
    },

    {
      image: {
        cacheKey: 'ion-propulsion-nuclear-electric',
        prompt:
          'Futuristic science encyclopedia concept illustration of a nuclear electric propulsion spacecraft in deep space near Mars: ' +
          'large spacecraft with compact nuclear reactor module at the rear, radiator panels extending like fins to dissipate heat, ' +
          'ion thruster array glowing blue at the aft end, ' +
          'Mars visible as a reddish sphere in background, ' +
          'hard sci-fi style, dark space background, technically plausible design. ' +
          'Add the following text labels on the image: "nuclear reactor", "heat radiators", "ion thruster array", "Mars cargo mission".',
        alt: 'Nuclear electric propulsion cargo spacecraft concept near Mars — reactor, heat radiators, and ion thruster array',
        caption: 'Nuclear electric propulsion is the most realistic option for cargo missions to Mars and the outer Solar System. A fission reactor provides stable power regardless of distance from the Sun, giving ion thrusters far more energy than solar panels can deliver at Martian distance.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'DART and the next generation of ion propulsion',
      level: 2,
      paragraphs: [
        'In 2022 the Double Asteroid Redirection Test spacecraft — ' +
        'known by the abbreviation "DART" — ' +
        'successfully impacted the asteroid Dimorphos, demonstrating humanity\'s first ' +
        'practical planetary defense technology. ' +
        'A less-noticed but equally significant detail: the vehicle carried ' +
        'a next-generation thruster called "NEXT-C," ' +
        'standing for "NASA Evolutionary Xenon Thruster — Commercial." ' +
        'It is the successor to the engine that flew on Deep Space 1, ' +
        'with higher thrust, a wider power throttle range, and longer grid life.',

        'DART confirmed that ion propulsion has moved beyond exploration-only spacecraft ' +
        'into the standard toolkit of planetary defense. ' +
        'Meanwhile thousands of Starlink satellites execute thousands of collision-avoidance ' +
        'and station-keeping burns daily using micro Hall thrusters, ' +
        'proving that electric propulsion scales seamlessly from small CubeSats ' +
        'to constellations of thousands of vehicles.',
      ],
    },

    {
      image: {
        cacheKey: 'ion-propulsion-starlink-hall',
        prompt:
          'Photorealistic science encyclopedia illustration of a SpaceX Starlink satellite in low Earth orbit: ' +
          'flat rectangular satellite body with large solar array panel extended, ' +
          'Hall effect thruster glowing faint blue-violet at one end for station-keeping, ' +
          'Earth curvature visible below with city lights and atmosphere glow, ' +
          'hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "Hall thruster", "station-keeping burn", "solar panel", "low orbit".',
        alt: 'Starlink satellite in low Earth orbit — Hall thruster for orbit maintenance and collision avoidance',
        caption: 'Every Starlink satellite carries one or more Hall thrusters. They are used to raise the vehicle to its operational orbit after deployment, perform daily station-keeping corrections, and dodge debris. The scale of the Starlink fleet has made the Hall thruster the most widely deployed ion propulsion device in human spaceflight.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Total impulse versus thrust: why small force wins over time',
      level: 2,
      paragraphs: [
        'The key to understanding ion propulsion is the concept of total impulse. ' +
        'Total impulse is thrust multiplied by operating time. ' +
        'A chemical engine delivers enormous thrust but runs for only a few minutes — ' +
        'its total impulse is capped by how much propellant it carries. ' +
        'An ion thruster delivers microscopic thrust but can run for months and years, ' +
        'accumulating a total impulse unreachable by any chemical system of practical mass.',

        'Dawn ran its three thrusters for a combined total of approximately 5500 hours ' +
        'across the mission. ' +
        'The total velocity change exceeded ten kilometers per second — ' +
        'more than the launch vehicle imparted to the spacecraft at liftoff. ' +
        'Had chemical engines with the same propellant mass been installed, ' +
        'the spacecraft could have reached orbit around Vesta once — ' +
        'with nothing left for the journey to Ceres.',

        'That principle defines the strategic role of ion propulsion: ' +
        'not for rapid maneuvers, but for long-duration cruise. ' +
        'Where time is abundant and propellant is scarce, the ion thruster wins every time.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Specific impulse (Isp)',
      definition:
        'A measure of propulsion efficiency: how many seconds one unit of propellant mass sustains one unit of thrust. Measured in seconds. Chemical engines: 250 to 450 seconds. Ion thrusters: 1500 to 5000 seconds.',
    },
    {
      term: 'Ionization',
      definition:
        'The process of stripping one or more electrons from a neutral atom, converting it into a positively charged ion. In an ion thruster, xenon is ionized inside the discharge chamber.',
    },
    {
      term: 'Gridded ion thruster',
      definition:
        'A type of electric thruster in which ions are accelerated between two or three metal grids held at different electrical potentials. Achieves the highest specific impulse among ion thrusters — 3000 to 5000 seconds.',
    },
    {
      term: 'Hall effect thruster',
      definition:
        'A type of ion thruster with an annular geometry and no physical acceleration grids. Ions are accelerated by crossed electric and magnetic fields inside a ring-shaped channel. Specific impulse 1500 to 2000 seconds; simpler and more durable than gridded designs.',
    },
    {
      term: 'Xenon',
      definition:
        'A heavy noble gas and the standard propellant for ion thrusters. Chemically inert, it does not corrode thruster materials. Its high atomic mass enables meaningful thrust at low mass flow rates.',
    },
    {
      term: 'Total impulse',
      definition:
        'The product of thrust and operating time, measured in newton-seconds. It determines the total velocity change a propulsion system can provide. Ion thrusters compensate for low thrust with very long operating durations.',
    },
    {
      term: 'Nuclear electric propulsion',
      definition:
        'A propulsion architecture in which a nuclear fission reactor generates electricity to power ion or Hall thrusters. Independent of distance from the Sun, making it attractive for missions to the outer Solar System.',
    },
    {
      term: 'Variable Specific Impulse Magnetoplasma Rocket (VASIMR)',
      definition:
        'An advanced electric thruster concept that heats plasma with radio-frequency waves and accelerates it through a magnetic nozzle. Theoretical specific impulse from 5000 to 20000 seconds. Currently at the ground demonstration stage.',
    },
    {
      term: 'Neutralizer',
      definition:
        'A cathode at the exit of an ion thruster that injects electrons back into the ion beam. Without it the spacecraft would accumulate a positive charge and electrostatically attract the outgoing ions, canceling thrust.',
    },
  ],

  quiz: [
    {
      question: 'Why is an ion thruster roughly ten times more propellant-efficient than a chemical rocket?',
      options: [
        'Because it burns propellant at a much higher temperature',
        'Because it accelerates ions to a far higher exhaust velocity — 30 to 40 kilometers per second instead of 3 to 4',
        'Because it uses a nuclear reaction instead of a chemical one',
        'Because it has no moving parts and wastes no energy to friction',
      ],
      correctIndex: 1,
      explanation:
        'Engine efficiency, expressed as specific impulse, is directly proportional to exhaust velocity. Xenon ions exit at 30 to 40 kilometers per second, whereas hot gas from a chemical engine exits at only 3 to 4 kilometers per second. For the same velocity change an ion thruster therefore consumes roughly six to ten times less propellant mass.',
    },
    {
      question: 'Why could Dawn orbit both Vesta and Ceres while a chemical spacecraft could not?',
      options: [
        'Chemical engines do not fire reliably in the asteroid belt due to radiation',
        'Ion engines can stop and restart, whereas chemical engines cannot',
        'Ion propulsion accumulated more total impulse on less propellant mass — enough for both orbit insertions',
        'Ion engines receive energy from the Sun for free and use no propellant at all',
      ],
      correctIndex: 2,
      explanation:
        'Dawn consumed xenon at grams per day, but over years of flight it accumulated more than ten kilometers per second of velocity change. A chemical system carrying the same propellant mass would have had barely enough for one orbit insertion at Vesta with nothing left for the cruise to Ceres. Ion propulsion wins through total impulse — the product of thrust and operating time.',
    },
    {
      question: 'What distinguishes a Hall thruster from a gridded ion thruster?',
      options: [
        'A Hall thruster uses hydrogen instead of xenon as propellant',
        'A Hall thruster has no physical acceleration grids — ions are accelerated by a magnetic field inside an annular channel',
        'A Hall thruster achieves a higher specific impulse',
        'A Hall thruster uses a partial chemical reaction to supplement electric thrust',
      ],
      correctIndex: 1,
      explanation:
        'The key structural difference is in how ions are accelerated. A gridded ion thruster uses metal grids at different electrical potentials. A Hall thruster instead uses a closed electron drift in a transverse magnetic field — this replaces the function of the grids and eliminates the erosion problem they suffer from ion bombardment over time.',
    },
    {
      question: 'Why is an ion thruster unsuitable for launching from Earth\'s surface?',
      options: [
        'Because it requires a vacuum to operate and will not start in an atmosphere',
        'Because solar panel power at ground level is insufficient',
        'Because its thrust of millinewtons is thousands of times smaller than the weight of even the thruster itself',
        'Because xenon ignites in contact with atmospheric oxygen',
      ],
      correctIndex: 2,
      explanation:
        'A typical ion thruster produces 0.05 to 0.5 newtons of thrust. A thruster of even a few kilograms in mass requires tens of newtons of thrust just to support itself against gravity. The actual thrust is orders of magnitude too low. Ion thrusters are designed for microgravity operation, where any force — even a microscopic one — produces steady acceleration over time.',
    },
    {
      question: 'What problem does nuclear electric propulsion solve compared to solar-powered ion thrusters?',
      options: [
        'It eliminates the need for xenon as a propellant',
        'It increases specific impulse by a factor of ten',
        'It delivers stable power far from the Sun, where solar panels produce twenty-five times less energy at Jupiter distance',
        'It enables the spacecraft to travel at the speed of light',
      ],
      correctIndex: 2,
      explanation:
        'Solar panel output falls as the inverse square of distance from the Sun. At the distance of Jupiter a panel generates roughly twenty-five times less power than near Earth. A nuclear fission reactor delivers constant power regardless of position in the Solar System, allowing ion thrusters to operate at full capability billions of kilometers from home.',
    },
  ],

  sources: [
    {
      title: 'NASA — Ion Propulsion: Deep Space 1 Technology',
      url: 'https://www.nasa.gov/centers/jpl/news/ds1-20010918.html',
      meta: 'NASA JPL, open access',
    },
    {
      title: 'NASA — Dawn Mission Overview (ion propulsion)',
      url: 'https://www.nasa.gov/mission_pages/dawn/overview/index.html',
      meta: 'NASA, 2007–2018, open access',
    },
    {
      title: 'ESA — Smart-1: First European Moon mission (Hall thruster)',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Smart-1_overview',
      meta: 'ESA, 2003–2006, open access',
    },
    {
      title: 'NASA — DART Mission: NEXT-C Ion Thruster',
      url: 'https://dart.jhuapl.edu/Mission/Spacecraft.php',
      meta: 'JHU/APL, 2021–2022, open access',
    },
    {
      title: 'NASA — Psyche Mission: Hall Thrusters Overview',
      url: 'https://science.nasa.gov/mission/psyche/',
      meta: 'NASA JPL, 2023, open access',
    },
    {
      title: 'Goebel D., Katz I. — Fundamentals of Electric Propulsion: Ion and Hall Thrusters',
      url: 'https://descanso.jpl.nasa.gov/SciTechBook/series1/Goebel_Katz_Textbook.pdf',
      meta: 'NASA JPL / Wiley, 2008 — open access PDF',
    },
    {
      title: 'NASA — Nuclear Electric Propulsion concepts for Mars',
      url: 'https://www.nasa.gov/space-technology-mission-directorate/nuclear-electric-propulsion/',
      meta: 'NASA STMD, updated 2024',
    },
    {
      title: 'Ad Astra Rocket Company — VASIMR Engine Technical Overview',
      url: 'https://www.adastrarocket.com/vasimr/',
      meta: 'Ad Astra Rocket, open access',
    },
    {
      title: 'SpaceX — Starlink Satellite Operations and Station-Keeping',
      url: 'https://www.spacex.com/starlink/',
      meta: 'SpaceX official site',
    },
    {
      title: 'Rafalskyi D. et al. — In-orbit demonstration of iodine electric propulsion (Nature, 2021)',
      url: 'https://www.nature.com/articles/s41586-021-04015-y',
      meta: 'Nature, 2021, peer-reviewed',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
