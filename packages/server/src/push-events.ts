import { enqueuePushNotification } from './db.js';

interface PushEventBase {
  playerId: string;
}

async function enqueueSafe(input: Parameters<typeof enqueuePushNotification>[0]): Promise<boolean> {
  try {
    await enqueuePushNotification(input);
    return true;
  } catch (err) {
    console.warn(`[push-events] Failed to enqueue ${input.type} for ${input.playerId}:`, err);
    return false;
  }
}

const DAILY_SPACE_REMINDERS = [
  {
    titleUk: 'Твій космос чекає',
    bodyUk: 'Телескопи знову ловлять сигнали. Повернися й перевір, яка система може стати новою домівкою.',
    titleEn: 'Your cosmos is waiting',
    bodyEn: 'The telescopes are catching new signals. Return and check which system could become your next home.',
  },
  {
    titleUk: 'Є шанс знайти нову планету',
    bodyUk: 'Команда A.S.T.R.A. підготувала коротке вікно для дослідження. Один запуск може змінити майбутнє колонії.',
    titleEn: 'A new planet may be close',
    bodyEn: 'A.S.T.R.A. has prepared a short exploration window. One scan could change your colony\'s future.',
  },
  {
    titleUk: 'Космічний сигнал посилився',
    bodyUk: 'Обсерваторія бачить цікаве відлуння в сусідньому секторі. Зайди, поки дані не застаріли.',
    titleEn: 'A space signal is stronger',
    bodyEn: 'The observatory sees an unusual echo in a nearby sector. Open Nebulife before the data goes stale.',
  },
  {
    titleUk: 'Колонії потрібен командир',
    bodyUk: 'Ресурси, місії й нові орбіти чекають рішення. Повернися на кілька хвилин і зроби наступний крок.',
    titleEn: 'The colony needs a commander',
    bodyEn: 'Resources, missions, and new orbits are waiting for a decision. Return for a few minutes and take the next step.',
  },
  {
    titleUk: 'Сьогодні хороший день для відкриття',
    bodyUk: 'У твоєму секторі ще є планети, які ніхто не бачив зблизька. Запусти дослідження й відкрий власний космос.',
    titleEn: 'Today is a good day to discover',
    bodyEn: 'Your sector still has planets no one has seen up close. Launch a scan and expand your own cosmos.',
  },
] as const;

export interface DailyPushCopy {
  titleUk: string;
  bodyUk: string;
  titleEn: string;
  bodyEn: string;
  /** daily_push_pool row id — carried in the payload for analytics. */
  poolId?: string;
}

export async function enqueueDailySpaceReminderPush(input: PushEventBase & {
  reminderDay: number;
  messageIndex: number;
  scheduledAt: string;
  /** Text from the admin-editable daily_push_pool; falls back to built-ins. */
  copy?: DailyPushCopy;
}): Promise<boolean> {
  const copy: DailyPushCopy = input.copy
    ?? DAILY_SPACE_REMINDERS[input.messageIndex % DAILY_SPACE_REMINDERS.length]
    ?? DAILY_SPACE_REMINDERS[0];
  return enqueueSafe({
    playerId: input.playerId,
    type: 'daily_space_reminder',
    titleUk: copy.titleUk,
    bodyUk: copy.bodyUk,
    titleEn: copy.titleEn,
    bodyEn: copy.bodyEn,
    data: {
      action: 'open-game',
      reminderDay: String(input.reminderDay),
      ...(copy.poolId ? { poolId: copy.poolId } : {}),
      link: '/?action=open-game',
    },
    priority: 3,
    scheduledAt: input.scheduledAt,
    maxAttempts: 2,
    dedupeKey: `daily_space_reminder:${input.playerId}:${input.reminderDay}`,
  });
}

// Escalating re-engagement copy keyed by idle-threshold (days). Tone warms up
// from "we miss you" → "a lot happened" → "your colony needs you".
const INACTIVITY_COPY: Record<number, { titleUk: string; bodyUk: string; titleEn: string; bodyEn: string }> = {
  2: {
    titleUk: 'Твоя колонія сумує',
    bodyUk: 'Минуло кілька днів. Обсерваторія зібрала свіжі сигнали — зайди подивитися, що нового у твоєму секторі.',
    titleEn: 'Your colony misses you',
    bodyEn: 'A couple of days passed. The observatory gathered fresh signals — drop in and see what changed in your sector.',
  },
  7: {
    titleUk: 'За тиждень багато сталося',
    bodyUk: 'Нові орбіти, місії та відкриття чекають. Повернися й продовж шлях до нової домівки.',
    titleEn: 'A week brought a lot',
    bodyEn: 'New orbits, missions and discoveries are waiting. Come back and continue the journey to a new home.',
  },
  30: {
    titleUk: 'Космос усе ще чекає на тебе',
    bodyUk: 'Твоя колонія збереглася. Один запуск дослідження — і ти знову в грі. Повернися до Nebulife.',
    titleEn: 'The cosmos still waits for you',
    bodyEn: 'Your colony is safe and saved. One scan and you are back in the game. Return to Nebulife.',
  },
};

