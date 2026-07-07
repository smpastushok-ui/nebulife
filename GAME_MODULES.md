# Nebulife — Реєстр ігрових модулів

Канонічний перелік усіх ігрових модулів, підсистем і запланованих фіч Nebulife. Використовуйте як єдине джерело правди про те, що вже є в грі, що в роботі і що лише в планах.

**Цей файл — канонічний реєстр модулів гри. При додаванні нового модуля або суттєвої функції ОБОВ'ЯЗКОВО додати запис сюди.**

Статуси: **реалізовано** — працює в prod/dev; **в розробці** — код є, але MVP не завершено; **заплановано** — описано в TODO/NEXT_GEN/GAME_BIBLE, коду немає або лише заглушки.

---

## Дослідження космосу

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| Галактична карта (2D) | PixiJS-карта особистих, сусідніх і core-систем з zoom/pan | реалізовано | `packages/client/src/game/scenes/GalaxyScene.ts`, `GameEngine.ts` |
| Особисті кільця (Ring 0–2) | 19 систем на гравця: дім + 6 + 12, детерміновані від seed | реалізовано | `packages/core/src/generation/galaxy-generator.ts` |
| Core Zone | 500 NPC-систем, Delaunay mesh, depth 0–12, BFS-навігація | реалізовано | `packages/core/src/generation/galaxy-group-generator.ts`, `delaunay.ts` |
| Сусідні гравці | Ring-системи інших гравців кластера (ast-probe L16+) | реалізовано | `packages/client/src/game/GameEngine.ts`, `GalaxyScene.ts` |
| 3D-вид всесвіту | Three.js галактика + zoom до кластера (LOD) | реалізовано | `packages/client/src/game/UniverseEngine.ts` |
| Кластери (50 гравців) | Авто-масштабування груп, advisory locks, group seed | реалізовано | `packages/server/src/cluster-manager.ts`, `api/cluster/*` |
| Дослідження систем | Сесії обсерваторій, прогрес 2–50%, вхід при 100% | реалізовано | `packages/core/src/game/research.ts`, `ObservatoryView.tsx` |
| Обсерваторії | 3–6 паралельних слотів залежно від рівня гравця | реалізовано | `packages/core/src/constants/balance.ts`, `ObservatoryView.tsx` |
| Прогресивне розкриття | Поступове відкриття класу зорі, планет, T, habitability | реалізовано | `packages/core/src/game/research.ts` |
| Каталог космічних подій | Пошук подій 1/6/24 год, рідкісність, pity, unseen bias | реалізовано | `packages/core/src/game/observatory-search.ts`, `cosmic-catalog.ts` |
| Орбітальний телескоп | Countdown до події, 24-год вікно активного дослідження | реалізовано | `ObservatoryView.tsx`, `TelescopeOverlay.tsx` |
| SystemScene | Орбітальний вид системи, місії, auto-fit камера | реалізовано | `packages/client/src/game/scenes/SystemScene.ts` |
| Планетарні місії | orbital_probe / surface_landing / deep_atmosphere_probe, tier 1–3 | реалізовано | `packages/core/src/game/planet-exploration.ts`, `PlanetMission/` |
| PlanetGlobeView | 3D-глобус планети з орбітою та reveal-рівнями | реалізовано | `PlanetGlobeView.tsx`, `TerraformGlobe.ts` |
| PlanetContextMenu | Контекстне меню планети: перегляд, місії, колонія, цивілізація | реалізовано | `PlanetContextMenu.tsx` |
| PlanetInfoPanel | Детальна панель характеристик планети | реалізовано | `PlanetInfoPanel.tsx`, `PlanetDetailWindow.tsx` |
| Космічний Архів | Каталоги систем, планет, колоній, ресурсів, телескопа, логів | реалізовано | `CosmicArchive/CosmicArchive.tsx` |
| Discoveries | Roll рідкості, галерея, pixel reveal, наукові звіти | реалізовано | `packages/core/src/game/discovery.ts`, `PixelReveal.tsx`, `ScientificReport.tsx` |
| Share discoveries | Публічні посилання на відкриття, OG-картки | реалізовано | `api/share/*`, `api/discoveries/index.ts` |
| Comet Herald | Циклічна жива подія з tracking і нагородами | реалізовано | `packages/core/src/game/comet-event.ts`, `api/event/comet-claim.ts` |
| Warp / навігація | Переходи між системами, warp overlay, breadcrumbs | реалізовано | `WarpOverlay.tsx`, `GalaxyWarpOverlay.tsx`, `CommandBar/` |
| Home Planet | Стартова сцена, катастрофа, doomsday countdown | реалізовано | `packages/client/src/game/rendering/HomePlanetRenderer.ts`, `CinematicIntro.tsx` |
| Корабель порятунку | Запуск doomsday ship, 1% c, 10 000 пасажирів, ETA | реалізовано | `packages/core/src/game/doomsday-ship.ts`, `EvacuationPrompt.tsx` |
| Stellar companions | Metadata вторинних/tertiary зір у системах | реалізовано | `packages/core/src/generation/star-companions.ts` |
| Proximity modifiers | Модифікатори механік за відстанню від дому (кільця) | реалізовано | `packages/core/src/game/proximity.ts` |
| AI-фото системи | Kling-генерація фото зірки/системи з prompt builder | реалізовано | `api/system-photo/*`, `system-photo-prompt-builder.ts` |
| System missions (фото) | Генерація місійних фото подій системи | реалізовано | `api/system-mission/*`, `mission-photo-api.ts` |
| Відео-місії | 15–30 сек відео експедицій (Gemini + Veo/Kling + TTS) | заплановано | `TODO.md`, `GAME_BIBLE.md` §0.4-A |
| Кастомне ім'я зірки | Перейменування зірки за кварки / streak-нагорода | заплановано | `TODO.md`, `api/player/*` (немає endpoint) |
| Сезони спостережень | 6-8 тижн. глобальні сезони (4 теми, обчислюються від дати): 5 сезонних аномалій у пулі обсерваторії з pity, колекція слотів + фінал (72г, 2× шанс), +150⚛ за повну колекцію | в розробці | `packages/core/src/game/observation-seasons.ts`, `cosmic-catalog.ts` (SEASONAL_ANOMALIES), `api/event/season-claim.ts`, `BuildingDetailPanel.tsx`, `CosmicArchive/SeasonHallGallery.tsx` |

