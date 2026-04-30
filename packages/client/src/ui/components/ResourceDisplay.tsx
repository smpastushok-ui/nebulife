import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatShort } from '../../utils/formatNumber.js';
import { LiveCountdown } from './LiveCountdown.js';
import { ResourceIcon, RESOURCE_COLORS } from './ResourceIcon.js';

// ---------------------------------------------------------------------------
// ResourceDisplay -- two HUD elements:
//   1. Timer — fixed bottom-center (doomsday clock)
//   2. Resources — fixed top-center, always shows TOTALS across all colonies
// ---------------------------------------------------------------------------

interface ColonyResourceValues {
  minerals: number;
  volatiles: number;
  isotopes: number;
  water: number;
}

interface ResourceDisplayProps {
  researchData: number;
  quarks: number;
  isExodusPhase: boolean;
  /** Legacy: called when clicking the quarks area (opens top-up modal) */
  onClick: () => void;
  /** Per-resource click handlers — open description popup */
  onObservatoriesClick?: () => void;
  onResearchDataClick?: () => void;
  onMineralsClick?: () => void;
  onVolatilesClick?: () => void;
  onIsotopesClick?: () => void;
  onQuarksClick?: () => void;
  /** Legacy flat props kept for callers that don't pass totalsResources. */
  minerals?: number;
  volatiles?: number;
  isotopes?: number;
  water?: number;
  onWaterClick?: () => void;
  /**
   * Aggregated totals across all colonies (Phase 7B+).
   * When provided, these values are always displayed (no toggle).
   * Legacy flat props are used as fallback when totalsResources is absent.
   */
  totalsResources?: ColonyResourceValues;
  /**
   * Doomsday clock params. When all four are non-null AND `showCountdown`
   * is true, we render a `<LiveCountdown>` that self-updates via ref — no
   * React re-render on every game-second tick.
   */
  showCountdown?: boolean;
  gameStartedAt?: number | null;
  timeMultiplier?: number;
  accelAt?: number | null;
  gameTimeAtAccel?: number | null;
  /** Predicate that returns true to pause the countdown tick (e.g. when surface scene is open). */
  isCountdownPaused?: () => boolean;
  /** Callback when timer is clicked (e.g. show evacuation) */
  onTimerClick?: () => void;
  /** Observatory slots: how many are currently active */
  observatoryUsed?: number;
  /** Observatory slots: total available */
  observatoryTotal?: number;
  /** When true, pulse-highlight the Research Data item to draw attention */
  highlightResearchData?: boolean;
}

// ---------------------------------------------------------------------------
// Icon size — responsive to viewport width
// ---------------------------------------------------------------------------

function useIconSize(): number {
  const [size, setSize] = useState<number>(() => {
    if (window.innerWidth < 360) return 10;
    if (window.innerWidth < 480) return 12;
    return 14;
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 360) setSize(10);
      else if (window.innerWidth < 480) setSize(12);
      else setSize(14);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  zIndex: 9700,
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  background: 'rgba(10,15,25,0.92)',
  border: '1px solid #334455',
  borderRadius: 4,
  padding: '6px 10px',
  fontFamily: 'monospace',
  color: '#aabbcc',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  pointerEvents: 'auto',
  // Allow the panel to shrink on very narrow screens
  minWidth: 0,
  maxWidth: 'calc(100vw - 16px)',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 14,
  background: 'rgba(51,68,85,0.6)',
  margin: '0 8px',
  flexShrink: 0,
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 1,
  minWidth: 0,
};

/** SVG telescope icon for Observatories */
function ObservatoryIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="#7bb8ff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      <path d="M3 11.2 A5 5 0 0 1 13 11.2" />
      <path d="M2.3 13.4 H13.7" />
      <path d="M4 11.2 H12" opacity="0.55" />
      <path d="M7.6 6.3 L10.7 3.8 L12.2 5.3 L9.1 7.8" />
      <path d="M7.6 6.3 V11.2" opacity="0.55" />
      <path d="M3.9 3.4 H5.7 M4.8 2.5 V4.3" opacity="0.72" />
    </svg>
  );
}

/** SVG radar/scan icon for Research Data */
function ResearchDataIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#4488aa" strokeWidth="1.2" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="8" y1="11" x2="8" y2="14" />
      <line x1="2" y1="8" x2="5" y2="8" />
      <line x1="11" y1="8" x2="14" y2="8" />
    </svg>
  );
}

/** SVG atom icon for Quarks */
export function QuarksIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="rgba(120,160,255,0.7)" strokeWidth="1.2" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

const clickableItemStyle: React.CSSProperties = {
  ...itemStyle,
  cursor: 'pointer',
  borderRadius: 3,
  padding: '2px 3px',
  margin: '-2px -3px',
  transition: 'background 0.15s',
};

// Clamp font-size responsively
const numStyle: React.CSSProperties = {
  fontSize: 'clamp(9px, 2.4vw, 12px)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
};

