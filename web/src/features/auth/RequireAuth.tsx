import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMe } from './hooks';
import { Loading, Skeleton } from '../../ui/Skeleton';

/** Full-page placeholder while the session is checked: the rough shape of the app, not a spinner. */
export function Splash() {
  const { t } = useTranslation();
  return (
    <Loading label={t('common.loading')} className="min-h-dvh">
      <div className="flex h-14 items-center gap-3 border-b border-line px-4 md:h-16">
        <Skeleton className="size-7 rounded-full" /><Skeleton className="h-5 w-24" /><Skeleton className="ml-auto size-9 rounded-full" />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-8">
        <Skeleton className="h-9 w-56" /><Skeleton className="h-32 rounded-md" /><Skeleton className="h-32 rounded-md" />
      </div>
    </Loading>
  );
}

/** Inside the shell only the content area needs a placeholder. */
function ContentSkeleton() {
  const { t } = useTranslation();
  return (
    <Loading label={t('common.loading')} className="mx-auto flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-9 w-56" /><Skeleton className="h-32 rounded-md" /><Skeleton className="h-32 rounded-md" />
    </Loading>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const loc = useLocation();
  if (me.isPending) return <ContentSkeleton />;
  if (!me.data) return <Navigate replace to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} />;
  return <>{children}</>;
}
