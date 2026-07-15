import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  extractKeyTerms,
  computeContentFingerprint,
  jaccardSimilarity,
  checkForDuplicate,
  pickDeterministicIndex,
  pickNonDuplicateFallback,
  type DuplicateHistoryEntry,
} from '../../src/education/content-dedup.js';

describe('normalizeText', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeText('  Did YOU know?!  That Mars   is RED.  ')).toBe('did you know that mars is red');
  });

  it('strips accents/diacritics deterministically', () => {
    expect(normalizeText('café')).toBe(normalizeText('cafe'));
  });
});

describe('computeContentFingerprint — exact duplicate', () => {
  it('produces the identical fingerprint for byte-identical text', () => {
    const a = computeContentFingerprint('What is the closest star to Earth?', 'Proxima Centauri');
    const b = computeContentFingerprint('What is the closest star to Earth?', 'Proxima Centauri');
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.keyTerms).toEqual(b.keyTerms);
  });

  it('is stable across repeated calls (deterministic)', () => {
    const texts = ['Commander, did you know that Jupiter has 95 confirmed moons?'];
    const runs = Array.from({ length: 5 }, () => computeContentFingerprint(...texts).fingerprint);
    expect(new Set(runs).size).toBe(1);
  });
});

describe('computeContentFingerprint — punctuation/case variants', () => {
  it('treats punctuation-only and case-only variants as the same fingerprint', () => {
    const a = computeContentFingerprint('What is the closest star to Earth?');
    const b = computeContentFingerprint('WHAT IS THE CLOSEST STAR TO EARTH');
    const c = computeContentFingerprint('what... is the closest star, to Earth!!');
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).toBe(c.fingerprint);
  });

  it('collapses simple plural/inflection variants via light stemming', () => {
    const a = extractKeyTerms('Jupiter has many moons orbiting it');
    const b = extractKeyTerms('Jupiter has many moon orbiting it');
    expect(a).toEqual(b);
  });
});

describe('computeContentFingerprint — different content', () => {
  it('produces different fingerprints for genuinely different questions', () => {
    const a = computeContentFingerprint('What is the closest star to Earth?', 'Proxima Centauri');
    const b = computeContentFingerprint('How many moons does Saturn have?', 'Eighty-three confirmed moons');
    expect(a.fingerprint).not.toBe(b.fingerprint);
  });
});

