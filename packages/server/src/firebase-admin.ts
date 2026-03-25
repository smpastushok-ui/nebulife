import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// ---------------------------------------------------------------------------
// Firebase Admin SDK — singleton init, reused across Vercel invocations
// ---------------------------------------------------------------------------

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
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
  return {
    uid: decoded.uid,
    email: decoded.email,
    provider: decoded.firebase.sign_in_provider, // 'google.com' | 'password' | 'anonymous'
  };
}

/**
 * Delete a Firebase user by UID. Used for account deletion (GDPR/Apple requirement).
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  const auth = getFirebaseAdmin();
  await auth.deleteUser(uid);
}
