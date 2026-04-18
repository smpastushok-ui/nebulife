import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ============================================================================
// QuarkToastQueue — singleton notification queue for quark accruals.
//
// Decoupled from React tree: any module can call enqueueQuarkToast({...}) and
// the singleton will flush them one-by-one through the visible toast renderer.
//
// Sources that should enqueue toasts:
//   - Starter wallet on first registration (+20⚛)
//   - Daily login bonus (+1⚛)
//   - Ad-rewarded videos (+5⚛)
//   - Quiz / Academy correct answer (+1⚛)
//   - Photo refund on Kling failure (+10⚛)
//   - IAP top-up (+500⚛, +2000⚛)
//   - Manual gifts / events (custom amount)
//
// Each toast: 3.2 s on screen, slides in from right of resource bar (top),
// queue is FIFO, max 1 at a time. If user dismisses (taps), next pops.
// ============================================================================

export type QuarkAccrualReason =
  | 'starter'
  | 'daily-login'
  | 'ad-reward'
  | 'quiz'
  | 'refund'
  | 'topup'
  | 'gift';

export interface QuarkToast {
  id: string;
  amount: number;          // positive = gain, negative = spend (rare; spends rarely toasted)
  reason: QuarkAccrualReason;
  // Optional override message (otherwise i18n key picked from reason)
  customLabel?: string;
}

type Listener = () => void;

let queue: QuarkToast[] = [];
const listeners = new Set<Listener>();

function notify() { for (const l of listeners) l(); }

/** Enqueue a quark toast. Safe to call from anywhere (no React context). */
export function enqueueQuarkToast(toast: Omit<QuarkToast, 'id'>): void {
  const id = `qt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  queue.push({ ...toast, id });
  notify();
}

/** Read-only access for the renderer. */
function getQueue(): QuarkToast[] { return queue; }

function dequeue(): void { queue = queue.slice(1); notify(); }

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/**
 * Renderer: shows the head of the queue for ~3.2s, then auto-dismisses
 * and advances. Tap to dismiss early. Mount once near the top of the app.
 */
export function QuarkToastRenderer() {
  const { t } = useTranslation();
  const [, force] = useState(0);
  const [visible, setVisible] = useState<QuarkToast | null>(null);

  // Subscribe to queue changes
  useEffect(() => subscribe(() => force(n => n + 1)), []);

  // Pull head into local 'visible' state when queue advances and nothing is showing
  useEffect(() => {
    if (visible) return;
    const head = getQueue()[0];
    if (!head) return;
    setVisible(head);
    const timer = setTimeout(() => {
      dequeue();
      setVisible(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [visible, getQueue().length]);

  if (!visible) return null;

  const reasonLabel = visible.customLabel ?? t(`quark_toast.${visible.reason}`, {
    defaultValue: visible.reason,
  });
  const sign = visible.amount >= 0 ? '+' : '';
  const color = visible.amount >= 0 ? '#7bb8ff' : '#ff8844';

  const handleDismiss = () => {
    dequeue();
    setVisible(null);
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        top: 'calc(56px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9750,
        background: 'rgba(8,14,28,0.95)',
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: '8px 16px',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#aabbcc',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 180,
        maxWidth: '90vw',
        boxShadow: `0 0 24px ${color}33`,
        animation: 'quark-toast-in 0.3s ease-out',
      }}
    >
      {/* Atom icon for quarks */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3">
        <circle cx="8" cy="8" r="2" />
        <ellipse cx="8" cy="8" rx="7" ry="3" />
        <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
        <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
      </svg>
      <span style={{ color, fontWeight: 'bold', fontSize: 13 }}>
        {sign}{visible.amount}⚛
      </span>
      <span style={{ color: '#8899aa' }}>{reasonLabel}</span>
      <style>{`
        @keyframes quark-toast-in {
          0%   { opacity: 0; transform: translate(-50%, -10px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
