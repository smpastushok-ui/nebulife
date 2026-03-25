import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/share?lesson={lessonId}&from={playerName}&title={lessonTitle}
 *
 * Public landing page for shared academy lessons.
 * - Shows lesson preview with player name
 * - "Відкрити в Nebulife" → deep links back into the game with URL params
 * - Works for everyone, including unauthenticated visitors
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const lessonId = String(req.query.lesson ?? '');
  const from = String(req.query.from ?? '');
  const title = String(req.query.title ?? 'Урок Академії');

  // The app URL — try env variable, fall back to request host
  const host = req.headers.host ?? 'nebulife.vercel.app';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  // Deep link back into the SPA
  const deepLink = `${origin}/?share_lesson=${encodeURIComponent(lessonId)}&from=${encodeURIComponent(from)}&title=${encodeURIComponent(title)}`;

  const fromLine = from
    ? `<p class="from">Поділився: <span class="sender">${escHtml(from)}</span></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${from ? `${escHtml(from)} ділиться уроком` : 'Урок Космічної Академії'} — Nebulife</title>
  <meta name="description" content="${escHtml(title)} — навчайся астрономії та фізиці в космічній грі Nebulife">
  <meta property="og:title" content="${from ? `${escHtml(from)} поділився уроком` : escHtml(title)}">
  <meta property="og:description" content="${escHtml(title)} — Космічна Академія Nebulife">
  <meta property="og:type" content="website">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020510;
      color: #aabbcc;
      font-family: monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(10,15,25,0.95);
      border: 1px solid #334455;
      border-radius: 6px;
      padding: 40px 48px;
      max-width: 460px;
      width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-block;
      color: #4488aa;
      font-size: 11px;
      border: 1px solid rgba(68,136,170,0.3);
      border-radius: 3px;
      padding: 3px 10px;
      margin-bottom: 20px;
      letter-spacing: 0.5px;
    }
    .title {
      font-size: 20px;
      font-weight: normal;
      color: #aabbcc;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .from {
      color: #667788;
      font-size: 12px;
      margin-bottom: 32px;
    }
    .sender { color: #8899aa; }
    .open-btn {
      display: block;
      background: rgba(68,136,170,0.12);
      border: 1px solid #446688;
      color: #7bb8ff;
      font-family: monospace;
      font-size: 13px;
      padding: 14px 32px;
      border-radius: 4px;
      text-decoration: none;
      margin-bottom: 16px;
      transition: background 0.15s, border-color 0.15s;
    }
    .open-btn:hover { background: rgba(68,136,170,0.22); border-color: #5599bb; }
    .hint {
      color: #445566;
      font-size: 11px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Космічна Академія</div>
    <h1 class="title">${escHtml(title)}</h1>
    ${fromLine}
    <a href="${deepLink}" class="open-btn">Відкрити в Nebulife</a>
    <p class="hint">
      Потрібна реєстрація для повного доступу.<br>
      Навчайся астрономії, фізиці та астробіології.
    </p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
