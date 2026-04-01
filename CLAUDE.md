# Nebulife — Інструкція для розробки

> **ОБОВ'ЯЗКОВО** прочитай `GAME_BIBLE.md` та `GAME_DESIGN.md` перед будь-якою зміною коду.
> Якщо не впевнений як щось зробити — звіряйся з Біблією гри.

---

## Розподіл моделей (Model Routing)

| Задача | Модель |
|---|---|
| Планування, аналіз архітектури, технічні завдання, Plan-агенти | **opus** |
| Програмування, написання коду, пошук в інтернеті, аналіз зображень | **sonnet** |
| Швидкий пошук по файлах, прості запити | **haiku** |

При запуску Agent tool завжди вказувати відповідну модель через параметр `model`.

---

## Ключові правила

- **Шрифт**: ТІЛЬКИ `monospace` (ніколи sans-serif/serif)
- **Кольори**: ТІЛЬКИ з палітри Game Bible (темний космос, приглушені тони)
- **Без емодзі** в коді та UI
- **Все процедурне** через PixiJS Graphics API (без текстур/спрайтів)
- **Мова інтерфейсу**: i18n (uk/en) через react-i18next. Ніколи НЕ хардкодити текст:
  - React компоненти: `useTranslation()` → `t('key')` (з `locales/uk.json` + `locales/en.json`)
  - PixiJS сцени: `tStatic('key')` з `i18n/LanguageProvider.ts` (з `i18n/uk.ts` + `i18n/en.ts`)
  - Перед додаванням нового тексту — додати ключ в ОБА файли перекладу
  - localStorage ключ мови: `nebulife_lang` (НЕ `nebulife_language`)
  - Прапорець вибору мови: `nebulife_lang_chosen` = '1'
- **Детермінізм**: один seed → ідентичний результат (SeededRNG)
- **60fps**: статична геометрія рендериться раз, per-frame тільки позиції та alpha
- **Parallax backgrounds заборонені** — конфліктує з CameraController
- **DB міграції**: Ніколи НЕ створювати API endpoints для міграцій. Тільки SQL код для Neon SQL Editor
- **Деплой**: Push лише до `main` branch для production

---

## Архітектура

```
nebulife/
├── packages/
│   ├── core/          # Headless: типи, генерація, фізика, хімія, біологія, Delaunay
│   ├── client/        # PixiJS v8 + React UI + i18n (react-i18next)
│   └── server/        # Серверні функції: Neon DB, Kling API, Tripo API, ClusterManager
├── api/               # Vercel serverless endpoints
├── GAME_BIBLE.md      # Біблія гри — правила, стиль, баланс
└── GAME_DESIGN.md     # Дизайн-документ — сюжет, механіки, фізика
```

**Імпорти**:
- `@nebulife/core` — типи, генератори, утиліти (через package exports з index.ts)
- `@nebulife/server` — DB функції, API клієнти (через package exports з index.ts)
- API endpoints імпортують з `@nebulife/server` (НЕ з прямих шляхів `@nebulife/server/src/...`)

---

## i18n — Двомовна система (uk/en)

**Дві паралельні системи перекладів** (обидві активні):

### 1. react-i18next (основна, для React компонентів)
- **Ініціалізація**: `packages/client/src/i18n/index.ts` — i18next + LanguageDetector
- **Переклади**: `packages/client/src/i18n/locales/uk.json` + `en.json` (~970 рядків кожен)
- **Використання**: `const { t } = useTranslation()` → `t('nav.galaxy')`
- **localStorage**: `nebulife_lang` (auto-detected + manual selection)

### 2. Custom LanguageProvider (для PixiJS + backward compat)
- **Файли**: `i18n/LanguageProvider.tsx` + `i18n/uk.ts` + `i18n/en.ts`
- **Використання**: `tStatic('pixi.researched')` в GalaxyScene.ts, SurfaceScene.ts
- **React**: `const { t } = useT()` (альтернатива useTranslation)

### Вибір мови
- `LanguageSelectScreen.tsx` — показується при першому запуску (`nebulife_lang_chosen !== '1'`)
- При виборі: `localStorage.setItem('nebulife_lang', lang)` + `i18n.changeLanguage(lang)`
- Зміна мови в PlayerPage (settings)

---

## Візуальний стиль (квік-референс)

