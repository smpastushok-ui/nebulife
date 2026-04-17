# TODO — Nebulife (зведений план)

Організовано за пріоритетом. Кожен блок має посилання на стовп (з 6 в §0.3) і вектор (A-G з §0.4) у Game Bible.

---

## 🔥 P0 — БЛОКЕРИ (робимо першими)

### 0.1 · Ring 2 popup bug (можливо вже фіксится новим APK)
- [ ] Підтвердити після rebuild: попап RadialMenu з'являється на Ring 2 зірках (researched + in-progress)
- [ ] Якщо ще буде — скрін від user для diagnose

### 0.2 · First-photo-as-hook — перевірити що ще працює
- [ ] `api/surface/generate.ts` — перевірити що перша планета реально **безкоштовна** (без списання)
- [ ] Onboarding text/voiceover: "через 60 сек у тебе буде фото"
- [ ] Share card generator після першого фото (OG image)
- [ ] Fallback якщо Kling API помер — показати retry, не списувати

---

## 🚀 P1 — VECTOR A: Video-Missions (цільова revenue #1, 45%)

**Pillar**: LIVING + SCALABLE CONTENT · **Вектор**: A

- [ ] **Server: video pipeline**
  - [ ] `packages/server/src/video-client.ts` — новий клієнт (Veo або Runway API)
  - [ ] `packages/server/src/video-prompt-builder.ts` — бере `planet + event + player context`, формує scene prompt для Gemini
  - [ ] Gemini step: text → 3-line narrative
  - [ ] Veo/Runway step: narrative + event image → 15s mp4
  - [ ] TTS step: narrative → voiceover (ElevenLabs або Google Cloud TTS)
  - [ ] Vercel Blob upload для mp4 + cover image
  - [ ] DB: `video_missions` таблиця (id, player_id, planet_id, event_type, rarity, video_url, status, quarks_paid)
- [ ] **API endpoints**
  - [ ] `POST /api/video/generate` (cost 20⚛/35⚛ legendary)
  - [ ] `GET /api/video/status/:id` polling
  - [ ] `GET /api/video/list?playerId=` — player's expeditions
- [ ] **Client UI**
  - [ ] `SystemMissionButton` → оновити для video (зараз там mission placeholder)
  - [ ] `VideoMissionPlayer.tsx` — fullscreen modal з mp4 + narrative overlay
  - [ ] Share button → OG card з первим кадром + "Моя експедиція"
  - [ ] Collection page у PlayerPage → вкладка "Експедиції"
- [ ] **Monetization tracking**
  - [ ] RevenueCat event "video_generated"
  - [ ] Analytics: D1/D7 % користувачів які зробили 1+ video

**Очікуваний імпакт**: +45% до загального ARPDAU, TikTok organic reach.

---

## 🎯 P1 — VECTOR F: First-60-seconds Onboarding

**Pillar**: LEARNING + LIVING · **Вектор**: F

- [ ] **Cinematic intro**
  - [ ] Заміна language-select на mini-cinematic 10-15 сек
  - [ ] Voiceover (TTS, pre-recorded): "Твоя планета. 7 днів до катастрофи. Знайди нову домівку."
  - [ ] Фон: твоя домашня зірка починає згасати
- [ ] **First discovery moment**
  - [ ] Перший Kling photo автогенерується при loading (не чекаємо action)
  - [ ] Reveal animation: noise → photo
  - [ ] Тост: "Ти перший, хто побачив цю зірку" (unique id + datetime)
- [ ] **Tutorial через discovery**
  - [ ] Ring 1 позначено "починаємо тут"
  - [ ] Перший click → повільна камера orbit, показ UI елементів через callout
  - [ ] Tip-of-day inline (не з попапом)
- [ ] **KPI target**: D1 retention 25% → 45%+

---

## 🧬 P2 — VECTOR B: Life-Form Generation

**Pillar**: LEARNING + AI-AS-PRODUCT + SOCIAL · **Вектор**: B

- [ ] **DNA parameter UI**
  - [ ] Side panel при дослідженні habitable планети
  - [ ] Slider-и: metabolism type, size, ecosystem complexity, environment adaptation
  - [ ] Preview pokaz з Kling при зміні
- [ ] **3-rarity tier system**
  - [ ] `common` (60% results, 5⚛) — одноклітинні, bacteria-like
  - [ ] `rare` (30%, 15⚛) — мульти-клітинні, екосистеми
  - [ ] `legendary` (10%, 40⚛) — sapient / exotic physics
  - [ ] Rolled at generation time за вагою habitability params
