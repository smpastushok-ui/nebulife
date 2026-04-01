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
- **Мова інтерфейсу**: i18n (uk/en). Ніколи НЕ хардкодити текст — використовувати `t('key')` з `useT()` або `tStatic('key')` для PixiJS. Перед додаванням нового тексту — додати ключ в `i18n/uk.ts` та `i18n/en.ts`
- **Детермінізм**: один seed → ідентичний результат (SeededRNG)
- **60fps**: статична геометрія рендериться раз, per-frame тільки позиції та alpha
- **Parallax backgrounds заборонені** — конфліктує з CameraController

---

## Архітектура

```
nebulife/
├── packages/
│   ├── core/          # Headless: типи, генерація, фізика, хімія, біологія
│   ├── client/        # PixiJS v8 + React UI
│   └── server/        # Серверні функції: Neon DB, Kling API, Tripo API
├── api/               # Vercel serverless endpoints
├── GAME_BIBLE.md      # Біблія гри — правила, стиль, баланс
└── GAME_DESIGN.md     # Дизайн-документ — сюжет, механіки, фізика
```

**Імпорти**:
- `@nebulife/core` — типи, генератори, утиліти (через package exports з index.ts)
- `@nebulife/server` — DB функції, API клієнти (через package exports з index.ts)
- API endpoints імпортують з `@nebulife/server` (НЕ з прямих шляхів `@nebulife/server/src/...`)

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
| Кварки (⚛) — ігрова валюта | Реалізовано |
| AI-поверхня — Kling генерація + процедурний fallback | Реалізовано |
| 3D моделі — Tripo pipeline + Babylon.js viewer | Реалізовано |
| Дослідження — 3 обсерваторії, прогресивне розкриття | Реалізовано |
| Discoveries — Kling фото + pixel reveal + наукові звіти | Реалізовано |
| CommandBar — уніфікована нижня панель управління | В процесі |
| MonoPay — оплата кварків | Реалізовано |

---

## Kling API (AI генерація зображень)

- **Endpoint**: `api.klingai.com/v1`
- **Модель**: `kling-v1-5`
- **Auth**: JWT HS256 (access_key + secret_key)
- **Status values**: `'pending'` | `'processing'` | `'succeed'` (без 'd'!) | `'failed'`
- **Response field**: `imageUrl` (camelCase, НЕ snake_case)
- **Pricing**: ~$0.03 per image

---

## Tripo API (3D моделі)

- **Endpoint**: `api.tripo3d.ai/v2`
- **Pipeline**: image → createModelTask → poll status → download GLB
- **Auth**: Bearer token

---

## Критичні файли для навігації

| Файл | Опис |
|---|---|
| `packages/client/src/App.tsx` | Root компонент, state management, scene routing |
| `packages/client/src/game/GameEngine.ts` | PixiJS scene manager |
| `packages/client/src/game/scenes/*.ts` | HomePlanet, Galaxy, System, PlanetView scenes |
| `packages/client/src/ui/components/CommandBar/` | Уніфікована панель управління |
| `packages/client/src/ui/components/SurfaceView.tsx` | Біосфера (процедурна + AI) |
| `packages/client/src/game/rendering/PlanetVisuals.ts` | derivePlanetVisuals() — всі кольори |
| `packages/core/src/types/` | Planet, Star, Surface, Player, Research types |
| `packages/server/src/db.ts` | Neon PostgreSQL CRUD |
| `packages/server/src/kling-client.ts` | Kling API wrapper |
