import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDiscovery } from '../../packages/server/src/db.js';
import { getCatalogEntry, RARITY_LABELS } from '@nebulife/core';

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSafePreviewImage(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSharePage(params: {
  title: string;
  name: string;
  rarity: string;
  description: string;
  photoUrl: string;
  pageUrl: string;
  appUrl: string;
}): string {
  const { title, name, rarity, description, photoUrl, pageUrl, appUrl } = params;
  const esc = escapeHtml;
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(photoUrl)}" />
  <meta property="og:image:width" content="1024" />
  <meta property="og:image:height" content="1024" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:site_name" content="Nebulife" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(photoUrl)}" />

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
}

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
    const fallbackImage = firstQueryValue(req.query.image);
    const fallbackType = firstQueryValue(req.query.type);
    const fallbackRarity = firstQueryValue(req.query.rarity);
    const discovery = await getDiscovery(discoveryId);
    if (!discovery?.photo_url && !isSafePreviewImage(fallbackImage)) {
      return res.redirect(302, '/');
    }

    const objectType = discovery?.object_type ?? fallbackType ?? 'cosmic-discovery';
    const rarityKey = discovery?.rarity ?? fallbackRarity ?? 'rare';
    const catalog = getCatalogEntry(objectType);
    const name = catalog?.nameUk ?? objectType.replace(/[-_]/g, ' ');
    const description = catalog?.descriptionUk ?? '';
    const rarity = RARITY_LABELS[rarityKey as keyof typeof RARITY_LABELS] ?? rarityKey;

    const title = `${name} | Nebulife`;
    const desc = description
      ? `${rarity} — ${description.length > 150 ? description.slice(0, 147) + '...' : description}`
      : `${rarity} — Nebulife`;

    const photoUrl = discovery?.photo_url ?? fallbackImage!;
    const pageUrl = `https://nebulife.space/share/${encodeURIComponent(discoveryId)}`;
    const appUrl = `https://nebulife.space/?discovery=${encodeURIComponent(discoveryId)}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(renderSharePage({ title, name, rarity, description: desc, photoUrl, pageUrl, appUrl }));
  } catch (err) {
    console.error('Share page error:', err);
    return res.redirect(302, '/');
  }
}