export function ResourceDisplay({
  researchData, quarks, isExodusPhase, onClick,
  onObservatoriesClick, onResearchDataClick,
  onMineralsClick, onVolatilesClick, onIsotopesClick, onQuarksClick, onWaterClick,
  minerals = 0, volatiles = 0, isotopes = 0, water = 0,
  totalsResources,
  showCountdown = false, gameStartedAt, timeMultiplier, accelAt, gameTimeAtAccel,
  isCountdownPaused, onTimerClick,
  observatoryUsed = 0, observatoryTotal = 0,
  highlightResearchData = false,
}: ResourceDisplayProps) {
  const { t } = useTranslation();
  const [hoverTimer, setHoverTimer] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const iconSize = useIconSize();

  // Always use totals when available; fall back to legacy flat props otherwise.
  const displayMinerals  = totalsResources ? totalsResources.minerals  : minerals;
  const displayVolatiles = totalsResources ? totalsResources.volatiles : volatiles;
  const displayIsotopes  = totalsResources ? totalsResources.isotopes  : isotopes;
  const displayWater     = totalsResources ? totalsResources.water     : water;

  const makeItemClick = (handler?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (handler) handler();
    else onClick(); // fallback: open quarks top-up
  };

  const itemHoverStyle = (key: string): React.CSSProperties => ({
    ...clickableItemStyle,
    background: hoveredItem === key ? 'rgba(68,136,170,0.12)' : 'transparent',
  });

  return (
    <>
      <style>{`
        @keyframes researchDataPulse {
          0%, 100% { box-shadow: 0 0 4px rgba(204,68,68,0.3); }
          50% { box-shadow: 0 0 12px rgba(204,68,68,0.6); }
        }
        .countdown-urgent {
          animation: cmdbar-terminal-pulse 0.8s infinite;
        }
      `}</style>

      {/* Doomsday clock — above TERMINAL button (bottom bar).
          LiveCountdown self-updates via ref at 24Hz without re-rendering React. */}
      {showCountdown && gameStartedAt != null && timeMultiplier != null && (
        <div
          style={{
            ...panelStyle,
            position: 'fixed',
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: onTimerClick ? 'pointer' : 'default',
            borderColor: hoverTimer ? '#446688' : '#334455',
          }}
          onClick={onTimerClick || undefined}
          onMouseEnter={() => setHoverTimer(true)}
          onMouseLeave={() => setHoverTimer(false)}
        >
          <LiveCountdown
            gameStartedAt={gameStartedAt}
            timeMultiplier={timeMultiplier}
            accelAt={accelAt ?? null}
            gameTimeAtAccel={gameTimeAtAccel ?? 0}
            isPaused={isCountdownPaused}
            style={{ color: '#cc4444', fontWeight: 'bold', letterSpacing: 1 }}
          />
        </div>
      )}

      {/* Resources — fixed top-center. Always shows totals across all colonies. */}
      <div
        style={{
          ...panelStyle,
          position: 'fixed',
          top: 'calc(12px + env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'default',
        }}
      >
        {/* Observatories */}
        {observatoryTotal > 0 && (
          <>
            <div
              style={itemHoverStyle('obs')}
              data-tutorial-id="resource-observatories"
              title={t('resource_display.observatories_title')}
              onClick={makeItemClick(onObservatoriesClick)}
              onMouseEnter={() => setHoveredItem('obs')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <ObservatoryIcon size={iconSize} />
              <span style={{ ...numStyle, color: observatoryUsed >= observatoryTotal ? '#cc4444' : '#7bb8ff' }}>
                {observatoryUsed}/{observatoryTotal}
              </span>
            </div>
            <div style={dividerStyle} />
          </>
        )}

        {/* Research Data — always visible */}
        <div
          style={{
            ...itemHoverStyle('rd'),
            ...(highlightResearchData ? {
              animation: 'researchDataPulse 1s ease-in-out infinite',
              borderRadius: 3,
            } : {}),
          }}
          data-tutorial-id="resource-data"
          title={t('resource_display.research_data_title')}
          onClick={makeItemClick(onResearchDataClick)}
          onMouseEnter={() => setHoveredItem('rd')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <ResearchDataIcon size={iconSize} />
          <span style={{ ...numStyle, color: researchData > 0 ? '#4488aa' : '#cc4444' }}>{formatShort(researchData)}</span>
        </div>
        <div style={dividerStyle} />

        {/* Colony resources (Phase 2+) — always totals */}
        {!isExodusPhase && (
          <>
            <div
              style={itemHoverStyle('min')}
              title={t('resource_display.minerals_title')}
              onClick={makeItemClick(onMineralsClick)}
              onMouseEnter={() => setHoveredItem('min')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <ResourceIcon type="minerals" size={iconSize} />
              <span style={{ ...numStyle, color: RESOURCE_COLORS.minerals }}>{formatShort(displayMinerals)}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={itemHoverStyle('vol')}
              title={t('resource_display.volatiles_title')}
              onClick={makeItemClick(onVolatilesClick)}
              onMouseEnter={() => setHoveredItem('vol')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <ResourceIcon type="volatiles" size={iconSize} />
              <span style={{ ...numStyle, color: RESOURCE_COLORS.volatiles }}>{formatShort(displayVolatiles)}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={itemHoverStyle('iso')}
              title={t('resource_display.isotopes_title')}
              onClick={makeItemClick(onIsotopesClick)}
              onMouseEnter={() => setHoveredItem('iso')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <ResourceIcon type="isotopes" size={iconSize} />
              <span style={{ ...numStyle, color: RESOURCE_COLORS.isotopes }}>{formatShort(displayIsotopes)}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={itemHoverStyle('wat')}
              title={t('resource_display.water_title', 'Water')}
              onClick={makeItemClick(onWaterClick)}
              onMouseEnter={() => setHoveredItem('wat')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <ResourceIcon type="water" size={iconSize} />
              <span style={{ ...numStyle, color: RESOURCE_COLORS.water }}>{formatShort(displayWater)}</span>
            </div>
            <div style={dividerStyle} />
          </>
        )}

        <div
          style={itemHoverStyle('qk')}
          title={t('resource_display.quarks_title')}
          onClick={makeItemClick(onQuarksClick ?? onClick)}
          onMouseEnter={() => setHoveredItem('qk')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <QuarksIcon size={iconSize} />
          <span style={numStyle}>{formatShort(quarks)}</span>
        </div>
      </div>
    </>
  );
}
