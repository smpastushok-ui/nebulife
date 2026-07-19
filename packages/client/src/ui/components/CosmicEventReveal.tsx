import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CosmicEventRevealItem {
  key: string;
  titleUk: string;
  titleEn: string;
  photoUrl?: string | null;
  videoUrl?: string | null;
}

export type CosmicEventMedia =
  | { kind: 'video'; url: string; poster?: string }
  | { kind: 'photo'; url: string }
  | { kind: 'none' };

const listeners = new Set<() => void>();
const queued: CosmicEventRevealItem[] = [];
const seen = new Set<string>();
let active: CosmicEventRevealItem | null = null;

export function isSafeMediaUrl(value: string | null | undefined, origin?: string): value is string {
  if (!value) return false;
  try {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://nebulife.space');
    const url = new URL(value, base);
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === base);
  } catch {
    return false;
  }
}

export function resolveCosmicEventMedia(item: Pick<CosmicEventRevealItem, 'photoUrl' | 'videoUrl'>): CosmicEventMedia {
  if (isSafeMediaUrl(item.videoUrl)) {
    return {
      kind: 'video',
      url: item.videoUrl,
      ...(isSafeMediaUrl(item.photoUrl) ? { poster: item.photoUrl } : {}),
    };
  }
  if (isSafeMediaUrl(item.photoUrl)) return { kind: 'photo', url: item.photoUrl };
  return { kind: 'none' };
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function enqueueCosmicEventReveal(item: CosmicEventRevealItem, options?: { replay?: boolean }): boolean {
  if (!item.key || (!options?.replay && seen.has(item.key))) return false;
  if (active?.key === item.key || queued.some((entry) => entry.key === item.key)) return false;
  if (!options?.replay) seen.add(item.key);
  queued.push(item);
  if (!active) active = queued.shift() ?? null;
  notify();
  return true;
}

export function dismissCosmicEventReveal(): void {
  active = queued.shift() ?? null;
  notify();
}

export function resetCosmicEventRevealQueueForTests(): void {
  queued.length = 0;
  seen.clear();
  active = null;
  notify();
}

export function getCosmicEventRevealQueueState(): { active: CosmicEventRevealItem | null; queued: number } {
  return { active, queued: queued.length };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function CosmicEventRevealHost() {
  const { t, i18n } = useTranslation();
  const [, rerender] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const item = active;
  const media = item ? resolveCosmicEventMedia(item) : { kind: 'none' as const };

  useEffect(() => subscribe(() => rerender((value) => value + 1)), []);

  useEffect(() => {
    if (!item) return;
    setMediaError(false);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissCosmicEventReveal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      previous?.focus();
    };
  }, [item?.key]);

  if (!item) return null;
  const title = i18n.language?.startsWith('uk') ? item.titleUk : item.titleEn;

  return (
    <div
      role="presentation"
      onClick={dismissCosmicEventReveal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 13000,
        background: 'rgba(2,5,16,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px))',
        fontFamily: 'monospace',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cosmic-event-reveal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          background: 'rgba(10,15,25,0.98)',
          border: '1px solid #4488aa',
          borderRadius: 6,
          boxShadow: '0 0 36px rgba(68,136,170,0.28)',
          padding: 12,
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ color: '#44ff88', fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase' }}>
              {t('events.reveal_received')}
            </div>
            <div id="cosmic-event-reveal-title" style={{ color: '#ccddee', fontSize: 15, lineHeight: 1.35, marginTop: 4 }}>
              {title}
            </div>
          </div>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={dismissCosmicEventReveal}
            style={{
              background: 'none',
              border: '1px solid #334455',
              borderRadius: 3,
              color: '#8899aa',
              fontFamily: 'monospace',
              padding: '5px 9px',
              cursor: 'pointer',
            }}
          >
            {t('common.close')}
          </button>
        </div>

        {!mediaError && media.kind === 'video' && (
          <video
            ref={videoRef}
            src={media.url}
            poster={media.poster}
            controls
            muted
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
            style={{ display: 'block', width: '100%', maxHeight: '68dvh', background: '#020510', borderRadius: 4 }}
          />
        )}
        {!mediaError && media.kind === 'photo' && (
          <img
            src={media.url}
            alt={title}
            onError={() => setMediaError(true)}
            style={{ display: 'block', width: '100%', maxHeight: '68dvh', objectFit: 'contain', background: '#020510', borderRadius: 4 }}
          />
        )}
        {(media.kind === 'none' || mediaError) && (
          <div
            role="status"
            style={{
              minHeight: 150,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              color: '#8899aa',
              border: '1px solid #334455',
              borderRadius: 4,
              padding: 18,
            }}
          >
            {mediaError ? t('events.reveal_media_error') : t('events.reveal_no_media')}
          </div>
        )}
        {media.kind === 'video' && !mediaError && (
          <div style={{ color: '#667788', fontSize: 9, lineHeight: 1.45, marginTop: 8 }}>
            {t('events.reveal_video_hint')}
          </div>
        )}
      </div>
    </div>
  );
}
