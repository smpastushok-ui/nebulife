import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchWebAccess,
  startWebPremiumFlow,
  type WebAccessResponse,
  type WebPremiumPlan,
  type WebPremiumPlanId,
} from '../../api/payment-api.js';

interface WebAccessGateProps {
  onAllowed: () => void;
}

const PLAN_ORDER: WebPremiumPlanId[] = ['monthly', 'yearly', 'lifetime'];

export function WebAccessGate({ onAllowed }: WebAccessGateProps) {
  const { t } = useTranslation();
  const [access, setAccess] = useState<WebAccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingPlan, setPayingPlan] = useState<WebPremiumPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWebAccess();
      setAccess(result);
      if (result.allowed) onAllowed();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (planId: WebPremiumPlanId) => {
    setPayingPlan(planId);
    setError(null);
    try {
      const payment = await startWebPremiumFlow(planId);
      setPendingReference(payment.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('web_access.payment_error'));
    } finally {
      setPayingPlan(null);
    }
  };

  const plans = [...(access?.plans ?? [])].sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));

  return (
    <div style={styles.root}>
      <div style={styles.panel}>
        <div style={styles.kicker}>{t('web_access.kicker')}</div>
        <h1 style={styles.title}>{t('web_access.title')}</h1>
        <p style={styles.body}>
          {loading ? t('web_access.checking') : t('web_access.no_access')}
        </p>

        {access?.reason === 'email_mismatch' && (
          <div style={styles.warning}>{t('web_access.email_mismatch')}</div>
        )}

        {!loading && plans.length > 0 && (
          <div style={styles.planGrid}>
            {plans.map((plan) => (
              <button
                key={plan.id}
                style={{
                  ...styles.planButton,
                  ...(plan.id === 'yearly' ? styles.planButtonFeatured : {}),
                  opacity: payingPlan && payingPlan !== plan.id ? 0.45 : 1,
                }}
                onClick={() => handleBuy(plan.id)}
                disabled={!!payingPlan}
              >
                <span style={styles.planName}>{t(`premium.${plan.id}_label`)}</span>
                <span style={styles.planDesc}>{t(`premium.${plan.id}_desc`)}</span>
                <span style={styles.planPrice}>{formatPlanPrice(plan, t('topup.currency'))}</span>
                {plan.id === 'yearly' && <span style={styles.badge}>{t('premium.yearly_save')}</span>}
              </button>
            ))}
          </div>
        )}

        {pendingReference && (
          <div style={styles.pending}>
            {t('web_access.payment_pending')}
            <button style={styles.secondaryButton} onClick={() => void refresh()}>
              {t('web_access.refresh_access')}
            </button>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.footer}>{t('web_access.native_hint')}</div>
      </div>
    </div>
  );
}

function formatPlanPrice(plan: WebPremiumPlan, currency: string): string {
  return `${plan.amountUah} ${currency}`;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 12000,
    background: 'radial-gradient(circle at 50% 20%, rgba(68,136,170,0.14), rgba(2,5,16,0.98) 58%)',
    color: '#aabbcc',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  panel: {
    width: 560,
    maxWidth: '100%',
    border: '1px solid #334455',
    borderRadius: 6,
    background: 'rgba(10,15,25,0.94)',
    boxShadow: '0 18px 80px rgba(0,0,0,0.55), 0 0 40px rgba(68,136,170,0.12)',
    padding: 24,
  },
  kicker: {
    color: '#44ff88',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    margin: 0,
    color: '#ccddee',
    fontSize: 22,
    lineHeight: 1.25,
    fontFamily: 'monospace',
  },
  body: {
    color: '#8899aa',
    fontSize: 13,
    lineHeight: 1.65,
    margin: '14px 0 18px',
  },
  warning: {
    border: '1px solid rgba(255,136,68,0.35)',
    background: 'rgba(255,136,68,0.08)',
    color: '#ffb17b',
    borderRadius: 4,
    padding: 10,
    fontSize: 12,
    marginBottom: 14,
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
  },
  planButton: {
    position: 'relative',
    minHeight: 118,
    border: '1px solid #334455',
    borderRadius: 4,
    background: 'rgba(5,10,20,0.78)',
    color: '#aabbcc',
    padding: 14,
    textAlign: 'left',
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  planButtonFeatured: {
    borderColor: '#446688',
    background: 'linear-gradient(180deg, rgba(68,136,170,0.18), rgba(5,10,20,0.82))',
  },
  planName: {
    display: 'block',
    color: '#ccddee',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
  },
  planDesc: {
    display: 'block',
    color: '#667788',
    fontSize: 11,
    lineHeight: 1.4,
    minHeight: 30,
  },
  planPrice: {
    display: 'block',
    color: '#7bb8ff',
    fontSize: 16,
    fontWeight: 700,
    marginTop: 12,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: '#44ff88',
    fontSize: 9,
    border: '1px solid rgba(68,255,136,0.25)',
    borderRadius: 999,
    padding: '2px 6px',
  },
  pending: {
    marginTop: 14,
    border: '1px solid rgba(68,255,136,0.25)',
    background: 'rgba(68,255,136,0.06)',
    borderRadius: 4,
    padding: 12,
    fontSize: 12,
    color: '#9deebb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    border: '1px solid #334455',
    background: 'rgba(10,15,25,0.8)',
    color: '#aabbcc',
    borderRadius: 3,
    padding: '7px 10px',
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  error: {
    marginTop: 12,
    color: '#cc4444',
    fontSize: 12,
  },
  footer: {
    color: '#667788',
    fontSize: 11,
    lineHeight: 1.5,
    marginTop: 16,
  },
};
