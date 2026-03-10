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
`;

/* ------------------------------------------------------------------ */
/*  Shared style constants                                             */
/* ------------------------------------------------------------------ */

export const barStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 48,
  background: 'rgba(5, 10, 20, 0.92)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderTop: '1px solid rgba(60, 100, 160, 0.15)',
  zIndex: 9500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  fontFamily: 'monospace',
  color: '#8899aa',
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
  gap: 6,
  flex: '1 1 auto',
  overflow: 'hidden',
};

export const sectionRight: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flex: '0 0 auto',
};

/* ------------------------------------------------------------------ */
/*  Button styles                                                      */
/* ------------------------------------------------------------------ */

export const toolButtonBase: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(20, 30, 50, 0.6)',
  border: '1px solid rgba(60, 100, 160, 0.25)',
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

export const toolButtonActive: React.CSSProperties = {
  borderColor: 'rgba(120, 184, 255, 0.5)',
  color: '#aaccee',
  animation: 'cmdbar-glow 2s ease-in-out infinite',
};

export const zoomButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
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
  padding: '2px 4px',
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
