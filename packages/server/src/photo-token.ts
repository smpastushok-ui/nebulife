import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Photo Token — HMAC-SHA256 signed tokens issued after ad-rewarded photo generation
// ---------------------------------------------------------------------------
// Uses PHOTO_HMAC_SECRET — a dedicated key separate from CRON_SECRET.
// Never mix keys for backend task authorization with cryptographic tokens
// for the in-game economy.
// ---------------------------------------------------------------------------

function getSecret(): string {
  return process.env.PHOTO_HMAC_SECRET ?? 'nebulife-photo-token-dev-secret';
}

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a short-lived signed photo token.
 * Format: `photo:playerId:rewardType:expiresAt:signature`
 */
export function generatePhotoToken(playerId: string, rewardType: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `photo:${playerId}:${rewardType}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Verify a photo token.
 * Returns true if the token is valid, not expired, and matches the expected player + rewardType.
 */
export function verifyPhotoToken(
  token: string,
  playerId: string,
  expectedType: string,
): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split(':');
  // format: photo : playerId : rewardType : expiresAt : signature
  // Note: playerId may contain ':' in theory — use last part as sig, 2nd-to-last as expiresAt
  if (parts.length < 5) return false;

  const signature = parts[parts.length - 1];
  const expiresAt = parseInt(parts[parts.length - 2], 10);
  const rewardType = parts[parts.length - 3];
  const pid = parts[parts.length - 4];
  const prefix = parts[parts.length - 5];

  if (prefix !== 'photo') return false;
  if (pid !== playerId) return false;
  if (rewardType !== expectedType) return false;
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const payload = `photo:${pid}:${rewardType}:${expiresAt}`;
  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(signature, 'hex')),
      new Uint8Array(Buffer.from(expectedSig, 'hex')),
    );
  } catch {
    return false;
  }
}
