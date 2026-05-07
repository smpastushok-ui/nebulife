import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'exoplanet-atmospheres',
  language: 'en',
  section: 'astrobiology',
  order: 2,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Exoplanet Atmospheres',
  subtitle:
    'How starlight filtered through a distant atmosphere tells us what it is made of — and what we have already learned.',

  hero: {
    cacheKey: 'exoatmo-hero',
    prompt:
      'Photorealistic scientific illustration for a space encyclopedia: an exoplanet silhouetted against its bright host star during a transit event. ' +
      'The planet is surrounded by a thin glowing atmospheric halo of blue and amber gradients — the limb atmosphere illuminated by starlight. ' +
      'Hard sci-fi style, dark space background, technically accurate geometry. ' +
      'Add the following text labels on the image: "host star", "transiting planet", "atmospheric limb", "starlight filtered through atmosphere".',
    alt: 'An exoplanet silhouetted against its star during transit — a thin glowing atmospheric halo at the edge of the planetary disk',
    caption:
      'When a planet passes in front of its star, starlight filters through the thin atmospheric rim at the edge of the planetary disk. Every molecule leaves its own imprint on the spectrum — a chemical signature we can read from hundreds of light-years away.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Imagine trying to identify the contents of a flask that sits hundreds of light-years away — using only the change in color of the shadow it casts. That is roughly the challenge of studying exoplanet atmospheres. But it is solvable. The physics of molecules does not change from one star system to the next: every gas absorbs light at precisely defined wavelengths. That means a spectrum is a passport — and we have learned to read it.',

        'At the beginning of the twenty-first century, the first atmospheric measurements of exoplanets were crude and barely credible. In 2002 the Hubble Space Telescope detected sodium in the atmosphere of the hot Jupiter HD 209458b — a planet orbiting its star so closely that its year lasts three and a half Earth days. That was the first chemical detection in the atmosphere of any planet beyond our solar system. With the launch of the James Webb Space Telescope in 2021 and the first science results in 2022, the field made a quantum leap: we now measure not isolated molecules but entire chemical landscapes.',
      ],
    },

    {
      heading: 'Transmission Spectroscopy: Reading an Atmosphere Through Its Shadow',
      level: 2,
      paragraphs: [
        'The most productive method for studying exoplanet atmospheres is _transmission spectroscopy_. As a planet crosses in front of its star, a small fraction of the starlight is not blocked by the planetary disk but filters through the thin atmospheric rim at the edge of the planet — the **limb atmosphere**. Molecules in this rim absorb photons at their characteristic wavelengths. A spectrograph records which wavelengths have "dropped out," and we obtain a chemical portrait of the atmosphere.',

        'The key physical quantity here is the **scale height**: the characteristic altitude over which atmospheric pressure decreases by a factor of Euler\'s number (approximately 2.718). The lighter the gas and the higher the temperature, the greater the scale height and the more "puffed out" the atmosphere. This is why hot Jupiters — giant planets on very tight orbits — give the strongest atmospheric signals: their atmospheres are inflated by stellar heat and occupy a relatively large volume around the planet.',

        'It is important to understand the method\'s limitation: transmission spectroscopy "sees" only the limb atmosphere — a narrow equatorial band where temperature and chemistry may differ substantially from the dayside or nightside. Clouds and aerosols on the limb can completely block the signal, rendering the spectrum flat and uninformative even if rich chemistry exists beneath the cloud deck.',
      ],
    },

    {
      diagram: {
        title: 'Geometry of Transmission Spectroscopy',
        svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Star -->
  <circle cx="120" cy="160" r="90" fill="rgba(255,220,120,0.18)" stroke="#ff8844" stroke-width="1.5"/>
  <circle cx="120" cy="160" r="72" fill="rgba(255,200,80,0.22)" stroke="#ff8844" stroke-width="1"/>
  <text x="120" y="165" fill="#ff8844" font-family="monospace" font-size="11" text-anchor="middle">star</text>

  <!-- Starlight rays (parallel) passing planet -->
  <line x1="210" y1="110" x2="680" y2="110" stroke="#ff8844" stroke-width="1" stroke-dasharray="6,4" opacity="0.5"/>
  <line x1="210" y1="210" x2="680" y2="210" stroke="#ff8844" stroke-width="1" stroke-dasharray="6,4" opacity="0.5"/>

  <!-- Limb rays: filtered through atmosphere -->
  <line x1="210" y1="128" x2="680" y2="128" stroke="#7bb8ff" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.85"/>
  <line x1="210" y1="192" x2="680" y2="192" stroke="#7bb8ff" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.85"/>

  <!-- Planet -->
  <circle cx="400" cy="160" r="48" fill="#1a2a3a" stroke="#334455" stroke-width="1.5"/>

  <!-- Atmosphere halo -->
  <circle cx="400" cy="160" r="62" fill="none" stroke="#7bb8ff" stroke-width="6" opacity="0.3"/>
  <circle cx="400" cy="160" r="62" fill="none" stroke="#44ff88" stroke-width="2" opacity="0.5" stroke-dasharray="4,6"/>

  <!-- Labels -->
  <text x="400" y="164" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle">planet</text>
  <text x="400" y="240" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">limb atmosphere</text>
  <line x1="400" y1="226" x2="400" y2="222" stroke="#7bb8ff" stroke-width="1" opacity="0.6"/>

  <!-- Filtered light label -->
  <text x="580" y="120" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">filtered</text>
  <text x="580" y="130" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">starlight</text>

  <!-- Unfiltered label -->
  <text x="580" y="100" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle" opacity="0.7">direct starlight</text>
  <text x="580" y="200" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle" opacity="0.7">direct starlight</text>

  <!-- Arrow to spectrograph -->
  <text x="658" y="164" fill="#44ff88" font-family="monospace" font-size="11">→</text>
  <text x="674" y="180" fill="#44ff88" font-family="monospace" font-size="9">spectrum</text>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Transmission Spectroscopy — Method Geometry</text>

  <!-- Scale height annotation -->
  <line x1="464" y1="160" x2="464" y2="128" stroke="#44ff88" stroke-width="1" opacity="0.7"/>
  <text x="470" y="148" fill="#44ff88" font-family="monospace" font-size="9">scale</text>
  <text x="470" y="158" fill="#44ff88" font-family="monospace" font-size="9">height</text>
</svg>`,
        caption:
          'Direct starlight (orange rays) passes beside the planet unchanged. Rays that travel through the limb atmosphere (blue) are absorbed by molecules — and this difference between the "out of transit" and "in transit" spectra reveals the chemical composition of the atmosphere.',
      },
    },

    {
      heading: 'Emission Spectroscopy: Listening to the Dayside',
      level: 2,
      paragraphs: [
        'Transmission spectroscopy is not the only tool. When a planet disappears behind its star in a _secondary eclipse_, we can compare the spectrum of the combined "star plus planet" system with the spectrum of the star alone, and isolate the planet\'s own contribution. This is called **emission** or **dayside spectroscopy**: we measure the infrared thermal radiation coming from the planet\'s sunlit face.',

        'Dayside spectroscopy gives access to what the transit method cannot reach: the temperature profile of the atmosphere with altitude, the presence of a temperature inversion (where temperature increases with height), and the distribution of heat between the day and night sides. By comparing dayside and transit measurements of the same object, scientists build a three-dimensional picture of atmospheric circulation — genuine meteorology of alien worlds.',

        'A third approach is **Doppler cross-correlation** at very high spectral resolution. Molecules move with the planet, so their absorption lines shift in wavelength according to the orbital motion. By matching the observed spectrum against templates for thousands of molecular lines simultaneously, researchers can detect winds in hot Jupiter atmospheres and measure the speed at which air masses flow from the dayside to the nightside — sometimes several kilometers per second.',
      ],
    },

    {
      image: {
        cacheKey: 'exoatmo-wasp39b-spectrum',
        prompt:
          'Photorealistic scientific illustration for a space encyclopedia: a transmission spectrum graph of exoplanet WASP-39b obtained by the James Webb Space Telescope. ' +
          'Dark background, x-axis showing wavelength in micrometers from 0.5 to 5.5, y-axis showing transit depth in parts per million. ' +
          'The spectrum shows distinct molecular absorption features highlighted in different colors with labels. ' +
          'Hard sci-fi style, monospace labels, technically accurate visualization. ' +
          'Add the following text labels on the image: "CO2 at 4.3 micrometers", "SO2 at 4.0 micrometers", "H2O features", "Na", "WASP-39b spectrum (JWST 2022)".',
        alt: 'Transmission spectrum of WASP-39b obtained by the James Webb Space Telescope — distinct molecular absorption bands are clearly visible',
        caption:
          'The WASP-39b spectrum was the first complete chemical portrait of an exoplanet atmosphere. Clear absorption bands of carbon dioxide, sulfur dioxide, and water vapor confirmed that transmission spectroscopy can accurately decode the chemistry of alien atmospheres.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'WASP-39b: The First Complete Chemical Portrait',
      level: 2,
      paragraphs: [
        'WASP-39b is a hot Jupiter in the constellation Virgo, orbiting its star every four Earth days at a distance ten times smaller than Mercury\'s distance from the Sun. The planet itself is not a life candidate — it is far too hot. But in 2022 it became the laboratory object where the James Webb Space Telescope first demonstrated its full power for atmospheric science.',

        'In the spectrum of WASP-39b, the telescope\'s instruments detected carbon dioxide, water, sodium, and — for the first time in any exoplanet atmosphere — **sulfur dioxide**. The last discovery was particularly revealing: in this case, sulfur dioxide is not formed volcanically but photochemically — ultraviolet photons from the star synthesize it from sulfur and oxygen in the atmosphere. This was the first direct observation of _photochemical_ reactions in the atmosphere of an exoplanet.',

        'Detailed analysis showed that WASP-39b\'s atmosphere contains more oxygen relative to carbon than Jupiter\'s atmosphere does. This suggests the planet formed farther from its star, where it accreted more icy bodies, and then migrated inward. Spectroscopy thus not only describes an atmosphere but also reconstructs the formation history of a planetary system.',
      ],
    },

    {
      heading: 'TRAPPIST-1: Seven Planets, Silence on the Inner Ones',
      level: 2,
      paragraphs: [
        'The TRAPPIST-1 system — seven Earth-sized planets around a cold red dwarf in the constellation Aquarius — became one of the primary targets for the James Webb Space Telescope. At least three of the seven planets (labeled e, f, and g) fall within the star\'s habitable zone. It is the highest concentration of potentially habitable planets in any known system.',

        'The first results for the two innermost planets — TRAPPIST-1b and TRAPPIST-1c — turned out to be unexpectedly clear-cut and sobering. Measurements of the thermal emission from their daysides showed that these planets lack any substantial atmosphere: their dayside temperatures match those of a bare rocky surface without atmospheric heat redistribution. This does not mean the entire system is atmosphere-free, but it reminds us that young red dwarfs irradiate their close-in planets very aggressively and can strip away their atmospheres.',

        'Measurements for the outer planets (d, e, f, g) are considerably more demanding and require more observing time. These planets are farther away, their transits less frequent, and the signal weaker. The scientific community is waiting for them with great anticipation — they are the primary candidates for retained atmospheres and possible liquid water.',
      ],
    },

    {
      image: {
        cacheKey: 'exoatmo-trappist1-system',
        prompt:
          'Photorealistic scientific illustration for a space encyclopedia: the TRAPPIST-1 planetary system with seven Earth-sized planets orbiting a small dim red star. ' +
          'The star is small and red-orange at center, seven planets shown in their orbital positions at different distances, planets labeled b through g, ' +
          'the three habitable zone planets (e, f, g) highlighted with a faint green glow, ' +
          'inner planets b and c shown rocky and barren, outer planets with possible surface ice. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "TRAPPIST-1 (M-dwarf)", "b (no atmosphere detected)", "c (no atmosphere detected)", "habitable zone", "e, f, g (under study)".',
        alt: 'The TRAPPIST-1 system — seven Earth-sized planets around a red dwarf, three of which lie in the habitable zone',
        caption:
          'TRAPPIST-1 is the most intensively studied multi-planet system around a red dwarf. The inner planets proved to lack dense atmospheres; the question for the outer planets remains open.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'K2-18b and the Dimethyl Sulfide Controversy',
      level: 2,
      paragraphs: [
        'K2-18b is a planet of intermediate size between Earth and Neptune, sometimes called a "hycean" world (from the hybrid word ocean and hydrogen): under one hypothesis, a deep liquid water ocean may exist beneath a hydrogen-rich atmosphere. The planet sits in the habitable zone of its red dwarf host star at a distance of approximately one hundred and twenty light-years from us.',

        'In 2023, a research group led by Nikku Madhusudhan published James Webb Space Telescope observations reporting the possible detection in K2-18b\'s atmosphere of carbon dioxide, methane, and — potentially — **dimethyl sulfide** (the molecule composed of two methyl groups bound to a sulfur atom). On Earth, dimethyl sulfide is produced exclusively by living organisms, primarily marine algae. If confirmed, such a detection would represent the strongest evidence yet obtained for possible extraterrestrial life.',

        'However, scientific consensus remains cautious. The dimethyl sulfide signal sits at the edge of the instrument\'s resolution, and the spectral features of this molecule in the infrared overlap with those of other carbon-containing compounds. Several independent groups who analyzed the same data reached conflicting conclusions. Additional observations at different wavelengths and with greater signal accumulation are needed. Reporting dimethyl sulfide as an established detection would, at this point, be premature.',
      ],
    },

    {
      image: {
        cacheKey: 'exoatmo-k2-18b-hycean',
        prompt:
          'Photorealistic scientific illustration for a space encyclopedia: artistic rendering of exoplanet K2-18b as a possible hycean world. ' +
          'A large planet with a thick pale blue-grey hydrogen-rich atmosphere, hints of an ocean surface visible through gaps in cloud cover, ' +
          'its small red dwarf host star visible at distance. ' +
          'Hard sci-fi style, dark space background, scientifically plausible design. ' +
          'Add the following text labels on the image: "K2-18b", "hydrogen-rich atmosphere", "possible liquid ocean", "M-dwarf host star".',
        alt: 'K2-18b as a hycean world — a planet with a hydrogen-rich atmosphere and a possible sub-cloud ocean',
        caption:
          'K2-18b has been at the center of scientific debate since the 2023 publication reporting a possible dimethyl sulfide signal. The hycean hypothesis is an appealing scenario but remains unconfirmed and requires further observations.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Iron Rain, Clouds, and the Super-Earth to Mini-Neptune Divide',
      level: 2,
      paragraphs: [
        'Hot Jupiters — giant planets orbiting their stars in just a few Earth days — display atmospheric chemistry that has no analogue in our solar system. On the dayside, temperatures exceed one thousand degrees: iron and magnesium exist there as gases. When these vapors are carried by circulation to the cooler nightside, they condense. Computer models predict, and observations increasingly confirm, that on some hot Jupiters **iron rain** literally falls — droplets of molten iron precipitating through the upper atmosphere.',

        'GJ 1214b — a planet between Earth and Neptune in size, located roughly forty light-years away — initially returned a completely flat transmission spectrum. That is a classic sign of a solid cloud deck blocking the signal. Later observations with the James Webb Space Telescope revealed infrared features pointing to a highly carbon-enriched atmosphere beneath the clouds — one that resembles neither Earth nor Neptune.',

        'The distribution of known exoplanets by size reveals a curious gap — between roughly one and a half and two Earth radii, very few planets exist. This is the **radius gap**, also called the photoevaporation valley. The accepted explanation: planets in this transitional size range lose their hydrogen envelopes to stellar photon bombardment and are left either as bare rocky cores (super-Earths) or retain enough to remain as mini-Neptunes. Atmospheric evolution literally sculpts the architecture of planetary systems.',
      ],
    },

    {
      image: {
        cacheKey: 'exoatmo-hot-jupiter-iron-rain',
        prompt:
          'Photorealistic scientific illustration for a space encyclopedia: a hot Jupiter exoplanet with dramatic atmospheric circulation. ' +
          'The planet is tidally locked, dayside glowing in intense yellow-orange heat, nightside dark blue. ' +
          'Visible iron vapor clouds on the dayside condensing and falling as metallic rain on the nightside. ' +
          'Jet stream winds shown as bright streaks moving from day to night side. ' +
          'Hard sci-fi style, dark space background, technically dramatic. ' +
          'Add the following text labels on the image: "dayside >1000 C", "iron vapor", "iron condensation", "nightside", "jet stream winds".',
        alt: 'A hot Jupiter with atmospheric circulation — iron is gaseous on the dayside and condenses into rain on the cooler nightside',
        caption:
          'On hot Jupiters, atmospheric dynamics are extraordinarily dramatic: powerful jet-stream winds carry heat and chemical species between the day and night sides. Some models predict rain made of molten iron droplets on the nightside.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: '55 Cancri e: A Lava World and Its Mineral Vapors',
      level: 2,
      paragraphs: [
        '55 Cancri e is a rocky planet roughly twice Earth\'s radius, orbiting its star every twenty Earth hours. It sits so close to its star that the surface is literally molten: dayside temperatures are estimated between two and three thousand degrees Celsius. This is a **lava world**.',

        'For years, observers were puzzled by sharp fluctuations in the thermal flux from the planet between different observing seasons — much larger than could be explained by a simple orbital variation. One hypothesis: the planet hosts an unstable atmosphere composed of substances that vaporize at these temperatures — such as silicon monoxide, aluminum oxide, and sodium. This "mineral atmosphere" is not permanent: at certain epochs it may be relatively dense; at others, it nearly vanishes.',

        'New James Webb Space Telescope measurements in 2023 and 2024 confirmed the presence of some form of atmosphere around 55 Cancri e and found infrared features consistent with carbon dioxide or carbon monoxide. But the final interpretation is still under discussion. We have learned to hear this planet; we have not yet deciphered everything it is saying.',
      ],
    },

    {
      diagram: {
        title: 'Molecular Absorption in a Transmission Spectrum',
        svg: `<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Axes -->
  <line x1="60" y1="220" x2="670" y2="220" stroke="#334455" stroke-width="1.2"/>
  <line x1="60" y1="30"  x2="60"  y2="220" stroke="#334455" stroke-width="1.2"/>

  <!-- X axis label -->
  <text x="365" y="250" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Wavelength (micrometers)</text>

  <!-- Y axis label -->
  <text x="18" y="130" fill="#8899aa" font-family="monospace" font-size="10"
        text-anchor="middle" transform="rotate(-90 18 130)">Transit depth</text>

  <!-- X axis ticks and labels -->
  <line x1="120" y1="218" x2="120" y2="224" stroke="#334455"/>
  <text x="120" y="235" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">0.7</text>
  <line x1="220" y1="218" x2="220" y2="224" stroke="#334455"/>
  <text x="220" y="235" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">1.4</text>
  <line x1="320" y1="218" x2="320" y2="224" stroke="#334455"/>
  <text x="320" y="235" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">2.3</text>
  <line x1="420" y1="218" x2="420" y2="224" stroke="#334455"/>
  <text x="420" y="235" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">3.3</text>
  <line x1="520" y1="218" x2="520" y2="224" stroke="#334455"/>
  <text x="520" y="235" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">4.3</text>
  <line x1="620" y1="218" x2="620" y2="224" stroke="#334455"/>
  <text x="620" y="235" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">5.0</text>

  <!-- Baseline -->
  <line x1="60" y1="185" x2="670" y2="185" stroke="#334455" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>

  <!-- Na (~0.59 um) -->
  <rect x="102" y="142" width="8" height="43" fill="rgba(255,136,68,0.6)" stroke="#ff8844" stroke-width="1"/>
  <text x="106" y="134" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Na</text>

  <!-- H2O (~1.4 um) -->
  <rect x="210" y="118" width="22" height="67" fill="rgba(123,184,255,0.5)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="221" y="110" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">H2O</text>

  <!-- H2O second (~1.9 um) -->
  <rect x="267" y="138" width="16" height="47" fill="rgba(123,184,255,0.4)" stroke="#7bb8ff" stroke-width="1"/>

  <!-- CH4 (~2.3 um) -->
  <rect x="312" y="130" width="18" height="55" fill="rgba(255,136,68,0.45)" stroke="#ff8844" stroke-width="1"/>
  <text x="321" y="122" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">CH4</text>

  <!-- CO2 (~4.3 um) — strongest JWST feature -->
  <rect x="506" y="68" width="28" height="117" fill="rgba(204,68,68,0.6)" stroke="#cc4444" stroke-width="1.5"/>
  <text x="520" y="60" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">CO2</text>

  <!-- SO2 (~4.0 um) -->
  <rect x="477" y="110" width="14" height="75" fill="rgba(255,200,80,0.55)" stroke="#ffd080" stroke-width="1"/>
  <text x="484" y="102" fill="#ffd080" font-family="monospace" font-size="9" text-anchor="middle">SO2</text>

  <!-- DMS (uncertain, ~3.4 um) -->
  <rect x="434" y="160" width="12" height="25" fill="rgba(68,255,136,0.35)" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="440" y="153" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">DMS?</text>

  <!-- H2O third (~2.7 um) -->
  <rect x="368" y="128" width="18" height="57" fill="rgba(123,184,255,0.4)" stroke="#7bb8ff" stroke-width="1"/>

  <!-- Title -->
  <text x="365" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Molecules in an Exoplanet Transmission Spectrum</text>
</svg>`,
        caption:
          'Each molecule absorbs light at its characteristic wavelengths, leaving distinctive dips in the transmission spectrum. Carbon dioxide produces the strongest signal in the infrared at around 4.3 micrometers. The dimethyl sulfide signal is marked with a question mark — it is not yet a confirmed detection.',
      },
    },

    {
      heading: 'What Comes Next: The Extremely Large Telescope and the Road to Earth-Like Worlds',
      level: 2,
      paragraphs: [
        'The James Webb Space Telescope revolutionized atmospheric planetology, but it is a pioneering telescope, not an answering telescope. For truly Earth-like planets in the habitable zones of Sun-like stars, its capabilities fall short: the signal is too faint and the stellar contamination too large.',

        'The ground-based **Extremely Large Telescope**, under construction in Chile and expected to begin operations around 2027, will have a mirror approximately thirty-nine meters across. Its key advantage for atmospheric studies is the ability to apply Doppler cross-correlation at very high spectral resolution to rocky planets in the habitable zones of nearby star systems. Purpose-built instruments will search for oxygen and water in the atmospheres of planets around the closest stars — TRAPPIST-1, Proxima Centauri, Barnard\'s Star.',

        'Combining ground-based giants with future space missions — such as the American Habitable Worlds Observatory concept and the European Space Agency\'s Large Interferometer for Exoplanets — forms the roadmap for the next two to three decades. The goal is not merely to detect an atmosphere but to find a _combination_ of indicators: liquid water, oxygen, methane, ozone, possibly organosulfur compounds — and to rule out every conceivable abiotic explanation. That will require not one measurement but dozens of consistent observations by different methods.',

        'From the first detection of sodium in a hot Jupiter\'s atmosphere in 2002 to the complete chemical spectrum of WASP-39b in 2022, twenty years passed. The next twenty years may bring us the first spectrum of a genuinely Earth-like planet\'s atmosphere — with all its molecules, uncertainties, and perhaps hints that we do not yet know how to expect or interpret.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Transmission spectroscopy',
      definition:
        'A method for analyzing an exoplanet atmosphere: as the planet transits its star, some starlight filters through the limb atmosphere and is absorbed by molecules. The resulting absorption features in the spectrum reveal atmospheric composition.',
    },
    {
      term: 'Limb atmosphere',
      definition:
        'The narrow atmospheric rim at the edge of a planetary disk through which starlight passes during a transit. This is the layer analyzed by transmission spectroscopy.',
    },
    {
      term: 'Scale height',
      definition:
        "The characteristic altitude over which atmospheric pressure decreases by a factor of Euler's number (approximately 2.718). A greater scale height means a more puffed-out atmosphere and a stronger transit signal.",
    },
    {
      term: 'Transit depth',
      definition:
        'The fraction of stellar flux blocked by a planet during transit. It depends on the ratio of the areas of the planetary and stellar disks. Changes in transit depth at different wavelengths reveal the presence of atmospheric molecules.',
    },
    {
      term: 'Dayside (emission) spectroscopy',
      definition:
        'A method for analyzing an exoplanet atmosphere by comparing the spectrum of the star-plus-planet system before and after a secondary eclipse (when the planet moves behind the star). It gives access to the temperature and chemistry of the dayside.',
    },
    {
      term: 'Doppler cross-correlation',
      definition:
        'A spectroscopic method that detects molecules through the Doppler shift of their absorption lines caused by the orbital motion of the planet. It allows determination of atmospheric composition and measurement of atmospheric winds.',
    },
    {
      term: 'Dimethyl sulfide',
      definition:
        'A molecule produced on Earth exclusively by living organisms (primarily marine algae). It is a biosignature candidate. In 2023, a possible dimethyl sulfide signal was reported in the atmosphere of K2-18b — the result remains contested.',
    },
    {
      term: 'Hycean planet',
      definition:
        'A hypothetical planetary type intermediate between Earth and Neptune, with a hydrogen or helium atmosphere and a liquid water ocean beneath it. K2-18b is the leading candidate for this class, but the hypothesis has not been confirmed.',
    },
    {
      term: 'Radius gap',
      definition:
        'An observed deficit of exoplanets with sizes between approximately 1.5 and 2 Earth radii. Explained by photoevaporative atmosphere loss: such planets either shed their atmosphere and become super-Earths, or retain it and remain as mini-Neptunes.',
    },
  ],

  quiz: [
    {
      question: 'What exactly is analyzed during transmission spectroscopy?',
      options: [
        'Reflected starlight from the planetary surface',
        'The planet\'s own thermal emission from its dayside',
        'Starlight filtered through the planetary limb atmosphere during transit',
        'Radio emission from the planet in the millimeter wavelength range',
      ],
      correctIndex: 2,
      explanation:
        'During a transit, direct starlight is blocked by the planetary disk. Some of the light that passes through the thin atmospheric rim at the edge of the disk (the limb atmosphere) is absorbed by molecules — and these dips in the spectrum reveal the chemical composition of the atmosphere.',
    },
    {
      question: 'Which discovery in the atmosphere of WASP-39b was a first for any exoplanet?',
      options: [
        'Detection of liquid water on the surface',
        'Detection of sulfur dioxide as a product of photochemical reactions',
        'Detection of oxygen in thermodynamic disequilibrium',
        'Detection of dimethyl sulfide as a sign of possible life',
      ],
      correctIndex: 1,
      explanation:
        'In 2022, the James Webb Space Telescope detected sulfur dioxide in the atmosphere of exoplanet WASP-39b for the first time. This molecule is produced by photochemical reactions driven by the star\'s ultraviolet radiation — making it the first direct detection of photochemistry in the atmosphere of any planet beyond our solar system.',
    },
    {
      question: 'Why did the results for TRAPPIST-1b and TRAPPIST-1c turn out to be unexpectedly significant?',
      options: [
        'They revealed a dense carbon dioxide atmosphere similar to Venus',
        'They showed signs of liquid water on the surface',
        'They indicated the absence of dense atmospheres, likely due to aggressive stellar irradiation',
        'They confirmed the simultaneous presence of oxygen and methane',
      ],
      correctIndex: 2,
      explanation:
        'Measurements of the thermal emission from the daysides of TRAPPIST-1b and TRAPPIST-1c showed temperatures consistent with a bare rocky surface without atmospheric heat redistribution. This points to the absence of a substantial atmosphere — likely the result of prolonged ultraviolet and X-ray irradiation by the young red dwarf.',
    },
    {
      question: 'Why does the reported detection of dimethyl sulfide at K2-18b remain disputed?',
      options: [
        'Because dimethyl sulfide can also be produced by volcanoes, not only by organisms',
        'Because the signal sits at the edge of instrument resolution and overlaps with other molecules',
        'Because the planet is outside the habitable zone and the detection is therefore a technical error',
        'Because dimethyl sulfide at such concentrations contradicts the laws of chemistry',
      ],
      correctIndex: 1,
      explanation:
        'The dimethyl sulfide signal in the spectrum of K2-18b is very weak and falls in a wavelength range where its spectral features overlap with those of other carbon-containing molecules. Independent groups that analyzed the same data reached different conclusions. Additional observations are required to resolve the ambiguity.',
    },
    {
      question: 'What is the purpose of high-resolution spectroscopy and Doppler cross-correlation?',
      options: [
        'To measure the planet\'s size from the transit depth',
        'To determine atmospheric composition through the Doppler shift of molecular lines due to orbital motion',
        'To search for artificial radio signals from exoplanets',
        'To measure the planet\'s mass through gravitational microlensing',
      ],
      correctIndex: 1,
      explanation:
        'Doppler cross-correlation detects atmospheric molecules because their absorption lines shift to different wavelengths as the planet moves in its orbit. Matching the observed spectrum against templates for thousands of lines simultaneously allows detection of even weak molecular signals and measurement of atmospheric wind speeds.',
    },
  ],

  sources: [
    {
      title: 'Charbonneau D. et al. — Detection of an extrasolar planet atmosphere (HD 209458b)',
      url: 'https://arxiv.org/abs/astro-ph/0111544',
      meta: 'ApJ, 568, 377, 2002 — first detection of an exoplanet atmosphere',
    },
    {
      title: 'JWST Transiting Exoplanet Community Early Release Science Team — Identification of carbon dioxide in WASP-39b',
      url: 'https://www.nature.com/articles/s41586-022-05269-w',
      meta: 'Nature, 614, 649–652, 2023',
    },
    {
      title: 'JWST Transiting Exoplanet Community Early Release Science Team — Sulfur dioxide in WASP-39b',
      url: 'https://www.nature.com/articles/s41586-022-05466-7',
      meta: 'Nature, 614, 664–667, 2023',
    },
    {
      title: 'Madhusudhan N. et al. — Carbon-bearing molecules in a possible Hycean atmosphere (K2-18b)',
      url: 'https://arxiv.org/abs/2309.05566',
      meta: 'ApJL, 956, L18, 2023 (open access)',
    },
    {
      title: 'Greene T.P. et al. — Thermal emission from the Earth-sized exoplanet TRAPPIST-1c',
      url: 'https://www.nature.com/articles/s41586-023-05951-7',
      meta: 'Nature, 618, 39–42, 2023',
    },
    {
      title: 'Kempton E.M.-R. et al. — A reflective, metal-rich atmosphere for GJ 1214b',
      url: 'https://www.nature.com/articles/s41586-023-06159-5',
      meta: 'Nature, 620, 67–71, 2023',
    },
    {
      title: 'Hu R. et al. — Secondary atmosphere on 55 Cancri e: evidence for volatile outgassing',
      url: 'https://www.nature.com/articles/s41586-024-07173-x',
      meta: 'Nature, 2024',
    },
    {
      title: 'Snellen I. et al. — The orbital motion, absolute mass and high-altitude winds of exoplanet HD 209458b',
      url: 'https://www.nature.com/articles/nature08239',
      meta: 'Nature, 465, 1049–1051, 2010 — first Doppler cross-correlation detection',
    },
    {
      title: 'Fulton B.J. et al. — The California-Kepler Survey III: The gap in the radius distribution',
      url: 'https://arxiv.org/abs/1703.10375',
      meta: 'AJ, 154, 109, 2017 — discovery of the radius gap',
    },
    {
      title: 'ELT Science Case — Exoplanet Atmospheres with the Extremely Large Telescope',
      url: 'https://elt.eso.org/science/case/',
      meta: 'ESO Extremely Large Telescope, official science resource, 2024',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
