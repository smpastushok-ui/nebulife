import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Star, ResourceGroup, PlanetMission, PlanetMissionType, PlanetRevealLevel, PlacedBuilding, ProducibleType, PlanetReportSummary, Ship, PlanetTerraformState, CargoShipment } from '@nebulife/core';
import {
  ELEMENTS, RESOURCE_GROUPS, GROUP_COLORS, getGroupElements, formatMassKg, isTerraformable,
  canStartPlanetMission, computePlanetMissionCost, getPlanetMissionProgress, getTargetRevealLevel, isSolidPlanetForLanding,
  PRODUCIBLE_DEFS,
} from '@nebulife/core';

/** i18n key for each resource group label */
const GROUP_T_KEY: Record<ResourceGroup, string> = {
  mineral:  'resource_display.desc.minerals_name',
  volatile: 'resource_display.desc.volatiles_name',
  isotope:  'resource_display.desc.isotopes_name',
};
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { AdProgressButton } from './AdProgressButton.js';

// ---------------------------------------------------------------------------
// QuarkIcon — inline SVG quark currency symbol
// ---------------------------------------------------------------------------

function QuarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PlanetContextMenu — Tabbed panel with planet globe, navigation, resources,
// and premium tools. Designed for extensibility.
// ---------------------------------------------------------------------------

const MENU_WIDTH = 300;
const MENU_HEIGHT_APPROX = 360;

type TabId = 'actions' | 'characteristics' | 'resources' | 'alpha' | 'logistics' | 'terraform' | 'status';
type PlanetPhotoKind = 'exosphere' | 'biosphere' | 'aerial';
type CargoResource = 'minerals' | 'volatiles' | 'isotopes' | 'water';

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
  label: React.ReactNode;
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

function formatMissionTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
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

