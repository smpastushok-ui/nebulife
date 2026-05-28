import type { VercelRequest, VercelResponse } from '@vercel/node';

// One publisher ID covers all AdMob apps (Android + iOS) in the same account.
const APP_ADS_TXT = 'google.com, pub-3504252081237345, DIRECT, f08c47fec0942fa0\n';

const NO_CACHE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', NO_CACHE_HEADERS['Content-Type']);
  res.setHeader('Cache-Control', NO_CACHE_HEADERS['Cache-Control']);
  res.setHeader('CDN-Cache-Control', NO_CACHE_HEADERS['CDN-Cache-Control']);
  res.setHeader('Vercel-CDN-Cache-Control', NO_CACHE_HEADERS['Vercel-CDN-Cache-Control']);
  res.setHeader('Pragma', NO_CACHE_HEADERS.Pragma);
  res.setHeader('Expires', NO_CACHE_HEADERS.Expires);
  res.status(200).send(APP_ADS_TXT);
}
