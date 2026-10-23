import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { House, LifeBuoy, Plus, Sparkles, Tickets, UserRound } from 'lucide-react';
import type { User } from '../../lib/types';
import { buttonClass } from '../../ui/Button';
import { Logo } from './TopBar';

/** `label`/`short` are i18n keys. `short` (bottom tabs) must stay a substring of `label` (WCAG 2.5.3). `tab` = in the mobile bottom bar. */
export const NAV = [
  { to: '/', label: 'nav.home', short: 'nav.homeShort', icon: House, tab: true },
  { to: '/tickets', label: 'nav.tickets', short: 'nav.ticketsShort', icon: Tickets, tab: true },
  { to: '/tickets/new', label: 'nav.newTicket', short: 'nav.newShort', icon: Plus, tab: true },
  { to: '/help', label: 'nav.help', short: 'nav.helpShort', icon: LifeBuoy, tab: true },
  { to: '/assistant', label: 'nav.assistant', short: 'nav.assistantShort', icon: Sparkles, tab: true },
  { to: '/profile', label: 'nav.profile', short: 'nav.profileShort', icon: UserRound, tab: false },
];

/** ≥1280 only. */
export function SideNav({ user }: { user: User | null | undefined }) {
  const { t } = useTranslation();
  const items = user ? NAV.filter((n) => n.to !== '/tickets/new') : NAV.filter((n) => n.to === '/help');
  return (
    <header className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 pb-5 xl:flex print:hidden">
      <div className="-mx-4 flex h-16 items-center border-b border-line px-5">
        <Link to={user ? '/' : '/help'} className="flex items-center rounded-sm px-1" aria-label={t('shell.home')}><Logo /></Link>
      </div>
      {user ? (
        <Link to="/tickets/new" className={buttonClass('primary', 'mt-6 w-full')}><Plus aria-hidden size={18} /> {t('nav.newTicket')}</Link>
      ) : (
        <Link to="/login" className={buttonClass('primary', 'mt-6 w-full')}>{t('auth.signIn')}</Link>
      )}
      <nav aria-label={t('nav.main')} className="mt-6">
        <ul className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-sm px-3 text-[15px] font-semibold transition-colors ${isActive ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'}`}>
                <Icon aria-hidden size={19} strokeWidth={1.75} /> {t(label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
