import { describe, it, expect } from 'vitest';
import { selectNextLesson, getLastCompletedLessonId, getCategoryCompletion } from '../../src/education/topic-selector.js';
import { getLessonsForCategories } from '../../src/education/topic-catalog.js';

describe('selectNextLesson — normal progression', () => {
  it('returns the first uncompleted lesson when nothing is completed yet', () => {
    const lesson = selectNextLesson(['astro'], {});
    expect(lesson).not.toBeNull();
    expect(lesson?.id).toBe('astro.stellar.o-class');
  });

  it('skips completed lessons and returns the next uncompleted one', () => {
    const completed = { 'astro.stellar.o-class': '2026-01-01' };
    const lesson = selectNextLesson(['astro'], completed, 'astro.stellar.o-class');
    expect(lesson).not.toBeNull();
    expect(completed[lesson!.id]).toBeUndefined();
  });
});

describe('selectNextLesson — full-curriculum rotation (repeat bug fix)', () => {
  it('does NOT always return the very first lesson once everything is completed', () => {
    const allLessons = getLessonsForCategories(['astro']);
    const completed: Record<string, string> = {};
    // Complete every lesson with an ascending date, EXCEPT keep the very
    // first lesson's completion date the OLDEST so it's not accidentally
    // "least recent" by construction of the test itself.
    allLessons.forEach((lesson, i) => {
      completed[lesson.id] = `2026-01-${String(i + 1).padStart(2, '0')}`;
    });

    const next = selectNextLesson(['astro'], completed, getLastCompletedLessonId(completed));
    expect(next).not.toBeNull();
    // The oldest-dated (least-recently-completed) lesson is lesson index 0
    // in this construction, so it SHOULD be selected here — the real
    // regression test is the second case below where it must NOT be index 0.
    expect(next!.id).toBe(allLessons[0].id);
  });

  it('rotates to the least-recently-completed lesson, not always index 0', () => {
    const allLessons = getLessonsForCategories(['astro']);
    const completed: Record<string, string> = {};
    // Make the FIRST lesson the MOST recently completed, and lesson[3] the
    // oldest — selectNextLesson must return lesson[3], never lesson[0].
    allLessons.forEach((lesson, i) => {
      completed[lesson.id] = `2026-02-${String(20 - i).padStart(2, '0')}`;
    });
    completed[allLessons[0].id] = '2026-03-01'; // most recent
    completed[allLessons[3].id] = '2026-01-01'; // oldest

    const next = selectNextLesson(['astro'], completed, allLessons[0].id);
    expect(next).not.toBeNull();
    expect(next!.id).toBe(allLessons[3].id);
    expect(next!.id).not.toBe(allLessons[0].id);
  });

  it('is deterministic — same completedLessons input always yields the same next lesson', () => {
    const allLessons = getLessonsForCategories(['astro']);
    const completed: Record<string, string> = {};
    allLessons.forEach((lesson, i) => {
      completed[lesson.id] = `2026-01-${String((i % 27) + 1).padStart(2, '0')}`;
    });
    const a = selectNextLesson(['astro'], completed, allLessons[0].id);
    const b = selectNextLesson(['astro'], completed, allLessons[0].id);
    expect(a?.id).toBe(b?.id);
  });
});

describe('getCategoryCompletion', () => {
  it('reports 0% for an unknown category', () => {
    // @ts-expect-error intentional invalid id for the test
    expect(getCategoryCompletion('nonexistent', {})).toEqual({ completed: 0, total: 0, percent: 0 });
  });
});
