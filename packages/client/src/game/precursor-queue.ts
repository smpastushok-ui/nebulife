// ---------------------------------------------------------------------------
// Idempotent acquisition queue for the Precursor Signals cinematic.
//
// App.tsx grants a card via a `setPrecursorCollection` functional updater and
// then queues the acquisition overlay via `setPrecursorAcquisitionQueue`. The
// two are separate state setters — if the SAME card can somehow be rolled
// twice in one tick (e.g. two planet-mission reports resolving in the same
// interval sweep, racing the same `precursorCollectionRef` snapshot), the
// queue must not end up with two entries for one card. `enqueuePrecursorAcquisition`
// coalesces that here, independent of whatever the collection-grant race does.
//
// Each queued entry also carries a stable, acquisition-unique `id` used as
// the React `key` for the overlay (see App.tsx). Keying by `id` instead of
// `cardId + rarity + queue.length` (the previous approach) means:
//   - a second card queuing up WHILE the first is still showing never
//     remounts/restarts the first card's cinematic (length changed, id did
//     not), and
//   - two back-to-back acquisitions of the identical card+rarity (allowed —
//     duplicates exist before the pity system kicks in) still get their own
//     fresh mount, because they have distinct ids.
// ---------------------------------------------------------------------------

import type { PrecursorRarity } from '@nebulife/core';

export interface PrecursorAcquisitionQueueItem {
  id: string;
  cardId: string;
  rarity: PrecursorRarity;
}

let acquisitionIdCounter = 0;

/** Stable, collision-safe id generator for one acquisition event. Exposed so
 *  tests can inject a deterministic generator. */
export function createPrecursorAcquisitionId(): string {
  acquisitionIdCounter += 1;
  return `precursor-acq-${Date.now()}-${acquisitionIdCounter}`;
}

/**
 * Idempotent enqueue: if a queue entry for `cardId` already exists (waiting
 * or currently shown at index 0), returns the SAME array reference unchanged
 * — both to coalesce the duplicate signal and so React can bail out of the
 * re-render entirely.
 */
export function enqueuePrecursorAcquisition(
  queue: readonly PrecursorAcquisitionQueueItem[],
  cardId: string,
  rarity: PrecursorRarity,
  makeId: () => string = createPrecursorAcquisitionId,
): PrecursorAcquisitionQueueItem[] {
  if (queue.some((item) => item.cardId === cardId)) {
    return queue as PrecursorAcquisitionQueueItem[];
  }
  return [...queue, { id: makeId(), cardId, rarity }];
}

/** Advances the queue past its current head (the acquisition just shown). */
export function dequeuePrecursorAcquisition(
  queue: readonly PrecursorAcquisitionQueueItem[],
): PrecursorAcquisitionQueueItem[] {
  return queue.length > 0 ? queue.slice(1) : (queue as PrecursorAcquisitionQueueItem[]);
}
