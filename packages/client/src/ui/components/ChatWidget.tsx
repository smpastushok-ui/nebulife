import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n/index.js';
import { playSfx } from '../../audio/SfxPlayer.js';
import {
  sendMessage,
  getMessages,
  getDMChannels,
  dmChannelId,
  reportMessage,
  type MessageData,
  type DMChannelInfo,
} from '../../api/messages-api.js';
import { askAstra, type AstraMessage } from '../../api/ai-api.js';
import { NewDMModal } from './NewDMModal.js';
import type { LogEntry, LogCategory } from './CosmicArchive/SystemLog.js';

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
}

interface ChatWidgetProps {
  playerId: string;
  playerName: string;
  onUnreadChange?: (count: number) => void;
  systemNotifs?: SystemNotif[];
  logEntries?: LogEntry[];
  onSystemNotifRead?: (id: string) => void;
  onNavigateToPlanet?: (systemId: string, planetId: string) => void;
  onNavigateToSystem?: (systemId: string) => void;
  onOpenPlanetMissionReport?: (systemId: string, planetId: string) => void;
  onOpenSystemReport?: (systemId: string) => void;
  onOpenLogDiscovery?: (entry: LogEntry) => void;
  /** week_date of the most recently seen digest (from player.last_digest_seen) */
  lastDigestSeen?: string | null;
  /** week_date of the latest complete digest (fetched on app load) */
  latestDigestWeekDate?: string | null;
  /** Player's preferred language for ASTRA digest message */
  preferredLanguage?: string;
  /** Callback to award XP (e.g. for quiz correct answers) */
  onAwardXP?: (amount: number, reason: string) => void;
  quizAnswers?: Record<string, number>;
  onQuizAnswer?: (messageId: string, selectedIndex: number) => void;
  onDigestSeen?: (weekDate: string) => void;
  /** Player level — global chat send requires level 10+ */
  playerLevel?: number;
  /** When true, force the widget into collapsed state (e.g. while tutorial is active). */
  forceCollapsed?: boolean;
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

// Exported as React.memo below. ChatWidget is always mounted while the
// player is in-game, so unrelated App.tsx state changes (tutorial steps,
// research ticks, countdown, etc.) previously forced a full re-render of
// the entire chat tree. Memo blocks those; real chat updates come from
// this component's own internal polling + setState so they still render.
function ChatWidgetInner({ playerId, playerName, onUnreadChange, systemNotifs = [], logEntries = [], onSystemNotifRead, onNavigateToPlanet, onNavigateToSystem, onOpenPlanetMissionReport, onOpenSystemReport, onOpenLogDiscovery, lastDigestSeen, latestDigestWeekDate, preferredLanguage, onAwardXP, quizAnswers = {}, onQuizAnswer, onDigestSeen, playerLevel = 1, forceCollapsed = false, isPremium = false }: ChatWidgetProps) {
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

  const verticalSideLayout = viewport.width >= 560 && viewport.height > viewport.width * 1.18;

  // When the tutorial (or another external gate) activates, collapse the chat
  // so it stops covering the tutorial UI. We only react to the rising edge so
  // the user can still manually close the chat themselves — but any attempt to
  // keep it open is immediately overridden while forceCollapsed is true.
  useEffect(() => {
    if (forceCollapsed && !collapsed) setCollapsed(true);
  }, [forceCollapsed, collapsed]);
  const [tab, setTab] = useState<Tab>('global');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannelInfo[]>([]);
  const [activeDM, setActiveDM] = useState<{ channel: string; peerName: string } | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
  const [unreadAstraMessages, setUnreadAstraMessages] = useState(0);
  const [unreadSystemMessages, setUnreadSystemMessages] = useState(0);
  const [unreadDm, setUnreadDm] = useState(0);
  const [bannedError, setBannedError] = useState(false);
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

  const unreadAstraDigest = (latestDigestWeekDate != null && latestDigestWeekDate !== seenDigestWeekDate) ? 1 : 0;
  const unreadAstra = unreadAstraDigest + unreadAstraMessages;

  const markDigestSeen = useCallback((weekDate: string | null | undefined) => {
    if (!weekDate) return;
    setSeenDigestWeekDate(prev => (prev == null || weekDate > prev ? weekDate : prev));
    onDigestSeen?.(weekDate);
  }, [onDigestSeen]);

  const visibleLogEntries = React.useMemo(
    () => [...logEntries].sort((a, b) => a.timestamp - b.timestamp).slice(-50),
    [logEntries],
  );

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

  // A.S.T.R.A. state
  const [astraMessages, setAstraMessages] = useState<MessageData[]>([]);
  const [astraInput, setAstraInput] = useState('');
  const [astraLoading, setAstraLoading] = useState(false);
  const astraEndRef = useRef<HTMLDivElement>(null);
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
  const lastReadRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authFailedRef = useRef(false);

  const readKeyForChannel = useCallback((channel: string): string => {
    if (channel === 'global') return 'nebulife_chat_last_read_global';
    return `nebulife_chat_last_read_${channel}`;
  }, []);

  const jumpToBottom = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Current channel
  const activeChannel = tab === 'global' ? 'global' : activeDM?.channel ?? '';

  // Load initial read timestamp from localStorage
  useEffect(() => {
    lastReadRef.current = localStorage.getItem('nebulife_chat_last_read_global');
  }, []);

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

  // Fetch system channel messages (fun facts, moderation notices)
  const [systemMessages, setSystemMessages] = useState<MessageData[]>([]);
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
        setAstraMessages(msgs);
      } catch { /* ignore */ }
    };

    fetchAstra();
  }, [collapsed, tab, playerId]);

  // Unread count polling (when collapsed)
  useEffect(() => {
    if (!collapsed) return;

    let iv: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    const countUnreadChannel = async (channel: string, setCount: (count: number) => void) => {
      const key = readKeyForChannel(channel);
      const lastRead = localStorage.getItem(key);
      if (!lastRead) {
        const latest = await getMessages(channel, 1);
        const latestTs = latest[latest.length - 1]?.created_at;
        if (latestTs) localStorage.setItem(key, latestTs);
        setCount(0);
        return;
      }
      const msgs = await getMessages(channel, 50, lastRead || undefined);
      const unreadFromOthers = msgs.filter((msg) => msg.sender_id !== playerId);
      setCount(unreadFromOthers.length);
    };

    const checkUnread = async () => {
      if (stopped) return;
      try {
        const lastRead = localStorage.getItem('nebulife_chat_last_read_global');
        if (!lastRead) {
          const latest = await getMessages('global', 1);
          const latestTs = latest[latest.length - 1]?.created_at;
          if (latestTs) {
            localStorage.setItem('nebulife_chat_last_read_global', latestTs);
            lastReadRef.current = latestTs;
          }
          setUnreadGlobal(0);
        } else {
          const msgs = await getMessages('global', 50, lastRead || undefined);
          const unreadFromOthers = msgs.filter((msg) => msg.sender_id !== playerId);
          setUnreadGlobal(unreadFromOthers.length);
        }

        await countUnreadChannel(`astra:${playerId}`, setUnreadAstraMessages);
        await countUnreadChannel(`system:${playerId}`, setUnreadSystemMessages);

        const channels = await getDMChannels();
        let dmUnread = 0;
        for (const channel of channels) {
          const lastReadDm = localStorage.getItem(readKeyForChannel(channel.channel));
          if (!lastReadDm) {
            const latestDm = await getMessages(channel.channel, 1);
            if (latestDm.some((msg) => msg.sender_id !== playerId)) dmUnread += 1;
            continue;
          }
          if (channel.last_at > lastReadDm) {
            const unreadMsgs = await getMessages(channel.channel, 50, lastReadDm);
            dmUnread += unreadMsgs.filter((msg) => msg.sender_id !== playerId).length;
          }
        }
        setUnreadDm(dmUnread);
      } catch (err) {
        if (err instanceof Error && /40[13]/.test(err.message)) {
          stopped = true;
          if (iv) clearInterval(iv);
        }
      }
    };

    checkUnread();
    iv = setInterval(checkUnread, 10000);
    return () => { if (iv) clearInterval(iv); };
  }, [collapsed, playerId, readKeyForChannel]);

  // Notify parent of all unread chat activity so the collapsed comms button
  // does not look idle while global messages are waiting.
  const unreadSystem = (!collapsed && tab === 'system') ? 0 : systemNotifs.filter(n => !n.read).length;
  const effectiveUnreadGlobal = (!collapsed && tab === 'global') ? 0 : unreadGlobal;
  const effectiveUnreadAstra = (!collapsed && tab === 'astra') ? 0 : unreadAstra;
  const effectiveUnreadSystemMessages = (!collapsed && tab === 'system') ? 0 : unreadSystemMessages;
  const effectiveUnreadDm = (!collapsed && (tab === 'dm-list' || tab === 'dm-chat')) ? 0 : unreadDm;
  useEffect(() => {
    onUnreadChange?.(effectiveUnreadGlobal + unreadSystem + effectiveUnreadSystemMessages + effectiveUnreadAstra + effectiveUnreadDm);
  }, [effectiveUnreadGlobal, unreadSystem, effectiveUnreadSystemMessages, effectiveUnreadAstra, effectiveUnreadDm, onUnreadChange]);

  // Mark system notifs as read when viewing system tab
  useEffect(() => {
    if (!collapsed && tab === 'system') {
      systemNotifs.filter(n => !n.read).forEach(n => onSystemNotifRead?.(n.id));
    }
  }, [collapsed, tab, systemNotifs, onSystemNotifRead]);

  useEffect(() => {
    if (collapsed || tab !== 'system' || systemMessages.length === 0) return;
    const lastTs = systemMessages[systemMessages.length - 1].created_at;
    localStorage.setItem(readKeyForChannel(`system:${playerId}`), lastTs);
    setUnreadSystemMessages(0);
  }, [collapsed, playerId, readKeyForChannel, systemMessages, tab]);

  useEffect(() => {
    if (collapsed || tab !== 'astra' || astraMessages.length === 0) return;
    const lastTs = astraMessages[astraMessages.length - 1].created_at;
    localStorage.setItem(readKeyForChannel(`astra:${playerId}`), lastTs);
    setUnreadAstraMessages(0);
  }, [astraMessages, collapsed, playerId, readKeyForChannel, tab]);

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
      localStorage.setItem('nebulife_chat_last_read_global', lastTs);
      lastReadRef.current = lastTs;
      setUnreadGlobal(0);
    }
    if (!collapsed && tab === 'dm-chat' && activeDM && messages.length > 0) {
      const lastTs = messages[messages.length - 1].created_at;
      localStorage.setItem(readKeyForChannel(activeDM.channel), lastTs);
      setUnreadDm(0);
    }
  }, [activeDM, collapsed, messages, readKeyForChannel, tab]);

  const globalLocked = tab === 'global' && playerLevel < 10;

  const handleSend = async () => {
    if (!input.trim() || !activeChannel || sending || globalLocked) return;
    setSending(true);
    setBannedError(false);
    try {
      const msg = await sendMessage(activeChannel, input.trim());
      setMessages((prev) => [...prev, msg]);
      if (activeChannel === 'global') {
        localStorage.setItem('nebulife_chat_last_read_global', msg.created_at);
        lastReadRef.current = msg.created_at;
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
      getMessages(`astra:${playerId}`, 40).then(msgs => setAstraMessages(msgs)).catch(() => {});
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
  }, [jumpToBottom, systemMessages, systemNotifs, visibleLogEntries]);

  // ── Collapsed state ──
  if (collapsed) {
    const totalUnread = effectiveUnreadGlobal + unreadSystem + effectiveUnreadSystemMessages + effectiveUnreadAstra + effectiveUnreadDm;
    const chatIcon = (
      <svg width="23" height="21" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 14.5 L12 5 L15.5 14.5" />
        <path d="M10.2 10.2 H13.8" />
        <path d="M6.2 7.8 C4.8 9.1 4 10.9 4 12.8" opacity="0.5" />
        <path d="M17.8 7.8 C19.2 9.1 20 10.9 20 12.8" opacity="0.5" />
        <path d="M3.3 4.8 C1.9 6.9 1.2 9.3 1.2 11.9" opacity="0.32" />
        <path d="M20.7 4.8 C22.1 6.9 22.8 9.3 22.8 11.9" opacity="0.32" />
        <path d="M7 17 H17" opacity="0.7" />
      </svg>
    );
    return (
      <button
        data-tutorial-id="chat-open-btn"
        title={t('chat.title')}
        aria-label={t('chat.title')}
        onClick={() => {
          playSfx('ui-click', 0.07);
          // Auto-select the tab with unread messages (priority: system > astra > DM > global)
          if (unreadSystem + effectiveUnreadSystemMessages > 0) {
            instantSystemScrollRef.current = true;
            setTab('system');
          } else if (effectiveUnreadAstra > 0) {
            instantAstraScrollRef.current = true;
            setTab('astra');
            markDigestSeen(latestDigestWeekDate); // mark as read immediately
          } else if (effectiveUnreadDm > 0) {
            setTab('dm-list');
          } else if (effectiveUnreadGlobal > 0) {
            instantMessagesScrollRef.current = true;
            setTab('global');
          }
          if (tab === 'global' || unreadGlobal > 0) setUnreadGlobal(0);
          setCollapsed(false);
        }}
        style={{
          position: 'fixed',
          top: verticalSideLayout ? 'calc(50% - 24px)' : undefined,
          bottom: verticalSideLayout ? undefined : 'calc(62px + env(safe-area-inset-bottom, 0px))',
          right: verticalSideLayout ? 'calc(8px + env(safe-area-inset-right, 0px))' : 'calc(16px + env(safe-area-inset-right, 0px))',
          zIndex: 9700,
          width: verticalSideLayout ? 44 : 48,
          height: verticalSideLayout ? 58 : 48,
          boxSizing: 'border-box',
          background: totalUnread > 0
            ? 'linear-gradient(180deg, rgba(18, 38, 58, 0.62), rgba(5, 10, 20, 0.58))'
            : 'linear-gradient(180deg, rgba(12, 24, 40, 0.50), rgba(5, 10, 20, 0.50))',
          border: `1px solid ${totalUnread > 0 ? 'rgba(120, 184, 255, 0.62)' : 'rgba(68, 102, 136, 0.5)'}`,
          borderRadius: 3,
          color: totalUnread > 0 ? '#88bbff' : '#9fb8d0',
          fontFamily: 'monospace',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.24)',
          ...(totalUnread > 0 ? { animation: 'chat-neon-pulse 2s ease-in-out infinite' } : {}),
        }}
      >
        {chatIcon}
        {totalUnread > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: unreadSystem + effectiveUnreadSystemMessages > 0 ? '#4488aa' : effectiveUnreadAstra > 0 ? '#44ffaa' : '#44ff88',
            color: '#020510',
            fontSize: 8,
            fontWeight: 'bold',
            borderRadius: 8,
            padding: '1px 4px',
            minWidth: 14,
            textAlign: 'center',
          }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
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
          <div style={{ display: 'flex', gap: verticalSideLayout ? 4 : 8, minWidth: 0, overflowX: 'auto' }}>
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
          <button
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
            {/* DB system messages (fun facts, moderation notices) */}
            {systemMessages.map((msg) => {
              const msgTime = fmtTime(msg.created_at);
              return (
                <div key={msg.id} style={{
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
            })}

            {/* In-memory system notifs (research complete, etc.) */}
            {[...systemNotifs].reverse().map((notif) => {
              const notifTime = fmtTime(notif.timestamp);
              return (
                <div key={notif.id} style={{
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
                    {onOpenPlanetMissionReport && (
                      <button
                        onClick={() => {
                          onSystemNotifRead?.(notif.id);
                          onOpenPlanetMissionReport(notif.systemId, notif.planetId);
                          setCollapsed(true);
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
                          onNavigateToSystem(notif.systemId);
                          setCollapsed(true);
                        }}
                        style={SYSTEM_ACTION_BUTTON_STYLE}
                      >
                        {t('chat.go_to_system')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {visibleLogEntries.length > 0 && (
              <div style={{
                marginTop: 2,
                borderTop: '1px solid rgba(51,68,85,0.35)',
                paddingTop: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  color: '#445566',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}>
                  <span>{t('log.ship_log')}</span>
                  <span>{t('log.entries_count', { count: logEntries.length })}</span>
                </div>
                {visibleLogEntries.map((entry) => {
                  const entryTime = fmtTime(entry.timestamp);
                  const catColor = LOG_CATEGORY_COLORS[entry.category];
                  return (
                    <div key={entry.id} style={{
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
                      {(entry.systemId || (entry.systemId && entry.planetId) || entry.discoveryRef) && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {entry.objectType === 'planet_mission_report' && entry.systemId && entry.planetId && onOpenPlanetMissionReport && (
                            <button
                              onClick={() => {
                                onOpenPlanetMissionReport(entry.systemId!, entry.planetId!);
                                setCollapsed(true);
                              }}
                              style={SYSTEM_ACTION_BUTTON_STYLE}
                            >
                              {t('chat.view_report')}
                            </button>
                          )}
                          {entry.systemId && onNavigateToSystem && (
                            <button
                              onClick={() => {
                                onNavigateToSystem(entry.systemId!);
                                setCollapsed(true);
                              }}
                              style={SYSTEM_ACTION_BUTTON_STYLE}
                            >
                              {t('chat.go_to_system')}
                            </button>
                          )}
                          {entry.objectType === 'system_research' && entry.systemId && onOpenSystemReport && (
                            <button
                              onClick={() => {
                                onOpenSystemReport(entry.systemId!);
                                setCollapsed(true);
                              }}
                              style={SYSTEM_ACTION_BUTTON_STYLE}
                            >
                              {t('chat.view_report')}
                            </button>
                          )}
                          {entry.discoveryRef && onOpenLogDiscovery && (
                            <button
                              onClick={() => {
                                onOpenLogDiscovery(entry);
                                setCollapsed(true);
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
              </div>
            )}

            {systemMessages.length === 0 && systemNotifs.length === 0 && visibleLogEntries.length === 0 && (
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
            {/* Premium badge / hourly A.S.T.R.A. charge */}
            {isPremium ? (
              <div style={{
                padding: '3px 12px',
                borderBottom: '1px solid #223344',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ color: '#7bb8ff', fontSize: 9, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                  PREMIUM
                </span>
                <span style={{ color: astraLimitReached ? '#ff8844' : '#556677', fontSize: 9, fontFamily: 'monospace' }}>
                  {t('chat.astra_hourly_messages', { count: astraMsgsThisHour })}
                </span>
              </div>
            ) : (
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
              {latestDigestWeekDate != null && latestDigestWeekDate !== seenDigestWeekDate && (
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
                      markDigestSeen(latestDigestWeekDate);
                      window.dispatchEvent(new CustomEvent('nebulife:open-digest'));
                    }}
                    style={{
                      background: 'rgba(68,255,136,0.12)',
                      border: '1px solid rgba(68,255,136,0.4)',
                      borderRadius: 3,
                      color: '#44ff88',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    {preferredLanguage === 'en' ? 'Open digest' : 'Відкрити дайджест'}
                  </button>
                </div>
              )}

              {astraMessages.length === 0 && !astraLoading && !(latestDigestWeekDate != null && latestDigestWeekDate !== seenDigestWeekDate) && (
                <div style={{ color: '#44ffaa', fontSize: 10, textAlign: 'center', marginTop: 30, fontFamily: 'monospace', opacity: 0.7 }}>
                  {t('chat.astra_online')}
                </div>
              )}
              {astraMessages.map((msg) => (
                <AstraMessageItem
                  key={msg.id}
                  msg={{ role: (msg.sender_id === 'astra' || msg.sender_id === 'system') ? 'model' : 'user', text: msg.content }}
                  messageId={msg.id}
                  onAwardXP={onAwardXP}
                  selectedQuizAnswer={quizAnswers[msg.id]}
                  onQuizAnswer={onQuizAnswer}
                />
              ))}
              {astraLoading && (
                <div style={{ color: '#44ffaa', fontSize: 10, fontFamily: 'monospace', opacity: 0.6 }}>
                  A.S.T.R.A. processing...
                </div>
              )}
              <div ref={astraEndRef} />
            </div>

            {/* Limit reached banner */}
            {isPremium && astraLimitReached && (
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #223344',
                background: 'rgba(5,10,20,0.7)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <span style={{ color: '#ff8844', fontSize: 10, fontFamily: 'monospace' }}>
                  {t('chat.astra_hourly_limit')}
                </span>
              </div>
            )}

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

// Digest card extracted to its own component so it can use useTranslation
function DigestCard({ time, parsed }: { time: string; parsed: { weekDate?: string } }) {
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
          window.dispatchEvent(new CustomEvent('nebulife:open-digest', { detail: { weekDate: parsed.weekDate } }));
        }}
        style={{
          background: 'rgba(34,102,170,0.25)',
          border: '1px solid #4488aa',
          borderRadius: 3,
          color: '#7bb8ff',
          fontFamily: 'monospace',
          fontSize: 10,
          padding: '4px 12px',
          cursor: 'pointer',
        }}
      >
        {t('chat.open_digest')}
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
}: {
  msg: AstraMessage;
  messageId: string;
  onAwardXP?: (amount: number, reason: string) => void;
  selectedQuizAnswer?: number;
  onQuizAnswer?: (messageId: string, selectedIndex: number) => void;
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
        return <DigestCard time="" parsed={parsed} />;
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
