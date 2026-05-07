import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'age-and-size-universe',
  language: 'en',
  section: 'cosmology',
  order: 7,
  difficulty: 'beginner',
  readingTimeMin: 11,
  title: 'Age and Size of the Universe',
  subtitle:
    'Thirteen point eight billion years — and why the observable universe is far larger than that number suggests.',

  hero: {
    cacheKey: 'age-and-size-universe-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the observable universe — concentric spherical shells ' +
      'representing cosmic horizons around the Milky Way at center. ' +
      'Innermost bright region: nearby galaxies. Middle shell: distant galaxy clusters. ' +
      'Outermost glowing shell: the cosmic microwave background surface of last scattering, 13.8 billion light-years lookback. ' +
      'Beyond: fading dark void representing regions beyond the observable horizon. ' +
      'Hard sci-fi style, dark space background, deep blue and orange gradient tones. ' +
      'Add the following text labels on the image: "Observable universe", "46 Gly radius", "CMB shell", "13.8 Gyr ago". ' +
      'Aspect ratio 16:9.',
    alt:
      'Artistic reconstruction: concentric spheres of cosmological horizons centered on the Milky Way.',
    caption:
      'The observable universe — a sphere approximately forty-six billion light-years in radius. ' +
      'It is larger than thirteen point eight billion light-years because space itself has been expanding throughout.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'There are two numbers that keep appearing in conversations about the universe. ' +
        'The first: thirteen point eight billion years — the time elapsed from the Big Bang to today. ' +
        'The second: ninety-three billion light-years — the diameter of what we call the observable universe. ' +
        'Multiply thirteen point eight billion by two and you get twenty-seven point six billion. ' +
        'Not ninety-three. Where does this discrepancy come from?',

        'The answer is not a calculation error. It lies in the nature of space itself. ' +
        'While a photon traveled toward us for thirteen point eight billion years, ' +
        'the space between us and its source was not standing still — it was expanding. ' +
        'Today, that source is far more distant than it was at the moment it emitted its first light. ' +
        'The age of the universe and the size of the observable universe are answers to two fundamentally ' +
        'different questions, and conflating them produces a paradox where none actually exists.',
      ],
    },

    {
      heading: 'How We Know the Age: Four Independent Methods',
      level: 2,
      paragraphs: [
        'The figure of thirteen point eight billion years was not obtained by a single method — ' +
        'it is the result of four independent measurements converging on the same answer. ' +
        'Each one is powerful enough to stand alone. Together they form one of the most robust facts in modern science.',

        'The first method is the **Cosmic Microwave Background**. The Planck mission of the European Space Agency ' +
        'completed its primary science program in 2013 and published its final parameters in 2018. ' +
        'Analysis of the fine structure of temperature fluctuations in this relic radiation yielded an age of ' +
        'thirteen billion eight hundred and seventy million years, with an uncertainty of roughly twenty million. ' +
        'This is the most precise single estimate we have.',

        'The second method is the **age of globular clusters**. Globular clusters are the oldest stellar ensembles ' +
        'in our galaxy. The stars within them formed at nearly the same time, and the color and luminosity ' +
        'of the oldest surviving stars reveal how long ago that happened. ' +
        'The oldest known clusters date to approximately twelve to thirteen billion years, ' +
        'establishing a hard lower bound: the universe cannot be younger than its own stars.',

        'The third method is **white dwarf cooling**. When a star of roughly solar mass exhausts its fuel, ' +
        'it collapses into a white dwarf — an incandescent remnant that cools very slowly over time. ' +
        'Modern cooling theory allows astronomers to determine the age of the coldest white dwarfs ' +
        'in the solar neighborhood. Their ages again point to approximately twelve to thirteen billion years.',

        'The fourth method is **nucleochronology**. This is radioactive dating applied to stars: ' +
        'measuring the ratios of radioactive isotopes — for example thorium-232 and uranium-238 — ' +
        'in stellar atmospheres. These isotopes were forged in ancient supernovae and have been ' +
        'decaying ever since. Comparing the measured ratio to the theoretically predicted initial ratio ' +
        'yields a formation date — consistently thirteen to fourteen billion years ago.',
      ],
    },

    {
      image: {
        cacheKey: 'age-and-size-universe-age-methods',
        prompt:
          'Scientific illustration for a science encyclopedia: four independent methods for measuring the age of the universe. ' +
          'Four vertical panels side by side on dark background: ' +
          '1) CMB temperature map (Planck) labeled "CMB / Planck 2018: 13.8 Gyr", ' +
          '2) Dense globular star cluster labeled "Globular clusters: 12-13 Gyr", ' +
          '3) A faint cooling white dwarf star labeled "White dwarf cooling: 12-13 Gyr", ' +
          '4) Spectrum lines with isotope ratio labeled "Nucleochronology: 13-14 Gyr". ' +
          'Hard sci-fi style, dark background #020510, monospace font, cyan/orange accents. ' +
          'Aspect ratio 16:9.',
        alt:
          'Four independent methods for determining the age of the universe: CMB, globular clusters, white dwarfs, nucleochronology.',
        caption:
          'Four independent methods — and all of them converge on the same answer: approximately thirteen point eight billion years.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Hubble Constant and the Tension Around It',
      level: 2,
      paragraphs: [
        'The age of the universe is inseparable from the rate at which space is expanding — ' +
        'the so-called _Hubble constant_. The faster the universe expands, ' +
        'the less time was needed for galaxies to reach their present separations. ' +
        'And here lies one of the most heated open disputes in contemporary science.',

        'The Planck mission, analyzing the Cosmic Microwave Background — the oldest light in the universe — ' +
        'returned a value of sixty-seven point four kilometers per second per megaparsec. ' +
        'The **SH0ES** team led by Adam Riess measured the constant by an entirely different route: ' +
        'through _standard candles_ — Cepheid variable stars and Type Ia supernovae in nearby galaxies. ' +
        'Their value is seventy-three kilometers per second per megaparsec. ' +
        'The difference appears modest in absolute terms, but its statistical significance exceeds ' +
        'five sigma — the threshold at which physicists speak of a discovery.',

        'In 2024, the James Webb Space Telescope provided new distance measurements to Cepheids, ' +
        'specifically to test whether the high SH0ES value was an artifact of earlier Hubble Space Telescope observations. ' +
        'The results confirmed the SH0ES numbers rather than bringing them closer to Planck. ' +
        'This means either one of the methods carries an undetected systematic error, ' +
        'or the universe contains something the standard model does not describe. ' +
        'As of May 2026, no resolution has been found.',

        'What does this mean for the age? A higher Hubble constant implies a slightly younger universe — ' +
        'roughly thirteen point two billion years instead of thirteen point eight. ' +
        'Both estimates are consistent with the ages of the oldest stars. ' +
        'But the conflict between methods is real and unresolved.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Hubble Tension — Two Methods, Two Results',
        svg: `<svg viewBox="0 0 700 230" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="230" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Hubble Constant H0 — two methods, two results</text>

  <!-- Horizontal number line -->
  <line x1="80" y1="120" x2="620" y2="120" stroke="#334455" stroke-width="1.5"/>

  <!-- Tick marks -->
  <line x1="150" y1="115" x2="150" y2="125" stroke="#667788" stroke-width="1"/>
  <text x="150" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">62</text>
  <line x1="230" y1="115" x2="230" y2="125" stroke="#667788" stroke-width="1"/>
  <text x="230" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">65</text>
  <line x1="310" y1="115" x2="310" y2="125" stroke="#667788" stroke-width="1"/>
  <text x="310" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">68</text>
  <line x1="390" y1="115" x2="390" y2="125" stroke="#667788" stroke-width="1"/>
  <text x="390" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">71</text>
  <line x1="470" y1="115" x2="470" y2="125" stroke="#667788" stroke-width="1"/>
  <text x="470" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">74</text>
  <line x1="550" y1="115" x2="550" y2="125" stroke="#667788" stroke-width="1"/>
  <text x="550" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">77</text>
  <text x="350" y="155" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">km/s/Mpc</text>

  <!-- Planck CMB error bar -->
  <line x1="281" y1="70" x2="307" y2="70" stroke="#7bb8ff" stroke-width="2"/>
  <line x1="294" y1="62" x2="294" y2="78" stroke="#7bb8ff" stroke-width="2"/>
  <line x1="281" y1="66" x2="281" y2="74" stroke="#7bb8ff" stroke-width="1.5"/>
  <line x1="307" y1="66" x2="307" y2="74" stroke="#7bb8ff" stroke-width="1.5"/>
  <circle cx="294" cy="70" r="4" fill="#7bb8ff"/>
  <text x="294" y="57" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="10">Planck / CMB</text>
  <text x="294" y="47" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="12">67.4 ± 0.5</text>
  <text x="294" y="37" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">ESA Planck 2018</text>

  <!-- SH0ES error bar -->
  <line x1="416" y1="70" x2="470" y2="70" stroke="#ff8844" stroke-width="2"/>
  <line x1="443" y1="62" x2="443" y2="78" stroke="#ff8844" stroke-width="2"/>
  <line x1="416" y1="66" x2="416" y2="74" stroke="#ff8844" stroke-width="1.5"/>
  <line x1="470" y1="66" x2="470" y2="74" stroke="#ff8844" stroke-width="1.5"/>
  <circle cx="443" cy="70" r="4" fill="#ff8844"/>
  <text x="443" y="57" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="10">SH0ES / Cepheids + Ia</text>
  <text x="443" y="47" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="12">73.0 ± 1.0</text>
  <text x="443" y="37" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Riess et al. + JWST 2024</text>

  <!-- Tension arrow -->
  <line x1="294" y1="120" x2="443" y2="120" stroke="#cc4444" stroke-width="1.5" stroke-dasharray="5,3"/>
  <polygon points="443,117 437,120 443,123" fill="#cc4444"/>
  <text x="368" y="112" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="10">discrepancy > 5 sigma</text>

  <!-- JWST note -->
  <text x="350" y="195" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">JWST (2024) confirmed SH0ES — did not close the gap with Planck</text>
  <text x="350" y="210" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">"Hubble tension" — open problem as of May 2026</text>
</svg>`,
        caption:
          'Two independent methods for measuring the Hubble constant diverge by more than five sigma. ' +
          'The JWST verification in 2024 confirmed the higher SH0ES value. The cause of the discrepancy remains unknown.',
      },
    },

    {
      heading: 'Why the Universe Is Larger Than Its Age in Light-Years',
      level: 2,
      paragraphs: [
        'Intuition suggests: if the universe is thirteen point eight billion years old, ' +
        'and nothing moves faster than light, then light could have covered at most ' +
        'thirteen point eight billion light-years in any direction over that time. ' +
        'So the diameter of the observable universe should not exceed twenty-seven point six billion light-years. ' +
        'But the actual diameter is ninety-three billion. What accounts for this?',

        'The answer: space itself is not subject to the speed of light. ' +
        'Relativity forbids matter and information from moving _through_ space faster than light. ' +
        'But it places no limit on how fast space itself can expand. ' +
        'As a photon traveled toward us, the space between it and us was continuously stretching. ' +
        'This violates nothing — the photon moves at the speed of light locally, relative to its immediate surroundings. ' +
        'But the distance from its origin to us has grown far beyond what simple geometry would suggest.',

        'To appreciate the scale: the photons we now observe as the Cosmic Microwave Background ' +
        'were released approximately three hundred and eighty thousand years after the Big Bang. ' +
        'At that moment, their source was roughly forty-two million light-years away from us. ' +
        'While those photons traveled toward us for thirteen point eight billion years, ' +
        'that region of space — along with everything in it — drifted to its current distance of ' +
        'forty-six billion light-years. That is where the number comes from.',
      ],
    },

    {
      image: {
        cacheKey: 'age-and-size-universe-expansion-diagram',
        prompt:
          'Scientific diagram for a science encyclopedia: spacetime diagram showing photon travel through expanding universe. ' +
          'Y axis labeled "time (billions of years)", X axis labeled "comoving distance". ' +
          'Horizontal line at bottom: Big Bang. Horizontal line at top: Today. ' +
          'Curved lines showing how galaxies move apart due to expansion (worldlines). ' +
          'Diagonal line showing photon path from CMB emission point curving toward observer. ' +
          'Annotations: "CMB emitted 380,000 yr", "photon travels 13.8 Gyr", "source now at 46 Gly". ' +
          'Hard sci-fi style, dark background #020510, cyan/orange accents, monospace labels. ' +
          'Aspect ratio 4:3.',
        alt:
          'Spacetime diagram: CMB photon travels toward us while space expands behind it.',
        caption:
          'While the photon traveled toward us for thirteen point eight billion years, ' +
          'its source moved to a distance of forty-six billion light-years. ' +
          'This is why the observable universe is larger than "age in light-years".',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Four Horizons: Which "Size" Are We Asking About',
      level: 2,
      paragraphs: [
        'When someone asks "how large is the universe," the correct answer depends ' +
        'on which horizon they have in mind. There are several, and each corresponds to its own physics.',

        '**The particle horizon** is the maximum distance from which any signal could have reached us ' +
        'in the entire age of the universe. This is what defines the observable universe: ' +
        'a sphere approximately forty-six billion light-years in radius. ' +
        'Beyond this boundary, matter exists — we simply cannot receive any information from it, ' +
        'because even the fastest possible signal has not had time to reach us.',

        '**The Hubble horizon**, or _Hubble sphere_, is the distance at which galaxies recede from us ' +
        'at exactly the speed of light due to expansion. This is not the boundary of the observable universe: ' +
        'we can see beyond it, because those regions were once closer and managed to send their light to us. ' +
        'The current Hubble horizon is approximately fourteen billion light-years. ' +
        'Because the expansion of the universe is accelerating, this horizon shrinks over time ' +
        'relative to the particle horizon.',

        '**The event horizon** is the farthest point from which we will ever receive any information, ' +
        'accounting for future expansion. Unlike the particle horizon, it looks forward in time. ' +
        'Because the expansion is accelerating, there are already galaxies from which ' +
        'no new signals will ever reach us — even if they are transmitting right now. ' +
        'The event horizon lies approximately sixteen billion light-years away.',

        '**The surface of last scattering** is not a horizon in the strict sense, ' +
        'but it is an important boundary. This is the region of space from which the Cosmic Microwave Background originates: ' +
        'a thin shell approximately forty-six billion light-years away (in present-day comoving distance), ' +
        'from which photons first streamed free three hundred and eighty thousand years after the Big Bang. ' +
        'We cannot see through it in the usual sense — the universe before that moment was opaque to photons.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Four Horizons of the Observable Universe',
        svg: `<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Cosmic Horizons (distances from our location)</text>

  <!-- Central observer dot -->
  <circle cx="60" cy="130" r="5" fill="#44ff88"/>
  <text x="60" y="148" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Us</text>

  <!-- Hubble sphere: ~14 Gly -->
  <line x1="236" y1="40" x2="236" y2="220" stroke="#4488aa" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="236" y="35" text-anchor="middle" fill="#4488aa" font-family="monospace" font-size="9">Hubble sphere</text>
  <text x="236" y="228" text-anchor="middle" fill="#4488aa" font-family="monospace" font-size="9">~14 Gly</text>

  <!-- Event horizon: ~16 Gly -->
  <line x1="263" y1="40" x2="263" y2="220" stroke="#ff8844" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="263" y="35" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8">Event horizon</text>
  <text x="263" y="238" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8">~16 Gly</text>

  <!-- Particle horizon: 46 Gly -->
  <line x1="640" y1="40" x2="640" y2="220" stroke="#44ff88" stroke-width="1.5"/>
  <text x="640" y="35" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Particle horizon</text>
  <text x="640" y="228" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">~46 Gly</text>

  <!-- CMB surface band near edge -->
  <rect x="620" y="50" width="20" height="160" fill="rgba(123,184,255,0.15)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="660" y="130" text-anchor="start" fill="#7bb8ff" font-family="monospace" font-size="8">CMB</text>
  <text x="660" y="141" text-anchor="start" fill="#7bb8ff" font-family="monospace" font-size="8">surface</text>

  <!-- Observable zone fill -->
  <rect x="60" y="50" width="580" height="160" fill="rgba(68,136,170,0.06)" stroke="none"/>
  <!-- Beyond horizon -->
  <rect x="640" y="50" width="60" height="160" fill="rgba(30,30,50,0.5)" stroke="none"/>
  <text x="660" y="100" text-anchor="start" fill="#667788" font-family="monospace" font-size="8">beyond</text>
  <text x="660" y="111" text-anchor="start" fill="#667788" font-family="monospace" font-size="8">horizon</text>

  <!-- Labels for zones -->
  <text x="150" y="130" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">well-known</text>
  <text x="150" y="141" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">zone</text>
  <text x="440" y="130" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">observable,</text>
  <text x="440" y="141" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="9">but distant</text>

  <!-- Horizontal axis -->
  <line x1="60" y1="220" x2="660" y2="220" stroke="#334455" stroke-width="1"/>
  <polygon points="662,218 656,220 662,222" fill="#aabbcc"/>
  <text x="350" y="250" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">distance (present-day comoving)</text>
</svg>`,
        caption:
          'Four horizons carry different physical meanings. ' +
          'The particle horizon defines the boundary of the observable universe — approximately forty-six billion light-years. ' +
          'Whatever lies beyond it exists, but is unreachable by any signal.',
      },
    },

    {
      heading: 'What Lies Beyond the Horizon',
      level: 2,
      paragraphs: [
        'The particle horizon is not a wall or the boundary of the universe itself. ' +
        'It is simply the limit of accessible information. Matter, galaxies, stars — ' +
        'all of these exist beyond the horizon. The only question is how far and in what condition.',

        'If the universe is infinite and homogeneous on large scales — as observations so far suggest — ' +
        'then beyond the horizon there are infinitely many more galaxies, stars, and possibly planets. ' +
        'Some theories of inflation predict that different regions beyond the horizon may have ' +
        'different initial conditions, different physical constants, or even different laws of nature. ' +
        'This is the concept of the _multiverse_ — elegant, but currently unverifiable in principle: ' +
        'no signal will ever arrive from there.',

        'There is also a more pragmatic perspective. Even within the observable universe, ' +
        'we have explored only a tiny fraction in detail. ' +
        'The most distant galaxies studied in any depth became accessible in the early part of this decade ' +
        'with the James Webb Space Telescope. ' +
        'We can now observe galaxies that existed less than five hundred million years after the Big Bang. ' +
        'Every step deeper into distance is a step further back in time.',
      ],
    },

    {
      image: {
        cacheKey: 'age-and-size-universe-observable-sphere',
        prompt:
          'Photorealistic illustration for a science encyclopedia: nested spheres representing cosmic horizons. ' +
          'Center: Milky Way galaxy. ' +
          'Inner glowing sphere (small): Hubble sphere, labeled "Hubble sphere 14 Gly". ' +
          'Middle sphere: event horizon, labeled "Event horizon 16 Gly". ' +
          'Large outermost sphere: particle horizon / observable universe, labeled "Observable universe 46 Gly radius". ' +
          'Beyond outermost sphere: dark, unlabeled void. ' +
          'Cosmic microwave background shown as faint glow on the outermost sphere surface. ' +
          'Hard sci-fi style, dark space background, blue and green gradient. ' +
          'Aspect ratio 16:9.',
        alt:
          'Concentric spheres of cosmic horizons: Hubble sphere, event horizon, particle horizon.',
        caption:
          'Three spheres — three different answers to "how large is the universe." ' +
          'The particle horizon, with a radius of forty-six billion light-years, is the largest.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Age of the Universe and Modern Precision',
      level: 2,
      paragraphs: [
        'Thirteen point eight billion years is not an approximate estimate — it is a precision measurement ' +
        'with an uncertainty below two percent. ' +
        'In the early part of the last century, estimates varied by factors: ' +
        'some astronomers placed the universe in the range of a few billion years, ' +
        'others argued for much older timescales. ' +
        'This uncertainty persisted until the late twentieth century, when the satellites ' +
        '_COBE_ and _WMAP_ began systematically mapping the Cosmic Microwave Background.',

        'The **Planck** mission results published in 2018 fixed the value at thirteen billion ' +
        'eight hundred and seventy million years, with a remarkably small uncertainty of about twenty million years. ' +
        'For comparison: the Solar System is approximately four point six billion years old. ' +
        'This means that from the Big Bang to the formation of our Sun, ' +
        'roughly nine billion years elapsed — enough time for three full generations of stars, ' +
        'each synthesizing heavy elements and ending its life in a supernova.',

        'This precision became possible because the Cosmic Microwave Background is a detailed snapshot ' +
        'of the universe\'s state at the moment of recombination. ' +
        'The angular sizes of acoustic peaks in the CMB power spectrum are sensitive to ' +
        'the geometry of space, the densities of ordinary and dark matter, ' +
        'the number of neutrino species, and the rate of expansion. ' +
        'By fitting the parameters of the cosmological model to the observed pattern, ' +
        'we recover all these quantities — including the age — with remarkable accuracy.',
      ],
    },

    {
      image: {
        cacheKey: 'age-and-size-universe-cosmic-timeline',
        prompt:
          'Scientific illustration for a science encyclopedia: cosmic timeline from Big Bang to today. ' +
          'Horizontal timeline from left (Big Bang, 0) to right (Today, 13.8 Gyr). ' +
          'Key milestones marked: Big Bang 0, Recombination 380,000 yr, First Stars 200 Myr, ' +
          'Milky Way forms 9 Gyr, Solar System forms 9.2 Gyr, Today 13.8 Gyr. ' +
          'Sun/Solar System indicated with small sun icon. ' +
          'Background: expanding cone shape behind the timeline. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Add the following text labels: "Big Bang", "CMB released", "First Stars", "Solar System", "Now 13.8 Gyr". ' +
          'Aspect ratio 16:9.',
        alt:
          'Cosmic timeline: from the Big Bang to the Solar System and the present day.',
        caption:
          'From the Big Bang to the formation of the Solar System, approximately nine billion years elapsed. ' +
          'Another four point six billion — and here we are.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Nucleochronology: A Clock Made of Stellar Ash',
      level: 2,
      paragraphs: [
        'One of the most elegant dating methods is nucleochronology — radioactive dating applied to stars. ' +
        'At the moment of a supernova explosion, heavy isotopes are forged — among them thorium-232 and uranium-238. ' +
        'These elements are dispersed into gas clouds and eventually incorporated into new stars. ' +
        'By measuring their ratio in the atmospheres of the oldest known stars — ' +
        'so-called Population II stars — and comparing it to the theoretically predicted initial ratio, ' +
        'astronomers can calculate how much time has elapsed since those ancient supernovae.',

        'This method is entirely independent of Cosmic Microwave Background measurements ' +
        'and yields ages in the range of twelve to fourteen billion years, ' +
        'which overlaps with the Planck estimate. ' +
        'That independence makes it especially valuable: even if the standard cosmological model ' +
        'turned out to be wrong in some fundamental way, old stars would remain old.',

        'The main limitation is the uncertainty in the initial isotope ratios, ' +
        'which depend on theoretical models of nucleosynthesis inside the supernova. ' +
        'Despite these uncertainties, the method confidently establishes that the universe is older than twelve billion years — ' +
        'and no star we know of is older than the universe, which would be a fundamental paradox.',
      ],
    },

    {
      image: {
        cacheKey: 'age-and-size-universe-nucleo',
        prompt:
          'Scientific illustration for a science encyclopedia: nucleochronology concept. ' +
          'Left panel: supernova explosion producing heavy isotopes thorium-232 and uranium-238, labeled. ' +
          'Center: gas cloud with isotopes mixing. ' +
          'Right panel: old metal-poor star spectrum showing absorption lines for thorium and uranium with decay ratio. ' +
          'Decay curve inset showing radioactive half-life comparison. ' +
          'Hard sci-fi style, dark space background, monospace labels. ' +
          'Aspect ratio 4:3.',
        alt:
          'Nucleochronology: from supernova to measuring isotopes in the oldest stars.',
        caption:
          'Thorium and uranium forged in supernovae slowly decay in the atmospheres of old stars. ' +
          'The measured ratio yields the age.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What Remains Open',
      level: 2,
      paragraphs: [
        'The age of thirteen point eight billion years and the observable universe diameter ' +
        'of ninety-three billion light-years are well-established figures, confirmed by multiple independent methods. ' +
        'But a number of questions remain genuinely open.',

        'The first and most fundamental: what is the _total_ size of the universe? ' +
        'We see a sphere forty-six billion light-years in radius. ' +
        'But is there more space beyond that? Is the universe infinite? ' +
        'If inflation occurred and stretched space by enormous factors before ordinary expansion began, ' +
        'the true universe could be vastly larger than what we observe — ' +
        'by factors that are effectively beyond imagination. ' +
        'Verifying this is impossible: no signal from beyond the horizon is accessible.',

        'The second: is the Hubble tension a sign of a systematic error in one of the methods, ' +
        'or a hint of new physics? If the universe truly expands somewhat faster than Planck suggests, ' +
        'it is somewhat younger and somewhat smaller than we thought. ' +
        'But even the highest Hubble constant estimate does not overturn the picture dramatically — ' +
        'the difference amounts to a few hundred million years, not an order of magnitude.',

        'The third open question is accelerating expansion. ' +
        'Toward the end of the last century, astronomers discovered that the expansion of the universe ' +
        'is not slowing down as one would expect from the gravitational pull of all its matter — ' +
        'it is speeding up. The driver of this acceleration is called _dark energy_, ' +
        'a component whose nature remains unknown. ' +
        'Dark energy determines the future: the event horizon will continue to shrink, ' +
        'galaxies beyond it will vanish from view, ' +
        'and trillions of years from now, our local universe will be a far lonelier place.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Particle horizon',
      definition:
        'The maximum distance from which any signal could have reached us in the entire age of the universe. It defines the boundary of the observable universe — approximately forty-six billion light-years in radius.',
    },
    {
      term: 'Hubble horizon (Hubble sphere)',
      definition:
        'The distance at which galaxies recede from us at exactly the speed of light due to the expansion of space. Currently approximately fourteen billion light-years. This is not the boundary of the observable universe.',
    },
    {
      term: 'Event horizon',
      definition:
        'The farthest point from which we will ever receive any information, accounting for future expansion. Because the expansion of the universe is accelerating, it lies approximately sixteen billion light-years away.',
    },
    {
      term: 'Hubble constant (H0)',
      definition:
        'The current rate of expansion of the universe, expressed in kilometers per second per megaparsec of distance. Measurements from the CMB yield approximately sixty-seven, while measurements from standard candles yield approximately seventy-three kilometers per second per megaparsec.',
    },
    {
      term: 'Hubble tension',
      definition:
        'A statistically significant discrepancy (more than five sigma) between values of the Hubble constant derived from the Cosmic Microwave Background and from observations of Cepheid variables and Type Ia supernovae. The cause remains unknown.',
    },
    {
      term: 'Nucleochronology',
      definition:
        'A method for determining the age of stars and the universe by measuring ratios of radioactive isotopes — particularly thorium-232 and uranium-238 — in the atmospheres of the oldest stars. Independent of cosmological models.',
    },
    {
      term: 'Surface of last scattering',
      definition:
        'The spherical shell in space from which the Cosmic Microwave Background originates: the region where photons first escaped freely three hundred and eighty thousand years after the Big Bang. Its present-day comoving distance is approximately forty-six billion light-years.',
    },
    {
      term: 'Dark energy',
      definition:
        'An unknown component constituting approximately seventy percent of the total energy content of the universe, responsible for its accelerating expansion. Its physical nature is one of the central unsolved problems in modern physics.',
    },
    {
      term: 'Globular cluster',
      definition:
        'A dense, spherically symmetric cluster of tens of thousands to one million stars that formed simultaneously. The oldest globular clusters are approximately twelve to thirteen billion years old and serve as a lower bound on the age of the universe.',
    },
  ],

  quiz: [
    {
      question: 'Why is the observable universe approximately ninety-three billion light-years in diameter if the universe is only thirteen point eight billion years old?',
      options: [
        'Because the measurements are imprecise and the true age is larger',
        'Because space has been expanding throughout, and the sources of distant photons are now much farther away',
        'Because light travels along curved paths and covers more distance than a straight line',
        'Because the universe began expanding at speeds greater than the speed of light',
      ],
      correctIndex: 1,
      explanation:
        'While a photon traveled toward us, the space between its source and us was expanding. ' +
        'Today, that source is far more distant than at the moment it emitted the light. ' +
        'This does not violate the speed-of-light limit: matter does not move through space faster than light, ' +
        'but space itself is not subject to that constraint.',
    },
    {
      question: 'What value did the Planck mission derive for the Hubble constant from CMB data in 2018?',
      options: [
        'Seventy-three kilometers per second per megaparsec',
        'Eighty-five kilometers per second per megaparsec',
        'Sixty-seven point four kilometers per second per megaparsec',
        'Fifty kilometers per second per megaparsec',
      ],
      correctIndex: 2,
      explanation:
        'The Planck mission returned a value of sixty-seven point four plus or minus zero point five ' +
        'kilometers per second per megaparsec. This conflicts with the SH0ES team value of seventy-three, ' +
        'which constitutes the Hubble tension.',
    },
    {
      question: 'Which horizon defines the size of the observable universe?',
      options: [
        'The event horizon',
        'The Hubble horizon',
        'The particle horizon',
        'The surface of last scattering',
      ],
      correctIndex: 2,
      explanation:
        'The particle horizon is the maximum distance from which any signal could have reached us ' +
        'in the entire age of the universe. It defines the boundary of the observable universe: ' +
        'approximately forty-six billion light-years in radius.',
    },
    {
      question: 'What is nucleochronology?',
      options: [
        'A method for measuring galaxy distances through redshift',
        'Analysis of acoustic peaks in the Cosmic Microwave Background',
        'Determining the age of stars through ratios of radioactive isotopes',
        'Comparing the colors of stars in globular clusters',
      ],
      correctIndex: 2,
      explanation:
        'Nucleochronology measures ratios of radioactive isotopes — in particular thorium-232 and uranium-238 — ' +
        'in the atmospheres of the oldest stars. Comparing the measured ratio to the theoretically predicted initial ratio ' +
        'allows astronomers to calculate the age of the star independently of cosmological models.',
    },
    {
      question: 'What does the Hubble tension imply for the estimated age of the universe?',
      options: [
        'The age of the universe cannot be determined due to irreconcilable data',
        'A higher Hubble constant gives a slightly younger universe — a difference of a few hundred million years',
        'The universe is actually less than nine billion years old',
        'The age depends only on the measurement method and has no physical meaning',
      ],
      correctIndex: 1,
      explanation:
        'A higher Hubble constant means faster expansion, which requires less time to reach the current state. ' +
        'The difference between SH0ES and Planck estimates translates to a few hundred million years — real, but not dramatic. ' +
        'Both estimates are consistent with the ages of the oldest known stars.',
    },
  ],

  sources: [
    {
      title: 'Planck Collaboration — Planck 2018 Results: Cosmological Parameters',
      url: 'https://arxiv.org/abs/1807.06209',
      meta: 'A&A 641, A6 (2020), arXiv:1807.06209 — age 13.787±0.020 Gyr',
    },
    {
      title: 'Riess A.G. et al. (SH0ES) — A Comprehensive Measurement of the Local Value of the Hubble Constant',
      url: 'https://arxiv.org/abs/2112.04510',
      meta: 'ApJL 934, L7 (2022), arXiv:2112.04510',
    },
    {
      title: 'Freedman W.L. et al. — The Carnegie-Chicago Hubble Program: Calibration of the Tip of the Red Giant Branch',
      url: 'https://arxiv.org/abs/1907.05922',
      meta: 'ApJ 882, 34 (2019), arXiv:1907.05922 — alternative H0=69.8',
    },
    {
      title: 'Breuval L. et al. (SH0ES/JWST) — Small Magellanic Cloud Cepheids in the JWST Era',
      url: 'https://arxiv.org/abs/2404.08731',
      meta: 'ApJ 2024, arXiv:2404.08731 — JWST confirmation of SH0ES',
    },
    {
      title: 'Krauss L.M., Chaboyer B. — Age Estimates of Globular Clusters in the Milky Way',
      url: 'https://arxiv.org/abs/astro-ph/0111376',
      meta: 'Science 299, 65 (2003) — globular cluster ages 12.6+3.4/-2.2 Gyr',
    },
    {
      title: 'Cayrel R. et al. — Measurement of stellar age from uranium decay',
      url: 'https://www.nature.com/articles/409691a',
      meta: 'Nature 409, 691 (2001) — nucleochronology, CS 31082-001',
    },
    {
      title: 'Lineweaver C.H. — The Age of the Universe',
      url: 'https://arxiv.org/abs/astro-ph/9911131',
      meta: 'Science 284, 1503 (1999) — review of age determination methods',
    },
    {
      title: 'Davis T.M., Lineweaver C.H. — Expanding Confusion: Common Misconceptions of Cosmological Horizons',
      url: 'https://arxiv.org/abs/astro-ph/0310808',
      meta: 'PASA 21, 97 (2004) — horizons, superluminal recession, size of the universe',
    },
    {
      title: 'Weinberg S. — Cosmology',
      url: 'https://global.oup.com/academic/product/cosmology-9780198526827',
      meta: 'Oxford University Press, 2008 — textbook cosmology (§14: age and distance)',
    },
    {
      title: 'Verde L., Treu T., Riess A.G. — Tensions between the Early and Late Universe',
      url: 'https://arxiv.org/abs/1907.10625',
      meta: 'Nature Astronomy 3, 891 (2019) — review of Hubble tension',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
