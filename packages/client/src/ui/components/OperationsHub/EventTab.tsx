import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  COMET_REWARD_QUARKS,
  COMET_REWARD_XP,
  COMET_REWARD_RESOURCES,
  COMET_TRACKING_DURATION_MS,
  getAllLiveEventSchedules,
  getCatalogEntry,
  liveEventPhotoUrl,
  LIVE_EVENT_ASSET_BASE,
  type CometSchedule,
  type LiveEventDef,
  type LiveEventSchedule,
} from '@nebulife/core';
import { claimLiveEventReward } from '../../../api/retention-api.js';

// ---------------------------------------------------------------------------
// EventTab — live cosmic events. Top: the legendary "Comet Herald" (countdown
// to the 24h window, tracking launch, claimed state). Below: the four
// recurring live events (rogue-flyby, supernova-echo, interstellar-visitor,
// aurora-storm) — deterministic 24h windows, free to observe, modest rewards.
// ---------------------------------------------------------------------------

interface EventTabProps {
  schedule: CometSchedule;
  claimed: boolean;
  trackingStartedAt: number | null;
  claiming: boolean;
  onStartTracking: () => void;
  targetEventId?: string | null;
  /** Live events (self-contained section below the comet). */
  playerId: string;
  onLiveEventClaimed: (
    eventId: string,
    occurrenceDate: string,
    quarksGranted: number,
    newBalance: number,
  ) => void;
}

const BORDER = '#334455';
const ACCENT = '#7bb8ff';

function pad(n: number): string { return String(n).padStart(2, '0'); }

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Procedural comet vignette (SVG, no textures). */
function CometArt() {
  return (
    <svg viewBox="0 0 320 110" style={{ width: '100%', height: 96, display: 'block' }}>
      <defs>
        <radialGradient id="cometCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dff0ff" />
          <stop offset="45%" stopColor="#7bb8ff" />
          <stop offset="100%" stopColor="rgba(123,184,255,0)" />
        </radialGradient>
        <linearGradient id="cometTail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(123,184,255,0)" />
          <stop offset="70%" stopColor="rgba(123,184,255,0.28)" />
          <stop offset="100%" stopColor="rgba(223,240,255,0.75)" />
        </linearGradient>
        <linearGradient id="cometTail2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,215,0,0)" />
          <stop offset="100%" stopColor="rgba(255,215,0,0.4)" />
        </linearGradient>
      </defs>
      {/* star field */}
      {Array.from({ length: 26 }, (_, i) => {
        const x = (i * 137.5) % 320;
        const y = (i * 71.3) % 110;
        const r = 0.5 + (i % 3) * 0.35;
        return <circle key={i} cx={x} cy={y} r={r} fill="#aabbcc" opacity={0.25 + (i % 4) * 0.12} />;
      })}
      {/* tails */}
      <polygon points="40,18 245,52 40,40" fill="url(#cometTail2)" opacity="0.7" transform="rotate(2 160 55)" />
      <polygon points="20,30 248,55 20,72" fill="url(#cometTail)" />
      {/* nucleus */}
      <circle cx="248" cy="55" r="22" fill="url(#cometCore)" />
      <circle cx="248" cy="55" r="5" fill="#eef8ff" />
    </svg>
  );
}

