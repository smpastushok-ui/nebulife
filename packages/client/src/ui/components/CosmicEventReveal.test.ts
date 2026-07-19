import { beforeEach, describe, expect, it } from 'vitest';
import {
  dismissCosmicEventReveal,
  enqueueCosmicEventReveal,
  getCosmicEventRevealQueueState,
  isSafeMediaUrl,
  resetCosmicEventRevealQueueForTests,
  resolveCosmicEventMedia,
} from './CosmicEventReveal.js';

describe('cosmic event reveal flow', () => {
  beforeEach(resetCosmicEventRevealQueueForTests);

  it('detects video, photo and no-media results', () => {
    expect(resolveCosmicEventMedia({
      videoUrl: 'https://media.nebulife.space/event.mp4',
      photoUrl: 'https://media.nebulife.space/poster.webp',
    })).toEqual({
      kind: 'video',
      url: 'https://media.nebulife.space/event.mp4',
      poster: 'https://media.nebulife.space/poster.webp',
    });
    expect(resolveCosmicEventMedia({ photoUrl: '/cosmic-events/event.webp' })).toEqual({
      kind: 'photo',
      url: '/cosmic-events/event.webp',
    });
    expect(resolveCosmicEventMedia({})).toEqual({ kind: 'none' });
  });

  it('rejects unsafe media schemes', () => {
    expect(isSafeMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeMediaUrl('data:text/html,bad')).toBe(false);
    expect(isSafeMediaUrl('https://blob.vercel-storage.com/event.mp4')).toBe(true);
  });

  it('queues without stacking and suppresses duplicate completion reveals', () => {
    const first = { key: 'event:1', titleUk: 'Подія', titleEn: 'Event', photoUrl: '/event.webp' };
    const second = { key: 'event:2', titleUk: 'Подія 2', titleEn: 'Event 2' };
    expect(enqueueCosmicEventReveal(first)).toBe(true);
    expect(enqueueCosmicEventReveal(first)).toBe(false);
    expect(enqueueCosmicEventReveal(second)).toBe(true);
    expect(getCosmicEventRevealQueueState()).toEqual({ active: first, queued: 1 });
    dismissCosmicEventReveal();
    expect(getCosmicEventRevealQueueState()).toEqual({ active: second, queued: 0 });
  });

  it('permits explicit replay but not duplicate active stacking', () => {
    const item = { key: 'event:1', titleUk: 'Подія', titleEn: 'Event', photoUrl: '/event.webp' };
    enqueueCosmicEventReveal(item);
    dismissCosmicEventReveal();
    expect(enqueueCosmicEventReveal(item)).toBe(false);
    expect(enqueueCosmicEventReveal(item, { replay: true })).toBe(true);
    expect(enqueueCosmicEventReveal(item, { replay: true })).toBe(false);
  });
});
