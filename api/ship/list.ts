import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getShipModels } from '../../packages/server/src/db.js';

function isMissingShipModelsTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('ship_models') && message.includes('does not exist');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const ships = await getShipModels(auth.playerId);
    return res.status(200).json({
      ships: ships.map((ship) => ({
        ...ship,
        glb_url: ship.status === 'ready' && ship.glb_url ? `/api/ship/glb/${ship.id}` : null,
      })),
    });
  } catch (err) {
    if (isMissingShipModelsTable(err)) {
      return res.status(200).json({ ships: [], storageMissing: true });
    }
    console.error('[ship/list] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
