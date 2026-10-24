import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_KEY = 'scc-locale';

export function storedLocale(): Locale {
  try { return localStorage.getItem(LOCALE_KEY) === 'hi' ? 'hi' : 'en'; } catch { return 'en'; }
}

// English is inlined (fallback for every key); other languages are separate chunks fetched on demand.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false, defaultVariables: { brand: 'SmartCC' } }, // React escapes; {{brand}} = the company (v4)
});

const syncHtml = (l: string) => { document.documentElement.lang = l; };
syncHtml(i18n.language);
i18n.on('languageChanged', syncHtml);

export async function loadLocale(l: Locale) {
  if (l === 'hi' && !i18n.hasResourceBundle('hi', 'translation'))
    i18n.addResourceBundle('hi', 'translation', (await import('./locales/hi.json')).default);
  await i18n.changeLanguage(l);
}

/** Resolves once the stored language is active (falls back to English if its chunk fails to load). Render after it. */
export const i18nReady = loadLocale(storedLocale()).catch(() => {});

/** Intl locale for dates/numbers: Hindi → hi-IN; English keeps the browser default. */
export const intlLocale = () => (i18n.language === 'hi' ? 'hi-IN' : undefined);

export default i18n;
