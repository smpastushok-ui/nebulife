import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { updatePlayerAvatar } from '../../packages/server/src/db.js';

export const config = {
  maxDuration: 30,
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function parseImageDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; ext: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length <= 0 || buffer.length > MAX_AVATAR_BYTES) return null;
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  return { buffer, mimeType, ext };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authenticate(req, res);
  if (!auth) return;

  if (req.method === 'POST') {
    try {
      const { imageDataUrl } = req.body as { imageDataUrl?: string };
      if (!imageDataUrl) {
        return res.status(400).json({ error: 'Missing imageDataUrl' });
      }

      const parsed = parseImageDataUrl(imageDataUrl);
      if (!parsed) {
        return res.status(400).json({ error: 'Avatar must be png, jpeg, or webp and no larger than 2 MB' });
      }

      const blob = await put(
        `avatars/${auth.playerId}/${Date.now()}.${parsed.ext}`,
        parsed.buffer,
        {
          access: 'public',
          contentType: parsed.mimeType,
        },
      );
      const player = await updatePlayerAvatar(auth.playerId, blob.url);
      return res.status(200).json({ avatarUrl: player?.avatar_url ?? blob.url });
    } catch (err) {
      console.error('[player/avatar] upload failed:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const player = await updatePlayerAvatar(auth.playerId, null);
      return res.status(200).json({ avatarUrl: player?.avatar_url ?? null });
    } catch (err) {
      console.error('[player/avatar] remove failed:', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
