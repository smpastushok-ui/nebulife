import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Civilization,
  CivilizationContactState,
  ContactStageId,
  PlanetRevealLevel,
  TechTreeState,
} from '@nebulife/core';
import {
  CONTACT_STAGE_DURATION_MS,
  CONTACT_STAGE_ORDER,
  CONTACT_STAGE_TRUST_REWARD,
  CONTACT_STAGE_XP_REWARD,
  XENO_DIPLOMACY_MIN_LEVEL,
  canStartContactStage,
  getContactStageProgress,
  getEffectiveWorkforceMultiplier,
  getIntegrationPathAvailability,
  getNextContactStage,
  hasXenoDiplomacyUnlocked,
  isCivilizationIntegrated,
} from '@nebulife/core';

// ---------------------------------------------------------------------------
// CivilizationTab — Civilization card shown inside PlanetContextMenu once an
// orbital probe confirms sentient life (NEXT_GEN_PLAN §B, phases 1-2 MVP).
// Diplomacy is the only implemented integration path; siege/infiltration are
// rendered as locked seams for later phases.
// ---------------------------------------------------------------------------

function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatStageTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

const sectionLabelStyle: React.CSSProperties = {
  color: '#667788', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', margin: '10px 14px 6px',
};

function TrustBar({ value, strikeActive }: { value: number; strikeActive: boolean }) {
  const { t } = useTranslation();
  const color = strikeActive ? '#cc4444' : value >= 60 ? '#44ff88' : value >= 30 ? '#ddaa44' : '#ff8844';
  return (
    <div style={{ padding: '0 14px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8899aa', marginBottom: 4 }}>
        <span>{t('civilization.trust_label')}</span>
        <span style={{ color }}>{Math.round(value)}/100</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(30,40,50,0.6)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, value)}%`, height: '100%', background: color, opacity: 0.85 }} />
      </div>
      {strikeActive && (
        <div style={{ marginTop: 6, color: '#cc4444', fontSize: 10 }}>{t('civilization.strike_active')}</div>
      )}
    </div>
  );
}

function PathRow({ pathKey, available, reasonKey }: { pathKey: 'diplomacy' | 'siege' | 'infiltration'; available: boolean; reasonKey: string | null }) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      padding: '6px 14px', fontSize: 11,
      color: available ? '#7bb8ff' : '#556677',
    }}>
      <span>{t(`civilization.path.${pathKey}`)}</span>
      <span style={{ fontSize: 9, color: available ? '#44ff88' : '#556677' }}>
        {available ? t('civilization.path_reason.available') : t(reasonKey ?? 'civilization.path_reason.later')}
      </span>
    </div>
  );
}

function ContactStageRow({
  stageId,
  status,
  isNext,
  canStart,
  progress,
  onStart,
}: {
  stageId: ContactStageId;
  status: 'pending' | 'active' | 'completed';
  isNext: boolean;
  canStart: boolean;
  progress: { progress: number; remainingMs: number } | null;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  const color = status === 'completed' ? '#44ff88' : status === 'active' ? '#7bb8ff' : isNext ? '#ddaa44' : '#556677';
  return (
    <div style={{ padding: '6px 14px', borderBottom: '1px solid rgba(50,65,85,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ color, fontSize: 11 }}>{t(`civilization.contact_stage.${stageId}`)}</div>
          <div style={{ color: '#556677', fontSize: 9, marginTop: 2 }}>{t(`civilization.contact_stage_desc.${stageId}`)}</div>
        </div>
        {status === 'completed' && <span style={{ color: '#44ff88', fontSize: 10 }}>✓</span>}
        {status === 'pending' && isNext && canStart && (
          <button
            type="button"
            onClick={onStart}
            style={{
              padding: '5px 10px', border: '1px solid #446688', borderRadius: 3,
              background: 'rgba(30,60,80,0.6)', color: '#aaccee', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('civilization.start_stage')}
          </button>
        )}
      </div>
      {status === 'active' && progress && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#7bb8ff', marginBottom: 3 }}>
            <span>{t('civilization.stage_in_progress')}</span>
            <span>{Math.round(progress.progress * 100)}% · {formatStageTime(progress.remainingMs)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(40,55,70,0.7)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.round(progress.progress * 100)}%`, height: '100%', background: '#4488aa' }} />
          </div>
        </div>
      )}
      {status === 'pending' && (
        <div style={{ marginTop: 4, fontSize: 9, color: '#556677' }}>
          +{CONTACT_STAGE_TRUST_REWARD[stageId]} {t('civilization.trust_label')} · +{CONTACT_STAGE_XP_REWARD[stageId]} XP · {formatStageTime(CONTACT_STAGE_DURATION_MS[stageId])}
        </div>
      )}
    </div>
  );
}

