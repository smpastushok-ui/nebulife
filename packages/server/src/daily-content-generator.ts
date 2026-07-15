// Generic retry-with-dedup orchestration for AI-generated daily content
// (ASTRA daily quiz + fun fact). Pulled out of gemini-client.ts so the
// retry/fallback control flow is independently unit-testable without a live
// Gemini API key or database — callers inject a `generate` callback and a
// bounded history slice; all matching logic itself is the pure, deterministic
// @nebulife/core content-dedup module.

import { checkForDuplicate, computeContentFingerprint, type ContentFingerprint, type DuplicateHistoryEntry } from '@nebulife/core';

export interface DailyContentHistoryEntry extends DuplicateHistoryEntry {
  /** Human-readable canonical text used only for bounded prompt exclusions. */
  displayText?: string;
}

export interface DailyContentHistoryRow {
  content_date: string;
  content_json: string;
  fingerprint: string | null;
  key_terms: string[] | null;
}

/** Stable per-player key used by the messages.dedupe_key unique index. */
export function dailyDeliveryKey(
  kind: 'quiz' | 'fun_fact',
  date: string,
  playerId: string,
): string {
  return `astra-daily-${kind === 'fun_fact' ? 'fact' : 'quiz'}:${date}:${playerId}`;
}

/**
 * Builds a usable history from persisted rows, including pre-migration rows
 * whose fingerprint/key_terms are NULL. Recomputing those signatures from the
 * stored JSON means the anti-repeat cooldown covers content players already
 * received before migration 046, rather than starting from an empty ledger.
 */
export function buildDailyContentHistory(
  kind: 'quiz' | 'fun_fact',
  rows: readonly DailyContentHistoryRow[],
): DailyContentHistoryEntry[] {
  return rows.flatMap((row) => {
    let fingerprintTexts: string[] = [];
    let displayText: string | undefined;

    try {
      const parsed = JSON.parse(row.content_json) as Record<string, unknown>;
      if (kind === 'quiz') {
        const payload = parsed.data as Record<string, unknown> | undefined;
        const localized = (payload?.en ?? payload) as Record<string, unknown> | undefined;
        const question = typeof localized?.question === 'string' ? localized.question : '';
        const options = Array.isArray(localized?.options) ? localized.options : [];
        const correctIndex = typeof localized?.correctIndex === 'number' ? localized.correctIndex : -1;
        const answer = typeof options[correctIndex] === 'string' ? options[correctIndex] : '';
        fingerprintTexts = [question, answer].filter(Boolean);
        displayText = question || undefined;
      } else {
        const text = typeof parsed.en === 'string'
          ? parsed.en
          : typeof parsed.uk === 'string'
            ? parsed.uk
            : '';
        fingerprintTexts = text ? [text] : [];
        displayText = text || undefined;
      }
    } catch {
      // Legacy facts may be plain text rather than bilingual JSON.
      if (kind === 'fun_fact' && row.content_json.trim()) {
        fingerprintTexts = [row.content_json];
        displayText = row.content_json;
      }
    }

    if (!row.fingerprint && fingerprintTexts.length === 0) return [];
    const computed = fingerprintTexts.length > 0
      ? computeContentFingerprint(...fingerprintTexts)
      : null;
    return [{
      id: row.content_date,
      fingerprint: row.fingerprint ?? computed?.fingerprint ?? null,
      keyTerms: row.key_terms ?? computed?.keyTerms ?? null,
      displayText,
    }];
  });
}

export class DuplicateContentExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastDuplicateText: string | null,
  ) {
    super(`Exhausted ${attempts} generation attempts — every candidate collided with recent history`);
    this.name = 'DuplicateContentExhaustedError';
  }
}

export class ContentGenerationExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly cause: unknown,
  ) {
    super(`Exhausted ${attempts} generation attempts because candidates could not be generated or validated`);
    this.name = 'ContentGenerationExhaustedError';
  }
}

export interface GenerateOnceResult<T> {
  /** The payload to return to the caller once accepted. */
  payload: T;
  /** Text(s) used to compute the dedup fingerprint for this candidate. */
  fingerprintTexts: Array<string | null | undefined>;
  /** Short human-readable summary used to strengthen the next retry's prompt. */
  displayText: string;
}

export interface GenerateNonDuplicateOptions<T> {
  history: readonly DailyContentHistoryEntry[];
  /** Total attempts including the first (default 3: 1 initial + 2 retries). Always bounded — never unlimited. */
  maxAttempts?: number;
  generate: (attempt: number, lastDuplicateText: string | null) => Promise<GenerateOnceResult<T>>;
}

export interface GenerateNonDuplicateResult<T> {
  payload: T;
  fingerprint: ContentFingerprint;
  attempts: number;
  duplicateRejections: number;
}

/**
 * Calls `generate` up to `maxAttempts` times, computing a deterministic
 * fingerprint for each candidate and rejecting/retrying any candidate that
 * collides (exact or near-duplicate) with the provided history. Throws
 * DuplicateContentExhaustedError if every attempt collided — callers should
 * catch this and fall back to a curated pool via pickNonDuplicateFallback.
 */
export async function generateNonDuplicateContent<T>(
  options: GenerateNonDuplicateOptions<T>,
): Promise<GenerateNonDuplicateResult<T>> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  let lastDuplicateText: string | null = null;
  let duplicateRejections = 0;
  let lastGenerationError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let result: GenerateOnceResult<T>;
    try {
      result = await options.generate(attempt, lastDuplicateText);
    } catch (error) {
      lastGenerationError = error;
      continue;
    }
    const fingerprint = computeContentFingerprint(...result.fingerprintTexts);
    const dupCheck = checkForDuplicate(fingerprint, options.history);
    if (!dupCheck.isDuplicate) {
      return { payload: result.payload, fingerprint, attempts: attempt, duplicateRejections };
    }
    duplicateRejections++;
    lastDuplicateText = result.displayText;
  }

  if (lastGenerationError) {
    throw new ContentGenerationExhaustedError(maxAttempts, lastGenerationError);
  }
  throw new DuplicateContentExhaustedError(maxAttempts, lastDuplicateText);
}
