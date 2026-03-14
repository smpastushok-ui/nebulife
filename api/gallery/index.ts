import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDiscoveries, deleteDiscovery } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

/**
 * GET    /api/gallery?playerId=...&category=cosmos|flora|fauna|anomalies|landscapes (auth required)
 * DELETE /api/gallery?id=...&playerId=... (auth required)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify Firebase auth token
  const auth = await authenticate(req, res);
  if (!auth) return;

  if (req.method === 'GET') {
    try {
      const playerId = req.query.playerId as string | undefined;
      const category = req.query.category as string | undefined;

      if (!playerId) {
        return res.status(400).json({ error: 'Missing playerId query parameter' });
      }

      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      // Gallery only shows discoveries that have photos
      const all = await getDiscoveries(playerId, category);
      const withPhotos = all.filter((d) => d.photo_url);

      return res.status(200).json(withPhotos);
    } catch (err) {
      console.error('Gallery list error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = req.query.id as string | undefined;
      const playerId = req.query.playerId as string | undefined;

      if (!id || !playerId) {
        return res.status(400).json({ error: 'Missing id and playerId query parameters' });
      }

      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      await deleteDiscovery(id, playerId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Gallery delete error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
