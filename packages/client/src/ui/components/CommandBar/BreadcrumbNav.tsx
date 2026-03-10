import React from 'react';
import type { BreadcrumbItem } from './types.js';
import { sectionLeft, breadcrumbButton, breadcrumbActive, breadcrumbSeparator } from './styles.js';

interface BreadcrumbNavProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (targetScene: string) => void;
}

export function BreadcrumbNav({ breadcrumbs, onNavigate }: BreadcrumbNavProps) {
  return (
    <div style={sectionLeft}>
      {breadcrumbs.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          {i > 0 && <span style={breadcrumbSeparator}>&rsaquo;</span>}
          {crumb.isActive ? (
            <span
              style={{
                ...breadcrumbActive,
                animation: `cmdbar-slide-in 0.3s ease-out`,
                animationDelay: `${i * 0.06}s`,
                animationFillMode: 'both',
              }}
            >
              {crumb.label}
            </span>
          ) : (
            <button
              style={{
                ...breadcrumbButton,
                animation: `cmdbar-slide-in 0.3s ease-out`,
                animationDelay: `${i * 0.06}s`,
                animationFillMode: 'both',
              }}
              onClick={() => onNavigate(crumb.scene)}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#8899aa'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#556677'; }}
            >
              {crumb.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