export async function enqueueInactivityReminderPush(input: PushEventBase & {
  thresholdDays: number;
  /** YYYYMMDD of the idle episode — keeps dedupe stable within one absence. */
  episode: string;
  favoriteHourUtc?: number | null;
}): Promise<boolean> {
  const copy = INACTIVITY_COPY[input.thresholdDays] ?? INACTIVITY_COPY[2];
  const scheduledAt =
    typeof input.favoriteHourUtc === 'number' && input.favoriteHourUtc >= 0 && input.favoriteHourUtc <= 23
      ? nextUtcHour(input.favoriteHourUtc)
      : undefined;
  return enqueueSafe({
    playerId: input.playerId,
    type: 'inactivity_reminder',
    titleUk: copy.titleUk,
    bodyUk: copy.bodyUk,
    titleEn: copy.titleEn,
    bodyEn: copy.bodyEn,
    data: {
      action: 'open-game',
      idleDays: String(input.thresholdDays),
      link: '/?action=open-game',
    },
    priority: 5,
    scheduledAt,
    maxAttempts: 2,
    dedupeKey: `inactivity:${input.playerId}:${input.thresholdDays}:${input.episode}`,
  });
}

/**
 * Next future UTC instant at the given hour (with a +10 min offset to avoid
 * landing exactly on the hour). If that time already passed today, rolls to
 * tomorrow. Used to deliver broadcasts during the player's active hours.
 */
function nextUtcHour(hourUtc: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 10, 0, 0,
  ));
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.toISOString();
}

/**
 * Comet Herald event push. mode 'tomorrow' = heads-up the day before;
 * mode 'today' = window-open reminder on the fly-by day.
 */
export async function enqueueCometEventPush(input: PushEventBase & {
  occurrenceDate: string;
  mode: 'tomorrow' | 'today';
}): Promise<boolean> {
  const copy = input.mode === 'tomorrow'
    ? {
        titleUk: 'Комета-провісник наближається',
        bodyUk: 'Завтра комета пройде повз твою систему. Будь онлайн і запусти відстеження в обсерваторії — 20 кварків і легендарний запис у Космічний Архів.',
        titleEn: 'The Herald Comet approaches',
        bodyEn: 'Tomorrow the comet passes your system. Be online and launch the observatory tracking — 20 quarks and a legendary Cosmic Archive entry.',
      }
    : {
        titleUk: 'Комета-провісник вже тут',
        bodyUk: 'Вікно спостереження відкрите лише сьогодні. Запусти відстеження комети в обсерваторії, поки вона не зникла.',
        titleEn: 'The Herald Comet is here',
        bodyEn: 'The observation window is open today only. Launch the comet tracking before it fades away.',
      };
  return enqueueSafe({
    playerId: input.playerId,
    type: 'comet_event',
    ...copy,
    data: {
      action: 'open-game',
      occurrenceDate: input.occurrenceDate,
      link: '/?action=open-game',
    },
    priority: 4,
    maxAttempts: 2,
    dedupeKey: `comet:${input.playerId}:${input.occurrenceDate}:${input.mode}`,
  });
}

/** Weekly rating results push for cluster champions / global top-10. */
export async function enqueueChampionPush(input: PushEventBase & {
  weekDate: string;
  globalRank: number | null;
  rewardQuarks: number;
}): Promise<boolean> {
  const isTop = input.globalRank != null;
  const copy = input.globalRank === 1
    ? {
        titleUk: 'Ти — №1 галактики!',
        bodyUk: `Найкращий командир тижня серед усіх кластерів. Нагорода: ${input.rewardQuarks} кварків. Зайди й подивись Зал Слави.`,
        titleEn: 'You are #1 in the galaxy!',
        bodyEn: `Best commander of the week across all clusters. Reward: ${input.rewardQuarks} quarks. Check the Hall of Fame.`,
      }
    : isTop
      ? {
          titleUk: 'Ти в топ-10 галактики',
          bodyUk: `Чемпіон кластера й топ-${input.globalRank} тижня. Нагорода: ${input.rewardQuarks} кварк. Зал Слави чекає.`,
          titleEn: 'You made the galaxy top-10',
          bodyEn: `Cluster champion and #${input.globalRank} of the week. Reward: ${input.rewardQuarks} quark. The Hall of Fame awaits.`,
        }
      : {
          titleUk: 'Ти — чемпіон кластера!',
          bodyUk: 'Найкращий результат тижня у своєму кластері. Твій титул вже в рейтингу.',
          titleEn: 'You are the cluster champion!',
          bodyEn: 'Best weekly result in your cluster. Your title is now on the leaderboard.',
        };
  return enqueueSafe({
    playerId: input.playerId,
    type: 'weekly_champion',
    ...copy,
    data: {
      action: 'open-game',
      weekDate: input.weekDate,
      link: '/?action=open-game',
    },
    priority: 4,
    maxAttempts: 2,
    dedupeKey: `champion:${input.playerId}:${input.weekDate}`,
  });
}

