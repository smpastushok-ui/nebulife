import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SEASON_DEFINITIONS,
  SEASON_COLLECTION_REWARD_QUARKS,
  getCurrentSeason,
  getCatalogEntry,
  getCatalogName,
  isSeasonCollectionComplete,
  type SeasonalProgressState,
  type CatalogEntry,
} from '@nebulife/core';

// ---------------------------------------------------------------------------
// SeasonHallGallery — compact "Сезони" archive block for the Cosmic Archive
// (Collections → "Сезони", alongside "Сигнали Предтеч"). Shows the active
// season's live progress plus a permanent "hall" of every past season this
// player fully completed.
// ---------------------------------------------------------------------------

export interface SeasonHallGalleryProps {
  seasonalProgress?: SeasonalProgressState;
  onClaimSeasonReward?: () => void;
  seasonClaiming?: boolean;
  lang: string;
}

export function SeasonHallGallery({ seasonalProgress, onClaimSeasonReward, seasonClaiming, lang }: SeasonHallGalleryProps) {
  const { t, i18n } = useTranslation();
  const language = lang || i18n.language;
  const now = Date.now();
  const currentSeason = useMemo(() => getCurrentSeason(now), [now]);

  const researchedTypes = seasonalProgress && seasonalProgress.seasonIndex === currentSeason.seasonIndex
    ? seasonalProgress.researchedTypes
    : [];
  const complete = seasonalProgress ? isSeasonCollectionComplete(seasonalProgress, now) : false;
  const claimed = seasonalProgress?.claimedSeasons.includes(currentSeason.occurrenceId) ?? false;
  const hall = seasonalProgress?.completedSeasons ?? [];

  return (
    <div>
      <div style={{ fontSize: 12, color: '#8899aa', letterSpacing: 0.5, marginBottom: 16 }}>
        {t('seasons.archive_counter', { count: hall.length })}
      </div>

      {/* Active season card */}
      <div
        style={{
          marginBottom: 18,
          padding: '12px 14px',
          border: `1px solid ${currentSeason.isFinale ? 'rgba(255,136,68,0.5)' : 'rgba(68,136,170,0.35)'}`,
          borderRadius: 5,
          background: 'rgba(10,15,25,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <div style={{ color: '#9fd0ff', fontSize: 13, fontWeight: 600 }}>
            {t(`seasons.name.${currentSeason.def.id}`)}
          </div>
          <div style={{ color: '#8899aa', fontSize: 10 }}>
            {t('seasons.days_remaining', { count: currentSeason.daysRemaining })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6, marginBottom: 10 }}>
          {currentSeason.def.anomalies.map((anomaly) => {
            const owned = researchedTypes.includes(anomaly.type);
            const entry = getCatalogEntry(anomaly.type) as CatalogEntry | undefined;
            const name = entry ? getCatalogName(entry, language) : anomaly.type;
            return (
              <div
                key={anomaly.type}
                title={owned ? name : t('seasons.slot_unresearched')}
                style={{
                  aspectRatio: '1',
                  borderRadius: 4,
                  border: `1px solid ${owned ? '#44ff88' : 'rgba(51,68,85,0.55)'}`,
                  background: owned ? 'rgba(68,255,136,0.12)' : 'rgba(5,10,20,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: owned ? '#44ff88' : '#334455',
                }}
              >
                {owned ? '\u2726' : '?'}
              </div>
            );
          })}
        </div>

        {complete && !claimed && (
          <button
            onClick={() => onClaimSeasonReward?.()}
            disabled={seasonClaiming}
            style={{
              width: '100%',
              background: 'rgba(68,255,136,0.14)',
              border: '1px solid rgba(68,255,136,0.55)',
              borderRadius: 3,
              color: '#88ffaa',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '7px 12px',
              cursor: seasonClaiming ? 'default' : 'pointer',
              opacity: seasonClaiming ? 0.6 : 1,
              letterSpacing: 0.5,
            }}
          >
            {seasonClaiming ? t('seasons.claiming') : t('seasons.claim_reward', { amount: SEASON_COLLECTION_REWARD_QUARKS })}
          </button>
        )}
        {complete && claimed && (
          <div style={{ fontSize: 10, color: '#556677', textAlign: 'center' }}>{t('seasons.reward_claimed')}</div>
        )}
      </div>

      {/* Hall of past completed seasons */}
      <div style={{ fontSize: 10, color: '#667788', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
        {t('seasons.hall_title')}
      </div>
      {hall.length === 0 ? (
        <div
          style={{
            background: 'rgba(5,10,20,0.42)',
            border: '1px solid rgba(51,68,85,0.55)',
            borderRadius: 5,
            padding: '10px 12px',
            color: '#667788',
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          {t('seasons.hall_empty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {hall.map((occurrenceId) => {
            const idx = Number(occurrenceId.split('-')[1] ?? -1);
            const def = Number.isFinite(idx) ? SEASON_DEFINITIONS[idx % SEASON_DEFINITIONS.length] : undefined;
            return (
              <div
                key={occurrenceId}
                style={{
                  border: '1px solid rgba(68,136,170,0.3)',
                  borderRadius: 4,
                  background: 'rgba(10,15,25,0.5)',
                  padding: '9px 10px',
                }}
              >
                <div style={{ fontSize: 11, color: '#9fd0ff' }}>
                  {def ? t(`seasons.name.${def.id}`) : occurrenceId}
                </div>
                <div style={{ fontSize: 9, color: '#556677', marginTop: 3 }}>
                  {t('seasons.hall_complete')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
