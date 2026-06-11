import type { VercelRequest, VercelResponse } from '@vercel/node';
import { finalizeWeeklyChampions, saveMessage } from '../../packages/server/src/db.js';
import { enqueueChampionPush } from '../../packages/server/src/push-events.js';

/**
 * GET /api/cron/weekly-champions — Monday 00:15 UTC
 *
 * Finalizes the finished week of the cluster rating:
 *  1. Picks each cluster's champion (best weekly XP).
 *  2. Ranks champions globally; top-10 get quarks (#1 → 100, #2-10 → 1).
 *  3. Bumps permanent champion_weeks counters, resets weekly XP windows.
 *  4. Notifies winners via push + A.S.T.R.A. system message.
 *
 * Idempotent — reruns on the same week are no-ops.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await finalizeWeeklyChampions();
    if (result.alreadyDone) {
      return res.status(200).json({ finishedWeek: result.finishedWeek, alreadyDone: true, champions: result.champions.length });
    }

    let notified = 0;
    for (const champ of result.champions) {
      try {
        await enqueueChampionPush({
          playerId: champ.player_id,
          weekDate: result.finishedWeek,
          globalRank: champ.global_rank,
          rewardQuarks: champ.reward_quarks,
        });
        const msg = champ.global_rank === 1
          ? `Вітаю, командире! Ти — №1 галактики за тиждень ${result.finishedWeek}. Нагорода: ${champ.reward_quarks} кварків уже на рахунку. Відкрий Рейтинг → Зал Слави.`
          : champ.global_rank != null
            ? `Чудовий тиждень! Ти чемпіон свого кластера і топ-${champ.global_rank} галактики (${result.finishedWeek}). Нагорода: ${champ.reward_quarks} кварк. Перевір Зал Слави в Рейтингу.`
            : `Ти — чемпіон свого кластера за тиждень ${result.finishedWeek}! Титул збережено в Рейтингу. Наступний крок — топ-10 галактики.`;
        await saveMessage('system', 'A.S.T.R.A.', `system:${champ.player_id}`, msg);
        notified++;
      } catch (err) {
        console.warn(`[weekly-champions] notify failed for ${champ.player_id}:`, err);
      }
    }

    return res.status(200).json({
      finishedWeek: result.finishedWeek,
      champions: result.champions.length,
      notified,
    });
  } catch (err) {
    console.error('[weekly-champions] Fatal error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