- [ ] **Server**
  - [ ] `api/life/generate` endpoint
  - [ ] Gemini prompt для "creature description" з DNA + planet context
  - [ ] Kling з описом → photo
  - [ ] DB `life_forms` таблиця
- [ ] **Display in Gallery**
  - [ ] Нова вкладка "Life Forms"
  - [ ] Rarity badges (common grey / rare blue / legendary gold)
  - [ ] Share button

**Залежність**: Marketplace в Vector E залежить від цього (P2P trade rare/legendary).

---

## 🎰 P2 — Re-roll Loop / Collector Mechanics (§0.4-bis)

**Pillar**: AI-AS-PRODUCT + LIVING · **Вектор**: — (cross-cutting)

- [ ] **Rarity tiers для events**
  - [ ] Додати поле `rarity: 'normal' | 'rare' | 'legendary'` до кожного event type
  - [ ] UI badge у gallery list
- [ ] **Anti-fatigue guards**
  - [ ] 30-секундний cooldown між re-roll одного slot
  - [ ] Pro-perk "Save both" (2 фото на slot для підписників)
- [ ] **Achievement badges**
  - [ ] "Collector" — 10+ legendary у gallery
  - [ ] "Completionist" — всі normal events заповнені
  - [ ] "Speed runner" — заповнив 5 slots за годину
- [ ] **Share card generator**
  - [ ] OG image endpoint `/api/share/planet/:id` → PNG з photo + planet name + referral code
  - [ ] Link preview для Telegram/Discord/Twitter

---

## 🚀 P2 — Tripo Pivot (planet-3D → ship-3D)

**Pillar**: AI-AS-PRODUCT + SOCIAL · **Вектор**: E

### Server
- [ ] `packages/server/src/tripo-client.ts` — `buildShipPrompt(role, style)` з 5 ролей × 5 стилів
- [ ] DB міграція: `planet_models` → `ship_models` (додати `role`, `style` колонки)
- [ ] `api/tripo/generate.ts` — приймає `{role, style}` замість `{planetId}`
- [ ] `api/models` — повертає ship list

### Client
- [ ] Rename `Planet3DViewer.tsx` → `Ship3DViewer.tsx`
- [ ] Видалити "3D" кнопку з `PlanetViewScene` / `CommandBar.planet`
- [ ] Додати "Generate ship" кнопку в `HangarPage` (role/style selector)
- [ ] `ArenaEngine` — заміна default ship mesh на player GLB
- [ ] Babylon.js viewer — без змін, тільки URL інший

### Wiring
- [ ] QuarksTopUpModal — "3D ship design" замість "planet"
- [ ] i18n uk/en — оновити ключі
- [ ] Gallery / Characteristics — прибрати 3D model з planet UI

### Cleanup
- [ ] Delete `Planet3DViewer.tsx` після rename
- [ ] Delete `planet_models` table (2 тижні backup)

---

## 📰 P3 — VECTOR C: Weekly Digest Premium

**Pillar**: LEARNING + LIVING · **Вектор**: C

- [ ] **Push cron** (вже є `/api/cron/moderate`, треба додати digest)
  - [ ] Cron щопонеділка 10:00 UTC
  - [ ] FCM notification всім MAU
- [ ] **Share card для digest**
  - [ ] OG image з hero photo
  - [ ] TG/Discord preview test
- [ ] **Premium illustrations** (5⚛ unlock)
  - [ ] Bilingual hero art замість generic stock photo
- [ ] **Stats**
  - [ ] Open rate tracking
  - [ ] Target: 60% MAU до Q3

---

## 🎓 P3 — VECTOR D: Academy Deep-dive

**Pillar**: LEARNING · **Вектор**: D

- [ ] **Daily lesson streak**
  - [ ] 7-day streak: +50⚛
  - [ ] 30-day: exclusive tech node preview
  - [ ] 100-day: custom star name 25⚛ worth
- [ ] **Adaptive difficulty**
  - [ ] Track player performance per topic
  - [ ] Gemini prompt використовує `difficulty` + `topic_history`
- [ ] **Deep-dive lessons** (3⚛ кожен, Pro unlock all)
  - [ ] 20+ topics для launch
  - [ ] Quiz after each with gems reward
- [ ] **NASA API integration**
  - [ ] Astronomy Picture of the Day → як daily hook
  - [ ] JWST releases → video missions source

---

