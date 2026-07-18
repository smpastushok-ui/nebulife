import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { checkTaskStatus } from '../../../packages/server/src/kling-client.js';
import { getPlanetSkinById, updatePlanetSkin } from '../../../packages/server/src/db.js';
import { enqueuePlanetSkinReadyPush } from '../../../packages/server/src/push-events.js';
import {
  normalizePlanetTexture,
  PLANET_TEXTURE_VERSION,
} from '../../../packages/server/src/planet-texture-normalizer.js';

export const config = {
  maxDuration: 60,
};

async function normalizeLegacyTaskResult(imageUrl: string, skinId: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch legacy planet skin: ${response.status}`);
  }
  const normalized = await normalizePlanetTexture(Buffer.from(await response.arrayBuffer()));
  const blob = await put(
    `planet-skins/textures/${PLANET_TEXTURE_VERSION}/${skinId}.webp`,
    normalized.buffer,
    { access: 'public', contentType: 'image/webp' },
  );
  return blob.url;
}

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
      const textureUrl = await normalizeLegacyTaskResult(result.imageUrl, skinId);
      const updated = await updatePlanetSkin(skinId, {
        status: 'succeed',
        texture_url: textureUrl,
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
        textureUrl,
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

