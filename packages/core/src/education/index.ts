export {
  TOPIC_CATEGORIES,
  getAllLessonIds,
  getCategoryLessonCount,
  getTotalLessonCount,
  findLesson,
  getLessonsForCategories,
} from './topic-catalog.js';

export {
  selectNextLesson,
  getLastCompletedLessonId,
  getCategoryCompletion,
} from './topic-selector.js';

export {
  validateQuestCriteria,
  validateCalculationAnswer,
} from './quest-validator.js';

export {
  normalizeText,
  extractKeyTerms,
  computeContentFingerprint,
  jaccardSimilarity,
  checkForDuplicate,
  pickDeterministicIndex,
  pickNonDuplicateFallback,
  DEFAULT_NEAR_DUPLICATE_THRESHOLD,
} from './content-dedup.js';
export type {
  ContentFingerprint,
  DuplicateHistoryEntry,
  DuplicateCheckResult,
  FallbackPick,
} from './content-dedup.js';