| Призначення | Значення |
|---|---|
| Deep space background | `#020510` |
| Panel background | `rgba(10,15,25,0.92)` |
| CommandBar background | `rgba(5,10,20,0.92)` + `backdrop-filter: blur(12px)` |
| Primary text | `#aabbcc` |
| Secondary text | `#8899aa` |
| Muted text | `#667788` |
| Primary border | `#334455` |
| Active border | `#446688` |
| Semantic green (life) | `#44ff88` |
| Semantic orange (warning) | `#ff8844` |
| Semantic red (danger) | `#cc4444` |
| Accent blue | `#4488aa` / `#7bb8ff` |
| Border-radius | 3px (кнопки), 4px (панелі), 6px (меню/модалі) |

---

## Макро-архітектура галактики

```
Галактика (спіраль з 5 рукавів, SMBH по центру)
  └─ Galaxy Group / Cluster (50 гравців + 1,450 зірок)
        ├─ Core Zone: 500 систем (K=4 mesh, depth 0-12)
        │    ├─ 50 entry stars (по 1 на гравця, depth 0)
        │    └─ 450 NPC-систем (Delaunay + BFS навігація)
        └─ Player Rings: 950 систем (50 × 19)
             ├─ Ring 0: 1 home system
             ├─ Ring 1: 6 систем (5 LY)
             └─ Ring 2: 12 систем (10 LY, connects to neighbors + core)
```

**Ключові файли генерації**:
- `galaxy-group-generator.ts` — 500 core систем + `generateCoreStarSystem()`
- `galaxy-topology.ts` — player positions (golden-angle spiral)
- `galaxy-map.ts` — `assignPlayerToGroup()`, `computeGroupPosition()`
- `delaunay.ts` — Bowyer-Watson Delaunay triangulation
- `galaxy-generator.ts` — `generatePlayerRings()` (19 систем на гравця)
- `UniverseEngine.ts` — Three.js 3D візуалізація (galaxy + cluster LOD)
- `GalaxyScene.ts` — PixiJS 2D galaxy (personal + neighbor + core systems)
- `GameEngine.ts` — `computeNeighborSystems()`, `computeCoreSystems()`, `getAllSystems()`
- `cluster-manager.ts` — server-side cluster assignment

**Прогресія гравця по зонах**:
1. **Фаза 1 (L1-10)**: 19 особистих систем
2. **Фаза 2 (L10-20)**: Сусідні гравці (ast-probe L16 відкриває доступ)
3. **Фаза 3 (L20-35)**: Core Zone (500 систем, depth 0-12)
4. **Фаза 4 (L35-50)**: Deep Core + ендгейм

---

## Баланс (актуальний)

| Параметр | Значення |
|---|---|
| XP крива | `gap(L) = floor(100 * L^1.3)`, L50 = 359,474 XP |
| XP за дослідження | Ring 0-1: 30, Ring 2: 50, Neighbor: 100, Core: 200-500 |
| XP за сесію | +5 за кожну сесію |
| Research Data стартовий | 100 одиниць |
| Ring 2 min progress | 4% (worst case 25 сесій) |
| canStartResearch() | `maxRingOverride` з тех-дерева (ast-probe +1) |
| Observatories | L1: 3, L12: 4, L20: 5, L36: 6 |
| Speed multipliers | 0.9 × 0.85 × 0.8 × 0.8 = 0.49 (at L41) |

---

## Навігація гравця (5 рівнів)

```
Home Intro → Galaxy → System → Planet View → Surface
     ↑           ↑        ↑          ↑
     └───────────┴────────┴──────────┘ (breadcrumbs назад)
```

**CommandBar** (нижня панель) — наскрізний елемент на всіх рівнях:
- Ліва секція: breadcrumbs навігації
- Центральна секція: інструменти сцени (змінюються по рівню)
- Права секція: кварки + ім'я гравця

---

## Поточний стан реалізації

| Фіча | Статус |
|---|---|
| Кварки — ігрова валюта + MonoPay | Реалізовано |
| AI-поверхня — Kling генерація + процедурний fallback | Реалізовано |
| 3D моделі — Tripo pipeline + Babylon.js viewer | Реалізовано |
| Дослідження — обсерваторії, прогресивне розкриття | Реалізовано |
| Discoveries — Kling фото + pixel reveal + наукові звіти | Реалізовано |
| CommandBar — уніфікована нижня панель управління | Реалізовано |
| Космічна Академія — квести, вікторини, щоденні уроки | Реалізовано |
| i18n — двомовна система uk/en | Реалізовано |
| ClusterManager — серверне управління кластерами по 50 гравців | Реалізовано |
| Galaxy expansion — Delaunay, core StarSystem, neighbor/core в GalaxyScene | Реалізовано |
| XP ребаланс — L^1.3 крива, ring-scaled XP, session XP | Реалізовано |
| Weekly Digest — Gemini AI news + bilingual images | Реалізовано |
| A.S.T.R.A. Chat — AI assistant з Gemini | Реалізовано |
| Surface — ізометрична поверхня, ресурси, будівлі, колонія | Реалізовано |
| Tech Tree — 50 нод, 4 гілки (astro/physics/chem/bio) | Реалізовано |
| Universe View — Three.js 3D galaxy + cluster zoom | Реалізовано |

