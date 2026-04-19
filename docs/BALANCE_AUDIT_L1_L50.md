# Nebulife — Balance Audit L1→L50

Апр 2026. Детальний аналіз балансу гри до 50 рівня: прогресія, ресурси, будівлі, економіка quarks, монетизація, критичні баги.

---

## 1. Прогресія та XP

### Формула (коректна)

```ts
// packages/core/src/constants/progression.ts:12-22
gap(L→L+1) = floor(100 × L^1.3)
MAX_PLAYER_LEVEL = 99
SESSION_XP = 5
```

| L    | Gap до наступного | Cumulative XP | Sessions @ 5 XP |
|------|------------------:|--------------:|----------------:|
| 1→2  |              246 |           246 |              50 |
| 10   |            2 258 |         9 586 |           1 918 |
| 20   |            5 234 |        45 091 |           9 019 |
| 30   |            8 685 |       112 627 |          22 526 |
| 40   |           12 491 |       216 341 |          43 269 |
| **50** | **16 589**     | **359 474**   | **71 895**      |

### Джерела XP

| Подія                          | XP                | Файл |
|--------------------------------|------------------:|------|
| SESSION_XP (кожна сесія)       |                 5 | `progression.ts:120` |
| Ring 0-1 complete              |                30 | `RING_XP_REWARD` |
| Ring 2 complete                |                50 | |
| Neighbor complete              |               100 | |
| Core depth 0                   |               200 | |
| Core 1-4                       |               300 | |
| Core 5-8                       |               400 | |
| Core 9-12                      |               500 | |
| Discovery + rarity             |    20 + 0-100     | |
| Observatory scan               |                15 | |
| Building placed                |                15 | |
| Evacuation start (1×)          |               200 | |
| Colony founded (1×)            |               500 | |
| Hex unlock Ring 1/2/3          |     15 / 50 / 200 | |
| Tech tree (58 нод total)       |         ~3 475    | |
| Daily login                    |    **0 XP** (1Q)  | |

### Висновок (КРИТИЧНИЙ)

**L50 недосяжний.** Теоретичний максимум зі всіх джерел:

- 19 персональних систем: **810 XP**
- 950 neighbor систем × 100: **95 000**
- 500 core × avg 333: **~200 000**
- Tech tree: **3 475**
- Milestones (evac + colony + 1500 buildings placed…): **~1 600**
- SESSION_XP ×500: **2 500**
- Discoveries: ~3 000
- **Σ = ~306 000 XP < 359 474 потрібно → ~L47-48 максимум**

**Проблеми:**

1. L25-50 = 79% всього XP (285k з 359k). Контенту бракує ~18%.
2. SESSION_XP = 5 — 0.001% від потрібного. Марний стимул "грати".
3. Ring 0-2 (свої 19 систем) дають лише **810 XP** — 0.23% L50.
4. Daily login = **0 XP** (тільки 1 quark). В CLAUDE.md була обіцянка XP — не впроваджено.
5. OBSERVATORY_SCAN (15 XP) плоский, не залежить від зони → core scan = home scan.

### Doomsday timer — НЕ ВІДПОВІДАЄ ДИЗАЙНУ

| Константа                        | В коді     | В GAME_BIBLE |
|----------------------------------|-----------:|-------------:|
| `ASTEROID_COUNTDOWN_SECONDS`     | **3 600** (1 год) | **604 800** (7 днів) |
| `RESEARCH_DURATION_MS`           | **30 000** (30с) | 3 600 000 (1 год) |
| `BASE_TIME_MULTIPLIER`           |         24 | 24 |

З 1-годинним таймером + 1-годинною сесією гравець фізично встигає **3 дослідження** (по одному на обсерваторію). Вся економіка розрахована на 7 діб. Потрібно:

- `ASTEROID_COUNTDOWN_SECONDS` = 604 800
- `RESEARCH_DURATION_MS` = 3 600 000 (prod) або принаймні 600 000 (10 хв)

---

## 2. Ресурси та будівлі

### Стартові

| Ресурс         | Початок | Файл |
|----------------|--------:|------|
| Minerals       |       0 | `App.tsx:522` |
| Volatiles      |       0 | |
| Isotopes       |     150 | |
| Water          |       0 | |
| Research Data  |      70 | `balance.ts:43` |
| Chemicals      |   `{}`  | |
| Quarks         |      20 | `db.ts:47` |

### Зона → вартість розблокування (hex)

