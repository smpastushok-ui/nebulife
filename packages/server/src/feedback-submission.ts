export const FEEDBACK_MAX_FIELD_LENGTH = 2000;
export const FEEDBACK_MIN_SURVEY_LEVEL = 8;

export type FeedbackSource = 'survey' | 'weaver';

export type FeedbackValidationResult =
  | {
      ok: true;
      source: FeedbackSource;
      likesText: string;
      dislikesText: string;
      language: 'uk' | 'en';
      clientLevel: number;
    }
  | {
      ok: false;
      status: 400;
      code: 'empty_feedback';
    };

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, FEEDBACK_MAX_FIELD_LENGTH);
}

export function validateFeedbackPayload(body: unknown): FeedbackValidationResult {
  const value = body && typeof body === 'object'
    ? body as Record<string, unknown>
    : {};
  const likesText = normalizeText(value.likesText);
  const dislikesText = normalizeText(value.dislikesText);

  if (!likesText && !dislikesText) {
    return { ok: false, status: 400, code: 'empty_feedback' };
  }

  return {
    ok: true,
    source: value.source === 'weaver' ? 'weaver' : 'survey',
    likesText,
    dislikesText,
    language: value.language === 'en' ? 'en' : 'uk',
    clientLevel: typeof value.level === 'number' && Number.isFinite(value.level)
      ? Math.max(0, Math.floor(value.level))
      : 0,
  };
}

export function getFeedbackEligibility(
  source: FeedbackSource,
  serverLevel: number | null | undefined,
  clientLevel: number,
): { allowed: true; effectiveLevel: number } | { allowed: false; code: 'level_too_low' } {
  const authoritativeLevel = Math.max(0, Math.floor(serverLevel ?? 0));
  if (source === 'weaver') {
    return { allowed: true, effectiveLevel: authoritativeLevel };
  }

  const effectiveLevel = Math.max(authoritativeLevel, clientLevel);
  return effectiveLevel >= FEEDBACK_MIN_SURVEY_LEVEL
    ? { allowed: true, effectiveLevel }
    : { allowed: false, code: 'level_too_low' };
}

export function normalizeFeedbackIdempotencyKey(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return /^[A-Za-z0-9._:-]{8,128}$/.test(key) ? key : null;
}
