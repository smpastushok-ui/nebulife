import React, { useState, useEffect, useCallback } from 'react';
import type { StarSystem, CatalogEntry } from '@nebulife/core';
import { PlaceholderTab } from './PlaceholderTab';
import { CosmosGallery } from './CosmosGallery';
import { PlanetsCatalog, FavoritesPlanetsList } from './PlanetsCatalog';
import { SystemsList } from './SystemsList';
import { SystemLog } from './SystemLog';
import type { LogEntry } from './SystemLog';

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

const TABS: TabDef[] = [
  {
    id: 'collections',
    label: 'Колекції',
    subTabs: [
      { id: 'cosmos', label: 'Космос' },
      { id: 'life', label: 'Життя' },
      { id: 'surface', label: 'На поверхні' },
    ],
  },
  {
    id: 'management',
    label: 'Управління та Наука',
    subTabs: [
      { id: 'tech', label: 'Технології' },
      { id: 'science', label: 'Наука' },
      { id: 'resources', label: 'Ресурси' },
    ],
  },
  {
    id: 'navigation',
    label: 'Навігація',
    subTabs: [
      { id: 'planets', label: 'Планети' },
      { id: 'systems', label: 'Системи' },
      { id: 'favorites', label: 'Обрані' },
    ],
  },
  {
    id: 'interaction',
    label: 'Взаємодія',
    subTabs: [
      { id: 'diplomacy', label: 'Дипломатія' },
      { id: 'trade', label: 'Торгівля' },
      { id: 'quests', label: 'Квести' },
    ],
  },
  {
    id: 'log',
    label: 'Журнал',
    subTabs: [
      { id: 'all-events', label: 'Бортовий журнал' },
    ],
  },
];

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
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
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
};

const subTabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: '0 24px',
  borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
  flexShrink: 0,
  background: 'rgba(8, 12, 22, 0.5)',
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
// Component
// ---------------------------------------------------------------------------

export function CosmicArchive({
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
}: CosmicArchiveProps) {
  const [mainTab, setMainTab] = useState<MainTab>('navigation');
  const [subTabMap, setSubTabMap] = useState<Record<MainTab, SubTab>>({
    collections: 'cosmos',
    management: 'tech',
    navigation: 'planets',
    interaction: 'diplomacy',
    log: 'all-events',
  });
  const [visible, setVisible] = useState(false);

  // Navigation history for back button
  const [navHistory, setNavHistory] = useState<{ main: MainTab; sub: SubTab }[]>([]);

  // Favorites state (shared between PlanetsCatalog and FavoritesPlanetsList)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nebulife_favorite_planets');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_favorite_planets', JSON.stringify([...favorites]));
    } catch { /* ignore */ }
  }, [favorites]);

  const toggleFavorite = useCallback((planetId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(planetId)) next.delete(planetId);
      else next.add(planetId);
      return next;
    });
  }, []);

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
      return <CosmosGallery playerId={playerId} />;
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
        />
      );
    }
    if (mainTab === 'navigation' && currentSubTab === 'systems') {
      return (
        <SystemsList
          allSystems={allSystems}
          aliases={aliases}
          onNavigate={handleNavigateSystem}
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
      return <SystemLog entries={logEntries} />;
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
            title="Назад"
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
            Центр управлiння
          </span>

          {/* Quick nav: home */}
          <button
            onClick={handleGoHome}
            style={headerIconBtnStyle}
            title="Домівка"
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
            title="Галактика"
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
      <div style={mainTabBarStyle}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            active={mainTab === tab.id}
            onClick={() => changeMainTab(tab.id)}
          />
        ))}
      </div>

      {/* Sub tabs */}
      <div style={subTabBarStyle}>
        {currentTabDef.subTabs.map((sub) => (
          <TabButton
            key={sub.id}
            label={sub.label}
            active={currentSubTab === sub.id}
            onClick={() => selectSubTab(sub.id)}
            small
          />
        ))}
      </div>

      {/* Content */}
      <div style={contentStyle}>{renderContent()}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button sub-component
// ---------------------------------------------------------------------------

function TabButton({
  label,
  active,
  onClick,
  small,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
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
        color: active ? '#ccddee' : hover ? '#8899aa' : '#556677',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
        letterSpacing: small ? 0 : 0.5,
      }}
    >
      {label}
    </button>
  );
}
