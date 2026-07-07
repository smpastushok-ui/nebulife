// useSagaChapters — "Сага Ткача" queue processor + reader data source.
//
// Owns: fetching the written chapters list, and attempting to turn the next
// queued-but-unwritten milestone (see packages/core/src/game/saga.ts) into a
// chapter. The queue itself lives in App.tsx (synced game_state, mirroring
// the civilization_contacts pattern) — this hook only reads it and reports
// back which items were resolved via `onResolved`, so App.tsx stays the
// single source of truth for what needs to be persisted cross-device.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SagaMilestoneQueueItem } from '@nebulife/core';
import { generateSagaChapter, listSagaChapters, type SagaChapterView } from '../api/saga-api.js';

const LAST_SEEN_KEY = 'nebulife_saga_last_seen_count';
const THROTTLE_RETRY_MS = 15 * 60 * 1000;

export interface UseSagaChaptersResult {
  chapters: SagaChapterView[];
  unreadCount: number;
  generating: boolean;
  /** Set briefly right after a new chapter is written — drives the "нова
   *  глава готова" toast. Consumers should clear it once shown. */
  justWrittenTitle: string | null;
  clearJustWritten: () => void;
  markAllRead: () => void;
  refresh: () => void;
}

export function useSagaChapters(opts: {
  /** Gate polling/generation until the player session is ready (mirrors
   *  serverHydrated gating used throughout App.tsx) — auth itself is handled
   *  transparently by authFetch, no playerId needed here. */
  enabled: boolean;
  queue: SagaMilestoneQueueItem[];
  /** Called once a queued item has been resolved (written or already
   *  written elsewhere) — the caller removes it from the persisted queue. */
  onResolved: (itemId: string) => void;
}): UseSagaChaptersResult {
  const { enabled, queue, onResolved } = opts;
  const [chapters, setChapters] = useState<SagaChapterView[]>([]);
  const [generating, setGenerating] = useState(false);
  const [justWrittenTitle, setJustWrittenTitle] = useState<string | null>(null);
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    try {
      return Number(localStorage.getItem(LAST_SEEN_KEY) ?? '0') || 0;
    } catch {
      return 0;
    }
  });
  const throttledUntilRef = useRef(0);
  const processingIdRef = useRef<string | null>(null);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const refresh = useCallback(() => {
    if (!enabled) return;
    listSagaChapters()
      .then((list) => setChapters(list))
      .catch((err) => console.warn('[saga] list failed:', err));
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Process one queued milestone at a time. Re-runs whenever the queue
  // changes or a previous attempt resolves (generating -> false).
  useEffect(() => {
    if (!enabled || generating) return;
    if (queue.length === 0) return;
    if (Date.now() < throttledUntilRef.current) return;

    const next = queue[0];
    if (processingIdRef.current === next.id) return;
    processingIdRef.current = next.id;
    setGenerating(true);

    generateSagaChapter(next.milestoneType, next.context)
      .then((res) => {
        if (res.status === 'throttled') {
          throttledUntilRef.current = Date.now() + THROTTLE_RETRY_MS;
          return;
        }
        // 'ready' or 'already_written' — either way this milestone is done.
        onResolvedRef.current(next.id);
        if (res.chapter) {
          setChapters((prev) => (prev.some((c) => c.id === res.chapter!.id) ? prev : [...prev, res.chapter!]));
          if (res.status === 'ready') setJustWrittenTitle(res.chapter.title);
        }
      })
      .catch((err) => {
        console.warn('[saga] generate-chapter failed:', err);
        // Back off before retrying the same item, so a persistent server
        // error doesn't spin in a tight loop.
        throttledUntilRef.current = Date.now() + THROTTLE_RETRY_MS;
      })
      .finally(() => {
        processingIdRef.current = null;
        setGenerating(false);
      });
  }, [enabled, generating, queue]);

  const markAllRead = useCallback(() => {
    setLastSeenCount(chapters.length);
    try { localStorage.setItem(LAST_SEEN_KEY, String(chapters.length)); } catch { /* ignore */ }
  }, [chapters.length]);

  const clearJustWritten = useCallback(() => setJustWrittenTitle(null), []);

  return {
    chapters,
    unreadCount: Math.max(0, chapters.length - lastSeenCount),
    generating,
    justWrittenTitle,
    clearJustWritten,
    markAllRead,
    refresh,
  };
}

export default useSagaChapters;
