import React from 'react';
import type { PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

interface BuildingInspectPopupProps {
  building:      PlacedBuilding;
  screenX:       number;
  screenY:       number;
  isDemolishing: boolean;
  onClose:       () => void;
  onDemolish:    () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  infrastructure: 'Інфраструктура',
  energy:         'Енергетика',
  extraction:     'Видобуток',
  science:        'Наука',
  biosphere:      'Біосфера',
  chemistry:      'Хімія',
  premium:        'Преміум',
};

export default function BuildingInspectPopup({
  building,
  screenX,
  screenY,
  isDemolishing,
  onClose,
  onDemolish,
}: BuildingInspectPopupProps) {
  const def = BUILDING_DEFS[building.type];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position:    'fixed',
      left:        Math.max(8, screenX - 100),
      top:         Math.max(8, screenY - 148),
      width:       200,
      background:  'rgba(8,14,24,0.96)',
      border:      '1px solid #334455',
      borderRadius: 4,
      fontFamily:  'monospace',
      zIndex:      11500,
      boxShadow:   '0 4px 20px rgba(0,0,0,0.6)',
    },
    header: {
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '8px 10px 6px',
      borderBottom:   '1px solid #1e2d3d',
    },
    name: {
      color:    '#aabbcc',
      fontSize: 11,
      fontWeight: 'bold' as const,
      lineHeight: 1.2,
      flex: 1,
    },
    closeBtn: {
      background:  'none',
      border:      'none',
      color:       '#556677',
      cursor:      'pointer',
      fontSize:    14,
      lineHeight:  1,
      padding:     '0 0 0 6px',
      fontFamily:  'monospace',
    },
    body: {
      padding: '8px 10px',
    },
    meta: {
      color:        '#667788',
      fontSize:     10,
      marginBottom: 10,
    },
    status: {
      color:        '#cc4444',
      fontSize:     10,
      marginBottom: 8,
      fontStyle:    'italic' as const,
    },
    demolishBtn: {
      width:        '100%',
      padding:      '6px 0',
      background:   isDemolishing ? 'rgba(40,40,40,0.5)' : 'rgba(160,20,20,0.85)',
      border:       `1px solid ${isDemolishing ? '#334455' : '#ff3333'}`,
      borderRadius: 3,
      color:        isDemolishing ? '#445566' : '#ffcccc',
      fontFamily:   'monospace',
      fontSize:     11,
      cursor:       isDemolishing ? 'not-allowed' : 'pointer',
      textAlign:    'center' as const,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.name}>{def?.name ?? building.type}</div>
        <button style={styles.closeBtn} onClick={onClose}>×</button>
      </div>
      <div style={styles.body}>
        <div style={styles.meta}>
          {CATEGORY_LABEL[def?.category ?? ''] ?? def?.category}&nbsp;&nbsp;|&nbsp;&nbsp;
          Рівень {building.level}
        </div>
        {isDemolishing && (
          <div style={styles.status}>Демонтаж...</div>
        )}
        <button
          style={styles.demolishBtn}
          disabled={isDemolishing}
          onClick={isDemolishing ? undefined : onDemolish}
        >
          {isDemolishing ? 'Демонтаж...' : 'Зруйнувати'}
        </button>
      </div>
    </div>
  );
}