export function EventTab({ schedule, claimed, trackingStartedAt, claiming, onStartTracking, playerId, targetEventId, onLiveEventClaimed }: EventTabProps) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!targetEventId) return;
    window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      targetRef.current?.focus();
    }, 120);
  }, [targetEventId]);

  const tracking = trackingStartedAt != null && now - trackingStartedAt < COMET_TRACKING_DURATION_MS;
  const trackingPct = trackingStartedAt != null
    ? Math.min(100, ((now - trackingStartedAt) / COMET_TRACKING_DURATION_MS) * 100)
    : 0;

  const windowDate = new Date(schedule.windowStartMs);
  const dateLabel = windowDate.toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {targetEventId && (
        <div role="status" style={{
          border: '1px solid #7bb8ff', borderRadius: 4, padding: '9px 10px',
          background: 'rgba(123,184,255,0.1)', color: '#cfe3ff', fontSize: 10, lineHeight: 1.45,
        }}>
          {t('ops.push_event_target')}
        </div>
      )}
      {/* Hero */}
      <div ref={targetEventId === 'comet-herald' ? targetRef : undefined} tabIndex={targetEventId === 'comet-herald' ? -1 : undefined} style={{
        border: `1px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden',
        background: 'rgba(4,8,16,0.9)',
        outline: targetEventId === 'comet-herald' ? '2px solid rgba(123,184,255,0.8)' : 'none',
      }}>
        <CometArt />
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ color: ACCENT, fontSize: 13, letterSpacing: 2 }}>{t('ops.comet_name')}</div>
          <div style={{ color: '#ffd700', fontSize: 9, letterSpacing: 1, marginTop: 3 }}>{t('ops.comet_rarity')}</div>
        </div>
      </div>

      {/* State */}
      {claimed ? (
        <div style={{
          border: '1px solid rgba(68,255,136,0.5)', borderRadius: 4, padding: '14px 12px',
          background: 'rgba(68,255,136,0.07)', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ color: '#44ff88', fontSize: 12, letterSpacing: 1 }}>{t('ops.comet_claimed_title')}</span>
          <span style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5 }}>{t('ops.comet_claimed_desc')}</span>
          <span style={{ color: '#667788', fontSize: 9.5 }}>
            {t('ops.comet_next', { time: formatCountdown(schedule.active ? schedule.windowEndMs - now + 13 * 86_400_000 : schedule.msUntilWindow) })}
          </span>
        </div>
      ) : schedule.active ? (
        <div style={{
          border: `1px solid ${ACCENT}`, borderRadius: 4, padding: '14px 12px',
          background: 'rgba(123,184,255,0.07)',
          display: 'flex', flexDirection: 'column', gap: 10,
          animation: 'opsSoftPulse 2.4s infinite',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: ACCENT, fontSize: 12, letterSpacing: 1.5 }}>{t('ops.comet_window_open')}</div>
            <div style={{ color: '#aabbcc', fontSize: 18, marginTop: 6, letterSpacing: 2 }}>
              {formatCountdown(schedule.windowEndMs - now)}
            </div>
            <div style={{ color: '#667788', fontSize: 9, marginTop: 3 }}>{t('ops.comet_window_closes')}</div>
          </div>

          {tracking || claiming ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#8899aa', fontSize: 10, textAlign: 'center' }}>
                {claiming ? t('ops.comet_claiming') : t('ops.comet_tracking')}
              </div>
              <div style={{ height: 8, border: `1px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', background: 'rgba(4,8,16,0.8)' }}>
                <div style={{
                  width: `${claiming ? 100 : trackingPct}%`, height: '100%',
                  background: `linear-gradient(90deg, #4488aa, ${ACCENT})`,
                  transition: 'width 0.9s linear',
                }} />
              </div>
              <div style={{ color: '#556677', fontSize: 9, textAlign: 'center' }}>
                {t('ops.comet_tracking_note')}
              </div>
            </div>
          ) : (
            <button
              onClick={onStartTracking}
              style={{
                padding: '12px 0', borderRadius: 4,
                border: `1px solid ${ACCENT}`,
                background: 'rgba(123,184,255,0.14)',
                color: ACCENT, fontFamily: 'monospace', fontSize: 12, letterSpacing: 1.5,
                cursor: 'pointer',
              }}
            >
              {t('ops.comet_start_tracking')}
            </button>
          )}
        </div>
      ) : (
        <div style={{
          border: `1px solid ${BORDER}`, borderRadius: 4, padding: '14px 12px',
          background: 'rgba(20,30,45,0.5)', textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ color: '#8899aa', fontSize: 10, letterSpacing: 1 }}>
            {t('ops.comet_approaching', { date: dateLabel })}
          </span>
          <span style={{ color: ACCENT, fontSize: 20, letterSpacing: 2 }}>
            {formatCountdown(schedule.msUntilWindow)}
          </span>
          <span style={{ color: '#667788', fontSize: 9.5, lineHeight: 1.6 }}>
            {t('ops.comet_explain')}
          </span>
        </div>
      )}

      {/* Rewards */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px' }}>
        <div style={{ color: '#aabbcc', fontSize: 10.5, letterSpacing: 1, marginBottom: 8 }}>{t('ops.comet_rewards')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
          <RewardChip color="#ffd700" label={t('ops.comet_reward_quarks', { n: COMET_REWARD_QUARKS })} />
          <RewardChip color="#7bb8ff" label={`+${COMET_REWARD_XP} XP`} />
          <RewardChip color="#9fd0c0" label={t('ops.comet_reward_resources', { n: COMET_REWARD_RESOURCES.minerals })} />
          <RewardChip color="#cc88ff" label={t('ops.comet_reward_archive')} />
        </div>
      </div>

      {/* Recurring live events */}
      <LiveEventsSection playerId={playerId} now={now} targetEventId={targetEventId} targetRef={targetRef} onClaimed={onLiveEventClaimed} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live events section — four recurring, deterministic, free-to-observe
// events. Claims are persisted locally (per occurrence); the server enforces
// one quark grant per occurrence via its idempotency key regardless.
// ---------------------------------------------------------------------------

const LIVE_CLAIMS_LS_KEY = 'nebulife_live_event_claims';

type LiveClaims = Record<string, string[]>;

function loadLiveClaims(): LiveClaims {
  try {
    const raw = localStorage.getItem(LIVE_CLAIMS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as LiveClaims;
    }
  } catch { /* ignore */ }
  return {};
}

function LiveEventsSection({ playerId, now, targetEventId, targetRef, onClaimed }: {
  playerId: string;
  now: number;
  targetEventId?: string | null;
  targetRef: React.RefObject<HTMLDivElement | null>;
  onClaimed: EventTabProps['onLiveEventClaimed'];
}) {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<LiveClaims>(loadLiveClaims);
  const [trackingStarts, setTrackingStarts] = useState<Record<string, number>>({});
  const [claimingIds, setClaimingIds] = useState<Record<string, boolean>>({});
  const [errorId, setErrorId] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => { timersRef.current.forEach((id) => window.clearTimeout(id)); }, []);

  useEffect(() => {
    try { localStorage.setItem(LIVE_CLAIMS_LS_KEY, JSON.stringify(claims)); } catch { /* ignore */ }
  }, [claims]);

  const finishTracking = useCallback((def: LiveEventDef) => {
    setClaimingIds((prev) => ({ ...prev, [def.id]: true }));
    claimLiveEventReward(def.id)
      .then((result) => {
        setClaims((prev) => {
          const dates = prev[def.id] ?? [];
          return dates.includes(result.occurrenceDate)
            ? prev
            : { ...prev, [def.id]: [...dates, result.occurrenceDate] };
        });
        onClaimed(def.id, result.occurrenceDate, result.quarksGranted, result.newBalance);
      })
      .catch((err) => {
        console.warn(`[live-event] ${def.id} claim failed:`, err);
        setErrorId(def.id);
        window.setTimeout(() => setErrorId((cur) => (cur === def.id ? null : cur)), 3500);
      })
      .finally(() => {
        setClaimingIds((prev) => ({ ...prev, [def.id]: false }));
        setTrackingStarts((prev) => {
          const next = { ...prev };
          delete next[def.id];
          return next;
        });
      });
  }, [onClaimed]);

  const startTracking = useCallback((def: LiveEventDef) => {
    if (trackingStarts[def.id] != null || claimingIds[def.id]) return;
    setTrackingStarts((prev) => ({ ...prev, [def.id]: Date.now() }));
    timersRef.current.push(window.setTimeout(() => finishTracking(def), def.trackingDurationMs));
  }, [trackingStarts, claimingIds, finishTracking]);

  const items = getAllLiveEventSchedules(playerId || 'local', now);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: '#aabbcc', fontSize: 11, letterSpacing: 2, marginTop: 4 }}>
        {t('ops.live_title')}
      </div>
      <div style={{ color: '#667788', fontSize: 9.5, lineHeight: 1.5 }}>
        {t('ops.live_explain')}
      </div>
      {items.map(({ def, schedule }) => (
        <LiveEventCard
          key={def.id}
          def={def}
          schedule={schedule}
          now={now}
          claimed={(claims[def.id] ?? []).includes(schedule.occurrenceDate)}
          trackingStartedAt={trackingStarts[def.id] ?? null}
          claiming={claimingIds[def.id] ?? false}
          error={errorId === def.id}
          highlighted={targetEventId === def.id}
          targetRef={targetEventId === def.id ? targetRef : undefined}
          onStartTracking={() => startTracking(def)}
        />
      ))}
    </div>
  );
}

