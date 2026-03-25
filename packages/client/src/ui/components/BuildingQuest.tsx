import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// BuildingQuest — Step-by-step building tutorial on the Surface view
// ---------------------------------------------------------------------------
// Compact HUD panel at bottom-center (above CommandBar) that guides the
// player through their first colony setup after evacuation.
//
// Steps:
//   0. "Build Colony Hub"       — completes when colony_hub placed
//   1. "Drone Explorer ready!"  — info about the drone
//   2. "Send drone to explore"  — completes when drone mode activated
//   3. "Drone reveals fog"      — info about fog + fuel
//   4. "Build Solar Plant"      — completes when solar_plant placed
//   5. Done → hide forever
// ---------------------------------------------------------------------------

const LS_KEY = 'nebulife_building_quest_step';
const STEP_COUNT = 5;

interface QuestStep {
  titleKey: string;
  textKey: string;
  /** 'auto' = auto-advance after delay; 'condition' = waits for external trigger */
  type: 'condition' | 'auto';
  autoDelayMs?: number;
}

const STEPS: QuestStep[] = [
  { titleKey: 'quest.step0_title', textKey: 'quest.step0_desc', type: 'condition' },
  { titleKey: 'quest.step1_title', textKey: 'quest.step1_desc', type: 'auto', autoDelayMs: 6000 },
  { titleKey: 'quest.step2_title', textKey: 'quest.step2_desc', type: 'auto', autoDelayMs: 7000 },
  { titleKey: 'quest.step3_title', textKey: 'quest.step3_desc', type: 'auto', autoDelayMs: 6000 },
  { titleKey: 'quest.step4_title', textKey: 'quest.step4_desc', type: 'condition' },
];

interface BuildingQuestProps {
  /** Current step trigger signals from parent */
  hubBuilt: boolean;
  solarBuilt: boolean;
}

export function BuildingQuest({ hubBuilt, solarBuilt }: BuildingQuestProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved !== null ? Number(saved) : 0;
    } catch { return 0; }
  });
  const [visible, setVisible] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);

  // Persist step
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, String(step)); } catch { /* ignore */ }
  }, [step]);

  // Fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, [step]);

  // Auto-advance for 'auto' steps
  useEffect(() => {
    if (step >= STEPS.length) return;
    const s = STEPS[step];
    if (s.type !== 'auto') return;
    const timer = setTimeout(() => advance(), s.autoDelayMs ?? 4000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Condition-based advancement
  useEffect(() => {
    if (step === 0 && hubBuilt) advance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubBuilt, step]);

  useEffect(() => {
    if (step === 4 && solarBuilt) advance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solarBuilt, step]);

  const advance = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      setStep((prev) => {
        const next = prev + 1;
        if (next >= STEPS.length) {
          setVisible(false);
          try { localStorage.setItem(LS_KEY, String(next)); } catch { /* ignore */ }
        }
        return next;
      });
    }, 300);
  }, []);

  // Done or already completed
  if (!visible || step >= STEPS.length) return null;

  const s = STEPS[step];

  return (
    <div style={{
      position: 'fixed',
      bottom: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      pointerEvents: 'auto',
      opacity: fadeIn ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        background: 'rgba(5,12,25,0.94)',
        border: '1px solid rgba(68,136,170,0.35)',
        borderRadius: 4,
        padding: '10px 16px',
        fontFamily: 'monospace',
        maxWidth: 380,
        minWidth: 280,
      }}>
        {/* Step indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}>
          <span style={{ color: '#44ff88', fontSize: 9, letterSpacing: '0.6px' }}>
            {t('quest.counter', { step: step + 1, total: STEP_COUNT })}
          </span>
          <span style={{ flex: 1 }} />
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 3 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5,
                borderRadius: '50%',
                background: i < step ? '#44ff88' : i === step ? '#4488aa' : '#223344',
              }} />
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ color: '#aaccee', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
          {t(s.titleKey)}
        </div>

        {/* Description */}
        <div style={{ color: '#778899', fontSize: 10, lineHeight: 1.5 }}>
          {t(s.textKey)}
        </div>

        {/* Skip button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            onClick={() => {
              setStep(STEPS.length);
              setVisible(false);
              try { localStorage.setItem(LS_KEY, String(STEPS.length)); } catch { /* ignore */ }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#445566',
              fontSize: 9,
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            {t('quest.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
