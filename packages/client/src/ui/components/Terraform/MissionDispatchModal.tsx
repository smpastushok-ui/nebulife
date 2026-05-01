// ---------------------------------------------------------------------------
// MissionDispatchModal — dispatch a resource-delivery mission to a planet
// ---------------------------------------------------------------------------

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Ship } from '@nebulife/core';
import {
  tierMaxCargo,
  flightHoursLY,
  repairCost,
  computeParamRequirement,
  PRODUCIBLE_DEFS,
} from '@nebulife/core';
import type { TerraformParamId, Mission, ShipTier } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColonyResources {
  minerals: number;
  volatiles: number;
  isotopes: number;
  water: number;
}

export interface MissionDispatchModalProps {
  targetPlanet: Planet;
  paramId: TerraformParamId;
  donorPlanets: Planet[];
  /** Per-planet resource lookup — called with the selected donor's planet ID. */
  getResources: (planetId: string) => ColonyResources;
  tier: ShipTier;
  availableShips: Ship[];
  /** Returns distance in LY from the given donor planet to the target */
  distanceLY: (donorPlanetId: string) => number;
  currentProgress: number;
  onDispatch: (mission: Omit<Mission, 'id' | 'startedAt' | 'phaseStartedAt'>) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Resource key for param
// ---------------------------------------------------------------------------

function primaryResourceForParam(
  paramId: TerraformParamId,
): 'minerals' | 'volatiles' | 'isotopes' | 'water' {
  switch (paramId) {
    case 'magneticField': return 'isotopes';
    case 'atmosphere':    return 'volatiles';
    case 'ozone':         return 'volatiles';
    case 'temperature':   return 'minerals';
    case 'pressure':      return 'volatiles';
    case 'water':         return 'water';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MissionDispatchModal({
  targetPlanet,
  paramId,
  donorPlanets,
  getResources,
  tier,
  availableShips,
  distanceLY,
  currentProgress,
  onDispatch,
  onClose,
}: MissionDispatchModalProps): React.ReactElement | null {
  const { t } = useTranslation();

  const [selectedDonorId, setSelectedDonorId] = useState<string>(
    donorPlanets[0]?.id ?? '',
  );
  const donorShips = useMemo(
    () => availableShips.filter((ship) => ship.currentPlanetId === selectedDonorId && ship.status === 'docked' && !ship.assignmentId),
    [availableShips, selectedDonorId],
  );
  const [selectedShipId, setSelectedShipId] = useState<string>(donorShips[0]?.id ?? '');

  useEffect(() => {
    setSelectedShipId((prev) => donorShips.some((ship) => ship.id === prev) ? prev : (donorShips[0]?.id ?? ''));
  }, [donorShips]);

  const resource = primaryResourceForParam(paramId);
  // Look up the selected donor's own resource balance (Phase 7B per-planet).
  const donorResources = getResources(selectedDonorId);
  const available = donorResources[resource] ?? 0;
  const selectedShip = donorShips.find((ship) => ship.id === selectedShipId) ?? null;
  const maxCargo = selectedShip ? PRODUCIBLE_DEFS[selectedShip.type].cargoCapacity : tierMaxCargo(tier);

  // Requirement to complete param from current progress
  const requirement = useMemo(() => {
    const cost = computeParamRequirement(targetPlanet, paramId, currentProgress);
    return (cost as Record<string, number | undefined>)[resource] ?? 0;
  }, [targetPlanet, paramId, currentProgress, resource]);

  const maxAmount = Math.floor(Math.min(maxCargo, available, requirement > 0 ? requirement : maxCargo));
  const [amount, setAmount] = useState<number>(maxAmount);
  // When donor changes, clamp amount to the new maxAmount.
  useEffect(() => {
    setAmount((prev) => Math.min(prev, maxAmount));
  }, [maxAmount]);

  const selectedDistance = useMemo(
    () => (selectedDonorId ? distanceLY(selectedDonorId) : 0),
    [selectedDonorId, distanceLY],
  );

  const oneWayHours = useMemo(() => {
    if (!selectedShip) return flightHoursLY(selectedDistance, tier);
    const def = PRODUCIBLE_DEFS[selectedShip.type];
    return Math.max(0.1, selectedDistance / Math.max(0.01, def.baseSpeed * 10));
  }, [selectedDistance, selectedShip, tier]);
  const roundTripHours = oneWayHours * 2;

  const repair = useMemo(
    () => repairCost(selectedDistance, tier).minerals ?? 0,
    [selectedDistance, tier],
  );

  const coveragePct = requirement > 0
    ? Math.min(100, Math.round((amount / requirement) * 100))
    : 0;

  const canDispatch = amount > 0 && available >= amount && selectedDonorId !== '' && Boolean(selectedShipId);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(0, Math.min(maxAmount, parseInt(e.target.value, 10) || 0));
    setAmount(val);
  };

  const handleDispatch = () => {
    if (!canDispatch) return;
    onDispatch({
      donorPlanetId: selectedDonorId,
      targetPlanetId: targetPlanet.id,
      paramId,
      resource,
      amount,
      tier,
      phase: 'dispatching',
      flightHours: oneWayHours,
      repairCostMinerals: repair,
      shipId: selectedShipId,
    });
    onClose();
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 12000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)',
    fontFamily: 'monospace',
  };

  const modalStyle: React.CSSProperties = {
    background: 'rgba(10,15,25,0.98)',
    border: '1px solid #446688',
    borderRadius: 6,
    padding: '20px 24px',
    width: 340,
    maxWidth: '94vw',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color: '#8899aa',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#aabbcc',
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#8899aa',
  };

  const btnBase: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 11,
    borderRadius: 3,
    padding: '7px 14px',
    cursor: 'pointer',
    border: 'none',
    letterSpacing: 1,
    textTransform: 'uppercase',
  };

