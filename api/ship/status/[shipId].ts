import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../../packages/server/src/auth-middleware.js';
import { getShipModel, updateShipModel } from '../../../packages/server/src/db.js';
import { checkTaskStatus as checkKlingStatus } from '../../../packages/server/src/kling-client.js';
import { checkModelTask, createShipModelTask, createShipTextModelTask } from '../../../packages/server/src/tripo-client.js';
import { buildShipModelNegativePrompt, buildShipModelPrompt } from '../../../packages/server/src/ship-prompt.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { shipId } = req.query;
  if (!shipId || typeof shipId !== 'string') {
    return res.status(400).json({ error: 'Missing shipId parameter' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const ship = await getShipModel(shipId);
    if (!ship) {
      return res.status(404).json({ error: 'Ship model not found' });
    }
    if (ship.player_id !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (ship.status === 'ready' && ship.glb_url) {
      return res.status(200).json({
        status: 'ready',
        progress: 100,
        conceptUrl: ship.concept_url,
        glbUrl: `/api/ship/glb/${shipId}`,
      });
    }

    if (ship.status === 'failed') {
      return res.status(200).json({ status: 'failed', reason: ship.moderation_reason });
    }

    if (ship.tripo_task_id && (ship.status === 'generating_3d' || ship.status === 'running')) {
      const result = await checkModelTask(ship.tripo_task_id);

      if (result.status === 'success' && result.glbUrl) {
        await updateShipModel(shipId, {
          glb_url: result.glbUrl,
          status: 'ready',
          completed_at: new Date().toISOString(),
        });
        return res.status(200).json({
          status: 'ready',
          progress: 100,
          conceptUrl: ship.concept_url,
          glbUrl: `/api/ship/glb/${shipId}`,
        });
      }

      if (result.status === 'failed' || result.status === 'cancelled') {
        await updateShipModel(shipId, { status: 'failed' });
        return res.status(200).json({ status: 'failed' });
      }

      return res.status(200).json({
        status: 'generating_3d',
        progress: result.progress,
        conceptUrl: ship.concept_url,
      });
    }

    if (ship.status === 'generating_concept' && ship.kling_task_id && !ship.concept_url) {
      const kling = await checkKlingStatus(ship.kling_task_id);

      if (kling.status === 'succeed' && kling.imageUrl) {
        await updateShipModel(shipId, {
          concept_url: kling.imageUrl,
          status: 'generating_3d',
        });
        const { taskId } = await createShipModelTask(kling.imageUrl);
        await updateShipModel(shipId, { tripo_task_id: taskId });
        return res.status(200).json({
          status: 'generating_3d',
          progress: 0,
          conceptUrl: kling.imageUrl,
        });
      }

      if (kling.status === 'failed') {
        await updateShipModel(shipId, { status: 'failed' });
        return res.status(200).json({ status: 'failed' });
      }

      return res.status(200).json({
        status: 'generating_concept',
        progress: 15,
      });
    }

    if (ship.status === 'generating_concept' && !ship.kling_task_id) {
      const prompt = buildShipModelPrompt(ship.prompt);
      const { taskId } = await createShipTextModelTask(prompt, buildShipModelNegativePrompt());
      await updateShipModel(shipId, { tripo_task_id: taskId, prompt_used: prompt, status: 'generating_3d' });
      return res.status(200).json({ status: 'generating_3d', progress: 0 });
    }

    if (ship.status === 'generating_3d' && !ship.tripo_task_id) {
      if (ship.concept_url) {
        const { taskId } = await createShipModelTask(ship.concept_url);
        await updateShipModel(shipId, { tripo_task_id: taskId });
        return res.status(200).json({
          status: 'generating_3d',
          progress: 0,
          conceptUrl: ship.concept_url,
        });
      }
      const prompt = ship.prompt_used?.startsWith('A unique original small player spacecraft 3D model')
        ? ship.prompt_used
        : buildShipModelPrompt(ship.prompt);
      const { taskId } = await createShipTextModelTask(prompt, buildShipModelNegativePrompt());
      await updateShipModel(shipId, { tripo_task_id: taskId, prompt_used: prompt });
      return res.status(200).json({
        status: 'generating_3d',
        progress: 0,
      });
    }

    return res.status(200).json({
      status: ship.status,
      conceptUrl: ship.concept_url,
      progress: ship.status === 'generating_concept' ? 10 : 0,
    });
  } catch (err) {
    console.error('[ship/status] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
