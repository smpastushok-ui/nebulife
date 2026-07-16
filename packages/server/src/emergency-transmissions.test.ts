import { describe, expect, it } from 'vitest';
import { extractYouTubeId, sanitizeLegacyEpisodeIds } from './emergency-transmissions.js';

describe('extractYouTubeId', () => {
  it.each([
    ['Keu09e2e0I4', 'Keu09e2e0I4'],
    ['https://youtu.be/Keu09e2e0I4?t=2', 'Keu09e2e0I4'],
    ['https://www.youtube.com/watch?v=Keu09e2e0I4', 'Keu09e2e0I4'],
    ['https://youtube.com/shorts/Keu09e2e0I4', 'Keu09e2e0I4'],
    ['https://youtube.com/embed/Keu09e2e0I4', 'Keu09e2e0I4'],
  ])('extracts %s', (input, expected) => {
    expect(extractYouTubeId(input)).toBe(expected);
  });

  it.each([
    'https://evil.example/embed/Keu09e2e0I4',
    'javascript:alert(1)',
    'https://youtube.com/watch?v=too-short',
    'not a video',
  ])('rejects %s', (input) => {
    expect(extractYouTubeId(input)).toBeNull();
  });
});

describe('sanitizeLegacyEpisodeIds', () => {
  it('deduplicates and rejects malformed IDs', () => {
    expect(sanitizeLegacyEpisodeIds([
      'frontier-dispatch-001',
      'frontier-dispatch-001',
      '../../players',
      7,
    ])).toEqual(['frontier-dispatch-001']);
  });
});
