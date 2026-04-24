import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, StarSystem } from '@nebulife/core';

// ---------------------------------------------------------------------------
// ColonyFoundingPrompt — shown when ship arrives at destination planet.
//
// Background is a lightweight procedural SVG "system-with-planets" view
// instead of the heavy PlanetGlobeView exosphere. Tester report: "все висне
// від екзосфери" — the 3D scene mounted behind this modal was still eating
// the GPU budget even under a 92%-opaque overlay. This SVG version draws a
// central star + concentric orbits + planet dots, ~8 circles total, zero
// per-frame cost after mount.
// ---------------------------------------------------------------------------

interface ColonyFoundingPromptProps {
  planet: Planet;
  system?: StarSystem | null;
  onFoundColony: () => void;
}

function SystemPreviewBackground({ system, targetPlanet }: { system?: StarSystem | null; targetPlanet: Planet }) {
  // If the caller didn't pass a system, fall back to a single-planet ring
  // so the preview never renders empty.
  const planets = system?.planets ?? [targetPlanet];
  const starColorMap: Record<string, string> = {
    O: '#9bb0ff', B: '#aabbff', A: '#cad7ff', F: '#f8f7ff',
    G: '#fff4e8', K: '#ffd2a1', M: '#ffb0a0',
  };
  const starColor = starColorMap[system?.star?.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';

  // Evenly-spaced orbit radii within the preview box. Capped at 8 planets
  // so packed systems don't turn the background into a noisy ring-cake.
  const visiblePlanets = planets.slice(0, 8);
  const maxOrbit = 220;
  const minOrbit = 50;
  const step = visiblePlanets.length > 1
    ? (maxOrbit - minOrbit) / (visiblePlanets.length - 1)
    : 0;

  return (
    <svg
      viewBox="-260 -260 520 520"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    >
      {/* Starfield — static dots, 40 points, deterministic so they don't
          reshuffle on every re-render. */}
      {Array.from({ length: 40 }, (_, i) => {
        const x = ((i * 73) % 520) - 260;
        const y = ((i * 131) % 520) - 260;
        const r = 0.6 + (i % 3) * 0.3;
        const a = 0.35 + ((i * 17) % 10) / 25;
        return <circle key={`s${i}`} cx={x} cy={y} r={r} fill="#aabbcc" opacity={a} />;
      })}
      {/* Orbit rings */}
      {visiblePlanets.map((_, i) => {
        const r = minOrbit + step * i;
        return (
          <circle
            key={`o${i}`}
            cx="0" cy="0" r={r}
            fill="none" stroke="rgba(123,184,255,0.18)" strokeWidth="0.7" strokeDasharray="3 4"
          />
        );
      })}
      {/* Star */}
      <circle cx="0" cy="0" r="16" fill={starColor} opacity="0.95" />
      <circle cx="0" cy="0" r="28" fill={starColor} opacity="0.22" />
      {/* Planet dots — target planet gets a green ring so the player sees
          which world they're about to colonize. */}
      {visiblePlanets.map((p, i) => {
        const angle = (i * 0.7 + 1.3) % (Math.PI * 2);
        const r = minOrbit + step * i;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const isTarget = p.id === targetPlanet.id;
        const size = isTarget ? 5.5 : 3.2;
        return (
          <g key={`p${i}`}>
            <circle cx={x} cy={y} r={size} fill="#7bb8ff" opacity={isTarget ? 1 : 0.7} />
            {isTarget && (
              <circle
                cx={x} cy={y} r={size + 4}
                fill="none" stroke="#44ff88" strokeWidth="1.2"
                opacity="0.9"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function ColonyFoundingPrompt({ planet, system, onFoundColony }: ColonyFoundingPromptProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: '#020510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Lightweight star-system preview behind the modal card. */}
      <SystemPreviewBackground system={system} targetPlanet={planet} />
      {/* Vignette so the modal card always reads cleanly regardless of
          where the target planet lands in the preview. */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(2,5,16,0.45) 30%, rgba(2,5,16,0.92) 80%)',
        }}
      />
      <div
        style={{
          width: 400,
          maxWidth: '92vw',
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #4488aa',
          borderRadius: 6,
          padding: 28,
          textAlign: 'center',
        }}
      >
        {/* Status header */}
        <div
          style={{
            fontSize: 10,
            color: '#4488aa',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {t('colony.nav_system_header')}
        </div>
        <div
          style={{
            fontSize: 16,
            color: '#ccddee',
            fontWeight: 'bold',
            marginBottom: 8,
          }}
        >
          {t('colony.orbital_position_reached')}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#667788',
            marginBottom: 24,
            lineHeight: '1.5',
          }}
        >
          {t('colony.ship_in_orbit', { planet: planet.name })}
        </div>

        {/* Planet quick stats */}
        <div
          style={{
            background: 'rgba(20,30,50,0.4)',
            border: '1px solid rgba(68,136,170,0.2)',
            borderRadius: 4,
            padding: 12,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: '#556677', marginBottom: 3 }}>{t('colony.label_habitability')}</div>
            <div style={{ fontSize: 14, color: '#44ff88', fontWeight: 'bold' }}>
              {Math.round(planet.habitability.overall * 100)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#556677', marginBottom: 3 }}>{t('colony.label_type')}</div>
            <div style={{ fontSize: 12, color: '#aabbcc' }}>{planet.type}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#556677', marginBottom: 3 }}>{t('colony.label_temperature')}</div>
            <div style={{ fontSize: 12, color: '#aabbcc' }}>
              {Math.round(planet.surfaceTempK)} K
              <span style={{ fontSize: 10, color: '#778899', marginLeft: 4 }}>
                ({Math.round(planet.surfaceTempK - 273.15)}&deg;C)
              </span>
            </div>
          </div>
        </div>

        {/* Found colony button */}
        <button
          onClick={onFoundColony}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: '100%',
            padding: '14px 0',
            minHeight: 44,
            background: hover ? 'rgba(68,255,136,0.15)' : 'rgba(68,255,136,0.08)',
            border: '2px solid #44ff88',
            borderRadius: 4,
            color: '#44ff88',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s',
          }}
        >
          {t('colony.found_colony_btn')}
        </button>
      </div>
    </div>
  );
}
