import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Discovery, CatalogEntry } from '@nebulife/core';
import { RARITY_COLORS, RARITY_LABELS, getCatalogEntry } from '@nebulife/core';

// ---------------------------------------------------------------------------
// GalleryCompareModal — Side-by-side comparison when a gallery cell is occupied
// ---------------------------------------------------------------------------
// Shows OLD (left) vs NEW (right) with images, names, dates.
// Player chooses: replace with new or keep old.
// On mobile: vertical layout (top/bottom) since photos are vertical.
// ---------------------------------------------------------------------------

interface GalleryCompareModalProps {
  /** The new discovery being saved */
  newDiscovery: Discovery;
  newImageUrl: string;
  /** The existing discovery already in the gallery cell */
  existingImageUrl: string;
  existingDate: string;  // ISO date string
  /** Object type name from catalog */
  objectName: string;
  onReplace: () => void;
  onKeepOld: () => void;
}

export function GalleryCompareModal({
  newDiscovery,
  newImageUrl,
  existingImageUrl,
  existingDate,
  objectName,
  onReplace,
  onKeepOld,
}: GalleryCompareModalProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const color = RARITY_COLORS[newDiscovery.rarity];
  const rarityLabel = RARITY_LABELS[newDiscovery.rarity];

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const exit = (cb: () => void) => {
    setExiting(true);
    setTimeout(cb, 300);
  };

  const newDate = new Date(newDiscovery.timestamp).toLocaleDateString('uk-UA');
  const oldDate = new Date(existingDate).toLocaleDateString('uk-UA');

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9800,
          background: 'rgba(1, 3, 10, 0.7)',
          backdropFilter: 'blur(5px)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}
        onClick={() => exit(onKeepOld)}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          zIndex: 9801,
          width: 680,
          maxWidth: '95vw',
          maxHeight: '92vh',
          background: 'rgba(6, 10, 18, 0.97)',
          border: `1px solid ${color}33`,
          borderRadius: 6,
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          transform: visible && !exiting
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.94)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          boxShadow: `0 0 60px rgba(0,0,0,0.6)`,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid rgba(51, 68, 85, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: '#aabbcc', fontWeight: 'bold' }}>
            {objectName}
          </div>
          <div style={{ fontSize: 10, color: '#667788' }}>
            {t('photo.replace_question')}
          </div>
          <span
            style={{
              fontSize: 9,
              padding: '2px 8px',
              borderRadius: 3,
              background: `${color}22`,
              border: `1px solid ${color}44`,
              color,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {rarityLabel}
          </span>
        </div>

        {/* Comparison area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
          }}
        >
          {/* OLD — left side */}
          <CompareCard
            label={t('photo.current_label')}
            imageUrl={existingImageUrl}
            date={oldDate}
            borderColor="#445566"
            labelColor="#667788"
          />

          {/* Divider */}
          <div
            style={{
              width: 1,
              alignSelf: 'stretch',
              background: 'rgba(51, 68, 85, 0.3)',
              flexShrink: 0,
            }}
          />

          {/* NEW — right side */}
          <CompareCard
            label={t('photo.new_label')}
            imageUrl={newImageUrl}
            date={newDate}
            borderColor={color}
            labelColor={color}
            isNew
          />
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid rgba(51, 68, 85, 0.25)',
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
          }}
        >
          <CompareActionButton
            label={t('photo.replace_btn')}
            bgColor="rgba(15, 40, 25, 0.6)"
            borderColor="#44ff88"
            textColor="#44ff88"
            onClick={() => exit(onReplace)}
          />
          <CompareActionButton
            label={t('photo.keep_old_btn')}
            bgColor="rgba(20, 25, 35, 0.6)"
            borderColor="#556677"
            textColor="#8899aa"
            onClick={() => exit(onKeepOld)}
          />
        </div>
      </div>

      {/* Responsive: on narrow screens stack vertically */}
      <style>{`
        @media (max-width: 560px) {
          /* The comparison flex container switches to column */
        }
      `}</style>
    </>
  );
}

// ---------------------------------------------------------------------------
// CompareCard — one side of the comparison
// ---------------------------------------------------------------------------

function CompareCard({
  label,
  imageUrl,
  date,
  borderColor,
  labelColor,
  isNew,
}: {
  label: string;
  imageUrl: string;
  date: string;
  borderColor: string;
  labelColor: string;
  isNew?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 10,
          color: labelColor,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          textAlign: 'center',
        }}
      >
        {label}
        {isNew && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 8,
              padding: '1px 5px',
              borderRadius: 2,
              background: `${borderColor}22`,
              border: `1px solid ${borderColor}44`,
              verticalAlign: 'middle',
            }}
          >
            NEW
          </span>
        )}
      </div>

      {/* Image */}
      <div
        style={{
          borderRadius: 4,
          overflow: 'hidden',
          border: `1px solid ${borderColor}55`,
          position: 'relative',
          aspectRatio: '9 / 16',
          maxHeight: '50vh',
        }}
      >
        <img
          src={imageUrl}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Date */}
      <div
        style={{
          fontSize: 9,
          color: '#556677',
          textAlign: 'center',
        }}
      >
        {date}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action button sub-component
// ---------------------------------------------------------------------------

function CompareActionButton({
  label,
  bgColor,
  borderColor,
  textColor,
  onClick,
}: {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 20px',
        background: bgColor,
        border: `1px solid ${hover ? borderColor : `${borderColor}88`}`,
        color: textColor,
        fontSize: 11,
        fontFamily: 'monospace',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
