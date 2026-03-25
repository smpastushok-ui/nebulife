// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGUAGES = ['uk', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  uk: 'Українська',
  en: 'English',
};

// ---------------------------------------------------------------------------
// Digest image generation — add a language here to auto-generate digest for it
// ---------------------------------------------------------------------------

export const DIGEST_LANGUAGES: Language[] = ['uk', 'en'];

/** Number of infographic pages per language (15 news / 3 per page = 5) */
export const DIGEST_IMAGES_PER_LANG = 5;
