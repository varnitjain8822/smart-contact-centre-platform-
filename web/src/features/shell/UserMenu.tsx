import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, UserRound } from 'lucide-react';
import type { User } from '../../lib/types';
import { Avatar } from '../../ui/Avatar';
import { DropdownMenu } from '../../ui/DropdownMenu';

export function UserMenu({ user, onSignOut }: { user: User; onSignOut(): void }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <DropdownMenu label={t('shell.account')}
      header={<><p className="truncate font-semibold text-ink">{user.name}</p><p className="truncate text-sm text-muted">{user.email}</p></>}
      items={[
        { label: t('nav.profile'), icon: UserRound, onSelect: () => nav('/profile') },
        'separator',
        { label: t('auth.signOut'), icon: LogOut, danger: true, onSelect: onSignOut },
      ]}
      trigger={(p) => (
        <button type="button" {...p}
          className="inline-grid size-9 shrink-0 place-items-center rounded-full border border-slate-200/90 bg-white shadow-2xs transition-all hover:ring-2 hover:ring-slate-300">
          {/* sr-only name, not aria-label: the visible initials must not contradict the accessible name (WCAG 2.5.3) */}
          <span className="sr-only">{t('shell.accountFor', { name: user.name })}</span>
          <Avatar name={user.name} size="sm" />
        </button>
      )} />
  );
}
