import React from 'react';
import type { StarSystem } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SystemNavHeader — Fixed top-center navigation between star systems
// ---------------------------------------------------------------------------
// Shows current system name with ◀ prev / next ▶ buttons anchored to the
// top of the screen. Does not move during pan/zoom of the PixiJS scene.
// ---------------------------------------------------------------------------

interface SystemNavHeaderProps {
  currentSystem: StarSystem;
  currentAlias?: string;
  prevSystem: StarSystem | null;
  prevAlias?: string;
  nextSystem: StarSystem | null;
  nextAlias?: string;
  onPrev: () => void;
  onNext: () => void;
}

export function SystemNavHeader({
  currentSystem,
  currentAlias,
  prevSystem,
  prevAlias,
  nextSystem,
  nextAlias,
  onPrev,
  onNext,
}: SystemNavHeaderProps) {
  const currentName = currentAlias ?? currentSystem.star.name;
  const prevName = prevSystem ? (prevAlias ?? prevSystem.star.name) : null;
  const nextName = nextSystem ? (nextAlias ?? nextSystem.star.name) : null;

  const btnBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '5px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    minWidth: 110,
  };

  const nameStyle: React.CSSProperties = {
    maxWidth: 90,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#667788',
  };

  const arrowStyle: React.CSSProperties = {
    color: '#7bb8ff',
    fontSize: 12,
    flexShrink: 0,
  };

  const divider = (
    <div style={{ width: 1, height: 18, background: '#334455', flexShrink: 0 }} />
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(5, 10, 20, 0.85)',
        border: '1px solid #334455',
        borderRadius: 4,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Prev button */}
      <button
        onClick={onPrev}
        disabled={!prevSystem}
        title={prevName ?? undefined}
        style={{
          ...btnBase,
          cursor: prevSystem ? 'pointer' : 'default',
          justifyContent: 'flex-end',
          opacity: prevSystem ? 1 : 0,
          pointerEvents: prevSystem ? 'auto' : 'none',
        }}
      >
        <span style={arrowStyle}>◀</span>
        <span style={nameStyle}>{prevName}</span>
      </button>

      {divider}

      {/* Current system name */}
      <div
        style={{
          color: '#aabbcc',
          fontSize: 12,
          letterSpacing: '0.08em',
          padding: '5px 16px',
          textTransform: 'uppercase',
        }}
      >
        {currentName}
      </div>

      {divider}

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!nextSystem}
        title={nextName ?? undefined}
        style={{
          ...btnBase,
          cursor: nextSystem ? 'pointer' : 'default',
          justifyContent: 'flex-start',
          opacity: nextSystem ? 1 : 0,
          pointerEvents: nextSystem ? 'auto' : 'none',
        }}
      >
        <span style={nameStyle}>{nextName}</span>
        <span style={arrowStyle}>▶</span>
      </button>
    </div>
  );
}
