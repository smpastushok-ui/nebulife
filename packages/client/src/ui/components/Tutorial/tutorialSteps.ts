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
    type: 'click',
    target: 'chat-open-btn',
    text: 'tutorial.step_astra_handoff_text',
    tooltipPos: 'left',
    onComplete: ['complete-tutorial'],
  },
];
