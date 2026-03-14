import React from 'react';
import type { StarSystem } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SystemContextMenu — context popup for a star system in the galaxy view
// ---------------------------------------------------------------------------

const MENU_WIDTH = 240;
const MENU_HEIGHT_APPROX = 360;

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'auto', zIndex: 20,
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  width: MENU_WIDTH,
  background: 'rgba(10,15,25,0.97)',
  border: '1px solid #334455',
  borderRadius: 6,
  padding: '10px 0',
  fontFamily: 'monospace',
  color: '#aabbcc',
  fontSize: 12,
  zIndex: 21,
  pointerEvents: 'auto',
  boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
};

const headerStyle: React.CSSProperties = {
  padding: '0 14px 8px',
  fontSize: 13,
  color: '#ccddee',
  borderBottom: '1px solid rgba(50,60,80,0.4)',
  marginBottom: 4,
};

const subHeaderStyle: React.CSSProperties = {
  padding: '0 14px 4px',
  fontSize: 9,
  color: '#556677',
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

const disabledItemStyle: React.CSSProperties = {
  ...itemStyle,
  color: '#445566',
  cursor: 'default',
};

const groupLabelStyle: React.CSSProperties = {
  padding: '6px 14px 3px',
  fontSize: 8,
  color: '#445566',
  letterSpacing: '0.1em',
};

const itemHoverBg = 'rgba(40,60,90,0.4)';

const separatorStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(50,60,80,0.4)',
  margin: '4px 0',
};

function MenuItem({ label, onClick, color, disabled }: {
  label: string; onClick: () => void; color?: string; disabled?: boolean;
}) {
  const [hover, setHover] = React.useState(false);
  if (disabled) {
    return <div style={disabledItemStyle}>{label}</div>;
  }
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

export interface SystemPhotoData {
  id: string;
  photoUrl: string;
  status: 'generating' | 'succeed' | 'failed';
}

export interface SystemMissionData {
  id: string;
  status: 'generating' | 'succeed' | 'failed';
  videoUrl?: string;
  durationType: 'short' | 'long';
}

export function SystemContextMenu({
  system, screenPosition, isHome, isResearched,
  systemPhoto, activeMission, quarks,
  onClose, onEnterSystem, onObjectsList, onRename, onCharacteristics,
  onResearch, onTelescopePhoto, onViewPhoto,
  onSendMission, onViewVideo,
}: {
  system: StarSystem;
  screenPosition: { x: number; y: number };
  isHome: boolean;
  isResearched: boolean;
  systemPhoto: SystemPhotoData | null;
  activeMission: SystemMissionData | null;
  quarks: number;
  onClose: () => void;
  onEnterSystem: () => void;
  onObjectsList: () => void;
  onRename: () => void;
  onCharacteristics: () => void;
  onResearch: () => void;
  onTelescopePhoto: () => void;
  onViewPhoto: () => void;
  onSendMission: (dur: 'short' | 'long') => void;
  onViewVideo: () => void;
}) {
  // Clamp menu position to viewport
  const maxX = window.innerWidth - MENU_WIDTH - 16;
  const maxY = window.innerHeight - MENU_HEIGHT_APPROX - 16;
  const left = Math.max(8, Math.min(screenPosition.x + 20, maxX));
  const top  = Math.max(8, Math.min(screenPosition.y - 40, maxY));

  const canEnter = isHome || isResearched;

  const hasPhoto      = systemPhoto?.status === 'succeed' && !!systemPhoto.photoUrl;
  const photoGenerating = systemPhoto?.status === 'generating';
  const missionGenerating = activeMission?.status === 'generating';
  const missionComplete   = activeMission?.status === 'succeed' && !!activeMission.videoUrl;

  // Telescope photo available only for fully researched systems
  const canPhoto = isResearched && !hasPhoto && !photoGenerating;

  const canMission = hasPhoto && !missionGenerating && !missionComplete;

  const PHOTO_COST = 30;

  const starTag = `${system.star.spectralClass}${system.star.subType}`;
  const planetsCount = system.planets.length;

  return (
    <>
      {/* Backdrop — stops pointer events from reaching PixiJS canvas */}
      <div
        style={backdropStyle}
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
      />

      <div
        style={{ ...menuStyle, left, top }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={headerStyle}>
          {system.name}
          {isHome && (
            <span style={{ color: '#44ff88', marginLeft: 8, fontSize: 10 }}>HOME</span>
          )}
        </div>
        <div style={subHeaderStyle}>
          {isHome || isResearched
            ? <>{starTag} &nbsp;|&nbsp; {planetsCount}{' '}
                {planetsCount === 1 ? 'планета' : planetsCount < 5 ? 'планети' : 'планет'}</>
            : <>? &nbsp;|&nbsp; ? планет</>
          }
        </div>

        {/* Navigation */}
        {canEnter && (
          <>
            <MenuItem label="До системи" onClick={onEnterSystem} color="#88ccaa" />
            <MenuItem label="Об'єкти системи" onClick={onObjectsList} color="#7799bb" />
          </>
        )}

        {/* General */}
        <MenuItem label="Перейменувати" onClick={onRename} />
        <MenuItem label="Характеристики" onClick={onCharacteristics} />

        {/* Research action (if not yet researched) */}
        {!isResearched && !isHome && (
          <MenuItem label="Дослідити" onClick={onResearch} color="#4488aa" />
        )}

        {/* ── Дослідження group ── */}
        {(isResearched || isHome) && (
          <>
            <div style={separatorStyle} />
            <div style={groupLabelStyle}>ДОСЛІДЖЕННЯ</div>

            {/* Telescope photo */}
            {canPhoto && (
              <MenuItem
                label={`Фото з телескопа — ${PHOTO_COST} ⚛`}
                onClick={onTelescopePhoto}
                color={quarks >= PHOTO_COST ? '#ddaa44' : '#445566'}
                disabled={quarks < PHOTO_COST}
              />
            )}
            {photoGenerating && (
              <MenuItem label="Обробка знімку..." onClick={() => {}} disabled />
            )}
            {hasPhoto && (
              <MenuItem label="Дивитися фото системи" onClick={onViewPhoto} color="#7bb8ff" />
            )}

            {/* Probe — inactive (requires probe item) */}
            <MenuItem
              label="Відправити зонд — 30 ⚛"
              onClick={() => {}}
              disabled
            />

            {/* Missions — available after photo is ready */}
            {canMission && (
              <>
                <div style={separatorStyle} />
                <div style={groupLabelStyle}>МІСІЇ</div>
                <MenuItem
                  label={`Коротка місія 5с — 30 ⚛`}
                  onClick={() => onSendMission('short')}
                  color={quarks >= 30 ? '#ddaa44' : '#445566'}
                  disabled={quarks < 30}
                />
                <MenuItem
                  label={`Довга місія 10с — 60 ⚛`}
                  onClick={() => onSendMission('long')}
                  color={quarks >= 60 ? '#ddaa44' : '#445566'}
                  disabled={quarks < 60}
                />
              </>
            )}
            {missionGenerating && (
              <MenuItem label="Місія — в процесі..." onClick={() => {}} disabled />
            )}
            {missionComplete && (
              <MenuItem label="Дивитися відео місії" onClick={onViewVideo} color="#7bb8ff" />
            )}
          </>
        )}
      </div>
    </>
  );
}
