import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

function planetTypeName(type: PlanetType, t: (k: string) => string): string {
  switch (type) {
    case 'rocky':       return t('system.type_rocky');
    case 'terrestrial': return t('system.type_terrestrial');
    case 'gas-giant':   return t('system.type_gas_giant');
    case 'ice-giant':   return t('system.type_ice_giant');
    case 'dwarf':       return t('system.type_dwarf');
    default:            return type;
  }
}

function moonCompositionName(c: string, t: (k: string) => string): string {
  switch (c) {
    case 'rocky':    return t('system.moon_rocky');
    case 'icy':      return t('system.moon_icy');
    case 'metallic': return t('system.moon_metallic');
    case 'volcanic': return t('system.moon_volcanic');
    default:         return c;
  }
}

function habitabilityColor(score: number): string {
  if (score >= 0.70) return '#44ff88';
  if (score >= 0.45) return '#aacc44';
  if (score >= 0.25) return '#cc9944';
  return '#cc5544';
}

function habitabilityLabel(p: Planet, t: (k: string) => string): string {
  if (p.hasLife) {
    const life = p.lifeComplexity;
    if (life === 'intelligent') return t('system.life_intelligent');
    if (life === 'multicellular') return t('system.life_complex');
    return t('system.life_microbial');
  }
  const s = p.habitability.overall;
  if (s >= 0.70) return t('system.hab_suitable');
  if (s >= 0.45) return t('system.hab_potential');
  if (s >= 0.15) return t('system.hab_low');
  return t('system.hab_dead');
}

// ─── Habitability bar ─────────────────────────────────────────────────────────

function HabitBar({ score, delay, color }: { score: number; delay: number; color: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 3,
        background: 'rgba(60,80,100,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 1,
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

// ─── Grid columns ────────────────────────────────────────────────────────────

const MOBILE_COLS = '1fr 56px 52px 54px 28px';
const DESKTOP_COLS = '22px 1fr 72px 56px 80px 1fr 36px';

// ─── Moon row ─────────────────────────────────────────────────────────────────

function MoonRow({ moon, moonIdx, isMobile, t }: { moon: Moon; moonIdx: number; isMobile: boolean; t: (k: string) => string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 60 + moonIdx * 80);
    return () => clearTimeout(t);
  }, [moonIdx]);

  if (isMobile) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: MOBILE_COLS,
          gap: 2,
          padding: '3px 6px 3px 20px',
          opacity: on ? 1 : 0,
          transition: 'opacity 0.22s ease-out',
          fontSize: 9,
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#667788', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#2a3d52', fontSize: 8 }}>↳</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: getMoonColor(moon), flexShrink: 0 }} />
          {moon.name}
        </span>
        <span style={{ color: '#445566' }}>{moonCompositionName(moon.compositionType, t)}</span>
        <span />
        <span />
        <span />
      </div>
    );
  }

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
      <span style={{ color: '#2a3d52', flexShrink: 0, fontSize: 9 }}>↳</span>
      <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: getMoonColor(moon), boxShadow: `0 0 3px ${getMoonColor(moon)}77` }} />
      </span>
      <span style={{ color: '#667788', minWidth: 88, fontSize: 10 }}>{moon.name}</span>
      <span style={{ color: '#445566', minWidth: 70, fontSize: 9 }}>{moonCompositionName(moon.compositionType, t)}</span>
      <span style={{ color: '#3a5066', fontSize: 9 }}>{moon.orbitalRadiusKm.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} km</span>
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
  isDestroyed?: boolean;
  isMobile: boolean;
  t: (k: string) => string;
}

