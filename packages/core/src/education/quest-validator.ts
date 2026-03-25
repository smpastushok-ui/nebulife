import type { QuestCriteria } from '../types/education.js';
import type { Star } from '../types/star.js';
import type { Planet } from '../types/planet.js';

interface GameContext {
  star?: Star;
  planet?: Planet;
  baseTelemetryStarClass?: string;
}

/**
 * Validates whether quest criteria are met given the current game context.
 * Returns true if the quest should be marked as complete.
 */
export function validateQuestCriteria(
  criteria: QuestCriteria,
  context: GameContext,
): boolean {
  switch (criteria.type) {
    case 'knowledge':
      return criteria.readComplete === true;

    case 'observation':
      if (criteria.spectralClass && context.star) {
        return context.star.spectralClass === criteria.spectralClass;
      }
      if (criteria.planetType && context.planet) {
        return context.planet.type === criteria.planetType;
      }
      return false;

    case 'exploration': {
      if (!context.planet) return false;
      const p = context.planet;
      if (criteria.minHabitability !== undefined) {
        const hab = p.habitability?.overall ?? 0;
        if (hab < criteria.minHabitability) return false;
      }
      if (criteria.planetType !== undefined && p.type !== criteria.planetType) {
        return false;
      }
      if (criteria.hasAtmosphere !== undefined) {
        const hasAtm = !!(p.atmosphere && p.atmosphere.surfacePressureAtm > 0);
        if (hasAtm !== criteria.hasAtmosphere) return false;
      }
      if (criteria.hasWater !== undefined) {
        const hasW = (p.hydrosphere?.waterCoverageFraction ?? 0) > 0;
        if (hasW !== criteria.hasWater) return false;
      }
      return true;
    }

    case 'calculation':
      // Calculation quests are validated server-side via answer input
      return false;

    case 'photo':
      if (criteria.starType && context.baseTelemetryStarClass) {
        return context.baseTelemetryStarClass === criteria.starType;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Validate a calculation answer against expected range.
 */
export function validateCalculationAnswer(
  criteria: QuestCriteria,
  answer: number,
): boolean {
  if (criteria.type !== 'calculation' || !criteria.expectedAnswer) return false;
  return answer >= criteria.expectedAnswer.min && answer <= criteria.expectedAnswer.max;
}
