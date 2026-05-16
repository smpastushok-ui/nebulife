import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LivingOrreryHero } from './LivingOrreryHero.js';

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isIgnited, setIsIgnited] = useState(false);
  const [igniteComplete, setIgniteComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showNextHint, setShowNextHint] = useState(false);
  const isScrollingRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TOTAL_STEPS = 8;
  const currentLanguage = i18n.language.startsWith('uk') ? 'uk' : 'en';

  const resetInactivityTimer = (hideHint = false) => {
    if (hideHint) setShowNextHint(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (igniteComplete && currentStep > 0 && currentStep < TOTAL_STEPS) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowNextHint(true);
      }, 3000); // 3 seconds is better than 5
    }
  };

  useEffect(() => {
    resetInactivityTimer(false);
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [currentStep, igniteComplete]);

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
      
      /* Default (Desktop) Layout Variables */
      :root {
        --text-pos-top: 40%;
        --text-pos-bottom: auto;
        --text-pos-left: 10%;
        --text-pos-right: auto;
        --text-align: left;
        
        --text-pos-top-alt: 50%;
        --text-pos-bottom-alt: auto;
        --text-pos-left-alt: auto;
        --text-pos-right-alt: 10%;
        --text-align-alt: right;
        
        --text-translate-active: -50%;
        --text-translate-inactive: -40%;
        
        --cluster-text-top: 75%;
        --cluster-text-translate-active: -50%;
        --cluster-text-translate-inactive: -40%;
      }

      /* Mobile Layout Variables */
      @media (max-width: 768px) {
        :root {
          --text-pos-top: 10%;
          --text-pos-bottom: auto;
          --text-pos-left: 5%;
          --text-pos-right: 5%;
          --text-align: center;
          
          --text-pos-top-alt: auto;
          --text-pos-bottom-alt: 12%;
          --text-pos-left-alt: 5%;
          --text-pos-right-alt: 5%;
          --text-align-alt: center;
          
          --text-translate-active: 0;
          --text-translate-inactive: 20px;
          
          --cluster-text-top: 8%;
          --cluster-text-translate-active: 0;
          --cluster-text-translate-inactive: 20px;
        }
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
      resetInactivityTimer(true);
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

    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      resetInactivityTimer(false); // don't hide immediately just on touch
    };
    const handleTouchMove = (e: TouchEvent) => {
      resetInactivityTimer(true); // hide when actively swiping
      if (isScrollingRef.current) return;
      const touchEndX = e.touches[0].clientX;
      const deltaX = touchStartX - touchEndX; // positive means swipe left (next)
      
      if (deltaX > 50) {
        if (currentStep < TOTAL_STEPS) {
          setCurrentStep(s => s + 1);
          isScrollingRef.current = true;
          setTimeout(() => isScrollingRef.current = false, 1500);
        }
      } else if (deltaX < -50) {
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

  const renderNextButton = (nextStep: number, align: 'left' | 'right' | 'center') => {
    return (
      <div style={{
        marginTop: '25px',
        opacity: showNextHint && currentStep === nextStep - 1 ? 1 : 0,
        pointerEvents: showNextHint && currentStep === nextStep - 1 ? 'auto' : 'none',
        transition: 'opacity 0.5s',
        display: 'flex',
        justifyContent: align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start')
      }}>
        <button 
          onClick={() => setCurrentStep(nextStep)}
          style={{ 
            padding: '10px 24px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255, 255, 255, 0.2)', 
            color: '#8899aa', 
            fontSize: '12px', 
            letterSpacing: '2px', 
            cursor: 'pointer',
            textTransform: 'uppercase', 
            borderRadius: '20px', 
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'pulseFade 2s infinite ease-in-out'
          }}
          onMouseOver={(e) => { 
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; 
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseOut={(e) => { 
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; 
            e.currentTarget.style.color = '#8899aa';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          {currentLanguage === 'uk' ? 'Наступна планета' : 'Next Planet'} <span style={{ fontSize: '16px' }}>→</span>
        </button>
      </div>
    );
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
                SCROLL OR SWIPE <span style={{ fontSize: '18px', animation: 'slideRight 1.5s infinite ease-in-out' }}>→</span>
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
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(1), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 1 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 1 ? 'auto' : 'none' }}>
              <div style={{ color: '#888888', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>01 / {t('landing.chapters.mercury.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(136,136,136,0.6)' }}>{t('landing.chapters.mercury.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.mercury.body')}</p>
              {renderNextButton(2, 'center')}
            </div>

            {/* Step 2: Venus */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top-alt)', bottom: 'var(--text-pos-bottom-alt)', left: 'var(--text-pos-left-alt)', right: 'var(--text-pos-right-alt)', textAlign: 'var(--text-align-alt)' as any, opacity: getOpacity(2), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 2 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 2 ? 'auto' : 'none' }}>
              <div style={{ color: '#cc5500', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>02 / {t('landing.chapters.venus.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(204,85,0,0.6)' }}>{t('landing.chapters.venus.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.venus.body')}</p>
              {renderNextButton(3, 'center')}
            </div>

            {/* Step 3: Earth */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(3), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 3 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 3 ? 'auto' : 'none' }}>
              <div style={{ color: '#4488aa', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>03 / {t('landing.chapters.earth.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(68,136,170,0.6)' }}>{t('landing.chapters.earth.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.earth.body')}</p>
              {renderNextButton(4, 'center')}
            </div>

            {/* Step 4: Mars */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top-alt)', bottom: 'var(--text-pos-bottom-alt)', left: 'var(--text-pos-left-alt)', right: 'var(--text-pos-right-alt)', textAlign: 'var(--text-align-alt)' as any, opacity: getOpacity(4), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 4 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 4 ? 'auto' : 'none' }}>
              <div style={{ color: '#ff8844', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>04 / {t('landing.chapters.mars.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(255,136,68,0.6)' }}>{t('landing.chapters.mars.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.mars.body')}</p>
              {renderNextButton(5, 'center')}
            </div>

            {/* Step 5: Jupiter */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(5), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 5 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 5 ? 'auto' : 'none' }}>
              <div style={{ color: '#c69a68', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>05 / {t('landing.chapters.jupiter.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(198,154,104,0.6)' }}>{t('landing.chapters.jupiter.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.jupiter.body')}</p>
              {renderNextButton(6, 'center')}
            </div>

            {/* Step 6: Uranus */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top-alt)', bottom: 'var(--text-pos-bottom-alt)', left: 'var(--text-pos-left-alt)', right: 'var(--text-pos-right-alt)', textAlign: 'var(--text-align-alt)' as any, opacity: getOpacity(6), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 6 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 6 ? 'auto' : 'none' }}>
              <div style={{ color: '#5b9fb5', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>06 / {t('landing.chapters.uranus.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(91,159,181,0.6)' }}>{t('landing.chapters.uranus.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.uranus.body')}</p>
              {renderNextButton(7, 'center')}
            </div>

            {/* Step 7: Neptune */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(7), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 7 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 7 ? 'auto' : 'none' }}>
              <div style={{ color: '#4488ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>07 / {t('landing.chapters.neptune.label')}</div>
              <h2 style={{ fontSize: 'clamp(20px, 4vw, 36px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(68,136,255,0.6)' }}>{t('landing.chapters.neptune.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.neptune.body')}</p>
              {renderNextButton(8, 'center')}
            </div>

            {/* Step 8: Full Cluster / CTA (End of journey) */}
            <div style={{ position: 'absolute', top: 'var(--cluster-text-top)', left: '50%', transform: `translate(-50%, ${currentStep === 8 ? 'var(--cluster-text-translate-active)' : 'var(--cluster-text-translate-inactive)'})`, textAlign: 'center', opacity: getOpacity(8), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: currentStep === 8 ? 'auto' : 'none', width: '90%', maxWidth: '800px' }}>
              <div style={{ color: '#7bb8ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>08 / {t('landing.cluster.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 5vw, 42px)', margin: '0 0 20px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(123,184,255,0.6)' }}>{t('landing.cluster.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.cluster.body')}</p>
              
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="https://testflight.apple.com/join/HkeRMK2D" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '220px', height: '64px', background: 'linear-gradient(135deg, #101828, #0a0f19)', border: '1px solid #334455', color: '#fff', fontSize: '16px', textDecoration: 'none', borderRadius: '12px', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                   onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7bb8ff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(123,184,255,0.2)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334455'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 384 512" fill="currentColor" style={{ marginRight: '14px' }}>
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>Download on the</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0px' }}>App Store</span>
                  </div>
                </a>
                <a href="https://play.google.com/apps/testing/app.nebulife.game" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '220px', height: '64px', background: 'linear-gradient(135deg, #101828, #0a0f19)', border: '1px solid #334455', color: '#fff', fontSize: '16px', textDecoration: 'none', borderRadius: '12px', transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                   onMouseOver={(e) => { e.currentTarget.style.borderColor = '#44ff88'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(68,255,136,0.2)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334455'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 512 512" fill="currentColor" style={{ marginRight: '14px' }}>
                    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>GET IT ON</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0px' }}>Google Play</span>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
