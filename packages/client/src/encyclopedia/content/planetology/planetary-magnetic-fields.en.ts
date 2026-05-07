import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'planetary-magnetic-fields',
  language: 'en',
  section: 'planetology',
  order: 12,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Planetary Magnetic Fields',
  subtitle: 'From the dynamo in a liquid core to protection against stellar wind — why some planets hold a magnetic shield and others lost theirs long ago.',

  hero: {
    cacheKey: 'planetary-magnetic-fields-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: Earth seen from space surrounded by its magnetosphere, ' +
      'glowing blue magnetic field lines arching from pole to pole, solar wind particles streaming in from the left as bright orange-yellow stream, ' +
      'bow shock compression visible on the sunward side, magnetotail extending far to the right, ' +
      'aurora glow faintly visible at polar regions, dark space background. ' +
      'Add the following text labels on the image: "Solar Wind", "Bow Shock", "Magnetopause", "Van Allen Belts", "Magnetotail", "Aurora".',
    alt: 'Earth inside its magnetosphere — magnetic field lines, bow shock, and the solar wind',
    caption: 'Earth\'s magnetosphere is an invisible shield that deflects most of the charged particles in the solar wind. Without it, the surface would be exposed to continuous radiation bombardment.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'A planet\'s magnetic field is neither decoration nor accident. It is a byproduct of what happens deep inside, in a place no camera will ever reach. In Earth\'s interior, liquid iron boils — an alloy of metals that slowly convects under temperature differences and the planet\'s rotation. This moving, conducting fluid generates a magnetic field the same way a coil of wire carrying electric current does. Physicists call this process the planetary dynamo.',

        'But not every planet has an active dynamo. Mars lost its magnetic field more than three billion years ago, when its core cooled and the motion stopped. Venus rotates so slowly that convection cannot sustain a sufficient dynamo effect. Mercury has retained a weak field — a remarkable fact for such a small body. Jupiter\'s magnetosphere is so powerful that if it were visible to the naked eye from Earth, it would appear larger than the full Moon. Each planet is a separate chapter in this story.',
      ],
    },

    {
      heading: 'The Planetary Dynamo Principle',
      level: 2,
      paragraphs: [
        'The idea that Earth\'s magnetic field is generated internally rather than by some external force took shape in the twentieth century. Before that, terrestrial magnetism was considered a fixed property of the planet, almost like its mass or shape. When geophysicists realized the field changes, drifts, and even reverses, it became clear: the field is alive.',

        'The mechanism works as follows. Earth\'s outer core consists mainly of liquid iron with traces of nickel and lighter elements. It is hot at the bottom — from heat flowing out of the solid inner core and from radioactive decay — and cooler near the top. This temperature difference drives **_convection_**: hotter material rises, cooler material sinks. The planet\'s rotation deflects these flows through the Coriolis effect, giving them a spiral structure. The moving, conducting iron carries electric charges, and those charge motions generate a magnetic field. The field in turn influences the motion of the metal — and the system sustains itself. This is what is called a **_self-sustaining dynamo_**.',

        'A working dynamo requires three things: a conducting fluid, a heat source for convection, and sufficiently rapid rotation. If any one of these conditions is absent, the dynamo shuts down. That is precisely what accounts for the dramatic differences between planets.',
      ],
    },

    {
      image: {
        cacheKey: 'pmf-earth-core-dynamo',
        prompt:
          'Photorealistic illustration for a science encyclopedia: cross-section of Earth showing inner solid iron core in bright orange-red, ' +
          'outer liquid iron core with convective flow arrows in amber, mantle in dark red-brown, crust as thin outer ring, ' +
          'magnetic field lines emerging from poles shown in blue outside the planet, ' +
          'dark space background, highly detailed scientific cutaway style. ' +
          'Add the following text labels on the image: "Solid Inner Core", "Liquid Outer Core (dynamo)", "Mantle", "Magnetic Field Lines", "Convection Currents".',
        alt: 'Earth cross-section — liquid outer core with convection, solid inner core, and magnetic field lines',
        caption: 'Earth\'s liquid outer core, roughly two thousand two hundred kilometers thick, is where the planetary magnetic field is born. Convective flows of conducting iron under the influence of Earth\'s rotation sustain a self-sustaining dynamo.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Earth: The Reference for Magnetic Fields',
      level: 2,
      paragraphs: [
        'Earth\'s magnetic field at the surface ranges in intensity from about twenty-five to sixty-five microteslas depending on latitude. It is not aligned with the rotation axis: the magnetic and geographic poles do not coincide, and the gap between them amounts to several tens of degrees. This means that a compass points not to true north but to magnetic north, and this difference — magnetic declination — has been accounted for in cartography and navigation for several centuries.',

        'But the most striking feature of Earth\'s field is its variability. The poles wander: magnetic north shifts by tens of kilometers per year, and over the past century it has been moving toward Siberia noticeably faster than before. More dramatically, the field is capable of flipping entirely, swapping north and south. This phenomenon is called a **_geomagnetic reversal_**.',

        'The geological record of these reversals is preserved in basaltic rocks on the ocean floor: when lava solidifies, iron-bearing minerals lock in the direction of the field at the moment of cooling. Researchers have established that approximately one hundred reversals occurred in the past twenty million years — one roughly every two hundred thousand years on average. The most recent one completed about seven hundred and eighty thousand years ago. We have not yet reached the next one, but there are signs that the field is gradually weakening and that the geomagnetic South Atlantic Anomaly is expanding — which some researchers consider a possible precursor.',
      ],
    },

    {
      heading: 'Jupiter and Saturn: Giants with Very Different Fields',
      level: 2,
      paragraphs: [
        'If Earth is the reference point, Jupiter is the extreme case. Its magnetic field is fourteen times stronger than Earth\'s at the cloud-top level and extends millions of kilometers into open space. The reason: deep inside Jupiter, hydrogen under immense pressure transitions into a **_metallic state_** — electrons are stripped from atoms and move freely, as they do in a conductor. This liquid metallic hydrogen is the field generator, and its layer is far more massive and active than Earth\'s iron core.',

        'Jupiter\'s magnetosphere is the largest structure of its kind in the solar system after the Sun\'s own heliosphere. It captures and accelerates charged particles ejected by the volcanoes of the moon Io, forming a powerful radiation belt. The radiation environment there is so intense that spacecraft approaching Jupiter require special shielding.',

        'Saturn has its own magnetosphere, but it is astonishingly different from Jupiter\'s. Saturn\'s field is nearly perfectly symmetric about the rotation axis — an anomaly that puzzles physicists. Most dynamo theories predict some tilt, but Saturn shows almost none. One hypothesis is that an intermediate layer between the metallic hydrogen and the outer gaseous envelope masks the tilt. The Cassini mission collected detailed data, but the question remains open.',
      ],
    },

    {
      diagram: {
        title: 'Comparison of Planetary Magnetic Fields in the Solar System (relative intensity)',
        svg: `<svg viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="560" height="360" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Title -->
  <text x="280" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Surface magnetic field intensity (Earth = 1)</text>

  <!-- Axis -->
  <line x1="120" y1="40" x2="120" y2="310" stroke="#334455" stroke-width="1"/>
  <line x1="120" y1="310" x2="540" y2="310" stroke="#334455" stroke-width="1"/>

  <!-- Scale lines -->
  <line x1="120" y1="310" x2="540" y2="310" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,4"/>
  <line x1="120" y1="252" x2="540" y2="252" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,4"/>
  <line x1="120" y1="195" x2="540" y2="195" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,4"/>
  <line x1="120" y1="137" x2="540" y2="137" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,4"/>
  <line x1="120" y1="80" x2="540" y2="80" stroke="#334455" stroke-width="0.5" stroke-dasharray="3,4"/>

  <!-- Y labels -->
  <text x="110" y="314" text-anchor="end" fill="#8899aa" font-family="monospace" font-size="9">0</text>
  <text x="110" y="256" text-anchor="end" fill="#8899aa" font-family="monospace" font-size="9">1</text>
  <text x="110" y="199" text-anchor="end" fill="#8899aa" font-family="monospace" font-size="9">2</text>
  <text x="110" y="141" text-anchor="end" fill="#8899aa" font-family="monospace" font-size="9">5</text>
  <text x="110" y="84" text-anchor="end" fill="#8899aa" font-family="monospace" font-size="9">14</text>

  <!-- Mercury bar: ~0.011x Earth -->
  <rect x="138" y="308" width="34" height="2" fill="#8899aa"/>
  <text x="155" y="326" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">Mercury</text>
  <text x="155" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">0.011</text>

  <!-- Venus bar: ~0 (none) -->
  <rect x="192" y="309" width="34" height="1" fill="#cc4444"/>
  <text x="209" y="326" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Venus</text>
  <text x="209" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">~none</text>

  <!-- Earth bar: 1x -->
  <rect x="246" y="252" width="34" height="58" fill="#44ff88"/>
  <text x="263" y="326" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Earth</text>
  <text x="263" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">1.0</text>

  <!-- Mars bar: ~0 (crustal remnants only) -->
  <rect x="300" y="309" width="34" height="1" fill="#cc4444"/>
  <text x="317" y="326" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">Mars</text>
  <text x="317" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">crustal</text>

  <!-- Saturn bar: ~0.6x Earth -->
  <rect x="354" y="275" width="34" height="35" fill="#7bb8ff"/>
  <text x="371" y="326" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Saturn</text>
  <text x="371" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">0.6</text>

  <!-- Uranus bar: ~0.5x Earth (but tilted 60 deg) -->
  <rect x="408" y="280" width="34" height="30" fill="#ff8844"/>
  <text x="425" y="326" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Uranus</text>
  <text x="425" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">0.5 / 60°</text>

  <!-- Neptune bar: ~0.3x (tilted 47 deg, offset) -->
  <rect x="462" y="290" width="34" height="20" fill="#ff8844"/>
  <text x="479" y="326" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Neptune</text>
  <text x="479" y="337" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">0.3 / 47°</text>

  <!-- Jupiter bar: 14x Earth — truncated with arrow -->
  <rect x="516" y="80" width="16" height="230" fill="#cc8844"/>
  <polygon points="516,72 532,72 524,60" fill="#cc8844"/>
  <text x="524" y="346" text-anchor="middle" fill="#cc8844" font-family="monospace" font-size="9">Jupiter</text>
  <text x="524" y="357" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">14×</text>

  <!-- Note -->
  <text x="280" y="348" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">Uranus and Neptune: tilt of field axis relative to rotation axis. Scale is approximate.</text>
</svg>`,
        caption: 'Relative intensity of planetary magnetic fields in the solar system (Earth as the reference unit). Jupiter exceeds the chart — its field is fourteen times stronger than Earth\'s. Venus and Mars have virtually no global field. Uranus and Neptune have strongly tilted and offset fields relative to their rotation axes.',
      },
    },

    {
      heading: 'Uranus and Neptune: Fields Off-Axis',
      level: 2,
      paragraphs: [
        'While Earth\'s and Jupiter\'s fields are at least roughly aligned with the rotation axis, Uranus and Neptune break this pattern entirely. The magnetic axis of Uranus is tilted nearly sixty degrees relative to the rotation axis. But that is not all: the center of the magnetic dipole is displaced from the center of the planet by almost one third of its radius. Neptune has a similar situation — a tilt of about forty-seven degrees and a comparable offset.',

        'Such fields cannot be explained by a simple dynamo in a liquid metallic core. Researchers believe that in Uranus and Neptune, the dynamo source is a layer known as the "icy mantle" — a mixture of water, ammonia, and methane under enormous pressure. This mixture is electrically conducting and convects, but its geometry is entirely different from Earth\'s iron core. The result is a complex, asymmetric, and spatially displaced field. The Voyager 2 mission measured these fields in the nineteen-eighties, but detailed study of the Uranus and Neptune systems remains a scientific priority for which no dedicated mission has yet been launched.',
      ],
    },

    {
      heading: 'Mercury, Venus, and Mars: Three Different Fates',
      level: 2,
      paragraphs: [
        'Three inner planets alongside Earth illustrate three different paths that planetary magnetism can take. Mercury, despite its small size and slow rotation, has a weak but real global magnetic field — roughly one hundred times weaker than Earth\'s. The Messenger mission established that this is a genuine dynamo field generated by a liquid outer core. Why the core of such a small body remains active is still an open question: possibly due to unusual crystallization conditions or thermal effects from proximity to the Sun.',

        'Venus has no global magnetic field, despite being similar to Earth in size and composition. The reason is slow rotation: a day on Venus lasts about two hundred and forty-three Earth days. Such slow rotation cannot sustain the Coriolis effect that organizes convective flows into a dynamo. Without a field, the solar wind interacts directly with Venus\'s ionosphere — forming what is called an **_induced magnetosphere_**, far weaker and more unstable than a true one.',

        'Mars is the most dramatic case. It has no global field, but some regions of the crust are strongly magnetized — particularly in the southern hemisphere. These are remnants of an ancient field, locked into rocks billions of years ago. Mars\'s dynamo likely shut down due to rapid cooling of its small core — and afterward, for billions of years, the solar wind gradually stripped light molecules from the atmosphere, including water. The thin atmosphere Mars has today is in part a consequence of the loss of magnetic protection.',
      ],
    },

    {
      image: {
        cacheKey: 'pmf-mars-crustal-magnetism',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Mars from space showing remnant crustal magnetic field, ' +
          'colored magnetic field intensity map overlaid on southern hemisphere in red and blue striped bands, ' +
          'solar wind interacting directly with the thin atmosphere without a magnetosphere, ' +
          'atmosphere visibly thin and orange-pink, dark space background, scientific accuracy. ' +
          'Add the following text labels on the image: "Crustal Magnetic Stripes", "Southern Hemisphere", "Solar Wind", "Weak Induced Magnetosphere".',
        alt: 'Mars with a map of remnant crustal magnetism in the Southern Hemisphere — stripes of magnetized rock',
        caption: 'The dark stripes of magnetism in Mars\'s crust are the only remnant of its ancient global magnetic field. After its disappearance, the solar wind gradually stripped the planet of most of its atmosphere.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Magnetosphere: Structure and Boundaries',
      level: 2,
      paragraphs: [
        'A planet\'s magnetic field does not simply extend into space — it interacts with the solar wind, the continuous stream of charged particles emitted by the Sun. The region where the planetary field dominates over the solar wind is the **_magnetosphere_**. It is not spherical: on the sunward side it is compressed and bounded by a sharp surface called the **_magnetopause_**, while on the night side it stretches into a long **_magnetotail_** that can extend hundreds or thousands of planetary radii.',

        'Before reaching the magnetopause, the solar wind encounters the **_bow shock_**: because the solar wind is supersonic, it abruptly decelerates and heats up in front of the magnetopause, much like air in front of a supersonic aircraft. Between the bow shock and the magnetopause lies a turbulent transition zone — the **_magnetosheath_** — where the plasma is chaotic and nonuniform.',

        'Inside Earth\'s magnetosphere sit two toroidal radiation belts, discovered in the mid-twentieth century and named after their discoverer — the **_Van Allen belts_**. The inner belt is filled primarily with protons, the outer one with electrons. These belts are hazardous to satellites and to astronauts passing through them, but they also confirm that the magnetosphere genuinely traps particles rather than letting them pass straight through.',
      ],
    },

    {
      image: {
        cacheKey: 'pmf-magnetosphere-diagram-img',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Earth magnetosphere cross-section schematic, ' +
          'Earth in center with glowing blue magnetic field, solar wind from the left as streaming orange particles, ' +
          'bow shock visible as compression wave, magnetopause as distinct boundary, ' +
          'inner and outer Van Allen radiation belts as glowing torus rings in red and orange, ' +
          'long magnetotail extending to the right, dark space. ' +
          'Add the following text labels on the image: "Bow Shock", "Magnetopause", "Inner Van Allen Belt", "Outer Van Allen Belt", "Magnetotail", "Solar Wind".',
        alt: 'Diagram of Earth\'s magnetosphere — bow shock, magnetopause, Van Allen belts, and the magnetotail',
        caption: 'Earth\'s magnetosphere in cross-section: the solar wind compresses the field on the dayside and stretches it into a long tail on the nightside. The Van Allen belts are concentrated zones of trapped charged particles.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Auroras: The Visible Edge of an Invisible Force',
      level: 2,
      paragraphs: [
        'There is one moment when an ordinary person can witness the magnetic field with their own eyes — not the field itself, but its work. Auroras form where charged particles from the solar wind penetrate the upper atmosphere through the magnetic poles, where field lines enter the planet. The particles collide with oxygen and nitrogen atoms at altitudes between one hundred and three hundred kilometers, exciting them — when those atoms return to their normal state, they emit light.',

        'Green — the most common color — comes from oxygen at around one hundred kilometers altitude. Red aurora above two hundred kilometers is also oxygen, but at lower density. Blue-violet tones come from nitrogen. The characteristic shapes of arcs and curtains are defined by the geometry of the magnetic field — particles do not move randomly but along field lines. During powerful solar flares, auroras descend far below the polar circle and can be visible even at mid-latitudes.',

        'Auroras occur on other planets too. Jupiter\'s are the most powerful in the solar system — and are partly fed by particles from Io\'s volcanoes rather than solely by the solar wind. On Saturn, auroras were detected by the Cassini mission and the Hubble Space Telescope. Even on Mars, with no global field, localized auroras have been recorded above patches of magnetized crust.',
      ],
    },

    {
      diagram: {
        title: 'Earth\'s Magnetosphere: Key Zones',
        svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" width="100%">
  <rect width="620" height="300" fill="rgba(10,15,25,0.5)" rx="4"/>

  <!-- Solar wind arrows from left -->
  <g fill="#ff8844" opacity="0.7">
    <polygon points="10,60 40,55 40,65"/>
    <polygon points="10,100 40,95 40,105"/>
    <polygon points="10,140 40,135 40,145"/>
    <polygon points="10,180 40,175 40,185"/>
    <polygon points="10,220 40,215 40,225"/>
  </g>
  <text x="6" y="148" fill="#ff8844" font-family="monospace" font-size="9" writing-mode="tb">Solar Wind</text>

  <!-- Bow shock curve -->
  <path d="M 80,20 Q 60,150 80,280" fill="none" stroke="#ff8844" stroke-width="2" stroke-dasharray="6,3" opacity="0.8"/>
  <text x="52" y="16" fill="#ff8844" font-family="monospace" font-size="9">Bow Shock</text>

  <!-- Magnetopause curve -->
  <path d="M 130,30 Q 105,150 130,270" fill="none" stroke="#7bb8ff" stroke-width="2" opacity="0.9"/>
  <text x="132" y="16" fill="#7bb8ff" font-family="monospace" font-size="9">Magnetopause</text>

  <!-- Field lines arching from top to bottom around Earth -->
  <path d="M 290,60 Q 180,150 290,240" fill="none" stroke="#4488aa" stroke-width="1.2" stroke-dasharray="4,3" opacity="0.6"/>
  <path d="M 290,80 Q 220,150 290,220" fill="none" stroke="#4488aa" stroke-width="1.2" stroke-dasharray="4,3" opacity="0.5"/>
  <path d="M 290,100 Q 250,150 290,200" fill="none" stroke="#4488aa" stroke-width="1" stroke-dasharray="4,3" opacity="0.4"/>

  <!-- Magnetotail upper/lower boundaries -->
  <line x1="290" y1="55" x2="620" y2="30" stroke="#7bb8ff" stroke-width="1.5" opacity="0.6"/>
  <line x1="290" y1="245" x2="620" y2="270" stroke="#7bb8ff" stroke-width="1.5" opacity="0.6"/>
  <text x="430" y="22" fill="#7bb8ff" font-family="monospace" font-size="9">Magnetotail</text>

  <!-- Neutral sheet -->
  <line x1="310" y1="150" x2="615" y2="150" stroke="#aabbcc" stroke-width="0.8" stroke-dasharray="3,4" opacity="0.4"/>
  <text x="440" y="147" fill="#8899aa" font-family="monospace" font-size="8">neutral sheet</text>

  <!-- Earth -->
  <circle cx="290" cy="150" r="22" fill="#4488aa" opacity="0.9"/>
  <text x="290" y="154" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="8">Earth</text>

  <!-- Inner Van Allen belt -->
  <ellipse cx="290" cy="150" rx="45" ry="28" fill="none" stroke="#ff8844" stroke-width="2" opacity="0.8"/>
  <text x="340" y="128" fill="#ff8844" font-family="monospace" font-size="8">Inner Belt</text>

  <!-- Outer Van Allen belt -->
  <ellipse cx="290" cy="150" rx="78" ry="48" fill="none" stroke="#cc4444" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>
  <text x="373" y="111" fill="#cc4444" font-family="monospace" font-size="8">Outer Belt</text>

  <!-- Aurora location at poles -->
  <circle cx="290" cy="128" r="4" fill="#44ff88" opacity="0.8"/>
  <circle cx="290" cy="172" r="4" fill="#44ff88" opacity="0.8"/>
  <text x="298" y="122" fill="#44ff88" font-family="monospace" font-size="8">Aurora</text>

  <!-- Note -->
  <text x="310" y="292" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">Not to scale. The magnetotail extends hundreds of thousands of kilometers.</text>
</svg>`,
        caption: 'Diagram of Earth\'s magnetosphere with its principal zones: the bow shock is compressed by the solar wind on the dayside, the magnetopause is the real boundary between solar and planetary field, the Van Allen belts accumulate trapped charged particles, and the magnetotail extends enormous distances on the nightside.',
      },
    },

    {
      heading: 'Geomagnetic Reversals: When North Becomes South',
      level: 3,
      paragraphs: [
        'The idea that Earth\'s magnetic poles can swap places seems improbable — but the geological record confirms it has happened regularly throughout Earth\'s entire history. During a reversal, the dipole does not flip instantaneously: the process can last several thousand years. The field first weakens, then for a time may become multipolar and chaotic — with several poles simultaneously — before strengthening again with opposite orientation.',

        'Are reversals dangerous? Data from previous reversals do not show mass extinctions tied specifically to them. The weakened field during the transition does allow more cosmic radiation through, but the magnetosphere does not disappear entirely — other protective mechanisms exist, notably the ionosphere. However, modern technological civilization, which depends on satellites, power grids, and aviation, is far more vulnerable to such changes than any previous form of life.',
      ],
    },

    {
      heading: 'Magnetic Fields and Habitability',
      level: 2,
      paragraphs: [
        'The connection between a magnetic field and a planet\'s suitability for life is both direct and non-linear. A field protects the atmosphere from erosion by the solar wind — precisely what happened to Mars — and reduces the flux of ionizing radiation at the surface. But the conclusion "no field means incompatible with life" is an oversimplification. Venus has no field yet retains a dense atmosphere that provides its own protection. Some models show that early Earth may have had a weaker field and still supported life.',

        'For astrobiologists, the question is not whether a field exists but whether there is sufficient protection overall. Planets in the habitable zone around more active stars — particularly red dwarf stars of spectral type M — face far more intense stellar winds and much stronger ultraviolet and X-ray radiation. For those planets, a strong magnetic field may be critical. Searching for magnetic fields on exoplanets is an active area of research, though for now it remains largely theoretical because of the technical difficulty of direct measurement.',

        'A magnetic field is not simply a protective shell — it is a sign of living interior. That a planet is magnetic means something is moving inside, convecting, alive in a geological sense. This connects magnetism to plate tectonics, volcanism, and ultimately to the biosphere through chemical exchange between the mantle and the surface. A planet without a field is often a planet with a frozen, dead core where the internal geological engine has already stopped.',
      ],
    },

    {
      image: {
        cacheKey: 'pmf-aurora-earth',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Earth aurora borealis photographed from the International Space Station, ' +
          'brilliant green and red aurora curtains glowing above the limb of the planet, ' +
          'city lights visible on dark surface below, stars in background, ' +
          'thin atmosphere layer visible as blue haze, scientific accuracy, cinematic quality. ' +
          'Add the following text labels on the image: "Aurora Borealis", "Ionosphere", "City Lights".',
        alt: 'Aurora borealis above Earth photographed from the International Space Station — green and red curtains against stars',
        caption: 'The aurora is the most direct visual evidence of the magnetic field at work. Charged particles from the solar wind that penetrate through the poles excite oxygen and nitrogen molecules, which then emit bursts of colored light.',
        aspectRatio: '16:9',
      },
    },

    {
      image: {
        cacheKey: 'pmf-exoplanet-magnetic',
        prompt:
          'Photorealistic illustration for a science encyclopedia: conceptual art of a rocky exoplanet orbiting a red dwarf star, ' +
          'intense stellar wind visible as orange-red streams, small planet showing a faint glowing magnetosphere protecting it, ' +
          'aurora faintly visible at poles, dark space, hard sci-fi style, scientific accuracy. ' +
          'Add the following text labels on the image: "Red Dwarf Star", "Stellar Wind", "Magnetosphere", "Rocky Exoplanet".',
        alt: 'Rocky exoplanet near a red dwarf — a weak magnetosphere shields it from intense stellar wind',
        caption: 'Exoplanets in the habitable zone around red dwarf stars receive stellar winds far more intense than Earth experiences. Having an intrinsic magnetic field may be critical for retaining an atmosphere and remaining potentially habitable.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Planetary dynamo',
      definition: 'The mechanism by which a planet generates its magnetic field through convection of a conducting fluid in the liquid core under conditions of planetary rotation. The motion of charged particles in Earth\'s iron-nickel melt — or in Jupiter\'s metallic hydrogen — sustains a self-reinforcing magnetic field.',
    },
    {
      term: 'Magnetosphere',
      definition: 'The region around a planet where its magnetic field dominates over the solar wind. It is asymmetric: compressed on the sunward side and stretched into a long magnetotail on the nightside. For Earth, it extends tens of thousands of kilometers toward the Sun.',
    },
    {
      term: 'Magnetopause',
      definition: 'The boundary between a planet\'s magnetosphere and interplanetary space, where the pressure of the planetary magnetic field is balanced by the pressure of the solar wind. At Earth\'s magnetopause, magnetic reconnection and plasma transfer occur continuously.',
    },
    {
      term: 'Bow shock',
      definition: 'The zone of abrupt deceleration and heating of the solar wind upstream of the magnetopause. It forms because the solar wind is supersonic and collides with the planetary magnetic field much as airflow encounters a wall in front of a supersonic aircraft.',
    },
    {
      term: 'Van Allen belts',
      definition: 'Two toroidal radiation belts surrounding Earth, in which the magnetic field traps charged particles. The inner belt is predominantly protons; the outer belt is predominantly electrons. Discovered in the mid-twentieth century from data returned by the first artificial satellites.',
    },
    {
      term: 'Aurora',
      definition: 'Luminous emission from the upper atmosphere produced when charged particles from the solar wind collide with oxygen and nitrogen molecules at altitudes between one hundred and three hundred kilometers. Color depends on gas type and altitude: green from oxygen at one hundred kilometers, red at higher altitudes, blue-violet from nitrogen.',
    },
    {
      term: 'Geomagnetic reversal',
      definition: 'An event in which Earth\'s magnetic poles exchange positions: north becomes south and vice versa. The process takes thousands of years, during which the field first weakens. Geological data record approximately one hundred such reversals in the past twenty million years.',
    },
    {
      term: 'Metallic hydrogen',
      definition: 'A state of hydrogen under extremely high pressure in which electrons are stripped from atoms and move freely, giving the material metallic conductivity. In Jupiter and Saturn, liquid metallic hydrogen is the source of those planets\'s powerful magnetic fields.',
    },
    {
      term: 'Induced magnetosphere',
      definition: 'A type of magnetosphere arising not from an internal dynamo but from the interaction of the solar wind with a planet\'s ionosphere, which has its own electrical conductivity. Characteristic of Venus and Mars, and far weaker and less stable than a true dynamo-generated magnetosphere.',
    },
    {
      term: 'Convection (in the liquid core)',
      definition: 'Heat transport through bulk fluid motion: hotter material rises, cooler material sinks. In Earth\'s liquid outer core, convection of conducting iron under the influence of planetary rotation is the driving force of the planetary dynamo.',
    },
  ],

  quiz: [
    {
      question: 'What is the planetary dynamo, and which condition is essential for it to operate?',
      options: [
        'Nuclear fusion in the planet\'s interior generating a powerful thermal field',
        'Convection of a conducting fluid in the core under conditions of planetary rotation',
        'Interaction between the solar wind and the planet\'s ionosphere',
        'Magnetization of crustal rocks accumulated over billions of years',
      ],
      correctIndex: 1,
      explanation: 'The dynamo requires three conditions: a conducting fluid (iron or metallic hydrogen), heat to drive convection, and sufficiently rapid rotation. Rotation deflects the convective flows through the Coriolis effect, giving the system its self-sustaining character.',
    },
    {
      question: 'Why did Mars lose its global magnetic field while Earth did not?',
      options: [
        'Mars is farther from the Sun and does not receive enough heat to sustain a dynamo',
        'Mars\'s core cooled and convection stopped, whereas Earth\'s core remains active',
        'Mars rotates too rapidly and its field cancels itself out',
        'Mars has no iron core, only a silicate mantle',
      ],
      correctIndex: 1,
      explanation: 'Mars is smaller than Earth, so its core cooled faster. Convection in the liquid core ceased and the dynamo shut down. Earth\'s core remains hot and active — sustained by radioactive decay and primordial heat left over from planetary formation.',
    },
    {
      question: 'What makes the magnetic fields of Uranus and Neptune unusual compared with Earth or Jupiter?',
      options: [
        'They are far stronger and extend billions of kilometers into open space',
        'Their fields are strongly tilted relative to the rotation axis and spatially displaced from the planet\'s center',
        'They are generated by magnetized crustal rock rather than a liquid core',
        'They do not interact with the solar wind because of the great distance from the Sun',
      ],
      correctIndex: 1,
      explanation: 'The magnetic axis of Uranus is tilted nearly sixty degrees, and the dipole center is displaced from the planet\'s center. Neptune has a similar anomaly. The dynamo is thought to operate in a conducting "icy" mantle layer of water, ammonia, and methane rather than in a metallic core.',
    },
    {
      question: 'What happens during a geomagnetic reversal?',
      options: [
        'Earth\'s magnetic field vanishes instantaneously and immediately re-forms with opposite orientation',
        'The field first weakens and may become chaotic for thousands of years, then strengthens again with opposite orientation',
        'Earth changes its direction of rotation, which automatically flips the field',
        'The magnetic field becomes fully aligned with the equator and permanently loses its dipole structure',
      ],
      correctIndex: 1,
      explanation: 'A geomagnetic reversal is a slow process lasting thousands of years. The field first weakens, may become multipolar and unstable, and then strengthens again — but with the opposite polarity. The most recent reversal completed approximately seven hundred and eighty thousand years ago.',
    },
    {
      question: 'How does a planet\'s magnetic field relate to its ability to retain an atmosphere and potentially support life?',
      options: [
        'A strong field heats the atmosphere and raises surface pressure, which is critical for liquid water',
        'The field protects the atmosphere from erosion by the solar wind and reduces ionizing radiation at the surface',
        'Magnetic fields are unrelated to atmospheres — Venus has no field yet retains a dense atmosphere',
        'Only planets with a field can have liquid water, due to thermal effects from interaction with stellar wind',
      ],
      correctIndex: 1,
      explanation: 'A magnetic field deflects charged solar wind particles that would otherwise gradually strip molecules from the atmosphere — which is precisely what happened to Mars after its field disappeared. The absence of a field does not automatically prevent an atmosphere — Venus demonstrates this — but for planets near active stars a field is a significant protective factor.',
    },
  ],

  sources: [
    {
      title: 'Earth\'s Magnetic Field — NASA Scientific Visualization Studio',
      url: 'https://svs.gsfc.nasa.gov/search/results/?q=magnetic+field',
      meta: 'NASA SVS, magnetic field visualizations',
    },
    {
      title: 'Magnetosphere — NASA Space Place',
      url: 'https://spaceplace.nasa.gov/magnetosphere/en/',
      meta: 'NASA Space Place, educational overview',
    },
    {
      title: 'Geomagnetic Reversals — NOAA National Centers for Environmental Information',
      url: 'https://www.ncei.noaa.gov/products/paleoclimatology/geomagnetism',
      meta: 'NOAA, paleomagnetic data',
    },
    {
      title: 'Messenger Reveals Mercury\'s Weak Magnetic Field',
      url: 'https://science.nasa.gov/missions/messenger/',
      meta: 'NASA Science, Messenger mission',
    },
    {
      title: 'Jupiter\'s Magnetosphere — NASA Juno Mission',
      url: 'https://www.jpl.nasa.gov/missions/juno',
      meta: 'NASA JPL, Juno mission',
    },
    {
      title: 'Magnetic Fields of Uranus and Neptune — Voyager 2 Results',
      url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html',
      meta: 'NASA NSSDC, Voyager 2 data',
    },
    {
      title: 'Mars Global Surveyor Discovers Crustal Magnetism',
      url: 'https://science.nasa.gov/missions/mars-global-surveyor/',
      meta: 'NASA Science, Mars Global Surveyor mission',
    },
    {
      title: 'Van Allen Probes Mission Overview',
      url: 'https://science.nasa.gov/mission/van-allen-probes/',
      meta: 'NASA Science, Van Allen Probes mission',
    },
    {
      title: 'Auroras: Illuminating the Magnetosphere — ESA',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/Cluster/Auroras_illuminating_the_magnetosphere',
      meta: 'ESA Cluster mission',
    },
    {
      title: 'Planetary Magnetic Fields and Habitability — Annual Review of Earth and Planetary Sciences',
      url: 'https://www.annualreviews.org/doi/10.1146/annurev-earth-060313-054750',
      meta: 'Annual Review of Earth and Planetary Sciences',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
