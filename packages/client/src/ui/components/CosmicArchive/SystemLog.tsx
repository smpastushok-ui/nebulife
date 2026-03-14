import React, { useState, useMemo } from 'react';
import type { Discovery } from '@nebulife/core';
import type { DiscoveryData } from '../../../api/player-api';

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
  /** Catalog object type — links this entry to a discovery */
  objectType?: string;
  /** Full Discovery ref for re-opening the generation flow from the log */
  discoveryRef?: Discovery;
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
  /** Map of object_type → DiscoveryData to check photo status */
  galleryMap?: Map<string, DiscoveryData>;
  /** Callback when user clicks an active (no-photo) discovery entry */
  onOpenDiscovery?: (discovery: Discovery) => void;
}

export function SystemLog({ entries, galleryMap, onOpenDiscovery }: SystemLogProps) {
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
          filtered.map((entry) => {
            // Determine if this discovery entry is actionable (has discovery, no photo yet)
            const hasPhoto = entry.objectType
              ? !!(galleryMap?.get(entry.objectType)?.photo_url)
              : false;
            const isActionable = !!entry.discoveryRef && !hasPhoto;

            return (
              <LogEntryRow
                key={entry.id}
                entry={entry}
                actionable={isActionable}
                completed={!!entry.discoveryRef && hasPhoto}
                onClick={isActionable && onOpenDiscovery
                  ? () => onOpenDiscovery(entry.discoveryRef!)
                  : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogEntryRow
// ---------------------------------------------------------------------------

function LogEntryRow({
  entry,
  actionable,
  completed,
  onClick,
}: {
  entry: LogEntry;
  actionable?: boolean;
  completed?: boolean;
  onClick?: () => void;
}) {
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
      onClick={onClick}
      style={{
        padding: '6px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        background: actionable && hover
          ? 'rgba(30, 50, 70, 0.4)'
          : hover
            ? 'rgba(20, 30, 45, 0.3)'
            : 'transparent',
        transition: 'background 0.1s',
        fontSize: 11,
        cursor: actionable ? 'pointer' : 'default',
        opacity: completed ? 0.45 : 1,
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
        color: completed ? '#556677' : actionable ? '#aaccee' : '#8899aa',
        flex: 1,
        lineHeight: '1.4',
      }}>
        {entry.text}
        {actionable && (
          <span style={{
            color: '#4488aa',
            fontSize: 9,
            marginLeft: 6,
          }}>
            [відкрити]
          </span>
        )}
        {completed && (
          <span style={{
            color: '#44ff88',
            fontSize: 9,
            marginLeft: 6,
            opacity: 0.7,
          }}>
            [знято]
          </span>
        )}
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
