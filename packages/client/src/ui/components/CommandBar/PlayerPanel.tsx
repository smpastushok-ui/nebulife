import React from 'react';
import { sectionRight, playerNameStyle } from './styles.js';
import { levelProgress, MAX_PLAYER_LEVEL } from '@nebulife/core';

interface PlayerPanelProps {
  playerName: string;
  playerLevel?: number;
  playerXP?: number;
}

export function PlayerPanel({ playerName, playerLevel = 1, playerXP = 0 }: PlayerPanelProps) {
  const progress = levelProgress(playerXP);
  const isMaxLevel = playerLevel >= MAX_PLAYER_LEVEL;

  return (
    <div style={sectionRight}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 3,
      }}>
        {/* Name row with level badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10,
            color: '#4488aa',
            fontFamily: 'monospace',
            letterSpacing: 0.5,
          }}>
            LVL {playerLevel}
          </span>
          <span style={playerNameStyle}>{playerName}</span>
        </div>
        {/* XP progress bar */}
        <div style={{
          width: '100%',
          height: 2,
          background: 'rgba(51, 68, 85, 0.5)',
          borderRadius: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            width: isMaxLevel ? '100%' : `${Math.round(progress * 100)}%`,
            height: '100%',
            background: isMaxLevel ? '#44ff88' : '#4488aa',
            borderRadius: 1,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  );
}
