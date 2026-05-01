import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { StarSystem } from '@nebulife/core';
import type { SystemPhotoData } from '../SystemContextMenu';

// ---------------------------------------------------------------------------
// TelescopeGallery — Grid of telescope photos (system panoramas or planets)
// ---------------------------------------------------------------------------

interface TelescopeGalleryProps {
  photos?: Map<string, SystemPhotoData>;
  type: 'system' | 'planet' | 'biosphere' | 'aerial';
  allSystems: StarSystem[];
  aliases: Record<string, string>;
}

interface PhotoEntry {
  key: string;
  data: SystemPhotoData;
  name: string;
  sublabel: string;
  date: string;
}

function getPlanetIdFromPhotoKey(key: string): string | null {
  if (key.startsWith('planet-exosphere-')) return key.slice('planet-exosphere-'.length);
  if (key.startsWith('planet-biosphere-')) return key.slice('planet-biosphere-'.length);
  if (key.startsWith('planet-aerial-')) return key.slice('planet-aerial-'.length);
  if (key.startsWith('planet-')) return key.slice('planet-'.length); // legacy planet photo key
  return null;
}

/** Resolve metadata for a photo key */
function resolvePhotoMeta(
  key: string,
  allSystems: StarSystem[],
  aliases: Record<string, string>,
  tFn: (key: string, opts?: Record<string, unknown>) => string,
): { name: string; sublabel: string } {
  const planetId = getPlanetIdFromPhotoKey(key);
  if (planetId) {
    for (const sys of allSystems) {
      const planet = sys.planets.find(p => p.id === planetId);
      if (planet) {
        const sysName = aliases[sys.id] || sys.star.name;
        return {
          name: planet.name,
          sublabel: sysName,
        };
      }
    }
    return { name: planetId, sublabel: '' };
  } else {
    const sys = allSystems.find(s => s.id === key);
    if (sys) {
      return {
        name: aliases[sys.id] || sys.star.name,
        sublabel: tFn('gallery.planets_count', { count: sys.planets.length }),
      };
    }
    return { name: key, sublabel: '' };
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return '';
  }
}

