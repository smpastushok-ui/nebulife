import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'multiverse-hypotheses',
  language: 'en',
  section: 'cosmology',
  order: 8,
  difficulty: 'advanced',
  readingTimeMin: 12,
  title: 'Multiverse Hypotheses',
  subtitle:
    'Why physics admits the possibility of infinitely many universes — and why we may never be able to prove it.',

  hero: {
    cacheKey: 'multiverse-hypotheses-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the multiverse concept. ' +
      'A vast dark cosmic void containing multiple glowing bubble-like universes of different sizes and colors, ' +
      'some large and luminous, some tiny and dim, floating in an infinite dark expanse of eternal inflation foam. ' +
      'Each bubble universe has a distinct interior glow — some blue-white, some amber, some deep red — ' +
      'suggesting different physical constants. ' +
      'Hard sci-fi style, ultra-dark background, cinematic wide composition. ' +
      'Add the following text labels on the image: "Level I", "Level II", "Level III", "Level IV". ' +
      'Aspect ratio 16:9.',
    alt:
      'Artistic concept of the multiverse: countless bubble universes floating in the darkness of eternal inflation.',
    caption:
      'A conceptual illustration of the multiverse: each bubble is a separate universe with its own physical constants. ' +
      'No real image exists — this idea lies beyond the reach of any observation.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Imagine that our universe is not the entire universe. That beyond the horizon of observation — ' +
        'the sphere from which no signal could ever reach us within the lifetime of our cosmos — ' +
        'there exist other regions of space. Or entirely separate spaces. ' +
        'Or an infinite number of quantum branches where every possible event plays out every moment. ' +
        'Or something even more radical: every mathematically consistent structure exists as a physical universe. ' +
        'This is the field of ideas that physicists gather under the name _multiverse_.',

        'The multiverse is not a single theory. It is a family of distinct concepts arising from different corners of physics, ' +
        'with little in common beyond one thing: they all extend the notion of "reality" ' +
        'far beyond what we can observe. ' +
        'American cosmologist **Max Tegmark** proposed a convenient classification in the early twenty-first century — ' +
        'four levels, arranged from the most conservative to the most radical. ' +
        'The classification is not universally accepted, but it provides a useful scaffold for the conversation.',
      ],
    },

    {
      heading: 'Level I: Beyond the Horizon, the Same Space',
      level: 2,
      paragraphs: [
        'The most modest version of the multiverse requires no new physics whatsoever. ' +
        'If the universe is spatially infinite — or simply much larger than our observable patch — ' +
        'then beyond our horizon, roughly 46 billion light-years in radius, ' +
        'there exist other regions of the same space-time governed by the same laws of physics.',

        'In an infinite space with a finite number of possible quantum states for its particles, ' +
        'any local configuration must repeat. ' +
        'Somewhere in that space there must exist an exact copy of our Solar System, of Earth, ' +
        'and even of this specific moment of reading this text. ' +
        'Tegmark calculated that the nearest exact copy of any observer would lie at a distance ' +
        'of approximately ten raised to the power of ten raised to the power of twenty-nine meters. ' +
        'The number is so large it is practically indistinguishable from "infinity" in any everyday sense, ' +
        'yet in principle it is a finite distance in an infinite space.',

        'Level I is the least speculative version. Its only premise: space is infinite ' +
        '(or at least vastly larger than the observable universe) and broadly uniform. ' +
        'Both conditions are consistent with all current observations. ' +
        'But verifying them directly is, by definition, impossible.',
      ],
    },

    {
      image: {
        cacheKey: 'multiverse-hypotheses-level1-horizon',
        prompt:
          'Scientific illustration for a science encyclopedia: observable universe horizon and Level I multiverse. ' +
          'A 2D cross-section showing our observable universe as a glowing sphere in the center, ' +
          'surrounded by an infinite dark expanse with identical bubble spheres repeating at vast distances. ' +
          'Arrows pointing outward suggesting regions beyond our horizon with same physical laws. ' +
          'Hard sci-fi style, dark background #020510, cyan accent colors, monospace labels. ' +
          'Add the following text labels on the image: "observable horizon", "our universe", ' +
          '"identical patch", "same physics, different history". ' +
          'Aspect ratio 4:3.',
        alt:
          'Level I multiverse diagram: beyond our observational horizon lie identical patches of the same space.',
        caption:
          'Level I multiverse: identical physical laws, infinite space. ' +
          'Our observational horizon is not the edge of the universe — it is simply the limit of our visibility.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Level II: Eternal Inflation and Pocket Universes',
      level: 2,
      paragraphs: [
        'Most modern models of _cosmic inflation_ — the ultra-rapid expansion immediately after the Big Bang — ' +
        'predict a phenomenon physicists call _eternal inflation_. ' +
        'The idea: the inflationary field does not stop everywhere simultaneously. ' +
        'In most regions of space, inflation continues, ' +
        'generating new space faster than it can be filled. ' +
        'But locally, statistically, the field "stumbles" and ends its inflationary phase — ' +
        'and in those "pockets," hot dense states resembling a Big Bang are born.',

        'Each such pocket — a _pocket universe_ — can possess different physical constants: ' +
        'a different mass for the electron, a different strength of the nuclear force, ' +
        'a different value of the _cosmological constant_. ' +
        'The inflationary mechanism fixes nothing: different pockets can settle into ' +
        'different minima of the field\'s energy potential.',

        'This is where _string theory_ and its so-called _landscape solution_ enter the picture. ' +
        'The equations of string theory admit approximately ten raised to the power of five hundred distinct vacuum states — ' +
        'ten raised to the power of five hundred different sets of natural constants. ' +
        'Each state could be realized in a separate pocket universe. ' +
        'That number so far exceeds the count of atoms in the observable universe ' +
        '(roughly ten raised to the power of eighty) that it defies intuitive comprehension. ' +
        'This is the "landscape" of string theory — the space of all possible physics.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Tegmark\'s Four Levels of the Multiverse',
        svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="11">Four Levels of the Multiverse (Tegmark classification)</text>

  <!-- Level I -->
  <rect x="30" y="38" width="300" height="64" rx="3" fill="rgba(68,136,170,0.12)" stroke="#4488aa" stroke-width="1"/>
  <text x="44" y="58" fill="#7bb8ff" font-family="monospace" font-size="11">Level I — Infinite Space</text>
  <text x="44" y="75" fill="#8899aa" font-family="monospace" font-size="9">Same laws. Beyond horizon — same domains.</text>
  <text x="44" y="91" fill="#667788" font-family="monospace" font-size="9">Premise: infinite flat space.</text>

  <!-- Level II -->
  <rect x="370" y="38" width="300" height="64" rx="3" fill="rgba(255,136,68,0.1)" stroke="#ff8844" stroke-width="1"/>
  <text x="384" y="58" fill="#ff8844" font-family="monospace" font-size="11">Level II — Eternal Inflation</text>
  <text x="384" y="75" fill="#8899aa" font-family="monospace" font-size="9">Pocket universes with different constants.</text>
  <text x="384" y="91" fill="#667788" font-family="monospace" font-size="9">Premise: eternal inflation + landscape.</text>

  <!-- Arrow down center -->
  <line x1="350" y1="102" x2="350" y2="130" stroke="#334455" stroke-width="1" stroke-dasharray="3,3"/>
  <text x="350" y="125" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">more radical</text>

  <!-- Level III -->
  <rect x="30" y="140" width="300" height="64" rx="3" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1"/>
  <text x="44" y="160" fill="#44ff88" font-family="monospace" font-size="11">Level III — Many Worlds (QM)</text>
  <text x="44" y="177" fill="#8899aa" font-family="monospace" font-size="9">Quantum branches: all outcomes are real.</text>
  <text x="44" y="193" fill="#667788" font-family="monospace" font-size="9">Premise: unitary quantum mechanics.</text>

  <!-- Level IV -->
  <rect x="370" y="140" width="300" height="64" rx="3" fill="rgba(204,68,68,0.1)" stroke="#cc4444" stroke-width="1"/>
  <text x="384" y="160" fill="#cc4444" font-family="monospace" font-size="11">Level IV — Mathematical Multiverse</text>
  <text x="384" y="177" fill="#8899aa" font-family="monospace" font-size="9">All mathematical structures are physically real.</text>
  <text x="384" y="193" fill="#667788" font-family="monospace" font-size="9">Premise: mathematical realism.</text>

  <!-- Summary row -->
  <rect x="30" y="228" width="640" height="70" rx="3" fill="rgba(51,68,85,0.3)" stroke="#334455" stroke-width="1"/>
  <text x="350" y="248" text-anchor="middle" fill="#aabbcc" font-family="monospace" font-size="10">Common to all levels: our observable universe is only part of a larger reality.</text>
  <text x="350" y="265" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Levels I–II: geometric / thermodynamic. Level III: quantum. Level IV: ontological.</text>
  <text x="350" y="282" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">No level is directly testable by observation as of 2026.</text>
</svg>`,
        caption:
          'Tegmark\'s four levels of the multiverse. ' +
          'Each successive level more radically expands the concept of "reality" ' +
          'and becomes harder to falsify.',
      },
    },

    {
      heading: 'Level III: Quantum Branches and the Many-Worlds Interpretation',
      level: 2,
      paragraphs: [
        'In the standard Copenhagen interpretation of quantum mechanics, ' +
        'a measurement "collapses" the wave function: from the many possible outcomes, one is realized. ' +
        'But no one has satisfactorily explained what that collapse actually is — ' +
        'or whether it occurs physically at all.',

        'In 1957, American physicist **Hugh Everett III** proposed an alternative: ' +
        'the wave function never collapses. ' +
        'Instead, it branches — and every possible measurement outcome occurs in a separate "branch" of reality. ' +
        'An observer within any given branch sees one definite outcome, ' +
        'but from the perspective of the complete wave function, all outcomes are realized. ' +
        'This is the _Many-Worlds Interpretation_, or simply the Everett interpretation.',

        'Crucially, Level III does not add new geometry to space-time. ' +
        'Quantum branches exist in _Hilbert space_ — an abstract mathematical space of states, ' +
        'not in some physically adjacent space. ' +
        'This version of the multiverse is a direct consequence of quantum mechanics ' +
        'under the assumption that the Schrödinger equation is a complete and uninterrupted description of reality. ' +
        'No additional postulates — but an extraordinarily radical ontological conclusion.',
      ],
    },

    {
      image: {
        cacheKey: 'multiverse-hypotheses-quantum-branches',
        prompt:
          'Scientific illustration for a science encyclopedia: quantum Many-Worlds branching. ' +
          'A tree-like diagram where a single quantum event (particle measurement) causes reality to split ' +
          'into two parallel branches, each continuing to split further. ' +
          'Each branch shown as a glowing timeline line diverging into the future. ' +
          'One branch labeled "spin up" glows cyan, another "spin down" glows orange. ' +
          'Both branches continuing into further subdivisions. ' +
          'Hard sci-fi style, dark background #020510, monospace labels. ' +
          'Add the following text labels on the image: "quantum event", "branch A — spin up", ' +
          '"branch B — spin down", "both branches are real". ' +
          'Aspect ratio 4:3.',
        alt:
          'Many-Worlds branching diagram: every quantum measurement splits reality into separate branches.',
        caption:
          'The Many-Worlds Interpretation: a quantum measurement does not collapse the wave function — ' +
          'it branches it. Both outcomes are real, in branches that no longer interact.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Level IV: The Mathematical Universe',
      level: 2,
      paragraphs: [
        'The fourth level of Tegmark\'s scheme is the most radical and the most philosophical. ' +
        'Its thesis: _mathematical structure and physical reality are the same thing_. ' +
        'If physics describes our universe through mathematics, and if there is nothing special ' +
        'about our particular mathematical structure compared to any other — ' +
        'then every mathematically consistent structure is just as "real" as ours.',

        'This means that universes with different geometry, different logic, different dimensions ' +
        'do not merely "exist" as possibilities — they exist in the same sense that we do. ' +
        'Level IV contains Levels I, II, and III as subsets: ' +
        'all of them are mathematical structures of particular kinds. ' +
        'But Level IV itself goes far beyond physics in any traditional sense ' +
        'and enters the territory of _mathematical realism_ — the philosophical position ' +
        'that mathematical objects exist independently of any human mind.',

        'For most physicists, Level IV is already metaphysics rather than science. ' +
        'But for Tegmark it is a fully legitimate scientific hypothesis, ' +
        'as long as one accepts that the physical universe is described by mathematical equations.',
      ],
    },

    {
      heading: 'The Fine-Tuning Problem and the Anthropic Principle',
      level: 2,
      paragraphs: [
        'One of the strongest motivations for the multiverse is what is called the _fine-tuning problem_. ' +
        'The physical constants of our universe appear curiously "right" for the existence of complex structures: ' +
        'stars, planets, molecules, living organisms.',

        'Consider the _cosmological constant_ — the energy density of empty space, ' +
        'responsible for the accelerating expansion of the universe. ' +
        'Quantum field theory predicts a value one hundred and twenty orders of magnitude larger than what is observed. ' +
        'If it were only several times larger than the observed value, ' +
        'the universe would have expanded so rapidly that galaxies could never have formed. ' +
        'If it were negative and sufficiently large, the universe would have collapsed long ago. ' +
        'The window in which complex life is possible turns out to be strikingly narrow.',

        'Similar observations apply to the ratio of the strong nuclear force to the electromagnetic force, ' +
        'to the mass of the electron relative to the proton, ' +
        'to the slight excess of matter over antimatter after the Big Bang. ' +
        'All of these values look as though they were "chosen" to allow our existence.',

        'This is where the _anthropic principle_ enters. In its simplest form it states ' +
        'that we can only observe a universe in which we are able to exist. ' +
        'If the multiverse genuinely encompasses all possible combinations of constants, ' +
        'it is unsurprising that we find ourselves in the "right" one — ' +
        'only in such a universe could observers arise. ' +
        'Fine-tuning ceases to be a mystery: it is not a miracle but a selection effect.',
      ],
    },

    {
      image: {
        cacheKey: 'multiverse-hypotheses-fine-tuning',
        prompt:
          'Scientific illustration for a science encyclopedia: fine-tuning of physical constants. ' +
          'A 2D parameter space diagram showing two physical constant axes. ' +
          'A vast dark region labeled "no complex structures possible" covers most of the space. ' +
          'A tiny glowing region in the center labeled "life-permitting zone" is highlighted in cyan/green. ' +
          'A dot marks "our universe" within that zone. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "no galaxies form", "no atoms stable", ' +
          '"life-permitting zone", "our universe". ' +
          'Aspect ratio 16:9.',
        alt:
          'Parameter space of physical constants: the life-permitting zone occupies only a tiny fraction.',
        caption:
          'The fine-tuning problem: the space of possible physical constants is vast, ' +
          'but the zone in which complex life is possible is vanishingly small. ' +
          'Is this a coincidence, or a selection effect within a multiverse?',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The String Theory Landscape',
      level: 2,
      paragraphs: [
        'String theory is one of the leading candidates for a "theory of everything" ' +
        'that would unify quantum mechanics with gravity. ' +
        'It describes elementary particles not as points but as microscopic vibrating strings ' +
        'in a space of ten or eleven dimensions. ' +
        'The six or seven extra dimensions are "compactified" — ' +
        'curled up into compact mathematical spaces called _Calabi-Yau manifolds_.',

        'The problem is that the shape of those manifolds is not uniquely fixed by the equations of string theory. ' +
        'There are approximately ten raised to the power of five hundred different ways to compactify them, ' +
        'each yielding a different set of physical constants in the four-dimensional space-time that remains. ' +
        'This is the "landscape" — a colossal space of possible physics. ' +
        'No current method allows us to select, from first principles, which of these vacua is ours.',

        'Combined with eternal inflation, this produces an uncomfortably compelling picture: ' +
        'inflation continuously generates new pocket universes, ' +
        'each of which "lands" in one of the landscape\'s vacua. ' +
        'The diversity of constants across pocket universes is then not a flaw or a coincidence ' +
        'but a structural feature of the theory. ' +
        'Yet picking "our" vacuum from first principles, without an anthropic argument, remains impossible. ' +
        'This is one of the central awkward facts of contemporary theoretical physics.',
      ],
    },

    {
      diagram: {
        title: 'Diagram: Eternal Inflation and Pocket Universes',
        svg: `<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="260" fill="rgba(10,15,25,0.5)"/>

  <!-- Background inflation field -->
  <rect x="20" y="20" width="660" height="220" rx="4" fill="rgba(255,136,68,0.04)" stroke="#ff8844" stroke-width="0.5" stroke-dasharray="6,4"/>
  <text x="350" y="38" text-anchor="middle" fill="#ff8844" font-family="monospace" font-size="10">Eternally inflating background (space expands without stopping)</text>

  <!-- Pocket universe 1 (ours) -->
  <circle cx="180" cy="145" r="55" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="180" y="138" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">our</text>
  <text x="180" y="151" text-anchor="middle" fill="#44ff88" font-family="monospace" font-size="9">universe</text>
  <text x="180" y="164" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">constants A</text>

  <!-- Pocket universe 2 -->
  <circle cx="380" cy="120" r="40" fill="rgba(123,184,255,0.07)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="380" y="113" text-anchor="middle" fill="#7bb8ff" font-family="monospace" font-size="9">pocket 2</text>
  <text x="380" y="128" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">constants B</text>

  <!-- Pocket universe 3 -->
  <circle cx="520" cy="165" r="30" fill="rgba(204,68,68,0.07)" stroke="#cc4444" stroke-width="1"/>
  <text x="520" y="158" text-anchor="middle" fill="#cc4444" font-family="monospace" font-size="9">pocket 3</text>
  <text x="520" y="172" text-anchor="middle" fill="#667788" font-family="monospace" font-size="8">constants C</text>

  <!-- Pocket universe 4 small -->
  <circle cx="610" cy="100" r="18" fill="rgba(170,187,204,0.05)" stroke="#aabbcc" stroke-width="0.8"/>
  <text x="610" y="103" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="7">…</text>

  <!-- Pocket universe 5 small -->
  <circle cx="310" cy="195" r="22" fill="rgba(170,187,204,0.05)" stroke="#aabbcc" stroke-width="0.8"/>
  <text x="310" y="198" text-anchor="middle" fill="#8899aa" font-family="monospace" font-size="7">…</text>

  <!-- Caption line -->
  <text x="350" y="240" text-anchor="middle" fill="#667788" font-family="monospace" font-size="9">Each pocket: a Big Bang with its own constants. Inflation never stops globally.</text>
</svg>`,
        caption:
          'Eternal inflation continuously generates new pocket universes. ' +
          'Each pocket settles into a different vacuum state in the string theory landscape. ' +
          'The physical constants inside each pocket differ.',
      },
    },

    {
      heading: 'Testability and the Popperian Debate',
      level: 2,
      paragraphs: [
        'The most vulnerable point of all multiverse proposals is the question of _falsifiability_. ' +
        'In the twentieth century, philosopher **Karl Popper** proposed a criterion for demarcating science: ' +
        'a scientific theory must be _falsifiable_ — there must exist a possible observational result ' +
        'that would contradict it. ' +
        'A theory compatible with every possible outcome predicts nothing.',

        'The multiverse in any of its versions explains everything we see: ' +
        'with so many universes having different constants, ' +
        'there will inevitably be at least one in which observers like us arise. ' +
        'But that very explanatory power makes the theory suspicious: ' +
        'it rules nothing out, and therefore, strictly speaking, predicts nothing.',

        'Defenders respond in different ways. ' +
        'Some argue that falsifiability is not the only criterion for science: ' +
        'a theory may be legitimate if it follows as a natural consequence of other well-confirmed theories. ' +
        'Eternal inflation follows from inflationary models that are supported by independent evidence. ' +
        'Others point to _indirect_ testability: ' +
        'some models of eternal inflation predict specific signatures in the cosmic microwave background, ' +
        'including certain patterns of so-called _primordial gravitational waves_ from inflation. ' +
        'If those signatures are absent, some models can genuinely be ruled out.',
      ],
    },

    {
      image: {
        cacheKey: 'multiverse-hypotheses-cmb-cold-spot',
        prompt:
          'Scientific illustration for a science encyclopedia: CMB cold spot as alleged bubble collision evidence. ' +
          'A Mollweide projection map of the Cosmic Microwave Background sky with a distinctly colder circular ' +
          'region highlighted in deep blue at the southern hemisphere of the map. ' +
          'An inset diagram showing two bubble universes colliding and leaving an imprint. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "CMB cold spot", "possible collision imprint", ' +
          '"bubble universe A", "bubble universe B", "controversial — not confirmed". ' +
          'Aspect ratio 16:9.',
        alt:
          'The CMB cold spot — a controversial anomaly sometimes interpreted as evidence of a bubble universe collision.',
        caption:
          'The Cold Spot in the Cosmic Microwave Background (WMAP/Planck): ' +
          'a region colder than standard models predict. ' +
          'Some physicists have proposed it as a possible imprint of a collision with another bubble universe. ' +
          'Alternative explanations — statistical fluctuation, a large cosmic void — ' +
          'remain more probable as of May 2026.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The CMB Cold Spot: A Collision Imprint?',
      level: 3,
      paragraphs: [
        'Maps of the cosmic microwave background from the WMAP and Planck missions contain one anomaly ' +
        'that draws persistent attention: the _Cold Spot_, a roughly five-degree region in the constellation Eridanus. ' +
        'It is colder than the surrounding background by more than standard fluctuation models predict.',

        'Some researchers have proposed an exotic explanation: ' +
        'our pocket universe may have collided with a neighboring one early in its expansion, ' +
        'leaving just such an imprint in the radiation. ' +
        'This is not mere speculation — the model by Matthew Johnson and collaborators ' +
        'gives concrete predictions about the shape and polarization signature of such an imprint.',

        'Most cosmologists are skeptical, however. ' +
        'The statistical significance of the anomaly is ambiguous, depending on the method of analysis. ' +
        'A more likely explanation is a giant cosmic void between us and that region of the sky, ' +
        'amplifying the _Integrated Sachs-Wolfe effect_. ' +
        'As of May 2026, the question remains open, ' +
        'but the bubble-collision hypothesis is considered less probable than less exotic alternatives.',
      ],
    },

    {
      image: {
        cacheKey: 'multiverse-hypotheses-string-landscape',
        prompt:
          'Scientific illustration for a science encyclopedia: string theory landscape of vacua. ' +
          'An abstract 3D energy landscape visualization — a rugged terrain of hills and valleys ' +
          'representing different vacuum energy states in string theory. ' +
          'Each valley is a possible universe with different physical constants. ' +
          'Some valleys are deep (stable), some shallow (metastable). ' +
          'A small glowing dot marks "our vacuum" in one of the valleys. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "string landscape", "~10^500 vacua", ' +
          '"our vacuum", "different constants in each valley". ' +
          'Aspect ratio 4:3.',
        alt:
          'The string theory landscape: an energy terrain with ten-to-the-five-hundred valleys of possible vacua.',
        caption:
          'The string theory landscape: each "valley" in the energy terrain is a separate vacuum state ' +
          'with different physical constants. ' +
          'Our universe corresponds to one of these valleys — ' +
          'but which one, and why, cannot be determined from first principles.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Is the Multiverse Science?',
      level: 2,
      paragraphs: [
        'The debate over the status of the multiverse is not merely academic. ' +
        'It touches on the question of what a physical theory is supposed to do. ' +
        'If a theory explains why the constants are what they are ' +
        'by pointing out that they differ across universes — ' +
        'and we observe the ones compatible with our existence — ' +
        'is that genuinely an explanation? Or is it a refusal to explain?',

        'Physicist **David Deutsch** and advocates of the Many-Worlds interpretation insist: ' +
        'a theory that is the simplest and most rigorous extension of already-confirmed equations — quantum mechanics — ' +
        'is scientifically legitimate, even if its branches are inherently invisible. ' +
        'Theorist **Paul Steinhardt** and other critics disagree: ' +
        'a theory that rules nothing out is not science in the Popperian sense.',

        'Nobel laureate **Roger Penrose** regards the multiverse with open skepticism, ' +
        'viewing it as a convenient way to avoid solving real problems. ' +
        'Astrophysicist **Lee Smolin** proposed an alternative framework — ' +
        '_cosmological natural selection_, in which universes that produce more black holes ' +
        '"reproduce" more efficiently, providing an evolutionary explanation for well-tuned constants ' +
        'without any appeal to the anthropic principle.',

        'As of May 2026, no version of the multiverse has been confirmed or ruled out. ' +
        'Most physicists treat these hypotheses as serious theoretical constructs ' +
        'worth investigating — but not as established facts. ' +
        'The boundary between physics and metaphysics is genuinely blurred here, ' +
        'and that is probably the most honest answer available.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Multiverse',
      definition:
        'A collective term for hypotheses that postulate the existence of multiple universes — domains of space or realities — beyond our observable universe. Not a single theory but a class of distinct concepts.',
    },
    {
      term: 'Eternal inflation',
      definition:
        'A variant of cosmic inflation in which the inflationary process never stops globally: new regions of space are continuously generated, with inflation ending locally in isolated patches that each undergo a Big Bang. Produces "pocket universes."',
    },
    {
      term: 'Pocket universe',
      definition:
        'A separate domain of space-time that formed when eternal inflation ended locally. May have different physical constants from our universe.',
    },
    {
      term: 'Many-Worlds Interpretation',
      definition:
        'An interpretation of quantum mechanics (Hugh Everett, 1957) in which the wave function never collapses: every quantum measurement branches reality into parallel branches where all possible outcomes are realized.',
    },
    {
      term: 'String landscape',
      definition:
        'The set of approximately ten raised to the power of five hundred vacuum states allowed by the equations of string theory. Each state corresponds to a different set of physical constants in four-dimensional space-time.',
    },
    {
      term: 'Anthropic principle',
      definition:
        'The principle stating that conditions in the observable universe must be compatible with the existence of observers. In its weak form, a tautology; in its strong form, used as a selection-effect explanation for fine-tuning in the context of a multiverse.',
    },
    {
      term: 'Cosmological constant',
      definition:
        'A parameter in the equations of general relativity corresponding to the energy density of empty space, responsible for the accelerating expansion of the universe. The observed value is 120 orders of magnitude smaller than quantum field theory predicts — one of the sharpest open problems in physics.',
    },
    {
      term: 'Falsifiability (Popper criterion)',
      definition:
        'The property of a scientific theory whereby it makes predictions that could in principle be contradicted by observations or experiments. Theories compatible with every possible outcome are not considered scientific in the Popperian sense.',
    },
    {
      term: 'Fine-tuning',
      definition:
        'The observation that the physical constants of the universe have specific values from which even small deviations would make the existence of complex structures — stars, molecules, living organisms — impossible.',
    },
  ],

  quiz: [
    {
      question:
        'Which level of Tegmark\'s multiverse involves the same physical laws as our universe, simply beyond the observational horizon?',
      options: [
        'Level II — eternal inflation',
        'Level III — quantum branches',
        'Level I — infinite uniform space',
        'Level IV — mathematical multiverse',
      ],
      correctIndex: 2,
      explanation:
        'Level I describes an infinite space with the same physical laws: ' +
        'beyond the observational horizon there are simply other regions of the same space-time. ' +
        'It is the least speculative version of the multiverse.',
    },
    {
      question:
        'What is the "landscape" in the context of string theory?',
      options: [
        'A three-dimensional map of galaxy distribution in the universe',
        'The set of approximately 10 to the power of 500 vacuum states with different physical constants',
        'A hypothetical terrain on the surface of a neutron star',
        'Tegmark\'s diagram of the four multiverse levels',
      ],
      correctIndex: 1,
      explanation:
        'The string theory landscape is the space of all permitted vacuum states, ' +
        'each yielding different physical constants. ' +
        'Combined with eternal inflation, this explains why different pocket universes ' +
        'can have radically different physics.',
    },
    {
      question:
        'What does the Many-Worlds Interpretation assert about quantum measurement?',
      options: [
        'Measurement irreversibly destroys the wave function',
        'The outcome of a measurement is determined by the observer\'s consciousness',
        'The wave function branches — all possible outcomes are realized',
        'Quantum systems have no definite state before measurement',
      ],
      correctIndex: 2,
      explanation:
        'Hugh Everett proposed that the wave function never "collapses": ' +
        'every measurement branches reality, and all outcomes are realized in parallel branches. ' +
        'An observer within any given branch sees only one outcome.',
    },
    {
      question:
        'What role does the anthropic principle play in multiverse discussions?',
      options: [
        'It proves that our universe is the only possible one',
        'It explains fine-tuning of constants as a selection effect: we can only exist where we can exist',
        'It rules out the existence of a multiverse',
        'It predicts specific signatures in the cosmic microwave background',
      ],
      correctIndex: 1,
      explanation:
        'The anthropic principle says: if a multiverse with varying constants exists, ' +
        'observers will inevitably find themselves only in "suitable" universes. ' +
        'Fine-tuning stops being a mystery — it is a selection effect.',
    },
    {
      question:
        'Why do most versions of the multiverse present difficulties from a Popperian scientific standpoint?',
      options: [
        'They contradict the equations of general relativity',
        'Their predictions have been tested and found to be false',
        'They are compatible with any possible observational result and rule nothing out',
        'They require faster-than-light communication between universes',
      ],
      correctIndex: 2,
      explanation:
        'By Popper\'s criterion, a scientific theory must make predictions that can be contradicted. ' +
        'The multiverse in most versions explains any observed fact — ' +
        'and therefore, strictly speaking, predicts nothing. ' +
        'This makes it metaphysics by Popperian classification, ' +
        'though its proponents contest that conclusion.',
    },
  ],

  sources: [
    {
      title: 'Tegmark M. — Parallel Universes',
      url: 'https://arxiv.org/abs/astro-ph/0302131',
      meta: 'Scientific American, May 2003; arXiv:astro-ph/0302131 — classic four-level classification',
    },
    {
      title: 'Tegmark M. — Our Mathematical Universe',
      url: 'https://arxiv.org/abs/0704.0646',
      meta: 'arXiv:0704.0646 (2007) — Level IV, mathematical multiverse',
    },
    {
      title: 'Everett H. III — "Relative State" Formulation of Quantum Mechanics',
      url: 'https://link.aps.org/doi/10.1103/RevModPhys.29.454',
      meta: 'Rev. Mod. Phys. 29, 454 (1957) — original Many-Worlds paper',
    },
    {
      title: 'Guth A.H. — Eternal Inflation and Its Implications',
      url: 'https://arxiv.org/abs/hep-th/0702178',
      meta: 'J. Phys. A 40, 6811 (2007); arXiv:hep-th/0702178 — eternal inflation and the multiverse',
    },
    {
      title: 'Susskind L. — The Anthropic Landscape of String Theory',
      url: 'https://arxiv.org/abs/hep-th/0302219',
      meta: 'arXiv:hep-th/0302219 (2003) — string theory landscape',
    },
    {
      title: 'Weinberg S. — Anthropic Bound on the Cosmological Constant',
      url: 'https://link.aps.org/doi/10.1103/PhysRevLett.59.2607',
      meta: 'Phys. Rev. Lett. 59, 2607 (1987) — anthropic argument and cosmological constant',
    },
    {
      title: 'Johnson M.C., Larfors M. — Field dynamics and tunneling in a flux landscape',
      url: 'https://arxiv.org/abs/0805.3705',
      meta: 'Phys. Rev. D 78, 083514 (2008); arXiv:0805.3705 — bubble collisions and CMB signatures',
    },
    {
      title: 'Planck Collaboration — Planck 2018 Results X: Constraints on Inflation',
      url: 'https://arxiv.org/abs/1807.06211',
      meta: 'A&A 641, A10 (2020); arXiv:1807.06211 — constraints on inflationary models',
    },
    {
      title: 'Ellis G., Silk J. — Scientific Method: Defend the Integrity of Physics',
      url: 'https://www.nature.com/articles/516321a',
      meta: 'Nature 516, 321 (2014) — critique of the multiverse and the falsifiability problem',
    },
    {
      title: 'Smolin L. — The Life of the Cosmos',
      url: 'https://global.oup.com/academic/product/the-life-of-the-cosmos-9780195126648',
      meta: 'Oxford University Press (1997) — cosmological natural selection as alternative to anthropic reasoning',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
