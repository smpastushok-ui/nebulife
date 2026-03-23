import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { saveReport, getMessages } from '../../packages/server/src/db.js';

/**
 * POST /api/messages/report
 * Body: { messageId: string, reportedId: string, content: string, channel: string }
 * Saves report to queue for Gemini moderation (async via cron).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { messageId, reportedId, content, channel } = req.body ?? {};

    if (!reportedId || typeof reportedId !== 'string') {
      return res.status(400).json({ error: 'Missing reportedId' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing content' });
    }
    if (!channel || typeof channel !== 'string') {
      return res.status(400).json({ error: 'Missing channel' });
    }

    // Prevent self-report
    if (auth.playerId === reportedId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    // Fetch last 10 messages for context
    const contextMsgs = await getMessages(channel, 10);
    const contextJson = JSON.stringify(
      contextMsgs.map(m => ({ senderName: m.sender_name, content: m.content }))
    );

    await saveReport(
      auth.playerId,
      reportedId,
      messageId ?? null,
      content,
      channel,
      contextJson,
    );

    return res.status(200).json({ message: 'Скаргу прийнято. Gemini розгляне протягом хвилини.' });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
