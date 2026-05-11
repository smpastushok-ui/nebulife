# Nebulife Email Setup

Nebulife uses Resend for transactional email and weekly digest delivery. The code path is dependency-free and calls the Resend REST API from Vercel Functions.

## Current Email Flows

- Weekly digest: `api/cron/digest-emails.ts`
- Manual test email: `api/email/test.ts`
- One-click unsubscribe: `api/email/unsubscribe.ts`
- Admin alerts: `sendAdminAlert()` in `packages/server/src/email-client.ts`
- Welcome/service email: `sendWelcomeEmail()` from auth register/link-account flows

## Resend Setup

1. Create or open the Resend project.
2. Add the sending domain, preferably `nebulife.space`.
3. Add the DNS records Resend gives you:
   - SPF/TXT
   - DKIM CNAME records
   - DMARC TXT record if Resend recommends one
4. Wait until the domain is verified in Resend.
5. Create an API key for production email sending.

Use a sender like:

```text
Nebulife <noreply@nebulife.space>
```

## Vercel Environment Variables

Set these for Production, Preview if needed, and local `.env.local` only when testing email locally:

```text
RESEND_API_KEY=...
EMAIL_FROM=Nebulife <noreply@nebulife.space>
EMAIL_UNSUBSCRIBE_SECRET=long-random-secret
ADMIN_EMAIL=owner@example.com
APP_BASE_URL=https://nebulife.space
CRON_SECRET=...
```

`EMAIL_UNSUBSCRIBE_SECRET` must stay stable. If it changes, old unsubscribe links stop validating.

## Database Requirements

Run the existing notification migration if it has not been applied:

```sql
-- packages/server/src/migrations/011-player-language-and-notifications.sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'uk';
ALTER TABLE players ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_digest_seen TEXT;
ALTER TABLE weekly_digest ADD COLUMN IF NOT EXISTS emails_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE weekly_digest ADD COLUMN IF NOT EXISTS pushes_sent BOOLEAN NOT NULL DEFAULT FALSE;
```

## Manual Verification

After deploy, send a test email:

```bash
curl -X POST https://nebulife.space/api/email/test \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@example.com","lang":"uk"}'
```

Expected response:

```json
{"sent":true,"to":"you@example.com","lang":"uk"}
```

If the response is `{"sent":false,"reason":"no_resend_key"}`, `RESEND_API_KEY` is missing in the current Vercel environment.

## Digest Delivery Check

The digest email cron sends to players where:

- `players.email IS NOT NULL`
- `players.email_notifications = TRUE`
- `players.preferred_language` matches the digest language
- the latest `weekly_digest` row has `status = 'complete'`
- `weekly_digest.emails_sent = FALSE`

Manual cron check:

```bash
curl https://nebulife.space/api/cron/digest-emails \
  -H "Authorization: Bearer $CRON_SECRET"
```

If at least one email is sent, the digest row is marked `emails_sent = TRUE`.

## Welcome Email

Welcome/service email is best-effort and never blocks registration. It is sent from:

- `api/auth/register.ts` for new Firebase accounts and successful legacy-player links
- `api/auth/link-account.ts` when a guest account is linked to email or Google auth

The email is sent only when:

- the player has `email`
- `email_notifications` is not `FALSE`
- `RESEND_API_KEY` is configured

Failures are logged as warnings and the auth request still succeeds.
