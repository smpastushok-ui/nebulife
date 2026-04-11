import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { startTopUpFlow } from '../../api/payment-api.js';
import {
  isNativeIAP,
  fetchIAPPackages,
  purchaseQuarkPack,
  type IAPPackage,
} from '../../api/iap-service.js';
import { watchAdsWithProgress, canShowAd } from '../../services/ads-service.js';

const PRESETS = [50, 100, 200, 500];

// Number of ads required to earn quarks via ad reward
const ADS_FOR_QUARKS = 3;

interface QuarkTopUpModalProps {
  playerId: string;
  currentBalance: number;
  onClose: () => void;
  /** Called after successful IAP with the number of quarks granted */
  onQuarksGranted?: (quarks: number) => void;
}

// ---------------------------------------------------------------------------
// Web/MonoPay variant
// ---------------------------------------------------------------------------
function WebTopUpModal({ playerId, currentBalance, onClose }: QuarkTopUpModalProps) {
  const { t } = useTranslation();
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = isCustom ? Math.floor(Number(customAmount) || 0) : selectedAmount;

  const handleTopUp = async () => {
    if (amount < 1) return;
    try {
      setLoading(true);
      setError(null);
      await startTopUpFlow({ playerId, amount });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setLoading(false);
    }
  };

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>{t('topup.title')}</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>
        <div style={styles.balance}>
          {t('topup.current_balance')}: <span style={styles.balanceValue}>{currentBalance} <QuarkIcon /></span>
        </div>
        <div style={styles.presets}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              style={{
                ...styles.presetBtn,
                ...(selectedAmount === preset && !isCustom ? styles.presetBtnActive : {}),
              }}
              onClick={() => { setSelectedAmount(preset); setIsCustom(false); }}
            >
              {preset} <QuarkIcon />
            </button>
          ))}
          <button
            style={{ ...styles.presetBtn, ...(isCustom ? styles.presetBtnActive : {}) }}
            onClick={() => setIsCustom(true)}
          >
            {t('topup.other_amount')}
          </button>
        </div>
        {isCustom && (
          <input
            style={styles.customInput}
            type="number"
            min="1"
            max="10000"
            placeholder={t('topup.quark_amount_placeholder')}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            autoFocus
          />
        )}
        <div style={styles.summary}>
          <span>{t('topup.to_pay')}:</span>
          <span style={styles.summaryPrice}>{amount} {t('topup.currency')}</span>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <button
          style={{ ...styles.payBtn, ...(amount < 1 || loading ? styles.payBtnDisabled : {}) }}
          onClick={handleTopUp}
          disabled={amount < 1 || loading}
        >
          {loading ? t('topup.creating_payment') : t('topup.pay_btn', { amount })}
        </button>
        <div style={styles.note}>{t('topup.note')}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Native IAP variant (iOS / Android via RevenueCat)
// ---------------------------------------------------------------------------
function NativeTopUpModal({ playerId, currentBalance, onClose, onQuarksGranted }: QuarkTopUpModalProps) {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<IAPPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null); // identifier of package being purchased
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Ads reward state
  const [adsProgress, setAdsProgress] = useState(0); // 0-3
  const [adsRunning, setAdsRunning] = useState(false);

  useEffect(() => {
    fetchIAPPackages()
      .then(pkgs => setPackages(pkgs))
      .finally(() => setLoadingPkgs(false));
  }, []);

  const handleBuy = async (pkg: IAPPackage) => {
    if (purchasing) return;
    setMessage(null);
    setPurchasing(pkg.identifier);
    try {
      const result = await purchaseQuarkPack(pkg.identifier, playerId);
      if (result.success) {
        setMessage({ text: t('topup.iap_success', { quarks: result.quarksGranted }), ok: true });
        onQuarksGranted?.(result.quarksGranted);
        setTimeout(onClose, 1800);
      } else if (result.error === 'cancelled') {
        setMessage({ text: t('topup.iap_cancelled'), ok: false });
      } else {
        setMessage({ text: t('topup.iap_error'), ok: false });
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleWatchAds = async () => {
    if (adsRunning || purchasing) return;
    setAdsRunning(true);
    setMessage(null);
    setAdsProgress(0);

    const result = await watchAdsWithProgress('quarks', ADS_FOR_QUARKS, (completed, _total) => {
      setAdsProgress(completed);
    });

    setAdsRunning(false);

    if (result.rewarded) {
      setMessage({ text: t('topup.ads_success'), ok: true });
      onQuarksGranted?.(5);
      setAdsProgress(0);
      setTimeout(onClose, 1800);
    } else {
      setMessage({ text: t('topup.ads_failed'), ok: false });
    }
  };

  const adsAvailable = canShowAd();

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>{t('topup.iap_title')}</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>
        <div style={styles.balance}>
          {t('topup.current_balance')}: <span style={styles.balanceValue}>{currentBalance} <QuarkIcon /></span>
        </div>

        {loadingPkgs ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'monospace' }}>
            {t('topup.iap_loading')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {packages.map(pkg => {
              const isBuying = purchasing === pkg.identifier;
              return (
                <button
                  key={pkg.identifier}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 4,
                    border: '1px solid #334455',
                    background: isBuying ? 'rgba(68,136,170,0.2)' : 'rgba(10,15,25,0.6)',
                    color: '#aabbcc',
                    cursor: purchasing ? 'default' : 'pointer',
                    opacity: purchasing && !isBuying ? 0.5 : 1,
                    fontFamily: 'monospace',
                  }}
                  onClick={() => handleBuy(pkg)}
                  disabled={!!purchasing}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2, color: '#aabbcc' }}>
                      {pkg.title}{' '}
                      <QuarkIcon />
                    </div>
                    <div style={{ fontSize: 11, color: '#667788', fontFamily: 'monospace' }}>
                      {pkg.description}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#7bb8ff', fontFamily: 'monospace' }}>
                    {isBuying ? t('topup.iap_buying') : pkg.priceString}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Ads reward button */}
        {adsAvailable && (
          <button
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 3,
              border: '1px solid #446688',
              background: adsRunning ? 'rgba(68,102,136,0.25)' : 'rgba(68,102,136,0.12)',
              color: '#7bb8ff',
              fontFamily: 'monospace',
              fontSize: 13,
              cursor: adsRunning || !!purchasing ? 'default' : 'pointer',
              opacity: !!purchasing ? 0.4 : 1,
              marginBottom: 12,
              textAlign: 'center' as const,
            }}
            onClick={handleWatchAds}
            disabled={adsRunning || !!purchasing}
          >
            {adsRunning
              ? t('topup.ads_btn_progress', { completed: adsProgress, total: ADS_FOR_QUARKS })
              : adsProgress > 0
                ? t('topup.ads_btn_progress', { completed: adsProgress, total: ADS_FOR_QUARKS })
                : t('topup.ads_btn')}
          </button>
        )}

        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 4,
            background: message.ok ? 'rgba(68,255,136,0.08)' : 'rgba(204,68,68,0.08)',
            border: `1px solid ${message.ok ? 'rgba(68,255,136,0.3)' : 'rgba(204,68,68,0.3)'}`,
            color: message.ok ? '#44ff88' : '#cc4444',
            fontSize: 13,
            textAlign: 'center' as const,
            marginBottom: 12,
            fontFamily: 'monospace',
          }}>
            {message.text}{message.ok && (
              <> <QuarkIcon /></>
            )}
          </div>
        )}

        <div style={styles.note}>{t('topup.iap_note')}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Quark icon inline SVG (no textures)
