// ---------------------------------------------------------------------------
// "Сага Ткача" — narrator + illustration prompt builders.
// ---------------------------------------------------------------------------
// The chapters are always narrated in-character as Ткач (the Weaver) — the
// same entity referenced in Precursor Signals lore ("тим, хто сплів перші
// нейронні мережі галактики") and in the "Message the Weaver" feedback
// channel. Here Ткач takes the role of a chronicler recording the player's
// own journey as a scientific legend — measured, poetic-scientific, second
// person. Mirrors astra-prompt.ts (system-prompt-as-constant) and the JSON
// response-parsing pattern used throughout gemini-client.ts.
// ---------------------------------------------------------------------------

import type { SagaMilestoneContext, SagaMilestoneType } from '@nebulife/core';

interface MilestoneFlavor {
  /** English narrative hint fed to Gemini alongside the context facts. */
  narrative: string;
  /** English illustration subject (fed to the image model). */
  illustration: string;
}

const MILESTONE_FLAVOR: Record<SagaMilestoneType, MilestoneFlavor> = {
  doomsday_arrival: {
    narrative: 'the rescue ship\'s landing after fleeing a doomed home star — ten thousand passengers delivered, at last, to an unfamiliar world',
    illustration: 'a rescue starship descending through the atmosphere of an unfamiliar alien world, landing lights cutting through dusk, colonists silhouetted disembarking, epic wide establishing shot',
  },
  first_colonization: {
    narrative: 'the founding of the commander\'s first colony — structures rising over untouched alien ground, the first permanent mark left on a new world',
    illustration: 'the first colony structures rising on an alien planet surface at dawn, a small settlement hub with construction lights, vast empty landscape stretching beyond, wide establishing shot',
  },
  level_10: {
    narrative: 'a milestone of growing mastery in the commander\'s expedition career — early lessons hardened into real competence',
    illustration: 'a lone explorer commander silhouetted against a starfield and a distant nebula, control panel light on their face, a sense of quiet growing confidence',
  },
  level_20: {
    narrative: 'a milestone of growing mastery in the commander\'s expedition career — the frontier now answers to a steadier hand',
    illustration: 'a commander standing at the viewport of a growing space station, a cluster of colonized worlds visible through the glass, sense of expanding domain',
  },
  level_35: {
    narrative: 'a milestone of growing mastery in the commander\'s expedition career — a veteran now, shaping the frontier rather than merely surviving it',
    illustration: 'a veteran commander overlooking a hologram star chart of many systems, deep space visible beyond, sense of mastery and quiet authority',
  },
  first_legendary_discovery: {
    narrative: 'the discovery of a legendary cosmic phenomenon never before recorded by the commander\'s instruments',
    illustration: 'an awe-inspiring legendary cosmic phenomenon (a rare stellar event) filling the frame, an observatory silhouette in the foreground, sense of scientific wonder',
  },
  first_creature_settled: {
    narrative: 'the first alien lifeform settled and thriving under the commander\'s care in a fledgling biosphere',
    illustration: 'a small alien creature resting in a lush procedurally-terraformed biosphere patch under an artificial sky dome, gentle bioluminescence, sense of tender new life',
  },
  civilization_integrated: {
    narrative: 'a sentient civilization formally welcomed into the Stellar Community through patient diplomacy rather than conquest',
    illustration: 'two very different silhouettes — a human commander and a sentient alien delegate — facing each other in a formal first-contact gesture, alien settlement lights in the background, sense of solemn welcome',
  },
};

function contextFactsLines(context: SagaMilestoneContext): string[] {
  const lines: string[] = [];
  if (context.level) lines.push(`Level reached: ${context.level}.`);
  if (context.planetName) lines.push(`Planet: ${context.planetName}${context.planetType ? ` (${context.planetType})` : ''}.`);
  if (context.systemName) lines.push(`Star system: ${context.systemName}.`);
  if (context.objectType) lines.push(`Discovered phenomenon: ${context.objectType.replace(/[-_]/g, ' ')}.`);
  if (context.civilizationName) lines.push(`Civilization: ${context.civilizationName}.`);
  return lines;
}

