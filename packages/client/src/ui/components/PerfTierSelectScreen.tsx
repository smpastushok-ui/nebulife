import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/index.js';
import type { Language } from '@nebulife/core';
import type { PerfTierChoice } from '../../utils/device-tier.js';

// ---------------------------------------------------------------------------
// FirstRunSetupScreen — combined first-launch picker for language + graphics.
// Shown once before AuthScreen. Compact design that fits narrow phone cards
// (~320 px wide) without overflowing.
//
//   • Language row: horizontal pills [UK] [EN], current locale pre-selected.
//   • Graphics section: three compact cards (Simple / Standard / Full).
//   • Single Continue button persists both choices + reloads the page so
//     main.tsx re-runs with the new tier (the cache in device-tier.ts,
//     <html data-perf-tier>, and the global kill-switch CSS all depend on
//     the value being final at module load time).
//
// The file is named PerfTierSelectScreen because that's the primary thing
// the player is setting here — language is a nudge-in-case-we-guessed-wrong.
// ---------------------------------------------------------------------------

interface Props {
  onSubmit: (lang: Language, tier: PerfTierChoice) => void;
  initialLang: Language;
}

export function PerfTierSelectScreen({ onSubmit, initialLang }: Props) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Language>(initialLang);

  // "Standard" is always the pre-selected default — it's the safest
  // middle ground for any device. Auto-detection was dropped because
  // it was unreliable on midrange phones (V21e, etc.) and the "recommended"
  // badge confused players more than it helped. The player picks freely;
  // if the game runs rough on "Standard" they move to "Simple", and if
  // they have a flagship they pick "Full".
  const [tier, setTier] = useState<PerfTierChoice>('standard');

  // On mount, sync i18n.language with our pre-selected language so the
  // screen labels render in the matching language immediately (not in
  // whatever locale was auto-detected by the detector before this screen
  // appeared). Without this the EN pill is highlighted but the cards
  // still show Ukrainian because react-i18next was initialised earlier.
  useEffect(() => {
    if (i18n.language !== initialLang) {
      void i18n.changeLanguage(initialLang);
    }
  }, [initialLang]);

  const handleLangChange = (next: Language) => {
    setLang(next);
    // Live-switch the UI so the rest of the screen re-renders in the chosen
    // language. The final persistence happens in onSubmit.
    void i18n.changeLanguage(next);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* ── Language row (compact pills) ─────────────────────────── */}
        <div style={styles.langRow}>
          <LangPill
            label="Українська"
            code="UK"
            active={lang === 'uk'}
            onClick={() => handleLangChange('uk')}
          />
          <LangPill
            label="English"
            code="EN"
            active={lang === 'en'}
            onClick={() => handleLangChange('en')}
          />
        </div>

        {/* ── Graphics section ─────────────────────────────────────── */}
        <div style={styles.sectionTitle}>{t('perf.title')}</div>
        <div style={styles.subtitle}>{t('perf.subtitle')}</div>

        <div style={styles.tierList}>
          <TierCard
            selected={tier === 'simple'}
            title={t('perf.simple.title')}
            desc={t('perf.simple.desc')}
            onClick={() => setTier('simple')}
          />
          <TierCard
            selected={tier === 'standard'}
            title={t('perf.standard.title')}
            desc={t('perf.standard.desc')}
            onClick={() => setTier('standard')}
          />
          <TierCard
            selected={tier === 'full'}
            title={t('perf.full.title')}
            desc={t('perf.full.desc')}
            onClick={() => setTier('full')}
          />
        </div>

        <div style={styles.hint}>{t('perf.change_later_hint')}</div>

        {/* ── Continue ──────────────────────────────────────────── */}
        <button
          style={styles.continueBtn}
          onClick={() => onSubmit(lang, tier)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,170,68,0.35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,170,68,0.2)';
          }}
        >
          {t('common.proceed')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LangPill({
  label,
  code,
  active,
  onClick,
}: { label: string; code: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.langPill,
        background: active ? 'rgba(68,136,170,0.25)' : 'rgba(10,15,25,0.7)',
        borderColor: active ? '#4488aa' : '#334455',
        color: active ? '#ccddee' : '#8899aa',
      }}
    >
      <span style={styles.langCode}>{code}</span>
      <span style={styles.langName}>{label}</span>
    </button>
  );
}

function TierCard({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tierCard,
        background: selected ? 'rgba(68,136,170,0.18)' : 'rgba(10,15,25,0.7)',
        borderColor: selected ? '#4488aa' : '#334455',
      }}
    >
      <span style={styles.tierRadio}>{selected ? '●' : '○'}</span>
      <span style={styles.tierBody}>
        <span style={styles.tierTitle}>{title}</span>
        <span style={styles.tierDesc}>{desc}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles — tight enough to fit on a 320 px wide phone card
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2,5,16,0.98)',
    fontFamily: 'monospace',
    padding: 14,
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    padding: '24px 20px',
    background: 'rgba(10,15,25,0.96)',
    border: '1px solid #334455',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    boxSizing: 'border-box',
  },
  langRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  langPill: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  },
  langCode: {
    fontSize: 11,
    letterSpacing: '0.1em',
    fontWeight: 'bold',
  },
  langName: {
    fontSize: 10,
    opacity: 0.75,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#aabbcc',
    textAlign: 'center',
    letterSpacing: '0.18em',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#667788',
    textAlign: 'center',
    lineHeight: 1.5,
    marginTop: -8,
  },
  tierList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  tierCard: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: 4,
    fontFamily: 'monospace',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s',
    color: '#aabbcc',
    minHeight: 52,
    boxSizing: 'border-box',
  },
  tierRadio: {
    fontSize: 14,
    color: '#5599bb',
    lineHeight: 1.2,
    marginTop: 2,
    flexShrink: 0,
  },
  tierBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  tierTitle: {
    fontSize: 12,
    color: '#ccddee',
    letterSpacing: '0.08em',
  },
  tierDesc: {
    fontSize: 9.5,
    color: '#667788',
    lineHeight: 1.5,
  },
  hint: {
    fontSize: 9,
    color: '#445566',
    textAlign: 'center',
    lineHeight: 1.4,
    marginTop: 2,
  },
  continueBtn: {
    width: '100%',
    padding: '10px 20px',
    background: 'rgba(34,170,68,0.2)',
    border: '1px solid #44ff88',
    borderRadius: 3,
    color: '#44ff88',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
    letterSpacing: '0.15em',
    minHeight: 42,
    transition: 'background 0.15s',
    marginTop: 4,
  },
};
