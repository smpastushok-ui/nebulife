import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem } from '@nebulife/core';
import { getDeviceTier } from '../../../utils/device-tier.js';

// Tooltip that appears BELOW the icon (so it's not clipped by top menu)
function HeaderIcon({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: 6, padding: '6px 10px',
          background: 'rgba(10, 15, 25, 0.96)', border: '1px solid #446688', borderRadius: 4,
          fontSize: 10, color: '#aabbcc', fontFamily: 'monospace', whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemsList — List of all discovered/available star systems
// ---------------------------------------------------------------------------

const STYLE_ID = 'nebulife-systems-list-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes sys-row-research-pulse {
      0%, 100% { background: rgba(25,35,55,0.5); }
      50% { background: rgba(15,25,40,0.3); }
    }
    @keyframes sys-btn-sweep {
      from { background-position: -200% 0; }
      to { background-position: 200% 0; }
    }
    @keyframes sys-btn-border-march {
      to { stroke-dashoffset: -12; }
    }
    /* Researching particle pulse — single dot at centre of the dial that
       breathes in scale + opacity while research is in progress. */
    @keyframes sys-research-particle-pulse {
      0%, 100% { transform: scale(0.8); opacity: 0.6; }
      50%      { transform: scale(1.3); opacity: 1; }
    }
    /* Quark toggle pill — slow blue pulse when shortcuts are off. */
    @keyframes sys-quark-pill-pulse {
      0%, 100% { box-shadow: 0 0 3px rgba(68,136,255,0.3); opacity: 0.6; }
      50%      { box-shadow: 0 0 8px rgba(68,136,255,0.7); opacity: 1; }
    }
    @keyframes sys-scan-flow {
      from { transform: translateX(-100%); opacity: 0.15; }
      50%  { opacity: 0.65; }
      to   { transform: translateX(260%); opacity: 0.08; }
    }
    @keyframes sys-tutorial-research-pulse {
      0%, 100% { transform: scale(1); opacity: 0.82; }
      50%      { transform: scale(1.08); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabbff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4e8',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

interface SystemsListProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onNavigate: (system: StarSystem) => void;
  onStartResearch?: (systemId: string) => void;
  canStartResearch?: (systemId: string) => boolean;
  /** Whether a system is currently being researched */
  isResearching?: (systemId: string) => boolean;
  /** Whether a system is fully researched (100%) */
  isFullyResearched?: (systemId: string) => boolean;
  /** Current research progress 0-100 (drives the progress arc on the
   *  research icon). Optional — without it the arc falls back to 0. */
  getResearchProgress?: (systemId: string) => number;
  /** Whether a ring is locked (previous ring not fully researched) */
  isRingLocked?: (ringIndex: number) => boolean;
  /** Current research data balance */
  researchData?: number;
  /** Cost to start research */
  researchDataCost?: number;
  /** Dynamic cost to start research for a specific system */
  getResearchDataCost?: (system: StarSystem) => number;
  /** Unlock a ring-locked system by paying quarks — premium shortcut. */
  onUnlockViaQuarks?: (systemId: string) => void;
  /** Quarks cost for the per-system unlock (default 30). */
  quarkUnlockCost?: number;
  /** Player's current quarks balance — for affordability checks. */
  quarksBalance?: number;
  /** True if the given system has already been unlocked via quarks. */
  isQuarkUnlocked?: (systemId: string) => boolean;
  /** Instant-research a not-yet-researched system in exchange for quarks.
   *  Wires the ⚛ shortcut button next to the magnifier in each row. */
  onInstantResearch?: (systemId: string) => void;
  /** Quarks cost for an instant research (default 30). */
  instantResearchCost?: number;
  /** Open the global TopUp/buy-quarks modal — used by the instant-research
   *  popup when the player can't afford the shortcut. */
  onOpenTopUp?: () => void;
  /** Pinned systems shown in a separate top block without changing ring order. */
  pinnedSystems?: Set<string>;
  /** Callback when pinned systems change. */
  onPinnedSystemsChange?: (systems: Set<string>) => void;
  tutorialResearchTargetCount?: number;
}

export function SystemsList({
  allSystems,
  aliases,
  onNavigate,
  onStartResearch,
  canStartResearch,
  isResearching,
  isFullyResearched,
  getResearchProgress,
  isRingLocked,
  researchData = 0,
  researchDataCost = 1,
  getResearchDataCost,
  onUnlockViaQuarks,
  quarkUnlockCost = 30,
  quarksBalance = 0,
  isQuarkUnlocked,
  onInstantResearch,
  instantResearchCost = 30,
  onOpenTopUp,
  pinnedSystems,
  onPinnedSystemsChange,
  tutorialResearchTargetCount = 1,
}: SystemsListProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [insufficientDataId, setInsufficientDataId] = useState<string | null>(null);
  const insufficientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSystemTapRef = useRef<{ id: string; at: number } | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  // System currently shown in the "instant research with quarks" confirmation
  // popup. null when popup is closed.
  const [instantTargetId, setInstantTargetId] = useState<string | null>(null);
  const [revealedByRing, setRevealedByRing] = useState<Record<number, number>>({});
  const pinned = pinnedSystems ?? new Set<string>();

  // Filter: show only systems where progress < 100 (unresearched)
  const [filterUnresearched, setFilterUnresearched] = useState(false);

  useEffect(() => {
    ensureStyles();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Clear tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (insufficientTimerRef.current) clearTimeout(insufficientTimerRef.current);
    };
  }, []);

  // Collapsed rings — persisted to localStorage so state survives tab switches.
  // Key: nebulife_systems_expanded_rings (JSON Record<number, boolean>).
  // Default: rings 0 and 1 expanded, rings 2+ collapsed.
  const [collapsedRings, setCollapsedRings] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem('nebulife_systems_expanded_rings');
      if (raw) {
        const record = JSON.parse(raw) as Record<string, boolean>;
        const collapsed = new Set<number>();
        for (const [k, v] of Object.entries(record)) {
          if (v === false) collapsed.add(Number(k));
        }
        return collapsed;
      }
    } catch { /* ignore */ }
    // Default: collapse from ring 2 up (seeded lazily below)
    return new Set();
  });
  // First-mount: mark all ring>=2 as collapsed once we know which rings exist
  // BUT only if localStorage had no saved preference for them.
  const collapsedSeededRef = useRef(false);

  const sorted = useMemo(() => {
    return [...allSystems].sort((a, b) => {
      // Home system first (ring 0)
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;
      // Then by ring index
      const ringDiff = (a.ringIndex ?? 99) - (b.ringIndex ?? 99);
      if (ringDiff !== 0) return ringDiff;
      // Then by name within same ring
      const aName = aliases[a.id] || a.name;
      const bName = aliases[b.id] || b.name;
      return aName.localeCompare(bName);
    });
  }, [allSystems, aliases]);

  // Group by ring for section headers. Use a Map keyed by ringIndex so that
  // home-first sorting (which can break ring contiguity when home has
  // ringIndex>0) doesn't produce duplicate groups with the same key.
  const ringGroups = useMemo(() => {
    const map = new Map<number, StarSystem[]>();
    for (const sys of sorted) {
      const ri = sys.ringIndex ?? 0;
      const arr = map.get(ri) ?? [];
      arr.push(sys);
      map.set(ri, arr);
    }
    return Array.from(map.entries())
      .map(([ringIndex, systems]) => ({ ringIndex, systems }))
      .sort((a, b) => a.ringIndex - b.ringIndex);
  }, [sorted]);

  const pinnedList = useMemo(() => (
    sorted.filter((system) => pinned.has(system.id))
  ), [pinned, sorted]);

  const togglePinnedSystem = useCallback((systemId: string) => {
    if (!onPinnedSystemsChange) return;
    const next = new Set(pinned);
    if (next.has(systemId)) next.delete(systemId);
    else next.add(systemId);
    onPinnedSystemsChange(next);
  }, [onPinnedSystemsChange, pinned]);

  useEffect(() => {
    const revealTutorialTarget = () => {
      setFilterUnresearched(false);
      setCollapsedRings(new Set());
      const revealed: Record<number, number> = {};
      for (const group of ringGroups) {
        revealed[group.ringIndex] = group.systems.length;
      }
      setRevealedByRing(revealed);
    };
    window.addEventListener('nebulife:tutorial-show-research', revealTutorialTarget);
    return () => window.removeEventListener('nebulife:tutorial-show-research', revealTutorialTarget);
  }, [ringGroups]);

  // Seed the collapsed set once we know which rings exist — rings 2+ default
  // to collapsed so the terminal isn't a 1400-row wall on first open.
  // Only applies rings not already recorded in localStorage.
  useEffect(() => {
    if (collapsedSeededRef.current) return;
    if (ringGroups.length === 0) return;
    collapsedSeededRef.current = true;

    let hasSavedPrefs = false;
    try {
      hasSavedPrefs = !!localStorage.getItem('nebulife_systems_expanded_rings');
    } catch { /* ignore */ }

    if (!hasSavedPrefs) {
      // No saved prefs — apply defaults: ring 2+ collapsed
      const initial = new Set<number>();
      for (const g of ringGroups) {
        if (g.ringIndex >= 2) initial.add(g.ringIndex);
      }
      setCollapsedRings(initial);
    }
  }, [ringGroups]);

  const toggleRingCollapse = useCallback((ringIndex: number) => {
    setCollapsedRings((prev) => {
      const next = new Set(prev);
      if (next.has(ringIndex)) next.delete(ringIndex); else next.add(ringIndex);
      // Persist to localStorage as Record<ringIndex, expanded (true) | collapsed (false)>
      try {
        const record: Record<string, boolean> = {};
        for (const ri of next) { record[String(ri)] = false; }
        localStorage.setItem('nebulife_systems_expanded_rings', JSON.stringify(record));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Track first available non-home systems for tutorial target highlighting.
  const tutorialResearchTargetIds = useMemo(() => {
    const ids: string[] = [];
    for (const s of sorted) {
      if (s.planets.some((p) => p.isHomePlanet)) continue;
      const ringLocked = isRingLocked?.(s.ringIndex ?? 0) ?? false;
      const quarkUnlocked = isQuarkUnlocked?.(s.id) ?? false;
      const locked = ringLocked && !quarkUnlocked;
      const progress = Math.max(0, Math.min(100, getResearchProgress?.(s.id) ?? (isFullyResearched?.(s.id) ? 100 : 0)));
      if (!locked && progress < 100 && (canStartResearch?.(s.id) ?? false)) ids.push(s.id);
      if (ids.length >= tutorialResearchTargetCount) break;
    }
    return new Set(ids);
  }, [canStartResearch, getResearchProgress, isFullyResearched, isQuarkUnlocked, isRingLocked, sorted, tutorialResearchTargetCount]);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        {t('archive.no_systems')}
      </div>
    );
  }

  const hasResearchCol = !!onStartResearch;

  // Master quark shortcut visibility toggle — persisted in localStorage.
  // Default off; when on, per-row ⚛ buttons are shown at the LEFT of each row.
  const [quarkShortcutsVisible, setQuarkShortcutsVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nebulife_quark_shortcuts_visible') === '1';
    } catch {
      return false;
    }
  });

  const toggleQuarkShortcuts = useCallback(() => {
    setQuarkShortcutsVisible((prev) => {
      const next = !prev;
      try { localStorage.setItem('nebulife_quark_shortcuts_visible', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const revealMoreInRing = useCallback((ringIndex: number) => {
    setRevealedByRing((prev) => ({
      ...prev,
      [ringIndex]: (prev[ringIndex] ?? 10) + 10,
    }));
  }, []);

  const handleResearchClick = (system: StarSystem) => {
    const cost = getResearchDataCost?.(system) ?? researchDataCost;
    // Check if we have enough data
    if (researchData < cost) {
      // Show "insufficient data" tooltip
      setInsufficientDataId(system.id);
      if (insufficientTimerRef.current) clearTimeout(insufficientTimerRef.current);
      insufficientTimerRef.current = setTimeout(() => {
        setInsufficientDataId(null);
      }, 2000);
      return;
    }
    onStartResearch?.(system.id);
  };

  const handleSystemRowResearch = (system: StarSystem, canResearch: boolean, researching: boolean, fullyResearched: boolean) => {
    if (!canResearch || researching || fullyResearched) return;
    handleResearchClick(system);
  };

  // Шаблон колонок сітки — 6-колонковий макет з кнопкою улюбленого (Pin) як Колонка 1
  const gridColsMobile    = hasResearchCol ? '24px minmax(0,1fr) 28px 28px 28px 78px' : '24px minmax(0,1fr) 28px 28px 28px';
  const gridColsDesktop   = hasResearchCol ? '32px minmax(0,1fr) 42px 42px 42px 88px' : '32px minmax(0,1fr) 42px 42px 42px';

  const renderSystemRow = (system: StarSystem, keyPrefix = 'system') => {
    const isHome = system.planets.some((p) => p.isHomePlanet);
    const isHovered = hoveredId === system.id;
    const name = aliases[system.id] || system.name;
    const starColor =
      SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';
    const ringLocked = isRingLocked?.(system.ringIndex ?? 0) ?? false;
    const quarkUnlocked = isQuarkUnlocked?.(system.id) ?? false;
    const locked = ringLocked && !quarkUnlocked;
    const researching = isResearching?.(system.id) ?? false;
    const progressPct = Math.max(
      0,
      Math.min(100, getResearchProgress?.(system.id) ?? (isFullyResearched?.(system.id) ? 100 : 0)),
    );
    const fullyResearched = progressPct >= 100 || (isFullyResearched?.(system.id) ?? false);
    const canResearch = locked || fullyResearched ? false : (canStartResearch?.(system.id) ?? false);
    const dataCost = getResearchDataCost?.(system) ?? researchDataCost;
    const hasResearchData = Math.floor(researchData) >= dataCost;
    const isTutorialResearchTarget = tutorialResearchTargetIds.has(system.id);
    const statusLabel = fullyResearched
      ? t('archive.status_complete')
      : researching
        ? t('archive.status_scanning')
        : canResearch
          ? t('archive.status_ready')
          : locked
            ? t('archive.status_locked')
        : !hasResearchData
          ? t('archive.status_need_data')
          : t('archive.status_no_slots');
    const showInsufficientData = insufficientDataId === system.id;
    const isPinned = pinned.has(system.id);

    return (
      <div
        key={`${keyPrefix}-${system.id}`}
        onMouseEnter={() => setHoveredId(system.id)}
        onMouseLeave={() => setHoveredId(null)}
        onDoubleClick={() => handleSystemRowResearch(system, canResearch, researching, fullyResearched)}
        onTouchEnd={(e) => {
          const now = Date.now();
          const prev = lastSystemTapRef.current;
          lastSystemTapRef.current = { id: system.id, at: now };
          if (prev?.id === system.id && now - prev.at < 360) {
            e.preventDefault();
            handleSystemRowResearch(system, canResearch, researching, fullyResearched);
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? gridColsMobile : gridColsDesktop,
          gap: isMobile ? 4 : 8,
          padding: isMobile ? '8px 10px' : '10px 14px',
          background: fullyResearched
            ? 'linear-gradient(90deg, rgba(68,180,130,0.02), rgba(10,15,25,0.2))'
            : researching
              ? 'linear-gradient(90deg, rgba(68,136,170,0.03), rgba(10,15,25,0.2))'
              : canResearch
                ? 'linear-gradient(90deg, rgba(215,179,106,0.02), rgba(10,15,25,0.2))'
                : isHovered
                  ? 'rgba(20, 38, 58, 0.45)'
                  : 'rgba(5, 10, 20, 0.18)',
          borderLeft: isHovered
            ? `3px solid ${fullyResearched ? '#44ff88' : canResearch ? '#ffd2a1' : '#7bb8ff'}`
            : '3px solid transparent',
          borderTop: '1px solid rgba(51, 68, 85, 0.08)',
          borderBottom: '1px solid rgba(51, 68, 85, 0.16)',
          borderRight: '1px solid rgba(51, 68, 85, 0.08)',
          borderRadius: 4,
          fontFamily: 'monospace',
          fontSize: 11,
          color: locked ? '#556677' : '#aabbcc',
          textAlign: 'left',
          alignItems: 'center',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: researching ? 'sys-row-research-pulse 2.5s ease-in-out infinite' : undefined,
          position: 'relative',
          opacity: locked ? 0.65 : 1,
          cursor: canResearch && !researching && !fullyResearched ? 'copy' : undefined,
          overflow: 'visible',
          boxShadow: isHovered ? 'inset 0 0 12px rgba(123, 184, 255, 0.06)' : 'none',
          marginBottom: 3,
        }}
      >
        {/* Column 1: Pinned / Favorite Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {onPinnedSystemsChange && (
            <button
              type="button"
              title={isPinned ? t('archive.system_unpin') : t('archive.system_pin')}
              aria-label={isPinned ? t('archive.system_unpin') : t('archive.system_pin')}
              onClick={(e) => {
                e.stopPropagation();
                togglePinnedSystem(system.id);
              }}
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: isPinned ? '#ffb844' : isHovered ? '#667788' : '#334455',
                filter: isPinned ? 'drop-shadow(0 0 4px rgba(255, 184, 68, 0.4))' : 'none',
                cursor: 'pointer',
                transition: 'color 0.15s, transform 0.1s, filter 0.15s',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.85)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <PinIcon active={isPinned} />
            </button>
          )}
        </div>

        {/* Column 2: Star dot, Name, Progress Bar */}
        <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => onNavigate(system)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: starColor,
                flexShrink: 0,
                boxShadow: isHome
                  ? '0 0 0 2px rgba(127,217,166,0.30), 0 0 10px rgba(127,217,166,0.5)'
                  : `0 0 10px ${starColor}88`,
                display: 'inline-block',
              }}
            />
            <span style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap', 
              color: locked ? '#556677' : isHome ? '#44ff88' : '#e1f0ff',
              fontWeight: isHome || isHovered ? 'bold' : 'normal',
              fontSize: 12,
              letterSpacing: 0.5,
              transition: 'color 0.12s',
            }}>
              {name}
              {isHome && <span style={{ fontSize: 8, color: '#44ff88', opacity: 0.8, marginLeft: 6, fontWeight: 'normal', border: '1px solid rgba(68, 255, 136, 0.3)', padding: '0px 4px', borderRadius: 2 }}>HOME</span>}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <div style={{
              position: 'relative',
              flex: 1,
              height: 4,
              overflow: 'hidden',
              borderRadius: 2,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.02)',
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                borderRadius: 2,
                background: fullyResearched 
                  ? 'linear-gradient(90deg, #2b8855, #44ff88)' 
                  : researching 
                    ? 'linear-gradient(90deg, #1f6aa5, #3eb0ff)' 
                    : 'linear-gradient(90deg, #8c6a2f, #ffd2a1)',
                boxShadow: progressPct > 0 ? `0 0 6px ${fullyResearched ? 'rgba(68,255,136,0.3)' : researching ? 'rgba(62,176,255,0.3)' : 'rgba(255,210,161,0.2)'}` : undefined,
                transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
              {researching && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '32%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(180,215,245,0.22), transparent)',
                  animation: getDeviceTier() === 'low' ? undefined : 'sys-scan-flow 1.9s ease-in-out infinite',
                }} />
              )}
            </div>
            <span style={{ 
              color: fullyResearched ? '#44ff88' : researching ? '#7bb8ff' : '#8899aa', 
              opacity: 0.85, 
              fontSize: 10, 
              minWidth: 34, 
              textAlign: 'right',
              fontWeight: progressPct > 0 ? 'bold' : 'normal'
            }}>
              {Math.round(progressPct)}%
            </span>
          </div>
        </div>

        {/* Column 3: Star Spectral Class Badged */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ 
            color: starColor, 
            fontSize: 10, 
            fontWeight: 'bold',
            textAlign: 'center', 
            background: `${starColor}15`, 
            border: `1px solid ${starColor}35`,
            borderRadius: 3,
            padding: '2px 6px',
            minWidth: 20,
            display: 'inline-block',
            boxShadow: `inset 0 0 4px ${starColor}10`
          }}>
            {system.star.spectralClass}
          </span>
        </div>

        {/* Column 4: Planet Count */}
        <span style={{ 
          color: fullyResearched ? '#7bb8ff' : '#8899aa', 
          fontSize: 11, 
          fontWeight: fullyResearched ? 'bold' : 'normal',
          textAlign: 'center' 
        }}>
          {system.planets.length}
        </span>

        {/* Column 5: Ring Index */}
        <span style={{ color: '#667788', fontSize: 11, textAlign: 'center' }}>
          {system.ringIndex ?? '-'}
        </span>

        {/* Column 6: Action Button / Research Progress */}
        {hasResearchCol && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, position: 'relative', overflow: 'visible' }}>
            {isHome ? (
              <span style={{ color: '#334455', fontSize: 10 }}>&mdash;</span>
            ) : locked ? (
              onUnlockViaQuarks ? (
                <button
                  title={t('archive.unlock_via_quarks_tooltip', { cost: quarkUnlockCost }) as string}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (quarksBalance >= quarkUnlockCost) {
                      onUnlockViaQuarks(system.id);
                    }
                  }}
                  disabled={quarksBalance < quarkUnlockCost}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    background: quarksBalance >= quarkUnlockCost ? 'rgba(68,136,255,0.14)' : 'rgba(10,15,25,0.4)',
                    border: `1px solid ${quarksBalance >= quarkUnlockCost ? '#446688' : '#223344'}`,
                    borderRadius: 3,
                    color: quarksBalance >= quarkUnlockCost ? '#7bb8ff' : '#445566',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    padding: '3px 8px',
                    cursor: quarksBalance >= quarkUnlockCost ? 'pointer' : 'not-allowed',
                    letterSpacing: 0.5,
                    transition: 'all 0.15s',
                  }}
                >
                  {quarkUnlockCost} ⚛
                </button>
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#445566" strokeWidth="1.2" strokeLinecap="round">
                  <rect x="3" y="7" width="10" height="8" rx="1.5" />
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                </svg>
              )
            ) : fullyResearched || researching || !locked ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ResearchProgressIcon
                  state={fullyResearched ? 'complete' : researching ? 'researching' : 'idle'}
                  progress={progressPct}
                  seedId={system.id}
                  disabled={!fullyResearched && !researching && !canResearch}
                  tooltip={!fullyResearched && !researching && !canResearch ? statusLabel : undefined}
                  tutorialId={canResearch && !researching && !fullyResearched && isTutorialResearchTarget ? 'research-btn-first' : undefined}
                  tutorialHighlight={canResearch && !researching && !fullyResearched && isTutorialResearchTarget}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fullyResearched) {
                      onNavigate(system);
                    } else if (canResearch && !researching) {
                      handleResearchClick(system);
                    }
                  }}
                />
                {onInstantResearch && quarkShortcutsVisible && canResearch && !researching && !fullyResearched && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInstantTargetId(system.id);
                    }}
                    title={t('archive.instant_research_tooltip', { cost: instantResearchCost }) as string}
                    aria-label={t('archive.instant_research_tooltip', { cost: instantResearchCost }) as string}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(68,136,255,0.12)',
                      border: '1px solid rgba(123,184,255,0.5)',
                      color: '#7bb8ff',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: 1,
                      padding: 0,
                      transition: 'all 0.15s',
                      boxShadow: '0 0 6px rgba(123,184,255,0.15)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(68,136,255,0.22)';
                      e.currentTarget.style.borderColor = '#7bb8ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(68,136,255,0.12)';
                      e.currentTarget.style.borderColor = 'rgba(123,184,255,0.5)';
                    }}
                  >
                    ⚛
                  </button>
                )}
                {showInsufficientData && (
                  <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 4,
                    whiteSpace: 'nowrap',
                    fontSize: 10,
                    color: '#cc8844',
                    background: 'rgba(10, 15, 25, 0.95)',
                    border: '1px solid rgba(204, 136, 68, 0.3)',
                    borderRadius: 3,
                    padding: '4px 8px',
                    zIndex: 10,
                    pointerEvents: 'none',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}>
                    {t('research.panel_insufficient_data')}
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color: '#334455', fontSize: 10 }}>&mdash;</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header row — SVG icons with tooltips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? gridColsMobile : gridColsDesktop,
          gap: isMobile ? 4 : 8,
          padding: isMobile ? '5px 10px 7px' : '6px 14px 8px',
          alignItems: 'center',
          borderBottom: '1px solid rgba(51, 68, 85, 0.24)',
          background: 'rgba(5, 10, 20, 0.28)',
          marginBottom: 6,
        }}
      >
        {/* Column 1: Pin Column Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.25 }}>
          <PinIcon active={false} />
        </div>

        {/* Column 2: Name Column Header */}
        <span style={{ fontSize: 9, color: '#445566', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>{t('archive.col_name')}</span>

        {/* Column 3: Spectral Class Icon Header */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_spectral_class')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.25">
              <circle cx="8" cy="8" r="4" />
              <line x1="8" y1="0.5" x2="8" y2="3" />
              <line x1="8" y1="13" x2="8" y2="15.5" />
              <line x1="0.5" y1="8" x2="3" y2="8" />
              <line x1="13" y1="8" x2="15.5" y2="8" />
            </svg>
          </HeaderIcon>
        </div>

        {/* Column 4: Planet Count Icon Header */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_planet_count')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.25">
              <circle cx="8" cy="8" r="5" />
              <ellipse cx="8" cy="8" rx="7.5" ry="2.5" transform="rotate(-30 8 8)" />
            </svg>
          </HeaderIcon>
        </div>

        {/* Column 5: Ring Index Icon Header */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HeaderIcon tooltip={t('archive.tooltip_ring')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.25">
              <circle cx="8" cy="8" r="3" />
              <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
            </svg>
          </HeaderIcon>
        </div>

        {/* Column 6: Actions / Research Header */}
        {hasResearchCol && (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
            {/* Magnifier as active filter button — filters to unresearched (progress < 100) */}
            <button
              onClick={() => setFilterUnresearched((v) => !v)}
              title={filterUnresearched ? t('archive.filter_unresearched_active') : t('archive.tooltip_research_actions')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 3,
                background: filterUnresearched ? 'rgba(68,136,255,0.22)' : 'transparent',
                border: filterUnresearched ? '1px solid #446688' : '1px solid transparent',
                cursor: 'pointer',
                padding: 0,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                stroke={filterUnresearched ? '#7bb8ff' : '#556677'}
                strokeWidth="1.2" strokeLinecap="round">
                <circle cx="6.5" cy="6.5" r="4.5" />
                <line x1="10" y1="10" x2="14" y2="14" />
              </svg>
            </button>
            {onInstantResearch && (
              <button
                onClick={toggleQuarkShortcuts}
                title={quarkShortcutsVisible
                  ? t('archive.quark_shortcuts_hide')
                  : t('archive.quark_shortcuts_show')}
                style={{
                  position: 'absolute',
                  right: -10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: '50%',
                  background: quarkShortcutsVisible ? 'rgba(68,136,255,0.22)' : 'rgba(68,136,255,0.07)',
                  border: `1px solid ${quarkShortcutsVisible ? '#4488ff' : 'rgba(123,184,255,0.35)'}`,
                  color: '#7bb8ff',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                  animation: quarkShortcutsVisible ? undefined : 'sys-quark-pill-pulse 2.5s ease-in-out infinite',
                }}
              >
                ⚛
              </button>
            )}
          </div>
        )}
      </div>

      {pinnedList.length > 0 && (
        <div style={{
          marginBottom: 10,
          padding: isMobile ? '8px 0 10px' : '8px 0 12px',
          borderBottom: '1px solid rgba(68, 136, 170, 0.18)',
        }}>
          <div style={{
            fontSize: 10,
            color: '#7bb8ff',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            padding: isMobile ? '4px 8px 8px' : '4px 10px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <PinIcon active />
            <span>{t('archive.favorite_systems')}</span>
            <span style={{ fontSize: 9, color: '#556677', textTransform: 'none', letterSpacing: 0 }}>
              ({pinnedList.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pinnedList.map((system) => renderSystemRow(system, 'pinned'))}
          </div>
        </div>
      )}

      {/* System rows grouped by ring */}
      {ringGroups.map((group) => {
        const locked = isRingLocked?.(group.ringIndex) ?? false;
        const ringLabel = group.ringIndex === 0
          ? t('archive.home_system')
          : t('archive.ring_label', { ring: group.ringIndex });
        // Ring 1+: user-toggleable. Ring 0 (home) is always expanded.
        // Rings 2+ are force-collapsed while locked (ring 1 is never locked).
        // Ring 1 defaults to expanded; rings 2+ default to collapsed (see seed effect).
        const forceCollapsed = group.ringIndex >= 2 && locked;
        const isCollapsed = forceCollapsed || collapsedRings.has(group.ringIndex);
        const canCollapse = group.ringIndex >= 1 && !locked;

        return (
          <React.Fragment key={`ring-${group.ringIndex}`}>
            {/* Ring group header — rings 2+ are clickable chevrons */}
            {group.ringIndex > 0 && (
              <button
                onClick={() => { if (canCollapse) toggleRingCollapse(group.ringIndex); }}
                style={{
                  fontSize: 10,
                  color: locked ? '#445566' : '#667788',
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  padding: isMobile ? '12px 8px 6px' : '14px 10px 6px',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: locked ? 'transparent' : 'rgba(5, 10, 20, 0.18)',
                  border: '1px solid rgba(51, 68, 85, 0.12)',
                  borderRadius: 0,
                  width: '100%',
                  textAlign: 'left',
                  cursor: canCollapse ? 'pointer' : 'default',
                  fontFamily: 'monospace',
                }}
              >
                {canCollapse && (
                  <span style={{
                    display: 'inline-block',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                    color: '#556677',
                    fontSize: 10,
                  }}>▾</span>
                )}
                <span>{ringLabel}</span>
                <span style={{ fontSize: 9, color: '#556677', textTransform: 'none', letterSpacing: 0 }}>
                  ({group.systems.length})
                </span>
                {locked && (
                  <span style={{ fontSize: 9, color: '#556677', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
                    — {t('archive.ring_locked_hint')}
                  </span>
                )}
              </button>
            )}
            {(() => {
              if (isCollapsed) return null;
              const filteredSystems = group.systems.filter((system) => {
              if (!filterUnresearched) return true;
              const prog = getResearchProgress?.(system.id) ?? (isFullyResearched?.(system.id) ? 100 : 0);
              return prog < 100;
              });
              const paginated = group.ringIndex >= 3 && filteredSystems.length > 10;
              const visibleLimit = paginated ? (revealedByRing[group.ringIndex] ?? 10) : filteredSystems.length;
              const visibleSystems = filteredSystems.slice(0, visibleLimit);
              const hiddenCount = Math.max(0, filteredSystems.length - visibleSystems.length);

              return visibleSystems.map((system) => {
                return renderSystemRow(system, `ring-${group.ringIndex}`);
              }).concat(hiddenCount > 0 ? [
                <button
                  key={`more-${group.ringIndex}`}
                  type="button"
                  onClick={() => revealMoreInRing(group.ringIndex)}
                  style={{
                    margin: '6px 0 10px',
                    padding: '9px 12px',
                    width: '100%',
                    background: 'rgba(8,16,28,0.46)',
                    border: '1px solid rgba(68,136,170,0.28)',
                    borderRadius: 3,
                    color: '#7bb8ff',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {t('archive.show_next_systems', { count: Math.min(10, hiddenCount), remaining: hiddenCount })}
                </button>,
              ] : []);
            })()}
          </React.Fragment>
        );
      })}

      {/* Instant-research-via-quarks confirmation popup. Mounted at the end
          of the list so it overlays everything; pointer-events fall through
          the dimmed backdrop. */}
      {instantTargetId && onInstantResearch && (
        <div
          onClick={() => setInstantTargetId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9700,
            background: 'rgba(2,5,16,0.78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 360, width: '100%',
              background: 'rgba(10,15,25,0.98)',
              border: '1px solid #446688',
              borderRadius: 6,
              padding: 20,
              fontFamily: 'monospace',
              color: '#aabbcc',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#7bb8ff' }}>
              {t('archive.instant_research_title')}
            </div>
            <div style={{ fontSize: 12, color: '#8899aa', marginBottom: 16, lineHeight: 1.5 }}>
              {t('archive.instant_research_desc', { cost: instantResearchCost })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  if (quarksBalance >= instantResearchCost) {
                    onInstantResearch(instantTargetId);
                    setInstantTargetId(null);
                  }
                }}
                disabled={quarksBalance < instantResearchCost}
                style={{
                  background: quarksBalance >= instantResearchCost ? 'rgba(68,136,255,0.18)' : 'rgba(10,15,25,0.4)',
                  border: `1px solid ${quarksBalance >= instantResearchCost ? '#446688' : '#223344'}`,
                  borderRadius: 3,
                  color: quarksBalance >= instantResearchCost ? '#7bb8ff' : '#445566',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '8px 12px',
                  cursor: quarksBalance >= instantResearchCost ? 'pointer' : 'not-allowed',
                }}
              >
                {t('archive.instant_research_btn', { cost: instantResearchCost })}
              </button>
              {onOpenTopUp && (
                <button
                  onClick={() => {
                    setInstantTargetId(null);
                    onOpenTopUp();
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #334455',
                    borderRadius: 3,
                    color: '#aabbcc',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {t('archive.buy_quarks_btn')}
                </button>
              )}
              <button
                onClick={() => setInstantTargetId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: '#667788',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Single research-state icon. One control replaces the previous trio of
 *  ResearchedIcon / ResearchLupeButton / ResearchingProgress.
 *
 *  Layout: a 26×26 button. Inside is a circular outline ring (the "track")
 *  drawn at ~30% opacity, plus a foreground progress arc that fills the same
 *  ring based on `progress` (0-100).
 *
 *  States:
 *   - idle        → faint track, magnifier in centre, no animation. Clicking
 *                   triggers onClick (start research).
 *   - researching → track + partial progress arc + single pulsing particle
 *                   at the centre of the dial.
 *   - complete    → solid full-opacity ring + centred magnifier on a filled
 *                   blue background. Clicking jumps into the system. */
function ResearchProgressIcon({
  state,
  progress,
  seedId: _seedId,
  disabled = false,
  tooltip: tooltipOverride,
  tutorialId,
  tutorialHighlight = false,
  onClick,
}: {
  state: 'idle' | 'researching' | 'complete';
  progress: number;
  seedId: string;
  disabled?: boolean;
  tooltip?: string;
  tutorialId?: string;
  tutorialHighlight?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  // Low/mid tier devices skip CSS animations to keep ~1,400-row lists scrolling.
  const skipAnim = useMemo(() => {
    const tier = getDeviceTier();
    return tier === 'low' || tier === 'mid';
  }, []);

  // SVG geometry — circle centred at (13,13) with r=10; circumference is
  // used to compute the dasharray for the progress arc.
  const r = 10;
  const cx = 13;
  const cy = 13;
  const circ = 2 * Math.PI * r;
  // Cap the arc so partial progress always shows at least a sliver, and
  // 100% renders as the full ring.
  const arcLen = state === 'complete' ? circ : Math.max(0, Math.min(circ, (progress / 100) * circ));

  const isComplete = state === 'complete';
  const isResearching = state === 'researching';

  const tooltip = tooltipOverride ?? (isComplete
    ? t('archive.researched_tooltip')
    : isResearching
      ? t('archive.researching_btn')
      : t('archive.research_btn'));
  const ariaLabel = isComplete
    ? t('archive.researched_btn')
    : isResearching
      ? t('archive.researching_btn')
      : t('archive.research_btn');

  return (
    <button
      data-tutorial-id={tutorialId}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tooltip as string}
      aria-label={ariaLabel as string}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: isComplete ? 3 : '50%',
        background: tutorialHighlight
          ? 'radial-gradient(circle, rgba(255,210,120,0.18), rgba(68,136,170,0.06) 62%, transparent 72%)'
          : isComplete
          ? 'transparent'
          : hover && !disabled ? 'rgba(123,168,216,0.08)' : 'transparent',
        border: tutorialHighlight ? '1px solid rgba(255,210,120,0.92)' : '1px solid transparent',
        cursor: disabled ? 'default' : 'pointer',
        padding: 0,
        transition: 'background 0.15s, border-color 0.15s',
        opacity: disabled ? 0.62 : 1,
        boxShadow: tutorialHighlight
          ? '0 0 0 3px rgba(255,210,120,0.16), 0 0 18px rgba(255,210,120,0.45), inset 0 0 10px rgba(123,184,255,0.14)'
          : undefined,
        animation: tutorialHighlight ? 'sys-tutorial-research-pulse 1.25s ease-in-out infinite' : undefined,
      }}
    >
      {/* Progress arc only: no extra outer button ring around the magnifier. */}
      {!isComplete && (
      <svg
        width={30}
        height={30}
        viewBox="0 0 26 26"
        style={{ position: 'absolute', inset: 0 }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={disabled ? '#556677' : '#334455'}
          strokeOpacity={disabled ? 0.3 : 0.55}
          strokeWidth={1.55}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={isResearching ? '#78a8d8' : '#d7b36a'}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      )}

      {/* Centre element: pulsing particle while researching; eye for complete; magnifier for idle. */}
      {isResearching ? (
        /* Single pulsing dot at the exact centre of the dial. */
        <div
          style={{
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#78a8d8',
            animation: skipAnim ? undefined : 'sys-research-particle-pulse 1.6s ease-in-out infinite',
            transformOrigin: '50% 50%',
          }}
        />
      ) : isComplete ? (
        /* Eye icon — indicates the system is fully researched and navigable. */
        <svg
          width={18}
          height={18}
          viewBox="0 0 16 16"
          style={{ position: 'relative', zIndex: 1 }}
          fill="none"
          stroke="#7bb8ff"
          strokeWidth={1.55}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 7c2-3 5-4 6-4s4 1 6 4c-2 3-5 4-6 4s-4-1-6-4z" />
          <circle cx="8" cy="7" r="2" />
        </svg>
      ) : (
        /* Static magnifier — idle (clickable to start). */
        <svg
          width={18}
          height={18}
          viewBox="0 0 16 16"
          style={{ position: 'relative', zIndex: 1 }}
          fill="none"
          stroke={disabled ? '#556677' : '#7bb8ff'}
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="4.2" />
          <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
        </svg>
      )}
    </button>
  );
}

function PinIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.3 1.8h5.4l-.8 4.1 2.5 2.4v1.2H8.7L8 14.2 7.3 9.5H3.6V8.3l2.5-2.4-.8-4.1z" />
    </svg>
  );
}
