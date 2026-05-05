import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import type { Discovery, CatalogEntry } from '@nebulife/core';
import { RARITY_COLORS, getRarityLabel, getCatalogEntry, getCatalogName, getCatalogDescription } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PhotoModal — fullscreen photo view with share & save buttons
// ---------------------------------------------------------------------------

/** Game links — update when custom domain or app stores are ready */
const GAME_URL_WEB = 'https://nebulife.space';
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
function buildShareUrl(discovery: Discovery, imageUrl?: string): string {
  const params = new URLSearchParams();
  if (imageUrl) params.set('image', imageUrl);
  params.set('type', discovery.type);
  params.set('rarity', discovery.rarity);
  const query = params.toString();
  return `${GAME_URL_WEB}/share/${encodeURIComponent(discovery.id)}${query ? `?${query}` : ''}`;
}

/**
 * Build a beautiful share text that grabs attention.
 * Includes a share URL with dynamic OG tags so messengers show the discovery photo.
 */
function buildShareText(
  name: string,
  rarityKey: string,
  galleryCategory: string,
  shareUrl: string,
  lang: string,
  systemName?: string,
  description?: string,
): string {
  const emoji = RARITY_EMOJI[rarityKey] ?? '\u{2B50}';
  const catEmoji = CATEGORY_EMOJI[galleryCategory] ?? '\u{1F30D}';
  const rarityLabel = getRarityLabel(rarityKey as import('@nebulife/core').DiscoveryRarity, lang) ?? rarityKey;

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
  lines.push(shareUrl);

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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const catalog = getCatalogEntry(discovery.type) as CatalogEntry | undefined;
  const color = RARITY_COLORS[discovery.rarity];
  const name = catalog ? getCatalogName(catalog, lang) : discovery.type;
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const shareTitle = buildShareTitle(name, discovery.rarity);
      const shareUrl = buildShareUrl(discovery, imageUrl);
      const description = catalog ? getCatalogDescription(catalog, lang) : undefined;
      const shareText = buildShareText(
        name, discovery.rarity, discovery.galleryCategory, shareUrl,
        lang, systemName, description,
      );

      // Native (Android / iOS) — use Capacitor Share plugin.
      // To get the IMAGE PREVIEW in Telegram / Instagram / WhatsApp the image
      // must be attached as a local file. Sharing just `url` results in a
      // plain link without thumbnail. We download the image into the app
      // cache, then pass its local content:// URI as `files[0]`.
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        let localFileUri: string | undefined;
        try {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          const tmpName = `share-${discovery.id.slice(0, 8)}.png`;
          const writeRes = await Filesystem.writeFile({
            path: tmpName,
            data: base64,
            directory: Directory.Cache,
          });
          localFileUri = writeRes.uri;
        } catch (err) {
          console.warn('[PhotoModal] share: failed to stage image for preview, falling back to URL only:', err);
        }
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: localFileUri ?? shareUrl,
          ...(localFileUri ? { files: [localFileUri] } : {}),
          dialogTitle: shareTitle,
        });
        setShared(true);
        return;
      }

      // Web: try to fetch the image as a file for richer native share.
      let file: File | null = null;
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        file = new File([blob], `nebulife-${discovery.type}.png`, { type: blob.type });
      } catch {
        // CORS or network — fall through
      }

      if (navigator.share && file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl, files: [file] });
        setShared(true);
      } else if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setShared(true);
      } else {
        await navigator.clipboard.writeText(shareText);
        setShared(true);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        try {
          const clipDescription = catalog ? getCatalogDescription(catalog, lang) : undefined;
          const clipShareUrl = buildShareUrl(discovery, imageUrl);
          const clipText = buildShareText(
            name, discovery.rarity, discovery.galleryCategory, clipShareUrl,
            lang, systemName, clipDescription,
          );
          await navigator.clipboard.writeText(clipText);
          setShared(true);
        } catch {
          console.warn('[PhotoModal] share failed:', err);
        }
      }
    }
  }, [imageUrl, discovery, name, catalog, systemName, lang]);

  const handleDownload = useCallback(async () => {
    const filename = `nebulife-${safeFilenameSegment(discovery.type)}-${discovery.id.slice(0, 8)}.png`;

    // Native (Android / iOS) — save via Capacitor Filesystem to Documents
    // and open the native share sheet with the local file attached. On iOS,
    // writing to Documents alone is easy to miss; the sheet gives the user a
    // visible "Save Image" / "Save to Files" action from the same tap.
    // Directory.ExternalStorage hit Android 10+ scoped-storage restrictions
    // (silent failures, no file actually persisted). Documents works on both
    // platforms without extra permissions and is visible in the Files app.
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const blob = await fetchImageBlob(imageUrl);
        const base64 = await blobToBase64(blob);
        const writeRes = await Filesystem.writeFile({
          path: `Nebulife/${filename}`,
          data: base64,
          directory: Directory.Documents,
          recursive: true,
        });
        console.info('[PhotoModal] saved to', writeRes.uri);
        setDownloaded(true);
        await Share.share({
          title: filename,
          text: filename,
          files: [writeRes.uri],
          dialogTitle: filename,
        });
      } catch (err) {
        console.warn('[PhotoModal] native download failed:', err);
        // Fallback: share sheet (lets user save via Photos / Files app).
        try {
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: filename,
            url: imageUrl,
            dialogTitle: filename,
          });
        } catch {
          window.open(imageUrl, '_blank');
        }
      }
      return;
    }

    // Web — on mobile Safari/Chrome, Web Share with a File is more reliable
    // than an invisible <a download>. Desktop browsers keep the classic save.
    try {
      const blob = await fetchImageBlob(imageUrl);
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: filename, files: [file] });
      } else {
        downloadImageFile(blob, filename);
      }
      setDownloaded(true);
    } catch {
      window.open(imageUrl, '_blank');
    }
  }, [imageUrl, discovery.type, discovery.id]);

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
                {getRarityLabel(discovery.rarity, lang)}
              </span>
              {systemName && (
                <span style={{ fontSize: 11, color: '#667788' }}>
                  {systemName}
                </span>
              )}
              <span style={{ fontSize: 10, color: '#445566' }}>
                {new Date(discovery.timestamp).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA')}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons — single row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 16,
            fontFamily: 'monospace',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {onSaveToGallery && (
            <div data-tutorial-id="save-to-gallery-btn">
              <ActionButton
                onClick={handleSave}
                disabled={saved}
                bgColor={saved ? 'rgba(40, 80, 50, 0.4)' : 'rgba(20, 60, 40, 0.6)'}
                borderColor={saved ? '#44ff8866' : '#44ff88'}
                textColor={saved ? '#44ff8888' : '#44ff88'}
                label={saved ? t('photo.saved') : t('photo.save_to_collection')}
              />
            </div>
          )}
          <IconButton
            onClick={handleShare}
            title={shared ? t('photo.copied') : t('photo.share')}
            bgColor={shared ? 'rgba(40, 60, 80, 0.4)' : 'rgba(20, 40, 60, 0.6)'}
            borderColor={shared ? '#4488aa66' : '#4488aa'}
            iconColor={shared ? '#4488aa88' : '#4488aa'}
          >
            {/* Share icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="3" r="2" />
              <circle cx="4" cy="8" r="2" />
              <circle cx="12" cy="13" r="2" />
              <line x1="5.8" y1="7" x2="10.2" y2="4" />
              <line x1="5.8" y1="9" x2="10.2" y2="12" />
            </svg>
          </IconButton>
          <IconButton
            onClick={handleDownload}
            title={downloaded ? t('photo.saved') : t('photo.download')}
            bgColor={downloaded ? 'rgba(40, 80, 50, 0.35)' : 'rgba(30, 35, 50, 0.6)'}
            borderColor={downloaded ? '#44ff8866' : '#556677'}
            iconColor={downloaded ? '#44ff88' : '#8899aa'}
          >
            {/* Download icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v9" />
              <path d="M4.5 8L8 11.5 11.5 8" />
              <path d="M2 13h12" />
            </svg>
          </IconButton>
          <IconButton
            onClick={onClose}
            title={t('photo.close')}
            bgColor="rgba(30, 35, 45, 0.6)"
            borderColor="#445566"
            iconColor="#778899"
          >
            {/* Close icon */}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </IconButton>
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

function IconButton({
  onClick,
  title,
  bgColor,
  borderColor,
  iconColor,
  children,
}: {
  onClick: () => void;
  title: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: iconColor,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.2s',
        padding: 0,
      }}
    >
      {children}
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

function safeFilenameSegment(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'photo';
}

async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  return res.blob();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
