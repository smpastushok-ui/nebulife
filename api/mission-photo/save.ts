import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { saveSystemPhoto } from '../../packages/server/src/db.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const { playerId, photoKey, imageDataUrl, promptUsed } = req.body as {
      playerId?: string;
      photoKey?: string;
      imageDataUrl?: string;
      promptUsed?: string;
    };

    if (!playerId || !photoKey || !imageDataUrl || !promptUsed) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (playerId !== auth.playerId) {
      return res.status(403).json({ error: 'Forbidden: player mismatch' });
    }
    if (!/^planet-(probe|rover)-[a-zA-Z0-9_-]+/.test(photoKey)) {
      return res.status(400).json({ error: 'Invalid mission photo key' });
    }

    const parsed = parseImageDataUrl(imageDataUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid or too large image' });
    }

    const blob = await put(`mission-photos/${playerId}/${photoKey}-${Date.now()}.${parsed.ext}`, parsed.buffer, {
      access: 'public',
      contentType: parsed.mimeType,
    });

    const photoId = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const saved = await saveSystemPhoto({
      id: photoId,
      playerId,
      systemId: photoKey,
      promptUsed,
      status: 'succeed',
      photoUrl: blob.url,
    });

    return res.status(200).json({
      photoId: saved.id,
      photoUrl: saved.photo_url,
      status: 'succeed',
    });
  } catch (err) {
    console.error('Mission photo save error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