| Зона | К-сть hex | Cost за 1 | Total |
|------|----------:|-----------|-------|
| 1    |         6 | 10 iso + 1 RD | 60I + 6RD |
| 2    |       ~12 | 15M + 10V + 2 RD | 180M + 120V + 24RD |
| 3    |        ~8 | 30M + 20V + 5W + 5 RD | 240M + 160V + 40W + 40RD |
| 4    |        ~3 | 50M + 30V + 10W + 8 RD | 150M + 90V + 30W + 24RD |
| 5+   |     кути  | 80M + 50V + 20W + 10I + 15 RD | |

**Зона 1 повністю покривається стартовими isotopes** (60 ≤ 150). Стартер надлишковий. Зона 2 = bottleneck через volatiles (до L12 немає atmo_extractor).

### Продуктивність ключових будівель (на годину)

| Будівля          | L unlock | Виробляє/год | Cost |
|------------------|---------:|--------------|------|
| Mine             |        1 | **120 M**    | 5M |
| Water extractor  |        1 | 60 W         | 5M + 3V |
| Atmo extractor   |       12 | 120 V        | 15M + 10V + 2I |
| Deep drill       |       20 | 180 M        | 25M + 12V + 3I |
| Orbital collect. |       30 | 240 V        | 40M + 20V + 8I |
| Isotope collect. |        6 | 9 I          | 12M + 5V |
| Research lab     |        5 | 1 RD         | 8M + 5V |
| Observatory      |        2 | 2 RD         | 10M + 5V + 2I |
| Orbital tel.     |       28 | 3 RD         | 45M + 25V + 8I |
| Quantum comp.    |       38 | 5 RD         | 60M + 35V + 10I + 5Ti |
| Fusion reactor   |       42 | +50 energy   | 70M + 40V + 15I + **8U** |
| Genesis vault    |       48 | 0.015 hab    | 120M + 50V + 20I + **10U + 3Pt** |

### Виявлені баги/дисбаланс

1. **КРИТИЧНИЙ БАГ**: colony tick НЕ оновлює `colonyResources` React state (`App.tsx:1216-1232`). Mine виробляє в `colony.resources` але UI читає з окремого state → гравець **не може накопичити minerals пасивно** щоб купити будівлі. Треба `setColonyResources(...)` у `runColonyTicks` result handler.

2. **Dead code**: `HEX_RING1_COSTS` / `HEX_RING2_COSTS` в `balance.ts` ігноруються — `hex-utils.ts:getUnlockCost()` має свої плоскі значення. Видалити старий масив.

3. **Mine overpowered**: 120M/год тривіалізує zone 2 (15M/hex) — 12 hexes за 1.5 год.

4. **Volatile bottleneck** (до L12): ~6V/год мануально. Zone 2 потребує 120V → 20+ годин грінду.

5. **Water marno**: 60W/год з водонасосу, нема споживача до zone 3 → упирається в cap 1000 за 16 год.

6. **Isotope collector misplaced** (L6, 9/год): isotopes потрібні тільки stage 1 (60 для zone 1) або zone 5+. Середина гри (L6-35) не потребує їх.

7. **Platinum непередбачувано**: genesis_vault потребує 3 Pt, але Pt є тільки через `deep_drill` на планетах з Pt-unique resource. Якщо на домі Pt немає → L48 blocked forever.

8. **Titanium ~30 годин**: quantum_computer потребує 5 Ti, quantum_separator дає 1 будь-який мінерал/год (1/6 шанс Ti) → **30 год чистої роботи**.

9. **Refinery baraбani не перевіряють consumption success** (`colony-tick.ts:210-236`) — quantum_separator виробляє елементи навіть коли minerals в 0.

10. **`rarityYield()` використовує `Math.random()`** — не детерміновано на відміну від решти системи (`hex-utils.ts:215-222`).

11. **`COLONY_HUB_ISOTOPE_RATE` константа (`balance.ts:167`) нікуди не викликається** — hub не виробляє isotopes попри заявлене.

12. **`tileAt` завжди undefined** в `colony-tick` (`App.tsx:1214`) → всі terrain/environment модифікатори = 1.0 (ігноруються).

---

## 3. Quarks — монетизація

### Джерела

| Подія                          | Quarks | Частота |
|--------------------------------|-------:|---------|
| Starter                        |     20 | 1× при реєстрації |
| Daily login                    |      1 | 1×/UTC day |
| 3 rewarded ads                 |      5 | до 3×/день (max 15/день) |
| Pro daily bonus                |      5 | 1×/день (тільки Pro) |
| MonoPay (Ukraine web)          | 1/UAH  | кастомна сума 1-10000 |
| IAP 100Q / 500Q / 2000Q        | 100/500/2000 | any (native) |

