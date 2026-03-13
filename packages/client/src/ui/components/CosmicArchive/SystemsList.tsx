import React, { useState, useMemo } from 'react';
import type { StarSystem } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SystemsList — List of all discovered/available star systems
// ---------------------------------------------------------------------------

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabbff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4e8',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

interface SystemsListProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onNavigate: (system: StarSystem) => void;
}

export function SystemsList({
  allSystems,
  aliases,
  onNavigate,
}: SystemsListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...allSystems].sort((a, b) => {
      // Home system first
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;
      // Then by name
      const aName = aliases[a.id] || a.name;
      const bName = aliases[b.id] || b.name;
      return aName.localeCompare(bName);
    });
  }, [allSystems, aliases]);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        Досліджених систем поки немає
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 80px 60px 50px',
          gap: 8,
          padding: '6px 12px',
          fontSize: 10,
          color: '#445566',
          textTransform: 'uppercase',
          letterSpacing: 1,
          borderBottom: '1px solid rgba(51, 68, 85, 0.2)',
          marginBottom: 4,
        }}
      >
        <span>Назва</span>
        <span>Клас</span>
        <span>Координати</span>
        <span>Планети</span>
        <span>Кільце</span>
      </div>

      {/* System rows */}
      {sorted.map((system) => {
        const isHome = system.planets.some((p) => p.isHomePlanet);
        const isHovered = hoveredId === system.id;
        const name = aliases[system.id] || system.name;
        const starColor =
          SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';

        return (
          <button
            key={system.id}
            onClick={() => onNavigate(system)}
            onMouseEnter={() => setHoveredId(system.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 80px 60px 50px',
              gap: 8,
              padding: '8px 12px',
              background: isHovered
                ? 'rgba(25, 35, 50, 0.5)'
                : 'rgba(10, 15, 25, 0.3)',
              border: '1px solid rgba(51, 68, 85, 0.15)',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#aabbcc',
              textAlign: 'left',
              alignItems: 'center',
              transition: 'background 0.15s',
            }}
          >
            {/* Name */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: starColor,
                  flexShrink: 0,
                }}
              />
              <span>
                {name}
                {isHome && (
                  <span
                    style={{ color: '#44ff88', fontSize: 9, marginLeft: 6 }}
                  >
                    HOME
                  </span>
                )}
              </span>
            </span>

            {/* Spectral class */}
            <span style={{ color: '#667788', fontSize: 10 }}>
              {system.star.spectralClass}
            </span>

            {/* Coordinates */}
            <span style={{ color: '#556677', fontSize: 10 }}>
              {system.position.x.toFixed(0)}, {system.position.y.toFixed(0)}
            </span>

            {/* Planet count */}
            <span style={{ color: '#667788', fontSize: 10, textAlign: 'center' }}>
              {system.planets.length}
            </span>

            {/* Ring index */}
            <span style={{ color: '#556677', fontSize: 10, textAlign: 'center' }}>
              {system.ringIndex ?? '-'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
