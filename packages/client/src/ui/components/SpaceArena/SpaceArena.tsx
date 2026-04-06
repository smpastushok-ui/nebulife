/**
 * SpaceArena — React wrapper for the ArenaEngine (Three.js).
 * Manages lifecycle: create on mount, destroy on unmount.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArenaEngine } from '../../../game/arena/index.js';
import type { ArenaCallbacks, MatchResult } from '../../../game/arena/index.js';

interface SpaceArenaProps {
  onExit: () => void;
  onMatchEnd?: (result: MatchResult) => void;
}

export function SpaceArena({ onExit, onMatchEnd }: SpaceArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ArenaEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [shield, setShield] = useState(50);
  const [maxShield] = useState(50);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);

  const callbacks = useRef<ArenaCallbacks>({
    onMatchEnd: (result) => onMatchEnd?.(result),
    onExit: () => onExit(),
    onStatsUpdate: (h, mh, s, ms, k, d) => {
      setHp(h); setShield(s); setKills(k); setDeaths(d);
    },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ArenaEngine(containerRef.current, callbacks.current);
    engineRef.current = engine;

    engine.init().then(() => {
      setReady(true);
      engine.startMatch();
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#020510' }}>
      {/* Three.js canvas container — z-index 0 so UI stays on top */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />

      {/* HUD overlay */}
      {ready && (
        <div style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          fontFamily: 'monospace',
          zIndex: 2,
        }}>
          {/* HP + Shield bars — top left */}
          <div style={{
            position: 'absolute', top: 60, left: 16,
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {/* Shield bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#4488cc', width: 12 }}>S</span>
              <div style={{
                width: 120, height: 6, background: 'rgba(10,15,25,0.8)',
                borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(shield / maxShield) * 100}%`, height: '100%',
                  background: '#4488cc', borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: 8, color: '#4488cc' }}>{Math.floor(shield)}</span>
            </div>
            {/* HP bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#44ff88', width: 12 }}>H</span>
              <div style={{
                width: 120, height: 6, background: 'rgba(10,15,25,0.8)',
                borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(hp / maxHp) * 100}%`, height: '100%',
                  background: hp > 30 ? '#44ff88' : '#cc4444', borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: 8, color: hp > 30 ? '#44ff88' : '#cc4444' }}>{Math.floor(hp)}</span>
            </div>
          </div>

          {/* Kill/Death counter — top center */}
          <div style={{
            position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 16,
            background: 'rgba(10,15,25,0.7)', borderRadius: 4, padding: '4px 12px',
          }}>
            <span style={{ fontSize: 10, color: '#44ff88' }}>K:{kills}</span>
            <span style={{ fontSize: 10, color: '#cc4444' }}>D:{deaths}</span>
          </div>
        </div>
      )}

      {/* Exit button — top center, high z-index to stay above canvas */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,14,24,0.9)',
          border: '1px solid #446688',
          borderRadius: 3,
          color: '#aabbcc',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 2,
          padding: '6px 18px',
          cursor: 'pointer',
          zIndex: 100,
          pointerEvents: 'auto',
        }}
      >
        BACK
      </button>
    </div>
  );
}
