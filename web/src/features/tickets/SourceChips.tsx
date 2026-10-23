import { Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import type { Source } from '../../lib/types';

/** Cited help articles; opening one remembers the ticket so the article can link back. */
export function SourceChips({ sources }: { sources: Source[] }) {
  const from = useLocation().pathname;
  return (
    <ul className="flex flex-wrap gap-2">
      {sources.map((s) => (
        <li key={s.slug} className="min-w-0 max-w-full">
          <Link to={`/help/${s.slug}`} state={{ from }}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-pill border border-ai/25 bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:border-ai/60 hover:text-ai">
            <BookOpen aria-hidden size={15} className="shrink-0 text-ai" />
            <span className="truncate">{s.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
