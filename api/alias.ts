import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlayerAliases, setPlayerAlias, removePlayerAlias } from '../packages/server/src/db.js';

/**
 * GET  /api/alias?playerId=...        → all aliases for a player
 * POST /api/alias                     → set/update an alias
 * DELETE /api/alias                   → remove an alias
 *
 * POST body: { playerId, entityType: 'system'|'planet', entityId, customName }
 * DELETE body: { playerId, entityType, entityId }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const playerId = req.query.playerId as string;
      if (!playerId) {
        return res.status(400).json({ error: 'Missing playerId' });
      }
      const aliases = await getPlayerAliases(playerId);
      return res.status(200).json({ aliases });
    }

    if (req.method === 'POST') {
      const { playerId, entityType, entityId, customName } = req.body;
      if (!playerId || !entityType || !entityId || !customName) {
        return res.status(400).json({ error: 'Missing required fields: playerId, entityType, entityId, customName' });
      }
      if (entityType !== 'system' && entityType !== 'planet') {
        return res.status(400).json({ error: 'entityType must be "system" or "planet"' });
      }
      if (typeof customName !== 'string' || customName.trim().length === 0 || customName.length > 50) {
        return res.status(400).json({ error: 'customName must be 1-50 characters' });
      }
      await setPlayerAlias(playerId, entityType, entityId, customName.trim());
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { playerId, entityType, entityId } = req.body;
      if (!playerId || !entityType || !entityId) {
        return res.status(400).json({ error: 'Missing required fields: playerId, entityType, entityId' });
      }
      await removePlayerAlias(playerId, entityType, entityId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Alias API error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
