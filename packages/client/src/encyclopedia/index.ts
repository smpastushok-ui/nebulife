// Encyclopedia content registry.
//
// Runtime lessons are fetched as JSON from a CDN/static fallback instead of
// importing every TS lesson into the application bundle. TS modules under
// `content/` remain the authoring source-of-truth and are exported by
// `scripts/encyclopedia-build.ts`.

import type {
  Lesson,
  Language,
  SectionId,
  EncyclopediaContentIndex,
  LessonIndexEntry,
  AssetsManifest,
} from './types.js';
import { SECTIONS } from './sections.js';
import assetsManifestRaw from './assets-manifest.json';

const INDEX_VERSION = 1;
const manifest: AssetsManifest = (assetsManifestRaw as { lessons?: AssetsManifest }).lessons ?? {};

function inferCdnBaseFromManifest(): string | null {
  for (const lesson of Object.values(manifest)) {
    const url = Object.values(lesson.images ?? {})[0]
      ?? lesson.audio?.uk?.female
      ?? lesson.audio?.en?.female
      ?? lesson.audio?.uk?.male
      ?? lesson.audio?.en?.male;
    if (!url) continue;
    try {
      return `${new URL(url).origin}/encyclopedia`;
    } catch {
      // Try the next asset URL.
    }
  }
  return null;
}

const CDN_BASE = ((import.meta.env.VITE_ENCYCLOPEDIA_CDN_BASE as string | undefined) ?? inferCdnBaseFromManifest() ?? '').replace(/\/$/, '');
const STATIC_BASE = '/encyclopedia';
const DB_NAME = 'nebulife-encyclopedia';
const DB_VERSION = 1;
const INDEX_STORE = 'indexes';
const LESSON_STORE = 'lessons';

type LessonCacheRecord = {
  key: string;
  hash: string;
  lesson: Lesson;
  cachedAt: number;
};

