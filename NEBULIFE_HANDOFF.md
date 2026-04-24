# Nebulife — Master Handoff Document

> **Single source of truth** — все важливе що накопичилось: технічні нотатки, плани, монетизація, маркетинг, pending tasks.
> Оновлювати перед кожною важливою віхою. Копіювати в новий чат якщо треба контекст.
>
> **Дата:** Day 40 of development (квітень 2026)
> **Стан:** Android submitted to Play Console; iOS в процесі App Store Connect submission

---

## 1. PROJECT OVERVIEW

- **Назва:** Nebulife
- **Жанр:** Cozy sci-fi space exploration MMO
- **Платформи:** iOS + Android (Capacitor) + Web (PWA)
- **Stack:** React 19, PixiJS v8, Three.js, Vercel serverless, Neon PostgreSQL, Firebase Auth, Capacitor v8
- **AI integrations:** Kling (planet photos), Gemini (lessons/ASTRA/digests), Tripo (3D models)
- **Pitch (EN):** "An asteroid is heading for your planet. 7 days. Explore neighboring star systems, find a habitable world, launch a rescue ship for 10,000 passengers."

### Target Audience
- **Primary language:** English (EN) — marketing, App Store, SEO, social
- **Secondary language:** Ukrainian (UK) — homage to author's country, НЕ target market
- **Regions:** US / EU / UK / CA / AU
- **Demographics:** 25-45, educated, tech-curious, cozy-game players
- **Play pattern:** 30 min/day

### Owner
- Сергій — власник/геймдизайнер, НЕ програміст
- Claude = Senior Developer, пояснювати простою мовою

---

## 2. CRITICAL TODOS (before prod release)

### 2.1 ADS RESTORATION
- Ads STUBBED for tester builds (rewarded auto-succeeds, interstitials never show)
- **To revert:** `ADS_DISABLED_FOR_TESTING = false` в:
  - `packages/client/src/services/ads-service.ts` (top)
  - `packages/client/src/services/interstitial-manager.ts` (top)
- Rebuild + redeploy

### 2.2 DB MIGRATIONS (pending, run in Neon SQL Editor)
Файли в `packages/server/src/migrations/`:
- `010-academy.sql` — academy_progress + academy_lessons
- `011-clusters.sql` — clusters table + cluster_id on players
- `012-language.sql` — language column on players + academy_lessons

### 2.3 v138 DEFERRED UI ITEMS
- Circular progress button in Systems list
- Terminal system context menu
- Favorites collapsible rows

### 2.4 ASSET OPTIMIZATION (14 MB savings)
- `packages/client/public/planet_2d/*.png` — **NOT used in code** (HexSurface.tsx reads .webp only)
- Delete 5 PNG files (dwarf/gas-giant/ice-giant/rocky/terrestrial) → AAB shrinks 105→91 MB
- Zero risk, WebP versions stay

---

## 3. ENVIRONMENT & BUILD PIPELINE

### 3.1 `.env.local` (CRITICAL)
- `packages/client/.env.local` is **gitignored** — new worktrees start WITHOUT it
- Without `VITE_FIREBASE_API_KEY` → `isFirebaseConfigured = false` → legacy fallback → every user silently becomes "Explorer"
- **Fix:** copy `.env.local` from main repo to new worktree's `packages/client/` before dev/build

### 3.2 Android APK/AAB build (mandatory sequence)
```bash
cd /Users/sergijpastusok/Documents/projects/nebulife
git pull origin main
(cd packages/core && npm run build)
(cd packages/client && npm run build && npx cap sync android)
cd packages/client/android
./gradlew bundleRelease
```

**Output:** `packages/client/android/app/build/outputs/bundle/release/app-release.aab`

### 3.3 Android signing (configured permanently)
- **Keystore:** `/Users/sergijpastusok/Documents/projects/nebulife/nebulife-release.keystore`
- **SHA-1:** `B5:E7:8A:A2:FF:F9:82:8F:7E:98:84:C8:67:18:CF:AE:BA:AB:F3:D5`
- **Valid until:** 2053
- **Alias:** `nebulife`
- **Credentials file:** `packages/client/android/keystore.properties` (gitignored, NEVER commit)
  ```properties
  storeFile=/Users/sergijpastusok/Documents/projects/nebulife/nebulife-release.keystore
  storePassword=<see 1Password vault: "Nebulife Android Keystore">
  keyAlias=nebulife
  keyPassword=<see 1Password vault: "Nebulife Android Keystore">
  ```
