import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// ResourceDisplay -- top-right HUD showing player resources
// Phase 1 (Exodus): Research Data | Quarks
// Phase 2+:         Minerals | Volatiles | Isotopes | Quarks
// ---------------------------------------------------------------------------

interface ResourceDisplayProps {
  researchData: number;
  quarks: number;
  isExodusPhase: boolean;
  onClick: () => void;
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 200,
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

export function ResourceDisplay({ researchData, quarks, isExodusPhase, onClick }: ResourceDisplayProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        ...containerStyle,
        borderColor: hover ? '#446688' : '#334455',
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isExodusPhase && (
        <>
          <div style={itemStyle}>
            <ResearchDataIcon />
            <span style={{ color: researchData > 0 ? '#4488aa' : '#cc4444' }}>{researchData}</span>
          </div>
          <div style={dividerStyle} />
        </>
      )}

      <div style={itemStyle}>
        <span style={{ fontSize: 13, color: 'rgba(120,160,255,0.7)' }}>&#9883;</span>
        <span>{quarks}</span>
      </div>
    </div>
  );
}
