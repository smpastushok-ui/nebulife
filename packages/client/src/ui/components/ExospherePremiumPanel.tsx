import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet } from '@nebulife/core';
import { PremiumHelpButton } from './PremiumHelp.js';

type ActionStatus = 'idle' | 'generating' | 'ready' | 'disabled';

interface ExospherePremiumPanelProps {
  planet: Planet;
  quarks: number;
  alphaPhotoStatus: ActionStatus;
  planetSkinStatus: ActionStatus;
  hasGoldenImage: boolean;
  onAlphaPhoto: () => void;
  onPlanetSkin: () => void;
  onGoldenImage: () => void;
}

const PANEL_WIDTH = 248;

function TelescopeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffe2a0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14l9-7 3 4-9 7z" />
      <path d="M12 8l3-2 4 5-3 2" />
      <path d="M10 16l3 5" />
      <path d="M9 21h8" />
      <path d="M15 13l4 6" />
    </svg>
  );
}

function QuarkMark() {
  return <span style={{ color: '#7bb8ff', marginLeft: 4 }}>⚛</span>;
}

function PremiumAction({
  icon,
  label,
  detail,
  status,
  onClick,
  helpId,
  disabled,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  detail: string;
  status: ActionStatus;
  onClick: () => void;
  helpId?: 'planet-skin' | 'planet-photo-exosphere';
  disabled?: boolean;
}) {
  const isReady = status === 'ready';
  const isBusy = status === 'generating';
  const isDisabled = disabled || status === 'disabled' || isBusy || isReady;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={onClick}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '24px 1fr',
          gap: 9,
          alignItems: 'center',
          padding: helpId ? '10px 36px 10px 11px' : '10px 11px',
          borderRadius: 7,
          border: isReady ? '1px solid rgba(68,255,136,0.45)' : '1px solid rgba(221,170,68,0.55)',
          background: isReady
            ? 'linear-gradient(135deg, rgba(18,48,32,0.72), rgba(6,18,18,0.86))'
            : 'linear-gradient(135deg, rgba(86,58,12,0.62), rgba(18,14,5,0.88))',
          color: isDisabled && !isReady ? '#665533' : '#ffd98a',
          fontFamily: 'monospace',
          cursor: isDisabled ? 'default' : 'pointer',
          textAlign: 'left',
          boxShadow: isReady
            ? '0 0 18px rgba(68,255,136,0.12), inset 0 0 22px rgba(68,255,136,0.05)'
            : '0 0 18px rgba(221,170,68,0.16), inset 0 0 22px rgba(221,170,68,0.06)',
          opacity: isDisabled && !isReady ? 0.72 : 1,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        <span>
          <span style={{ display: 'block', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {label}
          </span>
          <span style={{ display: 'block', marginTop: 3, color: isReady ? '#88ccaa' : '#a98f57', fontSize: 9, lineHeight: 1.35 }}>
            {detail}
          </span>
        </span>
      </button>
      {helpId && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <PremiumHelpButton helpId={helpId} />
        </div>
      )}
    </div>
  );
}

export function ExospherePremiumPanel({
  planet,
  quarks,
  alphaPhotoStatus,
  planetSkinStatus,
  hasGoldenImage,
  onAlphaPhoto,
  onPlanetSkin,
  onGoldenImage,
}: ExospherePremiumPanelProps) {
  const { t } = useTranslation();
  const isMobile = window.innerWidth < 760;
  const canAffordAlpha = quarks >= 25;
  const canAffordSkin = quarks >= 50;

  return (
    <aside
      style={{
        position: 'fixed',
        right: isMobile ? 10 : 18,
        top: isMobile ? 84 : 92,
        width: isMobile ? `min(${PANEL_WIDTH}px, calc(100vw - 20px))` : PANEL_WIDTH,
        zIndex: 1100,
        pointerEvents: 'auto',
        padding: 10,
        borderRadius: 9,
        border: '1px solid rgba(221,170,68,0.38)',
        background: 'linear-gradient(180deg, rgba(10,15,25,0.90), rgba(5,8,14,0.82))',
        boxShadow: '0 16px 42px rgba(0,0,0,0.55), inset 0 0 28px rgba(221,170,68,0.06)',
        fontFamily: 'monospace',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 }}>
        <div>
          <div style={{ color: '#ddaa44', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>
            {t('exosphere_premium.title')}
          </div>
          <div style={{ color: '#667788', fontSize: 9, marginTop: 2, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {planet.name}
          </div>
        </div>
        <div style={{ color: '#7bb8ff', fontSize: 11 }}>
          {Math.floor(quarks)} <QuarkMark />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <PremiumAction
          icon={<TelescopeIcon />}
          label={<>{t('exosphere_premium.alpha_photo', { cost: 25 })}<QuarkMark /></>}
          detail={alphaPhotoStatus === 'generating'
            ? t('planet.photo_generating')
            : alphaPhotoStatus === 'ready'
              ? t('exosphere_premium.alpha_ready')
              : t('exosphere_premium.alpha_desc')}
          status={alphaPhotoStatus}
          disabled={!canAffordAlpha}
          onClick={onAlphaPhoto}
          helpId="planet-photo-exosphere"
        />

        <PremiumAction
          icon={<span style={{ color: '#ffe2a0', fontSize: 17 }}>◍</span>}
          label={<>{t('exosphere_premium.realistic_planet', { cost: 50 })}<QuarkMark /></>}
          detail={planetSkinStatus === 'generating'
            ? t('planet.skin_generating')
            : planetSkinStatus === 'ready'
              ? t('exosphere_premium.skin_ready')
              : t('exosphere_premium.skin_desc')}
          status={planetSkinStatus}
          disabled={!canAffordSkin}
          onClick={onPlanetSkin}
          helpId="planet-skin"
        />

        {hasGoldenImage && (
          <PremiumAction
            icon={<span style={{ color: '#ffdd88', fontSize: 17 }}>▣</span>}
            label={t('exosphere_premium.golden_image')}
            detail={t('exosphere_premium.golden_ready')}
            status="idle"
            onClick={onGoldenImage}
          />
        )}
      </div>
    </aside>
  );
}
