import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getAcademyProgress, updateAcademyProgress, creditQuarks, updatePlayer, getPlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/academy/complete-quest
 * Body: { lessonId: string, calculationAnswer?: number }
 * Completes the active quest and awards rewards. Handles streak logic.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { lessonId, calculationAnswer } = req.body ?? {};
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'lessonId required' });
    }

    const progress = await getAcademyProgress(auth.playerId);
    if (!progress) return res.status(404).json({ error: 'No academy progress' });

    const activeQuest = progress.active_quest as { lessonId: string; quest: { type: string; criteria: Record<string, unknown>; quarkReward: number; xpReward: number } } | null;
    if (!activeQuest || activeQuest.lessonId !== lessonId) {
      return res.status(400).json({ error: 'No active quest matching this lessonId' });
    }

    // Validate calculation quests
    if (activeQuest.quest.type === 'calculation') {
      if (typeof calculationAnswer !== 'number') {
        return res.status(400).json({ error: 'calculationAnswer required for calculation quests' });
      }
      const expected = activeQuest.quest.criteria.expectedAnswer as { min: number; max: number } | undefined;
      if (expected && (calculationAnswer < expected.min || calculationAnswer > expected.max)) {
        return res.status(200).json({ correct: false, message: 'Incorrect answer, try again' });
      }
    }

    // Complete quest
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = progress.last_quest_date;

    // Calculate streak
    let newStreak = 1;
    if (lastDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === yesterday) {
        newStreak = (progress.quest_streak ?? 0) + 1;
      } else if (lastDate === today) {
        newStreak = progress.quest_streak ?? 1;
      }
    }
    const longestStreak = Math.max(progress.longest_streak ?? 0, newStreak);

    await updateAcademyProgress(auth.playerId, {
      active_quest: null,
      quest_streak: newStreak,
      longest_streak: longestStreak,
      last_quest_date: today,
      total_quests_completed: (progress.total_quests_completed ?? 0) + 1,
    });

    // Award rewards
    const quarkReward = activeQuest.quest.quarkReward ?? 1;
    const xpReward = activeQuest.quest.xpReward ?? 30;

    await creditQuarks(auth.playerId, quarkReward);
    const player = await getPlayer(auth.playerId);
    if (player) {
      await updatePlayer(auth.playerId, { science_points: (player.science_points ?? 0) + xpReward });
    }

    // Streak bonuses
    let streakBonus = 0;
    if (newStreak === 3) streakBonus = 3;
    else if (newStreak === 7) streakBonus = 7;
    else if (newStreak === 30) streakBonus = 10;
    if (streakBonus > 0) {
      await creditQuarks(auth.playerId, streakBonus);
    }

    return res.status(200).json({
      ok: true,
      correct: true,
      quarksAwarded: quarkReward + streakBonus,
      xpAwarded: xpReward,
      streak: newStreak,
      streakBonus,
    });
  } catch (err) {
    console.error('[academy/complete-quest]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
