import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { getPlayer, updateFcmToken } from '../../packages/server/src/db.js';
import { sendPush } from '../../packages/server/src/push-client.js';

function getPushErrorResponse(err: unknown): { status: number; error: string; message: string } {
  const detail = err instanceof Error ? err.message : String(err);
  if (
    detail.includes('THIRD_PARTY_AUTH_ERROR')
    || detail.includes('ApnsError')
    || detail.includes('APNS')
  ) {
    return {
      status: 502,
      error: 'apns_auth_error',
      message: 'iOS push is registered, but Firebase APNs authentication failed. Re-upload the APNs key in Firebase and try again in a few minutes.',
    };
  }

  if (detail.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) {
    return {
      status: 500,
      error: 'firebase_server_config_missing',
      message: 'Firebase server credentials are not configured.',
    };
  }

  return {
    status: 500,
    error: 'push_send_failed',
    message: 'Push could not be sent. Check server logs for details.',
  };
}

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
    const response = getPushErrorResponse(err);
    return res.status(response.status).json(response);
  }
}
