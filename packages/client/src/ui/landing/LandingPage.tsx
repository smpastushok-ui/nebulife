import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LivingOrreryHero } from './LivingOrreryHero.js';

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isIgnited, setIsIgnited] = useState(false);
  const [igniteComplete, setIgniteComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const isScrollingRef = useRef(false);
  const TOTAL_STEPS = 8;
  const currentLanguage = i18n.language.startsWith('uk') ? 'uk' : 'en';

  useEffect(() => {
    // Inject global styles to override the game's default overflow:hidden
    const style = document.createElement('style');
    style.innerHTML = `
      html, body {
        height: 100% !important;
        overflow: hidden !important;
        overscroll-behavior-y: none !important;
        touch-action: none !important;
        background-color: #010206 !important;
        color: #fff !important;
        font-family: monospace !important;
      }
      #root {
        height: 100vh !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!igniteComplete) return;

    const handleWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) return;
      if (e.deltaY > 50) {
        if (currentStep < TOTAL_STEPS) {
          setCurrentStep(s => s + 1);
          isScrollingRef.current = true;
          setTimeout(() => isScrollingRef.current = false, 1500);
        }
      } else if (e.deltaY < -50) {
        if (currentStep > 0) {
          setCurrentStep(s => s - 1);
          isScrollingRef.current = true;
          setTimeout(() => isScrollingRef.current = false, 1500);
        }
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      const touchEndY = e.touches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      
      if (deltaY > 50) {
        if (currentStep < TOTAL_STEPS) {
          setCurrentStep(s => s + 1);
          isScrollingRef.current = true;
          setTimeout(() => isScrollingRef.current = false, 1500);
        }
      } else if (deltaY < -50) {
        if (currentStep > 0) {
          setCurrentStep(s => s - 1);
          isScrollingRef.current = true;
          setTimeout(() => isScrollingRef.current = false, 1500);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [currentStep, igniteComplete]);

  const handleIgnite = () => {
    setIsIgnited(true);
  };

  const setLanguage = (lang: 'uk' | 'en') => {
    localStorage.setItem('nebulife_lang', lang);
    localStorage.setItem('nebulife_lang_chosen', '1');
    void i18n.changeLanguage(lang);
  };

  // Helper for opacity based on discrete step
  const getOpacity = (step: number) => {
    return currentStep === step ? 1 : 0;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#010206' }}>
      {/* 3D Canvas Layer */}
      <LivingOrreryHero 
        isIgnited={isIgnited}
        onIgniteComplete={() => setIgniteComplete(true)}
        targetStep={currentStep}
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
            <style>{`
              @keyframes slideRight {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(10px); }
              }
              @keyframes pulseFade {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `}</style>

            {/* Scroll Hint & Next Button */}
            <div style={{ 
              position: 'absolute', 
              bottom: '10%', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              opacity: currentStep === 0 ? 1 : 0, 
              transition: 'opacity 0.5s', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '20px',
              pointerEvents: currentStep === 0 ? 'auto' : 'none'
            }}>
              <div style={{ 
                color: '#8899aa', 
                fontSize: '12px', 
                letterSpacing: '2px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                animation: 'pulseFade 2s infinite ease-in-out' 
              }}>
                SCROLL OR DRAG <span style={{ fontSize: '18px', animation: 'slideRight 1.5s infinite ease-in-out' }}>→</span>
              </div>
              <button 
                onClick={() => setCurrentStep(1)}
                style={{ 
                  padding: '14px 36px', 
                  background: 'rgba(68, 136, 170, 0.1)', 
                  border: '1px solid rgba(68, 136, 170, 0.5)', 
                  color: '#7bb8ff', 
                  fontSize: '14px', 
                  letterSpacing: '3px', 
                  cursor: 'pointer',
                  textTransform: 'uppercase', 
                  borderRadius: '30px', 
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.3s',
                  boxShadow: '0 0 20px rgba(68, 136, 170, 0.15)'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.background = 'rgba(68, 136, 170, 0.25)'; 
                  e.currentTarget.style.borderColor = '#7bb8ff';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(123, 184, 255, 0.4)'; 
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.background = 'rgba(68, 136, 170, 0.1)'; 
                  e.currentTarget.style.borderColor = 'rgba(68, 136, 170, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(68, 136, 170, 0.15)'; 
                }}
              >
                {currentLanguage === 'uk' ? 'Почати подорож' : 'Begin Journey'}
              </button>
            </div>

            {/* Step 1: Mercury */}
            <div style={{ position: 'absolute', top: '40%', left: '10%', opacity: getOpacity(1), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 1 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#888888', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>01 / {t('landing.chapters.mercury.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(136,136,136,0.3)' }}>{t('landing.chapters.mercury.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', lineHeight: 1.6 }}>{t('landing.chapters.mercury.body')}</p>
            </div>

            {/* Step 2: Venus */}
            <div style={{ position: 'absolute', top: '50%', right: '10%', textAlign: 'right', opacity: getOpacity(2), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 2 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#cc5500', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>02 / {t('landing.chapters.venus.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(204,85,0,0.3)' }}>{t('landing.chapters.venus.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', marginLeft: 'auto', lineHeight: 1.6 }}>{t('landing.chapters.venus.body')}</p>
            </div>

            {/* Step 3: Earth */}
            <div style={{ position: 'absolute', top: '40%', left: '10%', opacity: getOpacity(3), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 3 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#4488aa', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>03 / {t('landing.chapters.earth.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(68,136,170,0.3)' }}>{t('landing.chapters.earth.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', lineHeight: 1.6 }}>{t('landing.chapters.earth.body')}</p>
            </div>

            {/* Step 4: Mars */}
            <div style={{ position: 'absolute', top: '50%', right: '10%', textAlign: 'right', opacity: getOpacity(4), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 4 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#ff8844', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>04 / {t('landing.chapters.mars.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(255,136,68,0.3)' }}>{t('landing.chapters.mars.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', marginLeft: 'auto', lineHeight: 1.6 }}>{t('landing.chapters.mars.body')}</p>
            </div>

            {/* Step 5: Jupiter */}
            <div style={{ position: 'absolute', top: '40%', left: '10%', opacity: getOpacity(5), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 5 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#c69a68', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>05 / {t('landing.chapters.jupiter.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(198,154,104,0.3)' }}>{t('landing.chapters.jupiter.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', lineHeight: 1.6 }}>{t('landing.chapters.jupiter.body')}</p>
            </div>

            {/* Step 6: Uranus */}
            <div style={{ position: 'absolute', top: '50%', right: '10%', textAlign: 'right', opacity: getOpacity(6), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 6 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#5b9fb5', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>06 / {t('landing.chapters.uranus.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(91,159,181,0.3)' }}>{t('landing.chapters.uranus.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', marginLeft: 'auto', lineHeight: 1.6 }}>{t('landing.chapters.uranus.body')}</p>
            </div>

            {/* Step 7: Neptune */}
            <div style={{ position: 'absolute', top: '40%', left: '10%', opacity: getOpacity(7), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 7 ? '-50%' : '-40%'})` }}>
              <div style={{ color: '#4488ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>07 / {t('landing.chapters.neptune.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 0 10px rgba(68,136,255,0.3)' }}>{t('landing.chapters.neptune.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', lineHeight: 1.6 }}>{t('landing.chapters.neptune.body')}</p>
            </div>

            {/* Step 8: Full Cluster / CTA (End of journey) */}
            <div style={{ position: 'absolute', top: '75%', left: '50%', transform: `translate(-50%, ${currentStep === 8 ? '-50%' : '-40%'})`, textAlign: 'center', opacity: getOpacity(8), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: currentStep === 8 ? 'auto' : 'none' }}>
              <div style={{ color: '#7bb8ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>08 / {t('landing.cluster.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 5vw, 42px)', margin: '0 0 20px 0', fontWeight: 'normal', textShadow: '0 0 15px rgba(123,184,255,0.3)' }}>{t('landing.cluster.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>{t('landing.cluster.body')}</p>
              
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="https://testflight.apple.com/join/HkeRMK2D" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '200px', height: '60px', background: '#0a0f19', border: '1px solid #334455', color: '#fff', fontSize: '16px', textDecoration: 'none', borderRadius: '8px', transition: 'all 0.3s' }}
                   onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7bb8ff'; e.currentTarget.style.background = '#111a2b'; e.currentTarget.style.boxShadow = '0 0 20px rgba(123,184,255,0.2)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334455'; e.currentTarget.style.background = '#0a0f19'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '12px' }}>
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1.88 14.613c-.928 1.488-1.892 2.97-3.414 2.99-1.498.02-1.986-.893-3.71-.893-1.725 0-2.25.874-3.69.914-1.52.04-2.617-1.616-3.553-3.09C-1.59 13.56 1.442 8.795 4.542 8.756c1.458-.02 2.825.992 3.73.992.905 0 2.58-1.217 4.364-1.036 1.83.187 3.498 1.107 4.436 2.65-3.834 2.164-3.21 7.29.62 8.755-.89 2.193-2.615 4.29-4.57 4.282-1.46-.008-2.02-.916-3.764-.916-1.745 0-2.35.894-3.743.914-1.522.022-2.68-1.59-3.59-3.07C.324 13.595 1.54 8.752 4.64 8.71c1.458-.02 2.825.992 3.73.992.905 0 2.58-1.218 4.364-1.037 1.83.188 3.498 1.108 4.436 2.65-3.834 2.165-3.21 7.29.62 8.756-1.127 2.766-3.328 5.405-5.91 5.394M14.94 6.002c.813-.984 1.36-2.35.197-3.785C13.882 2.25 12.502 2.84 11.644 3.824c-.753.86-1.412 2.26-.266 3.655 1.42 1.573 2.747.886 3.562-.477z" />
                  </svg>
                  App Store
                </a>
                <a href="https://play.google.com/apps/testing/app.nebulife.game" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '200px', height: '60px', background: '#0a0f19', border: '1px solid #334455', color: '#fff', fontSize: '16px', textDecoration: 'none', borderRadius: '8px', transition: 'all 0.3s' }}
                   onMouseOver={(e) => { e.currentTarget.style.borderColor = '#44ff88'; e.currentTarget.style.background = '#112211'; e.currentTarget.style.boxShadow = '0 0 20px rgba(68,255,136,0.2)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334455'; e.currentTarget.style.background = '#0a0f19'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '12px' }}>
                    <path d="M4.58 2.285L16.29 14 2 19.38l2.58-17.095zM17.41 15.122L20.895 18.6l-5.615.805 2.13-4.283zM3.46 20.82l6.56-5.83 5.38 5.38-11.94.45zM21.754 19.46l-2.095-2.094 1.442-.206c.45-.064.814.3.75.75l-.097.666v.884z" />
                  </svg>
                  Google Play
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
