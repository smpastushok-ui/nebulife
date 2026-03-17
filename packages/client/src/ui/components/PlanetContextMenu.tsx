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

export function PlanetContextMenu({
  planet, screenPosition,
  onViewPlanet, onShowCharacteristics, onClose,
  onSurface,
  isDestroyed,
  surfaceDisabledReason,
  accessDisabledReason,
}: {
  planet: Planet;
  screenPosition: { x: number; y: number };
  onViewPlanet: () => void;
  onShowCharacteristics: () => void;
  onClose: () => void;
  onSurface?: () => void;
  isDestroyed?: boolean;
  surfaceDisabledReason?: string;
  accessDisabledReason?: string;
}) {
  // Destroyed planets have no interactive menu
  if (isDestroyed) {
    return (
      <>
        <div style={backdropStyle} onClick={onClose} />
        <div style={{ ...menuStyle, left: Math.min(screenPosition.x + 8, window.innerWidth - MENU_WIDTH - 16), top: Math.min(screenPosition.y - 20, window.innerHeight - MENU_HEIGHT_APPROX - 16) }}>
          <div style={headerStyle}>
            {planet.name}
            <span style={{ color: '#884422', marginLeft: 8, fontSize: 10 }}>ЗРУЙНОВАНО</span>
          </div>
          <div style={{ padding: '12px 14px', color: '#553322', fontSize: 11, fontFamily: 'monospace' }}>
            Планета зруйнована. Залишились лише уламки.
          </div>
        </div>
      </>
    );
  }

  // Clamp position to keep menu on screen
  const maxX = window.innerWidth - MENU_WIDTH - 16;
  const maxY = window.innerHeight - MENU_HEIGHT_APPROX - 16;
  const left = Math.min(screenPosition.x + 8, maxX);
  const top = Math.min(screenPosition.y - 20, maxY);

  const showSurface = onSurface && (planet.type === 'rocky' || planet.type === 'dwarf');

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
        {!accessDisabledReason ? (
          <MenuItem label="Екзосфера" onClick={onViewPlanet} />
        ) : (
          <div style={{ ...itemStyle, cursor: 'default', color: '#556677', fontSize: 11 }} title={accessDisabledReason}>
            Екзосфера
            <span style={{ marginLeft: 6, fontSize: 9, color: '#445566' }}>{accessDisabledReason}</span>
          </div>
        )}
        {showSurface && !surfaceDisabledReason && (
          <MenuItem label="На поверхню" onClick={onSurface} color="#88ccaa" />
        )}
        {showSurface && surfaceDisabledReason && (
          <div style={{ ...itemStyle, cursor: 'default', color: '#556677', fontSize: 11 }} title={surfaceDisabledReason}>
            На поверхню
            <span style={{ marginLeft: 6, fontSize: 9, color: '#445566' }}>{surfaceDisabledReason}</span>
          </div>
        )}
        <MenuItem label="Характеристики" onClick={onShowCharacteristics} />
      </div>
    </>
  );
}
