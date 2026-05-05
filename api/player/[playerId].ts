import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayer, updatePlayer } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { SUPPORTED_LANGUAGES } from '@nebulife/core';

function isGameStateRegression(current: unknown, incoming: unknown): boolean {
  if (!current || typeof current !== 'object' || !incoming || typeof incoming !== 'object') return false;
  const saved = current as Record<string, unknown>;
  const next = incoming as Record<string, unknown>;
  const savedWasStarted = saved.onboarding_done === true || typeof saved.xp === 'number' || typeof saved.level === 'number';
  if (!savedWasStarted) return false;

  const nextLooksFresh =
    next.onboarding_done !== true &&
    (typeof next.xp !== 'number' || next.xp <= 0) &&
    (typeof next.level !== 'number' || next.level <= 1);
  if (nextLooksFresh) return true;

  const savedXP = typeof saved.xp === 'number' ? saved.xp : 0;
  const nextXP = typeof next.xp === 'number' ? next.xp : savedXP;
  const savedLevel = typeof saved.level === 'number' ? saved.level : 1;
  const nextLevel = typeof next.level === 'number' ? next.level : savedLevel;
  return nextXP < savedXP || nextLevel < savedLevel;
}

/**
 * GET  /api/player/:playerId — Get player data (auth required)
 * PUT  /api/player/:playerId — Update player data (auth required, own data only)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { playerId } = req.query;
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'Missing playerId parameter' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return; // 401 already sent

  if (req.method === 'GET') {
    try {
      const player = await getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.status(200).json(player);
    } catch (err) {
      console.error('Player get error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  if (req.method === 'PUT') {
    // Only allow players to update their own data
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: cannot modify another player' });
    }

    try {
      // Whitelist: only these fields are client-settable
      // quarks and science_points are NEVER settable via API —
      // they change only through deductQuarks()/creditQuarks()
      const ALLOWED_FIELDS = new Set([
        'game_state', 'game_phase', 'home_system_id', 'home_planet_id',
        'login_streak', 'last_login',
        'preferred_language', 'email_notifications', 'push_notifications', 'last_digest_seen',
      ]);

      const VALID_GAME_PHASES = new Set([
        'onboarding', 'exploring', 'researching', 'colonizing',
      ]);

      const sanitized: Record<string, unknown> = {};
      for (const key of Object.keys(req.body ?? {})) {
        if (ALLOWED_FIELDS.has(key)) {
          sanitized[key] = req.body[key];
        }
      }

      if (Object.keys(sanitized).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Validate game_phase enum
      if (sanitized.game_phase !== undefined && !VALID_GAME_PHASES.has(sanitized.game_phase as string)) {
        return res.status(400).json({ error: 'Invalid game_phase' });
      }

      // Validate preferred_language
      if (sanitized.preferred_language !== undefined &&
          !SUPPORTED_LANGUAGES.includes(sanitized.preferred_language as never)) {
        return res.status(400).json({ error: 'Invalid preferred_language' });
      }

      if (sanitized.game_state !== undefined) {
        const current = await getPlayer(playerId);
        if (!current) {
          return res.status(404).json({ error: 'Player not found' });
        }
        if (isGameStateRegression(current.game_state, sanitized.game_state)) {
          delete sanitized.game_state;
          if (Object.keys(sanitized).length === 0) {
            return res.status(409).json({ error: 'Ignored stale game_state regression' });
          }
        }
      }

      const player = await updatePlayer(playerId, sanitized);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.status(200).json(player);
    } catch (err) {
      console.error('Player update error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
