import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import uk from './locales/uk.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'uk'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nebulife_lang',
    },
  });

export default i18n;
export type { TFunction } from 'i18next';

export { LanguageProvider, useT, useLanguage, tStatic, getCurrentLanguage } from './LanguageProvider.js';
export { uk } from './uk.js';
export { en } from './en.js';
export type { TranslationKey } from './uk.js';
