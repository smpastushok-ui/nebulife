import React, { useState, useEffect, useRef } from 'react';
import type { AcademyProgress, DailyLesson } from '../../../api/academy-api.js';
import { answerQuiz } from '../../../api/academy-api.js';
import { playSfx } from '../../../audio/SfxPlayer.js';
import { interstitialManager } from '../../../services/interstitial-manager.js';

function QuarksIcon() {
  return (
    <svg
      width="11" height="11" viewBox="0 0 16 16" fill="none"
      stroke="rgba(120,160,255,0.8)" strokeWidth="1.3"
      style={{ display: 'inline', verticalAlign: 'middle', marginBottom: 1 }}
    >
      <circle cx="8" cy="8" r="2" />
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="7" ry="3" transform="rotate(-60 8 8)" />
    </svg>
  );
}

// Inject XP float keyframes once
const QUIZ_XP_STYLE_ID = 'quiz-xp-float-style';
function injectXpKeyframes() {
  if (document.getElementById(QUIZ_XP_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = QUIZ_XP_STYLE_ID;
  style.textContent = `@keyframes quizXpFloat { 0% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-32px); } }`;
  document.head.appendChild(style);
}

interface QuizViewProps {
  lesson: DailyLesson | null;
  progress: AcademyProgress | null;
  onRefresh: () => void;
  onAwardXP?: (amount: number, reason: string) => void;
}

export function QuizView({ lesson, progress, onRefresh, onAwardXP }: QuizViewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    correctIndex: number;
    explanation: string;
    xpAwarded: number;
    quarksAwarded: number;
    alreadyAnswered?: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const injectedRef = useRef(false);
  const liveAnsweredLessonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!injectedRef.current) { injectXpKeyframes(); injectedRef.current = true; }
  }, []);

  useEffect(() => {
    if (!lesson) {
      setSelectedIndex(null);
      setResult(null);
      return;
    }

    const savedAnswer = progress?.category_progress?.__quiz_answers?.[lesson.lessonId];
    if (savedAnswer && liveAnsweredLessonRef.current === lesson.lessonId) return;
    if (!savedAnswer) {
      setSelectedIndex(null);
      setResult(null);
      liveAnsweredLessonRef.current = null;
      return;
    }

    setSelectedIndex(savedAnswer.answerIndex);
    setResult({
      correct: savedAnswer.correct,
      correctIndex: savedAnswer.correctIndex,
      explanation: savedAnswer.explanation,
      xpAwarded: 0,
      quarksAwarded: 0,
      alreadyAnswered: true,
    });
  }, [lesson, progress]);

  if (!lesson) {
    return <div style={styles.empty}>Немає вікторини на сьогодні.</div>;
  }

  const quiz = lesson.quiz;

  const handleAnswer = async (index: number) => {
    if (result) return; // Already answered
    setSelectedIndex(index);
    setSubmitting(true);
    try {
      const res = await answerQuiz(lesson.lessonId, index);
      liveAnsweredLessonRef.current = lesson.lessonId;
      const answerIndex = res.answerIndex ?? index;
      setSelectedIndex(answerIndex);
      setResult(res);
      if (res.correct) {
        playSfx('quiz-correct', 0.35);
      } else {
        playSfx('quiz-wrong', 0.25);
      }
      // Award XP locally for animation + show float
      if (res.correct && res.xpAwarded > 0 && onAwardXP) {
        onAwardXP(res.xpAwarded, 'quiz_correct');
        playSfx('xp-gain', 0.25);
        setShowXP(true);
        setTimeout(() => setShowXP(false), 2000);
      }
      onRefresh();
      interstitialManager.tryShow();
    } catch (err) {
      console.error('Quiz answer error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...styles.container, position: 'relative' as const }}>
      <h2 style={styles.title}>Вікторина дня</h2>
      <p style={styles.question}>{quiz.question}</p>

      <div style={styles.optionsGrid}>
        {quiz.options.map((opt, i) => {
          let optStyle = styles.option;
          if (result) {
            if (i === result.correctIndex) {
              optStyle = { ...styles.option, ...styles.optionCorrect };
            } else if (i === selectedIndex && !result.correct) {
              optStyle = { ...styles.option, ...styles.optionWrong };
            } else {
              optStyle = { ...styles.option, ...styles.optionDisabled };
            }
          } else if (i === selectedIndex) {
            optStyle = { ...styles.option, ...styles.optionSelected };
          }

          return (
            <button
              key={i}
              style={optStyle}
              onClick={() => handleAnswer(i)}
              disabled={!!result || submitting}
            >
              <span style={styles.optionLetter}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {result && (
        <div style={styles.resultBlock}>
          <div style={result.correct ? styles.resultCorrect : styles.resultWrong}>
            {result.correct
              ? (
                result.alreadyAnswered
                  ? <span>Правильно! Вікторину вже зараховано.</span>
                  : <span>Правильно! +{result.quarksAwarded} <QuarksIcon /> +{result.xpAwarded} XP</span>
              )
              : 'Неправильно'}
          </div>
          <p style={styles.explanation}>{result.explanation}</p>
        </div>
      )}
      {showXP && result && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 16,
          color: '#44ff88',
          fontSize: 20,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textShadow: '0 0 12px rgba(68,255,136,0.6)',
          animation: 'quizXpFloat 2s ease-out forwards',
          pointerEvents: 'none',
        }}>
          +{result.xpAwarded} XP
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 600 },
  empty: { color: '#667788', fontSize: 14, fontFamily: 'monospace', paddingTop: 40, textAlign: 'center' },
  title: { color: '#aabbcc', fontSize: 16, fontFamily: 'monospace', fontWeight: 'normal', marginBottom: 16 },
  question: { color: '#aabbcc', fontSize: 14, fontFamily: 'monospace', lineHeight: 1.6, marginBottom: 20 },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  option: {
    background: 'rgba(10,15,25,0.6)',
    border: '1px solid #334455',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '12px 16px',
    cursor: 'pointer',
    borderRadius: 4,
    textAlign: 'left',
    display: 'flex',
    gap: 8,
    transition: 'all 0.15s',
  },
  optionSelected: {
    borderColor: '#446688',
    background: 'rgba(68,136,170,0.15)',
  },
  optionCorrect: {
    borderColor: '#44ff88',
    background: 'rgba(68,255,136,0.1)',
    color: '#44ff88',
  },
  optionWrong: {
    borderColor: '#cc4444',
    background: 'rgba(204,68,68,0.1)',
    color: '#cc4444',
  },
  optionDisabled: {
    opacity: 0.4,
    cursor: 'default',
  },
  optionLetter: { fontWeight: 'bold', minWidth: 20 },
  resultBlock: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #334455' },
  resultCorrect: { color: '#44ff88', fontSize: 13, fontFamily: 'monospace', marginBottom: 8 },
  resultWrong: { color: '#cc4444', fontSize: 13, fontFamily: 'monospace', marginBottom: 8 },
  explanation: { color: '#8899aa', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.5 },
};
