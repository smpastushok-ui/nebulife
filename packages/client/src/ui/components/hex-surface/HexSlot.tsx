import React, { useState, useEffect, useRef } from 'react';
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
  id: string;
  slot: HexSlotData;
  x: number;
  y: number;
  zIndex?: number;
  onUnlock: (id: string) => void;
  onHarvest: (id: string) => void;
  onBuild: (id: string) => void;
  onInspect: (id: string) => void;
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
}: {
  slot: HexSlotData;
  canAfford: boolean;
}) {
  const cost = slot.unlockCost;
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        pointerEvents: 'none',
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
          {cost.minerals  > 0 && <span>{cost.minerals}M </span>}
          {cost.volatiles > 0 && <span>{cost.volatiles}V </span>}
          {cost.isotopes  > 0 && <span>{cost.isotopes}I </span>}
          {(cost.water ?? 0) > 0 && <span>{cost.water}W</span>}
        </div>
      )}
    </div>
  );
}

// Static lookup tables — outside component to avoid per-render allocation
const RARITY_INDEX: Record<string, number> = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
};
const RESOURCE_WEBP_TEMPLATES: Record<string, (n: number) => string> = {
  ore:   (n) => `/buildings/minerals${n}.webp`,
  tree:  (n) => `/buildings/izo${n}.webp`,
  vent:  (n) => `/buildings/gas${n}.webp`,
  water: (n) => `/buildings/water${n}.webp`,
};

function ResourceContent({
  slot,
}: {
  slot: HexSlotData;
}) {
  const resourceType = slot.resourceType!;
  const rarity = slot.rarity!;
  const ready = isResourceReady(slot.lastHarvestedAt, slot.yieldPerHour, slot.ring);
  const rarityNum = RARITY_INDEX[rarity] ?? 1;
  const webpSrc = (RESOURCE_WEBP_TEMPLATES[resourceType] ?? RESOURCE_WEBP_TEMPLATES.ore)(rarityNum);

  // PERF: Respawn timer uses direct DOM mutation via ref — zero React re-renders.
  // requestAnimationFrame updates textContent every ~1s without touching state.
  const timerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // PERF: 1s interval instead of RAF loop. RAF was running 120 calls/sec PER hex.
  // With 6 respawning hexes = 720 calls/sec just for timer text. Now: 6 calls/sec.
  useEffect(() => {
    if (ready) return;
    const update = () => {
      const rem = slot.lastHarvestedAt != null ? respawnTimeRemaining(slot.lastHarvestedAt, slot.yieldPerHour, slot.ring) : 0;
      if (rem <= 0) {
        if (timerRef.current) timerRef.current.textContent = '';
        if (imgRef.current) imgRef.current.style.opacity = '1';
        clearInterval(id);
        return;
      }
      if (timerRef.current) timerRef.current.textContent = formatMs(rem);
    };
    update(); // immediate first update
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [ready, slot.lastHarvestedAt, slot.yieldPerHour]);

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {/* Resource WebP image — bright when ready, dimmed when respawning */}
      <img
        ref={imgRef}
        src={webpSrc}
        alt={resourceType}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 82%',
          position: 'absolute', inset: 0,
          opacity: ready ? 1 : 0.4,
          transition: 'opacity 0.5s',
        }}
      />

      {/* Respawn timer — direct DOM textContent, no React state */}
      {!ready && (
        <div
          ref={timerRef}
          style={{
            position: 'relative', zIndex: 1,
            fontSize: 9,
            color: '#667788',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        />
      )}

    </div>
  );
}

