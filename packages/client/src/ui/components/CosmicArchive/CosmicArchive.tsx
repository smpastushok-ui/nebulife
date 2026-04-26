import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, CatalogEntry, Discovery, TechTreeState, TechBranch, Planet, PlacedBuilding } from '@nebulife/core';
import type { PlanetTerraformState, PlanetColonyState, TerraformParamId } from '@nebulife/core';
import type { ColonyResources } from '../Terraform/MissionDispatchModal.js';
import { PlaceholderTab } from './PlaceholderTab';
import { CosmosGallery } from './CosmosGallery';
import { PlanetsCatalog, FavoritesPlanetsList } from './PlanetsCatalog';
import { PlanetsCatalogV2 } from './PlanetsCatalogV2.js';
import { ColoniesList } from './ColoniesList.js';
import { SystemsList } from './SystemsList';
import { SystemLog } from './SystemLog';
import type { LogEntry } from './SystemLog';
import type { DiscoveryData } from '../../../api/player-api';
import { TechTreeView } from '../TechTree';
import { TelescopeGallery } from './TelescopeGallery';
import { ResourcesView } from './ResourcesView';
import type { SystemPhotoData } from '../SystemContextMenu';

// Hide scrollbar on tab bars for mobile swipe
const SWIPE_STYLE_ID = 'nebulife-swipe-tabs-style';
if (typeof document !== 'undefined' && !document.getElementById(SWIPE_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = SWIPE_STYLE_ID;
  style.textContent = `
    [data-swipe-tabs]::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Tab structure
// ---------------------------------------------------------------------------

type MainTab = 'collections' | 'management' | 'navigation' | 'interaction' | 'log';
type SubTab = string;

interface TabDef {
  id: MainTab;
  label: string;
  subTabs: { id: SubTab; label: string }[];
}

function buildTabs(t: (key: string) => string): TabDef[] {
  return [
    {
      id: 'navigation',
      label: t('archive.tab_navigation'),
      subTabs: [
        // Order: Systems → Colonies → Planets (V2) → Favorites.
        { id: 'systems', label: t('archive.sub_systems') },
        { id: 'colonies', label: t('archive.sub_colonies') },
        { id: 'planets', label: t('archive.sub_planets') },
        { id: 'favorites', label: t('archive.sub_favorites') },
      ],
    },
    {
      id: 'management',
      label: t('archive.tab_management'),
      subTabs: [
        { id: 'astronomy', label: t('archive.sub_astronomy') },
        { id: 'physics', label: t('archive.sub_physics') },
        { id: 'chemistry', label: t('archive.sub_chemistry') },
        { id: 'biology', label: t('archive.sub_biology') },
        { id: 'resources', label: t('archive.sub_resources') },
      ],
    },
    {
      id: 'collections',
      label: t('archive.tab_collections'),
      subTabs: [
        { id: 'cosmos', label: t('archive.sub_cosmos') },
        { id: 'star-systems', label: t('archive.sub_star_systems') },
        { id: 'planets-photos', label: t('archive.sub_planets_photos') },
        { id: 'surface', label: t('archive.sub_surface') },
        { id: 'life', label: t('archive.sub_life') },
      ],
    },
    {
      id: 'interaction',
      label: t('archive.tab_interaction'),
      subTabs: [
        { id: 'diplomacy', label: t('archive.sub_diplomacy') },
        { id: 'trade', label: t('archive.sub_trade') },
        { id: 'quests', label: t('archive.sub_quests') },
      ],
    },
    {
      id: 'log',
      label: t('archive.tab_log'),
      subTabs: [
        { id: 'all-events', label: t('archive.sub_log') },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CosmicArchiveProps {
  playerId: string;
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  logEntries: LogEntry[];
  getResearchProgress?: (systemId: string) => number;
  onStartResearch?: (systemId: string) => void;
  canStartResearch?: (systemId: string) => boolean;
  onRenameSystem?: (systemId: string, newName: string) => void;
  onClose: () => void;
  onNavigateToSystem: (system: StarSystem) => void;
  onViewPlanetDetail: (system: StarSystem, planetId: string) => void;
  onGoHome: () => void;
  onNavigateToGalaxy: () => void;
  /** Highlight a newly-saved discovery in the gallery */
  highlightedType?: string | null;
  /** Locally-saved entries that may not yet be on the server */
  localEntries?: Map<string, DiscoveryData>;
  /** Whether a system is currently being researched (for scan animation) */
  isSystemResearching?: (systemId: string) => boolean;
  /** Map of object_type → DiscoveryData for checking photo status in log */
  galleryMap?: Map<string, DiscoveryData>;
  /** Callback when user clicks a discovery log entry to (re)open generation flow */
  onOpenDiscovery?: (discovery: Discovery) => void;
  /** Player level for tech tree gating */
  playerLevel?: number;
  /** Tech tree persistent state */
  techTreeState?: TechTreeState;
  /** Callback to research a technology */
  onResearchTech?: (techId: string) => void;
  /** Current research data balance */
  researchData?: number;
  /** Cost to start research */
  researchDataCost?: number;
  /** Favorite planet IDs (managed by parent for cross-device sync) */
  favoritePlanets?: Set<string>;
  /** Callback when favorites change */
  onFavoritesChange?: (favorites: Set<string>) => void;
  /** Telescope photos for collection galleries */
  systemPhotos?: Map<string, SystemPhotoData>;
  /** Colony resource totals (for Resources tab — should be totalResources() aggregate). */
  colonyResources?: { minerals: number; volatiles: number; isotopes: number; water: number };
  /** Per-planet resource balances (Phase 7B). Used in ColoniesList rows. */
  resourcesByPlanet?: Record<string, { minerals: number; volatiles: number; isotopes: number; water: number }>;
  /** Player quarks balance — for premium unlock buttons. */
  quarks?: number;
  /** Instant-unlock ring-locked system via quarks (pricing set in SystemsList). */
  onUnlockViaQuarks?: (systemId: string) => void;
  /** True if the given system was already unlocked via quarks (bypasses ring gate). */
  isQuarkUnlocked?: (systemId: string) => boolean;
  /** Instant-research a system in exchange for quarks — wires Q-shortcut popup. */
  onInstantResearch?: (systemId: string) => void;
  /** Quarks cost for instant research (default 30). */
  instantResearchCost?: number;
  /** Open the global top-up modal — used by the instant-research popup. */
  onOpenTopUp?: () => void;
  /** Planet IDs that have a colony (home planet + colony_hub buildings). */
  colonyPlanetIds?: Set<string>;
  /** System IDs that contain colony planets — used as distance origins. */
  colonySystemIds?: string[];
  /** Terraform states keyed by planet ID. */
  terraformStates?: Record<string, PlanetTerraformState>;
  /** Colony state per planet — for population + building count display. */
  colonyStateByPlanet?: Record<string, PlanetColonyState>;
  /** Navigate directly to a colony planet's surface (closes archive). */
  onOpenColonySurface?: (planet: Planet) => void;
  /** Open Colony Center for a colony planet (closes archive). */
  onOpenColonyCenter?: (planet: Planet) => void;
  /** Per-planet resource getter passed to PlanetsCatalogV2 detail panel. */
  getPlanetResources?: (planetId: string) => ColonyResources;
  /** Opens MissionDispatchModal for the given target planet + paramId. */
  onSendTerraformDelivery?: (targetPlanet: Planet, paramId: TerraformParamId) => void;
  /** Manually trigger terraform completion for a planet. */
  onCompleteTerraform?: (planet: Planet) => void;
  /** Colony planets that can act as donors — passed to dispatch gate checks. */
  donorPlanets?: Planet[];
  /** Current buildings on the active colony surface — used for ship-tier computation. */
  colonyBuildings?: PlacedBuilding[];
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 'calc(40px + env(safe-area-inset-top, 0px))',
  left: 'env(safe-area-inset-left, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
  bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
  zIndex: 9600,
  background: 'rgba(2, 5, 16, 0.98)',
  fontFamily: 'monospace',
  display: 'flex',
  flexDirection: 'column',
  color: '#aabbcc',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px 12px',
  borderBottom: '1px solid rgba(51, 68, 85, 0.4)',
  flexShrink: 0,
};

const mainTabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: '0 24px',
  borderBottom: '1px solid rgba(51, 68, 85, 0.3)',
  flexShrink: 0,
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
};

const subTabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: '0 24px',
  borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
  flexShrink: 0,
  background: 'rgba(8, 12, 22, 0.5)',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '20px 24px',
};

const headerIconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(51, 68, 85, 0.3)',
  borderRadius: 3,
  color: '#667788',
  cursor: 'pointer',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.15s, border-color 0.15s',
  fontFamily: 'monospace',
};

// ---------------------------------------------------------------------------
// Imperative handle for programmatic navigation (used by tutorial)
// ---------------------------------------------------------------------------

export interface CosmicArchiveHandle {
  navigateTo(mainTab: string, subTab: string): void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CosmicArchive = forwardRef<CosmicArchiveHandle, CosmicArchiveProps>(function CosmicArchive({
  playerId,
  allSystems,
  aliases,
  logEntries,
  getResearchProgress,
  onStartResearch,
  canStartResearch,
  onRenameSystem,
  onClose,
  onNavigateToSystem,
  onViewPlanetDetail,
  onGoHome,
  onNavigateToGalaxy,
  highlightedType,
  localEntries,
  isSystemResearching,
  galleryMap,
  onOpenDiscovery,
  playerLevel,
  techTreeState,
  onResearchTech,
  researchData,
  researchDataCost,
  favoritePlanets: externalFavorites,
  onFavoritesChange,
  systemPhotos,
  colonyResources,
  resourcesByPlanet,
  quarks,
  onUnlockViaQuarks,
  isQuarkUnlocked,
  onInstantResearch,
  instantResearchCost,
  onOpenTopUp,
  colonyPlanetIds,
  colonySystemIds,
  terraformStates,
  colonyStateByPlanet,
  onOpenColonySurface,
  onOpenColonyCenter,
  getPlanetResources,
  onSendTerraformDelivery,
  onCompleteTerraform,
  donorPlanets,
  colonyBuildings,
}: CosmicArchiveProps, ref: React.Ref<CosmicArchiveHandle>) {
  const { t } = useTranslation();
  const TABS = buildTabs(t);

  // Auto-switch to collections/cosmos tab when highlighting a new save
  const [mainTab, setMainTab] = useState<MainTab>(highlightedType ? 'collections' : 'navigation');
  const [subTabMap, setSubTabMap] = useState<Record<MainTab, SubTab>>({
    collections: 'cosmos',
    management: 'astronomy',
    navigation: 'systems', // owner-requested default: Systems tab first
    interaction: 'diplomacy',
    log: 'all-events',
  });
  const [visible, setVisible] = useState(false);

  // Terminal-loop mute toggle, persisted per device. Effect at the top of
  // the component applies the volume (0 when muted, 0.4 otherwise).
  const [terminalMuted, setTerminalMuted] = useState<boolean>(() => {
    try { return localStorage.getItem('nebulife_terminal_muted') === '1'; } catch { return false; }
  });
  useEffect(() => {
    // Dynamic import so we don't bloat the initial chunk.
    import('../../../audio/SfxPlayer.js').then(({ setLoopVolume }) => {
      setLoopVolume('terminal-loop.mp3', terminalMuted ? 0 : 0.3);
    }).catch(() => { /* ignore */ });
  }, [terminalMuted]);

  // Expose programmatic navigation for tutorial
  useImperativeHandle(ref, () => ({
    navigateTo(main: string, sub: string) {
      const validMain = TABS.find((t) => t.id === main);
      if (validMain) {
        setMainTab(main as MainTab);
        setSubTabMap((prev) => ({ ...prev, [main]: sub }));
      }
    },
  }), []);

  // Navigation history for back button
  const [navHistory, setNavHistory] = useState<{ main: MainTab; sub: SubTab }[]>([]);

  // Favorites state — use parent-managed state if provided, otherwise local
  const [localFavorites, setLocalFavorites] = useState<Set<string>>(() => {
    if (externalFavorites) return externalFavorites;
    try {
      const raw = localStorage.getItem('nebulife_favorite_planets');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const favorites = externalFavorites ?? localFavorites;

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_favorite_planets', JSON.stringify([...favorites]));
    } catch { /* ignore */ }
  }, [favorites]);

  const toggleFavorite = useCallback((planetId: string) => {
    const updater = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(planetId)) next.delete(planetId);
      else next.add(planetId);
      return next;
    };
    if (onFavoritesChange) {
      onFavoritesChange(updater(favorites));
    } else {
      setLocalFavorites(updater);
    }
  }, [favorites, onFavoritesChange]);

  const currentTabDef = TABS.find((t) => t.id === mainTab)!;
  const currentSubTab = subTabMap[mainTab];

  // Entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Tab change with history tracking
  const changeMainTab = useCallback(
    (tab: MainTab) => {
      if (tab !== mainTab) {
        setNavHistory((prev) => [...prev, { main: mainTab, sub: subTabMap[mainTab] }]);
        setMainTab(tab);
      }
    },
    [mainTab, subTabMap],
  );

  const selectSubTab = useCallback(
    (tab: SubTab) => {
      const current = subTabMap[mainTab];
      if (tab !== current) {
        setNavHistory((prev) => [...prev, { main: mainTab, sub: current }]);
        setSubTabMap((prev) => ({ ...prev, [mainTab]: tab }));
      }
    },
    [mainTab, subTabMap],
  );

  // Back navigation
  const handleBack = useCallback(() => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((h) => h.slice(0, -1));
      setMainTab(prev.main);
      setSubTabMap((m) => ({ ...m, [prev.main]: prev.sub }));
    } else {
      onClose();
    }
  }, [navHistory, onClose]);

  // Navigate to system and close archive
  const handleNavigateSystem = useCallback(
    (system: StarSystem) => {
      onNavigateToSystem(system);
      onClose();
    },
    [onNavigateToSystem, onClose],
  );

  // Navigate to planet detail and close archive
  const handleViewPlanet = useCallback(
    (system: StarSystem, planetId: string) => {
      onViewPlanetDetail(system, planetId);
      onClose();
    },
    [onViewPlanetDetail, onClose],
  );

  const handleGoHome = useCallback(() => {
    onGoHome();
    onClose();
  }, [onGoHome, onClose]);

  const handleGoGalaxy = useCallback(() => {
    onNavigateToGalaxy();
    onClose();
  }, [onNavigateToGalaxy, onClose]);

  // ---------------------------------------------------------------------------
  // Content renderer
  // ---------------------------------------------------------------------------

  const renderContent = () => {
    if (mainTab === 'collections' && currentSubTab === 'cosmos') {
      return <CosmosGallery playerId={playerId} highlightedType={highlightedType} localEntries={localEntries} />;
    }
    if (mainTab === 'collections' && currentSubTab === 'star-systems') {
      return <TelescopeGallery photos={systemPhotos} type="system" allSystems={allSystems} aliases={aliases} />;
    }
    if (mainTab === 'collections' && currentSubTab === 'planets-photos') {
      return <TelescopeGallery photos={systemPhotos} type="planet" allSystems={allSystems} aliases={aliases} />;
    }
    if (mainTab === 'collections' && (currentSubTab === 'surface' || currentSubTab === 'life')) {
      const isLocked = (playerLevel ?? 1) < 50;
      if (isLocked) {
        return (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', minHeight: 300, fontFamily: 'monospace',
            fontSize: 12, color: '#445566', textAlign: 'center', lineHeight: 1.7,
          }}>
            {t('archive.locked_level_50')}
          </div>
        );
      }
      return <PlaceholderTab label={currentSubTab === 'surface' ? t('archive.sub_surface') : t('archive.sub_life')} />;
    }
    if (mainTab === 'navigation' && currentSubTab === 'colonies') {
      return (
        <ColoniesList
          allSystems={allSystems}
          aliases={aliases}
          colonyPlanetIds={colonyPlanetIds ?? new Set()}
          colonyResources={colonyResources}
          resourcesByPlanet={resourcesByPlanet}
          terraformStates={terraformStates}
          colonyStateByPlanet={colonyStateByPlanet}
          onViewPlanet={handleViewPlanet}
          onOpenColonySurface={onOpenColonySurface}
          onOpenColonyCenter={onOpenColonyCenter}
        />
      );
    }
    if (mainTab === 'navigation' && currentSubTab === 'planets') {
      return (
        <PlanetsCatalogV2
          allSystems={allSystems}
          aliases={aliases}
          onViewPlanet={handleViewPlanet}
          colonyPlanetIds={colonyPlanetIds ?? new Set()}
          colonySystemIds={colonySystemIds ?? []}
          terraformStates={terraformStates}
          getPlanetResources={getPlanetResources}
          onSendTerraformDelivery={onSendTerraformDelivery}
          onCompleteTerraform={onCompleteTerraform}
          donorPlanets={donorPlanets}
          techTreeState={techTreeState}
          colonyBuildings={colonyBuildings}
        />
      );
    }
    if (mainTab === 'navigation' && currentSubTab === 'systems') {
      return (
        <SystemsList
          allSystems={allSystems}
          aliases={aliases}
          onNavigate={handleNavigateSystem}
          onStartResearch={onStartResearch}
          canStartResearch={canStartResearch}
          isResearching={isSystemResearching}
          isFullyResearched={getResearchProgress ? (sysId: string) => (getResearchProgress(sysId) >= 100) : undefined}
          getResearchProgress={getResearchProgress}
          isRingLocked={getResearchProgress ? (ringIndex: number) => {
            if (ringIndex <= 1) return false; // Ring 0 (home) and ring 1 always unlocked
            // Ring N locked if ring N-1 has any non-home system not at 100%
            const prevRingSystems = allSystems.filter(
              (s) => s.ringIndex === ringIndex - 1 && s.ownerPlayerId === null,
            );
            return prevRingSystems.some((s) => getResearchProgress(s.id) < 100);
          } : undefined}
          researchData={researchData}
          researchDataCost={researchDataCost}
          onUnlockViaQuarks={onUnlockViaQuarks}
          quarkUnlockCost={30}
          quarksBalance={quarks ?? 0}
          isQuarkUnlocked={isQuarkUnlocked}
          onInstantResearch={onInstantResearch}
          instantResearchCost={instantResearchCost ?? 30}
          onOpenTopUp={onOpenTopUp}
        />
      );
    }
    if (mainTab === 'navigation' && currentSubTab === 'favorites') {
      return (
        <FavoritesPlanetsList
          allSystems={allSystems}
          aliases={aliases}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onViewPlanet={handleViewPlanet}
        />
      );
    }

    if (mainTab === 'log') {
      return (
        <SystemLog
          entries={logEntries}
          galleryMap={galleryMap}
          onOpenDiscovery={onOpenDiscovery}
        />
      );
    }

    // Tech tree branches (all four)
    const techBranches = ['astronomy', 'physics', 'chemistry', 'biology'];
    if (mainTab === 'management' && techBranches.includes(currentSubTab) && techTreeState && onResearchTech) {
      return (
        <TechTreeView
          branch={currentSubTab as TechBranch}
          playerLevel={playerLevel ?? 1}
          techState={techTreeState}
          onResearch={onResearchTech}
        />
      );
    }

    // Resources tab
    if (mainTab === 'management' && currentSubTab === 'resources') {
      return (
        <ResourcesView
          minerals={colonyResources?.minerals ?? 0}
          volatiles={colonyResources?.volatiles ?? 0}
          isotopes={colonyResources?.isotopes ?? 0}
          water={colonyResources?.water ?? 0}
        />
      );
    }

    // Custom messages for specific tabs
    if (mainTab === 'collections' && (currentSubTab === 'life' || currentSubTab === 'surface')) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 300,
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#445566',
            textAlign: 'center',
            lineHeight: 1.7,
          }}
        >
          {t('archive.no_mission_resources')}
        </div>
      );
    }

    // All other tabs => placeholder
    const subLabel =
      currentTabDef.subTabs.find((s) => s.id === currentSubTab)?.label ??
      currentSubTab;
    return <PlaceholderTab label={subLabel} />;
  };

  return (
    <div
      style={{
        ...overlayStyle,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      {/* Header */}
      <div style={headerStyle}>
        {/* Left: Back + Title + Quick nav icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Back button */}
          <button
            onClick={handleBack}
            style={headerIconBtnStyle}
            title={t('common.back')}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#aabbcc';
              e.currentTarget.style.borderColor = '#667788';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#667788';
              e.currentTarget.style.borderColor = 'rgba(51, 68, 85, 0.3)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          {/* Title */}
          <span style={{ fontSize: 15, color: '#ccddee', letterSpacing: 1 }}>
            {t('archive.title')}
          </span>

          {/* Quick nav: home */}
          <button
            onClick={handleGoHome}
            style={headerIconBtnStyle}
            title={t('nav.home')}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#44ff88';
              e.currentTarget.style.borderColor = '#44ff88';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#667788';
              e.currentTarget.style.borderColor = 'rgba(51, 68, 85, 0.3)';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8l6-6 6 6" />
              <path d="M4 8v6h3v-4h2v4h3V8" />
            </svg>
          </button>

          {/* Quick nav: galaxy */}
          <button
            onClick={handleGoGalaxy}
            style={headerIconBtnStyle}
            title={t('nav.back_galaxy')}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#aabbcc';
              e.currentTarget.style.borderColor = '#667788';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#667788';
              e.currentTarget.style.borderColor = 'rgba(51, 68, 85, 0.3)';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <ellipse cx="8" cy="8" rx="7" ry="3" />
              <ellipse cx="8" cy="8" rx="3" ry="7" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>

        {/* Right: mute toggle + close button. Close has the same footprint
            as the top-left nav icons and a red border so it reads as
            "exit/destructive". Mute state persists on device only. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => {
              const next = !terminalMuted;
              setTerminalMuted(next);
              try { localStorage.setItem('nebulife_terminal_muted', next ? '1' : '0'); } catch { /* ignore */ }
            }}
            style={{
              ...headerIconBtnStyle,
              color: terminalMuted ? '#cc4444' : '#667788',
              borderColor: terminalMuted ? 'rgba(204,68,68,0.4)' : 'rgba(51,68,85,0.3)',
            }}
            title={terminalMuted ? t('common.unmute') : t('common.mute')}
          >
            {terminalMuted ? (
              // speaker with slash
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6H5L8 3V13L5 10H3Z" />
                <line x1="11" y1="6" x2="14" y2="9" />
                <line x1="14" y1="6" x2="11" y2="9" />
                <line x1="1" y1="1" x2="15" y2="15" opacity="0.9" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6H5L8 3V13L5 10H3Z" />
                <path d="M10.5 5.5 Q12 8 10.5 10.5" />
                <path d="M12.5 4 Q15 8 12.5 12" opacity="0.6" />
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            style={{
              ...headerIconBtnStyle,
              color: '#cc4444',
              borderColor: 'rgba(204,68,68,0.55)',
              fontSize: 13,
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff6666';
              e.currentTarget.style.borderColor = '#ff6666';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#cc4444';
              e.currentTarget.style.borderColor = 'rgba(204,68,68,0.55)';
            }}
            title={t('common.close')}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main tabs */}
      <div data-swipe-tabs="" style={mainTabBarStyle}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            active={mainTab === tab.id}
            onClick={() => changeMainTab(tab.id)}
            tutorialId={`maintab-${tab.id}`}
          />
        ))}
      </div>

      {/* Sub tabs */}
      <div data-swipe-tabs="" style={subTabBarStyle}>
        {currentTabDef.subTabs.map((sub) => {
          const isLocked = (sub.id === 'surface' || sub.id === 'life') && (playerLevel ?? 1) < 50;
          return (
            <TabButton
              key={sub.id}
              label={isLocked ? `${sub.label} [${t('tech_tree.locked')}]` : sub.label}
              active={currentSubTab === sub.id}
              onClick={() => selectSubTab(sub.id)}
              small
              dimmed={isLocked}
              tutorialId={`subtab-${sub.id}`}
            />
          );
        })}
      </div>

      {/* Content */}
      <div style={contentStyle}>{renderContent()}</div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Tab button sub-component
// ---------------------------------------------------------------------------

function TabButton({
  label,
  active,
  onClick,
  small,
  dimmed,
  tutorialId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
  dimmed?: boolean;
  tutorialId?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      data-tutorial-id={tutorialId}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: active
          ? '2px solid #446688'
          : '2px solid transparent',
        padding: small ? '8px 14px' : '10px 18px',
        fontFamily: 'monospace',
        fontSize: small ? 11 : 12,
        color: dimmed ? '#334455' : active ? '#ccddee' : hover ? '#8899aa' : '#556677',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
        letterSpacing: small ? 0 : 0.5,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
