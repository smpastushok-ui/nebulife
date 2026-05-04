import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcademyProgress, DailyLesson } from '../../../api/academy-api.js';
import { completeLesson } from '../../../api/academy-api.js';
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

interface LessonViewProps {
  lesson: DailyLesson | null;
  progress: AcademyProgress | null;
  onRefresh: () => void;
  playerName?: string;
}

export function LessonView({ lesson, progress, onRefresh, playerName }: LessonViewProps) {
  const { t, i18n } = useTranslation();
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageViewer, setImageViewer] = useState<{ url: string; alt: string; rotation: 0 | 90 } | null>(null);

  const isEn = i18n.language?.startsWith('en');
  const lessonTitle = lesson
    ? (isEn ? (lesson.lessonNameEn ?? lesson.lessonNameUk) : lesson.lessonNameUk)
    : '';
  const categoryTitle = lesson
    ? (isEn ? (lesson.categoryNameEn ?? lesson.categoryNameUk) : lesson.categoryNameUk)
    : '';

  const handleShare = () => {
    if (!lesson) return;
    playSfx('ui-click', 0.07);
    const url = `${window.location.origin}/api/share?lesson=${encodeURIComponent(lesson.lessonId)}&from=${encodeURIComponent(playerName ?? '')}&title=${encodeURIComponent(lessonTitle)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!lesson) {
    return <div style={styles.empty}>{t('academy.empty_today')}</div>;
  }

  const isCompleted = progress?.completed_lessons?.[lesson.lessonId];

  const handleMarkRead = async () => {
    playSfx('ui-click', 0.07);
    setMarking(true);
    try {
      await completeLesson(lesson.lessonId);
      onRefresh();
      interstitialManager.tryShow();
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
        <span style={styles.categoryBadge}>{categoryTitle}</span>
        <h2 style={styles.title}>{lessonTitle}</h2>
        <span style={styles.difficulty}>
          {lesson.difficulty === 'explorer'
            ? t('academy.difficulty_explorer')
            : t('academy.difficulty_scientist')}
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
        <div style={styles.imageWrap}>
          <img
            src={lesson.lessonImageUrl}
            alt={lessonTitle}
            style={styles.image}
          />
          <button
            type="button"
            style={styles.imageZoomButton}
            onClick={() => {
              playSfx('ui-click', 0.07);
              setImageViewer({ url: lesson.lessonImageUrl!, alt: lessonTitle, rotation: 0 });
            }}
          >
            {t('academy.image_zoom')}
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomLeft}>
          {isCompleted ? (
            <span style={styles.completedBadge}>{t('academy.completed_badge')}</span>
          ) : (
            <button
              style={styles.readButton}
              onClick={handleMarkRead}
              disabled={marking}
            >
              {marking
                ? t('academy.marking')
                : <span>{t('academy.mark_read')} (+1 <QuarksIcon /> +10 XP)</span>}
            </button>
          )}
        </div>
        <button style={styles.shareButton} onClick={handleShare} disabled={!lesson}>
          {copied ? t('academy.copied') : t('academy.share')}
        </button>
      </div>

      {imageViewer && (
        <div
          style={styles.imageModal}
          onClick={() => setImageViewer(null)}
        >
          <div style={styles.imageModalToolbar} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              style={styles.imageModalButton}
              onClick={() => {
                playSfx('ui-click', 0.07);
                setImageViewer((prev) => prev ? { ...prev, rotation: prev.rotation === 0 ? 90 : 0 } : prev);
              }}
            >
              {imageViewer.rotation === 0 ? t('academy.image_rotate_landscape') : t('academy.image_rotate_portrait')}
            </button>
            <button
              type="button"
              style={styles.imageModalButton}
              onClick={() => setImageViewer(null)}
            >
              {t('common.close')}
            </button>
          </div>
          <img
            src={imageViewer.url}
            alt={imageViewer.alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...styles.imageModalImg,
              transform: imageViewer.rotation === 90 ? 'rotate(90deg)' : 'none',
              maxWidth: imageViewer.rotation === 90 ? '88vh' : '94vw',
              maxHeight: imageViewer.rotation === 90 ? '94vw' : '82vh',
            }}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 760, margin: '0 auto' },
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
  lessonText: { lineHeight: 1.75 },
  paragraph: { color: '#aabbcc', fontSize: 14, fontFamily: 'monospace', margin: '0 0 15px 0' },
  imageWrap: { position: 'relative', marginBottom: 16 },
  image: { width: '100%', maxHeight: '52vh', objectFit: 'contain', borderRadius: 5, border: '1px solid #334455', background: '#020510', display: 'block' },
  imageZoomButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    background: 'rgba(5,10,20,0.86)',
    border: '1px solid rgba(123,184,255,0.45)',
    color: '#cce6ff',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '7px 11px',
    cursor: 'pointer',
    borderRadius: 4,
  },
  imageModal: {
    position: 'fixed',
    inset: 0,
    zIndex: 12050,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(58px + env(safe-area-inset-top, 0px)) 12px calc(22px + env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
  },
  imageModalToolbar: {
    position: 'fixed',
    top: 'calc(12px + env(safe-area-inset-top, 0px))',
    right: 'calc(12px + env(safe-area-inset-right, 0px))',
    display: 'flex',
    gap: 8,
    zIndex: 12051,
  },
  imageModalButton: {
    background: 'rgba(10,15,25,0.9)',
    border: '1px solid rgba(123,184,255,0.45)',
    borderRadius: 4,
    color: '#cce6ff',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  imageModalImg: {
    objectFit: 'contain',
    borderRadius: 6,
    border: '1px solid rgba(123,184,255,0.35)',
    boxShadow: '0 18px 60px rgba(0,0,0,0.55)',
    transition: 'transform 0.2s ease',
    background: '#020510',
  },
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
