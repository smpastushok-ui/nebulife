import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'drake-fermi',
  language: 'en',
  section: 'astrobiology',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 12,
  title: 'Drake Equation and Fermi Paradox',
  subtitle:
    'A formula for estimating the number of civilizations in the galaxy, and astrophysics\'s most uncomfortable question: if they exist — where are they?',

  hero: {
    cacheKey: 'drake-fermi-hero',
    prompt:
      'Photorealistic illustration for a science encyclopedia: the Milky Way galaxy seen from above, spiral arms filled with billions of stars, ' +
      'a vast cosmic silence with no visible signals or beacons, deep dark space background with nebulae and star clusters. ' +
      'Hard sci-fi style, dramatic scale, sense of vast emptiness contrasted with the density of stars. ' +
      'Add the following text labels on the image: "100 billion stars", "Where is everybody?".',
    alt: 'The Milky Way galaxy with hundreds of billions of stars — and nothing pointing to the presence of other intelligent life',
    caption:
      'The Milky Way contains roughly one hundred billion stars. Even if only a tiny fraction of them host planets with intelligent life, the number of civilizations could run into the millions. Yet we hear no one. It is in the gap between that calculation and that silence that both the Drake equation and the Fermi paradox live.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Imagine trying to count how many people in a large city are on the phone right now. ' +
        'You cannot count them directly, but you can break the problem into pieces: how many people live in the city, ' +
        'what fraction own a phone, what fraction are awake right now, what fraction of those are currently talking. ' +
        'Multiply the factors together and you get an estimate — approximate, but systematic. ' +
        'This is exactly the logic applied by radio astronomer Frank Drake in the middle of the twentieth century ' +
        'when he proposed a formula for estimating the number of technological civilizations in our galaxy.',

        'A few years earlier, physicist Enrico Fermi asked, over lunch in Los Alamos, the question ' +
        'that astrophysics has never fully shaken: "Where is everybody?" He was talking about extraterrestrial civilizations. ' +
        'These two moments — the equation and the question — formed the framework within which astrobiology ' +
        'and the search for extraterrestrial intelligence have operated ever since.',
      ],
    },

    {
      heading: 'The Drake Equation: Seven Factors of One Uncertainty',
      level: 2,
      paragraphs: [
        'In 1961, Drake organized the first scientific conference on the search for extraterrestrial intelligence ' +
        'at Green Bank, West Virginia. To give the discussion structure, he wrote a product of seven parameters on the blackboard — ' +
        'and produced a formula that has carried his name ever since. ' +
        'The equation states: the number of civilizations in our galaxy with which we could theoretically make contact ' +
        'equals the product of: the rate of star formation, multiplied by the fraction of stars with planets, ' +
        'by the average number of planets in the habitable zone per stellar system, ' +
        'by the fraction of such planets where life actually arises, ' +
        'by the fraction where it becomes intelligent, ' +
        'by the fraction that develops technology for interstellar communication, ' +
        'and finally by the average lifespan of such a civilization.',

        'It looks formidable. But the real function of the equation is not to give an answer — ' +
        'it is to show which questions need to be asked. ' +
        'The first two factors are now reasonably well known: observations have confirmed that planets exist around ' +
        'virtually every star, and the rate of new star formation in the galaxy is estimated at a few per year. ' +
        'After that, the fog begins.',
      ],
    },

    {
      image: {
        cacheKey: 'drake-fermi-equation-factors',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a blackboard-style dark panel showing the Drake Equation ' +
          'as a visual diagram with seven labeled boxes connected by multiplication signs, ' +
          'each box representing one factor: star formation rate, fraction with planets, planets per system in habitable zone, ' +
          'fraction with life, fraction with intelligence, fraction with technology, civilization lifetime. ' +
          'Hard sci-fi style, monospace labels, dark background. ' +
          'Add the following text labels on the image: "R*", "fp", "ne", "fl", "fi", "fc", "L", "N =".',
        alt: 'The Drake equation shown as a diagram with seven factor-boxes — from the rate of star formation to the lifespan of civilizations',
        caption:
          'The seven parameters of the Drake equation form a chain from well-measured astrophysics to nearly unknowable sociological and biological uncertainties. The first two parameters are known with reasonable precision. The last three are almost pure philosophy.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'From Stars to Planets: What We Already Know',
      level: 2,
      paragraphs: [
        'The rate of star formation in the Milky Way is currently estimated at between one and a few new suns per year. ' +
        'This is not a contentious number — it is backed by decades of radio and infrared observations.',

        'The fraction of stars that have planets was pure speculation a few decades ago. ' +
        'Now, after orbital telescopes have discovered thousands of confirmed exoplanets, ' +
        'the answer looks something like this: virtually every star has at least one planet, ' +
        'and most systems have several. Current data from JWST and the archives of earlier missions ' +
        'push this parameter very close to one.',

        'The number of planets in the habitable zone per system remains the subject of active research. ' +
        'Systems such as TRAPPIST-1, where seven planets orbit a single red dwarf and at least three fall ' +
        'within its habitable zone, show that the number can exceed one. ' +
        'Current estimates range between roughly one-half and two. Call it cautious optimism.',
      ],
    },

    {
      heading: 'Where the Darkness Begins: From Molecules to Mind',
      level: 3,
      paragraphs: [
        'The fourth factor — the fraction of habitable-zone planets where life actually _arose_ — ' +
        'is the most uncertain number in the entire equation. ' +
        'On Earth, chemical traces of microbial life appeared very quickly after the planet cooled and stabilized — ' +
        'within a few hundred million years. ' +
        'Some researchers take this as a sign that the origin of life is a regular chemical process ' +
        'that occurs wherever the right conditions exist. ' +
        'Others point out: we have exactly one example. ' +
        'One data point is not statistics.',

        'The fifth factor — from simple microbial life to intelligent life — is even more opaque. ' +
        'Microbes dominated Earth for more than three billion years. ' +
        'Complex multicellular forms appeared relatively recently, and only one species out of billions ' +
        'developed the capacity to build radio telescopes. ' +
        'This could have been inevitable — or a freakish convergence of circumstances. ' +
        'Both positions have serious supporters among evolutionary biologists.',

        'The sixth factor asks: what fraction of intelligent species develop a _technological_ civilization ' +
        'capable of interstellar communication? ' +
        'Here we rely entirely on analogies from our own history — ' +
        'and are completely blind to the alternative paths evolution might have taken on other worlds.',
      ],
    },

    {
      heading: 'Factor L: Time as the Dominant Uncertainty',
      level: 2,
      paragraphs: [
        'The last multiplier in the equation — the _lifespan_ of a technological civilization — ' +
        'turns out to be the most consequential of all, though it looks like a detail at first. ' +
        'If the average civilization exists as a technological entity for a few hundred years — ' +
        'most of them have long since vanished, and our chances of catching someone simultaneously with us are very small. ' +
        'If the lifespan is measured in millions or billions of years — ' +
        'the galaxy could be filled with active civilizations.',

        'At the time Drake wrote his equation, humanity had just produced nuclear weapons. ' +
        'Some participants of that Green Bank conference believed that technological civilizations self-destruct ' +
        'within a few hundred years — which would make the total number of active civilizations negligible. ' +
        'Optimists argued for lifespans of millions of years — in which case there should be thousands of them.',

        'If you substitute the most conservative values for each factor, the result can be less than one — ' +
        'meaning we ourselves are a statistical anomaly. ' +
        'Plug in optimistic values and you get thousands or millions of civilizations in our galaxy alone. ' +
        'The Drake equation does not supply an answer — it honestly formalizes our ignorance.',
      ],
    },

    {
      diagram: {
        title: 'The Drake Equation: from the Known to the Unknown',
        svg: `<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="220" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Drake Equation: from the Known to the Unknown</text>

  <!-- Factor boxes -->
  <!-- R* -->
  <rect x="20" y="40" width="70" height="50" rx="3" fill="rgba(68,255,136,0.15)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="55" y="62" fill="#44ff88" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">R*</text>
  <text x="55" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">star</text>
  <text x="55" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">form. rate</text>

  <text x="97" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">×</text>

  <!-- fp -->
  <rect x="104" y="40" width="70" height="50" rx="3" fill="rgba(68,255,136,0.15)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="139" y="62" fill="#44ff88" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">fp</text>
  <text x="139" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">stars with</text>
  <text x="139" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">planets</text>

  <text x="181" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">×</text>

  <!-- ne -->
  <rect x="188" y="40" width="70" height="50" rx="3" fill="rgba(68,255,136,0.12)" stroke="#7bb8ff" stroke-width="1.5"/>
  <text x="223" y="62" fill="#7bb8ff" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">ne</text>
  <text x="223" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">planets in</text>
  <text x="223" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">hab. zone</text>

  <text x="265" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">×</text>

  <!-- fl -->
  <rect x="272" y="40" width="70" height="50" rx="3" fill="rgba(255,136,68,0.12)" stroke="#ff8844" stroke-width="1.5"/>
  <text x="307" y="62" fill="#ff8844" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">fl</text>
  <text x="307" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">where life</text>
  <text x="307" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">arises</text>

  <text x="349" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">×</text>

  <!-- fi -->
  <rect x="356" y="40" width="70" height="50" rx="3" fill="rgba(255,136,68,0.12)" stroke="#ff8844" stroke-width="1.5"/>
  <text x="391" y="62" fill="#ff8844" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">fi</text>
  <text x="391" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">where</text>
  <text x="391" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">intel. arises</text>

  <text x="433" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">×</text>

  <!-- fc -->
  <rect x="440" y="40" width="70" height="50" rx="3" fill="rgba(204,68,68,0.15)" stroke="#cc4444" stroke-width="1.5"/>
  <text x="475" y="62" fill="#cc4444" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">fc</text>
  <text x="475" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">with tech.</text>
  <text x="475" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">commun.</text>

  <text x="517" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">×</text>

  <!-- L -->
  <rect x="524" y="40" width="70" height="50" rx="3" fill="rgba(204,68,68,0.15)" stroke="#cc4444" stroke-width="1.5"/>
  <text x="559" y="62" fill="#cc4444" font-family="monospace" font-size="13" text-anchor="middle" font-weight="bold">L</text>
  <text x="559" y="78" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">civiliz.</text>
  <text x="559" y="88" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">lifespan</text>

  <text x="601" y="69" fill="#aabbcc" font-family="monospace" font-size="14" text-anchor="middle">=</text>

  <!-- N result -->
  <rect x="614" y="35" width="70" height="60" rx="3" fill="rgba(123,184,255,0.12)" stroke="#7bb8ff" stroke-width="2"/>
  <text x="649" y="62" fill="#7bb8ff" font-family="monospace" font-size="18" text-anchor="middle" font-weight="bold">N</text>
  <text x="649" y="80" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">civiliz. in</text>
  <text x="649" y="90" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">the galaxy</text>

  <!-- Legend bar -->
  <rect x="20" y="115" width="140" height="10" rx="2" fill="rgba(68,255,136,0.3)" stroke="#44ff88" stroke-width="1"/>
  <text x="90" y="140" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">well known</text>

  <rect x="180" y="115" width="80" height="10" rx="2" fill="rgba(123,184,255,0.3)" stroke="#7bb8ff" stroke-width="1"/>
  <text x="220" y="140" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">partial</text>

  <rect x="280" y="115" width="150" height="10" rx="2" fill="rgba(255,136,68,0.3)" stroke="#ff8844" stroke-width="1"/>
  <text x="355" y="140" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">uncertain</text>

  <rect x="450" y="115" width="150" height="10" rx="2" fill="rgba(204,68,68,0.3)" stroke="#cc4444" stroke-width="1"/>
  <text x="525" y="140" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">nearly unknown</text>

  <text x="350" y="175" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Drake, 1961 — Green Bank, West Virginia</text>
  <text x="350" y="190" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Estimates of N range from less than 1 to millions depending on inputs</text>
</svg>`,
        caption:
          'The Drake equation breaks the question "how many civilizations?" into seven factors with differing levels of uncertainty. The first two parameters (green) are now reasonably well constrained. The last three (red) remain almost entirely unconstrained.',
      },
    },

    {
      heading: 'The Fermi Paradox: Silence as an Argument',
      level: 2,
      paragraphs: [
        'In the middle of the twentieth century, physicist Enrico Fermi said something over lunch in Los Alamos ' +
        'that became one of the most influential questions in astrophysics: ' +
        '"Where is everybody?" He was talking about extraterrestrial civilizations. ' +
        'The galaxy is old — more than ten billion years. ' +
        'At such timescales, even slow interstellar colonization, ' +
        'moving at one-thousandth of the speed of light, ' +
        'could have covered the entire galaxy within a few billion years. ' +
        'If even one civilization arose and decided to spread — it should already be here.',

        'Mathematician and physicist Michael Hart calculated this argument in detail in the nineteen-seventies: ' +
        'at any reasonable speed of interstellar travel, complete galactic colonization would take ' +
        'far less than the current age of the stars. ' +
        'Physicist Frank Tipler strengthened the argument: even self-replicating von Neumann probes ' +
        'should long since have filled every stellar system. ' +
        'Yet we see neither colonizers nor probes, nor even detectable radio signals.',
      ],
    },

    {
      image: {
        cacheKey: 'drake-fermi-great-silence',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a deep space radio telescope dish pointing at the starry sky at night, ' +
          'the Milky Way galaxy visible above, signal detection screens in a control room showing flat noise lines with no signal, ' +
          'atmosphere of quiet expectation and cosmic silence. ' +
          'Hard sci-fi style, dark background, cinematic but technically accurate. ' +
          'Add the following text labels on the image: "SETI search", "no signal detected", "cosmic silence".',
        alt: 'A radio telescope aimed at the starry sky — monitoring screens show only noise, no signal',
        caption:
          'Since the first systematic searches began in the middle of the twentieth century, the search for extraterrestrial intelligence has recorded no unambiguously confirmed signal of extraterrestrial origin. That silence is the heart of the Fermi paradox.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Great Filter: Where Civilizations Die',
      level: 2,
      paragraphs: [
        'One of the most widely discussed explanations of the paradox is the concept of the **Great Filter**, ' +
        'formulated by economist and futurist Robin Hanson in the late twentieth century. ' +
        'The idea is this: somewhere between molecules in a primordial ocean and a galactic civilization, ' +
        'there exists one or more barriers through which only exceptional cases pass. ' +
        'Most potential players are screened out before they ever reach the stage.',

        'The pivotal question is where precisely that filter sits: in our past or ahead of us. ' +
        'If the filter is already behind us — for example, if the emergence of cells with a nucleus (eukaryotes) ' +
        'was catastrophically improbable — then we passed through an extraordinary bottleneck ' +
        'and may be among the first and rarest of winners. ' +
        'If the filter lies ahead — if, say, every technological civilization inevitably destroys itself ' +
        'through nuclear weapons, artificial intelligence, or ecological collapse — ' +
        'then our future is deeply alarming.',

        'This is precisely why the discovery of bacteria on Mars, or any reliable detection of primitive extraterrestrial life, ' +
        'would be greeted by many scientists not with triumph but with somber unease: ' +
        'if simple life is widespread, the filter is not located at the step of cellular origins, ' +
        'but somewhere later in the chain — perhaps directly ahead of us.',
      ],
    },

    {
      diagram: {
        title: 'The Great Filter: Behind Us or Ahead?',
        svg: `<svg viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="240" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">The Great Filter: Two Scenarios</text>

  <!-- Timeline axis -->
  <line x1="30" y1="110" x2="670" y2="110" stroke="#334455" stroke-width="1.5"/>

  <!-- Stage labels on axis -->
  <text x="60" y="130" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">RNA</text>
  <text x="60" y="140" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">chemistry</text>

  <text x="160" y="130" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">first</text>
  <text x="160" y="140" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">cell</text>

  <text x="260" y="130" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">eukaryotes</text>

  <text x="370" y="130" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">multi-</text>
  <text x="370" y="140" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">cellular</text>

  <text x="480" y="130" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">intelligent</text>
  <text x="480" y="140" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">life</text>

  <text x="580" y="130" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">tech.</text>
  <text x="580" y="140" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">civiliz.</text>

  <text x="650" y="130" fill="#aabbcc" font-family="monospace" font-size="8" text-anchor="middle">stars</text>

  <!-- Tick marks -->
  <line x1="60" y1="106" x2="60" y2="114" stroke="#334455" stroke-width="1"/>
  <line x1="160" y1="106" x2="160" y2="114" stroke="#334455" stroke-width="1"/>
  <line x1="260" y1="106" x2="260" y2="114" stroke="#334455" stroke-width="1"/>
  <line x1="370" y1="106" x2="370" y2="114" stroke="#334455" stroke-width="1"/>
  <line x1="480" y1="106" x2="480" y2="114" stroke="#334455" stroke-width="1"/>
  <line x1="580" y1="106" x2="580" y2="114" stroke="#334455" stroke-width="1"/>
  <line x1="650" y1="106" x2="650" y2="114" stroke="#334455" stroke-width="1"/>

  <!-- Scenario A: filter in the past (around eukaryotes) -->
  <line x1="260" y1="50" x2="260" y2="108" stroke="#44ff88" stroke-width="3" stroke-dasharray="5,3"/>
  <text x="255" y="45" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="end">Filter</text>
  <text x="255" y="56" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="end">behind us</text>
  <text x="255" y="67" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="end">(good</text>
  <text x="255" y="78" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="end">news)</text>

  <!-- Scenario B: filter ahead (around tech civ) -->
  <line x1="580" y1="50" x2="580" y2="108" stroke="#cc4444" stroke-width="3" stroke-dasharray="5,3"/>
  <text x="585" y="45" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="start">Filter</text>
  <text x="585" y="56" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="start">ahead of us</text>
  <text x="585" y="67" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="start">(bad</text>
  <text x="585" y="78" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="start">news)</text>

  <!-- Arrow right for galaxy colonization -->
  <line x1="650" y1="110" x2="670" y2="110" stroke="#334455" stroke-width="1.5" marker-end="url(#arr2)"/>
  <defs>
    <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#334455"/>
    </marker>
  </defs>

  <!-- "We are here" marker -->
  <circle cx="580" cy="110" r="5" fill="#7bb8ff" opacity="0.9"/>
  <text x="580" y="170" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">We are here</text>
  <line x1="580" y1="115" x2="580" y2="162" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="2,2" opacity="0.6"/>

  <text x="350" y="210" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">If simple life is common — the Filter is most likely still ahead of us.</text>
</svg>`,
        caption:
          'The Great Filter may sit at any point in the chain from chemical origins to galactic civilization. Its location determines whether discovering extraterrestrial microbial life would be good news — or a warning.',
      },
    },

    {
      heading: 'Rare Earth: We May Be Unique',
      level: 2,
      paragraphs: [
        'Another class of explanations holds that there is no paradox — because complex life genuinely is rare. ' +
        'The **Rare Earth** hypothesis, worked out in detail by paleontologist Peter Ward and astronomer Joe Brownlee ' +
        'at the turn of the twenty-first century, enumerates the conditions that made Earth an exception rather than a rule: ' +
        'a stable G-class star, a giant planet on an outer orbit shielding against asteroids, ' +
        'a large moon stabilizing the axial tilt, a location in the galactic habitable zone, ' +
        'plate tectonics cycling carbon, and moderate stellar activity at the right moment.',

        'Each condition individually is not spectacular. But the product of many small probabilities ' +
        'quickly becomes an astronomically small number. ' +
        'If the emergence of complex animal and intelligent life requires the convergence of dozens of such factors, ' +
        'Earth may have been one of very few — or the only — planet in the observable universe ' +
        'where everything fell into place just so.',
      ],
    },

    {
      image: {
        cacheKey: 'drake-fermi-rare-earth',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a side-by-side comparison of two planetary systems in space — ' +
          'on the left, Earth with its Moon, Jupiter visible in the background as a distant guardian, the Sun casting warm light, ' +
          'a thriving biosphere visible as green-blue swirls; ' +
          'on the right, a barren rocky planet orbiting a dim red star, no moon, no large gas giant guardian, surface pocked with craters. ' +
          'Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "Earth: many favorable conditions", "typical rocky planet".',
        alt: 'Earth compared to a typical rocky planet — the multiple unique conditions of Earth against a typical unshielded world',
        caption:
          'The Rare Earth hypothesis argues that the combination of a large moon, a giant outer shield planet, plate tectonics, and a stable star may be the exception rather than the rule. If so, complex life is genuinely rare.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Dark Forest, Zoo, and Other Hypotheses of Silence',
      level: 2,
      paragraphs: [
        'There are also explanations that do not require civilizations to be rare or to perish. ' +
        'They offer reasons why we might not detect them even if they existed.',

        'The **Dark Forest** hypothesis, popularized by science fiction, ' +
        'proposes that the universe resembles a dark forest where every hunter hides, ' +
        'because any detected entity becomes a target. ' +
        'If resources and survival are competitive goods, the rational strategy for any civilization ' +
        'is silence and the preemptive elimination of potential rivals before they become a threat. ' +
        'This is a grim model, and its plausibility depends entirely on assumptions about the fundamental nature of rational beings.',

        'The **zoo hypothesis** suggests the opposite: advanced civilizations know about us ' +
        'but deliberately refrain from contact — perhaps to allow us to develop independently, ' +
        'or out of a non-interference principle analogous to a "do no harm" directive. ' +
        'We are observed from a distance, without being revealed to.',

        'The **transcendence hypothesis** offers yet another variant: ' +
        'a sufficiently advanced civilization stops transmitting radio signals not because it has vanished ' +
        'but because it has transitioned to forms of communication or existence ' +
        'that we are incapable of detecting — or even imagining. ' +
        'Perhaps we are searching in the wrong frequency range, ' +
        'by the wrong method, with the wrong instruments.',
      ],
    },

    {
      image: {
        cacheKey: 'drake-fermi-solutions',
        prompt:
          'Photorealistic illustration for a science encyclopedia: a conceptual diagram showing multiple pathways branching from a central question mark — ' +
          'one branch shows a planet exploding (self-destruction), one shows a small Earth-like planet isolated in space (Rare Earth), ' +
          'one shows a civilization hiding in darkness (Dark Forest), one shows abstract digital transcendence patterns (upload/transcendence). ' +
          'Hard sci-fi style, dark space background, branching structure. ' +
          'Add the following text labels on the image: "self-destruction", "Rare Earth", "Dark Forest", "transcendence", "Fermi Paradox".',
        alt: 'A conceptual diagram of the main explanations for the Fermi paradox: self-destruction, Rare Earth, Dark Forest, transcendence',
        caption:
          'Explanations for the Fermi paradox can be divided into two broad categories: there are few or no civilizations — and there are civilizations but we cannot or will not find them. Both categories have serious arguments in their favor.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Communication Windows and Gigayear Timescales',
      level: 2,
      paragraphs: [
        'There is also a purely practical explanation: the chances of catching another civilization at the right moment ' +
        'are extremely small even if they exist in large numbers. ' +
        'Consider the scale: the galaxy has existed for more than ten billion years. ' +
        'Human technological civilization in its current form spans a few hundred years. ' +
        'Even if civilizations are common, most of them arose and faded, ' +
        'or have not yet arisen, or are at a stage where they do not transmit signals ' +
        'that overlap with our observation window.',

        'Moreover, the radio signals we have been broadcasting since the middle of the twentieth century ' +
        'have traveled only about one hundred light-years — a tiny corner of a galaxy ' +
        'more than one hundred thousand light-years across. ' +
        'We ourselves are visible only to our nearest galactic neighbors.',

        'Gigayear timescales overturn intuition. ' +
        'If civilizations arise in the galaxy at a rate of one per billion years, ' +
        'the probability that two of them coexist within the same million-year window is very small. ' +
        'Perhaps we are early — and future civilizations will find our records in the distant future.',
      ],
    },

    {
      heading: 'What Recent JWST Data Says',
      level: 2,
      paragraphs: [
        'In the early decades of the twenty-first century, JWST began systematically analyzing ' +
        'the atmospheres of exoplanets in habitable zones — something previously thought technically impossible. ' +
        'Results so far are sobering: in the TRAPPIST-1 system, ' +
        'the inner planets show signs of lacking a dense atmosphere, ' +
        'while a disputed signal of possible dimethyl sulfide in the atmosphere of K2-18b awaits confirmation.',

        'But every non-detection is also information. ' +
        'It constrains the space of possibilities and helps build a statistical picture of ' +
        'how common planets with Earth-like atmospheres actually are. ' +
        'If the nearest habitable zones around M-dwarfs prove systematically atmosphere-free, ' +
        'that will push the estimates of the fl factor in the Drake equation downward.',

        'The Drake equation and the Fermi paradox remain open. ' +
        'This is not a flaw — it is their most important feature. ' +
        'They are a framework within which knowledge accumulates. ' +
        'Every new atmospheric measurement, every closer look at Martian rocks, ' +
        'every rare molecule in Enceladus\'s plumes narrows the interval of uncertainty. ' +
        'The answer may turn out to be tragic, or astonishing, or simply empty. ' +
        'We do not yet know — and that itself is remarkable.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Drake equation',
      definition:
        'A formula proposed by Frank Drake in 1961 that estimates the number of technological civilizations in the Milky Way as a product of seven parameters — from the rate of star formation to the lifespan of civilizations.',
    },
    {
      term: 'Fermi paradox',
      definition:
        'The contradiction between estimates of the large number of potential extraterrestrial civilizations in the galaxy and the complete absence of any detected traces of them — signals, artifacts, or colonists.',
    },
    {
      term: 'Great Filter',
      definition:
        'A hypothetical barrier or series of barriers in the evolution from chemistry to galactic civilization, through which only exceptional cases pass. It may lie in our past or still lie ahead of our civilization.',
    },
    {
      term: 'Rare Earth hypothesis',
      definition:
        'The view that the combination of conditions making Earth suitable for complex life — a large moon, a giant shield planet, plate tectonics, a stable star — is a statistically improbable convergence rather than the norm.',
    },
    {
      term: 'Zoo hypothesis',
      definition:
        'An explanation of the Fermi paradox: advanced civilizations know about us but deliberately refrain from contact — observing from a distance and adhering to a non-interference principle.',
    },
    {
      term: 'Dark Forest hypothesis',
      definition:
        'A model in which rational civilizations hide and preemptively eliminate detected rivals, because resources are finite and any unknown civilization represents a potential existential threat.',
    },
    {
      term: 'Von Neumann probe',
      definition:
        'A hypothetical self-replicating spacecraft capable of manufacturing copies of itself from local resources and spreading through the galaxy. The absence of such probes is one of the arguments underpinning the Fermi paradox.',
    },
    {
      term: 'Search for extraterrestrial intelligence',
      definition:
        'A scientific field using radio telescopes and other instruments to detect artificial signals or artifacts of extraterrestrial origin. Systematic searches began in the second half of the twentieth century.',
    },
    {
      term: 'Factor L (civilization lifespan)',
      definition:
        'The final multiplier in the Drake equation — the average lifespan of a technological civilization in years. It is both the most uncertain parameter and the most influential on the final result.',
    },
  ],

  quiz: [
    {
      question: 'What is the primary purpose of the Drake equation?',
      options: [
        'To precisely count the number of civilizations in the galaxy using telescope observations',
        'To systematize the questions and uncertainties surrounding the existence of extraterrestrial civilizations',
        'To prove that humanity is the only intelligent civilization in the universe',
        'To calculate the time needed for complete galactic colonization',
      ],
      correctIndex: 1,
      explanation:
        'The Drake equation does not give a precise answer — it breaks a complex question into component parts and reveals where the key uncertainties lie. It is a tool for structuring the discussion, not for performing a calculation.',
    },
    {
      question: 'Why might discovering bacteria on Mars be cause for concern rather than celebration?',
      options: [
        'Because Martian bacteria could infect Earth with dangerous diseases',
        'Because it would mean simple life is common, placing the Great Filter ahead of us',
        'Because it would prove Earth is not unique and humanity is less special',
        'Because bacteria on Mars could compete with future human colonists',
      ],
      correctIndex: 1,
      explanation:
        'If simple life also exists on Mars, the Great Filter is not located at the step of cellular origins. This means the barrier explaining the absence of advanced civilizations lies later in the evolutionary chain — possibly directly ahead of us.',
    },
    {
      question: 'Which parameter of the Drake equation is most influential and least constrained?',
      options: [
        'The rate of star formation in the galaxy',
        'The fraction of stars that have planets',
        'The average lifespan of a technological civilization',
        'The number of planets in the habitable zone per stellar system',
      ],
      correctIndex: 2,
      explanation:
        'Factor L — the lifespan of a civilization — determines how many of them coexist at any given time. Depending on whether it is measured in hundreds or billions of years, the final answer shifts from near zero to millions. And we have exactly one example: our own civilization.',
    },
    {
      question: 'What does the Hart-Tipler argument say about the Fermi paradox?',
      options: [
        'That the galaxy is too large for colonization at any realistic speed',
        'That even at slow travel speeds any ancient civilization should already have colonized the galaxy',
        'That self-replicating probes are physically impossible under the laws of nature',
        'That civilizations have no motivation for interstellar expansion',
      ],
      correctIndex: 1,
      explanation:
        'Hart and Tipler showed that at any plausible speed of interstellar travel — even a few percent of the speed of light — colonization of the entire galaxy takes far less than its current age. If even one civilization decided to spread, it should already be everywhere.',
    },
    {
      question: 'Which hypothesis explains the silence of the universe by claiming civilizations deliberately hide?',
      options: [
        'The Rare Earth hypothesis',
        'The Great Filter (ahead of us)',
        'The Dark Forest hypothesis',
        'The transcendence hypothesis',
      ],
      correctIndex: 2,
      explanation:
        'The Dark Forest hypothesis argues that the rational strategy for any civilization is silence and the preemptive elimination of detected rivals, because resources are finite and any unknown civilization is a potential threat. Silence in the universe is the consequence of this logic.',
    },
  ],

  sources: [
    {
      title: 'Drake F. — Project Ozma and the Green Bank Conference 1961',
      url: 'https://www.seti.org/drake-equation',
      meta: 'SETI Institute — historical account of the 1961 Green Bank meeting and Drake equation origin',
    },
    {
      title: 'Hart M.H. — Explanation for the Absence of Extraterrestrials on Earth',
      url: 'https://ui.adsabs.harvard.edu/abs/1975QJRAS..16..128H',
      meta: 'Quarterly Journal of the Royal Astronomical Society, 16, 128–135, 1975',
    },
    {
      title: 'Hanson R. — The Great Filter — Are We Almost Past It?',
      url: 'https://mason.gmu.edu/~rhanson/greatfilter.html',
      meta: 'George Mason University working paper, 1998 — foundational essay on the Great Filter concept',
    },
    {
      title: 'Ward P.D., Brownlee D. — Rare Earth: Why Complex Life Is Uncommon in the Universe',
      url: 'https://link.springer.com/book/9780387987019',
      meta: 'Copernicus Books, 2000 — key text on the Rare Earth hypothesis',
    },
    {
      title: 'Lineweaver C.H. et al. — The Galactic Habitable Zone and the Age Distribution of Complex Life',
      url: 'https://arxiv.org/abs/astro-ph/0401024',
      meta: 'Science, 303, 59–62, 2004 (open access preprint)',
    },
    {
      title: 'Cirkovic M.M. — The Fermi Paradox: The Last Challenge for Copernicanism?',
      url: 'https://arxiv.org/abs/0907.3432',
      meta: 'Serbian Astronomical Journal, 178, 1–20, 2009 (open access)',
    },
    {
      title: 'Bostrom N. — Where Are They? Why I Hope the Search for Extraterrestrial Life Finds Nothing',
      url: 'https://www.nickbostrom.com/extraterrestrial.pdf',
      meta: 'MIT Technology Review, 2008 — essay on the implications of finding primitive extraterrestrial life',
    },
    {
      title: 'Webb S. — If the Universe Is Teeming with Aliens... Where Is Everybody?',
      url: 'https://link.springer.com/book/9783319132358',
      meta: 'Springer, 2015 (2nd ed.) — comprehensive survey of 75 solutions to the Fermi Paradox',
    },
    {
      title: 'NASA Exoplanet Archive — Confirmed Exoplanet Statistics',
      url: 'https://exoplanetarchive.ipac.caltech.edu/',
      meta: 'Caltech/IPAC, updated 2026 — source for fp and ne parameter estimates',
    },
    {
      title: 'JWST Early Release Science — TRAPPIST-1 Atmospheric Constraints',
      url: 'https://arxiv.org/abs/2301.04191',
      meta: 'Nature Astronomy, 2023 (open access) — latest JWST data on M-dwarf habitable zone planets',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
