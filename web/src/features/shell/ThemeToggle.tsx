import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NEXT_THEME, useTheme } from '../../lib/theme';

export const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const { t } = useTranslation();
  const { pref, setPref } = useTheme();
  const Icon = THEME_ICON[pref];
  const name = (p: string) => t(`theme.${p}`);
  return (
    <button type="button" onClick={() => setPref(NEXT_THEME[pref])} aria-label={t('theme.current', { theme: name(pref) })}
      title={t('theme.switch', { theme: name(pref), next: name(NEXT_THEME[pref]) })}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
      <Icon aria-hidden size={20} strokeWidth={1.75} />
    </button>
  );
}
