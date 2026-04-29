/**
 * SpaceArena — React wrapper for the ArenaEngine (Three.js).
 * Manages lifecycle: create on mount, destroy on unmount.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArenaEngine } from '../../../game/arena/index.js';
import type { ArenaCallbacks, MatchResult, TeamMatchResult } from '../../../game/arena/index.js';
import { ArenaLandscapeControls } from './ArenaLandscapeControls.js';
import { ArenaTutorial, shouldShowArenaTutorial } from './ArenaTutorial.js';
import { enterImmersive, exitImmersive } from '../../../services/immersive.js';
import { getDeviceTier } from '../../../utils/device-tier.js';

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
  const [maxHp, setMaxHp] = useState(100);
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
  const [edgeMarkers, setEdgeMarkers] = useState<{
    id: number; team: 'blue' | 'red' | 'neutral';
    left: string; top: string;
    side: 'top' | 'bottom' | 'left' | 'right';
    blink: boolean;
  }[]>([]);
  const [playerLocked, setPlayerLocked] = useState(false);
  // Normalized player speed 0..1 — used to drive the edge motion-blur
  // overlay. Polled with the other HUD state.
  const [speedRatio, setSpeedRatio] = useState(0);
  // Pre-match countdown (seconds remaining) — 0 when countdown is not
  // the active phase. Polled with the other HUD state.
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  // Exit confirmation — opened by the Android back button / browser back.
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Live match timer (polled with the rest of the arena state) — used to
  // draw the HUD countdown in the top score bar.
  const [matchTimer, setMatchTimer] = useState(0);
  // Damage flash removed — lasers now cause camera shake (in engine),
  // and screen blink is reserved exclusively for missile threats.

  // System back button (web + Capacitor) — intercept and show exit prompt
  // instead of leaving arena immediately. We push a dummy history entry on
  // mount so the first back press triggers popstate rather than navigating
  // away from the SPA.
  useEffect(() => {
    window.history.pushState({ arena: true }, '');
    const onPopState = () => {
      setShowExitConfirm(true);
      // Re-push so the NEXT back press triggers popstate again (not exit)
      window.history.pushState({ arena: true }, '');
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Immersive fullscreen — hide Android system bars (status + nav) for the
  // duration of the arena ONLY. On Capacitor: native WindowInsetsController.
  // On web: Fullscreen API (best-effort; may fail without recent user gesture).
  //
  // Re-apply on visibility change because Android auto-restores system bars
  // when the app is backgrounded (home / recents / push). Coming back we
  // want fullscreen restored immediately.
  useEffect(() => {
    enterImmersive();
    const onVis = () => {
      if (document.visibilityState === 'visible') enterImmersive();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      exitImmersive();
    };
  }, []);

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
      setHp(h); setMaxHp(mh); setShield(s); setKills(k); setDeaths(d);
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
  // Laser fire is handled exclusively by the left stick's "laser" sector
  // (top of the ring). Right stick is pitch/yaw only.
  const handleFireMissile = useCallback(() => {
    engineRef.current?.fireMissile();
  }, []);
  const handleGravPush = useCallback(() => {
    engineRef.current?.triggerGravPush();
  }, []);
  const handleVertical = useCallback((v: number) => {
    engineRef.current?.setMobileVertical(v);
  }, []);
  const handleSector = useCallback((sector: 'center' | 'missile' | 'warp' | 'dodge' | 'gravity') => {
    engineRef.current?.setMobileSector(sector);
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

  // Poll team kills + kill feed + match timer (200ms). Both training (3v3)
  // and team-battle modes use team scores now, so this runs regardless of
  // `teamMode`.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      setTeamKills(e.getTeamKills());
      setMatchTimer(e.getMatchTimer());
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
  }, [ready]);

  // Poll edge markers (10 Hz) — perimeter indicators for bots that are
  // off-screen. For bots on-screen we emit nothing.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e || typeof e.getEdgeMarkers !== 'function') return;
      const raw = e.getEdgeMarkers();
      // Clamp off-screen bots to the nearest viewport edge.
      const markers: typeof edgeMarkers = [];
      for (const m of raw) {
        if (m.onScreen) continue;
        // Decide which side is the closest crossing point, then compute
        // percentage along that side based on the other axis.
        let side: 'top' | 'bottom' | 'left' | 'right';
        let left = '50%';
        let top = '50%';
        const ax = Math.abs(m.nx);
        const ay = Math.abs(m.ny);
        if (ax > ay) {
          side = m.nx > 0 ? 'right' : 'left';
          left = side === 'right' ? 'calc(100% - 10px)' : '10px';
          // Map ny (-1..1) to top 5%..95%
          const t = Math.max(-1, Math.min(1, m.ny));
          top = `${50 + t * 45}%`;
        } else {
          side = m.ny > 0 ? 'bottom' : 'top';
          top = side === 'bottom' ? 'calc(100% - 10px)' : '10px';
          const t = Math.max(-1, Math.min(1, m.nx));
          left = `${50 + t * 45}%`;
        }
        markers.push({
          id: m.id,
          team: m.team,
          left, top, side,
          blink: m.shooting,
        });
      }
      setEdgeMarkers(markers);
      // Lock-on alert: any enemy missile chasing the player (id 0)
      if (typeof e.isPlayerLocked === 'function') {
        setPlayerLocked(e.isPlayerLocked());
      }
      // Speed ratio — drives the edge motion-blur overlay.
      if (typeof e.getPlayerSpeedRatio === 'function') {
        setSpeedRatio(e.getPlayerSpeedRatio());
      }
      // Pre-match countdown: 0 once phase is 'playing' or later.
      if (typeof e.getPhase === 'function' && typeof e.getCountdownTimer === 'function') {
        setCountdownRemaining(e.getPhase() === 'countdown' ? e.getCountdownTimer() : 0);
      }
      // Radar no longer rendered but kept for altitude readout if needed.
      if (typeof e.getRadarSnapshot === 'function') {
        const snap = e.getRadarSnapshot();
        setRadar({ aimYaw: snap.aimYaw, playerY: snap.player.y, bots: snap.bots });
      }
    }, 100);
    return () => clearInterval(id);
  }, [ready]);

  // Poll lock-on state (50ms — fast for smooth tracking). Training (3v3)
  // mode needs it too — previously gated on teamMode which is why the HUD
  // lock rhombus never appeared in training despite the engine running
  // updateLockOn every frame.
  useEffect(() => {
    if (!ready) return;
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
  }, [ready]);

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
      // If the first-time tutorial is open, hold the match in 'waiting'
      // phase until the player finishes the walkthrough. Countdown is
      // triggered either after tutorial completes (below) or immediately
      // for returning players.
      if (!shouldShowArenaTutorial()) {
        engine.startMatch();
      }
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

  // CSS `filter: blur(...)` on the Three.js canvas forces the GPU to
  // composit the entire rendered scene into its own layer and run a
  // convolution blur over it — on low-end Android this alone can cost
  // 10ms/frame. For low tier we drop the filter; a dimming overlay div
  // below communicates the same "dead / warping / ended" state cheaply.
  const lowEnd = getDeviceTier() === 'low';
  const canvasFilter = lowEnd
    ? 'none'
    : matchResult
      ? 'blur(4px) brightness(0.5) saturate(0.4)'
      : isDead
        ? 'blur(3px) brightness(0.35) saturate(0.3)'
        : isWarping ? 'blur(2px) brightness(1.3)' : 'none';

  return (
    <div style={outerStyle}>
      {/* Three.js canvas container — z-index 0 so UI stays on top */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          filter: canvasFilter,
          transition: matchResult ? 'filter 0.5s ease-out' : isDead ? 'filter 0.2s ease-out' : 'filter 0.8s ease-in',
        }}
      />

      {/* Low-tier substitute for the canvas filter — plain dimming div.
          Only applied when the expensive canvas filter is disabled. */}
      {lowEnd && (matchResult || isDead || isWarping) && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
            background: matchResult
              ? 'rgba(0,0,0,0.55)'
              : isDead
                ? 'rgba(40,0,0,0.55)'
                : /* warping */ 'rgba(0,0,20,0.25)',
            transition: 'background 0.3s ease-out',
          }}
        />
      )}

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
        @keyframes arenaDamageFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes arenaEdgeBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.15; }
        }
        @keyframes arenaLockBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        @keyframes arenaCountdownPop {
          0% { transform: scale(0.4); opacity: 0; }
          20% { transform: scale(1.15); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
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
          0% { opacity: 0; transform: translate(-50%, -46%) scale(0.9); filter: blur(8px); }
          65% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes arenaMatchEndBgIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes arenaWinnerPulse {
          0%, 100% { opacity: 0.72; transform: translateX(-50%) scaleX(0.88); }
          50% { opacity: 1; transform: translateX(-50%) scaleX(1); }
        }
      `}</style>

      {/* Pre-match countdown — big 3/2/1 over the arena. Pops in each
          whole-second tick, fades between. */}
      {ready && countdownRemaining > 0 && (
        <div
          key={`cd-${Math.ceil(countdownRemaining)}`}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            fontFamily: 'monospace', fontSize: 96, fontWeight: 'bold',
            color: countdownRemaining <= 1 ? '#ff8844' : '#aaccee',
            textShadow: '0 0 24px rgba(0,0,0,0.8), 0 0 48px rgba(100,140,180,0.4)',
            animation: 'arenaCountdownPop 1s ease-out forwards',
            letterSpacing: 4,
          }}>
            {Math.ceil(countdownRemaining)}
          </div>
        </div>
      )}

      {/* Edge motion blur — radial mask keeps the center sharp while the
          outer 40% gets a static backdrop-filter blur. Previously the blur
          amount scaled with speedRatio at 10Hz, so the browser recomputed
          the whole backdrop composite on every tick — that was the single
          most expensive CSS effect on low-end Android. Now:
            - low tier: skip entirely (no compositing layer at all)
            - mid/high: render once with a fixed 3px blur, toggled on/off
              only when the player crosses the speed threshold (rare). */}
      {ready && speedRatio > 0.25 && getDeviceTier() !== 'low' && (
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            // Radial mask — transparent center, opaque at corners
            maskImage: 'radial-gradient(circle at center, transparent 35%, black 85%)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 85%)',
          }}
        />
      )}

      {/* Lock-on alert — red blinking border when an enemy missile is
          homing on the player. Dodge NOW. */}
      {ready && playerLocked && !isDead && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
          boxShadow: 'inset 0 0 60px rgba(255,40,40,0.6)',
          border: '3px solid rgba(255,40,40,0.9)',
          animation: 'arenaLockBlink 0.4s linear infinite',
        }} />
      )}

      {/* Edge indicators — tick marks along the viewport perimeter for each
          bot outside the camera frustum. Red = enemy, blue = ally. If a bot
          is shooting at you, its tick blinks. Uses screen-space projection
          from the engine. */}
      {ready && edgeMarkers.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
          {edgeMarkers.map(m => (
            <div
              key={m.id}
              style={{
                position: 'absolute',
                left: m.left, top: m.top,
                width: m.side === 'top' || m.side === 'bottom' ? 18 : 3,
                height: m.side === 'top' || m.side === 'bottom' ? 3 : 18,
                background: m.team === 'blue' ? '#4488ff' : '#ff4444',
                opacity: m.blink ? undefined : 0.8,
                animation: m.blink ? 'arenaEdgeBlink 0.5s linear infinite' : undefined,
                boxShadow: `0 0 6px ${m.team === 'blue' ? '#4488ff' : '#ff4444'}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      )}

      {/* Damage vignette removed — see engine.shakeAmount for the laser
          hit feedback (camera jolt instead of a screen flash). */}

      {/* Boundary altitude warning — top/bottom tint when within 60u of cap */}
      {ready && radar && (Math.abs(radar.playerY) > 340) && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
          background: radar.playerY > 0
            ? 'linear-gradient(to bottom, rgba(255,100,40,0.22) 0%, rgba(255,100,40,0) 30%)'
            : 'linear-gradient(to top, rgba(255,100,40,0.22) 0%, rgba(255,100,40,0) 30%)',
        }} />
      )}

      {/* HP bar removed from under the crosshair — now lives in the top
          cluster above the score bar. */}

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
          {/* Top HUD cluster — three stacked rows, all centered:
              1) nickname (small)
              2) HP bar (player health, above the score)
              3) team score + timer (big numbers) */}
          <div style={{
            position: 'absolute',
            top: `calc(10px + env(safe-area-inset-top, 0px))`,
            left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            fontFamily: 'monospace', zIndex: 3, pointerEvents: 'none',
          }}>
            {/* Row 1: nickname */}
            <div style={{
              fontSize: 10, color: '#aaccee', opacity: 0.8,
              letterSpacing: 3,
              textShadow: '0 0 4px rgba(0,0,0,0.8)',
            }}>
              {(localStorage.getItem('nebulife_name') || 'PLAYER').toUpperCase()}
            </div>

            {/* Row 2: HP bar */}
            <div style={{
              width: 160, height: 5,
              background: 'rgba(10,15,25,0.6)',
              border: '1px solid rgba(100,140,180,0.25)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`,
                height: '100%',
                background: hp > maxHp * 0.5 ? '#44ff88' : hp > maxHp * 0.25 ? '#ffaa44' : '#ff4444',
                transition: 'width 0.2s, background 0.3s',
              }} />
            </div>

            {/* Row 3: score + timer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '4px 14px',
              background: 'rgba(5,10,20,0.55)',
              border: '1px solid rgba(100,140,180,0.35)',
              borderRadius: 4,
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{ color: '#4488ff', fontWeight: 'bold', fontSize: 20, textShadow: '0 0 8px rgba(68,136,255,0.6)' }}>
                {teamKills.blue}
              </span>
              <div style={{
                color: '#aaccee', fontSize: 12, letterSpacing: 2,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                minWidth: 64,
              }}>
                <span style={{ opacity: 0.8 }}>
                  {(() => {
                    const t = Math.max(0, Math.ceil(matchTimer));
                    const mm = Math.floor(t / 60);
                    const ss = t % 60;
                    return `${mm}:${ss.toString().padStart(2, '0')}`;
                  })()}
                </span>
                <span style={{ fontSize: 9, opacity: 0.45, letterSpacing: 3 }}>25 KILLS</span>
              </div>
              <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 20, textShadow: '0 0 8px rgba(255,68,68,0.6)' }}>
                {teamKills.red}
              </span>
            </div>
          </div>

          {/* Kill feed — top right (always on) */}
          {killFeed.length > 0 && (
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

      {/* Lock-on indicator — shown in both training (3v3) and team-battle.
          Thin RED rhombus while locking progresses, GREEN when fully
          locked (missile will guaranteed-follow the marked player). */}
      {lockState && lockState.targetId !== null && (
        <div style={{
          position: 'absolute',
          left: lockScreenPos?.x ?? 0,
          top: lockScreenPos?.y ?? 0,
          transform: 'translate(-50%, -50%)',
          zIndex: 3, pointerEvents: 'none',
        }}>
          {/* Diamond (rhombus): red while acquiring → green when locked */}
          <div style={{
            width: 36, height: 36,
            border: `1.5px solid ${lockState.locked ? '#44ff88' : '#ff4444'}`,
            transform: 'rotate(45deg)',
            transition: 'border-color 0.15s',
            boxShadow: lockState.locked
              ? '0 0 10px rgba(68,255,136,0.5)'
              : '0 0 4px rgba(255,68,68,0.3)',
          }} />
          {/* Progress bar only while acquiring (hidden once locked) */}
          {!lockState.locked && (
            <div style={{
              width: 36, height: 2, marginTop: 4,
              background: 'rgba(10,15,25,0.8)', borderRadius: 1,
            }}>
              <div style={{
                width: `${lockState.progress * 100}%`,
                height: '100%',
                background: '#ff4444',
                borderRadius: 1, transition: 'width 0.05s',
              }} />
            </div>
          )}
          {lockState.locked && (
            <div style={{
              fontSize: 8, color: '#44ff88', textAlign: 'center',
              fontFamily: 'monospace', letterSpacing: 2, marginTop: 4,
              textShadow: '0 0 4px rgba(68,255,136,0.6)',
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
          onSector={handleSector}
          missileAmmo={missileAmmo}
          warpReady={warpReady}
          needRotate={needRotate}
        />
      )}

      {/* First-time tutorial overlay — shown only if localStorage flag not set.
          Start the match countdown once the player dismisses the tutorial so
          they're not dropped into combat immediately after reading the intro. */}
      {showTutorial && (
        <ArenaTutorial
          isMobile={mobile}
          onComplete={() => {
            setShowTutorial(false);
            engineRef.current?.startMatch();
          }}
        />
      )}

      {/* Exit confirmation — system back button opens this. Player taps
          "YES" to leave the arena or "NO" to keep fighting. */}
      {showExitConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          fontFamily: 'monospace',
        }}>
          <div style={{
            background: 'rgba(10,15,25,0.95)',
            border: '1px solid #446688',
            padding: 24,
            borderRadius: 4,
            minWidth: 260,
            textAlign: 'center',
            color: '#aabbcc',
          }}>
            <div style={{ fontSize: 14, marginBottom: 18, letterSpacing: 1 }}>
              EXIT ARENA?
            </div>
            <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 22 }}>
              Are you sure you want to leave?
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => { setShowExitConfirm(false); handleExit(); }}
                style={{
                  background: 'transparent', border: '1px solid #cc4444',
                  color: '#ff8888', padding: '8px 20px', fontSize: 12,
                  fontFamily: 'monospace', cursor: 'pointer', letterSpacing: 2,
                }}
              >YES</button>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  background: 'transparent', border: '1px solid #446688',
                  color: '#aaccee', padding: '8px 20px', fontSize: 12,
                  fontFamily: 'monospace', cursor: 'pointer', letterSpacing: 2,
                }}
              >NO</button>
            </div>
          </div>
        </div>
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
              background: `radial-gradient(circle at 50% 44%, ${winnerColor}18, transparent 30%), linear-gradient(120deg, rgba(68,136,255,0.13), transparent 35%, rgba(255,68,68,0.12)), rgba(2,5,16,0.82)`,
              backdropFilter: 'blur(7px) saturate(0.85)',
              WebkitBackdropFilter: 'blur(7px) saturate(0.85)',
              animation: 'arenaMatchEndBgIn 0.55s ease-out forwards',
            }} />
            {/* Results panel */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              zIndex: 51,
              width: 'min(680px, 92vw)',
              maxHeight: 'calc(100dvh - 40px)',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, rgba(11,18,31,0.96), rgba(4,9,18,0.96))',
              border: `1px solid ${winnerColor}66`,
              borderRadius: 10,
              fontFamily: 'monospace',
              padding: '28px 24px 20px',
              color: '#aabbcc',
              boxShadow: `0 0 42px ${winnerColor}22, inset 0 0 48px rgba(68,136,170,0.08)`,
              animation: 'arenaMatchEndIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
              <div style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                width: '62%',
                height: 1,
                background: `linear-gradient(90deg, transparent, ${winnerColor}, transparent)`,
                animation: 'arenaWinnerPulse 2.6s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              {/* Winner title */}
              <div style={{
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 'bold',
                color: winnerColor,
                letterSpacing: 6,
                marginBottom: 6,
                textShadow: `0 0 18px ${winnerColor}99`,
              }}>
                {winnerLabel}
              </div>
              {/* Score line */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                marginBottom: 18,
              }}>
                <div style={{
                  minWidth: 86, padding: '8px 14px', textAlign: 'center',
                  border: `1px solid ${blueColor}44`, borderRadius: 6,
                  background: 'rgba(68,136,255,0.08)',
                }}>
                  <div style={{ color: blueColor, fontSize: 24, fontWeight: 'bold' }}>{r.blueKills}</div>
                  <div style={{ color: '#6688aa', fontSize: 8, letterSpacing: 3 }}>BLUE</div>
                </div>
                <div style={{ color: '#556677', fontSize: 10, letterSpacing: 3 }}>TARGET 25</div>
                <div style={{
                  minWidth: 86, padding: '8px 14px', textAlign: 'center',
                  border: `1px solid ${redColor}44`, borderRadius: 6,
                  background: 'rgba(255,68,68,0.08)',
                }}>
                  <div style={{ color: redColor, fontSize: 24, fontWeight: 'bold' }}>{r.redKills}</div>
                  <div style={{ color: '#aa6666', fontSize: 8, letterSpacing: 3 }}>RED</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(68,136,170,0.25)', marginBottom: 16 }} />

              {/* Two-column player list */}
              <div style={{ display: 'flex', gap: 12 }}>
                {/* BLUE column */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: blueColor, fontSize: 10, letterSpacing: 3,
                    fontWeight: 'bold', marginBottom: 8, paddingBottom: 4,
                    borderBottom: `1px solid ${blueColor}44`,
                    textShadow: `0 0 10px ${blueColor}66`,
                  }}>
                    BLUE  {r.blueKills} kills
                  </div>
                  {bluePlayers.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', marginBottom: 3,
                      borderRadius: 5,
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
                    textShadow: `0 0 10px ${redColor}66`,
                  }}>
                    RED  {r.redKills} kills
                  </div>
                  {redPlayers.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', marginBottom: 3,
                      borderRadius: 5,
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
              <div style={{ borderTop: '1px solid rgba(68,136,170,0.25)', margin: '16px 0 14px' }} />

              {/* Exit button */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleExit}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    letterSpacing: 3,
                    color: '#aabbcc',
                    background: `linear-gradient(135deg, ${winnerColor}1f, rgba(20,30,50,0.72))`,
                    border: `1px solid ${winnerColor}88`,
                    borderRadius: 5,
                    padding: '9px 34px',
                    cursor: 'pointer',
                    boxShadow: `0 0 16px ${winnerColor}22`,
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