// ---------------------------------------------------------------------------
function QuarkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 1 }}>
      <circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" />
      <text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Unified export — branches based on platform
// ---------------------------------------------------------------------------
export function QuarkTopUpModal(props: QuarkTopUpModalProps) {
  return isNativeIAP() ? <NativeTopUpModal {...props} /> : <WebTopUpModal {...props} />;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 11000,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 360, maxWidth: 'calc(100vw - 32px)',
    background: 'rgba(10,15,25,0.97)',
    border: '1px solid #334455',
    borderRadius: 6,
    padding: 24,
    zIndex: 11001,
    fontFamily: 'monospace',
    color: '#aabbcc',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: 700, letterSpacing: '0.3px', fontFamily: 'monospace', color: '#aabbcc' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 3,
    border: '1px solid #334455',
    background: 'rgba(10,15,25,0.6)',
    color: '#8899aa', fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'monospace',
  },
  balance: {
    fontSize: 12, color: '#8899aa',
    marginBottom: 16, fontFamily: 'monospace',
  },
  balanceValue: { color: '#7bb8ff', fontWeight: 600 },
  presets: {
    display: 'flex', flexWrap: 'wrap' as const, gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: '1 1 auto', minWidth: 60,
    padding: '10px 14px', borderRadius: 3,
    border: '1px solid #334455',
    background: 'rgba(10,15,25,0.6)',
    color: '#8899aa', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'center' as const,
    fontFamily: 'monospace',
  },
  presetBtnActive: {
    border: '1px solid #446688',
    background: 'rgba(68,102,136,0.2)',
    color: '#7bb8ff',
  },
  customInput: {
    width: '100%', padding: '10px 14px',
    borderRadius: 3, border: '1px solid #446688',
    background: 'rgba(0,0,0,0.3)',
    color: '#aabbcc', fontSize: 14, fontFamily: 'monospace',
    marginBottom: 16, outline: 'none',
    boxSizing: 'border-box' as const,
  },
  summary: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderTop: '1px solid #223344',
    fontSize: 13, color: '#8899aa',
    marginBottom: 12, fontFamily: 'monospace',
  },
  summaryPrice: { fontSize: 16, fontWeight: 700, color: '#aabbcc' },
  error: {
    color: '#cc4444', fontSize: 12, marginBottom: 8, textAlign: 'center' as const,
    fontFamily: 'monospace',
  },
  payBtn: {
    width: '100%', padding: '12px 24px',
    borderRadius: 3, border: '1px solid #446688',
    background: 'rgba(68,102,136,0.3)',
    color: '#7bb8ff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.3px',
    transition: 'all 0.2s', fontFamily: 'monospace',
  },
  payBtnDisabled: {
    opacity: 0.5, cursor: 'default',
  },
  note: {
    textAlign: 'center' as const, fontSize: 11,
    color: '#667788', marginTop: 12,
    fontFamily: 'monospace',
  },
};
