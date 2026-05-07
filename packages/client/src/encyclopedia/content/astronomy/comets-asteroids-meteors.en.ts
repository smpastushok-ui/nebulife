import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'comets-asteroids-meteors',
  language: 'en',
  section: 'astronomy',
  order: 9,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Comets, Asteroids, Meteors',
  subtitle: 'The Solar System\'s small bodies — witnesses to its formation, harbingers of collisions, and sources of Earth\'s own materials.',

  hero: {
    cacheKey: 'comets-asteroids-meteors-hero',
    prompt:
      'Photorealistic scientific illustration for a space encyclopedia: a dramatic split-scene composition. ' +
      'Left half shows a bright comet with glowing coma and two distinct tails (thin blue ion tail pointing away from the Sun, broader white dust tail curving along the orbital path) against deep black star-filled space. ' +
      'Right half shows a rocky asteroid tumbling in the asteroid belt, irregular grey-brown surface with craters, sunlight catching one edge. ' +
      'Center foreground shows a meteor streak burning bright white-orange as it enters a thin atmosphere layer at planet limb. ' +
      'Hard sci-fi scientific illustration, dark space background, dramatic lighting. ' +
      'Add the following text labels on the image: "comet", "ion tail", "dust tail", "asteroid", "meteor".',
    alt: 'A comet with two tails, a rocky asteroid, and a bright meteor streak — three types of small Solar System bodies',
    caption:
      'Comets, asteroids, and meteoroids are not the same thing, though they are often confused. Each tells a separate chapter of the story of how our planetary system formed.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The Solar System is not empty space between planets. Billions of smaller bodies hide among and beyond the orbits: ' +
        'rocky and metallic slabs, frozen balls of gas and dust, fine particles that burn in our sky. ' +
        'They existed before Earth took its current shape and carry the chemical signature of the first millions of years of the Solar System. ' +
        'Some have landed here and sit in museum display cases. Others left marks in Earth\'s crust — or in human memory.',

        'Understanding the difference between a comet, an asteroid, and a meteor is not merely terminology. ' +
        'It is understanding where Earth\'s water came from, why the non-avian dinosaurs vanished, and what awaits us in the future. ' +
        'The three categories are related but fundamentally different in origin, composition, and behavior.',
      ],
    },

    {
      heading: 'Asteroids: Rubble of an Unbuilt Planet',
      level: 2,
      paragraphs: [
        'Asteroids are predominantly rocky or metallic bodies that never coalesced into a full planet, ' +
        'prevented by the gravitational influence of Jupiter. Most of them inhabit the **Main Asteroid Belt** — ' +
        'a ring-shaped zone between the orbits of Mars and Jupiter. ' +
        'Millions of objects of varying size are concentrated there: from dust grains to Ceres, the largest asteroid, ' +
        'reclassified as a dwarf planet in the early twenty-first century.',

        'The composition of asteroids reflects their birthplace. Those closer to the Sun are mainly silicate — stony, dark, ' +
        'resembling chondrites. Farther out, carbon compounds and even frozen volatile materials become more common. ' +
        'Metallic asteroids are a separate class: composed of nearly pure iron and nickel, ' +
        'they are remnants of the cores of proto-planets shattered in early collisions. ' +
        'The NASA Psyche mission, launched in the early part of this decade, is heading toward the eponymous metallic asteroid — ' +
        'to study for the first time a body analogous to a planetary core.',

        'Asteroids in the Main Belt are not stationary. Collisions between them constantly generate new smaller fragments, ' +
        'some of which shift onto different orbits through _Kirkwood resonances_ — zones where Jupiter\'s gravity ' +
        'systematically scatters bodies. Some fragments end up on orbits that cross Earth\'s path — ' +
        'these are called **near-Earth asteroids**, and they receive the closest scientific scrutiny.',
      ],
    },

    {
      image: {
        cacheKey: 'comets-asteroids-meteors-belt-zones',
        prompt:
          'Scientific diagram of the inner Solar System showing the asteroid belt and near-Earth object zones: ' +
          'Sun at center, orbits of Mercury, Venus, Earth, Mars shown as concentric ellipses in dim blue, ' +
          'a wide diffuse band of rocky dots representing the main asteroid belt between Mars and Jupiter orbits, ' +
          'a cluster of bright orange dots labeled "near-Earth asteroids" crossing Earth\'s orbit region, ' +
          'Jupiter shown at far right edge as a large pale sphere. ' +
          'Hard sci-fi scientific diagram, dark background, monospace labels, orbital paths in muted cyan. ' +
          'Add the following text labels on the image: "Sun", "Earth", "Mars", "asteroid belt", "Jupiter", "near-Earth asteroids".',
        alt: 'Diagram of the Solar System showing the Main Asteroid Belt between Mars and Jupiter and near-Earth asteroids',
        caption:
          'The Main Asteroid Belt occupies the ring-shaped zone between Mars and Jupiter. Gravitational resonances with Jupiter regularly kick some bodies onto orbits that cross Earth\'s path.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Comets: Wanderers from the Cold',
      level: 2,
      paragraphs: [
        'If asteroids are rocky shards, comets are frozen archives. ' +
        'Their nucleus consists of ice (predominantly water ice), frozen carbon dioxide, methane, ammonia, ' +
        'and embedded rocky dust. In size they typically range from a few to a few tens of kilometers across. ' +
        'They look unassuming — until they approach the Sun.',

        'As a comet draws near the inner Solar System, solar heat begins to **sublimate** the ices — ' +
        'converting them directly from solid to gas, bypassing the liquid phase. This gas, along with released dust, ' +
        'forms a diffuse but brightly lit cloud around the nucleus: the _coma_. ' +
        'Together the nucleus and coma make up the **head of the comet**.',

        'Then the most spectacular part begins. The solar wind and radiation pressure drive material from the coma ' +
        'in the direction away from the Sun, forming two tails. ' +
        'The **ion tail** consists of charged particles and always points directly away from the Sun; ' +
        'it is narrower and bluish. The **dust tail** is broader, gently curved, and whitish — ' +
        'composed of dust particles that "lag behind" the nucleus along the orbital path. ' +
        'At the point of closest approach to the Sun — the _perihelion_ — a comet can display two distinctly different tails ' +
        'stretching for tens of millions of kilometers.',
      ],
    },

    {
      diagram: {
        title: 'Anatomy of a Comet',
        svg: `<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="380" fill="rgba(10,15,25,0.75)" rx="4"/>

  <!-- Sun -->
  <circle cx="30" cy="190" r="22" fill="#ffdd66" opacity="0.9"/>
  <text x="30" y="230" fill="#ffdd66" font-family="monospace" font-size="10" text-anchor="middle">Sun</text>

  <!-- Solar wind direction arrow -->
  <line x1="58" y1="190" x2="160" y2="190" stroke="#ff8844" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>
  <text x="108" y="183" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">solar wind</text>

  <!-- Dust tail — broad, curved, white -->
  <path d="M340,190 Q480,130 680,90" stroke="#ccccaa" stroke-width="18" fill="none" opacity="0.25"/>
  <path d="M340,190 Q480,130 680,90" stroke="#ddddbb" stroke-width="5" fill="none" opacity="0.45"/>
  <text x="560" y="118" fill="#ccccaa" font-family="monospace" font-size="11" text-anchor="middle">dust tail</text>
  <text x="560" y="131" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(broad, curved)</text>

  <!-- Ion tail — thin, straight, blue -->
  <line x1="340" y1="190" x2="700" y2="190" stroke="#7bb8ff" stroke-width="3" opacity="0.75"/>
  <path d="M340,190 L700,190" stroke="#aad4ff" stroke-width="1" opacity="0.4"/>
  <text x="530" y="207" fill="#7bb8ff" font-family="monospace" font-size="11" text-anchor="middle">ion tail</text>
  <text x="530" y="220" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(straight, always away from Sun)</text>

  <!-- Coma — diffuse glow -->
  <circle cx="340" cy="190" r="55" fill="rgba(200,220,255,0.07)" stroke="rgba(180,210,255,0.2)" stroke-width="1"/>
  <circle cx="340" cy="190" r="38" fill="rgba(200,220,255,0.1)" stroke="rgba(180,210,255,0.3)" stroke-width="1"/>
  <text x="340" y="258" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">coma</text>
  <text x="340" y="271" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(gas and dust cloud)</text>

  <!-- Nucleus -->
  <ellipse cx="340" cy="190" rx="11" ry="8" fill="#8899aa" stroke="#aabbcc" stroke-width="1.2"/>
  <text x="340" y="178" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle">nucleus</text>

  <!-- Bracket: head = nucleus + coma -->
  <line x1="260" y1="295" x2="420" y2="295" stroke="#334455" stroke-width="1"/>
  <line x1="260" y1="290" x2="260" y2="300" stroke="#334455" stroke-width="1"/>
  <line x1="420" y1="290" x2="420" y2="300" stroke="#334455" stroke-width="1"/>
  <text x="340" y="312" fill="#667788" font-family="monospace" font-size="10" text-anchor="middle">comet head = nucleus + coma</text>

  <!-- Perihelion arrow -->
  <line x1="340" y1="155" x2="200" y2="90" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>
  <text x="185" y="82" fill="#ff8844" font-family="monospace" font-size="9">perihelion</text>
  <text x="185" y="94" fill="#667788" font-family="monospace" font-size="8">(closest point to Sun)</text>
</svg>`,
        caption:
          'The ion tail always points directly away from the Sun — regardless of the comet\'s direction of travel. The dust tail curves gently along the orbital path. Both tails can extend for tens of millions of kilometers.',
      },
    },

    {
      heading: 'Where Comets Come From',
      level: 2,
      paragraphs: [
        'Comets have two distinct reservoirs of origin. Short-period comets — with orbital periods under two hundred years — ' +
        'come from the **Kuiper Belt**: a ring-shaped zone beyond Neptune\'s orbit, ' +
        'where frozen bodies accumulated at the edge of the solar heat zone some four and a half billion years ago.',

        'Long-period comets — with orbits lasting thousands or even millions of years — come from the **Oort Cloud**: ' +
        'a vast spherical shell surrounding the Solar System at distances from a few thousand to one hundred thousand ' +
        'astronomical units. The passage of a nearby star or a gravitational disturbance from the Galactic center ' +
        'can knock an icy body out of its stable orbit in the cloud — and it begins a multi-thousand-year journey toward the Sun.',

        'In the eighteenth century, Edmond Halley made a pivotal discovery: comparing descriptions of bright comets ' +
        'across different historical periods, he demonstrated that several were one and the same comet ' +
        'with an orbital period of roughly seventy-six years. ' +
        'This was the first proven case of a **periodic comet** in astronomical science. ' +
        'Halley\'s Comet returns regularly; it has been recorded in historical sources stretching back several millennia before the common era, ' +
        'and it last approached perihelion in the twentieth century.',
      ],
    },

    {
      image: {
        cacheKey: 'comets-asteroids-meteors-oort-kuiper',
        prompt:
          'Scientific diagram showing the scale of the outer Solar System: ' +
          'center shows the Sun as a tiny dot with inner planets as barely visible specks, ' +
          'a narrow ring labeled "Kuiper Belt" at moderate distance, ' +
          'surrounding everything is a vast diffuse spherical shell of dots labeled "Oort Cloud" extending to the edges of the frame, ' +
          'scale bar at bottom showing distances in astronomical units, ' +
          'dark space background, monospace labels, faint blue tones for the cloud. ' +
          'Hard sci-fi scientific diagram. ' +
          'Add the following text labels on the image: "Sun", "Kuiper Belt", "Oort Cloud", "AU scale".',
        alt: 'Diagram of the outer Solar System showing the Kuiper Belt and the spherical Oort Cloud',
        caption:
          'The Kuiper Belt extends from thirty to fifty astronomical units from the Sun. The Oort Cloud spans distances from a few thousand to one hundred thousand astronomical units and is the primary reservoir of long-period comets.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Famous Comets',
      level: 2,
      paragraphs: [
        '**Halley\'s Comet** is the best-known in human culture. It is recorded in Chinese chronicles, Babylonian clay tablets, ' +
        'and embroidered onto the Bayeux Tapestry alongside depictions of the Norman conquest of England. ' +
        'Halley in the eighteenth century mathematically proved its periodicity — thereby demonstrating that comets ' +
        'obey the same laws of gravitation as the planets.',

        '**Comet Hale-Bopp** in the late twentieth century became one of the brightest and longest-observed comets of the modern era. ' +
        'It remained visible to the naked eye for more than eighteen months — a record for unaided observation. ' +
        'Its nucleus proved unusually large: approximately sixty kilometers across.',

        '**Comet NEOWISE**, formally designated C/2020 F3, became in 2020 the first comet in several decades ' +
        'that Northern Hemisphere observers could see effortlessly with the naked eye. ' +
        'Amateur astronomers around the world photographed it in millions of images.',

        '**Comet 67P/Churyumov-Gerasimenko** is less famous to the general public but scientifically the most thoroughly studied comet ever. ' +
        'In 2014 the European Space Agency\'s Rosetta spacecraft entered orbit around it — ' +
        'the first time in history an active comet had been orbited. ' +
        'In November of that year the Philae lander touched down on the surface of the nucleus for the first time in history. ' +
        'Data from Rosetta revealed that the isotopic composition of water ice in 67P differs from that of Earth\'s oceans — ' +
        'casting doubt on the hypothesis that comets delivered most of Earth\'s water.',
      ],
    },

    {
      image: {
        cacheKey: 'comets-asteroids-meteors-67p-rosetta',
        prompt:
          'Photorealistic scientific illustration of comet 67P/Churyumov-Gerasimenko: ' +
          'a dark double-lobed irregular comet nucleus with rugged cliffs and dusty plains, ' +
          'jets of gas and dust spurting from active regions on the surface into space, ' +
          'the Rosetta spacecraft visible in the background as a small cross-shaped metallic object with solar panels, ' +
          'sunlight illuminating part of the nucleus surface while the other side is in shadow. ' +
          'Hard sci-fi scientific illustration, dark space background, realistic surface texture. ' +
          'Add the following text labels on the image: "comet nucleus 67P", "active jets", "Rosetta spacecraft".',
        alt: 'The nucleus of comet 67P/Churyumov-Gerasimenko with active gas jets and the Rosetta spacecraft in orbit',
        caption:
          'The Rosetta mission (2014–2016) was the first orbital study of an active comet. The nucleus of 67P has an irregular bilobed shape — the result of two bodies merging in the early Solar System.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Meteoroids, Meteors, Meteorites',
      level: 2,
      paragraphs: [
        'These three terms describe the same body at different stages of its interaction with Earth. ' +
        'A **meteoroid** is the general term for a small solid body in interplanetary space: from dust grains to objects a few meters across. ' +
        'When a meteoroid enters the atmosphere and burns up, we see a **meteor** — a flash of light in the sky. ' +
        'If the body is large enough not to burn up entirely, whatever reaches the surface is a **meteorite**.',

        'Meteors are commonplace: every day several thousand to ten thousand tons of cosmic material enter Earth\'s atmosphere, ' +
        'mostly as microscopic dust particles. The visible fiery streaks result from a stone a few millimeters to a few centimeters across ' +
        'heating the surrounding air by friction to thousands of kelvin. ' +
        'It is the superheated column of air that glows — not the stone itself.',

        '**Meteor showers** occur when Earth crosses a cloud of dust and debris left by a comet along its orbit. ' +
        'From our perspective, the meteors in a shower appear to radiate from a single point in the sky — the _radiant_ — ' +
        'a perspective effect, much like parallel train rails appearing to converge in the distance. ' +
        'The most famous showers: the _Perseids_ in August (associated with comet Swift-Tuttle) ' +
        'and the _Geminids_ in December — a rare exception where the parent body is the asteroid Phaethon, not a comet.',
      ],
    },

    {
      heading: 'Types of Meteorites',
      level: 2,
      paragraphs: [
        'Meteorites are the most accessible extraterrestrial material available for laboratory analysis. ' +
        'They divide into three main classes. **Chondrites** are the most common: the primordial material of the Solar System, ' +
        'almost unaltered since its formation. They contain small spherical inclusions called _chondrules_ — ' +
        'solidified droplets of melt that formed in the first few million years of the protoplanetary disk. ' +
        'Carbonaceous chondrites contain organic compounds and even amino acids — the building blocks of proteins.',

        '**Iron meteorites** are fragments of the cores of differentiated proto-planets. ' +
        'Composed mainly of iron and nickel, they display a characteristic crystalline pattern when cut and polished — ' +
        'the so-called _Widmanstatten structure_, which forms over billions of years of slow cooling ' +
        'inside a planetary body. Such a meteorite is literally a piece of a planetary core.',

        '**Stony-iron meteorites** are the rarest class: a mixture of silicates and metal. ' +
        'They formed at the boundary between the core and mantle of a disrupted proto-planet. ' +
        'The striking pallasites, with translucent olivine crystals set in a metallic matrix, ' +
        'are among the most scientifically and aesthetically prized specimens.',
      ],
    },

    {
      image: {
        cacheKey: 'comets-asteroids-meteors-meteorite-types',
        prompt:
          'Scientific illustration showing three types of meteorites side by side on a dark surface: ' +
          'left: a chondrite meteorite with fusion crust, grey-brown matrix and visible chondrule spheres labeled "chondrite"; ' +
          'center: a polished iron meteorite cross-section showing Widmanstätten crystalline pattern in silver-grey labeled "iron meteorite"; ' +
          'right: a pallasitic meteorite cross-section showing golden-green olivine crystals embedded in metallic matrix labeled "pallasite"; ' +
          'scale bar at bottom. Hard sci-fi scientific illustration, dark background, close-up macro detail. ' +
          'Add the following text labels on the image: "chondrite", "iron meteorite", "pallasite", "Widmanstatten pattern", "olivine crystals".',
        alt: 'Three meteorite types: a chondrite, an iron meteorite with Widmanstatten pattern, and a pallasite with olivine crystals',
        caption:
          'Chondrites preserve the primordial material of the Solar System for four and a half billion years. Iron meteorites are cores of shattered proto-planets. Pallasites formed at the core-mantle boundary.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Impacts That Changed Earth',
      level: 2,
      paragraphs: [
        'In 1908 something exploded over Tunguska — uninhabited taiga in Siberia — with an energy equivalent to several tens of nuclear weapons. ' +
        'Forest was flattened over an area of more than two thousand square kilometers. ' +
        'No crater was found, no substantial meteorite fragments recovered — the body disintegrated and exploded entirely in the air. ' +
        'The Tunguska event remains the most powerful documented cosmic impact in modern history. ' +
        'Its cause was most probably an asteroid or cometary nucleus between forty and eighty meters across.',

        'In February 2013 a meteorite approximately twenty meters in diameter broke up over Chelyabinsk, Russia. ' +
        'The shockwave shattered windows in thousands of buildings within a radius of several tens of kilometers ' +
        'and injured more than a thousand people — mostly from broken glass. ' +
        'Remarkably, no warning system detected the object in advance: ' +
        'it arrived from the direction of the Sun and was invisible until the last moment. ' +
        'The Chelyabinsk event became the first documented case of a cosmic impact causing mass casualties among people.',

        'In stark contrast to these comparatively modest events, an impact sixty-six million years ago — ' +
        'the Chicxulub asteroid, roughly ten kilometers across — left a crater beneath the Gulf of Mexico ' +
        'and triggered a mass extinction that wiped out nearly three-quarters of all species on Earth, ' +
        'including the non-avian dinosaurs. It is the textbook example of why planetary defense against asteroids ' +
        'is not science fiction but a genuine scientific and engineering challenge.',
      ],
    },

    {
      diagram: {
        title: 'Orbit Types of Small Bodies',
        svg: `<svg viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="400" fill="rgba(10,15,25,0.75)" rx="4"/>

  <!-- Sun -->
  <circle cx="130" cy="200" r="18" fill="#ffdd66" opacity="0.9"/>
  <text x="130" y="233" fill="#ffdd66" font-family="monospace" font-size="10" text-anchor="middle">Sun</text>

  <!-- Earth orbit reference -->
  <ellipse cx="130" cy="200" rx="48" ry="42" fill="none" stroke="#4488aa" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.5"/>
  <text x="180" y="197" fill="#4488aa" font-family="monospace" font-size="8">Earth</text>

  <!-- Asteroid (belt zone, roughly circular) -->
  <ellipse cx="130" cy="200" rx="105" ry="90" fill="none" stroke="#cc9944" stroke-width="1.5" opacity="0.7"/>
  <circle cx="235" cy="200" r="5" fill="#cc9944" opacity="0.9"/>
  <text x="248" y="197" fill="#cc9944" font-family="monospace" font-size="9">asteroid</text>
  <text x="248" y="208" fill="#8899aa" font-family="monospace" font-size="8">(near-circular orbit)</text>

  <!-- Near-Earth asteroid — ellipse crossing Earth orbit -->
  <ellipse cx="130" cy="200" rx="80" ry="60" fill="none" stroke="#ff8844" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.8" transform="rotate(-20,130,200)"/>
  <text x="58" y="135" fill="#ff8844" font-family="monospace" font-size="9">near-Earth</text>
  <text x="58" y="147" fill="#ff8844" font-family="monospace" font-size="9">asteroid</text>

  <!-- Short-period comet -->
  <ellipse cx="230" cy="200" rx="210" ry="100" fill="none" stroke="#7bb8ff" stroke-width="1.5" opacity="0.7"/>
  <text x="430" y="150" fill="#7bb8ff" font-family="monospace" font-size="9">short-period comet</text>
  <text x="430" y="162" fill="#7bb8ff" font-family="monospace" font-size="9">(Kuiper Belt)</text>
  <circle cx="22" cy="196" r="4" fill="#7bb8ff" opacity="0.9"/>

  <!-- Long-period comet -->
  <path d="M130,200 Q60,20 700,10" fill="none" stroke="#44ff88" stroke-width="1.5" stroke-dasharray="8,4" opacity="0.6"/>
  <text x="500" y="28" fill="#44ff88" font-family="monospace" font-size="9">long-period comet</text>
  <text x="500" y="40" fill="#8899aa" font-family="monospace" font-size="8">(Oort Cloud to perihelion)</text>
  <circle cx="130" cy="200" r="3" fill="#44ff88" opacity="0.8"/>
  <text x="142" y="215" fill="#44ff88" font-family="monospace" font-size="8">perihelion</text>

  <!-- Legend -->
  <rect x="20" y="320" width="400" height="68" fill="rgba(10,15,25,0.5)" stroke="#334455" stroke-width="0.8" rx="3"/>
  <line x1="30" y1="336" x2="55" y2="336" stroke="#cc9944" stroke-width="2"/>
  <text x="62" y="340" fill="#cc9944" font-family="monospace" font-size="9">Asteroid (Main Belt)</text>
  <line x1="30" y1="352" x2="55" y2="352" stroke="#ff8844" stroke-width="2" stroke-dasharray="5,2"/>
  <text x="62" y="356" fill="#ff8844" font-family="monospace" font-size="9">Near-Earth asteroid</text>
  <line x1="30" y1="368" x2="55" y2="368" stroke="#7bb8ff" stroke-width="2"/>
  <text x="62" y="372" fill="#7bb8ff" font-family="monospace" font-size="9">Short-period comet</text>
  <line x1="220" y1="368" x2="245" y2="368" stroke="#44ff88" stroke-width="2" stroke-dasharray="7,3"/>
  <text x="252" y="372" fill="#44ff88" font-family="monospace" font-size="9">Long-period comet</text>
</svg>`,
        caption:
          'Asteroids travel mostly on near-circular orbits in the Main Belt. Short-period comets have elongated elliptical orbits reaching the Kuiper Belt. Long-period comets arrive from the Oort Cloud and traverse the entire Solar System over millennia.',
      },
    },

    {
      heading: 'Planetary Defense: From Observation to Action',
      level: 2,
      paragraphs: [
        'Astronomers have now catalogued more than thirty thousand near-Earth asteroids. ' +
        'None of those currently known poses a threat to Earth for at least the next few centuries — but those are only the known objects. ' +
        'A significant fraction of smaller bodies (from twenty to one hundred forty meters in diameter) remains undiscovered. ' +
        'It is precisely these bodies — too small to be globally catastrophic but large enough to destroy an entire city ' +
        'on direct impact — that represent the primary practical risk.',

        'In 2022 NASA conducted the world\'s first real-world test of asteroid deflection technology. ' +
        'The DART spacecraft (Double Asteroid Redirection Test) deliberately rammed the asteroid Dimorphos, ' +
        'a small moonlet of the larger asteroid Didymos, and shortened its orbital period by nearly thirty minutes. ' +
        'This is the first experimentally confirmed proof that a kinetic impactor can alter the trajectory of an asteroid.',

        'Comets present a different type of risk: long-period objects are typically detected only a few months before perihelion — ' +
        'not enough time for any currently known technology to deflect them. ' +
        'This is why early detection and continuous sky surveys are the first and most critical line of defense.',
      ],
    },

    {
      image: {
        cacheKey: 'comets-asteroids-meteors-dart-impact',
        prompt:
          'Photorealistic scientific illustration of the DART spacecraft impact on asteroid Dimorphos: ' +
          'a box-shaped spacecraft with solar panels seen moments before collision with a rough rocky asteroid surface, ' +
          'plume of dust and debris exploding from the impact point in a bright white-grey cloud, ' +
          'the larger asteroid Didymos visible in the background as a dark rocky sphere, ' +
          'deep black space background with the Sun illuminating the scene from one side. ' +
          'Hard sci-fi scientific illustration, dramatic lighting, technically accurate spacecraft design. ' +
          'Add the following text labels on the image: "DART spacecraft", "Dimorphos", "impact plume", "Didymos".',
        alt: 'The DART spacecraft moments before impact with asteroid Dimorphos, with a dust plume from the collision',
        caption:
          'The DART mission in 2022 was the world\'s first successful test of kinetic asteroid interception. The orbital period of Dimorphos around Didymos shortened by approximately thirty-two minutes after impact.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Meteoroid',
      definition:
        'A solid body in interplanetary space smaller than an asteroid — ranging from dust grains to objects a few meters across. When it enters the atmosphere and begins to glow, it becomes a meteor.',
    },
    {
      term: 'Meteor',
      definition:
        'A luminous streak in the atmosphere caused by the heating of air around a rapidly moving meteoroid. It lasts from a fraction of a second to several seconds. Commonly but incorrectly called a "shooting star".',
    },
    {
      term: 'Meteorite',
      definition:
        'A fragment of a meteoroid that survived passage through the atmosphere and reached Earth\'s surface. Types include stony (chondrites, achondrites), iron, and stony-iron (pallasites).',
    },
    {
      term: 'Coma',
      definition:
        'The diffuse gas-and-dust cloud surrounding a comet\'s nucleus as it approaches the Sun, produced by sublimation of ices. Together with the nucleus it forms the comet\'s head.',
    },
    {
      term: 'Sublimation',
      definition:
        'The direct transition of a substance from solid to gas, bypassing the liquid phase. This is how cometary ices turn into gas under solar heating.',
    },
    {
      term: 'Oort Cloud',
      definition:
        'A hypothetical spherical shell of icy bodies surrounding the Solar System at distances from a few thousand to roughly one hundred thousand astronomical units. It is the reservoir of long-period comets.',
    },
    {
      term: 'Chondrite',
      definition:
        'The most common type of stony meteorite. It contains chondrules — small spherical inclusions of solidified melt — and is considered the primordial material of the Solar System with minimal geological processing.',
    },
    {
      term: 'Perihelion',
      definition:
        'The point in an orbit (of a planet, comet, or asteroid) closest to the Sun. Comets are most active near perihelion, where their ices sublimate and tails form.',
    },
    {
      term: 'Meteor shower',
      definition:
        'A period of elevated meteor activity observed annually when Earth crosses a swarm of dust particles left by a comet along its orbit. Shower meteors appear to radiate from a single point in the sky — the radiant.',
    },
  ],

  quiz: [
    {
      question: 'What is the key compositional difference between an asteroid and a comet?',
      options: [
        'Asteroids are larger than comets',
        'Asteroids are mainly rocky or metallic, while comets are icy bodies with dust inclusions',
        'Comets always have a tail, asteroids never do',
        'Asteroids come from the Oort Cloud, comets from the Main Belt',
      ],
      correctIndex: 1,
      explanation:
        'Asteroids are predominantly rocky or metallic bodies from the Main Belt between Mars and Jupiter. Comets are composed mainly of ice, dust, and organic compounds. A comet\'s tail only appears near the Sun when the ice sublimates — far from the Sun, a comet looks no different from an asteroid.',
    },
    {
      question: 'Why does a comet\'s ion tail always point away from the Sun, even when the comet is moving away from it?',
      options: [
        'Because the tail trails behind the comet as it moves',
        'Because the solar wind drives charged particles in the direction away from the Sun',
        'Because of the comet\'s rotation about its axis',
        'Because ions are heavier than dust particles and "fall behind"',
      ],
      correctIndex: 1,
      explanation:
        'The ion tail consists of charged particles (ions) swept away by the solar wind — a stream of charged particles flowing outward from the Sun. The solar wind always blows away from the Sun, so the ion tail always points in the anti-solar direction, regardless of the comet\'s direction of travel.',
    },
    {
      question: 'What is the source of the Perseid meteor shower?',
      options: [
        'Asteroids from the Main Belt that broke apart into smaller fragments',
        'A swarm of dust and debris left by comet Swift-Tuttle along its orbit',
        'A debris cloud from a collision between two asteroids in the Kuiper Belt',
        'Solar wind particles entering the atmosphere',
      ],
      correctIndex: 1,
      explanation:
        'The Perseid meteor shower is associated with comet Swift-Tuttle. Every August, Earth crosses the trail of dust and small fragments the comet has left along its orbit. The meteors appear to radiate from the direction of the Perseus constellation — hence the name.',
    },
    {
      question: 'Why did the 1908 Tunguska event leave no crater?',
      options: [
        'The body fell into water, not onto land',
        'The body exploded and disintegrated entirely in the atmosphere before reaching the surface',
        'The crater was buried under snow and later melted away',
        'The body bounced off and returned to space',
      ],
      correctIndex: 1,
      explanation:
        'The Tunguska event is an example of an airburst: the body disintegrated and released all its kinetic energy in the atmosphere, never reaching the ground. That is why no large crater formed. A similar but much smaller mechanism was at work during the 2013 Chelyabinsk impact.',
    },
    {
      question: 'What did the DART mission in 2022 demonstrate?',
      options: [
        'Asteroids are composed mainly of iron and nickel',
        'A kinetic impactor can alter the orbit of an asteroid',
        'Comets are more dangerous to Earth than asteroids',
        'The Oort Cloud is the source of short-period comets',
      ],
      correctIndex: 1,
      explanation:
        'DART (Double Asteroid Redirection Test) deliberately collided with the asteroid Dimorphos and changed its orbital period around the larger asteroid Didymos. This was the first real experimental proof that a kinetic impactor is a viable technology for protecting Earth from hazardous asteroids.',
    },
  ],

  sources: [
    {
      title: 'NASA — Small Body Database Browser',
      url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html',
      meta: 'NASA Jet Propulsion Laboratory, current small body database',
    },
    {
      title: 'NASA DART Mission — Double Asteroid Redirection Test',
      url: 'https://dart.jhuapl.edu/',
      meta: 'Johns Hopkins APL / NASA, 2022',
    },
    {
      title: 'ESA Rosetta Mission — 67P/Churyumov-Gerasimenko',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta',
      meta: 'ESA, mission 2004–2016',
    },
    {
      title: 'Altwegg K. et al. — 67P water isotopes (D/H ratio)',
      url: 'https://www.science.org/doi/10.1126/science.1261952',
      meta: 'Science, 347 (6220), 2015 — open access',
    },
    {
      title: 'Brownlee D.E. — The Origin and Evolution of Meteoritic Matter',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev.ea.03.050175.001321',
      meta: 'Annual Review of Earth and Planetary Sciences, 1975',
    },
    {
      title: 'NASA Planetary Defense Coordination Office',
      url: 'https://www.nasa.gov/planetarydefense/',
      meta: 'NASA, official planetary defense page',
    },
    {
      title: 'Popova O. et al. — Chelyabinsk Airburst 2013',
      url: 'https://www.science.org/doi/10.1126/science.1242642',
      meta: 'Science, 342, 2013 — open access',
    },
    {
      title: 'Jenniskens P. — Meteor Showers and their Parent Bodies',
      url: 'https://link.springer.com/book/10.1007/978-3-540-76978-1',
      meta: 'Springer, 2006',
    },
    {
      title: 'Weissman P.R. — The Oort Cloud',
      url: 'https://www.scientificamerican.com/article/the-oort-cloud/',
      meta: 'Scientific American, 1998',
    },
    {
      title: 'Burbine T.H. — Asteroids: Astronomical and Geological Bodies',
      url: 'https://www.cambridge.org/core/books/asteroids/B0E8C3B7B2D1B8A0E6F4B9A5E0D0C7F9',
      meta: 'Cambridge University Press, 2017',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
