import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import type { KbArticleSummary } from '../../lib/types';
import { categoryLabel } from '../../lib/format';

/** Wrap each search word (2+ chars, case-insensitive) in <mark>. */
export function Highlight({ text, q }: { text: string; q?: string }) {
  const words = (q ?? '').split(/\s+/).filter((w) => w.length >= 2).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.join('|')})`, 'gi');
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="rounded-[3px] bg-warn/20 px-0.5 text-ink">{part}</mark> : <Fragment key={i}>{part}</Fragment>))}</>;
}

export function ArticleList({ articles, highlight, showCategory = true }: { articles: KbArticleSummary[]; highlight?: string; showCategory?: boolean }) {
  useTranslation(); // re-render on language change
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface shadow-card">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link to={`/help/${a.slug}`} className="group flex items-start gap-3 p-4 transition-colors hover:bg-surface-2/50 sm:p-5">
            <span className="min-w-0 flex-1">
              {showCategory && <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted">{categoryLabel(a.category)}</span>}
              <span className="block text-[17px] font-semibold leading-snug text-ink group-hover:underline group-hover:underline-offset-4"><Highlight text={a.title} q={highlight} /></span>
              <span className="mt-1 line-clamp-2 block text-[15px] text-ink-2"><Highlight text={a.excerpt} q={highlight} /></span>
            </span>
            <ArrowUpRight aria-hidden size={18} className="mt-6 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
