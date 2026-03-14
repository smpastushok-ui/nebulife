import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDiscovery } from '../../packages/server/src/db.js';
import { getCatalogEntry, RARITY_LABELS } from '@nebulife/core';

/**
 * GET /api/share/:discoveryId
 *
 * Returns an HTML page with dynamic Open Graph meta tags so that
 * Telegram / Twitter / Facebook show the discovery photo as a preview.
 * Human visitors are redirected to the main app.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { discoveryId } = req.query;
  if (!discoveryId || typeof discoveryId !== 'string') {
    return res.redirect(302, '/');
  }

  try {
    const discovery = await getDiscovery(discoveryId);
    if (!discovery || !discovery.photo_url) {
      return res.redirect(302, '/');
    }

    const catalog = getCatalogEntry(discovery.object_type);
    const name = catalog?.nameUk ?? discovery.object_type;
    const description = catalog?.descriptionUk ?? '';
    const rarity = RARITY_LABELS[discovery.rarity as keyof typeof RARITY_LABELS] ?? discovery.rarity;

    const title = `${name} | Nebulife`;
    const desc = description
      ? `${rarity} — ${description.length > 150 ? description.slice(0, 147) + '...' : description}`
      : `${rarity} — Nebulife`;

    const photoUrl = discovery.photo_url;
    const pageUrl = `https://nebulife.vercel.app/share/${discoveryId}`;
    const appUrl = `https://nebulife.vercel.app/?discovery=${discoveryId}`;

    // Escape HTML entities for safe embedding
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(photoUrl)}" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:site_name" content="Nebulife" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(photoUrl)}" />

  <!-- Redirect human visitors to the app -->
  <meta http-equiv="refresh" content="0;url=${esc(appUrl)}" />
  <style>
    body {
      margin: 0; background: #020510; color: #aabbcc;
      font-family: monospace; display: flex; flex-direction: column;
      align-items: center; justify-content: center; min-height: 100vh;
    }
    img { max-width: 90vw; max-height: 70vh; border-radius: 8px; margin: 20px 0; }
    a { color: #4488aa; }
  </style>
</head>
<body>
  <h2>${esc(name)}</h2>
  <p>${esc(rarity)}</p>
  <img src="${esc(photoUrl)}" alt="${esc(name)}" />
  <p><a href="${esc(appUrl)}">Open in Nebulife</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Share page error:', err);
    return res.redirect(302, '/');
  }
}
