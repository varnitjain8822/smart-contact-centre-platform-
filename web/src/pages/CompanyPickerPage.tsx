import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { basenameFor } from '../lib/company';
import { RetryBlock } from '../ui/EmptyState';
import { Loading, Skeleton } from '../ui/Skeleton';
import { LanguageSwitch } from '../features/shell/LanguageSwitch';
import { ThemeToggle } from '../features/shell/ThemeToggle';

/** `/`: one card per company portal (name, sector, tagline, brand swatch). Plain links: each portal is its own page load. */
export default function CompanyPickerPage() {
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ['companies'], queryFn: () => api.companies().then((r) => r.items) });
  useEffect(() => { document.title = t('picker.title'); }, [t, i18n.language]);
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-end gap-1 px-4 pt-4">
        <LanguageSwitch /><ThemeToggle />
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 pb-16 pt-6 md:pt-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink md:text-[44px]">{t('picker.title')}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">{t('picker.lede')}</p>
        {q.isPending ? (
          <Loading label={t('common.loading')} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 rounded-md" />)}
          </Loading>
        ) : q.isError ? (
          <div className="mt-8"><RetryBlock onRetry={() => q.refetch()} /></div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.map((c) => (
              <li key={c.slug} className="min-w-0">
                <a href={basenameFor(c.slug)}
                  className="group flex h-full min-w-0 flex-col rounded-md border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong">
                  <span className="flex min-w-0 w-full items-center gap-3">
                    <span aria-hidden className="size-10 shrink-0 rounded-sm" style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-bold text-ink">{c.name}</span>
                      <span className="block text-sm text-muted">{c.sector}</span>
                    </span>
                  </span>
                  <span className="mt-3 flex-1 text-[15px] text-ink-2">{c.tagline}</span>
                  <span className="mt-4 flex items-center justify-between text-sm font-semibold">
                    {c.demo ? <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs text-ink-2">{t('picker.demo')}</span> : <span />}
                    <ArrowRight aria-hidden size={18} className="text-ink-2 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
