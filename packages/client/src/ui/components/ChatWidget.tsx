import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n/index.js';
import { playSfx } from '../../audio/SfxPlayer.js';
import {
  sendMessage,
  getMessages,
  getDMChannels,
  dmChannelId,
  reportMessage,
  getUnreadSummary,
  markMessageChannelRead,
  type MessageData,
  type DMChannelInfo,
} from '../../api/messages-api.js';
import { askAstra, type AstraMessage } from '../../api/ai-api.js';
import { getActivePoll, castPollVote, type ActivePollView } from '../../api/polls-api.js';
import { NewDMModal } from './NewDMModal.js';
import { PlayerFeedbackPrompt } from './PlayerFeedbackPrompt.js';
import { AstraFabButton, getAstraFabPosition, isVerticalSideChatLayout } from './AstraFabButton.js';
import type { LogEntry, LogCategory } from './CosmicArchive/SystemLog.js';
import type { Discovery } from '@nebulife/core';
import type { ElementResult } from './ColonyCenter/ElementResultCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a timestamp for display: time-only if today, "D Mon HH:MM" otherwise */
function fmtTime(value: string | number): string {
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
  const timePart = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timePart;
  const datePart = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  return `${datePart} ${timePart}`;
}

// ---------------------------------------------------------------------------
// ChatWidget — minimized messenger at bottom-right
// ---------------------------------------------------------------------------

export interface SystemNotif {
  id: string;
  text: string;
  planetName: string;
  systemId: string;
  planetId: string;
  timestamp: number;
  read: boolean;
  /** When set, this is a lifeform-found notif — shows a "view specimen" button. */
  lifeformId?: string;
  /** When set, this is an observatory-report notif — shows a "переглянути"
   *  button that re-opens the discovery reveal. */
  discovery?: Discovery;
  /** When set, this is a manual-job result notif (separation / lab) — shows a
   *  "переглянути" button that re-opens the visual result card. */
  result?: ElementResult;
}

interface ChatWidgetProps {
  playerId: string;
  playerName: string;
  onUnreadChange?: (count: number) => void;
  systemNotifs?: SystemNotif[];
  logEntries?: LogEntry[];
  onSystemNotifRead?: (id: string) => void;
  onNavigateToPlanet?: (systemId: string, planetId: string) => void | boolean | Promise<void | boolean>;
  onNavigateToSystem?: (systemId: string) => void | boolean | Promise<void | boolean>;
  onOpenPlanetMissionReport?: (systemId: string, planetId: string) => void | boolean | Promise<void | boolean>;
  onOpenSystemReport?: (systemId: string) => void | boolean | Promise<void | boolean>;
  onOpenLogDiscovery?: (entry: LogEntry) => void | boolean | Promise<void | boolean>;
  /** Open the specimen card in the Cosmic Archive Life gallery. */
  onOpenLifeform?: (lifeformId: string) => void | boolean | Promise<void | boolean>;
  /** Re-open an observatory discovery reveal from a system-chat report notif. */
  onOpenObservatoryReport?: (discovery: Discovery) => void | boolean | Promise<void | boolean>;
  /** Re-open a manual-job result card (separation / lab) from a report notif. */
  onOpenResult?: (result: ElementResult) => void | boolean | Promise<void | boolean>;
  /** week_date of the most recently seen digest (from player.last_digest_seen) */
  lastDigestSeen?: string | null;
  /** week_date of the latest complete digest (fetched on app load) */
  latestDigestWeekDate?: string | null;
  /** Player's preferred language for ASTRA digest message */
  preferredLanguage?: string;
  /** True while the weekly digest is being fetched (disables "open digest" buttons). */
  digestLoading?: boolean;
  /** Callback to award XP (e.g. for quiz correct answers) */
  onAwardXP?: (amount: number, reason: string) => void;
  quizAnswers?: Record<string, number>;
  onQuizAnswer?: (messageId: string, selectedIndex: number) => void;
  onDigestSeen?: (weekDate: string) => void;
  /** Player level — global chat send requires level 10+ */
  playerLevel?: number;
  /** When true, force the widget into collapsed state (e.g. while tutorial is active). */
  forceCollapsed?: boolean;
  /** When true, force the widget into expanded/open state. */
  forceExpanded?: boolean;
  /** Hide the collapsed FAB (e.g. tutorial sound-only mode uses its own ASTRA button). */
  hideCollapsedButton?: boolean;
  /** Premium unlock state for A.S.T.R.A. chat. */
  isPremium?: boolean;
}

type Tab = 'global' | 'dm-list' | 'dm-chat' | 'system' | 'astra';

const LOG_CATEGORY_I18N_KEYS: Record<LogCategory, string> = {
  economy: 'log.cat_economy',
  science: 'log.cat_science',
  expedition: 'log.cat_expedition',
  system: 'log.cat_system',
};

const LOG_CATEGORY_COLORS: Record<LogCategory, string> = {
  economy: '#cc8822',
  science: '#4488aa',
  expedition: '#44ff88',
  system: '#667788',
};

const SYSTEM_ACTION_BUTTON_STYLE: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: 'rgba(34,102,170,0.25)',
  border: '1px solid #4488aa',
  borderRadius: 3,
  color: '#7bb8ff',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '3px 10px',
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Neon pulse animation — mirrors scp-neon-pulse from SceneControlsPanel
// Used on collapsed button when there are unread messages
// ---------------------------------------------------------------------------
const CHAT_PULSE_STYLE_ID = 'chat-neon-pulse-style';
const CHAT_PULSE_KEYFRAMES = `
@keyframes chat-neon-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(68,136,255,0.25); border-color: rgba(68,136,255,0.35); }
  50%       { box-shadow: 0 0 14px rgba(68,136,255,0.55), 0 0 4px rgba(68,136,255,0.3) inset; border-color: rgba(68,136,255,0.65); }
}
@keyframes quizXpFloat {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-28px); }
}`;

// Legacy daily "new Academy lesson" notifications. The cron that produced them
// is retired (lesson base is fixed), but old rows remain in chat history —
// hide them client-side so the A.S.T.R.A. feed isn't cluttered with stale spam.
const LEGACY_LESSON_NOTIFS = new Set([
  'Новий урок Космічної Академії доступний. Відкрийте Академію для навчання.',
  'A new Cosmic Academy lesson is available. Open the Academy to study.',
]);

function filterLegacyLessonNotifs(msgs: MessageData[]): MessageData[] {
  return msgs.filter((m) => !LEGACY_LESSON_NOTIFS.has(m.content.trim()));
}

function getDigestWeekDateFromMessage(msg: MessageData): string | null {
  if (msg.sender_id !== 'astra' && msg.sender_id !== 'system') return null;
  try {
    const parsed = JSON.parse(msg.content) as { type?: string; weekDate?: unknown };
    return parsed?.type === 'digest' && typeof parsed.weekDate === 'string'
      ? parsed.weekDate
      : null;
  } catch {
    return null;
  }
}

