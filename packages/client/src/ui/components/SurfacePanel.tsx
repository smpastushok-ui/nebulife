import React, { useRef, useEffect, useState } from 'react';
import type { BuildingType, PlacedBuilding } from '@nebulife/core';
import type { Planet } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SurfacePanel — Variant C (Floating HUD)
// ---------------------------------------------------------------------------

type DockMode = 'build' | 'colony';

/* ─── Building groups ───────────────────────────────────────────────────── */

interface BuildingGroup { label: string; color: string; types: BuildingType[] }

const BUILDING_GROUPS: BuildingGroup[] = [
  { label: 'ІНФРАСТРУКТУРА', color: '#44ff88',  types: ['colony_hub', 'resource_storage', 'landing_pad', 'spaceport'] },
  { label: 'ЕНЕРГЕТИКА',     color: '#ffcc44',  types: ['solar_plant', 'battery_station', 'wind_generator', 'thermal_generator', 'fusion_reactor'] },
  { label: 'ВИДОБУТОК',      color: '#ff8844',  types: ['mine', 'water_extractor', 'atmo_extractor', 'deep_drill', 'orbital_collector'] },
  { label: 'НАУКА',          color: '#4488ff',  types: ['research_lab', 'observatory', 'radar_tower', 'orbital_telescope', 'quantum_computer'] },
  { label: 'БІОСФЕРА',       color: '#88ff44',  types: ['greenhouse', 'residential_dome', 'atmo_shield', 'biome_dome'] },
  { label: 'ХІМІЯ',          color: '#ff44aa',  types: ['quantum_separator', 'gas_fractionator', 'isotope_centrifuge', 'genesis_vault'] },
  { label: 'ПРЕМІУМ',        color: '#ffcc44',  types: ['alpha_harvester'] },
];

const BUILDING_COLORS: Partial<Record<BuildingType, string>> = {
  colony_hub:        '#44ff88',
  resource_storage:  '#66bb88',
  landing_pad:       '#88ccaa',
  spaceport:         '#aaccee',
  solar_plant:       '#ffcc44',
  battery_station:   '#ffdd88',
  wind_generator:    '#88ddff',
  thermal_generator: '#ff8844',
  fusion_reactor:    '#ff4466',
  mine:              '#ff8844',
  water_extractor:   '#44ccff',
  atmo_extractor:    '#66aacc',
  deep_drill:        '#cc8844',
  orbital_collector: '#4466ff',
  research_lab:      '#4488ff',
  observatory:       '#cc88ff',
  radar_tower:       '#88aaff',
  orbital_telescope: '#aa66ff',
  quantum_computer:  '#dd44ff',
  greenhouse:        '#88ff44',
  residential_dome:  '#aaffaa',
  atmo_shield:       '#44ddaa',
  biome_dome:        '#66ff88',
  quantum_separator: '#ff44aa',
  gas_fractionator:  '#ff6688',
  isotope_centrifuge:'#cc4488',
  genesis_vault:     '#ff88cc',
  alpha_harvester:   '#ffcc44',
};

const TERRAIN_UA: Record<string, string> = {
  lowland:   'низовина',
  plains:    'рівнина',
  hills:     'пагорби',
  beach:     'пляж',
  coast:     'узбережжя',
  ocean:     'океан',
  mountains: 'гори',
  peaks:     'вершини',
};

/* ─── PNG photo paths (where available) ────────────────────────────────── */

const BLDG_PNG: Partial<Record<BuildingType, string>> = {
  colony_hub:       '/buildings/colony_hub.png',
  solar_plant:      '/buildings/solar_plant.png',
  resource_storage: '/tiles/machines/resource_storage.png',
  landing_pad:      '/tiles/machines/landing_pad.png',
  spaceport:        '/tiles/machines/spaceport.png',
  alpha_harvester:  '/tiles/machines/premium_harvester_drone.png',
};

