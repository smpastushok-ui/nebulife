import { describe, expect, it } from 'vitest';
import {
  consumePushIntent,
  parsePushIntent,
  parsePushIntentUrl,
  peekPushIntent,
  persistPushIntent,
  type PushIntentStorage,
} from './push-intent.js';

function memoryStorage(): PushIntentStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('push intent contract', () => {
  it('routes allowlisted Operations and Observatory event targets', () => {
    expect(parsePushIntent({
      notificationId: 'n-1',
      action: 'open-event',
      target: 'operations',
      eventId: 'aurora-storm',
    })).toEqual({ id: 'n-1', kind: 'operations-event', eventId: 'aurora-storm' });

    expect(parsePushIntent({
      notificationId: 'n-2',
      action: 'open-event',
      target: 'observatory',
      eventId: '482',
    })).toEqual({ id: 'n-2', kind: 'observatory-event', eventId: '482' });
  });

  it('supports the legacy comet payload without arbitrary route parsing', () => {
    expect(parsePushIntent({
      action: 'open-game',
      occurrenceDate: '2026-07-19',
    })?.kind).toBe('operations-event');
    expect(parsePushIntent({ action: 'open-event', target: '../../../admin', eventId: '1' })).toBeNull();
    expect(parsePushIntent({ action: 'open-event', target: 'observatory', eventId: 'x?redirect=https://bad' })).toBeNull();
    expect(parsePushIntentUrl('https://nebulife.space/?action=open-event&target=observatory&eventId=42')?.kind)
      .toBe('observatory-event');
  });

  it('persists through cold start and consumes exactly once', () => {
    const storage = memoryStorage();
    const intent = { id: 'cold-1', kind: 'operations-event' as const, eventId: 'comet-herald' };
    persistPushIntent(intent, storage);
    expect(peekPushIntent(storage)).toEqual(intent);
    expect(consumePushIntent(storage)).toEqual(intent);
    expect(consumePushIntent(storage)).toBeNull();
  });

  it('suppresses duplicate notification ids while pending', () => {
    const storage = memoryStorage();
    persistPushIntent({ id: 'same', kind: 'operations-event', eventId: 'aurora-storm' }, storage);
    persistPushIntent({ id: 'same', kind: 'observatory-event', eventId: '91' }, storage);
    expect(consumePushIntent(storage)).toEqual({
      id: 'same',
      kind: 'operations-event',
      eventId: 'aurora-storm',
    });
  });
});
