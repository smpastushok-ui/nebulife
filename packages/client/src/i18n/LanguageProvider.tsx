import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { uk } from './uk.js';
import { en } from './en.js';
import type { Language } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Translations = typeof uk;

const bundles: Record<Language, Translations> = { uk, en };

// ---------------------------------------------------------------------------
// Static reference for non-React code (PixiJS scenes)
// ---------------------------------------------------------------------------

let currentLang: Language = 'uk';
let currentBundle: Translations = uk;

export function tStatic(key: keyof Translations): string {
  return currentBundle[key] ?? (key as string);
}

export function getCurrentLanguage(): Language {
  return currentLang;
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

interface LanguageCtx {
  lang: Language;
  t: (key: keyof Translations) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'uk',
  t: (k) => uk[k] ?? (k as string),
  setLanguage: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface LanguageProviderProps {
  children: ReactNode;
  initial?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export function LanguageProvider({
  children,
  initial = 'uk',
  onLanguageChange,
}: LanguageProviderProps) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem('nebulife_language');
    if (stored === 'uk' || stored === 'en') return stored;
    return initial;
  });

  const t = useCallback((key: keyof Translations): string => {
    return bundles[lang][key] ?? (key as string);
  }, [lang]);

  const setLanguage = useCallback((newLang: Language) => {
    setLangState(newLang);
    currentLang = newLang;
    currentBundle = bundles[newLang];
    localStorage.setItem('nebulife_language', newLang);
    onLanguageChange?.(newLang);
  }, [onLanguageChange]);

  // Sync static refs on each render (important for SSR-free SPA)
  currentLang = lang;
  currentBundle = bundles[lang];

  return (
    <LanguageContext.Provider value={{ lang, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useT() {
  return useContext(LanguageContext);
}

export function useLanguage() {
  return useContext(LanguageContext);
}
