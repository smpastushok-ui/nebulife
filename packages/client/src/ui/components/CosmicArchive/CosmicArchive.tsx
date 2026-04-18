import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, CatalogEntry, Discovery, TechTreeState, TechBranch } from '@nebulife/core';
import { PlaceholderTab } from './PlaceholderTab';
import { CosmosGallery } from './CosmosGallery';
import { PlanetsCatalog, FavoritesPlanetsList } from './PlanetsCatalog';
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
        { id: 'planets', label: t('archive.sub_planets') },
        { id: 'systems', label: t('archive.sub_systems') },
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
  /** Colony resource totals (for Resources tab) */
  colonyResources?: { minerals: number; volatiles: number; isotopes: number; water: number };
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
}: CosmicArchiveProps, ref: React.Ref<CosmicArchiveHandle>) {
  const { t } = useTranslation();
  const TABS = buildTabs(t);

  // Auto-switch to collections/cosmos tab when highlighting a new save
  const [mainTab, setMainTab] = useState<MainTab>(highlightedType ? 'collections' : 'navigation');
  const [subTabMap, setSubTabMap] = useState<Record<MainTab, SubTab>>({
    collections: 'cosmos',
    management: 'astronomy',
    navigation: 'planets',
    interaction: 'diplomacy',
    log: 'all-events',
  });
  const [visible, setVisible] = useState(false);

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
    if (mainTab === 'navigation' && currentSubTab === 'planets') {
      return (
        <PlanetsCatalog
          allSystems={allSystems}
          aliases={aliases}
          onViewPlanet={handleViewPlanet}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          getResearchProgress={getResearchProgress}
          onStartResearch={onStartResearch}
          canStartResearch={canStartResearch}
          onRenameSystem={onRenameSystem}
          isSystemResearching={isSystemResearching}
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

        {/* Right: Close button (1.5x larger) */}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #334455',
            borderRadius: 3,
            color: '#667788',
            fontFamily: 'monospace',
            fontSize: 18,
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = '#aabbcc';
            (e.target as HTMLElement).style.borderColor = '#667788';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = '#667788';
            (e.target as HTMLElement).style.borderColor = '#334455';
          }}
        >
          X
        </button>
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
