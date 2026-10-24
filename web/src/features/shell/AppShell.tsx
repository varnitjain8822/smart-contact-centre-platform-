import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CloudOff, WifiOff } from 'lucide-react';
import { useLiveEvents } from '../../lib/live';
import { useOnline } from '../../lib/useMediaQuery';
import { channel, useLogout, useMe } from '../auth/hooks';
import { BottomTabs } from './BottomTabs';
import { ErrorBoundary } from './ErrorBoundary';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { Loading, Skeleton } from '../../ui/Skeleton';
import { applyLocale } from '../../lib/locale';
import { AssistantLauncher } from '../assistant/Launcher';

const CommandPalette = lazy(() => import('./CommandPalette').then((m) => ({ default: m.CommandPalette })));

export function PageSkeleton() {
  const { t } = useTranslation();
  return (
    <Loading label={t('common.loading')} className="flex flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-28 rounded-md" />
      <Skeleton className="h-28 rounded-md" />
    </Loading>
  );
}

/** Works signed-out (Help); live events only when signed in. */
export function AppShell() {
  const { t } = useTranslation();
  const me = useMe();
  const user = me.data;
  const live = useLiveEvents(user?.id);
  const online = useOnline();
  const logout = useLogout();
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();
  const [palette, setPalette] = useState(false);
  const [paletteLoaded, setPaletteLoaded] = useState(false);
  useEffect(() => { if (palette) setPaletteLoaded(true); }, [palette]);

  // The account's language wins when it loads or changes elsewhere (useLocale updates ['me'] first, so no flip-back).
  const userLocale = user?.locale;
  useEffect(() => { if (userLocale) applyLocale(userLocale); }, [userLocale]);

  useEffect(() => {
    const ch = channel;
    if (!ch) return;
    const on = (e: MessageEvent) => { if (e.data === 'logout') { qc.clear(); qc.setQueryData(['me'], null); } };
    ch.addEventListener('message', on);
    return () => ch.removeEventListener('message', on);
  }, [qc]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((o) => !o); }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);

  const signOut = () => logout.mutate(undefined, { onSettled: () => nav('/login') });

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-ink focus:shadow-card">
        {t('shell.skip')}
      </a>
      <SideNav user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} onSearch={() => setPalette(true)} onSignOut={signOut} />
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 border-b border-warn/30 bg-warn/10 px-4 py-2 text-sm font-medium text-ink">
            <CloudOff aria-hidden size={16} className="shrink-0 text-warn" /> {t('shell.offline')}
          </div>
        )}
        {/* signed-in bottom padding clears the BottomTabs + the fixed Ask AI launcher (mobile 72+48px, md+ 24+48px) */}
        <main id="main" tabIndex={-1} className={`flex-1 px-4 pt-5 md:pt-8 xl:px-10 xl:pt-10 ${user ? 'pb-[calc(136px+env(safe-area-inset-bottom))] md:pb-24' : 'pb-12'}`}>
          <ErrorBoundary key={loc.pathname}>
            <Suspense fallback={<div className="mx-auto max-w-3xl"><PageSkeleton /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {user && <BottomTabs />}
      {paletteLoaded && <Suspense fallback={null}><CommandPalette open={palette} onClose={() => setPalette(false)} signedIn={!!user} /></Suspense>}
      <AssistantLauncher />
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
        {user && online && live === 'reconnecting' && (
          <span className="arrive inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-2 text-sm font-medium text-bg shadow-card">
            <WifiOff aria-hidden size={16} /> {t('shell.reconnecting')}
          </span>
        )}
      </div>
    </div>
  );
}
