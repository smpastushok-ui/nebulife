import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { chatWithAstra, type AstraMessage } from '../../packages/server/src/gemini-client.js';
import { getMessages, saveMessage, getAstraUsage, addAstraUsage, getPlayer } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

const FREE_DAILY_TOKENS = 1000;

/**
 * POST /api/ai/chat
 * Body: { message: string }
 * Returns: { text, tokensUsed, tokensRemaining, limitReached }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!RATE_LIMITS.aiChat(auth.playerId)) {
      return res.status(429).json({ error: 'A.S.T.R.A. перевантажена. Зачекайте хвилину.' });
    }

    const { message } = req.body ?? {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Missing message' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
    }

    // Check token limit
    const usage = await getAstraUsage(auth.playerId);
    const totalBudget = FREE_DAILY_TOKENS + usage.tokens_purchased;
    const remaining = totalBudget - usage.tokens_used;

    if (remaining <= 0) {
      return res.status(200).json({
        text: 'Я розряджений, Командоре. Йду заряджатися.',
        tokensUsed: 0,
        tokensRemaining: 0,
        limitReached: true,
      });
    }

    // Load conversation history from DB
    const channel = `astra:${auth.playerId}`;
    const dbMessages = await getMessages(channel, 20);
    const history: AstraMessage[] = dbMessages.map(m => ({
      role: (m.sender_id === 'astra' ? 'model' : 'user') as 'user' | 'model',
      text: m.content,
    }));

    // Call Gemini with context
    const trimmed = message.trim();
    const result = await chatWithAstra(trimmed, history);

    // Get player callsign for saving message
    const player = await getPlayer(auth.playerId);
    const callsign = player?.callsign || 'Commander';

    // Persist both messages to DB
    await saveMessage(auth.playerId, callsign, channel, trimmed);
    await saveMessage('astra', 'A.S.T.R.A.', channel, result.text);

    // Track token usage
    if (result.totalTokens > 0) {
      await addAstraUsage(auth.playerId, result.totalTokens);
    }

    const newRemaining = Math.max(0, remaining - result.totalTokens);

    return res.status(200).json({
      text: result.text,
      tokensUsed: result.totalTokens,
      tokensRemaining: newRemaining,
      limitReached: newRemaining <= 0,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
