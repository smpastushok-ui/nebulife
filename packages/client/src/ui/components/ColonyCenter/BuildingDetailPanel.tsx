import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BuildingType, PlacedBuilding, Planet, PlanetResourceStocks } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';

import { ResourceIcon, RESOURCE_COLORS } from '../ResourceIcon.js';
import {
  deriveBuildingDetailStats,
  primaryOutputResource,
  type ColonyResourceKey,
  type RateRow,
} from './building-detail-model.js';

type ColonyResources = Record<ColonyResourceKey, number>;

export interface BuildingDetailPanelProps {
  planet: Planet;
  building?: PlacedBuilding;
  buildingType?: BuildingType;
  buildings: PlacedBuilding[];
  colonyResources: ColonyResources;
  researchData: number;
  planetStocks?: PlanetResourceStocks;
  onClose: () => void;
  onOpenColonyCenter?: () => void;
  onResourceChange?: (delta: Partial<ColonyResources>) => void;
  onResearchDataChange?: (delta: number) => void;
  onDemolish?: (building: PlacedBuilding) => void;
}

const PANEL_BG = '#020510';
const CARD_BG = 'rgba(10,15,25,0.62)';
const BORDER = '#233344';
const ACTIVE_BORDER = '#446688';

function formatRate(row: RateRow): string {
  const sign = row.perHour > 0 ? '+' : '';
  return `${sign}${row.perHour.toFixed(row.perHour % 1 === 0 ? 0 : 1)}/h`;
}

function ResourceLabel({ resource }: { resource: string }) {
  const { t } = useTranslation();
  const resourceKey = resource === 'researchData' ? 'researchData' : resource;
  if (resourceKey === 'energy') {
    return <span>{t('building_detail.resource.energy')}</span>;
  }
  if (resourceKey === 'minerals' || resourceKey === 'volatiles' || resourceKey === 'isotopes' || resourceKey === 'water') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ResourceIcon type={resourceKey} size={11} />
        {t(`colony_center.resource.${resourceKey}`)}
      </span>
    );
  }
  return <span>{t(`building_detail.resource.${resourceKey}`, { defaultValue: resourceKey })}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, color: '#667788', letterSpacing: 2, textTransform: 'uppercase' }}>{title}</div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: 4,
      padding: '10px 12px',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: accent ?? '#aabbcc', fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ marginTop: 3, fontSize: 9, color: '#556677' }}>{sub}</div>}
    </div>
  );
}

