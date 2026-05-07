import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'landers-rovers',
  language: 'en',
  section: 'space-tech',
  order: 11,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Lander and Rover Engineering',
  subtitle: 'From parachutes and airbags to the sky crane: how engineers deliver machines to other worlds.',

  hero: {
    cacheKey: 'landers-rovers-hero',
    prompt:
      'Photorealistic science encyclopedia illustration: a rover on a rusty red Martian surface at golden hour, ' +
      'solar panels extended, six-wheel rocker-bogie suspension visible, camera mast pointing toward distant mountains. ' +
      'Dust devil in background, rocky terrain in foreground. Hard sci-fi style, dark amber sky, technically accurate geometry. ' +
      'Add the following text labels on the image: "rocker-bogie suspension", "solar panels", "camera mast", "Mars surface".',
    alt: 'A rover on the Martian surface — six-wheel rocker-bogie suspension, solar panels, and camera mast against a Martian landscape',
    caption:
      'Every component on the Martian surface was tested for years on Earth before departure. ' +
      'A rover is not just a rolling laboratory — it is an engineering compromise between mass, power, mobility, and survivability.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Getting off Earth is hard. But setting a spacecraft down intact on another planet ' +
        'is a challenge that pushes engineers to invent solutions that border on the theatrical. ' +
        'The atmosphere, if one exists, is either too thin or too thick. ' +
        'The surface is unknown until the moment of contact. ' +
        'The signal from Earth arrives minutes or tens of minutes late. ' +
        'No mistake is correctable. In a matter of minutes, a spacecraft must decelerate ' +
        'from several kilometers per second to zero — entirely on its own, ' +
        'with no human hand on the controls.',

        'This problem has a name: entry, descent, and landing. ' +
        'Three sequential phases, any one of which can end a mission. ' +
        'And each is solved differently depending on the destination: ' +
        'the Moon with no atmosphere at all, Mars with an atmosphere roughly one hundredth as dense as Earth\'s, ' +
        'or Titan, where the atmosphere is actually denser than Earth\'s ' +
        'but the temperature is minus one hundred and eighty degrees Celsius. ' +
        'No single solution works everywhere. There is instead a toolkit of engineering strategies, ' +
        'each with its own mass budget, reliability record, and cost.',

        'Over several decades, humanity has developed four fundamentally different landing approaches: ' +
        'parachutes, retro-thrusters, airbags, and the sky crane. ' +
        'Each is an answer to a specific combination of conditions. ' +
        'And the rovers that survive those landings face a different problem: ' +
        'how to move across terrain that nobody has mapped at meter resolution, ' +
        'without tipping over, getting stuck, or driving off an unseen cliff.',
      ],
    },

    {
      heading: 'The parachute: first line of deceleration',
      level: 2,
      paragraphs: [
        'The parachute is the oldest and most intuitive deceleration tool. ' +
        'For interplanetary missions, however, it becomes a work of engineering art. ' +
        'On Earth a parachute easily slows a person or cargo to a safe speed. ' +
        'On Mars and Titan the situation is fundamentally different.',

        'The Martian atmosphere is only about one percent as dense as Earth\'s. ' +
        'A parachute that would stop a load in minutes on Earth ' +
        'decelerates a spacecraft far less and far more slowly on Mars. ' +
        'A Martian parachute must be enormous — and must open at supersonic speeds, ' +
        'that is at a Mach number above one. ' +
        'That is a requirement that would be considered exotic by terrestrial standards. ' +
        'The first successful Martian parachute opened at approximately Mach two. ' +
        'Supersonic parachutes have been standard for all subsequent Mars missions.',

        'Titan, the moon of Saturn, tells a completely different story. ' +
        'Its atmosphere is so dense that the Huygens probe in two thousand and five ' +
        'descended for nearly two hours under two parachutes in sequence — ' +
        'first a larger one to slow the initial descent, ' +
        'then a smaller one to keep the probe in the lower atmosphere longer ' +
        'and transmit data back to the Cassini orbiter. ' +
        'Huygens was never designed to survive the landing itself — ' +
        'it was a kamikaze probe built only for the descent. ' +
        'It performed flawlessly.',
      ],
    },

    {
      image: {
        cacheKey: 'landers-rovers-edl-sequence',
        prompt:
          'Scientific infographic showing Mars Entry Descent and Landing sequence: ' +
          'four stages arranged left to right — spacecraft enters atmosphere in protective aeroshell with heat shield glowing orange, ' +
          'then large supersonic parachute deploys slowing descent, then retro-rockets fire, then rover touches down. ' +
          'Dark space background transitioning to rusty Martian sky. Hard sci-fi style, monospace labels. ' +
          'Add the following text labels on the image: "atmospheric entry", "parachute deploy", "retro-rockets", "touchdown".',
        alt: 'Entry, descent, and landing sequence for Mars — four phases from aeroshell to surface contact',
        caption:
          'The four phases of entry, descent, and landing on Mars. Each is a separate engineering challenge. ' +
          'The spacecraft has no margin for error: the entire sequence from first atmospheric contact to standstill lasts only a few minutes.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Retro-thrusters: the controlled descent',
      level: 2,
      paragraphs: [
        'Where there is no atmosphere, or where it is too thin for a parachute to finish the job, ' +
        'the only remaining option is rocket engines. ' +
        'The Apollo lunar missions of the nineteen sixties and seventies ' +
        'were the first large-scale implementation of this approach. ' +
        'The Apollo lunar module carried a single large descent engine ' +
        'and sixteen smaller attitude control thrusters, ' +
        'giving astronauts the ability to manually steer around craters and boulders during the final approach.',

        'In the twenty-first century, China\'s Chang\'e program successfully repeated this strategy on the Moon, ' +
        'including the first soft landing on the lunar far side — ' +
        'a hemisphere with no direct line of sight to Earth. ' +
        'The signal was relayed through a dedicated communications satellite in orbit. ' +
        'Even under those constraints, the landing executed entirely autonomously.',

        'The Tianwen-one mission in twenty twenty-one demonstrated China\'s first Mars landing ' +
        'and showed the full deceleration chain: ' +
        'an aeroshell with a heat shield, a supersonic parachute, ' +
        'and a final powered descent on retro-thrusters. ' +
        'During the last seven meters above the surface, the lander hovered on its engines, ' +
        'scanned the terrain with cameras, and autonomously selected its touchdown point. ' +
        'Then came a quiet contact and the deployment of the Zhurong rover.',
      ],
    },

    {
      heading: 'Airbags: cheap, elegant, and briefly dominant',
      level: 2,
      paragraphs: [
        'In the late twentieth century, NASA chose for the Mars Pathfinder mission in nineteen ninety-seven ' +
        'an approach that appeared almost absurd: ' +
        'wrap the spacecraft in giant inflatable spheres and simply drop it onto the surface. ' +
        'The vehicle would bounce and eventually come to rest.',

        'It worked. After parachute deceleration and a brief retro-rocket pulse, ' +
        'the lander struck the surface on its airbag cluster, ' +
        'bounced tens of meters, rolled, and finally stopped. ' +
        'The airbags deflated, the petal-shaped protective shell opened — ' +
        'and inside was the small Sojourner rover, weighing approximately eleven kilograms. ' +
        'It was the first mobile machine ever to operate on the surface of another planet.',

        'In two thousand and four, the same method was used for the much heavier ' +
        'Spirit and Opportunity rovers — each weighing roughly one hundred and eighty kilograms. ' +
        'A double-layer airbag system absorbed the impact, both spacecraft survived, ' +
        'and they landed at opposite ends of the planet. ' +
        'Spirit operated for more than six Earth years; Opportunity lasted nearly fifteen. ' +
        'Airbags proved to be reliable and relatively affordable — ' +
        'but for spacecraft heavier than roughly two hundred kilograms, the physics no longer cooperates: ' +
        'a bag large enough to cushion the impact would itself be too heavy to be practical.',
      ],
    },

    {
      image: {
        cacheKey: 'landers-rovers-airbag-bounce',
        prompt:
          'Photorealistic science encyclopedia illustration: a Mars lander wrapped in large inflated airbag spheres bouncing on the rocky red Martian surface, ' +
          'dust cloud kicked up on impact, airbag cluster visible as multiple white spheres, ' +
          'late afternoon Martian sky in background. Hard sci-fi style, technically plausible. ' +
          'Add the following text labels on the image: "airbag cluster", "impact bounce", "Mars terrain", "petals opening".',
        alt: 'A Mars lander wrapped in airbags bouncing on the surface — dust cloud, cluster of inflated spheres, petal shell opening',
        caption:
          'The airbag strategy was striking in its simplicity: the spacecraft simply fell, bounced, and stopped. ' +
          'Mars Pathfinder and the twin rovers Spirit and Opportunity all used this approach — ' +
          'and all three landed successfully.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The sky crane: a solution for heavy vehicles',
      level: 2,
      paragraphs: [
        'When NASA began designing a rolling science laboratory in the two thousands — ' +
        'the rover that would become Curiosity, weighing approximately nine hundred kilograms — ' +
        'it became clear that none of the previous landing methods would work. ' +
        'Airbags at that scale were unrealistic. ' +
        'Landing directly on retro-thrusters would contaminate the landing site with exhaust ' +
        'and require large landing legs with complex deployment mechanisms. ' +
        'Then a team at the Jet Propulsion Laboratory proposed a scheme that was initially dismissed as absurd.',

        'The sky crane is a powered descent stage that hovers above the surface on its thrusters, ' +
        'then lowers the rover on cables until the wheels touch down. ' +
        'The cables are cut, and the descent stage flies sideways and crashes at a safe distance. ' +
        'Curiosity spent the final seven meters of its descent hanging in mid-air — ' +
        'just enough clearance to keep the engine plumes from kicking up dust directly under the wheels.',

        'In twenty twenty-one, the same scheme delivered Perseverance — ' +
        'even heavier at approximately one thousand and twenty-five kilograms. ' +
        'The sky crane worked again. ' +
        'The landing lasted exactly seven minutes from first atmospheric contact to standstill — ' +
        'and throughout that time Earth was silent: ' +
        'the signal confirming success arrived eleven minutes after the sequence had already ended. ' +
        'The mission team learned the outcome knowing there had been nothing they could have changed or corrected.',
      ],
    },

    {
      diagram: {
        title: 'Sky crane landing sequence',
        svg: `<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="360" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Sky crane — landing phases</text>

  <!-- Ground line -->
  <line x1="20" y1="340" x2="700" y2="340" stroke="#334455" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="710" y="344" fill="#667788" font-family="monospace" font-size="9">surface</text>

  <!-- Phase 1: Parachute -->
  <ellipse cx="90" cy="80" rx="42" ry="22" fill="none" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="55" y1="94" x2="82" y2="140" stroke="#7bb8ff" stroke-width="1"/>
  <line x1="90" y1="100" x2="90" y2="140" stroke="#7bb8ff" stroke-width="1"/>
  <line x1="125" y1="94" x2="98" y2="140" stroke="#7bb8ff" stroke-width="1"/>
  <ellipse cx="90" cy="148" rx="22" ry="12" fill="#334455" stroke="#7bb8ff" stroke-width="1.5"/>
  <path d="M68,148 Q90,168 112,148" fill="#446688" stroke="#7bb8ff" stroke-width="1"/>
  <text x="90" y="186" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">1. Parachute</text>
  <text x="90" y="197" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">Mach &gt; 1</text>

  <!-- Arrow phase 1->2 -->
  <line x1="140" y1="160" x2="175" y2="160" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arrow2)"/>

  <!-- Phase 2: Powered descent -->
  <rect x="195" y="120" width="44" height="22" fill="#334455" stroke="#ff8844" stroke-width="1.5" rx="4"/>
  <line x1="195" y1="136" x2="178" y2="155" stroke="#ff8844" stroke-width="1.5"/>
  <line x1="239" y1="136" x2="256" y2="155" stroke="#ff8844" stroke-width="1.5"/>
  <line x1="203" y1="142" x2="198" y2="162" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <line x1="217" y1="142" x2="217" y2="164" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <line x1="231" y1="142" x2="236" y2="162" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <text x="217" y="186" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">2. Thrusters</text>
  <text x="217" y="197" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">powered descent</text>

  <!-- Arrow phase 2->3 -->
  <line x1="267" y1="160" x2="302" y2="160" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arrow2)"/>

  <!-- Phase 3: Sky crane lowering rover -->
  <rect x="323" y="108" width="44" height="20" fill="#334455" stroke="#ff8844" stroke-width="1.5" rx="4"/>
  <line x1="331" y1="128" x2="326" y2="150" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <line x1="345" y1="128" x2="345" y2="152" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <line x1="359" y1="128" x2="364" y2="150" stroke="#ff8844" stroke-width="1" opacity="0.8"/>
  <line x1="330" y1="128" x2="328" y2="220" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="345" y1="128" x2="345" y2="220" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="360" y1="128" x2="362" y2="220" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,2"/>
  <rect x="315" y="220" width="60" height="24" fill="#446688" stroke="#7bb8ff" stroke-width="1.5" rx="3"/>
  <circle cx="322" cy="248" r="5" fill="#334455" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="345" cy="248" r="5" fill="#334455" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="368" cy="248" r="5" fill="#334455" stroke="#7bb8ff" stroke-width="1"/>
  <text x="345" y="186" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">3. Sky crane</text>
  <text x="345" y="197" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">~7 m above ground</text>

  <!-- Arrow phase 3->4 -->
  <line x1="400" y1="230" x2="435" y2="230" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arrow2)"/>

  <!-- Phase 4: Rover on surface, sky crane flies away -->
  <rect x="455" y="298" width="66" height="24" fill="#446688" stroke="#7bb8ff" stroke-width="2" rx="3"/>
  <circle cx="463" cy="326" r="6" fill="#334455" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="488" cy="326" r="6" fill="#334455" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="513" cy="326" r="6" fill="#334455" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="488" y1="298" x2="488" y2="278" stroke="#aabbcc" stroke-width="1.5"/>
  <circle cx="488" cy="274" r="4" fill="#7bb8ff"/>
  <rect x="565" y="168" width="36" height="16" fill="#334455" stroke="#ff8844" stroke-width="1" rx="3"/>
  <line x1="572" y1="184" x2="568" y2="200" stroke="#ff8844" stroke-width="1" opacity="0.7"/>
  <line x1="583" y1="184" x2="583" y2="202" stroke="#ff8844" stroke-width="1" opacity="0.7"/>
  <line x1="594" y1="184" x2="598" y2="200" stroke="#ff8844" stroke-width="1" opacity="0.7"/>
  <text x="583" y="220" fill="#cc4444" font-family="monospace" font-size="14" text-anchor="middle">X</text>
  <text x="488" y="356" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">4. Touchdown</text>
  <text x="583" y="238" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">crane crashes</text>

  <defs>
    <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#44ff88"/>
    </marker>
  </defs>

  <line x1="392" y1="128" x2="392" y2="244" stroke="#667788" stroke-width="1" stroke-dasharray="2,3"/>
  <text x="408" y="190" fill="#667788" font-family="monospace" font-size="9">~7 m</text>
</svg>`,
        caption:
          'The sky crane: the powered descent stage hovers on its thrusters, ' +
          'lowers the rover on cables until wheels touch the surface, ' +
          'cuts the cables, and flies away to crash at a safe distance. ' +
          'This sequence worked for both Curiosity (2012) and Perseverance (2021).',
      },
    },

    {
      heading: 'The rocker-bogie suspension: why Mars rovers do not tip over',
      level: 2,
      paragraphs: [
        'After landing comes a different engineering problem: movement. ' +
        'The Martian surface is not a gravel road. ' +
        'It is a field of sharp rocks, slopes up to twenty-five degrees, ' +
        'soft regolith where wheels can sink, and boulders as tall as a person.',

        'To address this, engineers at the Jet Propulsion Laboratory developed ' +
        'in the nineteen nineties a six-wheel suspension called the rocker-bogie — ' +
        'a linkage system with no springs whatsoever. ' +
        'Instead of springs, the geometry of the joints does the work. ' +
        'The front and rear wheel pairs are connected through a rocker arm, ' +
        'and that arm pivots relative to the chassis through a differential linkage. ' +
        'When one wheel climbs over a rock, the rest automatically redistribute the load — ' +
        'no electronics required. ' +
        'The design allows crossing obstacles roughly forty-five centimeters high — ' +
        'up to half the wheel diameter — and maintains stability on slopes up to forty-five degrees, ' +
        'though missions operate with far more conservative safety margins.',

        'Perseverance added autonomous navigation on top of this mechanical foundation. ' +
        'A system of stereo cameras analyzes the terrain ahead ' +
        'and plans a path without waiting for commands from Earth. ' +
        'This increased daily driving distance by a factor of five compared to earlier rovers. ' +
        'Where previous vehicles covered tens of meters per day, ' +
        'Perseverance in good conditions traverses more than two hundred meters, ' +
        'autonomously avoiding hazardous terrain along the way.',
      ],
    },

    {
      diagram: {
        title: 'Rocker-bogie suspension geometry',
        svg: `<svg viewBox="0 0 640 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="320" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Rocker-bogie — load distribution</text>

  <!-- Ground with rock -->
  <line x1="20" y1="220" x2="640" y2="220" stroke="#334455" stroke-width="1.5"/>
  <polygon points="160,220 190,190 220,220" fill="#446688" stroke="#7bb8ff" stroke-width="1"/>
  <text x="190" y="240" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">obstacle</text>

  <!-- Rover body -->
  <rect x="220" y="130" width="200" height="44" fill="#334455" stroke="#7bb8ff" stroke-width="2" rx="4"/>
  <text x="320" y="156" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">rover chassis</text>

  <!-- Rocker pivot -->
  <circle cx="320" cy="174" r="6" fill="#ff8844" stroke="#aabbcc" stroke-width="1.5"/>
  <text x="320" y="192" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">rocker pivot</text>

  <!-- Left rocker arm -->
  <line x1="320" y1="174" x2="200" y2="196" stroke="#7bb8ff" stroke-width="2.5"/>

  <!-- Left bogie pivot -->
  <circle cx="200" cy="196" r="5" fill="#44ff88" stroke="#aabbcc" stroke-width="1.5"/>

  <!-- Left front arm to rock -->
  <line x1="200" y1="196" x2="175" y2="195" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="165" cy="195" r="18" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="165" cy="195" r="4" fill="#7bb8ff"/>

  <!-- Left rear arm -->
  <line x1="200" y1="196" x2="240" y2="214" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="252" cy="214" r="18" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="252" cy="214" r="4" fill="#7bb8ff"/>

  <!-- Right rocker arm -->
  <line x1="320" y1="174" x2="440" y2="196" stroke="#7bb8ff" stroke-width="2.5"/>

  <!-- Right bogie pivot -->
  <circle cx="440" cy="196" r="5" fill="#44ff88" stroke="#aabbcc" stroke-width="1.5"/>

  <!-- Right front wheel -->
  <line x1="440" y1="196" x2="405" y2="214" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="393" cy="214" r="18" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="393" cy="214" r="4" fill="#7bb8ff"/>

  <!-- Right rear wheel -->
  <line x1="440" y1="196" x2="475" y2="214" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="487" cy="214" r="18" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <circle cx="487" cy="214" r="4" fill="#7bb8ff"/>

  <!-- Labels -->
  <text x="200" y="260" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">bogie</text>
  <text x="440" y="260" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">bogie</text>
  <text x="165" y="260" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">front</text>
  <text x="252" y="260" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">rear</text>

  <!-- Load distribution label -->
  <text x="560" y="140" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">load</text>
  <text x="560" y="152" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">redistributes</text>
  <text x="560" y="164" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">automatically</text>
  <line x1="530" y1="160" x2="340" y2="170" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
</svg>`,
        caption:
          'The rocker-bogie suspension distributes load across six wheels through a linkage of arms, ' +
          'with no springs and no electronic control. ' +
          'When the front wheel climbs a rock, the chassis tilts only minimally — ' +
          'the remaining wheels compensate through geometry alone.',
      },
    },

    {
      heading: 'Stationary landers: listening to a planet from the inside',
      level: 2,
      paragraphs: [
        'Not every scientific objective requires motion. ' +
        'Sometimes the most valuable data comes from a lander that simply stands still and listens.',

        'The InSight mission, which landed on Mars in two thousand and eighteen, ' +
        'had no wheels at all. ' +
        'Its centerpiece — a French-built seismometer — was deployed directly onto the surface ' +
        'and measured marsquakes and meteorite impact signatures ' +
        'with a precision down to fractions of a nanometer. ' +
        'Four years of operation gave scientists the first detailed model ' +
        'of Mars\'s interior structure: the thickness of its crust, ' +
        'the depth of the mantle, and the size of the liquid iron core. ' +
        'All of that — without moving a centimeter, without drilling, just listening.',

        'The Phoenix lander used a similar stationary strategy when it touched down ' +
        'in the polar region of Mars in two thousand and eight ' +
        'and confirmed the presence of water ice just a few centimeters below the surface. ' +
        'Phoenix used a robotic arm to scrape and sample the soil ' +
        'and analyze it chemically, but it never moved from its landing site. ' +
        'When the Martian winter reduced incoming sunlight, Phoenix went silent ' +
        'and never regained contact. ' +
        'That is how most stationary landers end their missions — ' +
        'not in catastrophe, but in a gradual dimming.',
      ],
    },

    {
      image: {
        cacheKey: 'landers-rovers-insight-seismometer',
        prompt:
          'Photorealistic science encyclopedia illustration: InSight Mars lander on flat reddish plains, ' +
          'seismometer dome deployed on ground connected by tether, solar panels extended on both sides, ' +
          'robotic arm visible, dusty Martian atmosphere at dusk. Hard sci-fi style, dark amber sky. ' +
          'Add the following text labels on the image: "seismometer dome", "solar panels", "robotic arm", "Martian plain".',
        alt: 'InSight lander on the Martian plain — seismometer dome deployed on the surface, solar panels open on both sides',
        caption:
          'The InSight mission (two thousand and eighteen to two thousand and twenty-two) was the first ' +
          'to measure seismic activity on Mars. ' +
          'A stationary lander accomplished what no rover could: ' +
          'it listened to what was happening deep beneath the surface.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Drilling and sample collection: a laboratory on wheels',
      level: 2,
      paragraphs: [
        'When Curiosity arrived on Mars in two thousand and twelve, ' +
        'it brought a full chemical laboratory. ' +
        'One of its key tools was a percussive drill capable of boring holes ' +
        'up to five centimeters into rock. ' +
        'That sounds modest, but it reaches material that has never been exposed to the Martian atmosphere — ' +
        'not the oxidized surface layer, but rock that has been sealed ' +
        'from the elements for billions of years.',

        'Perseverance went further still. ' +
        'It is designed to collect and store core samples in hermetically sealed titanium tubes. ' +
        'Those tubes are left on the Martian surface or retained on board ' +
        'for a future sample return mission jointly planned by NASA ' +
        'and the European Space Agency. ' +
        'When those samples eventually reach terrestrial laboratories, ' +
        'analysis could take decades — ' +
        'but the results will exceed anything a remote instrument ' +
        'a hundred and fifty million kilometers away could ever tell us.',
      ],
    },

    {
      image: {
        cacheKey: 'landers-rovers-perseverance-drill',
        prompt:
          'Photorealistic science encyclopedia illustration: Perseverance rover robotic arm extended toward a rock, ' +
          'drill bit at end of arm touching grey-brown Martian rock surface, dust visible near drill contact point, ' +
          'rover body in background with camera mast, Mars terrain. Hard sci-fi style. ' +
          'Add the following text labels on the image: "drill bit", "robotic arm", "rock sample", "sample tube".',
        alt: 'Perseverance rover drilling into Martian rock — robotic arm with drill bit in contact with the surface, dust from the bore',
        caption:
          'Perseverance collects rock cores in sealed tubes for a future sample return mission. ' +
          'Each sample is a potential window into the geological — and possibly biological — history of Mars.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Looking ahead: Dragonfly, sample return, and the next frontiers',
      level: 2,
      paragraphs: [
        'The next generation of landers pushes well beyond the established template. ' +
        'The Dragonfly mission, targeted for arrival at Titan in two thousand and thirty-four, ' +
        'will deploy a rotorcraft — an eight-rotor vehicle capable of flying ' +
        'between different surface locations, covering tens of kilometers per sortie. ' +
        'In Titan\'s dense atmosphere and under its weak gravity, ' +
        'that becomes achievable without prohibitive energy costs. ' +
        'Dragonfly will investigate organic chemistry and search for signatures ' +
        'of conditions hospitable to life.',

        'China\'s Tianwen-three mission, targeted for two thousand and twenty-eight, ' +
        'aims to return the first Martian soil to Earth through a Chinese lander and ascent vehicle. ' +
        'The Rosalind Franklin rover from the European Space Agency ' +
        'carries a drill rated for two meters depth — ' +
        'far deeper than anything attempted on Mars so far. ' +
        'At that depth, material is shielded from ultraviolet radiation ' +
        'and may preserve organic molecules far better than the surface.',

        'NASA\'s Commercial Lunar Payload Services program funds a series of small landers to the Moon. ' +
        'The Lunar Vertex mission is among them, targeting magnetic anomalies in the lunar crust — ' +
        'remnants of ancient magnetic fields frozen into rock billions of years ago. ' +
        'This is not survival science; it is science about what the early Moon looked like, ' +
        'and what that tells us about the early Earth.',
      ],
    },

    {
      image: {
        cacheKey: 'landers-rovers-dragonfly-titan',
        prompt:
          'Photorealistic science encyclopedia concept illustration: Dragonfly rotorcraft hovering low over Titan surface, ' +
          'eight rotors spinning, amber-orange hazy sky with Saturn visible faintly in background, ' +
          'hydrocarbon lake and strange dune landscape below, dramatic lighting. Hard sci-fi style. ' +
          'Add the following text labels on the image: "Dragonfly rotorcraft", "Titan atmosphere", "hydrocarbon dunes", "rotor array".',
        alt: 'Dragonfly rotorcraft hovering above the surface of Titan — eight rotors, orange hazy atmosphere, hydrocarbon dune landscape',
        caption:
          'Dragonfly is the first spacecraft designed to fly between locations on another world. ' +
          'The dense atmosphere of Titan and its low gravity make this approach practical. ' +
          'Expected arrival: two thousand and thirty-four.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Entry, descent, and landing',
      definition:
        'The three sequential phases of delivering a spacecraft to a planetary surface with an atmosphere. ' +
        'Each phase requires its own subsystem: a heat shield for entry, ' +
        'a parachute or thrusters for deceleration, and a final soft-landing system.',
    },
    {
      term: 'Sky crane',
      definition:
        'A landing scheme in which a powered descent stage hovers above the surface ' +
        'and lowers the rover on cables until the wheels make contact, ' +
        'then flies sideways and crashes at a safe distance. ' +
        'Used for Curiosity (2012) and Perseverance (2021).',
    },
    {
      term: 'Rocker-bogie suspension',
      definition:
        'A six-wheel suspension system with no springs, distributing load through a linkage of pivoting arms. ' +
        'Allows a rover to clear obstacles up to half the wheel diameter in height ' +
        'without risk of tipping.',
    },
    {
      term: 'Autonomous navigation',
      definition:
        'A computer vision and path-planning system that allows a rover to select a safe route ' +
        'between waypoints without waiting for commands from Earth. ' +
        'Deployed on Perseverance to increase daily traverse distance by a factor of five.',
    },
    {
      term: 'Hazard avoidance',
      definition:
        'A rover safety subsystem: stereo cameras image the terrain ahead, ' +
        'software identifies dangerous rocks and slopes, ' +
        'and either halts the rover or routes it around the obstacle.',
    },
    {
      term: 'Supersonic parachute',
      definition:
        'A parachute that deploys at speeds above the local speed of sound. ' +
        'Required on Mars because the thin atmosphere leaves the spacecraft still supersonic ' +
        'at altitudes where deceleration must begin. ' +
        'Requires materials and design fundamentally different from terrestrial parachutes.',
    },
    {
      term: 'Regolith',
      definition:
        'The layer of loose, fragmented material covering a planetary or lunar surface. ' +
        'On Mars, regolith can be soft enough for wheels to sink, ' +
        'and is one of the primary hazards in rover route planning.',
    },
    {
      term: 'Tianwen',
      definition:
        'The name of China\'s interplanetary mission series, meaning "Questions to Heaven." ' +
        'Tianwen-one in twenty twenty-one achieved China\'s first successful Mars landing. ' +
        'Tianwen-three is planned as a Mars sample return mission.',
    },
    {
      term: 'Sample tube',
      definition:
        'A hermetically sealed titanium capsule into which Perseverance places drill core samples. ' +
        'Tubes are cached on the Martian surface or retained on board ' +
        'for retrieval by a future sample return mission.',
    },
  ],

  quiz: [
    {
      question: 'Why does landing on Mars require a supersonic parachute, while Earth landings do not?',
      options: [
        'Martian parachutes are smaller, so they deploy faster',
        'The Martian atmosphere is so thin that the spacecraft remains supersonic until low altitudes, where a conventional parachute would deploy too late to be effective',
        'On Earth, parachutes also open above Mach two',
        'Supersonic parachutes are used just as commonly on Earth as on Mars',
      ],
      correctIndex: 1,
      explanation:
        'The Martian atmosphere is roughly one percent as dense as Earth\'s. ' +
        'A spacecraft decelerates far more slowly, arriving at low altitude still traveling faster than the speed of sound. ' +
        'The parachute must open at that moment — otherwise there is not enough altitude left for further deceleration.',
    },
    {
      question: 'What is the sky crane, and why was it invented?',
      options: [
        'The rover is dropped from high altitude onto airbags',
        'A powered descent stage hovers on thrusters and lowers the rover on cables, then flies away — avoiding landing legs and engine exhaust contamination',
        'The rover is placed in orbit and descends on its own',
        'The sky crane is a name for the double-dome parachute system',
      ],
      correctIndex: 1,
      explanation:
        'The sky crane solved the problem of landing very heavy rovers: ' +
        'touching down directly on thrusters would require complex landing legs ' +
        'and contaminate the landing site with exhaust. ' +
        'Lowering on cables lets the rover touch down cleanly, ' +
        'while the descent stage crashes harmlessly at a distance.',
    },
    {
      question: 'What advantage does the rocker-bogie suspension offer over a conventional spring suspension?',
      options: [
        'Higher speed on flat terrain',
        'Smaller and lighter wheel assemblies',
        'Automatic load distribution across six wheels through mechanical geometry, with no electronics or springs',
        'The ability to travel in reverse without turning',
      ],
      correctIndex: 2,
      explanation:
        'Rocker-bogie has no springs. A linkage of pivoting arms geometrically distributes load among the wheels. ' +
        'When one wheel climbs an obstacle, the rest compensate without any sensors or actuators. ' +
        'This increases reliability through mechanical simplicity and improves rough-terrain performance.',
    },
    {
      question: 'Which mission first measured the seismic activity of Mars and produced a model of its interior structure?',
      options: [
        'Curiosity rover (two thousand and twelve)',
        'Phoenix lander (two thousand and eight)',
        'InSight lander (two thousand and eighteen to two thousand and twenty-two)',
        'Perseverance rover (two thousand and twenty-one)',
      ],
      correctIndex: 2,
      explanation:
        'InSight never moved — it simply stood and listened. ' +
        'Its seismometer on the surface detected marsquakes and meteorite impacts. ' +
        'Analysis of those signals gave scientists the first measurements of Martian crustal thickness, ' +
        'mantle depth, and confirmation of a liquid iron core.',
    },
    {
      question: 'What makes the Dragonfly mission fundamentally different from all previous planetary surface missions?',
      options: [
        'It uses a nuclear drive to reach Saturn',
        'The spacecraft remains in orbit and never lands',
        'Dragonfly is a rotorcraft that flies between multiple surface locations on Titan, covering tens of kilometers per flight',
        'It is the first mission to use airbags on Titan',
      ],
      correctIndex: 2,
      explanation:
        'All previous rovers and landers either drove or stood still. ' +
        'Dragonfly can fly like a helicopter, using Titan\'s dense atmosphere and low gravity. ' +
        'In a single sortie it will cover distances that a rover would take months to traverse.',
    },
  ],

  sources: [
    {
      title: 'NASA — Mars 2020 Perseverance Rover Landing',
      url: 'https://mars.nasa.gov/mars2020/mission/overview/',
      meta: 'NASA JPL, open access, updated 2024',
    },
    {
      title: 'NASA JPL — Curiosity Rover Technical Overview',
      url: 'https://mars.nasa.gov/msl/spacecraft/overview/',
      meta: 'NASA JPL, open access',
    },
    {
      title: 'NASA — InSight Mars Lander Mission',
      url: 'https://mars.nasa.gov/insight/',
      meta: 'NASA JPL, mission concluded 2022',
    },
    {
      title: 'ESA — Huygens Probe: Descent to Titan',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Cassini-Huygens/Huygens_the_story_of_a_descent',
      meta: 'ESA, open access',
    },
    {
      title: 'NASA — Mars Pathfinder Mission Overview',
      url: 'https://www.jpl.nasa.gov/missions/mars-pathfinder/',
      meta: 'NASA JPL, mission 1997',
    },
    {
      title: 'NASA — Spirit and Opportunity Mars Exploration Rovers',
      url: 'https://mars.nasa.gov/mer/',
      meta: 'NASA JPL, missions 2004–2018',
    },
    {
      title: 'CNSA — Tianwen-1 Mars Mission Overview',
      url: 'https://www.cnsa.gov.cn/english/n6465652/n6465653/c6811372/content.html',
      meta: 'China National Space Administration, 2021',
    },
    {
      title: 'NASA — Dragonfly Mission to Titan',
      url: 'https://dragonfly.jhuapl.edu/',
      meta: 'Johns Hopkins APL / NASA, open access, launch 2034',
    },
    {
      title: 'NASA — Mars Sample Return Program',
      url: 'https://science.nasa.gov/planetary-science/programs/mars-exploration/mars-sample-return/',
      meta: 'NASA / ESA, open access, 2024',
    },
    {
      title: 'Golombek M. et al. — Selection of the InSight Landing Site (2017)',
      url: 'https://doi.org/10.1007/s11214-016-0321-9',
      meta: 'Space Science Reviews, peer-reviewed',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
