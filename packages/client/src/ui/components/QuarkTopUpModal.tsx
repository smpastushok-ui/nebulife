import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { startTopUpFlow } from '../../api/payment-api.js';
import {
  isNativeIAP,
  fetchIAPPackages,
  purchaseQuarkPack,
  type IAPPackage,
} from '../../api/iap-service.js';

const PRESETS = [50, 100, 200, 500];

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
          {t('topup.current_balance')}: <span style={styles.balanceValue}>{currentBalance} <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 1 }}><circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" /><text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text></svg></span>
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
              {preset} <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 1 }}><circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" /><text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text></svg>
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

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>{t('topup.iap_title')}</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>
        <div style={styles.balance}>
          {t('topup.current_balance')}: <span style={styles.balanceValue}>{currentBalance} <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 1 }}><circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" /><text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text></svg></span>
        </div>

        {loadingPkgs ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
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
                    borderRadius: 12,
                    border: '1px solid rgba(120,160,255,0.2)',
                    background: isBuying
                      ? 'rgba(68,136,255,0.2)'
                      : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    cursor: purchasing ? 'default' : 'pointer',
                    opacity: purchasing && !isBuying ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                  onClick={() => handleBuy(pkg)}
                  disabled={!!purchasing}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2 }}>
                      {pkg.title}{' '}
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" />
                        <text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text>
                      </svg>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                      {pkg.description}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#7bb8ff', fontFamily: 'monospace' }}>
                    {isBuying ? t('topup.iap_buying') : pkg.priceString}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: message.ok ? 'rgba(68,255,136,0.08)' : 'rgba(255,80,80,0.08)',
            border: `1px solid ${message.ok ? 'rgba(68,255,136,0.3)' : 'rgba(255,80,80,0.3)'}`,
            color: message.ok ? '#44ff88' : '#ff6b6b',
            fontSize: 13,
            textAlign: 'center',
            marginBottom: 12,
            fontFamily: 'monospace',
          }}>
            {message.text}{message.ok && (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
                <circle cx="8" cy="8" r="7" stroke="#7bb8ff" strokeWidth="1.5" fill="rgba(68,136,170,0.15)" />
                <text x="8" y="11.5" textAnchor="middle" fill="#7bb8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q</text>
              </svg>
            )}
          </div>
        )}

        <div style={styles.note}>{t('topup.iap_note')}</div>
      </div>
    </>
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
    background: 'linear-gradient(180deg, #0d1b2a 0%, #1a2a3a 100%)',
    border: '1px solid rgba(120,160,255,0.2)',
    borderRadius: 16,
    padding: 24,
    zIndex: 11001,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: 700, letterSpacing: '0.3px', fontFamily: 'monospace' },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff', fontSize: 14, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  balance: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)',
    marginBottom: 16, fontFamily: 'monospace',
  },
  balanceValue: { color: '#7bb8ff', fontWeight: 600 },
  presets: {
    display: 'flex', flexWrap: 'wrap' as const, gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: '1 1 auto', minWidth: 60,
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#aabbcc', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'center' as const,
    fontFamily: 'monospace',
  },
  presetBtnActive: {
    border: '1px solid rgba(120,180,255,0.5)',
    background: 'rgba(68,136,255,0.15)',
    color: '#7bb8ff',
  },
  customInput: {
    width: '100%', padding: '10px 14px',
    borderRadius: 10, border: '1px solid rgba(120,180,255,0.3)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff', fontSize: 15, fontFamily: 'monospace',
    marginBottom: 16, outline: 'none',
    boxSizing: 'border-box' as const,
  },
  summary: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)',
    fontSize: 14, color: 'rgba(255,255,255,0.7)',
    marginBottom: 12, fontFamily: 'monospace',
  },
  summaryPrice: { fontSize: 18, fontWeight: 700, color: '#fff' },
  error: {
    color: '#ff6b6b', fontSize: 13, marginBottom: 8, textAlign: 'center' as const,
    fontFamily: 'monospace',
  },
  payBtn: {
    width: '100%', padding: '14px 24px',
    borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #4488ff, #7bb8ff)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.3px',
    boxShadow: '0 4px 16px rgba(68,136,255,0.3)',
    transition: 'all 0.2s', fontFamily: 'monospace',
  },
  payBtnDisabled: {
    opacity: 0.5, cursor: 'default',
  },
  note: {
    textAlign: 'center' as const, fontSize: 11,
    color: 'rgba(255,255,255,0.35)', marginTop: 12,
    fontFamily: 'monospace',
  },
};
