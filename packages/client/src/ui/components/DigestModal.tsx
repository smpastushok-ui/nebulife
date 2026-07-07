import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DigestModalProps {
  images: string[];
  weekDate: string;
  onClose: () => void;
}

type ImageStatus = 'loading' | 'loaded' | 'error';

const SPIN_STYLE_ID = 'digest-modal-keyframes';
const SPIN_KEYFRAMES = `
@keyframes digest-modal-spin { to { transform: rotate(360deg); } }
`;

function ensureDigestSpinKeyframes() {
  if (document.getElementById(SPIN_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SPIN_STYLE_ID;
  style.textContent = SPIN_KEYFRAMES;
  document.head.appendChild(style);
}

function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid #334455',
        borderTopColor: '#7bb8ff',
        animation: 'digest-modal-spin 0.9s linear infinite',
      }}
    />
  );
}

/**
 * Fullscreen placeholder shown while the digest itself is being fetched
 * (before we even know how many pages/images it has). Covers the gap
 * between the user tapping "Open digest" and the modal actually mounting.
 */
export function DigestLoadingOverlay() {
  const { t } = useTranslation();
  useEffect(() => { ensureDigestSpinKeyframes(); }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(2,5,16,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={34} />
        <span style={{ color: '#8899aa', fontSize: 11, letterSpacing: '0.05em' }}>
          {t('digest.opening')}
        </span>
      </div>
    </div>
  );
}

export function DigestModal({ images, weekDate, onClose }: DigestModalProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, ImageStatus>>({});
  const [retryTick, setRetryTick] = useState<Record<number, number>>({});

  useEffect(() => { ensureDigestSpinKeyframes(); }, []);

  const markLoaded = (i: number) => setStatuses((s) => (s[i] === 'loaded' ? s : { ...s, [i]: 'loaded' }));
  const markError = (i: number) => setStatuses((s) => ({ ...s, [i]: 'error' }));

  if (images.length === 0) return null;

  const currentStatus: ImageStatus = statuses[page] ?? 'loading';
  const isBusy = currentStatus === 'loading';

  const goTo = (i: number) => { if (!isBusy) setPage(i); };
  const prev = () => goTo(page > 0 ? page - 1 : images.length - 1);
  const next = () => goTo(page < images.length - 1 ? page + 1 : 0);
  const retry = () => {
    setStatuses((s) => ({ ...s, [page]: 'loading' }));
    setRetryTick((r) => ({ ...r, [page]: (r[page] ?? 0) + 1 }));
  };

  const navButtonStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    background: 'rgba(2,5,16,0.8)',
    border: '1px solid #334455',
    borderRadius: 3,
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 16,
    padding: '8px 10px',
    cursor: isBusy ? 'not-allowed' : 'pointer',
    opacity: isBusy ? 0.4 : 1,
    transition: 'opacity 0.15s ease',
    ...extra,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(2,5,16,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '18px 12px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(100%, 400px)',
          maxHeight: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'space-between' }}>
          <span style={{ color: '#44ffaa', fontSize: 11, letterSpacing: '0.1em' }}>
            NEBULIFE WEEKLY
          </span>
          <span style={{ color: '#556677', fontSize: 9 }}>{weekDate}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #334455',
              borderRadius: 3,
              color: '#667788',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </div>

        {/* Image */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* All pages are mounted (hidden except current) so the browser preloads
              them in the background — switching pages is instant once loaded. */}
          {images.map((src, i) => (
            <img
              key={`${i}-${retryTick[i] ?? 0}`}
              src={src}
              alt={`Digest page ${i + 1}`}
              onLoad={() => markLoaded(i)}
              onError={() => markError(i)}
              style={i === page ? {
                width: '100%',
                aspectRatio: '9 / 16',
                objectFit: 'cover',
                display: statuses[i] === 'error' ? 'none' : 'block',
                borderRadius: 4,
                border: '1px solid #223344',
                background: 'rgba(10,15,25,0.6)',
                opacity: statuses[i] === 'loaded' ? 1 : 0,
                transition: 'opacity 0.18s ease',
              } : {
                position: 'absolute',
                width: 0,
                height: 0,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Loading / error overlay for the current page */}
          {currentStatus !== 'loaded' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                border: '1px solid #223344',
                borderRadius: 4,
                background: 'rgba(6,12,22,0.65)',
                pointerEvents: currentStatus === 'error' ? 'auto' : 'none',
              }}
            >
              {currentStatus === 'loading' ? (
                <>
                  <Spinner />
                  <span style={{ color: '#8899aa', fontSize: 10, letterSpacing: '0.05em' }}>
                    {t('digest.loading_page')}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#cc4444', fontSize: 10, letterSpacing: '0.05em' }}>
                    {t('digest.image_error')}
                  </span>
                  <button
                    onClick={retry}
                    style={{
                      background: 'none',
                      border: '1px solid #334455',
                      borderRadius: 3,
                      color: '#7bb8ff',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('digest.retry')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                disabled={isBusy}
                aria-busy={isBusy}
                style={navButtonStyle({ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' })}
              >
                {'<'}
              </button>
              <button
                onClick={next}
                disabled={isBusy}
                aria-busy={isBusy}
                style={navButtonStyle({ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' })}
              >
                {'>'}
              </button>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                disabled={isBusy}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: 'none',
                  background: i === page ? '#44ffaa' : '#334455',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  opacity: isBusy ? 0.5 : 1,
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
