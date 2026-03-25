import type React from 'react';

// ── Colors (Game Bible palette) ──────────────────────────────────────────────

export const C = {
  panelBg:        'rgba(8,14,24,0.97)',
  headerBg:       'rgba(6,11,20,0.98)',
  tabBarBg:       'rgba(10,15,25,0.95)',
  border:         '#334455',
  borderActive:   '#446688',
  borderSubtle:   'rgba(40,60,80,0.35)',
  textPrimary:    '#aabbcc',
  textSecondary:  '#8899aa',
  textMuted:      '#667788',
  accentBlue:     '#4488aa',
  accentBlueBright: '#7bb8ff',
  green:          '#44ff88',
  orange:         '#ff8844',
  red:            '#cc4444',
  redBg:          'rgba(160,20,20,0.85)',
  redBorder:      '#ff3333',
  mineralColor:   '#ff8844',
  volatileColor:  '#44ccff',
  isotopeColor:   '#cc88ff',
  researchColor:  '#4488ff',
  habitColor:     '#44ff88',
  energyColor:    '#ffcc44',
  shutdownPulse:  '#cc4444',
} as const;

// ── Shared styles ────────────────────────────────────────────────────────────

export const PANEL_WIDTH = 340;

export const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: 0,
  top: 0,
  width: PANEL_WIDTH,
  height: '100vh',
  background: C.panelBg,
  borderLeft: `1px solid ${C.border}`,
  fontFamily: 'monospace',
  zIndex: 11500,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const tabBtnBase: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'monospace',
  fontSize: 10,
  cursor: 'pointer',
  padding: '8px 12px',
  transition: 'color 0.15s, border-color 0.15s',
};

export const scrollBody: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '10px 12px',
};

export const sectionTitle: React.CSSProperties = {
  color: C.textMuted,
  fontSize: 9,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 6,
  marginTop: 12,
};

export const statRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 11,
  color: C.textSecondary,
  padding: '3px 0',
};

export const costRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 11,
  padding: '2px 0',
};

export const actionBtn: React.CSSProperties = {
  width: '100%',
  padding: '8px 0',
  borderRadius: 3,
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
};

export const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  background: 'rgba(4,8,16,0.96)',
  border: `1px solid ${C.borderActive}`,
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 10,
  color: C.textSecondary,
  fontFamily: 'monospace',
  zIndex: 12000,
  maxWidth: 220,
  pointerEvents: 'none',
  whiteSpace: 'pre-wrap',
};
