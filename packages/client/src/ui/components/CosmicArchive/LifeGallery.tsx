import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import {
  RARITY_COLORS,
  getRarityLabel,
  buildLifeformPlanetContext,
  LIFEFORM_PHOTO_COST,
  LIFEFORM_VIDEO_COST,
} from '@nebulife/core';
import type { DiscoveryRarity, StarSystem, Planet } from '@nebulife/core';
import {
  getPlayerLifeforms,
  generateLifeformPhoto,
  generateLifeformVideo,
  pollLifeformPhotoStatus,
  pollLifeformVideoStatus,
  renameLifeform,
  type LifeformRecord,
  type LifeformMediaStatus,
} from '../../../api/lifeform-api.js';
import { trackEvent } from '../../../analytics/firebase-analytics.js';
import { useVideoAudioFocus } from '../../../audio/useVideoAudioFocus.js';
import { saveMediaToGallery, isShareCancelled } from '../../../utils/media-saver.js';

const GAME_URL_WEB = 'https://nebulife.space';

// ---------------------------------------------------------------------------
// LifeGallery — Archive "Life" tab.
//
// Card anatomy (forms a square): a full 4:3 photo framed by a rarity-colored
// gradient contour, then a content block with a rarity dot + species name,
// the source planet name, and SVG action icons (photo / video / planet-link).
// A lightbox opens the full media and can jump to the source planet.
// ---------------------------------------------------------------------------

const DEFAULT_COMMON_PHOTO = '/lifeforms/common/photo.webp';
const TEXT = '#aabbcc';
const TEXT_MUTED = '#667788';

interface LifeGalleryProps {
  playerId: string;
  /** Locally-known lifeforms (App state). Merged with the server fetch so freshly
   *  found life — including the bundled first-contact — appears immediately. */
  lifeforms?: LifeformRecord[];
  /** All star systems — used to resolve the source planet name + navigation. */
  allSystems?: StarSystem[];
  /** Custom system names. */
  aliases?: Record<string, string>;
  /** Jump to the planet where a lifeform was found (closes the archive). */
  onGoToPlanet?: (system: StarSystem, planetId: string) => void;
  /** Quark balance — enables paid Alpha-photo/video generation from the card. */
  quarks?: number;
  onQuarksChange?: (q: number) => void;
  /** Persist updated lifeform (rename / generated media) into App state. */
  onLifeformUpdated?: (lf: LifeformRecord) => void;
  /** When set, auto-opens the specimen card for this lifeform id. */
  openLifeformId?: string | null;
  onOpenLifeformConsumed?: () => void;
}

interface PlanetContext {
  system: StarSystem;
  planet: Planet;
  planetId: string;
  planetName: string;
  systemName: string;
}

function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ── SVG icons ───────────────────────────────────────────────────────────────

function IconPhoto() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9.5" rx="1.5" />
      <circle cx="5.5" cy="6.8" r="1.2" />
      <path d="M3 12.5l3.5-3.5 2.4 2.4 2-2L14 12" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M6.4 6.1v3.8l3.2-1.9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPlanet() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4.2" />
      <ellipse cx="8" cy="8" rx="7" ry="2.6" transform="rotate(-25 8 8)" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.3 2.4l2.3 2.3L5.3 13H3v-2.3z" />
      <path d="M9.8 3.9l2.3 2.3" />
    </svg>
  );
}

