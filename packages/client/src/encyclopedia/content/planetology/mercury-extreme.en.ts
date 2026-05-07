import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'mercury-extreme',
  language: 'en',
  section: 'planetology',
  order: 2,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Mercury — World of Extremes',
  subtitle: 'The smallest planet in the solar system: where a day lasts two years, the dayside blazes and the nightside freezes — and questions remain without answers.',

  hero: {
    cacheKey: 'mercury-extreme-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: Mercury planet in full disc view from space, ' +
      'heavily cratered grey-brown surface with ancient impact basins, sharp shadows on craters showing no atmosphere, ' +
      'large Caloris Basin visible as a pale circular scar on the surface, ' +
      'the Sun blazing intensely nearby, dark space background. Hard sci-fi style. ' +
      'Add the following text labels on the image: "Mercury", "Caloris Basin", "Sun (nearby)".',
    alt: 'Mercury in full disc — cratered grey-brown surface with Caloris Basin and the Sun blazing nearby',
    caption: 'Mercury is the closest planet to the Sun and the smallest in the solar system. The MESSENGER mission in the early twenty-first century produced the first complete map of its surface.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'When Egyptian priests in the twenty-sixth century before the common era first recorded the motions ' +
        'of a bright point that appeared before sunrise and after sunset, ' +
        'they had no idea that this planet concealed one of the strangest mechanisms in the solar system. ' +
        'Mercury is not merely small and hot. It is a world where the concepts of "day" and "year" ' +
        'are twisted into an unlikely knot — where the surface heats above four hundred and thirty degrees Celsius by day ' +
        'and plunges to minus one hundred and eighty degrees at night, ' +
        'and where billions of tonnes of water ice have lain undisturbed for billions of years ' +
        'inside shadowed craters just tens of millions of kilometers from the Sun.',

        'Mercury hides well from observers. Its proximity to the Sun makes it nearly impossible to study through a telescope from Earth — ' +
        'visible only at dawn and dusk, in a narrow window between the horizon and the solar glare. ' +
        'A detailed map of its surface appeared only in the early twenty-first century, ' +
        'after the American probe MESSENGER spent four years in orbit around the planet. ' +
        'In December 2026, BepiColombo — a joint mission of the European Space Agency and the Japan Aerospace Exploration Agency — ' +
        'will arrive at Mercury and open a new chapter in exploring this unusual world.',
      ],
    },

    {
      heading: 'Smallest — but Not Least',
      level: 2,
      paragraphs: [
        'Until the twenty-fourth of August two thousand and six, Mercury had a competitor for the title of smallest planet: ' +
        'Pluto with its diameter of nearly two thousand four hundred kilometers. ' +
        'The decision of the International Astronomical Union reclassifying Pluto as a dwarf planet ' +
        'made Mercury officially the smallest planet in the solar system, ' +
        'with a diameter of approximately four thousand eight hundred and seventy-five kilometers — ' +
        'only slightly larger than our Moon.',

        'But size deceives. Mercury\'s mass — and therefore its **_mean density_** — ' +
        'is substantially higher than one would expect for a body of its size. ' +
        'Mercury is one of the densest planets in the solar system, second only to Earth. ' +
        'The reason is buried inside: an iron-nickel core that accounts for more than sixty percent of the planet\'s total mass ' +
        'and approximately seventy-five percent of its radius. ' +
        'By comparison, Earth\'s core makes up only about thirty percent of its mass. ' +
        'Mercury is essentially a vast iron core wrapped in a thin rocky mantle and crust.',
      ],
    },

    {
      image: {
        cacheKey: 'mercury-size-comparison',
        prompt:
          'Photorealistic illustration for a science encyclopedia: accurate size comparison showing Mercury, Earth\'s Moon, and Earth side by side against black space. ' +
          'Mercury and Moon are close in size, Earth much larger. Grey cratered surfaces, scientific accuracy. ' +
          'Add the following text labels on the image: "Mercury (4,879 km)", "Moon (3,474 km)", "Earth (12,742 km)".',
        alt: 'Size comparison of Mercury, the Moon, and Earth',
        caption: 'Mercury is only slightly larger than the Moon, but three times as dense — because of its enormous iron core. Earth is shown to the right for scale.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'An Iron Heart and the Giant Impact Hypothesis',
      level: 2,
      paragraphs: [
        'Where does such a disproportionately large iron core come from? This question remains one of the most compelling in planetary science. ' +
        'The most widely accepted explanation is the **_giant impact hypothesis_**: ' +
        'in the early solar system, while planets were still young and partially molten, ' +
        'a large protoplanetary body collided with Mercury. ' +
        'The impact stripped away much of the silicate mantle and crust, ' +
        'leaving behind a disproportionately large metallic interior.',

        'Alternative explanations connect the large core to the conditions of formation close to the Sun. ' +
        'The young Sun\'s heat and solar wind pressure may have vaporized or blown away ' +
        'much of the lighter silicate material from the outer layers of the proto-Mercury, ' +
        'leaving the metal behind. Both theories are consistent with current observations — ' +
        'and the BepiColombo mission has set as one of its primary goals the collection of data ' +
        'that will ultimately distinguish between these scenarios.',

        'Crucially, against expectations, Mercury\'s core is not fully solidified. ' +
        'Data from the MESSENGER mission confirmed that at least part of the core remains liquid. ' +
        'This is what explains the existence of a planetary magnetic field — ' +
        'weak but real, generated by convection in the liquid metallic core.',
      ],
    },

    {
      heading: 'The 3:2 Resonance — The Strangest Day in the Solar System',
      level: 2,
      paragraphs: [
        'Through the middle of the twentieth century, astronomers were convinced that Mercury rotated synchronously with its orbit — ' +
        'always showing the same face to the Sun, as the Moon does to Earth. ' +
        'Radar observations in the nineteen-sixties overturned this idea completely.',

        'Mercury is locked in a **_3:2 spin-orbit resonance_**: ' +
        'for every two complete orbits around the Sun, the planet completes exactly three rotations on its axis. ' +
        'A year on Mercury lasts eighty-eight Earth days. ' +
        'Three rotations in eighty-eight days means one full axial rotation takes approximately fifty-nine days.',

        'But a "day" — the time from one sunrise to the next — is an entirely different matter. ' +
        'Because the planet is simultaneously rotating and moving along its orbit, ' +
        'the solar day on Mercury stretches to **one hundred and seventy-six Earth days**. ' +
        'In effect, one Mercurian solar day equals two Mercurian years. ' +
        'If you stood on the surface, you would watch the Sun rise, slow to a halt, ' +
        'briefly reverse direction across the sky, and then resume its forward march — ' +
        'a phenomenon called the **_retrograde solar loop_**, ' +
        'caused by the sharp acceleration of orbital motion near perihelion.',
      ],
    },

    {
      diagram: {
        title: '3:2 Resonance: Two Orbits, Three Rotations',
        svg: `<svg viewBox="0 0 580 360" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="580" height="360" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Sun -->
  <circle cx="130" cy="180" r="28" fill="#ff8844" opacity="0.9"/>
  <text x="130" y="185" text-anchor="middle" fill="#020510" font-family="monospace" font-size="10" font-weight="bold">SUN</text>

  <!-- Orbit ellipse (slightly eccentric) -->
  <ellipse cx="152" cy="180" rx="170" ry="120" fill="none" stroke="#667788" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>

  <!-- Mercury positions at 4 key points (2 orbits = 3 rotations) -->
  <!-- Pos 1: 0 deg -->
  <circle cx="322" cy="180" r="9" fill="#aabbcc" opacity="0.85"/>
  <line x1="322" y1="180" x2="335" y2="167" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="338" y="165" fill="#7bb8ff" font-family="monospace" font-size="9">1</text>

  <!-- Pos 2: 90 deg -->
  <circle cx="152" cy="60" r="9" fill="#aabbcc" opacity="0.85"/>
  <line x1="152" y1="60" x2="165" y2="55" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="168" y="53" fill="#7bb8ff" font-family="monospace" font-size="9">2</text>

  <!-- Pos 3: 180 deg -->
  <circle cx="0" cy="180" r="9" fill="#aabbcc" opacity="0.85"/>
  <line x1="10" y1="180" x2="0" y2="165" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="1" y="162" fill="#7bb8ff" font-family="monospace" font-size="9">3</text>

  <!-- Pos 4: 270 deg -->
  <circle cx="152" cy="300" r="9" fill="#aabbcc" opacity="0.85"/>
  <line x1="152" y1="300" x2="165" y2="305" stroke="#7bb8ff" stroke-width="1.2"/>
  <text x="168" y="310" fill="#7bb8ff" font-family="monospace" font-size="9">4</text>

  <!-- Rotation arrows on Mercury spheres -->
  <path d="M 322 170 A 9 9 0 1 1 312 180" fill="none" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arrowGe)"/>
  <path d="M 152 50 A 9 9 0 1 1 142 60" fill="none" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arrowGe)"/>
  <path d="M 10 170 A 9 9 0 1 1 0 180" fill="none" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arrowGe)"/>

  <defs>
    <marker id="arrowGe" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#44ff88"/>
    </marker>
  </defs>

  <!-- Info box -->
  <rect x="350" y="60" width="220" height="100" fill="rgba(20,30,45,0.85)" rx="3" stroke="#aabbcc" stroke-width="0.7"/>
  <text x="460" y="82" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Resonance 3 : 2</text>
  <text x="460" y="100" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="10">2 orbits around Sun</text>
  <text x="460" y="116" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="10">= 3 axial rotations</text>
  <text x="460" y="132" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Solar day = 176 Earth days</text>
  <text x="460" y="147" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Year = 88 Earth days</text>

  <text x="290" y="345" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Diagram simplified. Orbit not to scale. Axial tilt is negligible.</text>
</svg>`,
        caption: 'The 3:2 resonance of Mercury: two complete orbits around the Sun for every three axial rotations. As a result, one solar day is twice as long as one year.',
      },
    },

    {
      heading: 'Temperature Extremes',
      level: 2,
      paragraphs: [
        'Mercury teaches us that proximity to the Sun does not guarantee uniformly distributed heat. ' +
        'The planet has virtually no atmosphere — only an ultrathin envelope of atoms ' +
        'blasted off the surface by solar wind and micrometeorite impacts. ' +
        'This envelope is utterly insufficient to retain heat or equalize temperatures.',

        'The result is staggering: the surface heats to plus four hundred and thirty degrees Celsius by day — ' +
        'enough to melt zinc and lead. ' +
        'At night, with no gaseous blanket, that same surface cools to minus one hundred and eighty degrees. ' +
        'The swing between the nighttime minimum and daytime maximum exceeds six hundred degrees — ' +
        'the largest temperature range of any planet in the solar system.',

        'By comparison, Venus, which is roughly twice as far from the Sun, ' +
        'maintains a surface temperature of a stable plus four hundred and sixty degrees Celsius — ' +
        'day and night alike. ' +
        'Venus\'s dense carbon-dioxide atmosphere acts as a planetary insulating jacket. ' +
        'Mercury, without any jacket, oscillates between extremes — slowly but relentlessly.',
      ],
    },

    {
      image: {
        cacheKey: 'mercury-temperature-surface',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Mercury surface split composition — ' +
          'left side showing the blazing sunlit hemisphere with extreme heat shimmer, red-orange glowing rocks, harsh direct sunlight, ' +
          'right side showing the dark frigid night side, frost on crater floors, deep black shadows, ' +
          'sharp terminator line dividing day from night, minimal atmosphere visible, scientific accuracy. ' +
          'Add the following text labels on the image: "Day side: +430°C", "Night side: -180°C", "Terminator (day/night boundary)".',
        alt: 'Mercury surface: blazing dayside and frozen nightside separated by the terminator',
        caption: 'Without an atmosphere, Mercury cannot accumulate heat by day or retain it at night. The temperature swing of more than six hundred degrees is the largest in the solar system.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Ice in the Shadows: Frost on the Planet Closest to the Sun',
      level: 2,
      paragraphs: [
        'One of Mercury\'s greatest paradoxes: on a planet that receives ten times more solar radiation than Earth, ' +
        'there is water ice — not merely traces, but billions of tonnes of it.',

        'Mercury\'s rotational axis is nearly perfectly vertical relative to its orbital plane — ' +
        'the tilt is less than one degree. ' +
        'This means the floors of certain craters near the poles are never illuminated by the Sun — ' +
        'so-called **_permanently shadowed regions_**. ' +
        'In these natural cryogenic chambers, the temperature remains below minus one hundred and seventy degrees Celsius ' +
        'for years, millions, and even billions of years. ' +
        'No photon of direct sunlight has ever reached those floors.',

        'Radar observations from Earth in the nineteen-nineties detected unusually bright reflections ' +
        'from Mercury\'s polar craters — the distinctive signature of water ice. ' +
        'MESSENGER confirmed it: there is ice, covered by a thin dark organic layer ' +
        'that shields it from sublimation. ' +
        'Where did the ice come from? Most likely from comets and asteroids that struck the planet billions of years ago. ' +
        'Volatile compounds gradually migrated toward the poles, ' +
        'finding the only refuge from the infernal Sun in those permanent shadows.',
      ],
    },

    {
      image: {
        cacheKey: 'mercury-polar-ice-craters',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Mercury north pole view from above, ' +
          'heavily cratered terrain, permanently shadowed crater floors shown as deep black, ' +
          'bright white water ice deposits visible in the shadows of polar craters, ' +
          'thin dark organic layer partially covering the ice, scientific accuracy, radar-map style color overlay. ' +
          'Add the following text labels on the image: "Permanently Shadowed Craters", "Water Ice Deposits", "Dark Organic Layer".',
        alt: 'Mercury\'s polar region — craters with permanent shadows and water ice deposits on their floors',
        caption: 'Permanently shadowed regions in Mercury\'s polar craters preserve water ice for billions of years. MESSENGER confirmed their presence using a neutron spectrometer and a laser altimeter.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Caloris Basin and the Antipodal Ridges',
      level: 2,
      paragraphs: [
        'The most dramatic scar in Mercury\'s geological memory is the **_Caloris Basin_**: ' +
        'an impact crater approximately one thousand five hundred kilometers across, ' +
        'formed billions of years ago by a collision with an asteroid ' +
        'probably at least one hundred and fifty kilometers in diameter. ' +
        'The name derives from the Latin word for "heat" — ' +
        'the basin sits at the point where the Sun stands directly overhead at perihelion.',

        'The impact was so colossal that compression waves propagated through the entire planet ' +
        'and converged on the opposite side — the point diametrically opposite the basin, ' +
        'known as the **_antipodal point_**. ' +
        'There, they sculpted a chaotic mountainous terrain: ' +
        'hills and ridges twisted in disordered patterns, with no single source crater to explain them. ' +
        'This is a living record of seismic energy from a collision billions of years ago ' +
        'traveling across the whole planet and reshaping the crust on the other side of the globe.',

        'The floor of Caloris itself is crosscut by a system of ridges and troughs ' +
        'that formed as the impact melt cooled and contracted. ' +
        'More broadly, Mercury displays a unique geological feature: ' +
        'thousands of kilometers of long lobate scarps — cliff-like faults in the crust — ' +
        'that formed as the planet cooled and shrank over billions of years, ' +
        'like the wrinkled skin of a drying apple.',
      ],
    },

    {
      diagram: {
        title: 'Caloris Basin and the Antipodal Terrain',
        svg: `<svg viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="560" height="300" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Mercury globe (simplified cross-section) -->
  <circle cx="280" cy="150" r="110" fill="#3a3530" opacity="0.6"/>
  <circle cx="280" cy="150" r="110" fill="none" stroke="#667788" stroke-width="1.2"/>

  <!-- Caloris Basin (left side) -->
  <ellipse cx="172" cy="145" rx="52" ry="46" fill="#cc4444" opacity="0.25"/>
  <ellipse cx="172" cy="145" rx="52" ry="46" fill="none" stroke="#cc4444" stroke-width="1.8"/>
  <text x="80" y="80" fill="#cc4444" font-family="monospace" font-size="11">Caloris</text>
  <text x="80" y="94" fill="#cc4444" font-family="monospace" font-size="11">~1500 km</text>
  <line x1="130" y1="88" x2="158" y2="118" stroke="#cc4444" stroke-width="0.9" opacity="0.7"/>

  <!-- Shockwave path through planet -->
  <path d="M 220 145 Q 280 80 340 145" fill="none" stroke="#ff8844" stroke-width="1.2" stroke-dasharray="6,3" opacity="0.5"/>
  <path d="M 220 145 Q 280 210 340 145" fill="none" stroke="#ff8844" stroke-width="1.2" stroke-dasharray="6,3" opacity="0.5"/>
  <text x="280" y="135" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">shock</text>
  <text x="280" y="147" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">wave</text>

  <!-- Antipodal terrain (right side) -->
  <g opacity="0.8">
    <ellipse cx="388" cy="135" rx="8" ry="5" fill="#44ff88" opacity="0.4"/>
    <ellipse cx="402" cy="155" rx="6" ry="4" fill="#44ff88" opacity="0.4"/>
    <ellipse cx="375" cy="158" rx="7" ry="4" fill="#44ff88" opacity="0.4"/>
    <ellipse cx="395" cy="142" rx="5" ry="3" fill="#44ff88" opacity="0.4"/>
    <ellipse cx="382" cy="148" rx="9" ry="5" fill="#44ff88" opacity="0.35"/>
  </g>
  <ellipse cx="388" cy="148" rx="40" ry="30" fill="none" stroke="#44ff88" stroke-width="1.5"/>
  <text x="445" y="115" fill="#44ff88" font-family="monospace" font-size="11">Antipodal</text>
  <text x="445" y="129" fill="#44ff88" font-family="monospace" font-size="11">Terrain</text>
  <line x1="440" y1="123" x2="420" y2="140" stroke="#44ff88" stroke-width="0.9" opacity="0.7"/>

  <!-- Iron core -->
  <circle cx="280" cy="150" r="55" fill="#7bb8ff" opacity="0.12"/>
  <circle cx="280" cy="150" r="55" fill="none" stroke="#7bb8ff" stroke-width="1.2" stroke-dasharray="4,3"/>
  <text x="280" y="154" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="10">Core</text>
  <text x="280" y="167" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">60% of mass</text>

  <!-- Impactor arrow -->
  <line x1="70" y1="60" x2="130" y2="118" stroke="#cc4444" stroke-width="2" marker-end="url(#impArrowE)"/>
  <defs>
    <marker id="impArrowE" markerWidth="7" markerHeight="7" refX="3" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#cc4444"/>
    </marker>
  </defs>
  <text x="52" y="55" fill="#cc4444" font-family="monospace" font-size="9">asteroid</text>

  <text x="280" y="288" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Cross-section not to scale. Core occupies ~75% of radius.</text>
</svg>`,
        caption: 'The impact that formed Caloris sent shock waves through the entire planet. At the antipodal point, the waves converged and sculpted a chaotic hilly terrain with no visible source crater.',
      },
    },

    {
      heading: 'Exosphere and Magnetic Field',
      level: 2,
      paragraphs: [
        'Mercury has no atmosphere in the conventional sense — ' +
        'but it does have an **_exosphere_**: an ultrathin shell of atoms ' +
        'whose pressure is billions of times lower than Earth\'s atmosphere. ' +
        'Atoms of sodium, oxygen, hydrogen, helium, and potassium are continuously released from the surface ' +
        'and just as continuously escape into space. ' +
        'The solar wind strips them away, micrometeorites knock them loose, ' +
        'and ultraviolet radiation breaks them apart. ' +
        'This is not a static shell but a dynamic flow, perpetually replenished from the surface below.',

        'An even greater surprise to scientists was Mercury\'s magnetic field. ' +
        'According to standard theory, such a small body should have cooled and solidified long ago — ' +
        'and should have no active dynamo. ' +
        'But MESSENGER measured a weak yet undeniable dipole field — ' +
        'roughly one percent the strength of Earth\'s. ' +
        'It is asymmetric: the northern magnetic hemisphere is significantly more active than the southern. ' +
        'This field shields the planet from the solar wind no better than a leaky umbrella, ' +
        'but it exists — and explaining that fact requires a liquid core ' +
        'still sustaining convection after billions of years of cooling.',
      ],
    },

    {
      image: {
        cacheKey: 'mercury-magnetic-field-exosphere',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Mercury with its weak magnetic field visualized as blue field lines deflecting solar wind, ' +
          'sodium exosphere glowing faintly in orange-yellow around the planet, ' +
          'solar wind particles shown as streams of gold particles hitting the magnetosphere, ' +
          'Mercury planet surface visible, dark space background, scientific accuracy. ' +
          'Add the following text labels on the image: "Magnetic Field Lines", "Solar Wind", "Sodium Exosphere", "Magnetopause".',
        alt: 'Mercury — weak magnetic field deflects solar wind, sodium exosphere glows faintly around the planet',
        caption: 'Mercury\'s magnetic field is about one hundred times weaker than Earth\'s, but it partially shields the surface from the worst solar wind impacts. The sodium exosphere creates an orange halo visible in specialized filters.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Mariner 10, MESSENGER, and BepiColombo',
      level: 2,
      paragraphs: [
        'Only two missions have come close enough to Mercury for detailed measurements — ' +
        'and until recently, both were American.',

        'In 1974 and 1975, the American probe Mariner 10 flew past Mercury three times, ' +
        'each time returning due to the orbital resonance between the spacecraft and the planet. ' +
        'It photographed approximately forty-five percent of the surface — ' +
        'largely the same region on each pass because of the orbital coincidence. ' +
        'The rest remained unseen for more than thirty years.',

        'In 2011, the probe MESSENGER entered orbit around Mercury — ' +
        'the first spacecraft in history to do so. ' +
        'For four years it mapped the surface, measured soil composition, the magnetic field, ' +
        'confirmed polar ice, discovered enigmatic dark hollows that appear to be actively sublimating in the vacuum, ' +
        'and returned tens of thousands of images. ' +
        'In April 2015, MESSENGER exhausted its fuel and impacted the surface, ' +
        'leaving its own small crater — one more dot among billions.',

        'In December 2026, **_BepiColombo_** will finally arrive at Mercury — ' +
        'a joint mission of the European Space Agency and the Japan Aerospace Exploration Agency, ' +
        'launched in October 2018 and conducting a series of gravity-assist maneuvers ' +
        'around Earth, Venus, and Mercury itself. ' +
        'BepiColombo consists of two separate orbital spacecraft ' +
        'that will study the magnetic field, interior structure, exosphere, and surface ' +
        'at a level of detail never before achieved. ' +
        'The mission aims to answer the key questions: ' +
        'why is the core so large, why is the magnetic field asymmetric, ' +
        'and what lies inside those dark hollows.',
      ],
    },

    {
      image: {
        cacheKey: 'bepicolombo-mercury-approach',
        prompt:
          'Photorealistic illustration for a science encyclopedia: BepiColombo spacecraft composite (two orbiters stacked together) ' +
          'approaching Mercury, large solar panels deployed, detailed spacecraft hardware visible, ' +
          'Mercury surface filling the background, heavy cratering visible, bright Sun nearby, dark space. ' +
          'Hard sci-fi style. ' +
          'Add the following text labels on the image: "BepiColombo (ESA/JAXA)", "Mercury Planetary Orbiter", "Mercury Magnetospheric Orbiter".',
        alt: 'BepiColombo approaching Mercury — two stacked orbital spacecraft with deployed solar panels',
        caption: 'BepiColombo is the first mission to Mercury to carry two independent orbital spacecraft. Arrival is planned for December 2026 after an eight-year cruise.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Why Mercury Matters',
      level: 2,
      paragraphs: [
        'Mercury is a treasure chest of information about how rocky planets form. ' +
        'Its disproportionately large iron core challenges standard models of planetary accretion near stars. ' +
        'If an impact stripped away the silicate mantle, then analogous catastrophes may have occurred around other stars — ' +
        'meaning there may be entire classes of exoplanets throughout the universe ' +
        'that are essentially bare iron cores.',

        'The paradox of polar ice reminds us that even in the most extreme environments, ' +
        'oases of stability can persist. ' +
        'Volatile compounds migrate to thermal cold traps — ' +
        'a process that may operate on the Moon, on asteroids, and potentially ' +
        'on any airless body with indirect illumination.',

        'Finally, Mercury is an ideal laboratory for observing general relativity in action. ' +
        'The precession of Mercury\'s orbital perihelion — an effect that classical Newtonian mechanics could not explain — ' +
        'became one of the first observational confirmations of Einstein\'s theory in the early twentieth century. ' +
        'BepiColombo will measure this effect with precision previously out of reach.',
      ],
    },
  ],

  glossary: [
    {
      term: '3:2 spin-orbit resonance',
      definition: 'The rotational-orbital coupling of Mercury: for every two complete orbits around the Sun, the planet completes exactly three axial rotations. As a result, one solar day on Mercury is twice as long as one Mercurian year.',
    },
    {
      term: 'Exosphere',
      definition: 'An ultrathin outer shell of a planet where the pressure is so low that atoms travel along ballistic trajectories and almost never collide with each other. Mercury\'s exosphere contains sodium, oxygen, hydrogen, and helium.',
    },
    {
      term: 'Permanently shadowed region',
      definition: 'An area on a planetary body — typically a crater floor near a pole — that never receives direct sunlight due to a minimal axial tilt. Mercury, the Moon, and Ceres all have such regions containing water ice.',
    },
    {
      term: 'Caloris Basin',
      definition: 'One of the largest impact craters in the solar system, approximately 1,500 kilometers across, on Mercury\'s surface. The name means "heat" in Latin: the basin sits directly under the Sun at perihelion. The impact that formed it generated shock waves that sculpted chaotic terrain on the opposite side of the planet.',
    },
    {
      term: 'Antipodal terrain',
      definition: 'A chaotic hilly formation on Mercury at the point diametrically opposite the Caloris Basin. Shock waves from the enormous impact traveled through the entire planet and converged at this point, deforming the crust.',
    },
    {
      term: 'Giant impact hypothesis (Mercury)',
      definition: 'The hypothesis that Mercury\'s disproportionately large iron core is the result of a collision with a large protoplanetary body in the early solar system, which stripped away a significant portion of the silicate mantle.',
    },
    {
      term: 'Perihelion precession',
      definition: 'The slow shift of the point of a planet\'s closest approach to the Sun with each successive orbit. For Mercury, this effect proved larger than classical mechanics predicted — providing one of the first observational confirmations of Einstein\'s general theory of relativity.',
    },
    {
      term: 'Dynamo effect',
      definition: 'The process by which a planet\'s magnetic field is generated through convection in a liquid conducting core. Mercury, despite its small size, retains a weak magnetic field — evidence that at least part of its iron core remains liquid.',
    },
    {
      term: 'Lobate scarp (rupes)',
      definition: 'A long, steep cliff-like fault in Mercury\'s crust, formed by global contraction of the planet as it cooled over billions of years. Some scarps on Mercury extend thousands of kilometers and are unique geological structures in the solar system.',
    },
  ],

  quiz: [
    {
      question: 'What does the 3:2 resonance mean for the length of a day on Mercury?',
      options: [
        'Mercury rotates synchronously with its orbit, so a day and a year are identical in length',
        'Three axial rotations per two orbits around the Sun — the solar day is twice as long as a year',
        'Mercury rotates in the opposite direction, so the Sun rises in the west',
        'A Mercurian day is exactly eighty-eight Earth days long',
      ],
      correctIndex: 1,
      explanation: 'The 3:2 resonance means three axial rotations for every two orbital laps. A year on Mercury lasts 88 Earth days, but one solar day — from one sunrise to the next — lasts 176 Earth days. Paradoxically, one Mercurian day equals two Mercurian years.',
    },
    {
      question: 'Why does water ice exist on Mercury despite its closeness to the Sun?',
      options: [
        'Mercury has a powerful icy atmosphere that shields the surface from solar heating',
        'The planet\'s core generates enough cold to freeze water at the surface',
        'The nearly vertical rotational axis leaves polar crater floors in permanent shadow',
        'Ice forms through chemical reactions between surface silicates and the solar wind',
      ],
      correctIndex: 2,
      explanation: 'Mercury\'s axial tilt is less than one degree, so the floors of certain polar craters never receive direct sunlight. In those permanently shadowed regions, the temperature remains below minus 170 degrees Celsius and water ice is stable for billions of years.',
    },
    {
      question: 'What best explains Mercury\'s disproportionately large iron core?',
      options: [
        'Mercury formed first in the solar system, when the most iron was available in the protoplanetary disk',
        'The most widely accepted hypothesis is a giant impact that stripped away part of the silicate mantle',
        'Solar wind over billions of years removed all light elements from the planet',
        'Iron cores are proportionally the same in all rocky planets; Mercury simply has less surrounding material',
      ],
      correctIndex: 1,
      explanation: 'The giant impact hypothesis is most widely accepted: a protoplanetary collision stripped away a large fraction of the silicate mantle, leaving the planet with a disproportionately large iron core. An alternative — solar-heat evaporation of the mantle — is also considered. BepiColombo is gathering data to distinguish between these scenarios.',
    },
    {
      question: 'What role did the observation of Mercury\'s perihelion precession play in the history of science?',
      options: [
        'It confirmed the heliocentric model of Copernicus',
        'It revealed the existence of an invisible planet called Vulcan between Mercury and the Sun',
        'It became one of the first observational confirmations of Einstein\'s general theory of relativity',
        'It established the precise mass of the Sun using Newton\'s law of gravitation',
      ],
      correctIndex: 2,
      explanation: 'Classical Newtonian mechanics could not fully account for the observed rate of Mercury\'s orbital precession. Einstein\'s general theory of relativity predicted the correct value exactly. This became one of the first and most important confirmations of the new theory of gravity in the early twentieth century.',
    },
    {
      question: 'Which mission was the first to enter orbit around Mercury, and when?',
      options: [
        'Mariner 10 in 1974',
        'Voyager 1 in 1979',
        'MESSENGER in 2011',
        'BepiColombo in 2026',
      ],
      correctIndex: 2,
      explanation: 'MESSENGER became the first spacecraft to enter orbit around Mercury in 2011. Mariner 10 in 1974–1975 made only three flybys without achieving orbit. BepiColombo is scheduled to arrive in December 2026.',
    },
  ],

  sources: [
    {
      title: 'Mercury — NASA Solar System Exploration',
      url: 'https://solarsystem.nasa.gov/planets/mercury/overview/',
      meta: 'NASA Solar System Exploration, updated 2025',
    },
    {
      title: 'MESSENGER Mission — NASA Science',
      url: 'https://science.nasa.gov/mission/messenger/',
      meta: 'NASA Science, mission summary 2011–2015',
    },
    {
      title: 'BepiColombo — ESA Mission Overview',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/BepiColombo',
      meta: 'ESA, launched October 2018, arrival December 2026',
    },
    {
      title: 'Mercury\'s Water Ice — MESSENGER Confirmation',
      url: 'https://science.nasa.gov/science-news/science-at-nasa/2012/29nov_mercuryice/',
      meta: 'NASA Science, 2012',
    },
    {
      title: 'Caloris Basin — USGS Astrogeology',
      url: 'https://astrogeology.usgs.gov/search/map/Mercury/Messenger/Mercury_MESSENGER_MDIS_Basemap_BDR_Mosaic_Global_166m',
      meta: 'USGS Astrogeology Science Center',
    },
    {
      title: 'Mercury\'s Spin-Orbit Resonance — Icarus 2007',
      url: 'https://www.sciencedirect.com/science/article/pii/S0019103507001467',
      meta: 'Icarus, Margot et al., 2007',
    },
    {
      title: 'Mercury\'s Core Size and Density — Earth and Planetary Science Letters',
      url: 'https://www.sciencedirect.com/science/article/pii/S0012821X12001033',
      meta: 'EPSL, Smith et al., 2012',
    },
    {
      title: 'Mercury\'s Magnetic Field Asymmetry — Science 2011',
      url: 'https://www.science.org/doi/10.1126/science.1211001',
      meta: 'Science, Anderson et al., 2011',
    },
    {
      title: 'BepiColombo Science Goals — Space Science Reviews',
      url: 'https://link.springer.com/article/10.1007/s11214-021-00861-4',
      meta: 'Space Science Reviews, Benkhoff et al., 2021',
    },
    {
      title: 'Mercury Perihelion Precession and General Relativity',
      url: 'https://einstein.stanford.edu/content/relativity/a11659.html',
      meta: 'Stanford — Einstein Online',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
