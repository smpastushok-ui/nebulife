import React from 'react';
import type { StarSystem, SystemResearchState } from '@nebulife/core';

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)', zIndex: 100, pointerEvents: 'auto',
};

const modalStyle: React.CSSProperties = {
  width: 340, background: 'rgba(10,15,25,0.96)', border: '1px solid #44ff88',
  borderRadius: 6, padding: 24, fontFamily: 'monospace', color: '#ccddee',
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: 18, color: '#44ff88', marginBottom: 16,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '4px 0',
  borderBottom: '1px solid rgba(50,60,70,0.3)', fontSize: 12,
  color: '#aabbcc',
};

const btnStyle: React.CSSProperties = {
  marginTop: 20, padding: '10px 24px', cursor: 'pointer',
  background: 'rgba(30,80,50,0.6)', border: '1px solid #44ff88',
  color: '#44ff88', fontFamily: 'monospace', fontSize: 14, borderRadius: 4,
};

export function ResearchCompleteModal({
  system,
  research,
  onViewSystem,
  onClose,
}: {
  system: StarSystem;
  research: SystemResearchState;
  onViewSystem: () => void;
  onClose: () => void;
}) {
  const obs = research.observation;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={titleStyle}>Дослідження завершено!</div>
        <div style={{ fontSize: 16, color: '#eeffee', marginBottom: 16 }}>{system.name}</div>

        <div style={rowStyle}>
          <span>Тип зірки</span>
          <span style={{ color: system.star.colorHex }}>{system.star.spectralClass}{system.star.subType}V</span>
        </div>
        <div style={rowStyle}>
          <span>Планет</span>
          <span>{system.planets.length}</span>
        </div>
        {obs.habitability?.exact !== undefined && (
          <div style={rowStyle}>
            <span>Придатність</span>
            <span style={{ color: obs.habitability.exact > 0.5 ? '#44ff88' : '#ff8844' }}>
              {(obs.habitability.exact * 100).toFixed(0)}%
            </span>
          </div>
        )}
        {obs.waterCoverage?.exact !== undefined && (
          <div style={rowStyle}>
            <span>Вода</span>
            <span>{(obs.waterCoverage.exact * 100).toFixed(0)}%</span>
          </div>
        )}
        {obs.temperature?.exact !== undefined && (
          <div style={rowStyle}>
            <span>Температура</span>
            <span>{obs.temperature.exact.toFixed(0)} K</span>
          </div>
        )}

        <button style={btnStyle} onClick={onViewSystem}>
          Оглянути систему &rarr;
        </button>
      </div>
    </div>
  );
}
