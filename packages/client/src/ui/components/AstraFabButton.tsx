import React, { useEffect, useRef, useState } from 'react';

export const ASTRA_VIDEO_URL = '/astra/astra-video.mp4';
export const ASTRA_PORTRAIT_URL = '/astra/astra-portrait.jpg';

const STYLE_ID = 'astra-fab-styles';

function ensureFabStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes astra-fab-pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(123,184,255,0.35), 0 0 0 2px rgba(123,184,255,0.55); }
      50% { box-shadow: 0 0 18px rgba(123,184,255,0.65), 0 0 0 2px rgba(123,184,255,0.9); }
    }
  `;
  document.head.appendChild(style);
}

export function isVerticalSideChatLayout(width: number, height: number): boolean {
  return width >= 560 && height > width * 1.18;
}

/** Fixed position for the round ASTRA chat FAB (bottom-right on phone, mid-right on tall narrow). */
export function getAstraFabPosition(verticalSideLayout: boolean, size = 52): React.CSSProperties {
  const half = Math.round(size / 2);
  return {
    position: 'fixed',
    top: verticalSideLayout ? `calc(50% - ${half}px)` : undefined,
    bottom: verticalSideLayout ? undefined : 'calc(62px + env(safe-area-inset-bottom, 0px))',
    right: verticalSideLayout ? 'calc(8px + env(safe-area-inset-right, 0px))' : 'calc(16px + env(safe-area-inset-right, 0px))',
  };
}

interface AstraFabButtonProps {
  onClick: () => void;
  title: string;
  /** data-tutorial-id for tutorial spotlight targeting */
  tutorialId?: string;
  unreadCount?: number;
  size?: number;
  zIndex?: number;
  style?: React.CSSProperties;
  /** Subtle border glow when there are unread messages */
  pulse?: boolean;
}

export function AstraFabButton({
  onClick,
  title,
  tutorialId,
  unreadCount = 0,
  size = 52,
  zIndex = 9700,
  style,
  pulse = false,
}: AstraFabButtonProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    ensureFabStyles();
    injected.current = true;
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      data-tutorial-id={tutorialId}
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        zIndex,
        width: size,
        height: size,
        boxSizing: 'border-box',
        borderRadius: '50%',
        background: 'rgba(5, 10, 20, 0.94)',
        border: hasUnread
          ? '2px solid rgba(123, 184, 255, 0.85)'
          : '2px solid rgba(68, 102, 136, 0.55)',
        boxShadow: hasUnread
          ? '0 0 12px rgba(123, 184, 255, 0.45)'
          : '0 2px 10px rgba(0, 0, 0, 0.28)',
        cursor: 'pointer',
        padding: 0,
        overflow: 'visible',
        position: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(pulse && hasUnread ? { animation: 'astra-fab-pulse 2s ease-in-out infinite' } : {}),
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {videoFailed ? (
          <img
            src={ASTRA_PORTRAIT_URL}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '50% 16%',
              display: 'block',
              filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
            }}
          />
        ) : (
          <video
            ref={(el) => {
              if (el) {
                el.muted = true;
                el.volume = 0;
              }
            }}
            src={ASTRA_VIDEO_URL}
            poster={ASTRA_PORTRAIT_URL}
            aria-hidden="true"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '50% 16%',
              display: 'block',
              filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
            }}
          />
        )}
      </span>

      {hasUnread && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -2,
            left: -2,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#7bb8ff',
            color: '#020510',
            fontSize: 9,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            borderRadius: 999,
            border: '2px solid rgba(5, 10, 20, 0.95)',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
