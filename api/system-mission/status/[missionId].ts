import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkVideoTaskStatus } from '../../../packages/server/src/kling-client.js';
import { getSystemMission, updateSystemMission } from '../../../packages/server/src/db.js';
import { enqueueSystemMissionReadyPush } from '../../../packages/server/src/push-events.js';

/**
 * GET /api/system-mission/status/[missionId]
 *
 * Returns: { status, videoUrl? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { missionId } = req.query;
    if (!missionId || typeof missionId !== 'string') {
      return res.status(400).json({ error: 'Missing missionId' });
    }

    const mission = await getSystemMission(missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Already completed?
    if (mission.status === 'succeed' || mission.status === 'failed') {
      return res.status(200).json({
        status: mission.status,
        videoUrl: mission.video_url,
      });
    }

    // Poll Kling Video
    if (!mission.kling_task_id) {
      return res.status(200).json({ status: mission.status });
    }

    const result = await checkVideoTaskStatus(mission.kling_task_id);

    // Update DB if status changed
    if (result.status === 'succeed' && result.videoUrl) {
      const updated = await updateSystemMission(missionId, {
        status: 'succeed',
        video_url: result.videoUrl,
      });
      if (updated) {
        await enqueueSystemMissionReadyPush({
          playerId: updated.player_id,
          missionId: updated.id,
          systemId: updated.system_id,
        });
      }
      return res.status(200).json({
        status: 'succeed',
        videoUrl: result.videoUrl,
      });
    }

    if (result.status === 'failed') {
      await updateSystemMission(missionId, { status: 'failed' });
      return res.status(200).json({ status: 'failed' });
    }

    return res.status(200).json({ status: result.status });
  } catch (err) {
    console.error('System mission status error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
