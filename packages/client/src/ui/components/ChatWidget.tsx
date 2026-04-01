import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '../../i18n/index.js';
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
import { isNativePlatform, canShowAd, showMultipleRewardedAds, claimAdReward } from '../../services/ads-service.js';
import { NewDMModal } from './NewDMModal.js';

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
}

type Tab = 'global' | 'dm-list' | 'dm-chat' | 'system' | 'astra';

export function ChatWidget({ playerId, playerName, onUnreadChange, systemNotifs = [], onSystemNotifRead, onNavigateToPlanet }: ChatWidgetProps) {
  const { t } = useT();
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

  // A.S.T.R.A. state
  const [astraMessages, setAstraMessages] = useState<MessageData[]>([]);
  const [astraInput, setAstraInput] = useState('');
  const [astraLoading, setAstraLoading] = useState(false);
  const [astraLimitReached, setAstraLimitReached] = useState(false);
  const [astraTokensRemaining, setAstraTokensRemaining] = useState<number | null>(null);
  const astraEndRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    pollingRef.current = setInterval(fetchMessages, 3000);
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

  // Notify parent of unread count changes (global + system)
  const unreadSystem = systemNotifs.filter(n => !n.read).length;
  useEffect(() => {
    onUnreadChange?.(unreadGlobal + unreadSystem);
  }, [unreadGlobal, unreadSystem, onUnreadChange]);

  // Mark system notifs as read when viewing system tab
  useEffect(() => {
    if (!collapsed && tab === 'system') {
      systemNotifs.filter(n => !n.read).forEach(n => onSystemNotifRead?.(n.id));
    }
  }, [collapsed, tab, systemNotifs, onSystemNotifRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark global as read when viewing
  useEffect(() => {
    if (!collapsed && tab === 'global' && messages.length > 0) {
      const lastTs = messages[messages.length - 1].created_at;
      localStorage.setItem('nebulife_chat_last_read_global', lastTs);
      setUnreadGlobal(0);
    }
  }, [collapsed, tab, messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeChannel || sending) return;
    setSending(true);
    setBannedError(false);
    try {
      const msg = await sendMessage(activeChannel, input.trim());
      setMessages((prev) => [...prev, msg]);
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

  // A.S.T.R.A. send
  const handleAstraSend = async () => {
    const text = astraInput.trim();
    if (!text || astraLoading || astraLimitReached) return;

    setAstraInput('');
    setAstraLoading(true);

    try {
      const resp = await askAstra(text);
      setAstraTokensRemaining(resp.tokensRemaining);
      if (resp.limitReached) {
        setAstraLimitReached(true);
      }
      // Refresh messages from DB
      const msgs = await getMessages(`astra:${playerId}`, 40);
      setAstraMessages(msgs);
    } catch {
      // Show error inline (not persisted)
    } finally {
      setAstraLoading(false);
    }
  };

  // A.S.T.R.A. topup (payment)
  const handleAstraTopup = async () => {
    try {
      const payUrl = await topupAstraTokens();
      window.open(payUrl, '_blank');
    } catch { /* ignore */ }
  };

  // A.S.T.R.A. charge via rewarded ads
  const handleAstraAdCharge = async () => {
    const watched = await showMultipleRewardedAds(2);
    if (!watched) return;
    const result = await claimAdReward('astra_charge', 2);
    if (result.rewarded) {
      setAstraLimitReached(false);
      setAstraTokensRemaining((prev) => (prev ?? 0) + 200);
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
    const totalUnread = unreadGlobal + unreadSystem;
    return (
      <button
        onClick={() => {
          // If unread system notifs, open to system tab
          if (unreadSystem > 0) setTab('system');
          setCollapsed(false);
        }}
        style={{
          position: 'fixed',
          bottom: 56,
          right: 16,
          zIndex: 9700,
          background: 'rgba(10,15,25,0.96)',
          border: '1px solid #334455',
          borderRadius: 6,
          color: '#aabbcc',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '6px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
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
        bottom: 56,
        right: 16,
        zIndex: 9700,
        width: 360,
        height: 420,
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
              onClick={() => { setTab('astra'); setActiveDM(null); }}
              label="A.S.T.R.A."
            />
            <TabButton
              active={tab === 'global'}
              onClick={() => { setTab('global'); setActiveDM(null); }}
              label={t('chat.tab.global')}
            />
            <TabButton
              active={tab === 'dm-list' || tab === 'dm-chat'}
              onClick={() => { setTab('dm-list'); setActiveDM(null); }}
              label={t('chat.tab.dm')}
            />
            <TabButton
              active={tab === 'system'}
              onClick={() => { setTab('system'); setActiveDM(null); }}
              label={t('chat.tab.system')}
              badge={unreadSystem > 0 ? unreadSystem : undefined}
            />
          </div>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#667788',
              fontFamily: 'monospace',
              fontSize: 14,
              cursor: 'pointer',
              padding: '0 4px',
            }}
            title={t('chat.collapse')}
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
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              {messages.length === 0 && (
                <div style={{ color: '#445566', fontSize: 10, textAlign: 'center', marginTop: 40 }}>
                  {tab === 'global' ? t('chat.quiet') : t('chat.start')}
                </div>
              )}
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === playerId}
                  channel={activeChannel}
                  onReported={() => {}}
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

            {/* Input */}
            <div style={{
              padding: '8px 12px',
              borderTop: bannedError ? 'none' : '1px solid #223344',
              display: 'flex',
              gap: 8,
            }}>
              <input
                value={input}
                onChange={(e) => { setInput(e.target.value); if (bannedError) setBannedError(false); }}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                maxLength={500}
                disabled={bannedError}
                style={{
                  flex: 1,
                  background: 'rgba(20,30,45,0.8)',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: bannedError ? '#556677' : '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim() || bannedError}
                style={{
                  background: input.trim() && !bannedError ? 'rgba(34,170,68,0.2)' : 'rgba(30,40,55,0.5)',
                  border: `1px solid ${input.trim() && !bannedError ? '#44ff88' : '#334455'}`,
                  borderRadius: 3,
                  color: input.trim() && !bannedError ? '#44ff88' : '#556677',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 12px',
                  cursor: input.trim() && !bannedError ? 'pointer' : 'default',
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
              const msgTime = new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
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
              const notifTime = new Date(notif.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
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
                      {t('chat.system_label')}
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
                {t('chat.no_notifications')}
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
              {t('chat.new_thread')}
            </button>
            {dmChannels.length === 0 && (
              <div style={{ color: '#445566', fontSize: 10, textAlign: 'center', marginTop: 20 }}>
                {t('chat.no_threads')}
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
            {/* Token counter */}
            {astraTokensRemaining !== null && (
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
              {astraMessages.length === 0 && !astraLoading && (
                <div style={{ color: '#44ffaa', fontSize: 10, textAlign: 'center', marginTop: 30, fontFamily: 'monospace', opacity: 0.7 }}>
                  {t('chat.astra.online')}
                </div>
              )}
              {astraMessages.map((msg) => (
                <AstraMessageItem key={msg.id} msg={{ role: msg.sender_id === 'astra' ? 'model' : 'user', text: msg.content }} />
              ))}
              {astraLoading && (
                <div style={{ color: '#44ffaa', fontSize: 10, fontFamily: 'monospace', opacity: 0.6 }}>
                  A.S.T.R.A. processing...
                </div>
              )}
              <div ref={astraEndRef} />
            </div>

            {/* Limit reached banner + unlock options */}
            {astraLimitReached && (
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #336655',
                background: 'rgba(0,30,20,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <span style={{ color: '#ff8844', fontSize: 10, fontFamily: 'monospace' }}>
                  {t('chat.astra.discharged')}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {isNativePlatform() && canShowAd() && (
                    <button
                      onClick={handleAstraAdCharge}
                      style={{
                        background: 'rgba(0,80,40,0.3)',
                        border: '1px solid #44ff88',
                        borderRadius: 3,
                        color: '#44ff88',
                        fontFamily: 'monospace',
                        fontSize: 10,
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      {t('chat.astra.recharge')}
                    </button>
                  )}
                  <button
                    onClick={handleAstraTopup}
                    style={{
                      background: 'rgba(34,102,170,0.3)',
                      border: '1px solid #4488aa',
                      borderRadius: 3,
                      color: '#7bb8ff',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('chat.astra.unlock')}
                  </button>
                </div>
              </div>
            )}

            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid #223344',
              display: 'flex',
              gap: 8,
            }}>
              <input
                value={astraInput}
                onChange={(e) => setAstraInput(e.target.value)}
                onKeyDown={handleAstraKeyDown}
                placeholder={astraLimitReached ? t('chat.astra.discharged_placeholder') : t('chat.astra.placeholder')}
                maxLength={1000}
                disabled={astraLoading || astraLimitReached}
                style={{
                  flex: 1,
                  background: 'rgba(20,30,45,0.8)',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: astraLimitReached ? '#556677' : '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAstraSend}
                disabled={astraLoading || !astraInput.trim() || astraLimitReached}
                style={{
                  background: astraInput.trim() && !astraLoading && !astraLimitReached ? 'rgba(0,180,100,0.2)' : 'rgba(30,40,55,0.5)',
                  border: `1px solid ${astraInput.trim() && !astraLoading && !astraLimitReached ? '#44ffaa' : '#334455'}`,
                  borderRadius: 3,
                  color: astraInput.trim() && !astraLoading && !astraLimitReached ? '#44ffaa' : '#556677',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 12px',
                  cursor: astraInput.trim() && !astraLoading && !astraLimitReached ? 'pointer' : 'default',
                }}
              >
                {'>'}
              </button>
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(68,136,170,0.2)' : 'none',
        border: `1px solid ${active ? '#4488aa' : 'transparent'}`,
        borderRadius: 3,
        color: active ? '#4488aa' : '#667788',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        padding: '3px 10px',
        cursor: 'pointer',
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: '#4488aa',
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
}: {
  message: MessageData;
  isOwn: boolean;
  channel: string;
  onReported: () => void;
}) {
  const { t } = useT();
  const [hovered, setHovered] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reported, setReported] = useState(false);

  const time = new Date(message.created_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  });

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

  // Detect quiz/digest JSON from system messages
  if (message.sender_id === 'system') {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed?.type === 'quiz' && parsed?.data) {
        return (
          <div style={{ padding: '3px 0' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ color: '#44ffaa', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' }}>
                {message.sender_name}
              </span>
              <span style={{ color: '#445566', fontSize: 9, fontFamily: 'monospace' }}>{time}</span>
            </div>
            <QuizCard data={parsed.data as QuizData} />
          </div>
        );
      }
      if (parsed?.type === 'digest') {
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
              {t('chat.digest.available')}
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
              {t('chat.digest.open')}
            </button>
          </div>
        );
      }
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
        }}>
          {isOwn ? t('chat.you') : message.sender_name}
        </span>
        <span style={{ color: '#445566', fontSize: 9 }}>{time}</span>

        {/* Report flag — only for others, only on hover */}
        {!isOwn && message.sender_id !== 'system' && (hovered || confirmReport) && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {!confirmReport && !reported && (
              <button
                onClick={() => setConfirmReport(true)}
                title={t('chat.report')}
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
                <span style={{ color: '#8899aa', fontSize: 9 }}>{t('chat.report_confirm')}</span>
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

// ---------------------------------------------------------------------------
// A.S.T.R.A. sub-components
// ---------------------------------------------------------------------------

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
}

function QuizCard({ data }: { data: QuizData }) {
  const [selected, setSelected] = useState<number | null>(null);
  const revealed = selected !== null;

  return (
    <div style={{
      background: 'rgba(0,40,30,0.5)',
      border: '1px solid #336655',
      borderRadius: 4,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
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
              onClick={() => !revealed && setSelected(i)}
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
          {data.explanation}
        </div>
      )}
    </div>
  );
}

function AstraMessageItem({ msg }: { msg: AstraMessage }) {
  const { t } = useT();
  const isUser = msg.role === 'user';

  // Try to parse quiz JSON
  if (!isUser) {
    try {
      const parsed = JSON.parse(msg.text);
      if (parsed?.type === 'quiz' && parsed?.data) {
        return <QuizCard data={parsed.data as QuizData} />;
      }
    } catch { /* not JSON, render as text */ }
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
        {isUser ? t('chat.you') : 'A.S.T.R.A.'}
      </div>
      <div style={{ color: '#aabbcc', fontSize: 11, fontFamily: 'monospace', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {msg.text}
      </div>
    </div>
  );
}
