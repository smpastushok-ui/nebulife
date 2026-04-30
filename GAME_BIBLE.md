# Nebulife — Game Bible

> Настільна книга-орієнтир для розробки. Перед будь-якою правкою — звіряйся з цим файлом.
> Оновлювати при кожній суттєвій зміні в механіках, візуалі чи UI.

---

## 0. Стратегічне позиціонування (оновлено квітень 2026)

### 0.1 Одне речення

**Nebulife — це жива галактика-підручник з AI-генерованим контентом, де гравці колоніями (по 50) досліджують власний кластер з 1 450 зірок і навчаються справжній астрономії через квести, відео-експедиції та щотижневий космічний дайджест.**

### 0.2 Не "ще одна космічна гра". Це нова підкатегорія:

> **Living Galaxy — AI-generated learning MMO**

Раніше такого не існувало. Поєднання:

| Фіча | Чому унікально |
|---|---|
| 🎬 **AI video-mission generation** | Жодна mobile-гра не генерує відеоподії на льоту |
| 🧬 **DNA-рівнева генерація життя** | Spore (2008) desktop-only, без AI. Nebulife — mobile, з Gemini |
| 📰 **Weekly Digest з реальних новин NASA/ESA/JWST** | Edu-content всередині гри, Gemini-bilingual |
| 🎓 **Academy: справжня астрономія** | Вікторини + факти + lessons, адаптивна складність |
| 👥 **Auto-scaling clusters (50 гравців → новий кластер)** | Deterministic seed + PostgreSQL advisory locks |
| ⚛️ **Determinism + fair MMO** | Один seed = однакова галактика для всіх |

### 0.3 Шість стовпів (pillars). Кожна фіча має підсилювати хоч один:

1. **LIVING** — щось у грі змінюється щодня/щотижня без потреби в оновленнях (AI-generated contents).
2. **LEARNING** — гравець виходить з гри з новим знанням з астрономії/фізики/біології.
3. **DETERMINISTIC** — fair-play через спільний seed; неможливо "купити кращий всесвіт".
4. **SOCIAL** — кластер 50 гравців — це неявна гільдія; clans/trade/PvP згодом — явна.
5. **SCALABLE CONTENT** — AI пайплайн (Kling + Tripo + Gemini + video) = infinite content без росту art-team.
6. **AI-AS-PRODUCT** — AI-генерований артефакт (фото планети, 3D модель, відео-експедиція, унікальне життя) це **товар що гравець купує і володіє**. Кожен такий артефакт має прямий ціннік у кварках, прив'язаний до вартості AI API + маржа. Це **основна монетизація**, реклама — допоміжна.

### 0.4 Стратегічні вектори розвитку (Q2-Q3 2026)

Усі робочі спринти мають **прямо служити одному з цих векторів**. Якщо фіча не лягає в жоден вектор — її **не робимо**.

#### 🎬 Вектор A — "Video-mission as the killer feature"
- Постачальник: Gemini (сценарій) + Veo/Kling/Runway (відео) + TTS (озвучка) + Gemini (скоротити).
- Мета: Кожна планетарна експедиція = унікальне 15-30 сек відео з описом події.
- Loop: гравець дослідив планету → відправив mission → отримав video → shared-moment ("ЦЕ трапилось на моїй планеті!") → organic growth у TikTok/Reddit.
- Первинний KPI: **% гравців що зробили хоч 1 експедицію за сесію** (мета 40%+).

#### 🧬 Вектор B — "Life generation as gameplay loop"
- DNA parameters → environment fit → procedural creature → Kling photo.
- Від "одноклітинних" до "складних екосистем" — progression через tech-tree chemistry→biology.
- Кожна унікальна life-form має ID та може бути shared / traded (foundation для економіки).
- Мета Q3: 3-rarity tier-система (common/rare/legendary), marketplace mvp.

#### 📰 Вектор C — "Weekly Digest як re-engagement crown jewel"
- Generates every Monday via cron. Push-notification всім гравцям.
- 3-5 новин з тижня + AI illustrations + quiz.
- Сторінка digest має "share card" (OpenGraph image) — бажано щоб гравець розіслав друзям.
- Мета: D7 retention 20%+ через автоматичне нагадування тижневе.

#### 🎓 Вектор D — "Academy як educational moat"
- Адаптивна складність, теми синхронізовані з фактичним progress гравця.
- Щоденний урок з quiz (+10 кварків).
- Streak-bonuses: 7 days → +50, 30 days → exclusive tech node preview, 100 days → custom star name.
- Партнерства з NASA Open API, ESA media, space.com (під ліцензією).
- Мета: family-friendly rating → батьки дозволяють дітям → organic schools market.

#### ⚔️ Вектор E — "Clans + territory control" (Q3)
- Cluster = natural clan (50 гравців). Dopuscaćме можливість leader elections.
- Territorial control: alliance контролює core zone → passive resource bonus.
- PvP: arena вже live (L50+), expand у territorial defense.
- PvE: Carrier Raid як другий Hangar-режим — 1 гравець + 4 AI wingmen проти носія, модулів і хвиль дронів.
- Trade: marketplace для rare life-forms, AI-photos, 3D models.
- Мета: ARPU ×5 через premium clan subscriptions ($4.99 → leader perks).

#### 🎯 Вектор F — "First-60-seconds onboarding refactor"
- Current churn killer. Після language-select — провали 50%+.
- Замінити на cinematic intro з voice-over: "Твоя планета, 7 днів, знайди нову домівку".
- Tutorial не "перелік UI", а DISCOVERY: перші 60 сек гравець знаходить УНІКАЛЬНУ planet + dostaje notif "ти перший хто її дослідив у цьому всесвіті".
- Мета: D1 retention з 25% → 45%+.

#### 📱 Вектор G — "Mobile performance & polish"
- Поточні GPU 274MB (було 360), треба <150MB.
- Bundle 2.5MB → <1.5MB через lazy-load scenes.
- Заряд батареї: ≤6%/година (зараз ~10%).
- 60fps стабільно на Samsung S22+ / Pixel 6+.
- Мета: **Play Store rating 4.3+ з коментарів "плавно, не гріє".**

### 0.4-bis Монетизація: AI-артефакти як товар

**Ієрархія джерел доходу** (за очікуваним внеском у ARPDAU):

| # | Джерело | Середня ціна за подію | Частка в ARPDAU (ціль) | Вектор |
|---|---|---|---|---|
| 1 | 🎬 **Video-mission** (Gemini + Veo/Kling) | 20 ⚛ | ~45% | A |
| 2 | 🧬 **Life-form generation** (DNA + Kling photo) | 15 ⚛ | ~20% | B |
| 3 | 📸 **AI-фото поверхні планети** (Kling) | 10 ⚛ | ~15% | — (вже є) |
| 4 | 🚀 **3D-модель корабля** (Kling concept + Tripo GLB) | 49 ⚛ | ~10% | E |
| 5 | 🏆 **Clan subscription** (leader perks) | 99 ⚛/міс | ~5% | E |
| 6 | 📺 **Rewarded ads** (AdMob) — поповнення +5⚛ | — | ~3% | G |
| 7 | 🛍️ **Marketplace fee 10%** (P2P trade) | — | ~2% | E |

> ⚠️ **Tripo-для-планет відключено** (квітень 2026): 3D-моделі планет від Tripo виходять занадто стилізованими/неточними — поганий cost/quality для $0.50 API. Планети залишаються тільки як **AI-фото** (Kling) + процедурна рендер SystemScene + Babylon.js viewer для фото.
>
> **Tripo перенаправлено на кораблі** (ships): гравець генерує унікальний дизайн свого флагмана / арена-корабля / clan flagship. Pipeline: Gemini-prompt за "role + style" → Kling concept-art → Tripo GLB. Цільова якість: 1-3k полігонів, GLB, використовується у ArenaEngine (3D) та як preview у HangarPage / PlayerPage.

