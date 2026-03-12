import React, { useState, useEffect, useRef } from 'react';
import { searchPlayers } from '../../api/messages-api.js';

// ---------------------------------------------------------------------------
// NewDMModal — search for a player to start a DM conversation
// ---------------------------------------------------------------------------

interface NewDMModalProps {
  onSelect: (peerId: string, peerCallsign: string) => void;
  onClose: () => void;
}

export function NewDMModal({ onSelect, onClose }: NewDMModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; callsign: string }>>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPlayers(query);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      <div style={{
        width: 300,
        background: 'rgba(10,15,25,0.96)',
        border: '1px solid #334455',
        borderRadius: 6,
        padding: 16,
        fontFamily: 'monospace',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <span style={{ color: '#ccddee', fontSize: 12 }}>Нова бесіда</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#667788',
              fontFamily: 'monospace',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            x
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук за позивним..."
          autoFocus
          style={{
            width: '100%',
            background: 'rgba(20,30,45,0.8)',
            border: '1px solid #334455',
            borderRadius: 3,
            color: '#aabbcc',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '8px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
          {searching && (
            <div style={{ color: '#556677', fontSize: 10, padding: 8, textAlign: 'center' }}>
              Пошук...
            </div>
          )}
          {!searching && query.length >= 2 && results.length === 0 && (
            <div style={{ color: '#556677', fontSize: 10, padding: 8, textAlign: 'center' }}>
              Нікого не знайдено
            </div>
          )}
          {results.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player.id, player.callsign)}
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
              }}
            >
              {player.callsign}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
