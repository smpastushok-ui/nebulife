import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DailyDirectiveState, DirectiveDef, CometSchedule } from '@nebulife/core';
import { DirectivesTab } from './DirectivesTab.js';
import { RatingTab } from './RatingTab.js';
import { SignalsTab } from './SignalsTab.js';
import { EventTab } from './EventTab.js';

// ---------------------------------------------------------------------------
// OperationsHub — retention center: daily directives, cluster rating,
// signal minigames and live events. Opened from the CommandBar.
// ---------------------------------------------------------------------------

export type OpsTab = 'directives' | 'rating' | 'signals' | 'event';

export interface OperationsHubProps {
  initialTab?: OpsTab;
  onClose: () => void;
  playerId: string;
  playerLevel: number;
  // Directives
  directiveState: DailyDirectiveState;
  directives: DirectiveDef[];
  directiveStreak: number;
  claimedToday: boolean;
  claiming: boolean;
  onClaimDirectives: () => void;
  // Signals
  onSignalDecodeWin: () => void;
  // Comet event
  cometSchedule: CometSchedule;
  cometClaimed: boolean;
  cometTrackingStartedAt: number | null;
  cometClaiming: boolean;
  onStartCometTracking: () => void;
}

const PANEL_BG = 'rgba(10,15,25,0.97)';
const BORDER = '#334455';

export function OperationsHub(props: OperationsHubProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<OpsTab>(props.initialTab ?? 'directives');

  const directivesDone = props.directives.filter(
    (d) => (props.directiveState.progress[d.metric] ?? 0) >= d.target,
  ).length;
  const directivesBadge = !props.claimedToday && directivesDone >= props.directives.length && props.directives.length > 0;
  const eventBadge = props.cometSchedule.active && !props.cometClaimed;

  const tabs: Array<{ id: OpsTab; label: string; badge?: boolean }> = [
    { id: 'directives', label: t('ops.tab_directives'), badge: directivesBadge },
    { id: 'rating', label: t('ops.tab_rating') },
    { id: 'signals', label: t('ops.tab_signals') },
    { id: 'event', label: t('ops.tab_event'), badge: eventBadge },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9650,
        background: 'rgba(2,5,16,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}
      onClick={props.onClose}
    >
      <style>{`
        @keyframes opsHubIn { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }
        @keyframes opsBadgePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes opsGoldShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes opsSoftPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(123,184,255,0.0); } 50% { box-shadow: 0 0 14px 2px rgba(123,184,255,0.25); } }
        .ops-scroll::-webkit-scrollbar { width: 6px; }
        .ops-scroll::-webkit-scrollbar-thumb { background: #334455; border-radius: 3px; }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(680px, calc(100vw - 16px))',
          height: 'min(82vh, 760px)',
          background: PANEL_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'opsHubIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ color: '#aabbcc', fontSize: 13, letterSpacing: 2 }}>
            {t('ops.title')}
          </div>
          <button
            onClick={props.onClose}
            style={{
              background: 'none', border: `1px solid ${BORDER}`, borderRadius: 3,
              color: '#8899aa', fontFamily: 'monospace', fontSize: 11,
              padding: '4px 10px', cursor: 'pointer',
            }}
          >
            {t('common.close', 'X')}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                flex: 1, position: 'relative',
                background: tab === item.id ? 'rgba(68,136,170,0.14)' : 'transparent',
                border: 'none',
                borderBottom: tab === item.id ? '2px solid #4488aa' : '2px solid transparent',
                color: tab === item.id ? '#aabbcc' : '#667788',
                fontFamily: 'monospace', fontSize: 'clamp(9px, 2.4vw, 11px)',
                letterSpacing: 0.8, padding: '10px 4px', cursor: 'pointer',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {item.label}
              {item.badge && (
                <span style={{
                  position: 'absolute', top: 6, right: 8,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#44ff88',
                  animation: 'opsBadgePulse 1.6s infinite',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="ops-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {tab === 'directives' && (
            <DirectivesTab
              state={props.directiveState}
              directives={props.directives}
              streak={props.directiveStreak}
              claimedToday={props.claimedToday}
              claiming={props.claiming}
              onClaim={props.onClaimDirectives}
            />
          )}
          {tab === 'rating' && <RatingTab playerId={props.playerId} />}
          {tab === 'signals' && (
            <SignalsTab
              playerId={props.playerId}
              onDecodeWin={props.onSignalDecodeWin}
            />
          )}
          {tab === 'event' && (
            <EventTab
              schedule={props.cometSchedule}
              claimed={props.cometClaimed}
              trackingStartedAt={props.cometTrackingStartedAt}
              claiming={props.cometClaiming}
              onStartTracking={props.onStartCometTracking}
            />
          )}
        </div>
      </div>
    </div>
  );
}
