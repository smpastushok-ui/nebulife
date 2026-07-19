import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({
  acquireIdempotencyKey: vi.fn(),
  completeIdempotencyKey: vi.fn(),
  getPlayer: vi.fn(),
  rateLimit: vi.fn(),
  releaseIdempotencyKey: vi.fn(),
  savePlayerFeedback: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  authenticate: vi.fn(),
}));

vi.mock('@nebulife/server', async () => {
  const policy = await import('../src/feedback-submission.js');
  return {
    ...policy,
    acquireIdempotencyKey: server.acquireIdempotencyKey,
    completeIdempotencyKey: server.completeIdempotencyKey,
    getPlayer: server.getPlayer,
    RATE_LIMITS: { feedback: server.rateLimit },
    releaseIdempotencyKey: server.releaseIdempotencyKey,
    savePlayerFeedback: server.savePlayerFeedback,
  };
});

vi.mock('../src/auth-middleware.js', () => ({
  authenticate: auth.authenticate,
}));

import handler from '../../../api/feedback/submit.js';

function response() {
  const result = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      result.statusCode = code;
      return result;
    },
    json(body: unknown) {
      result.body = body;
      return result;
    },
  };
  return result;
}

function request(body: Record<string, unknown>, key = 'feedback-test-key') {
  return {
    method: 'POST',
    body,
    headers: { 'x-idempotency-key': key },
  };
}

describe('POST /api/feedback/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.authenticate.mockResolvedValue({
      uid: 'firebase-uid',
      playerId: 'player-1',
      provider: 'anonymous',
    });
    server.rateLimit.mockResolvedValue(true);
    server.getPlayer.mockResolvedValue({
      id: 'player-1',
      callsign: null,
      name: 'Explorer',
      player_level: 1,
    });
    server.acquireIdempotencyKey.mockResolvedValue({ acquired: true });
    server.savePlayerFeedback.mockResolvedValue({ id: 42 });
    server.releaseIdempotencyKey.mockResolvedValue(undefined);
  });

  it.each([1, 7, 9, 10, 50])(
    'accepts authenticated Weaver feedback at level %i',
    async (level) => {
      server.getPlayer.mockResolvedValue({
        id: 'player-1',
        callsign: null,
        name: 'Explorer',
        player_level: level,
      });
      const res = response();

      await handler(request({
        source: 'weaver',
        likesText: '<script>alert(1)</script>\u0000',
        dislikesText: '',
        level: 99,
        language: 'en',
      }) as never, res as never);

      expect(res.statusCode).toBe(200);
      expect(server.savePlayerFeedback).toHaveBeenCalledWith(expect.objectContaining({
        playerId: 'player-1',
        callsign: null,
        level,
        likesText: '<script>alert(1)</script>',
      }));
      expect(server.completeIdempotencyKey).toHaveBeenCalledOnce();
    },
  );

  it('keeps the old survey level guard', async () => {
    const res = response();
    await handler(request({
      source: 'survey',
      likesText: 'Hello',
      dislikesText: '',
      level: 1,
    }) as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: { code: 'level_too_low' } });
    expect(server.savePlayerFeedback).not.toHaveBeenCalled();
  });

  it('returns a typed error when the player row is missing', async () => {
    server.getPlayer.mockResolvedValue(null);
    const res = response();
    await handler(request({
      source: 'weaver',
      likesText: 'Hello',
      dislikesText: '',
    }) as never, res as never);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: { code: 'player_not_found' } });
  });

  it('returns a typed rate-limit error', async () => {
    server.rateLimit.mockResolvedValue(false);
    const res = response();
    await handler(request({
      source: 'weaver',
      likesText: 'Hello',
      dislikesText: '',
    }) as never, res as never);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: { code: 'rate_limited' } });
  });

  it('replays a completed duplicate without a second insert', async () => {
    server.acquireIdempotencyKey.mockResolvedValue({
      acquired: false,
      record: {
        response_status: 200,
        response_body: { ok: true, id: 21 },
      },
    });
    const res = response();
    await handler(request({
      source: 'weaver',
      likesText: 'Hello',
      dislikesText: '',
    }) as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, id: 21 });
    expect(server.savePlayerFeedback).not.toHaveBeenCalled();
  });

  it('requires Firebase auth instead of trusting a legacy client id', async () => {
    auth.authenticate.mockImplementation(async (_req, res) => {
      res.status(401).json({ error: 'Missing Authorization header' });
      return null;
    });
    const res = response();
    await handler(request({
      source: 'weaver',
      likesText: 'Hello',
      dislikesText: '',
    }) as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(server.savePlayerFeedback).not.toHaveBeenCalled();
  });

  it('returns server_error and releases the key on persistence failure', async () => {
    server.savePlayerFeedback.mockRejectedValue(new Error('database unavailable'));
    const res = response();
    await handler(request({
      source: 'weaver',
      likesText: 'Hello',
      dislikesText: '',
    }) as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: { code: 'server_error' } });
    expect(server.releaseIdempotencyKey).toHaveBeenCalledOnce();
  });
});
