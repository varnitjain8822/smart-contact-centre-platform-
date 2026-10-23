import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { upsertMessage } from './cache';
import type { Message, Notification, TicketDetail, Typing, UiMessage } from './types';
import { addNotification } from '../features/notifications/hooks';

export type LiveStatus = 'connecting' | 'open' | 'reconnecting';

/** One EventSource per tab; events patch the query cache (lld-frontend §12). */
export function useLiveEvents(userId: string | undefined): LiveStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!userId) return;
    const es = new EventSource('/api/stream');
    es.onopen = () => {
      setStatus('open');
      if (wasOpen.current) void qc.invalidateQueries(); // catch-up after reconnect
      wasOpen.current = true;
    };
    es.onerror = () => setStatus('reconnecting'); // browser auto-reconnects (server sends retry: 3000)
    es.addEventListener('message.created', (e) => {
      const d = JSON.parse((e as MessageEvent).data) as { ticketNumber: string; message: Message };
      qc.setQueryData(['messages', d.ticketNumber], (l?: UiMessage[]) => l && upsertMessage(l, d.message));
      if (d.message.author === 'agent') qc.setQueryData(['typing', d.ticketNumber], null);
    });
    es.addEventListener('typing', (e) => {
      const d = JSON.parse((e as MessageEvent).data) as Typing;
      qc.setQueryData(['typing', d.ticketNumber], d.on ? { name: d.name, at: Date.now() } : null);
    });
    es.addEventListener('ticket.updated', (e) => {
      const { ticket } = JSON.parse((e as MessageEvent).data) as { ticket: TicketDetail };
      qc.setQueryData(['ticket', ticket.number], { ticket });
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['overview'] });
    });
    es.addEventListener('notification.created', (e) => {
      const d = JSON.parse((e as MessageEvent).data) as { notification: Notification; unreadCount: number };
      addNotification(qc, d.notification, d.unreadCount);
      void qc.invalidateQueries({ queryKey: ['overview'] });
    });
    // Server restarting: the stream ends and EventSource reconnects (retry: 1000); show it as reconnecting meanwhile.
    es.addEventListener('shutdown', () => setStatus('reconnecting'));
    return () => { es.close(); wasOpen.current = false; };
  }, [userId, qc]);

  // Session may have expired while the stream keeps retrying: re-check `me` every 60 s; a 401 lands on login.
  useEffect(() => {
    if (status !== 'reconnecting') return;
    const id = setInterval(() => void qc.invalidateQueries({ queryKey: ['me'] }), 60_000);
    return () => clearInterval(id);
  }, [status, qc]);

  return status;
}
