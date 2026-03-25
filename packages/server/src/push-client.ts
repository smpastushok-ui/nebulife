// ---------------------------------------------------------------------------
// Firebase Cloud Messaging — server-side push via REST API
// ---------------------------------------------------------------------------
// Uses Firebase Admin SDK v1 HTTP API (OAuth2 / service account JWT)
// Env var: FIREBASE_SERVICE_ACCOUNT_JSON — full JSON key file as a string
// ---------------------------------------------------------------------------

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Create a short-lived OAuth2 access token from the service account. */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.value;
  }

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  // Sign using Web Crypto (available in Node 18+ and edge runtimes)
  const pemKey = sa.private_key.replace(/\\n/g, '\n');
  const binaryKey = pemToBinary(pemKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${bufferToBase64Url(signature)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`FCM token exchange failed: ${tokenRes.status}`);
  }

  const data = await tokenRes.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DigestPushPayload {
  fcmToken: string;
  lang: 'uk' | 'en';
  weekDate: string;
}

const PUSH_TITLES: Record<string, string> = {
  uk: 'Nebulife Weekly',
  en: 'Nebulife Weekly',
};

const PUSH_BODIES: Record<string, string> = {
  uk: 'Космічні новини тижня готові. Відкрий термінал.',
  en: 'This week\'s space digest is ready. Open the terminal.',
};

/**
 * Send a digest push notification to a single FCM token.
 * Returns true on success, false on token-expired/invalid (token should be cleared).
 */
export async function sendDigestPush(payload: DigestPushPayload): Promise<boolean> {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set');
  }

  const sa = JSON.parse(saJson) as ServiceAccount;
  const token = await getAccessToken(sa);

  const body = {
    message: {
      token: payload.fcmToken,
      notification: {
        title: PUSH_TITLES[payload.lang] ?? 'Nebulife',
        body: PUSH_BODIES[payload.lang] ?? '',
      },
      data: {
        action: 'open-digest',
        weekDate: payload.weekDate,
      },
      webpush: {
        fcm_options: {
          link: '/?action=open-digest',
        },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (res.ok) return true;

  const errData = await res.json().catch(() => ({})) as { error?: { status?: string } };
  const status = errData?.error?.status;

  // Token expired or invalid — caller should clear it
  if (status === 'UNREGISTERED' || status === 'INVALID_ARGUMENT') return false;

  throw new Error(`FCM send failed: ${res.status} ${JSON.stringify(errData)}`);
}
