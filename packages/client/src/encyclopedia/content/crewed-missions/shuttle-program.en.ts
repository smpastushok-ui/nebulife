import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'shuttle-program',
  language: 'en',
  section: 'crewed-missions',
  order: 6,
  difficulty: 'beginner',
  readingTimeMin: 12,
  title: 'The Space Shuttle Program',
  subtitle: "The world's first reusable spacecraft: thirty years of flight, two crews who did not return, and lessons that reshaped spaceflight.",

  hero: {
    cacheKey: 'shuttle-program-hero',
    prompt:
      'Photorealistic illustration of the Space Shuttle on the launch pad at dawn for a science encyclopedia. ' +
      'The orbiter is mounted on the large orange external tank with two white solid rocket boosters. ' +
      'Launch tower and service structure visible. Steam and condensation around cryogenic fuel lines. ' +
      'Dramatic pre-dawn sky with deep blue and orange gradients. Hard sci-fi style, dark background. ' +
      'Add the following text labels on the image: "orbiter", "external tank", "solid rocket boosters", "launch tower".',
    alt: 'Space Shuttle on the launch pad at dawn — orbiter, external tank, and two solid rocket boosters',
    caption:
      'The Shuttle on the launch pad at Kennedy Space Center. The three main components of the system are clearly visible: the orbiter, the large orange external fuel tank, and the two white solid rocket boosters.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The idea was revolutionary — and contentious from the first day. Instead of building expendable rockets that fell into the ocean after every flight, American engineers proposed a vehicle that launches like a rocket, reaches orbit, completes its mission, and returns to land like an airplane. Then — servicing and back to space again. The Space Shuttle program promised to make orbit cheaper, more accessible, and routine.',

        'Reality proved more complicated. Over thirty years of operation — from 1981 to 2011 — the Shuttle flew 135 missions and delivered more than eight million kilograms of cargo and equipment to orbit. It launched and serviced the Hubble Space Telescope, assembled the International Space Station, and conducted hundreds of hours of experiments in microgravity. It also disintegrated twice, taking fourteen lives. No program in the history of human spaceflight produced such results and such a price simultaneously.',

        'The Shuttle remains a singular engineering object. To understand it is to understand how the compromises between ambition, budget, and physics shape the technology that either exceeds expectations or kills.',
      ],
    },

    {
      image: {
        cacheKey: 'shuttle-program-stack-overview',
        prompt:
          'Photorealistic scientific illustration of the full Space Shuttle stack in flight configuration for a science encyclopedia. ' +
          'Side profile view showing the white orbiter attached to the large orange external fuel tank, ' +
          'two white solid rocket boosters flanking the tank, flame and exhaust plume visible at the bottom. ' +
          'Deep black space background with Earth atmosphere glow at bottom edge. Hard sci-fi style. ' +
          'Add the following text labels on the image: "orbiter", "payload bay", "main engines", "external tank", "SRB".',
        alt: 'Full Space Shuttle stack in flight configuration — orbiter, external tank, and two solid rocket boosters',
        caption: 'The Shuttle system in flight. The external tank — the only expendable component — burned up in the atmosphere after each launch. The solid rocket boosters separated about two minutes after liftoff, descended by parachute into the Atlantic Ocean, and were recovered for refurbishment and reuse.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Three components: who did what',
      level: 2,
      paragraphs: [
        'The Shuttle is not simply a rocket. It is a system of three fundamentally different components, each with its own role and its own fate after each flight.',

        '**The orbiter** was the heart of the system. A winged vehicle roughly the size of a small passenger aircraft, containing the crew cabin, a payload bay more than eighteen meters long, and three main engines. The orbiter was what reached orbit, completed the mission, and returned to Earth — landing on a runway without engine power, gliding unpowered at high speed. That meant the pilot had exactly one chance to approach the runway: no go-around, no option to climb away and try again. Six orbiters were built.',

        '**The external tank** was the largest component and the only one that was not reused. The enormous orange cylinder — its color came from the foam insulation — held liquid hydrogen and liquid oxygen for the orbiter\'s three main engines. About eight and a half minutes after launch, the tank separated and broke apart during atmospheric reentry. Every flight required a new tank.',

        '**The solid rocket boosters** — two of the most powerful solid-fueled motors ever flown — provided approximately eighty percent of the thrust during the first two minutes of flight. They then separated at an altitude of roughly forty-five kilometers, descended by parachute into the Atlantic Ocean, and were recovered by retrieval ships for refurbishment and reuse. Their operating principle differed fundamentally from the main engines: solid propellant cannot be throttled or shut down — once ignited, combustion must run to completion.',
      ],
    },

    {
      heading: 'Six orbiters and their fates',
      level: 2,
      paragraphs: [
        'Each orbiter had a name and a history. Together they formed a generation.',

        '**Enterprise** — the first, but not a spacefaring vehicle. Built in the mid-1970s exclusively for atmospheric test flights. Enterprise never reached orbit — it was dropped from a modified Boeing 747 to verify aerodynamics and landing behavior. It is now on display in New York.',

        '**Columbia** — the first to fly in space. The oldest and heaviest of the flight orbiters, it carried the marks of early design decisions that were later revised. It was lost in February 2003 during reentry.',

        '**Challenger** — the second flight orbiter, active in the first half of the 1980s. Lost in January 1986, seventy-three seconds after launch.',

        '**Discovery** — the most-flown orbiter in the program: thirty-nine missions. It carried the Hubble Space Telescope to orbit and returned for the first servicing mission. It now stands on display near Washington.',

        '**Atlantis** — the last orbiter to fly: the mission in July 2011 closed the program. It made the most flights to the International Space Station. It is now at Kennedy Space Center.',

        '**Endeavour** — the youngest, built to replace Challenger. It completed twenty-five missions, including the second Hubble servicing flight and the final docking mission before the program ended. It is on display in Los Angeles.',
      ],
    },

    {
      image: {
        cacheKey: 'shuttle-program-orbiters',
        prompt:
          'Scientific museum-style illustration comparing the six Space Shuttle orbiters for a science encyclopedia. ' +
          'Six spacecraft silhouettes shown in profile at the same scale, labeled with their names. ' +
          'Enterprise shown with a slightly different outline, Columbia shown with a cross mark indicating loss. ' +
          'Challenger shown with a cross mark indicating loss. Discovery, Atlantis, Endeavour shown intact. ' +
          'Dark space background, monospace labels, hard sci-fi style, accent colors for each orbiter. ' +
          'Add the following text labels on the image: "Enterprise", "Columbia", "Challenger", "Discovery", "Atlantis", "Endeavour".',
        alt: 'The six Space Shuttle orbiters: Enterprise, Columbia, Challenger, Discovery, Atlantis, Endeavour',
        caption: 'Six orbiters of the program. Enterprise flew only atmospheric tests. Columbia and Challenger were lost with their crews. Discovery, Atlantis, and Endeavour completed their service and now stand in museums.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The main engines: the pinnacle of chemical rocket engineering',
      level: 2,
      paragraphs: [
        'The orbiter\'s three main engines were, and remain, among the most complex and efficient liquid-propellant rocket engines ever flown. Each burned liquid hydrogen and liquid oxygen in a staged combustion cycle — the most demanding and thermodynamically efficient cycle in liquid rocketry. Specific impulse in vacuum reached approximately 452 seconds, a figure that no other flight-proven chemical engine has exceeded to this day.',

        'What set these engines apart from most rocket engines of their era was that they were designed for reuse. After each flight they were removed from the orbiter, inspected component by component under close scrutiny, and prepared for the next launch. Over the course of the program they accumulated more than eight hundred starts and hundreds of thousands of seconds of operation. Today these same engines, slightly modified, power the Artemis rocket.',

        'The main engines produced thrust only on the liquid hydrogen and oxygen from the external tank. At liftoff they contributed only about seventeen percent of total thrust — the solid rocket boosters provided the rest. This asymmetry had a consequence: if the boosters ignited and a fault developed, there was no way to stop them.',
      ],
    },

    {
      heading: 'What the Shuttle did in space: the payload bay',
      level: 2,
      paragraphs: [
        'Much of what made the Shuttle unique resided in the payload bay — the long open cargo hold in the center of the orbiter. It carried satellites for deployment into orbit, scientific laboratories, and future station modules. Maximum payload capacity to low Earth orbit was approximately twenty-four metric tons — more than any other crewed spacecraft before it.',

        '**The Hubble Space Telescope** was the Shuttle\'s most famous cargo. Deployed into orbit in April 1990 by Discovery, the telescope soon revealed a serious optical defect in its primary mirror — spherical aberration. The Shuttle\'s ability to return to an orbital object saved the mission: in 1993 astronauts in spacesuits installed corrective optics during spacewalks. Four more servicing missions followed. No other delivery system could have done this — the Shuttle was the only vehicle with a cargo bay, a robotic arm, and the ability to return large objects to Earth.',

        '**Spacelab** was a pressurized scientific laboratory that fitted inside the payload bay. It was effectively the first recurring orbital laboratory where scientists who were not career test pilots could conduct hands-on experiments in microgravity.',

        '**The International Space Station** was the program\'s main construction project in its final decade. The Shuttle delivered large modules, truss segments, and equipment that could not be transported by any other means. Without the Shuttle, the station would not exist in its current form.',
      ],
    },

    {
      image: {
        cacheKey: 'shuttle-program-hubble-eva',
        prompt:
          'Photorealistic illustration of Space Shuttle astronauts performing a spacewalk to service the Hubble Space Telescope for a science encyclopedia. ' +
          'Two astronauts in white spacesuits visible working on the telescope structure, with the shuttle orbiter visible behind. ' +
          'Earth below showing blue oceans and clouds. Telescope metalwork and solar panels visible. ' +
          'Bright sunlight from the side, deep black space background. Hard sci-fi style. ' +
          'Silhouette-style figures, no faces. ' +
          'Add the following text labels on the image: "Hubble telescope", "shuttle robotic arm", "spacewalk", "orbit altitude".',
        alt: 'Shuttle astronauts performing a spacewalk to service the Hubble Space Telescope',
        caption: 'The Hubble Space Telescope servicing mission in 1993. Astronauts conducted five spacewalks to install corrective optics. The Shuttle\'s ability to return to orbital objects and perform repairs remains unprecedented in the history of human spaceflight.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'First flight and the beginning of an era: 1981',
      level: 2,
      paragraphs: [
        'The first orbital test flight took place in April 1981. The Columbia stack launched with two astronauts — John Young and Robert Crippen — and spent two days in orbit. It was the first crewed aerospace vehicle in history to land on a runway, and the first system with components designed for reuse. But even this triumphant flight carried hidden warning signs: sections of the orbiter\'s heat-protection tiles were found damaged after landing — damage that had only been discovered once it was safely on the ground.',

        'Over the next several years the Shuttle flew regular missions, gradually increasing the duration and complexity of its tasks. By the mid-1980s it had become the primary instrument of the American space program. But the accelerating flight rate and growing schedule pressure gradually created conditions in which problems did not receive the attention they deserved.',
      ],
    },

    {
      heading: 'The Challenger disaster: 1986',
      level: 2,
      paragraphs: [
        'On January 28, 1986, seventy-three seconds after launch, Challenger broke apart. All seven crew members were killed. Among them was Christa McAuliffe — a schoolteacher from New Hampshire who was to become the first civilian in space under the Teacher in Space program. The disaster was broadcast live to school classrooms across the country.',

        'The cause was the failure of a rubber O-ring seal between sections of the right solid rocket booster. The seals were made of a material that lost elasticity at low temperatures. The night before launch, temperatures had dropped below freezing — unusually cold for Florida. Engineers at the booster manufacturer warned of the risk and recommended delaying the launch. Program management authorized the flight.',

        'The Rogers Commission that investigated the disaster found not merely a technical failure — it found systemic problems in the decision-making culture at NASA. Warnings had been dismissed, schedule pressure had outweighed technical objections, and the mechanism for protecting engineering dissent had not worked. The program was grounded for nearly three years.',
      ],
    },

    {
      image: {
        cacheKey: 'shuttle-program-challenger-diagram',
        prompt:
          'Scientific technical diagram illustrating the Challenger disaster cause for a science encyclopedia. ' +
          'Cross-section of a solid rocket booster field joint showing the O-ring seal location, hot gas bypass path through the failed O-ring. ' +
          'Cold temperature effect shown with a temperature scale indicator. ' +
          'Arrows showing hot combustion gas leaking through the joint. ' +
          'Technical illustration style, dark background, monospace labels, red accent for the failure point. ' +
          'Add the following text labels on the image: "O-ring seal", "hot gas leak", "joint gap", "booster casing".',
        alt: 'Technical diagram of the Challenger disaster cause — O-ring seal failure in the solid rocket booster field joint',
        caption: 'Cross-section of a booster field joint. The rubber O-ring seal lost elasticity at low temperature and could not reliably seal the joint. Hot combustion gases escaped through the gap, eventually burning through the external tank and triggering the breakup.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Columbia disaster: 2003',
      level: 2,
      paragraphs: [
        'On February 1, 2003, Columbia broke apart during atmospheric reentry over Texas. All seven crew members were killed. The cause was damage to the thermal protection system during launch: a piece of foam insulation had broken off from the external tank and struck the leading edge of the left wing at high speed, damaging the heat-resistant tiles. During reentry, superheated gas — at temperatures exceeding fourteen hundred degrees Celsius — penetrated the damage and destroyed the wing structure from within.',

        'The tragedy is that the damage had been noticed. Reviewing telemetry records and launch video footage, a group of engineers approached management requesting satellite imagery of the wing to assess the damage. Management declined, reasoning that even if damage existed, nothing could be done, and the probability of a problem was judged to be low. Columbia entered the atmosphere.',

        'The investigation again identified systemic failures: "normalization of deviance" — the phenomenon by which repeated small anomalies (tile damage occurred on virtually every launch) gradually come to be regarded as acceptable rather than alarming. The program was grounded for two and a half years.',
      ],
    },

    {
      diagram: {
        title: 'Space Shuttle program: key milestones',
        svg: `<svg viewBox="0 0 720 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="360" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Space Shuttle Program: Key Events</text>

  <!-- Timeline axis -->
  <line x1="40" y1="130" x2="690" y2="130" stroke="#334455" stroke-width="2"/>

  <!-- Year ticks -->
  <line x1="40" y1="125" x2="40" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="40" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1981</text>

  <line x1="145" y1="125" x2="145" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="145" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1986</text>

  <line x1="250" y1="125" x2="250" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="250" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1990</text>

  <line x1="355" y1="125" x2="355" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="355" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1995</text>

  <line x1="460" y1="125" x2="460" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="460" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2000</text>

  <line x1="565" y1="125" x2="565" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="565" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2005</text>

  <line x1="670" y1="125" x2="670" y2="135" stroke="#334455" stroke-width="1.5"/>
  <text x="670" y="148" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2011</text>

  <!-- STS-1: 1981 -->
  <circle cx="40" cy="130" r="5" fill="#44ff88"/>
  <line x1="40" y1="125" x2="40" y2="75" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="40" y="68" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">STS-1</text>
  <text x="40" y="56" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">first launch</text>

  <!-- Challenger: 1986 -->
  <circle cx="145" cy="130" r="5" fill="#cc4444"/>
  <line x1="145" y1="135" x2="145" y2="185" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="145" y="197" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Challenger</text>
  <text x="145" y="209" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">disaster</text>

  <!-- Hubble deploy: 1990 -->
  <circle cx="250" cy="130" r="5" fill="#7bb8ff"/>
  <line x1="250" y1="125" x2="250" y2="75" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="250" y="68" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Hubble</text>
  <text x="250" y="56" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">deployed</text>

  <!-- Hubble repair: 1993 -->
  <circle cx="292" cy="130" r="4" fill="#7bb8ff" opacity="0.7"/>
  <line x1="292" y1="125" x2="292" y2="85" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="2,4" opacity="0.7"/>
  <text x="292" y="78" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">serviced</text>

  <!-- ISS start: 1998 -->
  <circle cx="418" cy="130" r="5" fill="#ff8844"/>
  <line x1="418" y1="135" x2="418" y2="185" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="418" y="197" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">ISS</text>
  <text x="418" y="209" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">assembly</text>

  <!-- Columbia: 2003 -->
  <circle cx="502" cy="130" r="5" fill="#cc4444"/>
  <line x1="502" y1="125" x2="502" y2="75" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="502" y="68" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Columbia</text>
  <text x="502" y="56" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">disaster</text>

  <!-- Final flight: 2011 -->
  <circle cx="670" cy="130" r="5" fill="#44ff88"/>
  <line x1="670" y1="135" x2="670" y2="185" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="670" y="197" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Atlantis</text>
  <text x="670" y="209" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">STS-135</text>

  <!-- Legend -->
  <circle cx="60" cy="245" r="4" fill="#44ff88"/>
  <text x="70" y="249" fill="#8899aa" font-family="monospace" font-size="9">success</text>
  <circle cx="130" cy="245" r="4" fill="#cc4444"/>
  <text x="140" y="249" fill="#8899aa" font-family="monospace" font-size="9">disaster</text>
  <circle cx="210" cy="245" r="4" fill="#7bb8ff"/>
  <text x="220" y="249" fill="#8899aa" font-family="monospace" font-size="9">Hubble</text>
  <circle cx="270" cy="245" r="4" fill="#ff8844"/>
  <text x="280" y="249" fill="#8899aa" font-family="monospace" font-size="9">ISS</text>
</svg>`,
        caption:
          'Timeline from the first launch in 1981 to the final flight in 2011. Two disasters — Challenger and Columbia — divided thirty years of the program into three distinct eras and forced a fundamental reexamination of safety culture.',
      },
    },

    {
      heading: 'Legacy: what the Shuttle left behind',
      level: 2,
      paragraphs: [
        'By 2011 it was clear that the program had not achieved its original economic ambitions. The cost per launch, calculated over the full flight manifest, exceeded initial projections by a large margin. Total program expenditure reached approximately two hundred billion dollars in current prices. But those figures do not tell the whole story.',

        'The Shuttle did what no other vehicle could. It launched and repaired the Hubble Space Telescope, whose images have transformed our understanding of the universe. It built the International Space Station — the largest structure ever placed into orbit. It conducted thousands of hours of scientific research and trained a generation of astronauts. It proved that a winged orbital vehicle with a large cargo bay was technically achievable.',

        'The most lasting legacy of the Shuttle is its influence on modern spaceflight. The reusability concept at the core of its design found a new expression in the Falcon 9 from SpaceX — the first rocket to routinely land its first stage vertically for reuse. Starship, now in development, carries that logic further: full and rapid reuse of both stages. The Shuttle posed the question. The next generation is providing answers.',

        'The program ended not from technical failure. It was retired deliberately — to free resources for a new direction: the Constellation program, which later became Artemis. Where the Shuttle depended on a complex system of components, Artemis returns to a more traditional expendable capsule architecture — but with Shuttle main engines on board.',
      ],
    },

    {
      diagram: {
        title: 'Space Shuttle system configuration',
        svg: `<svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Space Shuttle System Components</text>

  <!-- External Tank (center, large orange) -->
  <ellipse cx="340" cy="160" rx="38" ry="105" fill="none" stroke="#ff8844" stroke-width="2"/>
  <text x="340" y="100" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">EXTERNAL</text>
  <text x="340" y="113" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">TANK</text>
  <text x="340" y="140" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">liquid H2</text>
  <text x="340" y="152" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">+ liquid O2</text>
  <text x="340" y="164" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">~735 t</text>
  <text x="340" y="185" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">expendable</text>

  <!-- Left SRB -->
  <ellipse cx="240" cy="165" rx="22" ry="90" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <text x="190" y="100" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">LEFT</text>
  <text x="190" y="113" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">BOOSTER</text>
  <line x1="215" y1="105" x2="230" y2="118" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="2,3" opacity="0.7"/>
  <text x="240" y="165" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">solid</text>
  <text x="240" y="177" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">propellant</text>
  <text x="240" y="200" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">parachute</text>
  <text x="240" y="212" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">recovery</text>

  <!-- Right SRB -->
  <ellipse cx="440" cy="165" rx="22" ry="90" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <text x="490" y="100" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">RIGHT</text>
  <text x="490" y="113" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">BOOSTER</text>
  <line x1="465" y1="105" x2="450" y2="118" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="2,3" opacity="0.7"/>
  <text x="440" y="200" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">parachute</text>
  <text x="440" y="212" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">recovery</text>

  <!-- Orbiter (attached to right side of ET) -->
  <rect x="360" y="70" width="180" height="55" rx="8" fill="none" stroke="#44ff88" stroke-width="2"/>
  <polygon points="380,125 560,125 580,150 360,150" fill="none" stroke="#44ff88" stroke-width="1.5"/>
  <polygon points="510,70 540,30 550,70" fill="none" stroke="#44ff88" stroke-width="1.5"/>

  <text x="450" y="55" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">ORBITER</text>
  <text x="450" y="95" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">crew cabin</text>
  <text x="450" y="107" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">payload bay 18 m</text>
  <text x="450" y="119" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">3 main engines</text>

  <!-- Main engines at back of orbiter -->
  <circle cx="376" cy="118" r="6" fill="#aabbcc" opacity="0.5"/>
  <circle cx="376" cy="100" r="6" fill="#aabbcc" opacity="0.5"/>
  <circle cx="363" cy="109" r="6" fill="#aabbcc" opacity="0.5"/>
  <text x="345" y="132" fill="#aabbcc" font-family="monospace" font-size="8" text-anchor="middle">RS-25</text>

  <!-- Connections -->
  <line x1="262" y1="155" x2="302" y2="155" stroke="#334455" stroke-width="2"/>
  <line x1="378" y1="155" x2="418" y2="155" stroke="#334455" stroke-width="2"/>
  <line x1="340" y1="55" x2="370" y2="90" stroke="#334455" stroke-width="1.5"/>

  <!-- Exhaust plumes -->
  <polygon points="235,255 215,310 265,310" fill="#ff8844" opacity="0.3"/>
  <polygon points="340,265 310,330 370,330" fill="#ff8844" opacity="0.25"/>
  <polygon points="440,255 415,310 465,310" fill="#ff8844" opacity="0.3"/>

  <!-- Labels bottom -->
  <text x="240" y="345" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">80% thrust</text>
  <text x="240" y="357" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">at liftoff</text>
  <text x="340" y="345" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">-</text>
  <text x="440" y="345" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">sep 2 min</text>
  <text x="440" y="357" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">chute + ocean</text>
</svg>`,
        caption:
          'The Shuttle system configuration at launch. Three fundamentally different components with different reuse profiles: the orbiter returns and lands as a glider, the solid rocket boosters descend by parachute and are recovered, the external tank burns up in the atmosphere after every launch.',
      },
    },

    {
      heading: 'A sober accounting',
      level: 2,
      paragraphs: [
        'The Shuttle turned out to be more demanding to maintain, more expensive to operate, and less safe than planned. The mission loss rate — two out of 135 — was significantly lower than some had feared for a system of such complexity, but significantly higher than the program had promised the public. Fourteen people died because of two engineering and management failures, each of which could have been prevented.',

        'But the Shuttle also left behind the International Space Station, which continues to fly. It left the Hubble Space Telescope, which continues to collect data. It left a generation of astronauts and engineers with unique experience in complex orbital operations. And it left an idea that did not die: a vehicle that flies to space, returns, and flies again. Falcon 9 and Starship from SpaceX pursue that idea from a different angle, but the impulse is the same.',

        'The Shuttle retired in 2011. The Artemis program uses the same main engines — on the Artemis rocket. Ideas do not disappear with blueprints.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Orbiter',
      definition:
        'The winged crewed component of the Shuttle system. Roughly the size of a small passenger aircraft, it contained the crew cabin, the payload bay, and three main engines. It returned to Earth in an unpowered glide and landed on a runway.',
    },
    {
      term: 'External tank',
      definition:
        'The largest component of the Shuttle system — a large reservoir containing liquid hydrogen and liquid oxygen for the orbiter\'s three main engines. The only component that was not reused: it separated after launch and broke apart during atmospheric reentry.',
    },
    {
      term: 'Solid rocket booster',
      definition:
        'One of the two large boosters providing approximately eighty percent of the Shuttle\'s thrust during the first two minutes of flight. Fueled by solid propellant — no throttling or shutdown possible once ignited. After separation they descended by parachute and were recovered for refurbishment.',
    },
    {
      term: 'Payload bay',
      definition:
        'The large open cargo hold in the center section of the orbiter, more than eighteen meters long. It could carry up to twenty-four metric tons to low Earth orbit: satellites, station modules, scientific laboratories.',
    },
    {
      term: 'Spacewalk',
      definition:
        'Work performed by astronauts outside the sealed spacecraft hull while wearing a spacesuit. The Shuttle enabled numerous complex spacewalks, including five servicing missions to the Hubble Space Telescope.',
    },
    {
      term: 'O-ring seal',
      definition:
        'A rubber ring seal between sections of a solid rocket booster. Failure of such a seal at low temperature caused the Challenger disaster in 1986.',
    },
    {
      term: 'Thermal protection system',
      definition:
        'The system of ceramic tiles and reinforced carbon-carbon panels covering the orbiter and protecting it from temperatures exceeding fourteen hundred degrees Celsius during atmospheric reentry. Damage to the system caused the Columbia disaster in 2003.',
    },
    {
      term: 'Low Earth orbit',
      definition:
        'An orbit at altitudes of roughly two hundred to two thousand kilometers above Earth\'s surface. The Shuttle operated in this regime — the International Space Station and the Hubble Space Telescope are both in low Earth orbit.',
    },
    {
      term: 'Normalization of deviance',
      definition:
        'A sociological phenomenon in organizations whereby repeated non-standard events gradually come to be treated as acceptable rather than as warning signs. Identified by both investigation boards following the two Shuttle disasters.',
    },
  ],

  quiz: [
    {
      question: 'Which component of the Shuttle system was not reused and was destroyed after each flight?',
      options: [
        'The orbiter',
        'The solid rocket boosters',
        'The external tank',
        'The main engines',
      ],
      correctIndex: 2,
      explanation:
        'The external tank — the large orange reservoir — reentered the atmosphere and broke apart after separating from the orbiter. It was the only expendable component. The solid rocket boosters were recovered and refurbished, while the orbiter and its main engines returned intact.',
    },
    {
      question: 'What directly caused the Challenger disaster in 1986?',
      options: [
        'Damage to the heat-shield tiles during launch',
        'Failure of an O-ring seal in a solid rocket booster joint at low temperature',
        'Failure of the orbiter\'s main engines',
        'Collision with a piece of orbital debris',
      ],
      correctIndex: 1,
      explanation:
        'The rubber O-ring seal between sections of the right solid rocket booster lost elasticity due to unusually cold temperatures the night before launch and could not reliably seal the joint. Hot combustion gases escaped through the gap, burned through the external tank, and caused the vehicle to break apart seventy-three seconds after liftoff.',
    },
    {
      question: 'What role did the Shuttle play in the Hubble Space Telescope mission?',
      options: [
        'Only launched the telescope to orbit in 1990 and never returned',
        'Launched the telescope and conducted five servicing missions, including installation of corrective optics',
        'Transported the telescope to the Moon for protection from the atmosphere',
        'Only performed servicing missions; an expendable rocket launched the telescope',
      ],
      correctIndex: 1,
      explanation:
        'The Shuttle deployed the Hubble Space Telescope into orbit in April 1990 and then conducted five servicing missions. The first, in 1993, corrected a critical mirror defect. The ability to return to an orbital object and perform repairs was a unique capability that only the Shuttle provided.',
    },
    {
      question: 'What was the primary cause of the Columbia disaster in 2003?',
      options: [
        'A failed landing approach due to pilot error',
        'Explosion of a solid rocket booster during ascent',
        'Damage to the thermal protection tiles by a foam strike during launch, leading to breakup on reentry',
        'Engine failure during the return maneuver',
      ],
      correctIndex: 2,
      explanation:
        'During launch, a piece of foam insulation broke off from the external tank and struck the leading edge of the left wing, damaging the heat-protection tiles. During reentry, superheated gas penetrated the damage and destroyed the wing structure. Tragically, the damage had been detected during the flight, but management declined a request for satellite imagery to assess its severity.',
    },
    {
      question: 'What distinguished the orbiter\'s main engines from most rocket engines of their era?',
      options: [
        'They ran on solid propellant for simplicity',
        'They were designed for reuse and were inspected and refurbished after every flight',
        'They provided the dominant share of thrust at liftoff',
        'They used nuclear heating to improve efficiency',
      ],
      correctIndex: 1,
      explanation:
        'The three main engines — burning liquid hydrogen and liquid oxygen in a staged combustion cycle — were removed from the orbiter after each flight, inspected in detail, and prepared for the next mission. Their specific impulse of approximately 452 seconds remains a record for flight-proven chemical engines. Today, modified versions of these same engines power the Artemis rocket.',
    },
  ],

  sources: [
    {
      title: 'NASA — Space Shuttle Program: Historical Overview',
      url: 'https://www.nasa.gov/humans-in-space/space-shuttle/',
      meta: 'NASA, open access',
    },
    {
      title: 'Columbia Accident Investigation Board (CAIB) Report, 2003',
      url: 'https://www.nasa.gov/columbia/home/CAIB_Vol1.html',
      meta: 'NASA/CAIB, full investigation report, 2003',
    },
    {
      title: 'Presidential Commission on the Space Shuttle Challenger Accident (Rogers Commission), 1986',
      url: 'https://history.nasa.gov/rogersrep/genindex.htm',
      meta: 'NASA History Division, 1986',
    },
    {
      title: 'NASA — Space Shuttle Main Engine (RS-25) Fact Sheet',
      url: 'https://www.nasa.gov/exploration/systems/sls/rs25.html',
      meta: 'NASA, updated 2022',
    },
    {
      title: 'NASA — Hubble Space Telescope: Servicing Missions Overview',
      url: 'https://hubblesite.org/mission-and-telescope/servicing-missions',
      meta: 'NASA/STScI, open access',
    },
    {
      title: 'Vaughan D. — The Challenger Launch Decision: Risky Technology, Culture, and Deviance at NASA',
      url: 'https://press.uchicago.edu/ucp/books/book/chicago/C/bo22809366.html',
      meta: 'University of Chicago Press, 1996',
    },
    {
      title: "NASA — International Space Station Assembly: Shuttle's Role",
      url: 'https://www.nasa.gov/international-space-station/space-shuttle-and-the-iss/',
      meta: 'NASA, open access',
    },
    {
      title: 'Heppenheimer T.A. — The Space Shuttle Decision, 1965–1972',
      url: 'https://history.nasa.gov/SP-4221/cover.htm',
      meta: 'NASA History Series SP-4221, 1999, open access',
    },
    {
      title: 'Logsdon J.M. — After Apollo? Richard Nixon and the American Space Program',
      url: 'https://link.springer.com/book/9781137367990',
      meta: 'Palgrave Macmillan, 2015',
    },
    {
      title: 'NASA Technical Reports Server — Space Shuttle System Summary',
      url: 'https://ntrs.nasa.gov/search?q=space%20shuttle%20system%20summary',
      meta: 'NASA NTRS, open access',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
