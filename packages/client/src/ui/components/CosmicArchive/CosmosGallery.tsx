import React, { useState, useEffect, useMemo } from 'react';
import {
  COSMIC_CATALOG,
  RARITY_COLORS,
  RARITY_LABELS,
  type CatalogEntry,
  type DiscoveryRarity,
  type Discovery,
} from '@nebulife/core';
import { getDiscoveries } from '../../../api/player-api';
import type { DiscoveryData } from '../../../api/player-api';
import { PhotoModal } from '../PhotoModal';

// ---------------------------------------------------------------------------
// CosmosGallery — Grid of all 116 cosmic catalog entries
// ---------------------------------------------------------------------------

// Category ordering for display
const CATEGORY_ORDER = [
  'nebulae',
  'stars',
  'galaxies',
  'phenomena',
  'exotic-planets',
  'dark-objects',
  'star-forming',
  'binaries',
  'small-bodies',
  'rogues',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  nebulae: 'Туманності',
  stars: 'Зорі',
  galaxies: 'Галактики',
  phenomena: 'Явища',
  'exotic-planets': 'Екзотичні планети',
  'dark-objects': 'Темні обєкти',
  'star-forming': 'Зореутворення',
  binaries: 'Подвійні системи',
  'small-bodies': 'Малі тіла',
  rogues: 'Блукачі',
};

// Rarity sort order (for within-category sorting)
const RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

interface CosmosGalleryProps {
  playerId: string;
  highlightedType?: string | null;
  /** Locally-saved entries that may not yet be on the server */
  localEntries?: Map<string, DiscoveryData>;
}