function PlanetRow({ planet, baseDelay, isExpanded, onToggle, onEnterPlanet, isDestroyed, isMobile, t }: PlanetRowProps) {
  const color = isDestroyed ? '#884422' : getPlanetColor(planet);
  const hScore = planet.habitability.overall;
  const hColor = isDestroyed ? '#553322' : habitabilityColor(hScore);
  const hasMoons = planet.moons.length > 0;
  const isHome = planet.isHomePlanet;
  const [nameHovered, setNameHovered] = useState(false);

  if (isMobile) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: MOBILE_COLS,
          gap: 2,
          padding: '6px 6px',
          alignItems: 'center',
          borderBottom: '1px solid rgba(51, 68, 85, 0.1)',
          fontFamily: 'monospace',
          fontSize: 10,
          animation: `sopRow 0.32s ease-out ${baseDelay}ms both`,
          opacity: isDestroyed ? 0.6 : 1,
        }}
      >
        {/* Name + dot */}
        <span
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: isDestroyed ? '#553322' : (nameHovered ? '#7bb8ff' : (isHome ? '#44ff88' : '#aabbcc')),
            cursor: isDestroyed ? 'default' : 'pointer', transition: 'color 0.15s',
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}
          onClick={isDestroyed ? undefined : (e) => { e.stopPropagation(); onEnterPlanet(); }}
          onMouseEnter={isDestroyed ? undefined : () => setNameHovered(true)}
          onMouseLeave={isDestroyed ? undefined : () => setNameHovered(false)}
        >
          {isDestroyed ? (
            <span style={{ width: 10, height: 10, position: 'relative', flexShrink: 0 }}>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#884422', position: 'absolute', top: 0, left: 2 }} />
              <span style={{ width: 2, height: 2, borderRadius: '50%', background: '#663311', position: 'absolute', top: 4, left: 6 }} />
              <span style={{ width: 2, height: 2, borderRadius: '30%', background: '#774422', position: 'absolute', top: 7, left: 1 }} />
            </span>
          ) : (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: isHome ? '0 0 0 2px rgba(68,255,136,0.5)' : undefined }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{planet.name}</span>
          {isDestroyed && <span style={{ color: '#884422', fontSize: 7 }}>x</span>}
          {isHome && !isDestroyed && <span style={{ color: '#44ff88', fontSize: 7 }}>H</span>}
        </span>

        {/* Type */}
        <span style={{ color: isDestroyed ? '#443322' : '#556677', fontSize: 9 }}>{isDestroyed ? t('system.debris') : planetTypeName(planet.type, t)}</span>

        {/* Orbit */}
        <span style={{ color: isDestroyed ? '#443322' : '#4477aa', fontSize: 9 }}>{planet.orbit.semiMajorAxisAU.toFixed(2)}</span>

        {/* Habitability */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isDestroyed ? (
            <span style={{ color: '#553322', fontSize: 9 }}>--</span>
          ) : (
            <>
              <span style={{ color: hColor, fontSize: 9 }}>{habitabilityLabel(planet, t)}</span>
              <HabitBar score={hScore} delay={baseDelay + 280} color={hColor} />
            </>
          )}
        </div>

        {/* Moons toggle */}
        <span
          style={{ color: '#4477aa', fontSize: 9, cursor: hasMoons && !isDestroyed ? 'pointer' : 'default', textAlign: 'center' }}
          onClick={hasMoons && !isDestroyed ? (e) => { e.stopPropagation(); onToggle(); } : undefined}
        >
          {hasMoons && !isDestroyed ? `${planet.moons.length}${isExpanded ? '▾' : '▸'}` : ''}
        </span>
      </div>
    );
  }

  // Desktop layout (flex)
  const d = (extra: number) => `sopCell 0.22s ease-out ${baseDelay + extra}ms both`;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 14px',
        background: hovered && !isDestroyed ? 'rgba(30,48,70,0.22)' : 'transparent',
        transition: 'background 0.15s',
        borderRadius: 3,
        animation: `sopRow 0.32s ease-out ${baseDelay}ms both`,
        gap: 6,
        opacity: isDestroyed ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        {isDestroyed ? (
          <>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#884422', position: 'relative', left: -3, top: -1 }} />
            <span style={{ width: 2, height: 2, borderRadius: '50%', background: '#663311', position: 'relative', left: 1, top: 2 }} />
            <span style={{ width: 3, height: 2, borderRadius: '30%', background: '#774422', position: 'relative', left: -5, top: 4 }} />
          </>
        ) : (
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}66`, animation: `sopCell 0.2s ease-out ${baseDelay}ms both` }} />
        )}
      </span>
      <span
        style={{
          color: isDestroyed ? '#553322' : (nameHovered ? '#7bb8ff' : (isHome ? '#44ff88' : '#aabbcc')),
          fontSize: 11, minWidth: 90, gap: 4, display: 'flex', alignItems: 'center', animation: d(55),
          cursor: isDestroyed ? 'default' : 'pointer', transition: 'color 0.15s',
        }}
        onClick={isDestroyed ? undefined : (e) => { e.stopPropagation(); onEnterPlanet(); }}
        onMouseEnter={isDestroyed ? undefined : () => setNameHovered(true)}
        onMouseLeave={isDestroyed ? undefined : () => setNameHovered(false)}
      >
        {planet.name}
        {isDestroyed && <span style={{ color: '#884422', fontSize: 7, opacity: 0.8 }}>{t('system.destroyed_label')}</span>}
        {isHome && !isDestroyed && <span style={{ color: '#44ff88', fontSize: 7, opacity: 0.8 }}>HOME</span>}
      </span>
      <span style={{ color: isDestroyed ? '#443322' : '#556677', fontSize: 9, minWidth: 72, animation: d(110) }}>{isDestroyed ? t('system.debris') : planetTypeName(planet.type, t)}</span>
      <span style={{ color: isDestroyed ? '#443322' : '#4477aa', fontSize: 9, minWidth: 54, animation: d(160) }}>{planet.orbit.semiMajorAxisAU.toFixed(2)} AU</span>
      <div style={{ flexDirection: 'column', alignItems: 'flex-start', display: 'flex', minWidth: 70, animation: d(215) }}>
        {isDestroyed ? (
          <span style={{ color: '#553322', fontSize: 9 }}>--</span>
        ) : (
          <>
            <span style={{ color: hColor, fontSize: 9 }}>{habitabilityLabel(planet, t)}</span>
            <HabitBar score={hScore} delay={baseDelay + 280} color={hColor} />
          </>
        )}
      </div>
      <span style={{ flex: 1 }} />
      {hasMoons && !isDestroyed ? (
        <span
          style={{ color: '#4477aa', fontSize: 9, cursor: 'pointer', padding: '2px 4px', borderRadius: 2, animation: d(260), display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
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

function StarRow({ star, isMobile }: { star: StarSystem['star']; isMobile: boolean }) {
  const spectralLabel = `${star.spectralClass}${star.subType}V`;
  const tempStr = star.temperatureK.toLocaleString('uk-UA', { maximumFractionDigits: 0 });
  const massStr = star.massSolar.toFixed(2);

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 6px',
          borderBottom: '1px solid rgba(40,55,75,0.5)',
          animation: 'sopStar 0.35s ease-out 0.45s both',
          gap: 6,
          fontSize: 11,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: star.colorHex, boxShadow: `0 0 8px ${star.colorHex}99`, flexShrink: 0 }} />
        <span style={{ color: '#ddeeff' }}>{star.name}</span>
        <span style={{ color: star.colorHex, fontSize: 10 }}>{spectralLabel}</span>
        <span style={{ color: '#446688', fontSize: 9 }}>{tempStr} K</span>
        <span style={{ color: '#3a5566', fontSize: 9 }}>{massStr} M☉</span>
      </div>
    );
  }

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
      <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 13, height: 13, borderRadius: '50%', background: star.colorHex, boxShadow: `0 0 10px ${star.colorHex}99, 0 0 20px ${star.colorHex}44` }} />
      </span>
      <span style={{ color: '#ddeeff', fontSize: 12, minWidth: 90 }}>{star.name}</span>
      <span style={{ color: star.colorHex, fontSize: 10, minWidth: 38, opacity: 0.9 }}>{spectralLabel}</span>
      <span style={{ color: '#446688', fontSize: 9, minWidth: 64 }}>{tempStr} K</span>
      <span style={{ color: '#3a5566', fontSize: 9 }}>{massStr} M☉</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface SystemObjectsPanelProps {
  system: StarSystem;
  displayName?: string;
  onClose: () => void;
  onViewPlanet: (planetIndex: number) => void;
  destroyedPlanetIds?: Set<string>;
}

export function SystemObjectsPanel({
  system,
  displayName,
  onClose,
  onViewPlanet,
  destroyedPlanetIds,
}: SystemObjectsPanelProps) {
  ensureStyles();
  const { t } = useTranslation();

  const [expandedPlanets, setExpandedPlanets] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleExpand = (id: string) =>
    setExpandedPlanets((prev) => ({ ...prev, [id]: !prev[id] }));

  const sortedPlanets = [...system.planets].sort(
    (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
  );

  const systemName = displayName ?? system.name;
  const planetsCount = sortedPlanets.length;
  const moonsCount = sortedPlanets.reduce((sum, p) => sum + p.moons.length, 0);

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
          top: isMobile ? 36 : 40,
          right: 0,
          bottom: 0,
          width: isMobile ? '100%' : 490,
          background: 'rgba(5, 9, 18, 0.97)',
          borderLeft: isMobile ? 'none' : '1px solid #334455',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          zIndex: 30,
          animation: 'sopPanel 0.28s ease-out both',
          boxShadow: isMobile ? 'none' : '-6px 0 30px rgba(0,0,0,0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: isMobile ? '8px 8px 6px' : '12px 14px 10px',
            borderBottom: '1px solid #334455',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
            animation: 'sopRow 0.3s ease-out 0.2s both',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 9, color: '#445566', letterSpacing: '0.04em' }}>
              {planetsCount} {t('system.planets_count', { count: planetsCount })}
              &nbsp;·&nbsp; {moonsCount} {t('system.moons_count', { count: moonsCount })}
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
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              lineHeight: 1,
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
          <StarRow star={system.star} isMobile={isMobile} />

          {/* Column headers */}
          {isMobile ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: MOBILE_COLS,
                gap: 2,
                padding: '4px 6px',
                fontSize: 8,
                color: '#2d404f',
                letterSpacing: '0.08em',
                borderBottom: '1px solid rgba(30,42,60,0.5)',
                animation: 'sopCell 0.25s ease-out 0.58s both',
                textTransform: 'uppercase',
              }}
            >
              <span>{t('system.col_object')}</span>
              <span>{t('system.col_type')}</span>
              <span>AU</span>
              <span>{t('system.col_status')}</span>
              <span />
            </div>
          ) : (
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
              <span style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }} />
              <span style={{ minWidth: 90 }}>{t('system.col_object')}</span>
              <span style={{ minWidth: 72 }}>{t('system.col_type')}</span>
              <span style={{ minWidth: 54 }}>{t('system.col_orbit')}</span>
              <span style={{ minWidth: 70 }}>{t('system.col_habitability')}</span>
              <span style={{ flex: 1 }} />
              <span style={{ flexShrink: 0, paddingRight: 4 }}>{t('system.col_moons_short')}</span>
            </div>
          )}

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
                  onEnterPlanet={() => onViewPlanet(pi)}
                  isDestroyed={destroyedPlanetIds?.has(planet.id)}
                  isMobile={isMobile}
                  t={t}
                />

                {expanded && (
                  <div>
                    {planet.moons.map((moon, mi) => (
                      <MoonRow key={moon.id} moon={moon} moonIdx={mi} isMobile={isMobile} t={t} />
                    ))}
                    {planet.moons.length === 0 && (
                      <div style={{ padding: '3px 14px 4px 34px', fontSize: 9, color: '#334455' }}>
                        {t('system.no_moons')}
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
