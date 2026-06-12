import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getGalaxyLeaderboard,
  getHallOfFame,
  getRatingAchievements,
} from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

/**
 * GET /api/rating/leaderboard
 *
 * Live galaxy rating (cluster leaders, current week) + hall of fame.
 * {
 *   week,                  — current week Monday (UTC)
 *   galaxy: {
 *     top: [{ player_id, name, callsign, player_level, weekly_xp, champion_weeks, is_online, global_rank }],
 *     me: { weeklyXp, clusterRank, isClusterLeader, globalRank } | null,
 *   },
 *   hallOfFame: { week, top: ChampionRow[], myClusterChampion },
 *   achievements: { championWeeks, bestGlobalRank, top10Weeks },
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  if (!(await RATE_LIMITS.poll(auth.playerId))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const galaxy = await getGalaxyLeaderboard(auth.playerId);
    const [hallOfFame, achievements] = await Promise.all([
      getHallOfFame(null),
      getRatingAchievements(auth.playerId),
    ]);
    return res.status(200).json({
      week: galaxy.week,
      galaxy: { top: galaxy.top, me: galaxy.me },
      hallOfFame,
      achievements,
    });
  } catch (err) {
    console.error('[rating/leaderboard] Error:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
