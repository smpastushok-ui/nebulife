import React from 'react';
import type { Planet } from '@nebulife/core';

const MENU_WIDTH = 220;
const MENU_HEIGHT_APPROX = 220;

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
  display: 'block',
  width: '100%',
  padding: '8px 14px',
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
  onSurface, onUpgrade, onView3D, has3DModel, modelStatus,
}: {
  planet: Planet;
  screenPosition: { x: number; y: number };
  onViewPlanet: () => void;
  onShowCharacteristics: () => void;
  onClose: () => void;
  onSurface?: () => void;
  onUpgrade?: () => void;
  onView3D?: () => void;
  has3DModel?: boolean;
  modelStatus?: string;
}) {
  // Clamp position to keep menu on screen
  const maxX = window.innerWidth - MENU_WIDTH - 16;
  const maxY = window.innerHeight - MENU_HEIGHT_APPROX - 16;
  const left = Math.min(screenPosition.x + 8, maxX);
  const top = Math.min(screenPosition.y - 20, maxY);

  // 3D button label based on model status
  const showSurface = onSurface && (planet.isHomePlanet || planet.isColonizable);

  let modelLabel: string | null = null;
  let modelAction: (() => void) | null = null;
  let modelColor: string | undefined;

  if (has3DModel && onUpgrade) {
    modelLabel = 'Змінити вигляд — 49 ⚛';
    modelAction = onUpgrade;
    modelColor = '#7bb8ff';
  } else if (
    modelStatus === 'generating_photo' ||
    modelStatus === 'generating_3d' ||
    modelStatus === 'running' ||
    modelStatus === 'awaiting_payment'
  ) {
    modelLabel = '3D — генерація...';
    modelAction = onUpgrade ?? null;
    modelColor = '#667788';
  } else if (onUpgrade) {
    // No model, or model failed — show buy button
    modelLabel = 'Оживити в 3D — 49 ⚛';
    modelAction = onUpgrade;
    modelColor = '#ddaa44';
  }

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
        {modelLabel && modelAction && (
          <MenuItem label={modelLabel} onClick={modelAction} color={modelColor} />
        )}
        <MenuItem label="Характеристики" onClick={onShowCharacteristics} />
      </div>
    </>
  );
}