type IndexCacheRecord = {
  key: string;
  index: EncyclopediaContentIndex;
  cachedAt: number;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;
let indexPromise: Promise<EncyclopediaContentIndex> | null = null;
let activeIndex: EncyclopediaContentIndex | null = null;
let remoteAssetsManifest: AssetsManifest = {};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(INDEX_STORE)) db.createObjectStore(INDEX_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(LESSON_STORE)) db.createObjectStore(LESSON_STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbPut(storeName: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

function indexUrls(): string[] {
  const urls: string[] = [];
  if (CDN_BASE) urls.push(`${CDN_BASE}/index.json`);
  urls.push(`${STATIC_BASE}/index.json`);
  return [...new Set(urls)];
}

function resolveLessonUrl(url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('/')) return url;
  return `${STATIC_BASE}/${url.replace(/^\.\//, '')}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

function isValidIndex(index: EncyclopediaContentIndex): boolean {
  return index.version === INDEX_VERSION && Array.isArray(index.lessons);
}

async function fetchFreshIndex(): Promise<EncyclopediaContentIndex | null> {
  for (const url of indexUrls()) {
    try {
      const index = await fetchJson<EncyclopediaContentIndex>(url);
      if (!isValidIndex(index)) continue;
      index.lessons = index.lessons.map((entry) => ({
        ...entry,
        lessonUrl: resolveLessonUrl(entry.lessonUrl),
      }));
      await idbPut(INDEX_STORE, { key: 'latest', index, cachedAt: Date.now() } satisfies IndexCacheRecord);
      return index;
    } catch {
      // Try the next source, then cached index.
    }
  }
  return null;
}

async function loadCachedIndex(): Promise<EncyclopediaContentIndex | null> {
  const cached = await idbGet<IndexCacheRecord>(INDEX_STORE, 'latest');
  return cached?.index ?? null;
}

/** Load lesson index from CDN/static fallback, then IndexedDB if offline. */
export async function loadLibraryIndex(): Promise<EncyclopediaContentIndex> {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const fresh = await fetchFreshIndex();
    const index = fresh ?? await loadCachedIndex();
    if (!index) {
      const empty: EncyclopediaContentIndex = {
        version: INDEX_VERSION,
        updatedAt: new Date(0).toISOString(),
        lessons: [],
        assets: {},
      };
      activeIndex = empty;
      remoteAssetsManifest = {};
      return empty;
    }
    activeIndex = index;
    remoteAssetsManifest = index.assets ?? {};
    return index;
  })();
  return indexPromise;
}

function findIndexEntry(slug: string, lang: Language, index = activeIndex): LessonIndexEntry | null {
  if (!index) return null;
  return index.lessons.find((entry) => entry.slug === slug && entry.language === lang)
    ?? index.lessons.find((entry) => entry.slug === slug && entry.language !== lang)
    ?? null;
}

/** Get a lesson by slug + language; falls back to other language if missing. */
export async function getLesson(slug: string, lang: Language): Promise<Lesson | null> {
  const index = activeIndex ?? await loadLibraryIndex();
  const entry = findIndexEntry(slug, lang, index);
  if (!entry) return null;

  const cacheKey = `${entry.slug}.${entry.language}`;
  const cached = await idbGet<LessonCacheRecord>(LESSON_STORE, cacheKey);
  if (cached?.hash === entry.contentHash) return cached.lesson;

  try {
    const lesson = await fetchJson<Lesson>(entry.lessonUrl);
    await idbPut(LESSON_STORE, {
      key: cacheKey,
      hash: entry.contentHash,
      lesson,
      cachedAt: Date.now(),
    } satisfies LessonCacheRecord);
    return lesson;
  } catch {
    return cached?.lesson ?? null;
  }
}

/** All lessons in the requested language, grouped by section, sorted by order. */
export interface SectionLessons {
  sectionId: SectionId;
  lessons: LessonIndexEntry[];
}

export function getLibraryToc(lang: Language, index = activeIndex): SectionLessons[] {
  const result: SectionLessons[] = SECTIONS.map((sec) => ({
    sectionId: sec.id,
    lessons: [] as LessonIndexEntry[],
  }));

  if (!index) return result;

  const bySlug = new Map<string, LessonIndexEntry>();
  for (const entry of index.lessons) {
    const existing = bySlug.get(entry.slug);
    if (!existing || entry.language === lang) bySlug.set(entry.slug, entry);
  }

  for (const entry of bySlug.values()) {
    const bucket = result.find((s) => s.sectionId === entry.section);
    if (bucket) bucket.lessons.push(entry);
  }

  for (const sec of result) {
    sec.lessons.sort((a, b) => a.order - b.order);
  }
  return result;
}

/** Total number of lessons available across all sections. */
export function getTotalLessonCount(lang: Language, index = activeIndex): number {
  return getLibraryToc(lang, index).reduce((sum, section) => sum + section.lessons.length, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset URL lookup
// ─────────────────────────────────────────────────────────────────────────────

/** Get image URL for a lesson's cacheKey, or null if not yet generated. */
export function getImageUrl(slug: string, cacheKey: string): string | null {
  return remoteAssetsManifest[slug]?.images?.[cacheKey] ?? manifest[slug]?.images?.[cacheKey] ?? null;
}

/** Get audio URL for a lesson, language, and gender, or null if not generated. */
export function getAudioUrl(
  slug: string,
  lang: Language,
  gender: 'female' | 'male',
): { url: string; durationSec: number } | null {
  const audio = remoteAssetsManifest[slug]?.audio?.[lang] ?? manifest[slug]?.audio?.[lang];
  if (!audio || !audio[gender]) return null;
  return { url: audio[gender], durationSec: audio.durationSec };
}

export { SECTIONS } from './sections.js';
export type { Lesson, Language, SectionId, LessonBlock, LessonImage, LessonDiagram, GlossaryTerm, QuizQuestion, Source, SectionMeta, LessonIndexEntry, EncyclopediaContentIndex } from './types.js';
