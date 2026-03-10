import React from 'react';
import { sectionRight, quarksButtonStyle, playerNameStyle } from './styles.js';

interface PlayerPanelProps {
  quarks: number;
  playerName: string;
  onTopUp: () => void;
}

export function PlayerPanel({ quarks, playerName, onTopUp }: PlayerPanelProps) {
  return (
    <div style={sectionRight}>
      <button
        style={quarksButtonStyle}
        onClick={onTopUp}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(120, 160, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(120, 160, 255, 0.25)';
        }}
      >
        <span style={{ fontSize: 13 }}>&#9883;</span>
        <span>{quarks}</span>
      </button>
      <span style={playerNameStyle}>{playerName}</span>
    </div>
  );
}
