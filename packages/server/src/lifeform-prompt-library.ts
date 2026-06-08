// ---------------------------------------------------------------------------
// Lifeform prompt library (Genesis module)
// ---------------------------------------------------------------------------
// 30 hand-authored "simple" alien organism archetypes used both as a
// deterministic fallback (no LLM call) and as few-shot seeds for the Gemini
// brief generator. Each spec carries three coordinated fragments:
//
//   • appearance — what the organism LOOKS like (feeds the still image:
//     Nano Banana 2 / gemini-3.1-flash-image, or Kling image).
//   • action     — what the organism DOES (feeds Kling V3 image-to-video).
//   • sound      — the ambient soundtrack, NO VOICE (feeds Kling V3 audio).
//
// Art direction is shared via PHOTO_WRAP / VIDEO_WRAP so every output matches
// the game look: dark cosmos (#020510), muted palette, electron-microscope /
// astrobiology aesthetic, no text, no faces, no cartoon.
// ---------------------------------------------------------------------------

export interface LifeformSpec {
  id: string;
  /** Short archetype label (English) — also a species-name seed. */
  archetype: string;
  /** Visual description fragment (still image). */
  appearance: string;
  /** Motion / behaviour fragment (image-to-video). */
  action: string;
  /** Ambient sound description — NO voice, NO music with lyrics. */
  sound: string;
}

