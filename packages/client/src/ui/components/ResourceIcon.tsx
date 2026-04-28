import React from 'react';

// ---------------------------------------------------------------------------
// ResourceIcon — shared SVG icons for Minerals, Volatiles, Isotopes, Water
// Matches visuals used in ResourceDisplay (TopBar).
// Usage: <ResourceIcon type="minerals" size={12} />
// ---------------------------------------------------------------------------

export type ResourceType = 'minerals' | 'volatiles' | 'isotopes' | 'water';

interface ResourceIconProps {
  type: ResourceType;
  size?: number;
}

export function ResourceIcon({ type, size = 12 }: ResourceIconProps) {
  switch (type) {
    case 'minerals':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#aa8855" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M8 2.2 L13 7.5 L10.8 14 H5.2 L3 7.5 Z" />
          <path d="M8 2.2 V14 M3 7.5 H13 M5.2 14 L8 7.5 L10.8 14" opacity="0.58" />
        </svg>
      );
    case 'volatiles':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#55aaaa" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8.5" r="4.1" />
          <path d="M2.7 7.8 C5 5.2 11 5.2 13.3 7.8" opacity="0.6" />
          <path d="M2.9 10.3 C5.3 12.5 10.7 12.5 13.1 10.3" opacity="0.45" />
          <path d="M5 5 C6.5 3.9 9.5 3.9 11 5" opacity="0.35" />
        </svg>
      );
    case 'isotopes':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#88aa44" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="1.55" fill="currentColor" stroke="none" opacity="0.55" />
          <ellipse cx="8" cy="8" rx="6.4" ry="2.55" />
          <ellipse cx="8" cy="8" rx="6.4" ry="2.55" transform="rotate(60 8 8)" />
          <ellipse cx="8" cy="8" rx="6.4" ry="2.55" transform="rotate(-60 8 8)" />
        </svg>
      );
    case 'water':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#3b82f6" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M8 2.4 C8 2.4 3.8 7.6 3.8 10.8 A4.2 4.2 0 0 0 12.2 10.8 C12.2 7.6 8 2.4 8 2.4 Z" />
          <path d="M5.7 11.6 C6.9 12.5 9.1 12.5 10.3 11.6" opacity="0.55" />
        </svg>
      );
  }
}

/** Color for the resource value text */
export const RESOURCE_COLORS: Record<ResourceType, string> = {
  minerals: '#aa8855',
  volatiles: '#55aaaa',
  isotopes: '#88aa44',
  water: '#3b82f6',
};
