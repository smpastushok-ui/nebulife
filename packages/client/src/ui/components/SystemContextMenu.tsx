import React from 'react';
import type { StarSystem } from '@nebulife/core';

const MENU_WIDTH = 240;
const MENU_HEIGHT_APPROX = 320;

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

const subHeaderStyle: React.CSSProperties = {
  padding: '0 14px 4px',
  fontSize: 9,
  color: '#556677',
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

const disabledItemStyle: React.CSSProperties = {
  ...itemStyle,
  color: '#445566',
  cursor: 'default',
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
    return (
      <div style={disabledItemStyle}>{label}</div>
    );
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
  onClose, onEnterSystem, onRename, onCharacteristics,
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
  onRename: () => void;
  onCharacteristics: () => void;
  onResearch: () => void;
  onTelescopePhoto: () => void;
  onViewPhoto: () => void;
  onSendMission: (dur: 'short' | 'long') => void;
  onViewVideo: () => void;
}) {
  // Clamp position to keep menu on screen
  const maxX = window.innerWidth - MENU_WIDTH - 16;
  const maxY = window.innerHeight - MENU_HEIGHT_APPROX - 16;
  const left = Math.max(8, Math.min(screenPosition.x + 20, maxX));
  const top = Math.max(8, Math.min(screenPosition.y - 40, maxY));

  const canEnter = isHome || isResearched;
  const hasPhoto = systemPhoto?.status === 'succeed' && systemPhoto.photoUrl;
  const photoGenerating = systemPhoto?.status === 'generating';
  const missionGenerating = activeMission?.status === 'generating';
  const missionComplete = activeMission?.status === 'succeed' && activeMission.videoUrl;
  const canPhoto = isResearched && !hasPhoto && !photoGenerating;
  const canMission = hasPhoto && !missionGenerating && !missionComplete;

  // Star class tag
  const starTag = `${system.star.spectralClass}${system.star.subType}`;
  const planetsCount = system.planets.length;

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={{ ...menuStyle, left, top }}>
        {/* Header */}
        <div style={headerStyle}>
          {system.name}
          {isHome && (
            <span style={{ color: '#44ff88', marginLeft: 8, fontSize: 10 }}>HOME</span>
          )}
        </div>
        <div style={subHeaderStyle}>
          {starTag} | {planetsCount} {planetsCount === 1 ? 'планета' : planetsCount < 5 ? 'планети' : 'планет'}
        </div>

        {/* Navigation */}
        {canEnter && (
          <MenuItem label="До системи" onClick={onEnterSystem} color="#88ccaa" />
        )}

        {/* Always available */}
        <MenuItem label="Перейменувати" onClick={onRename} />
        <MenuItem label="Характеристики" onClick={onCharacteristics} />

        {/* Research */}
        {!isResearched && !isHome && (
          <MenuItem label="Дослідити" onClick={onResearch} color="#4488aa" />
        )}

        <div style={separatorStyle} />

        {/* Telescope photo */}
        {canPhoto && (
          <MenuItem
            label={`Фото з телескопа — 15 ⚛`}
            onClick={onTelescopePhoto}
            color={quarks >= 15 ? '#ddaa44' : '#445566'}
            disabled={quarks < 15}
          />
        )}
        {photoGenerating && (
          <MenuItem label="Фото — генерується..." onClick={() => {}} disabled color="#667788" />
        )}
        {hasPhoto && (
          <MenuItem label="Дивитися фото системи" onClick={onViewPhoto} color="#7bb8ff" />
        )}

        {/* Missions */}
        {canMission && (
          <>
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
          <MenuItem label="Місія — в процесі..." onClick={() => {}} disabled color="#667788" />
        )}
        {missionComplete && (
          <MenuItem label="Дивитися відео місії" onClick={onViewVideo} color="#7bb8ff" />
        )}
      </div>
    </>
  );
}
