import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { NavigationMenuItem } from './types.js';
import { toolButtonBase } from './styles.js';

interface NavigationMenuProps {
  items: NavigationMenuItem[];
  onNavigate: (targetScene: string) => void;
}

const compassIcon = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="8" cy="8" r="7" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />
    <path d="M6.5 6.5L5 11l4.5-1.5L11 5z" strokeWidth="0" fill="currentColor" opacity="0.3" />
  </svg>
);

export function NavigationMenu({ items = [], onNavigate }: NavigationMenuProps) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const activeItem = items.find(i => i.active);

  const handleToggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((item: NavigationMenuItem) => {
    if (item.disabled || item.active) return;
    setOpen(false);
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
        style={{
          ...toolButtonBase,
          padding: '4px 10px',
          gap: 6,
          color: open ? '#aaccee' : toolButtonBase.color,
          borderColor: open ? 'rgba(100, 160, 220, 0.4)' : toolButtonBase.borderColor,
        }}
      >
        {compassIcon}
        <span style={{ fontSize: 11 }}>{activeItem?.label ?? ''}</span>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
          <path d="M1 5.5L4 2.5L7 5.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
        </svg>
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
