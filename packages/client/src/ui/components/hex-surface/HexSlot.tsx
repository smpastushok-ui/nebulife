import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { playSfx } from '../../../audio/SfxPlayer.js';
import { BUILDING_DEFS } from '@nebulife/core';

// Resource icons matching ResourceDisplay (top HUD)
const COST_COLORS: Record<string, string> = {
  minerals: '#aa8855',
  volatiles: '#55aaaa',
  isotopes: '#88aa44',
  water: '#3b82f6',
  researchData: '#4488aa',
};

function CostIcon({ type, amount }: { type: string; amount: number }) {
  const { t } = useTranslation();
  const label = t(`surface.unlock_cost_short.${type}`, { defaultValue: type.slice(0, 3).toUpperCase() });
  const title = t(`colony_center.resource.${type}`, { defaultValue: type });
  const color = COST_COLORS[type] ?? '#8899aa';
  return (
    <span
      title={`${title}: ${amount}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        minWidth: 34,
        padding: '1px 3px',
        borderRadius: 3,
        background: 'rgba(3, 8, 14, 0.72)',
        border: `1px solid ${color}55`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.45)',
      }}
    >
      <span style={{
        fontSize: 6,
        color,
        letterSpacing: 0.5,
        fontFamily: 'monospace',
      }}>{label}</span>
      <span style={{ fontSize: 8, color: '#d7e8f4', fontFamily: 'monospace' }}>{amount}</span>
    </span>
  );
}

interface HexSlotProps {
  id: string;
  slot: HexSlotData;
  x: number;
  y: number;
  zIndex?: number;
  onUnlock: (id: string) => boolean;
  /** Called when the player taps a locked hex they can't afford. Parent uses
   *  this to surface the quarks-pay shortcut. */
  onInsufficient?: (id: string) => void;
  onHarvest: (id: string, sx: number, sy: number) => void;
  onBuild: (id: string) => void;
  onInspect: (id: string) => void;
  onDestroy: (id: string) => void;
  canAfford: boolean;
  isShutdown?: boolean;
  isStorageBlocked?: boolean;
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
  const { t } = useTranslation();
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
        }}
      />
      {cost && (
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          alignItems: 'center',
          maxWidth: '92%',
        }}>
          <div style={{
            fontSize: 6,
            color: canAfford ? '#9fc7dd' : '#886a55',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}>
            {t('surface.unlock_cost')}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 2,
          }}>
            {cost.minerals > 0 && <CostIcon type="minerals" amount={cost.minerals} />}
            {cost.volatiles > 0 && <CostIcon type="volatiles" amount={cost.volatiles} />}
            {cost.isotopes > 0 && <CostIcon type="isotopes" amount={cost.isotopes} />}
            {(cost.water ?? 0) > 0 && <CostIcon type="water" amount={cost.water!} />}
            {(cost.researchData ?? 0) > 0 && <CostIcon type="researchData" amount={cost.researchData!} />}
          </div>
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
const RESOURCE_LABEL_KEYS: Record<string, string> = {
  ore: 'surface.resource_ore',
  tree: 'surface.resource_tree',
  vent: 'surface.resource_vent',
  water: 'surface.resource_water',
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
        }}
      />

      {/* Respawn timer — direct DOM textContent, no React state */}
      {!ready && (
        <div
          ref={timerRef}
          style={{
            position: 'relative', zIndex: 1,
            fontSize: 9,
            color: '#ddeeff',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
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
        pointerEvents: 'none',
        cursor: 'pointer',
      }}
    >
      <img
        src="/buildings/build_hecs.webp"
        alt="build"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 82%',
          position: 'absolute', inset: 0,
          opacity: 0.7,
        }}
      />
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
  onInsufficient,
  onHarvest,
  onBuild,
  onInspect,
  onDestroy,
  canAfford,
  isShutdown = false,
  isStorageBlocked = false,
}: HexSlotProps) {
  const { t } = useTranslation();
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
  const [insufficientMsg, setInsufficientMsg] = useState(false);
  const [insufficientCost, setInsufficientCost] = useState<HexSlotData['unlockCost'] | null>(null);
  const [destroyConfirm, setDestroyConfirm] = useState(false);
  const [resourceHint, setResourceHint] = useState(false);
  const buildingRef = useRef<HTMLDivElement>(null);
  const resourceLabel = slot.resourceType
    ? t(RESOURCE_LABEL_KEYS[slot.resourceType] ?? 'surface.resource_unknown')
    : '';

  // Main click handler — uses id to call stable parent callbacks
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (slot.state === 'locked') {
      const unlocked = onUnlock(id);
      if (!unlocked) {
        // Let the parent decide whether to show the "pay 10💎" shortcut.
        onInsufficient?.(id);
        setInsufficientCost(slot.unlockCost ?? null);
        setInsufficientMsg(true);
        setTimeout(() => setInsufficientMsg(false), 2500);
      }
    } else if (slot.state === 'resource') {
      if (isResourceReady(slot.lastHarvestedAt, slot.yieldPerHour, slot.ring)) {
        const amount = slot.yieldPerHour ?? 1;
        setHarvestAnim(amount);
        playSfx('harvest-all', 0.5);
        onHarvest(id, e.clientX, e.clientY);
        setTimeout(() => setHarvestAnim(null), 1200);
      } else {
        setResourceHint(true);
        setTimeout(() => setResourceHint(false), 1800);
      }
    } else if (slot.state === 'empty') {
      onBuild(id);
    } else if (slot.state === 'building' || slot.state === 'harvester') {
      // Bounce via direct DOM — no React re-render
      if (buildingRef.current) {
        buildingRef.current.style.transform = 'translateY(-4px)';
        setTimeout(() => { if (buildingRef.current) buildingRef.current.style.transform = ''; }, 600);
      }
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
        pointerEvents: 'none',
      }}
    >
      {/* Click target — full bounding box (87x100) instead of clipped polygon.
          Fingers/trackpads often miss the exact hex corners; with clipPath the
          corners received no events at all. The bounding rect is only ~38%
          bigger than the polygon, and tessellated hexes leave a small gap
          between centers, so overlap with neighbors is minimal. */}
      <div
        onClick={handleClick}
        title={slot.state === 'resource' ? resourceLabel : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          cursor: slot.state === 'hidden' ? 'default' : 'pointer',
          pointerEvents: 'auto',
        }}
      />

      {/* Destroy button — top-center, only for resource tiles. Upper position avoids
          z-index conflicts: hexes above have lower zIndex and won't cover this.
          onPointerDown stops propagation so HexSurface's drag handler isn't triggered,
          which prevents setPointerCapture from breaking the subsequent click event. */}
      {slot.state === 'resource' && !destroyConfirm && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setDestroyConfirm(true); }}
          style={{
            position: 'absolute',
            top: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 150,
            pointerEvents: 'auto',
            width: 16,
            height: 10,
            background: 'rgba(20, 8, 8, 0.82)',
            border: '1px solid rgba(140, 40, 40, 0.45)',
            borderRadius: 2,
            color: '#774444',
            fontSize: 7,
            fontFamily: 'monospace',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
          }}
        >
          x
        </button>
      )}

      {/* Destroy confirm overlay — full hex, clipped to hex shape */}
      {slot.state === 'resource' && destroyConfirm && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            clipPath: HEX_CLIP,
            background: 'rgba(35, 8, 8, 0.94)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            fontSize: 7,
            color: '#cc5544',
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}>
            FREE?
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onDestroy(id); setDestroyConfirm(false); }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 20,
                height: 14,
                background: 'rgba(80, 20, 20, 0.9)',
                border: '1px solid rgba(190, 60, 60, 0.7)',
                borderRadius: 2,
                color: '#dd6655',
                fontSize: 8,
                fontFamily: 'monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              Y
            </button>
            <button
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setDestroyConfirm(false); }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 20,
                height: 14,
                background: 'rgba(15, 25, 45, 0.9)',
                border: '1px solid rgba(60, 90, 120, 0.5)',
                borderRadius: 2,
                color: '#4488aa',
                fontSize: 8,
                fontFamily: 'monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              N
            </button>
          </div>
        </div>
      )}

      {slot.state === 'hidden' && <HiddenContent />}
      {slot.state === 'locked' && (
        <LockedContent slot={slot} canAfford={canAfford} />
      )}
      {slot.state === 'resource' && (
        <ResourceContent slot={slot} />
      )}
      {slot.state === 'resource' && resourceHint && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '8%',
          transform: 'translateX(-50%)',
          zIndex: 160,
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(3, 8, 14, 0.86)',
          border: '1px solid rgba(68, 136, 170, 0.45)',
          color: '#d7e8f4',
          fontFamily: 'monospace',
          fontSize: 8,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {resourceLabel}
        </div>
      )}
      {slot.state === 'empty' && <EmptyContent />}
      {(slot.state === 'building' || slot.state === 'harvester') && (
        <div ref={buildingRef} style={{
          position: 'absolute', inset: 0,
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <BuildingContent slot={slot} />
        </div>
      )}
      {isShutdown && (slot.state === 'building' || slot.state === 'harvester') && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 2,
          zIndex: 150,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 4,
          padding: '1px 3px',
          pointerEvents: 'none',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#cc4444" strokeWidth="3" strokeLinecap="round">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="#cc4444" strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 7, color: '#cc4444', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {BUILDING_DEFS[slot.buildingType as keyof typeof BUILDING_DEFS]?.energyConsumption ?? '?'}
          </span>
        </div>
      )}

      {isStorageBlocked && (slot.state === 'building' || slot.state === 'harvester') && (
        <div
          title={t('hex.storage_full_warning')}
          style={{
            position: 'absolute',
            top: isShutdown ? 20 : 2,
            right: 2,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(0,0,0,0.72)',
            border: '1px solid rgba(255,136,68,0.45)',
            borderRadius: 4,
            padding: '1px 3px',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 8, color: '#ff8844', fontFamily: 'monospace', fontWeight: 'bold' }}>!</span>
          <span style={{ fontSize: 7, color: '#ff8844', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {t('hex.storage_full_short')}
          </span>
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
      {insufficientMsg && insufficientCost && (
        <div style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          fontFamily: 'monospace',
          textAlign: 'center',
          pointerEvents: 'none',
          animation: 'harvestFloat 2.5s ease-out forwards',
        }}>
          <div style={{ fontSize: 8, color: '#ff8844', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            NEED
          </div>
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            {insufficientCost.minerals > 0 && <CostIcon type="minerals" amount={insufficientCost.minerals} />}
            {insufficientCost.volatiles > 0 && <CostIcon type="volatiles" amount={insufficientCost.volatiles} />}
            {insufficientCost.isotopes > 0 && <CostIcon type="isotopes" amount={insufficientCost.isotopes} />}
            {(insufficientCost.water ?? 0) > 0 && <CostIcon type="water" amount={insufficientCost.water!} />}
            {(insufficientCost.researchData ?? 0) > 0 && <CostIcon type="researchData" amount={insufficientCost.researchData!} />}
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
    prev.x === next.x &&
    prev.y === next.y &&
    prev.zIndex === next.zIndex &&
    prev.canAfford === next.canAfford &&
    prev.isShutdown === next.isShutdown &&
    prev.slot.state === next.slot.state &&
    prev.slot.buildingType === next.slot.buildingType &&
    prev.slot.resourceType === next.slot.resourceType &&
    prev.slot.buildingLevel === next.slot.buildingLevel &&
    prev.slot.lastHarvestedAt === next.slot.lastHarvestedAt
  );
});
