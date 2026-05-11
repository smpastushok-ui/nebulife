import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendTestEmail } from '../../packages/server/src/email-client.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/email/test
 * Protected by CRON_SECRET. Sends a small test email to verify Resend, DNS,
 * and Vercel env vars without waiting for the weekly digest cron.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ sent: false, reason: 'no_resend_key' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
  const lang = body.lang === 'en' ? 'en' : 'uk';

  if (!EMAIL_RE.test(to)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    await sendTestEmail(to, lang);
    return res.status(200).json({ sent: true, to, lang });
  } catch (err) {
    console.error('[email/test] Failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown' });
  }
}
