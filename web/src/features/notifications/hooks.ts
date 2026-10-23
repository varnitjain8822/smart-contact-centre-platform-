import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Notification, NotificationPage } from '../../lib/types';

type Data = InfiniteData<NotificationPage, string | null>;
const KEY = ['notifications'] as const;

export const useNotifications = (enabled = true) =>
  useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => api.notifications(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor,
    enabled,
  });

const patch = (qc: QueryClient, f: (pages: NotificationPage[]) => NotificationPage[]) =>
  qc.setQueryData<Data>(KEY, (d) => d && { ...d, pages: f(d.pages) });

/** SSE `notification.created`: prepend (dedupe by id) and take the server's unread count. */
export function addNotification(qc: QueryClient, n: Notification, unreadCount: number) {
  patch(qc, ([first, ...rest]) => first
    ? [{ ...first, unreadCount, items: [n, ...first.items.filter((x) => x.id !== n.id)] }, ...rest]
    : []);
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | 'all') => api.readNotifications(ids === 'all' ? { all: true } : { ids }),
    onMutate: (ids) => {
      const at = new Date().toISOString();
      patch(qc, (pages) => pages.map((p) => ({ ...p, items: p.items.map((x) => (ids === 'all' || ids.includes(x.id)) && !x.readAt ? { ...x, readAt: at } : x) })));
    },
    onSuccess: ({ unreadCount }) => patch(qc, (pages) => pages.map((p, i) => (i === 0 ? { ...p, unreadCount } : p))),
  });
}
