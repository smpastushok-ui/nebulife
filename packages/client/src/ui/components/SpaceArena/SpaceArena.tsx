/**
 * SpaceArena — React wrapper for the ArenaEngine (Three.js).
 * Manages lifecycle: create on mount, destroy on unmount.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArenaEngine } from '../../../game/arena/index.js';
import type { ArenaCallbacks, MatchResult } from '../../../game/arena/index.js';
import { ArenaJoystick } from './ArenaJoystick.js';

interface SpaceArenaProps {
  onExit: () => void;
  onMatchEnd?: (result: MatchResult) => void;
}

const isMobileDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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
  const [mobile] = useState(isMobileDevice);
  const [sessionStats, setSessionStats] = useState({ kills: 0, missileKills: 0, deaths: 0, score: 0 });

  const callbacks = useRef<ArenaCallbacks>({
    onMatchEnd: (result) => onMatchEnd?.(result),
    onExit: () => onExit(),
    onStatsUpdate: (h, mh, s, ms, k, d) => {
      setHp(h); setShield(s); setKills(k); setDeaths(d);
    },
  });

  // Mobile joystick callbacks
  const handleMove = useCallback((x: number, y: number) => {
    engineRef.current?.setMobileMove(x, y);
  }, []);
  const handleAim = useCallback((x: number, y: number, firing: boolean) => {
    engineRef.current?.setMobileAim(x, y, firing);
  }, []);
  const handleDash = useCallback(() => {
    engineRef.current?.triggerDash();
  }, []);
  const handleFireLaser = useCallback((firing: boolean) => {
    engineRef.current?.setMobileAim(0, 0, firing);
  }, []);
  const handleFireMissile = useCallback(() => {
    engineRef.current?.fireMissile();
  }, []);
  const handleGravPush = useCallback(() => {
    engineRef.current?.triggerGravPush();
  }, []);

  // Poll engine state for UI (missile ammo, warp cooldown)
  const [missileAmmo, setMissileAmmo] = useState(10);
  const [warpReady, setWarpReady] = useState(true);
  const [isWarping, setIsWarping] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      setMissileAmmo(e.getMissileAmmo());
      setWarpReady(e.getWarpCooldown() <= 0);
      setIsWarping(e.isWarpActive());
    }, 200); // 5 fps UI poll
    return () => clearInterval(id);
  }, [ready]);

  // Poll engine for session stats (kills, missileKills, deaths, score)
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e || typeof e.getArenaStats !== 'function') return;
      setSessionStats(e.getArenaStats());
    }, 500);
    return () => clearInterval(id);
  }, [ready]);

  // Merge session stats into cumulative localStorage on exit
  const handleExit = useCallback(() => {
    const rawPrev = localStorage.getItem('nebulife_arena_stats');
    const prev = rawPrev
      ? JSON.parse(rawPrev)
      : { kills: 0, missileKills: 0, deaths: 0, score: 0, bestScore: 0, sessions: 0 };
    const merged = {
      kills: prev.kills + sessionStats.kills,
      missileKills: prev.missileKills + sessionStats.missileKills,
      deaths: prev.deaths + sessionStats.deaths,
      score: prev.score + sessionStats.score,
      bestScore: Math.max(prev.bestScore, sessionStats.score),
      sessions: prev.sessions + 1,
    };
    localStorage.setItem('nebulife_arena_stats', JSON.stringify(merged));
    onExit();
  }, [onExit, sessionStats]);

  useEffect(() => {
    if (!containerRef.current) return;

    const shipId = localStorage.getItem('nebulife_hangar_ship') || 'ship1';
    const engine = new ArenaEngine(containerRef.current, callbacks.current, shipId);
    engineRef.current = engine;
    engine.setIsMobile(mobile);

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
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          filter: isWarping ? 'blur(2px) brightness(1.3)' : 'none',
          transition: 'filter 0.15s',
        }}
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

      {/* Exit button — bottom left, door icon */}
      <button
        onClick={handleExit}
        style={{
          position: 'absolute', bottom: 20, left: 16,
          width: 44, height: 44,
          background: 'rgba(8,14,24,0.8)',
          border: '2px solid rgba(100,140,180,0.3)',
          borderRadius: 8,
          cursor: 'pointer',
          zIndex: 100,
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aabbcc" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>

      {/* Mobile joysticks */}
      {mobile && ready && (
        <ArenaJoystick
          onMove={handleMove}
          onAim={handleAim}
          onDash={handleDash}
          onFireLaser={handleFireLaser}
          onFireMissile={handleFireMissile}
          onGravPush={handleGravPush}
          missileAmmo={missileAmmo}
          warpReady={warpReady}
          isWarping={isWarping}
        />
      )}
    </div>
  );
}
