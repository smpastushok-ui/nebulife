# Nebulife — Game Design Document

> Living document. Update as the game evolves.
> Every rule references the source file for verification.

---

## 1. Setting & Story

**Alpha Lyrae** — зоряна система B4-класу (18 500 K, radiusSolar ≈ 4.8, luminosity ≈ 2445).
Домашня планета знаходиться на відстані ~59 AU у зоні обітання гарячої зорі.

**Катастрофа**: астероїд летить до планети. Зворотний відлік: **7 днів** (604 800 секунд).
Гравці повинні дослідити сусідні зоряні системи, знайти придатну для життя планету і запустити корабель порятунку.

**Корабель порятунку** (Doomsday Ship):
- Швидкість: 1% швидкості світла (`DOOMSDAY_SHIP_SPEED_C = 0.01`)
- Пасажири: 10 000 (`DOOMSDAY_SHIP_PASSENGERS`)
- Час подорожі = відстань_ly / (0.01 × c)

> Source: `packages/core/src/constants/game.ts`

---

## 2. Core Gameplay Loop

### Phase 1: Research & Explore (7 days)

1. Гравець починає на домашній планеті (HomePlanetScene)
2. Відкриває галактичну карту (GalaxyScene)
3. Досліджує зоряні системи через обсерваторії

**Обсерваторії:**
- 3 слоти паралельного дослідження (`HOME_OBSERVATORY_COUNT = 3`)
- Тривалість сесії: 10 с (dev) / 1 год (prod) (`RESEARCH_DURATION_MS`)
- Прогрес за сесію: 2-50% випадково
- Повне дослідження (100%) відкриває вхід у систему

**Прогресивне розкриття даних:**
| Дані | Поріг |
|------|-------|
| Клас зорі | 25% (нечіткий до цього) |
| Кількість планет | 25% |
| Покриття водою | 1% (з початку, діапазон звужується) |
| Відстань AU | 1% |
| Температура | 50% |
| Придатність | 25% |

> Source: `packages/core/src/game/research.ts`, `packages/core/src/constants/balance.ts`

### Phase 2: Ship Launch
- Вибір пункту призначення (придатна планета, habitability > 0.3)
- Запуск корабля порятунку
- Час подорожі розраховується з реальної відстані

### Phase 3: Colonization (future)
- Прибуття корабля
- Заснування колонії
- Видобуток ресурсів на супутниках

---

## 3. Universe Generation

### 3.1 Galaxy Structure
- Гексагональна кільцева система навколо позиції гравця
- Ring 0: домашня система (1 система)
- Ring 1: 6 систем (доступні для дослідження з дому)
- Ring 2+: 6 × n систем (видимі, поки не досяжні)
- Відстань між кільцями: 5 світлових років
- Генерація детермінована від seed позиції

> Source: `packages/core/src/generation/galaxy-generator.ts`

### 3.2 Star Generation
7 спектральних класів з реалістичними фізичними параметрами:

| Клас | T (K) | Mass (☉) | Radius (☉) | Color | Lifetime (Gyr) |
|------|-------|----------|------------|-------|----------------|
| O5 | 40 000 | 40.0 | 17.8 | #9bb0ff | 0.001 |
| B0 | 28 000 | 18.0 | 7.4 | #aabfff | 0.01 |
| B5 | 15 000 | 6.4 | 3.8 | #cad7ff | 0.1 |
| A0 | 9 900 | 3.2 | 2.5 | #f8f7ff | 0.4 |
| F0 | 7 400 | 1.7 | 1.5 | #fff2e0 | 2.0 |
| G2 ☉ | 5 778 | 1.0 | 1.0 | #fff5e3 | 10.0 |
| K0 | 4 900 | 0.82 | 0.85 | #ffd2a1 | 17.0 |
| M0 | 3 500 | 0.47 | 0.51 | #ffbd80 | 60.0 |
| M8 | 2 400 | 0.10 | 0.12 | #ffa060 | 200.0 |

> Source: `packages/core/src/constants/stellar.ts`

### 3.3 Planet Generation
- 2-12 планет на систему (середнє 6)
- 4 зони: inner, habitable, outer, far
- 4 типи: `rocky`, `gas-giant`, `ice-giant`, `dwarf`

