import React, { useCallback, useState } from 'react';
import type { Discovery, CatalogEntry, DiscoveryRarity } from '@nebulife/core';
import { RARITY_COLORS, getCatalogEntry } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PhotoModal — fullscreen photo view with share & save buttons
// ---------------------------------------------------------------------------

const RARITY_LABELS: Record<DiscoveryRarity, string> = {
  common: 'Звичайне',
  uncommon: 'Незвичайне',
  rare: 'Рідкісне',
  epic: 'Епічне',
  legendary: 'Легендарне',
};

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
      // Try to fetch the image as a file for native share
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `nebulife-${discovery.type}.png`, { type: blob.type });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Nebulife: ${name}`,
          text: `Я відкрив ${name} у грі Nebulife! ${catalog?.descriptionUk?.slice(0, 100) ?? ''}`,
          files: [file],
        });
        setShared(true);
      } else if (navigator.share) {
        // Fallback: share without file
        await navigator.share({
          title: `Nebulife: ${name}`,
          text: `Я відкрив ${name} у грі Nebulife!`,
          url: window.location.href,
        });
        setShared(true);
      } else {
        // Fallback: download
        downloadImage(blob, `nebulife-${discovery.type}.png`);
      }
    } catch (err) {
      // User cancelled share or error — ignore
      if ((err as Error).name !== 'AbortError') {
        console.warn('Share failed:', err);
      }
    }
  }, [imageUrl, discovery.type, name, catalog]);

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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            gap: 12,
            marginTop: 16,
            fontFamily: 'monospace',
          }}
        >
          {onSaveToGallery && (
            <button
              onClick={handleSave}
              disabled={saved}
              style={{
                padding: '10px 20px',
                background: saved ? 'rgba(40, 80, 50, 0.4)' : 'rgba(20, 60, 40, 0.6)',
                border: `1px solid ${saved ? '#44ff8866' : '#44ff88'}`,
                color: saved ? '#44ff8888' : '#44ff88',
                fontSize: 12,
                borderRadius: 4,
                cursor: saved ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saved ? 'Збережено \u2713' : 'Зберегти в галерею'}
            </button>
          )}
          <button
            onClick={handleShare}
            style={{
              padding: '10px 20px',
              background: shared ? 'rgba(40, 60, 80, 0.4)' : 'rgba(20, 40, 60, 0.6)',
              border: `1px solid ${shared ? '#4488aa66' : '#4488aa'}`,
              color: shared ? '#4488aa88' : '#4488aa',
              fontSize: 12,
              fontFamily: 'monospace',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {shared ? 'Надіслано \u2713' : 'Поділитися'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(30, 35, 45, 0.6)',
              border: '1px solid #445566',
              color: '#8899aa',
              fontSize: 12,
              fontFamily: 'monospace',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
}

/** Fallback download helper */
function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
