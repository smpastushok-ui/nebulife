import React, { useCallback, useState } from 'react';
import type { Discovery, CatalogEntry } from '@nebulife/core';
import { RARITY_COLORS, RARITY_LABELS, getCatalogEntry } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PhotoModal — fullscreen photo view with share & save buttons
// ---------------------------------------------------------------------------

/** Game links — update when custom domain or app stores are ready */
const GAME_URL_WEB = 'https://nebulife.vercel.app';
// const GAME_URL_APP_IOS = 'https://apps.apple.com/app/nebulife/id...';
// const GAME_URL_APP_ANDROID = 'https://play.google.com/store/apps/details?id=...';

/** Rarity emojis for share messages */
const RARITY_EMOJI: Record<string, string> = {
  common: '\u{1F30C}',       // milky way
  uncommon: '\u{2728}',      // sparkles
  rare: '\u{1F52D}',         // telescope
  epic: '\u{1F525}',         // fire
  legendary: '\u{1F31F}',    // glowing star
};

/** Category emojis for share messages */
const CATEGORY_EMOJI: Record<string, string> = {
  cosmos: '\u{1F30C}',       // milky way
  flora: '\u{1F33F}',        // herb
  fauna: '\u{1F9AC}',        // bison (alien creature)
  anomalies: '\u{26A0}\u{FE0F}', // warning
  landscapes: '\u{1F3D4}\u{FE0F}', // mountain
};

/**
 * Build share URL with dynamic OG tags.
 * Telegram/messengers will fetch this URL and see the discovery photo as og:image.
 */
function buildShareUrl(discoveryId: string): string {
  return `${GAME_URL_WEB}/share/${discoveryId}`;
}

/**
 * Build a beautiful share text that grabs attention.
 * Includes a share URL with dynamic OG tags so messengers show the discovery photo.
 */
function buildShareText(
  name: string,
  rarityKey: string,
  galleryCategory: string,
  discoveryId: string,
  systemName?: string,
  description?: string,
): string {
  const emoji = RARITY_EMOJI[rarityKey] ?? '\u{2B50}';
  const catEmoji = CATEGORY_EMOJI[galleryCategory] ?? '\u{1F30D}';
  const rarityLabel = RARITY_LABELS[rarityKey as keyof typeof RARITY_LABELS] ?? rarityKey;

  const lines: string[] = [];

  // Hook line
  lines.push(`${emoji} ${name}`);
  lines.push(`${catEmoji} ${rarityLabel}`);

  // Short description
  if (description) {
    const shortDesc = description.length > 120 ? description.slice(0, 117) + '...' : description;
    lines.push('');
    lines.push(shortDesc);
  }

  // System context
  if (systemName) {
    lines.push('');
    lines.push(`\u{1F4CD} ${systemName}`);
  }

  // Share link (with dynamic OG tags — Telegram will show discovery photo)
  lines.push('');
  lines.push(buildShareUrl(discoveryId));

  return lines.join('\n');
}

/**
 * Build a shorter share title for platforms that separate title/text.
 */
function buildShareTitle(name: string, rarityKey: string): string {
  const emoji = RARITY_EMOJI[rarityKey] ?? '\u{2B50}';
  return `${emoji} ${name} | Nebulife`;
}

