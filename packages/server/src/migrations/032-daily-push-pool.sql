-- 032: Editable pool of daily auto-push texts (admin console → "Щоденні автопуші").
-- The daily-reminders cron rotates through ENABLED rows (ordered by sort_order)
-- one per player per day. Run in Neon SQL Editor.

CREATE TABLE IF NOT EXISTS daily_push_pool (
  id          TEXT PRIMARY KEY,
  title_uk    TEXT NOT NULL,
  body_uk     TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  body_en     TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with the 5 texts that were hardcoded in push-events.ts until now.
INSERT INTO daily_push_pool (id, sort_order, title_uk, body_uk, title_en, body_en) VALUES
  ('seed-1', 1,
   'Твій космос чекає',
   'Телескопи знову ловлять сигнали. Повернися й перевір, яка система може стати новою домівкою.',
   'Your cosmos is waiting',
   'The telescopes are catching new signals. Return and check which system could become your next home.'),
  ('seed-2', 2,
   'Є шанс знайти нову планету',
   'Команда A.S.T.R.A. підготувала коротке вікно для дослідження. Один запуск може змінити майбутнє колонії.',
   'A new planet may be close',
   'A.S.T.R.A. has prepared a short exploration window. One scan could change your colony''s future.'),
  ('seed-3', 3,
   'Космічний сигнал посилився',
   'Обсерваторія бачить цікаве відлуння в сусідньому секторі. Зайди, поки дані не застаріли.',
   'A space signal is stronger',
   'The observatory sees an unusual echo in a nearby sector. Open Nebulife before the data goes stale.'),
  ('seed-4', 4,
   'Колонії потрібен командир',
   'Ресурси, місії й нові орбіти чекають рішення. Повернися на кілька хвилин і зроби наступний крок.',
   'The colony needs a commander',
   'Resources, missions, and new orbits are waiting for a decision. Return for a few minutes and take the next step.'),
  ('seed-5', 5,
   'Сьогодні хороший день для відкриття',
   'У твоєму секторі ще є планети, які ніхто не бачив зблизька. Запусти дослідження й відкрий власний космос.',
   'Today is a good day to discover',
   'Your sector still has planets no one has seen up close. Launch a scan and expand your own cosmos.')
ON CONFLICT (id) DO NOTHING;