---

## Колонізація та економіка

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| SurfaceScene (Pixi) | Ізометрична поверхня планети, ресурси, fog, harvest | реалізовано | `packages/client/src/game/scenes/SurfaceScene.ts` |
| HexSurface | Гекс-сітка колонії: будівлі, видобуток, склад | реалізовано | `hex-surface/HexSurface.tsx`, `HexGrid.tsx`, `HexSlot.tsx` |
| Colony Center | Управління колонією, будівлі, лабораторія, DNA-гра | реалізовано | `ColonyCenter/ColonyCenterPage.tsx`, `BuildingDetailPanel.tsx` |
| Colony tick | Щогодинний tick виробництва, енергії, population | реалізовано | `packages/core/src/game/colony-tick.ts` |
| Production | Черги виробництва payload/carrier/юнітів | реалізовано | `packages/core/src/game/production.ts` |
| Logistics / флот | Запуск вантажів, cargo load/unload, trade routes | реалізовано | `packages/core/src/game/logistics.ts`, `fleet-rules.ts` |
| Terraforming | Багатопaramетрове тераформування непридатних планет | реалізовано | `packages/core/src/game/terraform-rules.ts`, `Terraform/TerraformPanel.tsx` |
| Planet stocks | Скінченні запаси minerals/volatiles/isotopes/water на планеті | реалізовано | `packages/core/src/game/planet-stocks.ts` |
| Post-evacuation safety | Floor запасів на home і першій колонії після евакуації | реалізовано | `packages/core/src/constants/balance.ts` |
| Energy system | Баланс енергії будівель, shutdown/restore | реалізовано | `packages/core/src/game/energy.ts` |
| Quantum Separator | Bulk → елементи, batch separation jobs | реалізовано | `packages/core/src/game/separation.ts`, `ElementResultCard.tsx` |
| Research Lab | Particle extraction jobs з research data | реалізовано | `packages/core/src/game/lab.ts` |
| Genesis Lab / DNA | Spark of Life: 4 типи іскор, DNA minigame, синтез | реалізовано | `GenesisLabModal.tsx`, `DnaConstructorGame.tsx`, `lifeform.ts` |
| Lifeform discovery | Знаходження життя на поверхні, ingredients, reveal | реалізовано | `LifeformDiscoveryModal.tsx`, `LifeformRevealModal.tsx`, `api/lifeform/*` |
| Building rules | Доступність будівель за terrain, atmosphere, tech | реалізовано | `packages/core/src/game/planet-rules.ts` |
| Element harvest | Пропорційна генерація елементів з hex harvest | реалізовано | `packages/core/src/game/element-harvest.ts` |
| AI-поверхня (Kling) | Генерація фото поверхні планети + процедурний fallback | реалізовано | `api/surface/*`, `SurfaceBabylonView.tsx`, `SurfacePixiView.tsx` |
| Surface Babylon viewer | Перегляд AI-фото поверхні у 3D | реалізовано | `SurfaceBabylonView.tsx`, `BuildingGLBLoader.ts` |
| Operations Hub | Центр операцій: директиви, події, сигнали, рейтинг | реалізовано | `OperationsHub/OperationsHub.tsx` |
| Daily directives | Щоденні завдання з метриками і streak-нагородами | реалізовано | `packages/core/src/game/daily-directives.ts`, `DirectivesTab.tsx` |
| Signal decoder | Міні-гра декодування сигналів у Operations Hub | реалізовано | `OperationsHub/SignalDecoderGame.tsx` |
| Цивілізації (інтеграція) | Рідкісні populated planets: дипломатія, довіра, workforce | в розробці | `packages/core/src/game/civilization.ts`, `Civilization/CivilizationTab.tsx` |
| Покращення будівель (levels) | 3–5 рівнів на модуль з множником продуктивності | заплановано | `TODO.md` |
| Маркетплейс P2P | Обмін rare life-forms, фото, 3D між гравцями, fee 10% | заплановано | `GAME_BIBLE.md` §0.4-E, `TODO.md` |
| Облога цивілізації | Бойова облога через unified raid engine | заплановано | `NEXT_GEN_PLAN.md` §B |

