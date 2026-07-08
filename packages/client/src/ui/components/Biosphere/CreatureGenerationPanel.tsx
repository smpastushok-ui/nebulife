// CreatureGenerationPanel — element-experiment synthesis UI for the
// Biosphere scene. The player picks 2-4 elements (order matters: slot 1
// shapes the body plan, slot 2 the surface, slots 3-4 add accents) and
// optionally includes the planet's environment factor; the server builds
// the image prompt deterministically from that recipe — no free text.

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CREATURE_ELEMENTS,
  CREATURE_EXPERIMENT_MAX_ELEMENTS,
  CREATURE_EXPERIMENT_MIN_ELEMENTS,
  ELEMENTS,
  type CreatureBiome,
} from '@nebulife/core';
import { requestCreatureGeneration } from '../../../api/creature-api.js';

interface CreatureGenerationPanelProps {
  planetId: string;
  /** Planet's biome id — the optional "environment factor" of the experiment. */
  biome: CreatureBiome;
  onClose: () => void;
  onGenerationStarted: (creatureId: string) => void;
}

type PanelPhase = 'idle' | 'submitting' | 'error';

const SYNTH_STEP_KEYS = [
  'biosphere.experiment.synth_mixing',
  'biosphere.experiment.synth_stabilizing',
  'biosphere.experiment.synth_growing',
] as const;

