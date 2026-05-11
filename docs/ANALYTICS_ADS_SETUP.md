# Analytics And Ads Setup

Nebulife uses Firebase Analytics / GA4 events for ad optimization. Game state still lives in Neon; Firebase Analytics receives only lightweight behavioral events.

## Implemented Events

Core acquisition events:

- `sign_up` — auth completed for a new entry from the auth screen.
- `login` — returning auth completed from the auth screen.
- `tutorial_complete` — first onboarding/cinematic completion.

Early quality events:

- `first_system_open` — first conscious system entry.
- `first_system_photo_generated` — first generated system alpha photo.
- `first_planet_photo_generated` — first generated planet photo.
- `academy_lesson_complete` — daily Academy lesson completed.
- `level_up` — player level increased.
- `colony_founded` — evacuation/settlement loop completed.

Monetization and premium intent:

- `paid_feature_order` — paid quark feature started, before generation completes.
- `planet_skin_generated` — premium planet skin completed.
- `mission_photo_generated` — mission photo completed.
- `purchase` — RevenueCat quark pack purchase verified and credited.
- `ad_reward` — rewarded ad grant completed.

## Recommended Key Events In GA4

Mark these as Key events / Conversions first:

```text
tutorial_complete
first_planet_photo_generated
academy_lesson_complete
purchase
colony_founded
```

Use these for reporting, but do not optimize campaigns on them at the start:

```text
login
level_up
paid_feature_order
planet_skin_generated
mission_photo_generated
ad_reward
```

## Google Ads Flow

1. Enable Google Analytics in the Firebase project.
2. Make sure the Web/Android/iOS Firebase apps use the correct app IDs and package IDs.
3. Open GA4 Realtime or Firebase DebugView and trigger:
   - sign in
   - complete onboarding
   - generate a planet photo
   - complete an Academy lesson
4. In GA4 Admin, mark the recommended events as Key events.
5. Link GA4/Firebase to Google Ads.
6. Import the Key events into Google Ads as conversions.

## Campaign Optimization Order

Start broad and move deeper only after enough volume:

1. Optimize for `tutorial_complete`.
2. After volume is stable, optimize for `first_planet_photo_generated`.
3. For paying campaigns, optimize for `purchase` once purchases are frequent enough.

Do not optimize early campaigns on rare events like `colony_founded` until there is enough data.

## Notes

- Analytics calls are best-effort and never block gameplay.
- In local dev, events also print to console with `[analytics]`.
- Neon remains the source of truth for player progress, purchases, and game state.