function EmptyContent() {
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        pointerEvents: 'none',
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

// Static — outside component to avoid per-render allocation (GC pressure)
const BUILDING_ICONS: Record<string, string> = {
  colony_hub: 'HUB', resource_storage: 'STR', landing_pad: 'PAD', spaceport: 'SPT',
  solar_plant: 'SOL', battery_station: 'BAT', wind_generator: 'WND', thermal_generator: 'THR',
  fusion_reactor: 'FUS', mine: 'MIN', water_extractor: 'H2O', atmo_extractor: 'ATM',
  deep_drill: 'DRL', orbital_collector: 'ORB', isotope_collector: 'ICL', research_lab: 'LAB',
  observatory: 'OBS', radar_tower: 'RDR', orbital_telescope: 'TEL', quantum_computer: 'QNT',
  greenhouse: 'GRN', residential_dome: 'DOM', atmo_shield: 'SHL', biome_dome: 'BIO',
  quantum_separator: 'QSP', gas_fractionator: 'GAS', isotope_centrifuge: 'ISO',
  genesis_vault: 'GNS', alpha_harvester: 'ALP',
};

const BUILDING_WEBP: Record<string, string> = {
  colony_hub: '/buildings/colony.webp', mine: '/buildings/mine.webp',
  solar_plant: '/buildings/solar_plant.webp', wind_generator: '/buildings/wind_generator.webp',
  battery_station: '/buildings/battery_station.webp', thermal_generator: '/buildings/thermal_generator.webp',
  fusion_reactor: '/buildings/fusion_reactor.webp', resource_storage: '/buildings/resource_storage.webp',
  landing_pad: '/buildings/landing_pad.webp', spaceport: '/buildings/spaceport.webp',
  atmo_extractor: '/buildings/atmo_extractor.webp', water_extractor: '/buildings/water_extractor.webp',
  observatory: '/buildings/observatory.webp', orbital_collector: '/buildings/orbital_collector.webp',
  orbital_telescope: '/buildings/orbital_telescope.webp', radar_tower: '/buildings/radar_tower.webp',
  research_lab: '/buildings/research_lab.webp', deep_drill: '/buildings/deep_drill.webp',
  alpha_harvester: '/buildings/alpha_harvester.webp', quantum_computer: '/buildings/quantum_computer.webp',
  greenhouse: '/buildings/greenhouse.webp', atmo_shield: '/buildings/atmo_shield.webp',
  quantum_separator: '/buildings/quantum_separator.webp', gas_fractionator: '/buildings/gas_fractionator.webp',
  genesis_vault: '/buildings/genesis_vault.webp', isotope_centrifuge: '/buildings/isotope_centrifuge.webp',
  biome_dome: '/buildings/biome_dome.webp', residential_dome: '/buildings/residential_dome.webp',
  isotope_collector: '/buildings/isotope_centrifuge.webp',
};

function BuildingContent({
  slot,
}: {
  slot: HexSlotData;
}) {

  const label = BUILDING_ICONS[slot.buildingType ?? ''] ?? slot.buildingType?.slice(0, 3).toUpperCase() ?? '???';
  const type = slot.buildingType ?? '';
  const webpSrc = BUILDING_WEBP[type];

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
        pointerEvents: 'none',
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
  id,
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

  let opacity = 1;
  if (slot.state === 'hidden') {
    opacity = 0.35;
  } else if (slot.state === 'locked') {
    opacity = canAfford ? 0.9 : 0.5;
  }

  // Animation states (local to this hex — no cascade)
  const [harvestAnim, setHarvestAnim] = useState<number | null>(null);
  const [buildingBounce, setBuildingBounce] = useState(false);
  const [insufficientMsg, setInsufficientMsg] = useState(false);
  const [insufficientText, setInsufficientText] = useState('');

  // Main click handler — uses id to call stable parent callbacks
  const handleClick = () => {
    if (slot.state === 'locked') {
      if (canAfford) {
        onUnlock(id);
      } else {
        const cost = slot.unlockCost;
        if (cost) {
          const parts: string[] = [];
          if (cost.minerals > 0) parts.push(`${cost.minerals}M`);
          if (cost.volatiles > 0) parts.push(`${cost.volatiles}V`);
          if (cost.isotopes > 0) parts.push(`${cost.isotopes}I`);
          if ((cost.water ?? 0) > 0) parts.push(`${cost.water}W`);
          setInsufficientText(parts.length > 0 ? parts.join(' ') : '???');
        }
        setInsufficientMsg(true);
        setTimeout(() => setInsufficientMsg(false), 2500);
      }
    } else if (slot.state === 'resource') {
      if (isResourceReady(slot.lastHarvestedAt, slot.yieldPerHour, slot.ring)) {
        const amount = slot.yieldPerHour ?? 1;
        setHarvestAnim(amount);
        onHarvest(id);
        setTimeout(() => setHarvestAnim(null), 1200);
      }
    } else if (slot.state === 'empty') {
      onBuild(id);
    } else if (slot.state === 'building' || slot.state === 'harvester') {
      setBuildingBounce(true);
      setTimeout(() => setBuildingBounce(false), 600);
      onInspect(id);
    }
  };

  return (
    <div
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
        transition: 'opacity 0.2s',
        pointerEvents: 'none',
      }}
    >
      {/* Click target — confined to hex shape, never blocked by overflow from neighbors */}
      <div
        onClick={handleClick}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          clipPath: HEX_CLIP,
          cursor: slot.state === 'hidden' ? 'default' : 'pointer',
          pointerEvents: 'auto',
        }}
      />
      {slot.state === 'hidden' && <HiddenContent />}
      {slot.state === 'locked' && (
        <LockedContent slot={slot} canAfford={canAfford} />
      )}
      {slot.state === 'resource' && (
        <ResourceContent slot={slot} />
      )}
      {slot.state === 'empty' && <EmptyContent />}
      {(slot.state === 'building' || slot.state === 'harvester') && (
        <div style={{
          position: 'absolute', inset: 0,
          transform: buildingBounce ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <BuildingContent slot={slot} />
        </div>
      )}

      {/* Harvest +N float animation (triggered from centralized click) */}
      {harvestAnim !== null && (
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          fontSize: 18,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: '#44ff88',
          textShadow: '0 0 8px rgba(68,255,136,0.6), 0 2px 4px rgba(0,0,0,0.8)',
          animation: 'harvestFloat 1.2s ease-out forwards',
          pointerEvents: 'none',
        }}>
          +{harvestAnim}
        </div>
      )}

      {/* Insufficient resources message — shows cost needed */}
      {insufficientMsg && (
        <div style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          fontFamily: 'monospace',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          animation: 'harvestFloat 2.5s ease-out forwards',
        }}>
          <div style={{ fontSize: 8, color: '#ff8844', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            NEED
          </div>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: '#ffaa66', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {insufficientText}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Deep comparison — hex re-renders ONLY when its own data changes.
  // Prevents cascade re-render when unrelated hex is modified.
  return (
    prev.id === next.id &&
    prev.canAfford === next.canAfford &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.slot.state === next.slot.state &&
    prev.slot.buildingType === next.slot.buildingType &&
    prev.slot.resourceType === next.slot.resourceType &&
    prev.slot.rarity === next.slot.rarity &&
    prev.slot.lastHarvestedAt === next.slot.lastHarvestedAt &&
    prev.slot.buildingLevel === next.slot.buildingLevel &&
    prev.onUnlock === next.onUnlock &&
    prev.onHarvest === next.onHarvest &&
    prev.onBuild === next.onBuild &&
    prev.onInspect === next.onInspect
  );
});
