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
}
