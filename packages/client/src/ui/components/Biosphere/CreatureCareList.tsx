// CreatureCareList — daily-care + "Нове покоління" controls for active
// Biosphere creatures (Еволюція біосфери). One status chip per creature:
// stage + vitality bar, a feed popover mapped to colony resources, and — on
// elders — an evolve popover with a deterministic mutation preview.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  pickMutations,
  CARE_DAYS_TO_ADULT,
  CARE_DAYS_TO_ELDER,
  CARE_TYPES,
  CREATURE_VITALITY_LOW_THRESHOLD,
  OFFSPRING_COST_QUARKS,
  HYBRID_UPGRADE_COST_QUARKS,
  type CareResourceType,
  type TraitMutation,
} from '@nebulife/core';
import {
  careForCreature,
  evolveCreature,
  upgradeHybrid,
  type BiosphereCreature,
  type CreatureStage,
} from '../../../api/creature-api.js';
import { getCreatureEffectiveVitality, isCreatureCareableNow } from './creature-vitality.js';

type ColonyResourceBundle = { minerals: number; volatiles: number; isotopes: number; water: number };

interface CreatureCareListProps {
  creatures: BiosphereCreature[];
  /** Photo-tier creatures ('photo_ready' — hybrid fusions or plain
   *  experiments that fell back after a Tripo failure) — shown with a
   *  3D-upgrade action. */
  photoHybrids?: BiosphereCreature[];
  nowMs: number;
  colonyResources?: ColonyResourceBundle;
  onSpendResources?: (delta: Partial<ColonyResourceBundle>) => void;
  onCareCompleted: () => void;
  onEvolved: (offspringId: string) => void;
  onHybridUpgradeStarted?: (creatureId: string) => void;
}

export function CreatureCareList({
  creatures, photoHybrids, nowMs, colonyResources, onSpendResources, onCareCompleted, onEvolved, onHybridUpgradeStarted,
}: CreatureCareListProps) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      left: 'calc(16px + env(safe-area-inset-left, 0px))',
      zIndex: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 'min(260px, calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))',
      maxHeight: 'calc(100dvh - 96px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
      overflowY: 'auto',
      paddingRight: 2,
      boxSizing: 'border-box',
      WebkitOverflowScrolling: 'touch',
    }}>
      {creatures.map((creature) => (
        <CreatureCareCard
          key={creature.id}
          creature={creature}
          nowMs={nowMs}
          colonyResources={colonyResources}
          onSpendResources={onSpendResources}
          onCareCompleted={onCareCompleted}
          onEvolved={onEvolved}
        />
      ))}
      {(photoHybrids ?? []).map((hybrid) => (
        <PhotoHybridCard
          key={hybrid.id}
          hybrid={hybrid}
          onUpgradeStarted={onHybridUpgradeStarted}
        />
      ))}
    </div>
  );
}

function stageLabelKey(stage: CreatureStage | string): string {
  switch (stage) {
    case 'adult': return 'biosphere.stage.adult';
    case 'elder': return 'biosphere.stage.elder';
    case 'legacy': return 'biosphere.stage.legacy';
    default: return 'biosphere.stage.juvenile';
  }
}

