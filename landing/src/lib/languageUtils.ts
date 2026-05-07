import { DEFAULT_UI_LANGUAGE, isSupportedLanguage } from './languages';
import { type i18n } from 'i18next';

const STORAGE_KEY = 'ihomenerd.ui.language';

export { STORAGE_KEY };

export function resolveInitialLanguage(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const lngParam = params.get('lng');
    if (lngParam && isSupportedLanguage(lngParam)) {
      return lngParam;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }
  }
  return DEFAULT_UI_LANGUAGE;
}

export function persistLanguage(code: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
  }
}

export function setDocumentLang(code: string): void {
  if (typeof window !== 'undefined') {
    document.documentElement.lang = code;
  }
}

export function initLanguagePersistence(i18nInstance: typeof i18n): void {
  const initial = resolveInitialLanguage();
  i18nInstance.changeLanguage(initial);
  setDocumentLang(initial);

  i18nInstance.on('languageChanged', (lng: string) => {
    persistLanguage(lng);
  });
}

export function buildLanguageUrl(baseUrl: string, lang: string): string {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('lng', lang);
  return url.toString();
}