/**
 * Living preview for a live event card: the bundled 7s Seedance clip
 * (muted, looped, autoplaying; WebM primary + MP4 fallback, matching the
 * alpha-promo convention — see public/alpha-promo/README.md). The bundled
 * WebP art doubles as the poster and remains the graceful fallback when the
 * video fails to load or decode; if the still is missing too, the slot hides.
 * The Cosmic Archive gallery entry keeps the static WebP — only this preview
 * uses the video.
 *
 * The preview is intentionally blurred: this is only a teaser silhouette in
 * the list, not the full reveal. The clip/poster is scaled up slightly and
 * clipped by the container's overflow so the blur has no sharp edge to leak
 * through. Nothing else in the card is affected — only this media layer.
 */
function LiveEventMedia({ eventId }: { eventId: string }) {
  const [mode, setMode] = useState<'video' | 'image' | 'hidden'>('video');
  const posterUrl = liveEventPhotoUrl(eventId);
  const frameStyle: React.CSSProperties = {
    width: 54, height: 82, borderRadius: 3, overflow: 'hidden',
    border: `1px solid ${BORDER}`, flexShrink: 0, background: '#020510',
  };
  const blurredMediaStyle: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover',
    filter: 'blur(10px)', transform: 'scale(1.25)',
  };

  if (mode === 'hidden') return null;
  return (
    <div style={frameStyle}>
      {mode === 'image' ? (
        <img src={posterUrl} alt="" onError={() => setMode('hidden')} style={blurredMediaStyle} />
      ) : (
        <video
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          poster={posterUrl}
          onError={() => setMode('image')}
          style={blurredMediaStyle}
        >
          <source src={`${LIVE_EVENT_ASSET_BASE}/${eventId}.webm`} type="video/webm" />
          {/* Error on the LAST source = every candidate failed → static art. */}
          <source
            src={`${LIVE_EVENT_ASSET_BASE}/${eventId}.mp4`}
            type="video/mp4"
            onError={() => setMode('image')}
          />
        </video>
      )}
    </div>
  );
}

