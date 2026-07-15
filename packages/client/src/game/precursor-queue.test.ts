import { describe, expect, it } from 'vitest';
import {
  enqueuePrecursorAcquisition,
  dequeuePrecursorAcquisition,
  type PrecursorAcquisitionQueueItem,
} from './precursor-queue.js';

describe('precursor-queue', () => {
  it('enqueues a fresh acquisition with a stable, unique id', () => {
    let idn = 0;
    const makeId = () => `id-${++idn}`;
    const queue: PrecursorAcquisitionQueueItem[] = [];
    const next = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common', makeId);
    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({ id: 'id-1', cardId: 'signal-echo', rarity: 'common' });
  });

  it('regression: coalesces a same-tick duplicate grant of the SAME card instead of queuing it twice', () => {
    let idn = 0;
    const makeId = () => `id-${++idn}`;
    let queue: PrecursorAcquisitionQueueItem[] = [];
    queue = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common', makeId);
    queue = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common', makeId);
    expect(queue).toHaveLength(1);
  });

  it('returns the SAME array reference when coalescing (lets React bail out of the re-render)', () => {
    const queue: PrecursorAcquisitionQueueItem[] = [{ id: 'a', cardId: 'signal-echo', rarity: 'common' }];
    const next = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common');
    expect(next).toBe(queue);
  });

  it('does not remount the currently-shown card when a DIFFERENT card queues up behind it', () => {
    let idn = 0;
    const makeId = () => `id-${++idn}`;
    let queue: PrecursorAcquisitionQueueItem[] = [];
    queue = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common', makeId);
    const headBefore = queue[0];
    queue = enqueuePrecursorAcquisition(queue, 'signal-pulse', 'common', makeId);
    expect(queue).toHaveLength(2);
    // The head item (its id — used as the React `key`) is untouched, so the
    // currently-mounted overlay for it never remounts/restarts.
    expect(queue[0]).toBe(headBefore);
  });

  it('allows two SEPARATE acquisitions of the identical card+rarity (duplicates are valid before pity) to each get their own id', () => {
    let idn = 0;
    const makeId = () => `id-${++idn}`;
    let queue: PrecursorAcquisitionQueueItem[] = [];
    queue = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common', makeId);
    queue = dequeuePrecursorAcquisition(queue); // first acquisition shown-and-closed
    queue = enqueuePrecursorAcquisition(queue, 'signal-echo', 'common', makeId);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('id-2'); // fresh id, not coalesced with the earlier (already-dequeued) one
  });

  it('dequeue advances past the head and is a no-op on an empty queue', () => {
    const queue: PrecursorAcquisitionQueueItem[] = [
      { id: 'a', cardId: 'signal-echo', rarity: 'common' },
      { id: 'b', cardId: 'signal-pulse', rarity: 'common' },
    ];
    const next = dequeuePrecursorAcquisition(queue);
    expect(next).toEqual([{ id: 'b', cardId: 'signal-pulse', rarity: 'common' }]);

    const empty = dequeuePrecursorAcquisition([]);
    expect(empty).toEqual([]);
  });
});
