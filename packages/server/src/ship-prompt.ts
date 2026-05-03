export const SHIP_PROMPT_MIN_LENGTH = 40;
export const SHIP_PROMPT_MAX_LENGTH = 500;
export const SHIP_GENERATION_COST_QUARKS = 49;

export function normalizeShipDescription(input: unknown): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SHIP_PROMPT_MAX_LENGTH + 1);
}

export function validateShipDescription(description: string): { ok: true } | { ok: false; error: string } {
  if (description.length < SHIP_PROMPT_MIN_LENGTH) {
    return { ok: false, error: 'Description is too short' };
  }
  if (description.length > SHIP_PROMPT_MAX_LENGTH) {
    return { ok: false, error: 'Description is too long' };
  }
  return { ok: true };
}

export function buildShipConceptPrompt(cleanedPrompt: string): string {
  return [
    'Design a unique original small player spacecraft for a cozy space exploration game.',
    'The ship must be suitable for a real-time mobile 3D arena: clean silhouette, compact hull, readable nose direction, no tiny fragile details.',
    'Create a centered three-quarter view on a simple dark space-studio background, full ship visible, no pilots, no logos, no text, no UI, no watermark.',
    'Style: procedural sci-fi, believable lightweight fighter/explorer, muted deep-space palette with subtle accent lights.',
    `Player design brief: ${cleanedPrompt}`,
  ].join(' ');
}
