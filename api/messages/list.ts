import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getMessages } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

/**
 * GET /api/messages/list?channel=global&limit=50&after=<iso-timestamp>
 * Auth: Bearer token
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

    const channel = (req.query.channel as string) || 'global';
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
    const after = req.query.after as string | undefined;

    // Validate channel format
    if (channel !== 'global' && !channel.startsWith('dm:') && !channel.startsWith('system:') && !channel.startsWith('astra:')) {
      return res.status(400).json({ error: 'Invalid channel format' });
    }

    // For DM channels, verify requester is a participant
    if (channel.startsWith('dm:')) {
      const parts = channel.split(':');
      if (parts.length !== 3 || (parts[1] !== auth.playerId && parts[2] !== auth.playerId)) {
        return res.status(403).json({ error: 'Not a participant of this channel' });
      }
    }

    // For system channels, verify ownership
    if (channel.startsWith('system:')) {
      const ownerId = channel.slice('system:'.length);
      if (ownerId !== auth.playerId) {
        return res.status(403).json({ error: 'Not authorized to read this channel' });
      }
    }

    // For astra channels, verify ownership
    if (channel.startsWith('astra:')) {
      const ownerId = channel.slice('astra:'.length);
      if (ownerId !== auth.playerId) {
        return res.status(403).json({ error: 'Not authorized to read this channel' });
      }
    }

    // NOTE: `global` history used to be bounded to `created_at > player.created_at`
    // (see git history) so a brand-new account never saw chat that predates its
    // join. That makes a legitimately active cluster chat look completely dead
    // to every new player until someone posts again after they registered —
    // there's no documented anti-spoiler/anti-noise rationale for it in
    // GAME_BIBLE.md/GAME_DESIGN.md, and it only ever applied to the initial
    // history load (subsequent polls already query `created_at > after` with
    // no join-date bound). Showing the most recent `limit` messages regardless
    // of account age matches how every other MMO general-chat behaves and how
    // this endpoint already behaves on every poll after the first one.
    const messages = await getMessages(channel, limit, after || undefined);
    return res.status(200).json(messages);
  } catch (err) {
    console.error('List messages error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
