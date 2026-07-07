import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideoAudioFocus } from '../../audio/useVideoAudioFocus.js';

interface AlphaSignalPromoModalProps {
  onClose: () => void;
  onQuarksClick: () => void;
  onAlphaPassClick: () => void;
  videoSrc?: string;
  /**
   * H.264/AAC MP4 fallback source. WKWebView on iOS has known gaps and
   * intermittent bugs playing WebM/VP9, so `videoSrc` (WebM) is offered
   * first and the browser falls back to this MP4 source if it can't play it.
   */
  videoFallbackSrc?: string;
}

const DEFAULT_VIDEO = '/astra/astra-video.mp4';

export function AlphaSignalPromoModal({
  onClose,
  onQuarksClick,
  onAlphaPassClick,
  videoSrc = DEFAULT_VIDEO,
  videoFallbackSrc,
}: AlphaSignalPromoModalProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  // 'gate': "incoming transmission" screen with a launch button, no playback
  // yet. 'video': playback started, unmuted, from the click itself.
  //
  // Browsers only allow unmuted autoplay from within the synchronous call
  // stack of a real user gesture (a click), never from a timer. The previous
  // version auto-started playback from a setTimeout, so browsers either
  // silently played it back muted or blocked it outright — which is exactly
  // why testers reported "plays fine, but no sound". Gating playback behind
  // this explicit button and calling video.play() directly in the click
  // handler (see handleLaunch) gives us a real user gesture, so audio is
  // reliably unlocked — no `muted` attribute needed or wanted here.
  const [phase, setPhase] = useState<'gate' | 'video'>('gate');
  const [needsTap, setNeedsTap] = useState(false);
  const [ended, setEnded] = useState(false);
  const { enterVideoFocus, exitVideoFocus } = useVideoAudioFocus();

  const handleLaunch = () => {
    setPhase('video');
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    // <source> children don't get picked up by an already-loaded <video>;
    // force the resource-selection algorithm to re-run for this src pair.
    video.load();
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => setNeedsTap(true));
    }
  };

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
  };

  const handleAction = (action: () => void) => {
    exitVideoFocus();
    onClose();
    action();
  };

  return (
    <div className="alphaSignalBackdrop" role="dialog" aria-modal="true" aria-label={t('alpha_signal.title')}>
      <style>{styles}</style>
      <div className="alphaSignalStars" />
      <div className="alphaSignalShell">
        <div className="alphaSignalFrame">
          <div className="alphaSignalTop">
            <div>
              <div className="alphaSignalKicker">{t('alpha_signal.kicker')}</div>
              <div className="alphaSignalTitle">{t('alpha_signal.title')}</div>
            </div>
            <button
              type="button"
              className="alphaSignalClose"
              onClick={() => {
                exitVideoFocus();
                onClose();
              }}
              aria-label={t('alpha_signal.close')}
            >
              x
            </button>
          </div>

          <div className="alphaSignalVideoBox">
            <span className="alphaCorner topLeft" />
            <span className="alphaCorner topRight" />
            <span className="alphaCorner bottomLeft" />
            <span className="alphaCorner bottomRight" />

            {phase === 'gate' && (
              <div className="alphaSignalNoise">
                <div className="alphaSignalSweep" />
                <div className="alphaSignalStatus">{t('alpha_signal.receiving')}</div>
                <button type="button" className="alphaSignalLaunchBtn" onClick={handleLaunch}>
                  <span className="alphaSignalLaunchIcon" aria-hidden="true" />
                  {t('alpha_signal.launch_cta')}
                </button>
                <div className="alphaSignalLaunchHint">{t('alpha_signal.launch_hint')}</div>
              </div>
            )}

            <video
              ref={videoRef}
              className="alphaSignalVideo"
              playsInline
              preload="auto"
              controls={false}
              onPlay={enterVideoFocus}
              onPause={exitVideoFocus}
              onEnded={() => { setEnded(true); exitVideoFocus(); }}
              style={{ opacity: phase === 'video' ? 1 : 0 }}
            >
              {videoSrc.endsWith('.webm') && <source src={videoSrc} type="video/webm" />}
              {!videoSrc.endsWith('.webm') && <source src={videoSrc} type="video/mp4" />}
              {videoFallbackSrc && <source src={videoFallbackSrc} type="video/mp4" />}
            </video>

            {needsTap && phase === 'video' && (
              <button type="button" className="alphaSignalTap" onClick={handleManualPlay}>
                {t('alpha_signal.tap_to_play')}
              </button>
            )}
          </div>

          <div className="alphaSignalCopy">
            <div className="alphaSignalLine">{ended ? t('alpha_signal.complete') : t('alpha_signal.body')}</div>
            <div className="alphaSignalSubline">{t('alpha_signal.subline')}</div>
          </div>

          <div className="alphaSignalActions">
            <button type="button" className="alphaSignalBtn quarks" onClick={() => handleAction(onQuarksClick)}>
              <QuarkIcon />
              {t('alpha_signal.quarks_cta')}
            </button>
            <button type="button" className="alphaSignalBtn pass" onClick={() => handleAction(onAlphaPassClick)}>
              {t('alpha_signal.pass_cta')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuarkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

const styles = `
.alphaSignalBackdrop {
  position: fixed;
  inset: 0;
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
  background:
    radial-gradient(circle at 50% 18%, rgba(123,184,255,0.16), transparent 34%),
    radial-gradient(circle at 15% 80%, rgba(221,170,68,0.08), transparent 26%),
    rgba(0,0,0,0.78);
  color: #aabbcc;
  font-family: monospace;
  pointer-events: auto;
}
.alphaSignalStars {
  position: absolute;
  inset: 0;
  opacity: 0.45;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(170,187,204,0.75) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(123,184,255,0.48) 0 1px, transparent 1.4px);
  background-size: 91px 91px, 137px 137px;
  animation: alphaStarDrift 18s linear infinite;
}
.alphaSignalShell {
  position: relative;
  width: min(430px, 92vw);
  height: min(80dvh, 760px);
  min-height: 520px;
  display: flex;
}
.alphaSignalFrame {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(221,170,68,0.58);
  background:
    linear-gradient(180deg, rgba(10,15,25,0.98), rgba(4,8,16,0.98)),
    #020510;
  box-shadow:
    0 22px 70px rgba(0,0,0,0.82),
    0 0 0 1px rgba(123,184,255,0.14),
    inset 0 0 46px rgba(221,170,68,0.08);
  overflow: hidden;
}
.alphaSignalFrame::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(221,170,68,0.28), transparent) 0 0 / 100% 1px no-repeat,
    repeating-linear-gradient(0deg, transparent 0 3px, rgba(123,184,255,0.025) 3px 4px);
}
.alphaSignalTop {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.alphaSignalKicker {
  color: #ddaa44;
  font-size: 9px;
  letter-spacing: 2.6px;
  text-transform: uppercase;
}
.alphaSignalTitle {
  margin-top: 4px;
  color: #ddeeff;
  font-size: 15px;
  letter-spacing: 1.2px;
}
.alphaSignalClose {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid rgba(102,119,136,0.75);
  background: rgba(5,10,20,0.84);
  color: #8899aa;
  font-family: monospace;
  cursor: pointer;
}
.alphaSignalVideoBox {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  aspect-ratio: 9 / 16;
  max-height: calc(80dvh - 150px);
  align-self: center;
  border-radius: 8px;
  border: 1px solid rgba(123,184,255,0.36);
  background: #020510;
  overflow: hidden;
  box-shadow:
    0 0 38px rgba(68,136,170,0.18),
    inset 0 0 34px rgba(0,0,0,0.75);
}
.alphaSignalVideo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #020510;
  transition: opacity 220ms ease;
}
.alphaSignalNoise {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  text-align: center;
  background:
    repeating-linear-gradient(0deg, rgba(123,184,255,0.12) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, rgba(221,170,68,0.08) 0 1px, transparent 1px 9px),
    radial-gradient(circle at 50% 45%, rgba(123,184,255,0.16), transparent 45%),
    #020510;
  animation: alphaNoise 0.14s steps(2) infinite;
}
.alphaSignalSweep {
  position: absolute;
  top: -18%;
  left: -12%;
  width: 124%;
  height: 22%;
  background: linear-gradient(180deg, transparent, rgba(123,184,255,0.36), transparent);
  filter: blur(2px);
  animation: alphaSweep 2.6s ease-in-out infinite;
}
.alphaSignalStatus {
  color: #7bb8ff;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 0 0 16px rgba(123,184,255,0.7);
}
.alphaSignalLaunchBtn {
  position: relative;
  z-index: 4;
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 13px 22px;
  border-radius: 6px;
  border: 1px solid rgba(255,204,102,0.78);
  background: linear-gradient(180deg, rgba(90,58,14,0.96), rgba(38,24,6,0.96));
  box-shadow: 0 0 26px rgba(221,170,68,0.32), inset 0 0 20px rgba(255,204,102,0.1);
  color: #ffe0a0;
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.alphaSignalLaunchIcon {
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 9px solid #ffe0a0;
}
.alphaSignalLaunchHint {
  position: relative;
  z-index: 4;
  margin-top: 10px;
  color: #8899aa;
  font-size: 9px;
  letter-spacing: 1px;
  text-align: center;
  max-width: 82%;
}
.alphaSignalTap {
  position: absolute;
  inset: auto 18px 18px;
  z-index: 4;
  border: 1px solid rgba(123,184,255,0.6);
  background: rgba(5,10,20,0.88);
  color: #cfe4ff;
  border-radius: 4px;
  padding: 10px 12px;
  font-family: monospace;
}
.alphaCorner {
  position: absolute;
  z-index: 3;
  width: 22px;
  height: 22px;
  border-color: rgba(221,170,68,0.85);
  pointer-events: none;
}
.topLeft { top: 8px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.topRight { top: 8px; right: 8px; border-top: 1px solid; border-right: 1px solid; }
.bottomLeft { bottom: 8px; left: 8px; border-bottom: 1px solid; border-left: 1px solid; }
.bottomRight { bottom: 8px; right: 8px; border-bottom: 1px solid; border-right: 1px solid; }
.alphaSignalCopy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 5px;
  text-align: center;
}
.alphaSignalLine {
  color: #c6d6e6;
  font-size: 11px;
  line-height: 1.45;
}
.alphaSignalSubline {
  color: #667788;
  font-size: 9px;
  line-height: 1.35;
}
.alphaSignalActions {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.alphaSignalBtn {
  min-height: 44px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.alphaSignalBtn.quarks {
  border: 1px solid rgba(123,184,255,0.65);
  color: #b9dcff;
  background: rgba(8,20,34,0.92);
}
.alphaSignalBtn.pass {
  border: 1px solid rgba(255,204,102,0.78);
  color: #ffe0a0;
  background: linear-gradient(180deg, rgba(90,58,14,0.96), rgba(38,24,6,0.96));
  box-shadow: 0 0 22px rgba(221,170,68,0.28), inset 0 0 20px rgba(255,204,102,0.1);
}
@media (max-width: 520px) {
  .alphaSignalBackdrop { padding-left: 10px; padding-right: 10px; }
  .alphaSignalShell { width: min(380px, 94vw); height: min(80dvh, 690px); min-height: 500px; }
  .alphaSignalFrame { padding: 12px; gap: 9px; }
  .alphaSignalTitle { font-size: 13px; }
  .alphaSignalLine { font-size: 10px; }
  .alphaSignalBtn { font-size: 11px; min-height: 42px; }
}
@keyframes alphaStarDrift {
  from { background-position: 0 0, 0 0; }
  to { background-position: 91px 91px, -137px 137px; }
}
@keyframes alphaNoise {
  0% { transform: translate(0, 0); opacity: 0.85; }
  50% { transform: translate(1px, -1px); opacity: 1; }
  100% { transform: translate(-1px, 1px); opacity: 0.8; }
}
@keyframes alphaSweep {
  from { transform: translateY(0); opacity: 0; }
  18% { opacity: 1; }
  to { transform: translateY(560%); opacity: 0; }
}
`;
