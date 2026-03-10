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
  quarksBtn: {
    pointerEvents: 'auto' as const, cursor: 'pointer',
    background: 'rgba(20,30,50,0.85)', border: '1px solid rgba(120,160,255,0.3)',
    color: '#aaccff', padding: '4px 12px', fontSize: 12, fontFamily: 'monospace',
    borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6,
    transition: 'border-color 0.2s',
  },
  quarksIcon: { fontSize: 14, color: '#7bb8ff' },
};

const sceneLabels: Record<SceneType, string> = {
  'galaxy': 'Galaxy Map',
  'system': 'Star System',
  'home-intro': 'Home Planet',
  'planet-view': 'Planet View',
};

export function HUD({ scene, playerName, quarks, onBackToGalaxy, onBackToSystem, onGoToHomePlanet, onTopUp }: {
  scene: SceneType;
  playerName: string;
  quarks?: number;
  onBackToGalaxy?: () => void;
  onBackToSystem?: () => void;
  onGoToHomePlanet?: () => void;
  onTopUp?: () => void;
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
        {quarks !== undefined && (
          <button style={styles.quarksBtn} onClick={onTopUp} title="Поповнити кварки">
            <span style={styles.quarksIcon}>⚛</span>
            <span>{quarks}</span>
          </button>
        )}
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
