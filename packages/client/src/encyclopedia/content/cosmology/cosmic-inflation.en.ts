import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'cosmic-inflation',
  language: 'en',
  section: 'cosmology',
  order: 3,
  difficulty: 'advanced',
  readingTimeMin: 13,
  title: 'Cosmic Inflation',
  subtitle:
    'In the first trillionth of a trillionth of a second, the universe expanded by a factor of a trillion trillion trillion. Why physicists consider this the only reasonable explanation for what we observe.',

  hero: {
    cacheKey: 'cosmic-inflation-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: cosmic inflation — the exponential expansion of the universe in the first fraction of a second after the Big Bang. ' +
      'A tiny brilliant white-hot point at left exploding outward with enormous speed, surrounded by concentric shockwave rings stretching into deep dark space. ' +
      'The geometry transitions from a dense quantum foam texture near the center to smooth dark void at the edges, showing the smoothing effect of inflation. ' +
      'Hard sci-fi style, dark space background, cinematic 16:9 composition. ' +
      'Add the following text labels on the image: "t = 0", "10^-36 s: inflation begins", "10^-32 s: inflation ends", "size x 10^26". ' +
      'Aspect ratio 16:9.',
    alt:
      'Artistic reconstruction of cosmic inflation — the universe expanding by a factor of trillions in a fraction of a second.',
    caption:
      'Cosmic inflation: in an inconceivably short interval, the universe grew by a factor that defies ordinary intuition. ' +
      'Artistic reconstruction based on current inflationary models.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Imagine taking an atom and, in a span of time so brief that no existing clock could measure it, ' +
        'stretching it to the size of the entire observable universe. ' +
        'This is not poetic hyperbole. ' +
        'It is a literal description of what most cosmologists believe happened to our universe ' +
        'in the first instants after the Big Bang. ' +
        'The mechanism is called **cosmic inflation** — and it remains one of the boldest, ' +
        'best-supported, and yet least directly proven ideas in all of physics.',

        'To understand why this idea arose at all, one must first see what facts about the universe ' +
        'turned out to be inexplicable without it. ' +
        'Three classical problems — the _horizon problem_, the _flatness problem_, and the _monopole problem_ — ' +
        'were so uncomfortable for standard cosmology ' +
        'that physicists were forced to search for a radical solution. ' +
        'Inflation solved all three at once.',
      ],
    },

    {
      heading: 'Three Problems That Demanded an Answer',
      level: 2,
      paragraphs: [
        'The first is the **horizon problem**. The Cosmic Microwave Background, ' +
        'which fills the entire universe with radiation left over from the era of recombination, ' +
        'looks identical from every direction in the sky to within one hundred-thousandth of a percent. ' +
        'Yet if you run time backward and calculate which regions of the early universe ' +
        'could have exchanged heat before recombination, ' +
        'most of the regions we observe were never in causal contact with each other. ' +
        'They lay beyond each other\'s horizons — meaning no signal, ' +
        'even traveling at the speed of light from the very beginning, ' +
        'could have passed between them. ' +
        'Yet their temperatures match. Without some mechanism that established uniformity before the expansion, ' +
        'this is physically impossible.',

        'The second is the **flatness problem**. The geometry of our universe has been measured with extraordinary precision: ' +
        'it is flat. The density parameter that physicists denote by omega equals one to within less than one percent. ' +
        'The problem is that the equations of general relativity are unstable with respect to this value: ' +
        'even the tiniest deviation from flatness in the early universe would have grown over time ' +
        'and long ago led either to gravitational recollapse or to runaway expansion. ' +
        'For the universe to look as flat as it does today, ' +
        'it had to be flat in its earliest moments to an absurd precision — ' +
        'roughly equivalent to hitting a coin from ten kilometers away. ' +
        'This is not an explanation; it is merely a displacement of the mystery to an earlier time.',

        'The third is the **monopole problem**. Grand unified theories — ' +
        'which describe the behavior of fundamental forces at the extreme temperatures of the early universe — ' +
        'unambiguously predict the formation of massive particles called _magnetic monopoles_ ' +
        'during the phase transition from the unified state to the broken-symmetry state we observe today. ' +
        'There should be so many of them that they would constitute the majority of the universe\'s mass. ' +
        'Yet no magnetic monopole has ever been detected by any experiment. ' +
        'The theory exists. The prediction exists. The particles do not.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-inflation-horizon-problem',
        prompt:
          'Scientific diagram for a science encyclopedia: the horizon problem in cosmology. ' +
          'Two diagrams side by side. Left: "Without inflation" — two distant regions of the CMB sky (left edge and right edge) shown with their past light cones that do not overlap at the time of recombination, demonstrating they were never in causal contact. ' +
          'Right: "With inflation" — same two regions shown with a much earlier moment of causal contact before inflation stretched them apart. ' +
          'Dark background, monospace labels, Game Bible palette colors (cyan for light cones, orange for inflation epoch, green for recombination surface). ' +
          'Add the following text labels on the image: "no causal contact", "recombination", "inflation stretches regions apart", "shared origin before inflation". ' +
          'Aspect ratio 4:3.',
        alt:
          'Horizon problem diagram: without inflation versus with inflation — causal contact between sky regions.',
        caption:
          'The horizon problem: two opposite edges of the CMB sky could never have exchanged signals in the standard model. ' +
          'Inflation explains their identical temperature: both emerged from a single tiny causally connected region before expansion began.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Guth\'s Idea: A Field as a Compressed Spring',
      level: 2,
      paragraphs: [
        'In the early 1980s, American physicist **Alan Guth** proposed a solution ' +
        'that he initially described as a "spectacular realization" followed immediately by a "disastrous problem" — ' +
        'not because the theory failed, but because he suspected it solved some problems ' +
        'while creating a new one. He was right on the second count, ' +
        'but the solution explained all three problems so cleanly ' +
        'that the community took it seriously.',

        'The idea: immediately after the Big Bang, the universe was permeated by a special scalar field — ' +
        'the so-called **inflaton field**. ' +
        'This hypothetical field is analogous to the potential energy of a spring compressed to its extreme: ' +
        'it occupied a high-energy state that was not the true equilibrium. ' +
        'Physicists call this a "false vacuum." ' +
        'In general relativity, a field with high vacuum energy acts as a _negative pressure_ — ' +
        'it literally repels space from itself. ' +
        'This is the driving force of inflation: matter is not flying apart; ' +
        'space itself is stretching at a rate that exceeds the speed of light — ' +
        'which does not violate relativity, because the limit applies to motion through space, ' +
        'not to the expansion of space itself.',

        'While the inflaton field slowly "rolls" downhill toward its true vacuum state, ' +
        'the universe expands at a catastrophically rapid rate — ' +
        'by a factor of at least ten to the power of twenty-six ' +
        'in a time shorter than one trillionth of a trillionth of a trillionth of a second. ' +
        'When the field finally reaches the bottom of its potential, inflation ends. ' +
        'The field\'s energy converts to heat — the universe "reheats," ' +
        'and the standard hot Big Bang era begins.',
      ],
    },

    {
      heading: 'Slow-Roll and the Parameters of Inflation',
      level: 2,
      paragraphs: [
        'Most modern inflationary models are described through conditions called the _slow-roll approximation_. ' +
        'The key requirement is that the potential "hill" of the inflaton field must be sufficiently shallow — ' +
        'the field rolls slowly, and inflation lasts long enough. ' +
        'This duration is measured in units called _e-foldings_: ' +
        'one e-folding means the universe grows by a factor of Euler\'s number (approximately 2.718). ' +
        'Solving the horizon and flatness problems requires at least sixty e-foldings — ' +
        'meaning the universe grows by a factor of "e to the power of sixty." ' +
        'This is far larger than ten to the power of twenty-six.',

        'The slow-roll parameters are two numbers characterizing the slope and curvature ' +
        'of the inflaton potential. If both are sufficiently small, inflation occurs ' +
        'and delivers the required number of e-foldings. ' +
        'Different models propose different potential shapes — ' +
        'power-law, natural, chaotic, Starobinsky (which adds a quadratic curvature term to the action). ' +
        'Observational data from the Planck mission has already excluded many simple models ' +
        'and kept alive only those predicting a sufficiently shallow potential.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Size of the Universe — Logarithmic Time Scale',
        svg: `<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="280" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Size of the Universe vs Time (logarithmic scale)</text>

  <!-- Axes -->
  <line x1="60" y1="230" x2="660" y2="230" stroke="#334455" stroke-width="1"/>
  <line x1="60" y1="230" x2="60" y2="40" stroke="#334455" stroke-width="1"/>

  <!-- Axis labels -->
  <text x="350" y="258" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">Time (log scale) →</text>
  <text x="18" y="140" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10" transform="rotate(-90 18 140)">Size (log scale) →</text>

  <!-- Without inflation line (slow expansion) -->
  <polyline points="60,220 180,210 300,200 420,190 540,175 660,160"
    fill="none" stroke="#334455" stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="530" y="155" fill="#667788" font-family="monospace" font-size="9">without inflation</text>

  <!-- Inflation epoch (shaded region) -->
  <rect x="60" y="50" width="120" height="180" fill="rgba(255,136,68,0.08)" stroke="none"/>
  <text x="120" y="43" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">Inflation</text>
  <text x="120" y="248" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="9">10⁻³⁶ — 10⁻³² s</text>

  <!-- With inflation line: flat then steep then resumes -->
  <polyline points="60,220 80,218 100,200 110,160 120,100 130,68 145,60 180,62 300,72 420,90 540,112 660,135"
    fill="none" stroke="#ff8844" stroke-width="2"/>
  <text x="380" y="80" fill="#ff8844" font-family="monospace" font-size="9">with inflation</text>

  <!-- Reheating marker -->
  <line x1="145" y1="40" x2="145" y2="230" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="148" y="55" fill="#7bb8ff" font-family="monospace" font-size="9">Reheating</text>
  <text x="148" y="66" fill="#7bb8ff" font-family="monospace" font-size="9">(inflation ends)</text>

  <!-- CMB marker -->
  <line x1="390" y1="40" x2="390" y2="230" stroke="#44ff88" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="393" y="55" fill="#44ff88" font-family="monospace" font-size="9">Recombination</text>
  <text x="393" y="66" fill="#44ff88" font-family="monospace" font-size="9">380 kyr</text>

  <!-- Today marker -->
  <line x1="660" y1="40" x2="660" y2="230" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="620" y="55" fill="#aabbcc" font-family="monospace" font-size="9">Today</text>
  <text x="620" y="66" fill="#aabbcc" font-family="monospace" font-size="9">13.8 Gyr</text>

  <!-- E-foldings annotation -->
  <line x1="63" y1="220" x2="63" y2="60" stroke="#ff8844" stroke-width="1"/>
  <text x="35" y="145" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8" transform="rotate(-90 35 145)">≥ 60 e-foldings</text>
</svg>`,
        caption:
          'Size of the universe on a logarithmic scale of time and space. ' +
          'Without inflation (dashed): slow, gradual growth. ' +
          'With inflation (solid): a near-vertical jump during the inflationary epoch, ' +
          'followed by standard thermal expansion.',
      },
    },

    {
      heading: 'Quantum Fluctuations as the Seeds of Structure',
      level: 2,
      paragraphs: [
        'One of the most beautiful consequences of inflation — and simultaneously one of its most testable. ' +
        'During inflation, the inflaton field is not perfectly smooth: ' +
        'quantum mechanics guarantees that any field contains microscopic fluctuations — ' +
        'tiny excitation waves smaller than subatomic scales. ' +
        'Under ordinary circumstances these fluctuations vanish without a trace. ' +
        'But during inflation, the universe expands so rapidly ' +
        'that quantum fluctuations are literally stretched to macroscopic scales ' +
        'before they can decay — and they "freeze" as classical perturbations in the density of space.',

        'These perturbations became the _seeds_ of all large-scale structure in the universe. ' +
        'A slightly denser patch attracted more matter, ' +
        'gradually becoming a proto-galaxy, then a galaxy, ' +
        'then a cluster of galaxies and a filament of the cosmic web. ' +
        'Everything we see around us — from stars to superclusters — ' +
        'can be traced back to quantum fluctuations smaller than an atomic nucleus, ' +
        'stretched to cosmic proportions by inflation.',

        'Inflation predicts a specific _shape_ for these fluctuations: ' +
        'they should be nearly scale-invariant — ' +
        'meaning they carry approximately equal amplitude across all spatial scales. ' +
        'This is described by the _spectral index_ n_s, ' +
        'where a value of exactly one would correspond to perfect scale invariance. ' +
        'Inflationary models predict n_s slightly below one — approximately 0.96. ' +
        'The Planck mission\'s final 2018 release measured n_s equal to 0.9649 plus or minus 0.0042. ' +
        'A precise match — and one of the most striking confirmations of inflationary theory.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-inflation-quantum-seeds',
        prompt:
          'Scientific illustration for a science encyclopedia: quantum fluctuations stretched to cosmic scales by inflation. ' +
          'Left panel shows a tiny quantum foam with random microscopic ripples labeled "quantum fluctuations". ' +
          'Right panel shows the same fluctuations expanded to galactic scales, becoming the seeds of galaxy clusters and cosmic web filaments. ' +
          'Center: an arrow labeled "inflation stretches 10^26x". ' +
          'Hard sci-fi style, dark space background, cyan and orange palette. ' +
          'Add the following text labels on the image: "quantum scale < 10^-35 m", "inflation stretches 10^26x", "galaxy cluster seeds ~100 Mpc". ' +
          'Aspect ratio 16:9.',
        alt:
          'Quantum fluctuations stretched by inflation to galactic scales — seeds of large-scale structure.',
        caption:
          'Quantum fluctuations of the inflaton field, stretched by inflation to macroscopic scales. ' +
          'They became the primordial density perturbations from which all cosmic structure grew.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Predictions: Gravitational Waves and B-Modes',
      level: 2,
      paragraphs: [
        'Inflation predicts not only scalar density fluctuations ' +
        'but also tensor perturbations — primordial _gravitational waves_ ' +
        'generated by quantum fluctuations of the space-time metric during inflation. ' +
        'These waves would have left an imprint on the polarization of the Cosmic Microwave Background — ' +
        'a distinctive curling pattern that physicists call the _B-mode_ polarization. ' +
        'Detecting B-modes from primordial gravitational waves would be a direct fingerprint of inflation.',

        'In 2014, the **BICEP2** collaboration announced a detection: ' +
        'they had observed B-modes at an amplitude exceeding the threshold. ' +
        'The news swept across the scientific world. ' +
        'But within the following year, a joint analysis of BICEP2 and Planck satellite data revealed ' +
        'that the signal was explained not by primordial gravitational waves ' +
        'but by polarized dust in our own Galaxy, ' +
        'which mimics the expected pattern. The claimed detection was retracted.',

        'The search continues. The **BICEP/Keck** collaboration published updated constraints in 2021: ' +
        'the tensor-to-scalar ratio — the parameter r — ' +
        'is less than 0.036. This limit has already eliminated some simple inflationary models ' +
        'with a quadratic potential. Future experiments — CMB-S4, LiteBIRD — ' +
        'aim to reach sensitivity down to r less than 0.001 and either detect inflationary B-modes ' +
        'or rule out most known models.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-inflation-bicep-bmodes',
        prompt:
          'Scientific illustration for a science encyclopedia: B-mode polarization of the CMB and primordial gravitational waves. ' +
          'Left: a map of the southern sky showing the CMB in false color with polarization vectors overlaid as small arrows showing a curl pattern (B-modes). ' +
          'Right: a cross-section diagram showing gravitational waves propagating through the primordial plasma, inducing the polarization pattern. ' +
          'Hard sci-fi style, dark background, cyan and orange palette, monospace labels. ' +
          'Add the following text labels on the image: "B-mode polarization", "primordial gravitational waves", "BICEP/Keck array", "r < 0.036 (2021)". ' +
          'Aspect ratio 16:9.',
        alt:
          'B-mode polarization of the CMB — the imprint primordial gravitational waves from inflation would leave.',
        caption:
          'B-mode CMB polarization — the distinctive curl pattern that primordial gravitational waves should imprint. ' +
          'BICEP/Keck has not yet detected it above the noise floor. The search is ongoing.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Gaussianity and Scale Invariance: Planck Confirms',
      level: 2,
      paragraphs: [
        'Beyond the spectral index, inflation in its simplest forms predicts ' +
        'that fluctuations should be _Gaussian_ — statistically symmetric, ' +
        'without significant non-normalities or cross-scale correlations. ' +
        'Deviations from Gaussianity — so-called _primordial non-Gaussianity_ — ' +
        'would signal non-standard inflationary mechanisms or alternative theories.',

        'The Planck mission tested Gaussianity with unprecedented precision. ' +
        'The final 2018 release found: primordial non-Gaussianity is not detected. ' +
        'The simplest single-field slow-roll inflationary models pass this test. ' +
        'More complex models with multiple fields or non-standard kinetic terms ' +
        'are either already excluded or approaching the exclusion boundary.',

        'The combined picture from Planck 2018: n_s equal to 0.9649, ' +
        'tensor-to-scalar ratio below 0.056, Gaussianity confirmed. ' +
        'A simple single-field slow-roll model with a shallow potential — ' +
        'such as the Starobinsky model — passes every test. ' +
        'This does not prove inflation, but it sharply narrows the space of viable models.',
      ],
    },

    {
      heading: 'Alternatives and Their Status',
      level: 2,
      paragraphs: [
        'Inflation dominates the field — but not every physicist is satisfied. ' +
        'Several alternatives have been developed in parallel and are not yet dead.',

        '**The cyclic universe and ekpyrotic model**: proposed by Paul Steinhardt and Neil Turok, ' +
        'these ideas treat our universe as the result of colliding branes in a higher-dimensional space, ' +
        'repeating in cycles. Uniformity and flatness are explained not by rapid expansion ' +
        'but by gradual processes over an immense period before the collision. ' +
        'The difficulty: these models are hard to test observationally ' +
        'and face their own challenges in generating fluctuations of the correct form.',

        '**Varying speed of light**: the idea that in the early universe the speed of light was much higher, ' +
        'allowing different regions to exchange information and equalize temperatures. ' +
        'The theory exists in several variants and is partially testable through subtle effects in the CMB. ' +
        'Most observational tests have not found the expected deviations.',

        'Inflation wins not because all competitors are formally excluded, ' +
        'but because it delivers specific quantitative predictions — n_s, r, Gaussianity — ' +
        'that can be tested with existing instruments, and those predictions hold. ' +
        'Alternatives are either too flexible to falsify, or do not produce equally precise numbers.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Horizon Problem — Geometry of Causal Contact',
        svg: `<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Horizon Problem: causal contact before and after inflation</text>

  <!-- LEFT PANEL: Without inflation -->
  <rect x="20" y="35" width="310" height="200" rx="3" fill="rgba(10,15,25,0.3)" stroke="#334455" stroke-width="1"/>
  <text x="175" y="52" text-anchor="middle" fill="#667788" font-family="monospace" font-size="10">WITHOUT inflation</text>

  <!-- Time axis left -->
  <line x1="175" y1="215" x2="175" y2="65" stroke="#334455" stroke-width="1"/>
  <text x="175" y="232" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">t = 0 (Big Bang)</text>

  <!-- Light cones A and B without inflation - they don't meet -->
  <line x1="80" y1="215" x2="175" y2="65" stroke="#4488aa" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="80" y1="215" x2="30" y2="65" stroke="#4488aa" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="60" y="80" fill="#4488aa" font-family="monospace" font-size="8">Region A</text>

  <line x1="270" y1="215" x2="175" y2="65" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="270" y1="215" x2="315" y2="65" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="275" y="80" fill="#cc4444" font-family="monospace" font-size="8">Region B</text>

  <!-- No overlap label -->
  <text x="175" y="145" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">No overlap</text>
  <text x="175" y="158" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">→ identical T unexplained</text>

  <!-- Recombination line -->
  <line x1="30" y1="180" x2="315" y2="180" stroke="#44ff88" stroke-width="1" stroke-dasharray="2,3"/>
  <text x="32" y="176" fill="#44ff88" font-family="monospace" font-size="8">recombination</text>

  <!-- RIGHT PANEL: With inflation -->
  <rect x="370" y="35" width="310" height="200" rx="3" fill="rgba(10,15,25,0.3)" stroke="#334455" stroke-width="1"/>
  <text x="525" y="52" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="10">WITH inflation</text>

  <!-- Time axis right -->
  <line x1="525" y1="215" x2="525" y2="65" stroke="#334455" stroke-width="1"/>
  <text x="525" y="232" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">t = 0 (Big Bang)</text>

  <!-- Pre-inflation common region -->
  <ellipse cx="525" cy="200" rx="40" ry="12" fill="rgba(255,136,68,0.25)" stroke="#ff8844" stroke-width="1"/>
  <text x="525" y="204" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="8">shared origin</text>

  <!-- Inflation stretches -->
  <line x1="490" y1="200" x2="430" y2="140" stroke="#ff8844" stroke-width="1.5"/>
  <line x1="560" y1="200" x2="620" y2="140" stroke="#ff8844" stroke-width="1.5"/>
  <text x="430" y="132" fill="#ff8844" font-family="monospace" font-size="8">inflation</text>
  <text x="580" y="132" fill="#ff8844" font-family="monospace" font-size="8">stretches</text>

  <!-- Regions now far apart -->
  <line x1="430" y1="140" x2="390" y2="70" stroke="#4488aa" stroke-width="1" stroke-dasharray="4,3"/>
  <line x1="620" y1="140" x2="660" y2="70" stroke="#cc4444" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="395" y="65" fill="#4488aa" font-family="monospace" font-size="8">A</text>
  <text x="655" y="65" fill="#cc4444" font-family="monospace" font-size="8">B</text>

  <!-- Same T label -->
  <text x="525" y="100" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">Identical T</text>
  <text x="525" y="113" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">→ shared causal origin</text>
</svg>`,
        caption:
          'Geometry of the horizon problem. Left: without inflation, the past light cones of two opposite CMB points ' +
          'do not intersect near t = 0 — they were never in contact. ' +
          'Right: with inflation, both regions emerged from a single tiny shared area before expansion began.',
      },
    },

    {
      heading: 'Eternal Inflation and the Multiverse',
      level: 2,
      paragraphs: [
        'One of the unexpected consequences of many inflationary models is so-called _eternal inflation_. ' +
        'If the fluctuations of the inflaton field are large enough, some regions of space ' +
        'continue inflating forever — even as other regions have already completed inflation ' +
        'and entered the hot phase. ' +
        'The result is an endless proliferation of "pocket universes" — ' +
        'separate domains, each becoming its own universe with its own physical constants. ' +
        'This is one of the theoretical pathways to the **multiverse**.',

        'The multiverse from eternal inflation is not science fiction, ' +
        'but it is not a firmly established fact either. ' +
        'The problem is that other "pockets" lie beyond the causal horizon ' +
        'and are fundamentally unobservable. ' +
        'Some cosmologists regard this as a sign that the theory has moved outside the domain of science. ' +
        'Others argue that this consequence simply must be accepted as a logical implication ' +
        'of a well-confirmed theory. ' +
        'This debate remains open.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-inflation-eternal-multiverse',
        prompt:
          'Photorealistic illustration for a science encyclopedia: eternal inflation and the multiverse. ' +
          'A vast dark cosmic sea with dozens of distinct glowing bubble universes of different colors and sizes floating in it. ' +
          'Each bubble is a self-contained universe formed when inflation ended locally. ' +
          'Between the bubbles, an ongoing inflationary background continues forever. ' +
          'Hard sci-fi style, deep space background, no faces visible. ' +
          'Add the following text labels on the image: "pocket universe", "inflation continues", "our observable universe", "bubble nucleation". ' +
          'Aspect ratio 16:9.',
        alt:
          'Eternal inflation generates countless pocket universes — each with its own physical constants.',
        caption:
          'The concept of eternal inflation: a portion of space remains forever in the inflationary phase, ' +
          'continuously generating new "pocket universes." ' +
          'Our universe is one such pocket.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'What Remains Unresolved',
      level: 2,
      paragraphs: [
        'Inflation has outcompeted its rivals and is confirmed indirectly, ' +
        'but three questions remain open.',

        '**What is the inflaton?** We do not know which physical field drives inflation. ' +
        'Is it a new fundamental field? ' +
        'A modification of gravity, as in the Starobinsky model? ' +
        'The Higgs field under specific conditions? ' +
        'Each answer leads to different predictions, some of which are already excluded. ' +
        'A direct detection of gravitational waves from inflation could distinguish between models.',

        '**How exactly did inflation end?** The process of reheating — ' +
        'the transfer of the inflaton field\'s energy into thermal matter and radiation — ' +
        'is still poorly understood in detail. ' +
        'Different reheating mechanisms lead to different observational signatures. ' +
        'Future high-resolution CMB maps should help discriminate between them.',

        '**Are the initial conditions natural?** Some physicists — including Steinhardt — ' +
        'argue that starting inflation requires its own extraordinarily fine-tuned initial conditions, ' +
        'and that it merely relocates the flatness problem to an earlier moment without solving it fundamentally. ' +
        'Most respond that a natural measure on the space of initial conditions ' +
        'favors scenarios that lead to inflation. The argument is unresolved.',
      ],
    },

    {
      image: {
        cacheKey: 'cosmic-inflation-inflaton-potential',
        prompt:
          'Scientific diagram for a science encyclopedia: the inflaton field potential energy curve. ' +
          'A smooth nearly flat valley potential curve — the "slow-roll" potential — on a dark background. ' +
          'The Y axis shows potential energy V(phi), X axis shows the field value phi. ' +
          'A ball shown rolling slowly down the nearly flat slope (inflation phase) then rapidly falling to the minimum (reheating). ' +
          'Key points labeled: "false vacuum (slow roll = inflation)", "reheating (inflation ends)", "true vacuum". ' +
          'Hard sci-fi style, orange and cyan accents, monospace font. ' +
          'Add the following text labels on the image: "V(phi)", "phi", "slow roll inflation", "reheating", "true vacuum". ' +
          'Aspect ratio 4:3.',
        alt:
          'Inflaton field potential — shallow slope (inflation) and steep drop to minimum (reheating).',
        caption:
          'The potential energy of the inflaton field as a function of field value. ' +
          'While the field rolls slowly along the shallow slope, inflation proceeds. ' +
          'The rapid descent to the minimum corresponds to reheating — the end of inflation and the restoration of the thermal era.',
        aspectRatio: '4:3',
      },
    },
  ],

  glossary: [
    {
      term: 'Cosmic inflation',
      definition:
        'A hypothetical phase of ultra-rapid accelerated expansion of the universe in the first fractions of a second after the Big Bang, growing its size by a factor of at least ten to the power of twenty-six.',
    },
    {
      term: 'Inflaton field',
      definition:
        'A hypothetical scalar field that, in a high-energy false-vacuum state, acted as the antigravitational engine of inflation. The specific physical identity of this field is unknown.',
    },
    {
      term: 'E-folding',
      definition:
        'A unit of expansion scale during inflation: one e-folding corresponds to growth by a factor of Euler\'s number (approximately 2.718). Solving the horizon and flatness problems requires at least sixty e-foldings.',
    },
    {
      term: 'Slow-roll',
      definition:
        'The regime in which the inflaton field moves slowly toward its potential minimum, sustaining prolonged inflation. Characterized by two small parameters describing the slope and curvature of the potential.',
    },
    {
      term: 'Spectral index (n_s)',
      definition:
        'A parameter describing the scale dependence of primordial density fluctuations. A value of exactly one corresponds to perfect scale invariance; inflation predicts n_s slightly below one. Planck 2018 measured 0.9649.',
    },
    {
      term: 'B-mode polarization',
      definition:
        'A distinctive curling pattern of CMB polarization that primordial gravitational waves from inflation would imprint. Not yet detected above the noise threshold.',
    },
    {
      term: 'Horizon problem',
      definition:
        'The paradox of uniform CMB temperature: regions of the sky that lay beyond each other\'s causal horizon at recombination share the same temperature — impossible without a mechanism such as inflation.',
    },
    {
      term: 'Flatness problem',
      definition:
        'The paradoxical geometric flatness of the universe: the density parameter omega equals one to within less than one percent, requiring extraordinarily fine-tuned initial conditions in the absence of inflation.',
    },
    {
      term: 'Eternal inflation',
      definition:
        'A regime in which quantum fluctuations of the inflaton field sustain inflation in different regions of space indefinitely, generating a potentially infinite ensemble of "pocket universes" with different physical constants.',
    },
    {
      term: 'Reheating',
      definition:
        'The process by which the energy of the inflaton field converts into thermal radiation and particles after inflation ends, restoring the hot Big Bang epoch.',
    },
  ],

  quiz: [
    {
      question: 'Which of the three classical cosmological problems does inflation NOT solve?',
      options: [
        'The horizon problem',
        'The flatness problem',
        'The absence of magnetic monopoles',
        'The baryonic asymmetry of the universe',
      ],
      correctIndex: 3,
      explanation:
        'Inflation successfully addresses the horizon, flatness, and monopole problems. ' +
        'Baryonic asymmetry — why there is more matter than antimatter — ' +
        'is a separate problem unrelated to the inflationary mechanism. ' +
        'Explaining it requires a baryogenesis mechanism.',
    },
    {
      question:
        'What value did the Planck mission measure for the spectral index n_s of primordial fluctuations in 2018?',
      options: [
        'Exactly 1.0 — perfect scale invariance',
        'Approximately 0.965 — slightly below one',
        'Approximately 1.035 — slightly above one',
        'Below 0.9 — a strong "blue tilt"',
      ],
      correctIndex: 1,
      explanation:
        'Planck 2018 measured n_s equal to 0.9649 plus or minus 0.0042 — ' +
        'slightly below one, precisely matching the predictions of simple slow-roll inflationary models. ' +
        'This is one of the key observational confirmations of the theory.',
    },
    {
      question: 'Why did the BICEP2 false alarm of 2014 not constitute a real detection of B-modes?',
      options: [
        'The instrument had a technical malfunction',
        'The signal was explained by polarized dust in our Galaxy, not primordial gravitational waves',
        'The data implied n_s greater than one, contradicting inflation',
        'The signal came from only one direction of the sky',
      ],
      correctIndex: 1,
      explanation:
        'A joint analysis by BICEP2 and Planck in 2015 showed that the signal was entirely explained ' +
        'by polarized interstellar dust in the Milky Way, ' +
        'which at those wavelengths produces a pattern indistinguishable from B-modes without Planck data. ' +
        'The detection claim was retracted.',
    },
    {
      question: 'What is "reheating" in the context of inflation?',
      options: [
        'The first heating of the universe by nuclear reactions during nucleosynthesis',
        'The conversion of the inflaton field\'s energy into thermal matter and radiation after inflation ends',
        'The heating of neutron star surfaces by accreting matter',
        'The end of the Dark Ages when the first stars formed',
      ],
      correctIndex: 1,
      explanation:
        'When the inflaton field reaches the minimum of its potential and inflation ends, ' +
        'the potential energy stored in it converts into thermal particles and radiation. ' +
        'The universe rapidly "reheats" — and the standard hot Big Bang epoch is restored.',
    },
    {
      question: 'What physical mechanism explains why quantum fluctuations during inflation became macroscopic?',
      options: [
        'Quantum entanglement across large distances',
        'The expansion of space during inflation stretched microscopic fluctuations to galactic scales',
        'Thermal diffusion of fluctuations through the plasma',
        'Gravitational amplification of fluctuations by massive particles',
      ],
      correctIndex: 1,
      explanation:
        'During inflation, space expands so rapidly ' +
        'that quantum fluctuations of the field at subatomic scales are stretched ' +
        'to sizes exceeding the Hubble horizon before they can decay. ' +
        'They "freeze" as classical perturbations — and become the seeds of galaxies.',
    },
  ],

  sources: [
    {
      title: 'Guth A.H. — Inflationary Universe: A Possible Solution to the Horizon and Flatness Problems',
      url: 'https://ui.adsabs.harvard.edu/abs/1981PhRvD..23..347G',
      meta: 'Phys. Rev. D 23, 347 (1981) — Guth\'s original inflation paper',
    },
    {
      title: 'Linde A.D. — A New Inflationary Universe Scenario',
      url: 'https://ui.adsabs.harvard.edu/abs/1982PhLB..108..389L',
      meta: 'Phys. Lett. B 108, 389 (1982) — Linde\'s chaotic inflation',
    },
    {
      title: 'Starobinsky A.A. — A New Type of Isotropic Cosmological Models Without Singularity',
      url: 'https://ui.adsabs.harvard.edu/abs/1980PhLB...91...99S',
      meta: 'Phys. Lett. B 91, 99 (1980) — the Starobinsky R+R² model',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results X: Constraints on Inflation',
      url: 'https://arxiv.org/abs/1807.06211',
      meta: 'A&A 641, A10 (2020), arXiv:1807.06211 — key inflationary model constraints',
    },
    {
      title: 'BICEP2 Collaboration — Detection of B-Mode Polarization at Degree Angular Scales',
      url: 'https://arxiv.org/abs/1403.3985',
      meta: 'PRL 112, 241101 (2014), arXiv:1403.3985 — the 2014 false alarm',
    },
    {
      title: 'BICEP/Keck Collaboration — BK18: Improved Constraints on Primordial Gravitational Waves',
      url: 'https://arxiv.org/abs/2110.00483',
      meta: 'PRL 127, 151301 (2021), arXiv:2110.00483 — r < 0.036',
    },
    {
      title: 'Planck Collaboration + BICEP2/Keck — Joint Analysis of B-modes and Implications for Inflation',
      url: 'https://arxiv.org/abs/1502.00612',
      meta: 'PRL 114, 101301 (2015) — retraction of the original BICEP2 claim',
    },
    {
      title: 'Mukhanov V.F., Chibisov G.V. — Quantum Fluctuations and a Nonsingular Universe',
      url: 'https://ui.adsabs.harvard.edu/abs/1981JETPL..33..532M',
      meta: 'JETP Lett. 33, 532 (1981) — first calculation of quantum fluctuations during inflation',
    },
    {
      title: 'Steinhardt P.J., Turok N. — A Cyclic Universe',
      url: 'https://arxiv.org/abs/hep-th/0111030',
      meta: 'Science 296, 1436 (2002), arXiv:hep-th/0111030 — cyclic alternative to inflation',
    },
    {
      title: 'Baumann D. — TASI Lectures on Inflation',
      url: 'https://arxiv.org/abs/0907.5424',
      meta: 'arXiv:0907.5424 (2009) — the best pedagogical review of inflationary theory',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
