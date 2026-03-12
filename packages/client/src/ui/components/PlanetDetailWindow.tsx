import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Application, Container } from 'pixi.js';
import type { StarSystem, Planet } from '@nebulife/core';
import {
  renderPlanetCloseup,
  renderMoon,
} from '../../game/rendering/HomePlanetRenderer.js';

// ---------------------------------------------------------------------------
// PlanetDetailWindow — full-screen planet detail viewer
// ---------------------------------------------------------------------------
// Top-left quarter: animated PixiJS planet + moons at correct relative scale
// Right side: planet characteristics panel
// Top bar: system name + prev/next planet navigation
// ---------------------------------------------------------------------------

// ─── Style injection ─────────────────────────────────────────────────────────

const STYLE_ID = 'planet-detail-styles';
const KEYFRAMES = `
  @keyframes pdwIn {
    from { opacity: 0; transform: scale(0.98); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes pdwSlide {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlanetDisplayRadius(
  planet: Planet,
  allPlanets: Planet[],
  maxDisplayR: number,
  minDisplayR: number,
): number {
  const radii = allPlanets.map((p) => p.radiusEarth);
  const minR = Math.min(...radii);
  const maxR = Math.max(...radii);
  if (maxR === minR) return (maxDisplayR + minDisplayR) / 2;
  const t = (planet.radiusEarth - minR) / (maxR - minR);
  // Log scale for more visually fair comparison
  const logT = Math.log(1 + t * (Math.E - 1));
  return minDisplayR + logT * (maxDisplayR - minDisplayR);
}

function planetTypeName(t: Planet['type']): string {
  switch (t) {
    case 'rocky':     return 'Скелясте';
    case 'gas-giant': return 'Газовий гігант';
    case 'ice-giant': return 'Крижаний гігант';
    case 'dwarf':     return 'Карликова';
  }
}

function formatTemp(k: number): string {
  const c = Math.round(k - 273.15);
  return `${Math.round(k)}K  (${c > 0 ? '+' : ''}${c}°C)`;
}

function habitabilityPercent(h: number): string {
  return `${Math.round(h * 100)}%`;
}

function habitabilityColor(score: number): string {
  if (score >= 0.70) return '#44ff88';
  if (score >= 0.45) return '#aacc44';
  if (score >= 0.25) return '#cc9944';
  return '#cc5544';
}

// ─── Characteristic row ───────────────────────────────────────────────────────

function CharRow({
  label, value, color, delay = 0,
}: {
  label: string; value: string; color?: string; delay?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
        borderBottom: '1px solid rgba(40,55,75,0.35)',
        animation: `pdwSlide 0.3s ease-out ${delay}ms both`,
      }}
    >
      <span style={{ color: '#445566', fontSize: 11, fontFamily: 'monospace' }}>{label}</span>
      <span style={{ color: color ?? '#aabbcc', fontSize: 11, fontFamily: 'monospace', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function Section({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <div
      style={{
        color: '#33445599',
        fontSize: 8,
        letterSpacing: '0.12em',
        padding: '12px 0 4px',
        fontFamily: 'monospace',
        animation: `pdwSlide 0.3s ease-out ${delay}ms both`,
      }}
    >
      {label}
    </div>
  );
}

// ─── PixiJS Planet Canvas ─────────────────────────────────────────────────────

interface PlanetCanvasProps {
  planet: Planet;
  star: StarSystem['star'];
  displayRadius: number;
  canvasW: number;
  canvasH: number;
}

function PlanetCanvas({ planet, star, displayRadius, canvasW, canvasH }: PlanetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let viewAngle = 0;
    let time = 0;
    const cloudDrift = { x: 0 };

    const app = new Application();
    appRef.current = app;

    app.init({
      background: 0x020510,
      width: canvasW,
      height: canvasH,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    }).then(() => {
      if (destroyed) { app.destroy(true, { children: true, texture: true }); return; }
      containerRef.current?.appendChild(app.canvas);

      const sceneContainer = new Container();
      app.stage.addChild(sceneContainer);

      const cx = canvasW / 2;
      const cy = canvasH / 2;

      // Render planet
      const planetResult = renderPlanetCloseup(planet, star as never, displayRadius);
      planetResult.container.x = cx;
      planetResult.container.y = cy;
      sceneContainer.addChild(planetResult.container);

      // Render moons as small orbiting dots
      const moonNodes: Array<{
        container: Container;
        lightingContainer: Container;
        angle: number;
        orbitR: number;
        speed: number;
      }> = [];

      if (planet.moons.length > 0) {
        planet.moons.forEach((moon, i) => {
          const moonRadius = Math.max(3, Math.min(10, displayRadius * 0.08 + i * 1.5));
          const orbitR = displayRadius + 20 + i * (moonRadius * 2 + 8);
          const moonResult = renderMoon(moon.seed, moonRadius, {
            compositionType: moon.compositionType,
            surfaceTempK: moon.surfaceTempK,
          });
          moonResult.container.x = cx + orbitR;
          moonResult.container.y = cy;
          sceneContainer.addChild(moonResult.container);
          moonNodes.push({
            container: moonResult.container,
            lightingContainer: moonResult.lightingContainer,
            angle: (moon.seed % 360) * (Math.PI / 180),
            orbitR,
            speed: 0.0002 / (i + 1),
          });
        });
      }

      // Ticker
      let lastTime = performance.now();
      const tick = () => {
        if (destroyed) return;
        rafRef.current = requestAnimationFrame(tick);

        const now = performance.now();
        const deltaMs = now - lastTime;
        lastTime = now;
        time += deltaMs;

        // Slow cosmos rotation via planet offset illusion
        viewAngle += deltaMs * 0.00002;

        // Gentle cloud drift
        cloudDrift.x -= deltaMs * 0.0005;
        planetResult.cloudGroup.x = cloudDrift.x;

        // Moon orbits
        for (const mn of moonNodes) {
          mn.angle += mn.speed * deltaMs;
          mn.container.x = cx + Math.cos(mn.angle) * mn.orbitR;
          mn.container.y = cy + Math.sin(mn.angle) * mn.orbitR * 0.35; // Y-compress
          // Lighting: shadow faces away from origin (simplified)
          mn.lightingContainer.rotation = mn.angle + Math.PI;
          // Z-ordering by Y
          const depth = Math.sin(mn.angle);
          const planetIdx = sceneContainer.getChildIndex(planetResult.container);
          const moonIdx = sceneContainer.getChildIndex(mn.container);
          if (depth > 0 && moonIdx < planetIdx) {
            sceneContainer.setChildIndex(mn.container, planetIdx);
          } else if (depth <= 0 && moonIdx > planetIdx) {
            sceneContainer.setChildIndex(mn.container, Math.max(0, planetIdx));
          }
        }

        // Subtle terminator animation
        planetResult.terminatorGroup.rotation = Math.sin(time * 0.00005) * 0.015;
      };

      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      // Small delay to let PixiJS finish init before destroy
      setTimeout(() => { app.destroy(true, { children: true, texture: true }); }, 50);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet.id, displayRadius, canvasW, canvasH]);

  return (
    <div
      ref={containerRef}
      style={{
        width: canvasW,
        height: canvasH,
        overflow: 'hidden',
        borderRadius: 4,
        flexShrink: 0,
      }}
    />
  );
}

// ─── Nav arrow button ─────────────────────────────────────────────────────────

function NavBtn({
  label, onClick, disabled,
}: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: '1px solid ' + (disabled ? '#223344' : hover ? '#446688' : '#334455'),
        color: disabled ? '#223344' : hover ? '#aabbcc' : '#667788',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '4px 10px',
        borderRadius: 3,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface PlanetDetailWindowProps {
  system: StarSystem;
  systemDisplayName?: string;
  initialPlanetIndex: number; // index in sorted-by-orbit array
  onClose: () => void;
}

export function PlanetDetailWindow({
  system,
  systemDisplayName,
  initialPlanetIndex,
  onClose,
}: PlanetDetailWindowProps) {
  ensureStyles();

  const sortedPlanets = [...system.planets].sort(
    (a, b) => a.orbit.semiMajorAxisAU - b.orbit.semiMajorAxisAU,
  );

  const [planetIdx, setPlanetIdx] = useState(
    Math.max(0, Math.min(initialPlanetIndex, sortedPlanets.length - 1)),
  );
  const planet = sortedPlanets[planetIdx];

  // Canvas dimensions: top-left quarter
  const canvasW = Math.floor(window.innerWidth * 0.46);
  const canvasH = Math.floor(window.innerHeight * 0.55);

  // Planet display radius: log-scaled from min to max
  const maxR = Math.min(canvasW, canvasH) * 0.32;
  const minR = Math.min(canvasW, canvasH) * 0.09;
  const displayRadius = getPlanetDisplayRadius(planet, sortedPlanets, maxR, minR);

  const goPrev = useCallback(() => {
    setPlanetIdx((i) => (i - 1 + sortedPlanets.length) % sortedPlanets.length);
  }, [sortedPlanets.length]);

  const goNext = useCallback(() => {
    setPlanetIdx((i) => (i + 1) % sortedPlanets.length);
  }, [sortedPlanets.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, onClose]);

  const p = planet;
  const h = p.habitability;
  const sysName = systemDisplayName ?? system.name;

  const hasAtmo = !!p.atmosphere;
  const hasWater = !!p.hydrosphere;

  // Life description
  const lifeDesc = p.hasLife
    ? p.lifeComplexity === 'intelligent' ? 'Розумне життя'
      : p.lifeComplexity === 'multicellular' ? 'Складне (багатоклітинне)'
      : 'Мікробне'
    : 'Немає';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 58,
          background: 'rgba(1,3,10,0.75)',
          backdropFilter: 'blur(3px)',
        }}
        onClick={onClose}
      />

      {/* Main window */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 59,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          animation: 'pdwIn 0.22s ease-out both',
          pointerEvents: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid #334455',
            background: 'rgba(3,7,18,0.95)',
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
            pointerEvents: 'auto',
          }}
        >
          {/* System name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#556677', fontSize: 10, letterSpacing: '0.1em' }}>
              {sysName.toUpperCase()}
            </span>
            <span style={{ color: '#334455', fontSize: 10 }}>›</span>
            <span style={{ color: '#aabbcc', fontSize: 13, letterSpacing: '0.05em' }}>
              {p.name}
            </span>
            {p.isHomePlanet && (
              <span style={{ color: '#44ff88', fontSize: 9, border: '1px solid #44ff8855', padding: '1px 5px', borderRadius: 2 }}>
                HOME
              </span>
            )}
          </div>

          {/* Planet navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NavBtn label="◀" onClick={goPrev} disabled={sortedPlanets.length <= 1} />
            <span style={{ color: '#4a6077', fontSize: 10, minWidth: 60, textAlign: 'center' }}>
              {planetIdx + 1} / {sortedPlanets.length}
            </span>
            <NavBtn label="▶" onClick={goNext} disabled={sortedPlanets.length <= 1} />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #334455',
              color: '#667788',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'monospace',
              padding: '3px 9px',
              borderRadius: 3,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#aabbcc'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#667788'; }}
          >
            ×
          </button>
        </div>

        {/* ── Content area ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Left column: PixiJS planet canvas */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(2,5,16,0.92)',
              borderRight: '1px solid #1a2535',
              padding: '20px',
              flexShrink: 0,
              width: canvasW + 40,
            }}
          >
            {/* Planet type + orbit label above canvas */}
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 12,
                color: '#4a6077',
                fontSize: 10,
                letterSpacing: '0.06em',
                animation: 'pdwSlide 0.3s ease-out 100ms both',
              }}
            >
              <span>{planetTypeName(p.type).toUpperCase()}</span>
              <span style={{ color: '#334455' }}>|</span>
              <span>{p.orbit.semiMajorAxisAU.toFixed(3)} AU</span>
              <span style={{ color: '#334455' }}>|</span>
              <span>{p.radiusEarth.toFixed(2)} R⊕</span>
            </div>

            {/* Canvas */}
            <PlanetCanvas
              key={planet.id}
              planet={planet}
              star={system.star}
              displayRadius={displayRadius}
              canvasW={canvasW}
              canvasH={canvasH}
            />

            {/* Moon list below canvas */}
            {p.moons.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  justifyContent: 'center',
                  animation: 'pdwSlide 0.3s ease-out 200ms both',
                }}
              >
                {p.moons.map((m) => (
                  <span
                    key={m.id}
                    style={{
                      color: '#4a6077',
                      fontSize: 9,
                      border: '1px solid #1e2d3e',
                      padding: '2px 6px',
                      borderRadius: 2,
                    }}
                  >
                    {m.name} · {m.compositionType} · {Math.round(m.radiusKm)}km
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right column: characteristics panel */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              background: 'rgba(3,7,18,0.97)',
              padding: '20px 28px 80px',
            }}
          >
            {/* Planet name header */}
            <div
              style={{
                fontSize: 22,
                color: '#ccddee',
                letterSpacing: '0.08em',
                marginBottom: 4,
                animation: 'pdwSlide 0.3s ease-out 50ms both',
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#334455',
                marginBottom: 20,
                letterSpacing: '0.06em',
                animation: 'pdwSlide 0.3s ease-out 80ms both',
              }}
            >
              {planetTypeName(p.type).toUpperCase()} &nbsp;·&nbsp; {p.zone?.toUpperCase() ?? ''}
            </div>

            {/* Physical */}
            <Section label="ФІЗИЧНІ ПАРАМЕТРИ" delay={100} />
            <CharRow label="Радіус" value={`${p.radiusEarth.toFixed(3)} R⊕`} delay={120} />
            <CharRow label="Маса" value={`${p.massEarth.toFixed(4)} M⊕`} delay={140} />
            <CharRow label="Гравітація" value={`${p.surfaceGravityG.toFixed(2)} g`} delay={160} />
            <CharRow label="Щільність" value={`${p.densityGCm3.toFixed(2)} г/см³`} delay={180} />
            <CharRow label="V втечі" value={`${p.escapeVelocityKmS.toFixed(2)} км/с`} delay={200} />

            {/* Thermal */}
            <Section label="ТЕМПЕРАТУРА" delay={220} />
            <CharRow label="Поверхня" value={formatTemp(p.surfaceTempK)} delay={240} />
            <CharRow label="Рівноважна" value={formatTemp(p.equilibriumTempK)} delay={260} />
            <CharRow label="Альбедо" value={p.albedo.toFixed(3)} delay={280} />

            {/* Orbital */}
            <Section label="ОРБІТА" delay={300} />
            <CharRow label="Велика піввісь" value={`${p.orbit.semiMajorAxisAU.toFixed(4)} AU`} delay={320} />
            <CharRow label="Ексцентриситет" value={p.orbit.eccentricity.toFixed(4)} delay={340} />
            <CharRow label="Нахил" value={`${p.orbit.inclinationDeg.toFixed(1)}°`} delay={360} />
            <CharRow label="Період" value={`${p.orbit.periodDays.toFixed(1)} дн`} delay={380} />

            {/* Atmosphere */}
            {hasAtmo && (
              <>
                <Section label="АТМОСФЕРА" delay={400} />
                <CharRow
                  label="Тиск"
                  value={`${p.atmosphere!.surfacePressureAtm.toFixed(3)} атм`}
                  delay={420}
                />
                {p.atmosphere!.hasOzone && (
                  <CharRow label="Озоновий шар" value="є" color="#44ff88" delay={440} />
                )}
                {p.atmosphere!.composition && Object.keys(p.atmosphere!.composition).length > 0 && (
                  <CharRow
                    label="Склад"
                    value={Object.entries(p.atmosphere!.composition).slice(0, 3).map(
                      ([mol, frac]) => `${mol} ${((frac as number) * 100).toFixed(1)}%`,
                    ).join(', ')}
                    delay={460}
                  />
                )}
              </>
            )}

            {/* Hydrosphere */}
            {hasWater && p.hydrosphere!.waterCoverageFraction > 0 && (
              <>
                <Section label="ГІДРОСФЕРА" delay={480} />
                <CharRow
                  label="Покриття водою"
                  value={`${(p.hydrosphere!.waterCoverageFraction * 100).toFixed(1)}%`}
                  color="#4488aa"
                  delay={500}
                />
              </>
            )}

            {/* Habitability */}
            <Section label="ПРИДАТНІСТЬ ДО ЖИТТЯ" delay={520} />
            <CharRow
              label="Загальна"
              value={habitabilityPercent(h.overall)}
              color={habitabilityColor(h.overall)}
              delay={540}
            />
            <CharRow label="Температура" value={habitabilityPercent(h.temperature)} delay={560} />
            <CharRow label="Атмосфера" value={habitabilityPercent(h.atmosphere)} delay={580} />
            <CharRow label="Вода" value={habitabilityPercent(h.water)} delay={600} />
            <CharRow label="Магн. поле" value={habitabilityPercent(h.magneticField)} delay={620} />

            {/* Life */}
            <Section label="БІОЛОГІЯ" delay={640} />
            <CharRow
              label="Життя"
              value={lifeDesc}
              color={p.hasLife ? '#44ff88' : '#445566'}
              delay={660}
            />

            {/* Moons */}
            {p.moons.length > 0 && (
              <>
                <Section label={`СУПУТНИКИ (${p.moons.length})`} delay={680} />
                {p.moons.map((m, mi) => (
                  <CharRow
                    key={m.id}
                    label={m.name}
                    value={`${m.compositionType} · ${Math.round(m.radiusKm)}km · ${m.orbitalPeriodDays.toFixed(1)} дн`}
                    delay={700 + mi * 30}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
