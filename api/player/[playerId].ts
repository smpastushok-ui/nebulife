import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayer, updatePlayer, type PlayerRow } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';
import { SUPPORTED_LANGUAGES } from '@nebulife/core';

/**
 * Guards against a stale client snapshot rolling back progress (the
 * Explorer-943 incident: a Level-50 row regressed to Level 28 because an older
 * in-memory snapshot was flushed over the newer DB state).
 *
 * The "highest ever reached" floor is computed from BOTH the game_state JSON
 * snapshot AND the GREATEST-protected `player_xp` / `player_level` columns —
 * those columns can never regress, so they remain a trustworthy floor even if
 * the JSON snapshot desynced from them. Any incoming write below that floor is
 * treated as stale and its game_state is dropped.
 */
/** Count researched tech-tree nodes inside a game_state.tech_tree blob. */
function countResearchedTech(gameState: unknown): number {
  if (!gameState || typeof gameState !== 'object') return 0;
  const techTree = (gameState as Record<string, unknown>).tech_tree;
  if (!techTree || typeof techTree !== 'object') return 0;
  const researched = (techTree as Record<string, unknown>).researched;
  if (!researched || typeof researched !== 'object') return 0;
  return Object.keys(researched as Record<string, unknown>).length;
}

function isGameStateRegression(current: PlayerRow, incoming: unknown): boolean {
  if (!incoming || typeof incoming !== 'object') return false;
  const saved = (current.game_state ?? {}) as Record<string, unknown>;
  const next = incoming as Record<string, unknown>;

  const columnXP = typeof current.player_xp === 'number' ? current.player_xp : 0;
  const columnLevel = typeof current.player_level === 'number' ? current.player_level : 1;

  const savedWasStarted =
    saved.onboarding_done === true ||
    typeof saved.xp === 'number' ||
    typeof saved.level === 'number' ||
    columnXP > 0 ||
    columnLevel > 1;
  if (!savedWasStarted) return false;

  // A partial patch that carries NO identity fields (xp / level /
  // onboarding_done) is not a "fresh reset" — it just updates other keys
  // (hex_slots_by_planet, colony_resources, missions, …). The client saves
  // surface/colony state exactly like this: { hex_slots_by_planet: {...} }.
  // Judging absence as freshness dropped every such partial write, so a freshly
  // built structure never reached the DB and reverted on re-entry. Only run the
  // freshness heuristic when the payload actually intends to set identity.
  const carriesIdentity =
    next.onboarding_done !== undefined ||
    next.xp !== undefined ||
    next.level !== undefined;

  const nextLooksFresh =
    carriesIdentity &&
    next.onboarding_done !== true &&
    (typeof next.xp !== 'number' || next.xp <= 0) &&
    (typeof next.level !== 'number' || next.level <= 1);
  if (nextLooksFresh) return true;

  // Floor = highest value seen in either the JSON snapshot or the protected
  // columns. A correct client never writes below its own previously synced max.
  const savedXP = Math.max(typeof saved.xp === 'number' ? saved.xp : 0, columnXP);
  const savedLevel = Math.max(typeof saved.level === 'number' ? saved.level : 1, columnLevel);
  const nextXP = typeof next.xp === 'number' ? next.xp : savedXP;
  const nextLevel = typeof next.level === 'number' ? next.level : savedLevel;

  // 1 XP tolerance so a legitimate equal/idempotent save is never dropped.
  if (nextXP < savedXP - 1 || nextLevel < savedLevel) return true;

  // Tech tree must never shrink. The researched set is monotonic (nodes are
  // never un-researched), so a smaller incoming set means the client is
  // flushing a stale snapshot — which would silently undo progress (and any
  // manual restore). Only evaluated when the write actually carries a
  // tech_tree, so partial patches are unaffected.
  if (next.tech_tree !== undefined && countResearchedTech(next) < countResearchedTech(saved)) {
    return true;
  }

  return false;
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
    // Throttle reads by the CALLER's id (not the target) so a single token
    // can't enumerate / hammer player records. Shared 'poll' budget with the
    // chat/presence polling endpoints.
    if (!await RATE_LIMITS.poll(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }
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
        if (isGameStateRegression(current, sanitized.game_state)) {
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
