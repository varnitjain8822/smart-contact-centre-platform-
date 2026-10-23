import { AlertCircle, Check, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UiMessage } from '../../lib/types';
import { time } from '../../lib/format';
import { Avatar } from '../../ui/Avatar';
import { Attachments } from './Attachments';

export function MessageBubble({ m, onRetry }: { m: UiMessage; onRetry?(m: UiMessage): void }) {
  const { t } = useTranslation();
  if (m.author === 'system')
    return (
      <div className="flex items-center gap-3 py-1 text-sm text-muted">
        <span aria-hidden className="h-px flex-1 bg-line" />
        <p className="max-w-[80%] text-center">{m.body} <span className="whitespace-nowrap">· {time(m.createdAt)}</span></p>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
    );
  const mine = m.author === 'customer';
  const failed = m.localState === 'failed';
  const name = m.authorName || t('actor.agent');
  return (
    <div className={`flex gap-2.5 ${mine ? 'justify-end' : ''}`}>
    {!mine && <span className="mt-6"><Avatar name={name} size="sm" /></span>}
    <div className={`flex min-w-0 flex-1 flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <p className="mb-1 px-1 text-sm font-semibold text-ink-2">{mine ? t('actor.customer') : m.authorName ? <>{name} <span className="font-normal text-muted">· {t('actor.agent')}</span></> : name}{!mine && <span className="sr-only"> {t('message.said')}</span>}</p>
      <div className={`max-w-[88%] whitespace-pre-wrap rounded-md px-4 py-3 text-[15px] leading-relaxed [overflow-wrap:anywhere] md:max-w-[75%]
        ${mine ? `rounded-br-sm bg-accent-soft text-ink ${failed ? 'ring-1 ring-bad' : ''}` : 'rounded-bl-sm border border-line bg-surface text-ink shadow-card'}
        ${m.deliveryState === 'pending' && m.id.startsWith('tmp-') && !failed ? 'opacity-70' : ''}`}>
        {m.body}
      </div>
      {!!m.attachments?.length && <Attachments items={m.attachments} align={mine ? 'end' : 'start'} />}
      <div className="mt-1 flex items-center gap-1.5 px-1 text-xs text-muted">
        {failed ? (
          <span className="inline-flex items-center gap-1 font-semibold text-bad">
            <AlertCircle aria-hidden size={14} /> {t('message.notDelivered')} ·
            <button type="button" onClick={() => onRetry?.(m)}
              className="-my-3 inline-flex min-h-11 items-center gap-1 rounded-sm px-1 font-semibold text-bad underline underline-offset-2 hover:no-underline">
              <RotateCw aria-hidden size={13} /> {t('common.retry')}
            </button>
          </span>
        ) : (
          <>
            <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
            {mine && (m.deliveryState === 'pending'
              ? <span>· {t('message.sending')}</span>
              : <span className="inline-flex items-center gap-0.5">· <Check aria-hidden size={13} /> {t('message.sent')}</span>)}
          </>
        )}
      </div>
    </div>
    </div>
  );
}
