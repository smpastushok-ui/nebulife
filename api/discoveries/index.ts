import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDiscoveries, saveDiscovery, updateDiscoveryPhoto } from '../../packages/server/src/db.js';

/**
 * GET  /api/discoveries?playerId=...&category=...
 * POST /api/discoveries  { id, playerId, objectType, rarity, galleryCategory, systemId, planetId?, photoUrl? }
 *
 * Returns: DiscoveryRow | DiscoveryRow[]
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const playerId = req.query.playerId as string | undefined;
      const category = req.query.category as string | undefined;

      if (!playerId) {
        return res.status(400).json({ error: 'Missing playerId query parameter' });
      }

      const discoveries = await getDiscoveries(playerId, category);
      return res.status(200).json(discoveries);
    } catch (err) {
      console.error('Discoveries list error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, playerId, objectType, rarity, galleryCategory, systemId, planetId, photoUrl } = req.body ?? {};

      if (!id || !playerId || !objectType || !rarity || !galleryCategory || !systemId) {
        return res.status(400).json({ error: 'Missing required fields: id, playerId, objectType, rarity, galleryCategory, systemId' });
      }

      const row = await saveDiscovery({ id, playerId, objectType, rarity, galleryCategory, systemId, planetId });

      // If a photo URL (data URL or remote) was provided, save it too
      if (photoUrl) {
        await updateDiscoveryPhoto(id, photoUrl);
        (row as Record<string, unknown>).photo_url = photoUrl;
      }

      return res.status(200).json(row);
    } catch (err) {
      console.error('Discovery save error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
