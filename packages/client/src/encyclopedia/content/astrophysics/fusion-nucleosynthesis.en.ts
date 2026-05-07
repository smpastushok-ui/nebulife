import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'fusion-nucleosynthesis',
  language: 'en',
  section: 'astrophysics',
  order: 10,
  difficulty: 'advanced',
  readingTimeMin: 12,
  title: 'Stellar Fusion and Nucleosynthesis',
  subtitle: 'How stars forge elements from hydrogen to iron — and why gold is born not in stars but in colliding neutron stars.',

  hero: {
    cacheKey: 'fusion-nucleosynthesis-hero',
    prompt:
      'Photorealistic scientific illustration of stellar nucleosynthesis: a cutaway cross-section of a massive star showing concentric fusion shells labeled from center outward — iron core, silicon burning, oxygen burning, neon, carbon, helium, hydrogen — each shell glowing in a different color from white-hot center to cooler outer layers. ' +
      'Deep space background outside the star. Hard sci-fi style scientific illustration. ' +
      'Add the following text labels on the image: "iron core", "silicon shell", "oxygen shell", "carbon shell", "helium shell", "hydrogen envelope".',
    alt: 'Cross-section of a massive star with concentric thermonuclear burning shells from the iron core to the hydrogen envelope',
    caption:
      'A mature red supergiant resembles an onion: each shell burns its own fuel. At the center lies a dead iron core, surrounded by shells of silicon, oxygen, carbon, helium, and hydrogen burning.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Every calcium atom in your bones, every oxygen atom in your blood, every iron atom in your hemoglobin ' +
        'once lived inside a star. Not metaphor, not poetic imagery — a literal fact of nuclear physics. ' +
        'Stars are the only places in the universe where temperatures and pressures are sufficient to fuse ' +
        'atomic nuclei together, converting lighter elements into heavier ones. ' +
        'This process is called **nucleosynthesis**.',

        'After the Big Bang, the universe contained almost exclusively hydrogen and helium, ' +
        'with a trace of lithium. Every other element in the periodic table — from carbon to uranium — ' +
        'appeared later: inside stars, in supernova explosions, and, as the twenty-first century revealed, ' +
        'in collisions between neutron stars. The chain from hydrogen to gold spans billions of years, ' +
        'generations of stars, and the extreme violent endings of their lives.',

        'In the middle of the twentieth century, four scientists — Margaret and Geoffrey Burbidge, ' +
        'William Fowler, and Fred Hoyle — published a paper that systematically described ' +
        'the synthesis of elements in stars. That paper is conventionally referred to as ' +
        '"Burbidge-Burbidge-Fowler-Hoyle" (after the authors\' initials), and it remains ' +
        'one of the most cited documents in astrophysics.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-pp-chain',
        prompt:
          'Scientific diagram of the proton-proton chain reaction in the Sun: step-by-step nuclear reaction sequence showing two protons fusing to form deuterium, then helium-3, then helium-4, with gamma rays and neutrinos emitted at each step. ' +
          'Particles shown as labeled colored circles: protons red, neutrons blue, neutrinos green, gamma yellow. ' +
          'Dark space background, hard sci-fi style, monospace labels. ' +
          'Add the following text labels on the image: "proton", "deuterium", "helium-3", "helium-4", "neutrino", "gamma ray", "energy released".',
        alt: 'Diagram of the proton-proton chain: sequence of nuclear reactions from protons to helium-4 with neutrino and gamma-ray emission',
        caption: 'The proton-proton chain is the primary energy source in the Sun and all stars up to about 1.3 solar masses. Four protons are converted into one helium-4 nucleus, two positrons, two neutrinos, and gamma rays.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Two Paths to Helium',
      level: 2,
      paragraphs: [
        'Thermonuclear fusion in stars is a game of probabilities. Nuclei with the same charge repel ' +
        'each other electromagnetically, and only the quantum tunneling effect allows them to approach ' +
        'closely enough for the strong nuclear force to take hold. At temperatures around ten to fifteen ' +
        'million degrees Celsius — typical of the Sun\'s core — this happens often enough to sustain the star.',

        'For stars with a mass up to roughly 1.3 times that of the Sun, the dominant process is the ' +
        '**proton-proton chain**: two protons fuse into deuterium, deuterium combines with a proton to give ' +
        'helium-3, and two helium-3 nuclei merge to form helium-4 and two free protons. ' +
        'Four protons in, one helium-4 nucleus out. ' +
        'The difference in mass, multiplied by the square of the speed of light, is the energy ' +
        'that warms our planet.',

        'For more massive stars — starting at roughly 1.3 solar masses — the ' +
        '**carbon-nitrogen-oxygen cycle** dominates: carbon-12 acts as a catalyst, ' +
        'sequentially accepting and returning protons through intermediate nitrogen and oxygen nuclei. ' +
        'The net result is identical — four protons become one helium-4. ' +
        'But the carbon-nitrogen-oxygen cycle is extraordinarily temperature-sensitive: ' +
        'its rate scales approximately as the seventeenth power of temperature. ' +
        'This is why massive hot stars burn far more intensely than the Sun ' +
        'and live hundreds of times shorter.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-cno-cycle',
        prompt:
          'Scientific diagram of the carbon-nitrogen-oxygen cycle: circular reaction sequence showing carbon-12 nucleus as catalyst, sequential proton capture steps producing nitrogen-13, carbon-13, nitrogen-14, oxygen-15, nitrogen-15, and releasing helium-4 plus positrons and neutrinos. ' +
          'Circular layout with arrows, particles as labeled colored dots, dark background. Hard sci-fi style, monospace labels. ' +
          'Add the following text labels on the image: "C-12 catalyst", "N-13", "C-13", "N-14", "O-15", "N-15", "He-4 released", "proton input".',
        alt: 'Diagram of the carbon-nitrogen-oxygen cycle: carbon-12 as catalyst sequentially absorbing protons and releasing helium-4',
        caption: 'The carbon-nitrogen-oxygen cycle dominates in stars more massive than about 1.3 solar masses. The carbon-12 nucleus acts as a catalyst and emerges unchanged after each cycle — it only accelerates the reaction.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Helium Flash and the Triple-Alpha Reaction',
      level: 2,
      paragraphs: [
        'When a star\'s hydrogen supply in the core runs out, gravity compresses the core, ' +
        'heating it to roughly one hundred million degrees. At this temperature, ' +
        'a new reaction ignites — the **triple-alpha reaction**: three helium-4 nuclei ' +
        '(traditionally called "alpha particles" in physics) fuse into a single carbon-12 nucleus.',

        'This reaction has a remarkable story. The direct fusion of two helium-4 nuclei produces ' +
        'unstable beryllium-8, which decays in an extremely brief time. ' +
        'But if a third helium-4 nucleus is present at exactly that moment, a further fusion can occur, ' +
        'yielding carbon-12. In the nineteen-fifties, Fred Hoyle predicted that carbon-12 must possess ' +
        'a specific excited energy level for this reaction to proceed at a meaningful rate — ' +
        'otherwise carbon would be far too rare to make life possible. ' +
        'Experimentalists checked, and the energy level existed exactly as predicted. ' +
        'It remains one of the most striking examples of theoretical prediction confirmed in the laboratory.',

        'Stars similar to the Sun enter this phase as red giants. The helium core suddenly ignites — ' +
        'the so-called "helium flash" — and then stabilizes. The star burns helium into carbon and oxygen ' +
        'for hundreds of millions of years before shedding its outer layers as a planetary nebula, ' +
        'leaving behind a white dwarf.',
      ],
    },

    {
      diagram: {
        title: 'Nuclear binding energy curve: binding energy per nucleon',
        svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="60" y1="260" x2="640" y2="260" stroke="#334455" stroke-width="1.5"/>
  <line x1="60" y1="260" x2="60" y2="20" stroke="#334455" stroke-width="1.5"/>

  <!-- Axis labels -->
  <text x="350" y="290" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle">Mass number (number of nucleons)</text>
  <text x="18" y="145" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle" transform="rotate(-90 18 145)">Binding energy (MeV/nucleon)</text>

  <!-- Binding energy curve -->
  <polyline
    points="65,240 80,160 100,110 125,80 160,62 200,52 240,48 280,46 320,45 360,45.5 400,46 440,47 480,49 520,52 560,56 600,62 635,68"
    fill="none" stroke="#44ff88" stroke-width="2.5"/>

  <!-- Iron-56 peak marker -->
  <line x1="320" y1="45" x2="320" y2="260" stroke="#ff8844" stroke-width="1" stroke-dasharray="5,4"/>
  <circle cx="320" cy="45" r="5" fill="#ff8844"/>
  <text x="322" y="38" fill="#ff8844" font-family="monospace" font-size="10">Fe-56</text>
  <text x="322" y="28" fill="#ff8844" font-family="monospace" font-size="10">stability peak</text>

  <!-- Helium-4 marker -->
  <circle cx="100" cy="110" r="4" fill="#7bb8ff"/>
  <text x="85" y="100" fill="#7bb8ff" font-family="monospace" font-size="10">He-4</text>

  <!-- Carbon-12 marker -->
  <circle cx="155" cy="63" r="4" fill="#7bb8ff"/>
  <text x="140" y="56" fill="#7bb8ff" font-family="monospace" font-size="10">C-12</text>

  <!-- Oxygen-16 marker -->
  <circle cx="190" cy="54" r="4" fill="#7bb8ff"/>
  <text x="174" y="46" fill="#7bb8ff" font-family="monospace" font-size="10">O-16</text>

  <!-- Silicon-28 marker -->
  <circle cx="250" cy="47" r="4" fill="#7bb8ff"/>
  <text x="234" y="40" fill="#7bb8ff" font-family="monospace" font-size="10">Si-28</text>

  <!-- Uranium marker -->
  <circle cx="620" cy="63" r="4" fill="#cc4444"/>
  <text x="590" y="78" fill="#cc4444" font-family="monospace" font-size="10">U-238</text>

  <!-- H marker -->
  <circle cx="68" cy="238" r="4" fill="#aabbcc"/>
  <text x="70" y="252" fill="#aabbcc" font-family="monospace" font-size="10">H</text>

  <!-- Fusion arrow (left of iron peak) -->
  <line x1="180" y1="200" x2="300" y2="200" stroke="#44ff88" stroke-width="1.2" marker-end="url(#arr-fn-en)"/>
  <text x="185" y="195" fill="#44ff88" font-family="monospace" font-size="10">fusion releases energy</text>

  <!-- Fission arrow (right of iron peak) -->
  <line x1="450" y1="220" x2="350" y2="220" stroke="#cc4444" stroke-width="1.2" marker-end="url(#arr-fn-en)"/>
  <text x="368" y="215" fill="#cc4444" font-family="monospace" font-size="10">fission releases energy</text>

  <!-- Y-axis ticks -->
  <text x="52" y="260" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">0</text>
  <text x="52" y="200" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">2</text>
  <text x="52" y="140" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">5</text>
  <text x="52" y="80" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">8</text>
  <text x="52" y="48" fill="#667788" font-family="monospace" font-size="9" text-anchor="end">8.8</text>
  <line x1="56" y1="48" x2="64" y2="48" stroke="#334455" stroke-width="1"/>
  <line x1="56" y1="80" x2="64" y2="80" stroke="#334455" stroke-width="1"/>
  <line x1="56" y1="140" x2="64" y2="140" stroke="#334455" stroke-width="1"/>
  <line x1="56" y1="200" x2="64" y2="200" stroke="#334455" stroke-width="1"/>

  <!-- X-axis ticks -->
  <text x="100" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">4</text>
  <text x="155" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">12</text>
  <text x="250" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">28</text>
  <text x="320" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">56</text>
  <text x="480" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">120</text>
  <text x="620" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">238</text>

  <defs>
    <marker id="arr-fn-en" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'The nuclear binding energy curve shows energy per nucleon for all known nuclei. Iron-56 sits at the peak — it is the most tightly bound nucleus. To the left of iron, fusion releases energy; to the right, only fission does. This is precisely why stellar fusion halts at iron.',
      },
    },

    {
      heading: 'Advanced Burning: From Carbon to Iron',
      level: 2,
      paragraphs: [
        'Massive stars — those weighing roughly eight solar masses or more — do not stop at helium. ' +
        'After helium burning concludes, gravity again compresses the core, driving temperatures ' +
        'to even greater extremes. A sequence of heavier reactions begins: ' +
        '**carbon burning**, **neon burning**, **oxygen burning**, ' +
        'and finally **silicon burning**.',

        'Silicon burning is not straightforward fusion. At temperatures around three to four billion ' +
        'degrees, gamma-ray photons carry enough energy to photodisintegrate nuclei back into ' +
        'alpha particles. A dynamic equilibrium of destruction and fusion ensues — ' +
        'called "nuclear statistical equilibrium burning." The result is an accumulation of ' +
        'iron-group elements: iron, nickel, cobalt. This is where the thermonuclear road ends.',

        'Why iron? Because the iron-56 nucleus is the most tightly bound nuclear configuration — ' +
        'it contains more binding energy per nucleon than any other nucleus. ' +
        'Fusing two iron nuclei requires energy rather than releasing it. ' +
        'When an iron core accumulates at the heart of the star, it can no longer generate ' +
        'the pressure needed to resist gravity. In a fraction of a second, ' +
        'the massive star collapses and explodes as a **supernova**.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-onion-shell',
        prompt:
          'Photorealistic scientific illustration of a massive red supergiant star with a cutaway cross-section revealing concentric burning shells: innermost iron core (gray), surrounded by silicon burning (orange glow), oxygen burning (yellow), neon burning (blue-white), carbon burning (cyan), helium burning (green), and outermost hydrogen envelope (dim red). ' +
          'Each layer clearly distinct in color and size. Dark space background. Hard sci-fi style. ' +
          'Add the following text labels on the image: "iron core", "Si burning", "O burning", "Ne burning", "C burning", "He burning", "H envelope".',
        alt: 'Cross-section of a red supergiant with burning shells from iron core to hydrogen envelope',
        caption: 'Just before a supernova, a massive star builds an onion-like structure. Each shell burns its own fuel simultaneously. Silicon burning in the innermost shell may last only a few days — while the hydrogen envelope has been burning for millions of years.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Slow and Rapid Neutron Capture',
      level: 2,
      paragraphs: [
        'Nuclear fusion can reach iron. But how do heavier elements form — ' +
        'lead, gold, platinum, uranium? The answer is neutrons. ' +
        'Neutrons carry no charge, so they face no electromagnetic barrier ' +
        'and penetrate nuclei with ease.',

        'The first mechanism is the **slow neutron capture process** (the "s-process"). ' +
        'A nucleus captures a neutron, becomes heavier, and if unstable, ' +
        'has time to undergo beta decay to a stable isotope before capturing the next neutron. ' +
        'This process occurs in **asymptotic giant branch stars** — ' +
        'mature stars similar to our Sun during the final phase of shell helium burning. ' +
        'It produces most of the isotopes between iron and lead.',

        'The second mechanism is the **rapid neutron capture process** (the "r-process"). ' +
        'A nucleus captures neutrons so quickly that it accumulates very large mass numbers ' +
        'before beta decay can "correct" the neutron excess. ' +
        'The neutron fluxes required are billions of times higher than anything found inside stars. ' +
        'For decades it was assumed that supernovae might provide such conditions, ' +
        'but quantitative models never quite converged. ' +
        'The answer arrived in August 2017: gravitational-wave detectors registered the merger ' +
        'of two neutron stars — the event was designated GW170817. ' +
        'Two seconds later came a gamma-ray burst. In the days that followed, a kilonova: ' +
        'an optical transient whose spectrum contained spectroscopic signatures of strontium isotopes. ' +
        'This was the first direct proof: **gold, platinum, and most heavy radioactive elements ' +
        'are born in neutron star mergers**.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-neutron-star-merger',
        prompt:
          'Photorealistic scientific illustration of two neutron stars merging: two dense gray-white spheres spiraling toward each other, surrounded by jets of matter being ejected at relativistic speeds, glowing debris disk forming around the merger site, gamma-ray burst depicted as two bright beams shooting outward along the rotation axis, kilonova optical glow in orange-red expanding outward. ' +
          'Deep black space background. Hard sci-fi style. ' +
          'Add the following text labels on the image: "neutron star 1", "neutron star 2", "r-process elements ejected", "gamma-ray burst", "kilonova glow", "gold and platinum formed".',
        alt: 'Merger of two neutron stars: spiral inspiral, matter ejection with r-process nucleosynthesis, gamma-ray burst, and kilonova',
        caption: 'GW170817 in 2017 was the first confirmed neutron star merger detected simultaneously in gravitational waves and electromagnetic radiation. Strontium isotopes were identified in the ejected material — a direct signature of rapid neutron capture.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Cosmic Origin of the Elements',
      level: 2,
      paragraphs: [
        'Modern astrophysics gives clear answers to the question: where exactly did each element ' +
        'in the periodic table come from?',

        '**Hydrogen and helium** formed during the Big Bang — in the first few minutes of ' +
        'the hot expanding universe, in a process called primordial nucleosynthesis. ' +
        'Small amounts of lithium-7 also emerged at that time. ' +
        'After that, the universe expanded and cooled too quickly ' +
        'for any heavier nuclei to form.',

        '**From carbon through iron** is synthesized inside stars — through the proton-proton chain, ' +
        'the carbon-nitrogen-oxygen cycle, the triple-alpha reaction, and sequential stages of ' +
        'advanced burning. When a star dies — exploding as a supernova or shedding its envelope ' +
        'as a planetary nebula — the synthesized elements disperse into the interstellar medium ' +
        'and become material for new stars, planets, and ultimately living organisms.',

        '**From cobalt through lead** — primarily through slow neutron capture in asymptotic giant branch stars, ' +
        'supplemented by contributions from supernovae.',

        '**Gold, platinum, iridium, and most heavy radioactive elements** — ' +
        'predominantly products of rapid neutron capture in neutron star mergers. ' +
        'Each such event produces an enormous quantity of these elements — ' +
        'calculations suggest a single merger may create more gold than the Moon\'s mass. ' +
        'But such mergers are rare: in our Galaxy, they occur roughly once every few tens of thousands of years.',

        'Stellar nucleosynthesis is therefore not a single reaction or a single location, ' +
        'but an entire network of processes distributed across time and space. ' +
        'The atoms in your body traveled through several generations of stars and, ' +
        'at minimum, one neutron star merger — before arriving in you.',
      ],
    },

    {
      diagram: {
        title: 'Periodic table: cosmic origin of the elements',
        svg: `<svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Legend -->
  <rect x="30" y="18" width="14" height="10" fill="#7bb8ff" rx="2"/>
  <text x="48" y="27" fill="#aabbcc" font-family="monospace" font-size="10">Big Bang (H, He, Li)</text>

  <rect x="30" y="34" width="14" height="10" fill="#44ff88" rx="2"/>
  <text x="48" y="43" fill="#aabbcc" font-family="monospace" font-size="10">Stars — fusion (C to Fe)</text>

  <rect x="30" y="50" width="14" height="10" fill="#ff8844" rx="2"/>
  <text x="48" y="59" fill="#aabbcc" font-family="monospace" font-size="10">Stars — slow neutron capture (Co to Pb)</text>

  <rect x="30" y="66" width="14" height="10" fill="#cc4444" rx="2"/>
  <text x="48" y="75" fill="#aabbcc" font-family="monospace" font-size="10">Neutron star mergers — rapid neutron capture (Au, Pt, U...)</text>

  <rect x="30" y="82" width="14" height="10" fill="#8899aa" rx="2"/>
  <text x="48" y="91" fill="#aabbcc" font-family="monospace" font-size="10">Supernovae / mixed sources</text>

  <!-- Simplified periodic table rows -->
  <!-- Row 1 -->
  <rect x="30" y="105" width="18" height="16" fill="#7bb8ff" rx="2"/>
  <text x="39" y="117" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">H</text>
  <rect x="652" y="105" width="18" height="16" fill="#7bb8ff" rx="2"/>
  <text x="661" y="117" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">He</text>

  <!-- Row 2 -->
  <rect x="30" y="123" width="18" height="16" fill="#7bb8ff" rx="2"/>
  <text x="39" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Li</text>
  <rect x="50" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="59" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Be</text>
  <rect x="562" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="571" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">B</text>
  <rect x="582" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="591" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">C</text>
  <rect x="602" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="611" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">N</text>
  <rect x="622" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="631" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">O</text>
  <rect x="642" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="651" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">F</text>
  <rect x="662" y="123" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="671" y="135" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ne</text>

  <!-- Row 3 -->
  <rect x="30" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="39" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Na</text>
  <rect x="50" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="59" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Mg</text>
  <rect x="562" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="571" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Al</text>
  <rect x="582" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="591" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Si</text>
  <rect x="602" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="611" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">P</text>
  <rect x="622" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="631" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">S</text>
  <rect x="642" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="651" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Cl</text>
  <rect x="662" y="141" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="671" y="153" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ar</text>

  <!-- Row 4 transition metals -->
  <rect x="30" y="159" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="39" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">K</text>
  <rect x="50" y="159" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="59" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ca</text>
  <rect x="90" y="159" width="18" height="16" fill="#44ff88" rx="2"/>
  <text x="99" y="171" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Sc-Mn</text>
  <!-- Fe, Co, Ni — iron peak -->
  <rect x="110" y="159" width="18" height="16" fill="#ff8844" rx="2" stroke="#ff8844" stroke-width="1.5"/>
  <text x="119" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Fe</text>
  <rect x="130" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="139" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Co</text>
  <rect x="150" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="159" y="171" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Ni</text>
  <rect x="170" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="179" y="171" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Cu-Zn</text>
  <rect x="562" y="159" width="18" height="16" fill="#ff8844" rx="2"/>
  <text x="571" y="171" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Ga-Kr</text>

  <!-- Row 5 -->
  <rect x="30" y="177" width="200" height="16" fill="#ff8844" rx="2"/>
  <text x="130" y="189" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle">Rb — Sn (slow neutron capture)</text>
  <rect x="562" y="177" width="118" height="16" fill="#ff8844" rx="2"/>
  <text x="621" y="189" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle">Sb — Xe</text>

  <!-- Row 6 -->
  <rect x="30" y="195" width="200" height="16" fill="#ff8844" rx="2"/>
  <text x="130" y="207" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle">Cs to Ba, La (slow neutron capture)</text>
  <rect x="232" y="195" width="112" height="16" fill="#cc4444" rx="2"/>
  <text x="288" y="207" fill="#fff" font-family="monospace" font-size="7" text-anchor="middle">Hf to Pb (mixed)</text>
  <rect x="346" y="195" width="180" height="16" fill="#cc4444" rx="2"/>
  <text x="436" y="207" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Bi to Rn — NS mergers</text>

  <!-- Row 7 -->
  <rect x="30" y="213" width="250" height="16" fill="#cc4444" rx="2"/>
  <text x="155" y="225" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Fr, Ra — radioactive heavy nuclei (NS mergers)</text>
  <rect x="282" y="213" width="200" height="16" fill="#cc4444" rx="2"/>
  <text x="382" y="225" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Ac, Th, U, Pu...</text>

  <!-- Gold/Platinum callout -->
  <rect x="400" y="159" width="30" height="16" fill="#cc4444" stroke="#ff8844" stroke-width="1.5" rx="2"/>
  <text x="415" y="171" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Au</text>
  <rect x="432" y="159" width="30" height="16" fill="#cc4444" stroke="#ff8844" stroke-width="1.5" rx="2"/>
  <text x="447" y="171" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Pt</text>
  <line x1="415" y1="157" x2="415" y2="148" stroke="#ff8844" stroke-width="1.2"/>
  <text x="415" y="145" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">NS mergers</text>

  <!-- Title -->
  <text x="340" y="14" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Origin of the elements (simplified)</text>

  <!-- Bottom note -->
  <text x="340" y="255" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">* Many elements have multiple sources; diagram shows the dominant channel.</text>
</svg>`,
        caption:
          'Simplified map of the cosmic origin of the elements. Hydrogen and helium come from the Big Bang. Carbon, oxygen, silicon, iron — from stellar interiors. Gold, platinum, uranium — predominantly from neutron star mergers. Most elements between iron and lead were produced by slow neutron capture in asymptotic giant branch stars.',
      },
    },

    {
      heading: 'Why It Matters',
      level: 2,
      paragraphs: [
        'Stellar nucleosynthesis answers one of the deepest questions in the natural sciences: ' +
        'where does the chemical complexity of the universe come from? ' +
        'In the early twentieth century, physicists had no understanding of why the universe ' +
        'contained so many different elements in such specific proportions. ' +
        'The 1957 paper by the Burbidges, Fowler, and Hoyle gave the first quantitative answer: ' +
        'each mechanism — the proton-proton chain, the carbon-nitrogen-oxygen cycle, ' +
        'the triple-alpha reaction, slow and rapid neutron capture — leaves a characteristic ' +
        '"fingerprint" in the relative abundances of isotopes. ' +
        'Modern observations of stellar atmospheres, meteorites, and the products of neutron star mergers ' +
        'confirm theoretical predictions to within a few percent.',

        'For astrobiology, this has direct implications: the complex carbon-based chemistry of life ' +
        'only became possible after several generations of stars had synthesized and scattered ' +
        'the necessary elements into space. The early universe — consisting almost entirely ' +
        'of hydrogen and helium — is fundamentally unsuitable for complex molecules. ' +
        'In this sense, stellar nucleosynthesis is a prerequisite not only for rocky planets, ' +
        'but for the very possibility of biochemistry.',
      ],
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-supernova-remnant',
        prompt:
          'Photorealistic scientific illustration of a supernova remnant nebula: expanding shell of glowing gas and plasma in deep space, showing complex filamentary structure with shock fronts in red, orange, and blue, newly synthesized heavy elements labeled in the ejected shell, central neutron star visible as a dim blue-white point at center. ' +
          'Hard sci-fi style, dark space background, technically accurate nebula morphology. ' +
          'Add the following text labels on the image: "ejected stellar material", "synthesized C, O, Si, Fe", "shock front", "neutron star remnant", "expanding shell".',
        alt: 'Supernova remnant: a shell of superheated gas expanding into space, carrying synthesized heavy elements into the interstellar medium',
        caption: 'Supernova remnants are the recycling engines of the Galaxy. Atoms synthesized by the star expand at thousands of kilometers per second, mixing with interstellar gas, and millions of years later become the raw material for new planetary systems.',
        aspectRatio: '4:3',
      },
    },

    {
      image: {
        cacheKey: 'fusion-nucleosynthesis-bfh-paper',
        prompt:
          'Scientific illustration representing the landmark 1957 Burbidge-Burbidge-Fowler-Hoyle paper on stellar nucleosynthesis: vintage-style scientific document page with graphs showing elemental abundance curves, mathematical equations of nuclear reactions, portraits as silhouettes of four scientists in a dark background, title text visible. ' +
          'Hard sci-fi style, dark background, monospace annotations. ' +
          'Add the following text labels on the image: "B2FH 1957", "stellar nucleosynthesis", "Reviews of Modern Physics", "element abundances".',
        alt: 'Stylized illustration of the Burbidge-Burbidge-Fowler-Hoyle 1957 paper — the foundational document of stellar nucleosynthesis',
        caption: 'The 1957 paper by the Burbidges, Fowler, and Hoyle in Reviews of Modern Physics identified eight distinct nucleosynthetic processes inside stars. This document formed the foundation of our current understanding of the chemical evolution of the universe.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Nucleosynthesis',
      definition:
        'The process of forming atomic nuclei through nuclear reactions — fusion, neutron capture, or decay. Stellar nucleosynthesis occurs inside stars and during supernova explosions.',
    },
    {
      term: 'Proton-proton chain',
      definition:
        'A sequence of nuclear reactions in which four protons are fused into one helium-4 nucleus with the release of energy. The primary energy source in the Sun and all stars up to about 1.3 solar masses.',
    },
    {
      term: 'Carbon-nitrogen-oxygen cycle',
      definition:
        'A catalytic nuclear cycle in which carbon-12 accelerates the fusion of four protons into helium-4 while remaining unchanged. Dominates in stars more massive than about 1.3 solar masses.',
    },
    {
      term: 'Triple-alpha reaction',
      definition:
        'A nuclear reaction in which three helium-4 nuclei (alpha particles) fuse into a single carbon-12 nucleus. Occurs in red giants at temperatures around one hundred million degrees.',
    },
    {
      term: 'Iron peak',
      definition:
        'The group of elements near iron (iron, nickel, cobalt) with the highest nuclear binding energy per nucleon. Fusing nuclei heavier than iron absorbs rather than releases energy — this is why stellar burning halts here.',
    },
    {
      term: 'Slow neutron capture (s-process)',
      definition:
        'A process of forming heavy nuclei through sequential neutron capture with intervening beta decays. Occurs in asymptotic giant branch stars. Produces most isotopes between iron and lead.',
    },
    {
      term: 'Rapid neutron capture (r-process)',
      definition:
        'A process producing very heavy, neutron-rich nuclei under extremely intense neutron fluxes, before beta decay can stabilize the nucleus. Occurs primarily in neutron star mergers. Produces gold, platinum, uranium, and other heavy elements.',
    },
    {
      term: 'Kilonova',
      definition:
        'A transient optical flare accompanying a neutron star merger. Powered by radioactive decay of elements synthesized through rapid neutron capture. The first confirmed kilonova was associated with GW170817 in August 2017.',
    },
    {
      term: 'Asymptotic giant branch star',
      definition:
        'A late evolutionary stage of stars with masses between 0.8 and 8 solar masses, where the star is a red giant burning both helium and hydrogen in shells simultaneously. Slow neutron capture operates in such stars.',
    },
    {
      term: 'Primordial nucleosynthesis',
      definition:
        'The synthesis of light nuclei (hydrogen, helium-4, deuterium, helium-3, lithium-7) in the first few minutes after the Big Bang. Explains the observed primordial abundances of these elements in the universe.',
    },
  ],

  quiz: [
    {
      question: 'Which thermonuclear process is the primary energy source of our Sun?',
      options: [
        'The carbon-nitrogen-oxygen cycle',
        'The triple-alpha reaction',
        'The proton-proton chain',
        'Slow neutron capture',
      ],
      correctIndex: 2,
      explanation:
        'The Sun has a mass close to one solar mass — so the proton-proton chain dominates. The carbon-nitrogen-oxygen cycle takes over only in stars more massive than approximately 1.3 solar masses, where the core temperature is higher.',
    },
    {
      question: 'Why does stellar fusion stop at iron and go no further?',
      options: [
        'Iron is too heavy and sinks to the core',
        'The iron nucleus has the highest binding energy per nucleon — fusing heavier nuclei requires energy rather than releasing it',
        'Iron blocks neutron flows',
        'Gravitational compression stops at iron',
      ],
      correctIndex: 1,
      explanation:
        'Iron-56 sits at the peak of the nuclear binding energy curve. Fusing two iron nuclei requires an energy input — unlike lighter nuclei, where fusion releases energy. The star can no longer generate heat by fusing heavier nuclei and therefore collapses.',
    },
    {
      question: 'Which 2017 event provided the first direct confirmation that rapid neutron capture in neutron star mergers produces gold and platinum?',
      options: [
        'A supernova explosion in the Magellanic Cloud',
        'The first image of a black hole shadow by the Event Horizon Telescope',
        'Detection of gravitational waves from a neutron star merger and the associated kilonova GW170817',
        'An anomalous gold abundance measured in a stellar spectrum',
      ],
      correctIndex: 2,
      explanation:
        'GW170817 in August 2017 was the first simultaneous detection of gravitational waves and an electromagnetic transient from a neutron star merger. Strontium isotopes were identified in the kilonova spectrum — direct evidence of rapid neutron capture nucleosynthesis.',
    },
    {
      question: 'Where are most isotopes between iron and lead (for example, barium, cerium, lanthanum) produced?',
      options: [
        'In neutron star mergers via rapid neutron capture',
        'In supernova explosions via the proton-proton chain',
        'In asymptotic giant branch stars via slow neutron capture',
        'During the Big Bang via primordial nucleosynthesis',
      ],
      correctIndex: 2,
      explanation:
        'Slow neutron capture operates in asymptotic giant branch stars, where neutrons are captured slowly enough that beta decays occur between capture events. This produces most stable heavy isotopes from iron through lead.',
    },
    {
      question: 'What was the fundamental contribution of the Burbidge-Burbidge-Fowler-Hoyle paper of 1957?',
      options: [
        'It discovered the neutron star and predicted pulsars',
        'It systematically described the mechanisms of element synthesis in stars and explained the observed elemental abundances',
        'It first measured the rate of expansion of the universe',
        'It proved that the Sun consists of hydrogen using spectroscopy',
      ],
      correctIndex: 1,
      explanation:
        'The 1957 paper identified eight distinct nucleosynthetic processes, showed how each leaves a characteristic isotopic fingerprint, and explained the overall distribution of elements in the universe. It remains the foundation of stellar nucleochemistry.',
    },
  ],

  sources: [
    {
      title: 'Burbidge E.M., Burbidge G.R., Fowler W.A., Hoyle F. — Synthesis of the Elements in Stars',
      url: 'https://journals.aps.org/rmp/abstract/10.1103/RevModPhys.29.547',
      meta: 'Reviews of Modern Physics, 29, 547, 1957',
    },
    {
      title: 'Abbott B.P. et al. (LIGO/Virgo) — GW170817: Multi-messenger Observations',
      url: 'https://arxiv.org/abs/1710.05834',
      meta: 'ApJL, 848, L12, 2017 (open access)',
    },
    {
      title: 'Smartt S.J. et al. — A kilonova as the electromagnetic counterpart to a gravitational-wave source',
      url: 'https://www.nature.com/articles/nature24303',
      meta: 'Nature, 551, 75–79, 2017',
    },
    {
      title: 'Cowan J.J. et al. — Origin of the heaviest elements: The rapid neutron-capture process',
      url: 'https://arxiv.org/abs/1901.01410',
      meta: 'Reviews of Modern Physics, 93, 015002, 2021 (open access)',
    },
    {
      title: 'Karakas A.I., Lattanzio J.C. — The dawes review: Nucleosynthesis and stellar models',
      url: 'https://arxiv.org/abs/1405.0062',
      meta: 'PASA, 31, e030, 2014 (open access)',
    },
    {
      title: 'Arnould M., Goriely S. — The p-process of stellar nucleosynthesis',
      url: 'https://arxiv.org/abs/astro-ph/0301573',
      meta: 'Physics Reports, 384, 1–84, 2003',
    },
    {
      title: 'NASA — Origin of the Elements: Nucleosynthesis',
      url: 'https://science.nasa.gov/universe/stars/nucleosynthesis-how-stars-make-all-the-elements/',
      meta: 'NASA Science, updated 2024',
    },
    {
      title: 'Herwig F. — Evolution of Asymptotic Giant Branch Stars',
      url: 'https://arxiv.org/abs/astro-ph/0405400',
      meta: 'ARA&A, 43, 435–479, 2005',
    },
    {
      title: 'Bethe H.A. — Energy Production in Stars',
      url: 'https://journals.aps.org/pr/abstract/10.1103/PhysRev.55.434',
      meta: 'Physical Review, 55, 434, 1939 (Nobel lecture basis)',
    },
    {
      title: 'Lattimer J.M., Prakash M. — The Physics of Neutron Stars',
      url: 'https://arxiv.org/abs/astro-ph/0405262',
      meta: 'Science, 304, 536–542, 2004',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
