import React, { useState, useEffect } from 'react';
import type { StarSystem, Planet, Moon, PlanetType } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SystemObjectsPanel — animated list of star / planets / moons
// ---------------------------------------------------------------------------

// ─── Style injection ─────────────────────────────────────────────────────────

const STYLE_ID = 'sys-obj-panel-styles';

const KEYFRAMES = `
  @keyframes sopPanel {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes sopRow {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes sopCell {
    from { opacity: 0; transform: translateX(6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes sopStar {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sopBarFill {
    from { width: 0%; }
    to   { width: 100%; }
  }
`;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function getPlanetColor(p: Planet): string {
  if (p.type === 'gas-giant') return p.surfaceTempK > 500 ? '#cc7733' : '#aa9966';
  if (p.type === 'ice-giant') return '#4488bb';
  if (p.type === 'dwarf') return '#667788';
  if (p.surfaceTempK > 900) return '#cc3322';
  if (p.surfaceTempK > 450) return '#bb6633';
  if (p.surfaceTempK > 273 && p.hasLife) return '#44aa66';
  if (p.surfaceTempK > 240) return '#778899';
  return '#8899bb';
}

function getMoonColor(m: Moon): string {
  switch (m.compositionType) {
    case 'rocky':    return '#997755';
    case 'icy':      return '#99ccee';
    case 'metallic': return '#aabbbb';
    case 'volcanic': return '#cc6633';
    default:         return '#667788';
  }
}

function planetTypeName(t: PlanetType): string {
  switch (t) {
    case 'rocky':     return 'скелясте';
    case 'gas-giant': return 'газ. гігант';
    case 'ice-giant': return 'крижаний';
    case 'dwarf':     return 'карлик';
  }
}

function moonCompositionName(c: string): string {
  switch (c) {
    case 'rocky':    return 'скелястий';
    case 'icy':      return 'крижаний';
    case 'metallic': return 'металевий';
    case 'volcanic': return 'вулканічний';
    default:         return c;
  }
}

function habitabilityColor(score: number): string {
  if (score >= 0.70) return '#44ff88';
  if (score >= 0.45) return '#aacc44';
  if (score >= 0.25) return '#cc9944';
  return '#cc5544';
}

function habitabilityLabel(p: Planet): string {
  if (p.hasLife) {
    const life = p.lifeComplexity;
    if (life === 'intelligent') return '★ розумне';
    if (life === 'multicellular') return '★ складне';
    return '· мікробне';
  }
  const s = p.habitability.overall;
  if (s >= 0.70) return '✓ придатна';
  if (s >= 0.45) return '~ потенц.';
  if (s >= 0.15) return '∅ мало';
  return '✗ мертва';
}

// ─── Moon row ─────────────────────────────────────────────────────────────────

function MoonRow({ moon, moonIdx }: { moon: Moon; moonIdx: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60 + moonIdx * 80);
    return () => clearTimeout(t);
  }, [moonIdx]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 14px 4px 34px',
        opacity: on ? 1 : 0,
        transform: on ? 'none' : 'translateX(-6px)',
        transition: 'opacity 0.22s ease-out, transform 0.22s ease-out',
        fontSize: 10,
        gap: 6,
      }}
    >
      {/* Arrow indent */}
      <span style={{ color: '#2a3d52', flexShrink: 0, fontSize: 9 }}>↳</span>

      {/* Color dot */}
      <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: getMoonColor(moon),
            boxShadow: `0 0 3px ${getMoonColor(moon)}77`,
          }}
        />
      </span>

      {/* Name */}
      <span style={{ color: '#667788', minWidth: 88, fontSize: 10 }}>
        {moon.name}
      </span>

      {/* Composition */}
      <span style={{ color: '#445566', minWidth: 70, fontSize: 9 }}>
        {moonCompositionName(moon.compositionType)}
      </span>

      {/* Orbit */}
      <span style={{ color: '#3a5066', fontSize: 9 }}>
        {moon.orbitalRadiusKm.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} km
      </span>
    </div>
  );
}

// ─── Habitability bar ─────────────────────────────────────────────────────────

function HabitBar({ score, delay, color }: { score: number; delay: number; color: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 3,
        background: 'rgba(60,80,100,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 2,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.round(score * 100)}%`,
          background: color,
          borderRadius: 2,
          animation: `sopBarFill 0.5s ease-out ${delay}ms both`,
        }}
      />
    </div>
  );
}

// ─── Planet row ───────────────────────────────────────────────────────────────

interface PlanetRowProps {
  planet: Planet;
  baseDelay: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEnterPlanet: () => void;
}

