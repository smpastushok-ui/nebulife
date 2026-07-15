import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Star, ResourceGroup, PlanetMission, PlanetMissionType, PlanetRevealLevel, PlacedBuilding, ProducibleType, PlanetReportSummary, Ship, PlanetTerraformState, CargoShipment, Civilization, CivilizationContactState, ContactStageId, TechTreeState } from '@nebulife/core';
import {
  ELEMENTS, RESOURCE_GROUPS, GROUP_COLORS, getGroupElements, formatMassKg, isTerraformable,
  canStartPlanetMission, computePlanetMissionCost, getPlanetMissionProgress, getTargetRevealLevel, isSolidPlanetForLanding,
  PRODUCIBLE_DEFS,
} from '@nebulife/core';
import { CivilizationTab } from './Civilization/CivilizationTab.js';

/** i18n key for each resource group label */
const GROUP_T_KEY: Record<ResourceGroup, string> = {
  mineral:  'resource_display.desc.minerals_name',
  volatile: 'resource_display.desc.volatiles_name',
  isotope:  'resource_display.desc.isotopes_name',
};
import { derivePlanetVisuals } from '../../game/rendering/PlanetVisuals.js';
import { useSuppressOpeningClick } from '../../game/input/useSuppressOpeningClick.js';
import { PremiumHelpButton } from './PremiumHelp.js';
import { ResourceIcon, RESOURCE_COLORS } from './ResourceIcon.js';

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

type TabId = 'actions' | 'logistics' | 'characteristics' | 'terraform' | 'resources' | 'civilization' | 'alpha';
type PlanetPhotoKind = 'exosphere' | 'biosphere' | 'aerial';
type PlanetSkinKind = 'system' | 'exosphere';
export type CargoResource = 'minerals' | 'volatiles' | 'isotopes' | 'water';

function getPhotoCost(photoKind: PlanetPhotoKind): number {
  return photoKind === 'exosphere' ? 25 : 50;
}

/* ────────── Shared styles ────────── */

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'auto', zIndex: 20,
};

