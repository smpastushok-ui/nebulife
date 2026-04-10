import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../audio/SfxPlayer.js';

// ---------------------------------------------------------------------------
// SceneControlsPanel — Left-side vertical controls (back, center, zoom)
// ---------------------------------------------------------------------------

interface ExtraButton {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** When true, button pulses with blue neon glow */
  pulse?: boolean;
}

interface ResearchPanelInfo {
  /** Eye button active (research labels shown on map) */
  labelsEnabled: boolean;
  onToggle: () => void;
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
  /** Galaxy research: eye toggle + hover % counter */
  researchPanel?: ResearchPanelInfo;
}

const NEON_STYLE_ID = 'scp-neon-pulse';
const NEON_KEYFRAMES = `
@keyframes scp-neon-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(68,136,255,0.25); border-color: rgba(68,136,255,0.35); }
  50% { box-shadow: 0 0 14px rgba(68,136,255,0.55), 0 0 4px rgba(68,136,255,0.3) inset; border-color: rgba(68,136,255,0.65); }
}`;

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
  pulse,
  active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  pulse?: boolean;
  active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => { playSfx('ui-click', 0.15); onClick(); }}
      title={title}
      style={{
        ...btnStyle,
        borderColor: hover
          ? 'rgba(120,160,255,0.5)'
          : active
            ? 'rgba(68,136,180,0.75)'
            : pulse
              ? undefined
              : 'rgba(68,102,136,0.4)',
        color: hover ? '#aabbcc' : active ? '#7bbcdd' : pulse ? '#88bbff' : '#8899aa',
        background: active ? 'rgba(20,40,65,0.90)' : btnStyle.background,
        ...(pulse ? { animation: 'scp-neon-pulse 2s ease-in-out infinite' } : {}),
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
  researchPanel,
}: SceneControlsPanelProps) {
  const { t } = useTranslation();
  // Inject neon pulse keyframes once
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current || document.getElementById(NEON_STYLE_ID)) {
      injected.current = true;
      return;
    }
    const style = document.createElement('style');
    style.id = NEON_STYLE_ID;
    style.textContent = NEON_KEYFRAMES;
    document.head.appendChild(style);
    injected.current = true;
  }, []);

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
      <ControlButton onClick={onBack} title={backLabel || t('common.back')}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
      </ControlButton>

      {/* Center */}
      {showCenter && onCenter && (
        <ControlButton onClick={onCenter} title={t('scene_controls.center')}>
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
        <ControlButton onClick={onZoomIn} title={t('scene_controls.zoom_in')}>
          +
        </ControlButton>
      )}

      {/* Zoom out */}
      {showZoom && onZoomOut && (
        <ControlButton onClick={onZoomOut} title={t('scene_controls.zoom_out')}>
          {'\u2212'}
        </ControlButton>
      )}

      {/* Research: eye toggle + hover % counter */}
      {researchPanel && (
        <>
          <ControlButton
            onClick={researchPanel.onToggle}
            title={researchPanel.labelsEnabled ? t('scene_controls.hide_research_pct') : t('scene_controls.show_research_pct')}
            active={researchPanel.labelsEnabled}
          >
            {/* Eye icon */}
            <svg width="14" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M1 6 C4 1, 12 1, 15 6 C12 11, 4 11, 1 6Z" />
              <circle cx="8" cy="6" r="2.2" fill="currentColor" stroke="none" />
            </svg>
          </ControlButton>
        </>
      )}

      {/* Extra buttons */}
      {extraButtons && extraButtons.map((btn, i) =>
        btn.disabled ? (
          <button
            key={i}
            title={btn.title}
            style={{
              ...btnStyle,
              color: '#556677',
              borderColor: 'rgba(50,60,80,0.3)',
              cursor: 'default',
              opacity: 0.6,
            }}
            disabled
          >
            {btn.icon}
          </button>
        ) : (
          <ControlButton key={i} onClick={btn.onClick} title={btn.title} pulse={btn.pulse}>
            {btn.icon}
          </ControlButton>
        )
      )}
    </div>
  );
}