**Безкоштовний денний прибуток:**
- Free: 1 + 15 = **16 Q/день** (тільки з native-платформи; web max 1/день)
- Pro: 5 + 1 + 15 = **21 Q/день**

### Ціни

| Дія                        | Вартість | Ads альтернатива |
|----------------------------|---------:|-----------------:|
| Discovery photo (Kling)    | **25 Q** | 3 ads |
| Planet photo               |     25 Q | 3 ads |
| System panorama            | **30 / 50 / 100 Q** ⚠️ | 5 ads |
| Mission short (5с video)   |     30 Q | — (L50 stub) |
| Mission long (10с video)   |     60 Q | — (L50 stub) |
| A.S.T.R.A. token recharge  |     50 Q | — |
| Alpha Harvester (1-й)      |     50 Q | — |
| Alpha Harvester (2-й)      |    103 Q | — |
| Alpha Harvester (3-й+)     |    206 Q | — |

### IAP пакети

| SKU                         | Q    | USD    | Q/$   |
|-----------------------------|-----:|-------:|------:|
| `nebulife_quarks_100`       |  100 |  $0.99 |   101 |
| `nebulife_quarks_500`       |  500 |  $3.99 |   125 |
| `nebulife_quarks_2000`      | 2000 | $12.99 | **154** (best) |

**MonoPay web:** 1 Q = 1 UAH ≈ $0.024. Native: 1 Q ≈ $0.0065-0.0099. **Web українці платять в 3-5× дорожче за Q**.

### Критичні проблеми

1. **Starter 20 Q — навіть не вистачає на перше фото** (25 Q). Перший paywall б'є ще до першого скіну. Треба 30 Q стартер.

2. **Triple pricing system panorama** (30/50/100 Q у різних файлах):
   - Сервер: `api/system-photo/generate.ts:10` = 100
   - SystemContextMenu: `PHOTO_COST = 50`
   - i18n: "· 30" (`en.json:686`)
   - RadialMenu: guard `quarks >= 100`
   - → Гравцеві показують 50, сервер знімає 100. Bug.

3. **Research data ad reward broken**: `api/ads/reward.ts:86` повертає 10 але не викликає DB-function, research_data не кредитується.

4. **Немає quarks з геймплею** — 0 quarks за research, tech, discoveries, level up. Всі заробки: login + реклама.

5. **A.S.T.R.A. free 1000 токенів/день ≈ 2-3 повідомлення** — замало для UX.

6. **Повна гра (~8 300 Q всіх фото + усіх premium)**:
   - Free: 8 300 ÷ 16 Q/день = **519 днів (1.4 роки)**
   - Pro: 8 300 ÷ 21 = **395 днів (13 міс.)**
   - IAP: 5× $12.99 = **$65** одноразово

---

## 4. Рекомендації (пріоритезовано)

### P0 — КРИТИЧНІ (ламають гру)

1. **Виправити colony tick bug** — `setColonyResources` після `runColonyTicks` щоб пасивна продукція будівель нарешті доходила до UI. Без цього всі mine/water_extractor/etc. марні для building costs.

2. **Виправити doomsday таймер** — `ASTEROID_COUNTDOWN_SECONDS` 3600 → 604800 (7 діб). Інакше countdown спливає за 1 годину і гра ламається.

3. **Виправити research duration** — 30 секунд (dev value) → 600 000-900 000 мс (10-15 хв) для реального геймплею.

4. **Зафіксувати єдиний system panorama price** — обрати 50 Q, узгодити в 4 місцях (server, context menu, radial menu, i18n).

5. **Починати зі starter 30 Q** — щоб гравець міг одразу купити перше discovery фото і побачити WOW-ефект. Зараз він не дотягує на 5 Q.

6. **Fix research_data ad reward** — додати `creditResearchData(playerId, 10)` у `api/ads/reward.ts:86`.

### P1 — БАЛАНС (серйозно впливає на feel)

7. **L50 curve перекалібрувати** — знизити експоненту 1.3 → 1.22 або базу 100 → 75. Цільове total = 250 000 XP (в рамках досяжного контенту × 1.2 safety).

8. **Додати XP з daily login** — 25 XP/день (× 60 днів = 1 500 XP). Стимул повертатися.

9. **Підняти SESSION_XP 5 → 20** — щоб активний гравець з 500 сесій отримував 10k XP (3% L50) замість 0.7%.

10. **Zone 2 unlock cost перебалансувати**: знизити volatiles 10→6 per hex, або зменшити кулдаун vent respawn 10→5 хв до L12.

11. **Isotope collector shift L6 → L3** або дати ранній alt-джерело isotopes (якийсь pickup на поверхні).

