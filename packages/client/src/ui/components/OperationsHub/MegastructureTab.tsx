import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceIcon, RESOURCE_COLORS, type ResourceType } from '../ResourceIcon.js';
import {
  fetchCurrentMegastructure,
  contributeMegastructure,
  type MegastructureCurrentResponse,
  type MegastructureResourceBundle,
  type MegastructureBuilderView,
} from '../../../api/megastructure-api.js';

// ---------------------------------------------------------------------------
// MegastructureTab — "Мегаструктура": the cluster's collective, weeks-long
// construction project. MVP structure is the "Галактичний маяк" (Galactic
// Beacon). See GAME_MODULES.md (Соціальне та спільнота).
// ---------------------------------------------------------------------------

interface MegastructureTabProps {
  playerId: string;
  colonyResources: MegastructureResourceBundle;
  /** Deducts colony resources for the applied contribution (client-authoritative,
   *  same mechanism as every other colony spend — see App.tsx spendResourcesAcrossPlanets). */
  onSpendResources: (delta: Partial<MegastructureResourceBundle>) => void;
  onAwardXP: (amount: number, reason: string) => void;
  onQuarksAwarded: (amount: number) => void;
}

const BORDER = '#334455';
const RESOURCE_ORDER: ResourceType[] = ['minerals', 'volatiles', 'isotopes', 'water'];
const GOLD = '#ffd700';
const SILVER = '#c0c8d8';
const BRONZE = '#cd8a4f';

function fmt(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString('en-US');
}

function BeaconGlyph({ progress, active }: { progress: number; active: boolean }) {
  const glowColor = active ? '#44ff88' : '#7bb8ff';
  const beamHeight = 6 + progress * 30;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="msBeam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {/* Beam */}
        <rect
          x="34" y={40 - beamHeight} width="4" height={beamHeight}
          fill="url(#msBeam)"
        >
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.6s" repeatCount="indefinite" />
        </rect>
        {/* Tower */}
        <path d="M30 66 L33 40 L39 40 L42 66 Z" fill="none" stroke="#8899aa" strokeWidth="1.4" />
        {/* Base platform */}
        <path d="M22 66 H50" stroke="#556677" strokeWidth="1.6" strokeLinecap="round" />
        {/* Beacon head */}
        <circle cx="36" cy="38" r="4.2" fill={active ? '#44ff88' : '#334455'} stroke={glowColor} strokeWidth="1.4">
          <animate attributeName="r" values="4;5;4" dur="2.6s" repeatCount="indefinite" />
        </circle>
        {/* Support struts */}
        <path d="M33 40 L26 58 M39 40 L46 58" stroke="#445566" strokeWidth="1" opacity="0.7" />
      </svg>
    </div>
  );
}

function MedalRank({ rank }: { rank: number }) {
  const color = rank === 1 ? GOLD : rank === 2 ? SILVER : rank === 3 ? BRONZE : '#667788';
  return <span style={{ color, fontSize: 10.5, minWidth: 22, display: 'inline-block' }}>#{rank}</span>;
}

