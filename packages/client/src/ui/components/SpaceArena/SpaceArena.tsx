/**
 * SpaceArena — React wrapper for the ArenaEngine (Three.js).
 * Manages lifecycle: create on mount, destroy on unmount.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArenaEngine } from '../../../game/arena/index.js';
import type { ArenaCallbacks, MatchResult, TeamMatchResult } from '../../../game/arena/index.js';
import { ArenaLandscapeControls } from './ArenaLandscapeControls.js';
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
  const [sessionStats, setSessionStats] = useState({ kills: 0, asteroidKills: 0, deaths: 0, score: 0 });
  const [showTutorial, setShowTutorial] = useState(() => shouldShowArenaTutorial());
  const [isDead, setIsDead] = useState(false);
  const [teamKills, setTeamKills] = useState({ blue: 0, red: 0 });
  const [killFeed, setKillFeed] = useState<{ killer: string; victim: string; killerTeam: string; victimTeam: string }[]>([]);
  const [lockState, setLockState] = useState<{ targetId: number | null; progress: number; locked: boolean } | null>(null);
  const [lockScreenPos, setLockScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [matchResult, setMatchResult] = useState<TeamMatchResult | null>(null);
  // Radar snapshot — refreshed at 10 Hz for the mini-map HUD.
  const [radar, setRadar] = useState<{
    aimYaw: number;
    playerY: number;
    bots: { id: number; team: 'blue' | 'red' | 'neutral'; alive: boolean; dx: number; dy: number; dz: number }[];
  } | null>(null);

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

  const callbacks = useRef<ArenaCallbacks>({
    onMatchEnd: (result) => {
      onMatchEnd?.(result);
      if ((result as TeamMatchResult).teamMode) {
        setMatchResult(result as TeamMatchResult);
      }
    },
    onExit: () => onExit(),
    onStatsUpdate: (h, mh, s, ms, k, d) => {
      setHp(h); setShield(s); setKills(k); setDeaths(d);
    },
    onPlayerDeath: () => setIsDead(true),
    onPlayerRespawn: () => setIsDead(false),
  });

  // Mobile joystick callbacks — coordinate conversion handled inside ArenaLandscapeControls via needRotate
  const handleMove = useCallback((x: number, y: number) => {
    engineRef.current?.setMobileMove(x, y);
  }, []);
  const handleAim = useCallback((x: number, y: number, firing: boolean) => {
    engineRef.current?.setMobileAim(x, y, firing);
  }, []);
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
  const handleVertical = useCallback((v: number) => {
    engineRef.current?.setMobileVertical(v);
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

  // Poll radar snapshot (10 Hz — smooth enough, cheap)
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e || typeof e.getRadarSnapshot !== 'function') return;
      const snap = e.getRadarSnapshot();
      setRadar({ aimYaw: snap.aimYaw, playerY: snap.player.y, bots: snap.bots });
    }, 100);
    return () => clearInterval(id);
  }, [ready]);

  // Poll lock-on state (50ms — fast for smooth tracking)
  useEffect(() => {
    if (!ready || !teamMode) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      const ls = e.getLockState();
      setLockState(ls);
      if (ls.targetId !== null) {
        const pos = e.getBotScreenPos(ls.targetId);
        setLockScreenPos(pos); // null if bot died → clears stale indicator
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
          filter: matchResult
            ? 'blur(4px) brightness(0.5) saturate(0.4)'
            : isDead
              ? 'blur(3px) brightness(0.35) saturate(0.3)'
              : isWarping ? 'blur(2px) brightness(1.3)' : 'none',
          transition: matchResult ? 'filter 0.5s ease-out' : isDead ? 'filter 0.2s ease-out' : 'filter 0.8s ease-in',
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

      {/* Keyframes for death glitch and match end */}
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
        @keyframes arenaMatchEndIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes arenaMatchEndBgIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* Mini radar — top-left. Top-down XZ projection of ship neighborhood,
          rotated so "up" = ahead. Y offset encoded in the dot size (bigger =
          higher than player). Range = 700 world units. */}
      {ready && radar && (
        <div style={{
          position: 'absolute',
          top: `calc(12px + env(safe-area-inset-top, 0px))`,
          left: `calc(12px + env(safe-area-inset-left, 0px))`,
          width: 120, height: 120,
          pointerEvents: 'none', zIndex: 4,
          background: 'rgba(5,10,20,0.55)',
          border: '1px solid rgba(100,140,180,0.35)',
          borderRadius: '50%',
          overflow: 'hidden',
        }}>
          <svg width="120" height="120" viewBox="-60 -60 120 120" style={{ display: 'block' }}>
            {/* Range rings */}
            <circle cx="0" cy="0" r="55" fill="none" stroke="rgba(100,140,180,0.25)" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="30" fill="none" stroke="rgba(100,140,180,0.18)" strokeWidth="0.5" />
            {/* Forward cone */}
            <path d="M0,0 L-20,-50 L20,-50 Z" fill="rgba(68,255,170,0.08)" stroke="rgba(68,255,170,0.2)" strokeWidth="0.5" />
            {/* Ship dot (player always center, facing up) */}
            <path d="M0,-4 L-3,3 L3,3 Z" fill="#aaddff" stroke="#ffffff" strokeWidth="0.5" />
            {/* Bot dots — yaw-aligned */}
            {radar.bots.filter(b => b.alive).map(b => {
              const cos = Math.cos(-radar.aimYaw);
              const sin = Math.sin(-radar.aimYaw);
              // Rotate world delta into ship-relative frame so +Y on radar = ship forward
              const rx = b.dx * cos - b.dz * sin;
              const rz = b.dx * sin + b.dz * cos;
              const scale = 55 / 700; // 700 world units → 55 radar units
              const x = rx * scale;
              const y = -rz * scale; // world -Z = up on radar
              const outOfRange = Math.abs(x) > 55 || Math.abs(y) > 55;
              if (outOfRange) return null;
              const yBand = b.dy > 40 ? 3.5 : b.dy < -40 ? 1.5 : 2.5;
              const color = b.team === 'blue' ? '#4488ff' : b.team === 'red' ? '#ff4444' : '#ffaa44';
              return <circle key={b.id} cx={x} cy={y} r={yBand} fill={color} />;
            })}
          </svg>
          <div style={{
            position: 'absolute', bottom: 2, right: 4,
            color: '#8899aa', fontSize: 9, fontFamily: 'monospace',
            textShadow: '0 0 2px rgba(0,0,0,0.9)',
          }}>
            Y {radar.playerY >= 0 ? '+' : ''}{radar.playerY.toFixed(0)}
          </div>
        </div>
      )}

      {/* TPS chase-cam crosshair — always centered, fades when dead */}
      {ready && !isDead && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 24, height: 24,
          pointerEvents: 'none',
          zIndex: 3,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#44ffaa" strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
            <circle cx="12" cy="12" r="2" />
            <line x1="12" y1="2" x2="12" y2="7" />
            <line x1="12" y1="17" x2="12" y2="22" />
            <line x1="2" y1="12" x2="7" y2="12" />
            <line x1="17" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      )}

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

      {/* Mobile joysticks */}
      {mobile && ready && (
        <ArenaLandscapeControls
          onMove={handleMove}
          onAim={handleAim}
          onDash={handleDash}
          onFireMissile={handleFireMissile}
          onGravPush={handleGravPush}
          onVertical={handleVertical}
          missileAmmo={missileAmmo}
          warpReady={warpReady}
          needRotate={needRotate}
        />
      )}

      {/* First-time tutorial overlay — shown only if localStorage flag not set */}
      {showTutorial && (
        <ArenaTutorial
          isMobile={mobile}
          onComplete={() => setShowTutorial(false)}
        />
      )}

      {/* Match result overlay — shown when team match ends */}
      {matchResult && (() => {
        const r = matchResult;
        const blueColor = '#4488ff';
        const redColor = '#ff4444';
        const drawColor = '#aabbcc';
        const winnerColor = r.winningTeam === 'blue' ? blueColor : r.winningTeam === 'red' ? redColor : drawColor;
        const winnerLabel = r.winningTeam === 'blue' ? 'BLUE WINS' : r.winningTeam === 'red' ? 'RED WINS' : 'DRAW';
        const bluePlayers = r.allPlayers.filter(p => p.team === 'blue').sort((a, b) => b.kills - a.kills);
        const redPlayers = r.allPlayers.filter(p => p.team === 'red').sort((a, b) => b.kills - a.kills);
        return (
          <>
            {/* Dim backdrop */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 50,
              background: 'rgba(2,5,16,0.75)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'arenaMatchEndBgIn 0.4s ease-out forwards',
            }} />
            {/* Results panel */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              zIndex: 51,
              width: 'min(580px, 92vw)',
              background: 'rgba(10,15,25,0.96)',
              border: '1px solid #334455',
              borderRadius: 6,
              fontFamily: 'monospace',
              padding: '28px 24px 20px',
              animation: 'arenaMatchEndIn 0.4s ease-out forwards',
            }}>
              {/* Winner title */}
              <div style={{
                textAlign: 'center',
                fontSize: 26,
                fontWeight: 'bold',
                color: winnerColor,
                letterSpacing: 4,
                marginBottom: 4,
                textShadow: `0 0 18px ${winnerColor}88`,
              }}>
                {winnerLabel}
              </div>
              {/* Score line */}
              <div style={{
                textAlign: 'center',
                fontSize: 13,
                color: '#667788',
                letterSpacing: 2,
                marginBottom: 20,
              }}>
                <span style={{ color: blueColor }}>{r.blueKills}</span>
                {' — '}
                <span style={{ color: redColor }}>{r.redKills}</span>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #223344', marginBottom: 16 }} />

              {/* Two-column player list */}
              <div style={{ display: 'flex', gap: 12 }}>
                {/* BLUE column */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: blueColor, fontSize: 10, letterSpacing: 3,
                    fontWeight: 'bold', marginBottom: 8, paddingBottom: 4,
                    borderBottom: `1px solid ${blueColor}44`,
                  }}>
                    BLUE  {r.blueKills} kills
                  </div>
                  {bluePlayers.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '4px 6px', marginBottom: 2,
                      borderRadius: 3,
                      background: p.name === 'PLAYER' ? 'rgba(68,136,255,0.12)' : 'transparent',
                      border: p.name === 'PLAYER' ? '1px solid rgba(68,136,255,0.3)' : '1px solid transparent',
                    }}>
                      <span style={{
                        color: p.name === 'PLAYER' ? blueColor : '#8899aa',
                        fontSize: 11,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '60%',
                      }}>
                        {p.name === 'PLAYER' ? 'YOU' : p.name}
                      </span>
                      <span style={{ color: '#667788', fontSize: 10, flexShrink: 0 }}>
                        <span style={{ color: '#aabbcc' }}>{p.kills}</span>
                        <span style={{ color: '#445566' }}>/</span>
                        <span style={{ color: '#8899aa' }}>{p.deaths}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* RED column */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: redColor, fontSize: 10, letterSpacing: 3,
                    fontWeight: 'bold', marginBottom: 8, paddingBottom: 4,
                    borderBottom: `1px solid ${redColor}44`,
                  }}>
                    RED  {r.redKills} kills
                  </div>
                  {redPlayers.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '4px 6px', marginBottom: 2,
                      borderRadius: 3,
                      background: p.name === 'PLAYER' ? 'rgba(255,68,68,0.12)' : 'transparent',
                      border: p.name === 'PLAYER' ? '1px solid rgba(255,68,68,0.3)' : '1px solid transparent',
                    }}>
                      <span style={{
                        color: p.name === 'PLAYER' ? redColor : '#8899aa',
                        fontSize: 11,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '60%',
                      }}>
                        {p.name === 'PLAYER' ? 'YOU' : p.name}
                      </span>
                      <span style={{ color: '#667788', fontSize: 10, flexShrink: 0 }}>
                        <span style={{ color: '#aabbcc' }}>{p.kills}</span>
                        <span style={{ color: '#445566' }}>/</span>
                        <span style={{ color: '#8899aa' }}>{p.deaths}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column header hint */}
              <div style={{
                textAlign: 'right', color: '#445566', fontSize: 9, letterSpacing: 1, marginTop: 4,
              }}>
                kills / deaths
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #223344', margin: '16px 0 14px' }} />

              {/* Exit button */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleExit}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    letterSpacing: 3,
                    color: '#aabbcc',
                    background: 'rgba(30,45,65,0.7)',
                    border: '1px solid #446688',
                    borderRadius: 3,
                    padding: '8px 32px',
                    cursor: 'pointer',
                  }}
                >
                  EXIT
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
