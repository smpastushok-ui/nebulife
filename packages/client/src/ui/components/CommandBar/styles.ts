import type React from 'react';

/* ------------------------------------------------------------------ */
/*  CSS Keyframes (injected via <style> tag in CommandBar)              */
/* ------------------------------------------------------------------ */

export const KEYFRAMES_CSS = `
@keyframes cmdbar-slide-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes cmdbar-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes cmdbar-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(120, 184, 255, 0.15); }
  50%      { box-shadow: 0 0 8px rgba(120, 184, 255, 0.35); }
}

@keyframes cmdbar-terminal-pulse {
  0%, 100% { border-color: rgba(68, 102, 136, 0.42); }
  50%      { border-color: rgba(120, 184, 255, 0.62); }
}
`;

/* ------------------------------------------------------------------ */
/*  Shared style constants                                             */
/* ------------------------------------------------------------------ */

export const barStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  minHeight: 50,
  height: 'auto',
  background: 'transparent',
  borderTop: 'none',
  zIndex: 9500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 8px calc(4px + env(safe-area-inset-bottom, 0px))',
  fontFamily: 'monospace',
  color: '#8899aa',
  pointerEvents: 'none',
};

export const dockStyle: React.CSSProperties = {
  width: 'min(100%, 520px)',
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '3px 5px',
  boxSizing: 'border-box',
  background: 'rgba(5, 10, 20, 0.58)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(51, 68, 85, 0.7)',
  borderRadius: 5,
  boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.22)',
  overflow: 'visible',
  pointerEvents: 'auto',
};

export const sectionLeft: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flex: '0 0 auto',
  maxWidth: '35%',
  overflow: 'hidden',
};

export const sectionCenter: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  flex: '1 1 auto',
  minWidth: 0,
  overflow: 'hidden',
};

export const sectionRight: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 0,
  flex: '0 0 auto',
  minWidth: 0,
};

/* ------------------------------------------------------------------ */
/*  Button styles                                                      */
/* ------------------------------------------------------------------ */

export const toolButtonBase: React.CSSProperties = {
  padding: '4px 10px',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(10, 18, 32, 0.38)',
  border: '1px solid rgba(68, 102, 136, 0.42)',
  borderRadius: 3,
  color: '#8899aa',
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
};

export const toolButtonPrimary: React.CSSProperties = {
  ...toolButtonBase,
  color: '#aaccee',
  borderColor: 'rgba(100, 160, 220, 0.4)',
  background: 'rgba(30, 60, 100, 0.5)',
};

export const toolButtonAccent: React.CSSProperties = {
  ...toolButtonBase,
  color: '#aaccff',
  borderColor: 'rgba(120, 160, 255, 0.4)',
  background: 'linear-gradient(135deg, rgba(30, 60, 120, 0.6), rgba(60, 100, 180, 0.4))',
};

export const toolButtonTerminal: React.CSSProperties = {
  ...toolButtonBase,
  width: 'clamp(42px, 11.5vw, 48px)',
  height: 44,
  padding: '4px 3px',
  minHeight: 44,
  boxSizing: 'border-box',
  color: '#9fb8d0',
  borderColor: 'rgba(68, 102, 136, 0.5)',
  background: 'rgba(10, 18, 32, 0.42)',
  letterSpacing: 1.5,
  fontSize: 11,
};

export const toolButtonActive: React.CSSProperties = {
  borderColor: 'rgba(120, 184, 255, 0.62)',
  color: '#aaccee',
  background: 'rgba(20, 38, 58, 0.5)',
};

export const zoomButtonStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(20, 30, 50, 0.6)',
  border: '1px solid rgba(60, 100, 160, 0.25)',
  borderRadius: 3,
  color: '#8899aa',
  fontFamily: 'monospace',
  fontSize: 14,
  cursor: 'pointer',
  transition: 'all 0.2s',
  padding: 0,
};

export const breadcrumbButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#556677',
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
  padding: '2px 6px',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  transition: 'color 0.2s',
  whiteSpace: 'nowrap',
};

export const breadcrumbActive: React.CSSProperties = {
  ...breadcrumbButton,
  color: '#aaccee',
  cursor: 'default',
};

export const breadcrumbSeparator: React.CSSProperties = {
  color: '#334455',
  fontSize: 10,
  margin: '0 2px',
  userSelect: 'none',
};

export const quarksButtonStyle: React.CSSProperties = {
  cursor: 'pointer',
  background: 'rgba(20, 30, 50, 0.7)',
  border: '1px solid rgba(120, 160, 255, 0.25)',
  color: '#aaccff',
  padding: '4px 10px',
  minHeight: 44,
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  transition: 'border-color 0.2s',
};

export const playerNameStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#88aacc',
  whiteSpace: 'nowrap',
};
