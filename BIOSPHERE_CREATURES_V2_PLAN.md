# BIOSPHERE CREATURES V2 — План реалізації

> Технічне завдання на розширений модуль істот Біосфери. Спирається на
> `NEXT_GEN_PLAN.md` §C, `GAME_MODULES.md` (AI-контент), `GAME_BIBLE.md`,
> `CLAUDE.md`. **Код гри в межах цього документа НЕ змінюється** — це план.
>
> Формат артефакту: Markdown-файл у корені репо (це конкретний, версіонований
> deliverable, який просив користувач). Canvas свідомо **не** створюється —
> за canvas-skill канвас доречний для ephemeral-аналітики, а тут потрібен
> файл, який лягає в git і читається як ТЗ.

---

## 0. TL;DR — ключові рішення

1. **Голос істоти** → ElevenLabs **Sound Effects API** (`POST /v1/sound-generation`,
   модель `eleven_text_to_sound_v2`, `duration_seconds ≈ 10`), **НЕ TTS**. Виклик
   **синхронний** (повертає mp3-байти одразу, як у `scripts/sfx/generate.mjs`),
   тож polling не потрібен — генеруємо в одному serverless-виклику й одразу
   кладемо у Vercel Blob. Промпт будується сервером із traits/біому/розміру.
   Гравець НІКОЛИ не вводить текст.
2. **Перша істота (безкоштовна)** → **у репозиторії немає жодної придатної
   GLB-моделі істоти** (є лише кораблі: `raid/*.glb`, `packages/sci-fi_*.glb`).
   Рішення: офлайн-скрипт `scripts/starter-creature/generate.mjs` один раз
   «запікає» канонічну стартову істоту (GLB + портрет) і закомітить її у
   `packages/client/public/creatures/starter/`, плюс процедурний Babylon-fallback.
   Стартова істота **не викликає Gemini/Tripo у рантаймі** й не списує кредити.
3. **Вік** → `created_at` уже є в таблиці; додаємо `born_at` (DEFAULT = created_at)
   для чистої семантики нащадків/гібридів. Вік — **derived** із серверного
   timestamp, без per-frame записів. Офлайн-час уже коректно обробляє
   `computeEffectiveVitality`.
4. **Рух/колізії** → детермінований spatial-hash + boids-lite separation у
   наявному 30fps-циклі. Без фізичного рушія.
5. **Одна нова міграція `045-creature-biosphere-v2.sql`** покриває: розмір,
   зону габітату, слот розміщення, `born_at`, поля голосу, статус модерації імені.
6. **Вибір/деталі** → pointer-picking у Babylon + модалка з ізольованим
   ArcRotate-в'ювером (переюз патерну `SurfaceBabylonView` / поточного
   `BiosphereView`).

---

## 1. Поточний стан коду (факти, з файлами й типами)

