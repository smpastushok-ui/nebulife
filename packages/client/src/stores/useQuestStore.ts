import { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { getAcademyProgress, completeQuest } from '../api/academy-api.js';
import type { AcademyProgress } from '../api/academy-api.js';

// ---------------------------------------------------------------------------
// Quest Store — Isolated quest detection outside App.tsx
// ---------------------------------------------------------------------------
// Listens to game events (scene changes, system/planet selection) and
// auto-completes observation/exploration/photo quests when criteria match.

export interface QuestStoreState {
  activeQuest: {
    lessonId: string;
    quest: {
      type: string;
      criteria: Record<string, unknown>;
    };
  } | null;
  checkCriteria: (context: QuestContext) => void;
  refresh: () => Promise<void>;
}

export interface QuestContext {
  starSpectralClass?: string;
  planetType?: string;
  planetHabitability?: number;
  planetHasAtmosphere?: boolean;
  planetHasWater?: boolean;
  baseTelemetryStarClass?: string;
}

const QuestStoreContext = createContext<QuestStoreState>({
  activeQuest: null,
  checkCriteria: () => {},
  refresh: async () => {},
});

export function useQuestStore() {
  return useContext(QuestStoreContext);
}

export { QuestStoreContext };

/**
 * Hook that provides quest store logic. Used by the QuestStoreProvider.
 */
export function useQuestStoreLogic(): QuestStoreState {
  const activeQuestRef = useRef<QuestStoreState['activeQuest']>(null);
  const completingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const progress = await getAcademyProgress();
      if (progress?.active_quest) {
        const aq = progress.active_quest as {
          lessonId: string;
          quest: { type: string; criteria: Record<string, unknown> };
        };
        activeQuestRef.current = aq;
      } else {
        activeQuestRef.current = null;
      }
    } catch {
      // Silent fail
    }
  }, []);

  const checkCriteria = useCallback((context: QuestContext) => {
    const quest = activeQuestRef.current;
    if (!quest || completingRef.current) return;

    const criteria = quest.quest.criteria;
    let matched = false;

    switch (quest.quest.type) {
      case 'observation':
        if (criteria.spectralClass && context.starSpectralClass) {
          matched = context.starSpectralClass === criteria.spectralClass;
        }
        break;

      case 'exploration':
        if (context.planetType !== undefined || context.planetHabitability !== undefined) {
          matched = true;
          if (criteria.minHabitability !== undefined && context.planetHabitability !== undefined) {
            if (context.planetHabitability < (criteria.minHabitability as number)) matched = false;
          }
          if (criteria.planetType && context.planetType !== criteria.planetType) {
            matched = false;
          }
          if (criteria.hasAtmosphere !== undefined && context.planetHasAtmosphere !== criteria.hasAtmosphere) {
            matched = false;
          }
          if (criteria.hasWater !== undefined && context.planetHasWater !== criteria.hasWater) {
            matched = false;
          }
        }
        break;

      case 'photo':
        if (criteria.starType && context.baseTelemetryStarClass) {
          matched = context.baseTelemetryStarClass === criteria.starType;
        }
        break;
    }

    if (matched) {
      completingRef.current = true;
      completeQuest(quest.lessonId)
        .then(() => {
          activeQuestRef.current = null;
        })
        .catch((err) => console.error('[QuestStore] Auto-complete failed:', err))
        .finally(() => { completingRef.current = false; });
    }
  }, []);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  return {
    activeQuest: activeQuestRef.current,
    checkCriteria,
    refresh,
  };
}