export function CosmosGallery({ playerId, highlightedType, localEntries }: CosmosGalleryProps) {
  const [discoveries, setDiscoveries] = useState<DiscoveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState<{
    discovery: Discovery;
    url: string;
  } | null>(null);

  // Inject highlight animation keyframes
  useEffect(() => {
    const styleId = 'gallery-highlight-anim';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes gallery-highlight {
          0% { transform: scale(0.8); opacity: 0.3; }
          40% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Fetch player discoveries
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDiscoveries(playerId)
      .then((data) => {
        if (!cancelled) setDiscoveries(data);
      })
      .catch(() => {
        // silent fail — show empty state
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  // Map: object_type → DiscoveryData (first/best match)
  // Merge server data with locally-saved entries (local wins if it has a photo)
  const discoveryMap = useMemo(() => {
    const map = new Map<string, DiscoveryData>();
    for (const d of discoveries) {
      // Keep the one with photo if possible
      const existing = map.get(d.object_type);
      if (!existing || (d.photo_url && !existing.photo_url)) {
        map.set(d.object_type, d);
      }
    }
    // Overlay local entries (from current session, may not be on server yet)
    if (localEntries) {
      for (const [objType, entry] of localEntries) {
        const existing = map.get(objType);
        if (!existing || (entry.photo_url && !existing.photo_url)) {
          map.set(objType, entry);
        }
      }
    }
    return map;
  }, [discoveries, localEntries]);

  // Sort catalog: by category order, then by rarity within category
  const sortedCatalog = useMemo(() => {
    return [...COSMIC_CATALOG]
      .sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category as typeof CATEGORY_ORDER[number]);
        const catB = CATEGORY_ORDER.indexOf(b.category as typeof CATEGORY_ORDER[number]);
        if (catA !== catB) return catA - catB;
        return (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0);
      });
  }, []);

  const discoveredCount = sortedCatalog.filter((e) =>
    discoveryMap.has(e.type),
  ).length;
  const totalCount = sortedCatalog.length;

  // Group by category for section headers
  const grouped = useMemo(() => {
    const groups: { category: string; label: string; entries: CatalogEntry[] }[] = [];
    let current: (typeof groups)[0] | null = null;
    for (const entry of sortedCatalog) {
      if (!current || current.category !== entry.category) {
        current = {
          category: entry.category,
          label: CATEGORY_LABELS[entry.category] ?? entry.category,
          entries: [],
        };
        groups.push(current);
      }
      current.entries.push(entry);
    }
    return groups;
  }, [sortedCatalog]);

  return (
    <div>
      {/* Counter */}
      <div
        style={{
          fontSize: 11,
          color: '#667788',
          marginBottom: 16,
          letterSpacing: 0.5,
        }}
      >
        Відкрито: {loading ? '...' : discoveredCount} / {totalCount}
      </div>

      {/* Category groups */}
      {grouped.map((group) => (
        <div key={group.category} style={{ marginBottom: 24 }}>
          {/* Category header */}
          <div
            style={{
              fontSize: 11,
              color: '#556677',
              textTransform: 'uppercase',
              letterSpacing: 2,
              marginBottom: 8,
              paddingBottom: 4,
              borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
            }}
          >
            {group.label}
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 6,
            }}
          >
            {group.entries.map((entry) => {
              const disc = discoveryMap.get(entry.type);
              return (
                <CatalogCell
                  key={entry.type}
                  entry={entry}
                  discovery={disc ?? null}
                  highlighted={entry.type === highlightedType}
                  onClick={() => {
                    if (disc?.photo_url) {
                      const discovery: Discovery = {
                        id: disc.id,
                        type: disc.object_type,
                        rarity: disc.rarity as DiscoveryRarity,
                        galleryCategory: (disc.gallery_category ?? 'cosmos') as Discovery['galleryCategory'],
                        category: entry.category as Discovery['category'],
                        systemId: disc.system_id,
                        planetId: disc.planet_id ?? undefined,
                        timestamp: new Date(disc.discovered_at).getTime(),
                        photoUrl: disc.photo_url ?? undefined,
                        scientificReport: disc.scientific_report ?? undefined,
                        promptUsed: disc.prompt_used ?? undefined,
                      };
                      setPhotoModal({
                        discovery,
                        url: disc.photo_url,
                      });
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Photo modal */}
      {photoModal && (
        <PhotoModal
          discovery={photoModal.discovery}
          imageUrl={photoModal.url}
          onClose={() => setPhotoModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CatalogCell — individual cell in the grid
// ---------------------------------------------------------------------------

function CatalogCell({
  entry,
  discovery,
  highlighted,
  onClick,
}: {
  entry: CatalogEntry;
  discovery: DiscoveryData | null;
  highlighted?: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const isDiscovered = !!discovery;
  const hasPhoto = !!(discovery?.photo_url);
  const color = RARITY_COLORS[entry.rarity];
  const rarityLabel = RARITY_LABELS[entry.rarity];

  // State 1: Undiscovered
  if (!isDiscovered) {
    return (
      <div
        style={{
          height: 100,
          background: 'rgba(20, 25, 35, 0.6)',
          borderRadius: 3,
          border: '1px solid rgba(51, 68, 85, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Rarity dot */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: `${color}44`,
          }}
        />
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `1px solid rgba(51, 68, 85, 0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#334455',
            fontSize: 10,
          }}
        >
          ?
        </div>
      </div>
    );
  }

  // State 2: Discovered without photo
  if (!hasPhoto) {
    return (
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          height: 100,
          background: hover
            ? 'rgba(25, 35, 50, 0.7)'
            : 'rgba(15, 22, 35, 0.7)',
          borderRadius: 3,
          border: `1px solid ${color}44`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 6px',
          gap: 6,
          transition: 'background 0.15s',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: `${color}88`,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {rarityLabel}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#8899aa',
            textAlign: 'center',
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {entry.nameUk}
        </div>
      </div>
    );
  }

  // State 3: Discovered with photo
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 100,
        borderRadius: 3,
        border: `1px solid ${highlighted ? '#44ff88' : hover ? color : `${color}55`}`,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.3s',
        boxShadow: highlighted ? `0 0 12px ${color}66, 0 0 24px ${color}33` : 'none',
        animation: highlighted ? 'gallery-highlight 1.5s ease-in-out' : 'none',
      }}
    >
      {/* Photo thumbnail */}
      <img
        src={discovery.photo_url!}
        alt={entry.nameUk}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Bottom name overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 6px 4px',
          background: 'linear-gradient(transparent, rgba(2, 5, 16, 0.85))',
          fontSize: 9,
          color: '#aabbcc',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {entry.nameUk}
      </div>

      {/* Rarity badge */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}88`,
        }}
      />
    </div>
  );
}
