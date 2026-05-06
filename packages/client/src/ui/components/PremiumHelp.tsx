import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PREMIUM_HELP_CONTENT, type PremiumHelpId, type PremiumHelpPreview } from '../premium-help-content.js';

interface PremiumHelpButtonProps {
  helpId: PremiumHelpId;
  align?: 'inline' | 'corner';
  label?: string;
}

const modalBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 30000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'rgba(0,0,0,0.66)',
  pointerEvents: 'auto',
};

const modalCard: React.CSSProperties = {
  width: 'min(420px, 94vw)',
  maxHeight: '86vh',
  overflow: 'auto',
  background: 'rgba(8,12,22,0.98)',
  border: '1px solid rgba(123,184,255,0.44)',
  borderRadius: 6,
  boxShadow: '0 18px 54px rgba(0,0,0,0.72), inset 0 0 38px rgba(68,136,170,0.12)',
  color: '#aabbcc',
  fontFamily: 'monospace',
};

const helpButtonBase: React.CSSProperties = {
  width: 24,
  height: 24,
  minWidth: 24,
  minHeight: 24,
  borderRadius: '50%',
  background: 'rgba(5,10,20,0.82)',
  border: '1px solid rgba(123,184,255,0.55)',
  color: '#9fd0ff',
  fontFamily: 'monospace',
  fontSize: 12,
  cursor: 'help',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  boxShadow: '0 0 12px rgba(68,136,170,0.18)',
};

const previewStyles: Record<PremiumHelpPreview, { before: React.CSSProperties; after: React.CSSProperties }> = {
  photo: {
    before: {
      background: 'radial-gradient(circle at 50% 45%, #334455 0 10%, transparent 11%), radial-gradient(circle at 35% 60%, #667788 0 3%, transparent 4%), #050a14',
    },
    after: {
      background: 'linear-gradient(135deg, rgba(123,184,255,0.18), rgba(221,170,68,0.16)), radial-gradient(circle at 35% 45%, #ffcc88 0 8%, transparent 18%), radial-gradient(circle at 66% 55%, #7bb8ff 0 5%, transparent 16%), #08101c',
    },
  },
  planet: {
    before: {
      background: 'radial-gradient(circle at 42% 38%, #778899 0 22%, #334455 48%, #101820 68%, transparent 69%)',
    },
    after: {
      background: 'radial-gradient(circle at 38% 34%, #e0b46a 0 12%, #4488aa 28%, #172438 53%, #050812 69%, transparent 70%)',
    },
  },
  ship: {
    before: {
      background: 'linear-gradient(90deg, transparent 40%, #667788 41% 58%, transparent 59%), linear-gradient(135deg, transparent 30%, #445566 31% 46%, transparent 47%), #050a14',
    },
    after: {
      background: 'linear-gradient(90deg, transparent 34%, #b8d8ff 35% 60%, transparent 61%), linear-gradient(135deg, transparent 22%, #ddaa44 23% 42%, transparent 43%), radial-gradient(circle at 62% 44%, #7bb8ff 0 6%, transparent 7%), #07101c',
    },
  },
  boost: {
    before: {
      background: 'linear-gradient(90deg, #334455 0 42%, rgba(51,68,85,0.22) 43% 100%), #050a14',
    },
    after: {
      background: 'linear-gradient(90deg, #44ff88 0 72%, rgba(68,255,136,0.16) 73% 100%), radial-gradient(circle at 80% 45%, rgba(221,170,68,0.75), transparent 20%), #06110d',
    },
  },
  ads: {
    before: {
      background: 'repeating-linear-gradient(90deg, #223344 0 8px, #0a1018 9px 17px)',
    },
    after: {
      background: 'linear-gradient(135deg, rgba(68,136,170,0.35), rgba(68,255,136,0.12)), radial-gradient(circle at 70% 45%, #7bb8ff 0 7%, transparent 8%), #06101a',
    },
  },
  astra: {
    before: {
      background: 'radial-gradient(circle at 50% 50%, #334455 0 18%, transparent 19%), #050a14',
    },
    after: {
      background: 'radial-gradient(circle at 50% 50%, #44ff88 0 10%, #4488aa 22%, transparent 35%), conic-gradient(from 90deg, transparent, rgba(123,184,255,0.35), transparent)',
    },
  },
  quarks: {
    before: {
      background: 'radial-gradient(circle at 50% 50%, #334455 0 18%, transparent 19%), #050a14',
    },
    after: {
      background: 'radial-gradient(circle at 50% 50%, #7bb8ff 0 11%, transparent 12%), radial-gradient(circle at 35% 38%, #ddaa44 0 8%, transparent 9%), radial-gradient(circle at 64% 61%, #44ff88 0 7%, transparent 8%), #07101c',
    },
  },
};