---

## API (зовнішні сервіси)

| Сервіс | Endpoint | Auth | Використання |
|---|---|---|---|
| Kling | `api.klingai.com/v1` | JWT HS256 | AI фото генерація |
| Tripo | `api.tripo3d.ai/v2` | Bearer token | 3D моделі GLB |
| Gemini | Google AI SDK | API key | Lessons, quizzes, digest, ASTRA chat, moderation |
| Neon | PostgreSQL | Connection string | Все серверне |
| Firebase | Auth + FCM | Config | Авторизація + push notifications |

---

## DB таблиці (Neon PostgreSQL)

| Таблиця | Призначення |
|---|---|
| `players` | Гравці (id, name, quarks, game_state, global_index, cluster_id, language) |
| `clusters` | Кластери по 50 гравців (group_index, center, player_count, group_seed) |
| `chat_messages` | Повідомлення чату |
| `weekly_digests` | Тижневі дайджести |
| `academy_progress` | Прогрес Академії (difficulty, topics, quests, streak) |
| `academy_lessons` | Кеш уроків (lesson_date, topic_id, difficulty, language) |
| `reported_messages` | Скарги на повідомлення |
| `idempotency_keys` | Ідемпотентність платежів |

---

## Критичні файли для навігації

| Файл | Опис |
|---|---|
| `packages/client/src/App.tsx` | Root компонент (~5000 рядків), state management, scene routing |
| `packages/client/src/game/GameEngine.ts` | PixiJS scene manager, neighbor/core compute |
| `packages/client/src/game/scenes/GalaxyScene.ts` | PixiJS galaxy (personal + neighbor + core nodes) |
| `packages/client/src/game/scenes/SurfaceScene.ts` | Ізометрична поверхня планети |
| `packages/client/src/game/UniverseEngine.ts` | Three.js 3D galaxy + cluster visualization |
| `packages/client/src/i18n/` | react-i18next + custom LanguageProvider |
| `packages/client/src/i18n/locales/*.json` | ~970 ключів перекладу (основний) |
| `packages/client/src/ui/components/CommandBar/` | Уніфікована панель управління |
| `packages/client/src/ui/components/Academy/` | Космічна Академія (6 компонентів) |
| `packages/client/src/ui/components/ChatWidget.tsx` | A.S.T.R.A. + загальний чат |
| `packages/core/src/types/` | Planet, Star, Surface, Player, Research, Education types |
| `packages/core/src/game/research.ts` | canStartResearch(), completeResearchSession() |
| `packages/core/src/game/tech-tree.ts` | 50 tech nodes, getEffectValue() |
| `packages/core/src/generation/` | Galaxy, star system, Delaunay, core system generation |
| `packages/core/src/constants/progression.ts` | XP curve (L^1.3), XP_REWARDS, RING_XP_REWARD |
| `packages/core/src/constants/balance.ts` | Research data, progress bounds, colony economy |
| `packages/server/src/db.ts` | Neon PostgreSQL CRUD (~1700 рядків) |
| `packages/server/src/cluster-manager.ts` | Cluster lifecycle (find/create/assign) |
| `packages/server/src/education-generator.ts` | Gemini prompts for academy (language-aware) |
| `packages/server/src/kling-client.ts` | Kling API wrapper |

---

## Pending DB міграції

Якщо ще не запущені, виконати в Neon SQL Editor:

### 010-academy
```sql
CREATE TABLE IF NOT EXISTS academy_progress (...);
CREATE TABLE IF NOT EXISTS academy_lessons (...);
```

### 011-clusters
```sql
CREATE TABLE IF NOT EXISTS clusters (...);
ALTER TABLE players ADD COLUMN IF NOT EXISTS cluster_id TEXT;
-- + backfill existing players
```

### 012-language
```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'uk';
ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'uk';
```

Повні SQL файли: `packages/server/src/migrations/010-academy.sql`, `011-clusters.sql`, `012-language.sql`
