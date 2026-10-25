import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NEXT_THEME, useTheme } from '../../lib/theme';

export const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle({ variant = 'default' }: { variant?: 'light' | 'default' } = {}) {
  const { t } = useTranslation();
  const { pref, setPref } = useTheme();
  const Icon = THEME_ICON[pref];
  const name = (p: string) => t(`theme.${p}`);
  const isLight = variant === 'light';
  return (
    <button type="button" onClick={() => setPref(NEXT_THEME[pref])} aria-label={t('theme.current', { theme: name(pref) })}
      title={t('theme.switch', { theme: name(pref), next: name(NEXT_THEME[pref]) })}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-pill transition-colors ${
        isLight ? 'text-white hover:bg-white/20' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      }`}>
      <Icon aria-hidden size={19} strokeWidth={1.75} />
    </button>
  );
}
