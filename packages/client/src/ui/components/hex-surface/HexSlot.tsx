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
  zIndex?: number;
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
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 82%', opacity: 0.3 }}
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
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 82%',
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

  // Map resource type + rarity to WebP image
  const RARITY_INDEX: Record<string, number> = {
    common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
  };
  const rarityNum = RARITY_INDEX[rarity] ?? 1;

  const RESOURCE_WEBP: Record<string, string> = {
    ore:   `/buildings/minerals${rarityNum}.webp`,
    tree:  `/buildings/izo${rarityNum}.webp`,     // tree → isotopes visual
    vent:  `/buildings/izo${rarityNum}.webp`,     // vent → use isotope visual for now
    water: `/buildings/minerals${rarityNum}.webp`, // water → use minerals visual for now
  };

  const webpSrc = RESOURCE_WEBP[resourceType] ?? `/buildings/minerals${rarityNum}.webp`;

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
      {/* Resource WebP image */}
      <img
        src={webpSrc}
        alt={resourceType}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 82%',
          position: 'absolute', inset: 0,
          opacity: ready ? 1 : 0.5,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Accumulated amount overlay */}
      <div style={{
        position: 'relative', zIndex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: ready ? '#ffffff' : '#88aacc',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        transition: 'color 0.3s',
      }}>
        {accumulated > 0 ? accumulated : ''}
      </div>

      {/* Timer or READY label */}
      {ready ? (
        <div style={{
          position: 'relative', zIndex: 1,
          fontSize: 8,
          color: '#44ff88',
          marginTop: 2,
          letterSpacing: 1,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          READY
        </div>
      ) : (
        <div style={{
          position: 'relative', zIndex: 1,
          fontSize: 8,
          color: '#88aacc',
          marginTop: 2,
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          {formatMs(remaining)}
        </div>
      )}
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
    atmo_extractor: '/buildings/atmo_extractor.webp',
    water_extractor: '/buildings/water_extractor.webp',
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
          style={{
            position: 'absolute',
            left: '-10%',
            bottom: 0,
            width: '120%',
            height: 'auto',
          }}
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
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 18,
          height: 18,
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          background: 'linear-gradient(135deg, #4488cc, #2266aa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 0 4px rgba(68,170,255,0.8)',
        }}>
          {slot.buildingLevel}
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
  zIndex,
  onUnlock,
  onHarvest,
  onBuild,
  onInspect,
  canAfford,
}: HexSlotProps) {
  const left = x - HEX_W / 2;
  const top  = y - HEX_H / 2;

  // No background fill — invisible hit zones, WebP images provide the visual
  let opacity = 1;

  if (slot.state === 'hidden') {
    opacity = 0.35;
  } else if (slot.state === 'locked') {
    opacity = canAfford ? 0.9 : 0.5;
  }

  // Main click handler for the entire hex area
  const handleClick = () => {
    if (slot.state === 'locked') onUnlock();
    else if (slot.state === 'resource') onHarvest();
    else if (slot.state === 'empty') onBuild();
    else if (slot.state === 'building' || slot.state === 'harvester') onInspect();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left,
        top,
        width: HEX_W,
        height: HEX_H,
        zIndex: zIndex ?? 'auto',
        background: 'transparent',
        overflow: 'visible',
        opacity,
        cursor: slot.state === 'hidden' ? 'default' : 'pointer',
        transition: 'opacity 0.2s',
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
