import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { playSfx } from '../../audio/SfxPlayer.js';

// CSS keyframes injected once on mount — shared by every dial instance.
// `neon-pulse` does the outer glow ring, `fill-blink` softly modulates the
// fill opacity while research is active.
const STYLE_ID = 'nebulife-system-research-dial-styles';
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes nebu-research-dial-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(68,136,255,0.55), 0 0 18px 4px rgba(68,136,255,0.35); }
      50%      { box-shadow: 0 0 0 6px rgba(68,136,255,0),    0 0 28px 10px rgba(68,136,255,0.55); }
    }
    @keyframes nebu-research-dial-fill {
      0%, 100% { opacity: 0.85; }
      50%      { opacity: 1; }
    }
    @keyframes nebu-research-dial-lupe {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50%      { opacity: 1;    transform: scale(1.05); }
    }
  `;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// SystemResearchOverlay — blur overlay for unresearched star systems
// ---------------------------------------------------------------------------
// Shows a CSS backdrop-filter blur + "Досліджено X%" label.
// Blocks all planet interactions underneath via pointerEvents: 'auto'.
// Rendered above PixiJS canvas (z=15), below SystemNavHeader (z=40)
// and CommandBar (z=50+) so navigation remains functional.
// ---------------------------------------------------------------------------

interface SystemResearchOverlayProps {
  /** Research progress 0-100 */
  progress: number;
  /** Whether player can start a new research on this system */
  canResearch?: boolean;
  /** Whether this system currently has an active research slot */
  isResearching?: boolean;
  /** Callback to start research on this system */
  onStartResearch?: () => void;
  /** Callback fired when the button is clicked while disabled (e.g. show toast) */
  onDisabledClick?: () => void;
}

export function SystemResearchOverlay({
  progress,
  canResearch = false,
  isResearching = false,
  onStartResearch,
  onDisabledClick,
}: SystemResearchOverlayProps) {
  const { t } = useTranslation();

  // Inject the keyframes on first render — idempotent, cheap.
  useEffect(() => { ensureStyles(); }, []);

  if (progress >= 100) return null;

  // 0% -> 25px blur, 90% -> 3px, 100% -> 0px
  const blurPx = Math.round((1 - progress / 100) * 25);
  // Semi-transparent dark overlay: 0% -> 0.5, 100% -> 0
  const overlayOpacity = (1 - progress / 100) * 0.5;

  // Dial geometry — single source of truth for all three states.
  // Same outer dimension whether idle / researching / completed so the
  // visual element stays anchored when state transitions occur.
  const DIAL_SIZE = 84;
  const fillHeightPct = Math.max(0, Math.min(100, progress));
  const interactive = canResearch || isResearching;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 15,
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
        backgroundColor: `rgba(2, 5, 16, ${overlayOpacity})`,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* Research progress label — kept above the dial so the player can
          read both numeric and visual progress at a glance. */}
      <div
        style={{
          color: '#667788',
          fontSize: 14,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 18,
        }}
      >
        {t('research.overlay_progress', { pct: Math.round(progress) })}
      </div>

      {/* Research dial — single circular element used for all three states.
          - idle:        magnifier in centre, faint outline ring (no fill, no glow)
          - researching: same magnifier + neon outer pulse + bottom-up fill
                         based on progress, with a slow blink on the fill itself
          - (complete state never renders because parent gates progress<100) */}
      <button
        onClick={() => {
          if (canResearch) {
            playSfx('research-system-start', 0.25);
            onStartResearch?.();
          } else if (!canResearch && !isResearching) {
            onDisabledClick?.();
          }
        }}
        aria-disabled={!interactive}
        aria-label={
          canResearch
            ? (t('research.overlay_start_btn') as string)
            : isResearching
              ? (t('research.overlay_in_progress') as string)
            : (t('research.overlay_start_btn') as string)
        }
        title={
          canResearch
            ? (t('research.overlay_start_btn') as string)
            : isResearching
              ? (t('research.overlay_in_progress') as string)
            : (t('research.overlay_start_btn') as string)
        }
        style={{
          position: 'relative',
          width: DIAL_SIZE,
          height: DIAL_SIZE,
          borderRadius: '50%',
          background: 'rgba(2, 5, 16, 0.85)',
          border: `2px solid ${isResearching ? '#7bb8ff' : canResearch ? '#446688' : '#334455'}`,
          padding: 0,
          overflow: 'hidden',
          cursor: canResearch ? 'pointer' : isResearching ? 'default' : 'not-allowed',
          // Outer neon ring pulse only while research is in progress.
          animation: isResearching ? 'nebu-research-dial-glow 2.2s ease-in-out infinite' : undefined,
          transition: 'border-color 0.2s',
        }}
      >
        {/* Bottom-up fill — height tracks live progress. Same colour as the
            "completed" SystemsList icon (#4488ff) so the player intuitively
            associates a full dial here with the green-checkmark state there.
            Soft blink animation while researching. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${fillHeightPct}%`,
            background: 'linear-gradient(180deg, rgba(68,136,255,0.55) 0%, rgba(68,136,255,0.95) 100%)',
            transition: 'height 0.6s ease',
            animation: isResearching ? 'nebu-research-dial-fill 2.2s ease-in-out infinite' : undefined,
            pointerEvents: 'none',
          }}
        />

        {/* Magnifier in centre — sized for the 84-px dial. The icon stroke
            stays white over the blue fill so contrast holds at 100%. */}
        <svg
          width={32}
          height={32}
          viewBox="0 0 16 16"
          fill="none"
          stroke="#cfe6ff"
          strokeWidth={1.6}
          strokeLinecap="round"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            animation: isResearching ? 'nebu-research-dial-lupe 2.2s ease-in-out infinite' : undefined,
            pointerEvents: 'none',
          }}
        >
          <circle cx="7" cy="7" r="4.2" />
          <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
        </svg>
      </button>

      {/* Status caption below the dial — short, never blocks layout. */}
      <div
        style={{
          marginTop: 14,
          color: isResearching ? '#7bb8ff' : canResearch ? '#aabbcc' : '#445566',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: isResearching ? 0.85 : 1,
        }}
      >
        {isResearching
          ? (canResearch ? t('research.overlay_start_btn') : t('research.overlay_in_progress'))
          : canResearch
            ? t('research.overlay_start_btn')
            : t('research.panel_insufficient_data')}
      </div>
    </div>
  );
}
