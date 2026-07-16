import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildYouTubeEmbedUrl, requestEmergencyTransmission } from './emergency-transmission-manager.js';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

describe('emergency transmission manager', () => {
  it('has no session or daily quota, but never repeats an episode per player', async () => {
    const unavailable = vi.fn(async () => new Response('{}', { status: 503 }));
    const first = await requestEmergencyTransmission({ playerId: 'p1', language: 'en', fetcher: unavailable });
    const otherPlayer = await requestEmergencyTransmission({ playerId: 'p2', language: 'en', fetcher: unavailable });
    const repeated = await requestEmergencyTransmission({ playerId: 'p1', language: 'en', fetcher: unavailable });
    expect(first?.id).toBe('frontier-dispatch-001');
    expect(otherPlayer?.id).toBe('frontier-dispatch-001');
    expect(repeated).toBeNull();
  });

  it('claims backend content before returning it and coalesces concurrent requests', async () => {
    const episode = {
      id: 'episode-002',
      title: 'Episode 2',
      summary: 'Summary',
      source: 'youtube' as const,
      youtubeId: 'abcdefghijk',
      releasedAt: '2026-07-01T00:00:00.000Z',
    };
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('/next')) return new Response(JSON.stringify({ episode }), { status: 200 });
      return new Response(JSON.stringify({ ok: true, claimed: true }), { status: 200 });
    });
    const [a, b] = await Promise.all([
      requestEmergencyTransmission({ playerId: 'p3', language: 'en', fetcher }),
      requestEmergencyTransmission({ playerId: 'p3', language: 'en', fetcher }),
    ]);
    expect(a).toEqual(episode);
    expect(b).toEqual(episode);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]?.[0]).toBe('/api/emergency-transmissions/claim');
  });

  it('never builds an embed URL from an invalid ID', () => {
    expect(buildYouTubeEmbedUrl('"><script>')).toBe('about:blank');
    expect(buildYouTubeEmbedUrl('Keu09e2e0I4')).toContain('youtube.com/embed/Keu09e2e0I4');
  });
});
