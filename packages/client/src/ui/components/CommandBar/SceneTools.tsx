import React from 'react';
import { playSfx } from '../../../audio/SfxPlayer.js';
import type { ToolGroup, ExtendedScene } from './types.js';
import {
  sectionCenter,
  toolButtonBase, toolButtonPrimary, toolButtonAccent, toolButtonTerminal, toolButtonActive,
  zoomButtonStyle,
} from './styles.js';

interface SceneToolsProps {
  groups: ToolGroup[];
  scene: ExtendedScene;
}

function getButtonStyle(
  variant: 'default' | 'primary' | 'accent' | 'terminal' | undefined,
  active: boolean | undefined,
): React.CSSProperties {
  let base: React.CSSProperties;

  switch (variant) {
    case 'primary': base = toolButtonPrimary; break;
    case 'accent': base = toolButtonAccent; break;
    case 'terminal': base = toolButtonTerminal; break;
    default: base = toolButtonBase; break;
  }

  if (active) {
    return { ...base, ...toolButtonActive };
  }

  return base;
}

export function SceneTools({ groups, scene }: SceneToolsProps) {
  return (
    <div style={sectionCenter} key={scene}>
      {groups.map((group, gi) => (
        <div
          key={gi}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: group.type === 'zoom' ? 3 : 6,
            animation: 'cmdbar-fade-in 0.3s ease-out',
            animationFillMode: 'both',
          }}
        >
          {group.items.map((tool) =>
            group.type === 'zoom' ? (
              <button
                key={tool.id}
                style={{
                  ...zoomButtonStyle,
                  opacity: tool.disabled ? 0.4 : 1,
                  cursor: tool.disabled ? 'not-allowed' : 'pointer',
                }}
                onClick={() => { playSfx('ui-click', 0.07); tool.onClick(); }}
                disabled={tool.disabled}
                onMouseEnter={(e) => {
                  if (!tool.disabled) {
                    (e.target as HTMLElement).style.borderColor = 'rgba(80, 120, 180, 0.4)';
                    (e.target as HTMLElement).style.color = '#aaccee';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = 'rgba(60, 100, 160, 0.25)';
                  (e.target as HTMLElement).style.color = '#8899aa';
                }}
              >
                {tool.label}
              </button>
            ) : (
              <button
                key={tool.id}
                data-tutorial-id={tool.tutorialId}
                style={{
                  ...getButtonStyle(tool.variant, tool.active),
                  opacity: tool.disabled ? 0.4 : 1,
                  cursor: tool.disabled ? 'not-allowed' : 'pointer',
                }}
                onClick={() => { playSfx('ui-click', 0.07); tool.onClick(); }}
                disabled={tool.disabled}
                onMouseEnter={(e) => {
                  if (!tool.disabled && !tool.active) {
                    (e.target as HTMLElement).style.borderColor = 'rgba(80, 120, 180, 0.4)';
                    (e.target as HTMLElement).style.color = '#aaccee';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tool.active) {
                    const s = getButtonStyle(tool.variant, false);
                    (e.target as HTMLElement).style.borderColor = s.borderColor as string ?? '';
                    (e.target as HTMLElement).style.color = s.color as string ?? '#8899aa';
                  }
                }}
                title={tool.tooltip}
              >
                {tool.icon ?? tool.label}
                {tool.badge && (
                  <span style={{
                    marginLeft: 4,
                    fontSize: 9,
                    color: '#667788',
                    opacity: 0.8,
                  }}>
                    {tool.badge}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      ))}

    </div>
  );
}
