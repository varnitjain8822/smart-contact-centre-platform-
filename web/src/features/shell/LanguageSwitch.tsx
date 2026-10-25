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
          className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-pill px-2.5 text-xs font-bold transition-all ${
            isLight
              ? 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
          }`}>
          <Languages aria-hidden size={15} strokeWidth={1.75} className="hidden sm:block" />
          <span aria-hidden>{SHORT[locale]}</span>
        </button>
      )} />
  );
}
