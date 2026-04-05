import React, { useState } from 'react';
import type { AcademyProgress, DailyLesson } from '../../../api/academy-api.js';
import { completeQuest } from '../../../api/academy-api.js';

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

interface QuestViewProps {
  lesson: DailyLesson | null;
  progress: AcademyProgress | null;
  onRefresh: () => void;
  onNavigateToGalaxy: () => void;
}

const QUEST_TYPE_LABELS: Record<string, string> = {
  knowledge: 'Знання',
  observation: 'Спостереження',
  exploration: 'Дослідження',
  calculation: 'Обчислення',
  photo: 'Телеметрія',
};

export function QuestView({ lesson, progress, onRefresh, onNavigateToGalaxy }: QuestViewProps) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!lesson) {
    return <div style={styles.empty}>Немає активного квесту.</div>;
  }

  const quest = lesson.quest;
  const isActive = !!(progress?.active_quest);
  const isCompleted = progress?.last_quest_date === new Date().toISOString().slice(0, 10)
    && (progress?.total_quests_completed ?? 0) > 0;

  const handleSubmitCalculation = async () => {
    const num = parseFloat(answer);
    if (isNaN(num)) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await completeQuest(lesson.lessonId, num);
      if (result.correct) {
        setFeedback(`Правильно! +${result.quarksAwarded}⚛ +${result.xpAwarded} XP`);
        onRefresh();
      } else {
        setFeedback(result.message ?? 'Неправильно, спробуйте ще.');
      }
    } catch (err) {
      console.error('Quest submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.typeBadge}>
          {QUEST_TYPE_LABELS[quest.type] ?? quest.type}
        </span>
        <h2 style={styles.title}>{quest.titleUk}</h2>
      </div>

      <p style={styles.description}>{quest.descriptionUk}</p>

      <div style={styles.rewardRow}>
        <span style={styles.reward}>+{quest.quarkReward} <QuarksIcon /></span>
        <span style={styles.reward}>+{quest.xpReward} XP</span>
      </div>

      {/* Action area based on quest type */}
      <div style={styles.actionArea}>
        {quest.type === 'calculation' && (
          <div style={styles.calcInput}>
            <input
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Ваша відповідь..."
              style={styles.input}
            />
            <button
              style={styles.submitButton}
              onClick={handleSubmitCalculation}
              disabled={submitting || !answer}
            >
              {submitting ? '...' : 'Відправити'}
            </button>
          </div>
        )}

        {(quest.type === 'observation' || quest.type === 'exploration') && (
          <button style={styles.navButton} onClick={onNavigateToGalaxy}>
            Перейти в галактику
          </button>
        )}

        {quest.type === 'photo' && (
          <button style={styles.navButton} onClick={onNavigateToGalaxy}>
            Перейти до телескопа
          </button>
        )}

        {quest.type === 'knowledge' && (
          <span style={styles.hint}>
            Прочитайте урок та натисніть "Прочитано" у вкладці Урок
          </span>
        )}
      </div>

      {feedback && (
        <div style={styles.feedback}>{feedback}</div>
      )}

      {isCompleted && (
        <div style={styles.completedBadge}>Квест виконано</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 600 },
  empty: { color: '#667788', fontSize: 14, fontFamily: 'monospace', paddingTop: 40, textAlign: 'center' },
  header: { marginBottom: 16 },
  typeBadge: {
    display: 'inline-block',
    color: '#ff8844',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '2px 8px',
    border: '1px solid rgba(255,136,68,0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  title: { color: '#aabbcc', fontSize: 16, fontFamily: 'monospace', margin: '4px 0', fontWeight: 'normal' },
  description: { color: '#8899aa', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, marginBottom: 16 },
  rewardRow: { display: 'flex', gap: 12, marginBottom: 20 },
  reward: { color: '#44ff88', fontSize: 12, fontFamily: 'monospace' },
  actionArea: { paddingTop: 16, borderTop: '1px solid #334455' },
  calcInput: { display: 'flex', gap: 8 },
  input: {
    flex: 1,
    background: 'rgba(10,15,25,0.8)',
    border: '1px solid #334455',
    color: '#aabbcc',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 3,
    outline: 'none',
  },
  submitButton: {
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#4488aa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  navButton: {
    background: 'rgba(68,136,170,0.15)',
    border: '1px solid #446688',
    color: '#7bb8ff',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '10px 20px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  hint: { color: '#667788', fontSize: 12, fontFamily: 'monospace' },
  feedback: {
    marginTop: 12,
    color: '#44ff88',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: '8px 12px',
    border: '1px solid rgba(68,255,136,0.2)',
    borderRadius: 3,
  },
  completedBadge: {
    marginTop: 20,
    color: '#44ff88',
    fontSize: 13,
    fontFamily: 'monospace',
    padding: '8px 16px',
    border: '1px solid rgba(68,255,136,0.3)',
    borderRadius: 3,
    textAlign: 'center',
  },
};
