// HybridizationPanel — "дослід схрещування" experiment UI for the Biosphere
// (lab visual style, mirrors CreatureGenerationPanel's panel pattern).
// Pick two same-planet non-legacy creatures, preview the deterministic hybrid
// trait mix, choose a tier (photo-only or full 3D settlement) and run the
// fusion. Photo tier resolves synchronously (Gemini multi-image editing);
// full tier continues through the usual Tripo status polling.

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  pickHybridTraits,
  HYBRID_PHOTO_COST_QUARKS,
  HYBRID_FULL_COST_QUARKS,
} from '@nebulife/core';
import {
  hybridizeCreatures,
  type BiosphereCreature,
  type CreatureTraitMutation,
  type HybridTier,
} from '../../../api/creature-api.js';

interface HybridizationPanelProps {
  /** Eligible parents only: status 'ready', non-legacy, portrait available. */
  eligibleCreatures: BiosphereCreature[];
  /** Active (settled, non-legacy) creature count — gates the full tier. */
  activeCreatureCount: number;
  maxCreatures: number;
  onClose: () => void;
  /** Full tier accepted — creature is generating, start status polling. */
  onHybridGenerating: (creatureId: string) => void;
  /** Any tier finished the request — refresh the creature list. */
  onChanged: () => void;
}

type PanelPhase = 'select' | 'submitting' | 'photo_done' | 'error';

