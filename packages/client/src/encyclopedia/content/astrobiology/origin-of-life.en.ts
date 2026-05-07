import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'origin-of-life',
  language: 'en',
  section: 'astrobiology',
  order: 7,
  difficulty: 'intermediate',
  readingTimeMin: 13,
  title: 'Origin of Life on Earth',
  subtitle:
    'From dead molecules to the first cell. How chemistry crossed a threshold we still do not fully understand.',

  hero: {
    cacheKey: 'origin-of-life-hero',
    prompt:
      'Photorealistic scientific illustration for a science encyclopedia: the origin of life on early Earth. ' +
      'A volcanic primordial ocean under a stormy orange-red sky, lightning bolts striking the ocean surface, ' +
      'shallow tidal pools along a dark rocky coastline with visible chemical reactions, ' +
      'underwater hydrothermal vents glowing orange-white on the seafloor in the background. ' +
      'Hard sci-fi style, dark and dramatic atmosphere. ' +
      'Add the following text labels on the image: "early Earth ~4 billion years ago", "primordial ocean", "hydrothermal vents".',
    alt: 'Early Earth — a stormy ocean, volcanic coastline, lightning, and hydrothermal vents on the seafloor',
    caption:
      'Early Earth was radically different from today: a dense atmosphere without free oxygen, relentless volcanism, and meteorite bombardment. It was in these conditions, roughly four billion years ago, that what we call life arose.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Earth formed approximately four and a half billion years ago from a cloud of gas and dust. ' +
        'Within a billion years — geologically astonishing speed — it had produced something found ' +
        'nowhere else in the confirmed universe: living organisms. ' +
        'The oldest microbial traces discovered in Western Australia — flat layered structures known as stromatolites — ' +
        'are approximately three and a half billion years old. ' +
        'These are the oldest known evidence that cellular life already existed on Earth.',

        'The gap between the planet\'s formation and those earliest known microbes is roughly a billion years. ' +
        'During that interval, something happened that we still cannot precisely reproduce or explain: ' +
        'non-living molecules self-organized into structures capable of storing information, copying it, and evolving. ' +
        'That question is the origin-of-life question. It remains one of the greatest open problems in science.',

        'No single universally accepted theory exists. There are several competing hypotheses, each supported by ' +
        'its own laboratory data and each carrying its own gaps. ' +
        'The science of life\'s origin is not a repository of ready answers — ' +
        'it is an active research frontier where new results appear every year and old assumptions are regularly revised.',
      ],
    },

    {
      heading: 'Early Earth: What Was Already on the Table',
      level: 2,
      paragraphs: [
        'To evaluate the hypotheses, it helps to understand the setting. Early Earth looked nothing like today. ' +
        'The atmosphere consisted mainly of methane, ammonia, carbon dioxide, water vapor, and molecular hydrogen — ' +
        'with no free oxygen. Oxygen would appear much later, produced by photosynthesizing bacteria. ' +
        'The sky was reddish or orange. Ultraviolet radiation from the young Sun reached the surface unimpeded — ' +
        'there was no ozone layer.',

        'Volcanism dominated the surface: constant eruptions provided a chemically active environment. ' +
        'Meteorite bombardment — especially during the so-called **Late Heavy Bombardment** — delivered organic molecules ' +
        'from space: amino acids and nucleotide bases have been found in meteorites to this day. ' +
        'This means the raw materials for the chemistry of life may have been present on the planet ' +
        'even before life itself arose.',

        'The first living cell — call it the _Last Universal Common Ancestor_ — had to synthesize molecules ' +
        'for its own reproduction using energy from the surrounding environment. ' +
        'But between having amino acids and operating as a functioning cell lies a chasm ' +
        'that no hypothesis has yet fully bridged.',
      ],
    },

    {
      image: {
        cacheKey: 'origin-of-life-early-earth-chemistry',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: early Earth atmosphere chemistry. ' +
          'Diagram showing the early Earth chemical environment: ' +
          'a stormy orange sky with lightning, volcanic emissions labeled as methane, ammonia, CO2, H2, ' +
          'ultraviolet rays from the young Sun striking the surface, shallow ocean with dissolved organic molecules, ' +
          'meteorites delivering organic compounds from space shown as streaks of light. ' +
          'Hard sci-fi style, dark dramatic colors. ' +
          'Add the following text labels on the image: "CH4, NH3, CO2, H2", "UV radiation (no ozone)", "meteorite organics", "shallow pools".',
        alt: 'Chemical environment of early Earth: oxygen-free atmosphere, ultraviolet radiation, volcanoes, and meteorites with organics',
        caption:
          'The early terrestrial atmosphere was reducing — no free oxygen. Ultraviolet light, lightning, and volcanic heat supplied the energy for chemical reactions. Meteorites delivered ready-made organic molecules from outer space.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'The Primordial Soup: Oparin, Haldane, and the Miller-Urey Experiment',
      level: 2,
      paragraphs: [
        'The first systematic hypothesis about the origin of life emerged in the first half of the twentieth century. ' +
        'Independently of each other, the Soviet biochemist Alexander Oparin and the British scientist John Haldane ' +
        'proposed that the early Earth atmosphere and ocean were rich in simple organic molecules. ' +
        'These molecules gradually grew more complex, reacting with each other in the presence of external energy — ' +
        'lightning, ultraviolet light, volcanic heat. ' +
        'Concentrated in water bodies, they slowly formed proto-cellular structures. ' +
        'The idea became known as the "primordial soup" hypothesis.',

        'In 1953, American chemists Stanley Miller and Harold Urey tested this idea in the laboratory. ' +
        'They filled a sealed vessel with a mixture they considered analogous to the early Earth atmosphere: ' +
        'methane, ammonia, hydrogen, and water vapor. They passed electrical discharges through this mixture — ' +
        'a model of lightning. Within a week, **amino acids** had formed in the vessel — the building blocks of proteins. ' +
        'This was the first direct evidence that complex organic molecules can arise from simple substances ' +
        'under early-Earth conditions.',

        'The Miller-Urey experiment became iconic. But later research showed that the actual composition ' +
        'of the early atmosphere probably differed from what the scientists used: it likely contained more ' +
        'carbon dioxide and less methane. Repeated experiments with different gas mixtures produced less ' +
        'dramatic but still positive results — organic molecules form under a variety of conditions. ' +
        'The challenge lies elsewhere: from amino acids to the first replicators, the distance is far larger.',
      ],
    },

    {
      diagram: {
        title: 'The Miller-Urey Experiment (1953)',
        svg: `<svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="380" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Miller-Urey Experiment — Amino Acid Synthesis (1953)</text>

  <!-- Main reaction flask (large, left) -->
  <ellipse cx="170" cy="120" rx="70" ry="20" fill="rgba(68,136,170,0.15)" stroke="#4488aa" stroke-width="1.5"/>
  <line x1="100" y1="120" x2="100" y2="200" stroke="#4488aa" stroke-width="1.5"/>
  <line x1="240" y1="120" x2="240" y2="200" stroke="#4488aa" stroke-width="1.5"/>
  <path d="M100,200 Q170,250 240,200" fill="rgba(68,136,170,0.15)" stroke="#4488aa" stroke-width="1.5"/>
  <!-- Gas labels inside flask -->
  <text x="170" y="145" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">CH4, NH3, H2</text>
  <text x="170" y="160" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">H2O (vapor)</text>
  <!-- Flask label -->
  <text x="170" y="270" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">gas flask</text>
  <text x="170" y="283" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">(atmosphere)</text>

  <!-- Lightning bolts (electrodes) -->
  <line x1="130" y1="100" x2="130" y2="65" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="210" y1="100" x2="210" y2="65" stroke="#aabbcc" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="110" y="58" fill="#aabbcc" font-family="monospace" font-size="9">+</text>
  <text x="205" y="58" fill="#aabbcc" font-family="monospace" font-size="9">-</text>
  <!-- Lightning shape -->
  <polyline points="155,100 163,120 155,120 165,142" fill="none" stroke="#ff8844" stroke-width="2"/>
  <text x="172" y="115" fill="#ff8844" font-family="monospace" font-size="9">discharge</text>

  <!-- Arrow right from flask -->
  <line x1="245" y1="170" x2="300" y2="170" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Condenser (middle) -->
  <rect x="305" y="140" width="80" height="60" rx="4" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="345" y="168" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">condenser</text>
  <!-- cooling lines -->
  <line x1="305" y1="155" x2="295" y2="155" stroke="#7bb8ff" stroke-width="1"/>
  <line x1="305" y1="185" x2="295" y2="185" stroke="#7bb8ff" stroke-width="1"/>
  <text x="288" y="172" fill="#7bb8ff" font-family="monospace" font-size="8" text-anchor="middle">H2O</text>

  <!-- Arrow right from condenser -->
  <line x1="390" y1="170" x2="450" y2="170" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Collection flask (right) -->
  <ellipse cx="540" cy="155" rx="60" ry="15" fill="rgba(68,255,136,0.12)" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="480" y1="155" x2="480" y2="230" stroke="#44ff88" stroke-width="1.5"/>
  <line x1="600" y1="155" x2="600" y2="230" stroke="#44ff88" stroke-width="1.5"/>
  <path d="M480,230 Q540,270 600,230" fill="rgba(68,255,136,0.12)" stroke="#44ff88" stroke-width="1.5"/>
  <!-- Product dots -->
  <circle cx="520" cy="210" r="4" fill="#44ff88" opacity="0.7"/>
  <circle cx="545" cy="220" r="3" fill="#44ff88" opacity="0.5"/>
  <circle cx="565" cy="205" r="4" fill="#44ff88" opacity="0.6"/>
  <text x="540" y="248" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="middle">amino acids</text>
  <text x="540" y="261" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">and other organics</text>

  <!-- Bottom label -->
  <text x="350" y="310" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">CH4 + NH3 + H2 + H2O + electrical discharge → amino acids</text>
  <text x="350" y="326" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">5 amino acids formed within one week (over 20 confirmed in later variations)</text>

  <!-- Arrow marker -->
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#44ff88"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'In 1953, Stanley Miller and Harold Urey recreated early-Earth conditions in a laboratory vessel. ' +
          'A gas mixture subjected to electrical discharges produced amino acids within one week — ' +
          'the first direct proof that organic molecules can arise abiotically.',
      },
    },

    {
      heading: 'Hydrothermal Vents: A Cradle on the Ocean Floor',
      level: 2,
      paragraphs: [
        'From the 1970s onward, a different hypothesis gained significant momentum. ' +
        'After the discovery of black smokers — hydrothermal vents on the floor of the Pacific Ocean — ' +
        'it became clear that an abundant chemosynthetic ecosystem existed there, ' +
        'completely independent of sunlight. ' +
        'Tube worms, crabs, bacteria — entire ecosystems living on the chemical energy of sulfides. ' +
        'This opened an imaginative leap: what if the very bottom of the ocean was where life first arose?',

        'An even more compelling version emerged around **alkaline hydrothermal vents** — ' +
        'the so-called white smokers, exemplified by the Lost City hydrothermal field in the Atlantic Ocean, ' +
        'discovered at the start of the twenty-first century. ' +
        'Unlike black smokers, these vents are not extremely hot, and they generate a natural proton gradient — ' +
        'a difference in hydrogen ion concentration between the alkaline vent fluid and the mildly acidic ocean. ' +
        'That same gradient is used by virtually all living cells today to produce adenosine triphosphate — ' +
        'the molecule that serves as the universal energy currency of life.',

        'The British biochemist Michael Russell and his colleagues proposed a detailed scenario: ' +
        'microporous mineral walls of alkaline vents could serve as natural membranes, ' +
        'concentrating organic molecules and sustaining a proton gradient without any proteins. ' +
        'If so, the first proto-cell did not arise in the open ocean but inside a mineral pore ' +
        'the size of a micrometer. This hypothesis carries serious support among contemporary researchers, ' +
        'though it too leaves critical steps unexplained.',
      ],
    },

    {
      image: {
        cacheKey: 'origin-of-life-hydrothermal-vents',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: alkaline hydrothermal vents on the seafloor of early Earth. ' +
          'Underwater scene showing white chimney-like mineral structures (Lost City style white smokers) rising from a dark rocky seafloor, ' +
          'warm fluid glowing pale white-blue rising from vent openings, ' +
          'microscopic organic molecules shown schematically in the vent fluid, ' +
          'surrounding cold dark ocean water. ' +
          'Hard sci-fi style, dark deep ocean background. ' +
          'Add the following text labels on the image: "alkaline vent fluid", "proton gradient", "mineral pores", "cold ocean water".',
        alt: 'Alkaline hydrothermal vents on the ancient ocean floor — mineral cells with a natural proton gradient as the cradle of cellular chemistry',
        caption:
          'Alkaline hydrothermal vents of the Lost City type generate a natural proton gradient between the alkaline vent fluid and the more acidic ocean. That same principle is used by all modern cells to produce energy — a correspondence that may not be coincidental.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The Iron-Sulfur World: Chemistry on Mineral Surfaces',
      level: 2,
      paragraphs: [
        'In parallel, the iron-sulfur world hypothesis developed — proposed by Gunter Wachtershauser. ' +
        'His idea: the earliest life chemistry did not happen in aqueous solution but on the surfaces of minerals — ' +
        'specifically pyrite (iron fool\'s gold). Pyrite has a positively charged surface that attracts and holds ' +
        'organic anions, raising their local concentration. ' +
        'On such a surface, the first synthetic reactions could have occurred — without any enzyme.',

        'Wachtershauser proposed a specific chemical cycle — analogous to the Krebs cycle — ' +
        'that explained the gradual buildup of molecular complexity from simple to more elaborate compounds. ' +
        'Some key reactions were reproduced in the laboratory. ' +
        'But no one has yet shown how such a surface chemical cycle could give rise to a replicator — ' +
        'a molecule capable of copying itself. ' +
        'And that is the central unsolved problem in all chemical hypotheses.',
      ],
    },

    {
      heading: 'Warm Little Ponds: Nucleotide Synthesis Under Ultraviolet Light',
      level: 2,
      paragraphs: [
        'In 2009, chemist John Sutherland published work that renewed interest in the primordial soup ' +
        'from a new angle. His team showed how ribonucleotides — the building blocks of ' +
        'ribonucleic acid — can be synthesized from simple molecules: ' +
        'hydrogen cyanide, hydrogen sulfide, and ultraviolet radiation. ' +
        'The key conditions were warm, shallow pools that alternated between wet and dry states: ' +
        'ones where reagent concentration rises as the pool dries and dissolves again when it refills.',

        'Sutherland\'s work mattered because it bypassed one of the main criticisms of the primordial soup: ' +
        'that highly dilute solutions cannot achieve the concentrations needed for productive reactions. ' +
        'Shallow pools with wetting and drying cycles provide exactly that concentration. ' +
        'This picture fits naturally with geologically active coastal zones on early Earth.',
      ],
    },

    {
      heading: 'The RNA World: One Molecule That Did Everything',
      level: 2,
      paragraphs: [
        'Any serious theory of life\'s origin must explain a fundamental puzzle: ' +
        'the modern cell requires proteins to replicate deoxyribonucleic acid, ' +
        'but those proteins are themselves encoded in deoxyribonucleic acid. What came first? ' +
        'This is the chicken-and-egg dilemma at the molecular level.',

        'An elegant way out was offered by the **RNA World hypothesis**. ' +
        'In 1982, Thomas Cech discovered that ribonucleic acid — a molecule previously thought to be ' +
        'merely a messenger between gene and protein — can act as a **ribozyme**: ' +
        'it can catalyze chemical reactions, just as protein enzymes do. ' +
        'This discovery upended molecular biology and earned Cech the Nobel Prize.',

        'If ribonucleic acid can simultaneously store information and catalyze reactions, ' +
        'then at some point in early chemical evolution there may have existed a molecule ' +
        'that catalyzed its own copying. This self-replicating ribonucleic acid would have been ' +
        'the first primitive "gene." ' +
        'The RNA World hypothesis proposes a scenario in which ribonucleic acid arose first, ' +
        'deoxyribonucleic acid later evolved as a more stable information store, ' +
        'and proteins emerged as more efficient catalysts.',

        'The main weakness: demonstrating how ribonucleic acid arose chemically from simple molecules, ' +
        'and how it began to self-copy without protein assistance, has not yet been achieved in full. ' +
        'Chemists have synthesized short self-replicating ribonucleic acid molecules in the laboratory, ' +
        'but these systems remain far from the complexity of even the most primitive known organism.',
      ],
    },

    {
      diagram: {
        title: 'From the RNA World to the Modern Cell',
        svg: `<svg viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="320" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Molecular Evolution: From RNA World to Modern Cell</text>

  <!-- Stage 1: RNA world -->
  <rect x="30" y="50" width="140" height="160" rx="4" fill="rgba(68,136,170,0.1)" stroke="#4488aa" stroke-width="1.5"/>
  <text x="100" y="72" fill="#7bb8ff" font-family="monospace" font-size="10" text-anchor="middle">Stage 1</text>
  <text x="100" y="86" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">RNA World</text>
  <!-- RNA symbol -->
  <path d="M65,115 Q100,95 135,115 Q100,135 65,115" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <path d="M65,140 Q100,120 135,140 Q100,160 65,140" fill="none" stroke="#7bb8ff" stroke-width="2"/>
  <text x="100" y="182" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">RNA stores</text>
  <text x="100" y="195" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">and catalyzes</text>

  <!-- Arrow 1 -->
  <line x1="172" y1="130" x2="210" y2="130" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arr2)"/>
  <text x="191" y="122" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">lipid</text>
  <text x="191" y="132" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">membrane</text>

  <!-- Stage 2: Protocell -->
  <rect x="215" y="50" width="140" height="160" rx="4" fill="rgba(68,255,136,0.08)" stroke="#44ff88" stroke-width="1.5"/>
  <text x="285" y="72" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">Stage 2</text>
  <text x="285" y="86" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">Protocell</text>
  <!-- protocell circle -->
  <circle cx="285" cy="135" r="35" fill="rgba(68,255,136,0.06)" stroke="#44ff88" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="285" y="131" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">RNA</text>
  <text x="285" y="143" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">inside</text>
  <text x="285" y="192" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">RNA + membrane</text>

  <!-- Arrow 2 -->
  <line x1="357" y1="130" x2="395" y2="130" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arr2)"/>
  <text x="376" y="122" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">proteins</text>
  <text x="376" y="132" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">appear</text>

  <!-- Stage 3: RNA+Protein -->
  <rect x="400" y="50" width="140" height="160" rx="4" fill="rgba(255,136,68,0.08)" stroke="#ff8844" stroke-width="1.5"/>
  <text x="470" y="72" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Stage 3</text>
  <text x="470" y="86" fill="#aabbcc" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">RNA + Proteins</text>
  <circle cx="470" cy="130" r="35" fill="rgba(255,136,68,0.06)" stroke="#ff8844" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="470" y="126" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">RNA</text>
  <text x="470" y="138" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">+ enzymes</text>
  <text x="470" y="192" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">RNA encodes proteins</text>

  <!-- Arrow 3 -->
  <line x1="542" y1="130" x2="576" y2="130" stroke="#44ff88" stroke-width="1.5" marker-end="url(#arr2)"/>
  <text x="559" y="122" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">DNA</text>
  <text x="559" y="132" fill="#667788" font-family="monospace" font-size="8" text-anchor="middle">appears</text>

  <!-- Stage 4: DNA cell label -->
  <rect x="580" y="70" width="95" height="60" rx="4" fill="rgba(204,68,68,0.1)" stroke="#cc4444" stroke-width="1.5"/>
  <text x="628" y="92" fill="#cc4444" font-family="monospace" font-size="10" text-anchor="middle">Stage 4</text>
  <text x="628" y="107" fill="#aabbcc" font-family="monospace" font-size="10" text-anchor="middle" font-weight="bold">DNA cell</text>
  <text x="628" y="120" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">(LUCA)</text>

  <!-- Arrow marker -->
  <defs>
    <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#44ff88"/>
    </marker>
  </defs>

  <!-- Bottom note -->
  <text x="350" y="245" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Hypothesis: RNA arose first → learned to encode proteins → transferred information storage to DNA</text>
  <text x="350" y="260" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">None of these transitions has been fully reproduced in the laboratory</text>
</svg>`,
        caption:
          'The RNA World hypothesis proposes that a ribonucleic acid molecule capable of both storing genetic information ' +
          'and catalyzing reactions existed first. ' +
          'Proteins later emerged as more efficient catalysts, and deoxyribonucleic acid as a more stable information store. ' +
          'This entire transition remains an open question.',
      },
    },

    {
      heading: 'The Last Universal Common Ancestor: What We Know About the First Cell',
      level: 2,
      paragraphs: [
        'Although we do not know how the first living thing arose, we can reconstruct something ' +
        'about the most ancient common ancestor of all living organisms on Earth. ' +
        'It is called the _Last Universal Common Ancestor_ — often abbreviated to LUCA. ' +
        'LUCA is not the first cell and not the "beginning" of life. ' +
        'It is the most recent organism from which all three domains of modern life descend: ' +
        'bacteria, archaea, and eukaryotes.',

        'Comparing genes shared across all three domains allows researchers to reconstruct some of LUCA\'s properties. ' +
        'It almost certainly already had a cell membrane, used a proton gradient to synthesize adenosine triphosphate, ' +
        'possessed ribosomes for protein synthesis, and carried a genetic code based on deoxyribonucleic acid. ' +
        'Most researchers believe LUCA was an **autotroph** — synthesizing its own organic molecules ' +
        'from inorganic precursors rather than consuming ready-made organic matter from outside. ' +
        'And most likely it was an **anaerobe** — it required no free oxygen, ' +
        'which did not yet exist in the early Earth atmosphere.',

        'Some researchers argue that LUCA lived at alkaline hydrothermal vents: ' +
        'its metabolism depended on a proton gradient of exactly the kind those vents naturally produce. ' +
        'But LUCA is already a complex organism. ' +
        'Between the first self-replicating molecule and LUCA lies a large portion of the evolutionary chasm ' +
        'that we currently fill only with reasoned speculation.',
      ],
    },

    {
      image: {
        cacheKey: 'origin-of-life-luca-tree',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: tree of life rooted at LUCA. ' +
          'A stylized phylogenetic tree diagram on a dark background: ' +
          'a single root labeled "LUCA" (Last Universal Common Ancestor) at the bottom center, ' +
          'three major branches rising upward labeled "Bacteria", "Archaea", "Eukarya", ' +
          'bacteria branch showing diverse microbial shapes, archaea branch showing thermophilic microbes, ' +
          'eukarya branch showing single-celled protists, fungi, plants, animals. ' +
          'Hard sci-fi style, minimal, monospace font labels, dark space-like background. ' +
          'Add the following text labels on the image: "LUCA", "Bacteria", "Archaea", "Eukarya".',
        alt: 'Tree of life rooted at LUCA — the Last Universal Common Ancestor of bacteria, archaea, and eukaryotes',
        caption:
          'All known living organisms on Earth descend from a single common ancestor — LUCA. Comparing genomes allows us to reconstruct some of its properties: an anaerobe, an autotroph, already equipped with ribosomes and a genetic code.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Panspermia: Delivered by the Mail of Stars',
      level: 2,
      paragraphs: [
        'There is another answer — or more precisely, a relocation of the question. ' +
        'The _panspermia_ hypothesis holds that living organisms or their chemical precursors ' +
        'could have been delivered to Earth from elsewhere — by meteorites, comets, or even interstellar dust. ' +
        'Can microbial life survive a journey through open space? ' +
        'Certain bacteria can. Micrococcus and spore-forming bacteria have survived prolonged exposures ' +
        'in open space under radiation, shielded by a few millimeters of rock.',

        'But panspermia does not resolve the central question: it merely relocates the site of life\'s origin ' +
        'from Earth to some other body. The stronger version — **chemical panspermia** — ' +
        'claims only that organic molecules (amino acids, nucleotide bases) ' +
        'could have been delivered by meteorites. This is well supported: ' +
        'the Murchison carbonaceous chondrite that fell in Australia in the twentieth century ' +
        'contained more than a hundred amino acids, including those found in terrestrial proteins. ' +
        'Organic chemistry permeates the cosmos — the question is whether that is sufficient to trigger the transition to life.',
      ],
    },

    {
      image: {
        cacheKey: 'origin-of-life-murchison-meteorite',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: the Murchison carbonaceous chondrite meteorite. ' +
          'A dark gray-brown rocky meteorite fragment on a laboratory examination surface, ' +
          'close-up showing crystalline mineral structure and dark carbonaceous matrix, ' +
          'small molecular diagrams floating nearby labeled as amino acids and nucleobases, ' +
          'a researcher hand (silhouette only, no face) holding a magnifying glass in the background. ' +
          'Hard sci-fi science encyclopedia style, dark muted background. ' +
          'Add the following text labels on the image: "Murchison meteorite (1969)", "amino acids detected", "nucleobases detected".',
        alt: 'The Murchison meteorite — a carbonaceous chondrite containing over a hundred amino acids, recovered in the twentieth century',
        caption:
          'Carbonaceous chondrites such as Murchison contain complex organic molecules: amino acids, nucleotide bases, fatty acids. They demonstrate that the chemistry prerequisite for life is distributed throughout the universe — not a uniquely terrestrial phenomenon.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'What We Still Do Not Know',
      level: 2,
      paragraphs: [
        'After more than seven decades of intensive research, the origin-of-life question remains open. ' +
        'We know more than ever before: amino acid synthesis can be reproduced, ' +
        'nucleotides can be assembled under plausible conditions, ribonucleic acid can act as a catalyst, ' +
        'and lipid vesicles self-assemble in solution. ' +
        'But no one has yet demonstrated in the laboratory a closed chain ' +
        'running from dead molecules to a self-replicating system.',

        'The key open questions: how did the transition from a chemical system to a genetically encoded one occur? ' +
        'How did the first membranes and the first replicators arise simultaneously and become interdependent? ' +
        'How did the genetic code — the table linking nucleotide triplets to amino acids — ' +
        'take the specific form it has, rather than any other? ' +
        'These are not minor details: each is a separate scientific problem in its own right.',

        'It is also worth remembering: we are studying an event that occurred once — or possibly a few times — ' +
        'roughly four billion years ago, and left no direct documentary record. ' +
        'We reconstruct it from indirect evidence. ' +
        'This does not mean we are in principle unable to answer this question. ' +
        'But it does mean the answer requires far more effort than seemed apparent in the twentieth century. ' +
        'And it may well turn out to be surprising.',
      ],
    },

    {
      image: {
        cacheKey: 'origin-of-life-open-question',
        prompt:
          'Photorealistic scientific illustration for a science encyclopedia: the gap between chemistry and life. ' +
          'Abstract visualization showing a deep dark chasm between two rocky cliffs: ' +
          'on the left cliff, labeled "chemistry" — simple molecular diagrams of amino acids, nucleotides, lipids floating in a warm orange glow, ' +
          'on the right cliff, labeled "life" — a glowing green single cell with a visible membrane and genetic material inside, ' +
          'the chasm between them filled with question marks and unexplored darkness. ' +
          'Hard sci-fi style, dramatic and conceptual. ' +
          'Add the following text labels on the image: "chemistry", "???", "life".',
        alt: 'Conceptual illustration of the gap between chemical molecules and the first living cell — an open scientific question',
        caption:
          'From amino acids, nucleotides, and lipids to a self-replicating cell — a distance science has not yet fully crossed. The answer may turn out to be surprising and may rewrite our understanding of the possibility of life elsewhere in the universe.',
        aspectRatio: '16:9',
      },
    },
  ],

  glossary: [
    {
      term: 'Abiogenesis',
      definition:
        'The emergence of life from non-life — the process by which inorganic or simple organic molecules self-organized into structures capable of replication and evolution. Fundamentally distinct from biogenesis (life arising from existing life).',
    },
    {
      term: 'Last Universal Common Ancestor',
      definition:
        'The most recent organism from which all three domains of modern life descend: bacteria, archaea, and eukaryotes. It was most likely an anaerobic autotroph that used a proton gradient to synthesize adenosine triphosphate.',
    },
    {
      term: 'Ribozyme',
      definition:
        'A ribonucleic acid molecule capable of catalyzing chemical reactions — analogous to protein enzymes. Discovered by Thomas Cech in 1982; a central argument in the RNA World hypothesis.',
    },
    {
      term: 'Hydrothermal vent',
      definition:
        'An opening on the seafloor that releases superheated, mineral-rich fluid. Alkaline hydrothermal vents (white smokers) generate a natural proton gradient and are considered one of the most plausible environments for the origin of cellular metabolism.',
    },
    {
      term: 'Adenosine triphosphate',
      definition:
        'The molecule that serves as the universal energy currency of living cells. Nearly all living cells synthesize adenosine triphosphate using a proton gradient across a membrane — a mechanism that may have arisen very early in evolution.',
    },
    {
      term: 'Panspermia',
      definition:
        'The hypothesis that living organisms or their chemical precursors could have been delivered to Earth from space — by meteorites or comets. It does not resolve the question of how life originally arose, but it extends the possible setting of that event.',
    },
    {
      term: 'Stromatolite',
      definition:
        'A flat or domed mineral structure formed by microbial mats. The oldest known stromatolites are approximately three and a half billion years old and represent the earliest known evidence of microbial life on Earth.',
    },
    {
      term: 'Proton gradient',
      definition:
        'A difference in hydrogen ion concentration across a membrane. All known living cells use this gradient to synthesize adenosine triphosphate. A natural version of this gradient exists in alkaline hydrothermal vents.',
    },
    {
      term: 'Primordial soup',
      definition:
        'A hypothetical state of early Earth\'s oceans: water bodies rich in organic molecules where chemical synthesis was driven by lightning and ultraviolet light. Proposed independently by Alexander Oparin and John Haldane in the first half of the twentieth century.',
    },
  ],

  quiz: [
    {
      question: 'What did the Miller-Urey experiment in 1953 demonstrate?',
      options: [
        'That the first living cell arose from lightning strikes in the open ocean',
        'That simple organic molecules — amino acids — can be synthesized abiotically from early atmospheric gases',
        'That ribonucleic acid can copy itself without the involvement of proteins',
        'That water is a necessary condition for all chemical reactions leading to life',
      ],
      correctIndex: 1,
      explanation:
        'Miller and Urey passed electrical discharges through a gas mixture (methane, ammonia, hydrogen, water vapor) simulating early Earth conditions. Within one week, amino acids had formed — the first direct proof of abiotic organic synthesis. But from amino acids to the first cell remains a far larger distance.',
    },
    {
      question: 'Why are alkaline hydrothermal vents considered a particularly attractive site for the origin of life?',
      options: [
        'They are located on land, where reagent concentrations are highest',
        'They generate a natural proton gradient — the same mechanism all living cells use to produce energy',
        'Their temperature precisely matches the optimum for enzymatic reactions',
        'They are shielded from ultraviolet radiation, which destroys organic molecules',
      ],
      correctIndex: 1,
      explanation:
        'Alkaline hydrothermal vents such as the Lost City field in the Atlantic produce a natural proton gradient between the alkaline vent fluid and the more acidic ocean. Virtually all modern living cells use this same type of gradient to synthesize adenosine triphosphate. This correspondence supports the idea that the first metabolism originated in such an environment.',
    },
    {
      question: 'What is a ribozyme, and why does its discovery matter for the origin of life?',
      options: [
        'A ribozyme is a protein that synthesizes ribonucleic acid; its discovery explained how the first genes arose',
        'A ribozyme is a ribonucleic acid molecule that can catalyze reactions, eliminating the dilemma of which came first — gene or enzyme',
        'A ribozyme is a cell membrane made of ribonucleic acid that forms the first protocell',
        'A ribozyme is an enzyme found in hydrothermal vents that synthesizes amino acids',
      ],
      correctIndex: 1,
      explanation:
        'Thomas Cech\'s 1982 discovery showed that ribonucleic acid molecules can act as catalysts — like protein enzymes. This resolves a key paradox: the modern cell needs proteins to work with genes, but those proteins are encoded in genes. If ribonucleic acid can both store information and catalyze reactions, it could have arisen first.',
    },
    {
      question: 'What property makes the Last Universal Common Ancestor an important concept for understanding the origin of life?',
      options: [
        'It is the first living cell from which all evolution began',
        'It is the only organism from which bacteria — the most ancient living forms — descend',
        'It is the most recent organism shared by all three domains of life — bacteria, archaea, and eukaryotes — allowing reconstruction of the minimal features of early life',
        'It proves that the first life arose at hydrothermal vents, since archaea live there today',
      ],
      correctIndex: 2,
      explanation:
        'The Last Universal Common Ancestor is not the first cell and not the "start" of evolution. It is the latest common point from which the three domains of modern life diverge. Comparing genomes shared across all domains allows reconstruction of some of its properties: ribosomes, a genetic code, a proton gradient. But it is already complex — simpler life must have preceded it.',
    },
    {
      question: 'Why does panspermia not answer the question of the origin of life?',
      options: [
        'Panspermia contradicts known laws of physics and cannot be a scientific hypothesis',
        'Organic molecules cannot survive the journey through open space inside meteorites',
        'It merely transfers the question of where the first life arose from Earth to another body, without explaining the event itself',
        'Panspermia claims that life on Earth is unique and could not have arisen anywhere else',
      ],
      correctIndex: 2,
      explanation:
        'Panspermia is a legitimate scientific hypothesis, and some microorganisms can indeed survive a space journey in protected conditions. But even if the first life "arrived" from elsewhere, the question of how it arose there remains completely open. Panspermia relocates the problem rather than solving it.',
    },
  ],

  sources: [
    {
      title: 'Miller S.L. — A Production of Amino Acids Under Possible Primitive Earth Conditions',
      url: 'https://www.science.org/doi/10.1126/science.117.3046.528',
      meta: 'Science, 117, 528–529, 1953 — original Miller-Urey experiment paper',
    },
    {
      title: 'Powner M.W., Gerland B., Sutherland J.D. — Synthesis of activated pyrimidine ribonucleotides in prebiotically plausible conditions',
      url: 'https://www.nature.com/articles/nature08013',
      meta: 'Nature, 459, 239–242, 2009 — Sutherland nucleotide synthesis',
    },
    {
      title: 'Cech T.R. — The RNA Worlds in Context',
      url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3258501/',
      meta: 'Cold Spring Harbor Perspectives in Biology, 2012 — review by the discoverer of ribozymes',
    },
    {
      title: 'Russell M.J., Martin W. — The rocky roots of the acetyl-CoA pathway',
      url: 'https://www.cell.com/trends/biochemical-sciences/fulltext/S0968-0004(04)00176-5',
      meta: 'Trends in Biochemical Sciences, 29, 358–363, 2004 — alkaline vent hypothesis',
    },
    {
      title: 'Lane N., Martin W.F. — The origin of membrane bioenergetics',
      url: 'https://www.cell.com/cell/fulltext/S0092-8674(12)01228-7',
      meta: 'Cell, 151, 1406–1416, 2012 — proton gradient and hydrothermal vents',
    },
    {
      title: 'Wachtershauser G. — Before enzymes and templates: theory of surface metabolism',
      url: 'https://www.microbiologyresearch.org/content/journal/micro/10.1099/00221287-139-3-411',
      meta: 'Microbiological Reviews, 52, 452–484, 1988 — iron-sulfur world',
    },
    {
      title: 'Betts H.C. et al. — Integrated genomic and fossil evidence illuminates life\'s early evolution and eukaryote origin',
      url: 'https://www.nature.com/articles/s41559-018-0644-x',
      meta: 'Nature Ecology and Evolution, 2, 1556–1562, 2018 — Last Universal Common Ancestor reconstruction',
    },
    {
      title: 'Pearce B.K.D. et al. — Origin of the RNA World: The Fate of Nucleobases in Warm Little Ponds',
      url: 'https://www.pnas.org/doi/10.1073/pnas.1710339114',
      meta: 'PNAS, 114, 11327–11332, 2017 — warm little ponds and ribonucleic acid',
    },
    {
      title: 'Schmitt-Kopplin P. et al. — High molecular diversity of extraterrestrial organic matter in Murchison meteorite',
      url: 'https://www.pnas.org/doi/10.1073/pnas.0912157107',
      meta: 'PNAS, 107, 2763–2768, 2010 — organic chemistry of the Murchison meteorite',
    },
    {
      title: 'NASA Astrobiology — Origin of Life Overview',
      url: 'https://astrobiology.nasa.gov/research/astrobiology-at-nasa/origin-and-evolution-of-life/',
      meta: 'NASA Astrobiology Program, official resource, updated 2025',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;
