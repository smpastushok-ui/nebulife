import React, { useState, useEffect, useCallback } from 'react';
import './hex-animations.css';
import type { HexSlotData, Rarity } from './hex-utils';
import {
  HEX_RADIUS,
  RARITY_COLORS,
  RESOURCE_COLORS,
  isResourceReady,
  getAccumulatedYield,
  respawnTimeRemaining,
} from './hex-utils';

interface HexSlotProps {
  slot: HexSlotData;
  x: number;
  y: number;
  onUnlock: () => void;
  onHarvest: () => void;
  onBuild: () => void;
  onInspect: () => void;
  canAfford: boolean;
}

// Pointy-top hex clip-path (matches reference design)
const HEX_CLIP = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

// Size of a hex slot bounding box (pointy-top: width = sqrt(3)*r, height = 2*r)
const HEX_W = Math.ceil(Math.sqrt(3) * HEX_RADIUS);
const HEX_H = HEX_RADIUS * 2;

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Sub-components for each state
// ---------------------------------------------------------------------------

function HiddenContent() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      userSelect: 'none',
    }}>
      <img
        src="/buildings/hecs_locked.webp"
        alt="locked"
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
      />
    </div>
  );
}

function LockedContent({
  slot,
  canAfford,
  onUnlock,
}: {
  slot: HexSlotData;
  canAfford: boolean;
  onUnlock: () => void;
}) {
  const cost = slot.unlockCost;
  return (
    <div
      onClick={onUnlock}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <img
        src="/buildings/hecs_locked.webp"
        alt="locked"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          position: 'absolute', inset: 0,
          opacity: canAfford ? 0.8 : 0.5,
          transition: 'opacity 0.2s',
        }}
      />
      {cost && (
        <div style={{
          position: 'relative', zIndex: 1,
          fontSize: 8,
          color: canAfford ? '#aabbcc' : '#445566',
          textAlign: 'center',
          lineHeight: 1.4,
          marginTop: 30,
        }}>
          {cost.minerals > 0 && <span>{cost.minerals}M </span>}
          {cost.volatiles > 0 && <span>{cost.volatiles}V </span>}
          {cost.isotopes > 0 && <span>{cost.isotopes}I</span>}
        </div>
      )}
    </div>
  );
}

function ResourceContent({
  slot,
  onHarvest,
}: {
  slot: HexSlotData;
  onHarvest: () => void;
}) {
  const [, setTick] = useState(0);

  // Re-render every second to update timer
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const resourceType = slot.resourceType!;
  const rarity = slot.rarity!;
  const color = RESOURCE_COLORS[resourceType];
  const rarityColor = RARITY_COLORS[rarity];
  const ready = isResourceReady(slot.lastHarvestedAt, slot.yieldPerHour);
  const remaining = slot.lastHarvestedAt
    ? respawnTimeRemaining(slot.lastHarvestedAt, slot.yieldPerHour)
    : 0;
  const accumulated = getAccumulatedYield(slot.lastHarvestedAt, slot.yieldPerHour ?? 1, slot.maxCapacity ?? 12);

  const ICONS: Record<string, string> = {
    tree:  '#22c55e',
    ore:   '#a0845e',
    vent:  '#22d3ee',
    water: '#3b82f6',
  };

  const LABELS: Record<string, string> = {
    tree:  'TREE',
    ore:   'ORE',
    vent:  'VENT',
    water: 'H2O',
  };

  return (
    <div
      onClick={ready ? onHarvest : undefined}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: ready ? 'pointer' : 'default',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* Resource label */}
      <div style={{
        fontSize: 9,
        color: color,
        letterSpacing: 1,
        marginBottom: 2,
        textShadow: ready ? `0 0 8px ${color}` : 'none',
        transition: 'text-shadow 0.3s',
      }}>
        {LABELS[resourceType]}
      </div>

      {/* Accumulated amount */}
      <div style={{
        fontSize: 14,
        fontWeight: 'bold',
        color: ready ? color : '#445566',
        transition: 'color 0.3s',
      }}>
        {accumulated}
      </div>

      {/* Timer or READY label */}
      {ready ? (
        <div className="hex-resource-glow" style={{
          fontSize: 8,
          color: color,
          marginTop: 2,
          letterSpacing: 1,
        }}>
          READY
        </div>
      ) : (
        <div style={{
          fontSize: 8,
          color: '#556677',
          marginTop: 2,
        }}>
          {formatMs(remaining)}
        </div>
      )}

      {/* Rarity dot — top-right corner */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '22%',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: rarityColor,
        border: '1px solid #020510',
      }} />
    </div>
  );
}

function EmptyContent({ onBuild }: { onBuild: () => void }) {
  return (
    <div
      onClick={onBuild}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <div style={{
        fontSize: 22,
        color: '#334455',
        lineHeight: 1,
      }}>
        +
      </div>
      <div style={{
        fontSize: 8,
        color: '#334455',
        marginTop: 2,
        letterSpacing: 1,
      }}>
        BUILD
      </div>
    </div>
  );
}