function TabBar({
  activeTab,
  onChange,
  unlockedTabs,
}: {
  activeTab: TabId;
  onChange: (t: TabId) => void;
  unlockedTabs: Set<TabId>;
}) {
  const { t } = useTranslation();
  const tabs: { id: TabId; label: string; color?: string }[] = [
    { id: 'actions', label: t('planet.tab_actions') },
    { id: 'characteristics', label: t('planet.characteristics') },
    { id: 'resources', label: t('planet_terminal.tab_resources') },
    { id: 'alpha', label: `\u29B3 ${t('planet.tab_premium')}`, color: '#886622' },
    { id: 'logistics', label: t('planet_terminal.tab_logistics') },
    { id: 'terraform', label: t('planet_terminal.tab_terraform'), color: '#446644' },
    { id: 'status', label: t('planet_terminal.tab_status') },
  ];

  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      borderBottom: '1px solid rgba(50,65,85,0.5)',
    }}>
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        const isUnlocked = unlockedTabs.has(tab.id);
        const activeColor = tab.color ? '#88cc88' : '#7bb8ff';
        const activeBg = tab.color
          ? (tab.id === 'terraform' ? 'rgba(20,40,20,0.3)' : 'rgba(40,28,8,0.3)')
          : 'rgba(40,70,110,0.2)';
        const activeBorder = tab.color
          ? (tab.id === 'terraform' ? '#88cc88' : '#ddaa44')
          : '#7bb8ff';
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '7px 10px',
              fontSize: 9,
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: !isUnlocked ? '#334455' : isActive ? activeColor : (tab.color ? (tab.id === 'terraform' ? '#448844' : '#886622') : '#556677'),
              background: isActive ? activeBg : 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${activeBorder}` : '2px solid transparent',
              borderRight: i < tabs.length - 1 ? '1px solid rgba(50,65,85,0.4)' : 'none',
              cursor: 'pointer',
              transition: 'color 0.12s, background 0.12s',
            }}
          >
            {tab.label}{!isUnlocked ? ' ·' : ''}
          </button>
        );
      })}
    </div>
  );
}

/* ────────── Resources tab ────────── */

function ResourcesTab({ planet, playerLevel, expandedGroup, setExpandedGroup, revealLevel }: {
  planet: Planet;
  playerLevel: number;
  expandedGroup: ResourceGroup | null;
  setExpandedGroup: (g: ResourceGroup | null) => void;
  revealLevel: PlanetRevealLevel;
}) {
  const { t } = useTranslation();
  const totalRes = planet.resources?.totalResources;
  const hasAnyResources = totalRes && (totalRes.minerals > 0 || totalRes.volatiles > 0 || totalRes.isotopes > 0);
  const [lockedTooltip, setLockedTooltip] = useState<ResourceGroup | null>(null);
  const hydro = planet.hydrosphere;
  const waterMassKg = hydro && hydro.waterCoverageFraction > 0 && hydro.oceanDepthKm > 0
    ? (() => {
        const radiusM = planet.radiusEarth * 6_371_000;
        const surfaceArea = 4 * Math.PI * radiusM * radiusM;
        const volume = surfaceArea * Math.min(0.95, hydro.waterCoverageFraction) * (hydro.oceanDepthKm * 1000);
        return volume * 1000;
      })()
    : 0;

  // Compute max group value for proportional bars
  const maxGroupValue = totalRes
    ? Math.max(totalRes.minerals, totalRes.volatiles, totalRes.isotopes, 1)
    : 1;
  const compactResources = totalRes
    ? [
        { key: 'minerals', label: t('planet_terminal.resource_minerals'), value: totalRes.minerals, color: '#8a8a7a' },
        { key: 'volatiles', label: t('planet_terminal.resource_volatiles'), value: totalRes.volatiles, color: '#5fa8c8' },
        { key: 'isotopes', label: t('planet_terminal.resource_isotopes'), value: totalRes.isotopes, color: '#b88a44' },
        { key: 'water', label: t('planet_terminal.resource_water'), value: waterMassKg, color: '#4488aa' },
      ]
    : [];

  if (revealLevel < 2) {
    return (
      <div style={{ padding: '14px', color: '#445566', fontSize: 11 }}>
        {t('planet_missions.resources_locked')}
      </div>
    );
  }

  return (
    <>
      {compactResources.length > 0 && (
        <div style={{ padding: '10px 12px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {compactResources.map((item) => (
            <div key={item.key} style={{ border: '1px solid rgba(51,68,85,0.45)', borderRadius: 4, padding: '6px 7px', background: 'rgba(5,10,20,0.35)' }}>
              <div style={{ color: item.color, fontSize: 9, marginBottom: 2 }}>{item.label}</div>
              <div style={{ color: '#aabbcc', fontSize: 10 }}>{formatMassKg(item.value)}</div>
            </div>
          ))}
        </div>
      )}
      {/* Resource groups */}
      {hasAnyResources && (
        <>
          <div style={{ padding: '6px 14px 3px', fontSize: 8, color: '#445566', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t('planet.resources_label')}
          </div>
          {RESOURCE_GROUPS.map((group) => {
            const value = group === 'mineral' ? totalRes!.minerals
              : group === 'volatile' ? totalRes!.volatiles
              : totalRes!.isotopes;
            if (value <= 0) return null;

            const isExpanded = expandedGroup === group;
            const color = GROUP_COLORS[group];
            const barWidth = Math.max(4, (value / maxGroupValue) * 100);

            return (
              <div key={group}>
                {/* Group row */}
                <button
                  onClick={() => {
                    if (playerLevel >= 50 && revealLevel >= 3) {
                      setExpandedGroup(isExpanded ? null : group);
                      setLockedTooltip(null);
                    } else {
                      setLockedTooltip(lockedTooltip === group ? null : group);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '6px 14px',
                    background: isExpanded ? 'rgba(40,60,90,0.2)' : 'none',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'monospace', fontSize: 11, color: '#8899aa',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color, fontSize: 9, width: 8, flexShrink: 0 }}>
                    {isExpanded ? 'v' : '>'}
                  </span>
                  <span style={{ color, minWidth: 0, flex: 1 }}>
                    {t(GROUP_T_KEY[group])}
                  </span>
                  <span style={{ fontSize: 9, color: '#667788', flexShrink: 0 }}>
                    {formatMassKg(value)}
                  </span>
                </button>

                {/* Progress bar */}
                <div style={{ padding: '0 14px 4px 28px' }}>
                  <div style={{
                    height: 3, background: 'rgba(30,40,60,0.6)',
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${barWidth}%`, height: '100%',
                      background: color, borderRadius: 2, opacity: 0.7,
                    }} />
                  </div>
                </div>

                {/* Locked tooltip */}
                {lockedTooltip === group && (playerLevel < 50 || revealLevel < 3) && (
                  <div style={{
                    padding: '4px 14px 6px 28px',
                    fontSize: 9, color: '#556677', fontFamily: 'monospace',
                  }}>
                    {revealLevel < 3 ? t('planet_missions.elements_locked') : t('planet.resources_locked_hint')}
                  </div>
                )}

                {/* Expanded elements */}
                {isExpanded && playerLevel >= 50 && revealLevel >= 3 && totalRes && (
                  <div style={{ padding: '2px 0 4px' }}>
                    {getGroupElements(totalRes.elements, group)
                      .slice(0, 8)
                      .map(([sym, mass]) => {
                        const el = ELEMENTS[sym];
                        const elBarWidth = Math.max(2, (mass / value) * 100);
                        return (
                          <div key={sym} style={{
                            display: 'flex', alignItems: 'center',
                            padding: '2px 14px 2px 28px', fontSize: 10,
                          }}>
                            <span style={{ width: 22, color: '#667788', fontSize: 9 }}>{sym}</span>
                            <div style={{
                              flex: 1, height: 2, background: 'rgba(30,40,60,0.4)',
                              borderRadius: 1, marginRight: 6, overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${elBarWidth}%`, height: '100%',
                                background: color, borderRadius: 1, opacity: 0.5,
                              }} />
                            </div>
                            <span style={{ fontSize: 8, color: '#556677', flexShrink: 0 }}>
                              {formatMassKg(mass)}
                            </span>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Hydrosphere summary */}
      {planet.hydrosphere && planet.hydrosphere.waterCoverageFraction > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(50,65,85,0.3)', margin: '6px 0' }} />
          <div style={{ padding: '4px 14px', fontSize: 8, color: '#445566', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t('planet.hydrosphere_label')}
          </div>
          <div style={{ padding: '4px 14px', fontSize: 11, color: '#7799bb' }}>
            {t('planet.water_label')}: {(planet.hydrosphere.waterCoverageFraction * 100).toFixed(0)}%
            {planet.hydrosphere.iceCapFraction > 0.01 && (
              <span style={{ color: '#8899aa', marginLeft: 8 }}>
                {t('planet.ice_label')}: {(planet.hydrosphere.iceCapFraction * 100).toFixed(0)}%
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
            {t('planet.atmosphere_label')}
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
      {!hasAnyResources && !planet.hydrosphere && !planet.atmosphere && (
        <div style={{ padding: '14px', color: '#445566', fontSize: 11 }}>
          {t('planet.no_resources')}
        </div>
      )}
    </>
  );
}

function DataRow({ label, value, muted = false }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      padding: '4px 0',
      borderBottom: '1px solid rgba(50,60,70,0.18)',
      color: muted ? '#445566' : '#8899aa',
      fontSize: 10,
    }}>
      <span>{label}</span>
      <span style={{ color: muted ? '#445566' : '#aabbcc', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function CharacteristicsTab({ planet, revealLevel }: { planet: Planet; revealLevel: PlanetRevealLevel }) {
  const { t } = useTranslation();
  const unknown = t('planet_info.unknown');
  const locked = t('planet_info.reveal_hint', { level: revealLevel });
  return (
    <div style={{ padding: '10px 14px', maxHeight: '46vh', overflowY: 'auto' }}>
      <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        {t('planet_info.group_physical')}
      </div>
      <DataRow label={t('planet_info.type')} value={planet.type.replace('-', ' ')} />
      <DataRow label={t('planet_info.mass')} value={revealLevel >= 1 ? `${planet.massEarth} M⊕` : locked} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.radius')} value={revealLevel >= 1 ? `${planet.radiusEarth} R⊕` : locked} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.gravity')} value={revealLevel >= 2 ? `${planet.surfaceGravityG}g` : unknown} muted={revealLevel < 2} />
      <DataRow label={t('planet_info.surface_temp')} value={revealLevel >= 1 ? `${planet.surfaceTempK} K (${(planet.surfaceTempK - 273.15).toFixed(0)}°C)` : unknown} muted={revealLevel < 1} />

      <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', margin: '10px 0 6px' }}>
        {t('planet_info.group_orbital')}
      </div>
      <DataRow label={t('planet_info.distance')} value={revealLevel >= 1 ? `${planet.orbit.semiMajorAxisAU.toFixed(3)} AU` : locked} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.period')} value={revealLevel >= 1 ? `${planet.orbit.periodDays.toFixed(1)} ${t('planet_info.days')}` : unknown} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.zone')} value={planet.zone} />

      <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', margin: '10px 0 6px' }}>
        {t('planet_info.group_climate')}
      </div>
      <DataRow label={t('planet_info.pressure')} value={revealLevel >= 2 && planet.atmosphere ? `${planet.atmosphere.surfacePressureAtm} atm` : unknown} muted={revealLevel < 2 || !planet.atmosphere} />
      <DataRow label={t('planet_info.coverage')} value={revealLevel >= 2 && planet.hydrosphere ? `${(planet.hydrosphere.waterCoverageFraction * 100).toFixed(1)}%` : unknown} muted={revealLevel < 2 || !planet.hydrosphere} />
      <DataRow label={t('planet_info.life')} value={revealLevel >= 3 ? (planet.hasLife ? planet.lifeComplexity : t('planet_info.none')) : t('planet_info.surface_expedition_required')} muted={revealLevel < 3} />
    </div>
  );
}

function StatusChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      border: `1px solid ${active ? '#446688' : '#334455'}`,
      borderRadius: 999,
      padding: '3px 7px',
      color: active ? '#7bb8ff' : '#445566',
      background: active ? 'rgba(40,70,100,0.25)' : 'rgba(20,25,35,0.35)',
      fontSize: 9,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function LogisticsTab({
  ships,
  shipments = [],
  targetPlanetId,
  planetResources = {},
  onStartCargoShipment,
}: {
  ships: Ship[];
  shipments?: CargoShipment[];
  targetPlanetId: string;
  planetResources?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  onStartCargoShipment?: (params: { shipId: string; fromPlanetId: string; toPlanetId: string; resource: CargoResource; amount: number }) => void;
}) {
  const { t } = useTranslation();
  const [donorPlanetId, setDonorPlanetId] = useState('');
  const [shipId, setShipId] = useState('');
  const [resource, setResource] = useState<CargoResource>('minerals');
  const [amount, setAmount] = useState(0);
  const cargoShips = ships.filter((ship) => ship.status === 'docked' && !ship.assignmentId);
  const donors = Array.from(new Set(cargoShips.map((ship) => ship.currentPlanetId).filter(Boolean) as string[]))
    .map((planetId) => ({
      planetId,
      ships: cargoShips.filter((ship) => ship.currentPlanetId === planetId),
      resources: planetResources[planetId] ?? { minerals: 0, volatiles: 0, isotopes: 0, water: 0 },
    }))
    .sort((a, b) => b.ships.length - a.ships.length);
  const nearest = donors[0] ?? null;
  const selectedDonorId = donorPlanetId || nearest?.planetId || '';
  const selectedDonor = donors.find((donor) => donor.planetId === selectedDonorId) ?? nearest;
  const availableShips = selectedDonor?.ships ?? [];
  const selectedShip = availableShips.find((ship) => ship.id === shipId) ?? availableShips[0] ?? null;
  const selectedCapacity = selectedShip ? PRODUCIBLE_DEFS[selectedShip.type].cargoCapacity : 0;
  const selectedStock = selectedDonor?.resources[resource] ?? 0;
  const maxAmount = Math.max(0, Math.min(selectedCapacity, Math.floor(selectedStock)));
  const activeShipments = shipments.filter((shipment) => shipment.toPlanetId === targetPlanetId || shipment.fromPlanetId === targetPlanetId);
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(5,10,20,0.75)',
    border: '1px solid #334455',
    borderRadius: 4,
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '7px 8px',
  };
  const startShipment = () => {
    if (!selectedShip || !selectedDonor || maxAmount <= 0 || !onStartCargoShipment) return;
    onStartCargoShipment({
      shipId: selectedShip.id,
      fromPlanetId: selectedDonor.planetId,
      toPlanetId: targetPlanetId,
      resource,
      amount: Math.min(Math.max(1, Math.floor(amount || maxAmount)), maxAmount),
    });
  };
  return (
    <div style={{ padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ color: '#8899aa', fontSize: 10 }}>{t('planet_terminal.logistics_desc')}</div>
      <div style={{ color: '#7bb8ff', fontSize: 11 }}>
        {t('planet_terminal.free_ships', { count: cargoShips.length })}
      </div>
      {nearest ? (
        <div style={{ border: '1px solid rgba(51,68,85,0.5)', borderRadius: 4, padding: 8, background: 'rgba(5,10,20,0.35)' }}>
          <div style={{ color: '#aabbcc', fontSize: 10, marginBottom: 5 }}>
            {t('planet_terminal.nearest_spaceport', { planet: nearest.planetId })}
          </div>
          <div style={{ color: '#667788', fontSize: 9, lineHeight: 1.6 }}>
            {t('planet_terminal.available_cargo', { count: nearest.ships.length })}
            {' · '}
            {t('planet_terminal.resources_short', {
              minerals: Math.floor(nearest.resources.minerals),
              volatiles: Math.floor(nearest.resources.volatiles),
              isotopes: Math.floor(nearest.resources.isotopes),
              water: Math.floor(nearest.resources.water),
            })}
          </div>
        </div>
      ) : (
        <div style={{ color: '#cc8844', fontSize: 10 }}>{t('planet_terminal.no_cargo_ships')}</div>
      )}
      {selectedDonor && selectedShip && (
        <div style={{ display: 'grid', gap: 6 }}>
          <select value={selectedDonor.planetId} onChange={(event) => { setDonorPlanetId(event.target.value); setShipId(''); }} style={inputStyle}>
            {donors.map((donor) => <option key={donor.planetId} value={donor.planetId}>{donor.planetId}</option>)}
          </select>
          <select value={selectedShip.id} onChange={(event) => setShipId(event.target.value)} style={inputStyle}>
            {availableShips.map((ship) => (
              <option key={ship.id} value={ship.id}>
                {ship.name} · {PRODUCIBLE_DEFS[ship.type].cargoCapacity}
              </option>
            ))}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <select value={resource} onChange={(event) => { setResource(event.target.value as CargoResource); setAmount(0); }} style={inputStyle}>
              <option value="minerals">{t('planet_terminal.resource_minerals')}</option>
              <option value="volatiles">{t('planet_terminal.resource_volatiles')}</option>
              <option value="isotopes">{t('planet_terminal.resource_isotopes')}</option>
              <option value="water">{t('planet_terminal.resource_water')}</option>
            </select>
            <input
              value={amount || ''}
              min={0}
              max={maxAmount}
              type="number"
              onChange={(event) => setAmount(Number(event.target.value))}
              placeholder={`${maxAmount}`}
              style={inputStyle}
            />
          </div>
          <button
            disabled={maxAmount <= 0 || !onStartCargoShipment}
            onClick={startShipment}
            style={{
              padding: '8px 10px',
              border: '1px solid #446688',
              borderRadius: 4,
              background: maxAmount > 0 ? 'rgba(40,70,100,0.3)' : 'rgba(20,25,35,0.45)',
              color: maxAmount > 0 ? '#7bb8ff' : '#445566',
              fontFamily: 'monospace',
              fontSize: 10,
              cursor: maxAmount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {t('planet_terminal.send_cargo', { amount: amount || maxAmount })}
          </button>
        </div>
      )}
      {activeShipments.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          {activeShipments.map((shipment) => (
            <div key={shipment.id} style={{ color: '#667788', fontSize: 9 }}>
              {t('planet_terminal.shipment_status', {
                resource: t(`planet_terminal.resource_${shipment.resource}`),
                amount: shipment.amount,
                status: t(`planet_terminal.shipment_${shipment.status}`),
              })}
            </div>
          ))}
        </div>
      )}
      <div style={{ color: '#445566', fontSize: 9 }}>
        {targetPlanetId}
      </div>
    </div>
  );
}

function StatusTab({ revealLevel, terraformState, isColonized }: {
  revealLevel: PlanetRevealLevel;
  terraformState?: PlanetTerraformState;
  isColonized: boolean;
}) {
  const { t } = useTranslation();
  const terraformProgress = terraformState
    ? Object.values(terraformState.params).reduce((sum, param) => sum + param.progress, 0) / 6
    : 0;
  const inTerraform = terraformProgress > 0 && !terraformState?.completedAt;
  return (
    <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <StatusChip label={t('planet_terminal.badge_atmosphere')} active={revealLevel >= 2} />
      <StatusChip label={t('planet_terminal.badge_surface')} active={revealLevel >= 3} />
      <StatusChip label={t('planet_terminal.badge_colonized')} active={isColonized} />
      <StatusChip label={t('planet_terminal.badge_terraforming')} active={inTerraform} />
      <StatusChip label={t('planet_terminal.badge_terraformed')} active={Boolean(terraformState?.completedAt)} />
    </div>
  );
}

/* ────────── Main component ────────── */

export function PlanetContextMenu({
  planet, star, screenPosition, quarks,
  onViewPlanet, onClose,
  onSurface,
  onTelescopePhoto,
  onAdTelescopePhoto,
  isDestroyed,
  surfaceDisabledReason,
  isPhotoGenerating,
  canGenerateSurfacePhotos = false,
  playerLevel,
  canShowAds,
  hasGenesisVault,
  onShowTerraform,
  revealLevel = 0,
  activeMission,
  planetMissionClock = Date.now(),
  missionResources,
  payloadInventory = {},
  colonyBuildings = [],
  onStartMission,
  reportSummary,
  onViewReport,
  explorationMissionsDisabled = false,
  systemResearchProgress = 100,
  canStartSystemResearch = false,
  isSystemResearching = false,
  onStartSystemResearch,
  terraformState,
  isColonized = false,
  cargoShips = [],
  cargoShipments = [],
  planetResourcesById = {},
  onStartCargoShipment,
}: {
  planet: Planet;
  star: Star;
  screenPosition: { x: number; y: number };
  quarks: number;
  onViewPlanet: () => void;
  onShowCharacteristics?: () => void;
  onClose: () => void;
  onSurface?: () => void;
  onTelescopePhoto?: (photoKind: PlanetPhotoKind) => void;
  onAdTelescopePhoto?: (photoKind: PlanetPhotoKind, photoToken: string) => void;
  isDestroyed?: boolean;
  surfaceDisabledReason?: string;
  isPhotoGenerating?: boolean;
  canGenerateSurfacePhotos?: boolean;
  playerLevel: number;
  canShowAds?: boolean;
  /** Whether the player has a Genesis Vault built (enables terraform) */
  hasGenesisVault?: boolean;
  /** Called when the player clicks Terraforming — opens full-screen panel */
  onShowTerraform?: (planet: Planet) => void;
  revealLevel?: PlanetRevealLevel;
  activeMission?: PlanetMission | null;
  planetMissionClock?: number;
  missionResources?: { researchData: number; minerals: number; volatiles: number; isotopes: number; water: number };
  payloadInventory?: Partial<Record<ProducibleType, number>>;
  colonyBuildings?: PlacedBuilding[];
  onStartMission?: (planet: Planet, type: PlanetMissionType) => void;
  reportSummary?: PlanetReportSummary;
  onViewReport?: (planet: Planet, report: PlanetReportSummary) => void;
  explorationMissionsDisabled?: boolean;
  systemResearchProgress?: number;
  canStartSystemResearch?: boolean;
  isSystemResearching?: boolean;
  onStartSystemResearch?: () => void;
  terraformState?: PlanetTerraformState;
  isColonized?: boolean;
  cargoShips?: Ship[];
  cargoShipments?: CargoShipment[];
  planetResourcesById?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  onStartCargoShipment?: (params: { shipId: string; fromPlanetId: string; toPlanetId: string; resource: CargoResource; amount: number }) => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('actions');
  const [expandedGroup, setExpandedGroup] = useState<ResourceGroup | null>(null);
  // Delay backdrop + menu items activation to prevent the touch "click" event
  // (fired ~100ms after the pointerdown that opened the menu) from immediately
  // closing the menu or triggering navigation on mobile.
  const [backdropActive, setBackdropActive] = useState(false);
  const [itemsActive, setItemsActive] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setBackdropActive(true), 150);
    const t2 = setTimeout(() => setItemsActive(true), 220);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Ref to the menu container — used by useLayoutEffect to measure actual
  // rendered height and recompute clamped position on every render.
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  const isDesktop = window.innerWidth >= 768;

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const measuredHeight = menuRef.current.offsetHeight || MENU_HEIGHT_APPROX;
    const MARGIN = 8;

    // Horizontal: center on mobile, near click on desktop
    let left: number;
    if (isDesktop) {
      const maxX = window.innerWidth - MENU_WIDTH - MARGIN;
      left = Math.max(MARGIN, Math.min(screenPosition.x + 8, maxX));
    } else {
      left = (window.innerWidth - MENU_WIDTH) / 2;
      left = Math.max(MARGIN, left);
    }

    // Vertical: try to center around click point, then clamp
    const idealTop = screenPosition.y - measuredHeight / 2;
    const maxTop = Math.max(MARGIN, window.innerHeight - Math.min(measuredHeight, window.innerHeight - MARGIN * 2) - MARGIN);
    const top = Math.max(MARGIN, Math.min(idealTop, maxTop));

    setMenuPos({ left, top });
  }, [activeTab, expandedGroup, screenPosition, isDesktop]);

  const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
  const isSystemAccessible = systemResearchProgress >= 100;
  const unlockedTabs = useMemo(() => {
    const tabs = new Set<TabId>(['actions', 'alpha', 'status']);
    if (isSystemAccessible) {
      tabs.add('characteristics');
      tabs.add('resources');
      tabs.add('logistics');
      tabs.add('terraform');
    }
    return tabs;
  }, [isSystemAccessible]);
  const setGuardedTab = (tab: TabId) => {
    setActiveTab(unlockedTabs.has(tab) ? tab : 'actions');
  };
  const canLaunchTerraform = isTerraformable(planet) && Boolean(hasGenesisVault) && playerLevel >= 48;
  const activeMissionProgress = activeMission ? getPlanetMissionProgress(activeMission, planetMissionClock) : null;
  const availableMissionTypes: PlanetMissionType[] = [
    'orbital_scan',
    'orbital_probe',
    isSolidPlanetForLanding(planet) ? 'surface_landing' : 'deep_atmosphere_probe',
  ];
  const missionTypes: PlanetMissionType[] = explorationMissionsDisabled
    ? []
    : availableMissionTypes.filter((type) => getTargetRevealLevel(type) > revealLevel);
  const getMissionDisabledReason = (type: PlanetMissionType): string | undefined => {
    if (!missionResources) return t('planet_missions.reason.unknown');
    const check = canStartPlanetMission({
      type,
      planet,
      revealLevel,
      activeMissions: activeMission ? [activeMission] : [],
      buildings: colonyBuildings,
      resources: missionResources,
      payloadInventory,
    });
    if (check.canStart) return undefined;
    if (check.reason === 'building_required' && check.requiredBuilding) {
      return t('planet_missions.reason.building_required_named', { building: t(`planet_missions.building.${check.requiredBuilding}`) });
    }
    if (check.reason === 'resources_required' && check.missingResources) {
      const missing = Object.entries(check.missingResources)
        .map(([resource, amount]) => `${resource} ${Math.ceil(Number(amount ?? 0))}`)
        .join(', ');
      return t('planet_missions.reason.resources_required_named', { resources: missing });
    }
    if (check.reason === 'payload_required' && check.requiredPayload) {
      return t('planet_missions.reason.payload_required_named', { payload: t(`planet_missions.payload.${check.requiredPayload}`) });
    }
    return t(`planet_missions.reason.${check.reason ?? 'unknown'}`);
  };

  // Destroyed planets — minimal UI
  if (isDestroyed) {
    const dLeft = isDesktop
      ? Math.max(8, Math.min(screenPosition.x + 8, window.innerWidth - MENU_WIDTH - 8))
      : (window.innerWidth - MENU_WIDTH) / 2;
    const dTop  = Math.max(8, Math.min(screenPosition.y - 20, window.innerHeight - MENU_HEIGHT_APPROX - 8));
    return (
      <>
        <div style={backdropStyle} onClick={backdropActive ? onClose : undefined} />
        <div style={{
          ...menuStyle,
          left: dLeft,
          top: dTop,
        }}>
          <div style={{
            padding: '10px 14px 8px', fontSize: 13, color: '#ccddee',
            borderBottom: '1px solid rgba(50,60,80,0.4)',
          }}>
            {planet.name}
            <span style={{ color: '#884422', marginLeft: 8, fontSize: 10 }}>{t('planet.destroyed_label')}</span>
          </div>
          <div style={{ padding: '14px', color: '#553322', fontSize: 11, fontFamily: 'monospace' }}>
            {t('planet.destroyed_body')}
          </div>
        </div>
      </>
    );
  }

  // Initial position estimate (before first layout measurement).
  // After the first render useLayoutEffect will compute the exact clamped pos.
  const MARGIN = 8;
  const left = menuPos?.left ?? (isDesktop
    ? Math.max(MARGIN, Math.min(screenPosition.x + 8, window.innerWidth - MENU_WIDTH - MARGIN))
    : (window.innerWidth - MENU_WIDTH) / 2);
  const top = menuPos?.top ?? Math.max(MARGIN, Math.min(screenPosition.y - MENU_HEIGHT_APPROX / 2, window.innerHeight - MENU_HEIGHT_APPROX - MARGIN));

  const PHOTO_COST = 25;
  const canAffordPhoto = quarks >= PHOTO_COST;

  return (
    <>
      <div style={backdropStyle} onClick={backdropActive ? onClose : undefined} />
      <div ref={menuRef} style={{ ...menuStyle, left, top, maxHeight: `calc(100vh - ${MARGIN * 2}px)`, overflowY: 'auto' }}>
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
        <TabBar activeTab={activeTab} onChange={setGuardedTab} unlockedTabs={unlockedTabs} />

        {/* ── Tab content ── */}
        <div style={{ padding: '4px 0', minHeight: 80 }}>
          {activeTab === 'actions' && (
            <>
              <div style={{ padding: '9px 14px', fontSize: 10, color: '#8899aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span>{t('planet_terminal.system_research')}</span>
                  <span style={{ color: isSystemAccessible ? '#44ff88' : '#ddaa44' }}>{Math.round(systemResearchProgress)}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(40,55,70,0.75)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, systemResearchProgress)}%`, height: '100%', background: isSystemAccessible ? '#44ff88' : '#ddaa44' }} />
                </div>
              </div>
              {!isSystemAccessible && (
                <MenuItem
                  icon="◎"
                  label={isSystemResearching ? t('planet_terminal.researching') : t('planet_terminal.start_system_research')}
                  onClick={canStartSystemResearch && itemsActive ? onStartSystemResearch : undefined}
                  disabled={!canStartSystemResearch || isSystemResearching}
                  color="#ddaa44"
                />
              )}
              {isSystemAccessible && (
                <div style={{ paddingLeft: 16 }}>
                  <div style={{ padding: '5px 14px 4px', color: '#445566', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {t('planet_missions.section')}
                  </div>
                  <div style={{ padding: '0 14px 6px', color: '#667788', fontSize: 9 }}>
                    {t('planet_missions.reveal_level', { level: revealLevel })}
                  </div>
                  {activeMission && activeMissionProgress && (
                    <div style={{ padding: '5px 14px 8px', color: '#7bb8ff', fontSize: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>{t(`planet_missions.type.${activeMission.type}`)}</span>
                        <span>{formatMissionTime(activeMissionProgress.remainingMs)}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(40,55,70,0.7)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(activeMissionProgress.overallProgress * 100)}%`, height: '100%', background: '#4488aa' }} />
                      </div>
                      <div style={{ marginTop: 4, color: '#556677' }}>
                        {t(`planet_missions.phase.${activeMissionProgress.phase}`)}
                      </div>
                    </div>
                  )}
                  {reportSummary && onViewReport && (
                    <MenuItem
                      icon="□"
                      label={t('planet_missions.view_report')}
                      onClick={() => onViewReport(planet, reportSummary)}
                      color="#ddaa44"
                      right={`T${reportSummary.revealLevel}`}
                    />
                  )}
                  {!explorationMissionsDisabled && missionTypes.map((type) => {
                    const disabledReason = getMissionDisabledReason(type);
                    const payload = computePlanetMissionCost(type, planet).payload;
                    const payloadCount = payload ? (payloadInventory[payload] ?? 0) : 0;
                    return (
                      <MenuItem
                        key={type}
                        icon={type === 'orbital_probe' ? '⊙' : '▽'}
                        label={t(`planet_missions.type.${type}`)}
                        onClick={!disabledReason && onStartMission ? () => onStartMission(planet, type) : undefined}
                        disabled={Boolean(disabledReason) || !onStartMission}
                        title={disabledReason}
                        right={disabledReason ? (payload ? `${payloadCount}` : undefined) : t('planet_missions.start')}
                      />
                    );
                  })}
                </div>
              )}

              {/* ── Terraforming action (conditional) ── */}
              {isSystemAccessible && isTerraformable(planet) && (
                <>
                  <div style={{ height: 1, background: 'rgba(50,65,85,0.4)', margin: '4px 0' }} />
                  {canLaunchTerraform && onShowTerraform ? (
                    <MenuItem
                      icon="*"
                      label={t('planet.action_terraform')}
                      onClick={() => { onShowTerraform(planet); onClose(); }}
                      color="#88cc88"
                    />
                  ) : (
                    <MenuItem
                      icon="*"
                      label={t('planet.action_terraform')}
                      disabled
                      title={t('terraform.reason.genesis_vault_required')}
                      right={playerLevel < 48 ? 'L48' : t('terraform.reason.genesis_vault_required')}
                    />
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'resources' && (
            <ResourcesTab
              planet={planet}
              playerLevel={playerLevel}
              expandedGroup={expandedGroup}
              setExpandedGroup={setExpandedGroup}
              revealLevel={revealLevel}
            />
          )}

          {activeTab === 'characteristics' && (
            <CharacteristicsTab planet={planet} revealLevel={revealLevel} />
          )}

          {activeTab === 'alpha' && (
            <>
              <div style={{
                background: 'linear-gradient(135deg, rgba(30,22,5,0.5) 0%, rgba(15,12,3,0.4) 100%)',
                minHeight: 80,
              }}>
                <div style={{ padding: '8px 14px 3px', fontSize: 8, color: '#886622', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {t('planet.premium_tools')}
                </div>
                {onTelescopePhoto && !isPhotoGenerating && (
                  <>
                    <MenuItem
                      icon="◉"
                      label={<>{t('planet.photo_exosphere_label', { cost: PHOTO_COST })}<QuarkIcon /></>}
                      onClick={canAffordPhoto && itemsActive ? () => onTelescopePhoto('exosphere') : undefined}
                      color={canAffordPhoto ? '#ddaa44' : '#445566'}
                      disabled={!canAffordPhoto}
                    />
                    {canGenerateSurfacePhotos && (
                      <>
                        <MenuItem
                          icon="▣"
                          label={<>{t('planet.photo_biosphere_label', { cost: PHOTO_COST })}<QuarkIcon /></>}
                          onClick={canAffordPhoto && itemsActive ? () => onTelescopePhoto('biosphere') : undefined}
                          color={canAffordPhoto ? '#ddaa44' : '#445566'}
                          disabled={!canAffordPhoto}
                        />
                        <MenuItem
                          icon="▽"
                          label={<>{t('planet.photo_aerial_label', { cost: PHOTO_COST })}<QuarkIcon /></>}
                          onClick={canAffordPhoto && itemsActive ? () => onTelescopePhoto('aerial') : undefined}
                          color={canAffordPhoto ? '#ddaa44' : '#445566'}
                          disabled={!canAffordPhoto}
                        />
                      </>
                    )}
                  </>
                )}
                {onTelescopePhoto && isPhotoGenerating && (
                  <MenuItem
                    icon="◉"
                    label={t('planet.photo_base_label')}
                    disabled
                    right={<span style={{ color: '#4488aa', fontSize: 9 }}>{t('planet.photo_generating')}</span>}
                  />
                )}
                {canShowAds && onAdTelescopePhoto && !isPhotoGenerating && (
                  <div style={{ padding: '4px 8px' }}>
                    <AdProgressButton
                      label={t('planet.photo_ad_label')}
                      progressLabel={t('planet.photo_ad_progress', { done: '{done}', total: '{total}' })}
                      requiredAds={3}
                      adRewardType="planet_photo"
                      onComplete={(photoToken) => onAdTelescopePhoto('exosphere', photoToken)}
                      variant="menu"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'status' && (
            <>
              <MenuItem icon="◎" label={t('nav.exosphere')} onClick={itemsActive ? onViewPlanet : undefined} color="#88ccaa" />
              {isSurfacePlanet && onSurface && (
                surfaceDisabledReason
                  ? <MenuItem icon="▲" label={t('nav.surface_btn')} disabled title={surfaceDisabledReason} right="50+" />
                  : <MenuItem icon="▲" label={t('nav.surface_btn')} onClick={itemsActive ? onSurface : undefined} color="#88ccaa" />
              )}
              {reportSummary && onViewReport && (
                <MenuItem icon="□" label={t('planet_missions.view_report')} onClick={() => onViewReport(planet, reportSummary)} color="#ddaa44" right={`T${reportSummary.revealLevel}`} />
              )}
              <StatusTab revealLevel={revealLevel} terraformState={terraformState} isColonized={isColonized || planet.isHomePlanet} />
            </>
          )}

          {activeTab === 'logistics' && (
            <LogisticsTab
              ships={cargoShips}
              shipments={cargoShipments}
              targetPlanetId={planet.id}
              planetResources={planetResourcesById}
              onStartCargoShipment={onStartCargoShipment}
            />
          )}

          {activeTab === 'terraform' && (
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#8899aa', marginBottom: 8 }}>
                {playerLevel < 48 ? t('planet_terminal.terraform_preview_l48') : t('planet.action_terraform')}
              </div>
              <button
                disabled={!canLaunchTerraform || !onShowTerraform}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  background: 'rgba(20,40,20,0.6)',
                  border: '1px solid #446644',
                  borderRadius: 4,
                  color: '#88cc88',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  cursor: canLaunchTerraform && onShowTerraform ? 'pointer' : 'not-allowed',
                  textAlign: 'left' as const,
                }}
                onClick={() => { if (canLaunchTerraform && onShowTerraform) { onShowTerraform(planet); onClose(); } }}
              >
                {canLaunchTerraform ? `${t('planet.action_terraform')} →` : t('planet_terminal.terraform_requirements_visible')}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
