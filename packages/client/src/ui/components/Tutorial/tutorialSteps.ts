// ---------------------------------------------------------------------------
// Tutorial step configuration — 13 interactive steps
// ---------------------------------------------------------------------------

export interface TutorialSubStep {
  target: string;
  text: string;
  tooltipPos: 'top' | 'bottom' | 'left' | 'right';
  nextLabel: string;
}

export interface TutorialStepConfig {
  id: string;
  type: 'click' | 'info' | 'free-task' | 'auto';
  /** data-tutorial-id selector value for the spotlight target element */
  target: string;
  /** Tooltip text (Ukrainian) */
  text: string;
  tooltipPos: 'top' | 'bottom' | 'left' | 'right';
  /** Label for the "Next" button (info steps only) */
  nextLabel?: string;
  /** For free-task steps: total required completions */
  freeTaskTotal?: number;
  /** Sub-steps within an info step (shown sequentially) */
  subSteps?: TutorialSubStep[];
  /** Actions to perform when this step activates */
  onActivate?: string[];
  /** Actions to perform when this step completes */
  onComplete?: string[];
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  // 0 — Click the TERMINAL button in CommandBar
  {
    id: 'terminal',
    type: 'click',
    target: 'terminal-btn',
    text: 'Командоре, ваш центр управлiння чекає. Натиснiть ТЕРМIНАЛ, щоб вiдкрити Центр управлiння.',
    tooltipPos: 'top',
    onComplete: ['open-archive'],
  },
  // 1 — Navigate to Planets sub-tab
  {
    id: 'nav-planets',
    type: 'click',
    target: 'subtab-planets',
    text: 'Тут зiбрана вся iнформацiя про вашу мiсiю. Перейдiть до вкладки "Планети".',
    tooltipPos: 'bottom',
    onActivate: ['open-archive', 'navigate-navigation-planets'],
  },
  // 2 — Expand home star row
  {
    id: 'expand-star',
    type: 'click',
    target: 'star-row-home',
    text: 'Розгорнiть рiдну зiрку, щоб побачити планети системи.',
    tooltipPos: 'right',
  },
  // 3 — Add home planet to favorites
  {
    id: 'add-fav',
    type: 'click',
    target: 'fav-toggle-home',
    text: 'Додайте рiдну планету до Обраних для швидкого доступу.',
    tooltipPos: 'right',
  },
  // 4 — Check favorites tab
  {
    id: 'check-fav',
    type: 'click',
    target: 'subtab-favorites',
    text: 'Перевiрте вкладку "Обранi" — ваша планета тепер тут.',
    tooltipPos: 'bottom',
  },
  // 5 — Go to Systems tab
  {
    id: 'go-systems',
    type: 'click',
    target: 'subtab-systems',
    text: 'Перейдiть до вкладки "Системи" для огляду зоряних систем.',
    tooltipPos: 'bottom',
  },
  // 6 — Start first research
  {
    id: 'first-research',
    type: 'click',
    target: 'research-btn-first',
    text: 'Запустiть першe дослiдження! Обсерваторiї просканують систему.',
    tooltipPos: 'left',
  },
  // 7 — HUD info (2 sub-steps: observatories + research data)
  {
    id: 'hud-info',
    type: 'info',
    target: 'resource-observatories',
    text: '',
    tooltipPos: 'bottom',
    subSteps: [
      {
        target: 'resource-observatories',
        text: 'Обсерваторiї — тут видно скiльки телескопiв зайнято / доступно.',
        tooltipPos: 'bottom',
        nextLabel: 'Далi',
      },
      {
        target: 'resource-data',
        text: 'Данi дослiджень — кожне сканування витрачає одну одиницю. Данi поповнюються з часом.',
        tooltipPos: 'bottom',
        nextLabel: 'Зрозумiло',
      },
    ],
  },
  // 8 — Free task: start 2 more research sessions
  {
    id: 'free-task',
    type: 'free-task',
    target: '',
    text: 'Запустiть ще 2 дослiдження будь-яких систем.',
    tooltipPos: 'top',
    freeTaskTotal: 2,
  },
  // 9 — Anomaly storyline message
  {
    id: 'anomaly',
    type: 'info',
    target: '',
    text: 'Командоре! Обсерваторiя зафiксувала аномальний сигнал. Дослiдження виявило невiдомий об\'єкт...',
    tooltipPos: 'top',
    nextLabel: 'Дослiдити',
    onComplete: ['trigger-discovery'],
  },
  // 10 — Quantum Focus (click the button in DiscoveryChoicePanel)
  {
    id: 'quantum',
    type: 'click',
    target: 'quantum-focus-btn',
    text: 'Оберiть "Квантове фокусування" для детального аналiзу. Перше вiдкриття безкоштовно!',
    tooltipPos: 'left',
  },
  // 11 — Save photo to gallery
  {
    id: 'save-gallery',
    type: 'click',
    target: 'save-to-gallery-btn',
    text: 'Збережiть фото вiдкриття до Галереї для вашої колекцiї.',
    tooltipPos: 'top',
  },
  // 12 — Final info in Archive gallery
  {
    id: 'gallery-final',
    type: 'info',
    target: 'gallery-saved-photo',
    text: 'Вiтаємо, Командоре! Ваше перше вiдкриття збережено в Архiвi. Продовжуйте дослiджувати космос!',
    tooltipPos: 'bottom',
    nextLabel: 'Завершити',
    onActivate: ['open-archive', 'navigate-collections-cosmos'],
  },
];