export const LIFEFORM_SPECS: LifeformSpec[] = [
  { id: 'cilia-cell', archetype: 'Ciliated Cell',
    appearance: 'a simple translucent single-cell organism fringed with fine beating cilia, a soft inner nucleus glowing faintly',
    action: 'it drifts and rotates slowly, cilia rippling in waves around its membrane',
    sound: 'soft watery shimmer and a faint deep-space hum' },
  { id: 'diatom', archetype: 'Glass Diatom',
    appearance: 'a radial diatom with a glassy silica shell of crystalline geometric symmetry, delicate pores patterning its surface',
    action: 'it pulses gently and turns, light refracting through its glassy shell',
    sound: 'crystalline chimes and a low resonant drone' },
  { id: 'amoeba', archetype: 'Shifting Amoeba',
    appearance: 'a formless gel amoeba with shifting pseudopods, internal vacuoles drifting inside translucent cytoplasm',
    action: 'it slowly extends and retracts pseudopods, reshaping its body as it creeps',
    sound: 'thick viscous squelching and a soft sub-bass pulse' },
  { id: 'microjelly', archetype: 'Micro-Jelly',
    appearance: 'a tiny translucent jellyfish-like organism with a pulsing bell and trailing wispy tendrils',
    action: 'its bell contracts and relaxes rhythmically, tendrils streaming behind each pulse',
    sound: 'gentle liquid pulses and a calm oceanic hush' },
  { id: 'spiral-colony', archetype: 'Spiral Filament',
    appearance: 'a coiled spiral filament colony of linked luminous beads twisting like a helix',
    action: 'the spiral slowly unwinds and recoils, beads of light traveling along its length',
    sound: 'faint electric crackle and a slow harmonic sweep' },
  { id: 'tardigrade', archetype: 'Micro-Bear',
    appearance: 'a plump tardigrade-like micro-animal with stubby clawed legs and a segmented translucent body',
    action: 'it lumbers forward on stubby legs, claws gripping unseen substrate',
    sound: 'soft padded shuffling and a warm low hum' },
  { id: 'coral-polyp', archetype: 'Polyp Microcolony',
    appearance: 'a branching coral-like polyp microcolony with tiny feeding tentacles tipped in faint light',
    action: 'tentacles sway and reach outward, catching drifting motes from the fluid',
    sound: 'tiny bubbling ticks and an ambient reef wash' },
  { id: 'plankton', archetype: 'Glow Plankton',
    appearance: 'a loose cluster of bioluminescent plankton, each grain pulsing soft cold light',
    action: 'the cluster drifts apart and gathers, light rippling grain to grain',
    sound: 'sparkling micro-tones and a quiet abyssal hum' },
  { id: 'ciliate', archetype: 'Slipper Ciliate',
    appearance: 'a slipper-shaped ciliate covered in rows of rhythmic cilia, food vacuoles visible within',
    action: 'it glides forward in a smooth spiral, cilia beating in coordinated rows',
    sound: 'fine watery whisper and a low steady drone' },
  { id: 'rotifer', archetype: 'Crown Rotifer',
    appearance: 'a rotifer with a spinning corona of cilia at its crown and a tapered translucent trunk',
    action: 'its corona spins, drawing a gentle vortex of particles toward its mouth',
    sound: 'soft rotary whir and a faint liquid trill' },
  { id: 'silicate-microbe', archetype: 'Silicate Microbe',
    appearance: 'a crystalline silicate microbe with angular mineral plates and dim glowing seams',
    action: 'its mineral plates flex slightly, seams brightening and dimming in slow rhythm',
    sound: 'glassy creaks and a deep crystalline resonance' },
  { id: 'vent-tube', archetype: 'Vent Extremophile',
    appearance: 'a tube-shaped extremophile clinging near a dark mineral vent, a plumed crown at its top',
    action: 'its plumed crown opens and closes, filtering warm currents rising past it',
    sound: 'low geothermal rumble and soft hydrothermal hiss' },
  { id: 'radiolarian', archetype: 'Star Radiolarian',
    appearance: 'a star-shaped radiolarian with fine radiating mineral spines and a glowing central core',
    action: 'its spines drift and the central core pulses with slow light',
    sound: 'shimmering high tones and a quiet cosmic pad' },
  { id: 'gel-blob', archetype: 'Vacuole Blob',
    appearance: 'a soft gel blob with many internal vacuoles drifting like bubbles inside clear jelly',
    action: 'internal vacuoles circulate slowly as the whole blob wobbles and settles',
    sound: 'gloopy soft bubbling and a mellow low pad' },
  { id: 'micro-frond', archetype: 'Feathered Frond',
    appearance: 'a feathered micro-frond of fine translucent filaments fanning from a slender stalk',
    action: 'its filaments sway and ripple as if caught in a slow current',
    sound: 'gentle airy rustle and a soft ambient wash' },
  { id: 'torus', archetype: 'Ring Organism',
    appearance: 'a smooth ring-shaped torus organism with a faintly glowing inner channel',
    action: 'it rotates slowly about its ring, light circulating around the channel',
    sound: 'a soft looping tone and a quiet harmonic hum' },
  { id: 'comb-jelly', archetype: 'Comb Drifter',
    appearance: 'a comb-jelly with eight rows of iridescent beating combs scattering rainbow light',
    action: 'its comb rows beat in shimmering waves, propelling it gently forward',
    sound: 'iridescent twinkles and a calm flowing drone' },
  { id: 'spore-pod', archetype: 'Spore Pod',
    appearance: 'a rounded spore pod with a translucent shell holding glowing motes inside',
    action: 'the pod swells and releases a slow drift of glowing spores into the medium',
    sound: 'soft puff release and a faint sparkling tail' },
  { id: 'micro-worm', archetype: 'Glass Worm',
    appearance: 'a translucent worm-like microfauna, segmented and faintly luminous along its gut',
    action: 'it undulates in smooth sinuous waves, gut-light flickering as it moves',
    sound: 'slick watery slither and a low gentle hum' },
  { id: 'lattice', archetype: 'Lattice Builder',
    appearance: 'a honeycomb lattice micro-structure organism of repeating glowing cells',
    action: 'new lattice cells slowly bud at its edges, light spreading across the grid',
    sound: 'tiny clicking growth ticks and an ambient pad' },
  { id: 'flagellate', archetype: 'Whip Flagellate',
    appearance: 'a teardrop flagellate with a single long whip-like tail and a bright nucleus',
    action: 'its tail lashes in graceful S-curves, driving it in darting glides',
    sound: 'soft whipping swish and a quiet liquid tone' },
  { id: 'crusted-microbe', archetype: 'Encrusted Microbe',
    appearance: 'a mineral-encrusted microbe armored in rough dark grains with dim glowing gaps',
    action: 'it inches along, grains shifting, glowing gaps brightening with effort',
    sound: 'gritty grinding texture and a deep low rumble' },
  { id: 'micro-anemone', archetype: 'Micro-Anemone',
    appearance: 'a soft anemone-like microfauna with a ring of slender glowing tentacles',
    action: 'its tentacles wave and curl, drifting in a slow hypnotic dance',
    sound: 'gentle flowing wash and a warm ambient hum' },
  { id: 'nucleus-orb', archetype: 'Nucleus Orb',
    appearance: 'a near-spherical organism with a single bright pulsing nucleus in clear cytoplasm',
    action: 'its nucleus pulses with slow light as faint currents swirl around it',
    sound: 'a soft heartbeat-like pulse and a quiet deep pad' },
  { id: 'larva', archetype: 'Segmented Larva',
    appearance: 'a segmented micro-arthropod larva with tiny translucent limbs and a banded body',
    action: 'its body ripples segment by segment, tiny limbs paddling in sequence',
    sound: 'delicate tapping rhythm and a low gentle drone' },
  { id: 'fan-colony', archetype: 'Fan Colony',
    appearance: 'a fan-shaped colony of radiating translucent blades joined at a common base',
    action: 'its blades open and fold like a fan, light sweeping across them',
    sound: 'soft sweeping whoosh and a calm ambient tone' },
  { id: 'helix-ribbon', archetype: 'Helix Ribbon',
    appearance: 'a helical DNA-like ribbon creature twisting in a double spiral with rungs of light',
    action: 'the ribbon slowly twists and untwists, rungs of light blinking in sequence',
    sound: 'a slow harmonic glide and faint digital shimmer' },
  { id: 'bubble-cluster', archetype: 'Bubble Cluster',
    appearance: 'a cluster of translucent bubble-cells packed like soft foam, each faintly lit',
    action: 'bubbles jostle and merge slowly, light passing between joined cells',
    sound: 'soft popping bubbles and a mellow low pad' },
  { id: 'sun-microbe', archetype: 'Sun Microbe',
    appearance: 'a sun-like microbe radiating fine needle filaments from a glowing round core',
    action: 'its needle filaments quiver and the core pulses with warm slow light',
    sound: 'a warm radiant tone and a quiet airy shimmer' },
  { id: 'membrane-disc', archetype: 'Membrane Disc',
    appearance: 'a thin veined membrane disc, semi-transparent with a delicate network of glowing veins',
    action: 'the disc undulates at its rim, veins pulsing light from center to edge',
    sound: 'a soft fluttering wash and a gentle resonant hum' },
];

