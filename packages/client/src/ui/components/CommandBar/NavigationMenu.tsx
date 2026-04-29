import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { NavigationMenuItem } from './types.js';
import { playSfx } from '../../../audio/SfxPlayer.js';

interface NavigationMenuProps {
  items: NavigationMenuItem[];
  onNavigate: (targetScene: string) => void;
  disabled?: boolean;
}

const screenSwitcherIcon = (
  <svg width="23" height="22" viewBox="0 0 28 26" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7.5 H19 V16 H7 Z" />
    <path d="M11 4.5 H23 V13" opacity="0.42" />
    <path d="M4 10.5 H16 V19 H4 Z" opacity="0.66" />
    <path d="M21.5 17.5 L24.5 14.5 L21.5 11.5" opacity="0.78" />
  </svg>
);

export function NavigationMenu({ items = [], onNavigate, disabled }: NavigationMenuProps) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const activeItem = items.find(i => i.active);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    playSfx('ui-click', 0.07);
    setOpen(prev => !prev);
  }, [disabled]);

  const handleSelect = useCallback((item: NavigationMenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    if (item.active) return;
    playSfx('ui-click', 0.07);
    onNavigate(item.scene);
  }, [onNavigate]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        title={activeItem?.label}
        style={{
          width: 'clamp(48px, 12vw, 54px)',
          height: 44,
          minHeight: 44,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: open
            ? 'linear-gradient(180deg, rgba(30, 58, 88, 0.50), rgba(10, 18, 32, 0.58))'
            : 'linear-gradient(180deg, rgba(10, 18, 32, 0.48), rgba(5, 10, 20, 0.42))',
          border: `1px solid ${open ? 'rgba(120, 184, 255, 0.62)' : 'rgba(68, 102, 136, 0.5)'}`,
          borderRadius: 3,
          color: open ? '#aaccee' : '#9fb8d0',
          fontFamily: 'monospace',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: disabled ? 0.4 : 1,
          pointerEvents: disabled ? 'none' as const : 'auto' as const,
        }}
      >
        {screenSwitcherIcon}
        <span
          style={{
            position: 'absolute',
            right: 5,
            top: 5,
            width: 8,
            height: 8,
            borderRadius: '50%',
            border: `1px solid ${open ? 'rgba(123,184,255,0.90)' : 'rgba(123,184,255,0.42)'}`,
            background: open ? 'rgba(123,184,255,0.35)' : 'rgba(123,184,255,0.08)',
            boxShadow: open ? '0 0 8px rgba(123,184,255,0.42)' : undefined,
          }}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            minWidth: 200,
            background: 'rgba(10, 15, 25, 0.96)',
            border: '1px solid #334455',
            borderRadius: 6,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
            fontFamily: 'monospace',
            fontSize: 12,
            zIndex: 9600,
            overflow: 'hidden',
            animation: 'cmdbar-fade-in 0.12s ease-out',
          }}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separator && (
                <div style={{ height: 1, background: '#223344', margin: '2px 10px' }} />
              )}
              <button
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 14px',
                  background: hoveredId === item.id && !item.disabled && !item.active
                    ? 'rgba(40, 60, 90, 0.4)'
                    : 'transparent',
                  border: 'none',
                  borderLeft: item.active ? '2px solid #4488aa' : '2px solid transparent',
                  color: item.active
                    ? '#aaccee'
                    : item.disabled
                      ? '#445566'
                      : '#8899aa',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  cursor: item.disabled || item.active ? 'default' : 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', opacity: item.disabled ? 0.4 : 0.8, width: 14, justifyContent: 'center' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
