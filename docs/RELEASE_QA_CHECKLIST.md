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

Run all missing migrations in Neon SQL Editor. Production should include every migration through:

- `packages/server/src/migrations/027-planet-object-scope.sql`

Quick spot-check for recent/critical migrations:

- `packages/server/src/migrations/008-weekly-digest.sql`
- `packages/server/src/migrations/009-ad-rewards.sql`
- `packages/server/src/migrations/010-server-hardening.sql`
- `packages/server/src/migrations/011-clusters.sql`
- `packages/server/src/migrations/011-player-language-and-notifications.sql`
- `packages/server/src/migrations/020-push-queue.sql`
- `packages/server/src/migrations/021-player-avatar.sql`
- `packages/server/src/migrations/023-premium-entitlements.sql`
- `packages/server/src/migrations/025-message-read-state.sql`
- `packages/server/src/migrations/026-planet-skins-system-scope.sql`
- `packages/server/src/migrations/027-planet-object-scope.sql`

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

- Before the real release build, re-enable real ads:
  - In `packages/client/src/services/ads-service.ts`, set `ADS_DISABLED_FOR_TESTING = false`.
  - In `packages/client/src/services/interstitial-manager.ts`, set `ADS_DISABLED_FOR_TESTING = false`.
  - Keep `USE_TEST_ADS = false` for production AdMob unit IDs.
- For TestFlight / Play Beta review builds where we do not want reviewers blocked by no-fill, keep `ADS_DISABLED_FOR_TESTING = true` and document that ads are simulated.
- Ads must stay locked until the player settles on the new planet after evacuation.
- Verify pre-settlement: rewarded buttons are unavailable and no interstitial preloads or shows.
- Verify post-settlement: rewarded ads can grant tokens through `/api/ads/start` + `/api/ads/reward`, and interstitials respect cooldown/session caps.
- Verify daily ad limit wording: server limit is 10 ad views/day; quark reward currently costs 3 ads for +5 quarks, so the 4th full quark reward attempt should show "daily limit" instead of "ad not available".
- Verify RevenueCat products load from the `default` offering: `nebulife_pro_monthly`, `nebulife_pro_yearly`, `nebulife_pro_lifetime`, `nebulife_quarks_100`, `nebulife_quarks_500`, `nebulife_quarks_2000`.
- Verify premium restore and upgrade/crossgrade flows: monthly active player can still open yearly/lifetime purchase flow.
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