**Маса за зоною:**
- Inner: Gaussian(0.6, σ=0.5) → 0.02-3.0 M⊕
- Habitable: Gaussian(1.0, σ=0.5) → 0.1-5.0 M⊕
- Outer: 40% гіганти → Gaussian(100, σ=200) 10-3000 M⊕; 60% → 0.1-10 M⊕
- Far: Gaussian(0.5, σ=0.8) → 0.01-30 M⊕

**Тип від маси та зони:**
- massEarth < 0.01 → dwarf
- Inner/Habitable + mass > 10 → 70% gas-giant, 30% ice-giant
- Outer + mass > 50 → gas-giant
- Outer + 5-50 → 50/50 gas/ice-giant

**Радіус від маси:**
- Rocky/Dwarf: r = m^0.27 (m≤1), r = m^0.55 (m>1)
- Giants: r = 3.0 + (m/10)^0.45 (m<300), r = 11.2 × (m/318)^-0.04 (m≥300)

> Source: `packages/core/src/generation/planet-generator.ts`

### 3.4 Orbital Parameters
```typescript
interface OrbitalParameters {
  semiMajorAxisAU: number;     // Відстань від зорі (AU)
  eccentricity: number;        // 0-0.15 (майже кругові)
  inclinationDeg: number;      // 0-5° (біля площини)
  periodYears: number;         // Кеплерівський період
  periodDays: number;
  meanAnomalyDeg: number;      // Початкова позиція на орбіті
}
```

> Source: `packages/core/src/types/orbit.ts`

---

## 4. Planet Physics

### 4.1 Temperature
1. **Рівноважна** (без атмосфери):
   `T_eq = T_star × √(R_star / (2 × a)) × (1 - albedo)^0.25`
2. **Поверхнева** (з парниковим ефектом):
   `T_surface = T_eq + 33 × greenhouse_factor`

### 4.2 Atmosphere
- Composition: O₂, N₂, CO₂, CH₄, H₂, He, H₂O та ін.
- Retention rule: escape_velocity > 6 × thermal_velocity для кожного газу
- Greenhouse factor від CO₂, CH₄, H₂O вмісту
- Pressure: 0-100+ atm

### 4.3 Hydrosphere
- Рідка вода: 273K ≤ T ≤ 373K, pressure ≥ 0.006 atm
- Крижані шапки: T < 273K
- Підповерхневі океани: можливі на холодних тілах

### 4.4 Magnetic Field & Resources
- Магнітне поле залежить від маси та обертання
- Ресурси генеруються на основі типу та складу

> Source: `packages/core/src/chemistry/atmosphere.ts`, `packages/core/src/chemistry/water.ts`

---

## 5. Moon System

### 5.1 Generation Rules
| Тип планети | Кількість супутників |
|-------------|---------------------|
| Gas giant | 2-8 |
| Ice giant | 1-5 |
| Rocky > 0.5 M⊕ | 50% шанс 0-2 |
| Rocky ≤ 0.5 M⊕ | 10% шанс 1 |
| Dwarf | 10% шанс 1 |

### 5.2 Composition Types
| Тип | Ймовірність | Щільність (г/см³) |
|-----|------------|-------------------|
| Rocky | 45% | 2.5-4.0 |
| Icy | 30% | 0.9-2.0 |
| Metallic | 15% | 5.0-8.0 |
| Volcanic | 10% | 3.0-4.5 |

### 5.3 Orbital Mechanics
- Радіуси: 10 000-500 000 км, відсортовані inner→outer
- Період: закон Кеплера `T = 2π√(a³/(G×M))`
- Tidal locking: 70% ймовірність

### 5.4 Resource Extraction (Future)
Супутники — основне джерело ресурсів:
- Rocky: метали, мінерали
- Icy: вода, леткі речовини
- Metallic: рідкісні метали, сплави
- Volcanic: геотермальна енергія, сульфіди

> Source: `packages/core/src/generation/planet-generator.ts`, `packages/core/src/types/planet.ts`

---

## 6. Habitability & Life

### 6.1 Habitability Score (0-1)
5 зважених факторів:

| Фактор | Вага | Оптимум |
|--------|------|---------|
| Temperature | 30% | Gaussian(288K, σ=30K) |
| Atmosphere | 25% | O₂ 15-30%, P 0.5-2.0 atm |
| Water | 25% | 30-80% покриття |
| Magnetic field | 10% | Сильне магнітосфера |
| Gravity | 10% | Gaussian(1g, σ=0.4g) |