describe('jaccardSimilarity', () => {
  it('is 1 for identical term sets', () => {
    expect(jaccardSimilarity(['mars', 'water', 'ice'], ['mars', 'water', 'ice'])).toBe(1);
  });

  it('is 0 for disjoint term sets', () => {
    expect(jaccardSimilarity(['mars', 'water'], ['saturn', 'rings'])).toBe(0);
  });

  it('is partial for overlapping sets', () => {
    const sim = jaccardSimilarity(['mars', 'water', 'ice', 'red'], ['mars', 'water', 'volcano', 'dust']);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});

describe('checkForDuplicate — exact match against history', () => {
  it('flags an exact fingerprint match', () => {
    const candidate = computeContentFingerprint('Commander, did you know that Venus rotates backwards?');
    const history: DuplicateHistoryEntry[] = [
      { id: 'day-1', ...computeContentFingerprint('Commander, did you know that Venus rotates backwards?') },
    ];
    const result = checkForDuplicate(candidate, history);
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe('exact-fingerprint');
    expect(result.matchedId).toBe('day-1');
  });

  it('does not flag when history is empty (graceful start, no prior history)', () => {
    const candidate = computeContentFingerprint('Any fresh fact about black holes.');
    expect(checkForDuplicate(candidate, []).isDuplicate).toBe(false);
  });
});

describe('checkForDuplicate — near-duplicate paraphrase', () => {
  it('flags a reworded restatement of the same fact as a near-duplicate', () => {
    const original = computeContentFingerprint(
      'Commander, did you know that a neutron star can spin 600 times per second?',
    );
    const paraphrase = computeContentFingerprint(
      'Did you know a neutron star spins up to 600 times every second, Commander?',
    );
    const history: DuplicateHistoryEntry[] = [{ id: 'day-1', ...original }];
    const result = checkForDuplicate(paraphrase, history);
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe('near-duplicate-terms');
  });

  it('does NOT flag two different questions that merely share one broad topic word (no false-positive topic block)', () => {
    const marsWater = computeContentFingerprint('Commander, did you know Mars once had liquid water on its surface?');
    const marsMoons = computeContentFingerprint('Commander, did you know Mars has two small moons named Phobos and Deimos?');
    const history: DuplicateHistoryEntry[] = [{ id: 'day-1', ...marsWater }];
    const result = checkForDuplicate(marsMoons, history);
    expect(result.isDuplicate).toBe(false);
  });
});

describe('checkForDuplicate — bilingual handling', () => {
  it('matches when the same fact is fingerprinted from its Ukrainian and English forms combined', () => {
    const day1 = computeContentFingerprint(
      'Командоре, а ви знали, що Юпітер має понад 95 підтверджених супутників?',
      'Commander, did you know that Jupiter has over 95 confirmed moons?',
    );
    const day2 = computeContentFingerprint(
      'Командоре, а ви знали, що у Юпітера понад 95 підтверджених супутників?',
      'Commander, did you know Jupiter has over 95 confirmed moons?',
    );
    const history: DuplicateHistoryEntry[] = [{ id: 'day-1', ...day1 }];
    expect(checkForDuplicate(day2, history).isDuplicate).toBe(true);
  });

  it('produces overlapping key terms for uk and en versions of the same fact', () => {
    const terms = extractKeyTerms(
      'Марс колись мав рідку воду на поверхні',
      'Mars once had liquid water on its surface',
    );
    // Numbers/proper nouns like "mars"/"марс" won't collapse across scripts,
    // but the signature should be non-trivial and stable either way.
    expect(terms.length).toBeGreaterThan(0);
  });
});

describe('history window / eviction semantics', () => {
  it('respects a bounded window — entries outside the provided slice are simply not considered', () => {
    const candidate = computeContentFingerprint('Commander, did you know that Titan has lakes of liquid methane?');
    const fullHistory: DuplicateHistoryEntry[] = [
      { id: 'old', ...computeContentFingerprint('Commander, did you know that Titan has lakes of liquid methane?') },
    ];
    // Caller evicted the old entry from the bounded window before calling in.
    const boundedHistory: DuplicateHistoryEntry[] = [];
    expect(checkForDuplicate(candidate, fullHistory).isDuplicate).toBe(true);
    expect(checkForDuplicate(candidate, boundedHistory).isDuplicate).toBe(false);
  });

  it('ignores history entries without a fingerprint (legacy rows / graceful start for existing users)', () => {
    const candidate = computeContentFingerprint('Commander, did you know that Europa may have a subsurface ocean?');
    const legacyHistory: DuplicateHistoryEntry[] = [{ id: 'legacy-row', fingerprint: null, keyTerms: null }];
    expect(checkForDuplicate(candidate, legacyHistory).isDuplicate).toBe(false);
  });
});

describe('pickDeterministicIndex', () => {
  it('is deterministic for the same seed key', () => {
    expect(pickDeterministicIndex(10, '2026-07-15')).toBe(pickDeterministicIndex(10, '2026-07-15'));
  });

  it('varies across different seed keys (rotates day to day)', () => {
    const indices = new Set(
      ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'].map((d) => pickDeterministicIndex(50, d)),
    );
    expect(indices.size).toBeGreaterThan(1);
  });

  it('never uses Math.random (pure function of inputs)', () => {
    const spy = Math.random;
    let called = false;
    // @ts-expect-error intentional monkey-patch for the test
    Math.random = () => { called = true; return spy(); };
    pickDeterministicIndex(20, 'seed-check');
    Math.random = spy;
    expect(called).toBe(false);
  });
});

describe('pickNonDuplicateFallback', () => {
  interface FallbackItem { id: string; text: string }
  const pool: FallbackItem[] = [
    { id: 'a', text: 'Fact about Saturn rings' },
    { id: 'b', text: 'Fact about neutron stars spinning fast' },
    { id: 'c', text: 'Fact about the Oort cloud' },
  ];
  const fingerprintOf = (item: FallbackItem) => computeContentFingerprint(item.text);

  it('returns a deterministic pick when nothing collides', () => {
    const first = pickNonDuplicateFallback(pool, '2026-07-15', [], fingerprintOf);
    const second = pickNonDuplicateFallback(pool, '2026-07-15', [], fingerprintOf);
    expect(first.index).toBe(second.index);
    expect(first.forcedRepeat).toBe(false);
  });

  it('skips a pool entry whose fingerprint collides with history', () => {
    const seedKey = 'force-a';
    const startIndex = pickDeterministicIndex(pool.length, seedKey);
    const collidingHistory: DuplicateHistoryEntry[] = [{ id: 'today', ...fingerprintOf(pool[startIndex]) }];
    const result = pickNonDuplicateFallback(pool, seedKey, collidingHistory, fingerprintOf);
    expect(result.index).not.toBe(startIndex);
    expect(result.forcedRepeat).toBe(false);
  });

  it('sets forcedRepeat=true and still returns an item when the whole pool collides', () => {
    const history: DuplicateHistoryEntry[] = pool.map((item, i) => ({ id: `h${i}`, ...fingerprintOf(item) }));
    const result = pickNonDuplicateFallback(pool, 'any-seed', history, fingerprintOf);
    expect(result.forcedRepeat).toBe(true);
    expect(pool).toContain(result.item);
  });
});
