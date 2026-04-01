import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem, Planet, Star } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabbff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4e8',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

/**
 * Derive a representative CSS hex color for a planet chip
 * based on physical properties (simplified version of PlanetVisuals.ts).
 */
function getPlanetChipColor(planet: Planet, _star: Star): string {
  if (planet.isHomePlanet) return '#44ff88';

  const t = planet.surfaceTempK;

  // Gas giant
  if (planet.type === 'gas-giant') {
    if (t > 1000) return '#cc5522'; // hot jupiter
    if (t > 400) return '#cc9955';  // warm
    return '#aa8855';               // cold saturn-like
  }

  // Ice giant
  if (planet.type === 'ice-giant') {
    if (t > 200) return '#5588aa';
    return '#3366aa'; // neptune-like
  }

  // Rocky/dwarf with life
  if (planet.hasLife) {
    if (planet.lifeComplexity === 'intelligent' || planet.lifeComplexity === 'multicellular')
      return '#2a8a3a';
    return '#6a8a5a'; // microbial
  }

  // Rocky/dwarf by temperature
  if (t > 1200) return '#aa3300';  // lava
  if (t > 600) return '#aa5533';   // venus-like
  if (t > 373) return '#bb9966';   // warm desert
  if (t > 273) return '#887766';   // temperate rock
  if (t > 200) return '#8899aa';   // cold frosted
  return '#aabbcc';                 // frozen
}

// ---------------------------------------------------------------------------
// Tooltip component
// ---------------------------------------------------------------------------

