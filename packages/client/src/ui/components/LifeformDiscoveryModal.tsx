// ---------------------------------------------------------------------------
// LifeformDiscoveryModal — "First Contact" presentation
// ---------------------------------------------------------------------------
// A centred, themed popup window (NOT full-screen) shown the first time the
// player builds a greenhouse on a colonised planet. Photo + video live inside
// the window (720p assets → small bundle).
//
// Five beats:
//   1. alert     — bio-sensors spike, typed monospace alert
//   2. scan      — themed left-to-right reveal of the lifeform photo
//   3. video     — short clip (with sound) of the lifeform
//   4. classify  — taxonomy card + the player names the species
//   5. reward    — reward summary + teaser for the future paid feature
//
// Assets are optional: if photo/video are missing (404) the modal shows a
// styled placeholder so the whole flow can be tested before art is added.
// ---------------------------------------------------------------------------

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { playLoop, stopLoop } from '../../audio/SfxPlayer.js';

const TERMINAL_TYPE_LOOP = 'terminal-type';
const TERMINAL_TYPE_LOOP_VOLUME = 0.2;

const ACCENT = '#44ff88';
const PANEL_BG = 'rgba(10,15,25,0.96)';
const BORDER = '#334455';
const TEXT = '#aabbcc';
const TEXT_MUTED = '#667788';

type Beat = 'alert' | 'scan' | 'video' | 'classify' | 'reward';

export interface LifeformDiscoveryModalProps {
  /** Photo asset (16:9 / 4:3, ~720p). Defaults to bundled first lifeform. */
  photoSrc?: string;
  /** Video asset (with sound, ~720p). Defaults to bundled first lifeform. */
  videoSrc?: string;
  /** Suggested procedural species name (player can edit). */
  suggestedName?: string;
  /** XP awarded (display only — actual award happens in App). */
  xpReward?: number;
  /** Called with the final species name when the player confirms. */
  onNamed?: (name: string) => void;
  /** Called when the player closes the modal (end of flow). */
  onClose: () => void;
}

const DEFAULT_PHOTO = '/lifeforms/first/photo.webp';
const DEFAULT_VIDEO = '/lifeforms/first/video.webm';