---

## Бій

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| Hangar | Управління кораблями, вибір режимів бою, Tripo preview | реалізовано | `Hangar/HangarPage.tsx`, `api/ship/*` |
| Space Arena | PvP-duel L50+, Three.js фізика, warp, power-ups | реалізовано | `SpaceArena/SpaceArena.tsx`, `game/arena/ArenaEngine.ts` |
| Carrier Raid | PvE: гравець + 4 AI wingmen vs carrier і хвилі дронів | реалізовано | `Raid/CarrierRaid.tsx`, `game/raid/RaidEngine.ts` |
| Cosmic Battle | Тактична grid-битва Battleship vs AI, resource drops | реалізовано | `CosmicBattle/CosmicBattlePage.tsx`, `cosmic-battle-engine.ts` |
| Unified Raid Engine | Єдиний Pixi v8 рушій: sprite-baking, particles, explosions | в розробці | `RaidEngine.ts`, `ShipSpriteBaker.ts`, `RaidParticles.ts`, `RaidExplosions.ts` |
| Arena на shared engine | Консолідація Arena + Raid на один Pixi-рушій | заплановано | `NEXT_GEN_PLAN.md` §A |
| Territorial PvP / defense | Кланова оборона core zone, expand з арени | заплановано | `GAME_BIBLE.md` §0.4-E |
| Combat sim stability | Уніфікація flight profile між warp/power-ups/mobile | заплановано | `TODO.md` |

---

