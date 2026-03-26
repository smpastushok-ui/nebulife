import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAcademyProgress, getTodayLesson, shareNotify } from '../../../api/academy-api.js';
import type { AcademyProgress, DailyLesson } from '../../../api/academy-api.js';
import { LessonView } from './LessonView.js';
import { QuestView } from './QuestView.js';
import { QuizView } from './QuizView.js';
import { ProfileView } from './ProfileView.js';
import { TopicSelectionModal } from './TopicSelectionModal.js';

type AcademyTab = 'lesson' | 'quest' | 'quiz' | 'news' | 'profile';

export interface SharedLessonInfo {
  fromPlayerName: string;
  title: string;
}

interface AcademyDashboardProps {
  onClose: () => void;
  onNavigateToGalaxy?: () => void;
  playerName?: string;
  sharedLessonInfo?: SharedLessonInfo | null;
  onAwardXP?: (amount: number, reason: string) => void;
}

const TAB_LABELS: Record<AcademyTab, string> = {
  lesson: 'Урок',
  quest: 'Квест',
  quiz: 'Тести',
  news: 'Новини',
  profile: 'Профіль',
};

const NEXT_LESSON_HOUR_UTC = 11; // 11:00 UTC

function getCountdown(): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(NEXT_LESSON_HOUR_UTC, 0, 0, 0);
  if (now >= next) next.setUTCDate(next.getUTCDate() + 1);
  const diff = next.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function AcademyDashboard({ onClose, onNavigateToGalaxy, playerName, sharedLessonInfo, onAwardXP }: AcademyDashboardProps) {
  const [tab, setTab] = useState<AcademyTab>('lesson');
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(getCountdown());
  const [shareBanner, setShareBanner] = useState<string | null>(null);
  const notifyCalledRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prog, todayData] = await Promise.all([
        getAcademyProgress(),
        getTodayLesson(),
      ]);
      setProgress(prog);
      if (todayData.needsOnboarding) {
        setNeedsOnboarding(true);
      } else {
        setLesson(todayData.lesson);
      }
    } catch (err) {
      console.error('[Academy] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle shared lesson: show banner + send system chat notification (once)
  useEffect(() => {
    if (!sharedLessonInfo || notifyCalledRef.current) return;
    notifyCalledRef.current = true;
    setShareBanner(`Гравець ${sharedLessonInfo.fromPlayerName} поділився уроком "${sharedLessonInfo.title}"`);
    shareNotify(sharedLessonInfo.fromPlayerName, sharedLessonInfo.title);
  }, [sharedLessonInfo]);

  const handleOnboardComplete = useCallback(() => {
    setNeedsOnboarding(false);
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => { loadData(); }, [loadData]);

  if (needsOnboarding) {
    return (
      <div style={styles.overlay}>
        <TopicSelectionModal
          onComplete={handleOnboardComplete}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Sidebar tabs */}
        <div style={styles.sidebar}>
          {(Object.keys(TAB_LABELS) as AcademyTab[]).map((t) => (
            <button
              key={t}
              style={{
                ...styles.tabButton,
                ...(tab === t ? styles.tabActive : {}),
              }}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div style={styles.content}>
          {shareBanner && (
            <div style={styles.shareBanner}>
              {shareBanner}
              <button style={styles.shareBannerClose} onClick={() => setShareBanner(null)}>x</button>
            </div>
          )}
          {loading ? (
            <div style={styles.loadingText}>Завантаження...</div>
          ) : (
            <>
              {tab === 'lesson' && (
                <LessonView
                  lesson={lesson}
                  progress={progress}
                  onRefresh={handleRefresh}
                  playerName={playerName}
                />
              )}
              {tab === 'quest' && (
                <QuestView
                  lesson={lesson}
                  progress={progress}
                  onRefresh={handleRefresh}
                  onNavigateToGalaxy={() => {
                    onClose();
                    onNavigateToGalaxy?.();
                  }}
                />
              )}
              {tab === 'quiz' && (
                <QuizView
                  lesson={lesson}
                  onRefresh={handleRefresh}
                  onAwardXP={onAwardXP}
                />
              )}
              {tab === 'news' && (
                <div style={styles.placeholder}>
                  Космічні новини (Weekly Digest)
                  <br />
                  <span style={{ color: '#667788', fontSize: 12 }}>
                    Інтеграція з існуючим DigestModal
                  </span>
                </div>
              )}
              {tab === 'profile' && (
                <ProfileView
                  progress={progress}
                  onRefresh={handleRefresh}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button style={styles.closeButton} onClick={onClose}>
          X Закрити
        </button>
        <span style={styles.countdownText}>
          Наступний урок через: {countdown}
        </span>
        {progress && (
          <span style={styles.streakBadge}>
            {progress.quest_streak} дн.
          </span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9600,
    background: 'rgba(2,5,16,0.96)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
  },
  container: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: 80,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '12px 4px',
    borderRight: '1px solid #334455',
    background: 'rgba(5,10,20,0.6)',
  },
  tabButton: {
    background: 'transparent',
    border: '1px solid transparent',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '10px 4px',
    cursor: 'pointer',
    borderRadius: 3,
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(68,136,170,0.15)',
    borderColor: '#446688',
    color: '#aabbcc',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px 28px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderTop: '1px solid #334455',
    background: 'rgba(5,10,20,0.8)',
  },
  closeButton: {
    background: 'transparent',
    border: '1px solid #334455',
    color: '#8899aa',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '6px 12px',
    cursor: 'pointer',
    borderRadius: 3,
  },
  countdownText: {
    color: '#667788',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  streakBadge: {
    color: '#44ff88',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: '4px 8px',
    border: '1px solid rgba(68,255,136,0.3)',
    borderRadius: 3,
  },
  loadingText: {
    color: '#667788',
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    paddingTop: 60,
  },
  placeholder: {
    color: '#8899aa',
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    paddingTop: 60,
  },
  shareBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'rgba(68,136,170,0.1)',
    border: '1px solid rgba(68,136,170,0.25)',
    borderRadius: 4,
    color: '#8899aa',
    fontSize: 12,
    fontFamily: 'monospace',
    padding: '8px 12px',
    marginBottom: 16,
  },
  shareBannerClose: {
    background: 'transparent',
    border: 'none',
    color: '#556677',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
    padding: '0 4px',
    flexShrink: 0,
  },
};
