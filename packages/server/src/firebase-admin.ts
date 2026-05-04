import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// ---------------------------------------------------------------------------
// Firebase Admin SDK — singleton init, reused across Vercel invocations
// ---------------------------------------------------------------------------

function readServiceAccount() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
    };
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };
}

function normalizePrivateKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');
}

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = readServiceAccount();
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getAuth();
}

/**
 * Verify a Firebase ID token and return decoded claims.
 */
export async function verifyFirebaseToken(idToken: string): Promise<{
  uid: string;
  email?: string;
  provider: string;
}> {
  const auth = getFirebaseAdmin();
  const decoded = await auth.verifyIdToken(idToken);
  const claims = decoded as typeof decoded & { provider?: string; apple_email?: string };
  const provider = decoded.firebase.sign_in_provider === 'custom' && claims.provider
    ? claims.provider
    : decoded.firebase.sign_in_provider;
  return {
    uid: decoded.uid,
    email: decoded.email ?? claims.apple_email,
    provider, // 'google.com' | 'password' | 'anonymous' | 'apple.com'
  };
}

/**
 * Create a Firebase custom token after a trusted server-side auth exchange.
 */
export async function createFirebaseCustomToken(
  uid: string,
  claims: Record<string, string | number | boolean | null> = {},
): Promise<string> {
  const auth = getFirebaseAdmin();
  return auth.createCustomToken(uid, claims);
}

/**
 * Delete a Firebase user by UID. Used for account deletion (GDPR/Apple requirement).
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  const auth = getFirebaseAdmin();
  await auth.deleteUser(uid);
}
