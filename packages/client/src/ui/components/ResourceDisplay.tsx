import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// ResourceDisplay -- two HUD elements:
//   1. Timer — fixed top-center
//   2. Resources — fixed top-right
// ---------------------------------------------------------------------------

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
  /** Colony resources (shown after colonization, Phase 2+) */
  minerals?: number;
  volatiles?: number;
  isotopes?: number;
  water?: number;
  onWaterClick?: () => void;
  /** Countdown timer text (shown when clock is visible) */
  countdownText?: string;
  /** Whether countdown is in urgent mode */
  countdownUrgent?: boolean;
  /** Callback when timer is clicked (e.g. show evacuation) */
  onTimerClick?: () => void;
  /** Observatory slots: how many are currently active */
  observatoryUsed?: number;
  /** Observatory slots: total available */
  observatoryTotal?: number;
}

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
  fontSize: 11,
  color: '#aabbcc',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  pointerEvents: 'auto',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 14,
  background: 'rgba(51,68,85,0.6)',
  margin: '0 10px',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

/** SVG telescope icon for Observatories */
function ObservatoryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2">
      <circle cx="8" cy="5" r="4" />
      <line x1="8" y1="9" x2="8" y2="14" />
      <line x1="5" y1="14" x2="11" y2="14" />
      <line x1="4" y1="11" x2="8" y2="9" />
      <line x1="12" y1="11" x2="8" y2="9" />
    </svg>
  );
}

/** SVG radar/scan icon for Research Data */
function ResearchDataIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#4488aa" strokeWidth="1.2">
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
function QuarksIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(120,160,255,0.7)" strokeWidth="1.2">
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

/** SVG crystal icon for Minerals */
function MineralsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#aa8855" strokeWidth="1.2">
      <path d="M8 2L13 7L8 14L3 7Z" />
      <line x1="3" y1="7" x2="13" y2="7" />
      <line x1="8" y1="2" x2="5.5" y2="7" />
      <line x1="8" y1="2" x2="10.5" y2="7" />
    </svg>
  );
}

/** SVG cloud icon for Volatiles */
function VolatilesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#55aaaa" strokeWidth="1.2">
      <circle cx="6" cy="9" r="3" />
      <circle cx="10" cy="8" r="3.5" />
      <circle cx="8" cy="6" r="2.5" />
    </svg>
  );
}

/** SVG atom icon for Isotopes */
function IsotopesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#88aa44" strokeWidth="1.2">
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(-60 8 8)" />
    </svg>
  );
}

/** SVG water droplet icon */
function WaterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#3b82f6" strokeWidth="1.2">
      <path d="M8 2C8 2 3 8 3 11C3 13.8 5.2 15 8 15C10.8 15 13 13.8 13 11C13 8 8 2 8 2Z" />
    </svg>
  );
}

const clickableItemStyle: React.CSSProperties = {
  ...itemStyle,
  cursor: 'pointer',
  borderRadius: 3,
  padding: '2px 4px',
  margin: '-2px -4px',
  transition: 'background 0.15s',
};

export function ResourceDisplay({
  researchData, quarks, isExodusPhase, onClick,
  onObservatoriesClick, onResearchDataClick,
  onMineralsClick, onVolatilesClick, onIsotopesClick, onQuarksClick, onWaterClick,
  minerals = 0, volatiles = 0, isotopes = 0, water = 0,
  countdownText, countdownUrgent = false, onTimerClick,
  observatoryUsed = 0, observatoryTotal = 0,
}: ResourceDisplayProps) {
  const { t } = useTranslation();
  const [hoverTimer, setHoverTimer] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
      {/* Timer -- above TERMINAL button (bottom bar) */}
      {countdownText && (
        <div
          style={{
            ...panelStyle,
            position: 'fixed',
            bottom: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: onTimerClick ? 'pointer' : 'default',
            borderColor: hoverTimer ? '#446688' : '#334455',
          }}
          onClick={onTimerClick || undefined}
          onMouseEnter={() => setHoverTimer(true)}
          onMouseLeave={() => setHoverTimer(false)}
        >
          <span
            style={{
              color: '#cc4444',
              fontWeight: 'bold',
              letterSpacing: 1,
              animation: countdownUrgent ? 'cmdbar-terminal-pulse 0.8s infinite' : undefined,
            }}
          >
            {countdownText}
          </span>
        </div>
      )}

      {/* Resources -- fixed top-center (each item individually clickable) */}
      <div
        style={{
          ...panelStyle,
          position: 'fixed',
          top: 12,
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
              <ObservatoryIcon />
              <span style={{ color: observatoryUsed >= observatoryTotal ? '#cc4444' : '#7bb8ff' }}>
                {observatoryUsed}/{observatoryTotal}
              </span>
            </div>
            <div style={dividerStyle} />
          </>
        )}

        {/* Research Data -- always visible */}
        <div
          style={itemHoverStyle('rd')}
          data-tutorial-id="resource-data"
          title={t('resource_display.research_data_title')}
          onClick={makeItemClick(onResearchDataClick)}
          onMouseEnter={() => setHoveredItem('rd')}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <ResearchDataIcon />
          <span style={{ color: researchData > 0 ? '#4488aa' : '#cc4444' }}>{researchData}</span>
        </div>
        <div style={dividerStyle} />

        {/* Colony resources (Phase 2+) */}
        {!isExodusPhase && (
          <>
            <div
              style={itemHoverStyle('min')}
              title={t('resource_display.minerals_title')}
              onClick={makeItemClick(onMineralsClick)}
              onMouseEnter={() => setHoveredItem('min')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <MineralsIcon />
              <span style={{ color: '#aa8855' }}>{minerals}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={itemHoverStyle('vol')}
              title={t('resource_display.volatiles_title')}
              onClick={makeItemClick(onVolatilesClick)}
              onMouseEnter={() => setHoveredItem('vol')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <VolatilesIcon />
              <span style={{ color: '#55aaaa' }}>{volatiles}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={itemHoverStyle('iso')}
              title={t('resource_display.isotopes_title')}
              onClick={makeItemClick(onIsotopesClick)}
              onMouseEnter={() => setHoveredItem('iso')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <IsotopesIcon />
              <span style={{ color: '#88aa44' }}>{isotopes}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={itemHoverStyle('wat')}
              title={t('resource_display.water_title', 'Water')}
              onClick={makeItemClick(onWaterClick)}
              onMouseEnter={() => setHoveredItem('wat')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <WaterIcon />
              <span style={{ color: '#3b82f6' }}>{water}</span>
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
          <QuarksIcon />
          <span>{quarks}</span>
        </div>
      </div>
    </>
  );
}
