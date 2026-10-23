import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { UiMessage } from '../../lib/types';
import { time } from '../../lib/format';
import { Badge } from '../../ui/Badge';
import { SourceChips } from './SourceChips';

export function AiMessage({ m }: { m: UiMessage }) {
  const { t } = useTranslation();
  const [sourcesOpen, setOpen] = useState(false);
  const id = useId();
  const n = m.sources.length;
  return (
    <div className="flex flex-col items-start">
      <div className="relative w-full max-w-[92%] overflow-hidden rounded-md rounded-bl-sm border border-ai/20 bg-ai-soft px-4 py-3 pl-5 md:max-w-[80%]">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-ai" />
        <div className="flex items-center gap-2">
          <Badge tone="ai"><Sparkles aria-hidden size={12} /> {t('ai.badge')}</Badge>
          <time dateTime={m.createdAt} className="text-xs text-muted">{time(m.createdAt)}</time>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">
          <span className="sr-only">{t('ai.said')} </span>{m.body}
        </p>
        {n > 0 && (
          <div className="mt-2 border-t border-ai/15 pt-1">
            <button type="button" aria-expanded={sourcesOpen} aria-controls={id} onClick={() => setOpen(!sourcesOpen)}
              className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-sm font-semibold text-ai hover:underline hover:underline-offset-4">
              {t('ai.basedOn', { count: n })}
              <ChevronDown aria-hidden size={16} className={`transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id={id} hidden={!sourcesOpen} className="pb-2 pt-1"><SourceChips sources={m.sources} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
