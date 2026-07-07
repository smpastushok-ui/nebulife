// LineagePanel — simple generation-chain list for a planet's biosphere.
// Legacy elders (archived after spawning an offspring) and their descendants
// are listed oldest-first with their mutated traits, so the player can trace
// "Нове покоління" history without cluttering the 3D scene. Hybrids
// ("дослід схрещування") appear with a hybrid badge and BOTH parents.

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BiosphereCreature } from '../../../api/creature-api.js';

interface LineagePanelProps {
  creatures: BiosphereCreature[];
  onClose: () => void;
}

export function LineagePanel({ creatures, onClose }: LineagePanelProps) {
  const { t } = useTranslation();
  const sorted = [...creatures].sort((a, b) => {
    const genDiff = (a.generation ?? 1) - (b.generation ?? 1);
    if (genDiff !== 0) return genDiff;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });

  const byId = useMemo(() => new Map(creatures.map((c) => [c.id, c])), [creatures]);

  // Short human-readable reference to a parent row (creatures usually have no
  // name): "Пок. N" or the hybrid badge, matching the card headers.
  const parentLabel = (parentId: string | null): string | null => {
    if (!parentId) return null;
    const parent = byId.get(parentId);
    if (!parent) return t('biosphere.generation_short', { gen: '?' });
    return parent.is_hybrid
      ? `${t('biosphere.hybrid.badge')} ${t('biosphere.generation_short', { gen: parent.generation ?? 1 })}`
      : t('biosphere.generation_short', { gen: parent.generation ?? 1 });
  };

  return (
    <div style={{
      position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 60px)', left: 16, right: 16, bottom: 16,
      background: 'rgba(10,15,25,0.94)', border: '1px solid #334455', borderRadius: 4,
      padding: 16, zIndex: 5, fontFamily: 'monospace', boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      overflowY: 'auto', maxWidth: 420, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(50,60,80,0.3)',
      }}>
        <span style={{ color: '#ccddee', fontSize: 12, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {t('biosphere.lineage.title')}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#667788', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {sorted.length === 0 && (
        <p style={{ color: '#8899aa', fontSize: 10 }}>{t('biosphere.lineage.empty')}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((creature) => (
          <div
            key={creature.id}
            style={{
              display: 'flex', gap: 10, padding: 8,
              background: creature.stage === 'legacy' ? 'rgba(20,30,40,0.5)' : 'rgba(30,60,80,0.25)',
              border: '1px solid #2a3a4a', borderRadius: 3,
            }}
          >
            {(creature.hybrid_photo_url ?? creature.image_url) && (
              <img
                src={creature.hybrid_photo_url ?? creature.image_url ?? undefined}
                alt=""
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 3, border: '1px solid #334455', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ color: '#aaccee', fontSize: 10 }}>
                  {t('biosphere.generation_label', { gen: creature.generation ?? 1 })}
                  {creature.is_hybrid && (
                    <span style={{
                      marginLeft: 6, padding: '1px 5px', background: 'rgba(60,50,110,0.4)',
                      border: '1px solid #7766aa', color: '#bbaaee', fontSize: 8, borderRadius: 3,
                      textTransform: 'uppercase',
                    }}>
                      {t('biosphere.hybrid.badge')}
                    </span>
                  )}
                </span>
                <span style={{ color: creature.stage === 'legacy' ? '#667788' : creature.status === 'photo_ready' ? '#8899aa' : '#44ff88', fontSize: 9, textTransform: 'uppercase' }}>
                  {creature.status === 'photo_ready'
                    ? t('biosphere.hybrid.photo_badge')
                    : t(`biosphere.stage.${creature.stage ?? 'juvenile'}`)}
                </span>
              </div>
              {creature.is_hybrid && creature.parent_id && creature.parent_b_id && (
                <p style={{ color: '#667788', fontSize: 8, margin: '2px 0 0' }}>
                  {t('biosphere.hybrid.parents_label', {
                    parentA: parentLabel(creature.parent_id),
                    parentB: parentLabel(creature.parent_b_id),
                  })}
                </p>
              )}
              <p style={{ color: '#8899aa', fontSize: 9, margin: '4px 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {creature.description}
              </p>
              {Array.isArray(creature.traits) && creature.traits.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {creature.traits.map((m) => (
                    <span key={`${m.category}:${m.trait}`} style={{
                      padding: '1px 5px', background: 'rgba(40,80,120,0.3)', border: '1px solid #446688',
                      color: '#aaccee', fontSize: 8, borderRadius: 3,
                    }}>
                      {t(`biosphere.trait.${m.category}.${m.trait}`)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LineagePanel;
