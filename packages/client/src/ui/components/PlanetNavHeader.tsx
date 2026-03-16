import React from 'react';
import type { Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PlanetNavHeader — Fixed top-center navigation between planets in a system
// ---------------------------------------------------------------------------
// Shows current planet name with prev / next buttons anchored to the
// top of the screen. Does not move during pan/zoom of the scene.
// ---------------------------------------------------------------------------

interface PlanetNavHeaderProps {
  currentPlanet: Planet;
  prevPlanet: Planet | null;
  nextPlanet: Planet | null;
  onPrev: () => void;
  onNext: () => void;
}

export function PlanetNavHeader({
  currentPlanet,
  prevPlanet,
  nextPlanet,
  onPrev,
  onNext,
}: PlanetNavHeaderProps) {
  const currentName = currentPlanet.name.split(' ').pop() ?? currentPlanet.name;
  const prevName = prevPlanet ? (prevPlanet.name.split(' ').pop() ?? prevPlanet.name) : null;
  const nextName = nextPlanet ? (nextPlanet.name.split(' ').pop() ?? nextPlanet.name) : null;

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
    minWidth: 80,
  };

  const nameStyle: React.CSSProperties = {
    maxWidth: 70,
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
        top: 50,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* Main nav row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(5, 10, 20, 0.85)',
          border: '1px solid #334455',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(6px)',
        }}
      >
        {/* Prev button */}
        <button
          onClick={onPrev}
          title={prevName ?? undefined}
          style={{
            ...btnBase,
            cursor: prevPlanet ? 'pointer' : 'default',
            justifyContent: 'flex-end',
            color: prevPlanet ? '#667788' : 'transparent',
            pointerEvents: prevPlanet ? 'auto' : 'none',
          }}
        >
          <span style={arrowStyle}>{'\u25C0'}</span>
          <span style={nameStyle}>{prevName}</span>
        </button>

        {divider}

        {/* Current planet name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
          }}
        >
          <span
            style={{
              color: '#aabbcc',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            {currentName}
          </span>
        </div>

        {divider}

        {/* Next button */}
        <button
          onClick={onNext}
          title={nextName ?? undefined}
          style={{
            ...btnBase,
            cursor: nextPlanet ? 'pointer' : 'default',
            justifyContent: 'flex-start',
            color: nextPlanet ? '#667788' : 'transparent',
            pointerEvents: nextPlanet ? 'auto' : 'none',
          }}
        >
          <span style={nameStyle}>{nextName}</span>
          <span style={arrowStyle}>{'\u25B6'}</span>
        </button>
      </div>

    </div>
  );
}
