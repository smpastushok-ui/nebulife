import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPlanetModel, updatePlanetModel } from '../../../packages/server/src/db.js';
import { checkModelTask } from '../../../packages/server/src/tripo-client.js';

/**
 * GET /api/tripo/status/:modelId
 *
 * Check the status of a planet 3D model generation.
 * Returns: { status, progress?, glbUrl?, klingPhotoUrl? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { modelId } = req.query;
  if (!modelId || typeof modelId !== 'string') {
    return res.status(400).json({ error: 'Missing modelId parameter' });
  }

  try {
    const model = await getPlanetModel(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Planet model not found' });
    }

    // If already complete, return cached result
    if (model.status === 'ready' && model.glb_url) {
      return res.status(200).json({
        status: 'ready',
        glbUrl: model.glb_url,
        klingPhotoUrl: model.kling_photo_url,
      });
    }

    // If failed or payment pending, return current status
    if (model.status === 'failed' || model.status === 'payment_failed') {
      return res.status(200).json({ status: model.status });
    }

    if (model.payment_status !== 'paid') {
      return res.status(200).json({
        status: 'awaiting_payment',
        paymentStatus: model.payment_status,
      });
    }

    // If generating 3D and we have a tripo task, poll it
    if (model.tripo_task_id && (model.status === 'generating_3d' || model.status === 'running')) {
      const result = await checkModelTask(model.tripo_task_id);

      if (result.status === 'success' && result.glbUrl) {
        // Model ready!
        await updatePlanetModel(modelId, {
          glb_url: result.glbUrl,
          status: 'ready',
          completed_at: new Date().toISOString(),
        });

        return res.status(200).json({
          status: 'ready',
          glbUrl: result.glbUrl,
          klingPhotoUrl: model.kling_photo_url,
        });
      }

      if (result.status === 'failed' || result.status === 'cancelled') {
        await updatePlanetModel(modelId, { status: 'failed' });
        return res.status(200).json({ status: 'failed' });
      }

      return res.status(200).json({
        status: model.status,
        progress: result.progress,
        klingPhotoUrl: model.kling_photo_url,
      });
    }

    // Still generating photo or in queue
    return res.status(200).json({
      status: model.status,
      klingPhotoUrl: model.kling_photo_url,
    });
  } catch (err) {
    console.error('Tripo status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