/* ─── 3-resource cost display (МІН / ЛЕТ / ІЗО) ───────────────────────── */

interface ResCost { m: number; v: number; i: number }

const BLDG_COSTS: Record<BuildingType, ResCost> = {
  // Infrastructure
  colony_hub:         { m:50,  v:20, i:10 },
  resource_storage:   { m:30,  v:0,  i:0  },
  landing_pad:        { m:40,  v:5,  i:5  },
  spaceport:          { m:80,  v:30, i:20 },
  // Energy
  solar_plant:        { m:20,  v:0,  i:5  },
  battery_station:    { m:25,  v:0,  i:15 },
  wind_generator:     { m:20,  v:10, i:0  },
  thermal_generator:  { m:30,  v:20, i:5  },
  fusion_reactor:     { m:50,  v:10, i:40 },
  // Extraction
  mine:               { m:15,  v:0,  i:0  },
  water_extractor:    { m:15,  v:10, i:0  },
  atmo_extractor:     { m:25,  v:15, i:0  },
  deep_drill:         { m:40,  v:5,  i:5  },
  orbital_collector:  { m:50,  v:10, i:20 },
  // Science
  research_lab:       { m:20,  v:5,  i:15 },
  observatory:        { m:25,  v:0,  i:20 },
  radar_tower:        { m:30,  v:5,  i:10 },
  orbital_telescope:  { m:40,  v:5,  i:30 },
  quantum_computer:   { m:50,  v:0,  i:50 },
  // Biosphere
  greenhouse:         { m:20,  v:15, i:0  },
  residential_dome:   { m:35,  v:10, i:5  },
  atmo_shield:        { m:50,  v:15, i:20 },
  biome_dome:         { m:45,  v:25, i:15 },
  // Chemistry
  quantum_separator:  { m:30,  v:10, i:20 },
  gas_fractionator:   { m:35,  v:30, i:10 },
  isotope_centrifuge: { m:40,  v:5,  i:35 },
  genesis_vault:      { m:100, v:50, i:80 },
  // Premium (costs quarks — shown separately)
  alpha_harvester:    { m:0,   v:0,  i:0  },
};

/* ─── Canvas mini-icon (fallback for buildings without PNG) ─────────────── */

function drawIcon(ctx: CanvasRenderingContext2D, type: BuildingType, size: number) {
  const cx = size / 2, cy = size / 2, s = size * 0.35;
  const col = BUILDING_COLORS[type] ?? '#aabbcc';
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  switch (type) {
    case 'colony_hub':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.9);
      ctx.lineTo(cx + s * 0.7, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy - s * 0.1);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'mine':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.6);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'solar_plant':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7); ctx.lineTo(cx + s * 0.6, cy);
      ctx.lineTo(cx, cy + s * 0.7); ctx.lineTo(cx - s * 0.6, cy);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'research_lab':
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    case 'water_extractor':
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.8);
      ctx.quadraticCurveTo(cx + s * 0.7, cy, cx, cy + s * 0.6);
      ctx.quadraticCurveTo(cx - s * 0.7, cy, cx, cy - s * 0.8);
      ctx.fill(); ctx.stroke(); break;
    case 'greenhouse':
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.1, s * 0.55, Math.PI, 0);
      ctx.lineTo(cx + s * 0.55, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.55, cy + s * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'observatory':
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.15, s * 0.4, Math.PI, 0);
      ctx.lineTo(cx + s * 0.3, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.4, cy - s * 0.15);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    default: break;
  }
}

function BuildingIcon({ type, size = 24 }: { type: BuildingType; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawIcon(ctx, type, size);
  }, [type, size]);
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}

/* ─── Building card (photo + name + cost + ? for description) ───────────── */

const IMG_SIZE = 62;