function CreatureCareCard({
  creature, nowMs, colonyResources, onSpendResources, onCareCompleted, onEvolved,
}: {
  creature: BiosphereCreature;
  nowMs: number;
  colonyResources?: ColonyResourceBundle;
  onSpendResources?: (delta: Partial<ColonyResourceBundle>) => void;
  onCareCompleted: () => void;
  onEvolved: (offspringId: string) => void;
}) {
  const { t } = useTranslation();
  const [popover, setPopover] = useState<'none' | 'care' | 'evolve'>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stage = (creature.stage as CreatureStage | undefined) ?? 'juvenile';
  const isPending = creature.status !== 'ready';
  const vitality = Math.round(getCreatureEffectiveVitality(creature, nowMs));
  const careableToday = !isPending && isCreatureCareableNow(creature, nowMs);
  const isLow = vitality < CREATURE_VITALITY_LOW_THRESHOLD;
  const careDaysTarget = stage === 'juvenile' ? CARE_DAYS_TO_ADULT : stage === 'adult' ? CARE_DAYS_TO_ELDER : null;

  const barColor = vitality >= 60 ? '#44ff88' : vitality >= CREATURE_VITALITY_LOW_THRESHOLD ? '#7bb8ff' : '#ff8844';

  const mutationPreview = useMemo<TraitMutation[]>(
    () => (popover === 'evolve' ? pickMutations(creature.id, (creature.generation ?? 1) + 1) : []),
    [popover, creature.id, creature.generation],
  );

  const affordableCareTypes = CARE_TYPES.filter((ct) => (colonyResources?.[ct.resource] ?? 0) >= ct.amount);

  const handleCare = async (resource: CareResourceType, amount: number) => {
    setBusy(true);
    setError(null);
    try {
      await careForCreature(creature.id);
      onSpendResources?.({ [resource]: -amount });
      setPopover('none');
      onCareCompleted();
    } catch (err) {
      const reason = (err as { reason?: string })?.reason;
      setError(reason ? t(`biosphere.care.error_${reason}`, t('biosphere.care.error_generic')) : t('biosphere.care.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleEvolve = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await evolveCreature(creature.id);
      if (res.creatureId) {
        setPopover('none');
        onEvolved(res.creatureId);
      } else {
        setError(res.error ?? t('biosphere.evolve.error_generic'));
      }
    } catch (err) {
      const reason = (err as { reason?: string })?.reason;
      setError(reason === 'not_elder' ? t('biosphere.evolve.error_not_elder') : t('biosphere.evolve.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(10,15,25,0.9)', border: '1px solid #334455', borderRadius: 4,
      padding: 10, fontFamily: 'monospace', boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: isPending ? 6 : 4 }}>
        <span style={{ color: '#ccddee', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {t(stageLabelKey(stage))}
          {(creature.generation ?? 1) > 1 && (
            <span style={{ color: '#667788' }}> · {t('biosphere.generation_short', { gen: creature.generation })}</span>
          )}
        </span>
      </div>

      {isPending && (
        <div style={{
          color: '#8899aa',
          fontSize: 9,
          lineHeight: 1.35,
          paddingTop: 6,
          borderTop: '1px solid rgba(50,60,80,0.3)',
        }}>
          {t('biosphere.generate.status_model')}
        </div>
      )}

      {!isPending && (
        <>
          <div style={{ height: 5, borderRadius: 3, background: 'rgba(30,40,50,0.6)', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${vitality}%`, background: barColor, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: careDaysTarget ? 2 : 6 }}>
            <span style={{ color: isLow ? '#ff8844' : '#8899aa', fontSize: 9 }}>
              {isLow ? t('biosphere.low_vitality_hint') : t('biosphere.vitality_label', { value: vitality })}
            </span>
          </div>
          {careDaysTarget && (
            <div style={{ color: '#556677', fontSize: 9, marginBottom: 6 }}>
              {t('biosphere.care_days_progress', { current: creature.care_days ?? 0, target: careDaysTarget })}
            </div>
          )}

          {stage !== 'elder' && stage !== 'legacy' && (
            <button
              onClick={() => setPopover((p) => (p === 'care' ? 'none' : 'care'))}
              disabled={!careableToday}
              style={careButtonStyle(careableToday)}
            >
              {careableToday ? t('biosphere.care.button') : t('biosphere.care.done_today')}
            </button>
          )}

          {stage === 'elder' && (
            <button
              onClick={() => setPopover((p) => (p === 'evolve' ? 'none' : 'evolve'))}
              style={careButtonStyle(true)}
            >
              {t('biosphere.evolve.button')}
            </button>
          )}
        </>
      )}

      {popover === 'care' && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(50,60,80,0.3)' }}>
          <p style={{ color: '#8899aa', fontSize: 9, margin: '0 0 6px' }}>{t('biosphere.care.choose_resource')}</p>
          {affordableCareTypes.length === 0 && (
            <p style={{ color: '#ff8844', fontSize: 9, margin: '0 0 6px' }}>{t('biosphere.care.no_resources')}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CARE_TYPES.map((ct) => {
              const available = colonyResources?.[ct.resource] ?? 0;
              const affordable = available >= ct.amount;
              return (
                <button
                  key={ct.id}
                  onClick={() => handleCare(ct.resource, ct.amount)}
                  disabled={!affordable || busy}
                  style={careTypeButtonStyle(affordable && !busy)}
                >
                  {t(`biosphere.care.type_${ct.id}`, { amount: ct.amount })}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {popover === 'evolve' && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(50,60,80,0.3)' }}>
          <p style={{ color: '#8899aa', fontSize: 9, margin: '0 0 6px' }}>{t('biosphere.evolve.preview_label')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {mutationPreview.map((m) => (
              <span key={`${m.category}:${m.trait}`} style={traitChipStyle}>
                {t(`biosphere.trait.${m.category}.${m.trait}`)}
              </span>
            ))}
          </div>
          <p style={{ color: '#556677', fontSize: 9, margin: '0 0 6px' }}>
            {t('biosphere.evolve.cost_hint', { cost: OFFSPRING_COST_QUARKS })}
          </p>
          <button onClick={handleEvolve} disabled={busy} style={careButtonStyle(!busy)}>
            {busy ? t('biosphere.generate.working') : t('biosphere.evolve.confirm')}
          </button>
        </div>
      )}

      {error && <p style={{ color: '#cc4444', fontSize: 9, margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}

/** Photo-tier card (hybrid or plain Tripo-fallback experiment) — owned
 *  portrait + the 3D upgrade action. */
function PhotoHybridCard({
  hybrid, onUpgradeStarted,
}: {
  hybrid: BiosphereCreature;
  onUpgradeStarted?: (creatureId: string) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await upgradeHybrid(hybrid.id);
      if (res.status === 'generating' && res.creatureId) {
        onUpgradeStarted?.(res.creatureId);
      } else if (res.status === 'photo_ready' && res.reason === 'tripo_unavailable') {
        setError(t('biosphere.hybrid.error_tripo_unavailable'));
      } else {
        setError(res.error ?? t('biosphere.hybrid.error_generic'));
      }
    } catch (err) {
      const reason = (err as { reason?: string })?.reason;
      const raw = err instanceof Error ? err.message : String(err);
      if (reason === 'planet_full') setError(t('biosphere.hybrid.error_planet_full'));
      else if (raw.toLowerCase().includes('insufficient')) setError(t('biosphere.generate.no_quarks'));
      else setError(t('biosphere.hybrid.error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const photoUrl = hybrid.hybrid_photo_url ?? hybrid.image_url;
  // A plain experiment that fell back to photo_ready (Tripo failed at
  // creation) already paid full price — the retry is free. Only a
  // deliberately-purchased hybridize 'photo' tier costs the full upgrade fee.
  const upgradeCost = hybrid.is_hybrid ? HYBRID_UPGRADE_COST_QUARKS : 0;

  return (
    <div style={{
      background: 'rgba(10,15,25,0.9)', border: '1px solid #334455', borderRadius: 4,
      padding: 10, fontFamily: 'monospace', boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        {photoUrl && (
          <img
            src={photoUrl}
            alt=""
            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 3, border: '1px solid #334455', flexShrink: 0 }}
          />
        )}
        <span style={{ color: '#ccddee', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {t(hybrid.is_hybrid ? 'biosphere.hybrid.photo_badge' : 'biosphere.hybrid.photo_badge_plain')}
          {(hybrid.generation ?? 1) > 1 && (
            <span style={{ color: '#667788' }}> · {t('biosphere.generation_short', { gen: hybrid.generation })}</span>
          )}
        </span>
      </div>
      <button onClick={handleUpgrade} disabled={busy} style={careButtonStyle(!busy)}>
        {busy
          ? t('biosphere.generate.working')
          : upgradeCost > 0
            ? t('biosphere.hybrid.upgrade_button', { cost: upgradeCost })
            : t('biosphere.hybrid.upgrade_button_free')}
      </button>
      {error && <p style={{ color: '#cc4444', fontSize: 9, margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}

function careButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width: '100%', marginTop: 6, padding: '7px 6px',
    background: enabled ? 'rgba(30,60,80,0.6)' : 'rgba(30,60,80,0.25)',
    border: `1px solid ${enabled ? '#446688' : '#2a3a4a'}`,
    color: enabled ? '#aaccee' : '#556677',
    fontFamily: 'monospace', fontSize: 10, lineHeight: 1.25, borderRadius: 3,
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

function careTypeButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '5px 8px', textAlign: 'left',
    background: enabled ? 'rgba(30,80,50,0.4)' : 'rgba(30,40,50,0.3)',
    border: `1px solid ${enabled ? '#44ff88' : '#2a3a4a'}`,
    color: enabled ? '#aaffcc' : '#556677',
    fontFamily: 'monospace', fontSize: 9, borderRadius: 3,
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

const traitChipStyle: React.CSSProperties = {
  padding: '2px 6px', background: 'rgba(40,80,120,0.3)', border: '1px solid #446688',
  color: '#aaccee', fontSize: 9, borderRadius: 3,
};

export default CreatureCareList;
