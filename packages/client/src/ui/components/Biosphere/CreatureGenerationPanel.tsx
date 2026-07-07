// CreatureGenerationPanel — text-brief -> moderated portrait -> Tripo chain
// entry UI for the Biosphere scene. Mirrors the ship design flow's UX
// (hangar.ship_design keys) since the server pipeline is structurally the
// same: validate -> moderate -> quark gate -> generate -> poll.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { requestCreatureGeneration } from '../../../api/creature-api.js';

const MIN_LENGTH = 20;
const MAX_LENGTH = 400;

interface CreatureGenerationPanelProps {
  planetId: string;
  onClose: () => void;
  onGenerationStarted: (creatureId: string) => void;
}

type PanelPhase = 'idle' | 'submitting' | 'revision' | 'blocked' | 'error';

export function CreatureGenerationPanel({ planetId, onClose, onGenerationStarted }: CreatureGenerationPanelProps) {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<PanelPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [quarksPaid, setQuarksPaid] = useState<number | null>(null);

  const tooShort = description.trim().length > 0 && description.trim().length < MIN_LENGTH;
  const canSubmit = description.trim().length >= MIN_LENGTH && description.trim().length <= MAX_LENGTH && phase !== 'submitting';

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setPhase('submitting');
    setMessage(null);
    try {
      const res = await requestCreatureGeneration(planetId, description.trim());
      if (res.status === 'needs_revision') {
        setPhase('revision');
        setMessage(res.reason ?? t('biosphere.generate.revision_generic'));
        return;
      }
      if (res.status === 'blocked') {
        setPhase('blocked');
        setMessage(res.reason ?? t('biosphere.generate.revision_generic'));
        return;
      }
      if (res.creatureId) {
        setPreviewImageUrl(res.imageUrl ?? null);
        setQuarksPaid(res.quarksPaid ?? 0);
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
        position: 'absolute', top: 60, right: 16, width: 300,
        background: 'rgba(10,15,25,0.94)', border: '1px solid #334455', borderRadius: 4,
        padding: 16, zIndex: 5, fontFamily: 'monospace',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(50,60,80,0.3)',
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

      <p style={{ color: '#8899aa', fontSize: 10, lineHeight: 1.5, margin: '0 0 10px' }}>
        {t('biosphere.generate.body')}
      </p>

      {previewImageUrl ? (
        <div style={{ marginBottom: 10 }}>
          <img
            src={previewImageUrl}
            alt={t('biosphere.generate.title')}
            style={{ width: '100%', borderRadius: 3, border: '1px solid #334455', display: 'block' }}
          />
          <p style={{ color: '#44ff88', fontSize: 10, marginTop: 8 }}>
            {t('biosphere.generate.status_model')}
          </p>
          <p style={{ color: '#667788', fontSize: 9, marginTop: 4 }}>
            {quarksPaid === 0 ? t('biosphere.generate.free') : t('biosphere.generate.cost_paid', { cost: quarksPaid ?? 0 })}
          </p>
        </div>
      ) : (
        <>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH + 1))}
            placeholder={t('biosphere.generate.placeholder')}
            rows={4}
            disabled={phase === 'submitting'}
            style={{
              width: '100%', resize: 'none', boxSizing: 'border-box',
              background: 'rgba(20,30,40,0.8)', border: '1px solid #334455', borderRadius: 3,
              color: '#aabbcc', fontFamily: 'monospace', fontSize: 11, padding: 8,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0 8px' }}>
            <span style={{ color: tooShort ? '#ff8844' : '#556677', fontSize: 9 }}>
              {description.trim().length}/{MAX_LENGTH}
            </span>
            <span style={{ color: '#556677', fontSize: 9 }}>{t('biosphere.generate.cost_hint')}</span>
          </div>

          {message && (
            <p style={{
              color: phase === 'blocked' ? '#cc4444' : '#ff8844',
              fontSize: 10, lineHeight: 1.4, margin: '0 0 8px',
            }}>
              {message}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '8px 0',
              background: canSubmit ? 'rgba(30,60,80,0.6)' : 'rgba(30,60,80,0.25)',
              border: `1px solid ${canSubmit ? '#446688' : '#2a3a4a'}`,
              color: canSubmit ? '#aaccee' : '#556677',
              fontFamily: 'monospace', fontSize: 12, borderRadius: 3,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {phase === 'submitting' ? t('biosphere.generate.working') : t('biosphere.generate.generate')}
          </button>
        </>
      )}
    </div>
  );
}

export default CreatureGenerationPanel;
