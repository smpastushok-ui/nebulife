import React, { useState, useRef, useEffect } from 'react';
import type { StarSystem } from '@nebulife/core';

// ---------------------------------------------------------------------------
// SystemNavHeader — Fixed top-center navigation between star systems
// ---------------------------------------------------------------------------
// Shows current system name with ◀ prev / next ▶ buttons anchored to the
// top of the screen. Does not move during pan/zoom of the PixiJS scene.
// Click the center name block to open search among navigable systems.
// ---------------------------------------------------------------------------

interface SystemNavHeaderProps {
  currentSystem: StarSystem;
  currentAlias?: string;
  prevSystem: StarSystem | null;
  prevAlias?: string;
  nextSystem: StarSystem | null;
  nextAlias?: string;
  allSystems: StarSystem[];
  aliases: Record<string, string>;
  onPrev: () => void;
  onNext: () => void;
  onNavigate: (system: StarSystem) => void;
  onTelescopePhoto?: () => void;
  isPhotoGenerating?: boolean;
  getSystemProgress?: (systemId: string) => number;
}

// SVG magnifying glass icon (outline only, no fill)
function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="6.5" cy="6.5" r="4.5" />
      <line x1="10" y1="10" x2="14" y2="14" />
    </svg>
  );
}

export function SystemNavHeader({
  currentSystem,
  currentAlias,
  prevSystem,
  prevAlias,
  nextSystem,
  nextAlias,
  allSystems,
  aliases,
  onPrev,
  onNext,
  onNavigate,
  onTelescopePhoto,
  isPhotoGenerating,
  getSystemProgress,
}: SystemNavHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentName = currentAlias ?? currentSystem.star.name;
  const prevName = prevSystem ? (prevAlias ?? prevSystem.star.name) : null;
  const nextName = nextSystem ? (nextAlias ?? nextSystem.star.name) : null;

  // Filtered systems list
  const filtered = query.trim()
    ? allSystems.filter((s) => {
        const name = (aliases[s.id] ?? s.star.name).toLowerCase();
        return name.includes(query.toLowerCase());
      })
    : allSystems;

  // Open search: focus input
  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [searchOpen]);

  // Close search on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const btnBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '5px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    minWidth: 110,
  };

  const nameStyle: React.CSSProperties = {
    maxWidth: 90,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#667788',
  };

  const arrowStyle: React.CSSProperties = {
    color: '#7bb8ff',
    fontSize: 12,
    flexShrink: 0,
  };

  const divider = (
    <div style={{ width: 1, height: 18, background: '#334455', flexShrink: 0 }} />
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* Main nav row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(5, 10, 20, 0.85)',
          border: '1px solid #334455',
          borderRadius: searchOpen ? '4px 4px 0 0' : 4,
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(6px)',
        }}
      >
        {/* Prev button */}
        <button
          onClick={onPrev}
          title={prevName ?? undefined}
          style={{
            ...btnBase,
            cursor: prevSystem ? 'pointer' : 'default',
            justifyContent: 'flex-end',
            color: prevSystem ? '#667788' : 'transparent',
            pointerEvents: prevSystem ? 'auto' : 'none',
          }}
        >
          <span style={arrowStyle}>◀</span>
          <span style={nameStyle}>{prevName}</span>
        </button>

        {divider}

        {/* Current system name — click to toggle search */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
          }}
        >
          <span
            style={{
              color: '#aabbcc',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            {currentName}
          </span>
          <span style={{ color: searchOpen ? '#7bb8ff' : '#334455' }}>
            <SearchIcon size={13} />
          </span>
        </button>

        {divider}

        {/* Next button */}
        <button
          onClick={onNext}
          title={nextName ?? undefined}
          style={{
            ...btnBase,
            cursor: nextSystem ? 'pointer' : 'default',
            justifyContent: 'flex-start',
            color: nextSystem ? '#667788' : 'transparent',
            pointerEvents: nextSystem ? 'auto' : 'none',
          }}
        >
          <span style={nameStyle}>{nextName}</span>
          <span style={arrowStyle}>▶</span>
        </button>
      </div>

      {/* Telescope photo button */}
      {onTelescopePhoto && !searchOpen && (
        <TelescopeButton onClick={onTelescopePhoto} generating={isPhotoGenerating} />
      )}

      {/* Search dropdown */}
      {searchOpen && (
        <div
          style={{
            background: 'rgba(5, 10, 20, 0.95)',
            border: '1px solid #334455',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            backdropFilter: 'blur(6px)',
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(51,68,85,0.5)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="пошук системи..."
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#aabbcc',
                fontFamily: 'monospace',
                fontSize: 11,
                caretColor: '#7bb8ff',
              }}
            />
          </div>

          {/* Results list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', color: '#445566', fontSize: 11 }}>
                нічого не знайдено
              </div>
            ) : (
              filtered.map((s) => {
                const name = aliases[s.id] ?? s.star.name;
                const isCurrent = s.id === currentSystem.id;
                const prog = getSystemProgress?.(s.id);
                return (
                  <SearchResultItem
                    key={s.id}
                    name={name}
                    spectral={`${s.star.spectralClass}${s.star.subType}`}
                    isCurrent={isCurrent}
                    progress={prog}
                    onClick={() => {
                      setSearchOpen(false);
                      if (!isCurrent) onNavigate(s);
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultItem({
  name, spectral, isCurrent, progress, onClick,
}: {
  name: string; spectral: string; isCurrent: boolean; progress?: number; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const isUnresearched = progress !== undefined && progress < 100;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 12px',
        background: hover ? 'rgba(40,60,90,0.4)' : 'none',
        border: 'none',
        cursor: isCurrent ? 'default' : 'pointer',
        fontFamily: 'monospace',
        fontSize: 11,
        textAlign: 'left',
        color: isCurrent ? '#7bb8ff' : isUnresearched ? '#556677' : '#8899aa',
      }}
    >
      <span>
        {name}
        {isUnresearched && (
          <span style={{ color: '#445566', fontSize: 9, marginLeft: 6 }}>
            {`${Math.round(progress)}%`}
          </span>
        )}
      </span>
      <span style={{ color: '#445566', fontSize: 10 }}>{spectral}</span>
    </button>
  );
}

function TelescopeButton({ onClick, generating }: { onClick: () => void; generating?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={generating}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '4px 12px',
        marginTop: 4,
        background: hover && !generating ? 'rgba(30, 50, 80, 0.7)' : 'rgba(5, 10, 20, 0.85)',
        border: '1px solid',
        borderColor: generating ? '#446688' : hover ? '#4488aa' : '#334455',
        borderRadius: 4,
        cursor: generating ? 'default' : 'pointer',
        fontFamily: 'monospace',
        fontSize: 10,
        color: generating ? '#4488aa' : hover ? '#aabbcc' : '#667788',
        backdropFilter: 'blur(6px)',
        transition: 'all 0.15s',
        alignSelf: 'center',
      }}
    >
      {/* Telescope SVG icon */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <line x1="2" y1="11" x2="10" y2="5" />
        <circle cx="12" cy="3.5" r="2.5" />
        <line x1="2" y1="11" x2="0.5" y2="15" />
        <line x1="2" y1="11" x2="4" y2="15" />
      </svg>
      <span>{generating ? 'Обробка знімку...' : 'Фото 30⚛'}</span>
    </button>
  );
}
