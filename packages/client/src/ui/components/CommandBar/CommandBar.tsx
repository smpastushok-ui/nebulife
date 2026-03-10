import React, { useEffect, useRef } from 'react';
import type { CommandBarProps } from './types.js';
import { barStyle, KEYFRAMES_CSS } from './styles.js';
import { BreadcrumbNav } from './BreadcrumbNav.js';
import { SceneTools } from './SceneTools.js';
import { PlayerPanel } from './PlayerPanel.js';

/** Unique ID so we only inject the <style> tag once. */
const STYLE_ID = 'cmdbar-keyframes';

export function CommandBar({
  scene,
  breadcrumbs,
  toolGroups,
  quarks,
  playerName,
  onNavigate,
  onTopUp,
  surfaceInfo,
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
      <BreadcrumbNav
        breadcrumbs={breadcrumbs}
        onNavigate={onNavigate}
      />

      <SceneTools
        groups={toolGroups}
        scene={scene}
        surfaceInfo={surfaceInfo}
      />

      <PlayerPanel
        quarks={quarks}
        playerName={playerName}
        onTopUp={onTopUp}
      />
    </div>
  );
}
