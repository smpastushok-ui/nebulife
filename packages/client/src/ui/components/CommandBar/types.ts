import type { SceneType } from '../../../App.js';
import type React from 'react';

export type ExtendedScene = SceneType | 'surface';

export interface BreadcrumbItem {
  id: string;
  label: string;
  scene: ExtendedScene;
  isActive: boolean;
  icon?: React.ReactNode;
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
}

export interface ToolGroup {
  type: 'buttons' | 'zoom';
  items: ToolItem[];
}

export interface CommandBarProps {
  scene: ExtendedScene;
  breadcrumbs: BreadcrumbItem[];
  toolGroups: ToolGroup[];
  leftActions?: ToolItem[];
  playerName: string;
  playerLevel?: number;
  playerXP?: number;
  onNavigate: (targetScene: string) => void;
}