// Exported as React.memo below. ChatWidget is always mounted while the
// player is in-game, so unrelated App.tsx state changes (tutorial steps,
// research ticks, countdown, etc.) previously forced a full re-render of
// the entire chat tree. Memo blocks those; real chat updates come from
// this component's own internal polling + setState so they still render.
function ChatWidgetInner({ playerId, playerName, onUnreadChange, systemNotifs = [], logEntries = [], onSystemNotifRead, onNavigateToPlanet, onNavigateToSystem, onOpenPlanetMissionReport, onOpenSystemReport, onOpenLogDiscovery, onOpenLifeform, onOpenObservatoryReport, onOpenResult, lastDigestSeen, latestDigestWeekDate, preferredLanguage, digestLoading = false, onAwardXP, quizAnswers = {}, onQuizAnswer, onDigestSeen, playerLevel = 1, forceCollapsed = false, forceExpanded = false, hideCollapsedButton = false, isPremium = false }: ChatWidgetProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const verticalSideLayout = isVerticalSideChatLayout(viewport.width, viewport.height);

  // When the tutorial (or another external gate) activates, collapse the chat
  // so it stops covering the tutorial UI. We only react to the rising edge so
  // the user can still manually close the chat themselves — but any attempt to
  // keep it open is immediately overridden while forceCollapsed is true.
  useEffect(() => {
    if (forceCollapsed && !collapsed) setCollapsed(true);
  }, [forceCollapsed, collapsed]);

  // When forceExpanded is true, expand/open the chat widget automatically
  useEffect(() => {
    if (forceExpanded && collapsed) {
      setCollapsed(false);
    }
  }, [forceExpanded, collapsed]);
  const [tab, setTab] = useState<Tab>('global');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannelInfo[]>([]);
  const [activeDM, setActiveDM] = useState<{ channel: string; peerName: string } | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showWeaverFeedback, setShowWeaverFeedback] = useState(false);
  // Community poll (голосування) card shown in the global tab
  const [activePoll, setActivePoll] = useState<ActivePollView | null>(null);
  const [pollExpanded, setPollExpanded] = useState(false);
  const [pollVoting, setPollVoting] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [unreadAstraMessages, setUnreadAstraMessages] = useState(0);
  const [unreadSystemMessages, setUnreadSystemMessages] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);
  const [bannedError, setBannedError] = useState(false);
  const [systemActionError, setSystemActionError] = useState<string | null>(null);
  // A.S.T.R.A. state
  const [astraMessages, setAstraMessages] = useState<MessageData[]>([]);
  const [astraInput, setAstraInput] = useState('');
  const [astraLoading, setAstraLoading] = useState(false);
  const astraEndRef = useRef<HTMLDivElement>(null);
  // Track which digest the user has "seen" in the ASTRA tab
  const [seenDigestWeekDate, setSeenDigestWeekDate] = useState<string | null | undefined>(lastDigestSeen);

  // Sync seenDigestWeekDate when lastDigestSeen prop loads asynchronously (player data comes in after mount).
  // Without this, useState ignores prop changes after initial render, leaving seenDigestWeekDate=null
  // even after the player's last_digest_seen is fetched from the server, causing a false "unread" badge.
  useEffect(() => {
    if (lastDigestSeen == null) return;
    // Only update if the stored "seen" value is older or missing — never regress it.
    setSeenDigestWeekDate(prev => {
      if (prev == null || lastDigestSeen > prev) return lastDigestSeen;
      return prev;
    });
  }, [lastDigestSeen]);

  const astraHasLatestDigestMessage = useMemo(() => (
    latestDigestWeekDate != null
      && astraMessages.some((msg) => getDigestWeekDateFromMessage(msg) === latestDigestWeekDate)
  ), [astraMessages, latestDigestWeekDate]);

  const unreadAstraDigest = (
    latestDigestWeekDate != null
    && latestDigestWeekDate !== seenDigestWeekDate
    && !astraHasLatestDigestMessage
  ) ? 1 : 0;
  const unreadAstra = unreadAstraDigest + unreadAstraMessages;

  const markDigestSeen = useCallback((weekDate: string | null | undefined) => {
    if (!weekDate) return;
    setSeenDigestWeekDate(prev => (prev == null || weekDate > prev ? weekDate : prev));
    onDigestSeen?.(weekDate);
  }, [onDigestSeen]);

  // Inject neon pulse keyframes once
  const pulseStyleInjected = useRef(false);
  useEffect(() => {
    if (pulseStyleInjected.current || document.getElementById(CHAT_PULSE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CHAT_PULSE_STYLE_ID;
    style.textContent = CHAT_PULSE_KEYFRAMES;
    document.head.appendChild(style);
    pulseStyleInjected.current = true;
  }, []);

  const ASTRA_HOURLY_LIMIT = 10;
  const astraHourKey = useCallback(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
  }, []);
  const getAstraMsgsThisHour = useCallback((): number => {
    const savedHour = localStorage.getItem('nebulife_astra_msgs_hour');
    if (savedHour !== astraHourKey()) return 0;
    return parseInt(localStorage.getItem('nebulife_astra_msgs_this_hour') ?? '0', 10);
  }, [astraHourKey]);
  const [astraMsgsThisHour, setAstraMsgsThisHour] = useState<number>(() => getAstraMsgsThisHour());
  const astraLimitReached = isPremium && astraMsgsThisHour >= ASTRA_HOURLY_LIMIT;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const astraScrollRef = useRef<HTMLDivElement>(null);
  const systemScrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const instantMessagesScrollRef = useRef(true);
  const instantAstraScrollRef = useRef(true);
  const instantSystemScrollRef = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authFailedRef = useRef(false);
  // Guards the chat-open "mark read" fan-out so it fires ONCE per open, not on
  // every dependency churn. Parent re-renders (e.g. the 60fps surface HUD) pass
  // fresh callback props that rebuild this effect's deps; without this guard the
  // fan-out (channels + per-channel list?limit=1) re-fired continuously and
  // tripped the shared poll rate limit (429 flood).
  const chatOpenMarkedRef = useRef(false);

  const readKeyForChannel = useCallback((channel: string): string => {
    if (channel === 'global') return 'nebulife_chat_last_read_global';
    return `nebulife_chat_last_read_${channel}`;
  }, []);

  const updateLocalReadState = useCallback((channel: string, lastReadAt: string) => {
    localStorage.setItem(readKeyForChannel(channel), lastReadAt);
  }, [readKeyForChannel]);

  const clearUnreadIndicators = useCallback(() => {
    setUnreadGlobal(0);
    setUnreadAstraMessages(0);
    setUnreadSystemMessages(0);
    setUnreadDm(0);
    markDigestSeen(latestDigestWeekDate);
    systemNotifs.filter(n => !n.read).forEach(n => onSystemNotifRead?.(n.id));
    onUnreadChange?.(0);
  }, [latestDigestWeekDate, markDigestSeen, onSystemNotifRead, onUnreadChange, systemNotifs]);

  const markChannelRead = useCallback(async (channel: string, lastReadAt: string) => {
    updateLocalReadState(channel, lastReadAt);
    try {
      await markMessageChannelRead(channel, lastReadAt);
    } catch (err) {
      console.warn('[ChatWidget] failed to sync read state:', err);
    }
  }, [updateLocalReadState]);

  const markDmChannelsRead = useCallback((channels = dmChannels) => {
    for (const channel of channels) {
      if (!channel.last_at) continue;
      markChannelRead(channel.channel, channel.last_at);
    }
    setUnreadDm(0);
  }, [dmChannels, markChannelRead]);

  const markLatestChannelMessageRead = useCallback(async (channel: string) => {
    const latest = await getMessages(channel, 1);
    const latestTs = latest[latest.length - 1]?.created_at;
    if (latestTs) await markChannelRead(channel, latestTs);
  }, [markChannelRead]);

  const jumpToBottom = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Current channel
  const activeChannel = tab === 'global' ? 'global' : activeDM?.channel ?? '';

  // Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannel || authFailedRef.current) return;
    try {
      const msgs = await getMessages(activeChannel, 50);
      setMessages(msgs);
    } catch (err) {
      // Stop polling on auth errors (401/403)
      if (err instanceof Error && /40[13]/.test(err.message)) {
        authFailedRef.current = true;
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      } else {
        // Non-auth failures (network blip, 5xx) were previously swallowed
        // silently, which is indistinguishable from "this channel genuinely
        // has no messages" from the player's point of view. Log so a
        // persistently-failing fetch (e.g. a broken deploy) is visible in
        // diagnostics instead of just looking like an empty chat.
        console.warn(`[chat] fetchMessages(${activeChannel}) failed:`, err);
      }
    }
  }, [activeChannel]);

  // Polling: active channel messages
  useEffect(() => {
    if (collapsed) return;
    if (!activeChannel) return;

    instantMessagesScrollRef.current = true;
    authFailedRef.current = false;
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [collapsed, activeChannel, fetchMessages]);

  // Fetch DM channels list
  useEffect(() => {
    if (collapsed) return;
    if (tab !== 'dm-list') return;

    let iv: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    const fetchDM = () => {
      getDMChannels().then(setDmChannels).catch((err) => {
        if (err instanceof Error && /40[13]/.test(err.message)) {
          stopped = true;
          if (iv) clearInterval(iv);
        }
      });
    };
    fetchDM();
    iv = setInterval(() => { if (!stopped) fetchDM(); }, 10000);
    return () => { if (iv) clearInterval(iv); };
  }, [collapsed, tab]);

  useEffect(() => {
    if (collapsed || tab !== 'dm-list' || dmChannels.length === 0) return;
    markDmChannelsRead(dmChannels);
  }, [collapsed, dmChannels, markDmChannelsRead, tab]);

  // Fetch the active community poll — refetched every time the global tab is
  // opened, since the server is the source of truth for "have I voted".
  useEffect(() => {
    if (collapsed || tab !== 'global') return;
    let cancelled = false;
    setPollError(null);
    getActivePoll()
      .then((poll) => { if (!cancelled) setActivePoll(poll); })
      .catch((err) => { console.warn('[chat] failed to load active poll:', err); });
    return () => { cancelled = true; };
  }, [collapsed, tab]);

  const handlePollVote = useCallback(async (optionId: string) => {
    if (!activePoll || pollVoting) return;
    playSfx('ui-click', 0.05);
    setPollVoting(true);
    setPollError(null);
    try {
      const result = await castPollVote(activePoll.id, optionId);
      setActivePoll((prev) => (prev ? {
        ...prev,
        hasVoted: true,
        votedOptionId: result.votedOptionId,
        percentages: result.percentages,
      } : prev));
    } catch (err) {
      setPollError(err instanceof Error ? err.message : 'vote_failed');
    } finally {
      setPollVoting(false);
    }
  }, [activePoll, pollVoting]);

  // Fetch system channel messages (fun facts, moderation notices)
  const [systemMessages, setSystemMessages] = useState<MessageData[]>([]);
  const visibleLogEntries = React.useMemo(
    () => {
      const mirroredTexts = new Set<string>();
      for (const msg of systemMessages) mirroredTexts.add(msg.content);
      for (const notif of systemNotifs) mirroredTexts.add(notif.text);
      return [...logEntries]
        .filter((entry) => !mirroredTexts.has(entry.text))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-50);
    },
    [logEntries, systemMessages, systemNotifs],
  );
  const systemFeedItems = React.useMemo(() => {
    const toMs = (value: string | number) => {
      const ms = typeof value === 'number' ? value : new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };

    return [
      ...systemMessages.map((message) => ({
        kind: 'message' as const,
        key: `message:${message.id}`,
        timestamp: toMs(message.created_at),
        message,
      })),
      ...systemNotifs.map((notif) => ({
        kind: 'notif' as const,
        key: `notif:${notif.id}`,
        timestamp: toMs(notif.timestamp),
        notif,
      })),
      ...visibleLogEntries.map((entry) => ({
        kind: 'log' as const,
        key: `log:${entry.id}`,
        timestamp: toMs(entry.timestamp),
        entry,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);
  }, [systemMessages, systemNotifs, visibleLogEntries]);
  useEffect(() => {
    if (collapsed || tab !== 'system') return;

    instantSystemScrollRef.current = true;
    let iv: ReturnType<typeof setInterval> | null = null;
    const fetchSysMsgs = async () => {
      try {
        const msgs = await getMessages(`system:${playerId}`, 30);
        setSystemMessages(msgs);
      } catch { /* ignore */ }
    };

    fetchSysMsgs();
    iv = setInterval(fetchSysMsgs, 10000);
    return () => { if (iv) clearInterval(iv); };
  }, [collapsed, tab, playerId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setAstraMsgsThisHour(getAstraMsgsThisHour());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [getAstraMsgsThisHour]);

  // Fetch A.S.T.R.A. conversation history from DB
  useEffect(() => {
    if (collapsed || tab !== 'astra') return;

    instantAstraScrollRef.current = true;
    const fetchAstra = async () => {
      try {
        const msgs = await getMessages(`astra:${playerId}`, 40);
        setAstraMessages(filterLegacyLessonNotifs(msgs));
      } catch { /* ignore */ }
    };

    fetchAstra();
  }, [collapsed, tab, playerId]);

  // Unread count polling (when collapsed). Single aggregated request per tick
  // (/api/messages/unread-summary) instead of fanning out to read-state +
  // list ×N + channels. Deps are intentionally limited to [collapsed, playerId]
  // so the effect is NOT torn down/recreated on unrelated re-renders — that
  // churn previously fired an immediate burst of requests every render.
  useEffect(() => {
    if (!collapsed) return;

    let iv: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const checkUnread = async () => {
      if (stopped) return;
      try {
        const summary = await getUnreadSummary();
        if (stopped) return;
        setUnreadGlobal(summary.global);
        setUnreadAstraMessages(summary.astra);
        setUnreadSystemMessages(summary.system);
        setUnreadDm(summary.dm);
      } catch (err) {
        // Stop polling on auth errors (401/403). 429 (rate limit) just skips
        // this tick and retries on the next interval.
        if (err instanceof Error && /40[13]/.test(err.message)) {
          stopped = true;
          if (iv) clearInterval(iv);
        }
      }
    };

    checkUnread();
    iv = setInterval(checkUnread, 10000);
    return () => { stopped = true; if (iv) clearInterval(iv); };
  }, [collapsed, playerId]);

  // Notify parent of all unread chat activity so the collapsed comms button
  // does not look idle while global messages are waiting.
  const unreadSystem = (!collapsed && tab === 'system') ? 0 : systemNotifs.filter(n => !n.read).length;
  const effectiveUnreadGlobal = (!collapsed && tab === 'global') ? 0 : unreadGlobal;
  const effectiveUnreadAstra = (!collapsed && tab === 'astra') ? 0 : unreadAstra;
  const effectiveUnreadSystemMessages = (!collapsed && tab === 'system') ? 0 : unreadSystemMessages;
  const effectiveUnreadDm = (!collapsed && (tab === 'dm-list' || tab === 'dm-chat')) ? 0 : unreadDm;
  // Global chat unread is intentionally excluded from the ASTRA icon / comms
  // badge — it surfaces only on the "global" tab. The icon reflects ASTRA + DM
  // + SYSTEM activity (channels personally addressed to the player).
  useEffect(() => {
    onUnreadChange?.(unreadSystem + effectiveUnreadSystemMessages + effectiveUnreadAstra + effectiveUnreadDm);
  }, [unreadSystem, effectiveUnreadSystemMessages, effectiveUnreadAstra, effectiveUnreadDm, onUnreadChange]);

  // Mark system notifs as read when viewing system tab
  useEffect(() => {
    if (!collapsed && tab === 'system') {
      systemNotifs.filter(n => !n.read).forEach(n => onSystemNotifRead?.(n.id));
    }
  }, [collapsed, tab, systemNotifs, onSystemNotifRead]);

  useEffect(() => {
    if (collapsed || tab !== 'system' || systemMessages.length === 0) return;
    const lastTs = systemMessages[systemMessages.length - 1].created_at;
    markChannelRead(`system:${playerId}`, lastTs);
    setUnreadSystemMessages(0);
  }, [collapsed, markChannelRead, playerId, systemMessages, tab]);

  useEffect(() => {
    if (collapsed || tab !== 'astra' || astraMessages.length === 0) return;
    const lastTs = astraMessages[astraMessages.length - 1].created_at;
    markChannelRead(`astra:${playerId}`, lastTs);
    setUnreadAstraMessages(0);
  }, [astraMessages, collapsed, markChannelRead, playerId, tab]);

  useEffect(() => {
    if (collapsed) return;
    if (tab === 'system') {
      setUnreadSystemMessages(0);
      systemNotifs.filter(n => !n.read).forEach(n => onSystemNotifRead?.(n.id));
    } else if (tab === 'astra') {
      setUnreadAstraMessages(0);
      markDigestSeen(latestDigestWeekDate);
    } else if (tab === 'global') {
      setUnreadGlobal(0);
    } else if (tab === 'dm-list' || tab === 'dm-chat') {
      setUnreadDm(0);
    }
  }, [collapsed, latestDigestWeekDate, markDigestSeen, onSystemNotifRead, systemNotifs, tab]);

  useEffect(() => {
    if (collapsed) {
      // Reset so the next open marks read again.
      chatOpenMarkedRef.current = false;
      return;
    }
    // Already marked for this open session — ignore dependency churn.
    if (chatOpenMarkedRef.current) return;
    chatOpenMarkedRef.current = true;

    let cancelled = false;
    const markChatOpenRead = async () => {
      try {
        const channels = await getDMChannels().catch(() => [] as DMChannelInfo[]);
        if (cancelled) return;

        await Promise.all([
          markLatestChannelMessageRead('global'),
          markLatestChannelMessageRead(`astra:${playerId}`),
          markLatestChannelMessageRead(`system:${playerId}`),
          ...channels.map((channel) => (
            channel.last_at
              ? markChannelRead(channel.channel, channel.last_at)
              : markLatestChannelMessageRead(channel.channel)
          )),
        ]);

        if (cancelled) return;
        clearUnreadIndicators();
      } catch (err) {
        console.warn('[ChatWidget] failed to mark chat open read:', err);
      }
    };

    void markChatOpenRead();
    return () => { cancelled = true; };
  }, [
    collapsed,
    clearUnreadIndicators,
    latestDigestWeekDate,
    markChannelRead,
    markDigestSeen,
    markLatestChannelMessageRead,
    playerId,
  ]);

  // Auto-scroll to bottom only when user is already at bottom. On first open /
  // tab switch, jump instantly so the user does not watch history scroll down.
  useEffect(() => {
    if (instantMessagesScrollRef.current) {
      jumpToBottom(messagesScrollRef);
      requestAnimationFrame(() => jumpToBottom(messagesScrollRef));
      instantMessagesScrollRef.current = false;
      isAtBottomRef.current = true;
      return;
    }
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, jumpToBottom]);

  // Mark global as read when viewing
  useEffect(() => {
    if (!collapsed && tab === 'global' && messages.length > 0) {
      const lastTs = messages[messages.length - 1].created_at;
      markChannelRead('global', lastTs);
      setUnreadGlobal(0);
    }
    if (!collapsed && tab === 'dm-chat' && activeDM && messages.length > 0) {
      const lastTs = messages[messages.length - 1].created_at;
      markChannelRead(activeDM.channel, lastTs);
      setUnreadDm(0);
    }
  }, [activeDM, collapsed, markChannelRead, messages, tab]);

  const globalLocked = tab === 'global' && playerLevel < 10;

  const runSystemAction = useCallback((action: () => void | boolean | Promise<void | boolean>) => {
    setSystemActionError(null);
    try {
      const result = action();
      if (result && typeof (result as Promise<void | boolean>).then === 'function') {
        void (result as Promise<void | boolean>)
          .then((ok) => {
            if (ok === false) {
              setSystemActionError(t('chat.system_action_failed', 'Action unavailable for this system.'));
              return;
            }
            setCollapsed(true);
          })
          .catch((err) => {
            console.warn('[ChatWidget] system action failed:', err);
            setSystemActionError(t('chat.system_action_failed', 'Action unavailable for this system.'));
          });
        return;
      }
      if (result === false) {
        setSystemActionError(t('chat.system_action_failed', 'Action unavailable for this system.'));
        return;
      }
      setCollapsed(true);
    } catch (err) {
      console.warn('[ChatWidget] system action failed:', err);
      setSystemActionError(t('chat.system_action_failed', 'Action unavailable for this system.'));
    }
  }, [t]);

  const handleSend = async () => {
    if (!input.trim() || !activeChannel || sending || globalLocked) return;
    setSending(true);
    setBannedError(false);
    try {
      const msg = await sendMessage(activeChannel, input.trim());
      setMessages((prev) => [...prev, msg]);
      if (activeChannel === 'global') {
        markChannelRead('global', msg.created_at);
        setUnreadGlobal(0);
      }
      playSfx('chat-send', 0.25);
      setInput('');
    } catch (err) {
      if (err instanceof Error && err.message.includes('403')) {
        setBannedError(true);
      } else {
        console.warn('Failed to send message:', err);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openDM = (channel: string, peerName: string) => {
    instantMessagesScrollRef.current = true;
    setActiveDM({ channel, peerName });
    setTab('dm-chat');
    setMessages([]);
    setUnreadDm(0);
  };

  const openDMWithPlayer = useCallback((peerId: string, peerName: string) => {
    if (!peerId || peerId === playerId || peerId === 'system' || peerId === 'astra') return;
    playSfx('ui-click', 0.05);
    openDM(dmChannelId(playerId, peerId), peerName);
  }, [playerId]);

  const handleNewDM = (peerId: string, peerCallsign: string) => {
    setShowNewDM(false);
    const ch = dmChannelId(playerId, peerId);
    openDM(ch, peerCallsign);
  };

  // A.S.T.R.A. send (with optimistic update for instant feedback)
  const handleAstraSend = async () => {
    const text = astraInput.trim();
    if (!text || astraLoading || !isPremium || astraLimitReached) return;

    const currentCount = getAstraMsgsThisHour();
    if (currentCount >= ASTRA_HOURLY_LIMIT) {
      setAstraMsgsThisHour(currentCount);
      return;
    }

    setAstraInput('');
    setAstraLoading(true);

    // Show user message immediately (optimistic update)
    const now = new Date().toISOString();
    const userMsg: MessageData = {
      id: `tmp_${Date.now()}`,
      sender_id: playerId,
      sender_name: playerName,
      channel: `astra:${playerId}`,
      content: text,
      created_at: now,
    };
    setAstraMessages(prev => [...prev, userMsg]);

    try {
      const resp = await askAstra(text);
      const nextCount = resp.hourlyMessagesUsed ?? (currentCount + 1);
      localStorage.setItem('nebulife_astra_msgs_hour', astraHourKey());
      localStorage.setItem('nebulife_astra_msgs_this_hour', String(Math.min(nextCount, ASTRA_HOURLY_LIMIT)));
      setAstraMsgsThisHour(Math.min(nextCount, ASTRA_HOURLY_LIMIT));
      // Show Astra response immediately (optimistic)
      const astraMsg: MessageData = {
        id: `tmp_${Date.now() + 1}`,
        sender_id: 'astra',
        sender_name: 'A.S.T.R.A.',
        channel: `astra:${playerId}`,
        content: resp.text,
        created_at: new Date().toISOString(),
      };
      setAstraMessages(prev => [...prev, astraMsg]);
      // Background sync with DB to get real IDs
      getMessages(`astra:${playerId}`, 40).then(msgs => setAstraMessages(filterLegacyLessonNotifs(msgs))).catch(() => {});
    } catch (err) {
      const message = err instanceof Error && err.message.includes('premium_required')
        ? t('chat.astra_premium_required')
        : 'A.S.T.R.A. offline. Помилка зв\'язку з сервером.';
      // Show error as Astra message so user sees feedback
      const errMsg: MessageData = {
        id: `tmp_${Date.now() + 1}`,
        sender_id: 'astra',
        sender_name: 'A.S.T.R.A.',
        channel: `astra:${playerId}`,
        content: message,
        created_at: new Date().toISOString(),
      };
      setAstraMessages(prev => [...prev, errMsg]);
    } finally {
      setAstraLoading(false);
    }
  };

  const handleAstraKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAstraSend();
    }
  };

  // Auto-scroll astra messages
  useEffect(() => {
    if (instantAstraScrollRef.current) {
      jumpToBottom(astraScrollRef);
      requestAnimationFrame(() => jumpToBottom(astraScrollRef));
      instantAstraScrollRef.current = false;
      return;
    }
    astraEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [astraMessages, jumpToBottom]);

  useEffect(() => {
    if (instantSystemScrollRef.current) {
      jumpToBottom(systemScrollRef);
      requestAnimationFrame(() => jumpToBottom(systemScrollRef));
      instantSystemScrollRef.current = false;
      return;
    }
    jumpToBottom(systemScrollRef);
  }, [jumpToBottom, systemFeedItems]);

  // ── Collapsed state ──
  if (collapsed) {
    // Global excluded from the FAB badge — only ASTRA + DM + SYSTEM count here.
    const totalUnread = unreadSystem + effectiveUnreadSystemMessages + effectiveUnreadAstra + effectiveUnreadDm;
    if (hideCollapsedButton) return null;
    return (
      <AstraFabButton
        tutorialId="chat-open-btn"
        title={t('chat.title')}
        unreadCount={totalUnread}
        pulse={totalUnread > 0}
        size={verticalSideLayout ? 48 : 52}
        style={getAstraFabPosition(verticalSideLayout, verticalSideLayout ? 48 : 52)}
        onClick={() => {
          playSfx('ui-click', 0.07);
          clearUnreadIndicators();
          if (unreadSystem + effectiveUnreadSystemMessages > 0) {
            instantSystemScrollRef.current = true;
            setTab('system');
          } else if (effectiveUnreadAstra > 0) {
            instantAstraScrollRef.current = true;
            setTab('astra');
            markDigestSeen(latestDigestWeekDate);
          } else if (effectiveUnreadDm > 0) {
            setTab('dm-list');
          } else if (effectiveUnreadGlobal > 0) {
            instantMessagesScrollRef.current = true;
            setTab('global');
          }
          if (tab === 'global' || unreadGlobal > 0) setUnreadGlobal(0);
          setCollapsed(false);
        }}
      />
    );
  }

  // ── Expanded state ──
  return (
    <>
      <div style={{
        position: 'fixed',
        top: verticalSideLayout ? 'calc(46px + env(safe-area-inset-top, 0px))' : 'calc(50px + env(safe-area-inset-top, 0px))',
        bottom: verticalSideLayout ? 'calc(58px + env(safe-area-inset-bottom, 0px))' : 'calc(56px + env(safe-area-inset-bottom, 0px))',
        right: verticalSideLayout ? 'calc(8px + env(safe-area-inset-right, 0px))' : 'calc(16px + env(safe-area-inset-right, 0px))',
        zIndex: 9700,
        width: verticalSideLayout ? 'min(336px, calc(100vw - 20px))' : 'min(360px, calc(100vw - 24px))',
        background: 'rgba(10,15,25,0.96)',
        border: '1px solid #334455',
        borderRadius: 6,
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #223344',
          gap: 8,
        }}>
          <div data-tutorial-id="chat-tabs-header" style={{ display: 'flex', gap: verticalSideLayout ? 4 : 8, minWidth: 0, overflowX: 'auto' }}>
            <TabButton
              active={tab === 'astra'}
              onClick={() => { instantAstraScrollRef.current = true; setTab('astra'); setActiveDM(null); markDigestSeen(latestDigestWeekDate); }}
              label="A.S.T.R.A."
              badge={effectiveUnreadAstra > 0 ? effectiveUnreadAstra : undefined}
              badgeColor="#44ffaa"
            />
            <TabButton
              active={tab === 'global'}
              onClick={() => { instantMessagesScrollRef.current = true; setTab('global'); setActiveDM(null); }}
              label={t('chat.tab_global')}
              badge={effectiveUnreadGlobal > 0 ? effectiveUnreadGlobal : undefined}
              badgeColor="#44ff88"
            />
            <TabButton
              active={tab === 'dm-list' || tab === 'dm-chat'}
              onClick={() => { setTab('dm-list'); setActiveDM(null); }}
              label="DM"
              badge={effectiveUnreadDm > 0 ? effectiveUnreadDm : undefined}
              badgeColor="#ddaa44"
            />
            <TabButton
              active={tab === 'system'}
              onClick={() => { instantSystemScrollRef.current = true; setTab('system'); setActiveDM(null); }}
              label={t('chat.tab_system')}
              badge={unreadSystem + effectiveUnreadSystemMessages > 0 ? unreadSystem + effectiveUnreadSystemMessages : undefined}
            />
          </div>
          {/* Коментар українською: Кнопка згортання чату для онбордингу */}
          <button
            data-tutorial-id="chat-close-btn"
            onClick={() => { playSfx('ui-click', 0.07); setCollapsed(true); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#667788',
              fontFamily: 'monospace',
              fontSize: 14,
              cursor: 'pointer',
              padding: '0 4px',
            }}
            title={t('chat.minimize')}
          >
            _
          </button>
        </div>

        {/* DM sub-header */}
        {tab === 'dm-chat' && activeDM && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderBottom: '1px solid #223344',
            fontSize: 11,
            color: '#8899aa',
          }}>
            <button
              onClick={() => { setTab('dm-list'); setActiveDM(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667788',
                fontFamily: 'monospace',
                fontSize: 11,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {'<'}
            </button>
            <span style={{ color: '#ccddee' }}>{activeDM.peerName}</span>
          </div>
        )}

        {/* Content area */}
        {(tab === 'global' || tab === 'dm-chat') && (
          <>
            {/* Weaver direct-feedback teaser — global tab only, always visible
                (unlike the level-12+ auto-popup, opt-in and not level-gated). */}
            {tab === 'global' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 12px',
                borderBottom: '1px solid #223344',
                background: 'rgba(15,22,34,0.55)',
              }}>
                <span style={{
                  color: '#8899aa',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {t('weaver_feedback.chat_teaser')}
                </span>
                <button
                  type="button"
                  onClick={() => { playSfx('ui-click', 0.06); setShowWeaverFeedback(true); }}
                  style={{
                    flexShrink: 0,
                    background: 'rgba(123,184,255,0.12)',
                    border: '1px solid rgba(123,184,255,0.45)',
                    borderRadius: 3,
                    color: '#7bb8ff',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    padding: '4px 9px',
                    cursor: 'pointer',
                  }}
                >
                  {t('weaver_feedback.chat_button')}
                </button>
              </div>
            )}

            {/* Community poll — collapsed by default so it doesn't permanently
                crowd the chat; expands to show options / results in place. */}
            {tab === 'global' && activePoll && (
              <PollCard
                poll={activePoll}
                expanded={pollExpanded}
                onToggleExpand={() => { playSfx('ui-click', 0.05); setPollExpanded((v) => !v); }}
                onVote={handlePollVote}
                voting={pollVoting}
                error={pollError}
              />
            )}

            {/* Messages */}
            <div
              ref={messagesScrollRef}
              onScroll={() => {
                const el = messagesScrollRef.current;
                if (!el) return;
                isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
              }}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
              {messages.length === 0 && (
                <div style={{ color: '#445566', fontSize: 10, textAlign: 'center', marginTop: 40 }}>
                  {tab === 'global' ? t('chat.empty_global') : t('chat.empty_dm')}
                </div>
              )}
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === playerId}
                  channel={activeChannel}
                  onReported={() => {}}
                  onAwardXP={onAwardXP}
                  isOwnPremium={isPremium}
                  onOpenDM={openDMWithPlayer}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Ban error banner */}
            {bannedError && (
              <div style={{
                padding: '5px 12px',
                background: 'rgba(80,20,20,0.7)',
                borderTop: '1px solid #cc4444',
                color: '#ff8888',
                fontFamily: 'monospace',
                fontSize: 10,
                textAlign: 'center',
              }}>
                {t('chat.blocked')}
              </div>
            )}

            {/* Level restriction banner for global chat */}
            {globalLocked && (
              <div style={{
                padding: '5px 12px',
                background: 'rgba(40,30,10,0.7)',
                borderTop: '1px solid #665522',
                color: '#cc9944',
                fontFamily: 'monospace',
                fontSize: 9,
                textAlign: 'center',
              }}>
                {t('chat.level_required', 'Global chat available from level 10')}
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: '8px 12px',
              borderTop: (bannedError || globalLocked) ? 'none' : '1px solid #223344',
              display: 'flex',
              gap: 8,
            }}>
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); if (bannedError) setBannedError(false); }}
                onKeyDown={handleKeyDown}
                placeholder={globalLocked ? t('chat.level_required', 'Level 10 required') : t('chat.message_placeholder')}
                maxLength={500}
                disabled={bannedError || globalLocked}
                style={{
                  flex: 1,
                  background: 'rgba(20,30,45,0.8)',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: (bannedError || globalLocked) ? '#556677' : '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim() || bannedError || globalLocked}
                style={{
                  background: input.trim() && !bannedError && !globalLocked ? 'rgba(34,170,68,0.2)' : 'rgba(30,40,55,0.5)',
                  border: `1px solid ${input.trim() && !bannedError && !globalLocked ? '#44ff88' : '#334455'}`,
                  borderRadius: 3,
                  color: input.trim() && !bannedError && !globalLocked ? '#44ff88' : '#556677',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 12px',
                  cursor: input.trim() && !bannedError && !globalLocked ? 'pointer' : 'default',
                }}
              >
                {'>'}
              </button>
            </div>
          </>
        )}

        {/* System notifications tab */}
        {tab === 'system' && (
          <div ref={systemScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {systemFeedItems.map((item) => {
              if (item.kind === 'message') {
                const msg = item.message;
                const msgTime = fmtTime(msg.created_at);
                if (msg.sender_id === WEAVER_SENDER_ID) {
                  return <WeaverMessage key={item.key} senderName={msg.sender_name} content={msg.content} time={msgTime} />;
                }
                return (
                  <div key={item.key} style={{
                    background: 'rgba(0,30,20,0.3)',
                    border: '1px solid #336655',
                    borderRadius: 4,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: '#44ffaa', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {msg.sender_name}
                      </span>
                      <span style={{ color: '#445566', fontSize: 9, fontFamily: 'monospace' }}>{msgTime}</span>
                    </div>
                    <div style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace', lineHeight: '1.4' }}>
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (item.kind === 'notif') {
                const notif = item.notif;
                const notifTime = fmtTime(notif.timestamp);
                return (
                  <div key={item.key} style={{
                    background: notif.read ? 'rgba(10,20,35,0.4)' : 'rgba(20,40,70,0.6)',
                    border: `1px solid ${notif.read ? '#223344' : '#446688'}`,
                    borderRadius: 4,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: '#4488aa', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {t('chat.system_header')}
                      </span>
                      <span style={{ color: '#445566', fontSize: 9, fontFamily: 'monospace' }}>{notifTime}</span>
                    </div>
                    <div style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace', lineHeight: '1.4' }}>
                      {notif.text}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {notif.discovery && onOpenObservatoryReport ? (
                        <button
                          onClick={() => {
                            onSystemNotifRead?.(notif.id);
                            runSystemAction(() => onOpenObservatoryReport(notif.discovery!));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('observatory.view_report')}
                        </button>
                      ) : notif.result && onOpenResult ? (
                        <button
                          onClick={() => {
                            onSystemNotifRead?.(notif.id);
                            runSystemAction(() => onOpenResult(notif.result!));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('observatory.view_report')}
                        </button>
                      ) : notif.lifeformId && onOpenLifeform ? (
                        <button
                          onClick={() => {
                            onSystemNotifRead?.(notif.id);
                            runSystemAction(() => onOpenLifeform(notif.lifeformId!));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('chat.view_specimen')}
                        </button>
                      ) : (
                        <>
                          {onOpenPlanetMissionReport && (
                            <button
                              onClick={() => {
                                onSystemNotifRead?.(notif.id);
                                runSystemAction(() => onOpenPlanetMissionReport(notif.systemId, notif.planetId));
                              }}
                              style={SYSTEM_ACTION_BUTTON_STYLE}
                            >
                              {t('chat.view_report')}
                            </button>
                          )}
                          {onNavigateToSystem && (
                            <button
                              onClick={() => {
                                onSystemNotifRead?.(notif.id);
                                runSystemAction(() => onNavigateToSystem(notif.systemId));
                              }}
                              style={SYSTEM_ACTION_BUTTON_STYLE}
                            >
                              {t('chat.go_to_system')}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              const entry = item.entry;
              const entryTime = fmtTime(entry.timestamp);
              const catColor = LOG_CATEGORY_COLORS[entry.category];
              return (
                <div key={item.key} style={{
                  background: 'rgba(10,20,35,0.34)',
                  border: '1px solid rgba(34,51,68,0.65)',
                  borderRadius: 4,
                  padding: '7px 9px',
                  display: 'grid',
                  gap: 4,
                  opacity: 0.92,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ color: catColor, fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                      {t(LOG_CATEGORY_I18N_KEYS[entry.category])}
                    </span>
                    <span style={{ color: '#445566', fontSize: 9, fontFamily: 'monospace' }}>{entryTime}</span>
                  </div>
                  <div style={{ color: '#8899aa', fontSize: 10, fontFamily: 'monospace', lineHeight: '1.4' }}>
                    {entry.text}
                  </div>
                  {(entry.systemId || entry.discoveryRef) && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {entry.objectType === 'planet_mission_report' && entry.systemId && entry.planetId && onOpenPlanetMissionReport && (
                        <button
                          onClick={() => {
                            runSystemAction(() => onOpenPlanetMissionReport(entry.systemId!, entry.planetId!));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('chat.view_report')}
                        </button>
                      )}
                      {entry.systemId && onNavigateToSystem && (
                        <button
                          onClick={() => {
                            runSystemAction(() => onNavigateToSystem(entry.systemId!));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('chat.go_to_system')}
                        </button>
                      )}
                      {entry.objectType === 'system_research' && entry.systemId && onOpenSystemReport && (
                        <button
                          onClick={() => {
                            runSystemAction(() => onOpenSystemReport(entry.systemId!));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('chat.view_report')}
                        </button>
                      )}
                      {entry.discoveryRef && onOpenLogDiscovery && (
                        <button
                          onClick={() => {
                            runSystemAction(() => onOpenLogDiscovery(entry));
                          }}
                          style={SYSTEM_ACTION_BUTTON_STYLE}
                        >
                          {t('chat.view_report')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {systemActionError && (
              <div style={{
                background: 'rgba(70,35,15,0.42)',
                border: '1px solid rgba(255,136,68,0.42)',
                borderRadius: 4,
                color: '#ffb07a',
                fontSize: 10,
                fontFamily: 'monospace',
                lineHeight: 1.4,
                padding: '7px 9px',
              }}>
                {systemActionError}
              </div>
            )}

            {systemFeedItems.length === 0 && (
              <div style={{ color: '#445566', fontSize: 10, textAlign: 'center', marginTop: 40, fontFamily: 'monospace' }}>
                {t('chat.no_system_notifs')}
              </div>
            )}
          </div>
        )}

        {/* DM list */}
        {tab === 'dm-list' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            <button
              onClick={() => setShowNewDM(true)}
              style={{
                width: '100%',
                background: 'rgba(30,60,80,0.4)',
                border: '1px dashed #446688',
                borderRadius: 3,
                color: '#8899aa',
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '8px',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              {t('chat.new_dm_btn')}
            </button>
            {dmChannels.length === 0 && (
              <div style={{ color: '#445566', fontSize: 10, textAlign: 'center', marginTop: 20 }}>
                {t('chat.no_dms')}
              </div>
            )}
            {dmChannels.map((ch) => (
              <button
                key={ch.channel}
                onClick={() => openDM(ch.channel, ch.peer_name || ch.peer_id.slice(0, 8))}
                style={{
                  width: '100%',
                  background: 'rgba(20,30,45,0.5)',
                  border: '1px solid #223344',
                  borderRadius: 3,
                  color: '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span style={{ color: '#ccddee', fontSize: 11 }}>
                  {ch.peer_name || ch.peer_id.slice(0, 8)}
                </span>
                <span style={{ color: '#667788', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.last_message}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* A.S.T.R.A. tab */}
        {tab === 'astra' && (
          <>
            {!isPremium && (
              <div style={{
                padding: '7px 12px',
                borderBottom: '1px solid #223344',
                color: '#ddaa44',
                fontSize: 10,
                fontFamily: 'monospace',
                lineHeight: 1.45,
              }}>
                {t('chat.astra_premium_required')}
              </div>
            )}

            <div ref={astraScrollRef} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {/* Digest notification — shown when there's a new unread digest */}
              {latestDigestWeekDate != null && latestDigestWeekDate !== seenDigestWeekDate && !astraHasLatestDigestMessage && (
                <div style={{
                  background: 'rgba(0,30,20,0.5)',
                  border: '1px solid rgba(68,255,136,0.3)',
                  borderRadius: 3,
                  padding: '8px 10px',
                  marginBottom: 2,
                }}>
                  <div style={{ color: '#44ffaa', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', marginBottom: 4 }}>
                    A.S.T.R.A.
                  </div>
                  <div style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, marginBottom: 8 }}>
                    {preferredLanguage === 'en'
                      ? "This week's space digest is ready! Open it to learn about the latest discoveries."
                      : 'Космічні новини тижня готові! Відкрий дайджест, щоб дізнатись про останні відкриття.'}
                  </div>
                  <button
                    onClick={() => {
                      if (digestLoading) return;
                      markDigestSeen(latestDigestWeekDate);
                      window.dispatchEvent(new CustomEvent('nebulife:open-digest'));
                    }}
                    disabled={digestLoading}
                    aria-busy={digestLoading}
                    style={{
                      background: 'rgba(68,255,136,0.12)',
                      border: '1px solid rgba(68,255,136,0.4)',
                      borderRadius: 3,
                      color: '#44ff88',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      padding: '4px 10px',
                      cursor: digestLoading ? 'not-allowed' : 'pointer',
                      opacity: digestLoading ? 0.5 : 1,
                    }}
                  >
                    {digestLoading
                      ? t('common.loading')
                      : (preferredLanguage === 'en' ? 'Open digest' : 'Відкрити дайджест')}
                  </button>
                </div>
              )}

              {astraMessages.length === 0 && !astraLoading && !(latestDigestWeekDate != null && latestDigestWeekDate !== seenDigestWeekDate && !astraHasLatestDigestMessage) && (
                <div style={{ color: '#44ffaa', fontSize: 10, textAlign: 'center', marginTop: 30, fontFamily: 'monospace', opacity: 0.7 }}>
                  {t('chat.astra_online')}
                </div>
              )}
              {astraMessages.map((msg) => (
                msg.sender_id === WEAVER_SENDER_ID ? (
                  <WeaverMessage
                    key={msg.id}
                    senderName={msg.sender_name}
                    content={msg.content}
                    time={fmtTime(msg.created_at)}
                  />
                ) : (
                  <AstraMessageItem
                    key={msg.id}
                    msg={{ role: (msg.sender_id === 'astra' || msg.sender_id === 'system') ? 'model' : 'user', text: msg.content }}
                    messageId={msg.id}
                    onAwardXP={onAwardXP}
                    selectedQuizAnswer={quizAnswers[msg.id]}
                    onQuizAnswer={onQuizAnswer}
                    onDigestOpen={markDigestSeen}
                    digestLoading={digestLoading}
                  />
                )
              ))}
              {astraLoading && (
                <div style={{ color: '#44ffaa', fontSize: 10, fontFamily: 'monospace', opacity: 0.6 }}>
                  A.S.T.R.A. processing...
                </div>
              )}
              <div ref={astraEndRef} />
            </div>

            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid #223344',
              display: 'flex',
              gap: 8,
            }}>
              {(() => {
                const blocked = astraLoading || !isPremium || astraLimitReached;
                const placeholderKey = !isPremium
                  ? 'chat.astra_placeholder_premium'
                  : astraLimitReached
                    ? 'chat.astra_placeholder_depleted'
                    : 'chat.astra_placeholder';
                return (
                  <>
                    <input
                      value={astraInput}
                      onChange={(e) => setAstraInput(e.target.value)}
                      onKeyDown={handleAstraKeyDown}
                      placeholder={t(placeholderKey)}
                      maxLength={1000}
                      disabled={blocked}
                      style={{
                        flex: 1,
                        background: 'rgba(20,30,45,0.8)',
                        border: '1px solid #334455',
                        borderRadius: 3,
                        color: blocked ? '#556677' : '#aabbcc',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        padding: '6px 8px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleAstraSend}
                      disabled={blocked || !astraInput.trim()}
                      style={{
                        background: astraInput.trim() && !blocked ? 'rgba(0,180,100,0.2)' : 'rgba(30,40,55,0.5)',
                        border: `1px solid ${astraInput.trim() && !blocked ? '#44ffaa' : '#334455'}`,
                        borderRadius: 3,
                        color: astraInput.trim() && !blocked ? '#44ffaa' : '#556677',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        padding: '6px 12px',
                        cursor: astraInput.trim() && !blocked ? 'pointer' : 'default',
                      }}
                    >
                      {'>'}
                    </button>
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* New DM modal */}
      {showNewDM && (
        <NewDMModal
          onSelect={handleNewDM}
          onClose={() => setShowNewDM(false)}
        />
      )}

      {/* "Message the Weaver" — reuses the level-12+ feedback modal with
          alternate copy, always available from the global chat tab. */}
      {showWeaverFeedback && (
        <PlayerFeedbackPrompt
          playerLevel={playerLevel}
          onClose={() => setShowWeaverFeedback(false)}
          kickerKey="weaver_feedback.kicker"
          titleKey="weaver_feedback.title"
          bodyKey="weaver_feedback.body"
          likesLabelKey="weaver_feedback.likes_label"
          likesPlaceholderKey="weaver_feedback.likes_placeholder"
          dislikesLabelKey="weaver_feedback.dislikes_label"
          dislikesPlaceholderKey="weaver_feedback.dislikes_placeholder"
        />
      )}
    </>
  );
}

export const ChatWidget = React.memo(ChatWidgetInner);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Pro subscriber atom badge
function ProBadge() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7bb8ff"
      strokeWidth="1.5"
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 3 }}
    >
      <circle cx="12" cy="12" r="2.5" fill="#7bb8ff" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
  badgeColor = '#4488aa',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
  /** Badge background color. Defaults to #4488aa (blue). Pass #44ff88 for global chat. */
  badgeColor?: string;
}) {
  // When inactive but has unread, hint with a subtle tint from the badge color
  const hasBadge = badge !== undefined && badge > 0;
  const borderColor = active
    ? badgeColor
    : hasBadge
      ? `${badgeColor}44`
      : 'transparent';
  const textColor = active
    ? badgeColor
    : hasBadge
      ? `${badgeColor}cc`
      : '#667788';

  return (
    <button
      onClick={() => { playSfx('ui-click', 0.07); onClick(); }}
      style={{
        background: active ? `${badgeColor}22` : hasBadge ? `${badgeColor}0d` : 'none',
        border: `1px solid ${borderColor}`,
        borderRadius: 3,
        color: textColor,
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        padding: '3px 10px',
        cursor: 'pointer',
        transition: 'color 0.2s, border-color 0.2s, background 0.2s',
      }}
    >
      {label}
      {hasBadge && (
        <span style={{
          background: badgeColor,
          color: '#020510',
          fontSize: 8,
          fontWeight: 'bold',
          borderRadius: 6,
          padding: '1px 4px',
          minWidth: 12,
          textAlign: 'center',
          lineHeight: '1.5',
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// "Voice of the universe" persona (ТКАЧ / The Weaver). Messages authored by
// this synthetic sender are highlighted gold-on-black across every channel so
// players instantly recognise them as canon announcements, not player chatter.
// Keep this id in sync with api/admin/broadcast-message.ts (WEAVER_SENDER_ID).
// ---------------------------------------------------------------------------
const WEAVER_SENDER_ID = 'nebula-weaver';

/** Procedural cosmic-web emblem: a gold node with filaments radiating to outer
 *  nodes — the Weaver that spins the threads between worlds. */
function WeaverIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
      <g stroke="#ffcc44" strokeWidth="1.1" opacity="0.85" strokeLinecap="round">
        <line x1="12" y1="12" x2="12" y2="3" />
        <line x1="12" y1="12" x2="21" y2="12" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <line x1="12" y1="12" x2="3" y2="12" />
        <line x1="12" y1="12" x2="18.4" y2="5.6" />
        <line x1="12" y1="12" x2="18.4" y2="18.4" />
        <line x1="12" y1="12" x2="5.6" y2="18.4" />
        <line x1="12" y1="12" x2="5.6" y2="5.6" />
      </g>
      <g fill="#ffd76a">
        <circle cx="12" cy="3" r="1.3" /><circle cx="21" cy="12" r="1.3" />
        <circle cx="12" cy="21" r="1.3" /><circle cx="3" cy="12" r="1.3" />
        <circle cx="18.4" cy="5.6" r="1" /><circle cx="18.4" cy="18.4" r="1" />
        <circle cx="5.6" cy="18.4" r="1" /><circle cx="5.6" cy="5.6" r="1" />
      </g>
      <circle cx="12" cy="12" r="3.4" fill="#ffcc44" stroke="#000" strokeWidth="1" />
      <circle cx="12" cy="12" r="1.2" fill="#1a1200" />
    </svg>
  );
}

/** Gold-on-black message card for the Weaver persona. Used in global, DM,
 *  system and A.S.T.R.A. channels alike. */
function WeaverMessage({ senderName, content, time }: { senderName: string; content: string; time: string }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(24,18,2,0.92) 0%, rgba(4,3,0,0.96) 100%)',
      border: '1px solid #a8841f',
      borderLeft: '3px solid #ffcc44',
      borderRadius: 4,
      padding: '8px 10px',
      boxShadow: '0 0 14px rgba(255,200,68,0.14), inset 0 0 22px rgba(255,200,68,0.05)',
    }}>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 5 }}>
        <WeaverIcon />
        <span style={{
          color: '#ffd76a', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.1em',
          textTransform: 'uppercase', fontFamily: 'monospace', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {senderName}
        </span>
        <span style={{ color: '#8a7322', fontSize: 9, fontFamily: 'monospace' }}>{time}</span>
      </div>
      <div style={{ color: '#f1e4ba', fontSize: 11.5, lineHeight: '1.5', fontFamily: 'monospace', wordBreak: 'break-word' }}>
        {content}
      </div>
    </div>
  );
}

function MessageItem({
  message,
  isOwn,
  channel,
  onReported,
  onAwardXP,
  isOwnPremium,
  onOpenDM,
}: {
  message: MessageData;
  isOwn: boolean;
  channel: string;
  onReported: () => void;
  onAwardXP?: (amount: number, reason: string) => void;
  /** Whether the own player has a Pro subscription (to show badge on own messages) */
  isOwnPremium?: boolean;
  onOpenDM?: (peerId: string, peerName: string) => void;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reported, setReported] = useState(false);

  const time = fmtTime(message.created_at);

  // Weaver persona — gold-on-black card, no DM/report affordances.
  if (message.sender_id === WEAVER_SENDER_ID) {
    return <WeaverMessage senderName={message.sender_name} content={message.content} time={time} />;
  }

  const canOpenDM = !isOwn && message.sender_id !== 'system' && message.sender_id !== 'astra' && Boolean(onOpenDM);

  const handleReport = async () => {
    try {
      await reportMessage(message.id, message.sender_id, message.content, channel);
      setReported(true);
      setConfirmReport(false);
      onReported();
    } catch {
      setConfirmReport(false);
    }
  };

  // Skip quiz/digest system messages in global tab (they now go to A.S.T.R.A.)
  if (message.sender_id === 'system' && channel === 'global') {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed?.type === 'quiz' || parsed?.type === 'digest') return null;
    } catch { /* not JSON, render normally */ }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmReport(false); }}
      style={{
        background: isOwn ? 'rgba(30,50,70,0.4)' : 'transparent',
        borderRadius: 3,
        padding: '3px 6px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        {canOpenDM ? (
          <button
            type="button"
            onClick={() => onOpenDM?.(message.sender_id, message.sender_name)}
            title={t('chat.new_conversation')}
            style={{
              background: hovered ? 'rgba(34,68,102,0.42)' : 'rgba(20,30,45,0.5)',
              border: `1px solid ${hovered ? '#446688' : '#223344'}`,
              borderRadius: 3,
              color: hovered ? '#ccddee' : '#aabbcc',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 7px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
          >
            <span>{message.sender_name}</span>
            <span style={{ color: hovered ? '#7bb8ff' : '#667788', fontSize: 8, fontWeight: 'normal' }}>
              DM
            </span>
          </button>
        ) : (
          <span style={{
            color: isOwn ? '#4488aa' : '#8899aa',
            fontSize: 10,
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
          }}>
            {isOwn ? t('chat.you_label') : message.sender_name}
            {isOwn && isOwnPremium && <ProBadge />}
          </span>
        )}
        <span style={{ color: '#445566', fontSize: 9 }}>{time}</span>

        {/* Report flag — only for others, only on hover */}
        {!isOwn && message.sender_id !== 'system' && (hovered || confirmReport) && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {!confirmReport && !reported && (
              <button
                onClick={() => setConfirmReport(true)}
                title={t('chat.report_btn')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#556677',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: '0 2px',
                  lineHeight: 1,
                }}
              >
                [!]
              </button>
            )}
            {confirmReport && (
              <>
                <span style={{ color: '#8899aa', fontSize: 9 }}>{t('chat.report_question')}</span>
                <button
                  onClick={handleReport}
                  style={{
                    background: 'rgba(150,30,30,0.3)',
                    border: '1px solid #cc4444',
                    borderRadius: 2,
                    color: '#ff8888',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    cursor: 'pointer',
                    padding: '1px 5px',
                  }}
                >
                  {t('chat.report_yes')}
                </button>
                <button
                  onClick={() => setConfirmReport(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #334455',
                    borderRadius: 2,
                    color: '#667788',
                    fontFamily: 'monospace',
                    fontSize: 9,
                    cursor: 'pointer',
                    padding: '1px 5px',
                  }}
                >
                  {t('chat.report_no')}
                </button>
              </>
            )}
            {reported && (
              <span style={{ color: '#44ff88', fontSize: 9 }}>{t('chat.reported')}</span>
            )}
          </span>
        )}
      </div>
      <div style={{ color: '#aabbcc', fontSize: 11, lineHeight: '1.4', wordBreak: 'break-word' }}>
        {message.content}
      </div>
    </div>
  );
}

// Community poll card — global tab, collapsed to a single-line banner by
// default with an expand toggle. Before voting: question + option buttons,
// no results. After voting: percentage bars only (never counts) — the
// server enforces this by simply never sending a count in the response.
function PollCard({
  poll,
  expanded,
  onToggleExpand,
  onVote,
  voting,
  error,
}: {
  poll: ActivePollView;
  expanded: boolean;
  onToggleExpand: () => void;
  onVote: (optionId: string) => void;
  voting: boolean;
  error: string | null;
}) {
  const { t, i18n } = useTranslation();
  const isUk = i18n.language.startsWith('uk');
  const question = isUk ? poll.questionUk : poll.questionEn;
  const percentByOption = useMemo(
    () => new Map((poll.percentages ?? []).map((p) => [p.optionId, p.percentage])),
    [poll.percentages],
  );

  return (
    <div style={{
      margin: '6px 12px 0',
      background: 'rgba(10,15,25,0.92)',
      border: '1px solid #334455',
      borderRadius: 4,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={onToggleExpand}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '7px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'monospace',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ color: '#7bb8ff', fontSize: 9, fontWeight: 'bold', letterSpacing: '0.05em', flexShrink: 0 }}>
            {t('polls.badge')}
          </span>
          <span style={{
            color: '#aabbcc',
            fontSize: 11,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {question}
          </span>
        </span>
        <span style={{ color: '#667788', fontSize: 10, flexShrink: 0 }}>
          {expanded ? '\u25b2' : (poll.hasVoted ? t('polls.results_short') : t('polls.vote_short'))}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: '#aabbcc', fontSize: 12, lineHeight: 1.4 }}>{question}</div>

          {!poll.hasVoted && poll.status === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {poll.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={voting}
                  onClick={() => onVote(opt.id)}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(68,136,170,0.12)',
                    border: '1px solid #446688',
                    borderRadius: 3,
                    color: '#aabbcc',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    padding: '6px 9px',
                    cursor: voting ? 'not-allowed' : 'pointer',
                    opacity: voting ? 0.6 : 1,
                  }}
                >
                  {isUk ? opt.labelUk : opt.labelEn}
                </button>
              ))}
            </div>
          )}

          {!poll.hasVoted && poll.status === 'closed' && (
            <div style={{ color: '#8899aa', fontSize: 10 }}>{t('polls.closed')}</div>
          )}

          {poll.hasVoted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {poll.options.map((opt) => {
                const pct = percentByOption.get(opt.id) ?? 0;
                const isMine = opt.id === poll.votedOptionId;
                return (
                  <div key={opt.id}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: isMine ? '#7bb8ff' : '#8899aa',
                      marginBottom: 2,
                    }}>
                      <span>{isUk ? opt.labelUk : opt.labelEn}{isMine ? ` \u2014 ${t('polls.your_vote')}` : ''}</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(51,68,85,0.6)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        background: '#4488aa',
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ color: '#667788', fontSize: 9, marginTop: 2 }}>
                {poll.status === 'closed' ? t('polls.closed') : t('polls.total_hidden')}
              </div>
            </div>
          )}

          {error && <div style={{ color: '#ff9988', fontSize: 10 }}>{t('polls.vote_error')}</div>}
        </div>
      )}
    </div>
  );
}

// Digest card extracted to its own component so it can use useTranslation
function DigestCard({
  time,
  parsed,
  onOpen,
  loading,
}: {
  time: string;
  parsed: { weekDate?: string };
  onOpen?: (weekDate: string | null | undefined) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      padding: '6px 8px',
      background: 'rgba(0,40,30,0.4)',
      border: '1px solid #336655',
      borderRadius: 4,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ color: '#44ffaa', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          NEBULIFE WEEKLY
        </span>
        <span style={{ color: '#445566', fontSize: 9, fontFamily: 'monospace' }}>{time}</span>
      </div>
      <div style={{ color: '#aabbcc', fontSize: 10, fontFamily: 'monospace', marginBottom: 6 }}>
        {t('chat.weekly_digest_available')}
      </div>
      <button
        onClick={() => {
          if (loading) return;
          onOpen?.(parsed.weekDate);
          window.dispatchEvent(new CustomEvent('nebulife:open-digest', { detail: { weekDate: parsed.weekDate } }));
        }}
        disabled={loading}
        aria-busy={loading}
        style={{
          background: 'rgba(34,102,170,0.25)',
          border: '1px solid #4488aa',
          borderRadius: 3,
          color: '#7bb8ff',
          fontFamily: 'monospace',
          fontSize: 10,
          padding: '4px 12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? t('common.loading') : t('chat.open_digest')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A.S.T.R.A. sub-components
// ---------------------------------------------------------------------------

interface QuizLangData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

/** Server quiz payload. Post-v158 it's bilingual `{uk, en}`; legacy single-
 *  language quizzes are still supported via the flat-object fallback. */
type QuizPayload = QuizLangData | { uk: QuizLangData; en: QuizLangData };

function resolveQuizData(raw: QuizPayload): QuizLangData {
  if ('uk' in raw && 'en' in raw) {
    const lang = (i18nInstance.language?.startsWith('en') ? 'en' : 'uk') as 'uk' | 'en';
    return raw[lang] ?? raw.uk ?? raw.en;
  }
  return raw as QuizLangData;
}

function QuizCard({
  data: rawData,
  messageId,
  onAwardXP,
  selectedAnswer,
  onQuizAnswer,
}: {
  data: QuizPayload;
  messageId: string;
  onAwardXP?: (amount: number, reason: string) => void;
  selectedAnswer?: number;
  onQuizAnswer?: (messageId: string, selectedIndex: number) => void;
}) {
  const { t } = useTranslation();
  const data = resolveQuizData(rawData);
  // Persist answer per message in localStorage
  const storageKey = `nebulife_quiz_${messageId}`;
  const [selected, setSelected] = useState<number | null>(() => {
    if (selectedAnswer !== undefined) return selectedAnswer;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? Number(saved) : null;
    } catch { return null; }
  });
  const [showXP, setShowXP] = useState(false);
  const revealed = selected !== null;

  useEffect(() => {
    if (selectedAnswer !== undefined) setSelected(selectedAnswer);
  }, [selectedAnswer]);

  const handleAnswer = (i: number) => {
    if (revealed) return;
    setSelected(i);
    onQuizAnswer?.(messageId, i);
    if (i === data.correctIndex) {
      playSfx('quiz-correct', 0.18);
    } else {
      playSfx('quiz-wrong', 0.25);
    }
    try { localStorage.setItem(storageKey, String(i)); } catch { /* ignore */ }
    // Award XP for correct answer
    if (i === data.correctIndex && onAwardXP) {
      onAwardXP(data.xpReward, 'quiz_correct');
      setShowXP(true);
      setTimeout(() => setShowXP(false), 2000);
    }
  };

  return (
    <div style={{
      background: 'rgba(0,40,30,0.5)',
      border: '1px solid #336655',
      borderRadius: 4,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      position: 'relative',
    }}>
      <div style={{ color: '#44ffaa', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
        {t('chat.quiz_label')} +{data.xpReward} XP
      </div>
      <div style={{ color: '#ccddee', fontSize: 11, fontFamily: 'monospace', lineHeight: '1.4' }}>
        {data.question}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.options.map((opt, i) => {
          let bg = 'rgba(20,35,50,0.6)';
          let border = '#334455';
          let color = '#aabbcc';
          if (revealed) {
            if (i === data.correctIndex) { bg = 'rgba(10,80,40,0.6)'; border = '#44ff88'; color = '#44ff88'; }
            else if (i === selected) { bg = 'rgba(80,20,20,0.6)'; border = '#cc4444'; color = '#ff8888'; }
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={revealed}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 3,
                color,
                fontFamily: 'monospace',
                fontSize: 10,
                padding: '5px 8px',
                textAlign: 'left',
                cursor: revealed ? 'default' : 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ color: '#8899aa', fontSize: 10, fontFamily: 'monospace', lineHeight: '1.4', borderTop: '1px solid #223344', paddingTop: 5 }}>
          {selected === data.correctIndex ? `Правильно! +${data.xpReward} XP` : 'Неправильно.'}
          {' '}{data.explanation}
        </div>
      )}
      {/* XP float animation */}
      {showXP && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: 8,
          color: '#44ff88',
          fontSize: 14,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textShadow: '0 0 8px rgba(68,255,136,0.6)',
          animation: 'quizXpFloat 2s ease-out forwards',
          pointerEvents: 'none',
        }}>
          +{data.xpReward} XP
        </div>
      )}
    </div>
  );
}

function AstraMessageItem({
  msg,
  messageId,
  onAwardXP,
  selectedQuizAnswer,
  onQuizAnswer,
  onDigestOpen,
  digestLoading,
}: {
  msg: AstraMessage;
  messageId: string;
  onAwardXP?: (amount: number, reason: string) => void;
  selectedQuizAnswer?: number;
  onQuizAnswer?: (messageId: string, selectedIndex: number) => void;
  onDigestOpen?: (weekDate: string | null | undefined) => void;
  digestLoading?: boolean;
}) {
  const { t } = useTranslation();
  const isUser = msg.role === 'user';

  // Detect quiz/digest/bilingual-plain JSON from system/astra messages
  let resolvedBodyText: string | null = null;
  if (msg.role === 'model') {
    try {
      const parsed = JSON.parse(msg.text);
      if (parsed?.type === 'quiz' && parsed?.data) {
        return (
          <div style={{ padding: '3px 0' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ color: '#44ffaa', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}>
                A.S.T.R.A.
              </span>
            </div>
            <QuizCard
              data={parsed.data as QuizPayload}
              messageId={messageId}
              onAwardXP={onAwardXP}
              selectedAnswer={selectedQuizAnswer}
              onQuizAnswer={onQuizAnswer}
            />
          </div>
        );
      }
      if (parsed?.type === 'digest') {
        return <DigestCard time="" parsed={parsed} onOpen={onDigestOpen} loading={digestLoading} />;
      }
      // Bilingual plain text (daily fact + future bilingual broadcasts):
      // stored as {"uk":"...","en":"..."}. Pick the player's language
      // at render time. Legacy plain-text messages fall through to the
      // default renderer unchanged.
      if (typeof parsed === 'object' && parsed && typeof parsed.uk === 'string' && typeof parsed.en === 'string') {
        const useEn = i18nInstance.language?.startsWith('en');
        resolvedBodyText = useEn ? parsed.en : parsed.uk;
      }
    } catch { /* not JSON, render normally */ }
  }

  return (
    <div style={{
      background: isUser ? 'rgba(30,50,70,0.4)' : 'rgba(0,30,20,0.3)',
      borderRadius: 3,
      padding: '4px 8px',
      borderLeft: isUser ? 'none' : '2px solid #44ffaa',
    }}>
      <div style={{
        color: isUser ? '#4488aa' : '#44ffaa',
        fontSize: 9,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        marginBottom: 2,
      }}>
        {isUser ? t('chat.you_label') : 'A.S.T.R.A.'}
      </div>
      <div style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {resolvedBodyText ?? msg.text}
      </div>
    </div>
  );
}
