import React, { useState } from 'react';
import type { Planet } from '@nebulife/core';

const MENU_WIDTH = 220;
const MENU_HEIGHT_APPROX = 170;

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'auto', zIndex: 20,
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  width: MENU_WIDTH,
  background: 'rgba(10,15,25,0.95)',
  border: '1px solid #334455',
  borderRadius: 6,
  padding: '10px 0',
  fontFamily: 'monospace',
  color: '#aabbcc',
  fontSize: 12,
  zIndex: 21,
  pointerEvents: 'auto',
  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
};

const headerStyle: React.CSSProperties = {
  padding: '0 14px 8px',
  fontSize: 13,
  color: '#ccddee',
  borderBottom: '1px solid rgba(50,60,80,0.4)',
  marginBottom: 4,
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '8px 14px',
  minHeight: 44,
  background: 'none',
  border: 'none',
  color: '#8899aa',
  fontFamily: 'monospace',
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
};

const itemHoverBg = 'rgba(40,60,90,0.4)';

function MenuItem({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      style={{ ...itemStyle, background: hover ? itemHoverBg : 'none', color: color ?? itemStyle.color }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** 3D cube SVG icon */
const CubeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" />
    <line x1="8" y1="15" x2="8" y2="8" />
    <line x1="8" y1="8" x2="2" y2="4.5" />
    <line x1="8" y1="8" x2="14" y2="4.5" />
  </svg>
);

/** Atom / quark currency icon */
const QuarkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
    strokeLinecap="round" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="2" />
    <ellipse cx="8" cy="8" rx="7" ry="3" />
    <ellipse cx="8" cy="8" rx="3" ry="7" />
  </svg>
);

/** Info "?" tooltip for quantum synthesis */
function QuantumInfoTooltip() {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto', cursor: 'help' }}
      onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#556677" strokeWidth="1.2">
        <circle cx="8" cy="8" r="6.5" />
        <text x="8" y="11" textAnchor="middle" fill="#556677" stroke="none" fontSize="9" fontFamily="monospace">?</text>
      </svg>
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          width: 220, padding: '10px 12px',
          background: 'rgba(10, 15, 25, 0.97)', border: '1px solid #446688', borderRadius: 4,
          fontSize: 10, lineHeight: 1.5, color: '#8899aa', fontFamily: 'monospace',
          zIndex: 100, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <div style={{ color: '#aaccee', fontSize: 11, marginBottom: 6 }}>Квантовий синтез</div>
          <div>Створiть унiкальну iнтерактивну 3D-модель вашої планети. Кожна модель генерується штучним iнтелектом спецiально для вас — двох однакових не iснує.</div>
        </div>
      )}
    </span>
  );
}

export function PlanetContextMenu({
  planet, screenPosition,
  onViewPlanet, onShowCharacteristics, onClose,
  onSurface, on3DGenerate, has3DModel, is3DGenerating,
}: {
  planet: Planet;
  screenPosition: { x: number; y: number };
  onViewPlanet: () => void;
  onShowCharacteristics: () => void;
  onClose: () => void;
  onSurface?: () => void;
  on3DGenerate?: () => void;
  has3DModel?: boolean;
  is3DGenerating?: boolean;
}) {
  const [hover3D, setHover3D] = React.useState(false);
  // Clamp position to keep menu on screen
  const maxX = window.innerWidth - MENU_WIDTH - 16;
  const maxY = window.innerHeight - MENU_HEIGHT_APPROX - 16;
  const left = Math.min(screenPosition.x + 8, maxX);
  const top = Math.min(screenPosition.y - 20, maxY);

  const showSurface = onSurface && (planet.isHomePlanet || planet.isColonizable);

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div style={backdropStyle} onClick={onClose} />
      <div style={{ ...menuStyle, left, top }}>
        <div style={headerStyle}>
          {planet.name}
          {planet.isHomePlanet && (
            <span style={{ color: '#44ff88', marginLeft: 8, fontSize: 10 }}>HOME</span>
          )}
        </div>
        <MenuItem label="Екзосфера" onClick={onViewPlanet} />
        {showSurface && (
          <MenuItem label="На поверхню" onClick={onSurface} color="#88ccaa" />
        )}
        <MenuItem label="Характеристики" onClick={onShowCharacteristics} />
        {on3DGenerate && !has3DModel && !is3DGenerating && (
          <button
            style={{
              ...itemStyle,
              background: hover3D ? itemHoverBg : 'none',
              color: hover3D ? '#7bb8ff' : '#4488aa',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={() => setHover3D(true)}
            onMouseLeave={() => setHover3D(false)}
            onClick={on3DGenerate}
          >
            <CubeIcon />
            <span>Квантовий синтез</span>
            <span style={{ color: hover3D ? '#aaccff' : '#667799', marginLeft: 2 }}>49</span>
            <QuarkIcon />
            <QuantumInfoTooltip />
          </button>
        )}
      </div>
    </>
  );
}