## Соціальне та спільнота

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| Global chat | Загальний чат кластера / галактики | реалізовано | `ChatWidget.tsx`, `api/messages/*` |
| A.S.T.R.A. chat | AI-асистент з Gemini, контекст гри | реалізовано | `ChatWidget.tsx`, `api/ai/chat.ts` |
| Канали / DM | system:*, astra:*, dm:*, read state, unread | реалізовано | `api/messages/channels.ts`, `NewDMModal.tsx` |
| Moderation / report | Скарги на повідомлення, cron moderate | реалізовано | `api/messages/report.ts`, `api/cron/moderate.ts` |
| Community polls | Голосування в чаті, admin create/close/results | в розробці | `api/polls/*`, `api/admin/poll-*.ts`, `polls-api.ts` |
| Cluster presence | Online-статус гравців у кластері | реалізовано | `api/cluster/presence.ts` |
| Player search | Пошук гравців за callsign | реалізовано | `api/players/search.ts` |
| Player feedback | "Message the Weaver" — likes/dislikes від L12+ | реалізовано | `PlayerFeedbackPrompt.tsx`, `api/feedback/submit.ts` |
| Weekly digest share | Share card для Telegram/Discord (OG image) | заплановано | `TODO.md`, `DigestModal.tsx` |
| Referral program | +10⚛ обом за запрошеного гравця | заплановано | `TODO.md` |
| Клани | Cluster як guild, лідер, прапор, реєстр | заплановано | `GAME_BIBLE.md` §0.4-E, `TODO.md` |
| Territorial control | Passive bonus за контроль core zone | заплановано | `TODO.md`, `NEXT_GEN_PLAN.md` |
| Мегаструктури кластера | Колективна довгобудова 50 гравців кластера: щоденні внески ресурсів з лімітом, "Галактичний маяк" (тільки тип на MVP), нагороди за частку внеску, постійний бонус +5% швидкості досліджень кластеру, вічний запис "Будівничі" | в розробці | `packages/core/src/game/megastructure.ts`, `api/megastructure/*`, `MegastructureTab.tsx`, `043-megastructures.sql` |
| Сигнали Предтеч | Колекційні картки (14, 4 рідкості) з дропом за планетарні місії дослідження (15% база, 20% deep_atmosphere_probe, 10% orbital_scan; 4 картки — лише в Core Zone); анімація перехоплення сигналу; галерея "Термінал" у Космічному Архіві | в розробці | `packages/core/src/game/precursor-cards.ts`, `packages/core/src/types/precursor-cards.ts`, `Precursor/PrecursorGallery.tsx`, `Precursor/PrecursorAcquisitionOverlay.tsx` |

---

## Освіта

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| Космічна Академія | Щоденні уроки, вікторини, профіль, історія | реалізовано | `Academy/*`, `api/academy/*` |
| Academy quests | Денні квести з complete-quest flow | реалізовано | `Academy/QuestView.tsx`, `api/academy/complete-quest.ts` |
| Mission curriculum | Навчальна програма місій, topic selection | реалізовано | `Academy/MissionCurriculumView.tsx`, `missionCurriculum.ts` |
| Adaptive difficulty | Gemini враховує прогрес; preferences API | реалізовано | `api/academy/preferences.ts`, `education-generator.ts` |
| Encyclopedia | Окремий екран енциклопедії (lessons bank) | реалізовано | `Encyclopedia/EncyclopediaScreen.tsx`, `encyclopedia-quiz-bank.ts` |
| Surface ASTRA lesson | Підказка уроку ASTRA на поверхні планети | реалізовано | `Academy/SurfaceAstraLessonPrompt.tsx` |
| Academy TTS | Озвучка уроків через generate-tts | реалізовано | `api/academy-library/generate-tts.ts` |
| Streak bonuses | 7/30/100 днів — кварки, tech preview, star name | заплановано | `TODO.md`, `GAME_BIBLE.md` §0.4-D |
| NASA APOD / JWST hooks | Реальні новини як джерело уроків і місій | заплановано | `TODO.md` |
| Deep-dive lessons | Платні розширені уроки (3⚛) | заплановано | `TODO.md` |
| Post-L10 guidance | Блок "Поточна директива" за рівнем/станом | заплановано | `TODO.md` |

