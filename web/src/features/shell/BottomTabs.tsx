import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV } from './SideNav';

/** <768 only: thumb-reach tab bar with safe-area inset; New ticket is the raised centre action. */
export function BottomTabs() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.main')} className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden print:hidden">
      <ul className="grid h-14 grid-cols-5">
        {NAV.filter((n) => n.tab).map(({ to, short, label, icon: Icon }) => {
          const cta = to === '/tickets/new';
          return (
            <li key={to} className="contents">
              <NavLink to={to} end aria-label={t(label)} className={({ isActive }) =>
                `flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`grid h-7 w-12 place-items-center rounded-pill transition-colors
                      ${cta ? 'bg-accent text-on-accent' : isActive ? 'bg-accent-soft' : ''}`}>
                      <Icon aria-hidden size={20} strokeWidth={isActive || cta ? 2.25 : 1.75} />
                    </span>
                    {t(short)}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