function RateList({ rows, empty }: { rows: RateRow[]; empty: string }) {
  if (rows.length === 0) {
    return <div style={{ color: '#556677', fontSize: 11 }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((row) => (
        <div
          key={`${row.resource}-${row.perHour}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(5,10,20,0.5)',
            border: '1px solid rgba(51,68,85,0.55)',
            borderRadius: 4,
            padding: '7px 9px',
            fontSize: 11,
          }}
        >
          <span style={{ color: '#8899aa' }}><ResourceLabel resource={row.resource} /></span>
          <span style={{ color: row.perHour >= 0 ? '#88bb99' : '#cc7777' }}>{formatRate(row)}</span>
        </div>
      ))}
    </div>
  );
}

function ActionButton({
  title,
  desc,
  disabled,
  onClick,
}: {
  title: string;
  desc: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: disabled ? 'rgba(10,15,25,0.35)' : 'rgba(20,30,45,0.55)',
        border: `1px solid ${disabled ? '#223344' : ACTIVE_BORDER}`,
        borderRadius: 4,
        padding: '10px 12px',
        color: disabled ? '#556677' : '#aabbcc',
        fontFamily: 'monospace',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div style={{ fontSize: 12, color: disabled ? '#667788' : '#7bb8ff', letterSpacing: 1, textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ marginTop: 4, fontSize: 10, color: disabled ? '#445566' : '#778899', lineHeight: 1.4 }}>
        {desc}
      </div>
    </button>
  );
}

export function BuildingDetailPanel({
  planet,
  building,
  buildingType,
  buildings,
  colonyResources,
  researchData,
  planetStocks,
  onClose,
  onOpenColonyCenter,
  onResourceChange,
  onResearchDataChange,
  onDemolish,
}: BuildingDetailPanelProps) {
  const { t } = useTranslation();
  const [actionLog, setActionLog] = useState<string | null>(null);
  const [confirmDemolish, setConfirmDemolish] = useState(false);
  const type = building?.type ?? buildingType;
  const def = type ? BUILDING_DEFS[type] : null;

  const stats = useMemo(() => {
    if (!type) return null;
    return deriveBuildingDetailStats({ type, planet, buildings, building, planetStocks });
  }, [building, buildings, planet, planetStocks, type]);

  if (!type || !def || !stats) return null;

  const primary = primaryOutputResource(type);
  const accent =
    primary && primary in RESOURCE_COLORS
      ? RESOURCE_COLORS[primary as ColonyResourceKey]
      : primary === 'researchData'
        ? '#aa88ff'
        : '#7bb8ff';
  const aggregateMode = !building;
  const canScan = researchData >= 5;
  const canChemCycle = colonyResources.volatiles >= 10;
  const compact = typeof window !== 'undefined' && window.innerWidth < 700;
  const isotopeDepositDepleted =
    stats.stock?.resource === 'isotopes' &&
    stats.stock.remaining <= 0;

  const runScan = () => {
    if (!canScan) return;
    onResearchDataChange?.(-5);
    const stockText = stats.stock
      ? t('building_detail.action_result_stock', { pct: stats.stock.pct })
      : t('building_detail.action_result_signal');
    setActionLog(stockText);
  };

  const inspectDeposit = () => {
    if (stats.stock) {
      setActionLog(t('building_detail.action_result_deposit', {
        resource: t(`colony_center.resource.${stats.stock.resource}`),
        remaining: Math.floor(stats.stock.remaining),
        pct: stats.stock.pct,
      }));
    } else {
      setActionLog(t('building_detail.action_result_no_deposit'));
    }
  };

  const runChemCycle = () => {
    if (!canChemCycle) return;
    onResourceChange?.({ volatiles: -10, isotopes: 3, water: 2 });
    setActionLog(t('building_detail.action_result_chemistry'));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9900,
      background: PANEL_BG,
      color: '#aabbcc',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: compact ? '12px 12px' : '14px 16px',
        paddingLeft: compact ? 'calc(12px + env(safe-area-inset-left, 0px))' : 'calc(76px + env(safe-area-inset-left, 0px))',
        paddingTop: compact ? 'calc(12px + env(safe-area-inset-top, 0px))' : 'calc(70px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid #1a2a3a',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'linear-gradient(180deg, rgba(22,42,64,0.92), rgba(8,16,28,0.94))',
            border: '1px solid #446688',
            borderRadius: 3,
            color: '#9fd0ff',
            fontFamily: 'monospace',
            fontSize: 10,
            padding: '7px 12px',
            cursor: 'pointer',
            letterSpacing: 1,
            textTransform: 'uppercase',
            boxShadow: '0 0 12px rgba(68,136,170,0.22)',
          }}
        >
          {t('colony_center.back')}
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: '#aabbcc', letterSpacing: 3, textTransform: 'uppercase' }}>
            {t(`buildings.${type}.name`, { defaultValue: def.name })}
          </div>
          <div style={{ fontSize: 9, color: '#667788', letterSpacing: 1 }}>
            {aggregateMode
              ? t('building_detail.aggregate_subtitle', { count: stats.count })
              : t('building_detail.level_subtitle', { level: stats.level })}
          </div>
        </div>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: stats.isShutdown ? '#cc4444' : accent,
          boxShadow: `0 0 10px ${stats.isShutdown ? '#cc444466' : `${accent}66`}`,
        }} />
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: compact ? '12px 12px 28px' : '14px 16px 36px',
        paddingLeft: compact ? 'calc(12px + env(safe-area-inset-left, 0px))' : 'calc(76px + env(safe-area-inset-left, 0px))',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,30,45,0.72), rgba(5,10,20,0.74))',
          border: `1px solid ${ACTIVE_BORDER}`,
          borderRadius: 6,
          padding: 14,
          boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
        }}>
          <div style={{ fontSize: 10, color: accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            {t(`colony_center.building_category.${def.category}`)}
          </div>
          <div style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.5 }}>
            {t(`buildings.${type}.desc`, { defaultValue: def.description })}
          </div>
        </div>

        {isotopeDepositDepleted && (
          <div style={{
            background: 'rgba(255,136,68,0.10)',
            border: '1px solid rgba(255,136,68,0.38)',
            borderRadius: 5,
            padding: '10px 12px',
            color: '#ffb080',
            fontSize: 11,
            lineHeight: 1.45,
          }}>
            {t('building_detail.isotope_depleted_warning')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          <MetricCard
            label={t('building_detail.status')}
            value={stats.isShutdown ? t('building_detail.status_shutdown') : t('building_detail.status_active')}
            accent={stats.isShutdown ? '#cc7777' : '#88bb99'}
          />
          <MetricCard
            label={t('building_detail.energy')}
            value={`${stats.energyOutput - stats.energyConsumption >= 0 ? '+' : ''}${stats.energyOutput - stats.energyConsumption}`}
            sub={`${t('building_detail.output')} ${stats.energyOutput} / ${t('building_detail.consumes')} ${stats.energyConsumption}`}
            accent="#ffaa66"
          />
          <MetricCard
            label={t('building_detail.fit')}
            value={t(`building_detail.fit_${stats.planetFit}`)}
            accent={stats.planetFit === 'blocked' ? '#cc7777' : stats.planetFit === 'conditional' ? '#ffcc66' : '#88bb99'}
          />
        </div>

        <Section title={t('building_detail.rates')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#88bb99', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                {t('building_detail.production')}
              </div>
              <RateList rows={stats.production} empty={t('building_detail.no_production')} />
            </div>
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 10, color: '#cc7777', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                {t('building_detail.consumption')}
              </div>
              <RateList rows={stats.consumption} empty={t('building_detail.no_consumption')} />
            </div>
          </div>
        </Section>

        <Section title={t('building_detail.modifiers')}>
          <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
            {stats.energyStorageAdd > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.energy_storage', { amount: stats.energyStorageAdd })}</div>}
            {stats.storageCapacityAdd > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.storage_capacity', { amount: stats.storageCapacityAdd })}</div>}
            {stats.populationCapacityAdd > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.population_capacity', { amount: stats.populationCapacityAdd })}</div>}
            {stats.fogRevealRadius > 0 && <div style={{ color: '#8899aa' }}>{t('building_detail.reveal_radius', { radius: stats.fogRevealRadius })}</div>}
            {stats.stock && (
              <div style={{ color: stats.stock.pct < 10 ? '#cc7777' : '#8899aa' }}>
                {t('building_detail.stock_line', {
                  resource: t(`colony_center.resource.${stats.stock.resource}`),
                  remaining: Math.floor(stats.stock.remaining),
                  pct: stats.stock.pct,
                })}
              </div>
            )}
            {stats.activeBonusLabels.map((label) => (
              <div key={label} style={{ color: '#88bb99' }}>{t('building_detail.synergy', { label })}</div>
            ))}
            {stats.energyStorageAdd <= 0 && stats.storageCapacityAdd <= 0 && stats.populationCapacityAdd <= 0 && stats.fogRevealRadius <= 0 && !stats.stock && stats.activeBonusLabels.length === 0 && (
              <div style={{ color: '#556677' }}>{t('building_detail.no_modifiers')}</div>
            )}
          </div>
        </Section>

        <Section title={t('building_detail.actions')}>
          <div style={{ display: 'grid', gap: 8 }}>
            {type === 'colony_hub' && (
              <ActionButton
                title={t('building_detail.action_open_center')}
                desc={t('building_detail.action_open_center_desc')}
                onClick={() => onOpenColonyCenter?.()}
              />
            )}
            {(type === 'research_lab' || type === 'observatory' || type === 'radar_tower' || type === 'deep_drill') && (
              <ActionButton
                title={t('building_detail.action_scan')}
                desc={t('building_detail.action_scan_desc')}
                disabled={!canScan}
                onClick={runScan}
              />
            )}
            {(type === 'mine' || type === 'water_extractor' || type === 'atmo_extractor' || type === 'deep_drill') && (
              <ActionButton
                title={t('building_detail.action_inspect_deposit')}
                desc={t('building_detail.action_inspect_deposit_desc')}
                onClick={inspectDeposit}
              />
            )}
            {(type === 'solar_plant' || type === 'battery_station') && (
              <ActionButton
                title={t('building_detail.action_power_check')}
                desc={t('building_detail.action_power_check_desc', {
                  balance: stats.energyOutput - stats.energyConsumption,
                  storage: stats.energyStorageAdd,
                })}
                onClick={() => setActionLog(t('building_detail.action_result_power'))}
              />
            )}
            {(type === 'quantum_separator' || type === 'gas_fractionator') && (
              <ActionButton
                title={t('building_detail.action_chemistry')}
                desc={t('building_detail.action_chemistry_desc')}
                disabled={!canChemCycle}
                onClick={runChemCycle}
              />
            )}
            {actionLog && (
              <div style={{
                background: 'rgba(68,136,170,0.10)',
                border: '1px solid rgba(68,136,170,0.35)',
                borderRadius: 4,
                padding: '9px 10px',
                fontSize: 11,
                color: '#9fc4dd',
                lineHeight: 1.45,
              }}>
                {actionLog}
              </div>
            )}
          </div>
        </Section>

        {building && type !== 'colony_hub' && onDemolish && (
          <Section title={t('building_detail.danger_zone')}>
            <div style={{ background: 'rgba(35,12,12,0.42)', border: '1px solid rgba(204,68,68,0.36)', borderRadius: 4, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#aa8888', lineHeight: 1.45 }}>
                {t('building_detail.demolish_desc')}
              </div>
              {!confirmDemolish ? (
                <button
                  type="button"
                  onClick={() => setConfirmDemolish(true)}
                  style={{
                    marginTop: 10,
                    background: 'rgba(204,68,68,0.12)',
                    border: '1px solid rgba(204,68,68,0.45)',
                    borderRadius: 4,
                    color: '#ff9a9a',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {t('building_detail.demolish')}
                </button>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => onDemolish(building)}
                    style={{
                      background: 'rgba(204,68,68,0.20)',
                      border: '1px solid rgba(204,68,68,0.65)',
                      borderRadius: 4,
                      color: '#ffb0b0',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('building_detail.demolish_confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDemolish(false)}
                    style={{
                      background: 'rgba(20,30,45,0.55)',
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      color: '#8899aa',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