---

## AI-контент

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| Kling photo pipeline | JWT auth, generate, poll, Blob storage | реалізовано | `api/kling/*`, `packages/server/src/kling-client.ts` |
| First-photo hook | Перша Kling-генерація безкоштовна, share-ready | реалізовано | `PhotoModal.tsx`, `GalleryCompareModal.tsx` |
| System / surface photos | Prompt builder за фізикою планети/зірки | реалізовано | `system-photo-prompt-builder.ts`, `api/surface/generate.ts` |
| Lifeform photo / video | Kling specimen + optional video generation | реалізовано | `api/lifeform/photo/*`, `api/lifeform/video/*`, `lifeform-prompt-builder.ts` |
| Tripo 3D ships | Kling concept → Tripo GLB, face_limit, Hangar | реалізовано | `api/tripo/*`, `api/ship/*`, `tripo-client.ts` |
| Gemini content | Lessons, quizzes, digest, ASTRA, moderation, reports | реалізовано | `gemini-client.ts`, `education-generator.ts` |
| Weekly Digest (AI) | Cron Gemini news + bilingual images | реалізовано | `api/cron/weekly-digest.ts`, `DigestModal.tsx`, `EntryDigestPopup.tsx` |
| Biosphere creatures (3D) | Image → Tripo GLB → Babylon scene, до 3 істот/планету | в розробці | `Biosphere/BiosphereView.tsx`, `api/creatures/*`, `040-creature-models.sql` |
| Еволюція біосфери | Щоденний догляд, ростові стадії, покоління та мутації істот; схрещування двох істот у гібрида (фото 15⚛ / з 3D 60⚛ / апгрейд 50⚛) | в розробці | `packages/core/src/game/creature-evolution.ts`, `api/creatures/care.ts`, `api/creatures/evolve.ts`, `api/creatures/hybridize.ts`, `api/creatures/hybrid-upgrade.ts`, `041-creature-evolution.sql`, `042-creature-hybrids.sql` |
| Scientific reports | AI-звіти після discoveries | реалізовано | `packages/core/src/game/scientific-report.ts`, `ScientificReport.tsx` |
| Planet skin AI | Kling skin для planet view | реалізовано | `api/planet-skin/*` |
| Video missions | Gemini script + Veo/Kling mp4 + TTS | заплановано | `TODO.md` §П1 |
| Watermark на артефактах | Серверний sharp/ffmpeg watermark nebulife.space | заплановано | `TODO.md` §П1 |
| Life-form rarity tiers | Common/rare/legendary DNA → різна ціна | заплановано | `TODO.md`, `GAME_BIBLE.md` §0.4-B |
| Collection re-roll | Rarity badges, cooldown, premium "save both" | заплановано | `TODO.md` |
| Tripo planet models | Відключено — планети лише AI-фото (deprecated) | заплановано | `GAME_BIBLE.md` §0.4-bis |
| Creature rig / wander AI | Tripo animate + wander на HexSurface | заплановано | `NEXT_GEN_PLAN.md` §C |
| Сага Ткача | Персональна ілюстрована хроніка гравця: Gemini пише розділ (текст + 1 ілюстрація) у голосі Ткача на кожній ключовій milestone (перша колонізація, L10/20/35, легендарна знахідка, прибуття корабля Судного дня, перша поселена істота, інтеграція цивілізації); клієнтський milestone-детект + черга в `game_state`, генерація 1/день/гравця, читалка в PlayerPage | в розробці | `packages/core/src/game/saga.ts`, `packages/server/src/saga-prompt.ts`, `api/saga/generate-chapter.ts`, `api/saga/list.ts`, `Saga/SagaReader.tsx`, `useSagaChapters.ts`, `044-saga-chapters.sql` |

---

