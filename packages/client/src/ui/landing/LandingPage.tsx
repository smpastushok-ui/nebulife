import React from 'react';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../analytics/firebase-analytics.js';
import { LivingOrreryHero } from './LivingOrreryHero.js';
import './landing.css';

type ChapterTone = 'crisis' | 'worlds' | 'discoveries' | 'colony' | 'academy' | 'cluster';
type PillarTone = 'discovery' | 'colony' | 'academy' | 'premium';

const APP_STORE_URL = 'https://apps.apple.com/app/nebulife';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.nebulife.app';

const CHAPTER_TONES: ChapterTone[] = ['crisis', 'worlds', 'discoveries', 'colony', 'academy', 'cluster'];
const PILLAR_TONES: PillarTone[] = ['discovery', 'colony', 'academy', 'premium'];

function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduceMotion;
}

function getGameHref(): string {
  return '/play';
}

function StoreBadge({ store, label }: { store: 'apple' | 'google'; label: string }) {
  return (
    <a
      className={`landing-store-badge landing-store-${store}`}
      href={store === 'apple' ? APP_STORE_URL : GOOGLE_PLAY_URL}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void trackEvent('landing_store_click', { store });
      }}
    >
      <span>{store === 'apple' ? 'APP STORE' : 'GOOGLE PLAY'}</span>
      <strong>{label}</strong>
    </a>
  );
}

function ChapterGlyph({ tone }: { tone: ChapterTone }) {
  return (
    <div className={`landing-chapter-glyph landing-chapter-glyph-${tone}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function PillarVisual({ tone }: { tone: PillarTone }) {
  return (
    <div className={`landing-pillar-visual landing-pillar-visual-${tone}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const rootRef = React.useRef<HTMLElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const currentLanguage = i18n.language.startsWith('uk') ? 'uk' : 'en';
  const gameHref = getGameHref();

  const chapters = CHAPTER_TONES.map((tone, index) => ({
    tone,
    code: `0${index + 1}`,
    label: t(`landing.chapters.${tone}.label`),
    title: t(`landing.chapters.${tone}.title`),
    body: t(`landing.chapters.${tone}.body`),
    metric: t(`landing.chapters.${tone}.metric`),
  }));

  const pillars = PILLAR_TONES.map((tone) => ({
    tone,
    label: t(`landing.pillars.${tone}.label`),
    title: t(`landing.pillars.${tone}.title`),
    body: t(`landing.pillars.${tone}.body`),
  }));

  const telemetry = [
    { value: '1,450', label: t('landing.telemetry.stars') },
    { value: '8,000+', label: t('landing.telemetry.worlds') },
    { value: '50', label: t('landing.telemetry.players') },
    { value: '24h', label: t('landing.telemetry.countdown') },
  ];

  const setLanguage = (lang: 'uk' | 'en') => {
    localStorage.setItem('nebulife_lang', lang);
    localStorage.setItem('nebulife_lang_chosen', '1');
    void i18n.changeLanguage(lang);
  };

  const trackPlay = (source: string) => {
    void trackEvent('landing_play_click', { source, language: currentLanguage });
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
    if (!root || reduceMotion) return;

    root.classList.add('landing-motion-ready');
    const animatedBlocks = Array.from(root.querySelectorAll('.landing-animate-window'));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('landing-in-view');
      }
    }, { threshold: 0.18 });
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
  }, [reduceMotion]);

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
          <a href="#chapters">{t('landing.nav_chapters')}</a>
          <a href="#academy">{t('landing.nav_academy')}</a>
          <a href="#stores">{t('landing.nav_store')}</a>
          <a className="landing-nav-play" href={gameHref} onClick={() => trackPlay('nav')}>{t('landing.nav_play')}</a>
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
            <a className="landing-btn landing-btn-primary" href={gameHref} onClick={() => trackPlay('hero')}>{t('landing.cta_play')}</a>
            <a className="landing-btn landing-btn-secondary" href="#chapters">{t('landing.cta_watch')}</a>
          </div>
          <div className="landing-stats">
            {telemetry.map((item) => (
              <div className="landing-stat" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero-stage landing-animate-window" aria-label={t('landing.visual_label')}>
          <LivingOrreryHero reduceMotion={reduceMotion} />
          <div className="landing-briefing">
            <span>{t('landing.hero_brief_label')}</span>
            <strong>{t('landing.hero_brief_title')}</strong>
            <p>{t('landing.hero_brief_body')}</p>
            <div className="landing-briefing-metrics">
              <span>{t('landing.hero_metric_a')}</span>
              <span>{t('landing.hero_metric_b')}</span>
              <span>{t('landing.hero_metric_c')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-manifest landing-animate-window">
        <div className="landing-section-head">
          <span>{t('landing.manifest.label')}</span>
          <h2>{t('landing.manifest.title')}</h2>
        </div>
        <p className="landing-text">{t('landing.manifest.body')}</p>
      </section>

      <section className="landing-section landing-chapters" id="chapters">
        <div className="landing-section-head">
          <span>{t('landing.chapters_label')}</span>
          <h2>{t('landing.chapters_title')}</h2>
        </div>
        <div className="landing-chapter-list">
          {chapters.map((chapter) => (
            <article className={`landing-chapter-card landing-chapter-${chapter.tone} landing-animate-window`} key={chapter.tone}>
              <div className="landing-chapter-index">{chapter.code}</div>
              <ChapterGlyph tone={chapter.tone} />
              <div>
                <span>{chapter.label}</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
                <strong>{chapter.metric}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-pillars" id="academy">
        <div className="landing-section-head">
          <span>{t('landing.pillars_label')}</span>
          <h2>{t('landing.pillars_title')}</h2>
        </div>
        <div className="landing-pillar-grid">
          {pillars.map((pillar) => (
            <article className="landing-pillar-card landing-animate-window" key={pillar.tone}>
              <PillarVisual tone={pillar.tone} />
              <span>{pillar.label}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-cluster-panel landing-animate-window">
        <div className="landing-section-head">
          <span>{t('landing.cluster.label')}</span>
          <h2>{t('landing.cluster.title')}</h2>
        </div>
        <p className="landing-text">{t('landing.cluster.body')}</p>
        <div className="landing-cluster-map" aria-hidden="true">
          {Array.from({ length: 50 }, (_, index) => <span key={index} />)}
        </div>
      </section>

      <section className="landing-final" id="stores">
        <span>{t('landing.final_label')}</span>
        <h2>{t('landing.final_title')}</h2>
        <p>{t('landing.final_subtitle')}</p>
        <div className="landing-actions">
          <a className="landing-btn landing-btn-primary" href={gameHref} onClick={() => trackPlay('final')}>{t('landing.cta_play')}</a>
          <a className="landing-btn landing-btn-secondary" href="mailto:support@nebulife.space">{t('landing.cta_support')}</a>
        </div>
        <div className="landing-store-row">
          <StoreBadge store="apple" label={t('landing.store.apple')} />
          <StoreBadge store="google" label={t('landing.store.google')} />
        </div>
        <div className="landing-footer-links">
          <a href="/privacy.html">{t('landing.footer.privacy')}</a>
          <a href="/support.html">{t('landing.footer.support')}</a>
          <a href="/terms.html">{t('landing.footer.terms')}</a>
        </div>
      </section>
    </main>
  );
}