function BuildingContent({
  slot,
  onInspect,
}: {
  slot: HexSlotData;
  onInspect: () => void;
}) {
  const BUILDING_ICONS: Record<string, string> = {
    colony_hub:          'HUB',
    resource_storage:    'STR',
    landing_pad:         'PAD',
    spaceport:           'SPT',
    solar_plant:         'SOL',
    battery_station:     'BAT',
    wind_generator:      'WND',
    thermal_generator:   'THR',
    fusion_reactor:      'FUS',
    mine:                'MIN',
    water_extractor:     'H2O',
    atmo_extractor:      'ATM',
    deep_drill:          'DRL',
    orbital_collector:   'ORB',
    research_lab:        'LAB',
    observatory:         'OBS',
    radar_tower:         'RDR',
    orbital_telescope:   'TEL',
    quantum_computer:    'QNT',
    greenhouse:          'GRN',
    residential_dome:    'DOM',
    atmo_shield:         'SHL',
    biome_dome:          'BIO',
    quantum_separator:   'QSP',
    gas_fractionator:    'GAS',
    isotope_centrifuge:  'ISO',
    genesis_vault:       'GNS',
    alpha_harvester:     'ALP',
  };

  const label = BUILDING_ICONS[slot.buildingType ?? ''] ?? slot.buildingType?.slice(0, 3).toUpperCase() ?? '???';
  const type = slot.buildingType ?? '';

  // Map building type to WebP image path
  const BUILDING_WEBP: Record<string, string> = {
    colony_hub: '/buildings/colony.webp',
    mine: '/buildings/mine.webp',
    solar_plant: '/buildings/solar_plant.webp',
    wind_generator: '/buildings/wind_generator.webp',
    battery_station: '/buildings/battery_station.webp',
    thermal_generator: '/buildings/thermal_generator.webp',
    fusion_reactor: '/buildings/fusion_reactor.webp',
    resource_storage: '/buildings/resource_storage.webp',
    landing_pad: '/buildings/landing_pad.webp',
    spaceport: '/buildings/spaceport.webp',
  };

  const webpSrc = BUILDING_WEBP[type];

  return (
    <div
      onClick={onInspect}
      className="hex-building-levitate"
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {webpSrc ? (
        <img
          src={webpSrc}
          alt={type}
          style={{ width: '90%', height: '90%', objectFit: 'contain' }}
        />
      ) : (
        <div style={{
          fontSize: 13,
          fontWeight: 'bold',
          color: '#7bb8ff',
          letterSpacing: 2,
        }}>
          {label}
        </div>
      )}
      {slot.buildingLevel !== undefined && (
        <div style={{
          position: 'absolute', bottom: '15%',
          fontSize: 8,
          color: '#446688',
          letterSpacing: 1,
        }}>
          LVL {slot.buildingLevel}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HexSlot
// ---------------------------------------------------------------------------

export const HexSlot = React.memo(function HexSlot({
  slot,
  x,
  y,
  onUnlock,
  onHarvest,
  onBuild,
  onInspect,
  canAfford,
}: HexSlotProps) {
  const left = x - HEX_W / 2;
  const top  = y - HEX_H / 2;

  // Background and border color based on state
  let bg = 'rgba(10,15,25,0.7)';
  let borderColor = '#1a2535';
  let borderStyle = 'solid';
  let opacity = 1;
  let glowClass = '';

  if (slot.state === 'hidden') {
    bg = 'rgba(5,8,15,0.5)';
    borderColor = '#111a25';
    opacity = 0.6;
  } else if (slot.state === 'locked') {
    bg = 'rgba(8,14,24,0.65)';
    borderColor = canAfford ? '#446688' : '#223344';
    borderStyle = 'dashed';
    glowClass = 'hex-locked-pulse';
  } else if (slot.state === 'resource') {
    const color = slot.resourceType ? RESOURCE_COLORS[slot.resourceType] : '#44ff88';
    const ready = isResourceReady(slot.lastHarvestedAt, slot.yieldPerHour);
    bg = `rgba(10,20,30,0.85)`;
    borderColor = ready ? color : '#1a3040';
    if (ready) glowClass = 'hex-resource-glow-border';
  } else if (slot.state === 'empty') {
    bg = 'rgba(10,18,28,0.75)';
    borderColor = '#2a3d55';
  } else if (slot.state === 'building' || slot.state === 'harvester') {
    bg = 'rgba(8,16,30,0.88)';
    borderColor = '#4488aa';
  }

  return (
    <div
      className={glowClass}
      style={{
        position: 'absolute',
        left,
        top,
        width: HEX_W,
        height: HEX_H,
        clipPath: HEX_CLIP,
        background: bg,
        border: `1.5px ${borderStyle} ${borderColor}`,
        boxSizing: 'border-box',
        opacity,
        transition: 'border-color 0.3s, opacity 0.2s',
        // Clip-path and border don't play well together, so we add the border
        // via an inset pseudo-approach using outline which respects clip-path
      }}
    >
      {slot.state === 'hidden' && <HiddenContent />}
      {slot.state === 'locked' && (
        <LockedContent slot={slot} canAfford={canAfford} onUnlock={onUnlock} />
      )}
      {slot.state === 'resource' && (
        <ResourceContent slot={slot} onHarvest={onHarvest} />
      )}
      {slot.state === 'empty' && <EmptyContent onBuild={onBuild} />}
      {(slot.state === 'building' || slot.state === 'harvester') && (
        <BuildingContent slot={slot} onInspect={onInspect} />
      )}
    </div>
  );
});
