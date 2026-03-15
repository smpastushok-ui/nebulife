import React, { useState, useEffect } from 'react';
import type { StarSystem, SystemResearchState } from '@nebulife/core';

// ---------------------------------------------------------------------------
// ResearchCompleteModal — Foreground popup when research finishes
// ---------------------------------------------------------------------------
// Animated entrance/exit so sequential popups are distinguishable.
// Uses the same z-index layer as DiscoveryChoicePanel (9700+).
// ---------------------------------------------------------------------------

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
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const obs = research.observation;

  // Entrance animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const exit = (cb: () => void) => {
    setExiting(true);
    setTimeout(cb, 350);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9700,
          background: 'rgba(1, 3, 10, 0.6)',
          backdropFilter: 'blur(4px)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onClick={() => exit(onClose)}
      />

      {/* Centered modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          zIndex: 9701,
          width: 360,
          maxWidth: '92vw',
          transform: visible && !exiting
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.85)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
          background: 'rgba(10, 15, 25, 0.96)',
          border: '1px solid #44ff88',
          borderRadius: 6,
          padding: 24,
          fontFamily: 'monospace',
          color: '#ccddee',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(68, 255, 136, 0.15), 0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div style={{ fontSize: 18, color: '#44ff88', marginBottom: 6 }}>
          Дослiдження завершено!
        </div>

        {/* System name */}
        <div style={{ fontSize: 16, color: '#eeffee', marginBottom: 20 }}>
          {system.name}
        </div>

        {/* Stats rows */}
        <div style={rowStyle}>
          <span>Тип зiрки</span>
          <span style={{ color: system.star.colorHex }}>
            {system.star.spectralClass}{system.star.subType}V
          </span>
        </div>
        <div style={rowStyle}>
          <span>Планет</span>
          <span>{system.planets.length}</span>
        </div>
        {obs.habitability?.exact !== undefined && (
          <div style={rowStyle}>
            <span>Придатнiсть</span>
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

        {/* Action buttons */}
        <button
          style={{
            marginTop: 20, padding: '10px 24px', cursor: 'pointer',
            background: 'rgba(30, 80, 50, 0.6)', border: '1px solid #44ff88',
            color: '#44ff88', fontFamily: 'monospace', fontSize: 14, borderRadius: 4,
            width: '100%',
          }}
          onClick={() => exit(onViewSystem)}
        >
          Оглянути систему
        </button>
        <button
          style={{
            marginTop: 10, padding: '8px 24px', cursor: 'pointer',
            background: 'none', border: 'none',
            color: '#556677', fontFamily: 'monospace', fontSize: 11,
          }}
          onClick={() => exit(onClose)}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#8899aa'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#556677'; }}
        >
          Закрити
        </button>
      </div>
    </>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '4px 0',
  borderBottom: '1px solid rgba(50, 60, 70, 0.3)', fontSize: 12,
  color: '#aabbcc',
};
