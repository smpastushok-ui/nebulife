import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { getDiscoveries, saveDiscovery, updateDiscoveryPhoto } from '../../packages/server/src/db.js';
import { authenticate } from '../../packages/server/src/auth-middleware.js';

export const config = {
  maxDuration: 30,
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; ext: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length <= 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  return { buffer, mimeType, ext };
}

/**
 * GET  /api/discoveries?playerId=...&category=... (auth required)
 * POST /api/discoveries  { id, playerId, objectType, rarity, galleryCategory, systemId, planetId?, photoUrl? } (auth required)
 *
 * Returns: DiscoveryRow | DiscoveryRow[]
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

      // Verify player owns this playerId
      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
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

      // Verify player owns this playerId
      if (playerId !== auth.playerId) {
        return res.status(403).json({ error: 'Forbidden: player mismatch' });
      }

      const row = await saveDiscovery({ id, playerId, objectType, rarity, galleryCategory, systemId, planetId });

      // If a photo was provided, persist it. Base64 data URLs get uploaded to Blob
      // storage so the DB only ever stores a short public URL (never the raw image).
      if (typeof photoUrl === 'string' && photoUrl.length > 0) {
        let storedUrl = photoUrl;
        const parsed = parseImageDataUrl(photoUrl);
        if (parsed) {
          const blob = await put(
            `discoveries/${playerId}/${id}-${Date.now()}.${parsed.ext}`,
            parsed.buffer,
            { access: 'public', contentType: parsed.mimeType },
          );
          storedUrl = blob.url;
        }
        await updateDiscoveryPhoto(id, storedUrl);
        (row as unknown as Record<string, unknown>).photo_url = storedUrl;
      }

      return res.status(200).json(row);
    } catch (err) {
      console.error('Discovery save error:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
