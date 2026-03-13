import React, { useState, useEffect, useMemo } from 'react';
import type { StarSystem, Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// PlanetsCatalog — Visual catalog of all planets grouped by star system
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

interface PlanetsCatalogProps {
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onViewPlanet: (system: StarSystem, planetId: string) => void;
}

export function PlanetsCatalog({
  allSystems,
  aliases,
  onViewPlanet,
}: PlanetsCatalogProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('nebulife_pinned_systems');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save pinned state
  useEffect(() => {
    try {
      localStorage.setItem(
        'nebulife_pinned_systems',
        JSON.stringify([...pinned]),
      );
    } catch {
      /* ignore */
    }
  }, [pinned]);

  // Filter: only systems with planets, home system first, then pinned, then rest
  const sortedSystems = useMemo(() => {
    const withPlanets = allSystems.filter((s) => s.planets.length > 0);
    return withPlanets.sort((a, b) => {
      const aHome = a.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      const bHome = b.planets.some((p) => p.isHomePlanet) ? -1 : 0;
      if (aHome !== bHome) return aHome - bHome;
      const aPinned = pinned.has(a.id) ? -1 : 0;
      const bPinned = pinned.has(b.id) ? -1 : 0;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return 0;
    });
  }, [allSystems, pinned]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (sortedSystems.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 40 }}>
        Досліджених систем поки немає
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sortedSystems.map((system) => {
        const isOpen = expanded.has(system.id);
        const isPinned = pinned.has(system.id);
        const isHome = system.planets.some((p) => p.isHomePlanet);
        const name = aliases[system.id] || system.name;
        const starColor =
          SPECTRAL_COLORS[system.star.spectralClass?.[0] ?? 'G'] ?? '#fff4e8';

        return (
          <div key={system.id}>
            {/* Star row */}
            <button
              onClick={() => toggleExpanded(system.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: isOpen
                  ? 'rgba(20, 30, 45, 0.6)'
                  : 'rgba(10, 15, 25, 0.4)',
                border: '1px solid rgba(51, 68, 85, 0.2)',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#aabbcc',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              {/* Star color dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: starColor,
                  boxShadow: `0 0 4px ${starColor}66`,
                  flexShrink: 0,
                }}
              />

              {/* Name */}
              <span style={{ flex: 1, minWidth: 0 }}>
                {name}
                {isHome && (
                  <span style={{ color: '#44ff88', fontSize: 9, marginLeft: 6 }}>
                    HOME
                  </span>
                )}
              </span>

              {/* Spectral class */}
              <span style={{ color: '#556677', fontSize: 10, flexShrink: 0 }}>
                {system.star.spectralClass}
              </span>

              {/* Planet count */}
              <span style={{ color: '#556677', fontSize: 10, flexShrink: 0 }}>
                {system.planets.length} пл.
              </span>

              {/* Pin icon */}
              <span
                onClick={(e) => togglePin(system.id, e)}
                style={{
                  color: isPinned ? '#4488aa' : '#334455',
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'color 0.15s',
                }}
                title={isPinned ? 'Відкріпити' : 'Закріпити'}
              >
                {isPinned ? '*' : '.'}
              </span>

              {/* Expand indicator */}
              <span style={{ color: '#445566', fontSize: 10, flexShrink: 0 }}>
                {isOpen ? '-' : '+'}
              </span>
            </button>

            {/* Expanded planet row */}
            {isOpen && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 16px 10px 30px',
                  overflowX: 'auto',
                  background: 'rgba(8, 12, 22, 0.4)',
                  borderLeft: '1px solid rgba(51, 68, 85, 0.15)',
                  borderRight: '1px solid rgba(51, 68, 85, 0.15)',
                  borderBottom: '1px solid rgba(51, 68, 85, 0.15)',
                  borderRadius: '0 0 3px 3px',
                  marginTop: -1,
                }}
              >
                {system.planets.map((planet) => (
                  <PlanetChip
                    key={planet.id}
                    planet={planet}
                    onClick={() => onViewPlanet(system, planet.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanetChip — small clickable planet representation
// ---------------------------------------------------------------------------

function PlanetChip({
  planet,
  onClick,
}: {
  planet: Planet;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  // Size proportional to radius (clamped)
  const minSize = 24;
  const maxSize = 48;
  const normalizedR = Math.min(
    1,
    Math.log(planet.radiusEarth + 1) / Math.log(12),
  );
  const size = minSize + (maxSize - minSize) * normalizedR;

  // Color based on planet type
  const baseColor = planet.isHomePlanet
    ? '#44ff88'
    : planet.isColonizable
      ? '#88ccaa'
      : planet.atmosphere
        ? '#667799'
        : '#556677';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        background: hover ? 'rgba(30, 45, 65, 0.5)' : 'transparent',
        border: 'none',
        borderRadius: 3,
        cursor: 'pointer',
        fontFamily: 'monospace',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      {/* Planet circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${baseColor}44, ${baseColor}22)`,
          border: `1px solid ${baseColor}55`,
          boxShadow: hover ? `0 0 6px ${baseColor}33` : 'none',
          transition: 'box-shadow 0.15s',
        }}
      />

      {/* Planet name */}
      <div
        style={{
          fontSize: 9,
          color: hover ? '#aabbcc' : '#667788',
          textAlign: 'center',
          maxWidth: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s',
        }}
      >
        {planet.name}
      </div>

      {/* Home badge */}
      {planet.isHomePlanet && (
        <div style={{ fontSize: 8, color: '#44ff88' }}>HOME</div>
      )}
    </button>
  );
}
