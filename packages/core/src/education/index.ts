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