export function CreatureGenerationPanel({ planetId, biome, onClose, onGenerationStarted }: CreatureGenerationPanelProps) {
  const { t, i18n } = useTranslation();
  const uk = i18n.language?.startsWith('uk');
  const [selected, setSelected] = useState<string[]>([]);
  const [envEnabled, setEnvEnabled] = useState(true);
  const [phase, setPhase] = useState<PanelPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [quarksPaid, setQuarksPaid] = useState<number | null>(null);
  const [photoOnly, setPhotoOnly] = useState(false);
  const [synthStep, setSynthStep] = useState(0);
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synthesis "animation": cycle through the lab step labels while the
  // server experiment runs (JS-driven — no CSS keyframes, perf-tier safe).
  useEffect(() => {
    if (phase !== 'submitting') {
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      return;
    }
    setSynthStep(0);
    synthTimerRef.current = setInterval(() => {
      setSynthStep((s) => (s + 1) % SYNTH_STEP_KEYS.length);
    }, 1100);
    return () => {
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
    };
  }, [phase]);

  const toggleElement = (symbol: string) => {
    if (phase === 'submitting') return;
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= CREATURE_EXPERIMENT_MAX_ELEMENTS) return prev;
      return [...prev, symbol];
    });
  };

  const canRun = selected.length >= CREATURE_EXPERIMENT_MIN_ELEMENTS
    && selected.length <= CREATURE_EXPERIMENT_MAX_ELEMENTS
    && phase !== 'submitting';

  const handleRun = async () => {
    if (!canRun) return;
    setPhase('submitting');
    setMessage(null);
    setPhotoOnly(false);
    try {
      const res = await requestCreatureGeneration(planetId, selected, envEnabled ? biome : null);
      if (res.creatureId) {
        setPreviewImageUrl(res.imageUrl ?? null);
        setQuarksPaid(res.quarksPaid ?? 0);
        // Tripo was unavailable at creation time — the portrait still landed,
        // just without a 3D model (retryable later from the creature's card).
        setPhotoOnly(res.status === 'photo_ready');
        setPhase('idle');
        onGenerationStarted(res.creatureId);
        return;
      }
      setPhase('error');
      setMessage(t('biosphere.generate.status_failed'));
    } catch (err) {
      setPhase('error');
      const raw = err instanceof Error ? err.message : String(err);
      setMessage(raw.toLowerCase().includes('insufficient') ? t('biosphere.generate.no_quarks') : raw);
    }
  };

  return (
    <div
      style={{
        position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 60px)', right: 16, width: 300,
        maxHeight: 'calc(100% - 90px - env(safe-area-inset-top, 0px))',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(10,15,25,0.94)', border: '1px solid #334455', borderRadius: 4,
        padding: 16, zIndex: 5, fontFamily: 'monospace', boxSizing: 'border-box',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(50,60,80,0.3)', flexShrink: 0,
      }}>
        <span style={{ color: '#ccddee', fontSize: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {t('biosphere.generate.title')}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#667788', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {previewImageUrl ? (
        <div style={{ overflowY: 'auto' }}>
          <img
            src={previewImageUrl}
            alt={t('biosphere.generate.title')}
            style={{ width: '100%', borderRadius: 3, border: '1px solid #334455', display: 'block' }}
          />
          <p style={{ color: photoOnly ? '#ff8844' : '#44ff88', fontSize: 10, marginTop: 8 }}>
            {t(photoOnly ? 'biosphere.generate.status_photo_only' : 'biosphere.generate.status_model')}
          </p>
          <p style={{ color: '#667788', fontSize: 9, marginTop: 4 }}>
            {quarksPaid === 0 ? t('biosphere.generate.free') : t('biosphere.generate.cost_paid', { cost: quarksPaid ?? 0 })}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <p style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5, margin: '0 0 6px', flexShrink: 0 }}>
            {t('biosphere.experiment.body')}
          </p>
          <p style={{ color: '#667788', fontSize: 9, lineHeight: 1.4, margin: '0 0 8px', flexShrink: 0 }}>
            {t('biosphere.experiment.slots_hint')}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            overflowY: 'auto', minHeight: 0, paddingRight: 2,
          }}>
            {CREATURE_ELEMENTS.map((def) => {
              const el = ELEMENTS[def.symbol];
              const slot = selected.indexOf(def.symbol);
              const isSelected = slot >= 0;
              const atLimit = !isSelected && selected.length >= CREATURE_EXPERIMENT_MAX_ELEMENTS;
              return (
                <button
                  key={def.symbol}
                  type="button"
                  onClick={() => toggleElement(def.symbol)}
                  disabled={phase === 'submitting' || atLimit}
                  style={{
                    textAlign: 'left', padding: '6px 7px', borderRadius: 3,
                    background: isSelected ? 'rgba(40,80,120,0.45)' : 'rgba(20,30,40,0.8)',
                    border: `1px solid ${isSelected ? '#4488aa' : '#334455'}`,
                    color: '#aabbcc', fontFamily: 'monospace',
                    cursor: phase === 'submitting' || atLimit ? 'not-allowed' : 'pointer',
                    opacity: atLimit ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: isSelected ? '#aaccee' : '#8899aa', fontSize: 11, fontWeight: 700 }}>
                      {def.symbol}
                    </span>
                    {isSelected && (
                      <span style={{
                        color: '#7bb8ff', fontSize: 8, border: '1px solid #446688',
                        borderRadius: 3, padding: '0 4px',
                      }}>
                        {slot + 1}
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#aabbcc', fontSize: 9, marginTop: 1 }}>
                    {el ? (uk ? el.nameUk : el.name) : def.symbol}
                  </div>
                  <div style={{ color: '#667788', fontSize: 8, lineHeight: 1.3, marginTop: 2 }}>
                    {t(`biosphere.experiment.hint.${def.symbol}`)}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => phase !== 'submitting' && setEnvEnabled((v) => !v)}
              style={{
                width: '100%', marginTop: 8, padding: '5px 8px', textAlign: 'left',
                background: envEnabled ? 'rgba(30,60,50,0.4)' : 'rgba(20,30,40,0.6)',
                border: `1px solid ${envEnabled ? '#448866' : '#334455'}`,
                borderRadius: 3, fontFamily: 'monospace',
                cursor: phase === 'submitting' ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{ color: '#8899aa', fontSize: 9 }}>
                {t('biosphere.experiment.env_label')}: <span style={{ color: envEnabled ? '#88ccaa' : '#667788' }}>{t(`biosphere.experiment.biome.${biome}`)}</span>
              </span>
              <span style={{ color: envEnabled ? '#44ff88' : '#556677', fontSize: 9 }}>
                {envEnabled ? t('biosphere.experiment.env_on') : t('biosphere.experiment.env_off')}
              </span>
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0 8px' }}>
              <span style={{ color: selected.length < CREATURE_EXPERIMENT_MIN_ELEMENTS ? '#ff8844' : '#556677', fontSize: 9 }}>
                {t('biosphere.experiment.selected_count', {
                  num: selected.length,
                  max: CREATURE_EXPERIMENT_MAX_ELEMENTS,
                })}
              </span>
              <span style={{ color: '#556677', fontSize: 9 }}>{t('biosphere.generate.cost_hint')}</span>
            </div>

            {message && (
              <p style={{ color: '#ff8844', fontSize: 10, lineHeight: 1.4, margin: '0 0 8px' }}>
                {message}
              </p>
            )}

            {phase === 'submitting' ? (
              <div style={{
                padding: '8px 10px', background: 'rgba(20,35,45,0.7)',
                border: '1px solid #446688', borderRadius: 3,
              }}>
                <div style={{ color: '#aaccee', fontSize: 10, marginBottom: 6 }}>
                  {t(SYNTH_STEP_KEYS[synthStep])}
                </div>
                <div style={{ height: 3, background: 'rgba(50,70,90,0.5)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#4488aa', borderRadius: 2,
                    width: `${((synthStep + 1) / SYNTH_STEP_KEYS.length) * 100}%`,
                    transition: 'width 0.9s linear',
                  }} />
                </div>
              </div>
            ) : (
              <button
                onClick={handleRun}
                disabled={!canRun}
                style={{
                  width: '100%', padding: '8px 0',
                  background: canRun ? 'rgba(30,60,80,0.6)' : 'rgba(30,60,80,0.25)',
                  border: `1px solid ${canRun ? '#446688' : '#2a3a4a'}`,
                  color: canRun ? '#aaccee' : '#556677',
                  fontFamily: 'monospace', fontSize: 12, borderRadius: 3,
                  cursor: canRun ? 'pointer' : 'not-allowed',
                }}
              >
                {t('biosphere.experiment.run')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatureGenerationPanel;
