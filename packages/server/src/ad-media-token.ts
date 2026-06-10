import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Ad-funded media tokens.
//
// /api/ads/reward mints one of these AFTER verifying the player's rewarded-ad
// session tokens (Tier-1 geo enforced there). The generation endpoint then
// accepts the token instead of charging quarks. HMAC-signed — the client
// cannot forge it.
// ---------------------------------------------------------------------------

const TOKEN_TTL_MS = 10 * 60 * 1000;

export type AdMediaPurpose = 'lifeform_photo';

interface AdMediaTokenPayload {
  playerId: string;
  purpose: AdMediaPurpose;
  nonce: string;
  expiresAt: number;
}

function getSecret(): string {
  return process.env.CRON_SECRET || 'nebulife-ad-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/** Mint a signed, short-lived token authorising one ad-funded generation. */
export function mintAdMediaToken(playerId: string, purpose: AdMediaPurpose): string {
  const payload: AdMediaTokenPayload = {
    playerId,
    purpose,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verify a token: signature, owner, purpose, expiry.
 * Returns the unique nonce (use it as an idempotency key to make the token
 * single-use), or null when invalid.
 */
export function verifyAdMediaToken(
  token: string,
  playerId: string,
  purpose: AdMediaPurpose,
): { nonce: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;

  const expected = sign(encoded);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expBuf))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<AdMediaTokenPayload>;
    if (payload.playerId !== playerId) return null;
    if (payload.purpose !== purpose) return null;
    if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) return null;
    if (typeof payload.nonce !== 'string' || !payload.nonce) return null;
    return { nonce: payload.nonce };
  } catch {
    return null;
  }
}
