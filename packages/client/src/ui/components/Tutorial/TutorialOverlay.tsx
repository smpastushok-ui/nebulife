import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TutorialStepConfig } from './tutorialSteps';

// ---------------------------------------------------------------------------
// TutorialOverlay — Spotlight + tooltip overlay for interactive tutorial
// ---------------------------------------------------------------------------
// Uses box-shadow approach: a fixed div with massive inset shadow creates
// a "hole" over the target element. Click interception checks coordinates.
// z-index: 10050 — above all panels (9500-10000) except AuthScreen.
// ---------------------------------------------------------------------------

const STYLE_ID = 'nebulife-tutorial-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tut-spotlight-pulse {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 2px rgba(68,102,136,0.4); }
      50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px rgba(68,136,170,0.7); }
    }
    @keyframes tut-tooltip-enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

interface TutorialOverlayProps {
  step: TutorialStepConfig;
  subStepIndex: number;
  onAdvance: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ step, subStepIndex, onAdvance, onSkip }: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const rafRef = useRef<number>(0);
  const prevTargetRef = useRef<string>('');

  // Determine current target and text based on sub-steps
  const currentTarget = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.target ?? step.target
    : step.target;

  const currentText = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.text ?? step.text
    : step.text;

  const currentTooltipPos = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.tooltipPos ?? step.tooltipPos
    : step.tooltipPos;

  const currentNextLabel = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.nextLabel
    : step.nextLabel;

  const isInfoStep = step.type === 'info';
  const isAutoStep = step.type === 'auto';

  useEffect(() => {
    ensureStyles();
  }, []);

  // Track transitions between targets
  useEffect(() => {
    if (currentTarget !== prevTargetRef.current) {
      setTransitioning(true);
      const t = setTimeout(() => setTransitioning(false), 300);
      prevTargetRef.current = currentTarget;
      return () => clearTimeout(t);
    }
  }, [currentTarget]);

  // Poll for target element position using rAF
  useEffect(() => {
    if (!currentTarget) {
      setTargetRect(null);
      return;
    }

    const poll = () => {
      const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentTarget]);

  // Handle click on overlay — check if within spotlight bounds
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (isInfoStep || isAutoStep) {
        // Info/auto steps: clicks on overlay do nothing (use button)
        e.stopPropagation();
        return;
      }

      if (!targetRect) return;

      const { clientX, clientY } = e;
      const pad = 6;
      const inBounds =
        clientX >= targetRect.left - pad &&
        clientX <= targetRect.right + pad &&
        clientY >= targetRect.top - pad &&
        clientY <= targetRect.bottom + pad;

      if (inBounds) {
        // Click the target element programmatically
        const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`) as HTMLElement | null;
        if (el) {
          el.click();
        }
        onAdvance();
      }
      // Otherwise swallow the click
      e.stopPropagation();
      e.preventDefault();
    },
    [targetRect, currentTarget, isInfoStep, isAutoStep, onAdvance],
  );

  // Tooltip positioning
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // No target — center tooltip on screen
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const gap = 14;
    const base: React.CSSProperties = { position: 'fixed' };

    switch (currentTooltipPos) {
      case 'bottom':
        base.top = targetRect.bottom + gap;
        base.left = targetRect.left + targetRect.width / 2;
        base.transform = 'translateX(-50%)';
        break;
      case 'top':
        base.bottom = window.innerHeight - targetRect.top + gap;
        base.left = targetRect.left + targetRect.width / 2;
        base.transform = 'translateX(-50%)';
        break;
      case 'left':
        base.top = targetRect.top + targetRect.height / 2;
        base.right = window.innerWidth - targetRect.left + gap;
        base.transform = 'translateY(-50%)';
        break;
      case 'right':
        base.top = targetRect.top + targetRect.height / 2;
        base.left = targetRect.right + gap;
        base.transform = 'translateY(-50%)';
        break;
    }

    return base;
  };

  // Spotlight style
  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
        borderRadius: 6,
        zIndex: 10050,
        pointerEvents: 'none',
        animation: 'tut-spotlight-pulse 2s ease-in-out infinite',
        transition: transitioning ? 'top 0.3s, left 0.3s, width 0.3s, height 0.3s' : undefined,
      }
    : {
        display: 'none',
      };

  return (
    <>
      {/* Full-screen click interceptor */}
      <div
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10050,
          cursor: targetRect && !isInfoStep && !isAutoStep ? 'pointer' : 'default',
        }}
      />

      {/* Dark overlay with spotlight hole */}
      {targetRect && (
        <div style={spotlightStyle} />
      )}

      {/* No-target dark backdrop (for info steps with no target) */}
      {!targetRect && currentTarget === '' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10049,
            background: 'rgba(0, 0, 0, 0.75)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          ...getTooltipStyle(),
          zIndex: 10051,
          maxWidth: 320,
          padding: '16px 20px',
          background: 'rgba(10, 15, 25, 0.96)',
          border: '1px solid #446688',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.7,
          color: '#aabbcc',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          animation: 'tut-tooltip-enter 0.35s ease-out',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div
          style={{
            fontSize: 9,
            color: '#556677',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Крок {step.id === 'terminal' ? 1 : parseInt(String(STEP_NUMBER_MAP[step.id] ?? 0)) + 1} / 13
        </div>

        {/* Text */}
        <div style={{ marginBottom: isInfoStep || isAutoStep ? 14 : 0 }}>
          {currentText}
        </div>

        {/* "Next" button for info steps */}
        {(isInfoStep || isAutoStep) && currentNextLabel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 0',
              background: 'rgba(68, 102, 136, 0.2)',
              border: '1px solid #446688',
              borderRadius: 3,
              color: '#aaccee',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68, 102, 136, 0.35)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(68, 102, 136, 0.2)';
            }}
          >
            {currentNextLabel}
          </button>
        )}

        {/* Click hint for click steps */}
        {step.type === 'click' && targetRect && (
          <div style={{ fontSize: 10, color: '#556677', marginTop: 8 }}>
            Натиснiть на видiлений елемент
          </div>
        )}
      </div>

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
        style={{
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 10052,
          background: 'none',
          border: '1px solid rgba(51, 68, 85, 0.3)',
          borderRadius: 3,
          color: '#445566',
          fontFamily: 'monospace',
          fontSize: 10,
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
          pointerEvents: 'auto',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color = '#778899';
          (e.target as HTMLElement).style.borderColor = '#556677';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color = '#445566';
          (e.target as HTMLElement).style.borderColor = 'rgba(51, 68, 85, 0.3)';
        }}
      >
        Пропустити туторiал
      </button>
    </>
  );
}

/** Map step id to its 0-based number for display */
const STEP_NUMBER_MAP: Record<string, number> = {
  'terminal': 0,
  'nav-planets': 1,
  'expand-star': 2,
  'add-fav': 3,
  'check-fav': 4,
  'go-systems': 5,
  'first-research': 6,
  'hud-info': 7,
  'free-task': 8,
  'anomaly': 9,
  'quantum': 10,
  'save-gallery': 11,
  'gallery-final': 12,
};
