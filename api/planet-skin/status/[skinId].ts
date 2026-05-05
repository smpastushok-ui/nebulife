import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkTaskStatus } from '../../../packages/server/src/kling-client.js';
import { getPlanetSkinById, updatePlanetSkin } from '../../../packages/server/src/db.js';
import { enqueuePlanetSkinReadyPush } from '../../../packages/server/src/push-events.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { skinId } = req.query;
  if (!skinId || typeof skinId !== 'string') {
    return res.status(400).json({ error: 'Missing skinId' });
  }

  try {
    const skin = await getPlanetSkinById(skinId);
    if (!skin) {
      return res.status(404).json({ error: 'Planet skin not found' });
    }

    if (skin.status === 'succeed' || skin.status === 'failed') {
      return res.status(200).json({
        status: skin.status,
        textureUrl: skin.texture_url,
        kind: skin.kind,
        planetId: skin.planet_id,
        systemId: skin.system_id,
      });
    }

    if (!skin.kling_task_id) {
      return res.status(200).json({ status: skin.status, kind: skin.kind });
    }

    const result = await checkTaskStatus(skin.kling_task_id);
    if (result.status === 'succeed' && result.imageUrl) {
      const updated = await updatePlanetSkin(skinId, {
        status: 'succeed',
        texture_url: result.imageUrl,
      });
      if (updated?.generated_by) {
        await enqueuePlanetSkinReadyPush({
          playerId: updated.generated_by,
          skinId: updated.id,
          planetId: updated.planet_id,
          systemId: updated.system_id,
          kind: updated.kind,
        });
      }
      return res.status(200).json({
        status: 'succeed',
        textureUrl: result.imageUrl,
        kind: skin.kind,
        planetId: skin.planet_id,
        systemId: skin.system_id,
      });
    }

    if (result.status === 'failed') {
      await updatePlanetSkin(skinId, { status: 'failed' });
      return res.status(200).json({
        status: 'failed',
        kind: skin.kind,
        planetId: skin.planet_id,
        systemId: skin.system_id,
      });
    }

    return res.status(200).json({
      status: result.status,
      kind: skin.kind,
      planetId: skin.planet_id,
      systemId: skin.system_id,
    });
  } catch (err) {
    console.error('[planet-skin/status] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

