// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

export const SUPPORTED_LANGUAGES = ['uk', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  uk: 'Українська',
  en: 'English',
};
