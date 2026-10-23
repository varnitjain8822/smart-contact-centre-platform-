import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useSuggestion } from './hooks';
import { SourceChips } from './SourceChips';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

/** Margin note beside the description. Never blocks submit: errors and empty results just hide it. */
export function SuggestionPanel({ subject, description }: { subject: string; description: string }) {
  const { t } = useTranslation();
  const s = useSuggestion(subject, description);
  const nav = useNavigate();
  if (s.isFetching && !s.data)
    return (
      <div role="status" className="arrive rounded-md border border-ai/20 bg-ai-soft/60 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ai"><Sparkles aria-hidden size={16} /> {t('suggest.looking')}</p>
        <div aria-hidden className="shimmer mt-3 h-3 rounded-pill" />
        <div aria-hidden className="shimmer mt-2 h-3 w-2/3 rounded-pill" />
      </div>
    );
  const d = s.data;
  if (!d || s.isError || (!d.answer && !d.articles.length)) return null;
  const firstSlug = d.sources[0]?.slug;
  return (
    <section aria-labelledby="sugg-h" aria-live="polite" className="arrive relative overflow-hidden rounded-md border border-ai/25 bg-ai-soft/60 p-4 sm:p-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-ai" />
      {d.answer ? (
        <>
          <div className="flex items-center gap-2"><Badge tone="ai"><Sparkles aria-hidden size={12} /> {t('ai.badge')}</Badge></div>
          <h2 id="sugg-h" className="mt-3 font-text text-base font-semibold">{t('suggest.title')}</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{d.answer}</p>
          {d.sources.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t('suggest.basedOn')}</p>
              <SourceChips sources={d.sources} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ai/15 pt-4">
            <Button variant="ai" onClick={() => nav(firstSlug ? `/help/${firstSlug}` : '/')}>{t('suggest.answers')}</Button>
            <span className="text-sm text-ink-2">{t('suggest.notQuite')}</span>
          </div>
        </>
      ) : (
        <>
          <h2 id="sugg-h" className="font-text text-base font-semibold">{t('suggest.articles')}</h2>
          <ul className="mt-2 flex flex-col">
            {d.articles.slice(0, 3).map((a) => (
              <li key={a.slug}>
                <Link to={`/help/${a.slug}`} className="flex min-h-11 flex-col justify-center rounded-sm py-1.5 hover:underline hover:underline-offset-4">
                  <span className="font-medium text-ink">{a.title}</span>
                  <span className="line-clamp-1 text-sm text-ink-2">{a.excerpt}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