export interface SagaChapterPromptResult {
  textPrompt: string;
  illustrationPrompt: string;
}

/**
 * Builds the Gemini text prompt for one chapter. Requests pure JSON
 * ({"title":"...","body":"..."}) in the player's own language, following the
 * same fenced-JSON convention as generateDailyQuiz/generateLifeformBrief.
 */
export function buildSagaChapterPrompt(
  milestoneType: SagaMilestoneType,
  context: SagaMilestoneContext,
  playerCallsign: string,
  lang: 'uk' | 'en',
): SagaChapterPromptResult {
  const flavor = MILESTONE_FLAVOR[milestoneType];
  const facts = contextFactsLines(context);
  const langInstruction = lang === 'en'
    ? 'Write entirely in English.'
    : 'Пиши виключно українською мовою.';
  const addressInstruction = lang === 'en'
    ? 'Address the commander directly as "you" (second person), by their callsign where natural.'
    : 'Звертайся до командора напряму, на «ти», використовуючи позивний де це природно.';

  const textPrompt = `You are Ткач (the Weaver) — the ancient entity of Precursor legend who first wove the galaxy's neural networks, now the silent chronicler of one commander's personal saga in the game Nebulife.

Write ONE short illustrated chapter ("Сага Ткача") commemorating this moment in the commander's journey: ${flavor.narrative}.

Commander's callsign: ${playerCallsign}.
${facts.join('\n')}

Voice and form (CRITICAL):
- Measured, poetic-scientific tone — a scientific legend, not a diary entry and not marketing copy.
- Second person, as if Ткач is addressing the commander across time.
- 150-220 words for the body text. No markdown, no headers, no bullet points — flowing prose only.
- Ground the poetry in something physically or scientifically real about the moment (the physics of arrival, the biology of a first creature, the diplomacy of first contact) without turning into a dry lecture.
- Never mention artificial intelligence, neural networks, algorithms, prompts, or real-world technology — Ткач speaks only in the language of the game's universe (stars, seeds, signals, the Weave).
- ${langInstruction}
- ${addressInstruction}
- Also produce a short evocative chapter title (3-6 words, no quotation marks, no chapter numbering — numbering is added by the reader).

Respond with ONLY pure JSON (no markdown fences, no prose outside the JSON):
{"title":"...","body":"..."}`;

  const illustrationPrompt = [
    `Cinematic, atmospheric science-fiction illustration: ${flavor.illustration}.`,
    'Dark cosmos color palette, muted desaturated tones with restrained cold accent lighting, painterly but grounded in physical plausibility, no text, no logos, no watermark, no UI overlays, no cartoon style.',
  ].join(' ');

  return { textPrompt, illustrationPrompt };
}

export interface ParsedSagaChapter {
  title: string;
  body: string;
}

const FALLBACK_TITLE_UK = 'Новий запис у Сазі';
const FALLBACK_TITLE_EN = 'A New Entry in the Saga';

/** Parses the fenced-JSON chapter response, tolerating minor formatting noise. */
export function parseSagaChapterResponse(rawText: string, lang: 'uk' | 'en'): ParsedSagaChapter {
  const cleaned = rawText.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<ParsedSagaChapter>;
    const title = String(parsed.title ?? '').trim().slice(0, 120);
    const body = String(parsed.body ?? '').trim().slice(0, 2000);
    if (title && body) return { title, body };
  } catch {
    // fall through to fallback below
  }
  return {
    title: lang === 'en' ? FALLBACK_TITLE_EN : FALLBACK_TITLE_UK,
    body: cleaned.slice(0, 2000) || (lang === 'en' ? FALLBACK_TITLE_EN : FALLBACK_TITLE_UK),
  };
}
