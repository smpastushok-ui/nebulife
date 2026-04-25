# Terraforming — Late-game Implementation Plan

> ТЗ-джерело: `~/Desktop/планети.docx` + чат сесії 2026-04-25.
> Статус: основа для всіх sonnet-агентів. **ВЕСЬ КОД** має посилатись на цей файл.

## Скоуп

Терраформування — глобальна система пізньої гри: гравець перетворює непридатні планети на придатні шляхом доставки ресурсів кораблями з вже колонізованих планет. **Передумова**: побудований Ковчег Генезису (`genesis_vault`).

**Не торкаємо:** механіку видобутку, дослідження, колонізації, евакуації.

---

## Архітектурні рішення

### A. Які планети terraformable

| Тип | Можна терраформувати | Причина |
|---|---|---|
| `rocky` | ✓ | базовий випадок |
| `terrestrial` | ✓ (часто вже високий habitability) | базовий випадок |
| `dwarf` | ✓ (з обмеженням) | низька гравітація — обмеження параметрів |
| `gas-giant` | ✗ | немає поверхні |
| `ice-giant` | ✗ | немає поверхні |

```ts
export function isTerraformable(planet: Planet): boolean {
  return planet.type === 'rocky'
      || planet.type === 'terrestrial'
      || planet.type === 'dwarf';
}
```

### B. Параметри терраформування

6 окремих параметрів. Кожен має `progress: 0..100`, `targetMet: boolean`. Загальна `overallProgress` = середнє з 6.

| Param ID | Назва | Стартове значення | Як заповнюється | Що споживає | Tech-gate |
|---|---|---|---|---|---|
| `magneticField` | Магнітне поле | `planet.habitability.magneticField * 100` | Доставка `isotopes` (іонний прискорювач) | isotopes | `phy-magnetics` (НОВА нода L22) |
| `atmosphere` | Атмосфера | `planet.habitability.atmosphere * 100` | Доставка `volatiles` | volatiles, isotopes (каталізатор) | `bio-terraforming` |
| `ozone` | Озоновий шар | base = `atmosphere.ozone ? 80 : 0` | Доставка `volatiles` (O₂) | volatiles | `bio-terraforming` |
| `temperature` | Температура | `planet.habitability.temperature * 100` | Стабілізація — потребує робочого `magneticField + atmosphere ≥ 50` | minerals (дзеркала/щити) | `bio-terraforming` |
| `pressure` | Тиск | derived from `atmosphere.surfacePressureAtm` | Стабілізація після `atmosphere ≥ 50` | volatiles | — |
| `water` | Вода | `planet.habitability.water * 100` | Доставка `water` ресурсу | water | — |

`overallTerraformProgress = avg(6 params)`. Коли `overallTerraformProgress >= 95` — викликається подія `onPlanetTerraformed(planet)`:
- `planet.terraformDifficulty = 0`
- `planet.habitability.overall` піднімається до `min(0.85, base + 0.4)`
- Якщо тип був `dwarf` — лишається `dwarf` (фіз. обмеження); `rocky` → `terrestrial`; `terrestrial` → лишається.
- Synced скрізь де `planet.type` зчитується.

### C. Вартість ресурсів (база)

Множник = `planet.size` (`small=0.6, medium=1.0, large=1.5, gas=N/A`). Множник × difficulty × `(100 - currentProgress)/100`.

| Param | Базова вартість для 0→100% (medium planet, easy) |
|---|---|
| `magneticField` | 5,000 isotopes |
| `atmosphere` | 8,000 volatiles + 500 isotopes |
| `ozone` | 2,000 volatiles |
| `temperature` | 4,000 minerals |
| `pressure` | 3,000 volatiles |
| `water` | 10,000 water |

Розраховується точно в `terraform-rules.ts:computeRequirements(planet, paramId, currentProgress)`.

### D. Транспорт (флот)

Використовуємо існуючий `logistics.ts`. Ship-rank залежить від тех-дерева:

| Tier | Корабель | Cargo | Speed (LY/година гри) | Будівля-launch | Tech |
|---|---|---|---|---|---|
| 1 | `transport_small` | 100 | 0.05 | `landing_pad` (L18) | — |
| 2 | `transport_large` | 1,000 | 0.1 | `spaceport` (L35) | `phy-orbital-mech` |
| 3 | `transport_mega` (НОВИЙ) | 5,000 | 0.2 | `spaceport` (L35) | `phy-warp-1` (НОВА L42) |

Швидкість обчислюється з відстаней. Час перельоту: `flightHours = distanceLY / speed`.

**Mission lifecycle:**
1. `dispatching` — гравець натиснув "Доставити", корабель завантажується (5 хв)
2. `outbound` — летить, прогрес `0..1` per RAF
3. `unloading` — додає прогрес parameterу (5 хв)
4. `returning` — пустий назад
5. `repairing` — після повернення, потребує `minerals` пропорційно distance
6. `idle` — готовий до нової місії

Стан зберігається в `colonyState.fleet[]`. Тіки rendering відтворюються з timestamp на mount (без heartbeat).