export function HybridizationPanel({
  eligibleCreatures, activeCreatureCount, maxCreatures, onClose, onHybridGenerating, onChanged,
}: HybridizationPanelProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<PanelPhase>('select');
  const [message, setMessage] = useState<string | null>(null);
  const [resultPhotoUrl, setResultPhotoUrl] = useState<string | null>(null);
  const [resultTraits, setResultTraits] = useState<CreatureTraitMutation[]>([]);

  const parentA = eligibleCreatures.find((c) => c.id === selectedIds[0]) ?? null;
  const parentB = eligibleCreatures.find((c) => c.id === selectedIds[1]) ?? null;
  const pairSelected = Boolean(parentA && parentB);
  const planetFull = activeCreatureCount >= maxCreatures;

  const traitPreview = useMemo<CreatureTraitMutation[]>(() => {
    if (!parentA || !parentB) return [];
    return pickHybridTraits(parentA.id, parentB.id, parentA.traits, parentB.traits);
  }, [parentA, parentB]);

  const toggleSelect = (id: string) => {
    if (phase === 'submitting') return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleRun = async (tier: HybridTier) => {
    if (!parentA || !parentB || phase === 'submitting') return;
    setPhase('submitting');
    setMessage(null);
    try {
      const res = await hybridizeCreatures(parentA.id, parentB.id, tier);
      if (!res.creatureId) {
        setPhase('error');
        setMessage(res.error ?? t('biosphere.hybrid.error_generic'));
        return;
      }
      setResultPhotoUrl(res.photoUrl ?? null);
      setResultTraits(res.traits ?? []);
      onChanged();
      if (res.status === 'photo_ready') {
        setPhase('photo_done');
      } else {
        onHybridGenerating(res.creatureId);
        setPhase('photo_done'); // photo is already visible; 3D keeps forming in background
      }
    } catch (err) {
      setPhase('error');
      const reason = (err as { reason?: string })?.reason;
      const raw = err instanceof Error ? err.message : String(err);
      if (reason === 'planet_full') setMessage(t('biosphere.hybrid.error_planet_full'));
      else if (raw.toLowerCase().includes('insufficient')) setMessage(t('biosphere.generate.no_quarks'));
      else setMessage(t('biosphere.hybrid.error_generic'));
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 60px)', right: 16, width: 320,
      maxHeight: 'calc(100% - 90px - env(safe-area-inset-top, 0px))',
      background: 'rgba(10,15,25,0.94)', border: '1px solid #334455', borderRadius: 4,
      padding: 16, zIndex: 5, fontFamily: 'monospace', overflowY: 'auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(50,60,80,0.3)',
      }}>
        <span style={{ color: '#ccddee', fontSize: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {t('biosphere.hybrid.title')}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#667788', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {phase === 'photo_done' && resultPhotoUrl ? (
        <div>
          <img
            src={resultPhotoUrl}
            alt={t('biosphere.hybrid.title')}
            style={{ width: '100%', borderRadius: 3, border: '1px solid #334455', display: 'block' }}
          />
          <p style={{ color: '#44ff88', fontSize: 10, margin: '8px 0 6px' }}>
            {t('biosphere.hybrid.result_ready')}
          </p>
          {resultTraits.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {resultTraits.map((m) => (
                <span key={`${m.category}:${m.trait}`} style={traitChipStyle}>
                  {t(`biosphere.trait.${m.category}.${m.trait}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5, margin: '0 0 10px' }}>
            {t('biosphere.hybrid.body')}
          </p>

          <p style={{ color: '#667788', fontSize: 9, margin: '0 0 6px' }}>
            {t('biosphere.hybrid.select_hint')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {eligibleCreatures.map((creature) => {
              const selected = selectedIds.includes(creature.id);
              return (
                <button
                  key={creature.id}
                  onClick={() => toggleSelect(creature.id)}
                  disabled={phase === 'submitting'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: 6, textAlign: 'left',
                    background: selected ? 'rgba(40,80,120,0.5)' : 'rgba(20,30,40,0.6)',
                    border: `1px solid ${selected ? '#7bb8ff' : '#334455'}`,
                    borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace',
                  }}
                >
                  {creature.image_url && (
                    <img
                      src={creature.image_url}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, border: '1px solid #334455', flexShrink: 0 }}
                    />
                  )}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', color: selected ? '#cfe3ff' : '#aaccee', fontSize: 10 }}>
                      {t(`biosphere.stage.${creature.stage ?? 'juvenile'}`)}
                      {(creature.generation ?? 1) > 1 && (
                        <span style={{ color: '#667788' }}> · {t('biosphere.generation_short', { gen: creature.generation })}</span>
                      )}
                    </span>
                    <span style={{
                      display: 'block', color: '#667788', fontSize: 8, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {creature.description}
                    </span>
                  </span>
                  {selected && <span style={{ color: '#7bb8ff', fontSize: 10 }}>[{selectedIds.indexOf(creature.id) + 1}]</span>}
                </button>
              );
            })}
          </div>

          {pairSelected && (
            <div style={{ marginBottom: 10, paddingTop: 8, borderTop: '1px solid rgba(50,60,80,0.3)' }}>
              <p style={{ color: '#8899aa', fontSize: 9, margin: '0 0 6px' }}>{t('biosphere.hybrid.traits_preview')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {traitPreview.map((m) => (
                  <span key={`${m.category}:${m.trait}`} style={traitChipStyle}>
                    {t(`biosphere.trait.${m.category}.${m.trait}`)}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => handleRun('photo')}
                  disabled={phase === 'submitting'}
                  style={tierButtonStyle(phase !== 'submitting')}
                >
                  {phase === 'submitting'
                    ? t('biosphere.generate.working')
                    : t('biosphere.hybrid.tier_photo', { cost: HYBRID_PHOTO_COST_QUARKS })}
                </button>
                <button
                  onClick={() => handleRun('full')}
                  disabled={phase === 'submitting' || planetFull}
                  style={tierButtonStyle(phase !== 'submitting' && !planetFull)}
                >
                  {phase === 'submitting'
                    ? t('biosphere.generate.working')
                    : t('biosphere.hybrid.tier_full', { cost: HYBRID_FULL_COST_QUARKS })}
                </button>
                {planetFull && (
                  <p style={{ color: '#ff8844', fontSize: 9, margin: 0 }}>
                    {t('biosphere.hybrid.error_planet_full')}
                  </p>
                )}
              </div>
            </div>
          )}

          {message && (
            <p style={{ color: '#cc4444', fontSize: 10, lineHeight: 1.4, margin: '0 0 4px' }}>
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function tierButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '7px 0',
    background: enabled ? 'rgba(30,60,80,0.6)' : 'rgba(30,60,80,0.25)',
    border: `1px solid ${enabled ? '#446688' : '#2a3a4a'}`,
    color: enabled ? '#aaccee' : '#556677',
    fontFamily: 'monospace', fontSize: 10, borderRadius: 3,
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

const traitChipStyle: React.CSSProperties = {
  padding: '2px 6px', background: 'rgba(40,80,120,0.3)', border: '1px solid #446688',
  color: '#aaccee', fontSize: 9, borderRadius: 3,
};

export default HybridizationPanel;
