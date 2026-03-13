import React from 'react';
import { sectionRight, playerNameStyle } from './styles.js';

interface PlayerPanelProps {
  playerName: string;
}

export function PlayerPanel({ playerName }: PlayerPanelProps) {
  return (
    <div style={sectionRight}>
      <span style={playerNameStyle}>{playerName}</span>
    </div>
  );
}