/** Inline quark currency icon — matches the rest of the UI. */
function QuarkIconSmall({ color = '#7bb8ff' }: { color?: string }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function LifeGallery({ playerId, lifeforms, allSystems, aliases, onGoToPlanet, quarks, onQuarksChange, onLifeformUpdated, openLifeformId, onOpenLifeformConsumed }: LifeGalleryProps) {
  const { t } = useTranslation();

  const [rows, setRows] = useState<LifeformRecord[] | null>(null);
  const [selected, setSelected] = useState<{ lf: LifeformRecord; mode: 'photo' | 'video' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!playerId) { setRows([]); return; }
    getPlayerLifeforms(playerId)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [playerId]);

  // Merge server rows with locally-known lifeforms (local wins on shared id so
  // newly-generated photo/video URLs show without waiting for a refetch).
  const merged = useMemo(() => {
    const byId = new Map<string, LifeformRecord>();
    for (const r of rows ?? []) byId.set(r.id, r);
    for (const r of lifeforms ?? []) byId.set(r.id, { ...byId.get(r.id), ...r });
    return [...byId.values()];
  }, [rows, lifeforms]);

  // Sort by uniqueness (rarest first), then newest first within a tier.
  const sorted = useMemo(() => {
    const order: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return [...merged].sort((a, b) => {
      const d = (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9);
      if (d !== 0) return d;
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
  }, [merged]);

  const planetContextFor = useCallback((lf: LifeformRecord): PlanetContext | null => {
    if (!lf.planet_id || !allSystems) return null;
    const system = allSystems.find((s) => s.planets.some((p) => p.id === lf.planet_id));
    if (!system) return null;
    const planet = system.planets.find((p) => p.id === lf.planet_id);
    if (!planet) return null;
    return {
      system,
      planet,
      planetId: lf.planet_id,
      planetName: planet.name,
      systemName: aliases?.[system.id] || system.star.name,
    };
  }, [allSystems, aliases]);

  // Deep-link: auto-open the specimen card requested from outside (e.g. the
  // "view specimen" button on a system chat notification).
  useEffect(() => {
    if (!openLifeformId) return;
    const lf = merged.find((r) => r.id === openLifeformId);
    if (lf) {
      setSelected({ lf, mode: 'photo' });
      onOpenLifeformConsumed?.();
    }
  }, [openLifeformId, merged, onOpenLifeformConsumed]);

  const thumbFor = useCallback((lf: LifeformRecord): string => {
    if (lf.photo_url) return lf.photo_url;
    if (lf.is_bundle || lf.rarity === 'common') return DEFAULT_COMMON_PHOTO;
    return '';
  }, []);

  if (rows === null && (lifeforms === undefined || lifeforms.length === 0)) {
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
          const hasPhoto = !!thumb;
          const hasVideo = !!lf.video_url;
          const planetCtx = planetContextFor(lf);
          return (
            <div key={lf.id} style={styles.card}>
              {/* Photo — full 4:3, framed by a rarity-colored gradient contour.
                  Always opens the specimen card — even without a photo the card
                  offers rename + deferred Alpha-photo/video generation. */}
              <button
                onClick={() => setSelected({ lf, mode: 'photo' })}
                style={{
                  ...styles.photoFrame,
                  background: `linear-gradient(135deg, ${color} 0%, ${hexA(color, 0.2)} 50%, ${color} 100%)`,
                  boxShadow: `0 0 14px ${hexA(color, 0.3)}, 0 2px 8px rgba(0,0,0,0.45)`,
                  cursor: 'pointer',
                }}
              >
                <div style={styles.photoInner}>
                  {hasPhoto ? (
                    <img src={thumb} alt="" style={styles.photoImg} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ ...styles.photoGlyph, color }}>✶</div>
                  )}
                </div>
              </button>

              {/* Name — rarity dot + species name. */}
              <div style={styles.nameRow}>
                <span style={{ ...styles.dot, background: color, boxShadow: `0 0 6px ${color}` }} />
                <span style={styles.name}>{lf.species_name || t('lifeform.default_species')}</span>
              </div>

              {/* Planet name + action icons. */}
              <div style={styles.iconRow}>
                {hasPhoto && (
                  <button style={{ ...styles.iconBtn, color }} title={t('lifeform.icon_photo', { defaultValue: 'Photo' })} onClick={() => setSelected({ lf, mode: 'photo' })}>
                    <IconPhoto />
                  </button>
                )}
                {hasVideo && (
                  <button style={{ ...styles.iconBtn, color }} title={t('lifeform.icon_video', { defaultValue: 'Video' })} onClick={() => setSelected({ lf, mode: 'video' })}>
                    <IconVideo />
                  </button>
                )}
                {planetCtx && (
                  <button
                    style={{ ...styles.planetBtn, color }}
                    title={planetCtx.planetName}
                    onClick={() => onGoToPlanet?.(planetCtx.system, planetCtx.planetId)}
                  >
                    <IconPlanet />
                    <span style={styles.planetName}>{planetCtx.planetName}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <LifeLightbox
          playerId={playerId}
          lifeform={selected.lf}
          mode={selected.mode}
          planetContext={planetContextFor(selected.lf)}
          onGoToPlanet={onGoToPlanet}
          quarks={quarks}
          onQuarksChange={onQuarksChange}
          onUpdated={onLifeformUpdated}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Video loading overlay ────────────────────────────────────────────────────

const LF_LOADER_STYLE_ID = 'lf-video-loader-style';
if (typeof document !== 'undefined' && !document.getElementById(LF_LOADER_STYLE_ID)) {
  const el = document.createElement('style');
  el.id = LF_LOADER_STYLE_ID;
  el.textContent = `@keyframes lf-vid-spin { to { transform: rotate(360deg); } }
@keyframes lf-vid-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }`;
  document.head.appendChild(el);
}

/** Spinner shown over a buffering video — keeps the poster visible underneath
 *  instead of the native gray placeholder flash. */
function VideoLoader({ color, label, poster }: { color: string; label: string; poster?: string }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: poster
          ? `linear-gradient(rgba(2,5,12,0.55), rgba(2,5,12,0.7))`
          : '#050a14',
      }}
    >
      <span
        style={{
          width: 34, height: 34, borderRadius: '50%',
          border: `2px solid ${hexA(color, 0.25)}`, borderTopColor: color,
          animation: 'lf-vid-spin 0.8s linear infinite',
        }}
      />
      <span style={{ color, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, animation: 'lf-vid-pulse 1.4s ease-in-out infinite' }}>
        {label}
      </span>
    </div>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────

const GEN_BUSY_STATES: ReadonlySet<string> = new Set(['generating', 'pending', 'processing']);

function LifeLightbox({ playerId, lifeform: initial, mode, planetContext, onGoToPlanet, quarks, onQuarksChange, onUpdated, onClose }: {
  playerId: string;
  lifeform: LifeformRecord;
  mode: 'photo' | 'video';
  planetContext: PlanetContext | null;
  onGoToPlanet?: (system: StarSystem, planetId: string) => void;
  quarks?: number;
  onQuarksChange?: (q: number) => void;
  onUpdated?: (lf: LifeformRecord) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  // Live record — updated in place by rename / deferred generation.
  const [lifeform, setLifeform] = useState<LifeformRecord>(initial);
  const color = RARITY_COLORS[lifeform.rarity as DiscoveryRarity] ?? '#8899aa';
  const photo = lifeform.photo_url || (lifeform.is_bundle || lifeform.rarity === 'common' ? DEFAULT_COMMON_PHOTO : '');
  const showVideo = mode === 'video' && !!lifeform.video_url;
  const [videoLoading, setVideoLoading] = useState(showVideo);
  const { enterVideoFocus, exitVideoFocus } = useVideoAudioFocus();

  const applyUpdate = useCallback((updater: (prev: LifeformRecord) => LifeformRecord) => {
    setLifeform((prev) => {
      const next = updater(prev);
      onUpdated?.(next);
      return next;
    });
  }, [onUpdated]);

  // ── Rename (deferred naming from the card) ─────────────────────────────
  const isLocal = lifeform.id.startsWith('local');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const saveName = useCallback(() => {
    const finalName = nameDraft.trim().slice(0, 40);
    setEditingName(false);
    if (!finalName || finalName === lifeform.species_name) return;
    applyUpdate((prev) => ({ ...prev, species_name: finalName }));
    if (!isLocal) void renameLifeform(playerId, lifeform.id, finalName).catch(() => {});
  }, [nameDraft, lifeform.species_name, lifeform.id, isLocal, playerId, applyUpdate]);

  // ── Deferred Alpha-photo / Alpha-video generation ──────────────────────
  const rarity = lifeform.rarity as DiscoveryRarity;
  const isCommon = lifeform.rarity === 'common' || lifeform.is_bundle;
  const photoCost = LIFEFORM_PHOTO_COST[rarity] ?? 0;
  const videoCost = LIFEFORM_VIDEO_COST[rarity] ?? 0;
  const canGenerate = !isCommon && !isLocal && !!onUpdated && !!onQuarksChange && quarks !== undefined;
  const [genBusy, setGenBusy] = useState<'photo' | 'video' | null>(() => {
    if (!initial.photo_url && GEN_BUSY_STATES.has(initial.photo_status ?? '')) return 'photo';
    if (initial.photo_url && !initial.video_url && GEN_BUSY_STATES.has(initial.video_status ?? '')) return 'video';
    return null;
  });
  const [genError, setGenError] = useState<string | null>(null);
  const stopPoll = useRef<(() => void) | null>(null);
  useEffect(() => () => { stopPoll.current?.(); }, []);

  const handlePhotoPoll = useCallback((s: { status: LifeformMediaStatus; photoUrl?: string | null }) => {
    if (s.status === 'succeed' && s.photoUrl) {
      setGenBusy(null);
      applyUpdate((prev) => ({ ...prev, photo_url: s.photoUrl!, photo_status: 'succeed' }));
    } else if (s.status === 'failed') {
      setGenBusy(null);
      setGenError(t('lifeform.err_failed'));
    }
  }, [applyUpdate, t]);

  const handleVideoPoll = useCallback((s: { status: LifeformMediaStatus; videoUrl?: string | null }) => {
    if (s.status === 'succeed' && s.videoUrl) {
      setGenBusy(null);
      applyUpdate((prev) => ({ ...prev, video_url: s.videoUrl!, video_status: 'succeed' }));
    } else if (s.status === 'failed') {
      setGenBusy(null);
      setGenError(t('lifeform.err_failed'));
    }
  }, [applyUpdate, t]);

  // Resume polling for a generation left running in a previous session.
  useEffect(() => {
    if (genBusy === 'photo') stopPoll.current = pollLifeformPhotoStatus(lifeform.id, handlePhotoPoll);
    else if (genBusy === 'video') stopPoll.current = pollLifeformVideoStatus(lifeform.id, handleVideoPoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGen = useCallback(async (kind: 'photo' | 'video') => {
    if (!canGenerate || genBusy) return;
    const cost = kind === 'photo' ? photoCost : videoCost;
    if ((quarks ?? 0) < cost) {
      setGenError(t('lifeform.err_quarks'));
      return;
    }
    setGenError(null);
    setGenBusy(kind);
    void trackEvent(kind === 'photo' ? 'lifeform_alpha_photo' : 'lifeform_alpha_video', { rarity, cost, source: 'archive_card' });
    try {
      if (kind === 'photo') {
        const ctx = planetContext ? buildLifeformPlanetContext(planetContext.planet) : null;
        const resp = await generateLifeformPhoto(playerId, lifeform.id, {
          planetHint: ctx?.hint,
          planetMedium: ctx?.medium,
        });
        if (resp.quarksRemaining !== null && resp.quarksRemaining !== undefined) onQuarksChange?.(resp.quarksRemaining);
        stopPoll.current = pollLifeformPhotoStatus(lifeform.id, handlePhotoPoll);
      } else {
        const resp = await generateLifeformVideo(playerId, lifeform.id);
        if (resp.quarksRemaining !== null && resp.quarksRemaining !== undefined) onQuarksChange?.(resp.quarksRemaining);
        stopPoll.current = pollLifeformVideoStatus(lifeform.id, handleVideoPoll);
      }
    } catch (err) {
      setGenBusy(null);
      setGenError(err instanceof Error ? err.message : t('lifeform.err_failed'));
    }
  }, [canGenerate, genBusy, photoCost, videoCost, quarks, rarity, planetContext, playerId, lifeform.id, onQuarksChange, handlePhotoPoll, handleVideoPoll, t]);

  // Share / save the currently-shown media (photo in photo mode, clip in video mode).
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const shareName = lifeform.species_name || t('lifeform.default_species');
  const rarityLabel = getRarityLabel(lifeform.rarity as DiscoveryRarity, i18n.language) ?? lifeform.rarity;
  const actionMediaUrl = showVideo ? (lifeform.video_url || '') : photo;

  const handleShare = useCallback(async () => {
    if (!actionMediaUrl || busy) return;
    setBusy(true);
    try {
      await shareLifeformMedia(actionMediaUrl, showVideo, shareName, rarityLabel);
      setShared(true);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.warn('[LifeGallery] share failed:', err);
    } finally {
      setBusy(false);
    }
  }, [actionMediaUrl, showVideo, shareName, rarityLabel, busy]);

  const handleDownload = useCallback(async () => {
    if (!actionMediaUrl || busy) return;
    setBusy(true);
    try {
      await downloadLifeformMedia(actionMediaUrl, showVideo, shareName);
      setSaved(true);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.warn('[LifeGallery] save failed:', err);
    } finally {
      setBusy(false);
    }
  }, [actionMediaUrl, showVideo, shareName, busy]);

  return (
    <div style={styles.lbBackdrop} onClick={onClose}>
      <div
        style={{
          ...styles.lbWindow,
          background: `linear-gradient(135deg, ${color} 0%, ${hexA(color, 0.18)} 50%, ${color} 100%)`,
          boxShadow: `0 0 40px ${hexA(color, 0.28)}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.lbInner}>
          <button onClick={onClose} style={styles.lbClose} aria-label={t('common.close', { defaultValue: 'Close' })}>✕</button>

          <div style={styles.lbMedia}>
            {showVideo ? (
              <>
                <video
                  src={lifeform.video_url!}
                  controls
                  autoPlay
                  playsInline
                  poster={photo || undefined}
                  onLoadedData={() => setVideoLoading(false)}
                  onCanPlay={() => setVideoLoading(false)}
                  onError={() => { setVideoLoading(false); exitVideoFocus(); }}
                  onPlay={enterVideoFocus}
                  onPause={exitVideoFocus}
                  onEnded={exitVideoFocus}
                  style={styles.lbMediaEl}
                />
                {videoLoading && <VideoLoader color={color} label={t('lifeform.video_loading', { defaultValue: 'Loading...' })} poster={photo} />}
              </>
            ) : photo ? (
              <img src={photo} alt="" style={styles.lbMediaEl} />
            ) : (
              <div style={{ ...styles.photoGlyph, color, fontSize: 48 }}>✶</div>
            )}
          </div>

          <div style={styles.lbNameRow}>
            <span style={{ ...styles.dot, background: color, boxShadow: `0 0 6px ${color}` }} />
            {editingName ? (
              <>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  placeholder={lifeform.species_name || t('lifeform.default_species')}
                  maxLength={40}
                  autoFocus
                  style={styles.lbNameInput}
                />
                <button onClick={saveName} style={{ ...styles.lbNameSaveBtn, color, borderColor: hexA(color, 0.5) }}>
                  {t('lifeform.rename_save')}
                </button>
              </>
            ) : (
              <>
                <span style={styles.lbName}>{lifeform.species_name || t('lifeform.default_species')}</span>
                {onUpdated && !isLocal && (
                  <button
                    onClick={() => { setNameDraft(lifeform.species_name ?? ''); setEditingName(true); }}
                    title={t('lifeform.rename')}
                    aria-label={t('lifeform.rename')}
                    style={styles.lbEditBtn}
                  >
                    <IconEdit />
                  </button>
                )}
              </>
            )}
          </div>

          {planetContext && (
            <button
              style={{ ...styles.lbPlanetBtn, color, borderColor: hexA(color, 0.4) }}
              onClick={() => onGoToPlanet?.(planetContext.system, planetContext.planetId)}
            >
              <IconPlanet />
              <span>{planetContext.planetName} · {planetContext.systemName}</span>
            </button>
          )}

          <div style={styles.lbMeta}>
            <span style={{ color: TEXT_MUTED }}>{t('lifeform.source_label')}</span>
            <span style={{ color: TEXT }}>{t(lifeform.source === 'created' ? 'lifeform.source_created' : 'lifeform.source_found')}</span>
          </div>

          {/* Deferred deep bio-scan — start Alpha-photo / Alpha-video later from the card. */}
          {canGenerate && (!lifeform.photo_url || !lifeform.video_url) && (
            <div style={styles.lbGenBlock}>
              {genError && <div style={styles.lbGenError}>{genError}</div>}
              <button
                onClick={() => void startGen(lifeform.photo_url ? 'video' : 'photo')}
                disabled={!!genBusy}
                style={{
                  ...styles.lbGenBtn,
                  color,
                  borderColor: hexA(color, 0.55),
                  background: `linear-gradient(135deg, ${hexA(color, 0.18)} 0%, ${hexA(color, 0.05)} 100%)`,
                  opacity: genBusy ? 0.6 : 1,
                  cursor: genBusy ? 'default' : 'pointer',
                }}
              >
                <span style={styles.lbGenKicker}>✦ {t('lifeform.premium')}</span>
                <span style={styles.lbGenMain}>
                  <span style={{ color: TEXT, fontWeight: 700 }}>
                    {genBusy ? t('lifeform.generating') : t(lifeform.photo_url ? 'lifeform.alpha_video' : 'lifeform.alpha_photo')}
                  </span>
                  {!genBusy && (
                    <span style={{ ...styles.lbGenCost, color, borderColor: hexA(color, 0.45), background: hexA(color, 0.1) }}>
                      {lifeform.photo_url ? videoCost : photoCost} <QuarkIconSmall color={color} />
                    </span>
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Share / save the currently-shown media (photo or clip). */}
          {actionMediaUrl && (
            <div style={styles.lbActions}>
              <button
                onClick={handleShare}
                disabled={busy}
                style={{
                  ...styles.lbActionBtn,
                  color: shared ? '#44ff88' : color,
                  borderColor: hexA(shared ? '#44ff88' : color, 0.5),
                }}
              >
                <IconShare />
                <span>{shared ? t('photo.copied', { defaultValue: 'Shared' }) : t('photo.share', { defaultValue: 'Share' })}</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={busy}
                style={{
                  ...styles.lbActionBtn,
                  color: saved ? '#44ff88' : TEXT,
                  borderColor: hexA(saved ? '#44ff88' : '#556677', 0.6),
                }}
              >
                <IconDownload />
                <span>{saved ? t('photo.saved', { defaultValue: 'Saved' }) : t('photo.download', { defaultValue: 'Save' })}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share / save helpers ─────────────────────────────────────────────────────

function IconShare() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="3" r="2" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="12" cy="13" r="2" />
      <line x1="5.8" y1="7" x2="10.2" y2="4" />
      <line x1="5.8" y1="9" x2="10.2" y2="12" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v9" />
      <path d="M4.5 8L8 11.5 11.5 8" />
      <path d="M2 13h12" />
    </svg>
  );
}

function safeSeg(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'lifeform';
}

/** Extension from a URL path, falling back to a sensible default per media kind. */
function extFromUrl(url: string, isVideo: boolean): string {
  const m = /\.([a-z0-9]{2,4})(?:\?|#|$)/i.exec(url);
  if (m) return m[1].toLowerCase();
  return isVideo ? 'mp4' : 'webp';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function buildLifeShareText(name: string, rarityLabel: string, isVideo: boolean): string {
  const glyph = isVideo ? '\u{1F3AC}' : '\u{1F9EC}'; // clapper / DNA
  return [`${glyph} ${name}`, `\u{2728} ${rarityLabel}`, '', GAME_URL_WEB].join('\n');
}

/** Share the lifeform's current media (photo or video) with a local file for rich previews. */
async function shareLifeformMedia(mediaUrl: string, isVideo: boolean, name: string, rarityLabel: string): Promise<void> {
  const ext = extFromUrl(mediaUrl, isVideo);
  const filename = `nebulife-${safeSeg(name)}.${ext}`;
  const title = `${isVideo ? '\u{1F3AC}' : '\u{1F9EC}'} ${name} | Nebulife`;
  const text = buildLifeShareText(name, rarityLabel, isVideo);

  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    let localFileUri: string | undefined;
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const res = await fetch(mediaUrl);
      const base64 = await blobToBase64(await res.blob());
      const writeRes = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
      localFileUri = writeRes.uri;
    } catch (err) {
      console.warn('[LifeGallery] share: failed to stage media, sharing link only:', err);
    }
    await Share.share({
      title, text,
      url: localFileUri ?? GAME_URL_WEB,
      ...(localFileUri ? { files: [localFileUri] } : {}),
      dialogTitle: title,
    });
    return;
  }

  // Web — prefer Web Share with a real file, then plain share, then clipboard.
  let file: File | null = null;
  try {
    const blob = await (await fetch(mediaUrl)).blob();
    file = new File([blob], filename, { type: blob.type || (isVideo ? 'video/mp4' : 'image/webp') });
  } catch { /* CORS / network — fall through */ }

  if (navigator.share && file && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, url: GAME_URL_WEB, files: [file] });
  } else if (navigator.share) {
    await navigator.share({ title, text, url: GAME_URL_WEB });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

/** Save the lifeform's current media to the device. */
async function downloadLifeformMedia(mediaUrl: string, isVideo: boolean, name: string): Promise<void> {
  const ext = extFromUrl(mediaUrl, isVideo);
  const filename = `nebulife-${safeSeg(name)}.${ext}`;

  if (Capacitor.isNativePlatform()) {
    // Save straight into the device gallery — no share sheets, no browser.
    try {
      await saveMediaToGallery(mediaUrl, isVideo);
      return;
    } catch (err) {
      console.warn('[LifeGallery] gallery save failed, falling back to share sheet:', err);
    }
    // Single fallback: one share sheet (user can pick "Save"). A user cancel
    // is not an error — never escalate to window.open on native.
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: filename, url: mediaUrl, dialogTitle: filename });
    } catch (err) {
      if (!isShareCancelled(err)) throw err;
      throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
    }
    return;
  }

  try {
    const blob = await (await fetch(mediaUrl)).blob();
    const file = new File([blob], filename, { type: blob.type || (isVideo ? 'video/mp4' : 'image/webp') });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: filename, files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch { window.open(mediaUrl, '_blank'); }
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrap: { padding: '8px 4px' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12,
  },
  card: {
    display: 'flex', flexDirection: 'column', gap: 7,
    fontFamily: 'monospace',
  },
  photoFrame: {
    padding: 2, borderRadius: 8, border: 'none', width: '100%',
    display: 'block', lineHeight: 0,
  },
  photoInner: {
    width: '100%', aspectRatio: '4 / 3', background: '#050a14', borderRadius: 6,
    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  photoGlyph: { fontSize: 32, opacity: 0.5 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, padding: '0 1px' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  name: { color: TEXT, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  iconRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '0 1px', flexWrap: 'wrap' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
    background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(51,68,85,0.6)', borderRadius: 5,
    cursor: 'pointer', padding: 0, flexShrink: 0,
  },
  planetBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, flex: 1, height: 26,
    background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(51,68,85,0.6)', borderRadius: 5,
    cursor: 'pointer', padding: '0 8px', fontFamily: 'monospace',
  },
  planetName: { fontSize: 11, color: TEXT_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
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
    position: 'relative', width: 'min(94vw, 460px)', padding: 2, borderRadius: 10,
  },
  lbInner: {
    position: 'relative', background: 'rgba(10,15,25,0.97)', borderRadius: 8,
    padding: '14px', fontFamily: 'monospace',
  },
  lbClose: {
    position: 'absolute', top: 8, right: 10, zIndex: 2, background: 'rgba(2,5,12,0.6)', border: 'none',
    color: TEXT_MUTED, fontSize: 15, cursor: 'pointer', width: 24, height: 24, borderRadius: 5,
  },
  lbMedia: {
    width: '100%', aspectRatio: '4 / 3', background: '#000', borderRadius: 6, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  lbMediaEl: { width: '100%', height: '100%', objectFit: 'cover' },
  lbNameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  lbName: { color: TEXT, fontSize: 15, fontWeight: 700 },
  lbEditBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, flexShrink: 0, padding: 0,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(85,102,119,0.6)', borderRadius: 5,
    color: TEXT_MUTED, cursor: 'pointer',
  },
  lbNameInput: {
    flex: 1, minWidth: 0, boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.4)', border: '1px solid #446688', borderRadius: 4,
    color: TEXT, fontFamily: 'monospace', fontSize: 13, padding: '6px 9px', outline: 'none',
  },
  lbNameSaveBtn: {
    flexShrink: 0, background: 'rgba(10,15,25,0.7)', border: '1px solid', borderRadius: 4,
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '6px 11px', cursor: 'pointer',
  },
  lbGenBlock: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 },
  lbGenError: { color: '#ff8844', fontSize: 11, textAlign: 'center' },
  lbGenBtn: {
    display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'stretch',
    border: '1px solid', borderRadius: 8, padding: '10px 12px',
    fontFamily: 'monospace', textAlign: 'left',
  },
  lbGenKicker: { fontSize: 9, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' },
  lbGenMain: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13 },
  lbGenCost: { fontSize: 12, fontWeight: 700, border: '1px solid', borderRadius: 999, padding: '2px 10px', whiteSpace: 'nowrap' },
  lbPlanetBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7, width: '100%', boxSizing: 'border-box',
    background: 'rgba(10,15,25,0.7)', border: '1px solid', borderRadius: 5,
    cursor: 'pointer', padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, marginBottom: 8,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  lbMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid rgba(50,60,80,0.4)' },
  lbActions: { display: 'flex', gap: 8, marginTop: 12 },
  lbActionBtn: {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 38, background: 'rgba(10,15,25,0.7)', border: '1px solid', borderRadius: 6,
    cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
  },
};
