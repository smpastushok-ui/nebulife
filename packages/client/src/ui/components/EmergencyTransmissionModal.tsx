import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildYouTubeEmbedUrl,
  type EmergencyTransmissionEpisode,
} from '../../services/emergency-transmission-manager.js';

interface EmergencyTransmissionModalProps {
  episode: EmergencyTransmissionEpisode;
  onClose: () => void;
}

export function EmergencyTransmissionModal({ episode, onClose }: EmergencyTransmissionModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'signal' | 'video'>('signal');
  const embedUrl = useMemo(() => buildYouTubeEmbedUrl(episode.youtubeId), [episode.youtubeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase('video'), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="emergencyTransmissionBackdrop" role="dialog" aria-modal="true" aria-label={t('emergency_transmission.title')}>
      <style>{styles}</style>
      <div className="emergencyTransmissionStars" />
      <div className="emergencyTransmissionShell">
        <div className="emergencyTransmissionFrame">
          <div className="emergencyTransmissionHeader">
            <div>
              <div className="emergencyTransmissionKicker">{t('emergency_transmission.kicker')}</div>
              <div className="emergencyTransmissionTitle">{t('emergency_transmission.title')}</div>
            </div>
            <button
              type="button"
              className="emergencyTransmissionClose"
              onClick={onClose}
              aria-label={t('emergency_transmission.close')}
            >
              x
            </button>
          </div>

          <div className="emergencyTransmissionVideoBox">
            <span className="emergencyCorner topLeft" />
            <span className="emergencyCorner topRight" />
            <span className="emergencyCorner bottomLeft" />
            <span className="emergencyCorner bottomRight" />

            {phase === 'signal' && (
              <div className="emergencyTransmissionNoise">
                <div className="emergencyTransmissionSweep" />
                <div className="emergencyTransmissionStatus">{t('emergency_transmission.receiving')}</div>
              </div>
            )}

            {phase === 'video' && (
              <iframe
                className="emergencyTransmissionIframe"
                src={embedUrl}
                title={episode.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen={false}
              />
            )}
          </div>

          <div className="emergencyTransmissionCopy">
            <div className="emergencyTransmissionEpisode">{episode.title}</div>
            <div className="emergencyTransmissionSummary">{episode.summary}</div>
            <div className="emergencyTransmissionHint">{t('emergency_transmission.autoplay_hint')}</div>
          </div>

          <button type="button" className="emergencyTransmissionAck" onClick={onClose}>
            {t('emergency_transmission.ack')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = `
.emergencyTransmissionBackdrop {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
  background:
    radial-gradient(circle at 50% 20%, rgba(204,68,68,0.15), transparent 32%),
    radial-gradient(circle at 20% 82%, rgba(68,136,170,0.12), transparent 28%),
    rgba(0,0,0,0.78);
  color: #aabbcc;
  font-family: monospace;
  pointer-events: auto;
}
.emergencyTransmissionStars {
  position: absolute;
  inset: 0;
  opacity: 0.38;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(170,187,204,0.7) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(238,102,85,0.44) 0 1px, transparent 1.4px);
  background-size: 83px 83px, 149px 149px;
  animation: emergencyStarDrift 20s linear infinite;
}
.emergencyTransmissionShell {
  position: relative;
  width: min(430px, 93vw);
  height: min(82dvh, 780px);
  min-height: 530px;
  display: flex;
}
.emergencyTransmissionFrame {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(238,102,85,0.62);
  background:
    linear-gradient(180deg, rgba(12,15,23,0.98), rgba(4,8,16,0.98)),
    #020510;
  box-shadow:
    0 22px 70px rgba(0,0,0,0.82),
    0 0 0 1px rgba(123,184,255,0.12),
    inset 0 0 48px rgba(204,68,68,0.1);
  overflow: hidden;
}
.emergencyTransmissionFrame::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(238,102,85,0.32), transparent) 0 0 / 100% 1px no-repeat,
    repeating-linear-gradient(0deg, transparent 0 3px, rgba(123,184,255,0.026) 3px 4px);
}
.emergencyTransmissionHeader {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.emergencyTransmissionKicker {
  color: #ee6655;
  font-size: 9px;
  letter-spacing: 2.6px;
  text-transform: uppercase;
}
.emergencyTransmissionTitle {
  margin-top: 4px;
  color: #ddeeff;
  font-size: 15px;
  letter-spacing: 1.2px;
}
.emergencyTransmissionClose {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid rgba(102,119,136,0.75);
  background: rgba(5,10,20,0.84);
  color: #8899aa;
  font-family: monospace;
  cursor: pointer;
}
.emergencyTransmissionVideoBox {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  aspect-ratio: 9 / 16;
  max-height: calc(82dvh - 170px);
  align-self: center;
  border-radius: 8px;
  border: 1px solid rgba(238,102,85,0.38);
  background: #020510;
  overflow: hidden;
  box-shadow:
    0 0 38px rgba(204,68,68,0.2),
    inset 0 0 34px rgba(0,0,0,0.75);
}
.emergencyTransmissionIframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: #020510;
}
.emergencyTransmissionNoise {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    repeating-linear-gradient(0deg, rgba(238,102,85,0.13) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, rgba(123,184,255,0.08) 0 1px, transparent 1px 9px),
    radial-gradient(circle at 50% 45%, rgba(238,102,85,0.16), transparent 45%),
    #020510;
  animation: emergencyNoise 0.14s steps(2) infinite;
}
.emergencyTransmissionSweep {
  position: absolute;
  top: -18%;
  left: -12%;
  width: 124%;
  height: 22%;
  background: linear-gradient(180deg, transparent, rgba(238,102,85,0.36), transparent);
  filter: blur(2px);
  animation: emergencySweep 1s ease-out forwards;
}
.emergencyTransmissionStatus {
  color: #ee6655;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 16px rgba(238,102,85,0.7);
}
.emergencyCorner {
  position: absolute;
  z-index: 3;
  width: 22px;
  height: 22px;
  border-color: rgba(238,102,85,0.88);
  pointer-events: none;
}
.topLeft { top: 8px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.topRight { top: 8px; right: 8px; border-top: 1px solid; border-right: 1px solid; }
.bottomLeft { bottom: 8px; left: 8px; border-bottom: 1px solid; border-left: 1px solid; }
.bottomRight { bottom: 8px; right: 8px; border-bottom: 1px solid; border-right: 1px solid; }
.emergencyTransmissionCopy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 5px;
  text-align: center;
}
.emergencyTransmissionEpisode {
  color: #ddeeff;
  font-size: 12px;
  line-height: 1.45;
}
.emergencyTransmissionSummary {
  color: #8899aa;
  font-size: 10px;
  line-height: 1.45;
}
.emergencyTransmissionHint {
  color: #667788;
  font-size: 9px;
  line-height: 1.35;
}
.emergencyTransmissionAck {
  position: relative;
  z-index: 1;
  min-height: 42px;
  border-radius: 5px;
  border: 1px solid rgba(123,184,255,0.62);
  background: rgba(8,20,34,0.92);
  color: #b9dcff;
  font-family: monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  cursor: pointer;
}
@media (max-width: 520px) {
  .emergencyTransmissionBackdrop { padding-left: 10px; padding-right: 10px; }
  .emergencyTransmissionShell { width: min(380px, 94vw); height: min(82dvh, 710px); min-height: 510px; }
  .emergencyTransmissionFrame { padding: 12px; gap: 9px; }
  .emergencyTransmissionTitle { font-size: 13px; }
  .emergencyTransmissionEpisode { font-size: 11px; }
  .emergencyTransmissionSummary { font-size: 9px; }
}
@keyframes emergencyStarDrift {
  from { background-position: 0 0, 0 0; }
  to { background-position: 83px 83px, -149px 149px; }
}
@keyframes emergencyNoise {
  0% { transform: translate(0, 0); opacity: 0.85; }
  50% { transform: translate(1px, -1px); opacity: 1; }
  100% { transform: translate(-1px, 1px); opacity: 0.8; }
}
@keyframes emergencySweep {
  from { transform: translateY(0); opacity: 0; }
  18% { opacity: 1; }
  to { transform: translateY(560%); opacity: 0; }
}
`;
