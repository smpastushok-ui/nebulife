import React, { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// System Log — chronological event feed (ship's log style)
// ---------------------------------------------------------------------------

export type LogCategory = 'economy' | 'science' | 'expedition' | 'system';

export interface LogEntry {
  id: string;
  category: LogCategory;
  text: string;
  timestamp: number;
  planetName?: string;
  systemId?: string;
  planetId?: string;
}

const CATEGORY_LABELS: Record<LogCategory, string> = {
  economy: 'ЕКОНОМІКА',
  science: 'НАУКА',
  expedition: 'ЕКСПЕДИЦІЯ',
  system: 'СИСТЕМА',
};

const CATEGORY_COLORS: Record<LogCategory, string> = {
  economy: '#cc8822',
  science: '#4488aa',
  expedition: '#44ff88',
  system: '#667788',
};

interface SystemLogProps {
  entries: LogEntry[];
}

export function SystemLog({ entries }: SystemLogProps) {
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    if (filter === 'all') return sorted;
    return sorted.filter((e) => e.category === filter);
  }, [entries, filter]);

  const filters: { id: LogCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Всі' },
    { id: 'economy', label: 'Економіка' },
    { id: 'science', label: 'Наука' },
    { id: 'expedition', label: 'Експедиції' },
    { id: 'system', label: 'Системні' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {filters.map((f) => (
          <FilterChip
            key={f.id}
            label={f.label}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          />
        ))}
      </div>

      {/* Log entries */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        background: 'rgba(2, 5, 12, 0.6)',
        border: '1px solid rgba(51, 68, 85, 0.2)',
        borderRadius: 4,
        padding: '8px 0',
        fontFamily: 'monospace',
      }}>
        {/* Header line */}
        <div style={{
          padding: '4px 14px 8px',
          borderBottom: '1px solid rgba(51, 68, 85, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#445566', letterSpacing: 1.5 }}>
            БОРТОВИЙ ЖУРНАЛ
          </span>
          <span style={{ fontSize: 9, color: '#334455' }}>
            {entries.length} записів
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding: '30px 14px',
            textAlign: 'center',
            color: '#445566',
            fontSize: 11,
          }}>
            {filter === 'all'
              ? 'Журнал порожній. Події будуть з\'являтися тут.'
              : 'Немає записів у цій категорії.'}
          </div>
        ) : (
          filtered.map((entry) => (
            <LogEntryRow key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogEntryRow
// ---------------------------------------------------------------------------

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [hover, setHover] = useState(false);
  const time = new Date(entry.timestamp).toLocaleString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

  const catColor = CATEGORY_COLORS[entry.category];
  const catLabel = CATEGORY_LABELS[entry.category];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        background: hover ? 'rgba(20, 30, 45, 0.3)' : 'transparent',
        transition: 'background 0.1s',
        fontSize: 11,
      }}
    >
      {/* Timestamp */}
      <span style={{
        color: '#334455',
        fontSize: 9,
        flexShrink: 0,
        minWidth: 70,
        paddingTop: 1,
      }}>
        {time}
      </span>

      {/* Category badge */}
      <span style={{
        color: catColor,
        fontSize: 9,
        flexShrink: 0,
        minWidth: 80,
        letterSpacing: 0.5,
        paddingTop: 1,
      }}>
        [{catLabel}]
      </span>

      {/* Message text */}
      <span style={{
        color: '#8899aa',
        flex: 1,
        lineHeight: '1.4',
      }}>
        {entry.text}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterChip
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '4px 10px',
        background: active ? 'rgba(68, 136, 170, 0.2)' : 'none',
        border: `1px solid ${active ? '#4488aa' : 'rgba(51, 68, 85, 0.3)'}`,
        borderRadius: 3,
        color: active ? '#aaccee' : hover ? '#8899aa' : '#556677',
        fontFamily: 'monospace',
        fontSize: 10,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
