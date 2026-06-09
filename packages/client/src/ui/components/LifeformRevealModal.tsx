// ---------------------------------------------------------------------------
// LifeformRevealModal — generalized lifeform discovery presentation
// ---------------------------------------------------------------------------
// A centred, themed popup (NOT full-screen). Frame / glow / badge colour come
// from the lifeform rarity (RARITY_COLORS). Two paths:
//
//   • common (is_bundle): bundled photo + optional bundled video, free,
//     beats: alert → scan-reveal → (video) → classify (name) → reward/archive.
//   • uncommon+: paid unique media,
//     beats: alert → classify (name) → media (Alpha-photo → Alpha-video,
//     each costs quarks) → reward/archive.
//
// Generation + polling are owned by this modal via lifeform-api so App stays
// thin. Missing assets degrade to a styled placeholder for testing.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RARITY_COLORS, getRarityLabel, LIFEFORM_PHOTO_COST, LIFEFORM_VIDEO_COST } from '@nebulife/core';
import type { DiscoveryRarity } from '@nebulife/core';
import {
  generateLifeformPhoto,
  generateLifeformVideo,
  pollLifeformPhotoStatus,
  pollLifeformVideoStatus,
  renameLifeform,
  type LifeformRecord,
  type LifeformMediaStatus,
} from '../../api/lifeform-api.js';
import { trackEvent } from '../../analytics/firebase-analytics.js';
import { useVideoAudioFocus } from '../../audio/useVideoAudioFocus.js';

const PANEL_BG = 'rgba(10,15,25,0.96)';
const BORDER = '#334455';
const TEXT = '#aabbcc';
const TEXT_MUTED = '#667788';

type Beat = 'alert' | 'scan' | 'video' | 'classify' | 'media' | 'reward';

const DEFAULT_COMMON_PHOTO = '/lifeforms/common/photo.webp';

export interface LifeformRevealModalProps {
  playerId: string;
  lifeform: LifeformRecord;
  quarks: number;
  onQuarksChange: (q: number) => void;
  /** Persist the (possibly updated) lifeform record into App state / Archive. */
  onUpdated: (lf: LifeformRecord) => void;
  onClose: () => void;
  /** Optional bundled assets (e.g. the special first-contact common). */
  bundlePhotoSrc?: string;
  bundleVideoSrc?: string;
  /** Show the A.S.T.R.A. onboarding (first lifeform ever found). */
  showOnboarding?: boolean;
}

