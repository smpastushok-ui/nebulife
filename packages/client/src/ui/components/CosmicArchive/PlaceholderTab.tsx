import React from 'react';

interface PlaceholderTabProps {
  label: string;
}

export function PlaceholderTab({ label }: PlaceholderTabProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 300,
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#445566',
        letterSpacing: 1,
      }}
    >
      [ {label} ] — в розробці
    </div>
  );
}
