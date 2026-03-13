import React from 'react';

// ---------------------------------------------------------------------------
// SystemResearchOverlay — blur overlay for unresearched star systems
// ---------------------------------------------------------------------------
// Shows a CSS backdrop-filter blur + "Досліджено X%" label.
// Blocks all planet interactions underneath via pointerEvents: 'auto'.
// Rendered above PixiJS canvas (z=15), below SystemNavHeader (z=40)
// and CommandBar (z=50+) so navigation remains functional.
// ---------------------------------------------------------------------------

interface SystemResearchOverlayProps {
  /** Research progress 0-100 */
  progress: number;
}

export function SystemResearchOverlay({ progress }: SystemResearchOverlayProps) {
  if (progress >= 100) return null;

  // 0% -> 25px blur, 90% -> 3px, 100% -> 0px
  const blurPx = Math.round((1 - progress / 100) * 25);
  // Semi-transparent dark overlay: 0% -> 0.5, 100% -> 0
  const overlayOpacity = (1 - progress / 100) * 0.5;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 15,
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
        backgroundColor: `rgba(2, 5, 16, ${overlayOpacity})`,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* Research progress label */}
      <div
        style={{
          color: '#667788',
          fontSize: 16,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {`Досліджено ${Math.round(progress)}%`}
      </div>

      {/* Thin progress bar */}
      <div
        style={{
          marginTop: 12,
          width: 200,
          height: 2,
          background: 'rgba(51, 68, 85, 0.5)',
          borderRadius: 1,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4488aa',
            borderRadius: 1,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
