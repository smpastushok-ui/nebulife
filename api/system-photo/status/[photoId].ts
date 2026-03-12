import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkTaskStatus } from '../../../packages/server/src/kling-client.js';
import { getSystemPhotoById, updateSystemPhoto } from '../../../packages/server/src/db.js';

/**
 * GET /api/system-photo/status/[photoId]
 *
 * Returns: { status, photoUrl? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photoId } = req.query;
    if (!photoId || typeof photoId !== 'string') {
      return res.status(400).json({ error: 'Missing photoId' });
    }

    const photo = await getSystemPhotoById(photoId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Already completed?
    if (photo.status === 'succeed' || photo.status === 'failed') {
      return res.status(200).json({
        status: photo.status,
        photoUrl: photo.photo_url,
      });
    }

    // Poll Kling
    if (!photo.kling_task_id) {
      return res.status(200).json({ status: photo.status });
    }

    const result = await checkTaskStatus(photo.kling_task_id);

    // Update DB if status changed
    if (result.status === 'succeed' && result.imageUrl) {
      await updateSystemPhoto(photoId, {
        status: 'succeed',
        photo_url: result.imageUrl,
      });
      return res.status(200).json({
        status: 'succeed',
        photoUrl: result.imageUrl,
      });
    }

    if (result.status === 'failed') {
      await updateSystemPhoto(photoId, { status: 'failed' });
      return res.status(200).json({ status: 'failed' });
    }

    return res.status(200).json({ status: result.status });
  } catch (err) {
    console.error('System photo status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
