import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Planet, Star } from '@nebulife/core';
import { getPlanetModel, updatePlanetModel } from '../../../packages/server/src/db.js';
// Legacy Kling task polling — kept only for in-flight rows created before
// the Gemini switch. New "generating_photo" rows never get a kling_task_id
// (see the recovery branch below), so this path is unreachable going
// forward but still resolves any pre-existing tasks.
import { checkTaskStatus as checkKlingStatus } from '../../../packages/server/src/kling-client.js';
import { generateImageWithGemini } from '../../../packages/server/src/gemini-client.js';
import { checkModelTask, createModelTask } from '../../../packages/server/src/tripo-client.js';
import { buildPlanetModelPrompt } from '../../../packages/server/src/planet-model-prompt-builder.js';

/**
 * GET /api/tripo/status/:modelId
 *
 * Check the status of a planet 3D model generation.
 * Acts as a pull-based pipeline driver — each poll advances the pipeline one step.
 * Pattern mirrors api/surface/status/[id].ts.
 *
 * Returns: { status, progress?, glbUrl?, klingPhotoUrl? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Prevent browser/CDN caching — status changes on each poll
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

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

    // If already complete, return proxied URL (Tripo CDN doesn't have CORS headers)
    if (model.status === 'ready' && model.glb_url) {
      return res.status(200).json({
        status: 'ready',
        glbUrl: `/api/tripo/glb/${modelId}`,
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

    // --- Tripo phase: has tripo_task_id → poll Tripo ---
    if (model.tripo_task_id && (model.status === 'generating_3d' || model.status === 'running')) {
      const result = await checkModelTask(model.tripo_task_id);
      console.log(`Tripo check: model=${modelId}, tripoTask=${model.tripo_task_id}, status=${result.status}, progress=${result.progress}, glbUrl=${result.glbUrl ? 'yes' : 'no'}`);

      if (result.status === 'success' && result.glbUrl) {
        await updatePlanetModel(modelId, {
          glb_url: result.glbUrl,
          status: 'ready',
          completed_at: new Date().toISOString(),
        });
        return res.status(200).json({
          status: 'ready',
          glbUrl: `/api/tripo/glb/${modelId}`,
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

    // --- Kling phase: has kling_task_id but no photo yet → check Kling ---
    if (model.status === 'generating_photo' && model.kling_task_id && !model.kling_photo_url) {
      const klingResult = await checkKlingStatus(model.kling_task_id);

      if (klingResult.status === 'succeed' && klingResult.imageUrl) {
        // Kling done — save photo and create Tripo task
        await updatePlanetModel(modelId, {
          kling_photo_url: klingResult.imageUrl,
          status: 'generating_3d',
        });
        const { taskId: tripoTaskId } = await createModelTask(klingResult.imageUrl);
        await updatePlanetModel(modelId, { tripo_task_id: tripoTaskId });
        return res.status(200).json({
          status: 'generating_3d',
          progress: 0,
          klingPhotoUrl: klingResult.imageUrl,
        });
      }

      if (klingResult.status === 'failed') {
        await updatePlanetModel(modelId, { status: 'failed' });
        return res.status(200).json({ status: 'failed' });
      }

      return res.status(200).json({ status: 'generating_photo', klingPhotoUrl: null });
    }

    // --- Recovery: no photo yet → generate synchronously via Gemini, then
    // start the Tripo task immediately (no async task/polling needed) ---
    if (model.status === 'generating_photo' && !model.kling_task_id && !model.kling_photo_url) {
      const prompt = model.planet_data && model.star_data
        ? buildPlanetModelPrompt(model.planet_data as unknown as Planet, model.star_data as unknown as Star)
        : buildKlingPrompt(model.planet_id, model.system_id);
      const generated = await generateImageWithGemini({
        prompt,
        aspectRatio: '1:1',
        imageSize: '1K',
        uploadPrefix: 'planet-models',
      });
      await updatePlanetModel(modelId, { kling_photo_url: generated.imageUrl, status: 'generating_3d' });
      const { taskId: tripoTaskId } = await createModelTask(generated.imageUrl);
      await updatePlanetModel(modelId, { tripo_task_id: tripoTaskId });
      return res.status(200).json({
        status: 'generating_3d',
        progress: 0,
        klingPhotoUrl: generated.imageUrl,
      });
    }

    // --- Recovery: has photo but no tripo task → create Tripo task ---
    if (model.status === 'generating_3d' && model.kling_photo_url && !model.tripo_task_id) {
      const { taskId: tripoTaskId } = await createModelTask(model.kling_photo_url);
      await updatePlanetModel(modelId, { tripo_task_id: tripoTaskId });
      return res.status(200).json({
        status: 'generating_3d',
        progress: 0,
        klingPhotoUrl: model.kling_photo_url,
      });
    }

    // Fallback: return current status
    return res.status(200).json({
      status: model.status,
      klingPhotoUrl: model.kling_photo_url,
    });
  } catch (err) {
    console.error('Tripo status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}

function buildKlingPrompt(planetId: string, systemId: string): string {
  return `Hyperrealistic photograph of an alien planet surface and atmosphere from space orbit, planet ID: ${planetId}, star system: ${systemId}. Dramatic lighting, volumetric clouds, detailed terrain, photorealistic quality, cinematic composition, 8K resolution.`;
}
