import React, { useState, useEffect, useCallback } from 'react';
import type { StarSystem, CatalogEntry } from '@nebulife/core';
import { PlaceholderTab } from './PlaceholderTab';
import { CosmosGallery } from './CosmosGallery';
import { PlanetsCatalog } from './PlanetsCatalog';
import { SystemsList } from './SystemsList';

// ---------------------------------------------------------------------------
// Tab structure
// ---------------------------------------------------------------------------

type MainTab = 'collections' | 'management' | 'navigation' | 'interaction';
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
      { id: 'home', label: 'Домівка' },
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
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CosmicArchiveProps {
  playerId: string;
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onClose: () => void;
  onNavigateToSystem: (system: StarSystem) => void;
  onViewPlanetDetail: (system: StarSystem, planetId: string) => void;
  onGoHome: () => void;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CosmicArchive({
  playerId,
  allSystems,
  aliases,
  onClose,
  onNavigateToSystem,
  onViewPlanetDetail,
  onGoHome,
}: CosmicArchiveProps) {
  const [mainTab, setMainTab] = useState<MainTab>('collections');
  const [subTabMap, setSubTabMap] = useState<Record<MainTab, SubTab>>({
    collections: 'cosmos',
    management: 'tech',
    navigation: 'planets',
    interaction: 'diplomacy',
  });
  const [visible, setVisible] = useState(false);

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

  const selectSubTab = useCallback(
    (tab: SubTab) => {
      setSubTabMap((prev) => ({ ...prev, [mainTab]: tab }));
    },
    [mainTab],
  );

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
    if (mainTab === 'navigation' && currentSubTab === 'home') {
      const homeSystem = allSystems.find((s) =>
        s.planets.some((p) => p.isHomePlanet),
      );
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            minHeight: 300,
          }}
        >
          {homeSystem && (
            <div style={{ fontSize: 12, color: '#667788', textAlign: 'center' }}>
              Домашня система: {aliases[homeSystem.id] || homeSystem.name}
            </div>
          )}
          <button
            onClick={handleGoHome}
            style={{
              padding: '12px 28px',
              background: 'rgba(20, 40, 60, 0.6)',
              border: '1px solid #446688',
              borderRadius: 4,
              color: '#44ff88',
              fontFamily: 'monospace',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.borderColor = '#66ffaa';
              (e.target as HTMLElement).style.background = 'rgba(30, 60, 80, 0.7)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.borderColor = '#446688';
              (e.target as HTMLElement).style.background = 'rgba(20, 40, 60, 0.6)';
            }}
          >
            Повернутися на домівку
          </button>
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
        <div style={{ fontSize: 15, color: '#ccddee', letterSpacing: 1 }}>
          Космічний Архів
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #334455',
            borderRadius: 3,
            color: '#667788',
            fontFamily: 'monospace',
            fontSize: 13,
            padding: '4px 10px',
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
            onClick={() => setMainTab(tab.id)}
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
