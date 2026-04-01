import React from 'react';
import { useT } from '../../../i18n';

interface PlaceholderTabProps {
  label: string;
}

export function PlaceholderTab({ label }: PlaceholderTabProps) {
  const { t } = useT();
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
      [ {label} ] — {t('archive.in_development')}
    </div>
  );
}