### 6.2 Life Rules
- Поріг: habitability ≥ 0.7 **І** 15% випадковий шанс
- Складність від effective_age = star_age × habitability:
  - < 0.5 Gyr → microbial
  - 0.5-2.0 → переважно microbial, 10% multicellular
  - 2.0-4.0 → переважно multicellular, 5% intelligent
  - > 4.0 → 15% intelligent, 55% multicellular

### 6.3 Visual Effects by Life Complexity
- **Microbial**: ледь помітний зелений відтінок поверхні
- **Multicellular**: повні біоми (tropical 0x1a6a2a, temperate 0x2a6a2a, boreal 0x3a5a2a)
- **Intelligent**: вогні міст на нічній стороні

> Source: `packages/core/src/biology/habitability.ts`, `packages/core/src/biology/life.ts`

---

## 7. Visual Standards

### 7.1 Color Palette
| Елемент | Колір | Hex |
|---------|-------|-----|
| Deep space background | Майже чорний | 0x020510 |
| UI text (primary) | Приглушений сіро-зелений | 0x889999 |
| UI text (secondary) | Темно-синій | 0x556677 |
| Habitable zone | Зелений | 0x22aa44 |
| Life indicator | Яскраво-зелений | 0x44ff88 |
| Orbit lines | Темно-синій | 0x334466 |
| Home planet marker | Зелений | 0x22ff66 |

### 7.2 Planet Colors (from physics)
- **Atmosphere**: O₂→синій 0x4488ff, CO₂→жовтий 0xddaa44, CH₄→коричневий 0x886644
- **Surface**: T>1200K→лава 0x1a0a00, T>600K→гарячий 0xaa5533, T>273K→помірний 0x887766
- **Ocean**: Глибина + температура → відтінки блакитного
- **Gas giant bands**: T>1000K→червоний, T>400K→помаранчевий, cold→коричневий
- **Ice giant**: Відтінки синього 0x3366aa-0x5588aa

> Source: `packages/client/src/game/rendering/PlanetVisuals.ts` — `derivePlanetVisuals()`

### 7.3 Rendering Approach
- **Все процедурне** — PixiJS Graphics, без текстур і спрайтів
- **System view**: прості круги/еліпси, кольори з фізичних даних
- **Planet closeup**: ортографічна проекція, noise-based terrain, біоми, хмари
- **Moon closeup**: composition-driven кольори з деталями кратерів
- **Stars**: багатошарові концентричні круги (glow + core + tint)
- **Galaxy**: спіральні рукави з 7 шарами рендерингу

### 7.4 Animation Standards
| Елемент | Швидкість | Формула |
|---------|-----------|---------|
| Planet orbits (system) | 200× прискорення | `2π / (periodDays × 200)` |
| Moon orbits (system) | 80× прискорення | `2π / (periodDays × 80)` |
| Moon orbits (closeup) | 120 000× прискорення | `2π / (periodDays × 120000)` |
| Cloud drift | 0.0008 px/ms | Lateral shift |
| Star twinkle | Sinusoidal | `sin(time × speed + phase)` |
| View rotation (closeup) | 0.000015 rad/ms | Slow cosmos rotation |

---

## 8. Camera & Navigation

### 8.1 Scenes
| Scene | Camera | Interaction |
|-------|--------|-------------|
| HomePlanetScene | Fixed + slow rotation | Zoom in/out, drag rotate |
| GalaxyScene | Free zoom/pan | Click system, double-click enter |
| SystemScene | Free zoom/pan, auto-fit | Click planet for context menu |
| PlanetViewScene | Fixed + slow rotation | Zoom in/out |

### 8.2 Scale Mapping
- **Galaxy**: direct pixel mapping
- **System**: `auToScreen(au) = Math.log2(1 + au × 4) × 100` (logarithmic)
- **Planet closeup**: `screenRadius = min(W, H) × 0.22`

### 8.3 LOD
- HomePlanetScene: 2 рівні (lodMultiplier 1×/2× при zoom thresholds)
- SystemScene: не потребує LOD (проста геометрія)
- PlanetViewScene: noise-rendered при створенні (один раз)

> Source: `packages/client/src/game/camera/CameraController.ts`

---

## 9. UI/UX Principles

