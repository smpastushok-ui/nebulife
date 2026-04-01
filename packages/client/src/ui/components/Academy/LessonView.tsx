import React, { useState } from 'react';
import { useT } from '../../../i18n/index.js';
import type { AcademyProgress, DailyLesson } from '../../../api/academy-api.js';
import { completeLesson } from '../../../api/academy-api.js';

interface LessonViewProps {
  lesson: DailyLesson | null;
  progress: AcademyProgress | null;
  onRefresh: () => void;
  playerName?: string;
}

export function LessonView({ lesson, progress, onRefresh, playerName }: LessonViewProps) {
  const { t } = useT();
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!lesson) return;
    const url = `${window.location.origin}/api/share?lesson=${encodeURIComponent(lesson.lessonId)}&from=${encodeURIComponent(playerName ?? '')}&title=${encodeURIComponent(lesson.lessonNameUk)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!lesson) {
    return <div style={styles.empty}>{t('lesson.no_lesson')}</div>;
  }

  const isCompleted = progress?.completed_lessons?.[lesson.lessonId];

  const handleMarkRead = async () => {
    setMarking(true);
    try {
      await completeLesson(lesson.lessonId);
      onRefresh();
    } catch (err) {
      console.error('Failed to complete lesson:', err);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.categoryBadge}>{lesson.categoryNameUk}</span>
        <h2 style={styles.title}>{lesson.lessonNameUk}</h2>
        <span style={styles.difficulty}>
          {lesson.difficulty === 'explorer' ? t('lesson.explorer') : t('lesson.scientist')}
        </span>
      </div>

      {/* Lesson content */}
      <div style={styles.lessonText}>
        {lesson.lessonContent.split('\n').map((p, i) => (
          <p key={i} style={styles.paragraph}>{p}</p>
        ))}
      </div>

      {/* Image placeholder */}
      {lesson.lessonImageUrl && (
        <img
          src={lesson.lessonImageUrl}
          alt={lesson.lessonNameUk}
          style={styles.image}
        />
      )}

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomLeft}>
          {isCompleted ? (
            <span style={styles.completedBadge}>{t('lesson.completed')}</span>
          ) : (
            <button
              style={styles.readButton}
              onClick={handleMarkRead}
              disabled={marking}
            >
              {marking ? t('lesson.saving') : t('lesson.mark_read')}
            </button>
          )}
        </div>
        <button style={styles.shareButton} onClick={handleShare} disabled={!lesson}>
          {copied ? t('lesson.copied') : t('lesson.share')}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 700 },
  empty: { color: '#667788', fontSize: 14, fontFamily: 'monospace', paddingTop: 40, textAlign: 'center' },
  header: { marginBottom: 20 },
  categoryBadge: {
    display: 'inline-block',
    color: '#4488aa',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '2px 8px',
    border: '1px solid rgba(68,136,170,0.3)',
    borderRadius: 3,
    marginBottom: 8,
  },
  title: { color: '#aabbcc', fontSize: 18, fontFamily: 'monospace', margin: '4px 0', fontWeight: 'normal' },
  difficulty: { color: '#667788', fontSize: 11, fontFamily: 'monospace' },
  lessonText: { lineHeight: 1.7 },
  paragraph: { color: '#aabbcc', fontSize: 13, fontFamily: 'monospace', margin: '0 0 14px 0' },
  image: { maxWidth: '100%', borderRadius: 4, marginBottom: 16, border: '1px solid #334455' },
  bottomBar: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #334455', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bottomLeft: { display: 'flex', alignItems: 'center' },
  readButton: {
    background: 'rgba(68,255,136,0.1)',
    border: '1px solid rgba(68,255,136,0.3)',
    color: '#44ff88',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  completedBadge: {
    color: '#44ff88',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: '6px 12px',
    border: '1px solid rgba(68,255,136,0.3)',
    borderRadius: 3,
  },
  shareButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '6px 14px',
    cursor: 'pointer',
    borderRadius: 3,
    flexShrink: 0,
  },
};
