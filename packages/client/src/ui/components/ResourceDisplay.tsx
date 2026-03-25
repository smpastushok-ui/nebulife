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
  onClick: () => void;
  /** Colony resources (shown after colonization, Phase 2+) */
  minerals?: number;
  volatiles?: number;
  isotopes?: number;
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

export function ResourceDisplay({
  researchData, quarks, isExodusPhase, onClick, minerals = 0, volatiles = 0, isotopes = 0,
  countdownText, countdownUrgent = false, onTimerClick,
  observatoryUsed = 0, observatoryTotal = 0,
}: ResourceDisplayProps) {
  const { t } = useTranslation();
  const [hoverResources, setHoverResources] = useState(false);
  const [hoverTimer, setHoverTimer] = useState(false);

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

      {/* Resources -- fixed top-right */}
      <div
        style={{
          ...panelStyle,
          position: 'fixed',
          top: 12,
          right: 12,
          borderColor: hoverResources ? '#446688' : '#334455',
        }}
        onClick={onClick}
        onMouseEnter={() => setHoverResources(true)}
        onMouseLeave={() => setHoverResources(false)}
      >
        {/* Observatories */}
        {observatoryTotal > 0 && (
          <>
            <div style={itemStyle} data-tutorial-id="resource-observatories" title={t('resource_display.observatories_title')}>
              <ObservatoryIcon />
              <span style={{ color: observatoryUsed >= observatoryTotal ? '#cc4444' : '#7bb8ff' }}>
                {observatoryUsed}/{observatoryTotal}
              </span>
            </div>
            <div style={dividerStyle} />
          </>
        )}

        {/* Research Data -- always visible */}
        <div style={itemStyle} data-tutorial-id="resource-data" title={t("resource_display.research_data_title")}>
          <ResearchDataIcon />
          <span style={{ color: researchData > 0 ? '#4488aa' : '#cc4444' }}>{researchData}</span>
        </div>
        <div style={dividerStyle} />

        {/* Colony resources (Phase 2+) */}
        {!isExodusPhase && (
          <>
            <div style={itemStyle} title={t("resource_display.minerals_title")}>
              <MineralsIcon />
              <span style={{ color: '#aa8855' }}>{minerals}</span>
            </div>
            <div style={dividerStyle} />
            <div style={itemStyle} title={t("resource_display.volatiles_title")}>
              <VolatilesIcon />
              <span style={{ color: '#55aaaa' }}>{volatiles}</span>
            </div>
            <div style={dividerStyle} />
            <div style={itemStyle} title={t("resource_display.isotopes_title")}>
              <IsotopesIcon />
              <span style={{ color: '#88aa44' }}>{isotopes}</span>
            </div>
            <div style={dividerStyle} />
          </>
        )}

        <div style={itemStyle} title={t("resource_display.quarks_title")}>
          <QuarksIcon />
          <span>{quarks}</span>
        </div>
      </div>
    </>
  );
}
