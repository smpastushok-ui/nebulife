import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlanetSkin, getPlanetSkinsForSystem } from '../../packages/server/src/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { systemId, planetId, kind } = req.query;
    if (planetId && typeof planetId === 'string') {
      const skinKind = kind === 'exosphere' ? 'exosphere' : 'system';
      const skin = await getPlanetSkin(planetId, skinKind);
      return res.status(200).json({ skins: skin ? [skin] : [] });
    }

    if (!systemId || typeof systemId !== 'string') {
      return res.status(400).json({ error: 'Missing systemId or planetId' });
    }

    const skins = await getPlanetSkinsForSystem(systemId);
    return res.status(200).json({ skins });
  } catch (err) {
    console.error('[planet-skin/list] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