## Монетизація

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| Кварки (⚛) | In-game валюта, баланс у CommandBar | реалізовано | `packages/core/src/constants/balance.ts`, `QuarkToastQueue.tsx` |
| MonoPay top-up | Поповнення кварків через MonoPay | реалізовано | `api/payment/topup.ts`, `QuarkTopUpModal.tsx` |
| RevenueCat IAP | Quark packs 100/500/2000 | реалізовано | `api/iap/grant.ts`, `iap-service.ts` |
| Premium subscription | Monthly/yearly/lifetime Pro | реалізовано | `api/payment/premium.ts`, `ExospherePremiumPanel.tsx` |
| Premium daily quarks | +5⚛/день для Pro | реалізовано | `api/player/daily-quarks.ts` |
| Rewarded ads | AdMob +5⚛ за 3 ролики, server limit 10/day | реалізовано | `api/ads/*`, `ads-service.ts`, `AdProgressButton.tsx` |
| Starter balance | 50⚛ при реєстрації | реалізовано | `api/player/create.ts` |
| Quiz reward | +2⚛ за денну вікторину Академії | реалізовано | `api/academy/answer-quiz.ts` |
| Spend quarks API | Серверна валідація витрат | реалізовано | `api/player/spend-quarks.ts` |
| Alpha Signal promo | Промо-модал для alpha/beta гравців | реалізовано | `AlphaSignalPromoModal.tsx`, `alpha-promo-manager.ts` |
| Premium redeem codes | Промокоди на premium | реалізовано | `api/premium/redeem-code.ts` |
| Login bonus | Щоденний бонус входу | реалізовано | `api/player/login-bonus.ts` |
| Video mission pricing | 20⚛ / 35⚛ за відео-місії | заплановано | `TODO.md` |
| Life-form pricing | 5/15/40⚛ за rarity tier | заплановано | `TODO.md` |
| Ship 3D pricing | 49⚛ за Tripo корабель | реалізовано | `api/ship/generate.ts`, `HangarPage.tsx` |
| Clan subscription | 99⚛/міс leader perks | заплановано | `GAME_BIBLE.md` §0.4-E |
| Remove watermark Pro | +50⚛/міс без watermark на paid артефактах | заплановано | `TODO.md` |
| Digest premium art | 5⚛ за hero-ілюстрацію дайджесту | заплановано | `TODO.md` |

---

## Мета-прогресія

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| XP / рівні | Крива L^1.3, gap(L)=floor(100×L^1.3) | реалізовано | `packages/core/src/constants/progression.ts` |
| Tech Tree | 50 нод, 4 гілки astro/physics/chem/bio | реалізовано | `packages/core/src/game/tech-tree.ts`, `TechTree/` |
| Ring unlock | Прогресія Ring 2, neighbor, core за рівнем/tech | реалізовано | `RingUnlockAnimation.tsx`, `research.ts` |
| Observatories scaling | 3→6 обсерваторій L1/L12/L20/L36 | реалізовано | `packages/core/src/constants/progression.ts` |
| Rating / leaderboard | Таблиця лідерів у Operations Hub | реалізовано | `OperationsHub/RatingTab.tsx`, `api/rating/leaderboard.ts` |
| Weekly champions | Cron щотижневі чемпіони | реалізовано | `api/cron/weekly-champions.ts` |
| Player profile | PlayerPage: settings, stats, gallery, premium | реалізовано | `PlayerPage.tsx`, `CommandBar/PlayerPanel.tsx` |
| Callsign / avatar | Унікальний позивний, avatar upload | реалізовано | `CallsignModal.tsx`, `api/auth/*`, `api/player/avatar.ts` |
| Level-up banner | Сповіщення про новий рівень | реалізовано | `LevelUpBanner.tsx` |
| Tutorial system | Overlay tutorials, free task HUD, arena tutorial | реалізовано | `Tutorial/TutorialOverlay.tsx`, `BuildingQuest.tsx` |
| Onboarding / intro | Language select, cinematic intro, StarBirth | реалізовано | `LanguageSelectScreen.tsx`, `CinematicIntro.tsx`, `StarBirthIntro.tsx` |
| Onboarding refactor | 60-сек discovery-first замість UI-списку | заплановано | `TODO.md`, `GAME_BIBLE.md` §0.4-F |
| App review prompt | Запит оцінки в store після milestones | реалізовано | `AppReviewPrompt.tsx` |
| Guest → register flow | Guest session, link account, registration reminder | реалізовано | `AuthScreen.tsx`, `LinkAccountModal.tsx`, `GuestRegistrationReminder.tsx` |

