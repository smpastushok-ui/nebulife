import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'nebulae-types',
  language: 'en',
  section: 'astronomy',
  order: 3,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Nebulae — Types and Physics',
  subtitle: 'From clouds that birth stars to the wreckage of explosions and the final sighs of dying suns.',

  hero: {
    cacheKey: 'nebulae-types-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: a dramatic composite of nebula types arranged in deep space — ' +
      'left side shows a vivid red-orange emission nebula with glowing ionized hydrogen gas and embedded young hot stars, ' +
      'center shows a blue reflection nebula with dust scattering starlight, ' +
      'right side shows a colorful ring-shaped planetary nebula with a white dwarf at center. ' +
      'Hard sci-fi style, ultra-detailed, dark space background with subtle star field, cinematic lighting. ' +
      'Add the following text labels on the image: "emission nebula", "reflection nebula", "planetary nebula".',
    alt: 'Three nebula types in space — emission, reflection, and planetary — each representing a different physical process',
    caption:
      'Nebulae are not a single phenomenon but a whole family of objects with different physical origins. Red glow signals ionized hydrogen, blue indicates scattered starlight, and concentric rings mark the last breath of a Sun-like star.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'The word "nebula" once meant simply something blurry through a telescope — and under that label fell everything: ' +
        'distant galaxies, star clusters, and gas clouds alike. Today the term is far more precise. ' +
        'A _nebula_ is a cloud of gas and dust in interstellar space that either glows with its own light, ' +
        'or is visible in reflected, absorbed, or transmitted light from sources behind or within it. ' +
        'Behind that simple definition hide several fundamentally different physical phenomena.',

        'Some nebulae are cradles of stars: dense molecular clouds where gravity slowly compresses gas until new suns ignite. ' +
        'Others are the aftermath of death: expanding shells shed by a dying star, or the wreckage of catastrophic explosions. ' +
        'What distinguishes them is not just shape and color but physics — the mechanism that makes gas glow, ' +
        'scatter light, or remain dark against a brighter background.',
      ],
    },

    {
      heading: 'Emission Nebulae — The Ionized Heart of the Galaxy',
      level: 2,
      paragraphs: [
        'The brightest and most recognizable nebulae are **emission nebulae**. Their color is predominantly red-pink, ' +
        'with threads of blue and green. This is not reflected light from another source — it is the gas\'s own radiation: ' +
        'atoms of hydrogen, oxygen, and sulfur absorb hard ultraviolet from young massive stars and then ' +
        'return that energy as photons at specific wavelengths.',

        'The mechanism is called **photoionization**. An ultraviolet photon knocks an electron free from a hydrogen atom, ' +
        'turning it into an ion. Eventually a free electron is recaptured by a nucleus and "cascades" ' +
        'down through energy levels, emitting a photon at each step. The transition between the second and first levels ' +
        'produces the characteristic red H-alpha line at a wavelength of roughly six hundred and fifty-six nanometers — ' +
        'precisely the color that dominates images of most emission nebulae.',

        'Astrophysicists call such nebulae **HII regions**: clouds of interstellar hydrogen ionized by nearby hot young stars. ' +
        'The Orion Nebula is the closest large region of active star formation to us, ' +
        'lying at a distance of roughly one thousand three hundred and fifty light-years. ' +
        'It is not merely a beautiful cloud: hundreds of stars are being born within it right now, ' +
        'and JWST in 2022 and 2023 returned images where protoplanetary disks and young stellar objects ' +
        'are visible with unprecedented resolution.',
      ],
    },

    {
      image: {
        cacheKey: 'nebulae-types-emission-orion',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Orion Nebula as a glowing emission nebula — ' +
          'vivid red-pink ionized hydrogen gas fills the frame, with a bright central cluster of hot blue-white young stars (the Trapezium cluster) ' +
          'illuminating surrounding gas clouds, dark dust lanes cutting through the nebulosity, subtle green glow from doubly ionized oxygen. ' +
          'Hard sci-fi style, deep black space background, dramatic lighting from the central stellar cluster. ' +
          'Add the following text labels on the image: "Trapezium cluster", "ionized hydrogen", "dust lane", "H-alpha emission".',
        alt: 'The Orion Nebula — an emission nebula with vivid red ionized hydrogen and a central young star cluster',
        caption:
          'The Orion Nebula is a region of active star formation where ultraviolet radiation from the young hot stars of the Trapezium cluster ionizes the surrounding hydrogen. The red glow is the H-alpha spectral line; the green tint comes from doubly ionized oxygen.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Reflection Nebulae — Dust That Scatters Starlight',
      level: 2,
      paragraphs: [
        'When a star is not hot enough to ionize surrounding gas, but is surrounded by a dust cloud, ' +
        'a completely different effect arises. Tiny grains — mostly icy particles with graphite or silicate cores — ' +
        'scatter the star\'s light in all directions, in the same way Earth\'s atmosphere scatters sunlight and makes the sky blue. ' +
        'Because small particles scatter short wavelengths (blue light) more efficiently, ' +
        'such **reflection nebulae** typically have a characteristic blue or blue-white hue.',

        'The classic example is the nebula surrounding the Pleiades star cluster. ' +
        'The Pleiades stars themselves are not hot enough to ionize gas — they are spectral class B, ' +
        'with ultraviolet present but not hard enough to strip hydrogen electrons. ' +
        'Instead they illuminate a dust cloud through which the cluster happens to be passing on its journey through the Galaxy. ' +
        'This cloud is genetically unrelated to the cluster — a cosmic coincidence that gives us ' +
        'one of the most beautiful examples of a reflection nebula anywhere on the sky.',

        'Reflection and emission nebulae are not mutually exclusive — both processes can operate within the same cloud. ' +
        'The Orion Nebula, for instance, contains regions of bright emission glow ' +
        'as well as dark areas where dust merely reflects or absorbs passing light.',
      ],
    },

    {
      image: {
        cacheKey: 'nebulae-types-reflection-pleiades',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Pleiades star cluster surrounded by a reflection nebula — ' +
          'bright blue-white B-type stars embedded in wispy blue-grey dust clouds that scatter their light, ' +
          'subtle blue nebulosity with dark dust filaments, faint star field in the deep black background, ' +
          'delicate streaks of scattered light around each bright star. ' +
          'Hard sci-fi style, dark space background, soft diffuse glow. ' +
          'Add the following text labels on the image: "Pleiades cluster", "dust scattering", "reflected starlight", "blue nebulosity".',
        alt: 'The Pleiades surrounded by a reflection nebula — a blue dust cloud lit by the young stars of the cluster',
        caption:
          'The reflection nebula around the Pleiades is a dust cloud illuminated by the cluster\'s stars. The blue color results from the same mechanism that makes Earth\'s sky blue: small particles scatter shorter wavelengths of light more efficiently.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Planetary Nebulae — A Star\'s Farewell',
      level: 2,
      paragraphs: [
        'The name is thoroughly misleading: these structures have nothing to do with planets. ' +
        'Astronomers of the eighteenth and nineteenth centuries named them so because of their round, disk-like appearance in small telescopes — ' +
        'a resemblance to the disks of Uranus and Neptune. Today we know that a **planetary nebula** is ' +
        'an expanding shell of gas shed by a star of solar-like mass at the end of its red giant phase.',

        'The mechanism works as follows: when helium in the stellar core is exhausted, the outer layers begin to pulsate unstably ' +
        'and gradually "blow off" as a slow stellar wind. ' +
        'Then, in a final burst of instability, the star rapidly expels the remainder of its outer envelope. ' +
        'The exposed hot core — the future _white dwarf_ — irradiates this gas with hard ultraviolet, ' +
        'making it glow. The result is a structure that often resembles a ring, a bubble, or a butterfly — ' +
        'depending on the viewing angle and the symmetry of the ejection.',

        'The Cat\'s Eye Nebula (NGC 6543) is one of the most thoroughly studied examples: ' +
        'concentric shells indicate that the star shed material in repeated waves over thousands of years. ' +
        'JWST has imaged similar structures with enough resolution to resolve ' +
        'fine threads and knots in the shells where hot gas collides with cooler surrounding material. ' +
        'Planetary nebulae are relatively short-lived — they persist for tens of thousands of years ' +
        'before dispersing into the interstellar medium.',
      ],
    },

    {
      diagram: {
        title: 'Nebula Types and Their Emission Mechanisms',
        svg: `<svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="380" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Column headers -->
  <text x="116" y="30" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">Emission</text>
  <text x="350" y="30" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">Reflection</text>
  <text x="584" y="30" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">Planetary</text>

  <!-- Dividers -->
  <line x1="233" y1="15" x2="233" y2="365" stroke="#334455" stroke-width="0.8" opacity="0.7"/>
  <line x1="467" y1="15" x2="467" y2="365" stroke="#334455" stroke-width="0.8" opacity="0.7"/>

  <!-- === Emission nebula column === -->
  <!-- Hot star -->
  <circle cx="116" cy="85" r="16" fill="#aad4ff" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="116" y="89" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">O/B</text>
  <!-- UV rays -->
  <line x1="128" y1="78" x2="165" y2="65" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,2" opacity="0.8"/>
  <line x1="132" y1="85" x2="170" y2="85" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,2" opacity="0.8"/>
  <line x1="128" y1="92" x2="165" y2="105" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,2" opacity="0.8"/>
  <text x="152" y="60" fill="#7bb8ff" font-family="monospace" font-size="8">UV</text>
  <!-- Gas cloud -->
  <ellipse cx="190" cy="85" rx="28" ry="22" fill="rgba(204,68,68,0.25)" stroke="#cc4444" stroke-width="1.2"/>
  <!-- Photon out -->
  <line x1="218" y1="80" x2="228" y2="70" stroke="#ff8844" stroke-width="1.2"/>
  <line x1="218" y1="85" x2="228" y2="85" stroke="#cc4444" stroke-width="1.2"/>
  <line x1="218" y1="90" x2="228" y2="100" stroke="#cc4444" stroke-width="1.2"/>
  <!-- Labels -->
  <text x="116" y="115" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">hot star</text>
  <text x="190" y="118" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">ionized</text>
  <text x="190" y="130" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">H II gas</text>
  <text x="116" y="155" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Mechanism:</text>
  <text x="116" y="168" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">photoionization</text>
  <text x="116" y="185" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">+ recombination</text>
  <text x="116" y="210" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Color: red</text>
  <text x="116" y="225" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(H-alpha 656 nm)</text>
  <text x="116" y="250" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Example:</text>
  <text x="116" y="265" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Orion Nebula</text>
  <!-- mini emission nebula sketch -->
  <ellipse cx="116" cy="315" rx="40" ry="28" fill="rgba(204,68,68,0.3)" stroke="#cc4444" stroke-width="1"/>
  <circle cx="116" cy="315" r="5" fill="#aad4ff"/>

  <!-- === Reflection nebula column === -->
  <!-- Cooler star -->
  <circle cx="350" cy="85" r="13" fill="#ffee88" stroke="#ffd050" stroke-width="1.5"/>
  <text x="350" y="89" fill="#020510" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">B/A</text>
  <!-- Light rays to dust -->
  <line x1="362" y1="78" x2="395" y2="65" stroke="#ffee88" stroke-width="1" opacity="0.7"/>
  <line x1="363" y1="85" x2="396" y2="85" stroke="#ffee88" stroke-width="1" opacity="0.7"/>
  <line x1="362" y1="92" x2="395" y2="105" stroke="#ffee88" stroke-width="1" opacity="0.7"/>
  <!-- Dust cloud -->
  <ellipse cx="420" cy="85" rx="24" ry="20" fill="rgba(100,120,160,0.3)" stroke="#8899aa" stroke-width="1.2"/>
  <text x="420" y="90" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="middle">dust</text>
  <!-- Scattered light -->
  <line x1="430" y1="75" x2="445" y2="62" stroke="#7bb8ff" stroke-width="1.2"/>
  <line x1="435" y1="85" x2="452" y2="85" stroke="#7bb8ff" stroke-width="1.2"/>
  <line x1="430" y1="96" x2="445" y2="110" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="456" y="62" fill="#7bb8ff" font-family="monospace" font-size="8">scattered</text>
  <!-- Labels -->
  <text x="350" y="115" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">cooler star</text>
  <text x="350" y="155" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Mechanism:</text>
  <text x="350" y="168" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">scattering</text>
  <text x="350" y="185" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">on dust grains</text>
  <text x="350" y="210" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Color: blue</text>
  <text x="350" y="225" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(Rayleigh scattering)</text>
  <text x="350" y="250" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Example:</text>
  <text x="350" y="265" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Pleiades nebula</text>
  <!-- mini reflection nebula sketch -->
  <ellipse cx="350" cy="315" rx="38" ry="24" fill="rgba(68,100,170,0.3)" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="330" cy="310" r="4" fill="#ffee88"/>

  <!-- === Planetary nebula column === -->
  <!-- White dwarf center -->
  <circle cx="584" cy="85" r="6" fill="#ddeeff" stroke="#aabbcc" stroke-width="1.5"/>
  <!-- Shells -->
  <ellipse cx="584" cy="85" rx="22" ry="18" fill="none" stroke="#44ff88" stroke-width="1.5" opacity="0.8"/>
  <ellipse cx="584" cy="85" rx="36" ry="28" fill="none" stroke="#cc4444" stroke-width="1.2" opacity="0.7"/>
  <ellipse cx="584" cy="85" rx="50" ry="40" fill="none" stroke="#ff8844" stroke-width="0.8" opacity="0.5"/>
  <!-- UV arrows outward -->
  <line x1="590" y1="79" x2="600" y2="64" stroke="#7bb8ff" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.7"/>
  <line x1="590" y1="85" x2="608" y2="85" stroke="#7bb8ff" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.7"/>
  <!-- Labels -->
  <text x="584" y="138" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">white dwarf</text>
  <text x="584" y="155" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Mechanism:</text>
  <text x="584" y="168" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">UV from dwarf</text>
  <text x="584" y="185" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">ionizes ejected</text>
  <text x="584" y="198" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">shells</text>
  <text x="584" y="215" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Color: varies</text>
  <text x="584" y="230" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(O III green,</text>
  <text x="584" y="243" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">H-alpha red)</text>
  <text x="584" y="265" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Example:</text>
  <text x="584" y="280" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Cat's Eye</text>
  <!-- mini planetary nebula sketch -->
  <ellipse cx="584" cy="335" rx="36" ry="24" fill="none" stroke="#44ff88" stroke-width="1.5"/>
  <ellipse cx="584" cy="335" rx="20" ry="12" fill="none" stroke="#cc4444" stroke-width="1"/>
  <circle cx="584" cy="335" r="4" fill="#ddeeff"/>
</svg>`,
        caption:
          'The three main nebula types differ by mechanism: an emission nebula glows through its own ionized gas, a reflection nebula scatters starlight on dust grains, and a planetary nebula is a shed stellar shell ionized by ultraviolet from a central white dwarf.',
      },
    },

    {
      heading: 'Supernova Remnants — The Shockwaves of Stellar Death',
      level: 2,
      paragraphs: [
        'When a massive star detonates as a supernova, it hurls several solar masses of material into space ' +
        'at velocities ranging from several thousand to several tens of thousands of kilometers per second. ' +
        'This wave, colliding with surrounding interstellar gas, compresses and heats it to millions of kelvin. ' +
        'The result is a **supernova remnant** — an expanding shell of superheated gas that glows across a wide range: ' +
        'from radio waves through visible light to X-ray emission.',

        'The Crab Nebula (M1 in the constellation Taurus) is the textbook example. ' +
        'In the twelfth century, Chinese and Japanese astronomers recorded a new bright star visible in daylight — ' +
        'the light of a supernova explosion. The expanding shell is still growing at roughly ' +
        'one thousand five hundred kilometers per second. ' +
        'At its heart spins a **pulsar** — a neutron star making thirty rotations per second ' +
        'that continuously pumps the nebula with streams of charged particles, driving X-ray emission throughout.',

        'The Veil Nebula in Cygnus is an example of a much older remnant. ' +
        'The explosion occurred tens of thousands of years ago, and in that time the blast wave has expanded ' +
        'across more than one hundred light-years. The delicate filamentary wisps of gas mark the places where the shockwave ' +
        'meets the unevenly distributed interstellar medium. ' +
        'JWST has found structure within these filaments at scales previously inaccessible — ' +
        'knots and fibers where complex mixing and cooling processes are actively occurring.',
      ],
    },

    {
      image: {
        cacheKey: 'nebulae-types-supernova-remnant-crab',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Crab Nebula supernova remnant — ' +
          'a chaotic tangle of glowing filaments in red, orange, and blue against deep black space, ' +
          'central pulsar region showing a bright white-blue knot of synchrotron radiation, ' +
          'delicate thread-like wisps of ejected stellar material criss-crossing the nebula, ' +
          'outer edges showing faint red hydrogen emission. ' +
          'Hard sci-fi style, detailed scientific illustration, dramatic structure. ' +
          'Add the following text labels on the image: "pulsar", "synchrotron emission", "expanding filaments", "supernova 1054 CE".',
        alt: 'The Crab Nebula — supernova remnant from the twelfth century with a central pulsar and tangled filaments of superheated gas',
        caption:
          'The Crab Nebula has been expanding for over a thousand years since its supernova. The central pulsar continuously energizes the nebula, driving synchrotron radiation visible all the way into the X-ray band.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Dark Clouds and Molecular Complexes',
      level: 2,
      paragraphs: [
        'Not all nebulae are visible through their own or reflected light. **Dark nebulae** are dense clouds ' +
        'of molecular gas and dust that absorb the light of objects lying behind them. ' +
        'They do not glow — they are visible as dark silhouettes against a brighter background.',

        'The Horsehead Nebula in Orion is one of the most recognized examples. ' +
        'The distinctive silhouette is a dark tongue of gas and dust protruding from a dense molecular cloud ' +
        'against the backdrop of the glowing emission nebula IC 434. ' +
        'No optical image could reveal the internal structure of these clouds — ' +
        'until JWST\'s infrared instruments pierced through the dust and revealed ' +
        'numerous young stellar objects forming within.',

        'Molecular clouds are the true factories of stars. They consist mainly of molecular hydrogen, ' +
        'carbon monoxide, ammonia, and hundreds of organic molecules. ' +
        'Interior temperatures run from ten to thirty kelvin: barely above absolute zero. ' +
        'In these conditions gravity can slowly overcome gas pressure, and in the densest cores ' +
        'gravitational collapse begins — ultimately producing new stars. ' +
        'A dark nebula and a stellar nursery are the same object viewed from different perspectives.',
      ],
    },

    {
      image: {
        cacheKey: 'nebulae-types-horsehead-dark',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Horsehead Nebula — ' +
          'a dark dense pillar of gas and dust shaped like a horse\'s head silhouetted against a vivid glowing red-orange emission nebula background (IC 434), ' +
          'the dark nebula\'s edge dramatically lit by nearby star Sigma Orionis, ' +
          'faint blue reflection nebulosity near the base of the pillar, ' +
          'deep black space beyond the emission region. ' +
          'Hard sci-fi style, dramatic and detailed. ' +
          'Add the following text labels on the image: "dark molecular cloud", "IC 434 emission nebula", "dust pillar", "Horsehead".',
        alt: 'The Horsehead Nebula — a dark molecular cloud silhouetted against the bright emission nebula IC 434',
        caption:
          'The Horsehead is a dark nebula that blocks the light of the emission nebula behind it. Inside this cloud new stars are currently forming, invisible in optical wavelengths but clearly revealed in JWST infrared images.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What JWST Changed in Our Understanding of Nebulae',
      level: 2,
      paragraphs: [
        'The James Webb Space Telescope, which began science operations in 2022, ' +
        'has essentially redrawn the atlas of nebulae. ' +
        'Its infrared cameras see through dust where optical telescopes face an opaque curtain. ' +
        'Images of the Orion Nebula revealed hundreds of protoplanetary disks — called _proplyds_ — ' +
        'forming inside the cloud under bombardment from ultraviolet radiation of neighboring massive stars. ' +
        'Some of these disks are being rapidly destroyed — a process known as _photoevaporation_ — ' +
        'and future planetary systems will succeed only if they assemble quickly enough.',

        'In planetary nebulae, JWST reveals structures that no previous observatory could resolve. ' +
        'An image of the Southern Ring Nebula (NGC 3132) showed that its center contains not one but two stars: ' +
        'the star that actually shed the shell, and its companion. ' +
        'The interaction between them shaped the nebula\'s complex form — ' +
        'something previous telescopes simply lacked the resolution to detect.',

        'In supernova remnants, JWST captures details of shock fronts at scales where ' +
        'the real mixing of heavy elements into the interstellar medium is taking place. ' +
        'Carbon, oxygen, silicon, and iron synthesized inside a star are scattered by the explosion ' +
        'across hundreds of light-years — and eventually become part of ' +
        'new molecular clouds and, perhaps, new planetary systems. ' +
        'Nebulae are not simply beautiful images. They are the chemical kitchen of the universe, ' +
        'where matter passes from star to star, from generation to generation.',
      ],
    },

    {
      image: {
        cacheKey: 'nebulae-types-jwst-southern-ring',
        prompt:
          'Photorealistic illustration for a science encyclopedia: JWST view of the Southern Ring planetary nebula NGC 3132 — ' +
          'dramatic shells of glowing gas in red, orange, and blue forming concentric rings around a central binary star pair, ' +
          'outer shell of ionized hydrogen in deep red, inner shells in teal-green from ionized oxygen, ' +
          'faint dusty central region with two visible stellar sources, intricate filamentary structure between shells. ' +
          'Infrared false-color scientific aesthetic, hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "dying star", "companion star", "ionized shells", "NGC 3132".',
        alt: 'The Southern Ring Nebula NGC 3132 — JWST revealed two stellar sources at the center surrounded by concentric ionized shells',
        caption:
          'JWST discovered a second star at the center of the Southern Ring Nebula — a companion whose gravitational interaction shaped the nebula\'s complex shell structure. This image was the first direct demonstration of how a binary system sculpts a planetary nebula.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Emission nebula',
      definition:
        'A cloud of ionized gas (primarily hydrogen) that glows with its own light through photoionization by ultraviolet radiation from nearby massive stars. The characteristic red-pink color is the H-alpha spectral line of ionized hydrogen.',
    },
    {
      term: 'Photoionization',
      definition:
        'The process by which an ultraviolet photon ejects an electron from an atom, converting it into an ion. When the electron is recaptured, the atom emits photons at specific wavelengths — producing the self-luminescence of emission nebulae.',
    },
    {
      term: 'Reflection nebula',
      definition:
        'A dust cloud with no ionizing radiation source of its own that scatters visible light from nearby stars off dust grains. Has a characteristic blue color because small dust particles scatter shorter wavelengths more efficiently.',
    },
    {
      term: 'Planetary nebula',
      definition:
        'An expanding shell of gas shed by a low or intermediate-mass star at the end of its red giant phase. Ionized by ultraviolet from the central white dwarf. Entirely unrelated to planets — the name arose from a disk-like appearance in early telescopes.',
    },
    {
      term: 'Supernova remnant',
      definition:
        'An expanding shell of material ejected during the explosion of a massive star. The blast wave heats surrounding gas to millions of kelvin, producing bright emission from radio to X-ray wavelengths.',
    },
    {
      term: 'Dark nebula',
      definition:
        'A dense cloud of molecular gas and dust that absorbs the light of background objects. It has no self-emission and is visible only as a dark silhouette against brighter sources. It is also a site of active star formation.',
    },
    {
      term: 'HII region',
      definition:
        'A cloud of ionized hydrogen (HII denotes a singly ionized hydrogen atom) around hot O- and B-type stars. A synonym for emission nebula in the context of star formation. H denotes hydrogen, II denotes one lost electron.',
    },
    {
      term: 'Synchrotron radiation',
      definition:
        'Electromagnetic radiation emitted by charged particles (typically electrons) moving at near-light speed in a magnetic field. Dominates in supernova remnants powered by pulsars — for example, in the Crab Nebula.',
    },
    {
      term: 'Photoevaporation',
      definition:
        'The destruction of a young star\'s protoplanetary disk by hard ultraviolet radiation from neighboring massive stars. Observed in HII regions such as the Orion Nebula. JWST was the first to capture this process directly and in detail.',
    },
  ],

  quiz: [
    {
      question: 'Why do most emission nebulae appear red or pink?',
      options: [
        'They reflect red light from nearby cool stars',
        'Ionized hydrogen emits the H-alpha spectral line — red light at roughly 656 nanometers — during electron recombination',
        'Dust in the nebula absorbs blue wavelengths and transmits red ones',
        'The gas is heated to a temperature at which a blackbody radiates in the red part of the spectrum',
      ],
      correctIndex: 1,
      explanation:
        'Emission nebulae glow through photoionization: ultraviolet from young stars strips electrons from hydrogen atoms, and when those electrons recombine they emit photons at specific wavelengths. The strongest is the H-alpha line at roughly 656 nanometers, which falls in the red portion of the visible spectrum — producing the characteristic pink-red color of these objects.',
    },
    {
      question: 'How does a reflection nebula differ from an emission nebula?',
      options: [
        'A reflection nebula is much hotter',
        'A reflection nebula has no self-emission — it scatters starlight from nearby stars off dust grains',
        'A reflection nebula is composed of oxygen while an emission nebula is composed of hydrogen',
        'A reflection nebula always surrounds a star that has exploded',
      ],
      correctIndex: 1,
      explanation:
        'A reflection nebula has no ionization mechanism of its own — it simply scatters visible starlight off dust particles. Because small dust grains scatter shorter wavelengths (blue light) more efficiently, reflection nebulae appear blue or blue-white — a striking contrast with the red of emission nebulae.',
    },
    {
      question: 'What actually occupies the center of a planetary nebula?',
      options: [
        'A spinning neutron star',
        'A stellar-mass black hole',
        'A white dwarf — the exposed remnant core of the former star',
        'A protostar that is just beginning to form',
      ],
      correctIndex: 2,
      explanation:
        'A planetary nebula forms when a star of solar-like mass sheds its outer layers at the end of its life. What remains at the center is an extremely hot core — a white dwarf. It irradiates the expelled gas with hard ultraviolet, ionizing it and making it glow.',
    },
    {
      question: 'How does a supernova remnant physically differ from a planetary nebula?',
      options: [
        'A supernova remnant is cooler and smaller',
        'A supernova remnant is formed by the explosion of a massive star and contains gas heated to millions of kelvin by the blast shockwave',
        'A planetary nebula is always larger than a supernova remnant',
        'Both objects are physically identical; the difference is only in size',
      ],
      correctIndex: 1,
      explanation:
        'A planetary nebula is a slowly shed shell from a low-mass star, ionized by the ultraviolet of its white dwarf core. A supernova remnant is the consequence of a catastrophic explosion of a massive star: material expands at thousands of kilometers per second, driving a shockwave that heats surrounding gas to millions of kelvin. Supernova remnants are prominently luminous in X-ray light.',
    },
    {
      question: 'Why are dark nebulae considered sites of star formation rather than simply empty dust clouds?',
      options: [
        'Because they contain no gas — only dust — and dust is the raw material for planets',
        'Because they lie near already-formed stars, which are the true source of star formation',
        'Because their dense, cold interiors are the exact conditions where gravity can overcome gas pressure and trigger collapse into new stars',
        'Because dark nebulae are remnants of ancient supernovae',
      ],
      correctIndex: 2,
      explanation:
        'Dark molecular clouds are the densest and coldest structures in the interstellar medium. At temperatures from ten to thirty kelvin and densities thousands of times greater than the surrounding space, gravitational compression can overcome thermal gas pressure. In the densest cores, collapse begins — ultimately producing new stars. JWST confirmed this by revealing numerous young stellar objects forming within dark clouds such as the Horsehead Nebula.',
    },
  ],

  sources: [
    {
      title: 'NASA JWST — Orion Nebula Protoplanetary Disks',
      url: 'https://www.nasa.gov/missions/webb/nasas-webb-captures-stellar-birth-in-orion-nebula/',
      meta: 'NASA Webb press release, 2023',
    },
    {
      title: 'NASA JWST — Southern Ring Nebula NGC 3132',
      url: 'https://www.nasa.gov/image-feature/goddard/2022/webb-sees-dying-star-s-final-performance-in-fine-detail',
      meta: 'NASA Webb press release, 2022',
    },
    {
      title: 'NASA JWST — Horsehead Nebula',
      url: 'https://www.nasa.gov/missions/webb/nasa-s-james-webb-space-telescope-explores-the-horsehead-nebula-like-never-before/',
      meta: 'NASA Webb press release, 2024',
    },
    {
      title: 'ESA — What is a Nebula?',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/What_is_a_nebula',
      meta: 'ESA Science, educational resource',
    },
    {
      title: 'NASA — Crab Nebula (M1) Overview',
      url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-1/',
      meta: 'NASA Science, Hubble Messier catalog',
    },
    {
      title: 'Osterbrock D.E. — Astrophysics of Gaseous Nebulae and Active Galactic Nuclei (2nd ed.)',
      url: 'https://uscibooks.aip.org/books/astrophysics-of-gaseous-nebulae-and-active-galactic-nuclei-2nd-ed/',
      meta: 'University Science Books, 2006 — standard reference',
    },
    {
      title: 'Dyson J.E., Williams D.A. — The Physics of the Interstellar Medium (2nd ed.)',
      url: 'https://www.routledge.com/The-Physics-of-the-Interstellar-Medium/Dyson-Williams/p/book/9780750304320',
      meta: 'Institute of Physics Publishing, 1997',
    },
    {
      title: 'McCray R. — Supernova 1987A Revisited — Annual Review of Astronomy and Astrophysics',
      url: 'https://www.annualreviews.org/doi/abs/10.1146/annurev.astro.43.072103.150755',
      meta: 'ARA&A, 2005, open access',
    },
    {
      title: 'Bally J. et al. — Externally Illuminated Young Stellar Environments in the Orion Nebula',
      url: 'https://iopscience.iop.org/article/10.3847/2041-8213/acac75',
      meta: 'ApJL 2023 — JWST observations of proplyds, open access',
    },
    {
      title: 'NASA — Planetary Nebulae: Overview',
      url: 'https://science.nasa.gov/universe/stars/planetary-nebulae/',
      meta: 'NASA Science, updated 2024',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
