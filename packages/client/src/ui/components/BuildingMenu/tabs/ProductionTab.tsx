import React, { useState, useCallback } from 'react';
import type { PlacedBuilding, ProducibleType, ProductionQueueItem } from '@nebulife/core';
import { PRODUCIBLE_DEFS, getProductionProgress } from '@nebulife/core';
import { useColony } from '../../../contexts/ColonyContext.js';
import { useAnimationTick } from '../../../hooks/useAnimationTick.js';
import { C, sectionTitle, costRow, actionBtn } from '../building-menu-styles.js';
import { formatDuration } from '../building-menu-utils.js';
import { MineralIcon, VolatileIcon, IsotopeIcon } from '../BuildingIcons.js';

const MAX_QUEUE = 5;

// Which types each building can produce
const LANDING_PAD_TYPES: ProducibleType[] = ['scout_drone', 'mining_drone', 'orbital_telescope_unit'];
const SPACEPORT_TYPES: ProducibleType[] = ['research_station_kit', 'transport_small', 'transport_large', 'colony_ship'];

const RESOURCE_ICON: Record<string, React.FC<{ size?: number }>> = {
  minerals: MineralIcon,
  volatiles: VolatileIcon,
  isotopes: IsotopeIcon,
};

interface Props {
  building: PlacedBuilding;
  productionQueue: ProductionQueueItem[];
  onStartProduction: (type: ProducibleType) => void;
}

export default function ProductionTab({ building, productionQueue, onStartProduction }: Props) {
  const { resources } = useColony();
  const [now, setNow] = useState(Date.now());

  // rAF tick for progress bars — timestamp-based, survives F5
  useAnimationTick(setNow, productionQueue.length > 0);

  const types = building.type === 'landing_pad' ? LANDING_PAD_TYPES : SPACEPORT_TYPES;
  const queueFull = productionQueue.length >= MAX_QUEUE;

  return (
    <div>
      {/* Available units */}
      <div style={sectionTitle}>Доступні до виробництва</div>
      {types.map(type => {
        const def = PRODUCIBLE_DEFS[type];
        // Check resource sufficiency
        const canAfford = def.cost.every(c => {
          if (c.resource === 'minerals') return resources.minerals >= c.amount;
          if (c.resource === 'volatiles') return resources.volatiles >= c.amount;
          if (c.resource === 'isotopes') return resources.isotopes >= c.amount;
          return true; // chemical elements — skip for now
        });

        return (
          <ProducibleCard
            key={type}
            type={type}
            canAfford={canAfford}
            queueFull={queueFull}
            resources={resources}
            onProduce={() => onStartProduction(type)}
          />
        );
      })}

      {/* Queue */}
      {productionQueue.length > 0 && (
        <>
          <div style={{ ...sectionTitle, marginTop: 16 }}>
            Черга ({productionQueue.length}/{MAX_QUEUE})
          </div>
          {productionQueue.map(item => (
            <QueueItem key={item.id} item={item} now={now} />
          ))}
        </>
      )}

      {productionQueue.length === 0 && (
        <div style={{ color: C.textMuted, fontSize: 10, textAlign: 'center', marginTop: 16 }}>
          Черга порожня
        </div>
      )}
    </div>
  );
}

// ── Producible Card ──────────────────────────────────────────────────────────

function ProducibleCard({
  type,
  canAfford,
  queueFull,
  resources,
  onProduce,
}: {
  type: ProducibleType;
  canAfford: boolean;
  queueFull: boolean;
  resources: { minerals: number; volatiles: number; isotopes: number };
  onProduce: () => void;
}) {
  const def = PRODUCIBLE_DEFS[type];
  const [hovered, setHovered] = useState(false);
  const canStart = canAfford && !queueFull;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(30,50,70,0.4)' : 'rgba(15,25,40,0.3)',
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 4,
        padding: '8px 10px',
        marginBottom: 6,
        transition: 'background 0.15s',
      }}
    >
      {/* Title + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: C.textPrimary, fontSize: 11, fontWeight: 'bold' }}>
          {def.name}
        </span>
        <span style={{ color: C.textMuted, fontSize: 9 }}>
          {formatDuration(def.productionTimeMs)}
        </span>
      </div>

      {/* Description tooltip on hover */}
      {hovered && (
        <div style={{ color: C.textMuted, fontSize: 9, marginBottom: 6, lineHeight: 1.3 }}>
          {def.description}
        </div>
      )}

      {/* Cost row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {def.cost.map((c, i) => {
          const available = c.resource === 'minerals' ? resources.minerals
            : c.resource === 'volatiles' ? resources.volatiles
            : c.resource === 'isotopes' ? resources.isotopes
            : Infinity;
          const enough = available >= c.amount;
          const Icon = RESOURCE_ICON[c.resource];

          return (
            <span key={i} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 10,
              color: enough ? C.textSecondary : C.red,
            }}>
              {Icon && <Icon size={10} />}
              <span style={{ fontWeight: 'bold' }}>{c.amount}</span>
              {!Icon && <span>{c.resource}</span>}
            </span>
          );
        })}
      </div>

      {/* Produce button */}
      <button
        onClick={canStart ? onProduce : undefined}
        disabled={!canStart}
        style={{
          ...actionBtn,
          padding: '5px 0',
          fontSize: 10,
          background: canStart ? 'rgba(40,100,140,0.5)' : 'rgba(30,30,30,0.4)',
          border: `1px solid ${canStart ? C.accentBlue : C.border}`,
          color: canStart ? C.accentBlueBright : C.textMuted,
          cursor: canStart ? 'pointer' : 'not-allowed',
        }}
      >
        {queueFull ? 'Черга повна' : !canAfford ? 'Недостатньо ресурсів' : 'Виробити'}
      </button>
    </div>
  );
}

// ── Queue Item with Progress Bar ─────────────────────────────────────────────

function QueueItem({ item, now }: { item: ProductionQueueItem; now: number }) {
  const def = PRODUCIBLE_DEFS[item.type];
  const progress = Math.min(100, getProductionProgress(item, now));
  const remainingMs = Math.max(0, (item.startedAt + item.durationMs) - now);
  const isComplete = progress >= 100;

  return (
    <div style={{
      background: 'rgba(15,25,40,0.3)',
      border: `1px solid ${C.borderSubtle}`,
      borderRadius: 4,
      padding: '6px 10px',
      marginBottom: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: C.textPrimary, fontSize: 10 }}>{def.name}</span>
        <span style={{ color: isComplete ? C.green : C.textMuted, fontSize: 9 }}>
          {isComplete ? 'Готово' : formatDuration(remainingMs)}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: 4,
        background: 'rgba(30,50,70,0.6)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: isComplete
            ? C.green
            : `linear-gradient(90deg, ${C.accentBlue}, ${C.accentBlueBright})`,
          borderRadius: 2,
          transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  );
}
