import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'milky-way',
  language: 'en',
  section: 'astronomy',
  order: 7,
  difficulty: 'intermediate',
  readingTimeMin: 14,
  title: 'The Milky Way — Our Galaxy',
  subtitle: 'An island of two hundred billion stars we call home. What it is, how we study it from the inside, and what awaits it in the distant future.',

  hero: {
    cacheKey: 'milky-way-hero',
    prompt:
      'Photorealistic panoramic photograph of the Milky Way galaxy arc stretching across a dark night sky above a mountain silhouette, ' +
      'vivid star-filled galactic band with subtle reddish-brown dust lanes and glowing nebulae regions, ' +
      'deep blacks of the sky, foreground silhouetted ridgeline, Milky Way core visible as a bright concentrated region. ' +
      'Hard sci-fi style science encyclopedia illustration, wide format, dark space atmosphere. ' +
      'Add the following text labels on the image: "Milky Way", "galactic core", "dust lane".',
    alt: 'Panoramic view of the Milky Way — the bright galactic band across a star-filled sky above mountains',
    caption:
      'The Milky Way visible to the naked eye from a dark location is a cross-section of our own galactic disk. We look inward through it, which is why we see a band rather than a spiral.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'On a clear night, that faint smear of light stretching across the whole sky is your home — you are looking inward through it. ' +
        'The band is billions of our galaxy\'s stars seen edge-on because we live inside its disk. ' +
        'We can never see the Milky Way from the outside — the same way you cannot see a house while standing in it. ' +
        'Yet over the past few decades, astronomers have learned to map our galaxy from the inside with breathtaking precision.',

        'The Milky Way is a _barred spiral galaxy_ of type SBbc. It is an island of two hundred to four hundred billion stars, ' +
        'rotating as one system through the void of the universe. The galactic disk spans roughly one hundred thousand light-years across. ' +
        'The galaxy\'s age is around thirteen and a half billion years — it has existed almost from the very beginning of the universe. ' +
        'Our star, the Sun, sits about twenty-six thousand light-years from the center, ' +
        'in a relatively quiet location between the major arms, inside a minor feature called the _Orion Spur_.',
      ],
    },

    {
      image: {
        cacheKey: 'milky-way-top-view-artist',
        prompt:
          'Scientific artist\'s impression of the Milky Way galaxy seen from above: barred spiral galaxy with four major spiral arms labeled, ' +
          'bright central bar and bulge at center, prominent spiral arms in blue-white star-forming colors, dust lanes dark brown, ' +
          'small yellow marker indicating Sun\'s position in the Orion spur, satellite dwarf galaxies shown at periphery. ' +
          'Hard sci-fi style scientific illustration, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "galactic bar", "Orion spur (Sun)", "Perseus arm", "Sagittarius arm", "Scutum-Centaurus arm", "Norma arm".',
        alt: 'Artistic reconstruction of the Milky Way seen from above with labeled spiral arms and Sun position',
        caption: 'The Milky Way from a bird\'s-eye view (artistic reconstruction). The Sun sits twenty-six thousand light-years from the center in the minor Orion Spur branch.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Structure: disk, bulge, halo',
      level: 2,
      paragraphs: [
        'The Milky Way has several structural components, each with its own role and its own stellar population.',

        '**The thin disk** is the main nursery of new stars. Roughly one thousand light-years thick, it holds most of the galaxy\'s gas, dust, and young blue stars. Spiral arms are density waves rolling through the disk that compress gas and trigger star formation. The Sun is a middle-aged star riding in this disk.',

        '**The thick disk** lies above and below the thin disk, extending to a thickness of about three thousand five hundred light-years. ' +
        'It harbors older stars and far less gas. The thick disk is thought to have formed during the galaxy\'s early, turbulent phase — partly through mergers with dwarf galaxies.',

        '**The bulge** is the central thickening of the galaxy shaped like a peanut or bar. ' +
        'It stretches roughly twenty-five thousand light-years along its long axis. ' +
        'The bulge is densely packed with old red stars — almost no free gas remains for new star formation. ' +
        'At the very center of the bulge lies the supermassive black hole.',

        '**The halo** is the vast near-spherical envelope surrounding the disk, extending up to three hundred thousand light-years in diameter. ' +
        'It contains ancient globular star clusters, scattered old stars, and — contributing most of the mass — **dark matter**. ' +
        'Dark matter emits no light and does not interact with electromagnetic radiation, ' +
        'but its gravity holds the entire galaxy together. ' +
        'Estimates suggest dark matter accounts for roughly eighty-five percent of the Milky Way\'s total mass.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Milky Way — Cross-Section',
        svg: `<svg viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Dark matter halo (large ellipse) -->
  <ellipse cx="340" cy="140" rx="310" ry="120" fill="none" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="6,5" opacity="0.35"/>
  <text x="630" y="60" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="end" opacity="0.7">dark matter halo</text>

  <!-- Stellar halo hint -->
  <ellipse cx="340" cy="140" rx="240" ry="90" fill="none" stroke="#8899aa" stroke-width="0.8" stroke-dasharray="3,6" opacity="0.3"/>
  <text x="570" y="90" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="end" opacity="0.6">stellar halo</text>

  <!-- Thick disk -->
  <ellipse cx="340" cy="140" rx="200" ry="28" fill="rgba(100,80,40,0.18)" stroke="#ff8844" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.6"/>
  <text x="80" y="118" fill="#ff8844" font-family="monospace" font-size="9" opacity="0.75">thick disk</text>

  <!-- Thin disk -->
  <ellipse cx="340" cy="140" rx="200" ry="10" fill="rgba(180,160,80,0.22)" stroke="#ffd080" stroke-width="1.2"/>
  <text x="80" y="136" fill="#ffd080" font-family="monospace" font-size="9">thin disk</text>

  <!-- Bulge / bar -->
  <ellipse cx="340" cy="140" rx="52" ry="40" fill="rgba(255,160,80,0.18)" stroke="#ff8844" stroke-width="1.5"/>
  <text x="340" y="193" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">bulge / bar</text>

  <!-- Sgr A* -->
  <circle cx="340" cy="140" r="3.5" fill="#cc4444"/>
  <text x="352" y="137" fill="#cc4444" font-family="monospace" font-size="10">Sgr A*</text>

  <!-- Sun position -->
  <circle cx="466" cy="140" r="3" fill="#ffd080" stroke="#fff" stroke-width="0.8"/>
  <line x1="466" y1="128" x2="466" y2="107" stroke="#ffd080" stroke-width="0.8"/>
  <text x="466" y="100" fill="#ffd080" font-family="monospace" font-size="10" text-anchor="middle">Sun</text>
  <text x="466" y="112" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">26 000 ly</text>

  <!-- Scale bar -->
  <line x1="140" y1="245" x2="340" y2="245" stroke="#aabbcc" stroke-width="1"/>
  <line x1="140" y1="240" x2="140" y2="250" stroke="#aabbcc" stroke-width="1"/>
  <line x1="340" y1="240" x2="340" y2="250" stroke="#aabbcc" stroke-width="1"/>
  <text x="240" y="260" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">50 000 ly</text>

  <!-- Label: disk diameter -->
  <line x1="140" y1="265" x2="540" y2="265" stroke="#667788" stroke-width="0.6" stroke-dasharray="2,4" opacity="0.5"/>
  <text x="340" y="278" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">~100 000 ly (disk diameter)</text>
</svg>`,
        caption:
          'The Milky Way in cross-section. The thin disk with gas and young stars is surrounded by the thicker disk of older stars. ' +
          'The central bulge hosts the supermassive black hole Sgr A*. All of this is embedded in a vast dark-matter halo.',
      },
    },

    {
      heading: 'Sgr A* — the heart of the galaxy',
      level: 2,
      paragraphs: [
        'At the very center of the Milky Way, hidden behind clouds of gas and dust that block ordinary light, ' +
        'lies **Sagittarius A*** — a supermassive black hole with a mass of roughly four and a quarter million times that of the Sun. ' +
        'Its event horizon — the _Schwarzschild radius_ — is about twelve million kilometers across, ' +
        'roughly eighteen times the radius of the Sun. ' +
        'On galactic scales this is tiny, but the gravitational pull of Sgr A* governs the orbits of stars within a few parsecs of the center.',

        'Evidence for Sgr A* accumulated over decades. ' +
        'Starting in the nineteen nineties, two independent teams — led by Reinhard Genzel and Andrea Ghez — ' +
        'tracked the orbits of stars near the galactic center in infrared light. ' +
        'The stars moved along ellipses whose parameters could only be explained by an extraordinarily compact, massive object at the center. ' +
        'The star S2 completes one orbit around Sgr A* every sixteen Earth years ' +
        'and reaches three percent of the speed of light at closest approach. ' +
        'For this work, Genzel and Ghez received the Nobel Prize in Physics in 2020.',

        'In 2022, the Event Horizon Telescope collaboration published the first image of the shadow of Sgr A* — ' +
        'a dark ring roughly fifty microarcseconds across, surrounded by a bright glowing accretion halo. ' +
        'Unlike M87*, where the plasma around the black hole is stable, Sgr A* flickers on a timescale of minutes: ' +
        'the accretion flow is uneven, so images were collected over several nights ' +
        'and combined using sophisticated averaging algorithms.',
      ],
    },

    {
      image: {
        cacheKey: 'milky-way-sgr-a-star',
        prompt:
          'Scientific illustration of the galactic center region showing Sgr A* supermassive black hole: ' +
          'central dark shadow surrounded by glowing orange-gold ring of hot plasma, ' +
          'dense star cluster visible in background with reddish infrared glow of old stars, ' +
          'faint gas streamers falling toward the central object. ' +
          'Hard sci-fi style scientific illustration, dark background, technically accurate. ' +
          'Add the following text labels on the image: "Sgr A*", "event horizon shadow", "S-star cluster", "galactic center".',
        alt: 'The Milky Way center with supermassive black hole Sgr A* — dark shadow within a bright accretion ring',
        caption: 'Sgr A* weighs four and a quarter million solar masses. Despite its size, it is relatively quiet right now — accretion is minimal and no jet is visible. Nearby S-stars orbit it in as little as a few years.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Scale: thinking about a system this large',
      level: 2,
      paragraphs: [
        'The numbers describing the Milky Way resist ordinary intuition. Analogies help.',

        'If you compressed the Milky Way to the area of the Arctic Ocean — roughly fourteen million square kilometers — ' +
        'the Sun would be a microscopic dot smaller than a molecule, ' +
        'and the distance to the nearest neighboring star would be less than a micrometer. ' +
        'The emptiness between stars is the overwhelming majority of galactic volume.',

        'A radio wave traveling at the speed of light would cross the full diameter of the galactic disk in approximately one hundred thousand years. ' +
        'The Sun completes one full orbit around the galactic center roughly every two hundred and twenty-five million years — ' +
        'a span sometimes called a _galactic year_. Over the lifetime of the Solar System, ' +
        'the Sun has completed about twenty such revolutions.',

        'The total number of stars in the Milky Way is between two hundred and four hundred billion. ' +
        'Most are dim red dwarfs — invisible to the naked eye, but extraordinarily long-lived. ' +
        'Stars of roughly solar mass are typically separated by about four to five light-years from their neighbors. ' +
        'Invisible objects — brown dwarfs, neutron stars, stellar-mass black holes — ' +
        'probably number at least as many as ordinary stars.',
      ],
    },

    {
      heading: 'The Local Group: our cosmic neighborhood',
      level: 2,
      paragraphs: [
        'The Milky Way is not alone. It belongs to the **Local Group** — a gravitationally bound cluster ' +
        'of more than fifty galaxies spanning a volume roughly ten million light-years across.',

        'The two largest galaxies in the Local Group are the Milky Way itself and **Andromeda** (Messier 31). ' +
        'Andromeda is slightly larger: its disk spans about two hundred and twenty thousand light-years, ' +
        'and it holds up to a trillion stars. The distance between the two is about two and a half million light-years. ' +
        'On a clear night, Andromeda is the most distant object visible to the naked eye.',

        'More than thirty known satellite galaxies orbit the Milky Way. ' +
        'The largest are the **Large Magellanic Cloud** and the **Small Magellanic Cloud**, ' +
        'visible from the Southern Hemisphere as separate cloudy patches in the sky. ' +
        'The Large Magellanic Cloud is an irregular galaxy with active star formation, ' +
        'gravitationally bound to us and likely to be eventually absorbed by the Milky Way.',
      ],
    },

    {
      image: {
        cacheKey: 'milky-way-local-group',
        prompt:
          'Scientific infographic map of the Local Group of galaxies: deep space background, ' +
          'three dominant galaxies shown as labeled elliptical/spiral shapes — Milky Way (spiral, center-left), ' +
          'Andromeda M31 (larger spiral, center-right), Triangulum M33 (smaller spiral), ' +
          'dozens of dwarf satellite galaxies shown as small faint blobs around the two major spirals, ' +
          'Large and Small Magellanic Clouds labeled near Milky Way, distance scale bar shown. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "Milky Way", "Andromeda (M31) 2.5 Mly", "Large Magellanic Cloud", "Triangulum (M33)".',
        alt: 'Map of the Local Group of galaxies: the Milky Way, Andromeda, and their satellites',
        caption: 'The Local Group contains more than fifty galaxies, but most are tiny dwarfs. Two gravitational centers dominate: the Milky Way and Andromeda.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Andromeda collision',
      level: 2,
      paragraphs: [
        'This is not a question of whether, but of when. The Milky Way and Andromeda are approaching each other: ' +
        'Andromeda is closing in at roughly one hundred and ninety kilometers per second. ' +
        'Calculations suggest the first close passage will occur approximately four and a half billion years from now.',

        'The word "collision" is somewhat misleading. Stars inside galaxies are so far apart ' +
        'that even when two galaxies fully merge, almost no stars will physically collide. ' +
        'Instead, gravitational interactions deform both galaxies, ' +
        'pulling long "tails" of stars outward, flinging some onto new orbits, and triggering powerful waves of star formation. ' +
        'After several billion years of this slow gravitational dance, both galaxies will merge into a single object — ' +
        'an elliptical galaxy that astronomers have already informally named **Milkomeda**.',

        'For the Sun and Earth, the risk from this merger is minimal. ' +
        'The probability of a direct stellar collision is vanishingly small. ' +
        'However, the Sun\'s orbit may change dramatically — it could end up far from its current location. ' +
        'In any case, four to five billion years before that, our Sun will expand into a red giant, ' +
        'and the fate of Earth will be decided long before any merger takes place.',
      ],
    },

    {
      heading: 'Studying the galaxy from the inside',
      level: 2,
      paragraphs: [
        'Studying your own galaxy is harder than studying distant ones. ' +
        'Visible light is absorbed by dust in the galactic disk, so optical telescopes ' +
        'cannot see through the disk to the center. Other wavelengths of the electromagnetic spectrum are used instead.',

        '**Radio astronomy** was the first tool for mapping the galaxy. ' +
        'In the mid-twentieth century, radio astronomers discovered that atomic hydrogen emits ' +
        'at a wavelength of twenty-one centimeters, and by measuring the Doppler shift of this line ' +
        'they could determine the velocity of gas clouds. This revealed the first spiral arms of the Milky Way — ' +
        'radio waves pass through dust almost without loss.',

        '**Infrared light** cuts through dust veils and allows direct observation of stars. ' +
        'This is how the dense stellar cluster at the galactic center was discovered, ' +
        'and how the orbits of S-stars around Sgr A* were tracked.',

        '**Astrometry** — precise measurement of star positions and motions — enables building a three-dimensional map of the galaxy. ' +
        'In the early twenty-first century, the Gaia mission of the European Space Agency ' +
        'revolutionized this field: it measured parallaxes and proper motions of over a billion stars ' +
        'with angular precision of a microarcsecond. ' +
        'Gaia effectively gave us, for the first time, a detailed three-dimensional picture of the Milky Way.',

        '**JWST** contributed through what is called _disk stellar archaeology_: ' +
        'by observing old stars in the galactic disk in infrared, ' +
        'it is possible to reconstruct the chemical evolution of the galaxy — reading its past from the composition of stars, ' +
        'the way tree rings record history.',
      ],
    },

    {
      image: {
        cacheKey: 'milky-way-gaia-map',
        prompt:
          'Scientific visualization of the Gaia stellar density map of the Milky Way: ' +
          'edge-on view of the galactic disk shown as a bright horizontal band of densely packed stars, ' +
          'color-coded by stellar density — bright white-yellow at center, fading to blue-purple at edges, ' +
          'dust lanes visible as dark rifts through the disk, globular clusters visible as bright dots above and below the disk plane. ' +
          'Hard sci-fi style scientific data visualization, dark background, monospace labels. ' +
          'Add the following text labels on the image: "Gaia DR3", "galactic disk", "dust lanes", "stellar halo".',
        alt: 'Gaia stellar density map of the Milky Way — edge-on view with over one billion stars',
        caption: 'The Gaia Data Release 3 stellar map covers over one billion stars. Dark bands are dust clouds. The galactic disk appears edge-on because of our position inside it.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Recent discoveries: Gaia and JWST',
      level: 2,
      paragraphs: [
        'Gaia data showed that the Milky Way survived several major mergers with dwarf galaxies in the distant past. ' +
        'The most significant known merger — with a galaxy called **Gaia-Enceladus** — ' +
        'occurred approximately ten billion years ago. This event left its mark ' +
        'in the chemical composition and kinematics of thousands of stars in the Milky Way\'s halo, ' +
        'which move "out of step" with the majority of disk stars.',

        'Gaia also revealed that the galactic disk is not flat but **warped** — ' +
        'the outer edges of the disk bend away from the midplane like the brim of a hat that has been slightly bent. ' +
        'This warp is likely linked to the gravitational pull of the Large Magellanic Cloud, ' +
        'which recently (in galactic terms) came close enough to the Milky Way to distort its outer disk.',

        'JWST launched the _JWST Galactic Archaeology Survey_, aimed at studying ' +
        'the chemical composition of stars across different parts of the disk — from the central bulge to the outer edge. ' +
        'By analyzing spectra of thousands of stars of different ages, scientists reconstruct ' +
        'how the galaxy enriched itself in heavy elements from generation to generation of stars. ' +
        'These data refine models of planet formation and the conditions for complex chemistry — ' +
        'and therefore for the emergence of life — at different epochs in the galaxy\'s history.',
      ],
    },

    {
      image: {
        cacheKey: 'milky-way-disk-warp',
        prompt:
          'Scientific artistic illustration of the Milky Way disk warp: ' +
          'side view of the galactic disk showing the outer disk bending upward on one side and downward on the other, ' +
          'like a gently warped vinyl record, ' +
          'central bright bulge remains flat, star-studded disk curves at the edges, ' +
          'Small and Large Magellanic Clouds shown as companion objects pulling on the disk. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels on the image: "galactic disk warp", "Large Magellanic Cloud", "outer disk", "central bulge".',
        alt: 'Warp of the Milky Way galactic disk — edge-on view with bent outer edges',
        caption: 'The outer edges of the Milky Way\'s disk are warped — bent like a gently twisted record. One likely cause is the gravitational pull of the Large Magellanic Cloud.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Are we in a special place?',
      level: 2,
      paragraphs: [
        'The Sun sits in what is sometimes called the **galactic habitable zone** — ' +
        'far enough from the center to avoid lethal gamma radiation from frequent supernovae and disruptions from the galactic nucleus, ' +
        'yet not so far out on the periphery that metallicity — the abundance of heavy elements — ' +
        'is too low to build rocky planets.',

        'However, the idea of our location being uniquely privileged should not be overstated. ' +
        'Similar conditions exist across a broad ring at galactic distances between twenty-five and thirty thousand light-years from the center. ' +
        'Billions of stars share comparable environments. ' +
        'Whether any of them host planets with complex chemistry is a question of active research.',

        'The Milky Way is not the center of the universe. It is one of approximately two trillion galaxies ' +
        'in the observable universe. But it is ours, and we study it from the inside — ' +
        'from a unique perspective no outside observer will ever share.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Spiral arm',
      definition:
        'A density wave moving through the galactic disk that compresses gas and triggers intense star formation. Not a rigid structure — a wave that slowly propagates through the disk.',
    },
    {
      term: 'Bulge',
      definition:
        'The central thickening of the galaxy shaped like an elongated bar. Contains predominantly old red stars with almost no free gas for new star formation.',
    },
    {
      term: 'Halo',
      definition:
        'The nearly spherical outer envelope of the galaxy. Contains globular star clusters, old solitary stars, and — by far the dominant mass — dark matter. Far larger than the visible disk.',
    },
    {
      term: 'Dark matter',
      definition:
        'An invisible form of matter that does not interact with electromagnetic radiation but exerts gravity. Estimated to make up roughly eighty-five percent of the Milky Way\'s total mass.',
    },
    {
      term: 'Sgr A* (Sagittarius A-star)',
      definition:
        'The supermassive black hole at the center of the Milky Way. Mass — approximately four million solar masses. First imaged by the Event Horizon Telescope in 2022.',
    },
    {
      term: 'Galactic year',
      definition:
        'The time it takes the Sun to complete one full orbit around the galactic center — approximately two hundred and twenty-five million Earth years.',
    },
    {
      term: 'Gaia',
      definition:
        'A European Space Agency space mission for precise astrometry. It measured coordinates, motions, and parallaxes of over one billion stars, providing the first detailed three-dimensional map of the Milky Way.',
    },
    {
      term: 'Local Group',
      definition:
        'A gravitationally bound cluster of more than fifty galaxies, including the Milky Way, Andromeda, Triangulum, and numerous dwarf galaxies.',
    },
    {
      term: 'Milkomeda',
      definition:
        'The informal name for the future elliptical galaxy that will form when the Milky Way and Andromeda merge, approximately seven billion years from now.',
    },
  ],

  quiz: [
    {
      question: 'Why does the Milky Way appear as a band across the night sky rather than a spiral?',
      options: [
        'Because the galaxy is actually flat with no spiral arms',
        'Because we are inside the galactic disk and see it in cross-section',
        'Because dust hides the spiral shape',
        'Because the human eye cannot see colors in deep space',
      ],
      correctIndex: 1,
      explanation:
        'We live inside the Milky Way\'s disk. Looking along the plane of the disk, we see billions of stars overlapping one another — which is why the sky looks like a continuous bright band rather than a spiral.',
    },
    {
      question: 'What is the galactic halo?',
      options: [
        'The bright accretion ring glowing around Sgr A*',
        'The vast nearly spherical outer envelope of the galaxy containing dark matter and globular clusters',
        'A hydrogen cloud surrounding the spiral arms',
        'A zone of accelerated star formation near the bulge',
      ],
      correctIndex: 1,
      explanation:
        'The halo is the large spherical region surrounding the galactic disk. It contains ancient globular star clusters and scattered old stars, but most of its mass is dark matter, which gravitationally holds the entire galaxy together.',
    },
    {
      question: 'Which mission first measured three-dimensional positions and motions of over one billion Milky Way stars?',
      options: [
        'Hubble Space Telescope',
        'JWST',
        'Gaia',
        'Event Horizon Telescope',
      ],
      correctIndex: 2,
      explanation:
        'The European Space Agency\'s Gaia mission measures stellar parallaxes and proper motions with extraordinary precision. It produced the first detailed three-dimensional map of our galaxy from over one billion stars.',
    },
    {
      question: 'What will actually happen when the Milky Way and Andromeda "collide" billions of years from now?',
      options: [
        'Most stars will physically collide and explode',
        'Both galaxies will pass through each other with almost no stellar collisions, gradually merging into an elliptical galaxy',
        'The Milky Way will be completely absorbed by Andromeda without any changes',
        'The collision will destroy all planetary systems in both galaxies',
      ],
      correctIndex: 1,
      explanation:
        'Stars are so far apart that even in a full galactic merger, almost no direct collisions between stars occur. Instead, gravitational interactions reshape both galaxies, trigger star formation bursts, and over billions of years the two systems merge into one elliptical galaxy.',
    },
  ],

  sources: [
    {
      title: 'Gaia Data Release 3 — Summary of the content and survey properties',
      url: 'https://arxiv.org/abs/2208.00211',
      meta: 'A&A, 674, A1, 2023 (open access)',
    },
    {
      title: 'Event Horizon Telescope — First Sagittarius A* Results (Paper I)',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/ac6674',
      meta: 'ApJL, 930, L12, 2022 (open access)',
    },
    {
      title: 'Genzel R. et al. — The Galactic Center Massive Black Hole and Nuclear Star Cluster',
      url: 'https://arxiv.org/abs/1006.0064',
      meta: 'Rev. Mod. Phys. 82, 3121, 2010',
    },
    {
      title: 'Ghez A. M. et al. — Measuring Distance and Properties of the Milky Way\'s Central Supermassive Black Hole',
      url: 'https://arxiv.org/abs/0808.2870',
      meta: 'ApJ 689, 1044, 2008',
    },
    {
      title: 'Helmi A. et al. — The merger that led to the formation of the Milky Way\'s inner stellar halo (Gaia-Enceladus)',
      url: 'https://arxiv.org/abs/1806.06038',
      meta: 'Nature, 563, 85–88, 2018',
    },
    {
      title: 'Cox T. J., Loeb A. — The collision between the Milky Way and Andromeda',
      url: 'https://arxiv.org/abs/0705.1170',
      meta: 'MNRAS, 386, 461–474, 2008',
    },
    {
      title: 'Gravity Collaboration — Detection of the gravitational redshift in the orbit of the star S2 near the Galactic centre',
      url: 'https://arxiv.org/abs/1807.09409',
      meta: 'A&A, 615, L15, 2018',
    },
    {
      title: 'NASA — Milky Way Galaxy overview',
      url: 'https://science.nasa.gov/galaxy/milky-way/',
      meta: 'NASA Science, official page',
    },
    {
      title: 'Reid M. J. et al. — Trigonometric Parallaxes of Massive Star-Forming Regions: The Structure and Kinematics of the Milky Way',
      url: 'https://arxiv.org/abs/1401.5377',
      meta: 'ApJ, 783, 130, 2014',
    },
    {
      title: 'Poggio E. et al. — Evidence for a dynamically driven Galactic warp (Gaia)',
      url: 'https://arxiv.org/abs/2003.03381',
      meta: 'Nature Astronomy, 4, 590–596, 2020',
    },
  ],

  lastVerified: '2026-05-03',
};

export default lesson;
