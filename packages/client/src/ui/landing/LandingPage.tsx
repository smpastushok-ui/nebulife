import React from 'react';
import { useTranslation } from 'react-i18next';
import './landing.css';

const TESTER_GROUP_URL = 'https://t.me/+IT3QjV5a-tQ0ZDZi';

export function LandingPage() {
  const { t, i18n } = useTranslation();
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
  const proofCards = [
    { title: t('landing.proof.exosphere'), body: t('landing.proof.exosphere_body'), tone: 'planet' },
    { title: t('landing.proof.galaxy'), body: t('landing.proof.galaxy_body'), tone: 'galaxy' },
    { title: t('landing.proof.terminal'), body: t('landing.proof.terminal_body'), tone: 'terminal' },
    { title: t('landing.proof.surface'), body: t('landing.proof.surface_body'), tone: 'surface' },
    { title: t('landing.proof.academy'), body: t('landing.proof.academy_body'), tone: 'academy' },
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

  return (
    <main className="landing-root">
      <div className="landing-stars" aria-hidden="true" />
      <nav className="landing-nav" aria-label={t('landing.nav_label')}>
        <a className="landing-logo" href="/">
          <span className="landing-logo-mark" aria-hidden="true" />
          Nebulife
        </a>
        <div className="landing-nav-actions">
          <a href={TESTER_GROUP_URL} target="_blank" rel="noreferrer">{t('landing.nav_testers')}</a>
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
            <a className="landing-btn landing-btn-primary" href={TESTER_GROUP_URL} target="_blank" rel="noreferrer">{t('landing.cta_testers')}</a>
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

        <div className="landing-galaxy-stage" aria-label={t('landing.visual_label')}>
          <div className="landing-galaxy-core" />
          <div className="landing-galaxy-arm landing-galaxy-arm-a" />
          <div className="landing-galaxy-arm landing-galaxy-arm-b" />
          <div className="landing-galaxy-arm landing-galaxy-arm-c" />
          <div className="landing-galaxy-ring landing-galaxy-ring-one" />
          <div className="landing-galaxy-ring landing-galaxy-ring-two" />
          <div className="landing-galaxy-node landing-node-a" />
          <div className="landing-galaxy-node landing-node-b" />
          <div className="landing-galaxy-node landing-node-c" />
          <div className="landing-scan landing-scan-a">{t('landing.visual_scan_a')}</div>
          <div className="landing-scan landing-scan-b">{t('landing.visual_scan_b')}</div>
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
          <a className="landing-btn landing-btn-primary" href={TESTER_GROUP_URL} target="_blank" rel="noreferrer">{t('landing.cta_testers')}</a>
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
              <div className="landing-proof-visual" aria-hidden="true" />
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
          <a className="landing-btn landing-btn-primary" href={TESTER_GROUP_URL} target="_blank" rel="noreferrer">{t('landing.cta_enter')}</a>
          <span className="landing-btn landing-btn-secondary landing-btn-disabled">{t('landing.cta_play')}</span>
        </div>
      </section>
    </main>
  );
}
