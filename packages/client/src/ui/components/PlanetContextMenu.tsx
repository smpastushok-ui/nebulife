import React, { useState, useMemo } from 'react';
import type { Planet, Star } from '@nebulife/core';
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';

// ---------------------------------------------------------------------------
// PlanetContextMenu — Tabbed panel with planet globe, navigation, resources,
// and premium tools. Designed for extensibility.
// ---------------------------------------------------------------------------

const MENU_WIDTH = 250;
const MENU_HEIGHT_APPROX = 340;

type TabId = 'actions' | 'resources' | 'premium';

/* ────────── Shared styles ────────── */

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'auto', zIndex: 20,
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  width: MENU_WIDTH,
  background: 'rgba(10,15,25,0.97)',
  border: '1px solid #334455',
  borderRadius: 6,
  fontFamily: 'monospace',
  color: '#aabbcc',
  fontSize: 12,
  zIndex: 21,
  pointerEvents: 'auto',
  boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
  overflow: 'hidden',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '9px 14px',
  minHeight: 42,
  background: 'none',
  border: 'none',
  color: '#8899aa',
  fontFamily: 'monospace',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
};

const itemHoverBg = 'rgba(40,60,90,0.4)';

/* ────────── Subcomponents ────────── */

function MenuItem({ label, onClick, color, icon, right, disabled, title }: {
  label: string;
  onClick?: () => void;
  color?: string;
  icon?: string;
  right?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  const [hover, setHover] = useState(false);
  if (disabled) {
    return (
      <div
        style={{ ...itemStyle, cursor: 'default', color: '#445566' }}
        title={title}
      >
        {icon && <span style={{ width: 14, textAlign: 'center', opacity: 0.4, flexShrink: 0 }}>{icon}</span>}
        {label}
        {right && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#334455' }}>{right}</span>}
      </div>
    );
  }
  return (
    <button
      style={{
        ...itemStyle,
        background: hover ? itemHoverBg : 'none',
        color: color ?? itemStyle.color,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      title={title}
    >
      {icon && <span style={{ width: 14, textAlign: 'center', opacity: 0.6, flexShrink: 0 }}>{icon}</span>}
      {label}
      {right && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#556677' }}>{right}</span>}
    </button>
  );
}

function TooltipHint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', marginRight: 10, flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'none',
          border: '1px solid #445566',
          color: '#556677',
          fontFamily: 'monospace',
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        ?
      </button>
      {show && (
        <div style={{
          position: 'absolute',
          right: 0, top: 22,
          width: 200,
          padding: '8px 10px',
          background: 'rgba(8,12,22,0.97)',
          border: '1px solid #334455',
          borderRadius: 4,
          fontSize: 9,
          color: '#8899aa',
          lineHeight: 1.5,
          fontFamily: 'monospace',
          zIndex: 30,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

function PlanetGlobe({ planet, star }: { planet: Planet; star: Star }) {
  const visuals = useMemo(() => derivePlanetVisuals(planet, star), [planet, star]);

  const toCSS = (c: number) =>
    `rgb(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff})`;

  const base = toCSS(visuals.surfaceBaseColor);
  const high = toCSS(visuals.surfaceHighColor);
  const ocean = visuals.hasOcean ? toCSS(visuals.oceanDeep) : base;
  const atmos = visuals.hasAtmosphere ? toCSS(visuals.atmosColor) : 'transparent';
  const atmosAlpha = visuals.atmosOpacity;

  const globeSize = 44;
  const glowColor = visuals.hasOcean
    ? toCSS(visuals.oceanShallow)
    : visuals.hasAtmosphere
      ? atmos
      : base;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0 8px',
      background: 'linear-gradient(180deg, rgba(15,22,35,0.6) 0%, transparent 100%)',
    }}>
      {/* Glow beneath globe */}
      <div style={{ position: 'relative', width: globeSize, height: globeSize }}>
        <div style={{
          position: 'absolute',
          bottom: -6, left: '50%', transform: 'translateX(-50%)',
          width: globeSize * 1.2, height: 10,
          background: `radial-gradient(ellipse, ${glowColor}44 0%, transparent 70%)`,
          filter: 'blur(3px)',
        }} />
        <div style={{
          width: globeSize, height: globeSize, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${high}, ${base} 55%, ${ocean} 90%)`,
          boxShadow: `inset -8px -5px 14px rgba(0,0,0,0.6), 0 0 12px ${glowColor}33`,
          border: `1px solid ${glowColor}55`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Atmosphere rim */}
          {visuals.hasAtmosphere && atmosAlpha > 0.02 && (
            <div style={{
              position: 'absolute', inset: -1, borderRadius: '50%',
              border: `1.5px solid ${atmos}`,
              opacity: Math.min(atmosAlpha * 3, 0.6),
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────── Tab bar ────────── */

function TabBar({ activeTab, onChange }: { activeTab: TabId; onChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; color?: string }[] = [
    { id: 'actions', label: 'Дії' },
    { id: 'resources', label: 'Ресурси' },
    { id: 'premium', label: '⚛ Платні', color: '#886622' },
  ];

  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid rgba(50,65,85,0.5)',
    }}>
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              padding: '7px 0',
              fontSize: 9,
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive ? (tab.color ? '#ddaa44' : '#7bb8ff') : (tab.color ?? '#556677'),
              background: isActive ? (tab.color ? 'rgba(40,28,8,0.3)' : 'rgba(40,70,110,0.2)') : 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${tab.color ? '#ddaa44' : '#7bb8ff'}` : '2px solid transparent',
              borderRight: i < tabs.length - 1 ? '1px solid rgba(50,65,85,0.4)' : 'none',
              cursor: 'pointer',
              transition: 'color 0.12s, background 0.12s',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ────────── Main component ────────── */

export function PlanetContextMenu({
  planet, star, screenPosition, quarks,
  onViewPlanet, onShowCharacteristics, onClose,
  onSurface,
  onTelescopePhoto,
  isDestroyed,
  surfaceDisabledReason,
  isPhotoGenerating,
  playerLevel,
}: {
  planet: Planet;
  star: Star;
  screenPosition: { x: number; y: number };
  quarks: number;
  onViewPlanet: () => void;
  onShowCharacteristics: () => void;
  onClose: () => void;
  onSurface?: () => void;
  onTelescopePhoto?: () => void;
  isDestroyed?: boolean;
  surfaceDisabledReason?: string;
  isPhotoGenerating?: boolean;
  playerLevel: number;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('actions');

  const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'dwarf';

  // Destroyed planets — minimal UI
  if (isDestroyed) {
    return (
      <>
        <div style={backdropStyle} onClick={onClose} />
        <div style={{
          ...menuStyle,
          left: Math.min(screenPosition.x + 8, window.innerWidth - MENU_WIDTH - 16),
          top: Math.min(screenPosition.y - 20, window.innerHeight - MENU_HEIGHT_APPROX - 16),
        }}>
          <div style={{
            padding: '10px 14px 8px', fontSize: 13, color: '#ccddee',
            borderBottom: '1px solid rgba(50,60,80,0.4)',
          }}>
            {planet.name}
            <span style={{ color: '#884422', marginLeft: 8, fontSize: 10 }}>ЗРУЙНОВАНО</span>
          </div>
          <div style={{ padding: '14px', color: '#553322', fontSize: 11, fontFamily: 'monospace' }}>
            Планета зруйнована. Залишились лише уламки.
          </div>
        </div>
      </>
    );
  }

  // Clamp to screen
  const maxX = window.innerWidth - MENU_WIDTH - 16;
  const maxY = window.innerHeight - MENU_HEIGHT_APPROX - 16;
  const left = Math.max(8, Math.min(screenPosition.x + 8, maxX));
  const top = Math.max(8, Math.min(screenPosition.y - 20, maxY));

  const PHOTO_COST = 10;
  const canAffordPhoto = quarks >= PHOTO_COST;

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={{ ...menuStyle, left, top }}>
        {/* ── Header: name + HOME tag ── */}
        <div style={{
          padding: '10px 14px 6px', fontSize: 13, color: '#ccddee',
          borderBottom: '1px solid rgba(50,65,85,0.5)',
        }}>
          {planet.name}
          {planet.isHomePlanet && (
            <span style={{
              color: '#44ff88', marginLeft: 8, fontSize: 8,
              border: '1px solid #44ff88', borderRadius: 2,
              padding: '1px 4px', verticalAlign: 'middle',
            }}>HOME</span>
          )}
        </div>

        {/* ── Globe preview (rocky/dwarf only) ── */}
        {isSurfacePlanet && <PlanetGlobe planet={planet} star={star} />}

        {/* ── Tab bar ── */}
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {/* ── Tab content ── */}
        <div style={{ padding: '4px 0', minHeight: 80 }}>
          {activeTab === 'actions' && (
            <>
              <MenuItem icon="◎" label="Екзосфера" onClick={onViewPlanet} color="#88ccaa" />
              {isSurfacePlanet && (
                surfaceDisabledReason
                  ? <MenuItem icon="▲" label="На поверхню" disabled title={surfaceDisabledReason} right="50+" />
                  : <MenuItem icon="▲" label="На поверхню" onClick={onSurface} color="#88ccaa" />
              )}
              <div style={{ height: 1, background: 'rgba(50,65,85,0.4)', margin: '4px 0' }} />
              <MenuItem icon="☰" label="Характеристики" onClick={onShowCharacteristics} right="›" />
              {playerLevel < 30 ? (
                <MenuItem icon="⊙" label="Відправити зонд" disabled title={`Доступно з 30+ рівня (зараз: ${playerLevel})`} right="30+" />
              ) : (
                <MenuItem icon="⊙" label="Відправити зонд" disabled right="скоро" />
              )}
              {playerLevel < 40 ? (
                <MenuItem icon="▶" label="Місія" disabled title={`Доступно з 40+ рівня (зараз: ${playerLevel})`} right="40+" />
              ) : (
                <MenuItem icon="▶" label="Місія" disabled right="скоро" />
              )}
            </>
          )}

          {activeTab === 'resources' && (
            <>
              {/* Crust composition */}
              {planet.resources?.crustComposition && (
                <>
                  <div style={{ padding: '6px 14px 3px', fontSize: 8, color: '#445566', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Склад кори
                  </div>
                  {Object.entries(planet.resources.crustComposition)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([el, pct]) => (
                      <div key={el} style={{
                        display: 'flex', alignItems: 'center', padding: '4px 14px',
                        fontSize: 11, color: '#8899aa',
                      }}>
                        <span style={{ width: 24, color: '#667788', fontSize: 10 }}>{el}</span>
                        <div style={{
                          flex: 1, height: 4, background: 'rgba(30,40,60,0.6)',
                          borderRadius: 2, marginRight: 8, overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${Math.min(pct * 2, 100)}%`, height: '100%',
                            background: pct > 20 ? '#4488aa' : pct > 10 ? '#446688' : '#335566',
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontSize: 9, color: '#556677', width: 32, textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    ))
                  }
                </>
              )}
              {/* Hydrosphere summary */}
              {planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0 && (
                <>
                  <div style={{ height: 1, background: 'rgba(50,65,85,0.3)', margin: '6px 0' }} />
                  <div style={{ padding: '4px 14px', fontSize: 8, color: '#445566', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Гідросфера
                  </div>
                  <div style={{ padding: '4px 14px', fontSize: 11, color: '#7799bb' }}>
                    Вода: {(planet.hydrosphere.waterCoverageFraction * 100).toFixed(0)}%
                    {planet.hydrosphere.iceCapFraction > 0.01 && (
                      <span style={{ color: '#8899aa', marginLeft: 8 }}>
                        Льод: {(planet.hydrosphere.iceCapFraction * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </>
              )}
              {/* Atmosphere summary */}
              {planet.atmosphere && (
                <>
                  <div style={{ height: 1, background: 'rgba(50,65,85,0.3)', margin: '6px 0' }} />
                  <div style={{ padding: '4px 14px', fontSize: 8, color: '#445566', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Атмосфера
                  </div>
                  <div style={{ padding: '4px 14px', fontSize: 11, color: '#7799bb' }}>
                    {planet.atmosphere.surfacePressureAtm.toFixed(2)} atm
                    {planet.atmosphere.composition && (
                      <span style={{ color: '#667788', marginLeft: 8, fontSize: 10 }}>
                        {Object.entries(planet.atmosphere.composition)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 2)
                          .map(([g, v]) => `${g} ${(v * 100).toFixed(0)}%`)
                          .join(', ')
                        }
                      </span>
                    )}
                  </div>
                </>
              )}
              {/* No resources fallback */}
              {!planet.resources?.crustComposition && !planet.hydrosphere && !planet.atmosphere && (
                <div style={{ padding: '14px', color: '#445566', fontSize: 11 }}>
                  Дані про ресурси відсутні
                </div>
              )}
            </>
          )}

          {activeTab === 'premium' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30,22,5,0.5) 0%, rgba(15,12,3,0.4) 100%)',
              minHeight: 80,
            }}>
              <div style={{ padding: '8px 14px 3px', fontSize: 8, color: '#886622', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Преміум інструменти
              </div>
              {/* Telescope photo */}
              {onTelescopePhoto && !isPhotoGenerating && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <MenuItem
                      icon="◉"
                      label={`Фото планети — ${PHOTO_COST} ⚛`}
                      onClick={canAffordPhoto ? onTelescopePhoto : undefined}
                      color={canAffordPhoto ? '#ddaa44' : '#445566'}
                      disabled={!canAffordPhoto}
                    />
                  </div>
                  <TooltipHint text="Оренда потужностей супертелескопа, який зробить неперевершене унікальне зображення обраної планети. Таке зображення буде лише у вас." />
                </div>
              )}
              {onTelescopePhoto && isPhotoGenerating && (
                <MenuItem
                  icon="◉"
                  label="Фото планети"
                  disabled
                  right={<span style={{ color: '#4488aa', fontSize: 9 }}>генерується...</span>}
                />
              )}
              {/* Future premium tools will go here */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
