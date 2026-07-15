// Deterministic anti-repeat toolkit for AI-generated educational content
// (ASTRA daily quiz + daily fun-fact broadcasts, Academy quiz selection).
//
// Goal: detect duplicate/near-duplicate generated content WITHOUT embeddings
// or any network call — pure, synchronous, seed-stable functions so the same
// input always produces the same fingerprint/decision. This lets callers:
//   1. reject a freshly generated candidate that repeats recent history,
//   2. retry generation with a bounded attempt budget, and
//   3. fall back to a curated pool, picked deterministically (never Math.random).
//
// Near-duplicate detection uses a light stemmer + stopword filter to build a
// "key terms" signature per language, then compares signatures with Jaccard
// similarity. This catches paraphrases of the same fact/question (shared
// nouns, numbers, proper nouns) while avoiding false positives across
// genuinely different questions that merely share a broad topic (e.g. two
// different Mars questions sharing only the word "mars").

import { seedFromString } from '../math/rng.js';

const EN_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did', 'doing', 'has', 'have', 'had', 'having', 'will',
  'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'to',
  'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'too', 'very', 'just', 'it', 'its', 'we',
  'you', 'your', 'they', 'their', 'he', 'she', 'his', 'her', 'i', 'me', 'my',
  'what', 'which', 'who', 'whom', 'one', 'commander', 'did', 'know', 'ship',
]);

const UK_STOPWORDS = new Set([
  'і', 'й', 'та', 'а', 'але', 'чи', 'або', 'що', 'як', 'це', 'цей', 'той',
  'ця', 'ці', 'для', 'від', 'до', 'на', 'у', 'в', 'з', 'зі', 'зо', 'по',
  'при', 'про', 'над', 'під', 'без', 'через', 'між', 'коли', 'де', 'чому',
  'тому', 'дуже', 'більш', 'менш', 'який', 'яка', 'яке', 'які', 'його',
  'її', 'їх', 'ми', 'ви', 'вони', 'він', 'вона', 'воно', 'є', 'був', 'була',
  'було', 'були', 'бути', 'має', 'мають', 'можна', 'можуть', 'треба',
  'лише', 'тільки', 'також', 'ще', 'вже', 'усі', 'всі', 'весь', 'уся',
  'своє', 'свій', 'своя', 'нас', 'вас', 'їм', 'їй', 'йому', 'командор',
  'командоре', 'знали', 'а знали',
]);

const STOPWORDS = new Set<string>([...EN_STOPWORDS, ...UK_STOPWORDS]);

const EN_SUFFIXES = ['edly', 'ing', 'tion', 'ies', 'ers', 'ed', 'es', 'ly', 'er', 's'];
const UK_SUFFIXES = [
  'ами', 'ями', 'ого', 'ому', 'ими', 'ева', 'ева', 'ями', 'ями', 'ів', 'ов',
  'ею', 'ям', 'ах', 'ях', 'ся', 'ть', 'ій', 'им', 'им', 'их', 'а', 'у', 'ю',
  'і', 'й', 'и',
];

/** Lowercase, strip accents/punctuation, collapse whitespace. Deterministic. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’ʼ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Very light, deterministic suffix-stripping heuristic — NOT a linguistic
 * stemmer. Just consistent enough that "planets"/"planet" or
 * "планетою"/"планета" collapse to the same key term for dedup purposes.
 */
