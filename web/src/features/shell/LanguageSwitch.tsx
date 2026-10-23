import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useLocale } from '../../lib/locale';
import { DropdownMenu } from '../../ui/DropdownMenu';

/** Language names are shown in their own script, so they never need translating. */
const NAMES = { en: 'English', hi: 'हिन्दी' } as const;
const SHORT = { en: 'EN', hi: 'हि' } as const;

export function LanguageSwitch() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  return (
    <DropdownMenu label={t('shell.language')}
      items={(['en', 'hi'] as const).map((l) => ({ label: <span lang={l}>{NAMES[l]}</span>, checked: locale === l, onSelect: () => setLocale(l) }))}
      trigger={(p) => (
        <button type="button" {...p} aria-label={`${SHORT[locale]} · ${t('shell.languageCurrent', { lang: NAMES[locale] })}`}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-pill px-2 text-sm font-bold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <Languages aria-hidden size={18} strokeWidth={1.75} className="hidden sm:block" />
          <span aria-hidden>{SHORT[locale]}</span>
        </button>
      )} />
  );
}