export function PhotoModal({
  discovery,
  imageUrl,
  systemName,
  onSaveToGallery,
  onClose,
}: {
  discovery: Discovery;
  imageUrl: string;
  systemName?: string;
  onSaveToGallery?: () => void;
  onClose: () => void;
}) {
  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const name = catalog?.nameUk ?? discovery.type;
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const shareTitle = buildShareTitle(name, discovery.rarity);
      const shareUrl = buildShareUrl(discovery.id);
      const shareText = buildShareText(
        name, discovery.rarity, discovery.galleryCategory, discovery.id,
        systemName, catalog?.descriptionUk,
      );

      // Try to fetch the image as a file for native share
      let file: File | null = null;
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        file = new File([blob], `nebulife-${discovery.type}.png`, { type: blob.type });
      } catch {
        // Image fetch failed — continue without file
      }

      if (navigator.share && file && navigator.canShare?.({ files: [file] })) {
        // Best case: share with image file + rich text + URL
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
          files: [file],
        });
        setShared(true);
      } else if (navigator.share) {
        // Fallback: share URL (Telegram will fetch OG tags and show photo)
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShared(true);
      } else {
        // Desktop fallback: copy share text to clipboard
        await navigator.clipboard.writeText(shareText);
        setShared(true);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Last resort: try clipboard
        try {
          const clipText = buildShareText(
            name, discovery.rarity, discovery.galleryCategory, discovery.id,
            systemName, catalog?.descriptionUk,
          );
          await navigator.clipboard.writeText(clipText);
          setShared(true);
        } catch {
          console.warn('Share failed:', err);
        }
      }
    }
  }, [imageUrl, discovery, name, catalog, systemName]);

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      downloadImageFile(blob, `nebulife-${discovery.type}.png`);
    } catch {
      // Direct link fallback
      window.open(imageUrl, '_blank');
    }
  }, [imageUrl, discovery.type]);

  const handleSave = useCallback(() => {
    onSaveToGallery?.();
    setSaved(true);
  }, [onSaveToGallery]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div
          style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            border: `2px solid ${color}66`,
            boxShadow: `0 0 40px ${color}33`,
          }}
        >
          <img
            src={imageUrl}
            alt={name}
            style={{
              maxWidth: '85vw',
              maxHeight: '60vh',
              display: 'block',
              objectFit: 'contain',
            }}
          />

          {/* Overlay info at bottom of image */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.85) 100%)',
              padding: '40px 16px 12px',
              fontFamily: 'monospace',
            }}
          >
            <div style={{ fontSize: 16, color: '#eeffff', fontWeight: 'bold', marginBottom: 4 }}>
              {name}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: `${color}33`,
                  border: `1px solid ${color}55`,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {RARITY_LABELS[discovery.rarity]}
              </span>
              {systemName && (
                <span style={{ fontSize: 11, color: '#667788' }}>
                  {systemName}
                </span>
              )}
              <span style={{ fontSize: 10, color: '#445566' }}>
                {new Date(discovery.timestamp).toLocaleDateString('uk-UA')}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 16,
            fontFamily: 'monospace',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {onSaveToGallery && (
            <ActionButton
              onClick={handleSave}
              disabled={saved}
              bgColor={saved ? 'rgba(40, 80, 50, 0.4)' : 'rgba(20, 60, 40, 0.6)'}
              borderColor={saved ? '#44ff8866' : '#44ff88'}
              textColor={saved ? '#44ff8888' : '#44ff88'}
              label={saved ? 'Збережено' : 'В архів'}
            />
          )}
          <ActionButton
            onClick={handleShare}
            bgColor={shared ? 'rgba(40, 60, 80, 0.4)' : 'rgba(20, 40, 60, 0.6)'}
            borderColor={shared ? '#4488aa66' : '#4488aa'}
            textColor={shared ? '#4488aa88' : '#4488aa'}
            label={shared ? 'Скопійовано' : 'Поділитися'}
          />
          <ActionButton
            onClick={handleDownload}
            bgColor="rgba(30, 35, 50, 0.6)"
            borderColor="#556677"
            textColor="#8899aa"
            label="Завантажити"
          />
          <ActionButton
            onClick={onClose}
            bgColor="rgba(30, 35, 45, 0.6)"
            borderColor="#445566"
            textColor="#778899"
            label="Закрити"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActionButton({
  onClick,
  disabled,
  bgColor,
  borderColor,
  textColor,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 16px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        fontSize: 11,
        fontFamily: 'monospace',
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

/** Fallback download helper */
function downloadImageFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
