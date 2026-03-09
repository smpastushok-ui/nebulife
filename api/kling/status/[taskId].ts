import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkTaskStatus } from '../../../packages/server/src/kling-client.js';
import { getKlingTask, updateKlingTask, updateDiscoveryPhoto } from '../../../packages/server/src/db.js';

/**
 * GET /api/kling/status/:taskId
 *
 * Returns: { status: 'pending'|'processing'|'succeed'|'failed', imageUrl?: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.query;
  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Missing taskId parameter' });
  }

  try {
    // Check if we already have a completed result in DB
    const existing = await getKlingTask(taskId);
    if (existing && existing.status === 'succeed' && existing.image_url) {
      return res.status(200).json({
        status: 'succeed' as const,
        imageUrl: existing.image_url,
      });
    }

    // Poll Kling API
    const result = await checkTaskStatus(taskId);

    // Update DB with new status
    await updateKlingTask(taskId, result.status, result.imageUrl);

    // If succeeded, also update the discovery's photo_url
    if (result.status === 'succeed' && result.imageUrl && existing?.discovery_id) {
      await updateDiscoveryPhoto(existing.discovery_id, result.imageUrl);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Kling status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
