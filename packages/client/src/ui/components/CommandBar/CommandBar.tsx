import React, { useEffect, useRef } from 'react';
import type { CommandBarProps } from './types.js';
import { barStyle, dockStyle, KEYFRAMES_CSS } from './styles.js';
import { NavigationMenu } from './NavigationMenu.js';
import { SceneTools } from './SceneTools.js';
import { PlayerPanel } from './PlayerPanel.js';

/** Unique ID so we only inject the <style> tag once. */
const STYLE_ID = 'cmdbar-keyframes';

export function CommandBar({
  scene,
  navigationItems,
  toolGroups,
  playerName,
  playerLevel,
  playerXP,
  onNavigate,
  onOpenPlayerPage,
  navigationDisabled,
}: CommandBarProps) {
  const injected = useRef(false);

  // Inject keyframes stylesheet once
  useEffect(() => {
    if (injected.current) return;
    if (document.getElementById(STYLE_ID)) {
      injected.current = true;
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = KEYFRAMES_CSS;
    document.head.appendChild(style);
    injected.current = true;
  }, []);

  return (
    <div style={barStyle}>
      <div style={dockStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flex: '0 0 auto', minWidth: 0, overflow: 'visible' }}>
          <NavigationMenu
            items={navigationItems}
            onNavigate={onNavigate}
            disabled={navigationDisabled}
          />
        </div>

        <SceneTools
          groups={toolGroups}
          scene={scene}
        />

        <PlayerPanel
          playerName={playerName}
          playerLevel={playerLevel}
          playerXP={playerXP}
          onClick={onOpenPlayerPage}
        />
      </div>
    </div>
  );
}
