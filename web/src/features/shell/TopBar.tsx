import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { buttonClass } from '../../ui/Button';
import type { User } from '../../lib/types';
import { NAV } from './SideNav';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitch } from './LanguageSwitch';
import { LiveBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink">
      <svg aria-hidden width="26" height="26" viewBox="0 0 20 20" className="text-accent">
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="3" />
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="33 60" transform="rotate(-90 10 10)" />
      </svg>
      SmartCC
    </span>
  );
}

const iconBtn = 'inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink';

/** All widths. Logo + inline nav below 1280 (SideNav takes over above); search, language, bell and account on the right. */
export function TopBar({ user, onSearch, onSignOut }: { user: User | null | undefined; onSearch(): void; onSignOut(): void }) {
  const { t } = useTranslation();
  const shortcut = isMac() ? '⌘K' : 'Ctrl K';
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 items-center gap-1 px-3 sm:px-4 md:h-16 xl:px-10">
        <Link to={user ? '/' : '/help'} className="mr-auto flex items-center rounded-sm xl:hidden" aria-label={t('shell.home')}><Logo /></Link>
        {user && (
          <nav aria-label={t('nav.main')} className="mr-2 hidden md:block xl:hidden">
            <ul className="flex items-center gap-0.5">
              {NAV.filter((n) => ['/', '/tickets', '/help', '/assistant'].includes(n.to)).map(({ to, label, short }) => (
                <li key={to}>
                  <NavLink to={to} end aria-label={t(label)} className={({ isActive }) =>
                    `inline-flex min-h-11 items-center rounded-pill px-3 text-[15px] font-semibold transition-colors ${isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink'}`}>
                    {t(short)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <button type="button" onClick={onSearch} aria-keyshortcuts="Meta+K Control+K"
          className="group hidden min-h-11 w-full max-w-md items-center gap-3 rounded-pill border border-line-strong/50 bg-surface px-4 text-left text-[15px] text-muted transition-colors hover:border-line-strong lg:flex xl:mr-auto">
          <Search aria-hidden size={18} />
          <span className="flex-1 truncate">{t('shell.searchPlaceholder')}</span>
          <kbd className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-ink-2">{shortcut}</kbd>
        </button>
        <button type="button" onClick={onSearch} aria-label={t('shell.search')} className={`${iconBtn} lg:hidden`}>
          <Search aria-hidden size={20} strokeWidth={1.75} />
        </button>
        <LanguageSwitch />
        {user ? (
          <>
            <LiveBell />
            <Link to="/tickets/new" className={buttonClass('primary', 'mx-1 hidden !px-4 md:inline-flex xl:hidden')}>
              <Plus aria-hidden size={18} /> {t('nav.newTicket')}
            </Link>
            <UserMenu user={user} onSignOut={onSignOut} />
          </>
        ) : (
          <>
            <span className="hidden sm:contents"><ThemeToggle /></span>
            <Link to="/login" className={buttonClass('secondary', 'ml-1 whitespace-nowrap !px-4 xl:hidden')}>{t('auth.signIn')}</Link>
          </>
        )}
      </div>
    </header>
  );
}