function PlanetRow({ planet, baseDelay, isExpanded, onToggle, onEnterPlanet }: PlanetRowProps) {
  const color = getPlanetColor(planet);
  const hScore = planet.habitability.overall;
  const hColor = habitabilityColor(hScore);
  const hasMoons = planet.moons.length > 0;
  const isHome = planet.isHomePlanet;

  const d = (extra: number) => `sopCell 0.22s ease-out ${baseDelay + extra}ms both`;
  const [hovered, setHovered] = useState(false);
  const [nameHovered, setNameHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 14px',
        background: hovered ? 'rgba(30,48,70,0.22)' : 'transparent',
        transition: 'background 0.15s',
        borderRadius: 3,
        animation: `sopRow 0.32s ease-out ${baseDelay}ms both`,
        gap: 6,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color dot */}
      <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: color,
            boxShadow: `0 0 5px ${color}66`,
            animation: `sopCell 0.2s ease-out ${baseDelay}ms both`,
          }}
        />
      </span>

      {/* Clickable name — navigates to planet-view */}
      <span
        style={{
          color: nameHovered ? '#7bb8ff' : (isHome ? '#44ff88' : '#aabbcc'),
          fontSize: 11,
          minWidth: 90,
          gap: 4,
          display: 'flex',
          alignItems: 'center',
          animation: d(55),
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        onClick={(e) => { e.stopPropagation(); onEnterPlanet(); }}
        onMouseEnter={() => setNameHovered(true)}
        onMouseLeave={() => setNameHovered(false)}
      >
        {planet.name}
        {isHome && (
          <span style={{ color: '#44ff88', fontSize: 7, opacity: 0.8 }}>HOME</span>
        )}
      </span>

      {/* Type */}
      <span
        style={{
          color: '#556677',
          fontSize: 9,
          minWidth: 72,
          animation: d(110),
        }}
      >
        {planetTypeName(planet.type)}
      </span>

      {/* Orbit */}
      <span
        style={{
          color: '#4477aa',
          fontSize: 9,
          minWidth: 54,
          animation: d(160),
        }}
      >
        {planet.orbit.semiMajorAxisAU.toFixed(2)} AU
      </span>

      {/* Habitability */}
      <div
        style={{
          flexDirection: 'column',
          alignItems: 'flex-start',
          display: 'flex',
          minWidth: 70,
          animation: d(215),
        }}
      >
        <span style={{ color: hColor, fontSize: 9 }}>{habitabilityLabel(planet)}</span>
        <HabitBar score={hScore} delay={baseDelay + 280} color={hColor} />
      </div>

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Moon toggle — right side */}
      {hasMoons ? (
        <span
          style={{
            color: '#4477aa',
            fontSize: 9,
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: 2,
            animation: d(260),
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexShrink: 0,
          }}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {planet.moons.length}
          <span style={{ fontSize: 7 }}>{isExpanded ? '▾' : '▸'}</span>
        </span>
      ) : null}
    </div>
  );
}

// ─── Star row ─────────────────────────────────────────────────────────────────

function StarRow({ star }: { star: StarSystem['star'] }) {
  const spectralLabel = `${star.spectralClass}${star.subType}V`;
  const tempStr = star.temperatureK.toLocaleString('uk-UA', { maximumFractionDigits: 0 });
  const massStr = star.massSolar.toFixed(2);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(40,55,75,0.5)',
        animation: 'sopStar 0.35s ease-out 0.45s both',
        gap: 6,
      }}
    >
      {/* Star dot */}
      <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span
          style={{
            width: 13, height: 13, borderRadius: '50%',
            background: star.colorHex,
            boxShadow: `0 0 10px ${star.colorHex}99, 0 0 20px ${star.colorHex}44`,
          }}
        />
      </span>

      {/* Name */}
      <span style={{ color: '#ddeeff', fontSize: 12, minWidth: 90 }}>
        {star.name}
      </span>

      {/* Spectral class */}
      <span style={{ color: star.colorHex, fontSize: 10, minWidth: 38, opacity: 0.9 }}>
        {spectralLabel}
      </span>

      {/* Temp */}
      <span style={{ color: '#446688', fontSize: 9, minWidth: 64 }}>
        {tempStr} K
      </span>

      {/* Mass */}
      <span style={{ color: '#3a5566', fontSize: 9 }}>
        {massStr} M☉
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface SystemObjectsPanelProps {
  system: StarSystem;
  displayName?: string;
  onClose: () => void;
  onViewPlanet: (planetIndex: number) => void; // opens PlanetDetailWindow
  onEnterPlanet?: (planet: Planet) => void; // navigate to planet-view (exosphere)
  allSystems?: StarSystem[];
  onNavigateSystem?: (system: StarSystem) => void;
}