  if (donorPlanets.length === 0) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, color: '#cc4444' }}>
            {t('terraform.no_donors')}
          </div>
          <button
            style={{ ...btnBase, background: 'rgba(40,50,70,0.8)', color: '#8899aa' }}
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  if (availableShips.length === 0) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, color: '#cc8844' }}>
            {t('terraform.no_free_ships')}
          </div>
          <button
            style={{ ...btnBase, background: 'rgba(40,50,70,0.8)', color: '#8899aa' }}
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#aabbcc', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('terraform.dispatch_title', {
              resource: t(`terraform.resource.${resource}`),
              planet: targetPlanet.name,
            })}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#667788',
              fontFamily: 'monospace', fontSize: 14, cursor: 'pointer', lineHeight: 1,
            }}
          >
            X
          </button>
        </div>

        {/* Donor select */}
        <div>
          <div style={labelStyle}>{t('terraform.donor_label')}</div>
          {donorPlanets.length === 1 ? (
            <div style={valueStyle}>{donorPlanets[0].name}</div>
          ) : (
            <select
              value={selectedDonorId}
              onChange={(e) => setSelectedDonorId(e.target.value)}
              style={{
                fontFamily: 'monospace',
                background: 'rgba(5,10,20,0.9)',
                border: '1px solid #334455',
                borderRadius: 3,
                color: '#aabbcc',
                fontSize: 11,
                padding: '4px 8px',
                width: '100%',
              }}
            >
              {donorPlanets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {t('terraform.distance', { ly: distanceLY(p.id).toFixed(2) })}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Distance (shown for single donor too) */}
        {selectedDonorId && (
          <div style={statRowStyle}>
            <span>{t('terraform.distance', { ly: selectedDistance.toFixed(2) })}</span>
          </div>
        )}

        {/* Ship select */}
        <div>
          <div style={labelStyle}>{t('terraform.ship_label')}</div>
          {donorShips.length === 0 ? (
            <div style={{ ...valueStyle, color: '#cc8844' }}>{t('terraform.no_free_ships')}</div>
          ) : (
            <select
              value={selectedShipId}
              onChange={(e) => setSelectedShipId(e.target.value)}
              style={{
                fontFamily: 'monospace',
                background: 'rgba(5,10,20,0.9)',
                border: '1px solid #334455',
                borderRadius: 3,
                color: '#aabbcc',
                fontSize: 11,
                padding: '4px 8px',
                width: '100%',
              }}
            >
              {donorShips.map((ship) => {
                const def = PRODUCIBLE_DEFS[ship.type];
                return (
                  <option key={ship.id} value={ship.id}>
                    {ship.name} - {def.cargoCapacity} cargo
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Amount slider */}
        <div>
          <div style={labelStyle}>
            {t('terraform.amount_label')} ({resource}) — {available.toLocaleString()} {t('terraform.available')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={0}
              max={maxAmount}
              value={amount}
              onChange={handleAmountChange}
              style={{ flex: 1, accentColor: '#446688' }}
            />
            <input
              type="number"
              min={0}
              max={maxAmount}
              value={amount}
              onChange={handleAmountChange}
              style={{
                width: 72,
                fontFamily: 'monospace',
                background: 'rgba(5,10,20,0.9)',
                border: '1px solid #334455',
                borderRadius: 3,
                color: '#aabbcc',
                fontSize: 11,
                padding: '3px 6px',
              }}
            />
          </div>
          {requirement > 0 && (
            <div style={{ fontSize: 9, color: '#667788', marginTop: 4 }}>
              {t('terraform.coverage_pct', { pct: coveragePct })}
              {' · '}
              {t('terraform.requirement', { amount: Math.ceil(requirement).toLocaleString() })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{
          borderTop: '1px solid #223344',
          paddingTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}>
          <div style={statRowStyle}>
            <span>{t('terraform.eta_oneway')}</span>
            <span style={{ color: '#aabbcc' }}>{fmtHours(oneWayHours)}</span>
          </div>
          <div style={statRowStyle}>
            <span>{t('terraform.eta_roundtrip')}</span>
            <span style={{ color: '#aabbcc' }}>{fmtHours(roundTripHours)}</span>
          </div>
          <div style={statRowStyle}>
            <span>{t('terraform.repair_cost')}</span>
            <span style={{ color: '#ff8844' }}>{repair.toLocaleString()}</span>
          </div>
          <div style={statRowStyle}>
            <span>{t('terraform.ship_tier')}</span>
            <span style={{ color: '#7bb8ff' }}>T{tier}</span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            style={{ ...btnBase, background: 'rgba(40,50,70,0.8)', color: '#8899aa' }}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button
            disabled={!canDispatch}
            style={{
              ...btnBase,
              background: canDispatch ? '#446688' : 'rgba(40,50,70,0.4)',
              color: canDispatch ? '#ddeeff' : '#445566',
              cursor: canDispatch ? 'pointer' : 'not-allowed',
            }}
            onClick={handleDispatch}
          >
            {t('terraform.btn_dispatch')}
          </button>
        </div>

      </div>
    </div>
  );
}
