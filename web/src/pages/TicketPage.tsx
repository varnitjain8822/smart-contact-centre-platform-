import { useEffect, useReducer } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useNow } from '../lib/useNow';
import { useMessages, useRateTicket, useSendMessage, useTicket, useTicketAction, useTyping } from '../features/tickets/hooks';
import { Composer } from '../features/tickets/Composer';
import { CsatCard } from '../features/tickets/CsatCard';
import { DeliveryBanner } from '../features/tickets/DeliveryBanner';
import { DetailsPanel } from '../features/tickets/DetailsPanel';
import { SlaChip } from '../features/tickets/SlaChip';
import { Thread } from '../features/tickets/Thread';
import { TicketActions } from '../features/tickets/TicketActions';
import { TicketHeader } from '../features/tickets/TicketHeader';
import { RetryBlock } from '../ui/EmptyState';
import { Loading, Skeleton } from '../ui/Skeleton';
import { NotFoundPanel } from './NotFoundPage';

const AI_WAIT_MS = 30_000;

export default function TicketPage() {
  const { t: tr } = useTranslation();
  const { number: raw = '' } = useParams();
  const n = raw.toUpperCase();
  const ticket = useTicket(n);
  const messages = useMessages(n); // opening the thread also triggers server-side reconcile (REQ-045)
  const send = useSendMessage(n);
  const action = useTicketAction(n);
  const rate = useRateTicket(n);
  const now = useNow(30_000);
  const typing = useTyping(n);

  // "AI assistant is reviewing…" while AI owns the ticket and the customer spoke last < 30 s ago.
  const t = ticket.data;
  const sent = messages.data?.filter((m) => !m.localState);
  const last = sent?.[sent.length - 1];
  const age = last ? Date.now() - Date.parse(last.createdAt) : Infinity;
  const aiPending = t?.status === 'ai_handling' && last?.author === 'customer' && age < AI_WAIT_MS;
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!aiPending || !last) return;
    const id = setTimeout(rerender, AI_WAIT_MS - (Date.now() - Date.parse(last.createdAt)) + 50);
    return () => clearTimeout(id);
  }, [aiPending, last]);

  if (raw !== n) return <Navigate replace to={`/tickets/${n}`} />;
  const err = ticket.error ?? messages.error;
  if (err instanceof ApiError && err.status === 404)
    return <NotFoundPanel code={n} title={tr('ticket.notFound')} body={tr('ticket.notFoundBody', { n })} back={{ to: '/', label: tr('notFound.toTickets') }} />;

  if (!t)
    return (
      <div className="mx-auto max-w-3xl">
        {err ? <RetryBlock onRetry={() => { void ticket.refetch(); void messages.refetch(); }} />
          : <Loading label={tr('ticket.loading')}><ThreadSkeleton /></Loading>}
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl xl:grid xl:max-w-6xl xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
      <div className="flex min-w-0 flex-col">
        <TicketHeader t={t} />
        <div className="mt-5 flex flex-col gap-3 empty:hidden"><DeliveryBanner delivery={t.delivery} /></div>

        <details className="group mt-5 rounded-md border border-line bg-surface xl:hidden print:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <SlaChip sla={t.sla} now={now} start={t.createdAt} />
            <span className="ml-auto text-sm font-semibold text-ink-2">{tr('ticket.detailsHistory')}</span>
            <ChevronDown aria-hidden size={18} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line p-4"><DetailsPanel t={t} now={now} /></div>
        </details>

        <div className="mt-8">
          {messages.data ? (
            <Thread messages={messages.data} onRetry={send.retry} aiPending={aiPending} typing={typing} />
          ) : messages.isError ? (
            <RetryBlock onRetry={() => messages.refetch()} />
          ) : (
            <BubbleSkeletons />
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 empty:hidden print:hidden">
          <TicketActions actions={t.actions} pending={action.isPending ? action.variables : null} onAction={(a) => action.mutate(a)} />
          <CsatCard canRate={t.actions.canRate} csat={t.csat} pending={rate.isPending}
            onRate={(rating, comment) => rate.mutate({ rating, comment })} />
        </div>

        <Composer ticket={n} disabled={ticket.isPending} onSend={send.send}
          placeholder={tr(t.status === 'resolved' ? 'ticket.replyReopen' : 'ticket.replyPlaceholder')} />
      </div>

      <aside aria-label={tr('ticket.details')} className="hidden xl:block print:hidden">
        <div className="sticky top-10"><DetailsPanel t={t} now={now} /></div>
      </aside>
    </div>
  );
}

function BubbleSkeletons() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <Skeleton className="ml-auto h-16 w-3/4 rounded-md" />
      <Skeleton className="h-24 w-4/5 rounded-md" />
      <Skeleton className="ml-auto h-12 w-1/2 rounded-md" />
      <Skeleton className="h-20 w-2/3 rounded-md" />
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-3/4" />
      <Skeleton className="mt-3 h-7 w-48 rounded-pill" />
      <div className="mt-10"><BubbleSkeletons /></div>
    </>
  );
}
