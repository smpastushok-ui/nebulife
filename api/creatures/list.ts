import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, listCreaturesByPlanet } from '@nebulife/server';

function isMissingCreatureModelsTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('creature_models') && message.includes('does not exist');
}

/**
 * GET /api/creatures/list?planetId=<planetId>
 *
 * Returns the authenticated player's creatures settled on the given planet
 * (max 3 — enforced at generation time in api/creatures/generate.ts).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planetId } = req.query;
  if (!planetId || typeof planetId !== 'string') {
    return res.status(400).json({ error: 'Missing planetId parameter' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const creatures = await listCreaturesByPlanet(planetId, auth.playerId);
    return res.status(200).json({ creatures });
  } catch (err) {
    if (isMissingCreatureModelsTable(err)) {
      return res.status(200).json({ creatures: [], storageMissing: true });
    }
    console.error('[creatures/list] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
