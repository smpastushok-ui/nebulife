import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'stars-classification',
  language: 'en',
  section: 'astronomy',
  order: 4,
  difficulty: 'beginner',
  readingTimeMin: 14,
  title: 'Stars: Classification and Life Cycle',
  subtitle: 'From a collapsing gas cloud to a white dwarf or black hole — how a star\'s mass decides its entire fate.',

  hero: {
    cacheKey: 'stars-classification-hero',
    prompt:
      'Scientific illustration showing the full spectral classification of stars O B A F G K M arranged left to right as glowing spheres against deep black space. ' +
      'Colors progress from intense blue-white (O-type, leftmost) through white (A), pale yellow (F), yellow (G, Sun-like), orange (K), to deep red (M, rightmost). ' +
      'Each sphere is labeled with its spectral class letter below. Relative sizes increase slightly from O to M for the main sequence context. ' +
      'Hard sci-fi scientific illustration, monospace font labels, dark space background with faint star field. ' +
      'Add the following text labels on the image: "O", "B", "A", "F", "G", "K", "M", "spectral class", "hot → cool".',
    alt: 'Seven stellar spectral classes O B A F G K M — from blue-white giants to red dwarfs',
    caption:
      'The spectral classification O B A F G K M spans surface temperatures from more than thirty thousand kelvin (class O) to below three thousand kelvin (class M). The Sun belongs to class G — between the warm and cool ends of the sequence.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'A star is not merely a ball of hot gas. It is a place where gravity and thermonuclear pressure wage a continuous tug of war. ' +
        'Gravity pulls hydrogen inward and compresses it, raising the temperature. When the core reaches several million kelvin, ' +
        '**thermonuclear fusion** begins: hydrogen nuclei merge into helium, releasing enormous energy. ' +
        'That energy pushes outward, balancing gravity. As long as hydrogen fuel remains, the star exists in _hydrostatic equilibrium_ — ' +
        'the precise point where the two opposing forces cancel.',

        'This balance explains why stars live for millions or billions of years rather than exploding or fading within centuries. ' +
        'When equilibrium finally breaks down — through fuel exhaustion — the next chapter of the star\'s biography begins. ' +
        'Where that chapter leads depends almost entirely on one thing: the star\'s initial mass.',
      ],
    },

    {
      heading: 'Spectral Classification O B A F G K M',
      level: 2,
      paragraphs: [
        'During the late nineteenth and early twentieth centuries, astronomers at the Harvard Observatory — ' +
        'among them Annie Jump Cannon — systematically dispersed the light of tens of thousands of stars into spectra. ' +
        'The absorption lines fell into clear groups: stars naturally cluster by surface temperature. ' +
        'The result was the **Harvard Classification** — seven letters O B A F G K M, ' +
        'running from hottest to coolest.',

        'English-speaking astronomers remember the order with the mnemonic ' +
        '"_Oh Be A Fine Girl Kiss Me_". Each class is subdivided from 0 to 9, hotter to cooler. ' +
        'Our Sun is type G2: a yellow star of intermediate temperature.',
      ],
    },

    {
      image: {
        cacheKey: 'stars-classification-harvard-table',
        prompt:
          'Scientific infographic table of Harvard stellar spectral classification: seven rows for classes O, B, A, F, G, K, M. ' +
          'Each row shows: spectral class letter, color swatch (blue-white, blue-white, white, yellow-white, yellow, orange, red), ' +
          'surface temperature range in Kelvin, example star name, and one dominant spectral feature. ' +
          'Clean monospace font, dark background (deep space color #020510), cyan and amber accents. ' +
          'Grid lines in dim blue-grey. ' +
          'Add the following text labels on the image: "Class", "Color", "Temperature (K)", "Example", "Key feature".',
        alt: 'Harvard spectral classification table — seven rows from class O to M with temperatures and example stars',
        caption:
          'The Harvard classification links a star\'s color to its surface temperature and atmospheric chemistry. ' +
          'Ionized helium lines in the spectrum indicate class O; titanium oxide molecules indicate class M.',
        aspectRatio: '16:9',
      },
    },

    {
      paragraphs: [
        'Class **O** stars are the hottest: surface temperatures from thirty thousand to over one hundred thousand kelvin. ' +
        'They shine blue-white and are massive — from about twenty to over one hundred solar masses. ' +
        'They live only a few million years: the greater the mass, the faster the fuel burns. ' +
        'Class O stars are responsible for most of the ultraviolet and ionizing radiation in a galaxy.',

        'Class **B** stars are bright blue-white, temperatures from ten thousand to thirty thousand kelvin. ' +
        '**Rigel** belongs here — one of the most luminous stars visible from Earth: despite being over eight hundred light-years away, ' +
        'its apparent brightness rivals the nearest neighbors of the Sun.',

        'Class **A** stars are white, temperatures from seven thousand five hundred to ten thousand kelvin. ' +
        'The brightest star in the night sky, **Sirius** (alpha Canis Majoris), is class A1. ' +
        'The spectra of class A stars are dominated by hydrogen absorption lines (the Balmer series).',

        'Class **F** stars are yellow-white, from six thousand to seven thousand five hundred kelvin. ' +
        'Class **G** stars are yellow, like our Sun (five thousand two hundred to six thousand kelvin). ' +
        'Class **K** stars are orange, from three thousand five hundred to five thousand two hundred kelvin. ' +
        'Class **M** stars are the coolest on the main sequence, below three thousand five hundred kelvin, and appear red. ' +
        'These are the _red dwarfs_ — the most common type of star in our Galaxy.',
      ],
    },

    {
      heading: 'The Hertzsprung-Russell Diagram',
      level: 2,
      paragraphs: [
        'In the early twentieth century, Danish astronomer Ejnar Hertzsprung and American Henry Norris Russell independently ' +
        'plotted a graph with surface temperature (or spectral class) on the horizontal axis and _absolute luminosity_ on the vertical axis. ' +
        'The data points did not scatter randomly — they formed distinct bands. This became the **Hertzsprung-Russell diagram** (HR diagram) — ' +
        'the most important tool in stellar astrophysics.',

        'Most stars (including the Sun) lie along a broad diagonal band running from upper left (hot and luminous) ' +
        'to lower right (cool and dim) — this is the **main sequence**. ' +
        'A star occupies this band while burning hydrogen in its core. Once hydrogen runs out, it leaves the main sequence ' +
        'and moves toward the upper right corner of the diagram, becoming a red giant or supergiant.',
      ],
    },

    {
      diagram: {
        title: 'Hertzsprung-Russell Diagram',
        svg: `<svg viewBox="0 0 700 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="480" fill="rgba(10,15,25,0.7)" rx="4"/>

  <!-- Axes -->
  <line x1="80" y1="30" x2="80" y2="420" stroke="#334455" stroke-width="1.5"/>
  <line x1="80" y1="420" x2="670" y2="420" stroke="#334455" stroke-width="1.5"/>

  <!-- Y axis label: Luminosity -->
  <text x="18" y="230" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle" transform="rotate(-90,18,230)">Luminosity (L☉)</text>

  <!-- Y axis ticks -->
  <text x="74" y="50"  fill="#667788" font-family="monospace" font-size="10" text-anchor="end">10⁶</text>
  <text x="74" y="120" fill="#667788" font-family="monospace" font-size="10" text-anchor="end">10⁴</text>
  <text x="74" y="190" fill="#667788" font-family="monospace" font-size="10" text-anchor="end">10²</text>
  <text x="74" y="260" fill="#667788" font-family="monospace" font-size="10" text-anchor="end">1</text>
  <text x="74" y="330" fill="#667788" font-family="monospace" font-size="10" text-anchor="end">10⁻²</text>
  <text x="74" y="400" fill="#667788" font-family="monospace" font-size="10" text-anchor="end">10⁻⁴</text>
  <line x1="78" y1="50"  x2="82" y2="50"  stroke="#334455" stroke-width="1"/>
  <line x1="78" y1="120" x2="82" y2="120" stroke="#334455" stroke-width="1"/>
  <line x1="78" y1="190" x2="82" y2="190" stroke="#334455" stroke-width="1"/>
  <line x1="78" y1="260" x2="82" y2="260" stroke="#334455" stroke-width="1"/>
  <line x1="78" y1="330" x2="82" y2="330" stroke="#334455" stroke-width="1"/>
  <line x1="78" y1="400" x2="82" y2="400" stroke="#334455" stroke-width="1"/>

  <!-- X axis label -->
  <text x="375" y="460" fill="#8899aa" font-family="monospace" font-size="11" text-anchor="middle">Surface Temperature → (hot at left)</text>

  <!-- X axis spectral class labels -->
  <text x="120" y="438" fill="#aad4ff" font-family="monospace" font-size="11" text-anchor="middle">O</text>
  <text x="185" y="438" fill="#cce4ff" font-family="monospace" font-size="11" text-anchor="middle">B</text>
  <text x="265" y="438" fill="#ffffff" font-family="monospace" font-size="11" text-anchor="middle">A</text>
  <text x="345" y="438" fill="#ffffcc" font-family="monospace" font-size="11" text-anchor="middle">F</text>
  <text x="415" y="438" fill="#ffee88" font-family="monospace" font-size="11" text-anchor="middle">G</text>
  <text x="495" y="438" fill="#ffaa55" font-family="monospace" font-size="11" text-anchor="middle">K</text>
  <text x="585" y="438" fill="#ff5533" font-family="monospace" font-size="11" text-anchor="middle">M</text>

  <!-- Main sequence band -->
  <polygon
    points="95,40 145,60 230,110 310,175 385,230 460,280 555,345 635,395 635,415 555,375 460,310 385,260 310,210 230,145 145,90 95,65"
    fill="rgba(68,136,170,0.13)" stroke="rgba(68,136,170,0.4)" stroke-width="1"/>
  <text x="280" y="155" fill="#4488aa" font-family="monospace" font-size="11" transform="rotate(-30,280,155)">Main Sequence</text>

  <!-- Red giants / supergiants region -->
  <ellipse cx="560" cy="120" rx="90" ry="55" fill="rgba(180,80,40,0.14)" stroke="rgba(180,80,40,0.45)" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="560" y="78" fill="#cc6633" font-family="monospace" font-size="10" text-anchor="middle">Red Giants</text>
  <text x="560" y="92" fill="#cc6633" font-family="monospace" font-size="10" text-anchor="middle">&amp; Supergiants</text>

  <!-- White dwarfs region -->
  <ellipse cx="175" cy="375" rx="65" ry="28" fill="rgba(180,210,240,0.13)" stroke="rgba(180,210,240,0.4)" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="175" y="372" fill="#cdd9e8" font-family="monospace" font-size="10" text-anchor="middle">White Dwarfs</text>

  <!-- Key stars as dots with labels -->
  <!-- Sun: G2, L=1 -->
  <circle cx="415" cy="260" r="7" fill="#ffee88" stroke="#ffd050" stroke-width="1.5"/>
  <text x="430" y="257" fill="#ffee88" font-family="monospace" font-size="10">Sun (G2)</text>

  <!-- Sirius A: A1, ~25 L☉ -->
  <circle cx="258" cy="205" r="6" fill="#eef4ff" stroke="#aad4ff" stroke-width="1.5"/>
  <text x="272" y="202" fill="#aad4ff" font-family="monospace" font-size="10">Sirius A (A1)</text>

  <!-- Rigel: B8, ~120000 L☉ -->
  <circle cx="200" cy="62" r="8" fill="#cce8ff" stroke="#aad4ff" stroke-width="1.5"/>
  <text x="215" y="59" fill="#cce8ff" font-family="monospace" font-size="10">Rigel (B8)</text>

  <!-- Polaris: F7 supergiant -->
  <circle cx="350" cy="128" r="6" fill="#ffffcc" stroke="#ffee88" stroke-width="1.5"/>
  <text x="364" y="125" fill="#ffffcc" font-family="monospace" font-size="10">Polaris (F7)</text>

  <!-- Betelgeuse: M2 -->
  <circle cx="570" cy="68" r="9" fill="#ff5533" stroke="#ff8844" stroke-width="1.5"/>
  <text x="505" y="58" fill="#ff8844" font-family="monospace" font-size="10">Betelgeuse (M2)</text>

  <!-- Proxima Centauri: M5 -->
  <circle cx="600" cy="382" r="4" fill="#ff4422" stroke="#ff6644" stroke-width="1"/>
  <text x="518" y="380" fill="#ff6644" font-family="monospace" font-size="10">Proxima (M5)</text>

  <!-- Sirius B: white dwarf -->
  <circle cx="148" cy="368" r="4" fill="#ddeeff" stroke="#cdd9e8" stroke-width="1"/>
  <text x="158" y="366" fill="#cdd9e8" font-family="monospace" font-size="10">Sirius B (DA)</text>

  <defs>
    <marker id="arr2en" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#334455"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'The HR diagram: stars on the main sequence form a diagonal band. ' +
          'After exhausting their hydrogen, Sun-like stars migrate to the red giant zone (upper right). ' +
          'White dwarfs occupy the lower left corner — hot but tiny and dim.',
      },
    },

    {
      paragraphs: [
        'In the upper right corner of the HR diagram sit red **supergiants** — ' +
        'Betelgeuse and other massive stars in their final stages. Their radii are hundreds of times the Sun\'s, ' +
        'but their surface temperatures are far lower. In the lower left corner are _white dwarfs_: stellar remnants ' +
        'without any nuclear energy source. They are hot but tiny, so their total luminosity is low.',
      ],
    },

    {
      heading: 'The Birth of a Star',
      level: 2,
      paragraphs: [
        'Stars are born inside _molecular clouds_ — enormous concentrations of cold gas and dust ' +
        'spanning from a few to hundreds of light-years. A sufficient disturbance — for instance a shockwave from a nearby supernova — ' +
        'can trigger **gravitational collapse** in part of the cloud. The gas compresses, heats up, and forms a ' +
        '_protostar_ surrounded by a rotating **protoplanetary disk**.',

        'The protostar gains mass by accreting gas from the disk. When its core temperature reaches roughly ten million kelvin, ' +
        'hydrogen fusion ignites. From that moment the star joins the **main sequence** — ' +
        'where it will remain until all the hydrogen in its core is spent.',

        'JWST observes protostars inside protoplanetary disks with unprecedented detail. ' +
        'Images of the Orion Nebula and the Carina star-forming region reveal young stellar systems ' +
        'resembling what our own Solar System may have looked like more than four billion years ago.',
      ],
    },

    {
      image: {
        cacheKey: 'stars-classification-protoplanetary-disk',
        prompt:
          'Scientific illustration of a protoplanetary disk around a young T Tauri star: ' +
          'central bright yellow-orange protostar surrounded by a flared accretion disk of gas and dust with dust lanes and spiral density waves, ' +
          'bipolar protostellar jets shooting vertically from the poles in glowing blue-white, ' +
          'outer disk regions slightly reddish-brown from cool dust, deep black space background. ' +
          'Hard sci-fi style scientific illustration, technically accurate geometry, dark background. ' +
          'Add the following text labels on the image: "protostar", "accretion disk", "protostellar jet", "dust lane".',
        alt: 'Protostar at the center of a protoplanetary disk of gas and dust, with two polar jets',
        caption:
          'A protoplanetary disk around a young star is where planets form. ' +
          'JWST images such disks in the Orion and Carina clouds with enough detail to resolve ring structures and gaps caused by forming planets.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'A Sun-Like Star: From Birth to White Dwarf',
      level: 2,
      paragraphs: [
        'Stars with masses roughly between half and eight solar masses follow a typical "medium" scenario. ' +
        'The Sun is currently about halfway through its main-sequence lifetime — it has been burning for more than four billion years ' +
        'and will continue for roughly another five billion.',

        'When the hydrogen in the core runs out, the core begins to contract. Heat from this contraction ignites ' +
        'hydrogen in a _shell_ surrounding the core. The outer layers expand and cool — ' +
        'the star becomes a **red giant**. At this stage the Sun\'s radius will reach roughly the orbit of Earth, ' +
        'or perhaps even Mars.',

        'Meanwhile, the core grows hot enough to ignite helium fusion, producing _carbon_ and _oxygen_. ' +
        'This phase is much shorter. Eventually helium in the core is also exhausted. ' +
        'The outer shells are shed as an expanding cloud of luminous gas — ' +
        'a **planetary nebula**. The name is misleading — these structures have nothing to do with planets; ' +
        'early astronomers applied it because of their round, disk-like appearance in small telescopes.',

        'After the shells are expelled, what remains is a **white dwarf** — a hot, compact core ' +
        'roughly the size of Earth but with a mass close to half to one solar mass. ' +
        'It generates no new nuclear energy; it simply radiates away its stored heat over billions upon billions of years.',
      ],
    },

    {
      image: {
        cacheKey: 'stars-classification-planetary-nebula',
        prompt:
          'Photorealistic scientific illustration of a planetary nebula: ' +
          'central white dwarf as a bright white pinpoint at the center, ' +
          'surrounding it are glowing shells and rings of ejected gas in vivid colors — inner ring in blue-green (ionized oxygen), outer shell in red (ionized hydrogen), ' +
          'delicate filaments and bipolar symmetry visible in the structure, deep black space background with faint distant stars. ' +
          'Hard sci-fi style scientific illustration, dramatic and beautiful. ' +
          'Add the following text labels on the image: "white dwarf", "ionized gas shell", "expanding nebula".',
        alt: 'Planetary nebula — a multi-layered glowing gas cloud surrounding a central white dwarf',
        caption:
          'A planetary nebula is the final "exhale" of a Sun-like star. ' +
          'The shed shells glow under ultraviolet radiation from the hot white dwarf at the center. ' +
          'These structures persist for tens of thousands of years before dispersing into the interstellar medium.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'A Massive Star: From Supergiant to Neutron Star or Black Hole',
      level: 2,
      paragraphs: [
        'Massive stars — more than roughly eight solar masses — live far shorter and far more dramatic lives. ' +
        'After the main sequence they too become red supergiants, ' +
        'but their cores continue fusing ever-heavier elements: helium into carbon, carbon into neon, neon into oxygen, ' +
        'oxygen into silicon, and finally silicon into iron. Iron is the _end of the line_: fusing iron absorbs energy rather than releasing it.',

        'When the iron core exceeds roughly one and four tenths solar masses ' +
        '(the Chandrasekhar limit), electron pressure can no longer resist gravity. ' +
        'In a fraction of a second the core collapses to the size of a city, reaching the density of an atomic nucleus. ' +
        'The rapid rebound creates a shockwave that tears the star apart — ' +
        'a **supernova** explosion, one of the most powerful events in the universe.',

        'In a supernova, more neutrons are synthesized in seconds than the star produced over millions of years of normal burning. ' +
        'This is how most heavy elements in the universe are forged — from iron to gold and uranium. ' +
        'We are literally made of matter that exploded from massive stars long before the Sun was born.',
      ],
    },

    {
      diagram: {
        title: 'Stellar Evolution: Pathways by Mass',
        svg: `<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="340" fill="rgba(10,15,25,0.6)" rx="4"/>

  <defs>
    <marker id="starrEN" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <polygon points="0 0, 7 3.5, 0 7" fill="#667788"/>
    </marker>
  </defs>

  <!-- Dividing line between tracks -->
  <line x1="20" y1="170" x2="680" y2="170" stroke="#334455" stroke-width="0.8" stroke-dasharray="6,5" opacity="0.6"/>
  <text x="8" y="100" fill="#667788" font-family="monospace" font-size="9" dominant-baseline="middle" transform="rotate(-90,8,100)">Low/mid mass</text>
  <text x="8" y="248" fill="#667788" font-family="monospace" font-size="9" dominant-baseline="middle" transform="rotate(-90,8,248)">High mass</text>

  <!-- === Top track: Sun-like === -->
  <circle cx="70" cy="95" r="14" fill="#ffcc66" opacity="0.85"/>
  <text x="70" y="99" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">Protostar</text>
  <text x="70" y="122" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">0.5–8 M☉</text>

  <line x1="86" y1="95" x2="148" y2="95" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="178" cy="95" r="18" fill="#ffee88" opacity="0.9"/>
  <text x="178" y="92" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle" font-weight="bold">Main</text>
  <text x="178" y="102" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle" font-weight="bold">Sequence</text>
  <text x="178" y="126" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">billions yr</text>

  <line x1="198" y1="95" x2="268" y2="95" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="302" cy="95" r="26" fill="#cc6633" opacity="0.85"/>
  <text x="302" y="91" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Red</text>
  <text x="302" y="102" fill="#fff" font-family="monospace" font-size="8" text-anchor="middle">Giant</text>
  <text x="302" y="132" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">~100–200 R☉</text>

  <line x1="330" y1="95" x2="395" y2="95" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <ellipse cx="430" cy="95" rx="26" ry="17" fill="none" stroke="#88ccdd" stroke-width="1.8" opacity="0.8"/>
  <ellipse cx="430" cy="95" rx="14" ry="8" fill="none" stroke="#4488aa" stroke-width="1" opacity="0.6"/>
  <text x="430" y="98" fill="#88ccdd" font-family="monospace" font-size="8" text-anchor="middle">Planetary</text>
  <text x="430" y="122" fill="#88ccdd" font-family="monospace" font-size="9" text-anchor="middle">Nebula</text>

  <line x1="458" y1="95" x2="528" y2="95" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="552" cy="95" r="10" fill="#ddeeff" opacity="0.95"/>
  <text x="552" y="117" fill="#cdd9e8" font-family="monospace" font-size="9" text-anchor="middle">White</text>
  <text x="552" y="130" fill="#cdd9e8" font-family="monospace" font-size="9" text-anchor="middle">Dwarf</text>

  <!-- === Bottom track: massive star === -->
  <circle cx="70" cy="245" r="22" fill="#aad4ff" opacity="0.85"/>
  <text x="70" y="242" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle" font-weight="bold">Massive</text>
  <text x="70" y="252" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle" font-weight="bold">Star</text>
  <text x="70" y="278" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">8+ M☉</text>

  <line x1="94" y1="245" x2="148" y2="245" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="178" cy="245" r="18" fill="#99ccff" opacity="0.9"/>
  <text x="178" y="242" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle" font-weight="bold">Main</text>
  <text x="178" y="252" fill="#020510" font-family="monospace" font-size="7" text-anchor="middle" font-weight="bold">Sequence</text>
  <text x="178" y="276" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">millions yr</text>

  <line x1="198" y1="245" x2="258" y2="245" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="298" cy="245" r="34" fill="#882211" opacity="0.85"/>
  <text x="298" y="241" fill="#ffaa88" font-family="monospace" font-size="8" text-anchor="middle">Red</text>
  <text x="298" y="252" fill="#ffaa88" font-family="monospace" font-size="8" text-anchor="middle">Supergiant</text>
  <text x="298" y="288" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">500–1500 R☉</text>

  <line x1="334" y1="245" x2="388" y2="245" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="418" cy="245" r="22" fill="none" stroke="#ff8844" stroke-width="2"/>
  <circle cx="418" cy="245" r="12" fill="rgba(255,200,80,0.4)"/>
  <text x="418" y="249" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Supernova</text>
  <text x="418" y="276" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Type II</text>

  <line x1="440" y1="235" x2="502" y2="200" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>
  <line x1="440" y1="255" x2="502" y2="285" stroke="#667788" stroke-width="1.2" marker-end="url(#starrEN)"/>

  <circle cx="524" cy="192" r="9" fill="#7bb8ff" opacity="0.95"/>
  <text x="524" y="175" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Neutron</text>
  <text x="524" y="187" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Star</text>
  <text x="524" y="212" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1.4–3 M☉</text>

  <circle cx="524" cy="288" r="12" fill="#080c18" stroke="#cc4444" stroke-width="2"/>
  <circle cx="524" cy="288" r="3" fill="#ff8844"/>
  <text x="524" y="308" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Black Hole</text>
  <text x="524" y="320" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">&gt;3 M☉</text>
</svg>`,
        caption:
          'Low and intermediate-mass stars (up to eight solar masses) end as white dwarfs. ' +
          'Massive stars explode as supernovae and leave either a neutron star or a black hole, depending on the core mass.',
      },
    },

    {
      paragraphs: [
        'If the supernova remnant core weighs between one and four tenths and roughly three solar masses, ' +
        'it survives as a **neutron star** — an object the size of a city ' +
        'but with more than one solar mass, so dense that protons and electrons have merged into neutrons. ' +
        'Some neutron stars spin hundreds of times per second and beam regular radio pulses — ' +
        'these are called _pulsars_.',

        'If the core mass exceeds approximately three solar masses — no known force can stop the collapse. ' +
        'The result is a **black hole**: a region of space from which nothing escapes, not even light.',
      ],
    },

    {
      heading: 'Stars We Know',
      level: 2,
      paragraphs: [
        '**The Sun (G2V)** — a yellow main-sequence star, one solar mass, surface temperature around five thousand eight hundred kelvin. ' +
        'It is roughly halfway through its main-sequence lifetime. The core fuses hydrogen into helium, ' +
        'radiating power equivalent to three hundred eighty-six yottawatts (386 times ten to the power of twenty-four watts). ' +
        'It sits about eight and a half kiloparsecs from the Galactic center.',

        '**Polaris (F7 supergiant)** — alpha Ursae Minoris, a luminous supergiant of class F, roughly four hundred eighty times brighter than the Sun. ' +
        'It sits almost directly above Earth\'s North Pole and has been used for navigation for millennia. ' +
        'Polaris is also a _Cepheid variable_ — a pulsating star whose brightness varies with a precise, predictable period.',

        '**Betelgeuse (M2 supergiant)** — the upper-left shoulder of Orion, one of the largest known objects: ' +
        'its radius is seven hundred to one thousand times the Sun\'s. ' +
        'It is already in its final stage — a red supergiant and a supernova candidate. ' +
        'In the early part of this decade astronomers recorded an unusual sharp dimming, ' +
        'which turned out to be a mass ejection of gas and dust from its surface, not a sign of imminent explosion.',

        '**Sirius (A1V)** — the brightest star in the night sky. Actually a binary system: ' +
        'Sirius A (class A) and Sirius B — the first white dwarf ever identified, ' +
        'detected in the middle of the nineteenth century as an anomalous gravitational wobble in the orbit of Sirius A. ' +
        'Distance to the system: about eight and six tenths light-years.',

        '**Proxima Centauri (M5Ve)** — the nearest star to the Sun, at approximately four and two tenths light-years. ' +
        'A red dwarf, far smaller and cooler than the Sun. ' +
        'At least two planets have been found orbiting it; one (Proxima b) lies in the habitable zone. ' +
        'Red dwarfs are the most common type of star in the Galaxy — more than seventy percent of all stars.',
      ],
    },

    {
      image: {
        cacheKey: 'stars-classification-size-comparison',
        prompt:
          'Scientific size comparison illustration of five famous stars aligned left to right: ' +
          'Proxima Centauri (tiny red dot), Sun (small yellow sphere), Sirius A (medium white-blue sphere), ' +
          'Polaris (larger pale yellow sphere), Betelgeuse (enormous deep red sphere dominating right side). ' +
          'Each labeled below with name and spectral class. Scale bar shown underneath. ' +
          'Hard sci-fi style scientific illustration, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "Proxima Cen M5", "Sun G2", "Sirius A A1", "Polaris F7", "Betelgeuse M2".',
        alt: 'Size comparison of five well-known stars — from Proxima Centauri to Betelgeuse',
        caption:
          'A star\'s mass dictates not just its lifespan but also its size and luminosity. ' +
          'Betelgeuse is so vast that if placed at the position of the Sun, it would engulf the orbit of Jupiter.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Modern View: JWST and Stellar Nurseries',
      level: 2,
      paragraphs: [
        'The James Webb Space Telescope (JWST), launched in 2021, opened a new era in observing stellar birth. ' +
        'Its infrared instruments pierce through the opaque dust clouds where stars are forming — ' +
        'something previously entirely inaccessible to optical telescopes.',

        'Images of star-forming regions — such as the "Pillars of Creation" in the Eagle Nebula or the Chamaeleon cloud complex — ' +
        'reveal hundreds of _young stellar objects_ (YSOs) at once. ' +
        'JWST detects disk structures around protostars, ' +
        'measures their spectra, and traces protostellar jets with enough precision ' +
        'to understand how disks evolve into planetary systems.',

        'JWST data also show that star formation in the early universe was far more intense — ' +
        'within the first billion years after the Big Bang, massive first-generation stars formed (Population III stars), ' +
        'completely lacking heavy elements. They burned out quickly, synthesizing the first heavy atoms. ' +
        'No such star has been directly observed yet, but JWST already detects their indirect signatures ' +
        'in the spectra of the most distant galaxies known.',
      ],
    },

    {
      image: {
        cacheKey: 'stars-classification-jwst-star-forming',
        prompt:
          'JWST-style infrared image of a star-forming region: dense dark dust pillar with glowing golden-orange edges lit by nearby massive young stars, ' +
          'multiple bright young stellar objects visible as pinpoints embedded in the pillar and surrounding nebulosity, ' +
          'vivid pink-magenta ionized hydrogen regions in the background, deep black space, diffraction spikes on bright sources. ' +
          'Infrared false-color scientific image aesthetic, dramatic and colorful. ' +
          'Add the following text labels on the image: "young stellar objects", "dust pillar", "ionized gas", "JWST NIRCam".',
        alt: 'Star-forming region in JWST false-color infrared — dust pillars with embedded young stellar objects',
        caption:
          'JWST pierces through the opaque dust of stellar nurseries and reveals hundreds of newborn stars at once. ' +
          'Such images allow astronomers to study star formation across a variety of environments — from nearby clouds to distant galaxies.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Hydrostatic equilibrium',
      definition:
        'The state of a star in which outward pressure from thermonuclear radiation exactly balances inward gravitational compression. As long as this balance holds, the star is stable.',
    },
    {
      term: 'Spectral class',
      definition:
        'A letter category (O B A F G K M) assigned to a star based on its surface temperature and the pattern of absorption lines in its spectrum. The Harvard Classification scheme, developed in the late nineteenth and early twentieth centuries.',
    },
    {
      term: 'Main sequence',
      definition:
        'The diagonal band on the Hertzsprung-Russell diagram occupied by stars actively fusing hydrogen in their cores. The Sun has been on the main sequence for roughly four and a half billion years.',
    },
    {
      term: 'Red giant / supergiant',
      definition:
        'A star in a late stage of evolution that has exhausted hydrogen in its core. Its outer layers have expanded and cooled, giving it a large radius and red color. Supergiants are the high-mass version of this phase.',
    },
    {
      term: 'Planetary nebula',
      definition:
        'An expanding cloud of gas shed by a low or intermediate-mass star at the end of its red giant phase. The name is misleading — these structures have nothing to do with planets.',
    },
    {
      term: 'White dwarf',
      definition:
        'The remnant core of a low or intermediate-mass star after its outer layers have been shed. Roughly the size of Earth but with half to one solar mass. It produces no new nuclear energy and slowly radiates away its stored heat.',
    },
    {
      term: 'Supernova',
      definition:
        'The catastrophic explosion of a massive star (Type II) or the thermonuclear detonation of a white dwarf accreting mass in a binary system (Type Ia). One of the most energetic events in the universe, forging heavy elements.',
    },
    {
      term: 'Neutron star',
      definition:
        'The ultra-dense remnant core of a massive star after a supernova. Mass from one and four tenths to roughly three solar masses packed into a radius of about ten kilometers. Matter is so compressed it consists almost entirely of neutrons.',
    },
  ],

  quiz: [
    {
      question: 'What prevents a star from collapsing under its own gravity while it is on the main sequence?',
      options: [
        'The star\'s magnetic field',
        'Outward pressure from thermonuclear fusion of hydrogen',
        'The star\'s rotation',
        'Stellar wind pressure',
      ],
      correctIndex: 1,
      explanation:
        'On the main sequence, gravitational compression is balanced by the outward pressure produced by thermonuclear fusion of hydrogen into helium in the core — a state called hydrostatic equilibrium. Once hydrogen in the core runs out, this balance breaks and the star begins to evolve further.',
    },
    {
      question: 'What will be the final state of a star with a mass similar to the Sun\'s?',
      options: [
        'Neutron star',
        'Black hole',
        'White dwarf',
        'Type II supernova remnant',
      ],
      correctIndex: 2,
      explanation:
        'Stars with masses roughly between half and eight solar masses end as white dwarfs — compact core remnants left after the star sheds its outer layers as a planetary nebula. Such stars lack the mass needed to form a neutron star or black hole.',
    },
    {
      question: 'Why do stars form a distinct "main sequence" band on the HR diagram rather than scattering randomly?',
      options: [
        'All stars formed at the same time and have the same age',
        'Main-sequence stars are all in the same physical state: fusing hydrogen in equilibrium',
        'Gravity pulls stars onto this band from all directions',
        'Temperature and luminosity depend only on distance from the Galactic center',
      ],
      correctIndex: 1,
      explanation:
        'The main sequence is not a coincidence: stars land there because they are all in the same physical state — stable hydrogen burning in hydrostatic equilibrium. A star\'s mass determines its exact position on the band: more massive stars are hotter and more luminous, less massive stars cooler and dimmer.',
    },
    {
      question: 'What happens when the iron core of a massive star exceeds the Chandrasekhar limit?',
      options: [
        'The star slowly cools and becomes a white dwarf',
        'The core sheds its outer layers as a planetary nebula',
        'The core collapses in a fraction of a second, and the rebound shockwave tears the star apart as a supernova',
        'The star transitions to the next spectral class and continues burning',
      ],
      correctIndex: 2,
      explanation:
        'Iron does not release energy through fusion — it absorbs it. When the iron core of a massive star exceeds roughly one and four tenths solar masses, electron pressure can no longer resist gravity. The core collapses in milliseconds; the rebound shockwave destroys the star in a Type II supernova explosion.',
    },
  ],

  sources: [
    {
      title: 'Harvard DASCH — Cannon Stellar Classification Archive',
      url: 'https://dasch.cfa.harvard.edu/',
      meta: 'Harvard College Observatory, digitized plates archive',
    },
    {
      title: 'ESA — Hertzsprung-Russell Diagram (Gaia mission)',
      url: 'https://sci.esa.int/web/gaia/-/60198-gaia-hertzsprung-russell-diagram',
      meta: 'ESA / Gaia collaboration, 2018 — open access',
    },
    {
      title: 'NASA JWST — Star Formation in the Carina Nebula',
      url: 'https://www.nasa.gov/image-feature/goddard/2022/nasa-s-webb-reveals-cosmic-cliffs-in-a-star-forming-region',
      meta: 'NASA Webb press release, 2022',
    },
    {
      title: 'NASA JWST — Pillars of Creation (NIRCam + MIRI)',
      url: 'https://www.nasa.gov/image-feature/goddard/2022/nasa-s-webb-takes-star-forming-pillars-of-creation',
      meta: 'NASA Webb press release, 2022',
    },
    {
      title: 'Carroll B.W., Ostlie D.A. — An Introduction to Modern Astrophysics (2nd ed.)',
      url: 'https://www.pearson.com/en-us/subject-catalog/p/introduction-to-modern-astrophysics-an/P200000006757',
      meta: 'Pearson, 2017 — standard university textbook',
    },
    {
      title: 'Kippenhahn R., Weigert A., Weiss A. — Stellar Structure and Evolution (2nd ed.)',
      url: 'https://link.springer.com/book/10.1007/978-3-642-30304-3',
      meta: 'Springer, 2012',
    },
    {
      title: 'Betelgeuse "Great Dimming" — Montargès et al. 2021',
      url: 'https://www.nature.com/articles/s41586-021-03255-2',
      meta: 'Nature, 591, 2021 — open access',
    },
    {
      title: 'Proxima Centauri b — Anglada-Escudé et al. 2016',
      url: 'https://www.nature.com/articles/nature19106',
      meta: 'Nature, 536, 437–440, 2016',
    },
    {
      title: 'NASA — Life Cycle of a Star',
      url: 'https://science.nasa.gov/universe/stars/',
      meta: 'NASA Science, official page, updated 2025',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
