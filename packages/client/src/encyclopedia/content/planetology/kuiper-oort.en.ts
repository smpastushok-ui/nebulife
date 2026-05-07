import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'kuiper-oort',
  language: 'en',
  section: 'planetology',
  order: 10,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Kuiper Belt and Oort Cloud',
  subtitle: 'Beyond Neptune lies an entire galaxy of small bodies — from dwarf planets to a trillion comets at the edge of the solar system.',

  hero: {
    cacheKey: 'kuiper-oort-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: outer solar system from above, showing the Sun at center as a small bright star, ' +
      'Neptune orbit ring labeled, then a wide flattened disk region of icy bodies (Kuiper Belt) extending outward in bluish-white tones, ' +
      'and a vast spherical halo of faint comet-like objects (Oort Cloud) surrounding everything at immense distance, ' +
      'dark deep space background with stars, logarithmic scale implied, cinematic scientific accuracy. ' +
      'Add the following text labels on the image: "Sun", "Neptune", "Kuiper Belt", "Oort Cloud", "Pluto".',
    alt: 'Schematic top-down view of the solar system — the Kuiper Belt and Oort Cloud surrounding the Sun',
    caption: 'The outer solar system shown approximately to scale: the Kuiper Belt is a relatively narrow disk beyond Neptune, while the Oort Cloud is a giant sphere at the outermost edge of the Sun\'s gravitational reach. Distances here are on a logarithmic scale.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Most people picture the solar system as eight planets circling a star. ' +
        'That is a convenient image, but it accounts for only a tiny fraction of what actually exists. ' +
        'Beyond the orbit of Neptune stretches an immense realm of small icy bodies — ' +
        'not empty space, but a densely populated region containing hundreds of thousands of confirmed objects ' +
        'and, by some estimates, trillions more.',

        'This outer frontier of the solar system comes in two zones with different geometries and different natures. ' +
        'The Kuiper Belt is a relatively flat disk extending from Neptune\'s orbit out to roughly fifty astronomical units from the Sun. ' +
        'An astronomical unit is the average distance from Earth to the Sun — approximately 150 million kilometers. ' +
        'The Oort Cloud is a hypothetical sphere that envelops the entire solar system, ' +
        'reaching out to perhaps two hundred thousand astronomical units — ' +
        'nearly halfway to the nearest star. ' +
        'It is from that vast reservoir that comets arrive which no living person will ever see twice.',
      ],
    },

    {
      heading: 'The Kuiper Belt: A Disk from the Solar System\'s Past',
      level: 2,
      paragraphs: [
        'The Kuiper Belt takes its name from the astronomer Gerard Kuiper, ' +
        'though the first to propose this zone in the mid-twentieth century was astronomer Kenneth Edgeworth — ' +
        'which is why the scientific literature sometimes calls it the Edgeworth-Kuiper Belt. ' +
        'For decades the concept remained purely theoretical: no object had been found there. ' +
        'The first confirmed trans-Neptunian object beyond Pluto was discovered in 1992, ' +
        'and the catalog of such objects has grown every year since.',

        'The Kuiper Belt is a remnant of the solar system\'s formation. ' +
        'When roughly four and a half billion years ago the planets were assembling from a cloud of gas and dust, ' +
        'the outer zone of that disk produced countless bodies that the gravity of the gas giants ' +
        'prevented from merging into a full-fledged planet. ' +
        'Those bodies — predominantly ice, rock, and methane — remained suspended in place, ' +
        'preserved in nearly pristine condition from the era when the solar system was born.',

        'Most Kuiper Belt objects consist of water ice, ammonia, and methane mixed with silicate dust. ' +
        'At such distances from the Sun, surface temperatures drop below minus two hundred and fifty degrees Celsius — ' +
        'volatile substances that would evaporate elsewhere are locked in place for billions of years.',
      ],
    },

    {
      image: {
        cacheKey: 'kuiper-belt-objects-mosaic',
        prompt:
          'Photorealistic illustration for a science encyclopedia: mosaic of four trans-Neptunian objects in space — ' +
          'Pluto (reddish-brown with bright nitrogen ice heart-shaped region), Eris (pale grey icy surface), ' +
          'Haumea (elongated egg-shaped dark reddish body), Makemake (reddish-orange with dark patches), ' +
          'arranged in a 2x2 grid, dark space background, relative sizes approximately to scale, scientific accuracy. ' +
          'Add the following text labels on the image: "Pluto", "Eris", "Haumea", "Makemake".',
        alt: 'Four large trans-Neptunian objects: Pluto, Eris, Haumea, Makemake',
        caption: 'The four best-known objects of the Kuiper Belt and scattered disk. Pluto was the first discovered, in 1930; Eris is nearly equal to Pluto in mass but was found only in the early twenty-first century.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Pluto and Its Relatives: Dwarf Planets',
      level: 2,
      paragraphs: [
        'For several decades after its discovery in 1930, Pluto was considered the ninth planet of the solar system. ' +
        'Its reclassification as a dwarf planet in 2006 sparked a public controversy, ' +
        'but the underlying scientific logic was clear: ' +
        'sharing the Kuiper Belt and scattered disk with Pluto are hundreds of thousands of objects, ' +
        'some of which rival Pluto in size and mass.',

        '**_Pluto_** is the largest known Kuiper Belt object by diameter. ' +
        'It has five moons, the largest of which — Charon — is so massive relative to Pluto ' +
        'that both bodies orbit a common center of mass located outside Pluto\'s surface. ' +
        'The heart of Pluto — a large bright plain of nitrogen ice called Tombaugh Regio — ' +
        'surprised even the mission scientists. ' +
        'The nitrogen ice slowly circulates in convective cells, churning like porridge in a pot, ' +
        'driven by heat rising from the dwarf planet\'s interior.',

        '**_Eris_** was discovered in the early twenty-first century and is nearly equal to Pluto in mass, ' +
        'though slightly smaller in diameter. ' +
        'Its discovery accelerated the International Astronomical Union\'s decision to reclassify Pluto: ' +
        'if Pluto were a planet, then Eris and several other objects would have to be planets too, ' +
        'breaking any sensible definition. ' +
        '**_Haumea_** stands out for its unusual elongated egg shape — the result of extremely rapid rotation. ' +
        'It completes one spin in less than four hours, which has stretched it along the equator. ' +
        'Haumea even has rings — the first rings ever found around a trans-Neptunian object. ' +
        '**_Makemake_** is another dwarf planet with a distinctive reddish color ' +
        'caused by complex organic molecules called tholins on its surface.',
      ],
    },

    {
      heading: 'Three Populations: Where These Objects Actually Live',
      level: 2,
      paragraphs: [
        'The Kuiper Belt and its neighboring zones are not uniform — researchers distinguish several groups of objects based on their orbital characteristics.',

        'The **_classical Kuiper Belt_** consists of objects with gently inclined and nearly circular orbits ' +
        'between roughly thirty and fifty astronomical units from the Sun. ' +
        'It divides into two subclasses. ' +
        'The "cold" classical population has nearly zero orbital inclination and most likely has never experienced strong gravitational disturbances — ' +
        'these are the most primitive bodies in the outer solar system. ' +
        'The "hot" classical population, despite similar distances, has significantly larger orbital inclinations, ' +
        'suggesting dynamical mixing in the distant past.',

        '**_Resonant objects_** are bodies whose orbital period stands in an exact integer ratio to Neptune\'s orbital period. ' +
        'Pluto and hundreds of similar bodies, collectively called plutinos, are in a two-to-three resonance with Neptune: ' +
        'for every two orbits Neptune completes, a plutino completes exactly three. ' +
        'This synchronization shields them from close approaches with Neptune ' +
        'and allows them to exist stably for billions of years.',

        'The **_scattered disk_** is the most chaotic zone, where orbits are highly elongated and can cross Neptune\'s orbit. ' +
        'Short-period comets originate here. ' +
        'Scattered disk objects underwent gravitational interactions with Neptune in the past ' +
        'and were "launched" onto extended orbits. ' +
        'Sedna is one of the most remarkable objects of this type: ' +
        'its orbit is so elongated that even its closest point to the Sun lies far beyond the classical Kuiper Belt, ' +
        'while its most distant point approaches the inner edge of the Oort Cloud.',
      ],
    },

    {
      diagram: {
        title: 'Outer Solar System Schematic (logarithmic distance scale)',
        svg: `<svg viewBox="0 0 620 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="620" height="340" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Sun -->
  <circle cx="60" cy="170" r="10" fill="#ff8844" opacity="0.9"/>
  <text x="60" y="193" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Sun</text>

  <!-- Inner planets zone (compressed) -->
  <line x1="70" y1="170" x2="105" y2="170" stroke="#667788" stroke-width="0.7" stroke-dasharray="3,2"/>
  <text x="87" y="165" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">1-5 AU</text>

  <!-- Neptune orbit marker -->
  <line x1="105" y1="130" x2="105" y2="210" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="105" y="225" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="8">Neptune</text>
  <text x="105" y="235" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="8">30 AU</text>

  <!-- Kuiper Belt zone -->
  <rect x="105" y="140" width="110" height="60" fill="#4488aa" opacity="0.15" rx="2"/>
  <rect x="105" y="140" width="110" height="60" fill="none" stroke="#4488aa" stroke-width="1" rx="2"/>
  <text x="160" y="158" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Kuiper Belt</text>
  <text x="160" y="170" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="8">30 — 50 AU</text>
  <!-- Pluto marker -->
  <circle cx="145" cy="185" r="3" fill="#aabbcc"/>
  <text x="145" y="197" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="8">Pluto</text>

  <!-- Scattered disk -->
  <rect x="215" y="148" width="80" height="44" fill="#cc4444" opacity="0.12" rx="2"/>
  <rect x="215" y="148" width="80" height="44" fill="none" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,2" rx="2"/>
  <text x="255" y="163" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Scattered</text>
  <text x="255" y="175" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Disk</text>
  <text x="255" y="186" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="8">50—2000 AU</text>

  <!-- Sedna marker -->
  <circle cx="295" cy="170" r="3" fill="#ff8844"/>
  <text x="295" y="160" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8">Sedna</text>

  <!-- Oort Cloud inner edge -->
  <line x1="370" y1="100" x2="370" y2="240" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="370" y="92" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">Inner Oort</text>
  <text x="370" y="248" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="8">2,000 AU</text>

  <!-- Oort Cloud zone -->
  <rect x="370" y="110" width="200" height="120" fill="#44ff88" opacity="0.07" rx="2"/>
  <rect x="370" y="110" width="200" height="120" fill="none" stroke="#44ff88" stroke-width="1" stroke-dasharray="5,3" rx="2"/>
  <text x="470" y="158" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="10">Oort Cloud</text>
  <text x="470" y="172" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="8">2,000 — 200,000 AU</text>

  <!-- Oort outer edge -->
  <line x1="570" y1="100" x2="570" y2="240" stroke="#44ff88" stroke-width="1" stroke-dasharray="2,3" opacity="0.5"/>
  <text x="570" y="92" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">Outer edge</text>
  <text x="570" y="248" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="8">~200,000 AU</text>

  <!-- Nearest star annotation -->
  <text x="570" y="268" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">~ 1/2 distance</text>
  <text x="570" y="278" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">to Alpha Centauri</text>

  <text x="310" y="310" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Logarithmic scale. Distances are approximate.</text>
</svg>`,
        caption: 'The outer solar system on a logarithmic scale. The Kuiper Belt occupies a comparatively narrow band; the scattered disk spans a far wider range; the Oort Cloud extends thousands of times farther still.',
      },
    },

    {
      heading: 'New Horizons: The First Close Looks',
      level: 2,
      paragraphs: [
        'For decades, everything we knew about Pluto and the Kuiper Belt ' +
        'came from telescope observations across a vast distance — ' +
        'objects appeared as shapeless blobs of pixels. ' +
        'The New Horizons mission changed that in 2015.',

        'In July 2015, the New Horizons spacecraft flew past Pluto at a closest approach of approximately 12,500 kilometers. ' +
        'The images that came back shocked even the mission scientists: ' +
        'instead of an ancient, heavily cratered surface, there was a geologically active dwarf world. ' +
        'The nitrogen glaciers of Tombaugh Regio flow in convective cells. ' +
        'Mountains several kilometers tall, made of water ice, rise at the plain\'s edge. ' +
        'An atmosphere exists — thin but real — with gaseous nitrogen slowly escaping into space on the solar wind. ' +
        'Pluto had turned out to be a living world, not a dead ball of ice.',

        'In 2019, New Horizons made another close approach — past Arrokoth, ' +
        'a small object in the cold classical Kuiper Belt. ' +
        'Arrokoth resembles two rounded lobes fused together into the shape of a flattened snowman. ' +
        'They merged very slowly and gently, which is unique evidence for primary accretion: ' +
        'this is how planetesimals in the early solar system assembled into planets. ' +
        'No craters from violent collisions are present — a clean imprint of a quiet coalescence.',
      ],
    },

    {
      image: {
        cacheKey: 'new-horizons-pluto-arrokoth',
        prompt:
          'Photorealistic illustration for a science encyclopedia: split image showing New Horizons discoveries — ' +
          'left half: Pluto close-up showing heart-shaped bright nitrogen ice plain Tombaugh Regio, water ice mountains at its edge, ' +
          'thin hazy blue atmosphere visible at limb, reddish-brown terrain, high scientific detail; ' +
          'right half: Arrokoth contact binary object, two reddish rounded lobes fused together like a snowman, ' +
          'smooth non-cratered surface, dark space background. ' +
          'Add the following text labels on the image: "Pluto", "Tombaugh Regio (nitrogen ice)", "Arrokoth", "Contact Binary".',
        alt: 'New Horizons mission images: Pluto with Tombaugh Regio heart and Arrokoth — a contact binary object',
        caption: 'Two breakthroughs from New Horizons: Pluto in 2015 proved geologically active, and Arrokoth in 2019 revealed what primary accretion looked like in the early solar system.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Short-Period Comets: Messengers from the Belt',
      level: 3,
      paragraphs: [
        'The Kuiper Belt and especially the scattered disk are the primary reservoir of short-period comets — ' +
        'those that orbit the Sun more frequently than once every two hundred years. ' +
        'Halley\'s Comet, the most famous of them, is a typical example: ' +
        'its orbital period is approximately seventy-five years, ' +
        'and it has returned to the inner solar system hundreds of times.',

        'The mechanism works like this: gravitational perturbations from Neptune gradually alter the orbits of certain scattered disk objects, ' +
        'pushing the perihelion — the point of closest approach to the Sun — into the inner solar system. ' +
        'When an icy object enters the zone where the Sun\'s heat reaches it, ' +
        'volatile substances begin to evaporate, ' +
        'forming a gaseous coma and a tail — ' +
        'exactly what we see as a comet.',
      ],
    },

    {
      heading: 'The Oort Cloud: A Hypothetical Sphere at the Edge',
      level: 2,
      paragraphs: [
        'The Oort Cloud is named for Dutch astronomer Jan Oort, ' +
        'who in the mid-twentieth century proposed its existence to explain long-period comets. ' +
        'These comets arrive from all directions — above, below, at any angle to the plane of the ecliptic — ' +
        'and have orbital periods ranging from thousands to millions of years. ' +
        'If they originated from the flat disk of the Kuiper Belt, ' +
        'they would arrive only within the plane of the ecliptic. ' +
        'Oort concluded that there must be a spherical reservoir of comets ' +
        'surrounding the solar system from every direction.',

        'The Oort Cloud has never been observed directly — none of our interplanetary missions has reached it, ' +
        'and none will for a very long time. ' +
        'Even the Voyager probes, launched in the late 1970s and already beyond the heliosphere, ' +
        'will not reach the inner edge of the Oort Cloud for several hundred years. ' +
        'Its existence is inferred indirectly, through analysis of long-period comet orbits ' +
        'and mathematical modeling of the solar system\'s dynamical evolution.',

        'Theoretical estimates place between three hundred billion and one trillion cometary nuclei in the Oort Cloud. ' +
        'The orbits of these bodies are so weakly bound by the Sun\'s gravity ' +
        'that passing stars, the gravitational tidal pull of the Galaxy, or large molecular clouds ' +
        'can perturb them — sending some on a free journey toward other stars ' +
        'and others into a long plunge down into the inner solar system.',
      ],
    },

    {
      image: {
        cacheKey: 'oort-cloud-scale-diagram',
        prompt:
          'Photorealistic illustration for a science encyclopedia: scale comparison diagram of the solar system versus the Oort Cloud — ' +
          'at center a tiny bright dot representing the Sun and planets, surrounded by a small disk (Kuiper Belt) labeled, ' +
          'and then an enormous diffuse glowing spherical halo (Oort Cloud) taking up most of the frame in dim blue-grey tones, ' +
          'sparse comet-like objects shown at the sphere edges, dark space background, scientific accuracy. ' +
          'Add the following text labels on the image: "Inner Solar System", "Kuiper Belt", "Oort Cloud (hypothetical)", "Long-period comet path".',
        alt: 'Scale comparison: the solar system and the Oort Cloud — the inner system appears tiny relative to the sphere',
        caption: 'Relative scale: the entire inner solar system together with the Kuiper Belt occupies less than one percent of the Oort Cloud\'s radius.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Long-Period Comets: Visitors from the Depths',
      level: 3,
      paragraphs: [
        'Long-period comets — those that orbit the Sun less frequently than once every two hundred years — ' +
        'are thought to originate in the Oort Cloud. ' +
        'Some have never come close to the Sun since the solar system formed: ' +
        'their memory reaches back four and a half billion years. ' +
        'The chemical composition of such comets is a unique archive of the primordial material ' +
        'from which the early solar system was made.',

        'Some comets arriving from the Oort Cloud make only a single pass through the inner solar system, ' +
        'after which they gain enough energy from gravitational interactions ' +
        'to leave the solar system forever, becoming interstellar travelers. ' +
        'This process is one of the mechanisms by which material from one stellar system can reach another.',
      ],
    },

    {
      diagram: {
        title: 'Distribution of Trans-Neptunian Object Populations by Orbital Type',
        svg: `<svg viewBox="0 0 580 320" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="580" height="320" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Title of axes -->
  <text x="290" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Trans-Neptunian Object Populations</text>

  <!-- Y axis -->
  <line x1="80" y1="40" x2="80" y2="270" stroke="#667788" stroke-width="1"/>
  <text x="35" y="160" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9" transform="rotate(-90, 35, 160)">Orbital Inclination</text>

  <!-- X axis -->
  <line x1="80" y1="270" x2="540" y2="270" stroke="#667788" stroke-width="1"/>
  <text x="310" y="295" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Distance from Sun (astronomical units)</text>

  <!-- X axis labels -->
  <text x="130" y="283" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">30</text>
  <text x="220" y="283" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">39-48</text>
  <text x="320" y="283" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">50+</text>
  <text x="440" y="283" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">100+</text>

  <!-- Neptune line -->
  <line x1="130" y1="40" x2="130" y2="270" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>
  <text x="130" y="36" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="8">Neptune (30)</text>

  <!-- Cold classical KBO cluster - low inclination, 42-48 AU -->
  <ellipse cx="215" cy="240" rx="35" ry="20" fill="#44ff88" opacity="0.25"/>
  <ellipse cx="215" cy="240" rx="35" ry="20" fill="none" stroke="#44ff88" stroke-width="1"/>
  <text x="215" y="238" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">Cold</text>
  <text x="215" y="248" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">Classical KB</text>

  <!-- Hot classical KBO - higher inclination -->
  <ellipse cx="210" cy="175" rx="40" ry="28" fill="#7bb8ff" opacity="0.18"/>
  <ellipse cx="210" cy="175" rx="40" ry="28" fill="none" stroke="#7bb8ff" stroke-width="1"/>
  <text x="210" y="173" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="8">Hot</text>
  <text x="210" y="183" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="8">Classical KB</text>

  <!-- Plutinos (resonant 2:3) -->
  <ellipse cx="160" cy="200" rx="22" ry="35" fill="#ff8844" opacity="0.22"/>
  <ellipse cx="160" cy="200" rx="22" ry="35" fill="none" stroke="#ff8844" stroke-width="1"/>
  <text x="160" y="196" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8">Plutinos</text>
  <text x="160" y="207" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8">(2:3 res.)</text>
  <!-- Pluto dot -->
  <circle cx="155" cy="220" r="4" fill="#aabbcc"/>
  <text x="170" y="223" fill="#aabbcc" font-family="monospace" font-size="8">Pluto</text>

  <!-- Scattered disk - wide range, high eccentricity -->
  <rect x="295" y="70" width="160" height="170" fill="#cc4444" opacity="0.10" rx="3"/>
  <rect x="295" y="70" width="160" height="170" fill="none" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,2" rx="3"/>
  <text x="375" y="130" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Scattered</text>
  <text x="375" y="142" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Disk</text>
  <!-- Sedna marker -->
  <circle cx="440" cy="210" r="4" fill="#ff8844"/>
  <text x="448" y="213" fill="#ff8844" font-family="monospace" font-size="8">Sedna</text>

  <!-- Y axis ticks (inclination) -->
  <line x1="76" y1="270" x2="80" y2="270" stroke="#667788" stroke-width="1"/>
  <text x="70" y="273" text-anchor="end" fill="#667788" font-family="monospace" font-size="8">0°</text>
  <line x1="76" y1="200" x2="80" y2="200" stroke="#667788" stroke-width="1"/>
  <text x="70" y="203" text-anchor="end" fill="#667788" font-family="monospace" font-size="8">20°</text>
  <line x1="76" y1="130" x2="80" y2="130" stroke="#667788" stroke-width="1"/>
  <text x="70" y="133" text-anchor="end" fill="#667788" font-family="monospace" font-size="8">40°</text>
  <line x1="76" y1="60" x2="80" y2="60" stroke="#667788" stroke-width="1"/>
  <text x="70" y="63" text-anchor="end" fill="#667788" font-family="monospace" font-size="8">60°</text>

  <text x="290" y="312" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">KB = Kuiper Belt. Schematic only, not to scale.</text>
</svg>`,
        caption: 'Distribution of trans-Neptunian objects by orbital inclination and distance. The cold classical Kuiper Belt clusters at low inclinations between roughly 42 and 48 astronomical units. The scattered disk occupies a broad range of distances and inclinations.',
      },
    },

    {
      heading: 'The Planet Nine Hypothesis',
      level: 2,
      paragraphs: [
        'In 2016, astronomers Michael Brown and Konstantin Batygin announced the possible existence ' +
        'of a large undiscovered planet in the outer solar system. ' +
        'Their reasoning stemmed from an unusual symmetry in the orbits of several extreme trans-Neptunian objects — ' +
        'including Sedna. ' +
        'Those orbits were found to be clustered in the same direction, ' +
        'as if shaped by a shared gravitational influence.',

        'The statistical probability of such alignment occurring by chance is very small. ' +
        'Brown and Batygin proposed that the cause is an as-yet-undiscovered planet with a mass several times that of Earth, ' +
        'moving on a highly elongated orbit at distances from a few hundred to a few thousand astronomical units from the Sun. ' +
        'By their calculations, it is so far away that it reflects almost no sunlight ' +
        'and has not appeared in any sky survey conducted so far.',

        'The hypothesis remains debated. Several researchers have argued ' +
        'that the clustering of orbits may be an artifact of observational bias — ' +
        'we simply detect objects with certain orbital geometries more easily than others. ' +
        'The answer should come from the Vera Rubin Observatory: ' +
        'having begun full science operations in the mid-2020s, ' +
        'it will discover tens of thousands of new trans-Neptunian objects within a few years of surveying. ' +
        'If orbital clustering is confirmed across a much larger sample, ' +
        'the case for Planet Nine will become substantially stronger.',
      ],
    },

    {
      image: {
        cacheKey: 'planet-nine-hypothesis',
        prompt:
          'Photorealistic illustration for a science encyclopedia: outer solar system showing hypothetical Planet Nine — ' +
          'a dark blue-grey distant planet far in the background, faint sunlight barely illuminating it, ' +
          'extreme trans-Neptunian objects shown as small dots with elongated orbital paths all clustered in same direction, ' +
          'Neptune visible as a smaller blue dot much closer to center, dark deep space with stars. ' +
          'Add the following text labels on the image: "Neptune", "Extreme TNOs (clustered orbits)", "Hypothetical Planet Nine", "Sun (distant)".',
        alt: 'Illustration of the hypothetical Planet Nine and the clustered orbits of extreme trans-Neptunian objects',
        caption: 'If the Brown-Batygin hypothesis is correct, Planet Nine is a cold dark giant at the outermost edge of the solar system, invisible to current telescopes.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Vera Rubin Observatory and the Future of Research',
      level: 2,
      paragraphs: [
        'Much of what we know about the Kuiper Belt has been built from a comparatively small number of detected objects — ' +
        'a few thousand confirmed trans-Neptunian bodies out of the billions that exist there. ' +
        'The Vera Rubin Observatory in Chile, which entered full science operations in the mid-2020s, ' +
        'is changing that situation fundamentally.',

        'The decade-long sky survey conducted by the Rubin Observatory ' +
        'covers the entire visible sky every few nights with unprecedented depth. ' +
        'Estimates suggest it will find between ten thousand and one hundred thousand new trans-Neptunian objects — ' +
        'orders of magnitude more than are known today. ' +
        'This will allow statistical testing of the Planet Nine hypothesis, ' +
        'a much sharper understanding of the mass and orbital distributions across different populations, ' +
        'and the discovery of new dwarf planets comparable in size to Pluto or larger.',

        'Meanwhile, New Horizons, if its power supply and propellant allow, ' +
        'may encounter additional Kuiper Belt objects in the years ahead. ' +
        'The outer frontier of the solar system has only begun to reveal its secrets.',
      ],
    },

    {
      image: {
        cacheKey: 'vera-rubin-observatory-night',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Vera Rubin Observatory at night in Chile — ' +
          'large telescope dome on mountain top, Milky Way visible overhead in wide-angle view, ' +
          'observatory dome partially open with telescope visible inside, dramatic night sky full of stars, ' +
          'dark landscape, high scientific detail, cinematic composition. ' +
          'Add the following text labels on the image: "Vera Rubin Observatory", "Simonyi Survey Telescope", "Milky Way".',
        alt: 'Vera Rubin Observatory in Chile — a new sky survey that will discover thousands of trans-Neptunian objects',
        caption: 'The Vera Rubin Observatory in Chile and its Simonyi Survey Telescope are conducting the deepest systematic sky survey in history. Over a decade it will discover orders of magnitude more trans-Neptunian objects than are known today.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Astronomical unit',
      definition: 'A unit of distance equal to the average distance from Earth to the Sun — approximately 150 million kilometers. Used to express distances within the solar system.',
    },
    {
      term: 'Trans-Neptunian object',
      definition: 'Any body in the solar system whose average orbit lies farther from the Sun than Neptune\'s orbit. Includes objects in the Kuiper Belt, scattered disk, and inner Oort Cloud.',
    },
    {
      term: 'Orbital resonance',
      definition: 'A condition in which the orbital periods of two bodies are related by a simple integer ratio. Plutinos are in a two-to-three resonance with Neptune: for every two Neptune orbits, they complete exactly three.',
    },
    {
      term: 'Plutino',
      definition: 'A class of trans-Neptunian objects in a two-to-three orbital resonance with Neptune — the same resonance as Pluto. The resonance stabilizes their orbits and protects them from close encounters with Neptune.',
    },
    {
      term: 'Scattered disk',
      definition: 'A region of the outer solar system containing objects with highly elongated and inclined orbits — the result of past gravitational interactions with Neptune. It is the primary source of short-period comets.',
    },
    {
      term: 'Dwarf planet',
      definition: 'A solar system body massive enough for self-gravity to pull it into a roughly spherical shape, but one that has not "cleared" the neighborhood of its orbit of other bodies. Pluto, Eris, Haumea, and Makemake are dwarf planets.',
    },
    {
      term: 'Contact binary',
      definition: 'An object consisting of two bodies that merged in a very slow, gentle encounter. Arrokoth is an example of a primordial contact binary from the Kuiper Belt, preserving its shape from the era of solar system formation.',
    },
    {
      term: 'Vera Rubin Observatory',
      definition: 'A large survey telescope in Chile that from the mid-2020s is conducting a decade-long survey of the entire visible sky. Expected to discover tens of thousands of new trans-Neptunian objects.',
    },
    {
      term: 'Long-period comet',
      definition: 'A comet with an orbital period exceeding two hundred years, thought to originate in the Oort Cloud. Some have orbital periods of millions of years and have never previously approached the Sun.',
    },
    {
      term: 'Tholins',
      definition: 'Complex organic molecules that form on the surfaces of icy bodies under ultraviolet and X-ray radiation. They give the surfaces of Pluto, Makemake, and other trans-Neptunian objects their characteristic reddish color.',
    },
  ],

  quiz: [
    {
      question: 'What distinguishes the "cold" classical Kuiper Belt population from the "hot" classical population?',
      options: [
        'The cold population is physically colder — surface temperatures are hundreds of degrees lower',
        'The cold population has nearly circular orbits with low inclination; the hot population has significantly inclined orbits',
        'The cold population is closer to the Sun and consists of smaller objects',
        'The hot population consists of comets, the cold population of asteroids',
      ],
      correctIndex: 1,
      explanation: 'In this context "cold" and "hot" are orbital descriptors, not temperature measurements. The cold classical population has small inclinations and eccentricities and most likely has never been significantly disturbed gravitationally. The hot classical population underwent dynamical mixing in the distant past.',
    },
    {
      question: 'Why is the Oort Cloud considered the source of long-period comets rather than short-period comets?',
      options: [
        'The Oort Cloud is closer to the Sun and its objects return more frequently',
        'Oort Cloud objects have orbits in all directions, and comets from there return once every thousands to millions of years',
        'Short-period comets form in the inner asteroid belt between Mars and Jupiter',
        'The Oort Cloud consists of gravel rather than ice and so produces no comets',
      ],
      correctIndex: 1,
      explanation: 'The Oort Cloud lies at distances from two thousand to two hundred thousand astronomical units. Objects on such orbits return to the Sun only after thousands or millions of years — hence the long-period character of these comets. They also arrive from all directions rather than only from the plane of the ecliptic, which led Oort to propose a spherical reservoir.',
    },
    {
      question: 'What did the New Horizons mission discover during its Arrokoth flyby in 2019?',
      options: [
        'Active geysers on the surface, similar to those on Triton',
        'A contact binary object that provides insight into primary accretion in the early solar system',
        'A dwarf planet with its own moon and magnetic field',
        'A complex molecular atmosphere containing organic gases',
      ],
      correctIndex: 1,
      explanation: 'Arrokoth turned out to be a contact binary: two rounded lobes that merged very slowly. The absence of craters from violent impacts and the character of its shape point to a gentle, primary coalescence — the same accretion process by which planetesimals assembled into planets in the early solar system.',
    },
    {
      question: 'What is the primary basis for the Planet Nine hypothesis proposed in 2016?',
      options: [
        'A direct observation of a large dark body at the edge of the solar system in 2014',
        'An unusual clustering of orbits of several extreme trans-Neptunian objects in the same direction',
        'A calculated discrepancy between the Oort Cloud\'s mass and the number of long-period comets',
        'Anomalies in Neptune\'s orbit suggesting perturbation by a massive unseen object',
      ],
      correctIndex: 1,
      explanation: 'In 2016, Brown and Batygin noticed that the orbits of several extreme trans-Neptunian objects — with perihelia far beyond the classical Kuiper Belt — were aligned in the same direction. The probability of such alignment occurring by chance is statistically very low. The hypothesis remains unconfirmed.',
    },
    {
      question: 'Why was Pluto reclassified from a planet to a dwarf planet in 2006?',
      options: [
        'It was discovered that Pluto is made of ice rather than rock and therefore cannot be a planet',
        'The discovery of Eris and hundreds of comparable objects showed that Pluto has not "cleared" its orbital zone',
        'New measurements showed Pluto is smaller than the Moon and cannot qualify as a planet',
        'The New Horizons mission found that Pluto does not have a spherical shape',
      ],
      correctIndex: 1,
      explanation: 'A key criterion under the International Astronomical Union definition is that a planet must have "cleared the neighborhood" of its orbit of other bodies. Pluto shares its orbital zone with thousands of Kuiper Belt objects and therefore fails this criterion. Eris — a comparable body in mass — made the reclassification question urgent.',
    },
  ],

  sources: [
    {
      title: 'New Horizons — NASA Science Mission',
      url: 'https://science.nasa.gov/mission/new-horizons/',
      meta: 'Official NASA New Horizons mission page',
    },
    {
      title: 'Pluto in Depth — NASA Solar System Exploration',
      url: 'https://science.nasa.gov/dwarf-planets/pluto/',
      meta: 'NASA Solar System Exploration',
    },
    {
      title: 'Kuiper Belt — NASA Solar System Exploration',
      url: 'https://science.nasa.gov/solar-system/kuiper-belt/',
      meta: 'NASA Solar System Exploration',
    },
    {
      title: 'Stern et al. (2015) — The Pluto System: Initial Results from Reconnaissance',
      url: 'https://www.science.org/doi/10.1126/science.aad1815',
      meta: 'Science, 2015',
    },
    {
      title: 'Stern et al. (2019) — Initial Results from the New Horizons Exploration of 2014 MU69',
      url: 'https://www.science.org/doi/10.1126/science.aaw9771',
      meta: 'Science, 2019 (Arrokoth flyby)',
    },
    {
      title: 'Batygin & Brown (2016) — Evidence for a Distant Giant Planet in the Solar System',
      url: 'https://iopscience.iop.org/article/10.3847/0004-6256/151/2/22',
      meta: 'The Astronomical Journal, 2016 (Planet Nine hypothesis)',
    },
    {
      title: 'Rubin Observatory / LSST Overview',
      url: 'https://www.lsst.org/about',
      meta: 'Vera Rubin Observatory official site',
    },
    {
      title: 'Oort (1950) — The structure of the cloud of comets surrounding the Solar System',
      url: 'https://ui.adsabs.harvard.edu/abs/1950BAN....11...91O',
      meta: 'Bulletin of the Astronomical Institutes of the Netherlands, 1950',
    },
    {
      title: 'Jewitt & Luu (1993) — Discovery of the candidate Kuiper belt object 1992 QB1',
      url: 'https://www.nature.com/articles/362730a0',
      meta: 'Nature, 1993 (first confirmed Kuiper Belt object beyond Pluto)',
    },
    {
      title: 'IAU Resolution B5 — Definition of a Planet (2006)',
      url: 'https://www.iau.org/news/pressreleases/detail/iau0603/',
      meta: 'IAU, August 2006',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
