import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LivingOrreryHero } from './LivingOrreryHero.js';

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isIgnited, setIsIgnited] = useState(false);
  const [igniteComplete, setIgniteComplete] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const currentLanguage = i18n.language.startsWith('uk') ? 'uk' : 'en';

  useEffect(() => {
    // Force dark theme and remove scrollbar issues
    document.documentElement.style.backgroundColor = '#010206';
    document.body.style.backgroundColor = '#010206';
    document.body.style.margin = '0';
    document.body.style.color = '#fff';
    document.body.style.fontFamily = 'monospace';
    
    const handleScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        setScrollProgress(window.scrollY / maxScroll);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleIgnite = () => {
    setIsIgnited(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setLanguage = (lang: 'uk' | 'en') => {
    localStorage.setItem('nebulife_lang', lang);
    localStorage.setItem('nebulife_lang_chosen', '1');
    void i18n.changeLanguage(lang);
  };

  // Helper for opacity based on scroll range
  const getOpacity = (start: number, end: number) => {
    if (scrollProgress < start - 0.05 || scrollProgress > end + 0.05) return 0;
    if (scrollProgress >= start && scrollProgress <= end) return 1;
    if (scrollProgress < start) return (scrollProgress - (start - 0.05)) / 0.05;
    return 1 - (scrollProgress - end) / 0.05;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '600vh', background: '#010206' }}>
      {/* 3D Canvas Layer */}
      <LivingOrreryHero 
        isIgnited={isIgnited}
        onIgniteComplete={() => setIgniteComplete(true)}
        scrollProgress={scrollProgress}
      />

      {/* Navigation / Language */}
      <div style={{ position: 'fixed', top: 20, right: 30, zIndex: 50, display: 'flex', gap: '15px', alignItems: 'center' }}>
        <button onClick={() => setLanguage('uk')} style={{ background: 'none', border: 'none', color: currentLanguage === 'uk' ? '#fff' : '#666', cursor: 'pointer', fontFamily: 'monospace', fontSize: '14px' }}>UK</button>
        <button onClick={() => setLanguage('en')} style={{ background: 'none', border: 'none', color: currentLanguage === 'en' ? '#fff' : '#666', cursor: 'pointer', fontFamily: 'monospace', fontSize: '14px' }}>EN</button>
      </div>

      {/* UI Overlay Layer */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        
        {/* Intro Screen */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center',
          opacity: isIgnited ? 0 : 1, transition: 'opacity 1s ease',
          background: 'radial-gradient(circle at center, transparent 10%, rgba(1,2,6,0.8) 80%)'
        }}>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 48px)', letterSpacing: '2px', fontWeight: 'normal', textShadow: '0 0 20px rgba(255,136,68,0.5)', margin: '0 0 10px 0', textAlign: 'center' }}>
            {t('landing.hero_brief_title')}
          </h1>
          <p style={{ color: '#8899aa', fontSize: '14px', maxWidth: '500px', textAlign: 'center', marginBottom: '40px', lineHeight: 1.6 }}>
            {t('landing.hero_brief_body')}
          </p>
          <button 
            onClick={handleIgnite}
            style={{ 
              pointerEvents: isIgnited ? 'none' : 'auto',
              padding: '16px 40px', background: 'transparent', border: '1px solid #ff8844', 
              color: '#ff8844', fontSize: '16px', letterSpacing: '4px', cursor: 'pointer',
              textTransform: 'uppercase', borderRadius: '4px', transition: 'all 0.3s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,136,68,0.1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,136,68,0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {currentLanguage === 'uk' ? 'Запустити реактор' : 'Ignite Engine'}
          </button>
        </div>

        {/* Cinematic Text Blocks (Active only after ignition) */}
        {igniteComplete && (
          <>
            {/* Scroll Hint */}
            <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', opacity: scrollProgress < 0.05 ? 1 : 0, transition: 'opacity 0.5s', color: '#8899aa', fontSize: '12px', letterSpacing: '2px' }}>
              ↓ SCROLL TO EXPLORE
            </div>

            {/* Chapter 1: Worlds */}
            <div style={{ position: 'absolute', top: '40%', left: '10%', opacity: getOpacity(0.15, 0.3), transition: 'opacity 0.1s', transform: 'translateY(-50%)' }}>
              <div style={{ color: '#4488aa', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>01 / {t('landing.chapters.worlds.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal' }}>{t('landing.chapters.worlds.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', lineHeight: 1.6 }}>{t('landing.chapters.worlds.body')}</p>
            </div>

            {/* Chapter 2: Discoveries */}
            <div style={{ position: 'absolute', top: '50%', right: '10%', textAlign: 'right', opacity: getOpacity(0.35, 0.55), transition: 'opacity 0.1s', transform: 'translateY(-50%)' }}>
              <div style={{ color: '#c69a68', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>02 / {t('landing.chapters.discoveries.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal' }}>{t('landing.chapters.discoveries.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', marginLeft: 'auto', lineHeight: 1.6 }}>{t('landing.chapters.discoveries.body')}</p>
            </div>

            {/* Chapter 3: Colony */}
            <div style={{ position: 'absolute', top: '40%', left: '10%', opacity: getOpacity(0.6, 0.8), transition: 'opacity 0.1s', transform: 'translateY(-50%)' }}>
              <div style={{ color: '#ff8844', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>03 / {t('landing.chapters.colony.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal' }}>{t('landing.chapters.colony.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', lineHeight: 1.6 }}>{t('landing.chapters.colony.body')}</p>
            </div>

            {/* Chapter 4: Full Cluster / CTA */}
            <div style={{ position: 'absolute', top: '75%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', opacity: getOpacity(0.85, 1.0), transition: 'opacity 0.1s', pointerEvents: scrollProgress > 0.85 ? 'auto' : 'none' }}>
              <div style={{ color: '#7bb8ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>04 / {t('landing.cluster.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 5vw, 42px)', margin: '0 0 20px 0', fontWeight: 'normal' }}>{t('landing.cluster.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '600px', margin: '0 auto 30px', lineHeight: 1.6 }}>{t('landing.cluster.body')}</p>
              
              <a href="/play" style={{ display: 'inline-block', padding: '16px 40px', background: 'linear-gradient(180deg, rgba(52, 84, 126, 0.98), rgba(24, 42, 68, 0.98))', border: '1px solid #5a83aa', color: '#e3f1ff', fontSize: '16px', letterSpacing: '2px', textDecoration: 'none', borderRadius: '4px', textTransform: 'uppercase', transition: 'all 0.3s' }}
                 onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 0 28px rgba(68, 136, 170, 0.4)'; }}
                 onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                {t('landing.cta_play')}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
