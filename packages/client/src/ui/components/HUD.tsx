import React from 'react';
import type { SceneType } from '../../App.js';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute', top: 0, left: 0, right: 0,
    padding: '12px 16px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    pointerEvents: 'none',
    fontFamily: 'monospace', color: '#8899aa',
  },
  left: { display: 'flex', gap: 16, alignItems: 'center' },
  right: { display: 'flex', gap: 16, alignItems: 'center' },
  btn: {
    pointerEvents: 'auto', cursor: 'pointer',
    background: 'rgba(20,30,40,0.8)', border: '1px solid #334455',
    color: '#8899aa', padding: '4px 12px', fontSize: 11, fontFamily: 'monospace',
    borderRadius: 3,
  },
  scene: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 2, color: '#556677' },
  player: { fontSize: 12, color: '#88aacc' },
};

const sceneLabels: Record<SceneType, string> = {
  'galaxy': 'Galaxy Map',
  'system': 'Star System',
  'home-intro': 'Home Planet',
  'planet-view': 'Planet View',
};

export function HUD({ scene, playerName, onBackToGalaxy, onBackToSystem, onGoToHomePlanet }: {
  scene: SceneType;
  playerName: string;
  onBackToGalaxy?: () => void;
  onBackToSystem?: () => void;
  onGoToHomePlanet?: () => void;
}) {
  return (
    <div style={styles.container}>
      <div style={styles.left}>
        {onBackToGalaxy && (
          <button style={styles.btn} onClick={onBackToGalaxy}>
            &larr; Galaxy
          </button>
        )}
        {onBackToSystem && (
          <button style={styles.btn} onClick={onBackToSystem}>
            &larr; System
          </button>
        )}
        <span style={styles.scene}>
          {sceneLabels[scene] ?? scene}
        </span>
      </div>
      <div style={styles.right}>
        {onGoToHomePlanet && (
          <button style={styles.btn} onClick={onGoToHomePlanet}>
            Home Planet
          </button>
        )}
        <span style={styles.player}>{playerName}</span>
      </div>
    </div>
  );
}
