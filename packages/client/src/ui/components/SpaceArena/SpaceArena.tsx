/**
 * SpaceArena — React wrapper for the ArenaEngine (Three.js).
 * Manages lifecycle: create on mount, destroy on unmount.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArenaEngine } from '../../../game/arena/index.js';
import type { ArenaCallbacks, MatchResult } from '../../../game/arena/index.js';
import { ArenaJoystick } from './ArenaJoystick.js';
import { ArenaTutorial, shouldShowArenaTutorial } from './ArenaTutorial.js';

interface SpaceArenaProps {
  onExit: () => void;
  onMatchEnd?: (result: MatchResult) => void;
  teamMode?: boolean;
}

const isMobileDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function SpaceArena({ onExit, onMatchEnd, teamMode = false }: SpaceArenaProps) {
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
  // DEBUG: axis remapping mode — cycle with the AXIS button to find correct orientation
  // 0: identity (x→x, y→y)  1: 90°CCW (x→-y, y→x)  2: 180° (-x,-y)  3: 90°CW (x→y, y→-x)
  const [axisMode, setAxisMode] = useState(() => {
    const saved = localStorage.getItem('nebulife_axis_mode');
    return saved ? (parseInt(saved, 10) % 4) : 0;
  });
  const [sessionStats, setSessionStats] = useState({ kills: 0, asteroidKills: 0, deaths: 0, score: 0 });
  const [showTutorial, setShowTutorial] = useState(() => shouldShowArenaTutorial());
  const [isDead, setIsDead] = useState(false);
  const [teamKills, setTeamKills] = useState({ blue: 0, red: 0 });
  const [killFeed, setKillFeed] = useState<{ killer: string; victim: string; killerTeam: string; victimTeam: string }[]>([]);
  const [lockState, setLockState] = useState<{ targetId: number | null; progress: number; locked: boolean } | null>(null);
  const [lockScreenPos, setLockScreenPos] = useState<{ x: number; y: number } | null>(null);

  // Landscape orientation lock for mobile
  const [isPortrait, setIsPortrait] = useState(() => mobile && window.innerHeight > window.innerWidth);

  useEffect(() => {
    if (!mobile) return;
    // Try native orientation lock (not available in all browsers)
    try { (screen.orientation as any).lock('landscape').catch(() => {}); } catch (_) {}

    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      try { (screen.orientation as any).unlock(); } catch (_) {}
    };
  }, [mobile]);

  // Notify Three.js about effective dimension change when CSS rotation kicks in
  useEffect(() => {
    if (!mobile) return;
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    return () => clearTimeout(t);
  }, [isPortrait, mobile]);

  // Keep engine in sync with CSS rotation state
  useEffect(() => {
    engineRef.current?.setNeedsRotate(mobile && isPortrait);
  }, [isPortrait, mobile]);

  const callbacks = useRef<ArenaCallbacks>({
    onMatchEnd: (result) => onMatchEnd?.(result),
    onExit: () => onExit(),
    onStatsUpdate: (h, mh, s, ms, k, d) => {
      setHp(h); setShield(s); setKills(k); setDeaths(d);
    },
    onPlayerDeath: () => setIsDead(true),
    onPlayerRespawn: () => setIsDead(false),
  });

  // Apply axis rotation transform (for CSS-rotated landscape on portrait device).
  // axisMode cycles through 4 rotations so the user can find the correct one.
  const applyAxisTransform = useCallback((x: number, y: number): [number, number] => {
    if (!(mobile && isPortrait)) return [x, y]; // actual landscape — no transform needed
    switch (axisMode) {
      case 0: return [ x,  y]; // identity
      case 1: return [ y, -x]; // 90° CCW: right→up, down→right
      case 2: return [-x, -y]; // 180° flip
      case 3: return [-y,  x]; // 90° CW: right→down, down→left
      default: return [x, y];
    }
  }, [axisMode, mobile, isPortrait]);

  // Mobile joystick callbacks
  const handleMove = useCallback((x: number, y: number) => {
    const [tx, ty] = applyAxisTransform(x, y);
    engineRef.current?.setMobileMove(tx, ty);
  }, [applyAxisTransform]);
  const handleAim = useCallback((x: number, y: number, firing: boolean) => {
    const [tx, ty] = applyAxisTransform(x, y);
    engineRef.current?.setMobileAim(tx, ty, firing);
  }, [applyAxisTransform]);
  const handleDash = useCallback(() => {
    engineRef.current?.triggerDash();
  }, []);
  // Laser fire is now handled by right joystick (aim + auto-fire)
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

  // Poll engine for session stats (kills, asteroidKills, deaths, score)
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e || typeof e.getArenaStats !== 'function') return;
      setSessionStats(e.getArenaStats());
    }, 500);
    return () => clearInterval(id);
  }, [ready]);

  // Poll team kills + kill feed (200ms)
  useEffect(() => {
    if (!ready || !teamMode) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      setTeamKills(e.getTeamKills());
      const rawFeed = e.getKillFeed();
      const bots = e.getBotShips();
      const playerTeam = e.getPlayerTeam();
      const nameToTeam = (name: string): string => {
        if (name === 'PLAYER') return playerTeam;
        const bot = bots.find(b => b.name === name);
        return bot ? bot.team : 'red';
      };
      setKillFeed(rawFeed.slice(-5).map(entry => ({
        killer: entry.killer,
        victim: entry.victim,
        killerTeam: nameToTeam(entry.killer),
        victimTeam: nameToTeam(entry.victim),
      })));
    }, 200);
    return () => clearInterval(id);
  }, [ready, teamMode]);

  // Poll lock-on state (50ms — fast for smooth tracking)
  useEffect(() => {
    if (!ready || !teamMode) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      const ls = e.getLockState();
      setLockState(ls);
      if (ls.targetId !== null) {
        setLockScreenPos(e.getBotScreenPos(ls.targetId));
      } else {
        setLockScreenPos(null);
      }
    }, 50);
    return () => clearInterval(id);
  }, [ready, teamMode]);

  // Merge session stats into cumulative localStorage on exit
  const handleExit = useCallback(() => {
    const rawPrev = localStorage.getItem('nebulife_arena_stats');
    const prev = rawPrev
      ? JSON.parse(rawPrev)
      : { kills: 0, asteroidKills: 0, deaths: 0, score: 0, bestScore: 0, sessions: 0 };
    const merged = {
      kills: prev.kills + sessionStats.kills,
      asteroidKills: prev.asteroidKills + sessionStats.asteroidKills,
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
    const engine = new ArenaEngine(containerRef.current, callbacks.current, shipId, teamMode);
    engineRef.current = engine;
    engine.setIsMobile(mobile);
    engine.setNeedsRotate(mobile && window.innerHeight > window.innerWidth);

    engine.init().then(() => {
      setReady(true);
      engine.startMatch();
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // When mobile is portrait, apply CSS rotation to force landscape
  const needRotate = mobile && isPortrait;
  const outerStyle: React.CSSProperties = needRotate
    ? {
        position: 'fixed', top: 0, left: 0, zIndex: 9000, background: '#020510',
        width: window.innerHeight, height: window.innerWidth,
        transform: 'rotate(90deg) translateY(-100%)',
        transformOrigin: 'top left',
        overflow: 'hidden',
      }
    : { position: 'fixed', inset: 0, zIndex: 9000, background: '#020510' };

  return (
    <div style={outerStyle}>
      {/* Three.js canvas container — z-index 0 so UI stays on top */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          filter: isDead
            ? 'blur(3px) brightness(0.35) saturate(0.3)'
            : isWarping ? 'blur(2px) brightness(1.3)' : 'none',
          transition: isDead ? 'filter 0.2s ease-out' : 'filter 0.8s ease-in',
        }}
      />

      {/* Death glitch overlay */}
      {isDead && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Red flash */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(200,40,40,0.4) 0%, rgba(200,40,40,0) 70%)',
            animation: 'arenaDeathFlash 0.6s ease-out forwards',
          }} />
          {/* Scanlines */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.12,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
            animation: 'arenaScanlines 0.1s linear infinite',
          }} />
          {/* Chromatic aberration strips */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15, mixBlendMode: 'screen',
            boxShadow: '-3px 0 0 rgba(255,0,0,0.5), 3px 0 0 rgba(0,200,255,0.5)',
            animation: 'arenaGlitchShift 0.3s ease-out forwards',
          }} />
          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
          }} />
        </div>
      )}

      {/* Keyframes for death glitch */}
      <style>{`
        @keyframes arenaDeathFlash {
          0% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @keyframes arenaScanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        @keyframes arenaGlitchShift {
          0% { transform: translateX(-6px); opacity: 0.4; }
          20% { transform: translateX(4px); opacity: 0.25; }
          40% { transform: translateX(-3px); opacity: 0.15; }
          100% { transform: translateX(0); opacity: 0.08; }
        }
      `}</style>

      {/* HUD overlay */}
      {ready && (
        <div style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          fontFamily: 'monospace',
          zIndex: 2,
        }}>
          {/* Team score bar — top center, team mode only */}
          {teamMode && (
            <div style={{
              position: 'absolute',
              top: `calc(12px + env(safe-area-inset-top, 0px))`,
              left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'monospace', fontSize: 11, zIndex: 3, pointerEvents: 'none',
            }}>
              <span style={{ color: '#4488ff', fontWeight: 'bold' }}>BLUE {teamKills.blue}</span>
              <div style={{
                width: 200, height: 6, background: 'rgba(10,15,25,0.8)',
                borderRadius: 3, overflow: 'hidden', display: 'flex',
              }}>
                <div style={{ width: `${(teamKills.blue / 100) * 100}%`, background: '#4488ff', transition: 'width 0.3s' }} />
                <div style={{ flex: 1 }} />
                <div style={{ width: `${(teamKills.red / 100) * 100}%`, background: '#ff4444', transition: 'width 0.3s' }} />
              </div>
              <span style={{ color: '#ff4444', fontWeight: 'bold' }}>{teamKills.red} RED</span>
            </div>
          )}

          {/* Kill feed — top right, team mode only (safe area offset) */}
          {teamMode && killFeed.length > 0 && (
            <div style={{
              position: 'absolute',
              top: `calc(40px + env(safe-area-inset-top, 0px))`,
              right: `calc(16px + env(safe-area-inset-right, 0px))`,
              zIndex: 3,
              display: 'flex', flexDirection: 'column', gap: 2,
              fontFamily: 'monospace', fontSize: 8, pointerEvents: 'none',
            }}>
              {killFeed.map((entry, i) => (
                <div key={i} style={{
                  color: '#8899aa', opacity: 1 - i * 0.2,
                  transition: 'opacity 0.5s',
                }}>
                  <span style={{ color: entry.killerTeam === 'blue' ? '#4488ff' : '#ff4444' }}>
                    {entry.killer}
                  </span>
                  {' > '}
                  <span style={{ color: entry.victimTeam === 'blue' ? '#4488ff' : '#ff4444' }}>
                    {entry.victim}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lock-on indicator — screen-space overlay, team mode only */}
      {teamMode && lockState && lockState.targetId !== null && (
        <div style={{
          position: 'absolute',
          left: lockScreenPos?.x ?? 0,
          top: lockScreenPos?.y ?? 0,
          transform: 'translate(-50%, -50%)',
          zIndex: 3, pointerEvents: 'none',
        }}>
          {/* Diamond shape */}
          <div style={{
            width: 40, height: 40,
            border: `2px solid ${lockState.locked ? '#ff4444' : '#ffaa44'}`,
            transform: 'rotate(45deg)',
            transition: 'border-color 0.2s',
          }} />
          {/* Lock-on progress bar */}
          <div style={{
            width: 40, height: 3, marginTop: 4,
            background: 'rgba(10,15,25,0.8)', borderRadius: 2,
          }}>
            <div style={{
              width: `${lockState.progress * 100}%`,
              height: '100%',
              background: lockState.locked ? '#ff4444' : '#ffaa44',
              borderRadius: 2, transition: 'width 0.05s',
            }} />
          </div>
          {lockState.locked && (
            <div style={{
              fontSize: 8, color: '#ff4444', textAlign: 'center',
              fontFamily: 'monospace', letterSpacing: 2, marginTop: 2,
            }}>LOCKED</div>
          )}
        </div>
      )}

      {/* Exit button — top left (offset for iOS notch / Dynamic Island) */}
      <button
        onClick={handleExit}
        style={{
          position: 'absolute',
          top: `calc(12px + env(safe-area-inset-top, 0px))`,
          left: `calc(12px + env(safe-area-inset-left, 0px))`,
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

      {/* DEBUG: axis mode toggle — tap to cycle, remove after calibration */}
      {mobile && (
        <button
          onPointerDown={() => {
            const next = (axisMode + 1) % 4;
            setAxisMode(next);
            localStorage.setItem('nebulife_axis_mode', String(next));
          }}
          style={{
            position: 'absolute',
            top: `calc(12px + env(safe-area-inset-top, 0px))`,
            left: `calc(64px + env(safe-area-inset-left, 0px))`,
            width: 44, height: 44,
            background: 'rgba(255,80,0,0.7)',
            border: '2px solid #ff8844',
            borderRadius: 8,
            cursor: 'pointer',
            zIndex: 100,
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <span style={{ color: '#fff', fontSize: 9, fontFamily: 'monospace', letterSpacing: 0 }}>AXIS</span>
          <span style={{ color: '#ffdd66', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}>{axisMode}</span>
        </button>
      )}

      {/* Mobile joysticks */}
      {mobile && ready && (
        <ArenaJoystick
          onMove={handleMove}
          onAim={handleAim}
          onDash={handleDash}
          onFireMissile={handleFireMissile}
          onGravPush={handleGravPush}
          missileAmmo={missileAmmo}
          warpReady={warpReady}
          isWarping={isWarping}
        />
      )}

      {/* First-time tutorial overlay — shown only if localStorage flag not set */}
      {showTutorial && (
        <ArenaTutorial
          isMobile={mobile}
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}
