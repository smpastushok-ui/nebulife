import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModel, updatePlanetModel } from '../../packages/server/src/db.js';
import { generateImageWithGemini } from '../../packages/server/src/gemini-client.js';
import { createModelTask } from '../../packages/server/src/tripo-client.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

// Allow up to 60s for the (synchronous) Gemini concept-photo generation.
export const config = {
  maxDuration: 60,
};

/**
 * POST /api/tripo/generate
 *
 * Auth: Bearer token (Firebase)
 * Body: {
 *   modelId: string,        // planet_model record ID
 *   klingPhotoUrl?: string, // optional: skip generation, use existing photo
 * }
 *
 * Manually trigger generation (if payment already confirmed).
 * Can re-use an existing concept photo or generate a new one via Gemini.
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
      // Generate a new concept photo synchronously via Gemini (Nano Banana 2
      // Lite) — no async task/polling needed like the old Kling pipeline.
      await updatePlanetModel(modelId, { status: 'generating_photo' });

      const prompt = `Hyperrealistic photograph of an alien planet surface and atmosphere from space orbit, planet ID: ${model.planet_id}, star system: ${model.system_id}. Dramatic lighting, volumetric clouds, detailed terrain, photorealistic quality, cinematic composition, 8K resolution.`;

      const generated = await generateImageWithGemini({
        prompt,
        aspectRatio: '1:1',
        imageSize: '1K',
        uploadPrefix: 'planet-models',
      });
      imageUrl = generated.imageUrl;

      // Field name is historical (kling_photo_url) — now holds the Gemini
      // output URL; renaming would require a DB migration for no benefit.
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
