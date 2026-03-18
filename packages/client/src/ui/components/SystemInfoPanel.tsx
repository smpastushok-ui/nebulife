import React, { useState } from 'react';
import type { StarSystem } from '@nebulife/core';

const panelStyle: React.CSSProperties = {
  position: 'absolute', right: 16, top: 48, width: 280,
  background: 'rgba(10,15,25,0.92)', border: '1px solid #334455',
  borderRadius: 4, padding: 16, fontFamily: 'monospace', color: '#aabbcc',
  fontSize: 11, pointerEvents: 'auto',
};

const headerStyle: React.CSSProperties = {
  fontSize: 14, color: '#ccddee', marginBottom: 12, display: 'flex',
  justifyContent: 'space-between', alignItems: 'center',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '3px 0',
  borderBottom: '1px solid rgba(50,60,70,0.3)',
};

const btnStyle: React.CSSProperties = {
  width: '100%', marginTop: 12, padding: '8px 0', cursor: 'pointer',
  background: 'rgba(30,60,80,0.6)', border: '1px solid #446688',
  color: '#aaccee', fontFamily: 'monospace', fontSize: 12, borderRadius: 3,
};

const closeBtnStyle: React.CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none',
  color: '#667788', fontSize: 16, fontFamily: 'monospace',
};

const renameBtnStyle: React.CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none',
  color: '#4488aa', fontSize: 10, fontFamily: 'monospace', marginLeft: 6,
  padding: '0 4px',
};

const renameInputStyle: React.CSSProperties = {
  background: 'rgba(5,10,20,0.8)', border: '1px solid #446688',
  color: '#ccddee', fontFamily: 'monospace', fontSize: 13,
  padding: '3px 6px', borderRadius: 3, width: '100%',
  outline: 'none',
};

export function SystemInfoPanel({ system, onEnterSystem, onClose, displayName, onRename }: {
  system: StarSystem;
  onEnterSystem: () => void;
  onClose: () => void;
  displayName?: string;
  onRename?: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName ?? system.name);

  const star = system.star;
  const habitablePlanets = system.planets.filter(p => p.zone === 'habitable');
  const lifeCount = system.planets.filter(p => p.hasLife).length;
  const name = displayName ?? system.name;

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== system.name && onRename) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        {editing ? (
          <input
            style={renameInputStyle}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={handleSave}
            maxLength={50}
            autoFocus
          />
        ) : (
          <span>
            {name}
            {name !== system.name && (
              <span style={{ color: '#556677', fontSize: 9, marginLeft: 4 }}>({system.name})</span>
            )}
            {onRename && (
              <button style={renameBtnStyle} onClick={() => { setEditValue(name); setEditing(true); }}>
                [rename]
              </button>
            )}
          </span>
        )}
        <button style={closeBtnStyle} onClick={onClose}>&times;</button>
      </div>

      <div style={{ marginBottom: 8, color: '#778899', fontSize: 10 }}>ЗІРКА</div>
      <div style={rowStyle}><span>Клас</span><span style={{ color: star.colorHex }}>{star.spectralClass}{star.subType}V</span></div>
      <div style={rowStyle}><span>Температура</span><span>{star.temperatureK} K</span></div>
      <div style={rowStyle}><span>Маса</span><span>{star.massSolar} M&#x2609;</span></div>
      <div style={rowStyle}><span>Світність</span><span>{star.luminositySolar} L&#x2609;</span></div>
      <div style={rowStyle}><span>Вік</span><span>{star.ageGyr} Gyr</span></div>

      <div style={{ marginTop: 12, marginBottom: 8, color: '#778899', fontSize: 10 }}>СИСТЕМА</div>
      <div style={rowStyle}><span>Планет</span><span>{system.planets.length}</span></div>
      <div style={rowStyle}><span>Зона придатності</span><span>{habitablePlanets.length} {habitablePlanets.length === 1 ? 'планета' : habitablePlanets.length < 5 ? 'планети' : 'планет'}</span></div>
      <div style={rowStyle}>
        <span>Виявлене життя</span>
        <span style={{ color: lifeCount > 0 ? '#44ff88' : '#667788' }}>
          {lifeCount > 0 ? `${lifeCount} ${lifeCount === 1 ? 'планета' : lifeCount < 5 ? 'планети' : 'планет'}` : 'Немає'}
        </span>
      </div>
      <div style={rowStyle}><span>Кільце</span><span>{system.ringIndex}</span></div>

      <button style={btnStyle} onClick={onEnterSystem}>
        Увійти до системи &rarr;
      </button>
    </div>
  );
}
