import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StarSystem, Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// OnboardingScreen — story intro for new players (4 slides)
// ---------------------------------------------------------------------------

interface OnboardingScreenProps {
  homeInfo: { system: StarSystem; planet: Planet };
  onComplete: () => void;
}

type Slide = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Video placeholder (will be replaced with real <video> later)
// ---------------------------------------------------------------------------
function VideoPlaceholder({ label }: { label: string }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: 720,
      aspectRatio: '16/9',
      background: 'rgba(15,20,35,0.8)',
      border: '1px dashed #334455',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#334455',
      fontFamily: 'monospace',
      fontSize: 12,
      margin: '0 auto',
    }}>
      // {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typewriter — prints lines one by one with per-character animation
// ---------------------------------------------------------------------------
function Typewriter({
  lines,
  onDone,
}: {
  lines: string[];
  onDone: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);
  const doneRef = useRef(false);

  // Skip animation on click/tap
  const handleSkip = useCallback(() => {
    if (doneRef.current) return;
    skipRef.current = true;
    setLineIdx(lines.length);
    setCharIdx(0);
    setDone(true);
    doneRef.current = true;
    onDone();
  }, [lines.length, onDone]);

  useEffect(() => {
    if (skipRef.current) return;

    if (lineIdx >= lines.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        onDone();
      }
      return;
    }

    const currentLine = lines[lineIdx];
    if (charIdx < currentLine.length) {
      // Type next character
      const timer = setTimeout(() => setCharIdx((c) => c + 1), 35);
      return () => clearTimeout(timer);
    } else {
      // Line complete — wait then start next line
      const timer = setTimeout(() => {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [lineIdx, charIdx, lines, onDone]);

  return (
    <div
      onClick={handleSkip}
      style={{ cursor: done ? 'default' : 'pointer', userSelect: 'none' }}
    >
      {lines.map((line, i) => {
        if (i > lineIdx && !skipRef.current) return null;

        const displayedText =
          skipRef.current || i < lineIdx
            ? line
            : line.slice(0, charIdx);

        const showCursor = !done && i === lineIdx;

        return (
          <div
            key={i}
            style={{
              color: '#44ff88',
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: '1.8',
              whiteSpace: 'pre',
            }}
          >
            {displayedText}
            {showCursor && (
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 14,
                  background: '#44ff88',
                  marginLeft: 1,
                  verticalAlign: 'text-bottom',
                  animation: 'onb-blink 0.8s step-end infinite',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function OnboardingScreen({ homeInfo, onComplete }: OnboardingScreenProps) {
  const [slide, setSlide] = useState<Slide>(0);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const { system, planet } = homeInfo;
  const star = system.star;

  // Terminal lines for slide 2 — dynamic per player
  const terminalLines = [
    `> СИСТЕМА: ${star.name}`,
    `> ЗОРЯНИЙ КЛАС: ${star.spectralClass}${star.subType} | ${Math.round(star.temperatureK).toLocaleString()} K`,
    `> ПЛАНЕТА: ${planet.name}`,
    `> ВИЯВЛЕНО ЗАГРОЗУ: астероїд класу Omega`,
    `> ТРАЄКТОРІЯ: зіткнення з домашньою планетою`,
    `> ЧАС ДО УДАРУ: 1 доба`,
    `> СТАТУС: активовано протокол евакуації`,
  ];

  const handleNext = () => {
    if (slide < 3) {
      setSlide((s) => (s + 1) as Slide);
      setTypewriterDone(false);
    }
  };

  const handleComplete = () => {
    setFadeOut(true);
    setTimeout(onComplete, 600);
  };

  // Can advance?
  const canNext =
    slide === 0 || slide === 2 || slide === 3 || (slide === 1 && typewriterDone);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#020510',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.6s ease',
      }}
    >
      {/* Blink animation for cursor */}
      <style>{`
        @keyframes onb-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* Slide indicator */}
      <div style={{
        position: 'absolute',
        top: 24,
        display: 'flex',
        gap: 8,
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: i === slide ? '#44ff88' : '#334455',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Content area */}
      <div style={{
        maxWidth: 760,
        width: '90%',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        {/* ── Slide 0: Catastrophe video ── */}
        {slide === 0 && (
          <>
            <VideoPlaceholder label="CATASTROPHE_VIDEO" />
            <p style={{
              color: '#8899aa',
              fontSize: 13,
              textAlign: 'center',
              lineHeight: '1.6',
              maxWidth: 500,
              margin: 0,
            }}>
              Ваша цивілізація існувала тисячі років серед зірок.
              Але час добігає кінця.
            </p>
          </>
        )}

        {/* ── Slide 1: Awakening — terminal typewriter ── */}
        {slide === 1 && (
          <div style={{
            width: '100%',
            maxWidth: 560,
            background: 'rgba(10,15,25,0.96)',
            border: '1px solid #334455',
            borderRadius: 6,
            padding: '24px 28px',
          }}>
            <div style={{
              color: '#556677',
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              ЦЕНТР УПРАВЛІННЯ МІСІЯМИ
            </div>
            <Typewriter
              lines={terminalLines}
              onDone={() => setTypewriterDone(true)}
            />
            {!typewriterDone && (
              <div style={{
                color: '#445566',
                fontSize: 10,
                marginTop: 16,
                textAlign: 'center',
              }}>
                натисніть щоб пропустити
              </div>
            )}
          </div>
        )}

        {/* ── Slide 2: Mission briefing + video ── */}
        {slide === 2 && (
          <>
            <VideoPlaceholder label="BRIEFING_VIDEO" />
            <div style={{
              color: '#aabbcc',
              fontSize: 13,
              lineHeight: '1.8',
              maxWidth: 500,
              textAlign: 'left',
            }}>
              <div style={{
                color: '#556677',
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                ДИРЕКТИВА ЕВАКУАЦІЇ
              </div>
              <div>Ваша мета:</div>
              <div style={{ paddingLeft: 16, marginTop: 4 }}>
                <div style={{ color: '#44ff88' }}>{'>'} Дослідити сусідні зоряні системи</div>
                <div style={{ color: '#44ff88' }}>{'>'} Знайти придатну для колонізації планету</div>
                <div style={{ color: '#44ff88' }}>{'>'} Запустити Корабель Порятунку з 10 000 пасажирів</div>
              </div>
            </div>
          </>
        )}

        {/* ── Slide 3: Start ── */}
        {slide === 3 && (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}>
            <div style={{
              color: '#aabbcc',
              fontSize: 16,
              lineHeight: '1.6',
              maxWidth: 400,
            }}>
              Доля вашого народу — у ваших руках.
            </div>
            <div style={{
              color: '#667788',
              fontSize: 12,
              lineHeight: '1.6',
              maxWidth: 400,
            }}>
              Ви маєте 1 добу. Кожна хвилина на рахунку.
            </div>
          </div>
        )}
      </div>

      {/* Navigation button */}
      <div style={{
        position: 'absolute',
        bottom: 48,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}>
        {slide < 3 && canNext && (
          <button
            onClick={handleNext}
            style={{
              background: 'rgba(30,60,80,0.6)',
              border: '1px solid #446688',
              borderRadius: 3,
              color: '#aabbcc',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '10px 32px',
              cursor: 'pointer',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(40,80,110,0.7)';
              e.currentTarget.style.borderColor = '#558899';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30,60,80,0.6)';
              e.currentTarget.style.borderColor = '#446688';
            }}
          >
            Далі
          </button>
        )}
        {slide === 3 && (
          <button
            onClick={handleComplete}
            style={{
              background: 'rgba(34,170,68,0.2)',
              border: '1px solid #44ff88',
              borderRadius: 3,
              color: '#44ff88',
              fontFamily: 'monospace',
              fontSize: 13,
              padding: '12px 40px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34,170,68,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(34,170,68,0.2)';
            }}
          >
            Почати місію
          </button>
        )}
      </div>
    </div>
  );
}