export function MegastructureTab({ playerId, colonyResources, onSpendResources, onAwardXP, onQuarksAwarded }: MegastructureTabProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<MegastructureCurrentResponse | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<ResourceType>('minerals');
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completionToast, setCompletionToast] = useState<{ quarks: number; xp: number } | null>(null);
  const [contributedToast, setContributedToast] = useState<{ xp: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentMegastructure()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const megastructure = data?.megastructure ?? null;
  const requirements = megastructure?.requirements;
  const progress = megastructure?.progress;
  const remainingCapToday = data?.remainingCapToday ?? 0;

  const maxForSelected = useMemo(() => {
    if (!requirements || !progress) return 0;
    const remainingNeed = Math.max(0, requirements[selected] - progress[selected]);
    return Math.max(0, Math.floor(Math.min(colonyResources[selected] ?? 0, remainingNeed, remainingCapToday)));
  }, [requirements, progress, selected, colonyResources, remainingCapToday]);

  useEffect(() => {
    setAmount((prev) => Math.min(prev, maxForSelected));
  }, [maxForSelected]);

  if (error) {
    return <div style={{ color: '#667788', fontSize: 11, textAlign: 'center', marginTop: 40 }}>{t('megastructure.error')}</div>;
  }
  if (!data) {
    return <div style={{ color: '#667788', fontSize: 11, textAlign: 'center', marginTop: 40 }}>{t('megastructure.loading')}</div>;
  }
  if (!megastructure) {
    return <div style={{ color: '#667788', fontSize: 11, textAlign: 'center', marginTop: 40 }}>{t('megastructure.no_cluster')}</div>;
  }

  const isCompleted = megastructure.status === 'completed';
  const overallPct = requirements
    ? Math.min(100, Math.round(
        ((progress!.minerals + progress!.volatiles + progress!.isotopes + progress!.water)
          / Math.max(1, requirements.minerals + requirements.volatiles + requirements.isotopes + requirements.water)) * 100,
      ))
    : 0;

  const builders = data.builders ?? megastructure.builders ?? [];
  const myBuilder = builders.find((b) => b.playerId === playerId);

  async function handleContribute() {
    if (amount <= 0 || submitting || isCompleted) return;
    setSubmitting(true);
    try {
      const res = await contributeMegastructure({ [selected]: amount } as Partial<MegastructureResourceBundle>);
      const appliedAmount = res.applied[selected] ?? 0;
      if (appliedAmount > 0) {
        onSpendResources({ [selected]: -appliedAmount } as Partial<MegastructureResourceBundle>);
      }
      if (res.xpAwarded > 0) {
        onAwardXP(res.xpAwarded, 'megastructure_contribution');
        setContributedToast({ xp: res.xpAwarded });
        setTimeout(() => setContributedToast(null), 3500);
      }
      setData((prev) => prev ? {
        ...prev,
        megastructure: res.megastructure,
        remainingCapToday: res.remainingCapToday,
        hasContributedToday: true,
        myContributionToday: prev.myContributionToday
          ? { ...prev.myContributionToday, [selected]: (prev.myContributionToday[selected] ?? 0) + appliedAmount }
          : undefined,
        builders: res.builders,
      } : prev);
      setAmount(0);

      if (res.justCompleted) {
        const self = res.builders.find((b) => b.playerId === playerId);
        if (self) {
          onQuarksAwarded(self.quarksAwarded);
          if (self.xpAwarded > 0) onAwardXP(self.xpAwarded, 'megastructure_completion');
          setCompletionToast({ quarks: self.quarksAwarded, xp: self.xpAwarded });
        } else {
          setCompletionToast({ quarks: 0, xp: 0 });
        }
      }
    } catch {
      // Offline-tolerant — colony resources were never deducted, so nothing to undo.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#aabbcc', fontSize: 12, letterSpacing: 1 }}>{t('megastructure.title')}</span>
          <span style={{ color: isCompleted ? '#44ff88' : '#7bb8ff', fontSize: 9.5 }}>
            {isCompleted ? t('megastructure.status_completed') : t('megastructure.status_building')}
          </span>
        </div>
        <div style={{ color: '#667788', fontSize: 9.5, lineHeight: 1.5, marginTop: 4 }}>
          {t('megastructure.subtitle')}
        </div>

        <BeaconGlyph progress={overallPct / 100} active={isCompleted} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#8899aa', marginBottom: 4 }}>
          <span>{t('megastructure.overall_progress')}</span>
          <span>{overallPct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(51,68,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${overallPct}%`, height: '100%',
            background: isCompleted ? '#44ff88' : '#7bb8ff',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Completed banner */}
      {isCompleted && (
        <div style={{
          border: `1px solid ${GOLD}`, borderRadius: 4, padding: '10px 12px',
          background: 'rgba(255,215,0,0.08)', display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <span style={{ color: GOLD, fontSize: 11, letterSpacing: 0.5 }}>{t('megastructure.completed_banner')}</span>
          <span style={{ color: '#44ff88', fontSize: 10 }}>{t('megastructure.research_bonus')}</span>
          <span style={{ color: '#667788', fontSize: 9 }}>{t('megastructure.research_bonus_note')}</span>
          {megastructure.completedAt && (
            <span style={{ color: '#556677', fontSize: 9 }}>
              {t('megastructure.completed_at', { date: new Date(megastructure.completedAt).toLocaleDateString() })}
            </span>
          )}
        </div>
      )}

      {/* Completion / contribution toasts */}
      {completionToast && (
        <div style={{ border: `1px solid ${GOLD}`, borderRadius: 4, padding: '8px 12px', background: 'rgba(255,215,0,0.12)', color: GOLD, fontSize: 10.5 }}>
          {t('megastructure.completion_reward_toast', { quarks: completionToast.quarks, xp: completionToast.xp })}
        </div>
      )}
      {contributedToast && !completionToast && (
        <div style={{ border: '1px solid #44ff88', borderRadius: 4, padding: '8px 12px', background: 'rgba(68,255,136,0.08)', color: '#44ff88', fontSize: 10.5 }}>
          {t('megastructure.first_contribution_xp', { xp: contributedToast.xp })}
        </div>
      )}

      {/* Per-resource progress */}
      {requirements && progress && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RESOURCE_ORDER.map((key) => {
            const cur = progress[key];
            const need = requirements[key];
            const pct = need > 0 ? Math.min(100, Math.round((cur / need) * 100)) : 100;
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, marginBottom: 3 }}>
                  <ResourceIcon type={key} size={11} />
                  <span style={{ color: RESOURCE_COLORS[key], flex: 1 }}>{t(`megastructure.resource_${key}`)}</span>
                  <span style={{ color: '#667788' }}>{fmt(cur)} / {fmt(need)}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(51,68,85,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: RESOURCE_COLORS[key], transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contribute form */}
      {!isCompleted && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: '#aabbcc', fontSize: 11, letterSpacing: 0.5 }}>{t('megastructure.contribute_title')}</span>
            {!data.hasContributedToday && (
              <span style={{ color: '#ff8844', fontSize: 9 }}>{t('megastructure.not_contributed_today')}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {RESOURCE_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => setSelected(key)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '6px 4px', cursor: 'pointer',
                  border: `1px solid ${selected === key ? RESOURCE_COLORS[key] : BORDER}`,
                  borderRadius: 3,
                  background: selected === key ? `${RESOURCE_COLORS[key]}18` : 'transparent',
                  fontFamily: 'monospace',
                }}
              >
                <ResourceIcon type={key} size={13} />
                <span style={{ color: selected === key ? RESOURCE_COLORS[key] : '#667788', fontSize: 8.5 }}>
                  {t(`megastructure.resource_${key}`)}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#556677' }}>
            <span>{t('megastructure.available', { amount: fmt(colonyResources[selected] ?? 0) })}</span>
            <span>{t('megastructure.cap_remaining', { amount: fmt(remainingCapToday), cap: 500 })}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              min={0}
              max={Math.max(0, maxForSelected)}
              value={Math.min(amount, maxForSelected)}
              disabled={maxForSelected <= 0}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={0}
              max={maxForSelected}
              value={amount}
              disabled={maxForSelected <= 0}
              onChange={(e) => setAmount(Math.max(0, Math.min(maxForSelected, Math.floor(Number(e.target.value) || 0))))}
              style={{
                width: 64, background: 'rgba(10,15,25,0.6)', border: `1px solid ${BORDER}`, borderRadius: 3,
                color: '#aabbcc', fontFamily: 'monospace', fontSize: 11, padding: '4px 6px',
              }}
            />
            <button
              onClick={() => setAmount(maxForSelected)}
              disabled={maxForSelected <= 0}
              style={{
                border: `1px solid ${BORDER}`, borderRadius: 3, background: 'none', color: '#8899aa',
                fontFamily: 'monospace', fontSize: 9.5, padding: '5px 8px', cursor: maxForSelected > 0 ? 'pointer' : 'default',
              }}
            >
              {t('megastructure.max_button')}
            </button>
          </div>

          {maxForSelected <= 0 && (
            <div style={{ color: '#556677', fontSize: 9 }}>{t('megastructure.no_capacity')}</div>
          )}

          <button
            onClick={handleContribute}
            disabled={amount <= 0 || submitting}
            style={{
              border: `1px solid ${amount > 0 && !submitting ? '#44ff88' : BORDER}`,
              borderRadius: 4,
              background: amount > 0 && !submitting ? 'rgba(68,255,136,0.12)' : 'rgba(20,30,45,0.5)',
              color: amount > 0 && !submitting ? '#44ff88' : '#556677',
              fontFamily: 'monospace', fontSize: 11.5, letterSpacing: 1,
              padding: '10px', cursor: amount > 0 && !submitting ? 'pointer' : 'default',
            }}
          >
            {submitting ? t('megastructure.contributing') : t('megastructure.contribute_button')}
          </button>
        </div>
      )}

      {/* Builders — "Будівничі" leaderboard / eternal record */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: 'rgba(20,30,45,0.5)', padding: '10px 12px' }}>
        <div style={{ color: isCompleted ? GOLD : '#aabbcc', fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
          {t('megastructure.builders_title')}
        </div>
        {builders.length === 0 ? (
          <div style={{ color: '#667788', fontSize: 10, padding: '8px 0', textAlign: 'center' }}>{t('megastructure.builders_empty')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {builders.slice(0, 15).map((b: MegastructureBuilderView, i: number) => {
              const isMe = b.playerId === playerId;
              return (
                <div key={b.playerId} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px',
                  borderBottom: '1px solid rgba(51,68,85,0.3)',
                  background: isMe ? 'rgba(68,136,170,0.16)' : 'transparent',
                }}>
                  <MedalRank rank={i + 1} />
                  <span style={{ flex: 1, color: isMe ? '#aabbcc' : '#8899aa', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.playerName}{isMe ? ` ${t('megastructure.you_tag')}` : ''}
                  </span>
                  <span style={{ color: '#556677', fontSize: 9 }}>{t('megastructure.days_label', { count: b.days })}</span>
                  <span style={{ color: '#7bb8ff', fontSize: 9.5, minWidth: 42, textAlign: 'right' }}>
                    {Math.round(b.share * 100)}%
                  </span>
                  {isCompleted && (
                    <span style={{ color: GOLD, fontSize: 9, minWidth: 34, textAlign: 'right' }}>+{b.quarksAwarded}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {myBuilder && (
          <div style={{ color: '#8899aa', fontSize: 9.5, marginTop: 8 }}>
            {t('megastructure.your_share', { pct: Math.round(myBuilder.share * 100) })}
          </div>
        )}
      </div>
    </div>
  );
}
