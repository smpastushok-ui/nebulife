import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchRating, type RatingData, type LeaderboardRow } from '../../../api/retention-api.js';

// ---------------------------------------------------------------------------
// RatingTab — weekly cluster leaderboard (podium + list), permanent Hall of
// Fame (galaxy top-10 champions of the finished week) and achievements.
// ---------------------------------------------------------------------------

interface RatingTabProps {
  playerId: string;
}

const BORDER = '#334455';
const GOLD = '#ffd700';
const SILVER = '#c0c8d8';
const BRONZE = '#cd8a4f';

function displayName(row: { name: string; callsign: string | null }): string {
  return row.callsign?.trim() || row.name;
}

function MedalRank({ rank }: { rank: number }) {
  const color = rank === 1 ? GOLD : rank === 2 ? SILVER : rank === 3 ? BRONZE : '#667788';
  return (
    <span style={{ color, fontSize: 11, minWidth: 26, display: 'inline-block' }}>
      #{rank}
    </span>
  );
}

function Podium({ rows, myId }: { rows: LeaderboardRow[]; myId: string }) {
  const { t } = useTranslation();
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;
  // Visual order: 2nd, 1st, 3rd
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardRow[];
  const heights: Record<string, number> = {};
  if (top3[0]) heights[top3[0].player_id] = 74;
  if (top3[1]) heights[top3[1].player_id] = 54;
  if (top3[2]) heights[top3[2].player_id] = 42;
  const colors: Record<string, string> = {};
  if (top3[0]) colors[top3[0].player_id] = GOLD;
  if (top3[1]) colors[top3[1].player_id] = SILVER;
  if (top3[2]) colors[top3[2].player_id] = BRONZE;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '4px 6px 0' }}>
      {order.map((row) => {
        const c = colors[row.player_id];
        const isMe = row.player_id === myId;
        return (
          <div key={row.player_id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <div style={{
              color: c, fontSize: 10, maxWidth: '100%',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName(row)}{isMe ? ` (${t('ops.you')})` : ''}
            </div>
            <div style={{ color: '#7bb8ff', fontSize: 9 }}>{row.weekly_xp} XP</div>
            <div style={{
              width: '100%', height: heights[row.player_id],
              border: `1px solid ${c}`, borderBottom: 'none',
              borderRadius: '3px 3px 0 0',
              background: `linear-gradient(180deg, ${c}22, transparent)`,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 4, color: c, fontSize: 12,
            }}>
              {rows.indexOf(row) + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RatingTab({ playerId }: RatingTabProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<RatingData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRating()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <div style={{ color: '#667788', fontSize: 11, textAlign: 'center', marginTop: 40 }}>{t('ops.rating_error')}</div>;
  }
  if (!data) {
    return <div style={{ color: '#667788', fontSize: 11, textAlign: 'center', marginTop: 40 }}>{t('ops.loading')}</div>;
  }

  const { rows, myRank, hallOfFame, achievements } = data;
  const restRows = rows.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── My cluster, current week ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)' }}>
        <div style={{
          padding: '8px 12px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ color: '#aabbcc', fontSize: 11, letterSpacing: 1 }}>{t('ops.my_cluster')}</span>
          <span style={{ color: '#667788', fontSize: 9 }}>{t('ops.week_of', { week: data.week })}</span>
        </div>

        {rows.length === 0 ? (
          <div style={{ color: '#667788', fontSize: 10, padding: 16, textAlign: 'center' }}>{t('ops.rating_empty')}</div>
        ) : (
          <>
            <Podium rows={rows} myId={playerId} />
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {restRows.map((row, i) => {
                const rank = i + 4;
                const isMe = row.player_id === playerId;
                return (
                  <div key={row.player_id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px',
                    background: isMe ? 'rgba(68,136,170,0.16)' : 'transparent',
                    borderBottom: '1px solid rgba(51,68,85,0.35)',
                  }}>
                    <MedalRank rank={rank} />
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: row.is_online ? '#44ff88' : '#334455',
                    }} />
                    <span style={{
                      flex: 1, color: isMe ? '#aabbcc' : '#8899aa', fontSize: 10.5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {displayName(row)}{isMe ? ` (${t('ops.you')})` : ''}
                      {row.champion_weeks > 0 && (
                        <span style={{ color: GOLD, marginLeft: 6, fontSize: 9 }}>★{row.champion_weeks}</span>
                      )}
                    </span>
                    <span style={{ color: '#556677', fontSize: 9 }}>L{row.player_level}</span>
                    <span style={{ color: '#7bb8ff', fontSize: 10, minWidth: 56, textAlign: 'right' }}>{row.weekly_xp} XP</span>
                  </div>
                );
              })}
            </div>
            {myRank != null && (
              <div style={{ padding: '8px 12px', color: '#8899aa', fontSize: 10 }}>
                {t('ops.my_rank', { rank: myRank })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Hall of Fame ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)' }}>
        <div style={{
          padding: '8px 12px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ color: GOLD, fontSize: 11, letterSpacing: 1 }}>{t('ops.hall_of_fame')}</span>
          {hallOfFame.week && <span style={{ color: '#667788', fontSize: 9 }}>{t('ops.week_of', { week: hallOfFame.week })}</span>}
        </div>

        {hallOfFame.top.length === 0 ? (
          <div style={{ color: '#667788', fontSize: 10, padding: 16, textAlign: 'center' }}>{t('ops.hof_empty')}</div>
        ) : (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* #1 — gold hero card with shimmer */}
            {hallOfFame.top[0] && (
              <div style={{
                border: `1px solid ${GOLD}`, borderRadius: 4, padding: '12px 14px',
                background: `linear-gradient(110deg, rgba(255,215,0,0.10) 30%, rgba(255,215,0,0.28) 45%, rgba(255,215,0,0.10) 60%)`,
                backgroundSize: '200% 100%',
                animation: 'opsGoldShimmer 3.2s linear infinite',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ color: GOLD, fontSize: 22 }}>#1</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: GOLD, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hallOfFame.top[0].player_name}
                    {hallOfFame.top[0].player_id === playerId ? ` (${t('ops.you')})` : ''}
                  </div>
                  <div style={{ color: '#8899aa', fontSize: 9.5, marginTop: 2 }}>
                    {t('ops.galaxy_champion')} · {hallOfFame.top[0].weekly_xp} XP
                  </div>
                </div>
                <div style={{ color: GOLD, fontSize: 11, whiteSpace: 'nowrap' }}>
                  +{hallOfFame.top[0].reward_quarks} {t('ops.quarks_short')}
                </div>
              </div>
            )}
            {/* #2 — #10 */}
            {hallOfFame.top.slice(1).map((champ) => (
              <div key={champ.player_id + champ.week_date} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px',
                borderBottom: '1px solid rgba(51,68,85,0.3)',
                background: champ.player_id === playerId ? 'rgba(68,136,170,0.16)' : 'transparent',
              }}>
                <MedalRank rank={champ.global_rank ?? 0} />
                <span style={{
                  flex: 1, color: '#8899aa', fontSize: 10.5,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {champ.player_name}{champ.player_id === playerId ? ` (${t('ops.you')})` : ''}
                </span>
                <span style={{ color: '#7bb8ff', fontSize: 10 }}>{champ.weekly_xp} XP</span>
                <span style={{ color: GOLD, fontSize: 9.5, minWidth: 34, textAlign: 'right' }}>+{champ.reward_quarks}</span>
              </div>
            ))}
            {hallOfFame.myClusterChampion && !hallOfFame.top.some((c) => c.player_id === hallOfFame.myClusterChampion!.player_id) && (
              <div style={{ color: '#8899aa', fontSize: 9.5, paddingTop: 4 }}>
                {t('ops.my_cluster_champion', { name: hallOfFame.myClusterChampion.player_name })}
              </div>
            )}
          </div>
        )}

        {/* Reward explainer */}
        <div style={{ padding: '6px 12px 10px', color: '#556677', fontSize: 9, lineHeight: 1.5 }}>
          {t('ops.hof_rules')}
        </div>
      </div>

      {/* ── Achievements ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px' }}>
        <div style={{ color: '#aabbcc', fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>{t('ops.achievements')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AchievementBadge
            active={achievements.championWeeks > 0}
            color={GOLD}
            label={t('ops.ach_champion', { count: achievements.championWeeks })}
          />
          <AchievementBadge
            active={achievements.top10Weeks > 0}
            color={SILVER}
            label={t('ops.ach_top10', { count: achievements.top10Weeks })}
          />
          <AchievementBadge
            active={achievements.bestGlobalRank != null}
            color="#7bb8ff"
            label={achievements.bestGlobalRank != null
              ? t('ops.ach_best_rank', { rank: achievements.bestGlobalRank })
              : t('ops.ach_best_rank_none')}
          />
        </div>
      </div>
    </div>
  );
}

function AchievementBadge({ active, color, label }: { active: boolean; color: string; label: string }) {
  return (
    <div style={{
      border: `1px solid ${active ? color : '#2a3a4a'}`,
      borderRadius: 3, padding: '6px 10px',
      color: active ? color : '#556677',
      fontSize: 9.5, background: active ? `${color}14` : 'transparent',
    }}>
      {label}
    </div>
  );
}
