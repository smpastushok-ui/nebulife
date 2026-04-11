import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem } from '@nebulife/core';
import { AdProgressButton } from './AdProgressButton.js';

// ---------------------------------------------------------------------------
// QuarkIcon — inline SVG quark currency symbol
// ---------------------------------------------------------------------------

function QuarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

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
  label: React.ReactNode; onClick: () => void; color?: string; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
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

function TooltipHint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', marginRight: 10, flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'none',
          border: '1px solid #445566',
          color: '#556677',
          fontFamily: 'monospace',
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        ?
      </button>
      {show && (
        <div style={{
          position: 'absolute',
          right: 0, top: 22,
          width: 200,
          padding: '8px 10px',
          background: 'rgba(8,12,22,0.97)',
          border: '1px solid #334455',
          borderRadius: 4,
          fontSize: 9,
          color: '#8899aa',
          lineHeight: 1.5,
          fontFamily: 'monospace',
          zIndex: 30,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

export interface SystemPhotoData {
  id: string;
  photoUrl: string;
  status: 'generating' | 'succeed' | 'failed';
  createdAt?: string;
}

export interface SystemMissionData {
  id: string;
  status: 'generating' | 'succeed' | 'failed';
  videoUrl?: string;
  durationType: 'short' | 'long';
}

export function SystemContextMenu({
  system, screenPosition, isHome, isResearched,
  systemPhoto, activeMission, quarks, playerLevel,
  onClose, onEnterSystem, onObjectsList, onRename, onCharacteristics,
  onResearch, onTelescopePhoto, onAdTelescopePhoto, onViewPhoto,
  onSendMission, onViewVideo,
  canShowAds,
}: {
  system: StarSystem;
  screenPosition: { x: number; y: number };
  isHome: boolean;
  isResearched: boolean;
  systemPhoto: SystemPhotoData | null;
  activeMission: SystemMissionData | null;
  quarks: number;
  playerLevel: number;
  onClose: () => void;
  onEnterSystem: () => void;
  onObjectsList: () => void;
  onRename: () => void;
  onCharacteristics: () => void;
  onResearch: () => void;
  onTelescopePhoto: () => void;
  onAdTelescopePhoto?: (photoToken: string) => void;
  onViewPhoto: () => void;
  onSendMission: (dur: 'short' | 'long') => void;
  onViewVideo: () => void;
  canShowAds?: boolean;
}) {
  const { t } = useTranslation();

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

  const PHOTO_COST = 50;

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
                {planetsCount === 1 ? t('radial.planet_one') : planetsCount < 5 ? t('radial.planet_few') : t('radial.planet_many')}</>
            : <>? &nbsp;|&nbsp; {t('radial.unknown_planets')}</>
          }
        </div>

        {/* Navigation */}
        {canEnter && (
          <>
            <MenuItem label={t('radial.enter_system')} onClick={onEnterSystem} color="#88ccaa" />
            <MenuItem label={t('radial.objects')} onClick={onObjectsList} color="#7799bb" />
          </>
        )}

        {/* General */}
        <MenuItem label={t('common.rename')} onClick={onRename} />
        <MenuItem label={t('radial.characteristics')} onClick={onCharacteristics} />

        {/* Research action (if not yet researched) */}
        {!isResearched && !isHome && (
          <MenuItem label={t('radial.research')} onClick={onResearch} color="#4488aa" />
        )}

        {/* Research group */}
        {(isResearched || isHome) && (
          <>
            <div style={separatorStyle} />
            <div style={groupLabelStyle}>{t('context_menu.research_group')}</div>

            {/* Telescope photo */}
            {canPhoto && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <MenuItem
                    label={<>{t('context_menu.panorama_cost', { cost: PHOTO_COST })}<QuarkIcon /></>}
                    onClick={onTelescopePhoto}
                    color={quarks >= PHOTO_COST ? '#ddaa44' : '#445566'}
                    disabled={quarks < PHOTO_COST}
                  />
                </div>
                <TooltipHint text={t('context_menu.panorama_tooltip')} />
              </div>
            )}
            {/* Ad-funded system panorama (native only) */}
            {canPhoto && canShowAds && onAdTelescopePhoto && !photoGenerating && (
              <div style={{ padding: '4px 8px' }}>
                <AdProgressButton
                  label={t('context_menu.panorama_ad_label')}
                  progressLabel={t('context_menu.panorama_ad_progress', { done: '{done}', total: '{total}' })}
                  requiredAds={5}
                  adRewardType="panorama_photo"
                  onComplete={onAdTelescopePhoto}
                  variant="menu"
                />
              </div>
            )}
            {photoGenerating && (
              <MenuItem label={t('context_menu.panorama_processing')} onClick={() => {}} disabled />
            )}
            {hasPhoto && (
              <MenuItem label={t('context_menu.view_panorama')} onClick={onViewPhoto} color="#7bb8ff" />
            )}

            {/* Probe — available from level 50+, costs data research */}
            {playerLevel >= 50 ? (
              <MenuItem
                label={t('context_menu.send_probe')}
                onClick={() => {}}
                color="#88ccaa"
                disabled
              />
            ) : (
              <div
                style={disabledItemStyle}
                title={t('planet.available_from_level', { level: 50, current: playerLevel })}
              >
                {t('context_menu.send_probe')}
                <span style={{ marginLeft: 6, fontSize: 9, color: '#445566' }}>{t('context_menu.level_50_plus')}</span>
              </div>
            )}

            {/* Missions — available after photo is ready */}
            {canMission && (
              <>
                <div style={separatorStyle} />
                <div style={groupLabelStyle}>{t('context_menu.missions_group')}</div>
                <MenuItem
                  label={<>{t('context_menu.mission_short')}<QuarkIcon /></>}
                  onClick={() => onSendMission('short')}
                  color={quarks >= 30 ? '#ddaa44' : '#445566'}
                  disabled={quarks < 30}
                />
                <MenuItem
                  label={<>{t('context_menu.mission_long')}<QuarkIcon /></>}
                  onClick={() => onSendMission('long')}
                  color={quarks >= 60 ? '#ddaa44' : '#445566'}
                  disabled={quarks < 60}
                />
              </>
            )}
            {missionGenerating && (
              <MenuItem label={t('context_menu.mission_processing')} onClick={() => {}} disabled />
            )}
            {missionComplete && (
              <MenuItem label={t('context_menu.view_mission_video')} onClick={onViewVideo} color="#7bb8ff" />
            )}
          </>
        )}
      </div>
    </>
  );
}
