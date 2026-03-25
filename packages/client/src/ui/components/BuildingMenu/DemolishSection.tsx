import React from 'react';
import { C, actionBtn } from './building-menu-styles.js';

interface Props {
  isHQ: boolean;
  isDemolishing: boolean;
  onDemolish: () => void;
}

export default function DemolishSection({ isHQ, isDemolishing, onDemolish }: Props) {
  if (isHQ) {
    return (
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${C.borderSubtle}`,
        textAlign: 'center',
      }}>
        <span style={{ color: C.textMuted, fontSize: 10 }}>
          Неможливо зруйнувати центр колонії
        </span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '10px 12px',
      borderTop: `1px solid ${C.borderSubtle}`,
    }}>
      <button
        onClick={isDemolishing ? undefined : onDemolish}
        disabled={isDemolishing}
        style={{
          ...actionBtn,
          background: isDemolishing ? 'rgba(40,40,40,0.5)' : C.redBg,
          border: `1px solid ${isDemolishing ? C.border : C.redBorder}`,
          color: isDemolishing ? C.textMuted : '#ffcccc',
          cursor: isDemolishing ? 'not-allowed' : 'pointer',
        }}
      >
        {isDemolishing ? 'Демонтаж...' : 'Зруйнувати'}
      </button>
    </div>
  );
}
