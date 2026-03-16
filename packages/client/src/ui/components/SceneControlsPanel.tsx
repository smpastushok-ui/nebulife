import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// SceneControlsPanel — Left-side vertical controls (back, center, zoom)
// ---------------------------------------------------------------------------

interface ExtraButton {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface SceneControlsPanelProps {
  onBack: () => void;
  onCenter?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  backLabel?: string;
  showCenter?: boolean;
  showZoom?: boolean;
  /** Additional custom buttons rendered after zoom controls */
  extraButtons?: ExtraButton[];
  /** When true, panel slides off-screen to the left */
  hidden?: boolean;
}

const btnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(10,15,25,0.85)',
  border: '1px solid rgba(68,102,136,0.4)',
  borderRadius: 4,
  color: '#8899aa',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'monospace',
  fontSize: 14,
  transition: 'border-color 0.15s, color 0.15s',
};

function ControlButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        ...btnStyle,
        borderColor: hover ? 'rgba(120,160,255,0.5)' : 'rgba(68,102,136,0.4)',
        color: hover ? '#aabbcc' : '#8899aa',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

export function SceneControlsPanel({
  onBack,
  onCenter,
  onZoomIn,
  onZoomOut,
  backLabel,
  showCenter = false,
  showZoom = false,
  extraButtons,
  hidden = false,
}: SceneControlsPanelProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: hidden ? -60 : 14,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 9400,
        transition: 'left 0.3s ease',
        pointerEvents: hidden ? 'none' : 'auto',
      }}
    >
      {/* Back */}
      <ControlButton onClick={onBack} title={backLabel || 'Назад'}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
      </ControlButton>

      {/* Center */}
      {showCenter && onCenter && (
        <ControlButton onClick={onCenter} title="Центрувати">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="6" />
            <line x1="8" y1="2" x2="8" y2="5" />
            <line x1="8" y1="11" x2="8" y2="14" />
            <line x1="2" y1="8" x2="5" y2="8" />
            <line x1="11" y1="8" x2="14" y2="8" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </ControlButton>
      )}

      {/* Zoom in */}
      {showZoom && onZoomIn && (
        <ControlButton onClick={onZoomIn} title="Наблизити">
          +
        </ControlButton>
      )}

      {/* Zoom out */}
      {showZoom && onZoomOut && (
        <ControlButton onClick={onZoomOut} title="Віддалити">
          {'\u2212'}
        </ControlButton>
      )}

      {/* Extra buttons */}
      {extraButtons && extraButtons.map((btn, i) => (
        <ControlButton key={i} onClick={btn.onClick} title={btn.title}>
          {btn.icon}
        </ControlButton>
      ))}
    </div>
  );
}
