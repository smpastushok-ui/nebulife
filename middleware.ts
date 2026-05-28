// ---------------------------------------------------------------------------
// Vercel Edge Middleware — CORS for Capacitor native apps + AdMob crawl files
// ---------------------------------------------------------------------------

export const config = {
  matcher: ['/app-ads.txt', '/robots.txt', '/api/:path*'],
};

const APP_ADS_TXT = 'google.com, pub-3504252081237345, DIRECT, f08c47fec0942fa0\n';

const ROBOTS_TXT = `User-agent: Google-adstxt
Disallow:

User-agent: Mediapartners-Google
Disallow:

User-agent: Googlebot
Disallow:
`;

const NO_CACHE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

const STATIC_ALLOWED = new Set<string>([
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'https://www.nebulife.space',
  'https://nebulife.space',
  'https://nebulife.vercel.app',
  'http://localhost:3000',
]);

function isAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.has(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = isAllowed(origin) ? origin! : 'https://www.nebulife.space';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Idempotency-Key, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function plainTextResponse(body: string): Response {
  return new Response(body, { status: 200, headers: NO_CACHE_HEADERS });
}

export default function middleware(req: Request): Response {
  const url = new URL(req.url);

  if (url.pathname === '/app-ads.txt') {
    return plainTextResponse(APP_ADS_TXT);
  }

  if (url.pathname === '/robots.txt') {
    return plainTextResponse(ROBOTS_TXT);
  }

  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  return new Response(null, {
    headers: {
      ...headers,
      'x-middleware-next': '1',
    },
  });
}
