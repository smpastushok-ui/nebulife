import { describe, expect, it } from 'vitest';
import { buildCometPushData } from './push-events.js';

describe('event push payloads', () => {
  it('routes Comet Herald to the Operations event detail', () => {
    expect(buildCometPushData('2026-07-19')).toEqual({
      action: 'open-event',
      target: 'operations',
      eventId: 'comet-herald',
      occurrenceDate: '2026-07-19',
      link: '/?action=open-event&target=operations&eventId=comet-herald&occurrenceDate=2026-07-19',
    });
  });
});
