import React from 'react';
import type { ToolGroup, SurfaceInfo, ExtendedScene } from './types.js';
import {
  sectionCenter,
  toolButtonBase, toolButtonPrimary, toolButtonAccent, toolButtonActive,
  zoomButtonStyle,
} from './styles.js';

interface SceneToolsProps {
  groups: ToolGroup[];
  scene: ExtendedScene;
  surfaceInfo?: SurfaceInfo;
}

/** Terrain label in Ukrainian */
function terrainLabel(terrain: string): string {
  switch (terrain) {
    case 'deep_ocean': return 'Глиб. океан';
    case 'ocean': return 'Океан';
    case 'coast': return 'Узбережжя';
    case 'beach': return 'Пляж';
    case 'lowland': return 'Низовина';
    case 'plains': return 'Рівнина';
    case 'hills': return 'Пагорби';
    case 'mountains': return 'Гори';
    case 'peaks': return 'Вершини';
    case 'volcano': return 'Вулкан';
    default: return terrain;
  }
}

/** Biome label in Ukrainian */
function biomeLabel(biome: string): string {
  switch (biome) {
    case 'tropical_forest': return 'Троп. ліс';
    case 'savanna': return 'Савана';
    case 'desert': return 'Пустеля';
    case 'temperate_forest': return 'Пом. ліс';
    case 'grassland': return 'Степ';
    case 'boreal_forest': return 'Тайга';
    case 'tundra': return 'Тундра';
    case 'ice': return 'Льодовик';
    case 'wetland': return 'Болото';
    case 'volcanic': return 'Вулканічна';
    default: return biome;
  }
}

function getButtonStyle(
  variant: 'default' | 'primary' | 'accent' | undefined,
  active: boolean | undefined,
): React.CSSProperties {
  let base: React.CSSProperties;

  switch (variant) {
    case 'primary': base = toolButtonPrimary; break;
    case 'accent': base = toolButtonAccent; break;
    default: base = toolButtonBase; break;
  }

  if (active) {
    return { ...base, ...toolButtonActive };
  }

  return base;
}

export function SceneTools({ groups, scene, surfaceInfo }: SceneToolsProps) {
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
                onClick={tool.onClick}
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
                style={{
                  ...getButtonStyle(tool.variant, tool.active),
                  opacity: tool.disabled ? 0.4 : 1,
                  cursor: tool.disabled ? 'not-allowed' : 'pointer',
                }}
                onClick={tool.onClick}
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
              >
                {tool.label}
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

      {/* Surface info (inline terrain/biome when hovering in surface mode) */}
      {scene === 'surface' && surfaceInfo?.hoveredTile && (
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          fontSize: 10,
          color: '#667788',
          marginLeft: 8,
          animation: 'cmdbar-fade-in 0.2s ease-out',
        }}>
          <span>{terrainLabel(surfaceInfo.hoveredTile.terrain)}</span>
          <span style={{ color: '#334455' }}>|</span>
          <span>{biomeLabel(surfaceInfo.hoveredTile.biome)}</span>
          {surfaceInfo.hoveredTile.buildable && (
            <span style={{ color: '#44aa66', fontSize: 9 }}>&#9632;</span>
          )}
        </div>
      )}
    </div>
  );
}
