import type { TopicCategoryId, TopicLesson } from '../types/education.js';
import { TOPIC_CATEGORIES, getLessonsForCategories } from './topic-catalog.js';

/**
 * Selects the next lesson for a player based on their preferences and history.
 * Uses round-robin across selected categories, picking the first uncompleted lesson
 * in each subcategory sequentially.
 */
export function selectNextLesson(
  selectedTopics: TopicCategoryId[],
  completedLessons: Record<string, string>,
  lastLessonId?: string,
): TopicLesson | null {
  const categories = selectedTopics.length === 0
    ? TOPIC_CATEGORIES
    : TOPIC_CATEGORIES.filter(c => selectedTopics.includes(c.id));

  if (categories.length === 0) return null;

  // Determine which category to pick from next (round-robin)
  let startCategoryIndex = 0;
  if (lastLessonId) {
    const lastCatIndex = categories.findIndex(cat =>
      cat.subcategories.some(sub =>
        sub.lessons.some(l => l.id === lastLessonId),
      ),
    );
    if (lastCatIndex >= 0) {
      startCategoryIndex = (lastCatIndex + 1) % categories.length;
    }
  }

  // Try each category in round-robin order
  for (let i = 0; i < categories.length; i++) {
    const catIndex = (startCategoryIndex + i) % categories.length;
    const cat = categories[catIndex];

    // Find first uncompleted lesson in this category (sequential order)
    for (const sub of cat.subcategories) {
      for (const lesson of sub.lessons) {
        if (!completedLessons[lesson.id]) {
          return lesson;
        }
      }
    }
  }

  // All lessons completed at least once — rotate through the LEAST recently
  // completed lesson instead of always restarting at allLessons[0]. Without
  // this, a player who finishes the whole curriculum would be served the
  // exact same topic (and therefore near-identical Gemini-generated lesson
  // content + quiz) every single day forever. Sorting by completion date
  // (oldest first) is fully deterministic given completedLessons — no RNG
  // needed — and spreads repeats evenly across the whole catalog instead of
  // hammering one topic.
  const allLessons = getLessonsForCategories(selectedTopics);
  if (allLessons.length === 0) return null;
  let oldest = allLessons[0];
  let oldestDate = completedLessons[oldest.id] ?? '';
  for (const lesson of allLessons) {
    const date = completedLessons[lesson.id] ?? '';
    if (date < oldestDate || (date === oldestDate && lesson.id < oldest.id)) {
      oldest = lesson;
      oldestDate = date;
    }
  }
  return oldest;
}

/**
 * Returns the last completed lesson ID from the completed map.
 * Uses date comparison to find the most recently completed.
 */
export function getLastCompletedLessonId(
  completedLessons: Record<string, string>,
): string | undefined {
  let latest: string | undefined;
  let latestDate = '';

  for (const [lessonId, date] of Object.entries(completedLessons)) {
    if (date > latestDate) {
      latestDate = date;
      latest = lessonId;
    }
  }

  return latest;
}

/**
 * Calculate completion percentage for a category.
 */
export function getCategoryCompletion(
  categoryId: TopicCategoryId,
  completedLessons: Record<string, string>,
): { completed: number; total: number; percent: number } {
  const cat = TOPIC_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return { completed: 0, total: 0, percent: 0 };

  let total = 0;
  let completed = 0;

  for (const sub of cat.subcategories) {
    for (const lesson of sub.lessons) {
      total++;
      if (completedLessons[lesson.id]) completed++;
    }
  }

  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
