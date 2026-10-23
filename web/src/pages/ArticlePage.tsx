import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, ThumbsDown, ThumbsUp } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useMe } from '../features/auth/hooks';
import { useToast } from '../ui/Toast';
import { useKbArticle, useKbArticles } from '../features/kb/hooks';
import type { KbArticle } from '../lib/types';
import { categoryLabel, fullDate } from '../lib/format';
import { buttonClass } from '../ui/Button';
import { PageTitle } from '../ui/PageTitle';
import { Loading, Skeleton, SkeletonText } from '../ui/Skeleton';
import { RetryBlock } from '../ui/EmptyState';
import { NotFoundPanel } from './NotFoundPage';

export default function ArticlePage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const a = useKbArticle(slug);
  const back = from?.startsWith('/tickets/') ? { to: from, label: t('article.backTo', { n: from.split('/').pop() }) } : { to: '/help', label: t('nav.help') };

  if (a.isError && a.error instanceof ApiError && a.error.status === 404)
    return <NotFoundPanel title={t('article.notFound')} body={t('article.notFoundBody')} back={{ to: '/help', label: t('auth.browseHelp') }} />;

  return (
    <article className="mx-auto max-w-2xl">
      <Link to={back.to} className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden size={16} /> {back.label}
      </Link>
      {a.isPending ? (
        <Loading label={t('common.loading')} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-3/4" /><SkeletonText lines={4} className="mt-6" /><SkeletonText lines={3} className="mt-3" />
        </Loading>
      ) : a.isError ? (
        <RetryBlock onRetry={() => a.refetch()} />
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">{categoryLabel(a.data.category)}</p>
          <PageTitle title={a.data.title} className="mt-2 text-[28px] md:text-3xl" />
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><Clock aria-hidden size={14} /> {t('article.readTime', { count: readMinutes(a.data.body) })}</span>
            <span aria-hidden>·</span><span>{t('article.updated', { date: fullDate(a.data.updatedAt) })}</span>
          </p>
          <div className="mt-8 flex flex-col gap-5 text-[17px] leading-[1.7] text-ink">
            {a.data.body.split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
          </div>
          <Helpful key={a.data.slug} a={a.data} />
          <Related a={a.data} />
          <aside className="mt-12 flex flex-col items-start gap-4 rounded-md border border-line bg-surface-2/60 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('article.stuckTitle')}</h2>
              <p className="text-ink-2">{t('article.stuckBody')}</p>
            </div>
            <Link to={`/tickets/new?subject=${encodeURIComponent(a.data.title)}`} className={buttonClass('primary', 'shrink-0')}>{t('common.raiseTicket')}</Link>
          </aside>
        </>
      )}
    </article>
  );
}

/** ~200 words a minute, at least 1. */
export const readMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

/** "Was this helpful?" — one vote per account (server upsert); signed-out readers get a sign-in link. */
function Helpful({ a }: { a: KbArticle }) {
  const { t } = useTranslation();
  const me = useMe().data;
  const qc = useQueryClient();
  const toast = useToast();
  const vote = useMutation({
    mutationFn: (helpful: boolean) => api.kbFeedback(a.slug, helpful),
    // patch the article in every language's cache (lists are arrays and stay untouched)
    onSuccess: ({ feedback }) => qc.setQueriesData<KbArticle>({ queryKey: ['kb'] }, (o) => (o && !Array.isArray(o) && o.slug === a.slug ? { ...o, ...feedback } : o)),
    onError: () => toast(t('toast.actionFailed'), 'bad'),
  });
  const mine = vote.isPending ? vote.variables : a.myVote ?? null;
  return (
    <section aria-labelledby="helpful-h" className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <h2 id="helpful-h" className="mr-1 font-text text-base font-semibold">{t('article.helpful')}</h2>
      {me ? ([true, false] as const).map((v) => {
        const Icon = v ? ThumbsUp : ThumbsDown;
        return (
          <button key={String(v)} type="button" aria-pressed={mine === v} disabled={vote.isPending} onClick={() => vote.mutate(v)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-sm font-semibold transition-colors ${mine === v ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'}`}>
            <Icon aria-hidden size={16} /> {t(v ? 'article.yes' : 'article.no')}
          </button>
        );
      }) : (
        <Link to={`/login?next=${encodeURIComponent(`/help/${a.slug}`)}`} className="inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline">
          {t('article.signInToVote')}
        </Link>
      )}
      {!!a.helpfulCount && <span className="text-sm text-muted">{t('article.helpfulCount', { count: a.helpfulCount })}</span>}
      <p role="status" className="w-full text-sm text-ink-2 empty:hidden">{mine !== null ? t(mine ? 'article.thanksUp' : 'article.thanksDown') : ''}</p>
    </section>
  );
}

function Related({ a }: { a: KbArticle }) {
  const { t } = useTranslation();
  const list = useKbArticles({ category: a.category }).data?.filter((x) => x.slug !== a.slug).slice(0, 3) ?? [];
  if (!list.length) return null;
  return (
    <section aria-labelledby="related-h" className="mt-10">
      <h2 id="related-h" className="mb-3 text-lg font-semibold">{t('article.related')}</h2>
      <ul className="flex flex-col divide-y divide-line rounded-md border border-line bg-surface">
        {list.map((r) => (
          <li key={r.slug}>
            <Link to={`/help/${r.slug}`} className="group block px-4 py-3 hover:bg-surface-2/50">
              <span className="block font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{r.title}</span>
              <span className="line-clamp-1 text-sm text-ink-2">{r.excerpt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