**Ключова логіка цін**: ціна гравцю = **AI API cost × ~5-10**.
- Kling photo ≈ **$0.20 API** (≈ 8 ₴) → 10⚛ гравцю (≈ 10 ₴) → margin ~20% (мала бо це **hook-продукт**)
- Veo 15 сек відео ≈ $0.50 API → 20⚛ → margin 60-65%
- Tripo ship model ≈ $0.50 API → 49⚛ → margin 75%
- Gemini text ≈ $0.002 → безкоштовно (bundle з video/photo)

### 🎁 First-photo-as-hook (ключова стратегія залучення)

**ПЕРША Kling-генерація гравця — ЗАВЖДИ безкоштовна.**

Це не "teaser з watermark". Це **повний продукт топ-якості**:
- Та сама Kling v2.1 Master
- 2K 16:9
- Збереження у персональній галереї гравця
- Share-ready

**Quality bar**: кожне фото має виглядати **краще за PR-візуалізації NASA/ESA**.
Референс який ми прийняли: Red Supergiant HIP-90985 (17/04/2026) —
фотореалістична поверхня з конвективними гранулами, variable brightness,
природне динамічне освітлення. Якщо згенеровано гірше — скинути й повторити.

**Собівартість hook**: ~$0.20 (≈ 8 ₴) за unique signup. Це **дешевший CAC** ніж
будь-яка реклама в Facebook Ads / Google UAC (середній CAC mobile-гри $2-8).
Плюс hook **сам виконує funnel step "activation"**:
1. Фото топ-якості → emotional attachment до своєї планети/зірки
2. Бачить "у мене є таке, ніхто більше не має" → посягає поділитись
3. Через 2-3 досліджених зірки хочеться побачити їх фото → купує за 10⚛
4. Starter wallet (20⚛) дозволяє 2 додаткових фото → після цього upsell до MonoPay/Pro

**Маркетинговий наратив**:

> **"Твоя зірка. Крутіше за NASA. Безкоштовно. Бо ти її перший відкрив."**

Використовуємо в:
- App Store screenshots #1-2 (before/after: star dot → Kling photo)
- Onboarding voiceover (перед першим фото: "через 60 сек у тебе буде фото зірки якої не бачив ніхто")
- Landing page hero
- TikTok short: 30 сек gameplay → **reveal** фотки → share prompt
- Share card після генерації (OG image для Telegram / Discord)

**Конверсія hook → paying** (target funnel):
```
Install  →  Free first photo (60 сек)  →  "Wow"  →  Explore 2-3 inne stars  →
"Хочу побачити ЦЮ зірку теж"  →  Starter wallet (20⚛ free = 2 photos)  →
Total day-1 artifacts: 3 (1 home free + 2 зі starter)  →
"Хочу ще" → MonoPay $2-5 або Pro 100⚛/міс
```

**CAC / LTV math**:
- CAC: $0.20 Kling API per signup
- Target free→paying conversion: 15%
- Adjusted CAC/paying-user: $1.33
- ARPU: $0.15/день (Q2 target) × 30 days retained = $4.50
- Adjusted LTV with D30 retention 8%: ~$15
- **LTV / CAC ≈ 11x** — excellent unit economics for a mobile game

### 🎰 Re-roll loop (collector monetization)

**Кожна генерація тієї ж події — унікальна**. Kling дає **різний** результат навіть з тим самим prompt-ом (noise, seed variance). Це основа для **колекціонерської** монетизації.

**Gallery механіка** (вже частково реалізована):
- 1 тип події (`Spectroscopic Binary`, `Red Supergiant`, `Pulsar`, `Black Hole Jet`, …) = **1 слот** у колекції гравця
- Кожен слот зберігає **фото яке гравець сам вибрав** (не останнє згенероване)
- При повторній генерації — **compare UI**: CURRENT vs NEW → `Replace with new` / `Keep old`
- Див. референс скрін (квітень 2026): Spectroscopic Binary `13/04 vs 17/04` — обидва сайз-by-сайз, дві кнопки

**Як це заробляє**:
1. Гравець каже "мені не сподобалось це фото" → **купує ще одну генерацію 10⚛**
2. Motivation сильніше ніж first-time gen (бо вже знає якість Kling)
3. Колекція → pride → re-roll з ціллю "ідеальної версії"
4. 20+ слотів × середньо 2-3 re-rolls = **40-60⚛ на active collector'а**

**Power users — колекціонери відео-експедицій**:
- Відео-місії (15-30 сек) стають головним об'єктом колекціонування у top 5% гравців
- Вони скуповують 10-30 відео-місій на місяць (200-900⚛ = ~$5-25/міс на гравця)
- Кожна експедиція унікальна: **дата + планета + rarity tier + унікальний ID** — це "номерні цифрові артефакти"
- Collection showcase: сторінка гравця "Мої експедиції" у хронологічному порядку
- **Фундамент для маркетплейсу** — див. нижче

### 🛍️ Торгівля колекціями (P2P marketplace, Q3 2026)

**Концепція**: гравці обмінюють/продають унікальні AI-артефакти за кварки. Створює повноцінну вторинну економіку, де артефакти мають trade value окрім primary purchase.

**Що можна продавати** (приблизні ціни на secondary market):

| Тип артефакту | Ціна на marketplace | USD equivalent |
|---|---|---|
| 🎬 Відео-експедиції (legendary) | 50-200⚛ | $1.25-5 |
| 🧬 Life-forms (legendary) | 80-300⚛ | $2-7.50 |
| 📸 Унікальні Kling-фото (legendary events) | 20-80⚛ | $0.50-2 |
| 🚀 Ship 3D (rare styles) | 100-400⚛ | $2.50-10 |
| 🏷️ Custom star names | 50-100⚛ | fixed |