---

## Інфраструктура UI

| Модуль | Опис | Статус | Ключові файли |
|---|---|---|---|
| CommandBar | Уніфікована нижня панель: nav, tools, quarks | реалізовано | `CommandBar/CommandBar.tsx` |
| App scene routing | 5-рівнева навігація Home→Galaxy→System→Planet→Surface | реалізовано | `packages/client/src/App.tsx` |
| GameEngine | PixiJS scene manager, neighbor/core compute | реалізовано | `packages/client/src/game/GameEngine.ts` |
| i18n uk/en | react-i18next + LanguageProvider для Pixi | реалізовано | `packages/client/src/i18n/*` |
| Firebase Auth | Email, Google, Apple, guest, link account | реалізовано | `AuthScreen.tsx`, `api/auth/*` |
| Capacitor mobile | Android + iOS native shell | реалізовано | `capacitor.config.ts`, `android/`, `ios/` |
| Push notifications | FCM token, cron pushes, test-push | реалізовано | `api/player/fcm-token.ts`, `api/cron/*-pushes.ts` |
| Perf tier | low/mid/high GPU budget, tier select screen | реалізовано | `PerfTierSelectScreen.tsx`, `SurfacePerfMonitor.ts` |
| TelemetryView | Debug overlay FPS/memory (dev) | реалізовано | `TelemetryView.tsx` |
| Audio SFX | Звукові ефекти UI і сцен | реалізовано | `packages/client/src/audio/SfxPlayer.ts` |
| Analytics GA4 | Event tracking, funnels | реалізовано | `packages/client/src/analytics/*` |
| Digest UI | Modal + entry popup для weekly digest | реалізовано | `DigestModal.tsx`, `EntryDigestPopup.tsx` |
| WebAccessGate | Gate для web dev/admin (player-facing web скасовано) | реалізовано | `WebAccessGate.tsx`, `api/player/web-access.ts` |
| Admin tools | Broadcast message/push, polls, feedback list | реалізовано | `api/admin/*`, `admin-push.html` |
| Legal pages | Privacy, terms API | реалізовано | `api/legal/*` |
| Health / alias | Healthcheck, player alias redirect | реалізовано | `api/health.ts`, `api/alias.ts` |
| Mobile performance | Lazy scenes, 30fps galaxy, GPU budget | реалізовано | `TODO.md` (частково), `GameEngine.ts` |
| Bundle / GPU targets | <150MB GPU, <1.5MB bundle, low-power mode | заплановано | `TODO.md`, `GAME_BIBLE.md` §0.4-G |
| iOS Google Sign-In | Native Google auth на iOS | заплановано | `TODO.md` |

---

## Підсумок статусів

| Категорія | реалізовано | в розробці | заплановано | Разом |
|---|---:|---:|---:|---:|
| Дослідження космосу | 27 | 1 | 2 | 30 |
| Колонізація та економіка | 21 | 1 | 3 | 25 |
| Бій | 4 | 1 | 3 | 8 |
| Соціальне та спільнота | 7 | 3 | 4 | 14 |
| Освіта | 7 | 0 | 4 | 11 |
| AI-контент | 9 | 3 | 6 | 18 |
| Монетизація | 12 | 0 | 5 | 17 |
| Мета-прогресія | 13 | 0 | 1 | 14 |
| Інфраструктура UI | 17 | 0 | 2 | 19 |
| **Разом** | **117** | **9** | **30** | **156** |

*Останнє оновлення реєстру: липень 2026 — Сага Ткача переведена в розробку (модуль 4 з 5 затверджених); додано 5 нових модулів (Еволюція біосфери, Мегаструктури кластера, Сигнали Предтеч, Сезони спостережень в розробці).*
