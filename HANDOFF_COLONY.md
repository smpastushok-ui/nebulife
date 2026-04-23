# Handoff — Second-Home Colony Feature

## Стан на момент передачі

### Git
- **main** @ `bc7749c` — `Revert "feat(galaxy): MST threads"`. Чистий, запушений.
- **claude/second-home-colony** @ `014f9a5` — feature branch з server scaffold, запушений на GitHub.
- Worktree: `.claude/worktrees/second-home-colony/` (з `.env.local` скопійованим з main).

### Що зроблено (commit `014f9a5`)
1. **DB міграція** — `packages/server/src/migrations/014-second-home-colony.sql`
   - UNIQUE(cluster_id, owner_player_id) на `planet_claims` (1 колонія на гравця)
   - `messages.type` column (default 'text', CHECK ('text' | 'colony_settled'))
   - Partial index `idx_messages_type_channel` для фільтрації non-text
2. **Server helpers** — `packages/server/src/db.ts`
   - `getClusterPlanetClaims(clusterId)` — display-safe список для маркерів
   - `saveMessage(..., type?)` — опціональний type параметр
3. **API endpoints** — `api/colony/`
   - `POST settle-second-home.ts` — claim + broadcast (non-fatal chat fail)
   - `GET list.ts` — маркери кластера (15s private cache, projected shape)
4. **i18n** (обидві мови, обидві системи)
   - `chat.colony_settled` — "Планета {{planet}} заселена {{nick}}"
   - `chat.colony_go_to` — "Перейти до планети"
   - `pixi.colony_settled_tooltip` — "Заселено: {nick}" (custom LanguageProvider)

### Що ЗАЛИШИЛОСЬ (для наступного чату)

**ОБОВ'ЯЗКОВО першим ділом:**
1. Сергій має запустити міграцію 014 у Neon SQL Editor (SQL у файлі вище). Вона ідемпотентна. Без неї API endpoints кидатимуть помилку на `messages.type` колонку.

**Клієнтська частина (не реалізована):**

1. **App.tsx** — data flow
   - Polling `/api/colony/list` кожні 15-30s поки гравець в галактичному view
   - Стан: `colonizedMarkers: Array<{systemId, planetId, nick, isMe}>`
   - Пробросити в GameEngine → GalaxyScene

2. **GalaxyScene.ts** — АДИТИВНИЙ layer
   - **УВАГА:** MEMORY.md забороняє правити існуючий код GalaxyScene. Новий layer має бути ДОДАТКОВИЙ, без зміни `buildLiteOrbsLayer`/`redrawLiteOrbs`/radial-wave.
   - Новий метод `setColonizedMarkers(markers)` → окремий `colonizedMarkersGfx: Graphics`
   - Для кожного marker: знайти `systemNodes.get(systemId)` → координати `(tx, ty)` → намалювати маленьку тематичну іконку (color `#7bb8ff` або `#aabbcc`, розмір ~6px, з легким pulse)
   - Tooltip на tap: `tStatic('pixi.colony_settled_tooltip', { nick })` + назва планети

3. **Planet view / PlanetGlobeView** — "Settle Here" button
   - Умови показу:
     - Planet is colonizable (`planet.isColonizable === true`)
     - Не власна home-планета
     - Post-catastrophe (home system destroyed)
     - Гравець ще не має колонії
   - Click → confirm modal → `POST /api/colony/settle-second-home` {systemId, planetId, planetName}
   - On success: показати toast + закрити вкладку

4. **ChatWidget.tsx** — рендерер для `type='colony_settled'`
   - Parse content як JSON: `{planetName, systemId, planetId}`
   - Render: іконка колонії + `t('chat.colony_settled', { planet, nick })` + clickable link до `chat.colony_go_to`
   - Click → navigate to system in galaxy view

5. **Version bump + AAB**
   - `packages/client/android/app/build.gradle`: 146 → 148 (147 був revert-ed commit)
   - Перебілд: core → client → cap sync → gradlew bundleRelease
   - Push main після merge feature branch

### Специфікація (заморожена)

| Правило | Значення |
|---|---|
| Колоній на гравця | 1 (UNIQUE constraint) |
| Материнська планета | Недоторкана — заборонено колонізувати чужу home |
| UNIQUE constraint | `(cluster_id, owner_player_id)` + існуючий PK на planet |
| Маркер | Маленька тематична іконка, нік прихований до tap |
| Час життя | Довічний |
| Placeholder-слоти | Без маркера |
| Сумісність з frozen GalaxyScene | Тільки ADDITIVE layer, без правок існуючого |

### Критичні файли для передачі

```
packages/server/src/migrations/014-second-home-colony.sql   ← запустити в Neon
api/colony/settle-second-home.ts                            ← endpoint
api/colony/list.ts                                          ← endpoint
packages/server/src/db.ts                                   ← helpers
packages/client/src/i18n/locales/uk.json                    ← keys
packages/client/src/i18n/locales/en.json                    ← keys
packages/client/src/i18n/uk.ts                              ← pixi key
packages/client/src/i18n/en.ts                              ← pixi key

НЕ реалізовано (для наступного чату):
packages/client/src/App.tsx                                 ← polling + pass
packages/client/src/game/scenes/GalaxyScene.ts              ← additive layer
packages/client/src/ui/components/ChatWidget.tsx            ← colony_settled
packages/client/src/ui/components/PlanetGlobeView.tsx       ← settle-here btn
packages/client/android/app/build.gradle                    ← version bump
```

### Блок "DO NOT TOUCH" з MEMORY (актуальний)

- **Галактика 3D UniverseEngine** — ЗАМОРОЖЕНА
- **Star Cluster / GalaxyScene radial-wave + MST** — ЗАМОРОЖЕНА (main @ `bc7749c` після revert MST ниток)
- **Star Group** — ЩЕ НЕ РЕАЛІЗОВАНА. Коли робити — шукати де рендериться окремо від Cluster

### Команди для наступного чату

```bash
# Переключитись на feature branch:
cd /Users/sergijpastusok/Documents/projects/nebulife/.claude/worktrees/second-home-colony

# Або через worktree команди (з main):
cd /Users/sergijpastusok/Documents/projects/nebulife
git worktree list
# Якщо worktree зник: git worktree add .claude/worktrees/second-home-colony claude/second-home-colony

# Статус:
git log --oneline -3
# 014f9a5 feat(colony): second-home social-signal — server scaffold + i18n
# bc7749c Revert "feat(galaxy): MST threads..."
# 7d9713d feat(galaxy): MST threads... (reverted)
```

### PR (коли готово)

Посилання готове:
https://github.com/smpastushok-ui/nebulife/pull/new/claude/second-home-colony
