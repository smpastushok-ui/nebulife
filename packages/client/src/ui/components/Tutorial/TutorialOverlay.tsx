import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { TUTORIAL_STEPS, type TutorialStepConfig } from './tutorialSteps';
/* Коментар українською: Імпорт програвача звукових ефектів для інтерфейсу */
import { playSfx } from '../../../audio/SfxPlayer.js';
import { AstraFabButton, getAstraFabPosition, isVerticalSideChatLayout } from '../AstraFabButton.js';

// ---------------------------------------------------------------------------
// TutorialOverlay — Spotlight + tooltip overlay for interactive tutorial
// ---------------------------------------------------------------------------
// Uses box-shadow approach: a fixed div with massive inset shadow creates
// a "hole" over the target element. Click interception checks coordinates.
// z-index: 10050 — above all panels (9500-10000) except AuthScreen.
// ---------------------------------------------------------------------------

const STYLE_ID = 'nebulife-tutorial-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes tut-spotlight-pulse {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0), 0 0 0 2px rgba(123,184,255,0.45); }
      50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0), 0 0 0 4px rgba(123,184,255,0.85); }
    }
    @keyframes tut-spotlight-pulse-nodim {
      0%, 100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0), 0 0 0 2px rgba(123,184,255,0.45); }
      50% { box-shadow: 0 0 0 9999px rgba(0,0,0,0), 0 0 0 4px rgba(123,184,255,0.85); }
    }
    @keyframes tut-tooltip-enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes astra-panel-enter {
      from { opacity: 0; transform: translateX(28px) scale(0.985); clip-path: inset(0 0 0 100%); }
      to { opacity: 1; transform: translateX(0) scale(1); clip-path: inset(0 0 0 0); }
    }
    @keyframes astra-panel-enter-mobile {
      from { opacity: 0; transform: translateY(26px) scale(0.985); clip-path: inset(100% 0 0 0); }
      to { opacity: 1; transform: translateY(0) scale(1); clip-path: inset(0 0 0 0); }
    }
    @keyframes astra-scan-line {
      0%, 62% { transform: translateY(-130%); opacity: 0; }
      68% { opacity: 0.45; }
      86% { opacity: 0.18; }
      100% { transform: translateY(130%); opacity: 0; }
    }
    @keyframes astra-soft-pulse {
      0%, 100% { opacity: 0.72; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const ASTRA_VIDEO_URL = '/astra/astra-video.mp4';
const ASTRA_PORTRAIT_URL = '/astra/astra-portrait.jpg';

function getAstraVoiceClip(stepId: string, subStepIndex: number, language: string): string | null {
  const isUkrainian = language.startsWith('uk');
  const clips = isUkrainian
    ? {
      awakening: 'probudzhennya_ua',
      terminal: 'terminal_ua',
      firstChoice: 'pershii_vybir_ua',
      firstScan: 'pershe_scanuvannya_ua',
      firstResult: 'pershi_rezultat_ua',
      researchData: 'research_data_ua',
      freeTask: 'free_task_ua',
      firstDiscovery: 'persha_znahidka_ua',
      quantum: 'quantum_focus_ua',
      firstPhoto: 'pershe_photo_ua',
      gallery: 'galery_ua',
      handoff: 'peredacha_chat_ua',
      /* Коментар українською: Файли озвучки для нових кроків розширеного онбордингу */
      chatTabs: 'chat_tabs_ua',
      chatClose: 'chat_close_ua',
      galaxyIntro: 'galaxy_intro_ua',
      clusterIntro: 'cluster_intro_ua',
      galaxyMapIntro: 'galaxy_map_intro_ua',
      galaxyMapCenter: 'galaxy_map_center_ua',
      systemRadialSelect: 'system_radial_select_ua',
      systemSceneIntro: 'system_scene_intro_ua',
      exosphereBtnClick: 'exosphere_btn_click_ua',
      exosphereSceneExplain: 'exosphere_scene_explain_ua',
      academyIntro: 'academy_intro_ua',
      encyclopediaExplain: 'encyclopedia_explain_ua',
    }
    : {
      awakening: 'Awakening_en',
      terminal: 'Terminal_en',
      firstChoice: 'First_Choice_en',
      firstScan: 'First_Scan_en',
      firstResult: 'First_Result_en',
      researchData: 'Research_Data_en',
      freeTask: 'Free_Task_en',
      firstDiscovery: 'First_Discovery_en',
      quantum: 'Quantum_Focus_en',
      firstPhoto: 'First_Photo_en',
      gallery: 'gallery_en',
      handoff: 'Chat_Handoff_en',
      /* Коментар українською: English voice files for new onboarding steps */
      chatTabs: 'Chat_Tabs_en',
      chatClose: 'Chat_Close_en',
      galaxyIntro: 'Galaxy_Intro_en',
      clusterIntro: 'Cluster_Intro_en',
      galaxyMapIntro: 'Galaxy_Map_Intro_en',
      galaxyMapCenter: 'Galaxy_Map_Center_en',
      systemRadialSelect: 'System_Radial_Select_en',
      systemSceneIntro: 'System_Scene_Intro_en',
      exosphereBtnClick: 'Exosphere_Btn_Click_en',
      exosphereSceneExplain: 'Exosphere_Scene_Explain_en',
      academyIntro: 'Academy_Intro_en',
      encyclopediaExplain: 'Encyclopedia_Explain_en',
    };

  if (stepId === 'awakening') return clips.awakening;
  if (stepId === 'terminal') return clips.terminal;
  if (stepId === 'go-systems') return clips.firstChoice;
  if (stepId === 'first-research') return clips.firstScan;
  if (stepId === 'hud-info') return subStepIndex === 1 ? clips.researchData : clips.firstResult;
  if (stepId === 'free-task') return clips.freeTask;
  if (stepId === 'anomaly') return clips.firstDiscovery;
  if (stepId === 'quantum') return clips.quantum;
  if (stepId === 'save-gallery') return clips.firstPhoto;
  if (stepId === 'gallery-final') return clips.gallery;
  if (stepId === 'astra-handoff') return clips.handoff;
  if (stepId === 'astra-chat-tabs') return clips.chatTabs;
  if (stepId === 'astra-chat-close') return clips.chatClose;
  if (stepId === 'galaxy-intro') return clips.galaxyIntro;
  if (stepId === 'cluster-intro') return clips.clusterIntro;
  if (stepId === 'galaxy-map-intro') return clips.galaxyMapIntro;
  if (stepId === 'galaxy-map-center') return clips.galaxyMapCenter;
  if (stepId === 'system-radial-select') return clips.systemRadialSelect;
  if (stepId === 'system-scene-intro') return clips.systemSceneIntro;
  if (stepId === 'exosphere-btn-click') return clips.exosphereBtnClick;
  if (stepId === 'exosphere-scene-explain') return clips.exosphereSceneExplain;
  if (stepId === 'academy-intro') return clips.academyIntro;
  if (stepId === 'encyclopedia-explain') return clips.encyclopediaExplain;
  return null;
}

/* Коментар українською: Пропси для TutorialOverlay з підтримкою згортання */
interface TutorialOverlayProps {
  step: TutorialStepConfig;
  subStepIndex: number;
  onAdvance: () => void;
  onSkip: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  onExpand?: () => void;
}

export function TutorialOverlay({ step, subStepIndex, onAdvance, onSkip, minimized = false, onMinimize, onExpand }: TutorialOverlayProps) {
  const { t, i18n } = useTranslation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voiceFinished, setVoiceFinished] = useState(false);
  const rafRef = useRef<number>(0);
  const prevTargetRef = useRef<string | null>('');
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const marqueeContainerRef = useRef<HTMLDivElement>(null);

  const voiceClip = getAstraVoiceClip(step.id, subStepIndex, i18n.language);

  useEffect(() => {
    setVoiceFinished(!voiceClip);
  }, [step.id, subStepIndex, voiceClip]);

  // Determine current target and text based on sub-steps
  const baseTarget = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.target ?? step.target
    : step.target;

  const currentTarget = (step.id === 'system-radial-select' && !voiceFinished)
    ? null
    : baseTarget;

  const currentText = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.text ?? step.text
    : step.text;

  const currentTooltipPos = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.tooltipPos ?? step.tooltipPos
    : step.tooltipPos;

  const currentNextLabel = step.subSteps && step.subSteps.length > 0
    ? step.subSteps[subStepIndex]?.nextLabel
    : step.nextLabel;

  const isInfoStep = step.type === 'info';
  const isAutoStep = step.type === 'auto';
  const isWaiting = step.waitForTarget && !targetRect;
  const shouldBlockClicks = !isWaiting && (
    targetRect || 
    (!step.target && !voiceFinished) || 
    (step.id === 'system-radial-select' && !voiceFinished)
  );
  const isCompact = typeof window !== 'undefined' && window.innerWidth < 720;
  const isAndroid = typeof window !== 'undefined' && Capacitor.getPlatform() === 'android';
  const ext = isAndroid ? 'webm' : 'mp3';
  const voiceSrc = voiceClip
    ? `/astra/voice/${voiceClip}.${ext}`
    : null;

  useEffect(() => {
    ensureStyles();
  }, []);

  const playVoice = useCallback(() => {
    if (!voiceSrc) return;

    voiceRef.current?.pause();
    const audio = new Audio(voiceSrc);
    audio.preload = 'auto';
    audio.volume = 0.86;
    voiceRef.current = audio;
    setVoicePlaying(true);
    setVoiceFinished(false);
    audio.onended = () => {
      setVoicePlaying(false);
      setVoiceFinished(true);
    };
    audio.onerror = () => {
      setVoicePlaying(false);
      setVoiceFinished(true);
    };
    void audio.play().catch(() => {
      setVoicePlaying(false);
      setVoiceFinished(true);
    });
  }, [voiceSrc]);

  const triggerTargetAndAdvance = useCallback(() => {
    if (currentTarget) {
      const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`) as HTMLElement | null;
      if (el) {
        // Try to find the button or closest button if the targeted element is a child
        const actionable = el.matches('button, [role="button"], a')
          ? el
          : (el.querySelector('button, [role="button"], a') as HTMLElement | null)
            ?? (el.closest('button, [role="button"], a') as HTMLElement | null);
        
        playSfx('ui-click', 0.07);
        (actionable ?? el).click();
      }
    }
    if (step.id === 'save-gallery') return;
    onAdvance();
  }, [currentTarget, onAdvance, step.id]);

  // Unconditionally stop previous voiceover on step or substep change to prevent audio overlapping
  useEffect(() => {
    return () => {
      voiceRef.current?.pause();
      voiceRef.current = null;
      setVoicePlaying(false);
    };
  }, [step.id, subStepIndex]);

  useEffect(() => {
    if (!voiceSrc || isWaiting) return;
    const preload = new Audio(voiceSrc);
    preload.preload = 'auto';
    preload.load();
    playVoice();
    return () => {
      voiceRef.current?.pause();
      voiceRef.current = null;
      setVoicePlaying(false);
    };
  }, [isWaiting, playVoice, voiceSrc]);

  // Synchronized scrolling text effect for single-line ticker steps
  useEffect(() => {
    const audio = voiceRef.current;
    const container = marqueeContainerRef.current;
    if (!audio || !container || !voicePlaying) return;

    let rafId = 0;
    const updateScroll = () => {
      if (audio.duration && audio.duration > 0) {
        const scrollMax = container.scrollWidth - container.clientWidth;
        if (scrollMax > 0) {
          const pct = audio.currentTime / audio.duration;
          container.scrollLeft = scrollMax * pct;
        }
      }
      rafId = requestAnimationFrame(updateScroll);
    };

    rafId = requestAnimationFrame(updateScroll);
    return () => {
      cancelAnimationFrame(rafId);
      if (container) {
        container.scrollLeft = 0;
      }
    };
  }, [voicePlaying, voiceSrc]);

  // Track transitions between targets
  useEffect(() => {
    if (currentTarget !== prevTargetRef.current) {
      setTransitioning(true);
      const t = setTimeout(() => setTransitioning(false), 300);
      prevTargetRef.current = currentTarget;
      return () => clearTimeout(t);
    }
  }, [currentTarget]);

  // Poll for target element position using rAF
  useEffect(() => {
    if (!currentTarget) {
      setTargetRect(null);
      return;
    }

    const poll = () => {
      const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
      rafRef.current = requestAnimationFrame(poll);
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [currentTarget]);

  useEffect(() => {
    if (!currentTarget) return;
    const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`) as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [currentTarget]);

  // Handle click on overlay — check if within spotlight bounds
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (!targetRect) {
        // If there's no targetRect, and we are waiting or there's no target,
        // we let clicks pass through to the screen (controlled by pointerEvents style on the overlay).
        return;
      }

      const { clientX, clientY } = e;
      const pad = 12; // generous padding for clicks
      const inBounds =
        clientX >= targetRect.left - pad &&
        clientX <= targetRect.right + pad &&
        clientY >= targetRect.top - pad &&
        clientY <= targetRect.bottom + pad;

      if (inBounds) {
        // Trigger the underlying element click and advance
        triggerTargetAndAdvance();
      } else {
        // Outside of spotlight bounds: swallow and block the click
        e.stopPropagation();
        e.preventDefault();
      }
    },
    [targetRect, triggerTargetAndAdvance],
  );

  // A.S.T.R.A. panel positioning — side panel on desktop, bottom card on mobile.
  const isNoDimStep = [
    'galaxy-intro',
    'cluster-intro',
    'galaxy-map-intro',
    'galaxy-map-center',
    'system-radial-select',
    'system-scene-intro',
    'exosphere-btn-click',
    'exosphere-scene-explain',
    'academy-intro',
    'encyclopedia-explain',
  ].includes(step.id);

  const isSubtitleStep = ['galaxy-intro', 'cluster-intro', 'galaxy-map-intro', 'system-scene-intro', 'exosphere-scene-explain'].includes(step.id);


  const getAstraPanelStyle = (): React.CSSProperties => {
    if (step.id === 'encyclopedia-explain') {
      return {
        position: 'fixed',
        bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '820px',
        maxHeight: '120px',
        boxSizing: 'border-box',
      };
    }

    if (isNoDimStep) {
      return {
        position: 'fixed',
        top: 'calc(76px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '820px',
        maxHeight: '120px',
        boxSizing: 'border-box',
      };
    }

    if (isSubtitleStep) {
      return {
        position: 'fixed',
        bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 20px)',
        maxWidth: '820px',
        maxHeight: '150px',
      };
    }

    if (isCompact) {
      const targetIsLow = targetRect
        ? targetRect.top + targetRect.height / 2 > window.innerHeight * 0.54
        : false;
      return {
        position: 'fixed',
        left: 10,
        right: 10,
        top: targetIsLow ? 'calc(66px + env(safe-area-inset-top, 0px))' : undefined,
        bottom: targetIsLow ? undefined : 'calc(12px + env(safe-area-inset-bottom, 0px))',
        maxHeight: targetIsLow ? '42vh' : '46vh',
      };
    }

    const panelWidth = 330;
    const rightPanelLeft = window.innerWidth - panelWidth - 14;
    const targetUnderRightPanel = targetRect ? targetRect.right > rightPanelLeft - 12 : false;
    return {
      position: 'fixed',
      top: 'calc(74px + env(safe-area-inset-top, 0px))',
      right: targetUnderRightPanel ? undefined : 14,
      left: targetUnderRightPanel ? 14 : undefined,
      width: panelWidth,
      maxHeight: 'calc(100vh - 108px)',
    };
  };

  // Spotlight style
  const spotlightStyle: React.CSSProperties = targetRect
    ? (() => {
        const pad = 10;
        const minSize = 56;
        const width = Math.max(targetRect.width + pad * 2, minSize);
        const height = Math.max(targetRect.height + pad * 2, minSize);
        const left = targetRect.left + targetRect.width / 2 - width / 2;
        const top = targetRect.top + targetRect.height / 2 - height / 2;
        return {
        position: 'fixed',
        top,
        left,
        width,
        height,
        borderRadius: 8,
        zIndex: 10050,
        pointerEvents: 'none',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0), 0 0 0 3px rgba(123,184,255,0.95), 0 0 22px rgba(123,184,255,0.55)',
        outline: '2px solid rgba(68,255,136,0.85)',
        outlineOffset: 3,
        animation: 'tut-spotlight-pulse-nodim 2s ease-in-out infinite',
        transition: transitioning ? 'top 0.3s, left 0.3s, width 0.3s, height 0.3s' : undefined,
      };
    })()
    : {
        display: 'none',
      };

  const allowsSceneInteraction = step.id === 'cluster-intro';
  const useFourBlockers = targetRect && !isInfoStep && !isAutoStep;

  // Global capture click listener to detect target element clicks naturally
  useEffect(() => {
    if (isInfoStep || isAutoStep || !currentTarget) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const el = document.querySelector(`[data-tutorial-id="${currentTarget}"]`);
      if (el && (el === e.target || el.contains(e.target as Node))) {
        // The target element was clicked!
        // Advance the tutorial!
        setTimeout(() => {
          onAdvance();
        }, 120);
      }
    };

    document.addEventListener('click', handleGlobalClick, true); // capture phase
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [currentTarget, isInfoStep, isAutoStep, onAdvance]);

  if (isWaiting) {
    return null;
  }

  if (minimized) {
    ensureStyles();
    const verticalSideLayout = typeof window !== 'undefined'
      && isVerticalSideChatLayout(window.innerWidth, window.innerHeight);
    return (
      <AstraFabButton
        title={t('tutorial.expand_astra' as any)}
        size={verticalSideLayout ? 48 : 52}
        zIndex={10051}
        style={{
          ...getAstraFabPosition(verticalSideLayout, verticalSideLayout ? 48 : 52),
          animation: 'astra-soft-pulse 2s ease-in-out infinite',
        }}
        onClick={() => {
          playSfx('ui-click', 0.07);
          onExpand?.();
        }}
      />
    );
  }

  return (
    <>
      {/* Коментар українською: Блокувальники кліків - або 4 блоки навколо цілі, або весь екран */}
      {allowsSceneInteraction ? null : useFourBlockers ? (
        <>
          {/* Top Blocker */}
          <div
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); playSfx('ui_click_disabled'); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: Math.max(0, targetRect.top - 10),
              zIndex: 10048,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
          />
          {/* Bottom Blocker */}
          <div
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); playSfx('ui_click_disabled'); }}
            style={{
              position: 'fixed',
              top: targetRect.bottom + 10,
              left: 0,
              width: '100vw',
              height: `calc(100vh - ${targetRect.bottom + 10}px)`,
              zIndex: 10048,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
          />
          {/* Left Blocker */}
          <div
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); playSfx('ui_click_disabled'); }}
            style={{
              position: 'fixed',
              top: Math.max(0, targetRect.top - 10),
              left: 0,
              width: Math.max(0, targetRect.left - 10),
              height: targetRect.height + 20,
              zIndex: 10048,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
          />
          {/* Right Blocker */}
          <div
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); playSfx('ui_click_disabled'); }}
            style={{
              position: 'fixed',
              top: Math.max(0, targetRect.top - 10),
              left: targetRect.right + 10,
              width: `calc(100vw - ${targetRect.right + 10}px)`,
              height: targetRect.height + 20,
              zIndex: 10048,
              pointerEvents: 'auto',
              cursor: 'default',
            }}
          />
        </>
      ) : (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10048,
            cursor: 'default',
            pointerEvents: shouldBlockClicks ? 'auto' : 'none',
          }}
        />
      )}

      {/* Dark overlay with spotlight hole */}
      {targetRect && (
        <div style={spotlightStyle} />
      )}

      {/* Dark backdrop when no spotlight visible (no target or target not found) */}
      {!targetRect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10049,
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* A.S.T.R.A. hologram panel */}
      {isNoDimStep ? (
        <div
          style={{
            ...getAstraPanelStyle(),
            zIndex: 10051,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '10px 14px',
            background: 'linear-gradient(145deg, rgba(5,10,20,0.94), rgba(13,22,36,0.9))',
            border: '1px solid rgba(123,184,255,0.30)',
            borderRadius: 8,
            fontFamily: 'monospace',
            color: '#aabbcc',
            boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 0 24px rgba(123,184,255,0.055)',
            animation: 'astra-panel-enter-mobile 0.4s ease-out',
            pointerEvents: 'auto',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent, rgba(123,184,255,0.18), transparent)',
              animation: 'astra-scan-line 5.4s ease-in-out infinite',
            }}
          />
          <span style={{ ...ASTRA_CORNER, top: 6, left: 6, borderRight: 0, borderBottom: 0 }} />
          <span style={{ ...ASTRA_CORNER, top: 6, right: 6, borderLeft: 0, borderBottom: 0 }} />
          <span style={{ ...ASTRA_CORNER, bottom: 6, left: 6, borderRight: 0, borderTop: 0 }} />
          <span style={{ ...ASTRA_CORNER, bottom: 6, right: 6, borderLeft: 0, borderTop: 0 }} />

          {/* Row 1: Header / Only sound button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 8,
            color: '#667788',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#7bb8ff',
                boxShadow: '0 0 8px rgba(123,184,255,0.65)',
                animation: 'astra-soft-pulse 2s ease-in-out infinite',
              }} />
              <span>{t('tutorial.astra_unit')}</span>
              {voiceSrc && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playVoice();
                  }}
                  title={t('tutorial.astra_voice_replay')}
                  aria-label={t('tutorial.astra_voice_replay')}
                  style={{
                    marginLeft: 6,
                    padding: '2px 6px',
                    border: '1px solid rgba(123,184,255,0.22)',
                    borderRadius: 3,
                    background: voicePlaying ? 'rgba(123,184,255,0.12)' : 'rgba(68,102,136,0.08)',
                    color: '#9cc9ee',
                    cursor: 'pointer',
                    fontSize: 7,
                    lineHeight: 1,
                  }}
                >
                  {voicePlaying ? '||' : '>'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {onMinimize && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSfx('ui-click', 0.07);
                    onMinimize();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7bb8ff',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 8,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    padding: 0,
                    animation: 'astra-soft-pulse 2s ease-in-out infinite',
                  }}
                >
                  [{t('tutorial.only_sound', { defaultValue: 'Only sound' })}]
                </button>
              )}
              <span>{t('tutorial.step_counter', { step: parseInt(String(STEP_NUMBER_MAP[step.id] ?? 0)) + 1, total: TUTORIAL_STEPS.length })}</span>
            </div>
          </div>

          {/* Row 2: Text in exactly one line (animated scrolling ticker) */}
          <div
            ref={marqueeContainerRef}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontSize: 11.5,
              color: '#c1d4e8',
              lineHeight: 1.3,
              margin: '2px 0 4px',
              width: '100%',
            }}
            title={t(currentText)}
          >
            {t(currentText)}
          </div>

          {/* Row 3: Buttons or Hint under it in one line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
          }}>
            {(isInfoStep || isAutoStep) && currentNextLabel ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                  style={{
                    ...ASTRA_BUTTON_STYLE,
                    flex: 1,
                    padding: '5px 0',
                    fontSize: 10,
                  }}
                >
                  {t(currentNextLabel)}
                </button>
                {step.id !== 'astra-handoff' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSkip();
                    }}
                    style={{
                      ...ASTRA_SKIP_BUTTON_STYLE,
                      padding: '5px 12px',
                      fontSize: 9,
                    }}
                  >
                    {t('tutorial.skip')}
                  </button>
                )}
              </>
            ) : (
              <div style={{
                fontSize: 9,
                color: '#88aacc',
                fontStyle: 'italic',
                flex: 1,
                textAlign: 'left',
              }}>
                * {t('tutorial.click_hint')} *
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            ...getAstraPanelStyle(),
            zIndex: 10051,
            display: 'grid',
            gridTemplateColumns: isSubtitleStep ? '72px 1fr' : (isCompact ? '84px 1fr' : '1fr'),
            gap: isSubtitleStep ? 10 : (isCompact ? 10 : 12),
            padding: isSubtitleStep ? '8px 12px' : (isCompact ? '10px 10px 12px' : '12px'),
            background: 'linear-gradient(145deg, rgba(5,10,20,0.94), rgba(13,22,36,0.9))',
            border: '1px solid rgba(123,184,255,0.30)',
            borderRadius: 8,
            fontFamily: 'monospace',
            color: '#aabbcc',
            boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 0 24px rgba(123,184,255,0.055)',
            animation: `${isCompact ? 'astra-panel-enter-mobile' : 'astra-panel-enter'} 0.48s ease-out`,
            pointerEvents: 'auto',
            overflow: isSubtitleStep ? 'hidden' : (isCompact ? 'auto' : 'hidden'),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent, rgba(123,184,255,0.18), transparent)',
              animation: 'astra-scan-line 5.4s ease-in-out infinite',
            }}
          />
          <span style={{ ...ASTRA_CORNER, top: 6, left: 6, borderRight: 0, borderBottom: 0 }} />
          <span style={{ ...ASTRA_CORNER, top: 6, right: 6, borderLeft: 0, borderBottom: 0 }} />
          <span style={{ ...ASTRA_CORNER, bottom: 6, left: 6, borderRight: 0, borderTop: 0 }} />
          <span style={{ ...ASTRA_CORNER, bottom: 6, right: 6, borderLeft: 0, borderTop: 0 }} />

          <div
            style={{
              position: 'relative',
              height: isSubtitleStep ? 72 : (isCompact ? 116 : 250),
              width: isSubtitleStep ? 72 : 'auto',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid rgba(123,184,255,0.22)',
              background: 'rgba(2,5,16,0.72)',
            }}
          >
            {videoFailed ? (
              <img
                src={ASTRA_PORTRAIT_URL}
                alt={t('tutorial.astra_alt')}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: isCompact ? '50% 18%' : '50% 16%',
                  display: 'block',
                  filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
                }}
              />
            ) : (
              <video
                ref={(el) => {
                  if (el) {
                    el.muted = true;
                    el.volume = 0;
                  }
                }}
                src={ASTRA_VIDEO_URL}
                poster={ASTRA_PORTRAIT_URL}
                aria-label={t('tutorial.astra_alt')}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: isCompact ? '50% 18%' : '50% 16%',
                  display: 'block',
                  filter: 'saturate(0.88) contrast(0.95) brightness(0.9)',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(2,5,16,0.02), rgba(2,5,16,0.36))',
                boxShadow: 'inset 0 0 28px rgba(123,184,255,0.10)',
              }}
            />
          </div>

          <div style={{
            position: 'relative',
            minWidth: 0,
            display: isSubtitleStep ? 'flex' : 'block',
            flexDirection: isSubtitleStep ? 'column' : undefined,
            justifyContent: isSubtitleStep ? 'space-between' : undefined,
            height: isSubtitleStep ? '100%' : undefined
          }}>
            {/* Коментар українською: Панель індикатора кроків з кнопкою згортання туторіалу */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: isSubtitleStep ? 4 : 8,
                color: '#667788',
                fontSize: 8,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              <span>{t('tutorial.astra_unit')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {onMinimize && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSfx('ui-click', 0.07);
                      onMinimize();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7bb8ff',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: 8,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      padding: 0,
                      animation: 'astra-soft-pulse 2s ease-in-out infinite',
                    }}
                  >
                    [{t('tutorial.only_sound', { defaultValue: 'Only sound' })}]
                  </button>
                )}
                <span>{t('tutorial.step_counter', { step: parseInt(String(STEP_NUMBER_MAP[step.id] ?? 0)) + 1, total: TUTORIAL_STEPS.length })}</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: isSubtitleStep ? 4 : 10,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                minWidth: 0,
                color: '#7bb8ff',
                fontSize: 9,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#7bb8ff',
                  boxShadow: '0 0 9px rgba(123,184,255,0.65)',
                  animation: 'astra-soft-pulse 2.4s ease-in-out infinite',
                }} />
                {t('tutorial.astra_status')}
              </div>
              {voiceSrc && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playVoice();
                  }}
                  title={t('tutorial.astra_voice_replay')}
                  aria-label={t('tutorial.astra_voice_replay')}
                  style={{
                    width: 28,
                    height: 24,
                    border: '1px solid rgba(123,184,255,0.30)',
                    borderRadius: 4,
                    background: voicePlaying ? 'rgba(123,184,255,0.16)' : 'rgba(68,102,136,0.12)',
                    color: '#9cc9ee',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  {voicePlaying ? '||' : '>'}
                </button>
              )}
            </div>

            {/* Text */}
            <div style={{
              marginBottom: isSubtitleStep ? 4 : (isInfoStep || isAutoStep || (step.type === 'click' && !targetRect) ? 12 : 0),
              color: '#c1d4e8',
              fontSize: isCompact || isSubtitleStep ? 11 : 12,
              lineHeight: isSubtitleStep ? 1.4 : 1.65,
            }}>
              {t(currentText)}
            </div>

            {/* "Next" button for info steps */}
            {(isInfoStep || isAutoStep) && currentNextLabel && (
              <div style={{
                ...ASTRA_ACTION_ROW_STYLE,
                ...(step.id === 'astra-handoff' ? { gridTemplateColumns: '1fr' } : {}),
                gap: isSubtitleStep ? 4 : 8,
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                  style={{
                    ...ASTRA_BUTTON_STYLE,
                    padding: isSubtitleStep ? '4px 0' : '8px 0',
                    fontSize: isSubtitleStep ? 10 : 11,
                  }}
                >
                  {t(currentNextLabel)}
                </button>
                {step.id !== 'astra-handoff' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSkip();
                    }}
                    style={{
                      ...ASTRA_SKIP_BUTTON_STYLE,
                      padding: isSubtitleStep ? '4px 8px' : '8px 10px',
                      fontSize: isSubtitleStep ? 9 : 10,
                    }}
                  >
                    {t('tutorial.skip')}
                  </button>
                )}
              </div>
            )}

            {/* Click hint for click steps */}
            {step.type === 'click' && targetRect && (
              <>
                <div style={{ fontSize: 10, color: '#667788', marginTop: 8, marginBottom: isCompact ? 8 : 0 }}>
                  {t('tutorial.click_hint')}
                </div>
                {isCompact && (
                  <div style={ASTRA_ACTION_ROW_STYLE}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerTargetAndAdvance();
                      }}
                      style={{
                        ...ASTRA_BUTTON_STYLE,
                        borderColor: 'rgba(123,184,255,0.55)',
                        background: 'rgba(68,136,170,0.22)',
                        color: '#d6efff',
                        boxShadow: '0 0 14px rgba(68,136,170,0.18)',
                      }}
                    >
                      {t('tutorial.tap_target')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSkip();
                      }}
                      style={ASTRA_SKIP_BUTTON_STYLE}
                    >
                      {t('tutorial.skip')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Fallback Next button for click steps when element not found */}
            {step.type === 'click' && !targetRect && (
              <div style={ASTRA_ACTION_ROW_STYLE}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                  style={ASTRA_BUTTON_STYLE}
                >
                  {t('tutorial.next')}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip();
                  }}
                  style={ASTRA_SKIP_BUTTON_STYLE}
                >
                  {t('tutorial.skip')}
                </button>
              </div>
            )}
            {step.type === 'click' && targetRect && !isCompact && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                style={{ ...ASTRA_SKIP_BUTTON_STYLE, width: '100%', marginTop: 10 }}
              >
                {t('tutorial.skip')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const ASTRA_CORNER: React.CSSProperties = {
  position: 'absolute',
  width: 16,
  height: 16,
  border: '1px solid rgba(123,184,255,0.42)',
  pointerEvents: 'none',
};

const ASTRA_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 0',
  background: 'rgba(68, 102, 136, 0.18)',
  border: '1px solid rgba(123,184,255,0.34)',
  borderRadius: 4,
  color: '#aaccee',
  fontFamily: 'monospace',
  fontSize: 11,
  letterSpacing: 1,
  cursor: 'pointer',
  textTransform: 'uppercase',
};

const ASTRA_SKIP_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  padding: '8px 10px',
  background: 'rgba(25,15,5,0.72)',
  border: '1px solid rgba(255,136,68,0.52)',
  borderRadius: 4,
  color: '#ffaa66',
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 1,
  cursor: 'pointer',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const ASTRA_ACTION_ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 8,
  alignItems: 'stretch',
};

/** Коментар українською: Мапа номерів кроків туторіалу для коректного відображення лічильника */
const STEP_NUMBER_MAP: Record<string, number> = {
  'awakening': 0,
  'terminal': 1,
  'go-systems': 2,
  'first-research': 3,
  'hud-info': 4,
  'free-task': 5,
  'anomaly': 6,
  'quantum': 7,
  'save-gallery': 8,
  'gallery-final': 9,
  'astra-handoff': 10,
  'astra-chat-tabs': 11,
  'astra-chat-close': 12,
  'galaxy-intro': 13,
  'cluster-intro': 14,
  'galaxy-map-intro': 15,
  'galaxy-map-center': 16,
  'system-radial-select': 17,
  'system-scene-intro': 18,
  'exosphere-btn-click': 19,
  'exosphere-scene-explain': 20,
  'academy-intro': 21,
  'encyclopedia-explain': 22,
};
