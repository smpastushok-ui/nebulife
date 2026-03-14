import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModel, updatePlanetModel } from '../../packages/server/src/db.js';
import { generateImage, checkTaskStatus as checkKlingStatus } from '../../packages/server/src/kling-client.js';
import { createModelTask } from '../../packages/server/src/tripo-client.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * POST /api/tripo/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: {
 *   modelId: string,        // planet_model record ID
 *   klingPhotoUrl?: string,  // optional: skip Kling, use existing photo
 * }
 *
 * Manually trigger generation (if payment already confirmed).
 * Can re-use an existing Kling photo or generate a new one.
 *
 * Returns: { modelId, status, tripoTaskId? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { modelId, klingPhotoUrl } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: 'Missing required field: modelId' });
    }

    // 1. Verify model exists and payment is confirmed
    const model = await getPlanetModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Planet model not found' });
    }

    // Verify authenticated player owns this model
    if (model.player_id !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: not your model' });
    }

    if (model.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not confirmed', paymentStatus: model.payment_status });
    }

    // If already has GLB — return it
    if (model.status === 'ready' && model.glb_url) {
      return res.status(200).json({ modelId, status: 'ready', glbUrl: model.glb_url });
    }

    // 2. Get image URL (from param, existing record, or generate new)
    let imageUrl = klingPhotoUrl || model.kling_photo_url;

    if (!imageUrl) {
      // Generate new Kling photo
      await updatePlanetModel(modelId, { status: 'generating_photo' });

      const prompt = `Hyperrealistic photograph of an alien planet surface and atmosphere from space orbit, planet ID: ${model.planet_id}, star system: ${model.system_id}. Dramatic lighting, volumetric clouds, detailed terrain, photorealistic quality, cinematic composition, 8K resolution.`;

      const { taskId: klingTaskId } = await generateImage({ prompt, aspectRatio: '1:1' });

      // Poll Kling (within serverless timeout ~25s, do limited polling)
      for (let i = 0; i < 8; i++) {
        await sleep(3000);
        const result = await checkKlingStatus(klingTaskId);
        if (result.status === 'succeed' && result.imageUrl) {
          imageUrl = result.imageUrl;
          break;
        }
        if (result.status === 'failed') {
          await updatePlanetModel(modelId, { status: 'failed' });
          return res.status(500).json({ error: 'Photo generation failed' });
        }
      }

      if (!imageUrl) {
        // Photo still generating — client should poll status
        await updatePlanetModel(modelId, { status: 'generating_photo' });
        return res.status(202).json({
          modelId,
          status: 'generating_photo',
          message: 'Photo still generating, poll /api/tripo/status/:modelId',
        });
      }

      await updatePlanetModel(modelId, { kling_photo_url: imageUrl });
    }

    // 3. Send to Tripo3D
    await updatePlanetModel(modelId, { status: 'generating_3d' });
    const { taskId: tripoTaskId } = await createModelTask(imageUrl);

    await updatePlanetModel(modelId, { tripo_task_id: tripoTaskId });

    return res.status(200).json({
      modelId,
      status: 'generating_3d',
      tripoTaskId,
    });
  } catch (err) {
    console.error('Tripo generate error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
