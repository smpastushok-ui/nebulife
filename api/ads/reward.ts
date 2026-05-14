import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { addAdReward, creditQuarks, creditResearchData } from '../../packages/server/src/db.js';
import { RATE_LIMITS } from '../../packages/server/src/rate-limiter.js';
import { generatePhotoToken } from '../../packages/server/src/photo-token.js';

const REWARD_CONFIG: Record<string, { requiredAds: number }> = {
  quarks: { requiredAds: 3 },
  research_data: { requiredAds: 2 },
  discovery_photo: { requiredAds: 3 },
  planet_photo: { requiredAds: 3 },
  panorama_photo: { requiredAds: 5 },
};

interface AdTokenPayload {
  sessionId: string;
  playerId: string;
  expiresAt: number;
}

function parseLegacyAdToken(token: string): AdTokenPayload | null {
  const parts = token.split(':');
  if (parts.length !== 4) return null;
  const [sessionId, playerId, expiresAtStr] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (!sessionId || !playerId || !Number.isFinite(expiresAt)) return null;
  return { sessionId, playerId, expiresAt };
}

function parseAdToken(token: string): AdTokenPayload | null {
  const secret = process.env.CRON_SECRET || 'nebulife-ad-secret';
  const [payload, sig] = token.split('.');
  if (!payload || !sig || token.split('.').length !== 2) {
    return parseLegacyAdToken(token);
  }

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expBuf))) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<AdTokenPayload>;
    if (
      typeof decoded.sessionId !== 'string' ||
      typeof decoded.playerId !== 'string' ||
      typeof decoded.expiresAt !== 'number' ||
      !Number.isFinite(decoded.expiresAt)
    ) {
      return null;
    }
    return decoded as AdTokenPayload;
  } catch {
    return null;
  }
}

function verifyLegacyAdToken(token: string): boolean {
  const secret = process.env.CRON_SECRET || 'nebulife-ad-secret';
  const parts = token.split(':');
  if (parts.length !== 4) return false;

  const [sessionId, pid, expiresAtStr, sig] = parts;
  const payload = `${sessionId}:${pid}:${expiresAtStr}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expBuf));
}

function verifyAdToken(token: string, playerId: string): AdTokenPayload | null {
  const parsed = parseAdToken(token);
  if (!parsed) return null;
  if (parsed.playerId !== playerId) return null;
  if (Date.now() > parsed.expiresAt) return null;

  // Short compatibility window for old tokens already saved in localStorage.
  if (token.includes(':') && !verifyLegacyAdToken(token)) return null;

  return parsed;
}

/**
 * POST /api/ads/reward
 * Body: { rewardType, adSessionTokens: string[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!await RATE_LIMITS.adReward(auth.playerId)) {
      return res.status(429).json({ error: 'Too many ad reward claims. Please wait.' });
    }

    const { rewardType, adSessionTokens } = req.body ?? {};

    if (!rewardType || !REWARD_CONFIG[rewardType]) {
      return res.status(400).json({ error: 'Invalid reward type' });
    }

    const config = REWARD_CONFIG[rewardType];

    // Validate ad session tokens
    if (!Array.isArray(adSessionTokens) || adSessionTokens.length < config.requiredAds) {
      console.warn('[ads/reward] insufficient tokens', {
        playerId: auth.playerId,
        rewardType,
        received: Array.isArray(adSessionTokens) ? adSessionTokens.length : 0,
        required: config.requiredAds,
      });
      return res.status(400).json({ error: `Requires ${config.requiredAds} valid ad session tokens` });
    }

    const sessionIds = new Set<string>();
    for (const token of adSessionTokens.slice(0, config.requiredAds)) {
      const parsedToken = typeof token === 'string' ? verifyAdToken(token, auth.playerId) : null;
      if (!parsedToken) {
        console.warn('[ads/reward] invalid token', { playerId: auth.playerId, rewardType });
        return res.status(400).json({ error: 'Invalid or expired ad session token' });
      }
      if (sessionIds.has(parsedToken.sessionId)) {
        console.warn('[ads/reward] duplicate token', { playerId: auth.playerId, rewardType });
        return res.status(400).json({ error: 'Duplicate ad session token' });
      }
      sessionIds.add(parsedToken.sessionId);
    }

    // Atomic daily limit check + increment
    const allowed = await addAdReward(auth.playerId, config.requiredAds);
    if (!allowed) {
      console.warn('[ads/reward] daily limit reached', { playerId: auth.playerId, rewardType });
      return res.status(429).json({ error: 'Daily ad limit reached' });
    }

    // Grant reward
    let amount = 0;

    if (rewardType === 'quarks') {
      await creditQuarks(auth.playerId, 5);
      amount = 5;
    } else if (rewardType === 'research_data') {
      // Persist the +10 RD in the game_state JSONB. Previously this branch
      // only set `amount = 10` and never wrote anything → player got nothing
      // despite the ad rewarding 10 RD.
      amount = 10;
      await creditResearchData(auth.playerId, amount);
    } else if (['discovery_photo', 'planet_photo', 'panorama_photo'].includes(rewardType)) {
      amount = 1;
      const photoToken = generatePhotoToken(auth.playerId, rewardType);
      return res.status(200).json({ rewarded: true, amount, photoToken });
    }

    return res.status(200).json({ rewarded: true, amount });
  } catch (err) {
    console.error('Ad reward error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
