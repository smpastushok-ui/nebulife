import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, Star } from '@nebulife/core';
import {
  mountTerraformGlobe,
  TERRAFORM_CUTSCENE_DURATION_MS,
  type TerraformPhaseId,
  type TerraformGlobeInstance,
} from '../../../game/rendering/TerraformGlobe.js';
import { playSfx } from '../../../audio/SfxPlayer.js';

export interface TerraformCompletionPayload {
  before: Planet;
  after: Planet;
  star: Star;
}

interface TerraformCutsceneProps {
  payload: TerraformCompletionPayload;
  xpReward: number;
  onComplete: () => void;
}

function typeLabel(type: Planet['type'], t: ReturnType<typeof useTranslation>['t']): string {
  return t(`planet.${type}`, { defaultValue: type.replace('-', ' ') });
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function TerraformCutscene({
  payload,
  xpReward,
  onComplete,
}: TerraformCutsceneProps): React.ReactElement {
  const { t } = useTranslation();
  const globeRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<TerraformGlobeInstance | null>(null);
  const completedRef = useRef(false);
  const [phase, setPhase] = useState<TerraformPhaseId>('magnetosphere');
  const [progress, setProgress] = useState(0);
  const biosphereSfxPlayedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    instanceRef.current?.dispose();
    instanceRef.current = null;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    playSfx('research-complete-all', 0.7);
    const timer = window.setTimeout(finish, TERRAFORM_CUTSCENE_DURATION_MS + 550);
    return () => window.clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    const el = globeRef.current;
    if (!el) return;
    instanceRef.current?.dispose();
    instanceRef.current = mountTerraformGlobe({
      container: el,
      before: payload.before,
      after: payload.after,
      star: payload.star,
      onPhase: (nextPhase, nextProgress) => {
        setPhase(nextPhase);
        setProgress(nextProgress);
        if (!biosphereSfxPlayedRef.current && (nextPhase === 'biosphere' || nextPhase === 'clouds' || nextPhase === 'complete')) {
          biosphereSfxPlayedRef.current = true;
          playSfx('colony-founded', 0.5);
        }
      },
    });
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, [payload.after, payload.before, payload.star]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const percent = Math.round(95 + clamp01(progress) * 5);
  const typeText = useMemo(() => {
    const beforeType = typeLabel(payload.before.type, t);
    const afterType = typeLabel(payload.after.type, t);
    return beforeType === afterType
      ? afterType
      : t('terraform.cutscene.type_change', { before: beforeType, after: afterType });
  }, [payload.after.type, payload.before.type, t]);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 30000,
    fontFamily: 'monospace',
    color: '#aabbcc',
    background: 'radial-gradient(circle at 50% 38%, rgba(36,72,92,0.34), rgba(2,5,16,0.98) 58%, #020510 100%)',
    overflow: 'hidden',
  };

  const starfieldStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: [
      'radial-gradient(circle at 12% 18%, rgba(123,184,255,0.55) 0 1px, transparent 2px)',
      'radial-gradient(circle at 72% 12%, rgba(255,255,255,0.45) 0 1px, transparent 2px)',
      'radial-gradient(circle at 34% 78%, rgba(170,187,204,0.4) 0 1px, transparent 2px)',
      'radial-gradient(circle at 88% 63%, rgba(123,184,255,0.38) 0 1px, transparent 2px)',
    ].join(','),
    opacity: 0.75,
  };

  const chromeStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(env(safe-area-inset-bottom, 0px) + 26px)',
    boxSizing: 'border-box',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  };

  const progressTrackStyle: React.CSSProperties = {
    width: 'min(520px, 82vw)',
    height: 6,
    margin: '10px auto 0',
    borderRadius: 3,
    background: 'rgba(34,51,68,0.72)',
    overflow: 'hidden',
    boxShadow: '0 0 18px rgba(68,255,136,0.12)',
  };

  return (
    <div style={overlayStyle} onClick={finish} role="dialog" aria-modal="true" aria-label={t('terraform.cutscene.title')}>
      <div style={starfieldStyle} />
      <div style={chromeStyle}>
        <header style={headerStyle}>
          <div style={{ fontSize: 10, color: '#44ff88', marginBottom: 8 }}>
            {t('terraform.cutscene.eyebrow')}
          </div>
          <div style={{ fontSize: 'clamp(18px, 4vw, 34px)', color: '#ddeeff', textShadow: '0 0 18px rgba(123,184,255,0.35)' }}>
            {payload.after.name}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#7bb8ff' }}>
            {typeText}
          </div>
        </header>

        <main style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: 0,
          position: 'relative',
        }}>
          <div
            ref={globeRef}
            style={{
              width: 'min(86vw, 820px)',
              height: 'min(58vh, 560px)',
              minHeight: 320,
              borderRadius: 12,
              overflow: 'hidden',
              filter: 'drop-shadow(0 0 38px rgba(68,136,170,0.42))',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '7%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(620px, 88vw)',
            textAlign: 'center',
            background: 'rgba(5,10,20,0.72)',
            border: '1px solid rgba(68,136,170,0.45)',
            borderRadius: 6,
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          }}>
            <div style={{ fontSize: 11, color: '#aabbcc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t(`terraform.cutscene.phase.${phase}`)}
            </div>
            <div style={progressTrackStyle}>
              <div style={{
                height: '100%',
                width: `${percent}%`,
                background: 'linear-gradient(90deg, #4488aa, #44ff88)',
                borderRadius: 3,
                transition: 'width 0.15s linear',
              }} />
            </div>
            <div style={{ marginTop: 7, fontSize: 18, color: '#44ff88' }}>
              {t('terraform.cutscene.progress', { pct: percent })}
            </div>
          </div>
        </main>

        <footer style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          <span style={{ color: '#44ff88' }}>{t('terraform.cutscene.complete')}</span>
          <span style={{ color: '#ff8844' }}>{t('terraform.cutscene.xp', { xp: xpReward.toLocaleString() })}</span>
          <span style={{ color: '#667788' }}>{t('terraform.cutscene.skip')}</span>
        </footer>
      </div>
    </div>
  );
}
