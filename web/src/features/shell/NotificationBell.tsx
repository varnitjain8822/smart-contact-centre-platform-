import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff } from 'lucide-react';
import { ago } from '../../lib/format';
import { setUnreadTitle } from '../../lib/title';
import { useMarkRead, useNotifications } from '../notifications/hooks';
import { Popover } from '../../ui/Popover';
import { EmptyState } from '../../ui/EmptyState';

export type NotificationItem = { id: string; title: string; body?: string; at: string; read: boolean; ticket?: string };

/** Props-driven; Phase 5 supplies data. Clicking an item calls `onOpen` (mark read + go to ticket) and closes. */
export function NotificationBell({ unread = 0, items = [], onOpen, onMarkAllRead, allHref }: {
  unread?: number; items?: NotificationItem[]; onOpen?(n: NotificationItem): void; onMarkAllRead?(): void; allHref?: string;
}) {
  const { t } = useTranslation();
  return (
    <Popover label={t('notifications.title')} className="w-[22rem]"
      trigger={(p) => (
        <button type="button" {...p} aria-label={unread ? t('notifications.labelUnread', { count: unread }) : t('notifications.title')}
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <Bell aria-hidden size={20} strokeWidth={1.75} />
          {unread > 0 && (
            <span aria-hidden className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-pill bg-bad px-1 text-[11px] font-bold leading-none text-white ring-2 ring-bg tnum">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}>
      {(close) => (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="font-text text-base font-semibold">{t('notifications.title')}</h2>
            {unread > 0 && onMarkAllRead && (
              <button type="button" onClick={onMarkAllRead} className="min-h-9 rounded-sm px-1 text-sm font-semibold text-accent hover:underline">
                {t('notifications.markAll')}
              </button>
            )}
          </div>
          {items.length ? (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => { onOpen?.(n); close(); }}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60">
                    <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] ${n.read ? 'text-ink-2' : 'font-semibold text-ink'}`}>
                        {!n.read && <span className="sr-only">{t('notifications.unread')} </span>}{n.title}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-2">{n.body}</span>}
                      <span className="mt-1 block text-xs text-muted">{ago(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact as="h3" icon={<BellOff aria-hidden size={20} />} title={t('notifications.emptyTitle')}>
              <p className="text-sm">{t('notifications.emptyBody')}</p>
            </EmptyState>
          )}
          {allHref && (
            <Link to={allHref} onClick={close} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-accent hover:bg-surface-2/60">
              {t('notifications.seeAll')}
            </Link>
          )}
        </>
      )}
    </Popover>
  );
}

/** The bell wired to /api/notifications (+ live SSE via useLiveEvents); also owns the "(n)" tab-title prefix. */
export function LiveBell() {
  const q = useNotifications();
  const read = useMarkRead();
  const nav = useNavigate();
  const first = q.data?.pages[0];
  const unread = first?.unreadCount ?? 0;
  useEffect(() => { setUnreadTitle(unread); return () => setUnreadTitle(0); }, [unread]);
  const items = (first?.items ?? []).slice(0, 8).map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.createdAt, read: !!n.readAt, ticket: n.ticketNumber }));
  return (
    <NotificationBell unread={unread} items={items} allHref="/notifications"
      onMarkAllRead={() => read.mutate('all')}
      onOpen={(n) => { if (!n.read) read.mutate([n.id]); if (n.ticket) nav(`/tickets/${n.ticket}`); }} />
  );
}
