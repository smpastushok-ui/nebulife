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
          stroke="#aa8855" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M8 2L13 7L8 14L3 7Z" />
          <line x1="3" y1="7" x2="13" y2="7" />
          <line x1="8" y1="2" x2="5.5" y2="7" />
          <line x1="8" y1="2" x2="10.5" y2="7" />
        </svg>
      );
    case 'volatiles':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#55aaaa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <circle cx="6" cy="9" r="3" />
          <circle cx="10" cy="8" r="3.5" />
          <circle cx="8" cy="6" r="2.5" />
        </svg>
      );
    case 'isotopes':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#88aa44" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="2" />
          <ellipse cx="8" cy="8" rx="6" ry="2.5" />
          <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(60 8 8)" />
          <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(-60 8 8)" />
        </svg>
      );
    case 'water':
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
          stroke="#3b82f6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M8 3C8 3 4 8.5 4 11C4 13.2 5.8 14 8 14C10.2 14 12 13.2 12 11C12 8.5 8 3 8 3Z" />
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
