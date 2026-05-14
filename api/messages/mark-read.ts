import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { markMessageChannelRead } from '../../packages/server/src/db.js';

function isAllowedChannel(channel: string, playerId: string): boolean {
  if (channel === 'global') return true;
  if (channel === `system:${playerId}`) return true;
  if (channel === `astra:${playerId}`) return true;
  if (channel.startsWith('dm:')) {
    const parts = channel.split(':');
    return parts.length === 3 && (parts[1] === playerId || parts[2] === playerId);
  }
  return false;
}

function parseLastReadAt(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

/**
 * POST /api/messages/mark-read
 * Body: { channel: string, lastReadAt: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { channel, lastReadAt } = req.body ?? {};
    if (typeof channel !== 'string' || !isAllowedChannel(channel, auth.playerId)) {
      return res.status(403).json({ error: 'Not authorized to mark this channel read' });
    }

    const parsedLastReadAt = parseLastReadAt(lastReadAt);
    if (!parsedLastReadAt) {
      return res.status(400).json({ error: 'Invalid lastReadAt' });
    }

    const readState = await markMessageChannelRead(auth.playerId, channel, parsedLastReadAt);
    return res.status(200).json(readState);
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