## ⚔️ P4 — VECTOR E: Clans + Territory (Q3 2026)

**Pillar**: SOCIAL + AI-AS-PRODUCT · **Вектор**: E

- [ ] **Clan creation UI** (cluster = natural clan boundary)
  - [ ] Leader election (vote in Player page)
  - [ ] Clan banner (30⚛ AI-gen)
  - [ ] Member roster
- [ ] **Territory control**
  - [ ] Core zone assignment до clan з most collective research
  - [ ] Passive resource bonus
  - [ ] Raid/defense mechanics
- [ ] **P2P Marketplace**
  - [ ] Listing UI для rare artifacts (life-forms, ship models, legendary events)
  - [ ] 10% fee для game economy
  - [ ] Neon DB transactions з idempotency
- [ ] **Clan Pro subscription**
  - [ ] 99⚛/міс leader perks
  - [ ] 2× territory bonus
  - [ ] Custom clan emblem AI-gen

---

## 💰 P1 — МОНЕТИЗАЦІЯ (поточні ціни ще не всі реалізовані)

Ціни з §11.2 Bible:

### Реалізовано ✅
- [x] AI поверхня перша — безкоштовно
- [x] AI поверхня наступні — 10⚛
- [x] Поповнення через MonoPay
- [x] Кварки баланс у CommandBar

### Не реалізовано ❌
- [ ] **Starter wallet 50⚛** при реєстрації
- [ ] **Daily rewards** 1-3⚛ за login
- [ ] **Quiz reward** 2⚛ per pass
- [ ] **Pro subscription 100⚛/міс** (RevenueCat product)
- [ ] **Rewarded ad +5⚛** (до 5 разів/день, AdMob)
- [ ] Video mission 20⚛ / 35⚛ legendary (залежить від Vector A)
- [ ] Life-form 5/15/40⚛ (залежить від Vector B)
- [ ] Ship 3D 49⚛ (залежить від Tripo pivot)
- [ ] Custom star name 25⚛
- [ ] Weekly Digest premium art 5⚛
- [ ] Academy deep-dive 3⚛
- [ ] Clan banner 30⚛
- [ ] Marketplace 10% fee

---

## 🚀 P2 — VECTOR G: Mobile Performance

**Pillar**: — (infra) · **Вектор**: G

### Вже зроблено ✅
- [x] Pause ticker on visibilitychange
- [x] Destroy UniverseEngine on view toggle
- [x] 30 FPS throttle для idle scenes
- [x] Tier 3 hide container
- [x] Vector3 pool в UniverseEngine
- [x] UniverseEngine stars 260→80
- [x] AdMob lazy-init
- [x] Chat polling 3s→5s
- [x] Push-digest event listener cleanup
- [x] Lazy scanArc/atomOrbit + reduced circle counts

### Залишилось ❌
- [ ] **Graphics <150 MB** (було 360, зараз 274 — ще -80MB треба)
  - [ ] InstancedSprite або batched Graphics для 1450 stars (потенціал -60MB)
  - [ ] Verify Tripo ship GLB зміни cache size
- [ ] **Bundle <1.5 MB** (зараз 2.5 MB)
  - [ ] `build.rollupOptions.output.manualChunks` для pixi/three/babylon/firebase/i18n
  - [ ] Lazy-load arena/surface scenes (dynamic import)
  - [ ] Tree-shake неиспользуемих icons/компонентів
- [ ] **Battery ≤6%/год** (target)
  - [ ] Auto-pause loop при battery <20%
  - [ ] Low-power mode toggle в settings
- [ ] **60 FPS Samsung S22+ / Pixel 6**
  - [ ] Reduce animation complexity для Galaxy tier 1 stars
  - [ ] Skip atom orbit для dist > threshold
- [ ] **WebGL texture warnings 16-31**
  - [ ] Pin texture units у PixiJS init (шум логів)

---

## 🐛 P2 — АКТИВНІ БАГИ

- [ ] **"[object Object]" Line 330 console spam** — знайти джерело (якийсь плагін або console.error(obj) без stringify)
- [ ] **116 → 134 threads** після Round 1 оптимізацій — перевірити що додалось
- [ ] **Ship HMR jump** при transition (dev-only, low priority)
- [ ] **Ring 2 popup iноді не відкривається** — потребує user відео/скрін для repro

---

## 📱 P3 — PLATFORM / INFRA