function LiveEventCard({ def, schedule, now, claimed, trackingStartedAt, claiming, error, highlighted, targetRef, onStartTracking }: {
  def: LiveEventDef;
  schedule: LiveEventSchedule;
  now: number;
  claimed: boolean;
  trackingStartedAt: number | null;
  claiming: boolean;
  error: boolean;
  highlighted?: boolean;
  targetRef?: React.RefObject<HTMLDivElement | null>;
  onStartTracking: () => void;
}) {
  const { t, i18n } = useTranslation();

  const cat = getCatalogEntry(def.id);
  const lang = i18n.language;
  const name = cat ? (lang === 'en' ? cat.nameEn : cat.nameUk) : def.id;
  const desc = cat ? (lang === 'en' ? (cat.descriptionEn ?? cat.descriptionUk) : cat.descriptionUk) : '';

  const active = schedule.active;
  const tracking = trackingStartedAt != null && now - trackingStartedAt < def.trackingDurationMs;
  const trackingPct = trackingStartedAt != null
    ? Math.min(100, ((now - trackingStartedAt) / def.trackingDurationMs) * 100)
    : 0;

  const borderColor = claimed ? 'rgba(68,255,136,0.4)' : active ? ACCENT : BORDER;

  return (
    <div ref={targetRef} tabIndex={highlighted ? -1 : undefined} style={{
      border: `1px solid ${borderColor}`, borderRadius: 4, overflow: 'hidden',
      background: 'rgba(4,8,16,0.9)',
      animation: active && !claimed ? 'opsSoftPulse 2.4s infinite' : undefined,
      outline: highlighted ? '2px solid rgba(123,184,255,0.8)' : 'none',
    }}>
      <div style={{ display: 'flex', gap: 10, padding: 10 }}>
        <LiveEventMedia eventId={def.id} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: active ? ACCENT : '#aabbcc', fontSize: 11.5, letterSpacing: 1.2 }}>
            {name}
          </div>
          <div style={{ color: '#cc88ff', fontSize: 8.5, letterSpacing: 1 }}>
            {t('ops.live_rarity', { n: def.cycleDays })}
          </div>
          <div style={{ color: '#667788', fontSize: 9, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {desc}
          </div>
          <div style={{ color: '#8899aa', fontSize: 9 }}>
            {t('ops.live_reward', { q: def.rewardQuarks, rd: def.rewardResearchData, xp: def.rewardXp })}
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 10px' }}>
        {claimed ? (
          <div style={{ color: '#44ff88', fontSize: 9.5, letterSpacing: 1, textAlign: 'center' }}>
            {t('ops.live_claimed')}
          </div>
        ) : active ? (
          tracking || claiming ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ color: '#8899aa', fontSize: 9, textAlign: 'center' }}>
                {claiming ? t('ops.comet_claiming') : t('ops.live_tracking')}
              </div>
              <div style={{ height: 6, border: `1px solid ${BORDER}`, borderRadius: 3, overflow: 'hidden', background: 'rgba(4,8,16,0.8)' }}>
                <div style={{
                  width: `${claiming ? 100 : trackingPct}%`, height: '100%',
                  background: `linear-gradient(90deg, #4488aa, ${ACCENT})`,
                  transition: 'width 0.9s linear',
                }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onStartTracking}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 3,
                  border: `1px solid ${ACCENT}`,
                  background: 'rgba(123,184,255,0.14)',
                  color: ACCENT, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.2,
                  cursor: 'pointer',
                }}
              >
                {t('ops.live_start_tracking')}
              </button>
              <span style={{ color: ACCENT, fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>
                {formatCountdown(schedule.windowEndMs - now)}
              </span>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#667788', fontSize: 9, letterSpacing: 0.8 }}>
              {t('ops.live_next')}
            </span>
            <span style={{ color: '#8899aa', fontSize: 10.5, letterSpacing: 1 }}>
              {formatCountdown(schedule.msUntilWindow)}
            </span>
          </div>
        )}
        {error && (
          <div style={{ color: '#cc4444', fontSize: 9, marginTop: 5, textAlign: 'center' }}>
            {t('ops.live_claim_failed')}
          </div>
        )}
      </div>
    </div>
  );
}

function RewardChip({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      border: `1px solid ${color}44`, borderRadius: 3, padding: '7px 9px',
      color, background: `${color}0d`, lineHeight: 1.4,
    }}>
      {label}
    </div>
  );
}
