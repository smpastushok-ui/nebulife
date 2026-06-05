import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkTaskStatus } from '../../../../packages/server/src/kling-client.js';
import { getLifeformById, updateLifeformPhoto } from '../../../../packages/server/src/db.js';

/**
 * GET /api/lifeform/photo/status/[id]
 *
 * Returns: { status, photoUrl? }
 * Polls Kling for the Alpha-photo task and persists completion.
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

    if (lifeform.photo_status === 'succeed' || lifeform.photo_status === 'failed') {
      return res.status(200).json({ status: lifeform.photo_status, photoUrl: lifeform.photo_url });
    }

    if (!lifeform.photo_task_id) {
      return res.status(200).json({ status: lifeform.photo_status ?? 'idle' });
    }

    const result = await checkTaskStatus(lifeform.photo_task_id);

    if (result.status === 'succeed' && result.imageUrl) {
      await updateLifeformPhoto(id, { photo_status: 'succeed', photo_url: result.imageUrl });
      return res.status(200).json({ status: 'succeed', photoUrl: result.imageUrl });
    }

    if (result.status === 'failed') {
      await updateLifeformPhoto(id, { photo_status: 'failed' });
      return res.status(200).json({ status: 'failed' });
    }

    return res.status(200).json({ status: result.status });
  } catch (err) {
    console.error('Lifeform photo status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
