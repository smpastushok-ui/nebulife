import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getMessageReadStates } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

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

/**
 * GET /api/messages/read-state?channels=global,astra:...
 * Returns cross-device read timestamps for the authenticated player.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.poll(auth.playerId)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    const rawChannels = typeof req.query.channels === 'string' ? req.query.channels : '';
    const channels = rawChannels
      ? rawChannels.split(',').map((entry) => entry.trim()).filter(Boolean)
      : undefined;

    if (channels?.some((channel) => !isAllowedChannel(channel, auth.playerId))) {
      return res.status(403).json({ error: 'Not authorized to read this channel state' });
    }

    const rows = await getMessageReadStates(auth.playerId, channels);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Get read state error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
