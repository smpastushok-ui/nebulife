import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updatePlayer } from '../../packages/server/src/db.js';
import { makeUnsubscribeToken } from '../../packages/server/src/email-client.js';

/**
 * GET /api/email/unsubscribe?pid=...&token=...
 * One-click unsubscribe endpoint.
 * Verifies HMAC token and disables email_notifications for the player.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pid, token } = req.query as Record<string, string>;

  if (!pid || !token) {
    return res.status(400).send('Missing parameters');
  }

  const expected = makeUnsubscribeToken(pid);
  if (token !== expected) {
    return res.status(403).send('Invalid unsubscribe token');
  }

  try {
    await updatePlayer(pid, { email_notifications: false });

    // Return a simple confirmation page
    return res.status(200).send(`<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Nebulife — Відписка</title>
  <style>
    body { margin: 0; background: #020510; font-family: monospace; display: flex;
           align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 400px; text-align: center; padding: 32px; }
    h1 { color: #aabbcc; font-size: 18px; margin-bottom: 12px; }
    p  { color: #667788; font-size: 13px; line-height: 1.6; }
    a  { color: #4488aa; font-size: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Email-сповіщення вимкнено</h1>
    <p>Ви успішно відписалися від тижневого дайджесту Nebulife.<br>
       Ви завжди можете увімкнути їх знову в налаштуваннях гравця.</p>
    <br />
    <a href="https://nebulife.space/">Повернутися до гри</a>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error('[unsubscribe] Error:', err);
    return res.status(500).send('Server error. Please try again later.');
  }
}
