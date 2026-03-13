import React, { useState } from 'react';
import type { Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PlanetNavHeader — Fixed top-center navigation between planets in a system
// ---------------------------------------------------------------------------
// Shows current planet name with prev / next buttons anchored to the
// top of the screen. Does not move during pan/zoom of the PixiJS scene.
// Below the planet name: "Створити 3D планету" button (like telescope photo).
// ---------------------------------------------------------------------------

interface PlanetNavHeaderProps {
  currentPlanet: Planet;
  prevPlanet: Planet | null;
  nextPlanet: Planet | null;
  onPrev: () => void;
  onNext: () => void;
  /** 3D model generation */
  on3DGenerate?: () => void;
  is3DGenerating?: boolean;
  has3DModel?: boolean;
}

export function PlanetNavHeader({
  currentPlanet,
  prevPlanet,
  nextPlanet,
  onPrev,
  onNext,
  on3DGenerate,
  is3DGenerating,
  has3DModel,
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
        top: 14,
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

      {/* 3D generation button */}
      {on3DGenerate && (
        <Generate3DButton
          onClick={on3DGenerate}
          generating={is3DGenerating}
          hasModel={has3DModel}
        />
      )}
    </div>
  );
}

function Generate3DButton({
  onClick,
  generating,
  hasModel,
}: {
  onClick: () => void;
  generating?: boolean;
  hasModel?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={generating}
      title={hasModel ? 'Оновити 3D-модель' : 'Створити 3D-модель'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        padding: '4px 12px',
        marginTop: 4,
        background: hover && !generating ? 'rgba(30, 50, 80, 0.7)' : 'rgba(5, 10, 20, 0.85)',
        border: '1px solid',
        borderColor: generating ? '#446688' : hover ? '#4488aa' : '#334455',
        borderRadius: 4,
        cursor: generating ? 'default' : 'pointer',
        fontFamily: 'monospace',
        fontSize: 10,
        color: generating ? '#4488aa' : hover ? '#aabbcc' : '#667788',
        backdropFilter: 'blur(6px)',
        transition: 'all 0.15s',
        alignSelf: 'center',
      }}
    >
      {/* 3D cube icon */}
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z" />
        <path d="M8 15V8" />
        <path d="M8 8L1.5 4.75" />
        <path d="M8 8L14.5 4.75" />
      </svg>
      {generating ? (
        <span>Генерація...</span>
      ) : (
        <>
          <span>{hasModel ? 'Оновити' : '3D'}</span>
          <span style={{ opacity: 0.75 }}>49</span>
          {/* Quark / atom icon */}
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="2" />
            <ellipse cx="8" cy="8" rx="7" ry="3" />
            <ellipse cx="8" cy="8" rx="3" ry="7" />
          </svg>
        </>
      )}
    </button>
  );
}
