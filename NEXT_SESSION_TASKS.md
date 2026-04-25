# Next Session — Task Queue

> Created end-of-session 2026-04-25 v159+ після перевантаженої сесії.
> Якщо відкриваєш — працюєш строго з main, web-only зміни (iOS native — не торкатися).

## Контекст

- **main** на commit `b14ef2b` (iOS v160 локально, НЕ запушено)
- Android v159 vже у проді (push `85087c1`)
- iOS v160 чекає на Archive — потрібен зареєстрований device у власника

## Зроблено в попередній сесії (v159+)

- ✅ 💎 → ⚛ скрізь (ColonyCenter, SystemsList, hex-surface, i18n)
- ✅ Рінги 2+ жорстко закриті в терміналі поки ring 1 не повністю досліджений
- ✅ ColonyCenterPage 6 вкладок (Огляд / Колонії / Виробництво / Будівлі / Події / Преміум)
- ✅ Header offset top → 70px щоб не накладатися на Resource HUD (pattern для всіх inspect pages)
- ✅ Premium tab — 2 секції бустів (resource +10/20/25%, time -10/20/25%) з персистом
- ✅ HANDOFF §3.6 — iOS build pipeline + apple-sign-in patch warning

## Черга (по пріоритету)

### 1. Research icon redesign в SystemsList (HIGH)
Користувач хоче єдиний компонент замість 3 окремих:

**Стани:**
- **Idle (canResearch, 0%)**: лупа в центрі, faint outline ring (~30% opacity), БЕЗ анімації пульсу. Click → start research.
- **Researching**: лупа орбітує центр кола (rotation + pulse). НЕ показувати bar fill. Має персистентну анімацію через `animation-delay: -X` базовану на seed.
- **Complete (100%)**: лупа в центрі, повне непрозоре кільце. Click → navigate.
- **Progress %**: outline-ring SVG circle з 2 шарів — base ring (30% opacity) + progress arc (full opacity, dasharray = `progress/100 * perimeter`).

**Файли**: `packages/client/src/ui/components/CosmicArchive/SystemsList.tsx`
**Замінити функції**: `ResearchedIcon` + `ResearchLupeButton` + `ResearchingProgress` → один `ResearchProgressIcon`.

### 2. Q-shortcut popup для instant research (HIGH)

Маленька іконка ⚛ ПРАВОРУЧ лупи (всередині того ж осередку). Click → modal:
- Заголовок: "Дослідити за кварки"
- Опис: "За 30 ⚛ ви можете дослідити цю систему в 1 клік"
- Кнопки: `Дослідити (30 ⚛)` + `Купити кварки` + `Скасувати`
- "Купити кварки" → відкрити TopUpModal (вже є в App.tsx)

**App.tsx**: новий callback `onInstantResearch(systemId)` → deduct 30 quarks + setResearchState 100% для тієї системи.

### 3. Evac ship blue square fix (MEDIUM)

На скріні: під час евакуації над екзосферою з'являється маленький ship icon в синьому квадратику зверху-зліва. Прибрати overlay і прив'язати корабель так як на фоні зоряної системи (Stage 1).

Знайти джерело: пошук `evacuation` в App.tsx + Stage 0/1 рендер. Можливо це placeholder від CutsceneVideo або PlanetGlobeView ship-marker.

### 4. ColonyCenter Production calc — корекція (HIGH)

Поточна формула рахує тільки `def.production * 60`. Має додатково враховувати:

- **Ресурсні гекси** на поверхні: yieldPerHour з `HexSlotData` (resource type → minerals/volatiles/isotopes/water через мапу `RESOURCE_TO_COLONY`).
- При клацанні на minerals → показати окремий рядок "**Добування**" (сума з resource hexes) + per-building breakdown.
- Research data чомусь 0/h — перевірити чи `colonyState.buildings` правильно популюється від `useHexState`. У `colony_hub` має бути `production: [{resource: 'researchData', amount: 1/60}]` → 1/h.

**Файл**: `App.tsx` блок `productionPerHour` обчислення + `ColonyCenterPage.tsx` `BuildingBreakdown`.

### 5. ColonyCenter Buildings tab — точні counts (MEDIUM)

Зараз показує "0 з 1 colony_hub" коли він збудований. Треба перевірити джерело даних:
- `active.buildings` приходить з `colonyState?.buildings`
- Може `colonyState` синхронізується з затримкою → одразу після відкриття 0
- Або hex slots з `state: 'building'` не маппяться у colonyState.buildings

Логіка: рахувати з `hexState.slots.filter(s => s.state === 'building').length` для активної планети. Або скрізь синхронно.

## Файли для довідки

- `NEBULIFE_HANDOFF.md` — повна архітектура, build pipeline, монетизація
- `CLAUDE.md` (root) — правила і model routing
- `~/.claude/projects/-Users-sergijpastusok-Documents-projects-nebulife/memory/MEMORY.md` — крос-сесійна пам'ять

## iOS v160 manual step (для власника)

iOS v160 web-вміст готовий локально (commit b14ef2b). Для Archive:
1. Підключити iPhone до Mac кабелем → Trust → "Try Again" в Xcode → Signing
2. Або додати UDID на https://developer.apple.com/account/resources/devices/list
3. Target → Any iOS Device (arm64) → Product → Archive
4. Distribute App → App Store Connect → Upload
