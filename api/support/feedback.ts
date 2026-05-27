import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from '../../packages/server/src/auth-middleware.js';
import { sendSupportRequest } from '../../packages/server/src/email-client.js';

const MAX_MESSAGE = 4000;
const MAX_FIELD = 240;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const message = readString(body.message).slice(0, MAX_MESSAGE);
    const context = readString(body.context).slice(0, MAX_FIELD);
    const language = readString(body.language).slice(0, 8);
    const deviceModel = readString(body.deviceModel).slice(0, MAX_FIELD);
    const platform = readString(body.platform).slice(0, MAX_FIELD);
    const osVersion = readString(body.osVersion).slice(0, MAX_FIELD);
    const appVersion = readString(body.appVersion).slice(0, MAX_FIELD);

    if (message.length < 5) {
      return res.status(400).json({ error: 'Message is too short' });
    }

    await sendSupportRequest({
      fromEmail: auth.email ?? 'no-reply@nebulife.space',
      name: `Player ${auth.playerId}`,
      subject: `In-app feedback${context ? `: ${context}` : ''}`,
      message,
      meta: {
        playerId: auth.playerId,
        firebaseUid: auth.uid,
        language,
        deviceModel,
        platform,
        osVersion,
        appVersion,
        userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
        ip: String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim(),
      },
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[support/feedback] Failed:', err);
    return res.status(500).json({ error: 'Could not send feedback' });
  }
}
