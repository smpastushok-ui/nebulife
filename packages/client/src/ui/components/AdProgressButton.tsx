import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { RewardType } from '../../services/ads-service.js';
import {
  watchAdsWithProgress,
  getAdProgress,
  checkAdAvailability,
} from '../../services/ads-service.js';

// ---------------------------------------------------------------------------
// AdProgressButton — Rewarded-ad button with persistent progress blocks
// ---------------------------------------------------------------------------
// Shows [■] [■] [ ] progress blocks — one per required ad.
// Supports 'choice' variant (full DiscoveryChoicePanel style)
// and 'menu' variant (compact for context menus).
//
// Security: the photoToken returned by onComplete is HMAC-signed by the server
// after verifying all ad session tokens. The client cannot forge it.
// ---------------------------------------------------------------------------

interface AdProgressButtonProps {
  label: string;
  progressLabel: string;           // e.g. "Енергія: {done}/{total}"
  requiredAds: number;             // 3 or 5
  adRewardType: RewardType;
  onComplete: (photoToken: string) => void;
  disabled?: boolean;
  variant?: 'choice' | 'menu';
  icon?: React.ReactNode;
  borderColor?: string;
  hoverBorderColor?: string;
}

export function AdProgressButton({
  label,
  progressLabel,
  requiredAds,
  adRewardType,
  onComplete,
  disabled = false,
  variant = 'choice',
  icon,
  borderColor = '#336655',
  hoverBorderColor = '#448866',
}: AdProgressButtonProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const [adProgress, setAdProgress] = useState<number>(() => getAdProgress(adRewardType));
  const [adWatching, setAdWatching] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noFill, setNoFill] = useState(false);

  // Check ad availability on mount
  useEffect(() => {
    let cancelled = false;
    checkAdAvailability().then((available) => {
      if (!cancelled) setNoFill(!available);
    });
    return () => { cancelled = true; };
  }, []);

  const handleClick = useCallback(async () => {
    if (adWatching || disabled || noFill) return;
    setError(null);
    setAdWatching(true);

    const result = await watchAdsWithProgress(
      adRewardType,
      requiredAds,
      (completed) => {
        setAdProgress(completed);
      },
    );

    setAdWatching(false);

    if (result.rewarded) {
      setRewarded(true);
      onComplete(result.photoToken ?? '');
    } else if (result.reason === 'no_fill') {
      setNoFill(true);
    } else if (result.reason === 'error') {
      setError(t('ads.interrupted'));
    }
    // 'dismissed' — keep current progress, no error shown
  }, [adWatching, disabled, noFill, adRewardType, requiredAds, onComplete, t]);

  // Format progress label
  const progressText = progressLabel
    .replace('{done}', String(adProgress))
    .replace('{total}', String(requiredAds));

  const isDisabled = disabled || adWatching || noFill;
  const activeBorder = hover && !isDisabled ? hoverBorderColor : borderColor;

  if (variant === 'menu') {
    return (
      <div>
        <button
          onClick={handleClick}
          disabled={isDisabled}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: hover && !isDisabled
              ? 'rgba(34, 80, 60, 0.4)'
              : 'rgba(10, 28, 20, 0.5)',
            border: `1px solid ${activeBorder}`,
            borderRadius: 3,
            cursor: isDisabled ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
            fontFamily: 'monospace',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all 0.2s',
            color: '#66bb99',
          }}
        >
          {icon && (
            <div style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 3 }}>
              {rewarded ? t('ads.reward_received') : adWatching ? t('ads.watching', { current: adProgress + 1, total: requiredAds }) : label}
            </div>
            <ProgressBlocks done={rewarded ? requiredAds : adProgress} total={requiredAds} size="small" />
            <div style={{ fontSize: 9, color: '#44887766', marginTop: 2 }}>
              {progressText}
            </div>
          </div>
        </button>
        {noFill && (
          <div style={{ fontSize: 9, color: '#556677', textAlign: 'center', marginTop: 3 }}>
            {t('ads.no_fill')}
          </div>
        )}
        {error && (
          <div style={{ fontSize: 9, color: '#885555', textAlign: 'center', marginTop: 3 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // 'choice' variant — matches DiscoveryChoicePanel style
  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: hover && !isDisabled
            ? 'rgba(20, 60, 40, 0.5)'
            : 'rgba(8, 20, 14, 0.6)',
          border: `1px solid ${activeBorder}`,
          borderRadius: 4,
          cursor: isDisabled ? 'default' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          fontFamily: 'monospace',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'all 0.2s',
          color: '#66bb99',
          position: 'relative',
        }}
      >
        {icon && (
          <div style={{ flexShrink: 0, opacity: 0.7, color: '#66bb99' }}>{icon}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
            {rewarded ? t('ads.reward_received') : adWatching ? t('ads.watching', { current: adProgress + 1, total: requiredAds }) : label}
          </div>
          <ProgressBlocks done={rewarded ? requiredAds : adProgress} total={requiredAds} size="normal" />
          <div style={{ fontSize: 10, color: '#44887788', marginTop: 4, lineHeight: 1.4 }}>
            {progressText}
          </div>
        </div>
      </button>
      {noFill && (
        <div style={{ fontSize: 10, color: '#556677', textAlign: 'center', marginTop: 4 }}>
          {t('ads.no_fill')}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 10, color: '#885555', textAlign: 'center', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress blocks sub-component — [■] [■] [ ]
// ---------------------------------------------------------------------------

function ProgressBlocks({
  done,
  total,
  size,
}: {
  done: number;
  total: number;
  size: 'small' | 'normal';
}) {
  const blockSize = size === 'small' ? 10 : 12;
  const gap = size === 'small' ? 3 : 4;

  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < done;
        return (
          <div
            key={i}
            style={{
              width: blockSize,
              height: blockSize,
              border: `1px solid ${filled ? '#44ff88' : '#334455'}`,
              background: filled ? 'rgba(68, 255, 136, 0.2)' : 'transparent',
              borderRadius: 1,
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}
