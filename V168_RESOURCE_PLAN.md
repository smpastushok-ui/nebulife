# V168 Resource Stocks Plan — Planet Deposits as Real Extraction Units

> Source: opus Plan agent (ac641d883c588242d) 2026-04-26.

## Phase 1: Research Findings

### 1.1 Current Data Flow

**Generation** (`packages/core/src/chemistry/minerals.ts`):
- `generateResources()` produces `PlanetResources` with `totalResources: { minerals, volatiles, isotopes, elements }` in **kilograms**
- For an Earth-mass rocky planet: minerals ~ 3e22 kg, volatiles ~ 2.5e21 kg, isotopes ~ 1.2e18 kg
- Extractability factors: rocky 1%, gas-giant 0.01%, ice-giant 0.1% of planet mass

**Water** (`packages/core/src/chemistry/water.ts`):
- `generateHydrosphere()` produces `Hydrosphere` with `waterCoverageFraction` (0-1), `oceanDepthKm`, `iceCapFraction`
- Water is NOT in `totalResources` — it is a separate habitability concept
- No water kg value exists anywhere yet

**Colony Tick** (`packages/core/src/game/colony-tick.ts`):
- `runSingleTick()` runs every 60s
- Buildings produce via `def.production` (mine = 2 minerals/tick, water_extractor = 1 water/tick)
- Production goes directly to `colony.resources` (capped by `getStorageCapacity`, default 1000 per type)
- **No depletion mechanism exists**
- Max 60 catch-up ticks (1 hour) when backgrounded

**Harvest** (`App.tsx` line 797):
- Surface objects (ore/tree/vent/water) yield flat amounts
- Harvested objects regrow after 1-2 hours

**Storage** (`packages/core/src/types/colony.ts`):
- `ColonyResources`: `{ minerals, volatiles, isotopes, water }` — abstract game units
- All per-planet, stored in `colonyResourcesByPlanet`

**Display** (`ResourceDisplay.tsx`):
- Top HUD shows totals via `formatShort()` (e.g., "42", "1k", "250kk")
- 4 types: minerals (#aa8855), volatiles (#55aaaa), isotopes (#88aa44), water (#3b82f6)

### 1.2 Key Gaps
1. No planet-level finite stocks
2. No water quantity on planet (only coverage fraction)
3. No unit bridge between astronomical kg and game units
4. PlanetsCatalogV2 shows raw kg (meaningless)

## Phase 2: Design

### 2.1 Unit: "Unit" (U) — abstract, no suffix

Use the same units as colony storage. A typical Earth-like planet has ~50,000 mineral units; a mine extracts 2/min.

### 2.2 Stock Generation

```ts
STOCK_SCALE = {
  minerals:  50_000 / 3.0e22,
  volatiles: 30_000 / 2.5e21,
  isotopes:  5_000  / 1.2e18,
}
mineralsStock = totalResources.minerals * STOCK_SCALE.minerals
// water: derived from radius + coverage * depth
```

Targets (Earth-like 1 M_Earth):
| Resource | Stock | At 5 mines (10/min) | Hours to exhaust |
|---|---|---|---|
| Minerals | ~50,000 | 600/hr | ~83h |
| Volatiles | ~30,000 | 360/hr | ~83h |
| Isotopes | ~5,000 | 45/hr | ~111h |
| Water | ~40,000 | 240/hr | ~167h |

### 2.3 Depletion Model

```
For each EXTRACTION building producing { resource, amount }:
  if stocks[resource] > 0.10*initial: full production
  if 0 < stocks <= threshold: efficiency = stocks/threshold (linear 1.0→0.0)
  if stocks <= 0: production = 0
```

Only extraction buildings deplete: `mine`, `water_extractor`, `atmo_extractor`, `deep_drill`, `orbital_collector`, `isotope_collector`, `alpha_harvester`. Surface harvest also depletes.

### 2.4 Data Model

```ts
interface PlanetResourceStocks {
  initial:   { minerals, volatiles, isotopes, water };
  remaining: { minerals, volatiles, isotopes, water };
}
```

### 2.5 Persistence
- `game_state.planet_resource_stocks: Record<planetId, PlanetResourceStocks>` (JSONB, no migration)
- localStorage: `nebulife_planet_resource_stocks`

### 2.6 Backwards Compat
On first tick: if missing, generate from planet seed-deterministic data + level-based depletion estimate (L1-5: 0%, L10: 5%, L20: 15%, L35: 30%, L50: 50%).

### 2.7 UI
- ColonyCenter: deposit bars per resource (green/yellow/red), efficiency warning when <1.0
- PlanetsCatalogV2 detail panel: show stock units, water in units (not %)
- TopBar: no change (it's colony inventory, not planet stocks)

## Phase 3: Implementation Steps

### Step 1: Type + generation function
- Add `PlanetResourceStocks` to `packages/core/src/types/colony.ts`
- Create `packages/core/src/game/planet-stocks.ts`: `generatePlanetStocks(planet)`, `depleteStock()`, `getDepletionEfficiency()`
- Export from index.ts

### Step 2: Integrate depletion into `colony-tick.ts`
- Add `planetStocks` parameter to `runColonyTicks`/`runSingleTick`
- In production loop: check extraction type, deplete, apply efficiency
- Return updated stocks in `ColonyTickResult`

### Step 3: App.tsx state management
- `planetResourceStocks` state + ref + localStorage + game_state sync
- Pass to runColonyTicks
- Backwards compat: lazy-generate on first tick
- `handleHarvest` also depletes

### Step 4: i18n keys
```
colony_center.deposits_remaining: "Залишок покладів" / "Deposits remaining"
colony_center.depleted: "Вичерпано" / "Depleted"
colony_center.planet_richness: "Багатство планети" / "Planet richness"
colony_center.stock_pct: "{{pct}}% від початкового" / "{{pct}}% of initial"
```

### Step 5: ColonyCenterPage UI
- Deposit bars in Overview tab (4 horizontal, color-coded)
- Efficiency warning in Production tab when efficiency < 1.0

### Step 6: Wire ColonyCenter invocation in App.tsx (~line 6305)
- Pass `planetStocks={planetResourceStocks[activePlanetId]}`

### Step 7: DB doc
- `017-resource-stocks.sql` — comment-only (JSONB self-extends)

## Critical Files
- `packages/core/src/game/colony-tick.ts` (lines 130-174)
- `packages/core/src/chemistry/minerals.ts`
- `packages/core/src/types/colony.ts`
- `packages/client/src/App.tsx` (lines 797, 1494, 4976, 6305, 2421)
- `packages/client/src/ui/components/ColonyCenter/ColonyCenterPage.tsx`

## Add-ons from Сергій (queued separately)
- ALL resources in stock units (not %/gigatons): apply same to ALL 4 resources, not only water
- Population count per inhabited planet (not %)
- NO planet names anywhere except pinned favorites
- PlanetsCatalogV2: planet color by real params (not all brown), sort by minerals desc, no resource header, eye button next to pin opens PlanetDetailWindow

## Bugs to fix in v167.1 round
- TopBar research rate shows 1/h despite ColonyCenter + 1 obs + 1 lab
- Red lightning power-deficit indicator not showing after 5 buildings
- Surface music doesn't fade out when terminal opens (overlap)
