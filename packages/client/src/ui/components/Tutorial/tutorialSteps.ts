// ---------------------------------------------------------------------------
// Tutorial step configuration — first-hour A.S.T.R.A. guided activation
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
  /** If true, hide overlay until target element appears in DOM */
  waitForTarget?: boolean;
  /** Delay in ms before showing this step (after activation) */
  activateDelay?: number;
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 'awakening',
    type: 'info',
    target: '',
    text: 'tutorial.step_awakening_text',
    tooltipPos: 'top',
    nextLabel: 'tutorial.step_awakening_next',
  },
  {
    id: 'terminal',
    type: 'click',
    target: 'terminal-btn',
    text: 'tutorial.step_terminal_text',
    tooltipPos: 'top',
    onComplete: ['open-archive'],
  },
  {
    id: 'go-systems',
    type: 'click',
    target: 'subtab-systems',
    text: 'tutorial.step_go_systems_text',
    tooltipPos: 'bottom',
    onActivate: ['open-archive', 'navigate-navigation-systems'],
  },
  {
    id: 'first-research',
    type: 'click',
    target: 'research-btn-first',
    text: 'tutorial.step_first_research_text',
    tooltipPos: 'left',
    onActivate: ['open-archive', 'navigate-navigation-systems'],
  },
  {
    id: 'hud-info',
    type: 'info',
    target: 'resource-observatories',
    text: '',
    tooltipPos: 'bottom',
    subSteps: [
      {
        target: 'resource-observatories',
        text: 'tutorial.step_hud_obs_text',
        tooltipPos: 'bottom',
        nextLabel: 'tutorial.step_hud_obs_next',
      },
      {
        target: 'resource-data',
        text: 'tutorial.step_hud_data_text',
        tooltipPos: 'bottom',
        nextLabel: 'tutorial.step_hud_data_next',
      },
    ],
  },
  {
    id: 'free-task',
    type: 'free-task',
    target: '',
    text: 'tutorial.step_free_task_text',
    tooltipPos: 'top',
    freeTaskTotal: 2,
  },
  {
    id: 'anomaly',
    type: 'info',
    target: '',
    text: 'tutorial.step_anomaly_text',
    tooltipPos: 'top',
    nextLabel: 'tutorial.step_anomaly_next',
    onComplete: ['trigger-discovery'],
  },
  {
    id: 'quantum',
    type: 'click',
    target: 'quantum-focus-btn',
    text: 'tutorial.step_quantum_text',
    tooltipPos: 'left',
  },
  {
    id: 'save-gallery',
    type: 'click',
    target: 'save-to-gallery-btn',
    text: 'tutorial.step_save_gallery_text',
    tooltipPos: 'top',
    waitForTarget: true,
  },
  {
    id: 'gallery-final',
    type: 'info',
    target: 'gallery-saved-photo',
    text: 'tutorial.step_gallery_final_text',
    tooltipPos: 'bottom',
    nextLabel: 'tutorial.step_gallery_final_next',
    onActivate: ['open-archive', 'navigate-collections-cosmos'],
    activateDelay: 2000,
  },
  {
    id: 'astra-handoff',
    type: 'info',
    target: 'chat-open-btn',
    text: 'tutorial.step_astra_handoff_text',
    tooltipPos: 'left',
    nextLabel: 'tutorial.next',
  },
  /* Коментар українською: Крок 12 - Пояснення вкладок чату */
  {
    id: 'astra-chat-tabs',
    type: 'info',
    target: 'chat-tabs-header',
    text: 'tutorial.step_astra_chat_tabs_text',
    tooltipPos: 'left',
    nextLabel: 'tutorial.step_astra_chat_tabs_next',
  },
  /* Коментар українською: Крок 13 - Згортання чату */
  {
    id: 'astra-chat-close',
    type: 'click',
    target: 'chat-close-btn',
    text: 'tutorial.step_astra_chat_close_text',
    tooltipPos: 'left',
  },
  /* Коментар українською: Крок 14 - Огляд Всесвіту (3D Галактика) */
  {
    id: 'galaxy-intro',
    type: 'info',
    target: 'nav-item-universe',
    text: 'tutorial.step_galaxy_intro_text',
    tooltipPos: 'right',
    nextLabel: 'tutorial.next',
    onActivate: ['go-scene-universe'],
  },
  /* Коментар українською: Крок 15 - Зоряний Кластер */
  {
    id: 'cluster-intro',
    type: 'info',
    target: 'nav-item-cluster',
    text: 'tutorial.step_cluster_intro_text',
    tooltipPos: 'right',
    nextLabel: 'tutorial.next',
    onActivate: ['go-scene-cluster'],
  },
  /* Коментар українською: Крок 16 - Карта Галактики (2D Зоряна Група) */
  {
    id: 'galaxy-map-intro',
    type: 'info',
    target: 'nav-item-galaxy',
    text: 'tutorial.step_galaxy_map_intro_text',
    tooltipPos: 'right',
    nextLabel: 'tutorial.next',
    onActivate: ['go-scene-galaxy'],
  },
  /* Коментар українською: Крок 17 - Центрування карти */
  {
    id: 'galaxy-map-center',
    type: 'click',
    target: 'center-btn',
    text: 'tutorial.step_galaxy_map_center_text',
    tooltipPos: 'right',
  },
  /* Коментар українською: Крок 18 - Перехід у систему через радіальне меню */
  {
    id: 'system-radial-select',
    type: 'click',
    target: 'radial-btn-enter',
    text: 'tutorial.step_system_radial_select_text',
    tooltipPos: 'left',
    waitForTarget: true,
  },
  /* Коментар українською: Крок 19 - Огляд системи */
  {
    id: 'system-scene-intro',
    type: 'info',
    target: '',
    text: 'tutorial.step_system_scene_intro_text',
    tooltipPos: 'top',
    nextLabel: 'tutorial.next',
  },
  /* Коментар українською: Крок 20 - Клік по кнопці Екзосфера */
  {
    id: 'exosphere-btn-click',
    type: 'click',
    target: 'planet-exosphere-btn',
    text: 'tutorial.step_exosphere_btn_click_text',
    tooltipPos: 'left',
    waitForTarget: true,
  },
  /* Коментар українською: Крок 21 - Пояснення Екзосфери */
  {
    id: 'exosphere-scene-explain',
    type: 'info',
    target: '',
    text: 'tutorial.step_exosphere_scene_explain_text',
    tooltipPos: 'top',
    nextLabel: 'tutorial.next',
  },
  /* Коментар українською: Крок 22 - Перехід до Космічної Академії */
  {
    id: 'academy-intro',
    type: 'click',
    target: 'academy-btn',
    text: 'tutorial.step_academy_intro_text',
    tooltipPos: 'top',
  },
  /* Коментар українською: Крок 23 - Космічна Енциклопедія та завершення */
  {
    id: 'encyclopedia-explain',
    type: 'info',
    target: 'encyclopedia-title',
    text: 'tutorial.step_encyclopedia_explain_text',
    tooltipPos: 'bottom',
    nextLabel: 'tutorial.to_game',
    waitForTarget: true,
    onComplete: ['complete-tutorial'],
  },
];
