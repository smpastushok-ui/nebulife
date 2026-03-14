import React, { useState, useEffect, useRef } from 'react';
import type { CommandBarProps, ToolItem } from './types.js';
import { barStyle, toolButtonBase, KEYFRAMES_CSS } from './styles.js';
import { BreadcrumbNav } from './BreadcrumbNav.js';
import { SceneTools } from './SceneTools.js';
import { PlayerPanel } from './PlayerPanel.js';

/** Unique ID so we only inject the <style> tag once. */
const STYLE_ID = 'cmdbar-keyframes';

/** Small icon button rendered in the left section after breadcrumbs. */
function LeftActionButton({ item }: { item: ToolItem }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={item.onClick}
      disabled={item.disabled}
      title={item.tooltip ?? item.label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...toolButtonBase,
        padding: '4px 8px',
        borderColor: hover ? 'rgba(80, 120, 180, 0.4)' : toolButtonBase.borderColor,
        color: hover ? '#aaccee' : toolButtonBase.color,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        opacity: item.disabled ? 0.4 : 1,
        cursor: item.disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {item.icon ?? item.label}
    </button>
  );
}

export function CommandBar({
  scene,
  breadcrumbs,
  toolGroups,
  leftActions,
  playerName,
  playerLevel,
  playerXP,
  onNavigate,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto', overflow: 'hidden' }}>
        <BreadcrumbNav
          breadcrumbs={breadcrumbs}
          onNavigate={onNavigate}
        />
        {leftActions && leftActions.length > 0 && (
          <>
            <span style={{ color: '#334455', fontSize: 10, margin: '0 2px', userSelect: 'none' }}>{'\u2502'}</span>
            {leftActions.map((action) => (
              <LeftActionButton key={action.id} item={action} />
            ))}
          </>
        )}
      </div>

      <SceneTools
        groups={toolGroups}
        scene={scene}
      />

      <PlayerPanel
        playerName={playerName}
        playerLevel={playerLevel}
        playerXP={playerXP}
      />
    </div>
  );
}
