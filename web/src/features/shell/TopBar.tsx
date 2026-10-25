import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { User } from '../../lib/types';
import { NAV } from './SideNav';
import { LanguageSwitch } from './LanguageSwitch';
import { LiveBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { company } from '../../lib/company';
import { useAdminUrl } from '../../lib/adminUrl';

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

export function companyBrandGradient(slug: string): string {
  switch (slug) {
    case 'sbi':
      return 'linear-gradient(135deg, #002D62, #00A3E0)';
    case 'tatasteel':
      return 'linear-gradient(135deg, #002B49, #005A9C)';
    case 'delhiairport':
      return 'linear-gradient(135deg, #0284c7, #0f172a)';
    case 'passportseva':
      return 'linear-gradient(135deg, #0a1931, #1e3a8a)';
    case 'infosys':
      return 'linear-gradient(135deg, #005587, #007cc3)';
    default:
      return 'linear-gradient(135deg, #0284c7, #38bdf8)';
  }
}

export const companyTopBarGradient = companyBrandGradient;

/** All widths. Clean white bar with company badge; inline nav on tablet (SideNav takes over on xl); search, language, bell and account on the right. */
export function TopBar({ user, onSearch, onSignOut }: { user: User | null | undefined; onSearch(): void; onSignOut(): void }) {
  const { t } = useTranslation();
  const current = company();
  const adminUrl = useAdminUrl();
  const shortcut = isMac() ? '⌘K' : 'Ctrl K';
  const brandGradient = companyBrandGradient(current.slug);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md text-slate-800 shadow-2xs print:hidden transition-colors">
      <div className="w-full flex h-16 items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 xl:px-8">
        
        {/* Left: Company Portal Identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group">
            <span
              className="grid size-8.5 sm:size-9 shrink-0 place-items-center rounded-xl text-white font-black text-xs shadow-xs transition-transform group-hover:scale-105"
              style={{ background: brandGradient }}
            >
              {current.logoText ? current.logoText.slice(0, 3).toUpperCase() : current.name.slice(0, 3).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="font-display font-bold text-sm sm:text-base tracking-tight leading-tight block text-slate-900 truncate max-w-[120px] xs:max-w-[140px] sm:max-w-[170px] md:max-w-[190px] lg:max-w-[260px] xl:max-w-[320px]">
                {current.name}
              </span>
              <span className="hidden sm:block text-[11px] text-slate-500 font-medium leading-none truncate mt-0.5">
                {current.sector ? `${current.sector} • Citizen Portal` : 'Citizen Portal'}
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Tablet Nav Pills (Visible only on md to lg; on xl SideNav handles navigation) */}
        <nav aria-label={t('nav.main')} className="hidden md:flex xl:hidden items-center shrink-0">
          <ul className="flex items-center gap-0.5 md:gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-2xs">
            {NAV.filter((n) => user ? ['/', '/tickets', '/help', '/assistant'].includes(n.to) : ['/help', '/assistant'].includes(n.to)).map(({ to, label, short }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end
                  aria-label={t(label)}
                  className={({ isActive }) =>
                    `inline-flex min-h-8 items-center rounded-full px-2.5 md:px-3 lg:px-3.5 text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`
                  }
                >
                  {t(short)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right: Actions (Search, Language, Live Bell, New Ticket, User Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Search Button (xl+) */}
          <button
            type="button"
            onClick={onSearch}
            aria-keyshortcuts="Meta+K Control+K"
            className="group hidden xl:flex h-9 w-44 xl:w-56 items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 px-3.5 text-left text-xs text-slate-500 transition-all hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700 shrink-0 shadow-2xs"
          >
            <Search aria-hidden size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
            <span className="flex-1 truncate">{t('shell.searchPlaceholder')}</span>
            <kbd className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shrink-0">{shortcut}</kbd>
          </button>

          {/* Mobile / Tablet Search Icon Button (< xl) */}
          <button
            type="button"
            onClick={onSearch}
            aria-label={t('shell.search')}
            className="inline-flex size-8.5 sm:size-9 xl:hidden items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0 shadow-2xs"
          >
            <Search aria-hidden size={15} strokeWidth={2} />
          </button>

          {/* Language Switch */}
          <LanguageSwitch variant="default" />

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <a
                href={adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold shadow-2xs transition-all shrink-0 whitespace-nowrap"
                title="Open Chatwoot Agent & Admin Workspace"
              >
                <ShieldCheck aria-hidden size={13} className="text-sky-600 shrink-0" />
                <span>Admin Desk</span>
              </a>
              <LiveBell />
              <Link
                to="/tickets/new"
                className="hidden lg:inline-flex xl:hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90 transition-all shrink-0 whitespace-nowrap"
                style={{ backgroundColor: current.primaryColor || '#0284c7' }}
              >
                <Plus aria-hidden size={14} strokeWidth={2.5} className="shrink-0" />
                <span>{t('nav.newTicket')}</span>
              </Link>
              <div className="shrink-0">
                <UserMenu user={user} onSignOut={onSignOut} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                to="/login"
                className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 transition-colors shrink-0 whitespace-nowrap"
              >
                {t('auth.signIn')} &gt;
              </Link>
              <Link
                to="/assistant"
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold shadow-2xs transition-all shrink-0 whitespace-nowrap"
              >
                <Sparkles aria-hidden size={13} className="text-sky-600 shrink-0" />
                <span>Voice AI</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
