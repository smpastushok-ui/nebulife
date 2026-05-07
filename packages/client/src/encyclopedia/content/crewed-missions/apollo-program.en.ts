import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'apollo-program',
  language: 'en',
  section: 'crewed-missions',
  order: 2,
  difficulty: 'beginner',
  readingTimeMin: 13,
  title: 'The Apollo Program',
  subtitle: 'How humanity first set foot on another world — and what it cost.',

  hero: {
    cacheKey: 'apollo-program-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: Saturn V rocket on the launch pad at night, floodlights illuminating steam and exhaust as the engines ignite at the base. ' +
      'Massive gantry structure visible to the left, rocket body reflecting amber light. ' +
      'Dark sky with faint stars above. Hard sci-fi style, dark background, technically accurate geometry. ' +
      'Add the following text labels on the image: "Saturn V", "launch pad 39A", "first stage ignition".',
    alt: 'Saturn V rocket on the launch pad at night — first-stage engines igniting, clouds of steam rising around the service gantry',
    caption:
      'Saturn V — the most powerful rocket ever launched. Across twelve successful flights it delivered twelve people to the lunar surface and brought them home.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'In 1961 President John F. Kennedy made one of the most audacious technical commitments in human history: land a person on the Moon and return them safely to Earth before the decade was out. Not in a year or two — within eight or nine years at most. At that moment no American had even orbited the Earth. The Soviet Union led the United States at every step of the space race. The technology required for a lunar landing simply did not exist.',

        'What Kennedy did with that speech was not merely state a goal. He set before an engineering civilization a problem that required solving dozens of unknowns simultaneously, none of which had a known solution. How do you survive in open space? How do you land on a surface no one had seen up close? How do you take off from the Moon with no runway? How do you re-enter the atmosphere at more than eleven kilometers per second without burning alive?',

        'The Apollo program answered every one of those questions. In July 1969 it reached its objective. But the path to that moment proved far more costly than anyone had imagined — and not only in money.',
      ],
    },

    {
      image: {
        cacheKey: 'apollo-program-kennedy-speech',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a wide congressional chamber filled with seated figures, a speaker at a distant podium, American flags visible. ' +
          'Dramatic overhead lighting, formal atmosphere, silhouette view of audience from behind. ' +
          'Hard sci-fi style, dark and dignified tone, no faces visible. ' +
          'Add the following text labels on the image: "Joint session of Congress, 1961", "Moon by end of decade".',
        alt: 'A wide congressional chamber during a speech — overhead view with rows of figures in semi-darkness and a distant podium',
        caption:
          'Address to a joint session of Congress in May 1961. Kennedy requested 531 million dollars in supplemental funding to begin the program — and explained why the Moon, rather than Earth orbit, should be the next objective.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Saturn V: a machine of records',
      level: 2,
      paragraphs: [
        'To carry three people to the Moon and bring them back required a fundamentally new rocket. No existing launch vehicle came close to the necessary payload capacity. The result was Saturn V — the product of a team led by Wernher von Braun.',

        'Saturn V remains the most capable rocket ever launched. Height: approximately one hundred and eleven meters, the equivalent of a thirty-six-story skyscraper. Liftoff mass: roughly two thousand nine hundred metric tons. The first stage burned liquid oxygen and kerosene through five F-1 engines with combined thrust sufficient to lift more than one hundred and eighty tons to low Earth orbit. No rocket built after the end of the Apollo program matched that figure for decades.',

        'But the dimensions are only part of the story. Saturn V had three stages. The first stage burned for approximately two minutes and fell into the ocean. The second stage brought the spacecraft nearly to orbit. The third stage provided the final impulse — the trans-lunar injection — that sent the vehicle toward the Moon. Sitting atop the rocket was the Apollo spacecraft itself: the command module, the service module, and the lunar module.',
      ],
    },

    {
      diagram: {
        title: 'Saturn V: three stages and payload',
        svg: `<svg viewBox="0 0 340 620" xmlns="http://www.w3.org/2000/svg">
  <rect width="340" height="620" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="170" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Saturn V — stages</text>

  <!-- Escape tower -->
  <rect x="160" y="35" width="20" height="40" fill="#667788" opacity="0.9"/>
  <text x="190" y="52" fill="#8899aa" font-family="monospace" font-size="9">launch</text>
  <text x="190" y="63" fill="#8899aa" font-family="monospace" font-size="9">escape</text>

  <!-- Command module (cone) -->
  <polygon points="150,75 190,75 170,52" fill="#7bb8ff" opacity="0.85"/>

  <!-- Service module -->
  <rect x="148" y="75" width="44" height="60" fill="#7bb8ff" opacity="0.7"/>
  <text x="200" y="95" fill="#7bb8ff" font-family="monospace" font-size="9">command</text>
  <text x="200" y="107" fill="#7bb8ff" font-family="monospace" font-size="9">+ service</text>
  <text x="200" y="119" fill="#7bb8ff" font-family="monospace" font-size="9">module</text>

  <!-- Lunar module adapter -->
  <polygon points="140,135 200,135 205,165 135,165" fill="#44ff88" opacity="0.7"/>
  <rect x="135" y="165" width="70" height="55" fill="#44ff88" opacity="0.6"/>
  <text x="200" y="185" fill="#44ff88" font-family="monospace" font-size="9">lunar</text>
  <text x="200" y="197" fill="#44ff88" font-family="monospace" font-size="9">module</text>
  <text x="200" y="209" fill="#44ff88" font-family="monospace" font-size="9">(inside)</text>

  <!-- Stage III -->
  <rect x="130" y="220" width="80" height="100" fill="#ff8844" opacity="0.5"/>
  <line x1="130" y1="220" x2="130" y2="320" stroke="#ff8844" stroke-width="1.5"/>
  <line x1="210" y1="220" x2="210" y2="320" stroke="#ff8844" stroke-width="1.5"/>
  <text x="170" y="268" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Stage III</text>
  <text x="170" y="282" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">1 x J-2 engine</text>
  <text x="170" y="294" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">H2/LOX</text>

  <!-- Stage II -->
  <rect x="125" y="320" width="90" height="130" fill="#ff8844" opacity="0.65"/>
  <line x1="125" y1="320" x2="125" y2="450" stroke="#ff8844" stroke-width="1.5"/>
  <line x1="215" y1="320" x2="215" y2="450" stroke="#ff8844" stroke-width="1.5"/>
  <text x="170" y="378" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Stage II</text>
  <text x="170" y="392" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">5 x J-2 engines</text>
  <text x="170" y="404" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">H2/LOX</text>

  <!-- Stage I -->
  <rect x="115" y="450" width="110" height="145" fill="#cc4444" opacity="0.65"/>
  <line x1="115" y1="450" x2="115" y2="595" stroke="#cc4444" stroke-width="1.5"/>
  <line x1="225" y1="450" x2="225" y2="595" stroke="#cc4444" stroke-width="1.5"/>
  <text x="170" y="515" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">Stage I</text>
  <text x="170" y="530" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">5 x F-1 engines</text>
  <text x="170" y="542" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">kerosene / LOX</text>
  <text x="170" y="554" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">thrust: ~34 MN</text>

  <!-- Nozzle cones -->
  <polygon points="125,595 140,615 155,595" fill="#cc4444" opacity="0.7"/>
  <polygon points="149,595 159,615 169,595" fill="#cc4444" opacity="0.7"/>
  <polygon points="163,595 173,615 183,595" fill="#cc4444" opacity="0.7"/>
  <polygon points="177,595 192,615 202,595" fill="#cc4444" opacity="0.7"/>
  <polygon points="196,595 211,615 225,595" fill="#cc4444" opacity="0.7"/>

  <!-- Height label -->
  <line x1="100" y1="35" x2="100" y2="615" stroke="#334455" stroke-width="0.8" stroke-dasharray="3,4"/>
  <text x="88" y="330" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle" transform="rotate(-90,88,330)">111 meters</text>
</svg>`,
        caption:
          'Saturn V consisted of three stages plus the Apollo spacecraft on top. The five F-1 engines of the first stage provided liftoff thrust; the third stage fired again in Earth orbit to send the spacecraft toward the Moon.',
      },
    },

    {
      heading: 'The key decision: Lunar Orbit Rendezvous',
      level: 2,
      paragraphs: [
        'Before a single bolt was manufactured, engineers faced a fundamental question: which flight path? Three approaches existed. The first was direct ascent: one large vehicle flies to the Moon, lands, and returns directly. The second was Earth Orbit Rendezvous: several smaller vehicles dock in Earth orbit before departing for the Moon together. The third was Lunar Orbit Rendezvous: the entire spacecraft enters lunar orbit, a separate small lander descends to the surface and returns for docking.',

        'Direct ascent was the simplest conceptually but required a rocket so large it would have pushed the program years beyond Kennedy\'s deadline. Earth Orbit Rendezvous introduced complex logistics. Lunar Orbit Rendezvous — initially rejected as too risky — turned out to be the only approach that fit the schedule. By splitting the task into two parts — a dedicated small lander and a separate command vehicle in orbit — each piece became dramatically lighter and simpler to build.',

        'This scheme meant two astronauts descended to the surface while one remained in lunar orbit inside the command module. It also meant the lunar module had to lift off from the surface and dock with the command module in the lunar vacuum. No second chance. One attempt. If the docking failed, the crew remained stranded in lunar orbit with no path home.',
      ],
    },

    {
      image: {
        cacheKey: 'apollo-program-lor-diagram',
        prompt:
          'Scientific diagram for a science encyclopedia illustrating Lunar Orbit Rendezvous mission profile: ' +
          'a numbered sequence of orbital paths around the Moon shown from above. ' +
          'Step 1: Command and Service Module plus Lunar Module enter lunar orbit. ' +
          'Step 2: Lunar Module separates and descends. ' +
          'Step 3: Lunar Module ascent stage lifts off from lunar surface. ' +
          'Step 4: Rendezvous and docking in lunar orbit. ' +
          'Step 5: Crew transfers back, Lunar Module jettisoned. ' +
          'Clean schematic lines, dark space background, monospace labels, orange and cyan accents. ' +
          'Add the following text labels on the image: "lunar orbit", "descent", "ascent", "rendezvous", "return to Earth".',
        alt: 'Schematic of the Lunar Orbit Rendezvous mission profile — five steps from entering lunar orbit to returning to Earth',
        caption:
          'The Lunar Orbit Rendezvous profile. The command module remains in orbit while the lunar module descends and ascends. Docking takes place in lunar vacuum — the only route home for the crew.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Tragedy on the launch pad',
      level: 2,
      paragraphs: [
        'The Apollo program knew its darkest hour before any mission had flown to the Moon. In January 1967, during a ground rehearsal on the launch pad, a fire broke out inside the cabin of Apollo 1. In an atmosphere of pure oxygen under pressure, the flames spread within seconds. Three astronauts — Gus Grissom, Ed White, and Roger Chaffee — died before rescue workers could open the hatch.',

        'The investigation uncovered more than two hundred design flaws in the command module. The program was frozen for twenty-one months. This was the moment when many asked whether it was worth continuing. But the disaster forced NASA to completely redesign the spacecraft. The new command module had a quick-opening hatch, fire-resistant wiring, and a breathing mixture of nitrogen and oxygen rather than pure oxygen at launch. The tragic price of that lesson was part of the reason all subsequent crewed Apollo flights were completed without fatalities.',
      ],
    },

    {
      image: {
        cacheKey: 'apollo-program-apollo1-memorial',
        prompt:
          'Photorealistic illustration for a science encyclopedia: close-up of three astronaut spacesuits displayed in a dimly lit museum hall, no faces visible, viewed from behind or at an angle. ' +
          'Soft light falls on white suit fabric, name patches partially readable. ' +
          'Memorial atmosphere, solemn and respectful. Hard sci-fi style, dark somber background. ' +
          'Add the following text labels on the image: "Apollo 1 crew", "January 1967", "Grissom, White, Chaffee".',
        alt: 'Three astronaut spacesuits in a museum hall — a memorial to the Apollo 1 crew, viewed from behind, no faces visible',
        caption:
          'Gus Grissom, Ed White, and Roger Chaffee died during a ground rehearsal in January 1967. Their deaths fundamentally changed the approach to safety in the Apollo program and saved the crews that followed.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Humans in lunar orbit: Apollo 8',
      level: 2,
      paragraphs: [
        'Late in 1968 NASA made a decision that seemed almost reckless. The lunar module was not yet ready for a crewed flight. But intelligence reports suggested the Soviet Union was preparing a crewed lunar flyby before the year\'s end. In response the agency decided to send Apollo 8 — without a lunar module, carrying only the command and service modules — directly to lunar orbit.',

        'In December 1968 Frank Borman, Jim Lovell, and Bill Anders became the first humans to leave the gravitational influence of Earth and circle another world. Ten orbits around the Moon. A Christmas Eve broadcast watched by more than a billion people. Anders photographed the Earth rising above the lunar horizon — an image called Earthrise that became one of the most recognized photographs ever taken.',

        'Apollo 8 was not only a victory in the psychological race. It was the first real test of deep-space navigation, communication across hundreds of thousands of kilometers, and crew wellbeing far from Earth. The knowledge gained on that flight was indispensable for what was to follow seven months later.',
      ],
    },

    {
      heading: 'The Eagle has landed: Apollo 11',
      level: 2,
      paragraphs: [
        'In July 1969 Neil Armstrong, Buzz Aldrin, and Michael Collins left Earth aboard Saturn V. Four days later Armstrong and Aldrin transferred into the lunar module — named Eagle — and began the descent while Collins remained in lunar orbit inside the command module Columbia.',

        'The descent did not go perfectly. The Apollo Guidance Computer managing the descent began displaying alarm codes due to processing overload. Flight controllers had seconds to decide: continue or abort. They continued. Then Armstrong saw that the automated system was guiding Eagle directly toward a large crater and took manual control. Fuel was nearly exhausted. With twenty seconds to spare before reaching the critical level, Eagle touched the surface.',

        'Armstrong took the first step on the lunar surface. He and Aldrin spent twenty-one hours on the Moon, with approximately two and a half hours outside in their spacesuits. They collected twenty-one kilograms of lunar soil and rock, deployed a seismometer and a laser ranging reflector, and left a plaque. Then they climbed back into the lunar module, lifted off, docked with Columbia, and four days later returned to Earth.',
      ],
    },

    {
      image: {
        cacheKey: 'apollo-program-moonwalk',
        prompt:
          'Photorealistic illustration for a science encyclopedia: an astronaut in a white spacesuit on the lunar surface, seen from the side or rear — no face visible. ' +
          'Footprints in grey regolith, the lunar horizon curving away under a black sky. ' +
          'Earth visible as a blue marble in the upper sky. ' +
          'Hard sci-fi style, dark space background, high contrast between white suit and grey surface. ' +
          'Add the following text labels on the image: "lunar surface", "Earth", "regolith", "Apollo EVA suit".',
        alt: 'Astronaut in a white spacesuit on the lunar surface — side view, no face visible, Earth visible in the black sky above',
        caption:
          'Surface activity during the Apollo 11 mission. Two astronauts spent approximately two and a half hours outside the cabin. Their footprints in the regolith will remain there for millions of years — the Moon has no wind to erase them.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Apollo 13: a successful failure',
      level: 2,
      paragraphs: [
        'Not every Apollo mission was a triumph. In April 1970, on the way to the Moon, an oxygen tank in the service module of Apollo 13 exploded. The spacecraft lost its main source of electrical power and oxygen. The landing was immediately cancelled. The question became something else entirely: could the three astronauts — Jim Lovell, Jack Swigert, and Fred Haise — survive the return journey?',

        'The lunar module, designed to sustain two people for two days, became a lifeboat for three people over four days. Flight controllers in real time developed new procedures: how to filter carbon dioxide with improvised materials, how to conserve enough power for re-entry, how to correct the trajectory using the lunar module\'s engine. The crew was cold, sleep-deprived, and rationing water. They returned safely.',

        'Apollo 13 is often called a successful failure — and the description is accurate. A technical catastrophe became a demonstration of what human endurance and ground control can achieve under absolute pressure. The lessons learned during that mission influenced spacecraft design for the decades that followed.',
      ],
    },

    {
      heading: 'Six landings, twelve moonwalkers',
      level: 2,
      paragraphs: [
        'After Apollo 11 the program continued. Apollo 12 in November 1969 demonstrated a precision landing next to the robotic probe Surveyor 3, which had been sitting on the surface for years. Apollo 14 in 1971 visited the highlands, where some of the oldest lunar rocks collected by humans were found. Apollo 15, 16, and 17 — the so-called J-missions — brought a lunar roving vehicle, allowing astronauts to explore tens of kilometers from the landing site.',

        'In total six missions successfully landed on the Moon. Twelve people walked on its surface. During the program approximately three hundred and eighty-two kilograms of rock and soil were returned from six distinct geological regions. Those samples are still being analyzed today — and still producing new answers about the formation of the Solar System. The last mission to lift off from the Moon was Apollo 17 in December 1972, when Eugene Cernan made the final human footstep on the lunar regolith.',

        'Apollo 18, 19, and 20 were planned but cancelled due to budget cuts. American society had grown weary of a program that cost more than any peacetime technological initiative in history. Nobody anticipated then that the next person to land on the Moon would have to wait several decades.',
      ],
    },

    {
      image: {
        cacheKey: 'apollo-program-lunar-rover',
        prompt:
          'Photorealistic illustration for a science encyclopedia: an astronaut in a white spacesuit driving a lunar roving vehicle on the grey Moon surface. ' +
          'Seen from behind and to the side, no face visible. Tyre tracks in regolith. ' +
          'Mountains in the background on the lunar horizon. ' +
          'Hard sci-fi style, dark sky with no atmosphere, high contrast lighting from the Sun. ' +
          'Add the following text labels on the image: "lunar roving vehicle", "regolith tracks", "J-mission".',
        alt: 'Astronaut driving a lunar roving vehicle on the grey Moon surface — rear view, wheel tracks in the regolith, mountains on the horizon',
        caption:
          'The lunar roving vehicle carried on Apollo 15, 16, and 17 allowed astronauts to cover far greater distances than on foot. Combined driving distance across all three missions was approximately ninety kilometers.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Legacy: science, technology, and scale',
      level: 2,
      paragraphs: [
        'The lunar samples returned by the Apollo program became the calibration standard for planetary science. They allowed researchers to confirm the giant impact hypothesis — the theory that the Moon formed from debris ejected when an early proto-Earth was struck by a body roughly the size of Mars. The isotopic composition of lunar rocks matches Earth\'s so closely that no alternative explanation has ever been as persuasive.',

        'The Apollo Guidance Computer — the onboard system developed specifically for the missions — laid the foundations for an entire generation of embedded computing. Questions about software reliability first posed during development of the Apollo Guidance Computer became the foundation of modern critical software engineering.',

        'But the most enduring legacy of the program turned out to be neither an artifact nor a patent. It was a generation of engineers who solved problems nobody had solved before, and thousands of organizational and technical decisions that entered the general body of human knowledge. The Apollo program demonstrated that concentrating sufficient resources and intellect around a precisely defined goal can move the boundary of what is possible in a very short time.',
      ],
    },

    {
      diagram: {
        title: 'Apollo mission profile: Lunar Orbit Rendezvous',
        svg: `<svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Apollo Mission Profile</text>

  <!-- Earth (left) -->
  <circle cx="65" cy="200" r="45" fill="#334455" stroke="#446688" stroke-width="1.5"/>
  <text x="65" y="195" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Earth</text>

  <!-- Moon (right) -->
  <circle cx="590" cy="200" r="55" fill="#445566" stroke="#8899aa" stroke-width="1.5"/>
  <text x="590" y="196" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">Moon</text>

  <!-- Trans-lunar trajectory -->
  <path d="M 110 185 Q 340 80 540 180" fill="none" stroke="#7bb8ff" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="320" y="72" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">trans-lunar trajectory</text>

  <!-- Return trajectory -->
  <path d="M 540 220 Q 340 310 110 215" fill="none" stroke="#7bb8ff" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="320" y="330" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">return trajectory</text>

  <!-- Lunar orbit circle -->
  <ellipse cx="590" cy="200" rx="95" ry="75" fill="none" stroke="#8899aa" stroke-width="1" stroke-dasharray="4,5"/>
  <text x="500" y="155" fill="#8899aa" font-family="monospace" font-size="9">lunar orbit</text>

  <!-- LM descent arrow -->
  <line x1="580" y1="145" x2="567" y2="180" stroke="#ff8844" stroke-width="2" marker-end="url(#arrowOrangeEn)"/>
  <text x="530" y="138" fill="#ff8844" font-family="monospace" font-size="9">LM descent</text>

  <!-- LM ascent arrow -->
  <line x1="558" y1="248" x2="571" y2="218" stroke="#44ff88" stroke-width="2" marker-end="url(#arrowGreenEn)"/>
  <text x="518" y="266" fill="#44ff88" font-family="monospace" font-size="9">LM ascent</text>

  <!-- CSM label -->
  <text x="638" y="175" fill="#aabbcc" font-family="monospace" font-size="9">CSM in</text>
  <text x="638" y="187" fill="#aabbcc" font-family="monospace" font-size="9">orbit</text>

  <!-- Step numbers -->
  <circle cx="140" cy="155" r="10" fill="#334455" stroke="#7bb8ff" stroke-width="1"/>
  <text x="140" y="159" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">1</text>
  <text x="155" y="148" fill="#8899aa" font-family="monospace" font-size="8">launch</text>

  <circle cx="510" cy="155" r="10" fill="#334455" stroke="#7bb8ff" stroke-width="1"/>
  <text x="510" y="159" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">2</text>
  <text x="525" y="148" fill="#8899aa" font-family="monospace" font-size="8">orbit</text>

  <circle cx="564" cy="182" r="10" fill="#334455" stroke="#ff8844" stroke-width="1"/>
  <text x="564" y="186" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">3</text>

  <circle cx="560" cy="245" r="10" fill="#334455" stroke="#44ff88" stroke-width="1"/>
  <text x="560" y="249" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">4</text>

  <circle cx="180" cy="260" r="10" fill="#334455" stroke="#7bb8ff" stroke-width="1"/>
  <text x="180" y="264" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">5</text>
  <text x="165" y="278" fill="#8899aa" font-family="monospace" font-size="8">splashdown</text>

  <defs>
    <marker id="arrowOrangeEn" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L0,8 L8,4 Z" fill="#ff8844"/>
    </marker>
    <marker id="arrowGreenEn" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L0,8 L8,4 Z" fill="#44ff88"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Apollo Lunar Orbit Rendezvous profile. The command and service module stays in orbit (step 2), the lunar module descends (step 3) and ascends (step 4) to dock before the return to Earth (step 5). Abbreviations: LM — lunar module, CSM — command and service module.',
      },
    },
  ],

  glossary: [
    {
      term: 'Lunar Orbit Rendezvous',
      definition:
        'The flight mode chosen for Apollo in which the entire spacecraft enters lunar orbit, a separate small lander descends to the surface and returns to dock with the orbiting command module. Selected over direct ascent because it required a far smaller liftoff mass.',
    },
    {
      term: 'Saturn V',
      definition:
        'The heavy-lift launch vehicle developed for the Apollo program. Height approximately one hundred and eleven meters, liftoff mass roughly two thousand nine hundred metric tons. It remains the most capable rocket ever successfully launched.',
    },
    {
      term: 'Lunar module',
      definition:
        'The two-stage Apollo spacecraft designed exclusively for flight in vacuum: a descent stage for landing on the Moon and an ascent stage for returning to lunar orbit. It could not be used in any atmosphere.',
    },
    {
      term: 'Command module',
      definition:
        'The conical crew compartment of the Apollo spacecraft, occupied during the journey to the Moon and back and during atmospheric re-entry. The only part of the vehicle that returned to Earth.',
    },
    {
      term: 'Service module',
      definition:
        'The cylindrical section of the Apollo spacecraft containing the main engine, oxygen and hydrogen reserves for fuel cells, and life support systems. Jettisoned from the command module just before re-entry.',
    },
    {
      term: 'Trans-lunar injection',
      definition:
        'The burn of the Saturn V third stage in Earth orbit that gave the spacecraft enough velocity to leave Earth orbit and travel to the Moon. After this maneuver the vehicle coasted on a ballistic trajectory.',
    },
    {
      term: 'Apollo Guidance Computer',
      definition:
        'The onboard digital computer that managed navigation and powered descent for the Apollo spacecraft. One of the first embedded real-time computers used in a safety-critical application, it laid the groundwork for modern reliable software engineering.',
    },
    {
      term: 'Regolith',
      definition:
        'The layer of fragmented rock and dust covering the lunar surface, formed over billions of years by meteorite impacts. Lunar regolith returned by Apollo provided key evidence about the origin of the Moon and the early Solar System.',
    },
    {
      term: 'Extravehicular activity',
      definition:
        'Any activity performed by an astronaut outside a pressurized spacecraft, conducted in a spacesuit. In the Apollo context this referred primarily to walking on the lunar surface. The suit maintained pressure, supplied oxygen, and protected against radiation and extreme temperatures.',
    },
  ],

  quiz: [
    {
      question: 'Which flight mode did NASA choose for the Apollo missions, and why?',
      options: [
        'Direct ascent: one large vehicle flies to the Moon and returns directly',
        'Earth Orbit Rendezvous: several vehicles dock in Earth orbit before flying to the Moon together',
        'Lunar Orbit Rendezvous: a separate small lander descends and returns to orbit for docking',
        'Single-trip assault: the lander does not return and the crew is evacuated by a rescue vehicle',
      ],
      correctIndex: 2,
      explanation:
        'Lunar Orbit Rendezvous allowed each part of the spacecraft to be far smaller and lighter. Other approaches required either a much larger rocket or overly complex logistics in Earth orbit. The chosen mode was the only one that fit the deadline Kennedy had set.',
    },
    {
      question: 'What happened to Apollo 13 and how did it end?',
      options: [
        'The mission successfully landed on the Moon despite technical difficulties',
        'An oxygen tank explosion forced the landing to be cancelled; the crew returned using the lunar module as a lifeboat',
        'The astronauts were stranded in lunar orbit and evacuated by a separate rescue vehicle',
        'The mission was aborted before reaching lunar orbit due to an engine failure',
      ],
      correctIndex: 1,
      explanation:
        'An explosion in the service module oxygen tank cut off the spacecraft\'s main power and oxygen supply. The lunar landing was cancelled. The crew used the lunar module — designed for two people and two days — as a lifeboat for three people over four days. All three returned safely.',
    },
    {
      question: 'How many people walked on the lunar surface during the Apollo program?',
      options: [
        'Six — one per successful mission',
        'Eight — some missions had two astronauts on the surface simultaneously for more than one sortie',
        'Twelve — two astronauts on each of the six successful landings',
        'Three — the rest stayed in orbit',
      ],
      correctIndex: 2,
      explanation:
        'Six missions — Apollo 11, 12, 14, 15, 16, and 17 — successfully landed on the Moon. Each time two astronauts descended to the surface while one remained in the command module in orbit. Twelve people in total walked on the Moon.',
    },
    {
      question: 'Why were the lunar samples returned by Apollo scientifically significant?',
      options: [
        'They confirmed the presence of liquid water beneath the lunar surface',
        'Their isotopic composition supported the theory that the Moon formed from debris after a giant impact with early Earth',
        'They revealed traces of microbial life that spurred astrobiology research',
        'Their chemical makeup proved entirely unlike Earth rocks, confirming a separate origin for the Moon',
      ],
      correctIndex: 1,
      explanation:
        'The isotopic composition of lunar rocks matches Earth\'s so precisely that the giant impact hypothesis — the Moon forming from ejecta when a Mars-sized body struck early Earth — became the dominant model. No alternative scenario explains the match as convincingly.',
    },
    {
      question: 'Which mission first carried humans to lunar orbit without attempting a landing?',
      options: [
        'Apollo 11 — the first landing mission, but also the first to achieve lunar orbit',
        'Apollo 8 in December 1968 — humans orbited the Moon for the first time without a lunar module aboard',
        'Apollo 10 — a full dress rehearsal with all hardware but no final landing',
        'Apollo 7 — the first crewed flight after the Apollo 1 fire',
      ],
      correctIndex: 1,
      explanation:
        'Apollo 8 in December 1968 carried three astronauts to lunar orbit — the first time humans had left the gravitational influence of Earth. No lunar module was aboard. Apollo 10 in 1969 conducted a full dress rehearsal that included descending the lunar module to within kilometers of the surface, but without landing.',
    },
  ],

  sources: [
    {
      title: 'NASA — Apollo Program Overview',
      url: 'https://www.nasa.gov/mission_pages/apollo/index.html',
      meta: 'NASA official archive, open access',
    },
    {
      title: 'NASA — Apollo 11 Mission Report',
      url: 'https://history.nasa.gov/apsr/apsr.htm',
      meta: 'NASA History Office, 1969, open access',
    },
    {
      title: 'Chaikin A. — A Man on the Moon: The Voyages of the Apollo Astronauts',
      url: 'https://www.penguinrandomhouse.com/books/116735/a-man-on-the-moon-by-andrew-chaikin/',
      meta: 'Viking, 1994 — standard narrative history of the program',
    },
    {
      title: 'Kranz G. — Failure Is Not an Option',
      url: 'https://www.simonandschuster.com/books/Failure-Is-Not-an-Option/Gene-Kranz/9780743200820',
      meta: 'Simon and Schuster, 2000 — memoir of the Apollo 13 flight director',
    },
    {
      title: 'NASA Technical Reports Server — Saturn V Flight Manual',
      url: 'https://ntrs.nasa.gov/search?q=saturn%20v%20flight%20manual',
      meta: 'NASA NTRS, open access',
    },
    {
      title: 'Smithsonian NASM — Apollo Lunar Surface Journal',
      url: 'https://airandspace.si.edu/research/center-earth-and-planetary-studies/apollo-lunar-surface-journal',
      meta: 'Smithsonian Institution, open access',
    },
    {
      title: 'NASA — Apollo 13 Mission Report',
      url: 'https://history.nasa.gov/apsr/apsr.htm',
      meta: 'NASA History Office, 1970, open access',
    },
    {
      title: 'Lunar and Planetary Institute — Apollo Samples',
      url: 'https://www.lpi.usra.edu/lunar/samples/',
      meta: 'LPI USRA, open access',
    },
    {
      title: 'MIT — Apollo Guidance Computer source code',
      url: 'https://github.com/chrislgarry/Apollo-11',
      meta: 'MIT, GitHub archive, open access',
    },
    {
      title: 'NASA History Division — What Made Apollo a Success?',
      url: 'https://history.nasa.gov/SP-287/sp287.htm',
      meta: 'NASA SP-287, 1971, open access',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
