import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { chatWithAstra, type AstraMessage } from '../../packages/server/src/gemini-client.js';
import { getMessages, saveMessage, getAstraUsage, addAstraUsage, getPlayer } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';

// Increase Vercel serverless timeout (Gemini can take 10-25s to respond)
export const config = {
  maxDuration: 30,
};

const FREE_DAILY_TOKENS = 1000;
const PRO_DAILY_MSG_LIMIT = 50;

/**
 * POST /api/ai/chat
 * Body: { message: string, isPremium?: boolean }
 * Returns: { text, tokensUsed, tokensRemaining, limitReached, isPro?, proMsgsUsed?, proMsgsLimit? }
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

    const { message, isPremium } = req.body ?? {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Missing message' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 chars)' });
    }

    // ── Pro path: unlimited tokens, but 50 messages/day cap ──────────────────
    if (isPremium === true) {
      // Daily message count is tracked client-side via localStorage.
      // Server trusts the client flag for now (RevenueCat receipt verification
      // happens at purchase time; localStorage is the cached signal).
      // We simply skip token deduction and pass pro metadata back.

      // Load conversation history from DB
      const channel = `astra:${auth.playerId}`;
      const dbMessages = await getMessages(channel, 20);

      const rawHistory: AstraMessage[] = dbMessages.map(m => ({
        role: (m.sender_id === 'astra' ? 'model' : 'user') as 'user' | 'model',
        text: m.content,
      }));
      const history: AstraMessage[] = [];
      for (const msg of rawHistory) {
        if (history.length > 0 && history[history.length - 1].role === msg.role) {
          history[history.length - 1] = msg;
        } else {
          history.push(msg);
        }
      }
      if (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop();
      }

      const player = await getPlayer(auth.playerId);
      const callsign = player?.callsign || 'Commander';
      const lang = player?.preferred_language || 'uk';

      const trimmed = message.trim();
      await saveMessage(auth.playerId, callsign, channel, trimmed);

      const result = await chatWithAstra(trimmed, history, lang);

      try {
        await saveMessage('astra', 'A.S.T.R.A.', channel, result.text);
      } catch (saveErr) {
        console.error('[AI chat] Failed to save A.S.T.R.A. response:', saveErr);
      }

      // No token deduction for Pro subscribers
      return res.status(200).json({
        text: result.text,
        tokensUsed: 0,
        tokensRemaining: -1, // sentinel: Pro (unlimited)
        limitReached: false,
        isPro: true,
        proMsgsLimit: PRO_DAILY_MSG_LIMIT,
      });
    }

    // ── Free path: token-based limit ─────────────────────────────────────────
    const usage = await getAstraUsage(auth.playerId);
    const totalBudget = FREE_DAILY_TOKENS + usage.tokens_purchased;
    const remaining = totalBudget - usage.tokens_used;

    if (remaining <= 0) {
      return res.status(200).json({
        text: 'Power depleted, Commander. Recharging.',
        tokensUsed: 0,
        tokensRemaining: 0,
        limitReached: true,
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

    // Get player callsign and language preference
    const player = await getPlayer(auth.playerId);
    const callsign = player?.callsign || 'Commander';
    const lang = player?.language || 'uk';

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

    // Track token usage
    if (result.totalTokens > 0) {
      try {
        await addAstraUsage(auth.playerId, result.totalTokens);
      } catch (usageErr) {
        console.error('[AI chat] Failed to track token usage:', usageErr);
      }
    }

    const newRemaining = Math.max(0, remaining - result.totalTokens);

    return res.status(200).json({
      text: result.text,
      tokensUsed: result.totalTokens,
      tokensRemaining: newRemaining,
      limitReached: newRemaining <= 0,
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
