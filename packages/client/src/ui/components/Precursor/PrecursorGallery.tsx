import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PRECURSOR_CARDS,
  PRECURSOR_CARD_TOTAL,
  PRECURSOR_COMPLETION_REWARD_QUARKS,
  isPrecursorCollectionComplete,
  RARITY_COLORS,
  type DiscoveryRarity,
  type PrecursorCardOwned,
} from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';
import { PrecursorCardFace } from './PrecursorCardFace.js';

// ---------------------------------------------------------------------------
// PrecursorGallery — "Термінал" card gallery for the "Сигнали Предтеч"
// collection. Lives in Cosmic Archive → Collections → "Сигнали Предтеч".
// ---------------------------------------------------------------------------

const SFX_SLOTS = [1, 2, 3, 4] as const;

export interface PrecursorGalleryProps {
  owned: Record<string, PrecursorCardOwned>;
  sfxSlot: 1 | 2 | 3 | 4;
  onSfxSlotChange: (slot: 1 | 2 | 3 | 4) => void;
  completionRewardClaimed: boolean;
  onClaimCompletionReward: () => void;
  lang: string;
}

export function PrecursorGallery({
  owned,
  sfxSlot,
  onSfxSlotChange,
  completionRewardClaimed,
  onClaimCompletionReward,
  lang,
}: PrecursorGalleryProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ownedIds = useMemo(() => new Set(Object.keys(owned)), [owned]);
  const ownedCount = ownedIds.size;
  const complete = isPrecursorCollectionComplete(ownedIds);
  const detailDef = detail ? PRECURSOR_CARDS.find((c) => c.id === detail) : null;
  const detailOwned = detail ? owned[detail] : undefined;

  return (
    <div>
      {/* Counter + sfx picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#8899aa', letterSpacing: 0.5 }}>
          {t('precursor.counter', { count: ownedCount, total: PRECURSOR_CARD_TOTAL })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#556677', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('precursor.sfx_picker_label')}
          </span>
          {SFX_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => {
                onSfxSlotChange(slot);
                playSfx(`precursor/acquire-${slot}.mp3`, 0.5);
              }}
              title={t('precursor.sfx_slot', { n: slot })}
              style={{
                width: 24,
                height: 24,
                borderRadius: 3,
                border: `1px solid ${sfxSlot === slot ? '#7bb8ff' : 'rgba(68,102,136,0.4)'}`,
                background: sfxSlot === slot ? 'rgba(123,184,255,0.14)' : 'rgba(10,15,25,0.5)',
                color: sfxSlot === slot ? '#ccddee' : '#667788',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Completion reward */}
      {complete && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            border: `1px solid ${completionRewardClaimed ? 'rgba(68,102,136,0.3)' : 'rgba(68,255,136,0.4)'}`,
            borderRadius: 4,
            background: completionRewardClaimed ? 'rgba(15,20,30,0.4)' : 'rgba(68,255,136,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11, color: completionRewardClaimed ? '#667788' : '#88ffaa' }}>
            {completionRewardClaimed ? t('precursor.completion_reward_claimed') : t('precursor.completion_reward_available')}
          </span>
          {!completionRewardClaimed && (
            <button
              onClick={onClaimCompletionReward}
              style={{
                background: 'rgba(68,255,136,0.14)',
                border: '1px solid rgba(68,255,136,0.55)',
                borderRadius: 3,
                color: '#88ffaa',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '6px 12px',
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              {t('precursor.completion_reward_claim', { amount: PRECURSOR_COMPLETION_REWARD_QUARKS })}
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: isMobile ? 8 : 10,
        }}
      >
        {PRECURSOR_CARDS.map((card) => {
          const entry = owned[card.id];
          const isOwned = !!entry;
          const name = t(`precursor.names.${card.id}`);
          const color = RARITY_COLORS[card.rarity as DiscoveryRarity];

          if (!isOwned) {
            return (
              <div
                key={card.id}
                style={{
                  aspectRatio: '5 / 7',
                  borderRadius: 6,
                  border: `1px solid ${color}33`,
                  background: 'rgba(12, 16, 26, 0.55)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 6px',
                  gap: 6,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: `${color}44`,
                  }}
                />
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '1px solid rgba(51,68,85,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334455',
                    fontSize: 11,
                  }}
                >
                  ?
                </div>
                <div style={{ fontSize: 8, color: '#556677', textAlign: 'center', letterSpacing: 0.5, lineHeight: 1.4 }}>
                  {t('precursor.locked_label')}
                </div>
                {card.coreOnly && (
                  <div style={{ fontSize: 7, color: '#445566', textAlign: 'center', letterSpacing: 0.3, lineHeight: 1.3 }}>
                    {t('precursor.locked_core_hint')}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={card.id} onClick={() => setDetail(card.id)} style={{ cursor: 'pointer', width: '100%' }}>
              <PrecursorCardFace cardId={card.id} rarity={card.rarity} name={name} />
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {detailDef && (
        <div
          onClick={() => setDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10100,
            background: 'rgba(2,5,16,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 360,
              width: '100%',
              background: 'rgba(8,12,22,0.96)',
              border: `1px solid ${RARITY_COLORS[detailDef.rarity as DiscoveryRarity]}55`,
              borderRadius: 6,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <PrecursorCardFace cardId={detailDef.id} rarity={detailDef.rarity} width={160} height={224} />
            <div style={{ fontSize: 15, color: '#ccddee', textAlign: 'center' }}>
              {t(`precursor.names.${detailDef.id}`)}
            </div>
            <div style={{ fontSize: 10, color: RARITY_COLORS[detailDef.rarity as DiscoveryRarity], textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {t(`discovery_notification.rarity_${detailDef.rarity}`, { defaultValue: detailDef.rarity })}
            </div>
            <div style={{ fontSize: 11, color: '#8899aa', textAlign: 'center', lineHeight: 1.6 }}>
              {t(`precursor.lore.${detailDef.id}`)}
            </div>
            {detailOwned && (
              <div style={{ fontSize: 9, color: '#556677', textAlign: 'center' }}>
                {t('precursor.detail_acquired', { date: new Date(detailOwned.acquiredAt).toLocaleDateString(lang) })}
              </div>
            )}
            <button
              onClick={() => setDetail(null)}
              style={{
                marginTop: 4,
                background: 'rgba(20,30,45,0.6)',
                border: '1px solid rgba(68,102,136,0.4)',
                borderRadius: 3,
                color: '#8899aa',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '6px 16px',
                cursor: 'pointer',
              }}
            >
              {t('precursor.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
