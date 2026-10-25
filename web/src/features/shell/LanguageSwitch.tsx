import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useLocale } from '../../lib/locale';
import { DropdownMenu } from '../../ui/DropdownMenu';

/** Language names are shown in their own script, so they never need translating. */
const NAMES = { en: 'English', hi: 'हिन्दी' } as const;
const SHORT = { en: 'EN', hi: 'हि' } as const;

export function LanguageSwitch({ variant = 'default' }: { variant?: 'light' | 'default' } = {}) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const isLight = variant === 'light';
  return (
    <DropdownMenu label={t('shell.language')}
      items={(['en', 'hi'] as const).map((l) => ({ label: <span lang={l}>{NAMES[l]}</span>, checked: locale === l, onSelect: () => setLocale(l) }))}
      trigger={(p) => (
        <button type="button" {...p} aria-label={`${SHORT[locale]} · ${t('shell.languageCurrent', { lang: NAMES[locale] })}`}
          className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            isLight
              ? 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
              : 'border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs'
          }`}>
          <Languages aria-hidden size={14} strokeWidth={2} className="hidden sm:block text-slate-500" />
          <span aria-hidden>{SHORT[locale]}</span>
        </button>
      )} />
  );
}
