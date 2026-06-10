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
  playerName: string | null | undefined;
  playerId: string;
  lang: 'uk' | 'en';
  weekDate: string | Date | null | undefined;
  imageUrls: string[];
}

export interface ServiceEmailPayload {
  to: string;
  playerName?: string | null;
  playerId: string;
  lang?: 'uk' | 'en';
}

interface ResendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
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

const TEST_SUBJECTS: Record<string, string> = {
  uk: 'Nebulife — тест пошти',
  en: 'Nebulife — email test',
};

const WELCOME_SUBJECTS: Record<string, string> = {
  uk: 'Nebulife — доступ до зоряного терміналу активовано',
  en: 'Nebulife — your star terminal is active',
};

const WEB_ACCESS_SUBJECTS: Record<string, string> = {
  uk: 'Nebulife — веб-версія доступна для Premium',
  en: 'Nebulife — web access is available for Premium',
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function stringifyEmailValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value);
}

function escapeHtml(value: unknown): string {
  return stringifyEmailValue(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendResendEmail(payload: ResendEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const fromAddr = process.env.EMAIL_FROM ?? 'Nebulife <noreply@nebulife.space>';
  const to = Array.isArray(payload.to) ? payload.to : [payload.to];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddr,
      to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.headers ? { headers: payload.headers } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend error: ${res.status} ${JSON.stringify(err)}`);
  }
}

// ---------------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------------

function buildHtml(payload: DigestEmailPayload, unsubscribeUrl: string): string {
  const { lang, playerName, weekDate, imageUrls } = payload;
  const headline = HEADLINES[lang] ?? HEADLINES.en;
  const intro = INTROS[lang] ?? INTROS.en;
  const footer = FOOTERS[lang] ?? FOOTERS.en;
  const cta = CTA_TEXT[lang] ?? CTA_TEXT.en;
  const safePlayerName = escapeHtml(playerName);
  const safeWeekDate = escapeHtml(weekDate);

  const imagesHtml = imageUrls.map((url) =>
    `<img src="${escapeHtml(url)}" alt="digest" style="width:100%;max-width:600px;display:block;margin:0 auto 12px auto;border-radius:4px;" />`,
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
              <div style="font-size:11px;color:#556677;">${safeWeekDate}</div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:0 0 20px 0;">
              <div style="font-size:12px;color:#8899aa;line-height:1.7;">
                ${intro.replace('командире', safePlayerName ? `командире <span style="color:#4488aa">${safePlayerName}</span>` : 'командире')}
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

function buildTestHtml(lang: 'uk' | 'en'): string {
  const title = lang === 'uk' ? 'Тест пошти Nebulife' : 'Nebulife email test';
  const body = lang === 'uk'
    ? 'Якщо ти бачиш цей лист, Resend, DNS домену та Vercel env vars налаштовані правильно.'
    : 'If you see this email, Resend, domain DNS, and Vercel env vars are configured correctly.';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#020510;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020510;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #1a2a3a;border-radius:6px;padding:24px;">
          <tr><td style="font-size:10px;color:#44ff88;letter-spacing:3px;text-transform:uppercase;padding-bottom:8px;">NEBULIFE MAIL</td></tr>
          <tr><td style="font-size:20px;color:#aabbcc;font-weight:bold;padding-bottom:14px;">${title}</td></tr>
          <tr><td style="font-size:12px;color:#8899aa;line-height:1.7;">${body}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeHtml(payload: ServiceEmailPayload): string {
  const lang = payload.lang ?? 'uk';
  const playerName = payload.playerName ? escapeHtml(payload.playerName) : '';
  const title = lang === 'uk'
    ? 'Зоряний термінал активовано'
    : 'Star terminal activated';
  const greeting = lang === 'uk'
    ? `Привіт${playerName ? `, <span style="color:#7bb8ff">${playerName}</span>` : ''}.`
    : `Hello${playerName ? `, <span style="color:#7bb8ff">${playerName}</span>` : ''}.`;
  const body = lang === 'uk'
    ? 'Твій акаунт Nebulife готовий. Щотижневі дайджести та важливі службові повідомлення надходитимуть сюди, поки email-сповіщення увімкнені.'
    : 'Your Nebulife account is ready. Weekly digests and important service updates will arrive here while email notifications are enabled.';
  const cta = lang === 'uk' ? 'Відкрити Nebulife' : 'Open Nebulife';
  const baseUrl = process.env.APP_BASE_URL ?? 'https://nebulife.space';
  const token = makeUnsubscribeToken(payload.playerId);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?pid=${payload.playerId}&token=${token}`;
  const footer = lang === 'uk' ? 'Відписатися від email-сповіщень' : 'Unsubscribe from email notifications';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#020510;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020510;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #1a2a3a;border-radius:6px;padding:24px;">
          <tr><td style="font-size:10px;color:#44ff88;letter-spacing:3px;text-transform:uppercase;padding-bottom:8px;">NEBULIFE</td></tr>
          <tr><td style="font-size:20px;color:#aabbcc;font-weight:bold;padding-bottom:14px;">${title}</td></tr>
          <tr><td style="font-size:12px;color:#8899aa;line-height:1.7;padding-bottom:8px;">${greeting}</td></tr>
          <tr><td style="font-size:12px;color:#8899aa;line-height:1.7;padding-bottom:24px;">${body}</td></tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${baseUrl}"
                 style="display:inline-block;padding:12px 28px;background:rgba(68,136,170,0.16);border:1px solid #4488aa;color:#7bb8ff;font-family:monospace;font-size:13px;text-decoration:none;border-radius:4px;letter-spacing:1px;">
                ${cta}
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #1a2a3a;padding-top:18px;text-align:center;">
              <a href="${unsubscribeUrl}" style="font-size:10px;color:#334455;text-decoration:underline;">${footer}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWebAccessHtml(payload: ServiceEmailPayload): string {
  const lang = payload.lang ?? 'uk';
  const playerName = payload.playerName ? escapeHtml(payload.playerName) : '';
  // Canonical web-play entry point — kept on the www host independent of
  // APP_BASE_URL (which may point to the apex domain for unsubscribe links).
  const playUrl = process.env.WEB_PLAY_URL ?? 'https://www.nebulife.space/play';
  const title = lang === 'uk'
    ? 'Веб-версія Nebulife доступна'
    : 'Nebulife web version is available';
  const greeting = lang === 'uk'
    ? `Привіт${playerName ? `, <span style="color:#7bb8ff">${playerName}</span>` : ''}.`
    : `Hello${playerName ? `, <span style="color:#7bb8ff">${playerName}</span>` : ''}.`;
  const body = lang === 'uk'
    ? 'Ваш Premium вже відкриває доступ до веб-версії Nebulife. Перейдіть за посиланням і увійдіть з цією ж поштою.'
    : 'Your Premium now unlocks the Nebulife web version. Open the link and log in with the same email address.';
  const cta = lang === 'uk' ? 'Почати у веб-версії' : 'Start on web';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#020510;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020510;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border:1px solid #334455;border-radius:6px;padding:24px;background:rgba(10,15,25,0.94);">
          <tr><td style="font-size:10px;color:#44ff88;letter-spacing:3px;text-transform:uppercase;padding-bottom:8px;">NEBULIFE WEB PREMIUM</td></tr>
          <tr><td style="font-size:20px;color:#ccddee;font-weight:bold;padding-bottom:14px;">${title}</td></tr>
          <tr><td style="font-size:12px;color:#8899aa;line-height:1.7;padding-bottom:8px;">${greeting}</td></tr>
          <tr><td style="font-size:12px;color:#8899aa;line-height:1.7;padding-bottom:24px;">${body}</td></tr>
          <tr>
            <td align="center" style="padding-bottom:14px;">
              <a href="${playUrl}"
                 style="display:inline-block;padding:12px 28px;background:rgba(68,136,170,0.16);border:1px solid #4488aa;color:#7bb8ff;font-family:monospace;font-size:13px;text-decoration:none;border-radius:4px;letter-spacing:1px;">
                ${cta}
              </a>
            </td>
          </tr>
          <tr><td style="font-size:10px;color:#667788;text-align:center;">${playUrl}</td></tr>
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
  if (!process.env.RESEND_API_KEY) {
    console.warn('[admin-alert] RESEND_API_KEY not set, alert dropped:', opts.subject);
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[admin-alert] ADMIN_EMAIL not set, alert dropped:', opts.subject);
    return;
  }

  await sendResendEmail({
    to: adminEmail,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function sendSupportRequest(opts: {
  fromEmail: string;
  name?: string;
  subject: string;
  message: string;
  meta?: Record<string, string>;
}): Promise<void> {
  const safeName = opts.name ? escapeHtml(opts.name) : 'Anonymous';
  const safeEmail = escapeHtml(opts.fromEmail);
  const safeSubject = escapeHtml(opts.subject);
  const safeMessage = escapeHtml(opts.message).replace(/\n/g, '<br>');
  const metaHtml = opts.meta
    ? Object.entries(opts.meta)
      .filter(([, value]) => value)
      .map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`)
      .join('')
    : '';

  await sendResendEmail({
    to: process.env.SUPPORT_EMAIL ?? 'woodoo.ukraine@gmail.com',
    subject: `[Nebulife Support] ${opts.subject}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Nebulife Support</title></head>
<body style="margin:0;padding:24px;background:#020510;color:#aabbcc;font-family:monospace;">
  <div style="max-width:680px;margin:0 auto;border:1px solid #334455;border-radius:6px;padding:20px;background:rgba(10,15,25,0.94);">
    <div style="font-size:10px;color:#44ff88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">NEBULIFE SUPPORT</div>
    <h1 style="font-size:18px;color:#ccddee;margin:0 0 16px;">${safeSubject}</h1>
    <p><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
    <div style="border-top:1px solid #223344;border-bottom:1px solid #223344;padding:16px 0;margin:16px 0;line-height:1.6;">
      ${safeMessage}
    </div>
    ${metaHtml ? `<ul style="font-size:12px;color:#8899aa;line-height:1.6;">${metaHtml}</ul>` : ''}
  </div>
</body>
</html>`,
    headers: {
      'Reply-To': opts.fromEmail,
    },
  });
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

export async function sendDigestEmail(payload: DigestEmailPayload): Promise<void> {
  const baseUrl = process.env.APP_BASE_URL ?? 'https://nebulife.space';

  const token = makeUnsubscribeToken(payload.playerId);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?pid=${payload.playerId}&token=${token}`;

  const html = buildHtml(payload, unsubscribeUrl);

  await sendResendEmail({
    to: payload.to,
    subject: SUBJECTS[payload.lang] ?? SUBJECTS.en,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function sendTestEmail(to: string, lang: 'uk' | 'en' = 'uk'): Promise<void> {
  await sendResendEmail({
    to,
    subject: TEST_SUBJECTS[lang] ?? TEST_SUBJECTS.uk,
    html: buildTestHtml(lang),
  });
}

export async function sendWelcomeEmail(payload: ServiceEmailPayload): Promise<void> {
  const lang = payload.lang ?? 'uk';
  const baseUrl = process.env.APP_BASE_URL ?? 'https://nebulife.space';
  const token = makeUnsubscribeToken(payload.playerId);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?pid=${payload.playerId}&token=${token}`;
  await sendResendEmail({
    to: payload.to,
    subject: WELCOME_SUBJECTS[lang] ?? WELCOME_SUBJECTS.uk,
    html: buildWelcomeHtml(payload),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function sendWebAccessEmail(payload: ServiceEmailPayload): Promise<void> {
  const lang = payload.lang ?? 'uk';
  await sendResendEmail({
    to: payload.to,
    subject: WEB_ACCESS_SUBJECTS[lang] ?? WEB_ACCESS_SUBJECTS.uk,
    html: buildWebAccessHtml(payload),
  });
}
