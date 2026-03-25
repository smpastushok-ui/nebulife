import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { saveMessage } from '../../packages/server/src/db.js';

/**
 * POST /api/academy/share-notify
 * Body: { fromPlayerName: string, lessonTitle: string }
 *
 * Called when the current player opens a shared lesson link.
 * Posts a system message to their ASTRA chat:
 * "Гравець X поділився з вами уроком 'Y'."
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await authenticate(req, res);
  if (!auth) return;

  const { fromPlayerName, lessonTitle } = req.body ?? {};
  if (!fromPlayerName || typeof fromPlayerName !== 'string') {
    return res.status(400).json({ error: 'fromPlayerName required' });
  }
  if (!lessonTitle || typeof lessonTitle !== 'string') {
    return res.status(400).json({ error: 'lessonTitle required' });
  }

  await saveMessage(
    'system',
    'A.S.T.R.A.',
    `system:${auth.playerId}`,
    `Гравець ${fromPlayerName} поділився з вами уроком "${lessonTitle}".`,
  );

  return res.status(200).json({ ok: true });
}
