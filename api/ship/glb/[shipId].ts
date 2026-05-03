import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getShipModel, updateShipModel } from '../../../packages/server/src/db.js';
import { checkModelTask } from '../../../packages/server/src/tripo-client.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shipId } = req.query;
  if (!shipId || typeof shipId !== 'string') {
    return res.status(400).json({ error: 'Missing shipId parameter' });
  }

  try {
    const ship = await getShipModel(shipId);
    if (!ship) {
      return res.status(404).json({ error: 'Ship model not found' });
    }
    if (ship.status !== 'ready' || !ship.glb_url) {
      return res.status(404).json({ error: 'Ship model not ready' });
    }

    let glbUrl = ship.glb_url;
    let glbResponse = await fetch(glbUrl);

    if (!glbResponse.ok && ship.tripo_task_id) {
      try {
        const fresh = await checkModelTask(ship.tripo_task_id);
        if (fresh.glbUrl) {
          await updateShipModel(shipId, { glb_url: fresh.glbUrl });
          glbUrl = fresh.glbUrl;
          glbResponse = await fetch(glbUrl);
        }
      } catch (refreshErr) {
        console.error('[ship/glb] Failed to refresh GLB URL:', refreshErr);
      }
    }

    if (!glbResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch GLB from provider' });
    }

    const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());

    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Length', glbBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, max-age=1800');
    res.setHeader('Content-Disposition', `inline; filename="${shipId}.glb"`);

    return res.status(200).send(glbBuffer);
  } catch (err) {
    console.error('[ship/glb] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
