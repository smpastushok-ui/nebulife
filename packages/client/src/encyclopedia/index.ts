// Encyclopedia content registry — eager-loads all lesson modules so we
// can build the table of contents at app start without per-route fetches.
// Lesson body is small TS data — total ~1MB across 90 lessons (text only),
// fully tree-shakable per language since the reader only mounts one at a time.

import type { Lesson, Language, SectionId } from './types.js';
import { SECTIONS } from './sections.js';
import assetsManifestRaw from './assets-manifest.json';
import type { AssetsManifest } from './types.js';

// Vite glob import — discovers all .uk.ts and .en.ts under content/.
// `eager: true` means all modules are bundled (small files, fine for now).
// When library grows past 30 lessons we can switch to lazy import.
const lessonModules = import.meta.glob<{ default: Lesson }>(
  './content/**/*.{uk,en}.ts',
  { eager: true },
);

interface RegistryEntry {
  uk?: Lesson;
  en?: Lesson;
}

/** Map of slug -> {uk, en} lesson modules. */
export const LESSON_REGISTRY: Record<string, RegistryEntry> = (() => {
  const map: Record<string, RegistryEntry> = {};
  for (const path in lessonModules) {
    const lesson = lessonModules[path].default;
    if (!lesson) continue;
    if (!map[lesson.slug]) map[lesson.slug] = {};
    map[lesson.slug][lesson.language] = lesson;
  }
  return map;
})();

/** Get a lesson by slug + language; falls back to other language if missing. */
export function getLesson(slug: string, lang: Language): Lesson | null {
  const entry = LESSON_REGISTRY[slug];
  if (!entry) return null;
  return entry[lang] ?? entry[lang === 'uk' ? 'en' : 'uk'] ?? null;
}

/** All lessons in the requested language, grouped by section, sorted by order. */
export interface SectionLessons {
  sectionId: SectionId;
  lessons: Lesson[];
}

export function getLibraryToc(lang: Language): SectionLessons[] {
  const result: SectionLessons[] = SECTIONS.map((sec) => ({
    sectionId: sec.id,
    lessons: [] as Lesson[],
  }));

  for (const slug in LESSON_REGISTRY) {
    const lesson = getLesson(slug, lang);
    if (!lesson) continue;
    const bucket = result.find((s) => s.sectionId === lesson.section);
    if (bucket) bucket.lessons.push(lesson);
  }

  for (const sec of result) {
    sec.lessons.sort((a, b) => a.order - b.order);
  }
  return result;
}

/** Total number of lessons available across all sections. */
export function getTotalLessonCount(lang: Language): number {
  let n = 0;
  for (const slug in LESSON_REGISTRY) {
    if (getLesson(slug, lang)) n++;
  }
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset URL lookup
// ─────────────────────────────────────────────────────────────────────────────

const manifest: AssetsManifest = (assetsManifestRaw as { lessons?: AssetsManifest }).lessons ?? {};

/** Get image URL for a lesson's cacheKey, or null if not yet generated. */
export function getImageUrl(slug: string, cacheKey: string): string | null {
  return manifest[slug]?.images?.[cacheKey] ?? null;
}

/** Get audio URL for a lesson, language, and gender, or null if not generated. */
export function getAudioUrl(
  slug: string,
  lang: Language,
  gender: 'female' | 'male',
): { url: string; durationSec: number } | null {
  const audio = manifest[slug]?.audio?.[lang];
  if (!audio || !audio[gender]) return null;
  return { url: audio[gender], durationSec: audio.durationSec };
}

export { SECTIONS } from './sections.js';
export type { Lesson, Language, SectionId, LessonBlock, LessonImage, LessonDiagram, GlossaryTerm, QuizQuestion, Source, SectionMeta } from './types.js';