1. **Monospace font** скрізь — науково-фантастичний стиль
2. **Приглушена палітра** — сірі, сині тони з зеленими акцентами для life/habitable
3. **Інформативні лейбли** без захаращення — тип, температура, кількість супутників
4. **Planet interaction**: hover → scale 1.3×, click → контекстне меню
5. **Vignette overlay** на closeup views для кінематографічного кадрування
6. **Прогрес дослідження** — числові діапазони що звужуються (візуалізація невизначеності)
7. **Без емодзі** — строго текстовий sci-fi інтерфейс
8. **Українська мова** в UI де можливо

---

## 10. Technical Constraints

### 10.1 Runtime
- **PixiJS v8** (Container, Graphics, Text)
- **Все процедурне** — Graphics API, без текстур/спрайтів
- Canvas/WebGL renderer
- **60fps** target

### 10.2 Performance Guidelines
- Статична геометрія (backgrounds, orbits, habitable zone) — рендериться один раз у конструкторі
- Per-frame updates тільки: позиції планет, позиції супутників, cloud drift, star twinkle
- Planet closeup noise rendering: до radius² точок (дороге) — тільки для closeup scenes
- System view: <100 draw calls
- **Ніколи** `Graphics.clear()` per-frame в system view (тільки в анімаціях як supernovae)

### 10.3 Architecture
```
nebulife/
├── packages/
│   ├── core/          # Shared logic (types, generation, physics, chemistry)
│   │   └── src/
│   │       ├── types/       # Planet, Star, Moon, StarSystem interfaces
│   │       ├── generation/  # Generators (galaxy, planet, home-planet)
│   │       ├── physics/     # Kepler, gravity, habitable zone
│   │       ├── chemistry/   # Atmosphere, water, elements
│   │       ├── biology/     # Habitability, life
│   │       ├── constants/   # Physics, stellar, game, balance
│   │       ├── math/        # SeededRNG, noise
│   │       └── game/        # Research, timeline, exploration
│   ├── client/        # PixiJS rendering (browser)
│   │   └── src/
│   │       ├── game/
│   │       │   ├── scenes/      # HomePlanet, Galaxy, System, PlanetView
│   │       │   ├── rendering/   # PlanetRenderer, StarRenderer, HomePlanetRenderer
│   │       │   ├── camera/      # CameraController
│   │       │   └── GameEngine.ts
│   │       └── ui/components/   # React HUD, panels, menus
│   └── server/        # (future)
```

### 10.4 Key Principles
- **Deterministic**: вся генерація через `SeededRNG` — один seed → ідентичний всесвіт
- **Physics-first**: реальна фізика де можливо (Kepler, Stefan-Boltzmann, greenhouse)
- **Game-simplified**: де фізика нудна, спрощуємо (15% life chance, 200× orbit speedup)
- **Core = headless**: packages/core не має рендерингу, чисті типи + логіка
- **Immutable state**: research system через immutable state updates

---

## 11. Balance Parameters

| Parameter | Value | File |
|-----------|-------|------|
| ASTEROID_COUNTDOWN_SECONDS | 604 800 (7d) | `constants/game.ts` |
| RESEARCH_DURATION_MS | 10 000 (dev) | `constants/balance.ts` |
| RESEARCH_MIN_PROGRESS | 2% | `constants/balance.ts` |
| RESEARCH_MAX_PROGRESS | 50% | `constants/balance.ts` |
| HOME_OBSERVATORY_COUNT | 3 | `constants/balance.ts` |
| HOME_RESEARCH_MAX_RING | 1 | `constants/balance.ts` |
| LIFE_PROBABILITY | 0.15 (15%) | `constants/game.ts` |
| LIFE_HABITABILITY_THRESHOLD | 0.7 | `constants/game.ts` |
| DOOMSDAY_SHIP_SPEED_C | 0.01 (1% c) | `constants/game.ts` |
| DOOMSDAY_SHIP_PASSENGERS | 10 000 | `constants/game.ts` |
| MIN_PLANETS | 2 | `constants/game.ts` |
| MAX_PLANETS | 12 | `constants/game.ts` |
| MEAN_PLANETS | 6 | `constants/game.ts` |
| Planet orbit speedup (system) | 200× | `SystemScene.ts` |
| Moon orbit speedup (system) | 80× | `SystemScene.ts` |
| Moon orbit speedup (closeup) | 120 000× | `PlanetViewScene.ts` |
| auToScreen scale | `log2(1+au×4)×100` | `SystemScene.ts` |
