import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useKbArticles } from '../features/kb/hooks';
import { ArticleList } from '../features/kb/ArticleList';
import { categoryIcon, CategoryGrid } from '../features/kb/CategoryGrid';
import { KbSearchBox } from '../features/kb/KbSearchBox';
import type { Category } from '../lib/types';
import { categoryKeys } from '../lib/company';
import { buttonClass } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { PageTitle } from '../ui/PageTitle';
import { Loading, Skeleton } from '../ui/Skeleton';
import { categoryLabel } from '../lib/format';
import { RetryBlock } from '../ui/EmptyState';

export default function HelpPage() {
  const { t } = useTranslation();
  const [sp] = useSearchParams();
  const q = sp.get('q')?.trim() ?? '';
  const c = sp.get('category');
  const category = categoryKeys().includes(c as Category) ? (c as Category) : null;
  const filtered = Boolean(q || category);
  const all = useKbArticles({});
  const list = useKbArticles({ q, category });
  const shown = filtered ? list : all;
  const title = q ? t('help.resultsFor', { q }) : category ? categoryLabel(category) : t('nav.help');

  return (
    <div className="mx-auto max-w-3xl xl:max-w-4xl">
      {filtered && (
        <Link to="/help" className="-ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft aria-hidden size={16} /> {t('help.allTopics')}
        </Link>
      )}
      {category && !q ? (
        <CategoryHeader category={category} count={shown.data?.length} />
      ) : (
        <PageTitle title={title} className={filtered ? 'text-2xl md:text-3xl' : 'text-3xl md:text-[44px]'} />
      )}
      {!filtered && <p className="mt-3 max-w-xl text-lg text-ink-2">{t('help.lede')}</p>}
      <div className="mt-6"><KbSearchBox key={q} initial={q} size={filtered ? 'md' : 'lg'} /></div>

      <section aria-labelledby="kb-list" className="mt-10">
        <h2 id="kb-list" className={filtered ? 'sr-only' : 'mb-4 text-xl font-semibold'}>{filtered ? t('help.articles') : t('help.browse')}</h2>
        {shown.isPending ? (
          <Loading label={t('common.loading')} className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}
          </Loading>
        ) : shown.isError ? (
          <RetryBlock onRetry={() => shown.refetch()} />
        ) : !shown.data.length ? (
          <EmptyState icon={<SearchX aria-hidden size={26} />} title={t('help.noMatchTitle')}
            actions={<Link to={`/tickets/new${q ? `?subject=${encodeURIComponent(q)}` : ''}`} className={buttonClass('primary')}>{t('common.raiseTicket')}</Link>}>
            {t('help.noMatchBody')}
          </EmptyState>
        ) : filtered ? (
          <>
            {q && <p className="mb-3 text-sm text-muted">{t('help.count', { count: shown.data.length })}</p>}
            <ArticleList articles={shown.data} highlight={q} showCategory={!category || !!q} />
          </>
        ) : (
          <CategoryGrid articles={shown.data} />
        )}
      </section>
      {category && !q && (
        <nav aria-labelledby="other-topics" className="mt-10">
          <h2 id="other-topics" className="mb-3 text-lg font-semibold">{t('help.otherTopics')}</h2>
          <ul className="flex flex-wrap gap-2">
            {categoryKeys().filter((c) => c !== category).map((c) => {
              const Icon = categoryIcon(c);
              return (
                <li key={c}>
                  <Link to={`/help?category=${encodeURIComponent(c)}`} className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink-2 hover:border-line-strong hover:text-ink">
                    <Icon aria-hidden size={16} /> {categoryLabel(c)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

/** Topic landing: icon tile, name, article count. */
function CategoryHeader({ category, count }: { category: Category; count?: number }) {
  const { t } = useTranslation();
  const Icon = categoryIcon(category);
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-14 shrink-0 place-items-center rounded-md bg-accent-soft text-accent"><Icon aria-hidden size={26} strokeWidth={1.75} /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t('help.topic')}</p>
        <PageTitle title={categoryLabel(category)} className="text-2xl md:text-3xl" />
        {count !== undefined && <p className="text-sm text-ink-2">{t('help.count', { count })}</p>}
      </div>
    </div>
  );
}