export function TelescopeGallery({ photos, type, allSystems, aliases }: TelescopeGalleryProps) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [viewingPhoto, setViewingPhoto] = useState<PhotoEntry | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Filter and build entries
  const entries = useMemo(() => {
    if (!photos) return [];
    const result: PhotoEntry[] = [];
    for (const [key, data] of photos) {
      // Filter by type
      const isPhotoPlanet = key.startsWith('planet-');
      const isExosphere = key.startsWith('planet-exosphere-') || (key.startsWith('planet-') && !key.startsWith('planet-biosphere-') && !key.startsWith('planet-aerial-'));
      const isBiosphere = key.startsWith('planet-biosphere-');
      const isAerial = key.startsWith('planet-aerial-');

      if (type === 'system' && isPhotoPlanet) continue;
      if (type === 'planet' && !isExosphere) continue;
      if (type === 'biosphere' && !isBiosphere) continue;
      if (type === 'aerial' && !isAerial) continue;
      // Only show completed photos
      if (data.status !== 'succeed' || !data.photoUrl) continue;

      const meta = resolvePhotoMeta(key, allSystems, aliases, t);
      result.push({
        key,
        data,
        name: meta.name,
        sublabel: meta.sublabel,
        date: formatDate(data.createdAt),
      });
    }
    return result;
  }, [photos, type, allSystems, aliases]);

  // Close viewer on Escape
  useEffect(() => {
    if (!viewingPhoto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingPhoto(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewingPhoto]);

  // Share handler
  const handleShare = useCallback(async (entry: PhotoEntry) => {
    const text = `Nebulife Telescope: ${entry.name}\nhttps://nebulife.space`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Nebulife', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // User cancelled
    }
  }, []);

  const typeLabel = type === 'system'
    ? t('archive.sub_star_systems')
    : type === 'planet'
      ? t('archive.sub_planets_photos')
      : type === 'biosphere'
        ? t('archive.sub_surface')
        : t('archive.sub_aerial_photos');

  if (entries.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        color: '#445566',
        fontSize: 11,
        fontFamily: 'monospace',
        padding: '60px 20px',
        lineHeight: 1.8,
      }}>
        <div style={{ fontSize: 13, color: '#556677', marginBottom: 8 }}>
          {typeLabel}
        </div>
        {t('gallery.no_photos_yet')}
        <br />
        {t('gallery.use_supertelescope')}
      </div>
    );
  }

  return (
    <div>
      {/* Counter */}
      <div style={{
        fontSize: 11, color: '#667788', marginBottom: 16, letterSpacing: 0.5,
      }}>
        {t('gallery.photos_count', { label: typeLabel, count: entries.length })}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: isMobile ? 4 : 8,
      }}>
        {entries.map((entry) => (
          <PhotoCard
            key={entry.key}
            entry={entry}
            isMobile={isMobile}
            onClick={() => setViewingPhoto(entry)}
          />
        ))}
      </div>

      {/* Full-screen viewer with parallax */}
      {viewingPhoto && (
        <PhotoViewer
          entry={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          onShare={() => handleShare(viewingPhoto)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhotoCard — single thumbnail in the grid
// ---------------------------------------------------------------------------

function PhotoCard({ entry, isMobile, onClick }: {
  entry: PhotoEntry;
  isMobile: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: 4,
        border: hover ? '1px solid #4488aa' : '1px solid #223344',
        background: '#0a0f1a',
        cursor: 'pointer',
        padding: 0,
        transition: 'border-color 0.15s',
      }}
    >
      <img
        src={entry.data.photoUrl}
        alt={entry.name}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {/* Gradient overlay with metadata */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: isMobile ? '16px 6px 4px' : '24px 8px 6px',
        background: 'linear-gradient(transparent 0%, rgba(2,5,16,0.85) 100%)',
        fontFamily: 'monospace',
        textAlign: 'left',
      }}>
        <div style={{
          fontSize: isMobile ? 9 : 11,
          color: '#ccddee',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {entry.name}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: isMobile ? 7 : 8,
          color: '#556677',
          marginTop: 2,
        }}>
          <span>{entry.sublabel}</span>
          <span>{entry.date}</span>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// PhotoViewer — fullscreen view with parallax mouse tracking
// ---------------------------------------------------------------------------

function PhotoViewer({ entry, onClose, onShare }: {
  entry: PhotoEntry;
  onClose: () => void;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const dx = (e.clientX - window.innerWidth / 2) * 0.015;
    const dy = (e.clientY - window.innerHeight / 2) * 0.015;
    imgRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(1.03)`;
  }, []);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      onClick={handleBackdrop}
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9650,
        background: 'rgba(2, 5, 16, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
      }}
    >
      {/* Photo */}
      <img
        ref={imgRef}
        src={entry.data.photoUrl}
        alt={entry.name}
        style={{
          maxWidth: '90vw',
          maxHeight: '70vh',
          objectFit: 'contain',
          borderRadius: 4,
          boxShadow: '0 4px 32px rgba(0,0,0,0.8)',
          transition: 'transform 0.08s ease-out',
          transform: 'scale(1.03)',
        }}
      />

      {/* Label */}
      <div style={{
        marginTop: 14,
        textAlign: 'center',
        fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: 13, color: '#ccddee' }}>{entry.name}</div>
        <div style={{ fontSize: 10, color: '#556677', marginTop: 4 }}>
          {entry.sublabel} {entry.date && `/ ${entry.date}`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          style={{
            background: 'none',
            border: '1px solid #4488aa',
            borderRadius: 3,
            color: '#4488aa',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '8px 20px',
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          {t('gallery.share')}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: 'none',
            border: '1px solid #334455',
            borderRadius: 3,
            color: '#667788',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
