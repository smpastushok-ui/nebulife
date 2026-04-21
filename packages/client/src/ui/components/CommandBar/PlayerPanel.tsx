import React, { useState } from 'react';
import { sectionRight } from './styles.js';
import { levelProgress, MAX_PLAYER_LEVEL } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';

// ---------------------------------------------------------------------------
// Player badge SVG — shield with star
// ---------------------------------------------------------------------------

function PlayerBadgeSVG({ color }: { color: string }) {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield shape */}
      <path
        d="M8 1L14 3.5V8C14 11.5 11.5 14.5 8 16.5C4.5 14.5 2 11.5 2 8V3.5L8 1Z"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        opacity="0.7"
      />
      {/* Star */}
      <path
        d="M8 5L9.1 7.2L11.5 7.5L9.75 9.2L10.2 11.5L8 10.4L5.8 11.5L6.25 9.2L4.5 7.5L6.9 7.2L8 5Z"
        fill={color}
        opacity="0.8"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PlayerPanel — compact level badge with click-to-open player page
// ---------------------------------------------------------------------------

interface PlayerPanelProps {
  playerName: string;
  playerLevel?: number;
  playerXP?: number;
  onClick?: () => void;
}

// React.memo — PlayerPanel receives only primitive props, so memo's shallow
// compare is maximally effective: unrelated App.tsx state changes (tutorial
// step, research ticks, polling) no longer force a re-render here.
function PlayerPanelInner({ playerName, playerLevel = 1, playerXP = 0, onClick }: PlayerPanelProps) {
  const progress = levelProgress(playerXP);
  const isMaxLevel = playerLevel >= MAX_PLAYER_LEVEL;
  const [hovered, setHovered] = useState(false);

  const accentColor = isMaxLevel ? '#44ff88' : '#4488aa';

  return (
    <div style={sectionRight}>
      <button
        onClick={() => { playSfx('ui-click', 0.07); onClick?.(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={playerName}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          background: hovered ? 'rgba(30, 50, 80, 0.5)' : 'none',
          border: `1px solid ${hovered ? 'rgba(68,136,170,0.4)' : 'transparent'}`,
          borderRadius: 4,
          padding: '4px 10px',
          minHeight: 40,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {/* Badge + level row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <PlayerBadgeSVG color={accentColor} />
          <span style={{
            fontSize: 10,
            color: accentColor,
            fontFamily: 'monospace',
            letterSpacing: 0.5,
          }}>
            {playerLevel}
          </span>
        </div>
        {/* XP progress bar */}
        <div style={{
          width: '100%',
          minWidth: 36,
          height: 2,
          background: 'rgba(51, 68, 85, 0.5)',
          borderRadius: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            width: isMaxLevel ? '100%' : `${Math.round(progress * 100)}%`,
            height: '100%',
            background: accentColor,
            borderRadius: 1,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </button>
    </div>
  );
}

export const PlayerPanel = React.memo(PlayerPanelInner);
