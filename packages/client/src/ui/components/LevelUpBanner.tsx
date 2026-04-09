/**
 * LevelUpBanner — cyberpunk-style level-up overlay.
 *
 * Triggered when `level` prop is non-null.
 * Plays slide-in + glitch animation, then auto-hides after 3.2s.
 * Edge radial glow simulates a screen "power surge".
 *
 * No blur filters (per CLAUDE.md). Glow is CSS box-shadow + radial-gradient.
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../audio/SfxPlayer.js';

interface LevelUpBannerProps {
  level:  number | null;
  onDone: () => void;
}

// Injected once into <head>
const STYLE_ID = 'nebu-levelup-styles';
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
@keyframes nebu-banner-in {
  from { transform: translateY(-40px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
@keyframes nebu-banner-out {
  from { transform: translateY(0);      opacity: 1; }
  to   { transform: translateY(-20px);  opacity: 0; }
}
@keyframes nebu-glitch {
  0%,100% { clip-path: none; transform: translateX(0); }
  10%      { clip-path: inset(40% 0 50% 0); transform: translateX(-3px); }
  20%      { clip-path: inset(70% 0 20% 0); transform: translateX( 3px); }
  30%      { clip-path: none; transform: translateX(0); }
  60%      { clip-path: inset(15% 0 75% 0); transform: translateX(-2px); }
  70%      { clip-path: none; transform: translateX(0); }
}
@keyframes nebu-edge-pulse {
  0%   { opacity: 0; }
  25%  { opacity: 0.5; }
  60%  { opacity: 0.3; }
  100% { opacity: 0; }
}
@keyframes nebu-scan-line {
  from { top: -4px; }
  to   { top: 100%; }
}
  `;
  document.head.appendChild(s);
}

export const LevelUpBanner: React.FC<LevelUpBannerProps> = ({ level, onDone }) => {
  const { t } = useTranslation();
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  // Use a ref for onDone to avoid resetting the timer on every re-render.
  // Only the `level` change should restart the 3-second countdown.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    if (level === null) return;
    playSfx('level-up', 0.5);
    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDoneRef.current();
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [level]); // Only reset when level changes, NOT when onDone reference changes

  if (level === null) return null;

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         10000,
        pointerEvents:  'none',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: 'rgba(2,5,16,0.68)',
          animation:  'nebu-edge-pulse 3s ease-out forwards',
        }}
      />

      {/* Edge glow (radial gradients at corners) */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: [
            'radial-gradient(ellipse 60% 35% at 0% 0%,   rgba(68,255,136,0.18) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 35% at 100% 0%,  rgba(68,255,136,0.18) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 35% at 0% 100%,  rgba(68,136,255,0.14) 0%, transparent 70%)',
            'radial-gradient(ellipse 60% 35% at 100% 100%,rgba(68,136,255,0.14) 0%, transparent 70%)',
          ].join(', '),
          animation:    'nebu-edge-pulse 3s ease-out forwards',
        }}
      />

      {/* Banner card */}
      <div
        ref={bannerRef}
        style={{
          position:       'relative',
          width:          480,
          padding:        '28px 36px 24px',
          background:     'rgba(6,10,20,0.97)',
          border:         '1px solid #335566',
          borderTop:      '2px solid #44ff88',
          borderRadius:   4,
          boxShadow:      '0 0 40px rgba(68,255,136,0.18), inset 0 0 20px rgba(68,136,170,0.06)',
          textAlign:      'center',
          animation:      'nebu-banner-in 0.28s cubic-bezier(.22,.68,0,1.4) forwards',
          overflow:       'hidden',
        }}
      >
        {/* Animated scan line */}
        <div
          style={{
            position:   'absolute',
            left:       0,
            right:      0,
            height:     2,
            background: 'linear-gradient(90deg, transparent, rgba(68,255,136,0.6), transparent)',
            animation:  'nebu-scan-line 2.4s linear forwards',
            zIndex:     1,
          }}
        />

        {/* Top label */}
        <p
          style={{
            margin:        '0 0 10px',
            fontFamily:    'monospace',
            fontSize:      11,
            letterSpacing: 4,
            color:         '#44ff88',
            textTransform: 'uppercase',
          }}
        >
          {t('player.level_up_system_update')}
        </p>

        {/* Main level text with glitch */}
        <p
          style={{
            margin:        '0 0 12px',
            fontFamily:    'monospace',
            fontSize:      26,
            fontWeight:    700,
            letterSpacing: 6,
            color:         '#ffffff',
            textShadow:    '0 0 18px rgba(68,255,136,0.5)',
            animation:     'nebu-glitch 0.7s steps(1) 0.3s 3',
            position:      'relative',
            zIndex:        2,
          }}
        >
          {t('player.level_up_reached', { level })}
        </p>

        {/* Sub-text */}
        <p
          style={{
            margin:     0,
            fontFamily: 'monospace',
            fontSize:   10,
            color:      '#667788',
            letterSpacing: 1,
          }}
        >
          {t('player.level_up_nodes_unlocked')}
        </p>
      </div>
    </div>
  );
};