- **NEVER put the plaintext password in any doc that may land in git.**
  History scrub is expensive and breaks forks/clones. Password belongs in
  a secret manager + the local gitignored keystore.properties only.
- `build.gradle` reads `keystore.properties` automatically (signingConfigs block)
- `.gitignore` excludes `*.jks`, `*.keystore`, `keystore.properties`

### 3.4 Version bump rule
- **Кожен upload в Play Console** = новий `versionCode`
- Поточно: `versionCode 142`, `versionName "1.0.142"`
- Наступний: бампнути до 143 в `packages/client/android/app/build.gradle`
- **Правило:** бампати ДО запуску `./gradlew bundleRelease`, інакше Play відкидає як дублікат.
  Якщо ти побачив "Version code X has already been used" — бампни ще раз,
  rebuild, upload.

### 3.5 Deployment
- Push ТІЛЬКИ в `main` → Vercel auto-deploy
- НЕ пушити автоматично після кожного коміту
- Пушити ТІЛЬКИ коли Сергій скаже "пуш" / "push" / "запуш"

---

## 4. MONETIZATION PLAN

### 4.1 Pricing (Western global market)

| Product | Price | Rationale |
|---|---|---|
| Pro Monthly | **$4.99** | Low entry point, tests value |
| Pro Yearly | **$39.99** | ~$3.33/mo — decoy effect, 60% conversions land here |
| Pro Lifetime | **$59.99** | "Half a AAA game" — whale option |
| Quark Pack XS | $0.99 (100⚛) | |
| Quark Pack M | $4.99 (500⚛) | |
| Quark Pack L | $19.99 (2000⚛) | |

### 4.2 Expected conversion
- Free-to-paid: 2-4% (cozy-game norm)
- Payer distribution: Monthly 20% / Yearly 55-65% / Lifetime 15-25%
- ARPPU/year: ~$35-40

### 4.3 Pro benefits (to justify price)
- +50% XP (not 2x — keeps balance)
- +2 observatory slots (3 → 5)
- +1 photo slot per discovery (future trading)
- ASTRA extended responses (longer context)
- Exclusive thread color in Star Group (cyan → gold)
- Pro badge in chat/arena
- Early access to features (1 week forward)
- No ads

### 4.4 IAP localization (30/45 char limits)

| Product | EN display (30) | EN desc (45) | UK display | UK desc |
|---|---|---|---|---|
| Quarks 100 | 100 Quarks | Starter pack of quarks | 100 кварків | Стартовий пакет кварків |
| Quarks 500 | 500 Quarks | Best value pack | 500 кварків | Вигідний пакет |
| Quarks 2000 | 2000 Quarks | Explorer's bundle | 2000 кварків | Пакет дослідника |
| Pro Monthly | Pro Monthly | All features, no ads | Pro місячний | Всі функції, без реклами |
| Pro Yearly | Pro Yearly | Save 33% vs monthly | Pro річний | -33% від місячного |

### 4.5 Offer Codes (App Store)
- **Reference Name:** `Launch_Promo_2026_Q2`
- **Eligibility:** Never made a purchase within your app
- **Type:** Free Offer (1 month free, auto-renew)
- **Duration:** 1 Month × 1 Period
- **Max codes:** 150 (Apple limit per 6 months)
- **Distribution:** Download CSV → inflencers/creators/testers

---

## 5. CONTENT MARKETING STRATEGY

### 5.1 Channels

| Channel | Role | Audience | Format |
|---|---|---|---|
| **Threads** | Top-funnel discovery | Cold | Short posts + screenshots + 15s videos |
| **Telegram @nebulife_devlog** | Broadcast updates | Warm | Longer updates, changelogs, trailers |
| **Telegram @nebulife_testers** | Community hub | Active testers | 2-way chat, topics: #bugs #feedback #builds #off-topic |
| **TestFlight / Play Internal** | Actual testing | Opted-in | Invite links |

