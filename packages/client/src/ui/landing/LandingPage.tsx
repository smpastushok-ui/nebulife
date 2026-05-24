import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LivingOrreryHero } from './LivingOrreryHero.js';

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [isIgnited, setIsIgnited] = useState(false);
  const [igniteComplete, setIgniteComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showNextHint, setShowNextHint] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('nebulife_landing_music_enabled') !== '0');
  const isScrollingRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onboardingMusicRef = useRef<HTMLAudioElement | null>(null);
  const spaceMusicRef = useRef<HTMLAudioElement | null>(null);
  const TOTAL_STEPS = 8;
  const currentLanguage = i18n.language.startsWith('uk') ? 'uk' : 'en';

  const syncLandingMusic = (enabled: boolean) => {
    const tracks = [
      { ref: onboardingMusicRef, src: '/music/onboarding.mp3', volume: 0.8 },
      { ref: spaceMusicRef, src: '/music/space.mp3', volume: 0.1 },
    ];

    tracks.forEach(({ ref, src, volume }) => {
      if (!ref.current) {
        const audio = new Audio(src);
        audio.loop = true;
        audio.preload = 'auto';
        ref.current = audio;
      }

      const audio = ref.current;
      audio.volume = enabled ? volume : 0;
      if (enabled) {
        void audio.play().catch(() => {
          // Коментар українською: браузер дозволить звук після першого кліку/тапу.
        });
      } else {
        audio.pause();
      }
    });
  };

  const toggleMusic = () => {
    const nextEnabled = !musicEnabled;
    setMusicEnabled(nextEnabled);
    syncLandingMusic(nextEnabled);
  };

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
    localStorage.setItem('nebulife_landing_music_enabled', musicEnabled ? '1' : '0');
    syncLandingMusic(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (musicEnabled) syncLandingMusic(true);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      onboardingMusicRef.current?.pause();
      spaceMusicRef.current?.pause();
      onboardingMusicRef.current = null;
      spaceMusicRef.current = null;
    };
  }, [musicEnabled]);

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
          --text-pos-top: 5%;
          --text-pos-bottom: auto;
          --text-pos-left: 5%;
          --text-pos-right: 5%;
          --text-align: center;
          
          --text-pos-top-alt: auto;
          --text-pos-bottom-alt: 5%;
          --text-pos-left-alt: 5%;
          --text-pos-right-alt: 5%;
          --text-align-alt: center;
          
          --text-translate-active: 0;
          --text-translate-inactive: 20px;
          
          --cluster-text-top: 5%;
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
    if (musicEnabled) syncLandingMusic(true);
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
        <button
          onClick={toggleMusic}
          aria-label={musicEnabled ? t('landing.music_turn_off') : t('landing.music_turn_on')}
          title={musicEnabled ? t('landing.music_turn_off') : t('landing.music_turn_on')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 30,
            padding: '0 10px',
            background: musicEnabled ? 'rgba(68, 136, 170, 0.14)' : 'rgba(10, 15, 25, 0.48)',
            border: `1px solid ${musicEnabled ? 'rgba(123,184,255,0.5)' : 'rgba(68,85,102,0.65)'}`,
            borderRadius: 999,
            color: musicEnabled ? '#7bb8ff' : '#667788',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            boxShadow: musicEnabled ? '0 0 14px rgba(123,184,255,0.22)' : 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 6.1H5L8.2 3.4v9.2L5 9.9H2.5z" />
            {musicEnabled ? <path d="M11 5.1c.7.7 1 1.7 1 2.9s-.3 2.2-1 2.9" /> : <path d="M11 6l3 3m0-3l-3 3" />}
          </svg>
          <span>{t('landing.music_label')}</span>
          <span style={{ opacity: 0.72 }}>{musicEnabled ? t('landing.music_on') : t('landing.music_off')}</span>
        </button>
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
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(1), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 1 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 1 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#888888', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>01 / {t('landing.chapters.mercury.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(136,136,136,0.6)' }}>{t('landing.chapters.mercury.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.mercury.body')}</p>
              {renderNextButton(2, 'center')}
            </div>

            {/* Step 2: Venus */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top-alt)', bottom: 'var(--text-pos-bottom-alt)', left: 'var(--text-pos-left-alt)', right: 'var(--text-pos-right-alt)', textAlign: 'var(--text-align-alt)' as any, opacity: getOpacity(2), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 2 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 2 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#cc5500', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>02 / {t('landing.chapters.venus.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(204,85,0,0.6)' }}>{t('landing.chapters.venus.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.venus.body')}</p>
              {renderNextButton(3, 'center')}
            </div>

            {/* Step 3: Earth */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(3), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 3 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 3 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#4488aa', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>03 / {t('landing.chapters.earth.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(68,136,170,0.6)' }}>{t('landing.chapters.earth.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.earth.body')}</p>
              {renderNextButton(4, 'center')}
            </div>

            {/* Step 4: Mars */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top-alt)', bottom: 'var(--text-pos-bottom-alt)', left: 'var(--text-pos-left-alt)', right: 'var(--text-pos-right-alt)', textAlign: 'var(--text-align-alt)' as any, opacity: getOpacity(4), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 4 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 4 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#ff8844', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>04 / {t('landing.chapters.mars.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(255,136,68,0.6)' }}>{t('landing.chapters.mars.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.mars.body')}</p>
              {renderNextButton(5, 'center')}
            </div>

            {/* Step 5: Jupiter */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(5), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 5 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 5 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#c69a68', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>05 / {t('landing.chapters.jupiter.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(198,154,104,0.6)' }}>{t('landing.chapters.jupiter.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.jupiter.body')}</p>
              {renderNextButton(6, 'center')}
            </div>

            {/* Step 6: Uranus */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top-alt)', bottom: 'var(--text-pos-bottom-alt)', left: 'var(--text-pos-left-alt)', right: 'var(--text-pos-right-alt)', textAlign: 'var(--text-align-alt)' as any, opacity: getOpacity(6), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 6 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 6 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#5b9fb5', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>06 / {t('landing.chapters.uranus.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(91,159,181,0.6)' }}>{t('landing.chapters.uranus.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.uranus.body')}</p>
              {renderNextButton(7, 'center')}
            </div>

            {/* Step 7: Neptune */}
            <div style={{ position: 'absolute', top: 'var(--text-pos-top)', bottom: 'var(--text-pos-bottom)', left: 'var(--text-pos-left)', right: 'var(--text-pos-right)', textAlign: 'var(--text-align)' as any, opacity: getOpacity(7), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: `translateY(${currentStep === 7 ? 'var(--text-translate-active)' : 'var(--text-translate-inactive)'})`, pointerEvents: currentStep === 7 ? 'auto' : 'none', padding: '20px', background: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, transparent 70%)' }}>
              <div style={{ color: '#4488ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>07 / {t('landing.chapters.neptune.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', margin: '0 0 15px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(68,136,255,0.6)' }}>{t('landing.chapters.neptune.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6, fontSize: '16px', textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.chapters.neptune.body')}</p>
              {renderNextButton(8, 'center')}
            </div>

            {/* Step 8: Full Cluster / CTA (End of journey) */}
            <div style={{ position: 'absolute', top: 'var(--cluster-text-top)', left: '50%', transform: `translate(-50%, ${currentStep === 8 ? 'var(--cluster-text-translate-active)' : 'var(--cluster-text-translate-inactive)'})`, textAlign: 'center', opacity: getOpacity(8), transition: 'all 1s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: currentStep === 8 ? 'auto' : 'none', width: '90%', maxWidth: '800px' }}>
              <div style={{ color: '#7bb8ff', fontSize: '12px', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>08 / {t('landing.cluster.label')}</div>
              <h2 style={{ fontSize: 'clamp(24px, 5vw, 42px)', margin: '0 0 20px 0', fontWeight: 'normal', textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.9), 0 0 30px rgba(123,184,255,0.6)' }}>{t('landing.cluster.title')}</h2>
              <p style={{ color: '#8899aa', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6, textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.8)' }}>{t('landing.cluster.body')}</p>
              
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="https://testflight.apple.com/join/HkeRMK2D" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '220px', height: '64px', background: 'rgba(10, 15, 25, 0.8)', border: '1px solid #7bb8ff', color: '#fff', fontSize: '16px', textDecoration: 'none', borderRadius: '12px', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(123,184,255,0.3), inset 0 0 10px rgba(123,184,255,0.1)', backdropFilter: 'blur(10px)' }}
                   onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 0 25px rgba(123,184,255,0.6), inset 0 0 15px rgba(123,184,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(15, 25, 40, 0.9)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(123,184,255,0.3), inset 0 0 10px rgba(123,184,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(10, 15, 25, 0.8)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 384 512" fill="currentColor" style={{ marginRight: '14px' }}>
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8, letterSpacing: '1px' }}>Download on the</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0px' }}>App Store</span>
                  </div>
                </a>
                <a href="https://play.google.com/apps/testing/app.nebulife.game" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '220px', height: '64px', background: 'rgba(10, 15, 25, 0.8)', border: '1px solid #44ff88', color: '#fff', fontSize: '16px', textDecoration: 'none', borderRadius: '12px', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(68,255,136,0.3), inset 0 0 10px rgba(68,255,136,0.1)', backdropFilter: 'blur(10px)' }}
                   onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 0 25px rgba(68,255,136,0.6), inset 0 0 15px rgba(68,255,136,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(15, 30, 20, 0.9)'; }}
                   onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(68,255,136,0.3), inset 0 0 10px rgba(68,255,136,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(10, 15, 25, 0.8)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 512 512" fill="currentColor" style={{ marginRight: '14px' }}>
                    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8, letterSpacing: '1px' }}>GET IT ON</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0px' }}>Google Play</span>
                  </div>
                </a>
                <div aria-disabled="true" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '220px', height: '64px', background: 'rgba(10, 15, 25, 0.62)', border: '1px solid #446688', color: '#aabbcc', fontSize: '16px', textDecoration: 'none', borderRadius: '12px', transition: 'all 0.3s', boxShadow: '0 0 15px rgba(68,136,170,0.22), inset 0 0 10px rgba(68,136,170,0.08)', backdropFilter: 'blur(10px)', opacity: 0.88, cursor: 'default' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '14px', color: '#7bb8ff' }}>
                    <circle cx="14" cy="12" r="7.5" opacity="0.7" />
                    <path d="M6.5 12 H21.5" opacity="0.55" />
                    <path d="M14 4.5 C11.8 7.2 10.8 9.7 10.8 12 C10.8 14.3 11.8 16.8 14 19.5" opacity="0.75" />
                    <path d="M14 4.5 C16.2 7.2 17.2 9.7 17.2 12 C17.2 14.3 16.2 16.8 14 19.5" opacity="0.75" />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '10px', opacity: 0.8, letterSpacing: '1px', textTransform: 'uppercase' }}>WEB</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0px' }}>Nebulife</span>
                  </div>
                  <span style={{ position: 'absolute', top: '-9px', right: '12px', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(123,184,255,0.45)', background: 'rgba(5,10,20,0.92)', color: '#7bb8ff', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 0 12px rgba(123,184,255,0.28)' }}>soon</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
