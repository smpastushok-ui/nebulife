# Nebulife — Game Bible

> Настільна книга-орієнтир для розробки. Перед будь-якою правкою — звіряйся з цим файлом.
> Оновлювати при кожній суттєвій зміні в механіках, візуалі чи UI.

---

## 1. Концепція

**Жанр**: Science-fiction space exploration / survival strategy
**Платформа**: Web (browser), PixiJS v8 + React
**Мова інтерфейсу**: Українська

**Pitch**: Астероїд летить до твоєї планети. 7 днів. Досліди сусідні зоряні системи, знайди придатну планету, запусти корабель порятунку на 10 000 пасажирів.

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

### 11.2 Ціни

| Покупка | Ціна | Примітка |
|---|---|---|
| AI поверхня (перша рідна планета) | **Безкоштовно** | Тільки 1-ша генерація home planet |
| AI поверхня (решта) | **10 ⚛** | Нові планети та перегенерація |
| 3D модель планети | **49 ⚛** | Kling photo → Tripo GLB |
| Поповнення | Будь-яка сума | MonoPay → creditQuarks |

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

## 13. 3D моделі планет

### 13.1 Pipeline

```
1. Kling: generateImage(planet photo, 1:1) → photo_url
2. Tripo: createModelTask(photo_url) → taskId
3. Poll: checkModelTask(taskId) → status
4. Ready: download GLB → viewer (Babylon.js)
```

### 13.2 Statuses

`pending` → `generating_photo` → `photo_ready` → `generating_model` → `ready` / `failed`

### 13.3 Viewer (Planet3DViewer.tsx)

- Babylon.js engine + SceneLoader (GLB)
- Автоматична камера (ArcRotateCamera)
- Освітлення від зоряного кольору

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
