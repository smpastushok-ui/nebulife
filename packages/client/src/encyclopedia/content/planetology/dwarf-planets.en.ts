import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'dwarf-planets',
  language: 'en',
  section: 'planetology',
  order: 5,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Dwarf Planets',
  subtitle: 'How redefining one word reshaped the solar system — and why Pluto is no longer a planet.',

  hero: {
    cacheKey: 'dwarf-planets-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: five dwarf planets of the solar system shown together in space — ' +
      'Pluto (grey-tan with heart-shaped bright nitrogen plain), Eris (pale grey icy world), ' +
      'Ceres (cratered grey spherical body), Haumea (elongated egg-shaped icy body), Makemake (reddish-brown icy world), ' +
      'dark space background with stars and distant Sun, relative sizes approximately correct, scientific accuracy, cinematic composition. ' +
      'Add the following text labels on the image: "Pluto", "Eris", "Ceres", "Haumea", "Makemake".',
    alt: 'The five official dwarf planets of the solar system — Pluto, Eris, Ceres, Haumea, and Makemake',
    caption: 'Five bodies officially recognized as dwarf planets by the International Astronomical Union: Ceres in the asteroid belt and four Kuiper Belt objects. Sizes shown are approximate.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'At the start of the twenty-first century, astronomers faced an uncomfortable question: if Pluto is a planet, ' +
        'what do we do with Eris — a body discovered in 2005 that turned out to be more massive than Pluto? ' +
        'And with the dozens of other objects that could satisfy the same criteria? ' +
        'The answer the scientific community gave in 2006 redrew the map of the solar system ' +
        'and ignited a controversy that has not quieted since.',

        'The International Astronomical Union — the organization that unites thousands of astronomers from around the world — ' +
        'adopted a new official definition of a planet. ' +
        'It emerged that Pluto, discovered in 1930, failed to satisfy one of the three required criteria. ' +
        'It became the first body to receive a new category: **_dwarf planet_**. ' +
        'Today five such bodies are officially recognized — and each is a remarkable world in its own right.',
      ],
    },

    {
      heading: 'What Is a Dwarf Planet: Three Criteria',
      level: 2,
      paragraphs: [
        'To qualify as a planet under the International Astronomical Union\'s 2006 definition, ' +
        'a body must satisfy three conditions: it must orbit the Sun, ' +
        'have sufficient mass to assume a nearly spherical shape under its own gravity, ' +
        'and — most critically — **_have cleared the neighborhood around its orbit_** of other debris. ' +
        'It is this third criterion that separates planets from dwarf planets.',

        'The major planets — Jupiter, Saturn, Earth — long ago swept up, absorbed, or gravitationally dominated ' +
        'most of the material along their orbits. Pluto has not done this: ' +
        'it shares the Kuiper Belt with thousands of similar objects and is merely the largest among them. ' +
        'The same applies to Ceres in the asteroid belt.',

        'A dwarf planet, by the union\'s definition, orbits the Sun and is in hydrostatic equilibrium — ' +
        'that is, it is rounded by its own gravity — but has not cleared its orbital neighborhood. ' +
        'Moons of planets do not belong to this category, even when they are large.',
      ],
    },

    {
      diagram: {
        title: 'Classification Criteria for Solar System Bodies (International Astronomical Union, 2006)',
        svg: `<svg viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="560" height="340" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Start node -->
  <rect x="190" y="14" width="180" height="32" rx="3" fill="none" stroke="#aabbcc" stroke-width="1.2"/>
  <text x="280" y="35" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Does it orbit the Sun?</text>

  <!-- Yes arrow down -->
  <line x1="280" y1="46" x2="280" y2="78" stroke="#44ff88" stroke-width="1.2"/>
  <text x="286" y="67" fill="#44ff88" font-family="monospace" font-size="10">yes</text>

  <!-- Round shape node -->
  <rect x="160" y="78" width="240" height="32" rx="3" fill="none" stroke="#aabbcc" stroke-width="1.2"/>
  <text x="280" y="99" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Rounded by its own gravity?</text>

  <!-- No arrow right -->
  <line x1="400" y1="94" x2="448" y2="94" stroke="#cc4444" stroke-width="1.2"/>
  <text x="405" y="89" fill="#cc4444" font-family="monospace" font-size="10">no</text>
  <rect x="448" y="78" width="96" height="32" rx="3" fill="rgba(30,10,10,0.6)" stroke="#cc4444" stroke-width="1"/>
  <text x="496" y="96" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="10">Small body /</text>
  <text x="496" y="108" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="10">asteroid</text>

  <!-- Yes arrow down -->
  <line x1="280" y1="110" x2="280" y2="142" stroke="#44ff88" stroke-width="1.2"/>
  <text x="286" y="131" fill="#44ff88" font-family="monospace" font-size="10">yes</text>

  <!-- Cleared orbit node -->
  <rect x="140" y="142" width="280" height="32" rx="3" fill="none" stroke="#aabbcc" stroke-width="1.2"/>
  <text x="280" y="163" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Cleared its orbital neighborhood?</text>

  <!-- Yes arrow to planet -->
  <line x1="280" y1="174" x2="280" y2="224" stroke="#44ff88" stroke-width="1.2"/>
  <text x="286" y="203" fill="#44ff88" font-family="monospace" font-size="10">yes</text>
  <rect x="200" y="224" width="160" height="36" rx="3" fill="rgba(10,40,20,0.7)" stroke="#44ff88" stroke-width="1.4"/>
  <text x="280" y="247" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="12" font-weight="bold">PLANET</text>
  <text x="280" y="260" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Earth, Jupiter, etc.</text>

  <!-- No arrow to dwarf planet -->
  <line x1="140" y1="158" x2="86" y2="158" stroke="#ff8844" stroke-width="1.2"/>
  <line x1="86" y1="158" x2="86" y2="224" stroke="#ff8844" stroke-width="1.2"/>
  <line x1="86" y1="224" x2="130" y2="224" stroke="#ff8844" stroke-width="1.2"/>
  <text x="56" y="152" fill="#ff8844" font-family="monospace" font-size="10">no</text>
  <rect x="130" y="210" width="70" height="28" rx="3" fill="rgba(40,20,5,0.7)" stroke="#ff8844" stroke-width="1.4"/>
  <text x="165" y="228" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">DWARF</text>
  <text x="165" y="240" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">PLANET</text>

  <!-- Examples below dwarf -->
  <text x="86" y="280" fill="#8899aa" font-family="monospace" font-size="9">Pluto, Eris,</text>
  <text x="86" y="292" fill="#8899aa" font-family="monospace" font-size="9">Ceres, Haumea,</text>
  <text x="86" y="304" fill="#8899aa" font-family="monospace" font-size="9">Makemake</text>

  <text x="280" y="326" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Simplified diagram. Moons of planets are excluded.</text>
</svg>`,
        caption: 'Flowchart of the International Astronomical Union 2006 criteria. The key branch — clearing the orbital neighborhood — separates planets from dwarf planets.',
      },
    },

    {
      heading: 'Ceres: The Nearest Dwarf Planet',
      level: 2,
      paragraphs: [
        '**_Ceres_** was discovered in 1801 — the first of all bodies now classified as dwarf planets. ' +
        'For nearly two centuries it was considered variously a planet and then simply the largest asteroid ' +
        'in the belt between Mars and Jupiter. ' +
        'The shift to a new category in 2006 restored a degree of distinction: ' +
        'it is the only dwarf planet in the inner solar system.',

        'In 2015, the robotic spacecraft Dawn became the first to enter orbit around a dwarf planet. ' +
        'The images of Ceres revealed something unexpected: several bright spots inside the crater Occator. ' +
        'Analysis showed them to be salt deposits — sodium carbonates that had welled up from liquid water below. ' +
        'Dawn\'s data indicate that beneath the surface of Ceres there may be a small reservoir of salty liquid water, ' +
        'possibly mixed with ammonia that lowers the freezing point. ' +
        'This made Ceres an unexpected candidate for harboring liquid water in the asteroid belt.',

        'Ceres is small — its diameter is approximately 940 kilometers, roughly a quarter of the Moon\'s. ' +
        'But for an asteroid belt object it is massive: it contains approximately one third of the entire mass of the belt.',
      ],
    },

    {
      image: {
        cacheKey: 'dwarf-planets-ceres-bright-spots',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Ceres dwarf planet from orbit, ' +
          'grey cratered spherical surface, prominent bright white spots visible in the large Occator crater — ' +
          'sodium carbonate salt deposits reflecting sunlight — dark space background, ' +
          'NASA Dawn spacecraft image style, high detail, scientific accuracy. ' +
          'Add the following text labels on the image: "Occator Crater", "Salt Deposits (bright spots)", "Ceres", "Dawn spacecraft view 2015".',
        alt: 'Ceres from orbit — bright salt deposits in Occator Crater on a grey cratered surface',
        caption: 'The bright spots in Occator Crater are sodium carbonate deposits that welled up from subsurface brine. Discovered by the Dawn mission in 2015.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Pluto: From Planet to New Horizons',
      level: 2,
      paragraphs: [
        'Pluto was discovered by American astronomer Clyde Tombaugh in 1930 — ' +
        'and for seventy-six years it was considered the ninth planet of the solar system. ' +
        'It resides in the Kuiper Belt, a ring of icy bodies beyond Neptune\'s orbit. ' +
        'It turned out to be the largest known object in that belt, but only one among thousands.',

        'The discovery of Eris in 2005 was the decisive catalyst. ' +
        'Eris was not simply similar to Pluto — it proved to be more massive. ' +
        'If Pluto is a planet, is Eris one too? And if so, how many more planets might the Kuiper Belt contain? ' +
        'The International Astronomical Union faced a clear dilemma: ' +
        'either add new planets, or redefine the concept itself. ' +
        'At the General Assembly of 2006, the majority of delegates voted for redefinition.',

        'The 2006 decision provoked a wave of public outrage. ' +
        'Pluto had accompanied an entire generation — it appeared on school posters ' +
        'and in the hopes of researchers who had studied it for decades. ' +
        'Some scientists, particularly those involved in planetary geology, still reject the new classification. ' +
        'But the scientific logic of the new definition is sound: ' +
        'Pluto has not cleared its orbit — it shares the Kuiper Belt with billions of other bodies.',
      ],
    },

    {
      heading: 'New Horizons: A First Look at Pluto',
      level: 3,
      paragraphs: [
        'In 2015, the American probe New Horizons completed the first flyby of Pluto ' +
        'after nine and a half years of travel. What it sent back overturned every prior expectation.',

        'The surface of Pluto proved strikingly varied. ' +
        'The most prominent feature is a large heart-shaped plain near the equator, ' +
        'named after the discoverer: **_Tombaugh Regio_**. ' +
        'It is blanketed in nitrogen ice, has no impact craters, and is geologically young — ' +
        'still active in the geological recent past. ' +
        'Alongside it rise mountains of water ice up to three and a half kilometers tall. ' +
        'Nobody had expected to find such a geologically vibrant landscape on a body with no tidal heating from a nearby large planet.',

        'Pluto\'s atmosphere is thin but real: mostly nitrogen, with methane and carbon monoxide. ' +
        'At the time of the flyby it extended thousands of kilometers above the surface — ' +
        'far higher than predicted. ' +
        'Ultraviolet light converts methane into complex organic molecules ' +
        'that give the surface its characteristic reddish-brown tones.',
      ],
    },

    {
      image: {
        cacheKey: 'dwarf-planets-pluto-tombaugh',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Pluto close-up from New Horizons spacecraft, ' +
          'showing the large heart-shaped Tombaugh Regio nitrogen ice plain in light tan and white, ' +
          'surrounding rugged terrain with water-ice mountains and darker reddish-brown areas, ' +
          'thin atmospheric haze visible at the limb, dark space background, scientific accuracy, ' +
          'NASA New Horizons 2015 image style. ' +
          'Add the following text labels on the image: "Tombaugh Regio (nitrogen ice)", "Water-ice mountains", "Atmospheric haze", "Pluto".',
        alt: 'Pluto from New Horizons — the heart-shaped Tombaugh Regio plain and water-ice mountains',
        caption: 'The first detailed image of Pluto, returned in 2015 by the New Horizons probe. The heart-shaped Tombaugh Regio is a geologically young nitrogen-ice plain without impact craters.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Charon: A Double System',
      level: 3,
      paragraphs: [
        'Pluto has five known moons. The largest — **_Charon_** — is so large relative to Pluto ' +
        'that scientists often describe them as a double system. ' +
        'Charon is approximately half Pluto\'s diameter — ' +
        'a record ratio among known body-moon pairs in the solar system. ' +
        'Both bodies permanently face each other with the same hemisphere, ' +
        'rotating synchronously around a shared center of mass that lies between them — ' +
        'formally outside Pluto itself.',

        'Charon proved to be something of an archive: its surface is covered by older cratered terrain, ' +
        'with a dark red polar cap informally called "Mordor." ' +
        'This is thought to be organic compounds transported from Pluto\'s atmosphere: ' +
        'gas escapes Pluto, reaches Charon, and freezes there. ' +
        'New Horizons captured this for the first time — demonstrating a tight chemical bond between the two bodies in the pair.',
      ],
    },

    {
      heading: 'Eris, Haumea, and Makemake',
      level: 2,
      paragraphs: [
        '**_Eris_** is the most distant of the five officially recognized dwarf planets and the most massive after Pluto. ' +
        'Its discovery in 2005 was what set the reclassification of the entire system in motion. ' +
        'It orbits so far from the Sun that one complete revolution takes more than five and a half Earth centuries. ' +
        'Eris\'s surface is coated in methane ice and reflects sunlight almost as efficiently as fresh snow — ' +
        'one of the highest albedo surfaces in the solar system.',

        '**_Haumea_** stands apart for its shape: it is elongated like an egg because of extraordinarily rapid rotation — ' +
        'one full rotation around its axis takes only about four hours. ' +
        'For an object of its size, that is a record speed. ' +
        'In 2017, astronomers discovered a ring around Haumea — ' +
        'the first known ring among dwarf planets. ' +
        'It also has two moons, Hi\'iaka and Namaka.',

        '**_Makemake_** is the third largest Kuiper Belt dwarf planet after Eris and Pluto. ' +
        'Its surface is coated in methane and nitrogen ice with a pinkish-brown tint. ' +
        'Makemake has a small moon, discovered by the Hubble Space Telescope in 2016. ' +
        'It appears to have essentially no atmosphere — or one that is extremely tenuous.',
      ],
    },

    {
      image: {
        cacheKey: 'dwarf-planets-kuiper-belt-four',
        prompt:
          'Photorealistic illustration for a science encyclopedia: four Kuiper Belt dwarf planets shown in space — ' +
          'Eris (pale icy grey sphere), Haumea (elongated egg-shaped body with faint ring), ' +
          'Makemake (reddish-brown icy sphere), and Pluto (grey-tan with heart-shaped bright region) — ' +
          'distant Sun visible, dark space background with stars, relative sizes approximately accurate. ' +
          'Add the following text labels on the image: "Eris", "Haumea (with ring)", "Makemake", "Pluto".',
        alt: 'Four Kuiper Belt dwarf planets — Eris, Haumea, Makemake, and Pluto',
        caption: 'Four Kuiper Belt dwarf planets compared. All are significantly smaller than Earth\'s Moon and orbit beyond Neptune.',
        aspectRatio: '4:3',
      },
    },

    {
      diagram: {
        title: 'Size Comparison of Dwarf Planets and the Moon',
        svg: `<svg viewBox="0 0 580 220" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="580" height="220" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Moon reference (diameter ~3474km → scaled ~54px radius) -->
  <circle cx="60" cy="110" r="54" fill="#667788" opacity="0.35"/>
  <circle cx="60" cy="110" r="54" fill="none" stroke="#667788" stroke-width="1.2"/>
  <text x="60" y="114" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Moon</text>
  <text x="60" y="176" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">3,474 km</text>

  <!-- Pluto ~2376km → scaled ~34px -->
  <circle cx="166" cy="120" r="34" fill="#cc8844" opacity="0.45"/>
  <circle cx="166" cy="120" r="34" fill="none" stroke="#cc8844" stroke-width="1.2"/>
  <text x="166" y="124" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="10">Pluto</text>
  <text x="166" y="166" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">2,376 km</text>

  <!-- Eris ~2326km → scaled ~33px -->
  <circle cx="252" cy="121" r="33" fill="#aabbcc" opacity="0.3"/>
  <circle cx="252" cy="121" r="33" fill="none" stroke="#aabbcc" stroke-width="1.2"/>
  <text x="252" y="125" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Eris</text>
  <text x="252" y="165" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">~2,326 km</text>

  <!-- Makemake ~1430km → scaled ~20px -->
  <circle cx="328" cy="130" r="20" fill="#7bb8ff" opacity="0.35"/>
  <circle cx="328" cy="130" r="20" fill="none" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="328" y="163" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Makemake</text>
  <text x="328" y="175" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">~1,430 km</text>

  <!-- Haumea — elongated, major axis ~1632km → rx~23, ry~14 -->
  <ellipse cx="398" cy="134" rx="23" ry="14" fill="#44ff88" opacity="0.3"/>
  <ellipse cx="398" cy="134" rx="23" ry="14" fill="none" stroke="#44ff88" stroke-width="1.2"/>
  <text x="398" y="162" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Haumea</text>
  <text x="398" y="174" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">~1,632 km (axis)</text>

  <!-- Ceres ~940km → scaled ~13px -->
  <circle cx="458" cy="137" r="13" fill="#ff8844" opacity="0.45"/>
  <circle cx="458" cy="137" r="13" fill="none" stroke="#ff8844" stroke-width="1.2"/>
  <text x="458" y="163" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Ceres</text>
  <text x="458" y="175" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">940 km</text>

  <!-- Labels top -->
  <text x="290" y="18" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Size comparison (approximate diameters)</text>
  <text x="290" y="205" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Not to scale with orbital distances. Moon shown for reference.</text>
</svg>`,
        caption: 'Relative sizes of the five official dwarf planets compared to the Moon. Pluto and Eris are the largest; Ceres is the smallest and the only one in the inner solar system.',
      },
    },

    {
      heading: 'Sedna and Other Candidates',
      level: 2,
      paragraphs: [
        'The five officially recognized dwarf planets are only the tip of the iceberg. ' +
        'Astronomers have identified more than one hundred bodies that likely meet the criteria: ' +
        'massive enough to be rounded, but unable to clear their orbits. ' +
        'Confirmation requires detailed observations that do not yet exist for most of them.',

        '**_Sedna_** is one of the most enigmatic bodies in the solar system. ' +
        'It orbits in or near the Oort Cloud, at distances where solar warmth is almost imperceptible. ' +
        'Its orbit is so elongated that one complete revolution around the Sun takes approximately eleven thousand Earth years. ' +
        'Some researchers suggest that Sedna\'s unusual orbit, and those of similar distant objects, ' +
        'may point to the existence of a hypothetical large planet on the outskirts of the solar system — ' +
        'the so-called "Planet Nine." This hypothesis remains unconfirmed.',

        'The number of candidate dwarf planets will grow with every major sky survey. ' +
        'The Vera Rubin Observatory, which entered operation in the early 2020s, ' +
        'is systematically scanning the sky over the course of a decade ' +
        'and is already identifying new trans-Neptunian objects. ' +
        'The true count of dwarf planets in the solar system may eventually reach hundreds, or even thousands.',
      ],
    },

    {
      image: {
        cacheKey: 'dwarf-planets-kuiper-belt-overview',
        prompt:
          'Photorealistic illustration for a science encyclopedia: top-down view of the outer solar system showing ' +
          'the Kuiper Belt as a wide ring of icy debris beyond Neptune\'s orbit, ' +
          'labeled dwarf planet positions for Pluto, Eris, Makemake, Haumea, ' +
          'Sun at center, Neptune orbit ring shown, dark space background, scientific accuracy. ' +
          'Add the following text labels on the image: "Sun", "Neptune orbit", "Kuiper Belt", "Pluto", "Eris (more distant)".',
        alt: 'Top-down view of the outer solar system — the Kuiper Belt and the positions of dwarf planets',
        caption: 'The Kuiper Belt is an icy ring beyond Neptune\'s orbit where four of the five recognized dwarf planets reside. Eris lies even farther out, on a highly elongated orbit.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Why the Debate Persists',
      level: 2,
      paragraphs: [
        'The 2006 decision was not unanimous. The vote was cast by delegates who remained for the final session ' +
        'of the International Astronomical Union General Assembly in Prague — ' +
        'fewer than five percent of the organization\'s total membership. ' +
        'Many planetary scientists, including the New Horizons team, still consider the decision flawed.',

        'The main argument from critics: the criterion of clearing the orbital neighborhood depends on distance from the Sun. ' +
        'The farther from the Sun, the larger the zone that must be cleared and the harder it becomes to do so. ' +
        'If Earth were placed on Pluto\'s orbit, it too would fail this test and lose its planetary status. ' +
        'Alternative definitions based on geophysical criteria — ' +
        'specifically the presence of hydrostatic equilibrium, that is, a rounded shape — ' +
        'would include Pluto and dozens of other bodies in the planet category, ' +
        'but would make the system considerably more complex.',

        'The scientific debate reflects a genuine underlying question: ' +
        'what exactly do we want the word "planet" to describe — orbital dynamics, or the geophysical nature of the body? ' +
        'Both approaches make sense depending on the purpose. ' +
        'For now, the International Astronomical Union retains its definition, ' +
        'and it is the official standard in scientific and educational contexts.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Dwarf planet',
      definition: 'A solar system body that orbits the Sun, has enough mass to assume a nearly spherical shape under its own gravity, but has not cleared the neighborhood around its orbit of other debris. The term was introduced by the International Astronomical Union in 2006.',
    },
    {
      term: 'Hydrostatic equilibrium',
      definition: 'A condition in which a body\'s own gravity is sufficient to pull it into a nearly spherical shape. It is one of the criteria for classifying planets and dwarf planets — the body must be rounded not by the rigidity of its material, but by gravitational compression.',
    },
    {
      term: 'Clearing the orbital neighborhood',
      definition: 'The process by which a massive planet absorbs, ejects gravitationally, or otherwise dominates most other bodies in its orbital zone. Earth and the major planets have satisfied this condition; Pluto and dwarf planets have not.',
    },
    {
      term: 'Kuiper Belt',
      definition: 'A broad ring of icy bodies beyond Neptune\'s orbit, extending roughly from 30 to 50 astronomical units from the Sun. Pluto, Eris, Haumea, and Makemake — four of the five official dwarf planets — reside here.',
    },
    {
      term: 'Tombaugh Regio',
      definition: 'The large bright heart-shaped plain on Pluto\'s surface, discovered by New Horizons in 2015. It is composed of nitrogen ice, has no impact craters, and is geologically young. Named in honor of Clyde Tombaugh, Pluto\'s discoverer.',
    },
    {
      term: 'Trans-Neptunian objects',
      definition: 'A class of solar system bodies whose orbits lie beyond Neptune\'s orbit. They include objects in the Kuiper Belt, the scattered disc, and the Oort Cloud. Most recognized dwarf planets are trans-Neptunian objects.',
    },
    {
      term: 'International Astronomical Union',
      definition: 'The international organization of astronomers, founded in 1919, that serves as the official authority for naming and classifying astronomical objects. In 2006 it adopted the current definition of a planet and established the dwarf planet category.',
    },
    {
      term: 'Albedo',
      definition: 'The fraction of sunlight reflected by a body\'s surface. Eris and Pluto have very high albedo due to methane ice coverage. For comparison, fresh snow on Earth has an albedo of approximately 0.8, while coal has approximately 0.04.',
    },
    {
      term: 'Oort Cloud',
      definition: 'A hypothetical spherical shell of icy bodies at the outer edge of the solar system, extending to distances of several light-years. Thought to be the reservoir of long-period comets. Sedna and some other distant bodies may reside in the inner Oort Cloud.',
    },
  ],

  quiz: [
    {
      question: 'Which of the three International Astronomical Union conditions does Pluto fail to meet, causing its classification as a dwarf planet?',
      options: [
        'Pluto does not orbit the Sun',
        'Pluto does not have sufficient mass to be rounded',
        'Pluto has not cleared its orbital neighborhood of other Kuiper Belt bodies',
        'Pluto is a moon of Neptune rather than an independent body',
      ],
      correctIndex: 2,
      explanation: 'Pluto orbits the Sun and is rounded — it satisfies the first two conditions. But it shares the Kuiper Belt with thousands of other bodies and does not gravitationally dominate its zone. That is why it is classified as a dwarf planet rather than a full planet.',
    },
    {
      question: 'The discovery of which body in 2005 directly triggered the redefinition of "planet" and the reclassification of Pluto?',
      options: [
        'Haumea',
        'Ceres',
        'Sedna',
        'Eris',
      ],
      correctIndex: 3,
      explanation: 'Eris was discovered in 2005 and found to be more massive than Pluto. This posed an uncomfortable question: if Pluto is a planet, is Eris one too? Rather than add new planets, the International Astronomical Union redefined the term in 2006 and introduced the dwarf planet category.',
    },
    {
      question: 'What unexpected discovery did the Dawn mission make at Ceres in 2015?',
      options: [
        'Active volcanoes similar to those on Io',
        'Bright salt deposits in a crater, indicating a subsurface liquid reservoir',
        'A dense nitrogen atmosphere',
        'Two large icy rings encircling Ceres',
      ],
      correctIndex: 1,
      explanation: 'Dawn discovered bright spots in Occator Crater — sodium carbonate deposits that welled up from subsurface brine. This was unexpected and raised the possibility that liquid salty water might exist inside Ceres.',
    },
    {
      question: 'What is Tombaugh Regio and where is it located?',
      options: [
        'A dark polar cap on Charon, named after Clyde Tombaugh',
        'A heart-shaped nitrogen-ice plain on Pluto\'s surface, discovered by New Horizons in 2015',
        'The largest impact crater on Ceres, formed by an ancient collision',
        'The ring around Haumea, discovered in 2017',
      ],
      correctIndex: 1,
      explanation: 'Tombaugh Regio is the large bright heart-shaped region on Pluto\'s surface, composed of nitrogen ice. It was discovered by the New Horizons probe in 2015 and named in honor of Pluto\'s discoverer, Clyde Tombaugh.',
    },
    {
      question: 'What distinguishes Haumea from all other known dwarf planets?',
      options: [
        'It is the most massive dwarf planet',
        'It is the only dwarf planet in the asteroid belt',
        'It has an egg-like shape due to extremely rapid rotation and is the only dwarf planet with a known ring',
        'It does not orbit the Sun but is a moon of Eris',
      ],
      correctIndex: 2,
      explanation: 'Haumea rotates around its axis in just about four hours — extraordinarily fast for a body of its size. This has stretched it into an egg-like shape. In 2017 a ring was discovered around it, making it the first dwarf planet known to have a ring.',
    },
  ],

  sources: [
    {
      title: 'IAU 2006 Resolution B5 — Definition of a Planet in the Solar System',
      url: 'https://www.iau.org/static/resolutions/Resolution_GA26-5-6.pdf',
      meta: 'International Astronomical Union, Prague 2006',
    },
    {
      title: 'New Horizons — Pluto System — NASA Science',
      url: 'https://science.nasa.gov/mission/new-horizons/',
      meta: 'NASA, flyby July 2015',
    },
    {
      title: 'Dawn Mission — NASA Science',
      url: 'https://science.nasa.gov/mission/dawn/',
      meta: 'NASA, Ceres orbit 2015-2018',
    },
    {
      title: 'Pluto and the Kuiper Belt — NASA Solar System Exploration',
      url: 'https://solarsystem.nasa.gov/planets/dwarf-planets/pluto/overview/',
      meta: 'NASA Solar System Exploration',
    },
    {
      title: 'Eris: The Dwarf Planet That Changed Our Solar System — NASA',
      url: 'https://solarsystem.nasa.gov/planets/dwarf-planets/eris/overview/',
      meta: 'NASA Solar System Exploration',
    },
    {
      title: 'Haumea — Ring around a Dwarf Planet — Nature 2017',
      url: 'https://www.nature.com/articles/nature22055',
      meta: 'Nature, 551, 2017',
    },
    {
      title: 'Bright Spots on Ceres — Science 2016',
      url: 'https://www.science.org/doi/10.1126/science.aaf4219',
      meta: 'Science, vol. 353, 2016',
    },
    {
      title: 'Pluto\'s Geology — New Horizons Science Results — Science 2016',
      url: 'https://www.science.org/doi/10.1126/science.aad9189',
      meta: 'Science, vol. 351, 2016',
    },
    {
      title: 'Sedna and the Inner Oort Cloud — Brown, Trujillo & Rabinowitz 2004',
      url: 'https://iopscience.iop.org/article/10.1086/422095',
      meta: 'The Astrophysical Journal Letters, 617, 2004',
    },
    {
      title: 'Charon — Pluto\'s Moon Overview — NASA',
      url: 'https://solarsystem.nasa.gov/moons/pluto-moons/charon/overview/',
      meta: 'NASA Solar System Exploration',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