export function SystemObjectsPanel({
  system,
  displayName,
  onClose,
  onViewPlanet,
  onEnterPlanet,
  allSystems,
  onNavigateSystem,
}: SystemObjectsPanelProps) {
  ensureStyles();

  const [expandedPlanets, setExpandedPlanets] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) =>
    setExpandedPlanets((prev) => ({ ...prev, [id]: !prev[id] }));

  const sortedPlanets = [...system.planets].sort(
    (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
  );

  const systemName = displayName ?? system.name;
  const planetsCount = sortedPlanets.length;
  const moonsCount = sortedPlanets.reduce((sum, p) => sum + p.moons.length, 0);

  // System navigation
  const canNavigate = allSystems && allSystems.length > 1 && onNavigateSystem;
  const currentIdx = allSystems ? allSystems.findIndex((s) => s.id === system.id) : -1;

  const goPrev = () => {
    if (!allSystems || !onNavigateSystem) return;
    const prevIdx = (currentIdx - 1 + allSystems.length) % allSystems.length;
    onNavigateSystem(allSystems[prevIdx]);
  };
  const goNext = () => {
    if (!allSystems || !onNavigateSystem) return;
    const nextIdx = (currentIdx + 1) % allSystems.length;
    onNavigateSystem(allSystems[nextIdx]);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 29,
          background: 'rgba(0, 4, 12, 0.45)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 490,
          background: 'rgba(5, 9, 18, 0.97)',
          borderLeft: '1px solid #334455',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          zIndex: 30,
          animation: 'sopPanel 0.28s ease-out both',
          boxShadow: '-6px 0 30px rgba(0,0,0,0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid #334455',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
            animation: 'sopRow 0.3s ease-out 0.2s both',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* System name with nav arrows */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {canNavigate && (
                <NavArrow direction="left" onClick={goPrev} />
              )}
              <span style={{ fontSize: 13, color: '#ccddee', letterSpacing: '0.06em' }}>
                {systemName.toUpperCase()}
              </span>
              {canNavigate && (
                <NavArrow direction="right" onClick={goNext} />
              )}
            </div>
            <div style={{ fontSize: 9, color: '#445566', marginTop: 3, letterSpacing: '0.04em' }}>
              ОБ'ЄКТИ СИСТЕМИ &nbsp;·&nbsp;
              {planetsCount} {planetsCount === 1 ? 'планета' : planetsCount < 5 ? 'планети' : 'планет'}
              &nbsp;·&nbsp; {moonsCount} супутників
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #334455',
              color: '#667788',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
              padding: '2px 7px',
              borderRadius: 3,
              lineHeight: 1,
              marginTop: 2,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#aabbcc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#667788'; }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 80 }}>
          {/* Star row */}
          <StarRow star={system.star} />

          {/* Column headers */}
          <div
            style={{
              display: 'flex',
              padding: '5px 14px 4px',
              fontSize: 8,
              color: '#2d404f',
              letterSpacing: '0.08em',
              borderBottom: '1px solid rgba(30,42,60,0.5)',
              animation: 'sopCell 0.25s ease-out 0.58s both',
              gap: 6,
            }}
          >
            {/* dot col header */}
            <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }} />
            {/* name */}
            <span style={{ minWidth: 90 }}>ОБ'ЄКТ</span>
            {/* type */}
            <span style={{ minWidth: 72 }}>ТИП</span>
            {/* orbit */}
            <span style={{ minWidth: 54 }}>ОРБІТА</span>
            {/* habitability */}
            <span style={{ minWidth: 70 }}>ПРИДАТНІСТЬ</span>
            {/* spacer */}
            <span style={{ flex: 1 }} />
            {/* moons */}
            <span style={{ flexShrink: 0, paddingRight: 4 }}>СУП</span>
          </div>

          {/* Planet rows */}
          {sortedPlanets.map((planet, pi) => {
            const baseDelay = 640 + pi * 140;
            const expanded = !!expandedPlanets[planet.id];

            return (
              <React.Fragment key={planet.id}>
                <PlanetRow
                  planet={planet}
                  baseDelay={baseDelay}
                  isExpanded={expanded}
                  onToggle={() => toggleExpand(planet.id)}
                  onEnterPlanet={() => onEnterPlanet?.(planet)}
                />

                {/* Moon rows (appear when expanded) */}
                {expanded && (
                  <div>
                    {planet.moons.map((moon, mi) => (
                      <MoonRow key={moon.id} moon={moon} moonIdx={mi} />
                    ))}
                    {planet.moons.length === 0 && (
                      <div style={{ padding: '3px 14px 4px 34px', fontSize: 9, color: '#334455' }}>
                        супутників немає
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Nav arrow button ─────────────────────────────────────────────────────────

function NavArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none',
        border: '1px solid',
        borderColor: hovered ? '#446688' : '#334455',
        color: hovered ? '#aabbcc' : '#556677',
        fontSize: 10,
        cursor: 'pointer',
        fontFamily: 'monospace',
        padding: '1px 5px',
        borderRadius: 3,
        lineHeight: 1,
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {direction === 'left' ? '◀' : '▶'}
    </button>
  );
}