### 5.2 Threads strategy
- **Existing account:** 444 followers, previously UK-language AI content
- **Decision:** KEEP account, pivot to Nebulife (expansion not pivot)
- **6 testers/2 posts** — strong baseline conversion
- **Bilingual format:** EN on top, UK below separator
- **1 post/day max**
- **Time:** 18:00-22:00 EST (prime for US audience)
- **Hashtags (EN only):** `#indiedev #gamedev #indiegame #spacegame #cozygames #screenshotsaturday`

### 5.3 Post format template
```
[EN text — 2-4 sentences, under 500 chars]

—

[UK text — 1-2 sentences, 40-50% of EN length]

#indiedev #gamedev #spacegame
```

### 5.4 Content mix
- 60% Devlog (progress, features, screenshots)
- 20% Behind-the-scenes (costs, stack, decisions)
- 10% Testers recruiting (CTA with TestFlight/Play links)
- 10% AI angle (retain old audience)

### 5.5 Transitional post (first one to publish)
```
After 40 days of quietly building, time to show up.

I'm making Nebulife — a cozy sci-fi MMO where you
explore 500+ star systems, 30 min/day.
AI-generated planets (Kling), procedural everything,
real physics, iOS + Android.

I'll still post about AI — it's baked into the game.
But expect more gamedev, screenshots, and honest dev logs.

Posting EN + UK going forward — growing global audience
while keeping my 🇺🇦 roots.

Thanks for being here.

—

Після 40 днів тихого ведення — час вилазити.

Роблю Nebulife — cozy sci-fi MMO де досліджуєш
500+ зіркових систем, 30 хв на день.
ШI-планети, процедурна генерація, реальна фізика.

Продовжую писати про AI — воно всередині гри.
Але більше буде геймдеву, скрінів, чесних логів.

Двомовно далі — глобальна аудиторія + українське коріння.

#indiedev #gamedev #spacegame #ai
```

### 5.6 Threads bio (160 chars max, EN only)
```
indie dev • building Nebulife 🌌
cozy space MMO • 30 min/day
AI-powered universe • iOS + Android
testers → t.me/nebulife_testers
```

### 5.7 30-day growth targets
| KPI | Current | Day 30 Target |
|---|---|---|
| Followers | 444 | 1,200 |
| EN replies/post | 0 | 3-5 |
| Testers from Threads | 6 | 50+ |
| Telegram devlog subs | 0 | 300 |
| Telegram testers | 0 | 100 |
| Play pre-register | 0 | 500+ |

---

## 6. TESTERS RECRUITING

### 6.1 Google Play testing tracks
| Track | Email needed? | Max | Link pattern |
|---|---|---|---|
| Internal testing | ✓ yes | 100 | `play.google.com/apps/internaltest/XXX` |
| Closed testing | ✓ yes (or Google Group) | 2,000 per list | `play.google.com/apps/testing/app.nebulife.game` |
| Open testing | ✗ no | unlimited | `play.google.com/store/apps/details?id=app.nebulife.game` |

### 6.2 Tester workflow
1. User adds Gmail to Play Console testers list
2. Google sync (5-30 min)
3. Tester gets opt-in link → click → Accept invitation
4. Tester logged in with SAME Gmail on phone
5. Install/Update via Play Store

### 6.3 Common tester problems
- ❌ iCloud/Yahoo/Outlook emails — Play Console accepts only Gmail/Google Workspace
- ❌ Wrong Google account on phone → "item not available in your country"
- ❌ Play Store cache → Settings → Apps → Play Store → Clear Cache (NOT Data)

### 6.4 Recommended setup
- **Closed Testing** (NOT Internal) — counts toward Google's 14-day testing requirement before production
- **Google Group:** `nebulife-testers@googlegroups.com` (membership = request-based)
- Add group email to Play Console Testers → users self-join

### 6.5 iOS TestFlight
- Internal testers: up to 100, no Apple review
- External testers: up to 10,000, 1-day Apple review
- Public link: `testflight.apple.com/join/XXXXXXXX`

### 6.6 Testers recruiting Threads post
```
Looking for 50 Android testers for Nebulife.

Free early access. Pro features unlocked for testers.

1. Reply with your Gmail
2. I add you to test list
3. Install from Play Store link

Reply 🚀 with your Gmail.
```