export function LifeformDiscoveryModal({
  photoSrc = DEFAULT_PHOTO,
  videoSrc = DEFAULT_VIDEO,
  suggestedName,
  xpReward = 100,
  onNamed,
  onClose,
}: LifeformDiscoveryModalProps) {
  const { t } = useTranslation();

  const [beat, setBeat] = useState<Beat>('alert');
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoNeedsTap, setVideoNeedsTap] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [name, setName] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  const alertLines = [
    t('lifeform.alert_line_1'),
    t('lifeform.alert_line_2'),
    t('lifeform.alert_line_3'),
  ];

  // ── Beat 1: typed alert lines ────────────────────────────────────────────
  useEffect(() => {
    if (beat !== 'alert') return;
    let lineIdx = 0;
    let charIdx = 0;
    let cancelled = false;
    const out: string[] = [''];
    setTypedLines(['']);
    playLoop(TERMINAL_TYPE_LOOP, TERMINAL_TYPE_LOOP_VOLUME);

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
        stopLoop(TERMINAL_TYPE_LOOP);
        window.setTimeout(() => { if (!cancelled) setBeat('scan'); }, 1100);
      }
    };
    const startId = window.setTimeout(tick, 500);
    return () => { cancelled = true; window.clearTimeout(startId); stopLoop(TERMINAL_TYPE_LOOP); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // ── Beat 2: scan reveal completion → advance ─────────────────────────────
  useEffect(() => {
    if (beat !== 'scan') return;
    setScanDone(false);
    const doneId = window.setTimeout(() => setScanDone(true), 3600);
    const advId = window.setTimeout(() => setBeat('video'), 5200);
    return () => { window.clearTimeout(doneId); window.clearTimeout(advId); };
  }, [beat]);

  // ── Beat 3: try to autoplay the video (with sound, after user gestures) ──
  useEffect(() => {
    if (beat !== 'video') return;
    const v = videoRef.current;
    if (!v) return;
    setVideoNeedsTap(false);
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => setVideoNeedsTap(true));
    }
  }, [beat]);

  const handleManualPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setVideoNeedsTap(false)).catch(() => setVideoNeedsTap(true));
  }, []);

  const handleConfirmName = useCallback(() => {
    const finalName = (name.trim() || suggestedName || t('lifeform.default_species')).slice(0, 28);
    onNamed?.(finalName);
    setBeat('reward');
  }, [name, suggestedName, onNamed, t]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderMedia = (mode: 'scan' | 'video') => (
    <div style={styles.mediaFrame}>
      {/* Photo (scan beat) */}
      {mode === 'scan' && (
        <>
          {!photoFailed ? (
            <img
              src={photoSrc}
              alt=""
              onError={() => setPhotoFailed(true)}
              style={styles.mediaImg}
            />
          ) : (
            <Placeholder label={t('lifeform.scan_caption')} />
          )}
          {/* left-to-right cover that retracts to reveal the image */}
          <div className="lf-cover" />
          <div className="lf-scanline" />
        </>
      )}

      {/* Video (video beat) */}
      {mode === 'video' && (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            preload="auto"
            onEnded={() => setBeat('classify')}
            onError={() => setVideoFailed(true)}
            style={{ ...styles.mediaImg, display: videoFailed ? 'none' : 'block' }}
          />
          {videoFailed && <Placeholder label={t('lifeform.reveal_title')} />}
          {videoNeedsTap && !videoFailed && (
            <button onClick={handleManualPlay} style={styles.playOverlay} aria-label="play">
              <span style={styles.playTriangle} />
            </button>
          )}
        </>
      )}

      {/* corner brackets — sci-fi framing */}
      <span style={{ ...styles.corner, top: 6, left: 6, borderRight: 'none', borderBottom: 'none' }} />
      <span style={{ ...styles.corner, top: 6, right: 6, borderLeft: 'none', borderBottom: 'none' }} />
      <span style={{ ...styles.corner, bottom: 6, left: 6, borderRight: 'none', borderTop: 'none' }} />
      <span style={{ ...styles.corner, bottom: 6, right: 6, borderLeft: 'none', borderTop: 'none' }} />
    </div>
  );

  return (
    <div style={styles.backdrop}>
      <style>{KEYFRAMES}</style>
      <div style={styles.window}>
        {/* skip — never trap the tester */}
        {beat !== 'reward' && (
          <button onClick={onClose} style={styles.skip}>{t('lifeform.skip')}</button>
        )}

        {/* ── Beat 1: alert ── */}
        {beat === 'alert' && (
          <div style={styles.alertWrap}>
            <div style={styles.pulse} />
            <div style={styles.alertTitle}>{t('lifeform.alert_title')}</div>
            <div style={styles.terminal}>
              {typedLines.map((l, i) => (
                <div key={i} style={styles.terminalLine}>
                  <span style={{ color: ACCENT }}>{'> '}</span>{l}
                  {i === typedLines.length - 1 && <span className="lf-caret">_</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Beat 2: scan ── */}
        {beat === 'scan' && (
          <div style={styles.beatBody}>
            <div style={styles.badge}>{t('lifeform.scanning')}</div>
            {renderMedia('scan')}
            <div style={styles.caption}>{t('lifeform.scan_caption')}</div>
            {scanDone && (
              <button onClick={() => setBeat('video')} style={styles.primaryBtn}>
                {t('lifeform.continue')}
              </button>
            )}
          </div>
        )}

        {/* ── Beat 3: video ── */}
        {beat === 'video' && (
          <div style={styles.beatBody}>
            <div style={{ ...styles.badge, color: ACCENT, borderColor: ACCENT }}>
              {t('lifeform.reveal_title')}
            </div>
            {renderMedia('video')}
            <button onClick={() => setBeat('classify')} style={styles.ghostBtn}>
              {t('lifeform.continue')}
            </button>
          </div>
        )}

        {/* ── Beat 4: classify + name ── */}
        {beat === 'classify' && (
          <div style={styles.beatBody}>
            <div style={styles.legendaryBadge}>{t('lifeform.legendary_badge')}</div>
            <div style={styles.classifyTitle}>{t('lifeform.classify_title')}</div>
            <div style={styles.taxonomy}>
              <TaxRow k={t('lifeform.tax_domain')} v={t('lifeform.tax_domain_val')} />
              <TaxRow k={t('lifeform.tax_class')} v={t('lifeform.tax_class_val')} />
              <TaxRow k={t('lifeform.tax_status')} v={t('lifeform.tax_status_val')} valColor={ACCENT} />
            </div>
            <div style={styles.astraNote}>
              <span style={{ color: '#7bb8ff' }}>A.S.T.R.A. </span>
              {t('lifeform.astra_note')}
            </div>
            <label style={styles.nameLabel}>{t('lifeform.name_prompt')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={suggestedName || t('lifeform.default_species')}
              maxLength={28}
              style={styles.nameInput}
            />
            <button onClick={handleConfirmName} style={styles.primaryBtn}>
              {t('lifeform.name_confirm')}
            </button>
          </div>
        )}

        {/* ── Beat 5: reward + teaser ── */}
        {beat === 'reward' && (
          <div style={styles.beatBody}>
            <div style={styles.rewardTitle}>{t('lifeform.reward_title')}</div>
            <div style={styles.rewardRow}>
              <span style={{ color: TEXT_MUTED }}>{t('lifeform.reward_xp')}</span>
              <span style={{ color: ACCENT }}>+{xpReward} XP</span>
            </div>
            <div style={styles.rewardRow}>
              <span style={{ color: TEXT_MUTED }}>{t('lifeform.reward_archive')}</span>
              <span style={{ color: TEXT }}>{t('lifeform.reward_archive_val')}</span>
            </div>
            <div style={styles.teaser}>{t('lifeform.teaser')}</div>
            <button onClick={onClose} style={styles.primaryBtn}>
              {t('lifeform.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function Placeholder({ label }: { label: string }) {
  return (
    <div style={styles.placeholder}>
      <div style={styles.placeholderGlyph}>✶</div>
      <div style={styles.placeholderText}>{label}</div>
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(4,10,22,0.82) 0%, rgba(2,5,16,0.94) 100%)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: 16,
    fontFamily: 'monospace',
  },
  window: {
    position: 'relative',
    width: 'min(94vw, 440px)',
    background: PANEL_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(68,255,136,0.06)',
    padding: '22px 20px',
    overflow: 'hidden',
  },
  skip: {
    position: 'absolute',
    top: 8,
    right: 10,
    background: 'transparent',
    border: 'none',
    color: TEXT_MUTED,
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    padding: 4,
    zIndex: 5,
  },
  // alert beat
  alertWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '14px 0' },
  pulse: {
    width: 54, height: 54, borderRadius: '50%',
    border: `2px solid ${ACCENT}`,
    animation: 'lf-pulse 1.4s ease-out infinite',
  },
  alertTitle: {
    color: ACCENT, fontSize: 14, fontWeight: 700, letterSpacing: 2,
    textAlign: 'center', textShadow: '0 0 12px rgba(68,255,136,0.5)',
  },
  terminal: {
    width: '100%', minHeight: 92,
    background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${BORDER}`,
    borderRadius: 4,
    padding: '10px 12px',
    fontSize: 12,
  },
  terminalLine: { color: TEXT, lineHeight: 1.6, wordBreak: 'break-word' },
  // generic beat body
  beatBody: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' },
  badge: {
    alignSelf: 'center',
    fontSize: 11, letterSpacing: 2,
    color: TEXT_MUTED,
    border: `1px solid ${BORDER}`,
    borderRadius: 3,
    padding: '4px 10px',
  },
  // media
  mediaFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    background: '#000',
    border: `1px solid ${BORDER}`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mediaImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  corner: {
    position: 'absolute',
    width: 14, height: 14,
    border: `2px solid ${ACCENT}`,
    opacity: 0.7,
    pointerEvents: 'none',
  },
  playOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.35)',
    border: 'none', cursor: 'pointer',
  },
  playTriangle: {
    width: 0, height: 0,
    borderTop: '16px solid transparent',
    borderBottom: '16px solid transparent',
    borderLeft: `26px solid ${ACCENT}`,
    marginLeft: 6,
    filter: 'drop-shadow(0 0 8px rgba(68,255,136,0.6))',
  },
  placeholder: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 8px, transparent 8px 16px), #050a14',
  },
  placeholderGlyph: { color: ACCENT, fontSize: 34, opacity: 0.5, animation: 'lf-flicker 2.2s infinite' },
  placeholderText: { color: TEXT_MUTED, fontSize: 11, letterSpacing: 1 },
  caption: { color: TEXT_MUTED, fontSize: 12, textAlign: 'center', minHeight: 16 },
  // classify
  legendaryBadge: {
    alignSelf: 'center',
    fontSize: 11, letterSpacing: 2, fontWeight: 700,
    color: '#ffcc66',
    border: '1px solid #ffcc66',
    borderRadius: 3,
    padding: '4px 12px',
    textShadow: '0 0 10px rgba(255,204,102,0.4)',
  },
  classifyTitle: { color: TEXT, fontSize: 15, fontWeight: 700, textAlign: 'center' },
  taxonomy: {
    display: 'flex', flexDirection: 'column', gap: 6,
    background: 'rgba(0,0,0,0.3)', border: `1px solid ${BORDER}`, borderRadius: 4,
    padding: '10px 12px',
  },
  taxRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  astraNote: { color: TEXT, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' },
  nameLabel: { color: TEXT_MUTED, fontSize: 11, letterSpacing: 1, marginTop: 2 },
  nameInput: {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.4)', border: `1px solid ${'#446688'}`,
    borderRadius: 3, color: TEXT, fontFamily: 'monospace', fontSize: 14,
    padding: '9px 11px', outline: 'none',
  },
  // reward
  rewardTitle: { color: ACCENT, fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 2 },
  rewardRow: {
    display: 'flex', justifyContent: 'space-between', fontSize: 13,
    padding: '6px 0', borderBottom: '1px solid rgba(50,60,80,0.4)',
  },
  teaser: {
    color: TEXT, fontSize: 12, lineHeight: 1.55, textAlign: 'center',
    background: 'rgba(68,136,170,0.08)', border: '1px solid rgba(123,184,255,0.2)',
    borderRadius: 4, padding: '12px 12px', marginTop: 8,
  },
  // buttons
  primaryBtn: {
    marginTop: 6,
    background: 'rgba(68,255,136,0.12)', border: `1px solid ${ACCENT}`,
    color: ACCENT, fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
    letterSpacing: 1, borderRadius: 3, padding: '11px 14px', cursor: 'pointer',
  },
  ghostBtn: {
    marginTop: 2,
    background: 'transparent', border: `1px solid ${BORDER}`,
    color: TEXT_MUTED, fontFamily: 'monospace', fontSize: 12,
    borderRadius: 3, padding: '9px 14px', cursor: 'pointer', alignSelf: 'center',
  },
};

const KEYFRAMES = `
@keyframes lf-pulse {
  0%   { transform: scale(0.7); opacity: 0.9; box-shadow: 0 0 0 0 rgba(68,255,136,0.5); }
  70%  { transform: scale(1.1); opacity: 0.2; box-shadow: 0 0 0 18px rgba(68,255,136,0); }
  100% { transform: scale(0.7); opacity: 0.9; }
}
.lf-caret { animation: lf-blink 0.9s steps(1) infinite; color: ${ACCENT}; }
@keyframes lf-blink { 50% { opacity: 0; } }
@keyframes lf-flicker { 0%,100% { opacity: 0.5; } 45% { opacity: 0.15; } 55% { opacity: 0.6; } }
.lf-cover {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0;
  background: #050a14;
  animation: lf-reveal 3.4s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes lf-reveal {
  0%   { clip-path: inset(0 0 0 0); }
  100% { clip-path: inset(0 0 0 100%); }
}
.lf-scanline {
  position: absolute; top: 0; bottom: 0; width: 3px;
  background: rgba(255,255,255,0.85);
  box-shadow: 0 0 14px 4px rgba(68,255,136,0.7);
  animation: lf-scan 3.4s cubic-bezier(0.4,0,0.2,1) forwards;
}
@keyframes lf-scan {
  0%   { left: 0%; opacity: 1; }
  95%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
`;
