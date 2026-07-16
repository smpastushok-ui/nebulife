export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const EMERGENCY_EPISODE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,79}$/;

export function extractYouTubeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (YOUTUBE_ID_PATTERN.test(input)) return input;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let candidate = '';
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') candidate = url.searchParams.get('v') ?? '';
    else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0] ?? '')) candidate = parts[1] ?? '';
    }
  }
  return YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

export function sanitizeLegacyEpisodeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)]
    .filter((id): id is string => typeof id === 'string' && EMERGENCY_EPISODE_ID_PATTERN.test(id))
    .slice(0, 100);
}

export function isMissingEmergencyTransmissionSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('emergency_transmission_episodes')
    || message.includes('emergency_transmission_claims')
    || message.includes('relation') && message.includes('does not exist');
}