function lightStem(token: string): string {
  if (token.length < 5 || /\d/.test(token)) return token;
  const isLatin = /^[a-z]+$/.test(token);
  const suffixes = isLatin ? EN_SUFFIXES : UK_SUFFIXES;
  for (const suffix of suffixes) {
    if (token.length - suffix.length >= 4 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

function isMeaningfulToken(token: string): boolean {
  if (!token) return false;
  if (/^\d+$/.test(token)) return token.length >= 2; // keep numbers (dates, magnitudes)
  return token.length >= 3 && !STOPWORDS.has(token);
}

/**
 * Extracts a sorted, de-duplicated set of "key terms" from one or more
 * texts (pass both uk + en variants of the same content for a bilingual
 * signature). Stopwords and short filler tokens are removed; remaining
 * tokens are lightly stemmed so trivial inflection/paraphrase doesn't
 * change the signature.
 */
export function extractKeyTerms(...texts: Array<string | null | undefined>): string[] {
  const terms = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    const normalized = normalizeText(text);
    if (!normalized) continue;
    for (const token of normalized.split(' ')) {
      if (!isMeaningfulToken(token)) continue;
      const stemmed = /^\d+$/.test(token) ? token : lightStem(token);
      if (isMeaningfulToken(stemmed)) terms.add(stemmed);
    }
  }
  return Array.from(terms).sort();
}

export interface ContentFingerprint {
  /** Stable short hash of the sorted key-term signature. Safe to persist/index. */
  fingerprint: string;
  /** Sorted key terms behind the fingerprint — used for near-duplicate (Jaccard) comparison. */
  keyTerms: string[];
}

/** Computes a canonical fingerprint + key-term signature for one piece of content. */
export function computeContentFingerprint(...texts: Array<string | null | undefined>): ContentFingerprint {
  const keyTerms = extractKeyTerms(...texts);
  const signature = keyTerms.length > 0
    ? keyTerms.join('|')
    : normalizeText(texts.filter(Boolean).join(' '));
  const fingerprint = seedFromString(signature || 'empty').toString(36);
  return { fingerprint, keyTerms };
}

/** Jaccard similarity of two key-term sets, in [0, 1]. */
export function jaccardSimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let intersection = 0;
  for (const term of a) if (setB.has(term)) intersection++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateHistoryEntry {
  id?: string;
  fingerprint?: string | null;
  keyTerms?: readonly string[] | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedId?: string;
  similarity?: number;
  reason?: 'exact-fingerprint' | 'near-duplicate-terms';
}

/** Below this many shared terms, two small key-term sets are never flagged as near-duplicates
 * even if their Jaccard ratio looks high — avoids false positives on very short questions. */
const MIN_TERMS_FOR_NEAR_DUPLICATE_CHECK = 3;
export const DEFAULT_NEAR_DUPLICATE_THRESHOLD = 0.55;

/**
 * Checks a candidate fingerprint against bounded history for exact or
 * near-duplicate matches. Near-duplicate matching is intentionally
 * conservative (high threshold + minimum term count) so that two different
 * questions about a broad shared topic ("Mars", "black holes") are NOT
 * flagged just because they share one or two common words.
 */
export function checkForDuplicate(
  candidate: ContentFingerprint,
  history: readonly DuplicateHistoryEntry[],
  threshold: number = DEFAULT_NEAR_DUPLICATE_THRESHOLD,
): DuplicateCheckResult {
  for (const entry of history) {
    if (entry.fingerprint && entry.fingerprint === candidate.fingerprint) {
      return { isDuplicate: true, matchedId: entry.id, similarity: 1, reason: 'exact-fingerprint' };
    }
  }
  if (candidate.keyTerms.length >= MIN_TERMS_FOR_NEAR_DUPLICATE_CHECK) {
    let best: DuplicateCheckResult = { isDuplicate: false };
    for (const entry of history) {
      const entryTerms = entry.keyTerms ?? [];
      if (entryTerms.length < MIN_TERMS_FOR_NEAR_DUPLICATE_CHECK) continue;
      const similarity = jaccardSimilarity(candidate.keyTerms, entryTerms);
      if (similarity >= threshold && (!best.similarity || similarity > best.similarity)) {
        best = { isDuplicate: true, matchedId: entry.id, similarity, reason: 'near-duplicate-terms' };
      }
    }
    if (best.isDuplicate) return best;
  }
  return { isDuplicate: false };
}

/** Deterministic (non-random) starting index into a fallback pool, derived from a seed key (e.g. today's date). */
export function pickDeterministicIndex(poolLength: number, seedKey: string): number {
  if (poolLength <= 0) return -1;
  return seedFromString(seedKey) % poolLength;
}

export interface FallbackPick<T> {
  item: T;
  index: number;
  fingerprint: ContentFingerprint;
  /** true if every pool entry collided with history and we had to reuse one anyway. */
  forcedRepeat: boolean;
}

/**
 * Deterministically walks a curated fallback pool starting from a
 * seed-derived index (rotates day to day without Math.random) and returns
 * the first entry that doesn't collide with recent history. If the whole
 * pool collides (fully exhausted against the lookback window), the seeded
 * entry is returned anyway so callers always get a usable result.
 */
export function pickNonDuplicateFallback<T>(
  pool: readonly T[],
  seedKey: string,
  history: readonly DuplicateHistoryEntry[],
  fingerprintOf: (item: T) => ContentFingerprint,
): FallbackPick<T> {
  if (pool.length === 0) throw new Error('pickNonDuplicateFallback: empty pool');
  const start = pickDeterministicIndex(pool.length, seedKey);
  for (let offset = 0; offset < pool.length; offset++) {
    const index = (start + offset) % pool.length;
    const fingerprint = fingerprintOf(pool[index]);
    if (!checkForDuplicate(fingerprint, history).isDuplicate) {
      return { item: pool[index], index, fingerprint, forcedRepeat: false };
    }
  }
  return { item: pool[start], index: start, fingerprint: fingerprintOf(pool[start]), forcedRepeat: true };
}
