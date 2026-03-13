import React from 'react';
import type { BreadcrumbItem } from './types.js';
import { sectionLeft, breadcrumbButton, breadcrumbActive, breadcrumbSeparator } from './styles.js';

interface BreadcrumbNavProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (targetScene: string) => void;
}

// Compact breadcrumbs: show max 3 items, collapse middle with dots
export function BreadcrumbNav({ breadcrumbs, onNavigate }: BreadcrumbNavProps) {
  // If more than 3, show first + ... + last two
  let displayed = breadcrumbs;
  let collapsed = false;
  if (breadcrumbs.length > 3) {
    displayed = [breadcrumbs[0], ...breadcrumbs.slice(-2)];
    collapsed = true;
  }

  return (
    <div style={sectionLeft}>
      {displayed.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          {i > 0 && (
            <span style={breadcrumbSeparator}>
              {collapsed && i === 1 ? '\u2026' : '\u203A'}
            </span>
          )}
          {crumb.isActive ? (
            <span
              style={{
                ...breadcrumbActive,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                animation: `cmdbar-slide-in 0.3s ease-out`,
                animationDelay: `${i * 0.06}s`,
                animationFillMode: 'both',
              }}
            >
              {crumb.icon}
              {crumb.label}
            </span>
          ) : (
            <button
              style={{
                ...breadcrumbButton,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                animation: `cmdbar-slide-in 0.3s ease-out`,
                animationDelay: `${i * 0.06}s`,
                animationFillMode: 'both',
              }}
              onClick={() => onNavigate(crumb.scene)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#8899aa';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#556677';
              }}
            >
              {crumb.icon}
              {crumb.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