---

## 7. ARCHITECTURAL DECISIONS & GOTCHAS

### 7.1 Cluster math (HIDDEN multiplayer bug, fixed)
- `playerIndex` = GLOBAL index (0..N across clusters)
- `playerGroupIndex` = cluster number
- Slot in cluster = `globalIndex % PLAYERS_PER_GROUP` (0..49)
- Delaunay + lite-systems MUST iterate globals for current cluster:
  ```ts
  const base = playerGroupIndex * PLAYERS_PER_GROUP;
  for (let slot = 0; slot < PLAYERS_PER_GROUP; slot++) {
    const globalIdx = base + slot;
  }
  ```

### 7.2 Service Worker on Capacitor (CRITICAL)
- `public/sw.js` registers on all platforms including APK
- WebView cached stale index.html → missing chunk hashes → "stuck on old version" after reinstall
- **Fix in index.html:** skip SW if `window.Capacitor.isNativePlatform()`, unregister existing + clear caches
- On web SW needed for PWA install

### 7.3 Vite: NEVER add Capacitor plugins to `rollupOptions.external`
- `@codetrix-studio/capacitor-google-auth` was external → dynamic import failed in WebView
- These plugins are regular JS that calls `registerPlugin()` — must bundle

### 7.4 Firebase Auth persistence on Capacitor
- Default = `browserSession` → lost on app restart
- Use: `setPersistence(auth, indexedDBLocalPersistence)` with localStorage/memory fallback
- `GoogleAuth.signOut()` separately (Firebase doesn't clear native Google session)

### 7.5 NEVER return Capacitor plugin proxy from async function
- Symptom: `GoogleAuth.then() is not implemented on android`
- Cause: async wraps return in Promise → runtime calls `.then()` on it → proxy treats it as native call
- **Fix:** wrap in plain object
  ```ts
  async function getGoogleAuth() {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    return { GoogleAuth }; // ✓ not return GoogleAuth directly
  }
  ```

### 7.6 Auth state save on kill (keepalive)
- `fetch(..., { keepalive: true })` on updatePlayer
- `App.addListener('appStateChange', ({ isActive }) => { if (!isActive) syncNow(); })`
- Debounce 5000ms → 1500ms
- Research session complete → call `syncNowToServer()` immediately

### 7.7 Galaxy Camera (Star Group view)
- `resetToFit(800)` + `minScale(0.12)` + `panBounds(1200)`
- Lite-orbs scale-compensation: `sizeBoost = max(1.0, 0.6 / scale)`
- `GalaxyScene.refreshLiteOrbs()` AFTER `camera.resetToFit`

### 7.8 Tier visibility alpha (don't flip!)
- Tier 1 = brightest (full), Tier 2 = faded, Tier 3 = hidden
- neighbor tier 1 = 1.0, tier 2 = 0.55

### 7.9 Starter toast
- `maybeShowStarterToast()` — NO current balance param
- If balance > STARTER_QUARKS (30) → skip toast (existing player)
- Show fixed +30⚛

### 7.10 Home Planet (post-evacuation)
- IDEAL for all players (100% habitability)
- Has ALL resources (trees, ore, volatiles)
- Medium size (grid 64x64)
- Deterministic via seed (same for everyone)

### 7.11 Surface (SVG rewrite, Apr 2025)
- PixiJS replaced by SVG + CSS animations
- `discoveredTiles` instead of fog-of-war
- White background, `IsoBlock` primitive
- 5 tree color variants, varied sizes
- All logic in `useSurfaceState.ts` (A*, harvest, bot)
- Old PixiJS files not deleted yet (`SurfaceScene.ts`, `SurfaceBaker.ts`)

---

## 8. PERFORMANCE OPTIMIZATIONS DONE

### Asset / build-level (earlier)
- All PNG/JPG → WebP (-88%, 16.5MB → 2MB)
- ~3400 sprites → 1 RenderTexture bake
- Dead code removed: SurfaceScene 4532 → 1965 lines
- Building idle effects disabled (20+ Graphics.clear()/frame)
- Hub orbit effects disabled (7 Graphics.clear()/frame)
- Shoreline foam disabled
- Water animation disabled (shader removed)
- Mountain overlay disabled
- GPU memory leak fixed: RenderTexture destroyed on scene exit
- formatShort utility (1000 threshold, no decimals, к/кк suffixes)

### Low-end Android perf batch (Apr 21, versionCode 141)
Testers complained of lag on mid/low-end phones; owner's S22 Ultra was
fine. Plan: `.claude/plans/vectorized-waddling-prism.md`. All shipped:

**React cascade (Phase A) — fixes "sluggish tutorial buttons":**
- `React.memo` on hot static children: `PlayerPanel`, `SystemNavHeader`,
  `PlanetNavHeader`, `ChatWidget`. Unrelated App state changes no longer
  force them to re-render.
- `<LiveCountdown>` leaf component replaces App-level 42ms countdown.
  Self-updates DOM span via `ref.textContent = ...` — zero React
  re-renders. Was: 24 full App re-renders per second during exodus.
  File: `packages/client/src/ui/components/LiveCountdown.tsx`.
- `useMemo` on `navigableSystems` (500–1500 elements) +
  `radialResearchBlockReason` (IIFE calling getAllSystems on every App
  render while radial menu was open).
- Bot RAF loop throttle: `setBotState` 60Hz → 20Hz. Ref still updated
  every frame; React only re-renders on 50ms boundaries + state
  transitions (idle↔flying).

**PixiJS Galaxy (Phase B partial):**
- `BlurFilter` on neighbor nodes removed — every filter forced an
  off-screen render pass per container.
- `Text` resolution 3 → 2 in `GalaxyScene.ts` + `SystemScene.ts`
  (9× VRAM → 4× VRAM on 3× DPR phones).
- Deferred (heavier): B1 bake star animation in RenderTexture,
  B3 connectionLines one-shot, B5 lite-orb RenderTexture bake.

**Device-tier heuristic + Arena/Planet (Phase C/D):**
- New `packages/client/src/utils/device-tier.ts` — classifies
  low/mid/high via `navigator.hardwareConcurrency` + `deviceMemory`.
- ArenaEngine: low tier → `antialias: false` + `pixelRatio = 1.0`
  (half pixel-fill on 3× DPR phones). Mid/high: unchanged.
- PlanetGlobeView: low tier → skip `UnrealBloomPass` +
  `EffectComposer` entirely (saves 8–15ms/frame). Mid/high: full bloom.
- SpaceArena: dynamic `backdropFilter: blur(Xpx)` (10Hz) → fixed 3px
  static blur, off on low tier.
- SpaceArena: `filter: blur/brightness/saturate` on the Three.js canvas
  during warp/death → plain dimming div on low tier.
- Deferred: C1 consolidate 5 polling intervals into 1 RAF loop.

**Commits landed:** 7532fcf, 4701aa5, bedec93, c156c34, b0fd951,
0c1fbb7, 61a41c3 + SW cache bumps v24/v25.

**Expected impact on low-end Android:**
| Pain point | Win |
|---|---|
| Terminal buttons slow | Instant (App no longer re-rendering 24×/sec) |
| Galaxy lag | ~20–30% FPS ↑ |
| Arena lag | ~50% FPS ↑ |
| Planet view lag | 8–15ms/frame saved |

### Device-tier system — 4 tiers (v150+)

All perf-sensitive code reads from `packages/client/src/utils/device-tier.ts`.
`getDeviceTier()` returns one of four buckets; everything else —
`getExosphereLOD()`, the main.tsx global CSS kill-switch, RAF FPS caps —
is driven by this one value.

| Tier | Auto-detect rule | Typical devices |
|---|---|---|
| **low** | `cores ≤ 4` OR `RAM ≤ 3 GB` | Budget Android (Redmi 9/10, Samsung A12), older tablets on Helio P |
| **mid** | `cores ≤ 6` OR `RAM ≤ 6 GB` | Mid-range 2021–2023 (Redmi Note 11/12, Samsung A34/A54, older iPads) |
| **high** | Capacitor native + `cores ≥ 8` + `RAM ≥ 8 GB` | Flagship mobiles (S22 Ultra, iPhone 14 Pro+, Pixel 8 Pro) |
| **ultra** | **NOT** Capacitor (desktop web) + `cores ≥ 8` + `RAM ≥ 8 GB` | Desktop browsers on capable PCs |

**Auto-detect is unreliable on modern midrange** — Chrome caps
`navigator.deviceMemory` at 8 GB for privacy, and every 2021+ phone
ships 8 cores regardless of SoC class (Vivo V21e Helio G96 auto-classifies
as `high`, wrong). To fix, v154 added:

- **User override via first-run picker** (`PerfTierSelectScreen.tsx`).
  Stored in `localStorage.nebulife_perf_tier` (`simple` | `standard` | `full`
  → mapped to `low`/`mid`/`high`). Takes precedence over auto-detect.
- **Picker shown once on Capacitor native only** (gate:
  `nebulife_perf_tier_chosen !== '1'`). Desktop web always auto-detects
  `ultra` silently.
- **Defaults in picker**: `standard` + English (per HANDOFF §1 — target
  market is EN; Ukrainian is a secondary homage). No "recommended" badge
  — auto-detect is too unreliable to claim a recommendation.
- **Reload after submit** so `getDeviceTier()`'s memoized cache,
  `<html data-perf-tier>` attribute, and the injected kill-switch CSS
  all pick up the new value at module load.

**What each tier disables** (driven by `getExosphereLOD()` +
`main.tsx` global CSS + `shouldRenderNebula()` etc.):

| Layer / feature | low | mid | high | ultra |
|---|---|---|---|---|
| 3D Universe scene during intro | skip | skip | full | full |
| PerfTier picker shown | yes | yes | yes | no (web auto-ultra) |
| Simplified onboarding (no planet bg) | yes | yes | no | no |
| `<html>` kill-switch CSS | yes | yes | no | no |
| Backdrop-filter blur | off | off | on | on |
| Pulse/flash/blink/glow inline CSS anims | off | off | on | on |
| Transition-duration cap 120ms | yes | yes | no | no |
| Nebula sphere (shader) | skip | skip | full | full |
| UnrealBloom post-pass | skip | skip | full | full |
| Cloud layer shader | skip | skip | full | full |
| Atmosphere back mesh (overdraw) | skip | full | full | full |
| Ring (gas giants) | skip | 48 seg | 96 seg | 128 seg |
| Planet sphere segments | 48² | 96² | 128² | 192² |
| Atmosphere front segments | 24 | 24 | 32 | 48 |
| Moon segments + shader | 16² flat | 24² shader | 24² shader | 32² shader |
| Starfield count multiplier | 0.40 | 0.60 | 0.85 | 1.00 |
| Starfield twinkle uTime | frozen | live | live | live |
| Tone-mapping exposure | 1.3× | 1.2× | 1.0× | 1.0× |
| Shooting stars on exosphere | off | off | on | on |
| Auto-rotate (OrbitControls) | off | on | on | on |
| Exosphere RAF cap | 30 fps | 30 fps | vsync | vsync |
| Arena `antialias` + fullDPR | off + 1.0 | on + 2.0 | on + 2.0 | on + 2.0 |
| Arena animated backdrop blur | off | off | 10 Hz | 10 Hz |

Implementation spread across commits 0d29929 (v151 unmount), 9e02ec8
(v152 full-overlay unmount), 555077c (v153 deeper low/mid cuts),
6b9cbb8 (v154 user-override picker).

**Headroom for 'ultra'** — desktop web tier intentionally matches 'high'
today. Reserved for future desktop-only FX (volumetric clouds, SSR,
higher-strength bloom) that would be unrealistic even on S22 Ultra.

---

## 9. API REFERENCE

| Service | Endpoint | Auth | Usage |
|---|---|---|---|
| Kling | `api.klingai.com/v1` | JWT HS256 | Planet photos; status `'succeed'` (no 'd'!), field `imageUrl` camelCase |
| Tripo | `api.tripo3d.ai/v2` | Bearer | 3D models; image → createModelTask → poll → GLB |
| Gemini | Google AI SDK | API key | Lessons/quizzes/digest/ASTRA/moderation; `gemini-3.1-flash-image-preview`, `thinkingBudget: 0` |
| Neon | PostgreSQL | Connection string | All server state |
| Firebase | Auth + FCM | Config | Login + push |

### DB Tables
- `players` (id, name, quarks, game_state, global_index, cluster_id, language)
- `clusters` (group_index, center, player_count, group_seed)
- `chat_messages`
- `weekly_digests`
- `academy_progress` (difficulty, topics, quests, streak)
- `academy_lessons` (lesson_date, topic_id, difficulty, language)
- `reported_messages`
- `idempotency_keys`

---

## 10. CURRENT BALANCE

| Parameter | Value |
|---|---|
| XP curve | `gap(L) = floor(100 * L^1.3)`, L50 = 359,474 XP |
| XP per research | Ring 0-1: 30, Ring 2: 50, Neighbor: 100, Core: 200-500 |
| Session XP | +5 each |
| Research Data start | 100 |
| Ring 2 min progress | 4% (25 sessions worst case) |
| RESEARCH_DURATION_MS | 60,000 (1 min) |
| STARTER_QUARKS | 30 |
| Observatories | L1:3, L12:4, L20:5, L36:6 |
| Speed multipliers | 0.9 × 0.85 × 0.8 × 0.8 = 0.49 at L41 |
| Doomsday countdown | 3600s = 1h = 1 day (intentional) |
| Panorama price | 50⚛ |

### Building economy (v134 fix)
- isotope_collector: 0.25 (was 0.15)
- isotope_centrifuge: 0.4 (was 1.0)
- Refinery guards: `if (colony.resources.X < Y) return produced;`
- Paradise planet guarantees Pt (for genesis_vault endgame)

---

## 11. CRITICAL FILES NAVIGATION

| File | Purpose |
|---|---|
| `packages/client/src/App.tsx` | Root (~5000 lines), state + routing |
| `packages/client/src/game/GameEngine.ts` | PixiJS scene manager, neighbor/core compute |
| `packages/client/src/game/scenes/GalaxyScene.ts` | 2D galaxy (personal + neighbor + core) |
| `packages/client/src/game/scenes/SurfaceScene.ts` | Isometric surface (legacy PixiJS) |
| `packages/client/src/game/UniverseEngine.ts` | 3D galaxy + cluster |
| `packages/client/src/ui/components/hex-surface/HexSurface.tsx` | New SVG surface |
| `packages/client/src/i18n/locales/*.json` | ~970 translation keys |
| `packages/client/src/ui/components/CommandBar/` | Bottom nav |
| `packages/client/src/ui/components/Academy/` | Academy UI |
| `packages/client/src/ui/components/ChatWidget.tsx` | ASTRA + chat |
| `packages/core/src/constants/progression.ts` | XP curve |
| `packages/core/src/constants/balance.ts` | Research/colony/ship |
| `packages/core/src/game/research.ts` | `canStartResearch()`, `completeResearchSession()` |
| `packages/core/src/game/tech-tree.ts` | 50 nodes, `getEffectValue()` |
| `packages/core/src/generation/` | Galaxy/system/Delaunay/core gen |
| `packages/server/src/db.ts` | Neon CRUD (~1700 lines) |
| `packages/server/src/cluster-manager.ts` | Cluster lifecycle |
| `packages/server/src/education-generator.ts` | Gemini prompts |
| `packages/server/src/kling-client.ts` | Kling API wrapper |

---

## 12. GAME BIBLE KEY RULES

- **Font:** ONLY `monospace`
- **Colors:** ONLY from Game Bible palette (dark space, muted tones)
- **No emoji** in code/UI
- **All procedural** via PixiJS Graphics API (no textures/sprites)
- **i18n:** never hardcode text, add to `locales/uk.json` + `locales/en.json`
- **Determinism:** one seed → identical result via SeededRNG
- **60fps:** static geometry rendered once, per-frame only positions/alpha
- **Parallax backgrounds FORBIDDEN** — conflicts with CameraController
- **DB migrations:** NEVER API endpoints, only SQL for Neon SQL Editor
- **Deploy:** push only to `main`

### Color palette
- Deep space: `#020510`
- Panel bg: `rgba(10,15,25,0.92)`
- Primary text: `#aabbcc`
- Secondary: `#8899aa`
- Muted: `#667788`
- Primary border: `#334455`
- Active border: `#446688`
- Life green: `#44ff88`
- Warning orange: `#ff8844`
- Danger red: `#cc4444`
- Accent blue: `#4488aa` / `#7bb8ff`

---

## 13. LAUNCH CHECKLIST

### Android (Google Play)
- [x] Signed AAB with upload keystore
- [x] versionCode 141
- [ ] Upload to Closed Testing
- [ ] 14 days × 12+ testers (Google requirement)
- [ ] Screenshots (phone: 1080×1920 min, 7" tablet optional)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Content rating questionnaire
- [ ] Target audience & content
- [ ] Data safety form
- [ ] Privacy policy URL
- [ ] Support email
- [ ] IARC certificate
- [ ] Ads declaration
- [ ] IAP setup (5 products)
- [ ] Production release

### iOS (App Store Connect)
- [x] Xcode build + upload to TestFlight
- [x] App Information
- [x] Pricing & Availability
- [x] IAPs (5 products) + localization
- [x] Screenshots (6.9" + 6.5" iPhone)
- [x] App Review Information
- [x] Content Rights + IDFA
- [x] Offer Codes (Launch_Promo_2026_Q2)
- [ ] Submit for Review
- [ ] Respond to rejections (if any)

### Marketing
- [ ] Threads transitional post
- [ ] Telegram devlog channel setup + first post
- [ ] Telegram testers group + welcome pinned
- [ ] Testers recruiting post (Day +3)
- [ ] Press kit (MD + screenshots folder)
- [ ] Landing page update (if applicable)

---

## 14. PROHIBITED ACTIONS

- НЕ пушити в main без явної команди від Сергія
- НЕ створювати API endpoints для DB міграцій
- НЕ додавати Capacitor plugins в Vite external
- НЕ повертати Capacitor plugin proxy з async функції
- НЕ хардкодити UI тексти (тільки через i18n)
- НЕ використовувати emoji в коді/UI
- НЕ використовувати sans-serif/serif шрифти
- НЕ запускати parallax backgrounds
- НЕ забувати bump versionCode перед Play upload

---

## 15. DEFERRED / LATER

### Post-launch features
- Weekly Digest (Gemini AI news + bilingual images) — реалізовано
- UGC marketplace (discoveries trading)
- PvP Arena expansion (current is auto-aim, refactor to twin-stick pending)
- Deep Core endgame (Level 35-50) balance
- Meta-progression across clusters

### Infrastructure
- Move from manual migrations to schema versioning
- Add error tracking (Sentry or similar)
- CDN for Kling/Tripo assets caching
- Background jobs for cluster cleanup

### Marketing (month 2+)
- Discord server (create when community > 500)
- YouTube devlog (if time permits)
- Reddit r/IndieDev post (when trailer ready)
- Press outreach via kit

---

## 16. MODEL ROUTING (for Claude sessions)

| Task | Model |
|---|---|
| Planning, architecture, Plan-agents | **opus** |
| Code writing, web search, image analysis | **sonnet** |
| Quick file search, simple queries | **haiku** |

When launching Agent tool — always specify `model` param.

---

## 17. AUXILIARY DOCS

| Path | Content |
|---|---|
| `GAME_BIBLE.md` | Authoritative design doc (read before ANY change) |
| `GAME_DESIGN.md` | Narrative, mechanics, physics |
| `CLAUDE.md` (root) | Per-project Claude instructions |
| `/Users/sergijpastusok/.claude/projects/.../memory/MEMORY.md` | Persistent cross-session memory |
| `/Users/sergijpastusok/.claude/plans/nebulife-ios-launch.md` | iOS launch plan (V-10...V-13 localization/Offer Codes/Review Info/Content Rights) |
| `/Users/sergijpastusok/.claude/plans/sprightly-toasting-platypus.md` | iOS launch v2 (reconciled) |
| `/Users/sergijpastusok/.claude/plans/harmonic-finding-whisper-agent-*.md` | Arena twin-stick refactor plan |
| `/Users/sergijpastusok/.claude/plans/vectorized-waddling-prism.md` | Low-end perf plan (Phase A/B/C/D — mostly shipped v141) |

---

*Last updated: Apr 21, 2026. Revision: v1.1 — added section 8 "Low-end Android perf batch" + sanitized section 3.3 (no plaintext passwords).*
