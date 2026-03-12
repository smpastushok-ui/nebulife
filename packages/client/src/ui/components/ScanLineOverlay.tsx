import React from 'react';

// ---------------------------------------------------------------------------
// ScanLineOverlay — horizontal green "x-ray" scan line while loading
// ---------------------------------------------------------------------------
// Shows a single bright green horizontal line sweeping top-to-bottom
// over 2 seconds. Content above the scan line reveals at full opacity,
// content below remains semi-transparent.
// ---------------------------------------------------------------------------

const STYLE_ID = 'scan-line-styles';
const KEYFRAMES = `
  @keyframes scanSweep {
    0%   { top: -2px; }
    100% { top: 100%; }
  }
  @keyframes scanReveal {
    0%   { clip-path: inset(100% 0 0 0); }
    100% { clip-path: inset(0 0 0 0); }
  }
  @keyframes scanFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = KEYFRAMES;
  document.head.appendChild(el);
}

export function ScanLineOverlay() {
  ensureStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 48,
        zIndex: 45,
        pointerEvents: 'none',
        overflow: 'hidden',
        animation: 'scanFadeIn 0.3s ease-out',
      }}
    >
      {/* Semi-transparent darkening layer — reveals as scan line passes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(2,5,16,0.6)',
          animation: 'scanReveal 2s ease-in-out forwards',
          animationDirection: 'reverse',
        }}
      />

      {/* Sweeping scan line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background: '#44ff88',
          boxShadow: '0 0 12px 3px rgba(68,255,136,0.5), 0 0 40px 8px rgba(68,255,136,0.15)',
          animation: 'scanSweep 2s ease-in-out forwards',
        }}
      />

      {/* Subtle vignette tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(68,255,136,0.02) 100%)',
        }}
      />
    </div>
  );
}