const menuStyle: React.CSSProperties = {
  position: 'fixed',
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

const centeredMenuStyle: React.CSSProperties = {
  ...menuStyle,
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: `min(${MENU_WIDTH}px, calc(100vw - 16px))`,
  maxHeight: 'calc(100vh - 16px)',
  overflowY: 'auto',
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

function MenuItem({ label, onClick, color, icon, right, disabled, title, tutorialId }: {
  label: React.ReactNode;
  onClick?: () => void;
  color?: string;
  icon?: string;
  right?: React.ReactNode;
  disabled?: boolean;
  title?: string;
  tutorialId?: string;
}) {
  const [hover, setHover] = useState(false);
  if (disabled) {
    return (
      <div
        data-tutorial-id={tutorialId}
        style={{ ...itemStyle, cursor: 'help', color: '#445566' }}
        title={title}
        onClick={() => {
          if (title) window.alert(title);
        }}
      >
        {icon && <span style={{ width: 14, textAlign: 'center', opacity: 0.4, flexShrink: 0 }}>{icon}</span>}
        {label}
        {right && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#334455' }}>{right}</span>}
      </div>
    );
  }
  return (
    <button
      data-tutorial-id={tutorialId}
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

function CollapsibleGroup({
  title,
  open,
  onToggle,
  children,
  right,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: '1px solid rgba(50,65,85,0.35)', marginTop: 4 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '9px 14px',
          background: open ? 'rgba(20,35,50,0.45)' : 'rgba(5,10,20,0.18)',
          border: 'none',
          color: '#7bb8ff',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: '#667788', width: 10 }}>{open ? 'v' : '>'}</span>
        <span style={{ flex: 1 }}>{title}</span>
        {right && <span style={{ color: '#667788', fontSize: 9, letterSpacing: 0, textTransform: 'none' }}>{right}</span>}
      </button>
      {open && (
        <div style={{ background: 'rgba(5,10,20,0.20)' }}>
          {children}
        </div>
      )}
    </div>
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
  showCivilizationTab,
}: {
  activeTab: TabId;
  onChange: (t: TabId) => void;
  unlockedTabs: Set<TabId>;
  showCivilizationTab?: boolean;
}) {
  const { t } = useTranslation();
  const tabs: { id: TabId; label: string; color?: string }[] = [
    { id: 'actions', label: t('planet.tab_actions') },
    { id: 'logistics', label: t('planet_terminal.tab_logistics') },
    { id: 'characteristics', label: t('planet.characteristics') },
    { id: 'terraform', label: t('planet_terminal.tab_terraform') },
    { id: 'resources', label: t('planet_terminal.tab_resources') },
    ...(showCivilizationTab ? [{ id: 'civilization' as TabId, label: t('civilization.tab_label'), color: '#7bb8ff' }] : []),
    { id: 'alpha', label: `\u29B3 ${t('planet.tab_premium')}`, color: '#886622' },
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
        const activeColor = tab.color ? '#ddaa44' : '#7bb8ff';
        const activeBg = tab.color ? 'rgba(40,28,8,0.3)' : 'rgba(40,70,110,0.2)';
        const activeBorder = tab.color ? '#ddaa44' : '#7bb8ff';
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
              color: !isUnlocked ? '#334455' : isActive ? activeColor : (tab.color ? '#886622' : '#556677'),
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
  const [waterExpanded, setWaterExpanded] = useState(false);
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
                    if (playerLevel >= 48 && revealLevel >= 3) {
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
                {isExpanded && playerLevel >= 48 && revealLevel >= 3 && totalRes && (
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
          <button
            type="button"
            onClick={() => setWaterExpanded((value) => !value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              padding: '6px 14px',
              background: waterExpanded ? 'rgba(45,80,110,0.20)' : 'none',
              border: 'none',
              color: '#7799bb',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ color: '#4488aa', fontSize: 9, width: 8 }}>{waterExpanded ? 'v' : '>'}</span>
            <span style={{ flex: 1 }}>{t('planet.water_label')}</span>
            <span style={{ color: '#667788', fontSize: 9 }}>{formatMassKg(waterMassKg)}</span>
          </button>
          <div style={{ padding: '0 14px 5px 28px', fontSize: 10, color: '#7799bb' }}>
            {(planet.hydrosphere.waterCoverageFraction * 100).toFixed(0)}%
            {planet.hydrosphere.iceCapFraction > 0.01 && (
              <span style={{ color: '#8899aa', marginLeft: 8 }}>
                {t('planet.ice_label')}: {(planet.hydrosphere.iceCapFraction * 100).toFixed(0)}%
              </span>
            )}
          </div>
          {waterExpanded && (
            <div style={{ padding: '2px 14px 6px 28px', display: 'grid', gap: 4 }}>
              {[
                { label: t('planet.water_liquid'), value: waterMassKg * Math.max(0, 1 - planet.hydrosphere.iceCapFraction), color: '#4488aa' },
                { label: t('planet.water_ice'), value: waterMassKg * planet.hydrosphere.iceCapFraction, color: '#aaccee' },
                { label: 'H', value: waterMassKg * 0.1119, color: '#9fd0ff' },
                { label: 'O', value: waterMassKg * 0.8881, color: '#ccddff' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                  <span style={{ width: 34, color: row.color }}>{row.label}</span>
                  <div style={{ flex: 1, height: 2, background: 'rgba(30,40,60,0.45)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(2, waterMassKg > 0 ? (row.value / waterMassKg) * 100 : 0)}%`, height: '100%', background: row.color, opacity: 0.62 }} />
                  </div>
                  <span style={{ color: '#556677', fontSize: 8 }}>{formatMassKg(row.value)}</span>
                </div>
              ))}
            </div>
          )}
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

function CharacteristicsTab({
  planet,
  revealLevel,
  terraformState,
  isColonized,
}: {
  planet: Planet;
  revealLevel: PlanetRevealLevel;
  terraformState?: PlanetTerraformState;
  isColonized: boolean;
}) {
  const { t } = useTranslation();
  const unknown = t('planet_info.unknown');
  const locked = t('planet_info.reveal_hint', { level: revealLevel });
  const typeKey: Record<string, string> = {
    rocky: 'planet.rocky',
    terrestrial: 'planet.terrestrial',
    'gas-giant': 'planet.gas_giant',
    'ice-giant': 'planet.ice_giant',
    dwarf: 'planet.dwarf',
  };
  const zoneKey: Record<string, string> = {
    inner: 'planet.zone_inner',
    habitable: 'planet.zone_habitable',
    outer: 'planet.zone_outer',
    far: 'planet.zone_far',
  };
  const terraformProgress = terraformState
    ? Object.values(terraformState.params).reduce((sum, param) => sum + param.progress, 0) / 6
    : 0;
  const inTerraform = terraformProgress > 0 && !terraformState?.completedAt;
  return (
    <div style={{ padding: '10px 14px', maxHeight: '46vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <StatusChip label={t('planet_terminal.badge_atmosphere')} active={revealLevel >= 2} />
        <StatusChip label={t('planet_terminal.badge_surface')} active={revealLevel >= 3} />
        <StatusChip label={t('planet_terminal.badge_colonized')} active={isColonized || planet.isHomePlanet} />
        <StatusChip label={t('planet_terminal.badge_terraforming')} active={inTerraform} />
        <StatusChip label={t('planet_terminal.badge_terraformed')} active={Boolean(terraformState?.completedAt)} />
      </div>
      <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        {t('planet_info.group_physical')}
      </div>
      <DataRow label={t('planet_info.type')} value={t(typeKey[planet.type] ?? planet.type)} />
      <DataRow label={t('planet_info.mass')} value={revealLevel >= 1 ? `${planet.massEarth} M⊕` : locked} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.radius')} value={revealLevel >= 1 ? `${planet.radiusEarth} R⊕` : locked} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.gravity')} value={revealLevel >= 2 ? `${planet.surfaceGravityG}g` : unknown} muted={revealLevel < 2} />
      <DataRow label={t('planet_info.surface_temp')} value={revealLevel >= 1 ? `${planet.surfaceTempK} K (${(planet.surfaceTempK - 273.15).toFixed(0)}°C)` : unknown} muted={revealLevel < 1} />

      <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', margin: '10px 0 6px' }}>
        {t('planet_info.group_orbital')}
      </div>
      <DataRow label={t('planet_info.distance')} value={revealLevel >= 1 ? `${planet.orbit.semiMajorAxisAU.toFixed(3)} AU` : locked} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.period')} value={revealLevel >= 1 ? `${planet.orbit.periodDays.toFixed(1)} ${t('planet_info.days')}` : unknown} muted={revealLevel < 1} />
      <DataRow label={t('planet_info.zone')} value={t(zoneKey[planet.zone] ?? planet.zone)} />

      <div style={{ color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', margin: '10px 0 6px' }}>
        {t('planet_info.group_climate')}
      </div>
      <DataRow label={t('planet_info.pressure')} value={revealLevel >= 2 && planet.atmosphere ? `${planet.atmosphere.surfacePressureAtm} atm` : unknown} muted={revealLevel < 2 || !planet.atmosphere} />
      <DataRow label={t('planet_info.coverage')} value={revealLevel >= 2 && planet.hydrosphere ? `${(planet.hydrosphere.waterCoverageFraction * 100).toFixed(1)}%` : unknown} muted={revealLevel < 2 || !planet.hydrosphere} />
      <DataRow label={t('planet_info.life')} value={revealLevel >= 3 ? (planet.hasLife ? t(`planet_info.life_${planet.lifeComplexity}`, { defaultValue: planet.lifeComplexity }) : t('planet_info.none')) : t('planet_info.surface_expedition_required')} muted={revealLevel < 3} />
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

// ── Logistics SVG icon set (procedural, monospace-friendly, stroke=currentColor) ──
const LX_ICON = 15;
function IcoSend() {
  return (
    <svg width={LX_ICON} height={LX_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
      <path d="M3 12 L21 4 L14 21 L11 13 Z" />
    </svg>
  );
}

function CargoShipIcon({ type, capacity, active }: { type: Ship['type']; capacity: number; active: boolean }) {
  const size = capacity >= 1500 ? 48 : capacity >= 500 ? 42 : 36;
  const bodyWidth = capacity >= 1500 ? 17 : capacity >= 500 ? 14 : 11;
  const color = active ? '#7bb8ff' : '#8899aa';
  const accent = type === 'terraform_freighter' ? '#88cc88' : '#7bb8ff';
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill="none" stroke={color} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={`M25 6 L${25 + bodyWidth} 24 L25 32 L${25 - bodyWidth} 24 Z`} fill={active ? 'rgba(68,136,170,0.16)' : 'rgba(5,10,20,0.45)'} />
      <path d={`M${25 - bodyWidth} 24 H${25 + bodyWidth}`} opacity="0.55" />
      <path d={`M${25 - bodyWidth * 0.55} 31 L${25 - bodyWidth * 0.9} 39 M${25 + bodyWidth * 0.55} 31 L${25 + bodyWidth * 0.9} 39`} opacity="0.62" />
      {capacity >= 500 && <path d={`M${25 - bodyWidth - 5} 25 H${25 - bodyWidth} M${25 + bodyWidth} 25 H${25 + bodyWidth + 5}`} opacity="0.76" />}
      {capacity >= 1500 && <path d={`M${25 - bodyWidth - 8} 30 H${25 - bodyWidth + 1} M${25 + bodyWidth - 1} 30 H${25 + bodyWidth + 8}`} opacity="0.68" />}
      <circle cx="25" cy="23" r={capacity >= 1500 ? 3.2 : 2.4} stroke={accent} fill={active ? 'rgba(123,184,255,0.18)' : 'none'} />
      <text x="25" y="47" textAnchor="middle" fill={accent} stroke="none" fontSize="8" fontFamily="monospace">{capacity}</text>
    </svg>
  );
}

const LX_RES_KEYS: CargoResource[] = ['minerals', 'volatiles', 'isotopes', 'water'];

export function LogisticsTab({
  ships,
  shipments = [],
  targetPlanetId,
  planetResources = {},
  targetHasLandingPad = true,
  getDonorResources,
  getCargoRouteLY,
  getPlanetLabel,
  onStartCargoShipment,
}: {
  ships: Ship[];
  shipments?: CargoShipment[];
  targetPlanetId: string;
  planetResources?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  /** Whether cargo unloads directly; without this, deliveries go to orbital cache. */
  targetHasLandingPad?: boolean;
  getDonorResources?: (planetId: string) => { minerals: number; volatiles: number; isotopes: number; water: number };
  getCargoRouteLY?: (fromPlanetId: string, toPlanetId: string) => number | null;
  getPlanetLabel?: (planetId: string) => string;
  onStartCargoShipment?: (params: { shipId: string; fromPlanetId: string; toPlanetId: string; resource: CargoResource; amount: number }) => void;
}) {
  const { t } = useTranslation();
  const [shipType, setShipType] = useState<Ship['type'] | ''>('');
  const [resource, setResource] = useState<CargoResource>('minerals');
  const [amount, setAmount] = useState(0);

  // Resolve a planet's resources by bare id, tolerating scoped `${systemId}::${id}` keys.
  const resolveResources = (planetId: string) => {
    if (getDonorResources) return getDonorResources(planetId);
    if (planetResources[planetId]) return planetResources[planetId];
    const suffix = `::${planetId}`;
    for (const key of Object.keys(planetResources)) {
      if (key === planetId || key.endsWith(suffix)) return planetResources[key];
    }
    return { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
  };

  const cargoShips = ships.filter((ship) => ship.status === 'docked' && !ship.assignmentId);
  // Donor planets = spaceports that hold free cargo ships, excluding the target
  // itself (shipping to self is pointless). Sorted by distance to the target.
  const donors = Array.from(new Set(cargoShips.map((ship) => ship.currentPlanetId).filter(Boolean) as string[]))
    .filter((planetId) => planetId !== targetPlanetId)
    .map((planetId) => ({
      planetId,
      name: getPlanetLabel?.(planetId) ?? planetId,
      distanceLY: getCargoRouteLY?.(planetId, targetPlanetId) ?? null,
      ships: cargoShips.filter((ship) => ship.currentPlanetId === planetId),
      resources: resolveResources(planetId),
    }))
    .sort((a, b) => (a.distanceLY ?? Number.POSITIVE_INFINITY) - (b.distanceLY ?? Number.POSITIVE_INFINITY));

  const selectedDonor = donors[0] ?? null;

  // Group the donor's ships by type → one row per type with a quantity badge.
  const typeGroups = selectedDonor
    ? Array.from(new Set(selectedDonor.ships.map((s) => s.type))).map((type) => {
        const groupShips = selectedDonor.ships.filter((s) => s.type === type);
        return { type, count: groupShips.length, ships: groupShips, capacity: PRODUCIBLE_DEFS[type].cargoCapacity };
      })
    : [];
  const selectedGroup = typeGroups.find((group) => group.type === shipType) ?? typeGroups[0] ?? null;
  const selectedShip = selectedGroup?.ships[0] ?? null;
  const selectedCapacity = selectedGroup?.capacity ?? 0;
  const selectedStock = selectedDonor?.resources[resource] ?? 0;
  const maxAmount = Math.max(0, Math.min(selectedCapacity, Math.floor(selectedStock)));
  const sendAmount = Math.min(Math.max(1, Math.floor(amount || maxAmount)), maxAmount || 0);
  const canSend = Boolean(selectedShip && selectedDonor && maxAmount > 0 && onStartCargoShipment);
  const targetResources = resolveResources(targetPlanetId);

  const activeShipments = shipments.filter((shipment) => shipment.toPlanetId === targetPlanetId || shipment.fromPlanetId === targetPlanetId);

  const fmtLY = (ly: number | null) =>
    ly == null ? '—' : ly <= 0.05 ? t('planet_terminal.same_system') : `${ly.toFixed(1)} ly`;

  const startShipment = () => {
    if (!canSend || !selectedShip || !selectedDonor) return;
    onStartCargoShipment!({
      shipId: selectedShip.id,
      fromPlanetId: selectedDonor.planetId,
      toPlanetId: targetPlanetId,
      resource,
      amount: sendAmount,
    });
  };

  const sectionLabel: React.CSSProperties = { color: '#667788', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 };

  if (donors.length === 0) {
    return (
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <div style={{ color: '#8899aa', fontSize: 10 }}>{t('planet_terminal.logistics_desc')}</div>
        {!targetHasLandingPad && (
          <div style={{ color: '#cc8844', fontSize: 10, lineHeight: 1.5 }}>{t('planet_terminal.orbital_cache_notice')}</div>
        )}
        <div style={{ color: '#cc8844', fontSize: 10 }}>{t('planet_terminal.no_cargo_ships')}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ color: '#8899aa', fontSize: 10 }}>{t('planet_terminal.logistics_desc')}</div>

      {!targetHasLandingPad && (
        <div style={{
          display: 'grid',
          gap: 5,
          padding: '8px 10px',
          border: '1px solid rgba(204,136,68,0.45)',
          borderRadius: 5,
          background: 'rgba(45,28,12,0.28)',
          color: '#cc8844',
          fontSize: 10,
          lineHeight: 1.45,
        }}>
          <div>{t('planet_terminal.orbital_cache_notice')}</div>
          <div style={{ color: '#8899aa' }}>
            {t('planet_terminal.orbital_cache_stock', {
              minerals: Math.floor(targetResources.minerals),
              volatiles: Math.floor(targetResources.volatiles),
              isotopes: Math.floor(targetResources.isotopes),
              water: Math.floor(targetResources.water),
            })}
          </div>
        </div>
      )}

      {selectedDonor && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '7px 9px', border: '1px solid rgba(51,68,85,0.42)', borderRadius: 5,
          background: 'rgba(5,10,20,0.42)', color: '#8899aa', fontSize: 10,
        }}>
          <span style={{ color: '#667788', textTransform: 'uppercase', letterSpacing: 0.7 }}>{t('planet_terminal.nearest_colony')}</span>
          <span style={{ color: '#7bb8ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedDonor.name} · {fmtLY(selectedDonor.distanceLY)}
          </span>
        </div>
      )}

      {/* ── Ship-type picker — one row per type with a quantity badge (×N) ── */}
      {typeGroups.length > 0 && (
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={sectionLabel}>{t('planet_terminal.select_ship')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
            {typeGroups.map((group) => {
              const active = group.type === selectedGroup?.type;
              return (
                <button
                  key={group.type}
                  type="button"
                  title={`${PRODUCIBLE_DEFS[group.type].name} · ${group.capacity}`}
                  onClick={() => { setShipType(group.type); setAmount(0); }}
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 62, padding: '6px 4px',
                    border: `1px solid ${active ? '#446688' : '#334455'}`,
                    borderRadius: 6,
                    background: active ? 'rgba(40,70,100,0.3)' : 'rgba(5,10,20,0.5)',
                    color: active ? '#7bb8ff' : '#aabbcc',
                    fontFamily: 'monospace', cursor: 'pointer',
                  }}
                >
                  <CargoShipIcon type={group.type} capacity={group.capacity} active={active} />
                  <span style={{
                    position: 'absolute', top: 4, right: 5,
                    minWidth: 22, textAlign: 'center', padding: '1px 5px', borderRadius: 999,
                    border: `1px solid ${active ? '#446688' : '#334455'}`,
                    background: 'rgba(2,5,16,0.78)',
                    color: active ? '#7bb8ff' : '#8899aa', fontSize: 9,
                  }}>×{group.count}</span>
                </button>
              );
            })}
          </div>
          {selectedGroup && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', gap: 10,
              padding: '6px 8px', border: '1px solid rgba(51,68,85,0.32)', borderRadius: 4,
              background: 'rgba(5,10,20,0.32)', fontSize: 10,
            }}>
              <span style={{ color: '#aabbcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{PRODUCIBLE_DEFS[selectedGroup.type].name}</span>
              <span style={{ color: '#7bb8ff' }}>{t('planet_terminal.cargo_capacity', { amount: selectedGroup.capacity })}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Resource picker — SVG icon toggles ── */}
      <div style={{ display: 'grid', gap: 5 }}>
        <div style={sectionLabel}>{t('planet_terminal.select_resource')}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {LX_RES_KEYS.map((key) => {
            const active = resource === key;
            const stock = Math.floor(selectedDonor?.resources[key] ?? 0);
            const color = RESOURCE_COLORS[key];
            return (
              <button
                key={key}
                type="button"
                title={`${t(`planet_terminal.resource_${key}`)}: ${stock}`}
                onClick={() => { setResource(key); setAmount(0); }}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 4px',
                  border: `1px solid ${active ? '#446688' : '#334455'}`,
                  borderRadius: 5,
                  background: active ? 'rgba(40,70,100,0.3)' : 'rgba(5,10,20,0.5)',
                  color: active ? color : '#8899aa',
                  fontFamily: 'monospace', cursor: 'pointer',
                }}
              >
                <ResourceIcon type={key} size={16} />
                <span style={{ fontSize: 9, color: active ? color : '#8899aa' }}>{stock}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Amount + send ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <input
          value={amount || ''}
          min={0}
          max={maxAmount}
          type="number"
          onChange={(event) => setAmount(Number(event.target.value))}
          placeholder={`${maxAmount}`}
          style={{
            flex: 1, background: 'rgba(5,10,20,0.75)', border: '1px solid #334455', borderRadius: 5,
            color: '#aabbcc', fontFamily: 'monospace', fontSize: 11, padding: '8px 9px', minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={() => setAmount(maxAmount)}
          disabled={maxAmount <= 0}
          title={t('planet_terminal.max_amount', { defaultValue: 'MAX' })}
          style={{
            padding: '0 10px', border: '1px solid #334455', borderRadius: 5,
            background: 'rgba(5,10,20,0.5)', color: maxAmount > 0 ? '#8899aa' : '#445566',
            fontFamily: 'monospace', fontSize: 9, cursor: maxAmount > 0 ? 'pointer' : 'not-allowed',
          }}
        >MAX</button>
      </div>
      <button
        type="button"
        disabled={!canSend}
        onClick={startShipment}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '9px 10px', border: `1px solid ${canSend ? '#446688' : '#2a3340'}`, borderRadius: 5,
          background: canSend ? 'rgba(40,70,100,0.35)' : 'rgba(20,25,35,0.45)',
          color: canSend ? '#7bb8ff' : '#445566',
          fontFamily: 'monospace', fontSize: 11, cursor: canSend ? 'pointer' : 'not-allowed',
        }}
      >
        <IcoSend />
        {t('planet_terminal.send_cargo', { amount: canSend ? sendAmount : maxAmount })}
      </button>

      {activeShipments.length > 0 && (
        <div style={{ display: 'grid', gap: 4, borderTop: '1px solid rgba(51,68,85,0.4)', paddingTop: 8 }}>
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
    </div>
  );
}

/* ────────── Main component ────────── */

export function PlanetContextMenu({
  planet, star, quarks,
  onViewPlanet, onClose,
  onSurface,
  onTelescopePhoto,
  onGeneratePlanetSkin,
  planetSkinStatus,
  isDestroyed,
  surfaceDisabledReason,
  isPhotoGenerating,
  canGenerateSurfacePhotos = false,
  playerLevel,
  hasGenesisVault,
  onShowTerraform,
  terraformPanelContent,
  targetHasLandingPad = true,
  revealLevel = 0,
  activeMission,
  planetMissionClock = Date.now(),
  missionResources,
  missionResearchDataCost = 1,
  payloadInventory = {},
  carrierInventory = {},
  colonyBuildings = [],
  onStartMission,
  reportSummary,
  onViewReport,
  explorationMissionsDisabled = false,
  systemResearchProgress = 100,
  terraformState,
  isColonized = false,
  cargoShips = [],
  cargoShipments = [],
  planetResourcesById = {},
  getDonorResources,
  getCargoRouteLY,
  getPlanetLabel,
  onStartCargoShipment,
  missionPhotoSaved = false,
  missionPhotoUrl,
  onViewMissionPhoto,
  isFavorite = false,
  onToggleFavorite,
  civilization,
  civilizationContactState = null,
  techTreeState,
  civilizationClock = Date.now(),
  onStartCivilizationContactStage,
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
  onGeneratePlanetSkin?: (kind: PlanetSkinKind) => void;
  planetSkinStatus?: {
    system?: 'generating' | 'pending' | 'processing' | 'succeed' | 'failed';
    exosphere?: 'generating' | 'pending' | 'processing' | 'succeed' | 'failed';
  };
  isDestroyed?: boolean;
  surfaceDisabledReason?: string;
  isPhotoGenerating?: boolean;
  canGenerateSurfacePhotos?: boolean;
  playerLevel: number;
  /** Whether the player has a Genesis Vault built (enables terraform) */
  hasGenesisVault?: boolean;
  /** Called when the player clicks Terraforming — opens full-screen panel */
  onShowTerraform?: (planet: Planet) => void;
  /** Inline terraforming panel rendered directly inside the "Terraforming" tab */
  terraformPanelContent?: React.ReactNode;
  /** Whether cargo unloads directly; without this, deliveries go to orbital cache. */
  targetHasLandingPad?: boolean;
  revealLevel?: PlanetRevealLevel;
  activeMission?: PlanetMission | null;
  planetMissionClock?: number;
  missionResources?: { researchData: number; minerals: number; volatiles: number; isotopes: number; water: number };
  missionResearchDataCost?: number;
  payloadInventory?: Partial<Record<ProducibleType, number>>;
  carrierInventory?: Partial<Record<ProducibleType, number>>;
  colonyBuildings?: PlacedBuilding[];
  onStartMission?: (planet: Planet, type: PlanetMissionType) => void;
  reportSummary?: PlanetReportSummary;
  onViewReport?: (planet: Planet, report: PlanetReportSummary) => void;
  explorationMissionsDisabled?: boolean;
  systemResearchProgress?: number;
  terraformState?: PlanetTerraformState;
  isColonized?: boolean;
  cargoShips?: Ship[];
  cargoShipments?: CargoShipment[];
  planetResourcesById?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  /** Robust per-planet resource resolver (handles scoped `${systemId}::${planetId}` keys). */
  getDonorResources?: (planetId: string) => { minerals: number; volatiles: number; isotopes: number; water: number };
  /** Light-year distance between two planets' systems (null if unknown, 0 if same system). */
  getCargoRouteLY?: (fromPlanetId: string, toPlanetId: string) => number | null;
  /** Human-readable planet name for the logistics picker. */
  getPlanetLabel?: (planetId: string) => string;
  onStartCargoShipment?: (params: { shipId: string; fromPlanetId: string; toPlanetId: string; resource: CargoResource; amount: number }) => void;
  missionPhotoSaved?: boolean;
  missionPhotoUrl?: string | null;
  onViewMissionPhoto?: (planet: Planet, report: PlanetReportSummary, photoUrl: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (planetId: string) => void;
  /** Derived (never persisted) civilization for this planet, if any — see `generateCivilization()`. */
  civilization?: Civilization | null;
  /** Player progress for contacting this planet's civilization. */
  civilizationContactState?: CivilizationContactState | null;
  techTreeState?: TechTreeState;
  civilizationClock?: number;
  onStartCivilizationContactStage?: (planet: Planet, civ: Civilization, stageId: ContactStageId) => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('actions');
  const [expandedGroup, setExpandedGroup] = useState<ResourceGroup | null>(null);
  const [reportsOpen, setReportsOpen] = useState(Boolean(reportSummary));
  // The planet tap that opens this menu is a `pointerdown` (SystemScene),
  // fired before the pointer is released. The SAME gesture's trailing
  // browser `click` is hit-tested against the CURRENT DOM at release time —
  // i.e. against this menu, which has already mounted — and would otherwise
  // instantly land on and activate whichever item now sits under the
  // release point (e.g. "На поверхню"), performing a second, unintended
  // navigation. This suppresses exactly that one trailing click; every
  // subsequent click/tap (or keyboard Enter/Space) activates normally.
  useSuppressOpeningClick(true);

  const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
  const hasSurfaceOrOrbitalView = isSurfacePlanet || planet.type === 'gas-giant' || planet.type === 'ice-giant';
  const isSystemAccessible = systemResearchProgress >= 100;
  // Civilization tab appears once an orbital_scan hints at an anomaly (T1);
  // full detail requires orbital_probe confirmation (T2) — see CivilizationTab.
  const showCivilizationTab = Boolean(civilization) && revealLevel >= 1;
  const unlockedTabs = useMemo(() => {
    const tabs = new Set<TabId>(['actions', 'alpha']);
    if (isSystemAccessible) {
      tabs.add('logistics');
      tabs.add('characteristics');
      if (isTerraformable(planet)) tabs.add('terraform');
      tabs.add('resources');
    }
    if (showCivilizationTab) tabs.add('civilization');
    return tabs;
  }, [isSystemAccessible, planet, showCivilizationTab]);
  const setGuardedTab = (tab: TabId) => {
    setActiveTab(unlockedTabs.has(tab) ? tab : 'actions');
  };
  const hasFullPlanetResearch = revealLevel >= 3;
  // Terraforming gate mirrors the core rules (terraform-rules.ts): the planet must
  // be terraformable, fully researched, and have a Genesis Vault built on a colony.
  // No arbitrary player-level requirement — the Genesis Vault itself unlocks at L18.
  const canLaunchTerraform = isTerraformable(planet) && hasFullPlanetResearch && Boolean(hasGenesisVault);
  const terraformDisabledReason = !hasFullPlanetResearch
    ? t('terraform.reason.full_research_required')
    : t('terraform.reason.genesis_vault_required');
  const activeMissionProgress = activeMission ? getPlanetMissionProgress(activeMission, planetMissionClock) : null;
  const hasDroneReport = reportSummary?.missionType === 'drone_recon' || reportSummary?.missionType === 'surface_landing';
  const availableMissionTypes: PlanetMissionType[] = [
    ...(revealLevel < 1 ? ['orbital_scan' as PlanetMissionType] : []),
    ...(revealLevel >= 1 && revealLevel < 2 ? ['orbital_probe' as PlanetMissionType] : []),
    ...(isSolidPlanetForLanding(planet) && revealLevel >= 2 && revealLevel < 3 && !hasDroneReport ? ['drone_recon' as PlanetMissionType] : []),
    ...(revealLevel >= 2 && revealLevel < 3
      ? [isSolidPlanetForLanding(planet) ? 'surface_landing' as PlanetMissionType : 'deep_atmosphere_probe' as PlanetMissionType]
      : []),
  ];
  const getMissionStartCheck = (type: PlanetMissionType) => {
    if (!missionResources) return null;
    return canStartPlanetMission({
      type,
      planet,
      revealLevel,
      activeMissions: activeMission ? [activeMission] : [],
      buildings: colonyBuildings,
      resources: missionResources,
      payloadInventory,
      carrierInventory,
      researchDataCost: missionResearchDataCost,
    });
  };
  const missionTypes: PlanetMissionType[] = explorationMissionsDisabled
    ? []
    : availableMissionTypes.filter((type) => getMissionStartCheck(type)?.reason !== 'already_revealed');
  const unavailableSurfaceType: PlanetMissionType | null = (
    !explorationMissionsDisabled
    && !isSolidPlanetForLanding(planet)
    && revealLevel < getTargetRevealLevel('surface_landing')
  ) ? 'surface_landing' : null;
  const getMissionDisabledReason = (type: PlanetMissionType): string | undefined => {
    if (!missionResources) return t('planet_missions.reason.unknown');
    const check = getMissionStartCheck(type);
    if (!check) return t('planet_missions.reason.unknown');
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
    if (check.reason === 'carrier_required' && check.requiredCarrier) {
      return t('planet_missions.reason.carrier_required_named', { carrier: t(`planet_missions.payload.${check.requiredCarrier}`) });
    }
    return t(`planet_missions.reason.${check.reason ?? 'unknown'}`);
  };

  // Destroyed planets — minimal UI
  if (isDestroyed) {
    return (
      <>
        <div style={backdropStyle} onClick={onClose} />
        <div style={centeredMenuStyle}>
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

  const exosphereCost = getPhotoCost('exosphere');
  const biosphereCost = getPhotoCost('biosphere');
  const aerialCost = getPhotoCost('aerial');
  const canAffordExosphere = quarks >= exosphereCost;
  const canAffordBiosphere = quarks >= biosphereCost;
  const canAffordAerial = quarks >= aerialCost;
  const exosphereSkinCost = 50;
  const canAffordExosphereSkin = quarks >= exosphereSkinCost;
  const isSkinGenerating = planetSkinStatus?.system === 'generating'
    || planetSkinStatus?.system === 'pending'
    || planetSkinStatus?.system === 'processing'
    || planetSkinStatus?.exosphere === 'generating'
    || planetSkinStatus?.exosphere === 'pending'
    || planetSkinStatus?.exosphere === 'processing';

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={centeredMenuStyle}>
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
        <TabBar activeTab={activeTab} onChange={setGuardedTab} unlockedTabs={unlockedTabs} showCivilizationTab={showCivilizationTab} />

        {/* ── Tab content ── */}
        <div style={{ padding: '4px 0', minHeight: 80 }}>
          {activeTab === 'actions' && (
            <>
              <MenuItem icon="◎" label={t('nav.exosphere')} onClick={onViewPlanet} color="#88ccaa" tutorialId="planet-exosphere-btn" />
              {onToggleFavorite && (
                <MenuItem
                  icon={isFavorite ? '★' : '☆'}
                  label={isFavorite ? t('context.actions.unfavorite') : t('context.actions.favorite')}
                  onClick={() => onToggleFavorite(planet.id)}
                  color={isFavorite ? '#7bb8ff' : '#8899aa'}
                />
              )}
              {hasSurfaceOrOrbitalView && onSurface && (
                surfaceDisabledReason
                  ? <MenuItem icon="▲" label={t('nav.surface_btn')} disabled title={surfaceDisabledReason} right="!" />
                  : <MenuItem icon="▲" label={t('nav.surface_btn')} onClick={onSurface} color="#88ccaa" />
              )}
              {isSystemAccessible && (
                <CollapsibleGroup
                  title={t('planet_missions.research_group')}
                  open={reportsOpen}
                  onToggle={() => setReportsOpen((value) => !value)}
                  right={reportSummary ? `T${reportSummary.revealLevel}` : t('planet_missions.reveal_level_short', { level: revealLevel })}
                >
                  <div style={{ padding: '0 0 6px 16px' }}>
                    <div style={{ padding: '7px 14px 6px', color: '#667788', fontSize: 9 }}>
                      {t('planet_missions.reveal_level', { level: revealLevel })}
                    </div>
                    {reportSummary && onViewReport ? (
                      <>
                        <MenuItem
                          icon="□"
                          label={t('planet_missions.view_report')}
                          onClick={() => onViewReport(planet, reportSummary)}
                          color="#ddaa44"
                          right={`T${reportSummary.revealLevel}`}
                        />
                        {missionPhotoSaved && missionPhotoUrl && onViewMissionPhoto && (
                          <MenuItem
                            icon="◉"
                            label={t('mission_report.view_saved_photo')}
                            onClick={() => onViewMissionPhoto(planet, reportSummary, missionPhotoUrl)}
                            color="#88ccaa"
                          />
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '4px 14px 8px', color: '#445566', fontSize: 10 }}>
                        {t('planet_missions.no_reports')}
                      </div>
                    )}
                    {!explorationMissionsDisabled && missionTypes.map((type) => {
                      const disabledReason = getMissionDisabledReason(type);
                      const payload = computePlanetMissionCost(type, planet, missionResearchDataCost).payload;
                      const payloadCount = payload ? (payloadInventory[payload] ?? 0) : 0;
                      const activeTypeProgress = activeMission?.type === type ? activeMissionProgress : null;
                      return (
                        <div key={type}>
                          <MenuItem
                            icon={type === 'orbital_probe' ? '⊙' : type === 'drone_recon' ? '⌁' : '▽'}
                            label={t(`planet_missions.type.${type}`)}
                            onClick={!disabledReason && onStartMission ? () => onStartMission(planet, type) : undefined}
                            disabled={Boolean(disabledReason) || !onStartMission}
                            title={disabledReason}
                            right={disabledReason ? (payload ? `${payloadCount}` : undefined) : t('planet_missions.start')}
                          />
                          {activeTypeProgress && (
                            <div style={{ padding: '0 14px 8px 36px', color: '#7bb8ff', fontSize: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>{t(`planet_missions.phase.${activeTypeProgress.phase}`)}</span>
                                <span>{Math.round(activeTypeProgress.overallProgress * 100)}% · {formatMissionTime(activeTypeProgress.remainingMs)}</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: 'rgba(40,55,70,0.7)', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.round(activeTypeProgress.overallProgress * 100)}%`, height: '100%', background: '#4488aa' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {unavailableSurfaceType && (
                      <MenuItem
                        icon="▽"
                        label={t('planet_missions.type.surface_landing')}
                        onClick={() => {}}
                        disabled
                        title={getMissionDisabledReason(unavailableSurfaceType)}
                        right={t('planet_missions.reason.surface_unavailable')}
                      />
                    )}
                  </div>
                </CollapsibleGroup>
              )}
            </>
          )}

          {activeTab === 'logistics' && (
            <LogisticsTab
              ships={cargoShips}
              shipments={cargoShipments}
              targetPlanetId={planet.id}
              targetHasLandingPad={targetHasLandingPad}
              planetResources={planetResourcesById}
              getDonorResources={getDonorResources}
              getCargoRouteLY={getCargoRouteLY}
              getPlanetLabel={getPlanetLabel}
              onStartCargoShipment={onStartCargoShipment}
            />
          )}

          {activeTab === 'terraform' && (
            <>
              {isTerraformable(planet) ? (
                canLaunchTerraform ? (
                  terraformPanelContent ?? (
                    <div style={{ padding: '10px 14px', color: '#667788', fontSize: 10 }}>
                      {t('planet_terminal.terraform_requirements_visible')}
                    </div>
                  )
                ) : (
                  <MenuItem
                    icon="*"
                    label={t('planet.action_terraform')}
                    disabled
                    title={terraformDisabledReason}
                    right={terraformDisabledReason}
                  />
                )
              ) : (
                <div style={{ padding: '10px 14px', color: '#667788', fontSize: 10 }}>
                  {t('planet_terminal.terraform_requirements_visible')}
                </div>
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
            <CharacteristicsTab
              planet={planet}
              revealLevel={revealLevel}
              terraformState={terraformState}
              isColonized={isColonized}
            />
          )}

          {activeTab === 'civilization' && civilization && techTreeState && (
            <CivilizationTab
              civ={civilization}
              revealLevel={revealLevel}
              playerLevel={playerLevel}
              techTreeState={techTreeState}
              contactState={civilizationContactState}
              clock={civilizationClock}
              onStartStage={(stageId) => onStartCivilizationContactStage?.(planet, civilization, stageId)}
            />
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
                {onGeneratePlanetSkin && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <MenuItem
                          icon="◍"
                          label={planetSkinStatus?.exosphere === 'succeed'
                            ? t('planet.skin_exosphere_ready')
                            : <>{t('planet.skin_exosphere_label', { cost: exosphereSkinCost })}<QuarkIcon /></>}
                          onClick={!isSkinGenerating && planetSkinStatus?.exosphere !== 'succeed' && canAffordExosphereSkin
                            ? () => onGeneratePlanetSkin('exosphere')
                            : undefined}
                          color={planetSkinStatus?.exosphere === 'succeed' ? '#88ccaa' : canAffordExosphereSkin ? '#ddaa44' : '#445566'}
                          disabled={isSkinGenerating || planetSkinStatus?.exosphere === 'succeed' || !canAffordExosphereSkin}
                          right={planetSkinStatus?.exosphere && planetSkinStatus.exosphere !== 'succeed'
                            ? <span style={{ color: '#4488aa', fontSize: 9 }}>{t('planet.skin_generating')}</span>
                            : undefined}
                        />
                      </div>
                      <div style={{ paddingRight: 12 }}>
                        <PremiumHelpButton helpId="planet-skin" />
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(80,65,35,0.35)', margin: '4px 0' }} />
                  </>
                )}
                {onTelescopePhoto && !isPhotoGenerating && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <MenuItem
                          icon="◉"
                          label={<>{t('planet.photo_exosphere_label', { cost: exosphereCost })}<QuarkIcon /></>}
                          onClick={canAffordExosphere ? () => onTelescopePhoto('exosphere') : undefined}
                          color={canAffordExosphere ? '#ddaa44' : '#445566'}
                          disabled={!canAffordExosphere}
                        />
                      </div>
                      <div style={{ paddingRight: 12 }}>
                        <PremiumHelpButton helpId="planet-photo-exosphere" />
                      </div>
                    </div>
                    {canGenerateSurfacePhotos && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <MenuItem
                              icon="▣"
                              label={<>{t('planet.photo_biosphere_label', { cost: biosphereCost })}<QuarkIcon /></>}
                              onClick={canAffordBiosphere ? () => onTelescopePhoto('biosphere') : undefined}
                              color={canAffordBiosphere ? '#ddaa44' : '#445566'}
                              disabled={!canAffordBiosphere}
                            />
                          </div>
                          <div style={{ paddingRight: 12 }}>
                            <PremiumHelpButton helpId="planet-photo-biosphere" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <MenuItem
                              icon="▽"
                              label={<>{t('planet.photo_aerial_label', { cost: aerialCost })}<QuarkIcon /></>}
                              onClick={canAffordAerial ? () => onTelescopePhoto('aerial') : undefined}
                              color={canAffordAerial ? '#ddaa44' : '#445566'}
                              disabled={!canAffordAerial}
                            />
                          </div>
                          <div style={{ paddingRight: 12 }}>
                            <PremiumHelpButton helpId="planet-photo-aerial" />
                          </div>
                        </div>
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
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
