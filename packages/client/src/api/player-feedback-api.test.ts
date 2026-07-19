import { describe, expect, it } from 'vitest';
import { mapFeedbackError } from './player-feedback-api.js';

describe('mapFeedbackError', () => {
  it.each([
    [401, { error: 'Missing Authorization header' }, 'auth_required'],
    [404, { error: { code: 'player_not_found' } }, 'player_not_found'],
    [403, { error: { code: 'level_too_low' } }, 'level_too_low'],
    [400, { error: { code: 'empty_feedback' } }, 'empty_feedback'],
    [429, { error: { code: 'rate_limited' } }, 'rate_limited'],
    [409, { error: { code: 'duplicate_in_progress' } }, 'duplicate_in_progress'],
    [500, { error: { code: 'server_error' } }, 'server_error'],
    [502, '<html>proxy error</html>', 'server_error'],
  ] as const)('maps status %i to %s', (status, body, expected) => {
    expect(mapFeedbackError(status, body)).toBe(expected);
  });
});
