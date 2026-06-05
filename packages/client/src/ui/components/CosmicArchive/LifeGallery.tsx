import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RARITY_COLORS, getRarityLabel } from '@nebulife/core';
import type { DiscoveryRarity } from '@nebulife/core';
import { getPlayerLifeforms, type LifeformRecord } from '../../../api/lifeform-api.js';

// ---------------------------------------------------------------------------
// LifeGallery — Archive "Life" tab: discovered/created lifeforms, framed by
// rarity, with photo thumbnails and a lightbox (photo + video when present).
// ---------------------------------------------------------------------------

const DEFAULT_COMMON_PHOTO = '/lifeforms/common/photo.webp';
const TEXT = '#aabbcc';
const TEXT_MUTED = '#667788';

interface LifeGalleryProps {
  playerId: string;
}

function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function LifeGallery({ playerId }: LifeGalleryProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'uk';

  const [rows, setRows] = useState<LifeformRecord[] | null>(null);
  const [selected, setSelected] = useState<LifeformRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!playerId) { setRows([]); return; }
    getPlayerLifeforms(playerId)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [playerId]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const order: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return [...rows].sort((a, b) => (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9));
  }, [rows]);

  const thumbFor = useCallback((lf: LifeformRecord): string => {
    if (lf.photo_url) return lf.photo_url;
    if (lf.is_bundle || lf.rarity === 'common') return DEFAULT_COMMON_PHOTO;
    return '';
  }, []);

  if (rows === null) {
    return <div style={styles.empty}>{t('common.loading', { defaultValue: '...' })}</div>;
  }

  if (sorted.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyGlyph}>✶</div>
        <div>{t('lifeform.archive_empty')}</div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.grid}>
        {sorted.map((lf) => {
          const color = RARITY_COLORS[lf.rarity as DiscoveryRarity] ?? '#8899aa';
          const thumb = thumbFor(lf);
          return (
            <button
              key={lf.id}
              onClick={() => setSelected(lf)}
              style={{ ...styles.card, borderColor: color, boxShadow: `0 0 14px ${hexA(color, 0.18)}` }}
            >
              <div style={styles.thumb}>
                {thumb ? (
                  <img src={thumb} alt="" style={styles.thumbImg} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ ...styles.thumbGlyph, color }}>✶</div>
                )}
                {lf.video_url && <span style={{ ...styles.videoBadge, color }}>▶</span>}
              </div>
              <div style={styles.cardName}>{lf.species_name || t('lifeform.default_species')}</div>
              <div style={{ ...styles.cardRarity, color }}>{getRarityLabel(lf.rarity as DiscoveryRarity, lang)}</div>
            </button>
          );
        })}
      </div>

      {selected && (
        <LifeLightbox lifeform={selected} lang={lang} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function LifeLightbox({ lifeform, lang, onClose }: { lifeform: LifeformRecord; lang: string; onClose: () => void }) {
  const { t } = useTranslation();
  const color = RARITY_COLORS[lifeform.rarity as DiscoveryRarity] ?? '#8899aa';
  const photo = lifeform.photo_url || (lifeform.is_bundle || lifeform.rarity === 'common' ? DEFAULT_COMMON_PHOTO : '');
  return (
    <div style={styles.lbBackdrop} onClick={onClose}>
      <div style={{ ...styles.lbWindow, borderColor: color, boxShadow: `0 0 40px ${hexA(color, 0.25)}` }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.lbClose}>✕</button>
        <div style={{ ...styles.lbRarity, color, borderColor: color }}>{getRarityLabel(lifeform.rarity as DiscoveryRarity, lang)}</div>
        <div style={styles.lbMedia}>
          {lifeform.video_url ? (
            <video src={lifeform.video_url} controls playsInline poster={photo || undefined} style={styles.lbMediaEl} />
          ) : photo ? (
            <img src={photo} alt="" style={styles.lbMediaEl} />
          ) : (
            <div style={{ ...styles.thumbGlyph, color, fontSize: 48 }}>✶</div>
          )}
        </div>
        <div style={styles.lbName}>{lifeform.species_name || t('lifeform.default_species')}</div>
        <div style={styles.lbMeta}>
          <span style={{ color: TEXT_MUTED }}>{t('lifeform.tax_status')}</span>
          <span style={{ color }}>{getRarityLabel(lifeform.rarity as DiscoveryRarity, lang)}</span>
        </div>
        <div style={styles.lbMeta}>
          <span style={{ color: TEXT_MUTED }}>{t('lifeform.source_label')}</span>
          <span style={{ color: TEXT }}>{t(lifeform.source === 'created' ? 'lifeform.source_created' : 'lifeform.source_found')}</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: '8px 4px' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12,
  },
  card: {
    display: 'flex', flexDirection: 'column', gap: 6, padding: 8,
    background: 'rgba(10,15,25,0.6)', border: '1px solid', borderRadius: 6,
    cursor: 'pointer', fontFamily: 'monospace', textAlign: 'left',
  },
  thumb: {
    position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#050a14',
    borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbGlyph: { fontSize: 30, opacity: 0.5 },
  videoBadge: { position: 'absolute', right: 6, bottom: 6, fontSize: 12 },
  cardName: { color: TEXT, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardRarity: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    color: TEXT_MUTED, fontFamily: 'monospace', fontSize: 13, padding: '48px 16px', textAlign: 'center',
  },
  emptyGlyph: { fontSize: 38, opacity: 0.4 },
  lbBackdrop: {
    position: 'fixed', inset: 0, zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(2,5,16,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: 16,
  },
  lbWindow: {
    position: 'relative', width: 'min(94vw, 460px)', background: 'rgba(10,15,25,0.97)',
    border: '1px solid', borderRadius: 8, padding: '26px 18px 18px', fontFamily: 'monospace',
  },
  lbClose: {
    position: 'absolute', top: 8, right: 10, background: 'transparent', border: 'none',
    color: TEXT_MUTED, fontSize: 16, cursor: 'pointer',
  },
  lbRarity: {
    position: 'absolute', top: 8, left: 10, fontSize: 10, letterSpacing: 2, fontWeight: 700,
    border: '1px solid', borderRadius: 3, padding: '2px 8px', textTransform: 'uppercase',
  },
  lbMedia: {
    width: '100%', aspectRatio: '4 / 3', background: '#000', borderRadius: 4, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  lbMediaEl: { width: '100%', height: '100%', objectFit: 'cover' },
  lbName: { color: TEXT, fontSize: 15, fontWeight: 700, marginBottom: 8 },
  lbMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(50,60,80,0.4)' },
};
