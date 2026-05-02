import React from 'react';
import { useTranslation } from 'react-i18next';
import './landing.css';

const TESTER_GROUP_URL = 'https://t.me/+IT3QjV5a-tQ0ZDZi';
const TESTER_LEAD_EMAIL_KEY = 'nebulife_tester_lead_email';
type ProofTone = 'planet' | 'galaxy' | 'terminal' | 'surface' | 'academy';
type ShowcaseTone = 'planet' | 'photo' | 'ships';

const LANDING_IMAGES = {
  hero: '/landing/landing-hero.jpg',
  planets: '/landing/landing-planets.jpg',
  expedition: '/landing/landing-expedition.jpg',
  arena: '/landing/landing-arena.jpg',
};

const DUST_POINTS = Array.from({ length: 18 }, (_, index) => index);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function CosmicDust() {
  return (
    <div className="landing-dust" aria-hidden="true">
      {DUST_POINTS.map((index) => <span key={index} />)}
    </div>
  );
}

function ProofGlyph({ tone }: { tone: ProofTone }) {
  if (tone === 'planet') {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="16" />
        <path d="M18 38c9 7 27 8 39 1" />
        <path d="M22 28c10-5 23-6 34 0" />
        <path d="M14 36c0-15 10-27 22-27s22 12 22 27-10 27-22 27-22-12-22-27Z" className="soft" />
      </svg>
    );
  }
  if (tone === 'galaxy') {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="3" />
        <path d="M36 20c12 0 20 6 20 13 0 9-12 13-24 11-10-2-16-7-16-13 0-8 9-11 20-11Z" />
        <path d="M18 47c10-9 31-14 39-7" />
        <path d="M24 25c8 9 28 14 35 5" className="soft" />
      </svg>
    );
  }
  if (tone === 'terminal') {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <rect x="14" y="16" width="44" height="38" rx="3" />
        <path d="M21 27h10M21 36h30M21 45h22" />
        <path d="M46 27l5 4-5 4" className="soft" />
      </svg>
    );
  }
  if (tone === 'surface') {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <path d="M36 12l22 12-22 12-22-12 22-12Z" />
        <path d="M14 34l22 12 22-12" />
        <path d="M14 44l22 12 22-12" />
        <path d="M36 36v20" className="soft" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <path d="M18 20h36v32H18z" />
      <path d="M25 29h22M25 37h16M25 45h10" />
      <circle cx="50" cy="45" r="6" className="soft" />
      <path d="M46 45h8M50 41v8" className="soft" />
    </svg>
  );
}

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const rootRef = React.useRef<HTMLElement | null>(null);
  const [isLeadOpen, setIsLeadOpen] = React.useState(false);
  const [leadEmail, setLeadEmail] = React.useState(() => localStorage.getItem(TESTER_LEAD_EMAIL_KEY) ?? '');
  const [leadError, setLeadError] = React.useState('');
  const [leadWebsite, setLeadWebsite] = React.useState('');
  const [isLeadSubmitting, setIsLeadSubmitting] = React.useState(false);
  const [isTesterUnlocked, setIsTesterUnlocked] = React.useState(() => Boolean(localStorage.getItem(TESTER_LEAD_EMAIL_KEY)));
  const features = [
    { code: '01', title: t('landing.features.live_title'), body: t('landing.features.live_body') },
    { code: '02', title: t('landing.features.ai_title'), body: t('landing.features.ai_body') },
    { code: '03', title: t('landing.features.learn_title'), body: t('landing.features.learn_body') },
    { code: '04', title: t('landing.features.cluster_title'), body: t('landing.features.cluster_body') },
  ];
  const stats = [
    { value: '50', label: t('landing.stats.players') },
    { value: '1,450', label: t('landing.stats.systems') },
    { value: '8,000+', label: t('landing.stats.planets') },
  ];
  const universeFacts = [
    { value: t('landing.universe.fact_1_value'), label: t('landing.universe.fact_1_label') },
    { value: t('landing.universe.fact_2_value'), label: t('landing.universe.fact_2_label') },
    { value: t('landing.universe.fact_3_value'), label: t('landing.universe.fact_3_label') },
  ];
  const showcaseCards: { tone: ShowcaseTone; eyebrow: string; title: string; body: string; image: string }[] = [
    {
      tone: 'planet',
      eyebrow: t('landing.showcase.planet_eyebrow'),
      title: t('landing.showcase.planet_title'),
      body: t('landing.showcase.planet_body'),
      image: LANDING_IMAGES.planets,
    },
    {
      tone: 'photo',
      eyebrow: t('landing.showcase.photo_eyebrow'),
      title: t('landing.showcase.photo_title'),
      body: t('landing.showcase.photo_body'),
      image: LANDING_IMAGES.expedition,
    },
    {
      tone: 'ships',
      eyebrow: t('landing.showcase.ships_eyebrow'),
      title: t('landing.showcase.ships_title'),
      body: t('landing.showcase.ships_body'),
      image: LANDING_IMAGES.arena,
    },
  ];
  const proofCards = [
    { code: '01', title: t('landing.proof.exosphere'), body: t('landing.proof.exosphere_body'), tone: 'planet' as const },
    { code: '02', title: t('landing.proof.galaxy'), body: t('landing.proof.galaxy_body'), tone: 'galaxy' as const },
    { code: '03', title: t('landing.proof.terminal'), body: t('landing.proof.terminal_body'), tone: 'terminal' as const },
    { code: '04', title: t('landing.proof.surface'), body: t('landing.proof.surface_body'), tone: 'surface' as const },
    { code: '05', title: t('landing.proof.academy'), body: t('landing.proof.academy_body'), tone: 'academy' as const },
  ];
  const flow = [
    t('landing.flow.step_1'),
    t('landing.flow.step_2'),
    t('landing.flow.step_3'),
    t('landing.flow.step_4'),
    t('landing.flow.step_5'),
  ];

  const setLanguage = (lang: 'uk' | 'en') => {
    localStorage.setItem('nebulife_lang', lang);
    localStorage.setItem('nebulife_lang_chosen', '1');
    void i18n.changeLanguage(lang);
  };
  const currentLanguage = i18n.language.startsWith('uk') ? 'uk' : 'en';

  const openLead = () => {
    setLeadError('');
    setIsLeadOpen(true);
  };

  const submitLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = leadEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setLeadError(t('landing.lead.invalid'));
      return;
    }

    setIsLeadSubmitting(true);
    setLeadError('');
    try {
      const response = await fetch('/api/tester-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          language: currentLanguage,
          source: 'landing_mobile_test',
          website: leadWebsite,
        }),
      });
      if (!response.ok) throw new Error('Lead request failed');

      localStorage.setItem(TESTER_LEAD_EMAIL_KEY, normalizedEmail);
      setLeadEmail(normalizedEmail);
      setIsTesterUnlocked(true);
      // GA4 policy does not allow sending PII, so the email stays local.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gtag = (window as any).gtag;
      if (typeof gtag === 'function') {
        // Custom event for granular reporting in our funnel
        gtag('event', 'tester_lead_submitted', {
          event_category: 'landing',
          event_label: 'mobile_test',
        });
        // Standard GA4 'generate_lead' event — recognised automatically by
        // GA4 Audiences / Conversions, so we can mark it a key event
        // without further mapping.
        gtag('event', 'generate_lead', {
          method: 'mobile_tester_signup',
          value: 1,
          currency: 'USD',
        });
      }
    } catch {
      setLeadError(t('landing.lead.save_error'));
    } finally {
      setIsLeadSubmitting(false);
    }
  };

  const renderTesterCta = (label: string, extraClassName = '') => {
    if (isTesterUnlocked) {
      return (
        <a className={`landing-btn landing-btn-primary ${extraClassName}`} href={TESTER_GROUP_URL} target="_blank" rel="noreferrer">
          {t('landing.lead.open_test')}
        </a>
      );
    }

    return (
      <button className={`landing-btn landing-btn-primary ${extraClassName}`} type="button" onClick={openLead}>
        {label}
      </button>
    );
  };

  React.useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    root.classList.add('landing-motion-ready');

    const animatedBlocks = Array.from(root.querySelectorAll('.landing-animate-window'));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('landing-in-view');
      }
    }, { threshold: 0.2 });
    animatedBlocks.forEach((block) => observer.observe(block));

    let raf = 0;
    const updatePointer = (event: PointerEvent) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty('--landing-pointer-x', x.toFixed(3));
        root.style.setProperty('--landing-pointer-y', y.toFixed(3));
      });
    };

    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('pointermove', updatePointer);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Google Analytics 4 — landing-only. Not loaded on /play and not in
  // Capacitor native shell (LandingPage never mounts there). Idempotent
  // guard prevents duplicate script tags on remount during HMR.
  React.useEffect(() => {
    const GA_ID = 'G-JEELHEM0Z4';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.__nebulifeGAInjected) return;
    w.__nebulifeGAInjected = true;

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    w.dataLayer = w.dataLayer || [];
    function gtag(...args: unknown[]) { w.dataLayer.push(args); }
    w.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }, []);

  return (
    <main className="landing-root" ref={rootRef}>
      <div className="landing-nebula" aria-hidden="true" />
      <div className="landing-shooting-stars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <nav className="landing-nav" aria-label={t('landing.nav_label')}>
        <a className="landing-logo" href="/">
          <span className="landing-logo-mark" aria-hidden="true" />
          Nebulife
        </a>
        <div className="landing-nav-actions">
          <button type="button" onClick={openLead}>{t('landing.nav_testers')}</button>
          <span className="landing-nav-soon">{t('landing.nav_play')}</span>
          <div className="landing-lang" aria-label={t('landing.lang_label')}>
            <button type="button" className={currentLanguage === 'uk' ? 'active' : ''} onClick={() => setLanguage('uk')}>{t('landing.lang_uk')}</button>
            <button type="button" className={currentLanguage === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>{t('landing.lang_en')}</button>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-badge">{t('landing.badge')}</div>
          <h1>{t('landing.title')}</h1>
          <p>{t('landing.subtitle')}</p>
          <div className="landing-actions">
            {renderTesterCta(t('landing.cta_testers'))}
            <span className="landing-btn landing-btn-secondary landing-btn-disabled">{t('landing.cta_play')}</span>
          </div>
          <div className="landing-stats">
            {stats.map((item) => (
              <div className="landing-stat" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-galaxy-stage landing-cosmos-window landing-animate-window" aria-label={t('landing.visual_label')}>
          <img className="landing-hero-image" src={LANDING_IMAGES.hero} alt="" aria-hidden="true" loading="eager" />
          <CosmicDust />
          <div className="landing-window-grid" aria-hidden="true" />
          <div className="landing-light-sweep" aria-hidden="true" />
        </div>
      </section>

      <section className="landing-section landing-showcase-panel">
        <div className="landing-section-head">
          <span>{t('landing.showcase.label')}</span>
          <h2>{t('landing.showcase.title')}</h2>
        </div>
        <p className="landing-text">{t('landing.showcase.body')}</p>
        <div className="landing-showcase-grid">
          {showcaseCards.map((item) => (
            <article className={`landing-showcase-card landing-showcase-${item.tone} landing-animate-window`} key={item.title}>
              <div className="landing-showcase-visual" aria-hidden="true">
                <img src={item.image} alt="" loading="lazy" />
                <CosmicDust />
                <div className="landing-light-sweep" aria-hidden="true" />
              </div>
              <div className="landing-showcase-copy">
                <span>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-universe-panel">
        <div className="landing-section-head">
          <span>{t('landing.universe.label')}</span>
          <h2>{t('landing.universe.title')}</h2>
        </div>
        <p className="landing-text">{t('landing.universe.body')}</p>
        <div className="landing-universe-grid">
          {universeFacts.map((item) => (
            <div className="landing-universe-stat" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="landing-mystery-line">
          <span>{t('landing.universe.mystery_a')}</span>
          <span>{t('landing.universe.mystery_b')}</span>
          <span>{t('landing.universe.mystery_c')}</span>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <span>{t('landing.section_label')}</span>
          <h2>{t('landing.why_title')}</h2>
        </div>
        <div className="landing-grid">
          {features.map((item) => (
            <article className="landing-card" key={item.title}>
              <span>{item.code}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-tester-panel" id="testers">
        <div className="landing-section-head">
          <span>{t('landing.testers_label')}</span>
          <h2>{t('landing.testers_title')}</h2>
        </div>
        <p className="landing-text">{t('landing.testers_body')}</p>
        <div className="landing-actions">
          {renderTesterCta(t('landing.cta_testers'))}
          <span className="landing-btn landing-btn-secondary landing-btn-disabled">{t('landing.cta_play')}</span>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <span>{t('landing.flow_label')}</span>
          <h2>{t('landing.flow_title')}</h2>
        </div>
        <ol className="landing-flow">
          {flow.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <span>{t('landing.proof_label')}</span>
          <h2>{t('landing.proof_title')}</h2>
        </div>
        <div className="landing-proof-grid">
          {proofCards.map((item) => (
            <article className={`landing-proof-card landing-proof-${item.tone}`} key={item.title}>
              <div className="landing-proof-top">
                <span>{item.code}</span>
                <div className="landing-proof-visual">
                  <ProofGlyph tone={item.tone} />
                </div>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <h2>{t('landing.final_title')}</h2>
        <p>{t('landing.final_subtitle')}</p>
        <div className="landing-actions">
          {renderTesterCta(t('landing.cta_enter'))}
          <span className="landing-btn landing-btn-secondary landing-btn-disabled">{t('landing.cta_play')}</span>
        </div>
      </section>

      {isLeadOpen && (
        <div className="landing-lead-overlay" role="dialog" aria-modal="true" aria-labelledby="landing-lead-title">
          <div className="landing-lead-modal">
            <button className="landing-lead-close" type="button" onClick={() => setIsLeadOpen(false)} aria-label={t('landing.lead.close')}>x</button>
            <div className="landing-section-head">
              <span>{t('landing.lead.label')}</span>
              <h2 id="landing-lead-title">{t('landing.lead.title')}</h2>
            </div>
            <p>{t('landing.lead.body')}</p>
            <form className="landing-lead-form" onSubmit={submitLead}>
              <div className="landing-honeypot" aria-hidden="true">
                <label htmlFor="landing-lead-website">Website</label>
                <input
                  id="landing-lead-website"
                  type="text"
                  value={leadWebsite}
                  onChange={(event) => setLeadWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <label htmlFor="landing-lead-email">{t('landing.lead.email_label')}</label>
              <input
                id="landing-lead-email"
                type="email"
                value={leadEmail}
                onChange={(event) => setLeadEmail(event.target.value)}
                placeholder={t('landing.lead.email_placeholder')}
                autoComplete="email"
                disabled={isLeadSubmitting || isTesterUnlocked}
              />
              <div className="landing-lead-consent">{t('landing.lead.consent')}</div>
              {leadError && <div className="landing-lead-error">{leadError}</div>}
              <button className="landing-btn landing-btn-primary" type="submit" disabled={isLeadSubmitting || isTesterUnlocked}>
                {isLeadSubmitting ? t('landing.lead.saving') : t('landing.lead.submit')}
              </button>
            </form>
            {isTesterUnlocked && (
              <div className="landing-lead-unlocked">
                <strong>{t('landing.lead.ready_title')}</strong>
                <span>{t('landing.lead.ready_body')}</span>
                <a className="landing-btn landing-btn-primary" href={TESTER_GROUP_URL} target="_blank" rel="noreferrer">{t('landing.lead.open_test')}</a>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
