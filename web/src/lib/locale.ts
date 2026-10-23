import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { LOCALE_KEY, loadLocale, type Locale } from '../i18n';
import { api } from './api';
import type { User } from './types';

/** Switch the UI language now and remember it on this device. */
export function applyLocale(l: Locale) {
  void loadLocale(l);
  try { localStorage.setItem(LOCALE_KEY, l); } catch { /* private mode */ }
}

/** Current UI language + setter. Signed in, the choice is also saved on the account (PATCH /api/me). */
export function useLocale() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const locale: Locale = i18n.language === 'hi' ? 'hi' : 'en';
  const setLocale = (l: Locale) => {
    applyLocale(l);
    const me = qc.getQueryData<User | null>(['me']);
    if (!me) return;
    qc.setQueryData<User>(['me'], { ...me, locale: l }); // optimistic: the shell's user→locale sync must not flip it back
    api.updateMe({ locale: l }).then((r) => qc.setQueryData<User>(['me'], (o) => ({ ...o, ...r.user })), () => {});
  };
  return { locale, setLocale };
}