### iOS ready for launch
- [ ] Google Sign-in iOS (`Info.plist` CFBundleURLSchemes + AppDelegate.swift)
- [ ] Firebase iOS Bundle ID + SHA
- [ ] TestFlight internal testing

### Android Play Store
- [ ] Release keystore SHA-1 у Firebase Console + Google Cloud Console
- [ ] Play Console listing (screenshots, description)
- [ ] Privacy Policy URL (обов'язкова з 2024)
- [ ] Data Safety form
- [ ] Internal testing via Play Console

### Push Notifications native
- [ ] `npm install @capacitor/push-notifications`
- [ ] Native push service (замість web FCM на Android)
- [ ] AndroidManifest: `POST_NOTIFICATIONS` + FCM service
- [ ] Повторно увімкнути push toggle у PlayerPage

---

## 🧹 P4 — TECH DEBT

- [ ] `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` → stable коли вийде
- [ ] `@capacitor/core` версія audit (`npm ls @capacitor/core` має показати одну версію)
- [ ] **Dynamic imports консистентно**: `@capacitor/app`, `@capacitor-community/admob` зараз і static, і dynamic — вибрати одне
- [ ] **Unit tests**:
  - [ ] `resolveApiUrl` (native prefix logic)
  - [ ] `isGoogleSignInAvailable`
  - [ ] `canStartResearch` з різними maxRingOverride
- [ ] **E2E tests**:
  - [ ] Registration → email
  - [ ] First planet photo generation
  - [ ] Research session completion
- [ ] **CORS middleware integration test** у CI
- [ ] Cleanup:
  - [ ] MainActivity може прибрати явний `registerPlugin(GoogleAuth.class)` (capacitor autoregister)
  - [ ] Видалити закомічені PNG/WebP building/tile assets (деякі в main як deleted але не pushed)

---

## 📢 P3 — MARKETING / GO-TO-MARKET

- [ ] **App Store screenshots** (5 slides) — before/after star→Kling photo
- [ ] **TikTok short** (30s): gameplay → reveal → share prompt
- [ ] **Landing page hero**: "Твоя зірка. Крутіше за NASA. Безкоштовно."
- [ ] **Press kit** (1-page PDF + screenshots + GIF demo)
- [ ] **Discord server** для early community
- [ ] **Referral program** — +10⚛ obом за invite який зареєструвався
- [ ] **Soft launch Ukraine** (TestFlight/Play Beta) перед worldwide

---

## 📝 ДОВІДКА

**Поточні credentials:**
- Google OAuth Web Client: `702900049376-e7k1574lfpjri29a9j3kde7pmio68h0a.apps.googleusercontent.com`
- AdMob App ID: `ca-app-pub-3504252081237345~9129352922`
- Production domains: `nebulife.space`, `www.nebulife.space`, `*.vercel.app`

**SHA-1 в google-services.json (Android `app.nebulife.game`):**
- `b5e78aa2fff9828f7e9884c86718cfaebaabf3d5`
- `dfce69c9511bae1ed123bf825b31ebfcd7e61611`
- `330602a08c265d306a7ebacae94d5e5e6fa2e505`

**Release keystore:**
- Path: `nebulife-release.keystore` (корінь проекту)
- Password: `nebulife2026` (key + store)
- Alias: `nebulife`

**Vercel:**
- Team: woodoo
- Project: nebulife (`prj_IUHhdqjmKK4j5ycMjffOMiYFCcVb`)
- Primary domain: `www.nebulife.space`

**Neon PostgreSQL connection** — в `.env.local` (VITE_*) та Vercel env.

---

## 🎯 РЕКОМЕНДОВАНИЙ ПОРЯДОК ВИКОНАННЯ

**Наступні 2 тижні (sprint):**
1. P0 — Ring 2 popup + first-photo-as-hook (швидко)
2. P1 — Vector F onboarding (critical for D1 retention)
3. P1 — Starter wallet 50⚛ + daily rewards (critical для активації)

**Місяць наступний:**
4. P1 — Vector A video-missions MVP (45% target revenue)
5. P2 — Vector G performance optimizations
6. P2 — Tripo pivot (ship generation)
7. P2 — Re-roll rarity + share cards

**Місяць за тим:**
8. P3 — Vector C Weekly Digest premium + push
9. P3 — Vector D Academy streaks + deep-dive
10. P3 — Marketing materials + Soft launch Ukraine

**Q3:**
11. P4 — Vector E clans + territory + marketplace
12. P4 — P2P trade + clan Pro subscription
13. P4 — iOS launch
