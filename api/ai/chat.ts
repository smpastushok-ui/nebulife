import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { chatWithAstra, type AstraMessage } from '../../packages/server/src/gemini-client.js';
import { countMessagesSince, getMessages, getPlayer, getPremiumStatus, saveMessage } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

// Increase Vercel serverless timeout (Gemini can take 10-25s to respond)
export const config = {
  maxDuration: 30,
};

const ASTRA_HOURLY_MSG_LIMIT = 10;

/**
 * POST /api/ai/chat
 * Body: { message: string }
 * Returns: { text, tokensUsed, tokensRemaining, limitReached, isPro?, hourlyMessagesUsed?, hourlyMessagesLimit? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.aiChat(auth.playerId)) {
      return res.status(429).json({ error: 'A.S.T.R.A. overloaded. Wait a minute.' });
    }

    const { message } = req.body ?? {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Missing message' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
    }

    const premium = await getPremiumStatus(auth.playerId);
    if (!premium.active) {
      return res.status(403).json({ error: 'premium_required' });
    }

    const hourStart = new Date();
    hourStart.setMinutes(0, 0, 0);
    const usedThisHour = await countMessagesSince(`astra:${auth.playerId}`, hourStart.toISOString(), auth.playerId);
    if (usedThisHour >= ASTRA_HOURLY_MSG_LIMIT) {
      const player = await getPlayer(auth.playerId);
      const limitText = player?.preferred_language === 'en'
        ? 'A.S.T.R.A. power cell is cooling down. Return in the next hour, Commander.'
        : 'A.S.T.R.A. розряджена й переходить на зарядку. Поверніться в наступну годину, Командоре.';
      return res.status(200).json({
        text: limitText,
        tokensUsed: 0,
        tokensRemaining: -1,
        limitReached: true,
        isPro: true,
        hourlyMessagesUsed: usedThisHour,
        hourlyMessagesLimit: ASTRA_HOURLY_MSG_LIMIT,
      });
    }

    // Load conversation history from DB
    const channel = `astra:${auth.playerId}`;
    const dbMessages = await getMessages(channel, 20);

    // Build history — filter out consecutive same-role messages
    // (can happen if previous request saved user msg but Gemini response save failed)
    const rawHistory: AstraMessage[] = dbMessages.map(m => ({
      role: (m.sender_id === 'astra' ? 'model' : 'user') as 'user' | 'model',
      text: m.content,
    }));
    const history: AstraMessage[] = [];
    for (const msg of rawHistory) {
      if (history.length > 0 && history[history.length - 1].role === msg.role) {
        // Skip consecutive same-role — keep only the latest
        history[history.length - 1] = msg;
      } else {
        history.push(msg);
      }
    }
    // Ensure history ends with 'model' if it ends with 'user' (avoid double user messages with the new one)
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      history.pop();
    }

    // Get player callsign and language preference.
    // NOTE: column is `preferred_language`; previously this read `language`
    // (dead legacy column from 012-language.sql that the Player type no
    // longer exposes → always undefined → 'uk' fallback). Free-tier
    // ASTRA replies were stuck in Ukrainian regardless of EN UI choice.
    const player = await getPlayer(auth.playerId);
    const callsign = player?.callsign || 'Commander';
    const lang = player?.preferred_language || 'uk';

    // Save USER message FIRST (so it appears in chat even if Gemini times out)
    const trimmed = message.trim();
    await saveMessage(auth.playerId, callsign, channel, trimmed);

    // Call Gemini with context + player language (this can take 5-25s; never throws)
    const result = await chatWithAstra(trimmed, history, lang);

    // Save A.S.T.R.A. response (even if it's a fallback error text)
    try {
      await saveMessage('astra', 'A.S.T.R.A.', channel, result.text);
    } catch (saveErr) {
      console.error('[AI chat] Failed to save A.S.T.R.A. response:', saveErr);
      // Still return the response to the client even if DB save fails
    }

    return res.status(200).json({
      text: result.text,
      tokensUsed: result.totalTokens,
      tokensRemaining: -1,
      limitReached: false,
      isPro: true,
      hourlyMessagesUsed: usedThisHour + 1,
      hourlyMessagesLimit: ASTRA_HOURLY_MSG_LIMIT,
    });
  } catch (err) {
    console.error('[AI chat] Unhandled error:', err);
    // Return the Astra fallback as 200 instead of cryptic 500
    return res.status(200).json({
      text: 'A.S.T.R.A. offline. Try again later, Commander.',
      tokensUsed: 0,
      tokensRemaining: 0,
      limitReached: false,
    });
  }
}
