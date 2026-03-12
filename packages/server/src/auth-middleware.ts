import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken } from './firebase-admin.js';
import { getPlayerByFirebaseUid } from './db.js';

// ---------------------------------------------------------------------------
// Auth middleware for Vercel serverless endpoints
// ---------------------------------------------------------------------------

export interface AuthResult {
  uid: string;
  playerId: string;
  email?: string;
  provider: string;
}

/**
 * Extract and verify Firebase ID token from Authorization header.
 * Returns auth data if valid, or sends error response and returns null.
 *
 * Usage:
 *   const auth = await authenticate(req, res);
 *   if (!auth) return; // Response already sent (401/404)
 */
export async function authenticate(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthResult | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = await verifyFirebaseToken(token);

    const player = await getPlayerByFirebaseUid(decoded.uid);
    if (!player) {
      res.status(404).json({ error: 'Player not found for this account' });
      return null;
    }

    return {
      uid: decoded.uid,
      playerId: player.id,
      email: decoded.email,
      provider: decoded.provider,
    };
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

/**
 * Lighter version: verify token only, without player lookup.
 * Useful for register endpoint where player may not exist yet.
 */
export async function authenticateToken(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ uid: string; email?: string; provider: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }

  try {
    const token = authHeader.slice(7);
    return await verifyFirebaseToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}
