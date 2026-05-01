import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Star, ResourceGroup, PlanetMission, PlanetMissionType, PlanetRevealLevel, PlacedBuilding, ProducibleType, PlanetReportSummary } from '@nebulife/core';
import {
  ELEMENTS, RESOURCE_GROUPS, GROUP_COLORS, getGroupElements, formatMassKg, isTerraformable,
  canStartPlanetMission, computePlanetMissionCost, getPlanetMissionProgress, isSolidPlanetForLanding,
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

const MENU_WIDTH = 250;
const MENU_HEIGHT_APPROX = 360;

type TabId = 'actions' | 'resources' | 'premium' | 'terraform';

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

function TooltipHint({ text }: { text: string }) {
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const showTip = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setTipPos({ left: r.right - 200, top: r.bottom + 4 });
    }
  };

  return (
    <div style={{ position: 'relative', marginRight: 10, flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); tipPos ? setTipPos(null) : showTip(); }}
        onMouseEnter={showTip}
        onMouseLeave={() => setTipPos(null)}
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
      {tipPos && (
        <div style={{
          position: 'fixed',
          left: Math.max(4, tipPos.left),
          top: tipPos.top,
          width: 200,
          padding: '8px 10px',
          background: 'rgba(8,12,22,0.97)',
          border: '1px solid #334455',
          borderRadius: 4,
          fontSize: 9,
          color: '#8899aa',
          lineHeight: 1.5,
          fontFamily: 'monospace',
          zIndex: 35,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}>
          {text}
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
  showTerraformTab,
}: {
  activeTab: TabId;
  onChange: (t: TabId) => void;
  showTerraformTab: boolean;
}) {
  const { t } = useTranslation();
  const tabs: { id: TabId; label: string; color?: string }[] = [
    { id: 'actions', label: t('planet.tab_actions') },
    { id: 'resources', label: t('planet.tab_resources') },
    { id: 'premium', label: `\u29B3 ${t('planet.tab_premium')}`, color: '#886622' },
    ...(showTerraformTab ? [{ id: 'terraform' as TabId, label: t('planet.tab_terraform'), color: '#446644' }] : []),
  ];

  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid rgba(50,65,85,0.5)',
    }}>
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
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
              flex: 1,
              padding: '7px 0',
              fontSize: 9,
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive ? activeColor : (tab.color ? (tab.id === 'terraform' ? '#448844' : '#886622') : '#556677'),
              background: isActive ? activeBg : 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${activeBorder}` : '2px solid transparent',
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

  // Compute max group value for proportional bars
  const maxGroupValue = totalRes
    ? Math.max(totalRes.minerals, totalRes.volatiles, totalRes.isotopes, 1)
    : 1;

  if (revealLevel < 2) {
    return (
      <div style={{ padding: '14px', color: '#445566', fontSize: 11 }}>
        {t('planet_missions.resources_locked')}
      </div>
    );
  }

  return (
    <>
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

/* ────────── Main component ────────── */

export function PlanetContextMenu({
  planet, star, screenPosition, quarks,
  onViewPlanet, onShowCharacteristics, onClose,
  onSurface,
  onTelescopePhoto,
  onAdTelescopePhoto,
  isDestroyed,
  surfaceDisabledReason,
  isPhotoGenerating,
  planetHasPhoto,
  onViewPlanetPhoto,
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
  onAdTelescopePhoto?: (photoToken: string) => void;
  isDestroyed?: boolean;
  surfaceDisabledReason?: string;
  isPhotoGenerating?: boolean;
  planetHasPhoto?: boolean;
  onViewPlanetPhoto?: () => void;
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
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('actions');
  const [expandedGroup, setExpandedGroup] = useState<ResourceGroup | null>(null);
  const [researchGroupExpanded, setResearchGroupExpanded] = useState(false);
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
    const top = Math.max(MARGIN, Math.min(idealTop, window.innerHeight - measuredHeight - MARGIN));

    setMenuPos({ left, top });
  }, [researchGroupExpanded, activeTab, expandedGroup, screenPosition, isDesktop]);

  const isSurfacePlanet = planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
  const showTerraformTab = isTerraformable(planet) && Boolean(hasGenesisVault);
  const activeMissionProgress = activeMission ? getPlanetMissionProgress(activeMission, planetMissionClock) : null;
  const missionTypes: PlanetMissionType[] = [
    'orbital_scan',
    'orbital_probe',
    isSolidPlanetForLanding(planet) ? 'surface_landing' : 'deep_atmosphere_probe',
  ];
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
      <div ref={menuRef} style={{ ...menuStyle, left, top }}>
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
        <TabBar activeTab={activeTab} onChange={setActiveTab} showTerraformTab={showTerraformTab} />

        {/* ── Tab content ── */}
        <div style={{ padding: '4px 0', minHeight: 80 }}>
          {activeTab === 'actions' && (
            <>
              <MenuItem icon="◎" label={t('nav.exosphere')} onClick={itemsActive ? onViewPlanet : undefined} color="#88ccaa" />
              {isSurfacePlanet && onSurface && (
                surfaceDisabledReason
                  ? <MenuItem icon="▲" label={t('nav.surface_btn')} disabled title={surfaceDisabledReason} right="50+" />
                  : <MenuItem icon="▲" label={t('nav.surface_btn')} onClick={itemsActive ? onSurface : undefined} color="#88ccaa" />
              )}

              {/* ── Research collapsible group ── */}
              <div style={{ height: 1, background: 'rgba(50,65,85,0.4)', margin: '4px 0' }} />
              <button
                style={{
                  ...itemStyle,
                  background: researchGroupExpanded ? itemHoverBg : 'none',
                  color: '#8899aa',
                }}
                onClick={() => setResearchGroupExpanded((v) => !v)}
              >
                <span style={{ width: 14, textAlign: 'center', opacity: 0.6, flexShrink: 0 }}>+</span>
                {t('planet.action_research')}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#556677' }}>
                  {researchGroupExpanded ? 'v' : '>'}
                </span>
              </button>
              {researchGroupExpanded && (
                <div style={{ paddingLeft: 16 }}>
                  <MenuItem
                    icon="☰"
                    label={t('planet.characteristics')}
                    onClick={onShowCharacteristics}
                    right="›"
                  />
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
                  {missionTypes.map((type) => {
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
              {isTerraformable(planet) && (
                <>
                  <div style={{ height: 1, background: 'rgba(50,65,85,0.4)', margin: '4px 0' }} />
                  {hasGenesisVault && onShowTerraform ? (
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
                      right={t('terraform.reason.genesis_vault_required')}
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

          {activeTab === 'terraform' && showTerraformTab && onShowTerraform && (
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#8899aa', marginBottom: 8 }}>
                {t('planet.action_terraform')}
              </div>
              <button
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  background: 'rgba(20,40,20,0.6)',
                  border: '1px solid #446644',
                  borderRadius: 4,
                  color: '#88cc88',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                }}
                onClick={() => { onShowTerraform(planet); onClose(); }}
              >
                {t('planet.action_terraform')} &rarr;
              </button>
            </div>
          )}

          {activeTab === 'premium' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30,22,5,0.5) 0%, rgba(15,12,3,0.4) 100%)',
              minHeight: 80,
            }}>
              <div style={{ padding: '8px 14px 3px', fontSize: 8, color: '#886622', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {t('planet.premium_tools')}
              </div>
              {/* Telescope photo */}
              {planetHasPhoto && onViewPlanetPhoto && (
                <MenuItem
                  icon="◉"
                  label={t('planet.photo_view_label')}
                  onClick={onViewPlanetPhoto}
                  color="#7bb8ff"
                />
              )}
              {!planetHasPhoto && onTelescopePhoto && !isPhotoGenerating && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <MenuItem
                      icon="◉"
                      label={<>{t('planet.photo_label', { cost: PHOTO_COST })}<QuarkIcon /></>}
                      onClick={canAffordPhoto ? onTelescopePhoto : undefined}
                      color={canAffordPhoto ? '#ddaa44' : '#445566'}
                      disabled={!canAffordPhoto}
                    />
                  </div>
                  <TooltipHint text={t('planet.photo_tooltip')} />
                </div>
              )}
              {!planetHasPhoto && onTelescopePhoto && isPhotoGenerating && (
                <MenuItem
                  icon="◉"
                  label={t('planet.photo_base_label')}
                  disabled
                  right={<span style={{ color: '#4488aa', fontSize: 9 }}>{t('planet.photo_generating')}</span>}
                />
              )}
              {/* Ad-funded planet photo (native only) */}
              {canShowAds && onAdTelescopePhoto && !isPhotoGenerating && (
                <div style={{ padding: '4px 8px' }}>
                  <AdProgressButton
                    label={t('planet.photo_ad_label')}
                    progressLabel={t('planet.photo_ad_progress', { done: '{done}', total: '{total}' })}
                    requiredAds={3}
                    adRewardType="planet_photo"
                    onComplete={onAdTelescopePhoto}
                    variant="menu"
                  />
                </div>
              )}
              {/* Future premium tools will go here */}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
