import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLiveEvents } from '../src/lib/live';
import { msg, newQc, ticket, wrap } from './helpers';

class FakeES {
  static last: FakeES;
  onopen?: () => void;
  onerror?: () => void;
  listeners: Record<string, (e: { data: string }) => void> = {};
  closed = false;
  constructor(public url: string) { FakeES.last = this; }
  addEventListener(t: string, f: (e: { data: string }) => void) { this.listeners[t] = f; }
  close() { this.closed = true; }
  emit(t: string, d: unknown) { this.listeners[t]!({ data: JSON.stringify(d) }); }
}

describe('useLiveEvents', () => {
  it('upserts message.created once, sets ticket on ticket.updated, invalidates on reopen', () => {
    vi.stubGlobal('EventSource', FakeES);
    const qc = newQc();
    qc.setQueryData(['messages', 'SC-1'], [msg({ id: 'a' })]);
    const inv = vi.spyOn(qc, 'invalidateQueries');
    const { result, unmount } = renderHook(() => useLiveEvents('u1'), { wrapper: wrap(qc) });
    const es = FakeES.last;
    expect(es.url).toBe('/api/stream');

    act(() => es.onopen!());
    expect(result.current).toBe('open');
    expect(inv).not.toHaveBeenCalled(); // first open: no catch-up needed

    const m = msg({ id: 'b', author: 'agent', createdAt: '2026-10-15T10:01:00.000Z' });
    act(() => { es.emit('message.created', { ticketNumber: 'SC-1', message: m }); es.emit('message.created', { ticketNumber: 'SC-1', message: m }); });
    expect(qc.getQueryData<unknown[]>(['messages', 'SC-1'])).toHaveLength(2);

    const t = ticket({ status: 'in_progress' });
    act(() => es.emit('ticket.updated', { ticket: t }));
    expect(qc.getQueryData(['ticket', 'SC-1'])).toEqual({ ticket: t });
    expect(inv).toHaveBeenCalledWith({ queryKey: ['tickets'] });

    act(() => es.onerror!());
    expect(result.current).toBe('reconnecting');
    inv.mockClear();
    act(() => es.onopen!());
    expect(inv).toHaveBeenCalledWith(); // reopen → invalidate all

    unmount();
    expect(es.closed).toBe(true);
    vi.unstubAllGlobals();
  });
});
