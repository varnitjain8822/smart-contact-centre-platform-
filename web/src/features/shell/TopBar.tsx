import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Sparkles } from 'lucide-react';
import type { User } from '../../lib/types';
import { NAV } from './SideNav';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitch } from './LanguageSwitch';
import { LiveBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { CompanySwitcher } from './CompanySwitcher';
import { company } from '../../lib/company';

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function Logo() {
  const current = company();
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink">
      <svg aria-hidden width="26" height="26" viewBox="0 0 20 20" className="text-accent">
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="3" />
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="33 60" transform="rotate(-90 10 10)" />
      </svg>
      {current.logoText || current.name}
    </span>
  );
}

/** All widths. Logo + inline nav below 1280 (SideNav takes over above); search, language, bell and account on the right. */
export function TopBar({ user, onSearch, onSignOut }: { user: User | null | undefined; onSearch(): void; onSignOut(): void }) {
  const { t } = useTranslation();
  const shortcut = isMac() ? '⌘K' : 'Ctrl K';

  return (
    <header className="sticky top-0 z-30 border-b border-sky-400/20 bg-gradient-to-r from-[#0082f5] via-[#00b9f5] to-[#00d2ff] text-white shadow-sm print:hidden">
      <div className="mx-auto flex h-14 md:h-16 items-center justify-between gap-2 px-3 sm:px-6 xl:px-10">
        <div className="flex items-center gap-2">
          <CompanySwitcher variant="light" />
        </div>

        <nav aria-label={t('nav.main')} className="hidden md:flex items-center">
          <ul className="flex items-center gap-1 bg-black/10 p-1 rounded-full backdrop-blur-sm border border-white/15">
            {NAV.filter((n) => user ? ['/', '/tickets', '/help', '/assistant'].includes(n.to) : ['/help', '/assistant'].includes(n.to)).map(({ to, label, short }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  aria-label={t(label)}
                  className={({ isActive }) =>
                    `inline-flex min-h-8 items-center rounded-full px-4 text-xs lg:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-white/95 hover:text-white hover:bg-white/15'
                    }`
                  }
                >
                  {t(short)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            aria-keyshortcuts="Meta+K Control+K"
            className="group hidden lg:flex min-h-9 w-44 xl:w-60 items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 text-left text-xs text-white/90 transition-all hover:bg-white/25 hover:border-white/30 backdrop-blur-sm"
          >
            <Search aria-hidden size={14} className="text-white/80" />
            <span className="flex-1 truncate">{t('shell.searchPlaceholder')}</span>
            <kbd className="rounded-full border border-white/20 bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">{shortcut}</kbd>
          </button>

          <button
            type="button"
            onClick={onSearch}
            aria-label={t('shell.search')}
            className="inline-flex size-9 lg:hidden items-center justify-center rounded-full text-white bg-white/15 hover:bg-white/25 transition-colors"
          >
            <Search aria-hidden size={16} strokeWidth={2} />
          </button>

          <LanguageSwitch variant="light" />
          <ThemeToggle variant="light" />

          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <LiveBell />
              <Link
                to="/tickets/new"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 px-4 py-1.5 text-xs font-bold shadow-sm hover:bg-white/90 transition-all"
              >
                <Plus aria-hidden size={14} strokeWidth={2.5} /> {t('nav.newTicket')}
              </Link>
              <UserMenu user={user} onSignOut={onSignOut} />
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-1">
              <Link
                to="/login"
                className="inline-flex items-center text-xs sm:text-sm font-semibold text-white hover:text-white/80 px-2 py-1 transition-colors"
              >
                {t('auth.signIn')} &gt;
              </Link>
              <Link
                to="/assistant"
                className="inline-flex items-center gap-1 rounded-full bg-white text-slate-900 px-3 sm:px-4 py-1.5 text-xs font-bold shadow-sm hover:bg-white/95 transition-all"
              >
                <Sparkles aria-hidden size={13} className="text-sky-600" />
                <span>Voice AI &gt;</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
