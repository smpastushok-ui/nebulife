import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSystemPhotoBySystemId } from '../../packages/server/src/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { photoKey } = req.query;
  if (!photoKey || typeof photoKey !== 'string') {
    return res.redirect(302, '/');
  }

  try {
    const decodedKey = decodeURIComponent(photoKey);
    const photo = await getSystemPhotoBySystemId(decodedKey);
    if (!photo?.photo_url) return res.redirect(302, '/');

    const planetName = decodedKey.match(/^planet-[a-z]+-([^_]+)__/)?.[1]?.replace(/-/g, ' ') ?? 'planet';
    const title = `Nebulife mission photo | ${planetName}`;
    const desc = `Photo from mission to planet ${planetName}. Nebulife - your own cosmos`;
    const pageUrl = `https://nebulife.space/photo/${encodeURIComponent(decodedKey)}`;
    const appUrl = `https://nebulife.space/?photo=${encodeURIComponent(decodedKey)}`;
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(photo.photo_url)}" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:site_name" content="Nebulife" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(photo.photo_url)}" />
  <meta http-equiv="refresh" content="0;url=${esc(appUrl)}" />
  <style>
    body { margin: 0; background: #020510; color: #aabbcc; font-family: monospace; display: grid; place-items: center; min-height: 100vh; }
    img { max-width: 92vw; max-height: 72vh; border: 1px solid #334455; border-radius: 6px; }
    a { color: #4488aa; }
  </style>
</head>
<body>
  <div>
    <h2>${esc(title)}</h2>
    <img src="${esc(photo.photo_url)}" alt="${esc(title)}" />
    <p><a href="${esc(appUrl)}">Open in Nebulife</a></p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Photo share page error:', err);
    return res.redirect(302, '/');
  }
}