**Механіка трейду**:
- **Listing**: гравець викладає артефакт з власною ціною
- **10% комісія гри** (revenue stream #7 у таблиці §0.4-bis)
- У metadata артефакту залишаються: `unique ID`, `original discoverer`, `discovery timestamp`, `previous owners` — історія ownership прозора
- Покупець отримує право **використовувати** артефакт (gallery, wallpaper, share), але **original discoverer** назавжди задокументований
- Це справжній **digital collectible без web3-хайпу** — просто game DB + ownership transfers

**Чому це revenue multiplier для нішевої аудиторії**:
- Power user купує 10 video-missions/міс → витрачає 200⚛ = ~$5
- З marketplace: цей же user **купує 5 + продає 3 legendary за 150⚛ сумарно** → гра отримує **15⚛ комісії + user усе одно витрачає $5 на новий контент**
- Net ефект: **retention ×2** (collecting motivation), **revenue той самий** + комісії

**Softlaunch послідовність**:
1. Q2: 3-rarity tier для всіх артефактів (prerequisite)
2. Q2 кінець: Gallery share + watermarks на всіх артефактах (prerequisite — без them marketplace = piracy)
3. Q3 початок: Marketplace MVP (listing + browse)
4. Q3 середина: Trade history + "Top Collectors" leaderboard
5. Q3 кінець: Clan "trophy rooms" (клан колективно володіє legendary артефактами)

**Rarity-тipр подій** (для різної retention-мотивації):
- **Normal** (60% подій): 1-2 re-rolls очікується, прийнятна перша
- **Rare** (30%): 2-4 re-rolls типово, деякі як wallpaper
- **Legendary** (10%: Wolf-Rayet, neutron-merger, magnetar, black-hole-jet): колекціонерський трофей, 5-10 re-rolls, social share

**Anti-fatigue guards** (щоб re-roll не перетворився на gambling):
- Cooldown 30 сек між re-roll того самого slot (stream-of-bad-rolls frustration → ні)
- **"Save both" option для Pro-subscribers**: замість 1 slot → 3 slots на подію
- Gallery badges: `Collector` (10+ legendary) / `Completionist` (усі normal заповнені)
- НЕ gambling механіка: гравець ЗАВЖДИ отримує фото, просто вибирає чи замінити старе. Немає "loss" моменту.

**Share-ability як organic growth loop**:
- Кнопка `Share` у Gallery detail → OG card "Look at MY Spectroscopic Binary" з referral link
- TikTok format: "ось моя колекція космосу" (30s карусель з 10 фото)
- Фіча **вижне сама собою** без ad spend — кожен гравець свій маркетолог

### Інші monetization constants

**Principle "Pay for wonders, not for winning"**: кварки НЕ дають power. Тільки **unique artifacts** (photo, video, 3D ship, life-form). Freemium-гравець отримує ту ж progression, але без "красивих скринів". Це запобігає pay-to-win відчуттю.

**Starter wallet**: **20⚛** при реєстрації (= 2 додаткових Kling-фото). Разом з безкоштовною home-фоткою це **3 artifacts за день 1** — достатньо щоб відчути цінність, але НЕ настільки щедро щоб гравець забув про existence IAP.

**Чому не 50⚛** (історичне): початково планувалось 50⚛ = 5 фото, але розрахунок на 100k installs показав $53k+ витрат на Kling API (див. економіку нижче). 20⚛ скорочує free-cost на 60% без шкоди для конверсії.

**Daily rewards**: **1⚛ за вхід** + **1⚛ за quiz** (було 2-3⚛ + 2⚛; зменшено щоб контроль над free API cost). Freemium все ще може накопичити ~60⚛/міс = 6 фото безкоштовно для retention.

**Pro-subscription** (100⚛/міс ≈ $2.50): 2× daily quarks + 10 video-missions/міс + priority queue + unlocked Academy deep-dive lessons. Ціль 5-8% конверсії DAU.

### 💸 Економіка free quota на 100k installs (розрахунок квіт.2026)

**Базові витрати при зменшеному starter 20⚛ + daily 1⚛/день:**

| Сегмент | Якщо всі з 100k | Реалістичний funnel (Tier 1-2) |
|---|---|---|
| 1-ша free home-фотка | $20,000 | **$17,000** (85% reach first gen) |
| 2 фото зі starter (20⚛ = 2 × $0.20) | $40,000 max | **$18,000** (45k D1-retained × 2 фото) |
| Daily 1⚛ (~30 ⚛/міс = 3 фото) | $60,000 max | **$4,800** (8k D30 × 3 фото × $0.20) |
| **Сумарно free AI cost** | $120,000 max | **≈ $39,800 realistic** |

**Revenue (той самий сегмент):**
- 15% paying users × LTV $15 = **$225,000** за 3 міс
- Platform fees (Apple/Google 30%) = -$67,500
- Free AI cost = -$39,800
- Server (Vercel + Neon + extra Kling) = -$5,000
- **Gross profit: $112,700 на 100k installs** (без CAC)

**З paid UA Tier 1-2** (CPI $4 середній):
- CAC = -$400,000
- Net: **-$287,300** ❌ — paid UA в Tier 1-2 **не окупається**

**Рекомендована стратегія запуску** (вибір ухвалено):
1. **Soft launch organic-only** — TikTok, Reddit, Discord, referral. CPI = $0.
2. Validate unit economics на ~20-50k organic installs.
3. Включати paid UA тільки коли video-missions генерують share-виральність (TikTok-ads target CPI ≤ $2.50).
4. Якщо раніше ніж video-missions виджут live — тримати paid UA ВИМКНЕНИМ.

### 🎯 Realistic сценарій для нішевого продукту

Нішевий science-edu-MMO рідко злітає до 100k installs без paid UA. Треба реалістичні цифри.

**Niche-realistic прогноз (без paid UA, перші 12 міс):**

| Місяць | Installs/міс (organic) | Cumulative MAU | Джерела трафіку |
|---|---|---|---|
| 1-2 | 100-300 | ~400 | друзі/сім'я beta + Ukraine tech Twitter |
| 3-4 | 300-800 | ~1 500 | 1-2 TikTok ролики злетіли + r/astronomy post |
| 5-6 | 800-2 000 | ~4 000 | Weekly Digest share loop + referrals |
| 7-9 | 2 000-5 000 | ~12 000 | 1 видео-експедиція стала вірусною + Product Hunt |
| 10-12 | 5 000-10 000 | ~25 000 | Steady community growth + Discord 5k+ members |

**ARPU для нішевої аудиторії астро-ентузіастів (вища ніж mass-market!)**:
- **Power users** (~8% DAU) = $1-3/день (купують video-missions щотижня)
- **Regular** (~20% DAU) = $0.20/день (купують 2-3 photos/міс)
- **Freemium** (~72% DAU) = $0.02/день (чисто щоденні бонуси, без IAP)
- **Blended ARPU ~$0.35/день** — **у 2.3× вище** ніж mass-market target $0.15

**Realistic revenue calculation (niche-focused, місяць 12):**
```
25 000 MAU × $0.35 ARPU × 30 днів  =  $262,500/міс gross
  − 30% platform fees               =  -$78,750
  − Free AI cost (~$0.50/MAU/міс)   =  -$12,500
  − Server (Vercel + Neon + Kling)  =  -$8,000
  − AI pipeline (Gemini + Veo)      =  -$15,000 (за power users)
  ───────────────────
  Net profit: ≈ $148,250/міс
```

Це при **25k MAU**, а не 100k. Ключ — **правильна аудиторія + premium pricing**.

**Резервні канали якщо organic < 500 installs/міс:**

1. **Науковий контент-маркетинг** (низький бюджет, довгий ефект):
   - YouTube devlog — "як ми робимо AI планети" серія (~$0 витрат, long-tail views)
   - Weekly Digest як public-facing blog на `nebulife.space/digest` — SEO для "astronomy news"
   - Співпраця з Science News каналами (nothing to pay, mutual amplification)

2. **Партнерства** (credibility + reach):
   - NASA Citizen Science listings (free)
   - Khan Academy / Brilliant guest content (shared audience)
   - Planetary Society member community
   - Українські освітні ініціативи (Науковий піднімай, Безплатна астрономія)

3. **Premium positioning** (вища ціна → менше гравців, але прибутковіших):
   - Ціна photo 10⚛ → **15⚛** (margin 46% замість 20%)
   - Video 20⚛ → **30⚛** (margin 70%)
   - Pro 100⚛/міс → **150⚛/міс** (для astronomy enthusiasts не проблема)

4. **Fallback — B2B/edu ліцензування**:
   - Schools license: 100 students × $2/місяць = $200/місяць × 50 шкіл = **$10k/міс MRR**
   - Museums / planetariums: one-time $500-5000 встановлення + per-seat subscription
   - Це НЕ план A, але safety net якщо consumer growth < очікувань

**Жодна з фіч гри не втратиться через пониження ambitions** — продукт орієнтований саме на premium astronomy-enthusiast audience. 5 000 щасливих платящих користувачів > 100 000 churning freemium.

### 🚨 Pivot триггери — коли змінюємо стратегію

Якщо через 3 місяці organic < 200 installs/міс → переоцінюємо:
- **Перевірити**: чи video-missions реально share-worthy? Якщо ні — переробити prompt/styling
- **Переглянути** позиціонування: можливо "Living Galaxy" занадто абстрактно → перейменувати "AI Astronomy" або "Living Textbook"
- **Включити paid UA $500-1k/міс** тестовий budget на Tier 2 ринки (Україна, Польща, Чехія) — CPI $0.30-1.00 vs $4+ Tier 1

Якщо через 6 місяців MRR < $500 → переключити фокус на **B2B edu** як основний revenue.

### 0.5 Явні Non-Goals (щоб не розмиватись)

| НЕ робимо | Чому |
|---|---|
| ~~Real-time PvP shooter~~ | Поза нашою архітектурою, не наша аудиторія |
| ~~3D planet exploration у стилі No Man's Sky~~ | Занадто дорого; ми 2D + AI photos |
| ~~Web3 / crypto / NFT~~ | Руйнує edu-friendly позицію |
| ~~Licensed sci-fi IP~~ | Жодних Star Wars/Star Trek crossovers |
| ~~Gacha mechanic~~ | Gambling regulations + поза edu-friendly |
| ~~Battle royale~~ | Проти "тихий атмосферний космос" |

### 0.6 Success Metrics (rolling 30-day)

| Метрика | Q2 target | Q3 target |
|---|---|---|
| MAU (monthly active) | 2 000 | 15 000 |
| D1 retention | 40% | 45% |
| D7 retention | 18% | 22% |
| D30 retention | 8% | 12% |
| ARPDAU | $0.15 | $0.40 |
| Paying user rate | 3% | 6% |
| Artifact purchases / paying user / week | 1 | 3 |
| Pro-subscription conversion | 2% DAU | 5% DAU |
| Рейтинг Play Store | 4.2 | 4.4 |
| Video missions / user / week | 2+ | 5+ |
| Weekly Digest opens | 45% MAU | 60% MAU |
| Shared content pieces | 50/week | 500/week |

### 0.7 Правило рішень

> Перед тим як взятися за будь-яку фічу, запитай себе: **"У який з векторів A-G вона лягає і як підсилює хоча б один з 5 стовпів?"**
> Якщо відповідь "жоден" або "всі потроху" — відкладаємо.

---

## 1. Концепція

**Жанр**: Science-fiction space exploration / survival strategy
**Платформа**: Web (browser) + Android + iOS, PixiJS v8 + React + Capacitor
**Цільова аудиторія**: Глобальна, Західна (US / EU / UK / CA / AU)
**Основна мова**: **English (EN)** — primary для маркетингу, App Store, SEO, social
**Друга мова**: **Українська (UK)** — як шана рідній країні автора; повний паритет перекладів, але НЕ таргет-ринок
**Позиціонування**: Cozy sci-fi exploration game — "spend 30 minutes a day discovering the universe"

**Важливо для контенту**: всі нові тексти (IAP descriptions, App Store metadata, ASTRA prompts, Academy lessons, screenshots, trailers, social) пишуться ENG-first, потім перекладаються на UK. Український текст НЕ визначає tone — це дзеркало англійського.

**Pitch**: An asteroid is heading for your planet. 7 days. Explore neighboring star systems, find a habitable world, launch a rescue ship for 10,000 passengers.

**Настрій**: Науково-фантастичний, стриманий, атмосферний. Не яскрава аркада — а тихий космос з відчуттям масштабу та самотності. Кожна зірка, планета, супутник — фізично обґрунтовані.

**Ключові принципи**:
- **Physics-first**: реальна фізика (Kepler, Stefan-Boltzmann, greenhouse effect), спрощуємо лише де це нудно для гравця
- **Deterministic**: один seed → ідентичний всесвіт через `SeededRNG`
- **Procedural**: все рендериться через PixiJS Graphics API, без текстур/спрайтів
- **60fps**: статична геометрія рендериться раз, per-frame тільки позиції та alpha

---

## 2. Візуальний стиль

### 2.1 Загальна естетика

**Темний космос** з приглушеними кольорами. Яскраві акценти лише для важливих елементів (життя, обітаємість, небезпека). Без емодзі, без яскравих градієнтів, без декоративних елементів.

**Натхнення**: Stellaris (system view), Spore (galaxy), Elite Dangerous (атмосфера), FTL (мінімалізм UI).

### 2.2 Колірна палітра

#### Фон та UI
| Призначення | Колір | Hex |
|---|---|---|
| Deep space | Майже чорний | `#020510` |
| Panel background | Темно-синій, 92% opacity | `rgba(10,15,25,0.92)` |
| Modal background | Темно-синій, 96% opacity | `rgba(10,15,25,0.96)` |
| Button background | Приглушений синій | `rgba(30,60,80,0.6)` |
| Button hover | Світліший синій | `rgba(40,80,120,0.3)` |
| HUD background | Напівпрозорий | `rgba(20,30,40,0.8)` |

#### Текст
| Призначення | Колір | Hex |
|---|---|---|
| Primary text | Світлий сіро-блакитний | `#aabbcc` |
| Headers | Яскравіший | `#ccddee` |
| Secondary / muted | Приглушений | `#8899aa` |
| Labels / inactive | Тьмяний | `#667788` |
| Minimal contrast | Ледь видимий | `#556677` |
| In-game labels | Сіро-зелений | `#889999` |

#### Рамки та роздільники
| Призначення | Колір | Hex |
|---|---|---|
| Primary border | Темно-синій | `#334455` |
| Active border | Яскравіший синій | `#446688` |
| Inactive border | Тьмяний | `#2a3a4a` |
| Subtle divider | Напівпрозорий | `rgba(50,60,80,0.4)` |

#### Семантичні кольори
| Значення | Колір | Hex | Де використовується |
|---|---|---|---|
| Позитивний / життя | Яскраво-зелений | `#44ff88` | Life indicator, habitable zone, success |
| Попередження | Помаранчевий | `#ff8844` | Marginal conditions |
| Небезпека / негатив | Червоний | `#cc4444` | Uninhabitable, errors |
| Інформація | Блакитний | `#4488aa` | Default accent |
| Habitable zone | Зелений | `#22aa44` | HZ ring, HZ label |
| Home marker | Яскраво-зелений | `#22ff66` | Home system on galaxy map |
| Orbit lines | Темно-синій | `#334466` | Orbital paths |

### 2.3 Шрифти

**Єдиний шрифт**: `monospace` (system monospace) — скрізь без виключень.

| Контекст | Розмір |
|---|---|
| Дані, статус, маленькі лейбли | 9px |
| Секційні заголовки (uppercase) | 10px |
| Основний текст панелей | 11px |
| Кнопки, меню, поля вводу | 12px |
| Заголовок меню / панелі | 13-14px |
| Назва системи в модалі | 16px |
| Головний заголовок модалу | 18px |

**Правила**:
- Uppercase + `letter-spacing: 0.5-1.5px` для категорійних лейблів
- `align: center` для планетних лейблів у system view
- Ніколи не використовувати serif чи sans-serif

### 2.4 Кнопки

**Стандартна кнопка**:
```
padding: 8px 0 | width: 100%
background: rgba(30,60,80,0.6)
border: 1px solid #446688
color: #aaccee
font: monospace 12px
border-radius: 3px
cursor: pointer
```

**Disabled**: `opacity: 0.4; cursor: not-allowed`
**Success** (модалі): `border: 1px solid #44ff88; color: #44ff88; background: rgba(30,80,50,0.6)`
**HUD навігація**: `padding: 4px 12px; font-size: 11px; background: rgba(20,30,40,0.8); border: 1px solid #334455`
**Close (×)**: `background: none; border: none; color: #667788; font-size: 16px`

### 2.5 Панелі та контейнери

**Info panel** (правий верхній кут):
```
position: absolute | right: 16px | top: 60px
width: 280-300px
background: rgba(10,15,25,0.92)
border: 1px solid #334455
border-radius: 4px
padding: 16px
```

**Context menu** (при кліку на планету):
```
width: 200px
background: rgba(10,15,25,0.95)
border: 1px solid #334455
border-radius: 6px
padding: 10px 0
box-shadow: 0 4px 20px rgba(0,0,0,0.6)
```

**Modal overlay**: `background: rgba(0,0,0,0.6); z-index: 100`
**Modal dialog**: `width: 340px; border: 1px solid #44ff88; border-radius: 6px; padding: 24px`

### 2.6 Патерни компонентів

**Data row** (ключ-значення): `display: flex; justify-content: space-between; padding: 2-3px 0; border-bottom: 1px solid rgba(50,60,70,0.3)`
**Section divider**: `margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(50,60,80,0.3)`
**Progress bar**: `height: 6px; border-radius: 3px; background: rgba(30,40,50,0.6)` → fill: `#2266aa→#44aaff` (in progress) або `#22aa55→#44ff88` (complete)
**Border-radius**: 3px (кнопки), 4px (панелі), 6px (меню/модалі)

---

## 3. Рендеринг (PixiJS)

### 3.1 System View — ізометрична перспектива

**Y-компресія**: `Y_COMPRESS = 0.55` — всі Y-координати помножені на 0.55. Кругові орбіти стають еліпсами, створюючи відчуття 3D-глибини.

**Застосовується до**: орбіт планет, позицій планет, HZ-зони, астероїдних поясів, місячних орбіт.
**НЕ застосовується до**: hit areas (працюють в локальних координатах), лейблів (компенсуються).

**Z-ordering**: `sortableChildren = true`. Планети з більшим Y (ближче до глядача) рендеряться поверх. Зірка завжди на `zIndex = 10000`. Орбіти на `zIndex = 0`.

**Depth scale**: планети трохи збільшуються коли "ближче" (нижче на екрані): `scale = 1 + y/maxExtent * 0.06`

### 3.2 Планети (System View) — mini-spheres

Кожна планета рендериться як маленька 3D-сфера:
1. **Dark base** — повне коло з затемненим кольором (тіньова сторона)
2. **Lit hemisphere** — зміщене коло з яскравим кольором (освітлена сторона)
3. **Gas giant bands** — горизонтальні еліпси (для gas/ice giants)
4. **Specular highlight** — маленький білий еліпс (блік)
5. **Limb darkening** — темний штрих по краю
6. **Atmosphere glow** — 2 напівпрозорих кільця (якщо є атмосфера)
7. **Ring** — для gas giants > 50 M⊕

**Dynamic lighting**: `lightingGroup` Container обертається кожен кадр щоб блік завжди дивився на зірку: `lightingGroup.rotation = atan2(-y, -x)`

**Return type**: `{ container: Container; lightingGroup: Container }`

### 3.3 Зірка (System View)

Багатошаровий glow + core + corona:
1. Far glow (size × 4, alpha 0.03)
2. Outer glow (size × 2.5, alpha 0.08)
3. Mid glow (size × 1.6, alpha 0.15)
4. **Corona rays** — 6 трикутних променів в окремому Container (анімуються)
5. Inner glow (size × 1.2, alpha 0.3)
6. White core (size, alpha 0.9)
7. Color overlay (size × 0.8, alpha 0.5)

**Corona animation**: `scale = 1 + sin(time * 0.001) * 0.08` + повільне обертання

**Return type**: `{ container: Container; corona: Container }`

### 3.4 Орбіти

Dual-stroke projected ellipse:
- **Outer glow**: width 3, color `#334466`, alpha 0.06
- **Inner bright**: width 0.7, color `#445577`, alpha 0.25

Еліпс з ексцентриситетом: `b = a * sqrt(1 - e²) * Y_COMPRESS`, зміщення фокуса `c = a * e`

### 3.5 Background (System View)

Детермінований від `system.seed`:
1. **Deep stars** (2000+): крихітні, dim, білі відтінки
2. **Medium stars** (150+): більші, теплі/холодні кольори
3. **Nebula wisps** (2-3): великі напівпрозорі еліпси (alpha 0.006-0.02)
4. **Twinkling stars** (40+): індивідуальні Graphics, анімована alpha `sin(time * speed + phase)`

**Палітра**:
- White: `[0xffffff, 0xeeeeff, 0xffeeff, 0xeeffff]`
- Warm: `[0xffeedd, 0xffddbb, 0xffcc99]`
- Cool: `[0xaaccff, 0x88bbff, 0x99ccff]`
- Nebula: `[0x2244aa, 0x443388, 0x224466, 0x553366]`

### 3.6 Planet Closeup (PlanetViewScene)

Ортографічна проекція з noise-based terrain:
- Розмір: `screenRadius = min(W, H) * 0.22`
- Кольори поверхні, океану, біомів, хмар — з `derivePlanetVisuals(planet, star)`
- Terminator line (день/ніч) через `terminatorGroup` rotation
- Vignette overlay для кінематографічного кадрування

### 3.7 Кольори з фізики

**Поверхня** (від температури):
| Температура | Колір | Опис |
|---|---|---|
| >1200K | `#1a0a00` | Лавовий світ |
| >600K | `#aa5533` | Гарячий (Venus-like) |
| >373K | `#bb9966` | Теплий пустельний |
| >273K | `#887766` | Помірний скелястий |
| >200K | `#8899aa` | Холодний морозний |
| <200K | `#aabbcc` | Замерзлий |

**Атмосфера** (від складу):
| Газ | Колір | Hex |
|---|---|---|
| O₂ (Earth-like) | Синій | `#4488ff` |
| CO₂ (Venus-like) | Жовтий | `#ddaa44` |
| CH₄ (Titan-like) | Коричневий | `#886644` |
| H₂ (Gas giant) | Блідо-синій | `#8899cc` |

**Gas Giant bands** (від температури): Hot `#cc5522`, Warm `#cc9955`, Cold `#aa8855`
**Ice Giant**: `#3366aa` → `#5588aa`
**Океани**: Shallow `#2a6a8a`, Deep `#0a1a3a`

**Біоми** (від складності життя):
- Intelligent/Multicellular: яскраві зелені (`#1a6a2a` tropical → `#c4a55a` desert)
- Microbial: приглушені (`#6a7a5a`)

**Місяці** (від складу): Rocky `#888899`, Icy `#aabbcc`, Metallic `#998877`, Volcanic `#775544`

---

## 4. Анімація

| Елемент | Швидкість | Формула / Опис |
|---|---|---|
| Planet orbits (system) | 200× прискорення | `2π / (periodDays × 200)` |
| Moon orbits (system) | 400× прискорення | `2π / (periodDays × 400)`, clamped to min 8s per orbit |
| Moon orbits (closeup) | 120 000× прискорення | `2π / (periodDays × 120000)` |
| Star corona pulse | Повільна | `scale = 1 + sin(time * 0.001) * 0.08` |
| Star corona rotation | Дуже повільна | `+= 0.0002 * dt` |
| Background twinkling | Індивідуальна | `alpha = base * (0.5 + 0.5 * sin(time * speed + phase))` |
| Cloud drift (closeup) | 0.0008 px/ms | Lateral shift |
| View rotation (closeup) | 0.000015 rad/ms | Slow cosmos rotation |
| Planet hover | Instant | `scale: 1.0 → 1.3` |

**Moon speed clamp**: `maxMoonSpeed = 2π / (8 × 60)` — жоден супутник не робить оберт швидше ніж за 8 секунд (при 60fps). Потрібно для близьких місяців масивних gas giants де `orbitalPeriodDays` може бути 0.007.

---

## 5. Сцени та навігація

### 5.1 Потік сцен

```
Home Planet ←→ Galaxy → System → Planet View
                ↑           ↑
                └───────────┘ (back)
```

### 5.2 Сцени

| Сцена | Камера | Інтеракція | Вхід |
|---|---|---|---|
| HomePlanetScene | Фіксована + повільне обертання | Zoom +/- | Старт гри |
| GalaxyScene | Free zoom/pan | Click система, double-click вхід | З Home Planet |
| SystemScene | Free zoom/pan, auto-fit | Click планета → context menu | З Galaxy (якщо досліджена) |
| PlanetViewScene | Фіксована + обертання | Zoom +/- | З System (click планета) |

### 5.3 Camera

- **CameraController**: zoom (scroll), pan (drag), auto-fit (`resetToFit(worldRadius)`)
- **Drag threshold**: 3px перед початком drag (щоб не конфліктувати з кліками по планетах)
- **Scale limits**: `minScale = 0.1`, `maxScale = 5`
- **Zoom**: до курсора (world-space projection)

### 5.4 Context Menu планети

При кліку на планету в System View з'являється меню:
- **Дивитися** → PlanetViewScene
- **Характеристики** → PlanetInfoPanel

### 5.5 AU-to-Screen mapping

`auToScreen(au) = Math.log2(1 + au × 4) × 100` — логарифмічна компресія для великих відстаней (B-зірки де HZ на 50+ AU).

---

## 6. Ігрові механіки

### 6.1 Сюжет

Домашня зірка: B4-клас (18 500 K). Астероїд наближається — 7 днів (604 800 с). Треба:
1. Дослідити сусідні системи через обсерваторії
2. Знайти планету з habitability > 0.3
3. Запустити корабель порятунку (1% c, 10 000 пасажирів)

### 6.2 Дослідження (Research)

**Обсерваторії**: 3 паралельних слоти
**Тривалість сесії**: 10с (dev) / 1 год (prod)
**Прогрес за сесію**: 2-50% (випадково, детерміновано)
**Доступність**: Ring 0 (дім) + Ring 1 (6 систем)

**Прогресивне розкриття**:
| Дані | Поріг видимості | Точність |
|---|---|---|
| Клас зорі | 25% (нечіткий до цього) | Exact at 25% |
| Кількість планет | 25% | Exact at 25% |
| Відстань AU | 1% | Звужується до 100% |
| Покриття водою | 1% | Звужується до 100% |
| Температура | 25% (wide), 50% (narrow) | Exact at 100% |
| Придатність | 25% | Звужується до 100% |

**Вхід у систему**: тільки при 100% дослідження або домашня система.

### 6.3 Генерація всесвіту

**Галактика**: гексагональні кільця навколо гравця
- Ring 0: 1 система (дім)
- Ring 1: 6 систем
- Ring 2: 12 систем
- Відстань між кільцями: 5 ly

**Зірки**: 7 спектральних класів (O-M), реалістичні T/M/R/L

| Клас | T (K) | Маса (☉) | Радіус (☉) | Колір | Ймовірність |
|---|---|---|---|---|---|
| O | 40 000 | 40.0 | 17.8 | `#9bb0ff` | 0.00003% |
| B | 15-28 000 | 6.4-18 | 3.8-7.4 | `#aabfff-#cad7ff` | 0.13% |
| A | 8 500-9 900 | 2.1-3.2 | 1.7-2.5 | `#f8f7ff` | 0.6% |
| F | 6 600-7 400 | 1.3-1.7 | 1.3-1.5 | `#fff2e0` | 3.0% |
| G ☉ | 5 500-6 000 | 0.93-1.1 | 0.96-1.0 | `#fff5e3` | 7.6% |
| K | 4 100-4 900 | 0.68-0.82 | 0.74-0.85 | `#ffd2a1` | 12.1% |
| M | 2 400-3 500 | 0.1-0.47 | 0.12-0.51 | `#ffa060-#ffbd80` | 76.45% |

**Планети**: 2-12 на систему (середнє 6)
- 4 типи: `rocky`, `gas-giant`, `ice-giant`, `dwarf`
- 4 зони: inner, habitable, outer, far
- Маса визначає тип: <0.01→dwarf, >10→giant (in inner/hab), >50→gas-giant (outer)

**Супутники**:
| Тип планети | Кількість |
|---|---|
| Gas giant | 2-8 |
| Ice giant | 1-5 |
| Rocky > 0.5 M⊕ | 0-2 (50% шанс) |
| Rocky ≤ 0.5 M⊕ | 0-1 (10% шанс) |
| Dwarf | 0-1 (10% шанс) |

4 типи складу: Rocky (45%), Icy (30%), Metallic (15%), Volcanic (10%)

### 6.4 Habitability (0-1)

5 факторів:
| Фактор | Вага | Оптимум |
|---|---|---|
| Temperature | 30% | 288K (15°C), σ=30K |
| Atmosphere | 25% | O₂ 15-30%, P 0.5-2.0 atm |
| Water | 25% | 30-80% покриття |
| Magnetic field | 10% | Сильна магнітосфера |
| Gravity | 10% | 1g, σ=0.4g |

**Життя**: habitability ≥ 0.7 І 15% шанс. Складність від star_age × habitability.
**Колонізація**: habitability > 0.3

### 6.5 Домашня система

- Ring 0, завжди досліджена
- Одна планета — гарантовано обітаєма (275K, атмосфера, гідросфера)
- В Ring 1 гарантовано є хоча б одна колонізабельна планета

---

## 7. Архітектура

```
nebulife/
├── packages/
│   ├── core/          # Headless: типи, генерація, фізика, хімія
│   │   └── src/
│   │       ├── types/       # Planet, Star, Moon, StarSystem, Orbit
│   │       ├── generation/  # galaxy, star, planet, home-planet generators
│   │       ├── physics/     # Kepler, gravity, habitable zone
│   │       ├── chemistry/   # Atmosphere, water, elements
│   │       ├── biology/     # Habitability, life probability
│   │       ├── constants/   # Physics, stellar, game, balance
│   │       ├── math/        # SeededRNG, noise (Simplex)
│   │       └── game/        # Research, timeline, exploration
│   ├── client/        # PixiJS rendering + React UI
│   │   └── src/
│   │       ├── game/
│   │       │   ├── scenes/      # HomePlanet, Galaxy, System, PlanetView
│   │       │   ├── rendering/   # PlanetRenderer, StarRenderer, HomePlanetRenderer, PlanetVisuals
│   │       │   ├── camera/      # CameraController
│   │       │   └── GameEngine.ts
│   │       ├── ui/components/   # React HUD, panels, menus, modals
│   │       └── App.tsx          # Root component, state management
│   └── server/        # Серверні функції (Neon DB, Kling, Tripo)
│       └── src/
│           ├── db.ts               # Neon PostgreSQL CRUD (players, surface_maps, planet_models, payment_intents)
│           ├── kling-client.ts     # Kling AI API (JWT auth, image generation)
│           ├── tripo-client.ts     # Tripo 3D API (GLB model generation)
│           ├── surface-analyzer.ts # HSL-based terrain zone detection
│           ├── surface-prompt-builder.ts # Kling prompt from planet/star data
│           └── index.ts            # Barrel exports
├── api/               # Vercel serverless endpoints
│   ├── player/        # GET/POST player data
│   ├── payment/       # create, callback, topup (MonoPay)
│   ├── surface/       # generate, status/[id], buildings, map
│   ├── kling/         # Kling task management
│   └── tripo/         # Tripo 3D model pipeline
```

**Ключові утиліти**:
- `derivePlanetVisuals(planet, star)` → всі кольори для рендерингу планети
- `lerpColor(c1, c2, t)` → інтерполяція кольорів
- `SeededRNG` → детермінований рандом (Mulberry32)
- `auToScreen(au)` → логарифмічна AU→px конвертація

---

## 8. Балансові константи

| Параметр | Значення | Файл |
|---|---|---|
| ASTEROID_COUNTDOWN | 604 800 с (7 днів) | `constants/game.ts` |
| RESEARCH_DURATION_MS | 10 000 (dev) / 3 600 000 (prod) | `constants/balance.ts` |
| RESEARCH_MIN/MAX_PROGRESS | 2% / 50% | `constants/balance.ts` |
| HOME_OBSERVATORY_COUNT | 3 | `constants/balance.ts` |
| HOME_RESEARCH_MAX_RING | 1 | `constants/balance.ts` |
| LIFE_PROBABILITY | 15% | `constants/game.ts` |
| LIFE_HABITABILITY_THRESHOLD | 0.7 | `constants/game.ts` |
| DOOMSDAY_SHIP_SPEED_C | 0.01 (1% c) | `constants/game.ts` |
| DOOMSDAY_SHIP_PASSENGERS | 10 000 | `constants/game.ts` |
| MIN/MEAN/MAX_PLANETS | 2 / 6 / 12 | `constants/game.ts` |
| Y_COMPRESS | 0.55 | `PlanetRenderer.ts` |
| Planet orbit speedup | 200× | `SystemScene.ts` |
| Moon orbit speedup | 400× (clamped 8s min) | `SystemScene.ts` |
| Moon orbit speedup (closeup) | 120 000× | `PlanetViewScene.ts` |
| auToScreen | `log2(1+au×4)×100` | `SystemScene.ts` |
| GALAXY_SEED | 42 | `GameEngine.ts` |
| RING_DISTANCE_LY | 5 | `galaxy-generator.ts` |
| RINGS_PER_REGISTRATION | 2 | `galaxy-generator.ts` |

---

## 9. НЕ робити (Anti-patterns)

- **Blur filters** — тяжкі, не всі GPU підтримують; concentric circles дають той самий ефект
- **Per-pixel noise для планет у system view** — 6-40px занадто малі; noise видно тільки з 100px+
- **Parallax backgrounds** — конфліктує з CameraController (один container для всього)
- **Перерисовка Graphics кожен кадр** — вбиває продуктивність; використовувати rotation замість
- **Vignette в system view** — не працює з zoom/pan
- **`Graphics.clear()` per-frame** — тільки для одноразових анімацій (supernova)
- **Sans-serif / serif шрифти** — тільки monospace
- **Яскраві кольори без причини** — палітра приглушена, акценти тільки для семантики
- **Емодзі** — ніколи
- **Текстури / спрайти** — все процедурне через Graphics API

---

## 10. Серверна архітектура

### 10.1 Database (Neon PostgreSQL)

**Таблиці**:
| Таблиця | Призначення |
|---|---|
| `players` | id, name, quarks, registeredAt |
| `surface_maps` | AI-generated planet photos + zone maps (UNIQUE по planet_id) |
| `planet_models` | 3D GLB models (Tripo pipeline status tracking) |
| `payment_intents` | MonoPay payment tracking (topup, purchase_model, purchase_surface) |
| `kling_tasks` | Kling AI task tracking |
| `discoveries` | Cosmic discoveries from research |
| `expeditions` | Player expeditions |
| `surface_buildings` | Placed buildings on planet surfaces |

### 10.2 API Endpoints

| Endpoint | Method | Опис |
|---|---|---|
| `/api/player/:id` | GET | Отримати дані гравця (quarks, name) |
| `/api/payment/create` | POST | Створити платіж (quarks-first, потім MonoPay) |
| `/api/payment/callback` | POST | MonoPay webhook → creditQuarks |
| `/api/payment/topup` | POST | Поповнення кварків через MonoPay |
| `/api/surface/generate` | POST | Запуск AI генерації поверхні (Kling) |
| `/api/surface/status/:id` | GET | Polling статусу генерації |
| `/api/surface/buildings` | GET/POST/DELETE | CRUD будівель на поверхні |
| `/api/kling/generate` | POST | Kling image generation |
| `/api/kling/status/:id` | GET | Kling task status |
| `/api/tripo/create` | POST | Tripo 3D model creation |
| `/api/tripo/status/:id` | GET | Tripo task status |

### 10.3 Imports

API endpoints імпортують серверні функції через `@nebulife/server`:
```typescript
import { getSurfaceMap, saveSurfaceMap, deductQuarks, generateImage } from '@nebulife/server';
```
**НІКОЛИ** не використовувати прямі шляхи `@nebulife/server/src/...` — вони не працюють на Vercel.

### 10.4 Cross-device синхронізація (game_state JSONB)

Гравець може грати на мобільному та десктопі одночасно. Весь ігровий стан синхронізується через `game_state` JSONB колонку в таблиці `players`.

**Архітектура:**
```
localStorage ←→ React state ←→ buildGameStateSnapshot() → server JSONB
                                hydrateGameStateFromServer() ← server JSONB
```

**Правило додавання нового ігрового стану (кораблі, будівлі, ресурси, битви тощо):**

1. Додати поле до інтерфейсу `SyncedGameState` в `App.tsx`
2. Додати до `buildGameStateSnapshot()` — зчитування з React state або localStorage
3. Додати до `hydrateGameStateFromServer()` — відновлення в React state + localStorage
4. Додати до масиву залежностей дебаунс-синку `useEffect` (рядок з `scheduleSyncToServer()`)
5. Додати localStorage ключ до масиву `keysToRemove` в `handleStartOver()` (reset)

**Правила:**
- Кожне нове `useState` з ігровими даними МУСИТЬ бути в `SyncedGameState`
- Залежності дебаунсу: кожна змінна стану, що може змінитися незалежно, мусить бути в масиві залежностей
- Прямі DB колонки (`home_system_id`, `home_planet_id`, `quarks`, `game_phase`): читаються з `player.*` напряму, а не з `game_state` JSONB
- JSONB backup для прямих колонок: додавати як belt-and-suspenders
- Race condition: якщо стан потребує engine для резолюції (системи, планети), використовувати `pendingXxxRef` + `useEffect` (паттерн `pendingEvacRef` / `pendingHomeRef`)

**Sync triggers:**
| Тригер | Коли |
|---|---|
| Дебаунс (5 сек) | Зміна будь-якої залежності в масиві |
| `visibilitychange` → hidden | Негайний sync при згортанні вкладки |
| `beforeunload` | Негайний sync при закритті |
| `visibilitychange` → visible | Pull з сервера (hydrate) при поверненні |

---

## 11. Ігрова валюта "Кварки" (⚛)

### 11.1 Концепція

1 кварк = 1 гривня. Всі ігрові покупки за кварки. Баланс зберігається на сервері (`players.quarks`).

### 11.2 Ціни (10× markup над AI API cost)

| Покупка | Ціна | API cost | Примітка |
|---|---|---|---|
| AI поверхня (перша рідна планета) | **Безкоштовно** | ~$0.15 | hook, 1-ша генерація home planet |
| AI поверхня (наступні) | **10 ⚛** | ~$0.15 | Kling photo |
| 🚀 3D модель корабля | **49 ⚛** | ~$0.50 | Kling concept → Tripo GLB. **Замінив planet Tripo** (планета-3D виходила неякісно) |
| 🎬 **Video-expedition (15s)** | **20 ⚛** | ~$0.50 | Gemini script + Veo/Kling відео + TTS |
| 🎬 **Video-expedition legendary (30s)** | **35 ⚛** | ~$1.00 | rare event, longer footage |
| 🧬 **Life-form generation (common)** | **5 ⚛** | ~$0.05 | DNA sample + Kling illustration |
| 🧬 **Life-form (rare)** | **15 ⚛** | ~$0.15 | complex multi-cell |
| 🧬 **Life-form (legendary)** | **40 ⚛** | ~$0.40 | sapient / exotic |
| 🏷️ **Custom star name** | **25 ⚛** | — | persistent у world |
| 📰 **Weekly Digest PREMIUM illustrations** | **5 ⚛** | ~$0.05 | unlocks bilingual hero art |
| 🎓 **Academy deep-dive lesson** | **3 ⚛** | ~$0.02 | Gemini-generated + quiz |
| 🏆 **Clan banner (AI-gen)** | **30 ⚛** | ~$0.30 | персональний прапор клану |
| 🛍️ **Marketplace listing fee** | 10% | — | з продажу rare artifact між гравцями |
| 🎫 **Pro subscription** | **100 ⚛/міс** | — | 2× daily quarks + 10 video/міс + priority queue + deep-dive lessons |
| 📺 Rewarded ad viewing | +5 ⚛ free | — | AdMob, до 5 разів/день |
| Поповнення | Будь-яка сума | — | MonoPay → creditQuarks |

### 11.3 Механіка

- **Списання**: атомарне `UPDATE players SET quarks = quarks - $amount WHERE quarks >= $amount`
- **Поповнення**: `UPDATE players SET quarks = quarks + $amount`
- **Покупка з недостатнім балансом**: deficit = price - quarks → MonoPay на deficit → callback → credit → deduct
- **UI**: баланс в CommandBar (права секція), кнопка поповнення → QuarkTopUpModal

### 11.4 Стандартна іконка кварка

Іконка кварка — атом SVG (НЕ літера "Q"). Використовується у всіх компонентах де відображається баланс або ціна в кварках.

```tsx
function QuarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}
```

Канонічний варіант — з `ResourceDisplay.tsx`. Всі локальні копії у HangarPage, SystemContextMenu, PlanetContextMenu, PlayerPage мають відповідати цьому зразку.

---

## 12. AI-генерована поверхня

### 12.1 Pipeline

```
POST /api/surface/generate
  → buildSurfacePrompt(planet, star) → prompt
  → generateImage(prompt, 16:9, 2K) → klingTaskId
  → saveSurfaceMap(generating)

GET /api/surface/status/:id (polling кожні 5с)
  → checkTaskStatus(klingTaskId)
  → succeed → analyzePhotoForZones(imageUrl) → zone_map
  → updateSurfaceMap(ready, photo_url, zone_map)
```

### 12.2 Prompt Builder

Збирає промпт з даних планети:
- `waterCoverageFraction` → опис водних мас
- `surfaceTempK` → кліматична зона (frozen/temperate/hot/lava)
- `hydrosphere` → океани, льодовики
- `resources` → колір ґрунту (Fe = червонуватий, Si = блідий)
- `lifeComplexity` → рослинність
- `star.spectralClass` → відтінок освітлення

### 12.3 Zone Analyzer

Після отримання фото від Kling:
1. Fetch image як Buffer
2. Поділити на **64x36 grid** (для 16:9)
3. Для кожної клітинки: RGB → HSL → terrain classification
4. Класифікація:

| HSL діапазон | Terrain |
|---|---|
| H 180-260, S>25 | water (deep_ocean/ocean/shallow) |
| L>85, S<30 | ice |
| H 60-160, S>20 | vegetation (forest/grassland) |
| H 20-50, S>15 | desert/sand |
| L<35, S<30 | mountain |
| Решта | plains |

5. `buildable`: true для vegetation, desert, plains, ice; false для water, mountain

### 12.4 Клієнт (SurfaceView.tsx)

**Фази**:
- `procedural` (дефолт) — SurfaceMapRenderer (canvas noise tiles), працює без API
- `generating` — AI генерація в процесі (лоадер)
- `ai-ready` — AI фото + SimplexNoise хмари + zone overlay
- `error` — помилка AI, повернення до procedural

**AI генерація запускається тільки по кнопці**, не автоматично.

---

## 13. 3D моделі кораблів (Tripo)

> ⚠️ **Зміна курсу (квітень 2026)**: Tripo-для-планет вимкнено — модельки виходили стилізовані/неточні, cost/quality поганий. Pipeline перенаправлено на генерацію **унікальних кораблів** гравців (flagship / arena ship / clan flagship).

### 13.1 Pipeline (нова ціль)

```
1. Gemini: buildShipPrompt(role, style, clan?) → prompt
   role:  'flagship' | 'arena-fighter' | 'explorer' | 'trader' | 'clan-cruiser'
   style: 'sleek' | 'industrial' | 'organic' | 'alien' | 'military'
2. Kling: generateImage(prompt, 1:1, "isometric ship concept art") → photo_url
3. Tripo: createModelTask(photo_url, target_polys=2000) → taskId
4. Poll: checkModelTask(taskId) → status
5. Ready: download GLB → ship_models table → Babylon.js / Three.js viewer
```

### 13.2 Statuses

`pending` → `generating_concept` → `concept_ready` → `generating_model` → `ready` / `failed`

### 13.3 Використання в грі

- **HangarPage** — preview обраного корабля (Babylon.js ArcRotateCamera)
- **ArenaEngine** — замість дефолтних Three.js кораблів використовує `.glb` гравця як mesh для його ship entity
- **RaidEngine** — використовує `.glb` гравця з Hangar, а союзники/вороги/носій процедурні та mobile-capped
- **SystemScene** — невеликий ship icon біля player home (при navigation)
- **Clan banner** — flagship клану відображається на cluster map (якщо clan owner підключив)

### 13.4 DB schema (оновити)

Таблиця `planet_models` → **перейменувати** у `ship_models`:

```sql
ship_models (
  id UUID PK,
  player_id TEXT FK,
  role TEXT,              -- 'flagship' | 'arena-fighter' | ...
  style TEXT,
  kling_task_id TEXT,
  tripo_task_id TEXT,
  concept_url TEXT,       -- Kling concept art
  glb_url TEXT,            -- Tripo output
  status TEXT,
  created_at TIMESTAMPTZ,
  quarks_paid INT
);
```

### 13.5 Міграція існуючого коду (TODO)

- `api/tripo/generate.ts` — поміняти prompt builder, таблицю
- `api/tripo/status/[id].ts` — працює без змін
- `api/models` endpoint — повертає ship list замість planet list
- `packages/server/src/tripo-client.ts` — без змін (API той самий)
- `packages/client/src/ui/components/Planet3DViewer.tsx` → **rename to `Ship3DViewer.tsx`**
- Видалити "3D view" кнопку з PlanetViewScene, додати в HangarPage

---

## 14. Уніфікована панель управління (CommandBar)

### 14.1 Концепція

Єдина нижня панель (bottom bar) присутня на ВСІХ рівнях гри. Структура постійна, змінюється тільки набір інструментів.

### 14.2 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ◁ Домівка › Галактика › Система  │  [Tools...]  │  ⚛120 Name  │
└──────────────────────────────────────────────────────────────────┘
```

- **Ліва секція**: breadcrumbs навігації (клікабельні)
- **Центральна секція**: інструменти сцени (змінюються)
- **Права секція**: кварки + ім'я гравця

### 14.3 Інструменти по сценах

| Сцена | Інструменти |
|---|---|
| Home Intro | [Дослідити галактику] + zoom |
| Galaxy | [Обсерваторії X/Y] [Домівка] |
| System (з планетою) | [Екзосфера] [Поверхня] [3D] [Інфо] |
| Planet View | [Поверхня] [3D] [Інфо] + zoom |
| Surface | [Будівлі] [AI Знімок] + terrain info + zoom |

### 14.4 Стилі

```
height: 48px
position: fixed; bottom: 0
background: rgba(5, 10, 20, 0.92)
backdrop-filter: blur(12px)
border-top: 1px solid rgba(60, 100, 160, 0.15)
z-index: 9500
```