export async function enqueueDigestReadyPush(input: PushEventBase & {
  weekDate: string;
  /** Player's most-active UTC hour (timezone proxy). null = send immediately. */
  favoriteHourUtc?: number | null;
}): Promise<boolean> {
  // Schedule for the player's active hour so the digest doesn't arrive in the
  // middle of their night. Falls back to immediate delivery when we have no
  // activity data (can't infer a sensible local time).
  const scheduledAt =
    typeof input.favoriteHourUtc === 'number' && input.favoriteHourUtc >= 0 && input.favoriteHourUtc <= 23
      ? nextUtcHour(input.favoriteHourUtc)
      : undefined;

  return enqueueSafe({
    playerId: input.playerId,
    type: 'digest_ready',
    titleUk: 'Nebulife Weekly',
    bodyUk: 'Космічні новини тижня готові. Відкрий термінал.',
    titleEn: 'Nebulife Weekly',
    bodyEn: 'This week\'s space digest is ready. Open the terminal.',
    data: {
      action: 'open-digest',
      weekDate: input.weekDate,
      link: `/?action=open-digest&weekDate=${encodeURIComponent(input.weekDate)}`,
    },
    priority: 10,
    scheduledAt,
    dedupeKey: `digest_ready:${input.playerId}:${input.weekDate}`,
  });
}

export async function enqueueMissionPhotoReadyPush(input: PushEventBase & {
  photoId: string;
  systemId: string;
  photoUrl?: string | null;
}): Promise<boolean> {
  return enqueueSafe({
    playerId: input.playerId,
    type: 'mission_photo_ready',
    titleUk: 'Фото місії готове',
    bodyUk: 'Отримано нове фото з місії. Відкрий архів, щоб переглянути результат.',
    titleEn: 'Mission photo ready',
    bodyEn: 'A new mission photo is ready. Open the archive to view it.',
    data: {
      action: 'open-photo',
      photoId: input.photoId,
      systemId: input.systemId,
      photoUrl: input.photoUrl ?? '',
      link: `/?action=open-photo&photoId=${encodeURIComponent(input.photoId)}`,
    },
    priority: 20,
    dedupeKey: `mission_photo_ready:${input.playerId}:${input.photoId}`,
  });
}

export async function enqueuePlanetSkinReadyPush(input: PushEventBase & {
  skinId: string;
  planetId: string;
  systemId: string;
  kind: string;
}): Promise<boolean> {
  return enqueueSafe({
    playerId: input.playerId,
    type: 'mission_photo_ready',
    titleUk: input.kind === 'exosphere' ? 'Екзосфера готова' : 'Фото планети готове',
    bodyUk: 'Новий вигляд планети готовий до перегляду.',
    titleEn: input.kind === 'exosphere' ? 'Exosphere ready' : 'Planet photo ready',
    bodyEn: 'The new planet view is ready to explore.',
    data: {
      action: 'open-exosphere',
      skinId: input.skinId,
      planetId: input.planetId,
      systemId: input.systemId,
      link: `/?action=open-exosphere&systemId=${encodeURIComponent(input.systemId)}&planetId=${encodeURIComponent(input.planetId)}`,
    },
    priority: input.kind === 'exosphere' ? 25 : 15,
    dedupeKey: `planet_skin_ready:${input.playerId}:${input.skinId}`,
  });
}

export async function enqueueSystemMissionReadyPush(input: PushEventBase & {
  missionId: string;
  systemId: string;
}): Promise<boolean> {
  return enqueueSafe({
    playerId: input.playerId,
    type: 'mission_report_ready',
    titleUk: 'Місія завершена',
    bodyUk: 'Відеозвіт місії готовий. Переглянь результат у терміналі.',
    titleEn: 'Mission complete',
    bodyEn: 'The mission video report is ready. Open the terminal to view it.',
    data: {
      action: 'open-mission',
      missionId: input.missionId,
      systemId: input.systemId,
      link: `/?action=open-mission&missionId=${encodeURIComponent(input.missionId)}`,
    },
    priority: 20,
    dedupeKey: `system_mission_ready:${input.playerId}:${input.missionId}`,
  });
}

export async function enqueueShipModelReadyPush(input: PushEventBase & {
  shipId: string;
}): Promise<boolean> {
  return enqueueSafe({
    playerId: input.playerId,
    type: 'ship_model_ready',
    titleUk: '3D корабель готовий',
    bodyUk: 'Твоя модель корабля завершена. Відкрий ангар, щоб встановити її.',
    titleEn: '3D ship ready',
    bodyEn: 'Your ship model is complete. Open the hangar to equip it.',
    data: {
      action: 'open-hangar',
      shipId: input.shipId,
      link: `/?action=open-hangar&shipId=${encodeURIComponent(input.shipId)}`,
    },
    priority: 30,
    dedupeKey: `ship_model_ready:${input.playerId}:${input.shipId}`,
  });
}