### E. UI на планеті — нова вкладка "Terraform"

`PlanetContextMenu` отримує 4-у вкладку `terraform` (поряд з actions/resources/premium) — ВИДИМА тільки якщо `isTerraformable(planet) && hasGenesisVault`. Без Ковчегу: вкладка disabled з підказкою.

Усередині вкладки:
- **Загальний бар** `overallTerraformProgress`
- 6 рядків (один на параметр), кожен:
  - Назва + поточний прогрес (бар 0..100%)
  - "Доставити X" / "Стабілізувати" / "Активувати" кнопка
  - Розкривається deeper view: повна вартість, відстань LY до найближчої колонії, ETA, поточна місія (якщо є)
  - Disabled state з підказкою чому (немає Ковчегу / немає корабля / залежить від іншого param)

`PlanetInfoPanel` — той самий "Терраформування" блок додається першим (під `Physical`), тільки **інформаційний** (без кнопок). Бари тут **уже не декоративні** — показують реальний прогрес.

### F. UI меню "Дії"

`PlanetContextMenu` actions tab переробити:
1. `Переглянути` (без змін)
2. `Поверхня` (без змін)
3. **`Дослідження`** (розкриваюча група) — об'єднує:
   - `Характеристики` (стара)
   - `Місія` (стара stub)
   - `Зонд` (стара stub)
4. **`Терраформування`** (нова) — тільки якщо `isTerraformable` ELSE прихована.

Меню — in-place tabs замість close+open. "Характеристики" не закриває меню, а перемикає вкладку всередині.

### G. Термінал — Planets tab переробка

Видалити row-based групування за зорею. Замість того:

- **Header**: 7 кнопок-фільтрів з іконками: `Терраформ`, `Мінерали`, `Ізотопи`, `Вода`, `Життя`, `Леткі`, `Населення`. Multi-select.
- **Sort**: за відстанню від найближчої власної колонії-`hub` (LY, ascending).
- **Layout**: grid 4-5 у ряд, кожна планета = кружечок (різний розмір/колір за `radiusEarths` + `terrain`/`type`), як на planetary system view, без анімації. Якщо є кільця — show ring.
- **Lazy load**: показати першу пачку (24 планети). Скрол → `IntersectionObserver` → +24.
- При кліку → `PlanetDetailWindow` (повний view), де перший блок — `Терраформування` з реальними прогрес-барами + блок `Придатність до життя`.

### H. Нова tab "Колонії"

Перед "Обрані". Показує всі планети з `colony_hub` або `orbital_collector` побудованим. Layout як у Planets tab (без фільтрів). Кожен запис показує: ім'я, ресурси (поточні), прогрес терраформу, кнопку "Перейти".

### I. Освітлення планети (Three.js)

- Ambient: `#334466 1.4` → `#5577aa 2.2`
- Directional: `#fff2dd 1.8` → `#fff2dd 2.5`
- Додати `HemisphereLight(skyColor=#7799cc, groundColor=#332211, intensity=0.6)` — заповнює тіні теплим blue-warm.

---

## Фази імплементації

### Phase 0 — Core types & rules (≈ 800 рядків коду)
- `packages/core/src/types/terraform.ts`: `TerraformParamId`, `TerraformParamState`, `PlanetTerraformState`, `ShipTier`, `MissionPhase`, `Mission`
- `packages/core/src/game/terraform-rules.ts`:
  - `isTerraformable(planet) → boolean`
  - `getInitialTerraformState(planet) → PlanetTerraformState`
  - `computeParamRequirement(planet, paramId, currentProgress) → ResourceCost`
  - `applyDelivery(state, paramId, deliveredAmount) → state` (deterministic)
  - `getOverallProgress(state) → number 0..100`
  - `canStartParam(state, paramId, hasGenesisVault, techState) → { allowed, reason? }`
- `packages/core/src/game/fleet-rules.ts`:
  - `tierForBuildings(buildings) → ShipTier`
  - `flightHoursLY(distanceLY, tier, techState) → number`
  - `repairCost(distanceLY, tier) → ResourceCost`
  - `tickMission(mission, now) → mission` (pure)
- `packages/core/src/constants/terraform.ts`: TF_BASE_COSTS, TF_SIZE_MULT
- DB міграція `015-terraform.sql`: додати колонку `terraform_state JSONB DEFAULT '{}'` у players (key=planetId, value=PlanetTerraformState).
- New tech node `phy-magnetics` (L22, `phy-thermo-1`) → `building_unlock` magnetic_inducer (НЕ робити будівлю, тільки tech effect `magnetic_field_unlock`); `phy-warp-1` (L42).
- Експорти у `core/src/index.ts`.
- TS build чистий.

### Phase 1 — Fleet runtime + UI hangar (≈ 600 рядків)
- `App.tsx`: state `fleet: Mission[]`, persist у localStorage + scheduleSyncToServer
- New component `MissionDispatchModal` — діалог "Доставити X у Y": вибір колонії-донора, корабля, кількості; показує ETA, repair cost, success рукоятку
- `MissionTracker` (HUD chip): `2/3 in flight` + tooltip із списком
- Tick через RAF/setInterval — оновлює `mission.phase` детерміновано (не настінний клок, ms timestamp)
- Списання ресурсів на старті, додавання прогресу до `terraform_state` на arrival, repair lifecycle
- Тести: 1) start mission → resources списані; 2) tick → phase змінюється; 3) arrival → progress зростає; 4) repair → minerals списані

