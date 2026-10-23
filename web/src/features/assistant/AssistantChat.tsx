import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUp, CircleAlert, Clock, RotateCcw, Sparkles, Square, ThumbsDown, ThumbsUp, TicketPlus } from 'lucide-react';
import { useMe } from '../auth/hooks';
import { SourceChips } from '../tickets/SourceChips';
import { Badge } from '../../ui/Badge';
import { Button, buttonClass } from '../../ui/Button';
import { toTicket, useAssistant, type Turn } from './useAssistant';

const PROMPTS = ['assistant.prompt1', 'assistant.prompt2', 'assistant.prompt3'];

/** Streaming chat with the AI assistant. `compact` = launcher panel (no big intro). */
export function AssistantChat({ compact, onNavigate }: { compact?: boolean; onNavigate?(): void }) {
  const { t } = useTranslation();
  const user = useMe().data;
  const a = useAssistant(user?.id ?? 'anon');
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const last = a.turns[a.turns.length - 1];

  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }); }, [a.turns.length, last?.content.length]);
  // Screen readers get each finished answer once, not every streamed token.
  useEffect(() => { if (last?.role === 'assistant' && !last.streaming && last.content) setSaid(last.content); }, [last?.streaming, last?.role, last?.content]);

  const convert = () => { onNavigate?.(); nav('/tickets/new', { state: toTicket(a.turns) }); };
  const submit = (e?: FormEvent) => { e?.preventDefault(); if (!text.trim() || a.streaming) return; void a.send(text); setText(''); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } };
  const hasChat = a.turns.some((x) => x.role === 'user');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasChat && (
        <div className="flex flex-wrap items-center justify-end gap-1 border-b border-line px-3 py-1.5">
          <button type="button" onClick={a.clear} className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink">
            <RotateCcw aria-hidden size={15} /> {t('assistant.newChat')}
          </button>
          <button type="button" onClick={convert} className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-accent hover:bg-accent-soft">
            <TicketPlus aria-hidden size={16} /> {t('assistant.convert')}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-label={t('assistant.log')} role="region" tabIndex={0}>
        {!hasChat && (
          <div className={`flex flex-col ${compact ? 'gap-4' : 'gap-6 pt-4'}`}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ai-soft text-ai"><Sparkles aria-hidden size={19} /></span>
              <div>
                <p className="font-display text-lg font-semibold leading-snug text-ink">{t('assistant.hello', { name: user?.name.split(' ')[0] ?? '' })}</p>
                <p className="mt-1 text-[15px] text-ink-2">{t('assistant.intro')}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t('assistant.tryAsking')}</p>
              <ul className="flex flex-col gap-2">
                {PROMPTS.map((k) => (
                  <li key={k}>
                    <button type="button" onClick={() => void a.send(t(k))} disabled={a.streaming}
                      className="w-full rounded-md border border-line bg-surface px-4 py-3 text-left text-[15px] font-medium text-ink transition-colors hover:border-ai/50 hover:bg-ai-soft/50">
                      {t(k)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <ol className="flex flex-col gap-4">
          {a.turns.map((x) => (
            <li key={x.id}>{x.role === 'user' ? <UserBubble turn={x} /> : <AnswerBubble turn={x} onRate={(v) => a.rate(x.id, v)} onConvert={convert} />}</li>
          ))}
        </ol>
        {a.banner && <BannerCard banner={a.banner} onConvert={hasChat ? convert : undefined} onNavigate={onNavigate} />}
        <div ref={end} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">{a.streaming ? t('assistant.thinking') : said}</p>

      <form onSubmit={submit} className="border-t border-line bg-surface/80 p-3">
        <label htmlFor="assistant-input" className="sr-only">{t('assistant.inputLabel')}</label>
        <div className="flex items-end gap-2 rounded-md border border-line-strong bg-surface p-1.5 pl-3.5 transition-colors focus-within:border-ai">
          <textarea id="assistant-input" ref={input} rows={1} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} onKeyDown={key}
            placeholder={t('assistant.placeholder')} autoFocus={compact}
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none [field-sizing:content]" />
          {a.streaming ? (
            <button type="button" onClick={a.stop} aria-label={t('assistant.stop')}
              className="grid size-11 shrink-0 place-items-center rounded-pill bg-ink text-bg"><Square aria-hidden size={15} fill="currentColor" /></button>
          ) : (
            <button type="submit" disabled={!text.trim()} aria-label={t('assistant.send')}
              className="grid size-11 shrink-0 place-items-center rounded-pill bg-ai text-on-accent transition-opacity disabled:opacity-35"><ArrowUp aria-hidden size={19} /></button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-xs text-muted">{t('assistant.disclaimer')}</p>
      </form>
    </div>
  );
}

function UserBubble({ turn }: { turn: Turn }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-end">
      <p className="sr-only">{t('actor.customer')}:</p>
      <div className="max-w-[88%] whitespace-pre-wrap rounded-md rounded-br-sm bg-accent-soft px-4 py-2.5 text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">{turn.content}</div>
    </div>
  );
}

function AnswerBubble({ turn, onRate, onConvert }: { turn: Turn; onRate(v: 'up' | 'down'): void; onConvert(): void }) {
  const { t } = useTranslation();
  const thinking = turn.streaming && !turn.content;
  return (
    <div className="flex flex-col items-start gap-2">
      <div aria-busy={turn.streaming || undefined}
        className="relative w-full max-w-[94%] overflow-hidden rounded-md rounded-bl-sm border border-ai/20 bg-ai-soft px-4 py-3 pl-5">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-ai" />
        <Badge tone="ai"><Sparkles aria-hidden size={12} /> {t('ai.badge')}</Badge>
        {thinking ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ai">
            {t('assistant.thinking')}
            <span aria-hidden className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-pulse rounded-full bg-ai" style={{ animationDelay: `${i * 200}ms` }} />)}</span>
          </p>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink [overflow-wrap:anywhere]">
            <span className="sr-only">{t('ai.said')} </span>{turn.content}
            {turn.streaming && <span aria-hidden className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-ai" />}
          </p>
        )}
        {turn.interrupted && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-bad"><CircleAlert aria-hidden size={15} /> {t('assistant.interrupted')}</p>
        )}
        {!!turn.sources?.length && (
          <div className="mt-3 border-t border-ai/15 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{t('suggest.basedOn')}</p>
            <SourceChips sources={turn.sources} />
          </div>
        )}
      </div>
      {!turn.streaming && turn.content && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1">
          <span className="text-sm text-muted">{t('assistant.helpful')}</span>
          {(['up', 'down'] as const).map((v) => {
            const Icon = v === 'up' ? ThumbsUp : ThumbsDown;
            return (
              <button key={v} type="button" aria-pressed={turn.helpful === v} onClick={() => onRate(v)} aria-label={t(v === 'up' ? 'assistant.yes' : 'assistant.no')}
                className={`grid size-11 place-items-center rounded-pill transition-colors ${turn.helpful === v ? 'bg-ai-soft text-ai' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}>
                <Icon aria-hidden size={17} className={turn.helpful === v ? 'fill-current' : ''} />
              </button>
            );
          })}
          {turn.helpful && <span role="status" className="text-sm text-ink-2">{t('assistant.thanks')}</span>}
        </div>
      )}
      {!turn.streaming && (turn.suggestTicket || turn.helpful === 'down') && (
        <div className="flex w-full max-w-[94%] flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
          <p className="text-[15px] text-ink">{t('assistant.suggestTicket')}</p>
          <Button onClick={onConvert} className="!min-h-10 !px-4 text-sm"><TicketPlus aria-hidden size={16} /> {t('assistant.convert')}</Button>
        </div>
      )}
    </div>
  );
}

function BannerCard({ banner, onConvert, onNavigate }: { banner: NonNullable<ReturnType<typeof useAssistant>['banner']>; onConvert?(): void; onNavigate?(): void }) {
  const { t } = useTranslation();
  const rate = banner.kind === 'rate';
  return (
    <div role="alert" className={`mt-4 rounded-md border p-4 ${rate ? 'border-warn/30 bg-warn/10' : 'border-line bg-surface'}`}>
      <p className="flex items-center gap-2 font-semibold text-ink">
        {rate ? <Clock aria-hidden size={18} className="text-warn" /> : <CircleAlert aria-hidden size={18} className="text-bad" />}
        {t(rate ? 'assistant.rateTitle' : 'assistant.unavailableTitle')}
      </p>
      <p className="mt-1 text-[15px] text-ink-2">
        {rate ? (banner.retryAfterS ? t('assistant.rateBodyIn', { s: banner.retryAfterS }) : t('assistant.rateBody')) : t('assistant.unavailableBody')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onConvert ? <Button onClick={onConvert} className="!min-h-10 !px-4 text-sm"><TicketPlus aria-hidden size={16} /> {t('assistant.convert')}</Button>
          : <Link to="/tickets/new" onClick={onNavigate} className={buttonClass('primary', '!min-h-10 !px-4 text-sm')}>{t('common.raiseTicket')}</Link>}
        <Link to="/help" onClick={onNavigate} className={buttonClass('secondary', '!min-h-10 !px-4 text-sm')}>{t('assistant.toHelp')}</Link>
      </div>
    </div>
  );
}
