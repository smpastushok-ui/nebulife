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

export async function enqueueDailySpaceReminderPush(input: PushEventBase & {
  reminderDay: number;
  messageIndex: number;
  scheduledAt: string;
}): Promise<boolean> {
  const copy = DAILY_SPACE_REMINDERS[input.messageIndex % DAILY_SPACE_REMINDERS.length] ?? DAILY_SPACE_REMINDERS[0];
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
      link: '/?action=open-game',
    },
    priority: 3,
    scheduledAt: input.scheduledAt,
    maxAttempts: 2,
    dedupeKey: `daily_space_reminder:${input.playerId}:${input.reminderDay}`,
  });
}

export async function enqueueDigestReadyPush(input: PushEventBase & {
  weekDate: string;
}): Promise<boolean> {
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