### Phase 2 — TerraformPanel UI (≈ 700 рядків)
- New component `TerraformPanel` (planet inspect)
- 4-та tab у `PlanetContextMenu` (in-place switch)
- Бари 0..100 + per-param missions
- Hook у App.tsx: `getTerraformState(planetId)`, `onStartParam(planetId, paramId, donorPlanetId, shipId, amount)`
- i18n keys (uk + en)

### Phase 3 — Planets tab redesign (≈ 500 рядків)
- Переписати `PlanetsCatalog.tsx` → новий `PlanetsCatalogV2.tsx` (старий лишається до cleanup-у)
- 7 фільтрів-чіпів
- Distance-from-nearest-colony hub helper в `core/src/generation/distances.ts`
- Lazy load (Intersection Observer)
- New "Колонії" tab компонент
- Кулька-планета renderer (re-use existing `PlanetChip` + add ring SVG)

### Phase 4 — Action menu unification (≈ 300 рядків)
- Переробити `PlanetContextMenu`:
  - Group `Дослідження` (collapsable group: Характеристики, Місія, Зонд)
  - Add `Терраформування` (conditional)
- In-place tab switch (no close+open)
- Update `App.tsx` handlers `handleShowCharacteristics` → keep menu open

### Phase 5 — Polish (≈ 100 рядків)
- Three.js lighting bump у `PlanetGlobeView.tsx`
- Apply `terraformDifficulty` decrement + `planet.type` mutation hook після `overallProgress >= 95`

### Phase 6 — Verification (manual)
- E2E: побудувати Ковчег → відкрити терраформ → запустити доставку → дочекатись 100% → побачити зміну типу
- Resource leak audit
- Performance (1,400 planets in catalog with 7 filters)

---

## Послідовність

```
Phase 0  (independent)
   ├── Phase 1  (depends on 0)
   ├── Phase 2  (depends on 0+1, можна стартувати UI mock-ом)
   ├── Phase 3  (depends on 0 — distance helper)
   └── Phase 4  (independent of fleet, but uses Phase 2 tab)
Phase 5  (independent — visual)
Phase 6  (last)
```

**Можна паралельно**: Phase 0+5 одразу. Phase 1+3 після завершення 0. Phase 2 після 0+1.

---

## Файли (повний список майбутніх змін)

### NEW
- `packages/core/src/types/terraform.ts`
- `packages/core/src/game/terraform-rules.ts`
- `packages/core/src/game/fleet-rules.ts`
- `packages/core/src/constants/terraform.ts`
- `packages/core/src/generation/distances.ts`
- `packages/server/src/migrations/015-terraform.sql`
- `packages/client/src/ui/components/Terraform/TerraformPanel.tsx`
- `packages/client/src/ui/components/Terraform/MissionDispatchModal.tsx`
- `packages/client/src/ui/components/Terraform/MissionTracker.tsx`
- `packages/client/src/ui/components/CosmicArchive/PlanetsCatalogV2.tsx`
- `packages/client/src/ui/components/CosmicArchive/ColoniesList.tsx`

### MODIFIED
- `packages/core/src/types/planet.ts` (експорт `isTerraformable` re-export)
- `packages/core/src/types/index.ts` (re-export new types)
- `packages/core/src/game/tech-tree.ts` (нові ноди)
- `packages/core/src/game/index.ts` (re-export functions)
- `packages/client/src/App.tsx` (state hooks для terraform + fleet)
- `packages/client/src/ui/components/PlanetContextMenu.tsx` (4-а tab + дії перевпорядкування)
- `packages/client/src/ui/components/PlanetInfoPanel.tsx` (terraform info block)
- `packages/client/src/ui/components/PlanetDetailWindow.tsx` (real progress bars)
- `packages/client/src/ui/components/PlanetGlobeView.tsx` (lighting bump)
- `packages/client/src/ui/components/CosmicArchive/CosmicArchive.tsx` (Колонії tab)
- `packages/client/src/i18n/locales/uk.json` + `en.json` (~80 нових ключів)

---

## Ризики

1. **`planet.type` mutation** — поточний код припускає immutability; треба знайти всі місця де cache залежить від `type`.
2. **localStorage квота** — `terraform_state` для 1,400 планет може бути великий; зберігати тільки for planets з активним прогресом.
3. **Distance calc на 1,400 планетах** — кожна зміна фільтра не повинна re-обчислювати все; кешувати pre-mount.
4. **Server sync конфлікти** — `terraform_state` JSONB merge з local: брати `Math.max(local.progress, server.progress)` per param.
5. **Fleet timer drift** — використовувати `Date.now()` timestamps, не setInterval-counter.

---

## Готово до старту: Phase 0 + Phase 5 паралельно