function BuildingCard({
  type,
  selected,
  onClick,
}: {
  type: BuildingType;
  selected: boolean;
  onClick: () => void;
}) {
  const [descOpen, setDescOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const def        = BUILDING_DEFS[type];
  const col        = BUILDING_COLORS[type] ?? '#aabbcc';
  const cost       = BLDG_COSTS[type];
  const pngPath    = BLDG_PNG[type];
  const terrainStr = def.requiresTerrain.map((t) => TERRAIN_UA[t] ?? t).join(', ');
  const isPremium  = type === 'alpha_harvester';

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%', padding: '8px 10px',
        background: selected ? 'rgba(40,80,120,0.35)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(40,60,80,0.25)',
        borderLeft: `3px solid ${selected ? col : 'transparent'}`,
        cursor: 'pointer', textAlign: 'left',
        fontFamily: 'monospace',
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      {/* ── Building photo / icon ─────────────────────────────────────── */}
      <div style={{
        width: IMG_SIZE, height: IMG_SIZE, flexShrink: 0,
        border: `1px solid ${col}33`,
        borderRadius: 3, overflow: 'hidden',
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {pngPath && !imgFailed ? (
          <img
            src={pngPath}
            alt={type}
            onError={() => setImgFailed(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'contain', display: 'block',
              mixBlendMode: 'multiply',
            }}
          />
        ) : (
          <BuildingIcon type={type} size={IMG_SIZE - 14} />
        )}
      </div>

      {/* ── Name / cost / description ─────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Name row + ? button */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 4,
          marginBottom: 5,
        }}>
          <span style={{
            color: selected ? '#cce8ff' : '#aabbcc',
            fontSize: 12, lineHeight: 1.3,
          }}>
            {def.name}
          </span>
          {/* ? toggles description inline */}
          <span
            role="button"
            onMouseEnter={() => setDescOpen(true)}
            onMouseLeave={() => setDescOpen(false)}
            onClick={(e) => { e.stopPropagation(); setDescOpen((p) => !p); }}
            style={{
              color: descOpen ? '#aabbcc' : '#334455',
              fontSize: 9, cursor: 'pointer',
              border: `1px solid ${descOpen ? '#445566' : '#2a3a4a'}`,
              borderRadius: 2, padding: '1px 5px',
              lineHeight: '13px', flexShrink: 0,
              userSelect: 'none',
              transition: 'color 0.1s, border-color 0.1s',
            }}
          >
            ?
          </span>
        </div>

        {/* Description — shown when ? is active */}
        {descOpen && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: '#667788', fontSize: 10, lineHeight: 1.5 }}>
              {def.description}
            </div>
            <div style={{ color: '#3a4e5e', fontSize: 9, marginTop: 3 }}>
              {terrainStr}&nbsp;&nbsp;{def.sizeW}&times;{def.sizeH}
            </div>
          </div>
        )}

        {/* Resource costs */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {isPremium ? (
            <span style={{ color: '#ffcc44', fontSize: 10 }}>ПРЕМІУМ</span>
          ) : (
            <>
              {cost.m > 0 && (
                <span style={{ color: '#6699bb', fontSize: 10 }}>
                  М:{cost.m}
                </span>
              )}
              {cost.v > 0 && (
                <span style={{ color: '#44ccff', fontSize: 10 }}>
                  Л:{cost.v}
                </span>
              )}
              {cost.i > 0 && (
                <span style={{ color: '#88ff44', fontSize: 10 }}>
                  І:{cost.i}
                </span>
              )}
              {cost.m === 0 && cost.v === 0 && cost.i === 0 && (
                <span style={{ color: '#3a4e5e', fontSize: 10 }}>—</span>
              )}
            </>
          )}
        </div>

      </div>
    </button>
  );
}

/* ─── Planet info HUD (top-left, always visible) ───────────────────────── */

