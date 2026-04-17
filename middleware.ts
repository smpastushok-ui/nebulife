// ---------------------------------------------------------------------------
// Vercel Edge Middleware — CORS for Capacitor native apps
// ---------------------------------------------------------------------------
// Android/iOS Capacitor WebView serves the bundle from https://localhost and
// makes fetch() calls to the backend. Browsers block those cross-origin calls
// unless the server responds with the correct CORS headers. This middleware
// handles the preflight OPTIONS request and adds CORS response headers to
// every /api/* response.
//
// Vercel Edge runtime provides global `Request`/`Response` (Web Fetch API),
// so no framework imports are required.
// ---------------------------------------------------------------------------

export const config = {
  matcher: '/api/:path*',
};

const STATIC_ALLOWED = new Set<string>([
  // Capacitor native Android & iOS
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  // Web (production + dev)
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

export default function middleware(req: Request): Response {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  // Preflight request — short-circuit with 204 + CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Let the request continue to the actual endpoint. Vercel Edge Middleware
  // uses the `x-middleware-next` response header to signal pass-through; any
  // other headers set here are merged into the final response.
  return new Response(null, {
    headers: {
      ...headers,
      'x-middleware-next': '1',
    },
  });
}
