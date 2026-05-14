import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSupportRequest } from '../../packages/server/src/email-client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT = 120;
const MAX_MESSAGE = 5000;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const website = readString(body.website);
  if (website) {
    return res.status(200).json({ sent: true });
  }

  const email = readString(body.email).toLowerCase();
  const name = readString(body.name).slice(0, 80);
  const subject = readString(body.subject).slice(0, MAX_SUBJECT);
  const message = readString(body.message).slice(0, MAX_MESSAGE);
  const lang = readString(body.lang).slice(0, 8);

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (subject.length < 3 || message.length < 10) {
    return res.status(400).json({ error: 'Subject or message is too short' });
  }

  try {
    await sendSupportRequest({
      fromEmail: email,
      name,
      subject,
      message,
      meta: {
        language: lang,
        userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
        ip: String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim(),
      },
    });
    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[support/contact] Failed:', err);
    return res.status(500).json({ error: 'Could not send support request' });
  }
}
