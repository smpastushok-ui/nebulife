import type { SceneType } from '../../../App.js';
import type React from 'react';

export type ExtendedScene = SceneType | 'surface';

export interface NavigationMenuItem {
  id: string;
  label: string;
  scene: ExtendedScene;
  icon?: React.ReactNode;
  active: boolean;
  disabled: boolean;
  separator?: boolean;
}

export interface ToolItem {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'accent' | 'terminal';
  disabled?: boolean;
  active?: boolean;
  highlight?: 'success';
  badge?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  /** Tutorial spotlight anchor ID */
  tutorialId?: string;
}

export interface ToolGroup {
  type: 'buttons' | 'zoom';
  items: ToolItem[];
}

export interface CommandBarProps {
  scene: ExtendedScene;
  navigationItems: NavigationMenuItem[];
  toolGroups: ToolGroup[];
  playerName: string;
  playerLevel?: number;
  playerXP?: number;
  onNavigate: (targetScene: string) => void;
  onOpenPlayerPage?: () => void;
  navigationDisabled?: boolean;
  /** Guest (not linked) with progress → pulse the player badge to nudge sign-in. */
  highlightAuth?: boolean;
  /** Terraform-missions status for the cross-cutting mission button (right side). */
  missionStatus?: { activeCount: number; total: number } | null;
  /** Toggle the missions panel. */
  onMissionsClick?: () => void;
}
