import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkVideoTaskStatus } from '../../../../packages/server/src/kling-client.js';
import { getLifeformById, updateLifeformVideo } from '../../../../packages/server/src/db.js';

/**
 * GET /api/lifeform/video/status/[id]
 *
 * Returns: { status, videoUrl? }
 * Polls Kling for the Alpha-video task and persists completion.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing lifeform id' });
    }

    const lifeform = await getLifeformById(id);
    if (!lifeform) {
      return res.status(404).json({ error: 'Lifeform not found' });
    }

    if (lifeform.video_status === 'succeed' || lifeform.video_status === 'failed') {
      return res.status(200).json({ status: lifeform.video_status, videoUrl: lifeform.video_url });
    }

    if (!lifeform.video_task_id) {
      return res.status(200).json({ status: lifeform.video_status ?? 'idle' });
    }

    const result = await checkVideoTaskStatus(lifeform.video_task_id);

    if (result.status === 'succeed' && result.videoUrl) {
      await updateLifeformVideo(id, { video_status: 'succeed', video_url: result.videoUrl });
      return res.status(200).json({ status: 'succeed', videoUrl: result.videoUrl });
    }

    if (result.status === 'failed') {
      await updateLifeformVideo(id, { video_status: 'failed' });
      return res.status(200).json({ status: 'failed' });
    }

    return res.status(200).json({ status: result.status });
  } catch (err) {
    console.error('Lifeform video status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
