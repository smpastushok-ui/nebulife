import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'parker-solar-probe',
  language: 'en',
  section: 'robotic-missions',
  order: 4,
  difficulty: 'intermediate',
  readingTimeMin: 11,
  title: 'Parker Solar Probe',
  subtitle: 'The first spacecraft in history to enter the solar atmosphere and survive.',

  hero: {
    cacheKey: 'parker-solar-probe-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Parker Solar Probe spacecraft approaching the Sun at extremely close range. ' +
      'The spacecraft is shown with its white carbon-composite heat shield facing the blazing solar surface below. ' +
      'The corona glows in brilliant white and gold around the solar limb, with plasma streamers and coronal loops visible. ' +
      'The spacecraft instruments are visible in the shadow behind the shield. ' +
      'Deep black space background. Hard sci-fi style, dramatic lighting from the Sun. ' +
      'Add the following text labels on the image: "heat shield", "corona", "solar wind", "Parker Solar Probe".',
    alt: 'The Parker Solar Probe approaching the Sun — its white carbon heat shield faces temperatures exceeding one thousand degrees Celsius',
    caption:
      'The Parker Solar Probe at perihelion — the closest point of its orbit. An 11.4-centimeter carbon-composite heat shield absorbs temperatures above 1370 degrees Celsius while the instruments behind it remain at 30 degrees.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The Sun is the nearest star to Earth, yet throughout the entire space age it remained ' +
        'effectively unreachable. Not because of distance — at roughly 150 million kilometers ' +
        'it is practically next door in cosmic terms. The obstacle was something else: ' +
        'the closer you get, the hotter it becomes, and no material known until recently ' +
        'could survive a genuine approach to a stellar atmosphere. ' +
        'We photographed the Sun from afar, measured its light, watched its eruptions — ' +
        'but we never touched it.',

        'In December 2024, that changed. The Parker Solar Probe, launched in August 2018, ' +
        'passed through the outer layers of the solar atmosphere — the corona — ' +
        'at a distance of just over 6.16 million kilometers from the solar surface. ' +
        'For scale: if the Earth-Sun distance were one meter, the spacecraft closed to within four centimeters. ' +
        'The probe survived the encounter and returned data. ' +
        'No human-made object had ever come this close to any star.',

        'But Parker is more than a record for speed and endurance. ' +
        'It is investigating one of the deepest open questions in plasma physics: ' +
        'why the solar corona is roughly two hundred times hotter than the visible solar surface. ' +
        'Answering that means understanding something fundamental about ' +
        'how every star in the universe works.',
      ],
    },

    {
      image: {
        cacheKey: 'parker-solar-probe-scale-comparison',
        prompt:
          'Scientific diagram for a science encyclopedia showing the orbit of the Parker Solar Probe compared to Mercury and Venus orbits. ' +
          'Concentric elliptical orbits drawn on a dark background with the Sun at center glowing yellow-white. ' +
          'The Parker orbit is highly elliptical, dipping far inside Mercury orbit. ' +
          'Mercury and Venus shown as labeled dots on their circular orbits. ' +
          'Hard sci-fi style, monospace labels, dark space background. ' +
          'Add the following text labels on the image: "Sun", "Mercury", "Venus", "Parker perihelion 6.16M km", "Earth orbit".',
        alt: 'Diagram of the Parker Solar Probe orbit compared to Mercury and Venus — the perihelion falls far inside Mercury orbit close to the Sun',
        caption:
          "The Parker Solar Probe's orbit (red ellipse) compared to the orbits of Mercury and Venus. The perihelion — the closest approach to the Sun — sits at just over 6.16 million kilometers, well inside Mercury's orbit.",
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'A problem without a solution for six decades',
      level: 2,
      paragraphs: [
        'In the middle of the twentieth century, astrophysicist Eugene Parker proposed an idea ' +
        'that the scientific community of the day dismissed as absurd. ' +
        'Parker argued that the Sun continuously emits a stream of charged particles — ' +
        'electrons and protons — radiating outward in all directions through the Solar System. ' +
        'He called it the _solar wind_. The journal editors who received his paper returned it with a rejection. ' +
        'Parker persisted; the paper was saved by the authority of Subrahmanyan Chandrasekhar.',

        'When the first spacecraft reached space in the late 1950s, ' +
        'the solar wind turned out to be entirely real. ' +
        'But confirmation brought new questions. ' +
        'The sharpest was the corona problem. ' +
        'The visible surface of the Sun — the photosphere — has a temperature of about 5500 degrees Celsius. ' +
        'The outer atmosphere — the corona — is heated to one million degrees and beyond. ' +
        'In ordinary thermodynamics, temperature should fall as you move away from a heat source. ' +
        'The corona violates this rule so dramatically that an explanation proved elusive for decades.',

        'The second paradox: the solar wind accelerates. ' +
        'Near the Sun, particles move relatively slowly, but somewhere between the Sun and Earth orbit ' +
        'they reach hundreds of kilometers per second. ' +
        'The acceleration mechanism was unknown. ' +
        'To find it, a spacecraft had to enter the very region where the acceleration happens — ' +
        'and that meant flying closer to the Sun than any previous mission had managed.',
      ],
    },

    {
      heading: 'The engineering problem: surviving next to a star',
      level: 2,
      paragraphs: [
        'The primary obstacle for a solar mission is not distance and not radiation in the conventional sense. ' +
        'It is heat. At 6.16 million kilometers from the Sun, the solar flux is roughly five hundred times ' +
        'more intense than at Earth orbit. The shield protecting the instruments heats up to temperatures ' +
        'comparable to some welding processes.',

        'The solution devised by engineers at the Johns Hopkins Applied Physics Laboratory is elegant in its simplicity. ' +
        'The thermal protection shield is built from two panels of carbon foam sandwiched around a void ' +
        'and coated with a white ceramic-oxide surface that reflects the majority of incoming radiation. ' +
        'Total thickness: 11.4 centimeters. During the final perihelion, ' +
        'the sun-facing surface of the shield reached over 1370 degrees Celsius. ' +
        'Behind it, the instruments operated at 30 degrees. ' +
        'A temperature difference of more than 1300 degrees across the width of a single textbook.',

        'A second challenge is communication. At minimum distance the probe is on the far side of the Sun ' +
        'relative to Earth, making direct transmission impossible. ' +
        'The spacecraft stores data on board and transmits it on the next orbit, ' +
        'when the antenna can be pointed away from the Sun. ' +
        'During the critical closest approach, survival depends entirely on the onboard autonomous system — ' +
        'there is no opportunity for ground controllers to intervene.',
      ],
    },

    {
      image: {
        cacheKey: 'parker-solar-probe-heat-shield',
        prompt:
          'Photorealistic cross-section illustration for a science encyclopedia of the Parker Solar Probe heat shield. ' +
          'Cut-away view revealing the layered carbon-carbon composite foam structure: white ceramic-oxide outer face glowing orange-red from solar radiation, ' +
          'carbon foam insulation layer in the middle, inner carbon face, and the cold instrument bay at 30 degrees Celsius behind. ' +
          'Temperature gradient shown with color from bright orange-white on the sun-facing side to cool blue on the instrument side. ' +
          'Hard sci-fi style, dark background. ' +
          'Add the following text labels on the image: "1370 C sun-facing", "carbon foam 11.4 cm", "instruments 30 C", "ceramic coating".',
        alt: 'Cross-section of the Parker Solar Probe heat shield — 11.4 centimeters of carbon foam between a surface above 1370 degrees and instruments at 30 degrees',
        caption:
          "The Parker Solar Probe heat shield in cross-section. The white ceramic coating reflects the majority of incoming solar heat; the carbon foam absorbs the rest. Behind the shield — 30 degrees Celsius and fully functional instruments.",
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Seven gravity assists: how to shrink an orbit',
      level: 2,
      paragraphs: [
        'Getting close to the Sun is far harder than it sounds. ' +
        'The problem is angular momentum: Earth orbits the Sun at roughly 30 kilometers per second, ' +
        'and any spacecraft launched from Earth inherits that velocity. ' +
        'To fall inward toward the Sun — or even to significantly reduce perihelion distance — ' +
        'a large fraction of that velocity must be canceled. ' +
        'This requires far more propellant than a Mars mission would.',

        'Parker solved the problem through seven _gravity assists_ at Venus, spaced over several years. ' +
        'Each time the spacecraft flew past Venus, it "borrowed" a portion of the planet\'s orbital momentum — ' +
        'in effect transferring some of its own speed to the planet and slowing itself down. ' +
        'Venus is so massive it feels nothing; the probe\'s orbit, however, ' +
        'grew more elongated and dipped progressively closer to the Sun with each pass. ' +
        'The first perihelion after the August 2018 launch was at roughly 24 million kilometers. ' +
        'Each Venus flyby trimmed that figure further.',

        'The final, twenty-fourth perihelion reached in December 2024 brought the spacecraft ' +
        'to just over 6.16 million kilometers from the solar center — ' +
        'approximately 96 percent of the way from Earth orbit to the solar surface. ' +
        'At that point the probe was traveling at roughly 692,000 kilometers per hour. ' +
        'That is the highest speed ever achieved by any human-made object.',
      ],
    },

    {
      diagram: {
        title: 'Orbit shrinkage through Venus gravity assists',
        svg: `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="420" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Perihelion reduction after each Venus flyby</text>

  <!-- Sun -->
  <circle cx="100" cy="210" r="28" fill="#ff8844" opacity="0.9"/>
  <circle cx="100" cy="210" r="36" fill="none" stroke="#ff8844" stroke-width="1" opacity="0.3"/>
  <text x="100" y="255" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Sun</text>

  <!-- Venus orbit reference circle -->
  <ellipse cx="100" cy="210" rx="155" ry="155" fill="none" stroke="#8899aa" stroke-width="0.8" stroke-dasharray="4,6" opacity="0.4"/>
  <text x="258" y="168" fill="#8899aa" font-family="monospace" font-size="9">Venus</text>

  <!-- Orbit 1 — initial 2018, perihelion ~24M km -->
  <ellipse cx="252" cy="210" rx="152" ry="90" fill="none" stroke="#cc4444" stroke-width="1.5" opacity="0.7"/>
  <text x="408" y="196" fill="#cc4444" font-family="monospace" font-size="9">Orbit 2018</text>
  <text x="408" y="207" fill="#cc4444" font-family="monospace" font-size="9">~24M km</text>

  <!-- Orbit 2 — mid mission -->
  <ellipse cx="210" cy="210" rx="110" ry="72" fill="none" stroke="#ff8844" stroke-width="1.5" opacity="0.75"/>
  <text x="322" y="232" fill="#ff8844" font-family="monospace" font-size="9">~15M km</text>

  <!-- Orbit 3 — near final -->
  <ellipse cx="175" cy="210" rx="75" ry="52" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.8"/>
  <text x="252" y="250" fill="#7bb8ff" font-family="monospace" font-size="9">~9M km</text>

  <!-- Orbit 4 — final perihelion Dec 2024 -->
  <ellipse cx="148" cy="210" rx="48" ry="34" fill="none" stroke="#44ff88" stroke-width="2" opacity="0.9"/>
  <text x="198" y="271" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Final perihelion</text>
  <text x="198" y="282" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">Dec 2024</text>
  <text x="198" y="293" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">~6.16M km</text>

  <!-- Perihelion marker -->
  <circle cx="101" cy="210" r="4" fill="none" stroke="#44ff88" stroke-width="1.5"/>

  <!-- Venus gravity assist label -->
  <text x="265" y="58" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">7 Venus gravity</text>
  <text x="265" y="72" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">assists</text>
  <text x="265" y="100" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">2018 — 2024</text>

  <!-- Arrow indicating shrinkage direction -->
  <line x1="380" y1="210" x2="210" y2="210" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,4" opacity="0.5"/>
  <polygon points="210,206 218,210 210,214" fill="#aabbcc" opacity="0.5"/>

  <!-- Speed label -->
  <text x="530" y="140" fill="#44ff88" font-family="monospace" font-size="10">Speed at</text>
  <text x="530" y="153" fill="#44ff88" font-family="monospace" font-size="10">perihelion:</text>
  <text x="530" y="168" fill="#44ff88" font-family="monospace" font-size="11">692,000</text>
  <text x="530" y="181" fill="#44ff88" font-family="monospace" font-size="10">km/h</text>
  <text x="530" y="197" fill="#8899aa" font-family="monospace" font-size="9">fastest human-made</text>
  <text x="530" y="209" fill="#8899aa" font-family="monospace" font-size="9">object ever</text>

  <!-- Legend -->
  <line x1="430" y1="300" x2="460" y2="300" stroke="#cc4444" stroke-width="1.5"/>
  <text x="465" y="304" fill="#cc4444" font-family="monospace" font-size="9">initial orbit</text>
  <line x1="430" y1="316" x2="460" y2="316" stroke="#ff8844" stroke-width="1.5"/>
  <text x="465" y="320" fill="#ff8844" font-family="monospace" font-size="9">intermediate orbits</text>
  <line x1="430" y1="332" x2="460" y2="332" stroke="#44ff88" stroke-width="2"/>
  <text x="465" y="336" fill="#44ff88" font-family="monospace" font-size="9">final orbit</text>
</svg>`,
        caption:
          'Each Venus gravity assist reduced the perihelion — from 24 million kilometers in 2018 to 6.16 million in December 2024. The closer the perihelion, the faster the spacecraft moves at that point.',
      },
    },

    {
      heading: 'The Alfven surface: where the Sun ends',
      level: 2,
      paragraphs: [
        'Where exactly does the Sun end? There is no solid surface here: the Sun is superheated plasma ' +
        'that grades continuously into interplanetary space. ' +
        'Physicists defined a conceptual boundary — the _Alfven surface_ — as the region where ' +
        'the solar wind velocity exceeds the local speed of Alfven magnetohydrodynamic waves ' +
        'in that same plasma. Inside this boundary, the plasma is still "anchored" to the Sun ' +
        'and co-rotates with it. Outside, it has broken free as independent solar wind, ' +
        'flying outward and no longer able to transmit disturbances back to the star.',

        'In April 2021, the Parker Solar Probe crossed this boundary for the first time. ' +
        'For several hours the spacecraft was literally inside the solar atmosphere — ' +
        'in a region where the field and plasma are still governed by the star. ' +
        'That was humanity\'s first "touch" of the Sun. ' +
        'The probe subsequently crossed the Alfven surface many more times, ' +
        'building statistics and mapping its irregular, corrugated shape — ' +
        'it turned out to be far from a smooth sphere.',

        'Inside the Alfven surface, the instruments recorded _switchbacks_ — ' +
        'sudden, brief reversals of the magnetic field direction. ' +
        'These structures had been observed earlier from greater distances, ' +
        'but their origin remained unclear: did they form near the Sun, ' +
        'or did they develop during propagation of the wind? ' +
        'Parker data confirmed that switchbacks already exist in the corona and ' +
        'are likely one of the mechanisms by which energy is transferred from the surface outward.',
      ],
    },

    {
      image: {
        cacheKey: 'parker-solar-probe-alfven-surface',
        prompt:
          'Scientific illustration for a science encyclopedia showing the Alfven surface around the Sun. ' +
          'The Sun at center, surrounded by a glowing irregular sphere representing the Alfven surface — not a perfect sphere but lumpy and dynamic. ' +
          'Inside the Alfven surface: dense plasma shown in warm orange-gold, rotating with the Sun. ' +
          'Outside: cooler blue-white solar wind streaming outward in curved lines. ' +
          'The Parker Solar Probe shown as a tiny spacecraft crossing the boundary. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "Alfven surface", "solar corona", "solar wind", "Parker crossing 2021".',
        alt: 'The Alfven surface around the Sun — the irregular boundary between the corona and free solar wind, first crossed by Parker in 2021',
        caption:
          "The Alfven surface — the conceptual edge of the solar atmosphere. Inside, plasma co-rotates with the star; outside, it flies as independent solar wind. Parker first crossed this boundary in 2021 and did so many times afterward.",
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The corona problem: why the atmosphere is hotter than the surface',
      level: 2,
      paragraphs: [
        'The law of thermodynamics is simple: heat flows from hot to cold, not the other way. ' +
        'If the solar surface is around 5500 degrees Celsius, ' +
        'the atmosphere above it should be cooler. ' +
        'Instead, the corona is heated to one million degrees — ' +
        'and in some regions several million. ' +
        'This is not a violation of thermodynamics: the corona is being heated by some external mechanism, ' +
        'not simply receiving warmth from below. ' +
        'The question is: which mechanism?',

        'There are two main competing hypotheses, both of which are gaining support from Parker data. ' +
        'The first is **wave heating**: Alfven waves propagating along magnetic field lines ' +
        'from the photosphere into the corona deposit their energy there and heat the plasma. ' +
        'The switchbacks discovered by Parker may be signatures of precisely these waves — ' +
        'or more accurately, evidence of their dissipation.',

        'The second hypothesis is **nanoflares**: billions of microscopic magnetic reconnection events ' +
        'that occur continuously in the chromosphere and lower corona. ' +
        'Each reconnection releases a small amount of energy, ' +
        'but the cumulative effect of billions per second may be sufficient ' +
        'to sustain million-degree temperatures. ' +
        'Parker detected signatures of such structures on early orbits, ' +
        'and detailed mapping of the region during the final close passes ' +
        'will make it possible to distinguish between the mechanisms.',

        'Solving the corona problem will have consequences far beyond solar physics. ' +
        'Stars similar to the Sun exist virtually everywhere in the galaxy. ' +
        'Understanding how they heat their atmospheres means uncovering a mechanism ' +
        'that operates in trillions of stellar systems across the universe.',
      ],
    },

    {
      image: {
        cacheKey: 'parker-solar-probe-corona-heating',
        prompt:
          'Scientific illustration for a science encyclopedia of solar corona heating mechanisms. ' +
          'Two side-by-side panels: ' +
          'Left panel: Alfven wave heating — magnetic field lines emerging from Sun surface, with wave oscillations traveling upward along field lines into corona, dissipating energy shown as heat glow. ' +
          'Right panel: nanoflare reconnection — tangled magnetic field lines in chromosphere suddenly snapping and reconnecting, releasing energy bursts shown as tiny bright flashes. ' +
          'Hard sci-fi style, dark background, orange and cyan accent colors. ' +
          'Add the following text labels on the image: "Alfven wave heating", "nanoflare reconnection", "photosphere", "corona 1M+ C".',
        alt: 'Two mechanisms of solar corona heating: Alfven waves along magnetic field lines and nanoflare magnetic reconnection events',
        caption:
          'Competing corona heating mechanisms: wave-based (left) and nanoflare-based (right). Parker data supports both; it is likely that both operate simultaneously.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Solar wind: from hypothesis to mechanism',
      level: 2,
      paragraphs: [
        'Solar wind comes in two distinct flavors. The _fast wind_ — around 700 kilometers per second — ' +
        'flows from polar coronal holes, where magnetic field lines are open and straight. ' +
        'The _slow wind_ — around 400 kilometers per second — ' +
        'originates from equatorial regions and the streamer belt, ' +
        'but exactly how it forms and accelerates was poorly understood. ' +
        'Parker is the first spacecraft to operate inside the slow wind acceleration zone.',

        'The switchbacks found there turned out to be not random turbulence but structured. ' +
        'They resemble magnetic field lines that have folded back on themselves like a hairpin. ' +
        'When such a fold "straightens out," it accelerates plasma particles. ' +
        'This may be one of the key mechanisms driving the solar wind — ' +
        'the very process that Parker\'s namesake predicted the existence of, without being able to observe.',

        'The practical value of this knowledge extends well beyond academic interest. ' +
        'Solar wind, along with related flares and coronal mass ejections, ' +
        'affects the entire Solar System. ' +
        'It compresses Earth\'s magnetosphere, triggers geomagnetic storms, ' +
        'can disable satellites, and can disrupt electrical grids on the surface. ' +
        'Understanding the wind structure close to its source ' +
        'means better forecasting space weather and protecting technological infrastructure ' +
        'that modern civilization depends on.',
      ],
    },

    {
      heading: 'The person the spacecraft is named after',
      level: 2,
      paragraphs: [
        'When the probe lifted off in August 2018, Eugene Parker was 91 years old. ' +
        'He stood at the press site at Cape Canaveral and watched the rocket carry a spacecraft bearing his name into the sky. ' +
        'Parker Solar Probe became the first American spacecraft ever named after a living person — ' +
        'a precedent for an agency that had traditionally reserved such honors for scientists already deceased.',

        'Parker did not live to see the final perihelion of December 2024 — he died in 2022. ' +
        'But he did see his solar wind hypothesis, rejected by editors 65 years earlier, ' +
        'become confirmed fact. And he learned that the spacecraft named for him had ' +
        'first touched the Sun in 2021. ' +
        'Few scientific careers end with that kind of symmetry.',
      ],
    },

    {
      diagram: {
        title: 'Heat shield temperature gradient cross-section',
        svg: `<svg viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Heat shield: temperature gradient (cross-section)</text>

  <!-- Sun label on left -->
  <circle cx="38" cy="140" r="26" fill="#ff8844" opacity="0.8"/>
  <text x="38" y="144" fill="#020510" font-family="monospace" font-size="9" text-anchor="middle">Sun</text>
  <text x="38" y="182" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">~1370°C</text>
  <text x="38" y="193" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">shield</text>
  <text x="38" y="204" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">face</text>

  <!-- Outer ceramic coating -->
  <rect x="72" y="80" width="28" height="120" fill="#ff4400" opacity="0.9"/>
  <text x="86" y="73" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">ceramic</text>
  <text x="86" y="218" fill="#ff8844" font-family="monospace" font-size="8" text-anchor="middle">~1370°C</text>

  <!-- Carbon foam layer -->
  <rect x="100" y="80" width="180" height="120" fill="url(#heatGradEn)" opacity="0.9"/>
  <defs>
    <linearGradient id="heatGradEn" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#cc4444" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#334455" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <text x="190" y="73" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">carbon foam (11.4 cm)</text>
  <text x="140" y="218" fill="#cc4444" font-family="monospace" font-size="8" text-anchor="middle">600°C</text>
  <text x="240" y="218" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">100°C</text>

  <!-- Inner carbon face -->
  <rect x="280" y="80" width="22" height="120" fill="#334455" opacity="0.9"/>
  <text x="291" y="73" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">carbon</text>
  <text x="291" y="218" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">~50°C</text>

  <!-- Gap / shadow zone -->
  <rect x="302" y="80" width="16" height="120" fill="rgba(10,15,25,0.3)" opacity="0.5"/>

  <!-- Instruments bay -->
  <rect x="318" y="72" width="200" height="136" fill="rgba(68,136,170,0.15)" stroke="#4488aa" stroke-width="1.5" rx="4"/>
  <text x="418" y="108" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">Instrument bay</text>
  <text x="418" y="128" fill="#44ff88" font-family="monospace" font-size="18" text-anchor="middle">+30°C</text>
  <text x="418" y="152" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">fully operational</text>
  <text x="418" y="166" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">magnetometers, plasma</text>
  <text x="418" y="180" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">and electric field probes</text>
  <text x="418" y="218" fill="#44ff88" font-family="monospace" font-size="8" text-anchor="middle">+30°C</text>

  <!-- Temperature scale arrow -->
  <line x1="72" y1="248" x2="516" y2="248" stroke="#334455" stroke-width="1"/>
  <polygon points="72,244 62,248 72,252" fill="#ff8844" opacity="0.8"/>
  <polygon points="516,244 526,248 516,252" fill="#7bb8ff" opacity="0.8"/>
  <text x="72" y="264" fill="#ff8844" font-family="monospace" font-size="9">hot</text>
  <text x="516" y="264" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="end">cold</text>
  <text x="294" y="264" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">temperature gradient across 11.4 cm</text>
</svg>`,
        caption:
          "The Parker Solar Probe heat shield: 11.4 centimeters of carbon foam between 1370 degrees Celsius on the outside and 30 degrees inside the instrument bay. That difference is greater than between room temperature and the melting point of aluminum.",
      },
    },

    {
      heading: 'Instruments and discoveries',
      level: 2,
      paragraphs: [
        'Parker carries four instrument suites. The Integrated Science Investigation of the Sun — ' +
        'Energetic Particle Instruments measures the properties of plasma in situ — ' +
        'directly in the medium through which the spacecraft flies. ' +
        'The Wide-Field Imager for Solar Probe tracks the structure of the corona and streamers optically. ' +
        'A radio frequency spectrometer records plasma oscillations. ' +
        'Neutral and charged particles are measured by dedicated detectors.',

        'Among the discoveries from the early orbits: the slow solar wind was found ' +
        'to resemble the fast wind in magnetic texture — both share similar field structure, ' +
        'suggesting a common origin. This contradicted earlier models. ' +
        'Parker also found that the Sun rotates significantly faster in the wind acceleration zone ' +
        'than predicted — magnetic fields transfer angular momentum from star to wind ' +
        'more efficiently than previously thought.',

        'Data gathered during the final perihelion and subsequent orbits will take several years to fully analyze. ' +
        'A complete picture of what Parker observed inside the corona during its closest encounters ' +
        'is not yet assembled. This is normal for pioneer missions: ' +
        'the most valuable discoveries often emerge not immediately after the fact, ' +
        'but after sustained analysis by the scientific community.',
      ],
    },

    {
      image: {
        cacheKey: 'parker-solar-probe-switchbacks',
        prompt:
          'Scientific visualization for a science encyclopedia of solar wind switchbacks detected by the Parker Solar Probe. ' +
          'Abstract visualization of magnetic field lines in the solar corona: most lines stream outward from the Sun in smooth curves, ' +
          'but several show sudden S-shaped reversals — the switchbacks — where the field line doubles back on itself before continuing outward. ' +
          'Plasma particles shown as tiny dots being accelerated along and past the switchback folds. ' +
          'Hard sci-fi style, deep space dark background, cyan and orange magnetic field lines. ' +
          'Add the following text labels on the image: "outward solar wind", "switchback fold", "magnetic field line", "particle acceleration".',
        alt: 'Solar wind switchbacks — sudden reversals of magnetic field direction detected by the Parker Solar Probe in the solar corona',
        caption:
          'Switchbacks: magnetic field lines that abruptly reverse direction before resuming their outward path. Parker confirmed that they exist already in the corona, and they may be a key mechanism in solar wind acceleration.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Perihelion',
      definition:
        "The closest point in an elliptical orbit to the Sun. At perihelion, orbital speed is at its maximum. For the Parker Solar Probe, the final perihelion in December 2024 was just over 6.16 million kilometers from the solar center — the closest any spacecraft has ever come to a star.",
    },
    {
      term: 'Corona',
      definition:
        'The outer atmosphere of the Sun, visible during total solar eclipses as a bright halo around the disk. Its temperature reaches one to several million degrees Celsius — far higher than the visible surface. The mechanism responsible for this heating is one of the central open problems in solar physics.',
    },
    {
      term: 'Alfven surface',
      definition:
        'A conceptual boundary in the solar atmosphere where the solar wind velocity exceeds the local speed of Alfven waves in the plasma. Inside this boundary, plasma co-rotates with the Sun; outside, it becomes independent solar wind. Parker first crossed this boundary in 2021.',
    },
    {
      term: 'Switchbacks',
      definition:
        'Structures in the solar wind where the magnetic field direction suddenly reverses and then recovers — resembling a folded hairpin. Discovered by Parker Solar Probe, they likely contribute to the acceleration of the solar wind and the heating of the corona.',
    },
    {
      term: 'Solar wind',
      definition:
        "A continuous outward flow of charged particles — primarily electrons and protons — emitted by the Sun in all directions through the Solar System. Its existence was theoretically predicted by Eugene Parker in 1958 and confirmed by early spacecraft measurements shortly after.",
    },
    {
      term: 'Gravity assist',
      definition:
        "A technique for changing a spacecraft's speed and direction by flying close to a planet, borrowing a portion of its orbital momentum without expending propellant. Parker used seven Venus gravity assists to progressively reduce its orbital perihelion over six years.",
    },
    {
      term: 'Photosphere',
      definition:
        "The visible 'surface' of the Sun — the plasma layer from which most visible light is emitted. The photosphere temperature is roughly 5500 degrees Celsius. This is far cooler than the corona above it.",
    },
    {
      term: 'Nanoflares',
      definition:
        'Hypothetical microscopic magnetic reconnection events occurring in the chromosphere and lower corona at a rate of billions per second. Each nanoflare releases a small amount of energy, but their collective effect may sustain the million-degree temperatures of the corona.',
    },
    {
      term: 'Coronal mass ejection',
      definition:
        "A large eruption of plasma and magnetic field from the solar corona, capable of reaching Earth and triggering geomagnetic storms. The Parker Solar Probe measured such ejections from within the corona for the first time, providing new data for space weather forecasting.",
    },
  ],

  quiz: [
    {
      question: 'Why is approaching the Sun far more difficult than reaching Mars, despite the much shorter distance?',
      options: [
        "Because the Sun's enormously strong gravity pulls the spacecraft directly toward the surface",
        'Because a spacecraft launched from Earth inherits a large angular momentum that must be canceled to fall closer to the Sun',
        'Because there is no planet near the Sun to use for a gravity assist maneuver',
        'Because the strong solar magnetic field deflects the spacecraft off course',
      ],
      correctIndex: 1,
      explanation:
        'Earth orbits the Sun at roughly 30 kilometers per second, and any spacecraft inherits that velocity. To approach the Sun, most of that velocity must be removed — a task requiring far more propellant than a Mars mission. Parker solved this through seven Venus gravity assists spread over six years.',
    },
    {
      question: 'What is the Alfven surface, and why was crossing it in 2021 considered significant?',
      options: [
        "It is the solid surface of the Sun at one million degrees Celsius, which Parker photographed for the first time",
        'It is the conceptual boundary between the solar atmosphere and free solar wind, which Parker crossed to first "touch" the Sun',
        'It is the layer where the solar magnetic field becomes zero and the spacecraft can move without interference',
        'It is the boundary between the visible solar surface and the corona, crossed during the final perihelion',
      ],
      correctIndex: 1,
      explanation:
        'The Alfven surface is where the solar wind velocity exceeds the local Alfven wave speed. Inside it, plasma still co-rotates with the Sun; outside, it is free solar wind. Crossing it in 2021, Parker entered the region where plasma is still governed by the Sun — the first time any human-made object entered a stellar atmosphere.',
    },
    {
      question: 'What is the "corona problem" and why has it remained unsolved for so long?',
      options: [
        'The corona is cooler than the photosphere, contrary to what thermodynamics would predict',
        'The corona is far hotter than the visible surface, which violates the expectation that temperature should fall with distance from a heat source',
        'The corona is composed entirely of dark matter that cannot be directly observed',
        'The corona temperature is uniform everywhere, which contradicts the laws of heat conduction',
      ],
      correctIndex: 1,
      explanation:
        "The solar photosphere is roughly 5500 degrees Celsius, yet the corona above it reaches one million degrees or more. Heat should flow from hot to cold, so simple conduction from the surface cannot explain it. There must be an external heating mechanism — wave-based or related to nanoflares — and identifying it has been an open problem since the mid-twentieth century.",
    },
    {
      question: 'What speed did the Parker Solar Probe reach during its final perihelion in December 2024?',
      options: [
        'Approximately 70,000 kilometers per hour — the speed of a typical interplanetary probe',
        'Approximately 200,000 kilometers per hour — twice the previous record',
        'Approximately 692,000 kilometers per hour — the highest speed ever achieved by a human-made object',
        'Approximately one million kilometers per hour — nearly one percent of the speed of light',
      ],
      correctIndex: 2,
      explanation:
        'Roughly 692,000 kilometers per hour is the absolute speed record for any human-made object. For comparison, the International Space Station orbits at about 28,000 kilometers per hour. The high perihelion speed is a direct consequence of orbital mechanics: the closer to the Sun, the faster the spacecraft must travel to maintain its orbit.',
    },
    {
      question: 'What are switchbacks and what do Parker Solar Probe findings tell us about the solar wind?',
      options: [
        'Artificial beacons placed around the Sun for spacecraft navigation',
        'Structures in the solar wind where the magnetic field abruptly reverses direction, likely connected to the mechanism accelerating the wind',
        'Data anomalies caused by radiation damage to Parker instruments',
        'Slow gravitational waves from solar flares propagating through the heliosphere',
      ],
      correctIndex: 1,
      explanation:
        'Switchbacks are solar wind structures where magnetic field lines sharply reverse direction and then recover. Parker confirmed that they exist already in the corona, suggesting they are formed near the solar surface rather than during propagation. They are likely tied to the wave or reconnection processes that heat the corona and drive the solar wind outward.',
    },
  ],

  sources: [
    {
      title: 'NASA — Parker Solar Probe Mission Overview',
      url: 'https://science.nasa.gov/mission/parker-solar-probe/',
      meta: 'NASA official mission site, updated 2024',
    },
    {
      title: 'Kasper J. et al. — Parker Solar Probe Enters the Magnetically Dominated Solar Corona (Science 2021)',
      url: 'https://www.science.org/doi/10.1126/science.abj0983',
      meta: 'Science, 2021, open access',
    },
    {
      title: 'Bale S.D. et al. — Highly structured slow solar wind emerging from an equatorial coronal hole (Nature 2019)',
      url: 'https://www.nature.com/articles/s41586-019-1818-7',
      meta: 'Nature, 2019',
    },
    {
      title: 'Dudok de Wit T. et al. — Switchbacks in the Near-Sun Magnetic Field (ApJS 2020)',
      url: 'https://iopscience.iop.org/article/10.3847/1538-4365/ab5853',
      meta: 'Astrophysical Journal Supplement Series, 2020, open access',
    },
    {
      title: 'Parker E.N. — Dynamics of the Interplanetary Gas and Magnetic Fields (ApJ 1958)',
      url: 'https://ui.adsabs.harvard.edu/abs/1958ApJ...128..664P',
      meta: 'Astrophysical Journal, 1958 — original solar wind hypothesis',
    },
    {
      title: 'APL Johns Hopkins — Parker Solar Probe Mission Site',
      url: 'https://parkersolarprobe.jhuapl.edu/',
      meta: 'Applied Physics Laboratory, official mission site',
    },
    {
      title: 'Raouafi N.E. et al. — Parker Solar Probe: Four Years of Discoveries at the Sun (Space Sci. Rev. 2023)',
      url: 'https://link.springer.com/article/10.1007/s11214-023-00952-4',
      meta: 'Space Science Reviews, 2023, open access',
    },
    {
      title: 'NASA — Parker Solar Probe Survives Record-Setting Closest Pass by the Sun (December 2024)',
      url: 'https://blogs.nasa.gov/parkersolarprobe/2024/12/24/nasas-parker-solar-probe-survives-record-setting-closest-pass-by-the-sun/',
      meta: 'NASA blog, December 2024',
    },
    {
      title: 'ESA — Space Weather: Understanding the Sun-Earth connection',
      url: 'https://www.esa.int/Space_Safety/Space_weather',
      meta: 'ESA, open access',
    },
    {
      title: 'Vourlidas A. et al. — The Wide-Field Imager for Solar Probe Plus (WISPR) (Space Sci. Rev. 2016)',
      url: 'https://link.springer.com/article/10.1007/s11214-014-0114-y',
      meta: 'Space Science Reviews, 2016 — wide-field imager instrument description',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
