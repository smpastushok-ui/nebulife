/**
 * ResearchToast — slide-in notification when a research technology completes.
 *
 * Slides in from the right edge, hangs for 4 s, then slides out.
 * Coloured left border by research branch.
 * Click navigates to the Research Terminal on that branch.
 *
 * Multiple toasts stack vertically.
 */

import React, { useEffect, useRef, useState } from 'react';

export interface ResearchToastItem {
  id:       string;
  techName: string;
  branch:   'biology' | 'physics' | 'astronomy' | 'chemistry';
}

interface ResearchToastProps {
  items:      ResearchToastItem[];
  onDismiss:  (id: string) => void;
  onNavigate: (branch: ResearchToastItem['branch']) => void;
}

const BRANCH_COLOR: Record<ResearchToastItem['branch'], string> = {
  biology:   '#44ff88',
  physics:   '#ff8844',
  astronomy: '#4488aa',
  chemistry: '#8844ff',
};

const BRANCH_LABEL: Record<ResearchToastItem['branch'], string> = {
  biology:   'БІО',
  physics:   'ФІЗ',
  astronomy: 'АСТ',
  chemistry: 'ХІМ',
};

const STYLE_ID = 'nebu-toast-styles';
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
@keyframes nebu-toast-in {
  from { transform: translateX(320px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes nebu-toast-out {
  from { transform: translateX(0);     opacity: 1; }
  to   { transform: translateX(320px); opacity: 0; }
}
  `;
  document.head.appendChild(s);
}

/** Single toast item with auto-dismiss timer. */
const ToastItem: React.FC<{
  item:       ResearchToastItem;
  onDismiss:  (id: string) => void;
  onNavigate: (branch: ResearchToastItem['branch']) => void;
}> = ({ item, onDismiss, onNavigate }) => {
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    injectStyles();
    timerRef.current = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(item.id), 300);
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, onDismiss]);

  const color = BRANCH_COLOR[item.branch];

  return (
    <div
      onClick={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        onNavigate(item.branch);
        onDismiss(item.id);
      }}
      style={{
        width:       278,
        padding:     '9px 12px 9px 14px',
        background:  'rgba(8,12,20,0.96)',
        border:      '1px solid #283848',
        borderLeft:  `3px solid ${color}`,
        borderRadius: 4,
        cursor:      'pointer',
        userSelect:  'none',
        animation:   leaving
          ? 'nebu-toast-out 0.28s ease-in forwards'
          : 'nebu-toast-in  0.28s cubic-bezier(.22,.68,0,1.35) forwards',
        boxShadow:   `0 0 16px rgba(0,0,0,0.5), inset 3px 0 12px ${color}18`,
      }}
    >
      {/* Header row */}
      <div
        style={{
          fontFamily:    'monospace',
          fontSize:      9,
          color:         color,
          letterSpacing: 2,
          marginBottom:  5,
          textTransform: 'uppercase',
        }}
      >
        [ {BRANCH_LABEL[item.branch]} ] НАУКА
      </div>

      {/* Tech name */}
      <div
        style={{
          fontFamily:    'monospace',
          fontSize:      11,
          color:         '#8899aa',
          lineHeight:    1.4,
        }}
      >
        Технологію інтегровано:
      </div>
      <div
        style={{
          fontFamily:    'monospace',
          fontSize:      12,
          color:         '#aabbcc',
          marginTop:     2,
        }}
      >
        &gt; {item.techName}
      </div>
    </div>
  );
};

export const ResearchToast: React.FC<ResearchToastProps> = ({
  items,
  onDismiss,
  onNavigate,
}) => {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        position:      'fixed',
        right:         14,
        top:           60,   // below ResourceWidget (~46px) + gap
        zIndex:        500,
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
        pointerEvents: 'all',
      }}
    >
      {items.map((item) => (
        <ToastItem
          key={item.id}
          item={item}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
};
