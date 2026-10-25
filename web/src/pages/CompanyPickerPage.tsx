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
import { Building2, Landmark, Plane, ShieldCheck, Sparkles, Truck } from 'lucide-react';

const companyDomainIcon = (slug: string) => {
  switch (slug) {
    case 'sbi': return <Landmark size={22} className="text-white" />;
    case 'tatasteel': return <Truck size={22} className="text-white" />;
    case 'delhiairport': return <Plane size={22} className="text-white" />;
    case 'passportseva': return <ShieldCheck size={22} className="text-white" />;
    case 'infosys': return <Building2 size={22} className="text-white" />;
    default: return <Sparkles size={22} className="text-white" />;
  }
};

const companyBadgeLabel = (slug: string) => {
  switch (slug) {
    case 'sbi': return 'Banking & Finance';
    case 'tatasteel': return 'Steel & Supply Chain';
    case 'delhiairport': return 'Aviation & Airport Ops';
    case 'passportseva': return 'Official Consular Portal';
    case 'infosys': return 'Enterprise IT & Services';
    default: return 'Omnichannel AI Support';
  }
};

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
                  className="group flex h-full min-w-0 flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all hover:border-sky-500/50 hover:shadow-md hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span
                      aria-hidden
                      className="grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }}
                    >
                      {companyDomainIcon(c.slug)}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted border border-line/60">
                      {companyBadgeLabel(c.slug)}
                    </span>
                  </div>
                  <div className="mt-4 flex-1 min-w-0">
                    <span className="block truncate font-display text-xl font-extrabold text-ink group-hover:text-sky-600 transition-colors">
                      {c.name}
                    </span>
                    <span className="block text-xs font-semibold text-muted uppercase tracking-wider mt-0.5">{c.sector}</span>
                    <p className="mt-2.5 text-sm text-ink-2 leading-relaxed">{c.tagline}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-line/50 text-xs font-bold text-sky-600">
                    <span>Enter {c.name} Portal &gt;</span>
                    <ArrowRight aria-hidden size={16} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