export function LifeformRevealModal({
  playerId,
  lifeform: initial,
  quarks,
  onQuarksChange,
  onUpdated,
  onClose,
  bundlePhotoSrc,
  bundleVideoSrc,
  showOnboarding,
}: LifeformRevealModalProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'uk';

  const [record, setRecord] = useState<LifeformRecord>(initial);
  const rarity = record.rarity as DiscoveryRarity;
  const accent = RARITY_COLORS[rarity] ?? '#44ff88';
  const isCommon = record.rarity === 'common' || record.is_bundle;
  const photoCost = LIFEFORM_PHOTO_COST[rarity] ?? 0;
  const videoCost = LIFEFORM_VIDEO_COST[rarity] ?? 0;

  const [beat, setBeat] = useState<Beat>('alert');
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoNeedsTap, setVideoNeedsTap] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [scanDone, setScanDone] = useState(false);
  const [name, setName] = useState('');
  const [photoGenStatus, setPhotoGenStatus] = useState<LifeformMediaStatus | 'idle'>(
    (record.photo_status as LifeformMediaStatus) ?? 'idle',
  );
  const [videoGenStatus, setVideoGenStatus] = useState<LifeformMediaStatus | 'idle'>(
    (record.video_status as LifeformMediaStatus) ?? 'idle',
  );
  const [genError, setGenError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stopPhotoPoll = useRef<(() => void) | null>(null);
  const stopVideoPoll = useRef<(() => void) | null>(null);
  const { enterVideoFocus, exitVideoFocus } = useVideoAudioFocus();

  const commonPhotoSrc = bundlePhotoSrc ?? DEFAULT_COMMON_PHOTO;
  const photoSrc = record.photo_url || commonPhotoSrc;
  const videoSrc = record.video_url || bundleVideoSrc || '';

  const alertLines = [
    t('lifeform.alert_line_1'),
    t('lifeform.alert_line_2'),
    t('lifeform.alert_line_3'),
  ];

  // Cleanup pollers on unmount.
  useEffect(() => () => {
    stopPhotoPoll.current?.();
    stopVideoPoll.current?.();
  }, []);

  // ── Beat 1: typed alert lines ───────────────────────────────────────────
  useEffect(() => {
    if (beat !== 'alert') return;
    let lineIdx = 0;
    let charIdx = 0;
    let cancelled = false;
    const out: string[] = [''];
    setTypedLines(['']);

    const tick = () => {
      if (cancelled) return;
      const full = alertLines[lineIdx] ?? '';
      if (charIdx < full.length) {
        out[lineIdx] = full.slice(0, charIdx + 1);
        setTypedLines([...out]);
        charIdx++;
        window.setTimeout(tick, 28);
      } else if (lineIdx < alertLines.length - 1) {
        lineIdx++;
        charIdx = 0;
        out.push('');
        setTypedLines([...out]);
        window.setTimeout(tick, 360);
      } else {
        window.setTimeout(() => {
          if (!cancelled) setBeat(isCommon ? 'scan' : 'classify');
        }, 1000);
      }
    };
    const startId = window.setTimeout(tick, 450);
    return () => { cancelled = true; window.clearTimeout(startId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // ── Beat 2 (common): scan reveal completion ─────────────────────────────
  useEffect(() => {
    if (beat !== 'scan') return;
    setScanDone(false);
    const doneId = window.setTimeout(() => setScanDone(true), 3500);
    return () => { window.clearTimeout(doneId); };
  }, [beat]);

  // ── Common video autoplay ───────────────────────────────────────────────
  useEffect(() => {
    if (beat !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    setVideoNeedsTap(false);
    setVideoLoading(!v.readyState || v.readyState < 3);
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => setVideoNeedsTap(true));
  }, [beat]);

  const handleManualPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setVideoNeedsTap(false)).catch(() => setVideoNeedsTap(true));
  }, []);

  const handleConfirmName = useCallback(() => {
    const fallback = record.species_name || t('lifeform.default_species');
    const finalName = (name.trim() || fallback).slice(0, 40);
    const updated = { ...record, species_name: finalName };
    setRecord(updated);
    onUpdated(updated);
    if (!record.is_bundle) {
      void renameLifeform(playerId, record.id, finalName).catch(() => {});
    }
    setBeat(isCommon ? 'reward' : 'media');
  }, [name, record, onUpdated, playerId, isCommon, t]);

  // ── Paid Alpha-photo generation ─────────────────────────────────────────
  const startPhotoGen = useCallback(async () => {
    if (quarks < photoCost) {
      setGenError(t('lifeform.err_quarks'));
      return;
    }
    setGenError(null);
    setPhotoGenStatus('generating');
    void trackEvent('lifeform_alpha_photo', { rarity, cost: photoCost });
    try {
      const resp = await generateLifeformPhoto(playerId, record.id);
      if (resp.quarksRemaining !== null && resp.quarksRemaining !== undefined) {
        onQuarksChange(resp.quarksRemaining);
      }
      stopPhotoPoll.current = pollLifeformPhotoStatus(record.id, (s) => {
        setPhotoGenStatus(s.status);
        if (s.status === 'succeed' && s.photoUrl) {
          const updated = { ...record, photo_url: s.photoUrl, photo_status: 'succeed' as const };
          setRecord(updated);
          onUpdated(updated);
        } else if (s.status === 'failed') {
          setGenError(t('lifeform.err_failed'));
        }
      });
    } catch (err) {
      setPhotoGenStatus('failed');
      setGenError(err instanceof Error ? err.message : t('lifeform.err_failed'));
    }
  }, [quarks, photoCost, playerId, record, onQuarksChange, onUpdated, t]);

  // ── Paid Alpha-video generation ─────────────────────────────────────────
  const startVideoGen = useCallback(async () => {
    if (quarks < videoCost) {
      setGenError(t('lifeform.err_quarks'));
      return;
    }
    setGenError(null);
    setVideoGenStatus('generating');
    void trackEvent('lifeform_alpha_video', { rarity, cost: videoCost });
    try {
      const resp = await generateLifeformVideo(playerId, record.id);
      if (resp.quarksRemaining !== null && resp.quarksRemaining !== undefined) {
        onQuarksChange(resp.quarksRemaining);
      }
      stopVideoPoll.current = pollLifeformVideoStatus(record.id, (s) => {
        setVideoGenStatus(s.status);
        if (s.status === 'succeed' && s.videoUrl) {
          const updated = { ...record, video_url: s.videoUrl, video_status: 'succeed' as const };
          setRecord(updated);
          onUpdated(updated);
        } else if (s.status === 'failed') {
          setGenError(t('lifeform.err_failed'));
        }
      });
    } catch (err) {
      setVideoGenStatus('failed');
      setGenError(err instanceof Error ? err.message : t('lifeform.err_failed'));
    }
  }, [quarks, videoCost, playerId, record, onQuarksChange, onUpdated, t]);

  const rarityLabel = getRarityLabel(rarity, lang);
  const photoBusy = photoGenStatus === 'generating' || photoGenStatus === 'pending' || photoGenStatus === 'processing';
  const videoBusy = videoGenStatus === 'generating' || videoGenStatus === 'pending' || videoGenStatus === 'processing';

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderMedia = (mode: 'scan' | 'video' | 'still' | 'clip') => (
    <div style={{ ...styles.mediaFrame, borderColor: accent, boxShadow: `0 0 24px ${hexA(accent, 0.25)}` }}>
      {(mode === 'scan' || mode === 'still') && (
        <>
          {!photoFailed ? (
            <img src={photoSrc} alt="" onError={() => setPhotoFailed(true)} style={styles.mediaImg} />
          ) : (
            <Placeholder label={t('lifeform.scan_caption')} accent={accent} />
          )}
          {mode === 'scan' && (
            <>
              <div className="lf-cover" />
              <div className="lf-scanline" style={{ boxShadow: `0 0 14px 4px ${hexA(accent, 0.7)}` }} />
            </>
          )}
        </>
      )}

      {(mode === 'video' || mode === 'clip') && (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            preload="auto"
            poster={photoSrc || undefined}
            controls={mode === 'clip'}
            onLoadedData={() => setVideoLoading(false)}
            onCanPlay={() => setVideoLoading(false)}
            onPlay={enterVideoFocus}
            onPause={exitVideoFocus}
            onEnded={() => { exitVideoFocus(); if (mode === 'video') setBeat('classify'); }}
            onError={() => { setVideoFailed(true); setVideoLoading(false); exitVideoFocus(); }}
            style={{ ...styles.mediaImg, display: videoFailed || !videoSrc ? 'none' : 'block' }}
          />
          {(videoFailed || !videoSrc) && <Placeholder label={t('lifeform.reveal_title')} accent={accent} />}
          {videoLoading && !videoFailed && videoSrc && (
            <div style={styles.videoLoader}>
              <span className="lf-vid-spinner" style={{ borderColor: hexA(accent, 0.25), borderTopColor: accent }} />
              <span style={{ ...styles.videoLoaderText, color: accent }}>{t('lifeform.video_loading')}</span>
            </div>
          )}
          {videoNeedsTap && !videoFailed && videoSrc && (
            <button onClick={handleManualPlay} style={styles.playOverlay} aria-label="play">
              <span style={{ ...styles.playTriangle, borderLeftColor: accent }} />
            </button>
          )}
        </>
      )}

      <span style={{ ...styles.corner, borderColor: accent, top: 6, left: 6, borderRight: 'none', borderBottom: 'none' }} />
      <span style={{ ...styles.corner, borderColor: accent, top: 6, right: 6, borderLeft: 'none', borderBottom: 'none' }} />
      <span style={{ ...styles.corner, borderColor: accent, bottom: 6, left: 6, borderRight: 'none', borderTop: 'none' }} />
      <span style={{ ...styles.corner, borderColor: accent, bottom: 6, right: 6, borderLeft: 'none', borderTop: 'none' }} />
    </div>
  );

  return (
    <div style={styles.backdrop}>
      <style>{KEYFRAMES}</style>
      <div style={{ ...styles.window, boxShadow: `0 0 48px rgba(0,0,0,0.65), 0 0 0 1px ${hexA(accent, 0.16)}` }}>
        {/* top accent hairline */}
        <div style={{ ...styles.topAccent, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        {/* header bar — rarity pill (left) + close (right), evenly spaced */}
        <div style={styles.header}>
          <div style={{ ...styles.rarityPill, color: accent, borderColor: hexA(accent, 0.5), background: hexA(accent, 0.1) }}>
            <span style={{ ...styles.rarityDot, background: accent, boxShadow: `0 0 8px ${accent}` }} />
            {rarityLabel}
          </div>
          {beat !== 'reward' ? (
            <button onClick={onClose} style={styles.closeBtn} aria-label={t('lifeform.skip')}>✕</button>
          ) : <span style={{ width: 28 }} />}
        </div>

        {/* ── alert ── */}
        {beat === 'alert' && (
          <div style={styles.alertWrap}>
            <div style={{ ...styles.pulse, borderColor: accent }} />
            <div style={{ ...styles.alertTitle, color: accent, textShadow: `0 0 12px ${hexA(accent, 0.5)}` }}>
              {t('lifeform.alert_title')}
            </div>
            <div style={styles.terminal}>
              {typedLines.map((l, i) => (
                <div key={i} style={styles.terminalLine}>
                  <span style={{ color: accent }}>{'> '}</span>{l}
                  {i === typedLines.length - 1 && <span className="lf-caret" style={{ color: accent }}>_</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── scan (common) ── */}
        {beat === 'scan' && (
          <div style={styles.beatBody}>
            <ScanStatus accent={accent} label={t('lifeform.scanning')} done={scanDone} />
            {renderMedia('scan')}
            <div style={styles.caption}>{t('lifeform.scan_caption')}</div>
            {scanDone && (
              <button onClick={() => setBeat(videoSrc ? 'video' : 'classify')} style={{ ...styles.primaryBtn, color: accent, borderColor: accent, background: hexA(accent, 0.12) }}>
                {t('lifeform.continue')}
              </button>
            )}
          </div>
        )}

        {/* ── video (common) ── */}
        {beat === 'video' && (
          <div style={styles.beatBody}>
            <div style={{ ...styles.badge, color: accent, borderColor: accent }}>{t('lifeform.reveal_title')}</div>
            {renderMedia('video')}
            <button onClick={() => setBeat('classify')} style={styles.ghostBtn}>{t('lifeform.continue')}</button>
          </div>
        )}

        {/* ── classify + name ── */}
        {beat === 'classify' && (
          <div style={styles.beatBody}>
            <div style={{ ...styles.classifyTitle }}>{t('lifeform.classify_title')}</div>
            <div style={styles.taxonomy}>
              <TaxRow k={t('lifeform.tax_domain')} v={t('lifeform.tax_domain_val')} />
              <TaxRow k={t('lifeform.tax_class')} v={t('lifeform.tax_class_val')} />
              <TaxRow k={t('lifeform.tax_status')} v={rarityLabel} valColor={accent} />
            </div>
            <div style={styles.astraNote}>
              <span style={{ color: '#7bb8ff' }}>A.S.T.R.A. </span>
              {isCommon ? t('lifeform.astra_note') : t('lifeform.astra_paid_note')}
            </div>
            <label style={styles.nameLabel}>{t('lifeform.name_prompt')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={record.species_name || t('lifeform.default_species')}
              maxLength={40}
              style={styles.nameInput}
            />
            <button onClick={handleConfirmName} style={{ ...styles.primaryBtn, color: accent, borderColor: accent, background: hexA(accent, 0.12) }}>
              {t('lifeform.name_confirm')}
            </button>
          </div>
        )}

        {/* ── media (paid Alpha-photo → Alpha-video) ── */}
        {beat === 'media' && (
          <div style={styles.beatBody}>
            {renderMedia('still')}
            {genError && <div style={styles.errorRow}>{genError}</div>}

            {/* Premium media — paid unique 4K generation (uncommon+ only) */}
            {!record.photo_url ? (
              <PremiumCard
                accent={accent}
                kicker={t('lifeform.premium')}
                label={t('lifeform.alpha_photo')}
                desc={t('lifeform.alpha_photo_desc')}
                infoTitle={t('lifeform.alpha_info_title')}
                cost={photoCost}
                busy={photoBusy}
                busyLabel={t('lifeform.generating')}
                onClick={startPhotoGen}
              />
            ) : !record.video_url ? (
              <PremiumCard
                accent={accent}
                kicker={t('lifeform.premium')}
                label={t('lifeform.alpha_video')}
                desc={t('lifeform.alpha_video_desc')}
                infoTitle={t('lifeform.alpha_info_title')}
                cost={videoCost}
                busy={videoBusy}
                busyLabel={t('lifeform.generating')}
                onClick={startVideoGen}
              />
            ) : (
              <div style={{ ...styles.mediaComplete, color: accent, borderColor: hexA(accent, 0.4), background: hexA(accent, 0.08) }}>
                {t('lifeform.media_complete')}
              </div>
            )}

            <button onClick={() => setBeat('reward')} style={styles.ghostBtn}>
              {record.photo_url || record.video_url ? t('lifeform.to_archive') : t('lifeform.maybe_later')}
            </button>
          </div>
        )}

        {/* ── reward / archive ── */}
        {beat === 'reward' && (
          <div style={styles.beatBody}>
            <div style={{ ...styles.rewardTitle, color: accent }}>{t('lifeform.reward_title')}</div>
            <div style={styles.rewardRow}>
              <span style={{ color: TEXT_MUTED }}>{t('lifeform.reward_species')}</span>
              <span style={{ color: TEXT }}>{record.species_name || t('lifeform.default_species')}</span>
            </div>
            <div style={styles.rewardRow}>
              <span style={{ color: TEXT_MUTED }}>{t('lifeform.reward_archive')}</span>
              <span style={{ color: TEXT }}>{t('lifeform.reward_archive_val')}</span>
            </div>
            {showOnboarding ? (
              <div style={styles.onboarding}>
                <div style={styles.onboardingHead}>
                  <span style={{ color: '#7bb8ff' }}>A.S.T.R.A.</span>
                </div>
                <div style={styles.onboardingLine}>{t('lifeform.astra_onboarding_1')}</div>
                <div style={styles.onboardingLine}>{t('lifeform.astra_onboarding_2')}</div>
                <div style={styles.onboardingLine}>{t('lifeform.astra_onboarding_3')}</div>
              </div>
            ) : (
              isCommon && <div style={styles.teaser}>{t('lifeform.teaser')}</div>
            )}
            <button onClick={onClose} style={{ ...styles.primaryBtn, color: accent, borderColor: accent, background: hexA(accent, 0.12) }}>
              {t('lifeform.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components & helpers
// ---------------------------------------------------------------------------

function Placeholder({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={styles.placeholder}>
      <div style={{ ...styles.placeholderGlyph, color: accent }}>✶</div>
      <div style={styles.placeholderText}>{label}</div>
    </div>
  );
}

/** Animated "live scanning" status — reads as a process readout, not a button. */
function ScanStatus({ accent, label, done }: { accent: string; label: string; done: boolean }) {
  return (
    <div style={styles.scanStatus}>
      <span
        className={done ? undefined : 'lf-scan-dot'}
        style={{ ...styles.scanDot, background: accent, boxShadow: `0 0 10px ${accent}` }}
      />
      <span
        className={done ? undefined : 'lf-scan-text'}
        style={{ ...styles.scanText, color: accent, ['--lf-accent' as string]: accent }}
      >
        {label}
      </span>
      {!done && <span className="lf-scan-ellipsis" style={{ color: accent }} />}
    </div>
  );
}

function PremiumCard({ accent, kicker, label, desc, infoTitle, cost, busy, busyLabel, onClick }: {
  accent: string;
  kicker: string;
  label: string;
  desc: string;
  infoTitle: string;
  cost: number;
  busy: boolean;
  busyLabel: string;
  onClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.premiumWrap}>
      <button
        onClick={onClick}
        disabled={busy}
        style={{
          ...styles.premiumBtn,
          borderColor: hexA(accent, 0.55),
          background: `linear-gradient(135deg, ${hexA(accent, 0.2)} 0%, ${hexA(accent, 0.05)} 100%)`,
          boxShadow: `0 0 18px ${hexA(accent, 0.18)}, inset 0 1px 0 ${hexA(accent, 0.2)}`,
          opacity: busy ? 0.6 : 1,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        <span style={{ ...styles.premiumKicker, color: accent }}>
          <span style={{ ...styles.premiumStar, color: accent }}>✦</span> {kicker}
        </span>
        <span style={styles.premiumMain}>
          <span style={styles.premiumLabel}>{busy ? busyLabel : label}</span>
          {!busy && (
            <span style={{ ...styles.premiumCost, color: accent, borderColor: hexA(accent, 0.45), background: hexA(accent, 0.1) }}>
              {cost} ◈
            </span>
          )}
        </span>
      </button>

      {/* "?" info chip — explains why this premium feature is worth it */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={infoTitle}
        style={{
          ...styles.infoChip,
          color: accent,
          borderColor: hexA(accent, 0.5),
          background: open ? hexA(accent, 0.18) : hexA(accent, 0.08),
        }}
      >
        ?
      </button>

      {open && (
        <div style={{ ...styles.infoPanel, borderColor: hexA(accent, 0.3), background: hexA(accent, 0.06) }}>
          <div style={{ ...styles.infoPanelTitle, color: accent }}>{infoTitle}</div>
          <div style={styles.infoPanelBody}>{desc}</div>
        </div>
      )}
    </div>
  );
}

function TaxRow({ k, v, valColor }: { k: string; v: string; valColor?: string }) {
  return (
    <div style={styles.taxRow}>
      <span style={{ color: TEXT_MUTED }}>{k}</span>
      <span style={{ color: valColor ?? TEXT }}>{v}</span>
    </div>
  );
}

/** Apply alpha to a #rrggbb hex colour. */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 100000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(4,10,22,0.82) 0%, rgba(2,5,16,0.94) 100%)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    padding: 16, fontFamily: 'monospace',
  },
  window: {
    position: 'relative', width: 'min(94vw, 440px)',
    background: PANEL_BG, border: `1px solid ${BORDER}`, borderRadius: 12,
    padding: '14px 22px 24px', overflow: 'hidden',
  },
  topAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.8, pointerEvents: 'none',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, marginBottom: 16, minHeight: 30,
  },
  rarityPill: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
    border: '1px solid', borderRadius: 999, padding: '5px 12px',
  },
  rarityDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  closeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, flexShrink: 0,
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 8,
    color: TEXT_MUTED, fontFamily: 'monospace', fontSize: 13, lineHeight: 1, cursor: 'pointer', padding: 0,
  },
  alertWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '14px 0' },
  pulse: { width: 54, height: 54, borderRadius: '50%', border: '2px solid', animation: 'lf-pulse 1.4s ease-out infinite' },
  alertTitle: { fontSize: 14, fontWeight: 700, letterSpacing: 2, textAlign: 'center' },
  terminal: {
    width: '100%', minHeight: 92, background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 12px', fontSize: 12,
  },
  terminalLine: { color: TEXT, lineHeight: 1.6, wordBreak: 'break-word' },
  beatBody: { display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch' },
  premiumBtn: {
    display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch',
    border: '1px solid', borderRadius: 10, padding: '12px 14px', marginTop: 2,
    fontFamily: 'monospace', textAlign: 'left',
  },
  premiumWrap: { position: 'relative', display: 'flex', flexDirection: 'column', marginTop: 2 },
  infoChip: {
    position: 'absolute', top: 8, right: 10, width: 20, height: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', borderRadius: '50%', fontFamily: 'monospace',
    fontSize: 12, fontWeight: 700, lineHeight: 1, cursor: 'pointer', padding: 0, zIndex: 2,
  },
  infoPanel: {
    border: '1px solid', borderRadius: 8, padding: '10px 12px', marginTop: 6,
  },
  infoPanelTitle: { fontSize: 10, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 },
  infoPanelBody: { color: TEXT, fontSize: 12, lineHeight: 1.5 },
  scanStatus: {
    alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: 11, letterSpacing: 3, fontWeight: 700, padding: '2px 4px',
  },
  scanDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  scanText: { position: 'relative' },
  premiumKicker: { fontSize: 9, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 },
  premiumStar: { fontSize: 10 },
  premiumMain: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  premiumLabel: { color: TEXT, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 },
  premiumCost: { fontSize: 13, fontWeight: 700, border: '1px solid', borderRadius: 999, padding: '3px 11px', whiteSpace: 'nowrap' },
  mediaComplete: {
    alignSelf: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 1,
    border: '1px solid', borderRadius: 999, padding: '6px 14px',
  },
  badge: {
    alignSelf: 'center', fontSize: 11, letterSpacing: 2, color: TEXT_MUTED,
    border: `1px solid ${BORDER}`, borderRadius: 3, padding: '4px 10px',
  },
  mediaFrame: {
    position: 'relative', width: '100%', aspectRatio: '4 / 3', background: '#000',
    border: '1px solid', borderRadius: 4, overflow: 'hidden',
  },
  mediaImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  corner: { position: 'absolute', width: 14, height: 14, border: '2px solid', opacity: 0.7, pointerEvents: 'none' },
  playOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer',
  },
  videoLoader: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    background: 'linear-gradient(rgba(2,5,12,0.5), rgba(2,5,12,0.68))', pointerEvents: 'none',
  },
  videoLoaderText: { fontSize: 11, letterSpacing: 2, animation: 'lf-flicker 1.6s ease-in-out infinite' },
  playTriangle: {
    width: 0, height: 0, borderTop: '16px solid transparent', borderBottom: '16px solid transparent',
    borderLeft: '26px solid', marginLeft: 6,
  },
  placeholder: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 8px, transparent 8px 16px), #050a14',
  },
  placeholderGlyph: { fontSize: 34, opacity: 0.5, animation: 'lf-flicker 2.2s infinite' },
  placeholderText: { color: TEXT_MUTED, fontSize: 11, letterSpacing: 1 },
  caption: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center', minHeight: 16 },
  classifyTitle: { color: TEXT, fontSize: 15, fontWeight: 700, textAlign: 'center' },
  taxonomy: {
    display: 'flex', flexDirection: 'column', gap: 6,
    background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 12px',
  },
  taxRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  astraNote: { color: TEXT, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' },
  nameLabel: { color: TEXT_MUTED, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  nameInput: {
    width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.4)', border: '1px solid #446688',
    borderRadius: 3, color: TEXT, fontFamily: 'monospace', fontSize: 14, padding: '9px 11px', outline: 'none',
  },
  errorRow: { color: '#ff8844', fontSize: 12, textAlign: 'center' },
  rewardTitle: { fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 2 },
  rewardRow: {
    display: 'flex', justifyContent: 'space-between', fontSize: 13,
    padding: '6px 0', borderBottom: '1px solid rgba(50,60,80,0.4)',
  },
  teaser: {
    color: TEXT, fontSize: 12, lineHeight: 1.55, textAlign: 'center',
    background: 'rgba(68,136,170,0.08)', border: '1px solid rgba(123,184,255,0.2)',
    borderRadius: 4, padding: '12px', marginTop: 8,
  },
  onboarding: {
    display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8,
    background: 'rgba(68,136,170,0.08)', border: '1px solid rgba(123,184,255,0.2)',
    borderRadius: 4, padding: '12px',
  },
  onboardingHead: { fontSize: 11, letterSpacing: 2, fontWeight: 700 },
  onboardingLine: { color: TEXT, fontSize: 12, lineHeight: 1.5 },
  primaryBtn: {
    marginTop: 6, border: '1px solid', fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
    letterSpacing: 1, borderRadius: 3, padding: '11px 14px', cursor: 'pointer',
  },
  ghostBtn: {
    marginTop: 2, background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_MUTED,
    fontFamily: 'monospace', fontSize: 12, borderRadius: 3, padding: '9px 14px', cursor: 'pointer', alignSelf: 'center',
  },
};

const KEYFRAMES = `
@keyframes lf-pulse {
  0%   { transform: scale(0.7); opacity: 0.9; }
  70%  { transform: scale(1.1); opacity: 0.2; }
  100% { transform: scale(0.7); opacity: 0.9; }
}
.lf-caret { animation: lf-blink 0.9s steps(1) infinite; }
@keyframes lf-blink { 50% { opacity: 0; } }
.lf-vid-spinner { width: 32px; height: 32px; border-radius: 50%; border: 2px solid; animation: lf-vid-spin 0.8s linear infinite; }
@keyframes lf-vid-spin { to { transform: rotate(360deg); } }
.lf-scan-dot { animation: lf-scan-dot 1s ease-in-out infinite; }
@keyframes lf-scan-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }
.lf-scan-text { background-image: linear-gradient(100deg, var(--lf-accent) 0%, #ffffff 50%, var(--lf-accent) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: lf-scan-shimmer 1.8s linear infinite; }
@keyframes lf-scan-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.lf-scan-ellipsis::after { content: ''; animation: lf-scan-dots 1.4s steps(4,end) infinite; }
@keyframes lf-scan-dots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: ''; } }
@keyframes lf-flicker { 0%,100% { opacity: 0.5; } 45% { opacity: 0.15; } 55% { opacity: 0.6; } }
.lf-cover {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: #050a14;
  animation: lf-reveal 3.3s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes lf-reveal { 0% { clip-path: inset(0 0 0 0); } 100% { clip-path: inset(0 0 0 100%); } }
.lf-scanline {
  position: absolute; top: 0; bottom: 0; width: 3px; background: rgba(255,255,255,0.85);
  animation: lf-scan 3.3s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes lf-scan { 0% { left: 0%; opacity: 1; } 95% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
`;
