import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer, updateFcmToken } from '../../packages/server/src/db.js';
import { sendPush } from '../../packages/server/src/push-client.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticate(req, res);
  if (!auth) return;

  try {
    const player = await getPlayer(auth.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (!player.fcm_token) {
      return res.status(400).json({ error: 'missing_fcm_token' });
    }

    const lang = player.preferred_language === 'en' ? 'en' : 'uk';
    const ok = await sendPush({
      fcmToken: player.fcm_token,
      title: lang === 'en' ? 'Nebulife test push' : 'Тестовий push Nebulife',
      body: lang === 'en'
        ? 'If you see this on iPhone, push notifications are working.'
        : 'Якщо це видно на iPhone, push-сповіщення працюють.',
      data: {
        action: 'open-game',
        source: 'test-push',
      },
      link: '/?action=open-game',
      tag: `test-push-${auth.playerId}`,
    });

    if (!ok) {
      await updateFcmToken(auth.playerId, null);
      return res.status(410).json({ error: 'invalid_fcm_token' });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[player/test-push] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
