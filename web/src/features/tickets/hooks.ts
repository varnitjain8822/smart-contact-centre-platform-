import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { upsertMessage } from '../../lib/cache';
import type { Attachment, Category, TicketDetail, TicketFilters, UiMessage } from '../../lib/types';
import { useDebounced } from '../../lib/useDebounced';
import { useToast } from '../../ui/Toast';
import i18n from '../../i18n';

export const TYPING_TTL_MS = 30_000;

/** Agent typing on this ticket (SSE `typing`, see lib/live.ts): the agent's name ('' if unknown) or null. Clears itself after 30 s without "off". */
export function useTyping(n: string): string | null {
  const qc = useQueryClient();
  const { data } = useQuery<{ name: string; at: number } | null>({ queryKey: ['typing', n], queryFn: () => null, enabled: false, initialData: null });
  useEffect(() => {
    if (!data) return;
    const id = setTimeout(() => qc.setQueryData(['typing', n], null), TYPING_TTL_MS - (Date.now() - data.at));
    return () => clearTimeout(id);
  }, [data, n, qc]);
  return data ? data.name : null;
}

const rateMsg = (e: ApiError) => (e.retryAfterS ? i18n.t('common.rateLimitedIn', { s: e.retryAfterS }) : i18n.t('common.rateLimited'));

/** Server-filtered, server-sorted, cursor-paged. No status filter → every ticket (scope=all). */
export const useTickets = (f: TicketFilters, limit = 20) =>
  useInfiniteQuery({
    queryKey: ['tickets', f, limit],
    queryFn: ({ pageParam }) => api.listTickets({ ...f, scope: f.status?.length ? undefined : 'all' }, pageParam, limit),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor,
  });

export const useTicket = (n: string, enabled = true) =>
  useQuery({ queryKey: ['ticket', n], queryFn: () => api.getTicket(n), select: (r) => r.ticket, enabled });

export const useMessages = (n: string) =>
  useQuery<UiMessage[]>({ queryKey: ['messages', n], queryFn: () => api.getMessages(n).then((r) => r.items) });

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: api.overview });

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idemKey, ...v }: { subject: string; description: string; category: Category | null; attachmentIds?: string[]; idemKey: string }) =>
      api.createTicket(v, idemKey),
    onSuccess: ({ ticket, messages }) => {
      qc.setQueryData(['ticket', ticket.number], { ticket });
      qc.setQueryData(['messages', ticket.number], messages);
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

const patchMessages = (qc: QueryClient, n: string, f: (l: UiMessage[]) => UiMessage[]) =>
  qc.setQueryData<UiMessage[]>(['messages', n], (l = []) => f(l));

/** Optimistic send (lld-frontend §12): tmp bubble → server message, or failed + retry with the same clientMessageId. */
export function useSendMessage(n: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: ({ body, cid, files }: { body: string; cid: string; files: Attachment[] }) => api.sendMessage(n, body, cid, files.map((f) => f.id)),
    onMutate: ({ body, cid, files }) => patchMessages(qc, n, (l) => {
      const rest = l.filter((x) => x.clientMessageId !== cid);
      const prev = l.find((x) => x.clientMessageId === cid);
      const tmp: UiMessage = { id: `tmp-${cid}`, ticketNumber: n, author: 'customer', authorName: 'You', body, sources: [],
        createdAt: prev?.createdAt ?? new Date().toISOString(), clientMessageId: cid, deliveryState: 'pending', attachments: files };
      return [...rest, tmp].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }),
    onSuccess: ({ message }) => patchMessages(qc, n, (l) => upsertMessage(l, message)),
    onError: (e, { cid }) => {
      patchMessages(qc, n, (l) => l.map((x) => (x.clientMessageId === cid && x.id.startsWith('tmp-') ? { ...x, localState: 'failed' } : x)));
      if (e instanceof ApiError && e.code === 'RATE_LIMITED') toast(rateMsg(e), 'bad');
    },
  });
  return {
    send: (body: string, files: Attachment[] = []) => m.mutate({ body, cid: crypto.randomUUID(), files }),
    retry: (msg: UiMessage) => msg.clientMessageId && m.mutate({ body: msg.body, cid: msg.clientMessageId, files: msg.attachments ?? [] }),
  };
}

/** 409 on stale state → refetch + toast (lld-frontend §15). */
function useConflict(n: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return (e: unknown) => {
    if (e instanceof ApiError && (e.code === 'INVALID_STATE' || e.code === 'ALREADY_RATED')) {
      void qc.invalidateQueries({ queryKey: ['ticket', n] });
      toast(i18n.t('toast.ticketChanged'));
    } else if (e instanceof ApiError && e.code === 'RATE_LIMITED') toast(rateMsg(e), 'bad');
    else toast(i18n.t('toast.actionFailed'), 'bad');
  };
}

export function useTicketAction(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: 'accept' | 'handoff' | 'resolve') => api.action(n, a),
    onSuccess: (r) => { qc.setQueryData(['ticket', n], r); void qc.invalidateQueries({ queryKey: ['tickets'] }); },
    onError: useConflict(n),
  });
}

export function useRateTicket(n: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment: string }) => api.rate(n, rating, comment),
    onSuccess: (r: { ticket: TicketDetail }) => qc.setQueryData(['ticket', n], r),
    onError: useConflict(n),
  });
}

/** Debounced 800 ms; stale requests aborted via the query's AbortSignal (lld-frontend §10). */
export function useSuggestion(subject: string, description: string) {
  const s = useDebounced(subject.trim(), 800);
  const d = useDebounced(description.trim(), 800);
  return useQuery({
    queryKey: ['suggest', s, d],
    queryFn: ({ signal }) => api.suggest(s, d, signal),
    enabled: d.length >= 20,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
