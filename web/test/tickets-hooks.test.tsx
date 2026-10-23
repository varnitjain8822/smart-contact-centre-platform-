import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCreateTicket, useSendMessage, useTicket } from '../src/features/tickets/hooks';
import type { UiMessage } from '../src/lib/types';
import { mockFetch, msg, newQc, ticket, wrap } from './helpers';

describe('ticket hooks', () => {
  it('useSendMessage: optimistic → replaced on success', async () => {
    const qc = newQc();
    qc.setQueryData(['messages', 'SC-1'], [msg({ id: 'a' })]);
    let resolve!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => { resolve = r; })));
    const { result } = renderHook(() => useSendMessage('SC-1'), { wrapper: wrap(qc) });
    act(() => result.current.send('Still not active'));
    const list = () => qc.getQueryData<UiMessage[]>(['messages', 'SC-1'])!;
    await waitFor(() => expect(list()).toHaveLength(2));
    const tmp = list()[1]!;
    expect(tmp).toMatchObject({ deliveryState: 'pending', body: 'Still not active' });
    expect(tmp.id).toBe(`tmp-${tmp.clientMessageId}`);
    const server = msg({ id: 'srv', body: 'Still not active', clientMessageId: tmp.clientMessageId, createdAt: '2026-12-01T00:00:00Z' });
    resolve(new Response(JSON.stringify({ message: server }), { status: 201 }));
    await waitFor(() => expect(list()[1]!.id).toBe('srv'));
    expect(list()).toHaveLength(2);
    vi.unstubAllGlobals();
  });

  it('useSendMessage: failure marks failed; retry reuses clientMessageId', async () => {
    const qc = newQc();
    qc.setQueryData(['messages', 'SC-1'], []);
    const calls = mockFetch({ status: 500, body: { error: { code: 'INTERNAL', message: 'x' } } });
    const { result } = renderHook(() => useSendMessage('SC-1'), { wrapper: wrap(qc) });
    act(() => result.current.send('hello'));
    const list = () => qc.getQueryData<UiMessage[]>(['messages', 'SC-1'])!;
    await waitFor(() => expect(list()[0]!.localState).toBe('failed'));
    const cid = list()[0]!.clientMessageId;
    act(() => { result.current.retry(list()[0]!); });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(JSON.parse(calls[1]!.init.body as string).clientMessageId).toBe(cid);
    await waitFor(() => expect(list()).toHaveLength(1));
    vi.unstubAllGlobals();
  });

  it('useCreateTicket sends Idempotency-Key and seeds caches', async () => {
    const qc = newQc();
    const t = ticket();
    const calls = mockFetch({ status: 201, body: { ticket: t, messages: [msg()] } });
    const { result } = renderHook(() => useCreateTicket(), { wrapper: wrap(qc) });
    await act(() => result.current.mutateAsync({ subject: 'Hello there', description: 'x'.repeat(20), category: null, idemKey: 'k-12345678' }));
    expect((calls[0]!.init.headers as Record<string, string>)['Idempotency-Key']).toBe('k-12345678');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ subject: 'Hello there', description: 'x'.repeat(20), category: null });
    expect(qc.getQueryData(['ticket', 'SC-1'])).toEqual({ ticket: t });
    expect(qc.getQueryData(['messages', 'SC-1'])).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it('useTicket selects .ticket from the raw cache shape', async () => {
    mockFetch({ body: { ticket: ticket() } });
    const { result } = renderHook(() => useTicket('SC-1'), { wrapper: wrap() });
    await waitFor(() => expect(result.current.data?.number).toBe('SC-1'));
    vi.unstubAllGlobals();
  });
});
