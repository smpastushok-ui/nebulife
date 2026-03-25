import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Discovery, CatalogEntry, DiscoveryRarity } from '@nebulife/core';
import { RARITY_COLORS, getCatalogEntry } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Toast notification that appears when a cosmic discovery is made
// ---------------------------------------------------------------------------

const RARITY_KEYS: Record<DiscoveryRarity, string> = {
  common:    'discovery_notification.rarity_common',
  uncommon:  'discovery_notification.rarity_uncommon',
  rare:      'discovery_notification.rarity_rare',
  epic:      'discovery_notification.rarity_epic',
  legendary: 'discovery_notification.rarity_legendary',
};

const CATEGORY_KEYS: Record<string, string> = {
  cosmos:     'discovery_notification.category_cosmos',
  flora:      'discovery_notification.category_flora',
  fauna:      'discovery_notification.category_fauna',
  anomalies:  'discovery_notification.category_anomalies',
  landscapes: 'discovery_notification.category_landscapes',
};

const AUTO_HIDE_MS = 12_000;

export function DiscoveryNotification({
  discovery,
  onInvestigate,
  onDismiss,
}: {
  discovery: Discovery;
  onInvestigate: () => void;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const { t } = useTranslation();
  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const rarityLabel = t(RARITY_KEYS[discovery.rarity]);
  const categoryLabel = CATEGORY_KEYS[discovery.galleryCategory]
    ? t(CATEGORY_KEYS[discovery.galleryCategory])
    : discovery.galleryCategory;
  const name = catalog?.nameUk ?? discovery.type;

  // Entrance animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 400);
    }, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleInvestigate = () => {
    setExiting(true);
    setTimeout(onInvestigate, 200);
  };

  const handleClose = () => {
    setExiting(true);
    setTimeout(onDismiss, 400);
  };

  const isEpicOrAbove = discovery.rarity === 'epic' || discovery.rarity === 'legendary';

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        width: 320,
        zIndex: 200,
        pointerEvents: 'auto',
        transform: visible && !exiting ? 'translateX(0)' : 'translateX(360px)',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
      }}
    >
      {/* Glow effect for epic+ */}
      {isEpicOrAbove && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 10,
            background: `radial-gradient(ellipse at center, ${color}33 0%, transparent 70%)`,
            animation: 'pulse 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          background: 'rgba(8, 12, 20, 0.95)',
          border: `1px solid ${color}`,
          borderRadius: 8,
          padding: 16,
          fontFamily: 'monospace',
          position: 'relative',
          boxShadow: `0 0 20px ${color}44, inset 0 0 30px ${color}11`,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'none',
            border: 'none',
            color: '#556677',
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'monospace',
            padding: '2px 6px',
          }}
        >
          &times;
        </button>

        {/* Header */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: '#556677',
            marginBottom: 8,
          }}
        >
          {t('discovery_notification.new_discovery')}
        </div>

        {/* Object name */}
        <div
          style={{
            fontSize: 16,
            color: '#ddeeff',
            fontWeight: 'bold',
            marginBottom: 6,
            paddingRight: 20,
          }}
        >
          {name}
        </div>

        {/* Rarity + Category badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 3,
              background: `${color}22`,
              border: `1px solid ${color}66`,
              color,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {rarityLabel}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 3,
              background: 'rgba(40, 60, 80, 0.4)',
              border: '1px solid rgba(60, 80, 100, 0.4)',
              color: '#8899aa',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Description excerpt */}
        {catalog?.descriptionUk && (
          <div
            style={{
              fontSize: 11,
              color: '#778899',
              lineHeight: 1.5,
              marginBottom: 14,
              maxHeight: 40,
              overflow: 'hidden',
            }}
          >
            {catalog.descriptionUk}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleInvestigate}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
            border: `1px solid ${color}88`,
            borderRadius: 4,
            color,
            fontFamily: 'monospace',
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${color}33 0%, ${color}22 100%)`;
            e.currentTarget.style.boxShadow = `0 0 12px ${color}44`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {t('discovery_notification.investigate_btn')} &rarr;
        </button>
      </div>

      {/* Keyframe animation for pulse glow */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
