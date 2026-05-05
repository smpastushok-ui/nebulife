import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planet, PlanetReportSummary } from '@nebulife/core';
import { playSfx } from '../../../audio/SfxPlayer.js';

const CHARS_PER_TICK = 3;
const TICK_INTERVAL = 22;
const TYPEWRITER_SFX_VOLUME = 0.01;

function getReportTitleKey(report: PlanetReportSummary): string {
  if (report.missionType === 'surface_landing' || report.missionType === 'drone_recon') return 'mission_report.surface_title';
  return 'mission_report.atmosphere_title';
}

function getFreePhotoKey(report: PlanetReportSummary): string {
  if (report.missionType === 'surface_landing') return 'mission_report.action_rover_photo';
  if (report.missionType === 'drone_recon') return 'mission_report.action_drone_photo';
  if (report.missionType === 'deep_atmosphere_probe') return 'mission_report.action_atmo_probe_photo';
  return 'mission_report.action_probe_photo';
}

export function MissionReportModal({
  planet,
  report,
  reportText,
  alphaCost,
  proceduralSaved,
  proceduralSaving,
  alphaGenerating,
  onProceduralPhoto,
  onAlphaPhoto,
  onClose,
}: {
  planet: Planet;
  report: PlanetReportSummary;
  reportText: string;
  alphaCost: number;
  proceduralSaved?: boolean;
  proceduralSaving?: boolean;
  alphaGenerating?: boolean;
  onProceduralPhoto: () => void;
  onAlphaPhoto: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleText = reportText.slice(0, displayedChars);

  useEffect(() => {
    setDisplayedChars(0);
    setIsComplete(false);
  }, [reportText]);

  useEffect(() => {
    if (displayedChars >= reportText.length) {
      setIsComplete(true);
      return;
    }
    const timer = window.setInterval(() => {
      setDisplayedChars((prev) => {
        const next = Math.min(prev + CHARS_PER_TICK, reportText.length);
        if (next >= reportText.length) {
          window.clearInterval(timer);
          setIsComplete(true);
        }
        return next;
      });
      playSfx('text-massage', TYPEWRITER_SFX_VOLUME);
    }, TICK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [displayedChars, reportText]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayedChars]);

  const skip = () => {
    setDisplayedChars(reportText.length);
    setIsComplete(true);
  };

  return (
    <div
      style={{
        width: 'min(720px, 94vw)',
        maxHeight: '86vh',
        background: 'rgba(8,12,20,0.97)',
        border: '1px solid rgba(123,184,255,0.42)',
        borderRadius: 8,
        color: '#aabbcc',
        fontFamily: 'monospace',
        boxShadow: '0 18px 50px rgba(0,0,0,0.65), inset 0 0 42px rgba(20,55,85,0.22)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(68,102,136,0.28)' }}>
        <div style={{ color: '#7bb8ff', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          {t(getReportTitleKey(report))}
        </div>
        <div style={{ color: '#ddeeff', fontSize: 17, letterSpacing: 1.5 }}>
          {planet.name}
        </div>
        <div style={{ color: '#667788', fontSize: 10, marginTop: 4 }}>
          {t('mission_report.tier_line', { tier: report.revealLevel })}
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 180,
          maxHeight: '48vh',
          padding: '16px 18px',
          fontSize: 12,
          lineHeight: 1.7,
          color: '#99aabb',
          whiteSpace: 'pre-wrap',
        }}
      >
        {visibleText}
        {!isComplete && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 14,
              background: '#7bb8ff',
              marginLeft: 2,
              animation: 'missionReportBlink 0.7s step-end infinite',
              verticalAlign: 'text-bottom',
            }}
          />
        )}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid rgba(68,102,136,0.28)', display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
          <button
            type="button"
            disabled={!isComplete || proceduralSaving || proceduralSaved}
            onClick={onProceduralPhoto}
            style={{
              background: proceduralSaved ? 'rgba(68,255,136,0.10)' : 'rgba(20,30,45,0.75)',
              border: `1px solid ${proceduralSaved ? '#44aa77' : '#446688'}`,
              borderRadius: 4,
              color: !isComplete ? '#445566' : proceduralSaved ? '#88ffbb' : '#9fd0ff',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '10px 12px',
              cursor: !isComplete || proceduralSaving || proceduralSaved ? 'not-allowed' : 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {proceduralSaved ? t('mission_report.photo_saved') : proceduralSaving ? t('mission_report.photo_saving') : t(getFreePhotoKey(report))}
            </div>
            <div style={{ marginTop: 4, color: '#667788', fontSize: 9 }}>
              {t('mission_report.procedural_photo_desc')}
            </div>
          </button>

          <button
            type="button"
            disabled={!isComplete || alphaGenerating}
            onClick={onAlphaPhoto}
            style={{
              background: 'rgba(45,30,15,0.72)',
              border: '1px solid rgba(221,170,68,0.55)',
              borderRadius: 4,
              color: !isComplete ? '#554422' : '#ddaa44',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '10px 12px',
              cursor: !isComplete || alphaGenerating ? 'not-allowed' : 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {alphaGenerating ? t('planet.photo_generating') : t('mission_report.action_alpha_photo', { cost: alphaCost })}
            </div>
            <div style={{ marginTop: 4, color: '#886622', fontSize: 9 }}>
              {t('mission_report.alpha_photo_desc')}
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          {!isComplete ? (
            <button
              type="button"
              onClick={skip}
              style={{
                background: 'transparent',
                border: '1px solid #334455',
                borderRadius: 3,
                color: '#667788',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: '7px 14px',
                cursor: 'pointer',
              }}
            >
              {t('common.skip')} &raquo;
            </button>
          ) : <div />}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(68,136,170,0.14)',
              border: '1px solid rgba(123,184,255,0.46)',
              borderRadius: 3,
              color: '#9fd0ff',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '7px 14px',
              cursor: 'pointer',
            }}
          >
            {t('common.proceed')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes missionReportBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
