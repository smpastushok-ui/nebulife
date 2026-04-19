import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Apple Sign-In callback endpoint.
 *
 * Apple requires a publicly-reachable Return URL when a Service ID is
 * configured for "Sign in with Apple" (see Apple Developer → Identifiers →
 * Services IDs → app.nebulife.service → Configure). On the iOS native flow
 * this URL is never actually followed — Apple hands the identity token
 * straight back to the Capacitor plugin — but it MUST respond 200 OK so
 * Apple's server-side validation of the Service ID succeeds.
 *
 * On the web OAuth flow Apple POSTs `code` + `state` here after the user
 * approves. For Firebase web auth we rely on Firebase's own Apple provider
 * endpoint, so this handler only needs to acknowledge the redirect.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send('OK');
}
