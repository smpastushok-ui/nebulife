import React, { useState, useEffect } from 'react';
import { sectionRight } from './styles.js';
import { levelProgress, MAX_PLAYER_LEVEL } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';

// ---------------------------------------------------------------------------
// Player badge SVG — shield with star
// ---------------------------------------------------------------------------

function PlayerBadgeSVG({ color }: { color: string }) {
  return (
    <svg width="21" height="23" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  /** Guest with progress who hasn't linked an account → occasionally pulse the
   *  badge with light to nudge them into the player page (where they can sign in). */
  highlight?: boolean;
}

/** True when the OS asks for reduced motion — we skip the pulse entirely then. */
function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

// React.memo — PlayerPanel receives only primitive props, so memo's shallow
// compare is maximally effective: unrelated App.tsx state changes (tutorial
// step, research ticks, polling) no longer force a re-render here.
function PlayerPanelInner({ playerName, playerLevel = 1, playerXP = 0, onClick, highlight = false }: PlayerPanelProps) {
  const progress = levelProgress(playerXP);
  const isMaxLevel = playerLevel >= MAX_PLAYER_LEVEL;
  const [hovered, setHovered] = useState(false);

  // Chaotic, occasional light pulse for un-linked guests. Each burst lasts ~2s
  // (a double flash via cmdbar-auth-pulse), then a randomised 10–24s quiet gap
  // so it stays noticeable but never nags. Hover pauses it (the user already
  // found the button). Respects prefers-reduced-motion.
  const [pulsing, setPulsing] = useState(false);
  const [pulseDur, setPulseDur] = useState(2);
  useEffect(() => {
    if (!highlight || hovered || prefersReducedMotion()) {
      setPulsing(false);
      return;
    }
    let burstOff: ReturnType<typeof setTimeout>;
    let next: ReturnType<typeof setTimeout>;
    const fire = () => {
      setPulseDur(1.7 + Math.random() * 0.7);
      setPulsing(true);
      burstOff = setTimeout(() => setPulsing(false), 2100);
      next = setTimeout(fire, 10000 + Math.random() * 14000);
    };
    // First nudge a few seconds in (varied), not the instant the bar mounts.
    const start = setTimeout(fire, 3500 + Math.random() * 3000);
    return () => { clearTimeout(start); clearTimeout(burstOff); clearTimeout(next); };
  }, [highlight, hovered]);

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
          justifyContent: 'center',
          gap: 3,
          width: 'clamp(42px, 11.5vw, 48px)',
          height: 44,
          boxSizing: 'border-box',
          position: 'relative',
          background: hovered ? 'rgba(20, 38, 58, 0.5)' : 'rgba(10, 18, 32, 0.42)',
          border: `1px solid ${hovered ? 'rgba(120, 184, 255, 0.62)' : 'rgba(68, 102, 136, 0.5)'}`,
          borderRadius: 3,
          padding: '3px 5px',
          minHeight: 44,
          cursor: 'pointer',
          transition: 'all 0.2s',
          // Pulse overrides border/shadow during a burst (see cmdbar-auth-pulse).
          animation: pulsing ? `cmdbar-auth-pulse ${pulseDur}s ease-in-out` : undefined,
        }}
      >
        {/* Badge + level row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PlayerBadgeSVG color={accentColor} />
          <span style={{
            position: 'absolute',
            top: 5,
            right: 6,
            fontSize: 9,
            color: accentColor,
            fontFamily: 'monospace',
            letterSpacing: 0.5,
            lineHeight: 1,
          }}>
            {playerLevel}
          </span>
        </div>
        {/* XP progress bar */}
        <div style={{
          width: '100%',
          minWidth: 36,
          height: 1,
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
