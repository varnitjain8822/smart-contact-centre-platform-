import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, UserRound } from 'lucide-react';
import type { User } from '../../lib/types';
import { useTheme, type ThemePref } from '../../lib/theme';
import { Avatar } from '../../ui/Avatar';
import { DropdownMenu, type MenuItem } from '../../ui/DropdownMenu';
import { THEME_ICON } from './ThemeToggle';

export function UserMenu({ user, onSignOut }: { user: User; onSignOut(): void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { pref, setPref } = useTheme();
  const themes: MenuItem[] = (['system', 'light', 'dark'] as ThemePref[]).map((p) => ({
    label: t('theme.option', { theme: t(`theme.${p}`) }), icon: THEME_ICON[p], checked: pref === p, onSelect: () => setPref(p),
  }));
  return (
    <DropdownMenu label={t('shell.account')}
      header={<><p className="truncate font-semibold text-ink">{user.name}</p><p className="truncate text-sm text-muted">{user.email}</p></>}
      items={[
        { label: t('nav.profile'), icon: UserRound, onSelect: () => nav('/profile') },
        'separator', ...themes, 'separator',
        { label: t('auth.signOut'), icon: LogOut, danger: true, onSelect: onSignOut },
      ]}
      trigger={(p) => (
        <button type="button" {...p}
          className="inline-grid size-11 shrink-0 place-items-center rounded-full transition-[box-shadow] hover:ring-2 hover:ring-line">
          {/* sr-only name, not aria-label: the visible initials must not contradict the accessible name (WCAG 2.5.3) */}
          <span className="sr-only">{t('shell.accountFor', { name: user.name })}</span>
          <Avatar name={user.name} size="sm" />
        </button>
      )} />
  );
}
