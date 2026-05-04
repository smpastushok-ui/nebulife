import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt, { type JwtHeader, type JwtPayload } from 'jsonwebtoken';
import { createPublicKey } from 'node:crypto';
import { createFirebaseCustomToken } from '../../../packages/server/src/firebase-admin.js';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_NATIVE_BUNDLE_ID = process.env.APPLE_NATIVE_BUNDLE_ID ?? 'app.nebulife.game';

type AppleJwk = JsonWebKey & {
  kid: string;
  alg: string;
};

let cachedAppleKeys: AppleJwk[] | null = null;
let cachedAppleKeysAt = 0;

async function getAppleKeys(): Promise<AppleJwk[]> {
  const now = Date.now();
  if (cachedAppleKeys && now - cachedAppleKeysAt < 60 * 60 * 1000) {
    return cachedAppleKeys;
  }

  const res = await fetch('https://appleid.apple.com/auth/keys');
  if (!res.ok) {
    throw new Error(`Failed to fetch Apple keys: ${res.status}`);
  }
  const data = await res.json() as { keys?: AppleJwk[] };
  cachedAppleKeys = data.keys ?? [];
  cachedAppleKeysAt = now;
  return cachedAppleKeys;
}

function jwkToPem(jwk: AppleJwk): string {
  return createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' }).toString();
}

async function verifyAppleIdentityToken(identityToken: string): Promise<JwtPayload> {
  const decoded = jwt.decode(identityToken, { complete: true }) as { header?: JwtHeader } | null;
  const kid = decoded?.header?.kid;
  if (!kid) throw new Error('Apple identity token is missing kid');

  const keys = await getAppleKeys();
  const key = keys.find((candidate) => candidate.kid === kid);
  if (!key) throw new Error('Apple public key not found');

  return jwt.verify(identityToken, jwkToPem(key), {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
    audience: APPLE_NATIVE_BUNDLE_ID,
  }) as JwtPayload;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identityToken } = req.body ?? {};
    if (typeof identityToken !== 'string' || identityToken.length < 100) {
      return res.status(400).json({ error: 'Missing Apple identity token' });
    }

    const apple = await verifyAppleIdentityToken(identityToken);
    if (typeof apple.sub !== 'string' || !apple.sub) {
      return res.status(400).json({ error: 'Apple token missing subject' });
    }

    const uid = `apple:${apple.sub}`;
    const email = typeof apple.email === 'string' ? apple.email : null;
    const customToken = await createFirebaseCustomToken(uid, {
      provider: 'apple.com',
      apple_sub: apple.sub,
      apple_email: email,
    });

    return res.status(200).json({ customToken });
  } catch (err) {
    console.error('[apple/native] token exchange failed:', err);
    return res.status(401).json({
      error: err instanceof Error ? err.message : 'Apple token exchange failed',
    });
  }
}
