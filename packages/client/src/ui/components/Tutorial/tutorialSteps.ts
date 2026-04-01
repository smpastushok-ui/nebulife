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
  /** If true, hide overlay until target element appears in DOM */
  waitForTarget?: boolean;
  /** Delay in ms before showing this step (after activation) */
  activateDelay?: number;
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  // 0 — Click the TERMINAL button in CommandBar
  {
    id: 'terminal',
    type: 'click',
    target: 'terminal-btn',
    text: 'tutorial.step_terminal_text',
    tooltipPos: 'top',
    onComplete: ['open-archive'],
  },
  // 1 — Navigate to Planets sub-tab
  {
    id: 'nav-planets',
    type: 'click',
    target: 'subtab-planets',
    text: 'tutorial.step_nav_planets_text',
    tooltipPos: 'bottom',
    onActivate: ['open-archive', 'navigate-navigation-planets'],
  },
  // 2 — Expand home star row
  {
    id: 'expand-star',
    type: 'click',
    target: 'star-row-home',
    text: 'tutorial.step_expand_star_text',
    tooltipPos: 'right',
  },
  // 3 — Add home planet to favorites
  {
    id: 'add-fav',
    type: 'click',
    target: 'fav-toggle-home',
    text: 'tutorial.step_add_fav_text',
    tooltipPos: 'right',
  },
  // 4 — Check favorites tab
  {
    id: 'check-fav',
    type: 'click',
    target: 'subtab-favorites',
    text: 'tutorial.step_check_fav_text',
    tooltipPos: 'bottom',
  },
  // 5 — Go to Systems tab
  {
    id: 'go-systems',
    type: 'click',
    target: 'subtab-systems',
    text: 'tutorial.step_go_systems_text',
    tooltipPos: 'bottom',
  },
  // 6 — Start first research
  {
    id: 'first-research',
    type: 'click',
    target: 'research-btn-first',
    text: 'tutorial.step_first_research_text',
    tooltipPos: 'left',
    onActivate: ['open-archive', 'navigate-navigation-systems'],
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
  // 8 — Free task: start 2 more research sessions
  {
    id: 'free-task',
    type: 'free-task',
    target: '',
    text: 'tutorial.step_free_task_text',
    tooltipPos: 'top',
    freeTaskTotal: 2,
  },
  // 9 — Anomaly storyline message
  {
    id: 'anomaly',
    type: 'info',
    target: '',
    text: 'tutorial.step_anomaly_text',
    tooltipPos: 'top',
    nextLabel: 'tutorial.step_anomaly_next',
    onComplete: ['trigger-discovery'],
  },
  // 10 — Quantum Focus (click the button in DiscoveryChoicePanel)
  {
    id: 'quantum',
    type: 'click',
    target: 'quantum-focus-btn',
    text: 'tutorial.step_quantum_text',
    tooltipPos: 'left',
  },
  // 11 — Save photo to gallery (wait until photo is generated and button appears)
  {
    id: 'save-gallery',
    type: 'click',
    target: 'save-to-gallery-btn',
    text: 'tutorial.step_save_gallery_text',
    tooltipPos: 'top',
    waitForTarget: true,
  },
  // 12 — Final info in Archive gallery (2s delay after photo saved)
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
];
