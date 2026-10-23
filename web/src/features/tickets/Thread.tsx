import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, Sparkles } from 'lucide-react';
import type { UiMessage } from '../../lib/types';
import { dayLabel } from '../../lib/format';
import { AiMessage } from './AiMessage';
import { MessageBubble } from './MessageBubble';

const toBottom = (behavior: ScrollBehavior = 'auto') => void window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;

/** Chat log. Autoscrolls only if the reader was already at the bottom; otherwise offers "New message ↓". */
/** `typing`: agent name ('' = unnamed) while an agent types, else null. */
export function Thread({ messages, onRetry, aiPending, typing = null }: { messages: UiMessage[]; onRetry(m: UiMessage): void; aiPending?: boolean; typing?: string | null }) {
  const { t } = useTranslation();
  const wasNear = useRef(true);
  const count = useRef(messages.length);
  const [unseen, setUnseen] = useState(false);
  const [away, setAway] = useState(false); // scrolled well up → offer "Jump to latest"

  useEffect(() => {
    const on = () => {
      wasNear.current = nearBottom();
      if (wasNear.current) setUnseen(false);
      setAway(window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 600);
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useLayoutEffect(() => { toBottom(); }, []); // open at latest (actions + composer sit below the log)
  useEffect(() => {
    const added = messages.length > count.current;
    count.current = messages.length;
    if (!added) return;
    const mineLast = messages[messages.length - 1]?.author === 'customer';
    if (wasNear.current || mineLast) requestAnimationFrame(() => toBottom('smooth'));
    else setUnseen(true);
  }, [messages]);

  let lastDay = '';
  return (
    <>
      {/* role=log on a wrapper: on the <ol> itself it strips list semantics and orphans the <li>s (axe listitem) */}
      <div role="log" aria-live="polite" aria-relevant="additions" aria-label={t('thread.label')}>
      <ol className="flex flex-col gap-4">
        {messages.map((m) => {
          const day = dayLabel(m.createdAt);
          const sep = day !== lastDay;
          lastDay = day;
          return (
            <Fragment key={m.clientMessageId ?? m.id}>
              {sep && (
                <li aria-hidden className="sticky top-14 z-10 flex justify-center py-1 md:top-16 xl:top-2">
                  <span className="rounded-pill border border-line bg-bg/90 px-3 py-0.5 text-xs font-semibold text-muted backdrop-blur">{day}</span>
                </li>
              )}
              <li className="arrive">{m.author === 'ai' ? <AiMessage m={m} /> : <MessageBubble m={m} onRetry={onRetry} />}</li>
            </Fragment>
          );
        })}
        {aiPending && (
          <li className="arrive">
            <div className="inline-flex items-center gap-2.5 rounded-md rounded-bl-sm border border-ai/20 bg-ai-soft px-4 py-3 text-sm font-medium text-ai">
              <Sparkles aria-hidden size={16} />
              {t('thread.aiReviewing')}
              <span aria-hidden className="inline-flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-pulse rounded-full bg-ai" style={{ animationDelay: `${i * 200}ms` }} />)}
              </span>
            </div>
          </li>
        )}
        {typing !== null && (
          <li className="arrive">
            <p className="inline-flex items-center gap-2.5 rounded-md rounded-bl-sm border border-line bg-surface px-4 py-3 text-sm font-medium text-ink-2">
              {typing ? t('thread.typing', { name: typing }) : t('thread.typingAnon')}
              <span aria-hidden className="inline-flex gap-1">
                {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-pulse rounded-full bg-ink-2" style={{ animationDelay: `${i * 200}ms` }} />)}
              </span>
            </p>
          </li>
        )}
      </ol>
      </div>
      {(unseen || away) && (
        <button type="button" onClick={() => { toBottom('smooth'); setUnseen(false); }}
          className="arrive fixed bottom-[calc(170px+env(safe-area-inset-bottom))] left-1/2 z-20 inline-flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-pill bg-accent px-4 text-sm font-semibold text-on-accent shadow-card md:bottom-36 print:hidden">
          {t(unseen ? 'thread.newMessage' : 'thread.jumpLatest')} <ArrowDown aria-hidden size={16} />
        </button>
      )}
    </>
  );
}
