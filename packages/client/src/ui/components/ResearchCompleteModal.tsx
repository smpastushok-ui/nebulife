import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StarSystem, SystemResearchState } from '@nebulife/core';

// ---------------------------------------------------------------------------
// ResearchCompleteModal — "Дослідження системи завершено"
// ---------------------------------------------------------------------------
// Design: ship computer telemetry readout, no green except for habitability.
// Features: scramble-decode animation, staggered planet rows, sound cues.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCRAMBLE_CHARS = '0123456789ABCDEF:./\\|><-_#@!?';

function useScramble(target: string, startMs: number, durationMs = 700): string {
  const [display, setDisplay] = useState('');
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const delay = setTimeout(() => {
      if (cancelled) return;
      startRef.current = performance.now();
      const tick = () => {
        if (cancelled) return;
        const elapsed = performance.now() - startRef.current;
        const progress = Math.min(elapsed / durationMs, 1);
        // Reveal chars left-to-right as progress advances
        const revealCount = Math.floor(progress * target.length);
        let result = '';
        for (let i = 0; i < target.length; i++) {
          if (i < revealCount) {
            result += target[i];
          } else {
            // Random scramble char (preserves spaces)
            result += target[i] === ' ' ? ' '
              : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          }
        }
        setDisplay(result);
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    }, startMs);

    return () => {
      cancelled = true;
      clearTimeout(delay);
      cancelAnimationFrame(frameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

// Tiny Web Audio beep — no external deps
function playBeep(frequency = 880, duration = 0.06, gain = 0.08, type: OscillatorType = 'sine') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* AudioContext not available */ }
}

function playHabitableBeep() {
  // Double-beep for habitable planet
  playBeep(1047, 0.08, 0.10, 'sine');
  setTimeout(() => playBeep(1319, 0.10, 0.10, 'sine'), 100);
}

function getPlanetTypeLabel(type: string): string {
  switch (type) {
    case 'rocky':     return "Кам'яниста";
    case 'dwarf':     return 'Карликова';
    case 'gas-giant': return 'Газовий гігант';
    case 'ice-giant': return 'Крижаний гігант';
    default:          return type;
  }
}

function getPlanetDotColor(type: string): string {
  switch (type) {
    case 'rocky':     return '#7a6a58';
    case 'dwarf':     return '#5a5552';
    case 'gas-giant': return '#5a7a9a';
    case 'ice-giant': return '#4a8494';
    default:          return '#667788';
  }
}

/** Map radiusEarth (0.1 – 12) to dot size px (6 – 14) */
function getPlanetDotSize(radiusEarth: number): number {
  const t = Math.min(Math.log(radiusEarth + 1) / Math.log(12), 1);
  return 6 + t * 8;
}

/** Habitability 0-1 → css color */
function getHabColor(h: number): string {
  if (h >= 0.70) return '#44ff88';
  if (h >= 0.30) return '#ff8844';
  return '#cc4444';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ResearchCompleteModal({
  system,
  research,
  onViewSystem,
  onClose,
}: {
  system: StarSystem;
  research: SystemResearchState;
  onViewSystem: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  // Scramble targets
  const systemNameDisplay = useScramble(`СИСТЕМА  ${system.name.toUpperCase()}`, 80, 800);
  const starClassDisplay   = useScramble(
    `${system.star.spectralClass}${system.star.subType}V`,
    500, 600,
  );

  // Entrance animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Staggered planet reveal with sound cues
  useEffect(() => {
    if (!visible) return;
    const planets = system.planets;
    let current = 0;
    const reveal = () => {
      if (current >= planets.length) return;
      const planet = planets[current];
      const hab = planet.habitability.overall;
      if (hab >= 0.70) {
        playHabitableBeep();
      } else {
        playBeep(660, 0.05, 0.06);
      }
      setRevealedCount(c => c + 1);
      current++;
      if (current < planets.length) {
        setTimeout(reveal, 200);
      }
    };
    // Start revealing planets after header animations settle
    const t = setTimeout(reveal, 900);
    return () => clearTimeout(t);
  }, [visible, system.planets]);

  const exit = useCallback((cb: () => void) => {
    setExiting(true);
    setTimeout(cb, 350);
  }, []);

  const planets = system.planets;
  const hasHabitable = planets.some(p => p.habitability.overall >= 0.70);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9700,
          background: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(4px)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onClick={() => exit(onClose)}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 9701,
          width: 360, maxWidth: '92vw',
          transform: visible && !exiting
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.88)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #334455',
          borderRadius: 4,
          padding: 24,
          fontFamily: 'monospace',
          color: '#aabbcc',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Subtitle ── */}
        <div style={{
          fontSize: 10, color: '#4488aa', letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 6,
          animation: 'rcm-pulse 2s ease-in-out infinite',
        }}>
          {hasHabitable ? '⚠ Телеметрія отримана — виявлено придатну планету' : 'Телеметрія отримана'}
        </div>

        {/* ── System name ── */}
        <div style={{ fontSize: 18, color: '#ccddee', marginBottom: 16, letterSpacing: '0.05em' }}>
          {systemNameDisplay || `СИСТЕМА  ${system.name.toUpperCase()}`}
        </div>

        <Divider />

        {/* ── Data grid ── */}
        <div style={{ marginBottom: 4 }}>
          <DataRow
            label="Тип зорі"
            value={starClassDisplay || `${system.star.spectralClass}${system.star.subType}V`}
            valueColor={system.star.colorHex}
          />
          <DataRow
            label="Виявлено тіл"
            value={String(planets.length)}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* ── Planet list ── */}
        <div style={{ fontSize: 10, color: '#667788', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.15em' }}>
          Виявлені планети:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {planets.map((planet, idx) => {
            const hab    = planet.habitability.overall;
            const habPct = Math.round(hab * 100);
            const isHab  = hab >= 0.70;
            const shown  = idx < revealedCount;

            return (
              <div
                key={planet.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', borderRadius: 3,
                  background: isHab ? 'rgba(68,255,136,0.07)' : 'rgba(255,255,255,0.02)',
                  border: isHab ? '1px solid rgba(68,255,136,0.2)' : '1px solid transparent',
                  opacity: shown ? 1 : 0,
                  transform: shown ? 'translateX(0)' : 'translateX(-12px)',
                  transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {/* Left: dot + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Size/color dot */}
                  <div style={{
                    width: getPlanetDotSize(planet.radiusEarth),
                    height: getPlanetDotSize(planet.radiusEarth),
                    borderRadius: '50%',
                    background: getPlanetDotColor(planet.type),
                    border: '1px solid rgba(150,160,180,0.3)',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12,
                    color: isHab ? '#44ff88' : '#aabbcc',
                    fontWeight: isHab ? 'bold' : 'normal',
                  }}>
                    {isHab ? '[!] ПРИДАТНА' : getPlanetTypeLabel(planet.type)}
                  </span>
                </div>

                {/* Right: habitability */}
                <span style={{
                  fontSize: 11, color: getHabColor(hab),
                  animation: isHab ? 'rcm-pulse 1.8s ease-in-out infinite' : 'none',
                }}>
                  Hab: {habPct}%
                </span>
              </div>
            );
          })}
        </div>

        <Divider style={{ marginTop: 16 }} />

        {/* ── Buttons ── */}
        <button
          style={{
            marginTop: 16, width: '100%', padding: '9px 0', cursor: 'pointer',
            background: 'rgba(30,60,80,0.6)', border: '1px solid #446688',
            color: '#aaccee', fontFamily: 'monospace', fontSize: 12, borderRadius: 3,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(40,80,120,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(30,60,80,0.6)'; }}
          onClick={() => exit(onViewSystem)}
        >
          ОГЛЯНУТИ СИСТЕМУ
        </button>

        <button
          style={{
            marginTop: 10, width: '100%', padding: '6px 0', cursor: 'pointer',
            background: 'none', border: 'none',
            color: '#667788', fontFamily: 'monospace', fontSize: 11,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#aabbcc'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#667788'; }}
          onClick={() => exit(onClose)}
        >
          Закрити
        </button>
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes rcm-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DataRow({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0', fontSize: 12,
    }}>
      <span style={{ color: '#667788' }}>{label}</span>
      <span style={{ color: valueColor ?? '#aabbcc' }}>{value}</span>
    </div>
  );
}

function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      height: 1,
      background: 'rgba(50,60,80,0.4)',
      marginBottom: 16,
      ...style,
    }} />
  );
}
