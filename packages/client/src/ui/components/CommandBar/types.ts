import type { SceneType } from '../../../App.js';

export type ExtendedScene = SceneType | 'surface';

export interface BreadcrumbItem {
  id: string;
  label: string;
  scene: ExtendedScene;
  isActive: boolean;
}

export interface ToolItem {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'accent';
  disabled?: boolean;
  active?: boolean;
  badge?: string;
}

export interface ToolGroup {
  type: 'buttons' | 'zoom';
  items: ToolItem[];
}

export interface CommandBarProps {
  scene: ExtendedScene;
  breadcrumbs: BreadcrumbItem[];
  toolGroups: ToolGroup[];
  quarks: number;
  playerName: string;
  onNavigate: (targetScene: string) => void;
  onTopUp: () => void;
}