function HeaderIcon({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip: string;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            padding: '6px 10px',
            background: 'rgba(10, 15, 25, 0.96)',
            border: '1px solid #446688',
            borderRadius: 4,
            fontSize: 10,
            color: '#aabbcc',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetsCatalog
// ---------------------------------------------------------------------------

interface PlanetsCatalogProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (planetId: string) => void;
  getResearchProgress?: (systemId: string) => number;
  onStartResearch?: (systemId: string) => void;
  canStartResearch?: (systemId: string) => boolean;
  onRenameSystem?: (systemId: string, newName: string) => void;
  isSystemResearching?: (systemId: string) => boolean;
}

export function PlanetsCatalog({
  allSystems,
  aliases,
  onViewPlanet,
  favorites,
  onToggleFavorite,
  getResearchProgress,
  onStartResearch,
  canStartResearch,
  onRenameSystem,
  isSystemResearching,
}: PlanetsCatalogProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nebulife_pinned_systems');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Saved order of systems (by id)
  const [systemOrder, setSystemOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('nebulife_system_order');
      return raw ? JSON.parse(raw) as string[] : [];
    } catch {
      return [];
    }
  });

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragStartY = useRef(0);
  const touchDragId = useRef<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    planetId: string;
    systemId: string;
    x: number;
    y: number;
  } | null>(null);

  // Rename input state
  const [renamingSystemId, setRenamingSystemId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  // Save pinned state
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_pinned_systems', JSON.stringify([...pinned]));
    } catch { /* ignore */ }
  }, [pinned]);

  // Save system order
  useEffect(() => {
    try {
      localStorage.setItem('nebulife_system_order', JSON.stringify(systemOrder));
    } catch { /* ignore */ }
  }, [systemOrder]);

  // Focus rename input
  useEffect(() => {
    if (renamingSystemId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSystemId]);

  // Sort: home first, then by saved order, then pinned, then rest
  const sortedSystems = useMemo(() => {
    const withPlanets = allSystems.filter((s) => s.planets.length > 0);

    return withPlanets.sort((a, b) => {
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;

      // Custom order
      const aIdx = systemOrder.indexOf(a.id);
      const bIdx = systemOrder.indexOf(b.id);
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;

      const aPinned = pinned.has(a.id) ? -1 : 0;
      const bPinned = pinned.has(b.id) ? -1 : 0;
      if (aPinned !== bPinned) return aPinned - bPinned;

      return 0;
    });
  }, [allSystems, pinned, systemOrder]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePlanetClick = useCallback((system: StarSystem, planetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({
      planetId,
      systemId: system.id,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 160),
    });
  }, []);

  // ── Drag & drop handlers ──────────────────────────────────────────────

  const handleDragStart = useCallback((systemId: string) => {
    setDragId(systemId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, systemId: string) => {
    e.preventDefault();
    if (dragId && dragId !== systemId) {
      setDragOverId(systemId);
    }
  }, [dragId]);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    // Reorder
    const ids = sortedSystems.map((s) => s.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...ids];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragId);
    setSystemOrder(newOrder);
    setDragId(null);
    setDragOverId(null);
  }, [dragId, sortedSystems]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  // ── Touch drag handlers ───────────────────────────────────────────────

  const handleTouchStart = useCallback((systemId: string, e: React.TouchEvent) => {
    touchDragId.current = systemId;
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDragId.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest('[data-system-id]');
    if (row) {
      const targetId = row.getAttribute('data-system-id');
      if (targetId && targetId !== touchDragId.current) {
        setDragOverId(targetId);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDragId.current && dragOverId) {
      const fromId = touchDragId.current;
      const ids = sortedSystems.map((s) => s.id);
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(dragOverId);
      if (fromIdx >= 0 && toIdx >= 0) {
        const newOrder = [...ids];
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, fromId);
        setSystemOrder(newOrder);
      }
    }
    touchDragId.current = null;
    setDragOverId(null);
  }, [dragOverId, sortedSystems]);

  // ── Rename handlers ───────────────────────────────────────────────────

  const startRenaming = useCallback((systemId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSystemId(systemId);
    setRenameValue(currentName);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingSystemId && renameValue.trim() && onRenameSystem) {
      onRenameSystem(renamingSystemId, renameValue.trim());
    }
    setRenamingSystemId(null);
    setRenameValue('');
  }, [renamingSystemId, renameValue, onRenameSystem]);

  const cancelRename = useCallback(() => {
    setRenamingSystemId(null);
    setRenameValue('');
  }, []);

  // ── Research click handler ────────────────────────────────────────────

  const handleResearchClick = useCallback((systemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartResearch && canStartResearch?.(systemId)) {
      onStartResearch(systemId);
    }
  }, [onStartResearch, canStartResearch]);

  if (sortedSystems.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        {t('archive.no_systems')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 44px 44px 44px 36px 28px',
          gap: 0,
          padding: '4px 12px 6px',
          alignItems: 'center',
          borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
          marginBottom: 2,
        }}
      >
        <div style={{ fontSize: 9, color: '#445566', textTransform: 'uppercase', letterSpacing: 1 }}>
          {t('archive.col_name')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_spectral_class')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="4" />
              <line x1="8" y1="0.5" x2="8" y2="3" />
              <line x1="8" y1="13" x2="8" y2="15.5" />
              <line x1="0.5" y1="8" x2="3" y2="8" />
              <line x1="13" y1="8" x2="15.5" y2="8" />
              <line x1="2.8" y1="2.8" x2="4.8" y2="4.8" />
              <line x1="11.2" y1="11.2" x2="13.2" y2="13.2" />
              <line x1="13.2" y1="2.8" x2="11.2" y2="4.8" />
              <line x1="4.8" y1="11.2" x2="2.8" y2="13.2" />
            </svg>
          </HeaderIcon>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_planet_count_system')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="5" />
              <ellipse cx="8" cy="8" rx="7.5" ry="2.5" transform="rotate(-30 8 8)" />
            </svg>
          </HeaderIcon>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_research_progress')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 4v4l3 2" strokeLinecap="round" />
            </svg>
          </HeaderIcon>
        </div>
        {/* Pin column — no header */}
        <div />
        {/* Expand column — no header */}
        <div />
      </div>

      {/* System rows */}
      {sortedSystems.map((system) => {
        const isOpen = expanded.has(system.id);
        const isPinned = pinned.has(system.id);
        const isHome = system.planets.some((p) => p.isHomePlanet);
        const name = aliases[system.id] || system.name;
        const starColor = SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';
        const progress = getResearchProgress?.(system.id) ?? 0;
        const isComplete = progress >= 100;
        const isRenaming = renamingSystemId === system.id;
        const isDragOver = dragOverId === system.id;
        const isResearching = isSystemResearching?.(system.id) ?? false;

        return (
          <div
            key={system.id}
            data-system-id={system.id}
          >
            {/* Star row */}
            <div
              data-tutorial-id={isHome ? 'star-row-home' : undefined}
              draggable
              onDragStart={() => handleDragStart(system.id)}
              onDragOver={(e) => handleDragOver(e, system.id)}
              onDrop={() => handleDrop(system.id)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(system.id, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => !isRenaming && toggleExpanded(system.id)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 44px 44px 44px 36px 28px',
                gap: 0,
                alignItems: 'center',
                padding: '10px 12px',
                background: isDragOver
                  ? 'rgba(40, 60, 90, 0.5)'
                  : isOpen
                    ? 'rgba(20, 30, 45, 0.6)'
                    : dragId === system.id
                      ? 'rgba(30, 45, 65, 0.5)'
                      : 'rgba(10, 15, 25, 0.4)',
                border: isDragOver
                  ? '1px solid rgba(68, 136, 170, 0.5)'
                  : isResearching
                    ? '1px solid rgba(68, 136, 255, 0.45)'
                    : '1px solid rgba(51, 68, 85, 0.2)',
                boxShadow: isResearching ? 'inset 0 0 12px rgba(68, 136, 255, 0.08)' : undefined,
                borderRadius: isOpen ? '3px 3px 0 0' : 3,
                cursor: 'grab',
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#aabbcc',
                textAlign: 'left',
                transition: 'background 0.15s, border-color 0.15s',
                opacity: dragId === system.id ? 0.6 : 1,
                marginTop: 2,
              }}
            >
              {/* Name cell */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                {/* Star color dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: starColor,
                    boxShadow: isHome
                      ? `0 0 4px ${starColor}66, 0 0 0 3px rgba(68,255,136,0.5), 0 0 0 1px #44ff88`
                      : `0 0 4px ${starColor}66`,
                    flexShrink: 0,
                  }}
                />

                {/* Name or rename input */}
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') cancelRename();
                    }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'rgba(10, 15, 25, 0.8)',
                      border: '1px solid #4488aa',
                      borderRadius: 3,
                      padding: '2px 6px',
                      color: '#aabbcc',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1, minWidth: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    onDoubleClick={(e) => {
                      if (onRenameSystem) startRenaming(system.id, name, e);
                    }}
                  >
                    {name}
                    {isResearching && (
                      <span style={{ color: '#4488ff', fontSize: 9, marginLeft: 6, animation: 'nebulife-scan-pulse 1.5s ease-in-out infinite' }}>{t("archive.scanning")}</span>
                    )}
                  </span>
                )}
              </div>

              {/* Spectral class cell */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                color: starColor, fontSize: 11, fontWeight: 'bold',
              }}>
                {system.star.spectralClass}
              </div>

              {/* Planet count cell */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                color: '#667788', fontSize: 11,
              }}>
                {system.planets.length}
              </div>

              {/* Research progress cell */}
              <div
                style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  cursor: !isComplete && onStartResearch && canStartResearch?.(system.id) ? 'pointer' : 'default',
                }}
                onClick={(e) => {
                  if (!isComplete) handleResearchClick(system.id, e);
                }}
                title={
                  isComplete
                    ? t('archive.researched_tooltip')
                    : canStartResearch?.(system.id)
                      ? `${Math.round(progress)}% — ${t("archive.click_to_research")}`
                      : `${Math.round(progress)}%`
                }
              >
                {getResearchProgress && (
                  <ResearchProgressIcon
                    progress={progress}
                    interactive={!isComplete && !!onStartResearch && (canStartResearch?.(system.id) ?? false)}
                    isResearching={isSystemResearching?.(system.id)}
                  />
                )}
              </div>

              {/* Pin cell */}
              <div
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={(e) => togglePin(system.id, e)}
                title={isPinned ? t('archive.unpin') : t('archive.pin')}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill={isPinned ? '#4488aa' : 'none'}
                  stroke={isPinned ? '#4488aa' : '#445566'}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ cursor: 'pointer' }}
                >
                  <path d="M5 1h6l1 5-2 1v4l-2 4-2-4V7L4 6l1-5z" />
                </svg>
              </div>

              {/* Expand indicator cell */}
              <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                color: '#445566', fontSize: 10,
              }}>
                {isOpen ? '\u2212' : '+'}
              </div>
            </div>

            {/* Expanded planet row */}
            {isOpen && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 16px 10px 30px',
                  overflowX: 'auto',
                  background: 'rgba(8, 12, 22, 0.4)',
                  borderLeft: '1px solid rgba(51, 68, 85, 0.15)',
                  borderRight: '1px solid rgba(51, 68, 85, 0.15)',
                  borderBottom: '1px solid rgba(51, 68, 85, 0.15)',
                  borderRadius: '0 0 3px 3px',
                  marginTop: -1,
                }}
              >
                {system.planets.map((planet) => (
                  <div key={planet.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <PlanetChip
                      planet={planet}
                      star={system.star}
                      isFavorite={favorites.has(planet.id)}
                      onClick={(e) => handlePlanetClick(system, planet.id, e)}
                    />
                    {planet.isHomePlanet && (
                      <button
                        data-tutorial-id="fav-toggle-home"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(planet.id);
                        }}
                        style={{
                          background: 'none',
                          border: `1px solid ${favorites.has(planet.id) ? '#44ff8866' : 'rgba(51, 68, 85, 0.3)'}`,
                          borderRadius: 3,
                          color: favorites.has(planet.id) ? '#44ff88' : '#556677',
                          fontFamily: 'monospace',
                          fontSize: 9,
                          padding: '2px 6px',
                          cursor: 'pointer',
                          transition: 'color 0.15s, border-color 0.15s',
                        }}
                      >
                        {favorites.has(planet.id) ? t('archive.in_favorites') : t('archive.add_to_favorites')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Context menu */}
      {contextMenu && (
        <PlanetContextMenuPopup
          planetId={contextMenu.planetId}
          systemId={contextMenu.systemId}
          x={contextMenu.x}
          y={contextMenu.y}
          isFavorite={favorites.has(contextMenu.planetId)}
          onToggleFavorite={() => {
            onToggleFavorite(contextMenu.planetId);
            setContextMenu(null);
          }}
          onView={() => {
            const sys = allSystems.find((s) => s.id === contextMenu.systemId);
            if (sys) onViewPlanet(sys, contextMenu.planetId);
            setContextMenu(null);
          }}
          onRename={onRenameSystem ? () => {
            const sys = allSystems.find((s) => s.id === contextMenu.systemId);
            if (sys) {
              const name = aliases[sys.id] || sys.name;
              setRenamingSystemId(sys.id);
              setRenameValue(name);
            }
            setContextMenu(null);
          } : undefined}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetContextMenuPopup
// ---------------------------------------------------------------------------

function PlanetContextMenuPopup({
  planetId,
  systemId,
  x,
  y,
  isFavorite,
  onToggleFavorite,
  onView,
  onRename,
}: {
  planetId: string;
  systemId: string;
  x: number;
  y: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onView: () => void;
  onRename?: () => void;
}) {
  const { t } = useTranslation();
  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        background: 'rgba(10, 15, 25, 0.96)',
        border: '1px solid #446688',
        borderRadius: 4,
        padding: '4px 0',
        fontFamily: 'monospace',
        minWidth: 170,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        style={menuItemStyle}
        onClick={onView}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 50, 70, 0.5)';
          e.currentTarget.style.color = '#aaccee';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = '#aabbcc';
        }}
      >
        {t('archive.view_btn')}
      </button>
      <button
        style={menuItemStyle}
        onClick={onToggleFavorite}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 50, 70, 0.5)';
          e.currentTarget.style.color = isFavorite ? '#cc4444' : '#44ff88';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = '#aabbcc';
        }}
      >
        {isFavorite ? t('archive.remove_from_favorites') : t('archive.add_to_favorites')}
      </button>
      {onRename && (
        <button
          style={menuItemStyle}
          onClick={onRename}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(30, 50, 70, 0.5)';
            e.currentTarget.style.color = '#aaccee';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#aabbcc';
          }}
        >
          {t('common.rename')}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetChip — small clickable planet representation
// ---------------------------------------------------------------------------

function PlanetChip({
  planet,
  star,
  isFavorite,
  onClick,
}: {
  planet: Planet;
  star: Star;
  isFavorite?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hover, setHover] = useState(false);

  // Size proportional to radius (clamped)
  const minSize = 24;
  const maxSize = 48;
  const normalizedR = Math.min(
    1,
    Math.log(planet.radiusEarth + 1) / Math.log(12),
  );
  const size = minSize + (maxSize - minSize) * normalizedR;

  // Real color based on planet properties
  const baseColor = getPlanetChipColor(planet, star);

  // Habitable glow
  const isHabitable = planet.isColonizable || planet.hasLife;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        background: hover ? 'rgba(30, 45, 65, 0.5)' : 'transparent',
        border: 'none',
        borderRadius: 3,
        cursor: 'pointer',
        fontFamily: 'monospace',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      {/* Favorite badge */}
      {isFavorite && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 2,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#44ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l4 4 6-8" />
          </svg>
        </div>
      )}

      {/* Planet circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${baseColor}88, ${baseColor}44)`,
          border: `1px solid ${baseColor}77`,
          boxShadow: isHabitable
            ? `0 4px 8px -2px rgba(68, 255, 136, 0.4)${hover ? `, 0 0 6px ${baseColor}44` : ''}`
            : hover ? `0 0 6px ${baseColor}33` : 'none',
          transition: 'box-shadow 0.15s',
        }}
      />

      {/* Planet name */}
      <div
        style={{
          fontSize: 9,
          color: hover ? '#aabbcc' : '#667788',
          textAlign: 'center',
          maxWidth: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}
      >
        {planet.name}
      </div>

      {/* Home badge — green ring on planet circle */}
      {planet.isHomePlanet && (
        <div style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: size + 6,
          height: size + 6,
          borderRadius: '50%',
          border: '1.5px solid #44ff88',
          pointerEvents: 'none',
        }} />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ResearchProgressIcon — circular progress indicator for system research
// ---------------------------------------------------------------------------

// Inject scan-spin + pulse keyframes once
const SCAN_STYLE_ID = 'nebulife-scan-spin';
if (typeof document !== 'undefined' && !document.getElementById(SCAN_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = SCAN_STYLE_ID;
  style.textContent = [
    `@keyframes nebulife-scan-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`,
    `@keyframes nebulife-scan-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`,
  ].join('\n');
  document.head.appendChild(style);
}

function ResearchProgressIcon({ progress, interactive, isResearching }: { progress: number; interactive?: boolean; isResearching?: boolean }) {
  const [hover, setHover] = useState(false);
  const r = 7;
  const circumference = 2 * Math.PI * r;
  const filled = (progress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <span
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg width="20" height="20" viewBox="0 0 18 18">
        {/* Background circle */}
        <circle cx="9" cy="9" r={r} fill="none"
          stroke={interactive && hover ? 'rgba(68, 136, 170, 0.5)' : 'rgba(51, 68, 85, 0.3)'}
          strokeWidth="1.8"
          style={{ transition: 'stroke 0.15s' }}
        />
        {/* Progress arc */}
        <circle cx="9" cy="9" r={r} fill="none"
          stroke={isComplete ? '#44ff88' : interactive && hover ? '#66aacc' : '#4488aa'}
          strokeWidth="1.8"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
          style={{ transition: 'stroke 0.15s' }}
        />
        {/* Scanning arc — spinning blue dash when researching */}
        {isResearching && !isComplete && (
          <g style={{ transformOrigin: '9px 9px', animation: 'nebulife-scan-spin 2s linear infinite' }}>
            <circle cx="9" cy="9" r={r} fill="none"
              stroke="#4488ff"
              strokeWidth="2.2"
              strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
              strokeLinecap="round"
              style={{ animation: 'nebulife-scan-pulse 1.5s ease-in-out infinite' }}
            />
          </g>
        )}
        {/* Check mark for 100% */}
        {isComplete && (
          <path d="M6 9l2 2 3-4" fill="none" stroke="#44ff88"
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Center text (percentage) */}
        {!isComplete && (
          <text x="9" y="9" textAnchor="middle" dominantBaseline="central"
            fill={isResearching ? '#4488ff' : interactive && hover ? '#aabbcc' : '#667788'}
            fontSize="6" fontFamily="monospace"
            style={{ transition: 'fill 0.15s' }}
          >
            {Math.round(progress)}
          </text>
        )}
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// FavoritesPlanetsList — shown in "Обрані" sub-tab
// ---------------------------------------------------------------------------

export function FavoritesPlanetsList({
  allSystems,
  aliases,
  favorites,
  onToggleFavorite,
  onViewPlanet,
}: {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  favorites: Set<string>;
  onToggleFavorite: (planetId: string) => void;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
}) {
  const { t } = useTranslation();
  // Resolve favorite planets to their system + planet objects
  const favoritePlanets = useMemo(() => {
    const result: { system: StarSystem; planet: Planet }[] = [];
    for (const sys of allSystems) {
      for (const p of sys.planets) {
        if (favorites.has(p.id)) result.push({ system: sys, planet: p });
      }
    }
    return result;
  }, [allSystems, favorites]);

  if (favoritePlanets.length === 0) {
    return (
      <div style={{
        fontSize: 12,
        color: '#556677',
        textAlign: 'center',
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}>
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="#334455" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8l4 4 6-8" />
        </svg>
        {t("archive.no_favorites")}
        <div style={{ fontSize: 10, color: '#445566' }}>
          {t('archive.no_favorites_hint')}
        </div>
      </div>
    );
  }

  // Group by system
  const grouped = useMemo(() => {
    const map = new Map<string, { system: StarSystem; planets: Planet[] }>();
    for (const { system, planet } of favoritePlanets) {
      if (!map.has(system.id)) map.set(system.id, { system, planets: [] });
      map.get(system.id)!.planets.push(planet);
    }
    return [...map.values()];
  }, [favoritePlanets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {grouped.map(({ system, planets }) => (
        <div key={system.id}>
          <div style={{ fontSize: 10, color: '#556677', marginBottom: 6, letterSpacing: 0.5 }}>
            {aliases[system.id] || system.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {planets.map((planet) => (
              <PlanetChip
                key={planet.id}
                planet={planet}
                star={system.star}
                isFavorite={true}
                onClick={() => onViewPlanet(system, planet.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
