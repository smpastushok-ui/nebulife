import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticate,
  checkModelTask,
  creditQuarks,
  getCreatureModel,
  isFinalTripoFailure,
  tryStoreGlbFromUrl,
  updateCreatureModel,
} from '@nebulife/server';

export const config = {
  maxDuration: 30,
};

function isMissingCreatureModelsTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('creature_models') && message.includes('does not exist');
}

/**
 * GET /api/creatures/status?id=<creatureId>
 *
 * Polls the Tripo task for a creature that is still generating. On success,
 * downloads the GLB and re-hosts it on Vercel Blob (glb-storage.ts) before
 * marking the creature ready — Tripo's CDN URL is never persisted long-term.
 *
 * Returns: { status, progress?, imageUrl?, glbUrl? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const creature = await getCreatureModel(id);
    if (!creature) {
      return res.status(404).json({ error: 'Creature not found' });
    }
    if (creature.player_id !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (creature.status === 'ready' && creature.glb_url) {
      return res.status(200).json({
        status: 'ready',
        progress: 100,
        imageUrl: creature.image_url,
        glbUrl: creature.glb_url,
      });
    }

    if (creature.status === 'failed') {
      return res.status(200).json({ status: 'failed', imageUrl: creature.image_url });
    }

    // Photo-tier hybrids ("дослід схрещування", migration 042) are terminal
    // until upgraded — early return so a stale tripo_task_id from a reverted
    // upgrade attempt is never re-polled (which would re-refund).
    if (creature.status === 'photo_ready') {
      return res.status(200).json({ status: 'photo_ready', imageUrl: creature.image_url });
    }

    if (creature.tripo_task_id) {
      const result = await checkModelTask(creature.tripo_task_id);

      if (result.status === 'success' && result.glbUrl) {
        const stored = await tryStoreGlbFromUrl(result.glbUrl, 'creature-models');
        const updated = await updateCreatureModel(id, {
          glb_url: stored?.url ?? result.glbUrl,
          status: 'ready',
          completed_at: new Date().toISOString(),
        });
        return res.status(200).json({
          status: 'ready',
          progress: 100,
          imageUrl: creature.image_url,
          glbUrl: updated?.glb_url ?? result.glbUrl,
        });
      }

      if (isFinalTripoFailure(result.status)) {
        // Photo-tier creatures (hybrid or plain experiment) being UPGRADED to
        // 3D revert to 'photo_ready' instead of 'failed' — the purchased
        // photo is kept, only the upgrade attempt's quarks (quarks_paid was
        // set to the upgrade cost by hybrid-upgrade.ts) are refunded, and the
        // upgrade can be retried. Fresh generate.ts/hybridize.ts full-tier
        // attempts fail outright instead (completed_at is only set once a
        // photo tier already completed, so it cleanly separates the two).
        const revertToPhoto = Boolean((creature.hybrid_photo_url || creature.image_url) && creature.completed_at);
        await updateCreatureModel(id, { status: revertToPhoto ? 'photo_ready' : 'failed' });
        if (creature.quarks_paid > 0) {
          try { await creditQuarks(creature.player_id, creature.quarks_paid); } catch (refundErr) {
            console.error('[creatures/status] Refund failed:', refundErr);
          }
        }
        return res.status(200).json({
          status: revertToPhoto ? 'photo_ready' : 'failed',
          imageUrl: creature.image_url,
        });
      }

      return res.status(200).json({
        status: 'generating',
        progress: result.progress,
        imageUrl: creature.image_url,
      });
    }

    return res.status(200).json({ status: creature.status, imageUrl: creature.image_url });
  } catch (err) {
    if (isMissingCreatureModelsTable(err)) {
      return res.status(503).json({ error: 'Creature generation database migration is not installed' });
    }
    console.error('[creatures/status] Error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
