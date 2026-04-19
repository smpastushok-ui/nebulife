// ---------------------------------------------------------------------------
// Resend Email Client — weekly digest delivery
// ---------------------------------------------------------------------------
// Uses Resend REST API (no npm dep needed).
// Env var: RESEND_API_KEY
//           EMAIL_FROM  — e.g. "Nebulife <noreply@nebulife.space>"
//           EMAIL_UNSUBSCRIBE_SECRET — HMAC secret for one-click unsubscribe
// ---------------------------------------------------------------------------

import { createHmac } from 'node:crypto';

export interface DigestEmailPayload {
  to: string;
  playerName: string;
  playerId: string;
  lang: 'uk' | 'en';
  weekDate: string;
  imageUrls: string[];
}

// ---------------------------------------------------------------------------
// HMAC unsubscribe token
// ---------------------------------------------------------------------------

export function makeUnsubscribeToken(playerId: string): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET ?? 'default-secret';
  return createHmac('sha256', secret).update(playerId).digest('hex').slice(0, 32);
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const SUBJECTS: Record<string, string> = {
  uk: 'Nebulife Weekly — Космічний дайджест',
  en: 'Nebulife Weekly — Space Digest',
};

const HEADLINES: Record<string, string> = {
  uk: 'Космічний дайджест тижня',
  en: 'This Week in Space',
};

const INTROS: Record<string, string> = {
  uk: 'Привіт, командире! Щотижневий огляд космічних відкриттів вже тут.',
  en: 'Hello, commander! Your weekly space discoveries digest is here.',
};

const FOOTERS: Record<string, string> = {
  uk: 'Відписатися від розсилки',
  en: 'Unsubscribe from digest',
};

const CTA_TEXT: Record<string, string> = {
  uk: 'Відкрити термінал',
  en: 'Open terminal',
};

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function buildHtml(payload: DigestEmailPayload, unsubscribeUrl: string): string {
  const { lang, playerName, weekDate, imageUrls } = payload;
  const headline = HEADLINES[lang] ?? HEADLINES.en;
  const intro = INTROS[lang] ?? INTROS.en;
  const footer = FOOTERS[lang] ?? FOOTERS.en;
  const cta = CTA_TEXT[lang] ?? CTA_TEXT.en;

  const imagesHtml = imageUrls.map((url) =>
    `<img src="${url}" alt="digest" style="width:100%;max-width:600px;display:block;margin:0 auto 12px auto;border-radius:4px;" />`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#020510;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020510;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 20px 0;">
              <div style="font-size:10px;color:#44ff88;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">
                NEBULIFE WEEKLY
              </div>
              <div style="font-size:22px;color:#aabbcc;font-weight:bold;margin-bottom:4px;">
                ${headline}
              </div>
              <div style="font-size:11px;color:#556677;">${weekDate}</div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:0 0 20px 0;">
              <div style="font-size:12px;color:#8899aa;line-height:1.7;">
                ${intro.replace('командире', playerName ? `командире <span style="color:#4488aa">${playerName}</span>` : 'командире')}
              </div>
            </td>
          </tr>

          <!-- Digest images -->
          <tr>
            <td style="padding:0 0 24px 0;">
              ${imagesHtml}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 0 32px 0;">
              <a href="https://nebulife.space/?action=open-digest"
                 style="display:inline-block;padding:12px 32px;background:rgba(68,255,136,0.12);border:1px solid #44ff88;color:#44ff88;font-family:monospace;font-size:13px;text-decoration:none;border-radius:4px;letter-spacing:1px;">
                ${cta}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1a2a3a;padding:20px 0 0 0;text-align:center;">
              <div style="font-size:10px;color:#334455;margin-bottom:8px;">
                Nebulife &mdash; Explore the universe
              </div>
              <a href="${unsubscribeUrl}"
                 style="font-size:10px;color:#334455;text-decoration:underline;">
                ${footer}
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Admin alert — used by cron/moderate when Gemini moderation is unavailable
// so the admin (nebulife owner) can manually review pending reports.
// ADMIN_EMAIL env var must be set; if absent the alert is logged instead of
// silently dropped so the failure stays visible in Vercel logs.
// ---------------------------------------------------------------------------

export async function sendAdminAlert(opts: {
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[admin-alert] RESEND_API_KEY not set, alert dropped:', opts.subject);
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[admin-alert] ADMIN_EMAIL not set, alert dropped:', opts.subject);
    return;
  }

  const fromAddr = process.env.EMAIL_FROM ?? 'Nebulife <noreply@nebulife.space>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [adminEmail],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Admin alert send failed: ${res.status} ${JSON.stringify(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

export async function sendDigestEmail(payload: DigestEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const fromAddr = process.env.EMAIL_FROM ?? 'Nebulife <noreply@nebulife.space>';
  const baseUrl = process.env.APP_BASE_URL ?? 'https://nebulife.space';

  const token = makeUnsubscribeToken(payload.playerId);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?pid=${payload.playerId}&token=${token}`;

  const html = buildHtml(payload, unsubscribeUrl);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [payload.to],
      subject: SUBJECTS[payload.lang] ?? SUBJECTS.en,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend error: ${res.status} ${JSON.stringify(err)}`);
  }
}
