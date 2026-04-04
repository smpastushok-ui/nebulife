import React from 'react';
import { useTranslation } from 'react-i18next';

interface PlaceholderTabProps {
  label: string;
}

export function PlaceholderTab({ label }: PlaceholderTabProps) {
  const { t } = useTranslation();
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
      [ {label} ] — {t('common.coming_soon')}
    </div>
  );
}
