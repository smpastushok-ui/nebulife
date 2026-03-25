import React, { useState, useCallback } from 'react';
import type { PlacedBuilding } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { useColony } from '../../../contexts/ColonyContext.js';
import { C, sectionTitle, costRow, actionBtn } from '../building-menu-styles.js';
import {
  MAX_BUILDING_LEVEL,
  getUpgradeCost,
  canAffordUpgrade,
  getScaledProduction,
  getLevelMultiplier,
} from '../building-menu-utils.js';
import { MineralIcon, VolatileIcon, IsotopeIcon } from '../BuildingIcons.js';

interface Props {
  building: PlacedBuilding;
  onUpgraded: (updated: PlacedBuilding) => void;
}

export default function UpgradeTab({ building, onUpgraded }: Props) {
  const { resources, setResources, upgradeBuilding } = useColony();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const def = BUILDING_DEFS[building.type];
  const isMaxLevel = building.level >= MAX_BUILDING_LEVEL;
  const cost = getUpgradeCost(building.type, building.level);
  const canAfford = canAffordUpgrade(cost, resources);
  const isPremium = building.type === 'alpha_harvester';

  const handleUpgrade = useCallback(async () => {
    if (isMaxLevel || !canAfford || upgrading || isPremium) return;
    setUpgrading(true);
    setError(null);

    try {
      // Deduct resources optimistically
      setResources(prev => ({
        minerals:  prev.minerals  - cost.m,
        volatiles: prev.volatiles - cost.v,
        isotopes:  prev.isotopes  - cost.i,
      }));

      const result = await upgradeBuilding(building.id);
      if (result) {
        onUpgraded(result);
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
      } else {
        // Revert on failure
        setResources(prev => ({
          minerals:  prev.minerals  + cost.m,
          volatiles: prev.volatiles + cost.v,
          isotopes:  prev.isotopes  + cost.i,
        }));
        setError('Помилка покращення');
      }
    } catch {
      setResources(prev => ({
        minerals:  prev.minerals  + cost.m,
        volatiles: prev.volatiles + cost.v,
        isotopes:  prev.isotopes  + cost.i,
      }));
      setError('Помилка покращення');
    } finally {
      setUpgrading(false);
    }
  }, [building.id, isMaxLevel, canAfford, upgrading, isPremium, cost, setResources, upgradeBuilding, onUpgraded]);

  if (isPremium) {
    return (
      <div style={{ color: C.textMuted, fontSize: 11, textAlign: 'center', padding: 20 }}>
        Преміум будівля не покращується
      </div>
    );
  }

  if (isMaxLevel) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{
          color: C.green,
          fontSize: 12,
          fontWeight: 'bold',
          marginBottom: 6,
        }}>
          Максимальний рівень
        </div>
        <div style={{ color: C.textMuted, fontSize: 10 }}>
          Рівень {MAX_BUILDING_LEVEL}/{MAX_BUILDING_LEVEL}
        </div>
      </div>
    );
  }

  const nextLevel = building.level + 1;

  return (
    <div>
      {/* Level transition */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        padding: '8px 0',
        ...(flash ? {
          background: 'rgba(68,136,170,0.15)',
          borderRadius: 4,
          transition: 'background 0.3s',
        } : {}),
      }}>
        <span style={{ color: C.textMuted, fontSize: 18 }}>{building.level}</span>
        <svg width={20} height={12} viewBox="0 0 20 12">
          <path d="M2 6h12m-4-4l4 4-4 4" stroke={C.accentBlue} strokeWidth={1.5} fill="none" />
        </svg>
        <span style={{ color: C.accentBlueBright, fontSize: 18, fontWeight: 'bold' }}>{nextLevel}</span>
      </div>

      {/* Improvements preview */}
      <div style={sectionTitle}>Покращення дає</div>
      {def.production.map((p, i) => {
        const current = getScaledProduction(p.amount, building.level);
        const next = getScaledProduction(p.amount, nextLevel);
        return (
          <div key={i} style={{
            ...costRow,
            color: C.textSecondary,
          }}>
            <span>{p.resource === 'researchData' ? 'Дані дослідж.' : p.resource === 'habitability' ? 'Придатність' : p.resource}</span>
            <span>
              <span style={{ color: C.textMuted }}>{current < 0.1 ? current.toFixed(3) : current.toFixed(1)}</span>
              {' -> '}
              <span style={{ color: C.green }}>{next < 0.1 ? next.toFixed(3) : next.toFixed(1)}</span>
              <span style={{ color: C.textMuted, fontSize: 9, marginLeft: 4 }}>
                (+{Math.round((getLevelMultiplier(nextLevel) / getLevelMultiplier(building.level) - 1) * 100)}%)
              </span>
            </span>
          </div>
        );
      })}
      {def.energyOutput > 0 && (
        <div style={{ ...costRow, color: C.textSecondary }}>
          <span>Енергія</span>
          <span>
            <span style={{ color: C.textMuted }}>{(def.energyOutput * (1 + 0.15 * (building.level - 1))).toFixed(1)}</span>
            {' -> '}
            <span style={{ color: C.green }}>{(def.energyOutput * (1 + 0.15 * (nextLevel - 1))).toFixed(1)}</span>
          </span>
        </div>
      )}

      {/* Cost */}
      <div style={{ ...sectionTitle, marginTop: 16 }}>Вартість</div>
      {cost.m > 0 && (
        <div style={costRow}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <MineralIcon size={12} />
            <span style={{ color: C.textSecondary }}>Мінерали</span>
          </span>
          <span style={{
            color: resources.minerals >= cost.m ? C.green : C.red,
            fontWeight: 'bold',
          }}>
            {cost.m}
            <span style={{ color: C.textMuted, fontWeight: 'normal', fontSize: 9, marginLeft: 4 }}>
              ({Math.floor(resources.minerals)})
            </span>
          </span>
        </div>
      )}
      {cost.v > 0 && (
        <div style={costRow}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <VolatileIcon size={12} />
            <span style={{ color: C.textSecondary }}>Летючі</span>
          </span>
          <span style={{
            color: resources.volatiles >= cost.v ? C.green : C.red,
            fontWeight: 'bold',
          }}>
            {cost.v}
            <span style={{ color: C.textMuted, fontWeight: 'normal', fontSize: 9, marginLeft: 4 }}>
              ({Math.floor(resources.volatiles)})
            </span>
          </span>
        </div>
      )}
      {cost.i > 0 && (
        <div style={costRow}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IsotopeIcon size={12} />
            <span style={{ color: C.textSecondary }}>Ізотопи</span>
          </span>
          <span style={{
            color: resources.isotopes >= cost.i ? C.green : C.red,
            fontWeight: 'bold',
          }}>
            {cost.i}
            <span style={{ color: C.textMuted, fontWeight: 'normal', fontSize: 9, marginLeft: 4 }}>
              ({Math.floor(resources.isotopes)})
            </span>
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: C.red, fontSize: 10, textAlign: 'center', marginTop: 8 }}>
          {error}
        </div>
      )}

      {/* Upgrade button */}
      <button
        onClick={handleUpgrade}
        disabled={!canAfford || upgrading}
        style={{
          ...actionBtn,
          marginTop: 14,
          background: canAfford ? 'rgba(40,100,140,0.6)' : 'rgba(40,40,40,0.5)',
          border: `1px solid ${canAfford ? C.accentBlue : C.border}`,
          color: canAfford ? C.accentBlueBright : C.textMuted,
          cursor: canAfford && !upgrading ? 'pointer' : 'not-allowed',
          opacity: upgrading ? 0.6 : 1,
        }}
      >
        {upgrading ? 'Покращення...' : 'Покращити'}
      </button>
    </div>
  );
}
