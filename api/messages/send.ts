import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { saveMessage, getPlayer } from '../../packages/server/src/db.js';

/**
 * POST /api/messages/send
 * Body: { channel: string, content: string }
 * Auth: Bearer token
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { channel, content } = req.body ?? {};

    if (!channel || typeof channel !== 'string') {
      return res.status(400).json({ error: 'Missing channel' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Missing content' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 chars)' });
    }

    // Validate channel format
    if (channel !== 'global' && !channel.startsWith('dm:')) {
      return res.status(400).json({ error: 'Invalid channel format' });
    }

    // For DM channels, verify sender is a participant
    if (channel.startsWith('dm:')) {
      const parts = channel.split(':');
      if (parts.length !== 3 || (parts[1] !== auth.playerId && parts[2] !== auth.playerId)) {
        return res.status(403).json({ error: 'Not a participant of this channel' });
      }
    }

    // Get sender name
    const player = await getPlayer(auth.playerId);
    const senderName = player?.callsign || player?.name || 'Explorer';

    const message = await saveMessage(auth.playerId, senderName, channel, content.trim());
    return res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