function PlanetInfoHUD({ planet, buildings }: { planet: Planet; buildings: PlacedBuilding[] }) {
  const tempC = Math.round(planet.surfaceTempK - 273);
  const tempColor = tempC > -10 && tempC < 50 ? '#44ff88' : tempC < -40 || tempC > 80 ? '#ff8844' : '#ffcc44';
  const habPct = Math.round((planet.habitability?.overall ?? 0) * 100);
  const habColor = habPct > 70 ? '#44ff88' : habPct > 40 ? '#ffcc44' : '#ff8844';
  const gravColor = Math.abs(planet.surfaceGravityG - 1) < 0.3 ? '#44ff88' : '#ffcc44';

  const rows: { k: string; v: string; c: string }[] = [
    { k: 'Температура', v: `${tempC > 0 ? '+' : ''}${tempC}°C`, c: tempColor },
    { k: 'Гравітація',  v: `${planet.surfaceGravityG.toFixed(2)} g`, c: gravColor },
    ...(planet.atmosphere
      ? [{ k: 'Атмосфера', v: `${planet.atmosphere.surfacePressureAtm.toFixed(1)} атм`, c: '#aabbcc' }]
      : []),
    { k: 'Придатність', v: `${habPct}%`, c: habColor },
    { k: 'Споруд',      v: String(buildings.length), c: '#aabbcc' },
  ];

  return (
    <div style={{
      position: 'absolute', top: 14, left: 14,
      background: 'rgba(5,10,25,0.88)',
      border: '1px solid rgba(60,100,160,0.3)',
      borderRadius: 4, padding: '8px 12px',
      fontFamily: 'monospace', pointerEvents: 'auto',
      minWidth: 175,
    }}>
      <div style={{ color: '#aaccee', fontSize: 11, letterSpacing: '0.7px', marginBottom: 6 }}>
        {planet.name.toUpperCase()}
      </div>
      {rows.map(({ k, v, c }) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: '#4a5e70', fontSize: 10 }}>{k}</span>
          <span style={{ color: c, fontSize: 10 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Placement hint (top-center, when building selected) ──────────────── */

function PlacementHint({ type, onCancel }: { type: BuildingType; onCancel: () => void }) {
  const def = BUILDING_DEFS[type];
  const col = BUILDING_COLORS[type] ?? '#aabbcc';
  return (
    <div style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(5,20,15,0.92)',
      border: `1px solid ${col}33`,
      borderRadius: 4, padding: '6px 14px',
      fontFamily: 'monospace', fontSize: 11, color: '#88ccaa',
      display: 'flex', alignItems: 'center', gap: 10,
      pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 10,
    }}>
      <span style={{ color: col, fontSize: 13, lineHeight: 1 }}>+</span>
      <span style={{ color: '#aabbcc' }}>{def.name}</span>
      <span style={{ color: '#445566' }}>—</span>
      <span style={{ color: '#556677' }}>оберіть клітинку на карті</span>
      <button
        onClick={onCancel}
        style={{
          background: 'none', border: 'none', color: '#556677',
          fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
          padding: '0 2px', lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}

/* ─── Building list content ─────────────────────────────────────────────── */

function BuildingListContent({
  mode, planet, buildings,
  selectedBuilding, onSelectBuilding,
  expandedGroups, toggleGroup,
}: {
  mode: DockMode;
  planet: Planet;
  buildings: PlacedBuilding[];
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (t: BuildingType | null) => void;
  expandedGroups: Set<string>;
  toggleGroup: (label: string) => void;
}) {
  if (mode === 'build') {
    return (
      <>
        {BUILDING_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '5px 12px',
                  background: 'none', border: 'none',
                  borderTop: '1px solid rgba(40,60,80,0.4)',
                  color: group.color, fontFamily: 'monospace',
                  fontSize: 9, letterSpacing: '0.7px', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1 }}>{group.label}</span>
                <span style={{ color: '#334455', fontSize: 12 }}>
                  {isExpanded ? '−' : '+'}
                </span>
              </button>

              {isExpanded && group.types.map((type) => (
                <BuildingCard
                  key={type}
                  type={type}
                  selected={selectedBuilding === type}
                  onClick={() => onSelectBuilding(selectedBuilding === type ? null : type)}
                />
              ))}
            </div>
          );
        })}
      </>
    );
  }

  /* ── Colony mode — stats + placed buildings ── */
  const tempC = Math.round(planet.surfaceTempK - 273);
  const habPct = Math.round((planet.habitability?.overall ?? 0) * 100);
  const habColor = habPct > 70 ? '#44ff88' : habPct > 40 ? '#ffcc44' : '#ff8844';

  return (
    <div>
      {[
        { k: 'Температура', v: `${tempC > 0 ? '+' : ''}${tempC}°C` },
        { k: 'Гравітація',  v: `${planet.surfaceGravityG.toFixed(2)} g` },
        ...(planet.atmosphere
          ? [{ k: 'Атмосфера', v: `${planet.atmosphere.surfacePressureAtm.toFixed(1)} атм` }]
          : []),
        { k: 'Придатність', v: `${habPct}%`, c: habColor },
        { k: 'Споруд', v: String(buildings.length) },
      ].map(({ k, v, c }) => (
        <div key={k} style={{
          display: 'flex', justifyContent: 'space-between', gap: 16,
          padding: '6px 12px', borderBottom: '1px solid rgba(40,60,80,0.2)',
        }}>
          <span style={{ color: '#667788', fontSize: 11 }}>{k}</span>
          <span style={{ color: (c as string | undefined) ?? '#aaccee', fontSize: 11 }}>{v}</span>
        </div>
      ))}

      <div style={{
        padding: '7px 12px 4px',
        color: '#4488aa', fontSize: 9, letterSpacing: '0.7px',
        marginTop: 4,
      }}>
        РОЗМІЩЕНІ СПОРУДИ
      </div>

      {buildings.length === 0 ? (
        <div style={{ padding: '10px 12px', color: '#3a4e5e', fontSize: 10, lineHeight: 1.7 }}>
          Жодної споруди не зведено.<br />
          Оберіть тип у вкладці БУДІВЛІ.
        </div>
      ) : buildings.map((b) => {
        const def = BUILDING_DEFS[b.type];
        const col = BUILDING_COLORS[b.type] ?? '#aabbcc';
        return (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderBottom: '1px solid rgba(40,60,80,0.2)',
            borderLeft: `3px solid ${col}55`,
          }}>
            <BuildingIcon type={b.type} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#aabbcc', fontSize: 11 }}>{def.name}</div>
              <div style={{ color: '#445566', fontSize: 9 }}>x:{b.x}  y:{b.y}</div>
            </div>
            <div style={{
              fontSize: 9, color: col,
              padding: '2px 5px',
              border: `1px solid ${col}44`,
              borderRadius: 2, letterSpacing: '0.3px',
            }}>
              LV{b.level}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Icon dock (right side) ───────────────────────────────────────────── */

function IconDock({
  mode, panelOpen, harvestMode, onToggle, onToggleHarvest,
}: {
  mode: DockMode;
  panelOpen: boolean;
  harvestMode: boolean;
  onToggle: (m: DockMode) => void;
  onToggleHarvest: () => void;
}) {
  const dockBtn = (
    active: boolean,
    title: string,
    icon: React.ReactNode,
    onClick: () => void,
    accentColor?: string,
  ) => (
    <button
      key={title}
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? (accentColor ? `${accentColor}22` : 'rgba(20,50,80,0.9)') : 'rgba(10,15,25,0.85)',
        border: `1px solid ${active ? (accentColor ?? 'rgba(68,136,170,0.6)') : 'rgba(60,100,160,0.25)'}`,
        borderRadius: 4, cursor: 'pointer',
        color: active ? (accentColor ?? '#aaccee') : '#556677',
        fontFamily: 'monospace', padding: 0,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{
      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', gap: 6,
      pointerEvents: 'auto',
    }}>
      {dockBtn(
        harvestMode, 'Добування',
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="13" x2="10" y2="6" />
          <path d="M10 6 L13 3 L14 4 L11 7 Z" />
          <path d="M10 6 L8 4 L9 2 L12 5" />
        </svg>,
        onToggleHarvest,
        '#ff8844',
      )}

      <div style={{ height: 1, background: 'rgba(60,100,160,0.2)', margin: '2px 4px' }} />

      {dockBtn(
        panelOpen && mode === 'build', 'Будівлі',
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>,
        () => onToggle('build'),
      )}
      {dockBtn(
        panelOpen && mode === 'colony', 'Колонія',
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="14" y2="12" />
        </svg>,
        () => onToggle('colony'),
      )}
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────────────────── */

interface SurfacePanelProps {
  planet: Planet;
  buildings: PlacedBuilding[];
  selectedBuilding: BuildingType | null;
  onSelectBuilding: (type: BuildingType | null) => void;
  onClose: () => void;
  harvestMode: boolean;
  onToggleHarvest: () => void;
}

/* ─── Main panel ─────────────────────────────────────────────────────────── */

export function SurfacePanel({
  planet,
  buildings,
  selectedBuilding,
  onSelectBuilding,
  onClose,
  harvestMode,
  onToggleHarvest,
}: SurfacePanelProps) {
  const [mode, setMode] = useState<DockMode>('build');
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(BUILDING_GROUPS.map((g) => g.label)),
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  useEffect(() => {
    if (selectedBuilding && window.innerWidth < 768) {
      setPanelOpen(false);
    }
  }, [selectedBuilding]);

  const handleDockToggle = (m: DockMode) => {
    if (mode === m) {
      setPanelOpen((p) => !p);
    } else {
      setMode(m);
      setPanelOpen(true);
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <PlanetInfoHUD planet={planet} buildings={buildings} />

      {selectedBuilding && (
        <PlacementHint type={selectedBuilding} onCancel={() => onSelectBuilding(null)} />
      )}

      {panelOpen && (
        <div style={{
          position: 'absolute',
          right: 60, top: 60,
          width: 305,
          maxHeight: 'calc(100vh - 130px)',
          background: 'rgba(5,10,25,0.94)',
          border: '1px solid rgba(60,100,160,0.3)',
          borderRadius: 4,
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}>
          <div style={{
            padding: '7px 12px',
            borderBottom: '1px solid rgba(60,100,160,0.2)',
            color: '#4488aa', fontSize: 9, letterSpacing: '0.8px',
            flexShrink: 0,
          }}>
            {mode === 'build' ? 'БУДІВЛІ' : 'КОЛОНІЯ'}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <BuildingListContent
              mode={mode}
              planet={planet}
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={onSelectBuilding}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          </div>
        </div>
      )}

      {harvestMode && !selectedBuilding && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(25,15,5,0.92)',
          border: '1px solid rgba(255,136,68,0.3)',
          borderRadius: 4, padding: '6px 14px',
          fontFamily: 'monospace', fontSize: 11, color: '#cc8855',
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          <span style={{ color: '#ff8844', fontSize: 13, lineHeight: 1 }}>*</span>
          <span style={{ color: '#aabbcc' }}>Режим добування</span>
          <span style={{ color: '#445566' }}>—</span>
          <span style={{ color: '#556677' }}>натисніть на ресурс</span>
          <button
            onClick={onToggleHarvest}
            style={{
              background: 'none', border: 'none', color: '#556677',
              fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
              padding: '0 2px', lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      <IconDock
        mode={mode}
        panelOpen={panelOpen}
        harvestMode={harvestMode}
        onToggle={handleDockToggle}
        onToggleHarvest={onToggleHarvest}
      />
    </div>
  );
}
