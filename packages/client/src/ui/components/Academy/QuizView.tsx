import React, { useState } from 'react';
import { useT } from '../../../i18n/index.js';
import type { DailyLesson } from '../../../api/academy-api.js';
import { answerQuiz } from '../../../api/academy-api.js';

interface QuizViewProps {
  lesson: DailyLesson | null;
  onRefresh: () => void;
}

export function QuizView({ lesson, onRefresh }: QuizViewProps) {
  const { t } = useT();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    correctIndex: number;
    explanation: string;
    xpAwarded: number;
    quarksAwarded: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!lesson) {
    return <div style={styles.empty}>{t('quiz.no_quiz')}</div>;
  }

  const quiz = lesson.quiz;

  const handleAnswer = async (index: number) => {
    if (result) return; // Already answered
    setSelectedIndex(index);
    setSubmitting(true);
    try {
      const res = await answerQuiz(lesson.lessonId, index);
      setResult(res);
      onRefresh();
    } catch (err) {
      console.error('Quiz answer error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{t('quiz.title')}</h2>
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
              ? t('quiz.correct')
                  .replace('{quarks}', String(result.quarksAwarded))
                  .replace('{xp}', String(result.xpAwarded))
              : t('quiz.wrong')}
          </div>
          <p style={styles.explanation}>{result.explanation}</p>
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