### 1.1 Сцена й рендер
- `packages/client/src/ui/components/Biosphere/BiosphereView.tsx` — Babylon-сцена:
  - Камера `ArcRotateCamera`, orbit-only (`panningSensibility = 0`), 30fps cap
    (`RENDER_FPS_CAP = 30`), `PATCH_SIZE = 16`.
  - Терен: `MeshBuilder.CreateGround` 40×40 (~3200 трикутників), flat-shaded,
    vertex-color tint від `BiosphereBiome`.
  - Розміщення істот: `readyCreatures.forEach((creature, index) => …)` по колу
    `angle = (index / MAX_BIOSPHERE_CREATURES) * 2π + 0.4`, `radius = PATCH_SIZE*0.22`.
    **Розмір фіксований**: `targetHeight = 1.4` для всіх (нормалізація по
    bounding box). → корінь проблем #1 і #2.
  - Рух: `updateCreatureAnimations()` — bob + повільний поворот + випадковий
    slide (`Math.random()`), **без урахування сусідів** → істоти проходять одна
    крізь одну (проблема #1).
  - **Немає води**: аквабіоми рендеряться на суходолі так само (проблема #3).
  - `m.isPickable = false` для всіх мешів → **немає тапу/вибору** (проблема #4).
  - Blob-shadow через `DynamicTexture` (без реального shadow-generator).
- `packages/client/src/game/rendering/BiosphereBiome.ts` —
  `getBiosphereBiome(planet)` → `ocean|ice|desert|lava|vegetation|gasGiant|rocky`;
  `getBiospherePalette()` → `{base, highlight, ambient, lightTint}`.
- Вхід: `packages/client/src/App.tsx` — `biosphereTarget: {planet, star}`,
  `<BiosphereView …/>` на `zIndex 12000`, back-button/breadcrumb закривають.

### 1.2 UI-панелі
- `CreatureGenerationPanel.tsx` — вибір 2–4 елементів (порядок = слоти),
  toggle біому, «анімація» = цикл із 3 текстових кроків (`SYNTH_STEP_KEYS`) +
  лінійний progress-bar. Показує превʼю-портрет після відповіді. (проблема #7 —
  надто скромно.)
- `CreatureCareList.tsx` — картки догляду: vitality-бар, feed-popover
  (`CARE_TYPES` → ресурси колонії), evolve на elder, upgrade для `photo_ready`.
- `HybridizationPanel.tsx`, `LineagePanel.tsx`, `creature-vitality.ts`,
  `useBiosphereCareAvailable.ts`.

### 1.3 Клієнтський API
- `packages/client/src/api/creature-api.ts` — типи `BiosphereCreature`,
  `CreatureGenerationStatus` (`queued|generating|ready|failed|photo_ready`),
  `CreatureStage` (`juvenile|adult|elder|legacy`); функції
  `requestCreatureGeneration`, `checkCreatureStatus`, `listPlanetCreatures`,
  `careForCreature`, `evolveCreature`, `hybridizeCreatures`, `upgradeHybrid`.

### 1.4 Серверні endpoints (`api/creatures/*`)
- `generate.ts` — validate combo → quark-gate (перша істота акаунта безкоштовна:
  `countPlayerCreatures === 0 ? 0 : CREATURE_GENERATION_COST_QUARKS`) →
  `generateImageWithGemini` (Nano Banana 2 Lite, 1K) → `createCreatureModelTask`
  (Tripo). **Наразі перша істота ВСЕ ОДНО викликає Gemini+Tripo** — треба
  розвести (проблема #8). Fallback на `photo_ready` при збої Tripo.
- `status.ts` — polling Tripo → `tryStoreGlbFromUrl(glbUrl, 'creature-models')`
  → `status='ready'`. Recovery-timeout `15 хв` → `photo_ready`. Кілька pending
  задач поллятся паралельно (`Promise.allSettled` у `BiosphereView`).
- `care.ts`, `evolve.ts`, `hybridize.ts`, `hybrid-upgrade.ts`, `list.ts`.

### 1.5 Core-логіка (`packages/core/src/game/`)
- `creature-experiment.ts` — `CREATURE_ELEMENTS` (10 елементів: C, Si, Fe, Cu,
  S, P, Se, Li, W, Xe), `SILHOUETTES` (6), `SIZE_CLASSES`
  (`small|medium-sized|large`), `buildExperimentCreatureDescription()`,
  `buildExperimentTraits()`, `validateCreatureElementCombo()`, `CREATURE_BIOMES`.
  **Розмір уже обирається** (SeededRNG), але в description лише як текст — у 3D
  не застосовується.
- `creature-evolution.ts` — vitality (`MAX=100`, `FLOOR=10`, `DECAY=15/добу`,
  `CARE_GAIN=25`), `computeEffectiveVitality()`, `canCareToday()` (UTC-day),
  `computeStageFromCareDays()` (`ADULT=3`, `ELDER=10`), `pickMutations()`,
  `pickHybridTraits()`. Ціни: `OFFSPRING=30`, `HYBRID_PHOTO=15`,
  `HYBRID_FULL=60`, `HYBRID_UPGRADE=50`.

### 1.6 Серверні клієнти/сховище
- `packages/server/src/gemini-client.ts` — `generateImageWithGemini()`,
  `generateImageWithGeminiFromImages()` (multi-image fusion), `moderateMessage()`,
  `moderateShipPrompt()`. Модель `GEMINI_IMAGE_MODEL` (Nano Banana 2 Lite,
  ~$0.0336/зобр).
- `packages/server/src/tripo-client.ts` — `createCreatureModelTask()`
  (`image_to_model`, `faceLimit 5000`, `smart low poly`), `checkModelTask()`,
  `isFinalTripoFailure()`.
- `packages/server/src/glb-storage.ts` — `storeGlbFromUrl()` /
  `tryStoreGlbFromUrl()` → Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
- **`packages/server/src/elevenlabs-tts-client.ts`** — ElevenLabs **TTS**
  (`/v1/text-to-speech/{voice}/stream`). Це НЕ те, що потрібно для голосу істоти.
- **`scripts/sfx/generate.mjs`** — вже викликає **Sound Effects API**
  (`POST /v1/sound-generation`, `model_id: 'eleven_text_to_sound_v2'`,
  `duration_seconds`, `prompt_influence`, `loop`, `output_format`). Це і є
  референс для голосу істоти (проблема #6).
- `packages/server/src/premium-service.ts` — `getServerPremiumStatus(playerId)`,
  `isPremiumActive(status)` (для гейтингу голосу/преміум-фіч).
- `packages/server/src/rate-limiter.ts` — `RATE_LIMITS.generation` (3/хв),
  `creatureCare` (10/хв) тощо.

### 1.7 БД (`creature_models`, міграції 040/041/042)
```
id, player_id, planet_id, name, description, prompt_used, image_url, glb_url,
tripo_task_id, status, quarks_paid, created_at, completed_at,          -- 040
vitality, stage, care_days, last_care_at, generation, parent_id, traits -- 041
parent_b_id, is_hybrid, hybrid_photo_url                                -- 042
```
Індекси: planet+player+created_at, player+created_at, status(partial),
parent_id, stage(planet), parent_b_id. `MAX_CREATURES_PER_PLANET = 3`
(в API-шарі, не в БД).

### 1.8 Наявні асети (перевірено)
- **GLB у репо**: `packages/client/public/raid/carrier_boss.glb`,
  `.../raid/enemy_swarm_ship.glb`, `packages/sci-fi_battleship_3d_model.glb`,
  `packages/sci-fi_fighter_drone_3d_model.glb` — **усі кораблі, жодної істоти**.
- 2D-арт істот (не GLB): `packages/client/public/lifeforms/common/*.webp|webm`
  (61 файл), `packages/client/public/lifeforms/first/photo.webp` + `video.webm`.
- SFX: `packages/client/public/sfx/**`.

---

## 2. Модель даних — міграція `045-creature-biosphere-v2.sql` (тільки SQL)

> Виконати вручну в Neon SQL Editor. **Ніколи не створювати API-endpoint для
> міграцій** (правило CLAUDE.md). Усі колонки `ADD COLUMN IF NOT EXISTS` —
> ідемпотентно, без даунтайму.

**Чи достатньо полів 041 для віку?** Так, для *відображення* віку достатньо
`created_at` (для нащадків це момент їх створення). Але щоб (а) відрізняти
«народження» від службового `created_at`, (б) зберігати детермінований seed
розміру/розміщення, (в) додати голос — потрібна нова міграція. Нову таблицю НЕ
створюємо; розширюємо `creature_models`.

```sql
-- 045-creature-biosphere-v2
-- Розширений модуль істот: розмір, габітат/розміщення, вік, голос (ElevenLabs
-- Sound Effects), модерація імені. Поверх 040/041/042.
-- Запускати вручну в Neon SQL Editor. НЕ через API-endpoint.

ALTER TABLE creature_models
  -- ── Вік (server-authoritative) ──────────────────────────────────────────
  -- Момент "народження". За замовч. = created_at, щоб не зламати наявні рядки.
  ADD COLUMN IF NOT EXISTS born_at TIMESTAMPTZ,

  -- ── Розмір / розміщення (детерміновано від seed) ──────────────────────────
  -- 0.55..1.8 — множник висоти в юнітах сцени (base target 1.4). Обчислюється
  -- на сервері при створенні з recipe+stage+seed; клієнт лише читає.
  ADD COLUMN IF NOT EXISTS size_scale REAL,
  -- Зона габітату для рендера/розміщення: terrestrial | aquatic | amphibious | aerial
  ADD COLUMN IF NOT EXISTS habitat TEXT,
  -- Стабільний індекс "домашнього кутка" (0..MAX-1) — територія на патчі, щоб
  -- істоти не колапсували в центр після reload. NULL → похідне від id.
  ADD COLUMN IF NOT EXISTS spawn_slot SMALLINT,

  -- ── Голос (ElevenLabs Sound Effects) ──────────────────────────────────────
  ADD COLUMN IF NOT EXISTS voice_url TEXT,
  -- none | queued | generating | ready | failed
  ADD COLUMN IF NOT EXISTS voice_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS voice_prompt TEXT,
  ADD COLUMN IF NOT EXISTS voice_generated_at TIMESTAMPTZ,
  -- Скільки разів гравець (пере)генерував голос — для контролю зловживань/ціни.
  ADD COLUMN IF NOT EXISTS voice_gen_count SMALLINT NOT NULL DEFAULT 0,

  -- ── Онбординг / модерація ─────────────────────────────────────────────────
  -- TRUE лише для безкоштовної bundled-стартової істоти (не їла кредити).
  ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  -- pending | approved | rejected — для користувацького імені (rename).
  ADD COLUMN IF NOT EXISTS name_moderation TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS named_at TIMESTAMPTZ;

-- Backfill: born_at = created_at для наявних рядків.
UPDATE creature_models SET born_at = created_at WHERE born_at IS NULL;

-- Голос, який ще "queued/generating" — для відновлення після рестарту.
CREATE INDEX IF NOT EXISTS idx_creature_models_voice_pending
  ON creature_models(voice_status)
  WHERE voice_status IN ('queued', 'generating');

-- Один starter на акаунт — гарантія на рівні даних (частковий унікальний індекс).
CREATE UNIQUE INDEX IF NOT EXISTS uq_creature_models_one_starter
  ON creature_models(player_id)
  WHERE is_starter = TRUE;
```

**Оновити `CreatureModelRow` (`packages/server/src/db.ts`) і `BiosphereCreature`
(`creature-api.ts`)** новими полями; `updateCreatureModel()` — додати voice_*,
size_scale, habitat, spawn_slot, born_at, name_moderation, named_at до
COALESCE-набору.

---

## 3. Вимога #1 — розміщення, рух, колізії, території

### 3.1 Принципи (mobile Babylon, 60fps-friendly у 30fps-cap сцені)
- Жодного фізичного рушія (Ammo/Havok). Тільки детермінований **spatial hash +
  boids-lite separation** у наявному `runRenderLoop` (крок обмежено 30fps).
- Максимум істот на патчі = 3 (`MAX_BIOSPHERE_CREATURES`) + до 3 в майбутньому.
  При такому N spatial hash — надлишок, але залишаємо для стелі 6–8 і гібридів.
- Кожна істота має **домашню територію** (сектор кола за `spawn_slot`) і блукає
  лише в її межах → природний розподіл по кутках, менше перетинів.

### 3.2 Параметри
```
PATCH_SIZE            = 16
TERRITORY_COUNT       = MAX_BIOSPHERE_CREATURES (3)  // секторів кола
TERRITORY_INNER_R     = PATCH_SIZE * 0.12
TERRITORY_OUTER_R     = PATCH_SIZE * 0.40
SEPARATION_GAIN       = 0.9
BOUNDS_MARGIN         = PATCH_SIZE * 0.46            // "стіна" патчу
WALK_SPEED            = 0.6 units/s (terrestrial), 0.9 (aquatic), 0.4 (heavy/W)
IDLE_MIN..MAX         = 2.5 .. 7.0 s
collisionRadius(size) = clamp(0.45 * size_scale, 0.35, 1.3)
```

### 3.3 Спавн (детермінований, без накладання)
```
function spawnPlacement(creature, index):
  slot   = creature.spawn_slot ?? (hash(creature.id) % TERRITORY_COUNT)
  aBase  = (slot / TERRITORY_COUNT) * 2π
  rng    = mulberry32(hash(creature.id))
  angle  = aBase + (rng()-0.5) * (2π / TERRITORY_COUNT) * 0.7   // джиттер у своєму секторі
  radius = lerp(TERRITORY_INNER_R, TERRITORY_OUTER_R, rng())
  home   = (cos(angle)*radius, sin(angle)*radius)
  // Push-out: якщо ближче ніж (rA+rB) до вже розміщеної істоти — відсунути назовні
  for other in placed:
    d = dist(home, other.home)
    minD = collisionRadius(creature) + collisionRadius(other) + 0.2
    if d < minD: home += normalize(home - other.home) * (minD - d)
  return clampToBounds(home)
```

### 3.4 Per-frame рух (spatial hash + separation)
```
grid = SpatialHash(cellSize = 2.0)                 // rebuild щокадру: N≤8, дешево
for c in creatures: grid.insert(c.pos, c)

for c in creatures:
  # 1) ціль-блукання в межах домашньої території
  if now >= c.nextPickAt:
    c.target = c.home + randomInDisc(TERRITORY_OUTER_R * 0.5, rng=c.rng)
    c.nextPickAt = now + rand(IDLE_MIN, IDLE_MAX)
  desired = normalize(c.target - c.pos) * speedFor(c.habitat, c.size_scale)

  # 2) separation від сусідів у радіусі
  push = (0,0)
  for n in grid.neighbors(c.pos, radius = 2.5):
    if n === c: continue
    off = c.pos - n.pos; d = len(off)
    minD = collisionRadius(c) + collisionRadius(n)
    if d < minD and d > 1e-4:
      push += (off / d) * (minD - d) * SEPARATION_GAIN
  vel = desired + push

  # 3) bounds — м'яко відштовхуємось від краю патчу
  if len(c.pos) > BOUNDS_MARGIN: vel -= normalize(c.pos) * 0.5

  # 4) інтеграція + плавний heading
  c.pos += vel * dt
  c.pos.y = terrainHeight(c.pos) + bob(t) + surfaceOffset(c.habitat)   // див. §5
  c.heading = slerpAngle(c.heading, atan2(vel.z, vel.x), 0.12)
  c.mesh.position = c.pos; c.mesh.rotation.y = c.heading
  c.shadow.position = (c.pos.x, groundY+0.01, c.pos.z)
```
- `dt` клампиться (`min(realDt, 1/20)`) щоб після паузи вкладки не було стрибка.
- Детермінізм руху не критичний (це споглядальна сцена), але `c.rng` seeded від
  id → однакова «особистість» істоти між сесіями.

### 3.5 Acceptance (#1)
- 3 істоти ніколи не займають один сектор; центри не ближче ніж
  `rA+rB` протягом ≥ 5 хв спостереження.
- Немає jitter/тремтіння в стані спокою (separation=0 коли d≥minD).
- FPS на mid-phone ≥ 30 (перевірити `SurfacePerfMonitor`/TelemetryView).

---

## 4. Вимога #2 — варіативні розміри

### 4.1 Формула `size_scale` (сервер, при створенні; детерміновано)
```
base by size class (з buildExperimentCreatureDescription): small=0.7, medium=1.0, large=1.4
element modifiers (застосувати за наявними у recipe):
  W  (tungsten) : ×1.35   // масивний
  Fe (iron)     : ×1.12
  Si (silicon)  : ×1.05
  Li (lithium)  : ×0.7    // легкий
  Xe (xenon)    : ×0.85   // буйний/легкий
stage modifier: juvenile ×0.75, adult ×1.0, elder ×1.15
seed jitter: × (0.92 + 0.16 * rng())     // ±8%
size_scale = clamp(base * Πmods * stageMod * jitter, 0.55, 1.8)
```
- Обчислюється в `packages/core` (нова pure-функція `computeCreatureSizeScale(traits, stage, seed)`),
  викликається в `api/creatures/generate.ts`/`evolve.ts`/`hybridize.ts`,
  зберігається у `size_scale`. Для нащадка з мутацією `size: dwarf/gigantic` —
  додатковий множник (×0.7 / ×1.4).
- **Elder-ріст**: коли стадія росте, сервер перераховує `size_scale` (adult→elder)
  у `evolve.ts`/`care.ts` при зміні стадії — щоб істота візуально дорослішала.

### 4.2 Застосування у сцені
- Прибрати жорсткий `targetHeight = 1.4`. Нове:
  `targetHeight = 1.4 * size_scale`; `collisionRadius` і радіус blob-shadow
  масштабуються від `size_scale` (§3.2).
- Клемп висоти після нормалізації, щоб дуже «плоскі» GLB не ставали гігантами:
  фінальний `scale = clamp(targetHeight / bboxHeight, 0.05, 8)`.

### 4.3 Acceptance (#2)
- Дві істоти з W vs Li помітно різняться (≥1.8× висоти).
- Juvenile тієї ж істоти менший за свого elder-нащадка.
- Колізійний радіус візуально відповідає розміру (немає накладань великих істот).

---

## 5. Вимога #3 — біом-aware розміщення й вода

### 5.1 Класифікація габітату (сервер, при створенні)
`habitat` виводиться з recipe+біому у core-функції `deriveHabitat(traits, biome)`:
- `aquatic` — біом `ocean`, або recipe містить `P`(біолюмінесценція)+`Se` у
  водному біомі; фін-подібні ознаки.
- `aerial` — біом `gasGiant` або елемент `Xe` (буйні газові міхури).
- `amphibious` — водний біом, але «сухопутний» силует (quadruped/hexapod).
- `terrestrial` — усе інше (default).

### 5.2 Вода в сцені (тільки для aquatic/amphibious/ocean-біому)
- Додати **водну площину** `MeshBuilder.CreateGround('bioWater', PATCH_SIZE, 1)`
  на висоті `WATER_LEVEL = terrainMax * 0.55`, з напівпрозорим StandardMaterial:
  `alpha = 0.55`, `diffuse = palette.highlight`, `specular` низький,
  `alphaMode = ALPHA_BLEND`, `backFaceCulling = false`.
- **Уникнення z-fighting/оклюзії**: вода `renderingGroupId = 1`, істоти = 0;
  вода `material.needDepthPrePass = true`; істоти під водою рендеряться, бо вода
  напівпрозора. Blob-shadow вимикаємо для повністю занурених.
- **Aquatic розміщення (проти «ховаються під водою»)**: істота плаває на
  `surfaceOffset = WATER_LEVEL - creatureHalfHeight * 0.4` — тобто **тіло на
  видимій мілкій глибині, спина трохи над/на рівні води**, а не лежить на дні.
  Дно (seabed) нижче; істота ніколи не «тоне» у дно.
- **Amphibious**: рухаються між берегом (terrain > WATER_LEVEL) і мілиною;
  `home` у зоні переходу.
- **Aerial (gasGiant/Xe)**: `surfaceOffset = +2.0..+3.5`, легкий вертикальний
  дрейф; терен-патч затемнений/туманний.

### 5.3 Камера
- Для aquatic-домінантних планет камера трохи опускає `beta` (менш зверхній
  кут), `lowerRadiusLimit` ближче, щоб було видно приповерхневий шар води.
- Клеар-колір і туман від `palette.ambient` (як зараз).

### 5.4 Acceptance (#3)
- На ocean-планеті аквастворіння видно на мілині (тіло над дном, ≥50% силуету
  над рівнем води або крізь напівпрозору воду).
- Немає z-fighting води/терену/істоти на mid-phone (перевірити 3 біоми).
- Сухопутні на тій самій планеті — на берегових ділянках, не у воді.

---

## 6. Вимога #4 — тап/вибір + детальна модалка

### 6.1 Picking
- Увімкнути `isPickable = true` для кореневого меша істоти (додати невидимий
  `pickBox` — bounding-box дитина, щоб тап по «порожнечі» силуету теж працював).
- `scene.onPointerObservable` (POINTERTAP) → `scene.pick` → знайти
  `creatureId` через мапу мешів → `setSelectedCreatureId(id)`.
- Тап по воді/терену → знімає вибір. Haptic tap (наявний `SfxPlayer`).

### 6.2 Модалка `CreatureDetailModal.tsx` (нова)
Full-screen overlay (`zIndex 12100`, над сценою), safe-area padding, monospace,
палітра Game Bible. Секції:

1. **Ізольований 3D-в'ювер** (верхня третина):
   - Окремий `Engine`+`Scene`+`ArcRotateCamera`, вантажить `glb_url` через
     `SceneLoader.ImportMeshAsync` (переюз патерну поточного `BiosphereView` /
     `SurfaceBabylonView`). Rotate/zoom (drag+pinch). Автоспін коли idle.
   - Fallback-каскад: `glb_url` → якщо немає, **портрет** (`image_url`) як плоский
     `Plane` з текстурою АБО процедурна Babylon-істота (§9.4) → якщо і його немає,
     статичний `<img>`.
   - Кнопка «Play voice» (§8) — якщо `voice_url` є, HTML5 `<audio>`; інакше кнопка
     «Згенерувати голос».
2. **Ім'я + rename** (inline-редагування, олівець):
   - `t('biosphere.detail.rename')`, input (обмеження 24 символи), i18n-плейсхолдер.
   - Submit → `POST /api/creatures/rename` (§10.1) з клієнтським `quickModerate`
     + серверним `moderateMessage`. Стан `name_moderation`.
3. **Характеристики** (компактний grid):
   - Traits (елементний рецепт з `traits` category `element` + мутації),
     `description`, біом/габітат, покоління/лінія (parent/parent_b),
     vitality-бар, **вік** (§7), стадія.
4. **Дії/догляд** (без клатеру): «Погодувати» (переюз `careForCreature`),
   «Нове покоління» (elder), «Голос», «Схрестити» (deep-link у HybridizationPanel).
   Показувати лише релевантні (як зараз у `CreatureCareList`).

### 6.3 UX-нотатки
- Одна активна модалка; ESC/back закриває (додати до back-button ланцюга в
  App.tsx після biosphere).
- В'ювер модалки **повністю dispose** при закритті (окремий Babylon-engine — не
  чіпає головну сцену).
- Виділена істота у головній сцені — легкий rim/emissive highlight (без нового
  матеріалу: тимчасово `mesh.renderOutline = true`, `outlineColor` = accent).

### 6.4 Acceptance (#4)
- Тап по істоті відкриває модалку тієї істоти (не сусідньої) у 100% випадків на
  тач-екрані.
- В'ювер обертається/зумиться; при відсутності GLB показує портрет/процедурний
  fallback без білого екрану.
- Rename з нецензурним словом → відхилено (moderation), toast з причиною.

---

## 7. Вимога #5 — вік (server-authoritative)

### 7.1 Модель
- **Джерело істини**: `born_at` (TIMESTAMPTZ, DEFAULT = created_at). Для нащадка/
  гібрида — момент їх створення (окремий рядок).
- **Derived display age** (клієнт, без записів): `ageMs = now - born_at`. Формат:
  `< 1 год` → «щойно вилупилась»; години; дні; тижні (i18n).
- **Стадії** (`juvenile/adult/elder/legacy`) лишаються прив'язані до `care_days`
  (гейплейна прогресія доглядом), але у детальній модалці показуємо **і** стадію,
  **і** календарний вік — це різні речі й це нормально (вік = скільки живе;
  стадія = наскільки доглянута/розвинена).
- **Офлайн-час**: уже коректно — `computeEffectiveVitality()` рахує безперервний
  занепад від `last_care_at ?? born_at`. Жодних per-frame чи per-tick записів у БД.
- **Антічіт**: вік і vitality рахуються від СЕРВЕРНИХ timestamp'ів; клієнтський
  годинник ніколи не пише в БД (care/evolve валідуються на сервері за
  `NOW()`/UTC-day, як зараз у `careForCreature`).

### 7.2 Чи потрібна нова міграція для віку?
- Технічно `created_at` достатньо для показу віку. **Але** ми все одно робимо
  міграцію 045 для розміру/голосу/розміщення, тож додаємо `born_at` там —
  це прибирає двозначність `created_at` (службовий момент рядка) vs
  «народження» й спрощує майбутні фічі (напр. «день народження» істоти).

### 7.3 Acceptance (#5)
- Закрити гру на добу → при поверненні вік виріс на ~1 добу, vitality впала за
  формулою (без стрибків, без записів у БД під час офлайну).
- Зміна годинника пристрою вперед НЕ змінює вік/vitality (усе від сервера).
- Нащадок має власний вік від моменту народження, не успадковує вік батька.

---

## 8. Вимога #6 — голос істоти (ElevenLabs Sound Effects)

### 8.1 Рішення про endpoint/модель (grounded у коді)
- **API**: `POST https://api.elevenlabs.io/v1/sound-generation` — уже
  використовується у `scripts/sfx/generate.mjs`. Це **Sound Effects**, тобто
  невербальна вокалізація (рик/щебет/стрекіт), а **не** TTS. Правильний вибір
  за ТЗ.
- **Модель**: `eleven_text_to_sound_v2` (як у скрипті). `duration_seconds`
  кламп `min(30, max(0.5, N))`; для нас `≈ 10`. `prompt_influence ≈ 0.4`.
  `output_format = mp3_44100_128`.
- **Синхронність**: виклик повертає mp3-байти одразу (не задача з polling, як
  Tripo). Тож генеруємо в межах одного serverless-виклику
  (`config.maxDuration = 30`) і одразу вантажимо у Blob. Поле `voice_status`
  все одно тримаємо (`queued→generating→ready/failed`) для durable-стану й UI,
  але «generating» короткочасний.
- **Env**: перевикористати наявний `ELEVENLABS_API_KEY`. Додати опційний
  `ELEVENLABS_SFX_MODEL` (default `eleven_text_to_sound_v2`). Документувати у
  `.env.local.example`.

### 8.2 Prompt-builder (сервер, `packages/server/src/creature-voice-prompt.ts`)
Гравець НЕ вводить текст. Промпт будується з traits/біому/розміру:
```
buildCreatureVoicePrompt(creature):
  sizeWord   = size_scale >=1.4 ? 'large deep' : size_scale <=0.75 ? 'small high-pitched' : 'medium'
  timbre     = елементні акценти:
               P/Se → 'ethereal, resonant, slightly electronic';
               W/Fe → 'guttural, heavy, metallic rumble';
               Si   → 'crystalline, chittering';
               S    → 'sharp, rasping warning call';
               Li/Xe→ 'light, airy, whistling'
  habitatFx  = aquatic → 'wet, bubbling, underwater tone';
               aerial  → 'windy, breathy';
               else    → 'earthy, organic'
  return `A single ${sizeWord} alien creature vocalization: a short ${timbre}
          call/${habitatFx}. Non-verbal animal-like sound, no words, no music,
          no human voice. Naturalistic, one creature, ~10 seconds.`
```
- Детермінований (без rng), тож повтор дає узгоджений «характер».

### 8.3 Потік і durable-сховище
```
POST /api/creatures/voice/generate { creatureId }
  auth → own creature → перевірки:
    - voice_status == 'ready' і voice_url → 200 { status:'ready', voiceUrl } (idempotent, без витрат)
    - rate-limit RATE_LIMITS.creatureVoice (напр. 3/10хв)
    - voice_gen_count >= MAX_VOICE_REGEN (напр. 3) і не premium → 403 'voice_regen_limit'
  set voice_status='generating', voice_prompt=build(...)
  audio = elevenLabsSoundGeneration(prompt, {durationSeconds:10, ...})   // синхронно
  blob  = put(`creatures/voice/${creatureId}-${ts}.mp3`, audio, public, audio/mpeg)
  update voice_url=blob.url, voice_status='ready', voice_generated_at=NOW(), voice_gen_count+=1
  → 200 { status:'ready', voiceUrl }
  на помилку: voice_status='failed'; refund не потрібен (див. §8.4 щодо ціни)

GET /api/creatures/voice/status?id=  → { voiceStatus, voiceUrl }
```
- **Кешування/ідемпотентність**: якщо `voice_url` є — не генеруємо повторно (хіба
  явний regen). Одна доріжка на істоту. Blob-URL персистентний.
- **Retry/timeout**: `fetchWithTimeout` (як у ElevenLabs-клієнті). При 429/5xx —
  1 ретрай; далі `failed`, гравець може повторити вручну.
- **Клієнт**: новий `packages/server/src/elevenlabs-sfx-client.ts`
  (`generateCreatureVoice()`), новий `api/creatures/voice/generate.ts` +
  `status.ts`, клієнтські `requestCreatureVoice()` / `checkCreatureVoice()` у
  `creature-api.ts`. Кнопка Play/Generate у `CreatureDetailModal`.

### 8.4 Вартість / зловживання
- ElevenLabs тарифікує Sound Effects за кредитами (приблизно пропорційно
  тривалості; ~100 credits за генерацію ≈ частки–одиниці центів залежно від
  плану — **потребує звірки в дашборді ElevenLabs перед релізом**).
- Контроль: rate-limit + `voice_gen_count` кап (3 бесплатних (пере)генерації;
  далі лише Premium Alpha або за кварки). Один голос на істоту кешується назавжди.

### 8.5 Acceptance (#6)
- Кнопка «Голос» на істоті без голосу → за кілька секунд зʼявляється
  програвач; повторний тап Play програє кешований mp3 без нового виклику API.
- Гравець не бачить і не вводить промпт.
- Другий виклик generate для істоти з `voice_url` не витрачає кредити.

---

## 9. Вимога #8 — перша істота безкоштовна, БЕЗ Gemini/Tripo

### 9.1 Факт: придатної GLB немає
Перевірено весь `packages/client/public/**` і репо: **жодної GLB-моделі істоти**.
Є лише кораблі (`raid/carrier_boss.glb`, `raid/enemy_swarm_ship.glb`,
`packages/sci-fi_battleship_3d_model.glb`, `packages/sci-fi_fighter_drone_3d_model.glb`)
— візуально й тематично непридатні як «істота». Найближчий 2D-асет:
`packages/client/public/lifeforms/first/photo.webp` (+ `video.webm`) та
`lifeforms/common/*.webp` — але це не 3D.

**Висновок**: стартову істоту треба або (A) один раз «запекти» у GLB і закомітити,
або (B) рендерити процедурно. Рекомендація — **зробити обидва**: bundled GLB як
основний шлях + процедурний fallback.

### 9.2 Рекомендований підхід — «запечена» стартова істота
- Новий офлайн-скрипт `scripts/starter-creature/generate.mjs` (аналог
  `scripts/sfx/generate.mjs` / `onboarding-voice`): один раз локально проганяє
  наявний pipeline (Gemini портрет → Tripo GLB) для **однієї канонічної**
  «дружньої стартової» істоти, завантажує GLB, і кладе у репо:
  ```
  packages/client/public/creatures/starter/starter.glb
  packages/client/public/creatures/starter/starter.webp     (портрет)
  packages/client/public/creatures/starter/starter.json     (детермінована метадата)
  ```
- `starter.json` (детермінований, комітиться): `description`, `traits`
  (напр. рецепт `['C','P']` — органічна біолюмінесцентна), `habitat`,
  `size_scale`, `biome-neutral`. Це фіксована метадата, однакова для всіх гравців.
- Бюджет: GLB через ту саму Tripo-конфігурацію (`faceLimit 5000`) → вкладається
  у бюджет сцени. Розмір < ~1.5MB (перевірити; за потреби Draco-компресія).

### 9.3 Рантайм-потік стартової істоти (без AI-викликів)
```
POST /api/creatures/starter { planetId }
  auth → перевірки:
    - has starter (uq index) → 409 'starter_exists'
    - countPlayerCreatures(player) == 0  (starter лише як перша істота акаунта)
    - planet active count < MAX
  read STATIC starter.json (сервер має копію в @nebulife/server або core-const)
  createCreatureModel({
    id, planetId, description, traits, status:'ready',
    image_url: `${ASSET_ORIGIN}/creatures/starter/starter.webp`,
    glb_url:   `${ASSET_ORIGIN}/creatures/starter/starter.glb`,
    quarksPaid: 0, is_starter: true, size_scale, habitat, born_at: NOW()
  })
  → 200 { creatureId, status:'ready', glbUrl, imageUrl }
```
- **Жодного Gemini/Tripo/Blob-виклику** — GLB роздається як статичний публічний
  асет клієнта (той самий origin, що й інші `public/` файли; Babylon вантажить
  локальний URL). `is_starter=true` виключає з лічильника витрачених кредитів.
- **UI-онбординг**: у `CreatureGenerationPanel`, коли `priorCreatures === 0`,
  показувати окрему картку «Отримати стартову істоту (безкоштовно)» → викликає
  `/api/creatures/starter`, а НЕ `/generate`. Елементний експеримент (з Gemini/
  Tripo) — для 2-ї+ істоти. Бейдж «Onboarding specimen» у деталях.

### 9.4 Процедурний fallback (обов'язковий)
- Якщо `starter.glb` не завантажився (стара WebView / офлайн-асет відсутній) —
  Babylon-процедурна істота з примітивів (`CreateSphere` тіло + `CreateCapsule`
  кінцівки + emissive plP-glow), зібрана детерміновано з `traits`. Це також
  універсальний fallback для будь-якої істоти без GLB (переюз у §6.2).
- Функція `buildProceduralCreature(scene, traits, size_scale)` у
  `packages/client/src/game/rendering/ProceduralCreature.ts` (нова). Тільки
  Graphics-примітиви, без текстур/спрайтів (правило CLAUDE.md).

### 9.5 Acceptance (#8)
- Новий акаунт: перша істота отримується миттєво, **без** мережевих викликів до
  Gemini/Tripo (перевірити у Network / серверних логах — 0 звернень до провайдерів).
- 2-га істота йде звичайним елементним pipeline.
- `is_starter` істота видно у Біосфері, має портрет і 3D, коштувала 0⚛.

---

## 10. Вимога #4/#5 — контракти API (нові/змінені)

### 10.1 Rename
```
POST /api/creatures/rename
  Auth: Bearer
  Body: { creatureId: string, name: string }   // name: 1..24 chars, trimmed
  Server:
    - auth own creature (403 інакше)
    - quickModerate(name) (packages/server/src/text-moderation.ts) → одразу reject
    - moderateMessage({content:name,...}) (Gemini) → approved/rejected
    - update name, name_moderation, named_at
  200: { creature }                              // з оновленим name/name_moderation
  400 'name_invalid' | 403 'forbidden' | 422 'name_rejected'
  Rate-limit: reuse RATE_LIMITS.feedback-подібний (5/год) або новий creatureRename.
```

### 10.2 Starter specimen
```
POST /api/creatures/starter
  Auth: Bearer
  Body: { planetId: string }
  200: { creatureId, status:'ready', glbUrl, imageUrl }
  409 'starter_exists' | 400 'not_first_creature' | 400 'planet_full'
```

### 10.3 Voice
```
POST /api/creatures/voice/generate  Body: { creatureId }
  200: { status:'ready', voiceUrl } | { status:'failed', reason }
  403 'voice_regen_limit' | 402 (якщо платна регенерація) | 429
GET  /api/creatures/voice/status?id=<creatureId>
  200: { voiceStatus, voiceUrl }
```

### 10.4 Age/care (зміни, не нові)
- `list.ts`/`status.ts` — додати у відповідь `born_at`, `size_scale`, `habitat`,
  `spawn_slot`, `voice_url`, `voice_status`, `name_moderation`.
- `care.ts`/`evolve.ts` — при зміні стадії перераховувати `size_scale`
  (adult→elder ×1.15) через core-функцію; вік не чіпають.

---

## 11. Вимога #7 — анімація процесу генерації

### 11.1 Стадії (чесно привʼязані до async-станів)
Заміна поточного 3-текстового циклу на **staged lab sequence** (усе процедурне —
CSS keyframes/Canvas/Pixi Graphics, без текстур-спрайтів):

| Стадія | Тригер (реальний стан) | Візуал |
|---|---|---|
| 1. Reaction | POST /generate надіслано | елементні «частинки» (obраний рецепт) злітаються в центр колби, пульс кольору за елементами |
| 2. Silhouette | відповідь `imageUrl` є | силует проявляється (radial mask reveal портрета) |
| 3. Reconstruct | `status==generating` (Tripo) | wireframe/voxel «збірка» поверх силуету, progress = Tripo `progress` (0–100) |
| 4. Reveal | `status==ready` (glb_url) | спалах, портрет→3D, істота «оживає» |
| photo_ready | Tripo впав | стадія 3 гасне, повідомлення «Портрет збережено, 3D пізніше» (без фейкового прогресу) |
| failed | помилка | чесне повідомлення + refund-нотатка |

### 11.2 Реалізація
- Компонент `CreatureGenerationCinematic.tsx` (новий), рендер поверх панелі.
- **Прогрес чесний**: етап 3 показує реальний Tripo `progress` з `status.ts`
  (він уже повертається). Немає «фейкового» до 99%. Поки `imageUrl` немає —
  indeterminate-пульс, не проценти.
- **Timeout/fallback**: після `GENERATION_RECOVERY_TIMEOUT_MS` (15 хв, уже є) або
  provider-помилки — перехід у стан photo_ready/failed із чесним копірайтом.
- **Perf**: усе на CSS-трансформаціях/Canvas 2D; ≤ ~30 елементів; поважати
  `PerfTierSelectScreen` (на `low` — спрощена версія: fade без частинок).
- Правило CLAUDE.md: жодних текстур/спрайтів — тільки процедурна графіка;
  monospace; палітра Bible.

### 11.3 Acceptance (#7)
- Прогрес-бар на стадії 3 рухається синхронно з реальним Tripo `progress`.
- При збої Tripo анімація не «зависає на 99%», а чесно переходить у photo_ready.
- На low-tier сцена не лагає (проста версія).

---

## 12. Вимога #9 — привʼязка до планети, ліміти, конкурентність

- **Вже реалізовано**: `planet_id` + `listCreaturesByPlanet(planetId, playerId)`
  → істоти видно лише в Біосфері своєї планети. `MAX_CREATURES_PER_PLANET = 3`
  (active = не failed/legacy/photo_ready).
- **Конкурентна генерація**: `BiosphereView` уже поллить кілька `pendingCreatureIds`
  паралельно (`Promise.allSettled`) — залишаємо, воно вкриває одночасні задачі.
- **Бюджет продуктивності (mid-phone)** — підтвердити/зберегти з NEXT_GEN_PLAN §C:
  - ≤ 3 (стеля 6) істот × ≤ 5000 трикутників; терен ≤ 8k; вода 1 quad.
  - 1 directional + 1 hemispheric light; blob-shadow (без реальних тіней).
  - 30fps cap; повний `dispose` при виході (вже є).
  - Ліниве завантаження GLB (вже через `SceneLoader.ImportMeshAsync`), Blob-URL.
- **Стеля масштабування**: якщо колись >3 — spatial hash (§3) вже готовий;
  ліміт лишається продуктовим рішенням, не технічним.

---

## 13. Вимога #10 — монетизація / економіка

| Пункт | Рекомендація |
|---|---|
| Стартова істота | **безкоштовна, bundled, 0 AI-викликів** (§9). Онбординг wow. |
| 2-га+ істота (фото+3D) | як зараз: `CREATURE_GENERATION_COST_QUARKS = 60⚛`. |
| Нащадок / гібрид | без змін: 30 / 15 (photo) / 60 (full) / 50 (upgrade) ⚛. |
| **Голос** | **включений безкоштовно** для 1-ї генерації на істоту (3 (пере)генерації сумарно); далі — Premium Alpha безлімітно або 5⚛ за regen. Голос дешевий (ElevenLabs SFX), тож безкоштовний перший — сильний retention/шер-хук, як «перше фото безкоштовно». |
| Rename | безкоштовно (модерація захищає). |
| **Premium Alpha** | безлімітні regenʼи голосу; без watermark на шер-картках істоти; можливо +1 слот істоти на планету (4-й) — узгодити з бюджетом рендера. |

**Оцінки вартості (grounded, з застереженнями):**
- Gemini портрет: ~**$0.0336/зобр** (Nano Banana 2 Lite, з `.env.local.example`).
- Tripo модель: ~**$0.25–0.45/істоту** (з NEXT_GEN_PLAN §C).
- ElevenLabs Sound Effects: **кредитна** тарифікація (~пропорційно тривалості;
  орієнтовно частки–одиниці центів за 10с) — **звірити в дашборді перед релізом**.
- Отже собівартість повної істоти ≈ **$0.28–0.49** + голос → 60⚛ покриває із
  запасом (за поточним курсом кварків); стартова — $0 (bundled).

---

## 14. Пріоритезовані фази + acceptance

### Фаза 0 — Дані й фундамент (0.5 тижня)
- Міграція `045` (§2); оновити `CreatureModelRow`/`BiosphereCreature`/
  `updateCreatureModel`; core-функції `computeCreatureSizeScale`, `deriveHabitat`,
  `born_at` у create-потоках.
- **AC**: міграція застосована в Neon; наявні істоти отримали `born_at`,
  `size_scale` (backfill за traits), `habitat`; типи компілюються.

### Фаза 1 — Рух, розмір, території, вода (1 тиждень)  ← найпомітніший фікс
- §3 spatial-hash+separation; §4 size_scale у сцені; §5 вода + habitat placement.
- **AC**: §3.5, §4.3, §5.4. Без регресу FPS.

### Фаза 2 — Вибір + детальна модалка + rename (1 тиждень)
- §6 picking, `CreatureDetailModal`, ізольований в'ювер, `/api/creatures/rename`,
  вік у деталях (§7), процедурний fallback (§9.4).
- **AC**: §6.4, §7.3, §10.1.

### Фаза 3 — Стартова істота bundled (0.5–1 тиждень)
- `scripts/starter-creature/generate.mjs`, комміт асетів, `/api/creatures/starter`,
  онбординг-картка у панелі.
- **AC**: §9.5.

### Фаза 4 — Голос ElevenLabs SFX (0.5–1 тиждень)
- `elevenlabs-sfx-client.ts`, `creature-voice-prompt.ts`,
  `api/creatures/voice/{generate,status}.ts`, кнопка у модалці, rate-limit+cap.
- **AC**: §8.5.

### Фаза 5 — Кінематографічна генерація (0.5 тижня)
- `CreatureGenerationCinematic` (§11), чесний прогрес, perf-tier.
- **AC**: §11.3.

> Порядок обрано так, щоб найболючіші візуальні баги (#1–#3) вийшли першими й
> дали wow-контент; голос/кінематика — поліш.

---

## 15. Тест-план

- **Unit (core, Vitest — поряд з `creature-evolution.test.ts`)**:
  `computeCreatureSizeScale` (клемпи, елементні модифікатори, стадії),
  `deriveHabitat`, вік-форматер, `buildCreatureVoicePrompt` (детермінізм),
  separation-математика (два кола не накладаються).
- **API (інтеграційні)**: `/starter` (409 при повторі — uq index),
  `/rename` (moderation reject), `/voice/generate` (idempotent при `ready`,
  cap при `voice_gen_count`), `/generate` (перша істота ≠ starter шлях).
- **Сцена (ручні на mid-phone, Browser DevTools MCP на dev)**: FPS ≥30 з 3
  істотами; немає накладань 5 хв; вода без z-fighting у ocean/ice/lava; тап
  відкриває коректну істоту; модалка dispose без витоку памʼяті (кілька
  відкриттів).
- **Регрес**: care/evolve/hybridize/upgrade незмінні; multi-poll кількох задач;
  `photo_ready` fallback; back-button/breadcrumb закривають модалку і сцену.
- **Офлайн-час**: мок годинника → вік/vitality від сервера, не від клієнта.

---

## 16. Ризики, rollback, fallback

| Ризик | Мітигація / rollback |
|---|---|
| Нестабільність Tripo-рігінгу/моделі | вже: `photo_ready` fallback + refund; процедурний fallback у в'ювері (§9.4). |
| Tripo-URL тимчасові | вже: `tryStoreGlbFromUrl` → Blob. |
| Стартовий GLB завеликий/не грузиться | Draco-компресія; процедурний fallback; feature-flag `STARTER_CREATURE_ENABLED`. |
| ElevenLabs ліміт/ціна/зловживання | rate-limit + `voice_gen_count` cap + кеш `voice_url`; kill-switch env `CREATURE_VOICE_ENABLED=0` → кнопка ховається. |
| Модерація імені (образливі) | quickModerate + Gemini `moderateMessage`; `name_moderation='rejected'` не показується. |
| Перф-просідання на low-tier | 30fps cap, спрощена кінематика, стеля істот=3, `PerfTierSelectScreen`. |
| Провал міграції 045 | усі `IF NOT EXISTS`; endpoints уже мають 503-детект «migration not installed» — розширити на нові поля (як у `care.ts` code `42703`). |
| Z-fighting води | `renderingGroupId`+`needDepthPrePass`; фіча-флаг вимикає воду → істоти на суходолі (поточна поведінка). |

**Загальний rollback-принцип**: кожна нова підсистема за окремим env-флагом
(`STARTER_CREATURE_ENABLED`, `CREATURE_VOICE_ENABLED`, `BIOSPHERE_WATER_ENABLED`).
Вимкнення повертає поточну (V1) поведінку без міграції назад.

---

## 17. Реєстр модулів — оновлення (після реалізації)

Оновити `GAME_MODULES.md` (розділ AI-контент): рядок «Biosphere creatures (3D)»
→ згадати рух/території/розмір/воду/вибір/голос/стартову істоту; додати підрядок
«Голос істоти (ElevenLabs SFX)». Оновити «Останнє оновлення реєстру».
