# Release QA Checklist

## Release Inventory

Run before iOS archive:

```bash
git status --short
npm run typecheck -w @nebulife/core
npm run typecheck -w @nebulife/server
npm run typecheck -w @nebulife/client
npm run build -w @nebulife/core && npm run build -w @nebulife/server && npm run build -w @nebulife/client
npm run release:qa
```

## Release Assets

Verify these are included in the production archive:

- `packages/client/public/astra/voice/surface/`
- `packages/client/public/arena_ships/blue_ship.glb`
- `packages/client/public/arena_ships/red_ship.glb`
- `packages/client/public/arena/arena-backdrop.jpg`
- `packages/client/public/sw.js`
- raid background and carrier assets used by `CarrierRaid`

## Neon Migrations

Run all missing migrations in Neon SQL Editor, especially:

- `packages/server/src/migrations/008-weekly-digest.sql`
- `packages/server/src/migrations/009-ad-rewards.sql`
- `packages/server/src/migrations/010-server-hardening.sql`
- `packages/server/src/migrations/011-player-language-and-notifications.sql`
- `packages/server/src/migrations/020-push-queue.sql`
- avatar migration that adds `players.avatar_url`

## Vercel Environment

Production must have:

- `DATABASE_URL`
- `CRON_SECRET`
- `PHOTO_HMAC_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `GEMINI_API_KEY`
- `KLING_ACCESS_KEY`
- `KLING_SECRET_KEY`
- `TRIPO_API_KEY`
- `BLOB_READ_WRITE_TOKEN`
- all required `VITE_FIREBASE_*` values, including `VITE_FIREBASE_VAPID_KEY`

`CRON_SECRET` and `PHOTO_HMAC_SECRET` must be strong production secrets, not local fallbacks.

## Ads And Monetization

- Ads must stay locked until the player settles on the new planet after evacuation.
- Verify pre-settlement: rewarded buttons are unavailable and no interstitial preloads or shows.
- Verify post-settlement: rewarded ads can grant tokens and interstitials respect cooldown/session caps.
- Run `npm run release:economics` before archive and check the JSON `monetizationPlan`, `scenarios`, and `releaseRisks`.
- Base launch target for 10k installs: D30 6%, payer conversion 8%, settled-player ad ARPDAU $0.015+, free photo cost near $0.20/install.

## Manual Smoke

- Onboarding and language selection.
- Auth/link account/logout/delete account.
- First mission and first generated photo.
- Cosmic photo share preview.
- Chat, DM, system notifications.
- Push opt-in, foreground push, background push click.
- Rewarded ad, ad-funded photo token, interstitial cooldown, and post-settlement ad unlock gate.
- Arena web controls and high-tier mobile 5v5.
- Raid ship model orientation, ally model/color, carrier waves.
- Colony storage, observatory queue, observatory reports.
- Weekly digest manual generation and cron delivery.
