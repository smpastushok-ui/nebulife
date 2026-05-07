import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'reionization-epoch',
  language: 'en',
  section: 'cosmology',
  order: 11,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'The Epoch of Reionization',
  subtitle:
    'How the first stars and quasars tore through the darkness of the early universe and made it transparent to ultraviolet light.',

  hero: {
    cacheKey: 'reionization-epoch-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Epoch of Reionization — ' +
      'first stars ionizing the intergalactic medium. ' +
      'Dark cosmic void filled with neutral hydrogen fog (bluish-grey haze), ' +
      'punctuated by brilliant blue-white ionized bubbles expanding from early galaxies and quasars. ' +
      'The bubbles grow and merge, clearing the fog. ' +
      'Hard sci-fi style, dark space background, dramatic lighting contrasts. ' +
      'Add the following text labels on the image: "Cosmic Dark Ages", "First Stars", "Ionized Bubble", "Reionization z~6-15". ' +
      'Aspect ratio 16:9.',
    alt:
      'The first stars carving ionized bubbles in the dark neutral intergalactic medium — artistic reconstruction of the Epoch of Reionization.',
    caption:
      'The Epoch of Reionization — the moment the universe became transparent for a second time. ' +
      'Ionized bubbles expanded around the first stars and quasars until they merged into a single transparent medium.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'After the universe cooled and neutral hydrogen atoms first formed — roughly 380,000 years after the Big Bang — ' +
        'a long and nearly absolute darkness fell. No stars, no galaxies, no light sources of any kind across the entire observable volume. ' +
        'Only neutral hydrogen and helium, slowly gathering under gravity into the first dense concentrations. ' +
        'Cosmologists call this interval the _Cosmic Dark Ages_. ' +
        'It lasted from approximately 380,000 years to around 150 million years after the Big Bang.',

        'But the universe did not remain dark forever. At some point, the first stellar object blazed into existence ' +
        'with enough power that its ultraviolet radiation began shredding the surrounding clouds of neutral hydrogen, ' +
        'carving a bubble of transparent ionized plasma out of the dark fog. ' +
        'Then more such bubbles appeared, grew, and merged — and eventually, roughly one billion years after the Big Bang, ' +
        'intergalactic space cleared completely. ' +
        'This is the **Epoch of Reionization** — one of the most important and least understood transitions in all of cosmic history.',
      ],
    },

    {
      heading: 'The Dark Ages: Absolute Silence',
      level: 2,
      paragraphs: [
        'To understand reionization, one must first understand what the universe was being rescued from. ' +
        'After recombination, hydrogen existed in its neutral state — a proton with an electron held firmly close. ' +
        'Neutral hydrogen absorbs ultraviolet radiation almost completely: ' +
        'any photon energetic enough to ionize an atom was instantly captured. ' +
        'The universe was again opaque to ultraviolet and X-rays, though it remained open to visible light and radio waves.',

        'During this time, neutral gas was slowly but inexorably gathering into structures. ' +
        'Dark matter — which does not interact with photons — had already begun forming gravitational potential wells. ' +
        'Ordinary matter flowed into those wells and compressed. ' +
        'Tens of millions of years after the Big Bang, the first filaments and nodes of the large-scale cosmic web ' +
        'were already taking shape — but nothing was yet emitting a single photon.',
      ],
    },

    {
      image: {
        cacheKey: 'reionization-epoch-dark-ages',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the Cosmic Dark Ages — ' +
          'the universe before the first stars. ' +
          'Deep black space with faint bluish-grey filaments of neutral hydrogen gas forming a cosmic web structure. ' +
          'No galaxies, no bright stars. Only subtle gravitational filaments visible. ' +
          'Hard sci-fi style, dark background. ' +
          'Add the following text labels on the image: "Neutral Hydrogen", "Dark Matter Filaments", "No Stars Yet", "380,000 - 150 Myr". ' +
          'Aspect ratio 16:9.',
        alt:
          'The Cosmic Dark Ages — neutral hydrogen in dark matter filaments, no stars or galaxies present.',
        caption:
          'Between recombination and the appearance of the first stars, the universe was in a state of near-absolute darkness. ' +
          'Neutral hydrogen filled space while dark matter wove a web of gravitational filaments.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The First Stars: Population III',
      level: 2,
      paragraphs: [
        'Astronomers classify stars by their chemical composition relative to hydrogen and helium. ' +
        'The stars that exist today in the Milky Way contain measurable amounts of heavy elements — ' +
        'carbon, oxygen, iron — and are called Population I and Population II stars. ' +
        'But the very first stars in the universe had to be made exclusively from primordial hydrogen and helium: ' +
        'no heavy elements, no "stardust" from prior generations. ' +
        'They are called **Population III stars**.',

        'Theory predicts that these objects were prodigious in mass — possibly tens to hundreds of times more massive than the Sun. ' +
        'Without heavy elements, gas cloud cooling was inefficient, ' +
        'preventing the first clouds from fragmenting into small pieces the way modern stellar nurseries do. ' +
        'Instead, most of the mass concentrated into a single massive object. ' +
        'Such stars burned brilliantly and hotly, but for an extraordinarily short time — ' +
        'a million or two million years before exhausting their fuel and exploding as supernovae. ' +
        'Those explosions scattered the first heavy elements into the surrounding gas, ' +
        'permanently altering the chemical composition of the universe.',

        'As of May 2026, no Population III star has been reliably detected through direct observation. ' +
        'They exist only in theory and computer simulations. ' +
        'The James Webb Space Telescope — launched in late 2021 and operating in full science mode since 2022 — ' +
        'became the first instrument theoretically capable of detecting such objects ' +
        'as unusually blue sources at very high redshifts. ' +
        'Several candidates are under study, but confirmation is still absent.',
      ],
    },

    {
      image: {
        cacheKey: 'reionization-epoch-pop3-stars',
        prompt:
          'Photorealistic illustration for a science encyclopedia: Population III stars — ' +
          'the first generation of stars in the universe. ' +
          'Massive brilliant blue-white stars embedded in primordial hydrogen-helium gas clouds. ' +
          'No dust, no heavy elements — pure pristine gas glowing under intense UV radiation. ' +
          'Hard sci-fi style, dramatic lighting, dark space background. ' +
          'Add the following text labels on the image: "Population III", "Primordial H + He only", "100-1000 solar masses", "First Light". ' +
          'Aspect ratio 4:3.',
        alt:
          'Population III stars — massive blue-white objects in primordial gas containing no heavy elements.',
        caption:
          'Population III stars: massive, hot, and short-lived. ' +
          'Composed exclusively of hydrogen and helium — no carbon, oxygen, or iron. ' +
          'Not yet detected by direct observation.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Ionization Bubbles and Who Inflated Them',
      level: 2,
      paragraphs: [
        'As soon as the first star or early galaxy ignited, ' +
        'its hard ultraviolet radiation began ionizing the surrounding neutral hydrogen — ' +
        'stripping electrons from atoms and converting the gas to plasma. ' +
        'A sphere of ionized gas formed around the source, ' +
        'which astrophysicists call a _Stromgren sphere_ or simply an _ionization bubble_. ' +
        'The more powerful the source, the larger the bubble.',

        'Over time, more and more such bubbles appeared. They grew, collided, and merged, ' +
        'like soap bubbles in foam. ' +
        'The process resembles percolation — the physical phenomenon of liquid seeping through a porous material: ' +
        'first isolated pockets, then connected channels, and finally — a single unobstructed passage all the way through. ' +
        'When the ionized zones merged into a single connected sea of transparent plasma, ' +
        'reionization was considered complete.',

        'A central debate in modern cosmology: **who actually drove reionization — galaxies or quasars?** ' +
        'Quasars — supermassive black holes at the centers of early galaxies, ' +
        'consuming matter and releasing tremendous energy — are more powerful sources of ionizing photons per unit mass. ' +
        'But they are rare. Galaxies are less powerful individually, yet far more numerous. ' +
        'Most current models favor the view that reionization was carried out primarily by small and medium-sized galaxies, ' +
        'with quasars dominating only in the later phase, ' +
        'maintaining the universe in an ionized state once the transition was largely complete.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Reionization Timeline — Redshift and Cosmic Time',
        svg: `<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="20" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Reionization: timeline (redshift z and time after Big Bang)</text>

  <!-- Horizontal axis (time) -->
  <line x1="60" y1="180" x2="660" y2="180" stroke="#334455" stroke-width="1"/>
  <polygon points="662,177 655,174 655,180" fill="#aabbcc"/>
  <text x="670" y="184" fill="#8899aa" font-family="monospace" font-size="9">time</text>

  <!-- Vertical axis (z) -->
  <line x1="60" y1="30" x2="60" y2="180" stroke="#334455" stroke-width="1"/>
  <text x="40" y="34" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">z=30</text>
  <text x="40" y="90" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">z=15</text>
  <text x="40" y="140" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">z=6</text>
  <text x="40" y="178" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">z=2</text>

  <!-- Dark Ages block -->
  <rect x="60" y="30" width="120" height="150" fill="rgba(30,30,50,0.6)" stroke="#334455" stroke-width="1"/>
  <text x="120" y="100" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Dark</text>
  <text x="120" y="112" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Ages</text>
  <text x="120" y="130" text-anchor="middle" fill="#556677" font-family="monospace" font-size="8">~150 Myr</text>

  <!-- First stars ignite -->
  <line x1="180" y1="30" x2="180" y2="180" stroke="#ff8844" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="182" y="45" fill="#ff8844" font-family="monospace" font-size="9">First</text>
  <text x="182" y="57" fill="#ff8844" font-family="monospace" font-size="9">ignition</text>

  <!-- Reionization bubble percolation area -->
  <rect x="180" y="30" width="320" height="150" fill="rgba(68,136,170,0.08)" stroke="#4488aa" stroke-width="1"/>
  <!-- Small bubbles early phase -->
  <circle cx="220" cy="120" r="12" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="260" cy="90" r="18" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="310" cy="130" r="22" fill="rgba(123,184,255,0.18)" stroke="#7bb8ff" stroke-width="1"/>
  <!-- Merging bubbles mid phase -->
  <circle cx="380" cy="100" r="35" fill="rgba(123,184,255,0.2)" stroke="#7bb8ff" stroke-width="1.2"/>
  <circle cx="430" cy="130" r="28" fill="rgba(123,184,255,0.2)" stroke="#7bb8ff" stroke-width="1.2"/>
  <!-- Large merged region late phase -->
  <ellipse cx="510" cy="105" rx="50" ry="45" fill="rgba(68,255,136,0.12)" stroke="#44ff88" stroke-width="1.2"/>
  <text x="180" y="200" fill="#7bb8ff" font-family="monospace" font-size="8">z~15: first bubbles</text>
  <text x="360" y="200" fill="#7bb8ff" font-family="monospace" font-size="8">z~10: merging</text>
  <text x="490" y="200" fill="#44ff88" font-family="monospace" font-size="8">z~6: complete</text>

  <!-- End of reionization line -->
  <line x1="500" y1="30" x2="500" y2="180" stroke="#44ff88" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="502" y="45" fill="#44ff88" font-family="monospace" font-size="9">Reionization</text>
  <text x="502" y="57" fill="#44ff88" font-family="monospace" font-size="9">complete</text>

  <!-- Transparent universe -->
  <rect x="500" y="30" width="160" height="150" fill="rgba(68,255,136,0.06)" stroke="#44ff88" stroke-width="1"/>
  <text x="580" y="100" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Transparent</text>
  <text x="580" y="112" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Universe</text>

  <!-- Time labels -->
  <text x="120" y="230" text-anchor="middle" fill="#556677" font-family="monospace" font-size="8">~380 kyr - 150 Myr</text>
  <text x="340" y="230" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="8">~150 Myr - 1 Gyr</text>
  <text x="580" y="230" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">&gt; 1 Gyr</text>
</svg>`,
        caption:
          'The reionization timeline: from the first stellar ignitions (redshift approximately 15–30) ' +
          'to the completion of the process (redshift approximately 6). ' +
          'Ionized bubbles grew and merged over hundreds of millions of years.',
      },
    },

    {
      heading: 'Evidence: How We Know Reionization Happened',
      level: 2,
      paragraphs: [
        'Reionization concluded more than 12 billion years ago. ' +
        'We cannot directly observe that era in visible light. ' +
        'But several powerful and independent methods allow us to reconstruct this epoch.',

        'The most compelling evidence is the _Gunn-Peterson trough_. ' +
        'Neutral hydrogen absorbs ultraviolet light at a very specific wavelength — the Lyman-alpha line. ' +
        'If a cloud of neutral hydrogen lies between us and a distant quasar, ' +
        'it carves a complete dark gap into the quasar\'s spectrum at that wavelength (shifted by redshift). ' +
        'Quasars located at redshifts greater than six show nearly complete absorption ' +
        'in the ultraviolet part of their spectra — the _Gunn-Peterson trough_. ' +
        'This means that along the line of sight to these objects, ' +
        'substantial neutral hydrogen remained. ' +
        'Closer quasars, at lower redshifts, show only isolated narrow absorption lines — ' +
        'the _Lyman-alpha forest_ — because the intergalactic gas is already predominantly ionized.',

        'The second method is the _optical depth of the Cosmic Microwave Background_. ' +
        'As photons of relic radiation travel through space after the Big Bang, ' +
        'they occasionally scatter off free electrons. ' +
        'The more free electrons along the path, the more scatterings occur. ' +
        'The Planck mission measured this quantity with high precision ' +
        'and obtained a value pointing to the onset of reionization ' +
        'at a redshift of roughly seven to eight, ' +
        'with possible earlier activity at higher redshifts.',
      ],
    },

    {
      image: {
        cacheKey: 'reionization-epoch-gunn-peterson',
        prompt:
          'Scientific illustration for a science encyclopedia: the Gunn-Peterson trough in quasar spectra. ' +
          'Two quasar spectra side by side for comparison. ' +
          'Left spectrum (low redshift quasar, z<6): continuous spectrum with only narrow Lyman-alpha absorption lines (Lyman-alpha forest). ' +
          'Right spectrum (high redshift quasar, z>6): complete dark absorption trough wiping out all flux blueward of Lyman-alpha. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "Lyman-alpha forest (z < 6)", "Gunn-Peterson trough (z > 6)", ' +
          '"neutral hydrogen absorption", "wavelength". ' +
          'Aspect ratio 4:3.',
        alt:
          'Comparison of two quasar spectra: the Lyman-alpha forest at low redshift and the Gunn-Peterson trough at high redshift.',
        caption:
          'The Gunn-Peterson trough (right spectrum) — complete absorption of ultraviolet light by neutral hydrogen ' +
          'in high-redshift quasar spectra. ' +
          'This is direct evidence that neutral gas lay between us and the quasar in the early universe.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The 21-Centimeter Signal: A Radio Echo of the Dark Ages',
      level: 2,
      paragraphs: [
        'Neutral hydrogen has one more distinctive property. ' +
        'A hydrogen atom consists of a proton and an electron. Both have _spin_ — an intrinsic quantum angular momentum. ' +
        'When the spins of the proton and electron are parallel, the atom is in a slightly higher energy state. ' +
        'When they are antiparallel — a slightly lower one. ' +
        'The transition between these states emits or absorbs a photon with a wavelength of 21 centimeters, ' +
        'falling squarely in the radio range. ' +
        'Since neutral hydrogen filled the early universe in enormous quantities, ' +
        'this signal theoretically carries within it a detailed map of the dark ages and reionization — ' +
        'showing which regions had already been ionized and which gas remained neutral.',

        'Measuring this signal is extraordinarily difficult. ' +
        'The problem is not that it is absent — but that terrestrial radio interference ' +
        'and the signals of human civilization are orders of magnitude stronger than the faint cosmic signature. ' +
        'The Hydrogen Epoch of Reionization Array — a purpose-built facility in the Karoo desert of South Africa — ' +
        'consists of hundreds of antennas designed specifically for this hunt. ' +
        'The Square Kilometre Array — under construction in Australia and South Africa — ' +
        'is set to become the most powerful radio telescope in history.',

        'In 2018, a small American radio receiver called the Experiment to Detect the Global Epoch of Reionization Signature ' +
        'announced the detection of an anomalously deep absorption feature in the 21-centimeter signal ' +
        'at the expected frequency range. ' +
        'The depth of that absorption was roughly twice what standard theory predicts. ' +
        'If the signal is confirmed, it could mean the primordial gas was cooled ' +
        'by an unusual mechanism — possibly through interaction with dark matter. ' +
        'But as of 2026, no independent confirmation exists, ' +
        'and the scientific community remains cautious.',
      ],
    },

    {
      image: {
        cacheKey: 'reionization-epoch-21cm-array',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a radio telescope array for detecting the 21-cm hydrogen signal. ' +
          'Hundreds of simple dipole antenna stations arranged in a regular pattern across a flat arid desert landscape. ' +
          'Night sky above with the Milky Way. ' +
          'Hard sci-fi style, dark background. ' +
          'Add the following text labels on the image: "21-cm Hydrogen Signal", "Karoo Desert", "Reionization Survey", "HERA Array". ' +
          'Aspect ratio 16:9.',
        alt:
          'A radio antenna array for detecting the 21-centimeter hydrogen signal from the Epoch of Reionization.',
        caption:
          'Radio antenna arrays in remote deserts are the primary instruments for observing neutral hydrogen ' +
          'during the Epoch of Reionization through its characteristic 21-centimeter signal.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The James Webb Space Telescope Overflows the Photon Budget',
      level: 2,
      paragraphs: [
        'The biggest surprise of the first two to three years of James Webb Space Telescope science ' +
        'was not what the telescope found — but how much it found and how bright it was. ' +
        'Standard reionization models were built on accepted estimates of how many ionizing photons ' +
        'early galaxies could generate: ' +
        'roughly one ionizing photon per hydrogen atom, accounting for recombinations.',

        'But the telescope found early galaxies — some existing 400 to 600 million years after the Big Bang — ' +
        'that were brighter, more massive, and more numerous than predicted. ' +
        'If these galaxies were indeed producing ionizing photons so efficiently, ' +
        'reionization could have proceeded faster and earlier ' +
        'than inferred from the Gunn-Peterson trough and the optical depth of relic radiation. ' +
        'This is sometimes called the _photon budget problem_ or the _early universe brightness crisis_.',

        'One explanation is that stars in early galaxies had different characteristics — ' +
        'in particular, a higher fraction of massive, hot objects similar to Population III stars, ' +
        'producing more hard radiation per unit mass. ' +
        'Another is that early galaxies were less dusty and more transparent to their own photons, ' +
        'meaning less ultraviolet was absorbed internally before escaping. ' +
        'The debate is actively ongoing. ' +
        'New telescope observations scheduled for 2025 and 2026 are expected to narrow the range of possible answers.',
      ],
    },

    {
      image: {
        cacheKey: 'reionization-epoch-jwst-early-galaxies',
        prompt:
          'Photorealistic illustration for a science encyclopedia: JWST observations of early galaxies during reionization. ' +
          'Deep field image showing compact bright blue-white galaxies at high redshift (z > 7), ' +
          'surrounded by faint neutral hydrogen haze partially cleared by ionized bubbles. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "z > 7", "Ionizing Photons", "Early Galaxy", "JWST NIRCam", "< 800 Myr". ' +
          'Aspect ratio 16:9.',
        alt:
          'Early galaxies during the Epoch of Reionization as seen by the James Webb Space Telescope — bright compact objects at high redshift.',
        caption:
          'The James Webb Space Telescope found early galaxies brighter and more numerous than standard reionization models predicted — ' +
          'possibly indicating more efficient production of ionizing photons in the early universe.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'When and How Fast: The Timeline of Reionization',
      level: 2,
      paragraphs: [
        'Reionization was not an instantaneous transition — it was a process lasting hundreds of millions of years. ' +
        'The current consensus, based on Planck data and quasar observations, ' +
        'holds roughly the following: the first significant ionization events began ' +
        'at a redshift of ten to fifteen — ' +
        'corresponding to a time of 270 to 500 million years after the Big Bang. ' +
        'Reionization was largely complete at a redshift of around six — ' +
        'that is, approximately one billion years after the Big Bang.',

        'That said, "complete" does not mean "perfectly uniform." ' +
        'Even after reionization finished on large scales, ' +
        'local pockets of neutral gas persisted within the filaments of large-scale structure — ' +
        'these are responsible for the Lyman-alpha absorption lines we still observe today ' +
        'in quasar spectra. ' +
        'The full and final clearing of intergalactic neutral hydrogen proceeded gradually ' +
        'over billions of additional years after the main transition.',

        'An open question concerns what is sometimes called _double reionization_. ' +
        'Helium, which also existed in neutral form alongside hydrogen, ionized in two steps. ' +
        'The first ionization of helium occurred together with the reionization of hydrogen. ' +
        'Full, double ionization of helium — to the state with both electrons stripped — ' +
        'required far harder radiation, which only quasars could supply. ' +
        'This happened later, at a redshift of around two to three — ' +
        'correspondingly more than two billion years after the Big Bang. ' +
        'Studying helium reionization provides an independent check on the models.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Percolation of Ionization Bubbles',
        svg: `<svg viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="240" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="20" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Percolation of ionization bubbles during reionization</text>

  <!-- Stage 1: Early, isolated bubbles -->
  <rect x="20" y="35" width="195" height="160" rx="3" fill="rgba(20,30,50,0.5)" stroke="#334455" stroke-width="1"/>
  <text x="117" y="52" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Early phase (z ~ 15)</text>
  <rect x="25" y="57" width="185" height="130" fill="rgba(40,50,80,0.3)"/>
  <circle cx="65" cy="100" r="18" fill="rgba(123,184,255,0.25)" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="130" cy="130" r="12" fill="rgba(123,184,255,0.25)" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="170" cy="85" r="20" fill="rgba(123,184,255,0.25)" stroke="#7bb8ff" stroke-width="1"/>
  <circle cx="90" cy="165" r="8" fill="rgba(123,184,255,0.2)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="117" y="210" text-anchor="middle" fill="#556677" font-family="monospace" font-size="8">Neutral gas</text>

  <!-- Arrow -->
  <polygon points="224,115 216,111 216,119" fill="#8899aa"/>
  <line x1="215" y1="115" x2="226" y2="115" stroke="#8899aa" stroke-width="1"/>

  <!-- Stage 2: Merging bubbles -->
  <rect x="233" y="35" width="215" height="160" rx="3" fill="rgba(20,30,50,0.5)" stroke="#4488aa" stroke-width="1"/>
  <text x="340" y="52" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">Merging (z ~ 10)</text>
  <rect x="238" y="57" width="205" height="130" fill="rgba(30,50,80,0.3)"/>
  <circle cx="295" cy="115" r="38" fill="rgba(123,184,255,0.3)" stroke="#7bb8ff" stroke-width="1.2"/>
  <circle cx="370" cy="100" r="32" fill="rgba(123,184,255,0.28)" stroke="#7bb8ff" stroke-width="1.2"/>
  <circle cx="415" cy="145" r="22" fill="rgba(123,184,255,0.25)" stroke="#7bb8ff" stroke-width="1"/>
  <ellipse cx="332" cy="108" rx="20" ry="15" fill="rgba(68,136,255,0.35)" stroke="none"/>
  <text x="340" y="210" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="8">Bubble mergers</text>

  <!-- Arrow -->
  <polygon points="457,115 449,111 449,119" fill="#8899aa"/>
  <line x1="448" y1="115" x2="459" y2="115" stroke="#8899aa" stroke-width="1"/>

  <!-- Stage 3: Transparent universe -->
  <rect x="466" y="35" width="215" height="160" rx="3" fill="rgba(30,50,40,0.5)" stroke="#44ff88" stroke-width="1"/>
  <text x="573" y="52" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Complete (z ~ 6)</text>
  <rect x="471" y="57" width="205" height="130" fill="rgba(44,255,136,0.08)"/>
  <circle cx="530" cy="95" r="8" fill="rgba(40,50,80,0.6)" stroke="#334455" stroke-width="1" stroke-dasharray="3,2"/>
  <circle cx="600" cy="140" r="5" fill="rgba(40,50,80,0.6)" stroke="#334455" stroke-width="1" stroke-dasharray="3,2"/>
  <circle cx="555" cy="155" r="6" fill="rgba(40,50,80,0.5)" stroke="#334455" stroke-width="1" stroke-dasharray="3,2"/>
  <circle cx="510" cy="130" r="3" fill="#7bb8ff"/>
  <circle cx="570" cy="90" r="4" fill="#ff8844"/>
  <circle cx="620" cy="110" r="3" fill="#7bb8ff"/>
  <circle cx="545" cy="120" r="2" fill="#aabbcc"/>
  <text x="573" y="210" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="8">Transparent Universe</text>
</svg>`,
        caption:
          'Three stages of reionization: isolated ionization bubbles around the first stars, ' +
          'their growth and merger, and finally — a fully transparent intergalactic medium ' +
          'with only isolated pockets of neutral gas remaining.',
      },
    },

    {
      heading: 'Why It Matters: Reionization and Everything After',
      level: 2,
      paragraphs: [
        'The Epoch of Reionization is not merely an academic subject. ' +
        'It determined the conditions under which all later galaxies — including the Milky Way — formed. ' +
        'The ultraviolet radiation that flooded intergalactic space after reionization heated the gas ' +
        'and made it far harder for new small galaxies to assemble. ' +
        'Dwarf galaxies, where gravity is weak, could not retain the hot gas — it simply evaporated. ' +
        'This explains why there are far fewer dwarf satellites around large galaxies today ' +
        'than dark matter simulations without reionization would predict.',

        'Reionization is also connected to the question of why the universe looks the way it does: ' +
        'most of the mass concentrated in large spiral and elliptical galaxies ' +
        'rather than spread uniformly across an endless multitude of tiny systems. ' +
        'Part of the answer lies in what ultraviolet field existed in different regions of the universe ' +
        'during and after reionization. ' +
        'To understand reionization is to understand galaxy formation.',
      ],
    },

    {
      image: {
        cacheKey: 'reionization-epoch-galaxy-formation',
        prompt:
          'Photorealistic illustration for a science encyclopedia: the impact of reionization on galaxy formation. ' +
          'Large central spiral galaxy surrounded by satellite dwarf galaxies. ' +
          'UV radiation field shown as blue-white glow permeating intergalactic space. ' +
          'Small dwarf galaxies shown being photo-evaporated, losing their gas. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "UV Background", "Gas Evaporation", "Dwarf Galaxy", "Reionization Effect". ' +
          'Aspect ratio 4:3.',
        alt:
          'The effect of the post-reionization ultraviolet background on dwarf galaxy formation: gas evaporates under hard radiation.',
        caption:
          'After reionization, the ultraviolet background heated intergalactic gas and impeded the formation of small galaxies. ' +
          'This explains the observed deficit of dwarf galaxies compared to pure dark matter predictions.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'An Open Frontier: Between the Unknown and the Unknowable',
      level: 2,
      paragraphs: [
        'The Epoch of Reionization remains one of the least explored chapters of cosmic history — ' +
        'not because the instruments do not exist, but because penetrating that era is technically formidable. ' +
        'Most detected quasars and galaxies at high redshifts already lie after the main transition. ' +
        'The reionization epoch itself — the time between the first stars and full clearing — ' +
        'remains shrouded.',

        'The 21-centimeter signal, if it can be measured with sufficient precision, ' +
        'will yield a three-dimensional map of neutral hydrogen during that time — ' +
        'far more information than any optical or infrared telescope can provide. ' +
        'The Square Kilometre Array, under continued construction in Australia and South Africa, ' +
        'has the potential to transform our understanding of this epoch ' +
        'as radically as the Cosmic Background Explorer and Planck transformed our understanding of relic radiation.',

        'What we are searching for in the dark ages and the Epoch of Reionization is not merely a chronology. ' +
        'It is the answer to a deeper question: what appeared first in the universe, and why. ' +
        'What was the first star like? What would it have seen, had it been able to see — ' +
        'absolute darkness in every direction, and only gradually, ' +
        'like an island rising from fog, ' +
        'the growing island of its own light.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Gunn-Peterson trough',
      definition:
        'Complete absorption of ultraviolet and visible light from a quasar in the blue wing of the Lyman-alpha line, caused by neutral hydrogen in the intergalactic medium. Observed in quasars with redshifts greater than six, it is direct evidence of a significant neutral gas fraction along the line of sight.',
    },
    {
      term: 'Lyman-alpha forest',
      definition:
        'A series of absorption lines in the spectra of distant quasars, each corresponding to a cloud of neutral hydrogen between the observer and the source. Unlike the Gunn-Peterson trough, the forest arises in an already predominantly ionized medium and consists of individual narrow absorption features.',
    },
    {
      term: 'Optical depth',
      definition:
        'A measure of how opaque a medium is to radiation. The optical depth of the Cosmic Microwave Background to its scattering surface reflects the total number of photon scatterings off free electrons after reionization. Measured by Planck and used to constrain the timing of reionization.',
    },
    {
      term: 'Population III stars',
      definition:
        'The theoretical first generation of stars in the universe, composed exclusively of primordial hydrogen and helium without any heavy elements. Predicted to be massive and hot. Not yet detected through direct observation.',
    },
    {
      term: 'Ionization bubble',
      definition:
        'A region of ionized gas surrounding a powerful ultraviolet source — a star or galaxy — within the neutral intergalactic medium. During reionization, these bubbles grew, collided, and eventually formed a single transparent phase.',
    },
    {
      term: '21-centimeter signal',
      definition:
        'Radio emission from neutral hydrogen at a wavelength of 21 centimeters, produced by the transition between the two hyperfine levels of the hydrogen ground state. It is potentially a powerful tool for mapping neutral hydrogen during the Epoch of Reionization and the Cosmic Dark Ages.',
    },
    {
      term: 'Redshift (z)',
      definition:
        'A dimensionless parameter characterizing the expansion of the universe since the observed light was emitted. Higher redshift corresponds to earlier cosmic time. Reionization occurred in the redshift range from approximately six to fifteen and beyond.',
    },
    {
      term: 'Quasar',
      definition:
        'An extremely luminous active galactic nucleus, powered by a supermassive black hole actively consuming surrounding matter and emitting a powerful jet and broadband radiation. Quasars are among the most powerful sources of ionizing ultraviolet radiation in the early universe.',
    },
    {
      term: 'Cosmic Dark Ages',
      definition:
        'The interval between recombination — roughly 380,000 years after the Big Bang — and the appearance of the first stars and galaxies, approximately 150 to 200 million years later. During this time the universe had no stellar light sources and was filled with neutral hydrogen.',
    },
    {
      term: 'Percolation',
      definition:
        'A physical process analogous to liquid seeping through a porous material. In the context of reionization, it describes how isolated ionized bubbles gradually connected into linked channels and ultimately formed a single open transparent medium.',
    },
  ],

  quiz: [
    {
      question: 'What is the Gunn-Peterson trough and what does it indicate?',
      options: [
        'A dip in a star\'s light curve caused by a transiting planet',
        'Complete absorption of ultraviolet light in a quasar spectrum by neutral hydrogen — evidence of an un-ionized medium',
        'An anomalous shift in hydrogen spectral lines due to a magnetic field',
        'A dark band in a nebula image caused by dust absorption',
      ],
      correctIndex: 1,
      explanation:
        'The Gunn-Peterson trough arises when neutral hydrogen between us and a distant quasar ' +
        'absorbs nearly all the ultraviolet radiation at and shortward of the Lyman-alpha wavelength. ' +
        'Its detection in the spectra of high-redshift quasars is direct evidence ' +
        'that the intergalactic medium at that epoch contained a significant fraction of neutral hydrogen.',
    },
    {
      question: 'Which sources are considered the primary driver of reionization in current models?',
      options: [
        'Exclusively quasars and active galactic nuclei',
        'Neutral hydrogen cloud explosions',
        'Primarily early small and medium-sized galaxies, with quasars contributing in the later stages',
        'Gamma-ray bursts from Population III supernovae',
      ],
      correctIndex: 2,
      explanation:
        'Quasars are more powerful per unit mass, but rare. ' +
        'Most current models hold that the bulk of ionizing photons came from ' +
        'the numerous early small and medium-sized galaxies, ' +
        'with quasars becoming important only in the late phase ' +
        'and for maintaining full ionization after the transition was largely complete.',
    },
    {
      question: 'What is special about the 21-centimeter signal and why is it being sought?',
      options: [
        'It is the frequency at which radio pulsars are brightest',
        'It is relic radiation photons from recombination',
        'It is radio emission from neutral hydrogen, enabling mapping of neutral gas during the Epoch of Reionization',
        'It corresponds to the peak emission frequency of the Sun',
      ],
      correctIndex: 2,
      explanation:
        'Neutral hydrogen, when transitioning between two hyperfine levels of its ground state, ' +
        'emits or absorbs a photon with a wavelength of 21 centimeters. ' +
        'Since this gas filled the early universe, a measured signal would provide a three-dimensional map ' +
        'of neutral hydrogen distribution during the Epoch of Reionization.',
    },
    {
      question: 'Why did discoveries by the James Webb Space Telescope challenge standard reionization models?',
      options: [
        'The telescope found no galaxies at high redshifts',
        'Early galaxies were found to be brighter and more numerous than models predicted',
        'The telescope confirmed that reionization ended much later than previously thought',
        'Population III stars were detected, contradicting the theory',
      ],
      correctIndex: 1,
      explanation:
        'The telescope found early galaxies that were brighter and more numerous than standard models predict. ' +
        'If these galaxies produced ionizing photons as efficiently as their brightness implies, ' +
        'reionization could have proceeded faster and earlier than inferred from quasar spectra, ' +
        'or the efficiency of ionizing photon production in early stars was higher than assumed.',
    },
    {
      question: 'What are Population III stars and why are they important for understanding reionization?',
      options: [
        'Stars located in the third stellar cluster from the galactic center',
        'First-generation supermassive black holes',
        'The hypothetical first generation of stars made of pure primordial hydrogen and helium, likely responsible for initiating reionization',
        'Stars with anomalously high metal content discovered by the James Webb Space Telescope',
      ],
      correctIndex: 2,
      explanation:
        'Population III stars are the theoretical first generation of objects ' +
        'formed from exclusively primordial hydrogen and helium. ' +
        'They would have been massive, hot, and ultraviolet-bright, ' +
        'making them leading candidates for initiating reionization. ' +
        'Their direct detection remains one of the primary goals of contemporary astronomy.',
    },
  ],

  sources: [
    {
      title: 'Gunn J.E., Peterson B.A. — On the density of neutral hydrogen in intergalactic space',
      url: 'https://ui.adsabs.harvard.edu/abs/1965ApJ...142.1633G',
      meta: 'ApJ 142, 1633 (1965) — original prediction of the Gunn-Peterson trough',
    },
    {
      title: 'Becker R.H. et al. — Evidence for Reionization at z~6: Detection of a Gunn-Peterson Trough',
      url: 'https://arxiv.org/abs/astro-ph/0108097',
      meta: 'AJ 122, 2850 (2001) — first observational detection of the trough, arXiv:astro-ph/0108097',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results VI: Cosmological Parameters',
      url: 'https://arxiv.org/abs/1807.06209',
      meta: 'A&A 641, A6 (2020) — optical depth and reionization timing, arXiv:1807.06209',
    },
    {
      title: 'Bowman J.D. et al. — An absorption profile centred at 78 megahertz in the sky-averaged spectrum (EDGES)',
      url: 'https://arxiv.org/abs/1810.05912',
      meta: 'Nature 555, 67 (2018) — controversial 21-cm detection, arXiv:1810.05912',
    },
    {
      title: 'Robertson B.E. et al. — Galaxy-driven reionization: new constraints from JWST',
      url: 'https://arxiv.org/abs/2312.10033',
      meta: 'ApJL 946, L1 (2023) — galaxy contribution to reionization, arXiv:2312.10033',
    },
    {
      title: 'Finkelstein S.L. et al. — CEERS: evidence for a high abundance of UV-bright galaxies at z > 10',
      url: 'https://arxiv.org/abs/2311.04279',
      meta: 'ApJL 946, L13 (2023) — bright JWST galaxies, arXiv:2311.04279',
    },
    {
      title: 'Fan X., Becker G.D. — Constraining the reionization history with Lyman-alpha opacity',
      url: 'https://arxiv.org/abs/2212.02615',
      meta: 'ARA&A 61 (2023) — review of reionization evidence, arXiv:2212.02615',
    },
    {
      title: 'Bromm V. — Formation of the first stars',
      url: 'https://arxiv.org/abs/1305.5178',
      meta: 'Rep. Prog. Phys. 76, 112901 (2013) — Population III stars review, arXiv:1305.5178',
    },
    {
      title: 'DeBoer D.R. et al. — Hydrogen Epoch of Reionization Array (HERA)',
      url: 'https://arxiv.org/abs/1606.07473',
      meta: 'PASP 129, 045001 (2017) — instrument description, arXiv:1606.07473',
    },
    {
      title: 'Pritchard J.R., Loeb A. — 21-cm cosmology in the 21st century',
      url: 'https://arxiv.org/abs/1109.6012',
      meta: 'Rep. Prog. Phys. 75, 086901 (2012) — 21-cm signal review, arXiv:1109.6012',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
