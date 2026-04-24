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
import { askAstra, topupAstraTokens, type AstraMessage, type AstraResponse } from '../../api/ai-api.js';
import { NewDMModal } from './NewDMModal.js';

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
  onSystemNotifRead?: (id: string) => void;
  onNavigateToPlanet?: (systemId: string, planetId: string) => void;
  /** week_date of the most recently seen digest (from player.last_digest_seen) */
  lastDigestSeen?: string | null;
  /** week_date of the latest complete digest (fetched on app load) */
  latestDigestWeekDate?: string | null;
  /** Player's preferred language for ASTRA digest message */
  preferredLanguage?: string;
  /** Callback to award XP (e.g. for quiz correct answers) */
  onAwardXP?: (amount: number, reason: string) => void;
  /** Player level — global chat send requires level 10+ */
  playerLevel?: number;
}

type Tab = 'global' | 'dm-list' | 'dm-chat' | 'system' | 'astra';

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
function ChatWidgetInner({ playerId, playerName, onUnreadChange, systemNotifs = [], onSystemNotifRead, onNavigateToPlanet, lastDigestSeen, latestDigestWeekDate, preferredLanguage, onAwardXP, playerLevel = 1 }: ChatWidgetProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<Tab>('global');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannelInfo[]>([]);
  const [activeDM, setActiveDM] = useState<{ channel: string; peerName: string } | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [unreadGlobal, setUnreadGlobal] = useState(0);
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

  const unreadAstra = (latestDigestWeekDate != null && latestDigestWeekDate !== seenDigestWeekDate) ? 1 : 0;

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
  const [astraLimitReached, setAstraLimitReached] = useState(false);
  const [astraTokensRemaining, setAstraTokensRemaining] = useState<number | null>(null);
  const astraEndRef = useRef<HTMLDivElement>(null);

  // Pro subscriber state
  const isPremium = localStorage.getItem('nebulife_premium') === '1';
  const PRO_DAILY_LIMIT = 50;

  // Compute Pro daily message count from localStorage
  const getProMsgsToday = (): number => {
    const today = new Date().toISOString().slice(0, 10);
    const savedDate = localStorage.getItem('nebulife_pro_msgs_date');
    if (savedDate !== today) return 0;
    return parseInt(localStorage.getItem('nebulife_pro_msgs_today') ?? '0', 10);
  };
  const [proMsgsToday, setProMsgsToday] = useState<number>(() => getProMsgsToday());
  const proLimitReached = isPremium && proMsgsToday >= PRO_DAILY_LIMIT;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastReadRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authFailedRef = useRef(false);

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

  // Fetch A.S.T.R.A. conversation history from DB
  useEffect(() => {
    if (collapsed || tab !== 'astra') return;

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
    const checkUnread = async () => {
      if (stopped) return;
      try {
        const lastRead = localStorage.getItem('nebulife_chat_last_read_global');
        const msgs = await getMessages('global', 50, lastRead || undefined);
        setUnreadGlobal(msgs.length);
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
  }, [collapsed]);

  // Notify parent of unread count changes (system + astra only — global excluded)
  const unreadSystem = systemNotifs.filter(n => !n.read).length;
  useEffect(() => {
    onUnreadChange?.(unreadSystem + unreadAstra);
  }, [unreadSystem, unreadAstra, onUnreadChange]);

  // Mark system notifs as read when viewing system tab
  useEffect(() => {
    if (!collapsed && tab === 'system') {
      systemNotifs.filter(n => !n.read).forEach(n => onSystemNotifRead?.(n.id));
    }
  }, [collapsed, tab, systemNotifs, onSystemNotifRead]);

  // Auto-scroll to bottom only when user is already at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark global as read when viewing
  useEffect(() => {
    if (!collapsed && tab === 'global' && messages.length > 0) {
      const lastTs = messages[messages.length - 1].created_at;
      localStorage.setItem('nebulife_chat_last_read_global', lastTs);
      setUnreadGlobal(0);
    }
  }, [collapsed, tab, messages]);

  const globalLocked = tab === 'global' && playerLevel < 10;

  const handleSend = async () => {
    if (!input.trim() || !activeChannel || sending || globalLocked) return;
    setSending(true);
    setBannedError(false);
    try {
      const msg = await sendMessage(activeChannel, input.trim());
      setMessages((prev) => [...prev, msg]);
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
    setActiveDM({ channel, peerName });
    setTab('dm-chat');
    setMessages([]);
  };

  const handleNewDM = (peerId: string, peerCallsign: string) => {
    setShowNewDM(false);
    const ch = dmChannelId(playerId, peerId);
    openDM(ch, peerCallsign);
  };

  // A.S.T.R.A. send (with optimistic update for instant feedback)
  const handleAstraSend = async () => {
    const text = astraInput.trim();
    // Block if: no text, loading, free limit reached, or pro daily limit reached
    if (!text || astraLoading || astraLimitReached || proLimitReached) return;

    // Pro: increment daily message counter before sending
    if (isPremium) {
      const today = new Date().toISOString().slice(0, 10);
      const newCount = proMsgsToday + 1;
      localStorage.setItem('nebulife_pro_msgs_today', String(newCount));
      localStorage.setItem('nebulife_pro_msgs_date', today);
      setProMsgsToday(newCount);
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
      const resp = await askAstra(text, isPremium);
      // For free users: track token remaining
      if (!isPremium) {
        setAstraTokensRemaining(resp.tokensRemaining);
        if (resp.limitReached) {
          setAstraLimitReached(true);
        }
      }
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
    } catch {
      // Show error as Astra message so user sees feedback
      const errMsg: MessageData = {
        id: `tmp_${Date.now() + 1}`,
        sender_id: 'astra',
        sender_name: 'A.S.T.R.A.',
        channel: `astra:${playerId}`,
        content: 'A.S.T.R.A. offline. Помилка зв\'язку з сервером.',
        created_at: new Date().toISOString(),
      };
      setAstraMessages(prev => [...prev, errMsg]);
    } finally {
      setAstraLoading(false);
    }
  };

  // A.S.T.R.A. charge via quarks (50Q -> 1,000,000 tokens)
  const [astraCharging, setAstraCharging] = useState(false);
  const [astraChargeMsg, setAstraChargeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleAstraTopup = async () => {
    if (astraCharging) return;
    setAstraCharging(true);
    setAstraChargeMsg(null);
    try {
      const result = await topupAstraTokens(playerId);
      if (result.success) {
        setAstraLimitReached(false);
        setAstraTokensRemaining((prev) => (prev ?? 0) + result.tokensGranted);
        setAstraChargeMsg({ text: t('chat.astra_charge_success'), ok: true });
        setTimeout(() => setAstraChargeMsg(null), 3000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('insufficient_quarks')) {
        setAstraChargeMsg({ text: t('chat.astra_charge_no_quarks'), ok: false });
      } else {
        setAstraChargeMsg({ text: t('chat.astra_charge_error'), ok: false });
      }
      setTimeout(() => setAstraChargeMsg(null), 3000);
    } finally {
      setAstraCharging(false);
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
    astraEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [astraMessages]);

  // ── Collapsed state ──
  if (collapsed) {
    const totalUnread = unreadSystem + unreadAstra; // global excluded from badge
    return (
      <button
        onClick={() => {
          playSfx('ui-click', 0.07);
          // Auto-select the tab with unread messages (priority: system > astra > global)
          if (unreadSystem > 0) {
            setTab('system');
          } else if (unreadAstra > 0) {
            setTab('astra');
            setSeenDigestWeekDate(latestDigestWeekDate); // mark as read immediately
          }
          setCollapsed(false);
        }}
        style={{
          position: 'fixed',
          bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          right: 'calc(16px + env(safe-area-inset-right, 0px))',
          zIndex: 9700,
          background: totalUnread > 0 ? 'rgba(8,16,32,0.97)' : 'rgba(10,15,25,0.96)',
          border: `1px solid ${totalUnread > 0 ? 'rgba(68,136,255,0.35)' : '#334455'}`,
          borderRadius: 6,
          color: totalUnread > 0 ? '#88bbff' : '#aabbcc',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '6px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          ...(totalUnread > 0 ? { animation: 'chat-neon-pulse 2s ease-in-out infinite' } : {}),
        }}
      >
        {t('chat.title')}
        {totalUnread > 0 && (
          <span style={{
            background: unreadSystem > 0 ? '#4488aa' : '#44ff88',
            color: '#020510',
            fontSize: 9,
            fontWeight: 'bold',
            borderRadius: 8,
            padding: '1px 5px',
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
        top: 'calc(50px + env(safe-area-inset-top, 0px))',
        bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        right: 'calc(16px + env(safe-area-inset-right, 0px))',
        zIndex: 9700,
        width: 360,
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
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <TabButton
              active={tab === 'astra'}
              onClick={() => { setTab('astra'); setActiveDM(null); setSeenDigestWeekDate(latestDigestWeekDate); }}
              label="A.S.T.R.A."
              badge={unreadAstra > 0 ? unreadAstra : undefined}
              badgeColor="#44ffaa"
            />
            <TabButton
              active={tab === 'global'}
              onClick={() => { setTab('global'); setActiveDM(null); }}
              label={t('chat.tab_global')}
              badge={unreadGlobal > 0 ? unreadGlobal : undefined}
              badgeColor="#44ff88"
            />
            <TabButton
              active={tab === 'dm-list' || tab === 'dm-chat'}
              onClick={() => { setTab('dm-list'); setActiveDM(null); }}
              label="DM"
            />
            <TabButton
              active={tab === 'system'}
              onClick={() => { setTab('system'); setActiveDM(null); }}
              label={t('chat.tab_system')}
              badge={unreadSystem > 0 ? unreadSystem : undefined}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  {onNavigateToPlanet && (
                    <button
                      onClick={() => {
                        onSystemNotifRead?.(notif.id);
                        onNavigateToPlanet(notif.systemId, notif.planetId);
                        setCollapsed(true);
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(34,102,170,0.25)',
                        border: '1px solid #4488aa',
                        borderRadius: 3,
                        color: '#7bb8ff',
                        fontFamily: 'monospace',
                        fontSize: 10,
                        padding: '3px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      {t('chat.go_to_planet')}
                    </button>
                  )}
                </div>
              );
            })}

            {systemMessages.length === 0 && systemNotifs.length === 0 && (
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
            {/* Pro badge / token counter */}
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
                  PRO
                </span>
                <span style={{ color: proMsgsToday >= PRO_DAILY_LIMIT ? '#ff8844' : '#556677', fontSize: 9, fontFamily: 'monospace' }}>
                  {t('chat.pro_messages_today', { count: proMsgsToday })}
                </span>
              </div>
            ) : astraTokensRemaining !== null && (
              <div style={{
                padding: '3px 12px',
                borderBottom: '1px solid #223344',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ color: astraTokensRemaining > 200 ? '#44ffaa' : '#ff8844', fontSize: 9, fontFamily: 'monospace' }}>
                  {astraTokensRemaining} tokens
                </span>
              </div>
            )}

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {/* Digest notification — shown when there's a new unread digest */}
              {latestDigestWeekDate != null && latestDigestWeekDate !== lastDigestSeen && (
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
                    onClick={() => window.dispatchEvent(new CustomEvent('nebulife:open-digest'))}
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

              {astraMessages.length === 0 && !astraLoading && !(latestDigestWeekDate != null && latestDigestWeekDate !== lastDigestSeen) && (
                <div style={{ color: '#44ffaa', fontSize: 10, textAlign: 'center', marginTop: 30, fontFamily: 'monospace', opacity: 0.7 }}>
                  {t('chat.astra_online')}
                </div>
              )}
              {astraMessages.map((msg) => (
                <AstraMessageItem key={msg.id} msg={{ role: (msg.sender_id === 'astra' || msg.sender_id === 'system') ? 'model' : 'user', text: msg.content }} messageId={msg.id} onAwardXP={onAwardXP} />
              ))}
              {astraLoading && (
                <div style={{ color: '#44ffaa', fontSize: 10, fontFamily: 'monospace', opacity: 0.6 }}>
                  A.S.T.R.A. processing...
                </div>
              )}
              <div ref={astraEndRef} />
            </div>

            {/* Limit reached banner + charge options */}
            {((!isPremium && (astraLimitReached || astraChargeMsg)) || proLimitReached) && (
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #223344',
                background: 'rgba(5,10,20,0.7)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                {/* Pro: daily limit reached */}
                {isPremium && proLimitReached && (
                  <span style={{ color: '#ff8844', fontSize: 10, fontFamily: 'monospace' }}>
                    {t('chat.pro_daily_limit')}
                  </span>
                )}
                {/* Free: token depleted */}
                {!isPremium && astraLimitReached && (
                  <span style={{ color: '#ff8844', fontSize: 10, fontFamily: 'monospace' }}>
                    {t('chat.astra_depleted')}
                  </span>
                )}
                {!isPremium && astraChargeMsg && (
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: astraChargeMsg.ok ? '#44ff88' : '#cc4444',
                  }}>
                    {astraChargeMsg.text}
                  </span>
                )}
                {!isPremium && astraLimitReached && (
                  <button
                    onClick={handleAstraTopup}
                    disabled={astraCharging}
                    style={{
                      alignSelf: 'flex-start',
                      background: astraCharging ? 'rgba(34,68,102,0.2)' : 'rgba(34,68,102,0.3)',
                      border: '1px solid #446688',
                      borderRadius: 3,
                      color: '#7bb8ff',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      padding: '4px 10px',
                      cursor: astraCharging ? 'default' : 'pointer',
                      opacity: astraCharging ? 0.6 : 1,
                    }}
                  >
                    {astraCharging ? t('chat.astra_charging') : t('chat.astra_charge_quarks')}
                  </button>
                )}
              </div>
            )}

            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid #223344',
              display: 'flex',
              gap: 8,
            }}>
              {(() => {
                const blocked = astraLoading || (isPremium ? proLimitReached : astraLimitReached);
                const placeholderKey = (isPremium && proLimitReached)
                  ? 'chat.pro_daily_limit'
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
}: {
  message: MessageData;
  isOwn: boolean;
  channel: string;
  onReported: () => void;
  onAwardXP?: (amount: number, reason: string) => void;
  /** Whether the own player has a Pro subscription (to show badge on own messages) */
  isOwnPremium?: boolean;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reported, setReported] = useState(false);

  const time = fmtTime(message.created_at);

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

function QuizCard({ data: rawData, messageId, onAwardXP }: { data: QuizPayload; messageId: string; onAwardXP?: (amount: number, reason: string) => void }) {
  const { t } = useTranslation();
  const data = resolveQuizData(rawData);
  // Persist answer per message in localStorage
  const storageKey = `nebulife_quiz_${messageId}`;
  const [selected, setSelected] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? Number(saved) : null;
    } catch { return null; }
  });
  const [showXP, setShowXP] = useState(false);
  const revealed = selected !== null;

  const handleAnswer = (i: number) => {
    if (revealed) return;
    setSelected(i);
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

function AstraMessageItem({ msg, messageId, onAwardXP }: { msg: AstraMessage; messageId: string; onAwardXP?: (amount: number, reason: string) => void }) {
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
            <QuizCard data={parsed.data as QuizPayload} messageId={messageId} onAwardXP={onAwardXP} />
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
