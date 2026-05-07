import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'panspermia',
  language: 'en',
  section: 'astrobiology',
  order: 9,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'The Panspermia Hypothesis',
  subtitle:
    'Could life have arrived on Earth from elsewhere — and can living organisms cross the distances between stars?',

  hero: {
    cacheKey: 'panspermia-hero',
    prompt:
      'Photorealistic scientific illustration for a space encyclopedia: a rocky meteorite traveling through deep space, ' +
      'its surface showing embedded microbial structures visible in cross-section, ' +
      'a blue-green planet visible in the distant background, star field, dark space. ' +
      'Hard sci-fi style. ' +
      'Add the following text labels on the image: "meteorite", "microbial spores", "transfer trajectory".',
    alt: 'A meteorite traveling through open space with microbial structures visible inside — concept of lithopanspermia',
    caption:
      'Lithopanspermia is the transfer of microorganisms between planets inside rock fragments ejected by powerful impacts. ' +
      'Mars and Earth have been exchanging material for billions of years.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The origin of life on Earth is one of the greatest open questions in science. ' +
        'But there is a concept that does not answer it — it simply relocates it: panspermia. ' +
        'The idea is both simple and radical: perhaps the first organisms, or their molecular precursors, ' +
        'arrived on Earth from somewhere else in the solar system, or even from another star system entirely. ' +
        'Not born here. _Delivered_.',

        'This sounds speculative — and in many ways it remains so. ' +
        'But over recent decades it has acquired serious scientific grounding. ' +
        'We know that meteorites from Mars have fallen on Earth. ' +
        'We know that some microorganisms withstand conditions that would destroy any known engineered material. ' +
        'We know that aboard the International Space Station, bacterial spores have survived years of exposure ' +
        'to open space. Panspermia is not science fiction. But it is also not an established fact.',
      ],
    },

    {
      heading: 'Three Versions of One Idea',
      level: 2,
      paragraphs: [
        'Panspermia is not a single hypothesis but a family of related ideas, ' +
        'each making different assumptions about the mechanism and the scale of transfer.',

        '**Lithopanspermia** is the most scientifically credible of the three. ' +
        'It proposes that when a large asteroid or comet strikes a planet, the impact can eject ' +
        'rocky fragments at sufficient velocity to escape the planet\'s gravity and enter space. ' +
        'If organisms or spores are sheltered deep enough inside such fragments, ' +
        'they might survive the launch, the journey through space, and the landing on a neighboring world. ' +
        'This is not merely theory — it is a confirmed physical process. ' +
        'We have recovered more than two hundred meteorites of Martian origin and we know ' +
        'that Mars and Earth have been exchanging material across billions of years.',

        '**Radiopanspermia** is a more exotic variant, proposed in the late nineteenth and early twentieth centuries ' +
        'by the physicist Svante Arrhenius. His idea: ultramicroscopic spores could be pushed out of a planet\'s ' +
        'atmosphere by stellar radiation pressure and drift through interstellar space. ' +
        'The problem is serious — stellar radiation in interstellar space would destroy ' +
        'unshielded organic molecules long before arrival. ' +
        'Radiopanspermia is now considered highly unlikely, though the physics of radiation pressure ' +
        'as a transport mechanism remains valid.',

        '**Directed panspermia** is the most audacious version. ' +
        'In 1973, Francis Crick — one of the co-discoverers of the structure of DNA — ' +
        'together with Leslie Orgel published a semi-serious scientific paper with the following idea: ' +
        'what if an intelligent civilization deliberately seeded microorganisms onto the young Earth? ' +
        'Crick and Orgel presented this as a logical, if unverifiable, option for those who considered ' +
        'the chemical spontaneous origin of life implausibly unlikely. ' +
        'The broader scientific community treats this as speculation — but the fact that a Nobel laureate ' +
        'posed the question says something about how seriously some scientists took the puzzle of ' +
        'how complex molecules arose in the first place.',
      ],
    },

    {
      image: {
        cacheKey: 'panspermia-three-types',
        prompt:
          'Scientific diagram illustrating three types of panspermia side by side: ' +
          'left panel shows lithopanspermia with a meteorite impact ejecting rocks from a red planet toward a blue planet; ' +
          'center panel shows radiopanspermia with tiny spores pushed by starlight beams between star systems; ' +
          'right panel shows directed panspermia with a spacecraft seeding a planet with microorganisms. ' +
          'Hard sci-fi style, dark space background, monospace font labels. ' +
          'Add the following text labels on the image: "lithopanspermia", "radiopanspermia", "directed panspermia".',
        alt: 'Three forms of panspermia: lithopanspermia (meteorites), radiopanspermia (radiation pressure), directed panspermia (civilization)',
        caption:
          'The three main variants of panspermia differ substantially in mechanism and scale. Lithopanspermia is the only one with direct physical evidence in its favor.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Mars and Earth: A Confirmed Material Exchange',
      level: 2,
      paragraphs: [
        'The most concrete and scientifically grounded discussion of panspermia concerns the Mars-Earth pair. ' +
        'Both planets formed in the same region of the solar system approximately four and a half billion years ago. ' +
        'Both endured heavy bombardment by asteroids in their early history — ' +
        'and some of those impacts were powerful enough to send Martian rock fragments into orbit, ' +
        'from which they could fall on Earth thousands or millions of years later.',

        'In 1996, the meteorite ALH84001 — a fragment of Martian rock found in Antarctica — ' +
        'triggered one of the most dramatic scientific controversies in the history of astrobiology. ' +
        'A NASA team announced that the meteorite contained structures resembling fossilized microbial forms, ' +
        'alongside carbonate deposits and organic compounds. ' +
        'The following two decades brought sustained debate: most researchers concluded ' +
        'that the structures have abiotic explanations. ' +
        'But the discussion has never fully closed, and the underlying fact — ' +
        'that Martian material has reached Earth — is beyond dispute.',

        'Current estimates suggest that since the formation of the solar system, ' +
        'Earth has received on the order of tens of billions of tonnes of Martian material in total. ' +
        'The reverse direction — from Earth to Mars — is also physically possible, ' +
        'though somewhat less efficient given our planet\'s greater gravity. ' +
        'If primitive microbial life existed on early Mars or early Earth, ' +
        'the theoretical possibility of transfer between the two planets is real.',
      ],
    },

    {
      heading: 'Surviving Space: What We Have Actually Tested',
      level: 2,
      paragraphs: [
        'The central question of lithopanspermia is whether an organism can survive ' +
        'a three-stage marathon: launch (a powerful shock at pressures of hundreds of thousands of atmospheres), ' +
        'a journey through cold vacuum under hard radiation, ' +
        'and entry followed by landing (heating to several hundred degrees Celsius).',

        'The answer, at least in part, is yes. **Tardigrades** — microscopic animals also called water bears — ' +
        'can enter a state of anhydrobiosis: completely suspending their metabolism, ' +
        'surviving vacuum, radiation, and temperatures from near absolute zero to over one hundred fifty degrees Celsius. ' +
        'Notably, tardigrades not only survive short-term exposure to open space — ' +
        'in several experiments they survived the return and resumed reproduction.',

        '**Bacterial spores** (particularly _Bacillus subtilis_) are another microbial survival champion. ' +
        'In the European Space Agency EXPOSE-R2 mission — which ran from 2014 to 2016 — ' +
        'colonies of spores attached to the exterior of the International Space Station ' +
        'endured more than five hundred days in open space. ' +
        'They were exposed to vacuum, extreme temperature cycling, and intense ultraviolet radiation. ' +
        'A fraction of the spores survived. ' +
        'The same agency\'s BIOMEX mission confirmed that certain organisms can maintain structural integrity ' +
        'even after prolonged exposure to open space conditions.',

        'The critical protective factor is _depth within the rock_. ' +
        'Spores on the surface of a meteorite are killed by ultraviolet radiation within hours. ' +
        'But a few centimeters of rock act as a natural radiation shield. ' +
        'Calculations indicate that with sufficient mass and sufficient burial depth, ' +
        'an organism could theoretically survive millions of years of space transit.',
      ],
    },

    {
      image: {
        cacheKey: 'panspermia-survival-meteorite',
        prompt:
          'Scientific cross-section illustration of a meteorite traveling through space: ' +
          'the outer surface shown ablating and glowing during atmospheric entry, ' +
          'a protective rocky interior shown in cross-section with embedded bacterial spores at depth of several centimeters, ' +
          'radiation rays from the sun shown being blocked by the outer rock layer, ' +
          'hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "surface: extreme heat and UV", "rock shield", "protected interior", "bacterial spores".',
        alt: 'Cross-section of a meteorite: the outer surface is destroyed by radiation and heat while spores deep inside are shielded by the rock',
        caption:
          'The rock of a meteorite acts as a natural radiation shield. Organisms buried a few centimeters deep can avoid lethal ultraviolet exposure during an interplanetary journey.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Probabilities: The Mathematics of Survival',
      level: 3,
      paragraphs: [
        'Even if each individual step is physically possible, the combined probability ' +
        'of successful panspermia between Mars and Earth remains very low. ' +
        'Researchers have estimated that of all Martian material falling on Earth, ' +
        'the fraction of fragments capable of transporting a viable organism from the Martian surface ' +
        'to the Earth\'s surface with minimal thermal and radiation damage ' +
        'is approximately one in ten million Martian meteorites.',

        'But time is on the side of rare events. ' +
        'Over four billion years, the cumulative flow of material between the planets is enormous. ' +
        'If each event carries a one-in-ten-million chance of success, ' +
        'but billions of such events occurred across geological time — ' +
        'the arithmetic becomes less hopeless. ' +
        'The exact calculation depends on assumptions about impact frequency and ' +
        'the properties of candidate organisms — and different researchers arrive at very different numbers.',
      ],
    },

    {
      diagram: {
        title: 'Lithopanspermia Route: Three Survival Barriers',
        svg: `<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Lithopanspermia Route: Three Survival Barriers</text>

  <!-- Stage boxes -->
  <!-- Stage 1: Launch -->
  <rect x="30" y="45" width="160" height="155" rx="4" fill="rgba(10,15,25,0.7)" stroke="#334455" stroke-width="1.2"/>
  <text x="110" y="65" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">1. LAUNCH</text>
  <text x="110" y="85" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Asteroid impact</text>
  <text x="110" y="100" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Pressure: 100 000+ atm</text>
  <text x="110" y="115" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Heat: hundreds °C</text>
  <text x="110" y="135" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Survival:</text>
  <text x="110" y="150" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">spores deep in rock</text>
  <text x="110" y="165" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">escape velocity &gt;1 km/s</text>
  <text x="110" y="185" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~10% of fragments</text>
  <text x="110" y="198" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">overcome gravity</text>

  <!-- Arrow 1 -->
  <line x1="190" y1="122" x2="255" y2="122" stroke="#7bb8ff" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Stage 2: Space Transit -->
  <rect x="255" y="45" width="190" height="155" rx="4" fill="rgba(10,15,25,0.7)" stroke="#334455" stroke-width="1.2"/>
  <text x="350" y="65" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">2. TRANSIT</text>
  <text x="350" y="85" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Vacuum: ~0 Pa</text>
  <text x="350" y="100" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Temp: -270...+120 °C</text>
  <text x="350" y="115" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Radiation: UV + cosmic</text>
  <text x="350" y="130" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Duration: thousands-millions yr</text>
  <text x="350" y="150" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Survival:</text>
  <text x="350" y="165" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">anhydrobiosis + shielding</text>
  <text x="350" y="185" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">EXPOSE-R2: Bacillus</text>
  <text x="350" y="198" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">survived 500+ days</text>

  <!-- Arrow 2 -->
  <line x1="445" y1="122" x2="510" y2="122" stroke="#7bb8ff" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Stage 3: Entry and Landing -->
  <rect x="510" y="45" width="160" height="155" rx="4" fill="rgba(10,15,25,0.7)" stroke="#334455" stroke-width="1.2"/>
  <text x="590" y="65" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">3. LANDING</text>
  <text x="590" y="85" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Atmospheric entry</text>
  <text x="590" y="100" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Surface heating</text>
  <text x="590" y="115" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">Impact shock</text>
  <text x="590" y="135" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Survival:</text>
  <text x="590" y="150" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">low entry angle</text>
  <text x="590" y="165" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">soft deceleration</text>
  <text x="590" y="185" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">Combined prob.:</text>
  <text x="590" y="198" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">~1 in 10 000 000</text>

  <!-- Arrow marker definition -->
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#7bb8ff"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Successful lithopanspermia requires overcoming three sequential barriers. ' +
          'Each one substantially reduces the probability of survival, but across billions of years ' +
          'and billions of impact events, the cumulative flow of material makes the odds non-zero.',
      },
    },

    {
      heading: 'Hoyle and Wickramasinghe: The Fringe Version and the Scientific Response',
      level: 2,
      paragraphs: [
        'In the 1970s, astronomers Fred Hoyle and Chandra Wickramasinghe proposed a more radical form of panspermia. ' +
        'They argued that not just microbial spores but complex organic molecules ' +
        'are continuously arriving on Earth from comets and interstellar clouds. ' +
        'More provocatively, they suggested that new outbreaks of viral diseases ' +
        'might be connected to "cometary showers" of microbial material.',

        'The scientific community received this version with deep skepticism — and largely rejected it. ' +
        'Molecular analyses of viruses and pathogens reveal no extraterrestrial origin. ' +
        'But Hoyle himself — one of the most eminent astrophysicists of the twentieth century, ' +
        'the architect of stellar nucleosynthesis theory — gave the topic a place in serious academic debate ' +
        'simply by engaging with it. ' +
        'Today, the Hoyle-Wickramasinghe panspermia is regarded as a scientific fringe position, ' +
        'while lithopanspermia within a single star system remains ' +
        'a credible and partially supported hypothesis.',
      ],
    },

    {
      image: {
        cacheKey: 'panspermia-alh84001',
        prompt:
          'Photorealistic scientific illustration for an encyclopedia: close-up photograph-style image of the ALH84001 Martian meteorite, ' +
          'a dark grey-green rock with visible crystalline structure, ' +
          'an inset box showing electron microscope view of elongated tube-like structures on the rock surface, ' +
          'scale bar shown, scientific laboratory background. ' +
          'Hard sci-fi style, dark tones. ' +
          'Add the following text labels on the image: "ALH84001 Martian meteorite", "possible microfossil structures", "200 nm scale".',
        alt: 'The ALH84001 meteorite — a Martian rock found in Antarctica, with microstructures that sparked the debate about extraterrestrial life',
        caption:
          'ALH84001 became the center of a scientific controversy in 1996. ' +
          'Most researchers now favor abiotic explanations for its microstructures, ' +
          'but the debate has never been formally closed.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Interstellar Panspermia: A Different Scale',
      level: 2,
      paragraphs: [
        'If lithopanspermia between Mars and Earth is physically possible, ' +
        'could something similar happen between different star systems? ' +
        'Here the scale jumps by orders of magnitude: ' +
        'the nearest star system to ours, Alpha Centauri, lies more than four light-years away — ' +
        'tens of thousands of times farther than Mars is from Earth.',

        'Even if a fragment were to reach interstellar space, ' +
        'the transit time at typical orbital velocities would be millions of years. ' +
        'Over such a span, even the most resilient spores inside a rocky shield would accumulate ' +
        'a sufficient dose of cosmic radiation to lethally damage their genetic material. ' +
        'Studies indicate that surviving one million years in interstellar space would require ' +
        'shielding far greater than ordinary meteorites provide — ' +
        'perhaps kilometer-scale fragments of ice and rock, where burial depth is truly substantial.',

        'Some researchers point to an advantage that dense stellar clusters offer: ' +
        'stars there are much closer together, transit times are shorter, ' +
        'and material exchange is substantially more probable. ' +
        'The young solar system formed inside such a cluster, where hundreds of young stars ' +
        'were at far smaller separations — and at that time, interstellar exchange ' +
        'was a considerably more realistic prospect than it is today.',
      ],
    },

    {
      image: {
        cacheKey: 'panspermia-interstellar',
        prompt:
          'Photorealistic scientific illustration for an encyclopedia: a large rocky and icy asteroid fragment traveling through the dark void between two star systems, ' +
          'one star system with a blue planet visible far behind, another orange-red star system visible far ahead, ' +
          'cosmic rays shown as faint streaks, the rock surface showing erosion and pitting. ' +
          'Hard sci-fi style, vast and cold atmosphere. ' +
          'Add the following text labels on the image: "origin star system", "destination system", "millions of years transit", "cosmic ray erosion".',
        alt: 'An interstellar fragment travels through cold space between two star systems — concept of interstellar panspermia',
        caption:
          'Interstellar panspermia requires crossing distances thousands of times greater than the Mars-Earth separation. Transit time is millions of years. Even for the most resilient organisms, the accumulated radiation dose over that span becomes critical.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'What This Explains — and What It Does Not',
      level: 2,
      paragraphs: [
        'The central logical problem with panspermia is that it does not explain the origin of life. ' +
        'It only relocates the question: if microorganisms arrived on Earth from Mars, ' +
        'where did they originate on Mars? ' +
        'If from another star system — where did they arise there? ' +
        'Panspermia is a hypothesis about the _dispersal_ of life, not about its _genesis_.',

        'Nevertheless, the question has genuine scientific value. ' +
        'If panspermia occurred between Mars and Earth, it means that even if we find ' +
        'microbial life on Mars, that discovery would not necessarily prove an independent origin ' +
        'of life in the solar system. ' +
        'Martians and Earthlings might turn out to be biological relatives. ' +
        'The far more exciting result would be finding Martian life with a fundamentally different biochemistry. ' +
        'That would be genuine proof that the emergence of life is not a singular accident.',

        'The state of the evidence as of the early twenty-first century is as follows: ' +
        'material transfer between Mars and Earth is a confirmed fact. ' +
        'The survival of certain organisms under open-space conditions for months and years is a confirmed fact. ' +
        'But the presence of organisms inside transferred material has not yet been demonstrated. ' +
        'Panspermia remains a possible but unproven hypothesis.',
      ],
    },

    {
      diagram: {
        title: 'Survival Probability: Burial Depth versus Transit Duration',
        svg: `<svg viewBox="0 0 660 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="660" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="330" y="20" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">Spore Survival: Burial Depth vs. Transit Time</text>

  <!-- Axes -->
  <line x1="70" y1="240" x2="610" y2="240" stroke="#334455" stroke-width="1.2"/>
  <line x1="70" y1="40"  x2="70"  y2="240" stroke="#334455" stroke-width="1.2"/>

  <!-- X axis label -->
  <text x="340" y="260" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Time in space (years)</text>

  <!-- Y axis label -->
  <text x="16" y="140" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90 16 140)">Survival probability</text>

  <!-- X axis ticks and labels -->
  <line x1="70" y1="240" x2="70" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="70" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">0</text>

  <line x1="178" y1="240" x2="178" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="178" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">10 000</text>

  <line x1="286" y1="240" x2="286" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="286" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">100 000</text>

  <line x1="394" y1="240" x2="394" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="394" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">1 000 000</text>

  <line x1="502" y1="240" x2="502" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="502" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">10 000 000</text>

  <line x1="610" y1="240" x2="610" y2="245" stroke="#334455" stroke-width="1"/>
  <text x="610" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">100 000 000</text>

  <!-- Y axis ticks and labels -->
  <text x="62" y="243" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">0%</text>
  <line x1="65" y1="240" x2="70" y2="240" stroke="#334455" stroke-width="1"/>

  <text x="62" y="193" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">25%</text>
  <line x1="65" y1="190" x2="70" y2="190" stroke="#334455" stroke-width="1"/>

  <text x="62" y="143" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">50%</text>
  <line x1="65" y1="140" x2="70" y2="140" stroke="#334455" stroke-width="1"/>

  <text x="62" y="93" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">75%</text>
  <line x1="65" y1="90" x2="70" y2="90" stroke="#334455" stroke-width="1"/>

  <text x="62" y="43" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">100%</text>
  <line x1="65" y1="40" x2="70" y2="40" stroke="#334455" stroke-width="1"/>

  <!-- Curve 1: Surface exposure (drops fast) -->
  <polyline points="70,50 178,240 286,240 394,240 502,240 610,240"
    fill="none" stroke="#cc4444" stroke-width="2" stroke-dasharray="5,3"/>
  <text x="185" y="220" fill="#cc4444" font-family="monospace" font-size="9">surface</text>
  <text x="185" y="232" fill="#cc4444" font-family="monospace" font-size="9">(0 cm depth)</text>

  <!-- Curve 2: 2cm depth (slower drop) -->
  <polyline points="70,50 178,120 286,180 394,220 502,240 610,240"
    fill="none" stroke="#ff8844" stroke-width="2"/>
  <text x="300" y="162" fill="#ff8844" font-family="monospace" font-size="9">2 cm</text>

  <!-- Curve 3: 5cm depth (much slower drop) -->
  <polyline points="70,50 178,55 286,80 394,120 502,175 610,220"
    fill="none" stroke="#44ff88" stroke-width="2"/>
  <text x="510" y="165" fill="#44ff88" font-family="monospace" font-size="9">5 cm</text>

  <!-- Legend -->
  <line x1="390" y1="55" x2="415" y2="55" stroke="#cc4444" stroke-width="2" stroke-dasharray="5,3"/>
  <text x="420" y="59" fill="#cc4444" font-family="monospace" font-size="9">surface (0 cm)</text>
  <line x1="390" y1="70" x2="415" y2="70" stroke="#ff8844" stroke-width="2"/>
  <text x="420" y="74" fill="#ff8844" font-family="monospace" font-size="9">2 cm depth</text>
  <line x1="390" y1="85" x2="415" y2="85" stroke="#44ff88" stroke-width="2"/>
  <text x="420" y="89" fill="#44ff88" font-family="monospace" font-size="9">5 cm depth</text>
  <rect x="382" y="44" width="220" height="54" rx="3" fill="none" stroke="#334455" stroke-width="1"/>
</svg>`,
        caption:
          'Schematic illustration: organisms on the meteorite surface are killed by radiation within thousands of years, ' +
          'while those buried a few centimeters deep in rock retain a substantially higher survival probability ' +
          'across millions of years of interplanetary transit. ' +
          'Specific numbers depend on rock composition and organism type.',
      },
    },

    {
      heading: 'An Open Question: Possible, but Unproven',
      level: 2,
      paragraphs: [
        'Panspermia is a rare example of a hypothesis that has become more credible over recent decades ' +
        'without crossing the threshold into established fact. ' +
        'Each new discovery — organism survival in open space, recovered Martian meteorites, ' +
        'organic molecules detected on comets and asteroids, complex chemistry in interstellar clouds — ' +
        'makes it more plausible. ' +
        'But direct confirmation — a viable organism inside a rocky fragment of unambiguous Martian or extraterrestrial origin — ' +
        'has not yet been obtained.',

        'If a Mars astrobiology mission ever finds a Martian microorganism, ' +
        'the first and most important question will be: is it related to life on Earth? ' +
        'If the genetic or molecular code is different, that would be evidence of independent origin. ' +
        'If it is similar, we would need to seriously consider the possibility of shared ancestry. ' +
        'The answer to that question would rewrite everything we know about whether life in the universe ' +
        'is a singular event or a widespread phenomenon.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Panspermia',
      definition:
        'The hypothesis that living organisms or their molecular precursors can be transported between planets or star systems — inside meteorites, via stellar radiation pressure, or deliberately by an intelligent civilization.',
    },
    {
      term: 'Lithopanspermia',
      definition:
        'A variant of panspermia in which microorganisms are carried between planets inside rock fragments ejected by powerful meteorite impacts. The most scientifically credible and physically supported version.',
    },
    {
      term: 'Radiopanspermia',
      definition:
        'Svante Arrhenius\'s hypothesis that ultramicroscopic spores are pushed out of a planet\'s atmosphere by stellar radiation pressure and travel through interstellar space. Now considered highly unlikely due to lethal ultraviolet exposure during the journey.',
    },
    {
      term: 'Directed panspermia',
      definition:
        'The idea proposed by Francis Crick and Leslie Orgel in 1973: an intelligent civilization may have deliberately seeded microorganisms onto the young Earth. Treated as speculation rather than a testable scientific hypothesis.',
    },
    {
      term: 'ALH84001',
      definition:
        'A meteorite of Martian origin found in Antarctica. In 1996, NASA announced the discovery of microstructures in it resembling fossilized bacteria. Most researchers now favor abiotic explanations for those structures.',
    },
    {
      term: 'Anhydrobiosis',
      definition:
        'A state of complete metabolic suspension in some organisms (including tardigrades and bacterial spores) upon loss of water. In this state, organisms can withstand vacuum, radiation, and extreme temperatures.',
    },
    {
      term: 'EXPOSE-R2',
      definition:
        'A European Space Agency experiment mounted on the exterior of the International Space Station from 2014 to 2016, during which microorganisms survived more than five hundred days of exposure to open space.',
    },
    {
      term: 'Abiogenesis',
      definition:
        'The natural emergence of living organisms from non-living chemistry. Unlike panspermia, abiogenesis posits that the first terrestrial life arose on Earth itself — for example at hydrothermal vents or in shallow ponds.',
    },
    {
      term: 'BIOMEX',
      definition:
        'Biology and Mars Experiment — a series of European Space Agency experiments on the International Space Station testing the resistance of organisms and biomolecules to simulated Martian surface conditions and open space.',
    },
  ],

  quiz: [
    {
      question: 'Which version of panspermia is considered the most scientifically credible?',
      options: [
        'Radiopanspermia — transport of spores by stellar radiation pressure',
        'Directed panspermia — deliberate seeding of Earth by an intelligent civilization',
        'Lithopanspermia — transport of organisms inside rock fragments ejected by impacts',
        'Chemical panspermia — transfer of organic molecules only, not intact organisms',
      ],
      correctIndex: 2,
      explanation:
        'Lithopanspermia rests on confirmed facts: meteorites of Martian origin exist on Earth, and the survival of certain organisms in open space has been confirmed by the EXPOSE-R2 and BIOMEX missions. This makes it the most scientifically serious version.',
    },
    {
      question: 'What did the European Space Agency EXPOSE-R2 mission demonstrate?',
      options: [
        'That no Earth organisms can survive open space',
        'That Bacillus subtilis spores can survive more than five hundred days in open space',
        'That tardigrades die from ultraviolet radiation within a few hours',
        'That Martian bacteria were detected in collected rock samples',
      ],
      correctIndex: 1,
      explanation:
        'EXPOSE-R2 was an experiment on the exterior of the International Space Station lasting more than five hundred days. A fraction of bacterial spore colonies survived, demonstrating the fundamental possibility of microbial survival under open-space conditions.',
    },
    {
      question: 'Why does panspermia fail to resolve the question of the origin of life?',
      options: [
        'Because transfer between planets is physically impossible',
        'Because it merely relocates the question of where the first life arose to a different place',
        'Because microorganisms cannot survive the launch from a planet',
        'Because organic molecules are destroyed during atmospheric entry',
      ],
      correctIndex: 1,
      explanation:
        'Even if terrestrial life arrived from Mars — where did Martian life originate? Panspermia simply shifts the question further in space and time, without addressing the fundamental problem of how living matter arose from non-living chemistry.',
    },
    {
      question: 'What role does burial depth inside a meteorite play for potential passengers?',
      options: [
        'Depth is irrelevant — only the meteorite\'s speed matters',
        'Surface organisms survive better because they have access to sunlight',
        'Greater depth provides shielding from ultraviolet and cosmic radiation',
        'Organisms at depth are killed by compression during landing impact',
      ],
      correctIndex: 2,
      explanation:
        'The rock of a meteorite acts as a natural radiation shield. Organisms on the surface are killed by ultraviolet radiation very quickly. Those buried a few centimeters deep receive a substantially lower radiation dose and have a far greater chance of surviving a prolonged interplanetary transit.',
    },
    {
      question: 'What discovery would be the strongest evidence that panspermia between Mars and Earth did not occur?',
      options: [
        'Finding a large Martian meteorite in Antarctica',
        'The absence of organic molecules in Martian soil',
        'Discovering Martian microbial life with a fundamentally different biochemistry from Earth life',
        'Evidence that Mars never had liquid water in its past',
      ],
      correctIndex: 2,
      explanation:
        'If Martian and Earth life shared a common panspermian origin, they would share fundamental biochemistry — for example the same genetic code or the same amino acids. If Martian life turns out to be radically different, that proves independent origin and makes panspermia between the two planets unlikely.',
    },
  ],

  sources: [
    {
      title: 'Nicholson W.L. et al. — Resistance of Bacillus endospores to extreme terrestrial and extraterrestrial environments',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC98956/',
      meta: 'Microbiology and Molecular Biology Reviews, 2000 (open access)',
    },
    {
      title: 'Horneck G. et al. — Space Microbiology',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2832349/',
      meta: 'Microbiology and Molecular Biology Reviews, 74(1), 121–156, 2010',
    },
    {
      title: 'McKay D.S. et al. — Search for Past Life on Mars: Possible Relic Biogenic Activity in Martian Meteorite ALH84001',
      url: 'https://www.science.org/doi/10.1126/science.273.5277.924',
      meta: 'Science, 273, 924–930, 1996',
    },
    {
      title: 'Crick F.H.C. and Orgel L.E. — Directed Panspermia',
      url: 'https://www.sciencedirect.com/science/article/pii/0019103573901103',
      meta: 'Icarus, 19, 341–346, 1973 — original directed panspermia proposal',
    },
    {
      title: 'Mileikowsky C. et al. — Natural Transfer of Viable Microbes in Space',
      url: 'https://www.sciencedirect.com/science/article/pii/S0019103599961541',
      meta: 'Icarus, 145, 391–427, 2000 — comprehensive Mars-to-Earth lithopanspermia analysis',
    },
    {
      title: 'Rabbow E. et al. — EXPOSE-R2: The Astrobiological ESA Mission on Board of the International Space Station',
      url: 'https://www.frontiersin.org/articles/10.3389/fmicb.2017.01533/full',
      meta: 'Frontiers in Microbiology, 8, 1533, 2017 (open access)',
    },
    {
      title: 'de la Torre R. et al. — BIOMEX: Organisms and Biosignatures Under Mars-like Conditions and Space Vacuum',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6151076/',
      meta: 'Astrobiology, 2018 — ESA BIOMEX results (open access)',
    },
    {
      title: 'Jonsson K.I. et al. — Tardigrades Survive Exposure to Space in Low Earth Orbit',
      url: 'https://www.cell.com/current-biology/fulltext/S0960-9822(08)00805-1',
      meta: 'Current Biology, 18(17), R729–R731, 2008',
    },
    {
      title: 'NASA — Mars Meteorite ALH84001',
      url: 'https://curator.jsc.nasa.gov/antmet/mmc/alh84001.cfm',
      meta: 'NASA Curation Office, Astromaterials — updated 2023',
    },
    {
      title: 'Worth R.J. et al. — Seeding Life on the Moons of the Outer Planets via Lithopanspermia',
      url: 'https://arxiv.org/abs/1209.1719',
      meta: 'Astrobiology, 13(12), 1155–1165, 2013 (open access)',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
