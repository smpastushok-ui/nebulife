import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { startTopUpFlow } from '../../api/payment-api.js';
import {
  isNativeIAP,
  fetchIAPPackagesWithStatus,
  fetchPremiumPackagesWithStatus,
  purchaseQuarkPack,
  purchasePremium,
  checkPremiumStatus,
  restoreIAPPurchases,
  type IAPPackage,
  type PremiumPackage,
  type PremiumStatus,
} from '../../api/iap-service.js';
import { watchAdsWithProgress, canShowAd } from '../../services/ads-service.js';
import { interstitialManager } from '../../services/interstitial-manager.js';
import { PremiumHelpButton } from './PremiumHelp.js';

const PRESETS = [50, 100, 200, 500];

// Number of ads required to earn quarks via ad reward (1 quark per 1 ad)
const ADS_FOR_QUARKS = 1;
const PREMIUM_LIFETIME_PRODUCT_ID = 'nebulife_pro_lifetime';

function formatPremiumExpiresAt(expiresAt: string | null | undefined, productId: string | null | undefined, locale: string): string | null {
  if (productId === PREMIUM_LIFETIME_PRODUCT_ID) return '4ever';
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

interface QuarkTopUpModalProps {
  playerId: string;
  currentBalance: number;
  context?: 'alpha_promo' | null;
  onClose: () => void;
  /** Called after successful IAP with the number of quarks granted */
  onQuarksGranted?: (quarks: number) => void;
  /** Called after Premium status changes through purchase or restore */
  onPremiumChanged?: (status: PremiumStatus) => void;
}

// ---------------------------------------------------------------------------
// Web/MonoPay variant
// ---------------------------------------------------------------------------
function WebTopUpModal({ playerId, currentBalance, context, onClose }: QuarkTopUpModalProps) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PremiumHelpButton helpId="quarks" />
            <button style={styles.closeBtn} onClick={onClose}>x</button>
          </div>
        </div>
        <div style={styles.balance}>
          {t('topup.current_balance')}: <span style={styles.balanceValue}>{currentBalance} <QuarkIcon /></span>
        </div>
        {context === 'alpha_promo' && <AlphaPromoTopUpBanner />}
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
function NativeTopUpModal({ playerId, currentBalance, context, onClose, onQuarksGranted, onPremiumChanged }: QuarkTopUpModalProps) {
  const { t, i18n } = useTranslation();
  const [packages, setPackages] = useState<IAPPackage[]>([]);
  const [premiumPackages, setPremiumPackages] = useState<PremiumPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [loadingPremiumPkgs, setLoadingPremiumPkgs] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null); // identifier of package being purchased
  const [message, setMessage] = useState<{ text: string; ok: boolean; showQuarkIcon?: boolean } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [isPremiumActive, setIsPremiumActive] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [premiumProductId, setPremiumProductId] = useState<string | null>(null);
  const [storeConfigured, setStoreConfigured] = useState(true);
  const [premiumStoreConfigured, setPremiumStoreConfigured] = useState(true);

  // Ads reward state
  const [adsProgress, setAdsProgress] = useState(0); // 0-1
  const [adsRunning, setAdsRunning] = useState(false);

  useEffect(() => {
    fetchIAPPackagesWithStatus(playerId)
      .then((result) => {
        setPackages(result.packages);
        setStoreConfigured(result.configured);
      })
      .finally(() => setLoadingPkgs(false));
    fetchPremiumPackagesWithStatus(playerId)
      .then((result) => {
        setPremiumPackages(result.packages);
        setPremiumStoreConfigured(result.configured);
      })
      .finally(() => setLoadingPremiumPkgs(false));
    // Check premium status when modal opens
    checkPremiumStatus(playerId).then(status => {
      setIsPremiumActive(status.active);
      setPremiumExpiresAt(status.expiresAt ?? null);
      setPremiumProductId(status.productId ?? null);
      interstitialManager.setPremium(status.active);
      onPremiumChanged?.(status);
    });
  }, [onPremiumChanged, playerId]);

  const handleBuy = async (pkg: IAPPackage) => {
    if (purchasing) return;
    setMessage(null);
    setPurchasing(pkg.identifier);
    try {
      const result = await purchaseQuarkPack(pkg.identifier, playerId);
      if (result.success) {
        setMessage({ text: t('topup.iap_success', { quarks: result.quarksGranted }), ok: true, showQuarkIcon: true });
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

  const handleBuyPremium = async (pkg: PremiumPackage) => {
    if (purchasing || adsRunning) return;
    setMessage(null);
    setPurchasing(pkg.identifier);
    try {
      const result = await purchasePremium(pkg.identifier, playerId);
      if (result.success) {
        setIsPremiumActive(true);
        setPremiumExpiresAt(result.status?.expiresAt ?? null);
        setPremiumProductId(result.status?.productId ?? null);
        interstitialManager.setPremium(true);
        onPremiumChanged?.(result.status ?? { active: true });
        setMessage({ text: t('premium.purchase_success'), ok: true });
      } else if (result.error === 'cancelled') {
        setMessage({ text: t('topup.iap_cancelled'), ok: false });
      } else if (result.error === 'already-purchased') {
        const status = await checkPremiumStatus(playerId).catch(() => ({ active: false }) as PremiumStatus);
        if (status.active) {
          setIsPremiumActive(true);
          setPremiumExpiresAt(status.expiresAt ?? null);
          setPremiumProductId(status.productId ?? null);
          interstitialManager.setPremium(true);
          onPremiumChanged?.(status);
          setMessage({ text: t('premium.purchase_success'), ok: true });
        } else {
          setMessage({ text: t('topup.restore_purchases'), ok: false });
        }
      } else {
        setMessage({ text: t('premium.purchase_error'), ok: false });
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
      onQuarksGranted?.(1);
      setAdsProgress(0);
      setTimeout(onClose, 1800);
    } else {
      console.warn('[topup] quark ad reward failed:', result.reason);
      setMessage({
        text: result.reason === 'daily_limit' ? t('ads.daily_limit') : t('topup.ads_failed'),
        ok: false,
      });
    }
  };

  const handleRestorePurchases = async () => {
    if (restoring || purchasing || adsRunning) return;
    setRestoring(true);
    setMessage(null);
    try {
      const result = await restoreIAPPurchases(playerId);
      if (result.restored) {
        const status = await checkPremiumStatus(playerId).catch(() => ({ active: true }) as PremiumStatus);
        setIsPremiumActive(status.active);
        setPremiumExpiresAt(status.expiresAt ?? null);
        setPremiumProductId(status.productId ?? null);
        interstitialManager.setPremium(status.active);
        onPremiumChanged?.(status);
        setMessage({ text: t('topup.restore_success'), ok: true });
        onQuarksGranted?.(0);
      } else {
        setMessage({ text: t('topup.restore_none'), ok: false });
      }
    } catch {
      setMessage({ text: t('topup.restore_error'), ok: false });
    } finally {
      setRestoring(false);
    }
  };

  const adsAvailable = canShowAd();

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={{ ...styles.modal, ...styles.nativeModal }}>
        <div style={{ ...styles.header, ...styles.nativeHeader }}>
          <span style={styles.title}>{t('topup.iap_title')}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PremiumHelpButton helpId="quarks" />
            <button style={styles.closeBtn} onClick={onClose}>x</button>
          </div>
        </div>
        <div style={styles.modalBody}>
        <div style={styles.balance}>
          {t('topup.current_balance')}: <span style={styles.balanceValue}>{currentBalance} <QuarkIcon /></span>
        </div>
        {context === 'alpha_promo' && <AlphaPromoTopUpBanner />}

        {isPremiumActive && (
          <div style={styles.premiumActiveNotice}>
            <div>{t('premium.active')}</div>
            {formatPremiumExpiresAt(premiumExpiresAt, premiumProductId, i18n.language) && (
              <div style={styles.premiumActiveUntil}>
                {t('premium.active_until', { date: formatPremiumExpiresAt(premiumExpiresAt, premiumProductId, i18n.language) })}
              </div>
            )}
          </div>
        )}

        <div style={styles.premiumSection}>
          <div style={styles.premiumHeader}>
            <div>
              <div style={styles.premiumTitle}>{t('premium.title')}</div>
              <div style={styles.premiumBenefits}>{t('premium.no_ads')}</div>
            </div>
            <PremiumHelpButton helpId="premium-subscription" />
          </div>

          {loadingPremiumPkgs ? (
            <div style={styles.inlineLoading}>{t('topup.iap_loading')}</div>
          ) : premiumPackages.length === 0 ? (
            <div style={styles.storeUnavailable}>
              {premiumStoreConfigured ? t('premium.no_products') : t('premium.unavailable')}
            </div>
          ) : (
            <div style={styles.premiumPlans}>
              {premiumPackages.map(pkg => {
                const isBuying = purchasing === pkg.identifier;
                return (
                  <button
                    key={pkg.identifier}
                    style={{
                      ...styles.premiumPlanBtn,
                      ...(isBuying ? styles.premiumPlanBtnActive : {}),
                    }}
                    onClick={() => handleBuyPremium(pkg)}
                    disabled={!!purchasing || adsRunning}
                  >
                    <div style={styles.premiumPlanText}>
                      <div style={styles.premiumPlanName}>
                        {t(pkg.titleKey)}
                        {pkg.badgeKey && <span style={styles.premiumBadge}>{t(pkg.badgeKey)}</span>}
                      </div>
                      <div style={styles.premiumPlanDesc}>{t(pkg.descriptionKey)}</div>
                    </div>
                    <div style={styles.premiumPlanPrice}>
                      {isBuying ? t('topup.iap_buying') : pkg.priceString}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loadingPkgs ? (
          <div style={styles.inlineLoading}>
            {t('topup.iap_loading')}
          </div>
        ) : packages.length === 0 ? (
          <div style={styles.storeUnavailable}>
            {storeConfigured ? t('topup.iap_no_products') : t('topup.iap_unavailable')}
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
                      {pkg.description.startsWith('topup.') ? t(pkg.description) : pkg.description}
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
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <button
              style={{
                width: '100%',
                padding: '11px 46px 11px 14px',
                borderRadius: 3,
                border: '1px solid #446688',
                background: adsRunning ? 'rgba(68,102,136,0.25)' : 'rgba(68,102,136,0.12)',
                color: '#7bb8ff',
                fontFamily: 'monospace',
                fontSize: 13,
                cursor: adsRunning || !!purchasing ? 'default' : 'pointer',
                opacity: !!purchasing ? 0.4 : 1,
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
            <div style={{ position: 'absolute', top: 6, right: 8 }}>
              <PremiumHelpButton helpId="rewarded-ads" />
            </div>
          </div>
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
            {message.text}{message.showQuarkIcon && (
              <> <QuarkIcon /></>
            )}
          </div>
        )}

        <div style={styles.note}>{t('topup.iap_note')}</div>

        {/* Restore Purchases — required by Apple for apps with IAP */}
        <button
          style={{
            width: '100%',
            marginTop: 10,
            padding: '8px 14px',
            borderRadius: 3,
            border: '1px solid #334455',
            background: 'transparent',
            color: '#667788',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: restoring || !!purchasing || adsRunning ? 'default' : 'pointer',
            opacity: restoring || !!purchasing || adsRunning ? 0.5 : 1,
            textAlign: 'center' as const,
          }}
          onClick={handleRestorePurchases}
          disabled={restoring || !!purchasing || adsRunning}
        >
          {restoring ? '...' : t('topup.restore_purchases')}
        </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Quark icon — atom glyph (core + three orbiting ellipses). Matches the
// canonical icon used across PlanetContextMenu / SystemContextMenu /
// HangarPage / PlayerPage (GAME_BIBLE quark symbol ⚛).
// ---------------------------------------------------------------------------
function QuarkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7bb8ff" strokeWidth="1.2" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

function AlphaPromoTopUpBanner() {
  const { t } = useTranslation();
  return (
    <div style={styles.alphaPromoBanner}>
      <div style={styles.alphaPromoKicker}>{t('topup.alpha_offer_kicker')}</div>
      <div style={styles.alphaPromoTitle}>{t('topup.alpha_offer_title')}</div>
      <div style={styles.alphaPromoText}>{t('topup.alpha_offer_body')}</div>
    </div>
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
  nativeModal: {
    top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
    transform: 'translateX(-50%)',
    maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  nativeHeader: {
    flexShrink: 0,
    padding: '16px 18px 12px',
    marginBottom: 0,
    borderBottom: '1px solid rgba(51,68,85,0.65)',
    background: 'rgba(10,15,25,0.98)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    zIndex: 1,
  },
  modalBody: {
    minHeight: 0,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '16px 18px 18px',
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
  alphaPromoBanner: {
    margin: '0 0 14px',
    padding: '11px 12px',
    borderRadius: 5,
    border: '1px solid rgba(221,170,68,0.55)',
    background: 'linear-gradient(180deg, rgba(80,52,12,0.24), rgba(10,15,25,0.72))',
    boxShadow: '0 0 20px rgba(221,170,68,0.12), inset 0 0 18px rgba(255,204,102,0.06)',
  },
  alphaPromoKicker: {
    color: '#ddaa44',
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  alphaPromoTitle: {
    color: '#ffe0a0',
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  alphaPromoText: {
    color: '#99aabb',
    fontSize: 10,
    lineHeight: 1.45,
  },
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
  premiumActiveNotice: {
    padding: '10px 14px',
    marginBottom: 14,
    borderRadius: 4,
    border: '1px solid rgba(68,255,136,0.36)',
    background: 'rgba(68,255,136,0.06)',
    color: '#44ff88',
    fontSize: 12,
    textAlign: 'center' as const,
    fontFamily: 'monospace',
  },
  premiumActiveUntil: {
    marginTop: 4,
    color: '#9fddb8',
    fontSize: 10,
    letterSpacing: '0.3px',
    fontFamily: 'monospace',
  },
  premiumSection: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
    border: '1px solid rgba(221,170,68,0.3)',
    background: 'rgba(42,28,6,0.22)',
  },
  premiumHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  premiumTitle: {
    color: '#ddaa44',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.4px',
    fontFamily: 'monospace',
  },
  premiumBenefits: {
    color: '#8899aa',
    fontSize: 10,
    lineHeight: 1.5,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  premiumPlans: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  premiumPlanBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '11px 12px',
    borderRadius: 4,
    border: '1px solid rgba(221,170,68,0.3)',
    background: 'rgba(10,15,25,0.58)',
    color: '#aabbcc',
    cursor: 'pointer',
    fontFamily: 'monospace',
    textAlign: 'left' as const,
  },
  premiumPlanBtnActive: {
    border: '1px solid rgba(221,170,68,0.7)',
    background: 'rgba(221,170,68,0.12)',
  },
  premiumPlanBtnDisabled: {
    opacity: 0.58,
    cursor: 'default',
  },
  premiumPlanText: {
    minWidth: 0,
  },
  premiumPlanName: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#d7c19a',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  premiumPlanDesc: {
    color: '#667788',
    fontSize: 10,
    marginTop: 3,
    fontFamily: 'monospace',
  },
  premiumBadge: {
    padding: '2px 5px',
    borderRadius: 3,
    border: '1px solid rgba(68,136,170,0.42)',
    color: '#7bb8ff',
    fontSize: 8,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    fontFamily: 'monospace',
  },
  premiumPlanPrice: {
    flexShrink: 0,
    color: '#ffcc55',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  inlineLoading: {
    textAlign: 'center' as const,
    padding: '18px 0',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  storeUnavailable: {
    padding: '18px 14px',
    marginBottom: 16,
    borderRadius: 4,
    border: '1px solid rgba(255,136,68,0.32)',
    background: 'rgba(255,136,68,0.07)',
    color: '#ffbb88',
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'center' as const,
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