// ── Shared art direction ─────────────────────────────────────────────────────

const PHOTO_WRAP_PREFIX =
  'Ultra-detailed scientific microscope capture of a newly discovered alien microorganism:';
const PHOTO_WRAP_SUFFIX =
  'Suspended in dark mineral-rich fluid. Cinematic deep-space dark background (#020510 tone), ' +
  'soft volumetric backlight, high microscopic depth of field, subtle chromatic scan artifacts, ' +
  'faint scanner grid overlay at very low opacity. Muted desaturated palette with cold accents and dim amber. ' +
  'Photorealistic astrobiology lab imagery, electron-microscope aesthetic. ' +
  'Mysterious and awe-inspiring, not cartoonish, no faces, no text, no watermark.';

const VIDEO_WRAP_SUFFIX =
  'Slow graceful organic motion, subtle particle drift in the medium, gentle focus breathing. ' +
  'Calm, hypnotic, scientific, cinematic. No camera cuts, no text, no people.';

const SOUND_WRAP_SUFFIX = 'Ambient only, no voice, no narration, no lyrics, no music with melody vocals.';

/** Compose a still-image prompt (Nano Banana 2 / Kling image) from an appearance fragment. */
export function buildPhotoPromptFromAppearance(appearance: string): string {
  return `${PHOTO_WRAP_PREFIX} ${appearance}. ${PHOTO_WRAP_SUFFIX}`;
}

/** Compose an image-to-video motion prompt (Kling V3) from an action fragment. */
export function buildVideoPromptFromAction(action: string): string {
  return `The alien organism is alive: ${action}. ${VIDEO_WRAP_SUFFIX}`;
}

/** Compose a Kling V3 audio prompt (sound, no voice) from a sound fragment. */
export function buildSoundPrompt(sound: string): string {
  return `${sound}. ${SOUND_WRAP_SUFFIX}`;
}

/** Deterministically pick one of the 30 specs (e.g. by planet/lifeform seed). */
export function pickLifeformSpec(seed: number): LifeformSpec {
  const idx = Math.abs(Math.floor(seed)) % LIFEFORM_SPECS.length;
  return LIFEFORM_SPECS[idx];
}