export function CivilizationTab({
  civ,
  revealLevel,
  playerLevel,
  techTreeState,
  contactState,
  clock,
  onStartStage,
}: {
  civ: Civilization;
  revealLevel: PlanetRevealLevel;
  playerLevel: number;
  techTreeState: TechTreeState;
  contactState: CivilizationContactState | null;
  clock: number;
  onStartStage: (stageId: ContactStageId) => void;
}) {
  const { t } = useTranslation();

  if (revealLevel < 2) {
    // orbital_scan (T1) landed a hint; orbital_probe (T2) is required to confirm.
    return (
      <div style={{ padding: '14px' }}>
        <div style={{ color: '#ddaa44', fontSize: 12, marginBottom: 8 }}>{t('civilization.anomaly_hint_title')}</div>
        <div style={{ color: '#8899aa', fontSize: 11, lineHeight: 1.5 }}>{t('civilization.anomaly_hint_body')}</div>
      </div>
    );
  }

  const unlocked = hasXenoDiplomacyUnlocked(playerLevel, techTreeState);
  const paths = getIntegrationPathAvailability(civ, playerLevel, techTreeState);
  const integrated = contactState ? isCivilizationIntegrated(contactState) : false;
  const nextStage = contactState ? getNextContactStage(contactState) : CONTACT_STAGE_ORDER[0];
  const activeProgress = contactState ? getContactStageProgress(contactState, clock) : null;

  return (
    <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
      <div style={{ padding: '10px 14px 4px' }}>
        <div style={{ color: '#ccddee', fontSize: 12 }}>{t(`civilization.era.${civ.techEra}`)}</div>
        <div style={{ color: '#8899aa', fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
          {t(`civilization.temperament_flavor.${civ.temperament}`)}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10, color: '#667788' }}>
          <span>{t('civilization.population_label')}: <span style={{ color: '#aabbcc' }}>{formatPopulation(civ.population)}</span></span>
          <span>{t(`civilization.temperament.${civ.temperament}`)}</span>
        </div>
      </div>

      <TrustBar value={contactState?.trust.value ?? 0} strikeActive={contactState?.trust.strikeActive ?? false} />

      {integrated ? (
        <div style={{ margin: '0 14px 10px', padding: '8px 10px', border: '1px solid rgba(68,255,136,0.4)', borderRadius: 4, background: 'rgba(20,50,30,0.3)' }}>
          <div style={{ color: '#44ff88', fontSize: 11, marginBottom: 4 }}>{t('civilization.integrated_title')}</div>
          <div style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5 }}>{t('civilization.integrated_body')}</div>
          <div style={{ color: '#7bb8ff', fontSize: 10, marginTop: 6 }}>
            {t('civilization.workforce_multiplier_label')}: ×{getEffectiveWorkforceMultiplier(civ, contactState!.trust).toFixed(2)}
          </div>
        </div>
      ) : !unlocked ? (
        <div style={{ margin: '0 14px 10px', padding: '8px 10px', border: '1px solid #334455', borderRadius: 4, color: '#556677', fontSize: 10 }}>
          {t('civilization.locked_gate', { level: XENO_DIPLOMACY_MIN_LEVEL })}
        </div>
      ) : (
        <>
          <div style={sectionLabelStyle}>{t('civilization.integration_paths_label')}</div>
          <PathRow pathKey="diplomacy" available={paths.diplomacy.available} reasonKey={paths.diplomacy.reasonKey} />
          <PathRow pathKey="siege" available={paths.siege.available} reasonKey={paths.siege.reasonKey} />
          <PathRow pathKey="infiltration" available={paths.infiltration.available} reasonKey={paths.infiltration.reasonKey} />

          {paths.diplomacy.available && contactState && (
            <>
              <div style={sectionLabelStyle}>{t('civilization.path.diplomacy')}</div>
              {CONTACT_STAGE_ORDER.map((stageId) => {
                const stage = contactState.stages.find((s) => s.stageId === stageId);
                const status = stage?.status ?? 'pending';
                const isNext = nextStage === stageId;
                const canStart = isNext && canStartContactStage({ state: contactState, civ, stageId, playerLevel, techState: techTreeState }).canStart;
                return (
                  <ContactStageRow
                    key={stageId}
                    stageId={stageId}
                    status={status}
                    isNext={isNext}
                    canStart={canStart}
                    progress={status === 'active' ? activeProgress : null}
                    onStart={() => onStartStage(stageId)}
                  />
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