function MiniPreview({ type }: { type: PremiumHelpPreview }) {
  const { t } = useTranslation();
  const pair = previewStyles[type];
  const tile = (label: string, style: React.CSSProperties) => (
    <div style={{ flex: 1 }}>
      <div style={{
        height: 58,
        borderRadius: 4,
        border: '1px solid rgba(68,85,102,0.55)',
        boxShadow: 'inset 0 0 22px rgba(0,0,0,0.55)',
        ...style,
      }} />
      <div style={{ marginTop: 5, color: '#667788', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 8, margin: '12px 0 2px' }}>
      {tile(t('premium_help.common.before'), pair.before)}
      {tile(t('premium_help.common.after'), pair.after)}
    </div>
  );
}

export function PremiumExplainerModal({ helpId, onClose }: { helpId: PremiumHelpId; onClose: () => void }) {
  const { t } = useTranslation();
  const content = PREMIUM_HELP_CONTENT[helpId];

  return (
    <div style={modalBackdrop} onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
      <div
        style={modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`premium-help-${helpId}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '15px 16px 12px', borderBottom: '1px solid rgba(68,102,136,0.28)' }}>
          <div style={{ color: '#ddaa44', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            {t('premium_help.common.kicker')}
          </div>
          <div id={`premium-help-${helpId}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, color: '#ddeeff', fontSize: 15, letterSpacing: 0.8 }}>{t(content.titleKey)}</div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #334455',
                borderRadius: 3,
                color: '#667788',
                fontFamily: 'monospace',
                cursor: 'pointer',
                minWidth: 28,
                minHeight: 28,
              }}
            >
              x
            </button>
          </div>
          <div style={{ marginTop: 8, color: '#99aabb', fontSize: 11, lineHeight: 1.55 }}>{t(content.shortKey)}</div>
        </div>

        <div style={{ padding: 16, display: 'grid', gap: 11, fontSize: 11, lineHeight: 1.55 }}>
          {content.preview && <MiniPreview type={content.preview} />}
          <InfoBlock label={t('premium_help.common.gets')} text={t(content.benefitsKey)} />
          <InfoBlock label={t('premium_help.common.why_paid')} text={t(content.whyPaidKey)} />
          <InfoBlock label={t('premium_help.common.result')} text={t(content.resultKey)} highlight />
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, text, highlight }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: '9px 10px',
      borderRadius: 4,
      background: highlight ? 'rgba(68,136,170,0.12)' : 'rgba(10,18,28,0.64)',
      border: highlight ? '1px solid rgba(123,184,255,0.28)' : '1px solid rgba(51,68,85,0.36)',
    }}>
      <div style={{ color: highlight ? '#7bb8ff' : '#667788', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: highlight ? '#aaccdd' : '#8899aa' }}>{text}</div>
    </div>
  );
}

export function PremiumHelpButton({ helpId, align = 'inline', label }: PremiumHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const button = (
    <button
      type="button"
      aria-label={label ?? 'Premium help'}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        ...helpButtonBase,
        ...(align === 'corner' ? { position: 'absolute', top: 8, right: 8 } : {}),
      }}
    >
      ?
    </button>
  );

  return (
    <>
      {button}
      {open && <PremiumExplainerModal helpId={helpId} onClose={() => setOpen(false)} />}
    </>
  );
}
