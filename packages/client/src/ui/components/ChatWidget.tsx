import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  sendMessage,
  getMessages,
  getDMChannels,
  dmChannelId,
  type MessageData,
  type DMChannelInfo,
} from '../../api/messages-api.js';
import { NewDMModal } from './NewDMModal.js';

// ---------------------------------------------------------------------------
// ChatWidget — minimized messenger at bottom-right
// ---------------------------------------------------------------------------

interface ChatWidgetProps {
  playerId: string;
  playerName: string;
  onUnreadChange?: (count: number) => void;
}

type Tab = 'global' | 'dm-list' | 'dm-chat';

export function ChatWidget({ playerId, playerName, onUnreadChange }: ChatWidgetProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<Tab>('global');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannelInfo[]>([]);
  const [activeDM, setActiveDM] = useState<{ channel: string; peerName: string } | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [unreadGlobal, setUnreadGlobal] = useState(0);

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

  // Notify parent of unread count changes
  useEffect(() => {
    onUnreadChange?.(unreadGlobal);
  }, [unreadGlobal, onUnreadChange]);

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
    try {
      const msg = await sendMessage(activeChannel, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput('');
    } catch (err) {
      console.warn('Failed to send message:', err);
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

  // ── Collapsed state ──
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: 56,
          right: 16,
          zIndex: 9400,
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
        Чат
        {unreadGlobal > 0 && (
          <span style={{
            background: '#44ff88',
            color: '#020510',
            fontSize: 9,
            fontWeight: 'bold',
            borderRadius: 8,
            padding: '1px 5px',
            minWidth: 14,
            textAlign: 'center',
          }}>
            {unreadGlobal > 99 ? '99+' : unreadGlobal}
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
        zIndex: 9400,
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
              active={tab === 'global'}
              onClick={() => { setTab('global'); setActiveDM(null); }}
              label="Загальний"
            />
            <TabButton
              active={tab === 'dm-list' || tab === 'dm-chat'}
              onClick={() => { setTab('dm-list'); setActiveDM(null); }}
              label="DM"
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
            title="Згорнути"
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
                  {tab === 'global' ? 'Поки що тихо...' : 'Почніть розмову'}
                </div>
              )}
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} isOwn={msg.sender_id === playerId} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '8px 12px',
              borderTop: '1px solid #223344',
              display: 'flex',
              gap: 8,
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Повідомлення..."
                maxLength={500}
                style={{
                  flex: 1,
                  background: 'rgba(20,30,45,0.8)',
                  border: '1px solid #334455',
                  borderRadius: 3,
                  color: '#aabbcc',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                style={{
                  background: input.trim() ? 'rgba(34,170,68,0.2)' : 'rgba(30,40,55,0.5)',
                  border: `1px solid ${input.trim() ? '#44ff88' : '#334455'}`,
                  borderRadius: 3,
                  color: input.trim() ? '#44ff88' : '#556677',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '6px 12px',
                  cursor: input.trim() ? 'pointer' : 'default',
                }}
              >
                {'>'}
              </button>
            </div>
          </>
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
              + Нова бесіда
            </button>
            {dmChannels.length === 0 && (
              <div style={{ color: '#445566', fontSize: 10, textAlign: 'center', marginTop: 20 }}>
                Немає бесід
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

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(68,136,170,0.2)' : 'none',
        border: `1px solid ${active ? '#4488aa' : 'transparent'}`,
        borderRadius: 3,
        color: active ? '#4488aa' : '#667788',
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '3px 10px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function MessageItem({ message, isOwn }: { message: MessageData; isOwn: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{
      background: isOwn ? 'rgba(30,50,70,0.4)' : 'transparent',
      borderRadius: 3,
      padding: '3px 6px',
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{
          color: isOwn ? '#4488aa' : '#8899aa',
          fontSize: 10,
          fontWeight: 'bold',
        }}>
          {isOwn ? 'Ви' : message.sender_name}
        </span>
        <span style={{ color: '#445566', fontSize: 9 }}>{time}</span>
      </div>
      <div style={{ color: '#aabbcc', fontSize: 11, lineHeight: '1.4', wordBreak: 'break-word' }}>
        {message.content}
      </div>
    </div>
  );
}
