import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { updatePlayerAuth } from '../../packages/server/src/db.js';
import { sendWelcomeEmail } from '../../packages/server/src/email-client.js';

function maybeSendWelcomeEmail(player: {
  id: string;
  name: string;
  email: string | null;
  preferred_language?: string;
  email_notifications?: boolean;
} | null): void {
  if (!player?.email || player.email_notifications === false || !process.env.RESEND_API_KEY) return;
  const lang = player.preferred_language === 'en' ? 'en' : 'uk';
  sendWelcomeEmail({
    to: player.email,
    playerName: player.name,
    playerId: player.id,
    lang,
  }).catch((err) => {
    console.warn('[link-account] Welcome email failed:', err);
  });
}

/**
 * POST /api/auth/link-account
 *
 * Called after the client successfully links a guest account to Google or Email
 * via Firebase's linkWithPopup/linkWithCredential.
 *
 * Auth: Bearer <firebase-id-token>
 * Body: { provider: 'google' | 'email' }
 *
 * Updates auth_provider, email, and linked_at in the DB.
 * Returns: PlayerRow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const normalizedProvider = auth.provider === 'google.com' ? 'google'
      : auth.provider === 'password' ? 'email'
      : auth.provider;

    const updated = await updatePlayerAuth(
      auth.playerId,
      normalizedProvider,
      auth.email,
    );

    if (!updated) {
      return res.status(404).json({ error: 'Player not found' });
    }

    maybeSendWelcomeEmail(updated);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Link account error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
