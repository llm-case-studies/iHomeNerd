export interface UiLanguage {
  code: string;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_UI_LANGUAGES: UiLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh', label: '中文 (Mandarin)', nativeLabel: '中文' },
  { code: 'ko', label: '한국어 (Korean)', nativeLabel: '한국어' },
  { code: 'ja', label: '日本語 (Japanese)', nativeLabel: '日本語' },
  { code: 'ru', label: 'Русский (Russian)', nativeLabel: 'Русский' },
  { code: 'de', label: 'Deutsch (German)', nativeLabel: 'Deutsch' },
  { code: 'fr', label: 'Français (French)', nativeLabel: 'Français' },
  { code: 'it', label: 'Italiano (Italian)', nativeLabel: 'Italiano' },
  { code: 'es', label: 'Español (Spanish)', nativeLabel: 'Español' },
  { code: 'pt', label: 'Português (Brasil)', nativeLabel: 'Português' },
];

export const DEFAULT_UI_LANGUAGE = 'en';

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_UI_LANGUAGES.some((l) => l.code === code);
}
