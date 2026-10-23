import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellOff, CheckCheck, Clock, MessageSquareReply, Sparkles, TicketCheck, type LucideIcon } from 'lucide-react';
import { useMarkRead, useNotifications } from '../features/notifications/hooks';
import { ago, fullDate } from '../lib/format';
import type { Notification } from '../lib/types';
import { Button } from '../ui/Button';
import { EmptyState, RetryBlock } from '../ui/EmptyState';
import { PageTitle } from '../ui/PageTitle';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Loading, Skeleton } from '../ui/Skeleton';

const ICON: Record<Notification['type'], { icon: LucideIcon; cls: string }> = {
  agent_reply: { icon: MessageSquareReply, cls: 'bg-accent-soft text-accent' },
  ai_answer: { icon: Sparkles, cls: 'bg-ai-soft text-ai' },
  status: { icon: TicketCheck, cls: 'bg-ok/10 text-ok' },
  sla_breach: { icon: Clock, cls: 'bg-bad/10 text-bad' },
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const q = useNotifications();
  const read = useMarkRead();
  const [show, setShow] = useState<'all' | 'unread'>('all');
  const unread = q.data?.pages[0]?.unreadCount ?? 0;
  const items = (q.data?.pages.flatMap((p) => p.items) ?? []).filter((n) => show === 'all' || !n.readAt);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PageTitle title={t('notifications.title')} className="text-3xl md:text-[40px]" />
          <p className="mt-2 text-ink-2">{unread ? t('notifications.unreadCount', { count: unread }) : t('notifications.emptyTitle')}</p>
        </div>
        {unread > 0 && <Button variant="secondary" pending={read.isPending} onClick={() => read.mutate('all')}><CheckCheck aria-hidden size={17} /> {t('notifications.markAll')}</Button>}
      </div>
      <div className="mt-6">
        <SegmentedControl name="show" legend={t('notifications.show')} value={show} onChange={(v) => setShow(v as typeof show)}
          options={[{ value: 'all', label: t('notifications.all') }, { value: 'unread', label: t('notifications.unreadOnly') }]} />
      </div>
      <section aria-label={t('notifications.title')} className="mt-5">
        {q.isPending ? (
          <Loading label={t('common.loading')} className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}</Loading>
        ) : q.isError ? <RetryBlock onRetry={() => q.refetch()} />
        : !items.length ? (
          <EmptyState icon={<BellOff aria-hidden size={24} />} title={t('notifications.emptyTitle')}>{t('notifications.emptyBody')}</EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface shadow-card">
            {items.map((n) => {
              const { icon: Icon, cls } = ICON[n.type] ?? ICON.status;
              return (
                <li key={n.id}>
                  <Link to={`/tickets/${n.ticketNumber}`} onClick={() => { if (!n.readAt) read.mutate([n.id]); }}
                    className={`group flex gap-3 p-4 transition-colors hover:bg-surface-2/50 sm:p-5 ${n.readAt ? '' : 'bg-accent-soft/30'}`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${cls}`}><Icon aria-hidden size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] ${n.readAt ? 'text-ink-2' : 'font-semibold text-ink'} group-hover:underline group-hover:underline-offset-4`}>
                        {!n.readAt && <span className="sr-only">{t('notifications.unread')} </span>}{n.title}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-2">{n.body}</span>}
                      <span className="mt-1 block text-xs text-muted">
                        <span className="font-display font-semibold tnum">{n.ticketNumber}</span> · <time dateTime={n.createdAt} title={fullDate(n.createdAt)}>{ago(n.createdAt)}</time>
                      </span>
                    </span>
                    {!n.readAt && <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {q.hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" pending={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{t('notifications.older')}</Button>
          </div>
        )}
      </section>
    </div>
  );
}
