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
          <path d="M4 12 Q2 8 4 5 Q6 3 8 2 Q10 3 12 5 Q14 8 12 12" />
          <line x1="8" y1="14" x2="8" y2="12" />
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
          <path d="M8 2C8 2 3 8 3 11C3 13.8 5.2 15 8 15C10.8 15 13 13.8 13 11C13 8 8 2 8 2Z" />
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
