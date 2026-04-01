import React, { useState } from 'react';
import { useT } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';
import type { AcademyProgress, DailyLesson } from '../../../api/academy-api.js';
import { completeQuest } from '../../../api/academy-api.js';

interface QuestViewProps {
  lesson: DailyLesson | null;
  progress: AcademyProgress | null;
  onRefresh: () => void;
  onNavigateToGalaxy: () => void;
}

const QUEST_TYPE_KEYS: Record<string, TranslationKey> = {
  knowledge:   'quest.type.knowledge',
  observation: 'quest.type.observation',
  exploration: 'quest.type.exploration',
  calculation: 'quest.type.calculation',
  photo:       'quest.type.photo',
};

export function QuestView({ lesson, progress, onRefresh, onNavigateToGalaxy }: QuestViewProps) {
  const { t } = useT();
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!lesson) {
    return <div style={styles.empty}>{t('quest.no_quest')}</div>;
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
        setFeedback(
          t('quiz.correct')
            .replace('{quarks}', String(result.quarksAwarded))
            .replace('{xp}', String(result.xpAwarded)),
        );
        onRefresh();
      } else {
        setFeedback(result.message ?? t('quiz.wrong'));
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
          {QUEST_TYPE_KEYS[quest.type]
            ? t(QUEST_TYPE_KEYS[quest.type] as TranslationKey)
            : quest.type}
        </span>
        <h2 style={styles.title}>{quest.titleUk}</h2>
      </div>

      <p style={styles.description}>{quest.descriptionUk}</p>

      <div style={styles.rewardRow}>
        <span style={styles.reward}>+{quest.quarkReward} {t('quest.quarks_unit')}</span>
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
              placeholder={t('quest.answer_placeholder')}
              style={styles.input}
            />
            <button
              style={styles.submitButton}
              onClick={handleSubmitCalculation}
              disabled={submitting || !answer}
            >
              {submitting ? '...' : t('quest.submit')}
            </button>
          </div>
        )}

        {(quest.type === 'observation' || quest.type === 'exploration') && (
          <button style={styles.navButton} onClick={onNavigateToGalaxy}>
            {t('quest.go_galaxy')}
          </button>
        )}

        {quest.type === 'photo' && (
          <button style={styles.navButton} onClick={onNavigateToGalaxy}>
            {t('quest.go_telescope')}
          </button>
        )}

        {quest.type === 'knowledge' && (
          <span style={styles.hint}>
            {t('quest.knowledge_hint')}
          </span>
        )}
      </div>

      {feedback && (
        <div style={styles.feedback}>{feedback}</div>
      )}

      {isCompleted && (
        <div style={styles.completedBadge}>{t('quest.completed')}</div>
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