12. **Water consumer додати** — будь-який пасивний консуматор (наприклад greenhouse bio-bonus × water amount). Зараз water накопичується бездільно.

13. **Titanium drop rate** (`quantum_separator`) — з 1/6 до 1/3 для Ti (пріоритетно для quantum_computer). Або знизити кількість Ti в рецепті quantum_computer 5 → 2.

14. **Platinum safety net** — якщо гравець на L45+ без Pt unique на планетах → один Pt/тиждень з evac-milestone або random event. Уникнути hard-block на L48.

15. **Pro subscription треба cost-value upgrade** — зараз дає лише no-ads + 5 Q/день + 50 ASTRA msgs. Додати: 1 безкоштовне Kling фото/день, -50% на panorama, ексклюзивний 3D-model generation. Інакше ціннісна пропозиція слабка.

### P2 — MONETIZATION HEALTH

16. **Узгодити web vs native ціни** — MonoPay надто дешево (1 UAH/Q vs native $0.0065/Q). Підняти MonoPay 1 Q = 3 UAH. Або дати безкоштовний ad-flow на web (поки що web не має ad rewards).

17. **Додати web ads** — для справедливості з native. Google AdSense rewarded video може працювати.

18. **"Soft paywall" tutorial** — перше фото дати БЕЗКОШТОВНО як частина onboarding. Гравець розуміє цінність AI, потім вже готовий платити.

19. **Розкрити video missions раніше L50** — стаби з minLevel:50 не показуються більшості. Знизити до L20.

20. **Free path — one photo/week**: раз на тиждень безкоштовне фото (через claim) щоб free-гравці все ще отримували WOW-ефект.

### P3 — ПОЛІРУВАННЯ

21. Видалити dead code (`HEX_RING1_COSTS`, `HEX_RING2_COSTS`, `COLONY_HUB_ISOTOPE_RATE`).
22. `rarityYield()` seed з position — детерміновано.
23. Refinery buildings check consumption success.
24. `tileAt` виправити в colony tick — повернути terrain/environment modifiers.
25. `OBSERVATORY_SCAN` XP scaled by target ring (15 → 15/25/40/80 для home/ring2/neighbor/core).

---

## 5. Сценарії Ran 1-10 днів (прогноз після фіксів)

### День 1 (нова сесія, starter 30 Q, P0 фікси)
- 60 хв онбоардинг + evac = **~300 XP** (L3)
- Zone 1 unlock + 2 будівлі (mine + solar) = 300 XP (L4)
- 1 discovery photo (starter 30 Q / 0 after) = WOW
- Daily login = +1 Q (31 Q)

### День 2-3
- 3-4 research session/день → Ring 1 complete = 180 XP + 6×5 sessions = 30
- Building milestones (+15 XP ×5) = 75
- Discoveries (3 × 25) = 75
- 15 Q/день з ads → 45 Q total → 1 photo купити
- L7-8

### День 7
- Ring 2 в процесі, ~8/12 зроблено
- Техніка L12 atmo_extractor → volatile bottleneck розблоковано
- L15-18, neighbor (ast-probe L16) тільки-тільки відкривається

### День 14-21
- Усі neighbor 950 systems accessible → exponential XP
- Core gates відкриваються
- L28-35

### День 45-60
- Core deep exploration
- Чемістрі + Ti + Pt
- L45-49

**Без фіксів: L50 не досягається навіть за 1 рік.**

---

## 6. Пріоритетний action list для наступного релізу

| № | Фікс | Severity | Effort | Commit-size |
|---|------|----------|--------|-------------|
| 1 | colony tick → setColonyResources | CRIT | 30 min | ~20 рядків |
| 2 | ASTEROID_COUNTDOWN 3600→604800 | CRIT | 5 min | 1 рядок |
| 3 | RESEARCH_DURATION 30s→15min | CRIT | 5 min | 1 рядок |
| 4 | Panorama price unify 50 Q | HIGH | 15 min | 4 файли |
| 5 | STARTER_QUARKS 20→30 | HIGH | 5 min | 1 рядок |
| 6 | Ad research_data credit | HIGH | 15 min | `api/ads/reward.ts` |
| 7 | XP curve rebalance | HIGH | 15 min | `progression.ts` |
| 8 | Daily login XP +25 | MED | 15 min | `login-bonus` endpoint |
| 9 | SESSION_XP 5→20 | MED | 5 min | 1 рядок |
| 10 | Pro bundle enrichment | MED | 1-2 год | нові endpoints |

---

Звіт: `docs/BALANCE_AUDIT_L1_L50.md`
