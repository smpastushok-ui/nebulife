import { describe, it, expect, vi } from 'vitest';
import { computeContentFingerprint, pickNonDuplicateFallback, type DuplicateHistoryEntry } from '@nebulife/core';
import {
  buildDailyContentHistory,
  dailyDeliveryKey,
  generateNonDuplicateContent,
  ContentGenerationExhaustedError,
  DuplicateContentExhaustedError,
} from '../src/daily-content-generator.js';
import { QUIZ_FALLBACK_POOL, FACT_FALLBACK_POOL } from '../src/daily-content-fallback.js';

describe('generateNonDuplicateContent — accepts a fresh candidate immediately', () => {
  it('returns on the first attempt when there is no history (graceful start for new deployments)', async () => {
    const generate = vi.fn().mockResolvedValue({
      payload: 'fresh-quiz-json',
      fingerprintTexts: ['What is the escape velocity of Earth?'],
      displayText: 'What is the escape velocity of Earth?',
    });

    const result = await generateNonDuplicateContent({ history: [], generate });
    expect(result.payload).toBe('fresh-quiz-json');
    expect(result.attempts).toBe(1);
    expect(result.duplicateRejections).toBe(0);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('returns on the first attempt when the candidate does not collide with existing history', async () => {
    const history: DuplicateHistoryEntry[] = [
      { id: 'yesterday', ...computeContentFingerprint('What is the closest star to Earth?') },
    ];
    const generate = vi.fn().mockResolvedValue({
      payload: 'fresh',
      fingerprintTexts: ['How many moons does Saturn have?'],
      displayText: 'How many moons does Saturn have?',
    });
    const result = await generateNonDuplicateContent({ history, generate });
    expect(result.attempts).toBe(1);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe('generateNonDuplicateContent — retry on duplicate', () => {
  it('retries once when the first candidate is an exact duplicate, then accepts the second', async () => {
    const dupText = 'What is the closest star to Earth?';
    const history: DuplicateHistoryEntry[] = [{ id: 'yesterday', ...computeContentFingerprint(dupText) }];

    const generate = vi.fn()
      .mockResolvedValueOnce({ payload: 'dup', fingerprintTexts: [dupText], displayText: dupText })
      .mockResolvedValueOnce({
        payload: 'fresh',
        fingerprintTexts: ['How many moons does Saturn have?'],
        displayText: 'How many moons does Saturn have?',
      });

    const result = await generateNonDuplicateContent({ history, generate, maxAttempts: 3 });
    expect(result.payload).toBe('fresh');
    expect(result.attempts).toBe(2);
    expect(result.duplicateRejections).toBe(1);
    expect(generate).toHaveBeenCalledTimes(2);
    // Retry call must be told about the duplicate it needs to avoid.
    expect(generate).toHaveBeenNthCalledWith(2, 2, dupText);
  });

  it('retries malformed/transient generation failures within the same bounded budget', async () => {
    const generate = vi.fn()
      .mockRejectedValueOnce(new Error('temporary Gemini failure'))
      .mockResolvedValueOnce({
        payload: 'fresh',
        fingerprintTexts: ['A fresh fact about spectroscopy'],
        displayText: 'A fresh fact about spectroscopy',
      });

    const result = await generateNonDuplicateContent({ history: [], generate, maxAttempts: 3 });
    expect(result.payload).toBe('fresh');
    expect(result.attempts).toBe(2);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('throws a fallback-triggering error after bounded generation failures', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('Gemini unavailable'));
    await expect(
      generateNonDuplicateContent({ history: [], generate, maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(ContentGenerationExhaustedError);
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('never calls generate more than maxAttempts times (bounded retry budget)', async () => {
    const dupText = 'Repeating fact about Mars water';
    const history: DuplicateHistoryEntry[] = [{ id: 'yesterday', ...computeContentFingerprint(dupText) }];
    const generate = vi.fn().mockResolvedValue({ payload: 'dup', fingerprintTexts: [dupText], displayText: dupText });

    await expect(
      generateNonDuplicateContent({ history, generate, maxAttempts: 3 }),
    ).rejects.toThrow(DuplicateContentExhaustedError);
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('DuplicateContentExhaustedError carries the last duplicate text and attempt count', async () => {
    const dupText = 'Repeating fact about black holes';
    const history: DuplicateHistoryEntry[] = [{ id: 'yesterday', ...computeContentFingerprint(dupText) }];
    const generate = vi.fn().mockResolvedValue({ payload: 'dup', fingerprintTexts: [dupText], displayText: dupText });

    try {
      await generateNonDuplicateContent({ history, generate, maxAttempts: 2 });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DuplicateContentExhaustedError);
      const typed = err as DuplicateContentExhaustedError;
      expect(typed.attempts).toBe(2);
      expect(typed.lastDuplicateText).toBe(dupText);
    }
  });
});

describe('persisted history reconstruction and delivery idempotency', () => {
  it('derives a fingerprint from a pre-migration quiz row with NULL columns', () => {
    const history = buildDailyContentHistory('quiz', [{
      content_date: '2026-07-01',
      content_json: JSON.stringify({
        type: 'quiz',
        data: {
          en: {
            question: 'Which star is closest to the Sun?',
            options: ['Sirius', 'Proxima Centauri', 'Vega', 'Rigel'],
            correctIndex: 1,
          },
        },
      }),
      fingerprint: null,
      key_terms: null,
    }]);
    expect(history).toHaveLength(1);
    expect(history[0].fingerprint).toBeTruthy();
    expect(history[0].displayText).toContain('closest');
  });

  it('derives history for legacy bilingual and plain-text fact rows', () => {
    const rows = [
      {
        content_date: '2026-07-02',
        content_json: JSON.stringify({ uk: 'Факт', en: 'Titan has methane lakes' }),
        fingerprint: null,
        key_terms: null,
      },
      {
        content_date: '2026-07-01',
        content_json: 'Legacy plain-text fact about Mars water',
        fingerprint: null,
        key_terms: null,
      },
    ];
    expect(buildDailyContentHistory('fun_fact', rows)).toHaveLength(2);
  });

  it('keeps quiz/fact and player delivery keys separated and deterministic', () => {
    const quizKey = dailyDeliveryKey('quiz', '2026-07-15', 'player-1');
    expect(dailyDeliveryKey('quiz', '2026-07-15', 'player-1')).toBe(quizKey);
    expect(dailyDeliveryKey('fun_fact', '2026-07-15', 'player-1')).not.toBe(quizKey);
    expect(dailyDeliveryKey('quiz', '2026-07-15', 'player-2')).not.toBe(quizKey);
  });
});

describe('curated fallback pools — deterministic selection under forced repeat', () => {
  it('QUIZ_FALLBACK_POOL has no two entries with colliding EN fingerprints (internal sanity)', () => {
    const seen = new Map<string, string>();
    for (const entry of QUIZ_FALLBACK_POOL) {
      const fp = computeContentFingerprint(entry.en.question, entry.en.options[entry.en.correctIndex]).fingerprint;
      expect(seen.has(fp)).toBe(false);
      seen.set(fp, entry.id);
    }
  });

  it('FACT_FALLBACK_POOL has no two entries with colliding EN fingerprints (internal sanity)', () => {
    const seen = new Map<string, string>();
    for (const entry of FACT_FALLBACK_POOL) {
      const fp = computeContentFingerprint(entry.en).fingerprint;
      expect(seen.has(fp)).toBe(false);
      seen.set(fp, entry.id);
    }
  });

  it('picks a fallback fact deterministically and skips ones already used recently', () => {
    const fingerprintOf = (item: (typeof FACT_FALLBACK_POOL)[number]) => computeContentFingerprint(item.en);
    const seedKey = '2026-07-15';
    const first = pickNonDuplicateFallback(FACT_FALLBACK_POOL, seedKey, [], fingerprintOf);

    const history: DuplicateHistoryEntry[] = [{ id: 'today', ...first.fingerprint }];
    const second = pickNonDuplicateFallback(FACT_FALLBACK_POOL, seedKey, history, fingerprintOf);

    expect(second.item.id).not.toBe(first.item.id);
    expect(second.forcedRepeat).toBe(false);
  });

  it('rotates the fallback pick across different dates', () => {
    const fingerprintOf = (item: (typeof QUIZ_FALLBACK_POOL)[number]) =>
      computeContentFingerprint(item.en.question, item.en.options[item.en.correctIndex]);
    const picks = new Set(
      ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'].map(
        (date) => pickNonDuplicateFallback(QUIZ_FALLBACK_POOL, date, [], fingerprintOf).item.id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
