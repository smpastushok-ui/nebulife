import React from 'react';
import type { Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PlanetNavHeader — Fixed top-center navigation between planets in a system
// ---------------------------------------------------------------------------
// Shows current planet name with prev / next buttons anchored to the
// top of the screen. Does not move during pan/zoom of the scene.
// Optionally shows system navigation row above planet row.
// ---------------------------------------------------------------------------

interface PlanetNavHeaderProps {
  currentPlanet: Planet;
  prevPlanet: Planet | null;
  nextPlanet: Planet | null;
  onPrev: () => void;
  onNext: () => void;
  // System navigation (optional)
  currentSystemName?: string;
  prevSystemName?: string | null;
  nextSystemName?: string | null;
  onPrevSystem?: () => void;
  onNextSystem?: () => void;
}

// Exported as React.memo below — unrelated App.tsx state changes skip
// re-rendering this nav header when none of its props changed.
function PlanetNavHeaderInner({
  currentPlanet,
  prevPlanet,
  nextPlanet,
  onPrev,
  onNext,
  currentSystemName,
  prevSystemName,
  nextSystemName,
  onPrevSystem,
  onNextSystem,
}: PlanetNavHeaderProps) {
  const currentName = currentPlanet.name.split(' ').pop() ?? currentPlanet.name;
  const prevName = prevPlanet ? (prevPlanet.name.split(' ').pop() ?? prevPlanet.name) : null;
  const nextName = nextPlanet ? (nextPlanet.name.split(' ').pop() ?? nextPlanet.name) : null;

  const showSystemRow = !!(prevSystemName || nextSystemName);

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

  // System row styles (smaller, dimmer)
  const sysBtnBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  };

  const sysNameStyle: React.CSSProperties = {
    maxWidth: 70,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#556677',
  };

  const sysArrowStyle: React.CSSProperties = {
    color: '#5588aa',
    fontSize: 10,
    flexShrink: 0,
  };

  const sysDivider = (
    <div style={{ width: 1, height: 14, background: '#2a3a4a', flexShrink: 0 }} />
  );

  return (
    <div
      style={{
        position: 'fixed',
        // Sit below the resource HUD — same offset as SystemNavHeader so
        // the two headers don't fight for vertical space. Previously 50px
        // made the switcher overlap with ResourceDisplay (tester report:
        // "зоряні системи назви і перемикачі під меню ресурсів").
        top: 'calc(70px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
        gap: 0,
      }}
    >
      {/* System nav row (above planet row) */}
      {showSystemRow && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(5, 10, 20, 0.80)',
            border: '1px solid #2a3a4a',
            borderBottom: 'none',
            borderRadius: '4px 4px 0 0',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(6px)',
          }}
        >
          {/* Prev system */}
          <button
            onClick={onPrevSystem}
            title={prevSystemName ?? undefined}
            style={{
              ...sysBtnBase,
              cursor: prevSystemName ? 'pointer' : 'default',
              justifyContent: 'flex-end',
              color: prevSystemName ? '#556677' : 'transparent',
              pointerEvents: prevSystemName ? 'auto' : 'none',
            }}
          >
            <span style={sysArrowStyle}>{'\u25C0'}</span>
            <span style={sysNameStyle}>{prevSystemName}</span>
          </button>

          {sysDivider}

          {/* Current system name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
            }}
          >
            <span
              style={{
                color: '#778899',
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
              }}
            >
              {currentSystemName}
            </span>
          </div>

          {sysDivider}

          {/* Next system */}
          <button
            onClick={onNextSystem}
            title={nextSystemName ?? undefined}
            style={{
              ...sysBtnBase,
              cursor: nextSystemName ? 'pointer' : 'default',
              justifyContent: 'flex-start',
              color: nextSystemName ? '#556677' : 'transparent',
              pointerEvents: nextSystemName ? 'auto' : 'none',
            }}
          >
            <span style={sysNameStyle}>{nextSystemName}</span>
            <span style={sysArrowStyle}>{'\u25B6'}</span>
          </button>
        </div>
      )}

      {/* Planet nav row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(5, 10, 20, 0.85)',
          border: '1px solid #334455',
          borderRadius: showSystemRow ? '0 0 4px 4px' : 4,
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

export const PlanetNavHeader = React.memo(PlanetNavHeaderInner);
