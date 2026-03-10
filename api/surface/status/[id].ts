import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getSurfaceMapById,
  updateSurfaceMap,
  checkTaskStatus,
  analyzePhotoForZones,
} from '@nebulife/server';

/**
 * GET /api/surface/status/:surfaceMapId
 *
 * Returns: {
 *   status: 'generating' | 'analyzing' | 'ready' | 'failed',
 *   photoUrl?: string,
 *   zoneMap?: object[],
 *   progress?: number
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: surfaceMapId } = req.query;

    if (!surfaceMapId || typeof surfaceMapId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid surface map ID' });
    }

    // Get surface map from database
    const surfaceMap = await getSurfaceMapById(surfaceMapId);
    if (!surfaceMap) {
      return res.status(404).json({ error: 'Surface map not found' });
    }

    // If already ready, return cached result immediately
    if (surfaceMap.status === 'ready') {
      return res.status(200).json({
        status: 'ready',
        photoUrl: surfaceMap.photo_url,
        zoneMap: surfaceMap.zone_map,
        generationCount: surfaceMap.generation_count,
      });
    }

    // If failed, return error
    if (surfaceMap.status === 'failed') {
      return res.status(400).json({
        status: 'failed',
        error: 'Surface generation failed',
      });
    }

    // Check Kling task status
    if (!surfaceMap.kling_task_id) {
      return res.status(500).json({
        error: 'No Kling task ID found',
        status: 'error',
      });
    }

    const taskStatus = await checkTaskStatus(surfaceMap.kling_task_id);

    // Task still processing or pending
    if (taskStatus.status === 'processing' || taskStatus.status === 'pending') {
      return res.status(200).json({
        status: 'generating',
        progress: taskStatus.status === 'processing' ? 50 : 10,
      });
    }

    // Task failed
    if (taskStatus.status === 'failed') {
      await updateSurfaceMap(surfaceMapId, { status: 'failed' });
      return res.status(400).json({
        status: 'failed',
        error: 'Kling image generation failed',
      });
    }

    // Task succeeded — analyze photo
    // NOTE: Kling returns 'succeed' (without 'd'), imageUrl (camelCase)
    if (taskStatus.status === 'succeed' && taskStatus.imageUrl) {
      try {
        // Analyze photo to detect zones
        const zoneMap = await analyzePhotoForZones(taskStatus.imageUrl);

        // Update surface map with photo and zones
        const updated = await updateSurfaceMap(surfaceMapId, {
          status: 'ready',
          photo_url: taskStatus.imageUrl,
          zone_map: {
            zones: zoneMap,
            gridWidth: 64,
            gridHeight: 36,
          },
        });

        if (!updated) {
          return res.status(500).json({
            error: 'Failed to save surface map',
            status: 'error',
          });
        }

        return res.status(200).json({
          status: 'ready',
          photoUrl: updated.photo_url,
          zoneMap: updated.zone_map,
          generationCount: updated.generation_count,
        });
      } catch (analyzeError) {
        console.error('Photo analysis error:', analyzeError);
        // Even if analysis fails, we have the photo
        const updated = await updateSurfaceMap(surfaceMapId, {
          status: 'ready',
          photo_url: taskStatus.imageUrl,
          zone_map: {
            gridWidth: 64,
            gridHeight: 36,
            error: 'Zone analysis failed',
          },
        });

        return res.status(200).json({
          status: 'ready',
          photoUrl: updated?.photo_url,
          zoneMap: updated?.zone_map,
          warning: 'Zone analysis could not complete, using default zones',
        });
      }
    }

    // Unexpected state
    return res.status(200).json({
      status: surfaceMap.status,
      progress: 0,
    });
  } catch (error) {
    console.error('Surface status check error:', error);
    return res.status(500).json({
      error: 'Failed to check surface status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
